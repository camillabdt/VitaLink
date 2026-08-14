"""Confirmed structured clinical results through the public HTTP API."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from test_authorizations import create_pending_request, grant_pending_request
from test_personal_observations import patient_session

from vitallink.database import AuditEvent, ClinicalResult, SessionFactory
from vitallink.main import app


def test_patient_creates_and_lists_a_confirmed_result() -> None:
    """Persist essential fields and derive only the laboratory-range position."""
    payload = {
        "exam_name": "Glicemia em jejum",
        "value": "95",
        "unit": "mg/dL",
        "measured_at": "2026-08-10",
        "origin": "Laboratório sintético",
        "reference_min": "70",
        "reference_max": "99",
        "confirmed": True,
    }
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "clinical-result-create")
        created = client.post("/api/v1/clinical-results", headers=headers, json=payload)
        listed = client.get("/api/v1/clinical-results")

    assert created.status_code == 201
    assert created.json() == {
        "id": created.json()["id"],
        **payload,
        "value": 95.0,
        "reference_min": 70.0,
        "reference_max": 99.0,
        "range_position": "within",
        "author": "patient",
        "version": 1,
        "created_at": created.json()["created_at"],
    }
    assert listed.status_code == 200
    assert listed.json() == [created.json()]


def test_result_requires_confirmation_valid_numbers_and_an_ordered_reference() -> None:
    """Reject drafts, non-finite values, missing provenance, and inverted intervals."""
    valid = {
        "exam_name": "Hemoglobina",
        "value": "13.5",
        "unit": "g/dL",
        "measured_at": "2026-08-10",
        "origin": "Laboratório sintético",
        "reference_min": "12",
        "reference_max": "16",
        "confirmed": True,
    }
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "clinical-result-validation")
        responses = [
            client.post("/api/v1/clinical-results", headers=headers, json={**valid, **change})
            for change in (
                {"confirmed": False},
                {"value": "NaN"},
                {"origin": "   "},
                {"reference_min": "17", "reference_max": "16"},
            )
        ]

    assert {response.status_code for response in responses} == {422}


def test_result_correction_creates_a_version_and_preserves_provenance() -> None:
    """Replace a current result while retaining origin, original author, and history."""
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "clinical-result-correction")
        original = client.post(
            "/api/v1/clinical-results",
            headers=headers,
            json={
                "exam_name": "Vitamina D",
                "value": "18",
                "unit": "ng/mL",
                "measured_at": "2026-08-10",
                "origin": "Laudo sintético confirmado manualmente",
                "reference_min": "20",
                "reference_max": "60",
                "confirmed": True,
            },
        ).json()
        corrected = client.patch(
            f"/api/v1/clinical-results/{original['id']}",
            headers=headers,
            json={
                "exam_name": "Vitamina D",
                "value": "28",
                "unit": "ng/mL",
                "measured_at": "2026-08-10",
                "reference_min": "20",
                "reference_max": "60",
                "confirmed": True,
                "expected_version": 1,
                "correction_reason": "Valor digitado incorretamente no registro sintético.",
            },
        )
        stale = client.patch(
            f"/api/v1/clinical-results/{original['id']}",
            headers=headers,
            json={
                "exam_name": "Vitamina D",
                "value": "30",
                "unit": "ng/mL",
                "measured_at": "2026-08-10",
                "reference_min": "20",
                "reference_max": "60",
                "confirmed": True,
                "expected_version": 1,
                "correction_reason": "Tentativa sintética obsoleta.",
            },
        )
        listed = client.get("/api/v1/clinical-results")

    assert corrected.status_code == 200
    assert corrected.json()["version"] == 2
    assert corrected.json()["range_position"] == "within"
    assert corrected.json()["origin"] == original["origin"]
    assert corrected.json()["author"] == original["author"] == "patient"
    assert stale.status_code == 409
    assert listed.json() == [corrected.json()]
    with SessionFactory() as session:
        versions = session.scalars(
            select(ClinicalResult)
            .where(ClinicalResult.id.in_([original["id"], corrected.json()["id"]]))
            .order_by(ClinicalResult.version)
        ).all()
    assert len(versions) == 2
    assert versions[0].current is False
    assert versions[1].replaces_id == versions[0].id
    assert versions[1].author_account_id == versions[0].author_account_id


def test_professional_scope_and_neutral_positions_are_reevaluated() -> None:
    """Allow scoped professional writes and expose only neutral interval comparisons."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, professional_headers, pending = create_pending_request(
            patient_client,
            professional_client,
            "clinical-result-professional",
            "Registro sintético de resultados estruturados confirmados.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["exames"],
            ["consultar", "anexar", "atualizar"],
        )
        assert granted.status_code == 200
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        positions = []
        for value in ("60", "80", "110"):
            response = professional_client.post(
                "/api/v1/clinical-results",
                headers=professional_headers,
                json={
                    "patient_id": patient_id,
                    "exam_name": "Glicemia em jejum",
                    "value": value,
                    "unit": "mg/dL",
                    "measured_at": "2026-08-11",
                    "origin": "Laboratório sintético profissional",
                    "reference_min": "70",
                    "reference_max": "99",
                    "confirmed": True,
                },
            )
            assert response.status_code == 201
            positions.append(response.json()["range_position"])
        listed = professional_client.get("/api/v1/clinical-results", params={"patient_id": patient_id})

    assert positions == ["below", "within", "above"]
    assert listed.status_code == 200
    assert len(listed.json()) == 3
    assert all("diagnosis" not in result and "priority" not in result for result in listed.json())
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.action == "clinical_result.created", AuditEvent.result == "success")
            .order_by(AuditEvent.created_at.desc())
        )
    assert event is not None
    assert "Glicemia" not in repr((event.reason, event.event_metadata))
