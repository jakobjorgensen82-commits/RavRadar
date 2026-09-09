#!/usr/bin/env python3
"""Verify one activation-complete Copernicus seal without exposing private rows."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib.copernicus_current import (
    canonical_sha256,
    file_sha256,
    load_targets,
    required_pairs_sha256,
    validate_legacy_shadow_for_migration,
    validate_shadow,
    validate_target_registry,
)
from lib.copernicus_current_source_stage import (
    SOURCE_STAGE_PROGRESS_STATUS,
    SOURCE_STAGE_STATUS,
    validate_reusable_source_stage,
    select_source_order_admissible_records,
    stage_positive_evidence,
)
from lib.copernicus_current_donor_bank import DEFAULT_DONOR_BANK, load_copernicus_donor_bank, projected_donor_shadow
from lib.copernicus_target_identity import target_fingerprint


DEFAULT_SHADOW = Path(".cache/copernicus-current-shadow.json")
DEFAULT_SOURCE_STAGE = Path(".cache/copernicus-current-source-stage.json")
DEFAULT_REGISTRY = Path(".cache/copernicus-current-targets.json")
DEFAULT_DMI = Path("data/live/dmi-bulk-cache.json")
DEFAULT_TARGETS = Path("data/live/coastal-parts-v2.json")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--source-stage", type=Path)
    parser.add_argument("--donor-bank", type=Path)
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
        "--require-source-stage-ready",
        action="store_true",
        help=(
            "Fail unless a current target/DMI/shadow-bound source-stage READY "
            "sidecar exists, including beside an operational COMPLETE seal"
        ),
    )
    parser.add_argument(
        "--require-source-stage-reusable",
        action="store_true",
        help=(
            "Fail unless a current target/DMI/shadow-bound READY or "
            "IN_PROGRESS source-stage sidecar exists"
        ),
    )
    parser.add_argument(
        "--allow-nonmatching-seal",
        action="store_true",
        help=(
            "Report a valid cache without the locked reference/status seal as incomplete "
            "so a bounded acquisition may replace it"
        ),
    )
    parser.add_argument(
        "--allow-invalid-shadow-as-absent",
        action="store_true",
        help=(
            "After registry, DMI and central-target validation, classify only "
            "an invalid private shadow as absent so the acquisition runner can "
            "quarantine and replace it"
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
    source_stage_path: Path | None = None,
    allow_invalid_shadow_as_absent: bool = False,
    donor_bank_path: Path | None = None,
) -> dict[str, Any]:
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
    def bank_requires_projection(*, invalid: bool = False) -> dict[str, Any]:
        return {
            "cachePresent": bool(shadow_path.exists()),
            "completeRangePresent": False, "operationalSealPresent": False,
            "sourceStagePresent": bool(source_stage_path and source_stage_path.exists()),
            "sourceStageReady": False, "sourceStageReusable": False,
            "donorBankInvalid": invalid, "donorProjectionRequired": True,
            "productionReferenceAt": reference, "requiredPairCount": required_pair_count,
        }

    bank = None
    if operational_contract:
        bank_path = donor_bank_path or (DEFAULT_DONOR_BANK if shadow_path == DEFAULT_SHADOW
                                        else shadow_path.with_name("copernicus-current-donor-bank.json"))
        try:
            bank = load_copernicus_donor_bank(bank_path, targets=targets)
        except (OSError, UnicodeError, TypeError, ValueError, RuntimeError):
            # A rejected bank cannot be bypassed by an older READY projection.
            # The runner owns quarantine and fresh progress, not this reader.
            return bank_requires_projection(invalid=True)

    def bank_matches_stage(stage: dict[str, Any] | None) -> bool:
        if bank is None:
            return True
        if stage is None:
            return False
        projection = projected_donor_shadow(bank, targets=targets)
        refs, missing, _ = select_source_order_admissible_records(
            registry["operationalRequiredPairs"], projection["acquisitions"],
            projection["records"], datetime.fromisoformat(reference.replace("Z", "+00:00")),
            targets, [], **stage_positive_evidence(bank))
        return (stage["selectedRecordRefsSha256"] == canonical_sha256(refs)
                and stage["missingPairsSha256"] == required_pairs_sha256(missing))

    if not shadow_path.exists() or shadow_path.stat().st_size <= 0:
        return {
            "cachePresent": False,
            "completeRangePresent": False,
            "operationalSealPresent": False,
            "sourceStagePresent": bool(
                source_stage_path and source_stage_path.exists()
            ),
            "sourceStageReady": False,
            "sourceStageReusable": False,
            "shadowInvalid": False,
            "productionReferenceAt": reference,
            "requiredPairCount": required_pair_count,
        }
    try:
        document = json.loads(shadow_path.read_text(encoding="utf-8"))
        if not isinstance(document, dict):
            raise ValueError("Private Copernicus shadow is not an object")
        if (
            document.get("schemaVersion") == 1
            and not isinstance(document.get("schemaVersion"), bool)
        ):
            validate_legacy_shadow_for_migration(document)
            return {
                "cachePresent": True,
                "completeRangePresent": False,
                "operationalSealPresent": False,
                "sourceStagePresent": bool(
                    source_stage_path and source_stage_path.exists()
                ),
                "sourceStageReady": False,
                "sourceStageReusable": False,
                "shadowInvalid": False,
                "productionReferenceAt": reference,
                "requiredPairCount": required_pair_count,
            }
        cache = validate_shadow(
            document,
            target_identities,
            require_collection=False,
        )
    except (UnicodeError, json.JSONDecodeError, TypeError, ValueError):
        if not allow_invalid_shadow_as_absent:
            raise
        return {
            "cachePresent": False,
            "completeRangePresent": False,
            "operationalSealPresent": False,
            "sourceStagePresent": bool(
                source_stage_path and source_stage_path.exists()
            ),
            "sourceStageReady": False,
            "sourceStageReusable": False,
            "shadowInvalid": True,
            "productionReferenceAt": reference,
            "requiredPairCount": required_pair_count,
        }
    expected_status = "OPERATIONAL_COMPLETE" if operational_contract else "COMPLETE"
    matches = [
        row for row in cache["collections"]
        if row["productionReferenceAt"] == reference and row["status"] == expected_status
        and (not allow_nonmatching_seal
             or row.get("dmiCurrentInputSha256") == registry["dmiCurrentInputSha256"])
    ]
    if not matches:
        source_stage_present = bool(
            source_stage_path
            and source_stage_path.exists()
            and source_stage_path.stat().st_size > 0
        )
        validated_stage: dict[str, Any] | None = None
        if source_stage_present:
            try:
                validated_stage = validate_reusable_source_stage(
                    json.loads(source_stage_path.read_text(encoding="utf-8")),
                    registry=registry,
                    shadow=cache,
                    target_identities=target_identities,
                    shadow_sha256=file_sha256(shadow_path),
                    allow_rebase=allow_nonmatching_seal,
                )
            except (KeyError, TypeError, ValueError, RuntimeError):
                if not allow_nonmatching_seal:
                    raise
        if validated_stage is not None:
            if not bank_matches_stage(validated_stage):
                return bank_requires_projection()
            stage_ready = validated_stage["status"] == SOURCE_STAGE_STATUS
            return {
                "cachePresent": True,
                "completeRangePresent": False,
                "operationalSealPresent": False,
                "sourceStagePresent": True,
                "sourceStageReady": stage_ready,
                "sourceStageReusable": True,
                "sourceStageStatus": validated_stage["status"],
                "productionReferenceAt": reference,
                "requiredPairCount": required_pair_count,
                "selectedRecordRefCount": validated_stage["selectedRecordRefCount"],
                "missingPairCount": validated_stage["missingPairCount"],
            }
        if allow_nonmatching_seal:
            return {
                "cachePresent": True,
                "completeRangePresent": False,
                "operationalSealPresent": False,
                "sourceStagePresent": source_stage_present,
                "sourceStageReady": False,
                "sourceStageReusable": False,
                "productionReferenceAt": reference,
                "requiredPairCount": required_pair_count,
            }
        if cache["collections"]:
            raise RuntimeError(
                "Private Copernicus cache does not contain exactly one activation-complete "
                "seal for the locked reference"
            )
        raise RuntimeError(
            "Private Copernicus cache has no activation-complete seal and no valid "
            "source-stage READY sidecar for the locked reference"
        )
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
    source_stage_present = bool(
        source_stage_path
        and source_stage_path.exists()
        and source_stage_path.stat().st_size > 0
    )
    validated_stage: dict[str, Any] | None = None
    if operational_contract and source_stage_present:
        try:
            validated_stage = validate_reusable_source_stage(
                json.loads(source_stage_path.read_text(encoding="utf-8")),
                registry=registry,
                shadow=cache,
                target_identities=target_identities,
                shadow_sha256=file_sha256(shadow_path),
                allow_rebase=allow_nonmatching_seal,
            )
        except (KeyError, TypeError, ValueError, RuntimeError):
            if not allow_nonmatching_seal:
                raise
    if validated_stage is not None and (
        validated_stage.get("status") != SOURCE_STAGE_STATUS
        or validated_stage.get("missingPairCount") != 0
        or validated_stage.get("selectedRecordRefCount") != required_pair_count
        or validated_stage.get("selectedRecordRefsSha256")
            != collection.get("operationalRecordRefsSha256")
    ):
        if not allow_nonmatching_seal:
            raise RuntimeError(
                "Complete Copernicus seal has mismatching source-stage evidence"
            )
        validated_stage = None
    if not bank_matches_stage(validated_stage):
        return bank_requires_projection()
    return {
        "cachePresent": True,
        "completeRangePresent": True,
        "operationalSealPresent": True,
        "sourceStagePresent": source_stage_present,
        "sourceStageReady": (
            validated_stage is not None
            and validated_stage.get("status") == SOURCE_STAGE_STATUS
            if operational_contract else True
        ),
        "sourceStageReusable": (
            validated_stage is not None if operational_contract else True
        ),
        "sourceStageStatus": (
            validated_stage.get("status") if validated_stage is not None else None
        ),
        "productionReferenceAt": reference,
        "requiredPairCount": (
            collection["operationalRequiredPairCount"]
            if operational_contract else collection["requiredPairCount"]
        ),
        "selectedRecordRefCount": (
            collection["operationalRequiredPairCount"]
            if operational_contract else collection["requiredPairCount"]
        ),
        "missingPairCount": 0,
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
        handle.write(f"source_stage_ready={'true' if state.get('sourceStageReady') else 'false'}\n")
        handle.write(f"source_stage_reusable={'true' if state.get('sourceStageReusable') else 'false'}\n")
        handle.write(f"shadow_invalid={'true' if state.get('shadowInvalid') else 'false'}\n")
        handle.write(f"donor_bank_invalid={'true' if state.get('donorBankInvalid') else 'false'}\n")
        handle.write(f"donor_projection_required={'true' if state.get('donorProjectionRequired') else 'false'}\n")
        handle.write(
            "source_stage_status="
            f"{state.get('sourceStageStatus') or 'ABSENT'}\n"
        )
        if state.get("productionReferenceAt"):
            handle.write(f"production_reference_at={state['productionReferenceAt']}\n")
        handle.write(f"required_pair_count={state['requiredPairCount']}\n")
        if state.get("selectedRecordRefCount") is not None:
            handle.write(f"selected_record_ref_count={state['selectedRecordRefCount']}\n")
            handle.write(f"missing_pair_count={state['missingPairCount']}\n")
        if state.get("advisoryHistoryAvailablePairCount") is not None:
            handle.write(f"advisory_history_available_pair_count={state['advisoryHistoryAvailablePairCount']}\n")
            handle.write(f"advisory_history_missing_pair_count={state['advisoryHistoryMissingPairCount']}\n")
            handle.write(f"advisory_history_complete={'true' if state['advisoryHistoryComplete'] else 'false'}\n")


def main() -> int:
    args = arguments()
    source_stage_path = args.source_stage
    if (
        args.require_source_stage_ready
        or args.require_source_stage_reusable
    ) and source_stage_path is None:
        source_stage_path = DEFAULT_SOURCE_STAGE
    state = inspect(
        args.shadow,
        args.registry,
        args.dmi,
        args.targets,
        args.at,
        args.allow_nonmatching_seal,
        source_stage_path,
        args.allow_invalid_shadow_as_absent,
        args.donor_bank,
    )
    write_outputs(args.github_output, state)
    if args.require_complete and not state["completeRangePresent"]:
        raise RuntimeError("The exact activation-complete Copernicus seal is required but absent")
    if args.require_source_stage_ready and not state.get("sourceStageReady"):
        raise RuntimeError("The exact Copernicus source-stage READY evidence is required but absent")
    if (
        args.require_source_stage_reusable
        and not state.get("sourceStageReusable")
    ):
        raise RuntimeError(
            "Exact Copernicus READY/IN_PROGRESS source-stage evidence is required but absent"
        )
    if state["completeRangePresent"]:
        print(
            "Private Copernicus range seal is COMPLETE/OPERATIONAL_COMPLETE: "
            f"{state['requiredPairCount']} exact DMI-gap pairs, "
            f"{state['acquisitionCount']} acquisitions."
        )
    elif state.get("sourceStageReady"):
        print(
            "Private Copernicus source stage is READY: "
            f"{state['selectedRecordRefCount']}/{state['requiredPairCount']} exact DMI-gap pairs selected; "
            f"{state['missingPairCount']} remain after every applicable pinned product."
        )
    elif state.get("sourceStageReusable") and state.get("sourceStageStatus") == SOURCE_STAGE_PROGRESS_STATUS:
        print(
            "Private Copernicus source stage is valid IN_PROGRESS evidence: "
            f"{state['selectedRecordRefCount']}/{state['requiredPairCount']} exact DMI-gap pairs selected; "
            f"{state['missingPairCount']} remain and only documented attempts may be skipped."
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
