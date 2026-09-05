#!/usr/bin/env python3
"""Fill only the exact current residual left by DMI/Copernicus/regional DMI."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from lib.copernicus_current import (
    canonical_sha256,
    file_sha256,
    load_targets,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_current_source_stage import validate_source_stage
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    processed_source_assets_from_current_operational_ledger,
)
from lib.open_meteo_current_fallback import (
    MAXIMUM_DISTANCE_KM,
    MODEL,
    build_document,
    build_record,
    safe_projection,
)
from lib.regional_current_operational import (
    MISSING,
    build_regional_current_operational_evidence,
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
    return parser.parse_args()


def read_object(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, UnicodeError, json.JSONDecodeError):
        raise RuntimeError("OPEN_METEO_INPUT_INVALID") from None
    if not isinstance(value, dict):
        raise RuntimeError("OPEN_METEO_INPUT_INVALID")
    return value


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


def request_json(url: str, timeout_seconds: int) -> Any:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "RavRadar/4 Open-Meteo current fallback"})
            with urlopen(request, timeout=timeout_seconds) as response:
                if response.status != 200:
                    raise RuntimeError("OPEN_METEO_HTTP_INVALID")
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, UnicodeError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(2 ** attempt)
    raise RuntimeError("OPEN_METEO_REQUEST_FAILED") from last_error


def residual_pairs(*, targets: list[dict[str, Any]], dmi: dict[str, Any],
                   registry: dict[str, Any], copernicus: dict[str, Any],
                   source_stage: dict[str, Any], regional: dict[str, Any],
                   policy: dict[str, Any], reference: str,
                   copernicus_path: Path, dmi_path: Path) -> list[dict[str, str]]:
    target_map = {row["partId"]: row for row in targets}
    registry = validate_target_registry(registry)
    cache = validate_shadow(copernicus, target_map, require_collection=False)
    stage = validate_source_stage(
        source_stage,
        registry=registry,
        shadow=cache,
        target_identities=target_map,
        shadow_sha256=file_sha256(copernicus_path),
    )
    if stage.get("productionReferenceAt") != reference:
        raise RuntimeError("OPEN_METEO_SOURCE_STAGE_TARGET_MISMATCH")
    ledger = ((dmi.get("diagnostics") or {}).get("currentOperationalLedger"))
    if not isinstance(ledger, dict):
        raise RuntimeError("OPEN_METEO_DMI_LEDGER_MISSING")
    allowed_assets = processed_source_assets_from_current_operational_ledger(ledger)
    attestation = canonical_verified_part_current_attestation(
        dmi, targets, reference, registry.get("operationalRangeEndAt"), allowed_assets,
    )
    policy_rows = policy.get("parts")
    if not isinstance(policy_rows, list):
        raise RuntimeError("OPEN_METEO_REGIONAL_POLICY_INVALID")
    regional_ids = {row.get("partId") for row in policy_rows if isinstance(row, dict)}
    copernicus_residual = stage.get("missingPairs")
    if not isinstance(copernicus_residual, list):
        raise RuntimeError("OPEN_METEO_SOURCE_STAGE_INVALID")
    regional_candidates = [row for row in copernicus_residual if row.get("partId") in regional_ids]
    outside_regional = [row for row in copernicus_residual if row.get("partId") not in regional_ids]
    regional_result = build_regional_current_operational_evidence(
        policy=policy,
        targets=targets,
        current_shadow=regional,
        dmi_ledger=ledger,
        dmi_attestation=attestation,
        locked_reference=reference,
        dmi_gap_pairs=regional_candidates,
    )
    unresolved_regional = [
        {"partId": row["partId"], "validTime": row["validTime"]}
        for row in regional_result["privateProof"]["pairRefs"]
        if row.get("classification") == MISSING
    ]
    result = sorted(
        [*outside_regional, *unresolved_regional],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    if len({(row["partId"], row["validTime"]) for row in result}) != len(result):
        raise RuntimeError("OPEN_METEO_RESIDUAL_DUPLICATE")
    return result


def fetch_records(required: list[dict[str, str]], targets: dict[str, dict[str, Any]],
                  acquired_at: str, timeout_seconds: int) -> list[dict[str, Any]]:
    if not required:
        return []
    base_url = os.environ.get("OPEN_METEO_MARINE_BASE_URL", DEFAULT_BASE_URL).strip()
    api_key = os.environ.get("OPEN_METEO_API_KEY", "").strip()
    required_by_part: dict[str, set[str]] = {}
    for row in required:
        required_by_part.setdefault(row["partId"], set()).add(row["validTime"])
    part_ids = sorted(required_by_part)
    start_hour = min(row["validTime"] for row in required).replace("Z", "")
    end_hour = max(row["validTime"] for row in required).replace("Z", "")
    records: list[dict[str, Any]] = []
    for start in range(0, len(part_ids), BATCH_SIZE):
        batch_ids = part_ids[start:start + BATCH_SIZE]
        sampling_points = [point(targets[part_id].get("waterPoint")) for part_id in batch_ids]
        if any(item is None for item in sampling_points):
            raise RuntimeError("OPEN_METEO_TARGET_POINT_INVALID")
        query = {
            "latitude": ",".join(str(item[1]) for item in sampling_points if item is not None),
            "longitude": ",".join(str(item[0]) for item in sampling_points if item is not None),
            "hourly": "ocean_current_velocity,ocean_current_direction",
            "velocity_unit": "ms",
            "timezone": "GMT",
            "start_hour": start_hour,
            "end_hour": end_hour,
            "cell_selection": "sea",
            "models": MODEL,
        }
        if api_key:
            query["apikey"] = api_key
        response = request_json(f"{base_url}?{urlencode(query)}", timeout_seconds)
        payloads = response if isinstance(response, list) else [response]
        if len(payloads) != len(batch_ids):
            raise RuntimeError("OPEN_METEO_RESPONSE_CARDINALITY_INVALID")
        for part_id, sampling, payload in zip(batch_ids, sampling_points, payloads):
            if not isinstance(payload, dict) or sampling is None:
                continue
            grid = point([payload.get("longitude"), payload.get("latitude")])
            hourly = payload.get("hourly")
            if grid is None or not isinstance(hourly, dict) or haversine_km(sampling, grid) > MAXIMUM_DISTANCE_KM:
                continue
            times = hourly.get("time")
            speeds = hourly.get("ocean_current_velocity")
            directions = hourly.get("ocean_current_direction")
            if not isinstance(times, list) or not isinstance(speeds, list) or not isinstance(directions, list):
                continue
            index_by_time = {
                exact_time(f"{value}Z" if isinstance(value, str) and not value.endswith("Z") else value): index
                for index, value in enumerate(times)
            }
            response_sha256 = canonical_sha256(payload)
            for valid_time in sorted(required_by_part[part_id]):
                index = index_by_time.get(valid_time)
                if index is None or index >= len(speeds) or index >= len(directions):
                    continue
                speed, direction = speeds[index], directions[index]
                if (isinstance(speed, bool) or not isinstance(speed, (int, float))
                        or not math.isfinite(speed) or speed < 0
                        or isinstance(direction, bool) or not isinstance(direction, (int, float))
                        or not math.isfinite(direction)):
                    continue
                records.append(build_record(
                    part_id=part_id,
                    valid_time=valid_time,
                    acquired_at=acquired_at,
                    sampling_point=sampling,
                    grid_point=grid,
                    speed_mps=float(speed),
                    toward_direction_deg=float(direction),
                    source_response_sha256=response_sha256,
                ))
    return records


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
    regional = read_object(args.regional)
    policy = read_object(args.policy)
    required = residual_pairs(
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
    acquired_at = canonical_now()
    records = fetch_records(required, target_map, acquired_at, args.timeout_seconds)
    document = build_document(
        targets=targets,
        required_pairs=required,
        records=records,
        acquired_at=acquired_at,
        production_reference_at=reference,
    )
    atomic_write(args.output, document)
    atomic_write(args.report, safe_projection(document))
    print(
        "Open-Meteo current residual: "
        f"required={document['requiredPairCount']}; filled={document['recordCount']}; "
        f"missing={document['missingPairCount']}."
    )
    return 0 if document["status"] == "COMPLETE" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        code = getattr(error, "code", str(error))
        print(code if isinstance(code, str) and code.startswith("OPEN_METEO_") else "OPEN_METEO_FALLBACK_FAILED")
        raise SystemExit(1)
