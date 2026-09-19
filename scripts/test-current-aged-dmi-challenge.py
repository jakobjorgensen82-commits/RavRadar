"""Small offline 1-PART integration: response -> plan -> closure -> JS projection.

Native DMI admission/empty regional policy are trusted fixture boundaries; all
reserve admission, planning, source stage, closure and projection code is real.
No 673-PART weather fixture, providers, credentials or production writes.
"""
import copy
import importlib.util
import json
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
import numpy as np
import xarray as xr

from lib import current_operational_closure as closure
from lib.copernicus_current import (canonical_sha256, empty_shadow, make_acquisition, make_record,
                                    select_required_records, validate_target_registry)
from lib.copernicus_current_source_stage import build_source_stage_progress
from lib.current_model_reference import extract_subset_model_references
from lib.current_aged_dmi_challenge import build_challenge_plan
from lib.open_meteo_current_fallback import build_document

ROOT = Path(__file__).resolve().parents[1]
def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
registry_builder = load("challenge_registry", "build-copernicus-target-registry.py")
live_builder = load("challenge_live", "build-live-current-pilot.py")
runner = load("challenge_runner", "run-copernicus-current-pilot.py")
REFERENCE = datetime(2026, 9, 19, 0, tzinfo=timezone.utc)
def iso(value): return value.strftime("%Y-%m-%dT%H:00:00Z")
REFERENCE_TEXT = iso(REFERENCE)
H = canonical_sha256({"synthetic": "fixture"})
TARGET = {"partId": "SYNTHETIC-CURRENT", "parentZoneId": "SYNTHETIC-ZONE", "name": "Synthetic", "waterPoint": [12, 56]}
REGIONAL = {"pairRefs": [], "policySha256": H, "pairRefsSha256": canonical_sha256([])}

def dataset(run=REFERENCE - timedelta(hours=6)):
    return xr.Dataset(coords={"time": np.array([REFERENCE_TEXT[:-1]], dtype="datetime64[s]"),
        "forecast_reference_time": np.datetime64(iso(run)[:-1])})

proofs = extract_subset_model_references(dataset(), H)
assert proofs[REFERENCE_TEXT]["modelRun"] == iso(REFERENCE - timedelta(hours=6))
assert extract_subset_model_references(dataset().drop_vars("forecast_reference_time"), H) == {}
history_and_forecast = xr.Dataset(coords={
    "time": np.array([iso(REFERENCE - timedelta(hours=1))[:-1], REFERENCE_TEXT[:-1]], dtype="datetime64[s]"),
    "forecast_reference_time": np.datetime64(REFERENCE_TEXT[:-1]),
})
assert list(extract_subset_model_references(history_and_forecast, H)) == [REFERENCE_TEXT]
bad = dataset().assign_coords(forecast_period=np.timedelta64(7, "h"))
try: extract_subset_model_references(bad, H)
except ValueError: pass
else: raise AssertionError("Inconsistent actual reference/lead was accepted")
with tempfile.TemporaryDirectory(prefix="ravradar-current-model-reference-") as directory:
    fixture = dataset().assign_coords(depth=[1.0], latitude=[56.0], longitude=[12.0])
    fixture["uo"] = (("time", "depth", "latitude", "longitude"), np.array([[[[.2]]]]))
    fixture["vo"] = (("time", "depth", "latitude", "longitude"), np.array([[[[.1]]]]))
    product = next(row for row in runner.PRODUCTS if row["source"] == "copernicus-baltic-nemo")
    fixture.to_netcdf(Path(directory) / (product["source"] + ".nc"))
    payload_hash, times, rows = runner.acquire_shard_rows(product=product, shard_targets=[TARGET],
        times_by_part={TARGET["partId"]: [REFERENCE]}, fixture_directory=Path(directory),
        temporary=Path(directory), shard_index=0)
    assert times == [REFERENCE] and len(rows) == 1
    assert rows[0]["modelReference"]["payloadSha256"] == payload_hash
    assert rows[0]["modelReference"]["modelRun"] == iso(REFERENCE - timedelta(hours=6))

