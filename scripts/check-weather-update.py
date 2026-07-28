#!/usr/bin/env python3
"""Decide whether a cron-triggered RavRadar run needs the heavy weather pipeline.

A run is required when the deployed weather is stale, a newer DMI model run is
visible, state is missing, or the caller explicitly forces a refresh. Results are
written to GITHUB_OUTPUT for direct use by GitHub Actions.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
BULK_PATH = ROOT / "data/live/dmi-bulk-cache.json"
CONDITIONS_PATH = ROOT / "data/live/conditions.json"
OCEAN_DIAGNOSTICS_PATH = ROOT / "data/diagnostics/dmi-ocean-diagnostics.json"
STAC_ROOT = os.getenv("DMI_STAC_ROOT", "https://opendataapi.dmi.dk/v1/forecastdata")
MAX_STALE_MINUTES = max(10, int(os.getenv("RAVRADAR_MAX_STALE_MINUTES", "30")))
TIMEOUT = max(5, int(os.getenv("RAVRADAR_PREFLIGHT_TIMEOUT_SECONDS", "20")))
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar update preflight")
FORCE = os.getenv("RAVRADAR_FORCE_UPDATE", "false").lower() in {"1", "true", "yes", "on"}
EVENT_NAME = os.getenv("GITHUB_EVENT_NAME", "")
COLLECTIONS = ("dkss_idw", "dkss_nsbs", "dkss_lf", "harmonie_dini_sf", "wam_dw", "wam_nsb")


def iso(value: Any) -> str | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def epoch(value: Any) -> float:
    normalized = iso(value)
    if not normalized:
        return 0.0
    return datetime.fromisoformat(normalized.replace("Z", "+00:00")).timestamp()


def item_run(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("forecast:reference_datetime", "reference_datetime", "modelRun", "model_run", "created"):
        parsed = iso(props.get(key))
        if parsed:
            return parsed
    match = re.search(r"(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)[T_]?([0-2]\d)", str(item.get("id", "")))
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}T{match.group(4)}:00:00Z"
    return iso(props.get("datetime") or props.get("start_datetime"))


def read_json(path: pathlib.Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def latest_run(collection: str) -> str | None:
    now = datetime.now(timezone.utc)
    start = datetime.fromtimestamp(now.timestamp() - 24 * 3600, timezone.utc).isoformat().replace("+00:00", "Z")
    end = datetime.fromtimestamp(now.timestamp() + 7 * 24 * 3600, timezone.utc).isoformat().replace("+00:00", "Z")
    # Restrict the STAC response to recent/current forecast items. This keeps the
    # 10-minute preflight small while still covering a complete 120-hour run.
    query = urllib.parse.urlencode({"limit": "250", "datetime": f"{start}/{end}"})
    request = urllib.request.Request(
        f"{STAC_ROOT}/collections/{collection}/items?{query}",
        headers={"Accept": "application/geo+json, application/json", "User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        data = json.loads(response.read().decode("utf-8"))
    runs = [item_run(item) for item in (data.get("features") or [])]
    valid = [run for run in runs if run]
    return max(valid, key=epoch) if valid else None


def set_output(name: str, value: str) -> None:
    output = os.getenv("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"{name}={value}\n")


def main() -> int:
    conditions = read_json(CONDITIONS_PATH)
    bulk = read_json(BULK_PATH)
    ocean_diagnostics = read_json(OCEAN_DIAGNOSTICS_PATH)
    generated = epoch(conditions.get("generatedAt"))
    age_minutes = (time.time() - generated) / 60 if generated else float("inf")
    previous_runs = {
        name: (details or {}).get("referenceTime")
        for name, details in (bulk.get("runs") or {}).items()
        if isinstance(details, dict)
    }

    reasons: list[str] = []
    changed: dict[str, dict[str, str | None]] = {}
    errors: list[dict[str, str]] = []

    if FORCE:
        reasons.append("forced")
    if EVENT_NAME == "push":
        reasons.append("source-push")
    if not generated:
        reasons.append("missing-weather-state")
    elif age_minutes >= MAX_STALE_MINUTES:
        reasons.append(f"weather-stale-{int(age_minutes)}m")
    if not previous_runs:
        reasons.append("missing-dmi-run-state")

    diagnostics_generated = epoch(ocean_diagnostics.get("generatedAt"))
    diagnostics_status = str(ocean_diagnostics.get("refreshStatus") or "")
    if not diagnostics_generated or diagnostics_status.startswith("waiting-for-first"):
        reasons.append("missing-ocean-diagnostics")

    # A failed model probe must never destroy working state. The stale fallback
    # guarantees a refresh no later than MAX_STALE_MINUTES.
    for collection in COLLECTIONS:
        try:
            current = latest_run(collection)
            previous = previous_runs.get(collection)
            if current and (not previous or epoch(current) > epoch(previous)):
                changed[collection] = {"previous": previous, "current": current}
        except Exception as exc:
            errors.append({"collection": collection, "message": str(exc)})

    if changed:
        reasons.append("new-dmi-model")

    should_run = bool(reasons)
    set_output("should_run", "true" if should_run else "false")
    set_output("dmi_changed", "true" if changed else "false")
    set_output("reason", ",".join(reasons) if reasons else "fresh-no-new-model")
    set_output("age_minutes", "unknown" if age_minutes == float("inf") else str(round(age_minutes, 1)))

    report = {
        "shouldRun": should_run,
        "dmiChanged": bool(changed),
        "reason": reasons or ["fresh-no-new-model"],
        "weatherAgeMinutes": None if age_minutes == float("inf") else round(age_minutes, 1),
        "changedCollections": changed,
        "probeErrors": errors,
        "oceanDiagnosticsGeneratedAt": ocean_diagnostics.get("generatedAt"),
        "oceanDiagnosticsStatus": ocean_diagnostics.get("refreshStatus"),
    }
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
