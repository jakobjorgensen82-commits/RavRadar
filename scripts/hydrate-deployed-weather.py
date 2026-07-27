#!/usr/bin/env python3
"""Hydrate mutable weather state from the currently deployed RavRadar site.

GitHub Actions caches are immutable and a unique cache key per 10-minute run grows
without bound. RavRadar therefore treats the public Pages deployment as the
persistent state store. Missing or older local live files are replaced atomically.
Failures are intentionally non-fatal: the checked-in fallback remains available.
"""
from __future__ import annotations

import json
import os
import pathlib
import tempfile
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE_URL = os.getenv("RAVRADAR_DEPLOYED_BASE_URL", "").rstrip("/")
TIMEOUT = max(5, int(os.getenv("RAVRADAR_HYDRATE_TIMEOUT_SECONDS", "20")))
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar deployed-state hydrator")
FILES = (
    "data/live/dmi-forecast-cache.json",
    "data/live/dmi-bulk-cache.json",
    "data/live/conditions.json",
    "data/live/weather-health.json",
)


def timestamp(document: Any) -> float:
    if not isinstance(document, dict):
        return 0.0
    value = document.get("generatedAt")
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return 0.0


def read_json(path: pathlib.Path) -> Any:
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return None


def fetch_json(url: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        return json.loads(response.read().decode("utf-8"))


def atomic_write(path: pathlib.Path, document: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(document, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(payload)
        temporary = pathlib.Path(handle.name)
    temporary.replace(path)


def main() -> int:
    if not BASE_URL:
        print(json.dumps({"hydrated": [], "skipped": list(FILES), "reason": "missing-base-url"}))
        return 0

    hydrated: list[str] = []
    preserved: list[str] = []
    errors: list[dict[str, str]] = []
    for relative in FILES:
        local_path = ROOT / relative
        try:
            remote = fetch_json(f"{BASE_URL}/{relative}")
            if not isinstance(remote, dict):
                raise RuntimeError("response is not a JSON object")
            local = read_json(local_path)
            remote_time = timestamp(remote)
            local_time = timestamp(local)
            # Files without generatedAt are still useful when the local file is absent.
            if local is None or remote_time > local_time or (not local_time and remote_time):
                atomic_write(local_path, remote)
                hydrated.append(relative)
            else:
                preserved.append(relative)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            errors.append({"file": relative, "message": str(exc)})

    print(json.dumps({"hydrated": hydrated, "preserved": preserved, "errors": errors}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
