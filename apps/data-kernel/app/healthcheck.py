from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    port = os.getenv("DATA_KERNEL_PORT", "8790")
    url = f"http://127.0.0.1:{port}/health"

    try:
        with urllib.request.urlopen(url, timeout=3) as response:
            return 0 if response.status == 200 else 1
    except (OSError, urllib.error.URLError):
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
