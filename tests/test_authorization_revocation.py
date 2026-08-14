"""Immediate authorization revocation behavior through the public HTTP API."""

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from test_authorizations import create_pending_request, grant_pending_request

from vitallink.database import AuditEvent, AuthorizationRevision, SessionFactory
from vitallink.main import app


def test_patient_revokes_access_and_the_next_professional_read_is_denied() -> None:
    """Revoke with TOTP and remove list and detail access in the existing session."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "revocation",
            "Autorização sintética que será revogada pelo paciente.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico", "exames"],
            ["consultar"],
        )
        assert granted.status_code == 200
        authorization = patient_client.get("/api/v1/authorizations").json()[0]
        patient_id = authorization["patient"]["id"]
        assert professional_client.get(f"/api/v1/patients/{patient_id}").status_code == 200

        step_up = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_revoke", "totp_code": patient_totp.now()},
        )
        revoked = patient_client.post(
            f"/api/v1/authorizations/{authorization['id']}/revocations",
            headers=patient_headers,
            json={
                "justification": "Paciente encerrou o compartilhamento sintético.",
                "step_up_confirmation_id": step_up.json()["id"],
            },
        )
        patients = professional_client.get("/api/v1/patients")
        detail = professional_client.get(f"/api/v1/patients/{patient_id}")
        repeated = patient_client.post(
            f"/api/v1/authorizations/{authorization['id']}/revocations",
            headers=patient_headers,
            json={
                "justification": "Paciente encerrou o compartilhamento sintético.",
                "step_up_confirmation_id": step_up.json()["id"],
            },
        )

    assert step_up.status_code == 201
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"
    assert patients.status_code == 200
    assert patients.json() == []
    assert detail.status_code == 404
    assert detail.json()["code"] == "patient_not_found"
    assert repeated.status_code == 200
    with SessionFactory() as session:
        revision_count = session.scalar(
            select(func.count()).select_from(AuthorizationRevision).where(
                AuthorizationRevision.authorization_id == authorization["id"]
            )
        )
        d02 = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.reason == "D02", AuditEvent.action == "patient_profile.read")
            .order_by(AuditEvent.created_at.desc())
        )
    assert revision_count == 1
    assert d02 is not None


def test_patient_reduces_scope_and_the_next_professional_read_uses_it() -> None:
    """Remove history-read while preserving the remaining active scope."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "scope-reduction",
            "Autorização sintética cujo escopo será reduzido.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico", "exames"],
            ["consultar"],
        )
        assert granted.status_code == 200
        authorization = patient_client.get("/api/v1/authorizations").json()[0]
        patient_id = authorization["patient"]["id"]

        step_up = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_reduce", "totp_code": patient_totp.now()},
        )
        reduced = patient_client.patch(
            f"/api/v1/authorizations/{authorization['id']}",
            headers=patient_headers,
            json={
                "categories": ["exames"],
                "operations": ["consultar"],
                "justification": "Paciente removeu histórico do compartilhamento sintético.",
                "step_up_confirmation_id": step_up.json()["id"],
            },
        )
        patients = professional_client.get("/api/v1/patients")
        detail = professional_client.get(f"/api/v1/patients/{patient_id}")
        second_step_up = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_reduce", "totp_code": patient_totp.now()},
        )
        expanded = patient_client.patch(
            f"/api/v1/authorizations/{authorization['id']}",
            headers=patient_headers,
            json={
                "categories": ["histórico", "exames"],
                "operations": ["consultar"],
                "justification": "Tentativa sintética de restaurar escopo removido.",
                "step_up_confirmation_id": second_step_up.json()["id"],
            },
        )

    assert step_up.status_code == 201
    assert reduced.status_code == 200
    assert reduced.json()["status"] == "active"
    assert patients.status_code == 200
    assert patients.json()[0]["categories"] == ["exames"]
    assert detail.status_code == 404
    assert expanded.status_code == 422
    assert patient_client.get("/api/v1/authorizations").json()[0]["categories"] == ["exames"]
