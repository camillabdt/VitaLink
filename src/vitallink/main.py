"""HTTP entrypoint for the VitaLink API."""

import hashlib
import hmac
import json
import logging
import math
import secrets
import smtplib
from base64 import urlsafe_b64encode
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, timedelta
from email.message import EmailMessage
from time import perf_counter
from typing import Annotated
from uuid import UUID, uuid4

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from cryptography.fernet import Fernet
from fastapi import Depends, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from vitallink.config import get_settings
from vitallink.database import (
    Account,
    AccountSession,
    AuditEvent,
    EmailVerification,
    LoginThrottle,
    Patient,
    RecoveryCredential,
    TotpCredential,
    get_session,
)

GENERIC_REGISTRATION_MESSAGE = "Se os dados puderem ser cadastrados, enviaremos as instruções de confirmação."
COMMON_PASSWORDS = {"123456789012", "password1234", "senha12345678", "qwerty123456"}
password_hasher = PasswordHasher()
settings = get_settings()
secret_cipher = Fernet(urlsafe_b64encode(hashlib.sha256(settings.secret_key.get_secret_value().encode()).digest()))
dummy_password_hash = password_hasher.hash("timing-only-value-never-used-for-login")
http_logger = logging.getLogger("vitallink.http")


class PatientRegistration(BaseModel):
    """Validated public input for a patient registration request."""

    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    cpf: str = Field(pattern=r"^\d{11}$")
    birthdate: date
    phone: str = Field(min_length=8, max_length=32)
    password: str = Field(min_length=12, max_length=128)
    blood_type: str | None = Field(default=None, pattern=r"^(A|B|AB|O)[+-]$")

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        """Validate both CPF check digits.

        Args:
            value: Eleven numeric CPF digits.

        Returns:
            The validated CPF.

        Raises:
            ValueError: If the check digits are invalid.
        """
        if len(set(value)) == 1:
            raise ValueError("invalid CPF")
        for position in (9, 10):
            weight = position + 1
            total = sum(int(digit) * (weight - index) for index, digit in enumerate(value[:position]))
            expected = 0 if total % 11 < 2 else 11 - total % 11
            if int(value[position]) != expected:
                raise ValueError("invalid CPF")
        return value

    @field_validator("password")
    @classmethod
    def reject_common_password(cls, value: str) -> str:
        """Reject locally known common passwords without changing valid Unicode input.

        Args:
            value: Submitted password.

        Returns:
            The unchanged password when it satisfies the policy.

        Raises:
            ValueError: If the password is present in the local denylist.
        """
        if value.casefold() in COMMON_PASSWORDS:
            raise ValueError("password is too common")
        return value


class PublicMessage(BaseModel):
    """A stable public response that does not disclose account existence."""

    message: str


class EmailVerificationRequest(BaseModel):
    """Public input for a single-use e-mail confirmation."""

    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class TotpConfirmationRequest(BaseModel):
    """Six-digit authenticator response used to confirm enrollment."""

    code: str = Field(pattern=r"^\d{6}$")


class TotpEnrollmentResponse(BaseModel):
    """One-time TOTP enrollment material rendered by the client."""

    secret: str
    provisioning_uri: str


class RecoveryMaterialResponse(BaseModel):
    """Recovery material displayed once after successful activation."""

    recovery_codes: list[str]
    offline_recovery_key: str


