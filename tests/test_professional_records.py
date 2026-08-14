"""Versioned professional records through the public HTTP API."""

from uuid import uuid4

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_access_requests import activate_professional_with_totp
from test_account_recovery import activate_patient
from test_authorizations import grant_pending_request

from vitallink.database import AuditEvent, ProfessionalRecord, SessionFactory
from vitallink.main import app


def grant_record_access(
    patient_client: TestClient,
    professional_client: TestClient,
    suffix: str,
    categories: list[str],
    operations: list[str],
) -> tuple[dict[str, str], dict[str, str], pyotp.TOTP, pyotp.TOTP, str]:
    """Grant scoped access while retaining both synthetic authenticators.

    Args:
        patient_client: Client retaining the patient session.
        professional_client: Client retaining the professional session.
        suffix: Unique synthetic account suffix.
        categories: Authorization categories granted by the patient.
        operations: Authorization operations granted by the patient.

    Returns:
        Both CSRF headers, both authenticators, and the target patient ID.
    """
    patient_email = f"professional-record.{suffix}.{uuid4().hex}@example.com"
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
    professional_headers, professional_totp = activate_professional_with_totp(professional_client)
    pending = professional_client.post(
        "/api/v1/access-requests",
        headers=professional_headers,
        json={"code": code, "justification": "Registro sintético profissional autorizado."},
    )
    granted = grant_pending_request(
        patient_client,
        patient_totp,
        patient_headers,
        pending.json()["id"],
        categories,
        operations,
    )
    assert granted.status_code == 200
    patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
    return patient_headers, professional_headers, patient_totp, professional_totp, patient_id


def test_professional_creates_a_consultation_after_totp() -> None:
    """Persist a consultation as a clinical record, never as an appointment."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_headers, professional_headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "consultation",
            ["consultas"],
            ["consultar", "anexar", "atualizar"],
        )
        confirmation = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_record_create", "totp_code": professional_totp.now()},
        )
        assert confirmation.status_code == 201
        created = professional_client.post(
            "/api/v1/professional-records",
            headers=professional_headers,
            json={
                "patient_id": patient_id,
                "kind": "consultation",
                "occurred_at": "2026-08-14T10:00:00Z",
                "content": "Consulta sintética para acompanhamento longitudinal.",
                "justification": "Registro solicitado pelo paciente para continuidade do cuidado.",
                "step_up_confirmation_id": confirmation.json()["id"],
            },
        )
        professional_listed = professional_client.get(
            "/api/v1/professional-records",
            params={"patient_id": patient_id},
        )
        patient_listed = patient_client.get("/api/v1/professional-records")
        corrected = professional_client.patch(
            f"/api/v1/professional-records/{created.json()['id']}",
            headers=professional_headers,
            json={
                "occurred_at": "2026-08-14T10:00:00Z",
                "content": "Consulta sintética corrigida para acompanhamento longitudinal.",
                "justification": "Registro solicitado pelo paciente para continuidade do cuidado.",
                "expected_version": 1,
                "correction_reason": "Resumo sintético digitado de forma incompleta.",
            },
        )
        assert corrected.status_code == 200
        stale = professional_client.patch(
            f"/api/v1/professional-records/{created.json()['id']}",
            headers=professional_headers,
            json={
                "occurred_at": "2026-08-14T10:00:00Z",
                "content": "Tentativa sintética sobre versão substituída.",
                "justification": "Tentativa sintética para validar conflito de versão.",
                "expected_version": 1,
                "correction_reason": "Tentativa sintética sobre versão anterior.",
            },
        )
        patient_correction = patient_client.patch(
            f"/api/v1/professional-records/{corrected.json()['id']}",
            headers=patient_headers,
            json={
                "occurred_at": "2026-08-14T10:00:00Z",
                "content": "Paciente não pode alterar o registro profissional.",
                "justification": "Tentativa sintética que deve ser negada pelo servidor.",
                "expected_version": 2,
                "correction_reason": "Tentativa sintética do paciente.",
            },
        )
        listed_after_correction = patient_client.get("/api/v1/professional-records")

    assert created.status_code == 201
    assert created.json() == {
        "id": created.json()["id"],
        "kind": "consultation",
        "occurred_at": "2026-08-14T10:00:00Z",
        "content": "Consulta sintética para acompanhamento longitudinal.",
        "justification": "Registro solicitado pelo paciente para continuidade do cuidado.",
        "origin": "professional_entry",
        "author": {"name": "Profissional Sintética", "specialty": "Cardiologia"},
        "version": 1,
        "created_at": created.json()["created_at"],
    }
    assert "appointment" not in created.json()
    assert professional_listed.status_code == patient_listed.status_code == 200
    assert professional_listed.json() == patient_listed.json() == [created.json()]
    assert corrected.json()["version"] == 2
    assert corrected.json()["origin"] == created.json()["origin"]
    assert corrected.json()["author"] == created.json()["author"]
    assert stale.status_code == 409
    assert patient_correction.status_code == 404
    assert listed_after_correction.json() == [corrected.json()]
    with SessionFactory() as session:
        versions = session.scalars(
            select(ProfessionalRecord)
            .where(ProfessionalRecord.id.in_([created.json()["id"], corrected.json()["id"]]))
            .order_by(ProfessionalRecord.version)
        ).all()
    assert len(versions) == 2
    assert versions[0].current is False
    assert versions[1].replaces_id == versions[0].id


def test_creation_requires_a_fresh_single_use_confirmation() -> None:
    """Deny a missing proof and reject reuse after one successful note."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "single-use",
            ["consultas"],
            ["anexar"],
        )
        payload = {
            "patient_id": patient_id,
            "kind": "note",
            "occurred_at": "2026-08-14T11:00:00Z",
            "content": "Anotação profissional sintética confirmada.",
            "justification": "Registro necessário para continuidade do acompanhamento.",
            "step_up_confirmation_id": str(uuid4()),
        }
        invalid = [
            professional_client.post(
                "/api/v1/professional-records",
                headers=headers,
                json={**payload, **change},
            )
            for change in (
                {"kind": "prescription"},
                {"occurred_at": "2026-08-14T11:00:00"},
                {"content": "   "},
                {"justification": "curta"},
            )
        ]
        missing = professional_client.post("/api/v1/professional-records", headers=headers, json=payload)
        confirmation = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=headers,
            json={"action": "clinical_record_create", "totp_code": professional_totp.now()},
        )
        payload["step_up_confirmation_id"] = confirmation.json()["id"]
        created = professional_client.post("/api/v1/professional-records", headers=headers, json=payload)
        reused = professional_client.post("/api/v1/professional-records", headers=headers, json=payload)

    assert {response.status_code for response in invalid} == {422}
    assert missing.status_code == reused.status_code == 403
    assert created.status_code == 201
    with SessionFactory() as session:
        denied = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.action == "professional_record.created", AuditEvent.result == "denied")
            .order_by(AuditEvent.created_at.desc())
        )
    assert denied is not None
    assert "Anotação" not in repr((denied.reason, denied.event_metadata))


