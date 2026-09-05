"""Producer/verifier parity for native DMI component provenance."""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.dmi_native_provenance import (
    CURRENT_VECTOR_SELECTION,
    canonical_verified_part_current_attestation,
    complete_native_source_for_hour,
    sampling_identity,
    strict_verified_part_current_pair_count,
)


ROOT = Path(__file__).resolve().parents[1]
# The parity test exercises provenance construction only; an import-safe ecCodes
# stub keeps it independent of the platform GRIB DLL.
eccodes = types.ModuleType("eccodes")
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for name in (
    "codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
    "codes_grib_new_from_file", "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
spec = importlib.util.spec_from_file_location("ravradar_update_dmi_bulk", ROOT / "scripts/update-dmi-bulk.py")
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)

valid_time = "2026-01-01T03:00:00Z"
zone = {
    "id": "PART::TEST",
    "parentZoneId": "ZONE-TEST",
    "coastalPart": True,
    "coastType": "limfjord",
    "lon": 2.0,
    "lat": 1.0,
}
candidate = {
    "gridDefinitionSha256": "a" * 64,
    "longitude": 2.0,
    "latitude": 1.0,
    "distanceKm": 0.0,
    "value": 0.1,
}
capture = {
    "itemId": "exact-stac-item",
    "assetIdentitySha256": "b" * 64,
    "assetSizeBytes": 1024,
    "acquiredAt": "2026-01-01T02:00:00Z",
    "contentLengthBytes": 1024,
    "contentSha256": "d" * 64,
    "itemCreatedAt": "2026-01-01T01:00:00Z",
}
source = producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert source is not None
entity = sampling_identity(zone)
assert entity is not None
assert complete_native_source_for_hour(source, "current", zone["id"], entity, valid_time)

target = {
    "partId": "TEST",
    "parentZoneId": "ZONE-TEST",
    "name": "Test",
    "waterPoint": [2.0, 1.0],
}
targets = [target]
reference = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)
document = {
    "zones": {
        "PART::TEST": {
            "samplingPoint": [2.0, 1.0],
            "hourly": {
                valid_time: {
                    "time": valid_time,
                    "current-u": 0.1,
                    "current-v": -0.2,
                    "sources": {"current": source},
                },
            },
        },
    },
}
assert strict_verified_part_current_pair_count(
    document,
    targets,
    reference - timedelta(hours=48),
    reference + timedelta(hours=117),
) == 1
attestation = canonical_verified_part_current_attestation(
    document,
    targets,
    reference,
    reference + timedelta(hours=117),
)
assert attestation["verifiedPairCount"] == 1
assert attestation["verifiedSourceTimeCount"] == 1
assert producer.coastal_part_current_cache_reusable(document, targets, reference)

# A cache-map key may never borrow the public row/source time.  All three
# temporal claims must independently canonicalize to the same exact hour.
key_time_mismatch = json.loads(json.dumps(document))
key_time_mismatch["zones"]["PART::TEST"]["hourly"] = {
    "2026-01-01T04:00:00Z": key_time_mismatch["zones"]["PART::TEST"]["hourly"][valid_time],
}
assert strict_verified_part_current_pair_count(
    key_time_mismatch,
    targets,
    reference,
    reference + timedelta(hours=117),
) == 0
assert not producer.coastal_part_current_cache_reusable(
    key_time_mismatch,
    targets,
    reference,
)

matching_summary = json.loads(json.dumps(document))
matching_summary["zones"]["PART::TEST"]["gridPoints"] = {
    "current-u": {"longitude": 2.0, "latitude": 1.0},
    "current-v": {"longitude": 2.0, "latitude": 1.0},
}
assert producer.coastal_part_current_cache_reusable(
    matching_summary,
    targets,
    reference,
)

mismatched_summary = json.loads(json.dumps(matching_summary))
mismatched_summary["zones"]["PART::TEST"]["gridPoints"]["current-v"] = {
    "longitude": 2.1,
    "latitude": 1.0,
}
assert not producer.coastal_part_current_cache_reusable(
    mismatched_summary,
    targets,
    reference,
)

partial_summary = json.loads(json.dumps(matching_summary))
partial_summary["zones"]["PART::TEST"]["gridPoints"].pop("current-v")
assert not producer.coastal_part_current_cache_reusable(
    partial_summary,
    targets,
    reference,
)

missing_sampling_point = json.loads(json.dumps(document))
missing_sampling_point["zones"]["PART::TEST"].pop("samplingPoint")
assert not producer.coastal_part_current_cache_reusable(
    missing_sampling_point,
    targets,
    reference,
)

wrong_sampling_point = json.loads(json.dumps(document))
wrong_sampling_point["zones"]["PART::TEST"]["samplingPoint"] = [2.1, 1.0]
assert not producer.coastal_part_current_cache_reusable(
    wrong_sampling_point,
    targets,
    reference,
)

stale_positive_diagnostics = {
    "diagnostics": {
        "coastalPartCount": 1,
        "coastalPartComponentHorizonCoverage": {
            "marine": {"zonesWithAnyData": 1},
        },
    },
    "zones": {},
}
assert not producer.coastal_part_current_cache_reusable(
    stale_positive_diagnostics,
    targets,
    reference,
)

wrong_source = json.loads(json.dumps(document))
wrong_source["zones"]["PART::TEST"]["hourly"][valid_time]["sources"]["current"][
    "entityId"
] = "PART::OTHER"
assert not producer.coastal_part_current_cache_reusable(
    wrong_source,
    targets,
    reference,
)

outside_matrix_reference = datetime(2026, 1, 10, 3, tzinfo=timezone.utc)
assert not producer.coastal_part_current_cache_reusable(
    document,
    targets,
    outside_matrix_reference,
)

wrong_part_set = {
    "zones": {
        "PART::OTHER": document["zones"]["PART::TEST"],
    },
}
assert not producer.coastal_part_current_cache_reusable(
    wrong_part_set,
    targets,
    reference,
)

extra_part = json.loads(json.dumps(document))
extra_part["zones"]["PART::EXTRA"] = json.loads(
    json.dumps(document["zones"]["PART::TEST"])
)
assert not producer.coastal_part_current_cache_reusable(
    extra_part,
    targets,
    reference,
)

missing_vector_component = json.loads(json.dumps(document))
missing_vector_component["zones"]["PART::TEST"]["hourly"][valid_time].pop(
    "current-v"
)
assert not producer.coastal_part_current_cache_reusable(
    missing_vector_component,
    targets,
    reference,
)

for component, nonfinite in (
    ("current-u", float("nan")),
    ("current-v", float("inf")),
):
    nonfinite_vector = json.loads(json.dumps(document))
    nonfinite_vector["zones"]["PART::TEST"]["hourly"][valid_time][
        component
    ] = nonfinite
    assert not producer.coastal_part_current_cache_reusable(
        nonfinite_vector,
        targets,
        reference,
    )

split_vector_rows = json.loads(json.dumps(document))
first_row = split_vector_rows["zones"]["PART::TEST"]["hourly"][valid_time]
first_row.pop("current-v")
second_valid_time = "2026-01-01T04:00:00Z"
second_source = json.loads(json.dumps(source))
second_source["nativeValidTime"] = second_valid_time
split_vector_rows["zones"]["PART::TEST"]["hourly"][second_valid_time] = {
    "time": second_valid_time,
    "current-v": -0.2,
    "sources": {"current": second_source},
}
assert not producer.coastal_part_current_cache_reusable(
    split_vector_rows,
    targets,
    reference,
)

malformed_documents = (
    {"zones": 1},
    {"zones": ["PART::TEST"]},
    {"zones": {"PART::TEST": []}},
    {"zones": {"PART::TEST": {"hourly": []}}},
    {"zones": {"PART::TEST": {"hourly": {valid_time: []}}}},
    {
        "zones": {
            "PART::TEST": {
                "hourly": {
                    valid_time: {
                        "time": valid_time,
                        "current-u": 0.1,
                        "current-v": -0.2,
                        "sources": [],
                    },
                },
            },
        },
    },
)
for malformed_document in malformed_documents:
    assert not producer.coastal_part_current_cache_reusable(
        malformed_document,
        targets,
        reference,
    )
assert not producer.coastal_part_current_cache_reusable(
    document,
    [None],
    reference,
)

