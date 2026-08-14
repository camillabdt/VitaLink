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
from decimal import Decimal
from email.message import EmailMessage
from time import perf_counter
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID, uuid4

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from cryptography.fernet import Fernet
from fastapi import Depends, FastAPI, File, Form, Query, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from vitallink.config import get_settings
from vitallink.database import (
    AccessCode,
    AccessRequest,
    Account,
    AccountSession,
    AuditEvent,
    Authorization,
    AuthorizationRevision,
    ClinicalGoal,
    ClinicalMessage,
    ClinicalResult,
    Document,
    EmailVerification,
    FollowUpStatus,
    LoginThrottle,
    Notification,
    Patient,
    PersonalObservation,
    Professional,
    ProfessionalRecord,
    RecoveryCredential,
    SessionFactory,
    StepUpConfirmation,
    TotpCredential,
    get_session,
)
from vitallink.document_storage import clamav_scan, document_content_type, ensure_private_buckets, storage_client
from vitallink.transcription import (
    InvalidAudioError,
    NoSpeechError,
    TranscriptionTimeoutError,
    TranscriptionUnavailableError,
    transcribe_temporary_audio,
)

GENERIC_REGISTRATION_MESSAGE = "Se os dados puderem ser cadastrados, enviaremos as instruções de confirmação."
GENERIC_RECOVERY_MESSAGE = "Se a conta puder ser recuperada, enviaremos as instruções por e-mail."
COMMON_PASSWORDS = {"123456789012", "password1234", "senha12345678", "qwerty123456"}
AUTHORIZATION_CATEGORIES = {
    "histórico",
    "consultas",
    "exames",
    "laudos",
    "receitas",
    "imagens",
    "recomendações",
    "metas",
    "mensagens",
}
AUTHORIZATION_OPERATIONS = {"consultar", "anexar", "atualizar"}
password_hasher = PasswordHasher()
settings = get_settings()
secret_cipher = Fernet(urlsafe_b64encode(hashlib.sha256(settings.secret_key.get_secret_value().encode()).digest()))
dummy_password_hash = password_hasher.hash("timing-only-value-never-used-for-login")
http_logger = logging.getLogger("vitallink.http")


def reject_common_password_value(value: str) -> str:
    """Reject a locally known common password.

    Args:
        value: Submitted password.

    Returns:
        The unchanged password when accepted.

    Raises:
        ValueError: If the password is present in the local denylist.
    """
    if value.casefold() in COMMON_PASSWORDS:
        raise ValueError("password is too common")
    return value


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
        """Reject a locally known common patient password."""
        return reject_common_password_value(value)


class ProfessionalRegistration(BaseModel):
    """Validated public input for a professional registration request."""

    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    cpf: str = Field(pattern=r"^\d{11}$")
    birthdate: date
    phone: str = Field(min_length=8, max_length=32)
    password: str = Field(min_length=12, max_length=128)
    crm: str = Field(min_length=1, max_length=32)
    uf: str = Field(pattern=r"^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$")
    specialty: str = Field(min_length=2, max_length=120)
    institution: str | None = Field(default=None, max_length=200)

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, value: str) -> str:
        """Validate professional CPF check digits.

        Args:
            value: Eleven numeric CPF digits.

        Returns:
            The validated CPF.

        Raises:
            ValueError: If the check digits are invalid.
        """
        return PatientRegistration.validate_cpf(value)

    @field_validator("password")
    @classmethod
    def reject_common_password(cls, value: str) -> str:
        """Reject a locally known common professional password.

        Args:
            value: Submitted password.

        Returns:
            The unchanged password when accepted.

        Raises:
            ValueError: If the password is present in the local denylist.
        """
        return reject_common_password_value(value)


class PublicMessage(BaseModel):
    """A stable public response that does not disclose account existence."""

    message: str


class PasswordRecoveryRequest(BaseModel):
    """Public input for a non-enumerating recovery request."""

    email: EmailStr


class PasswordResetRequest(BaseModel):
    """Single-use token and replacement password submitted together."""

    token: str = Field(min_length=32, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def reject_common_password(cls, value: str) -> str:
        """Reject a locally known common replacement password.

        Args:
            value: Submitted replacement password.

        Returns:
            The unchanged password when accepted.

        Raises:
            ValueError: If the password is present in the local denylist.
        """
        if value.casefold() in COMMON_PASSWORDS:
            raise ValueError("password is too common")
        return value


class TotpRecoveryRequest(BaseModel):
    """Independent e-mail token and offline key used for reinforced recovery."""

    token: str = Field(min_length=32, max_length=128)
    offline_recovery_key: str = Field(min_length=24, max_length=128)


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


class PatientProfileResponse(BaseModel):
    """Patient profile exposed only to its authenticated owner."""

    name: str
    email: EmailStr
    cpf: str
    birthdate: date
    phone: str
    blood_type: str | None


class ProfessionalProfileResponse(BaseModel):
    """Professional profile exposed only to its authenticated owner."""

    name: str
    email: EmailStr
    cpf: str
    birthdate: date
    phone: str
    crm: str
    uf: str
    specialty: str
    institution: str | None


class CurrentAccountResponse(BaseModel):
    """Account and owned profile state exposed to the authenticated owner."""

    role: str
    status: str
    version: int
    profile: PatientProfileResponse | ProfessionalProfileResponse


class OwnedProfileUpdate(BaseModel):
    """Editable owned-profile fields plus an optimistic concurrency version."""

    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=2, max_length=200)
    birthdate: date | None = None
    phone: str | None = Field(default=None, min_length=8, max_length=32)
    blood_type: str | None = Field(default=None, pattern=r"^(A|B|AB|O)[+-]$")
    institution: str | None = Field(default=None, max_length=200)
    email: str | None = None
    cpf: str | None = None
    crm: str | None = None
    uf: str | None = None
    role: str | None = None
    status: str | None = None


class AccessCodeCreatedResponse(BaseModel):
    """One-time plaintext access code returned only when generated."""

    id: UUID
    code: str
    expires_at: datetime
    status: str


class AccessCodeResponse(BaseModel):
    """Safe access-code metadata visible to its patient owner."""

    id: UUID
    created_at: datetime
    expires_at: datetime
    status: str


class AccessRequestCreate(BaseModel):
    """Temporary code and justification submitted by a professional."""

    code: str = Field(min_length=32, max_length=128)
    justification: str = Field(min_length=10, max_length=1000)


class AccessRequestResponse(BaseModel):
    """Minimal confirmation of a pending professional request."""

    id: UUID
    status: str
    patient: str


class RequestingProfessionalResponse(BaseModel):
    """Professional identity needed for a patient access decision."""

    name: str
    specialty: str
    institution: str | None


class PatientAccessRequestResponse(BaseModel):
    """Pending request visible only to its target patient."""

    id: UUID
    status: str
    created_at: datetime
    justification: str
    professional: RequestingProfessionalResponse


class AccessRequestDecisionRequest(BaseModel):
    """Patient decision for one pending access request."""

    decision: str = Field(pattern=r"^(rejected|granted)$")
    categories: list[str] | None = Field(default=None, min_length=1, max_length=9)
    operations: list[str] | None = Field(default=None, min_length=1, max_length=3)
    duration_days: int | None = Field(default=None, ge=1, le=90)
    step_up_confirmation_id: UUID | None = None


class AccessRequestDecisionResponse(BaseModel):
    """Safe confirmation of an access-request decision."""

    id: UUID
    status: str


class AuthorizedPatientResponse(BaseModel):
    """Minimal patient card backed by one active authorization."""

    id: UUID
    name: str
    categories: list[str]
    operations: list[str]
    expires_at: datetime


class AuthorizedPatientDetailResponse(AuthorizedPatientResponse):
    """Patient profile fields allowed by the history-read scope."""

    birthdate: date
    blood_type: str | None
    phone: str


class AuthorizationPatientResponse(BaseModel):
    """Patient identity visible to a party in the authorization."""

    id: UUID
    name: str


class AuthorizationProfessionalResponse(BaseModel):
    """Professional identity visible to a party in the authorization."""

    id: UUID
    name: str
    specialty: str
    institution: str | None


class AuthorizationResponse(BaseModel):
    """Authorization visible only to its patient or professional."""

    id: UUID
    status: str
    starts_at: datetime
    expires_at: datetime
    categories: list[str]
    operations: list[str]
    patient: AuthorizationPatientResponse
    professional: AuthorizationProfessionalResponse


class AuthorizationRevocationRequest(BaseModel):
    """Patient proof and reason for revoking an authorization."""

    justification: str = Field(min_length=3, max_length=500)
    step_up_confirmation_id: UUID


class AuthorizationReductionRequest(AuthorizationRevocationRequest):
    """Patient-selected strict subset of an active authorization."""

    categories: list[str] = Field(min_length=1, max_length=9)
    operations: list[str] = Field(min_length=1, max_length=3)


class AuthorizationChangeResponse(BaseModel):
    """Safe state returned after an authorization change."""

    id: UUID
    status: str


class PersonalObservationCreate(BaseModel):
    """Patient-authored personal observation input."""

    text: str = Field(min_length=1, max_length=4000)


class PersonalObservationCorrection(PersonalObservationCreate):
    """Replacement text bound to the version seen by the patient."""

    expected_version: int = Field(ge=1)


class PersonalObservationResponse(BaseModel):
    """One current personal observation with explicit provenance."""

    id: UUID
    text: str
    author: str
    created_at: datetime
    version: int


class DocumentResponse(BaseModel):
    """Safe document metadata without private storage coordinates."""

    id: UUID
    category: str
    original_name: str
    content_type: str
    size: int
    status: str
    created_at: datetime


class DocumentAuthorizedProfessionalResponse(BaseModel):
    """Professional currently authorized to consult one document."""

    id: UUID
    name: str
    specialty: str
    institution: str | None
    expires_at: datetime


class TranscriptionResponse(BaseModel):
    """Editable local draft that is never persisted automatically."""

    draft: str
    language: Literal["pt"]
    requires_confirmation: Literal[True]


class NotificationResponse(BaseModel):
    """Minimal private notification without domain identifiers."""

    id: UUID
    kind: str
    created_at: datetime
    read_at: datetime | None


class AuditEventResponse(BaseModel):
    """Permitted audit projection without internal metadata."""

    id: UUID
    event: str
    status: str
    created_at: datetime


class ClinicalResultCreate(BaseModel):
    """Explicitly confirmed structured measurement input."""

    exam_name: str = Field(min_length=1, max_length=200)
    value: Decimal = Field(max_digits=18, decimal_places=6)
    unit: str = Field(min_length=1, max_length=32)
    measured_at: date
    origin: str = Field(min_length=1, max_length=200)
    reference_min: Decimal = Field(max_digits=18, decimal_places=6)
    reference_max: Decimal = Field(max_digits=18, decimal_places=6)
    confirmed: Literal[True]
    patient_id: UUID | None = None

    @field_validator("exam_name", "unit", "origin")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        """Normalize required text while rejecting whitespace-only values."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @model_validator(mode="after")
    def validate_reference_order(self) -> "ClinicalResultCreate":
        """Require an ordered laboratory interval."""
        if self.reference_min > self.reference_max:
            raise ValueError("reference interval is invalid")
        return self


class ClinicalResultResponse(BaseModel):
    """Current confirmed result with provenance and neutral range position."""

    id: UUID
    exam_name: str
    value: float
    unit: str
    measured_at: date
    origin: str
    reference_min: float
    reference_max: float
    confirmed: bool
    range_position: str
    author: str
    version: int
    created_at: datetime


class ClinicalResultCorrection(BaseModel):
    """Replacement measurement bound to the version seen by the actor."""

    exam_name: str = Field(min_length=1, max_length=200)
    value: Decimal = Field(max_digits=18, decimal_places=6)
    unit: str = Field(min_length=1, max_length=32)
    measured_at: date
    reference_min: Decimal = Field(max_digits=18, decimal_places=6)
    reference_max: Decimal = Field(max_digits=18, decimal_places=6)
    confirmed: Literal[True]
    expected_version: int = Field(ge=1)
    correction_reason: str = Field(min_length=3, max_length=500)

    @field_validator("exam_name", "unit", "correction_reason")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        """Normalize required correction text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @model_validator(mode="after")
    def validate_reference_order(self) -> "ClinicalResultCorrection":
        """Require an ordered laboratory interval."""
        if self.reference_min > self.reference_max:
            raise ValueError("reference interval is invalid")
        return self


class ProfessionalRecordCreate(BaseModel):
    """TOTP-confirmed professional entry for an authorized patient."""

    patient_id: UUID
    kind: Literal["consultation", "note", "recommendation"]
    occurred_at: datetime
    content: str = Field(min_length=3, max_length=10_000)
    justification: str = Field(min_length=10, max_length=500)
    step_up_confirmation_id: UUID

    @field_validator("content", "justification")
    @classmethod
    def strip_record_text(cls, value: str) -> str:
        """Normalize required professional text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @field_validator("occurred_at")
    @classmethod
    def require_record_timezone(cls, value: datetime) -> datetime:
        """Store an unambiguous professional event time in UTC."""
        if value.tzinfo is None:
            raise ValueError("timezone is required")
        return value.astimezone(UTC)


class ProfessionalRecordAuthorResponse(BaseModel):
    """Minimum professional attribution shown with a clinical record."""

    name: str
    specialty: str


class ProfessionalRecordResponse(BaseModel):
    """Current professional record with provenance and authorship."""

    id: UUID
    kind: str
    occurred_at: datetime
    content: str
    justification: str
    origin: str
    author: ProfessionalRecordAuthorResponse
    version: int
    created_at: datetime


class ProfessionalRecordCorrection(BaseModel):
    """Replacement content bound to the version seen by its professional author."""

    occurred_at: datetime
    content: str = Field(min_length=3, max_length=10_000)
    justification: str = Field(min_length=10, max_length=500)
    expected_version: int = Field(ge=1)
    correction_reason: str = Field(min_length=3, max_length=500)

    @field_validator("content", "justification", "correction_reason")
    @classmethod
    def strip_correction_text(cls, value: str) -> str:
        """Normalize required correction text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @field_validator("occurred_at")
    @classmethod
    def require_correction_timezone(cls, value: datetime) -> datetime:
        """Store an unambiguous replacement event time in UTC."""
        if value.tzinfo is None:
            raise ValueError("timezone is required")
        return value.astimezone(UTC)


class ClinicalGoalCreate(BaseModel):
    """TOTP-confirmed target tied to an existing structured exam."""

    patient_id: UUID
    exam_name: str = Field(min_length=1, max_length=200)
    minimum: Decimal = Field(max_digits=18, decimal_places=6)
    maximum: Decimal = Field(max_digits=18, decimal_places=6)
    unit: str = Field(min_length=1, max_length=32)
    justification: str = Field(min_length=10, max_length=500)
    effective_at: date
    step_up_confirmation_id: UUID

    @field_validator("exam_name", "unit", "justification")
    @classmethod
    def strip_goal_text(cls, value: str) -> str:
        """Normalize required goal text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @model_validator(mode="after")
    def validate_limit_order(self) -> "ClinicalGoalCreate":
        """Require ordered goal limits."""
        if self.minimum > self.maximum:
            raise ValueError("goal limits are invalid")
        return self


class ClinicalGoalCorrection(BaseModel):
    """Replacement limits bound to the version seen by the author."""

    minimum: Decimal = Field(max_digits=18, decimal_places=6)
    maximum: Decimal = Field(max_digits=18, decimal_places=6)
    unit: str = Field(min_length=1, max_length=32)
    justification: str = Field(min_length=10, max_length=500)
    effective_at: date
    expected_version: int = Field(ge=1)
    correction_reason: str = Field(min_length=3, max_length=500)
    step_up_confirmation_id: UUID

    @field_validator("unit", "justification", "correction_reason")
    @classmethod
    def strip_goal_text(cls, value: str) -> str:
        """Normalize required correction text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @model_validator(mode="after")
    def validate_limit_order(self) -> "ClinicalGoalCorrection":
        """Require ordered replacement limits."""
        if self.minimum > self.maximum:
            raise ValueError("goal limits are invalid")
        return self


