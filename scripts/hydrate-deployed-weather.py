#!/usr/bin/env python3
"""Hydrate mutable weather and diagnostic state from the deployed RavRadar site."""
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
JSON_FILES = (
    "data/live/dmi-forecast-cache.json",
    "data/live/dmi-bulk-cache.json",
    "data/live/conditions.json",
    "data/live/weather-health.json",
    "data/live/ravradar-runtime-diagnostics.json",
    "data/live/dmi-water-stations.json",
    "data/diagnostics/dmi-ocean-diagnostics.json",
)
TEXT_FILES = (
    "data/diagnostics/dmi-ocean-summary.txt",
)
RETIRED_ZONE_IDS = {"DK-B04-09"}



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


def fetch(url: str, accept: str) -> bytes:
    request = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}")
        return response.read()


def atomic_write_bytes(path: pathlib.Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("wb", dir=path.parent, delete=False) as handle:
        handle.write(payload)
        temporary = pathlib.Path(handle.name)
    temporary.replace(path)


def atomic_write_json(path: pathlib.Path, document: Any) -> None:
    atomic_write_bytes(path, (json.dumps(document, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def active_zone_ids() -> set[str]:
    zones_path = ROOT / "data/zones.geojson"
    document = read_json(zones_path)
    ids: set[str] = set()
    if not isinstance(document, dict):
        return ids
    for feature in document.get("features", []):
        if not isinstance(feature, dict):
            continue
        properties = feature.get("properties") or {}
        zone_id = properties.get("id") or feature.get("id")
        if zone_id:
            ids.add(str(zone_id))
    return ids


def sanitize_remote_document(relative: str, document: Any, allowed_zone_ids: set[str]) -> tuple[Any, list[str]]:
    """Remove retired/orphaned active-zone references from hydrated mutable state."""
    removed: list[str] = []
    if relative != "data/live/conditions.json" or not isinstance(document, dict):
        return document, removed
    zones = document.get("zones")
    if not isinstance(zones, dict):
        return document, removed
    valid = allowed_zone_ids - RETIRED_ZONE_IDS
    cleaned = {}
    for zone_id, value in zones.items():
        key = str(zone_id)
        if key in valid:
            cleaned[key] = value
        else:
            removed.append(key)
    if removed:
        document = dict(document)
        document["zones"] = cleaned
        document["hydrationSanitization"] = {
            "removedUnknownZoneIds": sorted(removed),
            "sanitizedAt": datetime.now().astimezone().isoformat(),
        }
    return document, removed


def main() -> int:
    all_files = (*JSON_FILES, *TEXT_FILES)
    if not BASE_URL:
        print(json.dumps({"hydrated": [], "skipped": list(all_files), "reason": "missing-base-url"}))
        return 0

    hydrated: list[str] = []
    preserved: list[str] = []
    sanitized: dict[str, list[str]] = {}
    errors: list[dict[str, str]] = []
    allowed_zone_ids = active_zone_ids()

    for relative in JSON_FILES:
        local_path = ROOT / relative
        try:
            remote = json.loads(fetch(f"{BASE_URL}/{relative}", "application/json").decode("utf-8"))
            if not isinstance(remote, dict):
                raise RuntimeError("response is not a JSON object")
            remote, removed_zone_ids = sanitize_remote_document(relative, remote, allowed_zone_ids)
            if removed_zone_ids:
                sanitized[relative] = removed_zone_ids
            local = read_json(local_path)
            remote_time, local_time = timestamp(remote), timestamp(local)
            if local is None or remote_time > local_time or (not local_time and remote_time):
                atomic_write_json(local_path, remote)
                hydrated.append(relative)
            else:
                preserved.append(relative)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            errors.append({"file": relative, "message": str(exc)})

    for relative in TEXT_FILES:
        local_path = ROOT / relative
        try:
            payload = fetch(f"{BASE_URL}/{relative}", "text/plain, */*")
            text = payload.decode("utf-8")
            # Never replace a generated local report with the checked-in waiting placeholder.
            if "Waiting for the first" in text and local_path.exists() and "Generated:" in local_path.read_text("utf-8", errors="ignore"):
                preserved.append(relative)
            else:
                atomic_write_bytes(local_path, payload)
                hydrated.append(relative)
        except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, RuntimeError) as exc:
            errors.append({"file": relative, "message": str(exc)})

    print(json.dumps({"hydrated": hydrated, "preserved": preserved, "sanitized": sanitized, "errors": errors}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
