#!/usr/bin/env python3
"""Focused durability and tamper tests for Copernicus segment receipts."""
from __future__ import annotations

import copy
import json
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from lib.copernicus_current import canonical_sha256, make_acquisition, make_record
from lib.copernicus_current_segment_journal import (
    append_segment_journal,
    load_segment_journal,
    remove_segment_journal,
)
from lib.copernicus_current_source_stage import (
    PINNED_PRODUCTS,
    make_source_attempt,
    spatial_shards,
)


REFERENCE = datetime(2026, 9, 12, 1, tzinfo=timezone.utc)
ACQUIRED_AT = datetime(2026, 9, 12, 1, 5, tzinfo=timezone.utc)
TARGET = {
    "partId": "fixture-segment-journal-part",
    "parentZoneId": "fixture-zone",
    "name": "Fixture",
    "waterPoint": [10.2, 56.2],
}
PRODUCT = PINNED_PRODUCTS[0]
PAIR = {
    "partId": TARGET["partId"],
    "validTime": REFERENCE.isoformat().replace("+00:00", "Z"),
}
BASE_BANK_SHA256 = canonical_sha256({"fixture": "base-bank"})


def fixture(*, positive: bool) -> tuple[dict, list[dict], dict]:
    acquisition = make_acquisition(
        source=PRODUCT["source"],
        acquisition_at=ACQUIRED_AT,
        request_start_at=REFERENCE,
        request_end_at=REFERENCE,
        targets=[TARGET],
        native_valid_times=[REFERENCE],
        subset_sha256=canonical_sha256({"fixture": "positive" if positive else "zero"}),
        record_count=1 if positive else 0,
    )
    records = []
    if positive:
        records = [make_record({
            "partId": TARGET["partId"],
            "parentZoneId": TARGET["parentZoneId"],
            "validTime": REFERENCE,
            "samplingPoint": TARGET["waterPoint"],
            "gridPoint": TARGET["waterPoint"],
            "distanceKm": 0.0,
            "verticalLayerM": 5.0,
            "layerQuality": "full-water-column",
            "sharedLayerCount": 2,
            "uMps": 0.1,
            "vMps": 0.2,
        }, acquisition, TARGET)]
    attempt = make_source_attempt(
        production_reference_at=REFERENCE,
        acquisition_at=ACQUIRED_AT,
        product=PRODUCT,
        shard_id=spatial_shards([TARGET], PRODUCT)[0]["shardId"],
        target_part_ids=[TARGET["partId"]],
        requested_pairs=[PAIR],
        subset_sha256=acquisition["subsetSha256"],
        acquisition_id=acquisition["acquisitionId"],
        parsed_record_count=len(records),
        observed_native_valid_times=acquisition["nativeValidTimes"],
    )
    return acquisition, records, attempt


with tempfile.TemporaryDirectory(prefix="ravradar-cp-segment-journal-") as raw:
    path = Path(raw) / "journal.json"
    journal = None
    for positive in (True, False):
        acquisition, records, attempt = fixture(positive=positive)
        if not positive:
            # Same acquisition clock with a distinct source payload remains a
            # distinct immutable attempt and sorts deterministically by ID.
            attempt = {**attempt}
        journal = append_segment_journal(
            path,
            journal,
            base_bank_sha256=BASE_BANK_SHA256,
            production_reference_at=REFERENCE,
            targets=[TARGET],
            acquisition=acquisition,
            records=records,
            attempt=attempt,
        )
    loaded = load_segment_journal(
        path,
        targets=[TARGET],
        expected_base_bank_sha256=BASE_BANK_SHA256,
    )
    assert loaded == journal
    assert len(loaded["entries"]) == 2

    try:
        load_segment_journal(
            path,
            targets=[TARGET],
            expected_base_bank_sha256=canonical_sha256({"fixture": "other"}),
        )
    except ValueError as error:
        assert "BASE_INVALID" in str(error)
    else:
        raise AssertionError("A journal from another donor base must fail closed")

    tampered = copy.deepcopy(loaded)
    tampered["entries"][0]["records"][0]["uMps"] = 9.9
    path.write_text(json.dumps(tampered), encoding="utf-8")
    try:
        load_segment_journal(
            path,
            targets=[TARGET],
            expected_base_bank_sha256=BASE_BANK_SHA256,
        )
    except ValueError:
        pass
    else:
        raise AssertionError("A changed receipt payload must fail closed")

    # Restore one valid receipt and remove it only after the caller's full
    # transaction has succeeded.
    acquisition, records, attempt = fixture(positive=True)
    append_segment_journal(
        path,
        None,
        base_bank_sha256=BASE_BANK_SHA256,
        production_reference_at=REFERENCE,
        targets=[TARGET],
        acquisition=acquisition,
        records=records,
        attempt=attempt,
    )
    remove_segment_journal(path)
    assert not path.exists()

print("Copernicus durable segment journal validation and tamper tests passed.")