class ClinicalGoalResponse(BaseModel):
    """Current goal with immutable professional attribution."""

    id: UUID
    exam_name: str
    minimum: float
    maximum: float
    unit: str
    justification: str
    effective_at: date
    author: ProfessionalRecordAuthorResponse
    version: int
    created_at: datetime


class FollowUpStatusCreate(BaseModel):
    """Explicit professional follow-up state, never a computed classification."""

    patient_id: UUID
    status: str = Field(min_length=1, max_length=120)
    justification: str = Field(min_length=10, max_length=500)
    recorded_at: date
    step_up_confirmation_id: UUID

    @field_validator("status", "justification")
    @classmethod
    def strip_follow_up_text(cls, value: str) -> str:
        """Normalize required manual follow-up text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped


class FollowUpStatusCorrection(FollowUpStatusCreate):
    """Replacement manual state bound to the version seen by its author."""

    patient_id: UUID | None = Field(default=None, exclude=True)
    expected_version: int = Field(ge=1)
    correction_reason: str = Field(min_length=3, max_length=500)

    @field_validator("correction_reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        """Normalize the required correction reason."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped


class FollowUpStatusResponse(BaseModel):
    """Current manual status with professional attribution."""

    id: UUID
    status: str
    justification: str
    recorded_at: date
    author: ProfessionalRecordAuthorResponse
    version: int
    created_at: datetime


class ClinicalMessageCreate(BaseModel):
    """TOTP-confirmed immutable message to one eligible professional."""

    patient_id: UUID
    recipient_professional_id: UUID
    content: str = Field(min_length=1, max_length=10_000)
    mention_professional_ids: list[UUID] = Field(default_factory=list, max_length=20)
    step_up_confirmation_id: UUID

    @field_validator("content")
    @classmethod
    def strip_message_content(cls, value: str) -> str:
        """Normalize required message text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @field_validator("mention_professional_ids")
    @classmethod
    def unique_mentions(cls, value: list[UUID]) -> list[UUID]:
        """Reject duplicate mention identifiers."""
        if len(value) != len(set(value)):
            raise ValueError("mentions must be unique")
        return value


class ClinicalMessageCorrection(BaseModel):
    """New message linked to one immutable original."""

    content: str = Field(min_length=1, max_length=10_000)
    mention_professional_ids: list[UUID] = Field(default_factory=list, max_length=20)
    correction_reason: str = Field(min_length=3, max_length=500)
    step_up_confirmation_id: UUID

    @field_validator("content", "correction_reason")
    @classmethod
    def strip_correction_text(cls, value: str) -> str:
        """Normalize required correction text."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("value is required")
        return stripped

    @field_validator("mention_professional_ids")
    @classmethod
    def unique_mentions(cls, value: list[UUID]) -> list[UUID]:
        """Reject duplicate mention identifiers."""
        if len(value) != len(set(value)):
            raise ValueError("mentions must be unique")
        return value


class ClinicalMessagePartyResponse(BaseModel):
    """Minimum professional identity shown in a clinical conversation."""

    id: UUID
    name: str
    specialty: str


class ClinicalMessageRecipientResponse(ClinicalMessagePartyResponse):
    """Eligible team member and their persistent unread badge count."""

    unread_count: int


class ClinicalMessageResponse(BaseModel):
    """One append-only message or linked correction."""

    id: UUID
    content: str
    mention_professional_ids: list[UUID]
    sender: ClinicalMessagePartyResponse
    recipient: ClinicalMessagePartyResponse
    corrects_id: UUID | None
    correction_reason: str | None
    created_at: datetime


class AccountSessionResponse(BaseModel):
    """Safe session metadata visible only to its account owner."""

    id: UUID
    current: bool
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime


class StepUpConfirmationRequest(BaseModel):
    """TOTP proof bound to one supported sensitive action."""

    action: str = Field(
        pattern=r"^(password_change|authorization_grant|authorization_reduce|authorization_revoke|document_download|clinical_record_create|clinical_goal_write|clinical_message_write)$"
    )
    totp_code: str = Field(pattern=r"^\d{6}$")


class StepUpConfirmationResponse(BaseModel):
    """Short-lived confirmation identifier returned to the same-origin client."""

    id: UUID
    expires_at: datetime


class PasswordChangeRequest(BaseModel):
    """Current and replacement passwords plus one action confirmation."""

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)
    step_up_confirmation_id: UUID

    @field_validator("new_password")
    @classmethod
    def reject_common_password(cls, value: str) -> str:
        """Reject a locally known common replacement password.

        Args:
            value: Submitted replacement password.

        Returns:
            The unchanged password when accepted.

        Raises:
            ValueError: If the password is present in the local denylist.
        """
        if value.casefold() in COMMON_PASSWORDS:
            raise ValueError("password is too common")
        return value


app = FastAPI(title="VitaLink API", version="0.1.0")


def current_time() -> datetime:
    """Return the current UTC time through an overridable application boundary.

    Returns:
        Current timezone-aware UTC time.
    """
    return datetime.now(UTC)


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
    now: datetime | None = None,
) -> tuple[str, str, LoginThrottle | None, datetime]:
    """Lock and resolve one pseudonymous authentication-attempt bucket.

    Args:
        session: Database transaction scope.
        request: Request whose server-resolved origin is part of the bucket.
        scope: Authentication operation being protected.
        subject: Account-related value to pseudonymize.
        now: Optional server time shared by a controlled request.

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
    return target_id, origin_id, throttle, now or current_time()


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


def send_password_recovery_email(recipient: str, token: str) -> None:
    """Send an opaque password recovery token to the local SMTP boundary.

    Args:
        recipient: Confirmed account e-mail address.
        token: Single-use opaque recovery token.
    """
    message = EmailMessage()
    message["From"] = "VitaLink <no-reply@vitallink.local>"
    message["To"] = recipient
    message["Subject"] = "Redefina sua senha do VitaLink"
    message.set_content(
        f"Acesse {settings.public_origin}/reset-password?token={token}\n"
        "Este link expira em 15 minutos. Se você não solicitou, ignore esta mensagem.\n"
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as smtp:
        smtp.send_message(message)


def send_totp_recovery_email(recipient: str, token: str) -> None:
    """Send one factor of reinforced TOTP recovery to confirmed e-mail.

    Args:
        recipient: Confirmed patient e-mail address.
        token: Single-use opaque reinforced recovery token.
    """
    message = EmailMessage()
    message["From"] = "VitaLink <no-reply@vitallink.local>"
    message["To"] = recipient
    message["Subject"] = "Recupere seu autenticador do VitaLink"
    message.set_content(
        f"Acesse {settings.public_origin}/recover-totp?token={token}\n"
        "Você também precisará da sua chave offline. Este link expira em 15 minutos.\n"
    )
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
            AccountSession.purpose.in_(("totp_activation", "totp_recovery")),
            AccountSession.revoked_at.is_(None),
            AccountSession.expires_at > now,
        )
        .with_for_update()
    )
    if account_session is None:
        return None
    account = session.get(Account, account_session.account_id)
    return (account_session, account) if account is not None else None


def authenticated_session(
    request: Request,
    session: Session,
    now: datetime,
) -> tuple[AccountSession, Account] | None:
    """Resolve an opaque full session with idle and absolute expiration.

    Args:
        request: Request containing the opaque cookie.
        session: Database transaction scope.
        now: Server-controlled UTC time for expiration checks.

    Returns:
        The current full session and account, or None when invalid.
    """
    raw_token = request.cookies.get("__Host-vitallink_session")
    if raw_token is None:
        return None
    account_session = session.scalar(
        select(AccountSession)
        .where(
            AccountSession.token_hash == keyed_digest(raw_token),
            AccountSession.purpose == "authenticated",
            AccountSession.revoked_at.is_(None),
        )
        .with_for_update()
    )
    if account_session is None:
        return None
    account = session.get(Account, account_session.account_id)
    if account is None or account.status != "active":
        return None
    if account_session.expires_at <= now or account_session.last_used_at <= now - timedelta(minutes=30):
        account_session.revoked_at = now
        reason = "absolute_expiration" if account_session.expires_at <= now else "idle_expiration"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.session.expired",
                target_id=keyed_digest(str(account_session.id)),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return None
    account_session.last_used_at = now
    session.commit()
    return account_session, account


@app.post(
    "/api/v1/password-recovery-requests",
    response_model=PublicMessage,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_password_recovery(
    recovery_request: PasswordRecoveryRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> PublicMessage | JSONResponse:
    """Create a single-use password reset token without account enumeration.

    Args:
        recovery_request: Submitted account e-mail.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The same public message for every syntactically valid e-mail.
    """
    normalized_email = str(recovery_request.email).casefold()
    target_id, origin_id, throttle, now = authentication_throttle(
        session, request, "password-recovery-request", normalized_email, now
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.password_recovery.requested",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))
    account = session.scalar(select(Account).where(Account.email == normalized_email, Account.status == "active"))
    if account is None:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.password_recovery.requested",
                target_id=keyed_digest(f"recovery:{normalized_email}"),
                result="denied",
                reason="account_unavailable",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
    else:
        for credential in session.scalars(
            select(RecoveryCredential).where(
                RecoveryCredential.account_id == account.id,
                RecoveryCredential.kind == "password_reset",
                RecoveryCredential.used_at.is_(None),
            )
        ):
            credential.used_at = now
        raw_token = secrets.token_urlsafe(32)
        recovery_credential = RecoveryCredential(
            account_id=account.id,
            kind="password_reset",
            value_hash=keyed_digest(raw_token),
            expires_at=now + timedelta(minutes=15),
        )
        session.add(recovery_credential)
        session.flush()
        session.add(
            Notification(
                account_id=account.id,
                kind="account_recovery_requested",
                subject_id=recovery_credential.id,
                created_at=now,
            )
        )
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.password_recovery.requested",
                target_id=audit_identifier(account.id),
                result="success",
                reason="recovery_dispatched",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        send_password_recovery_email(account.email, raw_token)
    record_failed_authentication(session, target_id, origin_id, throttle, now)
    session.commit()
    return PublicMessage(message=GENERIC_RECOVERY_MESSAGE)


@app.post(
    "/api/v1/totp-recovery-requests",
    response_model=PublicMessage,
    status_code=status.HTTP_202_ACCEPTED,
)
def request_totp_recovery(
    recovery_request: PasswordRecoveryRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> PublicMessage | JSONResponse:
    """Issue the e-mail factor only for an active patient account.

    Args:
        recovery_request: Submitted account e-mail.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The same public message for every syntactically valid e-mail.
    """
    normalized_email = str(recovery_request.email).casefold()
    target_id, origin_id, throttle, now = authentication_throttle(
        session, request, "totp-recovery-request", normalized_email, now
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp_recovery.requested",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))
    account = session.scalar(select(Account).where(Account.email == normalized_email, Account.status == "active"))
    if account is None or account.role != "patient":
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp_recovery.requested",
                target_id=keyed_digest(f"totp_recovery:{normalized_email}"),
                result="denied",
                reason="manual_validation_required" if account is not None else "account_unavailable",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role} if account is not None else {},
            )
        )
    else:
        for credential in session.scalars(
            select(RecoveryCredential).where(
                RecoveryCredential.account_id == account.id,
                RecoveryCredential.kind == "totp_recovery",
                RecoveryCredential.used_at.is_(None),
            )
        ):
            credential.used_at = now
        raw_token = secrets.token_urlsafe(32)
        session.add(
            RecoveryCredential(
                account_id=account.id,
                kind="totp_recovery",
                value_hash=keyed_digest(raw_token),
                expires_at=now + timedelta(minutes=15),
            )
        )
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp_recovery.requested",
                target_id=audit_identifier(account.id),
                result="success",
                reason="recovery_dispatched",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        send_totp_recovery_email(account.email, raw_token)
    record_failed_authentication(session, target_id, origin_id, throttle, now)
    session.commit()
    return PublicMessage(message=GENERIC_RECOVERY_MESSAGE)


@app.post("/api/v1/totp-recoveries", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def recover_totp(
    recovery_request: TotpRecoveryRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> Response | JSONResponse:
    """Consume independent recovery factors and require fresh TOTP enrollment.

    Args:
        recovery_request: E-mail token and offline recovery key.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        A restricted activation cookie or a safe invalid-recovery error.
    """
    target_id, origin_id, throttle, now = authentication_throttle(
        session,
        request,
        "totp-recovery",
        recovery_request.token,
        now,
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp_recovered",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))

    token = session.scalar(
        select(RecoveryCredential)
        .where(
            RecoveryCredential.value_hash == keyed_digest(recovery_request.token),
            RecoveryCredential.kind == "totp_recovery",
            RecoveryCredential.used_at.is_(None),
            RecoveryCredential.expires_at > now,
        )
        .with_for_update()
    )
    account = session.get(Account, token.account_id) if token is not None else None
    offline_key = None
    if account is not None:
        offline_key = session.scalar(
            select(RecoveryCredential)
            .where(
                RecoveryCredential.account_id == account.id,
                RecoveryCredential.kind == "offline_key",
                RecoveryCredential.value_hash == keyed_digest(recovery_request.offline_recovery_key),
                RecoveryCredential.used_at.is_(None),
            )
            .with_for_update()
        )
    if token is None or offline_key is None or account is None or account.role != "patient":
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.totp_recovered",
                target_id=keyed_digest(f"totp_recovery:{recovery_request.token}"),
                result="denied",
                reason="invalid_or_expired_recovery",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return error_response(
            request,
            status.HTTP_400_BAD_REQUEST,
            "invalid_or_expired_recovery",
            "A recuperação não é válida ou expirou.",
        )

    if throttle is not None:
        session.delete(throttle)
    for credential in session.scalars(
        select(RecoveryCredential).where(
            RecoveryCredential.account_id == account.id,
            RecoveryCredential.used_at.is_(None),
        )
    ):
        credential.used_at = now
    for account_session in session.scalars(
        select(AccountSession).where(
            AccountSession.account_id == account.id,
            AccountSession.revoked_at.is_(None),
        )
    ):
        account_session.revoked_at = now
    totp_credential = session.scalar(select(TotpCredential).where(TotpCredential.account_id == account.id))
    if totp_credential is not None:
        session.delete(totp_credential)

    raw_session_token = secrets.token_urlsafe(32)
    account.status = "activation_pending"
    session.add(
        AccountSession(
            account_id=account.id,
            token_hash=keyed_digest(raw_session_token),
            purpose="totp_recovery",
            created_at=now,
            last_used_at=now,
            expires_at=now + timedelta(minutes=15),
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.totp_recovered",
            target_id=audit_identifier(account.id),
            result="success",
            reason="factors_invalidated_reenrollment_required",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.headers["X-CSRF-Token"] = csrf_token(raw_session_token)
    response.set_cookie(
        key="__Host-vitallink_activation",
        value=raw_session_token,
        max_age=900,
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    response.delete_cookie(
        key="__Host-vitallink_session",
        secure=True,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return response


@app.post("/api/v1/password-resets", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def reset_password(
    reset_request: PasswordResetRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> Response | JSONResponse:
    """Consume a recovery token, replace the password, and revoke all sessions.

    Args:
        reset_request: Opaque token and validated replacement password.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        An empty response or a safe invalid-token error.
    """
    target_id, origin_id, throttle, now = authentication_throttle(
        session, request, "password-reset", reset_request.token, now
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.password_reset",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))
    credential = session.scalar(
        select(RecoveryCredential)
        .where(
            RecoveryCredential.value_hash == keyed_digest(reset_request.token),
            RecoveryCredential.kind == "password_reset",
            RecoveryCredential.used_at.is_(None),
            RecoveryCredential.expires_at > now,
        )
        .with_for_update()
    )
    account = session.get(Account, credential.account_id) if credential is not None else None
    if credential is None or account is None or account.status != "active":
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=None,
                action="account.password_reset",
                target_id=keyed_digest(f"password_reset:{reset_request.token}"),
                result="denied",
                reason="invalid_or_expired_recovery",
                correlation_id=request.state.correlation_id,
                event_metadata={},
            )
        )
        session.commit()
        return error_response(
            request,
            status.HTTP_400_BAD_REQUEST,
            "invalid_or_expired_recovery",
            "A recuperação não é válida ou expirou.",
        )

    if throttle is not None:
        session.delete(throttle)
    account.password_hash = password_hasher.hash(reset_request.new_password)
    credential.used_at = now
    for account_session in session.scalars(
        select(AccountSession).where(
            AccountSession.account_id == account.id,
            AccountSession.revoked_at.is_(None),
        )
    ):
        account_session.revoked_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.password_reset",
            target_id=audit_identifier(account.id),
            result="success",
            reason="password_replaced_sessions_revoked",
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


@app.post(
    "/api/v1/professional-registrations",
    response_model=PublicMessage,
    status_code=status.HTTP_202_ACCEPTED,
)
def register_professional(
    registration: ProfessionalRegistration,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
) -> PublicMessage:
    """Create a professional account without disclosing duplicate identity data.

    Args:
        registration: Validated professional registration data.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.

    Returns:
        A generic response for new and repeated registrations.
    """
    normalized_email = str(registration.email).strip().casefold()
    normalized_crm = registration.crm.strip().upper()
    existing_account = session.scalar(select(Account).where(Account.email == normalized_email))
    if existing_account is None:
        existing_professional = session.scalar(
            select(Professional).where(
                or_(
                    Professional.cpf == registration.cpf,
                    (Professional.crm == normalized_crm) & (Professional.uf == registration.uf),
                )
            )
        )
        if existing_professional is not None:
            existing_account = session.get(Account, existing_professional.account_id)
    if existing_account is not None:
        session.add(
            AuditEvent(
                actor_id=None,
                action="professional.registration.requested",
                target_id=audit_identifier(existing_account.id),
                result="denied",
                reason="duplicate_suppressed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": "professional"},
            )
        )
        session.commit()
        return PublicMessage(message=GENERIC_REGISTRATION_MESSAGE)

    account = Account(
        email=normalized_email,
        password_hash=password_hasher.hash(registration.password),
        role="professional",
        status="awaiting_confirmation",
    )
    account.professional = Professional(
        name=registration.name.strip(),
        cpf=registration.cpf,
        birthdate=registration.birthdate,
        phone=registration.phone.strip(),
        crm=normalized_crm,
        uf=registration.uf,
        specialty=registration.specialty.strip(),
        institution=registration.institution.strip() if registration.institution else None,
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
            action="professional.registration.requested",
            target_id=audit_identifier(account.id),
            result="success",
            reason="registration_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": "professional"},
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
                action="professional.registration.requested",
                target_id=keyed_digest(normalized_email),
                result="denied",
                reason="duplicate_suppressed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": "professional"},
            )
        )
        session.commit()
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
    account.status = "pending_validation" if account.role == "professional" else "active"
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
    now: Annotated[datetime, Depends(current_time)],
) -> Response:
    """Authenticate an active account with password and TOTP.

    Args:
        login_request: Submitted account factors.
        request: Current request carrying its correlation identifier.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        An opaque secure session cookie or a generic authentication error.
    """
    normalized_email = str(login_request.email).casefold()
    target_id, origin_id, throttle, now = authentication_throttle(session, request, "login", normalized_email, now)
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

    if (
        account is not None
        and account.role == "professional"
        and account.status in {"pending_validation", "rejected"}
        and password_valid
        and totp_valid
    ):
        response_code = (
            "professional_pending_validation" if account.status == "pending_validation" else "professional_rejected"
        )
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.login",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="professional_validation_required",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "status": account.status},
            )
        )
        session.commit()
        return error_response(
            request,
            status.HTTP_403_FORBIDDEN,
            response_code,
            "Cadastro profissional pendente de validação."
            if account.status == "pending_validation"
            else "Cadastro profissional rejeitado.",
        )

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
            created_at=now,
            last_used_at=now,
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
    now: Annotated[datetime, Depends(current_time)],
) -> Response | JSONResponse:
    """Revoke the current opaque session and clear its cookie.

    Args:
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        An empty response after revocation or a safe denial.
    """
    context = authenticated_session(request, session, now)
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

    account_session.revoked_at = now
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


@app.get("/api/v1/sessions", response_model=list[AccountSessionResponse])
def list_sessions(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[AccountSessionResponse] | JSONResponse:
    """List valid sessions owned by the authenticated account.

    Args:
        request: Request containing the current opaque session cookie.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Owned session metadata or an authentication error.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    current_session, account = context
    owned_sessions = session.scalars(
        select(AccountSession)
        .where(
            AccountSession.account_id == account.id,
            AccountSession.purpose == "authenticated",
            AccountSession.revoked_at.is_(None),
            AccountSession.expires_at > now,
            AccountSession.last_used_at > now - timedelta(minutes=30),
        )
        .order_by(AccountSession.created_at.desc())
    )
    return [
        AccountSessionResponse(
            id=owned_session.id,
            current=owned_session.id == current_session.id,
            created_at=owned_session.created_at,
            last_used_at=owned_session.last_used_at,
            expires_at=owned_session.expires_at,
        )
        for owned_session in owned_sessions
    ]


