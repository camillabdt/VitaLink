"""Account recovery behavior through the public HTTP API."""

import json
import re
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import httpx
import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_patient_registration import confirmation_code_for, registration_data, valid_cpf

from vitallink.database import Account, AuditEvent, SessionFactory
from vitallink.main import app, current_time


def activate_patient_with_recovery(client: TestClient, email: str) -> tuple[pyotp.TOTP, dict[str, object]]:
    """Activate one synthetic patient and retain one-time recovery material.

    Args:
        client: Public API client retaining secure cookies.
        email: Unique synthetic e-mail address.

    Returns:
        Authenticator and one-time recovery material returned by the API.
    """
    seed = "".join(str(int(character, 16) % 10) for character in uuid4().hex[:9])
    client.post("/api/v1/patient-registrations", json=registration_data(email, valid_cpf(seed)))
    verification = client.post(
        "/api/v1/email-verifications",
        json={"email": email, "code": confirmation_code_for(email)},
    )
    headers = {
        "Origin": "https://testserver",
        "X-CSRF-Token": verification.headers["X-CSRF-Token"],
    }
    enrollment = client.post("/api/v1/totp", headers=headers)
    totp = pyotp.TOTP(enrollment.json()["secret"])
    confirmation = client.post("/api/v1/totp/confirmations", json={"code": totp.now()}, headers=headers)
    return totp, confirmation.json()


def activate_patient(client: TestClient, email: str) -> pyotp.TOTP:
    """Activate one synthetic patient through public endpoints.

    Args:
        client: Public API client retaining secure cookies.
        email: Unique synthetic e-mail address.

    Returns:
        Authenticator used by the activated account.
    """
    totp, _ = activate_patient_with_recovery(client, email)
    return totp


def recovery_token_for(email: str) -> str:
    """Read the newest password recovery token captured by Mailpit.

    Args:
        email: Expected synthetic recipient.

    Returns:
        Opaque recovery token from the local message.
    """
    response = httpx.get("http://127.0.0.1:8025/api/v1/messages", timeout=5)
    response.raise_for_status()
    messages = [
        message
        for message in response.json()["messages"]
        if message["To"][0]["Address"] == email and message["Subject"] == "Redefina sua senha do VitaLink"
    ]
    assert len(messages) == 1
    match = re.search(r"token=([A-Za-z0-9_-]+)", messages[0]["Snippet"])
    assert match is not None
    return match.group(1)


def totp_recovery_token_for(email: str) -> str:
    """Read the newest reinforced recovery token captured by Mailpit.

    Args:
        email: Expected synthetic recipient.

    Returns:
        Opaque reinforced recovery token from the local message.
    """
    response = httpx.get("http://127.0.0.1:8025/api/v1/messages", timeout=5)
    response.raise_for_status()
    messages = [
        message
        for message in response.json()["messages"]
        if message["To"][0]["Address"] == email and message["Subject"] == "Recupere seu autenticador do VitaLink"
    ]
    assert len(messages) == 1
    match = re.search(r"token=([A-Za-z0-9_-]+)", messages[0]["Snippet"])
    assert match is not None
    return match.group(1)


def test_password_recovery_request_is_generic_and_delivers_only_to_an_active_account() -> None:
    """Keep account existence private while delivering a real recovery token."""
    suffix = uuid4().hex
    email = f"recovery.{suffix}@example.com"
    unknown_email = f"unknown.{suffix}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        activate_patient(client, email)
        existing = client.post("/api/v1/password-recovery-requests", json={"email": email})
        unknown = client.post("/api/v1/password-recovery-requests", json={"email": unknown_email})

    expected = {
        "message": "Se a conta puder ser recuperada, enviaremos as instruções por e-mail.",
    }
    assert existing.status_code == unknown.status_code == 202
    assert existing.json() == unknown.json() == expected
    assert email not in existing.text
    assert unknown_email not in unknown.text
    token = recovery_token_for(email)
    correlation_ids = {
        UUID(existing.headers["X-Correlation-ID"]),
        UUID(unknown.headers["X-Correlation-ID"]),
    }
    with SessionFactory() as session:
        events = list(
            session.scalars(
                select(AuditEvent).where(
                    AuditEvent.correlation_id.in_(correlation_ids),
                    AuditEvent.action == "account.password_recovery.requested",
                )
            )
        )
    assert sorted(event.result for event in events) == ["denied", "success"]
    serialized_events = json.dumps(
        [
            {
                "actor": event.actor_id,
                "target": event.target_id,
                "metadata": event.event_metadata,
            }
            for event in events
        ]
    )
    assert email not in serialized_events
    assert unknown_email not in serialized_events
    assert token not in serialized_events


