#!/usr/bin/env python3
"""One-time, fail-closed Candidate G bootstrap for the integrated model cutover.

After the cutover, mutable runtime state is private and this script must reject
the public integrated manifest instead of treating it as a legacy source.
"""
from __future__ import annotations

import json
import argparse
import os
import pathlib
import tempfile
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any

DEFAULT_ROOT = pathlib.Path(__file__).resolve().parents[1]
TIMEOUT = max(5, int(os.getenv("RAVRADAR_HYDRATE_TIMEOUT_SECONDS", "20")))
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar deployed-state hydrator")
ATOMIC_WEATHER_FILES = (
    "data/live/manifest.json",
    "data/live/conditions.json",
)
JSON_FILES = (
    "data/live/dmi-forecast-cache.json",
    "data/live/dmi-bulk-cache.json",
    "data/live/current-pilot-history.json",
    "data/live/weather-health.json",
    "data/live/ravradar-runtime-diagnostics.json",
    "data/live/dmi-water-stations.json",
    "data/diagnostics/dmi-ocean-diagnostics.json",
)
TEXT_FILES = (
    "data/diagnostics/dmi-ocean-summary.txt",
)
RETIRED_ZONE_IDS = {"DK-B04-09"}
LEGACY_CANDIDATE_G_MODEL_ID = "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3"
LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION = "2.0.0"
LEGACY_REQUIRED_FILES = {
    "data/live/dmi-forecast-cache.json",
    "data/live/dmi-bulk-cache.json",
    "data/live/current-pilot-history.json",
}



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
    """Return active zones from the normal repository root.

    Keep this zero-argument entry point for the established production gate.
    Isolated tests use ``active_zone_ids_at_root`` directly.
    """
    return active_zone_ids_at_root(DEFAULT_ROOT)


def active_zone_ids_at_root(root: pathlib.Path) -> set[str]:
    zones_path = root / "data/zones.geojson"
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



def merge_station_documents(local: Any, remote: Any) -> Any:
    """Merge station registry without allowing a newer but poorer run to erase history."""
    if not isinstance(remote, dict):
        return remote
    if not isinstance(local, dict):
        return remote
    local_rows = {str(row.get("stationId")): row for row in local.get("stations", []) if isinstance(row, dict) and row.get("stationId")}
    remote_rows = {str(row.get("stationId")): row for row in remote.get("stations", []) if isinstance(row, dict) and row.get("stationId")}
    merged = dict(local_rows)
    lifecycle_fields = (
        "hasEverDelivered", "firstObservationAt", "lastObservationAt", "lastObservationValueCm",
        "consecutiveMissingObservationRuns", "deliveryStatus", "forecastCacheGeneratedAt",
        "forecastCacheValidUntil", "forecastCacheStatus", "overallUsabilityStatus", "forecastCacheZoneIds"
    )
    for station_id, incoming in remote_rows.items():
        previous = local_rows.get(station_id, {})
        row = {**previous, **incoming}
        previous_has_history = bool(previous.get("hasEverDelivered") or previous.get("lastObservationAt") or previous.get("lastObservationValueCm") is not None)
        incoming_has_history = bool(incoming.get("hasEverDelivered") or incoming.get("lastObservationAt") or incoming.get("lastObservationValueCm") is not None)
        if previous_has_history and not incoming_has_history:
            for field in lifecycle_fields:
                if field in previous:
                    row[field] = previous[field]
        merged[station_id] = row
    notifications = []
    seen = set()
    for item in [*(remote.get("notifications") or []), *(local.get("notifications") or [])]:
        if not isinstance(item, dict):
            continue
        key = item.get("id") or json.dumps(item, sort_keys=True, ensure_ascii=False)
        if key in seen:
            continue
        seen.add(key); notifications.append(item)
    result = {**local, **remote, "schemaVersion": max(int(local.get("schemaVersion") or 0), int(remote.get("schemaVersion") or 0), 3),
              "stations": list(merged.values()), "notifications": notifications[:250]}
    result["retainedKnownCount"] = max(int(result.get("retainedKnownCount") or 0), len(merged) - len(remote_rows))
    return result