@app.post(
    "/api/v1/step-up-confirmations",
    response_model=StepUpConfirmationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_step_up_confirmation(
    confirmation_request: StepUpConfirmationRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> StepUpConfirmationResponse | JSONResponse:
    """Confirm TOTP for one sensitive action in the current session.

    Args:
        confirmation_request: Supported action and authenticator code.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        A five-minute, single-use confirmation or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.step_up.confirmed",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "action": confirmation_request.action},
            )
        )
        session.commit()
        return csrf_denied_response(request)

    target_id, origin_id, throttle, now = authentication_throttle(
        session,
        request,
        f"step-up:{confirmation_request.action}",
        str(account.id),
        now,
    )
    if throttle is not None and throttle.blocked_until is not None and throttle.blocked_until > now:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.step_up.confirmed",
                target_id=target_id,
                result="denied",
                reason="rate_limited",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "action": confirmation_request.action},
            )
        )
        session.commit()
        return limited_login_response(request, math.ceil((throttle.blocked_until - now).total_seconds()))

    credential = session.scalar(
        select(TotpCredential).where(
            TotpCredential.account_id == account.id,
            TotpCredential.confirmed_at.is_not(None),
        )
    )
    valid_totp = False
    if credential is not None:
        secret = secret_cipher.decrypt(credential.secret_ciphertext.encode()).decode()
        valid_totp = pyotp.TOTP(secret).verify(confirmation_request.totp_code, valid_window=1)
    if not valid_totp:
        record_failed_authentication(session, target_id, origin_id, throttle, now)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.step_up.confirmed",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="invalid_totp",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "action": confirmation_request.action},
            )
        )
        session.commit()
        return error_response(request, 401, "invalid_confirmation", "Não foi possível confirmar a ação.")

    if throttle is not None:
        session.delete(throttle)
    confirmation = StepUpConfirmation(
        account_id=account.id,
        session_id=account_session.id,
        action=confirmation_request.action,
        expires_at=now + timedelta(minutes=5),
    )
    session.add(confirmation)
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.step_up.confirmed",
            target_id=audit_identifier(account.id),
            result="success",
            reason="totp_verified",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "action": confirmation_request.action},
        )
    )
    session.commit()
    return StepUpConfirmationResponse(id=confirmation.id, expires_at=confirmation.expires_at)


@app.patch("/api/v1/me/password", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def change_password(
    password_request: PasswordChangeRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> Response | JSONResponse:
    """Change the owner's password after a session-bound TOTP confirmation.

    Args:
        password_request: Current password, replacement, and step-up identifier.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        An empty response or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.password_changed",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)

    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == password_request.step_up_confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "password_change",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is not None:
        confirmation.used_at = now
    try:
        current_password_valid = password_hasher.verify(account.password_hash, password_request.current_password)
    except VerificationError:
        current_password_valid = False
    if confirmation is None or not current_password_valid:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.password_changed",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="action_confirmation_required" if confirmation is None else "invalid_current_password",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, "action_confirmation_required", "Confirme novamente esta ação.")

    account.password_hash = password_hasher.hash(password_request.new_password)
    for other_session in session.scalars(
        select(AccountSession).where(
            AccountSession.account_id == account.id,
            AccountSession.id != account_session.id,
            AccountSession.revoked_at.is_(None),
        )
    ):
        other_session.revoked_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.password_changed",
            target_id=audit_identifier(account.id),
            result="success",
            reason="password_replaced_other_sessions_revoked",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.delete("/api/v1/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_owned_session(
    session_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> Response | JSONResponse:
    """Revoke one session only when it belongs to the authenticated account.

    Args:
        session_id: Unpredictable identifier returned by the owner's session list.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        An empty response after revocation or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    current_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.session.revoked",
                target_id=keyed_digest(str(session_id)),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)

    owned_session = session.scalar(
        select(AccountSession)
        .where(
            AccountSession.id == session_id,
            AccountSession.account_id == account.id,
            AccountSession.purpose == "authenticated",
            AccountSession.revoked_at.is_(None),
        )
        .with_for_update()
    )
    if owned_session is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="account.session.revoked",
                target_id=keyed_digest(str(session_id)),
                result="denied",
                reason="session_not_found",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "session_not_found", "Sessão não encontrada.")

    owned_session.revoked_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="account.session.revoked",
            target_id=keyed_digest(str(owned_session.id)),
            result="success",
            reason="owner_requested",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "current": str(owned_session.id == current_session.id).lower()},
        )
    )
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    if owned_session.id == current_session.id:
        response.delete_cookie(
            key="__Host-vitallink_session",
            secure=True,
            httponly=True,
            samesite="strict",
            path="/",
        )
    return response


@app.post("/api/v1/access-codes", status_code=status.HTTP_201_CREATED, response_model=AccessCodeCreatedResponse)
def create_access_code(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AccessCodeCreatedResponse | JSONResponse:
    """Create a temporary code for the authenticated patient.

    Args:
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The plaintext code once, or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.created",
                target_id=None,
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.created",
                target_id=None,
                result="denied",
                reason="patient_required",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, "patient_required", "Apenas pacientes podem gerar códigos.")

    raw_code = secrets.token_urlsafe(24)
    access_code = AccessCode(
        patient_id=patient.id,
        code_hash=keyed_digest(raw_code),
        created_at=now,
        expires_at=now + timedelta(hours=24),
    )
    session.add(access_code)
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="access_code.created",
            target_id=audit_identifier(access_code.id),
            result="success",
            reason="patient_requested",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return AccessCodeCreatedResponse(
        id=access_code.id,
        code=raw_code,
        expires_at=access_code.expires_at,
        status="active",
    )


def access_code_status(access_code: AccessCode, now: datetime) -> str:
    """Resolve the externally visible state of an access code.

    Args:
        access_code: Persisted code metadata.
        now: Server-controlled current time.

    Returns:
        Active, consumed, revoked, or expired state.
    """
    if access_code.consumed_at is not None:
        return "consumed"
    if access_code.revoked_at is not None:
        return "revoked"
    if access_code.expires_at <= now:
        return "expired"
    return "active"


def active_authorization(
    session: Session,
    professional_id: UUID,
    patient_id: UUID,
    category: str,
    operation: str,
    now: datetime,
) -> Authorization | None:
    """Reevaluate one professional operation against persisted authorization.

    Args:
        session: Database transaction scope.
        professional_id: Professional attempting the operation.
        patient_id: Patient whose resource is requested.
        category: Normative data category required by the resource.
        operation: Normative operation required by the resource.
        now: Server-controlled operation time.

    Returns:
        A matching active authorization, or None for every denial case.
    """
    return session.scalar(
        select(Authorization)
        .where(
            Authorization.professional_id == professional_id,
            Authorization.patient_id == patient_id,
            Authorization.status == "active",
            Authorization.starts_at <= now,
            Authorization.expires_at > now,
            Authorization.categories.contains([category]),
            Authorization.operations.contains([operation]),
        )
        .order_by(Authorization.expires_at.desc())
        .with_for_update()
    )


def authorization_change_denied(
    session: Session,
    request: Request,
    account: Account,
    authorization_id: UUID,
    action: str,
    reason: str,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """Audit and return one safe authorization-change denial.

    Args:
        session: Database transaction scope.
        request: Request carrying the correlation identifier.
        account: Authenticated actor whose change was denied.
        authorization_id: Opaque target authorization identifier.
        action: Audit action attempted by the actor.
        reason: Stable denial reason without submitted content.
        status_code: Public HTTP status.
        code: Stable public error code.
        message: Safe user-facing message.

    Returns:
        A correlated error response after persisting the audit event.
    """
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action=action,
            target_id=audit_identifier(authorization_id),
            result="denied",
            reason=reason,
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return error_response(request, status_code, code, message)


def personal_observation_response(observation: PersonalObservation) -> PersonalObservationResponse:
    """Expose one observation with patient authorship and no account identifier.

    Args:
        observation: Persisted current observation version.

    Returns:
        Safe observation representation with explicit provenance.
    """
    return PersonalObservationResponse(
        id=observation.id,
        text=observation.text,
        author="patient",
        created_at=observation.created_at,
        version=observation.version,
    )


def document_response(document: Document) -> DocumentResponse:
    """Expose document metadata without storage coordinates.

    Args:
        document: Persisted document metadata.

    Returns:
        Safe document representation.
    """
    return DocumentResponse(
        id=document.id,
        category=document.category,
        original_name=document.original_name,
        content_type=document.content_type,
        size=document.size,
        status=document.status,
        created_at=document.created_at,
    )


def authorized_document_patient(
    session: Session,
    account: Account,
    patient_id: UUID | None,
    category: str,
    operation: str,
    now: datetime,
) -> Patient | None:
    """Resolve the patient only when the actor may perform a document operation.

    Args:
        session: Database transaction scope.
        account: Authenticated actor.
        patient_id: Explicit target for professional operations.
        category: Document category being accessed.
        operation: Normative operation being performed.
        now: Server-controlled operation time.

    Returns:
        Authorized patient or None without revealing the denial reason.
    """
    if account.role == "patient":
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
        return patient if patient is not None and patient_id in (None, patient.id) else None
    professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
    if professional is None or patient_id is None:
        return None
    authorization = active_authorization(session, professional.id, patient_id, category, operation, now)
    return session.get(Patient, patient_id) if authorization is not None else None


def transcription_error(
    request: Request,
    session: Session,
    account: Account,
    patient_id: UUID,
    reason: str,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """Audit and return one transcription denial without audio or draft text."""
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="transcription.created",
            target_id=audit_identifier(patient_id),
            result="denied",
            reason=reason,
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return error_response(request, status_code, code, message)


@app.post("/api/v1/transcriptions", response_model=TranscriptionResponse)
def create_transcription(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID, Form()],
    category: Annotated[Literal["consultas", "recomendações", "metas", "mensagens"], Form()],
    operation: Annotated[Literal["anexar", "atualizar"], Form()],
    audio: Annotated[UploadFile, File()],
) -> TranscriptionResponse | JSONResponse:
    """Return a local Portuguese draft and retain no uploaded audio."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, patient_id, category, operation, now)
    if account.role != "professional" or patient is None or not valid_csrf(request, "__Host-vitallink_session"):
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "not_found_or_not_authorized",
            404,
            "transcription_not_available",
            "Ditado não disponível.",
        )
    suffixes = {
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
    }
    suffix = suffixes.get(audio.content_type or "")
    if suffix is None:
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "unsupported_audio_type",
            422,
            "invalid_audio",
            "Use um formato de áudio compatível.",
        )
    content = audio.file.read(settings.transcription_max_bytes + 1)
    audio.file.close()
    if len(content) > settings.transcription_max_bytes:
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "audio_too_large",
            413,
            "audio_too_large",
            "O áudio excede o limite permitido.",
        )
    try:
        draft, _ = transcribe_temporary_audio(content, suffix, settings)
    except InvalidAudioError:
        return transcription_error(
            request, session, account, patient_id, "invalid_or_too_long_audio", 422, "invalid_audio", "Revise o áudio."
        )
    except NoSpeechError:
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "no_speech_detected",
            422,
            "no_speech_detected",
            "Nenhuma fala foi detectada.",
        )
    except TranscriptionTimeoutError:
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "transcription_timeout",
            504,
            "transcription_timeout",
            "A transcrição excedeu o tempo limite.",
        )
    except TranscriptionUnavailableError:
        return transcription_error(
            request,
            session,
            account,
            patient_id,
            "transcription_unavailable",
            503,
            "transcription_unavailable",
            "A transcrição local está indisponível.",
        )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="transcription.created",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="local_draft_returned_audio_discarded",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return TranscriptionResponse(draft=draft, language="pt", requires_confirmation=True)


@app.post("/api/v1/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    category: Annotated[str, Form()],
    file: Annotated[UploadFile, File()],
    patient_id: Annotated[UUID | None, Form()] = None,
) -> DocumentResponse | JSONResponse:
    """Validate, scan, and privately store one patient document.

    Args:
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.
        category: Normative clinical category for later authorization checks.
        file: Bounded PDF, PNG, or JPEG upload.
        patient_id: Explicit target required for professional uploads.

    Returns:
        Approved metadata or a safe rejection while quarantine remains private.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, patient_id, category, "anexar", now)
    if not valid_csrf(request, "__Host-vitallink_session") or patient is None:
        reason = "request_verification_failed" if patient is not None else "not_authorized"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.uploaded",
                target_id=None,
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, reason, "Não foi possível enviar o documento.")
    patient = session.scalar(select(Patient).where(Patient.id == patient.id).with_for_update())
    assert patient is not None

    content = await file.read(settings.document_max_bytes + 1)
    detected_type = document_content_type(content)
    original_name = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    allowed_extensions = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": (".jpg", ".jpeg")}
    expected_extensions = allowed_extensions.get(detected_type, ())
    if isinstance(expected_extensions, str):
        expected_extensions = (expected_extensions,)
    invalid_upload = (
        not content
        or len(content) > settings.document_max_bytes
        or detected_type is None
        or file.content_type != detected_type
        or not original_name.casefold().endswith(expected_extensions)
        or len(original_name) > 255
        or any(ord(character) < 32 for character in original_name)
        or category not in {"exames", "laudos", "receitas", "imagens"}
    )
    used_bytes = session.scalar(
        select(func.coalesce(func.sum(Document.size), 0)).where(
            Document.patient_id == patient.id,
            Document.status.in_(("quarantine", "approved")),
        )
    )
    if invalid_upload or used_bytes + len(content) > settings.patient_document_quota_bytes:
        reason = "invalid_file" if invalid_upload else "patient_quota_exceeded"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.uploaded",
                target_id=None,
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "category": category},
            )
        )
        session.commit()
        return error_response(request, 422, reason, "O documento não atende aos requisitos de envio.")

    client = storage_client()
    try:
        ensure_private_buckets(client)
        document = Document(
            patient_id=patient.id,
            uploaded_by_account_id=account.id,
            category=category,
            original_name=original_name,
            storage_key=uuid4().hex,
            content_type=detected_type,
            size=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
            status="quarantine",
            created_at=now,
        )
        client.put_object(
            Bucket=settings.s3_quarantine_bucket,
            Key=document.storage_key,
            Body=content,
            ContentType="application/octet-stream",
        )
        session.add(document)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.uploaded",
                target_id=audit_identifier(document.id),
                result="success",
                reason="quarantined",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "category": document.category, "size": document.size},
            )
        )
        session.commit()
    except Exception:
        session.rollback()
        http_logger.exception("Document quarantine failed")
        return error_response(
            request, 503, "document_storage_unavailable", "O envio está temporariamente indisponível."
        )

    try:
        scan_result = clamav_scan(content)
    except OSError:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.scanned",
                target_id=audit_identifier(document.id),
                result="failed",
                reason="scanner_unavailable",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 503, "document_scan_unavailable", "O documento permanece em quarentena.")

    if scan_result == "infected":
        document.status = "rejected"
        try:
            client.delete_object(Bucket=settings.s3_quarantine_bucket, Key=document.storage_key)
        except Exception:
            http_logger.exception("Rejected document cleanup failed")
        result = "denied"
        reason = "malware_detected"
    else:
        try:
            client.copy_object(
                Bucket=settings.s3_approved_bucket,
                Key=document.storage_key,
                CopySource={"Bucket": settings.s3_quarantine_bucket, "Key": document.storage_key},
                ContentType=document.content_type,
                MetadataDirective="REPLACE",
            )
            client.delete_object(Bucket=settings.s3_quarantine_bucket, Key=document.storage_key)
        except Exception:
            http_logger.exception("Document promotion failed")
            session.add(
                AuditEvent(
                    actor_id=audit_identifier(account.id),
                    action="document.scanned",
                    target_id=audit_identifier(document.id),
                    result="failed",
                    reason="promotion_failed",
                    correlation_id=request.state.correlation_id,
                    event_metadata={"role": account.role},
                )
            )
            session.commit()
            return error_response(request, 503, "document_storage_unavailable", "O documento permanece em quarentena.")
        document.status = "approved"
        result = "success"
        reason = "clean"
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="document.scanned",
            target_id=audit_identifier(document.id),
            result=result,
            reason=reason,
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "content_type": document.content_type},
        )
    )
    session.add(
        Notification(
            account_id=patient.account_id,
            kind="document_available" if result == "success" else "document_rejected",
            subject_id=document.id,
            created_at=now,
        )
    )
    session.commit()
    if document.status == "rejected":
        return error_response(request, 422, "malware_detected", "O documento foi rejeitado com segurança.")
    return document_response(document)


