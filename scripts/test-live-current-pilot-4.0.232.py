#!/usr/bin/env python3
"""Regression for COMPLETE Copernicus range-seal projection."""
from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import (
    atomic_write_shadow,
    canonical_sha256,
    file_sha256,
    make_acquisition,
    make_coverage_collection,
    make_record,
    merge_cache_evidence,
    live_record_projection_payload,
    select_required_records,
    verified_live_record_projection,
)
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-live-current-pilot.py"
REFERENCE = datetime(2026, 8, 18, 15, tzinfo=timezone.utc)
AT = REFERENCE.isoformat().replace("+00:00", "Z")


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def dmi_source(part: dict) -> dict:
    return {
        "provider": "dmi", "fallback": False, "collection": "dkss_idw", "collectionFamily": "marine",
        "component": "current", "componentKind": "ocean-current-vector",
        "fieldSet": ["current-u", "current-v"], "optionalFieldSet": [],
        "modelRun": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        "nativeValidTime": AT, "leadTimeHours": 1,
        "entityId": f"PART::{part['partId']}", "parentZoneId": part["sourceZoneId"],
        "entityType": "coastal-part", "samplingContext": "coastal-part-water-point",
        "samplingPoint": part["waterPoint"], "gridPoint": part["waterPoint"],
        "gridDefinitionSha256": "a" * 64, "distanceKm": 0.0,
        "spatialSemanticsVersion": 1, "spatialSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
        "itemId": f"item-{part['partId']}", "assetIdentitySha256": "b" * 64,
        "assetSizeBytes": 1024, "acquiredAt": AT,
        "contentLengthBytes": 1024, "contentSha256": "d" * 64,
        "verticalLayer": "depthbelowsea:5", "verticalLayerRankM": 5.0,
        "vectorSelection": "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer",
        "vectorSemanticsVersion": 3,
    }


