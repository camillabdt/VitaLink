"""Patient-controlled authorization behavior through the public HTTP API."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pyotp
import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from test_access_requests import activate_professional
from test_account_recovery import activate_patient

from vitallink.database import AuditEvent, Authorization, SessionFactory
from vitallink.main import app


def create_pending_request(
    patient_client: TestClient,
    professional_client: TestClient,
    suffix: str,
    justification: str,
) -> tuple[pyotp.TOTP, dict[str, str], dict[str, str], dict[str, object]]:
    """Create one pending request through patient and professional boundaries.

    Args:
        patient_client: Client retaining the patient session.
        professional_client: Client retaining the professional session.
        suffix: Unique test-data suffix.
        justification: Professional reason persisted with the request.

    Returns:
        Patient authenticator, both CSRF headers, and the pending response.
    """
    patient_email = f"authorization-{suffix}.{uuid4().hex}@example.com"
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
    professional_headers = activate_professional(professional_client)
    pending = professional_client.post(
        "/api/v1/access-requests",
        headers=professional_headers,
        json={"code": code, "justification": justification},
    )
    assert pending.status_code == 201
    return patient_totp, patient_headers, professional_headers, pending.json()


def grant_pending_request(
    patient_client: TestClient,
    patient_totp: pyotp.TOTP,
    patient_headers: dict[str, str],
    pending_id: object,
    categories: list[str],
    operations: list[str],
    duration_days: int = 30,
) -> Response:
    """Grant a pending request through the TOTP-protected public boundary.

    Args:
        patient_client: Client retaining the target patient's session.
        patient_totp: Authenticator enrolled by the patient.
        patient_headers: Same-origin CSRF headers.
        pending_id: Opaque identifier returned by request creation.
        categories: Explicit data categories granted by the patient.
        operations: Explicit operations granted by the patient.
        duration_days: Authorization term from one to 90 days.

    Returns:
        The decision HTTP response.
    """
    step_up = patient_client.post(
        "/api/v1/step-up-confirmations",
        headers=patient_headers,
        json={"action": "authorization_grant", "totp_code": patient_totp.now()},
    )
    assert step_up.status_code == 201
    return patient_client.post(
        f"/api/v1/access-requests/{pending_id}/decisions",
        headers=patient_headers,
        json={
            "decision": "granted",
            "categories": categories,
            "operations": operations,
            "duration_days": duration_days,
            "step_up_confirmation_id": step_up.json()["id"],
        },
    )


def test_patient_lists_only_their_pending_access_requests() -> None:
    """Show the target patient the professional, justification, and pending state."""
    justification = "Acompanhamento clínico sintético solicitado pelo paciente."

    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, _, _, created = create_pending_request(
            patient_client,
            professional_client,
            "listing",
            justification,
        )
        listed = patient_client.get("/api/v1/access-requests")

    assert listed.status_code == 200
    assert listed.json() == [
        {
            "id": created["id"],
            "status": "pending",
            "created_at": listed.json()[0]["created_at"],
            "justification": justification,
            "professional": {
                "name": "Profissional Sintética",
                "specialty": "Cardiologia",
                "institution": "Hospital Acadêmico Sintético",
            },
        }
    ]


def test_target_patient_rejects_a_pending_access_request() -> None:
    """Reject a pending request without creating professional access."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "rejection",
            "Solicitação sintética que o paciente recusará.",
        )
        rejected = patient_client.post(
            f"/api/v1/access-requests/{pending['id']}/decisions",
            headers=patient_headers,
            json={"decision": "rejected"},
        )
        listed = patient_client.get("/api/v1/access-requests")

    assert rejected.status_code == 200
    assert rejected.json() == {"id": pending["id"], "status": "rejected"}
    assert listed.json()[0]["status"] == "rejected"


def test_patient_grants_scoped_temporary_access_after_totp() -> None:
    """Grant explicit scope and expose the patient only to that professional."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "grant",
            "Acompanhamento clínico sintético autorizado pelo paciente.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico", "exames"],
            ["consultar"],
        )
        patients = professional_client.get("/api/v1/patients")
        authorizations = patient_client.get("/api/v1/authorizations")

    assert granted.status_code == 200
    assert granted.json()["status"] == "granted"
    assert authorizations.status_code == 200
    assert authorizations.json()[0]["professional"]["name"] == "Profissional Sintética"
    assert authorizations.json()[0]["categories"] == ["exames", "histórico"]
    assert patients.status_code == 200
    assert patients.json() == [
        {
            "id": patients.json()[0]["id"],
            "name": "Paciente Sintética",
            "categories": ["exames", "histórico"],
            "operations": ["consultar"],
            "expires_at": patients.json()[0]["expires_at"],
        }
    ]
    with SessionFactory() as session:
        grant_event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.action == "authorization.granted", AuditEvent.result == "success")
            .order_by(AuditEvent.created_at.desc())
        )
    assert grant_event is not None
    assert grant_event.event_metadata == {
        "role": "patient",
        "category_count": 2,
        "operation_count": 1,
        "duration_days": 30,
    }


def test_patient_detail_hides_unknown_and_cross_access_identifiers() -> None:
    """Return the same denial for an unknown patient and a cross-access attempt."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "detail",
            "Consulta sintética do perfil autorizado pelo paciente.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico"],
            ["consultar"],
        )
        assert granted.status_code == 200
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        detail = professional_client.get(f"/api/v1/patients/{patient_id}")

        activate_professional(outsider_client)
        cross_access = outsider_client.get(f"/api/v1/patients/{patient_id}")
        unknown = outsider_client.get(f"/api/v1/patients/{uuid4()}")

    assert detail.status_code == 200
    assert detail.json()["id"] == patient_id
    assert detail.json()["phone"] == "+5553999999999"
    assert cross_access.status_code == unknown.status_code == 404
    assert {(response.json()["code"], response.json()["message"]) for response in (cross_access, unknown)} == {
        ("patient_not_found", "Paciente não encontrado.")
    }