class LoginRequest(BaseModel):
    """Password and TOTP factors submitted together for login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    totp_code: str = Field(pattern=r"^\d{6}$")


class CurrentAccountResponse(BaseModel):
    """Minimal account state exposed to the authenticated owner."""

    role: str
    status: str


app = FastAPI(title="VitaLink API", version="0.1.0")


def error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build a correlated error without echoing submitted data.

    Args:
        request: Request carrying the correlation identifier.
        status_code: Public HTTP status.
        code: Stable machine-readable error code.
        message: Safe user-facing message.
        headers: Optional safe response headers.

    Returns:
        A minimal JSON error response.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": message,
            "correlation_id": str(request.state.correlation_id),
        },
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def invalid_request(request: Request, _: RequestValidationError) -> JSONResponse:
    """Replace validation details that may echo credentials or identifiers.

    Args:
        request: Request carrying the correlation identifier.
        _: Validation details intentionally excluded from the response.

    Returns:
        A minimal validation error.
    """
    return error_response(
        request,
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "invalid_request",
        "Revise os dados informados.",
    )


@app.exception_handler(Exception)
async def internal_error(request: Request, _: Exception) -> JSONResponse:
    """Return a correlated failure without exposing internal exception data.

    Args:
        request: Request carrying the correlation identifier.
        _: Internal exception intentionally excluded from the response.

    Returns:
        A minimal internal error.
    """
    return error_response(
        request,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_error",
        "Não foi possível concluir a solicitação.",
    )


def keyed_digest(value: str) -> str:
    """Create a keyed digest for short-lived or pseudonymous values.

    Args:
        value: Sensitive value to digest.

    Returns:
        A lowercase hexadecimal HMAC-SHA256 digest.
    """
    key = settings.secret_key.get_secret_value().encode()
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def csrf_token(raw_session_token: str) -> str:
    """Derive a CSRF token bound to one opaque session.

    Args:
        raw_session_token: Opaque token held only by the secure cookie.

    Returns:
        A keyed token safe to expose to the same-origin client.
    """
    return keyed_digest(f"csrf:{raw_session_token}")


def valid_csrf(request: Request, cookie_name: str) -> bool:
    """Validate the allowed origin and session-bound CSRF header.

    Args:
        request: State-changing request to validate.
        cookie_name: Name of the opaque session cookie.

    Returns:
        True only when both independent checks pass.
    """
    raw_session_token = request.cookies.get(cookie_name)
    submitted_token = request.headers.get("X-CSRF-Token")
    return (
        raw_session_token is not None
        and submitted_token is not None
        and request.headers.get("Origin") == settings.public_origin
        and hmac.compare_digest(submitted_token, csrf_token(raw_session_token))
    )


def csrf_denied_response(request: Request) -> JSONResponse:
    """Return the stable response for a rejected state-changing request.

    Returns:
        A safe forbidden response.
    """
    return error_response(
        request,
        status.HTTP_403_FORBIDDEN,
        "request_verification_failed",
        "Não foi possível validar a solicitação.",
    )


def authentication_throttle(
    session: Session,
    request: Request,
    scope: str,
    subject: str,
) -> tuple[str, str, LoginThrottle | None, datetime]:
    """Lock and resolve one pseudonymous authentication-attempt bucket.

    Args:
        session: Database transaction scope.
        request: Request whose server-resolved origin is part of the bucket.
        scope: Authentication operation being protected.
        subject: Account-related value to pseudonymize.

    Returns:
        Target digest, origin digest, current bucket, and current UTC time.
    """
    target_id = keyed_digest(f"{scope}:{subject}")
    origin_id = keyed_digest(request.client.host if request.client is not None else "unknown")
    session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"{target_id}:{origin_id}"},
    )
    throttle = session.scalar(
        select(LoginThrottle).where(LoginThrottle.target_id == target_id, LoginThrottle.origin_id == origin_id)
    )
    return target_id, origin_id, throttle, datetime.now(UTC)


def record_failed_authentication(
    session: Session,
    target_id: str,
    origin_id: str,
    throttle: LoginThrottle | None,
    now: datetime,
) -> None:
    """Increase a progressive attempt bucket within its ten-minute window.

    Args:
        session: Database transaction scope.
        target_id: Pseudonymous operation target.
        origin_id: Pseudonymous request origin.
        throttle: Existing bucket, when present.
        now: Current UTC time shared by the request.
    """
    if throttle is None:
        throttle = LoginThrottle(
            target_id=target_id,
            origin_id=origin_id,
            failed_count=1,
            window_started_at=now,
        )
        session.add(throttle)
    elif throttle.window_started_at <= now - timedelta(minutes=10):
        throttle.failed_count = 1
        throttle.window_started_at = now
        throttle.blocked_until = None
    else:
        throttle.failed_count += 1
    if throttle.failed_count >= 5:
        throttle.blocked_until = now + timedelta(seconds=min(300, 2 ** (throttle.failed_count - 5)))


def send_confirmation_email(recipient: str, code: str) -> None:
    """Send a confirmation code only to the configured local SMTP boundary.

    Args:
        recipient: Registration e-mail address.
        code: Single-use confirmation code.
    """
    message = EmailMessage()
    message["From"] = "VitaLink <no-reply@vitallink.local>"
    message["To"] = recipient
    message["Subject"] = "Confirme seu cadastro no VitaLink"
    message.set_content(f"Seu código de confirmação é: {code}\nEle expira em 15 minutos.\n")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as smtp:
        smtp.send_message(message)


def audit_identifier(identifier: UUID) -> str:
    """Pseudonymize a database identifier before audit persistence.

    Args:
        identifier: Internal UUID.

    Returns:
        A stable keyed pseudonym.
    """
    return keyed_digest(str(identifier))


def activation_session(request: Request, session: Session) -> tuple[AccountSession, Account] | None:
    """Resolve a valid restricted activation cookie from server state.

    Args:
        request: Request containing the opaque cookie.
        session: Database transaction scope.

    Returns:
        The activation session and account, or None when invalid.
    """
    raw_token = request.cookies.get("__Host-vitallink_activation")
    if raw_token is None:
        return None
    now = datetime.now(UTC)
    account_session = session.scalar(
        select(AccountSession)
        .where(
            AccountSession.token_hash == keyed_digest(raw_token),
            AccountSession.purpose == "totp_activation",
            AccountSession.revoked_at.is_(None),
            AccountSession.expires_at > now,
        )
        .with_for_update()
    )
    if account_session is None:
        return None
    account = session.get(Account, account_session.account_id)
    return (account_session, account) if account is not None else None


def authenticated_session(request: Request, session: Session) -> tuple[AccountSession, Account] | None:
    """Resolve an opaque full session with idle and absolute expiration.

    Args:
        request: Request containing the opaque cookie.
        session: Database transaction scope.

    Returns:
        The current full session and account, or None when invalid.
    """
    raw_token = request.cookies.get("__Host-vitallink_session")
    if raw_token is None:
        return None
    now = datetime.now(UTC)
    account_session = session.scalar(
        select(AccountSession)
        .where(
            AccountSession.token_hash == keyed_digest(raw_token),
            AccountSession.purpose == "authenticated",
            AccountSession.revoked_at.is_(None),
            AccountSession.expires_at > now,
            AccountSession.last_used_at > now - timedelta(minutes=30),
        )
        .with_for_update()
    )
    if account_session is None:
        return None
    account = session.get(Account, account_session.account_id)
    if account is None or account.status != "active":
        return None
    account_session.last_used_at = now
    session.commit()
    return account_session, account


@app.get("/health")
def health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    """Report whether the API and its relational dependency are available.

    Args:
        session: Database transaction scope.

    Returns:
        A stable health status payload.
    """
    session.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post(
    "/api/v1/patient-registrations",
    response_model=PublicMessage,
    status_code=status.HTTP_202_ACCEPTED,
)
def register_patient(
    registration: PatientRegistration,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> PublicMessage:
    """Create a pending patient account without disclosing duplicates.

    Args:
        registration: Validated patient registration data.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.

    Returns:
        A generic response for both new and repeated registrations.
    """
    normalized_email = str(registration.email).strip().casefold()
    existing_account = session.scalar(
        select(Account).join(Patient).where(or_(Account.email == normalized_email, Patient.cpf == registration.cpf))
    )
    if existing_account is not None:
        session.add(
            AuditEvent(
                actor_id=None,
                action="patient.registration.requested",
                target_id=audit_identifier(existing_account.id),
                result="denied",
                reason="duplicate_suppressed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": "patient"},
            )
        )
        session.commit()
        return PublicMessage(message=GENERIC_REGISTRATION_MESSAGE)

    account = Account(
        email=normalized_email,
        password_hash=password_hasher.hash(registration.password),
        role="patient",
        status="awaiting_confirmation",
    )
    account.patient = Patient(
        name=registration.name.strip(),
        cpf=registration.cpf,
        birthdate=registration.birthdate,
        phone=registration.phone.strip(),
        blood_type=registration.blood_type,
    )
    confirmation_code = f"{secrets.randbelow(1_000_000):06d}"
    session.add(account)
    session.flush()
    session.add(
        EmailVerification(
            account_id=account.id,
            code_hash=keyed_digest(confirmation_code),
            expires_at=datetime.now(UTC) + timedelta(minutes=15),
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="patient.registration.requested",
            target_id=audit_identifier(account.id),
            result="success",
            reason="registration_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": "patient"},
        )
    )
    try:
        send_confirmation_email(normalized_email, confirmation_code)
        session.commit()
    except IntegrityError:
        session.rollback()
        session.add(
            AuditEvent(
                actor_id=None,
                action="patient.registration.requested",
                target_id=keyed_digest(normalized_email),
                result="denied",
                reason="duplicate_suppressed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": "patient"},
            )
        )
        session.commit()
        return PublicMessage(message=GENERIC_REGISTRATION_MESSAGE)
    return PublicMessage(message=GENERIC_REGISTRATION_MESSAGE)


@app.post("/api/v1/email-verifications", status_code=status.HTTP_204_NO_CONTENT)
def verify_email(
    verification_request: EmailVerificationRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    """Consume a valid e-mail code and issue a restricted activation session.

    Args:
        verification_request: E-mail and delivered single-use code.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.

    Returns:
        An empty response with a secure opaque activation cookie, or a stable error.
    """
    normalized_email = str(verification_request.email).casefold()
    target_id, origin_id, throttle, now = authentication_throttle(
        session,
        request,
        "email-verification",
        normalized_email,
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.email.verified",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))
    account = session.scalar(select(Account).where(Account.email == str(verification_request.email).casefold()))
    verification = None
    if account is not None:
        verification = session.scalar(
            select(EmailVerification)
            .where(
                EmailVerification.account_id == account.id,
                EmailVerification.code_hash == keyed_digest(verification_request.code),
                EmailVerification.used_at.is_(None),
                EmailVerification.expires_at > now,
            )
            .with_for_update()
        )
    if account is None or verification is None:
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.email.verified",
                target_id=audit_identifier(account.id)
                if account is not None
                else keyed_digest(str(verification_request.email)),
                result="denied",
                reason="invalid_or_expired_verification",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return error_response(
            request,
            status.HTTP_400_BAD_REQUEST,
            "invalid_or_expired_verification",
            "Código inválido ou expirado.",
        )

    if throttle is not None:
        session.delete(throttle)
    raw_token = secrets.token_urlsafe(32)
    verification.used_at = now
    account.status = "activation_pending"
    session.add(
        AccountSession(
            account_id=account.id,
            token_hash=keyed_digest(raw_token),
            purpose="totp_activation",
            expires_at=now + timedelta(minutes=15),
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.email.verified",
            target_id=audit_identifier(account.id),
            result="success",
            reason="verification_consumed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.headers["X-CSRF-Token"] = csrf_token(raw_token)
    response.set_cookie(
        key="__Host-vitallink_activation",
        value=raw_token,
        max_age=900,
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return response


@app.post("/api/v1/totp", response_model=TotpEnrollmentResponse, status_code=status.HTTP_201_CREATED)
def enroll_totp(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> TotpEnrollmentResponse | JSONResponse:
    """Enroll a TOTP secret through a restricted activation session.

    Args:
        request: Request containing the activation cookie.
        session: Database transaction scope.

    Returns:
        Enrollment material or a safe authentication error.
    """
    context = activation_session(request, session)
    if context is None:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp.enrolled",
                target_id=None,
                result="denied",
                reason="activation_required",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return error_response(request, 401, "activation_required", "Ativação necessária.")
    if not valid_csrf(request, "__Host-vitallink_activation"):
        _, account = context
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp.enrolled",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    _, account = context
    credential = session.scalar(select(TotpCredential).where(TotpCredential.account_id == account.id))
    if credential is None:
        secret = pyotp.random_base32()
        credential = TotpCredential(
            account_id=account.id,
            secret_ciphertext=secret_cipher.encrypt(secret.encode()).decode(),
        )
        session.add(credential)
    else:
        secret = secret_cipher.decrypt(credential.secret_ciphertext.encode()).decode()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.totp.enrolled",
            target_id=audit_identifier(account.id),
            result="success",
            reason="enrollment_issued",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return TotpEnrollmentResponse(
        secret=secret,
        provisioning_uri=pyotp.TOTP(secret).provisioning_uri(name=account.email, issuer_name="VitaLink"),
    )


@app.post("/api/v1/totp/confirmations", response_model=RecoveryMaterialResponse)
def confirm_totp(
    confirmation_request: TotpConfirmationRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> RecoveryMaterialResponse | JSONResponse:
    """Confirm TOTP and activate the account with one-time recovery values.

    Args:
        confirmation_request: Current authenticator code.
        request: Request containing the activation cookie.
        session: Database transaction scope.

    Returns:
        One-time recovery material or a safe authentication error.
    """
    context = activation_session(request, session)
    if context is None:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp.activated",
                target_id=None,
                result="denied",
                reason="activation_required",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return error_response(request, 401, "activation_required", "Ativação necessária.")
    if not valid_csrf(request, "__Host-vitallink_activation"):
        _, account = context
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp.activated",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    account_session, account = context
    target_id, origin_id, throttle, now = authentication_throttle(
        session,
        request,
        "totp-confirmation",
        str(account.id),
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.totp.activated",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))
    credential = session.scalar(select(TotpCredential).where(TotpCredential.account_id == account.id))
    if credential is None or credential.confirmed_at is not None:
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.totp.activated",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="totp_not_enrolled",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 400, "totp_not_enrolled", "TOTP não cadastrado.")
    secret = secret_cipher.decrypt(credential.secret_ciphertext.encode()).decode()
    if not pyotp.TOTP(secret).verify(confirmation_request.code, valid_window=1):
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.totp.activated",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="invalid_totp",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 400, "invalid_totp", "Código inválido.")

    if throttle is not None:
        session.delete(throttle)
    recovery_codes = [secrets.token_hex(8).upper() for _ in range(10)]
    offline_recovery_key = secrets.token_urlsafe(24)
    for value in recovery_codes:
        session.add(RecoveryCredential(account_id=account.id, kind="code", value_hash=keyed_digest(value)))
    session.add(
        RecoveryCredential(account_id=account.id, kind="offline_key", value_hash=keyed_digest(offline_recovery_key))
    )
    credential.confirmed_at = now
    account_session.revoked_at = now
    account.status = "active"
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.totp.activated",
            target_id=audit_identifier(account.id),
            result="success",
            reason="totp_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    response = JSONResponse(content={"recovery_codes": recovery_codes, "offline_recovery_key": offline_recovery_key})
    response.delete_cookie(
        key="__Host-vitallink_activation",
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return response


def invalid_login_response(request: Request) -> JSONResponse:
    """Return the single public response for every invalid login factor.

    Returns:
        A stable non-enumerating authentication error.
    """
    return error_response(
        request,
        status.HTTP_401_UNAUTHORIZED,
        "invalid_credentials",
        "Não foi possível entrar com os dados informados.",
    )


def limited_login_response(request: Request, retry_after: int) -> JSONResponse:
    """Return the stable response for a temporarily limited login.

    Args:
        request: Request carrying the correlation identifier.
        retry_after: Whole seconds before another attempt is accepted.

    Returns:
        A non-enumerating rate-limit response.
    """
    return error_response(
        request,
        status.HTTP_429_TOO_MANY_REQUESTS,
        "authentication_temporarily_limited",
        "Aguarde antes de tentar novamente.",
        {"Retry-After": str(max(1, retry_after))},
    )


@app.post("/api/v1/sessions", status_code=status.HTTP_204_NO_CONTENT)
def create_session(
    login_request: LoginRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    """Authenticate an active account with password and TOTP.

    Args:
        login_request: Submitted account factors.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.

    Returns:
        An opaque secure session cookie or a generic authentication error.
    """
    normalized_email = str(login_request.email).casefold()
    target_id, origin_id, throttle, now = authentication_throttle(session, request, "login", normalized_email)
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.login",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))

    account = session.scalar(select(Account).where(Account.email == normalized_email))
    password_hash = account.password_hash if account is not None else dummy_password_hash
    try:
        password_valid = password_hasher.verify(password_hash, login_request.password)
    except VerificationError:
        password_valid = False

    credential = None
    totp_valid = False
    if account is not None:
        credential = session.scalar(
            select(TotpCredential).where(
                TotpCredential.account_id == account.id,
                TotpCredential.confirmed_at.is_not(None),
            )
        )
    if credential is not None:
        secret = secret_cipher.decrypt(credential.secret_ciphertext.encode()).decode()
        totp_valid = pyotp.TOTP(secret).verify(login_request.totp_code, valid_window=1)

    if account is None or account.status != "active" or not password_valid or not totp_valid:
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.login",
                target_id=target_id,
                result="denied",
                reason="invalid_credentials",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return invalid_login_response(request)

    if throttle is not None:
        session.delete(throttle)
    raw_token = secrets.token_urlsafe(32)
    session.add(
        AccountSession(
            account_id=account.id,
            token_hash=keyed_digest(raw_token),
            purpose="authenticated",
            expires_at=now + timedelta(hours=8),
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.login",
            target_id=audit_identifier(account.id),
            result="success",
            reason="factors_verified",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.headers["X-CSRF-Token"] = csrf_token(raw_token)
    response.set_cookie(
        key="__Host-vitallink_session",
        value=raw_token,
        max_age=28800,
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return response


@app.delete("/api/v1/sessions/current", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_current_session(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> Response | JSONResponse:
    """Revoke the current opaque session and clear its cookie.

    Args:
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.

    Returns:
        An empty response after revocation or a safe denial.
    """
    context = authenticated_session(request, session)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.logout",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)

    account_session.revoked_at = datetime.now(UTC)
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.logout",
            target_id=audit_identifier(account.id),
            result="success",
            reason="session_revoked",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(
        key="__Host-vitallink_session",
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return response


@app.get("/api/v1/me", response_model=CurrentAccountResponse)
def current_account(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> CurrentAccountResponse | JSONResponse:
    """Return the minimal state of the currently authenticated account.

    Args:
        request: Request containing the opaque full-session cookie.
        session: Database transaction scope.

    Returns:
        Minimal account state or an authentication error.
    """
    context = authenticated_session(request, session)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    return CurrentAccountResponse(role=account.role, status=account.status)


@app.middleware("http")
async def log_request(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Correlate and log every request without recording submitted data.

    Args:
        request: Incoming HTTP request.
        call_next: Next ASGI handler.

    Returns:
        The application response with its correlation identifier.
    """
    started_at = perf_counter()
    request.state.correlation_id = uuid4()
    response_status = 500
    try:
        response = await call_next(request)
        response_status = response.status_code
    finally:
        route = getattr(request.scope.get("route"), "path", "unmatched")
        http_logger.info(
            json.dumps(
                {
                    "correlation_id": str(request.state.correlation_id),
                    "duration_ms": round((perf_counter() - started_at) * 1000, 3),
                    "method": request.method,
                    "route": route,
                    "status": response_status,
                },
                separators=(",", ":"),
                sort_keys=True,
            )
        )
    response.headers["X-Correlation-ID"] = str(request.state.correlation_id)
    return response