def test_password_reset_preserves_totp_and_revokes_every_existing_session() -> None:
    """Replace only the password while invalidating previously issued sessions."""
    email = f"password-reset.{uuid4().hex}@example.com"
    old_password = "uma senha longa e segura 2026"
    new_password = "uma nova senha longa e segura 2026"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": old_password, "totp_code": totp.now()},
        )
        assert login.status_code == 204
        client.post("/api/v1/password-recovery-requests", json={"email": email})
        reset = client.post(
            "/api/v1/password-resets",
            json={"token": recovery_token_for(email), "new_password": new_password},
        )
        old_session = client.get("/api/v1/me")
        old_password_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": old_password, "totp_code": totp.now()},
        )
        new_password_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": new_password, "totp_code": totp.now()},
        )

    assert reset.status_code == 204
    assert old_session.status_code == 401
    assert old_password_login.status_code == 401
    assert new_password_login.status_code == 204


def test_patient_lists_and_ends_only_an_owned_session() -> None:
    """List two owned sessions and revoke the selected opaque server session."""
    email = f"sessions.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"

    with (
        TestClient(app, base_url="https://testserver") as activation_client,
        TestClient(app, base_url="https://testserver") as first_client,
        TestClient(app, base_url="https://testserver") as second_client,
    ):
        totp = activate_patient(activation_client, email)
        first_login = first_client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        second_login = second_client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        listed = first_client.get("/api/v1/sessions")
        assert listed.status_code == 200
        second_session = next(item for item in listed.json() if not item["current"])
        ended = first_client.delete(
            f"/api/v1/sessions/{second_session['id']}",
            headers={"Origin": "https://testserver", "X-CSRF-Token": first_login.headers["X-CSRF-Token"]},
        )
        first_after = first_client.get("/api/v1/me")
        second_after = second_client.get("/api/v1/me")

    assert first_login.status_code == second_login.status_code == 204
    assert len(listed.json()) == 2
    assert sum(item["current"] for item in listed.json()) == 1
    assert ended.status_code == 204
    assert first_after.status_code == 200
    assert second_after.status_code == 401


def test_patient_changes_password_with_a_single_use_totp_step_up() -> None:
    """Bind a TOTP confirmation to one password change and consume it once."""
    email = f"password-change.{uuid4().hex}@example.com"
    old_password = "uma senha longa e segura 2026"
    new_password = "outra senha longa e segura 2026"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": old_password, "totp_code": totp.now()},
        )
        headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": login.headers["X-CSRF-Token"],
        }
        step_up = client.post(
            "/api/v1/step-up-confirmations",
            json={"action": "password_change", "totp_code": totp.now()},
            headers=headers,
        )
        assert step_up.status_code == 201
        changed = client.patch(
            "/api/v1/me/password",
            json={
                "current_password": old_password,
                "new_password": new_password,
                "step_up_confirmation_id": step_up.json()["id"],
            },
            headers=headers,
        )
        reused = client.patch(
            "/api/v1/me/password",
            json={
                "current_password": new_password,
                "new_password": "mais uma senha longa e segura 2026",
                "step_up_confirmation_id": step_up.json()["id"],
            },
            headers=headers,
        )
        old_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": old_password, "totp_code": totp.now()},
        )
        new_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": new_password, "totp_code": totp.now()},
        )

    assert changed.status_code == 204
    assert reused.status_code == 403
    assert old_login.status_code == 401
    assert new_login.status_code == 204


def test_password_change_consumes_step_up_after_an_invalid_current_password() -> None:
    """Prevent repeated password guesses with one valid TOTP confirmation."""
    email = f"password-change-denied.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": login.headers["X-CSRF-Token"],
        }
        step_up = client.post(
            "/api/v1/step-up-confirmations",
            json={"action": "password_change", "totp_code": totp.now()},
            headers=headers,
        )
        denied = client.patch(
            "/api/v1/me/password",
            json={
                "current_password": "senha atual incorreta",
                "new_password": "outra senha longa e segura 2026",
                "step_up_confirmation_id": step_up.json()["id"],
            },
            headers=headers,
        )
        retried = client.patch(
            "/api/v1/me/password",
            json={
                "current_password": password,
                "new_password": "outra senha longa e segura 2026",
                "step_up_confirmation_id": step_up.json()["id"],
            },
            headers=headers,
        )

    assert denied.status_code == 403
    assert retried.status_code == 403


