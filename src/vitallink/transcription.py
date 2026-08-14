"""Local, process-isolated clinical audio transcription."""

import multiprocessing
import os
import tempfile
from pathlib import Path
from queue import Empty
from typing import Any

import av

from vitallink.config import Settings

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("DO_NOT_TRACK", "1")


class InvalidAudioError(ValueError):
    """Audio container is unreadable, unsupported, or exceeds two minutes."""


class TranscriptionTimeoutError(TimeoutError):
    """Local transcription exceeded its configured process deadline."""


class TranscriptionUnavailableError(RuntimeError):
    """Local model loading or inference failed without exposing clinical data."""


class NoSpeechError(ValueError):
    """Valid audio contained no transcribable speech."""


def audio_duration_seconds(path: Path) -> float:
    """Read duration from a validated audio container.

    Args:
        path: Temporary audio path.

    Returns:
        Duration in seconds.

    Raises:
        InvalidAudioError: If the container has no valid audio duration.
    """
    try:
        with av.open(str(path), mode="r") as container:
            if not container.streams.audio:
                raise InvalidAudioError("audio stream is required")
            if container.duration is not None:
                duration = float(container.duration / av.time_base)
            else:
                stream = container.streams.audio[0]
                if stream.duration is None or stream.time_base is None:
                    raise InvalidAudioError("audio duration is required")
                duration = float(stream.duration * stream.time_base)
    except InvalidAudioError:
        raise
    except Exception as error:
        raise InvalidAudioError("invalid audio container") from error
    if duration <= 0:
        raise InvalidAudioError("audio duration is required")
    return duration


def transcription_worker(
    path: str,
    model_repository: str,
    revision: str,
    cache_dir: str,
    device: str,
    compute_type: str,
    result_queue: Any,
) -> None:
    """Load the pinned local model and return only normalized text.

    Args:
        path: Temporary audio path owned by the parent process.
        model_repository: Pinned Hugging Face model repository.
        revision: Immutable repository revision.
        cache_dir: Local model cache shared across invocations.
        device: Inference device.
        compute_type: CTranslate2 computation type.
        result_queue: One-way multiprocessing result queue.
    """
    try:
        from faster_whisper import WhisperModel
        from huggingface_hub import snapshot_download

        model_path = snapshot_download(
            repo_id=model_repository,
            revision=revision,
            cache_dir=cache_dir,
        )
        model = WhisperModel(model_path, device=device, compute_type=compute_type)
        segments, _ = model.transcribe(
            path,
            language="pt",
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
        result_queue.put({"text": text})
    except Exception:  # noqa: BLE001 - child boundary must return no model details
        result_queue.put({"error": "transcription_failed"})


def transcribe_temporary_audio(content: bytes, suffix: str, settings: Settings) -> tuple[str, float]:
    """Transcribe audio in an isolated process and always erase its file.

    Args:
        content: Bounded audio bytes held only for this request.
        suffix: Safe extension selected from the verified content type.
        settings: Validated model, timeout, and directory configuration.

    Returns:
        Editable Portuguese draft and measured audio duration.

    Raises:
        InvalidAudioError: If the audio cannot be decoded or exceeds two minutes.
        TranscriptionTimeoutError: If the child process exceeds its deadline.
        TranscriptionUnavailableError: If model loading or inference fails.
        NoSpeechError: If the model returns no speech.
    """
    temp_dir = Path(settings.transcription_temp_dir)
    temp_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary_path: Path | None = None
    context = multiprocessing.get_context("spawn")
    result_queue = context.Queue(maxsize=1)
    process: multiprocessing.Process | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=temp_dir, suffix=suffix, delete=False) as temporary:
            temporary.write(content)
            temporary_path = Path(temporary.name)
        temporary_path.chmod(0o600)
        duration = audio_duration_seconds(temporary_path)
        if duration > settings.transcription_max_seconds:
            raise InvalidAudioError("audio duration exceeds limit")
        process = context.Process(
            target=transcription_worker,
            args=(
                str(temporary_path),
                settings.transcription_model,
                settings.transcription_revision,
                settings.transcription_cache_dir,
                settings.transcription_device,
                settings.transcription_compute_type,
                result_queue,
            ),
        )
        process.start()
        process.join(settings.transcription_timeout_seconds)
        if process.is_alive():
            process.terminate()
            process.join()
            raise TranscriptionTimeoutError("transcription timed out")
        try:
            result = result_queue.get(timeout=1)
        except Empty as error:
            raise TranscriptionUnavailableError("transcription produced no result") from error
        if result.get("error"):
            raise TranscriptionUnavailableError("transcription failed")
        text = str(result.get("text", "")).strip()
        if not text:
            raise NoSpeechError("no speech detected")
        return text, duration
    finally:
        if process is not None and process.is_alive():
            process.terminate()
            process.join()
        result_queue.close()
        result_queue.join_thread()
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