@app.get("/api/v1/documents", response_model=list[DocumentResponse])
def list_documents(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID | None, Query()] = None,
) -> list[DocumentResponse] | JSONResponse:
    """List approved documents after reevaluating ownership or authorization.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.
        patient_id: Explicit target required for professional access.

    Returns:
        Currently readable document metadata or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if account.role == "patient":
        patient = authorized_document_patient(session, account, patient_id, "histórico", "consultar", now)
        documents = (
            []
            if patient is None
            else session.scalars(
                select(Document)
                .where(Document.patient_id == patient.id, Document.status == "approved")
                .order_by(Document.created_at.desc())
            ).all()
        )
    else:
        professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
        if professional is None or patient_id is None:
            documents = []
        else:
            candidates = session.scalars(
                select(Document)
                .where(Document.patient_id == patient_id, Document.status == "approved")
                .order_by(Document.created_at.desc())
            ).all()
            documents = [
                document
                for document in candidates
                if active_authorization(
                    session,
                    professional.id,
                    document.patient_id,
                    document.category,
                    "consultar",
                    now,
                )
                is not None
            ]
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="document.listed",
            target_id=audit_identifier(patient_id) if patient_id is not None else None,
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(documents)},
        )
    )
    session.commit()
    return [document_response(document) for document in documents]


@app.get("/api/v1/documents/{document_id}/content", response_model=None)
def read_document_content(
    document_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    download: Annotated[bool, Query()] = False,
    step_up_confirmation_id: Annotated[UUID | None, Query()] = None,
) -> Response:
    """Return approved bytes after fresh authorization and optional download step-up.

    Args:
        document_id: Opaque document identifier.
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.
        download: Whether to force a local attachment download.
        step_up_confirmation_id: Single-use TOTP proof required for downloads.

    Returns:
        Isolated content bytes or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    document = session.scalar(select(Document).where(Document.id == document_id, Document.status == "approved"))
    patient = None
    if document is not None:
        patient = authorized_document_patient(
            session,
            account,
            document.patient_id,
            document.category,
            "consultar",
            now,
        )
    if document is None or patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.read",
                target_id=audit_identifier(document_id),
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "document_not_found", "Documento não encontrado.")
    if download:
        confirmation = session.scalar(
            select(StepUpConfirmation)
            .where(
                StepUpConfirmation.id == step_up_confirmation_id,
                StepUpConfirmation.account_id == account.id,
                StepUpConfirmation.session_id == account_session.id,
                StepUpConfirmation.action == "document_download",
                StepUpConfirmation.used_at.is_(None),
                StepUpConfirmation.expires_at > now,
            )
            .with_for_update()
        )
        if confirmation is None:
            session.add(
                AuditEvent(
                    actor_id=audit_identifier(account.id),
                    action="document.downloaded",
                    target_id=audit_identifier(document.id),
                    result="denied",
                    reason="action_confirmation_required",
                    correlation_id=request.state.correlation_id,
                    event_metadata={"role": account.role, "category": document.category},
                )
            )
            session.commit()
            return error_response(request, 403, "action_confirmation_required", "Confirme novamente esta ação.")
        confirmation.used_at = now
    try:
        content = (
            storage_client()
            .get_object(
                Bucket=settings.s3_approved_bucket,
                Key=document.storage_key,
            )["Body"]
            .read()
        )
    except Exception:
        http_logger.exception("Approved document read failed")
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.read",
                target_id=audit_identifier(document.id),
                result="failed",
                reason="storage_unavailable",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request, 503, "document_storage_unavailable", "O documento está temporariamente indisponível."
        )
    if not hmac.compare_digest(hashlib.sha256(content).hexdigest(), document.sha256):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.read",
                target_id=audit_identifier(document.id),
                result="failed",
                reason="integrity_mismatch",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request, 503, "document_integrity_failed", "O documento está temporariamente indisponível."
        )
    action = "document.downloaded" if download else "document.viewed"
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action=action,
            target_id=audit_identifier(document.id),
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "category": document.category},
        )
    )
    session.commit()
    disposition = "attachment" if download else "inline"
    return Response(
        content=content,
        media_type=document.content_type,
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(document.original_name)}",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.get(
    "/api/v1/documents/{document_id}/authorized-professionals",
    response_model=list[DocumentAuthorizedProfessionalResponse],
)
def list_document_authorized_professionals(
    document_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[DocumentAuthorizedProfessionalResponse] | JSONResponse:
    """List professionals who currently may consult an owned document.

    Args:
        document_id: Opaque owned document identifier.
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Current authorized professionals or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    document = (
        None
        if patient is None
        else session.scalar(
            select(Document).where(
                Document.id == document_id,
                Document.patient_id == patient.id,
                Document.status == "approved",
            )
        )
    )
    if document is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="document.authorized_professionals.listed",
                target_id=audit_identifier(document_id),
                result="denied",
                reason="not_found_or_not_owned",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "document_not_found", "Documento não encontrado.")
    rows = session.execute(
        select(Authorization, Professional)
        .join(Professional, Professional.id == Authorization.professional_id)
        .where(
            Authorization.patient_id == patient.id,
            Authorization.status == "active",
            Authorization.starts_at <= now,
            Authorization.expires_at > now,
            Authorization.categories.contains([document.category]),
            Authorization.operations.contains(["consultar"]),
        )
        .order_by(Professional.name)
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="document.authorized_professionals.listed",
            target_id=audit_identifier(document.id),
            result="success",
            reason="owner_listed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(rows)},
        )
    )
    session.commit()
    return [
        DocumentAuthorizedProfessionalResponse(
            id=professional.id,
            name=professional.name,
            specialty=professional.specialty,
            institution=professional.institution,
            expires_at=authorization.expires_at,
        )
        for authorization, professional in rows
    ]


def clinical_result_range_position(result: ClinicalResult) -> str:
    """Compare a result only with its own laboratory interval.

    Args:
        result: Confirmed structured result.

    Returns:
        Neutral ``below``, ``within``, or ``above`` position.
    """
    if result.value < result.reference_min:
        return "below"
    if result.value > result.reference_max:
        return "above"
    return "within"


def clinical_result_response(session: Session, result: ClinicalResult) -> ClinicalResultResponse:
    """Expose one current result with immutable authorship and origin.

    Args:
        session: Database transaction scope.
        result: Persisted confirmed result.

    Returns:
        Safe structured result response.
    """
    author = session.get(Account, result.author_account_id)
    assert author is not None
    return ClinicalResultResponse(
        id=result.id,
        exam_name=result.exam_name,
        value=float(result.value),
        unit=result.unit,
        measured_at=result.measured_at,
        origin=result.origin,
        reference_min=float(result.reference_min),
        reference_max=float(result.reference_max),
        confirmed=result.confirmed,
        range_position=clinical_result_range_position(result),
        author=author.role,
        version=result.version,
        created_at=result.created_at,
    )


@app.post("/api/v1/clinical-results", response_model=ClinicalResultResponse, status_code=status.HTTP_201_CREATED)
def create_clinical_result(
    result_request: ClinicalResultCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalResultResponse | JSONResponse:
    """Persist one explicitly confirmed structured result.

    Args:
        result_request: Essential measurement, reference, and provenance fields.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Persisted current result or a safe authorization denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, result_request.patient_id, "exames", "anexar", now)
    if not valid_csrf(request, "__Host-vitallink_session") or patient is None:
        reason = "request_verification_failed" if patient is not None else "not_authorized"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_result.created",
                target_id=None,
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, reason, "Não foi possível salvar o resultado.")
    result = ClinicalResult(
        patient_id=patient.id,
        author_account_id=account.id,
        exam_name=result_request.exam_name,
        value=result_request.value,
        unit=result_request.unit,
        measured_at=result_request.measured_at,
        origin=result_request.origin,
        reference_min=result_request.reference_min,
        reference_max=result_request.reference_max,
        confirmed=True,
        version=1,
        current=True,
        created_at=now,
    )
    session.add(result)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_result.created",
            target_id=audit_identifier(result.id),
            result="success",
            reason="explicitly_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={
                "role": account.role,
                "version": result.version,
                "range_position": clinical_result_range_position(result),
            },
        )
    )
    session.commit()
    return clinical_result_response(session, result)


@app.get("/api/v1/clinical-results", response_model=list[ClinicalResultResponse])
def list_clinical_results(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID | None, Query()] = None,
) -> list[ClinicalResultResponse] | JSONResponse:
    """List current confirmed results within freshly evaluated scope.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.
        patient_id: Explicit patient target required for professional access.

    Returns:
        Current confirmed results or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, patient_id, "exames", "consultar", now)
    if patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_result.listed",
                target_id=audit_identifier(patient_id) if patient_id is not None else None,
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "clinical_results_not_found", "Resultados não encontrados.")
    results = session.scalars(
        select(ClinicalResult)
        .where(
            ClinicalResult.patient_id == patient.id,
            ClinicalResult.current.is_(True),
            ClinicalResult.confirmed.is_(True),
        )
        .order_by(ClinicalResult.measured_at.desc(), ClinicalResult.created_at.desc())
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_result.listed",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(results)},
        )
    )
    session.commit()
    return [clinical_result_response(session, result) for result in results]


@app.patch("/api/v1/clinical-results/{result_id}", response_model=ClinicalResultResponse)
def correct_clinical_result(
    result_id: UUID,
    correction_request: ClinicalResultCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalResultResponse | JSONResponse:
    """Create a replacement version while preserving authorship and origin.

    Args:
        result_id: Opaque identifier of the version being corrected.
        correction_request: Confirmed replacement and expected current version.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Replacement version or a safe ownership/version denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_result.corrected",
                target_id=audit_identifier(result_id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, "request_verification_failed", "Não foi possível corrigir o resultado.")
    original = session.scalar(select(ClinicalResult).where(ClinicalResult.id == result_id).with_for_update())
    patient = None
    if original is not None:
        patient = authorized_document_patient(session, account, original.patient_id, "exames", "atualizar", now)
    if original is None or patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_result.corrected",
                target_id=audit_identifier(result_id),
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "clinical_result_not_found", "Resultado não encontrado.")
    if not original.current or original.version != correction_request.expected_version:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_result.corrected",
                target_id=audit_identifier(result_id),
                result="denied",
                reason="version_conflict",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "expected_version": correction_request.expected_version},
            )
        )
        session.commit()
        return error_response(request, 409, "clinical_result_conflict", "O resultado possui uma versão mais recente.")
    replacement = ClinicalResult(
        patient_id=original.patient_id,
        author_account_id=original.author_account_id,
        exam_name=correction_request.exam_name,
        value=correction_request.value,
        unit=correction_request.unit,
        measured_at=correction_request.measured_at,
        origin=original.origin,
        reference_min=correction_request.reference_min,
        reference_max=correction_request.reference_max,
        confirmed=True,
        version=original.version + 1,
        current=True,
        replaces_id=original.id,
        correction_reason=correction_request.correction_reason,
        created_at=now,
    )
    original.current = False
    session.add(replacement)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_result.corrected",
            target_id=audit_identifier(replacement.id),
            result="success",
            reason="replacement_created",
            correlation_id=request.state.correlation_id,
            event_metadata={
                "role": account.role,
                "version": replacement.version,
                "range_position": clinical_result_range_position(replacement),
            },
        )
    )
    session.commit()
    return clinical_result_response(session, replacement)