def assert_legacy_candidate_g_cutover_source(manifest: Any, conditions: Any) -> None:
    """Accept only the exact pre-integrated public Candidate G state.

    This is deliberately not a generic deployed-runtime hydrator. Once the
    schema-4 integrated manifest is public, a missing private cache must fail
    and recover from protected state rather than reopen public private data.
    """
    if not isinstance(manifest, dict) or manifest.get("schemaVersion") != 2:
        raise RuntimeError("deployed runtime is not the approved legacy Candidate G manifest")
    if manifest.get("fullConditionsPath") != "./conditions.json":
        raise RuntimeError("legacy Candidate G manifest lacks its exact full-runtime path")
    if not isinstance(conditions, dict):
        raise RuntimeError("legacy Candidate G runtime is not a JSON object")
    zones = conditions.get("zones")
    coastal = conditions.get("coastalParts") or {}
    parts = coastal.get("parts")
    profile = coastal.get("scoreProfile") or {}
    if not isinstance(zones, dict) or len(zones) != 210:
        raise RuntimeError("legacy Candidate G runtime does not contain exactly 210 zones")
    if not isinstance(parts, dict) or len(parts) != 673:
        raise RuntimeError("legacy Candidate G runtime does not contain exactly 673 coastal parts")
    if profile.get("activeProfileId") != LEGACY_CANDIDATE_G_MODEL_ID:
        raise RuntimeError("deployed runtime is not the active Candidate G profile")
    for part in parts.values():
        if not isinstance(part, dict) or "ravScoreModel" in part:
            raise RuntimeError("legacy bootstrap refuses integrated or malformed part state")
        state = ((part.get("candidateG") or {}).get("currentState") or {})
        if (state.get("schemaVersion") != LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION
                or state.get("modelId") != LEGACY_CANDIDATE_G_MODEL_ID):
            raise RuntimeError("legacy Candidate G runtime lacks complete schema-2 continuation")

