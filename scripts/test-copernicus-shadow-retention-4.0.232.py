#!/usr/bin/env python3
"""Regression contract for schema-2 private Copernicus range evidence."""
from __future__ import annotations

import copy
import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import (
    CACHE_KIND,
    CACHE_SCHEMA_VERSION,
    COPERNICUS_SOURCE_CONTRACTS,
    LEGACY_HISTORY_REQUEST_CONTRACT_ID,
    atomic_write_shadow,
    canonical_sha256,
    empty_shadow,
    load_shadow,
    make_acquisition,
    make_coverage_collection,
    make_record,
    merge_cache_evidence,
    safe_shadow_summary,
    select_required_records,
    validate_shadow,
)
from lib.copernicus_target_identity import target_fingerprint


REFERENCE = datetime(2026, 8, 29, 8, tzinfo=timezone.utc)
TARGET = {"partId": "part-1", "parentZoneId": "zone-1", "name": "one", "waterPoint": [9.0, 57.0]}
TARGETS = {TARGET["partId"]: TARGET}
SOURCE = "copernicus-baltic-nemo"


def raw_record(valid_time: datetime, *, u_mps: float = 0.1) -> dict:
    product, dataset, version = COPERNICUS_SOURCE_CONTRACTS[SOURCE]
    return {
        "partId": TARGET["partId"], "parentZoneId": TARGET["parentZoneId"], "name": TARGET["name"],
        "samplingPoint": TARGET["waterPoint"], "source": SOURCE,
        "productId": product, "datasetId": dataset, "datasetVersion": version,
        "validTime": valid_time.isoformat().replace("+00:00", "Z"),
        "gridPoint": TARGET["waterPoint"], "distanceKm": 0.0,
        "verticalLayerM": 5.0, "layerQuality": "deepest-common-layer", "sharedLayerCount": 2,
        "uMps": u_mps, "vMps": 0.2, "componentPair": "same-time-cell-layer", "interpolation": False,
    }