def clinical_goal_response(session: Session, goal: ClinicalGoal) -> ClinicalGoalResponse:
    """Expose one goal without merging professional authors.

    Args:
        session: Database transaction scope.
        goal: Current immutable goal version.

    Returns:
        Goal with its professional attribution.
    """
    professional = session.scalar(select(Professional).where(Professional.account_id == goal.author_account_id))
    assert professional is not None
    return ClinicalGoalResponse(
        id=goal.id,
        exam_name=goal.exam_name,
        minimum=float(goal.minimum),
        maximum=float(goal.maximum),
        unit=goal.unit,
        justification=goal.justification,
        effective_at=goal.effective_at,
        author=ProfessionalRecordAuthorResponse(name=professional.name, specialty=professional.specialty),
        version=goal.version,
        created_at=goal.created_at,
    )


def consume_goal_confirmation(
    session: Session,
    confirmation_id: UUID,
    account_session: AccountSession,
    account: Account,
    now: datetime,
) -> bool:
    """Consume one session-bound TOTP proof for a clinical-goal write.

    Args:
        session: Database transaction scope.
        confirmation_id: Submitted opaque proof identifier.
        account_session: Current authenticated session.
        account: Current professional account.
        now: Server-controlled operation time.

    Returns:
        Whether a fresh matching proof was consumed.
    """
    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "clinical_goal_write",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is None:
        return False
    confirmation.used_at = now
    return True


def goal_exam_exists(session: Session, patient_id: UUID, exam_name: str, unit: str) -> bool:
    """Check that a goal uses the unit of a confirmed structured exam.

    Args:
        session: Database transaction scope.
        patient_id: Goal patient owner.
        exam_name: Submitted exam label.
        unit: Submitted measurement unit.

    Returns:
        Whether a current confirmed result matches both exam and unit.
    """
    return (
        session.scalar(
            select(ClinicalResult.id).where(
                ClinicalResult.patient_id == patient_id,
                ClinicalResult.current.is_(True),
                ClinicalResult.confirmed.is_(True),
                func.lower(ClinicalResult.exam_name) == exam_name.casefold(),
                func.lower(ClinicalResult.unit) == unit.casefold(),
            )
        )
        is not None
    )


@app.post("/api/v1/clinical-goals", response_model=ClinicalGoalResponse, status_code=status.HTTP_201_CREATED)
def create_clinical_goal(
    goal_request: ClinicalGoalCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalGoalResponse | JSONResponse:
    """Create one professional goal for a compatible structured exam."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    patient = authorized_document_patient(session, account, goal_request.patient_id, "metas", "anexar", now)
    allowed = valid_csrf(request, "__Host-vitallink_session") and account.role == "professional" and patient is not None
    compatible = patient is not None and goal_exam_exists(
        session, patient.id, goal_request.exam_name, goal_request.unit
    )
    confirmed = (
        allowed
        and compatible
        and consume_goal_confirmation(session, goal_request.step_up_confirmation_id, account_session, account, now)
    )
    if not allowed or not compatible or not confirmed:
        reason = (
            "not_authorized"
            if not allowed
            else "incompatible_exam_unit"
            if not compatible
            else "action_confirmation_required"
        )
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_goal.created",
                target_id=audit_identifier(goal_request.patient_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request,
            404 if not allowed else 422 if not compatible else 403,
            reason,
            "Não foi possível registrar a meta.",
        )
    goal = ClinicalGoal(
        patient_id=patient.id,
        author_account_id=account.id,
        exam_name=goal_request.exam_name,
        minimum=goal_request.minimum,
        maximum=goal_request.maximum,
        unit=goal_request.unit,
        justification=goal_request.justification,
        effective_at=goal_request.effective_at,
        version=1,
        current=True,
        created_at=now,
    )
    session.add(goal)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_goal.created",
            target_id=audit_identifier(goal.id),
            result="success",
            reason="scope_and_totp_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "version": goal.version},
        )
    )
    session.commit()
    return clinical_goal_response(session, goal)


@app.get("/api/v1/clinical-goals", response_model=list[ClinicalGoalResponse])
def list_clinical_goals(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID | None, Query()] = None,
) -> list[ClinicalGoalResponse] | JSONResponse:
    """List current goals while preserving one row per professional author."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, patient_id, "metas", "consultar", now)
    if patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_goal.listed",
                target_id=audit_identifier(patient_id) if patient_id else None,
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "clinical_goals_not_found", "Metas não encontradas.")
    goals = session.scalars(
        select(ClinicalGoal)
        .where(ClinicalGoal.patient_id == patient.id, ClinicalGoal.current.is_(True))
        .order_by(ClinicalGoal.effective_at.desc(), ClinicalGoal.created_at.desc())
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_goal.listed",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(goals)},
        )
    )
    session.commit()
    return [clinical_goal_response(session, goal) for goal in goals]


@app.patch("/api/v1/clinical-goals/{goal_id}", response_model=ClinicalGoalResponse)
def correct_clinical_goal(
    goal_id: UUID,
    correction: ClinicalGoalCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalGoalResponse | JSONResponse:
    """Replace an author's current goal while retaining its prior version."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    original = session.scalar(select(ClinicalGoal).where(ClinicalGoal.id == goal_id).with_for_update())
    patient = None
    if original is not None and original.author_account_id == account.id:
        patient = authorized_document_patient(session, account, original.patient_id, "metas", "atualizar", now)
    allowed = valid_csrf(request, "__Host-vitallink_session") and patient is not None
    compatible = original is not None and goal_exam_exists(
        session, original.patient_id, original.exam_name, correction.unit
    )
    confirmed = (
        allowed
        and compatible
        and consume_goal_confirmation(session, correction.step_up_confirmation_id, account_session, account, now)
    )
    if original is None or not allowed or not compatible or not confirmed:
        reason = (
            "not_found_or_not_authorized"
            if original is None or not allowed
            else "incompatible_exam_unit"
            if not compatible
            else "action_confirmation_required"
        )
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_goal.corrected",
                target_id=audit_identifier(goal_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request,
            404 if original is None or not allowed else 422 if not compatible else 403,
            reason,
            "Meta não encontrada.",
        )
    if not original.current or original.version != correction.expected_version:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_goal.corrected",
                target_id=audit_identifier(goal_id),
                result="denied",
                reason="version_conflict",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "expected_version": correction.expected_version},
            )
        )
        session.commit()
        return error_response(request, 409, "clinical_goal_conflict", "A meta possui versão mais recente.")
    replacement = ClinicalGoal(
        patient_id=original.patient_id,
        author_account_id=original.author_account_id,
        exam_name=original.exam_name,
        minimum=correction.minimum,
        maximum=correction.maximum,
        unit=correction.unit,
        justification=correction.justification,
        effective_at=correction.effective_at,
        version=original.version + 1,
        current=True,
        replaces_id=original.id,
        correction_reason=correction.correction_reason,
        created_at=now,
    )
    original.current = False
    session.add(replacement)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_goal.corrected",
            target_id=audit_identifier(replacement.id),
            result="success",
            reason="replacement_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "version": replacement.version},
        )
    )
    session.commit()
    return clinical_goal_response(session, replacement)


def follow_up_response(session: Session, follow_up: FollowUpStatus) -> FollowUpStatusResponse:
    """Expose one manual state with its immutable professional author."""
    professional = session.scalar(select(Professional).where(Professional.account_id == follow_up.author_account_id))
    assert professional is not None
    return FollowUpStatusResponse(
        id=follow_up.id,
        status=follow_up.status,
        justification=follow_up.justification,
        recorded_at=follow_up.recorded_at,
        author=ProfessionalRecordAuthorResponse(name=professional.name, specialty=professional.specialty),
        version=follow_up.version,
        created_at=follow_up.created_at,
    )


@app.post(
    "/api/v1/follow-up-statuses",
    response_model=FollowUpStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_follow_up_status(
    status_request: FollowUpStatusCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> FollowUpStatusResponse | JSONResponse:
    """Persist an explicitly entered, justified follow-up state."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    patient = authorized_document_patient(session, account, status_request.patient_id, "metas", "anexar", now)
    allowed = valid_csrf(request, "__Host-vitallink_session") and account.role == "professional" and patient is not None
    confirmed = allowed and consume_goal_confirmation(
        session, status_request.step_up_confirmation_id, account_session, account, now
    )
    if not allowed or not confirmed:
        reason = "not_authorized" if not allowed else "action_confirmation_required"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="follow_up_status.created",
                target_id=audit_identifier(status_request.patient_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request, 404 if not allowed else 403, reason, "Não foi possível registrar o acompanhamento."
        )
    follow_up = FollowUpStatus(
        patient_id=patient.id,
        author_account_id=account.id,
        status=status_request.status,
        justification=status_request.justification,
        recorded_at=status_request.recorded_at,
        version=1,
        current=True,
        created_at=now,
    )
    session.add(follow_up)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="follow_up_status.created",
            target_id=audit_identifier(follow_up.id),
            result="success",
            reason="manual_scope_and_totp_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "version": follow_up.version},
        )
    )
    session.commit()
    return follow_up_response(session, follow_up)


@app.get("/api/v1/follow-up-statuses", response_model=list[FollowUpStatusResponse])
def list_follow_up_statuses(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID | None, Query()] = None,
) -> list[FollowUpStatusResponse] | JSONResponse:
    """List current manual states without deriving or aggregating them."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = authorized_document_patient(session, account, patient_id, "metas", "consultar", now)
    if patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="follow_up_status.listed",
                target_id=audit_identifier(patient_id) if patient_id else None,
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "follow_up_statuses_not_found", "Acompanhamento não encontrado.")
    statuses = session.scalars(
        select(FollowUpStatus)
        .where(FollowUpStatus.patient_id == patient.id, FollowUpStatus.current.is_(True))
        .order_by(FollowUpStatus.recorded_at.desc(), FollowUpStatus.created_at.desc())
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="follow_up_status.listed",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(statuses)},
        )
    )
    session.commit()
    return [follow_up_response(session, item) for item in statuses]


@app.patch("/api/v1/follow-up-statuses/{status_id}", response_model=FollowUpStatusResponse)
def correct_follow_up_status(
    status_id: UUID,
    correction: FollowUpStatusCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> FollowUpStatusResponse | JSONResponse:
    """Correct a manual state by creating an immutable successor."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    original = session.scalar(select(FollowUpStatus).where(FollowUpStatus.id == status_id).with_for_update())
    patient = None
    if original is not None and original.author_account_id == account.id:
        patient = authorized_document_patient(session, account, original.patient_id, "metas", "atualizar", now)
    allowed = valid_csrf(request, "__Host-vitallink_session") and patient is not None
    confirmed = allowed and consume_goal_confirmation(
        session, correction.step_up_confirmation_id, account_session, account, now
    )
    if original is None or not allowed or not confirmed:
        reason = "not_found_or_not_authorized" if original is None or not allowed else "action_confirmation_required"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="follow_up_status.corrected",
                target_id=audit_identifier(status_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request, 404 if original is None or not allowed else 403, reason, "Acompanhamento não encontrado."
        )
    if not original.current or original.version != correction.expected_version:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="follow_up_status.corrected",
                target_id=audit_identifier(status_id),
                result="denied",
                reason="version_conflict",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "expected_version": correction.expected_version},
            )
        )
        session.commit()
        return error_response(request, 409, "follow_up_status_conflict", "O acompanhamento possui versão mais recente.")
    replacement = FollowUpStatus(
        patient_id=original.patient_id,
        author_account_id=original.author_account_id,
        status=correction.status,
        justification=correction.justification,
        recorded_at=correction.recorded_at,
        version=original.version + 1,
        current=True,
        replaces_id=original.id,
        correction_reason=correction.correction_reason,
        created_at=now,
    )
    original.current = False
    session.add(replacement)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="follow_up_status.corrected",
            target_id=audit_identifier(replacement.id),
            result="success",
            reason="replacement_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "version": replacement.version},
        )
    )
    session.commit()
    return follow_up_response(session, replacement)


def clinical_message_party(professional: Professional) -> ClinicalMessagePartyResponse:
    """Build the minimum professional identity used by conversations."""
    return ClinicalMessagePartyResponse(
        id=professional.id,
        name=professional.name,
        specialty=professional.specialty,
    )


def clinical_message_response(session: Session, message: ClinicalMessage) -> ClinicalMessageResponse:
    """Expose one append-only message with both professional parties."""
    sender = session.get(Professional, message.sender_professional_id)
    recipient = session.get(Professional, message.recipient_professional_id)
    assert sender is not None and recipient is not None
    return ClinicalMessageResponse(
        id=message.id,
        content=message.content,
        mention_professional_ids=[UUID(value) for value in message.mention_professional_ids],
        sender=clinical_message_party(sender),
        recipient=clinical_message_party(recipient),
        corrects_id=message.corrects_id,
        correction_reason=message.correction_reason,
        created_at=message.created_at,
    )


def consume_message_confirmation(
    session: Session,
    confirmation_id: UUID,
    account_session: AccountSession,
    account: Account,
    now: datetime,
) -> bool:
    """Consume one session-bound TOTP proof for a message write."""
    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "clinical_message_write",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is None:
        return False
    confirmation.used_at = now
    return True


def messaging_professional(session: Session, account: Account) -> Professional | None:
    """Resolve only an active professional account for messaging."""
    if account.role != "professional" or account.status != "active":
        return None
    return session.scalar(select(Professional).where(Professional.account_id == account.id))


def eligible_message_professionals(
    session: Session,
    patient_id: UUID,
    current_professional_id: UUID,
    operation: str,
    now: datetime,
) -> list[Professional]:
    """List only peers with a live messaging grant for an operation."""
    return list(
        session.scalars(
            select(Professional)
            .join(Authorization, Authorization.professional_id == Professional.id)
            .where(
                Authorization.patient_id == patient_id,
                Authorization.status == "active",
                Authorization.starts_at <= now,
                Authorization.expires_at > now,
                Authorization.categories.contains(["mensagens"]),
                Authorization.operations.contains([operation]),
                Professional.id != current_professional_id,
            )
            .order_by(Professional.name, Professional.id)
        ).unique()
    )


def mentions_are_eligible(mention_ids: list[UUID], eligible: list[Professional]) -> bool:
    """Ensure mentions reveal no professional outside the eligible team."""
    eligible_ids = {professional.id for professional in eligible}
    return set(mention_ids).issubset(eligible_ids)


