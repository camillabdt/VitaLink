"""Patient registration behavior through the public HTTP API."""

import json
import logging
import re
from uuid import UUID, uuid4

import httpx
import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from vitallink.database import AuditEvent, SessionFactory
from vitallink.main import app


def valid_cpf(seed: str) -> str:
    """Build a valid synthetic CPF from nine numeric digits.

    Args:
        seed: Nine-digit synthetic base.

    Returns:
        A valid eleven-digit CPF for tests.
    """
    digits = [int(digit) for digit in seed]
    for position in (9, 10):
        weight = position + 1
        total = sum(digit * (weight - index) for index, digit in enumerate(digits))
        digits.append(0 if total % 11 < 2 else 11 - total % 11)
    return "".join(str(digit) for digit in digits)


def registration_data(email: str, cpf: str) -> dict[str, str]:
    """Create a valid synthetic patient registration payload.

    Args:
        email: Unique synthetic e-mail address.
        cpf: Valid synthetic CPF.

    Returns:
        Registration JSON accepted by the public API.
    """
    return {
        "name": "Paciente Sintética",
        "email": email,
        "cpf": cpf,
        "birthdate": "1992-08-13",
        "phone": "+5553999999999",
        "password": "uma senha longa e segura 2026",
        "blood_type": "O+",
    }


def confirmation_code_for(email: str) -> str:
    """Read the confirmation code delivered to the real Mailpit boundary.

    Args:
        email: Recipient address to find.

    Returns:
        The six-digit code captured by Mailpit.
    """
    response = httpx.get("http://127.0.0.1:8025/api/v1/messages", timeout=5)
    response.raise_for_status()
    matching = [message for message in response.json()["messages"] if message["To"][0]["Address"] == email]
    assert len(matching) == 1
    match = re.search(r"\b\d{6}\b", matching[0]["Snippet"])
    assert match is not None
    return match.group()


def test_patient_can_request_registration_without_account_enumeration() -> None:
    """Accept a valid registration and keep a repeated request indistinguishable."""
    suffix = uuid4().hex
    email = f"patient.{suffix}@example.com"
    registration = registration_data(
        email,
        valid_cpf(
            suffix[:9]
            .replace("a", "1")
            .replace("b", "2")
            .replace("c", "3")
            .replace("d", "4")
            .replace("e", "5")
            .replace("f", "6")
        ),
    )

    with TestClient(app, base_url="https://testserver") as client:
        first_response = client.post("/api/v1/patient-registrations", json=registration)
        repeated_response = client.post("/api/v1/patient-registrations", json=registration)

    assert first_response.status_code == 202
    assert repeated_response.status_code == 202
    assert (
        first_response.json()
        == repeated_response.json()
        == {
            "message": "Se os dados puderem ser cadastrados, enviaremos as instruções de confirmação.",
        }
    )
    assert confirmation_code_for(email)
    correlation_ids = {
        UUID(first_response.headers["X-Correlation-ID"]),
        UUID(repeated_response.headers["X-Correlation-ID"]),
    }
    with SessionFactory() as session:
        events = list(session.scalars(select(AuditEvent).where(AuditEvent.correlation_id.in_(correlation_ids))))
    assert sorted(event.result for event in events) == ["denied", "success"]
    serialized_events = json.dumps(
        [
            {
                "actor": event.actor_id,
                "target": event.target_id,
                "metadata": event.event_metadata,
            }
            for event in events
        ]
    )
    assert email not in serialized_events
    assert registration["cpf"] not in serialized_events
    assert registration["name"] not in serialized_events
    assert registration["password"] not in serialized_events


def test_patient_registration_rejects_invalid_cpf() -> None:
    """Reject a CPF whose check digits are invalid at the public boundary."""
    registration = registration_data(f"invalid.cpf.{uuid4().hex}@example.com", "11111111111")

    with TestClient(app, base_url="https://testserver") as client:
        response = client.post("/api/v1/patient-registrations", json=registration)

    assert response.status_code == 422
    assert response.headers["X-Correlation-ID"]
    assert response.json() == {
        "code": "invalid_request",
        "message": "Revise os dados informados.",
        "correlation_id": response.headers["X-Correlation-ID"],
    }
    assert registration["cpf"] not in response.text
    assert registration["password"] not in response.text


