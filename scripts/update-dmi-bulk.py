#!/usr/bin/env python3
"""Build RavRadar's DMI cache from forecast-step GRIB assets.

DMI STAC items represent forecast steps, not individual parameters. Each selected
GRIB file is downloaded once, inventoried message-by-message with ecCodes, and only
the collection-specific fields needed by RavRadar are extracted. Progress, failures
and collection rotation are persisted across runs.
"""
from __future__ import annotations

import copy
import hashlib
import json
import math
import os
import pathlib
import re
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

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
from lib.dmi_cache_migration import prune_previous_sampling_mismatches, same_sampling_point
from lib.copernicus_current import (
    COLD_BRIDGE_HOURS,
    PUBLIC_END_OFFSET_HOURS,
    load_targets as load_coastal_part_targets,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.dmi_native_provenance import (
    COLLECTION_FAMILY,
    COMPONENT_FIELD_SET,
    COMPONENT_KIND,
    COMPONENT_SPATIAL_SELECTION,
    CURRENT_MAX_DISTANCE_KM,
    CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID,
    CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION,
    CURRENT_OPERATIONAL_LEDGER_STATES,
    CURRENT_PREFERRED_DISTANCE_KM,
    CURRENT_VECTOR_SELECTION,
    CURRENT_VECTOR_SEMANTICS_VERSION,
    DKSS_MAX_FORECAST_LEAD_HOURS,
    MARINE_COLLECTIONS,
    SPATIAL_PROVENANCE_VERSION,
    build_current_part_outcome_proof,
    canonical_time,
    canonical_current_source_asset,
    canonical_verified_part_current_attestation,
    complete_native_source_for_hour,
    component_collection_allowed,
    current_official_assets_sha256,
    current_operational_ledger_ready,
    derive_current_part_outcome_partition,
    part_time_pairs_sha256,
    processed_source_assets_from_current_operational_ledger,
    sampling_identity,
    sanitized_current_attestation,
    validate_current_part_outcome_proof,
    valid_times_sha256,
    wave_distance_allowed,
)
from lib.coastal_point_staging import (
    load_private_document as load_coastal_point_stage,
    prune_hours as prune_coastal_point_stage_hours,
    save_private_document as save_coastal_point_stage,
    stage_asset_complete,
    staged_targets as build_coastal_point_stage_targets,
)
from lib.dmi_wave_history_bootstrap import (
    COLD_START_MODE as WAVE_BOOTSTRAP_COLD_START_MODE,
    EXPECTED_COASTAL_PART_COUNT as WAVE_BOOTSTRAP_EXPECTED_PART_COUNT,
    MIGRATION_MODE as WAVE_BOOTSTRAP_MIGRATION_MODE,
    WAM_COLLECTIONS as WAVE_BOOTSTRAP_COLLECTIONS,
    WaveBootstrapError,
    format_utc_hour as format_wave_bootstrap_hour,
    load_coastal_part_registry as load_wave_bootstrap_registry,
    parse_utc_hour as parse_wave_bootstrap_hour,
    policy_for_mode as wave_bootstrap_policy_for_mode,
    policy_utc_hours as wave_bootstrap_policy_utc_hours,
    select_stac_wave_history_assets,
    validate_wave_history_cache,
    validate_wave_operational_handoff_cache,
)

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
try:
    from eccodes import (
        OutOfAreaError, codes_get, codes_get_array, codes_get_elements, codes_grib_find_nearest,
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
RAW_CACHE_MANIFEST_SCHEMA_VERSION = 2
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
STAC_PAGE_LIMIT = max(1, min(1000, int(os.getenv("DMI_STAC_PAGE_LIMIT", "1000"))))
STAC_MAX_PAGES = max(1, min(100, int(os.getenv("DMI_STAC_MAX_PAGES", "20"))))
STAC_MAX_INVENTORY_ITEMS = max(
    STAC_PAGE_LIMIT,
    min(100_000, int(os.getenv("DMI_STAC_MAX_INVENTORY_ITEMS", "20000"))),
)
TIME_STRIDE_HOURS = max(1, int(os.getenv("DMI_BULK_TIME_STRIDE_HOURS", "3")))
COLLECTIONS_PER_RUN = max(1, int(os.getenv("DMI_BULK_COLLECTIONS_PER_RUN", "2")))
WAM_MAX_FORECAST_LEAD_HOURS = 132
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
PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH: float | None = None

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

PARSER_VERSION = 20
PARAMETER_MAP_VERSION = 4
GRID_LOOKUP_VERSION = 8
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
    # Height and period remain the independently usable mobilisation/Candidate G
    # rollback tuple. The integrated model additionally requires same-cell direction
    # in its last-mile state and fails closed when this optional provenance field is
    # absent; keeping the base tuple preserves an operational rollback without
    # pretending that missing direction is neutral.
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


class DmiGridLookupError(RuntimeError):
    """An ecCodes/grid failure that must never masquerade as spatial absence."""

    def __init__(self, message: str, failure_code: str) -> None:
        super().__init__(message)
        if not re.fullmatch(r"[A-Z][A-Z0-9_]{2,55}", failure_code):
            raise ValueError("DMI grid failure code must be bounded and payload-free")
        self.failure_code = failure_code


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


def safe_error_message(error: Any, maximum: int = 500) -> str:
    """Redact credentials and URL queries before any diagnostic sink."""
    text = str(error).replace("\r", " ").replace("\n", " ")
    if API_KEY:
        text = text.replace(API_KEY, "[redacted]")
    text = re.sub(r"(?i)(api[-_]?key|token|signature|sig)=([^\s&]+)", r"\1=[redacted]", text)
    text = re.sub(r"(https?://[^\s?]+)\?[^\s]+", r"\1?[redacted]", text)
    return text[:maximum] or type(error).__name__


def collection_failure_code(error: Exception) -> str:
    """Classify one collection failure without exposing exception payloads."""
    if isinstance(error, DmiGridLookupError):
        return error.failure_code
    message = safe_error_message(error)
    fixed_prefix_codes = (
        ("DMI metadata request failed", "STAC_REQUEST_FAILED"),
        ("DMI metadata response is not valid JSON", "STAC_RESPONSE_INVALID_JSON"),
        ("DMI metadata response is not a JSON object", "STAC_RESPONSE_INVALID_OBJECT"),
        ("DMI bulk asset has an invalid declared size", "ASSET_DECLARED_SIZE_INVALID"),
        ("DMI bulk asset has an invalid Content-Length", "ASSET_CONTENT_LENGTH_INVALID"),
        ("DMI bulk asset length conflicts with STAC metadata", "ASSET_LENGTH_CONFLICT"),
        ("DMI bulk asset download is incomplete", "ASSET_DOWNLOAD_INCOMPLETE"),
        ("DMI bulk asset request failed", "ASSET_REQUEST_FAILED"),
        ("DMI bulk download budget", "DOWNLOAD_BUDGET_EXCEEDED"),
        ("no forecast-step GRIB assets found", "STAC_NO_FORECAST_ASSETS"),
        ("GRIB downloaded but no required RavRadar parameters were recognized", "GRIB_PARAMETERS_UNRECOGNIZED"),
    )
    for prefix, code in fixed_prefix_codes:
        if message.startswith(prefix):
            return code
    parser_codes = {
        KeyError: "PARSER_KEY_ERROR",
        TypeError: "PARSER_TYPE_ERROR",
        IndexError: "PARSER_INDEX_ERROR",
        AttributeError: "PARSER_ATTRIBUTE_ERROR",
        ValueError: "PARSER_VALUE_ERROR",
    }
    for error_type, code in parser_codes.items():
        if isinstance(error, error_type):
            return code
    return "COLLECTION_RUNTIME_FAILURE"


def diagnostic_collection_failure_codes(diagnostics: dict[str, Any]) -> list[str]:
    """Return at most three deterministic, payload-free marine failure codes."""
    observed = {
        str(error.get("failureCode"))
        for error in (diagnostics.get("errors") or [])
        if isinstance(error, dict)
        and str(error.get("collection") or "") in MARINE_COLLECTIONS
        and re.fullmatch(r"[A-Z][A-Z0-9_]{2,55}", str(error.get("failureCode") or ""))
    }
    return sorted(observed)[:3]


def request_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = dict(params or {})
    if API_KEY and url.startswith(STAC_ROOT):
        query.setdefault("api-key", API_KEY)
    try:
        response = STAC_SESSION.get(url, params=query, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        suffix = f" (HTTP {status})" if isinstance(status, int) else ""
        raise RuntimeError(f"DMI metadata request failed{suffix}") from None
    try:
        document = response.json()
    except (ValueError, requests.RequestException):
        raise RuntimeError("DMI metadata response is not valid JSON") from None
    if not isinstance(document, dict):
        raise RuntimeError("DMI metadata response is not a JSON object")
    return document


STAC_RUN_TIME_ALIASES = (
    "forecast:reference_datetime", "reference_datetime", "modelRun", "model_run",
)
STAC_VALID_TIME_ALIASES = (
    "datetime", "forecast:valid_time", "valid_time", "end_datetime", "start_datetime",
)


def _canonical_stac_time_aliases(
    item: Any,
    aliases: tuple[str, ...],
    *,
    required: bool,
) -> tuple[str | None, bool]:
    """Parse every present alias and reject malformed or conflicting claims."""
    if not isinstance(item, dict) or not isinstance(item.get("properties"), dict):
        return None, False
    properties = item["properties"]
    parsed: list[str] = []
    for key in aliases:
        if key not in properties:
            continue
        raw = properties.get(key)
        if (
            not isinstance(raw, str)
            or raw != raw.strip()
            or not re.fullmatch(
                r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}"
                r"(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})",
                raw,
            )
        ):
            return None, False
        try:
            parsed_time = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None, False
        if parsed_time.tzinfo is None or parsed_time.utcoffset() is None:
            return None, False
        value = parsed_time.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
        parsed.append(value)
    if not parsed:
        return None, not required
    if len(set(parsed)) != 1:
        return None, False
    return parsed[0], True


def item_run(item: dict[str, Any]) -> str | None:
    value, valid = _canonical_stac_time_aliases(
        item, STAC_RUN_TIME_ALIASES, required=True,
    )
    # Publication and valid-time metadata are not model-run identity.  If DMI
    # omits every explicit run field, this item is unusable rather than guessed
    # from `created`, the item id or the forecast-valid timestamp.
    return value if valid else None


def item_valid(item: dict[str, Any]) -> str | None:
    value, valid = _canonical_stac_time_aliases(
        item, STAC_VALID_TIME_ALIASES, required=True,
    )
    return value if valid else None


def item_timestamp(item: dict[str, Any], key: str) -> str | None:
    """Return one canonical explicit STAC timestamp; never infer it."""
    value, valid = _canonical_stac_time_aliases(item, (key,), required=False)
    return value if valid else None


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


def _canonical_stac_asset_size(asset: Any) -> tuple[int | None, bool]:
    if not isinstance(asset, dict):
        return None, False
    parsed: list[int] = []
    for key in ("file:size", "size", "content_length"):
        if key not in asset:
            continue
        raw = asset.get(key)
        if isinstance(raw, int) and not isinstance(raw, bool):
            value = raw
        else:
            return None, False
        if value <= 0:
            return None, False
        parsed.append(value)
    if not parsed:
        return None, True
    if len(set(parsed)) != 1:
        return None, False
    return parsed[0], True


def grib_asset(item: dict[str, Any]) -> tuple[str, int | None, str] | None:
    ranked: list[tuple[int, str, str, dict[str, Any]]] = []
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
        preferred = key.lower() in {"data", "grib", "download"} or "data" in roles
        ranked.append((0 if preferred else 1, href.strip(), f"{key} {title}", asset))
    if not ranked:
        return None
    ranked.sort(key=lambda row: (row[0], row[1]))
    _, href, description, selected_asset = ranked[0]
    size, size_valid = _canonical_stac_asset_size(selected_asset)
    if not size_valid:
        return None
    return href, size, description


def canonical_stac_item_identity(item: Any) -> dict[str, Any] | None:
    """Return one fail-closed item/run/time/asset revision identity."""
    if not isinstance(item, dict):
        return None
    raw_item_id = item.get("id")
    if (
        not isinstance(raw_item_id, str)
        or not raw_item_id
        or raw_item_id != raw_item_id.strip()
    ):
        return None
    run, run_valid = _canonical_stac_time_aliases(
        item, STAC_RUN_TIME_ALIASES, required=True,
    )
    valid_time, valid_time_valid = _canonical_stac_time_aliases(
        item, STAC_VALID_TIME_ALIASES, required=True,
    )
    created_at, created_valid = _canonical_stac_time_aliases(
        item, ("created",), required=False,
    )
    updated_at, updated_valid = _canonical_stac_time_aliases(
        item, ("updated",), required=False,
    )
    asset = grib_asset(item)
    if not (
        run_valid
        and valid_time_valid
        and created_valid
        and updated_valid
        and run
        and valid_time
        and asset is not None
    ):
        return None
    href, size, description = asset
    return {
        "itemId": raw_item_id,
        "modelRun": run,
        "validTime": valid_time,
        "itemCreatedAt": created_at,
        "itemUpdatedAt": updated_at,
        "href": href,
        "size": size,
        "description": description,
    }


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
    latest = max(future_horizon, key=epoch)
    cadence_hours = observed_run_cadence_hours(runs)
    preferred_lag_hours = (
        max(0.0, (epoch(latest) - epoch(preferred_run)) / 3600.0)
        if preferred_run in mature
        else 0.0
    )
    preferred_still_scheduled = (
        preferred_run in mature
        and (
            preferred_run == latest
            or (
                cadence_hours is not None
                and preferred_lag_hours <= cadence_hours + 1e-6
            )
        )
    )
    stale_preferred_discarded = preferred_run in mature and not preferred_still_scheduled
    if preferred_still_scheduled:
        selected = preferred_run
    elif mature:
        selected = max(mature, key=epoch)
    else:
        selected = max(future_horizon, key=lambda run: (future_horizon[run], epoch(run)))
    return selected, {
        "latestRun": latest,
        "selectedRun": selected,
        "latestRunFutureHorizonHours": round(future_horizon[latest], 1),
        "selectedRunFutureHorizonHours": round(future_horizon[selected], 1),
        "runRetentionHorizonHours": retention_horizon_hours,
        "preferredProgressiveRunRetained": selected == preferred_run,
        "preferredProgressiveRunDiscardedAsStale": stale_preferred_discarded,
        "incompleteLatestRunDeferred": selected != latest,
    }


def prioritize_strict_current_recovery(
    scheduled: list[str],
    strict_current_anchor_available: bool,
) -> list[str]:
    """Put DKSS first only while the exact coastal-part current anchor is absent."""
    if strict_current_anchor_available:
        return list(scheduled)
    return [
        *[collection for collection in scheduled if collection in MARINE_COLLECTIONS],
        *[collection for collection in scheduled if collection not in MARINE_COLLECTIONS],
    ]


def prioritize_first_cutover_collections(
    scheduled: list[str],
    strict_current_anchor_available: bool,
) -> list[str]:
    """Order the bounded first-cutover loop without starving strict DKSS recovery."""
    wam = [collection for collection in scheduled if collection in WAVE_BOOTSTRAP_COLLECTIONS]
    remainder = [collection for collection in scheduled if collection not in WAVE_BOOTSTRAP_COLLECTIONS]
    if strict_current_anchor_available:
        return [*wam, *remainder]
    return [
        *[collection for collection in remainder if collection in MARINE_COLLECTIONS],
        *wam,
        *[collection for collection in remainder if collection not in MARINE_COLLECTIONS],
    ]


def asset_identity_sha256(href: Any) -> str | None:
    text = str(href or "").strip()
    if not text:
        return None
    canonical_href = text.split("?", 1)[0].split("#", 1)[0]
    return hashlib.sha256(canonical_href.encode("utf-8")).hexdigest()


def official_current_asset_identity(
    collection: str,
    model_run: Any,
    asset: Any,
) -> dict[str, Any] | None:
    if collection not in MARINE_COLLECTIONS or not isinstance(asset, dict):
        return None
    run = canonical_time(model_run)
    valid_time = canonical_time(asset.get("valid") or asset.get("validTime"))
    item_id = str(asset.get("id") or asset.get("itemId") or "").strip()
    identity = str(asset.get("assetIdentitySha256") or "")
    asset_size = (
        asset.get("assetSizeBytes")
        if "assetSizeBytes" in asset
        else asset.get("size")
    )
    item_created_at = canonical_time(asset.get("itemCreatedAt"))
    item_updated_at = canonical_time(asset.get("itemUpdatedAt"))
    if not identity:
        identity = str(asset_identity_sha256(asset.get("href")) or "")
    if not (
        run
        and valid_time
        and item_id
        and re.fullmatch(r"[0-9a-f]{64}", identity)
        and (
            asset_size is None
            or isinstance(asset_size, int) and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and (asset.get("itemCreatedAt") is None or item_created_at)
        and (asset.get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    return {
        "collection": collection,
        "modelRun": run,
        "validTime": valid_time,
        "itemId": item_id,
        "assetIdentitySha256": identity,
        "assetSizeBytes": asset_size,
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }


def processed_step_source_for_official_asset(
    step: Any,
    *,
    collection: str,
    model_run: Any,
    valid_time: Any,
    processing_signature: Any,
    official_asset: Any,
) -> dict[str, Any] | None:
    if not isinstance(step, dict) or not isinstance(official_asset, dict):
        return None
    if (
        step.get("complete") is not True
        or step.get("parserVersion") != PARSER_VERSION
        or not isinstance(processing_signature, str)
        or not processing_signature
        or step.get("processingSignature") != processing_signature
        or not {"current-u", "current-v"}
            <= set(step.get("recognizedParameters") or [])
        or int(step.get("zonesTouched") or 0) <= 0
    ):
        return None
    source = canonical_current_source_asset(step.get("sourceAsset"))
    expected = official_current_asset_identity(collection, model_run, official_asset)
    expected_valid_time = canonical_time(valid_time)
    if source is None or expected is None or expected["validTime"] != expected_valid_time:
        return None
    if (
        source["collection"] != expected["collection"]
        or source["modelRun"] != expected["modelRun"]
        or source["validTime"] != expected["validTime"]
        or source["itemId"] != expected["itemId"]
        or source["assetIdentitySha256"] != expected["assetIdentitySha256"]
        or source["assetSizeBytes"] != expected["assetSizeBytes"]
        or source["itemCreatedAt"] != expected["itemCreatedAt"]
        or source["itemUpdatedAt"] != expected["itemUpdatedAt"]
    ):
        return None
    return source


def reusable_processed_steps(
    previous_run: dict[str, Any],
    *,
    collection: str,
    same_processing: bool,
    same_run: bool,
    strict_current_anchor_available: bool,
    required_valid_times: set[str] | None = None,
    required_asset_provenance: dict[str, dict[str, Any]] | None = None,
    current_target_ids: list[str] | None = None,
    current_target_registry_sha256: str | None = None,
) -> dict[str, Any]:
    """Reuse only current-parser checkpoints bound to the selected STAC asset."""
    if not same_processing or not same_run:
        return {}
    processing_signature = previous_run.get("processingSignature")
    if not isinstance(processing_signature, str) or not processing_signature:
        return {}
    steps = previous_run.get("processedSteps") or {}
    if not isinstance(steps, dict):
        return {}
    if collection not in MARINE_COLLECTIONS:
        return {
            valid_time: step
            for valid_time, step in steps.items()
            if isinstance(step, dict)
            and step.get("parserVersion") == PARSER_VERSION
            and step.get("processingSignature") == processing_signature
        }
    if (
        required_valid_times is None
        or not isinstance(required_asset_provenance, dict)
        or not isinstance(current_target_ids, list)
        or not current_target_registry_sha256
    ):
        return {}
    required = {
        canonical_time(value) for value in required_valid_times
        if canonical_time(value)
    }
    reusable: dict[str, Any] = {}
    for raw_valid_time, step in steps.items():
        valid_time = canonical_time(raw_valid_time)
        if valid_time not in required:
            continue
        official_asset = required_asset_provenance.get(valid_time)
        source = processed_step_source_for_official_asset(
            step,
            collection=collection,
            model_run=previous_run.get("referenceTime"),
            valid_time=valid_time,
            processing_signature=processing_signature,
            official_asset=official_asset,
        )
        if source is None:
            continue
        try:
            validate_current_part_outcome_proof(
                step.get("currentPartOutcomeProof"),
                current_target_ids,
                current_target_registry_sha256,
                processing_signature,
                source,
            )
        except ValueError:
            continue
        reusable[valid_time] = step
    _ = strict_current_anchor_available
    return reusable


def _bounded_stac_inventory(
    collection: str,
    minimum_valid_time: str,
    maximum_valid_time: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Follow one same-origin STAC item chain to documented exhaustion."""
    endpoint = f"{STAC_ROOT.rstrip('/')}/collections/{collection}/items"
    endpoint_parts = urlparse(endpoint)
    next_url: str | None = endpoint
    next_params: dict[str, Any] | None = {
        "limit": STAC_PAGE_LIMIT,
        "bbox": "7,54,16,58",
        "datetime": f"{minimum_valid_time}/{maximum_valid_time}",
        "sortorder": "datetime,DESC",
    }
    items: list[dict[str, Any]] = []
    raw_items_fetched = 0
    seen_item_ids: set[str] = set()
    seen_urls: set[str] = set()
    number_matched: int | None = None
    failure_codes: set[str] = set()
    pages = 0
    exhausted = False
    while next_url is not None:
        if pages >= STAC_MAX_PAGES:
            failure_codes.add("STAC_PAGINATION_PAGE_LIMIT")
            break
        canonical_request = next_url
        if next_params:
            canonical_request += "?initial-page"
        if canonical_request in seen_urls:
            failure_codes.add("STAC_PAGINATION_CYCLE")
            break
        seen_urls.add(canonical_request)
        data = request_json(next_url, next_params)
        pages += 1
        features = data.get("features")
        if not isinstance(features, list) or any(not isinstance(item, dict) for item in features):
            failure_codes.add("STAC_FEATURES_MALFORMED")
            break
        returned = data.get("numberReturned")
        if returned is not None:
            if isinstance(returned, bool) or not isinstance(returned, int) or returned < 0 or returned != len(features):
                failure_codes.add("STAC_NUMBER_RETURNED_MISMATCH")
                break
        matched = data.get("numberMatched")
        if matched is not None:
            if isinstance(matched, bool) or not isinstance(matched, int) or matched < 0:
                failure_codes.add("STAC_NUMBER_MATCHED_INVALID")
                break
            if number_matched is not None and matched != number_matched:
                failure_codes.add("STAC_NUMBER_MATCHED_CHANGED")
                break
            number_matched = matched
        if raw_items_fetched + len(features) > STAC_MAX_INVENTORY_ITEMS:
            failure_codes.add("STAC_INVENTORY_ITEM_LIMIT")
            break
        raw_items_fetched += len(features)
        unique_features: list[dict[str, Any]] = []
        for item in features:
            raw_item_id = item.get("id")
            if raw_item_id is None or raw_item_id == "":
                failure_codes.add("STAC_ITEM_IDENTITY_MISSING")
                continue
            if (
                not isinstance(raw_item_id, str)
                or raw_item_id != raw_item_id.strip()
                or not raw_item_id.strip()
            ):
                failure_codes.add("STAC_ITEM_IDENTITY_INVALID")
                continue
            item_id = raw_item_id
            if item_id in seen_item_ids:
                failure_codes.add("STAC_DUPLICATE_ITEM_IDENTITY")
                continue
            seen_item_ids.add(item_id)
            unique_features.append(item)
        items.extend(unique_features)
        links = data.get("links") or []
        if not isinstance(links, list):
            failure_codes.add("STAC_LINKS_MALFORMED")
            break
        raw_next = [
            str(link.get("href") or "").strip()
            for link in links
            if isinstance(link, dict) and str(link.get("rel") or "").lower() == "next"
        ]
        raw_next = [value for value in raw_next if value]
        if len(raw_next) > 1:
            failure_codes.add("STAC_MULTIPLE_NEXT_LINKS")
            break
        if raw_next:
            candidate = urljoin(next_url, raw_next[0])
            candidate_parts = urlparse(candidate)
            if (
                candidate_parts.scheme != endpoint_parts.scheme
                or candidate_parts.netloc != endpoint_parts.netloc
                or candidate_parts.path.rstrip("/") != endpoint_parts.path.rstrip("/")
                or candidate_parts.fragment
            ):
                failure_codes.add("STAC_UNSAFE_NEXT_LINK")
                break
            next_url = candidate
            next_params = None
            continue
        if number_matched is not None:
            if len(items) == number_matched:
                exhausted = True
            else:
                failure_codes.add("STAC_NUMBER_MATCHED_NOT_EXHAUSTED")
        elif len(features) < STAC_PAGE_LIMIT:
            # A terminal short page with no next relation exhausts the bounded
            # collection query even when the server omits aggregate counts.
            exhausted = True
        else:
            failure_codes.add("STAC_PAGINATION_UNPROVEN")
        next_url = None
    return items, {
        "paginationPagesFetched": pages,
        "paginationItemsFetched": raw_items_fetched,
        "paginationUniqueItems": len(items),
        "paginationNumberMatched": number_matched,
        "paginationExhausted": exhausted,
        "catalogInventoryComplete": exhausted and not failure_codes,
        "catalogInventoryFailureCodes": sorted(failure_codes),
    }


def list_latest_assets(
    collection: str,
    preferred_run: str | None = None,
    *,
    minimum_valid_time: str | None = None,
    required_valid_times: set[str] | None = None,
    required_horizon_end_time: str | None = None,
    allow_documented_required_gaps: bool = False,
) -> tuple[str | None, list[dict[str, Any]], dict[str, Any]]:
    required = {
        iso(value) for value in (required_valid_times or set())
        if iso(value)
    }
    inventory_start = (
        min(required, key=epoch)
        if required
        else iso(minimum_valid_time)
        or datetime.fromtimestamp(time.time() - 3600, timezone.utc)
            .isoformat().replace("+00:00", "Z")
    )
    inventory_end = (
        iso(required_horizon_end_time)
        or (max(required, key=epoch) if required else None)
        or datetime.fromtimestamp(
            time.time() + (
                WAM_MAX_FORECAST_LEAD_HOURS
                if collection in WAVE_BOOTSTRAP_COLLECTIONS
                else HOURS + 6
            ) * 3600,
            timezone.utc,
        ).isoformat().replace("+00:00", "Z")
    )
    if epoch(inventory_end) < epoch(inventory_start):
        inventory_end = inventory_start
    items, inventory_stats = _bounded_stac_inventory(
        collection,
        inventory_start,
        inventory_end,
    )
    runs: dict[str, list[dict[str, Any]]] = {}
    stats = {
        **inventory_stats,
        "itemsSeen": len(items),
        "itemsWithoutGrib": 0,
        "unparseableItems": 0,
        "forecastStepAssets": 0,
        "duplicateValidTimes": 0,
        "sampleItems": [],
    }
    seen_run_valid_times: set[tuple[str, str]] = set()
    for item in items:
        identity = canonical_stac_item_identity(item)
        if identity is None:
            stats["itemsWithoutGrib"] += 1
            stats["unparseableItems"] += 1
            continue
        run = identity["modelRun"]
        valid = identity["validTime"]
        maximum_lead_hours = (
            WAM_MAX_FORECAST_LEAD_HOURS
            if collection in WAVE_BOOTSTRAP_COLLECTIONS
            else HOURS + 6
        )
        run_valid_time = (run, valid)
        if run_valid_time in seen_run_valid_times:
            stats["duplicateValidTimes"] += 1
            stats["catalogInventoryComplete"] = False
            stats["catalogInventoryFailureCodes"] = sorted({
                *(stats.get("catalogInventoryFailureCodes") or []),
                "STAC_DUPLICATE_COLLECTION_RUN_VALID_TIME",
            })
            continue
        seen_run_valid_times.add(run_valid_time)
        if epoch(valid) < epoch(run) - 3600 or epoch(valid) > epoch(run) + maximum_lead_hours * 3600:
            continue
        href = identity["href"]
        size = identity["size"]
        item_id = identity["itemId"]
        asset_identity = asset_identity_sha256(href)
        if asset_identity is None:
            stats["itemsWithoutGrib"] += 1
            stats["unparseableItems"] += 1
            continue
        row = {
            "valid": valid,
            "href": href,
            "size": size,
            "id": item_id,
            "assetIdentitySha256": asset_identity,
            "itemCreatedAt": identity["itemCreatedAt"],
            "itemUpdatedAt": identity["itemUpdatedAt"],
        }
        runs.setdefault(run, []).append(row)
        stats["forecastStepAssets"] += 1
        if len(stats["sampleItems"]) < 5:
            stats["sampleItems"].append({"id": item.get("id"), "run": run, "valid": valid})
    if stats["unparseableItems"]:
        stats["catalogInventoryComplete"] = False
        stats["catalogInventoryFailureCodes"] = sorted({
            *(stats.get("catalogInventoryFailureCodes") or []),
            "UNPARSEABLE_STAC_ITEM",
        })
    if not runs:
        return None, [], stats
    selection_runs = runs
    required_horizon_end = iso(required_horizon_end_time)
    if required or required_horizon_end:
        first_required_epoch = (
            min(epoch(value) for value in required)
            if required
            else epoch(minimum_valid_time)
        )
        causal_runs = {
            candidate_run: rows
            for candidate_run, rows in runs.items()
            if epoch(candidate_run) <= first_required_epoch
        }
        exact_covering_runs = {
            candidate_run: rows
            for candidate_run, rows in causal_runs.items()
            if required <= {iso(row.get("valid")) for row in rows}
            and (
                required_horizon_end is None
                or max(epoch(row.get("valid")) for row in rows)
                    >= epoch(required_horizon_end)
            )
        }
        if allow_documented_required_gaps and collection in MARINE_COLLECTIONS:
            # DKSS is a native five-day product.  At a production target that
            # falls between its 00/06/12/18 UTC run anchors, the newest fully
            # published run legitimately ends before target+117.  Prove that
            # the selected run itself reached its documented +120 h terminal
            # lead; only then may the exhaustively inventoried remainder of the
            # public axis become exact upstream absence for Copernicus.
            selection_runs = {
                candidate_run: rows
                for candidate_run, rows in causal_runs.items()
                if any(
                    epoch(row.get("valid"))
                        == epoch(candidate_run)
                            + DKSS_MAX_FORECAST_LEAD_HOURS * 3600
                    for row in rows
                )
            }
            stats["nativeRunTerminalLeadHoursRequired"] = (
                DKSS_MAX_FORECAST_LEAD_HOURS
            )
            stats["nativeCompleteRunCount"] = len(selection_runs)
        else:
            selection_runs = exact_covering_runs
        stats["requiredExactValidTimeCount"] = len(required)
        stats["runsCoveringRequiredExactTimes"] = len(exact_covering_runs)
        stats["documentedRequiredGapsAllowed"] = allow_documented_required_gaps
        if not selection_runs:
            stats["selectedNativeRunComplete"] = False
            stats["requiredHorizonEndCovered"] = False if required_horizon_end else None
            stats["requiredWindowInventoryComplete"] = False
            stats["missingRequiredExactTimes"] = True
            return None, [], stats
    retention_horizon_hours = (
        HARMONIE_RUN_RETENTION_HOURS if collection == "harmonie_dini_sf" else COMPLETE_HORIZON_HOURS
    )
    run, run_selection = select_forecast_run(
        selection_runs,
        (
            None
            if allow_documented_required_gaps
                and collection in MARINE_COLLECTIONS
            else preferred_run if preferred_run in selection_runs else None
        ),
        retention_horizon_hours=retention_horizon_hours,
    )
    selected_valid_times = {
        iso(row.get("valid")) for row in runs[run] if iso(row.get("valid"))
    }
    selected_horizon_end_covered = (
        max(epoch(value) for value in selected_valid_times)
            >= epoch(required_horizon_end)
        if required_horizon_end and selected_valid_times
        else None
    )
    selected_native_run_complete = (
        collection in MARINE_COLLECTIONS
        and any(
            epoch(value)
                == epoch(run) + DKSS_MAX_FORECAST_LEAD_HOURS * 3600
            for value in selected_valid_times
        )
    )
    stats["selectedNativeRunComplete"] = selected_native_run_complete
    stats["requiredHorizonEndCovered"] = selected_horizon_end_covered
    stats["requiredWindowInventoryComplete"] = bool(
        stats.get("catalogInventoryComplete") is True
        and (
            (
                allow_documented_required_gaps
                and collection in MARINE_COLLECTIONS
                and selected_native_run_complete
            )
            or (
                required <= selected_valid_times
                and (
                    required_horizon_end is None
                    or selected_horizon_end_covered is True
                )
            )
        )
    )
    eligible_latest_run = str(run_selection["latestRun"])
    latest_run = max(runs, key=epoch)
    latest_future_horizon = max(
        (epoch(row["valid"]) - time.time()) / 3600
        for row in runs[latest_run]
    )
    run_selection.update({
        "eligibleLatestRun": eligible_latest_run,
        "latestRun": latest_run,
        "latestRunFutureHorizonHours": round(latest_future_horizon, 1),
        "incompleteLatestRunDeferred": run != latest_run,
    })
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
    selected_official_required = sorted({
        str(iso(row.get("valid")))
        for row in runs[run]
        if iso(row.get("valid")) in required
    }, key=epoch)
    stats["officialRequiredValidTimeCount"] = len(selected_official_required)
    stats["officialRequiredValidTimes"] = selected_official_required
    official_by_time: dict[str, dict[str, Any]] = {}
    for row in sorted(
        runs[run],
        key=lambda value: (
            epoch(value["valid"]),
            str(value["id"]),
            str(value.get("assetIdentitySha256") or ""),
        ),
    ):
        if row["valid"] not in required or row["valid"] in official_by_time:
            continue
        identity = official_current_asset_identity(collection, run, row)
        if identity is None:
            stats["catalogInventoryComplete"] = False
            stats["catalogInventoryFailureCodes"] = sorted({
                *(stats.get("catalogInventoryFailureCodes") or []),
                "UNPARSEABLE_SELECTED_STAC_ASSET",
            })
            continue
        official_by_time[row["valid"]] = identity
    stats["officialRequiredAssets"] = [
        official_by_time[valid_time]
        for valid_time in sorted(official_by_time, key=epoch)
    ]
    stats["officialRequiredGapCount"] = max(0, len(required) - len(selected_official_required))
    stats["officialNativeCadenceHours"] = 1 if collection in MARINE_COLLECTIONS else None
    unique: dict[str, dict[str, Any]] = {}
    minimum_valid_epoch = (
        epoch(minimum_valid_time)
        if minimum_valid_time is not None
        else time.time() - 3600
    )
    for row in sorted(
        runs[run],
        key=lambda r: (
            epoch(r["valid"]),
            str(r["id"]),
            str(r.get("assetIdentitySha256") or ""),
        ),
    ):
        if epoch(row["valid"]) < minimum_valid_epoch:
            stats["expiredForecastStepsSkipped"] = int(stats.get("expiredForecastStepsSkipped") or 0) + 1
            continue
        if row["valid"] not in required and not stride_selected(row["valid"], run):
            continue
        if row["valid"] in unique:
            stats["duplicateValidTimes"] += 1
            stats["catalogInventoryComplete"] = False
            stats["catalogInventoryFailureCodes"] = sorted({
                *(stats.get("catalogInventoryFailureCodes") or []),
                "STAC_DUPLICATE_COLLECTION_RUN_VALID_TIME",
            })
            continue
        unique[row["valid"]] = {
            **row,
            "collection": collection,
            "modelRun": run,
            "observedRunCadenceHours": cadence_hours,
            "latestRun": latest_run,
            "catalogScheduleFresh": catalog_schedule_fresh if cadence_hours is not None and publication_lag_hours is not None else None,
        }
    rows = sorted(
        unique.values(),
        key=lambda row: (
            0 if row["valid"] in required else 1,
            epoch(row["valid"]),
        ),
    )
    selected_rows = rows[:MAX_ASSETS_PER_COLLECTION]
    selected_required = sum(row["valid"] in required for row in selected_rows)
    stats["requiredRowsTruncatedByAssetLimit"] = max(
        0,
        len(selected_official_required) - selected_required,
    )
    stats["selectedForecastSteps"] = len(selected_rows)
    return run, selected_rows, stats


def private_wave_bootstrap_configuration() -> dict[str, Any] | None:
    mode = str(os.getenv("DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE", "none")).strip()
    if mode in {"", "none"}:
        return None
    if mode not in {WAVE_BOOTSTRAP_MIGRATION_MODE, WAVE_BOOTSTRAP_COLD_START_MODE}:
        raise WaveBootstrapError("INVALID_MODE")
    target_hour = format_wave_bootstrap_hour(parse_wave_bootstrap_hour(
        os.getenv("DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR")
    ))
    production_target = format_wave_bootstrap_hour(parse_wave_bootstrap_hour(
        os.getenv("RAVRADAR_PRODUCTION_TARGET_HOUR", target_hour)
    ))
    if parse_wave_bootstrap_hour(production_target) < parse_wave_bootstrap_hour(target_hour):
        raise WaveBootstrapError("INVALID_TIME")
    policy = wave_bootstrap_policy_for_mode(mode)
    required_hours = wave_bootstrap_policy_utc_hours(target_hour, policy)
    operational_exact_hours: list[str] = []
    cursor = parse_wave_bootstrap_hour(target_hour)
    production_end = parse_wave_bootstrap_hour(production_target)
    while cursor <= production_end:
        operational_exact_hours.append(format_wave_bootstrap_hour(cursor))
        cursor += timedelta(hours=1)
    if len(operational_exact_hours) > 4:
        raise WaveBootstrapError("INVALID_TIME")
    return {
        "mode": mode,
        "policy": policy,
        "targetHour": target_hour,
        "productionTargetHour": production_target,
        "requiredHours": required_hours,
        "operationalExactHours": tuple(operational_exact_hours),
    }


def list_private_wave_bootstrap_assets(
    collection: str,
    configuration: dict[str, Any],
) -> tuple[Any, tuple[Any, ...]]:
    """Select one bounded, strict WAM history without logging item identities.

    Candidate migration discovers the newest coherent run over precisely its
    40-hour pre-target state window, then requeries only that same bounded
    window.  The operational handoff and public forecast deliberately belong
    to a separately selected current WAM run.  A genuine cold start keeps the
    helper's exact 48h+target selection, including its exact-hour multi-run
    fallback; its target is subsequently replaced by the operational run.
    """
    if collection not in WAVE_BOOTSTRAP_COLLECTIONS:
        raise WaveBootstrapError("INVALID_COLLECTION")
    policy = configuration["policy"]
    required_hours = configuration["requiredHours"]
    discovery_start = format_wave_bootstrap_hour(
        parse_wave_bootstrap_hour(required_hours[0])
        - timedelta(hours=policy.maximum_interpolation_hours)
    )
    discovery = request_json(
        f"{STAC_ROOT}/collections/{collection}/items",
        {
            "limit": policy.maximum_stac_items,
            "bbox": "7,54,16,58",
            "datetime": f"{discovery_start}/{required_hours[-1]}",
            "sortorder": "datetime,DESC",
        },
    )
    plan = select_stac_wave_history_assets(
        discovery,
        collection=collection,
        target_hour=configuration["targetHour"],
        policy=policy,
    )
    if configuration["mode"] != WAVE_BOOTSTRAP_MIGRATION_MODE:
        return plan, plan.assets

    selected_runs = {asset.model_run for asset in plan.assets}
    if plan.selection_mode != "single-coherent-run" or len(selected_runs) != 1:
        raise WaveBootstrapError("COHERENT_RUN_REQUIRED")
    # The bounded discovery already pins every selected endpoint to that one
    # explicit run.  Returning the selected native endpoints preserves the
    # contract's <=4h same-run interpolation instead of falsely demanding a
    # native asset at every one of the 40 logical state hours.
    return plan, plan.assets




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
        return {"schemaVersion": RAW_CACHE_MANIFEST_SCHEMA_VERSION, "assets": {}}
    if (
        document.get("schemaVersion") != RAW_CACHE_MANIFEST_SCHEMA_VERSION
        or not isinstance(document.get("assets"), dict)
    ):
        return {"schemaVersion": RAW_CACHE_MANIFEST_SCHEMA_VERSION, "assets": {}}
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
    expected_size: int | None = None,
    content_sha256: str | None = None,
) -> None:
    if not collection or not model_run or not valid_time:
        return
    document = load_raw_cache_manifest()
    assets = document.setdefault("assets", {})
    registered_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    previous = assets.get(path.name) or {}
    actual_size = path.stat().st_size
    canonical_href = href.split("?", 1)[0].split("#", 1)[0]
    asset_identity_sha256 = hashlib.sha256(canonical_href.encode("utf-8")).hexdigest()
    normalized_item_id = str(item_id or "").strip() or None
    normalized_created_at = iso(item_created_at) if item_created_at else None
    normalized_updated_at = iso(item_updated_at) if item_updated_at else None
    declared_size = (
        expected_size
        if isinstance(expected_size, int)
        and not isinstance(expected_size, bool)
        and expected_size > 0
        else None
    )
    normalized_content_sha256 = str(content_sha256 or "")
    if not re.fullmatch(r"[0-9a-f]{64}", normalized_content_sha256):
        normalized_content_sha256 = ""
    same_capture_identity = bool(
        previous.get("collection") == collection
        and iso(previous.get("modelRun")) == iso(model_run)
        and iso(previous.get("validTime")) == iso(valid_time)
        and previous.get("itemId") == normalized_item_id
        and previous.get("assetIdentitySha256") == asset_identity_sha256
        and previous.get("itemCreatedAt") == normalized_created_at
        and previous.get("itemUpdatedAt") == normalized_updated_at
        and previous.get("assetSizeBytes") == declared_size
        and previous.get("contentLengthBytes") == actual_size
        and re.fullmatch(r"[0-9a-f]{64}", str(previous.get("contentSha256") or ""))
    )
    captured_content_sha256 = (
        normalized_content_sha256
        if normalized_content_sha256
        else str(previous.get("contentSha256") or "") if same_capture_identity
        else None
    )
    captured_at = (
        iso(acquired_at)
        if acquired_at and normalized_content_sha256
        else previous.get("acquiredAt") if same_capture_identity
        else None
    )
    assets[path.name] = {
        "canonicalHref": canonical_href,
        "assetIdentitySha256": asset_identity_sha256,
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": normalized_item_id,
        "itemCreatedAt": normalized_created_at,
        "itemUpdatedAt": normalized_updated_at,
        "assetSizeBytes": declared_size,
        # Registration/last-use time is not acquisition time.  Preserve an
        # already proven capture only for the exact same item identity, or use
        # a timestamp supplied by the code path that actually downloaded it.
        "acquiredAt": captured_at,
        "contentLengthBytes": actual_size,
        "contentSha256": captured_content_sha256,
        "bytes": actual_size,
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


def file_content_sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def cached_capture_matches_official(
    capture: Any,
    *,
    href: str,
    item_id: str | None,
    item_created_at: str | None,
    item_updated_at: str | None,
    expected_size: int | None,
) -> bool:
    """Bind cached bytes to the exact STAC revision and optional declared size."""
    declared_size_valid = (
        expected_size is None
        or isinstance(expected_size, int)
        and not isinstance(expected_size, bool)
        and expected_size > 0
    )
    content_length = capture.get("contentLengthBytes") if isinstance(capture, dict) else None
    return bool(
        isinstance(capture, dict)
        and declared_size_valid
        and capture.get("itemId") == str(item_id or "").strip()
        and capture.get("assetIdentitySha256") == asset_identity_sha256(href)
        and capture.get("itemCreatedAt") == (iso(item_created_at) if item_created_at else None)
        and capture.get("itemUpdatedAt") == (iso(item_updated_at) if item_updated_at else None)
        and capture.get("assetSizeBytes") == expected_size
        and isinstance(content_length, int)
        and not isinstance(content_length, bool)
        and content_length > 0
        and (expected_size is None or content_length == expected_size)
        and iso(capture.get("acquiredAt")) is not None
        and re.fullmatch(r"[0-9a-f]{64}", str(capture.get("contentSha256") or ""))
    )


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
    if expected_size is not None and (
        isinstance(expected_size, bool)
        or not isinstance(expected_size, int)
        or expected_size <= 0
    ):
        raise RuntimeError("DMI bulk asset has an invalid declared size")
    path = cached_asset_path(href)
    cached_size = path.stat().st_size if path.exists() else 0
    if cached_size > 0:
        capture = (
            raw_cache_source_capture(path, collection, model_run, valid_time)
            if collection and model_run and valid_time else None
        )
        if cached_capture_matches_official(
            capture,
            href=href,
            item_id=item_id,
            item_created_at=item_created_at,
            item_updated_at=item_updated_at,
            expected_size=expected_size,
        ):
            try:
                os.utime(path, None)
            except OSError:
                pass
            register_raw_cache_asset(
                path, href, collection, model_run, valid_time,
                item_id=item_id, item_created_at=item_created_at, item_updated_at=item_updated_at,
                expected_size=expected_size,
            )
            return path, True
    if expected_size and budget["bytes"] + expected_size > MAX_DOWNLOAD_BYTES:
        raise RuntimeError("DMI bulk download budget would be exceeded")
    try:
        with DOWNLOAD_SESSION.get(href, stream=True, timeout=REQUEST_TIMEOUT) as response:
            response.raise_for_status()
            try:
                content_length = int(response.headers.get("content-length", "0") or 0)
            except (TypeError, ValueError):
                raise RuntimeError("DMI bulk asset has an invalid Content-Length") from None
            if content_length < 0:
                raise RuntimeError("DMI bulk asset has an invalid Content-Length")
            if expected_size is not None and content_length and content_length != expected_size:
                raise RuntimeError("DMI bulk asset length conflicts with STAC metadata")
            if budget["bytes"] + content_length > MAX_DOWNLOAD_BYTES:
                raise RuntimeError("DMI bulk download budget exceeded before next asset")
            tmp_path: pathlib.Path | None = None
            content_digest = hashlib.sha256()
            try:
                with tempfile.NamedTemporaryFile(dir=RAW_DIR, delete=False) as tmp:
                    tmp_path = pathlib.Path(tmp.name)
                    for chunk in response.iter_content(1024 * 1024):
                        if not chunk:
                            continue
                        budget["bytes"] += len(chunk)
                        if budget["bytes"] > MAX_DOWNLOAD_BYTES:
                            raise RuntimeError("DMI bulk download budget exceeded during asset download")
                        content_digest.update(chunk)
                        tmp.write(chunk)
                actual_size = tmp_path.stat().st_size
                if (
                    actual_size <= 0
                    or (content_length and actual_size != content_length)
                    or (expected_size is not None and actual_size != expected_size)
                ):
                    raise RuntimeError("DMI bulk asset download is incomplete")
            except Exception:
                if tmp_path is not None:
                    tmp_path.unlink(missing_ok=True)
                raise
    except requests.RequestException:
        raise RuntimeError("DMI bulk asset request failed") from None
    tmp_path.replace(path)
    acquired_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    register_raw_cache_asset(
        path, href, collection, model_run, valid_time,
        item_id=item_id, item_created_at=item_created_at, item_updated_at=item_updated_at,
        acquired_at=acquired_at,
        expected_size=expected_size,
        content_sha256=content_digest.hexdigest(),
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
    try:
        actual_size = path.stat().st_size
        actual_content_sha256 = file_content_sha256(path)
    except OSError:
        return None
    if not (
        row.get("collection") == collection
        and iso(row.get("modelRun")) == iso(model_run)
        and iso(row.get("validTime")) == iso(valid_time)
        and str(row.get("itemId") or "").strip()
        and iso(row.get("acquiredAt"))
        and re.fullmatch(r"[0-9a-f]{64}", str(row.get("assetIdentitySha256") or ""))
        and (
            row.get("assetSizeBytes") is None
            or isinstance(row.get("assetSizeBytes"), int)
            and not isinstance(row.get("assetSizeBytes"), bool)
            and row.get("assetSizeBytes") > 0
        )
        and isinstance(row.get("contentLengthBytes"), int)
        and not isinstance(row.get("contentLengthBytes"), bool)
        and row.get("contentLengthBytes") == actual_size
        and (
            row.get("assetSizeBytes") is None
            or row.get("assetSizeBytes") == actual_size
        )
        and re.fullmatch(r"[0-9a-f]{64}", str(row.get("contentSha256") or ""))
        and row.get("contentSha256") == actual_content_sha256
    ):
        return None
    capture = {
        "itemId": str(row["itemId"]),
        "assetIdentitySha256": str(row["assetIdentitySha256"]),
        "assetSizeBytes": row.get("assetSizeBytes"),
        "acquiredAt": iso(row["acquiredAt"]),
        "contentLengthBytes": actual_size,
        "contentSha256": actual_content_sha256,
        "itemCreatedAt": iso(row.get("itemCreatedAt")),
        "itemUpdatedAt": iso(row.get("itemUpdatedAt")),
    }
    return capture


def reusable_cached_asset_path(
    asset: Any,
    collection: str,
    model_run: str,
) -> pathlib.Path | None:
    """Return a cached GRIB only when its bytes prove this STAC revision."""
    if not isinstance(asset, dict):
        return None
    path = cached_asset_path(str(asset.get("href") or ""))
    if not path.is_file():
        return None
    capture = raw_cache_source_capture(
        path,
        collection,
        model_run,
        str(asset.get("valid") or ""),
    )
    if not cached_capture_matches_official(
        capture,
        href=str(asset.get("href") or ""),
        item_id=str(asset.get("id") or "") or None,
        item_created_at=asset.get("itemCreatedAt"),
        item_updated_at=asset.get("itemUpdatedAt"),
        expected_size=asset.get("size"),
    ):
        return None
    return path


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
    values: list[Any] = []
    for key in keys:
        try:
            values.append(codes_get(gid, key))
        except Exception as exc:
            raise DmiGridLookupError(
                "DMI grid identity could not be read completely",
                "GRID_IDENTITY_READ_FAILED",
            ) from exc
    return tuple(values)


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
            try:
                candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], False, 4)
            except Exception as exc:
                raise DmiGridLookupError(
                    "DMI nearest-grid lookup failed",
                    "NEAREST_GRID_LOOKUP_FAILED",
                ) from exc
        except Exception as exc:
            raise DmiGridLookupError(
                "DMI nearest-grid lookup failed",
                "NEAREST_GRID_LOOKUP_FAILED",
            ) from exc
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
            try:
                candidates = codes_grib_find_nearest(gid, zone["lat"] + dlat, zone["lon"] + dlon, False, 4)
            except OutOfAreaError as exc:
                # Bounded DKSS marine grids legitimately reject probes outside
                # their domain. This is a spatial observation, not a broken
                # decoder; the remaining probes still search actual grid cells.
                if collection in MARINE_COLLECTIONS:
                    continue
                raise DmiGridLookupError(
                    "DMI nearest-grid lookup failed (OutOfAreaError)",
                    "NEAREST_GRID_OUT_OF_AREA",
                ) from exc
            except Exception as exc:
                raise DmiGridLookupError(
                    f"DMI nearest-grid lookup failed ({type(exc).__name__})",
                    "NEAREST_GRID_LOOKUP_FAILED",
                ) from exc
        except OutOfAreaError as exc:
            # Only ecCodes' explicit out-of-domain result is recoverable. Every
            # unknown grid failure remains fatal and can never authorize fallback.
            if collection in MARINE_COLLECTIONS:
                continue
            raise DmiGridLookupError(
                "DMI nearest-grid lookup failed (OutOfAreaError)",
                "NEAREST_GRID_OUT_OF_AREA",
            ) from exc
        except Exception as exc:
            raise DmiGridLookupError(
                f"DMI nearest-grid lookup failed ({type(exc).__name__})",
                "NEAREST_GRID_LOOKUP_FAILED",
            ) from exc
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

def batched_element_values(gid: int, indices: list[int], context: str) -> list[Any]:
    """Normalize only ordered ecCodes list/tuple or documented 1-D ndarray results."""
    context_code = "VECTOR" if context == "vector" else "SCALAR" if context == "scalar" else "UNKNOWN"
    try:
        raw_values = codes_get_elements(gid, "values", indices)
    except Exception as exc:
        raise DmiGridLookupError(
            f"DMI batched {context} lookup failed",
            f"BATCHED_{context_code}_LOOKUP_FAILED",
        ) from exc
    try:
        if isinstance(raw_values, (list, tuple)):
            values = list(raw_values)
        elif (
            type(raw_values).__module__.split(".", 1)[0] == "numpy"
            and getattr(raw_values, "ndim", None) == 1
            and callable(getattr(raw_values, "tolist", None))
        ):
            values = raw_values.tolist()
            if not isinstance(values, list):
                raise TypeError("non-list ndarray conversion")
        else:
            raise TypeError("non-array result")
    except (TypeError, ValueError) as exc:
        raise DmiGridLookupError(
            f"DMI batched {context} lookup returned an invalid result",
            f"BATCHED_{context_code}_RESULT_INVALID",
        ) from exc
    if len(values) != len(indices):
        raise DmiGridLookupError(
            f"DMI batched {context} lookup returned an invalid result",
            f"BATCHED_{context_code}_RESULT_INVALID",
        )
    return values


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
    raw_values = batched_element_values(gid, unique_indices, "vector")
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
    raw_values = batched_element_values(gid, unique_indices, "scalar")
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
    asset_size = (capture or {}).get("assetSizeBytes")
    acquired_at = iso((capture or {}).get("acquiredAt"))
    content_length = (capture or {}).get("contentLengthBytes")
    content_sha256 = str((capture or {}).get("contentSha256") or "")
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
        and (
            asset_size is None
            or isinstance(asset_size, int)
            and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and acquired_at
        and isinstance(content_length, int)
        and not isinstance(content_length, bool)
        and content_length > 0
        and re.fullmatch(r"[0-9a-f]{64}", content_sha256)
        and (asset_size is None or asset_size == content_length)
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
        "assetSizeBytes": asset_size,
        "acquiredAt": acquired_at,
        "contentLengthBytes": content_length,
        "contentSha256": content_sha256,
        **({"itemCreatedAt": item_created_at} if item_created_at else {}),
        **({"itemUpdatedAt": item_updated_at} if item_updated_at else {}),
        **extra,
    }


def process_grib(path: pathlib.Path, collection: str, model_run: str, valid_time: str,
                 zones: list[dict[str, Any]], output: dict[str, Any], diagnostics: dict[str, Any],
                 current_shadow: dict[str, Any] | None = None,
                 private_stage_output: dict[str, Any] | None = None,
                 current_part_outcomes: dict[str, Any] | None = None) -> tuple[set[str], set[str], bool, int, int]:
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
    operational_part_zone_ids = {
        str(zone.get("id"))
        for zone in zones
        if zone.get("coastalPart")
        and not zone.get("privateStage")
        and not zone.get("researchCurrent")
        and str(zone.get("id") or "").startswith("PART::")
    }
    current_verified_part_zone_ids: set[str] = set()
    if current_part_outcomes is not None:
        current_part_outcomes.clear()
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
                            if (
                                family == "current"
                                and zone["id"] in operational_part_zone_ids
                            ):
                                current_verified_part_zone_ids.add(str(zone["id"]))
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
    # Wave height and period are the shared mobilisation/rollback tuple. Finalise
    # only after all GRIB messages have been inspected, and retain direction only
    # when it resolves to that same exact grid definition/cell. The integrated
    # last-mile state requires that retained field and otherwise fails closed.
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
        if not wave_distance_allowed(collection, distance):
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "WAM_DISTANCE_OUT_OF_BOUNDS"
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
    if (
        current_part_outcomes is not None
        and collection in MARINE_COLLECTIONS
        and not interrupted
        and operational_part_zone_ids
        and {"current-u", "current-v"} <= found
    ):
        current_part_outcomes.update({
            "complete": True,
            "targetPartIds": sorted(
                zone_id.removeprefix("PART::")
                for zone_id in operational_part_zone_ids
            ),
            "spatialUnavailablePartIds": sorted(
                zone_id.removeprefix("PART::")
                for zone_id in operational_part_zone_ids - current_verified_part_zone_ids
            ),
        })
    return found, touched, interrupted, messages_seen, zone_lookups


def private_wave_bootstrap_hour_complete(
    result: dict[str, Any],
    zone: dict[str, Any],
    collection: str,
    asset: Any,
) -> bool:
    zone_id = str(zone.get("id") or "")
    point = (result.get("zones") or {}).get(zone_id) or {}
    hour = (point.get("hourly") or {}).get(asset.valid_time) or {}
    height = hour.get("significant-wave-height")
    period = hour.get("dominant-wave-period")
    direction = hour.get("mean-wave-dir")
    if not (
        isinstance(height, (int, float)) and not isinstance(height, bool)
        and math.isfinite(float(height))
        and isinstance(period, (int, float)) and not isinstance(period, bool)
        and math.isfinite(float(period))
        and float(height) >= 0
        and float(period) >= 0
        and not (float(height) > 0 and float(period) <= 0)
    ):
        return False
    direction_present = (
        isinstance(direction, (int, float))
        and not isinstance(direction, bool)
        and math.isfinite(float(direction))
    )
    if float(height) > 0 and not direction_present:
        return False
    if direction_present and not (0 <= float(direction) < 360):
        return False
    source = (hour.get("sources") or {}).get("wave") or {}
    if (
        source.get("collection") != collection
        or iso(source.get("modelRun")) != asset.model_run
        or iso(source.get("nativeValidTime")) != asset.valid_time
        or source.get("itemId") != asset.item_id
        or source.get("assetIdentitySha256") != asset.asset_identity_sha256
        or source.get("optionalFieldSet")
            != (["mean-wave-dir"] if direction_present else [])
    ):
        return False
    return complete_native_source_for_hour(
        source,
        "wave",
        zone_id,
        point,
        asset.valid_time,
    )


def reset_private_part_wave_cache(
    result: dict[str, Any],
    parts: list[dict[str, Any]],
) -> int:
    """Discard only private PART wave rows before a measured cold rebuild.

    Candidate G's pinned legacy cache predates the time-bound same-cell WAM
    provenance contract.  Those rows remain useful evidence that data existed,
    but their missing cell identity cannot be reconstructed from zone summaries.
    Remove only the wave component and let the ordinary DMI STAC/GRIB path
    reacquire it.  Current, wind, water level, temperatures and point identity
    are deliberately left untouched.
    """
    reset_rows = 0
    for zone in parts:
        zone_id = str(zone.get("id") or "")
        point = (result.get("zones") or {}).get(zone_id)
        if not isinstance(point, dict):
            continue
        for hour in (point.get("hourly") or {}).values():
            if not isinstance(hour, dict):
                continue
            sources = hour.get("sources")
            had_wave = any(
                key in hour
                for key in (
                    "significant-wave-height",
                    "dominant-wave-period",
                    "mean-wave-dir",
                )
            ) or (isinstance(sources, dict) and "wave" in sources)
            for key in (
                "significant-wave-height",
                "dominant-wave-period",
                "mean-wave-dir",
            ):
                hour.pop(key, None)
            if isinstance(sources, dict):
                sources.pop("wave", None)
                if not sources:
                    hour.pop("sources", None)
            if had_wave:
                reset_rows += 1
        for key in (
            "significant-wave-height",
            "dominant-wave-period",
            "mean-wave-dir",
        ):
            (point.get("gridPoints") or {}).pop(key, None)
            (point.get("collections") or {}).pop(key, None)
    return reset_rows


def execute_private_wave_history_bootstrap(
    result: dict[str, Any],
    zones: list[dict[str, Any]],
    budget: dict[str, int],
    fresh_zone_ids: set[str],
    configuration: dict[str, Any],
    *,
    registry: Any | None = None,
) -> dict[str, set[str]]:
    """Acquire and checkpoint the one bounded private WAM bridge.

    Only the existing immutable PART sampling points are used.  No geometry or
    point is derived here, and all progress/diagnostics are aggregate-only.
    """
    parts = [
        zone for zone in zones
        if zone.get("coastalPart")
        and not zone.get("waterSource")
        and not zone.get("researchCurrent")
        and not zone.get("privateStage")
    ]
    part_ids = [str(zone.get("id") or "") for zone in parts]
    if (
        len(parts) != WAVE_BOOTSTRAP_EXPECTED_PART_COUNT
        or len(set(part_ids)) != WAVE_BOOTSTRAP_EXPECTED_PART_COUNT
        or any(not part_id.startswith("PART::") for part_id in part_ids)
    ):
        raise RuntimeError("private WAM bootstrap part registry is incomplete")
    locked: dict[str, set[str]] = {}
    aggregate = {
        "schemaVersion": "dmi-wave-history-bootstrap-v1",
        "mode": configuration["mode"],
        "targetHour": configuration["targetHour"],
        "productionTargetHour": configuration["productionTargetHour"],
        "partCount": len(parts),
        "status": "running",
        "collections": {},
    }
    result.setdefault("diagnostics", {})["privateWaveHistoryBootstrap"] = aggregate
    if configuration["mode"] == WAVE_BOOTSTRAP_COLD_START_MODE:
        if registry is None:
            raise RuntimeError("private WAM cold bootstrap registry is missing")
        try:
            cached_summary = validate_wave_history_cache(
                result,
                registry,
                target_hour=configuration["targetHour"],
                policy=configuration["policy"],
            )
        except WaveBootstrapError as exc:
            # Cache-first is an optimisation, never a permission to infer the
            # new same-cell provenance from legacy zone summaries.  Only the
            # documented legacy MISSING_CELL shape is destructive-rebuildable.
            # A valid partial history (for example MISSING_HOUR) is preserved
            # so the integrated cold start can replay every verified real hour.
            aggregate["cacheFirst"] = {
                "status": "incomplete",
                "failureCode": exc.code,
            }
            if exc.code == "MISSING_CELL":
                reset_rows = reset_private_part_wave_cache(result, parts)
                aggregate["cacheFirst"]["resetWaveRowCount"] = reset_rows
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
        else:
            expected_exact = (
                registry.part_count * len(configuration["requiredHours"])
            )
            if (
                cached_summary.exact_tuple_count == expected_exact
                and cached_summary.interpolated_tuple_count == 0
                and cached_summary.wam_collection_count
                    == len(WAVE_BOOTSTRAP_COLLECTIONS)
            ):
                locked_hours = {
                    valid_time
                    for valid_time in configuration["requiredHours"]
                    if epoch(valid_time) < epoch(configuration["targetHour"])
                }
                for collection in sorted(
                    WAVE_BOOTSTRAP_COLLECTIONS,
                    key=COLLECTION_ORDER.index,
                ):
                    relevant = relevant_zones(collection, parts)
                    if not relevant:
                        raise RuntimeError(
                            "private WAM bootstrap lacks one required collection"
                        )
                    locked[collection] = set(locked_hours)
                    aggregate["collections"][collection] = {
                        "selectionMode": "complete-private-cache",
                        "historyHourCount": configuration["policy"].history_hours,
                        "requiredHourCount": len(configuration["requiredHours"]),
                        "selectedAssetCount": 0,
                        "runCount": None,
                        "partCount": len(relevant),
                        "processedAssetCount": 0,
                        "reusedCompleteAssetCount": (
                            len(relevant) * len(configuration["requiredHours"])
                        ),
                    }
                aggregate["cacheFirst"] = {
                    **cached_summary.sanitized_attestation(),
                    "selectionMode": "complete-private-cache",
                }
                aggregate["status"] = "history-complete"
                aggregate["lockedHourCount"] = sum(
                    len(hours) for hours in locked.values()
                )
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
                return locked
            aggregate["cacheFirst"] = {
                "status": "incomplete",
                "failureCode": "EXACT_NATIVE_CACHE_REQUIRED",
            }
    for collection in sorted(WAVE_BOOTSTRAP_COLLECTIONS, key=COLLECTION_ORDER.index):
        relevant = relevant_zones(collection, parts)
        if not relevant:
            continue
        if should_stop_work():
            raise RuntimeError("private WAM bootstrap runtime budget reached before STAC selection")
        try:
            plan, assets = list_private_wave_bootstrap_assets(
                collection,
                configuration,
            )
        except WaveBootstrapError as exc:
            if (
                configuration["mode"] != WAVE_BOOTSTRAP_COLD_START_MODE
                or exc.code != "NO_COHERENT_RUN"
            ):
                raise
            # A genuine cold start may continue without a complete 49-hour WAM
            # suffix.  This records only aggregate absence and returns to the
            # normal WAM loop, whose exact bridge and coherent 118-hour horizon
            # remain mandatory.  No row is synthesized, borrowed or carried.
            aggregate["collections"][collection] = {
                "status": "history-incomplete",
                "failureCode": exc.code,
                "partCount": len(relevant),
                "selectedAssetCount": 0,
                "processedAssetCount": 0,
            }
            aggregate["status"] = "history-incomplete"
            aggregate["historyIncomplete"] = True
            aggregate["historyIncompleteCode"] = exc.code
            aggregate["lockedHourCount"] = sum(
                len(hours) for hours in locked.values()
            )
            write_checkpoint(result, fresh_zone_ids, budget, "partial")
            return locked
        plan_attestation = plan.sanitized_attestation()
        collection_summary = {
            "selectionMode": plan_attestation["selectionMode"],
            "historyHourCount": plan_attestation["historyHourCount"],
            "requiredHourCount": plan_attestation["requiredHourCount"],
            "selectedAssetCount": len(assets),
            "runCount": plan_attestation["runCount"],
            "selectionSha256": plan_attestation["selectionSha256"],
            "partCount": len(relevant),
            "processedAssetCount": 0,
            "reusedCompleteAssetCount": 0,
        }
        aggregate["collections"][collection] = collection_summary
        locked[collection] = set()
        expected_locked_hours = {
            asset.valid_time for asset in assets
            if epoch(asset.valid_time) < epoch(configuration["targetHour"])
        }
        for asset_number, asset in enumerate(assets, start=1):
            if should_stop_work():
                raise RuntimeError("private WAM bootstrap runtime budget reached")
            already_complete = all(
                private_wave_bootstrap_hour_complete(result, zone, collection, asset)
                for zone in relevant
            )
            if already_complete:
                collection_summary["reusedCompleteAssetCount"] += 1
                if asset.valid_time in expected_locked_hours:
                    locked[collection].add(asset.valid_time)
                continue
            path, reused = download_asset(
                asset.href,
                asset.size_bytes,
                budget,
                collection=collection,
                model_run=asset.model_run,
                valid_time=asset.valid_time,
                item_id=asset.item_id,
                item_created_at=asset.item_created_at,
                item_updated_at=asset.item_updated_at,
            )
            if reused:
                result["diagnostics"]["reusedAssets"] = int(
                    result["diagnostics"].get("reusedAssets") or 0
                ) + 1
            progress(
                f"{collection}: privat WAM-bootstrap {asset_number}/{len(assets)} "
                f"({'genbrugt' if reused else 'downloadet'})"
            )
            found, touched, interrupted, messages_seen, zone_lookups = process_grib(
                path,
                collection,
                asset.model_run,
                asset.valid_time,
                relevant,
                result,
                result["diagnostics"],
            )
            result["diagnostics"]["messagesSeen"] = int(
                result["diagnostics"].get("messagesSeen") or 0
            ) + messages_seen
            result["diagnostics"]["zoneLookups"] = int(
                result["diagnostics"].get("zoneLookups") or 0
            ) + zone_lookups
            if interrupted or not {"significant-wave-height", "dominant-wave-period"} <= found:
                raise RuntimeError("private WAM bootstrap GRIB tuple is incomplete")
            if not all(
                private_wave_bootstrap_hour_complete(result, zone, collection, asset)
                for zone in relevant
            ):
                raise RuntimeError("private WAM bootstrap does not cover every immutable coastal part")
            fresh_zone_ids.update(touched)
            collection_summary["processedAssetCount"] += 1
            if asset.valid_time in expected_locked_hours:
                locked[collection].add(asset.valid_time)
            if asset_number % 4 == 0:
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
        if locked[collection] != expected_locked_hours:
            raise RuntimeError("private WAM bootstrap did not lock every selected valid hour")
    if set(locked) != set(WAVE_BOOTSTRAP_COLLECTIONS):
        raise RuntimeError("private WAM bootstrap lacks one required collection")
    aggregate["status"] = "history-complete"
    aggregate["lockedHourCount"] = sum(len(hours) for hours in locked.values())
    write_checkpoint(result, fresh_zone_ids, budget, "partial")
    return locked


def clear_operational_wave_window(
    result: dict[str, Any],
    zones: list[dict[str, Any]],
    collection: str,
    start_hour: str,
) -> int:
    """Clear only the future wave component owned by one WAM collection.

    The immutable zone/PART registry and every sampling coordinate stay
    untouched.  Removing the old component before processing makes the
    operational run transactional: an interrupted refresh leaves an explicit
    gap that the cutover gate rejects instead of a mixed-run interpolation.
    """
    start_epoch = epoch(start_hour)
    cleared = 0
    public_targets = [
        zone for zone in zones
        if not zone.get("waterSource")
        and not zone.get("researchCurrent")
        and not zone.get("privateStage")
    ]
    for zone in relevant_zones(collection, public_targets):
        point = (result.get("zones") or {}).get(str(zone.get("id") or ""))
        if not isinstance(point, dict):
            continue
        for valid_time, hour in (point.get("hourly") or {}).items():
            if epoch(valid_time) < start_epoch or not isinstance(hour, dict):
                continue
            source = (hour.get("sources") or {}).get("wave")
            had_wave = any(
                key in hour
                for key in (
                    "significant-wave-height",
                    "dominant-wave-period",
                    "mean-wave-dir",
                )
            ) or isinstance(source, dict)
            for key in (
                "significant-wave-height",
                "dominant-wave-period",
                "mean-wave-dir",
            ):
                hour.pop(key, None)
            (hour.get("sources") or {}).pop("wave", None)
            if had_wave:
                cleared += 1
        for key in (
            "significant-wave-height",
            "dominant-wave-period",
            "mean-wave-dir",
        ):
            (point.get("gridPoints") or {}).pop(key, None)
            (point.get("collections") or {}).pop(key, None)
    return cleared

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


def backfill_compatible_cache_data(
    primary: dict[str, Any],
    donor: dict[str, Any],
) -> None:
    """Backfill missing cache data without replacing newer progress metadata.

    Both documents have already been bound to the same sampling-registry
    signature by load_previous. The newest progressive cache therefore remains
    authoritative for collection rotation and processed-step state, while an
    older strict cache may restore only values that are absent. All normal
    provenance and component sanitizers still run before reuse.
    """
    for key in (
        "schemaVersion",
        "sourceUpdatedAt",
        "method",
        "hours",
        "timeStrideHours",
        "currentVectorSemanticsVersion",
        "currentVectorSelection",
        "currentPreferredDistanceKm",
        "currentMaxDistanceKm",
        "spatialProvenanceVersion",
        "privateReplayRetentionHours",
    ):
        if key in donor:
            primary.setdefault(key, copy.deepcopy(donor[key]))
    for container_name in ("collectionState", "runs"):
        primary_container = primary.setdefault(container_name, {})
        donor_container = donor.get(container_name) or {}
        if not isinstance(primary_container, dict) or not isinstance(donor_container, dict):
            continue
        for key, value in donor_container.items():
            primary_container.setdefault(key, copy.deepcopy(value))
    primary_zones = primary.setdefault("zones", {})
    donor_zones = donor.get("zones") or {}
    if not isinstance(primary_zones, dict) or not isinstance(donor_zones, dict):
        return
    for zone_id, donor_zone in donor_zones.items():
        if not isinstance(donor_zone, dict):
            continue
        primary_zone = primary_zones.setdefault(zone_id, {})
        if not isinstance(primary_zone, dict):
            continue
        for key in (
            "samplingPoint",
            "parentZoneId",
            "entityType",
            "samplingContext",
            "coastalPart",
            "marineSelection",
        ):
            if key in donor_zone:
                primary_zone.setdefault(key, copy.deepcopy(donor_zone[key]))
        for container_name in ("gridPoints", "collections"):
            primary_container = primary_zone.setdefault(container_name, {})
            donor_container = donor_zone.get(container_name) or {}
            if not isinstance(primary_container, dict) or not isinstance(donor_container, dict):
                continue
            for key, value in donor_container.items():
                primary_container.setdefault(key, copy.deepcopy(value))
        primary_hourly = primary_zone.setdefault("hourly", {})
        donor_hourly = donor_zone.get("hourly") or {}
        if not isinstance(primary_hourly, dict) or not isinstance(donor_hourly, dict):
            continue
        for valid_time, donor_row in donor_hourly.items():
            if not isinstance(donor_row, dict):
                continue
            primary_row = primary_hourly.get(valid_time)
            structurally_empty = (
                isinstance(primary_row, dict)
                and set(primary_row) <= {"time"}
            )
            if primary_row is None or structurally_empty:
                # A weather row is one atomic acquisition/provenance unit.
                # Never compose complementary vector or wave fields across
                # caches, model runs or source attestations.
                primary_hourly[valid_time] = copy.deepcopy(donor_row)


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


def load_previous(
    expected_signature: str,
    *,
    coastal_part_targets: list[dict[str, Any]] | None = None,
    production_reference: datetime | None = None,
) -> dict[str, Any]:
    candidates = [load_document(OUTPUT_PATH), load_document(DEPLOYED_FALLBACK_PATH)]
    compatible = [document for document in candidates if document.get("zoneRegistrySignature") == expected_signature and document.get("zones")]
    if compatible:
        primary = max(
            compatible,
            key=lambda document: (cache_progress_time(document), cache_quality(document)),
        )
        merged = copy.deepcopy(primary)
        if coastal_part_targets is not None and production_reference is not None:
            strict_donors = [
                document
                for document in compatible
                if document is not primary
                and coastal_part_current_cache_reusable(
                    document,
                    coastal_part_targets,
                    production_reference,
                )
            ]
            for donor in sorted(
                strict_donors,
                key=lambda document: (cache_quality(document), cache_progress_time(document)),
                reverse=True,
            ):
                backfill_compatible_cache_data(merged, donor)
        return merged
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


def production_reference_hour(value: Any = None) -> datetime:
    raw = os.getenv("RAVRADAR_PRODUCTION_TARGET_HOUR") if value is None else value
    if raw in (None, ""):
        parsed = datetime.now(timezone.utc)
    elif isinstance(raw, datetime):
        parsed = raw
    else:
        parsed = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Production reference must include a timezone")
    parsed = parsed.astimezone(timezone.utc)
    exact = parsed.replace(minute=0, second=0, microsecond=0)
    if raw not in (None, "") and parsed != exact:
        raise ValueError("Production reference must be an exact UTC hour")
    return exact


def operational_current_valid_times(reference: datetime) -> list[str]:
    return [
        (reference + timedelta(hours=offset)).isoformat().replace("+00:00", "Z")
        for offset in range(PUBLIC_END_OFFSET_HOURS + 1)
    ]


def coastal_part_current_attestation(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    range_start: datetime,
    range_end: datetime,
    allowed_source_assets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Attest the same structurally sanitized view before and after merge."""
    zones = document.get("zones") if isinstance(document, dict) else None
    expected_ids = {
        f"PART::{str(target.get('partId') or '').strip()}"
        for target in targets
        if isinstance(target, dict) and str(target.get("partId") or "").strip()
    }
    actual_ids = {
        str(zone_id)
        for zone_id in (zones or {})
        if str(zone_id).startswith("PART::")
    } if isinstance(zones, dict) else set()
    eligible: dict[str, Any] = {}
    if expected_ids and len(expected_ids) == len(targets) and actual_ids == expected_ids:
        for target in targets:
            part_id = str(target.get("partId") or "").strip()
            zone_id = f"PART::{part_id}"
            zone = zones.get(zone_id)
            if not isinstance(zone, dict) or not same_sampling_point(
                zone.get("samplingPoint"),
                target.get("waterPoint"),
            ):
                continue
            grid_points = zone.get("gridPoints")
            if grid_points is None:
                grid_points = {}
            if not isinstance(grid_points, dict):
                continue
            current_u_point = grid_points.get("current-u")
            current_v_point = grid_points.get("current-v")
            if (
                current_u_point is not None
                or current_v_point is not None
            ) and not same_grid_point(current_u_point, current_v_point):
                continue
            eligible[zone_id] = zone
    return canonical_verified_part_current_attestation(
        {"zones": eligible},
        targets,
        range_start,
        range_end,
        allowed_source_assets,
    )


def current_operational_attestation(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    allowed_source_assets: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return coastal_part_current_attestation(
        document,
        targets,
        reference,
        reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
        allowed_source_assets,
    )


def build_current_operational_ledger(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    official_catalogs: dict[
        str,
        tuple[str | None, list[dict[str, Any]], dict[str, Any]],
    ],
) -> dict[str, Any]:
    """Close every official DKSS asset/hour without inventing fallback gaps."""
    valid_times = operational_current_valid_times(reference)
    valid_time_set = set(valid_times)
    range_end = reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    part_ids = sorted(str(target.get("partId") or "").strip() for target in targets)
    registry_sha256 = target_fingerprint(targets)
    provisional_collections: list[dict[str, Any]] = []
    failure_codes: set[str] = set()
    for collection in sorted(MARINE_COLLECTIONS):
        catalog = official_catalogs.get(collection)
        if catalog is None:
            run, assets, stats = None, [], {}
        else:
            run, assets, stats = catalog
        model_run = canonical_time(run)
        raw_official_assets = (
            stats.get("officialRequiredAssets")
            if isinstance(stats, dict)
            and isinstance(stats.get("officialRequiredAssets"), list)
            else []
        )
        official_by_time: dict[str, dict[str, Any]] = {}
        official_assets_valid = True
        for raw_asset in raw_official_assets:
            identity = official_current_asset_identity(collection, model_run, raw_asset)
            if (
                identity is None
                or identity["validTime"] not in valid_time_set
                or identity["validTime"] in official_by_time
            ):
                official_assets_valid = False
                continue
            official_by_time[identity["validTime"]] = identity
        declared_times = {
            str(canonical_time(value))
            for value in (
                stats.get("officialRequiredValidTimes")
                if isinstance(stats, dict)
                and isinstance(stats.get("officialRequiredValidTimes"), list)
                else []
            )
            if canonical_time(value) in valid_time_set
        }
        if declared_times != set(official_by_time):
            official_assets_valid = False
        selected_by_time: dict[str, dict[str, Any]] = {}
        selected_assets_valid = True
        for raw_asset in assets if isinstance(assets, list) else []:
            identity = official_current_asset_identity(collection, model_run, raw_asset)
            if identity is None:
                selected_assets_valid = False
                continue
            if identity["validTime"] not in valid_time_set:
                continue
            if identity["validTime"] in selected_by_time:
                selected_assets_valid = False
                continue
            selected_by_time[identity["validTime"]] = identity
        if selected_by_time != official_by_time:
            selected_assets_valid = False
        catalog_complete = bool(
            model_run
            and isinstance(stats, dict)
            and stats.get("catalogInventoryComplete") is True
            and (
                stats.get("requiredHorizonEndCovered") is True
                or (
                    stats.get("documentedRequiredGapsAllowed") is True
                    and stats.get("selectedNativeRunComplete") is True
                    and stats.get("requiredWindowInventoryComplete") is True
                )
            )
            and stats.get("rejectedStaleRun") is not True
            and int(stats.get("requiredRowsTruncatedByAssetLimit") or 0) == 0
            and official_assets_valid
            and selected_assets_valid
            and stats.get("officialRequiredValidTimeCount") == len(official_by_time)
        )
        run_info = ((document.get("runs") or {}).get(collection) or {})
        processing_signature = run_info.get("processingSignature")
        run_matches = (
            isinstance(run_info, dict)
            and canonical_time(run_info.get("referenceTime")) == model_run
            and run_info.get("parserVersion") == PARSER_VERSION
            and run_info.get("parameterMapVersion") == PARAMETER_MAP_VERSION
            and run_info.get("gridLookupVersion") == GRID_LOOKUP_VERSION
            and isinstance(processing_signature, str)
            and bool(processing_signature)
        )
        processed_steps = run_info.get("processedSteps") if run_matches else {}
        if not isinstance(processed_steps, dict):
            processed_steps = {}
        rows: list[dict[str, Any]] = []
        for valid_time in valid_times:
            official_asset = official_by_time.get(valid_time)
            source_asset = None
            part_outcome_proof = None
            if not catalog_complete:
                state = "LOCALLY_SKIPPED"
            elif official_asset is None:
                state = "UPSTREAM_ABSENT"
            else:
                step = processed_steps.get(valid_time)
                source_asset = processed_step_source_for_official_asset(
                    step,
                    collection=collection,
                    model_run=model_run,
                    valid_time=valid_time,
                    processing_signature=processing_signature,
                    official_asset=official_asset,
                )
                if source_asset is None:
                    state = "LOCALLY_SKIPPED"
                else:
                    try:
                        part_outcome_proof = validate_current_part_outcome_proof(
                            step.get("currentPartOutcomeProof"),
                            part_ids,
                            registry_sha256,
                            processing_signature,
                            source_asset,
                        )
                    except (TypeError, ValueError):
                        part_outcome_proof = None
                    if part_outcome_proof is None:
                        state = "LOCALLY_SKIPPED"
                        source_asset = None
                    else:
                        state = "PROCESSED"
            rows.append({
                "validTime": valid_time,
                "state": state,
                "officialAsset": official_asset,
                "sourceAsset": source_asset,
                "partOutcomeProof": part_outcome_proof,
            })
        provisional_collections.append({
            "collection": collection,
            "modelRun": model_run,
            "processingSignature": processing_signature,
            "validTimes": rows,
        })
        if not catalog_complete:
            failure_codes.add("OFFICIAL_DKSS_CATALOG_INCOMPLETE")

    processed_assets = [
        row["sourceAsset"]
        for collection_row in provisional_collections
        for row in collection_row["validTimes"]
        if row["state"] == "PROCESSED" and row["sourceAsset"] is not None
    ]
    attestation = current_operational_attestation(
        document,
        targets,
        reference,
        processed_assets,
    )
    attested_source_keys = {
        json.dumps(source, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        for raw in attestation.get("verifiedPairSources") or []
        if isinstance(raw, dict)
        for source in [canonical_current_source_asset(raw.get("source"))]
        if source is not None
    }
    collection_ledgers: list[dict[str, Any]] = []
    states_by_time: dict[str, list[str]] = {valid_time: [] for valid_time in valid_times}
    for collection_row in provisional_collections:
        for row in collection_row["validTimes"]:
            source_asset = row["sourceAsset"]
            if (
                row["state"] == "PROCESSED"
                and source_asset is not None
                and json.dumps(
                    source_asset,
                    sort_keys=True,
                    separators=(",", ":"),
                    ensure_ascii=False,
                ) in attested_source_keys
            ):
                row["state"] = "VERIFIED"
            states_by_time[row["validTime"]].append(row["state"])
        official_assets = [
            row["officialAsset"]
            for row in collection_row["validTimes"]
            if row["officialAsset"] is not None
        ]
        official_times = sorted(asset["validTime"] for asset in official_assets)
        counts = {
            state: sum(row["state"] == state for row in collection_row["validTimes"])
            for state in CURRENT_OPERATIONAL_LEDGER_STATES
        }
        collection_row.update({
            "officialValidTimeCount": len(official_assets),
            "officialValidTimesSha256": valid_times_sha256(official_times),
            "officialAssetsSha256": current_official_assets_sha256(official_assets),
            "stateCounts": counts,
        })
        collection_ledgers.append(collection_row)
        if counts["LOCALLY_SKIPPED"]:
            failure_codes.add("LOCALLY_SKIPPED_DKSS_ASSET")

    if not targets:
        failure_codes.add("ACTIVE_CURRENT_REGISTRY_EMPTY")
    if sum(row["officialValidTimeCount"] for row in collection_ledgers) == 0:
        failure_codes.add("OFFICIAL_DKSS_CATALOG_COLLAPSE")
    for states in states_by_time.values():
        if len(states) != len(MARINE_COLLECTIONS):
            failure_codes.add("OFFICIAL_DKSS_LEDGER_INCOMPLETE")
        elif any(state in {"EXPECTED", "LOCALLY_SKIPPED"} for state in states):
            failure_codes.add("LOCALLY_SKIPPED_DKSS_ASSET")

    try:
        partition = derive_current_part_outcome_partition(
            collection_ledgers,
            part_ids,
            valid_times,
        )
    except (TypeError, ValueError):
        partition = {
            "verifiedPairs": [],
            "upstreamAbsencePairs": [],
            "spatialUnavailablePairs": [],
            "operationalComplementPairs": [],
        }
        failure_codes.add("UNATTESTED_CURRENT_PART_TIME")

    if partition["verifiedPairs"] != (attestation.get("verifiedPairs") or []):
        failure_codes.add("UNATTESTED_CURRENT_PART_TIME")

    verified_times = {
        row["validTime"] for row in partition["verifiedPairs"]
    }
    for valid_time, states in states_by_time.items():
        if (
            len(states) == len(MARINE_COLLECTIONS)
            and not all(state == "UPSTREAM_ABSENT" for state in states)
            and valid_time not in verified_times
        ):
            # An official asset may legitimately miss individual coastal parts,
            # but not silently turn the whole national matrix into Copernicus.
            failure_codes.add("SYSTEMIC_CURRENT_TIME_COLLAPSE")

    upstream_absence_pairs = partition["upstreamAbsencePairs"]
    spatial_unavailable_pairs = partition["spatialUnavailablePairs"]
    authorized_complement = (
        partition["operationalComplementPairs"] if not failure_codes else []
    )
    ledger = {
        "schemaVersion": CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION,
        "contractId": CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID,
        "productionReferenceAt": canonical_time(reference),
        "operationalRangeEndAt": canonical_time(range_end),
        "hourCount": len(valid_times),
        "targetCount": len(targets),
        "targetRegistrySha256": registry_sha256,
        "attestation": sanitized_current_attestation(attestation),
        "collections": collection_ledgers,
        "upstreamAbsencePairCount": len(upstream_absence_pairs),
        "upstreamAbsencePairsSha256": part_time_pairs_sha256(
            upstream_absence_pairs
        ),
        "upstreamAbsencePairs": upstream_absence_pairs,
        "spatialUnavailablePairCount": len(spatial_unavailable_pairs),
        "spatialUnavailablePairsSha256": part_time_pairs_sha256(
            spatial_unavailable_pairs
        ),
        "spatialUnavailablePairs": spatial_unavailable_pairs,
        "operationalComplementPairCount": len(authorized_complement),
        "operationalComplementPairsSha256": part_time_pairs_sha256(
            authorized_complement
        ),
        "operationalComplementPairs": authorized_complement,
        "ready": not failure_codes,
        "failureCodes": sorted(failure_codes),
    }
    if ledger["ready"] and not current_operational_ledger_ready(
        ledger,
        attestation,
        targets,
        reference,
        range_end,
        registry_sha256,
    ):
        ledger["ready"] = False
        ledger["failureCodes"] = ["CURRENT_LEDGER_CONTRACT_INVALID"]
    return ledger


def current_operational_cache_ready(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
) -> bool:
    try:
        ledger = ((document.get("diagnostics") or {}).get("currentOperationalLedger"))
        allowed_source_assets = processed_source_assets_from_current_operational_ledger(ledger)
        attestation = current_operational_attestation(
            document,
            targets,
            reference,
            allowed_source_assets,
        )
        registry_sha256 = target_fingerprint(targets)
    except (TypeError, ValueError):
        return False
    return current_operational_ledger_ready(
        ledger,
        attestation,
        targets,
        reference,
        reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
        registry_sha256,
    )


def coastal_part_current_cache_reusable(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
) -> bool:
    """Require one strict pair that survives the later cache sanitizers."""
    if not isinstance(document, dict) or not isinstance(targets, list):
        return False
    try:
        attestation = coastal_part_current_attestation(
            document,
            targets,
            reference - timedelta(hours=COLD_BRIDGE_HOURS),
            reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
        )
    except (TypeError, ValueError):
        return False
    return int(attestation.get("verifiedPairCount") or 0) > 0


def producer_success_blocked(
    strict_current_anchor_available: bool,
    wave_bootstrap_requested: bool,
    bootstrap_complete: bool,
) -> bool:
    """Fail closed when the current ledger or requested WAM bootstrap is absent."""
    return (
        not strict_current_anchor_available
        or (wave_bootstrap_requested and not bootstrap_complete)
    )


def producer_terminal_code(
    *,
    strict_current_anchor_available: bool,
    wave_bootstrap_requested: bool,
    bootstrap_complete: bool,
    productive: bool,
    diagnostics: dict[str, Any],
) -> str:
    """Return one bounded, payload-free terminal classification for CI."""
    if not strict_current_anchor_available:
        attempted = [
            str(collection)
            for collection in (diagnostics.get("collectionsAttempted") or [])
            if str(collection) in MARINE_COLLECTIONS
        ]
        stac = diagnostics.get("stacByCollection") or {}
        if (
            attempted
            and isinstance(stac, dict)
            and all(
                isinstance(stac.get(collection), dict)
                and stac[collection].get("rejectedStaleRun") is True
                for collection in attempted
            )
        ):
            return "DMI_CATALOG_SCHEDULE_STALE"
        if isinstance(stac, dict) and any(
            isinstance(stac.get(collection), dict)
            and stac[collection].get("prefetchFailed") is True
            for collection in MARINE_COLLECTIONS
        ):
            return "DMI_DKSS_PREFETCH_FAILED"
        safe_stac_codes = (
            "STAC_DUPLICATE_COLLECTION_RUN_VALID_TIME",
            "STAC_DUPLICATE_ITEM_IDENTITY",
            "STAC_FEATURES_MALFORMED",
            "STAC_INVENTORY_ITEM_LIMIT",
            "STAC_ITEM_IDENTITY_INVALID",
            "STAC_ITEM_IDENTITY_MISSING",
            "STAC_LINKS_MALFORMED",
            "STAC_MULTIPLE_NEXT_LINKS",
            "STAC_NUMBER_MATCHED_CHANGED",
            "STAC_NUMBER_MATCHED_INVALID",
            "STAC_NUMBER_MATCHED_NOT_EXHAUSTED",
            "STAC_NUMBER_RETURNED_MISMATCH",
            "STAC_PAGINATION_CYCLE",
            "STAC_PAGINATION_PAGE_LIMIT",
            "STAC_PAGINATION_UNPROVEN",
            "STAC_UNSAFE_NEXT_LINK",
            "UNPARSEABLE_SELECTED_STAC_ASSET",
            "UNPARSEABLE_STAC_ITEM",
        )
        observed_stac_codes = {
            str(code)
            for collection in MARINE_COLLECTIONS
            for details in [stac.get(collection) if isinstance(stac, dict) else None]
            if isinstance(details, dict)
            for code in (details.get("catalogInventoryFailureCodes") or [])
        }
        for code in safe_stac_codes:
            if code in observed_stac_codes:
                return f"DMI_{code}"
        ledger = diagnostics.get("currentOperationalLedger") or {}
        safe_ledger_codes = (
            "ACTIVE_CURRENT_REGISTRY_EMPTY",
            "OFFICIAL_DKSS_CATALOG_INCOMPLETE",
            "OFFICIAL_DKSS_CATALOG_COLLAPSE",
            "OFFICIAL_DKSS_LEDGER_INCOMPLETE",
            "LOCALLY_SKIPPED_DKSS_ASSET",
            "SYSTEMIC_CURRENT_TIME_COLLAPSE",
            "UNATTESTED_CURRENT_PART_TIME",
            "CURRENT_LEDGER_CONTRACT_INVALID",
        )
        observed_ledger_codes = {
            str(code) for code in (
                ledger.get("failureCodes")
                if isinstance(ledger, dict)
                and isinstance(ledger.get("failureCodes"), list)
                else []
            )
        }
        for code in safe_ledger_codes:
            if code in observed_ledger_codes:
                return f"DMI_{code}"
        if not attempted:
            return "DMI_DKSS_NOT_ATTEMPTED"
        if any(
            isinstance(error, dict)
            and str(error.get("collection") or "") in MARINE_COLLECTIONS
            for error in (diagnostics.get("errors") or [])
        ):
            return "DMI_DKSS_COLLECTION_FAILED"
        return "DMI_CURRENT_LEDGER_INCOMPLETE"
    if wave_bootstrap_requested and not bootstrap_complete:
        return "DMI_WAVE_BOOTSTRAP_INCOMPLETE"
    # The exact ledger is itself the productivity proof. HARMONIE success may
    # neither manufacture nor be required for DMI current readiness.
    _ = productive
    return "DMI_READY"


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
    if PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH is not None:
        # The one-time migration bridge may begin before the normal rolling
        # cache window. Preserve exactly that bounded start until the new
        # schema-6 checkpoint has been produced; later runs return to normal
        # retention automatically because the bootstrap env is absent.
        cutoff = min(cutoff, PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH)
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


def atomic_write_bulk_cache(document: dict[str, Any]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        "utf-8",
    )
    temporary.replace(OUTPUT_PATH)


def write_checkpoint(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int], status: str = "partial") -> None:
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    clean_and_summarize(result, fresh_zone_ids, budget)
    atomic_write_bulk_cache(result)
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
            (asset, path)
            for asset in candidates
            for path in [reusable_cached_asset_path(asset, collection, model_run)]
            if path is not None
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
                summary["errors"].append({"collection": collection, "message": safe_error_message(exc)})
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
                expected_size=asset.get("size"),
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


def write_github_outputs(
    status: str,
    fresh_collections: int = 0,
    partial_collections: int = 0,
    zone_count: int = 0,
    downloaded_bytes: int = 0,
    error: str | None = None,
    *,
    terminal_code: str = "DMI_UNCLASSIFIED",
    strict_current_anchor_ready: bool = False,
    collection_failure_codes: list[str] | None = None,
) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if output_path:
        bounded_code = (
            terminal_code
            if re.fullmatch(r"[A-Z][A-Z0-9_]{2,63}", terminal_code or "")
            else "DMI_UNCLASSIFIED"
        )
        bounded_failure_codes = sorted({
            str(code)
            for code in (collection_failure_codes or [])
            if re.fullmatch(r"[A-Z][A-Z0-9_]{2,55}", str(code))
        })[:3]
        bounded_failure_csv = ",".join(bounded_failure_codes) or "NONE"
        with open(output_path, "a", encoding="utf-8") as handle:
            handle.write(f"status={status}\n")
            handle.write(f"fresh_collections={fresh_collections}\n")
            handle.write(f"partial_collections={partial_collections}\n")
            handle.write(f"zone_count={zone_count}\n")
            handle.write(f"downloaded_bytes={downloaded_bytes}\n")
            handle.write(f"terminal_code={bounded_code}\n")
            handle.write(f"collection_failure_codes={bounded_failure_csv}\n")
            handle.write(
                "strict_current_anchor_ready="
                f"{'true' if strict_current_anchor_ready else 'false'}\n"
            )
            if error:
                safe_error = safe_error_message(error)
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
        print(f"Kunne ikke skrive GitHub-stepoversigt: {safe_error_message(exc)}", file=sys.stderr, flush=True)

def write_failure_summary(error: Exception) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write("- Status: **failed**\n")
            handle.write(f"- Opstartsfejl: `{safe_error_message(error)}`\n")


def main() -> int:
    global PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH
    wave_bootstrap_configuration = private_wave_bootstrap_configuration()
    if wave_bootstrap_configuration is not None:
        PRIVATE_WAVE_BOOTSTRAP_RETENTION_START_EPOCH = (
            epoch(wave_bootstrap_configuration["requiredHours"][0])
            - wave_bootstrap_configuration["policy"].maximum_interpolation_hours * 3600
        )
    progress(f"starter; arbejdsbudget={MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS}s, afslutningsreserve={FINALIZE_RESERVE_SECONDS}s")
    cache_before = raw_cache_inventory()
    current_zone_registry_signature = sampling_registry_signature()
    zones_geo = json.loads(ZONES_PATH.read_text("utf-8"))
    part_doc: dict[str, Any] = {"zones": {}}
    if COASTAL_PART_POINTS_PATH.exists():
        part_doc = json.loads(COASTAL_PART_POINTS_PATH.read_text("utf-8"))
    coastal_part_targets = load_coastal_part_targets(COASTAL_PART_POINTS_PATH)
    locked_production_reference = production_reference_hour()
    previous = load_previous(
        current_zone_registry_signature,
        coastal_part_targets=coastal_part_targets,
        production_reference=locked_production_reference,
    )
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
    coastal_part_current_cache_healthy = current_operational_cache_ready(
        previous,
        coastal_part_targets,
        locked_production_reference,
    )
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
        and coastal_part_current_cache_healthy
        and not previous_marine_errors
        and previous_refresh_status not in {"failed", "partial"}
    )
    if (
        wave_bootstrap_configuration is None
        and not FORCE_REFRESH
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
        atomic_write_bulk_cache(previous)
        write_ocean_diagnostics(previous)
        ocean = build_ocean_diagnostics(previous)["summary"]
        write_github_outputs(
            "fresh-bulk-cache",
            zone_count=len(previous.get("zones") or {}),
            downloaded_bytes=0,
            terminal_code="DMI_READY",
            strict_current_anchor_ready=True,
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
    for target in coastal_part_targets:
        parent_zone_id = target["parentZoneId"]
        point = target["waterPoint"]
        zones.append({
            "id": f"PART::{target['partId']}",
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
    regional_proxy_targets: list[dict[str, Any]] = []
    regional_proxy_configuration_status = "FAILED_CLOSED"
    try:
        regional_proxy_policy = json.loads(
            CURRENT_REGIONAL_PROXY_POLICY_PATH.read_text("utf-8")
        )
        regional_proxy_targets = build_regional_proxy_targets(
            regional_proxy_policy,
            part_doc,
            zone_coast_types,
        )
        regional_proxy_configuration_status = (
            "CONFIGURED" if regional_proxy_targets else "NOT_CONFIGURED"
        )
    except (OSError, ValueError, TypeError, KeyError):
        # This candidate is private, score-neutral research only. A stale or
        # incompatible policy must disable the candidate without aborting the
        # operational DMI producer or exposing policy payloads in CI logs.
        progress(
            "privat regional proxykandidat blev fail-closed; "
            "operationel DMI-produktion fortsætter"
        )
    research_targets = rotating_research_targets + regional_proxy_targets
    research_run_metrics: dict[str, Any] = {
        "rotationAdvancedThisRun": False,
        "samplesWrittenThisRun": 0,
        "cachedReplayAssetsThisRun": 0,
        "regionalProxyConfigurationStatus": regional_proxy_configuration_status,
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
            print(f"Advarsel: vandstandskilder kunne ikke føjes til bulk-grid: {safe_error_message(exc)}", file=sys.stderr)

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
              "method": f"DMI STAC forecast-step GRIB inventory; hourly official DKSS current ledger; collection-specific field extraction; multi-candidate nearest valid grid point with shared-grid U/V vector pairing and marine collection overlap; {TIME_STRIDE_HOURS}h non-ledger stride; no spatial interpolation",
              "hours": HOURS, "timeStrideHours": TIME_STRIDE_HOURS, "zoneRegistrySignature": current_zone_registry_signature,
              "currentOperationalCadenceHours": 1,
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
    scheduled = prioritize_strict_current_recovery(
        scheduled,
        coastal_part_current_cache_healthy,
    )
    schedule_coverage["strictCurrentRecoveryActive"] = not coastal_part_current_cache_healthy
    if wave_bootstrap_configuration is not None:
        # The first integrated cutover has one bounded exception to ordinary
        # deficit scheduling. Both WAM collections remain in the six-slot loop,
        # but a missing strict current anchor keeps all DKSS collections ahead
        # of them; the separately checkpointed history bootstrap still runs
        # before this loop and may resume over more than one cutover attempt.
        scheduled = prioritize_first_cutover_collections(
            scheduled,
            coastal_part_current_cache_healthy,
        )
        schedule_coverage["privateWaveBootstrapWamFirst"] = coastal_part_current_cache_healthy
        schedule_coverage["privateWaveBootstrapDkssFirst"] = not coastal_part_current_cache_healthy
    schedule_coverage["strictCurrentRecoveryDkssFirst"] = (
        not coastal_part_current_cache_healthy
        and bool(scheduled)
        and scheduled[0] in MARINE_COLLECTIONS
    )
    result["diagnostics"]["scheduledCollections"] = scheduled
    result["diagnostics"]["scheduleCoverageBeforeRun"] = schedule_coverage

    # Prefetch every official DKSS inventory once against the exact +0..+117
    # current axis. DKSS publishes hourly assets; the global three-hour stride
    # is only a local capacity optimization and must never manufacture a
    # Copernicus gap. A mature run may have an internal, explicitly observed
    # STAC hole, but a latest run whose tail is still publishing is deferred.
    prefetched_marine: dict[str, tuple[str | None, list[dict[str, Any]], dict[str, Any]]] = {}
    research_replay_catalog: dict[str, dict[str, Any]] = {}
    required_current_valid_times = set(
        operational_current_valid_times(locked_production_reference)
    )
    required_current_horizon_end = max(required_current_valid_times, key=epoch)
    current_target_ids = sorted(
        str(target.get("partId") or "").strip()
        for target in coastal_part_targets
    )
    current_target_registry_sha256 = target_fingerprint(coastal_part_targets)
    for collection in sorted(MARINE_COLLECTIONS, key=COLLECTION_ORDER.index):
        try:
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            run, assets, stac_stats = list_latest_assets(
                collection,
                previous_run.get("referenceTime"),
                minimum_valid_time=canonical_time(locked_production_reference),
                required_valid_times=required_current_valid_times,
                required_horizon_end_time=required_current_horizon_end,
                allow_documented_required_gaps=True,
            )
            prefetched_marine[collection] = (run, assets, stac_stats)
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            research_replay_catalog[collection] = {"modelRun": run, "assets": assets}
        except Exception as exc:
            safe_message = safe_error_message(exc)
            failed_stats = {
                "requiredHorizonEndCovered": False,
                "prefetchFailed": True,
            }
            prefetched_marine[collection] = (None, [], failed_stats)
            result["diagnostics"]["stacByCollection"][collection] = failed_stats
            result["diagnostics"].setdefault("currentFieldShadowPrefetchErrors", []).append({
                "collection": collection,
                "message": safe_message,
            })
    replay_summary: dict[str, Any] = {"samplesWritten": 0}
    research_rotation_completed = False
    regional_proxy_collection_completed = False

    fresh_zone_ids: set[str] = set()
    fresh_marine_zone_ids: set[str] = set()
    productive_collections = 0
    bootstrap_locked_hours: dict[str, set[str]] = {}
    if wave_bootstrap_configuration is not None:
        bootstrap_locked_hours = execute_private_wave_history_bootstrap(
            result,
            zones,
            budget,
            fresh_zone_ids,
            wave_bootstrap_configuration,
            registry=load_wave_bootstrap_registry(part_doc),
        )

    for collection in scheduled:
        if productive_collections >= COLLECTIONS_PER_RUN:
            break
        if should_stop_work():
            result["diagnostics"]["errors"].append({
                "collection": collection,
                "message": "bulk runtime budget reached",
                "failureCode": "RUNTIME_BUDGET_REACHED",
            })
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
            elif (
                wave_bootstrap_configuration is not None
                and collection in WAVE_BOOTSTRAP_COLLECTIONS
            ):
                run, assets, stac_stats = list_latest_assets(
                    collection,
                    previous_run.get("referenceTime"),
                    minimum_valid_time=wave_bootstrap_configuration["targetHour"],
                    required_valid_times=set(
                        wave_bootstrap_configuration["operationalExactHours"]
                    ),
                    required_horizon_end_time=format_wave_bootstrap_hour(
                        parse_wave_bootstrap_hour(
                            wave_bootstrap_configuration["productionTargetHour"]
                        ) + timedelta(hours=HOURS - 1)
                    ),
                )
            else:
                run, assets, stac_stats = list_latest_assets(collection, previous_run.get("referenceTime"))
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            if not assets:
                raise RuntimeError("no forecast-step GRIB assets found in latest STAC run")
            bootstrap_operational_wam = (
                wave_bootstrap_configuration is not None
                and collection in WAVE_BOOTSTRAP_COLLECTIONS
            )
            if bootstrap_operational_wam:
                cleared = clear_operational_wave_window(
                    result,
                    zones,
                    collection,
                    wave_bootstrap_configuration["targetHour"],
                )
                result["diagnostics"]["operationalWaveRowsCleared"] = int(
                    result["diagnostics"].get("operationalWaveRowsCleared") or 0
                ) + cleared
            if collection in MARINE_COLLECTIONS:
                research_replay_catalog[collection] = {"modelRun": run, "assets": assets}
            zone_registry_signature = current_zone_registry_signature
            processing_signature = f"parser:{PARSER_VERSION}|params:{PARAMETER_MAP_VERSION}|grid:{GRID_LOOKUP_VERSION}|zones:{zone_registry_signature}"
            required_asset_provenance = {
                str(identity["validTime"]): identity
                for asset in assets
                for identity in [official_current_asset_identity(collection, run, asset)]
                if collection in MARINE_COLLECTIONS
                and identity is not None
                and identity["validTime"] in required_current_valid_times
            }
            same_processing = (
                not bootstrap_operational_wam
                and previous_run.get("processingSignature") == processing_signature
            )
            same_run = previous_run.get("referenceTime") == run
            previous_steps = reusable_processed_steps(
                previous_run,
                collection=collection,
                same_processing=same_processing,
                same_run=same_run,
                strict_current_anchor_available=coastal_part_current_cache_healthy,
                required_valid_times=(
                    required_current_valid_times
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
                required_asset_provenance=(
                    required_asset_provenance
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
                current_target_ids=(
                    current_target_ids
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
                current_target_registry_sha256=(
                    current_target_registry_sha256
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
            )
            if (
                collection in MARINE_COLLECTIONS
                and not coastal_part_current_cache_healthy
                and same_processing
                and same_run
            ):
                result["diagnostics"]["strictCurrentRecoveryProcessedStepsDiscarded"] = (
                    int(result["diagnostics"].get("strictCurrentRecoveryProcessedStepsDiscarded") or 0)
                    + max(
                        0,
                        len(previous_run.get("processedSteps") or {}) - len(previous_steps),
                    )
                )
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
                if asset["valid"] in bootstrap_locked_hours.get(collection, set()):
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["bootstrapLockedStepsSkipped"] = int(
                        result["diagnostics"].get("bootstrapLockedStepsSkipped") or 0
                    ) + 1
                    continue
                if asset["valid"] in previously_processed:
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    if (
                        coastal_point_stage_targets
                        and not stage_asset_complete(coastal_point_stage, coastal_point_stage_targets, collection, asset["valid"])
                        and not should_stop_work()
                    ):
                        cached_path = reusable_cached_asset_path(asset, collection, run)
                        if cached_path is not None:
                            register_raw_cache_asset(
                                cached_path,
                                str(asset.get("href") or ""),
                                collection,
                                run,
                                asset["valid"],
                                item_id=str(asset.get("id") or "") or None,
                                item_created_at=asset.get("itemCreatedAt"),
                                item_updated_at=asset.get("itemUpdatedAt"),
                                expected_size=asset.get("size"),
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
                        budget_stop = safe_error_message(exc)
                        break
                    raise
                if reused:
                    result["diagnostics"]["reusedAssets"] += 1
                    run_info["assetsReused"] += 1
                progress(f"{collection}: behandler forecast-step {asset_number}/{len(assets)} {asset['valid']} ({'genbrugt' if reused else 'downloadet'})")
                current_part_outcome_observation: dict[str, Any] = {}
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
                    current_part_outcome_observation,
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
                source_capture = (
                    raw_cache_source_capture(path, collection, run, asset["valid"])
                    if collection in MARINE_COLLECTIONS
                    else None
                )
                step_source_asset = canonical_current_source_asset({
                    "collection": collection,
                    "modelRun": run,
                    "validTime": asset["valid"],
                    **(source_capture or {}),
                }) if source_capture is not None else None
                step_part_outcome_proof = None
                if (
                    collection in MARINE_COLLECTIONS
                    and step_source_asset is not None
                    and current_part_outcome_observation.get("complete") is True
                    and current_part_outcome_observation.get("targetPartIds")
                        == current_target_ids
                ):
                    step_part_outcome_proof = build_current_part_outcome_proof(
                        current_part_outcome_observation.get(
                            "spatialUnavailablePartIds"
                        ),
                        current_target_ids,
                        current_target_registry_sha256,
                        processing_signature,
                        step_source_asset,
                    )
                step_complete = bool(
                    set(step_recognized) >= required_for_family
                    and len(touched) > 0
                    and (
                        collection not in MARINE_COLLECTIONS
                        or step_source_asset is not None
                        and step_part_outcome_proof is not None
                    )
                )
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
                        "processingSignature": processing_signature,
                        **({"sourceAsset": step_source_asset}
                           if collection in MARINE_COLLECTIONS else {}),
                        **({"currentPartOutcomeProof": step_part_outcome_proof}
                           if collection in MARINE_COLLECTIONS else {}),
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
                result["diagnostics"]["errors"].append({
                    "collection": collection,
                    "message": budget_stop,
                    "failureCode": "RUNTIME_BUDGET_REACHED",
                    "partialProgressPreserved": True,
                })
        except Exception as exc:
            message = safe_error_message(exc)
            failure_code = collection_failure_code(exc)
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
            result["diagnostics"]["errors"].append({
                "collection": collection,
                "message": message,
                "failureCode": failure_code,
                "failureClass": state["failureClass"],
                "retryAfterMinutes": delay_minutes,
            })

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
    current_operational_ledger = build_current_operational_ledger(
        result,
        coastal_part_targets,
        locked_production_reference,
        prefetched_marine,
    )
    result["diagnostics"]["currentOperationalLedger"] = current_operational_ledger
    result["diagnostics"]["currentOperationalAttestation"] = (
        current_operational_ledger["attestation"]
    )
    strict_current_anchor_available = current_operational_cache_ready(
        result,
        coastal_part_targets,
        locked_production_reference,
    )
    result["diagnostics"]["strictCoastalPartCurrentAnchorAvailable"] = (
        strict_current_anchor_available
    )
    if not strict_current_anchor_available:
        result["diagnostics"]["errors"].append({
            "collection": "dmi-current-ledger-gate",
            "message": (
                "The official DKSS asset/valid-time ledger is not complete "
                "for the locked operational matrix"
            ),
            "failureClass": "producer-success-gate",
            "failureCodes": result["diagnostics"]["currentOperationalLedger"].get(
                "failureCodes"
            ),
        })
    bootstrap_operational_complete = False
    if wave_bootstrap_configuration is not None:
        bootstrap_diagnostics = result["diagnostics"].get(
            "privateWaveHistoryBootstrap"
        ) or {}
        try:
            registry = load_wave_bootstrap_registry(part_doc)
            operational = validate_wave_operational_handoff_cache(
                result,
                registry,
                bootstrap_target_hour=wave_bootstrap_configuration["targetHour"],
                production_target_hour=wave_bootstrap_configuration["productionTargetHour"],
                forecast_hour_count=HOURS,
            )
            bootstrap_diagnostics["operationalHandoff"] = (
                operational.sanitized_attestation()
            )
            bootstrap_diagnostics["status"] = "complete"
            bootstrap_operational_complete = True
        except WaveBootstrapError as exc:
            bootstrap_diagnostics["status"] = "failed"
            bootstrap_diagnostics["failureCode"] = exc.code
            result["diagnostics"]["errors"].append({
                "collection": "private-wave-bootstrap",
                "message": safe_error_message(exc),
                "failureClass": "cutover-gate",
            })
    result["diagnostics"]["currentCoverageOwnerAudit"] = write_current_coverage_owner_audit(
        current_shadow,
        part_doc,
        result,
        zones_geo,
        generated,
    )
    diag = result["diagnostics"]
    fresh_successes, fresh_partials = len(diag["collectionsSucceeded"]), len(diag["collectionsPartial"])
    bootstrap_complete = wave_bootstrap_configuration is not None and bootstrap_operational_complete
    producer_productive = bool(
        strict_current_anchor_available
        or fresh_successes
        or fresh_partials
        or bootstrap_complete
    )
    producer_success_is_blocked = producer_success_blocked(
        strict_current_anchor_available,
        wave_bootstrap_configuration is not None,
        bootstrap_complete,
    )
    if not producer_success_is_blocked and (
        fresh_successes or fresh_partials or bootstrap_complete
    ):
        result["sourceUpdatedAt"] = generated
    if producer_success_is_blocked:
        result["refreshStatus"] = "failed"
    else:
        result["refreshStatus"] = "ok" if strict_current_anchor_available else (
            "partial" if fresh_successes or fresh_partials or bootstrap_complete
            or result["diagnostics"]["zeroProgressCollections"] else "failed"
        )

    write_checkpoint(result, fresh_zone_ids, budget, result["refreshStatus"])
    prune_stats = prune_raw_cache()
    cache_after = raw_cache_inventory()
    write_cache_audit(cache_before, cache_after, prune_stats["removedFiles"], prune_stats["removedBytes"])
    result["diagnostics"]["rawCache"] = {"before": cache_before, "after": cache_after, **prune_stats, "maxBytes": RAW_CACHE_MAX_BYTES}
    summary = {**diag, "refreshStatus": result["refreshStatus"], "sourceUpdatedAt": result.get("sourceUpdatedAt"),
               "preservedPreviousZones": max(0, len(result["zones"]) - len(fresh_zone_ids))}
    terminal_code = producer_terminal_code(
        strict_current_anchor_available=strict_current_anchor_available,
        wave_bootstrap_requested=wave_bootstrap_configuration is not None,
        bootstrap_complete=bootstrap_complete,
        productive=producer_productive,
        diagnostics=diag,
    )
    write_github_outputs(
        result["refreshStatus"], fresh_successes, fresh_partials,
        len(result["zones"]), budget["bytes"],
        terminal_code=terminal_code,
        strict_current_anchor_ready=strict_current_anchor_available,
        collection_failure_codes=diagnostic_collection_failure_codes(diag),
    )
    write_step_summary(result, scheduled, diag, budget, fresh_successes, fresh_partials)
    print(json.dumps(summary, ensure_ascii=False))
    if producer_success_is_blocked:
        return 2
    return 0 if producer_productive else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"DMI bulk downloader failed safely: {safe_error_message(exc)}", file=sys.stderr, flush=True)
        write_github_outputs(
            "failed",
            error=safe_error_message(exc),
            terminal_code="DMI_PRODUCER_EXCEPTION",
            strict_current_anchor_ready=False,
        )
        write_failure_summary(exc)
        raise SystemExit(2)

# 4.0.29 diagnostics placeholders: zonesWithAnyData/zonesWith96Hours
