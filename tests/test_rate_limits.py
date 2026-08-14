"""Account-and-origin API rate limiting through the public boundary."""

from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from test_notifications_audit import patient_session

from vitallink.database import AuditEvent, LoginThrottle, SessionFactory
from vitallink.main import app, audit_identifier, keyed_digest, settings


def test_authenticated_api_limit_isolated_by_account_and_emits_d03() -> None:
    """Limit one account-origin pair without blocking another account or leaking input."""
    original_limit = settings.api_rate_limit_requests
    original_window = settings.api_rate_limit_window_seconds
    settings.api_rate_limit_requests = 2
    settings.api_rate_limit_window_seconds = 60
    target_ids: list[str] = []
    try:
        with (
            TestClient(app, base_url="https://testserver") as limited_client,
            TestClient(app, base_url="https://testserver") as other_client,
            TestClient(app, base_url="https://testserver", client=("198.51.100.10", 50000)) as other_origin_client,
        ):
            _, limited_account, _ = patient_session(limited_client, "api-limit")
            _, other_account, _ = patient_session(other_client, "api-limit-other")
            target_ids = [
                keyed_digest(f"api:{limited_account.id}"),
                keyed_digest(f"api:{other_account.id}"),
            ]
            first = limited_client.get("/api/v1/me")
            second = limited_client.get("/api/v1/me")
            limited = limited_client.get("/api/v1/me?private=injected-value")
            isolated = other_client.get("/api/v1/me")
            other_origin_client.cookies.update(limited_client.cookies)
            isolated_origin = other_origin_client.get("/api/v1/me")
    finally:
        settings.api_rate_limit_requests = original_limit
        settings.api_rate_limit_window_seconds = original_window
        if target_ids:
            with SessionFactory.begin() as session:
                session.execute(delete(LoginThrottle).where(LoginThrottle.target_id.in_(target_ids)))

    assert first.status_code == second.status_code == isolated.status_code == isolated_origin.status_code == 200
    assert limited.status_code == 429
    assert limited.json() == {
        "code": "api_temporarily_limited",
        "message": "Aguarde antes de tentar novamente.",
        "correlation_id": limited.headers["X-Correlation-ID"],
    }
    assert int(limited.headers["Retry-After"]) >= 1
    assert "injected-value" not in limited.text
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent)
            .where(
                AuditEvent.actor_id == audit_identifier(limited_account.id),
                AuditEvent.action == "api.request.rate_limited",
            )
            .order_by(AuditEvent.created_at.desc())
        )
    assert event is not None
    assert event.reason == "D03"
    assert event.event_metadata == {"role": "patient"}
