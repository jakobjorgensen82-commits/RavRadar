"""Pure selection and validation contract for private DMI WAM bootstrap history.

This module deliberately performs no network or filesystem I/O. It has two
separate profiles. Candidate G migration replays 40 pre-target hours, while a
genuine cold start replays 48 pre-target hours plus the real target row.

Raw item ids, hrefs, part ids, coordinates and wave values are never included in
public attestations or exception messages.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from bisect import bisect_left
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Mapping, Sequence
from urllib.parse import urlsplit, urlunsplit

from .dmi_native_provenance import (
    WAM_MAX_DISTANCE_KM,
    complete_native_source_for_hour,
    same_point,
    wave_distance_allowed,
)


CONTRACT_SCHEMA = "dmi-wave-history-bootstrap-v1"
MIGRATION_MODE = "candidate-g-migration"
COLD_START_MODE = "genuine-cold-start"
OPERATIONAL_MODE = "operational-maintenance"
EXPECTED_COASTAL_PART_COUNT = 673
MAX_INTERPOLATION_HOURS = 4
MAX_STAC_ITEMS = 1_000
MAX_SELECTED_ASSETS = 64
MAX_STAC_RUNS = 64
MAX_CACHE_ROWS_PER_PART = 256
MAX_TOTAL_NATIVE_ROWS = 200_000
WAM_COLLECTIONS = frozenset({"wam_dw", "wam_nsb"})

_UTC_HOUR = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:00:00Z")
_SHA256 = re.compile(r"[0-9a-f]{64}")
_SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,191}")
_GRIB_PATH = re.compile(r"\.(?:grib2?|grb2?|bin)$", re.IGNORECASE)
_RUN_KEYS = (
    "forecast:reference_datetime",
    "reference_datetime",
    "modelRun",
    "model_run",
)
_VALID_KEYS = (
    "datetime",
    "forecast:valid_time",
    "valid_time",
    "end_datetime",
    "start_datetime",
)

_SAFE_MESSAGES = {
    "INVALID_MODE": "The bootstrap mode is invalid.",
    "INVALID_TIME": "A required UTC-hour timestamp is invalid.",
    "INVALID_POLICY": "The bootstrap policy is invalid.",
    "ASSET_BUDGET": "The STAC asset budget was exceeded.",
    "RUN_BUDGET": "The STAC run budget was exceeded.",
    "INVALID_STAC": "The STAC document is invalid.",
    "INVALID_COLLECTION": "The STAC collection is invalid.",
    "MISSING_RUN": "Explicit model-run metadata is required.",
    "MISSING_VALID": "Explicit valid-time metadata is required.",
    "CONFLICTING_TIME": "STAC time metadata conflicts.",
    "FUTURE_RUN": "A model run was issued after an earlier valid hour.",
    "MISSING_ITEM_ID": "A strict STAC item id is required.",
    "CONFLICTING_ITEM_ID": "A STAC item id maps to conflicting metadata.",
    "MISSING_HREF": "Exactly one strict GRIB href is required.",
    "AMBIGUOUS_GRIB_ASSET": "Conflicting GRIB asset metadata is forbidden.",
    "INVALID_HREF": "A strict HTTPS GRIB href is required.",
    "NO_COHERENT_RUN": "No permitted WAM asset plan covers every required hour.",
    "REGISTRY_INVALID": "The immutable coastal-parts registry is invalid.",
    "REGISTRY_COUNT": "The immutable coastal-parts registry count is invalid.",
    "CACHE_INVALID": "The private DMI bulk cache is invalid.",
    "CACHE_MISSING": "The private DMI bulk cache is missing.",
    "CACHE_SIZE_INVALID": "The private DMI bulk cache size is invalid.",
    "CACHE_IO_INVALID": "The private DMI bulk cache could not be read exactly.",
    "CACHE_JSON_INVALID": "The private DMI bulk cache JSON is invalid.",
    "CACHE_PART_COUNT": "The private cache PART count does not match the registry.",
    "CACHE_REGISTRY_MISMATCH": "The private cache PART registry is not exact.",
    "VALIDATION_BUDGET": "The wave-history validation budget was exceeded.",
    "MISSING_WAVE_FIELD": "A required native wave field is missing.",
    "INVALID_WAVE_TUPLE": "A native wave tuple is physically invalid.",
    "MISSING_DIRECTION": "A required native wave direction is missing.",
    "MISSING_PROVENANCE": "Complete native wave provenance is missing.",
    "MISSING_CELL": "Complete same-cell wave provenance is missing.",
    "WAVE_DISTANCE_OUT_OF_BOUNDS": "Native WAM distance exceeds the collection policy.",
    "INVALID_PROVENANCE": "Native wave provenance is invalid.",
    "INCONSISTENT_ASSET_PROVENANCE": "Native WAM asset provenance is inconsistent.",
    "MISSING_HOUR": "A required wave-history hour has no safe native proof.",
    "INTERPOLATION_GAP": "A native interpolation gap exceeds the permitted bound.",
    "INTERPOLATED_COLD_START": "A genuine cold start requires exact native hours.",
    "MIXED_RUN_INTERPOLATION": "Interpolation across WAM runs is forbidden.",
    "MIXED_CELL_INTERPOLATION": "Interpolation across WAM cells is forbidden.",
    "MIXED_CELL_HISTORY": "A coastal part changes WAM cell in the bootstrap window.",
    "MIXED_COLLECTION_HISTORY": "A coastal part changes WAM collection in the bootstrap window.",
    "MULTI_RUN_INTERPOLATION": "A multi-run fallback must be exact at every required hour.",
    "COHERENT_RUN_REQUIRED": "The selected profile requires one coherent run per WAM collection.",
    "OPERATIONAL_HANDOFF_INVALID": "The operational WAM handoff is incomplete.",
}


class WaveBootstrapError(ValueError):
    """Fail-closed error carrying only a stable, non-sensitive reason code."""

    def __init__(self, code: str):
        safe_code = code if code in _SAFE_MESSAGES else "CACHE_INVALID"
        self.code = safe_code
        super().__init__(_SAFE_MESSAGES[safe_code])


@dataclass(frozen=True)
class WaveHistoryPolicy:
    mode: str
    history_hours: int
    include_target: bool
    require_single_run_per_collection: bool
    allow_exact_multi_run: bool
    directional_half_life_hours: int = 4
    maximum_interpolation_hours: int = MAX_INTERPOLATION_HOURS
    maximum_stac_items: int = MAX_STAC_ITEMS
    maximum_selected_assets: int = MAX_SELECTED_ASSETS
    maximum_stac_runs: int = MAX_STAC_RUNS

    def __post_init__(self) -> None:
        if (
            self.mode not in {MIGRATION_MODE, COLD_START_MODE, OPERATIONAL_MODE}
            or isinstance(self.history_hours, bool)
            or not isinstance(self.history_hours, int)
            or self.history_hours < 1
            or self.history_hours > 168
            or not isinstance(self.include_target, bool)
            or not isinstance(self.require_single_run_per_collection, bool)
            or not isinstance(self.allow_exact_multi_run, bool)
            or not isinstance(self.directional_half_life_hours, int)
            or self.directional_half_life_hours < 1
            or not isinstance(self.maximum_interpolation_hours, int)
            or self.maximum_interpolation_hours < 0
            or self.maximum_interpolation_hours > 4
            or not isinstance(self.maximum_stac_items, int)
            or self.maximum_stac_items < 1
            or not isinstance(self.maximum_selected_assets, int)
            or self.maximum_selected_assets < 1
            or not isinstance(self.maximum_stac_runs, int)
            or self.maximum_stac_runs < 1
        ):
            raise WaveBootstrapError("INVALID_POLICY")
        if self.require_single_run_per_collection and self.allow_exact_multi_run:
            raise WaveBootstrapError("INVALID_POLICY")
        if self.mode == COLD_START_MODE and self.maximum_interpolation_hours != 0:
            raise WaveBootstrapError("INVALID_POLICY")

    @property
    def required_hour_count(self) -> int:
        return self.history_hours + int(self.include_target)

    @property
    def omitted_tail_bound(self) -> float:
        return 2 ** (-self.history_hours / self.directional_half_life_hours)

    @property
    def conservative_max_raw_ravscore_error(self) -> float:
        return 0.5 * 100 * 0.15 * 1.6 * self.omitted_tail_bound


MIGRATION_POLICY = WaveHistoryPolicy(
    mode=MIGRATION_MODE,
    history_hours=40,
    include_target=False,
    require_single_run_per_collection=True,
    allow_exact_multi_run=False,
)

COLD_START_POLICY = WaveHistoryPolicy(
    mode=COLD_START_MODE,
    history_hours=48,
    include_target=True,
    require_single_run_per_collection=False,
    allow_exact_multi_run=True,
    maximum_interpolation_hours=0,
)


def policy_for_mode(mode: str) -> WaveHistoryPolicy:
    if mode == MIGRATION_MODE:
        return MIGRATION_POLICY
    if mode == COLD_START_MODE:
        return COLD_START_POLICY
    raise WaveBootstrapError("INVALID_MODE")


def parse_utc_hour(value: Any) -> datetime:
    if not isinstance(value, str) or _UTC_HOUR.fullmatch(value) is None:
        raise WaveBootstrapError("INVALID_TIME")
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        raise WaveBootstrapError("INVALID_TIME") from None
    return parsed.replace(tzinfo=timezone.utc)


def format_utc_hour(value: datetime) -> str:
    if value.tzinfo is None:
        raise WaveBootstrapError("INVALID_TIME")
    normalized = value.astimezone(timezone.utc)
    if normalized.minute or normalized.second or normalized.microsecond:
        raise WaveBootstrapError("INVALID_TIME")
    return normalized.strftime("%Y-%m-%dT%H:00:00Z")


def required_utc_hours(
    target_hour: str,
    *,
    history_hours: int,
    include_target: bool,
) -> tuple[str, ...]:
    if (
        isinstance(history_hours, bool)
        or not isinstance(history_hours, int)
        or history_hours < 1
        or history_hours > 168
        or not isinstance(include_target, bool)
    ):
        raise WaveBootstrapError("INVALID_POLICY")
    target = parse_utc_hour(target_hour)
    count = history_hours + int(include_target)
    return tuple(
        format_utc_hour(target - timedelta(hours=history_hours - index))
        for index in range(count)
    )


def policy_utc_hours(target_hour: str, policy: WaveHistoryPolicy) -> tuple[str, ...]:
    return required_utc_hours(
        target_hour,
        history_hours=policy.history_hours,
        include_target=policy.include_target,
    )


def _canonical_optional_timestamp(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or not value or len(value) > 64:
        raise WaveBootstrapError("INVALID_STAC")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise WaveBootstrapError("INVALID_STAC") from None
    if parsed.tzinfo is None:
        raise WaveBootstrapError("INVALID_STAC")
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _strict_hour_metadata(
    properties: Mapping[str, Any],
    keys: Sequence[str],
    missing_code: str,
) -> str:
    present = [properties[key] for key in keys if key in properties]
    if not present:
        raise WaveBootstrapError(missing_code)
    normalized = []
    for value in present:
        try:
            normalized.append(format_utc_hour(parse_utc_hour(value)))
        except WaveBootstrapError:
            raise WaveBootstrapError("CONFLICTING_TIME") from None
    if len(set(normalized)) != 1:
        raise WaveBootstrapError("CONFLICTING_TIME")
    return normalized[0]


def _strict_item_id(value: Any) -> str:
    if not isinstance(value, str) or value != value.strip() or _SAFE_ID.fullmatch(value) is None:
        raise WaveBootstrapError("MISSING_ITEM_ID")
    return value


def _strict_href(value: Any) -> str:
    if not isinstance(value, str) or value != value.strip() or len(value) > 4096:
        raise WaveBootstrapError("INVALID_HREF")
    if any(ord(char) < 32 or ord(char) == 127 for char in value):
        raise WaveBootstrapError("INVALID_HREF")
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
        or not parsed.path
    ):
        raise WaveBootstrapError("INVALID_HREF")
    return value


def _is_grib_asset(asset_key: str, asset: Mapping[str, Any], href: str) -> bool:
    media = str(asset.get("type") or "").lower()
    roles = asset.get("roles") or []
    if not isinstance(roles, list) or any(not isinstance(role, str) for role in roles):
        raise WaveBootstrapError("INVALID_STAC")
    haystack = " ".join(
        [asset_key, str(asset.get("title") or ""), " ".join(roles)]
    ).lower()
    return (
        "grib" in media
        or "grib" in haystack
        or _GRIB_PATH.search(urlsplit(href).path) is not None
    )


def _strict_grib_asset(item: Mapping[str, Any]) -> tuple[str, int | None]:
    containers: list[tuple[str, Mapping[str, Any]]] = []
    for container_name in ("assets", "asset"):
        if container_name not in item:
            continue
        container = item.get(container_name)
        if not isinstance(container, dict) or not container:
            raise WaveBootstrapError("INVALID_STAC")
        if "href" in container:
            containers.append((container_name, container))
            continue
        for key, raw_asset in container.items():
            if not isinstance(key, str) or not isinstance(raw_asset, dict):
                raise WaveBootstrapError("INVALID_STAC")
            containers.append((key, raw_asset))
    if not containers:
        raise WaveBootstrapError("MISSING_HREF")
    candidates: set[tuple[str, int | None]] = set()
    for key, raw_asset in containers:
        raw_href = raw_asset.get("href")
        if raw_href is None:
            continue
        href = _strict_href(raw_href)
        if not _is_grib_asset(key, raw_asset, href):
            continue
        raw_size = raw_asset.get("file:size", raw_asset.get("size"))
        size: int | None = None
        if raw_size is not None:
            if (
                isinstance(raw_size, bool)
                or not isinstance(raw_size, int)
                or raw_size <= 0
                or raw_size > 4 * 1024 * 1024 * 1024
            ):
                raise WaveBootstrapError("INVALID_STAC")
            size = raw_size
        candidates.add((href, size))
    if not candidates:
        raise WaveBootstrapError("MISSING_HREF")
    if len(candidates) != 1:
        raise WaveBootstrapError("AMBIGUOUS_GRIB_ASSET")
    return next(iter(candidates))


@dataclass(frozen=True, order=True)
class StacWaveAsset:
    valid_time: str
    model_run: str
    item_id: str
    href: str
    collection: str
    size_bytes: int | None = None
    item_created_at: str | None = None
    item_updated_at: str | None = None

    @property
    def asset_identity_sha256(self) -> str:
        parsed = urlsplit(self.href)
        canonical_href = urlunsplit(
            (parsed.scheme, parsed.netloc, parsed.path, "", ""),
        )
        return hashlib.sha256(canonical_href.encode("utf-8")).hexdigest()

    @property
    def selection_entry_sha256(self) -> str:
        canonical = json.dumps(
            {
                "assetIdentitySha256": self.asset_identity_sha256,
                "collection": self.collection,
                "itemId": self.item_id,
                "modelRun": self.model_run,
                "validTime": self.valid_time,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def download_reference(self) -> dict[str, Any]:
        return {
            "collection": self.collection,
            "modelRun": self.model_run,
            "valid": self.valid_time,
            "id": self.item_id,
            "href": self.href,
            "size": self.size_bytes,
            "itemCreatedAt": self.item_created_at,
            "itemUpdatedAt": self.item_updated_at,
        }


def _parse_stac_asset(item: Any, collection: str) -> StacWaveAsset:
    if not isinstance(item, dict) or item.get("type") not in (None, "Feature"):
        raise WaveBootstrapError("INVALID_STAC")
    if item.get("collection") != collection:
        raise WaveBootstrapError("INVALID_COLLECTION")
    properties = item.get("properties")
    if not isinstance(properties, dict):
        raise WaveBootstrapError("INVALID_STAC")
    model_run = _strict_hour_metadata(properties, _RUN_KEYS, "MISSING_RUN")
    valid_time = _strict_hour_metadata(properties, _VALID_KEYS, "MISSING_VALID")
    if parse_utc_hour(model_run) > parse_utc_hour(valid_time):
        raise WaveBootstrapError("FUTURE_RUN")
    item_id = _strict_item_id(item.get("id"))
    href, size = _strict_grib_asset(item)
    return StacWaveAsset(
        valid_time=valid_time,
        model_run=model_run,
        item_id=item_id,
        href=href,
        collection=collection,
        size_bytes=size,
        item_created_at=_canonical_optional_timestamp(properties.get("created")),
        item_updated_at=_canonical_optional_timestamp(properties.get("updated")),
    )


def parse_stac_wave_assets(
    document: Any,
    *,
    collection: str,
    maximum_items: int = MAX_STAC_ITEMS,
) -> tuple[StacWaveAsset, ...]:
    if collection not in WAM_COLLECTIONS:
        raise WaveBootstrapError("INVALID_COLLECTION")
    if isinstance(document, dict):
        if document.get("type") not in (None, "FeatureCollection"):
            raise WaveBootstrapError("INVALID_STAC")
        items = document.get("features")
    else:
        items = document
    if not isinstance(items, list):
        raise WaveBootstrapError("INVALID_STAC")
    if (
        isinstance(maximum_items, bool)
        or not isinstance(maximum_items, int)
        or maximum_items < 1
        or len(items) > maximum_items
    ):
        raise WaveBootstrapError("ASSET_BUDGET")

    by_id: dict[str, StacWaveAsset] = {}
    for item in items:
        parsed = _parse_stac_asset(item, collection)
        previous = by_id.get(parsed.item_id)
        if previous is not None and previous != parsed:
            raise WaveBootstrapError("CONFLICTING_ITEM_ID")
        by_id[parsed.item_id] = parsed
    return tuple(sorted(by_id.values()))


def _asset_by_valid(rows: Iterable[StacWaveAsset]) -> dict[str, StacWaveAsset]:
    result: dict[str, StacWaveAsset] = {}
    for row in sorted(rows, key=lambda asset: (asset.valid_time, asset.item_id, asset.href)):
        result.setdefault(row.valid_time, row)
    return result


def _coherent_run_assets(
    rows: Sequence[StacWaveAsset],
    required: Sequence[str],
    policy: WaveHistoryPolicy,
) -> tuple[StacWaveAsset, ...] | None:
    if not rows or not required:
        return None
    run = rows[0].model_run
    if any(row.model_run != run for row in rows):
        return None
    required_dt = [parse_utc_hour(value) for value in required]
    if parse_utc_hour(run) > required_dt[0]:
        return None
    by_valid = _asset_by_valid(rows)
    ordered = sorted((parse_utc_hour(value), asset) for value, asset in by_valid.items())
    times = [value for value, _asset in ordered]
    selected: set[StacWaveAsset] = set()
    for wanted in required_dt:
        exact = by_valid.get(format_utc_hour(wanted))
        if exact is not None:
            selected.add(exact)
            continue
        index = bisect_left(times, wanted)
        if index == 0 or index >= len(ordered):
            return None
        before_time, before = ordered[index - 1]
        after_time, after = ordered[index]
        gap_hours = (after_time - before_time).total_seconds() / 3600
        if (
            gap_hours <= 0
            or gap_hours > policy.maximum_interpolation_hours
            or parse_utc_hour(run) > wanted
        ):
            return None
        selected.update((before, after))
    return tuple(sorted(selected))


@dataclass(frozen=True)
class StacSelectionPlan:
    policy: WaveHistoryPolicy
    collection: str
    target_hour: str
    selection_mode: str
    required_hours: tuple[str, ...]
    assets: tuple[StacWaveAsset, ...]

    def sanitized_attestation(self) -> dict[str, Any]:
        run_count = len({asset.model_run for asset in self.assets})
        asset_identities = sorted(
            asset.asset_identity_sha256 for asset in self.assets
        )
        selection_entries = sorted(
            asset.selection_entry_sha256 for asset in self.assets
        )
        canonical = json.dumps(
            {
                "collection": self.collection,
                "selectionEntries": selection_entries,
                "mode": self.policy.mode,
                "requiredHours": list(self.required_hours),
                "selectionMode": self.selection_mode,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        return {
            "schemaVersion": CONTRACT_SCHEMA,
            "mode": self.policy.mode,
            "selectionMode": self.selection_mode,
            "historyHourCount": self.policy.history_hours,
            "includeTarget": self.policy.include_target,
            "requiredHourCount": len(self.required_hours),
            "selectedAssetCount": len(self.assets),
            "runCount": run_count,
            "omittedTailBound": self.policy.omitted_tail_bound,
            "conservativeMaxRawRavScoreError":
                self.policy.conservative_max_raw_ravscore_error,
            "assetIdentitySha256": asset_identities,
            "selectionEntrySha256": selection_entries,
            "selectionSha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        }


def select_stac_wave_history_assets(
    document: Any,
    *,
    collection: str,
    target_hour: str,
    policy: WaveHistoryPolicy,
) -> StacSelectionPlan:
    required = policy_utc_hours(target_hour, policy)
    parsed = parse_stac_wave_assets(
        document,
        collection=collection,
        maximum_items=policy.maximum_stac_items,
    )
    runs: dict[str, list[StacWaveAsset]] = {}
    for asset in parsed:
        runs.setdefault(asset.model_run, []).append(asset)
    if len(runs) > policy.maximum_stac_runs:
        raise WaveBootstrapError("RUN_BUDGET")

    coherent_candidates: list[tuple[str, tuple[StacWaveAsset, ...]]] = []
    for model_run, rows in runs.items():
        coverage = _coherent_run_assets(rows, required, policy)
        if coverage is not None:
            coherent_candidates.append((model_run, coverage))
    if coherent_candidates:
        _run, selected = max(
            coherent_candidates,
            key=lambda entry: (parse_utc_hour(entry[0]), tuple(entry[1])),
        )
        mode = "single-coherent-run"
    else:
        if policy.require_single_run_per_collection or not policy.allow_exact_multi_run:
            raise WaveBootstrapError("NO_COHERENT_RUN")
        by_valid: dict[str, list[StacWaveAsset]] = {}
        for asset in parsed:
            by_valid.setdefault(asset.valid_time, []).append(asset)
        chosen: list[StacWaveAsset] = []
        for valid_time in required:
            candidates = [
                asset
                for asset in by_valid.get(valid_time, [])
                if parse_utc_hour(asset.model_run) <= parse_utc_hour(valid_time)
            ]
            if not candidates:
                raise WaveBootstrapError("NO_COHERENT_RUN")
            chosen.append(max(
                candidates,
                key=lambda asset: (
                    parse_utc_hour(asset.model_run),
                    asset.item_id,
                    asset.href,
                ),
            ))
        selected = tuple(sorted(set(chosen)))
        mode = "exact-hour-multi-run"

    if len(selected) > policy.maximum_selected_assets:
        raise WaveBootstrapError("ASSET_BUDGET")
    return StacSelectionPlan(
        policy=policy,
        collection=collection,
        target_hour=format_utc_hour(parse_utc_hour(target_hour)),
        selection_mode=mode,
        required_hours=required,
        assets=selected,
    )


def _finite_number(value: Any) -> float | None:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(float(value))
    ):
        return None
    return float(value)


def _finite_point(value: Any) -> tuple[float, float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    longitude = _finite_number(value[0])
    latitude = _finite_number(value[1])
    if (
        longitude is None
        or latitude is None
        or longitude < -180
        or longitude > 180
        or latitude < -90
        or latitude > 90
    ):
        return None
    return longitude, latitude


@dataclass(frozen=True, order=True)
class RegistryPart:
    part_id: str
    parent_zone_id: str
    water_point: tuple[float, float]

    @property
    def cache_key(self) -> str:
        return f"PART::{self.part_id}"

    @property
    def provenance_entity(self) -> dict[str, Any]:
        return {
            "parentZoneId": self.parent_zone_id,
            "entityType": "coastal-part",
            "samplingContext": "coastal-part-water-point",
            "samplingPoint": list(self.water_point),
        }


@dataclass(frozen=True)
class CoastalPartRegistry:
    parts: tuple[RegistryPart, ...]
    canonical_sha256: str

    @property
    def part_count(self) -> int:
        return len(self.parts)


def load_coastal_part_registry(
    document: Any,
    *,
    expected_part_count: int = EXPECTED_COASTAL_PART_COUNT,
) -> CoastalPartRegistry:
    if (
        isinstance(expected_part_count, bool)
        or not isinstance(expected_part_count, int)
        or expected_part_count < 1
    ):
        raise WaveBootstrapError("REGISTRY_COUNT")
    if (
        not isinstance(document, dict)
        or document.get("schemaVersion") != 2
        or document.get("enabled") is not True
        or not isinstance(document.get("zones"), dict)
    ):
        raise WaveBootstrapError("REGISTRY_INVALID")
    zones = document["zones"]
    if (
        document.get("partCount") != expected_part_count
        or document.get("sourcePartCount") != expected_part_count
        or document.get("zoneCount") != len(zones)
    ):
        raise WaveBootstrapError("REGISTRY_COUNT")

    parts: list[RegistryPart] = []
    seen: set[str] = set()
    for parent_zone_id, rows in zones.items():
        if (
            not isinstance(parent_zone_id, str)
            or _SAFE_ID.fullmatch(parent_zone_id) is None
            or not isinstance(rows, list)
        ):
            raise WaveBootstrapError("REGISTRY_INVALID")
        for row in rows:
            if not isinstance(row, dict):
                raise WaveBootstrapError("REGISTRY_INVALID")
            part_id = row.get("partId")
            source_zone_id = row.get("sourceZoneId")
            water_point = _finite_point(row.get("waterPoint"))
            if (
                not isinstance(part_id, str)
                or _SAFE_ID.fullmatch(part_id) is None
                or part_id in seen
                or source_zone_id != parent_zone_id
                or water_point is None
            ):
                raise WaveBootstrapError("REGISTRY_INVALID")
            seen.add(part_id)
            parts.append(RegistryPart(part_id, parent_zone_id, water_point))
    if len(parts) != expected_part_count:
        raise WaveBootstrapError("REGISTRY_COUNT")
    try:
        canonical = json.dumps(
            document,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError):
        raise WaveBootstrapError("REGISTRY_INVALID") from None
    return CoastalPartRegistry(
        parts=tuple(sorted(parts)),
        canonical_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    )


@dataclass(frozen=True)
class ValidationBudget:
    maximum_rows_per_part: int = MAX_CACHE_ROWS_PER_PART
    maximum_total_rows: int = MAX_TOTAL_NATIVE_ROWS

    def __post_init__(self) -> None:
        if (
            isinstance(self.maximum_rows_per_part, bool)
            or not isinstance(self.maximum_rows_per_part, int)
            or self.maximum_rows_per_part < 1
            or isinstance(self.maximum_total_rows, bool)
            or not isinstance(self.maximum_total_rows, int)
            or self.maximum_total_rows < 1
        ):
            raise WaveBootstrapError("VALIDATION_BUDGET")


@dataclass(frozen=True)
class _NativeWaveRow:
    valid_time: str
    valid_datetime: datetime
    wave_height_m: float
    wave_period_s: float
    wave_direction_deg: float | None
    collection: str
    model_run: str
    grid_definition_sha256: str
    grid_point: tuple[float, float]
    distance_km: float
    source: Mapping[str, Any]


@dataclass(frozen=True)
class _WaveCacheEntity:
    cache_key: str
    provenance_entity: Mapping[str, Any]


def _validate_wave_values(
    height: Any,
    period: Any,
    direction: Any,
    *,
    allow_directionless_exact_calm: bool = False,
) -> tuple[float, float, float | None]:
    wave_height = _finite_number(height)
    wave_period = _finite_number(period)
    if wave_height is None or wave_period is None:
        raise WaveBootstrapError("MISSING_WAVE_FIELD")
    if (
        wave_height < 0
        or wave_period < 0
        or (wave_height > 0 and wave_period <= 0)
    ):
        raise WaveBootstrapError("INVALID_WAVE_TUPLE")
    if direction is None:
        if allow_directionless_exact_calm and wave_height == 0:
            return wave_height, wave_period, None
        raise WaveBootstrapError("MISSING_DIRECTION")
    wave_direction = _finite_number(direction)
    if wave_direction is None:
        raise WaveBootstrapError("MISSING_DIRECTION")
    if wave_direction < 0 or wave_direction >= 360:
        raise WaveBootstrapError("INVALID_WAVE_TUPLE")
    return wave_height, wave_period, wave_direction


def _validate_native_wave_row(
    *,
    valid_time: str,
    hour: Any,
    part: RegistryPart,
) -> _NativeWaveRow:
    valid_datetime = parse_utc_hour(valid_time)
    if not isinstance(hour, dict) or hour.get("time") != valid_time:
        raise WaveBootstrapError("CACHE_INVALID")
    for field in ("significant-wave-height", "dominant-wave-period"):
        if field not in hour:
            raise WaveBootstrapError("MISSING_WAVE_FIELD")
    height, period, direction = _validate_wave_values(
        hour["significant-wave-height"],
        hour["dominant-wave-period"],
        hour.get("mean-wave-dir"),
        allow_directionless_exact_calm=True,
    )
    sources = hour.get("sources")
    if not isinstance(sources, dict) or not isinstance(sources.get("wave"), dict):
        raise WaveBootstrapError("MISSING_PROVENANCE")
    source = sources["wave"]
    grid_point = _finite_point(source.get("gridPoint"))
    grid_definition = source.get("gridDefinitionSha256")
    if grid_point is None or not isinstance(grid_definition, str) or _SHA256.fullmatch(grid_definition) is None:
        raise WaveBootstrapError("MISSING_CELL")
    collection = source.get("collection")
    if collection not in WAM_COLLECTIONS:
        raise WaveBootstrapError("INVALID_PROVENANCE")
    distance = source.get("distanceKm")
    if not wave_distance_allowed(collection, distance):
        raise WaveBootstrapError("WAVE_DISTANCE_OUT_OF_BOUNDS")
    try:
        model_run = format_utc_hour(parse_utc_hour(source.get("modelRun")))
    except WaveBootstrapError:
        raise WaveBootstrapError("INVALID_PROVENANCE") from None
    if parse_utc_hour(model_run) > valid_datetime:
        raise WaveBootstrapError("FUTURE_RUN")
    expected_optional_fields = [] if direction is None else ["mean-wave-dir"]
    if source.get("optionalFieldSet") != expected_optional_fields:
        raise WaveBootstrapError("INVALID_PROVENANCE")
    if not complete_native_source_for_hour(
        source,
        "wave",
        part.cache_key,
        part.provenance_entity,
        valid_time,
    ):
        raise WaveBootstrapError("INVALID_PROVENANCE")
    return _NativeWaveRow(
        valid_time=valid_time,
        valid_datetime=valid_datetime,
        wave_height_m=height,
        wave_period_s=period,
        wave_direction_deg=direction,
        collection=str(collection),
        model_run=model_run,
        grid_definition_sha256=grid_definition,
        grid_point=grid_point,
        distance_km=float(distance),
        source=source,
    )


def _wave_bearing_hour(hour: Any) -> bool:
    if not isinstance(hour, dict):
        return False
    sources = hour.get("sources")
    wave_source = sources.get("wave") if isinstance(sources, dict) else None
    return bool(
        {"significant-wave-height", "dominant-wave-period", "mean-wave-dir"}
        & set(hour)
        or isinstance(wave_source, dict)
    )


def _safe_interpolated_tuple(
    before: _NativeWaveRow,
    after: _NativeWaveRow,
    wanted: datetime,
) -> None:
    span = (after.valid_datetime - before.valid_datetime).total_seconds()
    ratio = (wanted - before.valid_datetime).total_seconds() / span
    height = before.wave_height_m + ratio * (after.wave_height_m - before.wave_height_m)
    period = before.wave_period_s + ratio * (after.wave_period_s - before.wave_period_s)
    if before.wave_direction_deg is None or after.wave_direction_deg is None:
        if before.wave_direction_deg is None and after.wave_direction_deg is None:
            _validate_wave_values(
                height,
                period,
                None,
                allow_directionless_exact_calm=True,
            )
            return
        raise WaveBootstrapError("MISSING_DIRECTION")
    delta = (after.wave_direction_deg - before.wave_direction_deg + 540) % 360 - 180
    if math.isclose(abs(delta), 180.0, rel_tol=0, abs_tol=1e-9):
        raise WaveBootstrapError("INVALID_WAVE_TUPLE")
    direction = (before.wave_direction_deg + ratio * delta) % 360
    _validate_wave_values(height, period, direction)


def _resolve_required_hour(
    rows: Sequence[_NativeWaveRow],
    wanted: datetime,
    policy: WaveHistoryPolicy,
) -> tuple[str, tuple[_NativeWaveRow, ...]]:
    times = [row.valid_datetime for row in rows]
    index = bisect_left(times, wanted)
    if index < len(rows) and rows[index].valid_datetime == wanted:
        return "exact", (rows[index],)
    if index == 0 or index >= len(rows):
        raise WaveBootstrapError("MISSING_HOUR")
    before, after = rows[index - 1], rows[index]
    gap_hours = (after.valid_datetime - before.valid_datetime).total_seconds() / 3600
    if gap_hours <= 0 or gap_hours > policy.maximum_interpolation_hours:
        raise WaveBootstrapError("INTERPOLATION_GAP")
    if before.model_run != after.model_run:
        raise WaveBootstrapError("MIXED_RUN_INTERPOLATION")
    if (
        before.collection != after.collection
        or before.grid_definition_sha256 != after.grid_definition_sha256
        or not same_point(before.grid_point, after.grid_point)
    ):
        raise WaveBootstrapError("MIXED_CELL_INTERPOLATION")
    if parse_utc_hour(before.model_run) > wanted:
        raise WaveBootstrapError("FUTURE_RUN")
    _safe_interpolated_tuple(before, after, wanted)
    return "interpolated", (before, after)


def _resolve_operational_required_hour(
    rows: Sequence[_NativeWaveRow],
    wanted: datetime,
    policy: WaveHistoryPolicy,
) -> tuple[str, tuple[_NativeWaveRow, ...]]:
    """Resolve one operational hour without interpolating across native series.

    An exact native row keeps the existing precedence.  When the two closest
    rows belong to different WAM runs/cells, search the already validated rows
    for the narrowest safe same-series bracket.  This mirrors the producer's
    residual calculation and never widens the four-hour interpolation bound.
    """
    try:
        return _resolve_required_hour(rows, wanted, policy)
    except WaveBootstrapError as direct_error:
        grouped: dict[
            tuple[str, str, str, tuple[float, float]], list[_NativeWaveRow]
        ] = {}
        for row in rows:
            grouped.setdefault((
                row.collection,
                row.model_run,
                row.grid_definition_sha256,
                row.grid_point,
            ), []).append(row)

        candidates: list[tuple[tuple[Any, ...], tuple[_NativeWaveRow, ...]]] = []
        for group_rows in grouped.values():
            group_rows.sort(key=lambda row: row.valid_datetime)
            try:
                resolution, used = _resolve_required_hour(
                    group_rows,
                    wanted,
                    policy,
                )
            except WaveBootstrapError:
                continue
            if resolution != "interpolated":
                continue
            before, after = used
            candidates.append((
                (
                    (after.valid_datetime - before.valid_datetime).total_seconds(),
                    -parse_utc_hour(before.model_run).timestamp(),
                    -before.valid_datetime.timestamp(),
                    after.valid_datetime.timestamp(),
                    before.collection,
                    before.grid_definition_sha256,
                    before.grid_point,
                ),
                used,
            ))

        if not candidates:
            raise direct_error
        _, used = min(candidates, key=lambda candidate: candidate[0])
        return "interpolated", used


def _native_wave_asset_evidence(
    row: _NativeWaveRow,
) -> tuple[tuple[str, str], tuple[str, str, str, str]]:
    return (
        (row.collection, row.valid_time),
        (
            row.model_run,
            str(row.source.get("itemId") or ""),
            str(row.source.get("assetIdentitySha256") or ""),
            row.grid_definition_sha256,
        ),
    )


def _record_native_wave_asset_lineage(
    recorded: dict[tuple[str, str], tuple[str, str, str, str]],
    key: tuple[str, str],
    lineage: tuple[str, str, str, str],
) -> bool:
    previous = recorded.get(key)
    if previous is not None:
        return previous == lineage
    recorded[key] = lineage
    return True


def conflicting_native_wave_asset_keys(
    evidence_by_entity: Iterable[
        Mapping[
            str,
            Sequence[
                tuple[
                    tuple[str, str],
                    tuple[str, str, str, str],
                ]
            ],
        ]
    ],
) -> frozenset[tuple[str, str]]:
    """Return native collection/time keys with cross-entity lineage conflicts."""
    recorded: dict[tuple[str, str], tuple[str, str, str, str]] = {}
    conflicts: set[tuple[str, str]] = set()
    for evidence in evidence_by_entity:
        for used in evidence.values():
            for key, lineage in used:
                if not _record_native_wave_asset_lineage(
                    recorded, key, lineage
                ):
                    conflicts.add(key)
    return frozenset(conflicts)


def resolved_native_wave_hour_evidence(
    hourly: Any,
    *,
    entity_id: str,
    provenance_entity: Mapping[str, Any],
    collection: str,
    required_hours: Sequence[str],
    exact_required_hours: Iterable[str] = (),
    maximum_interpolation_hours: int = MAX_INTERPOLATION_HOURS,
    require_single_group: bool = False,
) -> dict[
    str,
    tuple[
        tuple[tuple[str, str], tuple[str, str, str, str]],
        ...,
    ],
]:
    """Resolve hours and expose their exact native asset-lineage evidence.

    Invalid native rows are ignored here so a scheduler can report a residual;
    the strict history/handoff validators continue to reject the same rows.
    A returned hour is exact or safely bracketed by at most four hours inside
    one collection, model run, grid definition and physical cell. Normal
    maintenance may combine exact rows from different groups; cutover callers
    can require one group to resolve the complete requested axis.
    """
    if (
        not isinstance(hourly, dict)
        or not isinstance(entity_id, str)
        or not entity_id
        or collection not in WAM_COLLECTIONS
        or isinstance(maximum_interpolation_hours, bool)
        or not isinstance(maximum_interpolation_hours, int)
        or maximum_interpolation_hours < 0
        or maximum_interpolation_hours > MAX_INTERPOLATION_HOURS
        or not isinstance(require_single_group, bool)
    ):
        return {}
    try:
        required = tuple(
            format_utc_hour(parse_utc_hour(value)) for value in required_hours
        )
        exact_required = {
            format_utc_hour(parse_utc_hour(value))
            for value in exact_required_hours
        }
    except WaveBootstrapError:
        return {}
    if not required or len(set(required)) != len(required):
        return {}
    entity = _WaveCacheEntity(
        cache_key=entity_id,
        provenance_entity=provenance_entity,
    )
    grouped: dict[
        tuple[str, str, tuple[float, float]], list[_NativeWaveRow]
    ] = {}
    for valid_time, hour in hourly.items():
        if not _wave_bearing_hour(hour):
            continue
        try:
            canonical_valid = format_utc_hour(parse_utc_hour(valid_time))
            if canonical_valid != valid_time:
                continue
            row = _validate_native_wave_row(
                valid_time=valid_time,
                hour=hour,
                part=entity,
            )
        except WaveBootstrapError:
            continue
        if row.collection != collection:
            continue
        grouped.setdefault((
            row.model_run,
            row.grid_definition_sha256,
            row.grid_point,
        ), []).append(row)

    policy = WaveHistoryPolicy(
        mode=OPERATIONAL_MODE,
        history_hours=1,
        include_target=False,
        require_single_run_per_collection=True,
        allow_exact_multi_run=False,
        maximum_interpolation_hours=maximum_interpolation_hours,
    )

    def resolve_rows(
        rows: list[_NativeWaveRow],
        *,
        operational: bool,
    ) -> dict[
        str,
        tuple[
            tuple[tuple[str, str], tuple[str, str, str, str]],
            ...,
        ],
    ]:
        rows.sort(key=lambda row: row.valid_datetime)
        resolved: dict[
            str,
            tuple[
                tuple[tuple[str, str], tuple[str, str, str, str]],
                ...,
            ],
        ] = {}
        exact_native = {row.valid_time for row in rows}
        for required_hour in required:
            if (
                required_hour in exact_required
                and required_hour not in exact_native
            ):
                continue
            try:
                _resolution, used = (
                    _resolve_operational_required_hour(
                        rows,
                        parse_utc_hour(required_hour),
                        policy,
                    )
                    if operational
                    else _resolve_required_hour(
                        rows,
                        parse_utc_hour(required_hour),
                        policy,
                    )
                )
            except WaveBootstrapError:
                continue
            resolved[required_hour] = tuple(
                _native_wave_asset_evidence(row) for row in used
            )
        return resolved

    if not require_single_group:
        native_rows = [
            row for rows in grouped.values() for row in rows
        ]
        return resolve_rows(native_rows, operational=True)

    best: dict[
        str,
        tuple[
            tuple[tuple[str, str], tuple[str, str, str, str]],
            ...,
        ],
    ] = {}
    for rows in grouped.values():
        resolved = resolve_rows(rows, operational=False)
        if len(resolved) > len(best):
            best = resolved
        if len(best) == len(required):
            break
    return best


def resolved_native_wave_hours(
    hourly: Any,
    *,
    entity_id: str,
    provenance_entity: Mapping[str, Any],
    collection: str,
    required_hours: Sequence[str],
    exact_required_hours: Iterable[str] = (),
    maximum_interpolation_hours: int = MAX_INTERPOLATION_HOURS,
    require_single_group: bool = False,
) -> tuple[str, ...]:
    """Resolve native hours with the shared operational evidence contract."""
    evidence = resolved_native_wave_hour_evidence(
        hourly,
        entity_id=entity_id,
        provenance_entity=provenance_entity,
        collection=collection,
        required_hours=required_hours,
        exact_required_hours=exact_required_hours,
        maximum_interpolation_hours=maximum_interpolation_hours,
        require_single_group=require_single_group,
    )
    return tuple(evidence)


def native_wave_row_error_code(
    *,
    valid_time: str,
    hour: Any,
    entity_id: str,
    provenance_entity: Mapping[str, Any],
) -> str | None:
    """Return a privacy-safe reason code for one native wave row.

    This is intentionally row-local. Callers can salvage only the invalid
    component instead of discarding every valid PART/hour in the cache.
    """
    if not isinstance(entity_id, str) or not entity_id:
        return "CACHE_INVALID"
    try:
        _validate_native_wave_row(
            valid_time=valid_time,
            hour=hour,
            part=_WaveCacheEntity(
                cache_key=entity_id,
                provenance_entity=provenance_entity,
            ),
        )
    except WaveBootstrapError as exc:
        return exc.code
    return None


@dataclass(frozen=True)
class WaveHistoryValidationSummary:
    policy: WaveHistoryPolicy
    registry_part_count: int
    required_hour_count: int
    verified_part_hour_count: int
    exact_tuple_count: int
    interpolated_tuple_count: int
    wam_collection_count: int
    coherent_run_count: int
    registry_sha256: str
    wave_maximum_distance_km_by_collection: Mapping[str, float]
    native_distance_evidence_count_by_collection: Mapping[str, int]
    maximum_native_distance_km_by_collection: Mapping[str, float | None]

    def sanitized_attestation(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "schemaVersion": CONTRACT_SCHEMA,
            "mode": self.policy.mode,
            "historyHourCount": self.policy.history_hours,
            "includeTarget": self.policy.include_target,
            "requiredHourCount": self.required_hour_count,
            "registryPartCount": self.registry_part_count,
            "verifiedPartHourCount": self.verified_part_hour_count,
            "exactTupleCount": self.exact_tuple_count,
            "interpolatedTupleCount": self.interpolated_tuple_count,
            "wamCollectionCount": self.wam_collection_count,
            "coherentRunCount": self.coherent_run_count,
            "waveMaximumDistanceKmByCollection": dict(
                self.wave_maximum_distance_km_by_collection
            ),
            "nativeDistanceEvidenceCountByCollection": dict(
                self.native_distance_evidence_count_by_collection
            ),
            "maximumNativeDistanceKmByCollection": dict(
                self.maximum_native_distance_km_by_collection
            ),
            "omittedTailBound": self.policy.omitted_tail_bound,
            "conservativeMaxRawRavScoreError":
                self.policy.conservative_max_raw_ravscore_error,
            "registrySha256": self.registry_sha256,
        }


def validate_wave_history_cache(
    cache: Any,
    registry: CoastalPartRegistry,
    *,
    target_hour: str,
    policy: WaveHistoryPolicy,
    budget: ValidationBudget = ValidationBudget(),
    excluded_parent_zone_ids: Iterable[str] = (),
) -> WaveHistoryValidationSummary:
    if (
        not isinstance(cache, dict)
        or cache.get("schemaVersion") != 2
        or not isinstance(cache.get("zoneRegistrySignature"), str)
        or re.fullmatch(r"[0-9a-f]{16}", cache["zoneRegistrySignature"]) is None
        or not isinstance(cache.get("zones"), dict)
    ):
        raise WaveBootstrapError("CACHE_INVALID")
    zones = cache["zones"]
    expected_keys = {part.cache_key for part in registry.parts}
    actual_keys = {
        key for key in zones
        if isinstance(key, str) and key.startswith("PART::")
    }
    if len(actual_keys) != registry.part_count:
        raise WaveBootstrapError("CACHE_PART_COUNT")
    if actual_keys != expected_keys:
        raise WaveBootstrapError("CACHE_REGISTRY_MISMATCH")

    excluded_parents = frozenset(excluded_parent_zone_ids)
    if any(
        not isinstance(value, str) or _SAFE_ID.fullmatch(value) is None
        for value in excluded_parents
    ):
        raise WaveBootstrapError("INVALID_POLICY")
    selected_parts = tuple(
        part for part in registry.parts
        if part.parent_zone_id not in excluded_parents
    )
    if not selected_parts:
        raise WaveBootstrapError("INVALID_POLICY")

    required = policy_utc_hours(target_hour, policy)
    required_datetimes = tuple(parse_utc_hour(value) for value in required)
    total_rows = 0
    exact_count = 0
    interpolated_count = 0
    global_runs: dict[str, set[str]] = {}
    global_native_assets: dict[tuple[str, str], tuple[str, str, str, str]] = {}
    distance_evidence_keys: set[tuple[str, str, str]] = set()
    distance_evidence_counts = {
        collection: 0 for collection in sorted(WAM_MAX_DISTANCE_KM)
    }
    maximum_native_distances: dict[str, float | None] = {
        collection: None for collection in sorted(WAM_MAX_DISTANCE_KM)
    }

    for part in selected_parts:
        zone = zones.get(part.cache_key)
        if not isinstance(zone, dict) or not isinstance(zone.get("hourly"), dict):
            raise WaveBootstrapError("CACHE_INVALID")
        hourly = zone["hourly"]
        if len(hourly) > budget.maximum_rows_per_part:
            raise WaveBootstrapError("VALIDATION_BUDGET")
        total_rows += len(hourly)
        if total_rows > budget.maximum_total_rows:
            raise WaveBootstrapError("VALIDATION_BUDGET")

        native_rows: list[_NativeWaveRow] = []
        for valid_time, hour in hourly.items():
            if not _wave_bearing_hour(hour):
                continue
            try:
                canonical_valid = format_utc_hour(parse_utc_hour(valid_time))
            except WaveBootstrapError:
                raise WaveBootstrapError("CACHE_INVALID") from None
            if canonical_valid != valid_time:
                raise WaveBootstrapError("CACHE_INVALID")
            native_rows.append(_validate_native_wave_row(
                valid_time=valid_time,
                hour=hour,
                part=part,
            ))
        native_rows.sort(key=lambda row: row.valid_datetime)
        if not native_rows:
            raise WaveBootstrapError("MISSING_HOUR")

        part_collections: set[str] = set()
        part_runs: dict[str, set[str]] = {}
        part_interpolated: dict[str, int] = {}
        part_cells: dict[str, tuple[str, tuple[float, float]]] = {}
        for wanted in required_datetimes:
            resolution, used = (
                _resolve_operational_required_hour(native_rows, wanted, policy)
                if policy.mode == OPERATIONAL_MODE
                else _resolve_required_hour(native_rows, wanted, policy)
            )
            collection = used[0].collection
            part_collections.add(collection)
            part_runs.setdefault(collection, set()).update(row.model_run for row in used)
            global_runs.setdefault(collection, set()).update(row.model_run for row in used)
            for row in used:
                cell = (row.grid_definition_sha256, row.grid_point)
                previous_cell = part_cells.get(row.collection)
                if (
                    policy.mode != OPERATIONAL_MODE
                    and previous_cell is not None
                    and (
                        previous_cell[0] != cell[0]
                        or not same_point(previous_cell[1], cell[1])
                    )
                ):
                    raise WaveBootstrapError("MIXED_CELL_HISTORY")
                part_cells[row.collection] = cell
                asset_key, asset_lineage = _native_wave_asset_evidence(row)
                if not _record_native_wave_asset_lineage(
                    global_native_assets,
                    asset_key,
                    asset_lineage,
                ):
                    raise WaveBootstrapError("INCONSISTENT_ASSET_PROVENANCE")
                distance_key = (part.cache_key, row.collection, row.valid_time)
                if distance_key not in distance_evidence_keys:
                    distance_evidence_keys.add(distance_key)
                    distance_evidence_counts[row.collection] += 1
                    previous_maximum = maximum_native_distances[row.collection]
                    maximum_native_distances[row.collection] = (
                        row.distance_km
                        if previous_maximum is None
                        else max(previous_maximum, row.distance_km)
                    )
            if resolution == "exact":
                exact_count += 1
            else:
                interpolated_count += 1
                part_interpolated[collection] = part_interpolated.get(collection, 0) + 1
        if len(part_collections) != 1:
            raise WaveBootstrapError("MIXED_COLLECTION_HISTORY")
        for collection, runs in part_runs.items():
            if (
                policy.mode != OPERATIONAL_MODE
                and len(runs) > 1
                and part_interpolated.get(collection, 0)
            ):
                raise WaveBootstrapError("MULTI_RUN_INTERPOLATION")

    if policy.require_single_run_per_collection:
        if any(len(runs) != 1 for runs in global_runs.values()):
            raise WaveBootstrapError("COHERENT_RUN_REQUIRED")
    elif not policy.allow_exact_multi_run and any(len(runs) > 1 for runs in global_runs.values()):
        raise WaveBootstrapError("COHERENT_RUN_REQUIRED")
    if not global_runs or any(collection not in WAM_COLLECTIONS for collection in global_runs):
        raise WaveBootstrapError("INVALID_PROVENANCE")
    if policy.mode == COLD_START_MODE and interpolated_count != 0:
        raise WaveBootstrapError("INTERPOLATED_COLD_START")

    return WaveHistoryValidationSummary(
        policy=policy,
        registry_part_count=registry.part_count,
        required_hour_count=len(required),
        verified_part_hour_count=len(selected_parts) * len(required),
        exact_tuple_count=exact_count,
        interpolated_tuple_count=interpolated_count,
        wam_collection_count=len(global_runs),
        coherent_run_count=sum(len(runs) for runs in global_runs.values()),
        registry_sha256=registry.canonical_sha256,
        wave_maximum_distance_km_by_collection={
            collection: WAM_MAX_DISTANCE_KM[collection]
            for collection in sorted(WAM_MAX_DISTANCE_KM)
        },
        native_distance_evidence_count_by_collection=distance_evidence_counts,
        maximum_native_distance_km_by_collection={
            collection: (
                None if maximum_native_distances[collection] is None
                else round(maximum_native_distances[collection], 6)
            )
            for collection in sorted(WAM_MAX_DISTANCE_KM)
        },
    )


@dataclass(frozen=True)
class WaveOperationalHandoffSummary:
    registry_part_count: int
    native_required_part_count: int
    deferred_proxy_part_count: int
    bridge_exact_hour_count: int
    forecast_hour_count: int
    verified_part_hour_count: int
    exact_tuple_count: int
    interpolated_tuple_count: int
    wam_collection_count: int
    coherent_run_count: int
    registry_sha256: str
    wave_maximum_distance_km_by_collection: Mapping[str, float]
    native_distance_evidence_count_by_collection: Mapping[str, int]
    maximum_native_distance_km_by_collection: Mapping[str, float | None]

    def sanitized_attestation(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "schemaVersion": CONTRACT_SCHEMA,
            "mode": "operational-maintained-handoff",
            "registryPartCount": self.registry_part_count,
            "nativeRequiredPartCount": self.native_required_part_count,
            "deferredProxyPartCount": self.deferred_proxy_part_count,
            "bridgeExactHourCount": self.bridge_exact_hour_count,
            "forecastHourCount": self.forecast_hour_count,
            "verifiedPartHourCount": self.verified_part_hour_count,
            "exactTupleCount": self.exact_tuple_count,
            "interpolatedTupleCount": self.interpolated_tuple_count,
            "wamCollectionCount": self.wam_collection_count,
            "coherentRunCount": self.coherent_run_count,
            "waveMaximumDistanceKmByCollection": dict(
                self.wave_maximum_distance_km_by_collection
            ),
            "nativeDistanceEvidenceCountByCollection": dict(
                self.native_distance_evidence_count_by_collection
            ),
            "maximumNativeDistanceKmByCollection": dict(
                self.maximum_native_distance_km_by_collection
            ),
            "registrySha256": self.registry_sha256,
        }


def validate_wave_operational_handoff_cache(
    cache: Any,
    registry: CoastalPartRegistry,
    *,
    bootstrap_target_hour: str,
    production_target_hour: str,
    forecast_hour_count: int = 118,
    budget: ValidationBudget = ValidationBudget(),
    deferred_proxy_parent_zone_ids: Iterable[str] = ("DK-B05-11",),
) -> WaveOperationalHandoffSummary:
    """Prove an exact bridge and a safely maintained public WAM horizon.

    Exact native rows may cross model-run or cell boundaries as the maintained
    cache advances.  Every interpolated hour still has to be bracketed inside
    one model run, collection, grid definition and physical cell.  Parts whose
    approved operational policy is a downstream proxy are deferred to that
    independently validated final gate; they remain present in the registry.
    """
    bootstrap_target = parse_utc_hour(bootstrap_target_hour)
    production_target = parse_utc_hour(production_target_hour)
    bridge_hours = int(
        (production_target - bootstrap_target).total_seconds() / 3600
    ) + 1
    if (
        production_target < bootstrap_target
        or bridge_hours < 1
        or bridge_hours > 4
        or isinstance(forecast_hour_count, bool)
        or not isinstance(forecast_hour_count, int)
        or forecast_hour_count < 1
        or bridge_hours + forecast_hour_count - 1 > 168
    ):
        raise WaveBootstrapError("OPERATIONAL_HANDOFF_INVALID")

    end_exclusive = production_target + timedelta(hours=forecast_hour_count)
    combined_hour_count = int(
        (end_exclusive - bootstrap_target).total_seconds() / 3600
    )
    deferred_parents = frozenset(deferred_proxy_parent_zone_ids)
    deferred_parts = tuple(
        part for part in registry.parts
        if part.parent_zone_id in deferred_parents
    )

    combined_policy = WaveHistoryPolicy(
        mode=OPERATIONAL_MODE,
        history_hours=combined_hour_count,
        include_target=False,
        require_single_run_per_collection=False,
        allow_exact_multi_run=True,
    )
    combined = validate_wave_history_cache(
        cache,
        registry,
        target_hour=format_utc_hour(end_exclusive),
        policy=combined_policy,
        budget=budget,
        excluded_parent_zone_ids=deferred_parents,
    )

    exact_policy = WaveHistoryPolicy(
        mode=OPERATIONAL_MODE,
        history_hours=1,
        include_target=False,
        require_single_run_per_collection=False,
        allow_exact_multi_run=True,
        maximum_interpolation_hours=0,
    )
    for offset in range(bridge_hours):
        bridge_hour = bootstrap_target + timedelta(hours=offset)
        try:
            exact = validate_wave_history_cache(
                cache,
                registry,
                target_hour=format_utc_hour(bridge_hour + timedelta(hours=1)),
                policy=exact_policy,
                budget=budget,
                excluded_parent_zone_ids=deferred_parents,
            )
        except WaveBootstrapError as exc:
            if exc.code in {"MISSING_HOUR", "INTERPOLATION_GAP"}:
                raise WaveBootstrapError("OPERATIONAL_HANDOFF_INVALID") from None
            raise
        if exact.exact_tuple_count != registry.part_count - len(deferred_parts):
            raise WaveBootstrapError("OPERATIONAL_HANDOFF_INVALID")

    return WaveOperationalHandoffSummary(
        registry_part_count=registry.part_count,
        native_required_part_count=registry.part_count - len(deferred_parts),
        deferred_proxy_part_count=len(deferred_parts),
        bridge_exact_hour_count=bridge_hours,
        forecast_hour_count=forecast_hour_count,
        verified_part_hour_count=combined.verified_part_hour_count,
        exact_tuple_count=combined.exact_tuple_count,
        interpolated_tuple_count=combined.interpolated_tuple_count,
        wam_collection_count=combined.wam_collection_count,
        coherent_run_count=combined.coherent_run_count,
        registry_sha256=registry.canonical_sha256,
        wave_maximum_distance_km_by_collection=(
            combined.wave_maximum_distance_km_by_collection
        ),
        native_distance_evidence_count_by_collection=(
            combined.native_distance_evidence_count_by_collection
        ),
        maximum_native_distance_km_by_collection=(
            combined.maximum_native_distance_km_by_collection
        ),
    )
