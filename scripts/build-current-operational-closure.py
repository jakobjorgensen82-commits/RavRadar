#!/usr/bin/env python3
"""Build the private exact 673 x 118 current-source closure sidecar."""
from __future__ import annotations

import argparse
import json
import os
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
    result = build_current_operational_closure(
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
        locked_reference=reference,
    )
    atomic_write(args.output, result["privateProof"])
    atomic_write(args.report, result["safeProjection"])
    safe = result["safeProjection"]
    print(
        "Current operational closure READY: "
        f"pairs={safe['totalPairCount']}; dmi={safe['dmiVerifiedPairCount']}; "
        f"copernicus={safe['copernicusBalticPairCount'] + safe['copernicusAmm15PairCount']}; "
        f"regional={safe['regionalResidualPairCount']}; missing={safe['missingPairCount']}; "
        f"closure={safe['closureId']}."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        code = getattr(error, "code", str(error))
        print(f"Current operational closure failed: {code}")
        raise SystemExit(1)