for strict_anchor, bootstrap_requested, bootstrap_complete, expected in (
    (False, False, False, True),
    (False, True, True, True),
    (True, True, False, True),
    (True, False, False, False),
    (True, True, True, False),
):
    assert producer.producer_success_blocked(
        strict_anchor,
        bootstrap_requested,
        bootstrap_complete,
    ) is expected

all_stale = {
    "collectionsAttempted": ["dkss_idw", "wam_dw"],
    "stacByCollection": {
        "dkss_idw": {"rejectedStaleRun": True},
        "wam_dw": {"rejectedStaleRun": True},
    },
}
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics=all_stale,
) == "DMI_CATALOG_SCHEDULE_STALE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={"collectionsAttempted": ["dkss_idw"], "stacByCollection": {}},
) == "DMI_CURRENT_LEDGER_INCOMPLETE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {
            "dkss_idw": {
                "catalogInventoryFailureCodes": ["UNPARSEABLE_STAC_ITEM"],
            },
        },
    },
) == "DMI_UNPARSEABLE_STAC_ITEM"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {},
        "currentOperationalLedger": {
            "failureCodes": ["LOCALLY_SKIPPED_DKSS_ASSET"],
        },
    },
) == "DMI_LOCALLY_SKIPPED_DKSS_ASSET"
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={
        "collectionsAttempted": ["dkss_idw"],
        "stacByCollection": {"dkss_idw": {"prefetchFailed": True}},
    },
) == "DMI_DKSS_PREFETCH_FAILED"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=True,
    bootstrap_complete=False,
    productive=True,
    diagnostics={},
) == "DMI_WAVE_BOOTSTRAP_INCOMPLETE"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=False,
    diagnostics={},
) == "DMI_READY"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=True,
    diagnostics={},
) == "DMI_READY"

# One strict DKSS pair plus productive HARMONIE is not an official-current
# ledger and must never become DMI_READY.
assert producer.producer_terminal_code(
    strict_current_anchor_available=False,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=True,
    diagnostics={
        "collectionsAttempted": ["dkss_idw", "harmonie_dini_sf"],
        "collectionsSucceeded": ["harmonie_dini_sf"],
        "stacByCollection": {},
    },
) == "DMI_CURRENT_LEDGER_INCOMPLETE"

assert producer.diagnostic_collection_failure_codes({
    "errors": [
        {"collection": "harmonie_dini_sf", "failureCode": "PARSER_TYPE_ERROR"},
        {"collection": "dkss_lf", "failureCode": "BATCHED_SCALAR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "BATCHED_VECTOR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "BATCHED_VECTOR_LOOKUP_FAILED"},
        {"collection": "dkss_idw", "failureCode": "unsafe payload"},
    ],
}) == ["BATCHED_SCALAR_LOOKUP_FAILED", "BATCHED_VECTOR_LOOKUP_FAILED"]

original_github_output = os.environ.get("GITHUB_OUTPUT")
try:
    with tempfile.TemporaryDirectory() as output_dir:
        output_path = Path(output_dir) / "github-output.txt"
        os.environ["GITHUB_OUTPUT"] = str(output_path)
        producer.write_github_outputs(
            "failed",
            terminal_code="DMI_READY\nUNSAFE",
            collection_failure_codes=[
                "BATCHED_VECTOR_LOOKUP_FAILED",
                "unsafe payload",
                "BATCHED_SCALAR_LOOKUP_FAILED",
                "BATCHED_VECTOR_LOOKUP_FAILED",
            ],
        )
        output_lines = output_path.read_text(encoding="utf-8").splitlines()
        assert "terminal_code=DMI_UNCLASSIFIED" in output_lines
        assert (
            "collection_failure_codes="
            "BATCHED_SCALAR_LOOKUP_FAILED,BATCHED_VECTOR_LOOKUP_FAILED"
        ) in output_lines
        output_path.unlink()
        producer.write_github_outputs("failed", collection_failure_codes=[])
        assert "collection_failure_codes=NONE" in output_path.read_text(
            encoding="utf-8"
        ).splitlines()
finally:
    if original_github_output is None:
        os.environ.pop("GITHUB_OUTPUT", None)
    else:
        os.environ["GITHUB_OUTPUT"] = original_github_output

# A fully processed official asset axis with only one surviving DKSS pair is a
# systemic collapse, not 117 legitimate Copernicus target hours.
required_hours = producer.operational_current_valid_times(reference)
ledger_document = json.loads(json.dumps(document))
ledger_document["runs"] = {}
official_catalogs = {}


def ledger_asset(collection: str, hour: str) -> tuple[dict, dict]:
    exact_fixture_source = collection == "dkss_lf" and hour == valid_time
    official = {
        "collection": collection,
        "modelRun": "2026-01-01T00:00:00Z",
        "validTime": hour,
        "itemId": "exact-stac-item" if exact_fixture_source else f"item-{collection}-{hour}",
        "assetIdentitySha256": "b" * 64 if exact_fixture_source else "c" * 64,
        "assetSizeBytes": 1024,
        "itemCreatedAt": "2026-01-01T01:00:00Z",
        "itemUpdatedAt": None,
    }
    return official, {
        **official,
        "acquiredAt": "2026-01-01T02:00:00Z",
        "contentLengthBytes": 1024,
        "contentSha256": "d" * 64,
    }


for collection in sorted(producer.MARINE_COLLECTIONS):
    processing_signature = f"test-{collection}"
    official_assets = []
    processed_steps = {
        hour: {
            "complete": True,
            "recognizedParameters": [
                "sea-mean-deviation",
                "current-u",
                "current-v",
            ],
            "zonesTouched": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": processing_signature,
            "sourceAsset": ledger_asset(collection, hour)[1],
        }
        for hour in required_hours
    }
    for step in processed_steps.values():
        step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
            (
                []
                if collection == "dkss_lf"
                and step["sourceAsset"]["validTime"] == valid_time
                else [target["partId"]]
            ),
            [target["partId"]],
            producer.target_fingerprint(targets),
            processing_signature,
            step["sourceAsset"],
        )
    official_assets = [ledger_asset(collection, hour)[0] for hour in required_hours]
    ledger_document["runs"][collection] = {
        "referenceTime": "2026-01-01T00:00:00Z",
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": processing_signature,
        "processedSteps": processed_steps,
    }
    official_catalogs[collection] = (
        "2026-01-01T00:00:00Z",
        official_assets,
        {
            "catalogInventoryComplete": True,
            "requiredHorizonEndCovered": True,
            "requiredRowsTruncatedByAssetLimit": 0,
            "officialRequiredValidTimeCount": len(required_hours),
            "officialRequiredValidTimes": required_hours,
            "officialRequiredAssets": official_assets,
        },
    )
collapsed_ledger = producer.build_current_operational_ledger(
    ledger_document,
    targets,
    reference,
    official_catalogs,
)
assert collapsed_ledger["ready"] is False
assert "SYSTEMIC_CURRENT_TIME_COLLAPSE" in collapsed_ledger["failureCodes"]
assert collapsed_ledger["attestation"]["verifiedPairCount"] == 1
ledger_document.setdefault("diagnostics", {})["currentOperationalLedger"] = collapsed_ledger
assert not producer.current_operational_cache_ready(
    ledger_document,
    targets,
    reference,
)