def test_sessions_expire_after_idle_and_absolute_limits_with_a_controlled_clock() -> None:
    """Enforce thirty idle minutes and eight absolute hours using server time."""
    email = f"session-expiry.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"
    clock = [datetime.now(UTC)]
    app.dependency_overrides[current_time] = lambda: clock[0]

    try:
        with TestClient(app, base_url="https://testserver") as client:
            totp = activate_patient(client, email)
            first_login = client.post(
                "/api/v1/sessions",
                json={"email": email, "password": password, "totp_code": totp.now()},
            )
            assert first_login.status_code == 204
            clock[0] += timedelta(minutes=31)
            after_idle_limit = client.get("/api/v1/me")

            second_login = client.post(
                "/api/v1/sessions",
                json={"email": email, "password": password, "totp_code": totp.now()},
            )
            assert second_login.status_code == 204
            for _ in range(16):
                clock[0] += timedelta(minutes=29)
                assert client.get("/api/v1/me").status_code == 200
            clock[0] += timedelta(minutes=17)
            after_absolute_limit = client.get("/api/v1/me")
    finally:
        app.dependency_overrides.pop(current_time, None)

    assert after_idle_limit.status_code == 401
    assert after_absolute_limit.status_code == 401
    correlation_ids = {
        UUID(after_idle_limit.headers["X-Correlation-ID"]),
        UUID(after_absolute_limit.headers["X-Correlation-ID"]),
    }
    with SessionFactory() as session:
        events = list(
            session.scalars(
                select(AuditEvent).where(
                    AuditEvent.correlation_id.in_(correlation_ids),
                    AuditEvent.action == "account.session.expired",
                )
            )
        )
    assert sorted(event.reason for event in events) == ["absolute_expiration", "idle_expiration"]


def test_patient_reinforced_recovery_replaces_totp_codes_key_and_sessions() -> None:
    """Combine confirmed e-mail and offline key before enrolling a new TOTP."""
    email = f"reinforced-recovery.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"

    with TestClient(app, base_url="https://testserver") as client:
        old_totp, old_material = activate_patient_with_recovery(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": old_totp.now()},
        )
        assert login.status_code == 204
        requested = client.post("/api/v1/totp-recovery-requests", json={"email": email})
        assert requested.status_code == 202
        recovered = client.post(
            "/api/v1/totp-recoveries",
            json={
                "token": totp_recovery_token_for(email),
                "offline_recovery_key": old_material["offline_recovery_key"],
            },
        )
        old_session = client.get("/api/v1/me")
        old_totp_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": old_totp.now()},
        )
        activation_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": recovered.headers["X-CSRF-Token"],
        }
        enrollment = client.post("/api/v1/totp", headers=activation_headers)
        new_totp = pyotp.TOTP(enrollment.json()["secret"])
        confirmation = client.post(
            "/api/v1/totp/confirmations",
            json={"code": new_totp.now()},
            headers=activation_headers,
        )
        new_login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": new_totp.now()},
        )

    assert recovered.status_code == 204
    assert old_session.status_code == 401
    assert old_totp_login.status_code == 401
    assert confirmation.status_code == 200
    assert confirmation.json()["offline_recovery_key"] != old_material["offline_recovery_key"]
    assert set(confirmation.json()["recovery_codes"]).isdisjoint(old_material["recovery_codes"])
    assert new_login.status_code == 204


def test_reinforced_recovery_attempts_are_progressively_limited() -> None:
    """Limit repeated invalid offline keys for one e-mail recovery token."""
    email = f"reinforced-limit.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        activate_patient_with_recovery(client, email)
        client.post("/api/v1/totp-recovery-requests", json={"email": email})
        token = totp_recovery_token_for(email)
        responses = [
            client.post(
                "/api/v1/totp-recoveries",
                json={"token": token, "offline_recovery_key": "invalid-offline-recovery-key"},
            )
            for _ in range(6)
        ]

    assert [response.status_code for response in responses[:5]] == [400] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_recovery_requests_are_limited_without_revealing_account_existence() -> None:
    """Throttle repeated recovery e-mails with the same public policy for unknown accounts."""
    email = f"unknown-recovery-limit.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        responses = [client.post("/api/v1/password-recovery-requests", json={"email": email}) for _ in range(6)]

    assert [response.status_code for response in responses[:5]] == [202] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_step_up_totp_attempts_are_progressively_limited() -> None:
    """Throttle repeated invalid TOTP confirmations for one sensitive action."""
    email = f"step-up-limit.{uuid4().hex}@example.com"

    with TestClient(app, base_url="https://testserver") as client:
        totp = activate_patient(client, email)
        login = client.post(
            "/api/v1/sessions",
            json={"email": email, "password": "uma senha longa e segura 2026", "totp_code": totp.now()},
        )
        headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": login.headers["X-CSRF-Token"],
        }
        responses = [
            client.post(
                "/api/v1/step-up-confirmations",
                json={"action": "password_change", "totp_code": "000000"},
                headers=headers,
            )
            for _ in range(6)
        ]

    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_password_reset_attempts_are_progressively_limited() -> None:
    """Throttle repeated invalid password reset tokens by token and origin."""
    payload = {
        "token": f"invalid-password-reset-{uuid4().hex}",
        "new_password": "uma senha substituta longa e segura 2026",
    }

    with TestClient(app, base_url="https://testserver") as client:
        responses = [client.post("/api/v1/password-resets", json=payload) for _ in range(6)]

    assert [response.status_code for response in responses[:5]] == [400] * 5
    assert responses[5].status_code == 429
    assert responses[5].json()["code"] == "authentication_temporarily_limited"


