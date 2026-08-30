#!/usr/bin/env python3
"""Build RavRadar's DMI cache from forecast-step GRIB assets.

DMI STAC items represent forecast steps, not individual parameters. Each selected
GRIB file is downloaded once, inventoried message-by-message with ecCodes, and only
the collection-specific fields needed by RavRadar are extracted. Progress, failures
and collection rotation are persisted across runs.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import re
import sys
import tempfile
import time
from datetime import datetime, timezone
from typing import Any

from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed, water_temperature_surface_layer, vector_vertical_layer, vector_choice, prefer_vector_choice
from lib.current_field_shadow import (
    REGIONAL_PROXY_REQUIRED_COLLECTION,
    build_regional_proxy_targets,
    build_rotating_targets,
    eligible_replay_assets,
    load_document as load_current_field_shadow,
    owner_coverage_audit,
    prune as prune_current_field_shadow,
    regional_proxy_safe_report,
    record_profiles as record_current_field_profiles,
    save_document as save_current_field_shadow,
    status as current_field_shadow_status,
)
from lib.dmi_cache_migration import prune_previous_sampling_mismatches
from lib.dmi_native_provenance import (
    COLLECTION_FAMILY,
    COMPONENT_FIELD_SET,
    COMPONENT_KIND,
    COMPONENT_SPATIAL_SELECTION,
    CURRENT_MAX_DISTANCE_KM,
    CURRENT_PREFERRED_DISTANCE_KM,
    CURRENT_VECTOR_SELECTION,
    CURRENT_VECTOR_SEMANTICS_VERSION,
    MARINE_COLLECTIONS,
    SPATIAL_PROVENANCE_VERSION,
    complete_native_source_for_hour,
    component_collection_allowed,
    sampling_identity,
)
from lib.coastal_point_staging import (
    load_private_document as load_coastal_point_stage,
    prune_hours as prune_coastal_point_stage_hours,
    save_private_document as save_coastal_point_stage,
    stage_asset_complete,
    staged_targets as build_coastal_point_stage_targets,
)

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
try:
    from eccodes import (
        codes_get, codes_get_array, codes_get_elements, codes_grib_find_nearest,
        codes_grib_new_from_file, codes_release,
    )
except ImportError as exc:
    raise RuntimeError(
        "ecCodes Python API er ikke kompatibelt: codes_get_elements mangler. "
        "Installer requirements-dmi.txt igen."
    ) from exc

ROOT = pathlib.Path(__file__).resolve().parents[1]
ZONES_PATH = ROOT / "data/zones.geojson"
COASTAL_PART_POINTS_PATH = ROOT / "data/live/coastal-parts-v2.json"
WATER_SOURCES_PATH = ROOT / "data/live/dmi-water-stations.json"
OUTPUT_PATH = ROOT / "data/live/dmi-bulk-cache.json"
DEPLOYED_FALLBACK_PATH = pathlib.Path(os.getenv("DMI_BULK_DEPLOYED_FALLBACK_PATH", str(ROOT / ".cache/deployed-dmi-bulk-cache.json")))
DIAGNOSTICS_JSON_PATH = ROOT / "data/diagnostics/dmi-ocean-diagnostics.json"
DIAGNOSTICS_TEXT_PATH = ROOT / "data/diagnostics/dmi-ocean-summary.txt"
RAW_DIR = pathlib.Path(os.getenv("DMI_BULK_RAW_DIR", str(ROOT / ".cache/dmi-grib")))
CACHE_MANIFEST_NAME = "asset-manifest.json"
CACHE_AUDIT_PATH = ROOT / "data/diagnostics/dmi-cache-audit.json"
CURRENT_FIELD_SHADOW_PATH = pathlib.Path(os.getenv("CURRENT_FIELD_SHADOW_PATH", str(ROOT / ".cache/current-field-shadow.json")))
CURRENT_FIELD_SHADOW_STATUS_PATH = ROOT / "data/diagnostics/current-field-shadow-status.json"
CURRENT_COVERAGE_OWNER_AUDIT_PATH = ROOT / "data/diagnostics/current-coverage-owner-audit.json"
CURRENT_REGIONAL_PROXY_POLICY_PATH = ROOT / "data/current-regional-proxy-policy.json"
CURRENT_REGIONAL_PROXY_REPORT_PATH = ROOT / "data/diagnostics/current-regional-proxy-pilot.json"
COASTAL_POINT_STAGE_REVIEWS_PATH = ROOT / "data/admin/direction-reviews.json"
COASTAL_POINT_STAGE_PATH = pathlib.Path(os.getenv(
    "COASTAL_POINT_STAGE_PATH",
    str(ROOT / ".cache/coastal-point-staging/dmi.json"),
))
RAW_CACHE_MAX_BYTES = max(256 * 1024 * 1024, int(float(os.getenv("DMI_BULK_RAW_CACHE_MAX_MB", "4096")) * 1024 * 1024))
STAC_ROOT = os.getenv("DMI_STAC_ROOT", "https://opendataapi.dmi.dk/v1/forecastdata")
HOURS = max(1, int(os.getenv("DMI_BULK_HOURS", "120")))
MAX_DOWNLOAD_BYTES = max(1, int(float(os.getenv("DMI_BULK_MAX_DOWNLOAD_MB", "2048")) * 1024 * 1024))
MAX_RUNTIME_SECONDS = max(60, int(os.getenv("DMI_BULK_MAX_RUNTIME_SECONDS", "780")))
REQUEST_TIMEOUT = max(10, int(os.getenv("DMI_BULK_REQUEST_TIMEOUT_SECONDS", "90")))
MAX_ASSETS_PER_COLLECTION = max(1, int(os.getenv("DMI_BULK_MAX_ASSETS_PER_COLLECTION", "130")))
TIME_STRIDE_HOURS = max(1, int(os.getenv("DMI_BULK_TIME_STRIDE_HOURS", "3")))
COLLECTIONS_PER_RUN = max(1, int(os.getenv("DMI_BULK_COLLECTIONS_PER_RUN", "2")))
MARINE_FOUNDATION_BALANCE_RATIO = 0.95
REFRESH_MINUTES = max(1, int(os.getenv("DMI_BULK_REFRESH_MINUTES", "60")))
COMPLETE_HORIZON_HOURS = max(24, int(os.getenv("DMI_BULK_COMPLETE_HORIZON_HOURS", "96")))
HARMONIE_RUN_RETENTION_HOURS = max(24, int(os.getenv("DMI_HARMONIE_RUN_RETENTION_HOURS", "48")))
FORCE_REFRESH = os.getenv("DMI_BULK_FORCE_REFRESH", "false").lower() in {"1", "true", "yes", "on"}
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar DMI bulk downloader")
API_KEY = os.getenv("DMI_API_KEY")
STARTED = time.monotonic()
FINALIZE_RESERVE_SECONDS = max(60, int(os.getenv("DMI_BULK_FINALIZE_RESERVE_SECONDS", "180")))
WORK_DEADLINE = STARTED + max(60, MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS)
GRID_INDEX_CACHE: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
GRID_BATCH_WARMED: set[tuple[Any, ...]] = set()

STAC_SESSION = requests.Session()
DOWNLOAD_SESSION = requests.Session()
_retry = Retry(total=4, connect=4, read=4, status=4, backoff_factor=1.5,
               status_forcelist=(500, 502, 503, 504), allowed_methods=frozenset({"GET"}),
               respect_retry_after_header=True)
_adapter = HTTPAdapter(max_retries=_retry, pool_connections=4, pool_maxsize=4)
for _session in (STAC_SESSION, DOWNLOAD_SESSION):
    _session.mount("https://", _adapter)
    _session.headers.update({"User-Agent": USER_AGENT})
STAC_SESSION.headers.update({"Accept": "application/geo+json, application/json"})
DOWNLOAD_SESSION.headers.update({"Accept": "application/x-grib, application/octet-stream, */*"})

PARSER_VERSION = 19
PARAMETER_MAP_VERSION = 4
GRID_LOOKUP_VERSION = 7
# The integrated model can replay at most 48 hours before its first public
# target. Keep a bounded private buffer with one full native-cadence safety
# margin; this cache is never part of the Pages artifact.
PRIVATE_REPLAY_RETENTION_HOURS = max(
    54, int(os.getenv("DMI_BULK_PRIVATE_REPLAY_RETENTION_HOURS", "60"))
)
CURRENT_FIELD_SHADOW_PARTS_PER_RUN = max(1, int(os.getenv("CURRENT_FIELD_SHADOW_PARTS_PER_RUN", "15")))
CURRENT_FIELD_SHADOW_REPLAY_ASSETS_PER_COLLECTION = max(
    1, int(os.getenv("CURRENT_FIELD_SHADOW_REPLAY_ASSETS_PER_COLLECTION", "5"))
)
CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN = max(
    0, int(os.getenv("CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN", "3"))
)
COLLECTION_ORDER = ["dkss_idw", "dkss_nsbs", "dkss_lf", "wam_dw", "wam_nsb", "harmonie_dini_sf"]
TARGETS = {
    "marine": ["sea-mean-deviation", "current-u", "current-v", "water-temperature", "wind-tail-u-10m", "wind-tail-v-10m"],
    "wind": ["wind-u-10m", "wind-v-10m"],
    "wave": ["significant-wave-height", "mean-wave-dir", "dominant-wave-period"],
}
REQUIRED_TARGETS = {
    "marine": {"sea-mean-deviation", "current-u", "current-v"},
    "wind": {"wind-u-10m", "wind-v-10m"},
    # Height and period drive mobilisation. Direction remains useful context but
    # is not allowed to block the score tuple when it is absent or on another cell.
    "wave": {"significant-wave-height", "dominant-wave-period"},
}

MARINE_PARAMETERS = {"sea-mean-deviation", "current-u", "current-v", "water-temperature", "wind-tail-u-10m", "wind-tail-v-10m"}
MARINE_SCALAR_PARAMETERS = MARINE_PARAMETERS - {"current-u", "current-v"}
VECTOR_PAIRS = {
    "current-u": ("current", "current-u", "current-v"),
    "current-v": ("current", "current-u", "current-v"),
    "wind-u-10m": ("wind", "wind-u-10m", "wind-v-10m"),
    "wind-v-10m": ("wind", "wind-u-10m", "wind-v-10m"),
    "wind-tail-u-10m": ("wind-tail", "wind-tail-u-10m", "wind-tail-v-10m"),
    "wind-tail-v-10m": ("wind-tail", "wind-tail-u-10m", "wind-tail-v-10m"),
}
PARAMETER_COMPONENT = {
    "sea-mean-deviation": "waterLevel",
    "current-u": "current",
    "current-v": "current",
    "water-temperature": "waterTemperature",
    "wind-u-10m": "wind",
    "wind-v-10m": "wind",
    "wind-tail-u-10m": "windTail",
    "wind-tail-v-10m": "windTail",
    "significant-wave-height": "wave",
    "mean-wave-dir": "wave",
    "dominant-wave-period": "wave",
}
# Marine land masks can occupy many of the geometrically nearest cells before a
# wet cell appears. Keep the physical acceptance limits below unchanged, but
# inspect enough candidates that narrow fjords and shallow coastal waters are
# not rejected merely because dry cells filled the candidate window first.
GRID_CANDIDATE_TARGET = max(4, int(os.getenv("DMI_BULK_GRID_CANDIDATES", "64")))
LIMFJORD_GRID_CANDIDATE_TARGET = max(GRID_CANDIDATE_TARGET, int(os.getenv("DMI_BULK_LIMFJORD_GRID_CANDIDATES", "128")))
ATMOSPHERIC_GRID_CANDIDATE_TARGET = max(32, int(os.getenv("DMI_BULK_ATMOSPHERIC_GRID_CANDIDATES", "32")))
MAX_GRID_DISTANCE_KM = {"limfjord": 24.0, "west": 40.0, "east": 32.0}
MARINE_MODEL_PENALTY_KM = {
    "limfjord": {"dkss_lf": 0.0, "dkss_idw": 8.0, "dkss_nsbs": 18.0},
    "west": {"dkss_nsbs": 0.0, "dkss_idw": 10.0, "dkss_lf": 22.0},
    "east": {"dkss_idw": 0.0, "dkss_lf": 10.0, "dkss_nsbs": 20.0},
}

# Strong aliases are used for STAC item/asset metadata. Single-letter aliases are
# intentionally excluded here because they caused every valid time to collapse to
# the water-temperature item in 3.2.1.
HINT_ALIASES = {
    "sea-mean-deviation": ("sea mean deviation", "sea surface height", "sea_surface_height", "sea-surface-height", "water level", "water surface elevation", "sea level", "surface elevation", "zos", "zeta", "ssh", "smd"),
    "current-u": ("u component of current", "u-component of sea water velocity", "eastward sea water velocity", "eastward current", "sea water x velocity", "current-u", "uo", "ucurr", "uocn", "vozocrtx"),
    "current-v": ("v component of current", "v-component of sea water velocity", "northward sea water velocity", "northward current", "sea water y velocity", "current-v", "vo", "vcurr", "vocn", "vomecrty"),
    "water-temperature": ("water temperature", "sea water temperature", "sea-water temperature", "sea surface temperature", "water-temperature", "temperature of sea water", "sst"),
    "wind-u-10m": ("10 metre u wind", "10 meter u wind", "10m u wind", "wind-u-10m", "10u", "u10", "u10m"),
    "wind-v-10m": ("10 metre v wind", "10 meter v wind", "10m v wind", "wind-v-10m", "10v", "v10", "v10m"),
    "wind-tail-u-10m": ("10 metre u wind", "10 meter u wind", "10m u wind", "wind-tail-u-10m", "10u", "u10", "u10m"),
    "wind-tail-v-10m": ("10 metre v wind", "10 meter v wind", "10m v wind", "wind-tail-v-10m", "10v", "v10", "v10m"),
    "significant-wave-height": ("significant wave height", "significant height of combined", "significant-wave-height", "swh", "htsgw"),
    "mean-wave-dir": ("mean wave direction", "mean direction of waves", "mean-wave-dir", "mwd", "dirpw", "wavedir"),
    "dominant-wave-period": ("peak wave period", "dominant wave period", "mean wave period", "dominant-wave-period", "pp1d", "mwp", "perpw"),
}


def iso(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def epoch(value: Any) -> float:
    parsed = iso(value)
    return datetime.fromisoformat(parsed.replace("Z", "+00:00")).timestamp() if parsed else 0.0


def request_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = dict(params or {})
    if API_KEY and url.startswith(STAC_ROOT):
        query.setdefault("api-key", API_KEY)
    response = STAC_SESSION.get(url, params=query, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def item_run(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("forecast:reference_datetime", "reference_datetime", "modelRun", "model_run"):
        value = iso(props.get(key))
        if value:
            return value
    # Publication and valid-time metadata are not model-run identity.  If DMI
    # omits every explicit run field, this item is unusable rather than guessed
    # from `created`, the item id or the forecast-valid timestamp.
    return None


def item_valid(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("datetime", "forecast:valid_time", "valid_time", "end_datetime", "start_datetime"):
        value = iso(props.get(key))
        if value:
            return value
    return None


def item_timestamp(item: dict[str, Any], key: str) -> str | None:
    """Return only an explicit STAC timestamp; never infer publication time."""
    return iso((item.get("properties") or {}).get(key))


def observed_run_cadence_hours(runs: dict[str, list[dict[str, Any]]]) -> float | None:
    """Infer publication cadence only from the currently returned STAC runs."""
    ordered = sorted({epoch(run) for run in runs if epoch(run)})
    differences = [
        (after - before) / 3600.0
        for before, after in zip(ordered, ordered[1:])
        if 0 < after - before <= 48 * 3600
    ]
    if not differences:
        return None
    differences.sort()
    middle = len(differences) // 2
    return round(
        differences[middle] if len(differences) % 2 else (differences[middle - 1] + differences[middle]) / 2,
        3,
    )


def observed_publication_lag_hours(runs: dict[str, list[dict[str, Any]]]) -> float | None:
    """Use explicit STAC `created` only; missing metadata yields no invented lag."""
    lags = []
    for run, rows in runs.items():
        run_lags = []
        for row in rows:
            created = epoch(row.get("itemCreatedAt"))
            if created and epoch(run) and created >= epoch(run):
                run_lags.append((created - epoch(run)) / 3600.0)
        if run_lags:
            # Forecast-step items can be updated independently. The earliest
            # explicit creation is the observed run-publication event; using a
            # far-tail item's later creation would falsely extend freshness.
            lags.append(min(run_lags))
    return round(max(lags), 3) if lags else None


def asset_map(item: dict[str, Any]) -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for container_name in ("assets", "asset"):
        container = item.get(container_name)
        if not isinstance(container, dict):
            continue
        if isinstance(container.get("href"), str):
            merged.setdefault(container_name, container)
        else:
            for key, value in container.items():
                if isinstance(value, dict):
                    merged.setdefault(str(key), value)
    return merged


def grib_asset(item: dict[str, Any]) -> tuple[str, int | None, str] | None:
    ranked: list[tuple[int, str, int | None, str]] = []
    for key, asset in asset_map(item).items():
        href = asset.get("href")
        if not isinstance(href, str) or not href.strip():
            continue
        media = str(asset.get("type", "")).lower()
        roles = " ".join(str(v).lower() for v in (asset.get("roles") or []))
        title = str(asset.get("title", ""))
        haystack = f"{key} {title} {roles} {href}".lower()
        if "grib" not in media and "grib" not in haystack and not re.search(r"\.(grib2?|grb2?|bin)(\?|$)", haystack):
            continue
        size = asset.get("file:size") or asset.get("size") or asset.get("content_length")
        try:
            size = int(size) if size is not None else None
        except (TypeError, ValueError):
            size = None
        preferred = key.lower() in {"data", "grib", "download"} or "data" in roles
        ranked.append((0 if preferred else 1, href.strip(), size, f"{key} {title}"))
    if not ranked:
        return None
    ranked.sort(key=lambda row: (row[0], row[1]))
    _, href, size, description = ranked[0]
    return href, size, description


def metadata_text(item: dict[str, Any], asset_description: str = "") -> str:
    props = item.get("properties") or {}
    selected = []
    for key, value in props.items():
        key_l = str(key).lower()
        if any(token in key_l for token in ("param", "variable", "element", "name", "title", "product")):
            selected.append(f"{key}={value}")
    return " ".join([str(item.get("id", "")), asset_description, *selected]).lower().replace("_", " ")


def alias_matches(text: str, alias: str) -> bool:
    normalized = alias.lower().replace("_", " ")
    if len(normalized) <= 4 and re.fullmatch(r"[a-z0-9]+", normalized):
        return re.search(rf"(?<![a-z0-9]){re.escape(normalized)}(?![a-z0-9])", text) is not None
    return normalized in text


def parameter_hint(item: dict[str, Any], family: str, asset_description: str = "") -> str | None:
    text = metadata_text(item, asset_description)
    for canonical in TARGETS[family]:
        if any(alias_matches(text, alias) for alias in HINT_ALIASES.get(canonical, ())):
            return canonical
    return None


def stride_selected(valid: str, run: str) -> bool:
    offset_hours = max(0, round((epoch(valid) - epoch(run)) / 3600))
    return offset_hours <= 6 or offset_hours % TIME_STRIDE_HOURS == 0 or offset_hours >= HOURS - 1


def select_forecast_run(
    runs: dict[str, list[dict[str, Any]]],
    preferred_run: str | None = None,
    now_epoch: float | None = None,
    retention_horizon_hours: float = COMPLETE_HORIZON_HOURS,
) -> tuple[str, dict[str, Any]]:
    """Keep a usable progressive run instead of chasing each partial publication."""
    now_value = time.time() if now_epoch is None else now_epoch
    future_horizon = {
        run: max((epoch(row["valid"]) - now_value) / 3600 for row in rows)
        for run, rows in runs.items() if rows
    }
    mature = [run for run, hours in future_horizon.items() if hours >= retention_horizon_hours]
    if preferred_run in mature:
        selected = preferred_run
    elif mature:
        selected = max(mature, key=epoch)
    else:
        selected = max(future_horizon, key=lambda run: (future_horizon[run], epoch(run)))
    latest = max(future_horizon, key=epoch)
    return selected, {
        "latestRun": latest,
        "selectedRun": selected,
        "latestRunFutureHorizonHours": round(future_horizon[latest], 1),
        "selectedRunFutureHorizonHours": round(future_horizon[selected], 1),
        "runRetentionHorizonHours": retention_horizon_hours,
        "preferredProgressiveRunRetained": selected == preferred_run,
        "incompleteLatestRunDeferred": selected != latest,
    }


def list_latest_assets(collection: str, preferred_run: str | None = None) -> tuple[str | None, list[dict[str, Any]], dict[str, Any]]:
    data = request_json(f"{STAC_ROOT}/collections/{collection}/items",
                        {"limit": 1000, "bbox": "7,54,16,58", "sortorder": "datetime,DESC"})
    items = data.get("features") or []
    runs: dict[str, list[dict[str, Any]]] = {}
    stats = {
        "itemsSeen": len(items),
        "itemsWithoutGrib": 0,
        "forecastStepAssets": 0,
        "duplicateValidTimes": 0,
        "sampleItems": [],
    }
    for item in items:
        run, valid, asset = item_run(item), item_valid(item), grib_asset(item)
        if not run or not valid or not asset:
            stats["itemsWithoutGrib"] += 1
            continue
        href, size, _description = asset
        if epoch(valid) < epoch(run) - 3600 or epoch(valid) > epoch(run) + (HOURS + 6) * 3600:
            continue
        item_id = str(item.get("id") or "").strip()
        if not item_id:
            stats["itemsWithoutGrib"] += 1
            continue
        row = {
            "valid": valid,
            "href": href,
            "size": size,
            "id": item_id,
            "itemCreatedAt": item_timestamp(item, "created"),
            "itemUpdatedAt": item_timestamp(item, "updated"),
        }
        runs.setdefault(run, []).append(row)
        stats["forecastStepAssets"] += 1
        if len(stats["sampleItems"]) < 5:
            stats["sampleItems"].append({"id": item.get("id"), "run": run, "valid": valid})
    if not runs:
        return None, [], stats
    retention_horizon_hours = (
        HARMONIE_RUN_RETENTION_HOURS if collection == "harmonie_dini_sf" else COMPLETE_HORIZON_HOURS
    )
    run, run_selection = select_forecast_run(
        runs,
        preferred_run,
        retention_horizon_hours=retention_horizon_hours,
    )
    latest_run = str(run_selection["latestRun"])
    cadence_hours = observed_run_cadence_hours(runs)
    publication_lag_hours = observed_publication_lag_hours(runs)
    latest_run_age_hours = max(0.0, (time.time() - epoch(latest_run)) / 3600.0)
    selected_run_lag_hours = max(0.0, (epoch(latest_run) - epoch(run)) / 3600.0)
    # A retained progressive run may trail the latest partial generation by at
    # most one cadence observed in this exact STAC response. Entire-catalog
    # freshness is checked only when both cadence and explicit STAC creation lag
    # exist; absent metadata remains unknown instead of being fabricated.
    selected_within_observed_schedule = (
        run == latest_run
        or cadence_hours is not None and selected_run_lag_hours <= cadence_hours + 1e-6
    )
    catalog_schedule_fresh = (
        cadence_hours is not None
        and publication_lag_hours is not None
        and latest_run_age_hours <= cadence_hours + publication_lag_hours + 1e-6
    )
    run_selection.update({
        "observedRunCadenceHours": cadence_hours,
        "observedPublicationLagHours": publication_lag_hours,
        "latestRunAgeHours": round(latest_run_age_hours, 3),
        "selectedRunLagBehindLatestHours": round(selected_run_lag_hours, 3),
        "selectedWithinObservedSchedule": selected_within_observed_schedule,
        "catalogScheduleFresh": catalog_schedule_fresh if cadence_hours is not None and publication_lag_hours is not None else None,
    })
    if not selected_within_observed_schedule or catalog_schedule_fresh is False:
        stats.update(run_selection)
        stats["rejectedStaleRun"] = True
        return None, [], stats
    stats.update(run_selection)
    unique: dict[str, dict[str, Any]] = {}
    minimum_valid_epoch = time.time() - 3600
    for row in sorted(runs[run], key=lambda r: (epoch(r["valid"]), str(r["id"]))):
        if epoch(row["valid"]) < minimum_valid_epoch:
            stats["expiredForecastStepsSkipped"] = int(stats.get("expiredForecastStepsSkipped") or 0) + 1
            continue
        if not stride_selected(row["valid"], run):
            continue
        if row["valid"] in unique:
            stats["duplicateValidTimes"] += 1
            continue
        unique[row["valid"]] = {
            **row,
            "collection": collection,
            "modelRun": run,
            "observedRunCadenceHours": cadence_hours,
            "latestRun": latest_run,
            "catalogScheduleFresh": catalog_schedule_fresh if cadence_hours is not None and publication_lag_hours is not None else None,
        }
    rows = sorted(unique.values(), key=lambda r: epoch(r["valid"]))
    stats["selectedForecastSteps"] = min(len(rows), MAX_ASSETS_PER_COLLECTION)
    return run, rows[:MAX_ASSETS_PER_COLLECTION], stats




def raw_cache_inventory() -> dict[str, Any]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = [path for path in RAW_DIR.iterdir() if path.is_file() and path.name != CACHE_MANIFEST_NAME]
    rows = []
    for path in files:
        try:
            stat = path.stat()
            rows.append({"name": path.name, "bytes": stat.st_size, "modifiedAt": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat().replace("+00:00", "Z")})
        except OSError:
            continue
    rows.sort(key=lambda row: row["modifiedAt"])
    return {"files": len(rows), "bytes": sum(row["bytes"] for row in rows), "oldest": rows[0]["modifiedAt"] if rows else None, "newest": rows[-1]["modifiedAt"] if rows else None, "largestFiles": sorted(rows, key=lambda row: row["bytes"], reverse=True)[:20]}


def write_cache_audit(before: dict[str, Any], after: dict[str, Any], removed_files: int, removed_bytes: int) -> None:
    CACHE_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_AUDIT_PATH.write_text(json.dumps({
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "policy": {"maxBytes": RAW_CACHE_MAX_BYTES, "strategy": "non-reserved least-recently-used first; one eligible marine replay file per model area retained until hard ceiling"},
        "before": before, "after": after,
        "removedFiles": removed_files, "removedBytes": removed_bytes
    }, ensure_ascii=False, indent=2) + "\n", "utf-8")


def raw_cache_manifest_path() -> pathlib.Path:
    return RAW_DIR / CACHE_MANIFEST_NAME


def load_raw_cache_manifest() -> dict[str, Any]:
    try:
        document = json.loads(raw_cache_manifest_path().read_text("utf-8"))
    except Exception:
        return {"schemaVersion": 1, "assets": {}}
    if document.get("schemaVersion") != 1 or not isinstance(document.get("assets"), dict):
        return {"schemaVersion": 1, "assets": {}}
    return document


def save_raw_cache_manifest(document: dict[str, Any]) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = raw_cache_manifest_path()
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", "utf-8")
    temporary.replace(path)


def register_raw_cache_asset(
    path: pathlib.Path,
    href: str,
    collection: str | None,
    model_run: str | None,
    valid_time: str | None,
    *,
    item_id: str | None = None,
    item_created_at: str | None = None,
    item_updated_at: str | None = None,
    acquired_at: str | None = None,
) -> None:
    if not collection or not model_run or not valid_time:
        return
    document = load_raw_cache_manifest()
    assets = document.setdefault("assets", {})
    registered_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    previous = assets.get(path.name) or {}
    canonical_href = href.split("?", 1)[0].split("#", 1)[0]
    asset_identity_sha256 = hashlib.sha256(canonical_href.encode("utf-8")).hexdigest()
    normalized_item_id = str(item_id or "").strip() or None
    same_capture_identity = bool(
        previous.get("collection") == collection
        and iso(previous.get("modelRun")) == iso(model_run)
        and iso(previous.get("validTime")) == iso(valid_time)
        and previous.get("itemId") == normalized_item_id
        and previous.get("assetIdentitySha256") == asset_identity_sha256
    )
    assets[path.name] = {
        "canonicalHref": canonical_href,
        "assetIdentitySha256": asset_identity_sha256,
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": normalized_item_id,
        "itemCreatedAt": (
            iso(item_created_at) if item_created_at
            else previous.get("itemCreatedAt") if same_capture_identity else None
        ),
        "itemUpdatedAt": (
            iso(item_updated_at) if item_updated_at
            else previous.get("itemUpdatedAt") if same_capture_identity else None
        ),
        # Registration/last-use time is not acquisition time.  Preserve an
        # already proven capture only for the exact same item identity, or use
        # a timestamp supplied by the code path that actually downloaded it.
        "acquiredAt": (
            previous.get("acquiredAt") if same_capture_identity and iso(previous.get("acquiredAt"))
            else iso(acquired_at) if acquired_at else None
        ),
        "bytes": path.stat().st_size,
        "lastUsedAt": registered_at,
    }
    save_raw_cache_manifest(document)


def reserved_current_replay_files(document: dict[str, Any], now_epoch: float | None = None) -> set[str]:
    """Reserve one current/future marine GRIB per model area from LRU pruning."""
    reference = time.time() if now_epoch is None else float(now_epoch)
    by_collection: dict[str, list[tuple[float, str]]] = {}
    for name, row in (document.get("assets") or {}).items():
        if row.get("collection") not in MARINE_COLLECTIONS:
            continue
        valid_epoch = epoch(row.get("validTime"))
        if valid_epoch < reference - 3600 or valid_epoch > reference + 12 * 3600:
            continue
        path = RAW_DIR / str(name)
        if not path.is_file():
            continue
        by_collection.setdefault(str(row["collection"]), []).append((valid_epoch, str(name)))
    return {
        max(rows, key=lambda item: (item[0], item[1]))[1]
        for rows in by_collection.values() if rows
    }


def prune_raw_cache(max_bytes: int = RAW_CACHE_MAX_BYTES) -> dict[str, int]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_raw_cache_manifest()
    files = [path for path in RAW_DIR.iterdir() if path.is_file() and path.name != CACHE_MANIFEST_NAME]
    total = sum(path.stat().st_size for path in files)
    removed_files = 0
    removed_bytes = 0
    if total > max_bytes:
        reserved = reserved_current_replay_files(manifest)
        # Non-reserved files are removed first.  The reserve is still bounded by
        # the hard byte ceiling; fail-closed research collection must never make
        # the workflow cache unbounded.
        for path in sorted(files, key=lambda item: (item.name in reserved, item.stat().st_mtime)):
            try:
                size = path.stat().st_size
                path.unlink(missing_ok=True)
                total -= size
                removed_files += 1
                removed_bytes += size
            except OSError:
                continue
            if total <= max_bytes:
                break
    existing = {path.name for path in RAW_DIR.iterdir() if path.is_file()}
    manifest["assets"] = {
        name: row for name, row in (manifest.get("assets") or {}).items()
        if name in existing
    }
    save_raw_cache_manifest(manifest)
    return {"removedFiles": removed_files, "removedBytes": removed_bytes}

def cached_asset_path(href: str) -> pathlib.Path:
    # The object path is the stable asset identity.  Ignore query credentials if
    # DMI adds them in the future, so the same immutable GRIB cannot split into
    # multiple cache entries.
    canonical_href = href.split("?", 1)[0].split("#", 1)[0]
    suffix = pathlib.Path(canonical_href).suffix or ".grib"
    return RAW_DIR / f"{hashlib.sha256(canonical_href.encode()).hexdigest()[:24]}{suffix}"


def download_asset(
    href: str,
    expected_size: int | None,
    budget: dict[str, int],
    *,
    collection: str | None = None,
    model_run: str | None = None,
    valid_time: str | None = None,
    item_id: str | None = None,
    item_created_at: str | None = None,
    item_updated_at: str | None = None,
) -> tuple[pathlib.Path, bool]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = cached_asset_path(href)
    if path.exists() and path.stat().st_size > 0:
        capture = (
            raw_cache_source_capture(path, collection, model_run, valid_time)
            if collection and model_run and valid_time else None
        )
        expected_asset_identity = hashlib.sha256(
            href.split("?", 1)[0].split("#", 1)[0].encode("utf-8")
        ).hexdigest()
        if (
            capture
            and capture.get("itemId") == str(item_id or "").strip()
            and capture.get("assetIdentitySha256") == expected_asset_identity
        ):
            try:
                os.utime(path, None)
            except OSError:
                pass
            register_raw_cache_asset(
                path, href, collection, model_run, valid_time,
                item_id=item_id, item_created_at=item_created_at, item_updated_at=item_updated_at,
            )
            return path, True
    if expected_size and budget["bytes"] + expected_size > MAX_DOWNLOAD_BYTES:
        raise RuntimeError("DMI bulk download budget would be exceeded")
    with DOWNLOAD_SESSION.get(href, stream=True, timeout=REQUEST_TIMEOUT) as response:
        response.raise_for_status()
        content_length = int(response.headers.get("content-length", "0") or 0)
        if budget["bytes"] + content_length > MAX_DOWNLOAD_BYTES:
            raise RuntimeError("DMI bulk download budget exceeded before next asset")
        with tempfile.NamedTemporaryFile(dir=RAW_DIR, delete=False) as tmp:
            tmp_path = pathlib.Path(tmp.name)
            for chunk in response.iter_content(1024 * 1024):
                if not chunk:
                    continue
                budget["bytes"] += len(chunk)
                if budget["bytes"] > MAX_DOWNLOAD_BYTES:
                    tmp_path.unlink(missing_ok=True)
                    raise RuntimeError("DMI bulk download budget exceeded during asset download")
                tmp.write(chunk)
    tmp_path.replace(path)
    acquired_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    register_raw_cache_asset(
        path, href, collection, model_run, valid_time,
        item_id=item_id, item_created_at=item_created_at, item_updated_at=item_updated_at,
        acquired_at=acquired_at,
    )
    return path, False


def raw_cache_source_capture(
    path: pathlib.Path,
    collection: str,
    model_run: str,
    valid_time: str,
) -> dict[str, Any] | None:
    """Resolve an exact local capture without inventing STAC/acquisition facts."""
    row = (load_raw_cache_manifest().get("assets") or {}).get(path.name) or {}
    if not (
        row.get("collection") == collection
        and iso(row.get("modelRun")) == iso(model_run)
        and iso(row.get("validTime")) == iso(valid_time)
        and str(row.get("itemId") or "").strip()
        and iso(row.get("acquiredAt"))
        and re.fullmatch(r"[0-9a-f]{64}", str(row.get("assetIdentitySha256") or ""))
    ):
        return None
    capture = {
        "itemId": str(row["itemId"]),
        "assetIdentitySha256": str(row["assetIdentitySha256"]),
        "acquiredAt": iso(row["acquiredAt"]),
    }
    if iso(row.get("itemCreatedAt")):
        capture["itemCreatedAt"] = iso(row["itemCreatedAt"])
    if iso(row.get("itemUpdatedAt")):
        capture["itemUpdatedAt"] = iso(row["itemUpdatedAt"])
    return capture


def safe_get(gid: int, key: str) -> Any:
    try:
        return codes_get(gid, key)
    except Exception:
        return None


def field_signature(gid: int) -> dict[str, Any]:
    return {key: safe_get(gid, key) for key in
            ("shortName", "name", "cfName", "parameterName", "units", "typeOfLevel", "level", "paramId", "discipline", "parameterCategory", "parameterNumber", "numberOfPoints", "numberOfMissing", "minimum", "maximum", "indicatorOfParameter", "table2Version", "centre", "subCentre", "generatingProcessIdentifier", "scaledValueOfFirstFixedSurface", "typeOfFirstFixedSurface")}


def classify_parameter(gid: int, collection: str) -> str | None:
    sig = field_signature(gid)
    short = str(sig.get("shortName") or "").lower().strip()
    metadata = " ".join(str(sig.get(key) or "") for key in ("name", "cfName", "parameterName")).lower()
    level_type = str(sig.get("typeOfLevel") or "").lower()
    level = sig.get("level")
    family = COLLECTION_FAMILY[collection]

    candidates: list[str] = []
    # DMI DKSS uses local GRIB parameter ids. These numeric ids remain reliable
    # even when ecCodes cannot resolve the local shortName/name table.
    if family == "marine":
        raw_ids = {sig.get("paramId"), sig.get("indicatorOfParameter")}
        direct_ids = {
            82: "sea-mean-deviation", 3082: "sea-mean-deviation", 300082: "sea-mean-deviation",
            49: "current-u", 300049: "current-u",
            50: "current-v", 300050: "current-v",
            80: "water-temperature", 3080: "water-temperature", 300080: "water-temperature",
            33: "wind-tail-u-10m", 3033: "wind-tail-u-10m", 300033: "wind-tail-u-10m",
            34: "wind-tail-v-10m", 3034: "wind-tail-v-10m", 300034: "wind-tail-v-10m",
        }
        for raw_id in raw_ids:
            try:
                canonical = direct_ids.get(int(raw_id))
            except (TypeError, ValueError):
                canonical = None
            if canonical:
                # DKSS parameter 34 is V wind in DMI's local table, while the
                # generic ecCodes table can label the same field as `sst`.
                # The producer's local numeric id is authoritative; allowing
                # generic aliases to vote as well made the valid field
                # ambiguous and silently discarded it in production.
                return canonical
    for canonical in TARGETS[family]:
        if any(alias_matches(metadata, alias) or alias == short for alias in HINT_ALIASES.get(canonical, ())):
            candidates.append(canonical)
    # Collection-aware handling of ambiguous GRIB short names.
    if family == "marine" and short in {"u", "uo", "ucurr", "uocn", "vozocrtx"}:
        candidates.append("current-u")
    if family == "marine" and short in {"v", "vo", "vcurr", "vocn", "vomecrty"}:
        candidates.append("current-v")
    if family == "marine" and short in {"zos", "zeta", "ssh", "smd", "wlv", "sealev"}:
        candidates.append("sea-mean-deviation")
    if family == "marine" and sig.get("paramId") in {49, 50, 51, 131, 132}:
        # DMI/ecCodes local tables can expose ocean fields with generic ids; metadata still decides ambiguity below.
        if "eastward" in metadata or "u component" in metadata: candidates.append("current-u")
        if "northward" in metadata or "v component" in metadata: candidates.append("current-v")
    if family == "wind" and short in {"u", "10u", "u10", "u10m"} and (level == 10 or "heightaboveground" in level_type or "10" in metadata):
        candidates.append("wind-u-10m")
    if family == "wind" and short in {"v", "10v", "v10", "v10m"} and (level == 10 or "heightaboveground" in level_type or "10" in metadata):
        candidates.append("wind-v-10m")
    candidates = list(dict.fromkeys(candidates))
    if len(candidates) == 1:
        return candidates[0]
    return None


def valid_value(value: Any, missing: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or abs(number) > 1e19:
        return None
    try:
        if missing is not None and math.isclose(number, float(missing), rel_tol=0, abs_tol=1e-12):
            return None
    except (TypeError, ValueError):
        pass
    return number


def runtime_remaining() -> float:
    return WORK_DEADLINE - time.monotonic()


def should_stop_work() -> bool:
    return runtime_remaining() <= 0


def progress(message: str) -> None:
    elapsed = time.monotonic() - STARTED
    print(f"[DMI bulk +{elapsed:6.1f}s] {message}", flush=True)


def grid_signature(gid: int) -> tuple[Any, ...]:
    keys = (
        "gridType", "Ni", "Nj", "numberOfPoints",
        "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
        "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
        "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees",
    )
    return tuple(safe_get(gid, key) for key in keys)


def grid_definition_sha256(gid: int) -> str:
    canonical = json.dumps(grid_signature(gid), ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def nearest_candidates(gid: int, collection: str, zone: dict[str, Any]) -> list[dict[str, Any]]:
    """Find flere mulige havpunkter uden at antage, at de fire nærmeste er gyldige.

    ecCodes returnerer højst fire punkter pr. opslag på flere grids. Derfor probes
    et lille mønster omkring zonens datapunkt, kandidater deduplikeres på gridindeks,
    og den reelle afstand tilbage til zonen beregnes. Ingen kandidat accepteres alene
    fordi den ligger tæt på et probe-punkt.
    """
    # Atmosfæriske grids (HARMONIE) er komplette land/hav-grids og kræver ikke
    # den dyre marine kyst-probing. Ét nearest-opslag pr. zone/grid er nok og
    # genbruges på tværs af alle forecast-tider via GRID_INDEX_CACHE.
    if collection in MARINE_COLLECTIONS:
        candidate_target = LIMFJORD_GRID_CANDIDATE_TARGET if zone.get("coastType") == "limfjord" else GRID_CANDIDATE_TARGET
    else:
        candidate_target = ATMOSPHERIC_GRID_CANDIDATE_TARGET
    cache_key = (collection, grid_signature(gid), zone["id"], candidate_target)
    cached = GRID_INDEX_CACHE.get(cache_key)
    if cached is not None:
        return cached
    if collection not in MARINE_COLLECTIONS and candidate_target == 4:
        try:
            candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], npoints=4)
        except TypeError:
            candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], False, 4)
        except Exception:
            candidates = []
        if isinstance(candidates, dict):
            candidates = [candidates]
        direct = []
        for candidate in candidates or []:
            try:
                direct.append({
                    "index": int(candidate.get("index")),
                    "latitude": float(candidate.get("lat")),
                    "longitude": float(candidate.get("lon")),
                    "distanceKm": haversine_km(zone["lat"], zone["lon"], float(candidate.get("lat")), float(candidate.get("lon"))),
                })
            except (TypeError, ValueError):
                continue
        normalized = sorted(direct, key=lambda item: item["distanceKm"])[:candidate_target]
        GRID_INDEX_CACHE[cache_key] = normalized
        return normalized
    probes = [(0.0, 0.0)]
    # Limfjorden har smalle løb og landmasker, hvor et gyldigt fælles U/V-havpunkt
    # kan ligge markant længere øst/vest end de første 16 kandidater. Den fysiske
    # acceptgrænse er fortsat MAX_GRID_DISTANCE_KM (24 km); vi gør kun søgningen
    # bred nok til faktisk at kunne finde kandidater inden for den eksisterende grænse.
    if collection not in MARINE_COLLECTIONS:
        radii = (0.025, 0.05, 0.09, 0.14)
    else:
        radii = (0.025, 0.05, 0.09, 0.14, 0.20, 0.26) if zone.get("coastType") == "limfjord" else (0.025, 0.05, 0.09, 0.14)
    for radius in radii:
        probes.extend((dlat * radius, dlon * radius) for dlat, dlon in (
            (1, 0), (-1, 0), (0, 1), (0, -1),
            (0.707, 0.707), (0.707, -0.707), (-0.707, 0.707), (-0.707, -0.707),
        ))
    by_index: dict[int, dict[str, Any]] = {}
    for dlat, dlon in probes:
        try:
            candidates = codes_grib_find_nearest(gid, zone["lat"] + dlat, zone["lon"] + dlon, npoints=4)
        except TypeError:
            candidates = codes_grib_find_nearest(gid, zone["lat"] + dlat, zone["lon"] + dlon, False, 4)
        except Exception:
            candidates = []
        if isinstance(candidates, dict):
            candidates = [candidates]
        for candidate in candidates or []:
            try:
                index = int(candidate.get("index"))
                lat = float(candidate.get("lat"))
                lon = float(candidate.get("lon"))
                distance = haversine_km(zone["lat"], zone["lon"], lat, lon)
            except (TypeError, ValueError):
                continue
            prior = by_index.get(index)
            if prior is None or distance < prior["distanceKm"]:
                by_index[index] = {"index": index, "latitude": lat, "longitude": lon, "distanceKm": distance}
    normalized = sorted(by_index.values(), key=lambda item: item["distanceKm"])[:candidate_target]
    GRID_INDEX_CACHE[cache_key] = normalized
    return normalized


def warm_atmospheric_grid_cache(gid: int, collection: str, zones: list[dict[str, Any]]) -> None:
    """Resolve every HARMONIE point from one grid-coordinate scan.

    HARMONIE is a complete atmospheric grid, so one nearest cell is sufficient.
    Calling ``codes_grib_find_nearest`` separately for the national part registry
    made the first wind field exceed the entire workflow budget. ecCodes' native
    multi-point helper repeats the same costly nearest search internally, so read
    the grid coordinates once, bucket only the Denmark-sized bounding box and
    resolve every registry point against nearby buckets. Marine and wave grids
    deliberately retain their broader missing-value/land-mask candidate search.
    """
    if collection != "harmonie_dini_sf" or not zones:
        return
    signature = grid_signature(gid)
    warm_key = (collection, signature, ATMOSPHERIC_GRID_CANDIDATE_TARGET)
    if warm_key in GRID_BATCH_WARMED:
        return
    try:
        latitudes = codes_get_array(gid, "latitudes")
        longitudes = codes_get_array(gid, "longitudes")
    except Exception as exc:
        progress(f"HARMONIE-gridkoordinater kunne ikke læses; bruger enkeltopslag: {exc}")
        GRID_BATCH_WARMED.add(warm_key)
        return
    bucket_size = 0.1
    min_lat = min(float(zone["lat"]) for zone in zones) - 0.3
    max_lat = max(float(zone["lat"]) for zone in zones) + 0.3
    min_lon = min(float(zone["lon"]) for zone in zones) - 0.5
    max_lon = max(float(zone["lon"]) for zone in zones) + 0.5
    buckets: dict[tuple[int, int], list[tuple[int, float, float]]] = {}
    for index, (raw_lat, raw_lon) in enumerate(zip(latitudes, longitudes)):
        lat, lon = float(raw_lat), float(raw_lon)
        if lat < min_lat or lat > max_lat or lon < min_lon or lon > max_lon:
            continue
        key = (math.floor(lat / bucket_size), math.floor(lon / bucket_size))
        buckets.setdefault(key, []).append((index, lat, lon))
    for zone in zones:
        zone_lat, zone_lon = float(zone["lat"]), float(zone["lon"])
        center = (math.floor(zone_lat / bucket_size), math.floor(zone_lon / bucket_size))
        nearby: list[tuple[int, float, float]] = []
        for radius in range(1, 4):
            nearby = []
            for lat_bin in range(center[0] - radius, center[0] + radius + 1):
                for lon_bin in range(center[1] - radius, center[1] + radius + 1):
                    nearby.extend(buckets.get((lat_bin, lon_bin), ()))
            if nearby:
                break
        if not nearby:
            continue
        nearest = sorted(
            nearby,
            key=lambda item: haversine_km(zone_lat, zone_lon, item[1], item[2]),
        )[:ATMOSPHERIC_GRID_CANDIDATE_TARGET]
        cache_key = (collection, signature, zone["id"], ATMOSPHERIC_GRID_CANDIDATE_TARGET)
        GRID_INDEX_CACHE[cache_key] = [
            {
                "index": index,
                "latitude": lat,
                "longitude": lon,
                "distanceKm": haversine_km(zone_lat, zone_lon, lat, lon),
            }
            for index, lat, lon in nearest
        ]
    GRID_BATCH_WARMED.add(warm_key)

def valid_candidates_batch(gid: int, collection: str, zones: list[dict[str, Any]]) -> dict[str, list[dict[str, float]]]:
    """Returner alle gyldige kandidater pr. zone for et GRIB-felt.

    Vektorkomponenter må ikke hver for sig vælge deres nærmeste gyldige punkt.
    Denne funktion bevarer kandidatlisten, så U og V efterfølgende kan vælge det
    nærmeste *fælles* fysiske gitterpunkt.
    """
    warm_atmospheric_grid_cache(gid, collection, zones)
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(gid, collection, zone)
        candidates_by_zone[zone["id"]] = candidates
        for candidate in candidates:
            index = int(candidate["index"])
            if index not in seen:
                seen.add(index)
                unique_indices.append(index)
    if not unique_indices:
        return {}
    try:
        raw_values = codes_get_elements(gid, "values", unique_indices)
    except Exception:
        return {}
    values = {index: raw_values[pos] for pos, index in enumerate(unique_indices)}
    definition_sha256 = grid_definition_sha256(gid)
    resolved: dict[str, list[dict[str, float]]] = {}
    for zone_id, candidates in candidates_by_zone.items():
        rows = []
        for candidate in candidates:
            number = valid_value(values.get(int(candidate["index"])), missing)
            if number is None:
                continue
            rows.append({
                "index": int(candidate["index"]),
                "value": number,
                "latitude": candidate["latitude"],
                "longitude": candidate["longitude"],
                "distanceKm": candidate["distanceKm"],
                "gridDefinitionSha256": definition_sha256,
            })
        if rows:
            resolved[zone_id] = rows
    return resolved


def nearest_valid_batch(gid: int, collection: str, zones: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Resolve all zone values with one ecCodes array lookup per GRIB message.

    Candidate indices remain tied to the current zone-registry hash through the
    processing signature. Moving a land/data point therefore forces a rebuild,
    while repeated forecast steps on the same grid reuse the nearest-index map.
    """
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(gid, collection, zone)
        candidates_by_zone[zone["id"]] = candidates
        for candidate in candidates:
            index = int(candidate["index"])
            if index not in seen:
                seen.add(index)
                unique_indices.append(index)
    if not unique_indices:
        return {}
    try:
        raw_values = codes_get_elements(gid, "values", unique_indices)
    except Exception:
        return {}
    values = {index: raw_values[pos] for pos, index in enumerate(unique_indices)}
    definition_sha256 = grid_definition_sha256(gid)
    resolved: dict[str, dict[str, float]] = {}
    for zone_id, candidates in candidates_by_zone.items():
        for candidate in candidates:
            number = valid_value(values.get(int(candidate["index"])), missing)
            if number is not None:
                resolved[zone_id] = {
                    "value": number,
                    "latitude": candidate["latitude"],
                    "longitude": candidate["longitude"],
                    "distanceKm": candidate["distanceKm"],
                    "index": int(candidate["index"]),
                    "gridDefinitionSha256": definition_sha256,
                }
                break
    return resolved


