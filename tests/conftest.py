"""Synthetic configuration shared by the integration test suite."""

import os

os.environ.setdefault("VITALINK_SECRET_KEY", "test-only-secret-key-with-at-least-32-characters")
os.environ.setdefault("VITALINK_PUBLIC_ORIGIN", "https://testserver")