@pytest.mark.parametrize(
    ("categories", "operations"),
    [(["exames"], ["consultar"]), (["histórico"], ["anexar"])],
)
def test_patient_detail_denies_the_wrong_category_or_operation(
    categories: list[str],
    operations: list[str],
) -> None:
    """Require both the normative category and operation for patient detail."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            f"wrong-scope-{categories[0]}-{operations[0]}",
            "Escopo sintético insuficiente para consultar o perfil.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            categories,
            operations,
        )
        assert granted.status_code == 200
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        denied = professional_client.get(f"/api/v1/patients/{patient_id}")

    assert denied.status_code == 404
    assert denied.json()["code"] == "patient_not_found"


def test_expired_authorization_disappears_without_ending_the_session() -> None:
    """Reevaluate the term on every list and detail request."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "expiration",
            "Autorização sintética com prazo mínimo de um dia.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico"],
            ["consultar"],
            duration_days=1,
        )
        assert granted.status_code == 200
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        with SessionFactory.begin() as session:
            authorization = session.scalar(select(Authorization).where(Authorization.patient_id == patient_id))
            assert authorization is not None
            authorization.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        patients = professional_client.get("/api/v1/patients")
        detail = professional_client.get(f"/api/v1/patients/{patient_id}")
        listed_authorization = patient_client.get("/api/v1/authorizations")

    assert patients.status_code == 200
    assert patients.json() == []
    assert detail.status_code == 404
    assert listed_authorization.json()[0]["status"] == "expired"
    with SessionFactory() as session:
        d02 = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.reason == "D02", AuditEvent.action == "patient_profile.read")
            .order_by(AuditEvent.created_at.desc())
        )
    assert d02 is not None


def test_grant_requires_valid_term_scope_and_totp() -> None:
    """Reject incomplete scope, terms outside 1-90 days, and missing step-up."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        _, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "invalid-grant",
            "Solicitação sintética usada para validar limites da concessão.",
        )
        endpoint = f"/api/v1/access-requests/{pending['id']}/decisions"
        invalid_responses = [
            patient_client.post(
                endpoint,
                headers=patient_headers,
                json={
                    "decision": "granted",
                    "categories": categories,
                    "operations": ["consultar"],
                    "duration_days": duration_days,
                },
            )
            for categories, duration_days in (([], 30), (["histórico"], 0), (["histórico"], 91))
        ]
        missing_totp = patient_client.post(
            endpoint,
            headers=patient_headers,
            json={
                "decision": "granted",
                "categories": ["histórico"],
                "operations": ["consultar"],
                "duration_days": 30,
            },
        )
        listed = patient_client.get("/api/v1/access-requests")

    assert {response.status_code for response in invalid_responses} == {422}
    assert missing_totp.status_code == 403
    assert missing_totp.json()["code"] == "action_confirmation_required"
    assert listed.json()[0]["status"] == "pending"


def test_another_patient_cannot_decide_a_known_request_identifier() -> None:
    """Deny a patient-ID swap with the same response as an unknown request."""
    with (
        TestClient(app, base_url="https://testserver") as owner_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as attacker_client,
    ):
        _, _, _, pending = create_pending_request(
            owner_client,
            professional_client,
            "decision-owner",
            "Solicitação sintética pertencente a outro paciente.",
        )
        attacker_email = f"authorization-attacker.{uuid4().hex}@example.com"
        attacker_totp = activate_patient(attacker_client, attacker_email)
        attacker_login = attacker_client.post(
            "/api/v1/sessions",
            json={
                "email": attacker_email,
                "password": "uma senha longa e segura 2026",
                "totp_code": attacker_totp.now(),
            },
        )
        attacker_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": attacker_login.headers["X-CSRF-Token"],
        }
        known = attacker_client.post(
            f"/api/v1/access-requests/{pending['id']}/decisions",
            headers=attacker_headers,
            json={"decision": "rejected"},
        )
        unknown = attacker_client.post(
            f"/api/v1/access-requests/{uuid4()}/decisions",
            headers=attacker_headers,
            json={"decision": "rejected"},
        )

    assert known.status_code == unknown.status_code == 404
    assert {(response.json()["code"], response.json()["message"]) for response in (known, unknown)} == {
        ("access_request_not_found", "Solicitação não encontrada.")
    }