def evidence(valid_time: datetime, acquisition_at: datetime, token: str) -> tuple[dict, dict]:
    raw = raw_record(valid_time)
    acquisition = make_acquisition(
        source=SOURCE,
        acquisition_at=acquisition_at,
        request_start_at=valid_time,
        request_end_at=valid_time,
        targets=[TARGET],
        native_valid_times=[valid_time],
        subset_sha256=canonical_sha256({"rawSubsetFixture": token}),
        record_count=1,
    )
    return acquisition, make_record(raw, acquisition, TARGET)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-range-cache-") as raw_folder:
    folder = Path(raw_folder)
    path = folder / "cache.json"
    historical_time = REFERENCE - timedelta(hours=48)
    future_time = REFERENCE + timedelta(hours=117)
    historical_acquisition, historical_record = evidence(
        historical_time, REFERENCE - timedelta(hours=100), "history",
    )
    future_acquisition, future_record = evidence(
        future_time, REFERENCE + timedelta(minutes=20), "future",
    )
    required = [
        {"partId": TARGET["partId"], "validTime": historical_record["validTime"]},
        {"partId": TARGET["partId"], "validTime": future_record["validTime"]},
    ]
    acquisitions, records = merge_cache_evidence(
        empty_shadow(REFERENCE),
        [historical_acquisition, future_acquisition],
        [historical_record, future_record],
        REFERENCE,
        TARGETS,
    )
    refs, missing = select_required_records(required, acquisitions, records, REFERENCE)
    assert not missing and len(refs) == 2
    collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=target_fingerprint([TARGET]),
        dmi_current_input_sha256=canonical_sha256({"dmi": "fixture"}),
        required_pairs=required,
        record_refs=refs,
        sealed_at=REFERENCE + timedelta(minutes=20),
    )
    cache = atomic_write_shadow(
        path,
        acquisitions=acquisitions,
        records=records,
        collection=collection,
        updated_at=REFERENCE + timedelta(minutes=20),
        target_identities=TARGETS,
    )
    assert cache["schemaVersion"] == CACHE_SCHEMA_VERSION and cache["kind"] == CACHE_KIND
    assert cache["rawVectorsIncluded"] is True and cache["scoreImpact"] is False and cache["publicRuntime"] is False
    assert cache["collections"][0]["status"] == "COMPLETE"
    assert cache["collections"][0]["rangeStartAt"] == historical_record["validTime"]
    assert cache["collections"][0]["rangeEndAt"] == future_record["validTime"]
    assert validate_shadow(json.loads(path.read_text(encoding="utf-8")), TARGETS, require_collection=True)

    summary = safe_shadow_summary(cache)
    serialized_summary = json.dumps(summary).lower()
    assert "umps" not in serialized_summary and "vmps" not in serialized_summary
    assert "samplingpoint" not in serialized_summary and "gridpoint" not in serialized_summary
    assert summary["completeCoverageCollectionCount"] == 1

    # Current/future evidence is fresh versus productionReferenceAt, not versus
    # its future valid time. An old acquisition cannot authorize +117.
    stale_future_acquisition, stale_future_record = evidence(
        future_time, REFERENCE - timedelta(hours=5), "stale-future",
    )
    stale_acquisitions, stale_records = merge_cache_evidence(
        empty_shadow(REFERENCE),
        [historical_acquisition, stale_future_acquisition],
        [historical_record, stale_future_record],
        REFERENCE,
        TARGETS,
    )
    _, stale_missing = select_required_records(required, stale_acquisitions, stale_records, REFERENCE)
    assert stale_missing == [{"partId": TARGET["partId"], "validTime": future_record["validTime"]}]

    legacy_future_acquisition = make_acquisition(
        source=SOURCE,
        acquisition_at=REFERENCE + timedelta(minutes=20),
        request_start_at=future_time,
        request_end_at=future_time,
        targets=[TARGET],
        native_valid_times=[future_time],
        subset_sha256=canonical_sha256({"rawSubsetFixture": "legacy-future"}),
        record_count=1,
        request_contract_id=LEGACY_HISTORY_REQUEST_CONTRACT_ID,
    )
    legacy_future_record = make_record(raw_record(future_time), legacy_future_acquisition, TARGET)
    legacy_refs, legacy_missing = select_required_records(
        [{"partId": TARGET["partId"], "validTime": legacy_future_record["validTime"]}],
        [legacy_future_acquisition],
        [legacy_future_record],
        REFERENCE,
    )
    assert not legacy_missing
    legacy_collection = make_coverage_collection(
        production_reference_at=REFERENCE,
        target_registry_sha256=target_fingerprint([TARGET]),
        dmi_current_input_sha256=canonical_sha256({"dmi": "legacy-future-fixture"}),
        required_pairs=[{"partId": TARGET["partId"], "validTime": legacy_future_record["validTime"]}],
        record_refs=legacy_refs,
        sealed_at=REFERENCE + timedelta(minutes=20),
    )
    legacy_future_cache = empty_shadow(REFERENCE)
    legacy_future_cache.update({
        "acquisitions": [legacy_future_acquisition],
        "records": [legacy_future_record],
        "collections": [legacy_collection],
    })
    try:
        validate_shadow(legacy_future_cache, TARGETS, require_collection=True)
        raise AssertionError("Legacy migration evidence must never authorize a current/future range record")
    except ValueError as error:
        assert "multi-time request contract" in str(error)

    # Retention uses the locked reference rather than the machine clock.
    older_time = REFERENCE - timedelta(hours=160)
    older_acquisition, older_record = evidence(older_time, REFERENCE - timedelta(hours=200), "older")
    retained_acquisitions, retained_records = merge_cache_evidence(
        cache, [older_acquisition], [older_record], REFERENCE, TARGETS,
    )
    assert older_record["recordId"] in {row["recordId"] for row in retained_records}
    too_old_time = REFERENCE - timedelta(hours=169)
    too_old_acquisition, too_old_record = evidence(too_old_time, REFERENCE - timedelta(hours=200), "too-old")
    _, pruned_records = merge_cache_evidence(
        cache, [too_old_acquisition], [too_old_record], REFERENCE, TARGETS,
    )
    assert too_old_record["recordId"] not in {row["recordId"] for row in pruned_records}

    # A bounded multi-time subset keeps its immutable source recordCount even
    # when retention removes just its oldest member.  The remaining member is
    # still joined to the original raw-subset digest and acquisition identity.
    multi_acquisition = make_acquisition(
        source=SOURCE,
        acquisition_at=REFERENCE - timedelta(hours=200),
        request_start_at=too_old_time,
        request_end_at=older_time,
        targets=[TARGET],
        native_valid_times=[too_old_time, older_time],
        subset_sha256=canonical_sha256({"rawSubsetFixture": "multi-time-retention"}),
        record_count=2,
    )
    multi_records = [
        make_record(raw_record(too_old_time), multi_acquisition, TARGET),
        make_record(raw_record(older_time), multi_acquisition, TARGET),
    ]
    partial_acquisitions, partial_records = merge_cache_evidence(
        empty_shadow(REFERENCE), [multi_acquisition], multi_records, REFERENCE, TARGETS,
    )
    assert len(partial_acquisitions) == 1 and partial_acquisitions[0]["recordCount"] == 2
    assert len(partial_records) == 1 and partial_records[0]["validTime"] == older_record["validTime"]

    # Every identity and exact keyset is enforced.
    for mutate in (
        lambda value: value["collections"][0].update(status="INCOMPLETE"),
        lambda value: value["collections"][0]["recordRefs"].append(copy.deepcopy(value["collections"][0]["recordRefs"][0])),
        lambda value: value["acquisitions"][0].update(subsetSha256="sha256:" + "0" * 64),
        lambda value: value["records"][0].update(interpolation=True),
        lambda value: value["records"][0].update(gridPoint=[True, 57.0]),
        lambda value: value.update(unexpected=True),
    ):
        damaged = copy.deepcopy(cache)
        mutate(damaged)
        try:
            validate_shadow(damaged, TARGETS, require_collection=True)
        except ValueError:
            pass
        else:
            raise AssertionError("Damaged Copernicus schema-2 evidence must fail closed")

    # Validation happens before replace: an invalid attempted write must leave
    # the previously sealed cache byte-for-byte intact.
    original_bytes = path.read_bytes()
    damaged_collection = {**collection, "status": "INCOMPLETE"}
    try:
        atomic_write_shadow(
            path,
            acquisitions=acquisitions,
            records=records,
            collection=damaged_collection,
            updated_at=REFERENCE,
            target_identities=TARGETS,
        )
    except ValueError:
        pass
    else:
        raise AssertionError("Atomic writer must reject an incomplete collection")
    assert path.read_bytes() == original_bytes
    assert not path.with_name(path.name + ".tmp").exists()

    # Schema 1 can contribute only genuinely captured historical evidence; its
    # current/reference row can never be promoted into a COMPLETE range seal.
    legacy_path = folder / "legacy.json"
    legacy_history = raw_record(REFERENCE - timedelta(hours=1))
    legacy_current = raw_record(REFERENCE)
    legacy_path.write_text(json.dumps({
        "schemaVersion": 1, "retentionHours": 168,
        "scoreImpact": False, "publicRuntime": False,
        "updatedAt": (REFERENCE + timedelta(minutes=5)).isoformat().replace("+00:00", "Z"),
        "collections": [], "records": [legacy_history, legacy_current],
    }), encoding="utf-8")
    migrated = load_shadow(legacy_path, REFERENCE, TARGETS)
    assert len(migrated["records"]) == 1 and migrated["records"][0]["validTime"] == legacy_history["validTime"]
    assert migrated["collections"] == []

print("OK: schema-2 Copernicus cache is reference-bound, atomic, exact and safely reusable for history.")
