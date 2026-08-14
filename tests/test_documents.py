"""Secure document upload behavior through the public HTTP API."""

from base64 import b64decode
from uuid import UUID, uuid4

import pyotp
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_account_recovery import activate_patient
from test_authorizations import create_pending_request, grant_pending_request
from test_personal_observations import patient_session

from vitallink.database import AuditEvent, Document, Notification, SessionFactory
from vitallink.main import app, settings

PNG_1X1 = b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=")


def test_patient_uploads_a_png_that_is_approved_after_scanning() -> None:
    """Store a valid synthetic image privately only after a clean scan."""
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "document-upload")
        uploaded = client.post(
            "/api/v1/documents",
            headers=headers,
            data={"category": "exames"},
            files={"file": ("pixel.png", PNG_1X1, "image/png")},
        )

    assert uploaded.status_code == 201
    assert uploaded.json()["status"] == "approved"
    assert uploaded.json()["content_type"] == "image/png"
    assert uploaded.json()["size"] == len(PNG_1X1)
    assert "storage" not in uploaded.json()
    with SessionFactory() as session:
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.action == "document.uploaded", AuditEvent.result == "success")
            .order_by(AuditEvent.created_at.desc())
        )
        notification = session.scalar(
            select(Notification).where(
                Notification.kind == "document_available",
                Notification.subject_id == UUID(uploaded.json()["id"]),
            )
        )
    assert event is not None
    assert notification is not None
    assert event.event_metadata == {"role": "patient", "category": "exames", "size": len(PNG_1X1)}
    assert "pixel.png" not in repr((event.reason, event.event_metadata))


def test_upload_rejects_false_extension_and_patient_quota(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject mismatched identity and account for approved bytes in the configured quota."""
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "document-validation")
        false_extension = client.post(
            "/api/v1/documents",
            headers=headers,
            data={"category": "exames"},
            files={"file": ("false.pdf", PNG_1X1, "application/pdf")},
        )
        monkeypatch.setattr(settings, "patient_document_quota_bytes", len(PNG_1X1) - 1)
        over_quota = client.post(
            "/api/v1/documents",
            headers=headers,
            data={"category": "exames"},
            files={"file": ("pixel.png", PNG_1X1, "image/png")},
        )

    assert false_extension.status_code == 422
    assert false_extension.json()["code"] == "invalid_file"
    assert over_quota.status_code == 422
    assert over_quota.json()["code"] == "patient_quota_exceeded"


def test_scanner_failure_keeps_the_document_in_quarantine(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep bytes unavailable when the mandatory scanner cannot decide."""

    def unavailable_scanner(content: bytes) -> str:
        """Simulate an unavailable system boundary.

        Args:
            content: Uploaded bytes ignored by the unavailable scanner.

        Raises:
            OSError: Always, matching the scanner boundary contract.
        """
        raise OSError("synthetic scanner outage")

    monkeypatch.setattr("vitallink.main.clamav_scan", unavailable_scanner)
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "document-scanner-failure")
        response = client.post(
            "/api/v1/documents",
            headers=headers,
            data={"category": "exames"},
            files={"file": ("quarantine.png", PNG_1X1, "image/png")},
        )

    assert response.status_code == 503
    assert response.json()["code"] == "document_scan_unavailable"
    with SessionFactory() as session:
        document = session.scalar(select(Document).order_by(Document.created_at.desc()))
    assert document is not None
    assert document.status == "quarantine"


