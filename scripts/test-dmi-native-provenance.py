"""Producer/verifier parity for native DMI component provenance."""
from __future__ import annotations

import importlib.util
import json
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
    except producer.DmiGridLookupError:
        pass
    else:
        raise AssertionError("Unreadable grid identity must fail closed")
    producer.codes_get = original_codes_get

    producer.codes_grib_find_nearest = fail_nearest
    try:
        producer.nearest_candidates(991, "dkss_idw", zone)
    except producer.DmiGridLookupError:
        pass
    else:
        raise AssertionError("Nearest-grid exception must fail closed")
    assert producer.GRID_INDEX_CACHE == {}

    producer.nearest_candidates = lambda *_args, **_kwargs: [{
        "index": 7,
        "latitude": 1.0,
        "longitude": 2.0,
        "distanceKm": 0.0,
    }]
    producer.codes_get_elements = fail_nearest
    try:
        producer.valid_candidates_batch(992, "dkss_idw", [zone])
    except producer.DmiGridLookupError:
        pass
    else:
        raise AssertionError("Batched grid exception must fail closed")
finally:
    producer.codes_grib_find_nearest = original_find_nearest
    producer.codes_get = original_codes_get
    producer.codes_get_elements = original_get_elements
    producer.nearest_candidates = original_nearest_candidates
    producer.GRID_INDEX_CACHE.clear()

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
finally:
    producer.request_json = original_request_json
    producer.time.time = original_time

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
