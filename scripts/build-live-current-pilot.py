#!/usr/bin/env python3
"""Build the fail-closed online current history for the controlled live pilot.

Credentials never enter the document.  Geometry-bound Copernicus and approved
regional-proxy U/V records may be published below ``data/live`` and are consumed
by the weather build only when the versioned control is in ``controlled-live``
mode.  The script never changes the source caches and never prints vector values.
"""
from __future__ import annotations

import argparse
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_target_identity import target_fingerprint, targets_from_registry


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_COPERNICUS = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_REGIONAL = ROOT / ".cache/current-field-shadow.json"
DEFAULT_POLICY = ROOT / "data/current-regional-proxy-policy.json"
DEFAULT_CONTROL = ROOT / "data/current-live-pilot-control.json"
DEFAULT_OUTPUT = ROOT / "data/live/current-pilot-history.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/live-current-pilot.json"
RETENTION_HOURS = 168
COPERNICUS_MAX_KM = 5.0
REGIONAL_MAX_KM = 15.0
COPERNICUS_SOURCES = ("copernicus-baltic-nemo", "copernicus-nws-amm15")
REGIONAL_PREFIX = "REGIONAL_PROXY::"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--copernicus", type=Path, default=DEFAULT_COPERNICUS)
    parser.add_argument("--regional", type=Path, default=DEFAULT_REGIONAL)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--control", type=Path, default=DEFAULT_CONTROL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--at", help="UTC build time; defaults to now")
    return parser.parse_args()


def read_json(path: Path, *, optional: bool = False) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
    except FileNotFoundError:
        if optional:
            return {}
        raise RuntimeError(f"Required live-pilot input is missing: {path.name}") from None
    except Exception as error:
        raise RuntimeError(f"Invalid live-pilot JSON in {path.name}: {error}") from None
    if not isinstance(value, dict):
        raise RuntimeError(f"Live-pilot input must be an object: {path.name}")
    return value


def parse_time(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp has no timezone")
    return parsed.astimezone(timezone.utc)


def utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def valid_point(value: Any) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        return None
    first, second = finite(value[0]), finite(value[1])
    return [first, second] if first is not None and second is not None else None


def canonical_point(value: Any) -> list[float] | None:
    point = valid_point(value)
    return [round(point[0], 7), round(point[1], 7)] if point else None


def same_point(first: Any, second: Any) -> bool:
    return canonical_point(first) == canonical_point(second) and canonical_point(first) is not None


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1 = map(math.radians, first)
    lon2, lat2 = map(math.radians, second)
    dlon, dlat = lon2 - lon1, lat2 - lat1
    value = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(value), math.sqrt(max(0.0, 1 - value)))


def in_capture_window(value: Any, now: datetime) -> bool:
    try:
        captured = parse_time(value)
    except Exception:
        return False
    age_hours = (now - captured).total_seconds() / 3600
    return -1 <= age_hours <= RETENTION_HOURS


def valid_dmi_parts(document: dict[str, Any], targets: dict[str, dict[str, Any]]) -> tuple[set[str], dict[str, set[str]]]:
    if int(document.get("currentVectorSemanticsVersion") or 0) != 3:
        return set(), {}
    selection = document.get("currentVectorSelection")
    maximum = finite(document.get("currentMaxDistanceKm")) or COPERNICUS_MAX_KM
    covered: set[str] = set()
    times: dict[str, set[str]] = {}
    for part_id, target in targets.items():
        zone = (document.get("zones") or {}).get(f"PART::{part_id}") or {}
        sampling = target["waterPoint"]
        if not same_point(zone.get("samplingPoint"), sampling):
            continue
        for row in (zone.get("hourly") or {}).values():
            source = ((row or {}).get("sources") or {}).get("current") or {}
            point = valid_point(source.get("gridPoint"))
            distance = finite(source.get("distanceKm"))
            if (
                finite((row or {}).get("current-u")) is None
                or finite((row or {}).get("current-v")) is None
                or str(source.get("provider") or "").lower() != "dmi"
                or int(source.get("vectorSemanticsVersion") or 0) != 3
                or not source.get("verticalLayer")
                or source.get("vectorSelection") != selection
                or not same_point(source.get("samplingPoint"), sampling)
                or point is None
                or distance is None
                or distance > maximum
                or haversine_km(sampling, point) > maximum + 0.01
            ):
                continue
            try:
                valid_time = utc_iso(parse_time((row or {}).get("time")))
            except Exception:
                continue
            covered.add(part_id)
            times.setdefault(part_id, set()).add(valid_time)
    return covered, times


