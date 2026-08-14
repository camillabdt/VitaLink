"""Professional clinical goals and manual follow-up through the public API."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from test_access_requests import activate_professional_with_totp
from test_professional_records import grant_record_access

from vitallink.database import AuditEvent, ClinicalGoal, FollowUpStatus, SessionFactory
from vitallink.main import app


def test_professional_creates_and_corrects_a_goal_with_immutable_authorship() -> None:
    """Keep each professional goal separate and preserve every corrected version."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_headers, professional_headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "clinical-goal",
            ["exames", "metas"],
            ["consultar", "anexar", "atualizar"],
        )
        patient_client.post(
            "/api/v1/clinical-results",
            headers=patient_headers,
            json={
                "exam_name": "Glicemia em jejum",
                "value": "95",
                "unit": "mg/dL",
                "measured_at": "2026-08-14",
                "origin": "Laboratório sintético",
                "reference_min": "70",
                "reference_max": "99",
                "confirmed": True,
            },
        )
        proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        created = professional_client.post(
            "/api/v1/clinical-goals",
            headers=professional_headers,
            json={
                "patient_id": patient_id,
                "exam_name": "Glicemia em jejum",
                "minimum": "80",
                "maximum": "100",
                "unit": "mg/dL",
                "justification": "Meta sintética definida para acompanhamento individual.",
                "effective_at": "2026-08-14",
                "step_up_confirmation_id": proof,
            },
        )
        correction_proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        corrected = professional_client.patch(
            f"/api/v1/clinical-goals/{created.json()['id']}",
            headers=professional_headers,
            json={
                "minimum": "75",
                "maximum": "95",
                "unit": "mg/dL",
                "justification": "Meta sintética revista pelo mesmo profissional.",
                "effective_at": "2026-08-15",
                "expected_version": 1,
                "correction_reason": "Limites ajustados após revisão clínica sintética.",
                "step_up_confirmation_id": correction_proof,
            },
        )
        stale_proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        stale = professional_client.patch(
            f"/api/v1/clinical-goals/{created.json()['id']}",
            headers=professional_headers,
            json={
                "minimum": "70",
                "maximum": "90",
                "unit": "mg/dL",
                "justification": "Tentativa sintética com uma versão já substituída.",
                "effective_at": "2026-08-16",
                "expected_version": 1,
                "correction_reason": "Tentativa concorrente sintética.",
                "step_up_confirmation_id": stale_proof,
            },
        )
        deletion = professional_client.delete(
            f"/api/v1/clinical-goals/{corrected.json()['id']}", headers=professional_headers
        )
        professional_list = professional_client.get("/api/v1/clinical-goals", params={"patient_id": patient_id})
        patient_list = patient_client.get("/api/v1/clinical-goals")

    assert created.status_code == 201
    assert corrected.status_code == 200
    assert stale.status_code == 409
    assert deletion.status_code == 405
    assert corrected.json()["version"] == 2
    assert corrected.json()["author"] == created.json()["author"]
    assert professional_list.json() == patient_list.json() == [corrected.json()]
    with SessionFactory() as session:
        versions = session.scalars(
            select(ClinicalGoal).where(ClinicalGoal.patient_id == patient_id).order_by(ClinicalGoal.version)
        ).all()
    assert len(versions) == 2
    assert versions[0].current is False
    assert versions[1].replaces_id == versions[0].id
    assert versions[1].author_account_id == versions[0].author_account_id