def test_recommendation_requires_its_own_category_and_has_no_diagnosis() -> None:
    """Keep recommendations non-prescriptive and separate from consultation scope."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "recommendation",
            ["recomendações"],
            ["consultar", "anexar"],
        )
        confirmation = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=headers,
            json={"action": "clinical_record_create", "totp_code": professional_totp.now()},
        )
        denied_consultation = professional_client.post(
            "/api/v1/professional-records",
            headers=headers,
            json={
                "patient_id": patient_id,
                "kind": "consultation",
                "occurred_at": "2026-08-14T12:00:00Z",
                "content": "Consulta fora do escopo concedido.",
                "justification": "Tentativa sintética para validar a separação de categoria.",
                "step_up_confirmation_id": confirmation.json()["id"],
            },
        )
        created = professional_client.post(
            "/api/v1/professional-records",
            headers=headers,
            json={
                "patient_id": patient_id,
                "kind": "recommendation",
                "occurred_at": "2026-08-14T12:00:00Z",
                "content": "Manter hidratação e registrar dúvidas para a próxima consulta.",
                "justification": "Orientação geral sintética para continuidade do acompanhamento.",
                "step_up_confirmation_id": confirmation.json()["id"],
            },
        )

    assert denied_consultation.status_code == 404
    assert created.status_code == 201
    assert created.json()["kind"] == "recommendation"
    assert "diagnosis" not in created.json()
    assert "prescription" not in created.json()


def test_idor_and_revocation_deny_the_next_record_access() -> None:
    """Deny an outsider and immediately enforce patient revocation."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        patient_headers, headers, patient_totp, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "revocation",
            ["consultas"],
            ["consultar", "anexar", "atualizar"],
        )
        confirmation = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=headers,
            json={"action": "clinical_record_create", "totp_code": professional_totp.now()},
        )
        created = professional_client.post(
            "/api/v1/professional-records",
            headers=headers,
            json={
                "patient_id": patient_id,
                "kind": "consultation",
                "occurred_at": "2026-08-14T13:00:00Z",
                "content": "Consulta sintética que perderá autorização.",
                "justification": "Registro usado somente para validar revogação imediata.",
                "step_up_confirmation_id": confirmation.json()["id"],
            },
        )
        outsider_headers, _ = activate_professional_with_totp(outsider_client)
        outsider_read = outsider_client.get(
            "/api/v1/professional-records",
            params={"patient_id": patient_id},
        )
        outsider_correction = outsider_client.patch(
            f"/api/v1/professional-records/{created.json()['id']}",
            headers=outsider_headers,
            json={
                "occurred_at": "2026-08-14T13:00:00Z",
                "content": "Alteração sintética por profissional sem acesso.",
                "justification": "Tentativa sintética para validar a proteção contra IDOR.",
                "expected_version": 1,
                "correction_reason": "Tentativa sintética não autorizada.",
            },
        )
        authorization = patient_client.get("/api/v1/authorizations").json()[0]
        revocation_confirmation = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_revoke", "totp_code": patient_totp.now()},
        )
        revoked = patient_client.post(
            f"/api/v1/authorizations/{authorization['id']}/revocations",
            headers=patient_headers,
            json={
                "justification": "Paciente encerrou o compartilhamento sintético.",
                "step_up_confirmation_id": revocation_confirmation.json()["id"],
            },
        )
        owner_read_after = professional_client.get(
            "/api/v1/professional-records",
            params={"patient_id": patient_id},
        )
        owner_correction_after = professional_client.patch(
            f"/api/v1/professional-records/{created.json()['id']}",
            headers=headers,
            json={
                "occurred_at": "2026-08-14T13:00:00Z",
                "content": "Alteração sintética após revogação.",
                "justification": "Tentativa sintética para validar a revogação imediata.",
                "expected_version": 1,
                "correction_reason": "Tentativa sintética após revogação.",
            },
        )

    assert created.status_code == 201
    assert outsider_read.status_code == outsider_correction.status_code == 404
    assert revoked.status_code == 200
    assert owner_read_after.status_code == owner_correction_after.status_code == 404
    with SessionFactory() as session:
        denial = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.action == "professional_record.corrected", AuditEvent.result == "denied")
            .order_by(AuditEvent.created_at.desc())
        )
    assert denial is not None
    assert "Alteração" not in repr((denial.reason, denial.event_metadata))