def copernicus_entries(
    document: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    fingerprint: str,
    now: datetime,
) -> list[dict[str, Any]]:
    if not document:
        return []
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise RuntimeError("Copernicus raw cache lost its private/score-neutral contract")
    records = list(document.get("records") or [])
    authorized_times: set[str] = set()
    for collection in document.get("collections") or []:
        try:
            valid_time = utc_iso(parse_time(collection.get("validTime")))
            expected_count = int(collection.get("recordCount"))
        except Exception:
            continue
        actual_count = sum(1 for row in records if row.get("validTime") == valid_time)
        if collection.get("targetFingerprint") == fingerprint and expected_count > 0 and actual_count == expected_count:
            authorized_times.add(valid_time)

    selected: dict[tuple[str, str], dict[str, Any]] = {}
    source_rank = {source: index for index, source in enumerate(COPERNICUS_SOURCES)}
    for row in records:
        part_id = str(row.get("partId") or "")
        target = targets.get(part_id)
        source = str(row.get("source") or "")
        sampling = canonical_point(row.get("samplingPoint"))
        grid = canonical_point(row.get("gridPoint"))
        distance = finite(row.get("distanceKm"))
        depth = finite(row.get("verticalLayerM"))
        u_value, v_value = finite(row.get("uMps")), finite(row.get("vMps"))
        try:
            valid_time = utc_iso(parse_time(row.get("validTime")))
        except Exception:
            continue
        if (
            target is None
            or source not in source_rank
            or valid_time not in authorized_times
            or not in_capture_window(valid_time, now)
            or not same_point(sampling, target["waterPoint"])
            or grid is None
            or distance is None
            or distance > COPERNICUS_MAX_KM
            or haversine_km(target["waterPoint"], grid) > COPERNICUS_MAX_KM + 0.01
            or depth is None
            or u_value is None
            or v_value is None
            or row.get("componentPair") != "same-time-cell-layer"
            or row.get("interpolation") is not False
        ):
            continue
        entry = {
            "partId": part_id,
            "parentZoneId": target["parentZoneId"],
            "validTime": valid_time,
            "samplingPoint": canonical_point(target["waterPoint"]),
            "provider": "copernicus",
            "sourceClass": "supplemental-local-current",
            "source": source,
            "productId": row.get("productId"),
            "datasetId": row.get("datasetId"),
            "datasetVersion": row.get("datasetVersion"),
            "gridPoint": grid,
            "distanceKm": round(distance, 5),
            "verticalLayer": f"depth:{depth:g}",
            "verticalLayerRankM": depth,
            "layerQuality": row.get("layerQuality"),
            "componentPair": "same-time-cell-layer",
            "interpolation": False,
            "vectorSemanticsVersion": 4,
            "uMps": round(u_value, 5),
            "vMps": round(v_value, 5),
        }
        key = (part_id, valid_time)
        previous = selected.get(key)
        if previous is None or source_rank[source] < source_rank[str(previous["source"])]:
            selected[key] = entry
    return list(selected.values())


def regional_entries(
    document: dict[str, Any],
    policy: dict[str, Any],
    targets: dict[str, dict[str, Any]],
    now: datetime,
) -> list[dict[str, Any]]:
    if not document:
        return []
    if document.get("scoreImpact") is not False or document.get("publicRuntime") is not False:
        raise RuntimeError("Regional raw cache lost its private/score-neutral contract")
    if policy.get("controlledLivePilotAllowed") is not True:
        raise RuntimeError("Regional policy does not permit the controlled live projection")
    policy_rows = list(policy.get("parts") or [])
    if len(policy_rows) != 8 or len({str(row.get("partId") or "") for row in policy_rows}) != 8:
        raise RuntimeError("Regional policy must contain exactly eight unique parts")
    selected: dict[tuple[str, str], tuple[datetime, dict[str, Any]]] = {}
    for policy_row in policy_rows:
        part_id = str(policy_row.get("partId") or "")
        target = targets.get(part_id)
        approved = canonical_point(policy_row.get("approvedSamplingPoint"))
        if target is None or not same_point(approved, target["waterPoint"]):
            raise RuntimeError(f"Regional proxy point requires renewed owner approval: {part_id}")
        anchor = (document.get("anchors") or {}).get(f"{REGIONAL_PREFIX}{part_id}") or {}
        if (
            not anchor.get("regionalProxyCandidate")
            or anchor.get("requiredCollection") != "dkss_lf"
            or not same_point(anchor.get("targetPoint"), approved)
            or not same_point(anchor.get("approvedSamplingPoint"), approved)
        ):
            continue
        for sample in anchor.get("samples") or []:
            if sample.get("collection") != "dkss_lf" or not in_capture_window(sample.get("capturedAt"), now):
                continue
            grid = canonical_point(sample.get("gridPoint"))
            distance = finite(sample.get("distanceKm"))
            bottom = ((sample.get("layers") or {}).get("bottom") or {})
            u_value, v_value = finite(bottom.get("uMps")), finite(bottom.get("vMps"))
            layer_rank = finite(bottom.get("verticalLayerRankM"))
            try:
                valid_time = utc_iso(parse_time(sample.get("validTime")))
                captured_at = parse_time(sample.get("capturedAt"))
            except Exception:
                continue
            if (
                grid is None
                or distance is None
                or distance <= COPERNICUS_MAX_KM
                or distance > REGIONAL_MAX_KM
                or haversine_km(approved, grid) > REGIONAL_MAX_KM + 0.01
                or u_value is None
                or v_value is None
                or not bottom.get("verticalLayer")
                or layer_rank is None
            ):
                continue
            entry = {
                "partId": part_id,
                "parentZoneId": target["parentZoneId"],
                "validTime": valid_time,
                "samplingPoint": approved,
                "provider": "dmi",
                "sourceClass": "owner-approved-regional-proxy",
                "source": "dmi-dkss-lf-regional-proxy",
                "collection": "dkss_lf",
                "modelRun": sample.get("modelRun"),
                "gridPoint": grid,
                "distanceKm": round(distance, 5),
                "verticalLayer": bottom.get("verticalLayer"),
                "verticalLayerRankM": layer_rank,
                "layerQuality": "regional-proxy-bottom-layer",
                "componentPair": "same-time-cell-layer",
                "interpolation": False,
                "vectorSemanticsVersion": 4,
                "uMps": round(u_value, 5),
                "vMps": round(v_value, 5),
            }
            key = (part_id, valid_time)
            previous = selected.get(key)
            if previous is None or captured_at > previous[0]:
                selected[key] = (captured_at, entry)
    return [row[1] for row in selected.values()]


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    temporary.replace(path)


