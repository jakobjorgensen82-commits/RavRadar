#!/usr/bin/env python3
"""Artificial producer -> full 673x118 closure -> live-history -> real JS proof.

The raw samples, original acquisition/outcome receipts and owner policy are
explicit synthetic trusted inputs, not provider/authentication evidence. All
ledger, source/sample bindings, registry, residuals, closure assignments and
live projections are built by their actual implementations. No validator or
national cardinality is patched. This is not national scoring/public generation.
The unused ecCodes import dependency is a fail-on-call adapter, not a decoder.
"""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import types


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = datetime(2026, 1, 1, tzinfo=timezone.utc)
STARTED = time.monotonic()
PROVIDER_CALLS = 0


def forbidden_provider(*args, **kwargs):
    global PROVIDER_CALLS
    PROVIDER_CALLS += 1
    raise AssertionError("SYNTHETIC_PROVIDER_FORBIDDEN")


def load_script(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def iso(offset=0):
    return (REFERENCE + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")


def stage(label):
    print(f"Synthetic producer-chain {label}: elapsedSeconds={time.monotonic() - STARTED:.3f}", flush=True)


def child_environment():
    # Windows CSPRNG bootstrap only. No application/provider/proxy credentials.
    return {key: os.environ[key] for key in ("SystemRoot",) if key in os.environ}


def main():
    # This worker is launched below with a minimal explicit environment. Import
    # the actual producer, substituting only an unavailable, unused GRIB binding.
    eccodes = types.ModuleType("eccodes")
    eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
    for name in ("codes_get", "codes_get_array", "codes_get_elements",
                 "codes_grib_find_nearest", "codes_grib_new_from_file", "codes_release"):
        setattr(eccodes, name, forbidden_provider)
    sys.modules["eccodes"] = eccodes
    socket.create_connection = forbidden_provider
    socket.socket.connect = forbidden_provider
    socket.getaddrinfo = forbidden_provider
    producer = load_script("synthetic_current_chain_dmi", "update-dmi-bulk.py")
    producer.STAC_SESSION.request = forbidden_provider
    producer.DOWNLOAD_SESSION.request = forbidden_provider
    registry_builder = load_script("synthetic_current_chain_registry", "build-copernicus-target-registry.py")

    from lib.copernicus_current import (
        canonical_sha256, empty_shadow, file_sha256, make_acquisition, make_record,
    )
    from lib.copernicus_current_source_stage import build_source_stage_progress_values
    from lib.copernicus_target_identity import target_fingerprint
    from lib.current_field_shadow import empty_document, haversine_km, representative_profile
    from lib.current_operational_closure import build_regional_residual_plan
    from lib.dmi_native_provenance import (
        build_current_part_outcome_proof, current_attestation_authorization_from_operational_ledger,
        current_source_asset_sha256, validate_current_operational_availability_ledger,
    )
    from lib.open_meteo_current_fallback import build_document, build_record
    from lib.regional_source_proofs import migrate_regional_source_proofs, _sample_sha

    targets = [{"partId": f"SYNTHETIC-PART-{index:03d}",
                "parentZoneId": f"SYNTHETIC-ZONE-{index:03d}",
                "name": f"Synthetic {index}", "waterPoint": [12.0 + index * 0.0001, 56.0]}
               for index in range(673)]
    identities = {row["partId"]: row for row in targets}
    dmi = {"schemaVersion": 2, "generatedAt": iso(), "zoneRegistrySignature": "synthetic-chain",
           "zones": {}, "runs": {}, "collectionState": {}, "diagnostics": {}}
    ledger = producer.build_current_operational_ledger(dmi, targets, REFERENCE, {})
    allowed, retained = current_attestation_authorization_from_operational_ledger(ledger)
    attestation = producer.current_operational_attestation(dmi, targets, REFERENCE, allowed, retained)
    validate_current_operational_availability_ledger(
        ledger, attestation, targets, iso(), iso(117), target_fingerprint(targets))
    assert attestation["verifiedPairCount"] == 0
    assert len(ledger["operationalComplementPairs"]) == 673 * 118
    dmi["diagnostics"]["currentOperationalLedger"] = ledger
    stage("real-ledger")

    policy = {
        "schemaVersion": 1, "status": "private-collection-enabled-public-activation-gated",
        "decidedAt": iso(), "regularMaximumDistanceKm": 5, "regionalProxyMaximumDistanceKm": 15,
        "selectionRule": "nearest-exact-shared-uv-column-then-deepest-common-layer",
        "requiredCollection": "dkss_lf", "sameConnectedWaterBody": "Limfjorden",
        "interpolation": False, "globalOverrideAllowed": False, "scoreImpact": False,
        "publicRuntime": False, "controlledLivePilotAllowed": True, "rawRetentionHours": 168,
        "supportReportRawVectors": False,
        "activationRequires": ["fresh-dmi-and-copernicus-pilot", "same-time-cell-layer-provenance",
                               "full-project-validation", "release-gate", "fresh-production-workflow"],
        "parts": [{"partId": row["partId"], "name": row["name"],
                   "approvedSamplingPoint": row["waterPoint"], "auditDistanceKm": 8.0}
                  for row in targets[:8]],
    }
    sources = {}
    for offset in (-1, 0):
        sources[offset] = {
            "collection": "dkss_lf", "modelRun": iso(offset), "validTime": iso(offset),
            "itemId": f"synthetic-source-{offset}", "assetIdentitySha256": hashlib.sha256(f"identity:{offset}".encode()).hexdigest(),
            "assetSizeBytes": 2048, "acquiredAt": iso(), "contentLengthBytes": 2048,
            "contentSha256": hashlib.sha256(f"content:{offset}".encode()).hexdigest(),
            "itemCreatedAt": iso(offset), "itemUpdatedAt": iso(offset),
        }
    regional = empty_document()
    for index, target in enumerate(targets[:8]):
        offset = -1 if index == 2 else 0
        source = sources[offset]
        point = target["waterPoint"]
        grid = [point[0] + 0.1, point[1]]
        raw_u = -0.0000001 if index in (0, 2) else 0.12345
        raw_v = -0.0000001 if index in (1, 2) else -0.23456
        profile = representative_profile([{
            "first": {"longitude": grid[0], "latitude": grid[1], "value": raw_u},
            "second": {"longitude": grid[0], "latitude": grid[1], "value": raw_v},
            "pointKey": (grid[1], grid[0]), "distanceKm": haversine_km(point, grid),
            "layerKey": "depthbelowsea:5", "layerRank": 5.0,
        }], maximum_distance_km=15.0)
        assert profile is not None
        source_sha = current_source_asset_sha256(source)
        sample = {**profile, "sampleKey": f"dkss_lf|{source['modelRun']}|{iso(offset)}|{source_sha}",
                  "collection": "dkss_lf", "modelRun": source["modelRun"], "validTime": iso(offset),
                  "capturedAt": iso(), "sourceAssetSha256": source_sha}
        regional["anchors"][f"REGIONAL_PROXY::{target['partId']}"] = {
            "partId": target["partId"], "parentZoneId": target["parentZoneId"], "name": target["name"],
            "bandKm": 0.0, "targetPoint": point, "sourceWaterPoint": point,
            "researchClass": "owner-approved-regional-proxy", "regionalProxyCandidate": True,
            "requiredCollection": "dkss_lf", "maximumDistanceKm": 15.0,
            "sameConnectedWaterBody": "Limfjorden", "scoreImpact": False,
            "publicRuntime": False, "samples": [sample],
        }
    original_samples = [anchor["samples"][0] for anchor in regional["anchors"].values()]
    assert math.copysign(1.0, original_samples[0]["layers"]["bottom"]["uMps"]) == -1
    assert math.copysign(1.0, original_samples[1]["layers"]["bottom"]["vMps"]) == -1
    # The original asset/outcome receipts are synthetic trusted inputs, not
    # derived from untrusted shadow rows. Actual binders validate their contract.
    original_proofs = [{"sourceAsset": source, "processingSignature": "synthetic-chain-original-decoder",
                        "partOutcomeProof": build_current_part_outcome_proof(
                            list(identities), list(identities), target_fingerprint(targets),
                            "synthetic-chain-original-decoder", source)} for source in sources.values()]
    binding = migrate_regional_source_proofs(regional, policy=policy, targets=targets,
                                             original_proofs=original_proofs)
    assert binding["boundSamples"] == 8 and binding["invalidProofs"] == 0
    sample_hashes = [_sample_sha(row) for row in original_samples]
    regional_bytes = encoded(regional)

    with tempfile.TemporaryDirectory(prefix="ravradar-synthetic-producer-chain-") as temporary:
        directory = Path(temporary)
        paths = {name: directory / f"{name}.json" for name in (
            "targets", "dmi", "registry", "copernicus", "source-stage", "regional", "policy",
            "open-meteo", "closure", "closure-report", "control", "live", "live-report")}

        def write(name, value):
            paths[name].write_bytes(encoded(value))

        write("targets", {"partCount": 673, "zones": {
            row["parentZoneId"]: [{"partId": row["partId"], "name": row["name"], "waterPoint": row["waterPoint"]}]
            for row in targets}})
        write("dmi", dmi)
        registry = registry_builder.build_registry(targets, dmi, REFERENCE, file_sha256(paths["dmi"]), full_coast=False)
        assert registry["operationalRequiredPairCount"] == 673 * 118
        assert registry["advisoryHistoryRequiredPairCount"] == 673 * 48
        write("registry", registry)
        cp_target = targets[8]
        native_times = [REFERENCE - timedelta(hours=1), REFERENCE]
        acquisition = make_acquisition(source="copernicus-baltic-nemo", acquisition_at=REFERENCE,
            request_start_at=native_times[0], request_end_at=native_times[1], targets=[cp_target],
            native_valid_times=native_times, subset_sha256=canonical_sha256({"syntheticSubset": 1}), record_count=2)
        records = [make_record({"partId": cp_target["partId"], "parentZoneId": cp_target["parentZoneId"],
            "validTime": valid, "samplingPoint": cp_target["waterPoint"], "gridPoint": cp_target["waterPoint"],
            "distanceKm": 0.0, "verticalLayerM": 1.0, "layerQuality": "deepest-shared-layer",
            "sharedLayerCount": 1, "uMps": 0.23456, "vMps": -0.12345}, acquisition, cp_target) for valid in native_times]
        cp = {**empty_shadow(REFERENCE), "acquisitions": [acquisition], "records": records}
        write("copernicus", cp)
        cp_stage, selected, missing, excluded = build_source_stage_progress_values(
            registry=registry, shadow=cp, target_identities=identities,
            shadow_sha256=file_sha256(paths["copernicus"]), attempts=[], updated_at=REFERENCE)
        assert cp_stage["status"] == "IN_PROGRESS" and len(selected) == 1 and not excluded
        assert len(missing) == 673 * 118 - 1
        write("source-stage", cp_stage)
        plan = build_regional_residual_plan(residual_pairs=missing, regional_policy=policy, targets=targets,
            regional_shadow=regional, dmi_ledger=ledger, dmi_attestation=attestation, locked_reference=iso())
        assert any(row["classification"] == "REGIONAL_DMI_NATIVE" for row in plan["regionalAssignments"])
        assert any(row["classification"] == "REGIONAL_DMI_DERIVED_HOLD" for row in plan["regionalAssignments"])
        om_target = targets[9]
        om_record = build_record(part_id=om_target["partId"], valid_time=iso(), acquired_at=iso(),
            sampling_point=om_target["waterPoint"], grid_point=om_target["waterPoint"],
            speed_mps=0.2, toward_direction_deg=45.0, source_response_sha256=canonical_sha256({"syntheticResponse": 1}))
        om = build_document(targets=targets, required_pairs=plan["openMeteoRequiredPairs"], records=[om_record],
            checkpointed_at=iso(), production_reference_at=iso(), copernicus_source_stage_status=cp_stage["status"],
            copernicus_source_stage_sha256=canonical_sha256(cp_stage), copernicus_bounded_progress_accepted=True,
            regional_evidence_sha256=canonical_sha256(plan["regionalPrivate"]))
        for name, value in (("regional", regional), ("policy", policy), ("open-meteo", om),
                            ("control", {"schemaVersion": 1, "mode": "controlled-live",
                                         "credentialsPublic": False, "currentDataPublic": True})):
            write(name, value)
        immutable = {name: path.read_bytes() for name, path in paths.items() if path.exists()}
        common_names = ("targets", "dmi", "registry", "copernicus", "source-stage", "regional", "policy", "open-meteo")
        common_args = [item for name in common_names for item in (f"--{name}", str(paths[name]))]

        def cli(filename, extra):
            result = subprocess.run([sys.executable, "-B", str(ROOT / "scripts" / filename), *common_args,
                                     "--at", iso(), *extra], cwd=directory, env=child_environment(),
                                    capture_output=True, text=True, timeout=40, check=False)
            assert result.returncode == 0, f"{filename}: {result.stdout} {result.stderr}"

        stage("actual-inputs")
        cli("build-current-operational-closure.py", ["--output", str(paths["closure"]), "--report", str(paths["closure-report"])])
        private = json.loads(paths["closure"].read_bytes())
        assert len(private["assignments"]) == 673 * 118
        assert len({(row["partId"], row["validTime"]) for row in private["assignments"]}) == 673 * 118
        assert private["dmiVerifiedPairCount"] == 0 and private["openMeteoPairCount"] == 1
        assert private["advisoryHistoryAssignmentCount"] == 1 and private["missingPairCount"] > 0
        assert private["status"] == "READY_WITH_MISSING"
        stage("actual-closure")
        cli("build-live-current-pilot.py", ["--closure", str(paths["closure"]), "--control", str(paths["control"]),
                                           "--output", str(paths["live"]), "--report", str(paths["live-report"])])
        document = json.loads(paths["live"].read_bytes())
        assert len(document["advisoryEntries"]) == 1
        assert len(document["regionalReferenceEntries"]) == 1
        stage("actual-live")
        assert encoded(regional) == regional_bytes
        assert [_sample_sha(row) for row in original_samples] == sample_hashes
        for name, before in immutable.items():
            assert paths[name].read_bytes() == before, f"Synthetic input mutated: {name}"

        node = sys.argv[2]
        probe = subprocess.run([node, "--input-type=module", "-e", JS_PROBE], cwd=ROOT,
            env=child_environment(), input=json.dumps({"document": document, "parts": targets[:10],
                                                     "missingPart": targets[10]}),
            capture_output=True, text=True, timeout=20, check=False)
        assert probe.returncode == 0, probe.stderr
        assert json.loads(probe.stdout) == {"statuses": 3, "directParts": 9, "stateOnlyParts": 1, "advisoryRows": 1,
                                           "privateReferences": 1, "tamperRejected": True}
        for name, before in immutable.items():
            assert paths[name].read_bytes() == before, f"Synthetic input mutated after JS: {name}"
        assert PROVIDER_CALLS == 0
        stage("PASS-real-python-and-js")


JS_PROBE = r"""
import assert from 'node:assert/strict';
import {controlledLiveCurrentProofStatus, mergeLiveCurrentPilotIntoRecord,
  verifiedNativeCadenceReferenceForPart} from './scripts/lib/live-current-pilot.mjs';
let text=''; for await(const chunk of process.stdin) text+=chunk;
const {document, parts, missingPart}=JSON.parse(text);
const before=JSON.stringify(document);
const expected={operationalClosureValid:true,advisoryHistoryValid:true,regionalReferenceValid:true};
assert.deepEqual(controlledLiveCurrentProofStatus(document),expected);
const at=document.operationalClosure.productionReferenceAt;
const u=document.entries.find(row=>row.partId===parts[0].partId&&row.validTime===at);
const v=document.entries.find(row=>row.partId===parts[1].partId&&row.validTime===at);
assert.equal(Object.is(u.uMps,-0),true); assert.equal(Object.is(v.vMps,-0),true);
for(const part of parts){
  const source={hourly:[{time:at}]};
  const merged=mergeLiveCurrentPilotIntoRecord(source,part,document);
  if(part.partId===parts[2].partId){
    // A held hour is an admitted state-only tuple, never fabricated native U/V.
    assert.ok(merged.hourly[0].currentStateOnlyHold);
    assert.equal(Number.isFinite(merged.hourly[0].currentUMps),false);
    assert.equal(Number.isFinite(merged.hourly[0].currentVMps),false);
  }else{
    assert.equal(Number.isFinite(merged.hourly[0].currentUMps),true,part.partId);
    assert.equal(Number.isFinite(merged.hourly[0].currentVMps),true,part.partId);
  }
  assert.deepEqual(source,{hourly:[{time:at}]});
}
const reference=document.regionalReferenceEntries[0];
assert.equal(reference.partId,parts[2].partId);
assert.ok(verifiedNativeCadenceReferenceForPart(parts[2],document,reference.sourceValidTime));
const advisory=document.advisoryEntries[0];
const past=mergeLiveCurrentPilotIntoRecord({hourly:[{time:advisory.validTime}]},parts[8],document);
assert.equal(Number.isFinite(past.hourly[0].currentUMps),true);
const missing=mergeLiveCurrentPilotIntoRecord({hourly:[{time:at}]},missingPart,document);
assert.equal(Number.isFinite(missing.hourly[0].currentUMps),false);
assert.equal(JSON.stringify(document),before);
// A single changed entry must still invalidate the shared closure and its
// untouched siblings. No alternate hashes or refreshed proof are manufactured.
const tampered=structuredClone(document);
tampered.entries.find(row=>row.partId===parts[0].partId&&row.validTime===at).vectorCommitmentSha256='sha256:'+'f'.repeat(64);
assert.deepEqual(controlledLiveCurrentProofStatus(tampered),{
  operationalClosureValid:false,advisoryHistoryValid:false,regionalReferenceValid:false});
const rejected=mergeLiveCurrentPilotIntoRecord({hourly:[{time:at}]},parts[3],tampered);
assert.equal(Number.isFinite(rejected.hourly[0].currentUMps),false);
process.stdout.write(JSON.stringify({statuses:3,directParts:9,stateOnlyParts:1,advisoryRows:1,privateReferences:1,tamperRejected:true}));
"""


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--synthetic-worker":
        main()
    else:
        node = shutil.which("node")
        assert node, "Synthetic producer-chain requires Node"
        # Fresh environment prevents the producer import from reading real
        # workflow/provider configuration. The worker/CLIs read fixture paths.
        result = subprocess.run([sys.executable, "-B", str(Path(__file__).resolve()),
                                 "--synthetic-worker", node], env=child_environment(),
                                cwd=ROOT, timeout=120, check=False)
        raise SystemExit(result.returncode)