def test_follow_up_is_manual_justified_and_versioned_per_professional() -> None:
    """Store an explicit status without deriving it from measurements or goals."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, professional_headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "follow-up",
            ["metas"],
            ["consultar", "anexar", "atualizar"],
        )
        proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        created = professional_client.post(
            "/api/v1/follow-up-statuses",
            headers=professional_headers,
            json={
                "patient_id": patient_id,
                "status": "Em acompanhamento",
                "justification": "Estado informado manualmente após avaliação sintética.",
                "recorded_at": "2026-08-14",
                "step_up_confirmation_id": proof,
            },
        )
        correction_proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=professional_headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        corrected = professional_client.patch(
            f"/api/v1/follow-up-statuses/{created.json()['id']}",
            headers=professional_headers,
            json={
                "status": "Estável",
                "justification": "Estado manual revisto após nova avaliação sintética.",
                "recorded_at": "2026-08-15",
                "expected_version": 1,
                "correction_reason": "Revisão manual do acompanhamento.",
                "step_up_confirmation_id": correction_proof,
            },
        )
        patient_list = patient_client.get("/api/v1/follow-up-statuses")

    assert created.status_code == 201
    assert corrected.status_code == 200
    assert corrected.json()["status"] == "Estável"
    assert corrected.json()["author"] == created.json()["author"]
    assert patient_list.json() == [corrected.json()]
    with SessionFactory() as session:
        versions = session.scalars(
            select(FollowUpStatus).where(FollowUpStatus.patient_id == patient_id).order_by(FollowUpStatus.version)
        ).all()
    assert len(versions) == 2
    assert versions[1].replaces_id == versions[0].id


def test_goal_rejects_missing_exam_invalid_limits_unit_and_reused_proof() -> None:
    """Require a compatible confirmed exam, ordered limits, and a fresh TOTP proof."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_headers, headers, _, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "goal-validation",
            ["exames", "metas"],
            ["consultar", "anexar", "atualizar"],
        )
        result_payload = {
            "exam_name": "Colesterol total",
            "value": "180",
            "unit": "mg/dL",
            "measured_at": "2026-08-14",
            "origin": "Laboratório sintético",
            "reference_min": "100",
            "reference_max": "200",
            "confirmed": True,
        }
        patient_client.post("/api/v1/clinical-results", headers=patient_headers, json=result_payload)
        proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        base = {
            "patient_id": patient_id,
            "exam_name": "Colesterol total",
            "minimum": "120",
            "maximum": "190",
            "unit": "mg/dL",
            "justification": "Meta sintética individual para validar o contrato.",
            "effective_at": "2026-08-14",
            "step_up_confirmation_id": proof,
        }
        missing_exam = professional_client.post(
            "/api/v1/clinical-goals", headers=headers, json={**base, "exam_name": "Exame ausente"}
        )
        incompatible_unit = professional_client.post(
            "/api/v1/clinical-goals", headers=headers, json={**base, "unit": "mmol/L"}
        )
        inverted = professional_client.post("/api/v1/clinical-goals", headers=headers, json={**base, "minimum": "200"})
        created = professional_client.post("/api/v1/clinical-goals", headers=headers, json=base)
        reused = professional_client.post("/api/v1/clinical-goals", headers=headers, json=base)

    assert missing_exam.status_code == incompatible_unit.status_code == inverted.status_code == 422
    assert created.status_code == 201
    assert reused.status_code == 403


def test_goal_and_follow_up_deny_idor_and_revoked_scope_without_leaking_content() -> None:
    """Reevaluate metas scope for outsiders and immediately after patient revocation."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        patient_headers, headers, patient_totp, professional_totp, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "goal-revocation",
            ["metas"],
            ["consultar", "anexar", "atualizar"],
        )
        proof = professional_client.post(
            "/api/v1/step-up-confirmations",
            headers=headers,
            json={"action": "clinical_goal_write", "totp_code": professional_totp.now()},
        ).json()["id"]
        created = professional_client.post(
            "/api/v1/follow-up-statuses",
            headers=headers,
            json={
                "patient_id": patient_id,
                "status": "Estado clínico privado sintético",
                "justification": "Justificativa clínica privada usada apenas no teste.",
                "recorded_at": "2026-08-14",
                "step_up_confirmation_id": proof,
            },
        )
        outsider_headers, outsider_totp = activate_professional_with_totp(outsider_client)
        outsider_proof = outsider_client.post(
            "/api/v1/step-up-confirmations",
            headers=outsider_headers,
            json={"action": "clinical_goal_write", "totp_code": outsider_totp.now()},
        ).json()["id"]
        outsider_read = outsider_client.get("/api/v1/follow-up-statuses", params={"patient_id": patient_id})
        outsider_correction = outsider_client.patch(
            f"/api/v1/follow-up-statuses/{created.json()['id']}",
            headers=outsider_headers,
            json={
                "status": "Alteração privada indevida",
                "justification": "Tentativa privada por profissional sem autorização.",
                "recorded_at": "2026-08-15",
                "expected_version": 1,
                "correction_reason": "Tentativa de IDOR sintética.",
                "step_up_confirmation_id": outsider_proof,
            },
        )
        authorization = patient_client.get("/api/v1/authorizations").json()[0]
        revocation_proof = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_revoke", "totp_code": patient_totp.now()},
        ).json()["id"]
        revoked = patient_client.post(
            f"/api/v1/authorizations/{authorization['id']}/revocations",
            headers=patient_headers,
            json={
                "justification": "Paciente encerrou o compartilhamento sintético.",
                "step_up_confirmation_id": revocation_proof,
            },
        )
        read_after = professional_client.get("/api/v1/follow-up-statuses", params={"patient_id": patient_id})

    assert created.status_code == 201
    assert outsider_read.status_code == outsider_correction.status_code == 404
    assert revoked.status_code == 200
    assert read_after.status_code == 404
    with SessionFactory() as session:
        denials = session.scalars(
            select(AuditEvent).where(
                AuditEvent.action.in_(("follow_up_status.listed", "follow_up_status.corrected")),
                AuditEvent.result == "denied",
            )
        ).all()
    assert denials
    assert "privad" not in repr([(event.reason, event.event_metadata) for event in denials]).casefold()
