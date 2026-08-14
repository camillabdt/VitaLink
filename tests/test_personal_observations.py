"""Patient-owned personal observations through the public HTTP API."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from test_account_recovery import activate_patient
from test_authorizations import create_pending_request, grant_pending_request

from vitallink.database import AuditEvent, PersonalObservation, SessionFactory
from vitallink.main import app


def patient_session(client: TestClient, suffix: str) -> dict[str, str]:
    """Activate and authenticate one synthetic patient.

    Args:
        client: Browser-like HTTP client retaining cookies.
        suffix: Unique synthetic identity suffix.

    Returns:
        Same-origin CSRF headers for state-changing requests.
    """
    email = f"observation-{suffix}.{uuid4().hex}@example.com"
    totp = activate_patient(client, email)
    login = client.post(
        "/api/v1/sessions",
        json={
            "email": email,
            "password": "uma senha longa e segura 2026",
            "totp_code": totp.now(),
        },
    )
    return {
        "Origin": "https://testserver",
        "X-CSRF-Token": login.headers["X-CSRF-Token"],
    }


def test_patient_creates_and_lists_their_personal_observation() -> None:
    """Persist patient-authored text without presenting it as clinical advice."""
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "create")
        created = client.post(
            "/api/v1/personal-observations",
            headers=headers,
            json={"text": "Senti mais disposição após a caminhada sintética."},
        )
        blank = client.post(
            "/api/v1/personal-observations",
            headers=headers,
            json={"text": "   "},
        )
        listed = client.get("/api/v1/personal-observations")

    assert created.status_code == 201
    assert created.json()["author"] == "patient"
    assert created.json()["version"] == 1
    assert blank.status_code == 422
    assert listed.status_code == 200
    assert listed.json() == [created.json()]


def test_patient_correction_creates_a_version_and_rejects_a_stale_retry() -> None:
    """Preserve the original and expose only the corrected current version."""
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "correction")
        original = client.post(
            "/api/v1/personal-observations",
            headers=headers,
            json={"text": "Acordei com desconforto sintético leve."},
        ).json()
        corrected = client.patch(
            f"/api/v1/personal-observations/{original['id']}",
            headers=headers,
            json={
                "text": "Acordei sem desconforto; a informação anterior estava incorreta.",
                "expected_version": 1,
            },
        )
        stale = client.patch(
            f"/api/v1/personal-observations/{original['id']}",
            headers=headers,
            json={"text": "Tentativa sintética concorrente.", "expected_version": 1},
        )
        listed = client.get("/api/v1/personal-observations")

    assert corrected.status_code == 200
    assert corrected.json()["version"] == 2
    assert corrected.json()["author"] == "patient"
    assert stale.status_code == 409
    assert listed.json() == [corrected.json()]
    with SessionFactory() as session:
        versions = session.scalars(
            select(PersonalObservation)
            .where(PersonalObservation.id.in_([original["id"], corrected.json()["id"]]))
            .order_by(PersonalObservation.version)
        ).all()
    assert len(versions) == 2
    assert versions[0].current is False
    assert versions[1].replaces_id == versions[0].id
    assert versions[0].author_account_id == versions[1].author_account_id
    assert versions[0].created_at < versions[1].created_at


def test_personal_observation_remains_private_from_other_patients_and_authorized_professionals() -> None:
    """Deny cross-owner correction and professional access regardless of clinical scope."""
    private_text = "Observação pessoal sintética que não pode aparecer na auditoria."
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "personal-observation-privacy",
            "Acesso clínico sintético sem permissão para observações pessoais.",
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
        observation = patient_client.post(
            "/api/v1/personal-observations",
            headers=patient_headers,
            json={"text": private_text},
        ).json()
        professional_list = professional_client.get("/api/v1/personal-observations")
        outsider_headers = patient_session(outsider_client, "outsider")
        cross_correction = outsider_client.patch(
            f"/api/v1/personal-observations/{observation['id']}",
            headers=outsider_headers,
            json={"text": "Tentativa sintética de correção cruzada.", "expected_version": 1},
        )

    assert professional_list.status_code == 403
    assert cross_correction.status_code == 404
    with SessionFactory() as session:
        events = session.scalars(
            select(AuditEvent).where(
                AuditEvent.action.in_(
                    (
                        "personal_observation.created",
                        "personal_observation.listed",
                        "personal_observation.corrected",
                    )
                )
            )
        ).all()
    assert private_text not in repr([(event.reason, event.event_metadata) for event in events])
