"""Immutable professional messaging through the public HTTP API."""

from uuid import uuid4

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_access_requests import activate_professional_with_totp
from test_account_recovery import activate_patient
from test_authorizations import grant_pending_request

from vitallink.database import AuditEvent, ClinicalMessage, SessionFactory
from vitallink.main import app


def patient_session(client: TestClient, suffix: str) -> tuple[dict[str, str], pyotp.TOTP]:
    """Activate and authenticate one synthetic patient.

    Args:
        client: Patient HTTP client.
        suffix: Unique test label.

    Returns:
        Same-origin mutation headers and the patient's authenticator.
    """
    email = f"clinical-message.{suffix}.{uuid4().hex}@example.com"
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
    }, totp


def authorize_professional(
    patient_client: TestClient,
    patient_headers: dict[str, str],
    patient_totp: pyotp.TOTP,
    professional_client: TestClient,
    categories: list[str] | None = None,
    operations: list[str] | None = None,
) -> tuple[dict[str, str], pyotp.TOTP, str, str]:
    """Authorize one professional for every messaging operation.

    Args:
        patient_client: Client retaining the patient session.
        patient_headers: Patient same-origin mutation headers.
        patient_totp: Patient authenticator for the grant.
        professional_client: Client to activate and authorize.
        categories: Optional authorization categories; defaults to messages.
        operations: Optional authorization operations; defaults to all.

    Returns:
        Professional headers, authenticator, patient ID, and professional ID.
    """
    code = patient_client.post("/api/v1/access-codes", headers=patient_headers).json()["code"]
    headers, totp = activate_professional_with_totp(professional_client)
    pending = professional_client.post(
        "/api/v1/access-requests",
        headers=headers,
        json={"code": code, "justification": "Troca sintética de mensagens clínicas autorizada."},
    )
    granted = grant_pending_request(
        patient_client,
        patient_totp,
        patient_headers,
        pending.json()["id"],
        categories or ["mensagens"],
        operations or ["consultar", "anexar", "atualizar"],
    )
    assert granted.status_code == 200
    patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
    professional_id = professional_client.get("/api/v1/authorizations").json()[0]["professional"]["id"]
    return headers, totp, patient_id, professional_id


