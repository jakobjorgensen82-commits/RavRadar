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
    "acquiredAt": "2026-01-01T02:00:00Z",
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
assert producer.coastal_part_current_cache_reusable(document, targets, reference)

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
) == "DMI_STRICT_CURRENT_ANCHOR_MISSING"
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
) == "DMI_NO_PRODUCTIVE_COLLECTION"
assert producer.producer_terminal_code(
    strict_current_anchor_available=True,
    wave_bootstrap_requested=False,
    bootstrap_complete=False,
    productive=True,
    diagnostics={},
) == "DMI_READY"

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