def relevant_zones(collection: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Marine collections må overlappe. coastType bestemmer prioritet og afstandsgrænse,
    # men må ikke længere blokere en alternativ DMI-model med et bedre gyldigt havpunkt.
    if collection in MARINE_COLLECTIONS:
        return zones
    if collection == "wam_nsb":
        return [z for z in zones if z["coastType"] == "west"]
    if collection == "wam_dw":
        return [z for z in zones if z["coastType"] != "west"]
    return zones


def marine_model_score(zone: dict[str, Any], collection: str, distance_km: float) -> float:
    coast = zone.get("coastType") or "east"
    penalty = MARINE_MODEL_PENALTY_KM.get(coast, MARINE_MODEL_PENALTY_KM["east"]).get(collection, 25.0)
    return float(distance_km) + float(penalty)


def has_current_anchor(point: dict[str, Any], reference_time: str, tolerance_hours: float = 6.0) -> bool:
    reference = epoch(reference_time)
    if not reference:
        return False
    tolerance = float(tolerance_hours) * 3600.0
    return any(
        isinstance(hour.get("current-u"), (int, float))
        and isinstance(hour.get("current-v"), (int, float))
        and abs(epoch(valid_time) - reference) <= tolerance
        for valid_time, hour in (point.get("hourly") or {}).items()
        if epoch(valid_time)
    )


def prefer_current_hour_candidate(
    point: dict[str, Any],
    valid_time: str,
    collection: str,
    model_run: str,
    candidate_choice: dict[str, Any],
    distance_tolerance_km: float = 1e-6,
) -> bool:
    """Choose current independently for one native forecast time.

    Scalar marine fields may legitimately prefer a coast-type model, but that
    model prior must never block a closer exact U/V water column.  Comparing at
    the native time also prevents a late candidate from clearing a sound series
    around now.  Forecast interpolation remains responsible for rejecting
    transitions across collection, run, grid point or vertical layer.
    """
    candidate_distance = float(candidate_choice["distanceKm"])
    if not math.isfinite(candidate_distance) or candidate_distance > CURRENT_MAX_DISTANCE_KM:
        return False
    hour = (point.get("hourly") or {}).get(valid_time) or {}
    existing_u = hour.get("current-u")
    existing_v = hour.get("current-v")
    source = (hour.get("sources") or {}).get("current") or {}
    existing_grid = source.get("gridPoint")
    if not (
        isinstance(existing_u, (int, float)) and math.isfinite(float(existing_u))
        and isinstance(existing_v, (int, float)) and math.isfinite(float(existing_v))
        and isinstance(existing_grid, list) and len(existing_grid) >= 2
        and all(isinstance(value, (int, float)) and math.isfinite(float(value)) for value in existing_grid[:2])
        and isinstance(source.get("distanceKm"), (int, float))
        and math.isfinite(float(source["distanceKm"]))
    ):
        return True

    existing_distance = float(source["distanceKm"])
    candidate_point = tuple(candidate_choice["pointKey"])
    existing_point = (round(float(existing_grid[1]), 7), round(float(existing_grid[0]), 7))
    if candidate_point != existing_point:
        if candidate_distance < existing_distance - distance_tolerance_km:
            return True
        if candidate_distance > existing_distance + distance_tolerance_km:
            return False
        return candidate_point < existing_point

    candidate_layer_rank = float(candidate_choice.get("layerRank") or 0.0)
    existing_layer_rank = float(source.get("verticalLayerRankM") or 0.0)
    if candidate_layer_rank != existing_layer_rank:
        return candidate_layer_rank > existing_layer_rank

    existing_run = str(source.get("modelRun") or "")
    if epoch(model_run) != epoch(existing_run):
        return epoch(model_run) > epoch(existing_run)
    existing_collection = str(source.get("collection") or "")
    if existing_collection != collection:
        existing_order = COLLECTION_ORDER.index(existing_collection) if existing_collection in COLLECTION_ORDER else len(COLLECTION_ORDER)
        return COLLECTION_ORDER.index(collection) < existing_order
    return False


def accept_marine_collection(
    point: dict[str, Any],
    zone: dict[str, Any],
    collection: str,
    distance_km: float,
    allow_existing_selection_update: bool = True,
    candidate_valid_time: str | None = None,
    reference_time: str | None = None,
) -> bool:
    coast = zone.get("coastType") or "east"
    if distance_km > MAX_GRID_DISTANCE_KM.get(coast, 32.0):
        return False
    selection = point.get("marineSelection") or {}
    # Vandstand, temperatur og andre skalare marinefelter må følge den allerede
    # valgte havmodel, men må ikke genvælge modellen på deres eget gitterpunkt.
    # Ellers kan ét lidt nærmere skalarfelt rydde en komplet strømserie, selv om
    # kandidatmodellen ikke har et gyldigt fælles U/V-par ved samme forecasttid.
    if selection and not allow_existing_selection_update:
        return selection.get("collection") == collection
    # Et sent halepar må ikke genvælge hele havmodellen og dermed rydde en
    # eksisterende strømserie omkring nu. En bedre model kan stadig overtage,
    # når dens eget fælles U/V-par også ligger i det aktuelle anker-vindue.
    if (
        selection.get("collection") != collection
        and candidate_valid_time
        and reference_time
        and has_current_anchor(point, reference_time)
        and abs(epoch(candidate_valid_time) - epoch(reference_time)) > 6.0 * 3600.0
    ):
        return False
    score = marine_model_score(zone, collection, distance_km)
    current_score = selection.get("score")
    if current_score is not None and float(current_score) <= score and selection.get("collection") != collection:
        return False
    if selection.get("collection") != collection:
        for hour in (point.get("hourly") or {}).values():
            for key in MARINE_SCALAR_PARAMETERS:
                hour.pop(key, None)
                component = PARAMETER_COMPONENT.get(key)
                if component:
                    (hour.get("sources") or {}).pop(component, None)
        for key in MARINE_SCALAR_PARAMETERS:
            (point.get("gridPoints") or {}).pop(key, None)
            (point.get("collections") or {}).pop(key, None)
    point["marineSelection"] = {
        "collection": collection, "score": round(score, 3),
        "distanceKm": round(distance_km, 3), "coastType": coast,
        "modelPenaltyKm": MARINE_MODEL_PENALTY_KM.get(coast, {}).get(collection, 25.0),
    }
    return True


def parameter_zones(collection: str, parameter: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Afgræns sampling efter faktisk databehov.

    Vandstandskilder er hjælpepunkter til DKSS-vandstand. De er ikke forecastzoner
    og må derfor ikke forbruge opslag på strøm, vind, bølger eller temperatur.
    """
    research = [
        zone for zone in zones
        if zone.get("researchCurrent")
        and (not zone.get("requiredCollection") or zone.get("requiredCollection") == collection)
    ]
    regular = [zone for zone in zones if not zone.get("waterSource") and not zone.get("researchCurrent")]
    sources = [zone for zone in zones if zone.get("waterSource")]
    base_regular = relevant_zones(collection, regular)
    if collection in MARINE_COLLECTIONS and parameter in {"current-u", "current-v"}:
        return base_regular + relevant_zones(collection, research)
    if collection in MARINE_COLLECTIONS and water_source_parameter_allowed(parameter):
        return base_regular + sources
    return base_regular


def candidate_cell_key(candidate: dict[str, Any]) -> tuple[str, float, float] | None:
    definition = str(candidate.get("gridDefinitionSha256") or "")
    latitude, longitude = candidate.get("latitude"), candidate.get("longitude")
    if not (
        re.fullmatch(r"[0-9a-f]{64}", definition)
        and isinstance(latitude, (int, float)) and math.isfinite(float(latitude))
        and isinstance(longitude, (int, float)) and math.isfinite(float(longitude))
    ):
        return None
    return definition, round(float(latitude), 7), round(float(longitude), 7)


def select_common_grid_tuple(
    candidates_by_parameter: dict[str, list[dict[str, Any]]],
    required_parameters: tuple[str, ...],
) -> dict[str, dict[str, Any]] | None:
    """Select one exact grid definition/cell shared by every required field."""
    indexed: dict[str, dict[tuple[str, float, float], dict[str, Any]]] = {}
    for parameter in required_parameters:
        rows: dict[tuple[str, float, float], dict[str, Any]] = {}
        for candidate in candidates_by_parameter.get(parameter) or []:
            key = candidate_cell_key(candidate)
            if key is None:
                continue
            previous = rows.get(key)
            if previous is None or float(candidate["distanceKm"]) < float(previous["distanceKm"]):
                rows[key] = candidate
        if not rows:
            return None
        indexed[parameter] = rows
    common = set.intersection(*(set(indexed[parameter]) for parameter in required_parameters))
    if not common:
        return None
    selected_key = min(
        common,
        key=lambda key: (
            max(float(indexed[parameter][key]["distanceKm"]) for parameter in required_parameters),
            key,
        ),
    )
    return {parameter: indexed[parameter][selected_key] for parameter in required_parameters}


def native_component_source(
    collection: str,
    model_run: str,
    valid_time: str,
    *,
    component: str,
    zone: dict[str, Any],
    grid_candidate: dict[str, Any],
    capture: dict[str, Any] | None,
    spatial_selection: str,
    optional_field_set: tuple[str, ...] = (),
    **extra: Any,
) -> dict[str, Any] | None:
    identity = sampling_identity(zone)
    cell_key = candidate_cell_key(grid_candidate)
    run_iso, valid_iso = iso(model_run), iso(valid_time)
    optional_fields = tuple(optional_field_set)
    item_id = str((capture or {}).get("itemId") or "").strip()
    asset_identity = str((capture or {}).get("assetIdentitySha256") or "")
    acquired_at = iso((capture or {}).get("acquiredAt"))
    item_created_at = iso((capture or {}).get("itemCreatedAt"))
    item_updated_at = iso((capture or {}).get("itemUpdatedAt"))
    physical_distance = (
        haversine_km(
            float(zone["lat"]), float(zone["lon"]),
            float(grid_candidate.get("latitude")), float(grid_candidate.get("longitude")),
        )
        if identity and cell_key else None
    )
    if not (
        identity
        and cell_key
        and capture
        and component_collection_allowed(component, collection)
        and component in COMPONENT_FIELD_SET
        and spatial_selection == COMPONENT_SPATIAL_SELECTION[component]
        and (
            optional_fields in {(), ("mean-wave-dir",)} if component == "wave"
            else optional_fields == ()
        )
        and run_iso and valid_iso
        and epoch(valid_iso) >= epoch(run_iso)
        and isinstance(grid_candidate.get("distanceKm"), (int, float))
        and math.isfinite(float(grid_candidate["distanceKm"]))
        and float(grid_candidate["distanceKm"]) >= 0
        and physical_distance is not None
        and math.isclose(float(grid_candidate["distanceKm"]), physical_distance, rel_tol=0, abs_tol=0.02)
        and item_id
        and re.fullmatch(r"[0-9a-f]{64}", asset_identity)
        and acquired_at
        and ((capture or {}).get("itemCreatedAt") is None or item_created_at)
        and ((capture or {}).get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    definition, latitude, longitude = cell_key
    return {
        "provider": "dmi",
        "fallback": False,
        "collection": collection,
        "collectionFamily": COLLECTION_FAMILY[collection],
        "component": component,
        "componentKind": COMPONENT_KIND[component],
        "fieldSet": list(COMPONENT_FIELD_SET[component]),
        "optionalFieldSet": list(optional_fields),
        "modelRun": run_iso,
        "nativeValidTime": valid_iso,
        "leadTimeHours": round((epoch(valid_iso) - epoch(run_iso)) / 3600.0, 3),
        **identity,
        "gridPoint": [longitude, latitude],
        "gridDefinitionSha256": definition,
        "distanceKm": round(float(grid_candidate["distanceKm"]), 5),
        "spatialSelection": spatial_selection,
        "spatialSemanticsVersion": SPATIAL_PROVENANCE_VERSION,
        "itemId": item_id,
        "assetIdentitySha256": asset_identity,
        "acquiredAt": acquired_at,
        **({"itemCreatedAt": item_created_at} if item_created_at else {}),
        **({"itemUpdatedAt": item_updated_at} if item_updated_at else {}),
        **extra,
    }


def process_grib(path: pathlib.Path, collection: str, model_run: str, valid_time: str,
                 zones: list[dict[str, Any]], output: dict[str, Any], diagnostics: dict[str, Any],
                 current_shadow: dict[str, Any] | None = None,
                 private_stage_output: dict[str, Any] | None = None) -> tuple[set[str], set[str], bool, int, int]:
    found, touched = set(), set()
    vector_candidates: dict[tuple[str, str, str], dict[str, list[dict[str, Any]]]] = {}
    scalar_tuple_candidates: dict[tuple[str, str], dict[str, list[dict[str, Any]]]] = {}
    selected_vector_choices: dict[tuple[str, str], dict[str, Any]] = {}
    research_vector_choices: dict[str, list[dict[str, Any]]] = {}
    research_target_by_id = {
        str(zone["id"]): zone for zone in zones
        if zone.get("researchCurrent")
        and (not zone.get("requiredCollection") or zone.get("requiredCollection") == collection)
    }
    zone_by_id = {str(zone.get("id")): zone for zone in zones if zone.get("id")}
    source_capture = raw_cache_source_capture(path, collection, model_run, valid_time)
    inventory = diagnostics.setdefault("gribFieldInventory", {}).setdefault(collection, {})
    persistent_inventory = diagnostics.setdefault("persistentFieldInventory", {}).setdefault(collection, {
        "capturedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "parserVersion": PARSER_VERSION,
        "fields": {},
    })
    persistent_inventory["capturedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    persistent_inventory["parserVersion"] = PARSER_VERSION
    persistent_fields = persistent_inventory.setdefault("fields", {})
    messages_seen = 0
    zone_lookups = 0
    interrupted = False
    with path.open("rb") as handle:
        while True:
            if should_stop_work():
                interrupted = True
                break
            gid = codes_grib_new_from_file(handle)
            if gid is None:
                break
            messages_seen += 1
            try:
                sig = field_signature(gid)
                sig_key = "|".join(str(sig.get(k) or "") for k in ("shortName", "name", "units", "typeOfLevel", "level", "paramId"))
                if sig_key not in inventory and len(inventory) < 120:
                    inventory[sig_key] = {**sig, "messagesSeen": 1}
                elif sig_key in inventory:
                    inventory[sig_key]["messagesSeen"] = int(inventory[sig_key].get("messagesSeen") or 0) + 1
                if sig_key not in persistent_fields and len(persistent_fields) < 240:
                    persistent_fields[sig_key] = {**sig, "messagesSeen": 1}
                elif sig_key in persistent_fields:
                    persistent_fields[sig_key]["messagesSeen"] = int(persistent_fields[sig_key].get("messagesSeen") or 0) + 1
                parameter = classify_parameter(gid, collection)
                if not parameter:
                    continue
                scalar_layer = None
                if parameter == "water-temperature":
                    scalar_layer = water_temperature_surface_layer(
                        safe_get(gid, "typeOfLevel"), safe_get(gid, "level")
                    )
                    if scalar_layer is None:
                        diagnostics["rejectedNonSurfaceWaterTemperatureMessages"] = int(
                            diagnostics.get("rejectedNonSurfaceWaterTemperatureMessages") or 0
                        ) + 1
                        continue
                found.add(parameter)
                wanted = parameter_zones(collection, parameter, zones)
                zone_lookups += len(wanted)
                if parameter in VECTOR_PAIRS:
                    candidates = valid_candidates_batch(gid, collection, wanted)
                    diagnostics["batchedGridReads"] = int(diagnostics.get("batchedGridReads") or 0) + 1
                    family, first_key, second_key = VECTOR_PAIRS[parameter]
                    layer_key, layer_rank = vector_vertical_layer(family, safe_get(gid, "typeOfLevel"), safe_get(gid, "level"))
                    for zone in wanted:
                        zone_candidates = candidates.get(zone["id"]) or []
                        cache = vector_candidates.setdefault((family, zone["id"], layer_key), {})
                        cache[parameter] = zone_candidates
                        if first_key not in cache or second_key not in cache:
                            continue
                        grid_tuple = select_common_grid_tuple(cache, (first_key, second_key))
                        if not grid_tuple:
                            if family in {"current", "wind-tail"}:
                                search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                                    "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                                })
                                vector_search = search.setdefault("vectorPairs", {}).setdefault(family, {})
                                vector_search["validUCandidates"] = len(cache[first_key])
                                vector_search["validVCandidates"] = len(cache[second_key])
                                vector_search["rejectedReason"] = "NO_SHARED_UV_GRID_POINT"
                                if family == "current":
                                    # Preserve the established top-level diagnostic contract.
                                    search["rejectedReason"] = "NO_SHARED_UV_GRID_POINT"
                            continue
                        first, second = grid_tuple[first_key], grid_tuple[second_key]
                        selection_key = (family, zone["id"])
                        candidate_choice = vector_choice(first, second, layer_key, layer_rank)
                        if family == "current" and zone.get("researchCurrent"):
                            research_vector_choices.setdefault(str(zone["id"]), []).append(candidate_choice)
                            continue
                        previous_choice = selected_vector_choices.get(selection_key)
                        # Strøm: vælg først den nærmeste gyldige vandkolonne og
                        # derefter dens dybeste fælles U/V-lag. Vind har kun ét lag.
                        if not prefer_vector_choice(previous_choice, candidate_choice):
                            continue
                        distance = float(candidate_choice["distanceKm"])
                        destination = private_stage_output if zone.get("privateStage") else output
                        if destination is None:
                            continue
                        point = destination["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                        if family == "current":
                            search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                                "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                            })
                            search["candidatesExamined"] = max(int(search.get("candidatesExamined") or 0), len(cache[first_key]), len(cache[second_key]))
                            old_distance = search.get("nearestValidDistanceKm")
                            search["nearestValidDistanceKm"] = round(distance if old_distance is None else min(float(old_distance), distance), 3)
                            for key in (first_key, second_key):
                                if key not in search["parametersFound"]:
                                    search["parametersFound"].append(key)
                            if distance > CURRENT_MAX_DISTANCE_KM:
                                search["rejectedReason"] = "CURRENT_POINT_OVER_5KM"
                                continue
                            if not prefer_current_hour_candidate(
                                point,
                                valid_time,
                                collection,
                                model_run,
                                candidate_choice,
                            ):
                                search["rejectedReason"] = "CLOSER_CURRENT_COLUMN_SELECTED_FOR_NATIVE_TIME"
                                continue
                            search["selected"] = True
                            search["verticalLayer"] = layer_key
                            search["verticalLayerRankM"] = round(layer_rank, 3)
                            search["distanceBand"] = "preferred-0-3km" if distance <= CURRENT_PREFERRED_DISTANCE_KM else "accepted-3-5km"
                            search.pop("rejectedReason", None)
                        if family == "wind-tail":
                            search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                                "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                            })
                            vector_search = search.setdefault("vectorPairs", {}).setdefault(family, {})
                            vector_search.update({
                                "selected": True,
                                "distanceKm": round(distance, 3),
                                "validUCandidates": len(cache[first_key]),
                                "validVCandidates": len(cache[second_key]),
                            })
                            vector_search.pop("rejectedReason", None)
                            if distance > MAX_GRID_DISTANCE_KM.get(zone.get("coastType") or "east", 32.0):
                                vector_search["selected"] = False
                                vector_search["rejectedReason"] = "VALID_POINT_TOO_FAR"
                                continue
                            selected_collection = (point.get("marineSelection") or {}).get("collection")
                            if selected_collection and selected_collection != collection:
                                vector_search["selected"] = False
                                vector_search["rejectedReason"] = "DIFFERENT_MARINE_COLLECTION_SELECTED"
                                continue
                            if not selected_collection and not accept_marine_collection(point, zone, collection, distance):
                                vector_search["selected"] = False
                                vector_search["rejectedReason"] = "BETTER_COLLECTION_SELECTED"
                                continue
                        selected_vector_choices[selection_key] = candidate_choice
                        if not zone.get("privateStage"):
                            touched.add(zone["id"])
                        hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
                        for key, candidate in ((first_key, first), (second_key, second)):
                            hour[key] = candidate["value"]
                            point["gridPoints"][key] = {
                                **{k: round(v, 5) for k, v in candidate.items() if k not in {"value", "index"}},
                                "verticalLayer": layer_key,
                                "verticalLayerRankM": round(layer_rank, 3),
                            }
                            point["collections"][key] = collection
                        source_extra = {
                            "vectorSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
                            "vectorSemanticsVersion": 1,
                        }
                        if family == "current":
                            source_extra = {
                                "verticalLayer": layer_key,
                                "verticalLayerRankM": round(layer_rank, 3),
                                "vectorSelection": CURRENT_VECTOR_SELECTION,
                                "vectorSemanticsVersion": CURRENT_VECTOR_SEMANTICS_VERSION,
                            }
                        component = PARAMETER_COMPONENT[first_key]
                        source = native_component_source(
                            collection,
                            model_run,
                            valid_time,
                            component=component,
                            zone=zone,
                            grid_candidate=first,
                            capture=source_capture,
                            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
                            **source_extra,
                        )
                        if source:
                            hour.setdefault("sources", {})[component] = source
                        else:
                            (hour.get("sources") or {}).pop(component, None)
                    continue

                if parameter in {"significant-wave-height", "mean-wave-dir", "dominant-wave-period"}:
                    candidates = valid_candidates_batch(gid, collection, wanted)
                    diagnostics["batchedGridReads"] = int(diagnostics.get("batchedGridReads") or 0) + 1
                    for zone in wanted:
                        zone_candidates = candidates.get(zone["id"]) or []
                        if zone_candidates:
                            scalar_tuple_candidates.setdefault(("wave", str(zone["id"])), {})[parameter] = zone_candidates
                    continue

                resolved = nearest_valid_batch(gid, collection, wanted)
                diagnostics["batchedGridReads"] = int(diagnostics.get("batchedGridReads") or 0) + 1
                for zone in wanted:
                    nearest = resolved.get(zone["id"])
                    if not nearest:
                        continue
                    destination = private_stage_output if zone.get("privateStage") else output
                    if destination is None:
                        continue
                    point = destination["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                    if collection in MARINE_COLLECTIONS and parameter in MARINE_PARAMETERS:
                        search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                            "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                        })
                        search["candidatesExamined"] = max(int(search.get("candidatesExamined") or 0), len(nearest_candidates(gid, collection, zone)))
                        old_distance = search.get("nearestValidDistanceKm")
                        distance = float(nearest["distanceKm"])
                        search["nearestValidDistanceKm"] = round(distance if old_distance is None else min(float(old_distance), distance), 3)
                        if parameter not in search["parametersFound"]:
                            search["parametersFound"].append(parameter)
                        if distance > MAX_GRID_DISTANCE_KM.get(zone.get("coastType") or "east", 32.0):
                            search["rejectedReason"] = "VALID_POINT_TOO_FAR"
                            continue
                        if not accept_marine_collection(
                            point,
                            zone,
                            collection,
                            distance,
                            allow_existing_selection_update=False,
                        ):
                            search["rejectedReason"] = "BETTER_COLLECTION_SELECTED"
                            continue
                        search["selected"] = True
                    if not zone.get("privateStage"):
                        touched.add(zone["id"])
                    hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
                    hour[parameter] = nearest["value"]
                    component = PARAMETER_COMPONENT[parameter]
                    source_extra = {}
                    point_extra = {}
                    if parameter == "water-temperature" and scalar_layer is not None:
                        layer_key, layer_rank = scalar_layer
                        source_extra = {"verticalLayer": layer_key, "verticalLayerRankM": layer_rank}
                        point_extra = source_extra
                    source = native_component_source(
                        collection,
                        model_run,
                        valid_time,
                        component=component,
                        zone=zone,
                        grid_candidate=nearest,
                        capture=source_capture,
                        spatial_selection="nearest-valid-grid-cell-no-spatial-interpolation",
                        **source_extra,
                    )
                    if source:
                        hour.setdefault("sources", {})[component] = source
                    else:
                        (hour.get("sources") or {}).pop(component, None)
                    point["gridPoints"][parameter] = {
                        **{k: round(v, 5) for k, v in nearest.items() if k != "value"},
                        **point_extra,
                    }
                    point["collections"][parameter] = collection
                if interrupted:
                    break
            finally:
                codes_release(gid)
    # Wave height and period are one score-bearing physical tuple. Finalise only
    # after all GRIB messages have been inspected, and retain direction only when
    # its field resolves to that same exact grid definition/cell.
    for (component, zone_id), candidates_by_parameter in scalar_tuple_candidates.items():
        if component != "wave":
            continue
        zone = zone_by_id.get(zone_id)
        if not zone:
            continue
        required = COMPONENT_FIELD_SET["wave"]
        selected = select_common_grid_tuple(candidates_by_parameter, required)
        if not selected:
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "NO_SHARED_HEIGHT_PERIOD_GRID_CELL"
            continue
        height = selected["significant-wave-height"]
        period = selected["dominant-wave-period"]
        distance = max(float(height["distanceKm"]), float(period["distanceKm"]))
        if distance > MAX_GRID_DISTANCE_KM.get(zone.get("coastType") or "east", 32.0):
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "VALID_POINT_TOO_FAR"
            continue
        destination = private_stage_output if zone.get("privateStage") else output
        if destination is None:
            continue
        point = destination["zones"].setdefault(zone_id, {"hourly": {}, "gridPoints": {}, "collections": {}})
        hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
        hour["significant-wave-height"] = height["value"]
        hour["dominant-wave-period"] = period["value"]
        hour.pop("mean-wave-dir", None)
        optional_fields: tuple[str, ...] = ()
        direction_by_cell = {
            candidate_cell_key(candidate): candidate
            for candidate in candidates_by_parameter.get("mean-wave-dir") or []
            if candidate_cell_key(candidate) is not None
        }
        direction = direction_by_cell.get(candidate_cell_key(height))
        if direction is not None:
            hour["mean-wave-dir"] = direction["value"]
            optional_fields = ("mean-wave-dir",)
        for parameter, candidate in (("significant-wave-height", height), ("dominant-wave-period", period)):
            point["gridPoints"][parameter] = {
                **{key: round(value, 5) if isinstance(value, (int, float)) else value for key, value in candidate.items() if key not in {"value", "index"}},
            }
            point["collections"][parameter] = collection
        if direction is not None:
            point["gridPoints"]["mean-wave-dir"] = {
                **{key: round(value, 5) if isinstance(value, (int, float)) else value for key, value in direction.items() if key not in {"value", "index"}},
            }
            point["collections"]["mean-wave-dir"] = collection
        else:
            point["gridPoints"].pop("mean-wave-dir", None)
            point["collections"].pop("mean-wave-dir", None)
        source = native_component_source(
            collection,
            model_run,
            valid_time,
            component="wave",
            zone=zone,
            grid_candidate=height,
            capture=source_capture,
            spatial_selection="nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation",
            optional_field_set=optional_fields,
        )
        if source:
            hour.setdefault("sources", {})["wave"] = source
        else:
            (hour.get("sources") or {}).pop("wave", None)
        if not zone.get("privateStage"):
            touched.add(zone_id)
    if (
        current_shadow is not None
        and research_target_by_id
        and not interrupted
        and {"current-u", "current-v"} <= found
    ):
        written = record_current_field_profiles(
            current_shadow,
            research_target_by_id,
            research_vector_choices,
            collection,
            model_run,
            valid_time,
            str(output.get("generatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")),
        )
        diagnostics["currentFieldShadowSamplesWritten"] = int(
            diagnostics.get("currentFieldShadowSamplesWritten") or 0
        ) + written
    return found, touched, interrupted, messages_seen, zone_lookups

def wind_from_uv(hour: dict[str, Any]) -> None:
    u, v = hour.get("wind-u-10m"), hour.get("wind-v-10m")
    if isinstance(u, (int, float)) and isinstance(v, (int, float)):
        hour["wind-speed-10m"] = math.hypot(u, v)
        hour["wind-dir-10m"] = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0
    tail_u, tail_v = hour.get("wind-tail-u-10m"), hour.get("wind-tail-v-10m")
    if isinstance(tail_u, (int, float)) and isinstance(tail_v, (int, float)):
        hour["wind-tail-speed-10m"] = math.hypot(tail_u, tail_v)
        hour["wind-tail-dir-10m"] = (math.degrees(math.atan2(-tail_u, -tail_v)) + 360.0) % 360.0


def load_document(path: pathlib.Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def cache_quality(document: dict[str, Any]) -> tuple[int, int, float]:
    zones = document.get("zones") or {}
    complete_current = 0
    component_rows = 0
    for zone in zones.values():
        rows = (zone or {}).get("hourly") or {}
        complete_current += int(any("current-u" in row and "current-v" in row for row in rows.values()))
        component_rows += sum(len([key for key in row if key in PARAMETER_COMPONENT]) for row in rows.values())
    return complete_current, component_rows, epoch(document.get("generatedAt"))


def cache_progress_time(document: dict[str, Any]) -> float:
    """Return the newest persisted builder/checkpoint time for a compatible cache.

    A progressive private checkpoint already contains the deployed data merged at
    the beginning of its run. It must therefore win over an older public cache,
    even when expiry cleanup has legitimately reduced its raw component count.
    Ranking by component volume made old public data erase collection rotation and
    processed-step progress on every new runner.
    """
    timestamps = [
        document.get("checkpointedAt"),
        document.get("generatedAt"),
        document.get("sourceUpdatedAt"),
    ]
    return max((epoch(value) for value in timestamps), default=0.0)


def sampling_registry_signature() -> str:
    """Hash only fields that can change which DMI grid points are sampled.

    Runtime timestamps, observations, forecast health and release-version metadata
    change on every workflow run but do not change the sampling registry. Including
    the raw JSON bytes made every refreshed station document invalidate the private
    progressive cache before collection rotation could be reused.
    """
    zones_doc = json.loads(ZONES_PATH.read_text("utf-8"))
    zone_records: list[dict[str, Any]] = []
    for feature in zones_doc.get("features", []):
        props, geometry = feature.get("properties") or {}, feature.get("geometry") or {}
        zone_id = props.get("id")
        if not zone_id:
            continue
        configured = props.get("dataPoint")
        sampling_geometry = None if isinstance(configured, list) and len(configured) == 2 else geometry
        zone_records.append({
            "id": str(zone_id),
            "dataPoint": configured if isinstance(configured, list) and len(configured) == 2 else None,
            "fallbackGeometry": sampling_geometry,
            "coastType": props.get("coastType") or "east",
        })

    part_records: list[dict[str, Any]] = []
    if COASTAL_PART_POINTS_PATH.exists():
        part_doc = json.loads(COASTAL_PART_POINTS_PATH.read_text("utf-8"))
        for parent_zone_id, parts in (part_doc.get("zones") or {}).items():
            zone_coast_type = next((row.get("coastType") for row in zone_records if row.get("id") == parent_zone_id), "east")
            for part in parts or []:
                part_records.append({
                    "id": part.get("partId"),
                    "waterPoint": part.get("waterPoint"),
                    "status": "active",
                    "coastType": zone_coast_type,
                    "parentZoneId": parent_zone_id,
                })

    source_records: list[dict[str, Any]] = []
    if WATER_SOURCES_PATH.exists():
        source_doc = json.loads(WATER_SOURCES_PATH.read_text("utf-8"))
        for source in source_doc.get("stations", []):
            source_records.append({
                "sourceKey": source.get("sourceKey"),
                "point": source.get("point"),
            })

    payload = {
        "zones": sorted(zone_records, key=lambda item: item["id"]),
        "parts": sorted(part_records, key=lambda item: str(item.get("id") or "")),
        "waterSources": sorted(source_records, key=lambda item: str(item.get("sourceKey") or "")),
    }
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


def load_previous(expected_signature: str) -> dict[str, Any]:
    candidates = [load_document(OUTPUT_PATH), load_document(DEPLOYED_FALLBACK_PATH)]
    compatible = [document for document in candidates if document.get("zoneRegistrySignature") == expected_signature and document.get("zones")]
    if compatible:
        return max(compatible, key=lambda document: (cache_progress_time(document), cache_quality(document)))
    # Et enkelt flyttet administratorpunkt ændrer hele registersignaturen. Genbrug
    # derfor den bedste ældre cache som kandidat; efter at det aktuelle register
    # er bygget, fjernes kun de zoner/kystdele hvis eget samplingPoint er ændret.
    reusable = [document for document in candidates if document.get("zones")]
    if reusable:
        return max(reusable, key=lambda document: (cache_progress_time(document), cache_quality(document)))
    return {"schemaVersion": 2, "zones": {}, "runs": {}, "zoneRegistrySignature": expected_signature}


def merge_previous(current: dict[str, Any], previous: dict[str, Any], allowed_zone_ids: set[str] | None = None) -> None:
    for collection, details in (previous.get("runs") or {}).items():
        current.setdefault("runs", {}).setdefault(collection, details)
    for zone_id, old_zone in (previous.get("zones") or {}).items():
        if allowed_zone_ids is not None and zone_id not in allowed_zone_ids:
            continue
        new_zone = current["zones"].setdefault(zone_id, {"hourly": {}, "gridPoints": {}, "collections": {}})
        for valid, old_hour in (old_zone.get("hourly") or {}).items():
            new_hour = new_zone["hourly"].setdefault(valid, {"time": valid})
            for key, value in old_hour.items():
                new_hour.setdefault(key, value)
        for field in ("gridPoints", "collections"):
            for key, value in (old_zone.get(field) or {}).items():
                new_zone[field].setdefault(key, value)
        if old_zone.get("marineSelection"):
            new_zone.setdefault("marineSelection", old_zone["marineSelection"])


def restore_marine_selections(document: dict[str, Any], zones: list[dict[str, Any]]) -> int:
    """Restore the scalar marine model for legacy caches that lost it.

    The selected collection and its sampled distance remained in collections/
    gridPoints even though merge_previous historically dropped marineSelection.
    Current is deliberately excluded: semantics v3 selects exact U/V columns
    independently of the scalar coast-type model prior.
    """
    zone_config = {str(zone.get("id")): zone for zone in zones if zone.get("id")}
    restored = 0
    for zone_id, point in (document.get("zones") or {}).items():
        if point.get("marineSelection"):
            continue
        collections = point.get("collections") or {}
        scalar_key = next(
            (
                key for key in ("wind-tail-u-10m", "sea-mean-deviation", "water-temperature")
                if collections.get(key) in MARINE_COLLECTIONS
            ),
            None,
        )
        collection = collections.get(scalar_key) if scalar_key else None
        if collection not in MARINE_COLLECTIONS:
            continue
        grid_points = point.get("gridPoints") or {}
        grid_point = grid_points.get(scalar_key) or {}
        distance = grid_point.get("distanceKm")
        if not isinstance(distance, (int, float)) or not math.isfinite(float(distance)):
            continue
        zone = zone_config.get(str(zone_id)) or {"coastType": "east"}
        coast = zone.get("coastType") or "east"
        point["marineSelection"] = {
            "collection": collection,
            "score": round(marine_model_score(zone, collection, float(distance)), 3),
            "distanceKm": round(float(distance), 3),
            "coastType": coast,
            "modelPenaltyKm": MARINE_MODEL_PENALTY_KM.get(coast, {}).get(collection, 25.0),
            "restoredFromLegacyCache": True,
        }
        restored += 1
    return restored


def collection_schedule(previous: dict[str, Any], active_zones_config: list[dict[str, Any]]) -> tuple[list[str], dict[str, Any]]:
    """Planlæg collections ud fra det aktuelle aktive zoneregister.

    Cache må aldrig definere nævneren: nye aktive zoner skal tælle som manglende,
    og udgåede cachezoner må ikke holde en familie kunstigt komplet. Marine er
    fortsat release-kritisk og rangeres først under recovery. Når alle aktive
    zoner har mindst noget gyldigt marinegrundlag, må en helt udsultet vind-
    eller bølgefamilie få andenpladsen, så femdøgnshorisonten kan bygges op.
    """
    state = previous.get("collectionState") or {}
    now = time.time()
    active_by_id = {
        str(zone.get("id")): zone for zone in active_zones_config
        if zone.get("id") and not str(zone.get("id")).startswith("SOURCE::")
    }
    active_ids = list(active_by_id)
    active_zones = {zone_id: (previous.get("zones") or {}).get(zone_id, {}) for zone_id in active_ids}
    zone_count = max(1, len(active_ids))
    coverage = {
        "wind": coverage_summary(active_zones, ("wind-speed-10m",)),
        "wave": coverage_summary(active_zones, ("significant-wave-height",)),
        "marine": coverage_summary(active_zones, ("sea-mean-deviation", "current-u", "current-v")),
    }
    complete96 = {family: int(details.get("zonesWith96Hours") or 0) for family, details in coverage.items()}
    any_data = {family: int(details.get("zonesWithAnyData") or 0) for family, details in coverage.items()}
    missing96 = {family: max(0, zone_count - complete96[family]) for family in ("wind", "wave", "marine")}
    missing_any = {family: max(0, zone_count - any_data[family]) for family in ("wind", "wave", "marine")}
    marine_recovery_active = missing96["marine"] > 0
    marine_foundation_missing = missing_any["marine"] > 0
    marine_foundation_ratio = any_data["marine"] / zone_count
    balanced_foundation_recovery = (
        marine_foundation_missing
        and marine_foundation_ratio >= MARINE_FOUNDATION_BALANCE_RATIO
        and (missing96["wind"] > 0 or missing96["wave"] > 0)
    )

    # Når en aktiv zone helt mangler marinegrundlag, skal den DKSS-model som er
    # geografisk førstevalg for netop den kysttype frem i køen. Ellers kan to
    # produktive, men irrelevante DKSS-kørsler bruge COLLECTIONS_PER_RUN før fx
    # Limfjordsmodellen overhovedet bliver forsøgt.
    missing_marine_zone_ids = [
        zone_id for zone_id in active_ids
        if component_horizon_hours(active_zones.get(zone_id, {}), ("sea-mean-deviation", "current-u", "current-v")) <= 0
    ]
    preferred_marine_demand = {collection: 0 for collection in MARINE_COLLECTIONS}
    for zone_id in missing_marine_zone_ids:
        coast = (active_by_id.get(zone_id) or {}).get("coastType") or "east"
        penalties = MARINE_MODEL_PENALTY_KM.get(coast, MARINE_MODEL_PENALTY_KM["east"])
        preferred = min(MARINE_COLLECTIONS, key=lambda collection: (float(penalties.get(collection, 25.0)), COLLECTION_ORDER.index(collection)))
        preferred_marine_demand[preferred] += 1

    # DKSS also supplies the 60-120 hour wind tail. Once ordinary marine data
    # exists, the scheduler must rotate through the DKSS collection selected
    # for each zone instead of retrying only the few remaining current gaps.
    # Otherwise valid tail data for IDW/NSBS can be starved indefinitely.
    missing_wind_tail_zone_ids = [
        zone_id for zone_id in active_ids
        if component_horizon_hours(active_zones.get(zone_id, {}), ("wind-tail-u-10m", "wind-tail-v-10m")) < COMPLETE_HORIZON_HOURS
    ]
    preferred_wind_tail_demand = {collection: 0 for collection in MARINE_COLLECTIONS}
    for zone_id in missing_wind_tail_zone_ids:
        cached_zone = active_zones.get(zone_id, {})
        selected = ((cached_zone.get("marineSelection") or {}).get("collection"))
        if selected not in MARINE_COLLECTIONS:
            coast = (active_by_id.get(zone_id) or {}).get("coastType") or "east"
            penalties = MARINE_MODEL_PENALTY_KM.get(coast, MARINE_MODEL_PENALTY_KM["east"])
            selected = min(MARINE_COLLECTIONS, key=lambda collection: (float(penalties.get(collection, 25.0)), COLLECTION_ORDER.index(collection)))
        preferred_wind_tail_demand[selected] += 1

    missing_surface_temperature_zone_ids = [
        zone_id for zone_id in active_ids
        if component_horizon_hours(active_zones.get(zone_id, {}), ("water-temperature",)) < COMPLETE_HORIZON_HOURS
    ]
    preferred_surface_temperature_demand = {collection: 0 for collection in MARINE_COLLECTIONS}
    for zone_id in missing_surface_temperature_zone_ids:
        cached_zone = active_zones.get(zone_id, {})
        selected = ((cached_zone.get("marineSelection") or {}).get("collection"))
        if selected not in MARINE_COLLECTIONS:
            coast = (active_by_id.get(zone_id) or {}).get("coastType") or "east"
            penalties = MARINE_MODEL_PENALTY_KM.get(coast, MARINE_MODEL_PENALTY_KM["east"])
            selected = min(MARINE_COLLECTIONS, key=lambda collection: (float(penalties.get(collection, 25.0)), COLLECTION_ORDER.index(collection)))
        preferred_surface_temperature_demand[selected] += 1
    surface_temperature_recovery_active = bool(missing_surface_temperature_zone_ids)
    marine_recovery_active = marine_recovery_active or surface_temperature_recovery_active

    lead_marine_collection = min(
        MARINE_COLLECTIONS,
        key=lambda collection: (
            # En model, der brugte hele tidsbudgettet, må ikke straks vinde
            # igen alene på geografisk efterspørgsel. Ellers kan fx IDW
            # gentage samme delresultat i hver 15-minutters kørsel, mens NSBS
            # og Limfjorden aldrig bliver prøvet. Ikke-forsøgte/eldst
            # afbrudte modeller kommer derfor først under recovery.
            epoch((state.get(collection) or {}).get("lastBudgetInterruptedAt")),
            -(preferred_wind_tail_demand.get(collection, 0) + preferred_surface_temperature_demand.get(collection, 0)),
            -preferred_marine_demand.get(collection, 0),
            epoch((state.get(collection) or {}).get("lastAttemptAt")),
            COLLECTION_ORDER.index(collection),
        ),
    )

    def priority(collection: str) -> tuple[int, int, float, int, int, int, float, float, int]:
        entry = state.get(collection) or {}
        blocked_parser_version = int(entry.get("blockedParserVersion") or 0)
        parser_block_obsolete = entry.get("failureClass") == "parser-blocked" and blocked_parser_version != PARSER_VERSION
        retry_after = epoch(entry.get("nextEligibleAt"))
        blocked = 0 if parser_block_obsolete else (1 if retry_after > now else 0)
        if parser_block_obsolete:
            entry["nextEligibleAt"] = None
            entry["failureClass"] = None
            entry["blockedParserVersion"] = None
            entry["consecutiveFailures"] = 0

        family = COLLECTION_FAMILY[collection]
        budget_rotation = (
            epoch(entry.get("lastBudgetInterruptedAt"))
            if family == "marine" and marine_recovery_active
            else 0.0
        )
        # Mangler en aktiv zone helt marinegrundlag, er DKSS ubetinget først.
        if balanced_foundation_recovery:
            # A small persistent geographic gap must not occupy both
            # produktive pladser for evigt. Den mest relevante DKSS-model
            # keeps first place; the second can rebuild wind or wave coverage.
            if collection == lead_marine_collection:
                family_rank = 0
            elif family != "marine":
                family_rank = 1
            else:
                family_rank = 2
        elif marine_foundation_missing:
            family_rank = 0 if family == "marine" else 1
        elif marine_recovery_active:
            # Marine beholder førstepladsen, men en helt udsultet familie får
            # næste prioritet, så vind/bølger ikke kan sulte på ubestemt tid.
            if family == "marine":
                family_rank = 0
            elif any_data.get(family, 0) == 0:
                family_rank = 1
            else:
                family_rank = 2
        else:
            family_rank = 0
        # Inden for marinefamilien prioriteres den model, der faktisk kan lukke
        # flest helt manglende aktive zoner. For ikke-marine collections er
        # denne rang neutral.
        if family != "marine":
            marine_demand_rank = 0
        elif balanced_foundation_recovery:
            marine_demand_rank = -preferred_wind_tail_demand.get(collection, 0)
        else:
            marine_demand_rank = -(preferred_marine_demand.get(collection, 0) * (zone_count + 1)
                                   + preferred_wind_tail_demand.get(collection, 0)
                                   + preferred_surface_temperature_demand.get(collection, 0))
        deficit_rank = -missing96.get(family, 0)
        complete_family_rank = 1 if missing96.get(family, 0) == 0 else 0
        return (
            blocked, family_rank, budget_rotation, marine_demand_rank, complete_family_rank, deficit_rank,
            epoch(entry.get("lastAttemptAt")), epoch(entry.get("lastSuccessfulAt")),
            COLLECTION_ORDER.index(collection),
        )

    diagnostics = {
        "zoneCount": zone_count,
        "wind": complete96["wind"], "wave": complete96["wave"], "marine": complete96["marine"],
        "windHorizon": coverage["wind"], "waveHorizon": coverage["wave"], "marineHorizon": coverage["marine"],
        "missingWind": missing96["wind"], "missingWave": missing96["wave"], "missingMarine": missing96["marine"],
        "missingAnyWind": missing_any["wind"], "missingAnyWave": missing_any["wave"], "missingAnyMarine": missing_any["marine"],
        "marineRecoveryActive": marine_recovery_active,
        "marineFoundationMissing": marine_foundation_missing,
        "marineFoundationRatio": round(marine_foundation_ratio, 4),
        "marineFoundationBalanceRatio": MARINE_FOUNDATION_BALANCE_RATIO,
        "balancedFoundationRecovery": balanced_foundation_recovery,
        "leadMarineCollection": lead_marine_collection,
        "missingMarineZoneIds": missing_marine_zone_ids,
        "preferredMarineDemand": preferred_marine_demand,
        "missingWindTailZoneIds": missing_wind_tail_zone_ids,
        "preferredWindTailDemand": preferred_wind_tail_demand,
        "missingSurfaceTemperatureZoneIds": missing_surface_temperature_zone_ids,
        "preferredSurfaceTemperatureDemand": preferred_surface_temperature_demand,
        "surfaceTemperatureRecoveryActive": surface_temperature_recovery_active,
        "atmosphereDeferredDuringMarineRecovery": marine_foundation_missing and not balanced_foundation_recovery,
        "completionDefinition": f"component horizon >= {COMPLETE_HORIZON_HOURS} hours",
        "coverageDenominator": "current-active-zone-and-coastal-part-registry",
    }
    return sorted(COLLECTION_ORDER, key=priority), diagnostics


def sanitize_water_temperature_surface_integrity(document: dict[str, Any]) -> int:
    """Drop cached temperature values that are not proven sea-surface data."""
    removed = 0
    for zone in (document.get("zones") or {}).values():
        grid_point = (zone.get("gridPoints") or {}).get("water-temperature") or {}
        grid_surface = grid_point.get("verticalLayer") == "surface:0"
        for hour in (zone.get("hourly") or {}).values():
            if "water-temperature" not in hour:
                continue
            source = (hour.get("sources") or {}).get("waterTemperature") or {}
            if grid_surface and source.get("verticalLayer") == "surface:0":
                continue
            hour.pop("water-temperature", None)
            (hour.get("sources") or {}).pop("waterTemperature", None)
            removed += 1
        if not grid_surface:
            (zone.get("gridPoints") or {}).pop("water-temperature", None)
            (zone.get("collections") or {}).pop("water-temperature", None)
    return removed


def invalidate_obsolete_current_semantics(document: dict[str, Any]) -> int:
    """Remove current selected before the spatial-first column contract.

    Old caches preferred the deepest layer globally and could therefore retain a
    vector many kilometres from the configured water point. Such values must not
    survive a parser upgrade or be merged into a new forecast/history record.
    """
    if document.get("currentVectorSemanticsVersion") == CURRENT_VECTOR_SEMANTICS_VERSION:
        return 0
    removed = 0
    for zone in (document.get("zones") or {}).values():
        for hour in (zone.get("hourly") or {}).values():
            had_current = "current-u" in hour or "current-v" in hour
            hour.pop("current-u", None)
            hour.pop("current-v", None)
            (hour.get("sources") or {}).pop("current", None)
            if had_current:
                removed += 1
        for key in ("current-u", "current-v"):
            (zone.get("gridPoints") or {}).pop(key, None)
            (zone.get("collections") or {}).pop(key, None)
    document["currentVectorSemanticsVersion"] = CURRENT_VECTOR_SEMANTICS_VERSION
    document["currentVectorSelection"] = CURRENT_VECTOR_SELECTION
    document["currentPreferredDistanceKm"] = CURRENT_PREFERRED_DISTANCE_KM
    document["currentMaxDistanceKm"] = CURRENT_MAX_DISTANCE_KM
    return removed


def component_horizon_hours(zone: dict[str, Any], required: tuple[str, ...], now_epoch: float | None = None) -> float:
    now_value = time.time() if now_epoch is None else now_epoch
    valid_times = sorted(
        epoch(valid) for valid, hour in (zone.get("hourly") or {}).items()
        if epoch(valid) >= now_value - 3600
        and all(isinstance(hour.get(key), (int, float)) and math.isfinite(float(hour[key])) for key in required)
    )
    if not valid_times:
        return 0.0

    # A distant forecast tail is not usable coverage for the current build.
    # The first native DMI step must begin close to now, and every later step
    # must remain contiguous at the configured model cadence. This prevents a
    # four-day hole followed by a few valid DKSS steps from suppressing the
    # next recovery attempt.
    start_tolerance = (TIME_STRIDE_HOURS + 1) * 3600
    max_gap = (TIME_STRIDE_HOURS + 1) * 3600
    if valid_times[0] > now_value + start_tolerance:
        return 0.0
    contiguous_end = valid_times[0]
    for valid_time in valid_times[1:]:
        if valid_time - contiguous_end > max_gap:
            break
        contiguous_end = valid_time
    return max(0.0, (contiguous_end - now_value) / 3600.0)


def coverage_summary(zones: dict[str, Any], required: tuple[str, ...]) -> dict[str, Any]:
    now_value = time.time()
    horizons = [component_horizon_hours(zone, required, now_value) for zone in zones.values()]
    return {
        "zonesWithAnyData": sum(1 for value in horizons if value > 0),
        "zonesWith24Hours": sum(1 for value in horizons if value >= 24),
        "zonesWith96Hours": sum(1 for value in horizons if value >= COMPLETE_HORIZON_HOURS),
        "averageHours": round(sum(horizons) / len(horizons), 1) if horizons else 0,
        "minimumHours": round(min(horizons), 1) if horizons else 0,
        "maximumHours": round(max(horizons), 1) if horizons else 0,
        "requiredHorizonHours": COMPLETE_HORIZON_HOURS,
    }


def sanitize_vector_integrity(zone: dict[str, Any]) -> list[str]:
    """Fjern gamle/partielle vektorer der ikke kan bevises at dele gitterpunkt."""
    removed = []
    for first_key, second_key in (("current-u", "current-v"), ("wind-u-10m", "wind-v-10m"), ("wind-tail-u-10m", "wind-tail-v-10m")):
        first_point = (zone.get("gridPoints") or {}).get(first_key)
        second_point = (zone.get("gridPoints") or {}).get(second_key)
        has_any = first_point is not None or second_point is not None
        if not has_any:
            continue
        if same_grid_point(first_point, second_point):
            continue
        for hour in (zone.get("hourly") or {}).values():
            hour.pop(first_key, None)
            hour.pop(second_key, None)
            if first_key == "wind-u-10m":
                hour.pop("wind-speed-10m", None)
                hour.pop("wind-dir-10m", None)
            if first_key == "wind-tail-u-10m":
                hour.pop("wind-tail-speed-10m", None)
                hour.pop("wind-tail-dir-10m", None)
        for key in (first_key, second_key):
            (zone.get("gridPoints") or {}).pop(key, None)
            (zone.get("collections") or {}).pop(key, None)
        removed.append(f"{first_key}/{second_key}")
    return removed


def sanitize_component_provenance(zone_id: str, zone: dict[str, Any]) -> list[str]:
    removed: list[str] = []
    component_fields = {
        "current": ("current-u", "current-v"),
        "wind": ("wind-u-10m", "wind-v-10m", "wind-speed-10m", "wind-dir-10m"),
        "windTail": ("wind-tail-u-10m", "wind-tail-v-10m", "wind-tail-speed-10m", "wind-tail-dir-10m"),
        "wave": ("significant-wave-height", "dominant-wave-period", "mean-wave-dir"),
        "waterLevel": ("sea-mean-deviation",),
        "waterTemperature": ("water-temperature",),
    }
    for valid_time, hour in (zone.get("hourly") or {}).items():
        sources = hour.get("sources") or {}
        for component, fields in component_fields.items():
            if not any(field in hour for field in fields):
                continue
            if complete_native_source_for_hour(sources.get(component), component, zone_id, zone, valid_time):
                continue
            for field in fields:
                hour.pop(field, None)
            sources.pop(component, None)
            removed.append(f"{valid_time}:{component}")
        if sources:
            hour["sources"] = sources
        else:
            hour.pop("sources", None)
    return removed


def clean_and_summarize(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int]) -> None:
    cutoff = time.time() - PRIVATE_REPLAY_RETENTION_HOURS * 3600
    horizon = time.time() + (HOURS + 6) * 3600
    invalidated_vectors = {}
    invalidated_component_provenance = {}
    for zone_id, zone in result["zones"].items():
        provenance_removed = sanitize_component_provenance(zone_id, zone)
        if provenance_removed:
            invalidated_component_provenance[zone_id] = provenance_removed
        removed = sanitize_vector_integrity(zone)
        if removed:
            invalidated_vectors[zone_id] = removed
        cleaned = {}
        for valid, hour in zone.get("hourly", {}).items():
            if cutoff <= epoch(valid) <= horizon:
                wind_from_uv(hour)
                cleaned[valid] = hour
        zone["hourly"] = dict(sorted(cleaned.items(), key=lambda row: epoch(row[0])))
        current_rows = []
        for valid, hour in zone["hourly"].items():
            source = (hour.get("sources") or {}).get("current") or {}
            grid_point = source.get("gridPoint")
            if not (
                isinstance(hour.get("current-u"), (int, float))
                and isinstance(hour.get("current-v"), (int, float))
                and isinstance(grid_point, list) and len(grid_point) >= 2
                and all(isinstance(value, (int, float)) and math.isfinite(float(value)) for value in grid_point[:2])
                and isinstance(source.get("distanceKm"), (int, float))
                and float(source["distanceKm"]) <= CURRENT_MAX_DISTANCE_KM
            ):
                continue
            current_rows.append((
                abs(epoch(valid) - epoch(result.get("generatedAt"))),
                float(source["distanceKm"]),
                -float(source.get("verticalLayerRankM") or 0.0),
                valid,
                source,
            ))
        if current_rows:
            source = min(current_rows, key=lambda row: row[:4])[4]
            longitude, latitude = map(float, source["gridPoint"][:2])
            summary_point = {
                "latitude": round(latitude, 5),
                "longitude": round(longitude, 5),
                "distanceKm": round(float(source["distanceKm"]), 5),
                "verticalLayer": source.get("verticalLayer"),
                "verticalLayerRankM": round(float(source.get("verticalLayerRankM") or 0.0), 3),
            }
            for key in ("current-u", "current-v"):
                zone.setdefault("gridPoints", {})[key] = dict(summary_point)
                zone.setdefault("collections", {})[key] = source.get("collection")
        else:
            for key in ("current-u", "current-v"):
                (zone.get("gridPoints") or {}).pop(key, None)
                (zone.get("collections") or {}).pop(key, None)
    # Bevar hele den aktive zone-/kilderegistrering. En tom hourly-map er den
    # eksplicitte, sandfærdige repræsentation af manglende direkte DMI-data og
    # må ikke forveksles med, at zonen er faldet ud af pipeline-strukturen.
    diag = result["diagnostics"]
    diag["invalidatedMismatchedVectors"] = invalidated_vectors
    diag["invalidatedIncompleteComponentProvenance"] = invalidated_component_provenance
    diag["downloadedBytes"] = budget["bytes"]
    diag["privateReplayRetentionHours"] = PRIVATE_REPLAY_RETENTION_HOURS
    diag["freshZoneCount"] = len(fresh_zone_ids)
    production_zones = {
        zone_id: zone for zone_id, zone in result["zones"].items()
        if not zone_id.startswith("SOURCE::") and not zone_id.startswith("PART::")
    }
    coastal_part_zones = {
        zone_id: zone for zone_id, zone in result["zones"].items()
        if zone_id.startswith("PART::")
    }
    diag["zoneCount"] = len(production_zones)
    diag["waterSourceCount"] = sum(1 for zone_id in result["zones"] if zone_id.startswith("SOURCE::"))
    diag["coastalPartCount"] = len(coastal_part_zones)
    diag["coastalPartComponentHorizonCoverage"] = {
        "wind": coverage_summary(coastal_part_zones, ("wind-speed-10m",)),
        "wave": coverage_summary(coastal_part_zones, ("significant-wave-height",)),
        "marine": coverage_summary(coastal_part_zones, ("sea-mean-deviation", "current-u", "current-v")),
    }
    component_coverage = {
        "wind": coverage_summary(production_zones, ("wind-speed-10m",)),
        "windTail": coverage_summary(production_zones, ("wind-tail-speed-10m",)),
        "wave": coverage_summary(production_zones, ("significant-wave-height",)),
        "marine": coverage_summary(production_zones, ("sea-mean-deviation", "current-u", "current-v")),
    }
    diag["componentHorizonCoverage"] = component_coverage
    # Backwards-compatible names now mean sufficient forecast horizon, not merely one value.
    diag["completeMarineZones"] = component_coverage["marine"]["zonesWith96Hours"]
    diag["completeWindZones"] = component_coverage["wind"]["zonesWith96Hours"]
    diag["completeWaveZones"] = component_coverage["wave"]["zonesWith96Hours"]



def build_ocean_diagnostics(result: dict[str, Any]) -> dict[str, Any]:
    marine_collections = ["dkss_idw", "dkss_nsbs", "dkss_lf"]
    parameter_keys = ["sea-mean-deviation", "current-u", "current-v", "water-temperature"]
    all_zones = result.get("zones") or {}
    zones = {zone_id: zone for zone_id, zone in all_zones.items() if not str(zone_id).startswith("SOURCE::")}
    per_parameter = {}
    for key in parameter_keys:
        zone_count = 0
        value_count = 0
        min_value = None
        max_value = None
        for zone in zones.values():
            zone_has = False
            for hour in (zone.get("hourly") or {}).values():
                value = hour.get(key)
                if isinstance(value, (int, float)) and math.isfinite(float(value)):
                    number = float(value)
                    value_count += 1
                    zone_has = True
                    min_value = number if min_value is None else min(min_value, number)
                    max_value = number if max_value is None else max(max_value, number)
            if zone_has:
                zone_count += 1
        per_parameter[key] = {
            "zonesPopulated": zone_count,
            "finiteValues": value_count,
            "minimum": min_value,
            "maximum": max_value,
        }

    collection_details = {}
    diagnostics = result.get("diagnostics") or {}
    for collection in marine_collections:
        state = (result.get("collectionState") or {}).get(collection) or {}
        run = (result.get("runs") or {}).get(collection) or {}
        inventory = (diagnostics.get("gribFieldInventory") or {}).get(collection) or {}
        recognized = (diagnostics.get("parametersByCollection") or {}).get(collection) or run.get("recognizedParameters") or []
        collection_details[collection] = {
            "scheduledThisRun": collection in (diagnostics.get("scheduledCollections") or []),
            "attemptedThisRun": collection in (diagnostics.get("collectionsAttempted") or []),
            "succeededThisRun": collection in ((diagnostics.get("collectionsSucceeded") or []) + (diagnostics.get("collectionsUnchanged") or [])),
            "partialThisRun": collection in (diagnostics.get("collectionsPartial") or []),
            "referenceTime": run.get("referenceTime"),
            "assetsDiscovered": run.get("assetsDiscovered", 0),
            "assetsProcessed": run.get("assetsProcessed", 0),
            "assetsReused": run.get("assetsReused", 0),
            "assetsSkippedPreviouslyProcessed": run.get("assetsSkippedPreviouslyProcessed", 0),
            "healthState": ("fresh" if collection in (diagnostics.get("collectionsSucceeded") or []) else "unchanged-valid" if collection in (diagnostics.get("collectionsUnchanged") or []) else "partial" if collection in (diagnostics.get("collectionsPartial") or []) else "failed" if state.get("lastError") else "not-run"),
            "recognizedParameters": recognized,
            "requiredParameters": TARGETS["marine"],
            "missingParameters": [key for key in TARGETS["marine"] if key not in recognized],
            "inventoryMessageTypes": len(inventory),
            "lastSuccessfulAt": state.get("lastSuccessfulAt"),
            "lastPartialAt": state.get("lastPartialAt"),
            "lastError": state.get("lastError"),
            "nextEligibleAt": state.get("nextEligibleAt"),
        }

    marine_errors = [error for error in (diagnostics.get("errors") or []) if error.get("collection") in marine_collections]
    complete_current = per_parameter["current-u"]["zonesPopulated"] and per_parameter["current-v"]["zonesPopulated"]
    complete_marine_ids = {
        zone_id for zone_id, zone in zones.items()
        if any(all(key in hour for key in ("sea-mean-deviation", "current-u", "current-v")) for hour in (zone.get("hourly") or {}).values())
    }
    fresh_marine_ids = set(diagnostics.get("freshMarineZoneIds") or []) & complete_marine_ids
    preserved_marine_ids = complete_marine_ids - fresh_marine_ids
    grid_search = diagnostics.get("marineGridSearch") or {}
    missing_zone_reasons = {}
    for zone_id in sorted(set(grid_search) | set(zones)):
        if zone_id in complete_marine_ids:
            continue
        attempts = grid_search.get(zone_id) or {}
        parameter_union = set()
        nearest = None
        for details in attempts.values():
            parameter_union.update(details.get("parametersFound") or [])
            distance = details.get("nearestValidDistanceKm")
            if distance is not None:
                nearest = float(distance) if nearest is None else min(nearest, float(distance))
        missing = sorted(REQUIRED_TARGETS["marine"] - parameter_union)
        if not attempts:
            reason = "PRIMARY_COLLECTION_NO_COVERAGE"
        elif all(details.get("rejectedReason") == "VALID_POINT_TOO_FAR" for details in attempts.values() if details):
            reason = "VALID_POINT_TOO_FAR"
        elif missing:
            reason = "MISSING_" + "_AND_".join(key.upper().replace("-", "_") for key in missing)
        else:
            reason = "NO_VALID_GRID_POINT"
        missing_zone_reasons[zone_id] = {
            "reason": reason, "collectionsTried": sorted(attempts),
            "nearestValidDistanceKm": nearest, "missingParameters": missing, "attempts": attempts,
        }
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "bulkCacheGeneratedAt": result.get("generatedAt"),
        "refreshStatus": result.get("refreshStatus"),
        "method": result.get("method"),
        "summary": {
            "zonesInBulkCache": len(zones),
            "waterLevelZones": per_parameter["sea-mean-deviation"]["zonesPopulated"],
            "currentUZones": per_parameter["current-u"]["zonesPopulated"],
            "currentVZones": per_parameter["current-v"]["zonesPopulated"],
            "currentVectorAvailable": bool(complete_current),
            "waterTemperatureZones": per_parameter["water-temperature"]["zonesPopulated"],
            "marineErrors": len(marine_errors),
            "freshMarineZones": len(fresh_marine_ids),
            "preservedMarineZones": len(preserved_marine_ids),
            "fallbackOrMissingMarineZones": len(missing_zone_reasons),
        },
        "parameters": per_parameter,
        "collections": collection_details,
        "errors": marine_errors,
        "missingZones": missing_zone_reasons,
        "modelSelections": {zone_id: zone.get("marineSelection") for zone_id, zone in zones.items() if zone.get("marineSelection")},
        "pipelineCounters": {
            "messagesSeen": diagnostics.get("messagesSeen", 0),
            "zoneLookups": diagnostics.get("zoneLookups", 0),
            "downloadedBytes": diagnostics.get("downloadedBytes", 0),
            "freshZoneCount": diagnostics.get("freshZoneCount", 0),
            "freshMarineZones": len(fresh_marine_ids),
            "preservedMarineZones": len(preserved_marine_ids),
        },
    }


def write_ocean_diagnostics(result: dict[str, Any]) -> None:
    report = build_ocean_diagnostics(result)
    DIAGNOSTICS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_JSON_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    lines = [
        "RavRadar DMI ocean diagnostics",
        f"Generated: {report['generatedAt']}",
        f"Bulk status: {report.get('refreshStatus')}",
        f"Zones in bulk cache: {report['summary']['zonesInBulkCache']}",
        f"Water-level zones: {report['summary']['waterLevelZones']}",
        f"Current U zones: {report['summary']['currentUZones']}",
        f"Current V zones: {report['summary']['currentVZones']}",
        f"Water-temperature zones: {report['summary']['waterTemperatureZones']}",
        f"Fresh marine zones this run: {report['summary']['freshMarineZones']}",
        f"Preserved marine zones: {report['summary']['preservedMarineZones']}",
        f"Fallback/missing marine zones: {report['summary']['fallbackOrMissingMarineZones']}",
        "",
        "Collections:",
    ]
    for name, details in report["collections"].items():
        missing = ", ".join(details["missingParameters"]) or "none"
        lines.append(f"- {name}: attempted={details['attemptedThisRun']} health={details.get('healthState')} success={details['succeededThisRun']} partial={details['partialThisRun']} assets={details['assetsProcessed']}/{details['assetsDiscovered']} reused={details.get('assetsReused', 0)} skipped={details.get('assetsSkippedPreviouslyProcessed', 0)} missing={missing} error={details['lastError'] or 'none'}")
    if report["errors"]:
        lines.extend(["", "Errors:"])
        lines.extend(f"- {item.get('collection')}: {item.get('message')}" for item in report["errors"])
    DIAGNOSTICS_TEXT_PATH.write_text("\n".join(lines) + "\n", "utf-8")


def write_checkpoint(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int], status: str = "partial") -> None:
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    clean_and_summarize(result, fresh_zone_ids, budget)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    tmp.replace(OUTPUT_PATH)
    write_ocean_diagnostics(result)


def scrub_private_stage_diagnostics(diagnostics: dict[str, Any]) -> None:
    """Keep candidate identities out of support/public diagnostic documents."""
    for key in ("marineGridSearch",):
        values = diagnostics.get(key)
        if isinstance(values, dict):
            diagnostics[key] = {
                item_id: value for item_id, value in values.items()
                if not str(item_id).startswith("STAGED::")
            }


def write_current_field_shadow_checkpoint(
    document: dict[str, Any],
    now_iso: str,
    selected_part_ids: list[str],
    run_metrics: dict[str, Any] | None = None,
    regional_proxy_targets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Persist private samples and safe support-only diagnostics."""
    prune_current_field_shadow(document, now_iso)
    save_current_field_shadow(CURRENT_FIELD_SHADOW_PATH, document)
    summary = current_field_shadow_status(document, selected_part_ids, run_metrics)
    CURRENT_FIELD_SHADOW_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CURRENT_FIELD_SHADOW_STATUS_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", "utf-8")
    temporary.replace(CURRENT_FIELD_SHADOW_STATUS_PATH)
    proxy_report = regional_proxy_safe_report(document, regional_proxy_targets or [], now_iso)
    proxy_serialized = json.dumps(proxy_report, ensure_ascii=False, indent=2) + "\n"
    if '"uMps"' in proxy_serialized or '"vMps"' in proxy_serialized:
        raise RuntimeError("Regional current proxy support report contains raw vectors")
    CURRENT_REGIONAL_PROXY_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    proxy_temporary = CURRENT_REGIONAL_PROXY_REPORT_PATH.with_suffix(".json.tmp")
    proxy_temporary.write_text(proxy_serialized, "utf-8")
    proxy_temporary.replace(CURRENT_REGIONAL_PROXY_REPORT_PATH)
    return summary


def write_current_coverage_owner_audit(
    document: dict[str, Any],
    part_document: dict[str, Any],
    bulk_document: dict[str, Any],
    zones_geojson: dict[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    """Persist the private support-only owner action list outside Pages."""
    report = owner_coverage_audit(
        document,
        part_document,
        bulk_document,
        zones_geojson,
        generated_at,
    )
    CURRENT_COVERAGE_OWNER_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CURRENT_COVERAGE_OWNER_AUDIT_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    temporary.replace(CURRENT_COVERAGE_OWNER_AUDIT_PATH)
    return report["summary"]


def replay_current_field_shadow_from_cache(
    catalog: dict[str, dict[str, Any]],
    research_targets: list[dict[str, Any]],
    current_shadow: dict[str, Any],
    generated: str,
    budget: dict[str, int],
) -> dict[str, Any]:
    """Advance the private rotation without public output mutation.

    A model generation is normally processed only once.  Without this bounded
    replay, the research cursor would move only every time DMI publishes a new
    generation, which is too slow for a complete geographic sweep inside the
    seven-day retention window.  Stable cached files are preferred.  If the raw
    cache has no current marine asset (for example while migrating from the old
    signed-URL cache keys), at most one bounded bootstrap asset per model area is
    downloaded inside the existing global DMI byte budget.  Processing still
    receives only private research targets and an isolated scratch output.
    """
    summary: dict[str, Any] = {
        "attempted": False,
        "collections": [],
        "cachedAssetsAvailable": 0,
        "assetsCompleted": 0,
        "samplesWritten": 0,
        "messagesSeen": 0,
        "zoneLookups": 0,
        "interrupted": False,
        "bootstrapDownloads": 0,
        "bootstrapDownloadedBytes": 0,
        "errors": [],
    }
    if not research_targets:
        summary["reason"] = "no-research-targets"
        return summary
    if should_stop_work():
        summary["reason"] = "runtime-budget-reached"
        return summary

    scratch_output: dict[str, Any] = {"generatedAt": generated, "zones": {}}
    bootstrap_remaining = CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN
    unrestricted = any(not target.get("requiredCollection") for target in research_targets)
    required_collections = {
        str(target.get("requiredCollection")) for target in research_targets
        if target.get("requiredCollection")
    }
    replay_collections = (
        set(MARINE_COLLECTIONS)
        if unrestricted
        else set(MARINE_COLLECTIONS) & required_collections
    )
    for collection in sorted(replay_collections, key=COLLECTION_ORDER.index):
        entry = catalog.get(collection) or {}
        model_run = str(entry.get("modelRun") or "")
        candidates = eligible_replay_assets(
            list(entry.get("assets") or []),
            generated,
            CURRENT_FIELD_SHADOW_REPLAY_ASSETS_PER_COLLECTION,
        )
        resolved: list[tuple[dict[str, Any], pathlib.Path]] = [
            (asset, cached_asset_path(str(asset.get("href") or "")))
            for asset in candidates
            if cached_asset_path(str(asset.get("href") or "")).is_file()
        ]
        if model_run and not resolved and candidates and bootstrap_remaining > 0 and not should_stop_work():
            # Prefer the far edge of the accepted +12 h research window.  It
            # remains eligible for many subsequent 15-minute rotations, so a
            # legacy-cache bootstrap cannot turn into repeated downloads.
            asset = max(candidates, key=lambda row: epoch(row.get("valid")))
            before_bytes = int(budget.get("bytes") or 0)
            try:
                path, reused = download_asset(
                    str(asset.get("href") or ""),
                    asset.get("size"),
                    budget,
                    collection=collection,
                    model_run=model_run,
                    valid_time=str(asset.get("valid") or ""),
                    item_id=str(asset.get("id") or "") or None,
                    item_created_at=asset.get("itemCreatedAt"),
                    item_updated_at=asset.get("itemUpdatedAt"),
                )
                resolved.append((asset, path))
                bootstrap_remaining -= 1
                if not reused:
                    summary["bootstrapDownloads"] += 1
                    summary["bootstrapDownloadedBytes"] += max(
                        0, int(budget.get("bytes") or 0) - before_bytes
                    )
            except Exception as exc:
                summary["errors"].append({"collection": collection, "message": str(exc)[:500]})
        if not model_run or not resolved:
            continue
        summary["attempted"] = True
        summary["collections"].append(collection)
        summary["cachedAssetsAvailable"] += len(resolved)
        for asset, path in resolved:
            if should_stop_work():
                summary["interrupted"] = True
                summary["reason"] = "runtime-budget-reached"
                return summary
            try:
                os.utime(path, None)
            except OSError:
                pass
            register_raw_cache_asset(
                path,
                str(asset.get("href") or ""),
                collection,
                model_run,
                str(asset.get("valid") or ""),
                item_id=str(asset.get("id") or "") or None,
                item_created_at=asset.get("itemCreatedAt"),
                item_updated_at=asset.get("itemUpdatedAt"),
            )
            replay_diagnostics: dict[str, Any] = {
                "batchedGridReads": 0,
                "messagesSeen": 0,
                "zoneLookups": 0,
            }
            found, _touched, interrupted, messages_seen, zone_lookups = process_grib(
                path,
                collection,
                model_run,
                str(asset["valid"]),
                research_targets,
                scratch_output,
                replay_diagnostics,
                current_shadow,
            )
            summary["messagesSeen"] += messages_seen
            summary["zoneLookups"] += zone_lookups
            summary["samplesWritten"] += int(
                replay_diagnostics.get("currentFieldShadowSamplesWritten") or 0
            )
            if interrupted:
                summary["interrupted"] = True
                summary["reason"] = "runtime-budget-reached-inside-cached-grib"
                return summary
            if {"current-u", "current-v"} <= found:
                summary["assetsCompleted"] += 1

    if not summary["attempted"]:
        summary["reason"] = "no-eligible-cached-current-assets-or-bootstrap"
    elif not summary["assetsCompleted"]:
        summary["reason"] = "cached-assets-without-current-pair"
    else:
        summary["reason"] = "completed"
    return summary


def write_github_outputs(status: str, fresh_collections: int = 0, partial_collections: int = 0,
                         zone_count: int = 0, downloaded_bytes: int = 0, error: str | None = None) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as handle:
            handle.write(f"status={status}\n")
            handle.write(f"fresh_collections={fresh_collections}\n")
            handle.write(f"partial_collections={partial_collections}\n")
            handle.write(f"zone_count={zone_count}\n")
            handle.write(f"downloaded_bytes={downloaded_bytes}\n")
            if error:
                safe_error = str(error).replace("\r", " ").replace("\n", " ")[:500]
                handle.write(f"error={safe_error}\n")



def write_step_summary(result: dict[str, Any], scheduled: list[str], diag: dict[str, Any], budget: dict[str, int], fresh_successes: int, fresh_partials: int) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    try:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write(f"- Status: **{result.get('refreshStatus', 'unknown')}**\n")
            handle.write(f"- Planlagte samlinger: **{', '.join(scheduled or [])}**\n")
            handle.write(f"- Fuld/delvis succes: **{fresh_successes}/{fresh_partials}**\n")
            handle.write(f"- Zoner i cache: **{len(result.get('zones') or {})}**\n")
            handle.write(f"- Downloadet denne kørsel: **{budget.get('bytes', 0)} bytes**\n")
            ocean = build_ocean_diagnostics(result)["summary"]
            handle.write(f"- Ocean-dækning: vandstand **{ocean['waterLevelZones']}** zoner, strøm-U/V **{ocean['currentUZones']}/{ocean['currentVZones']}**, temperatur **{ocean['waterTemperatureZones']}**\n")
            handle.write("- Diagnostik: `data/diagnostics/dmi-ocean-diagnostics.json` og `data/diagnostics/dmi-ocean-summary.txt`\n")
            if diag.get("errors"):
                handle.write("- Bemærkninger: " + "; ".join(f"{e.get('collection')}: {e.get('message')}" for e in diag["errors"]) + "\n")
    except Exception as exc:
        print(f"Kunne ikke skrive GitHub-stepoversigt: {exc}", file=sys.stderr, flush=True)

def write_failure_summary(error: Exception) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write("- Status: **failed**\n")
            handle.write(f"- Opstartsfejl: `{str(error)[:500]}`\n")


def main() -> int:
    progress(f"starter; arbejdsbudget={MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS}s, afslutningsreserve={FINALIZE_RESERVE_SECONDS}s")
    cache_before = raw_cache_inventory()
    current_zone_registry_signature = sampling_registry_signature()
    previous = load_previous(current_zone_registry_signature)
    zones_geo = json.loads(ZONES_PATH.read_text("utf-8"))
    part_doc: dict[str, Any] = {"zones": {}}
    if COASTAL_PART_POINTS_PATH.exists():
        part_doc = json.loads(COASTAL_PART_POINTS_PATH.read_text("utf-8"))
    zone_coast_types = {
        str((feature.get("properties") or {}).get("id")): (feature.get("properties") or {}).get("coastType") or "east"
        for feature in zones_geo.get("features", [])
        if (feature.get("properties") or {}).get("id")
    }
    direction_document = load_document(COASTAL_POINT_STAGE_REVIEWS_PATH)
    coastal_point_stage_targets = build_coastal_point_stage_targets(
        direction_document,
        part_doc,
        zone_coast_types,
    )
    removed_unverified_temperature_points = sanitize_water_temperature_surface_integrity(previous)
    removed_obsolete_current_hours = invalidate_obsolete_current_semantics(previous)
    previous.setdefault("diagnostics", {})["removedUnverifiedWaterTemperaturePoints"] = removed_unverified_temperature_points
    previous.setdefault("diagnostics", {})["removedObsoleteCurrentHours"] = removed_obsolete_current_hours
    previous_zone_registry_signature = previous.get("zoneRegistrySignature")
    zone_registry_unchanged = previous_zone_registry_signature == current_zone_registry_signature
    previous_generated = epoch(previous.get("generatedAt"))
    previous_diag = previous.get("diagnostics") or {}
    previous_ocean = build_ocean_diagnostics(previous)["summary"] if previous.get("zones") else {}
    previous_marine_errors = [
        error for error in (previous_diag.get("errors") or [])
        if str(error.get("collection", "")).startswith("dkss_")
    ]
    previous_refresh_status = str(previous.get("refreshStatus") or "").lower()
    horizon_coverage = previous_diag.get("componentHorizonCoverage") or {}
    previous_zone_count = max(1, int(previous_diag.get("zoneCount") or len(previous.get("zones") or {}) or 1))
    wind_horizon_healthy = int((horizon_coverage.get("wind") or {}).get("zonesWith96Hours") or 0) >= previous_zone_count
    marine_horizon_healthy = int((horizon_coverage.get("marine") or {}).get("zonesWith96Hours") or 0) >= previous_zone_count
    marine_cache_healthy = (
        int(previous_ocean.get("waterLevelZones") or 0) > 0
        and int(previous_ocean.get("currentUZones") or 0) > 0
        and int(previous_ocean.get("currentVZones") or 0) > 0
        and int(previous_ocean.get("waterTemperatureZones") or 0) >= previous_zone_count
        and marine_horizon_healthy
        and wind_horizon_healthy
        and not previous_marine_errors
        and previous_refresh_status not in {"failed", "partial"}
    )
    if (
        not FORCE_REFRESH
        and previous_generated
        and previous.get("zones")
        and time.time() - previous_generated < REFRESH_MINUTES * 60
        and marine_cache_healthy
        and previous.get("spatialProvenanceVersion") == SPATIAL_PROVENANCE_VERSION
        and int(previous.get("privateReplayRetentionHours") or 0) >= 54
        and zone_registry_unchanged
        and not coastal_point_stage_targets
    ):
        # Kun en både tidsmæssigt frisk og funktionelt sund marine-cache genbruges.
        # En nylig parserfejl må aldrig blokere et nyt DKSS-forsøg efter en kodeopdatering.
        previous.setdefault("refreshStatus", "fresh-bulk-cache")
        previous.setdefault("diagnostics", {})
        write_ocean_diagnostics(previous)
        ocean = build_ocean_diagnostics(previous)["summary"]
        write_github_outputs(
            "fresh-bulk-cache",
            zone_count=len(previous.get("zones") or {}),
            downloaded_bytes=0,
        )
        if os.getenv("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as h:
                h.write("## DMI bulk refresh\n\n")
                h.write("- Status: **fresh bulk-cache genbrugt**\n")
                h.write(f"- Zoner i cache: **{len(previous.get('zones') or {})}**\n")
                h.write(f"- Ocean-dækning: vandstand **{ocean['waterLevelZones']}** zoner, strøm-U/V **{ocean['currentUZones']}/{ocean['currentVZones']}**, temperatur **{ocean['waterTemperatureZones']}**\n")
                h.write("- Diagnostik blev regenereret fra den hydratiserede cache.\n")
        print(json.dumps({
            "skipped": "fresh-bulk-cache",
            "zoneCount": len(previous.get("zones") or {}),
            "generatedAt": previous.get("generatedAt"),
            "diagnosticsRegenerated": True,
            "ocean": ocean,
        }, ensure_ascii=False))
        return 0

    zones = []
    for feature in zones_geo.get("features", []):
        props, geometry = feature.get("properties") or {}, feature.get("geometry") or {}
        configured = props.get("dataPoint")
        if isinstance(configured, list) and len(configured) == 2:
            lon, lat = configured
        elif geometry.get("type") == "Point" and isinstance(geometry.get("coordinates"), list):
            lon, lat = geometry["coordinates"][:2]
        elif geometry.get("type") == "Polygon" and geometry.get("coordinates") and geometry["coordinates"][0]:
            ring = geometry["coordinates"][0]
            points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
            lon, lat = sum(float(p[0]) for p in points) / len(points), sum(float(p[1]) for p in points) / len(points)
        else:
            continue
        if props.get("id"):
            zones.append({"id": props["id"], "lon": float(lon), "lat": float(lat), "coastType": props.get("coastType") or "east"})

    # De ejer-godkendte lokale kystdele samples i de samme allerede downloadede
    # GRIB-felter som hovedzonerne. Det øger kun lokale grid-opslag; det udløser
    # ikke et separat DMI-kald pr. kystdel. De offentlige kystdele indgår i den
    # reelle dækningsnævner; kun private forskningsmål holdes udenfor.
    zone_coast_types = {zone["id"]: zone.get("coastType") or "east" for zone in zones}
    if COASTAL_PART_POINTS_PATH.exists():
        for parent_zone_id, parts in (part_doc.get("zones") or {}).items():
            for part in parts or []:
                part_id = part.get("partId")
                point = part.get("waterPoint")
                if not part_id or not isinstance(point, list) or len(point) != 2:
                    continue
                zones.append({
                    "id": f"PART::{part_id}",
                    "lon": float(point[0]),
                    "lat": float(point[1]),
                    "coastType": zone_coast_types.get(parent_zone_id, "east"),
                    "coastalPart": True,
                    "parentZoneId": parent_zone_id,
                })

    # Kandidater samples i samme hentede GRIB-filer, men skrives til en separat
    # privat cache. De indgår aldrig i den offentlige registrering, dækningsnævner
    # eller checkpoints, før en READY-kandidat aktiveres eksplicit.
    zones.extend(coastal_point_stage_targets)
    coastal_point_stage = load_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage_targets)

    # Privat, score-neutral forskningsopsamling. Det roterende udsnit belyser det
    # ydre felt. De otte ejer-godkendte Limfjordsdele tilføjes samtidig som en
    # separat fail-closed allowlist, så kun dkss_lf-værdier op til 15 km kan
    # gemmes i den private syvdøgnscache. Ingen research-id'er skrives til den
    # offentlige bulk-cache eller schedulerens dækningsmål.
    current_shadow = load_current_field_shadow(CURRENT_FIELD_SHADOW_PATH)
    rotating_research_targets, next_research_cursor, selected_research_part_ids = build_rotating_targets(
        part_doc,
        zone_coast_types,
        int(current_shadow.get("cursor") or 0),
        CURRENT_FIELD_SHADOW_PARTS_PER_RUN,
    )
    regional_proxy_policy = json.loads(CURRENT_REGIONAL_PROXY_POLICY_PATH.read_text("utf-8"))
    regional_proxy_targets = build_regional_proxy_targets(
        regional_proxy_policy,
        part_doc,
        zone_coast_types,
    )
    research_targets = rotating_research_targets + regional_proxy_targets
    research_run_metrics: dict[str, Any] = {
        "rotationAdvancedThisRun": False,
        "samplesWrittenThisRun": 0,
        "cachedReplayAssetsThisRun": 0,
        "regionalProxyConfiguredThisRun": len(regional_proxy_targets),
    }
    zones.extend(research_targets)

    # Vandstandskilder (målestationer og DMI-prognosepunkter) samples i samme
    # DKSS-GRIB som zonerne. Dermed får begge kildetyper sammenlignelige
    # femdøgnsserier uden et stort antal ForecastEDR-kald.
    if WATER_SOURCES_PATH.exists():
        try:
            source_doc = json.loads(WATER_SOURCES_PATH.read_text("utf-8"))
            zone_points = [zone for zone in zones if not zone.get("researchCurrent")]
            for source in source_doc.get("stations", []):
                coords = source.get("point")
                source_key = source.get("sourceKey")
                if not source_key or not isinstance(coords, list) or len(coords) != 2:
                    continue
                lon, lat = float(coords[0]), float(coords[1])
                nearest = min(zone_points, key=lambda z: (z["lon"]-lon)**2 + (z["lat"]-lat)**2) if zone_points else None
                zones.append({"id": f"SOURCE::{source_key}", "lon": lon, "lat": lat, "coastType": (nearest or {}).get("coastType", "east"), "waterSource": True})
        except Exception as exc:
            print(f"Advarsel: vandstandskilder kunne ikke føjes til bulk-grid: {exc}", file=sys.stderr)

    removed_sampling_mismatches = prune_previous_sampling_mismatches(previous, zones)
    generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    # Den aktive zone-/kilderegistrering er den strukturelle sandhed. En zone må
    # aldrig forsvinde fra bulk-cachen blot fordi den aktuelle DMI-kørsel ikke
    # finder et gyldigt felt. Tomme poster betyder eksplicit "ingen direkte
    # bulkdata"; de må ikke udfyldes med nul eller stale data. Det gør det muligt
    # for provenance/audits at skelne datamangler fra en brudt registreringskæde.
    active_output_ids = {
        str(zone["id"]) for zone in zones
        if zone.get("id") and not zone.get("researchCurrent") and not zone.get("privateStage")
    }
    zone_config_by_id = {
        str(zone["id"]): zone for zone in zones
        if zone.get("id") and not zone.get("researchCurrent") and not zone.get("privateStage")
    }
    initial_zone_records = {
        zone_id: {
            **(sampling_identity(zone_config_by_id[zone_id]) or {}),
            "hourly": {},
            "gridPoints": {},
            "collections": {},
        }
        for zone_id in active_output_ids
    }
    result = {"schemaVersion": 2, "generatedAt": generated,
              "sourceUpdatedAt": previous.get("sourceUpdatedAt") or previous.get("generatedAt"),
              "method": f"DMI STAC forecast-step GRIB inventory; collection-specific field extraction; multi-candidate nearest valid grid point with shared-grid U/V vector pairing and marine collection overlap; {TIME_STRIDE_HOURS}h model stride; no spatial interpolation",
              "hours": HOURS, "timeStrideHours": TIME_STRIDE_HOURS, "zoneRegistrySignature": current_zone_registry_signature,
              "currentVectorSemanticsVersion": CURRENT_VECTOR_SEMANTICS_VERSION,
              "currentVectorSelection": CURRENT_VECTOR_SELECTION,
              "currentPreferredDistanceKm": CURRENT_PREFERRED_DISTANCE_KM,
              "currentMaxDistanceKm": CURRENT_MAX_DISTANCE_KM,
              "spatialProvenanceVersion": SPATIAL_PROVENANCE_VERSION,
              "privateReplayRetentionHours": PRIVATE_REPLAY_RETENTION_HOURS,
              "zones": initial_zone_records, "runs": {},
              "collectionState": dict(previous.get("collectionState") or {}),
              "diagnostics": {"collectionsAttempted": [], "collectionsSucceeded": [], "collectionsPartial": [], "errors": [],
                              "downloadedBytes": 0, "reusedAssets": 0, "parametersByCollection": {}, "stacByCollection": {},
                              "removedSamplingPointMismatches": removed_sampling_mismatches,
                              "assetsSkippedPreviouslyProcessed": 0, "assetsRetriedIncomplete": 0, "zeroProgressCollections": [], "collectionsUnchanged": [], "messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0, "marineGridSearch": {},
                              "runtimeBudgetSeconds": MAX_RUNTIME_SECONDS, "finalizeReserveSeconds": FINALIZE_RESERVE_SECONDS,
                              "currentFieldShadow": current_field_shadow_status(current_shadow, selected_research_part_ids, research_run_metrics),
                              "persistentFieldInventory": dict(((previous.get("diagnostics") or {}).get("persistentFieldInventory") or {}))}}
    coastal_point_stage.update({
        "generatedAt": generated,
        "timeStrideHours": TIME_STRIDE_HOURS,
        "currentVectorSemanticsVersion": CURRENT_VECTOR_SEMANTICS_VERSION,
        "currentVectorSelection": CURRENT_VECTOR_SELECTION,
        "currentPreferredDistanceKm": CURRENT_PREFERRED_DISTANCE_KM,
        "currentMaxDistanceKm": CURRENT_MAX_DISTANCE_KM,
    })
    prune_coastal_point_stage_hours(coastal_point_stage, generated)
    if coastal_point_stage_targets:
        save_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage)
    merge_previous(result, previous, active_output_ids)
    result["diagnostics"]["restoredMarineSelections"] = restore_marine_selections(result, zones)
    budget = {"bytes": 0}
    # Local coastal parts use the same downloaded GRIB fields as parent zones.
    # They must remain in the coverage denominator; excluding them allowed the
    # scheduler to stop while most public local scores still lacked current.
    active_zones_config = [
        zone for zone in zones
        if not zone.get("waterSource") and not zone.get("researchCurrent") and not zone.get("privateStage")
    ]
    scheduled, schedule_coverage = collection_schedule(previous, active_zones_config)
    result["diagnostics"]["scheduledCollections"] = scheduled
    result["diagnostics"]["scheduleCoverageBeforeRun"] = schedule_coverage

    # Prefetch the small STAC inventories once, but leave all GRIB download/time
    # capacity to the public builder first.  If no fresh marine asset covers the
    # private selection, the isolated replay may use only the budget left over at
    # the end of the normal build.  Research must never starve public weather.
    prefetched_marine: dict[str, tuple[str | None, list[dict[str, Any]], dict[str, Any]]] = {}
    research_replay_catalog: dict[str, dict[str, Any]] = {}
    if research_targets:
        for collection in sorted(MARINE_COLLECTIONS, key=COLLECTION_ORDER.index):
            try:
                previous_run = (previous.get("runs") or {}).get(collection) or {}
                run, assets, stac_stats = list_latest_assets(collection, previous_run.get("referenceTime"))
                prefetched_marine[collection] = (run, assets, stac_stats)
                research_replay_catalog[collection] = {"modelRun": run, "assets": assets}
            except Exception as exc:
                result["diagnostics"].setdefault("currentFieldShadowPrefetchErrors", []).append({
                    "collection": collection,
                    "message": str(exc)[:500],
                })
    replay_summary: dict[str, Any] = {"samplesWritten": 0}
    research_rotation_completed = False
    regional_proxy_collection_completed = False

    fresh_zone_ids: set[str] = set()
    fresh_marine_zone_ids: set[str] = set()
    productive_collections = 0

    for collection in scheduled:
        if productive_collections >= COLLECTIONS_PER_RUN:
            break
        if should_stop_work():
            result["diagnostics"]["errors"].append({"collection": collection, "message": "bulk runtime budget reached"})
            break
        result["diagnostics"]["collectionsAttempted"].append(collection)
        collection_start_bytes = budget["bytes"]
        collection_start_reused = int(result["diagnostics"].get("reusedAssets") or 0)
        state = result["collectionState"].setdefault(collection, {})
        state["lastAttemptAt"] = generated
        try:
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            if collection in prefetched_marine:
                run, assets, stac_stats = prefetched_marine[collection]
            else:
                run, assets, stac_stats = list_latest_assets(collection, previous_run.get("referenceTime"))
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            if not assets:
                raise RuntimeError("no forecast-step GRIB assets found in latest STAC run")
            if collection in MARINE_COLLECTIONS:
                research_replay_catalog[collection] = {"modelRun": run, "assets": assets}
            zone_registry_signature = current_zone_registry_signature
            processing_signature = f"parser:{PARSER_VERSION}|params:{PARAMETER_MAP_VERSION}|grid:{GRID_LOOKUP_VERSION}|zones:{zone_registry_signature}"
            same_processing = previous_run.get("processingSignature") == processing_signature
            same_run = previous_run.get("referenceTime") == run
            previous_steps = dict(previous_run.get("processedSteps") or {}) if same_processing and same_run else {}
            required_for_family = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
            previously_processed = {
                valid for valid, step in previous_steps.items()
                if step.get("complete") is True
                and set(step.get("recognizedParameters") or []) >= required_for_family
                and int(step.get("zonesTouched") or 0) > 0
            }
            result["diagnostics"]["assetsRetriedIncomplete"] += max(0, len(previous_steps) - len(previously_processed))
            run_info = {"referenceTime": run, "parserVersion": PARSER_VERSION,
                        "parameterMapVersion": PARAMETER_MAP_VERSION, "gridLookupVersion": GRID_LOOKUP_VERSION,
                        "processingSignature": processing_signature,
                        "assetsDiscovered": len(assets), "assetsProcessed": 0, "assetsReused": 0,
                        "assetsSkippedPreviouslyProcessed": 0, "processedValidTimes": sorted(previously_processed),
                        "processedSteps": previous_steps, "recognizedParameters": []}
            result["runs"][collection] = run_info
            recognized: set[str] = set()
            for previous_step in (run_info.get("processedSteps") or {}).values():
                if previous_step.get("complete"):
                    recognized.update(previous_step.get("recognizedParameters") or [])
            budget_stop = None
            for asset_number, asset in enumerate(assets, start=1):
                if asset["valid"] in previously_processed:
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    if (
                        coastal_point_stage_targets
                        and not stage_asset_complete(coastal_point_stage, coastal_point_stage_targets, collection, asset["valid"])
                        and not should_stop_work()
                    ):
                        cached_path = cached_asset_path(str(asset.get("href") or ""))
                        if cached_path.is_file():
                            register_raw_cache_asset(
                                cached_path,
                                str(asset.get("href") or ""),
                                collection,
                                run,
                                asset["valid"],
                                item_id=str(asset.get("id") or "") or None,
                                item_created_at=asset.get("itemCreatedAt"),
                                item_updated_at=asset.get("itemUpdatedAt"),
                            )
                            private_diagnostics: dict[str, Any] = {
                                "gribFieldInventory": {},
                                "persistentFieldInventory": {},
                                "marineGridSearch": {},
                                "batchedGridReads": 0,
                            }
                            process_grib(
                                cached_path,
                                collection,
                                run,
                                asset["valid"],
                                coastal_point_stage_targets,
                                {"generatedAt": generated, "zones": {}},
                                private_diagnostics,
                                None,
                                coastal_point_stage,
                            )
                            prune_coastal_point_stage_hours(coastal_point_stage, generated)
                            save_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage)
                    continue
                if should_stop_work():
                    budget_stop = "bulk runtime budget reached"
                    break
                try:
                    path, reused = download_asset(
                        asset["href"],
                        asset.get("size"),
                        budget,
                        collection=collection,
                        model_run=run,
                        valid_time=asset["valid"],
                        item_id=str(asset.get("id") or "") or None,
                        item_created_at=asset.get("itemCreatedAt"),
                        item_updated_at=asset.get("itemUpdatedAt"),
                    )
                except RuntimeError as exc:
                    if "budget" in str(exc).lower():
                        budget_stop = str(exc)
                        break
                    raise
                if reused:
                    result["diagnostics"]["reusedAssets"] += 1
                    run_info["assetsReused"] += 1
                progress(f"{collection}: behandler forecast-step {asset_number}/{len(assets)} {asset['valid']} ({'genbrugt' if reused else 'downloadet'})")
                found, touched, interrupted, messages_seen, zone_lookups = process_grib(
                    path,
                    collection,
                    run,
                    asset["valid"],
                    zones,
                    result,
                    result["diagnostics"],
                    current_shadow,
                    coastal_point_stage,
                )
                scrub_private_stage_diagnostics(result["diagnostics"])
                if coastal_point_stage_targets:
                    prune_coastal_point_stage_hours(coastal_point_stage, generated)
                    save_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage)
                research_run_metrics["samplesWrittenThisRun"] = (
                    int(replay_summary.get("samplesWritten") or 0)
                    + int(result["diagnostics"].get("currentFieldShadowSamplesWritten") or 0)
                )
                if (
                    collection in MARINE_COLLECTIONS
                    and research_targets
                    and not interrupted
                    and {"current-u", "current-v"} <= found
                ):
                    current_shadow["cursor"] = next_research_cursor
                    current_shadow["lastSelectedPartIds"] = selected_research_part_ids
                    research_rotation_completed = True
                    research_run_metrics["rotationAdvancedThisRun"] = True
                    result["diagnostics"]["currentFieldShadow"] = write_current_field_shadow_checkpoint(
                        current_shadow,
                        generated,
                        selected_research_part_ids,
                        research_run_metrics,
                        regional_proxy_targets,
                    )
                if (
                    collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                    and regional_proxy_targets
                    and not interrupted
                    and {"current-u", "current-v"} <= found
                ):
                    regional_proxy_collection_completed = True
                recognized.update(found)
                result["diagnostics"]["messagesSeen"] += messages_seen
                result["diagnostics"]["zoneLookups"] += zone_lookups
                required_for_family = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
                step_recognized = sorted(set(found) & set(TARGETS[COLLECTION_FAMILY[collection]]))
                step_complete = set(step_recognized) >= required_for_family and len(touched) > 0
                if not interrupted and step_complete:
                    run_info["assetsProcessed"] += 1
                    previously_processed.add(asset["valid"])
                    run_info["processedValidTimes"] = sorted(previously_processed, key=epoch)
                elif not interrupted:
                    previously_processed.discard(asset["valid"])
                    run_info["processedValidTimes"] = sorted(previously_processed, key=epoch)
                if not interrupted:
                    run_info["processedSteps"][asset["valid"]] = {
                        "recognizedParameters": step_recognized,
                        "requiredParameters": sorted(required_for_family),
                        "missingRequiredParameters": sorted(required_for_family - set(step_recognized)),
                        "zonesTouched": len(touched),
                        "complete": step_complete,
                        "parserVersion": PARSER_VERSION,
                        "processingSignature": processing_signature
                    }
                fresh_zone_ids.update(touched)
                if collection in MARINE_COLLECTIONS:
                    fresh_marine_zone_ids.update(touched)
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
                progress(f"{collection}: checkpoint gemt; steps={run_info['assetsProcessed']}, felter={sorted(recognized)}, resterende={runtime_remaining():.0f}s")
                if interrupted:
                    budget_stop = "bulk runtime budget reached inside GRIB processing"
                    break
            result["diagnostics"]["parametersByCollection"][collection] = sorted(recognized)
            run_info["recognizedParameters"] = sorted(recognized)
            required = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
            made_progress = (run_info["assetsProcessed"] > 0 or int(result["diagnostics"].get("reusedAssets") or 0) > collection_start_reused or budget["bytes"] > collection_start_bytes)
            if not made_progress and recognized >= required and run_info["assetsSkippedPreviouslyProcessed"] == len(assets):
                state["lastCheckedAt"] = generated
                state["referenceTime"] = run
                state["lastError"] = None
                state["lastBudgetInterruptedAt"] = None
                result["diagnostics"]["collectionsUnchanged"].append(collection)
                result["diagnostics"]["zeroProgressCollections"].append(collection)
            elif recognized >= required and run_info["assetsProcessed"]:
                state["lastSuccessfulAt"] = generated
                state["referenceTime"] = run
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                state["lastError"] = None
                state["lastBudgetInterruptedAt"] = None
                result["diagnostics"]["collectionsSucceeded"].append(collection)
            elif recognized:
                state["lastPartialAt"] = generated
                state["referenceTime"] = run
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                result["diagnostics"]["collectionsPartial"].append(collection)
            else:
                raise RuntimeError("GRIB downloaded but no required RavRadar parameters were recognized")
            if made_progress:
                productive_collections += 1
            if budget_stop:
                state["lastBudgetInterruptedAt"] = generated
                result["diagnostics"]["errors"].append({"collection": collection, "message": budget_stop, "partialProgressPreserved": True})
        except Exception as exc:
            message = str(exc)
            failures = int(state.get("consecutiveFailures") or 0) + 1
            parser_blocked = "no required RavRadar parameters" in message
            parser_exception = isinstance(exc, (KeyError, TypeError, IndexError, AttributeError))
            failure_class = "parser-blocked" if parser_blocked else ("parser-exception" if parser_exception else "transient")
            delay_minutes = 24 * 60 if parser_blocked else (15 if parser_exception else min(180, 10 * (2 ** min(failures - 1, 4))))
            state["consecutiveFailures"] = failures
            state["lastError"] = message
            state["failureClass"] = failure_class
            state["blockedParserVersion"] = PARSER_VERSION if (parser_blocked or parser_exception) else None
            state["nextEligibleAt"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace("+00:00", "Z")
            result["diagnostics"]["errors"].append({"collection": collection, "message": message, "failureClass": state["failureClass"], "retryAfterMinutes": delay_minutes})

    replay_targets: list[dict[str, Any]] = []
    if not research_rotation_completed:
        replay_targets.extend(rotating_research_targets)
    if not regional_proxy_collection_completed:
        replay_targets.extend(regional_proxy_targets)

    if not replay_targets:
        result["diagnostics"]["currentFieldShadowCachedReplay"] = {
            "attempted": False,
            "reason": "fresh-marine-assets-covered-private-targets",
            "assetsCompleted": 0,
            "samplesWritten": 0,
            "bootstrapDownloads": 0,
            "bootstrapDownloadedBytes": 0,
        }
    else:
        replay_summary = replay_current_field_shadow_from_cache(
            research_replay_catalog,
            replay_targets,
            current_shadow,
            generated,
            budget,
        )
        result["diagnostics"]["currentFieldShadowCachedReplay"] = replay_summary
        research_run_metrics["cachedReplayAssetsThisRun"] = int(replay_summary.get("assetsCompleted") or 0)
        research_run_metrics["samplesWrittenThisRun"] = (
            int(result["diagnostics"].get("currentFieldShadowSamplesWritten") or 0)
            + int(replay_summary.get("samplesWritten") or 0)
        )
        if (
            not research_rotation_completed
            and rotating_research_targets
            and int(replay_summary.get("assetsCompleted") or 0) > 0
            and not replay_summary.get("interrupted")
        ):
            current_shadow["cursor"] = next_research_cursor
            current_shadow["lastSelectedPartIds"] = selected_research_part_ids
            research_run_metrics["rotationAdvancedThisRun"] = True

    result["diagnostics"]["currentFieldShadow"] = write_current_field_shadow_checkpoint(
        current_shadow,
        generated,
        selected_research_part_ids,
        research_run_metrics,
        regional_proxy_targets,
    )
    result["diagnostics"]["freshMarineZoneIds"] = sorted(fresh_marine_zone_ids)
    scrub_private_stage_diagnostics(result["diagnostics"])
    if coastal_point_stage_targets:
        prune_coastal_point_stage_hours(coastal_point_stage, generated)
        save_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage)
    clean_and_summarize(result, fresh_zone_ids, budget)
    result["diagnostics"]["currentCoverageOwnerAudit"] = write_current_coverage_owner_audit(
        current_shadow,
        part_doc,
        result,
        zones_geo,
        generated,
    )
    diag = result["diagnostics"]
    fresh_successes, fresh_partials = len(diag["collectionsSucceeded"]), len(diag["collectionsPartial"])
    if fresh_successes or fresh_partials:
        result["sourceUpdatedAt"] = generated
    result["refreshStatus"] = "ok" if productive_collections >= COLLECTIONS_PER_RUN and fresh_successes else ("partial" if fresh_successes or fresh_partials or result["diagnostics"]["zeroProgressCollections"] else "failed")

    write_checkpoint(result, fresh_zone_ids, budget, result["refreshStatus"])
    prune_stats = prune_raw_cache()
    cache_after = raw_cache_inventory()
    write_cache_audit(cache_before, cache_after, prune_stats["removedFiles"], prune_stats["removedBytes"])
    result["diagnostics"]["rawCache"] = {"before": cache_before, "after": cache_after, **prune_stats, "maxBytes": RAW_CACHE_MAX_BYTES}
    summary = {**diag, "refreshStatus": result["refreshStatus"], "sourceUpdatedAt": result.get("sourceUpdatedAt"),
               "preservedPreviousZones": max(0, len(result["zones"]) - len(fresh_zone_ids))}
    write_github_outputs(
        result["refreshStatus"], fresh_successes, fresh_partials,
        len(result["zones"]), budget["bytes"]
    )
    write_step_summary(result, scheduled, diag, budget, fresh_successes, fresh_partials)
    print(json.dumps(summary, ensure_ascii=False))
    return 0 if fresh_successes or fresh_partials else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"DMI bulk downloader failed safely: {exc}", file=sys.stderr, flush=True)
        write_github_outputs("failed", error=str(exc))
        write_failure_summary(exc)
        raise SystemExit(2)

# 4.0.29 diagnostics placeholders: zonesWithAnyData/zonesWith96Hours
