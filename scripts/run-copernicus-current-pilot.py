#!/usr/bin/env python3
"""Acquire and atomically seal the private Copernicus current range cache."""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import math
import os
import shutil
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from lib.copernicus_current import (
    COMPONENT_PAIR,
    FUTURE_ACQUISITION_FRESHNESS_HOURS,
    LOCAL_MAX_DISTANCE_KM,
    REQUEST_CONTRACT_ID,
    SELECTION_POLICY_ID,
    atomic_write_shadow,
    atomic_write_shadow_checkpoint,
    file_sha256,
    load_shadow,
    load_targets,
    make_acquisition,
    make_coverage_collection,
    make_record,
    merge_cache_evidence,
    nearest_shared_uv_times,
    safe_shadow_summary,
    select_required_records,
    utc_iso,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_current_source_stage import (
    PINNED_PRODUCTS,
    SOURCE_STAGE_STATUS,
    SPATIAL_SHARD_LATITUDE_DEGREES,
    SPATIAL_SHARD_LONGITUDE_DEGREES,
    SPATIAL_SHARD_MAX_TARGETS,
    SPATIAL_SHARD_POLICY_ID,
    atomic_write_source_stage,
    atomic_write_source_stage_progress,
    build_source_stage,
    build_source_stage_progress,
    eligible_target,
    make_source_attempt,
    safe_source_stage_summary,
    select_source_order_admissible_records,
    validate_reusable_source_stage,
)
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / ".cache/copernicus-current-targets.json"
DEFAULT_AUTHORITATIVE_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_SHADOW = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_SOURCE_STAGE = ROOT / ".cache/copernicus-current-source-stage.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/copernicus-current-pilot.json"
DEFAULT_SUMMARY = ROOT / "data/diagnostics/copernicus-current-pilot.txt"
SOFT_DEADLINE_EPOCH_ENV = "RAVRADAR_COPERNICUS_SOFT_DEADLINE_EPOCH"
BOUNDED_PROGRESS_EXIT_CODE = 75
OPERATIONAL_REFRESH_MAX_SHARDS = max(
    0,
    int(os.getenv("COPERNICUS_OPERATIONAL_REFRESH_MAX_SHARDS", "4")),
)
OPERATIONAL_REFRESH_MIN_REMAINING_SECONDS = 45.0


class CopernicusOperationalBudgetReached(RuntimeError):
    """Signal that validated progress was saved before the wrapper deadline."""


COPERNICUS_SHARD_DATA_ERRORS = (
    ImportError,
    IndexError,
    KeyError,
    OSError,
    OverflowError,
    RuntimeError,
    TypeError,
    ValueError,
)


def quarantine_invalid_private_file(path: Path, label: str) -> None:
    """Retain invalid private bytes under a payload-free digest before replacement."""
    if not path.exists() or path.stat().st_size <= 0:
        return
    digest = file_sha256(path).removeprefix("sha256:")
    quarantine = path.with_name(f"{path.name}.invalid-{digest[:16]}")
    os.replace(path, quarantine)
    print(
        f"Quarantined invalid private Copernicus {label}; "
        f"contentSha256Prefix={digest[:12]}.",
        flush=True,
    )


PRODUCTS = [dict(row) for row in PINNED_PRODUCTS]
ADVISORY_HISTORY_MAX_SHARDS_PER_PRODUCT = max(
    1,
    int(os.getenv("COPERNICUS_ADVISORY_HISTORY_MAX_SHARDS_PER_PRODUCT", "1")),
)
ADVISORY_HISTORY_MAX_SECONDS = max(
    30,
    int(os.getenv("COPERNICUS_ADVISORY_HISTORY_MAX_SECONDS", "180")),
)


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--authoritative-targets", type=Path, default=DEFAULT_AUTHORITATIVE_TARGETS)
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--source-stage", type=Path, default=DEFAULT_SOURCE_STAGE)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--at", help="Locked productionReferenceAt; must match the target registry")
    parser.add_argument("--fixture-directory", type=Path, help="Use local NetCDF fixtures")
    parser.add_argument("--acquisition-at", help="Deterministic actual acquisition clock for tests")
    parser.add_argument(
        "--refresh-only",
        action="store_true",
        help="Refresh still-selectable records for the next run without delaying closure",
    )
    return parser.parse_args()


def parse_time(value: Any, label: str) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"{label} must include a timezone")
    return parsed.astimezone(timezone.utc)


def selected_reference(value: str | None, registry: dict[str, Any]) -> datetime:
    registry_reference = parse_time(registry["productionReferenceAt"], "registry production reference")
    requested = registry_reference if value is None else parse_time(value, "requested production reference")
    if requested != registry_reference:
        raise RuntimeError("Copernicus production reference cannot be rebound after the DMI-gap matrix was built")
    return registry_reference


def spatial_shards(targets: list[dict[str, Any]], product: dict[str, Any]) -> list[dict[str, Any]]:
    """Create fixed-cell, bounded and ordering-independent request shards."""
    buckets: dict[tuple[int, int], list[dict[str, Any]]] = {}
    for target in targets:
        longitude, latitude = map(float, target["waterPoint"])
        x = math.floor((longitude - float(product["minimumLongitude"])) / SPATIAL_SHARD_LONGITUDE_DEGREES)
        y = math.floor((latitude - float(product["minimumLatitude"])) / SPATIAL_SHARD_LATITUDE_DEGREES)
        buckets.setdefault((x, y), []).append(target)
    shards: list[dict[str, Any]] = []
    for bucket in sorted(buckets):
        rows = sorted(buckets[bucket], key=lambda row: str(row["partId"]))
        for offset in range(0, len(rows), SPATIAL_SHARD_MAX_TARGETS):
            chunk = rows[offset:offset + SPATIAL_SHARD_MAX_TARGETS]
            shards.append({
                "shardId": f"{product['source']}:{bucket[0]}:{bucket[1]}:{offset // SPATIAL_SHARD_MAX_TARGETS}",
                "targets": chunk,
            })
    return shards


def request_bounds(targets: list[dict[str, Any]], product: dict[str, Any]) -> tuple[float, float, float, float]:
    if not targets:
        raise RuntimeError(f"No eligible targets for {product['source']}")
    longitudes = [row["waterPoint"][0] for row in targets]
    latitudes = [row["waterPoint"][1] for row in targets]
    bounds = (
        max(product["minimumLongitude"], min(longitudes) - 0.12),
        min(product["maximumLongitude"], max(longitudes) + 0.12),
        max(product["minimumLatitude"], min(latitudes) - 0.08),
        min(product["maximumLatitude"], max(latitudes) + 0.08),
    )
    if bounds[1] - bounds[0] > SPATIAL_SHARD_LONGITUDE_DEGREES + 0.240001:
        raise RuntimeError("Copernicus longitude shard exceeded its deterministic bound")
    if bounds[3] - bounds[2] > SPATIAL_SHARD_LATITUDE_DEGREES + 0.160001:
        raise RuntimeError("Copernicus latitude shard exceeded its deterministic bound")
    return bounds


