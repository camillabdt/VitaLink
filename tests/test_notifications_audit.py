"""Private notifications and audit views through public HTTP boundaries."""

import logging
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from test_account_recovery import activate_patient
from test_authorizations import create_pending_request, grant_pending_request

from vitallink.database import AccessCode, Account, AuditEvent, Notification, Patient, SessionFactory, engine
from vitallink.main import app, audit_identifier


def patient_session(client: TestClient, prefix: str) -> tuple[dict[str, str], Account, Patient]:
    """Activate one synthetic patient and return mutation and persistence context.

    Args:
        client: HTTP client retaining cookies.
        prefix: Unique synthetic identity prefix.

    Returns:
        Same-origin headers, detached account, and detached patient.
    """
    email = f"{prefix}.{uuid4().hex}@example.com"
    totp = activate_patient(client, email)
    login = client.post(
        "/api/v1/sessions",
        json={
            "email": email,
            "password": "uma senha longa e segura 2026",
            "totp_code": totp.now(),
        },
    )
    with SessionFactory() as session:
        account = session.scalar(select(Account).where(Account.email == email))
        patient = session.scalar(select(Patient).where(Patient.account_id == account.id))
    return {
        "Origin": "https://testserver",
        "X-CSRF-Token": login.headers["X-CSRF-Token"],
    }, account, patient


def test_notifications_are_private_persisted_and_individually_read() -> None:
    """Expose minimal owned notifications and persist only the owner's read state."""
    with (
        TestClient(app, base_url="https://testserver") as owner_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        owner_headers, owner, _ = patient_session(owner_client, "notification-owner")
        outsider_headers, outsider, _ = patient_session(outsider_client, "notification-outsider")
        with SessionFactory.begin() as session:
            owned = Notification(account_id=owner.id, kind="document_available", subject_id=uuid4())
            foreign = Notification(account_id=outsider.id, kind="account_recovery_requested", subject_id=uuid4())
            session.add_all([owned, foreign])

        listed = owner_client.get("/api/v1/notifications")
        denied = outsider_client.patch(f"/api/v1/notifications/{owned.id}", headers=outsider_headers)
        read = owner_client.patch(f"/api/v1/notifications/{owned.id}", headers=owner_headers)
        reloaded = owner_client.get("/api/v1/notifications")

    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [str(owned.id)]
    assert set(listed.json()[0]) == {"id", "kind", "created_at", "read_at"}
    assert denied.status_code == 404
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    assert reloaded.json()[0]["read_at"] == read.json()["read_at"]
    with SessionFactory() as session:
        assert session.get(Notification, foreign.id).read_at is None


def test_account_recovery_notifies_only_the_account() -> None:
    """Persist a security notification without changing the generic public response."""
    with TestClient(app, base_url="https://testserver") as client:
        _, account, _ = patient_session(client, "notification-recovery")
        requested = client.post("/api/v1/password-recovery-requests", json={"email": account.email})
        notifications = client.get("/api/v1/notifications")

    assert requested.status_code == 202
    assert [item["kind"] for item in notifications.json()] == ["account_recovery_requested"]


def test_audit_view_is_minimal_and_scoped_to_the_account() -> None:
    """Return no identifiers, reasons, metadata, or another account's events."""
    with (
        TestClient(app, base_url="https://testserver") as owner_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        _, owner, patient = patient_session(owner_client, "audit-owner")
        _, outsider, _ = patient_session(outsider_client, "audit-outsider")
        with SessionFactory.begin() as session:
            own = AuditEvent(
                actor_id=None,
                action="patient_profile.read",
                target_id=None,
                result="success",
                reason="synthetic",
                correlation_id=uuid4(),
                event_metadata={"audience_id": audit_identifier(owner.id)},
            )
            foreign = AuditEvent(
                actor_id=None,
                action="document.viewed",
                target_id=None,
                result="success",
                reason="synthetic",
                correlation_id=uuid4(),
                event_metadata={"audience_id": audit_identifier(outsider.id)},
            )
            session.add_all([own, foreign])

        response = owner_client.get("/api/v1/audit-events")

    assert response.status_code == 200
    returned = next(item for item in response.json() if item["id"] == str(own.id))
    assert set(returned) == {"id", "event", "status", "created_at"}
    assert returned["event"] == "Acesso ao prontuário"
    assert str(foreign.id) not in {item["id"] for item in response.json()}
    assert str(patient.id) not in response.text


def test_operational_log_uses_the_normalized_route_not_injected_input(caplog: pytest.LogCaptureFixture) -> None:
    """Keep query control characters and values out of the minimum request log."""
    with TestClient(app, base_url="https://testserver") as client:
        patient_session(client, "audit-log-injection")
        with caplog.at_level(logging.INFO, logger="vitallink.http"):
            response = client.get("/api/v1/audit-events?limit=1%0Ainjected-value")

    assert response.status_code == 422
    operational_log = caplog.records[-1].getMessage()
    assert "injected-value" not in operational_log
    assert "\n" not in operational_log
    assert '"route":"/api/v1/audit-events"' in operational_log


def test_patient_and_professional_can_both_see_a_permitted_profile_access() -> None:
    """Publish one professional read to the professional actor and patient audience."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, _, pending = create_pending_request(
            patient_client,
            professional_client,
            "audit-shared-access",
            "Consulta sintética para testar o histórico permitido.",
        )
        grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["histórico"],
            ["consultar"],
        )
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        accessed = professional_client.get(f"/api/v1/patients/{patient_id}")
        with SessionFactory() as session:
            access_event = session.scalar(
                select(AuditEvent)
                .where(AuditEvent.action == "patient_profile.read", AuditEvent.result == "success")
                .order_by(AuditEvent.created_at.desc())
            )
        patient_view = patient_client.get("/api/v1/audit-events")
        professional_view = professional_client.get("/api/v1/audit-events")

    assert accessed.status_code == 200
    assert str(access_event.id) in {item["id"] for item in patient_view.json()}
    assert str(access_event.id) in {item["id"] for item in professional_view.json()}


def test_required_operation_rolls_back_when_audit_insert_fails() -> None:
    """Keep access-code creation atomic when PostgreSQL rejects its audit event."""
    with TestClient(app, base_url="https://testserver") as client:
        headers, _, patient = patient_session(client, "audit-atomicity")
        with SessionFactory() as session:
            before = session.scalar(select(func.count()).select_from(AccessCode).where(AccessCode.patient_id == patient.id))
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE OR REPLACE FUNCTION reject_test_audit_insert() RETURNS trigger AS $$
                    BEGIN
                        IF NEW.action = 'access_code.created' THEN
                            RAISE EXCEPTION 'synthetic audit failure';
                        END IF;
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql;
                    CREATE TRIGGER reject_test_audit_insert
                    BEFORE INSERT ON audit_events
                    FOR EACH ROW EXECUTE FUNCTION reject_test_audit_insert();
                    """
                )
            )
        try:
            with pytest.raises(DBAPIError, match="synthetic audit failure"):
                client.post("/api/v1/access-codes", headers=headers)
        finally:
            with engine.begin() as connection:
                connection.execute(text("DROP TRIGGER IF EXISTS reject_test_audit_insert ON audit_events"))
                connection.execute(text("DROP FUNCTION IF EXISTS reject_test_audit_insert"))
        with SessionFactory() as session:
            after = session.scalar(select(func.count()).select_from(AccessCode).where(AccessCode.patient_id == patient.id))

    assert after == before