def test_eligible_professionals_exchange_and_correct_an_immutable_message() -> None:
    """Create a linked correction while retaining the original message bytes."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as sender_client,
        TestClient(app, base_url="https://testserver") as recipient_client,
    ):
        patient_headers, patient_totp = patient_session(patient_client, "exchange")
        sender_headers, sender_totp, patient_id, sender_id = authorize_professional(
            patient_client, patient_headers, patient_totp, sender_client
        )
        _, _, _, recipient_id = authorize_professional(
            patient_client, patient_headers, patient_totp, recipient_client
        )
        team = sender_client.get(
            "/api/v1/clinical-message-recipients", params={"patient_id": patient_id}
        )
        proof = sender_client.post(
            "/api/v1/step-up-confirmations",
            headers=sender_headers,
            json={"action": "clinical_message_write", "totp_code": sender_totp.now()},
        ).json()["id"]
        created = sender_client.post(
            "/api/v1/clinical-messages",
            headers=sender_headers,
            json={
                "patient_id": patient_id,
                "recipient_professional_id": recipient_id,
                "content": "Mensagem clínica sintética para @Profissional elegível.",
                "mention_professional_ids": [recipient_id],
                "step_up_confirmation_id": proof,
            },
        )
        conversation = recipient_client.get(
            "/api/v1/clinical-messages",
            params={"patient_id": patient_id, "peer_professional_id": sender_id},
        )
        correction_proof = sender_client.post(
            "/api/v1/step-up-confirmations",
            headers=sender_headers,
            json={"action": "clinical_message_write", "totp_code": sender_totp.now()},
        ).json()["id"]
        corrected = sender_client.post(
            f"/api/v1/clinical-messages/{created.json()['id']}/corrections",
            headers=sender_headers,
            json={
                "content": "Mensagem clínica sintética corrigida.",
                "mention_professional_ids": [],
                "correction_reason": "Texto sintético original estava incompleto.",
                "step_up_confirmation_id": correction_proof,
            },
        )

    assert team.status_code == 200
    assert [member["id"] for member in team.json()] == [recipient_id]
    assert created.status_code == 201
    assert conversation.status_code == 200
    assert conversation.json() == [created.json()]
    assert corrected.status_code == 201
    assert corrected.json()["corrects_id"] == created.json()["id"]
    assert corrected.json()["sender"]["id"] == sender_id
    with SessionFactory() as session:
        messages = session.scalars(
            select(ClinicalMessage)
            .where(ClinicalMessage.patient_id == patient_id)
            .order_by(ClinicalMessage.created_at)
        ).all()
    assert [message.content for message in messages] == [
        "Mensagem clínica sintética para @Profissional elegível.",
        "Mensagem clínica sintética corrigida.",
    ]
    assert messages[1].corrects_id == messages[0].id


def test_other_scope_mentions_idor_and_revocation_never_reveal_or_delete_messages() -> None:
    """Deny non-team actors and immediately enforce either party's revocation."""
    private_text = "Conteúdo clínico privado sintético que nunca entra na auditoria."
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as sender_client,
        TestClient(app, base_url="https://testserver") as recipient_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        patient_headers, patient_totp = patient_session(patient_client, "abuse")
        sender_headers, sender_totp, patient_id, sender_id = authorize_professional(
            patient_client, patient_headers, patient_totp, sender_client
        )
        recipient_headers, recipient_totp, _, recipient_id = authorize_professional(
            patient_client, patient_headers, patient_totp, recipient_client
        )
        _, _, _, outsider_id = authorize_professional(
            patient_client,
            patient_headers,
            patient_totp,
            outsider_client,
            ["consultas"],
            ["consultar", "anexar", "atualizar"],
        )
        proof = sender_client.post(
            "/api/v1/step-up-confirmations",
            headers=sender_headers,
            json={"action": "clinical_message_write", "totp_code": sender_totp.now()},
        ).json()["id"]
        created = sender_client.post(
            "/api/v1/clinical-messages",
            headers=sender_headers,
            json={
                "patient_id": patient_id,
                "recipient_professional_id": recipient_id,
                "content": private_text,
                "mention_professional_ids": [],
                "step_up_confirmation_id": proof,
            },
        )
        outsider_team = outsider_client.get(
            "/api/v1/clinical-message-recipients", params={"patient_id": patient_id}
        )
        outsider_read = outsider_client.get(
            "/api/v1/clinical-messages",
            params={"patient_id": patient_id, "peer_professional_id": sender_id},
        )
        mention_proof = sender_client.post(
            "/api/v1/step-up-confirmations",
            headers=sender_headers,
            json={"action": "clinical_message_write", "totp_code": sender_totp.now()},
        ).json()["id"]
        outsider_mention = sender_client.post(
            "/api/v1/clinical-messages",
            headers=sender_headers,
            json={
                "patient_id": patient_id,
                "recipient_professional_id": recipient_id,
                "content": "Tentativa sintética de mencionar profissional inelegível.",
                "mention_professional_ids": [outsider_id],
                "step_up_confirmation_id": mention_proof,
            },
        )
        recipient_proof = recipient_client.post(
            "/api/v1/step-up-confirmations",
            headers=recipient_headers,
            json={"action": "clinical_message_write", "totp_code": recipient_totp.now()},
        ).json()["id"]
        recipient_correction = recipient_client.post(
            f"/api/v1/clinical-messages/{created.json()['id']}/corrections",
            headers=recipient_headers,
            json={
                "content": "Destinatário não pode substituir autoria sintética.",
                "mention_professional_ids": [],
                "correction_reason": "Tentativa sintética indevida.",
                "step_up_confirmation_id": recipient_proof,
            },
        )
        authorization = next(
            item
            for item in patient_client.get("/api/v1/authorizations").json()
            if item["professional"]["id"] == recipient_id
        )
        revoke_proof = patient_client.post(
            "/api/v1/step-up-confirmations",
            headers=patient_headers,
            json={"action": "authorization_revoke", "totp_code": patient_totp.now()},
        ).json()["id"]
        revoked = patient_client.post(
            f"/api/v1/authorizations/{authorization['id']}/revocations",
            headers=patient_headers,
            json={
                "justification": "Paciente encerrou mensagens sintéticas com o destinatário.",
                "step_up_confirmation_id": revoke_proof,
            },
        )
        team_after = sender_client.get(
            "/api/v1/clinical-message-recipients", params={"patient_id": patient_id}
        )
        read_after = sender_client.get(
            "/api/v1/clinical-messages",
            params={"patient_id": patient_id, "peer_professional_id": recipient_id},
        )

    assert created.status_code == 201
    assert outsider_team.status_code == outsider_read.status_code == 404
    assert outsider_mention.status_code == recipient_correction.status_code == 404
    assert revoked.status_code == 200
    assert team_after.json() == []
    assert read_after.status_code == 404
    with SessionFactory() as session:
        retained = session.scalar(select(ClinicalMessage).where(ClinicalMessage.id == created.json()["id"]))
        denials = session.scalars(
            select(AuditEvent).where(
                AuditEvent.action.like("clinical_message%"),
                AuditEvent.result == "denied",
            )
        ).all()
    assert retained is not None and retained.content == private_text
    assert private_text not in repr([(event.reason, event.event_metadata) for event in denials])
