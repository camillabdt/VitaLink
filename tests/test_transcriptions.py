"""Temporary local clinical dictation through the public HTTP API."""

import io
import wave

from fastapi.testclient import TestClient
from sqlalchemy import select
from test_professional_records import grant_record_access

from vitallink.database import AuditEvent, SessionFactory
from vitallink.main import app, settings


def silent_wav(seconds: int) -> bytes:
    """Build synthetic PCM silence without clinical or personal speech.

    Args:
        seconds: Whole seconds of mono audio.

    Returns:
        Valid 16 kHz WAV bytes.
    """
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16_000)
        audio.writeframes(b"\x00\x00" * 16_000 * seconds)
    return buffer.getvalue()


def test_transcription_rejects_patient_wrong_scope_and_invalid_audio_without_artifacts() -> None:
    """Create no temporary file before professional scope and format are valid."""
    with (
        TestClient(app, base_url="https://testserver") as patient_client,
        TestClient(app, base_url="https://testserver") as professional_client,
        TestClient(app, base_url="https://testserver") as wrong_patient_client,
        TestClient(app, base_url="https://testserver") as wrong_scope_client,
    ):
        patient_headers, professional_headers, _, _, patient_id = grant_record_access(
            patient_client,
            professional_client,
            "dictation",
            ["consultas"],
            ["anexar"],
        )
        _, wrong_headers, _, _, wrong_patient_id = grant_record_access(
            wrong_patient_client,
            wrong_scope_client,
            "dictation-wrong-scope",
            ["exames"],
            ["anexar"],
        )
        patient_attempt = patient_client.post(
            "/api/v1/transcriptions",
            headers=patient_headers,
            data={"patient_id": patient_id, "category": "consultas", "operation": "anexar"},
            files={"audio": ("dictation.wav", b"synthetic", "audio/wav")},
        )
        wrong_scope = wrong_scope_client.post(
            "/api/v1/transcriptions",
            headers=wrong_headers,
            data={"patient_id": wrong_patient_id, "category": "consultas", "operation": "anexar"},
            files={"audio": ("dictation.wav", b"synthetic", "audio/wav")},
        )
        invalid_format = professional_client.post(
            "/api/v1/transcriptions",
            headers=professional_headers,
            data={"patient_id": patient_id, "category": "consultas", "operation": "anexar"},
            files={"audio": ("dictation.txt", b"synthetic", "text/plain")},
        )

    assert patient_attempt.status_code == wrong_scope.status_code == 404
    assert invalid_format.status_code == 422
    with SessionFactory() as session:
        denials = session.scalars(
            select(AuditEvent)
            .where(AuditEvent.action == "transcription.created")
            .order_by(AuditEvent.created_at.desc())
            .limit(3)
        ).all()
    assert len(denials) == 3
    assert "synthetic" not in repr([(event.reason, event.event_metadata) for event in denials])


def test_audio_limits_timeout_and_failure_always_leave_the_temp_directory_empty(tmp_path) -> None:
    """Erase temporary audio after validation, child termination, and model failure."""
    original_temp_dir = settings.transcription_temp_dir
    original_timeout = settings.transcription_timeout_seconds
    original_revision = settings.transcription_revision
    settings.transcription_temp_dir = str(tmp_path)
    try:
        with (
            TestClient(app, base_url="https://testserver") as patient_client,
            TestClient(app, base_url="https://testserver") as professional_client,
        ):
            _, headers, _, _, patient_id = grant_record_access(
                patient_client,
                professional_client,
                "dictation-cleanup",
                ["consultas"],
                ["anexar"],
            )
            form = {"patient_id": patient_id, "category": "consultas", "operation": "anexar"}
            too_long = professional_client.post(
                "/api/v1/transcriptions",
                headers=headers,
                data=form,
                files={"audio": ("long.wav", silent_wav(121), "audio/wav")},
            )
            settings.transcription_timeout_seconds = 0
            timeout = professional_client.post(
                "/api/v1/transcriptions",
                headers=headers,
                data=form,
                files={"audio": ("timeout.wav", silent_wav(1), "audio/wav")},
            )
            settings.transcription_timeout_seconds = 30
            settings.transcription_revision = "invalid-synthetic-revision"
            failure = professional_client.post(
                "/api/v1/transcriptions",
                headers=headers,
                data=form,
                files={"audio": ("failure.wav", silent_wav(1), "audio/wav")},
            )
    finally:
        settings.transcription_temp_dir = original_temp_dir
        settings.transcription_timeout_seconds = original_timeout
        settings.transcription_revision = original_revision

    assert too_long.status_code == 422
    assert timeout.status_code == 504
    assert failure.status_code == 503
    assert list(tmp_path.iterdir()) == []
