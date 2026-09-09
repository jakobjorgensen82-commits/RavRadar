#!/usr/bin/env python3
"""Fill only the exact current residual left by DMI/Copernicus/regional DMI."""
from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from http.client import HTTPException, IncompleteRead
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
    reusable_records_with_salvage,
    safe_projection,
)
from lib.dmi_bulk_storage import read_dmi_bulk_document



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
MAX_TRANSPORT_ATTEMPTS = 3
MAX_PARTIAL_SAME_WORK_ATTEMPTS = 1
MAX_TOTAL_REQUEST_ATTEMPTS = 1024
MAX_PENDING_WORK_ITEMS = 2048
MAX_RETRY_BACKOFF_SECONDS = 15
RETRYABLE_HTTP_STATUS = {408, 425, 429, 500, 502, 503, 504}
ISOLATABLE_PERMANENT_HTTP_STATUS = {413, 414}
PROACTIVE_REFRESH_AGE_HOURS = 2
SAFE_CAUSE_CODE = re.compile(r"^[A-Z][A-Z0-9_]{0,127}$")


class OpenMeteoRequestFailure(RuntimeError):
    """Privacy-safe transport classification for bounded provider retries."""

    def __init__(
        self,
        code: str,
        *,
        retryable: bool,
        http: bool = False,
        retry_after_seconds: int | None = None,
        global_scope: bool = False,
    ) -> None:
        super().__init__(code)
        self.retryable = retryable
        self.http = http
        self.retry_after_seconds = retry_after_seconds
        self.global_scope = global_scope


@dataclass
class PendingWork:
    """One exact, disjoint residual unit in the bounded breadth-first queue."""

    work: dict[str, list[str]]
    transport_attempts: int = 0
    content_attempts: int = 0
    ready_at_monotonic: float = 0.0


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
        raise RuntimeError("OPEN_METEO_CACHE_UNPARSEABLE") from None
    if not isinstance(value, dict):
        raise RuntimeError("OPEN_METEO_CACHE_UNPARSEABLE")
    return value, "present"


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


