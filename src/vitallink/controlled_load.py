"""Run a bounded and reproducible HTTP capacity measurement."""

import argparse
import json
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def bounded_positive(value: str) -> int:
    """Parse a positive integer with a conservative load ceiling.

    Args:
        value: Command-line value to parse.

    Returns:
        The validated integer.

    Raises:
        argparse.ArgumentTypeError: If the value is outside 1 through 500.
    """
    parsed = int(value)
    if not 1 <= parsed <= 500:
        raise argparse.ArgumentTypeError("value must be between 1 and 500")
    return parsed


def request_status(url: str, timeout: float) -> str:
    """Request one URL and return only its status category.

    Args:
        url: HTTP or HTTPS endpoint under measurement.
        timeout: Maximum request duration in seconds.

    Returns:
        An HTTP status or a generic network-error category.
    """
    try:
        with urlopen(Request(url, method="GET"), timeout=timeout) as response:
            return str(response.status)
    except HTTPError as error:
        return str(error.code)
    except URLError:
        return "network_error"


def main(argv: list[str] | None = None) -> int:
    """Measure bounded request throughput and print a JSON report.

    Args:
        argv: Optional command-line arguments.

    Returns:
        Zero after completing the configured measurement.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--requests", type=bounded_positive, default=20)
    parser.add_argument("--concurrency", type=bounded_positive, default=4)
    parser.add_argument("--timeout", type=float, default=5.0)
    arguments = parser.parse_args(argv)
    if arguments.concurrency > arguments.requests:
        parser.error("concurrency cannot exceed requests")
    started_at = time.perf_counter()
    with ThreadPoolExecutor(max_workers=arguments.concurrency) as executor:
        statuses = list(
            executor.map(
                lambda _: request_status(arguments.url, arguments.timeout),
                range(arguments.requests),
            )
        )
    duration_seconds = time.perf_counter() - started_at
    print(
        json.dumps(
            {
                "parameters": {"requests": arguments.requests, "concurrency": arguments.concurrency},
                "completed": len(statuses),
                "responses": dict(sorted(Counter(statuses).items())),
                "duration_seconds": round(duration_seconds, 6),
                "requests_per_second": round(len(statuses) / duration_seconds, 3),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