# A checkpoint is reusable only with the current parser/signature and the exact
# selected official asset capture. Unsigned legacy rows are always reprocessed.
reuse_hour = required_hours[0]
reuse_official, reuse_source = ledger_asset("dkss_idw", reuse_hour)
reuse_signature = "test-reuse-signature"
signed_step = {
    "complete": True,
    "recognizedParameters": ["current-u", "current-v"],
    "zonesTouched": 1,
    "parserVersion": producer.PARSER_VERSION,
    "processingSignature": reuse_signature,
    "sourceAsset": reuse_source,
}
signed_step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
    [],
    [target["partId"]],
    producer.target_fingerprint(targets),
    reuse_signature,
    reuse_source,
)
reuse_run = {
    "referenceTime": "2026-01-01T00:00:00Z",
    "processingSignature": reuse_signature,
    "processedSteps": {reuse_hour: signed_step},
}
reuse_args = {
    "collection": "dkss_idw",
    "same_processing": True,
    "same_run": True,
    "strict_current_anchor_available": True,
    "required_valid_times": {reuse_hour},
    "required_asset_provenance": {reuse_hour: reuse_official},
    "current_target_ids": [target["partId"]],
    "current_target_registry_sha256": producer.target_fingerprint(targets),
}
assert producer.reusable_processed_steps(reuse_run, **reuse_args) == {
    reuse_hour: signed_step,
}
# DMI's STAC schema may omit a declared byte size. The exact local capture still
# binds content length/digest, acquisition and the complete item revision, so the
# signed checkpoint remains reusable without inventing a size claim.
size_less_official = {**reuse_official, "assetSizeBytes": None}
size_less_source = {**reuse_source, "assetSizeBytes": None}
size_less_step = {**signed_step, "sourceAsset": size_less_source}
size_less_step["currentPartOutcomeProof"] = producer.build_current_part_outcome_proof(
    [],
    [target["partId"]],
    producer.target_fingerprint(targets),
    reuse_signature,
    size_less_source,
)
size_less_run = {
    **reuse_run,
    "processedSteps": {reuse_hour: size_less_step},
}
size_less_args = {
    **reuse_args,
    "required_asset_provenance": {reuse_hour: size_less_official},
}
assert producer.reusable_processed_steps(size_less_run, **size_less_args) == {
    reuse_hour: size_less_step,
}
unsigned_run = json.loads(json.dumps(reuse_run))
unsigned_run["processedSteps"][reuse_hour].pop("processingSignature")
assert producer.reusable_processed_steps(unsigned_run, **reuse_args) == {}
signalless_source_run = json.loads(json.dumps(reuse_run))
signalless_source_run["processedSteps"][reuse_hour].pop("sourceAsset")
assert producer.reusable_processed_steps(signalless_source_run, **reuse_args) == {}
tampered_outcome_run = json.loads(json.dumps(reuse_run))
tampered_outcome_run["processedSteps"][reuse_hour]["currentPartOutcomeProof"][
    "outcomesSha256"
] = "sha256:" + "0" * 64
assert producer.reusable_processed_steps(tampered_outcome_run, **reuse_args) == {}

# Exact native current hours remain complete while optional marine fields retain
# the established non-ledger stride. Progress checkpoints are bounded by both
# work count and wall time and can always be forced at a safe boundary.
filter_run = "2026-01-01T00:00:00Z"
filter_non_stride = "2026-01-01T07:00:00Z"
filter_stride = "2026-01-01T09:00:00Z"
filter_required = {filter_non_stride, filter_stride}
assert producer.operational_asset_parameter_filter(
    "dkss_lf", filter_non_stride, filter_run, filter_required
) == set(producer.REQUIRED_TARGETS["marine"])
assert producer.operational_asset_parameter_filter(
    "dkss_lf", filter_stride, filter_run, filter_required
) is None
assert producer.operational_asset_parameter_filter(
    "dkss_lf", "2026-01-01T08:00:00Z", filter_run, filter_required
) is None
assert producer.operational_asset_parameter_filter(
    "wam_dw", filter_non_stride, filter_run, filter_required
) is None

checkpoint_at = 100.0
assert not producer.progress_checkpoint_due(0, checkpoint_at, force=True)
assert not producer.progress_checkpoint_due(
    producer.CHECKPOINT_MAX_ASSETS - 1,
    checkpoint_at,
    now_monotonic=checkpoint_at + producer.CHECKPOINT_MAX_SECONDS - 1,
)
assert producer.progress_checkpoint_due(
    producer.CHECKPOINT_MAX_ASSETS,
    checkpoint_at,
    now_monotonic=checkpoint_at,
)
assert producer.progress_checkpoint_due(
    1,
    checkpoint_at,
    now_monotonic=checkpoint_at + producer.CHECKPOINT_MAX_SECONDS,
)
assert producer.progress_checkpoint_due(
    1,
    checkpoint_at,
    force=True,
    now_monotonic=checkpoint_at,
)

# One low-level SAME_GRID context must return the exact same canonical marine
# candidate union as the legacy high-level helper using the unchanged probes.
original_low_new = producer.codes_grib_nearest_new
original_low_find = producer.codes_grib_nearest_find
original_low_delete = producer.codes_grib_nearest_delete
original_same_grid_flag = producer.CODES_GRIB_NEAREST_SAME_GRID
original_high_find = producer.codes_grib_find_nearest
try:
    signature = ("synthetic-grid",)
    low_new_calls = []
    low_find_flags = []
    low_delete_calls = []

    def deterministic_four(_gid, latitude, longitude, *args, **kwargs):
        del args, kwargs
        base = abs(
            int(round((float(latitude) + 90.0) * 1_000_000)) * 1_000_003
            + int(round((float(longitude) + 180.0) * 1_000_000))
        )
        return [
            {
                "index": base + offset,
                "lat": float(latitude) + offset * 0.00001,
                "lon": float(longitude) - offset * 0.00001,
            }
            for offset in range(4)
        ]

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = deterministic_four
    legacy_candidates = producer.nearest_candidates(
        996,
        "dkss_lf",
        zone,
        signature=signature,
    )

    producer.GRID_INDEX_CACHE.clear()
    producer.CODES_GRIB_NEAREST_SAME_GRID = 1
    producer.codes_grib_nearest_new = lambda gid: low_new_calls.append(gid) or 4242

    def low_find(nearest_id, gid, latitude, longitude, flags, is_lsm, npoints):
        assert nearest_id == 4242 and is_lsm is False and npoints == 4
        low_find_flags.append(flags)
        return deterministic_four(gid, latitude, longitude)

    producer.codes_grib_nearest_find = low_find
    producer.codes_grib_nearest_delete = lambda nearest_id: low_delete_calls.append(nearest_id)
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    warmed_candidates = producer.nearest_candidates(
        996,
        "dkss_lf",
        zone,
        signature=signature,
    )
    assert warmed_candidates == legacy_candidates
    assert low_new_calls == [996]
    assert low_delete_calls == [4242]
    assert low_find_flags[0] == 0
    assert set(low_find_flags[1:]) == {producer.CODES_GRIB_NEAREST_SAME_GRID}
    completed_find_count = len(low_find_flags)
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    assert len(low_find_flags) == completed_find_count
    assert low_new_calls == [996]

    # A rejected first probe must not enable SAME_GRID before ecCodes has
    # successfully initialized the reusable nearest geometry.
    producer.GRID_INDEX_CACHE.clear()
    low_find_flags.clear()
    low_delete_calls.clear()
    first_boundary = [True]

    def boundary_low_find(nearest_id, gid, latitude, longitude, flags, is_lsm, npoints):
        assert nearest_id == 4242 and is_lsm is False and npoints == 4
        low_find_flags.append(flags)
        if first_boundary[0]:
            first_boundary[0] = False
            raise producer.OutOfAreaError("synthetic first probe outside grid")
        return deterministic_four(gid, latitude, longitude)

    producer.codes_grib_nearest_find = boundary_low_find
    producer.warm_marine_grid_cache(996, "dkss_lf", [zone], signature)
    assert low_find_flags[:2] == [0, 0]
    assert set(low_find_flags[2:]) == {producer.CODES_GRIB_NEAREST_SAME_GRID}
    assert low_delete_calls == [4242]

    # A low-level failure is fail-closed, deletes the nearest object and leaves
    # no partially warmed candidate map behind.
    producer.GRID_INDEX_CACHE.clear()
    low_delete_calls.clear()

    def fail_low_find(*_args, **_kwargs):
        raise RuntimeError("synthetic low-level nearest failure")

    producer.codes_grib_nearest_find = fail_low_find
    try:
        producer.warm_marine_grid_cache(997, "dkss_lf", [zone], signature)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_LOOKUP_FAILED"
    else:
        raise AssertionError("Low-level nearest failure must fail closed")
    assert low_delete_calls == [4242]
    assert producer.GRID_INDEX_CACHE == {}
finally:
    producer.codes_grib_nearest_new = original_low_new
    producer.codes_grib_nearest_find = original_low_find
    producer.codes_grib_nearest_delete = original_low_delete
    producer.CODES_GRIB_NEAREST_SAME_GRID = original_same_grid_flag
    producer.codes_grib_find_nearest = original_high_find
    producer.GRID_INDEX_CACHE.clear()

