#!/usr/bin/env python3
"""Build the private exact 673 x 118 current-source closure sidecar."""
from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import file_sha256, load_targets
from lib.current_operational_closure import build_current_operational_closure
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    processed_source_assets_from_current_operational_ledger,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_DMI = ROOT / "data/live/dmi-bulk-cache.json"
DEFAULT_REGISTRY = ROOT / ".cache/copernicus-current-targets.json"
DEFAULT_COPERNICUS = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_SOURCE_STAGE = ROOT / ".cache/copernicus-current-source-stage.json"
DEFAULT_REGIONAL = ROOT / ".cache/current-field-shadow.json"
DEFAULT_POLICY = ROOT / "data/current-regional-proxy-policy.json"
DEFAULT_OPEN_METEO = ROOT / ".cache/open-meteo-current-fallback.json"
DEFAULT_OUTPUT = ROOT / ".cache/current-operational-closure.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/current-operational-closure.json"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--copernicus", type=Path, default=DEFAULT_COPERNICUS)
    parser.add_argument("--source-stage", type=Path, default=DEFAULT_SOURCE_STAGE)
    parser.add_argument("--regional", type=Path, default=DEFAULT_REGIONAL)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--open-meteo", type=Path, default=DEFAULT_OPEN_METEO)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--at", help="Locked exact UTC production reference")
    return parser.parse_args()


def read_object(path: Path, *, optional: bool = False) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        if optional:
            return {}
        raise RuntimeError("CLOSURE_INPUT_MISSING") from None
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise RuntimeError("CLOSURE_INPUT_INVALID") from None
    if not isinstance(value, dict):
        raise RuntimeError("CLOSURE_INPUT_INVALID")
    return value


def exact_reference(value: Any) -> str:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise RuntimeError("CLOSURE_REFERENCE_INVALID") from None
    if parsed.tzinfo is None:
        raise RuntimeError("CLOSURE_REFERENCE_INVALID")
    parsed = parsed.astimezone(timezone.utc)
    if parsed.minute or parsed.second or parsed.microsecond:
        raise RuntimeError("CLOSURE_REFERENCE_INVALID")
    canonical = parsed.strftime("%Y-%m-%dT%H:00:00Z")
    if value != canonical:
        raise RuntimeError("CLOSURE_REFERENCE_INVALID")
    return canonical


