"""Reproducible controlled-load command through its public CLI."""

import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class HealthHandler(BaseHTTPRequestHandler):
    """Serve a minimal health endpoint for the real HTTP boundary."""

    def do_GET(self) -> None:
        """Return an empty successful response."""
        self.send_response(200)
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        """Keep the test output free from local request logs."""


def test_controlled_load_reports_configured_request_capacity() -> None:
    """Measure every configured request and expose reproducible parameters."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), HealthHandler)
    thread = threading.Thread(target=server.serve_forever)
    thread.start()
    try:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "vitallink.controlled_load",
                "--url",
                f"http://127.0.0.1:{server.server_port}/health",
                "--requests",
                "5",
                "--concurrency",
                "2",
            ],
            check=False,
            capture_output=True,
            env={**os.environ, "PYTHONPATH": "src"},
            text=True,
        )
    finally:
        server.shutdown()
        thread.join()
        server.server_close()

    assert result.returncode == 0
    report = json.loads(result.stdout)
    assert report["parameters"] == {"requests": 5, "concurrency": 2}
    assert report["responses"] == {"200": 5}
    assert report["completed"] == 5
    assert report["requests_per_second"] > 0