def download_subset(
    product: dict[str, Any],
    targets: list[dict[str, Any]],
    start: datetime,
    end: datetime,
    output_directory: Path,
    shard_index: int,
) -> Path:
    import copernicusmarine

    minimum_lon, maximum_lon, minimum_lat, maximum_lat = request_bounds(targets, product)
    response = copernicusmarine.subset(
        dataset_id=product["datasetId"],
        dataset_version=product["datasetVersion"],
        variables=["uo", "vo"],
        minimum_longitude=minimum_lon,
        maximum_longitude=maximum_lon,
        minimum_latitude=minimum_lat,
        maximum_latitude=maximum_lat,
        start_datetime=start,
        end_datetime=end,
        coordinates_selection_method="nearest",
        output_filename=f"{product['source']}-{shard_index:03d}.nc",
        output_directory=output_directory,
        file_format="netcdf",
        service="geoseries",
        overwrite=True,
        disable_progress_bar=True,
        netcdf_compression_level=1,
    )
    path = Path(response.file_path)
    if not path.exists() or path.stat().st_size <= 0:
        raise RuntimeError(f"Copernicus returned no subset for {product['source']}")
    return path


def fixture_path(directory: Path, product: dict[str, Any], shard_index: int) -> Path:
    shard = directory / f"{product['source']}-{shard_index:03d}.nc"
    path = shard if shard.exists() else directory / f"{product['source']}.nc"
    if not path.exists() or path.stat().st_size <= 0:
        raise RuntimeError(f"Missing Copernicus fixture for {product['source']} shard {shard_index}")
    return path


def acquire_shard_rows(
    *,
    product: dict[str, Any],
    shard_targets: list[dict[str, Any]],
    times_by_part: dict[str, list[datetime]],
    fixture_directory: Path | None,
    temporary: Path,
    shard_index: int,
) -> tuple[str, list[dict[str, Any]]]:
    """Download/read one provider shard and return only parsed raw rows."""
    native_times = sorted({
        value for values in times_by_part.values() for value in values
    })
    path = (
        fixture_path(fixture_directory, product, shard_index)
        if fixture_directory
        else download_subset(
            product,
            shard_targets,
            native_times[0],
            native_times[-1],
            temporary,
            shard_index,
        )
    )
    subset_sha256 = file_sha256(path)
    raw_records: list[dict[str, Any]] = []
    import xarray as xr
    with xr.open_dataset(path) as dataset:
        for target in shard_targets:
            raw_records.extend(nearest_shared_uv_times(
                dataset,
                target,
                source=product["source"],
                product_id=product["productId"],
                dataset_id=product["datasetId"],
                dataset_version=product["datasetVersion"],
                expected_times=times_by_part[target["partId"]],
            ))
    return subset_sha256, raw_records


def no_credentials_in_report(report: dict[str, Any]) -> None:
    serialized = json.dumps(report, ensure_ascii=False).lower()
    for value in (
        os.getenv("COPERNICUSMARINE_SERVICE_USERNAME", ""),
        os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD", ""),
    ):
        if value and value.lower() in serialized:
            raise RuntimeError("Credential material reached the safe Copernicus report")
    if any(token in serialized for token in ("password", "service_username", "service_password", "samplingpoint", "gridpoint", "umps", "vmps")):
        raise RuntimeError("Private field name reached the safe Copernicus report")


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def require_operational_time_budget() -> None:
    """Stop only between shards while enough wrapper time remains to save state."""
    raw = os.getenv(SOFT_DEADLINE_EPOCH_ENV)
    if not raw:
        return
    try:
        deadline = float(raw)
    except ValueError as error:
        raise RuntimeError("Copernicus soft deadline is malformed") from error
    if not math.isfinite(deadline) or deadline <= 0:
        raise RuntimeError("Copernicus soft deadline is invalid")
    if time.time() >= deadline:
        raise CopernicusOperationalBudgetReached(
            "Copernicus bounded work stopped safely at a shard boundary; "
            "validated progress is available for the next run"
        )


def refresh_time_available(*, fixture_directory: Path | None) -> bool:
    """Return whether optional refresh has bounded time after critical work."""
    if fixture_directory is not None:
        return True
    raw = os.getenv(SOFT_DEADLINE_EPOCH_ENV)
    if not raw:
        return False
    try:
        deadline = float(raw)
    except ValueError as error:
        raise RuntimeError("Copernicus soft deadline is malformed") from error
    if not math.isfinite(deadline) or deadline <= 0:
        raise RuntimeError("Copernicus soft deadline is invalid")
    return time.time() + OPERATIONAL_REFRESH_MIN_REMAINING_SECONDS < deadline