@app.get(
    "/api/v1/clinical-message-recipients",
    response_model=list[ClinicalMessageRecipientResponse],
)
def list_clinical_message_recipients(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID, Query()],
) -> list[ClinicalMessageRecipientResponse] | JSONResponse:
    """List only professionals mutually eligible to exchange messages."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    professional = messaging_professional(session, account)
    authorized = (
        professional is not None
        and active_authorization(session, professional.id, patient_id, "mensagens", "consultar", now) is not None
        and active_authorization(session, professional.id, patient_id, "mensagens", "anexar", now) is not None
    )
    if not authorized or professional is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_message_recipients.listed",
                target_id=audit_identifier(patient_id),
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "message_team_not_found", "Equipe não encontrada.")
    recipients = eligible_message_professionals(session, patient_id, professional.id, "anexar", now)
    response = []
    for recipient in recipients:
        unread_count = session.scalar(
            select(func.count(ClinicalMessage.id)).where(
                ClinicalMessage.patient_id == patient_id,
                ClinicalMessage.sender_professional_id == recipient.id,
                ClinicalMessage.recipient_professional_id == professional.id,
                ClinicalMessage.recipient_read_at.is_(None),
            )
        )
        response.append(
            ClinicalMessageRecipientResponse(
                **clinical_message_party(recipient).model_dump(),
                unread_count=unread_count or 0,
            )
        )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_message_recipients.listed",
            target_id=audit_identifier(patient_id),
            result="success",
            reason="mutual_scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(response)},
        )
    )
    session.commit()
    return response


@app.post("/api/v1/clinical-messages", response_model=ClinicalMessageResponse, status_code=status.HTTP_201_CREATED)
def create_clinical_message(
    message_request: ClinicalMessageCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalMessageResponse | JSONResponse:
    """Send an immutable message when both professionals hold messaging scope."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    sender = messaging_professional(session, account)
    sender_allowed = (
        sender is not None
        and active_authorization(session, sender.id, message_request.patient_id, "mensagens", "anexar", now) is not None
    )
    recipient_allowed = (
        active_authorization(
            session,
            message_request.recipient_professional_id,
            message_request.patient_id,
            "mensagens",
            "anexar",
            now,
        )
        is not None
    )
    eligible = (
        []
        if sender is None
        else eligible_message_professionals(session, message_request.patient_id, sender.id, "anexar", now)
    )
    request_valid = (
        valid_csrf(request, "__Host-vitallink_session")
        and sender_allowed
        and recipient_allowed
        and sender is not None
        and sender.id != message_request.recipient_professional_id
        and message_request.recipient_professional_id in {peer.id for peer in eligible}
        and mentions_are_eligible(message_request.mention_professional_ids, eligible)
    )
    confirmed = request_valid and consume_message_confirmation(
        session, message_request.step_up_confirmation_id, account_session, account, now
    )
    if not request_valid or not confirmed or sender is None:
        reason = "not_found_or_not_authorized" if not request_valid else "action_confirmation_required"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_message.created",
                target_id=audit_identifier(message_request.patient_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404 if not request_valid else 403, reason, "Não foi possível enviar a mensagem.")
    recipient = session.get(Professional, message_request.recipient_professional_id)
    assert recipient is not None
    message = ClinicalMessage(
        patient_id=message_request.patient_id,
        sender_professional_id=sender.id,
        recipient_professional_id=recipient.id,
        content=message_request.content,
        mention_professional_ids=[str(value) for value in message_request.mention_professional_ids],
        created_at=now,
    )
    session.add(message)
    session.flush()
    session.add(
        Notification(
            account_id=recipient.account_id,
            kind="clinical_message",
            subject_id=message.id,
            created_at=now,
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_message.created",
            target_id=audit_identifier(message.id),
            result="success",
            reason="mutual_scope_and_totp_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "mention_count": len(message_request.mention_professional_ids)},
        )
    )
    session.commit()
    return clinical_message_response(session, message)


@app.get("/api/v1/clinical-messages", response_model=list[ClinicalMessageResponse])
def list_clinical_messages(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID, Query()],
    peer_professional_id: Annotated[UUID, Query()],
) -> list[ClinicalMessageResponse] | JSONResponse:
    """Read one authorized conversation and persist recipient read state."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    professional = messaging_professional(session, account)
    allowed = (
        professional is not None
        and professional.id != peer_professional_id
        and active_authorization(session, professional.id, patient_id, "mensagens", "consultar", now) is not None
        and active_authorization(session, peer_professional_id, patient_id, "mensagens", "consultar", now) is not None
    )
    if not allowed or professional is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_message.listed",
                target_id=audit_identifier(patient_id),
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "clinical_messages_not_found", "Conversa não encontrada.")
    messages = session.scalars(
        select(ClinicalMessage)
        .where(
            ClinicalMessage.patient_id == patient_id,
            or_(
                (
                    (ClinicalMessage.sender_professional_id == professional.id)
                    & (ClinicalMessage.recipient_professional_id == peer_professional_id)
                ),
                (
                    (ClinicalMessage.sender_professional_id == peer_professional_id)
                    & (ClinicalMessage.recipient_professional_id == professional.id)
                ),
            ),
        )
        .order_by(ClinicalMessage.created_at, ClinicalMessage.id)
        .with_for_update()
    ).all()
    for message in messages:
        if message.recipient_professional_id == professional.id and message.recipient_read_at is None:
            message.recipient_read_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_message.listed",
            target_id=audit_identifier(patient_id),
            result="success",
            reason="mutual_scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(messages)},
        )
    )
    session.commit()
    return [clinical_message_response(session, message) for message in messages]


@app.post(
    "/api/v1/clinical-messages/{message_id}/corrections",
    response_model=ClinicalMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def correct_clinical_message(
    message_id: UUID,
    correction: ClinicalMessageCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ClinicalMessageResponse | JSONResponse:
    """Create one linked correction without changing the original message."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    sender = messaging_professional(session, account)
    original = session.scalar(select(ClinicalMessage).where(ClinicalMessage.id == message_id).with_for_update())
    existing = session.scalar(select(ClinicalMessage.id).where(ClinicalMessage.corrects_id == message_id))
    allowed = (
        sender is not None
        and original is not None
        and original.sender_professional_id == sender.id
        and existing is None
        and active_authorization(session, sender.id, original.patient_id, "mensagens", "atualizar", now) is not None
        and active_authorization(
            session, original.recipient_professional_id, original.patient_id, "mensagens", "atualizar", now
        )
        is not None
    )
    eligible = (
        []
        if sender is None or original is None
        else eligible_message_professionals(session, original.patient_id, sender.id, "atualizar", now)
    )
    request_valid = (
        valid_csrf(request, "__Host-vitallink_session")
        and allowed
        and mentions_are_eligible(correction.mention_professional_ids, eligible)
    )
    confirmed = request_valid and consume_message_confirmation(
        session, correction.step_up_confirmation_id, account_session, account, now
    )
    if not request_valid or not confirmed or original is None:
        reason = "not_found_or_not_authorized" if not request_valid else "action_confirmation_required"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="clinical_message.corrected",
                target_id=audit_identifier(message_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404 if not request_valid else 403, reason, "Mensagem não encontrada.")
    replacement = ClinicalMessage(
        patient_id=original.patient_id,
        sender_professional_id=original.sender_professional_id,
        recipient_professional_id=original.recipient_professional_id,
        content=correction.content,
        mention_professional_ids=[str(value) for value in correction.mention_professional_ids],
        corrects_id=original.id,
        correction_reason=correction.correction_reason,
        created_at=now,
    )
    session.add(replacement)
    session.flush()
    recipient = session.get(Professional, original.recipient_professional_id)
    assert recipient is not None
    session.add(
        Notification(
            account_id=recipient.account_id,
            kind="clinical_message_correction",
            subject_id=replacement.id,
            created_at=now,
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="clinical_message.corrected",
            target_id=audit_identifier(replacement.id),
            result="success",
            reason="linked_correction_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "mention_count": len(correction.mention_professional_ids)},
        )
    )
    session.commit()
    return clinical_message_response(session, replacement)


def professional_record_category(kind: str) -> str:
    """Map a professional record kind to its authorization category.

    Args:
        kind: Validated record kind.

    Returns:
        Normative authorization category.
    """
    return "recomendações" if kind == "recommendation" else "consultas"


def professional_record_response(session: Session, record: ProfessionalRecord) -> ProfessionalRecordResponse:
    """Expose one professional record with its original attribution.

    Args:
        session: Database transaction scope.
        record: Current immutable professional record version.

    Returns:
        Safe clinical record response.
    """
    professional = session.scalar(select(Professional).where(Professional.account_id == record.author_account_id))
    assert professional is not None
    return ProfessionalRecordResponse(
        id=record.id,
        kind=record.kind,
        occurred_at=record.occurred_at,
        content=record.content,
        justification=record.justification,
        origin=record.origin,
        author=ProfessionalRecordAuthorResponse(name=professional.name, specialty=professional.specialty),
        version=record.version,
        created_at=record.created_at,
    )


@app.post(
    "/api/v1/professional-records",
    response_model=ProfessionalRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_professional_record(
    record_request: ProfessionalRecordCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ProfessionalRecordResponse | JSONResponse:
    """Create one TOTP-confirmed professional record within active scope.

    Args:
        record_request: Record content, provenance fields, and action proof.
        request: Authenticated same-origin request.
        session: Database transaction scope.
        now: Server-controlled operation time.

    Returns:
        Persisted first version or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    category = professional_record_category(record_request.kind)
    patient = authorized_document_patient(session, account, record_request.patient_id, category, "anexar", now)
    csrf_valid = valid_csrf(request, "__Host-vitallink_session")
    if not csrf_valid or account.role != "professional" or patient is None:
        reason = "request_verification_failed" if not csrf_valid else "not_authorized"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="professional_record.created",
                target_id=audit_identifier(record_request.patient_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "kind": record_request.kind},
            )
        )
        session.commit()
        code = "request_verification_failed" if reason == "request_verification_failed" else "patient_not_found"
        return error_response(
            request, 403 if reason == "request_verification_failed" else 404, code, "Não foi possível registrar."
        )
    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == record_request.step_up_confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "clinical_record_create",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="professional_record.created",
                target_id=audit_identifier(patient.id),
                result="denied",
                reason="action_confirmation_required",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "kind": record_request.kind},
            )
        )
        session.commit()
        return error_response(request, 403, "action_confirmation_required", "Confirme novamente esta ação.")
    confirmation.used_at = now
    record = ProfessionalRecord(
        patient_id=patient.id,
        author_account_id=account.id,
        kind=record_request.kind,
        content=record_request.content,
        justification=record_request.justification,
        occurred_at=record_request.occurred_at,
        origin="professional_entry",
        version=1,
        current=True,
        created_at=now,
    )
    session.add(record)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="professional_record.created",
            target_id=audit_identifier(record.id),
            result="success",
            reason="scope_and_totp_confirmed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "kind": record.kind, "version": record.version},
        )
    )
    session.commit()
    return professional_record_response(session, record)


@app.get("/api/v1/professional-records", response_model=list[ProfessionalRecordResponse])
def list_professional_records(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    patient_id: Annotated[UUID | None, Query()] = None,
) -> list[ProfessionalRecordResponse] | JSONResponse:
    """List current records visible to the patient or an authorized professional.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled operation time.
        patient_id: Explicit target required from a professional.

    Returns:
        Current authorized record versions or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    allowed_categories: set[str]
    if account.role == "patient":
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
        if patient is not None and patient_id not in (None, patient.id):
            patient = None
        allowed_categories = {"consultas", "recomendações"}
    else:
        professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
        patient = session.get(Patient, patient_id) if patient_id is not None else None
        allowed_categories = {
            category
            for category in ("consultas", "recomendações")
            if professional is not None
            and patient is not None
            and active_authorization(session, professional.id, patient.id, category, "consultar", now) is not None
        }
    if patient is None or not allowed_categories:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="professional_record.listed",
                target_id=audit_identifier(patient_id) if patient_id is not None else None,
                result="denied",
                reason="not_found_or_not_authorized",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "professional_records_not_found", "Registros não encontrados.")
    records = session.scalars(
        select(ProfessionalRecord)
        .where(ProfessionalRecord.patient_id == patient.id, ProfessionalRecord.current.is_(True))
        .order_by(ProfessionalRecord.occurred_at.desc(), ProfessionalRecord.created_at.desc())
    ).all()
    visible = [record for record in records if professional_record_category(record.kind) in allowed_categories]
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="professional_record.listed",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="scope_reevaluated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(visible)},
        )
    )
    session.commit()
    return [professional_record_response(session, record) for record in visible]


@app.patch("/api/v1/professional-records/{record_id}", response_model=ProfessionalRecordResponse)
def correct_professional_record(
    record_id: UUID,
    correction_request: ProfessionalRecordCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> ProfessionalRecordResponse | JSONResponse:
    """Create a successor version for an authorized author's current record.

    Args:
        record_id: Opaque identifier of the version being corrected.
        correction_request: Replacement, reason, and expected version.
        request: Authenticated same-origin request.
        session: Database transaction scope.
        now: Server-controlled operation time.

    Returns:
        Replacement version or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    original = session.scalar(select(ProfessionalRecord).where(ProfessionalRecord.id == record_id).with_for_update())
    patient = None
    if original is not None and account.role == "professional" and original.author_account_id == account.id:
        patient = authorized_document_patient(
            session,
            account,
            original.patient_id,
            professional_record_category(original.kind),
            "atualizar",
            now,
        )
    csrf_valid = valid_csrf(request, "__Host-vitallink_session")
    if not csrf_valid or original is None or patient is None:
        reason = "request_verification_failed" if not csrf_valid else "not_found_or_not_authorized"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="professional_record.corrected",
                target_id=audit_identifier(record_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(
            request,
            403 if reason == "request_verification_failed" else 404,
            reason,
            "Registro não encontrado.",
        )
    if not original.current or original.version != correction_request.expected_version:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="professional_record.corrected",
                target_id=audit_identifier(record_id),
                result="denied",
                reason="version_conflict",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "expected_version": correction_request.expected_version},
            )
        )
        session.commit()
        return error_response(request, 409, "professional_record_conflict", "O registro possui versão mais recente.")
    replacement = ProfessionalRecord(
        patient_id=original.patient_id,
        author_account_id=original.author_account_id,
        kind=original.kind,
        content=correction_request.content,
        justification=correction_request.justification,
        occurred_at=correction_request.occurred_at,
        origin=original.origin,
        version=original.version + 1,
        current=True,
        replaces_id=original.id,
        correction_reason=correction_request.correction_reason,
        created_at=now,
    )
    original.current = False
    session.add(replacement)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="professional_record.corrected",
            target_id=audit_identifier(replacement.id),
            result="success",
            reason="replacement_created",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "kind": replacement.kind, "version": replacement.version},
        )
    )
    session.commit()
    return professional_record_response(session, replacement)


@app.post(
    "/api/v1/personal-observations",
    response_model=PersonalObservationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_personal_observation(
    observation_request: PersonalObservationCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> PersonalObservationResponse | JSONResponse:
    """Create a personal observation owned and authored by the patient.

    Args:
        observation_request: Patient-authored text.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The persisted first version or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    text_value = observation_request.text.strip()
    denial_reason = None
    if not valid_csrf(request, "__Host-vitallink_session"):
        denial_reason = "request_verification_failed"
    elif patient is None:
        denial_reason = "patient_required"
    elif not text_value:
        denial_reason = "text_required"
    if denial_reason is not None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="personal_observation.created",
                target_id=None,
                result="denied",
                reason=denial_reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        status_code = 403 if denial_reason != "text_required" else 422
        return error_response(request, status_code, denial_reason, "Não foi possível salvar a observação pessoal.")
    observation = PersonalObservation(
        patient_id=patient.id,
        author_account_id=account.id,
        text=text_value,
        version=1,
        current=True,
        created_at=now,
    )
    session.add(observation)
    session.flush()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="personal_observation.created",
            target_id=audit_identifier(observation.id),
            result="success",
            reason="patient_authored",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "version": 1},
        )
    )
    session.commit()
    return personal_observation_response(observation)


