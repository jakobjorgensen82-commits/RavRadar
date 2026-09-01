#!/usr/bin/env python3
"""Regression for the attested official-DKSS Copernicus complement."""
from __future__ import annotations

import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import validate_target_registry
from lib.dmi_native_provenance import (
    canonical_verified_part_current_attestation,
    part_time_pairs_sha256,
    sanitized_current_attestation,
    strict_verified_part_current_pair_count,
    validate_current_operational_ledger,
)


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-copernicus-target-registry.py"
REFERENCE = datetime(2026, 8, 21, 8, tzinfo=timezone.utc)
AT = REFERENCE.isoformat().replace("+00:00", "Z")
MODEL_RUN = (REFERENCE - timedelta(hours=3)).isoformat().replace("+00:00", "Z")
STALE_MODEL_RUN = (REFERENCE - timedelta(hours=6)).isoformat().replace("+00:00", "Z")

# The ledger builder is pure Python after import. Keep this contract test
# independent of the platform GRIB DLL.
eccodes = types.ModuleType("eccodes")
for name in (
    "codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
    "codes_grib_new_from_file", "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
spec = importlib.util.spec_from_file_location(
    "ravradar_update_dmi_bulk_for_registry_test",
    ROOT / "scripts/update-dmi-bulk.py",
)
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)