def main() -> int:
    args = arguments()
    now = parse_time(args.at) if args.at else datetime.now(timezone.utc)
    control = read_json(args.control)
    mode = str(control.get("mode") or "")
    if int(control.get("schemaVersion") or 0) != 1 or mode not in ("controlled-live", "dmi-only-rollback"):
        raise RuntimeError("Live-pilot control must select controlled-live or dmi-only-rollback")
    if control.get("credentialsPublic") is not False or control.get("currentDataPublic") is not True:
        raise RuntimeError("Live-pilot publication contract is invalid")
    enabled = mode == "controlled-live"
    targets_list = targets_from_registry(args.targets)
    targets = {row["partId"]: row for row in targets_list}
    fingerprint = target_fingerprint(targets_list)
    dmi = read_json(args.dmi)
    dmi_parts, _dmi_times = valid_dmi_parts(dmi, targets)

    # The history remains available for live diagnosis in rollback mode.  Only
    # its use in score and arrows is disabled by ``enabled`` below.
    copernicus = copernicus_entries(read_json(args.copernicus, optional=True), targets, fingerprint, now)
    policy = read_json(args.policy)
    regional = regional_entries(read_json(args.regional, optional=True), policy, targets, now)
    entries = sorted(copernicus + regional, key=lambda row: (row["validTime"], row["partId"], row["sourceClass"]))

    supplemental_parts = {row["partId"] for row in copernicus}
    regional_parts = {row["partId"] for row in regional}
    source_by_part: dict[str, str] = {}
    for part_id in targets:
        if part_id in dmi_parts:
            source_by_part[part_id] = "dmi-local"
        elif part_id in supplemental_parts:
            source_by_part[part_id] = "copernicus-local"
        elif part_id in regional_parts:
            source_by_part[part_id] = "dmi-regional-proxy"
    counts = {source: sum(value == source for value in source_by_part.values()) for source in ("dmi-local", "copernicus-local", "dmi-regional-proxy")}
    missing = sorted(set(targets) - set(source_by_part))

    raw_projection = {
        "schemaVersion": 1,
        "generatedAt": utc_iso(now),
        "mode": mode,
        "enabled": enabled,
        "controlledLivePilot": True,
        "credentialsIncluded": False,
        "historyPublic": True,
        "retentionHours": RETENTION_HOURS,
        "vectorSemanticsVersion": 4,
        "targetFingerprint": fingerprint,
        "expectedPartCount": len(targets),
        "sourceOrder": ["dmi-local", "copernicus-baltic-nemo", "copernicus-nws-amm15", "dmi-dkss-lf-regional-proxy"],
        "entries": entries,
    }
    safe_report = {
        "schemaVersion": 1,
        "generatedAt": utc_iso(now),
        "mode": mode,
        "enabled": enabled,
        "controlledLivePilot": True,
        "rawVectorsIncluded": False,
        "currentHistoryPublic": True,
        "retentionHours": RETENTION_HOURS,
        "credentialsIncluded": False,
        "targetFingerprint": fingerprint,
        "expectedPartCount": len(targets),
        "verifiedPartCount": len(source_by_part),
        "missingPartCount": len(missing),
        "partsBySelectedSource": counts,
        "supplementalRecordCount": len(entries),
        "copernicusRecordCount": len(copernicus),
        "regionalProxyRecordCount": len(regional),
        "sourceOrder": raw_projection["sourceOrder"],
        "coverageRequirement": len(targets),
        "coverageRequirementMet": len(source_by_part) == len(targets),
        "missingPartIds": missing,
        "rollbackBehavior": control.get("rollbackBehavior"),
    }
    write_json(args.output, raw_projection)
    write_json(args.report, safe_report)
    print(
        f"Kontrolleret live-strømhistorik ({mode}): "
        f"{len(source_by_part)}/{len(targets)} dele; "
        f"DMI {counts['dmi-local']}, Copernicus {counts['copernicus-local']}, "
        f"regionalproxy {counts['dmi-regional-proxy']}."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Live current pilot projection failed: {error}", file=os.sys.stderr)
        raise SystemExit(1)
