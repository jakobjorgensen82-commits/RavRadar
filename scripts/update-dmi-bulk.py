#!/usr/bin/env python3
"""Build RavRadar's DMI cache from forecast-step GRIB assets.

DMI STAC items represent forecast steps, not individual parameters. Each selected
GRIB file is downloaded once, inventoried message-by-message with ecCodes, and only
the collection-specific fields needed by RavRadar are extracted. Progress, failures
and collection rotation are persisted across runs.
"""
from __future__ import annotations

import copy
from contextlib import contextmanager
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
from typing import Any, Iterable, NamedTuple
from urllib.parse import urljoin, urlparse

from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed, water_temperature_surface_layer, vector_vertical_layer, vector_choice, prefer_vector_choice
from lib.dmi_wind_reference import WIND_VECTOR_VERSION, read_wind_reference, earth_relative_wind_pair
from lib.current_field_shadow import (
    REGIONAL_PROXY_NATIVE_CADENCE_HOURS,
    REGIONAL_PROXY_OPERATIONAL_FORECAST_LEAD_MAX_HOURS,
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
from lib.regional_source_proofs import (
    capture_regional_source_proof,
    migrate_regional_source_proofs,
)
from lib.dmi_current_processing_compatibility import (
    retained_current_processing_signature_compatible,
)
from lib.dmi_bulk_storage import (
    read_dmi_bulk_document,
    write_dmi_bulk_document,
)
from lib.weather_acquisition_plan import (
    planning_regional_covered_pairs,
    read_current_acquisition_plan,
)
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
    CURRENT_OPERATIONAL_NON_FATAL_CODES,
    CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION,
    CURRENT_OPERATIONAL_LEDGER_STATES,
    CURRENT_PREFERRED_DISTANCE_KM,
    CURRENT_VECTOR_SELECTION,
    CURRENT_VECTOR_SEMANTICS_VERSION,
    DKSS_MAX_FORECAST_LEAD_HOURS,
    MARINE_COLLECTIONS,
    SPATIAL_PROVENANCE_VERSION,
    build_current_part_outcome_proof,
    build_retained_current_asset_proof,
    canonical_time,
    canonical_current_source_asset,
    canonical_pre_sanitize_current_identity_attestation,
    canonical_verified_part_current_attestation,
    complete_native_source_for_hour,
    component_collection_allowed,
    current_attestation_authorization_from_operational_ledger,
    current_official_assets_sha256,
    current_source_asset_sha256,
    current_source_matches_official_asset,
    current_operational_ledger_ready,
    derive_current_part_outcome_partition,
    exact_current_operational_complement,
    part_time_pairs_sha256,
    processed_source_assets_from_current_operational_ledger,
    retained_current_asset_proofs_sha256,
    sampling_identity,
    sanitized_current_attestation,
    validate_current_operational_availability_ledger,
    validate_current_operational_ledger,
    validate_current_part_outcome_proof,
    validate_retained_current_asset_proofs,
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
from lib.dmi_wave_owner import (
    WAVE_OWNER_POLICY_ID,
    wave_owner_by_cache_key,
    wave_owner_for_target,
)
from lib.dmi_wave_history_bootstrap import (
    COLD_START_MODE as WAVE_BOOTSTRAP_COLD_START_MODE,
    EXPECTED_COASTAL_PART_COUNT as WAVE_BOOTSTRAP_EXPECTED_PART_COUNT,
    MAX_INTERPOLATION_HOURS as WAVE_MAX_INTERPOLATION_HOURS,
    MIGRATION_MODE as WAVE_BOOTSTRAP_MIGRATION_MODE,
    WAM_COLLECTIONS as WAVE_BOOTSTRAP_COLLECTIONS,
    WaveBootstrapError,
    conflicting_native_wave_asset_keys,
    format_utc_hour as format_wave_bootstrap_hour,
    load_coastal_part_registry as load_wave_bootstrap_registry,
    native_wave_row_error_code,
    parse_utc_hour as parse_wave_bootstrap_hour,
    policy_for_mode as wave_bootstrap_policy_for_mode,
    policy_utc_hours as wave_bootstrap_policy_utc_hours,
    resolved_native_wave_hour_evidence,
    resolved_native_wave_hours,
    select_stac_wave_history_assets,
    validate_wave_history_cache,
    validate_wave_operational_handoff_cache,
)

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
try:
    import eccodes as eccodes_module
    from eccodes import (
        OutOfAreaError, codes_get, codes_get_array, codes_get_elements, codes_grib_find_nearest,
        codes_grib_new_from_file, codes_release,
    )
except ImportError as exc:
    raise RuntimeError(
        "ecCodes Python API er ikke kompatibelt: codes_get_elements mangler. "
        "Installer requirements-dmi.txt igen."
    ) from exc

# The public high-level nearest helper constructs and destroys an ecCodes
# nearest object for every call. The low-level API lets a cold grid warm one
# object and reuse its geometry for the exact same probe sequence. Keep this
# optional at import time so provenance-only tests and older local bindings can
# still exercise the fail-closed high-level path.
codes_grib_nearest_new = getattr(eccodes_module, "codes_grib_nearest_new", None)
codes_grib_nearest_find = getattr(eccodes_module, "codes_grib_nearest_find", None)
codes_grib_nearest_delete = getattr(eccodes_module, "codes_grib_nearest_delete", None)
CODES_GRIB_NEAREST_SAME_GRID = getattr(
    eccodes_module,
    "CODES_GRIB_NEAREST_SAME_GRID",
    None,
)
ECCODES_API_VERSION = re.sub(
    r"[^A-Za-z0-9._+-]",
    "_",
    str(getattr(eccodes_module, "__version__", "unknown")),
)[:48]
ECCODES_BINDING_VERSION = re.sub(
    r"[^A-Za-z0-9._+-]",
    "_",
    str(getattr(eccodes_module, "bindings_version", "unknown")),
)[:48]

ROOT = pathlib.Path(__file__).resolve().parents[1]
ZONES_PATH = ROOT / "data/zones.geojson"
COASTAL_PART_POINTS_PATH = ROOT / "data/live/coastal-parts-v2.json"
WATER_SOURCES_PATH = ROOT / "data/live/dmi-water-stations.json"
OUTPUT_PATH = pathlib.Path(os.getenv(
    "DMI_BULK_OUTPUT_PATH",
    str(ROOT / "data/live/dmi-bulk-cache.json"),
))
PROMOTION_PATH = (
    pathlib.Path(os.environ["DMI_BULK_PROMOTION_PATH"])
    if os.getenv("DMI_BULK_PROMOTION_PATH")
    else None
)
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
MAX_OPERATIONAL_WAM_FALLBACK_RUNS = 1
CHECKPOINT_MAX_ASSETS = max(1, int(os.getenv("DMI_BULK_CHECKPOINT_MAX_ASSETS", "8")))
CHECKPOINT_MAX_SECONDS = max(10, int(os.getenv("DMI_BULK_CHECKPOINT_MAX_SECONDS", "60")))
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
PREFERRED_RUN_MIN_FUTURE_HOURS = max(
    24, int(os.getenv("DMI_BULK_PREFERRED_RUN_MIN_FUTURE_HOURS", "96"))
)
HARMONIE_RUN_RETENTION_HOURS = max(24, int(os.getenv("DMI_HARMONIE_RUN_RETENTION_HOURS", "48")))
FORCE_REFRESH = os.getenv("DMI_BULK_FORCE_REFRESH", "false").lower() in {"1", "true", "yes", "on"}
DKSS_PRIMARY_MODE = os.getenv(
    "DMI_BULK_DKSS_PRIMARY_MODE", "false"
).lower() in {"1", "true", "yes", "on"}
DKSS_PRIMARY_REFRESH_MAX_ASSETS = max(
    0,
    min(16, int(os.getenv("DMI_BULK_DKSS_PRIMARY_REFRESH_MAX_ASSETS", "2"))),
)
RETAIN_PREFERRED_NATIVE_RUN = os.getenv(
    "DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN", "false"
).lower() in {"1", "true", "yes", "on"}
PREFER_OUTPUT_CACHE = os.getenv(
    "DMI_BULK_PREFER_OUTPUT_CACHE", "false"
).lower() in {"1", "true", "yes", "on"}
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar DMI bulk downloader")
API_KEY = os.getenv("DMI_API_KEY")
STARTED = time.monotonic()
FINALIZE_RESERVE_SECONDS = max(60, int(os.getenv("DMI_BULK_FINALIZE_RESERVE_SECONDS", "180")))
WORK_DEADLINE = STARTED + max(60, MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS)
FINALIZE_ONLY = os.getenv("DMI_BULK_FINALIZE_ONLY", "").strip().lower() == "true"
FINALIZE_REASON = os.getenv("DMI_BULK_FINALIZE_REASON", "").strip()
ONEOFF_CONTINUATION_PROTOCOL = (
    os.getenv("DMI_BULK_ONEOFF_CONTINUATION_PROTOCOL", "").strip() == "1"
)
ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE = 75
ALLOWED_FINALIZE_REASONS = frozenset({
    "ASSET_PROCESSING_WATCHDOG_LIMIT",
    "HARMONIE_ASSET_WATCHDOG_TIMEOUT",
})
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
GRID_LOOKUP_VERSION = 9
WAVE_ASSET_ADMISSION_POLICY = "per-part-atomic-owner-v2"
WAVE_ASSET_CACHE_PROOF_SCHEMA = "dmi-wave-asset-cache-proof-v2"
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
REGIONAL_PROXY_MAX_HOLD_HOURS = 3
OPERATIONAL_WAVE_PROXY_PARENT_ZONE_IDS = frozenset({"DK-B05-11"})
OPERATIONAL_WAVE_NATIVE_PART_COUNT = 670
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


SUPERVISED_ASSET_IDENTITY_FIELDS = {
    "collection", "modelRun", "validTime", "itemId", "assetIdentitySha256",
    "assetRevisionSha256",
}


def supervised_asset_identity(
    collection: str,
    model_run: Any,
    asset: dict[str, Any],
) -> dict[str, str]:
    """Return a bounded identity safe to expose to the local supervisor."""
    canonical_run = canonical_time(model_run)
    canonical_valid = canonical_time(asset.get("valid"))
    item_id = str(asset.get("id") or "").strip()
    canonical_asset_identity = asset_identity_sha256(asset.get("href"))
    item_created_at = canonical_time(asset.get("itemCreatedAt"))
    item_updated_at = canonical_time(asset.get("itemUpdatedAt"))
    if (
        collection not in COLLECTION_ORDER
        or canonical_run is None
        or canonical_valid is None
        or not item_id
        or canonical_asset_identity is None
        or (
            asset.get("itemCreatedAt") is not None
            and item_created_at is None
        )
        or (
            asset.get("itemUpdatedAt") is not None
            and item_updated_at is None
        )
    ):
        raise ValueError("DMI supervised asset identity is invalid")
    revision_identity = {
        "collection": collection,
        "modelRun": canonical_run,
        "validTime": canonical_valid,
        "itemId": item_id,
        "assetIdentitySha256": canonical_asset_identity,
        "size": asset.get("size"),
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }
    return {
        "collection": collection,
        "modelRun": canonical_run,
        "validTime": canonical_valid,
        "itemId": item_id,
        "assetIdentitySha256": canonical_asset_identity,
        "assetRevisionSha256": hashlib.sha256(
            json.dumps(
                revision_identity,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
        ).hexdigest(),
    }


def supervised_asset_identity_key(identity: dict[str, str]) -> str:
    return json.dumps(
        identity,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


@contextmanager
def supervised_asset_operation(identity: dict[str, str]):
    """Bind one exact download or parser operation to the outer watchdog."""
    marker = supervised_asset_identity_key(identity)
    progress(f"DMI_ASSET_PROCESSING_START={marker}")
    try:
        yield
    finally:
        progress(f"DMI_ASSET_PROCESSING_END={marker}")


def supervised_skipped_asset_identities() -> set[str]:
    raw = os.getenv("DMI_BULK_SUPERVISOR_SKIPPED_ASSETS", "[]")
    try:
        rows = json.loads(raw)
    except (TypeError, ValueError) as error:
        raise ValueError("DMI supervised skip list is invalid") from error
    if not isinstance(rows, list) or len(rows) > 12:
        raise ValueError("DMI supervised skip list is invalid")
    identities: set[str] = set()
    for row in rows:
        if (
            not isinstance(row, dict)
            or set(row) != SUPERVISED_ASSET_IDENTITY_FIELDS
            or row.get("collection") not in COLLECTION_ORDER
            or canonical_time(row.get("modelRun")) != row.get("modelRun")
            or canonical_time(row.get("validTime")) != row.get("validTime")
            or not str(row.get("itemId") or "").strip()
            or not re.fullmatch(
                r"[a-f0-9]{64}", str(row.get("assetIdentitySha256") or "")
            )
            or not re.fullmatch(
                r"[a-f0-9]{64}", str(row.get("assetRevisionSha256") or "")
            )
        ):
            raise ValueError("DMI supervised skip identity is invalid")
        identities.add(
            json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        )
    if len(identities) != len(rows):
        raise ValueError("DMI supervised skip list contains duplicates")
    return identities


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


def operational_asset_parameter_filter(
    collection: str,
    valid_time: str,
    model_run: str,
    required_current_valid_times: set[str],
) -> set[str] | None:
    """Keep exact hourly current proof without oversampling optional fields.

    The official DKSS ledger requires every native +0..+117 asset, but the
    established non-ledger capacity contract samples optional marine fields at
    ``TIME_STRIDE_HOURS``. Exact required hours between those stride positions
    therefore decode only sea level and the shared-cell U/V pair.
    """
    if (
        collection in MARINE_COLLECTIONS
        and valid_time in required_current_valid_times
        and not stride_selected(valid_time, model_run)
    ):
        return set(REQUIRED_TARGETS["marine"])
    return None


def wam_asset_times_resolve_target_window(
    rows: list[dict[str, Any]],
    window_start_time: str,
    window_end_time: str,
    exact_required_times: set[str],
) -> bool:
    """Check one run's STAC time axis against the native WAM resolver bound."""
    start = iso(window_start_time)
    end = iso(window_end_time)
    available = sorted({
        epoch(valid_time)
        for row in rows
        for valid_time in [iso(row.get("valid"))]
        if valid_time is not None
    })
    if not start or not end or not available or epoch(end) < epoch(start):
        return False
    available_set = set(available)
    exact_required = {
        epoch(valid_time)
        for raw in exact_required_times
        for valid_time in [iso(raw)]
        if valid_time is not None
    }
    if not exact_required <= available_set:
        return False

    wanted = epoch(start)
    end_epoch = epoch(end)
    maximum_gap_seconds = WAVE_MAX_INTERPOLATION_HOURS * 3600
    while wanted <= end_epoch:
        if wanted not in available_set:
            before = max(
                (candidate for candidate in available if candidate < wanted),
                default=None,
            )
            after = min(
                (candidate for candidate in available if candidate > wanted),
                default=None,
            )
            if (
                before is None
                or after is None
                or after - before > maximum_gap_seconds
            ):
                return False
        wanted += 3600
    return True


def select_forecast_run(
    runs: dict[str, list[dict[str, Any]]],
    preferred_run: str | None = None,
    now_epoch: float | None = None,
    retention_horizon_hours: float = COMPLETE_HORIZON_HOURS,
    retain_preferred_run: bool = False,
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
    preferred_has_minimum_future_horizon = bool(
        preferred_run in future_horizon
        and future_horizon[preferred_run] >= PREFERRED_RUN_MIN_FUTURE_HOURS
    )
    bounded_preferred_pin = bool(
        retain_preferred_run and preferred_has_minimum_future_horizon
    )
    preferred_still_scheduled = (
        preferred_run in future_horizon
        and (
            bounded_preferred_pin
            or preferred_run == latest
            or (
                preferred_run in mature
                and
                cadence_hours is not None
                and preferred_lag_hours <= cadence_hours + 1e-6
            )
        )
    )
    stale_preferred_discarded = (
        preferred_run in future_horizon and not preferred_still_scheduled
    )
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
        "preferredProgressiveRunPinned": bool(
            bounded_preferred_pin and selected == preferred_run
        ),
        "preferredProgressiveRunDiscardedAsStale": stale_preferred_discarded,
        "incompleteLatestRunDeferred": selected != latest,
    }


def collection_retry_eligible(
    entry: dict[str, Any],
    now_epoch: float | None = None,
) -> bool:
    """Return whether a persisted collection cooldown permits a new attempt."""
    now_value = time.time() if now_epoch is None else now_epoch
    blocked_parser_version = int(entry.get("blockedParserVersion") or 0)
    parser_block_obsolete = (
        entry.get("failureClass") == "parser-blocked"
        and blocked_parser_version != PARSER_VERSION
    )
    if parser_block_obsolete:
        entry["nextEligibleAt"] = None
        entry["failureClass"] = None
        entry["blockedParserVersion"] = None
        entry["consecutiveFailures"] = 0
    return epoch(entry.get("nextEligibleAt")) <= now_value


def wam_runtime_reserve(
    collections: list[str],
    remaining_work_seconds: float,
    *,
    lead_reserve_seconds: float = 0.0,
) -> tuple[dict[str, float], float]:
    """Reserve a fair bounded slice for every pending critical WAM family."""
    ordered = [
        collection for collection in sorted(
            WAVE_BOOTSTRAP_COLLECTIONS,
            key=COLLECTION_ORDER.index,
        )
        if collection in collections
    ]
    if not ordered:
        return {}, 0.0
    available = max(
        0.0,
        remaining_work_seconds - max(0.0, lead_reserve_seconds),
    )
    total = min(
        900.0,
        available,
        max(120.0 * len(ordered), available / 3.0),
    )
    per_collection = total / len(ordered)
    return (
        {collection: per_collection for collection in ordered},
        total,
    )


STRICT_CURRENT_TURN_RESERVE_SECONDS = 120.0


def strict_current_turn_epoch(entry: Any, now_epoch: float) -> float:
    """Return a safe scheduler hint; it never becomes data evidence."""
    if not isinstance(entry, dict):
        return 0.0
    value = epoch(entry.get("lastStrictCurrentTurnAt"))
    if value <= 0 or value > now_epoch:
        return 0.0
    return value


def strict_current_collection_order(
    collections: list[str],
    state: dict[str, Any],
    now_epoch: float,
) -> list[str]:
    """Rotate critical DKSS service without changing provider admission."""
    base_rank = {collection: index for index, collection in enumerate(collections)}
    return sorted(
        collections,
        key=lambda collection: (
            strict_current_turn_epoch(state.get(collection), now_epoch),
            base_rank[collection],
        ),
    )


def begin_collection_scheduler_turn(
    state: dict[str, Any],
    collection: str,
    lead_collection: Any,
    turn_at: str,
) -> bool:
    """Record an attempted collection and rotate only the actual DKSS lead.

    The lead marker is a liveness hint, not source or admission evidence.  It is
    recorded before provider work so an attempted lead still yields after a
    negative or failed turn.  Collections reached later in the same run retain
    their previous lead marker; otherwise one shared run timestamp makes the
    next invocation fall back to the fixed collection order again.
    """
    state["lastAttemptAt"] = turn_at
    if collection != lead_collection:
        return False
    state["lastStrictCurrentTurnAt"] = turn_at
    return True


def strict_current_runtime_reserve(
    collections: list[str],
    remaining_work_seconds: float,
) -> tuple[dict[str, float], float]:
    """Reserve a bounded start opportunity for every pending DKSS family."""
    ordered = [
        collection for collection in collections
        if collection in MARINE_COLLECTIONS
    ]
    if not ordered:
        return {}, 0.0
    total = min(
        max(0.0, remaining_work_seconds),
        STRICT_CURRENT_TURN_RESERVE_SECONDS * len(ordered),
    )
    per_collection = total / len(ordered)
    return (
        {collection: per_collection for collection in ordered},
        total,
    )


def fair_nonlead_strict_current_runtime_reserve(
    pending_collections: list[str],
    remaining_work_seconds: float,
    minimum_reserve_by_collection: dict[str, float],
) -> float:
    """Protect a fair share for DKSS families still waiting in this run.

    The single lead attempt and the critical WAM turns remain unchanged.  Once
    those turns are behind us, the first non-lead DKSS family may otherwise use
    all slack while the final family receives only its 120-second start
    reserve.  Freeze the pending families' proportional share at collection
    start; unused time naturally rolls forward when the current family has no
    more work.
    """
    pending = [
        collection for collection in pending_collections
        if collection in MARINE_COLLECTIONS
    ]
    if not pending:
        return 0.0
    minimum = sum(
        max(0.0, float(minimum_reserve_by_collection.get(collection, 0.0)))
        for collection in pending
    )
    fair_share = max(0.0, float(remaining_work_seconds)) * (
        len(pending) / (len(pending) + 1)
    )
    return max(minimum, fair_share)


def operational_collection_plan(
    scheduled: list[str],
    state: dict[str, Any],
    strict_current_anchor_available: bool,
    operational_wave_residual: dict[str, dict[str, Any]],
    remaining_work_seconds: float,
    *,
    now_epoch: float | None = None,
    force_wam_collections: set[str] | None = None,
) -> tuple[list[str], dict[str, Any]]:
    """Plan fair critical DKSS/WAM service before maintenance slack."""
    now_value = time.time() if now_epoch is None else now_epoch
    retry_deferred = [
        collection for collection in scheduled
        if not collection_retry_eligible(
            state.setdefault(collection, {}),
            now_value,
        )
    ]
    eligible = [
        collection for collection in scheduled
        if collection not in retry_deferred
    ]
    complete_wam = [
        collection
        for collection in sorted(
            WAVE_BOOTSTRAP_COLLECTIONS,
            key=COLLECTION_ORDER.index,
        )
        if collection in eligible
        and int(
            (operational_wave_residual.get(collection) or {}).get(
                "requiredPairCount"
            ) or 0
        ) > 0
        and int(
            (operational_wave_residual.get(collection) or {}).get(
                "missingPairCount"
            ) or 0
        ) == 0
    ]
    forced_wam = set(force_wam_collections or set())
    proof_complete_wam = [
        collection for collection in complete_wam
        if collection in forced_wam
    ]
    quality_eligible_complete_wam = [
        collection for collection in complete_wam
        if collection not in forced_wam
    ]
    work_eligible = [
        collection for collection in eligible
        if collection not in proof_complete_wam
    ]
    strict_current = strict_current_collection_order(
        [
            collection for collection in work_eligible
            if not strict_current_anchor_available
            and collection in MARINE_COLLECTIONS
        ],
        state,
        now_value,
    )
    lead_dkss = strict_current[0] if strict_current else None
    critical_wam = [
        collection
        for collection in sorted(
            WAVE_BOOTSTRAP_COLLECTIONS,
            key=COLLECTION_ORDER.index,
        )
        if collection in work_eligible
        and int(
            (operational_wave_residual.get(collection) or {}).get(
                "requiredPairCount"
            ) or 0
        ) > 0
        and int(
            (operational_wave_residual.get(collection) or {}).get(
                "missingPairCount"
            ) or 0
        ) > 0
    ]
    prioritized = [
        *([lead_dkss] if lead_dkss else []),
        *critical_wam,
        *strict_current[1:],
    ]
    planned = [
        *prioritized,
        *[
            collection for collection in work_eligible
            if collection not in prioritized
        ],
    ]
    current_reserve_by_collection, current_reserve_total = (
        strict_current_runtime_reserve(
            strict_current,
            remaining_work_seconds,
        )
    )
    reserve_by_collection, reserve_total = wam_runtime_reserve(
        critical_wam,
        remaining_work_seconds,
        lead_reserve_seconds=current_reserve_total,
    )
    return planned, {
        "strictCurrentLeadCollection": lead_dkss,
        "strictCurrentLeadAttemptLimit": 1,
        "strictCurrentCollections": strict_current,
        "criticalCurrentOutsideBaseCollectionQuota": True,
        "strictCurrentRuntimeReserveSeconds": round(
            current_reserve_total, 3,
        ),
        "strictCurrentRuntimeReserveSecondsByCollection": {
            collection: round(seconds, 3)
            for collection, seconds in current_reserve_by_collection.items()
        },
        "criticalWamCollections": critical_wam,
        "forcedFirstCutoverWamCollections": [
            collection for collection in critical_wam
            if collection in (force_wam_collections or set())
        ],
        "proofCompleteWamCollectionsSkipped": proof_complete_wam,
        "proofCompleteWamCollectionsRetainedForQuality": (
            quality_eligible_complete_wam
        ),
        "criticalWamOutsideBaseCollectionQuota": True,
        "criticalWamRuntimeReserveSeconds": round(reserve_total, 3),
        "strictCurrentLeadRuntimeReserveSeconds": (
            round(current_reserve_by_collection.get(lead_dkss, 0.0), 3)
            if lead_dkss else 0.0
        ),
        "criticalWamRuntimeReserveSecondsByCollection": {
            collection: round(seconds, 3)
            for collection, seconds in reserve_by_collection.items()
        },
        "retryDeferredCollections": retry_deferred,
    }


def strict_current_lead_attempt_available(
    collection: str,
    lead_collection: Any,
    attempted_assets: int,
    attempt_limit: int,
) -> bool:
    """Bound only actual lead downloads/reuses; cache-proof skips are free."""
    return bool(
        collection != lead_collection
        or attempted_assets < max(0, attempt_limit)
    )


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


def official_wave_asset_identity(
    collection: str,
    model_run: Any,
    asset: Any,
) -> dict[str, Any] | None:
    if collection not in WAVE_BOOTSTRAP_COLLECTIONS or not isinstance(asset, dict):
        return None
    run = canonical_time(model_run)
    valid_time = canonical_time(asset.get("valid") or asset.get("validTime"))
    item_id = str(asset.get("id") or asset.get("itemId") or "").strip()
    identity = str(asset.get("assetIdentitySha256") or "")
    asset_size = asset.get("assetSizeBytes", asset.get("size"))
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
            or isinstance(asset_size, int)
            and not isinstance(asset_size, bool)
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


def asset_identity_is_required_for_resume(
    collection: str,
    asset: dict[str, Any],
    identity: dict[str, Any],
    required_current_valid_times: set[str],
) -> bool:
    """Keep WAM resume proof bound to the primary phase, never its fallback."""
    if collection in WAVE_BOOTSTRAP_COLLECTIONS:
        return int(asset.get("operationalWavePhaseRank") or 0) == 0
    return str(identity.get("validTime") or "") in required_current_valid_times


def wave_source_asset_matches_official(source: Any, expected: Any) -> bool:
    return bool(
        isinstance(source, dict)
        and isinstance(expected, dict)
        and source == expected
    )


def wave_native_source_matches_official(
    source: Any,
    expected: Any,
) -> bool:
    """Match a persisted native wave row to one exact official STAC asset."""
    return bool(
        isinstance(source, dict)
        and isinstance(expected, dict)
        and source.get("collection") == expected.get("collection")
        and canonical_time(source.get("modelRun"))
            == canonical_time(expected.get("modelRun"))
        and canonical_time(source.get("nativeValidTime"))
            == canonical_time(expected.get("validTime"))
        and source.get("itemId") == expected.get("itemId")
        and source.get("assetIdentitySha256")
            == expected.get("assetIdentitySha256")
        and source.get("assetSizeBytes") == expected.get("assetSizeBytes")
        and canonical_time(source.get("itemCreatedAt"))
            == canonical_time(expected.get("itemCreatedAt"))
        and canonical_time(source.get("itemUpdatedAt"))
            == canonical_time(expected.get("itemUpdatedAt"))
    )


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
    actual_pair_source_keys: set[tuple[str, str, str]] | None = None,
    covered_pair_keys: set[tuple[str, str]] | None = None,
    wave_cache: dict[str, Any] | None = None,
    wave_zones: list[dict[str, Any]] | None = None,
    wave_resume_metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Reuse only checkpoints bound to an exact asset and actual cache proof."""
    if not same_processing or not same_run:
        return {}
    processing_signature = previous_run.get("processingSignature")
    if not isinstance(processing_signature, str) or not processing_signature:
        return {}
    steps = previous_run.get("processedSteps") or {}
    if not isinstance(steps, dict):
        steps = {}
    if collection in WAVE_BOOTSTRAP_COLLECTIONS:
        if (
            not isinstance(required_asset_provenance, dict)
            or not isinstance(wave_cache, dict)
            or not isinstance(wave_zones, list)
            or not wave_zones
        ):
            return {}
        reusable_wave: dict[str, Any] = {}
        rejected_by_code: dict[str, int] = {}
        reconstructed = 0
        evaluated = 0
        traversal_complete = 0
        partially_admitted = 0
        for raw_valid_time, expected in required_asset_provenance.items():
            valid_time = canonical_time(raw_valid_time)
            if not (
                valid_time
                and isinstance(expected, dict)
                and expected.get("collection") == collection
                and canonical_time(expected.get("validTime")) == valid_time
            ):
                continue
            evaluated += 1
            step = steps.get(raw_valid_time)
            if not isinstance(step, dict):
                step = steps.get(valid_time)
            if not isinstance(step, dict):
                step = {}
            asset = MappingWaveAsset({
                "valid": expected["validTime"],
                "id": expected["itemId"],
                "assetIdentitySha256": expected["assetIdentitySha256"],
            }, expected["modelRun"], official_identity=expected)
            summary = private_wave_bootstrap_asset_summary(
                wave_cache,
                wave_zones,
                collection,
                asset,
            )
            for code, count in summary["rejectedByCode"].items():
                rejected_by_code[code] = (
                    rejected_by_code.get(code, 0) + int(count)
                )
            summary_complete = wave_asset_cache_proof_coherent(
                summary,
                require_complete=True,
            )
            persisted_traversal = bool(
                wave_asset_cache_proof_coherent(summary)
                and step.get("assetTraversalComplete") is True
                and step.get("waveAdmissionPolicy")
                    == WAVE_ASSET_ADMISSION_POLICY
                and re.fullmatch(
                    r"[0-9a-f]{64}",
                    str(step.get("rawContentSha256") or ""),
                )
                and step.get("rawContentSha256")
                    == summary.get("rawContentSha256")
                and step.get("parserVersion") == PARSER_VERSION
                and step.get("processingSignature") == processing_signature
                and {"significant-wave-height", "dominant-wave-period"}
                    <= set(step.get("recognizedParameters") or [])
                and int(step.get("acceptedNativeZoneCount") or 0)
                    == int(summary.get("acceptedCount") or 0)
                and wave_source_asset_matches_official(
                    step.get("sourceAsset"), expected,
                )
                and step.get("waveTargetProof") == summary
            )
            # A complete exact cache can reconstruct its receipt. Partial cache
            # state is reusable only with the persisted proof that the exact
            # immutable asset reached EOF under this admission contract.
            if not (summary_complete or persisted_traversal):
                continue
            traversal_complete += 1
            if not summary_complete:
                partially_admitted += 1
            already_proof_complete = bool(
                summary_complete
                and step.get("complete") is True
                and step.get("parserVersion") == PARSER_VERSION
                and step.get("processingSignature") == processing_signature
                and {"significant-wave-height", "dominant-wave-period"}
                    <= set(step.get("recognizedParameters") or [])
                and wave_source_asset_matches_official(
                    step.get("sourceAsset"), expected,
                )
                and step.get("waveTargetProof") == summary
            )
            if summary_complete and not already_proof_complete:
                reconstructed += 1
            recognized_parameters = sorted({
                *(step.get("recognizedParameters") or []),
                *REQUIRED_TARGETS["wave"],
            })
            reusable_wave[valid_time] = {
                **step,
                "recognizedParameters": recognized_parameters,
                "requiredParameters": sorted(REQUIRED_TARGETS["wave"]),
                "missingRequiredParameters": [],
                "zonesTouched": summary["acceptedCount"],
                "acceptedNativeZoneCount": summary["acceptedCount"],
                "complete": summary_complete,
                "assetTraversalComplete": True,
                "waveAdmissionPolicy": WAVE_ASSET_ADMISSION_POLICY,
                "rawContentSha256": summary.get("rawContentSha256"),
                "parserVersion": PARSER_VERSION,
                "processingSignature": processing_signature,
                "sourceAsset": expected,
                "waveTargetProof": summary,
                **(
                    {"reconstructedFromNativeCache": True}
                    if summary_complete and not already_proof_complete else {}
                ),
            }
        if wave_resume_metrics is not None:
            wave_resume_metrics.update({
                "assetsEvaluated": evaluated,
                "traversalCompleteAssets": traversal_complete,
                "partiallyAdmittedAssets": partially_admitted,
                "proofCompleteAssets": sum(
                    step.get("complete") is True
                    for step in reusable_wave.values()
                ),
                "reconstructedProofCompleteAssets": reconstructed,
                "rejectedByCode": dict(sorted(rejected_by_code.items())),
            })
        return reusable_wave
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
        or not isinstance(actual_pair_source_keys, set)
        or not isinstance(covered_pair_keys, set)
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
            outcome = validate_current_part_outcome_proof(
                step.get("currentPartOutcomeProof"),
                current_target_ids,
                current_target_registry_sha256,
                processing_signature,
                source,
            )
        except ValueError:
            continue
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        positive_part_ids = set(current_target_ids) - set(
            outcome["spatialUnavailablePartIds"]
        )
        if any(
            (
                (part_id, valid_time, source_key) not in actual_pair_source_keys
                and (part_id, valid_time) not in covered_pair_keys
            )
            for part_id in positive_part_ids
        ):
            # A processed-step proof cannot suppress a retry when the actual
            # cache is missing an outcome-positive pair.
            continue
        reusable[valid_time] = step
    _ = strict_current_anchor_available
    return reusable


def current_pair_evidence_from_retained_proofs(
    proofs: list[dict[str, Any]],
    selected_model_runs: dict[str, str | None] | None = None,
    selected_official_assets: dict[
        str, dict[str, dict[str, Any]]
    ] | None = None,
) -> tuple[set[tuple[str, str, str]], set[tuple[str, str]]]:
    """Return exact actual cache identities, excluding future-run evidence."""
    pair_sources: set[tuple[str, str, str]] = set()
    pairs: set[tuple[str, str]] = set()
    for proof in proofs:
        source = canonical_current_source_asset(proof.get("sourceAsset"))
        if source is None:
            continue
        selected_run = canonical_time(
            (selected_model_runs or {}).get(source["collection"])
        )
        if selected_run is not None and epoch(source["modelRun"]) > epoch(selected_run):
            continue
        if (
            selected_run is not None
            and epoch(source["modelRun"]) == epoch(selected_run)
            and not current_source_matches_official_asset(
                source,
                ((selected_official_assets or {}).get(
                    source["collection"],
                ) or {}).get(source["validTime"]),
            )
        ):
            # A same-run STAC revision is not the selected official asset any
            # more. Its numeric row may remain physically cached, but cannot
            # be trusted as a winner or suppress an exact provider residual.
            continue
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        for part_id in proof.get("attestedPartIds") or []:
            identity = (str(part_id), source["validTime"])
            pair_sources.add((*identity, source_key))
            pairs.add(identity)
    return pair_sources, pairs


def regional_lf_missing_pair_keys(
    regional_part_ids: list[str],
    required_valid_times: set[str],
    covered_pair_keys: set[tuple[str, str]],
) -> set[tuple[str, str]]:
    """Return only real, globally uncovered pairs in the approved LF scope."""
    part_ids = sorted({
        str(part_id or "").strip()
        for part_id in regional_part_ids
        if str(part_id or "").strip()
    })
    valid_times = sorted({
        value for raw in required_valid_times
        for value in [canonical_time(raw)]
        if value is not None
    }, key=epoch)
    return {
        (part_id, valid_time)
        for part_id in part_ids
        for valid_time in valid_times
        if (part_id, valid_time) not in covered_pair_keys
    }


def regional_asset_observation(
    shadow: dict[str, Any], *, source_asset: dict[str, Any],
    processing_signature: str, target_registry_sha256: str,
    policy: dict[str, Any], regional_part_ids: list[str],
) -> dict[str, str] | None:
    """Fingerprint exact regional inputs, solely for bounded work scheduling.

    This never proves regional availability or native pair admission. A receipt
    is installed only after successful EOF/capture; any changed leaf, binding,
    target, policy or decoder reopens the work. No raw samples leave the hash.
    """
    try:
        source = canonical_current_source_asset(source_asset)
        if source is None or source["collection"] != REGIONAL_PROXY_REQUIRED_COLLECTION:
            return None
        source_sha = current_source_asset_sha256(source)
        index = shadow.get("regionalSourceProofs")
        anchors = shadow.get("anchors") or {}
        bindings = index.get("bindings") if isinstance(index, dict) else None
        sources = index.get("sources") if isinstance(index, dict) else None
        leaves = []
        for part_id in sorted(set(regional_part_ids)):
            anchor = anchors.get(f"REGIONAL_PROXY::{part_id}")
            if not isinstance(anchor, dict):
                leaves.append([part_id, anchor])
                continue
            samples = [row for row in anchor.get("samples") or []
                       if isinstance(row, dict) and (
                           row.get("sourceAssetSha256") == source_sha
                           or (row.get("collection") == source["collection"]
                               and row.get("modelRun") == source["modelRun"]
                               and row.get("validTime") == source["validTime"]))]
            refs = {row.get("regionalSourceProofRef") for row in samples
                    if isinstance(row.get("regionalSourceProofRef"), str)}
            leaf_bindings = {key: bindings.get(key) for key in sorted(refs)} if isinstance(bindings, dict) else bindings
            proof_keys = {row.get("sourceProofSha256") for row in (leaf_bindings or {}).values()
                          if isinstance(row, dict) and isinstance(row.get("sourceProofSha256"), str)} if isinstance(leaf_bindings, dict) else set()
            leaves.append({
                "partId": part_id,
                "anchor": {key: value for key, value in anchor.items() if key != "samples"},
                "samples": samples,
                "bindings": leaf_bindings,
                "sourceProofs": {key: sources.get(key) for key in sorted(proof_keys)} if isinstance(sources, dict) else sources,
            })
        def digest(value: Any) -> str:
            return "sha256:" + hashlib.sha256(json.dumps(
                value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                allow_nan=False,
            ).encode("utf-8")).hexdigest()
        return {
            "contractId": "dmi-regional-scheduler-observation-v1",
            "sourceAssetSha256": source_sha,
            "processingSignature": processing_signature,
            "targetRegistrySha256": target_registry_sha256,
            "policySha256": digest(policy),
            "regionalInputSha256": digest({
                "shadowHeader": {key: shadow.get(key) for key in (
                    "schemaVersion", "retentionHours", "scoreImpact", "publicRuntime")},
                "proofIndexHeader": {key: index.get(key) for key in (
                    "schemaVersion", "contractId")}
                    if isinstance(index, dict) else index,
                "leaves": leaves,
            }),
        }
    except (TypeError, ValueError, KeyError, OverflowError, AttributeError):
        return None


def reusable_regional_asset_observation(
    step: Any, shadow: dict[str, Any], *, processing_signature: str,
    target_registry_sha256: str, policy: dict[str, Any],
    regional_part_ids: list[str],
) -> bool:
    """Caller must separately prove this native processed step reusable."""
    if not isinstance(step, dict) or not isinstance(step.get("regionalObservation"), dict):
        return False
    observed = regional_asset_observation(
        shadow, source_asset=step.get("sourceAsset"),
        processing_signature=processing_signature,
        target_registry_sha256=target_registry_sha256, policy=policy,
        regional_part_ids=regional_part_ids,
    )
    return observed is not None and observed == step["regionalObservation"]


def regional_lf_is_native_source_time(model_run: Any, valid_time: Any) -> bool:
    """Regional LF evidence exists only on the run-relative native phase."""
    canonical_run = canonical_time(model_run)
    canonical_valid_time = canonical_time(valid_time)
    if canonical_run is None or canonical_valid_time is None:
        return False
    lead_seconds = epoch(canonical_valid_time) - epoch(canonical_run)
    return bool(
        0 <= lead_seconds <= DKSS_MAX_FORECAST_LEAD_HOURS * 3600
        and lead_seconds % (REGIONAL_PROXY_NATIVE_CADENCE_HOURS * 3600) == 0
    )


def regional_lf_asset_gap_pairs(
    asset: dict[str, Any],
    model_run: str,
    missing_pair_keys: set[tuple[str, str]],
    production_reference: datetime,
) -> set[tuple[str, str]]:
    """Map one native LF source time to the real holes it can causally fill."""
    valid_time = canonical_time(asset.get("valid"))
    canonical_run = canonical_time(model_run)
    if not regional_lf_is_native_source_time(canonical_run, valid_time):
        return set()
    try:
        source_at = production_reference_hour(valid_time)
        reference_at = production_reference_hour(production_reference)
    except (TypeError, ValueError):
        return set()
    if not (
        reference_at - timedelta(hours=REGIONAL_PROXY_MAX_HOLD_HOURS)
        <= source_at
        <= reference_at + timedelta(
            hours=REGIONAL_PROXY_OPERATIONAL_FORECAST_LEAD_MAX_HOURS
        )
    ):
        return set()
    return {
        (part_id, target_time)
        for part_id, target_time in missing_pair_keys
        if 0 <= epoch(target_time) - source_at.timestamp()
        <= REGIONAL_PROXY_MAX_HOLD_HOURS * 3600
    }


def regional_lf_asset_gap_pairs_by_time(
    assets: list[dict[str, Any]],
    model_run: str,
    regional_part_ids: list[str],
    required_valid_times: set[str],
    covered_pair_keys: set[tuple[str, str]],
    production_reference: datetime,
) -> dict[str, set[tuple[str, str]]]:
    """Build deterministic per-asset regional potential from actual gaps only."""
    missing = regional_lf_missing_pair_keys(
        regional_part_ids,
        required_valid_times,
        covered_pair_keys,
    )
    return {
        valid_time: pairs
        for asset in assets
        for valid_time in [canonical_time(asset.get("valid"))]
        if valid_time is not None
        for pairs in [regional_lf_asset_gap_pairs(
            asset,
            model_run,
            missing,
            production_reference,
        )]
        if pairs
    }


def prioritize_marine_assets_for_current_gaps(
    assets: list[dict[str, Any]],
    target_ids: list[str],
    covered_pair_keys: set[tuple[str, str]],
    *,
    critical_by_time: dict[str, bool] | None = None,
    direct_valid_times: set[str] | None = None,
    regional_gap_pairs_by_time: dict[
        str, set[tuple[str, str]]
    ] | None = None,
    verified_reusable_valid_times: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Process internal holes/tail before refresh-only assets, deterministically."""
    def priority(asset: dict[str, Any]) -> tuple[int, int, int, int, float, str, str]:
        valid_time = str(canonical_time(asset.get("valid")) or "")
        direct_missing_pairs = (
            {
                (part_id, valid_time)
                for part_id in target_ids
                if (part_id, valid_time) not in covered_pair_keys
            }
            if direct_valid_times is None or valid_time in direct_valid_times
            else set()
        )
        regional_gap_pairs = set(
            (regional_gap_pairs_by_time or {}).get(valid_time) or set()
        )
        regional_gap_count = len(regional_gap_pairs)
        real_gap_count = len(direct_missing_pairs | regional_gap_pairs)
        critical = bool(
            direct_missing_pairs
            or regional_gap_count
            or (critical_by_time or {}).get(valid_time)
        )
        return (
            0 if critical else 1,
            0 if regional_gap_count
                and valid_time in (verified_reusable_valid_times or set())
                else 1,
            -real_gap_count,
            -regional_gap_count,
            epoch(valid_time),
            str(asset.get("id") or ""),
            str(asset.get("assetIdentitySha256") or ""),
        )

    return sorted(assets, key=priority)


DKSS_PRIMARY_ALWAYS_REQUIRED_COMPONENTS = {
    "waterLevel": ("sea-mean-deviation",),
    "current": ("current-u", "current-v"),
}
DKSS_PRIMARY_STRIDE_REQUIRED_COMPONENTS = {
    "waterTemperature": ("water-temperature",),
    "windTail": ("wind-tail-u-10m", "wind-tail-v-10m"),
}


def _exact_validated_dmi_component_present(
    zone_id: str,
    zone: Any,
    valid_time: str,
    component: str,
    fields: tuple[str, ...],
) -> bool:
    """Require finite fields and their exact native DMI provenance on one row."""
    if not isinstance(zone, dict):
        return False
    hour = (zone.get("hourly") or {}).get(valid_time)
    if not isinstance(hour, dict):
        return False
    if not all(
        isinstance(hour.get(field), (int, float))
        and not isinstance(hour.get(field), bool)
        and math.isfinite(float(hour[field]))
        for field in fields
    ):
        return False
    sources = hour.get("sources") or {}
    return complete_native_source_for_hour(
        sources.get(component),
        component,
        zone_id,
        zone,
        valid_time,
    )


def classify_dkss_primary_asset(
    *,
    collection: str,
    model_run: str,
    asset: dict[str, Any],
    target_ids: list[str],
    covered_pair_keys: set[tuple[str, str]],
    cached_zones: dict[str, Any],
    active_zone_ids: list[str],
    enabled: bool,
    planning_covered_pair_keys: set[tuple[str, str]] | None = None,
    required_valid_times: set[str] | None = None,
    regional_current_gap_count: int = 0,
) -> dict[str, Any]:
    """Classify one DKSS asset as critical work or safe refresh-only work.

    The cache passed here has already been normalized by ``clean_and_summarize``.
    An optional union plan classifies acquisition priority only; it never
    authorizes a native DMI tuple. Without it, PART current keeps the existing
    DMI proof requirement. Parent current is optional overview weather, not an
    integrated-score input; its absence must not make an asset critical. Other
    components still require finite values and native DMI provenance. Optional
    temperature/wind-tail fields remain stride-bound.
    """
    if not enabled or collection not in MARINE_COLLECTIONS:
        return {
            "critical": True,
            "deferValidRefresh": False,
            "currentMissingPairCount": 0,
            "regionalCurrentPotentialPairCount": 0,
            "missingComponentKinds": [],
        }

    valid_time = canonical_time(asset.get("valid"))
    canonical_run = canonical_time(model_run)
    normalized_targets = sorted({str(value or "").strip() for value in target_ids if str(value or "").strip()})
    normalized_zones = sorted({str(value or "").strip() for value in active_zone_ids if str(value or "").strip()})
    missing_components: set[str] = set()
    valid_regional_gap_count = (
        regional_current_gap_count
        if type(regional_current_gap_count) is int
        and regional_current_gap_count >= 0
        else 0
    )
    if valid_regional_gap_count != regional_current_gap_count:
        missing_components.add("configuration")
    part_zone_ids = {f"PART::{part_id}" for part_id in normalized_targets}
    parent_current_zone_ids = [
        zone_id for zone_id in normalized_zones
        if zone_id not in part_zone_ids
    ]
    parent_current_missing_count = 0
    if not valid_time or not canonical_run or not normalized_targets or not normalized_zones:
        missing_components.add("configuration")
        current_missing_pair_count = len(normalized_targets)
    elif required_valid_times is not None and valid_time not in required_valid_times:
        # A T-3..T-1 LF source is supplemental input for the approved regional
        # hold only. It must not invent a native current/component deficit
        # outside the immutable T..T+117 operational denominator.
        current_missing_pair_count = 0
    else:
        current_missing_pair_count = sum(
            (target_id, valid_time) not in (
                planning_covered_pair_keys
                if planning_covered_pair_keys is not None
                else covered_pair_keys
            )
            for target_id in normalized_targets
        )
        required_components = dict(DKSS_PRIMARY_ALWAYS_REQUIRED_COMPONENTS)
        if stride_selected(valid_time, canonical_run):
            required_components.update(DKSS_PRIMARY_STRIDE_REQUIRED_COMPONENTS)
        for component, fields in required_components.items():
            if component == "current":
                # The source-union plan proves usable PART coverage for
                # acquisition priority only. Without that plan, require the
                # exact native PART rows, never optional parent overview U/V.
                component_zone_ids = (
                    [] if planning_covered_pair_keys is not None
                    else sorted(part_zone_ids)
                )
            else:
                component_zone_ids = normalized_zones
            if any(
                not _exact_validated_dmi_component_present(
                    zone_id,
                    cached_zones.get(zone_id),
                    valid_time,
                    component,
                    fields,
                )
                for zone_id in component_zone_ids
            ):
                missing_components.add(component)
        parent_current_missing_count = sum(
            not _exact_validated_dmi_component_present(
                zone_id, cached_zones.get(zone_id), valid_time,
                "current", ("current-u", "current-v"),
            )
            for zone_id in parent_current_zone_ids
        )
        if current_missing_pair_count:
            missing_components.add("current")
    if valid_regional_gap_count:
        missing_components.add("regionalCurrent")

    critical = bool(missing_components)
    result = {
        "critical": critical,
        "deferValidRefresh": not critical,
        "currentMissingPairCount": current_missing_pair_count,
        "regionalCurrentPotentialPairCount": valid_regional_gap_count,
        "missingComponentKinds": sorted(missing_components),
    }
    if planning_covered_pair_keys is not None or parent_current_zone_ids:
        result["optionalParentCurrentCount"] = len(parent_current_zone_ids)
        result["optionalParentCurrentMissingCount"] = parent_current_missing_count
    return result


def load_current_acquisition_planning_pairs(
    targets: list[dict[str, Any]],
    reference: datetime,
) -> tuple[set[tuple[str, str]] | None, dict[str, Any]]:
    """Read advisory union coverage without changing DMI admission authority."""
    path = str(os.getenv("DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH", "")).strip()
    diagnostics: dict[str, Any] = {
        "present": bool(path),
        "valid": False,
        "scope": "dmi-only",
    }
    if not path:
        return None, diagnostics
    try:
        pairs = read_current_acquisition_plan(
            path,
            production_reference_at=canonical_time(reference),
            targets=targets,
        )
    except (OSError, TypeError, ValueError, KeyError):
        diagnostics["failureCode"] = "ACQUISITION_PLAN_UNUSABLE"
        progress(
            "global current acquisition plan unavailable or invalid; "
            "conservative DMI-only acquisition priority retained"
        )
        return None, diagnostics
    diagnostics.update({
        "valid": True,
        "scope": "validated-source-union-planning-only",
        "coveredPairCount": len(pairs),
    })
    return pairs, diagnostics


def dkss_collection_deferred_only(run_info: dict[str, Any], asset_count: int) -> bool:
    """True only when every selected asset was a validated refresh-only asset."""
    return bool(
        asset_count > 0
        and int(run_info.get("assetsDeferredValidRefresh") or 0) == asset_count
        and int(run_info.get("assetsProcessed") or 0) == 0
        and int(run_info.get("assetsReused") or 0) == 0
        and int(run_info.get("assetsSkippedBySupervisor") or 0) == 0
        and int(run_info.get("assetsSkippedPreviouslyProcessed") or 0) == 0
    )


def order_dkss_primary_refresh_collections(
    scheduled: list[str],
    refresh_only_collections: set[str],
) -> list[str]:
    """Keep every potentially critical collection ahead of maintenance-only DKSS."""
    return [
        *[
            collection for collection in scheduled
            if collection not in refresh_only_collections
        ],
        *[
            collection for collection in scheduled
            if collection in refresh_only_collections
        ],
    ]


def refine_operational_collection_plan_after_prefetch(
    scheduled: list[str],
    coverage: dict[str, Any],
    refresh_only_collections: set[str],
    remaining_work_seconds: float,
) -> tuple[list[str], dict[str, Any]]:
    """Remove proven maintenance-only DKSS work from critical reservations.

    The first plan is necessarily conservative because it is made before the
    official asset inventories are prefetched. Once exact cache/asset identity
    has proved a collection refresh-only, preserving runtime for it would let
    quality maintenance delay a real hole in another DKSS or WAM family.
    """
    refined = dict(coverage)
    strict_current = [
        collection
        for collection in coverage.get("strictCurrentCollections", [])
        if collection in scheduled
        and collection not in refresh_only_collections
    ]
    critical_wam = [
        collection
        for collection in coverage.get("criticalWamCollections", [])
        if collection in scheduled
    ]
    lead = strict_current[0] if strict_current else None
    prioritized = [
        *([lead] if lead else []),
        *critical_wam,
        *strict_current[1:],
    ]
    planned = [
        *prioritized,
        *[
            collection for collection in scheduled
            if collection not in prioritized
            and collection not in refresh_only_collections
        ],
        *[
            collection for collection in scheduled
            if collection in refresh_only_collections
        ],
    ]
    current_reserve, current_total = strict_current_runtime_reserve(
        strict_current,
        remaining_work_seconds,
    )
    wam_reserve, wam_total = wam_runtime_reserve(
        critical_wam,
        remaining_work_seconds,
        lead_reserve_seconds=current_total,
    )
    refined.update({
        "strictCurrentLeadCollection": lead,
        "strictCurrentCollections": strict_current,
        "strictCurrentRuntimeReserveSeconds": round(current_total, 3),
        "strictCurrentRuntimeReserveSecondsByCollection": {
            collection: round(seconds, 3)
            for collection, seconds in current_reserve.items()
        },
        "strictCurrentLeadRuntimeReserveSeconds": (
            round(current_reserve.get(lead, 0.0), 3) if lead else 0.0
        ),
        "criticalWamRuntimeReserveSeconds": round(wam_total, 3),
        "criticalWamRuntimeReserveSecondsByCollection": {
            collection: round(seconds, 3)
            for collection, seconds in wam_reserve.items()
        },
    })
    return planned, refined


def should_attempt_dkss_primary_refresh(
    *,
    valid_time: str,
    previously_processed: set[str],
    collection_refresh_only: bool,
    critical_work_observed: bool,
    remaining_asset_budget: int,
) -> bool:
    """Admit only new-run/revised maintenance after all critical work is clear."""
    return bool(
        collection_refresh_only
        and not critical_work_observed
        and remaining_asset_budget > 0
        and valid_time not in previously_processed
    )


def dkss_bounded_refresh_failed_only(
    run_info: dict[str, Any],
    *,
    collection_refresh_only: bool,
) -> bool:
    """Detect maintenance-only failure so the prior validated run is retained."""
    return bool(
        collection_refresh_only
        and int(run_info.get("assetsBoundedRefreshAttempted") or 0) > 0
        and int(run_info.get("assetsBoundedRefreshCompleted") or 0) == 0
    )


def should_skip_previously_processed_asset(
    valid_time: str,
    previously_processed: set[str],
    primary_requirement: dict[str, Any] | None,
    *, regional_observation_reusable: bool = False,
) -> bool:
    """Keep exact terminal DKSS outcomes closed while reopening other holes.

    ``reusable_processed_steps`` admits a DKSS step only after every
    outcome-positive current pair is present in validated cache evidence. A
    current-only deficit seen by primary mode is therefore the step's validated
    ``spatialUnavailable`` partition and must not reopen the same asset. Missing
    water level, temperature or wind tail remains independently actionable.
    Parent current is optional and may be spatially unavailable permanently;
    it is sampled when an asset is otherwise processed or refreshed, not a
    reason to reopen the same asset. A PART outcome never proves parent U/V.
    """
    if valid_time not in previously_processed:
        return False
    if not isinstance(primary_requirement, dict):
        return True
    missing_components = set(
        primary_requirement.get("missingComponentKinds") or []
    )
    actionable_non_current = missing_components - {"current"}
    if regional_observation_reusable:
        actionable_non_current.discard("regionalCurrent")
    return not (
        primary_requirement.get("critical") is True
        and bool(actionable_non_current)
    )


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
    retain_preferred_native_run: bool = False,
    include_operational_wave_fallback_phases: bool = False,
) -> tuple[str | None, list[dict[str, Any]], dict[str, Any]]:
    required = {
        iso(value) for value in (required_valid_times or set())
        if iso(value)
    }
    explicit_minimum = iso(minimum_valid_time)
    inventory_start_candidates = [
        value for value in (
            min(required, key=epoch) if required else None,
            explicit_minimum,
        )
        if value is not None
    ]
    inventory_start = (
        min(inventory_start_candidates, key=epoch)
        if inventory_start_candidates
        else datetime.fromtimestamp(time.time() - 3600, timezone.utc)
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
    observation_end = inventory_end
    if allow_documented_required_gaps and collection in MARINE_COLLECTIONS:
        # Selection requires the exact +120 h terminal of a causal model run.
        # For a newly published run this lies AFTER target+117. Observe it
        # without extending the producer queue or the operational denominator.
        causal_run_ceiling = (
            min(required, key=epoch) if required else explicit_minimum
        )
        if causal_run_ceiling is not None:
            observation_end = canonical_time(datetime.fromtimestamp(max(
                epoch(inventory_end),
                epoch(causal_run_ceiling) + DKSS_MAX_FORECAST_LEAD_HOURS * 3600,
            ), timezone.utc))
    items, inventory_stats = _bounded_stac_inventory(
        collection,
        inventory_start,
        observation_end,
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
    wam_target_window = bool(
        collection in WAVE_BOOTSTRAP_COLLECTIONS
        and required_horizon_end
    )
    target_window_axis_resolvable_runs = {
        candidate_run: rows
        for candidate_run, rows in selection_runs.items()
        if wam_target_window
        and wam_asset_times_resolve_target_window(
            rows,
            inventory_start,
            required_horizon_end,
            required,
        )
    }
    target_window_selection_pool = (
        target_window_axis_resolvable_runs
        if target_window_axis_resolvable_runs
        else selection_runs
    )
    if wam_target_window:
        # DEC-0118 requires the newest eligible WAM generation. Existing rows
        # remain reusable in the cache, but the prior reference is never a run
        # pin. Prefer a run whose own native time axis safely resolves every
        # target hour; otherwise let the newest exact/end-covered run make
        # progressive residual-first repairs without claiming completeness.
        newest_wam_candidate = max(target_window_selection_pool, key=epoch)
        target_window_selection_pool = {
            newest_wam_candidate: target_window_selection_pool[
                newest_wam_candidate
            ]
        }
    stats["targetWindowAxisResolvableRunCount"] = (
        len(target_window_axis_resolvable_runs) if wam_target_window else None
    )
    stats["targetWindowAxisResolvablePoolUsed"] = bool(
        wam_target_window and target_window_axis_resolvable_runs
    )
    stats["targetWindowProgressiveFallbackUsed"] = bool(
        wam_target_window and not target_window_axis_resolvable_runs
    )
    stats["targetWindowSelectionPolicy"] = (
        "newest-axis-resolvable-else-newest-exact-end-covered"
        if wam_target_window else None
    )
    stats["targetWindowInterpolationLimitHours"] = (
        WAVE_MAX_INTERPOLATION_HOURS
        if collection in WAVE_BOOTSTRAP_COLLECTIONS
        and required_horizon_end else None
    )
    run, run_selection = select_forecast_run(
        target_window_selection_pool,
        (
            None if wam_target_window else
            preferred_run if preferred_run in selection_runs
            and (
                retain_preferred_native_run
                or not (
                    allow_documented_required_gaps
                    and collection in MARINE_COLLECTIONS
                )
            ) else None
        ),
        retention_horizon_hours=retention_horizon_hours,
        retain_preferred_run=retain_preferred_native_run,
    )
    selected_target_window_axis_resolvable = bool(
        wam_target_window and run in target_window_axis_resolvable_runs
    )
    stats["selectedTargetWindowAxisResolvable"] = (
        selected_target_window_axis_resolvable
        if wam_target_window else None
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
            not wam_target_window
            or selected_target_window_axis_resolvable
        )
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
    # Schedule/publication lag is maintenance telemetry only. A complete
    # official run with usable future valid times must not become unavailable
    # merely because a newer generation is incomplete or the catalog arrived
    # later than its observed cadence. Horizon and exact STAC identity remain
    # enforced below for every selected asset.
    preferred_native_run_pinned = bool(
        run_selection.get("preferredProgressiveRunPinned") is True
        and run == preferred_run
        and selected_native_run_complete
    )
    selected_within_observed_schedule = (
        run == latest_run
        or cadence_hours is not None and selected_run_lag_hours <= cadence_hours + 1e-6
        or preferred_native_run_pinned
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
        "preferredNativeRunPinned": preferred_native_run_pinned,
        "scheduleFreshnessWarning": bool(
            not selected_within_observed_schedule
            or catalog_schedule_fresh is False
        ),
        "scheduleFreshnessWarningCodes": [
            code
            for code, active in (
                ("SELECTED_RUN_BEHIND_OBSERVED_SCHEDULE", not selected_within_observed_schedule),
                ("CATALOG_PUBLICATION_LAG", catalog_schedule_fresh is False),
            )
            if active
        ],
        "rejectedStaleRun": False,
    })
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
        identity = (
            official_wave_asset_identity(collection, run, row)
            if collection in WAVE_BOOTSTRAP_COLLECTIONS
            else official_current_asset_identity(collection, run, row)
        )
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
    if collection in MARINE_COLLECTIONS and selected_native_run_complete:
        terminal_time = canonical_time(datetime.fromtimestamp(
            epoch(run) + DKSS_MAX_FORECAST_LEAD_HOURS * 3600, timezone.utc,
        ))
        terminal_row = next(
            row for row in runs[run] if iso(row.get("valid")) == terminal_time
        )
        stats["nativeTerminalAsset"] = official_current_asset_identity(
            collection, run, terminal_row,
        )
    stats["officialRequiredGapCount"] = max(0, len(required) - len(selected_official_required))
    stats["officialNativeCadenceHours"] = 1 if collection in MARINE_COLLECTIONS else None
    def selected_rows_for_run(
        candidate_run: str,
        *,
        phase_rank: int,
    ) -> list[dict[str, Any]]:
        unique: dict[str, dict[str, Any]] = {}
        for row in sorted(
            runs[candidate_run],
            key=lambda value: (
                epoch(value["valid"]),
                str(value["id"]),
                str(value.get("assetIdentitySha256") or ""),
            ),
        ):
            if (
                allow_documented_required_gaps
                and collection in MARINE_COLLECTIONS
                and epoch(row["valid"]) > epoch(inventory_end)
            ):
                # Extra catalog observation proves publication only. It must
                # not become another download or an invented public hour.
                continue
            if epoch(row["valid"]) < minimum_valid_epoch:
                if phase_rank == 0:
                    stats["expiredForecastStepsSkipped"] = int(
                        stats.get("expiredForecastStepsSkipped") or 0
                    ) + 1
                continue
            if row["valid"] not in required and not stride_selected(
                row["valid"], candidate_run,
            ):
                continue
            if row["valid"] in unique:
                if phase_rank == 0:
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
                "modelRun": candidate_run,
                "operationalWavePhaseRank": phase_rank,
                "observedRunCadenceHours": cadence_hours,
                "latestRun": latest_run,
                "catalogScheduleFresh": (
                    catalog_schedule_fresh
                    if cadence_hours is not None
                    and publication_lag_hours is not None
                    else None
                ),
            }
        return sorted(
            unique.values(),
            key=lambda row: (
                0 if row["valid"] in required else 1,
                epoch(row["valid"]),
            ),
        )

    minimum_valid_epoch = (
        epoch(minimum_valid_time)
        if minimum_valid_time is not None
        else time.time() - 3600
    )
    primary_rows = selected_rows_for_run(run, phase_rank=0)
    selected_rows = primary_rows[:MAX_ASSETS_PER_COLLECTION]
    selected_required = sum(row["valid"] in required for row in selected_rows)
    stats["requiredRowsTruncatedByAssetLimit"] = max(
        0,
        len(selected_official_required) - selected_required,
    )
    fallback_candidates = (
        sorted(
            (
                candidate_run
                for candidate_run in target_window_axis_resolvable_runs
                if epoch(candidate_run) < epoch(run)
            ),
            key=epoch,
            reverse=True,
        )[:MAX_OPERATIONAL_WAM_FALLBACK_RUNS]
        if include_operational_wave_fallback_phases and wam_target_window
        else []
    )
    fallback_phase_counts: list[int] = []
    fallback_omitted_by_limit = 0
    for phase_rank, fallback_run in enumerate(fallback_candidates, start=1):
        fallback_rows = selected_rows_for_run(
            fallback_run,
            phase_rank=phase_rank,
        )
        remaining_capacity = MAX_ASSETS_PER_COLLECTION - len(selected_rows)
        if len(fallback_rows) > remaining_capacity:
            # A partial run phase could never prove that the older run was fully
            # attempted. Keep the primary plan intact and omit this fallback
            # phase instead of silently truncating it.
            fallback_omitted_by_limit += 1
            continue
        selected_rows.extend(fallback_rows)
        fallback_phase_counts.append(len(fallback_rows))
    if wam_target_window:
        stats.update({
            "operationalWaveRunPhaseCount": 1 + len(fallback_phase_counts),
            "operationalWaveFallbackCandidateRunCount": len(
                fallback_candidates
            ),
            "operationalWaveFallbackPhaseAssetCounts": fallback_phase_counts,
            "operationalWaveFallbackPhasesOmittedByAssetLimit": (
                fallback_omitted_by_limit
            ),
            "operationalWaveFallbackPolicy": (
                "next-older-causal-axis-resolvable-after-terminal-primary"
                if include_operational_wave_fallback_phases
                else None
            ),
        })
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
        else previous.get("acquiredAt") if same_capture_identity and iso(previous.get("acquiredAt"))
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


def next_verified_reusable_regional_time(
    assets: list[dict[str, Any]],
    collection: str,
    model_run: str,
    regional_gap_pairs_by_time: dict[str, set[tuple[str, str]]],
) -> set[str]:
    """Verify at most one likely cached regional asset for the next turn.

    Full content hashing is deliberately bounded here: an LF lead runs before
    critical WAM, so scanning every large cached GRIB merely to sort the queue
    could consume the service reserve. The selected file is still revalidated
    by ``download_asset`` immediately before processing.
    """
    likely_cached = sorted(
        (
            asset for asset in assets
            if regional_gap_pairs_by_time.get(
                str(canonical_time(asset.get("valid")) or "")
            )
            and cached_asset_path(str(asset.get("href") or "")).is_file()
        ),
        key=lambda asset: (
            -len(regional_gap_pairs_by_time.get(
                str(canonical_time(asset.get("valid")) or ""),
                set(),
            )),
            epoch(asset.get("valid")),
            str(asset.get("id") or ""),
        ),
    )
    if not likely_cached:
        return set()
    candidate = likely_cached[0]
    valid_time = canonical_time(candidate.get("valid"))
    return (
        {valid_time}
        if valid_time is not None
        and reusable_cached_asset_path(candidate, collection, model_run)
            is not None
        else set()
    )


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


def progress_checkpoint_due(
    completed_assets_since_write: int,
    last_write_monotonic: float,
    *,
    force: bool = False,
    now_monotonic: float | None = None,
) -> bool:
    if completed_assets_since_write <= 0:
        return False
    now_value = time.monotonic() if now_monotonic is None else now_monotonic
    return bool(
        force
        or completed_assets_since_write >= CHECKPOINT_MAX_ASSETS
        or now_value - last_write_monotonic >= CHECKPOINT_MAX_SECONDS
    )


def progress(message: str) -> None:
    elapsed = time.monotonic() - STARTED
    print(f"[DMI bulk +{elapsed:6.1f}s] {message}", flush=True)

class AssetStagedZone(dict):
    """Copy-on-write view of one zone while a single GRIB asset is parsed.

    Most assets only replace one native valid-time row. Copying the complete
    673 x 118 cache for every asset would be prohibitively expensive, while a
    plain shallow copy could leak mutations into the durable cache. Keep the
    hourly mapping shallow, own the active row and the small point metadata,
    and detach every row only if a marine-owner change needs cross-time
    deletion.
    """

    def __init__(self, source: dict[str, Any], valid_time: str) -> None:
        super().__init__(source)
        hourly = dict(source.get("hourly") or {})
        if valid_time in hourly:
            hourly[valid_time] = copy.deepcopy(hourly[valid_time])
        self["hourly"] = hourly
        for key in ("gridPoints", "collections", "marineSelection"):
            value = source.get(key)
            self[key] = copy.deepcopy(value) if isinstance(value, dict) else {}
        self._all_hourly_rows_owned = False

    def detach_all_hourly_rows(self) -> None:
        if self._all_hourly_rows_owned:
            return
        self["hourly"] = {
            valid_time: copy.deepcopy(hour)
            for valid_time, hour in (self.get("hourly") or {}).items()
        }
        self._all_hourly_rows_owned = True

    def committed_copy(self) -> dict[str, Any]:
        return dict(self)



GRID_DEFINITION_KEYS = (
    "gridType", "Ni", "Nj", "numberOfPoints",
    "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
    "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
    "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees",
)

# GRIB2 template 3.30 is a projected metre grid, not an angular lat/lon grid.
# The legacy public digest stays stable; md5GridSection binds the full internal
# projection/scan-order identity. Only these known non-applicable keys are null.
LAMBERT_ABSENT_ANGULAR_KEYS = frozenset(GRID_DEFINITION_KEYS[-4:])


def grid_cache_signature(gid: int) -> tuple[Any, ...]:
    """Read one order-sensitive cache identity without changing public hashes."""
    keys = (
        "md5GridSection",
        *GRID_DEFINITION_KEYS,
    )
    values: list[Any] = []
    for key in keys:
        if len(values) >= 2 and values[1] == "lambert" and key in LAMBERT_ABSENT_ANGULAR_KEYS:
            values.append(None)
            continue
        try:
            values.append(codes_get(gid, key))
        except Exception as exc:
            raise DmiGridLookupError(
                "DMI grid identity could not be read completely",
                "GRID_IDENTITY_READ_FAILED",
            ) from exc
    return tuple(values)


def grid_definition_signature_from_cache(
    cache_signature: tuple[Any, ...],
) -> tuple[Any, ...]:
    if len(cache_signature) != len(GRID_DEFINITION_KEYS) + 1:
        raise DmiGridLookupError(
            "DMI grid cache identity has an unexpected shape",
            "GRID_IDENTITY_READ_FAILED",
        )
    return tuple(cache_signature[1:])


def grid_signature(gid: int) -> tuple[Any, ...]:
    """Return the legacy public/state grid definition identity unchanged."""
    return grid_definition_signature_from_cache(grid_cache_signature(gid))


def grid_definition_sha256_from_signature(signature: tuple[Any, ...]) -> str:
    canonical = json.dumps(signature, ensure_ascii=False, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def grid_definition_sha256(gid: int) -> str:
    return grid_definition_sha256_from_signature(grid_signature(gid))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def grid_candidate_target(collection: str, zone: dict[str, Any]) -> int:
    if collection in MARINE_COLLECTIONS:
        return (
            LIMFJORD_GRID_CANDIDATE_TARGET
            if zone.get("coastType") == "limfjord"
            else GRID_CANDIDATE_TARGET
        )
    return ATMOSPHERIC_GRID_CANDIDATE_TARGET


def nearest_candidates(
    gid: int,
    collection: str,
    zone: dict[str, Any],
    signature: tuple[Any, ...] | None = None,
    nearest_lookup: Any = None,
) -> list[dict[str, Any]]:
    """Find flere mulige havpunkter uden at antage, at de fire nærmeste er gyldige.

    ecCodes returnerer højst fire punkter pr. opslag på flere grids. Derfor probes
    et lille mønster omkring zonens datapunkt, kandidater deduplikeres på gridindeks,
    og den reelle afstand tilbage til zonen beregnes. Ingen kandidat accepteres alene
    fordi den ligger tæt på et probe-punkt.
    """
    # Atmosfæriske grids (HARMONIE) er komplette land/hav-grids og kræver ikke
    # den dyre marine kyst-probing. Ét nearest-opslag pr. zone/grid er nok og
    # genbruges på tværs af alle forecast-tider via GRID_INDEX_CACHE.
    candidate_target = grid_candidate_target(collection, zone)
    resolved_signature = signature if signature is not None else grid_signature(gid)
    cache_key = (collection, resolved_signature, zone["id"], candidate_target)
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
            if nearest_lookup is not None:
                candidates = nearest_lookup(zone["lat"] + dlat, zone["lon"] + dlon)
            else:
                try:
                    candidates = codes_grib_find_nearest(
                        gid,
                        zone["lat"] + dlat,
                        zone["lon"] + dlon,
                        npoints=4,
                    )
                except TypeError:
                    candidates = codes_grib_find_nearest(
                        gid,
                        zone["lat"] + dlat,
                        zone["lon"] + dlon,
                        False,
                        4,
                    )
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


def warm_marine_grid_cache(
    gid: int,
    collection: str,
    zones: list[dict[str, Any]],
    signature: tuple[Any, ...],
) -> None:
    """Warm the unchanged marine probe union with one ecCodes nearest object."""
    if collection not in MARINE_COLLECTIONS or not zones:
        return
    pending = [
        zone
        for zone in zones
        if (
            collection,
            signature,
            zone["id"],
            grid_candidate_target(collection, zone),
        ) not in GRID_INDEX_CACHE
    ]
    if not pending:
        return
    if not (
        callable(codes_grib_nearest_new)
        and callable(codes_grib_nearest_find)
        and callable(codes_grib_nearest_delete)
        and isinstance(CODES_GRIB_NEAREST_SAME_GRID, int)
    ):
        return

    nearest_id = None
    first_lookup = True
    pending_keys = [
        (collection, signature, zone["id"], grid_candidate_target(collection, zone))
        for zone in pending
    ]
    try:
        nearest_id = codes_grib_nearest_new(gid)

        def lookup(latitude: float, longitude: float) -> Any:
            nonlocal first_lookup
            flags = 0 if first_lookup else CODES_GRIB_NEAREST_SAME_GRID
            candidates = codes_grib_nearest_find(
                nearest_id,
                gid,
                latitude,
                longitude,
                flags,
                False,
                4,
            )
            # A bounded DKSS grid may reject the first probe. SAME_GRID is only
            # safe after one successful lookup has actually initialized the
            # reusable ecCodes geometry on this nearest object.
            first_lookup = False
            return candidates

        for zone in pending:
            nearest_candidates(
                gid,
                collection,
                zone,
                signature=signature,
                nearest_lookup=lookup,
            )
    except Exception:
        for key in pending_keys:
            GRID_INDEX_CACHE.pop(key, None)
        raise
    finally:
        if nearest_id is not None:
            codes_grib_nearest_delete(nearest_id)


def warm_atmospheric_grid_cache(
    gid: int,
    collection: str,
    zones: list[dict[str, Any]],
    signature: tuple[Any, ...] | None = None,
) -> None:
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
    resolved_signature = signature if signature is not None else grid_signature(gid)
    warm_key = (collection, resolved_signature, ATMOSPHERIC_GRID_CANDIDATE_TARGET)
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
        cache_key = (collection, resolved_signature, zone["id"], ATMOSPHERIC_GRID_CANDIDATE_TARGET)
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
    cache_signature = grid_cache_signature(gid)
    definition_sha256 = grid_definition_sha256_from_signature(
        grid_definition_signature_from_cache(cache_signature)
    )
    warm_marine_grid_cache(gid, collection, zones, cache_signature)
    warm_atmospheric_grid_cache(gid, collection, zones, cache_signature)
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(
            gid,
            collection,
            zone,
            signature=cache_signature,
        )
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
    cache_signature = grid_cache_signature(gid)
    definition_sha256 = grid_definition_sha256_from_signature(
        grid_definition_signature_from_cache(cache_signature)
    )
    warm_marine_grid_cache(gid, collection, zones, cache_signature)
    warm_atmospheric_grid_cache(gid, collection, zones, cache_signature)
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(
            gid,
            collection,
            zone,
            signature=cache_signature,
        )
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
                    "_candidateCount": len(candidates),
                }
                break
    return resolved


def relevant_zones(collection: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Marine collections må overlappe. coastType bestemmer prioritet og afstandsgrænse,
    # men må ikke længere blokere en alternativ DMI-model med et bedre gyldigt havpunkt.
    if collection in MARINE_COLLECTIONS:
        return zones
    if collection in WAVE_BOOTSTRAP_COLLECTIONS:
        return [
            zone for zone in zones
            if wave_owner_for_target(zone) == collection
        ]
    return zones


def native_operational_wave_zones(
    collection: str,
    zones: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return the one shared native PART denominator used by every WAM gate.

    Parent rows remain best-effort parser output.  The three approved
    Feggesund proxy PARTs remain outside this native gate and are proved by the
    separate downstream direct/proxy contract.
    """
    if collection not in WAVE_BOOTSTRAP_COLLECTIONS:
        return []
    by_id: dict[str, dict[str, Any]] = {}
    for zone in relevant_zones(collection, zones):
        zone_id = str(zone.get("id") or "").strip()
        if (
            not zone_id
            or zone.get("coastalPart") is not True
            or zone_id in OPERATIONAL_WAVE_PROXY_PARENT_ZONE_IDS
            or str(zone.get("parentZoneId") or "")
                in OPERATIONAL_WAVE_PROXY_PARENT_ZONE_IDS
        ):
            continue
        by_id.setdefault(zone_id, zone)
    return list(by_id.values())


def build_operational_zone_config(
    zones_geo: dict[str, Any],
    coastal_part_targets: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build the immutable public parent/part sampling denominator once."""
    zones: list[dict[str, Any]] = []
    for feature in zones_geo.get("features", []):
        props = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        configured = props.get("dataPoint")
        if isinstance(configured, list) and len(configured) == 2:
            lon, lat = configured
        elif (
            geometry.get("type") == "Point"
            and isinstance(geometry.get("coordinates"), list)
        ):
            lon, lat = geometry["coordinates"][:2]
        elif (
            geometry.get("type") == "Polygon"
            and geometry.get("coordinates")
            and geometry["coordinates"][0]
        ):
            ring = geometry["coordinates"][0]
            points = (
                ring[:-1]
                if len(ring) > 1 and ring[0] == ring[-1]
                else ring
            )
            lon = sum(float(point[0]) for point in points) / len(points)
            lat = sum(float(point[1]) for point in points) / len(points)
        else:
            continue
        if props.get("id"):
            zones.append({
                "id": props["id"],
                "lon": float(lon),
                "lat": float(lat),
                "coastType": props.get("coastType") or "east",
            })

    zone_coast_types = {
        zone["id"]: zone.get("coastType") or "east" for zone in zones
    }
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
    return zones


def operational_wave_collection_evidence(
    document: dict[str, Any],
    zones: list[dict[str, Any]],
    reference: datetime,
    collection: str,
    *,
    exact_required_times: set[str] | None = None,
    require_single_group: bool = False,
) -> dict[str, Any]:
    """Resolve one family and retain internal pair/lineage promotion proof."""
    exact_required = {
        value for raw in (exact_required_times or set())
        for value in [canonical_time(raw)]
        if value is not None
    }
    valid_times = tuple(sorted({
        *operational_current_valid_times(reference),
        *exact_required,
    }, key=epoch))
    relevant = native_operational_wave_zones(collection, zones)
    required_pairs = len(relevant) * len(valid_times)
    evidence_by_zone: dict[str, dict[str, Any]] = {}
    missing_valid_times: set[str] = set()
    for zone in relevant:
        zone_id = str(zone.get("id") or "")
        point = (document.get("zones") or {}).get(zone_id) or {}
        identity = sampling_identity(zone)
        if identity is None:
            evidence_by_zone[zone_id] = {}
            missing_valid_times.update(valid_times)
            continue
        evidence_by_zone[zone_id] = resolved_native_wave_hour_evidence(
            point.get("hourly"),
            entity_id=zone_id,
            provenance_entity=identity,
            collection=collection,
            required_hours=valid_times,
            exact_required_hours=exact_required,
            require_single_group=require_single_group,
        )

    lineage_conflicts = conflicting_native_wave_asset_keys(
        evidence_by_zone.values()
    )
    target_pair_keys = frozenset(
        (
            str(zone.get("id") or "").removeprefix("PART::"),
            required_hour,
        )
        for zone in relevant
        for required_hour in valid_times
    )
    verified_pair_keys: set[tuple[str, str]] = set()
    resolved_pair_model_runs: dict[tuple[str, str], frozenset[str]] = {}
    lineage_conflict_pairs = 0
    for zone_id, evidence in evidence_by_zone.items():
        resolved_without_conflicts = {
            required_hour
            for required_hour, used in evidence.items()
            if not any(key in lineage_conflicts for key, _lineage in used)
        }
        part_id = zone_id.removeprefix("PART::")
        for required_hour in resolved_without_conflicts:
            pair_key = (part_id, required_hour)
            verified_pair_keys.add(pair_key)
            resolved_pair_model_runs[pair_key] = frozenset(
                lineage[0]
                for _native_key, lineage in evidence[required_hour]
            )
        lineage_conflict_pairs += len(evidence) - len(
            resolved_without_conflicts
        )
        missing_valid_times.update(
            set(valid_times) - resolved_without_conflicts
        )
    closure = {
        "relevantZoneCount": len(relevant),
        "requiredHourCount": len(valid_times),
        "requiredPairCount": required_pairs,
        "verifiedPairCount": len(verified_pair_keys),
        "missingPairCount": required_pairs - len(verified_pair_keys),
        "lineageConflictNativeTimeCount": len(lineage_conflicts),
        "lineageConflictRequiredPairCount": lineage_conflict_pairs,
        "rangeStart": valid_times[0],
        "rangeEnd": valid_times[-1],
    }
    return {
        "closure": closure,
        "missingValidTimes": tuple(sorted(missing_valid_times, key=epoch)),
        "targetPairKeys": target_pair_keys,
        "verifiedPairKeys": frozenset(verified_pair_keys),
        "resolvedPairModelRuns": resolved_pair_model_runs,
        "lineageConflictKeys": frozenset(lineage_conflicts),
    }


def operational_wave_collection_closure(
    document: dict[str, Any],
    zones: list[dict[str, Any]],
    reference: datetime,
    collection: str,
    *,
    exact_required_times: set[str] | None = None,
    require_single_group: bool = False,
) -> tuple[dict[str, Any], tuple[str, ...]]:
    """Resolve one family with the exact same native semantics as final gate."""
    evidence = operational_wave_collection_evidence(
        document,
        zones,
        reference,
        collection,
        exact_required_times=exact_required_times,
        require_single_group=require_single_group,
    )
    return evidence["closure"], evidence["missingValidTimes"]


def operational_wave_candidate_stage_evidence(
    candidate: dict[str, Any],
    zones: list[dict[str, Any]],
    reference: datetime,
    collection: str,
    *,
    exact_required_times: set[str],
    active_evidence: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """Build normal proof and, only for complete active WAM, quality proof."""
    candidate_evidence = operational_wave_collection_evidence(
        candidate,
        zones,
        reference,
        collection,
        exact_required_times=exact_required_times,
    )
    active_targets = frozenset(
        active_evidence.get("targetPairKeys") or ()
    )
    active_pairs = frozenset(
        active_evidence.get("verifiedPairKeys") or ()
    )
    candidate_single_group = None
    if active_pairs == active_targets and active_targets:
        candidate_single_group = operational_wave_collection_evidence(
            candidate,
            zones,
            reference,
            collection,
            exact_required_times=exact_required_times,
            require_single_group=True,
        )
    return candidate_evidence, candidate_single_group


def operational_wave_phase_promotion_decision(
    active: dict[str, Any],
    candidate: dict[str, Any],
    *,
    fallback_phase: bool,
    candidate_changed: bool,
    candidate_phase_model_run: str | None = None,
    candidate_single_group: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Prove that one cumulative WAM run-stage can replace active cache rows.

    Pair identities, rather than aggregate counts, make an equal-count swap
    fail closed. A complete active family can change generation only when the
    cumulative candidate still resolves the whole axis from one coherent run
    group; this prevents a partially refreshed three-hour seam from becoming
    active. Incomplete families may make monotone hole/tail progress.
    """
    active_targets = frozenset(active.get("targetPairKeys") or ())
    candidate_targets = frozenset(candidate.get("targetPairKeys") or ())
    active_pairs = frozenset(active.get("verifiedPairKeys") or ())
    candidate_pairs = frozenset(candidate.get("verifiedPairKeys") or ())
    active_conflicts = frozenset(active.get("lineageConflictKeys") or ())
    candidate_conflicts = frozenset(
        candidate.get("lineageConflictKeys") or ()
    )
    same_target = bool(active_targets) and active_targets == candidate_targets
    pair_superset = active_pairs <= candidate_pairs
    no_new_lineage_conflicts = candidate_conflicts <= active_conflicts
    pair_improvement = len(candidate_pairs) > len(active_pairs)
    active_complete = bool(active_pairs == active_targets and active_targets)
    coherent_candidate_complete = bool(
        candidate_single_group is not None
        and frozenset(
            candidate_single_group.get("targetPairKeys") or ()
        ) == candidate_targets
        and frozenset(
            candidate_single_group.get("verifiedPairKeys") or ()
        ) == candidate_targets
        and not candidate_single_group.get("lineageConflictKeys")
    )
    phase_owned_candidate_complete = bool(
        candidate_phase_model_run
        and candidate_pairs == candidate_targets
        and all(
            set(model_runs) == {candidate_phase_model_run}
            for pair_key, model_runs in (
                candidate.get("resolvedPairModelRuns") or {}
            ).items()
            if pair_key in candidate_targets
        )
        and candidate_targets <= set(
            (candidate.get("resolvedPairModelRuns") or {}).keys()
        )
    )
    quality_refresh = bool(
        not fallback_phase
        and active_complete
        and coherent_candidate_complete
        and phase_owned_candidate_complete
    )
    promote = bool(
        candidate_changed
        and same_target
        and pair_superset
        and no_new_lineage_conflicts
        and (
            pair_improvement
            or quality_refresh
        )
        and (not fallback_phase or pair_improvement)
    )
    if not candidate_changed:
        reason_code = "NO_CANDIDATE_CHANGE"
    elif not same_target:
        reason_code = "TARGET_DENOMINATOR_CHANGED"
    elif not pair_superset:
        reason_code = "RESOLVED_PAIR_REGRESSION"
    elif not no_new_lineage_conflicts:
        reason_code = "NEW_LINEAGE_CONFLICT"
    elif fallback_phase and not pair_improvement:
        reason_code = "FALLBACK_NO_PAIR_IMPROVEMENT"
    elif not pair_improvement and not quality_refresh:
        reason_code = "INCOMPLETE_QUALITY_REFRESH"
    else:
        reason_code = "PROMOTED"
    return {
        "promote": promote,
        "reasonCode": reason_code,
        "activeVerifiedPairCount": len(active_pairs),
        "candidateVerifiedPairCount": len(candidate_pairs),
        "pairImprovementCount": max(0, len(candidate_pairs) - len(active_pairs)),
        "activeLineageConflictCount": len(active_conflicts),
        "candidateLineageConflictCount": len(candidate_conflicts),
        "sameTargetDenominator": same_target,
        "resolvedPairSuperset": pair_superset,
        "noNewLineageConflicts": no_new_lineage_conflicts,
        "coherentCandidateComplete": coherent_candidate_complete,
        "phaseOwnedCandidateComplete": phase_owned_candidate_complete,
    }


def operational_wave_asset_stage_complete(
    summary: dict[str, Any],
    outcome: tuple[set[str], set[str], bool, int, int],
) -> bool:
    """Require every relevant native target to accept both wave fields."""
    return bool(
        {"significant-wave-height", "dominant-wave-period"} <= outcome[0]
        and int(summary.get("requiredCount") or 0) > 0
        and int(summary.get("acceptedCount") or 0)
            == int(summary.get("requiredCount") or 0)
    )


def wave_component_snapshot(
    document: dict[str, Any],
    zone_id: str,
    valid_time: str,
) -> dict[str, Any]:
    """Return the complete mutable wave slice for one PART/time pair.

    The GRIB parser stores the tuple on the hour and its cell metadata on the
    point. Presence is retained explicitly so that a rejected target cannot
    silently create, remove or normalise a value while another target from the
    same asset is admitted.
    """
    point = (document.get("zones") or {}).get(zone_id)
    if not isinstance(point, dict):
        point = {}
    hour = (point.get("hourly") or {}).get(valid_time)
    if not isinstance(hour, dict):
        hour = {}
    sources = hour.get("sources")
    if not isinstance(sources, dict):
        sources = {}
    grid_points = point.get("gridPoints")
    if not isinstance(grid_points, dict):
        grid_points = {}
    collections = point.get("collections")
    if not isinstance(collections, dict):
        collections = {}

    def entry(mapping: dict[str, Any], key: str) -> tuple[bool, Any]:
        return key in mapping, copy.deepcopy(mapping.get(key))

    fields = (
        "significant-wave-height",
        "dominant-wave-period",
        "mean-wave-dir",
    )
    return {
        "zonePresent": zone_id in (document.get("zones") or {}),
        "hourPresent": valid_time in (point.get("hourly") or {}),
        "time": entry(hour, "time"),
        "hour": {key: entry(hour, key) for key in fields},
        "source": entry(sources, "wave"),
        "gridPoints": {key: entry(grid_points, key) for key in fields},
        "collections": {key: entry(collections, key) for key in fields},
    }


def operational_wave_asset_stage_admissible(
    before: dict[str, Any],
    staged: dict[str, Any],
    zones: list[dict[str, Any]],
    collection: str,
    asset: Any,
    summary: dict[str, Any],
    outcome: tuple[set[str], set[str], bool, int, int],
) -> bool:
    """Admit a cleanly traversed WAM asset at atomic PART/time granularity.

    Corrupt/global asset failures are handled before this validator. At EOF we
    require at least one complete tuple from the exact official asset and prove
    that every rejected native target is byte-for-byte unchanged. The existing
    collection candidate/promotion gate then prevents pair regressions and
    mixed native lineage from reaching the active cache.
    """
    if not (
        collection in WAVE_BOOTSTRAP_COLLECTIONS
        and isinstance(summary, dict)
        and isinstance(outcome, tuple)
        and len(outcome) == 5
        and {"significant-wave-height", "dominant-wave-period"}
            <= set(outcome[0])
        and outcome[2] is False
        and getattr(asset, "valid_time", None)
    ):
        return False
    try:
        if any(wave_owner_for_target(zone) != collection for zone in zones):
            return False
    except ValueError:
        return False
    integer_fields = ("requiredCount", "acceptedCount", "rejectedCount")
    if any(
        not isinstance(summary.get(key), int)
        or isinstance(summary.get(key), bool)
        or int(summary[key]) < 0
        for key in integer_fields
    ):
        return False
    required_count = int(summary["requiredCount"])
    accepted_count = int(summary["acceptedCount"])
    rejected_count = int(summary["rejectedCount"])
    rejected_by_code = summary.get("rejectedByCode")
    if not isinstance(rejected_by_code, dict) or any(
        not isinstance(code, str)
        or not code
        or not isinstance(count, int)
        or isinstance(count, bool)
        or count <= 0
        for code, count in rejected_by_code.items()
    ):
        return False
    if not wave_asset_cache_proof_coherent(summary):
        return False
    target_ids = [str(zone.get("id") or "") for zone in zones]
    if (
        summary.get("schemaVersion") != WAVE_ASSET_CACHE_PROOF_SCHEMA
        or summary.get("admissionPolicy") != WAVE_ASSET_ADMISSION_POLICY
        or summary.get("targetRegistrySha256")
            != wave_target_registry_sha256(collection, zones)
        or not re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("acceptedTargetSetSha256") or ""),
        )
        or not re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("rejectedTargetSetSha256") or ""),
        )
        or required_count <= 0
        or accepted_count <= 0
        or required_count != len(target_ids)
        or len(set(target_ids)) != len(target_ids)
        or any(not zone_id for zone_id in target_ids)
        or accepted_count + rejected_count != required_count
        or sum(rejected_by_code.values()) != rejected_count
    ):
        return False
    accepted_ids: set[str] = set()
    rejected_ids: set[str] = set()
    accepted_lineages: set[str] = set()
    accepted_content_sha256: set[str] = set()
    rejected_zones: list[tuple[dict[str, Any], str]] = []
    for zone in zones:
        zone_id = str(zone.get("id") or "")
        rejection = private_wave_bootstrap_hour_rejection_code(
            staged,
            zone,
            collection,
            asset,
        )
        if rejection is None:
            accepted_ids.add(zone_id)
            staged_point = (staged.get("zones") or {}).get(zone_id) or {}
            staged_hour = (staged_point.get("hourly") or {}).get(
                asset.valid_time
            ) or {}
            source = (staged_hour.get("sources") or {}).get("wave") or {}
            accepted_content_sha256.add(str(source.get("contentSha256") or ""))
            lineage = wave_asset_lineage_identity(source)
            if lineage is None:
                return False
            accepted_lineages.add(json.dumps(
                lineage,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ))
            continue
        rejected_ids.add(zone_id)
        rejected_zones.append((zone, zone_id))
        if wave_component_snapshot(
            before,
            zone_id,
            asset.valid_time,
        ) != wave_component_snapshot(
            staged,
            zone_id,
            asset.valid_time,
        ):
            return False
    if len(accepted_lineages) != 1:
        return False
    admitted_lineage = next(iter(accepted_lineages))
    for zone, zone_id in rejected_zones:
        before_point = (before.get("zones") or {}).get(zone_id)
        if not isinstance(before_point, dict):
            before_point = {}
        before_hour = (before_point.get("hourly") or {}).get(
            asset.valid_time
        )
        if not isinstance(before_hour, dict):
            before_hour = {}
        provenance_entity = sampling_identity(zone) or before_point
        if native_wave_row_error_code(
            valid_time=asset.valid_time,
            hour=before_hour,
            entity_id=zone_id,
            provenance_entity=provenance_entity,
            expected_collection=collection,
        ) is None:
            old_lineage = wave_asset_lineage_identity(
                (before_hour.get("sources") or {}).get("wave")
            )
            if old_lineage is None or json.dumps(
                old_lineage,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ) != admitted_lineage:
                # One native time may never contain two valid asset lineages.
                return False
        # AssetStagedZone intentionally normalises missing metadata mappings.
        # Put every rejected target back exactly as it was before the generic
        # transaction commits, including key presence and unrelated fields.
        before_zones = before.get("zones") or {}
        staged_zones = staged.setdefault("zones", {})
        if zone_id in before_zones:
            staged_zones[zone_id] = copy.deepcopy(before_zones[zone_id])
        else:
            staged_zones.pop(zone_id, None)
    target_id_set = set(target_ids)
    touched_target_ids = set(outcome[1]) & target_id_set
    if not touched_target_ids <= accepted_ids:
        return False
    for zone in zones:
        zone_id = str(zone.get("id") or "")
        if zone_id not in accepted_ids - touched_target_ids:
            continue
        if (
            wave_component_snapshot(before, zone_id, asset.valid_time)
            != wave_component_snapshot(staged, zone_id, asset.valid_time)
            or private_wave_bootstrap_hour_rejection_code(
                before,
                zone,
                collection,
                asset,
            ) is not None
        ):
            return False
    return bool(
        len(accepted_ids) == accepted_count
        and len(accepted_lineages) == 1
        and summary.get("acceptedLineageSha256") == hashlib.sha256(
            next(iter(accepted_lineages)).encode("utf-8")
        ).hexdigest()
        and len(accepted_content_sha256) == 1
        and re.fullmatch(
            r"[0-9a-f]{64}",
            next(iter(accepted_content_sha256)),
        )
        and summary.get("rawContentSha256")
            == next(iter(accepted_content_sha256))
        and summary.get("acceptedTargetSetSha256")
            == wave_target_set_sha256(accepted_ids)
        and summary.get("rejectedTargetSetSha256")
            == wave_target_set_sha256(rejected_ids)
    )


def accumulate_wave_asset_coverage(
    coverage: dict[str, Any],
    summary: dict[str, Any],
    *,
    admitted: bool,
    observed_rejected_by_code: dict[str, int] | None = None,
) -> None:
    """Persist privacy-safe aggregate WAM admission evidence."""
    required_count = int(summary.get("requiredCount") or 0)
    accepted_count = int(summary.get("acceptedCount") or 0)
    rejected_count = int(summary.get("rejectedCount") or 0)
    coverage["observedAssetCount"] = int(
        coverage.get("observedAssetCount") or 0
    ) + 1
    coverage["requiredTupleCount"] = int(
        coverage.get("requiredTupleCount") or 0
    ) + required_count
    coverage["acceptedTupleCount"] = int(
        coverage.get("acceptedTupleCount") or 0
    ) + accepted_count
    coverage["observedValidTupleCount"] = int(
        coverage.get("observedValidTupleCount") or 0
    ) + accepted_count
    coverage["rejectedTupleCount"] = int(
        coverage.get("rejectedTupleCount") or 0
    ) + rejected_count
    if admitted:
        coverage["admittedTupleCount"] = int(
            coverage.get("admittedTupleCount") or 0
        ) + accepted_count
        coverage["admittedAssetCount"] = int(
            coverage.get("admittedAssetCount") or 0
        ) + 1
        key = (
            "completeAssetCount"
            if required_count > 0 and accepted_count == required_count
            else "partialAssetCount"
        )
        coverage[key] = int(coverage.get(key) or 0) + 1
    else:
        coverage["withheldValidTupleCount"] = int(
            coverage.get("withheldValidTupleCount") or 0
        ) + accepted_count
        coverage["rejectedAssetCount"] = int(
            coverage.get("rejectedAssetCount") or 0
        ) + 1
    rejected_totals = coverage.setdefault("rejectedByCode", {})
    rejection_counts = (
        observed_rejected_by_code
        if observed_rejected_by_code is not None
        else summary.get("rejectedByCode") or {}
    )
    for code, count in rejection_counts.items():
        rejected_totals[code] = int(rejected_totals.get(code) or 0) + int(count)
    coverage["rejectedByCode"] = dict(sorted(rejected_totals.items()))


def build_operational_wave_collection_candidate(
    active: dict[str, Any],
) -> dict[str, Any]:
    """Clone active cache rows for one isolated collection/run candidate."""
    return {
        "generatedAt": active.get("generatedAt"),
        "zones": copy.deepcopy(active.get("zones") or {}),
    }


def commit_operational_wave_collection_candidate(
    active: dict[str, Any],
    candidate: dict[str, Any],
    touched_zone_ids: set[str],
) -> None:
    """Atomically publish only zones touched by a proved cumulative stage."""
    if not touched_zone_ids:
        return
    candidate_zones = candidate.get("zones") or {}
    if not touched_zone_ids <= set(candidate_zones):
        raise RuntimeError("operational WAM candidate lacks a touched zone")
    committed_zones = dict(active.get("zones") or {})
    for zone_id in touched_zone_ids:
        committed_zones[zone_id] = copy.deepcopy(candidate_zones[zone_id])
    active["zones"] = committed_zones


def apply_operational_wave_closure_to_run_info(
    run_info: dict[str, Any],
    closure: dict[str, Any],
    missing_valid_times: tuple[str, ...],
    exact_required_times: set[str],
) -> None:
    """Attach aggregate active-cache closure only at a proved promotion."""
    missing = set(missing_valid_times)
    exact_missing = len(missing & set(exact_required_times))
    run_info.update({
        "remainingClosureHourCount": len(missing),
        "remainingClosurePairCount": int(
            closure.get("missingPairCount") or 0
        ),
        "remainingClosureByCategory": {
            "exactRequiredHourCount": exact_missing,
            "forecastHourCount": len(missing) - exact_missing,
            "nativePairCount": int(closure.get("missingPairCount") or 0),
            "lineageConflictPairCount": int(
                closure.get("lineageConflictRequiredPairCount") or 0
            ),
        },
        "lineageConflictNativeTimeCount": int(
            closure.get("lineageConflictNativeTimeCount") or 0
        ),
        "nativeGateProofComplete": (
            operational_wave_native_closure_complete(closure)
        ),
        "waveObservedRejectionEventsByCode": dict(sorted(
            (
                run_info.get("waveObservedRejectionEventsByCode") or {}
            ).items()
        )),
    })


def promote_operational_wave_collection_stage(
    *,
    active_result: dict[str, Any],
    candidate_result: dict[str, Any],
    collection: str,
    phase_model_run: str,
    fallback_phase: bool,
    active_evidence: dict[str, Any],
    candidate_evidence: dict[str, Any],
    candidate_single_group: dict[str, Any] | None,
    touched_zone_ids: set[str],
    run_info: dict[str, Any],
    fresh_zone_ids: set[str],
    exact_required_times: set[str],
    checkpoint_controller: Any,
    asset_processing_seconds: float | None,
    force_checkpoint: bool = False,
) -> dict[str, Any]:
    """Apply all active WAM state changes behind one promotion decision."""
    decision = operational_wave_phase_promotion_decision(
        active_evidence,
        candidate_evidence,
        fallback_phase=fallback_phase,
        candidate_changed=bool(touched_zone_ids),
        candidate_phase_model_run=phase_model_run,
        candidate_single_group=candidate_single_group,
    )
    if not decision["promote"]:
        if asset_processing_seconds is not None:
            checkpoint_controller.observe_asset_duration(
                asset_processing_seconds,
            )
        return {**decision, "checkpointWritten": False}
    commit_operational_wave_collection_candidate(
        active_result,
        candidate_result,
        touched_zone_ids,
    )
    fresh_zone_ids.update(touched_zone_ids)
    apply_operational_wave_closure_to_run_info(
        run_info,
        candidate_evidence["closure"],
        candidate_evidence["missingValidTimes"],
        exact_required_times,
    )
    active_result.setdefault("runs", {})[collection] = copy.deepcopy(
        run_info
    )
    checkpoint_written = checkpoint_controller.note_committed_asset(
        seconds=asset_processing_seconds,
    )
    if force_checkpoint and not checkpoint_written:
        checkpoint_written = checkpoint_controller.flush_if_due(force=True)
    return {**decision, "checkpointWritten": checkpoint_written}


def operational_wave_phase_defers_primary_quality_promotion(
    *,
    phase_rank: int,
    active_evidence: dict[str, Any],
) -> bool:
    """Defer an already-complete primary refresh until its whole run is staged."""
    return bool(
        phase_rank == 0
        and operational_wave_native_closure_complete(
            active_evidence.get("closure") or {}
        )
    )


def operational_wave_terminal_quality_promotion_allowed(
    *,
    promotion_deferred: bool,
    phase_fully_traversed: bool,
    stop_code: str | None,
    candidate_changed: bool,
) -> bool:
    """Only a complete, uninterrupted deferred phase may replace good WAM."""
    return bool(
        promotion_deferred
        and phase_fully_traversed
        and stop_code is None
        and candidate_changed
    )


def operational_wave_phase_fully_traversed(
    *,
    selected_asset_count: int,
    proven_asset_count: int,
    stop_code: str | None,
    native_closure_stopped: bool,
) -> bool:
    """Require an EOF/admission proof for every selected asset in the phase."""
    return bool(
        isinstance(selected_asset_count, int)
        and not isinstance(selected_asset_count, bool)
        and selected_asset_count > 0
        and isinstance(proven_asset_count, int)
        and not isinstance(proven_asset_count, bool)
        and proven_asset_count == selected_asset_count
        and stop_code is None
        and not native_closure_stopped
    )


def operational_wave_fallback_phase_allowed(
    *,
    previous_phase_rank: int,
    next_phase_rank: int,
    previous_phase_fully_traversed: bool,
    stop_code: str | None,
    active_evidence: dict[str, Any],
) -> bool:
    """Allow a later run phase only after terminal completion with a residual."""
    closure = active_evidence.get("closure") or {}
    return bool(
        next_phase_rank > previous_phase_rank
        and previous_phase_fully_traversed
        and stop_code is None
        and int(closure.get("requiredPairCount") or 0) > 0
        and int(closure.get("missingPairCount") or 0) > 0
    )


def operational_wave_native_closure_complete(
    closure: dict[str, Any],
) -> bool:
    """Return true only for a non-empty, fully resolved native family gate."""
    return (
        int(closure.get("requiredPairCount") or 0) > 0
        and int(closure.get("missingPairCount") or 0) == 0
    )


def operational_wave_collection_outcome(
    closure: dict[str, Any],
    promotion_count: int,
) -> dict[str, bool]:
    """Separate useful raw attempts from active-cache semantic progress."""
    active_complete = operational_wave_native_closure_complete(closure)
    semantic_progress = promotion_count > 0
    return {
        "activeComplete": active_complete,
        "semanticProgress": semantic_progress,
        "retryImmediately": not active_complete and not semantic_progress,
    }


def collection_assets_complete_for_state(
    *,
    operational_wave: bool,
    generic_assets_complete: bool,
    wave_outcome: dict[str, bool],
) -> bool:
    """Never let processed STAC counts mask an active native WAM residual."""
    return bool(
        wave_outcome.get("activeComplete")
        if operational_wave
        else generic_assets_complete
    )


def should_stop_operational_wave_asset_loop(
    collection: str,
    closure: dict[str, Any],
    *,
    launch_mode: bool,
) -> bool:
    """Stop overlap only while closing the explicitly forced launch gate."""
    return bool(
        launch_mode
        and collection in WAVE_BOOTSTRAP_COLLECTIONS
        and operational_wave_native_closure_complete(closure)
    )


def operational_wave_residual_by_collection(
    document: dict[str, Any],
    zones: list[dict[str, Any]],
    reference: datetime,
    *,
    exact_required_times: set[str] | None = None,
    require_single_group: bool = False,
) -> dict[str, dict[str, Any]]:
    """Count native WAM gaps with final-validator resolution semantics."""
    residual: dict[str, dict[str, Any]] = {}
    for collection in sorted(
        WAVE_BOOTSTRAP_COLLECTIONS,
        key=COLLECTION_ORDER.index,
    ):
        residual[collection], _missing = operational_wave_collection_closure(
            document,
            zones,
            reference,
            collection,
            exact_required_times=exact_required_times,
            require_single_group=require_single_group,
        )
    native_part_count = sum(
        int(details.get("relevantZoneCount") or 0)
        for details in residual.values()
    )
    if native_part_count != OPERATIONAL_WAVE_NATIVE_PART_COUNT:
        raise RuntimeError("operational native WAM target registry mismatch")
    return residual


def prioritize_operational_wave_assets(
    assets: list[dict[str, Any]],
    missing_valid_times: tuple[str, ...],
    proof_complete_valid_times: set[str],
) -> list[dict[str, Any]]:
    """Put exact residual/tail and safe bracket support before old overlap."""
    missing_epochs = tuple(epoch(value) for value in missing_valid_times)

    def priority(asset: dict[str, Any]) -> tuple[Any, ...]:
        phase_rank = int(asset.get("operationalWavePhaseRank") or 0)
        valid_time = str(asset.get("valid") or "")
        valid_epoch = epoch(valid_time)
        if valid_time in proof_complete_valid_times:
            category = 3
            distance = 0.0
        elif valid_time in missing_valid_times:
            category = 0
            distance = 0.0
        else:
            distance = min(
                (abs(valid_epoch - wanted) / 3600.0 for wanted in missing_epochs),
                default=float("inf"),
            )
            category = 1 if distance <= 4.0 else 2
        return (
            phase_rank,
            category,
            distance,
            valid_epoch,
            str(asset.get("id") or ""),
        )

    return sorted(assets, key=priority)


def has_operational_wave_residual(
    residual: dict[str, dict[str, Any]],
) -> bool:
    return any(
        int(details.get("missingPairCount") or 0) > 0
        for details in residual.values()
        if int(details.get("requiredPairCount") or 0) > 0
    )


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
    candidate_source_capture: dict[str, Any] | None = None,
    existing_source_trusted: bool = True,
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
    if not existing_source_trusted:
        # An unproved or superseded row must never block a valid official
        # candidate. This decision happens inside the copy-on-write stage, so
        # a later parser/provenance failure still leaves the original intact.
        return True

    candidate_item_id = str(
        (candidate_source_capture or {}).get("itemId") or ""
    ).strip()
    candidate_asset_identity = str(
        (candidate_source_capture or {}).get("assetIdentitySha256") or ""
    )
    candidate_official_identity_valid = bool(
        candidate_item_id
        and len(candidate_asset_identity) == 64
        and all(character in "0123456789abcdef" for character in candidate_asset_identity)
        and (
            (candidate_source_capture or {}).get("assetSizeBytes") is None
            or isinstance(
                (candidate_source_capture or {}).get("assetSizeBytes"), int,
            )
            and not isinstance(
                (candidate_source_capture or {}).get("assetSizeBytes"), bool,
            )
            and int((candidate_source_capture or {}).get("assetSizeBytes")) > 0
        )
    )
    if (
        str(source.get("collection") or "") == collection
        and epoch(source.get("modelRun")) == epoch(model_run)
        and candidate_official_identity_valid
        and any(
            source.get(field) != (candidate_source_capture or {}).get(field)
            for field in (
                "itemId",
                "assetIdentitySha256",
                "assetSizeBytes",
                "itemCreatedAt",
                "itemUpdatedAt",
            )
        )
    ):
        # The same-run candidate is the currently selected official STAC
        # revision. It must replace an earlier capture before geometry ties.
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
        if isinstance(point, AssetStagedZone):
            point.detach_all_hourly_rows()
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


def grid_point_metadata(
    candidate: dict[str, Any],
    excluded_keys: tuple[str, ...],
) -> dict[str, Any]:
    """Copy grid metadata while rounding only numeric values."""
    return {
        key: (
            round(value, 5)
            if isinstance(value, (int, float)) and not isinstance(value, bool)
            else value
        )
        for key, value in candidate.items()
        if key not in excluded_keys
    }


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
                 current_part_outcomes: dict[str, Any] | None = None,
                 allowed_parameters: set[str] | None = None,
                 trusted_current_pair_source_keys: set[
                     tuple[str, str, str]
                 ] | None = None,
                 locked_operational_reference: str | None = None) -> tuple[set[str], set[str], bool, int, int]:
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
    current_candidate_available_part_zone_ids: set[str] = set()
    if current_part_outcomes is not None:
        current_part_outcomes.clear()
    source_capture = raw_cache_source_capture(path, collection, model_run, valid_time)
    shadow_source_asset = canonical_current_source_asset({
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        **(source_capture or {}),
    }) if source_capture is not None and collection in MARINE_COLLECTIONS else None
    shadow_source_asset_sha256 = (
        current_source_asset_sha256(shadow_source_asset)
        if shadow_source_asset is not None
        else None
    )
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
                if allowed_parameters is not None and parameter not in allowed_parameters:
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
                    wind_reference = None
                    if family == "wind":
                        try:
                            wind_reference = read_wind_reference(gid, codes_get)
                        except Exception as exc:
                            raise DmiGridLookupError(
                                "DMI wind reference could not be verified",
                                "WIND_REFERENCE_READ_FAILED",
                            ) from exc
                    layer_key, layer_rank = vector_vertical_layer(family, safe_get(gid, "typeOfLevel"), safe_get(gid, "level"))
                    for zone in wanted:
                        zone_candidates = candidates.get(zone["id"]) or []
                        cache = vector_candidates.setdefault((family, zone["id"], layer_key), {})
                        cache[parameter] = [
                            {**candidate, "_windReference": wind_reference}
                            for candidate in zone_candidates
                        ] if family == "wind" else zone_candidates
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
                        if family == "wind":
                            try:
                                first, second = earth_relative_wind_pair(first, second)
                            except ValueError as exc:
                                raise DmiGridLookupError(
                                    "DMI wind components do not share a verified reference",
                                    "WIND_REFERENCE_PAIR_INVALID",
                                ) from exc
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
                            if zone["id"] in operational_part_zone_ids:
                                # Outcome proof is collection-local. A valid DMI
                                # candidate remains spatially available even if a
                                # closer candidate from another DMI collection is
                                # already the global public winner for this hour.
                                current_candidate_available_part_zone_ids.add(
                                    str(zone["id"])
                                )
                            existing_source_trusted = True
                            if (
                                zone["id"] in operational_part_zone_ids
                                and trusted_current_pair_source_keys is not None
                            ):
                                existing_hour = (
                                    (point.get("hourly") or {}).get(valid_time)
                                    or {}
                                )
                                existing_source = canonical_current_source_asset(
                                    (existing_hour.get("sources") or {}).get(
                                        "current"
                                    )
                                )
                                existing_source_key = json.dumps(
                                    existing_source,
                                    sort_keys=True,
                                    separators=(",", ":"),
                                    ensure_ascii=False,
                                ) if existing_source is not None else ""
                                existing_source_trusted = (
                                    str(zone["id"])[len("PART::"):],
                                    valid_time,
                                    existing_source_key,
                                ) in trusted_current_pair_source_keys
                            if not prefer_current_hour_candidate(
                                point,
                                valid_time,
                                collection,
                                model_run,
                                candidate_choice,
                                source_capture,
                                existing_source_trusted,
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
                                **grid_point_metadata(candidate, ("value", "index", "_windReference")),
                                "verticalLayer": layer_key,
                                "verticalLayerRankM": round(layer_rank, 3),
                            }
                            point["collections"][key] = collection
                        source_extra = {
                            "vectorSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
                            "vectorSemanticsVersion": 1,
                        }
                        if family == "wind":
                            source_extra.update({
                                "vectorSemanticsVersion": WIND_VECTOR_VERSION,
                                "vectorReference": "earth-relative-east-north",
                                "vectorTransform": first["_windReference"][0],
                            })
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
                        search["candidatesExamined"] = max(
                            int(search.get("candidatesExamined") or 0),
                            int(nearest.get("_candidateCount") or 0),
                        )
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
                        **grid_point_metadata(nearest, ("value", "_candidateCount")),
                        **point_extra,
                    }
                    point["collections"][parameter] = collection
                if interrupted:
                    break
            finally:
                codes_release(gid)
    # Wave height and period are the shared mobilisation/rollback tuple. Build
    # and validate the complete candidate before mutating the retained row. A
    # partial or malformed new asset must never destroy an older valid tuple.
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
        height_value = height.get("value")
        period_value = period.get("value")
        if not (
            isinstance(height_value, (int, float))
            and not isinstance(height_value, bool)
            and math.isfinite(float(height_value))
            and float(height_value) >= 0
            and isinstance(period_value, (int, float))
            and not isinstance(period_value, bool)
            and math.isfinite(float(period_value))
            and float(period_value) >= 0
            and not (float(height_value) > 0 and float(period_value) <= 0)
        ):
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "INVALID_WAVE_TUPLE"
            continue
        optional_fields: tuple[str, ...] = ()
        direction_by_cell = {
            candidate_cell_key(candidate): candidate
            for candidate in candidates_by_parameter.get("mean-wave-dir") or []
            if candidate_cell_key(candidate) is not None
        }
        direction = direction_by_cell.get(candidate_cell_key(height))
        if direction is not None:
            direction_value = direction.get("value")
            if not (
                isinstance(direction_value, (int, float))
                and not isinstance(direction_value, bool)
                and math.isfinite(float(direction_value))
                and 0 <= float(direction_value) < 360
            ):
                diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "INVALID_WAVE_DIRECTION"
                continue
            optional_fields = ("mean-wave-dir",)
        elif float(height_value) > 0:
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "MISSING_WAVE_DIRECTION"
            continue
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
        if source is None or not complete_native_source_for_hour(
            source,
            "wave",
            zone_id,
            point,
            valid_time,
        ):
            diagnostics.setdefault("rejectedScalarTuples", {}).setdefault(zone_id, {})["wave"] = "INVALID_WAVE_PROVENANCE"
            continue

        # Atomic commit of the complete tuple inside the transaction stage.
        hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
        hour["significant-wave-height"] = height_value
        hour["dominant-wave-period"] = period_value
        if direction is not None:
            hour["mean-wave-dir"] = direction["value"]
        else:
            hour.pop("mean-wave-dir", None)
        hour.setdefault("sources", {})["wave"] = source
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
            shadow_source_asset_sha256,
            locked_operational_reference=locked_operational_reference,
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
                for zone_id in (
                    operational_part_zone_ids
                    - current_candidate_available_part_zone_ids
                )
            ),
        })
    return found, touched, interrupted, messages_seen, zone_lookups


def build_asset_stage_document(
    document: dict[str, Any],
    zones: list[dict[str, Any]],
    valid_time: str,
    *,
    private_stage: bool,
) -> dict[str, Any]:
    source_zones = document.get("zones") or {}
    staged_zones: dict[str, AssetStagedZone] = {}
    for zone in zones:
        if bool(zone.get("privateStage")) != private_stage:
            continue
        zone_id = str(zone.get("id") or "")
        if not zone_id:
            continue
        source = source_zones.get(zone_id)
        if isinstance(source, dict):
            staged_zones[zone_id] = AssetStagedZone(
                source,
                valid_time,
            )
    return {
        "generatedAt": document.get("generatedAt"),
        "zones": staged_zones,
    }


def commit_asset_stage_document(
    document: dict[str, Any],
    staged: dict[str, Any],
) -> None:
    committed_zones = dict(document.get("zones") or {})
    for zone_id, zone in (staged.get("zones") or {}).items():
        committed_zones[zone_id] = (
            zone.committed_copy()
            if isinstance(zone, AssetStagedZone)
            else dict(zone)
        )
    document["zones"] = committed_zones


def restore_mapping(target: dict[str, Any], snapshot: dict[str, Any]) -> None:
    target.clear()
    target.update(snapshot)


def build_current_shadow_stage(
    document: dict[str, Any],
    zones: list[dict[str, Any]],
    collection: str,
) -> dict[str, Any]:
    """Copy only research targets that one asset may mutate."""
    stage = dict(document)
    target_ids = {
        str(zone.get("id") or "")
        for zone in zones
        if zone.get("researchCurrent")
        and (
            not zone.get("requiredCollection")
            or zone.get("requiredCollection") == collection
        )
    }
    for key in ("anchors", "coverageAudits"):
        values = dict(document.get(key) or {})
        for target_id in target_ids:
            if target_id in values:
                values[target_id] = copy.deepcopy(values[target_id])
        stage[key] = values
    if "regionalSourceProofs" in document:
        stage["regionalSourceProofs"] = copy.deepcopy(document["regionalSourceProofs"])
    return stage


def process_grib_transactionally(
    path: pathlib.Path,
    collection: str,
    model_run: str,
    valid_time: str,
    zones: list[dict[str, Any]],
    output: dict[str, Any],
    diagnostics: dict[str, Any],
    current_shadow: dict[str, Any] | None = None,
    private_stage_output: dict[str, Any] | None = None,
    current_part_outcomes: dict[str, Any] | None = None,
    allowed_parameters: set[str] | None = None,
    *,
    prepare_stage: Any | None = None,
    failure_flush: Any | None = None,
    stage_validator: Any | None = None,
    current_stage_validator: Any | None = None,
    finalize_shadow_stage: Any | None = None,
    locked_operational_reference: str | None = None,
    trusted_current_pair_source_keys: set[
        tuple[str, str, str]
    ] | None = None,
    validation_error: str = "GRIB asset stage validation failed",
) -> tuple[set[str], set[str], bool, int, int]:
    """Parse one asset against copy-on-write state and commit only at EOF.

    Diagnostics are restored on interruption/exception. Data, private coastal
    staging and research-shadow state remain isolated until the complete asset
    and any caller-supplied invariant have passed.
    """
    output_stage = build_asset_stage_document(
        output,
        zones,
        valid_time,
        private_stage=False,
    )
    private_output_stage = (
        build_asset_stage_document(
            private_stage_output,
            zones,
            valid_time,
            private_stage=True,
        )
        if private_stage_output is not None
        else None
    )
    diagnostics_snapshot = copy.deepcopy(diagnostics)
    shadow_stage = (
        build_current_shadow_stage(current_shadow, zones, collection)
        if current_shadow is not None
        else None
    )
    part_outcomes_stage = {} if current_part_outcomes is not None else None
    try:
        if prepare_stage is not None:
            prepare_stage(output_stage, private_output_stage)
        outcome = process_grib(
            path,
            collection,
            model_run,
            valid_time,
            zones,
            output_stage,
            diagnostics,
            shadow_stage,
            private_output_stage,
            part_outcomes_stage,
            allowed_parameters=allowed_parameters,
            **({
                "locked_operational_reference": locked_operational_reference,
            } if locked_operational_reference is not None else {}),
            **({
                "trusted_current_pair_source_keys":
                    trusted_current_pair_source_keys,
            } if trusted_current_pair_source_keys is not None else {}),
        )
        found, touched, interrupted, messages_seen, zone_lookups = outcome
        if interrupted:
            restore_mapping(diagnostics, diagnostics_snapshot)
            if failure_flush is not None:
                failure_flush()
            return set(), set(), True, 0, 0
        if stage_validator is not None and not stage_validator(
            output_stage,
            private_output_stage,
            outcome,
        ):
            raise RuntimeError(validation_error)
        if current_stage_validator is not None and not current_stage_validator(
            output_stage,
            private_output_stage,
            outcome,
            part_outcomes_stage,
        ):
            raise RuntimeError(validation_error)
        if shadow_stage is not None and finalize_shadow_stage is not None:
            # Source proof and its regional samples form one private stage.
            # No bulk or shadow mutation may escape if proof capture fails.
            finalize_shadow_stage(shadow_stage)
    except Exception:
        restore_mapping(diagnostics, diagnostics_snapshot)
        if failure_flush is not None:
            failure_flush()
        raise
    commit_asset_stage_document(output, output_stage)
    if private_stage_output is not None and private_output_stage is not None:
        commit_asset_stage_document(private_stage_output, private_output_stage)
    if current_shadow is not None and shadow_stage is not None:
        restore_mapping(current_shadow, shadow_stage)
    if current_part_outcomes is not None and part_outcomes_stage is not None:
        current_part_outcomes.clear()
        current_part_outcomes.update(part_outcomes_stage)
    return found, touched, False, messages_seen, zone_lookups


def private_wave_bootstrap_hour_rejection_code(
    result: dict[str, Any],
    zone: dict[str, Any],
    collection: str,
    asset: Any,
) -> str | None:
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
        return "INVALID_WAVE_TUPLE"
    direction_present = (
        isinstance(direction, (int, float))
        and not isinstance(direction, bool)
        and math.isfinite(float(direction))
    )
    if float(height) > 0 and not direction_present:
        return "MISSING_WAVE_DIRECTION"
    if direction_present and not (0 <= float(direction) < 360):
        return "INVALID_WAVE_DIRECTION"
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
        return "ASSET_PROVENANCE_MISMATCH"
    official_identity = getattr(asset, "official_identity", None)
    if (
        official_identity is not None
        and not wave_native_source_matches_official(
            source,
            official_identity,
        )
    ):
        return "ASSET_PROVENANCE_MISMATCH"
    if not complete_native_source_for_hour(
        source,
        "wave",
        zone_id,
        point,
        asset.valid_time,
    ):
        return "INVALID_WAVE_PROVENANCE"
    return None


def private_wave_bootstrap_hour_complete(
    result: dict[str, Any],
    zone: dict[str, Any],
    collection: str,
    asset: Any,
) -> bool:
    return private_wave_bootstrap_hour_rejection_code(
        result,
        zone,
        collection,
        asset,
    ) is None


def wave_target_set_sha256(zone_ids: Iterable[str]) -> str:
    canonical = json.dumps(
        sorted({str(zone_id) for zone_id in zone_ids}),
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def wave_target_registry_sha256(
    collection: str,
    zones: list[dict[str, Any]],
) -> str:
    canonical = json.dumps(
        {
            "collection": collection,
            "waveOwnerPolicyId": WAVE_OWNER_POLICY_ID,
            "targets": sorted(
                (
                    {
                        "id": str(zone.get("id") or ""),
                        "samplingIdentity": sampling_identity(zone),
                    }
                    for zone in zones
                ),
                key=lambda row: json.dumps(
                    row,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ),
            ),
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def wave_asset_lineage_identity(source: Any) -> dict[str, Any] | None:
    """Return the immutable cross-target lineage of one admitted WAM row."""
    if not isinstance(source, dict):
        return None
    value = {
        "collection": str(source.get("collection") or ""),
        "nativeValidTime": canonical_time(source.get("nativeValidTime")),
        "modelRun": canonical_time(source.get("modelRun")),
        "itemId": str(source.get("itemId") or ""),
        "assetIdentitySha256": str(
            source.get("assetIdentitySha256") or ""
        ),
        "assetSizeBytes": source.get("assetSizeBytes"),
        "itemCreatedAt": canonical_time(source.get("itemCreatedAt")),
        "itemUpdatedAt": canonical_time(source.get("itemUpdatedAt")),
        "gridDefinitionSha256": str(
            source.get("gridDefinitionSha256") or ""
        ),
        "contentSha256": str(source.get("contentSha256") or ""),
    }
    if (
        not value["collection"]
        or not value["nativeValidTime"]
        or not value["modelRun"]
        or not value["itemId"]
        or (
            value["assetSizeBytes"] is not None
            and (
                not isinstance(value["assetSizeBytes"], int)
                or isinstance(value["assetSizeBytes"], bool)
                or value["assetSizeBytes"] <= 0
            )
        )
        or not re.fullmatch(
            r"[0-9a-f]{64}", value["assetIdentitySha256"]
        )
        or not re.fullmatch(
            r"[0-9a-f]{64}", value["gridDefinitionSha256"]
        )
        or not re.fullmatch(r"[0-9a-f]{64}", value["contentSha256"])
    ):
        return None
    return value


def wave_asset_cache_proof_coherent(
    summary: Any,
    *,
    require_complete: bool = False,
) -> bool:
    """Validate the aggregate receipt without exposing target or lineage IDs."""
    if not isinstance(summary, dict):
        return False
    required_count = summary.get("requiredCount")
    accepted_count = summary.get("acceptedCount")
    rejected_count = summary.get("rejectedCount")
    if any(
        not isinstance(value, int)
        or isinstance(value, bool)
        or value < 0
        for value in (required_count, accepted_count, rejected_count)
    ):
        return False
    return bool(
        summary.get("schemaVersion") == WAVE_ASSET_CACHE_PROOF_SCHEMA
        and summary.get("admissionPolicy") == WAVE_ASSET_ADMISSION_POLICY
        and summary.get("waveOwnerPolicyId") == WAVE_OWNER_POLICY_ID
        and required_count > 0
        and accepted_count > 0
        and accepted_count + rejected_count == required_count
        and (not require_complete or accepted_count == required_count)
        and summary.get("acceptedLineageCount") == 1
        and summary.get("acceptedLineageEvidenceCount") == accepted_count
        and re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("acceptedLineageSha256") or ""),
        )
        and re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("rawContentSha256") or ""),
        )
        and re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("targetRegistrySha256") or ""),
        )
        and re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("acceptedTargetSetSha256") or ""),
        )
        and re.fullmatch(
            r"[0-9a-f]{64}",
            str(summary.get("rejectedTargetSetSha256") or ""),
        )
    )


def private_wave_bootstrap_asset_summary(
    result: dict[str, Any],
    zones: list[dict[str, Any]],
    collection: str,
    asset: Any,
) -> dict[str, Any]:
    rejected: dict[str, int] = {}
    accepted = 0
    accepted_zone_ids: list[str] = []
    rejected_zone_ids: list[str] = []
    accepted_content_sha256: set[str] = set()
    accepted_lineages: set[str] = set()
    accepted_lineage_evidence_count = 0
    for zone in zones:
        code = private_wave_bootstrap_hour_rejection_code(
            result,
            zone,
            collection,
            asset,
        )
        if code is None:
            accepted += 1
            zone_id = str(zone.get("id") or "")
            accepted_zone_ids.append(zone_id)
            point = (result.get("zones") or {}).get(zone_id) or {}
            hour = (point.get("hourly") or {}).get(asset.valid_time) or {}
            content_sha256 = str(
                ((hour.get("sources") or {}).get("wave") or {}).get(
                    "contentSha256"
                ) or ""
            )
            if content_sha256:
                accepted_content_sha256.add(content_sha256)
            lineage = wave_asset_lineage_identity(
                (hour.get("sources") or {}).get("wave")
            )
            if lineage is not None:
                accepted_lineage_evidence_count += 1
                accepted_lineages.add(json.dumps(
                    lineage,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ))
        else:
            rejected[code] = rejected.get(code, 0) + 1
            rejected_zone_ids.append(str(zone.get("id") or ""))
    return {
        "schemaVersion": WAVE_ASSET_CACHE_PROOF_SCHEMA,
        "admissionPolicy": WAVE_ASSET_ADMISSION_POLICY,
        "waveOwnerPolicyId": WAVE_OWNER_POLICY_ID,
        "requiredCount": len(zones),
        "acceptedCount": accepted,
        "rejectedCount": len(zones) - accepted,
        "rejectedByCode": dict(sorted(rejected.items())),
        "targetRegistrySha256": wave_target_registry_sha256(
            collection,
            zones,
        ),
        "acceptedTargetSetSha256": wave_target_set_sha256(
            accepted_zone_ids
        ),
        "rejectedTargetSetSha256": wave_target_set_sha256(
            rejected_zone_ids
        ),
        "acceptedLineageCount": len(accepted_lineages),
        "acceptedLineageEvidenceCount": accepted_lineage_evidence_count,
        "acceptedLineageSha256": (
            hashlib.sha256(
                next(iter(accepted_lineages)).encode("utf-8")
            ).hexdigest()
            if len(accepted_lineages) == 1
            else None
        ),
        "rawContentSha256": (
            next(iter(accepted_content_sha256))
            if len(accepted_content_sha256) == 1
            else None
        ),
    }


def observed_wave_asset_rejections(
    diagnostics: dict[str, Any],
    staged: dict[str, Any],
    zones: list[dict[str, Any]],
    collection: str,
    asset: Any,
) -> dict[str, int]:
    """Collapse transient per-target parser outcomes before any checkpoint."""
    scalar_rejections = diagnostics.get("rejectedScalarTuples")
    if not isinstance(scalar_rejections, dict):
        scalar_rejections = {}
    counts: dict[str, int] = {}
    for zone in zones:
        if private_wave_bootstrap_hour_rejection_code(
            staged,
            zone,
            collection,
            asset,
        ) is None:
            continue
        zone_id = str(zone.get("id") or "")
        observed = scalar_rejections.get(zone_id)
        if not isinstance(observed, dict):
            observed = {}
        code = str(observed.get("wave") or "").strip()
        if not code:
            code = str(private_wave_bootstrap_hour_rejection_code(
                staged,
                zone,
                collection,
                asset,
            ) or "UNCLASSIFIED_WAVE_REJECTION")
        counts[code] = counts.get(code, 0) + 1
    return dict(sorted(counts.items()))


def clear_wave_target_rejection_diagnostics(
    diagnostics: dict[str, Any],
    zones: list[dict[str, Any]],
) -> None:
    """Remove private per-target outcomes after their aggregate is captured."""
    scalar_rejections = diagnostics.get("rejectedScalarTuples")
    if not isinstance(scalar_rejections, dict):
        return
    for zone in zones:
        scalar_rejections.pop(str(zone.get("id") or ""), None)
    if not scalar_rejections:
        diagnostics.pop("rejectedScalarTuples", None)


class MappingWaveAsset:
    """Attribute view of a normal STAC asset for exact wave provenance checks."""

    def __init__(
        self,
        asset: dict[str, Any],
        model_run: str,
        *,
        official_identity: dict[str, Any] | None = None,
    ) -> None:
        self.valid_time = str(
            asset.get("valid") or asset.get("validTime") or ""
        )
        self.model_run = model_run
        self.item_id = str(asset.get("id") or asset.get("itemId") or "")
        self.asset_identity_sha256 = str(
            asset.get("assetIdentitySha256") or ""
        )
        self.official_identity = official_identity


def salvage_invalid_private_wave_rows(
    result: dict[str, Any],
    parts: list[dict[str, Any]],
    registry: Any,
) -> dict[str, Any]:
    """Remove only independently invalid PART/hour wave components.

    Valid wave rows and every non-wave component remain untouched.  This makes
    a malformed legacy row repairable without restarting the complete cache.
    """
    removed_rows = 0
    retained_rows = 0
    rejected_by_code: dict[str, int] = {}
    provenance_by_id = {
        part.cache_key: part.provenance_entity
        for part in registry.parts
    }
    owner_by_id = {
        str(part.get("id") or ""): wave_owner_for_target(part)
        for part in parts
    }
    for zone in parts:
        zone_id = str(zone.get("id") or "")
        point = (result.get("zones") or {}).get(zone_id)
        if not isinstance(point, dict):
            continue
        valid_wave_rows = 0
        for valid_time, hour in (point.get("hourly") or {}).items():
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
            if not had_wave:
                continue
            code = native_wave_row_error_code(
                valid_time=valid_time,
                hour=hour,
                entity_id=zone_id,
                provenance_entity=provenance_by_id.get(zone_id) or {},
                expected_collection=owner_by_id.get(zone_id),
            )
            if code is None:
                retained_rows += 1
                valid_wave_rows += 1
                continue
            rejected_by_code[code] = rejected_by_code.get(code, 0) + 1
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
            removed_rows += 1
        if valid_wave_rows == 0:
            for key in (
                "significant-wave-height",
                "dominant-wave-period",
                "mean-wave-dir",
            ):
                (point.get("gridPoints") or {}).pop(key, None)
                (point.get("collections") or {}).pop(key, None)
    return {
        "removedRowCount": removed_rows,
        "retainedValidRowCount": retained_rows,
        "rejectedByCode": dict(sorted(rejected_by_code.items())),
    }


def execute_private_wave_history_bootstrap(
    result: dict[str, Any],
    zones: list[dict[str, Any]],
    budget: dict[str, int],
    fresh_zone_ids: set[str],
    configuration: dict[str, Any],
    *,
    registry: Any | None = None,
    checkpoint_controller: Any | None = None,
    supervisor_skipped_assets: set[str] | None = None,
    post_bootstrap_reserve_seconds: float = 0.0,
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
    wave_owners = {
        str(part.get("id") or ""): wave_owner_for_target(part)
        for part in parts
    }
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
    owns_controller = checkpoint_controller is None
    controller = checkpoint_controller or ProgressCheckpointController(
        result,
        fresh_zone_ids,
        budget,
    )
    supervised_skips = supervisor_skipped_assets or set()
    supervised_skipped_hours: dict[str, set[str]] = {}
    if configuration["mode"] == WAVE_BOOTSTRAP_COLD_START_MODE:
        if registry is None:
            raise RuntimeError("private WAM cold bootstrap registry is missing")
        try:
            cached_summary = validate_wave_history_cache(
                result,
                registry,
                target_hour=configuration["targetHour"],
                policy=configuration["policy"],
                wave_owner_by_part=wave_owners,
            )
        except WaveBootstrapError as exc:
            # Cache-first is an optimisation, never permission to infer native
            # provenance. Salvage only independently invalid wave rows; valid
            # rows and all other components remain reusable.
            aggregate["cacheFirst"] = {
                "status": "incomplete",
                "failureCode": exc.code,
            }
            if exc.code in {
                "MISSING_WAVE_FIELD",
                "INVALID_WAVE_TUPLE",
                "MISSING_DIRECTION",
                "MISSING_PROVENANCE",
                "MISSING_CELL",
                "WAVE_DISTANCE_OUT_OF_BOUNDS",
                "WAVE_OWNER_MISMATCH",
                "INVALID_PROVENANCE",
                "FUTURE_RUN",
            }:
                salvage = salvage_invalid_private_wave_rows(
                    result, parts, registry,
                )
                aggregate["cacheFirst"]["salvage"] = salvage
                controller.mark_bulk_dirty()
                controller.flush_if_due(force=True)
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
                controller.mark_bulk_dirty()
                controller.flush_if_due(force=True)
                return locked
            aggregate["cacheFirst"] = {
                "status": "incomplete",
                "failureCode": "EXACT_NATIVE_CACHE_REQUIRED",
            }
        # A genuine cold start permits incomplete measured history. Its
        # mandatory network work is the operational target/lag bridge and
        # forecast axis, acquired by the normal WAM loop below. Retain and
        # validate existing history here, but never spend that critical budget
        # rebuilding a coherent 49-hour historical asset plan. This helper is
        # deliberately not moved after operational acquisition: its historical
        # plan also contains target and could overwrite a newly admitted row.
        aggregate["status"] = "history-incomplete"
        aggregate["historyIncomplete"] = True
        aggregate["historyIncompleteCode"] = "HISTORY_INCOMPLETE"
        aggregate["historyNetworkDeferred"] = True
        aggregate["lockedHourCount"] = 0
        controller.mark_bulk_dirty()
        controller.flush_if_due(force=True)
        return locked
    bootstrap_collections = [
        collection for collection in sorted(
            WAVE_BOOTSTRAP_COLLECTIONS,
            key=COLLECTION_ORDER.index,
        )
        if relevant_zones(collection, parts)
    ]
    bootstrap_reserve_by_collection, bootstrap_reserve_total = (
        wam_runtime_reserve(
            bootstrap_collections,
            runtime_remaining(),
            lead_reserve_seconds=post_bootstrap_reserve_seconds,
        )
    )
    aggregate["postBootstrapRuntimeReserveSeconds"] = round(
        max(0.0, post_bootstrap_reserve_seconds), 3,
    )
    aggregate["runtimeReserveSeconds"] = round(
        bootstrap_reserve_total, 3,
    )
    aggregate["runtimeReserveSecondsByCollection"] = {
        collection: round(seconds, 3)
        for collection, seconds in bootstrap_reserve_by_collection.items()
    }
    runtime_reserved_hours: dict[str, set[str]] = {}
    for collection_index, collection in enumerate(bootstrap_collections):
        relevant = relevant_zones(collection, parts)
        later_collections = bootstrap_collections[collection_index + 1:]
        preserve_for_later_wam = sum(
            bootstrap_reserve_by_collection.get(later, 0.0)
            for later in later_collections
        ) + max(0.0, post_bootstrap_reserve_seconds)
        if not collection_retry_eligible(
            result.setdefault("collectionState", {}).setdefault(
                collection, {}
            )
        ):
            locked[collection] = set()
            aggregate["collections"][collection] = {
                "status": "history-incomplete",
                "failureCode": "RETRY_COOLDOWN_ACTIVE",
                "partCount": len(relevant),
                "selectedAssetCount": 0,
                "processedAssetCount": 0,
            }
            aggregate["historyIncomplete"] = True
            aggregate["historyIncompleteCode"] = "RETRY_COOLDOWN_ACTIVE"
            continue
        if should_stop_work():
            controller.flush_if_due(force=True)
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
                controller.flush_if_due(force=True)
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
            controller.mark_bulk_dirty()
            controller.flush_if_due(force=True)
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
            "assetsSkippedBySupervisor": 0,
        }
        aggregate["collections"][collection] = collection_summary
        locked[collection] = set()
        expected_locked_hours = {
            asset.valid_time for asset in assets
            if epoch(asset.valid_time) < epoch(configuration["targetHour"])
        }
        for asset_number, asset in enumerate(assets, start=1):
            private_asset_reference = {
                **asset.download_reference(),
                "assetIdentitySha256": asset.asset_identity_sha256,
            }
            private_official_identity = official_wave_asset_identity(
                collection,
                asset.model_run,
                private_asset_reference,
            )
            if private_official_identity is None:
                controller.flush_if_due(force=True)
                raise RuntimeError(
                    "private WAM bootstrap asset identity is incomplete"
                )
            verified_asset = MappingWaveAsset(
                private_asset_reference,
                asset.model_run,
                official_identity=private_official_identity,
            )
            cached_asset_summary = private_wave_bootstrap_asset_summary(
                result,
                relevant,
                collection,
                verified_asset,
            )
            already_complete = wave_asset_cache_proof_coherent(
                cached_asset_summary,
                require_complete=True,
            )
            if already_complete:
                collection_summary["reusedCompleteAssetCount"] += 1
                if asset.valid_time in expected_locked_hours:
                    locked[collection].add(asset.valid_time)
                continue
            if not controller.can_start_asset(
                reserve_seconds=preserve_for_later_wam,
            ):
                if preserve_for_later_wam <= 0:
                    controller.flush_if_due(force=True)
                    raise RuntimeError(
                        "private WAM bootstrap runtime budget reached"
                    )
                runtime_reserved_hours.setdefault(collection, set()).add(
                    asset.valid_time
                )
                collection_summary["runtimeReservedAssetCount"] = int(
                    collection_summary.get("runtimeReservedAssetCount") or 0
                ) + 1
                if collection_summary["runtimeReservedAssetCount"] == 1:
                    collection_summary["status"] = "history-incomplete"
                    collection_summary["failureCode"] = (
                        "CRITICAL_WAM_RUNTIME_RESERVED"
                    )
                    result["diagnostics"].setdefault(
                        "schedulerYields", []
                    ).append({
                        "collection": collection,
                        "reasonCode": "CRITICAL_WAM_RUNTIME_RESERVED",
                        "reservedForCollections": later_collections,
                        "reservedSeconds": round(
                            preserve_for_later_wam, 3,
                        ),
                        "partialProgressPreserved": True,
                    })
                continue
            supervised_asset = {
                "valid": asset.valid_time,
                "id": asset.item_id,
                "href": asset.href,
                "size": asset.size_bytes,
                "itemCreatedAt": asset.item_created_at,
                "itemUpdatedAt": asset.item_updated_at,
            }
            supervised_identity = supervised_asset_identity(
                collection,
                asset.model_run,
                supervised_asset,
            )
            if supervised_asset_identity_key(supervised_identity) in supervised_skips:
                collection_summary["assetsSkippedBySupervisor"] += 1
                supervised_skipped_hours.setdefault(collection, set()).add(
                    asset.valid_time
                )
                result["diagnostics"].setdefault(
                    "assetsSkippedBySupervisor", []
                ).append({
                    **supervised_identity,
                    "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                })
                result["diagnostics"].setdefault("errors", []).append({
                    "collection": collection,
                    "validTime": supervised_identity["validTime"],
                    "message": "one bounded private WAM asset was skipped after a timeout",
                    "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                    "partialProgressPreserved": True,
                })
                progress(
                    f"{collection}: skipping stalled private WAM asset "
                    f"{asset_number}/{len(assets)}; later operational processing continues"
                )
                continue
            try:
                with supervised_asset_operation(supervised_identity):
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
            except Exception:
                controller.flush_if_due(force=True)
                raise
            if reused:
                result["diagnostics"]["reusedAssets"] = int(
                    result["diagnostics"].get("reusedAssets") or 0
                ) + 1
            progress(
                f"{collection}: privat WAM-bootstrap {asset_number}/{len(assets)} "
                f"({'genbrugt' if reused else 'downloadet'})"
            )
            asset_processing_started = time.monotonic()
            staged_asset_summary: dict[str, Any] = {}
            staged_asset_rejections: dict[str, int] = {}
            asset_coverage = collection_summary.setdefault("assetCoverage", {})
            clear_wave_target_rejection_diagnostics(
                result["diagnostics"],
                relevant,
            )

            def bootstrap_stage_complete(
                staged_result: dict[str, Any],
                _private_stage: dict[str, Any] | None,
                outcome: tuple[set[str], set[str], bool, int, int],
            ) -> bool:
                summary = private_wave_bootstrap_asset_summary(
                    staged_result,
                    relevant,
                    collection,
                    verified_asset,
                )
                staged_asset_summary.clear()
                staged_asset_summary.update(summary)
                staged_asset_rejections.clear()
                staged_asset_rejections.update(observed_wave_asset_rejections(
                    result["diagnostics"],
                    staged_result,
                    relevant,
                    collection,
                    verified_asset,
                ))
                return operational_wave_asset_stage_admissible(
                    result,
                    staged_result,
                    relevant,
                    collection,
                    verified_asset,
                    summary,
                    outcome,
                )

            try:
                with supervised_asset_operation(supervised_identity):
                    found, touched, interrupted, messages_seen, zone_lookups = process_grib_transactionally(
                        path, collection, asset.model_run, asset.valid_time, relevant,
                        result, result["diagnostics"],
                        failure_flush=lambda: controller.flush_if_due(force=True),
                        stage_validator=bootstrap_stage_complete,
                        validation_error="private WAM bootstrap GRIB tuple is missing",
                    )
            except (
                DmiGridLookupError,
                KeyError,
                TypeError,
                IndexError,
                AttributeError,
                ValueError,
                RuntimeError,
                OSError,
            ) as exc:
                if staged_asset_summary:
                    accumulate_wave_asset_coverage(
                        asset_coverage,
                        staged_asset_summary,
                        admitted=False,
                        observed_rejected_by_code=staged_asset_rejections,
                    )
                collection_summary["failedAssetCount"] = int(
                    collection_summary.get("failedAssetCount") or 0
                ) + 1
                result["diagnostics"].setdefault("errors", []).append({
                    "collection": collection,
                    "validTime": supervised_identity["validTime"],
                    "message": safe_error_message(exc),
                    "failureCode": collection_failure_code(exc),
                    "failureClass": "private-wave-history-asset",
                    "partialProgressPreserved": False,
                    "activeCachePreserved": True,
                })
                controller.mark_bulk_dirty()
                controller.flush_if_due(force=True)
                continue
            asset_processing_seconds = time.monotonic() - asset_processing_started
            clear_wave_target_rejection_diagnostics(
                result["diagnostics"],
                relevant,
            )
            result["diagnostics"]["messagesSeen"] = int(
                result["diagnostics"].get("messagesSeen") or 0
            ) + messages_seen
            result["diagnostics"]["zoneLookups"] = int(
                result["diagnostics"].get("zoneLookups") or 0
            ) + zone_lookups
            if interrupted:
                raise RuntimeError("private WAM bootstrap runtime budget reached inside GRIB processing")
            if not {"significant-wave-height", "dominant-wave-period"} <= found:
                raise RuntimeError("private WAM bootstrap GRIB tuple is incomplete")
            accepted_count = int(staged_asset_summary.get("acceptedCount") or 0)
            required_count = int(staged_asset_summary.get("requiredCount") or 0)
            accumulate_wave_asset_coverage(
                asset_coverage,
                staged_asset_summary,
                admitted=True,
                observed_rejected_by_code=staged_asset_rejections,
            )
            fresh_zone_ids.update(touched)
            collection_summary["processedAssetCount"] += 1
            complete_asset = required_count > 0 and accepted_count == required_count
            if complete_asset and asset.valid_time in expected_locked_hours:
                locked[collection].add(asset.valid_time)
            checkpoint_written = controller.note_committed_asset(
                seconds=asset_processing_seconds,
            )
            if checkpoint_written:
                progress(
                    f"{collection}: fælles progress-checkpoint gemt"
                )
        missing_locked_hours = expected_locked_hours - locked[collection]
        if missing_locked_hours:
            supervised_missing = supervised_skipped_hours.get(collection, set())
            reserved_missing = runtime_reserved_hours.get(collection, set())
            if (
                configuration["mode"] != WAVE_BOOTSTRAP_COLD_START_MODE
                and not missing_locked_hours <= supervised_missing | reserved_missing
            ):
                controller.flush_if_due(force=True)
                raise RuntimeError("private WAM bootstrap did not lock every selected valid hour")
            collection_summary["status"] = "history-incomplete"
            collection_summary["missingLockedHourCount"] = len(missing_locked_hours)
            aggregate["historyIncomplete"] = True
            aggregate["historyIncompleteCode"] = (
                "CRITICAL_WAM_RUNTIME_RESERVED"
                if missing_locked_hours & reserved_missing
                else "ASSET_PROCESSING_WATCHDOG_TIMEOUT"
                if missing_locked_hours <= supervised_missing
                else "PARTIAL_NATIVE_COVERAGE"
            )
    if set(locked) != set(WAVE_BOOTSTRAP_COLLECTIONS):
        controller.flush_if_due(force=True)
        raise RuntimeError("private WAM bootstrap lacks one required collection")
    aggregate["status"] = (
        "history-incomplete" if aggregate.get("historyIncomplete") else "history-complete"
    )
    aggregate["lockedHourCount"] = sum(len(hours) for hours in locked.values())
    controller.mark_bulk_dirty()
    if owns_controller:
        controller.flush_if_due(force=True)
    return locked

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


def load_bulk_document(path: pathlib.Path) -> dict[str, Any]:
    """Read an encoded cache or explicitly migrate one bounded legacy cache."""
    try:
        value = read_dmi_bulk_document(
            path,
            optional=True,
            allow_large_legacy=True,
        )
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def sanitize_reusable_cache_document_leaves(document: Any) -> dict[str, Any]:
    """Drop malformed cache leaves without weakening document/proof identity.

    The report is aggregate-only.  It deliberately contains no zone ids, times,
    coordinates, values or source payloads.  Invalid component provenance and
    its values are removed together, so sanitation can only create real gaps.
    The ordinary exact ledger/attestation pass still decides which retained
    current pairs are authorized after this structural pass.
    """
    counters = {
        "droppedZoneCount": 0,
        "resetContainerCount": 0,
        "droppedHourCount": 0,
        "droppedSourceComponentCount": 0,
        "droppedGridPointCount": 0,
    }
    if not isinstance(document, dict) or not isinstance(document.get("zones"), dict):
        return {}
    component_fields = {
        "current": ("current-u", "current-v"),
        "wind": ("wind-u-10m", "wind-v-10m", "wind-speed-10m", "wind-dir-10m"),
        "windTail": ("wind-tail-u-10m", "wind-tail-v-10m", "wind-tail-speed-10m", "wind-tail-dir-10m"),
        "wave": ("significant-wave-height", "dominant-wave-period", "mean-wave-dir"),
        "waterLevel": ("sea-mean-deviation",),
        "waterTemperature": ("water-temperature",),
    }
    vector_summary_pairs = {
        "current-u": ("current-u", "current-v"),
        "current-v": ("current-u", "current-v"),
        "wind-u-10m": ("wind-u-10m", "wind-v-10m"),
        "wind-v-10m": ("wind-u-10m", "wind-v-10m"),
        "wind-tail-u-10m": ("wind-tail-u-10m", "wind-tail-v-10m"),
        "wind-tail-v-10m": ("wind-tail-u-10m", "wind-tail-v-10m"),
    }

    zones = document["zones"]
    for zone_id in list(zones):
        zone = zones.get(zone_id)
        if not isinstance(zone, dict):
            zones.pop(zone_id, None)
            counters["droppedZoneCount"] += 1
            continue
        for container_name in ("hourly", "gridPoints", "collections"):
            value = zone.get(container_name)
            if value is not None and not isinstance(value, dict):
                zone[container_name] = {}
                counters["resetContainerCount"] += 1
        if zone.get("marineSelection") is not None and not isinstance(
            zone.get("marineSelection"), dict
        ):
            zone.pop("marineSelection", None)
            counters["resetContainerCount"] += 1

        grid_points = zone.get("gridPoints") or {}
        collections = zone.get("collections") or {}
        invalid_summary_keys = [
            key for key, value in grid_points.items()
            if value is not None and not isinstance(value, dict)
        ]
        summary_keys_to_remove: set[str] = set()
        for key in invalid_summary_keys:
            summary_keys_to_remove.update(vector_summary_pairs.get(key, (key,)))
        for key in summary_keys_to_remove:
            if key in grid_points:
                counters["droppedGridPointCount"] += 1
            grid_points.pop(key, None)
            collections.pop(key, None)

        hourly = zone.get("hourly") or {}
        for valid_time in list(hourly):
            hour = hourly.get(valid_time)
            if (
                not isinstance(hour, dict)
                or canonical_time(valid_time) is None
                or canonical_time(hour.get("time")) != canonical_time(valid_time)
            ):
                hourly.pop(valid_time, None)
                counters["droppedHourCount"] += 1
                continue
            sources = hour.get("sources")
            if sources is None:
                continue
            if not isinstance(sources, dict):
                for fields in component_fields.values():
                    for field in fields:
                        hour.pop(field, None)
                hour.pop("sources", None)
                counters["droppedSourceComponentCount"] += 1
                continue
            for component in list(sources):
                source = sources.get(component)
                grid_point = source.get("gridPoint") if isinstance(source, dict) else None
                invalid_grid_point = (
                    isinstance(source, dict)
                    and "gridPoint" in source
                    and not (
                        isinstance(grid_point, (list, tuple))
                        and len(grid_point) == 2
                        and all(
                            isinstance(value, (int, float))
                            and not isinstance(value, bool)
                            and math.isfinite(float(value))
                            for value in grid_point
                        )
                    )
                )
                if source is None:
                    sources.pop(component, None)
                    continue
                if not isinstance(source, dict) or invalid_grid_point:
                    for field in component_fields.get(component, ()):
                        hour.pop(field, None)
                    sources.pop(component, None)
                    counters["droppedSourceComponentCount"] += 1
            if not sources:
                hour.pop("sources", None)

    dropped_total = sum(counters.values())
    if dropped_total == 0:
        return {}
    report = {
        "schemaVersion": 1,
        "status": "SALVAGED_INVALID_LEAVES",
        "code": "DMI_CACHE_INVALID_LEAVES_DROPPED",
        **counters,
        "droppedLeafCount": dropped_total,
    }
    diagnostics = document.setdefault("diagnostics", {})
    if isinstance(diagnostics, dict):
        diagnostics["cacheLeafSanitization"] = report
    return report


def reusable_cache_document_shape(document: Any) -> bool:
    """Reject cache shapes that can fail before the first safe checkpoint."""
    if not isinstance(document, dict) or not isinstance(document.get("zones"), dict):
        return False
    for key in ("runs", "collectionState", "diagnostics"):
        value = document.get(key)
        if value is not None and not isinstance(value, dict):
            return False
    for run in (document.get("runs") or {}).values():
        if not isinstance(run, dict):
            return False
    for state in (document.get("collectionState") or {}).values():
        if not isinstance(state, dict):
            return False
    diagnostics = document.get("diagnostics") or {}
    errors = diagnostics.get("errors")
    if errors is not None and (
        not isinstance(errors, list)
        or any(not isinstance(error, dict) for error in errors)
    ):
        return False
    horizon_coverage = diagnostics.get("componentHorizonCoverage")
    if horizon_coverage is not None and not isinstance(horizon_coverage, dict):
        return False
    for family in ("wind", "marine"):
        coverage = (horizon_coverage or {}).get(family)
        if coverage is not None and not isinstance(coverage, dict):
            return False
        covered_zones = (coverage or {}).get("zonesWith96Hours")
        if covered_zones is not None and (
            isinstance(covered_zones, bool)
            or not isinstance(covered_zones, int)
            or covered_zones < 0
        ):
            return False
    zone_count = diagnostics.get("zoneCount")
    if zone_count is not None and (
        isinstance(zone_count, bool)
        or not isinstance(zone_count, int)
        or zone_count < 0
    ):
        return False
    persistent_inventory = diagnostics.get("persistentFieldInventory")
    if persistent_inventory is not None and not isinstance(persistent_inventory, dict):
        return False
    retention_hours = document.get("privateReplayRetentionHours")
    if retention_hours is not None and (
        isinstance(retention_hours, bool)
        or not isinstance(retention_hours, int)
        or retention_hours < 0
    ):
        return False
    for zone in document["zones"].values():
        if not isinstance(zone, dict):
            return False
        for key in ("hourly", "gridPoints", "collections"):
            value = zone.get(key)
            if value is not None and not isinstance(value, dict):
                return False
        marine_selection = zone.get("marineSelection")
        if marine_selection is not None and not isinstance(marine_selection, dict):
            return False
        for grid_point in (zone.get("gridPoints") or {}).values():
            if grid_point is not None and not isinstance(grid_point, dict):
                return False
        for hour in (zone.get("hourly") or {}).values():
            if not isinstance(hour, dict):
                return False
            sources = hour.get("sources")
            if sources is not None and not isinstance(sources, dict):
                return False
            for source in (sources or {}).values():
                if source is not None and not isinstance(source, dict):
                    return False
    return True


def quarantine_invalid_output_cache(path: pathlib.Path) -> pathlib.Path:
    """Move untrusted candidate bytes aside without disclosing their content."""
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    digest_text = digest.hexdigest()
    quarantine = path.with_name(f"{path.name}.invalid-{digest_text[:16]}")
    os.replace(path, quarantine)
    print(
        "Quarantined structurally invalid private DMI candidate; "
        f"contentSha256Prefix={digest_text[:12]}.",
        flush=True,
    )
    return quarantine


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
    validated_donor_current_asset_proofs: list[dict[str, Any]] | None = None,
    validated_primary_current_asset_proofs: list[dict[str, Any]] | None = None,
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
            existing = primary_container.setdefault(key, copy.deepcopy(value))
            if (
                container_name == "runs"
                and key in MARINE_COLLECTIONS
                and isinstance(existing, dict)
                and isinstance(value, dict)
                and all(
                    existing.get(field) == value.get(field)
                    for field in (
                        "referenceTime",
                        "parserVersion",
                        "parameterMapVersion",
                        "gridLookupVersion",
                        "processingSignature",
                    )
                )
                and isinstance(existing.get("processedSteps"), dict)
                and isinstance(value.get("processedSteps"), dict)
            ):
                for valid_time, step in value["processedSteps"].items():
                    existing["processedSteps"].setdefault(
                        valid_time, copy.deepcopy(step)
                    )
                existing["processedValidTimes"] = sorted(
                    str(valid_time)
                    for valid_time in existing["processedSteps"]
                )
    primary_zones = primary.setdefault("zones", {})
    donor_zones = donor.get("zones") or {}
    if not isinstance(primary_zones, dict) or not isinstance(donor_zones, dict):
        return
    def proof_pair_source_keys(
        proofs: list[dict[str, Any]] | None,
    ) -> set[tuple[str, str, str]]:
        return {
            (
                str(part_id or "").strip(),
                source["validTime"],
                json.dumps(
                    source,
                    sort_keys=True,
                    separators=(",", ":"),
                    ensure_ascii=False,
                ),
            )
            for proof in (proofs or [])
            for source in [
                canonical_current_source_asset(proof.get("sourceAsset"))
            ]
            if source is not None
            for part_id in (proof.get("attestedPartIds") or [])
        }

    trusted_donor_current_pair_sources = proof_pair_source_keys(
        validated_donor_current_asset_proofs
    )
    trusted_primary_current_pair_sources = proof_pair_source_keys(
        validated_primary_current_asset_proofs
    )

    component_row_fields = {
        "current": ("current-u", "current-v"),
        "wind": (
            "wind-u-10m", "wind-v-10m",
            "wind-speed-10m", "wind-dir-10m",
        ),
        "windTail": (
            "wind-tail-u-10m", "wind-tail-v-10m",
            "wind-tail-speed-10m", "wind-tail-dir-10m",
        ),
        "wave": (
            "significant-wave-height", "dominant-wave-period", "mean-wave-dir",
        ),
        "waterLevel": ("sea-mean-deviation",),
        "waterTemperature": ("water-temperature",),
    }

    def backfill_native_component(
        primary_zone: dict[str, Any],
        donor_zone: dict[str, Any],
        primary_hourly: dict[str, Any],
        primary_row: dict[str, Any],
        donor_row: dict[str, Any],
        zone_id: str,
        valid_time: str,
        component: str,
    ) -> dict[str, Any]:
        required_fields = tuple(COMPONENT_FIELD_SET[component])
        if _exact_validated_dmi_component_present(
            zone_id, primary_zone, valid_time, component, required_fields,
        ) or not _exact_validated_dmi_component_present(
            zone_id, donor_zone, valid_time, component, required_fields,
        ):
            return primary_row
        donor_source = ((donor_row.get("sources") or {}).get(component))
        optional_fields = tuple(
            donor_source.get("optionalFieldSet") or ()
        ) if isinstance(donor_source, dict) else ()
        if any(
            not isinstance(donor_row.get(field), (int, float))
            or isinstance(donor_row.get(field), bool)
            or not math.isfinite(float(donor_row[field]))
            for field in optional_fields
        ):
            return primary_row
        copied_fields = (*required_fields, *optional_fields)
        replacement = copy.deepcopy(primary_row)
        for field in component_row_fields[component]:
            replacement.pop(field, None)
        for field in copied_fields:
            replacement[field] = copy.deepcopy(donor_row[field])
        replacement_sources = replacement.get("sources")
        if not isinstance(replacement_sources, dict):
            replacement_sources = {}
        else:
            replacement_sources = copy.deepcopy(replacement_sources)
        replacement_sources[component] = copy.deepcopy(donor_source)
        replacement["sources"] = replacement_sources
        candidate_zone = {
            **primary_zone,
            "hourly": {valid_time: replacement},
        }
        if not _exact_validated_dmi_component_present(
            zone_id, candidate_zone, valid_time, component, required_fields,
        ):
            return primary_row

        donor_grid_points = donor_zone.get("gridPoints") or {}
        donor_collections = donor_zone.get("collections") or {}
        summary = {
            field: (
                copy.deepcopy(donor_grid_points.get(field)),
                donor_collections.get(field),
            )
            for field in copied_fields
        }
        primary_hourly[valid_time] = replacement
        primary_grid_points = primary_zone.setdefault("gridPoints", {})
        primary_collections = primary_zone.setdefault("collections", {})
        if not isinstance(primary_grid_points, dict):
            primary_grid_points = {}
            primary_zone["gridPoints"] = primary_grid_points
        if not isinstance(primary_collections, dict):
            primary_collections = {}
            primary_zone["collections"] = primary_collections
        for field in component_row_fields[component]:
            point, collection = summary.get(field, (None, None))
            if isinstance(point, dict) and collection == donor_source.get("collection"):
                primary_grid_points[field] = point
                primary_collections[field] = collection
            else:
                primary_grid_points.pop(field, None)
                primary_collections.pop(field, None)
        return replacement

    def row_has_trusted_current(
        row: dict[str, Any],
        zone_id: str,
        valid_time: str,
        trusted_keys: set[tuple[str, str, str]],
    ) -> bool:
        raw_source = ((row.get("sources") or {}).get("current"))
        source = canonical_current_source_asset(raw_source)
        canonical_valid_time = canonical_time(valid_time)
        if (
            source is None
            or canonical_valid_time is None
            or canonical_time(row.get("time")) != canonical_valid_time
            or source["validTime"] != canonical_valid_time
            or not all(
                isinstance(row.get(field), (int, float))
                and not isinstance(row.get(field), bool)
                and math.isfinite(float(row[field]))
                for field in ("current-u", "current-v")
            )
        ):
            return False
        source_key = json.dumps(
            source,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        )
        return bool(
            (
                zone_id[len("PART::"):],
                source["validTime"],
                source_key,
            ) in trusted_keys
        )
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
                # A wholly empty slot may inherit the donor's complete row.
                # Nonempty slots follow the independently proof-bound current
                # tuple rule below and never receive half a vector.
                primary_hourly[valid_time] = copy.deepcopy(donor_row)
                continue
            if not isinstance(primary_row, dict):
                continue
            for component in COMPONENT_FIELD_SET:
                if component == "current" and str(zone_id).startswith("PART::"):
                    continue
                primary_row = backfill_native_component(
                    primary_zone,
                    donor_zone,
                    primary_hourly,
                    primary_row,
                    donor_row,
                    str(zone_id),
                    valid_time,
                    component,
                )
            if not str(zone_id).startswith("PART::"):
                continue
            if row_has_trusted_current(
                primary_row,
                str(zone_id),
                valid_time,
                trusted_primary_current_pair_sources,
            ) or not row_has_trusted_current(
                donor_row,
                str(zone_id),
                valid_time,
                trusted_donor_current_pair_sources,
            ):
                continue
            # Current is an independently source-bound component, but its U/V
            # values and source proof are one indivisible tuple. Preserve every
            # unrelated primary component and source; copy both current values
            # together only from the exact proof-backed donor. A proof-backed
            # primary current tuple always wins.
            primary_sources = primary_row.get("sources")
            if not isinstance(primary_sources, dict):
                primary_sources = {}
            updated_sources = copy.deepcopy(primary_sources)
            updated_sources["current"] = copy.deepcopy(
                (donor_row.get("sources") or {})["current"]
            )
            primary_row.update({
                "current-u": copy.deepcopy(donor_row["current-u"]),
                "current-v": copy.deepcopy(donor_row["current-v"]),
                "sources": updated_sources,
            })

            # Zone-level current summaries are also one U/V unit. Preserve all
            # other component summaries. A complete donor pair may be copied;
            # otherwise remove only the two current summaries so the ordinary
            # post-merge clean pass regenerates them from the proven hourly
            # sources instead of deleting the tuple as mismatched.
            donor_grid_points = donor_zone.get("gridPoints") or {}
            donor_collections = donor_zone.get("collections") or {}
            donor_u_point = donor_grid_points.get("current-u")
            donor_v_point = donor_grid_points.get("current-v")
            donor_source = canonical_current_source_asset(
                ((donor_row.get("sources") or {}).get("current"))
            )
            donor_collection = (
                donor_source.get("collection") if donor_source is not None else None
            )
            donor_summary_complete = bool(
                same_grid_point(donor_u_point, donor_v_point)
                and donor_collections.get("current-u") == donor_collection
                and donor_collections.get("current-v") == donor_collection
            )
            primary_grid_points = primary_zone.setdefault("gridPoints", {})
            primary_collections = primary_zone.setdefault("collections", {})
            if not isinstance(primary_grid_points, dict):
                primary_grid_points = {}
                primary_zone["gridPoints"] = primary_grid_points
            if not isinstance(primary_collections, dict):
                primary_collections = {}
                primary_zone["collections"] = primary_collections
            primary_u_point = primary_grid_points.get("current-u")
            primary_v_point = primary_grid_points.get("current-v")
            primary_u_collection = primary_collections.get("current-u")
            primary_v_collection = primary_collections.get("current-v")
            primary_summary_complete = bool(
                same_grid_point(primary_u_point, primary_v_point)
                and primary_u_collection in MARINE_COLLECTIONS
                and primary_v_collection == primary_u_collection
            )
            if donor_summary_complete:
                primary_grid_points["current-u"] = copy.deepcopy(donor_u_point)
                primary_grid_points["current-v"] = copy.deepcopy(donor_v_point)
                primary_collections["current-u"] = donor_collection
                primary_collections["current-v"] = donor_collection
            elif not primary_summary_complete:
                for field in ("current-u", "current-v"):
                    primary_grid_points.pop(field, None)
                    primary_collections.pop(field, None)


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


def current_marine_processing_signature(zone_registry_signature: Any) -> str:
    signature = str(zone_registry_signature or "").strip()
    if not signature:
        raise ValueError("Current marine zone registry signature is missing")
    return (
        f"parser:{PARSER_VERSION}|params:{PARAMETER_MAP_VERSION}"
        f"|grid:{GRID_LOOKUP_VERSION}|eccodes-api:{ECCODES_API_VERSION}"
        f"|eccodes-binding:{ECCODES_BINDING_VERSION}|zones:{signature}"
    )


def _strict_current_donor_ready(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
) -> bool:
    """Validate a donor against the exact reference to which its ledger is bound."""
    try:
        ledger = ((document.get("diagnostics") or {}).get(
            "currentOperationalLedger"
        ))
        if not isinstance(ledger, dict):
            return False
        reference = production_reference_hour(ledger.get("productionReferenceAt"))
    except (TypeError, ValueError):
        return False
    return current_operational_cache_ready(document, targets, reference)


def _regional_sources_from_validated_ledger(
    ledger: dict[str, Any], expected_processing_signature: str,
) -> list[dict[str, Any]]:
    """Copy originals without native lifetime filtering or source flattening.

    Caller must already have fully validated this exact ledger and its bound
    attestation. Keeping separate entries lets regional migration detect
    competing original decoder/outcome proofs instead of choosing the last.
    """
    candidates: list[dict[str, Any]] = []
    entries = [
        (row.get("sourceAsset"), collection.get("processingSignature"),
         row.get("partOutcomeProof"))
        for collection in ledger.get("collections") or []
        for row in collection.get("validTimes") or []
        if row.get("state") in {"PROCESSED", "VERIFIED"}
    ]
    entries.extend(
        (proof.get("sourceAsset"), proof.get("processingSignature"),
         proof.get("partOutcomeProof"))
        for proof in ledger.get("retainedCurrentAssetProofs") or []
    )
    for raw_source, signature, outcome in entries:
        source = canonical_current_source_asset(raw_source)
        if (source is not None
                and source["collection"] == REGIONAL_PROXY_REQUIRED_COLLECTION
                and retained_current_processing_signature_compatible(
                    signature, expected_processing_signature,
                )):
            candidates.append({
                "sourceAsset": copy.deepcopy(source),
                "processingSignature": signature,
                "partOutcomeProof": copy.deepcopy(outcome),
            })
    return candidates


def _validated_candidate_retained_current_asset_proofs(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    expected_processing_signature: str,
    *,
    regional_source_proof_candidates: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Revalidate canonical pair/source evidence without trusting a legacy complement."""
    ledger = copy.deepcopy(
        ((document.get("diagnostics") or {}).get("currentOperationalLedger"))
    )
    if not isinstance(ledger, dict):
        return []
    donor_reference = production_reference_hour(ledger.get("productionReferenceAt"))
    donor_end = production_reference_hour(ledger.get("operationalRangeEndAt"))
    if donor_end != donor_reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS):
        return []
    registry_sha256 = target_fingerprint(targets)
    current_assets, retained_pair_sources = (
        current_attestation_authorization_from_operational_ledger(ledger)
    )
    actual_attestation = coastal_part_current_attestation(
        document,
        targets,
        donor_reference,
        donor_end,
        current_assets,
        retained_pair_sources,
    )
    original_regional_candidates: list[dict[str, Any]] = []
    if ledger.get("attestation") != sanitized_current_attestation(actual_attestation):
        identity_attestation = (
            canonical_pre_sanitize_current_identity_attestation(
                document,
                targets,
                donor_reference,
                donor_end,
                current_assets,
                retained_pair_sources,
            )
        )
        if (
            ledger.get("attestation")
            != sanitized_current_attestation(identity_attestation)
        ):
            return []
        if regional_source_proof_candidates is not None:
            try:
                # Validate the ORIGINAL ledger before native leaf sanitation
                # removes its final attested tuple. Identity recovery is not
                # native admission; only independent regional source outcomes
                # may survive here, after this complete original validation.
                validate_current_operational_availability_ledger(
                    ledger, identity_attestation, targets, donor_reference,
                    donor_end, registry_sha256,
                )
            except (TypeError, ValueError):
                # Keep the existing native recovery behavior unchanged. An
                # unvalidated original never contributes regional authority.
                pass
            else:
                original_regional_candidates = _regional_sources_from_validated_ledger(
                    ledger, expected_processing_signature,
                )
        # The original digest has now been reconstructed exactly. Rebuild the
        # derived fields only from rows accepted by the normal strict validator.
        actual_pair_source_keys = {
            (
                str(row.get("partId") or "").strip(),
                str(row.get("validTime") or ""),
                json.dumps(
                    canonical_current_source_asset(row.get("source")),
                    sort_keys=True,
                    separators=(",", ":"),
                    ensure_ascii=False,
                ),
            )
            for row in (actual_attestation.get("verifiedPairSources") or [])
            if canonical_current_source_asset(row.get("source")) is not None
        }
        retained_proofs = []
        for proof in validate_retained_current_asset_proofs(
            ledger.get("retainedCurrentAssetProofs", []),
            sorted(str(target.get("partId") or "").strip() for target in targets),
            donor_reference,
            donor_end,
            registry_sha256,
        ):
            source_key = json.dumps(
                proof["sourceAsset"],
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            )
            surviving = [
                part_id
                for part_id in proof["attestedPartIds"]
                if (part_id, proof["sourceAsset"]["validTime"], source_key)
                in actual_pair_source_keys
            ]
            if surviving:
                retained_proofs.append(build_retained_current_asset_proof(
                    proof["sourceAsset"],
                    proof["processingSignature"],
                    proof["partOutcomeProof"],
                    surviving,
                    sorted(
                        str(target.get("partId") or "").strip()
                        for target in targets
                    ),
                    registry_sha256,
                ))
        retained_proofs.sort(key=lambda proof: (
            proof["sourceAsset"]["validTime"],
            proof["sourceAsset"]["collection"],
            proof["sourceAsset"]["modelRun"],
            proof["sourceAsset"]["itemId"],
            proof["sourceAsset"]["contentSha256"],
        ))
        ledger["retainedCurrentAssetProofs"] = retained_proofs
        ledger["retainedCurrentAssetProofCount"] = len(retained_proofs)
        ledger["retainedCurrentAssetProofsSha256"] = (
            retained_current_asset_proofs_sha256(retained_proofs)
        )
        ledger["attestation"] = sanitized_current_attestation(
            actual_attestation
        )
        actual_source_keys = {
            source_key
            for _part_id, _valid_time, source_key in actual_pair_source_keys
        }
        for collection_row in ledger.get("collections") or []:
            for row in collection_row.get("validTimes") or []:
                source = canonical_current_source_asset(row.get("sourceAsset"))
                if (
                    row.get("state") == "VERIFIED"
                    and source is not None
                    and json.dumps(
                        source,
                        sort_keys=True,
                        separators=(",", ":"),
                        ensure_ascii=False,
                    ) not in actual_source_keys
                ):
                    row["state"] = "PROCESSED"
            collection_row["stateCounts"] = {
                state: sum(
                    row.get("state") == state
                    for row in collection_row.get("validTimes") or []
                )
                for state in CURRENT_OPERATIONAL_LEDGER_STATES
            }

    partition = derive_current_part_outcome_partition(
        ledger.get("collections"),
        sorted(str(target.get("partId") or "").strip() for target in targets),
        [
            canonical_time(donor_reference + timedelta(hours=offset))
            for offset in range(
                int((donor_end - donor_reference).total_seconds() // 3600) + 1
            )
        ],
        allow_local_unavailable=True,
    )
    complement = exact_current_operational_complement(
        sorted(str(target.get("partId") or "").strip() for target in targets),
        [
            canonical_time(donor_reference + timedelta(hours=offset))
            for offset in range(
                int((donor_end - donor_reference).total_seconds() // 3600) + 1
            )
        ],
        actual_attestation.get("verifiedPairs") or [],
    )
    complement_keys = {
        (row["partId"], row["validTime"]) for row in complement
    }
    for prefix, rows in (
        (
            "upstreamAbsence",
            [
                row for row in partition["upstreamAbsencePairs"]
                if (row["partId"], row["validTime"]) in complement_keys
            ],
        ),
        (
            "spatialUnavailable",
            [
                row for row in partition["spatialUnavailablePairs"]
                if (row["partId"], row["validTime"]) in complement_keys
            ],
        ),
        ("operationalComplement", complement),
    ):
        ledger[f"{prefix}PairCount"] = len(rows)
        ledger[f"{prefix}PairsSha256"] = part_time_pairs_sha256(rows)
        ledger[f"{prefix}Pairs"] = rows
    failure_codes = {
        str(code)
        for code in (ledger.get("failureCodes") or [])
        if isinstance(code, str)
    }
    partition_verified_keys = {
        (row["partId"], row["validTime"])
        for row in partition["verifiedPairs"]
    }
    actual_attested_keys = {
        (row["partId"], row["validTime"])
        for row in actual_attestation.get("verifiedPairs") or []
    }
    if partition_verified_keys - actual_attested_keys:
        failure_codes.add("UNATTESTED_CURRENT_PART_TIME")
    if ledger.get("retainedCurrentAssetProofs"):
        failure_codes.add("RETAINED_CURRENT_PART_TIME")
    ledger["ready"] = not (
        failure_codes - CURRENT_OPERATIONAL_NON_FATAL_CODES
    )
    ledger["failureCodes"] = sorted(failure_codes)
    validate_current_operational_availability_ledger(
        ledger,
        actual_attestation,
        targets,
        donor_reference,
        donor_end,
        registry_sha256,
    )
    if regional_source_proof_candidates is not None:
        original_regional_candidates.extend(_regional_sources_from_validated_ledger(
            ledger, expected_processing_signature,
        ))

    evidence_by_source: dict[str, tuple[dict[str, Any], str, dict[str, Any]]] = {}
    for collection_row in ledger["collections"]:
        signature = collection_row.get("processingSignature")
        for row in collection_row["validTimes"]:
            source = canonical_current_source_asset(row.get("sourceAsset"))
            outcome = row.get("partOutcomeProof")
            if row.get("state") not in {"PROCESSED", "VERIFIED"} or source is None:
                continue
            if not retained_current_processing_signature_compatible(
                signature, expected_processing_signature,
            ):
                continue
            evidence_by_source[json.dumps(
                source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
            )] = (source, signature, outcome)
    for proof in validate_retained_current_asset_proofs(
        ledger.get("retainedCurrentAssetProofs", []),
        sorted(str(target.get("partId") or "").strip() for target in targets),
        donor_reference,
        donor_end,
        registry_sha256,
    ):
        if not retained_current_processing_signature_compatible(
            proof["processingSignature"], expected_processing_signature,
        ):
            continue
        source = proof["sourceAsset"]
        evidence_by_source[json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )] = (source, proof["processingSignature"], proof["partOutcomeProof"])

    range_end = reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    grouped: dict[str, dict[str, Any]] = {}
    for pair_source in actual_attestation.get("verifiedPairSources") or []:
        valid_time = canonical_time(pair_source.get("validTime"))
        source = canonical_current_source_asset(pair_source.get("source"))
        if (
            valid_time is None
            or source is None
            or epoch(valid_time) < reference.timestamp()
            or epoch(valid_time) > range_end.timestamp()
        ):
            continue
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        evidence = evidence_by_source.get(source_key)
        if evidence is None:
            raise ValueError("Attested retained current row lacks canonical asset proof")
        entry = grouped.setdefault(source_key, {
            "source": evidence[0],
            "signature": evidence[1],
            "outcome": evidence[2],
            "partIds": set(),
        })
        entry["partIds"].add(str(pair_source.get("partId") or "").strip())
    proofs = [
        build_retained_current_asset_proof(
            entry["source"],
            entry["signature"],
            entry["outcome"],
            sorted(entry["partIds"]),
            sorted(str(target.get("partId") or "").strip() for target in targets),
            registry_sha256,
        )
        for entry in grouped.values()
    ]
    proofs.sort(key=lambda proof: (
        proof["sourceAsset"]["validTime"],
        proof["sourceAsset"]["collection"],
        proof["sourceAsset"]["modelRun"],
        proof["sourceAsset"]["itemId"],
        proof["sourceAsset"]["contentSha256"],
    ))
    validated_proofs = validate_retained_current_asset_proofs(
        proofs,
        sorted(str(target.get("partId") or "").strip() for target in targets),
        reference,
        range_end,
        registry_sha256,
    )
    if regional_source_proof_candidates is not None:
        # Preserve already authenticated ORIGINAL regional source outcomes
        # independently of which native tuples survive this new time window.
        # These are not retained native attestations and grant no native data.
        regional_source_proof_candidates.extend(original_regional_candidates)
    return validated_proofs


def _select_retained_current_asset_proofs_for_document(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    proof_candidates: list[dict[str, Any]],
    expected_processing_signature: str | None = None,
) -> list[dict[str, Any]]:
    """Keep only exact proof identities selected by the merged cache's actual rows."""
    if not proof_candidates:
        return []
    registry_sha256 = target_fingerprint(targets)
    target_ids = sorted(str(target.get("partId") or "").strip() for target in targets)
    evidence: dict[tuple[str, str, str], list[dict[str, Any]]] = {}
    evidence_by_source: dict[str, list[dict[str, Any]]] = {}
    authorization: list[dict[str, Any]] = []

    def semantic_evidence(value: dict[str, Any]) -> dict[str, Any]:
        outcome = copy.deepcopy(value["partOutcomeProof"])
        outcome.pop("processingSignature", None)
        outcome.pop("outcomesSha256", None)
        return {
            "sourceAsset": value["sourceAsset"],
            "outcome": outcome,
        }

    def evidence_compatible(
        left: dict[str, Any], right: dict[str, Any],
    ) -> bool:
        return bool(
            retained_current_processing_signature_compatible(
                left["processingSignature"],
                right["processingSignature"],
            )
            and semantic_evidence(left) == semantic_evidence(right)
        )

    for proof in proof_candidates:
        source = proof["sourceAsset"]
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        # Different compatible caches may aggregate the same exact asset proof
        # over different part subsets.  The subset count/hash is not evidence
        # identity: union candidate authorization here, then rebuild the final
        # canonical subset solely from the merged document's actual rows below.
        source_evidence = {
            "sourceAsset": source,
            "processingSignature": proof["processingSignature"],
            "partOutcomeProof": proof["partOutcomeProof"],
        }
        source_candidates = evidence_by_source.setdefault(source_key, [])
        if any(
            not evidence_compatible(existing, source_evidence)
            for existing in source_candidates
        ):
            raise ValueError("Conflicting retained current asset proof")
        if source_evidence not in source_candidates:
            source_candidates.append(source_evidence)
        for part_id in proof["attestedPartIds"]:
            key = (part_id, source["validTime"], source_key)
            pair_candidates = evidence.setdefault(key, [])
            if source_evidence not in pair_candidates:
                pair_candidates.append(source_evidence)
            authorization.append({
                "partId": part_id,
                "validTime": source["validTime"],
                "source": source,
            })
    unique_authorization = {
        (row["partId"], row["validTime"], json.dumps(
            row["source"], sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )): row
        for row in authorization
    }
    attestation = current_operational_attestation(
        document,
        targets,
        reference,
        [],
        list(unique_authorization.values()),
    )
    grouped: dict[str, dict[str, Any]] = {}
    for pair_source in attestation.get("verifiedPairSources") or []:
        source = canonical_current_source_asset(pair_source.get("source"))
        if source is None:
            continue
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        key = (
            str(pair_source.get("partId") or "").strip(),
            str(pair_source.get("validTime") or ""),
            source_key,
        )
        proofs = evidence.get(key)
        if not proofs:
            raise ValueError("Merged retained current row lacks exact proof")
        entry = grouped.setdefault(source_key, {
            "proofs": [],
            "partIds": set(),
        })
        for proof in proofs:
            if proof not in entry["proofs"]:
                entry["proofs"].append(proof)
        entry["partIds"].add(key[0])
    selected = []
    for entry in grouped.values():
        candidates = entry["proofs"]
        if not candidates or any(
            not evidence_compatible(candidates[0], candidate)
            for candidate in candidates[1:]
        ):
            raise ValueError("Conflicting retained current asset proof")
        exact = [
            candidate for candidate in candidates
            if candidate["processingSignature"] == expected_processing_signature
        ]
        chosen = min(
            exact or candidates,
            key=lambda candidate: json.dumps(
                candidate,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            ),
        )
        selected.append(build_retained_current_asset_proof(
            chosen["sourceAsset"],
            chosen["processingSignature"],
            chosen["partOutcomeProof"],
            sorted(entry["partIds"]),
            target_ids,
            registry_sha256,
        ))
    selected.sort(key=lambda proof: (
        proof["sourceAsset"]["validTime"],
        proof["sourceAsset"]["collection"],
        proof["sourceAsset"]["modelRun"],
        proof["sourceAsset"]["itemId"],
        proof["sourceAsset"]["contentSha256"],
    ))
    return validate_retained_current_asset_proofs(
        selected,
        target_ids,
        reference,
        reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
        registry_sha256,
    )


def persist_regional_shadow_before_recovery(
    shadow: dict[str, Any], previous: dict[str, Any],
    deferred_recovery_checkpoint: dict[str, bool],
) -> None:
    """Durably save sample+proof before retiring original bulk source evidence."""
    save_current_field_shadow(CURRENT_FIELD_SHADOW_PATH, shadow)
    if deferred_recovery_checkpoint.get("pending"):
        atomic_write_bulk_cache(previous)
        deferred_recovery_checkpoint.clear()


def load_previous(
    expected_signature: str,
    *,
    coastal_part_targets: list[dict[str, Any]] | None = None,
    production_reference: datetime | None = None,
    retained_current_asset_proofs: list[dict[str, Any]] | None = None,
    regional_source_proof_candidates: list[dict[str, Any]] | None = None,
    deferred_recovery_checkpoint: dict[str, bool] | None = None,
) -> dict[str, Any]:
    output_document = load_bulk_document(OUTPUT_PATH)
    fallback_document = load_bulk_document(DEPLOYED_FALLBACK_PATH)
    candidates = [output_document, fallback_document]
    proof_candidates: list[dict[str, Any]] = []
    proof_candidates_by_document: dict[int, list[dict[str, Any]]] = {}
    regional_proofs_by_document: dict[int, list[dict[str, Any]]] = {}

    def persist_recovery(document: dict[str, Any]) -> None:
        if deferred_recovery_checkpoint is not None:
            # Main first persists migrated regional proofs with their samples.
            # Do not overwrite the original proof-bearing donor ahead of it.
            deferred_recovery_checkpoint["pending"] = True
        else:
            atomic_write_bulk_cache(document)
    if coastal_part_targets is not None and production_reference is not None:
        expected_processing_signature = current_marine_processing_signature(
            expected_signature
        )
        # Validate proofs against the exact persisted document before leaf
        # sanitation. The later selection step applies those authenticated
        # proofs only to rows that survived sanitation and the donor merge.
        for document in candidates:
            if (
                document.get("zoneRegistrySignature") != expected_signature
                or not document.get("zones")
            ):
                continue
            try:
                original_regional_proofs: list[dict[str, Any]] = []
                document_proofs = (
                    _validated_candidate_retained_current_asset_proofs(
                        document,
                        coastal_part_targets,
                        production_reference,
                        expected_processing_signature,
                        regional_source_proof_candidates=original_regional_proofs,
                    )
                )
            except (TypeError, ValueError):
                document_proofs = []
                original_regional_proofs = []
            proof_candidates_by_document[id(document)] = document_proofs
            regional_proofs_by_document[id(document)] = original_regional_proofs
            proof_candidates.extend(document_proofs)
    output_quarantined = False
    output_leaf_sanitized = bool(
        sanitize_reusable_cache_document_leaves(output_document)
    )
    if (
        OUTPUT_PATH.exists()
        and OUTPUT_PATH.stat().st_size > 0
        and not reusable_cache_document_shape(output_document)
    ):
        quarantine_invalid_output_cache(OUTPUT_PATH)
        output_document = {}
        output_quarantined = True
    sanitize_reusable_cache_document_leaves(fallback_document)
    if not reusable_cache_document_shape(fallback_document):
        fallback_document = {}
    if output_quarantined:
        if (
            coastal_part_targets is None
            or not _strict_current_donor_ready(
                fallback_document,
                coastal_part_targets,
            )
        ):
            raise RuntimeError(
                "invalid private DMI candidate has no strict READY active recovery donor"
            )
    candidates = [output_document, fallback_document]
    compatible = [document for document in candidates if document.get("zoneRegistrySignature") == expected_signature and document.get("zones")]
    if compatible:
        if regional_source_proof_candidates is not None:
            for document in compatible:
                regional_source_proof_candidates.extend(
                    regional_proofs_by_document.get(id(document), [])
                )
        primary = (
            output_document
            if PREFER_OUTPUT_CACHE and output_document in compatible
            else max(
                compatible,
                key=lambda document: (
                    cache_progress_time(document), cache_quality(document)
                ),
            )
        )
        merged = copy.deepcopy(primary)
        merged_current_proofs = list(
            proof_candidates_by_document.get(id(primary), [])
        )
        if coastal_part_targets is not None and production_reference is not None:
            strict_donors = [
                document
                for document in compatible
                if document is not primary
                and _strict_current_donor_ready(
                    document,
                    coastal_part_targets,
                )
            ]
            for donor in sorted(
                strict_donors,
                key=lambda document: (cache_quality(document), cache_progress_time(document)),
                reverse=True,
            ):
                backfill_compatible_cache_data(
                    merged,
                    donor,
                    proof_candidates_by_document.get(id(donor), []),
                    merged_current_proofs,
                )
                merged_current_proofs.extend(
                    proof_candidates_by_document.get(id(donor), [])
                )
        if retained_current_asset_proofs is not None:
            retained_current_asset_proofs.extend(
                _select_retained_current_asset_proofs_for_document(
                    merged,
                    coastal_part_targets or [],
                    production_reference,
                    proof_candidates,
                    current_marine_processing_signature(expected_signature),
                ) if production_reference is not None else []
            )
        if output_quarantined or output_leaf_sanitized:
            persist_recovery(merged)
        return merged
    # Et enkelt flyttet administratorpunkt ændrer hele registersignaturen. Genbrug
    # derfor den bedste ældre cache som kandidat; efter at det aktuelle register
    # er bygget, fjernes kun de zoner/kystdele hvis eget samplingPoint er ændret.
    reusable = [document for document in candidates if document.get("zones")]
    if reusable:
        recovered = max(reusable, key=lambda document: (cache_progress_time(document), cache_quality(document)))
        if output_quarantined or output_leaf_sanitized:
            persist_recovery(recovered)
        return recovered
    recovered = {"schemaVersion": 2, "zones": {}, "runs": {}, "zoneRegistrySignature": expected_signature}
    if output_quarantined or output_leaf_sanitized:
        persist_recovery(recovered)
    return recovered


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
        blocked = 0 if collection_retry_eligible(entry, now) else 1

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
    allowed_retained_pair_sources: list[dict[str, Any]] | None = None,
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
        allowed_retained_pair_sources,
    )


def current_operational_attestation(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    allowed_source_assets: list[dict[str, Any]] | None = None,
    allowed_retained_pair_sources: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return coastal_part_current_attestation(
        document,
        targets,
        reference,
        reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS),
        allowed_source_assets,
        allowed_retained_pair_sources,
    )


class CurrentOperationalLedgerResult(NamedTuple):
    """One ledger and its already-validated, same-input full attestation.

    This process-local result is consumed before another document mutation.
    It is not persisted as validation authority or reused after cache restore.
    """

    ledger: dict[str, Any]
    attestation: dict[str, Any]
    validated: bool


def build_current_operational_ledger_result(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    official_catalogs: dict[
        str,
        tuple[str | None, list[dict[str, Any]], dict[str, Any]],
    ],
    retained_current_asset_proofs: list[dict[str, Any]] | None = None,
) -> CurrentOperationalLedgerResult:
    """Close every official DKSS asset/hour without inventing fallback gaps."""
    valid_times = operational_current_valid_times(reference)
    valid_time_set = set(valid_times)
    range_end = reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    part_ids = sorted(str(target.get("partId") or "").strip() for target in targets)
    registry_sha256 = target_fingerprint(targets)
    try:
        expected_processing_signature = current_marine_processing_signature(
            document.get("zoneRegistrySignature")
        )
    except ValueError:
        expected_processing_signature = None
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
        native_terminal_asset = None
        native_terminal_asset_valid = True
        if isinstance(stats, dict) and "nativeTerminalAsset" in stats:
            raw_terminal = stats["nativeTerminalAsset"]
            native_terminal_asset = official_current_asset_identity(
                collection, model_run, raw_terminal,
            )
            native_terminal_asset_valid = bool(
                model_run and native_terminal_asset is not None
                and native_terminal_asset == raw_terminal
                and epoch(native_terminal_asset["validTime"])
                    == epoch(model_run) + DKSS_MAX_FORECAST_LEAD_HOURS * 3600
                and (
                    native_terminal_asset["validTime"] not in valid_time_set
                    or official_by_time.get(native_terminal_asset["validTime"])
                        == native_terminal_asset
                )
            )
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
            and int(stats.get("requiredRowsTruncatedByAssetLimit") or 0) == 0
            and official_assets_valid
            and selected_assets_valid
            and native_terminal_asset_valid
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
            and processing_signature == expected_processing_signature
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
            **({"nativeTerminalAsset": native_terminal_asset}
               if native_terminal_asset_valid and native_terminal_asset is not None
               else {}),
        })
        if not catalog_complete:
            failure_codes.add("OFFICIAL_DKSS_CATALOG_INCOMPLETE")

    processed_assets = [
        row["sourceAsset"]
        for collection_row in provisional_collections
        for row in collection_row["validTimes"]
        if row["state"] == "PROCESSED" and row["sourceAsset"] is not None
    ]
    retained_proofs = validate_retained_current_asset_proofs(
        retained_current_asset_proofs or [],
        part_ids,
        reference,
        range_end,
        registry_sha256,
    )
    eligible_retained_proofs: list[dict[str, Any]] = []
    provisional_by_collection = {
        row["collection"]: row for row in provisional_collections
    }
    for proof in retained_proofs:
        source = proof["sourceAsset"]
        collection_row = provisional_by_collection.get(source["collection"])
        if collection_row is None:
            raise ValueError("Retained current proof collection is unavailable")
        if not retained_current_processing_signature_compatible(
            proof["processingSignature"], expected_processing_signature,
        ):
            raise ValueError("Retained current proof uses incompatible processing semantics")
        selected_model_run = canonical_time(collection_row.get("modelRun"))
        locally_unavailable = all(
            row.get("state") == "LOCALLY_SKIPPED"
            for row in collection_row["validTimes"]
        )
        if selected_model_run is None:
            if not locally_unavailable:
                raise ValueError("Retained current proof lacks catalog-outage evidence")
        else:
            source_run_epoch = epoch(source["modelRun"])
            selected_run_epoch = epoch(selected_model_run)
            if source_run_epoch > selected_run_epoch:
                raise ValueError("Retained current proof is newer than selected model run")
            if source_run_epoch == selected_run_epoch:
                selected_row = next(
                    (
                        row for row in collection_row["validTimes"]
                        if row["validTime"] == source["validTime"]
                    ),
                    None,
                )
                if (
                    selected_row is None
                    or selected_row["state"] != "LOCALLY_SKIPPED"
                    or not current_source_matches_official_asset(
                        source, selected_row["officialAsset"],
                    )
                ):
                    # A processed current step already supplies the row, while
                    # a revised official identity must become exact residual.
                    continue
            # An older, valid row remains eligible until its actual tuple is
            # atomically replaced. Newer processed/outcome metadata alone is
            # not a replacement. The attestation below reads the real cached
            # tuple; used_retained_by_source then keeps only the exact proofs
            # that this tuple actually used. Same-run official revisions above
            # remain a separate fail-closed integrity rule.
        eligible_retained_proofs.append(proof)

    retained_authorization = [
        {
            "partId": part_id,
            "validTime": proof["sourceAsset"]["validTime"],
            "source": proof["sourceAsset"],
        }
        for proof in eligible_retained_proofs
        for part_id in proof["attestedPartIds"]
    ]
    current_attestation = current_operational_attestation(
        document,
        targets,
        reference,
        processed_assets,
        [],
    )
    attestation = (
        current_operational_attestation(
            document, targets, reference, processed_assets,
            retained_authorization,
        )
        if retained_authorization
        else current_attestation
    )
    current_pair_source_keys = {
        (
            row["partId"],
            row["validTime"],
            json.dumps(
                canonical_current_source_asset(row["source"]),
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            ),
        )
        for row in current_attestation.get("verifiedPairSources") or []
    }
    retained_evidence = {
        (
            part_id,
            proof["sourceAsset"]["validTime"],
            json.dumps(
                proof["sourceAsset"],
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            ),
        ): proof
        for proof in eligible_retained_proofs
        for part_id in proof["attestedPartIds"]
    }
    used_retained_by_source: dict[str, dict[str, Any]] = {}
    for pair_source in attestation.get("verifiedPairSources") or []:
        source = canonical_current_source_asset(pair_source.get("source"))
        if source is None:
            continue
        source_key = json.dumps(
            source, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        )
        identity = (
            str(pair_source.get("partId") or "").strip(),
            str(pair_source.get("validTime") or ""),
            source_key,
        )
        if identity in current_pair_source_keys:
            continue
        proof = retained_evidence.get(identity)
        if proof is None:
            raise ValueError("Actual current row has no exact current or retained proof")
        entry = used_retained_by_source.setdefault(source_key, {
            "proof": proof,
            "partIds": set(),
        })
        entry["partIds"].add(identity[0])
    retained_proofs = [
        build_retained_current_asset_proof(
            entry["proof"]["sourceAsset"],
            entry["proof"]["processingSignature"],
            entry["proof"]["partOutcomeProof"],
            sorted(entry["partIds"]),
            part_ids,
            registry_sha256,
        )
        for entry in used_retained_by_source.values()
    ]
    retained_proofs.sort(key=lambda proof: (
        proof["sourceAsset"]["validTime"],
        proof["sourceAsset"]["collection"],
        proof["sourceAsset"]["modelRun"],
        proof["sourceAsset"]["itemId"],
        proof["sourceAsset"]["contentSha256"],
    ))
    retained_proofs = validate_retained_current_asset_proofs(
        retained_proofs,
        part_ids,
        reference,
        range_end,
        registry_sha256,
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
            allow_local_unavailable=True,
        )
    except (TypeError, ValueError):
        partition = {
            "verifiedPairs": [],
            "upstreamAbsencePairs": [],
            "spatialUnavailablePairs": [],
            "operationalComplementPairs": [],
        }
        failure_codes.add("UNATTESTED_CURRENT_PART_TIME")

    partition_verified_keys = {
        (row["partId"], row["validTime"])
        for row in partition["verifiedPairs"]
    }
    attested_keys = {
        (row["partId"], row["validTime"])
        for row in attestation.get("verifiedPairs") or []
    }
    retained_keys = {
        (part_id, proof["sourceAsset"]["validTime"])
        for proof in retained_proofs
        for part_id in proof["attestedPartIds"]
    }
    if not attested_keys <= partition_verified_keys | retained_keys:
        failure_codes.add("CURRENT_LEDGER_CONTRACT_INVALID")
    if partition_verified_keys - attested_keys:
        failure_codes.add("UNATTESTED_CURRENT_PART_TIME")
    if retained_proofs:
        failure_codes.add("RETAINED_CURRENT_PART_TIME")

    verified_times = {
        row["validTime"] for row in attestation.get("verifiedPairs") or []
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

    authorized_complement = exact_current_operational_complement(
        part_ids,
        valid_times,
        attestation.get("verifiedPairs") or [],
    )
    complement_keys = {
        (row["partId"], row["validTime"]) for row in authorized_complement
    }
    upstream_absence_pairs = [
        row for row in partition["upstreamAbsencePairs"]
        if (row["partId"], row["validTime"]) in complement_keys
    ]
    spatial_unavailable_pairs = [
        row for row in partition["spatialUnavailablePairs"]
        if (row["partId"], row["validTime"]) in complement_keys
    ]
    # Fallback eligibility is the exact inverse of verified DMI availability.
    # Local parser/download failures remain failure evidence and prevent READY
    # promotion, but they must not prevent later providers from filling the
    # affected pairs in this run.
    ledger = {
        "schemaVersion": CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION,
        "contractId": CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID,
        "productionReferenceAt": canonical_time(reference),
        "operationalRangeEndAt": canonical_time(range_end),
        "hourCount": len(valid_times),
        "targetCount": len(targets),
        "targetRegistrySha256": registry_sha256,
        "attestation": sanitized_current_attestation(attestation),
        "retainedCurrentAssetProofCount": len(retained_proofs),
        "retainedCurrentAssetProofsSha256": retained_current_asset_proofs_sha256(
            retained_proofs
        ),
        "retainedCurrentAssetProofs": retained_proofs,
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
        "ready": not (
            failure_codes - CURRENT_OPERATIONAL_NON_FATAL_CODES
        ),
        "failureCodes": sorted(failure_codes),
    }
    validated = True
    try:
        validate_current_operational_availability_ledger(
            ledger,
            attestation,
            targets,
            reference,
            range_end,
            registry_sha256,
        )
    except (TypeError, ValueError):
        validated = False
        ledger["ready"] = False
        ledger["failureCodes"] = ["CURRENT_LEDGER_CONTRACT_INVALID"]
    if ledger["ready"] and not current_operational_ledger_ready(
        ledger,
        attestation,
        targets,
        reference,
        range_end,
        registry_sha256,
    ):
        validated = False
        ledger["ready"] = False
        ledger["failureCodes"] = ["CURRENT_LEDGER_CONTRACT_INVALID"]
    return CurrentOperationalLedgerResult(ledger, attestation, validated)


def build_current_operational_ledger(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    official_catalogs: dict[
        str, tuple[str | None, list[dict[str, Any]], dict[str, Any]]
    ],
    retained_current_asset_proofs: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Preserve the existing ledger-only API for independent consumers."""
    return build_current_operational_ledger_result(
        document, targets, reference, official_catalogs,
        retained_current_asset_proofs,
    ).ledger


def seal_current_operational_checkpoint(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
    official_catalogs: dict[
        str, tuple[str | None, list[dict[str, Any]], dict[str, Any]]
    ],
    retained_current_asset_proofs: list[dict[str, Any]] | None = None,
) -> None:
    """Consume one same-input validation result before any snapshot mutation."""
    sealed = build_current_operational_ledger_result(
        document, targets, reference, official_catalogs,
        retained_current_asset_proofs,
    )
    if not sealed.validated:
        raise ValueError("Current progress ledger validation failed")
    diagnostics = document.setdefault("diagnostics", {})
    diagnostics["currentOperationalLedger"] = sealed.ledger
    diagnostics["currentOperationalAttestation"] = (
        sanitized_current_attestation(sealed.attestation)
    )


def current_operational_cache_ready(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    reference: datetime,
) -> bool:
    try:
        ledger = ((document.get("diagnostics") or {}).get("currentOperationalLedger"))
        allowed_source_assets, allowed_retained_pair_sources = (
            current_attestation_authorization_from_operational_ledger(ledger)
        )
        attestation = current_operational_attestation(
            document,
            targets,
            reference,
            allowed_source_assets,
            allowed_retained_pair_sources,
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


def producer_process_exit_code(
    *,
    producer_success_is_blocked: bool,
    producer_productive: bool,
) -> int:
    """Keep generic failures distinct from an opt-in, fully finalized partial."""
    if producer_success_is_blocked:
        if ONEOFF_CONTINUATION_PROTOCOL and not FINALIZE_ONLY:
            return ONEOFF_FINALIZED_INCOMPLETE_EXIT_CODE
        return 2
    return 0 if producer_productive else 2


def note_asset_processed_this_invocation(result: dict[str, Any]) -> None:
    """Count only an asset accepted by this process, never restored run history."""
    diagnostics = result.setdefault("diagnostics", {})
    count = diagnostics.get("assetsProcessedThisInvocation")
    if type(count) is not int or count < 0:
        raise RuntimeError("invalid per-invocation DMI asset counter")
    diagnostics["assetsProcessedThisInvocation"] = count + 1


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
            "RETAINED_CURRENT_PART_TIME",
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


def atomic_write_bulk_cache(
    document: dict[str, Any],
    *,
    path: pathlib.Path | None = None,
) -> int:
    """Write one bounded, lossless source-dictionary cache atomically."""
    destination = OUTPUT_PATH if path is None else path
    return write_dmi_bulk_document(destination, document)


def write_final_cache_size_telemetry(raw_bytes: int) -> None:
    """Emit only the aggregate final cache size; never private cache content."""
    print(json.dumps(
        {
            "event": "dmi-bulk-cache-final-write",
            "rawBytes": raw_bytes,
        },
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    ), flush=True)


def write_sticky_github_output(name: str, value: str) -> None:
    """Append success-only output without erasing an earlier successful pass."""
    output_path = os.getenv("GITHUB_OUTPUT")
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={value}\n")


def write_checkpoint(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int], status: str = "partial") -> None:
    """Persist committed progress without global cleanup or diagnostics."""
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result.setdefault("diagnostics", {})["progressCheckpoint"] = {
        "schemaVersion": 1,
        "validation": "pending-finalization",
    }
    atomic_write_bulk_cache(result)


def write_finalized_cache(result: dict[str, Any], status: str) -> int:
    """Persist the already-cleaned terminal cache and diagnostics exactly once."""
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result.setdefault("diagnostics", {}).pop("progressCheckpoint", None)
    raw_bytes = atomic_write_bulk_cache(result)
    write_final_cache_size_telemetry(raw_bytes)
    write_ocean_diagnostics(result)
    return raw_bytes


def promote_ready_candidate(
    result: dict[str, Any],
    *,
    strict_current_anchor_available: bool,
    producer_success_is_blocked: bool,
) -> bool:
    """Atomically promote only a finalized, exact-ledger READY candidate."""
    if (
        PROMOTION_PATH is None
        or PROMOTION_PATH.resolve() == OUTPUT_PATH.resolve()
        or producer_success_is_blocked
        or not strict_current_anchor_available
    ):
        return False
    atomic_write_bulk_cache(result, path=PROMOTION_PATH)
    write_sticky_github_output("candidate_promoted", "true")
    return True


def percentile_95(values: list[float], default: float) -> float:
    finite = sorted(
        float(value)
        for value in values
        if isinstance(value, (int, float)) and math.isfinite(float(value))
    )
    if not finite:
        return float(default)
    index = max(0, math.ceil(len(finite) * 0.95) - 1)
    return finite[index]


class ProgressCheckpointController:
    """One shared cadence for committed bulk and dirty private sidecars."""

    def __init__(
        self,
        result: dict[str, Any],
        fresh_zone_ids: set[str],
        budget: dict[str, int],
        sidecar_flush: Any | None = None,
        prepare_bulk_checkpoint: Any | None = None,
    ) -> None:
        self.result = result
        self.fresh_zone_ids = fresh_zone_ids
        self.budget = budget
        self.sidecar_flush = sidecar_flush
        self.prepare_bulk_checkpoint = prepare_bulk_checkpoint
        self.committed_assets_since_write = 0
        self.last_write_monotonic = time.monotonic()
        self.bulk_dirty = False
        self.sidecars_dirty = False
        self.asset_seconds: list[float] = []
        self.progress_write_seconds: list[float] = []

    def can_start_asset(self, reserve_seconds: float = 0.0) -> bool:
        expected_asset = percentile_95(self.asset_seconds, 75.0)
        expected_write = percentile_95(self.progress_write_seconds, 10.0)
        return runtime_remaining() > max(0.0, reserve_seconds) + max(
            30.0, expected_asset + expected_write + 10.0,
        )

    def note_committed_asset(
        self,
        *,
        seconds: float | None = None,
        sidecars_dirty: bool = False,
    ) -> bool:
        self.committed_assets_since_write += 1
        self.bulk_dirty = True
        self.sidecars_dirty = self.sidecars_dirty or sidecars_dirty
        if seconds is not None and math.isfinite(float(seconds)):
            self.asset_seconds.append(float(seconds))
        return self.flush_if_due()

    def mark_bulk_dirty(self) -> None:
        self.bulk_dirty = True

    def mark_sidecars_dirty(self) -> None:
        self.sidecars_dirty = True

    def observe_asset_duration(self, seconds: float) -> None:
        """Learn runtime without claiming that candidate rows were committed."""
        if math.isfinite(float(seconds)):
            self.asset_seconds.append(float(seconds))

    def flush_if_due(self, *, force: bool = False) -> bool:
        due = progress_checkpoint_due(
            self.committed_assets_since_write,
            self.last_write_monotonic,
            force=force,
        )
        if force and (self.bulk_dirty or self.sidecars_dirty):
            due = True
        if not due:
            return False
        if self.bulk_dirty:
            started = time.monotonic()
            if self.prepare_bulk_checkpoint is not None:
                self.prepare_bulk_checkpoint()
            write_checkpoint(
                self.result,
                self.fresh_zone_ids,
                self.budget,
                "partial",
            )
            self.progress_write_seconds.append(time.monotonic() - started)
            self.bulk_dirty = False
            self.committed_assets_since_write = 0
            self.last_write_monotonic = time.monotonic()
        if self.sidecars_dirty and self.sidecar_flush is not None:
            self.sidecar_flush()
            self.sidecars_dirty = False
        return True


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
    locked_production_reference: datetime | None = None,
    supervisor_skipped_assets: set[str] | None = None,
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
    Regional operational targets are excluded: their samples may only change
    through the full primary asset/outcome/proof transaction. Research-only
    EOF cannot replace a bound operational sample without its original proof.
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
        "assetsSkippedBySupervisor": 0,
        "errors": [],
    }
    regional_targets_excluded = sum(
        bool(target.get("regionalProxyCandidate")) for target in research_targets
    )
    research_targets = [
        target for target in research_targets if not target.get("regionalProxyCandidate")
    ]
    summary["regionalTargetsExcluded"] = regional_targets_excluded
    if not research_targets:
        summary["reason"] = "no-research-targets"
        return summary
    if should_stop_work():
        summary["reason"] = "runtime-budget-reached"
        return summary

    scratch_output: dict[str, Any] = {"generatedAt": generated, "zones": {}}
    bootstrap_remaining = CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN
    supervised_skips = supervisor_skipped_assets or set()
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
            12,
        )
        resolved: list[tuple[dict[str, Any], pathlib.Path]] = [
            (asset, path)
            for asset in candidates
            for path in [reusable_cached_asset_path(asset, collection, model_run)]
            if path is not None
        ]
        if (
            model_run
            and not resolved
            and candidates
            and bootstrap_remaining > 0
            and not should_stop_work()
        ):
            # Prefer the far edge of the accepted +12 h research window.  It
            # remains eligible for many subsequent 15-minute rotations, so a
            # legacy-cache bootstrap cannot turn into repeated downloads.
            asset = max(candidates, key=lambda row: epoch(row.get("valid")))
            before_bytes = int(budget.get("bytes") or 0)
            supervised_identity = supervised_asset_identity(collection, model_run, asset)
            if supervised_asset_identity_key(supervised_identity) in supervised_skips:
                bootstrap_remaining -= 1
                summary["assetsSkippedBySupervisor"] += 1
                summary["errors"].append({
                    "collection": collection,
                    "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                    "message": "one bounded current-field bootstrap asset was skipped",
                })
            else:
                try:
                    with supervised_asset_operation(supervised_identity):
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
            supervised_identity = supervised_asset_identity(collection, model_run, asset)
            if supervised_asset_identity_key(supervised_identity) in supervised_skips:
                summary["assetsSkippedBySupervisor"] += 1
                summary["errors"].append({
                    "collection": collection,
                    "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                    "message": "one bounded cached current-field asset was skipped",
                })
                continue
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
            with supervised_asset_operation(supervised_identity):
                found, _touched, interrupted, messages_seen, zone_lookups = process_grib_transactionally(
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
    supervisor_skipped_assets = supervised_skipped_asset_identities()
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
    retained_current_asset_proofs: list[dict[str, Any]] = []
    regional_source_proof_candidates: list[dict[str, Any]] = []
    deferred_recovery_checkpoint: dict[str, bool] = {}
    previous = load_previous(
        current_zone_registry_signature,
        coastal_part_targets=coastal_part_targets,
        production_reference=locked_production_reference,
        retained_current_asset_proofs=retained_current_asset_proofs,
        regional_source_proof_candidates=regional_source_proof_candidates,
        deferred_recovery_checkpoint=deferred_recovery_checkpoint,
    )
    zone_coast_types = {
        str((feature.get("properties") or {}).get("id")): (feature.get("properties") or {}).get("coastType") or "east"
        for feature in zones_geo.get("features", [])
        if (feature.get("properties") or {}).get("id")
    }
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
        progress(
            "privat regional proxykandidat blev fail-closed; "
            "operationel DMI-produktion fortsætter"
        )
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
    active_operational_zones = build_operational_zone_config(
        zones_geo,
        coastal_part_targets,
    )
    previous_operational_wave_residual = (
        operational_wave_residual_by_collection(
            previous,
            active_operational_zones,
            locked_production_reference,
            exact_required_times=(
                set(wave_bootstrap_configuration["operationalExactHours"])
                if wave_bootstrap_configuration is not None
                else {canonical_time(locked_production_reference)}
            ),
        )
    )
    previous.setdefault("diagnostics", {})[
        "operationalWaveResidualBeforeFreshShortcut"
    ] = previous_operational_wave_residual
    if (
        wave_bootstrap_configuration is None
        and not FINALIZE_ONLY
        and not FORCE_REFRESH
        and previous_generated
        and previous.get("zones")
        and time.time() - previous_generated < REFRESH_MINUTES * 60
        and marine_cache_healthy
        and previous.get("spatialProvenanceVersion") == SPATIAL_PROVENANCE_VERSION
        and int(previous.get("privateReplayRetentionHours") or 0) >= 54
        and zone_registry_unchanged
        and not coastal_point_stage_targets
        and not has_operational_wave_residual(
            previous_operational_wave_residual
        )
    ):
        # Kun en både tidsmæssigt frisk og funktionelt sund marine-cache genbruges.
        # En nylig parserfejl må aldrig blokere et nyt DKSS-forsøg efter en kodeopdatering.
        previous.setdefault("refreshStatus", "fresh-bulk-cache")
        previous.setdefault("diagnostics", {})
        final_cache_bytes = atomic_write_bulk_cache(previous)
        write_final_cache_size_telemetry(final_cache_bytes)
        write_ocean_diagnostics(previous)
        promote_ready_candidate(
            previous,
            strict_current_anchor_available=True,
            producer_success_is_blocked=False,
        )
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

    # De ejer-godkendte forældre og lokale kystdele genbruger præcis det samme
    # operationelle register, som blev brugt til fresh-cache/WAM-residualet.
    zones = copy.deepcopy(active_operational_zones)
    zone_coast_types = {zone["id"]: zone.get("coastType") or "east" for zone in zones}

    # Kandidater samples i samme hentede GRIB-filer, men skrives til en separat
    # privat cache. De indgår aldrig i den offentlige registrering, dækningsnævner
    # eller checkpoints, før en READY-kandidat aktiveres eksplicit.
    zones.extend(coastal_point_stage_targets)
    coastal_point_stage = load_coastal_point_stage(COASTAL_POINT_STAGE_PATH, coastal_point_stage_targets)

    # Privat forskningsopsamling plus den allerede godkendte operationelle
    # Limfjordsproxy. Kun den strengt validerede otte-dels allowlist må bruge
    # dkss_lf op til 15 km; roterende forskning forbliver score-neutral.
    current_shadow = load_current_field_shadow(CURRENT_FIELD_SHADOW_PATH)
    regional_proof_migration: dict[str, Any] = {}
    if regional_proxy_configuration_status == "CONFIGURED":
        regional_proof_migration = migrate_regional_source_proofs(
            current_shadow,
            policy=regional_proxy_policy,
            targets=coastal_part_targets,
            original_proofs=regional_source_proof_candidates,
        )
        # Commit sample+proof together before any later bulk checkpoint can
        # retire the last native reference to these original source outcomes.
        persist_regional_shadow_before_recovery(
            current_shadow, previous, deferred_recovery_checkpoint,
        )
    elif deferred_recovery_checkpoint.get("pending"):
        atomic_write_bulk_cache(previous)
        deferred_recovery_checkpoint.clear()
    regional_source_proof_candidates.clear()
    rotating_research_targets, next_research_cursor, selected_research_part_ids = build_rotating_targets(
        part_doc,
        zone_coast_types,
        int(current_shadow.get("cursor") or 0),
        CURRENT_FIELD_SHADOW_PARTS_PER_RUN,
    )
    research_targets = rotating_research_targets + regional_proxy_targets
    research_run_metrics: dict[str, Any] = {
        "regionalSourceProofMigration": regional_proof_migration,
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
                              "assetsSkippedPreviouslyProcessed": 0, "assetsRetriedIncomplete": 0,
                              "assetsProcessedThisInvocation": 0,
                              "assetsDeferredValidDkssRefresh": 0, "collectionsDeferredValidDkssRefresh": [],
                              "zeroProgressCollections": [], "collectionsUnchanged": [], "messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0, "marineGridSearch": {},
                              "runtimeBudgetSeconds": MAX_RUNTIME_SECONDS, "finalizeReserveSeconds": FINALIZE_RESERVE_SECONDS,
                              "currentFieldShadow": current_field_shadow_status(current_shadow, selected_research_part_ids, research_run_metrics),
                              "persistentFieldInventory": dict(((previous.get("diagnostics") or {}).get("persistentFieldInventory") or {}))}}
    cache_leaf_sanitization = (
        (previous.get("diagnostics") or {}).get("cacheLeafSanitization")
    )
    if isinstance(cache_leaf_sanitization, dict):
        result["diagnostics"]["cacheLeafSanitization"] = copy.deepcopy(
            cache_leaf_sanitization
        )
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
    if FINALIZE_ONLY:
        if FINALIZE_REASON not in ALLOWED_FINALIZE_REASONS:
            raise RuntimeError("unsupported supervised DMI finalization reason")
        result["diagnostics"]["supervisedFinalization"] = {
            "reason": FINALIZE_REASON,
            "partialProgressPreserved": True,
        }
        result["diagnostics"]["errors"].append({
            "collection": "harmonie_dini_sf",
            "message": "stalled HARMONIE asset stopped by bounded supervisor",
            "failureCode": FINALIZE_REASON,
            "partialProgressPreserved": True,
        })
    result["diagnostics"]["restoredMarineSelections"] = restore_marine_selections(result, zones)
    budget = {"bytes": 0}
    # Validate and normalize the hydrated cache once before delayed progress
    # checkpoints. This prevents stale provenance or mismatched vectors from
    # influencing a later candidate while avoiding a full-cache rescan after
    # every single hourly asset.
    clean_and_summarize(result, set(), budget)
    retained_current_asset_proofs = (
        _select_retained_current_asset_proofs_for_document(
            result,
            coastal_part_targets,
            locked_production_reference,
            retained_current_asset_proofs,
            current_marine_processing_signature(
                current_zone_registry_signature
            ),
        )
    )
    # Local coastal parts use the same downloaded GRIB fields as parent zones.
    # They must remain in the coverage denominator; excluding them allowed the
    # scheduler to stop while most public local scores still lacked current.
    active_zones_config = [
        zone for zone in zones
        if not zone.get("waterSource") and not zone.get("researchCurrent") and not zone.get("privateStage")
    ]
    coastal_part_current_cache_healthy = current_operational_cache_ready(
        result,
        coastal_part_targets,
        locked_production_reference,
    )
    active_production_zone_ids = sorted(
        str(zone.get("id") or "").strip()
        for zone in active_zones_config
        if str(zone.get("id") or "").strip()
    )
    base_schedule, schedule_coverage = collection_schedule(
        result,
        active_zones_config,
    )
    operational_wave_exact_required_times = (
        set(wave_bootstrap_configuration["operationalExactHours"])
        if wave_bootstrap_configuration is not None
        else {canonical_time(locked_production_reference)}
    )
    operational_wave_residual = operational_wave_residual_by_collection(
        result,
        active_zones_config,
        locked_production_reference,
        exact_required_times=operational_wave_exact_required_times,
    )
    operational_wave_native_part_count = sum(
        int(details.get("relevantZoneCount") or 0)
        for details in operational_wave_residual.values()
    )
    scheduled, operational_plan = operational_collection_plan(
        base_schedule,
        result["collectionState"],
        coastal_part_current_cache_healthy,
        operational_wave_residual,
        runtime_remaining(),
        force_wam_collections=(
            set(WAVE_BOOTSTRAP_COLLECTIONS)
            if wave_bootstrap_configuration is not None
            else None
        ),
    )
    schedule_coverage.update(operational_plan)
    schedule_coverage["operationalWaveResidual"] = operational_wave_residual
    schedule_coverage["operationalWaveNativePartCount"] = (
        operational_wave_native_part_count
    )
    schedule_coverage["operationalWaveNativePartCountExpected"] = (
        OPERATIONAL_WAVE_NATIVE_PART_COUNT
    )
    schedule_coverage["strictCurrentRecoveryActive"] = not coastal_part_current_cache_healthy
    schedule_coverage["strictCurrentRecoveryDkssFirst"] = (
        not coastal_part_current_cache_healthy
        and bool(scheduled)
        and scheduled[0] in MARINE_COLLECTIONS
    )
    if FINALIZE_ONLY:
        scheduled = []
        schedule_coverage["supervisedFinalizeOnly"] = True
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
    global_current_planning_pairs, acquisition_plan_diagnostics = (
        load_current_acquisition_planning_pairs(
            coastal_part_targets, locked_production_reference,
        )
    )
    current_part_zone_ids = {f"PART::{part_id}" for part_id in current_target_ids}
    acquisition_plan_diagnostics["optionalParentCurrentCount"] = sum(
        zone_id not in current_part_zone_ids
        for zone_id in active_production_zone_ids
    )
    result["diagnostics"]["currentAcquisitionPlan"] = acquisition_plan_diagnostics
    for collection in sorted(MARINE_COLLECTIONS, key=COLLECTION_ORDER.index):
        try:
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            collection_minimum_valid_time = canonical_time(
                locked_production_reference - timedelta(
                    hours=(
                        REGIONAL_PROXY_MAX_HOLD_HOURS
                        if collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                        and regional_proxy_configuration_status == "CONFIGURED"
                        else 0
                    )
                )
            )
            run, assets, stac_stats = list_latest_assets(
                collection,
                previous_run.get("referenceTime"),
                minimum_valid_time=collection_minimum_valid_time,
                required_valid_times=required_current_valid_times,
                required_horizon_end_time=required_current_horizon_end,
                allow_documented_required_gaps=True,
                retain_preferred_native_run=RETAIN_PREFERRED_NATIVE_RUN,
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
    selected_marine_runs = {
        collection: details[0]
        for collection, details in prefetched_marine.items()
    }
    selected_official_current_assets: dict[
        str, dict[str, dict[str, Any]]
    ] = {}
    for collection, (selected_run, _assets, stats) in prefetched_marine.items():
        official_by_time: dict[str, dict[str, Any]] = {}
        raw_official_assets = (
            stats.get("officialRequiredAssets")
            if isinstance(stats, dict)
            and isinstance(stats.get("officialRequiredAssets"), list)
            else []
        )
        official_map_valid = bool(
            isinstance(stats, dict)
            and stats.get("catalogInventoryComplete") is True
            and int(stats.get("requiredRowsTruncatedByAssetLimit") or 0) == 0
        )
        for raw_asset in raw_official_assets:
            identity = official_current_asset_identity(
                collection, selected_run, raw_asset,
            )
            if identity is None or identity["validTime"] in official_by_time:
                official_map_valid = False
                continue
            official_by_time[identity["validTime"]] = identity
        declared_times = {
            canonical_time(value)
            for value in (
                stats.get("officialRequiredValidTimes")
                if isinstance(stats, dict)
                and isinstance(stats.get("officialRequiredValidTimes"), list)
                else []
            )
            if canonical_time(value) is not None
        }
        if (
            declared_times != set(official_by_time)
            or not isinstance(stats, dict)
            or stats.get("officialRequiredValidTimeCount")
                != len(official_by_time)
        ):
            official_map_valid = False
        selected_official_current_assets[collection] = (
            official_by_time if official_map_valid else {}
        )
    actual_current_pair_source_keys, covered_current_pair_keys = (
        current_pair_evidence_from_retained_proofs(
            retained_current_asset_proofs,
            selected_marine_runs,
            selected_official_current_assets,
        )
    )
    # Two-pass same-run continuity: first prove actual owner rows against the
    # still-selected official asset. Those exact owners may then satisfy cache
    # completeness for a secondary collection whose valid outcome had no public
    # winners. A revised item/content identity fails this first pass and retries.
    for owner_collection, details in prefetched_marine.items():
        selected_run, selected_assets, _stats = details
        previous_run = (previous.get("runs") or {}).get(owner_collection) or {}
        required_asset_provenance = {
            str(identity["validTime"]): identity
            for asset in selected_assets
            for identity in [official_current_asset_identity(
                owner_collection, selected_run, asset,
            )]
            if identity is not None
            and identity["validTime"] in required_current_valid_times
        }
        owner_steps = reusable_processed_steps(
            previous_run,
            collection=owner_collection,
            same_processing=(
                previous_run.get("processingSignature")
                == current_marine_processing_signature(
                    current_zone_registry_signature
                )
            ),
            same_run=previous_run.get("referenceTime") == selected_run,
            strict_current_anchor_available=coastal_part_current_cache_healthy,
            required_valid_times=required_current_valid_times,
            required_asset_provenance=required_asset_provenance,
            current_target_ids=current_target_ids,
            current_target_registry_sha256=current_target_registry_sha256,
            actual_pair_source_keys=actual_current_pair_source_keys,
            covered_pair_keys=set(),
        )
        for valid_time, step in owner_steps.items():
            unavailable = set(
                (step.get("currentPartOutcomeProof") or {}).get(
                    "spatialUnavailablePartIds"
                ) or []
            )
            covered_current_pair_keys.update(
                (part_id, valid_time)
                for part_id in set(current_target_ids) - unavailable
            )

    # Regional fallback needs this run's selected official ledger, not merely
    # the restored shadow header. Its result is advisory planning coverage only
    # and is never inserted into the native DMI pair/source evidence above.
    initial_planning_current_pairs: set[tuple[str, str]] | None = None
    regional_planning_context: tuple[dict[str, Any], dict[str, Any]] | None = None
    regional_target_part_ids = sorted({
        str(target.get("partId") or "").strip()
        for target in regional_proxy_targets
        if str(target.get("partId") or "").strip()
    })
    if global_current_planning_pairs is not None:
        acquisition_plan_diagnostics["regionalPlanningValid"] = False
        if regional_proxy_configuration_status == "CONFIGURED":
            try:
                regional_dmi_result = build_current_operational_ledger_result(
                    result, coastal_part_targets, locked_production_reference,
                    prefetched_marine, retained_current_asset_proofs,
                )
                if not regional_dmi_result.validated:
                    raise ValueError("Regional planning requires validated DMI evidence")
                regional_planning_context = (
                    regional_dmi_result.ledger,
                    regional_dmi_result.attestation,
                )
                regional_planning_pairs = planning_regional_covered_pairs(
                    dmi_ledger=regional_dmi_result.ledger,
                    dmi_attestation=regional_dmi_result.attestation,
                    targets=coastal_part_targets,
                    regional_shadow=current_shadow,
                    regional_policy=regional_proxy_policy,
                    production_reference_at=canonical_time(locked_production_reference),
                )
                global_current_planning_pairs |= regional_planning_pairs
                acquisition_plan_diagnostics["regionalPlanningValid"] = True
                acquisition_plan_diagnostics["regionalCoveredPairCount"] = len(
                    regional_planning_pairs
                )
            except (OSError, TypeError, ValueError, KeyError):
                acquisition_plan_diagnostics["regionalPlanningFailureCode"] = (
                    "REGIONAL_ACQUISITION_PLAN_UNUSABLE"
                )
                progress(
                    "regional current planning proof unavailable; "
                    "unproven regional pairs remain acquisition holes"
                )
        else:
            acquisition_plan_diagnostics["regionalPlanningFailureCode"] = (
                "REGIONAL_ACQUISITION_POLICY_UNAVAILABLE"
            )
        initial_planning_current_pairs = (
            global_current_planning_pairs | covered_current_pair_keys
        )
        acquisition_plan_diagnostics["coveredPairCount"] = len(initial_planning_current_pairs)
        acquisition_plan_diagnostics["globalMissingPairCountBeforeDmi"] = sum(
            (part_id, valid_time) not in initial_planning_current_pairs
            for part_id in current_target_ids
            for valid_time in required_current_valid_times
        )
    initial_regional_lf_gap_pairs_by_time: dict[
        str, set[tuple[str, str]]
    ] = {}
    if (
        initial_planning_current_pairs is not None
        and regional_planning_context is not None
    ):
        lf_run, lf_assets, _lf_stats = prefetched_marine.get(
            REGIONAL_PROXY_REQUIRED_COLLECTION,
            (None, [], {}),
        )
        initial_regional_lf_gap_pairs_by_time = (
            regional_lf_asset_gap_pairs_by_time(
                lf_assets,
                lf_run,
                regional_target_part_ids,
                required_current_valid_times,
                initial_planning_current_pairs,
                locked_production_reference,
            )
        )
        acquisition_plan_diagnostics["regionalCriticalAssetCount"] = len(
            initial_regional_lf_gap_pairs_by_time
        )
        acquisition_plan_diagnostics["regionalPotentialPairCount"] = sum(
            len(pairs)
            for pairs in initial_regional_lf_gap_pairs_by_time.values()
        )

    # Primary mode separates maintenance from critical acquisition. A DKSS
    # collection is refresh-only only when every selected official asset is
    # already complete in the validated cache. Those collections are moved
    # behind all potentially critical collections, and no maintenance runs in
    # a cycle that started with any unresolved DKSS asset.
    primary_refresh_only_collections: set[str] = set()
    primary_critical_work_observed = bool(
        acquisition_plan_diagnostics.get("globalMissingPairCountBeforeDmi", 0)
    )
    if DKSS_PRIMARY_MODE:
        for collection in (
            value for value in scheduled if value in MARINE_COLLECTIONS
        ):
            selected_run, selected_assets, _stats = prefetched_marine.get(
                collection,
                (None, [], {}),
            )
            requirements = [
                classify_dkss_primary_asset(
                    collection=collection,
                    model_run=selected_run,
                    asset=asset,
                    target_ids=current_target_ids,
                    covered_pair_keys=covered_current_pair_keys,
                    cached_zones=result.get("zones") or {},
                    active_zone_ids=active_production_zone_ids,
                    enabled=True,
                    planning_covered_pair_keys=initial_planning_current_pairs,
                    required_valid_times=required_current_valid_times,
                    regional_current_gap_count=len(
                        initial_regional_lf_gap_pairs_by_time.get(
                            str(canonical_time(asset.get("valid")) or ""),
                            set(),
                        )
                    ) if collection == REGIONAL_PROXY_REQUIRED_COLLECTION else 0,
                )
                for asset in selected_assets
            ]
            if requirements and all(
                row["deferValidRefresh"] for row in requirements
            ):
                primary_refresh_only_collections.add(collection)
            else:
                primary_critical_work_observed = True
        scheduled = order_dkss_primary_refresh_collections(
            scheduled,
            primary_refresh_only_collections,
        )
        scheduled, schedule_coverage = (
            refine_operational_collection_plan_after_prefetch(
                scheduled,
                schedule_coverage,
                primary_refresh_only_collections,
                runtime_remaining(),
            )
        )
        schedule_coverage["dkssPrimaryRefreshOnlyCollections"] = sorted(
            primary_refresh_only_collections,
            key=COLLECTION_ORDER.index,
        )
        schedule_coverage["dkssPrimaryCriticalAtRunStart"] = (
            primary_critical_work_observed
        )
        schedule_coverage["dkssPrimaryRefreshAssetBudget"] = (
            DKSS_PRIMARY_REFRESH_MAX_ASSETS
        )
        schedule_coverage["strictCurrentRecoveryDkssFirst"] = bool(
            schedule_coverage.get("strictCurrentCollections")
            and scheduled
            and scheduled[0]
                == schedule_coverage.get("strictCurrentLeadCollection")
        )
        result["diagnostics"]["scheduledCollections"] = scheduled
        result["diagnostics"]["scheduleCoverageBeforeRun"] = schedule_coverage
    primary_refresh_assets_remaining = DKSS_PRIMARY_REFRESH_MAX_ASSETS
    replay_summary: dict[str, Any] = {"samplesWritten": 0}
    research_rotation_completed = False
    regional_proxy_collection_completed = False

    fresh_zone_ids: set[str] = set()
    fresh_marine_zone_ids: set[str] = set()
    productive_collections = 0
    bootstrap_locked_hours: dict[str, set[str]] = {}

    def flush_private_progress_sidecars() -> None:
        result["diagnostics"]["currentFieldShadow"] = (
            write_current_field_shadow_checkpoint(
                current_shadow,
                generated,
                selected_research_part_ids,
                research_run_metrics,
                regional_proxy_targets,
            )
        )
        if coastal_point_stage_targets:
            prune_coastal_point_stage_hours(coastal_point_stage, generated)
            save_coastal_point_stage(
                COASTAL_POINT_STAGE_PATH,
                coastal_point_stage,
            )

    def seal_current_operational_progress() -> None:
        """Bind every persisted bulk checkpoint to its exact usable DMI rows."""
        seal_current_operational_checkpoint(
            result,
            coastal_part_targets,
            locked_production_reference,
            prefetched_marine,
            retained_current_asset_proofs,
        )

    checkpoint_controller = ProgressCheckpointController(
        result,
        fresh_zone_ids,
        budget,
        flush_private_progress_sidecars,
        seal_current_operational_progress,
    )
    if wave_bootstrap_configuration is not None:
        try:
            bootstrap_locked_hours = execute_private_wave_history_bootstrap(
                result,
                zones,
                budget,
                fresh_zone_ids,
                wave_bootstrap_configuration,
                registry=load_wave_bootstrap_registry(part_doc),
                checkpoint_controller=checkpoint_controller,
                supervisor_skipped_assets=supervisor_skipped_assets,
                post_bootstrap_reserve_seconds=(
                    float(
                        schedule_coverage.get(
                            "criticalWamRuntimeReserveSeconds"
                        ) or 0.0
                    )
                    + float(
                        schedule_coverage.get(
                            "strictCurrentRuntimeReserveSeconds"
                        ) or 0.0
                    )
                ),
            )
        except Exception:
            checkpoint_controller.flush_if_due(force=True)
            raise

    critical_wam_collections = [
        collection
        for collection in schedule_coverage.get("criticalWamCollections", [])
        if collection in scheduled
    ]
    strict_current_collections = [
        collection
        for collection in schedule_coverage.get("strictCurrentCollections", [])
        if collection in scheduled
    ]
    strict_current_reserve, strict_current_reserve_total = (
        strict_current_runtime_reserve(
            strict_current_collections,
            runtime_remaining(),
        )
    )
    critical_wam_reserve, critical_wam_reserve_total = wam_runtime_reserve(
        critical_wam_collections,
        runtime_remaining(),
        lead_reserve_seconds=strict_current_reserve_total,
    )
    schedule_coverage["criticalWamRuntimeReserveSeconds"] = round(
        critical_wam_reserve_total, 3,
    )
    schedule_coverage["criticalWamRuntimeReserveSecondsByCollection"] = {
        collection: round(seconds, 3)
        for collection, seconds in critical_wam_reserve.items()
    }
    schedule_coverage["strictCurrentRuntimeReserveSeconds"] = round(
        strict_current_reserve_total, 3,
    )
    schedule_coverage["strictCurrentRuntimeReserveSecondsByCollection"] = {
        collection: round(seconds, 3)
        for collection, seconds in strict_current_reserve.items()
    }
    pending_critical_wam = list(critical_wam_collections)
    pending_critical_current = list(strict_current_collections)
    strict_current_lead_collection = schedule_coverage.get(
        "strictCurrentLeadCollection"
    )
    strict_current_lead_attempt_limit = max(
        0,
        int(schedule_coverage.get("strictCurrentLeadAttemptLimit") or 0),
    )

    for collection in scheduled:
        collection_is_critical_wam = collection in critical_wam_collections
        collection_is_critical_current = (
            collection in strict_current_collections
        )
        if (
            not collection_is_critical_wam
            and not collection_is_critical_current
            and productive_collections >= COLLECTIONS_PER_RUN
        ):
            break
        if collection_is_critical_wam:
            pending_critical_wam.remove(collection)
        if collection_is_critical_current:
            pending_critical_current.remove(collection)
        reserve_for_pending_critical = sum(
            critical_wam_reserve.get(pending, 0.0)
            for pending in pending_critical_wam
        ) + sum(
            strict_current_reserve.get(pending, 0.0)
            for pending in pending_critical_current
        )
        if (
            collection_is_critical_current
            and collection != strict_current_lead_collection
            and not pending_critical_wam
        ):
            reserve_for_pending_critical = max(
                reserve_for_pending_critical,
                fair_nonlead_strict_current_runtime_reserve(
                    pending_critical_current,
                    runtime_remaining(),
                    strict_current_reserve,
                ),
            )
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
        collection_start_error_count = len(result["diagnostics"]["errors"])
        strict_current_lead_attempts = 0
        collection_refresh_only = (
            DKSS_PRIMARY_MODE
            and collection in primary_refresh_only_collections
        )
        state = result["collectionState"].setdefault(collection, {})
        if begin_collection_scheduler_turn(
            state,
            collection,
            strict_current_lead_collection,
            generated,
        ):
            checkpoint_controller.mark_bulk_dirty()
        # Progress cadence is shared across collections by checkpoint_controller.
        # No collection-local checkpoint clock is maintained.
        try:
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            if collection in prefetched_marine:
                run, assets, stac_stats = prefetched_marine[collection]
            elif collection in WAVE_BOOTSTRAP_COLLECTIONS:
                run, assets, stac_stats = list_latest_assets(
                    collection,
                    None,
                    minimum_valid_time=(
                        wave_bootstrap_configuration["targetHour"]
                        if wave_bootstrap_configuration is not None
                        else canonical_time(locked_production_reference)
                    ),
                    required_valid_times=operational_wave_exact_required_times,
                    required_horizon_end_time=format_wave_bootstrap_hour(
                        locked_production_reference
                        + timedelta(hours=HOURS - 1)
                    ),
                    include_operational_wave_fallback_phases=True,
                )
            else:
                run, assets, stac_stats = list_latest_assets(collection, previous_run.get("referenceTime"))
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            if not assets:
                raise RuntimeError("no forecast-step GRIB assets found in latest STAC run")
            # The loop may replan only its unvisited LF suffix after each
            # validated regional gain. Never mutate the prefetched official
            # catalog used by the immutable T..T+117 ledger.
            assets = list(assets)
            bootstrap_operational_wam = (
                collection in WAVE_BOOTSTRAP_COLLECTIONS
            )
            collection_operational_wave_zones = (
                native_operational_wave_zones(
                    collection,
                    active_zones_config,
                )
                if bootstrap_operational_wam
                else []
            )
            if bootstrap_operational_wam:
                result["diagnostics"]["operationalWaveStageMode"] = (
                    "per-part-atomic-collection-run-candidate-monotone-promotion"
                )
                result["diagnostics"].setdefault(
                    "operationalWaveAssetCoverageByCollection", {}
                )[collection] = {}
            if collection in MARINE_COLLECTIONS:
                research_replay_catalog[collection] = {"modelRun": run, "assets": assets}
            zone_registry_signature = current_zone_registry_signature
            processing_signature = current_marine_processing_signature(
                zone_registry_signature
            )
            if collection == "harmonie_dini_sf":
                processing_signature += f"|wind-reference:{WIND_VECTOR_VERSION}"
            required_asset_provenance: dict[str, dict[str, Any]] = {}
            for asset in assets:
                asset_model_run = (
                    canonical_time(asset.get("modelRun"))
                    if collection in WAVE_BOOTSTRAP_COLLECTIONS
                    else run
                )
                identity = (
                    official_current_asset_identity(collection, run, asset)
                    if collection in MARINE_COLLECTIONS
                    else official_wave_asset_identity(
                        collection,
                        asset_model_run,
                        asset,
                    )
                    if collection in WAVE_BOOTSTRAP_COLLECTIONS
                    else None
                )
                if identity is not None and asset_identity_is_required_for_resume(
                    collection,
                    asset,
                    identity,
                    required_current_valid_times,
                ):
                    required_asset_provenance[str(identity["validTime"])] = identity
            same_processing = (
                previous_run.get("processingSignature") == processing_signature
            )
            same_run = previous_run.get("referenceTime") == run
            wave_resume_metrics: dict[str, Any] = {}
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
                    or collection in WAVE_BOOTSTRAP_COLLECTIONS
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
                actual_pair_source_keys=(
                    actual_current_pair_source_keys
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
                covered_pair_keys=(
                    covered_current_pair_keys
                    if collection in MARINE_COLLECTIONS
                    else None
                ),
                wave_cache=result if bootstrap_operational_wam else None,
                wave_zones=(
                    collection_operational_wave_zones
                    if bootstrap_operational_wam
                    else None
                ),
                wave_resume_metrics=(
                    wave_resume_metrics
                    if bootstrap_operational_wam
                    else None
                ),
            )
            priority_covered_pair_keys: set[tuple[str, str]] = set()
            if collection in MARINE_COLLECTIONS:
                priority_covered_pair_keys = set(covered_current_pair_keys)
                for valid_time, step in previous_steps.items():
                    source = canonical_current_source_asset(step.get("sourceAsset"))
                    if source is None:
                        continue
                    source_key = json.dumps(
                        source,
                        sort_keys=True,
                        separators=(",", ":"),
                        ensure_ascii=False,
                    )
                    unavailable = set(
                        (step.get("currentPartOutcomeProof") or {}).get(
                            "spatialUnavailablePartIds"
                        ) or []
                    )
                    for part_id in set(current_target_ids) - unavailable:
                        if (
                            part_id,
                            valid_time,
                            source_key,
                        ) in actual_current_pair_source_keys:
                            priority_covered_pair_keys.add((part_id, valid_time))
                planning_current_pairs = (
                    global_current_planning_pairs | priority_covered_pair_keys
                    if global_current_planning_pairs is not None
                    else priority_covered_pair_keys
                )
                regional_gap_pairs_by_time: dict[
                    str, set[tuple[str, str]]
                ] = {}
                verified_reusable_regional_times: set[str] = set()
                latest_regional_planning_pairs: set[tuple[str, str]] = set()
                if (
                    collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                    and regional_planning_context is not None
                ):
                    regional_gap_pairs_by_time = (
                        regional_lf_asset_gap_pairs_by_time(
                            assets,
                            run,
                            regional_target_part_ids,
                            required_current_valid_times,
                            planning_current_pairs,
                            locked_production_reference,
                        )
                    )
                    # Supplemental pre-target assets exist solely to close a
                    # real regional hold gap. They are never quality work or
                    # additions to the official current denominator.
                    assets = [
                        asset for asset in assets
                        if canonical_time(asset.get("valid"))
                            in required_current_valid_times
                        or regional_gap_pairs_by_time.get(
                            str(canonical_time(asset.get("valid")) or "")
                        )
                    ]
                    verified_reusable_regional_times = (
                        next_verified_reusable_regional_time(
                            assets,
                            collection,
                            run,
                            regional_gap_pairs_by_time,
                        )
                    )
                acquisition_requirements = {
                    str(asset["valid"]): classify_dkss_primary_asset(
                        collection=collection,
                        model_run=run,
                        asset=asset,
                        target_ids=current_target_ids,
                        covered_pair_keys=priority_covered_pair_keys,
                        cached_zones=result.get("zones") or {},
                        active_zone_ids=active_production_zone_ids,
                        enabled=DKSS_PRIMARY_MODE,
                        planning_covered_pair_keys=planning_current_pairs,
                        required_valid_times=required_current_valid_times,
                        regional_current_gap_count=len(
                            regional_gap_pairs_by_time.get(
                                str(canonical_time(asset.get("valid")) or ""),
                                set(),
                            )
                        ),
                    )
                    for asset in assets
                } if global_current_planning_pairs is not None else {}
                if acquisition_requirements:
                    acquisition_plan_diagnostics.setdefault(
                        "byCollection", {}
                    )[collection] = {
                        "criticalAssetCount": sum(
                            bool(row["critical"])
                            for row in acquisition_requirements.values()
                        ),
                        "optionalParentCurrentMissingAssetCount": sum(
                            int(row.get("optionalParentCurrentMissingCount") or 0) > 0
                            for row in acquisition_requirements.values()
                        ),
                        "refreshOnlyAssetCount": sum(
                            bool(row["deferValidRefresh"])
                            for row in acquisition_requirements.values()
                        ),
                        "regionalCriticalAssetCount": len(
                            regional_gap_pairs_by_time
                        ),
                        "regionalPotentialPairCount": sum(
                            len(pairs)
                            for pairs in regional_gap_pairs_by_time.values()
                        ),
                        "regionalReusableCriticalAssetCount": len(
                            verified_reusable_regional_times
                        ),
                    }
                assets = prioritize_marine_assets_for_current_gaps(
                    assets,
                    current_target_ids,
                    planning_current_pairs,
                    critical_by_time={
                        valid_time: bool(row["critical"])
                        for valid_time, row in acquisition_requirements.items()
                    },
                    direct_valid_times=required_current_valid_times,
                    regional_gap_pairs_by_time=regional_gap_pairs_by_time,
                    verified_reusable_valid_times=(
                        verified_reusable_regional_times
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
            previously_traversed = (
                {
                    valid for valid, step in previous_steps.items()
                    if step.get("assetTraversalComplete") is True
                    and set(step.get("recognizedParameters") or [])
                        >= required_for_family
                    and int(step.get("zonesTouched") or 0) > 0
                }
                if bootstrap_operational_wam
                else set(previously_processed)
            )
            wave_missing_valid_times: tuple[str, ...] = ()
            if bootstrap_operational_wam:
                _wave_closure_before_assets, wave_missing_valid_times = (
                    operational_wave_collection_closure(
                        result,
                        active_zones_config,
                        locked_production_reference,
                        collection,
                        exact_required_times=(
                            operational_wave_exact_required_times
                        ),
                    )
                )
                assets = prioritize_operational_wave_assets(
                    assets,
                    wave_missing_valid_times,
                    previously_traversed,
                )
            result["diagnostics"]["assetsRetriedIncomplete"] += max(
                0, len(previous_steps) - len(previously_traversed)
            )
            wave_phase_asset_counts = {
                phase_rank: sum(
                    int(asset.get("operationalWavePhaseRank") or 0)
                        == phase_rank
                    for asset in assets
                )
                for phase_rank in {
                    int(asset.get("operationalWavePhaseRank") or 0)
                    for asset in assets
                }
            } if bootstrap_operational_wam else {0: len(assets)}

            def new_collection_run_info(
                reference_time: str,
                discovered: int,
                steps: dict[str, Any],
                resume_metrics: dict[str, Any] | None = None,
            ) -> dict[str, Any]:
                completed = {
                    valid for valid, step in steps.items()
                    if step.get("complete") is True
                    and set(step.get("recognizedParameters") or [])
                        >= required_for_family
                    and int(step.get("zonesTouched") or 0) > 0
                }
                traversed = (
                    {
                        valid for valid, step in steps.items()
                        if step.get("assetTraversalComplete") is True
                        and set(step.get("recognizedParameters") or [])
                            >= required_for_family
                        and int(step.get("zonesTouched") or 0) > 0
                    }
                    if bootstrap_operational_wam
                    else set(completed)
                )
                proof_complete = {
                    valid for valid, step in steps.items()
                    if step.get("complete") is True
                    and set(step.get("recognizedParameters") or [])
                        >= required_for_family
                    and int(step.get("zonesTouched") or 0) > 0
                }
                metrics = resume_metrics or {}
                return {
                    "referenceTime": reference_time,
                    "parserVersion": PARSER_VERSION,
                    "parameterMapVersion": PARAMETER_MAP_VERSION,
                    "gridLookupVersion": GRID_LOOKUP_VERSION,
                    "processingSignature": processing_signature,
                    "assetsDiscovered": discovered,
                    "assetsProcessed": 0,
                    "assetsReused": 0,
                    **({
                        "rawAssetsReused": 0,
                        "assetsObserved": 0,
                        "assetsTraversalCompleteAtStart": len(traversed),
                        "assetsTraversalComplete": len(traversed),
                        "assetsProofCompleteAtStart": len(proof_complete),
                        "assetsProofComplete": len(proof_complete),
                        "assetsProofCompleteReconstructed": int(
                            metrics.get("reconstructedProofCompleteAssets")
                            or 0
                        ),
                        "assetsPartiallyAdmittedAtStart": int(
                            metrics.get("partiallyAdmittedAssets") or 0
                        ),
                        "assetsAdmitted": 0,
                        "assetsPartiallyAdmitted": 0,
                        "assetsRejectedAfterTraversal": 0,
                        "waveObservedRejectionEventsByCode": dict(
                            metrics.get("rejectedByCode") or {}
                        ),
                        "nativeClosureStoppedAssetLoop": False,
                        "assetsDeferredAfterNativeClosure": 0,
                    } if bootstrap_operational_wam else {}),
                    "assetsSkippedBySupervisor": 0,
                    "assetsSkippedPreviouslyProcessed": 0,
                    "assetsDeferredValidRefresh": 0,
                    "assetsBoundedRefreshAttempted": 0,
                    "assetsBoundedRefreshCompleted": 0,
                    "assetsBoundedRefreshFailed": 0,
                    "processedValidTimes": sorted(completed, key=epoch),
                    **({
                        "traversedValidTimes": sorted(traversed, key=epoch),
                    } if bootstrap_operational_wam else {}),
                    "processedSteps": copy.deepcopy(steps),
                    "recognizedParameters": [],
                }

            initial_phase_run = (
                canonical_time(assets[0].get("modelRun"))
                if bootstrap_operational_wam
                else run
            )
            if initial_phase_run is None:
                raise RuntimeError("operational WAM asset lacks its model run")
            run_info = new_collection_run_info(
                initial_phase_run,
                wave_phase_asset_counts.get(0, len(assets)),
                previous_steps,
                wave_resume_metrics,
            )
            if not bootstrap_operational_wam:
                result["runs"][collection] = run_info
            recognized: set[str] = set()
            for previous_step in (run_info.get("processedSteps") or {}).values():
                if (
                    previous_step.get("assetTraversalComplete") is True
                    if bootstrap_operational_wam
                    else previous_step.get("complete") is True
                ):
                    recognized.update(previous_step.get("recognizedParameters") or [])
            budget_stop = None
            budget_stop_code = None
            stop_for_native_wave_closure = False
            wave_phase_rank = 0
            wave_phase_run = initial_phase_run
            wave_phase_seen_asset_count = 0
            wave_phase_proven_asset_keys: set[str] = set()
            wave_phase_promotion_count = 0
            wave_collection_promotion_count = 0
            wave_pending_touched: set[str] = set()
            wave_phase_summaries: list[dict[str, Any]] = []
            wave_candidate = (
                build_operational_wave_collection_candidate(result)
                if bootstrap_operational_wam
                else result
            )
            wave_active_evidence = (
                operational_wave_collection_evidence(
                    result,
                    active_zones_config,
                    locked_production_reference,
                    collection,
                    exact_required_times=(
                        operational_wave_exact_required_times
                    ),
                )
                if bootstrap_operational_wam
                else {}
            )
            wave_phase_deferred_quality_promotion = bool(
                bootstrap_operational_wam
                and operational_wave_phase_defers_primary_quality_promotion(
                    phase_rank=wave_phase_rank,
                    active_evidence=wave_active_evidence,
                )
            )
            wave_phase_terminal_promotion_evaluated = False
            wave_last_promotion_decision: dict[str, Any] | None = None

            def record_wave_phase_summary(*, fully_traversed: bool) -> None:
                if not bootstrap_operational_wam:
                    return
                if any(
                    row.get("phaseRank") == wave_phase_rank
                    for row in wave_phase_summaries
                ):
                    return
                wave_phase_summaries.append({
                    "phaseRank": wave_phase_rank,
                    "modelRun": wave_phase_run,
                    "selectedAssetCount": wave_phase_asset_counts.get(
                        wave_phase_rank, 0,
                    ),
                    "assetsReached": wave_phase_seen_asset_count,
                    "assetsProven": len(wave_phase_proven_asset_keys),
                    "fullyTraversed": fully_traversed,
                    "promotionCount": wave_phase_promotion_count,
                    "lastPromotionDecision": (
                        dict(wave_last_promotion_decision)
                        if wave_last_promotion_decision is not None
                        else None
                    ),
                })

            def try_promote_wave_candidate(
                *,
                asset_processing_seconds: float | None,
                force_checkpoint: bool = False,
            ) -> tuple[bool, str]:
                nonlocal wave_active_evidence
                nonlocal wave_pending_touched
                nonlocal wave_phase_promotion_count
                nonlocal wave_collection_promotion_count
                nonlocal wave_last_promotion_decision
                nonlocal wave_phase_deferred_quality_promotion
                (
                    candidate_evidence,
                    candidate_single_group,
                ) = operational_wave_candidate_stage_evidence(
                    wave_candidate,
                    active_zones_config,
                    locked_production_reference,
                    collection,
                    exact_required_times=(
                        operational_wave_exact_required_times
                    ),
                    active_evidence=wave_active_evidence,
                )
                decision = promote_operational_wave_collection_stage(
                    active_result=result,
                    candidate_result=wave_candidate,
                    collection=collection,
                    phase_model_run=wave_phase_run,
                    fallback_phase=wave_phase_rank > 0,
                    active_evidence=wave_active_evidence,
                    candidate_evidence=candidate_evidence,
                    candidate_single_group=candidate_single_group,
                    touched_zone_ids=wave_pending_touched,
                    run_info=run_info,
                    fresh_zone_ids=fresh_zone_ids,
                    exact_required_times=(
                        operational_wave_exact_required_times
                    ),
                    checkpoint_controller=checkpoint_controller,
                    asset_processing_seconds=asset_processing_seconds,
                    force_checkpoint=force_checkpoint,
                )
                wave_last_promotion_decision = decision
                if not decision["promote"]:
                    return False, str(decision["reasonCode"])
                wave_active_evidence = candidate_evidence
                wave_pending_touched = set()
                wave_phase_promotion_count += 1
                wave_collection_promotion_count += 1
                wave_phase_deferred_quality_promotion = (
                    operational_wave_phase_defers_primary_quality_promotion(
                        phase_rank=wave_phase_rank,
                        active_evidence=wave_active_evidence,
                    )
                )
                return (
                    True,
                    "checkpoint gemt"
                    if decision["checkpointWritten"]
                    else "checkpoint samler promoverede assets",
                )

            def finish_wave_phase(
                *,
                fully_traversed: bool,
            ) -> tuple[bool, str]:
                nonlocal wave_phase_terminal_promotion_evaluated
                if wave_phase_terminal_promotion_evaluated:
                    return False, "faseafslutning allerede vurderet"
                wave_phase_terminal_promotion_evaluated = True
                if not operational_wave_terminal_quality_promotion_allowed(
                    promotion_deferred=(
                        wave_phase_deferred_quality_promotion
                    ),
                    phase_fully_traversed=fully_traversed,
                    stop_code=budget_stop_code,
                    candidate_changed=bool(wave_pending_touched),
                ):
                    return False, "ingen terminal quality-promotion"
                return try_promote_wave_candidate(
                    asset_processing_seconds=None,
                    force_checkpoint=True,
                )

            for asset_number, asset in enumerate(assets, start=1):
                bounded_primary_refresh = False
                asset_phase_rank = int(
                    asset.get("operationalWavePhaseRank") or 0
                )
                asset_model_run = (
                    canonical_time(asset.get("modelRun"))
                    if bootstrap_operational_wam
                    else run
                )
                if asset_model_run is None:
                    raise RuntimeError(
                        "operational WAM asset lacks its model run"
                    )
                if bootstrap_operational_wam and (
                    asset_phase_rank < wave_phase_rank
                    or (
                        asset_phase_rank == wave_phase_rank
                        and asset_model_run != wave_phase_run
                    )
                ):
                    raise RuntimeError(
                        "operational WAM run phases are interleaved"
                    )
                if (
                    bootstrap_operational_wam
                    and asset_phase_rank > wave_phase_rank
                ):
                    if (
                        wave_phase_deferred_quality_promotion
                        and budget_stop_code is None
                        and should_stop_work()
                    ):
                        budget_stop = (
                            "bulk runtime budget reached before terminal WAM "
                            "quality proof"
                        )
                        budget_stop_code = "RUNTIME_BUDGET_REACHED"
                    previous_fully_traversed = (
                        operational_wave_phase_fully_traversed(
                            selected_asset_count=wave_phase_asset_counts.get(
                                wave_phase_rank, 0,
                            ),
                            proven_asset_count=len(
                                wave_phase_proven_asset_keys
                            ),
                            stop_code=budget_stop_code,
                            native_closure_stopped=(
                                stop_for_native_wave_closure
                            ),
                        )
                    )
                    finish_wave_phase(
                        fully_traversed=previous_fully_traversed,
                    )
                    record_wave_phase_summary(
                        fully_traversed=previous_fully_traversed,
                    )
                    if not operational_wave_fallback_phase_allowed(
                        previous_phase_rank=wave_phase_rank,
                        next_phase_rank=asset_phase_rank,
                        previous_phase_fully_traversed=(
                            previous_fully_traversed
                        ),
                        stop_code=budget_stop_code,
                        active_evidence=wave_active_evidence,
                    ):
                        break
                    if not checkpoint_controller.can_start_asset(
                        reserve_seconds=reserve_for_pending_critical,
                    ):
                        if reserve_for_pending_critical > 0:
                            budget_stop = (
                                "older WAM fallback deferred to preserve "
                                "the critical runtime slice"
                            )
                            budget_stop_code = (
                                "CRITICAL_COLLECTION_RUNTIME_RESERVED"
                            )
                        else:
                            budget_stop = (
                                "bulk runtime budget reached before older "
                                "WAM fallback"
                            )
                            budget_stop_code = "RUNTIME_BUDGET_REACHED"
                        break
                    wave_phase_rank = asset_phase_rank
                    wave_phase_run = asset_model_run
                    wave_phase_seen_asset_count = 0
                    wave_phase_proven_asset_keys = set()
                    wave_phase_promotion_count = 0
                    wave_pending_touched = set()
                    wave_last_promotion_decision = None
                    wave_phase_deferred_quality_promotion = False
                    wave_phase_terminal_promotion_evaluated = False
                    wave_candidate = (
                        build_operational_wave_collection_candidate(result)
                    )
                    previously_processed = set()
                    previously_traversed = set()
                    run_info = new_collection_run_info(
                        wave_phase_run,
                        wave_phase_asset_counts.get(wave_phase_rank, 0),
                        {},
                    )
                    recognized = set()
                if bootstrap_operational_wam and should_stop_work():
                    budget_stop = "bulk runtime budget reached"
                    budget_stop_code = "RUNTIME_BUDGET_REACHED"
                    break
                wave_phase_seen_asset_count += int(bootstrap_operational_wam)
                supervised_identity = supervised_asset_identity(
                    collection,
                    asset_model_run,
                    asset,
                )
                supervised_identity_key = json.dumps(
                    supervised_identity,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                )
                if supervised_identity_key in supervisor_skipped_assets:
                    run_info["assetsSkippedBySupervisor"] += 1
                    result["diagnostics"].setdefault(
                        "assetsSkippedBySupervisor", []
                    ).append({
                        **supervised_identity,
                        "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                    })
                    result["diagnostics"]["errors"].append({
                        "collection": collection,
                        "validTime": supervised_identity["validTime"],
                        "message": (
                            "one bounded asset was skipped after a processing timeout"
                        ),
                        "failureCode": "ASSET_PROCESSING_WATCHDOG_TIMEOUT",
                        "partialProgressPreserved": True,
                    })
                    progress(
                        f"{collection}: skipping stalled forecast step "
                        f"{asset_number}/{len(assets)} {asset['valid']}; "
                        "later providers receive the exact residual"
                    )
                    continue
                primary_requirement = None
                if DKSS_PRIMARY_MODE and collection in MARINE_COLLECTIONS:
                    primary_requirement = classify_dkss_primary_asset(
                        collection=collection,
                        model_run=asset_model_run,
                        asset=asset,
                        target_ids=current_target_ids,
                        covered_pair_keys=priority_covered_pair_keys,
                        cached_zones=result.get("zones") or {},
                        active_zone_ids=active_production_zone_ids,
                        enabled=True,
                        planning_covered_pair_keys=(
                            planning_current_pairs
                            if global_current_planning_pairs is not None else None
                        ),
                        required_valid_times=required_current_valid_times,
                        regional_current_gap_count=len(
                            regional_gap_pairs_by_time.get(
                                str(canonical_time(asset.get("valid")) or ""),
                                set(),
                            )
                        ),
                    )
                    if primary_requirement["deferValidRefresh"]:
                        bounded_primary_refresh = (
                            should_attempt_dkss_primary_refresh(
                                valid_time=asset["valid"],
                                previously_processed=previously_processed,
                                collection_refresh_only=collection_refresh_only,
                                critical_work_observed=(
                                    primary_critical_work_observed
                                ),
                                remaining_asset_budget=(
                                    primary_refresh_assets_remaining
                                ),
                            )
                        )
                        if not bounded_primary_refresh:
                            run_info["assetsDeferredValidRefresh"] += 1
                            result["diagnostics"]["assetsDeferredValidDkssRefresh"] += 1
                            progress(
                                f"{collection}: forecast-step {asset_number}/{len(assets)} "
                                f"{asset['valid']} deferred; exact validated cache remains usable"
                            )
                            continue
                if asset["valid"] in bootstrap_locked_hours.get(collection, set()):
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["bootstrapLockedStepsSkipped"] = int(
                        result["diagnostics"].get("bootstrapLockedStepsSkipped") or 0
                    ) + 1
                    continue
                if should_skip_previously_processed_asset(
                    asset["valid"],
                    (
                        previously_traversed
                        if bootstrap_operational_wam
                        else previously_processed
                    ),
                    primary_requirement,
                    regional_observation_reusable=(
                        collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                        and asset["valid"] in previously_processed
                        and reusable_regional_asset_observation(
                            previous_steps.get(asset["valid"]), current_shadow,
                            processing_signature=processing_signature,
                            target_registry_sha256=current_target_registry_sha256,
                            policy=regional_proxy_policy,
                            regional_part_ids=regional_target_part_ids,
                        )
                    ),
                ):
                    if bootstrap_operational_wam:
                        wave_phase_proven_asset_keys.add(
                            supervised_identity_key
                        )
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    if bootstrap_operational_wam and should_stop_work():
                        budget_stop = (
                            "bulk runtime budget reached before cached WAM "
                            "proof reuse"
                        )
                        budget_stop_code = "RUNTIME_BUDGET_REACHED"
                        break
                    if (
                        coastal_point_stage_targets
                        and not stage_asset_complete(coastal_point_stage, coastal_point_stage_targets, collection, asset["valid"])
                        and not should_stop_work()
                    ):
                        cached_path = reusable_cached_asset_path(
                            asset,
                            collection,
                            asset_model_run,
                        )
                        if cached_path is not None:
                            register_raw_cache_asset(
                                cached_path,
                                str(asset.get("href") or ""),
                                collection,
                                asset_model_run,
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
                            with supervised_asset_operation(supervised_identity):
                                (
                                    _stage_found,
                                    _stage_touched,
                                    staged_interrupted,
                                    _stage_messages,
                                    _stage_lookups,
                                ) = process_grib_transactionally(
                                    cached_path,
                                    collection,
                                    asset_model_run,
                                    asset["valid"],
                                    coastal_point_stage_targets,
                                    {"generatedAt": generated, "zones": {}},
                                    private_diagnostics,
                                    None,
                                    coastal_point_stage,
                                    failure_flush=lambda: checkpoint_controller.flush_if_due(force=True),
                            )
                            if not staged_interrupted:
                                checkpoint_controller.mark_sidecars_dirty()
                            elif bootstrap_operational_wam:
                                budget_stop = (
                                    "bulk runtime budget reached inside "
                                    "cached WAM sidecar replay"
                                )
                                budget_stop_code = "RUNTIME_BUDGET_REACHED"
                                break
                    continue
                if (
                    not strict_current_lead_attempt_available(
                        collection,
                        strict_current_lead_collection,
                        strict_current_lead_attempts,
                        strict_current_lead_attempt_limit,
                    )
                ):
                    budget_stop = (
                        "strict current lead yielded after its bounded "
                        "asset attempt"
                    )
                    budget_stop_code = "STRICT_CURRENT_LEAD_ATTEMPT_LIMIT"
                    break
                if not checkpoint_controller.can_start_asset(
                    reserve_seconds=reserve_for_pending_critical,
                ):
                    checkpoint_controller.flush_if_due(force=True)
                    if reserve_for_pending_critical > 0:
                        budget_stop = (
                            "asset deferred to preserve the pending critical "
                            "runtime slice"
                        )
                        budget_stop_code = (
                            "CRITICAL_COLLECTION_RUNTIME_RESERVED"
                        )
                    else:
                        budget_stop = "bulk runtime budget reached"
                        budget_stop_code = "RUNTIME_BUDGET_REACHED"
                    break
                if collection == strict_current_lead_collection:
                    strict_current_lead_attempts += 1
                    run_info["strictCurrentLeadAssetsAttempted"] = (
                        strict_current_lead_attempts
                    )
                if bounded_primary_refresh:
                    primary_refresh_assets_remaining -= 1
                    run_info["assetsBoundedRefreshAttempted"] += 1
                    result["diagnostics"]["assetsBoundedDkssRefreshAttempted"] = int(
                        result["diagnostics"].get(
                            "assetsBoundedDkssRefreshAttempted"
                        ) or 0
                    ) + 1
                try:
                    with supervised_asset_operation(supervised_identity):
                        path, reused = download_asset(
                            asset["href"],
                            asset.get("size"),
                            budget,
                            collection=collection,
                            model_run=asset_model_run,
                            valid_time=asset["valid"],
                            item_id=str(asset.get("id") or "") or None,
                            item_created_at=asset.get("itemCreatedAt"),
                            item_updated_at=asset.get("itemUpdatedAt"),
                        )
                except RuntimeError as exc:
                    if bounded_primary_refresh:
                        run_info["assetsBoundedRefreshFailed"] += 1
                        result["diagnostics"]["assetsBoundedDkssRefreshFailed"] = int(
                            result["diagnostics"].get(
                                "assetsBoundedDkssRefreshFailed"
                            ) or 0
                        ) + 1
                    if "budget" in str(exc).lower():
                        budget_stop = safe_error_message(exc)
                        budget_stop_code = "RUNTIME_BUDGET_REACHED"
                        break
                    result["diagnostics"]["errors"].append({
                        "collection": collection,
                        "validTime": supervised_identity["validTime"],
                        "message": safe_error_message(exc),
                        "failureCode": collection_failure_code(exc),
                        "failureClass": "asset-download",
                        "partialProgressPreserved": True,
                    })
                    checkpoint_controller.flush_if_due(force=True)
                    progress(
                        f"{collection}: forecast-step "
                        f"{asset_number}/{len(assets)} {asset['valid']} "
                        "could not be downloaded and was skipped; later files "
                        "and providers receive the exact residual"
                    )
                    continue
                if reused:
                    result["diagnostics"]["reusedAssets"] += 1
                    run_info["assetsReused"] += 1
                    if bootstrap_operational_wam:
                        run_info["rawAssetsReused"] += 1
                progress(f"{collection}: behandler forecast-step {asset_number}/{len(assets)} {asset['valid']} ({'genbrugt' if reused else 'downloadet'})")
                asset_processing_started = time.monotonic()
                current_part_outcome_observation: dict[str, Any] = {}
                source_capture = (
                    raw_cache_source_capture(
                        path,
                        collection,
                        asset_model_run,
                        asset["valid"],
                    )
                    if collection in MARINE_COLLECTIONS
                    or collection in WAVE_BOOTSTRAP_COLLECTIONS
                    else None
                )
                if collection in MARINE_COLLECTIONS:
                    step_source_asset = canonical_current_source_asset({
                        "collection": collection,
                        "modelRun": asset_model_run,
                        "validTime": asset["valid"],
                        **(source_capture or {}),
                    }) if source_capture is not None else None
                elif collection in WAVE_BOOTSTRAP_COLLECTIONS:
                    expected_wave_asset = official_wave_asset_identity(
                        collection, asset_model_run, asset,
                    )
                    step_source_asset = (
                        expected_wave_asset
                        if expected_wave_asset is not None
                        and source_capture is not None
                        and source_capture.get("itemId")
                            == expected_wave_asset["itemId"]
                        and source_capture.get("assetIdentitySha256")
                            == expected_wave_asset["assetIdentitySha256"]
                        and (
                            expected_wave_asset["assetSizeBytes"] is None
                            or source_capture.get("contentLengthBytes")
                                == expected_wave_asset["assetSizeBytes"]
                        )
                        else None
                    )
                else:
                    step_source_asset = None
                validated_current_stage: dict[str, Any] = {}
                regional_input_changed = False
                validated_wave_stage: dict[str, Any] = {}
                validated_wave_rejections: dict[str, int] = {}
                allowed_parameters = operational_asset_parameter_filter(
                    collection,
                    asset["valid"],
                    asset_model_run,
                    required_current_valid_times,
                )
                operational_wave_asset = (
                    MappingWaveAsset(
                        asset,
                        asset_model_run,
                        official_identity=official_wave_asset_identity(
                            collection,
                            asset_model_run,
                            asset,
                        ),
                    )
                    if bootstrap_operational_wam
                    else None
                )
                operational_wave_zones = collection_operational_wave_zones

                def validate_operational_wave_stage(
                    staged_result: dict[str, Any],
                    _private_stage: dict[str, Any] | None,
                    outcome: tuple[set[str], set[str], bool, int, int],
                ) -> bool:
                    if not bootstrap_operational_wam:
                        return True
                    if operational_wave_asset is None:
                        return False
                    summary = private_wave_bootstrap_asset_summary(
                        staged_result,
                        operational_wave_zones,
                        collection,
                        operational_wave_asset,
                    )
                    validated_wave_stage.clear()
                    validated_wave_stage.update(summary)
                    validated_wave_rejections.clear()
                    validated_wave_rejections.update(
                        observed_wave_asset_rejections(
                            result["diagnostics"],
                            staged_result,
                            operational_wave_zones,
                            collection,
                            operational_wave_asset,
                        )
                    )
                    return operational_wave_asset_stage_admissible(
                        wave_candidate,
                        staged_result,
                        operational_wave_zones,
                        collection,
                        operational_wave_asset,
                        summary,
                        outcome,
                    )

                def validate_operational_current_stage(
                    staged_result: dict[str, Any],
                    _private_stage: dict[str, Any] | None,
                    outcome: tuple[set[str], set[str], bool, int, int],
                    part_outcomes: dict[str, Any] | None,
                ) -> bool:
                    if collection not in MARINE_COLLECTIONS:
                        return True
                    if (
                        step_source_asset is None
                        or not REQUIRED_TARGETS["marine"] <= set(outcome[0])
                        or not outcome[1]
                        or not isinstance(part_outcomes, dict)
                        or part_outcomes.get("complete") is not True
                        or part_outcomes.get("targetPartIds") != current_target_ids
                    ):
                        return False
                    try:
                        proof = build_current_part_outcome_proof(
                            part_outcomes.get("spatialUnavailablePartIds"),
                            current_target_ids,
                            current_target_registry_sha256,
                            processing_signature,
                            step_source_asset,
                        )
                        valid_at = datetime.fromisoformat(
                            asset["valid"].replace("Z", "+00:00")
                        )
                        staged_attestation = coastal_part_current_attestation(
                            staged_result,
                            coastal_part_targets,
                            valid_at,
                            valid_at,
                            [step_source_asset],
                            [],
                        )
                    except (TypeError, ValueError):
                        return False
                    expected_part_ids = set(current_target_ids) - set(
                        proof["spatialUnavailablePartIds"]
                    )
                    new_source_part_ids = {
                        row["partId"]
                        for row in staged_attestation.get("verifiedPairs") or []
                    }
                    if not new_source_part_ids <= expected_part_ids:
                        return False
                    for part_id in current_target_ids:
                        zone_id = f"PART::{part_id}"
                        before_hour = (
                            (((result.get("zones") or {}).get(zone_id) or {}).get(
                                "hourly"
                            ) or {}).get(asset["valid"])
                        )
                        after_hour = (
                            (((staged_result.get("zones") or {}).get(zone_id) or {}).get(
                                "hourly"
                            ) or {}).get(asset["valid"])
                        )
                        before_tuple = (
                            before_hour.get("current-u"),
                            before_hour.get("current-v"),
                            (before_hour.get("sources") or {}).get("current"),
                        ) if isinstance(before_hour, dict) else None
                        after_tuple = (
                            after_hour.get("current-u"),
                            after_hour.get("current-v"),
                            (after_hour.get("sources") or {}).get("current"),
                        ) if isinstance(after_hour, dict) else None
                        if part_id in new_source_part_ids:
                            continue
                        if part_id not in expected_part_ids:
                            before_source = canonical_current_source_asset(
                                before_tuple[2] if before_tuple is not None else None
                            )
                            before_source_key = json.dumps(
                                before_source,
                                sort_keys=True,
                                separators=(",", ":"),
                                ensure_ascii=False,
                            ) if before_source is not None else ""
                            before_trusted = (
                                part_id,
                                asset["valid"],
                                before_source_key,
                            ) in actual_current_pair_source_keys
                            if before_trusted and after_tuple != before_tuple:
                                return False
                            continue
                        if after_tuple != before_tuple:
                            return False
                        retained_source = canonical_current_source_asset(
                            after_tuple[2] if after_tuple is not None else None
                        )
                        if retained_source is None:
                            return False
                        retained_source_key = json.dumps(
                            retained_source,
                            sort_keys=True,
                            separators=(",", ":"),
                            ensure_ascii=False,
                        )
                        if (
                            part_id,
                            asset["valid"],
                            retained_source_key,
                        ) not in actual_current_pair_source_keys:
                            return False
                    validated_current_stage["partOutcomeProof"] = proof
                    return True

                def preserve_operational_regional_source(shadow_stage: dict[str, Any]) -> None:
                    nonlocal regional_input_changed
                    if (
                        collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                        and regional_proxy_configuration_status == "CONFIGURED"
                        and regional_lf_is_native_source_time(
                            asset_model_run, asset["valid"],
                        )
                    ):
                        observation_args = {
                            "source_asset": step_source_asset,
                            "processing_signature": processing_signature,
                            "target_registry_sha256": current_target_registry_sha256,
                            "policy": regional_proxy_policy,
                            "regional_part_ids": regional_target_part_ids,
                        }
                        before_observation = regional_asset_observation(
                            current_shadow, **observation_args,
                        )
                        capture_counts = capture_regional_source_proof(
                            shadow_stage,
                            previous_shadow=current_shadow,
                            policy=regional_proxy_policy,
                            targets=coastal_part_targets,
                            source_asset=step_source_asset,
                            part_outcome_proof=validated_current_stage["partOutcomeProof"],
                            processing_signature=processing_signature,
                        )
                        after_observation = regional_asset_observation(
                            shadow_stage, **observation_args,
                        )
                        regional_input_changed = (
                            before_observation is None or after_observation is None
                            or before_observation != after_observation
                        )
                        if (after_observation is not None
                                and not capture_counts["invalidSamples"]
                                and not capture_counts["blockedIndex"]):
                            validated_current_stage["regionalObservation"] = after_observation

                if bootstrap_operational_wam:
                    clear_wave_target_rejection_diagnostics(
                        result["diagnostics"],
                        operational_wave_zones,
                    )
                with supervised_asset_operation(supervised_identity):
                    try:
                        found, touched, interrupted, messages_seen, zone_lookups = process_grib_transactionally(
                            path,
                            collection,
                            asset_model_run,
                            asset["valid"],
                            zones,
                            wave_candidate,
                            result["diagnostics"],
                            current_shadow,
                            coastal_point_stage,
                            current_part_outcome_observation,
                            allowed_parameters=allowed_parameters,
                            failure_flush=lambda: checkpoint_controller.flush_if_due(force=True),
                            stage_validator=validate_operational_wave_stage,
                            current_stage_validator=validate_operational_current_stage,
                            finalize_shadow_stage=preserve_operational_regional_source,
                            locked_operational_reference=canonical_time(locked_production_reference),
                            trusted_current_pair_source_keys=(
                                actual_current_pair_source_keys
                                if collection in MARINE_COLLECTIONS
                                else None
                            ),
                            validation_error=(
                                "operational DKSS asset lacks exact pre-commit provenance"
                                if collection in MARINE_COLLECTIONS
                                else "operational WAM asset lacks required fields"
                            ),
                        )
                    except (
                        DmiGridLookupError,
                        KeyError,
                        TypeError,
                        IndexError,
                        AttributeError,
                        ValueError,
                        RuntimeError,
                        OSError,
                    ) as exc:
                        if bootstrap_operational_wam and validated_wave_stage:
                            wave_asset_coverage = result["diagnostics"].setdefault(
                                "operationalWaveAssetCoverageByCollection", {}
                            ).setdefault(collection, {})
                            accumulate_wave_asset_coverage(
                                wave_asset_coverage,
                                validated_wave_stage,
                                admitted=False,
                                observed_rejected_by_code=(
                                    validated_wave_rejections
                                ),
                            )
                            run_info["assetsRejectedAfterTraversal"] += 1
                            rejected_by_code = run_info[
                                "waveObservedRejectionEventsByCode"
                            ]
                            for code, count in validated_wave_rejections.items():
                                rejected_by_code[code] = (
                                    int(rejected_by_code.get(code) or 0)
                                    + int(count)
                                )
                            controlled_reason = (
                                "NO_USABLE_TUPLES"
                                if int(
                                    validated_wave_stage.get("acceptedCount")
                                    or 0
                                ) == 0
                                else "LINEAGE_OR_ADMISSION_DEFERRED"
                            )
                            controlled = result["diagnostics"].setdefault(
                                "operationalWaveControlledRejectionsByCollection",
                                {},
                            ).setdefault(collection, {})
                            controlled[controlled_reason] = int(
                                controlled.get(controlled_reason) or 0
                            ) + 1
                            run_info["assetsObserved"] += 1
                            recognized.update(REQUIRED_TARGETS["wave"])
                            run_info["recognizedParameters"] = sorted(recognized)
                            checkpoint_controller.observe_asset_duration(
                                time.monotonic() - asset_processing_started
                            )
                            checkpoint_controller.mark_bulk_dirty()
                            checkpoint_controller.flush_if_due(force=True)
                            progress(
                                f"{collection}: forecast-step "
                                f"{asset_number}/{len(assets)} blev læst færdig "
                                "men gav ingen sikkert admittérbar tidsdel; "
                                "aktiv cache er uændret, og næste asset fortsætter"
                            )
                            continue
                        if bounded_primary_refresh:
                            run_info["assetsBoundedRefreshFailed"] += 1
                            result["diagnostics"]["assetsBoundedDkssRefreshFailed"] = int(
                                result["diagnostics"].get(
                                    "assetsBoundedDkssRefreshFailed"
                                ) or 0
                            ) + 1
                        result["diagnostics"]["errors"].append({
                            "collection": collection,
                            "validTime": supervised_identity["validTime"],
                            "message": safe_error_message(exc),
                            "failureCode": collection_failure_code(exc),
                            "failureClass": "asset-processing",
                            "partialProgressPreserved": (
                                False if bootstrap_operational_wam else True
                            ),
                            "activeCachePreserved": True,
                        })
                        checkpoint_controller.flush_if_due(force=True)
                        progress(
                            f"{collection}: forecast-step "
                            f"{asset_number}/{len(assets)} {asset['valid']} "
                            "failed transactionally and was skipped; later files "
                            "and providers receive the exact residual"
                        )
                        continue
                asset_processing_seconds = time.monotonic() - asset_processing_started
                if bootstrap_operational_wam:
                    clear_wave_target_rejection_diagnostics(
                        result["diagnostics"],
                        operational_wave_zones,
                    )
                scrub_private_stage_diagnostics(result["diagnostics"])
                if coastal_point_stage_targets and not interrupted:
                    checkpoint_controller.mark_sidecars_dirty()
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
                    checkpoint_controller.mark_sidecars_dirty()
                if (
                    collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                    and regional_proxy_targets
                    and not interrupted
                    and {"current-u", "current-v"} <= found
                ):
                    regional_proxy_collection_completed = True
                if not interrupted and bootstrap_operational_wam:
                    run_info["assetsObserved"] += 1
                recognized.update(found)
                run_info["recognizedParameters"] = sorted(recognized)
                result["diagnostics"]["messagesSeen"] += messages_seen
                result["diagnostics"]["zoneLookups"] += zone_lookups
                required_for_family = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
                step_recognized = sorted(set(found) & set(TARGETS[COLLECTION_FAMILY[collection]]))
                step_part_outcome_proof = validated_current_stage.get(
                    "partOutcomeProof"
                )
                step_wave_target_proof = (
                    dict(validated_wave_stage)
                    if bootstrap_operational_wam
                    else None
                )
                wave_asset_admitted = bool(
                    bootstrap_operational_wam
                    and step_source_asset is not None
                    and step_wave_target_proof is not None
                    and int(step_wave_target_proof.get("requiredCount") or 0) > 0
                    and int(step_wave_target_proof.get("acceptedCount") or 0) > 0
                )
                if wave_asset_admitted:
                    wave_phase_proven_asset_keys.add(
                        supervised_identity_key
                    )
                if step_wave_target_proof is not None:
                    wave_asset_coverage = result["diagnostics"].setdefault(
                        "operationalWaveAssetCoverageByCollection", {}
                    ).setdefault(collection, {})
                    accumulate_wave_asset_coverage(
                        wave_asset_coverage,
                        step_wave_target_proof,
                        admitted=wave_asset_admitted,
                        observed_rejected_by_code=validated_wave_rejections,
                    )
                    rejected_by_code = run_info[
                        "waveObservedRejectionEventsByCode"
                    ]
                    for code, count in validated_wave_rejections.items():
                        rejected_by_code[code] = (
                            int(rejected_by_code.get(code) or 0)
                            + int(count)
                        )
                    if wave_asset_admitted:
                        run_info["assetsAdmitted"] += 1
                        if step_wave_target_proof.get("acceptedCount") != (
                            step_wave_target_proof.get("requiredCount")
                        ):
                            run_info["assetsPartiallyAdmitted"] += 1
                wave_step_complete = bool(
                    wave_asset_admitted
                    and step_wave_target_proof.get("acceptedCount")
                        == step_wave_target_proof.get("requiredCount")
                )
                step_complete = bool(
                    set(step_recognized) >= required_for_family
                    and len(touched) > 0
                    and (
                        wave_step_complete
                        if bootstrap_operational_wam
                        else collection not in MARINE_COLLECTIONS
                        or step_source_asset is not None
                            and step_part_outcome_proof is not None
                    )
                )
                asset_traversal_complete = bool(
                    wave_asset_admitted
                    if bootstrap_operational_wam
                    else step_complete
                )
                asset_processed_this_invocation = False
                if not interrupted:
                    if bootstrap_operational_wam:
                        if asset_traversal_complete:
                            previously_traversed.add(asset["valid"])
                        else:
                            previously_traversed.discard(asset["valid"])
                        run_info["traversedValidTimes"] = sorted(
                            previously_traversed,
                            key=epoch,
                        )
                        if step_complete:
                            run_info["assetsProcessed"] += 1
                            asset_processed_this_invocation = True
                            previously_processed.add(asset["valid"])
                        else:
                            previously_processed.discard(asset["valid"])
                    elif step_complete:
                        run_info["assetsProcessed"] += 1
                        asset_processed_this_invocation = True
                        previously_processed.add(asset["valid"])
                    else:
                        previously_processed.discard(asset["valid"])
                    run_info["processedValidTimes"] = sorted(
                        previously_processed,
                        key=epoch,
                    )
                    if asset_processed_this_invocation:
                        note_asset_processed_this_invocation(result)
                if not interrupted:
                    run_info["processedSteps"][asset["valid"]] = {
                        "recognizedParameters": step_recognized,
                        "requiredParameters": sorted(required_for_family),
                        "missingRequiredParameters": sorted(required_for_family - set(step_recognized)),
                        "zonesTouched": len(touched),
                        "complete": step_complete,
                        **({
                            "assetTraversalComplete": wave_asset_admitted,
                            "waveAdmissionPolicy": WAVE_ASSET_ADMISSION_POLICY,
                            "rawContentSha256": (
                                (step_wave_target_proof or {}).get(
                                    "rawContentSha256"
                                )
                            ),
                            "acceptedNativeZoneCount": int(
                                (step_wave_target_proof or {}).get(
                                    "acceptedCount"
                                ) or 0
                            ),
                        } if bootstrap_operational_wam else {}),
                        "parserVersion": PARSER_VERSION,
                        "processingSignature": processing_signature,
                        **({"sourceAsset": step_source_asset}
                           if collection in MARINE_COLLECTIONS
                           or bootstrap_operational_wam else {}),
                        **({"currentPartOutcomeProof": step_part_outcome_proof}
                           if collection in MARINE_COLLECTIONS else {}),
                        **({"regionalObservation": validated_current_stage["regionalObservation"]}
                           if "regionalObservation" in validated_current_stage else {}),
                        **({"waveTargetProof": step_wave_target_proof}
                           if bootstrap_operational_wam else {}),
                    }
                    if bootstrap_operational_wam:
                        run_info["assetsTraversalComplete"] = len(
                            previously_traversed
                        )
                        run_info["assetsProofComplete"] = sum(
                            step.get("complete") is True
                            for step in run_info["processedSteps"].values()
                        )
                    native_planning_changed = False
                    if (
                        collection in MARINE_COLLECTIONS
                        and step_complete
                        and step_source_asset is not None
                    ):
                        step_attestation = current_operational_attestation(
                            result,
                            coastal_part_targets,
                            locked_production_reference,
                            [step_source_asset],
                            [],
                        )
                        for pair_source in (
                            step_attestation.get("verifiedPairSources") or []
                        ):
                            selected_source = canonical_current_source_asset(
                                pair_source.get("source")
                            )
                            if selected_source is None:
                                continue
                            selected_source_key = json.dumps(
                                selected_source,
                                sort_keys=True,
                                separators=(",", ":"),
                                ensure_ascii=False,
                            )
                            pair_identity = (
                                str(pair_source.get("partId") or "").strip(),
                                str(pair_source.get("validTime") or ""),
                            )
                            actual_current_pair_source_keys.add(
                                (*pair_identity, selected_source_key)
                            )
                            if pair_identity not in covered_current_pair_keys:
                                native_planning_changed = True
                            covered_current_pair_keys.add(pair_identity)
                        priority_covered_pair_keys.update(covered_current_pair_keys)
                        if global_current_planning_pairs is not None:
                            planning_current_pairs = (
                                global_current_planning_pairs | priority_covered_pair_keys
                                | latest_regional_planning_pairs
                            )
                    if (
                        collection == REGIONAL_PROXY_REQUIRED_COLLECTION
                        and regional_planning_context is not None
                        and global_current_planning_pairs is not None
                        and (regional_input_changed or native_planning_changed)
                    ):
                        try:
                            if regional_input_changed:
                                latest_regional_planning_pairs = planning_regional_covered_pairs(
                                    dmi_ledger=regional_planning_context[0],
                                    dmi_attestation=regional_planning_context[1],
                                    targets=coastal_part_targets,
                                    regional_shadow=current_shadow,
                                    regional_policy=regional_proxy_policy,
                                    production_reference_at=canonical_time(
                                        locked_production_reference
                                    ),
                                )
                                run_info["regionalCoverageRebuildCount"] = int(
                                    run_info.get("regionalCoverageRebuildCount") or 0
                                ) + 1
                            priority_covered_pair_keys.update(
                                covered_current_pair_keys
                            )
                            planning_current_pairs = (
                                global_current_planning_pairs
                                | priority_covered_pair_keys
                                | latest_regional_planning_pairs
                            )
                            remaining_assets = list(assets[asset_number:])
                            regional_gap_pairs_by_time = (
                                regional_lf_asset_gap_pairs_by_time(
                                    remaining_assets,
                                    run,
                                    regional_target_part_ids,
                                    required_current_valid_times,
                                    planning_current_pairs,
                                    locked_production_reference,
                                )
                            )
                            remaining_assets = [
                                remaining_asset
                                for remaining_asset in remaining_assets
                                if canonical_time(
                                    remaining_asset.get("valid")
                                ) in required_current_valid_times
                                or regional_gap_pairs_by_time.get(
                                    str(canonical_time(
                                        remaining_asset.get("valid")
                                    ) or "")
                                )
                            ]
                            remaining_requirements = {
                                str(remaining_asset["valid"]):
                                    classify_dkss_primary_asset(
                                        collection=collection,
                                        model_run=run,
                                        asset=remaining_asset,
                                        target_ids=current_target_ids,
                                        covered_pair_keys=(
                                            priority_covered_pair_keys
                                        ),
                                        cached_zones=result.get("zones") or {},
                                        active_zone_ids=(
                                            active_production_zone_ids
                                        ),
                                        enabled=DKSS_PRIMARY_MODE,
                                        planning_covered_pair_keys=(
                                            planning_current_pairs
                                        ),
                                        required_valid_times=(
                                            required_current_valid_times
                                        ),
                                        regional_current_gap_count=len(
                                            regional_gap_pairs_by_time.get(
                                                str(canonical_time(
                                                    remaining_asset.get("valid")
                                                ) or ""),
                                                set(),
                                            )
                                        ),
                                    )
                                for remaining_asset in remaining_assets
                            }
                            acquisition_requirements.update(
                                remaining_requirements
                            )
                            verified_reusable_regional_times = (
                                next_verified_reusable_regional_time(
                                    remaining_assets,
                                    collection,
                                    run,
                                    regional_gap_pairs_by_time,
                                )
                            )
                            assets[asset_number:] = (
                                prioritize_marine_assets_for_current_gaps(
                                    remaining_assets,
                                    current_target_ids,
                                    planning_current_pairs,
                                    critical_by_time={
                                        valid_time: bool(row["critical"])
                                        for valid_time, row
                                        in remaining_requirements.items()
                                    },
                                    direct_valid_times=(
                                        required_current_valid_times
                                    ),
                                    regional_gap_pairs_by_time=(
                                        regional_gap_pairs_by_time
                                    ),
                                    verified_reusable_valid_times=(
                                        verified_reusable_regional_times
                                    ),
                                )
                            )
                            acquisition_plan_diagnostics[
                                "regionalPriorityReplanCount"
                            ] = int(acquisition_plan_diagnostics.get(
                                "regionalPriorityReplanCount"
                            ) or 0) + 1
                            acquisition_plan_diagnostics[
                                "regionalMissingPairCountAfterLastLfAsset"
                            ] = len(regional_lf_missing_pair_keys(
                                regional_target_part_ids,
                                required_current_valid_times,
                                planning_current_pairs,
                            ))
                        except (OSError, TypeError, ValueError, KeyError):
                            # Planning evidence is advisory. On any validation
                            # failure retain the existing conservative suffix;
                            # never infer coverage or disturb committed rows.
                            acquisition_plan_diagnostics[
                                "regionalPriorityReplanFailureCount"
                            ] = int(acquisition_plan_diagnostics.get(
                                "regionalPriorityReplanFailureCount"
                            ) or 0) + 1
                if bootstrap_operational_wam and not interrupted:
                    wave_pending_touched.update(touched)
                elif not bootstrap_operational_wam:
                    fresh_zone_ids.update(touched)
                if collection in MARINE_COLLECTIONS:
                    fresh_marine_zone_ids.update(touched)
                if interrupted:
                    if bounded_primary_refresh:
                        run_info["assetsBoundedRefreshFailed"] += 1
                        result["diagnostics"]["assetsBoundedDkssRefreshFailed"] = int(
                            result["diagnostics"].get(
                                "assetsBoundedDkssRefreshFailed"
                            ) or 0
                        ) + 1
                    checkpoint_status = "afbrudt asset kasseret"
                else:
                    wave_promoted = False
                    if bootstrap_operational_wam and wave_asset_admitted:
                        if wave_phase_deferred_quality_promotion:
                            checkpoint_controller.observe_asset_duration(
                                seconds=asset_processing_seconds,
                            )
                            checkpoint_status = (
                                "quality-kandidat akkumuleret"
                            )
                        else:
                            wave_promoted, checkpoint_status = (
                                try_promote_wave_candidate(
                                    asset_processing_seconds=(
                                        asset_processing_seconds
                                    ),
                                )
                            )
                    elif bootstrap_operational_wam:
                        checkpoint_controller.observe_asset_duration(
                            seconds=asset_processing_seconds,
                        )
                        checkpoint_status = "asset-kandidat afvist"
                    else:
                        checkpoint_written = (
                            checkpoint_controller.note_committed_asset(
                                seconds=asset_processing_seconds,
                            )
                        )
                        checkpoint_status = (
                            "checkpoint gemt"
                            if checkpoint_written
                            else "checkpoint samler "
                                f"{checkpoint_controller.committed_assets_since_write} assets"
                        )
                    if (
                        bootstrap_operational_wam
                        and wave_promoted
                    ):
                        wave_closure_after_commit = wave_active_evidence[
                            "closure"
                        ]
                        if should_stop_operational_wave_asset_loop(
                            collection,
                            wave_closure_after_commit,
                            launch_mode=(
                                wave_bootstrap_configuration is not None
                                or wave_phase_rank > 0
                            ),
                        ):
                            stop_for_native_wave_closure = True
                            deferred_asset_count = max(
                                0, len(assets) - asset_number
                            )
                            run_info[
                                "nativeClosureStoppedAssetLoop"
                            ] = True
                            run_info[
                                "assetsDeferredAfterNativeClosure"
                            ] = deferred_asset_count
                            result["runs"][collection] = copy.deepcopy(
                                run_info
                            )
                            result["diagnostics"].setdefault(
                                "operationalWaveClosureStopsByCollection", {}
                            )[collection] = {
                                "reasonCode": (
                                    "OPERATIONAL_WAVE_NATIVE_CLOSURE_COMPLETE"
                                ),
                                "requiredPairCount": int(
                                    wave_closure_after_commit.get(
                                        "requiredPairCount"
                                    ) or 0
                                ),
                                "remainingClosurePairCount": 0,
                                "assetsObservedAtClosure": run_info[
                                    "assetsObserved"
                                ],
                                "deferredSelectedAssetCount": (
                                    deferred_asset_count
                                ),
                            }
                            checkpoint_controller.mark_bulk_dirty()
                            checkpoint_controller.flush_if_due(force=True)
                            checkpoint_status = (
                                "native closure-checkpoint gemt"
                            )
                    if bounded_primary_refresh:
                        run_info["assetsBoundedRefreshCompleted"] += 1
                        result["diagnostics"]["assetsBoundedDkssRefreshCompleted"] = int(
                            result["diagnostics"].get(
                                "assetsBoundedDkssRefreshCompleted"
                            ) or 0
                        ) + 1
                wave_progress = (
                    f"observed={run_info['assetsObserved']}, "
                    f"proof-complete={run_info['assetsProofComplete']}, "
                    f"raw-reused={run_info['rawAssetsReused']}, "
                    if bootstrap_operational_wam
                    else f"steps={run_info['assetsProcessed']}, "
                )
                progress(
                    f"{collection}: forecast-step behandlet på "
                    f"{asset_processing_seconds:.1f}s; {checkpoint_status}; "
                    f"{wave_progress}"
                    f"felter={sorted(recognized)}, "
                    f"resterende={runtime_remaining():.0f}s"
                )
                if interrupted:
                    budget_stop = "bulk runtime budget reached inside GRIB processing"
                    budget_stop_code = "RUNTIME_BUDGET_REACHED"
                    break
                if stop_for_native_wave_closure:
                    progress(
                        f"{collection}: native operational closure complete; "
                        "remaining quality-overlap assets deferred"
                    )
                    break
            if bootstrap_operational_wam:
                if (
                    wave_phase_deferred_quality_promotion
                    and budget_stop_code is None
                    and should_stop_work()
                ):
                    budget_stop = (
                        "bulk runtime budget reached before terminal WAM "
                        "quality proof"
                    )
                    budget_stop_code = "RUNTIME_BUDGET_REACHED"
                final_phase_fully_traversed = (
                    operational_wave_phase_fully_traversed(
                        selected_asset_count=wave_phase_asset_counts.get(
                            wave_phase_rank, 0,
                        ),
                        proven_asset_count=len(
                            wave_phase_proven_asset_keys
                        ),
                        stop_code=budget_stop_code,
                        native_closure_stopped=(
                            stop_for_native_wave_closure
                        ),
                    )
                )
                finish_wave_phase(
                    fully_traversed=final_phase_fully_traversed,
                )
                record_wave_phase_summary(
                    fully_traversed=final_phase_fully_traversed,
                )
                result["diagnostics"].setdefault(
                    "operationalWaveRunPhasesByCollection", {}
                )[collection] = wave_phase_summaries
                result["diagnostics"].setdefault(
                    "operationalWavePromotionsByCollection", {}
                )[collection] = wave_collection_promotion_count
            result["diagnostics"]["parametersByCollection"][collection] = sorted(recognized)
            run_info["recognizedParameters"] = sorted(recognized)
            required = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
            selected_valid_time_values = [
                str(asset.get("valid") or "") for asset in assets
            ]
            selected_valid_times = {
                valid_time for valid_time in selected_valid_time_values
                if valid_time
            }
            wave_collection_outcome = {
                "activeComplete": False,
                "semanticProgress": False,
                "retryImmediately": False,
            }
            if bootstrap_operational_wam:
                (
                    final_wave_closure,
                    final_wave_missing_valid_times,
                ) = operational_wave_collection_closure(
                    result,
                    active_zones_config,
                    locked_production_reference,
                    collection,
                    exact_required_times=(
                        operational_wave_exact_required_times
                    ),
                )
                apply_operational_wave_closure_to_run_info(
                    run_info,
                    final_wave_closure,
                    final_wave_missing_valid_times,
                    operational_wave_exact_required_times,
                )
                wave_collection_outcome = (
                    operational_wave_collection_outcome(
                        final_wave_closure,
                        wave_collection_promotion_count,
                    )
                )
                active_wave_run_info = (
                    result.get("runs", {}).get(collection) or {}
                )
                result["diagnostics"].setdefault(
                    "operationalWaveProgressByCollection", {}
                )[collection] = {
                    "rawAssetsReused": run_info.get("rawAssetsReused", 0),
                    "attemptAssetsObserved": run_info.get(
                        "assetsObserved", 0,
                    ),
                    "activeTraversalCompleteAssets": active_wave_run_info.get(
                        "assetsTraversalComplete", 0,
                    ),
                    "attemptTraversalCompleteAssets": run_info.get(
                        "assetsTraversalComplete", 0,
                    ),
                    "activeProofCompleteAssets": active_wave_run_info.get(
                        "assetsProofComplete", 0,
                    ),
                    "attemptProofCompleteAssets": run_info.get(
                        "assetsProofComplete", 0,
                    ),
                    "proofCompleteAssetsReconstructed": run_info.get(
                        "assetsProofCompleteReconstructed", 0,
                    ),
                    "attemptPartiallyAdmittedAssets": run_info.get(
                        "assetsPartiallyAdmitted", 0,
                    ),
                    "attemptRejectedAfterTraversal": run_info.get(
                        "assetsRejectedAfterTraversal", 0,
                    ),
                    "assetCoverage": copy.deepcopy(
                        (
                            result["diagnostics"].get(
                                "operationalWaveAssetCoverageByCollection", {}
                            ) or {}
                        ).get(collection, {})
                    ),
                    "remainingClosureHourCount": run_info[
                        "remainingClosureHourCount"
                    ],
                    "remainingClosurePairCount": run_info[
                        "remainingClosurePairCount"
                    ],
                    "remainingClosureByCategory": dict(
                        run_info["remainingClosureByCategory"]
                    ),
                    "lineageConflictNativeTimeCount": run_info[
                        "lineageConflictNativeTimeCount"
                    ],
                    "observedRejectionEventsByCode": dict(
                        run_info.get(
                            "waveObservedRejectionEventsByCode", {}
                        )
                    ),
                    "nativeGateProofComplete": run_info[
                        "nativeGateProofComplete"
                    ],
                    "nativeClosureStoppedAssetLoop": run_info.get(
                        "nativeClosureStoppedAssetLoop", False,
                    ),
                    "assetsDeferredAfterNativeClosure": run_info.get(
                        "assetsDeferredAfterNativeClosure", 0,
                    ),
                    "promotionCount": wave_collection_promotion_count,
                }
            completed_or_locked = previously_processed | set(
                bootstrap_locked_hours.get(collection, set())
            )
            collection_assets_complete = collection_assets_complete_for_state(
                operational_wave=bootstrap_operational_wam,
                generic_assets_complete=bool(
                    selected_valid_time_values
                    and len(selected_valid_times)
                        == len(selected_valid_time_values)
                    and selected_valid_times <= completed_or_locked
                ),
                wave_outcome=wave_collection_outcome,
            )
            made_progress = (
                wave_collection_outcome["semanticProgress"]
                if bootstrap_operational_wam
                else (
                    run_info["assetsProcessed"] > 0
                    or int(result["diagnostics"].get("reusedAssets") or 0)
                        > collection_start_reused
                    or budget["bytes"] > collection_start_bytes
                )
            )
            collection_reference_time = (
                (
                    result.get("runs", {}).get(collection) or {}
                ).get("referenceTime")
                or previous_run.get("referenceTime")
                or run
                if bootstrap_operational_wam
                else run
            )
            deferred_only = (
                DKSS_PRIMARY_MODE
                and collection in MARINE_COLLECTIONS
                and dkss_collection_deferred_only(run_info, len(assets))
            )
            refresh_maintenance_no_progress = dkss_bounded_refresh_failed_only(
                run_info,
                collection_refresh_only=collection_refresh_only,
            )
            if deferred_only or refresh_maintenance_no_progress:
                state["lastCheckedAt"] = generated
                result["diagnostics"]["collectionsDeferredValidDkssRefresh"].append(collection)
                result["diagnostics"]["zeroProgressCollections"].append(collection)
                if refresh_maintenance_no_progress:
                    result["diagnostics"].setdefault(
                        "collectionsFailedBoundedDkssRefresh", []
                    ).append(collection)
                if previous_run:
                    result["runs"][collection] = previous_run
                else:
                    result["runs"].pop(collection, None)
            elif not made_progress and collection_assets_complete and recognized >= required and run_info["assetsSkippedPreviouslyProcessed"] == len(assets):
                state["lastCheckedAt"] = generated
                state["referenceTime"] = collection_reference_time
                state["lastError"] = None
                state["lastBudgetInterruptedAt"] = None
                result["diagnostics"]["collectionsUnchanged"].append(collection)
                result["diagnostics"]["zeroProgressCollections"].append(collection)
            elif (
                collection_assets_complete
                and recognized >= required
                and (
                    run_info["assetsProcessed"]
                    or (
                        bootstrap_operational_wam
                        and bool(run_info.get("nativeGateProofComplete"))
                    )
                )
            ):
                state["lastSuccessfulAt"] = generated
                state["referenceTime"] = collection_reference_time
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                state["lastError"] = None
                state["lastBudgetInterruptedAt"] = None
                result["diagnostics"]["collectionsSucceeded"].append(collection)
            elif (
                bootstrap_operational_wam
                and wave_collection_outcome["retryImmediately"]
                and not budget_stop
            ):
                state["lastCheckedAt"] = generated
                state["referenceTime"] = collection_reference_time
                state["lastError"] = (
                    "operational WAM stage produced no promotable native "
                    "pair improvement"
                )
                state["lastBudgetInterruptedAt"] = None
                state["nextEligibleAt"] = None
                result["diagnostics"]["zeroProgressCollections"].append(
                    collection
                )
                result["diagnostics"].setdefault(
                    "operationalWaveStagesDiscarded", []
                ).append({
                    "collection": collection,
                    "reasonCode": "NO_PROMOTABLE_PAIR_IMPROVEMENT",
                    "remainingClosurePairCount": int(
                        final_wave_closure.get("missingPairCount") or 0
                    ),
                    "retryImmediately": True,
                })
            elif recognized:
                state["lastPartialAt"] = generated
                state["referenceTime"] = collection_reference_time
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                result["diagnostics"]["collectionsPartial"].append(collection)
            elif budget_stop:
                state["lastBudgetInterruptedAt"] = generated
                state["referenceTime"] = collection_reference_time
                state["lastError"] = None
                state["nextEligibleAt"] = None
            else:
                raise RuntimeError("GRIB downloaded but no required RavRadar parameters were recognized")
            if (
                not collection_refresh_only
                and (
                    made_progress
                    or budget_stop
                    or len(result["diagnostics"]["errors"])
                        > collection_start_error_count
                )
            ):
                primary_critical_work_observed = True
            if (
                made_progress
                and not refresh_maintenance_no_progress
                and not collection_is_critical_wam
                and not collection_is_critical_current
            ):
                productive_collections += 1
            if budget_stop:
                state["lastBudgetInterruptedAt"] = generated
                if budget_stop_code in {
                    "CRITICAL_COLLECTION_RUNTIME_RESERVED",
                    "STRICT_CURRENT_LEAD_ATTEMPT_LIMIT",
                }:
                    result["diagnostics"].setdefault(
                        "schedulerYields", []
                    ).append({
                        "collection": collection,
                        "reasonCode": budget_stop_code,
                        **(
                            {
                                "reservedForCollections": list(
                                    pending_critical_wam
                                ) + list(pending_critical_current),
                                "reservedSeconds": round(
                                    reserve_for_pending_critical, 3,
                                ),
                            }
                            if budget_stop_code
                                == "CRITICAL_COLLECTION_RUNTIME_RESERVED"
                            else {
                                "attemptLimit":
                                    strict_current_lead_attempt_limit,
                                "attemptedAssets":
                                    strict_current_lead_attempts,
                            }
                        ),
                        "partialProgressPreserved": True,
                    })
                else:
                    result["diagnostics"]["errors"].append({
                        "collection": collection,
                        "message": budget_stop,
                        "failureCode": (
                            budget_stop_code
                            or "RUNTIME_BUDGET_REACHED"
                        ),
                        "partialProgressPreserved": True,
                    })
            if budget_stop:
                checkpoint_controller.flush_if_due(force=True)
        except Exception as exc:
            if not collection_refresh_only:
                primary_critical_work_observed = True
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
            checkpoint_controller.flush_if_due(force=True)

    checkpoint_controller.flush_if_due(force=True)

    replay_targets: list[dict[str, Any]] = []
    if not research_rotation_completed:
        replay_targets.extend(rotating_research_targets)
    # Always audit the complete locked regional target..+117 axis. Most runs
    # skip already-processed DMI assets, so a single freshly parsed asset is not
    # proof that the restored regional shadow contains all 118 bound samples.
    replay_targets.extend(regional_proxy_targets)

    if FINALIZE_ONLY:
        result["diagnostics"]["currentFieldShadowCachedReplay"] = {
            "attempted": False,
            "reason": "supervised-finalize-only",
            "assetsCompleted": 0,
            "samplesWritten": 0,
            "bootstrapDownloads": 0,
            "bootstrapDownloadedBytes": 0,
        }
    elif not replay_targets:
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
            locked_production_reference,
            supervisor_skipped_assets,
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
        retained_current_asset_proofs,
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
                wave_owner_by_part=wave_owner_by_cache_key(
                    registry.parts,
                    zone_coast_types,
                ),
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

    prune_stats = prune_raw_cache()
    cache_after = raw_cache_inventory()
    write_cache_audit(cache_before, cache_after, prune_stats["removedFiles"], prune_stats["removedBytes"])
    result["diagnostics"]["rawCache"] = {"before": cache_before, "after": cache_after, **prune_stats, "maxBytes": RAW_CACHE_MAX_BYTES}
    write_finalized_cache(result, result["refreshStatus"])
    promote_ready_candidate(
        result,
        strict_current_anchor_available=strict_current_anchor_available,
        producer_success_is_blocked=producer_success_is_blocked,
    )
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
    return producer_process_exit_code(
        producer_success_is_blocked=producer_success_is_blocked,
        producer_productive=producer_productive,
    )


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
