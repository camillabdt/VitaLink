"""Owned profile behavior through the public HTTP API."""

import os
import subprocess
import sys
from uuid import uuid4

import pyotp
from fastapi.testclient import TestClient
from test_account_recovery import activate_patient
from test_professional_registration import (
    confirmation_code_for as professional_confirmation_code_for,
)
from test_professional_registration import registration_data as professional_registration_data

from vitallink.main import app


def test_patient_reads_their_persisted_profile() -> None:
    """Return only the authenticated patient's persisted profile."""
    email = f"profile.{uuid4().hex}@example.com"

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
        response = client.get("/api/v1/me")

    assert login.status_code == 204
    assert response.status_code == 200
    assert response.json() == {
        "role": "patient",
        "status": "active",
        "version": 1,
        "profile": {
            "name": "Paciente Sintética",
            "email": email,
            "cpf": response.json()["profile"]["cpf"],
            "birthdate": "1992-08-13",
            "phone": "+5553999999999",
            "blood_type": "O+",
        },
    }
    assert len(response.json()["profile"]["cpf"]) == 11


def test_patient_updates_only_their_editable_profile_fields() -> None:
    """Persist editable patient fields through the owned profile endpoint."""
    email = f"profile-update.{uuid4().hex}@example.com"

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
        updated = client.patch(
            "/api/v1/me",
            headers=headers,
            json={
                "expected_version": 1,
                "name": "Paciente Atualizada",
                "birthdate": "1991-05-20",
                "phone": "+5553988888888",
                "blood_type": "A+",
            },
        )
        persisted = client.get("/api/v1/me")

    assert updated.status_code == 200
    assert updated.json()["version"] == 2
    assert persisted.json()["version"] == 2
    assert persisted.json()["profile"] == {
        "name": "Paciente Atualizada",
        "email": email,
        "cpf": persisted.json()["profile"]["cpf"],
        "birthdate": "1991-05-20",
        "phone": "+5553988888888",
        "blood_type": "A+",
    }


def test_professional_updates_only_unvalidated_profile_fields() -> None:
    """Persist professional contact fields without changing validated identity."""
    registration = professional_registration_data(uuid4().hex)

    with TestClient(app, base_url="https://testserver") as client:
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
        client.post(
            "/api/v1/totp/confirmations",
            json={"code": totp.now()},
            headers=activation_headers,
        )
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
                "profile-validation-operator",
                "--decision",
                "approved",
                "--justification",
                "Synthetic profile validation completed.",
            ],
            check=False,
            capture_output=True,
            text=True,
            env=os.environ | {"PYTHONPATH": "src"},
        )
        login = client.post(
            "/api/v1/sessions",
            json={
                "email": registration["email"],
                "password": registration["password"],
                "totp_code": totp.now(),
            },
        )
        original = client.get("/api/v1/me")
        updated = client.patch(
            "/api/v1/me",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": login.headers["X-CSRF-Token"],
            },
            json={
                "expected_version": original.json()["version"],
                "phone": "+5553977777777",
                "institution": "Clínica Acadêmica Sintética",
            },
        )

    assert validation.returncode == 0
    assert updated.status_code == 200
    assert updated.json()["version"] == 2
    assert updated.json()["profile"] == {
        "name": registration["name"],
        "email": registration["email"],
        "cpf": registration["cpf"],
        "birthdate": registration["birthdate"],
        "phone": "+5553977777777",
        "crm": registration["crm"],
        "uf": registration["uf"],
        "specialty": registration["specialty"],
        "institution": "Clínica Acadêmica Sintética",
    }


def test_profile_update_rejects_immutable_identity_fields() -> None:
    """Reject identity changes instead of silently ignoring them."""
    email = f"profile-immutable.{uuid4().hex}@example.com"

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
        response = client.patch(
            "/api/v1/me",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": login.headers["X-CSRF-Token"],
            },
            json={"expected_version": 1, "cpf": "12345678901"},
        )

    assert response.status_code == 422
    assert response.json()["code"] == "profile_field_not_editable"


def test_stale_profile_version_cannot_overwrite_newer_data() -> None:
    """Reject a stale update so concurrent edits cannot be lost."""
    email = f"profile-conflict.{uuid4().hex}@example.com"

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
        first_update = client.patch(
            "/api/v1/me",
            headers=headers,
            json={"expected_version": 1, "phone": "+5553966666666"},
        )
        stale_update = client.patch(
            "/api/v1/me",
            headers=headers,
            json={"expected_version": 1, "phone": "+5553955555555"},
        )
        persisted = client.get("/api/v1/me")

    assert first_update.status_code == 200
    assert stale_update.status_code == 409
    assert persisted.json()["profile"]["phone"] == "+5553966666666"