def test_email_confirmation_creates_only_a_restricted_activation_session() -> None:
    """Confirm e-mail once and issue a cookie restricted to TOTP activation."""
    suffix = uuid4().hex
    digits = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    email = f"activation.{suffix}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(digits)))
        code = confirmation_code_for(email)
        confirmation = client.post("/api/v1/email-verifications", json={"email": email, "code": code})
        repeated = client.post("/api/v1/email-verifications", json={"email": email, "code": code})

    assert confirmation.status_code == 204
    assert "__Host-vitallink_activation=" in confirmation.headers["set-cookie"]
    assert "HttpOnly" in confirmation.headers["set-cookie"]
    assert "Secure" in confirmation.headers["set-cookie"]
    assert "SameSite=strict" in confirmation.headers["set-cookie"]
    assert confirmation.headers["X-CSRF-Token"]
    assert repeated.status_code == 400
    assert repeated.json()["code"] == "invalid_or_expired_verification"
    with SessionFactory() as session:
        repeated_event = session.scalar(
            select(AuditEvent).where(
                AuditEvent.correlation_id == UUID(repeated.headers["X-Correlation-ID"]),
                AuditEvent.action == "account.email.verified",
            )
        )
    assert repeated_event is not None
    assert repeated_event.result == "denied"


def test_email_confirmation_attempts_are_progressively_limited() -> None:
    """Limit repeated invalid e-mail codes by account and request origin."""
    suffix = uuid4().hex
    digits = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    email = f"email-limit.{suffix}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(digits)))
        responses = [
            client.post("/api/v1/email-verifications", json={"email": email, "code": "000000"}) for _ in range(6)
        ]

    assert [response.status_code for response in responses[:5]] == [400] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_activation_session_enrolls_totp_and_returns_recovery_material_once() -> None:
    """Enroll and confirm TOTP before allowing a patient account to become active."""
    suffix = uuid4().hex
    digits = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    email = f"totp.{suffix}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(digits)))
        verification = client.post(
            "/api/v1/email-verifications",
            json={"email": email, "code": confirmation_code_for(email)},
        )
        csrf_token = verification.headers["X-CSRF-Token"]
        without_csrf = client.post("/api/v1/totp")
        wrong_origin = client.post(
            "/api/v1/totp",
            headers={"Origin": "https://attacker.example", "X-CSRF-Token": csrf_token},
        )
        enrollment = client.post(
            "/api/v1/totp",
            headers={"Origin": "https://testserver", "X-CSRF-Token": csrf_token},
        )
        confirmation = client.post(
            "/api/v1/totp/confirmations",
            json={"code": pyotp.TOTP(enrollment.json()["secret"]).now()},
            headers={"Origin": "https://testserver", "X-CSRF-Token": csrf_token},
        )
        repeated = client.post(
            "/api/v1/totp/confirmations",
            json={"code": pyotp.TOTP(enrollment.json()["secret"]).now()},
            headers={"Origin": "https://testserver", "X-CSRF-Token": csrf_token},
        )

    assert without_csrf.status_code == wrong_origin.status_code == 403
    assert enrollment.status_code == 201
    assert enrollment.json()["provisioning_uri"].startswith("otpauth://totp/VitaLink:")
    assert confirmation.status_code == 200
    assert len(confirmation.json()["recovery_codes"]) == 10
    assert confirmation.json()["offline_recovery_key"]
    assert "Max-Age=0" in confirmation.headers["set-cookie"]
    assert repeated.status_code == 401
    correlations = {
        UUID(response.headers["X-Correlation-ID"])
        for response in (without_csrf, wrong_origin, enrollment, confirmation, repeated)
    }
    with SessionFactory() as session:
        events = list(
            session.scalars(
                select(AuditEvent).where(
                    AuditEvent.correlation_id.in_(correlations),
                    AuditEvent.action.like("account.totp.%"),
                )
            )
        )
    assert sorted(event.result for event in events) == ["denied", "denied", "denied", "success", "success"]