@app.get("/api/v1/personal-observations", response_model=list[PersonalObservationResponse])
def list_personal_observations(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[PersonalObservationResponse] | JSONResponse:
    """List only current personal observations owned by the patient.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Current owned observation versions or a role-safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="personal_observation.listed",
                target_id=None,
                result="denied",
                reason="patient_required",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, "patient_required", "Apenas pacientes consultam observações pessoais.")
    observations = session.scalars(
        select(PersonalObservation)
        .where(PersonalObservation.patient_id == patient.id, PersonalObservation.current.is_(True))
        .order_by(PersonalObservation.created_at.desc())
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="personal_observation.listed",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="owner_listed",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(observations)},
        )
    )
    session.commit()
    return [personal_observation_response(observation) for observation in observations]


@app.patch(
    "/api/v1/personal-observations/{observation_id}",
    response_model=PersonalObservationResponse,
)
def correct_personal_observation(
    observation_id: UUID,
    correction_request: PersonalObservationCorrection,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> PersonalObservationResponse | JSONResponse:
    """Create a replacement version for one owned current observation.

    Args:
        observation_id: Opaque identifier of the version being corrected.
        correction_request: Replacement text and expected current version.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The new current version or a safe ownership/version denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if not valid_csrf(request, "__Host-vitallink_session") or patient is None:
        reason = "request_verification_failed" if patient is not None else "patient_required"
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="personal_observation.corrected",
                target_id=audit_identifier(observation_id),
                result="denied",
                reason=reason,
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, reason, "Não foi possível corrigir a observação pessoal.")
    observation = session.scalar(
        select(PersonalObservation)
        .where(PersonalObservation.id == observation_id, PersonalObservation.patient_id == patient.id)
        .with_for_update()
    )
    if observation is None:
        reason = "not_found_or_not_owned"
        status_code = 404
        code = "personal_observation_not_found"
    elif not observation.current or observation.version != correction_request.expected_version:
        reason = "version_conflict"
        status_code = 409
        code = "personal_observation_conflict"
    elif not correction_request.text.strip():
        reason = "text_required"
        status_code = 422
        code = "text_required"
    else:
        replacement = PersonalObservation(
            patient_id=observation.patient_id,
            author_account_id=observation.author_account_id,
            text=correction_request.text.strip(),
            version=observation.version + 1,
            current=True,
            replaces_id=observation.id,
            created_at=now,
        )
        observation.current = False
        session.add(replacement)
        session.flush()
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="personal_observation.corrected",
                target_id=audit_identifier(replacement.id),
                result="success",
                reason="patient_corrected",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "version": replacement.version},
            )
        )
        session.commit()
        return personal_observation_response(replacement)
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="personal_observation.corrected",
            target_id=audit_identifier(observation_id),
            result="denied",
            reason=reason,
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return error_response(request, status_code, code, "Não foi possível corrigir a observação pessoal.")


@app.get("/api/v1/access-codes", response_model=list[AccessCodeResponse])
def list_access_codes(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[AccessCodeResponse] | JSONResponse:
    """List access-code metadata belonging to the authenticated patient.

    Args:
        request: Authenticated request containing the opaque session.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Owned code metadata without plaintext codes, or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        return error_response(request, 403, "patient_required", "Apenas pacientes podem listar códigos.")
    access_codes = session.scalars(
        select(AccessCode).where(AccessCode.patient_id == patient.id).order_by(AccessCode.created_at.desc())
    ).all()
    return [
        AccessCodeResponse(
            id=access_code.id,
            created_at=access_code.created_at,
            expires_at=access_code.expires_at,
            status=access_code_status(access_code, now),
        )
        for access_code in access_codes
    ]


@app.delete("/api/v1/access-codes/{access_code_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def revoke_access_code(
    access_code_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> Response:
    """Revoke an active access code owned by the authenticated patient.

    Args:
        access_code_id: Owned code identifier.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Empty success response or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.revoked",
                target_id=audit_identifier(access_code_id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    access_code = None
    if patient is not None:
        access_code = session.scalar(
            select(AccessCode)
            .where(AccessCode.id == access_code_id, AccessCode.patient_id == patient.id)
            .with_for_update()
        )
    if access_code is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.revoked",
                target_id=audit_identifier(access_code_id),
                result="denied",
                reason="not_owned_or_missing",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "access_code_not_found", "Código não encontrado.")
    if access_code_status(access_code, now) != "active":
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.revoked",
                target_id=audit_identifier(access_code.id),
                result="denied",
                reason="inactive",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 409, "access_code_inactive", "O código não está ativo.")
    access_code.revoked_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="access_code.revoked",
            target_id=audit_identifier(access_code.id),
            result="success",
            reason="patient_requested",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/v1/access-requests", response_model=list[PatientAccessRequestResponse])
def list_access_requests(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[PatientAccessRequestResponse] | JSONResponse:
    """List requests addressed to the authenticated patient.

    Args:
        request: Authenticated same-origin request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The patient's requests with only decision-relevant professional data.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        return error_response(request, 403, "patient_required", "Apenas pacientes podem consultar solicitações.")
    rows = session.execute(
        select(AccessRequest, Professional)
        .join(Professional, Professional.id == AccessRequest.professional_id)
        .where(AccessRequest.patient_id == patient.id)
        .order_by(AccessRequest.created_at.desc())
    ).all()
    return [
        PatientAccessRequestResponse(
            id=access_request.id,
            status=access_request.status,
            created_at=access_request.created_at,
            justification=access_request.justification,
            professional=RequestingProfessionalResponse(
                name=professional.name,
                specialty=professional.specialty,
                institution=professional.institution,
            ),
        )
        for access_request, professional in rows
    ]


@app.post(
    "/api/v1/access-requests/{access_request_id}/decisions",
    response_model=AccessRequestDecisionResponse,
)
def decide_access_request(
    access_request_id: UUID,
    decision_request: AccessRequestDecisionRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AccessRequestDecisionResponse | JSONResponse:
    """Grant or reject one pending request addressed to the authenticated patient.

    Args:
        access_request_id: Opaque request identifier.
        decision_request: Explicit patient decision.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The resulting state or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.decided",
                target_id=audit_identifier(access_request_id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        return error_response(request, 403, "patient_required", "Apenas pacientes podem decidir solicitações.")
    pending_request = session.scalar(
        select(AccessRequest)
        .where(
            AccessRequest.id == access_request_id,
            AccessRequest.patient_id == patient.id,
            AccessRequest.status == "pending",
        )
        .with_for_update()
    )
    if pending_request is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.decided",
                target_id=audit_identifier(access_request_id),
                result="denied",
                reason="not_found_or_not_pending",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "access_request_not_found", "Solicitação não encontrada.")
    if decision_request.decision == "granted":
        categories = sorted(set(decision_request.categories or []))
        operations = sorted(set(decision_request.operations or []))
        if (
            not categories
            or not operations
            or not set(categories) <= AUTHORIZATION_CATEGORIES
            or not set(operations) <= AUTHORIZATION_OPERATIONS
            or decision_request.duration_days is None
        ):
            session.add(
                AuditEvent(
                    actor_id=audit_identifier(account.id),
                    action="authorization.granted",
                    target_id=audit_identifier(pending_request.id),
                    result="denied",
                    reason="invalid_scope_or_term",
                    correlation_id=request.state.correlation_id,
                    event_metadata={"role": account.role},
                )
            )
            session.commit()
            return error_response(request, 422, "authorization_scope_invalid", "Revise o escopo e o prazo informados.")
        confirmation = None
        if decision_request.step_up_confirmation_id is not None:
            confirmation = session.scalar(
                select(StepUpConfirmation)
                .where(
                    StepUpConfirmation.id == decision_request.step_up_confirmation_id,
                    StepUpConfirmation.account_id == account.id,
                    StepUpConfirmation.session_id == account_session.id,
                    StepUpConfirmation.action == "authorization_grant",
                    StepUpConfirmation.used_at.is_(None),
                    StepUpConfirmation.expires_at > now,
                )
                .with_for_update()
            )
        if confirmation is None:
            session.add(
                AuditEvent(
                    actor_id=audit_identifier(account.id),
                    action="authorization.granted",
                    target_id=audit_identifier(pending_request.id),
                    result="denied",
                    reason="action_confirmation_required",
                    correlation_id=request.state.correlation_id,
                    event_metadata={"role": account.role},
                )
            )
            session.commit()
            return error_response(request, 403, "action_confirmation_required", "Confirme novamente esta ação.")
        confirmation.used_at = now
        authorization = Authorization(
            access_request_id=pending_request.id,
            patient_id=pending_request.patient_id,
            professional_id=pending_request.professional_id,
            categories=categories,
            operations=operations,
            status="active",
            starts_at=now,
            expires_at=now + timedelta(days=decision_request.duration_days),
            changed_at=now,
        )
        session.add(authorization)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="authorization.granted",
                target_id=audit_identifier(pending_request.id),
                result="success",
                reason="patient_granted",
                correlation_id=request.state.correlation_id,
                event_metadata={
                    "role": account.role,
                    "category_count": len(categories),
                    "operation_count": len(operations),
                    "duration_days": decision_request.duration_days,
                },
            )
        )
    pending_request.status = decision_request.decision
    professional = session.get(Professional, pending_request.professional_id)
    assert professional is not None
    session.add(
        Notification(
            account_id=professional.account_id,
            kind=f"access_request_{decision_request.decision}",
            subject_id=pending_request.id,
            created_at=now,
        )
    )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="access_request.decided",
            target_id=audit_identifier(pending_request.id),
            result="success",
            reason=f"patient_{decision_request.decision}",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "previous_status": "pending", "status": pending_request.status},
        )
    )
    session.commit()
    return AccessRequestDecisionResponse(id=pending_request.id, status=pending_request.status)


@app.get("/api/v1/authorizations", response_model=list[AuthorizationResponse])
def list_authorizations(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[AuthorizationResponse] | JSONResponse:
    """List authorizations involving only the authenticated user.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Scoped authorization summaries or a role-safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    statement = (
        select(Authorization, Patient, Professional)
        .join(Patient, Patient.id == Authorization.patient_id)
        .join(Professional, Professional.id == Authorization.professional_id)
        .order_by(Authorization.changed_at.desc())
    )
    if account.role == "patient":
        statement = statement.where(Patient.account_id == account.id)
    elif account.role == "professional":
        statement = statement.where(Professional.account_id == account.id)
    else:
        return error_response(request, 403, "role_not_supported", "Este perfil não possui autorizações.")
    rows = session.execute(statement).all()
    return [
        AuthorizationResponse(
            id=authorization.id,
            status=(
                "expired"
                if authorization.status == "active" and authorization.expires_at <= now
                else authorization.status
            ),
            starts_at=authorization.starts_at,
            expires_at=authorization.expires_at,
            categories=authorization.categories,
            operations=authorization.operations,
            patient=AuthorizationPatientResponse(id=patient.id, name=patient.name),
            professional=AuthorizationProfessionalResponse(
                id=professional.id,
                name=professional.name,
                specialty=professional.specialty,
                institution=professional.institution,
            ),
        )
        for authorization, patient, professional in rows
    ]


@app.post(
    "/api/v1/authorizations/{authorization_id}/revocations",
    response_model=AuthorizationChangeResponse,
)
def revoke_authorization(
    authorization_id: UUID,
    revocation_request: AuthorizationRevocationRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AuthorizationChangeResponse | JSONResponse:
    """Revoke an owned authorization after a session-bound TOTP confirmation.

    Args:
        authorization_id: Opaque authorization identifier.
        revocation_request: Patient justification and action confirmation.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The revoked state or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.revoked",
            "request_verification_failed",
            403,
            "request_verification_failed",
            "Não foi possível validar a solicitação.",
        )
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.revoked",
            "patient_required",
            403,
            "patient_required",
            "Apenas pacientes podem revogar autorizações.",
        )
    authorization = session.scalar(
        select(Authorization)
        .where(Authorization.id == authorization_id, Authorization.patient_id == patient.id)
        .with_for_update()
    )
    if authorization is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.revoked",
            "not_found_or_not_owned",
            404,
            "authorization_not_found",
            "Autorização não encontrada.",
        )
    if authorization.status == "revoked":
        return AuthorizationChangeResponse(id=authorization.id, status=authorization.status)
    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == revocation_request.step_up_confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "authorization_revoke",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.revoked",
            "action_confirmation_required",
            403,
            "action_confirmation_required",
            "Confirme novamente esta ação.",
        )
    confirmation.used_at = now
    session.add(
        AuthorizationRevision(
            authorization_id=authorization.id,
            action="revoked",
            categories=authorization.categories,
            operations=authorization.operations,
            status=authorization.status,
            justification=revocation_request.justification,
            changed_at=now,
        )
    )
    authorization.status = "revoked"
    authorization.changed_at = now
    professional = session.get(Professional, authorization.professional_id)
    if professional is not None:
        session.add(
            Notification(
                account_id=professional.account_id,
                kind="authorization_revoked",
                subject_id=authorization.id,
            )
        )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="authorization.revoked",
            target_id=audit_identifier(authorization.id),
            result="success",
            reason="patient_revoked",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return AuthorizationChangeResponse(id=authorization.id, status=authorization.status)


