#!/usr/bin/env python3
"""Plan exact current acquisition from private donors without fetching weather.

The output is private scheduling input, not a source-stage or release seal.
Only independently validated records contribute. A rejected optional donor
is omitted with an aggregate diagnostic, never re-labelled as usable data.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
from time import monotonic
from typing import Any

from lib.copernicus_current import file_sha256, load_targets
from lib.copernicus_current_donor_bank import (
    legacy_donor_bank, load_copernicus_donor_bank, planning_covered_pairs,
)
from lib.dmi_bulk_storage import read_dmi_bulk_document
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    current_attestation_authorization_from_operational_ledger,
    validate_current_operational_availability_ledger,
)
from lib.copernicus_target_identity import target_fingerprint
from lib.open_meteo_current_fallback import merge_donor_bank, select_donor_records
from lib.weather_acquisition_plan import (
    MAX_PLAN_BYTES, build_current_acquisition_plan, exact_hour,
    planning_regional_covered_pairs, read_current_acquisition_plan,
)


MAX_DONOR_JSON_BYTES = 256 * 1024 * 1024


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--at", required=True)
    parser.add_argument("--targets", type=Path, default=Path("data/live/coastal-parts-v2.json"))
    parser.add_argument("--copernicus-bank", type=Path, default=Path(".cache/copernicus-current-donor-bank.json"))
    parser.add_argument("--copernicus-shadow", type=Path, default=Path(".cache/copernicus-current-shadow.json"))
    parser.add_argument("--copernicus-stage", type=Path, default=Path(".cache/copernicus-current-source-stage.json"))
    parser.add_argument("--open-meteo-bank", type=Path, default=Path(".cache/open-meteo-current-donor-bank.json"))
    parser.add_argument("--open-meteo-legacy", type=Path, default=Path(".cache/open-meteo-current-fallback.json"))
    parser.add_argument("--dmi", type=Path,
                        help="Optional already rebuilt exact-target DMI cache for regional planning")
    parser.add_argument("--regional-shadow", type=Path, default=Path(".cache/current-field-shadow.json"))
    parser.add_argument("--regional-policy", type=Path, default=Path("data/current-regional-proxy-policy.json"))
    parser.add_argument("--output", type=Path, default=Path(".cache/weather-current-acquisition-plan.json"))
    parser.add_argument("--report", type=Path, default=Path("data/diagnostics/weather-acquisition-plan.json"))
    return parser.parse_args()


def optional_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    if path.is_symlink() or not path.is_file():
        raise ValueError("PLANNING_DONOR_FILE_INVALID")
    with path.open("rb") as handle:
        raw = handle.read(MAX_DONOR_JSON_BYTES + 1)
    if not raw or len(raw) > MAX_DONOR_JSON_BYTES:
        raise ValueError("PLANNING_DONOR_SIZE_INVALID")
    value = json.loads(raw.decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("PLANNING_DONOR_DOCUMENT_INVALID")
    return value


def atomic_json(path: Path, document: dict[str, Any], *, readback: Any = None) -> None:
    encoded = (json.dumps(document, ensure_ascii=False, sort_keys=True,
                          separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    if len(encoded) > MAX_PLAN_BYTES:
        raise ValueError("PLANNING_OUTPUT_SIZE_INVALID")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        if readback is not None:
            readback(temporary)
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    reference_text, reference = exact_hour(args.at)
    targets = load_targets(args.targets)  # Authoritative failures must not be hidden.
    # Target loading is parent-zone ordered; provider pair contracts are time/part ordered.
    required = sorted(
        [
            {"partId": target["partId"],
             "validTime": (reference + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")}
            for offset in range(118) for target in targets
        ],
        key=lambda row: (row["validTime"], row["partId"]),
    )
    checked_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    covered: set[tuple[str, str]] = set()
    input_hashes: dict[str, str] = {}
    sources: dict[str, dict[str, Any]] = {}
    verified_dmi_pairs: set[tuple[str, str]] | None = None

    started = monotonic()
    try:
        # Presence of a rejected new bank is NOT permission to resurrect an
        # older projection which may have lost a recorded conflict.
        bank = load_copernicus_donor_bank(args.copernicus_bank, targets=targets)
        legacy = False
        if bank is not None:
            input_hashes["copernicus-bank"] = file_sha256(args.copernicus_bank)
        else:
            shadow = optional_json(args.copernicus_shadow)
            if shadow is not None:
                stage = optional_json(args.copernicus_stage)
                shadow_hash = file_sha256(args.copernicus_shadow)
                bank = legacy_donor_bank(shadow, stage, targets=targets, shadow_sha256=shadow_hash)
                input_hashes["copernicus-shadow"] = shadow_hash
                if stage is not None:
                    input_hashes["copernicus-stage"] = file_sha256(args.copernicus_stage)
                legacy = True
        cp_pairs = planning_covered_pairs(
            bank, targets=targets, production_reference_at=reference_text,
        ) if bank is not None else set()
        covered.update(cp_pairs)
        sources["copernicus"] = {"status": "validated" if bank is not None else "absent",
                                 "coveredPairCount": len(cp_pairs), "legacyDonor": legacy}
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError):
        sources["copernicus"] = {"status": "rejected-optional-donor", "coveredPairCount": 0}
        input_hashes = {key: value for key, value in input_hashes.items()
                        if not key.startswith("copernicus-")}
    sources["copernicus"]["elapsedSeconds"] = round(monotonic() - started, 3)
    # Donor proofs can be large. Keep only their validated pair keys while
    # reading the next provider, not two full banks and DMI simultaneously.
    bank = shadow = stage = None

    started = monotonic()
    try:
        om_bank = optional_json(args.open_meteo_bank)
        legacy = False
        if om_bank is not None:
            input_hashes["open-meteo-bank"] = file_sha256(args.open_meteo_bank)
            # Use the same manifest-bound recovery as acquisition, in memory
            # only. One damaged leaf must not erase all healthy disjoint
            # coverage from the work plan. Broken control/proof still rejects.
            om_bank, _ = merge_donor_bank(
                om_bank, [], targets=targets,
                production_reference_at=reference_text, checkpointed_at=checked_at,
            )
        else:
            previous = optional_json(args.open_meteo_legacy)
            if previous is not None:
                om_bank, _ = merge_donor_bank(
                    None, [previous], targets=targets,
                    production_reference_at=reference_text, checkpointed_at=checked_at,
                )
                input_hashes["open-meteo-legacy"] = file_sha256(args.open_meteo_legacy)
                legacy = True
        records = select_donor_records(
            om_bank, targets=targets, required_pairs=required,
            production_reference_at=reference_text, checkpointed_at=checked_at,
        ) if om_bank is not None else []
        om_pairs = {(row["partId"], row["validTime"]) for row in records}
        covered.update(om_pairs)
        sources["open-meteo"] = {"status": "validated" if om_bank is not None else "absent",
                                  "coveredPairCount": len(om_pairs), "legacyDonor": legacy}
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError):
        sources["open-meteo"] = {"status": "rejected-optional-donor", "coveredPairCount": 0}
        input_hashes = {key: value for key, value in input_hashes.items()
                        if not key.startswith("open-meteo-")}
    sources["open-meteo"]["elapsedSeconds"] = round(monotonic() - started, 3)
    om_bank = previous = records = None

    started = monotonic()
    sources["regional"] = {"status": "requires-current-dmi-ledger", "coveredPairCount": 0}
    sources["dmi"] = {"status": "not-read-before-producer"}
    if args.dmi is not None:
        try:
            dmi = read_dmi_bulk_document(args.dmi)
            ledger = (dmi.get("diagnostics") or {}).get("currentOperationalLedger")
            if not isinstance(ledger, dict) or ledger.get("productionReferenceAt") != reference_text:
                raise ValueError("PLANNING_REGIONAL_DMI_REFERENCE_INVALID")
            authorized, retained = current_attestation_authorization_from_operational_ledger(ledger)
            attestation = canonical_verified_part_current_attestation(
                dmi, targets, reference_text,
                (reference + timedelta(hours=117)).strftime("%Y-%m-%dT%H:00:00Z"),
                authorized, retained,
            )
            validate_current_operational_availability_ledger(
                ledger, attestation, targets, reference,
                reference + timedelta(hours=117), target_fingerprint(targets),
            )
            verified_dmi_pairs = {
                (row["partId"], row["validTime"])
                for row in attestation["verifiedPairs"]
            }
            sources["dmi"] = {
                "status": "validated-exact-target",
                "coveredPairCount": len(verified_dmi_pairs),
                "ownResidualPairCount": ledger["operationalComplementPairCount"],
                "upstreamAbsencePairCount": ledger["upstreamAbsencePairCount"],
                "spatialUnavailablePairCount": ledger["spatialUnavailablePairCount"],
                "ready": ledger["ready"],
            }
            policy = optional_json(args.regional_policy)
            regional_shadow = optional_json(args.regional_shadow)
            if regional_shadow is None:
                sources["regional"] = {"status": "absent", "coveredPairCount": 0}
            else:
                regional_pairs = planning_regional_covered_pairs(
                    dmi_ledger=ledger, dmi_attestation=attestation, targets=targets,
                    regional_shadow=regional_shadow, regional_policy=policy,
                    production_reference_at=reference_text,
                )
                input_hashes["regional-shadow"] = file_sha256(args.regional_shadow)
                input_hashes["regional-policy"] = file_sha256(args.regional_policy)
                input_hashes["regional-dmi-input"] = file_sha256(args.dmi)
                covered.update(regional_pairs)
                sources["regional"] = {"status": "validated", "coveredPairCount": len(regional_pairs)}
        except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError):
            sources["regional"] = {"status": "not-admissible-for-current-ledger", "coveredPairCount": 0}
            if verified_dmi_pairs is None:
                sources["dmi"] = {"status": "not-verified-for-current-target"}
            input_hashes = {key: value for key, value in input_hashes.items()
                            if not key.startswith("regional-")}
        finally:
            dmi = ledger = attestation = regional_shadow = policy = None
    sources["regional"]["elapsedSeconds"] = round(monotonic() - started, 3)

    document = build_current_acquisition_plan(
        targets=targets, production_reference_at=reference_text,
        covered_pairs=covered, source_input_hashes=input_hashes,
    )
    report = {
        "schemaVersion": 1, "kind": "current-acquisition-plan-safe",
        "productionReferenceAt": reference_text, "targetCount": len(targets),
        "requiredPairCount": len(required), "validatedFallbackPairCount": len(covered),
        "validatedUnionPairCount": (len(covered | verified_dmi_pairs)
                                    if verified_dmi_pairs is not None else None),
        "realMissingPairCount": (len(required) - len(covered | verified_dmi_pairs)
                                 if verified_dmi_pairs is not None else None),
        "sources": sources, "planSha256": document["bindingSha256"],
        "planningOnly": True, "sourceAdmission": False, "releaseProof": False,
        "coordinatesIncluded": False, "rawVectorsIncluded": False, "partIdsIncluded": False,
    }
    # Validate the exact bytes before the atomic planning-file replacement.
    atomic_json(args.output, document, readback=lambda path: read_current_acquisition_plan(
        path, production_reference_at=reference_text, targets=targets,
    ))
    atomic_json(args.report, report)
    return document, report


def main() -> int:
    try:
        _, report = build(arguments())
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError):
        print("WEATHER_ACQUISITION_PLAN_INVALID")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