def test_totp_confirmation_attempts_are_progressively_limited() -> None:
    """Limit repeated invalid authenticator codes in the activation session."""
    suffix = uuid4().hex
    digits = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    email = f"totp-limit.{suffix}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(digits)))
        verification = client.post(
            "/api/v1/email-verifications",
            json={"email": email, "code": confirmation_code_for(email)},
        )
        headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": verification.headers["X-CSRF-Token"],
        }
        client.post("/api/v1/totp", headers=headers)
        responses = [
            client.post("/api/v1/totp/confirmations", json={"code": "000000"}, headers=headers) for _ in range(6)
        ]

    assert [response.status_code for response in responses[:5]] == [400] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_active_patient_logs_in_with_password_and_totp_using_an_opaque_cookie() -> None:
    """Require both factors and resolve the resulting opaque server session."""
    suffix = uuid4().hex
    digits = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    email = f"login.{suffix}@example.com"
    password = "uma senha longa e segura 2026"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(digits)))
        verification = client.post(
            "/api/v1/email-verifications",
            json={"email": email, "code": confirmation_code_for(email)},
        )
        activation_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": verification.headers["X-CSRF-Token"],
        }
        enrollment = client.post("/api/v1/totp", headers=activation_headers)
        totp = pyotp.TOTP(enrollment.json()["secret"])
        client.post("/api/v1/totp/confirmations", json={"code": totp.now()}, headers=activation_headers)
        invalid_password = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": "senha totalmente incorreta", "totp_code": totp.now()},
        )
        invalid_totp = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": "000000"},
        )
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        current_account = client.get("/api/v1/me")
        csrf_token = login.headers["X-CSRF-Token"]
        logout_without_csrf = client.delete("/api/v1/sessions/current")
        logout = client.delete(
            "/api/v1/sessions/current",
            headers={"Origin": "https://testserver", "X-CSRF-Token": csrf_token},
        )
        after_logout = client.get("/api/v1/me")

    assert invalid_password.status_code == invalid_totp.status_code == 401
    assert {key: invalid_password.json()[key] for key in ("code", "message")} == {
        key: invalid_totp.json()[key] for key in ("code", "message")
    }
    assert invalid_password.json()["correlation_id"] == invalid_password.headers["X-Correlation-ID"]
    assert invalid_totp.json()["correlation_id"] == invalid_totp.headers["X-Correlation-ID"]
    assert login.status_code == 204
    cookie = login.headers["set-cookie"]
    assert "__Host-vitallink_session=" in cookie
    assert "HttpOnly" in cookie and "Secure" in cookie and "SameSite=strict" in cookie
    assert current_account.status_code == 200
    assert current_account.json()["role"] == "patient"
    assert current_account.json()["status"] == "active"
    assert logout_without_csrf.status_code == 403
    assert logout.status_code == 204
    assert "Max-Age=0" in logout.headers["set-cookie"]
    assert after_logout.status_code == 401


def test_login_attempts_are_limited_without_revealing_the_account() -> None:
    """Throttle repeated invalid factors with a stable public response."""
    email = f"limited.{uuid4().hex}@example.com"
    payload = {"email": email, "password": "invalid synthetic password", "totp_code": "000000"}

    with TestClient(app, base_url="https://testserver") as client:
        responses = [client.post("/api/v1/sessions", json=payload) for _ in range(6)]

    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429
    assert responses[5].json() == {
        "code": "authentication_temporarily_limited",
        "message": "Aguarde antes de tentar novamente.",
        "correlation_id": responses[5].headers["X-Correlation-ID"],
    }
    assert int(responses[5].headers["Retry-After"]) >= 1


def test_every_public_request_has_a_minimal_log_without_submitted_data(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Log normalized request metadata without PII, credentials, or body fields."""
    email = f"private.{uuid4().hex}@example.com"
    password = "sensitive synthetic password"
    payload = registration_data(email, "11111111111")
    payload["password"] = password

    with (
        caplog.at_level(logging.INFO, logger="vitallink.http"),
        TestClient(app, base_url="https://testserver") as client,
    ):
        response = client.post("/api/v1/patient-registrations", json=payload)

    event = json.loads(caplog.records[-1].message)
    assert event["route"] == "/api/v1/patient-registrations"
    assert event["method"] == "POST"
    assert event["status"] == 422
    assert event["correlation_id"] == response.headers["X-Correlation-ID"]
    assert event["duration_ms"] >= 0
    assert email not in caplog.text
    assert password not in caplog.text
