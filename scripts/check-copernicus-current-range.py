#!/usr/bin/env python3
"""Verify one activation-complete Copernicus seal without exposing private rows."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    file_sha256,
    load_targets,
    validate_legacy_shadow_for_migration,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_target_identity import target_fingerprint


DEFAULT_SHADOW = Path(".cache/copernicus-current-shadow.json")
DEFAULT_REGISTRY = Path(".cache/copernicus-current-targets.json")
DEFAULT_DMI = Path("data/live/dmi-bulk-cache.json")
DEFAULT_TARGETS = Path("data/live/coastal-parts-v2.json")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--dmi", type=Path, default=DEFAULT_DMI)
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--at", help="Expected locked productionReferenceAt")
    parser.add_argument("--github-output", type=Path)
    parser.add_argument(
        "--require-complete",
        action="store_true",
        help="Fail unless the exact target/DMI-bound COMPLETE range seal exists",
    )
    parser.add_argument(
        "--allow-nonmatching-seal",
        action="store_true",
        help=(
            "Report a valid cache without the locked reference/status seal as incomplete "
            "so a bounded acquisition may replace it"
        ),
    )
    return parser.parse_args()


def canonical_time(value: Any) -> str:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Copernicus range-check time must include a timezone")
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def inspect(
    shadow_path: Path,
    registry_path: Path,
    dmi_path: Path,
    targets_path: Path,
    expected_reference: str | None,
    allow_nonmatching_seal: bool = False,
) -> dict[str, Any]:
    if not shadow_path.exists() or shadow_path.stat().st_size <= 0:
        return {"cachePresent": False, "completeRangePresent": False, "requiredPairCount": 0}
    registry = validate_target_registry(json.loads(registry_path.read_text(encoding="utf-8")))
    operational_contract = registry["schemaVersion"] == 3
    required_pair_count = (
        registry["operationalRequiredPairCount"]
        if operational_contract else registry["requiredPairCount"]
    )
    reference = canonical_time(registry["productionReferenceAt"])
    if expected_reference is not None and canonical_time(expected_reference) != reference:
        raise RuntimeError("Requested range-check reference does not match the locked target registry")
    if file_sha256(dmi_path) != registry["dmiCurrentInputSha256"]:
        raise RuntimeError("DMI input bytes no longer match the sealed gap matrix")
    targets = load_targets(targets_path)
    if target_fingerprint(targets) != registry["targetRegistrySha256"]:
        raise RuntimeError("Central target registry no longer matches the sealed gap matrix")
    target_identities = {row["partId"]: row for row in targets}
    document = json.loads(shadow_path.read_text(encoding="utf-8"))
    if document.get("schemaVersion") == 1 and not isinstance(document.get("schemaVersion"), bool):
        validate_legacy_shadow_for_migration(document)
        return {
            "cachePresent": True,
            "completeRangePresent": False,
            "operationalSealPresent": False,
            "productionReferenceAt": reference,
            "requiredPairCount": required_pair_count,
        }
    cache = validate_shadow(
        document,
        target_identities,
        require_collection=not allow_nonmatching_seal,
    )
    expected_status = "OPERATIONAL_COMPLETE" if operational_contract else "COMPLETE"
    matches = [
        row for row in cache["collections"]
        if row["productionReferenceAt"] == reference and row["status"] == expected_status
    ]
    if not matches and allow_nonmatching_seal:
        return {
            "cachePresent": True,
            "completeRangePresent": False,
            "operationalSealPresent": False,
            "productionReferenceAt": reference,
            "requiredPairCount": required_pair_count,
        }
    if len(matches) != 1:
        raise RuntimeError(
            "Private Copernicus cache does not contain exactly one activation-complete "
            "seal for the locked reference"
        )
    collection = matches[0]
    expected = ({
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "operationalRequiredPairsSha256": registry["operationalRequiredPairsSha256"],
        "operationalRequiredPairCount": registry["operationalRequiredPairCount"],
        "operationalRangeStartAt": registry["operationalRangeStartAt"],
        "operationalRangeEndAt": registry["operationalRangeEndAt"],
        "advisoryHistoryRequiredPairsSha256": registry["advisoryHistoryRequiredPairsSha256"],
        "advisoryHistoryRequiredPairCount": registry["advisoryHistoryRequiredPairCount"],
        "advisoryHistoryStartAt": registry["advisoryHistoryStartAt"],
        "advisoryHistoryEndAt": registry["advisoryHistoryEndAt"],
    } if operational_contract else {
        "targetRegistrySha256": registry["targetRegistrySha256"],
        "dmiCurrentInputSha256": registry["dmiCurrentInputSha256"],
        "dmiVerifierContractId": registry["dmiVerifierContractId"],
        "requiredPairsSha256": registry["requiredPairsSha256"],
        "requiredPairCount": registry["requiredPairCount"],
        "rangeStartAt": registry["rangeStartAt"],
        "rangeEndAt": registry["rangeEndAt"],
    })
    if any(collection.get(key) != value for key, value in expected.items()):
        raise RuntimeError("Private Copernicus seal does not match the exact target/DMI gap matrix")
    return {
        "cachePresent": True,
        "completeRangePresent": True,
        "operationalSealPresent": True,
        "productionReferenceAt": reference,
        "requiredPairCount": (
            collection["operationalRequiredPairCount"]
            if operational_contract else collection["requiredPairCount"]
        ),
        "advisoryHistoryAvailablePairCount": (
            collection["advisoryHistoryAvailablePairCount"] if operational_contract else None
        ),
        "advisoryHistoryMissingPairCount": (
            collection["advisoryHistoryMissingPairCount"] if operational_contract else None
        ),
        "advisoryHistoryComplete": (
            collection["advisoryHistoryComplete"] if operational_contract else True
        ),
        "acquisitionCount": len(collection["acquisitionIds"]),
        "recordCount": len(cache["records"]),
    }


def write_outputs(path: Path | None, state: dict[str, Any]) -> None:
    if path is None:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"cache_present={'true' if state['cachePresent'] else 'false'}\n")
        handle.write(f"complete_range_present={'true' if state['completeRangePresent'] else 'false'}\n")
        handle.write(f"operational_seal_present={'true' if state.get('operationalSealPresent', state['completeRangePresent']) else 'false'}\n")
        if state.get("productionReferenceAt"):
            handle.write(f"production_reference_at={state['productionReferenceAt']}\n")
        handle.write(f"required_pair_count={state['requiredPairCount']}\n")
        if state.get("advisoryHistoryAvailablePairCount") is not None:
            handle.write(f"advisory_history_available_pair_count={state['advisoryHistoryAvailablePairCount']}\n")
            handle.write(f"advisory_history_missing_pair_count={state['advisoryHistoryMissingPairCount']}\n")
            handle.write(f"advisory_history_complete={'true' if state['advisoryHistoryComplete'] else 'false'}\n")


def main() -> int:
    args = arguments()
    state = inspect(
        args.shadow,
        args.registry,
        args.dmi,
        args.targets,
        args.at,
        args.allow_nonmatching_seal,
    )
    write_outputs(args.github_output, state)
    if args.require_complete and not state["completeRangePresent"]:
        raise RuntimeError("The exact activation-complete Copernicus seal is required but absent")
    if state["completeRangePresent"]:
        print(
            "Private Copernicus range seal is COMPLETE/OPERATIONAL_COMPLETE: "
            f"{state['requiredPairCount']} exact DMI-gap pairs, "
            f"{state['acquisitionCount']} acquisitions."
        )
    else:
        print("Private Copernicus range cache is absent, legacy or unsealed; a complete acquisition is required")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Private Copernicus range inspection failed: {error}")
        raise SystemExit(1)
