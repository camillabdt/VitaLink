"""Temporary access-code behavior through the public HTTP API."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_account_recovery import activate_patient
from test_professional_registration import confirmation_code_for as professional_confirmation_code_for
from test_professional_registration import registration_data as professional_registration_data

from vitallink.database import AccessCode, AccessRequest, Account, AuditEvent, Notification, Patient, SessionFactory
from vitallink.main import app


def activate_professional_with_totp(client: TestClient) -> tuple[dict[str, str], pyotp.TOTP]:
    """Activate one synthetic professional through the public boundaries.

    Args:
        client: HTTP client retaining the professional session.

    Returns:
        Same-origin CSRF headers and the synthetic authenticator.
    """
    registration = professional_registration_data(uuid4().hex)
    client.post("/api/v1/professional-registrations", json=registration)
    verification = client.post(
        "/api/v1/email-verifications",
        json={
            "email": registration["email"],
            "code": professional_confirmation_code_for(registration["email"]),
        },
    )
    activation_headers = {
        "Origin": "https://testserver",
        "X-CSRF-Token": verification.headers["X-CSRF-Token"],
    }
    enrollment = client.post("/api/v1/totp", headers=activation_headers)
    totp = pyotp.TOTP(enrollment.json()["secret"])
    client.post("/api/v1/totp/confirmations", json={"code": totp.now()}, headers=activation_headers)
    validation = subprocess.run(
        [
            sys.executable,
            "-m",
            "vitallink.professional_validation",
            "--crm",
            registration["crm"],
            "--uf",
            registration["uf"],
            "--operator",
            "access-request-validation-operator",
            "--decision",
            "approved",
            "--justification",
            "Synthetic access-request validation completed.",
        ],
        check=False,
        capture_output=True,
        text=True,
        env=os.environ | {"PYTHONPATH": "src"},
    )
    assert validation.returncode == 0
    login = client.post(
        "/api/v1/sessions",
        json={
            "email": registration["email"],
            "password": registration["password"],
            "totp_code": totp.now(),
        },
    )
    assert login.status_code == 204
    return (
        {
            "Origin": "https://testserver",
            "X-CSRF-Token": login.headers["X-CSRF-Token"],
        },
        totp,
    )


def activate_professional(client: TestClient) -> dict[str, str]:
    """Activate a synthetic professional and return mutation headers.

    Args:
        client: HTTP client retaining the professional session.

    Returns:
        Same-origin CSRF headers for authenticated mutations.
    """
    headers, _ = activate_professional_with_totp(client)
    return headers


def test_patient_generates_a_single_use_access_code() -> None:
    """Create an unpredictable 24-hour code for the authenticated patient."""
    email = f"access-code.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": email,
                "password": "uma senha longa e segura 2026",
                "totp_code": totp.now(),
            },
        )
        response = client.post(
            "/api/v1/access-codes",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": login.headers["X-CSRF-Token"],
            },
        )

    assert response.status_code == 201
    assert len(response.json()["code"]) >= 32
    assert response.json()["status"] == "active"

    with SessionFactory() as session:
        account = session.scalar(select(Account).where(Account.email == email))
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
        stored_code = session.scalar(select(AccessCode).where(AccessCode.patient_id == patient.id))

    assert stored_code.code_hash != response.json()["code"]
    assert stored_code.expires_at - stored_code.created_at == timedelta(hours=24)


def test_patient_lists_and_revokes_their_access_code() -> None:
    """List safe metadata and revoke a code owned by the patient."""
    email = f"access-code-revoke.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": email,
                "password": "uma senha longa e segura 2026",
                "totp_code": totp.now(),
            },
        )
        headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": login.headers["X-CSRF-Token"],
        }
        created = client.post("/api/v1/access-codes", headers=headers)
        listed = client.get("/api/v1/access-codes")
        revoked = client.delete(f"/api/v1/access-codes/{created.json()['id']}", headers=headers)
        listed_after = client.get("/api/v1/access-codes")

    assert listed.status_code == 200
    assert listed.json() == [
        {
            "id": created.json()["id"],
            "created_at": listed.json()[0]["created_at"],
            "expires_at": created.json()["expires_at"],
            "status": "active",
        }
    ]
    assert "code" not in listed.json()[0]
    assert revoked.status_code == 204
    assert listed_after.json()[0]["status"] == "revoked"


def test_patient_cannot_revoke_another_patients_code() -> None:
    """Deny an identifier swap without exposing whether the code exists."""
    owner_email = f"access-code-owner.{uuid4().hex}@example.com"
    attacker_email = f"access-code-attacker.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as owner_client:
        owner_totp = activate_patient(owner_client, owner_email)
        owner_login = owner_client.post(
            "/api/v1/sessions",
            json={
                "email": owner_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": owner_totp.now(),
            },
        )
        owner_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": owner_login.headers["X-CSRF-Token"],
        }
        owned_code = owner_client.post("/api/v1/access-codes", headers=owner_headers).json()

        with TestClient(app, base_url="https://testserver") as attacker_client:
            attacker_totp = activate_patient(attacker_client, attacker_email)
            attacker_login = attacker_client.post(
                "/api/v1/sessions",
                json={
                    "email": attacker_email,
                    "password": "uma senha longa e segura 2026",
                    "totp_code": attacker_totp.now(),
                },
            )
            denied = attacker_client.delete(
                f"/api/v1/access-codes/{owned_code['id']}",
                headers={
                    "Origin": "https://testserver",
                    "X-CSRF-Token": attacker_login.headers["X-CSRF-Token"],
                },
            )

        persisted = owner_client.get("/api/v1/access-codes")

    assert denied.status_code == 404
    assert denied.json()["code"] == "access_code_not_found"
    assert persisted.json()[0]["status"] == "active"


def test_approved_professional_consumes_code_to_create_pending_request() -> None:
    """Consume one code once without granting access to clinical data."""
    patient_email = f"access-request-patient.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as patient_client:
        patient_totp = activate_patient(patient_client, patient_email)
        patient_login = patient_client.post(
            "/api/v1/sessions",
            json={
                "email": patient_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": patient_totp.now(),
            },
        )
        code = patient_client.post(
            "/api/v1/access-codes",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": patient_login.headers["X-CSRF-Token"],
            },
        ).json()["code"]

    with TestClient(app, base_url="https://testserver") as professional_client:
        headers = activate_professional(professional_client)
        created = professional_client.post(
            "/api/v1/access-requests",
            headers=headers,
            json={
                "code": code,
                "justification": "Acompanhamento clínico sintético solicitado pelo paciente.",
            },
        )
        reused = professional_client.post(
            "/api/v1/access-requests",
            headers=headers,
            json={
                "code": code,
                "justification": "Tentativa sintética de reutilização.",
            },
        )

    assert created.status_code == 201
    assert created.json()["status"] == "pending"
    assert created.json()["patient"] == "Paciente Sintética"
    assert reused.status_code == 422
    assert reused.json()["code"] == "access_code_invalid"

    with SessionFactory() as session:
        pending_request = session.get(AccessRequest, created.json()["id"])
        notification = session.scalar(select(Notification).where(Notification.subject_id == pending_request.id))
        stored_code = session.scalar(select(AccessCode).where(AccessCode.patient_id == pending_request.patient_id))
        audits = session.scalars(
            select(AuditEvent).where(AuditEvent.action.in_(("access_code.consumed", "access_request.created")))
        ).all()

    assert pending_request.status == "pending"
    assert notification.kind == "access_request_created"
    assert stored_code.consumed_at is not None
    assert stored_code.code_hash != code
    serialized_audits = " ".join(
        f"{event.actor_id} {event.target_id} {event.reason} {event.event_metadata}" for event in audits
    )
    assert code not in serialized_audits
    assert patient_email not in serialized_audits
    assert "Acompanhamento clínico sintético" not in serialized_audits


def test_invalid_revoked_and_expired_codes_share_a_safe_denial() -> None:
    """Deny every inactive code without revealing patient information."""
    patient_email = f"inactive-code-patient.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as patient_client:
        patient_totp = activate_patient(patient_client, patient_email)
        patient_login = patient_client.post(
            "/api/v1/sessions",
            json={
                "email": patient_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": patient_totp.now(),
            },
        )
        patient_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": patient_login.headers["X-CSRF-Token"],
        }
        revoked = patient_client.post("/api/v1/access-codes", headers=patient_headers).json()
        patient_client.delete(f"/api/v1/access-codes/{revoked['id']}", headers=patient_headers)
        expired = patient_client.post("/api/v1/access-codes", headers=patient_headers).json()

    with SessionFactory.begin() as session:
        expired_code = session.get(AccessCode, expired["id"])
        expired_code.expires_at = datetime.now(UTC) - timedelta(seconds=1)

    with TestClient(app, base_url="https://testserver") as professional_client:
        professional_headers = activate_professional(professional_client)
        responses = [
            professional_client.post(
                "/api/v1/access-requests",
                headers=professional_headers,
                json={"code": code, "justification": "Solicitação sintética com código inválido."},
            )
            for code in (revoked["code"], expired["code"], "x" * 32)
        ]

    assert {response.status_code for response in responses} == {422}
    assert {(response.json()["code"], response.json()["message"]) for response in responses} == {
        ("access_code_invalid", "O código informado não é válido.")
    }
    assert all(patient_email not in response.text for response in responses)


def test_concurrent_code_consumption_creates_one_request() -> None:
    """Allow one winner when the same code is consumed concurrently."""
    patient_email = f"concurrent-code-patient.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as patient_client:
        patient_totp = activate_patient(patient_client, patient_email)
        patient_login = patient_client.post(
            "/api/v1/sessions",
            json={
                "email": patient_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": patient_totp.now(),
            },
        )
        code = patient_client.post(
            "/api/v1/access-codes",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": patient_login.headers["X-CSRF-Token"],
            },
        ).json()["code"]

    with TestClient(app, base_url="https://testserver") as professional_client:
        headers = activate_professional(professional_client)

        def consume_code(attempt: int) -> int:
            """Submit one concurrent request and return its HTTP status."""
            response = professional_client.post(
                "/api/v1/access-requests",
                headers=headers,
                json={
                    "code": code,
                    "justification": f"Solicitação sintética concorrente número {attempt}.",
                },
            )
            return response.status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(consume_code, (1, 2)))

    assert sorted(statuses) == [201, 422]

    with SessionFactory() as session:
        account = session.scalar(select(Account).where(Account.email == patient_email))
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
        requests = session.scalars(select(AccessRequest).where(AccessRequest.patient_id == patient.id)).all()

    assert len(requests) == 1


def test_patient_and_professional_cannot_swap_access_code_roles() -> None:
    """Deny code generation or consumption when the authenticated role is wrong."""
    patient_email = f"access-role-patient.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as patient_client:
        patient_totp = activate_patient(patient_client, patient_email)
        patient_login = patient_client.post(
            "/api/v1/sessions",
            json={
                "email": patient_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": patient_totp.now(),
            },
        )
        patient_attempt = patient_client.post(
            "/api/v1/access-requests",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": patient_login.headers["X-CSRF-Token"],
            },
            json={"code": "x" * 32, "justification": "Solicitação sintética com papel incorreto."},
        )

    with TestClient(app, base_url="https://testserver") as professional_client:
        professional_headers = activate_professional(professional_client)
        professional_attempt = professional_client.post("/api/v1/access-codes", headers=professional_headers)

    assert patient_attempt.status_code == 403
    assert patient_attempt.json()["code"] == "professional_required"
    assert professional_attempt.status_code == 403
    assert professional_attempt.json()["code"] == "patient_required"


def test_blank_justification_does_not_consume_the_code() -> None:
    """Reject whitespace-only justification while preserving the active code."""
    patient_email = f"blank-justification-patient.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as patient_client:
        patient_totp = activate_patient(patient_client, patient_email)
        patient_login = patient_client.post(
            "/api/v1/sessions",
            json={
                "email": patient_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": patient_totp.now(),
            },
        )
        patient_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": patient_login.headers["X-CSRF-Token"],
        }
        code = patient_client.post("/api/v1/access-codes", headers=patient_headers).json()["code"]

        with TestClient(app, base_url="https://testserver") as professional_client:
            professional_headers = activate_professional(professional_client)
            denied = professional_client.post(
                "/api/v1/access-requests",
                headers=professional_headers,
                json={"code": code, "justification": "          "},
            )

        persisted = patient_client.get("/api/v1/access-codes")

    assert denied.status_code == 422
    assert denied.json()["code"] == "justification_invalid"
    assert persisted.json()[0]["status"] == "active"