def persist_source_stage_progress(
    *,
    shadow_path: Path,
    source_stage_path: Path,
    registry: dict[str, Any],
    target_identities: dict[str, dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
    updated_at: datetime,
    shadow_changed: bool,
) -> dict[str, Any]:
    """Persist vector state before the private attempt journal, never after it."""
    if shadow_changed or not shadow_path.exists() or shadow_path.stat().st_size <= 0:
        shadow = atomic_write_shadow_checkpoint(
            shadow_path,
            acquisitions=acquisitions,
            records=records,
            updated_at=updated_at,
            target_identities=target_identities,
        )
    else:
        shadow = validate_shadow(
            json.loads(shadow_path.read_text(encoding="utf-8")),
            target_identities,
            require_collection=False,
        )
    shadow_sha256 = file_sha256(shadow_path)
    progress = build_source_stage_progress(
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
        attempts=attempts,
        updated_at=updated_at,
    )
    atomic_write_source_stage_progress(
        source_stage_path,
        progress,
        registry=registry,
        shadow=shadow,
        target_identities=target_identities,
        shadow_sha256=shadow_sha256,
    )
    return shadow


def current_reference_attempt_pairs(
    attempts: list[dict[str, Any]],
    *,
    source: str,
    reference: datetime,
) -> set[tuple[str, str]]:
    """Return only pairs completed for this exact production reference.

    Rebased attempts remain immutable audit/source-order evidence, but they must
    not suppress a fresh request after the production reference advances.
    """
    reference_at = utc_iso(reference)
    return {
        (pair["partId"], pair["validTime"])
        for attempt in attempts
        if attempt["source"] == source
        and attempt["productionReferenceAt"] == reference_at
        for pair in attempt["requestedPairs"]
    }


def replace_stale_shard_attempt(
    attempts: list[dict[str, Any]],
    current_attempt: dict[str, Any],
) -> list[dict[str, Any]]:
    """Retire older evidence for one newly retried shard without rewriting it.

    A source-stage cannot contain two attempts for the same exact pair. The
    fresh request contains only the actual current residual intersection; an
    older attempt must never widen that request to unrelated pairs. Attempts
    are reference-bound source-order evidence, so all older attempts for the
    touched source/shard are retired while their physical records remain in the
    shadow. Other shards and current-reference disjoint attempts remain intact.
    """
    source_rank = {
        product["source"]: index for index, product in enumerate(PRODUCTS)
    }
    retained = [
        attempt
        for attempt in attempts
        if not (
            attempt["source"] == current_attempt["source"]
            and attempt["shardId"] == current_attempt["shardId"]
            and attempt["productionReferenceAt"]
                != current_attempt["productionReferenceAt"]
        )
    ]
    retained.append(current_attempt)
    return sorted(
        retained,
        key=lambda row: (source_rank[row["source"]], row["shardId"]),
    )


def fill_bounded_advisory_history(
    *,
    required_pairs: list[dict[str, Any]],
    registry_targets: list[dict[str, Any]],
    target_identities: dict[str, dict[str, Any]],
    existing: dict[str, Any],
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    reference: datetime,
    acquisition_at: datetime,
    fixture_directory: Path | None,
    shadow_path: Path,
    continue_work: Callable[[], bool] | None = None,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    dict[str, Any],
]:
    """Fill past exact DMI gaps without making history a deployment gate.

    Operational target..+117 acquisition has already completed before this
    helper is called. Work is deliberately bounded and checkpointed after each
    successful shard. A failed, timed-out or unstarted shard remains missing;
    this stage never emits exhaustion evidence and never borrows another part,
    hour or regional source.
    """
    selected_refs, missing = select_required_records(
        required_pairs, acquisitions, records, reference,
    )
    initial_available = len(selected_refs)
    remaining = {(row["partId"], row["validTime"]) for row in missing}
    started = time.monotonic()
    attempted_shards = 0
    completed_shards = 0
    failed_shards = 0
    budget_reached = False
    new_acquisition_count = 0
    temporary = Path(tempfile.mkdtemp(prefix="ravradar-copernicus-history-"))
    try:
        for product in PRODUCTS:
            product_shards = 0
            source_targets = [
                row for row in registry_targets if eligible_target(row, product)
            ]
            for shard_index, shard in enumerate(spatial_shards(source_targets, product)):
                times_by_part: dict[str, list[datetime]] = {}
                for target in shard["targets"]:
                    target_times = sorted(
                        parse_time(valid_time, "advisory history pair time")
                        for part_id, valid_time in remaining
                        if part_id == target["partId"]
                    )
                    if target_times:
                        times_by_part[target["partId"]] = target_times
                if not times_by_part:
                    continue
                if (
                    product_shards >= ADVISORY_HISTORY_MAX_SHARDS_PER_PRODUCT
                    or time.monotonic() - started >= ADVISORY_HISTORY_MAX_SECONDS
                    or (continue_work is not None and not continue_work())
                ):
                    budget_reached = True
                    break
                product_shards += 1
                attempted_shards += 1
                shard_targets = [
                    row for row in shard["targets"] if row["partId"] in times_by_part
                ]
                native_times = sorted({
                    value for values in times_by_part.values() for value in values
                })
                try:
                    subset_sha256, raw_records = acquire_shard_rows(
                        product=product,
                        shard_targets=shard_targets,
                        times_by_part=times_by_part,
                        fixture_directory=fixture_directory,
                        temporary=temporary,
                        shard_index=shard_index,
                    )
                    acquisition = make_acquisition(
                        source=product["source"],
                        acquisition_at=acquisition_at,
                        request_start_at=native_times[0],
                        request_end_at=native_times[-1],
                        targets=shard_targets,
                        native_valid_times=native_times,
                        subset_sha256=subset_sha256,
                        record_count=len(raw_records),
                        request_contract_id=REQUEST_CONTRACT_ID,
                    )
                    acquired = [
                        make_record(
                            row,
                            acquisition,
                            target_identities[row["partId"]],
                        )
                        for row in raw_records
                    ]
                except COPERNICUS_SHARD_DATA_ERRORS:
                    # Advisory history is never a deploy gate. Incomplete work
                    # remains visibly missing and is eligible for a later run;
                    # it is not converted into an exhaustion attestation.
                    failed_shards += 1
                    continue
                completed_shards += 1
                if acquired:
                    acquisitions, records = merge_cache_evidence(
                        existing,
                        acquisitions + [acquisition],
                        records + acquired,
                        reference,
                        target_identities,
                    )
                    new_acquisition_count += 1
                    selected_refs, missing = select_required_records(
                        required_pairs, acquisitions, records, reference,
                    )
                    remaining = {(row["partId"], row["validTime"]) for row in missing}
                    atomic_write_shadow_checkpoint(
                        shadow_path,
                        acquisitions=acquisitions,
                        records=records,
                        updated_at=acquisition_at,
                        target_identities=target_identities,
                    )
                if not remaining:
                    break
            if not remaining:
                break
    finally:
        shutil.rmtree(temporary, ignore_errors=True)

    selected_refs, missing = select_required_records(
        required_pairs, acquisitions, records, reference,
    )
    summary = {
        "status": "COMPLETE" if not missing else "BOUNDED_INCOMPLETE",
        "requiredPairCount": len(required_pairs),
        "initialAvailablePairCount": initial_available,
        "acquiredPairCount": len(selected_refs) - initial_available,
        "availablePairCount": len(selected_refs),
        "missingPairCount": len(missing),
        "attemptedShardCount": attempted_shards,
        "completedShardCount": completed_shards,
        "failedShardCount": failed_shards,
        "boundedWorkRemaining": bool(missing),
        "budgetReached": budget_reached,
        "exhaustionAttested": False,
        "regionalHistoryUsed": False,
        "interpolationCarryOrLoanUsed": False,
        "newAcquisitionCount": new_acquisition_count,
    }
    return acquisitions, records, selected_refs, missing, summary


def select_primary_advisory_history(
    *,
    required_pairs: list[dict[str, Any]],
    acquisitions: list[dict[str, Any]],
    records: list[dict[str, Any]],
    reference: datetime,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    """Reuse advisory history without doing network work in the critical run."""
    selected_refs, missing = select_required_records(
        required_pairs, acquisitions, records, reference,
    )
    summary = {
        "status": "COMPLETE" if not missing else "BOUNDED_INCOMPLETE",
        "requiredPairCount": len(required_pairs),
        "initialAvailablePairCount": len(selected_refs),
        "acquiredPairCount": 0,
        "availablePairCount": len(selected_refs),
        "missingPairCount": len(missing),
        "attemptedShardCount": 0,
        "completedShardCount": 0,
        "failedShardCount": 0,
        "boundedWorkRemaining": bool(missing),
        "budgetReached": False,
        "exhaustionAttested": False,
        "regionalHistoryUsed": False,
        "interpolationCarryOrLoanUsed": False,
        "newAcquisitionCount": 0,
    }
    return selected_refs, missing, summary


def run_bounded_operational_refresh(
    *,
    args: argparse.Namespace,
    registry: dict[str, Any],
    reference: datetime,
    acquisition_at: datetime,
    authoritative_targets: list[dict[str, Any]],
    target_identities: dict[str, dict[str, Any]],
    existing: dict[str, Any],
    source_stage: dict[str, Any],
) -> int:
    """Best-effort refresh for a separately saved next-run cache package.

    The caller runs this only after the critical DMI/Copernicus/regional/
    Open-Meteo closure has been sealed.  No mutation is persisted until every
    successful refresh shard has been reselected and a replacement reusable
    stage validates. Provider failures therefore leave the original cache
    package byte-for-byte reusable. An IN_PROGRESS post-closure stage first
    retries its exact missing pairs; older selected rows are refreshed second.
    """
    if OPERATIONAL_REFRESH_MAX_SHARDS == 0 or not refresh_time_available(
        fixture_directory=args.fixture_directory,
    ):
        print("Copernicus cache refresh skipped safely: bounded time unavailable.")
        return 0

    required_pairs = list(registry["operationalRequiredPairs"])
    target_by_id = {str(row["partId"]): row for row in authoritative_targets}
    product_by_source = {row["source"]: row for row in PRODUCTS}
    baltic = product_by_source["copernicus-baltic-nemo"]
    shards_by_source = {
        product["source"]: spatial_shards(
            [
                row for row in authoritative_targets
                if eligible_target(row, product)
            ],
            product,
        )
        for product in PRODUCTS
    }
    shard_for_part: dict[tuple[str, str], tuple[int, dict[str, Any]]] = {}
    for source, shards in shards_by_source.items():
        for shard_index, shard in enumerate(shards):
            for target in shard["targets"]:
                shard_for_part[(source, target["partId"])] = (
                    shard_index,
                    shard,
                )

    attempts = list(source_stage["attempts"])
    original_acquisitions = list(existing.get("acquisitions") or [])
    original_records = list(existing.get("records") or [])
    new_acquisitions: list[dict[str, Any]] = []
    new_records: list[dict[str, Any]] = []
    blocked_shards: set[tuple[str, str]] = set()
    attempted_shard_count = 0
    completed_shard_count = 0
    failed_shard_count = 0
    temporary = Path(tempfile.mkdtemp(prefix="ravradar-copernicus-refresh-"))
    try:
        while (
            attempted_shard_count < OPERATIONAL_REFRESH_MAX_SHARDS
            and refresh_time_available(fixture_directory=args.fixture_directory)
        ):
            current_acquisitions, current_records = merge_cache_evidence(
                existing,
                new_acquisitions,
                new_records,
                reference,
                target_identities,
            )
            current_refs, current_missing, _ = select_source_order_admissible_records(
                required_pairs,
                current_acquisitions,
                current_records,
                reference,
                authoritative_targets,
                attempts,
            )
            acquisition_by_id = {
                row["acquisitionId"]: row for row in current_acquisitions
            }
            current_attempted = {
                product["source"]: current_reference_attempt_pairs(
                    attempts,
                    source=product["source"],
                    reference=reference,
                )
                for product in PRODUCTS
            }

            candidates: list[dict[str, Any]] = []
            for pair_row in current_missing:
                pair = (pair_row["partId"], pair_row["validTime"])
                target = target_by_id[pair[0]]
                refresh_source = next(
                    (
                        product["source"]
                        for product in PRODUCTS
                        if eligible_target(target, product)
                        and pair not in current_attempted[product["source"]]
                    ),
                    None,
                )
                if refresh_source is None:
                    continue
                shard_entry = shard_for_part.get((refresh_source, pair[0]))
                if shard_entry is None:
                    raise RuntimeError(
                        "Copernicus missing refresh target has no pinned spatial shard"
                    )
                shard_index, shard = shard_entry
                if (refresh_source, shard["shardId"]) in blocked_shards:
                    continue
                candidates.append({
                    "priority": 0,
                    "acquisitionAt": reference,
                    "validTime": pair[1],
                    "partId": pair[0],
                    "source": refresh_source,
                    "shardIndex": shard_index,
                    "shard": shard,
                })
            for ref in current_refs:
                acquisition = acquisition_by_id[ref["acquisitionId"]]
                acquired_at = parse_time(
                    acquisition["acquisitionAt"],
                    "refresh candidate acquisition",
                )
                if acquired_at >= acquisition_at:
                    continue
                pair = (ref["partId"], ref["validTime"])
                selected_source = ref["source"]
                refresh_source: str | None = None
                if selected_source == "copernicus-baltic-nemo":
                    if pair not in current_attempted["copernicus-baltic-nemo"]:
                        refresh_source = "copernicus-baltic-nemo"
                elif selected_source == "copernicus-nws-amm15":
                    if (
                        eligible_target(target_by_id[ref["partId"]], baltic)
                        and pair not in current_attempted["copernicus-baltic-nemo"]
                    ):
                        refresh_source = "copernicus-baltic-nemo"
                    elif pair not in current_attempted["copernicus-nws-amm15"]:
                        refresh_source = "copernicus-nws-amm15"
                if refresh_source is None:
                    continue
                shard_entry = shard_for_part.get((refresh_source, ref["partId"]))
                if shard_entry is None:
                    raise RuntimeError("Copernicus refresh target has no pinned spatial shard")
                shard_index, shard = shard_entry
                if (refresh_source, shard["shardId"]) in blocked_shards:
                    continue
                candidates.append({
                    "priority": 1,
                    "acquisitionAt": acquired_at,
                    "validTime": ref["validTime"],
                    "partId": ref["partId"],
                    "source": refresh_source,
                    "shardIndex": shard_index,
                    "shard": shard,
                })
            if not candidates:
                break
            candidates.sort(key=lambda row: (
                row["priority"],
                row["acquisitionAt"],
                row["validTime"],
                row["partId"],
                row["source"],
            ))
            source = candidates[0]["source"]
            shard_index = candidates[0]["shardIndex"]
            shard = candidates[0]["shard"]
            product = product_by_source[source]
            refresh_pairs = {
                (row["partId"], row["validTime"])
                for row in candidates
                if row["source"] == source
                and row["shard"]["shardId"] == shard["shardId"]
            }
            if source == "copernicus-nws-amm15":
                missing_prerequisite = {
                    pair for pair in refresh_pairs
                    if eligible_target(target_by_id[pair[0]], baltic)
                    and pair not in current_attempted["copernicus-baltic-nemo"]
                }
                if missing_prerequisite:
                    blocked_shards.add((source, shard["shardId"]))
                    failed_shard_count += 1
                    continue
            times_by_part: dict[str, list[datetime]] = {}
            for target in shard["targets"]:
                times = sorted(
                    parse_time(valid_time, "refresh pair time")
                    for part_id, valid_time in refresh_pairs
                    if part_id == target["partId"]
                )
                if times:
                    times_by_part[target["partId"]] = times
            if not times_by_part:
                blocked_shards.add((source, shard["shardId"]))
                continue
            if args.fixture_directory is None and (
                not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME")
                or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD")
            ):
                raise RuntimeError(
                    "Copernicus credentials are required through environment secrets"
                )
            attempted_shard_count += 1
            shard_targets = [
                row for row in shard["targets"] if row["partId"] in times_by_part
            ]
            native_times = sorted({
                value for values in times_by_part.values() for value in values
            })
            try:
                subset_sha256, raw_records = acquire_shard_rows(
                    product=product,
                    shard_targets=shard_targets,
                    times_by_part=times_by_part,
                    fixture_directory=args.fixture_directory,
                    temporary=temporary,
                    shard_index=shard_index,
                )
                request_start = native_times[0]
                request_end = native_times[-1]
                acquisition = make_acquisition(
                    source=source,
                    acquisition_at=acquisition_at,
                    request_start_at=request_start,
                    request_end_at=request_end,
                    targets=shard_targets,
                    native_valid_times=native_times,
                    subset_sha256=subset_sha256,
                    record_count=len(raw_records),
                    request_contract_id=REQUEST_CONTRACT_ID,
                )
                parsed_records = [
                    make_record(
                        row,
                        acquisition,
                        target_identities[row["partId"]],
                    )
                    for row in raw_records
                ]
                source_attempt = make_source_attempt(
                    production_reference_at=reference,
                    acquisition_at=acquisition_at,
                    product=product,
                    shard_id=shard["shardId"],
                    target_part_ids=[row["partId"] for row in shard_targets],
                    requested_pairs=sorted(
                        [
                            {"partId": part_id, "validTime": utc_iso(valid_time)}
                            for part_id, valid_times in times_by_part.items()
                            for valid_time in valid_times
                        ],
                        key=lambda row: (row["validTime"], row["partId"]),
                    ),
                    subset_sha256=subset_sha256,
                    acquisition_id=acquisition["acquisitionId"],
                    parsed_record_count=len(parsed_records),
                )
            except COPERNICUS_SHARD_DATA_ERRORS as error:
                blocked_shards.add((source, shard["shardId"]))
                failed_shard_count += 1
                print(
                    "Copernicus refresh shard failed safely: "
                    f"source={source}, shardIndex={shard_index}, "
                    f"errorType={type(error).__name__}.",
                    file=sys.stderr,
                    flush=True,
                )
                continue
            attempts = replace_stale_shard_attempt(
                attempts,
                source_attempt,
            )
            if parsed_records:
                new_acquisitions.append(acquisition)
                new_records.extend(parsed_records)
            completed_shard_count += 1

        acquisitions, records = merge_cache_evidence(
            existing,
            new_acquisitions,
            new_records,
            reference,
            target_identities,
        )
        (
            acquisitions,
            records,
            advisory_refs,
            advisory_missing,
            advisory_history_fill,
        ) = fill_bounded_advisory_history(
            required_pairs=list(registry["advisoryHistoryRequiredPairs"]),
            registry_targets=list(registry["targets"]),
            target_identities=target_identities,
            existing=existing,
            acquisitions=acquisitions,
            records=records,
            reference=reference,
            acquisition_at=acquisition_at,
            fixture_directory=args.fixture_directory,
            shadow_path=temporary / "advisory-history-checkpoint.json",
            continue_work=lambda: refresh_time_available(
                fixture_directory=args.fixture_directory,
            ),
        )

        if (
            completed_shard_count == 0
            and advisory_history_fill["newAcquisitionCount"] == 0
        ):
            print(
                "Copernicus cache refresh retained the original reusable package: "
                f"attemptedShardCount={attempted_shard_count}, "
                f"failedShardCount={failed_shard_count}, "
                f"advisoryHistoryStatus={advisory_history_fill['status']}, "
                f"advisoryHistoryMissingPairCount={len(advisory_missing)}."
            )
            return 0
        original_refs, original_missing, original_exclusions = (
            select_source_order_admissible_records(
            required_pairs,
            original_acquisitions,
            original_records,
            reference,
            authoritative_targets,
            list(source_stage["attempts"]),
            )
        )
        record_refs, missing, exclusions = select_source_order_admissible_records(
            required_pairs,
            acquisitions,
            records,
            reference,
            authoritative_targets,
            attempts,
        )
        original_missing_keys = {
            (row["partId"], row["validTime"]) for row in original_missing
        }
        missing_keys = {(row["partId"], row["validTime"]) for row in missing}
        original_exclusion_ids = {
            row["recordId"] for row in original_exclusions
        }
        exclusion_ids = {row["recordId"] for row in exclusions}
        if (
            not missing_keys.issubset(original_missing_keys)
            or not exclusion_ids.issubset(original_exclusion_ids)
        ):
            raise RuntimeError("Copernicus refresh would degrade operational availability")
        if len(original_refs) + len(original_missing) != len(required_pairs):
            raise RuntimeError("Original Copernicus refresh partition is incomplete")

        args.shadow.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix=".copernicus-refresh-candidate-",
            dir=args.shadow.parent,
        ) as raw_candidate_dir:
            candidate_dir = Path(raw_candidate_dir)
            candidate_shadow_path = candidate_dir / args.shadow.name
            candidate_stage_path = candidate_dir / args.source_stage.name
            if missing:
                candidate_shadow = atomic_write_shadow_checkpoint(
                    candidate_shadow_path,
                    acquisitions=acquisitions,
                    records=records,
                    updated_at=acquisition_at,
                    target_identities=target_identities,
                )
            else:
                collection = make_coverage_collection(
                    production_reference_at=reference,
                    target_registry_sha256=registry["targetRegistrySha256"],
                    dmi_current_input_sha256=registry["dmiCurrentInputSha256"],
                    required_pairs=required_pairs,
                    record_refs=record_refs,
                    sealed_at=acquisition_at,
                    advisory_history_required_pairs=registry[
                        "advisoryHistoryRequiredPairs"
                    ],
                    advisory_history_record_refs=advisory_refs,
                )
                candidate_shadow = atomic_write_shadow(
                    candidate_shadow_path,
                    acquisitions=acquisitions,
                    records=records,
                    collection=collection,
                    updated_at=acquisition_at,
                    target_identities=target_identities,
                )
            candidate_shadow_sha256 = file_sha256(candidate_shadow_path)
            if missing:
                candidate_stage = build_source_stage_progress(
                    registry=registry,
                    shadow=candidate_shadow,
                    target_identities=target_identities,
                    shadow_sha256=candidate_shadow_sha256,
                    attempts=attempts,
                    updated_at=acquisition_at,
                )
                atomic_write_source_stage_progress(
                    candidate_stage_path,
                    candidate_stage,
                    registry=registry,
                    shadow=candidate_shadow,
                    target_identities=target_identities,
                    shadow_sha256=candidate_shadow_sha256,
                )
            else:
                candidate_stage = build_source_stage(
                    registry=registry,
                    shadow=candidate_shadow,
                    target_identities=target_identities,
                    shadow_sha256=candidate_shadow_sha256,
                    attempts=attempts,
                    sealed_at=acquisition_at,
                )
                atomic_write_source_stage(
                    candidate_stage_path,
                    candidate_stage,
                    registry=registry,
                    shadow=candidate_shadow,
                    target_identities=target_identities,
                    shadow_sha256=candidate_shadow_sha256,
                )
            backup_shadow = candidate_dir / "original-shadow.json"
            backup_stage = candidate_dir / "original-source-stage.json"
            shutil.copy2(args.shadow, backup_shadow)
            shutil.copy2(args.source_stage, backup_stage)
            try:
                os.replace(candidate_shadow_path, args.shadow)
                os.replace(candidate_stage_path, args.source_stage)
            except Exception:
                os.replace(backup_shadow, args.shadow)
                os.replace(backup_stage, args.source_stage)
                raise
        print(
            "Copernicus cache refresh completed: "
            f"attemptedShardCount={attempted_shard_count}, "
            f"completedShardCount={completed_shard_count}, "
            f"failedShardCount={failed_shard_count}, "
            f"newRecordCount={len(new_records)}, "
            f"advisoryHistoryStatus={advisory_history_fill['status']}, "
            f"advisoryHistoryAcquiredPairCount="
            f"{advisory_history_fill['acquiredPairCount']}, "
            f"advisoryHistoryMissingPairCount={len(advisory_missing)}."
        )
        return 0
    finally:
        shutil.rmtree(temporary, ignore_errors=True)


def main() -> int:
    args = arguments()
    registry = validate_target_registry(json.loads(args.targets.read_text(encoding="utf-8")))
    reference = selected_reference(args.at, registry)
    acquisition_at = parse_time(args.acquisition_at, "acquisition time") if args.acquisition_at else datetime.now(timezone.utc)
    if abs((acquisition_at - reference).total_seconds()) > FUTURE_ACQUISITION_FRESHNESS_HOURS * 3600:
        raise RuntimeError("Actual Copernicus acquisition clock is outside four hours of the locked production reference")

    authoritative_targets = load_targets(args.authoritative_targets)
    authoritative_by_part = {row["partId"]: row for row in authoritative_targets}
    registry_targets = registry["targets"]
    if registry["targetRegistrySha256"] != target_fingerprint(authoritative_targets):
        raise RuntimeError("Copernicus target registry no longer matches the full central target registry")
    for target in registry_targets:
        authoritative = authoritative_by_part.get(target["partId"])
        if authoritative is None or target_fingerprint([target]) != target_fingerprint([authoritative]):
            raise RuntimeError("Copernicus target registry contains a changed central target identity")
    target_identities = {row["partId"]: row for row in authoritative_targets}
    operational_contract = registry["schemaVersion"] == 3
    required_pairs = (
        registry["operationalRequiredPairs"]
        if operational_contract
        else registry["requiredPairs"]
    )
    advisory_history_required_pairs = (
        registry["advisoryHistoryRequiredPairs"] if operational_contract else []
    )

    shadow_was_present = args.shadow.exists() and args.shadow.stat().st_size > 0
    shadow_recovered = False
    try:
        existing = load_shadow(args.shadow, reference, target_identities)
    except (
        AttributeError,
        UnicodeError,
        json.JSONDecodeError,
        TypeError,
        ValueError,
        RuntimeError,
    ):
        quarantine_invalid_private_file(args.shadow, "shadow")
        existing = atomic_write_shadow_checkpoint(
            args.shadow,
            acquisitions=[],
            records=[],
            updated_at=acquisition_at,
            target_identities=target_identities,
        )
        shadow_recovered = True
    existing_acquisitions, existing_records = merge_cache_evidence(existing, [], [], reference, target_identities)

    source_attempts: list[dict[str, Any]] = []
    reusable_stage: dict[str, Any] | None = None
    if (
        operational_contract
        and args.source_stage.exists()
        and args.source_stage.stat().st_size > 0
    ):
        if shadow_recovered or not shadow_was_present:
            quarantine_invalid_private_file(args.source_stage, "source stage")
        else:
            try:
                reusable_stage = validate_reusable_source_stage(
                    json.loads(args.source_stage.read_text(encoding="utf-8")),
                    registry=registry,
                    shadow=existing,
                    target_identities=target_identities,
                    shadow_sha256=file_sha256(args.shadow),
                    allow_rebase=not args.refresh_only,
                )
                source_attempts = list(reusable_stage["attempts"])
            except (
                KeyError,
                UnicodeError,
                json.JSONDecodeError,
                TypeError,
                ValueError,
                RuntimeError,
            ) as error:
                if args.refresh_only:
                    raise RuntimeError(
                        "Copernicus refresh-only requires the exact reusable source stage"
                    ) from error
                quarantine_invalid_private_file(args.source_stage, "source stage")
    if operational_contract:
        existing_refs, initial_missing, _ = select_source_order_admissible_records(
            required_pairs,
            existing_acquisitions,
            existing_records,
            reference,
            authoritative_targets,
            source_attempts,
        )
    else:
        existing_refs, initial_missing = select_required_records(
            required_pairs, existing_acquisitions, existing_records, reference,
        )
    initial_missing_keys = {
        (row["partId"], row["validTime"]) for row in initial_missing
    }
    remaining = set(initial_missing_keys)
    if args.refresh_only:
        if not operational_contract:
            raise RuntimeError("Copernicus refresh-only requires the operational registry")
        if reusable_stage is None:
            raise RuntimeError("Copernicus refresh-only requires a source-stage sidecar")
        return run_bounded_operational_refresh(
            args=args,
            registry=registry,
            reference=reference,
            acquisition_at=acquisition_at,
            authoritative_targets=authoritative_targets,
            target_identities=target_identities,
            existing=existing,
            source_stage=reusable_stage,
        )
    if operational_contract:
        # Persist a target/DMI/shadow-bound zero-attempt stage before credentials,
        # network or the first shard. A provider outage can therefore hand the
        # complete honest residual to Open-Meteo without claiming exhaustion.
        existing = persist_source_stage_progress(
            shadow_path=args.shadow,
            source_stage_path=args.source_stage,
            registry=registry,
            target_identities=target_identities,
            acquisitions=existing_acquisitions,
            records=existing_records,
            attempts=source_attempts,
            updated_at=acquisition_at,
            shadow_changed=False,
        )
    attempted_pairs_by_source = {
        product["source"]: current_reference_attempt_pairs(
            source_attempts,
            source=product["source"],
            reference=reference,
        )
        for product in PRODUCTS
    }

    target_by_id = {str(row["partId"]): row for row in registry_targets}
    baltic_product = next(
        row for row in PRODUCTS if row["source"] == "copernicus-baltic-nemo"
    )
    if remaining and not args.fixture_directory:
        if not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME") or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"):
            raise RuntimeError("Copernicus credentials are required through environment secrets")

    temporary = Path(tempfile.mkdtemp(prefix="ravradar-copernicus-range-"))
    new_acquisitions: list[dict[str, Any]] = []
    new_records: list[dict[str, Any]] = []
    product_reports: list[dict[str, Any]] = []
    failed_operational_shards = 0
    try:
        for product in PRODUCTS:
            # Stable shard membership belongs to the full authoritative register,
            # not to this hour's changing subset of DMI gaps. Query only gaps below.
            source_targets = [row for row in authoritative_targets if eligible_target(row, product)]
            source_shards = spatial_shards(source_targets, product)
            product_record_count = 0
            executed_shards = 0
            surface_count = 0
            for shard_index, shard in enumerate(source_shards):
                source_required_pairs = remaining
                if product["source"] == "copernicus-nws-amm15":
                    # AMM15 may only run for an in-domain pair after Baltic has
                    # completed an exact attempt for this production reference.
                    # A failed Baltic shard remains honest IN_PROGRESS evidence;
                    # it can never be converted into source-order exhaustion.
                    source_required_pairs = {
                        pair
                        for pair in source_required_pairs
                        if not eligible_target(target_by_id[pair[0]], baltic_product)
                        or pair in attempted_pairs_by_source["copernicus-baltic-nemo"]
                    }
                source_required_pairs = (
                    source_required_pairs
                    - attempted_pairs_by_source[product["source"]]
                )
                shard_part_ids = {
                    row["partId"] for row in shard["targets"]
                }
                critical_shard_pairs = {
                    pair for pair in source_required_pairs
                    if pair[0] in shard_part_ids
                }
                if not critical_shard_pairs:
                    continue
                times_by_part: dict[str, list[datetime]] = {}
                for target in shard["targets"]:
                    times = sorted(
                        parse_time(valid_time, "required pair time")
                        for part_id, valid_time in source_required_pairs
                        if part_id == target["partId"]
                    )
                    if times:
                        times_by_part[target["partId"]] = times
                if not times_by_part:
                    continue
                require_operational_time_budget()
                executed_shards += 1
                shard_targets = [row for row in shard["targets"] if row["partId"] in times_by_part]
                native_times = sorted({value for values in times_by_part.values() for value in values})
                start, end = native_times[0], native_times[-1]
                try:
                    subset_sha256, raw_records = acquire_shard_rows(
                        product=product,
                        shard_targets=shard_targets,
                        times_by_part=times_by_part,
                        fixture_directory=args.fixture_directory,
                        temporary=temporary,
                        shard_index=shard_index,
                    )
                    acquisition = make_acquisition(
                        source=product["source"],
                        acquisition_at=acquisition_at,
                        request_start_at=start,
                        request_end_at=end,
                        targets=shard_targets,
                        native_valid_times=native_times,
                        subset_sha256=subset_sha256,
                        record_count=len(raw_records),
                        request_contract_id=REQUEST_CONTRACT_ID,
                    )
                    records = [
                        make_record(
                            row,
                            acquisition,
                            target_identities[row["partId"]],
                        )
                        for row in raw_records
                    ]
                    source_attempt = make_source_attempt(
                        production_reference_at=reference,
                        acquisition_at=acquisition_at,
                        product=product,
                        shard_id=shard["shardId"],
                        target_part_ids=[row["partId"] for row in shard_targets],
                        requested_pairs=sorted(
                            [
                                {"partId": part_id, "validTime": utc_iso(valid_time)}
                                for part_id, valid_times in times_by_part.items()
                                for valid_time in valid_times
                            ],
                            key=lambda row: (row["validTime"], row["partId"]),
                        ),
                        subset_sha256=subset_sha256,
                        acquisition_id=acquisition["acquisitionId"],
                        parsed_record_count=len(records),
                    )
                except COPERNICUS_SHARD_DATA_ERRORS as error:
                    # A provider/file/parser failure is local to this shard.
                    # Never manufacture a COMPLETE attempt; later shards and
                    # products may still produce independently valid evidence.
                    failed_operational_shards += 1
                    print(
                        "Copernicus shard failed safely: "
                        f"source={product['source']}, shardIndex={shard_index}, "
                        f"errorType={type(error).__name__}.",
                        file=sys.stderr,
                        flush=True,
                    )
                    continue
                source_attempts = replace_stale_shard_attempt(
                    source_attempts,
                    source_attempt,
                )
                attempted_pairs_by_source[product["source"]].update({
                    (pair["partId"], pair["validTime"])
                    for pair in source_attempt["requestedPairs"]
                })
                if records:
                    new_acquisitions.append(acquisition)
                    new_records.extend(records)
                checkpoint_acquisitions, checkpoint_records = merge_cache_evidence(
                    existing,
                    new_acquisitions,
                    new_records,
                    reference,
                    target_identities,
                )
                if operational_contract:
                    _, checkpoint_missing, _ = select_source_order_admissible_records(
                        required_pairs,
                        checkpoint_acquisitions,
                        checkpoint_records,
                        reference,
                        authoritative_targets,
                        source_attempts,
                    )
                else:
                    _, checkpoint_missing = select_required_records(
                        required_pairs,
                        checkpoint_acquisitions,
                        checkpoint_records,
                        reference,
                    )
                if operational_contract:
                    persist_source_stage_progress(
                        shadow_path=args.shadow,
                        source_stage_path=args.source_stage,
                        registry=registry,
                        target_identities=target_identities,
                        acquisitions=checkpoint_acquisitions,
                        records=checkpoint_records,
                        attempts=source_attempts,
                        updated_at=acquisition_at,
                        shadow_changed=bool(records),
                    )
                elif records:
                    atomic_write_shadow_checkpoint(
                        args.shadow,
                        acquisitions=checkpoint_acquisitions,
                        records=checkpoint_records,
                        updated_at=acquisition_at,
                        target_identities=target_identities,
                    )
                remaining = {
                    (row["partId"], row["validTime"])
                    for row in checkpoint_missing
                }
                print(
                    "Copernicus shard checkpoint: "
                    f"verifiedOperationalPairs={len(required_pairs) - len(remaining)}, "
                    f"remainingOperationalPairs={len(remaining)}, "
                    f"completedSourceAttempts={len(source_attempts)}."
                )
                require_operational_time_budget()
                product_record_count += len(records)
                surface_count += sum(row["layerQuality"] == "surface-only" for row in records)
            product_reports.append({
                "source": product["source"],
                "productId": product["productId"],
                "datasetId": product["datasetId"],
                "datasetVersion": product["datasetVersion"],
                "spatialShardPolicyId": SPATIAL_SHARD_POLICY_ID,
                "executedShardCount": executed_shards,
                "verifiedPairCount": product_record_count,
                "surfaceOnlyCount": surface_count,
            })
    finally:
        shutil.rmtree(temporary, ignore_errors=True)

    acquisitions, records = merge_cache_evidence(
        existing, new_acquisitions, new_records, reference, target_identities,
    )
    if operational_contract:
        record_refs, missing, _ = select_source_order_admissible_records(
            required_pairs,
            acquisitions,
            records,
            reference,
            authoritative_targets,
            source_attempts,
        )
    else:
        record_refs, missing = select_required_records(
            required_pairs, acquisitions, records, reference,
        )
    if failed_operational_shards:
        if operational_contract:
            persist_source_stage_progress(
                shadow_path=args.shadow,
                source_stage_path=args.source_stage,
                registry=registry,
                target_identities=target_identities,
                acquisitions=acquisitions,
                records=records,
                attempts=source_attempts,
                updated_at=acquisition_at,
                shadow_changed=bool(new_records),
            )
            print(
                "Copernicus operational shards remain retryable: "
                f"failedShardCount={failed_operational_shards}.",
                file=sys.stderr,
                flush=True,
            )
            raise CopernicusOperationalBudgetReached(
                "One or more Copernicus shards failed after valid progress was saved"
            )
        raise RuntimeError(
            "One or more Copernicus shards failed; validated shard checkpoints were preserved"
        )
    if missing:
        if operational_contract:
            # Operational residual is handed to the next provider immediately.
            # Advisory -48h history is never allowed to delay regional/OM
            # closure and may be maintained only after that critical chain.
            (
                advisory_history_record_refs,
                advisory_history_missing,
                advisory_history_fill,
            ) = select_primary_advisory_history(
                required_pairs=advisory_history_required_pairs,
                acquisitions=acquisitions,
                records=records,
                reference=reference,
            )
            checkpoint = atomic_write_shadow_checkpoint(
                args.shadow,
                acquisitions=acquisitions,
                records=records,
                updated_at=acquisition_at,
                target_identities=target_identities,
            )
            checkpoint_sha256 = file_sha256(args.shadow)
            source_stage = build_source_stage(
                registry=registry,
                shadow=checkpoint,
                target_identities=target_identities,
                shadow_sha256=checkpoint_sha256,
                attempts=source_attempts,
                sealed_at=acquisition_at,
            )
            atomic_write_source_stage(
                args.source_stage,
                source_stage,
                registry=registry,
                shadow=checkpoint,
                target_identities=target_identities,
                shadow_sha256=checkpoint_sha256,
            )
            safe_stage = safe_source_stage_summary(source_stage)
            report = {
                "schemaVersion": 1,
                **safe_stage,
                "advisoryHistoryFill": advisory_history_fill,
            }
            no_credentials_in_report(report)
            atomic_write_text(
                args.report,
                json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
            )
            lines = [
                "RavRadar privat Copernicus-kildeled",
                f"Produktionsreference: {registry['productionReferenceAt']}",
                f"Valgte Copernicus-par: {safe_stage['selectedRecordRefCount']}/{safe_stage['requiredPairCount']}",
                f"Rester efter alle relevante Copernicus-kilder: {safe_stage['missingPairCount']}",
                "Afgrænset historikopfyldning: "
                f"{advisory_history_fill['status']} · "
                f"nye par {advisory_history_fill['acquiredPairCount']} · "
                f"rester {advisory_history_fill['missingPairCount']}",
                "Kildeled: READY",
                "Historiksyntese/interpolation/hold: nej",
            ]
            atomic_write_text(args.summary, "\n".join(lines) + "\n")
            print("\n".join(lines))
            return 0
        raise RuntimeError(
            "Copernicus operational acquisition is incomplete for "
            f"{len(missing)}/{len(required_pairs)} exact DMI-gap pairs in target..+117"
        )
    if operational_contract:
        (
            advisory_history_record_refs,
            advisory_history_missing,
            advisory_history_fill,
        ) = select_primary_advisory_history(
            required_pairs=advisory_history_required_pairs,
            acquisitions=acquisitions,
            records=records,
            reference=reference,
        )
    else:
        advisory_history_record_refs, advisory_history_missing = select_required_records(
            advisory_history_required_pairs, acquisitions, records, reference,
        )
        advisory_history_fill = {
            "status": "NOT_APPLICABLE",
            "requiredPairCount": 0,
            "initialAvailablePairCount": 0,
            "acquiredPairCount": 0,
            "availablePairCount": 0,
            "missingPairCount": 0,
            "attemptedShardCount": 0,
            "completedShardCount": 0,
            "failedShardCount": 0,
            "boundedWorkRemaining": False,
            "budgetReached": False,
            "exhaustionAttested": False,
            "regionalHistoryUsed": False,
            "interpolationCarryOrLoanUsed": False,
            "newAcquisitionCount": 0,
        }
    collection = make_coverage_collection(
        production_reference_at=reference,
        target_registry_sha256=registry["targetRegistrySha256"],
        dmi_current_input_sha256=registry["dmiCurrentInputSha256"],
        required_pairs=required_pairs,
        record_refs=record_refs,
        sealed_at=acquisition_at,
        advisory_history_required_pairs=(
            advisory_history_required_pairs if operational_contract else None
        ),
        advisory_history_record_refs=(
            advisory_history_record_refs if operational_contract else None
        ),
    )
    shadow = atomic_write_shadow(
        args.shadow,
        acquisitions=acquisitions,
        records=records,
        collection=collection,
        updated_at=acquisition_at,
        target_identities=target_identities,
    )
    if operational_contract:
        source_stage = build_source_stage(
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=file_sha256(args.shadow),
            attempts=source_attempts,
            sealed_at=acquisition_at,
        )
        atomic_write_source_stage(
            args.source_stage,
            source_stage,
            registry=registry,
            shadow=shadow,
            target_identities=target_identities,
            shadow_sha256=file_sha256(args.shadow),
        )

    source_by_acquisition = {row["acquisitionId"]: row["source"] for row in acquisitions}
    selected_by_source = {source: 0 for source in source_by_acquisition.values()}
    selected_refs = [*record_refs, *advisory_history_record_refs]
    for ref in selected_refs:
        source = source_by_acquisition[ref["acquisitionId"]]
        selected_by_source[source] = selected_by_source.get(source, 0) + 1
    existing_ids = {row["recordId"] for row in existing_records}
    reused_history_count = sum(ref["recordId"] in existing_ids for ref in advisory_history_record_refs)
    if not operational_contract:
        reused_history_count = sum(
            ref["recordId"] in existing_ids and parse_time(ref["validTime"], "ref time") < reference
            for ref in record_refs
        )
    report = {
        "schemaVersion": 2,
        "generatedAt": utc_iso(acquisition_at),
        "productionReferenceAt": utc_iso(reference),
        "rangeStartAt": registry["rangeStartAt"],
        "rangeEndAt": registry["rangeEndAt"],
        "source": "authenticated-copernicus-marine-toolbox" if not args.fixture_directory else "local-fixture",
        "toolboxVersion": importlib.metadata.version("copernicusmarine"),
        "requestContractId": REQUEST_CONTRACT_ID,
        "selectionPolicyId": SELECTION_POLICY_ID,
        "spatialShardPolicyId": SPATIAL_SHARD_POLICY_ID,
        "componentPair": COMPONENT_PAIR,
        "interpolation": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "credentialsIncluded": False,
        "rawVectorsIncluded": False,
        "targetCount": registry["targetCount"],
        "requiredPairCount": len(required_pairs),
        "verifiedPairCount": len(record_refs),
        "missingPairCount": 0,
        "operationalSealComplete": True,
        "advisoryHistoryRequiredPairCount": len(advisory_history_required_pairs),
        "advisoryHistoryAvailablePairCount": len(advisory_history_record_refs),
        "advisoryHistoryMissingPairCount": len(advisory_history_missing),
        "advisoryHistoryComplete": len(advisory_history_missing) == 0,
        "historySyntheticPairCount": 0,
        "reusedHistoricalPairCount": reused_history_count,
        "newAcquisitionCount": (
            len(new_acquisitions) + advisory_history_fill["newAcquisitionCount"]
        ),
        "advisoryHistoryFill": advisory_history_fill,
        "selectedPairsBySource": dict(sorted(selected_by_source.items())),
        "cacheRecordCount": len(records),
        "cacheAcquisitionCount": len(acquisitions),
        "completeCoverageCollectionCount": len(shadow["collections"]),
        "shadowEvidence": safe_shadow_summary(shadow),
        "products": product_reports,
    }
    no_credentials_in_report(report)
    atomic_write_text(args.report, json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n")
    lines = [
        "RavRadar privat Copernicus-strømrange",
        f"Produktionsreference: {report['productionReferenceAt']}",
        f"Eksakte operationelle DMI-gappar: {report['verifiedPairCount']}/{report['requiredPairCount']}",
        "Målt rådgivende historik: "
        f"{report['advisoryHistoryAvailablePairCount']}/"
        f"{report['advisoryHistoryRequiredPairCount']}",
        f"Genbrugte målte historiske par: {report['reusedHistoricalPairCount']}",
        "Afgrænset historikopfyldning: "
        f"{report['advisoryHistoryFill']['status']} · "
        f"nye par {report['advisoryHistoryFill']['acquiredPairCount']} · "
        f"rester {report['advisoryHistoryFill']['missingPairCount']}",
        f"Nye komplette acquisitions: {report['newAcquisitionCount']}",
        "Coverage-seal: OPERATIONAL_COMPLETE" if operational_contract else "Coverage-seal: COMPLETE",
        "Historiksyntese/interpolation/hold: nej",
    ]
    atomic_write_text(args.summary, "\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CopernicusOperationalBudgetReached:
        print(
            "Copernicus bounded progress was saved at a shard boundary.",
            file=sys.stderr,
        )
        raise SystemExit(BOUNDED_PROGRESS_EXIT_CODE)
    except Exception as error:
        print(f"Copernicus pilot failed: {error}", file=sys.stderr)
        raise SystemExit(1)