def run_builder(folder: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, "-B", str(SCRIPT),
        "--targets", str(folder / "targets.json"),
        "--dmi", str(folder / "dmi.json"),
        "--copernicus", str(folder / "copernicus.json"),
        "--regional", str(folder / "regional.json"),
        "--policy", str(folder / "policy.json"),
        "--control", str(folder / "control.json"),
        "--output", str(folder / "output.json"),
        "--report", str(folder / "report.json"),
        "--at", AT,
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-live-current-range-") as raw_folder:
    folder = Path(raw_folder)
    parts = [
        {"partId": f"part-{index}", "sourceZoneId": f"zone-{index}", "name": f"Part {index}", "waterPoint": [9.0 + index * 0.01, 57.0]}
        for index in range(10)
    ]
    zones = {part["sourceZoneId"]: [part] for part in parts}
    write(folder / "targets.json", {"schemaVersion": 2, "partCount": len(parts), "zones": zones})
    target_rows = [{
        "partId": part["partId"], "parentZoneId": part["sourceZoneId"], "name": part["name"], "waterPoint": part["waterPoint"],
    } for part in parts]
    target_by_id = {row["partId"]: row for row in target_rows}

    dmi_zones = {}
    for index, part in enumerate(parts):
        row = {"time": AT, "windSpeed": 4.0}
        if index != 9:
            row.update({
                "current-u": 0.1, "current-v": 0.2,
                "sources": {"current": dmi_source(part)},
            })
        dmi_zones[f"PART::{part['partId']}"] = {
            "samplingPoint": part["waterPoint"], "hourly": {AT: row},
        }
    write(folder / "dmi.json", {"zones": dmi_zones})
    dmi_sha = file_sha256(folder / "dmi.json")

    cop_target = target_by_id["part-9"]
    future = REFERENCE + timedelta(hours=117)
    raw_records = []
    for valid_time in (REFERENCE, future):
        raw_records.append({
            "partId": cop_target["partId"], "parentZoneId": cop_target["parentZoneId"], "name": cop_target["name"],
            "samplingPoint": cop_target["waterPoint"], "source": "copernicus-baltic-nemo",
            "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
            "datasetId": "cmems_mod_bal_phy_anfc_PT1H-i", "datasetVersion": "202411",
            "validTime": valid_time.isoformat().replace("+00:00", "Z"),
            "gridPoint": cop_target["waterPoint"], "distanceKm": 0.0,
            "verticalLayerM": 5.0, "layerQuality": "deepest-common-layer", "sharedLayerCount": 2,
            "uMps": 0.12, "vMps": 0.03, "componentPair": "same-time-cell-layer", "interpolation": False,
        })
    acquisition_at = REFERENCE + timedelta(minutes=20)
    acquisition = make_acquisition(
        source="copernicus-baltic-nemo", acquisition_at=acquisition_at,
        request_start_at=REFERENCE, request_end_at=future, targets=[cop_target],
        native_valid_times=[REFERENCE, future], subset_sha256=canonical_sha256({"fixture": "raw-netcdf"}),
        record_count=2,
    )
    records = [make_record(row, acquisition, cop_target) for row in raw_records]
    acquisitions, retained = merge_cache_evidence(
        {
            "schemaVersion": 2, "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_CACHE",
            "retentionHours": 168, "coldBridgeHours": 48, "publicHourCount": 118,
            "scoreImpact": False, "publicRuntime": False, "credentialsIncluded": False,
            "rawVectorsIncluded": True, "updatedAt": AT, "acquisitions": [], "collections": [], "records": [],
        },
        [acquisition], records, REFERENCE, target_by_id,
    )
    required = [{"partId": "part-9", "validTime": row["validTime"]} for row in records]
    refs, missing = select_required_records(required, acquisitions, retained, REFERENCE)
    assert not missing
    collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=target_fingerprint(target_rows),
        dmi_current_input_sha256=dmi_sha,
        required_pairs=required,
        record_refs=refs,
        sealed_at=acquisition_at,
    )
    atomic_write_shadow(
        folder / "copernicus.json", acquisitions=acquisitions, records=retained,
        collection=collection, updated_at=acquisition_at, target_identities=target_by_id,
    )
    write(folder / "regional.json", {})
    write(folder / "policy.json", {})
    write(folder / "control.json", {
        "schemaVersion": 1, "mode": "controlled-live", "credentialsPublic": False,
        "currentDataPublic": True, "rollbackBehavior": "missing",
    })

    completed = run_builder(folder)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    output = json.loads((folder / "output.json").read_text(encoding="utf-8"))
    report = json.loads((folder / "report.json").read_text(encoding="utf-8"))
    assert len(output["entries"]) == 2
    assert set(output["copernicusRangeSeal"]) == {
        "collectionId", "status", "productionReferenceAt", "rangeStartAt", "rangeEndAt",
        "coldBridgeHours", "publicHourCount", "targetRegistrySha256", "dmiCurrentInputSha256",
        "dmiVerifierContractId", "requiredPairsSha256", "requiredPairCount", "selectionPolicyId",
        "recordRefsSha256", "sealedAt",
    }
    assert output["copernicusRangeSeal"]["status"] == "COMPLETE"
    assert output["entries"][1]["validTime"] == future.isoformat().replace("+00:00", "Z")
    assert all(row["capturedAt"] == acquisition_at.isoformat().replace("+00:00", "Z") for row in output["entries"])
    assert all(
        row["recordId"] and row["acquisitionId"]
        and row["collectionId"] == output["copernicusRangeSeal"]["collectionId"]
        and row["productionReferenceAt"] == AT
        and row["acquisitionStatus"] == "COMPLETE"
        for row in output["entries"]
    )
    assert all(verified_live_record_projection(row) for row in output["entries"])
    projection_payload = live_record_projection_payload(output["entries"][0])
    assert projection_payload["samplingPoint"] == ["9.0900000", "57.0000000"]
    assert projection_payload["distanceKm"] == "0.00000"
    assert projection_payload["verticalLayerM"] == "5.00000"
    assert projection_payload["uMps"] == "0.12000" and projection_payload["vMps"] == "0.03000"
    for field, replacement in (
        ("uMps", 0.54321),
        ("gridPoint", [9.9999999, 57.0]),
        ("collectionId", "sha256:" + "f" * 64),
    ):
        tampered_entry = copy.deepcopy(output["entries"][0])
        tampered_entry[field] = replacement
        assert not verified_live_record_projection(tampered_entry), f"Projection hash must bind {field}"
    assert report["coverageReferenceAt"] == AT
    assert report["verifiedPartCount"] == 10 and report["coverageRequirementMet"] is True
    assert report["partsBySelectedSource"] == {"dmi-local": 9, "copernicus-local": 1, "dmi-regional-proxy": 0}

    # The live projection must expose the operation seal while keeping absent
    # advisory history explicit and publishing no invented entry.
    legacy_cache = json.loads((folder / "copernicus.json").read_text(encoding="utf-8"))
    advisory_required = [{
        "partId": "part-9",
        "validTime": (REFERENCE - timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
    }]
    operational_collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=target_fingerprint(target_rows),
        dmi_current_input_sha256=dmi_sha,
        required_pairs=required,
        record_refs=refs,
        advisory_history_required_pairs=advisory_required,
        advisory_history_record_refs=[],
        sealed_at=acquisition_at,
    )
    atomic_write_shadow(
        folder / "copernicus.json", acquisitions=acquisitions, records=retained,
        collection=operational_collection, updated_at=acquisition_at,
        target_identities=target_by_id,
    )
    operational_projection = run_builder(folder)
    assert operational_projection.returncode == 0, (
        operational_projection.stdout + operational_projection.stderr
    )
    operational_output = json.loads((folder / "output.json").read_text(encoding="utf-8"))
    operational_seal = operational_output["copernicusRangeSeal"]
    assert operational_seal["status"] == "OPERATIONAL_COMPLETE"
    assert operational_seal["operationalRequiredPairCount"] == 2
    assert operational_seal["advisoryHistoryAvailablePairCount"] == 0
    assert operational_seal["advisoryHistoryMissingPairCount"] == 1
    assert operational_seal["advisoryHistoryComplete"] is False
    assert len(operational_output["entries"]) == 2
    write(folder / "copernicus.json", legacy_cache)

    # Controlled-live remains fail-closed even if DMI currently covers every
    # part: the exact range seal is the proof that the full public horizon was
    # checked, including the possible empty-gap case.  Rollback deliberately
    # keeps the projection diagnostic-only and may start without that seal.
    valid_cache = json.loads((folder / "copernicus.json").read_text(encoding="utf-8"))
    (folder / "copernicus.json").unlink()
    missing_seal = run_builder(folder)
    assert (
        missing_seal.returncode != 0
        and "requires an exact activation-complete Copernicus seal" in missing_seal.stderr
    )
    write(folder / "control.json", {
        "schemaVersion": 1, "mode": "dmi-only-rollback", "credentialsPublic": False,
        "currentDataPublic": True, "rollbackBehavior": "missing",
    })
    rollback_without_seal = run_builder(folder)
    assert rollback_without_seal.returncode == 0, rollback_without_seal.stdout + rollback_without_seal.stderr
    rollback_output = json.loads((folder / "output.json").read_text(encoding="utf-8"))
    assert rollback_output["enabled"] is False and rollback_output["copernicusRangeSeal"] is None
    write(folder / "control.json", {
        "schemaVersion": 1, "mode": "controlled-live", "credentialsPublic": False,
        "currentDataPublic": True, "rollbackBehavior": "missing",
    })
    write(folder / "copernicus.json", valid_cache)

    # A partial/incomplete collection is never consumed.
    broken_link = copy.deepcopy(valid_cache)
    broken_link["collections"][0]["recordRefs"][0]["recordId"] = broken_link["collections"][0]["recordRefs"][1]["recordId"]
    write(folder / "copernicus.json", broken_link)
    link_rejected = run_builder(folder)
    assert link_rejected.returncode != 0 and "range cache is invalid" in link_rejected.stderr

    incomplete = copy.deepcopy(valid_cache)
    incomplete["collections"][0]["status"] = "INCOMPLETE"
    write(folder / "copernicus.json", incomplete)
    rejected = run_builder(folder)
    assert rejected.returncode != 0 and "range cache is invalid" in rejected.stderr

    # The seal is bound to the exact DMI bytes; a post-seal mutation fails.
    write(folder / "copernicus.json", valid_cache)
    changed_dmi = json.loads((folder / "dmi.json").read_text(encoding="utf-8"))
    changed_dmi["unrelatedButByteChanging"] = True
    write(folder / "dmi.json", changed_dmi)
    mismatched = run_builder(folder)
    assert mismatched.returncode != 0 and "target/DMI input identity" in mismatched.stderr

print("OK: live current projection consumes only an exact COMPLETE range seal and accepts sealed +117 evidence.")