def atomic_write(path: Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(document, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def main() -> int:
    args = arguments()
    targets = load_targets(args.targets)
    dmi = read_object(args.dmi)
    registry = read_object(args.registry)
    copernicus = read_object(args.copernicus)
    source_stage = read_object(args.source_stage, optional=True)
    regional = read_object(args.regional)
    policy = read_object(args.policy)
    open_meteo = read_object(args.open_meteo)
    reference = exact_reference(args.at or registry.get("productionReferenceAt"))
    ledger = ((dmi.get("diagnostics") or {}).get("currentOperationalLedger"))
    if not isinstance(ledger, dict):
        raise RuntimeError("DMI_LEDGER_MISSING")
    allowed_assets = processed_source_assets_from_current_operational_ledger(ledger)
    attestation = canonical_verified_part_current_attestation(
        dmi,
        targets,
        reference,
        registry.get("operationalRangeEndAt"),
        allowed_assets,
    )
    result = build_with_residual_diagnostic(
        targets=targets,
        dmi_ledger=ledger,
        dmi_attestation=attestation,
        dmi_current_input_sha256=file_sha256(args.dmi),
        copernicus_registry=registry,
        copernicus_shadow=copernicus,
        copernicus_shadow_sha256=file_sha256(args.copernicus),
        copernicus_source_stage=source_stage or None,
        regional_shadow=regional,
        regional_policy=policy,
        open_meteo_fallback=open_meteo,
        locked_reference=reference,
    )
    atomic_write(args.output, result["privateProof"])
    atomic_write(args.report, result["safeProjection"])
    safe = result["safeProjection"]
    print(
        "Current operational closure READY: "
        f"pairs={safe['totalPairCount']}; dmi={safe['dmiVerifiedPairCount']}; "
        f"copernicus={safe['copernicusBalticPairCount'] + safe['copernicusAmm15PairCount']}; "
        f"regional={safe['regionalResidualPairCount']}; "
        f"openMeteo={safe['openMeteoPairCount']}; missing={safe['missingPairCount']}; "
        f"closure={safe['closureId']}."
    )
    return 0


def residual_diagnostic(*, ledger, source_stage, policy, targets, reference) -> dict:
    """Aggregate already-validated residual identities; never emit private rows.

    This is a diagnostic, not a source disposition or a readiness certificate.
    It is used only after the closure reached its regional residual checks.
    """
    reference = exact_reference(reference)
    reference_dt = datetime.fromisoformat(reference.replace("Z", "+00:00"))
    if (source_stage.get("status") != "READY"
            or source_stage.get("productionReferenceAt") != reference
            or ledger.get("productionReferenceAt") != reference):
        raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")

    def pairs(rows):
        if not isinstance(rows, list) or len(rows) > 673 * 118:
            raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
        result = set()
        for row in rows:
            part_id = row.get("partId")
            valid_time = exact_reference(row.get("validTime"))
            if not isinstance(part_id, str) or not part_id:
                raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
            result.add((part_id, valid_time))
        if len(result) != len(rows):
            raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
        return result

    missing = pairs(source_stage.get("missingPairs"))
    complement = pairs(ledger.get("operationalComplementPairs"))
    upstream = pairs(ledger.get("upstreamAbsencePairs"))
    spatial = pairs(ledger.get("spatialUnavailablePairs"))
    if not missing <= complement or upstream & spatial:
        raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
    regional_ids = {row["partId"] for row in policy["parts"]}
    target_zones = {row["partId"]: row["parentZoneId"] for row in targets}
    if len(regional_ids) != 8:
        raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
    counts = {}
    for identity in sorted(missing):
        part_id, valid_time = identity
        if part_id not in target_zones:
            raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
        offset = int((datetime.fromisoformat(valid_time.replace("Z", "+00:00"))
                      - reference_dt).total_seconds() // 3600)
        if not 0 <= offset < 118:
            raise RuntimeError("RESIDUAL_DIAGNOSTIC_UNAVAILABLE")
        row = counts.setdefault(offset, {
            "forecastOffsetHours": offset, "missingPairCount": 0,
            "dmiUpstreamAbsentPairCount": 0, "dmiSpatialUnavailablePairCount": 0,
            "dmiUnclassifiedPairCount": 0, "regionalPolicyPairCount": 0,
            "outsideRegionalPolicyPairCount": 0, "feggesundPairCount": 0,
        })
        row["missingPairCount"] += 1
        row[("dmiUpstreamAbsentPairCount" if identity in upstream else
             "dmiSpatialUnavailablePairCount" if identity in spatial else
             "dmiUnclassifiedPairCount")] += 1
        row["regionalPolicyPairCount" if part_id in regional_ids
            else "outsideRegionalPolicyPairCount"] += 1
        row["feggesundPairCount"] += int(target_zones[part_id] == "B05-11")
    return {
        "schemaVersion": 1, "kind": "CURRENT_RESIDUAL_DIAGNOSTIC_ONLY",
        "productionReferenceAt": reference, "missingPairCount": len(missing),
        "byForecastOffset": [counts[key] for key in sorted(counts)],
        "coordinatesIncluded": False, "rawVectorsIncluded": False,
        "partIdsIncluded": False, "pairRefsIncluded": False,
    }


def build_with_residual_diagnostic(**kwargs):
    try:
        return build_current_operational_closure(**kwargs)
    except Exception as error:
        if getattr(error, "code", None) in {
            "DMI_GAP_NOT_FALLBACK_ELIGIBLE", "REGIONAL_RESIDUAL_MISSING",
        }:
            try:
                report = residual_diagnostic(
                    ledger=kwargs["dmi_ledger"],
                    source_stage=kwargs["copernicus_source_stage"],
                    policy=kwargs["regional_policy"], targets=kwargs["targets"],
                    reference=kwargs["locked_reference"],
                )
                print("Current operational residual summary: " + json.dumps(
                    report, separators=(",", ":"), allow_nan=False,
                ))
            except Exception:
                print("Current operational residual summary: UNAVAILABLE")
        raise  # A diagnostic must never convert missing data into readiness.


def safe_error_code(error: Exception) -> str:
    code = getattr(error, "code", str(error))
    return code if isinstance(code, str) and re.fullmatch(r"[A-Z][A-Z0-9_]{1,79}", code) else "UNEXPECTED_CLOSURE_ERROR"


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Current operational closure failed: {safe_error_code(error)}")
        raise SystemExit(1)