# ecCodes/grid failures are local processing failures. They must propagate and
# must never be cached or reclassified as a terminal spatial DMI gap.
original_find_nearest = producer.codes_grib_find_nearest
original_codes_get = producer.codes_get
original_get_elements = producer.codes_get_elements
original_nearest_candidates = producer.nearest_candidates
try:
    producer.GRID_INDEX_CACHE.clear()

    def fail_nearest(*_args, **_kwargs):
        raise RuntimeError("synthetic grid failure")

    producer.codes_get = fail_nearest
    try:
        producer.grid_signature(990)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "GRID_IDENTITY_READ_FAILED"
    else:
        raise AssertionError("Unreadable grid identity must fail closed")
    producer.codes_get = original_codes_get

    producer.codes_grib_find_nearest = fail_nearest
    try:
        producer.nearest_candidates(991, "dkss_idw", zone)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_LOOKUP_FAILED"
    else:
        raise AssertionError("Nearest-grid exception must fail closed")
    assert producer.GRID_INDEX_CACHE == {}

    # A bounded-grid result is not a decoder failure. Skip an out-of-area probe
    # while the remaining redundant probes still return actual grid candidates.
    probe_calls = [0]

    def boundary_then_candidate(_gid, lat, lon, *args, **kwargs):
        del args, kwargs
        probe_calls[0] += 1
        if probe_calls[0] == 1:
            raise producer.OutOfAreaError("synthetic grid boundary")
        return [{"index": 17, "lat": lat, "lon": lon}]

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = boundary_then_candidate
    boundary_candidates = producer.nearest_candidates(993, "dkss_idw", zone)
    assert boundary_candidates
    assert boundary_candidates[0]["index"] == 17
    completed_probe_calls = probe_calls[0]
    assert producer.nearest_candidates(993, "dkss_idw", zone) == boundary_candidates
    assert probe_calls[0] == completed_probe_calls

    # A complete set of explicit out-of-area results is an attested spatial
    # outcome, not an unknown local processing error.
    def outside_grid(*_args, **_kwargs):
        raise producer.OutOfAreaError("synthetic grid boundary")

    producer.GRID_INDEX_CACHE.clear()
    producer.codes_grib_find_nearest = outside_grid
    assert producer.nearest_candidates(994, "dkss_idw", zone) == []
    producer.GRID_INDEX_CACHE.clear()
    try:
        producer.nearest_candidates(995, "wam_dw", zone)
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "NEAREST_GRID_OUT_OF_AREA"
    else:
        raise AssertionError("Non-DKSS out-of-area lookup must remain fail-closed")

    producer.nearest_candidates = lambda *_args, **_kwargs: [{
        "index": 7,
        "latitude": 1.0,
        "longitude": 2.0,
        "distanceKm": 0.0,
    }]

    class NumpyArrayLike:
        """Exercise the documented ecCodes ndarray protocol without NumPy."""

        __module__ = "numpy"
        ndim = 1

        def __init__(self, values):
            self.values = list(values)

        def __iter__(self):
            return iter(self.values)

        def tolist(self):
            return list(self.values)

    producer.codes_get_elements = lambda *_args, **_kwargs: [0.25]
    assert producer.batched_element_values(992, [7], "vector") == [0.25]

    producer.codes_get_elements = lambda *_args, **_kwargs: NumpyArrayLike([0.25])
    vector_rows = producer.valid_candidates_batch(992, "dkss_idw", [zone])
    scalar_rows = producer.nearest_valid_batch(992, "dkss_idw", [zone])
    assert vector_rows[zone["id"]][0]["value"] == 0.25
    assert scalar_rows[zone["id"]]["value"] == 0.25

    # Grid identity and its digest are message-local work. Adding more zones
    # must not multiply ecCodes metadata calls before a cache hit can be read.
    metadata_calls = []

    def counting_codes_get(_gid, key):
        metadata_calls.append(key)
        return 9999.0 if key == "missingValue" else f"grid-{key}"

    second_zone = {**zone, "id": "PART::TEST-2"}
    producer.codes_get = counting_codes_get
    producer.codes_get_elements = lambda *_args, **_kwargs: [0.25]
    counted_rows = producer.valid_candidates_batch(
        998,
        "dkss_idw",
        [zone, second_zone],
    )
    assert set(counted_rows) == {zone["id"], second_zone["id"]}
    assert metadata_calls.count("md5GridSection") == 1
    assert metadata_calls.count("missingValue") == 1
    assert len(metadata_calls) == 12
    legacy_definition_signature = tuple(
        f"grid-{key}" for key in producer.GRID_DEFINITION_KEYS
    )
    assert counted_rows[zone["id"]][0]["gridDefinitionSha256"] == (
        producer.grid_definition_sha256_from_signature(
            legacy_definition_signature
        )
    )
    assert counted_rows[zone["id"]][0]["gridDefinitionSha256"] != (
        producer.grid_definition_sha256_from_signature(
            ("grid-md5GridSection", *legacy_definition_signature)
        )
    )

    # Grid v9 keeps the public legacy digest stable, but two GRIB grids with
    # identical dimensions and different grid-section md5 must never share the
    # internal nearest-index cache.
    def grid_identity_codes_get(gid, key):
        if key == "md5GridSection":
            return f"grid-section-{gid}"
        return f"grid-{key}"

    producer.codes_get = grid_identity_codes_get
    first_cache_signature = producer.grid_cache_signature(1001)
    second_cache_signature = producer.grid_cache_signature(1002)
    assert first_cache_signature[1:] == second_cache_signature[1:]
    assert first_cache_signature != second_cache_signature
    producer.GRID_INDEX_CACHE.clear()

    def one_grid_candidate(index):
        def lookup(_latitude, _longitude):
            return [{"index": index, "lat": 1.0, "lon": 2.0}]

        return lookup

    first_grid_rows = original_nearest_candidates(
        1001,
        "dkss_idw",
        zone,
        signature=first_cache_signature,
        nearest_lookup=one_grid_candidate(71),
    )
    second_grid_rows = original_nearest_candidates(
        1002,
        "dkss_idw",
        zone,
        signature=second_cache_signature,
        nearest_lookup=one_grid_candidate(72),
    )
    assert first_grid_rows[0]["index"] == 71
    assert second_grid_rows[0]["index"] == 72
    assert len(producer.GRID_INDEX_CACHE) == 2
    producer.GRID_INDEX_CACHE.clear()

    # An unordered iterable can silently detach values from their requested
    # grid indexes even when its length happens to match.
    producer.codes_get_elements = lambda *_args, **_kwargs: {0.25}
    try:
        producer.batched_element_values(992, [7], "vector")
    except producer.DmiGridLookupError as exc:
        assert exc.failure_code == "BATCHED_VECTOR_RESULT_INVALID"
    else:
        raise AssertionError("An unordered ecCodes result must fail closed")

    producer.codes_get_elements = lambda *_args, **_kwargs: NumpyArrayLike([])
    for helper, expected_code in (
        (producer.valid_candidates_batch, "BATCHED_VECTOR_RESULT_INVALID"),
        (producer.nearest_valid_batch, "BATCHED_SCALAR_RESULT_INVALID"),
    ):
        try:
            helper(992, "dkss_idw", [zone])
        except producer.DmiGridLookupError as exc:
            assert exc.failure_code == expected_code
        else:
            raise AssertionError("A wrong-length ecCodes array must fail closed")

    producer.codes_get_elements = fail_nearest
    for helper, expected_code in (
        (producer.valid_candidates_batch, "BATCHED_VECTOR_LOOKUP_FAILED"),
        (producer.nearest_valid_batch, "BATCHED_SCALAR_LOOKUP_FAILED"),
    ):
        try:
            helper(992, "dkss_idw", [zone])
        except producer.DmiGridLookupError as exc:
            assert exc.failure_code == expected_code
        else:
            raise AssertionError("Batched grid exception must fail closed")
finally:
    producer.codes_grib_find_nearest = original_find_nearest
    producer.codes_get = original_codes_get
    producer.codes_get_elements = original_get_elements
    producer.nearest_candidates = original_nearest_candidates
    producer.GRID_INDEX_CACHE.clear()