def test_scanner_rejects_safe_malware_sample(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a safe synthetic corpus item when ClamAV classifies it as infected."""
    monkeypatch.setattr("vitallink.main.clamav_scan", lambda content: "infected")
    with TestClient(app, base_url="https://testserver") as client:
        headers = patient_session(client, "document-malware")
        response = client.post(
            "/api/v1/documents",
            headers=headers,
            data={"category": "exames"},
            files={"file": ("safe-malware.png", PNG_1X1, "image/png")},
        )

    assert response.status_code == 422
    assert response.json()["code"] == "malware_detected"


def authenticated_patient(client: TestClient, suffix: str) -> tuple[dict[str, str], pyotp.TOTP]:
    """Activate and authenticate a patient while retaining the TOTP generator.

    Args:
        client: Browser-like HTTP client retaining cookies.
        suffix: Unique synthetic identity suffix.

    Returns:
        CSRF headers and the enrolled TOTP generator.
    """
    email = f"document-{suffix}.{uuid4().hex}@example.com"
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


def test_document_read_prevents_idor_and_download_requires_totp() -> None:
    """Return identical misses cross-owner and require a single-use proof for download."""
    with (
        TestClient(app, base_url="https://testserver") as owner_client,
        TestClient(app, base_url="https://testserver") as outsider_client,
    ):
        owner_headers, owner_totp = authenticated_patient(owner_client, "read-owner")
        document = owner_client.post(
            "/api/v1/documents",
            headers=owner_headers,
            data={"category": "exames"},
            files={"file": ("pixel.png", PNG_1X1, "image/png")},
        ).json()
        viewed = owner_client.get(f"/api/v1/documents/{document['id']}/content")
        missing_step_up = owner_client.get(f"/api/v1/documents/{document['id']}/content?download=true")
        step_up = owner_client.post(
            "/api/v1/step-up-confirmations",
            headers=owner_headers,
            json={"action": "document_download", "totp_code": owner_totp.now()},
        ).json()
        downloaded = owner_client.get(
            f"/api/v1/documents/{document['id']}/content",
            params={"download": True, "step_up_confirmation_id": step_up["id"]},
        )
        patient_session(outsider_client, "document-outsider")
        known = outsider_client.get(f"/api/v1/documents/{document['id']}/content")
        unknown = outsider_client.get(f"/api/v1/documents/{uuid4()}/content")

    assert viewed.status_code == 200
    assert viewed.content == PNG_1X1
    assert viewed.headers["content-security-policy"] == "default-src 'none'; sandbox"
    assert viewed.headers["x-content-type-options"] == "nosniff"
    assert missing_step_up.status_code == 403
    assert downloaded.status_code == 200
    assert downloaded.headers["content-disposition"].startswith("attachment;")
    assert known.status_code == unknown.status_code == 404
    assert {(response.json()["code"], response.json()["message"]) for response in (known, unknown)} == {
        ("document_not_found", "Documento não encontrado.")
    }


def test_professional_access_is_reevaluated_per_document_category() -> None:
    """Expose only documents covered by the professional's current consult scope."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
    ):
        patient_totp, patient_headers, professional_headers, pending = create_pending_request(
            patient_client,
            professional_client,
            "document-professional",
            "Consulta sintética de um documento clínico autorizado.",
        )
        granted = grant_pending_request(
            patient_client,
            patient_totp,
            patient_headers,
            pending["id"],
            ["exames"],
            ["consultar", "anexar"],
        )
        assert granted.status_code == 200
        document = patient_client.post(
            "/api/v1/documents",
            headers=patient_headers,
            data={"category": "exames"},
            files={"file": ("authorized.png", PNG_1X1, "image/png")},
        ).json()
        patient_id = professional_client.get("/api/v1/patients").json()[0]["id"]
        professional_document = professional_client.post(
            "/api/v1/documents",
            headers=professional_headers,
            data={"category": "exames", "patient_id": patient_id},
            files={"file": ("professional.png", PNG_1X1, "image/png")},
        )
        listed = professional_client.get("/api/v1/documents", params={"patient_id": patient_id})
        viewed = professional_client.get(f"/api/v1/documents/{document['id']}/content")
        professionals = patient_client.get(f"/api/v1/documents/{document['id']}/authorized-professionals")

    assert listed.status_code == 200
    assert professional_document.status_code == 201
    assert {listed_document["id"] for listed_document in listed.json()} == {
        document["id"],
        professional_document.json()["id"],
    }
    assert viewed.status_code == 200
    assert professionals.status_code == 200
    assert professionals.json()[0]["name"] == "Profissional Sintética"
