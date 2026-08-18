#!/usr/bin/env python3
"""Regression contract for the private seven-day Copernicus raw cache."""
from __future__ import annotations

import json
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import RETENTION_HOURS, safe_shadow_summary, update_shadow


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def record(valid_time: datetime, *, u_mps: float = 0.1) -> dict:
    return {
        "partId": "part-1",
        "parentZoneId": "zone-1",
        "name": "Retention test",
        "samplingPoint": [9.0, 57.0],
        "source": "copernicus-baltic-nemo",
        "productId": "product",
        "datasetId": "dataset",
        "datasetVersion": "version",
        "validTime": valid_time.isoformat().replace("+00:00", "Z"),
        "gridPoint": [9.02, 57.0],
        "distanceKm": 1.25,
        "verticalLayerM": 3.0,
        "layerQuality": "deepest-common-layer",
        "sharedLayerCount": 2,
        "uMps": u_mps,
        "vMps": 0.2,
        "componentPair": "same-time-cell-layer",
        "interpolation": False,
    }


def main() -> None:
    need(RETENTION_HOURS == 168, "The private retention contract must remain exactly seven days")
    now = datetime(2026, 8, 18, 12, tzinfo=timezone.utc)
    boundary = record(now - timedelta(hours=RETENTION_HOURS))
    expired = record(now - timedelta(hours=RETENTION_HOURS, seconds=1))
    malformed = {**record(now - timedelta(hours=3)), "validTime": "not-a-time"}
    naive = {**record(now - timedelta(hours=2)), "validTime": "2026-08-18T10:00:00"}
    future = record(now + timedelta(hours=1))
    fresh = record(now - timedelta(hours=1), u_mps=0.3)
    replacement = record(now - timedelta(hours=1), u_mps=0.4)

    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "copernicus-current-shadow.json"
        path.write_text(json.dumps({
            "schemaVersion": 1,
            "retentionHours": 999,
            "scoreImpact": True,
            "publicRuntime": True,
            "records": [boundary, expired, malformed, naive, future, fresh],
        }), encoding="utf-8")

        shadow = update_shadow(path, [replacement], now)
        records = shadow["records"]
        times = {row["validTime"] for row in records}
        need(len(records) == 2, "Only the inclusive boundary and deduplicated fresh record may remain")
        need(boundary["validTime"] in times, "A record exactly 168 hours old must remain in the window")
        need(expired["validTime"] not in times, "A record older than 168 hours must be pruned")
        need(future["validTime"] not in times, "A restored future record must not poison retention")
        need(next(row for row in records if row["validTime"] == replacement["validTime"])["uMps"] == 0.4,
             "The newest exact duplicate must replace the restored record")
        need(shadow["retentionHours"] == 168, "Unsafe restored metadata must be overwritten")
        need(shadow["scoreImpact"] is False and shadow["publicRuntime"] is False,
             "The raw cache must stay private and score-neutral")

        evidence = safe_shadow_summary(shadow)
        need(evidence["validTimeCount"] == 2 and evidence["gridUnstableTargetSourceCount"] == 0,
             "Safe evidence must summarize retained stability without raw vectors")
        serialized_evidence = json.dumps(evidence)
        need("uMps" not in serialized_evidence and "vMps" not in serialized_evidence,
             "Safe retention evidence must not expose raw vectors")

        invalid_new = {**record(now), "distanceKm": 5.01}
        try:
            update_shadow(path, [invalid_new], now)
        except RuntimeError as error:
            need("failed validation" in str(error), "New invalid evidence must fail closed with a concise reason")
        else:
            raise AssertionError("A new record outside the five-kilometre contract must fail closed")

        try:
            update_shadow(path, [record(now + timedelta(hours=1))], now)
        except RuntimeError as error:
            need("outside the 168-hour retention window" in str(error),
                 "A new future record must fail closed as outside retention")
        else:
            raise AssertionError("A new future record must not be silently accepted")

        geometry_path = Path(directory) / "copernicus-geometry-shadow.json"
        first_time = now - timedelta(hours=2)
        first_fingerprint = "sha256:" + "1" * 64
        first = update_shadow(
            geometry_path,
            [record(first_time)],
            now,
            collection_time=first_time,
            target_fingerprint=first_fingerprint,
            target_points={"part-1": [9.0, 57.0]},
        )
        need(first["collections"][0]["targetFingerprint"] == first_fingerprint,
             "A completed collection must retain its target-geometry fingerprint")
        moved_time = now - timedelta(hours=1)
        moved_fingerprint = "sha256:" + "2" * 64
        moved_record = {**record(moved_time), "samplingPoint": [9.1, 57.0]}
        moved = update_shadow(
            geometry_path,
            [moved_record],
            now,
            collection_time=moved_time,
            target_fingerprint=moved_fingerprint,
            target_points={"part-1": [9.1, 57.0]},
        )
        need(len(moved["records"]) == 1 and moved["records"][0]["samplingPoint"] == [9.1, 57.0],
             "Moving a central point must prune that part's older retained geometry")
        need(len(moved["collections"]) == 1 and moved["collections"][0]["recordCount"] == 1,
             "A stale manifest must be removed and the new hour must match its retained records")

    print("OK: Copernicus shadow retention is bounded, deduplicated and fail-closed")


if __name__ == "__main__":
    main()