@app.patch(
    "/api/v1/authorizations/{authorization_id}",
    response_model=AuthorizationChangeResponse,
)
def reduce_authorization(
    authorization_id: UUID,
    reduction_request: AuthorizationReductionRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AuthorizationChangeResponse | JSONResponse:
    """Reduce an owned active authorization to a strict nonempty subset.

    Args:
        authorization_id: Opaque authorization identifier.
        reduction_request: Remaining scope, justification, and action confirmation.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The active reduced state or a non-enumerating denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    account_session, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.reduced",
            "request_verification_failed",
            403,
            "request_verification_failed",
            "Não foi possível validar a solicitação.",
        )
    patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    if patient is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.reduced",
            "patient_required",
            403,
            "patient_required",
            "Apenas pacientes podem reduzir autorizações.",
        )
    authorization = session.scalar(
        select(Authorization)
        .where(Authorization.id == authorization_id, Authorization.patient_id == patient.id)
        .with_for_update()
    )
    if authorization is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.reduced",
            "not_found_or_not_owned",
            404,
            "authorization_not_found",
            "Autorização não encontrada.",
        )
    categories = sorted(set(reduction_request.categories))
    operations = sorted(set(reduction_request.operations))
    if (
        authorization.status != "active"
        or authorization.expires_at <= now
        or not set(categories) <= set(authorization.categories)
        or not set(operations) <= set(authorization.operations)
    ):
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.reduced",
            "scope_not_reduced",
            422,
            "authorization_scope_invalid",
            "Informe apenas um subconjunto ativo.",
        )
    if categories == sorted(authorization.categories) and operations == sorted(authorization.operations):
        return AuthorizationChangeResponse(id=authorization.id, status=authorization.status)
    confirmation = session.scalar(
        select(StepUpConfirmation)
        .where(
            StepUpConfirmation.id == reduction_request.step_up_confirmation_id,
            StepUpConfirmation.account_id == account.id,
            StepUpConfirmation.session_id == account_session.id,
            StepUpConfirmation.action == "authorization_reduce",
            StepUpConfirmation.used_at.is_(None),
            StepUpConfirmation.expires_at > now,
        )
        .with_for_update()
    )
    if confirmation is None:
        return authorization_change_denied(
            session,
            request,
            account,
            authorization_id,
            "authorization.reduced",
            "action_confirmation_required",
            403,
            "action_confirmation_required",
            "Confirme novamente esta ação.",
        )
    confirmation.used_at = now
    session.add(
        AuthorizationRevision(
            authorization_id=authorization.id,
            action="reduced",
            categories=authorization.categories,
            operations=authorization.operations,
            status=authorization.status,
            justification=reduction_request.justification,
            changed_at=now,
        )
    )
    authorization.categories = categories
    authorization.operations = operations
    authorization.changed_at = now
    professional = session.get(Professional, authorization.professional_id)
    if professional is not None:
        session.add(
            Notification(
                account_id=professional.account_id,
                kind="authorization_reduced",
                subject_id=authorization.id,
            )
        )
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="authorization.reduced",
            target_id=audit_identifier(authorization.id),
            result="success",
            reason="patient_reduced_scope",
            correlation_id=request.state.correlation_id,
            event_metadata={
                "role": account.role,
                "category_count": len(categories),
                "operation_count": len(operations),
            },
        )
    )
    session.commit()
    return AuthorizationChangeResponse(id=authorization.id, status=authorization.status)


@app.get("/api/v1/patients", response_model=list[AuthorizedPatientResponse])
def list_authorized_patients(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[AuthorizedPatientResponse] | JSONResponse:
    """List only patients currently authorized for the professional.

    Args:
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Minimal patient cards with the currently granted scope.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
    if professional is None:
        return error_response(request, 403, "professional_required", "Apenas profissionais podem consultar pacientes.")
    rows = session.execute(
        select(Authorization, Patient)
        .join(Patient, Patient.id == Authorization.patient_id)
        .where(
            Authorization.professional_id == professional.id,
            Authorization.status == "active",
            Authorization.starts_at <= now,
            Authorization.expires_at > now,
        )
        .order_by(Patient.name, Authorization.expires_at.desc())
    ).all()
    return [
        AuthorizedPatientResponse(
            id=patient.id,
            name=patient.name,
            categories=authorization.categories,
            operations=authorization.operations,
            expires_at=authorization.expires_at,
        )
        for authorization, patient in rows
    ]


@app.get("/api/v1/patients/{patient_id}", response_model=AuthorizedPatientDetailResponse)
def get_authorized_patient(
    patient_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AuthorizedPatientDetailResponse | JSONResponse:
    """Read patient profile details with history-read authorization.

    Args:
        patient_id: Opaque patient identifier.
        request: Authenticated request.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The authorized detail or the same response for every denied identifier.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
    if professional is None:
        return error_response(request, 403, "professional_required", "Apenas profissionais podem consultar pacientes.")
    authorization = active_authorization(
        session,
        professional.id,
        patient_id,
        "histórico",
        "consultar",
        now,
    )
    patient = session.get(Patient, patient_id) if authorization is not None else None
    if authorization is None or patient is None:
        latest_authorization = session.scalar(
            select(Authorization)
            .where(
                Authorization.professional_id == professional.id,
                Authorization.patient_id == patient_id,
            )
            .order_by(Authorization.changed_at.desc())
        )
        denied_rule = (
            "D02"
            if latest_authorization is not None
            and (
                latest_authorization.status == "revoked"
                or (latest_authorization.status == "active" and latest_authorization.expires_at <= now)
            )
            else "not_found_or_not_authorized"
        )
        target_patient = session.get(Patient, patient_id)
        metadata = {"role": account.role, "category": "histórico", "operation": "consultar"}
        if target_patient is not None:
            metadata["audience_id"] = audit_identifier(target_patient.account_id)
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="patient_profile.read",
                target_id=audit_identifier(patient_id),
                result="denied",
                reason=denied_rule,
                correlation_id=request.state.correlation_id,
                event_metadata=metadata,
            )
        )
        session.commit()
        return error_response(request, 404, "patient_not_found", "Paciente não encontrado.")
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="patient_profile.read",
            target_id=audit_identifier(patient.id),
            result="success",
            reason="active_authorization",
            correlation_id=request.state.correlation_id,
            event_metadata={
                "role": account.role,
                "category": "histórico",
                "operation": "consultar",
                "audience_id": audit_identifier(patient.account_id),
            },
        )
    )
    session.commit()
    return AuthorizedPatientDetailResponse(
        id=patient.id,
        name=patient.name,
        birthdate=patient.birthdate,
        blood_type=patient.blood_type,
        phone=patient.phone,
        categories=authorization.categories,
        operations=authorization.operations,
        expires_at=authorization.expires_at,
    )


@app.post("/api/v1/access-requests", status_code=status.HTTP_201_CREATED, response_model=AccessRequestResponse)
def create_access_request(
    access_request: AccessRequestCreate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> AccessRequestResponse | JSONResponse:
    """Consume a patient code to create one pending professional request.

    Args:
        access_request: Temporary code and professional justification.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Minimal patient confirmation and pending state, or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.created",
                target_id=None,
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
    if professional is None:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.created",
                target_id=None,
                result="denied",
                reason="professional_required",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 403, "professional_required", "Apenas profissionais podem solicitar acesso.")
    justification = access_request.justification.strip()
    if len(justification) < 10:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.created",
                target_id=None,
                result="denied",
                reason="justification_invalid",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 422, "justification_invalid", "Revise a justificativa informada.")
    temporary_code = session.scalar(
        select(AccessCode).where(AccessCode.code_hash == keyed_digest(access_request.code)).with_for_update()
    )
    if temporary_code is None or access_code_status(temporary_code, now) != "active":
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.consumed",
                target_id=keyed_digest(f"access-code:{access_request.code}"),
                result="denied",
                reason="invalid_or_inactive",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 422, "access_code_invalid", "O código informado não é válido.")

    patient = session.get(Patient, temporary_code.patient_id)
    if patient is None:
        return error_response(request, 422, "access_code_invalid", "O código informado não é válido.")
    temporary_code.consumed_at = now
    pending_request = AccessRequest(
        patient_id=patient.id,
        professional_id=professional.id,
        justification=justification,
        status="pending",
        created_at=now,
    )
    session.add(pending_request)
    session.flush()
    session.add(
        Notification(
            account_id=patient.account_id,
            kind="access_request_created",
            subject_id=pending_request.id,
            created_at=now,
        )
    )
    session.add_all(
        [
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_code.consumed",
                target_id=audit_identifier(temporary_code.id),
                result="success",
                reason="professional_requested",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            ),
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="access_request.created",
                target_id=audit_identifier(pending_request.id),
                result="success",
                reason="code_consumed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role, "status": "pending"},
            ),
        ]
    )
    session.commit()
    return AccessRequestResponse(id=pending_request.id, status=pending_request.status, patient=patient.name)


def owned_profile_response(session: Session, account: Account) -> CurrentAccountResponse | None:
    """Build the authenticated owner's profile response.

    Args:
        session: Database transaction scope.
        account: Authenticated account whose profile is requested.

    Returns:
        The owned profile response, or None when persistence is inconsistent.
    """
    if account.role == "patient":
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
        if patient is None:
            return None
        return CurrentAccountResponse(
            role=account.role,
            status=account.status,
            version=patient.version,
            profile=PatientProfileResponse(
                name=patient.name,
                email=account.email,
                cpf=patient.cpf,
                birthdate=patient.birthdate,
                phone=patient.phone,
                blood_type=patient.blood_type,
            ),
        )
    professional = session.scalar(select(Professional).where(Professional.account_id == account.id))
    if professional is None:
        return None
    return CurrentAccountResponse(
        role=account.role,
        status=account.status,
        version=professional.version,
        profile=ProfessionalProfileResponse(
            name=professional.name,
            email=account.email,
            cpf=professional.cpf,
            birthdate=professional.birthdate,
            phone=professional.phone,
            crm=professional.crm,
            uf=professional.uf,
            specialty=professional.specialty,
            institution=professional.institution,
        ),
    )


@app.patch("/api/v1/me", response_model=CurrentAccountResponse)
def update_current_profile(
    profile_update: OwnedProfileUpdate,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> CurrentAccountResponse | JSONResponse:
    """Update editable fields on the authenticated owner's profile.

    Args:
        profile_update: Editable values and the version previously read.
        request: Authenticated request with origin and CSRF proof.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        The updated owned profile or a safe denial.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    if not valid_csrf(request, "__Host-vitallink_session"):
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="profile.updated",
                target_id=audit_identifier(account.id),
                result="denied",
                reason="request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return csrf_denied_response(request)
    changed_fields = profile_update.model_fields_set - {"expected_version"}
    allowed_fields = {"name", "birthdate", "phone", "blood_type"}
    if account.role == "patient":
        profile = session.scalar(select(Patient).where(Patient.account_id == account.id).with_for_update())
    else:
        allowed_fields = {"phone", "institution"}
        profile = session.scalar(select(Professional).where(Professional.account_id == account.id).with_for_update())
    if profile is None:
        return error_response(request, 500, "profile_unavailable", "Não foi possível carregar o perfil.")
    if not changed_fields or not changed_fields <= allowed_fields:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="profile.updated",
                target_id=audit_identifier(profile.id),
                result="denied",
                reason="field_not_editable",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 422, "profile_field_not_editable", "Revise os campos informados.")
    if profile.version != profile_update.expected_version:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="profile.updated",
                target_id=audit_identifier(profile.id),
                result="denied",
                reason="version_conflict",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 409, "profile_version_conflict", "O perfil foi alterado em outra sessão.")

    for field in changed_fields:
        setattr(profile, field, getattr(profile_update, field))
    profile.version += 1
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="profile.updated",
            target_id=audit_identifier(profile.id),
            result="success",
            reason="owner_updated",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "fields": ",".join(sorted(changed_fields))},
        )
    )
    session.commit()
    response = owned_profile_response(session, account)
    if response is None:
        return error_response(request, 500, "profile_unavailable", "Não foi possível carregar o perfil.")
    return response


@app.get("/api/v1/notifications", response_model=list[NotificationResponse])
def list_notifications(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> list[NotificationResponse] | JSONResponse:
    """List only the authenticated account's persisted notifications."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    notifications = session.scalars(
        select(Notification)
        .where(Notification.account_id == account.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(100)
    ).all()
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="notification.listed",
            target_id=audit_identifier(account.id),
            result="success",
            reason="owner_view",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(notifications)},
        )
    )
    session.commit()
    return [
        NotificationResponse(
            id=notification.id,
            kind=notification.kind,
            created_at=notification.created_at,
            read_at=notification.read_at,
        )
        for notification in notifications
    ]


@app.patch("/api/v1/notifications/{notification_id}", response_model=NotificationResponse)
def read_notification(
    notification_id: UUID,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> NotificationResponse | JSONResponse:
    """Persist read state for one notification owned by the current account."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    notification = session.scalar(
        select(Notification)
        .where(Notification.id == notification_id, Notification.account_id == account.id)
        .with_for_update()
    )
    allowed = notification is not None and valid_csrf(request, "__Host-vitallink_session")
    if not allowed:
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="notification.read",
                target_id=audit_identifier(notification_id),
                result="denied",
                reason="not_found_or_request_verification_failed",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        return error_response(request, 404, "notification_not_found", "Notificação não encontrada.")
    assert notification is not None
    if notification.read_at is None:
        notification.read_at = now
    session.add(
        AuditEvent(
            actor_id=audit_identifier(account.id),
            action="notification.read",
            target_id=audit_identifier(notification.id),
            result="success",
            reason="owner_read",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role},
        )
    )
    session.commit()
    return NotificationResponse(
        id=notification.id,
        kind=notification.kind,
        created_at=notification.created_at,
        read_at=notification.read_at,
    )


@app.get("/api/v1/audit-events", response_model=list[AuditEventResponse])
def list_audit_events(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[AuditEventResponse] | JSONResponse:
    """Return the current account's minimal audit projection."""
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    own_identifier = audit_identifier(account.id)
    events = session.scalars(
        select(AuditEvent)
        .where(
            or_(
                AuditEvent.actor_id == own_identifier,
                AuditEvent.event_metadata["audience_id"].as_string() == own_identifier,
            )
        )
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(limit)
    ).all()
    session.add(
        AuditEvent(
            actor_id=own_identifier,
            action="audit_event.listed",
            target_id=own_identifier,
            result="success",
            reason="owner_view",
            correlation_id=request.state.correlation_id,
            event_metadata={"role": account.role, "count": len(events)},
        )
    )
    session.commit()
    event_labels = {
        "account": "Segurança da conta",
        "access_code": "Acesso ao prontuário",
        "access_request": "Acesso ao prontuário",
        "authorization": "Acesso ao prontuário",
        "patient_profile": "Acesso ao prontuário",
        "document": "Documento",
        "clinical_message": "Mensagem clínica",
        "transcription": "Ditado clínico",
        "notification": "Notificação",
        "audit_event": "Histórico de auditoria",
        "profile": "Perfil",
    }
    return [
        AuditEventResponse(
            id=event.id,
            event=event_labels.get(event.action.split(".", 1)[0], "Atividade da conta"),
            status="Concluído" if event.result == "success" else "Não concluído",
            created_at=event.created_at,
        )
        for event in events
    ]


@app.get("/api/v1/me", response_model=CurrentAccountResponse)
def current_account(
    request: Request,
    session: Annotated[Session, Depends(get_session)],
    now: Annotated[datetime, Depends(current_time)],
) -> CurrentAccountResponse | JSONResponse:
    """Return the state of the currently authenticated account and profile.

    Args:
        request: Request containing the opaque full-session cookie.
        session: Database transaction scope.
        now: Server-controlled UTC time shared by the request.

    Returns:
        Minimal account state or an authentication error.
    """
    context = authenticated_session(request, session, now)
    if context is None:
        return error_response(request, 401, "authentication_required", "Entre novamente.")
    _, account = context
    response = owned_profile_response(session, account)
    if response is None:
        return error_response(request, 500, "profile_unavailable", "Não foi possível carregar o perfil.")
    return response


def api_rate_limit_response(request: Request, now: datetime) -> JSONResponse | None:
    """Count authenticated API calls by account and server-resolved origin.

    Args:
        request: Request that may contain a full opaque session cookie.
        now: Server-controlled time for the fixed request window.

    Returns:
        A safe D03 response after the configured limit, otherwise None.
    """
    raw_token = request.cookies.get("__Host-vitallink_session")
    if raw_token is None or not request.url.path.startswith("/api/"):
        return None
    with SessionFactory() as session:
        account_session = session.scalar(
            select(AccountSession).where(
                AccountSession.token_hash == keyed_digest(raw_token),
                AccountSession.purpose == "authenticated",
                AccountSession.revoked_at.is_(None),
                AccountSession.expires_at > now,
            )
        )
        if account_session is None:
            return None
        account = session.get(Account, account_session.account_id)
        if account is None or account.status != "active":
            return None
        target_id = keyed_digest(f"api:{account.id}")
        origin_id = keyed_digest(request.client.host if request.client is not None else "unknown")
        session.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
            {"key": f"{target_id}:{origin_id}"},
        )
        bucket = session.scalar(
            select(LoginThrottle).where(
                LoginThrottle.target_id == target_id,
                LoginThrottle.origin_id == origin_id,
            )
        )
        window = timedelta(seconds=settings.api_rate_limit_window_seconds)
        if bucket is None:
            bucket = LoginThrottle(
                target_id=target_id,
                origin_id=origin_id,
                failed_count=1,
                window_started_at=now,
            )
            session.add(bucket)
            session.commit()
            return None
        if bucket.window_started_at <= now - window:
            bucket.failed_count = 1
            bucket.window_started_at = now
            bucket.blocked_until = None
            session.commit()
            return None
        if bucket.failed_count < settings.api_rate_limit_requests:
            bucket.failed_count += 1
            session.commit()
            return None
        bucket.blocked_until = bucket.window_started_at + window
        session.add(
            AuditEvent(
                actor_id=audit_identifier(account.id),
                action="api.request.rate_limited",
                target_id=target_id,
                result="denied",
                reason="D03",
                correlation_id=request.state.correlation_id,
                event_metadata={"role": account.role},
            )
        )
        session.commit()
        retry_after = math.ceil((bucket.blocked_until - now).total_seconds())
    return error_response(
        request,
        status.HTTP_429_TOO_MANY_REQUESTS,
        "api_temporarily_limited",
        "Aguarde antes de tentar novamente.",
        {"Retry-After": str(max(1, retry_after))},
    )


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
        try:
            response = api_rate_limit_response(request, datetime.now(UTC)) or await call_next(request)
        except SQLAlchemyError:
            http_logger.exception("API rate-limit dependency failed")
            response = error_response(
                request,
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "dependency_unavailable",
                "O serviço está temporariamente indisponível.",
            )
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