# A grid-definition digest is string metadata, not a number. Both the shared
# vector path and the scalar path must preserve it without passing it to round().
original_codes_grib_new_from_file = producer.codes_grib_new_from_file
original_codes_release = producer.codes_release
original_classify_parameter = producer.classify_parameter
original_valid_candidates_batch = producer.valid_candidates_batch
original_nearest_valid_batch = producer.nearest_valid_batch
original_nearest_candidates = producer.nearest_candidates
original_should_stop_work = producer.should_stop_work
original_raw_cache_source_capture = producer.raw_cache_source_capture
try:
    with tempfile.TemporaryDirectory() as directory:
        asset_path = Path(directory) / "synthetic-dkss.grib"
        asset_path.write_bytes(b"synthetic")
        handles = iter((1, 2, 3, 4, 5, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.codes_release = lambda _gid: None
        parameters = {
            1: "current-u",
            2: "current-v",
            3: "sea-mean-deviation",
            4: "wind-tail-u-10m",
            5: "wind-tail-v-10m",
        }
        producer.classify_parameter = lambda gid, _collection: parameters[gid]
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [dict(candidate, index=7)] for item in wanted
        }
        producer.nearest_valid_batch = lambda _gid, _collection, wanted: {
            item["id"]: dict(candidate, index=7, _candidateCount=4)
            for item in wanted
        }
        producer.nearest_candidates = lambda *_args, **_kwargs: [dict(candidate, index=7)]
        producer.should_stop_work = lambda: False
        producer.raw_cache_source_capture = lambda *_args: None
        output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        unfiltered_found, _, _, _, _ = producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            output,
            {},
        )
        grid_points = output["zones"][zone["id"]]["gridPoints"]
        assert grid_points["current-u"]["gridDefinitionSha256"] == "a" * 64
        assert grid_points["sea-mean-deviation"]["gridDefinitionSha256"] == "a" * 64
        assert all("_candidateCount" not in point for point in grid_points.values())
        hour = output["zones"][zone["id"]]["hourly"][valid_time]
        assert "current-u" in hour and "sea-mean-deviation" in hour
        assert {"wind-tail-u-10m", "wind-tail-v-10m"} <= set(hour)
        assert {"wind-tail-u-10m", "wind-tail-v-10m"} <= unfiltered_found

        # Exact native-current hours between optional-field stride positions
        # still decode all required marine fields, but skip both optional wind
        # messages before any grid lookup or output projection.
        handles = iter((1, 2, 3, 4, 5, None))
        filtered_output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        filtered_found, filtered_touched, _, _, _ = producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            filtered_output,
            {},
            allowed_parameters=set(producer.REQUIRED_TARGETS["marine"]),
        )
        filtered_hour = filtered_output["zones"][zone["id"]]["hourly"][valid_time]
        assert filtered_found == set(producer.REQUIRED_TARGETS["marine"])
        assert filtered_touched == {zone["id"]}
        assert {"current-u", "current-v", "sea-mean-deviation"} <= set(filtered_hour)
        assert "wind-tail-u-10m" not in filtered_hour
        assert "wind-tail-v-10m" not in filtered_hour
        assert "wind-tail-u-10m" not in filtered_output["zones"][zone["id"]]["gridPoints"]
        assert "wind-tail-v-10m" not in filtered_output["zones"][zone["id"]]["gridPoints"]

        # Spatial outcome is collection-local. A valid farther DKSS candidate
        # must not be labelled unavailable merely because an already selected
        # DMI collection remains the closer global winner.
        losing_candidate = {
            **candidate,
            "longitude": 2.02,
            "distanceKm": 1.0,
            "index": 9,
        }
        existing_source = producer.native_component_source(
            "dkss_idw",
            "2026-01-01T00:00:00Z",
            valid_time,
            component="current",
            zone=zone,
            grid_candidate=candidate,
            capture=capture,
            spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
            verticalLayer="depthBelowSea:1",
            verticalLayerRankM=1.0,
            vectorSelection=producer.CURRENT_VECTOR_SELECTION,
            vectorSemanticsVersion=producer.CURRENT_VECTOR_SEMANTICS_VERSION,
        )
        assert existing_source is not None
        handles = iter((11, 12, None))
        producer.codes_grib_new_from_file = lambda _handle: next(handles)
        producer.classify_parameter = lambda gid, _collection: {
            11: "current-u",
            12: "current-v",
        }[gid]
        producer.valid_candidates_batch = lambda _gid, _collection, wanted: {
            item["id"]: [dict(losing_candidate)] for item in wanted
        }
        losing_output = {
            "generatedAt": "2026-01-01T02:00:00Z",
            "zones": {
                zone["id"]: {
                    "hourly": {
                        valid_time: {
                            "time": valid_time,
                            "current-u": 0.4,
                            "current-v": -0.3,
                            "sources": {"current": existing_source},
                        },
                    },
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        part_outcome = {}
        producer.process_grib(
            asset_path,
            "dkss_lf",
            "2026-01-01T00:00:00Z",
            valid_time,
            [zone],
            losing_output,
            {},
            current_part_outcomes=part_outcome,
        )
        assert part_outcome["complete"] is True
        assert part_outcome["targetPartIds"] == ["TEST"]
        assert part_outcome["spatialUnavailablePartIds"] == []
        retained = losing_output["zones"][zone["id"]]["hourly"][valid_time]
        assert retained["current-u"] == 0.4 and retained["current-v"] == -0.3
finally:
    producer.codes_grib_new_from_file = original_codes_grib_new_from_file
    producer.codes_release = original_codes_release
    producer.classify_parameter = original_classify_parameter
    producer.valid_candidates_batch = original_valid_candidates_batch
    producer.nearest_valid_batch = original_nearest_valid_batch
    producer.nearest_candidates = original_nearest_candidates
    producer.should_stop_work = original_should_stop_work
    producer.raw_cache_source_capture = original_raw_cache_source_capture

# DKSS native cadence is hourly. A newer run whose tail is still publishing is
# deferred in favour of the preceding mature run, and every official hour in
# +0..+117 is selected. An internal STAC absence remains an explicit exact gap.
selection_reference = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)
older_run = datetime(2026, 1, 1, 0, tzinfo=timezone.utc)
latest_run = datetime(2026, 1, 1, 3, tzinfo=timezone.utc)


def stac_item(model_run: datetime, lead: int) -> dict:
    valid = model_run + timedelta(hours=lead)
    item_id = f"{model_run.hour:02d}-{lead:03d}"
    return {
        "id": item_id,
        "properties": {
            "forecast:reference_datetime": model_run.isoformat().replace("+00:00", "Z"),
            "datetime": valid.isoformat().replace("+00:00", "Z"),
            "created": (model_run + timedelta(hours=1)).isoformat().replace("+00:00", "Z"),
        },
        "assets": {
            "data": {
                "href": f"https://example.invalid/{item_id}.grib",
                "type": "application/x-grib",
                "file:size": 1024,
            },
        },
    }


older_items = [stac_item(older_run, lead) for lead in range(121)]
latest_partial_items = [stac_item(latest_run, lead) for lead in range(108)]
original_request_json = producer.request_json
original_time = producer.time.time
try:
    producer.time.time = lambda: selection_reference.timestamp()
    catalog_items = [*latest_partial_items, *older_items]
    producer.request_json = lambda *_args, **_kwargs: {"features": catalog_items}
    selection_hours = set(producer.operational_current_valid_times(selection_reference))
    selection_end = max(selection_hours, key=producer.epoch)
    selected_run, selected_assets, selected_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert len(selected_assets) == 118
    assert {row["valid"] for row in selected_assets} == selection_hours
    assert selected_stats["incompleteLatestRunDeferred"] is True
    assert selected_stats["officialNativeCadenceHours"] == 1
    assert selected_stats["catalogInventoryComplete"] is True
    assert len(selected_stats["officialRequiredAssets"]) == 118
    assert selected_stats["nativeCompleteRunCount"] == 1
    assert selected_stats["selectedNativeRunComplete"] is True
    assert selected_stats["requiredHorizonEndCovered"] is True
    assert selected_stats["requiredWindowInventoryComplete"] is True

    # The same inventory remains complete when STAC requires a two-page chain.
    page_one = catalog_items[:100]
    page_two = catalog_items[100:]
    pagination_requests = []

    def paged_request(url: str, _params=None) -> dict:
        pagination_requests.append((url, _params))
        features = page_two if "page=2" in url else page_one
        return {
            "features": features,
            "numberMatched": len(catalog_items),
            "numberReturned": len(features),
            "links": [] if "page=2" in url else [{
                "rel": "next",
                "href": (
                    f"{producer.STAC_ROOT}/collections/dkss_idw/items?page=2"
                ),
            }],
        }

    producer.request_json = paged_request
    paged_run, paged_assets, paged_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert paged_run == selected_run
    assert len(paged_assets) == 118
    assert paged_stats["paginationPagesFetched"] == 2
    assert paged_stats["catalogInventoryComplete"] is True
    assert pagination_requests[0][1]["datetime"] == (
        f"{min(selection_hours, key=producer.epoch)}/"
        f"{selection_end}"
    )
    assert pagination_requests[1][1] is None

    # An overlapping/replayed item identity across pages makes unique-item
    # exhaustion unprovable, even when numberMatched would otherwise balance.
    overlap_page_two = [page_one[-1], *page_two]

    def overlap_request(url: str, _params=None) -> dict:
        features = overlap_page_two if "page=2" in url else page_one
        return {
            "features": features,
            "numberMatched": len(catalog_items),
            "numberReturned": len(features),
            "links": [] if "page=2" in url else [{
                "rel": "next",
                "href": (
                    f"{producer.STAC_ROOT}/collections/dkss_idw/items?page=2"
                ),
            }],
        }

    producer.request_json = overlap_request
    _overlap_run, overlap_assets, overlap_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert overlap_stats["catalogInventoryComplete"] is False
    assert "STAC_DUPLICATE_ITEM_IDENTITY" in overlap_stats["catalogInventoryFailureCodes"]
    assert overlap_stats["paginationItemsFetched"] == len(catalog_items) + 1
    assert overlap_stats["paginationUniqueItems"] == len(catalog_items)

    # A full terminal page without next/total evidence is truncated and may
    # never turn unseen official hours into upstream absence.
    truncated_items = (catalog_items * 5)[:producer.STAC_PAGE_LIMIT]
    producer.request_json = lambda *_args, **_kwargs: {
        "features": truncated_items,
        "numberReturned": len(truncated_items),
        "links": [],
    }
    _truncated_run, _truncated_assets, truncated_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert truncated_stats["catalogInventoryComplete"] is False
    assert "STAC_PAGINATION_UNPROVEN" in truncated_stats["catalogInventoryFailureCodes"]

    # One locally unparseable STAC item invalidates the catalog proof even when
    # every required official asset is otherwise present.
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*catalog_items, {"id": "bad", "properties": {}, "assets": {}}],
    }
    _bad_run, _bad_assets, bad_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert bad_stats["catalogInventoryComplete"] is False
    assert "UNPARSEABLE_STAC_ITEM" in bad_stats["catalogInventoryFailureCodes"]
    invalid_catalog_results = []
    invalid_identity_cases = (
        (
            "malformed secondary run alias",
            lambda item: item["properties"].update({"reference_datetime": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting secondary run alias",
            lambda item: item["properties"].update({
                "modelRun": older_run.isoformat().replace("+00:00", "Z"),
            }),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "malformed secondary valid-time alias",
            lambda item: item["properties"].update({"forecast:valid_time": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting secondary valid-time alias",
            lambda item: item["properties"].update({
                "valid_time": older_run.isoformat().replace("+00:00", "Z"),
            }),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "timezone-naive explicit run",
            lambda item: item["properties"].update({"model_run": "2026-01-01T03:00:00"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "malformed created timestamp",
            lambda item: item["properties"].update({"created": "not-a-time"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "timezone-naive updated timestamp",
            lambda item: item["properties"].update({"updated": "2026-01-01T04:00:00"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "numeric item id",
            lambda item: item.update({"id": 42}),
            "STAC_ITEM_IDENTITY_INVALID",
        ),
        (
            "blank item id",
            lambda item: item.update({"id": "   "}),
            "STAC_ITEM_IDENTITY_INVALID",
        ),
        (
            "boolean asset size",
            lambda item: item["assets"]["data"].update({"file:size": True}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "zero asset size",
            lambda item: item["assets"]["data"].update({"file:size": 0}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "string asset size",
            lambda item: item["assets"]["data"].update({"file:size": "1024"}),
            "UNPARSEABLE_STAC_ITEM",
        ),
        (
            "conflicting asset-size aliases",
            lambda item: item["assets"]["data"].update({"size": 2048}),
            "UNPARSEABLE_STAC_ITEM",
        ),
    )
    for label, mutate, expected_failure_code in invalid_identity_cases:
        invalid_catalog = json.loads(json.dumps(catalog_items))
        mutate(invalid_catalog[0])
        producer.request_json = (
            lambda *_args, _catalog=invalid_catalog, **_kwargs: {
                "features": _catalog,
            }
        )
        _invalid_run, invalid_assets, invalid_stats = producer.list_latest_assets(
            "dkss_idw",
            minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
            required_valid_times=selection_hours,
            required_horizon_end_time=selection_end,
            allow_documented_required_gaps=True,
        )
        assert invalid_stats["catalogInventoryComplete"] is False, label
        assert expected_failure_code in invalid_stats["catalogInventoryFailureCodes"], label
        invalid_catalog_results.append((invalid_assets, invalid_stats))

    # Distinct STAC items may not compete for one collection/run/validTime.
    duplicate_catalog = json.loads(json.dumps(catalog_items))
    duplicate_item = json.loads(json.dumps(older_items[50]))
    duplicate_item["id"] = "duplicate-run-valid-time"
    duplicate_item["assets"]["data"]["href"] = (
        "https://example.invalid/duplicate-run-valid-time.grib"
    )
    duplicate_catalog.append(duplicate_item)
    producer.request_json = lambda *_args, **_kwargs: {"features": duplicate_catalog}
    _duplicate_run, duplicate_assets, duplicate_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert duplicate_stats["catalogInventoryComplete"] is False
    assert duplicate_stats["duplicateValidTimes"] == 1
    assert (
        "STAC_DUPLICATE_COLLECTION_RUN_VALID_TIME"
        in duplicate_stats["catalogInventoryFailureCodes"]
    )
    for incomplete_assets, incomplete_stats in (
        (overlap_assets, overlap_stats),
        (_truncated_assets, truncated_stats),
        (_bad_assets, bad_stats),
        *invalid_catalog_results,
        (duplicate_assets, duplicate_stats),
    ):
        incomplete_catalogs = dict(official_catalogs)
        incomplete_catalogs["dkss_idw"] = (
            selected_run,
            incomplete_assets,
            incomplete_stats,
        )
        incomplete_ledger = producer.build_current_operational_ledger(
            ledger_document,
            targets,
            reference,
            incomplete_catalogs,
        )
        idw_ledger = next(
            row for row in incomplete_ledger["collections"]
            if row["collection"] == "dkss_idw"
        )
        assert idw_ledger["stateCounts"]["LOCALLY_SKIPPED"] == 118
        assert idw_ledger["stateCounts"]["UPSTREAM_ABSENT"] == 0
        assert incomplete_ledger["ready"] is False

    missing_hour = (older_run + timedelta(hours=50)).isoformat().replace("+00:00", "Z")
    catalog_items = [
        *latest_partial_items,
        *(item for item in older_items if item["properties"]["datetime"] != missing_hour),
    ]
    producer.request_json = lambda *_args, **_kwargs: {"features": catalog_items}
    _run, gap_assets, gap_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=selection_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=selection_hours,
        required_horizon_end_time=selection_end,
        allow_documented_required_gaps=True,
    )
    assert len(gap_assets) == 117
    assert missing_hour not in {row["valid"] for row in gap_assets}
    assert gap_stats["officialRequiredGapCount"] == 1

    # At a target seven hours after the preceding complete DKSS run, DMI's
    # native +120 h endpoint resolves target..+113.  The exact four-hour public
    # tail is an upstream absence for the supplement, while a newer partial run
    # remains ineligible.
    tail_reference = older_run + timedelta(hours=7)
    tail_latest_run = older_run + timedelta(hours=6)
    tail_latest_partial_items = [
        stac_item(tail_latest_run, lead) for lead in range(31)
    ]
    producer.time.time = lambda: tail_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*tail_latest_partial_items, *older_items],
    }
    tail_hours = set(producer.operational_current_valid_times(tail_reference))
    tail_end = max(tail_hours, key=producer.epoch)
    tail_run, tail_assets, tail_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert tail_run == older_run.isoformat().replace("+00:00", "Z")
    assert len(tail_assets) == 114
    assert tail_stats["nativeCompleteRunCount"] == 1
    assert tail_stats["selectedNativeRunComplete"] is True
    assert tail_stats["requiredHorizonEndCovered"] is False
    assert tail_stats["requiredWindowInventoryComplete"] is True
    assert tail_stats["officialRequiredGapCount"] == 4

    # A partial run must never turn its unpublished native tail into a large
    # apparent DMI gap, even when the STAC page itself is exhaustive.
    producer.request_json = lambda *_args, **_kwargs: {
        "features": tail_latest_partial_items,
    }
    partial_run, partial_assets, partial_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert partial_run is None
    assert partial_assets == []
    assert partial_stats["catalogInventoryComplete"] is True
    assert partial_stats["nativeCompleteRunCount"] == 0
    assert partial_stats["selectedNativeRunComplete"] is False
    assert partial_stats["requiredWindowInventoryComplete"] is False

    # A later row cannot stand in for the documented exact +120 endpoint.
    endpoint_missing_items = [
        stac_item(older_run, lead) for lead in [*range(120), 121]
    ]
    producer.request_json = lambda *_args, **_kwargs: {
        "features": endpoint_missing_items,
    }
    endpoint_run, endpoint_assets, endpoint_stats = producer.list_latest_assets(
        "dkss_idw",
        minimum_valid_time=tail_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=tail_hours,
        required_horizon_end_time=tail_end,
        allow_documented_required_gaps=True,
    )
    assert endpoint_run is None
    assert endpoint_assets == []
    assert endpoint_stats["nativeCompleteRunCount"] == 0

    # Operational DMI-first selection always uses the newest complete native
    # cycle; an older cached preferred run may not create a larger Copernicus
    # tail merely because it remains within one publication cadence.
    preferred_reference = older_run + timedelta(hours=13)
    middle_run = older_run + timedelta(hours=6)
    newest_run = older_run + timedelta(hours=12)
    middle_complete_items = [stac_item(middle_run, lead) for lead in range(121)]
    newest_partial_items = [stac_item(newest_run, lead) for lead in range(31)]
    producer.time.time = lambda: preferred_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*newest_partial_items, *middle_complete_items, *older_items],
    }
    preferred_hours = set(
        producer.operational_current_valid_times(preferred_reference)
    )
    preferred_end = max(preferred_hours, key=producer.epoch)
    preferred_selected_run, _, preferred_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=preferred_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=preferred_hours,
        required_horizon_end_time=preferred_end,
        allow_documented_required_gaps=True,
    )
    assert preferred_selected_run == middle_run.isoformat().replace("+00:00", "Z")
    assert preferred_stats["nativeCompleteRunCount"] == 2

    pinned_selected_run, _, pinned_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=preferred_reference.isoformat().replace("+00:00", "Z"),
        required_valid_times=preferred_hours,
        required_horizon_end_time=preferred_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert pinned_selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert pinned_stats["preferredNativeRunPinned"] is True
    assert pinned_stats.get("rejectedStaleRun") is not True

    # Candidate retention has its own 96-hour bound.  Tightening ordinary
    # run maturity to 118 hours must not reset a partially processed preferred
    # candidate that still has 107 valid future hours.
    stricter_selected_run, stricter_stats = producer.select_forecast_run(
        {
            older_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (older_run + timedelta(hours=120))
                .isoformat().replace("+00:00", "Z"),
            }],
            middle_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (middle_run + timedelta(hours=120))
                .isoformat().replace("+00:00", "Z"),
            }],
            newest_run.isoformat().replace("+00:00", "Z"): [{
                "valid": (newest_run + timedelta(hours=30))
                .isoformat().replace("+00:00", "Z"),
            }],
        },
        older_run.isoformat().replace("+00:00", "Z"),
        now_epoch=preferred_reference.timestamp(),
        retention_horizon_hours=118,
        retain_preferred_run=True,
    )
    assert stricter_selected_run == older_run.isoformat().replace("+00:00", "Z")
    assert stricter_stats["runRetentionHorizonHours"] == 118
    assert stricter_stats["selectedRunFutureHorizonHours"] == 107.0
    assert stricter_stats["preferredProgressiveRunPinned"] is True

    # A bounded candidate pin may exceed one observed cadence, but it must
    # never overrule explicit evidence that the complete STAC catalog is stale.
    stale_catalog_reference = older_run + timedelta(hours=20)
    producer.time.time = lambda: stale_catalog_reference.timestamp()
    stale_catalog_hours = set(
        producer.operational_current_valid_times(stale_catalog_reference)
    )
    stale_catalog_end = max(stale_catalog_hours, key=producer.epoch)
    stale_selected_run, stale_assets, stale_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=stale_catalog_reference.isoformat().replace(
            "+00:00", "Z"
        ),
        required_valid_times=stale_catalog_hours,
        required_horizon_end_time=stale_catalog_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert stale_selected_run is None
    assert stale_assets == []
    assert stale_stats["preferredNativeRunPinned"] is True
    assert stale_stats["catalogScheduleFresh"] is False
    assert stale_stats["rejectedStaleRun"] is True

    # Retention is bounded by the configured complete horizon.  A preferred
    # native run can still expose its exact +120 endpoint while having less
    # than 96 future hours left; it must then yield to a newer mature run.
    expired_preferred_reference = older_run + timedelta(hours=25)
    newer_mature_run = older_run + timedelta(hours=18)
    newer_mature_items = [
        stac_item(newer_mature_run, lead) for lead in range(121)
    ]
    producer.time.time = lambda: expired_preferred_reference.timestamp()
    producer.request_json = lambda *_args, **_kwargs: {
        "features": [*newer_mature_items, *older_items],
    }
    expired_preferred_hours = set(
        producer.operational_current_valid_times(expired_preferred_reference)
    )
    expired_preferred_end = max(expired_preferred_hours, key=producer.epoch)
    bounded_selected_run, _, bounded_stats = producer.list_latest_assets(
        "dkss_idw",
        older_run.isoformat().replace("+00:00", "Z"),
        minimum_valid_time=expired_preferred_reference.isoformat().replace(
            "+00:00", "Z"
        ),
        required_valid_times=expired_preferred_hours,
        required_horizon_end_time=expired_preferred_end,
        allow_documented_required_gaps=True,
        retain_preferred_native_run=True,
    )
    assert bounded_selected_run == newer_mature_run.isoformat().replace(
        "+00:00", "Z"
    )
    assert bounded_stats["selectedRunFutureHorizonHours"] == 113.0
    assert bounded_stats["preferredProgressiveRunPinned"] is False
    assert bounded_stats["preferredProgressiveRunDiscardedAsStale"] is True
    assert bounded_stats["preferredNativeRunPinned"] is False
finally:
    producer.request_json = original_request_json
    producer.time.time = original_time

# The same target+113 native endpoint must pass the complete operational ledger
# and expose exactly four tail pairs—not a national Copernicus substitution.
tail_direct_hours = sorted(tail_hours, key=producer.epoch)[:-4]
tail_ledger_document = {
    "zones": {
        "PART::TEST": {
            "samplingPoint": [2.0, 1.0],
            "hourly": {},
        },
    },
    "runs": {},
}
tail_official_catalogs = {}
for collection in sorted(producer.MARINE_COLLECTIONS):
    processing_signature = f"tail-{collection}"
    official_assets = []
    processed_steps = {}
    for hour in tail_direct_hours:
        official_asset, source_asset = ledger_asset(collection, hour)
        official_assets.append(official_asset)
        processed_steps[hour] = {
            "complete": True,
            "recognizedParameters": ["current-u", "current-v"],
            "zonesTouched": 1,
            "parserVersion": producer.PARSER_VERSION,
            "processingSignature": processing_signature,
            "sourceAsset": source_asset,
            "currentPartOutcomeProof": producer.build_current_part_outcome_proof(
                [] if collection == "dkss_lf" else [target["partId"]],
                [target["partId"]],
                producer.target_fingerprint(targets),
                processing_signature,
                source_asset,
            ),
        }
        if collection == "dkss_lf":
            native_source = producer.native_component_source(
                collection,
                "2026-01-01T00:00:00Z",
                hour,
                component="current",
                zone=zone,
                grid_candidate=candidate,
                capture={
                    "itemId": source_asset["itemId"],
                    "assetIdentitySha256": source_asset["assetIdentitySha256"],
                    "assetSizeBytes": source_asset["assetSizeBytes"],
                    "acquiredAt": source_asset["acquiredAt"],
                    "contentLengthBytes": source_asset["contentLengthBytes"],
                    "contentSha256": source_asset["contentSha256"],
                    "itemCreatedAt": source_asset["itemCreatedAt"],
                    "itemUpdatedAt": source_asset["itemUpdatedAt"],
                },
                spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
                verticalLayer="depthBelowSea:1",
                verticalLayerRankM=1.0,
                vectorSelection=CURRENT_VECTOR_SELECTION,
                vectorSemanticsVersion=3,
            )
            assert native_source is not None
            tail_ledger_document["zones"]["PART::TEST"]["hourly"][hour] = {
                "time": hour,
                "current-u": 0.1,
                "current-v": -0.2,
                "sources": {"current": native_source},
            }
    tail_ledger_document["runs"][collection] = {
        "referenceTime": "2026-01-01T00:00:00Z",
        "parserVersion": producer.PARSER_VERSION,
        "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
        "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
        "processingSignature": processing_signature,
        "processedSteps": processed_steps,
    }
    tail_official_catalogs[collection] = (
        "2026-01-01T00:00:00Z",
        official_assets,
        {
            "catalogInventoryComplete": True,
            "requiredHorizonEndCovered": False,
            "documentedRequiredGapsAllowed": True,
            "selectedNativeRunComplete": True,
            "requiredWindowInventoryComplete": True,
            "requiredRowsTruncatedByAssetLimit": 0,
            "officialRequiredValidTimeCount": len(official_assets),
            "officialRequiredValidTimes": tail_direct_hours,
            "officialRequiredAssets": official_assets,
        },
    )
tail_ledger = producer.build_current_operational_ledger(
    tail_ledger_document,
    targets,
    tail_reference,
    tail_official_catalogs,
)
assert tail_ledger["ready"] is True
assert tail_ledger["failureCodes"] == []
assert tail_ledger["attestation"]["verifiedPairCount"] == 114
assert tail_ledger["upstreamAbsencePairCount"] == 4
assert tail_ledger["operationalComplementPairCount"] == 4
assert all(
    row["stateCounts"]["UPSTREAM_ABSENT"] == 4
    for row in tail_ledger["collections"]
)
tail_ledger_document.setdefault("diagnostics", {})[
    "currentOperationalLedger"
] = tail_ledger
assert producer.current_operational_cache_ready(
    tail_ledger_document,
    targets,
    tail_reference,
)

# Recomputed counts and hashes cannot make a v4 ledger valid after one
# collection's exact native +120 endpoint has been removed.
tampered_terminal_ledger = json.loads(json.dumps(tail_ledger))
tampered_collection = next(
    row for row in tampered_terminal_ledger["collections"]
    if row["collection"] == "dkss_idw"
)
native_terminal_time = (
    older_run + timedelta(hours=producer.DKSS_MAX_FORECAST_LEAD_HOURS)
).isoformat().replace("+00:00", "Z")
tampered_row = next(
    row for row in tampered_collection["validTimes"]
    if row["validTime"] == native_terminal_time
)
tampered_row.update({
    "state": "UPSTREAM_ABSENT",
    "officialAsset": None,
    "sourceAsset": None,
    "partOutcomeProof": None,
})
tampered_assets = [
    row["officialAsset"]
    for row in tampered_collection["validTimes"]
    if row["officialAsset"] is not None
]
tampered_times = sorted(asset["validTime"] for asset in tampered_assets)
tampered_collection["officialValidTimeCount"] = len(tampered_assets)
tampered_collection["officialValidTimesSha256"] = producer.valid_times_sha256(
    tampered_times
)
tampered_collection["officialAssetsSha256"] = (
    producer.current_official_assets_sha256(tampered_assets)
)
tampered_collection["stateCounts"] = {
    state: sum(
        row["state"] == state for row in tampered_collection["validTimes"]
    )
    for state in producer.CURRENT_OPERATIONAL_LEDGER_STATES
}
assert not producer.current_operational_ledger_ready(
    tampered_terminal_ledger,
    tail_ledger["attestation"],
    targets,
    tail_reference,
    tail_reference + timedelta(hours=117),
    producer.target_fingerprint(targets),
)

with tempfile.TemporaryDirectory() as temporary_directory:
    original_output = producer.OUTPUT_PATH
    original_fallback = producer.DEPLOYED_FALLBACK_PATH
    temporary_root = Path(temporary_directory)
    producer.OUTPUT_PATH = temporary_root / "live" / "dmi-bulk-cache.json"
    producer.DEPLOYED_FALLBACK_PATH = temporary_root / "deployed.json"
    fallback_document = {
        **document,
        "zoneRegistrySignature": "test-registry",
        "generatedAt": valid_time,
    }
    producer.DEPLOYED_FALLBACK_PATH.write_text(
        json.dumps(fallback_document),
        encoding="utf-8",
    )
    try:
        selected = producer.load_previous("test-registry")
        producer.atomic_write_bulk_cache(selected)
        assert json.loads(producer.OUTPUT_PATH.read_text("utf-8")) == fallback_document

        progressive_document = {
            "schemaVersion": 2,
            "zoneRegistrySignature": "test-registry",
            "generatedAt": "2026-01-01T05:00:00Z",
            "checkpointedAt": "2026-01-01T06:00:00Z",
            "sourceUpdatedAt": "2026-01-01T04:00:00Z",
            "collectionState": {
                "dkss_lf": {"lastAttemptAt": "2026-01-01T05:30:00Z"},
            },
            "runs": {
                "dkss_lf": {"referenceTime": "2026-01-01T00:00:00Z"},
            },
            "zones": {
                "PART::TEST": {
                    "hourly": {},
                    "gridPoints": {},
                    "collections": {},
                },
            },
        }
        producer.OUTPUT_PATH.write_text(
            json.dumps(progressive_document),
            encoding="utf-8",
        )
        selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        assert selected["generatedAt"] == progressive_document["generatedAt"]
        assert selected["checkpointedAt"] == progressive_document["checkpointedAt"]
        assert selected["collectionState"] == progressive_document["collectionState"]
        assert selected["runs"] == progressive_document["runs"]
        assert strict_verified_part_current_pair_count(
            selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 1
        producer.atomic_write_bulk_cache(selected)
        materialized = json.loads(producer.OUTPUT_PATH.read_text("utf-8"))
        assert strict_verified_part_current_pair_count(
            materialized,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 1

        partial_primary = json.loads(json.dumps(progressive_document))
        mismatched_source = json.loads(json.dumps(source))
        mismatched_source["modelRun"] = "2025-12-31T18:00:00Z"
        partial_primary["zones"]["PART::TEST"]["hourly"][valid_time] = {
            "time": valid_time,
            "current-u": 0.9,
            "sources": {"current": mismatched_source},
        }
        producer.OUTPUT_PATH.write_text(
            json.dumps(partial_primary),
            encoding="utf-8",
        )
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(fallback_document),
            encoding="utf-8",
        )
        atomic_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        atomic_row = atomic_selected["zones"]["PART::TEST"]["hourly"][valid_time]
        assert atomic_row["current-u"] == 0.9
        assert "current-v" not in atomic_row
        assert strict_verified_part_current_pair_count(
            atomic_selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0

        incompatible_fallback = {
            **fallback_document,
            "zoneRegistrySignature": "other-registry",
        }
        producer.DEPLOYED_FALLBACK_PATH.write_text(
            json.dumps(incompatible_fallback),
            encoding="utf-8",
        )
        producer.OUTPUT_PATH.write_text(
            json.dumps(progressive_document),
            encoding="utf-8",
        )
        incompatible_selected = producer.load_previous(
            "test-registry",
            coastal_part_targets=targets,
            production_reference=reference,
        )
        assert strict_verified_part_current_pair_count(
            incompatible_selected,
            targets,
            reference - timedelta(hours=48),
            reference + timedelta(hours=117),
        ) == 0
    finally:
        producer.OUTPUT_PATH = original_output
        producer.DEPLOYED_FALLBACK_PATH = original_fallback

for field, wrong in (
    ("entityId", "PART::OTHER"),
    ("parentZoneId", "ZONE-OTHER"),
    ("gridDefinitionSha256", "c" * 63),
    ("distanceKm", 1.0),
    ("modelRun", "2026-01-02T00:00:00Z"),
    ("nativeValidTime", "2026-01-01T06:00:00Z"),
    ("collection", "wam_dw"),
    ("vectorSelection", "nearest-shared-grid-cell-no-spatial-interpolation"),
    ("itemId", ""),
    ("acquiredAt", "invalid"),
):
    altered = {**source, field: wrong}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

for field in ("modelRun", "nativeValidTime", "acquiredAt"):
    altered = {**source, field: str(source[field]).removesuffix("Z")}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

assert producer.native_component_source(
    "wam_dw",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None
assert producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=None,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None

print("OK: DMI producer and import-safe native provenance verifier have exact parity.")
