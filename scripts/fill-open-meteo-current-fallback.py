#!/usr/bin/env python3
"""Fill only the exact current residual left by DMI/Copernicus/regional DMI."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from http.client import IncompleteRead
import json
import math
import os
from pathlib import Path
import re
import time
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from lib.copernicus_current import (
    canonical_sha256,
    file_sha256,
    load_targets,
    required_pairs_sha256,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_current_source_stage import (
    SOURCE_STAGE_PROGRESS_STATUS,
    SOURCE_STAGE_STATUS,
    select_source_order_admissible_records,
    validate_reusable_source_stage,
)
from lib.current_field_shadow import load_document as load_regional_shadow
from lib.current_operational_closure import build_regional_residual_plan
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    current_attestation_authorization_from_operational_ledger,
)
from lib.open_meteo_current_fallback import (
    MAXIMUM_DISTANCE_KM,
    MODEL,
    OpenMeteoCurrentFallbackError,
    build_document,
    build_record,
    merge_records,
    reusable_records,
    safe_projection,
)



ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_REGISTRY = ROOT / ".cache/copernicus-current-targets.json"
DEFAULT_COPERNICUS = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_SOURCE_STAGE = ROOT / ".cache/copernicus-current-source-stage.json"
DEFAULT_REGIONAL = ROOT / ".cache/current-field-shadow.json"
DEFAULT_POLICY = ROOT / "data/current-regional-proxy-policy.json"
DEFAULT_OUTPUT = ROOT / ".cache/open-meteo-current-fallback.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/open-meteo-current-fallback.json"
DEFAULT_BASE_URL = "https://marine-api.open-meteo.com/v1/marine"
BATCH_SIZE = 50
MAX_BATCH_ATTEMPTS = 3
PROACTIVE_REFRESH_AGE_HOURS = 2
SAFE_CAUSE_CODE = re.compile(r"^[A-Z][A-Z0-9_]{0,127}$")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--copernicus", type=Path, default=DEFAULT_COPERNICUS)
    parser.add_argument("--source-stage", type=Path, default=DEFAULT_SOURCE_STAGE)
    parser.add_argument("--regional", type=Path, default=DEFAULT_REGIONAL)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--at", required=True)
    parser.add_argument("--timeout-seconds", type=int, default=45)
    parser.add_argument("--runtime-seconds", type=int, default=240)
    return parser.parse_args()


def read_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, UnicodeError, json.JSONDecodeError):
        raise RuntimeError("OPEN_METEO_INPUT_INVALID") from None
    if not isinstance(value, dict):
        raise RuntimeError("OPEN_METEO_INPUT_INVALID")
    return value


def read_optional_progress(path: Path) -> tuple[dict[str, Any] | None, str]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, "absent"
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None, "invalid"
    return (value, "present") if isinstance(value, dict) else (None, "invalid")


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def export_github_outputs(values: dict[str, int | str | bool]) -> None:
    output_path = str(os.environ.get("GITHUB_OUTPUT") or "").strip()
    if not output_path:
        return
    lines = []
    for key, value in values.items():
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", key):
            raise RuntimeError("OPEN_METEO_OUTPUT_NAME_INVALID")
        rendered = str(value).lower() if isinstance(value, bool) else str(value)
        if "\n" in rendered or "\r" in rendered:
            raise RuntimeError("OPEN_METEO_OUTPUT_VALUE_INVALID")
        lines.append(f"{key}={rendered}")
    try:
        with Path(output_path).open("a", encoding="utf-8", newline="\n") as handle:
            handle.write("\n".join(lines) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
    except OSError:
        raise RuntimeError("OPEN_METEO_OUTPUT_WRITE_FAILED") from None


def canonical_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def exact_time(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None
    if parsed.minute or parsed.second or parsed.microsecond:
        return None
    return parsed.strftime("%Y-%m-%dT%H:00:00Z")


def residual_plan_error_code(error: BaseException) -> str:
    cause_code = getattr(error, "cause_code", None)
    if isinstance(cause_code, str) and SAFE_CAUSE_CODE.fullmatch(cause_code):
        return f"OPEN_METEO_RESIDUAL_PLAN_INVALID_{cause_code}"
    return "OPEN_METEO_RESIDUAL_PLAN_INVALID"


def point(value: Any) -> list[float] | None:
    if not isinstance(value, list) or len(value) != 2:
        return None
    if any(isinstance(item, bool) or not isinstance(item, (int, float)) or not math.isfinite(item) for item in value):
        return None
    return [float(value[0]), float(value[1])]


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (*first, *second))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    term = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(term), math.sqrt(max(0.0, 1 - term)))


def request_json(url: str, timeout_seconds: int, deadline: float) -> Any:
    remaining = deadline - time.monotonic()
    if remaining <= 1:
        raise RuntimeError("OPEN_METEO_RUNTIME_BUDGET_REACHED")
    request = Request(url, headers={"User-Agent": "RavRadar/4 Open-Meteo current fallback"})
    try:
        with urlopen(
            request, timeout=min(timeout_seconds, max(1, remaining)),
        ) as response:
            if response.status != 200:
                raise RuntimeError("OPEN_METEO_HTTP_INVALID")
            return json.loads(response.read().decode("utf-8"))
    except (
        HTTPError,
        URLError,
        TimeoutError,
        OSError,
        IncompleteRead,
        UnicodeError,
        json.JSONDecodeError,
    ) as error:
        raise RuntimeError("OPEN_METEO_REQUEST_FAILED") from error


def residual_plan(*, targets: list[dict[str, Any]], dmi: dict[str, Any],
                   registry: dict[str, Any], copernicus: dict[str, Any],
                   source_stage: dict[str, Any], regional: dict[str, Any],
                   policy: dict[str, Any], reference: str,
                   copernicus_path: Path, dmi_path: Path) -> dict[str, Any]:
    target_map = {row["partId"]: row for row in targets}
    registry = validate_target_registry(registry)
    if file_sha256(dmi_path) != registry.get("dmiCurrentInputSha256"):
        raise RuntimeError("OPEN_METEO_DMI_BINDING_INVALID")
    cache = validate_shadow(copernicus, target_map, require_collection=False)
    stage = validate_reusable_source_stage(
        source_stage,
        registry=registry,
        shadow=cache,
        target_identities=target_map,
        shadow_sha256=file_sha256(copernicus_path),
        allow_rebase=False,
    )
    if stage.get("status") not in {
        SOURCE_STAGE_STATUS,
        SOURCE_STAGE_PROGRESS_STATUS,
    }:
        raise RuntimeError("OPEN_METEO_SOURCE_STAGE_INVALID")
    if stage.get("productionReferenceAt") != reference:
        raise RuntimeError("OPEN_METEO_SOURCE_STAGE_TARGET_MISMATCH")
    ledger = ((dmi.get("diagnostics") or {}).get("currentOperationalLedger"))
    if not isinstance(ledger, dict):
        raise RuntimeError("OPEN_METEO_DMI_LEDGER_MISSING")
    allowed_assets, allowed_retained_pair_sources = (
        current_attestation_authorization_from_operational_ledger(ledger)
    )
    attestation = canonical_verified_part_current_attestation(
        dmi,
        targets,
        reference,
        registry.get("operationalRangeEndAt"),
        allowed_assets,
        allowed_retained_pair_sources,
    )
    _, copernicus_residual, _ = select_source_order_admissible_records(
        registry["operationalRequiredPairs"],
        list(cache.get("acquisitions") or []),
        list(cache.get("records") or []),
        datetime.fromisoformat(reference.replace("Z", "+00:00")),
        targets,
        list(stage.get("attempts") or []),
    )
    copernicus_residual = sorted(
        copernicus_residual,
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if (
        stage.get("missingPairCount") != len(copernicus_residual)
        or stage.get("missingPairsSha256")
            != required_pairs_sha256(copernicus_residual)
    ):
        raise RuntimeError("OPEN_METEO_SOURCE_STAGE_INVALID")
    try:
        plan = build_regional_residual_plan(
            residual_pairs=copernicus_residual,
            regional_policy=policy,
            targets=targets,
            regional_shadow=regional,
            dmi_ledger=ledger,
            dmi_attestation=attestation,
            locked_reference=reference,
        )
    except (KeyError, TypeError, ValueError, RuntimeError) as error:
        raise RuntimeError(residual_plan_error_code(error)) from None
    result = plan["openMeteoRequiredPairs"]
    if len({(row["partId"], row["validTime"]) for row in result}) != len(result):
        raise RuntimeError("OPEN_METEO_RESIDUAL_DUPLICATE")
    regional_diagnostics = plan.get("regionalDiagnostics", {})
    if not isinstance(regional_diagnostics, dict):
        raise RuntimeError("OPEN_METEO_RESIDUAL_PLAN_INVALID")
    return {
        "requiredPairs": result,
        "sourceStageStatus": stage["status"],
        "sourceStageSha256": canonical_sha256(stage),
        "boundedProgressAccepted": (
            stage["status"] == SOURCE_STAGE_PROGRESS_STATUS
        ),
        "regionalEvidenceSha256": canonical_sha256(plan["regionalPrivate"]),
        "regionalDiagnostics": regional_diagnostics,
    }


def fetch_records(
    required: list[dict[str, str]],
    targets: dict[str, dict[str, Any]],
    acquired_at: str | None,
    timeout_seconds: int,
    runtime_seconds: int,
    *,
    checkpoint: Callable[[list[dict[str, Any]], dict[str, int | bool]], None]
        | None = None,
    diagnostics: dict[str, int | bool] | None = None,
    deadline_monotonic: float | None = None,
    preserve_input_order: bool = False,
) -> list[dict[str, Any]]:
    if timeout_seconds < 1 or timeout_seconds > 120:
        raise RuntimeError("OPEN_METEO_TIMEOUT_BUDGET_INVALID")
    if runtime_seconds < 15 or runtime_seconds > 900:
        raise RuntimeError("OPEN_METEO_RUNTIME_BUDGET_INVALID")
    if not isinstance(preserve_input_order, bool):
        raise RuntimeError("OPEN_METEO_BATCH_ORDER_INVALID")
    if deadline_monotonic is not None and (
        isinstance(deadline_monotonic, bool)
        or not isinstance(deadline_monotonic, (int, float))
        or not math.isfinite(deadline_monotonic)
    ):
        raise RuntimeError("OPEN_METEO_RUNTIME_DEADLINE_INVALID")
    required_by_part: dict[str, set[str]] = {}
    for row in required:
        required_by_part.setdefault(row["partId"], set()).add(row["validTime"])
    part_ids = (
        list(required_by_part)
        if preserve_input_order
        else sorted(required_by_part)
    )
    batches = [
        part_ids[start:start + BATCH_SIZE]
        for start in range(0, len(part_ids), BATCH_SIZE)
    ]
    stats: dict[str, int | bool] = {
        "batchCount": len(batches),
        "batchAttemptCount": 0,
        "batchCompletedCount": 0,
        "batchUnresolvedCount": len(batches),
        "retryRoundCount": 0,
        "conflictPairCount": 0,
        "runtimeBudgetReached": False,
    }
    if diagnostics is not None:
        diagnostics.clear()
        diagnostics.update(stats)
    if not required:
        return []
    deadline = (
        float(deadline_monotonic)
        if deadline_monotonic is not None
        else time.monotonic() + runtime_seconds
    )
    base_url = os.environ.get("OPEN_METEO_MARINE_BASE_URL", DEFAULT_BASE_URL).strip()
    api_key = os.environ.get("OPEN_METEO_API_KEY", "").strip()
    start_hour = min(row["validTime"] for row in required).replace("Z", "")
    end_hour = max(row["validTime"] for row in required).replace("Z", "")
    candidates: list[dict[str, Any]] = []
    selected: list[dict[str, Any]] = []
    completed_batches: set[tuple[str, ...]] = set()
    pending = batches
    for attempt in range(MAX_BATCH_ATTEMPTS):
        if not pending:
            break
        if attempt:
            stats["retryRoundCount"] = attempt
        next_pending: list[list[str]] = []
        stop_for_budget = False
        for position, batch_ids in enumerate(pending):
            remaining = deadline - time.monotonic()
            batches_left = len(pending) - position
            if remaining <= batches_left + 1:
                stats["runtimeBudgetReached"] = True
                next_pending.extend(pending[position:])
                stop_for_budget = True
                break
            fair_timeout = min(
                timeout_seconds,
                max(1, int((remaining - 1) / batches_left)),
            )
            sampling_points = [
                point(targets[part_id].get("waterPoint"))
                for part_id in batch_ids
            ]
            if any(item is None for item in sampling_points):
                raise RuntimeError("OPEN_METEO_TARGET_POINT_INVALID")
            query = {
                "latitude": ",".join(
                    str(item[1]) for item in sampling_points if item is not None
                ),
                "longitude": ",".join(
                    str(item[0]) for item in sampling_points if item is not None
                ),
                "hourly": "ocean_current_velocity,ocean_current_direction",
                "wind_speed_unit": "ms",
                "timezone": "GMT",
                "start_hour": start_hour,
                "end_hour": end_hour,
                "cell_selection": "sea",
                "models": MODEL,
            }
            if api_key:
                query["apikey"] = api_key
            stats["batchAttemptCount"] = int(stats["batchAttemptCount"]) + 1
            try:
                response = request_json(
                    f"{base_url}?{urlencode(query)}", fair_timeout, deadline,
                )
            except RuntimeError as error:
                if str(error) == "OPEN_METEO_RUNTIME_BUDGET_REACHED":
                    stats["runtimeBudgetReached"] = True
                    next_pending.extend(pending[position:])
                    stop_for_budget = True
                    break
                if str(error) in {
                    "OPEN_METEO_HTTP_INVALID",
                    "OPEN_METEO_REQUEST_FAILED",
                }:
                    next_pending.append(batch_ids)
                    continue
                raise
            payloads = response if isinstance(response, list) else [response]
            if len(payloads) != len(batch_ids):
                next_pending.append(batch_ids)
                continue
            batch_acquired_at = acquired_at or canonical_now()
            batch_records: list[dict[str, Any]] = []
            for part_id, sampling, payload in zip(
                batch_ids, sampling_points, payloads
            ):
                if not isinstance(payload, dict) or sampling is None:
                    continue
                grid = point([payload.get("longitude"), payload.get("latitude")])
                hourly = payload.get("hourly")
                hourly_units = payload.get("hourly_units")
                if (
                    payload.get("utc_offset_seconds") != 0
                    or payload.get("timezone") != "GMT"
                    or not isinstance(hourly_units, dict)
                    or hourly_units.get("ocean_current_velocity") != "m/s"
                    or hourly_units.get("ocean_current_direction") != "°"
                ):
                    continue
                if (
                    grid is None
                    or not isinstance(hourly, dict)
                    or haversine_km(sampling, grid) > MAXIMUM_DISTANCE_KM
                ):
                    continue
                times = hourly.get("time")
                speeds = hourly.get("ocean_current_velocity")
                directions = hourly.get("ocean_current_direction")
                if (
                    not isinstance(times, list)
                    or not isinstance(speeds, list)
                    or not isinstance(directions, list)
                ):
                    continue
                normalized_times = [
                    exact_time(
                        f"{value}Z"
                        if isinstance(value, str) and not value.endswith("Z")
                        else value
                    )
                    for value in times
                ]
                if (
                    any(value is None for value in normalized_times)
                    or len(set(normalized_times)) != len(normalized_times)
                ):
                    continue
                index_by_time = {
                    value: index for index, value in enumerate(normalized_times)
                }
                try:
                    response_sha256 = canonical_sha256(payload)
                except (TypeError, ValueError, UnicodeError):
                    continue
                for valid_time in sorted(required_by_part[part_id]):
                    index = index_by_time.get(valid_time)
                    if (
                        index is None
                        or index >= len(speeds)
                        or index >= len(directions)
                    ):
                        continue
                    speed, direction = speeds[index], directions[index]
                    if (
                        isinstance(speed, bool)
                        or not isinstance(speed, (int, float))
                        or not math.isfinite(speed)
                        or speed < 0
                        or isinstance(direction, bool)
                        or not isinstance(direction, (int, float))
                        or not math.isfinite(direction)
                    ):
                        continue
                    try:
                        batch_records.append(build_record(
                            part_id=part_id,
                            valid_time=valid_time,
                            acquired_at=batch_acquired_at,
                            sampling_point=sampling,
                            grid_point=grid,
                            speed_mps=float(speed),
                            toward_direction_deg=float(direction),
                            source_response_sha256=response_sha256,
                        ))
                    except OpenMeteoCurrentFallbackError:
                        continue
            candidates.extend(batch_records)
            selected, conflicts = merge_records(candidates)
            stats["conflictPairCount"] = conflicts
            selected_keys = {
                (row["partId"], row["validTime"]) for row in selected
            }
            batch_keys = {
                (part_id, valid_time)
                for part_id in batch_ids
                for valid_time in required_by_part[part_id]
            }
            batch_identity = tuple(batch_ids)
            if batch_keys <= selected_keys:
                completed_batches.add(batch_identity)
            else:
                next_pending.append(batch_ids)
            if batch_records and checkpoint is not None:
                checkpoint(selected, dict(stats))
        pending = next_pending
        if stop_for_budget:
            break
    stats["batchCompletedCount"] = len(completed_batches)
    stats["batchUnresolvedCount"] = len(pending)
    if diagnostics is not None:
        diagnostics.clear()
        diagnostics.update(stats)
    return selected


def main() -> int:
    args = arguments()
    reference = exact_time(args.at)
    if reference is None or reference != args.at:
        raise RuntimeError("OPEN_METEO_REFERENCE_INVALID")
    targets = load_targets(args.targets)
    target_map = {row["partId"]: row for row in targets}
    dmi = read_object(args.dmi)
    registry = read_object(args.registry)
    copernicus = read_object(args.copernicus)
    source_stage = read_object(args.source_stage)
    regional = load_regional_shadow(args.regional)
    policy = read_object(args.policy)
    plan = residual_plan(
        targets=targets,
        dmi=dmi,
        registry=registry,
        copernicus=copernicus,
        source_stage=source_stage,
        regional=regional,
        policy=policy,
        reference=reference,
        copernicus_path=args.copernicus,
        dmi_path=args.dmi,
    )
    required = plan["requiredPairs"]
    previous, cache_reuse_status = read_optional_progress(args.output)
    retained: list[dict[str, Any]] = []
    if previous is not None:
        try:
            retained = reusable_records(
                previous,
                targets=targets,
                required_pairs=required,
                production_reference_at=reference,
                checkpointed_at=canonical_now(),
            )
        except OpenMeteoCurrentFallbackError:
            cache_reuse_status = "invalid"
            retained = []
        else:
            cache_reuse_status = "valid"

    latest_document: dict[str, Any] | None = None
    latest_conflict_count = 0
    critical_records: list[dict[str, Any]] = []
    refreshed_records: list[dict[str, Any]] = []

    def persist_checkpoint() -> None:
        nonlocal latest_document, latest_conflict_count
        selected, latest_conflict_count = merge_records(
            retained, critical_records, refreshed_records,
        )
        latest_document = build_document(
            targets=targets,
            required_pairs=required,
            records=selected,
            checkpointed_at=canonical_now(),
            production_reference_at=reference,
            copernicus_source_stage_status=plan["sourceStageStatus"],
            copernicus_source_stage_sha256=plan["sourceStageSha256"],
            copernicus_bounded_progress_accepted=plan[
                "boundedProgressAccepted"
            ],
            regional_evidence_sha256=plan["regionalEvidenceSha256"],
        )
        atomic_write(args.output, latest_document)
        atomic_write(args.report, safe_projection(latest_document))

    def checkpoint_critical(
        records: list[dict[str, Any]],
        _stats: dict[str, int | bool],
    ) -> None:
        nonlocal critical_records
        critical_records = list(records)
        persist_checkpoint()

    def checkpoint_refresh(
        records: list[dict[str, Any]],
        _stats: dict[str, int | bool],
    ) -> None:
        nonlocal refreshed_records
        refreshed_records = list(records)
        persist_checkpoint()

    # Rebind and persist retained rows before the first network request. A
    # later request failure therefore cannot erase already validated progress.
    persist_checkpoint()
    export_github_outputs({"checkpoint_written": True})
    retained_keys = {
        (row["partId"], row["validTime"]) for row in retained
    }
    fetch_required = [
        row for row in required
        if (row["partId"], row["validTime"]) not in retained_keys
    ]
    deadline_monotonic = time.monotonic() + args.runtime_seconds
    critical_diagnostics: dict[str, int | bool] = {}
    critical_records = fetch_records(
        fetch_required,
        target_map,
        None,
        args.timeout_seconds,
        args.runtime_seconds,
        checkpoint=checkpoint_critical,
        diagnostics=critical_diagnostics,
        deadline_monotonic=deadline_monotonic,
    )
    persist_checkpoint()
    critical_record_keys = {
        (row["partId"], row["validTime"]) for row in critical_records
    }
    critical_missing_pair_count = sum(
        (row["partId"], row["validTime"]) not in critical_record_keys
        for row in fetch_required
    )

    # Only after the critical queue is complete may the remaining budget
    # improve retained rows that are at least two reference-hours old. This
    # leaves a two-hour safety margin before the strict four-hour expiry while
    # avoiding a full Open-Meteo refresh every 15 minutes. Oldest acquisitions
    # go first. A missing/invalid refresh never removes the retained record.
    reference_instant = datetime.fromisoformat(
        reference.replace("Z", "+00:00")
    )
    refresh_cutoff = reference_instant - timedelta(
        hours=PROACTIVE_REFRESH_AGE_HOURS
    )
    refresh_required = [
        {"partId": row["partId"], "validTime": row["validTime"]}
        for row in sorted(
            [
                row for row in retained
                if datetime.fromisoformat(
                    row["acquiredAt"].replace("Z", "+00:00")
                ) <= refresh_cutoff
            ],
            key=lambda row: (
                datetime.fromisoformat(
                    row["acquiredAt"].replace("Z", "+00:00")
                ),
                row["validTime"],
                row["partId"],
            ),
        )
    ]
    refresh_diagnostics: dict[str, int | bool] = {
        "batchCount": 0,
        "batchAttemptCount": 0,
        "batchCompletedCount": 0,
        "batchUnresolvedCount": 0,
        "retryRoundCount": 0,
        "conflictPairCount": 0,
        "runtimeBudgetReached": False,
    }
    if critical_missing_pair_count == 0 and refresh_required:
        refreshed_records = fetch_records(
            refresh_required,
            target_map,
            None,
            args.timeout_seconds,
            args.runtime_seconds,
            checkpoint=checkpoint_refresh,
            diagnostics=refresh_diagnostics,
            deadline_monotonic=deadline_monotonic,
            preserve_input_order=True,
        )
        persist_checkpoint()
    if latest_document is None:
        raise RuntimeError("OPEN_METEO_CHECKPOINT_WRITE_FAILED")
    document = latest_document
    fetched, _ = merge_records(critical_records, refreshed_records)
    batch_count = (
        int(critical_diagnostics["batchCount"])
        + int(refresh_diagnostics["batchCount"])
    )
    batch_attempt_count = (
        int(critical_diagnostics["batchAttemptCount"])
        + int(refresh_diagnostics["batchAttemptCount"])
    )
    batch_completed_count = (
        int(critical_diagnostics["batchCompletedCount"])
        + int(refresh_diagnostics["batchCompletedCount"])
    )
    batch_unresolved_count = (
        int(critical_diagnostics["batchUnresolvedCount"])
        + int(refresh_diagnostics["batchUnresolvedCount"])
    )
    conflict_pair_count = (
        int(critical_diagnostics["conflictPairCount"])
        + int(refresh_diagnostics["conflictPairCount"])
        + latest_conflict_count
    )
    runtime_budget_reached = bool(
        critical_diagnostics["runtimeBudgetReached"]
        or refresh_diagnostics["runtimeBudgetReached"]
    )
    regional_diagnostics = plan["regionalDiagnostics"]
    quarantined_count = regional_diagnostics.get(
        "quarantinedAnchorOrSampleCount", 0,
    )
    if (
        isinstance(quarantined_count, bool)
        or not isinstance(quarantined_count, int)
        or quarantined_count < 0
    ):
        quarantined_count = 0
    header_quarantined = (
        regional_diagnostics.get("shadowHeaderQuarantined") is True
    )
    print(
        "Open-Meteo current residual: "
        f"required={document['requiredPairCount']}; filled={document['recordCount']}; "
        f"missing={document['missingPairCount']}; "
        f"retained={len(retained)}; fetched={len(fetched)}; "
        f"refreshed={len(refreshed_records)}; "
        f"criticalMissing={critical_missing_pair_count}; "
        f"batchAttempts={batch_attempt_count}; "
        f"batchCompleted={batch_completed_count}; "
        f"batchUnresolved={batch_unresolved_count}; "
        f"checkpointWritten=true; cacheReuse={cache_reuse_status}; "
        f"regionalQuarantined={quarantined_count}; "
        f"headerQuarantined={str(header_quarantined).lower()}."
    )
    export_github_outputs({
        "checkpoint_written": True,
        "required_pair_count": document["requiredPairCount"],
        "retained_record_count": len(retained),
        "fetched_record_count": len(fetched),
        "critical_fetched_record_count": len(critical_records),
        "critical_missing_pair_count": critical_missing_pair_count,
        "refresh_candidate_count": len(refresh_required),
        "refreshed_record_count": len(refreshed_records),
        "refresh_attempted": int(refresh_diagnostics["batchAttemptCount"]) > 0,
        "filled_pair_count": document["recordCount"],
        "missing_pair_count": document["missingPairCount"],
        "batch_count": batch_count,
        "batch_attempt_count": batch_attempt_count,
        "batch_completed_count": batch_completed_count,
        "batch_unresolved_count": batch_unresolved_count,
        "conflict_pair_count": conflict_pair_count,
        "runtime_budget_reached": runtime_budget_reached,
        "cache_reuse_status": cache_reuse_status,
    })
    return 0 if document["status"] == "COMPLETE" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        code = getattr(error, "code", str(error))
        print(code if isinstance(code, str) and code.startswith("OPEN_METEO_") else "OPEN_METEO_FALLBACK_FAILED")
        raise SystemExit(1)
