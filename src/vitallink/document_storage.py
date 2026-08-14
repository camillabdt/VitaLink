"""Private S3 storage and ClamAV boundaries for patient documents."""

import socket
import struct
from collections.abc import Iterator

import boto3
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from vitallink.config import get_settings


def document_content_type(content: bytes) -> str | None:
    """Identify an allowed document from its binary signature.

    Args:
        content: Complete bounded upload bytes.

    Returns:
        Safe media type for PDF, PNG, or JPEG; otherwise None.
    """
    if content.startswith(b"%PDF-") and b"%%EOF" in content[-1024:]:
        return "application/pdf"
    if (
        content.startswith(b"\x89PNG\r\n\x1a\n")
        and content[12:16] == b"IHDR"
        and content.endswith(b"\x00\x00\x00\x00IEND\xaeB\x60\x82")
    ):
        return "image/png"
    if content.startswith(b"\xff\xd8\xff") and content.endswith(b"\xff\xd9"):
        return "image/jpeg"
    return None


def storage_client() -> BaseClient:
    """Create an S3 client for the configured private endpoint.

    Returns:
        Boto3 S3 client using explicit local or production credentials.
    """
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key.get_secret_value(),
        region_name="us-east-1",
    )


def ensure_private_buckets(client: BaseClient) -> None:
    """Create private quarantine and approved buckets when absent.

    Args:
        client: Configured S3 client.
    """
    settings = get_settings()
    for bucket in (settings.s3_quarantine_bucket, settings.s3_approved_bucket):
        try:
            client.head_bucket(Bucket=bucket)
        except ClientError:
            client.create_bucket(Bucket=bucket)


def content_chunks(content: bytes, chunk_size: int = 64 * 1024) -> Iterator[bytes]:
    """Yield bounded chunks for the ClamAV INSTREAM protocol.

    Args:
        content: Complete bounded upload.
        chunk_size: Maximum chunk sent per protocol frame.

    Yields:
        Consecutive nonempty chunks.
    """
    for offset in range(0, len(content), chunk_size):
        yield content[offset : offset + chunk_size]


def clamav_scan(content: bytes) -> str:
    """Scan bytes through the configured ClamAV daemon.

    Args:
        content: Complete bounded upload bytes.

    Returns:
        ``clean`` or ``infected`` according to the daemon response.

    Raises:
        OSError: If the scanner is unavailable or returns an invalid response.
    """
    settings = get_settings()
    with socket.create_connection((settings.clamav_host, settings.clamav_port), timeout=10) as scanner:
        scanner.sendall(b"zINSTREAM\0")
        for chunk in content_chunks(content):
            scanner.sendall(struct.pack(">L", len(chunk)) + chunk)
        scanner.sendall(struct.pack(">L", 0))
        response = scanner.recv(4096).rstrip(b"\0").decode("utf-8", errors="replace")
    if response.endswith("OK"):
        return "clean"
    if response.endswith("FOUND"):
        return "infected"
    raise OSError("ClamAV returned an invalid scan response")