def main() -> int:
    parser = argparse.ArgumentParser(description="Hydrate mutable RavRadar state from a deployed site.")
    parser.add_argument(
        "--base-url",
        default=os.getenv("RAVRADAR_DEPLOYED_BASE_URL", ""),
        help="Deployed RavRadar base URL (or set RAVRADAR_DEPLOYED_BASE_URL).",
    )
    parser.add_argument(
        "--legacy-candidate-g-bootstrap",
        action="store_true",
        help="Allow the one-time 4.0.316 Candidate G cutover import.",
    )
    parser.add_argument(
        "--root",
        default=os.getenv("RAVRADAR_HYDRATE_ROOT", str(DEFAULT_ROOT)),
        help="Repository root receiving hydrated files (primarily for isolated contract tests).",
    )
    args = parser.parse_args()
    base_url = str(args.base_url or "").rstrip("/")
    root = pathlib.Path(args.root).resolve()
    all_files = (*ATOMIC_WEATHER_FILES, *JSON_FILES, *TEXT_FILES)
    if not args.legacy_candidate_g_bootstrap:
        print(json.dumps({
            "hydrated": [],
            "skipped": list(all_files),
            "reason": "generic-public-private-runtime-hydration-retired",
            "fatal": True,
        }))
        return 2
    if not base_url:
        print(json.dumps({"hydrated": [], "skipped": list(all_files), "reason": "missing-base-url"}))
        return 0

    hydrated: list[str] = []
    preserved: list[str] = []
    sanitized: dict[str, list[str]] = {}
    errors: list[dict[str, str]] = []
    allowed_zone_ids = active_zone_ids_at_root(root)

    # Manifest and conditions are one atomic publication unit. Never hydrate one
    # without the other, otherwise a deployed forecast can be paired with a
    # checked-in manifest from a different run.
    try:
        remote_manifest = json.loads(fetch(f"{base_url}/data/live/manifest.json", "application/json").decode("utf-8"))
        remote_conditions = json.loads(fetch(f"{base_url}/data/live/conditions.json", "application/json").decode("utf-8"))
        if not isinstance(remote_manifest, dict) or not isinstance(remote_conditions, dict):
            raise RuntimeError("atomic weather response is not a JSON object")
        assert_legacy_candidate_g_cutover_source(remote_manifest, remote_conditions)
        remote_conditions, removed_zone_ids = sanitize_remote_document(
            "data/live/conditions.json", remote_conditions, allowed_zone_ids
        )
        if removed_zone_ids:
            sanitized["data/live/conditions.json"] = removed_zone_ids
        manifest_dataset = remote_manifest.get("datasetId")
        conditions_dataset = remote_conditions.get("datasetId")
        if not manifest_dataset or manifest_dataset != conditions_dataset:
            raise RuntimeError(
                f"deployed manifest/conditions datasetId mismatch: {manifest_dataset!r} != {conditions_dataset!r}"
            )

        local_manifest_path = root / "data/live/manifest.json"
        local_conditions_path = root / "data/live/conditions.json"
        local_manifest = read_json(local_manifest_path)
        local_conditions = read_json(local_conditions_path)
        local_pair_matches = (
            isinstance(local_manifest, dict)
            and isinstance(local_conditions, dict)
            and local_manifest.get("datasetId")
            and local_manifest.get("datasetId") == local_conditions.get("datasetId")
        )
        remote_is_newer = timestamp(remote_conditions) > timestamp(local_conditions)
        if remote_is_newer or not local_pair_matches:
            atomic_write_json(local_manifest_path, remote_manifest)
            atomic_write_json(local_conditions_path, remote_conditions)
            hydrated.extend(ATOMIC_WEATHER_FILES)
        else:
            preserved.extend(ATOMIC_WEATHER_FILES)
    except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        errors.append({"file": "atomic-weather-dataset", "message": str(exc)})
        print(json.dumps({
            "hydrated": hydrated,
            "preserved": preserved,
            "sanitized": sanitized,
            "errors": errors,
            "fatal": True,
        }, ensure_ascii=False))
        return 1

    for relative in JSON_FILES:
        local_path = root / relative
        try:
            remote = json.loads(fetch(f"{base_url}/{relative}", "application/json").decode("utf-8"))
            if not isinstance(remote, dict):
                raise RuntimeError("response is not a JSON object")
            remote, removed_zone_ids = sanitize_remote_document(relative, remote, allowed_zone_ids)
            if removed_zone_ids:
                sanitized[relative] = removed_zone_ids
            local = read_json(local_path)
            if relative == "data/live/dmi-water-stations.json":
                merged = merge_station_documents(local, remote)
                if merged != local:
                    atomic_write_json(local_path, merged)
                    hydrated.append(relative)
                else:
                    preserved.append(relative)
                continue
            remote_time, local_time = timestamp(remote), timestamp(local)
            if local is None or remote_time > local_time or (not local_time and remote_time):
                atomic_write_json(local_path, remote)
                hydrated.append(relative)
            else:
                preserved.append(relative)
        except (urllib.error.URLError, TimeoutError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
            errors.append({"file": relative, "message": str(exc)})

    for relative in TEXT_FILES:
        local_path = root / relative
        try:
            payload = fetch(f"{base_url}/{relative}", "text/plain, */*")
            text = payload.decode("utf-8")
            # Never replace a generated local report with the checked-in waiting placeholder.
            if "Waiting for the first" in text and local_path.exists() and "Generated:" in local_path.read_text("utf-8", errors="ignore"):
                preserved.append(relative)
            else:
                atomic_write_bytes(local_path, payload)
                hydrated.append(relative)
        except (urllib.error.URLError, TimeoutError, UnicodeDecodeError, RuntimeError) as exc:
            errors.append({"file": relative, "message": str(exc)})

    required_failures = sorted(
        item["file"] for item in errors if item.get("file") in LEGACY_REQUIRED_FILES
    )
    print(json.dumps({
        "hydrated": hydrated,
        "preserved": preserved,
        "sanitized": sanitized,
        "errors": errors,
        "fatal": bool(required_failures),
        "requiredFailureCount": len(required_failures),
    }, ensure_ascii=False))
    return 1 if required_failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
