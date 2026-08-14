"""Professional registration behavior through the public HTTP API."""

import os
import re
import subprocess
import sys
from uuid import UUID, uuid4

import httpx
import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select

from vitallink.database import Account, AuditEvent, Professional, SessionFactory
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


def confirmation_code_for(email: str) -> str:
    """Read a confirmation code delivered to the real Mailpit boundary.

    Args:
        email: Synthetic recipient address.

    Returns:
        The delivered six-digit confirmation code.
    """
    response = httpx.get("http://127.0.0.1:8025/api/v1/messages", timeout=5)
    response.raise_for_status()
    matching = [message for message in response.json()["messages"] if message["To"][0]["Address"] == email]
    assert len(matching) == 1
    match = re.search(r"\b\d{6}\b", matching[0]["Snippet"])
    assert match is not None
    return match.group()


def registration_data(suffix: str) -> dict[str, str]:
    """Create a unique valid synthetic professional registration.

    Args:
        suffix: Random hexadecimal identity suffix.

    Returns:
        Registration JSON accepted by the public API.
    """
    cpf_seed = "".join(str(int(character, 16) % 10) for character in suffix[:9])
    return {
        "name": "Profissional Sintética",
        "email": f"professional.{suffix}@example.com",
        "cpf": valid_cpf(cpf_seed),
        "birthdate": "1987-06-12",
        "phone": "+5553999999999",
        "password": "uma senha profissional segura 2026",
        "crm": suffix[:6].upper(),
        "uf": "RS",
        "specialty": "Cardiologia",
        "institution": "Hospital Acadêmico Sintético",
    }


def test_professional_can_request_registration_without_identity_enumeration() -> None:
    """Persist a pending professional while suppressing duplicate identity details."""
    suffix = uuid4().hex
    registration = registration_data(suffix)
    email = registration["email"]

    with TestClient(app, base_url="https://testserver") as client:
        first_response = client.post("/api/v1/professional-registrations", json=registration)
        repeated_response = client.post("/api/v1/professional-registrations", json=registration)

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


def test_professional_remains_pending_after_totp_and_cannot_log_in() -> None:
    """Deny a professional full authentication until manual validation."""
    registration = registration_data(uuid4().hex)
    email = registration["email"]

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/professional-registrations", json=registration)
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
        confirmation = client.post(
            "/api/v1/totp/confirmations",
            json={"code": totp.now()},
            headers=activation_headers,
        )
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": email,
                "password": registration["password"],
                "totp_code": totp.now(),
            },
        )

    assert confirmation.status_code == 200
    assert login.status_code == 403
    assert login.json()["code"] == "professional_pending_validation"
    assert "__Host-vitallink_session=" not in login.headers.get("set-cookie", "")
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent).where(
                AuditEvent.correlation_id == UUID(login.headers["X-Correlation-ID"]),
                AuditEvent.action == "account.login",
            )
        )
    assert event is not None
    assert event.result == "denied"
    assert event.reason == "professional_validation_required"


def test_identified_operator_approves_professional_idempotently() -> None:
    """Approve one pending professional through the audited local command."""
    registration = registration_data(uuid4().hex)
    email = registration["email"]

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/professional-registrations", json=registration)
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
        client.post(
            "/api/v1/totp/confirmations",
            json={"code": totp.now()},
            headers=activation_headers,
        )

        command = [
            sys.executable,
            "-m",
            "vitallink.professional_validation",
            "--crm",
            registration["crm"],
            "--uf",
            registration["uf"],
            "--operator",
            "security-operator-01",
            "--decision",
            "approved",
            "--justification",
            "Synthetic registry verification completed.",
        ]
        command_environment = os.environ | {"PYTHONPATH": "src"}
        first_decision = subprocess.run(command, check=False, capture_output=True, text=True, env=command_environment)
        repeated_decision = subprocess.run(
            command, check=False, capture_output=True, text=True, env=command_environment
        )
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": email,
                "password": registration["password"],
                "totp_code": totp.now(),
            },
        )
        current_account = client.get("/api/v1/me")

    assert first_decision.returncode == repeated_decision.returncode == 0
    assert first_decision.stdout == repeated_decision.stdout == "Professional validation recorded.\n"
    assert email not in first_decision.stdout + first_decision.stderr
    assert registration["cpf"] not in first_decision.stdout + first_decision.stderr
    assert login.status_code == 204
    assert current_account.json() == {"role": "professional", "status": "active"}


def test_rejection_is_final_and_audited_without_operator_profile() -> None:
    """Reject one pending professional and deny a conflicting later decision."""
    registration = registration_data(uuid4().hex)
    operator = "security-operator-02"

    with TestClient(app, base_url="https://testserver") as client:
        client.post("/api/v1/professional-registrations", json=registration)
        verification = client.post(
            "/api/v1/email-verifications",
            json={"email": registration["email"], "code": confirmation_code_for(registration["email"])},
        )
        activation_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": verification.headers["X-CSRF-Token"],
        }
        enrollment = client.post("/api/v1/totp", headers=activation_headers)
        totp = pyotp.TOTP(enrollment.json()["secret"])
        client.post(
            "/api/v1/totp/confirmations",
            json={"code": totp.now()},
            headers=activation_headers,
        )

        command = [
            sys.executable,
            "-m",
            "vitallink.professional_validation",
            "--crm",
            registration["crm"],
            "--uf",
            registration["uf"],
            "--operator",
            operator,
            "--decision",
            "rejected",
            "--justification",
            "Synthetic registry verification failed.",
        ]
        command_environment = os.environ | {"PYTHONPATH": "src"}
        rejection = subprocess.run(command, check=False, capture_output=True, text=True, env=command_environment)
        command[command.index("rejected")] = "approved"
        conflicting_approval = subprocess.run(
            command, check=False, capture_output=True, text=True, env=command_environment
        )
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": registration["email"],
                "password": registration["password"],
                "totp_code": totp.now(),
            },
        )

    assert rejection.returncode == 0
    assert conflicting_approval.returncode == 1
    assert login.status_code == 403
    assert login.json()["code"] == "professional_rejected"
    with SessionFactory() as session:
        professional = session.scalar(
            select(Professional).where(Professional.crm == registration["crm"], Professional.uf == registration["uf"])
        )
        assert professional is not None
        account = session.get(Account, professional.account_id)
        events = session.scalars(
            select(AuditEvent)
            .where(AuditEvent.action == "professional.validation.decided")
            .order_by(AuditEvent.created_at.desc())
            .limit(2)
        ).all()
        operator_account = session.scalar(select(Account).where(Account.email == operator))

    assert account is not None and account.status == "rejected"
    assert [event.result for event in events] == ["denied", "success"]
    assert [event.reason for event in events] == ["invalid_transition", "decision_recorded"]
    assert all(event.actor_id != operator for event in events)
    assert operator_account is None