def run_fixture(*, dmi_age=96, with_model_reference=True, cp_age=6):
    sources = []
    for offset in range(118):
        valid = iso(REFERENCE + timedelta(hours=offset))
        source = {"collection": "dkss_nsbs", "modelRun": iso(REFERENCE - timedelta(hours=dmi_age)),
            "validTime": valid, "itemId": f"synthetic-{offset}", "assetIdentitySha256": H.removeprefix("sha256:"),
            "assetSizeBytes": 10, "contentLengthBytes": 10, "contentSha256": H.removeprefix("sha256:"),
            "acquiredAt": REFERENCE_TEXT}
        sources.append({"partId": TARGET["partId"], "validTime": valid, "source": source})
    attestation = {"verifiedPairs": [{"partId": row["partId"], "validTime": row["validTime"]} for row in sources],
                   "verifiedPairSources": sources, "verifiedPairCount": 118}
    ledger = {"operationalComplementPairs": []}
    original_ledger = copy.deepcopy(ledger)
    with patch.object(registry_builder, "current_attestation_authorization_from_operational_ledger", return_value=(None, None)), \
         patch.object(registry_builder, "canonical_verified_part_current_attestation", return_value=attestation), \
         patch.object(registry_builder, "validate_current_operational_availability_ledger", return_value=ledger), \
         patch.object(registry_builder, "has_verified_local_dmi", return_value=True):
        registry = registry_builder.build_registry([TARGET], {"diagnostics": {"currentOperationalLedger": ledger}}, REFERENCE, H, full_coast=False)
    validate_target_registry(registry)
    assert registry["operationalDmiVerifiedPairCount"] == 118
    acquisition = make_acquisition(source="copernicus-baltic-nemo", acquisition_at=REFERENCE,
        request_start_at=REFERENCE, request_end_at=REFERENCE, targets=[TARGET], native_valid_times=[REFERENCE],
        subset_sha256=H, record_count=1)
    raw = {"partId": TARGET["partId"], "parentZoneId": TARGET["parentZoneId"], "validTime": REFERENCE_TEXT,
        "samplingPoint": TARGET["waterPoint"], "gridPoint": TARGET["waterPoint"], "distanceKm": 0,
        "verticalLayerM": 1, "layerQuality": "deepest-shared-layer", "sharedLayerCount": 1, "uMps": .2, "vMps": .1}
    if with_model_reference:
        raw["modelReference"] = extract_subset_model_references(dataset(REFERENCE - timedelta(hours=cp_age)), H)[REFERENCE_TEXT]
    record = make_record(raw, acquisition, TARGET)
    shadow = {**empty_shadow(REFERENCE), "acquisitions": [acquisition], "records": [record]}
    challenge = registry.get("agedDmiChallengePlan")
    stage = build_source_stage_progress(registry=registry, shadow=shadow, target_identities={TARGET["partId"]: TARGET},
        shadow_sha256=H, attempts=[], updated_at=REFERENCE) if registry["operationalRequiredPairs"] else None
    # Legacy unknown-age CP still fills a genuine hole; it cannot challenge DMI.
    gap_refs, _ = select_required_records([{"partId": TARGET["partId"], "validTime": REFERENCE_TEXT}], [acquisition], [record], REFERENCE)
    assert len(gap_refs) == 1
    om = build_document(targets=[TARGET], required_pairs=[], records=[], checkpointed_at=REFERENCE_TEXT,
        production_reference_at=REFERENCE_TEXT, copernicus_source_stage_status="IN_PROGRESS" if stage else "NOT_APPLICABLE",
        copernicus_source_stage_sha256=canonical_sha256(stage) if stage else None,
        copernicus_bounded_progress_accepted=stage is not None, regional_evidence_sha256=canonical_sha256(REGIONAL))
    with patch.object(closure, "EXPECTED_TARGET_COUNT", 1), patch.object(closure, "EXPECTED_TOTAL_PAIR_COUNT", 118), \
         patch.object(closure, "validate_current_operational_availability_ledger", return_value=ledger), \
         patch.object(closure, "build_regional_current_operational_evidence", return_value={"privateProof": REGIONAL}):
        result = closure.build_current_operational_closure(targets=[TARGET], dmi_ledger=ledger, dmi_attestation=attestation,
            dmi_current_input_sha256=H, copernicus_registry=registry, copernicus_shadow=shadow, copernicus_shadow_sha256=H,
            copernicus_source_stage=stage, regional_shadow={}, regional_policy={"parts": []}, open_meteo_fallback=om,
            locked_reference=REFERENCE_TEXT)
    assert ledger == original_ledger
    private, safe = result["privateProof"], result["safeProjection"]
    assert private["missingPairCount"] == 0 and private["assignedPairCount"] == 118
    assignments = [row for row in private["assignments"] if row["classification"].startswith("COPERNICUS_")]
    entries, _, _ = live_builder.copernicus_entries(shadow, {TARGET["partId"]: TARGET}, assignments, private)
    expected = int(dmi_age >= 96 and with_model_reference and cp_age < dmi_age)
    assert len(entries) == expected
    assert private["dmiVerifiedPairCount"] == 118 - expected
    if challenge:
        assert safe["agedDmiSelection"]["replacedPairCount"] == expected
        assert safe["agedDmiSelection"]["retainedPairCount"] == 118 - expected
    # JS's national cardinality contract is exercised with aggregate synthetic
    # metadata, not a national raw-weather fixture. One exact entry is selected.
    safe.update(targetCount=673, totalPairCount=673 * 118)
    safe["assignedPairCount"] += 672 * 118
    safe["dmiVerifiedPairCount"] += 672 * 118
    if challenge: safe["agedDmiSelection"]["rawDmiVerifiedPairCount"] += 672 * 118
    safe["safeProjectionSha256"] = canonical_sha256({key: value for key, value in safe.items() if key != "safeProjectionSha256"})
    document = {"schemaVersion": 1, "controlledLivePilot": True, "mode": "controlled-live", "enabled": True,
        "credentialsIncluded": False, "targetFingerprint": safe["targetRegistrySha256"], "operationalClosure": safe,
        "entries": entries, "advisoryEntries": []}
    script = """
import assert from 'node:assert/strict';
import {mergeLiveCurrentPilotIntoRecord, verifiedLivePilotSource} from './scripts/lib/live-current-pilot.mjs';
let input=''; for await(const chunk of process.stdin) input+=chunk;
const {document,part,expected}=JSON.parse(input);
const original={hourly:[{time:document.operationalClosure.productionReferenceAt,currentUMps:.01,currentVMps:.02}]};
const result=mergeLiveCurrentPilotIntoRecord(original,part,document,{primaryCurrentVerified:()=>true});
assert.equal(result.hourly[0].currentUMps,expected?.2:.01);
if(expected){assert.ok(verifiedLivePilotSource(result.hourly[0].currentProvenance,part));
 const altered=structuredClone(result.hourly[0].currentProvenance); altered.modelReference.modelRun='2026-09-18T00:00:00Z';
 assert.equal(verifiedLivePilotSource(altered,part),null);}
"""
    subprocess.run(["node", "--input-type=module", "-e", script], input=json.dumps({"document": document, "part": TARGET, "expected": expected}),
                   cwd=ROOT, text=True, check=True, capture_output=True)
    return registry, private

run_fixture()
run_fixture(with_model_reference=False)
run_fixture(dmi_age=95)
run_fixture(dmi_age=1)
run_fixture(cp_age=96)
run_fixture(cp_age=100)
print("Current age challenge: response-bound CP selection, unchanged raw ledger, preserved DMI on unknown age, and Python-to-JS projection passed.")