def utc(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def official_asset(collection: str, valid: str) -> dict:
    return {
        "collection": collection,
        "modelRun": MODEL_RUN,
        "validTime": valid,
        "itemId": f"item-{collection}-{valid}",
        "assetIdentitySha256": "b" * 64,
        "assetSizeBytes": 1024,
        "itemCreatedAt": AT,
        "itemUpdatedAt": None,
    }


def source(
    target: dict,
    valid_time: datetime,
    *,
    model_run: str = MODEL_RUN,
) -> dict:
    valid = utc(valid_time)
    parsed_run = datetime.fromisoformat(model_run.replace("Z", "+00:00"))
    lead = (valid_time - parsed_run).total_seconds() / 3600
    asset = official_asset("dkss_idw", valid)
    return {
        "provider": "dmi",
        "fallback": False,
        "collection": "dkss_idw",
        "collectionFamily": "marine",
        "component": "current",
        "componentKind": "ocean-current-vector",
        "fieldSet": ["current-u", "current-v"],
        "optionalFieldSet": [],
        "modelRun": model_run,
        "nativeValidTime": valid,
        "leadTimeHours": lead,
        "entityId": f"PART::{target['partId']}",
        "parentZoneId": target["parentZoneId"],
        "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point",
        "samplingPoint": target["waterPoint"],
        "gridPoint": target["waterPoint"],
        "gridDefinitionSha256": "a" * 64,
        "distanceKm": 0.0,
        "spatialSemanticsVersion": 1,
        "spatialSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
        "itemId": asset["itemId"],
        "assetIdentitySha256": asset["assetIdentitySha256"],
        "assetSizeBytes": asset["assetSizeBytes"],
        "acquiredAt": AT,
        "contentLengthBytes": asset["assetSizeBytes"],
        "contentSha256": "d" * 64,
        "itemCreatedAt": asset["itemCreatedAt"],
        "verticalLayer": "depthbelowsea:5",
        "verticalLayerRankM": 5.0,
        "vectorSelection": "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer",
        "vectorSemanticsVersion": 3,
    }


def processed_run(
    collection: str,
    official_hours: list[str],
    targets: list[dict],
    *,
    spatial_unavailable_pairs: set[tuple[str, str]] | None = None,
    missing_proofs: set[tuple[str, str]] | None = None,
) -> dict:
    processing_signature = f"test-{collection}"
    target_ids = sorted(str(target["partId"]) for target in targets)
    target_registry_sha256 = producer.target_fingerprint(targets)
    unavailable = set(spatial_unavailable_pairs or set())
    missing = set(missing_proofs or set())
    processed_steps = {}
    for valid_time in official_hours:
        source_asset = {
            **official_asset(collection, valid_time),
            "acquiredAt": AT,
            "contentLengthBytes": 1024,
            "contentSha256": "d" * 64,
        }
        # The synthetic public cache selects dkss_idw. Other collections are
        # terminally processed but do not claim that their bytes supplied a
        # public pair. Explicit spatial gaps are unavailable in every source.
        unavailable_part_ids = [
            part_id
            for part_id in target_ids
            if collection != "dkss_idw"
            or (part_id, valid_time) in unavailable
        ]
        step = {
            "complete": True,
            "recognizedParameters": [
                "sea-mean-deviation",
                "current-u",
                "current-v",
            ],
            "zonesTouched": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": processing_signature,
            "sourceAsset": source_asset,
        }
        if (collection, valid_time) not in missing:
            step["currentPartOutcomeProof"] = (
                producer.build_current_part_outcome_proof(
                    unavailable_part_ids,
                    target_ids,
                    target_registry_sha256,
                    processing_signature,
                    source_asset,
                )
            )
        processed_steps[valid_time] = step
    return {
        "referenceTime": MODEL_RUN,
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": processing_signature,
        "processedSteps": processed_steps,
    }


def dmi_document(
    targets: list[dict],
    *,
    upstream_absent: set[str] | None = None,
    verified_hours: set[str] | None = None,
    stale_pairs: set[tuple[str, str]] | None = None,
    spatial_unavailable_pairs: set[tuple[str, str]] | None = None,
    missing_proofs: set[tuple[str, str]] | None = None,
) -> dict:
    required_hours = producer.operational_current_valid_times(REFERENCE)
    absent = set(upstream_absent or set())
    official_hours = [hour for hour in required_hours if hour not in absent]
    verified = set(official_hours if verified_hours is None else verified_hours)
    stale = set(stale_pairs or set())
    spatial_unavailable = set(spatial_unavailable_pairs or set())
    terminal_unavailable = spatial_unavailable | {
        (str(target["partId"]), valid_time)
        for target in targets
        for valid_time in official_hours
        if valid_time not in verified
    }
    zones = {}
    for target in targets:
        hourly = {}
        for valid_time in sorted(verified):
            if (target["partId"], valid_time) in spatial_unavailable:
                continue
            parsed = datetime.fromisoformat(valid_time.replace("Z", "+00:00"))
            model_run = (
                STALE_MODEL_RUN
                if (target["partId"], valid_time) in stale
                else MODEL_RUN
            )
            hourly[valid_time] = {
                "time": valid_time,
                "current-u": 0.1,
                "current-v": 0.2,
                "sources": {
                    "current": source(target, parsed, model_run=model_run),
                },
            }
        zones[f"PART::{target['partId']}"] = {
            "samplingPoint": target["waterPoint"],
            "hourly": hourly,
            "gridPoints": {},
        }
    document = {
        "zones": zones,
        "runs": {
            collection: processed_run(
                collection,
                official_hours,
                targets,
                spatial_unavailable_pairs=terminal_unavailable,
                missing_proofs=missing_proofs,
            )
            for collection in sorted(producer.MARINE_COLLECTIONS)
        },
        "diagnostics": {},
    }
    catalogs = {
        collection: (
            MODEL_RUN,
            [official_asset(collection, valid_time) for valid_time in official_hours],
            {
                "catalogInventoryComplete": True,
                "requiredHorizonEndCovered": True,
                "requiredRowsTruncatedByAssetLimit": 0,
                "officialRequiredValidTimeCount": len(official_hours),
                "officialRequiredValidTimes": official_hours,
                "officialRequiredAssets": [
                    official_asset(collection, valid_time)
                    for valid_time in official_hours
                ],
            },
        )
        for collection in sorted(producer.MARINE_COLLECTIONS)
    }
    document["diagnostics"]["currentOperationalLedger"] = (
        producer.build_current_operational_ledger(
            document,
            targets,
            REFERENCE,
            catalogs,
        )
    )
    return document


def run(folder: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable,
        "-B",
        str(SCRIPT),
        "--targets",
        str(folder / "targets.json"),
        "--dmi",
        str(folder / "dmi.json"),
        "--output",
        str(folder / "selected.json"),
        "--at",
        AT,
        *extra,
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-targets-") as raw:
    folder = Path(raw)
    parts = [{
        "partId": "dmi-ok",
        "sourceZoneId": "Z1",
        "name": "DMI",
        "waterPoint": [9.0, 57.0],
    }]
    targets = [{
        "partId": part["partId"],
        "parentZoneId": part["sourceZoneId"],
        "name": part["name"],
        "waterPoint": part["waterPoint"],
    } for part in parts]
    write(folder / "targets.json", {"partCount": 1, "zones": {"Z1": parts}})

    # One exact official hour is absent from every selected mature DKSS run.
    # It is the only operational Copernicus target; no percentage threshold is
    # involved and the other 117 hours have canonical DMI evidence.
    gap_time = utc(REFERENCE + timedelta(hours=5))
    dmi = dmi_document(targets, upstream_absent={gap_time})
    gap_ledger = dmi["diagnostics"]["currentOperationalLedger"]
    assert gap_ledger["ready"] is True
    assert gap_ledger["upstreamAbsencePairs"] == [{
        "partId": "dmi-ok",
        "validTime": gap_time,
    }]
    assert gap_ledger["operationalComplementPairs"] == gap_ledger["upstreamAbsencePairs"]
    write(folder / "dmi.json", dmi)

    github_output = folder / "github-output.txt"
    targeted = run(folder, "--nearest-dmi-hour", "--github-output", str(github_output))
    assert targeted.returncode == 0, targeted.stdout + targeted.stderr
    selected = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert selected["schemaVersion"] == 3 and selected["matrixHourCount"] == 166
    assert selected["operationalHourCount"] == 118
    assert selected["advisoryHistoryHourCount"] == 48
    assert selected["productionReferenceAt"] == AT and selected["targetHour"] == AT
    assert selected["rangeStartAt"] == utc(REFERENCE - timedelta(hours=48))
    assert selected["rangeEndAt"] == utc(REFERENCE + timedelta(hours=117))
    assert selected["totalPairCount"] == 166
    assert selected["dmiVerifiedPairCount"] == 117
    assert selected["operationalTotalPairCount"] == 118
    assert selected["operationalDmiVerifiedPairCount"] == 117
    assert selected["advisoryHistoryTotalPairCount"] == 48
    assert selected["advisoryHistoryDmiVerifiedPairCount"] == 0
    assert strict_verified_part_current_pair_count(
        dmi,
        targets,
        REFERENCE,
        REFERENCE + timedelta(hours=117),
    ) == 117
    assert selected["operationalRequiredPairs"] == [{
        "partId": "dmi-ok",
        "validTime": gap_time,
    }]
    assert selected["operationalRequiredPairCount"] == 1
    assert selected["advisoryHistoryRequiredPairCount"] == 48
    assert selected["partCount"] == 1
    assert selected["coordinatesChanged"] is False
    output_values = dict(
        line.split("=", 1)
        for line in github_output.read_text(encoding="utf-8").splitlines()
    )
    assert output_values["target_hour"] == AT
    assert output_values["required_pair_count"] == "1"
    assert output_values["advisory_history_required_pair_count"] == "48"

    # One exact part may be unavailable in all three fully processed official
    # sources while another part verifies the same hour. The national guard
    # remains green and only that terminal spatial gap enters the complement.
    spatial_part = {
        "partId": "dmi-spatial",
        "sourceZoneId": "Z2",
        "name": "Spatial gap",
        "waterPoint": [10.0, 56.0],
    }
    spatial_parts = [parts[0], spatial_part]
    spatial_targets = [{
        "partId": part["partId"],
        "parentZoneId": part["sourceZoneId"],
        "name": part["name"],
        "waterPoint": part["waterPoint"],
    } for part in spatial_parts]
    spatial_time = utc(REFERENCE + timedelta(hours=7))
    spatial_pair = {
        "partId": "dmi-spatial",
        "validTime": spatial_time,
    }
    spatial_dmi = dmi_document(
        spatial_targets,
        spatial_unavailable_pairs={("dmi-spatial", spatial_time)},
    )
    spatial_ledger = spatial_dmi["diagnostics"]["currentOperationalLedger"]
    assert spatial_ledger["ready"] is True
    assert spatial_ledger["failureCodes"] == []
    assert spatial_ledger["upstreamAbsencePairs"] == []
    assert spatial_ledger["spatialUnavailablePairs"] == [spatial_pair]
    assert spatial_ledger["operationalComplementPairs"] == [spatial_pair]
    write(folder / "targets.json", {
        "partCount": 2,
        "zones": {"Z1": [parts[0]], "Z2": [spatial_part]},
    })
    write(folder / "dmi.json", spatial_dmi)
    selected_spatial = run(folder)
    assert selected_spatial.returncode == 0, (
        selected_spatial.stdout + selected_spatial.stderr
    )
    spatial_registry = json.loads(
        (folder / "selected.json").read_text(encoding="utf-8")
    )
    assert spatial_registry["operationalDmiVerifiedPairCount"] == 235
    assert spatial_registry["operationalRequiredPairs"] == [spatial_pair]
    assert spatial_registry["operationalRequiredPairCount"] == 1

    # Outcome proof tampering is detected independently by the selector-side
    # validator; an old authorized complement cannot survive the mutation.
    tampered_proof = copy.deepcopy(spatial_dmi)
    tampered_rows = next(
        row["validTimes"]
        for row in tampered_proof["diagnostics"]["currentOperationalLedger"]["collections"]
        if row["collection"] == "dkss_idw"
    )
    tampered_row = next(
        row for row in tampered_rows if row["validTime"] == spatial_time
    )
    tampered_row["partOutcomeProof"]["outcomesSha256"] = "f" * 64
    write(folder / "dmi.json", tampered_proof)
    refused_proof_tamper = run(folder)
    assert refused_proof_tamper.returncode != 0
    assert "outcome proof" in refused_proof_tamper.stdout.lower()

    # A parser/grid exception cannot manufacture negative evidence. Its absent
    # terminal proof is LOCALLY_SKIPPED, makes the ledger red, and authorizes no
    # Copernicus pair even though the public row itself still exists.
    missing_proof_dmi = dmi_document(
        targets,
        missing_proofs={("dkss_idw", AT)},
    )
    missing_proof_ledger = (
        missing_proof_dmi["diagnostics"]["currentOperationalLedger"]
    )
    assert missing_proof_ledger["ready"] is False
    assert "LOCALLY_SKIPPED_DKSS_ASSET" in missing_proof_ledger["failureCodes"]
    assert missing_proof_ledger["operationalComplementPairs"] == []
    write(folder / "targets.json", {"partCount": 1, "zones": {"Z1": parts}})
    write(folder / "dmi.json", missing_proof_dmi)
    refused_missing_proof = run(folder)
    assert refused_missing_proof.returncode != 0

    # A stale pair from a non-selected run is a local/unattested processing gap,
    # never negative upstream evidence. It blocks readiness and cannot become a
    # Copernicus target, even when another part verifies that official hour.
    stale_parts = [
        parts[0],
        {
            "partId": "dmi-stale",
            "sourceZoneId": "Z2",
            "name": "Stale DMI",
            "waterPoint": [10.0, 56.0],
        },
    ]
    stale_targets = [{
        "partId": part["partId"],
        "parentZoneId": part["sourceZoneId"],
        "name": part["name"],
        "waterPoint": part["waterPoint"],
    } for part in stale_parts]
    stale_time = utc(REFERENCE + timedelta(hours=7))
    stale_dmi = dmi_document(
        stale_targets,
        stale_pairs={("dmi-stale", stale_time)},
    )
    stale_ledger = stale_dmi["diagnostics"]["currentOperationalLedger"]
    assert stale_ledger["ready"] is False
    assert "UNATTESTED_CURRENT_PART_TIME" in stale_ledger["failureCodes"]
    assert stale_ledger["upstreamAbsencePairs"] == []
    assert stale_ledger["operationalComplementPairs"] == []
    write(folder / "targets.json", {
        "partCount": 2,
        "zones": {"Z1": [stale_parts[0]], "Z2": [stale_parts[1]]},
    })
    write(folder / "dmi.json", stale_dmi)
    stale_targeted = run(folder)
    assert stale_targeted.returncode != 0
    assert "selection failed" in stale_targeted.stdout.lower()

    # Restore the one-target fixture for independent tamper regressions below.
    write(folder / "targets.json", {"partCount": 1, "zones": {"Z1": parts}})
    write(folder / "dmi.json", dmi)

    # Asset and acquisition mutations both change the sanitized v2 digest and
    # invalidate a ledger captured from the prior exact pair→source identity.
    original_attestation = canonical_verified_part_current_attestation(
        dmi,
        targets,
        REFERENCE,
        REFERENCE + timedelta(hours=117),
    )
    assert original_attestation["verifiedPairsSha256"] == part_time_pairs_sha256(
        original_attestation["verifiedPairs"]
    )
    assert (
        original_attestation["verifiedPairsSha256"]
        != original_attestation["verifiedPairSourcesSha256"]
    )
    validate_current_operational_ledger(
        gap_ledger,
        original_attestation,
        targets,
        REFERENCE,
        REFERENCE + timedelta(hours=117),
        gap_ledger["targetRegistrySha256"],
    )

    # A collection ledger must name one exact canonical selected model run.
    for invalid_model_run in (
        None,
        REFERENCE.astimezone(timezone(timedelta(hours=2))).isoformat(),
    ):
        invalid_run_ledger = copy.deepcopy(gap_ledger)
        invalid_run_ledger["collections"][0]["modelRun"] = invalid_model_run
        try:
            validate_current_operational_ledger(
                invalid_run_ledger,
                original_attestation,
                targets,
                REFERENCE,
                REFERENCE + timedelta(hours=117),
                gap_ledger["targetRegistrySha256"],
            )
        except ValueError as exc:
            assert "collection run is invalid" in str(exc)
        else:
            raise AssertionError("Missing or noncanonical selected model run must fail closed")

    # The producer already marks a globally empty official inventory as a
    # catalog collapse. The independent validator must enforce the same proof
    # even if a forged ledger relabels every hour as an exact complement.
    all_operational_hours = set(producer.operational_current_valid_times(REFERENCE))
    empty_inventory_dmi = dmi_document(
        targets,
        upstream_absent=all_operational_hours,
    )
    empty_inventory_ledger = copy.deepcopy(
        empty_inventory_dmi["diagnostics"]["currentOperationalLedger"]
    )
    assert "OFFICIAL_DKSS_CATALOG_COLLAPSE" in empty_inventory_ledger["failureCodes"]
    empty_inventory_attestation = canonical_verified_part_current_attestation(
        empty_inventory_dmi,
        targets,
        REFERENCE,
        REFERENCE + timedelta(hours=117),
    )
    empty_inventory_ledger["operationalComplementPairs"] = copy.deepcopy(
        empty_inventory_ledger["upstreamAbsencePairs"]
    )
    empty_inventory_ledger["operationalComplementPairCount"] = (
        empty_inventory_ledger["upstreamAbsencePairCount"]
    )
    empty_inventory_ledger["operationalComplementPairsSha256"] = (
        empty_inventory_ledger["upstreamAbsencePairsSha256"]
    )
    empty_inventory_ledger["attestation"] = sanitized_current_attestation(
        empty_inventory_attestation
    )
    empty_inventory_ledger["ready"] = True
    empty_inventory_ledger["failureCodes"] = []
    try:
        validate_current_operational_ledger(
            empty_inventory_ledger,
            empty_inventory_attestation,
            targets,
            REFERENCE,
            REFERENCE + timedelta(hours=117),
            empty_inventory_ledger["targetRegistrySha256"],
        )
    except ValueError as exc:
        assert "lacks its native terminal asset" in str(exc)
    else:
        raise AssertionError("Globally empty official inventory proof must fail closed")

    # Supplying a matching sanitized summary is insufficient: the validator
    # must independently recompute every v2 list/count/digest claim.
    internally_inconsistent = copy.deepcopy(original_attestation)
    internally_inconsistent["verifiedPairCount"] += 1
    inconsistent_ledger = copy.deepcopy(gap_ledger)
    inconsistent_ledger["attestation"] = sanitized_current_attestation(
        internally_inconsistent
    )
    try:
        validate_current_operational_ledger(
            inconsistent_ledger,
            internally_inconsistent,
            targets,
            REFERENCE,
            REFERENCE + timedelta(hours=117),
            gap_ledger["targetRegistrySha256"],
        )
    except ValueError as exc:
        assert "count/digest mismatch" in str(exc)
    else:
        raise AssertionError("Inconsistent v2 attestation must fail closed")

    for field, replacement in (
        ("assetIdentitySha256", "c" * 64),
        ("acquiredAt", utc(REFERENCE + timedelta(minutes=1))),
    ):
        mutated = copy.deepcopy(dmi)
        mutated_source = mutated["zones"]["PART::dmi-ok"]["hourly"][AT]["sources"]["current"]
        mutated_source[field] = replacement
        mutated_attestation = canonical_verified_part_current_attestation(
            mutated,
            targets,
            REFERENCE,
            REFERENCE + timedelta(hours=117),
        )
        assert (
            mutated_attestation["verifiedPairSourcesSha256"]
            != original_attestation["verifiedPairSourcesSha256"]
        )
        assert (
            mutated_attestation["verifiedPairsSha256"]
            == original_attestation["verifiedPairsSha256"]
        )
        write(folder / "dmi.json", mutated)
        refused_mutation = run(folder)
        assert refused_mutation.returncode != 0
        assert "attestation mismatch" in refused_mutation.stdout
    write(folder / "dmi.json", dmi)

    # The generated private registry remains its own strict trust boundary.
    for mutate in (
        lambda value: value.update(unexpected=True),
        lambda value: value["targets"][0].update(waterPoint=[True, 57.0]),
        lambda value: value.update(operationalDmiVerifiedPairCount=116),
    ):
        damaged = copy.deepcopy(selected)
        mutate(damaged)
        try:
            validate_target_registry(damaged)
        except (TypeError, ValueError):
            pass
        else:
            raise AssertionError("Damaged Copernicus target registry must fail closed")

    # A cache key/public row-time mismatch changes the canonical attestation;
    # the previously stored ledger can no longer authorize any target list.
    mismatched = copy.deepcopy(dmi)
    row = mismatched["zones"]["PART::dmi-ok"]["hourly"].pop(AT)
    mismatched["zones"]["PART::dmi-ok"]["hourly"][utc(REFERENCE - timedelta(hours=1))] = row
    write(folder / "dmi.json", mismatched)
    refused_mismatch = run(folder)
    assert refused_mismatch.returncode != 0
    assert "attestation mismatch" in refused_mismatch.stdout

    # A fully processed official catalog with only one surviving pair is a
    # systemic producer collapse. Its own non-ready ledger is rejected rather
    # than becoming a near-full-coast authenticated request.
    collapse = dmi_document(targets, verified_hours={AT})
    assert collapse["diagnostics"]["currentOperationalLedger"]["ready"] is False
    assert "SYSTEMIC_CURRENT_TIME_COLLAPSE" in collapse["diagnostics"]["currentOperationalLedger"]["failureCodes"]
    write(folder / "dmi.json", collapse)
    refused_collapse = run(folder)
    assert refused_collapse.returncode != 0
    assert "systemic official-time collapse" in refused_collapse.stdout

    # The ledger's exact complement list is authoritative and is independently
    # recomputed from the same attestation before any registry is written.
    tampered = copy.deepcopy(dmi)
    tampered_ledger = tampered["diagnostics"]["currentOperationalLedger"]
    tampered_ledger["operationalComplementPairs"] = []
    tampered_ledger["operationalComplementPairCount"] = 0
    write(folder / "dmi.json", tampered)
    refused_complement = run(folder)
    assert refused_complement.returncode != 0
    assert "complement is not exact" in refused_complement.stdout

    # Explicit manual research mode remains the sole authorized full-coast
    # bypass and does not claim DMI verification.
    write(folder / "dmi.json", {"zones": {}})
    refused_missing_ledger = run(folder)
    assert refused_missing_ledger.returncode != 0
    assert "ledger or attestation is missing" in refused_missing_ledger.stdout

    full = run(folder, "--full-coast")
    assert full.returncode == 0, full.stdout + full.stderr
    nationwide = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert nationwide["selectionMode"] == "manual-full-coast"
    assert nationwide["operationalRequiredPairCount"] == 118
    assert nationwide["advisoryHistoryRequiredPairCount"] == 48

print("OK: Copernicus targets only the exact attested official-DKSS complement.")