def test_patient_cannot_end_another_accounts_session() -> None:
    """Deny cross-account session revocation without revealing the target."""
    victim_email = f"session-victim.{uuid4().hex}@example.com"
    attacker_email = f"session-attacker.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"

    with (
        TestClient(app, base_url="https://testserver") as victim,
        TestClient(app, base_url="https://testserver") as attacker,
    ):
        victim_totp = activate_patient(victim, victim_email)
        attacker_totp = activate_patient(attacker, attacker_email)
        victim_login = victim.post(
            "/api/v1/sessions",
            json={"email": victim_email, "password": password, "totp_code": victim_totp.now()},
        )
        attacker_login = attacker.post(
            "/api/v1/sessions",
            json={"email": attacker_email, "password": password, "totp_code": attacker_totp.now()},
        )
        victim_session_id = victim.get("/api/v1/sessions").json()[0]["id"]
        denied = attacker.delete(
            f"/api/v1/sessions/{victim_session_id}",
            headers={
                "Origin": "https://testserver",
                "X-CSRF-Token": attacker_login.headers["X-CSRF-Token"],
            },
        )
        victim_after = victim.get("/api/v1/me")

    assert victim_login.status_code == attacker_login.status_code == 204
    assert denied.status_code == 404
    assert victim_after.status_code == 200
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent).where(
                AuditEvent.correlation_id == UUID(denied.headers["X-Correlation-ID"]),
                AuditEvent.action == "account.session.revoked",
            )
        )
    assert event is not None
    assert event.result == "denied"
    assert event.reason == "session_not_found"


def test_professional_totp_recovery_returns_to_manual_validation() -> None:
    """Keep the public response generic while withholding automated professional recovery."""
    email = f"professional-recovery.{uuid4().hex}@example.com"
    with SessionFactory() as session:
        session.add(
            Account(
                email=email,
                password_hash="synthetic-not-used-by-this-test",
                role="professional",
                status="active",
            )
        )
        session.commit()

    with TestClient(app, base_url="https://testserver") as client:
        response = client.post("/api/v1/totp-recovery-requests", json={"email": email})

    assert response.status_code == 202
    assert response.json() == {
        "message": "Se a conta puder ser recuperada, enviaremos as instruções por e-mail.",
    }
    messages = httpx.get("http://127.0.0.1:8025/api/v1/messages", timeout=5).json()["messages"]
    assert not any(
        message["To"][0]["Address"] == email and message["Subject"] == "Recupere seu autenticador do VitaLink"
        for message in messages
    )
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent).where(
                AuditEvent.correlation_id == UUID(response.headers["X-Correlation-ID"]),
                AuditEvent.action == "account.totp_recovery.requested",
            )
        )
    assert event is not None
    assert event.result == "denied"
    assert event.reason == "manual_validation_required"


def test_step_up_confirmation_cannot_cross_authenticated_sessions() -> None:
    """Bind a sensitive action confirmation to the session that created it."""
    email = f"step-up-session-binding.{uuid4().hex}@example.com"
    password = "uma senha longa e segura 2026"

    with (
        TestClient(app, base_url="https://testserver") as activation,
        TestClient(app, base_url="https://testserver") as first,
        TestClient(app, base_url="https://testserver") as second,
    ):
        totp = activate_patient(activation, email)
        first_login = first.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        second_login = second.post(
            "/api/v1/sessions",
            json={"email": email, "password": password, "totp_code": totp.now()},
        )
        first_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": first_login.headers["X-CSRF-Token"],
        }
        second_headers = {
            "Origin": "https://testserver",
            "X-CSRF-Token": second_login.headers["X-CSRF-Token"],
        }
        confirmation = first.post(
            "/api/v1/step-up-confirmations",
            json={"action": "password_change", "totp_code": totp.now()},
            headers=first_headers,
        )
        crossed = second.patch(
            "/api/v1/me/password",
            json={
                "current_password": password,
                "new_password": "senha que não pode ser aplicada 2026",
                "step_up_confirmation_id": confirmation.json()["id"],
            },
            headers=second_headers,
        )

    assert confirmation.status_code == 201
    assert crossed.status_code == 403
    assert crossed.json()["code"] == "action_confirmation_required"