def retry_after_seconds(
    headers: Any,
    *,
    now: datetime | None = None,
) -> int | None:
    """Return a bounded Retry-After delay; never expose the raw header."""
    try:
        raw_value = headers.get("Retry-After")
    except AttributeError:
        return None
    if not isinstance(raw_value, str):
        return None
    stripped = raw_value.strip()
    if stripped.isdigit():
        value = int(stripped)
        return min(value, MAX_RETRY_BACKOFF_SECONDS)
    try:
        parsed = parsedate_to_datetime(stripped)
    except (TypeError, ValueError, OverflowError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    reference = now or datetime.now(timezone.utc)
    value = math.ceil(
        (parsed.astimezone(timezone.utc) - reference).total_seconds()
    )
    if value < 0:
        return 0
    return min(value, MAX_RETRY_BACKOFF_SECONDS)


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
                status = int(response.status)
                raise OpenMeteoRequestFailure(
                    "OPEN_METEO_REQUEST_FAILED",
                    retryable=status in RETRYABLE_HTTP_STATUS,
                    http=True,
                    global_scope=(
                        status not in RETRYABLE_HTTP_STATUS
                        and status not in ISOLATABLE_PERMANENT_HTTP_STATUS
                    ),
                    retry_after_seconds=retry_after_seconds(
                        getattr(response, "headers", None),
                    ),
                )
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        status = int(getattr(error, "code", 0) or 0)
        raise OpenMeteoRequestFailure(
            "OPEN_METEO_REQUEST_FAILED",
            retryable=status in RETRYABLE_HTTP_STATUS,
            http=True,
            global_scope=(
                status not in RETRYABLE_HTTP_STATUS
                and status not in ISOLATABLE_PERMANENT_HTTP_STATUS
            ),
            retry_after_seconds=retry_after_seconds(
                getattr(error, "headers", None),
            ),
        ) from error
    except (
        URLError,
        TimeoutError,
        OSError,
        HTTPException,
        IncompleteRead,
        UnicodeError,
        json.JSONDecodeError,
    ) as error:
        raise OpenMeteoRequestFailure(
            "OPEN_METEO_REQUEST_FAILED", retryable=True,
        ) from error


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


def initial_fetch_diagnostics(batch_count: int) -> dict[str, int | bool]:
    return {
        "batchCount": batch_count,
        "batchAttemptCount": 0,
        "batchCompletedCount": 0,
        "batchUnresolvedCount": batch_count,
        "retryRoundCount": 0,
        "conflictPairCount": 0,
        "runtimeBudgetReached": False,
        "attemptBudgetReached": False,
        "queueBudgetReached": False,
        "globalProviderFailure": False,
        "transportRetryableBatchCount": 0,
        "httpRetryableBatchCount": 0,
        "httpPermanentBatchCount": 0,
        "responseContainerInvalidBatchCount": 0,
        "responseCardinalityInvalidBatchCount": 0,
        "partialResponseBatchCount": 0,
        "payloadContractInvalidCount": 0,
        "payloadUnitsInvalidCount": 0,
        "payloadTimezoneInvalidCount": 0,
        "payloadGridDistanceInvalidCount": 0,
        "payloadTimeAxisInvalidCount": 0,
        "pairHourMissingCount": 0,
        "pairValueInvalidCount": 0,
        "pairBuildInvalidCount": 0,
        "adaptiveSplitCount": 0,
        "retrySleepSeconds": 0,
        "unresolvedWorkItemCount": batch_count,
        "unresolvedPartCount": 0,
        "unresolvedPairCount": 0,
    }


def work_pair_keys(work: dict[str, list[str]]) -> set[tuple[str, str]]:
    return {
        (part_id, valid_time)
        for part_id, valid_times in work.items()
        for valid_time in valid_times
    }


def work_from_pair_keys(
    pair_keys: set[tuple[str, str]],
    part_order: list[str],
) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for part_id, valid_time in pair_keys:
        grouped.setdefault(part_id, []).append(valid_time)
    return {
        part_id: sorted(grouped[part_id])
        for part_id in part_order
        if part_id in grouped
    }


def split_unresolved_work(
    work: dict[str, list[str]],
) -> list[dict[str, list[str]]]:
    """Binary-split exact residual work; never fan one item out by more than two."""
    part_ids = list(work)
    if len(part_ids) > 1:
        midpoint = max(1, len(part_ids) // 2)
        groups = [part_ids[:midpoint], part_ids[midpoint:]]
        return [
            {part_id: work[part_id] for part_id in group}
            for group in groups
            if group
        ]
    if len(part_ids) == 1:
        part_id = part_ids[0]
        valid_times = work[part_id]
        if len(valid_times) > 1:
            midpoint = max(1, len(valid_times) // 2)
            return [
                {part_id: valid_times[:midpoint]},
                {part_id: valid_times[midpoint:]},
            ]
    return []


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
    initial_batch_parts = [
        part_ids[start:start + BATCH_SIZE]
        for start in range(0, len(part_ids), BATCH_SIZE)
    ]
    batches = [
        {
            part_id: sorted(required_by_part[part_id])
            for part_id in batch_part_ids
        }
        for batch_part_ids in initial_batch_parts
    ]
    initial_batch_keys = [work_pair_keys(work) for work in batches]
    stats = initial_fetch_diagnostics(len(batches))
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
    candidates: list[dict[str, Any]] = []
    selected: list[dict[str, Any]] = []
    terminal_pending: list[dict[str, list[str]]] = []
    pending: deque[PendingWork] = deque(
        PendingWork(work=work) for work in batches
    )
    provider_ready_at_monotonic = 0.0

    def terminalize_queue(current: PendingWork | None = None) -> None:
        if current is not None:
            terminal_pending.append(current.work)
        while pending:
            terminal_pending.append(pending.popleft().work)

    def enqueue_split(parent_work: dict[str, list[str]]) -> None:
        children = split_unresolved_work(parent_work)
        if not children:
            terminal_pending.append(parent_work)
            return
        if len(children) > 2:
            raise RuntimeError("OPEN_METEO_ADAPTIVE_SPLIT_INVALID")
        if len(pending) + len(children) > MAX_PENDING_WORK_ITEMS:
            stats["queueBudgetReached"] = True
            terminal_pending.append(parent_work)
            return
        pending.extend(PendingWork(work=child) for child in children)
        stats["adaptiveSplitCount"] = int(stats["adaptiveSplitCount"]) + 1

    def enqueue_content_retry(
        parent: PendingWork,
        retry_work: dict[str, list[str]],
    ) -> bool:
        if parent.content_attempts >= MAX_PARTIAL_SAME_WORK_ATTEMPTS:
            return False
        if len(pending) >= MAX_PENDING_WORK_ITEMS:
            stats["queueBudgetReached"] = True
            terminal_pending.append(retry_work)
            return True
        pending.append(PendingWork(
            work=retry_work,
            content_attempts=parent.content_attempts + 1,
        ))
        return True

    while pending:
        if int(stats["batchAttemptCount"]) >= MAX_TOTAL_REQUEST_ATTEMPTS:
            stats["attemptBudgetReached"] = True
            terminalize_queue()
            break

        now_monotonic = time.monotonic()
        work_item: PendingWork | None = None
        if provider_ready_at_monotonic <= now_monotonic:
            for _ in range(len(pending)):
                candidate = pending.popleft()
                if candidate.ready_at_monotonic <= now_monotonic:
                    work_item = candidate
                    break
                pending.append(candidate)
        if work_item is None:
            remaining = deadline - now_monotonic
            earliest_ready = max(
                provider_ready_at_monotonic,
                min(item.ready_at_monotonic for item in pending),
            )
            bounded_delay = min(
                max(1, math.ceil(earliest_ready - now_monotonic)),
                MAX_RETRY_BACKOFF_SECONDS,
            )
            if remaining <= bounded_delay + 1:
                stats["runtimeBudgetReached"] = True
                terminalize_queue()
                break
            time.sleep(bounded_delay)
            stats["retrySleepSeconds"] = (
                int(stats["retrySleepSeconds"]) + bounded_delay
            )
            continue

        work = work_item.work
        batch_ids = list(work)
        remaining = deadline - now_monotonic
        work_items_left = len(pending) + 1
        if remaining <= work_items_left + 1:
            stats["runtimeBudgetReached"] = True
            terminalize_queue(work_item)
            break
        fair_timeout = min(
            timeout_seconds,
            max(1, int((remaining - 1) / work_items_left)),
        )
        sampling_points = [
            point(targets[part_id].get("waterPoint"))
            for part_id in batch_ids
        ]
        if any(item is None for item in sampling_points):
            raise RuntimeError("OPEN_METEO_TARGET_POINT_INVALID")
        work_times = [
            valid_time
            for valid_times in work.values()
            for valid_time in valid_times
        ]
        start_hour = min(work_times).replace("Z", "")
        end_hour = max(work_times).replace("Z", "")
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
                terminalize_queue(work_item)
                break
            if str(error) in {
                "OPEN_METEO_HTTP_INVALID",
                "OPEN_METEO_REQUEST_FAILED",
            }:
                retryable = getattr(error, "retryable", True) is True
                is_http = getattr(error, "http", False) is True
                if is_http and retryable:
                    stats["httpRetryableBatchCount"] = (
                        int(stats["httpRetryableBatchCount"]) + 1
                    )
                elif is_http:
                    stats["httpPermanentBatchCount"] = (
                        int(stats["httpPermanentBatchCount"]) + 1
                    )
                else:
                    stats["transportRetryableBatchCount"] = (
                        int(stats["transportRetryableBatchCount"]) + 1
                    )
                if getattr(error, "global_scope", False) is True:
                    stats["globalProviderFailure"] = True
                    terminalize_queue(work_item)
                    break
                next_transport_attempt = work_item.transport_attempts + 1
                retry_ready_at = 0.0
                if retryable:
                    hinted_delay = getattr(
                        error, "retry_after_seconds", None,
                    )
                    fallback_delay = min(
                        2 ** work_item.transport_attempts,
                        MAX_RETRY_BACKOFF_SECONDS,
                    )
                    delay_seconds = (
                        max(fallback_delay, hinted_delay)
                        if isinstance(hinted_delay, int)
                        else fallback_delay
                    )
                    retry_ready_at = time.monotonic() + delay_seconds
                    if is_http:
                        provider_ready_at_monotonic = max(
                            provider_ready_at_monotonic,
                            retry_ready_at,
                        )
                if retryable and (
                    next_transport_attempt < MAX_TRANSPORT_ATTEMPTS
                ):
                    if len(pending) >= MAX_PENDING_WORK_ITEMS:
                        stats["queueBudgetReached"] = True
                        terminal_pending.append(work)
                    else:
                        pending.append(PendingWork(
                            work=work,
                            transport_attempts=next_transport_attempt,
                            content_attempts=work_item.content_attempts,
                            ready_at_monotonic=retry_ready_at,
                        ))
                        stats["retryRoundCount"] = max(
                            int(stats["retryRoundCount"]),
                            next_transport_attempt,
                        )
                elif retryable:
                    terminal_pending.append(work)
                else:
                    enqueue_split(work)
                continue
            raise
        if isinstance(response, dict):
            payloads = [response]
        elif isinstance(response, list):
            payloads = response
        else:
            stats["responseContainerInvalidBatchCount"] = (
                int(stats["responseContainerInvalidBatchCount"]) + 1
            )
            if split_unresolved_work(work):
                enqueue_split(work)
            elif not enqueue_content_retry(work_item, work):
                terminal_pending.append(work)
            continue
        if len(payloads) != len(batch_ids):
            stats["responseCardinalityInvalidBatchCount"] = (
                int(stats["responseCardinalityInvalidBatchCount"]) + 1
            )
            if split_unresolved_work(work):
                enqueue_split(work)
            elif not enqueue_content_retry(work_item, work):
                terminal_pending.append(work)
            continue
        batch_acquired_at = acquired_at or canonical_now()
        batch_records: list[dict[str, Any]] = []
        for part_id, sampling, payload in zip(
            batch_ids, sampling_points, payloads
        ):
            if not isinstance(payload, dict) or sampling is None:
                stats["payloadContractInvalidCount"] = (
                    int(stats["payloadContractInvalidCount"]) + 1
                )
                continue
            grid = point([payload.get("longitude"), payload.get("latitude")])
            hourly = payload.get("hourly")
            hourly_units = payload.get("hourly_units")
            if (
                payload.get("utc_offset_seconds") != 0
                or payload.get("timezone") != "GMT"
            ):
                stats["payloadTimezoneInvalidCount"] = (
                    int(stats["payloadTimezoneInvalidCount"]) + 1
                )
                continue
            if (
                not isinstance(hourly_units, dict)
                or hourly_units.get("ocean_current_velocity") != "m/s"
                or hourly_units.get("ocean_current_direction") != "°"
            ):
                stats["payloadUnitsInvalidCount"] = (
                    int(stats["payloadUnitsInvalidCount"]) + 1
                )
                continue
            if grid is None or haversine_km(
                sampling, grid,
            ) > MAXIMUM_DISTANCE_KM:
                stats["payloadGridDistanceInvalidCount"] = (
                    int(stats["payloadGridDistanceInvalidCount"]) + 1
                )
                continue
            if not isinstance(hourly, dict):
                stats["payloadContractInvalidCount"] = (
                    int(stats["payloadContractInvalidCount"]) + 1
                )
                continue
            times = hourly.get("time")
            speeds = hourly.get("ocean_current_velocity")
            directions = hourly.get("ocean_current_direction")
            if (
                not isinstance(times, list)
                or not isinstance(speeds, list)
                or not isinstance(directions, list)
            ):
                stats["payloadContractInvalidCount"] = (
                    int(stats["payloadContractInvalidCount"]) + 1
                )
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
                stats["payloadTimeAxisInvalidCount"] = (
                    int(stats["payloadTimeAxisInvalidCount"]) + 1
                )
                continue
            index_by_time = {
                value: index for index, value in enumerate(normalized_times)
            }
            try:
                response_sha256 = canonical_sha256(payload)
            except (TypeError, ValueError, UnicodeError):
                stats["payloadContractInvalidCount"] = (
                    int(stats["payloadContractInvalidCount"]) + 1
                )
                continue
            for valid_time in work[part_id]:
                index = index_by_time.get(valid_time)
                if (
                    index is None
                    or index >= len(speeds)
                    or index >= len(directions)
                ):
                    stats["pairHourMissingCount"] = (
                        int(stats["pairHourMissingCount"]) + 1
                    )
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
                    stats["pairValueInvalidCount"] = (
                        int(stats["pairValueInvalidCount"]) + 1
                    )
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
                    stats["pairBuildInvalidCount"] = (
                        int(stats["pairBuildInvalidCount"]) + 1
                    )
                    continue
        candidates.extend(batch_records)
        selected, conflicts = merge_records(candidates)
        stats["conflictPairCount"] = conflicts
        selected_keys = {
            (row["partId"], row["validTime"]) for row in selected
        }
        batch_keys = work_pair_keys(work)
        unresolved_keys = batch_keys - selected_keys
        if unresolved_keys:
            if batch_records:
                stats["partialResponseBatchCount"] = (
                    int(stats["partialResponseBatchCount"]) + 1
                )
            unresolved_work = work_from_pair_keys(
                unresolved_keys, batch_ids,
            )
            if not enqueue_content_retry(work_item, unresolved_work):
                enqueue_split(unresolved_work)
        if batch_records and checkpoint is not None:
            checkpoint(selected, dict(stats))
    selected_keys = {
        (row["partId"], row["validTime"]) for row in selected
    }
    required_keys = {
        (row["partId"], row["validTime"]) for row in required
    }
    unresolved_keys = required_keys - selected_keys
    stats["batchCompletedCount"] = sum(
        batch_keys <= selected_keys for batch_keys in initial_batch_keys
    )
    stats["batchUnresolvedCount"] = (
        len(initial_batch_keys) - int(stats["batchCompletedCount"])
    )
    unresolved_work_items = [
        work for work in [
            *terminal_pending,
            *(item.work for item in pending),
        ]
        if work_pair_keys(work) & unresolved_keys
    ]
    represented_keys = set().union(
        *(work_pair_keys(work) for work in unresolved_work_items),
    ) if unresolved_work_items else set()
    unrepresented_keys = unresolved_keys - represented_keys
    if unrepresented_keys:
        unresolved_work_items.append(work_from_pair_keys(
            unrepresented_keys, part_ids,
        ))
    stats["unresolvedWorkItemCount"] = len(unresolved_work_items)
    stats["unresolvedPartCount"] = len({
        part_id for part_id, _ in unresolved_keys
    })
    stats["unresolvedPairCount"] = len(unresolved_keys)
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
    try:
        dmi = read_dmi_bulk_document(args.dmi)
    except (OSError, ValueError):
        raise RuntimeError("OPEN_METEO_INPUT_INVALID") from None
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
    cache_salvage: dict[str, int | bool] = {
        "salvaged": False,
        "droppedRecordCount": 0,
        "droppedPairCount": 0,
        "ignoredRecordCount": 0,
    }
    if previous is not None:
        retained, cache_salvage = reusable_records_with_salvage(
            previous,
            targets=targets,
            required_pairs=required,
            production_reference_at=reference,
            checkpointed_at=canonical_now(),
        )
        cache_reuse_status = (
            "salvaged" if cache_salvage["salvaged"] else "valid"
        )

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
    # avoids a full Open-Meteo refresh every 15 minutes while still improving
    # older tuples after the critical queue. Horizon-valid retained rows do not
    # expire by acquisition age. A failed refresh never removes the old tuple.
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
    refresh_diagnostics = initial_fetch_diagnostics(0)
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
    attempt_budget_reached = bool(
        critical_diagnostics.get("attemptBudgetReached", False)
        or refresh_diagnostics.get("attemptBudgetReached", False)
    )
    queue_budget_reached = bool(
        critical_diagnostics.get("queueBudgetReached", False)
        or refresh_diagnostics.get("queueBudgetReached", False)
    )
    global_provider_failure = bool(
        critical_diagnostics.get("globalProviderFailure", False)
        or refresh_diagnostics.get("globalProviderFailure", False)
    )
    unresolved_work_item_count = (
        int(critical_diagnostics.get("unresolvedWorkItemCount", 0))
        + int(refresh_diagnostics.get("unresolvedWorkItemCount", 0))
    )
    aggregate_diagnostic_keys = [
        "transportRetryableBatchCount",
        "httpRetryableBatchCount",
        "httpPermanentBatchCount",
        "responseContainerInvalidBatchCount",
        "responseCardinalityInvalidBatchCount",
        "partialResponseBatchCount",
        "payloadContractInvalidCount",
        "payloadUnitsInvalidCount",
        "payloadTimezoneInvalidCount",
        "payloadGridDistanceInvalidCount",
        "payloadTimeAxisInvalidCount",
        "pairHourMissingCount",
        "pairValueInvalidCount",
        "pairBuildInvalidCount",
        "adaptiveSplitCount",
        "retrySleepSeconds",
    ]
    aggregate_diagnostics = {
        key: int(critical_diagnostics.get(key, 0))
        + int(refresh_diagnostics.get(key, 0))
        for key in aggregate_diagnostic_keys
    }
    unresolved_part_count = int(
        critical_diagnostics.get("unresolvedPartCount", 0)
    )
    unresolved_pair_count = int(
        critical_diagnostics.get("unresolvedPairCount", 0)
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
        f"workUnresolved={unresolved_work_item_count}; "
        f"checkpointWritten=true; cacheReuse={cache_reuse_status}; "
        f"regionalQuarantined={quarantined_count}; "
        f"headerQuarantined={str(header_quarantined).lower()}."
    )
    print(
        "Open-Meteo safe rejection aggregates: "
        f"unresolvedParts={unresolved_part_count}; "
        f"unresolvedPairs={unresolved_pair_count}; "
        f"adaptiveSplits={aggregate_diagnostics['adaptiveSplitCount']}; "
        f"partialResponses={aggregate_diagnostics['partialResponseBatchCount']}; "
        f"transportRetryable={aggregate_diagnostics['transportRetryableBatchCount']}; "
        f"httpRetryable={aggregate_diagnostics['httpRetryableBatchCount']}; "
        f"httpPermanent={aggregate_diagnostics['httpPermanentBatchCount']}; "
        f"containerInvalid={aggregate_diagnostics['responseContainerInvalidBatchCount']}; "
        f"cardinalityInvalid={aggregate_diagnostics['responseCardinalityInvalidBatchCount']}; "
        f"payloadContractInvalid={aggregate_diagnostics['payloadContractInvalidCount']}; "
        f"payloadUnitsInvalid={aggregate_diagnostics['payloadUnitsInvalidCount']}; "
        f"payloadTimezoneInvalid={aggregate_diagnostics['payloadTimezoneInvalidCount']}; "
        f"payloadGridDistanceInvalid={aggregate_diagnostics['payloadGridDistanceInvalidCount']}; "
        f"payloadTimeAxisInvalid={aggregate_diagnostics['payloadTimeAxisInvalidCount']}; "
        f"pairHourMissing={aggregate_diagnostics['pairHourMissingCount']}; "
        f"pairValueInvalid={aggregate_diagnostics['pairValueInvalidCount']}; "
        f"pairBuildInvalid={aggregate_diagnostics['pairBuildInvalidCount']}; "
        f"retrySleepSeconds={aggregate_diagnostics['retrySleepSeconds']}; "
        f"runtimeBudgetReached={str(runtime_budget_reached).lower()}; "
        f"attemptBudgetReached={str(attempt_budget_reached).lower()}; "
        f"queueBudgetReached={str(queue_budget_reached).lower()}; "
        f"globalProviderFailure={str(global_provider_failure).lower()}."
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
        "unresolved_work_item_count": unresolved_work_item_count,
        "conflict_pair_count": conflict_pair_count,
        "runtime_budget_reached": runtime_budget_reached,
        "attempt_budget_reached": attempt_budget_reached,
        "queue_budget_reached": queue_budget_reached,
        "global_provider_failure": global_provider_failure,
        "unresolved_part_count": unresolved_part_count,
        "unresolved_pair_count": unresolved_pair_count,
        "adaptive_split_count": aggregate_diagnostics["adaptiveSplitCount"],
        "partial_response_batch_count": aggregate_diagnostics[
            "partialResponseBatchCount"
        ],
        "transport_retryable_batch_count": aggregate_diagnostics[
            "transportRetryableBatchCount"
        ],
        "http_retryable_batch_count": aggregate_diagnostics[
            "httpRetryableBatchCount"
        ],
        "http_permanent_batch_count": aggregate_diagnostics[
            "httpPermanentBatchCount"
        ],
        "payload_contract_invalid_count": aggregate_diagnostics[
            "payloadContractInvalidCount"
        ],
        "payload_units_invalid_count": aggregate_diagnostics[
            "payloadUnitsInvalidCount"
        ],
        "payload_timezone_invalid_count": aggregate_diagnostics[
            "payloadTimezoneInvalidCount"
        ],
        "payload_grid_distance_invalid_count": aggregate_diagnostics[
            "payloadGridDistanceInvalidCount"
        ],
        "payload_time_axis_invalid_count": aggregate_diagnostics[
            "payloadTimeAxisInvalidCount"
        ],
        "pair_hour_missing_count": aggregate_diagnostics[
            "pairHourMissingCount"
        ],
        "pair_value_invalid_count": aggregate_diagnostics[
            "pairValueInvalidCount"
        ],
        "pair_build_invalid_count": aggregate_diagnostics[
            "pairBuildInvalidCount"
        ],
        "retry_sleep_seconds": aggregate_diagnostics["retrySleepSeconds"],
        "cache_reuse_status": cache_reuse_status,
        "cache_salvaged": cache_salvage["salvaged"],
        "cache_dropped_record_count": cache_salvage["droppedRecordCount"],
        "cache_dropped_pair_count": cache_salvage["droppedPairCount"],
    })
    return 0 if document["status"] == "COMPLETE" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        code = getattr(error, "code", str(error))
        print(code if isinstance(code, str) and code.startswith("OPEN_METEO_") else "OPEN_METEO_FALLBACK_FAILED")
        raise SystemExit(1)
