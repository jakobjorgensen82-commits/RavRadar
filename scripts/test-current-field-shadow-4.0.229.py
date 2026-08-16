#!/usr/bin/env python3
"""Regression contract for private seven-day current-field research sampling."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import pathlib
import tempfile

from lib.current_field_shadow import (
    RETENTION_HOURS,
    build_rotating_targets,
    eligible_replay_assets,
    empty_document,
    load_document,
    prune,
    record_profiles,
    representative_profile,
    save_document,
    status,
)


ROOT = pathlib.Path(__file__).resolve().parents[1]


def choice(lon: float, lat: float, distance: float, layer: str, rank: float, u: float, v: float) -> dict:
    return {
        "first": {"longitude": lon, "latitude": lat, "distanceKm": distance, "value": u},
        "second": {"longitude": lon, "latitude": lat, "distanceKm": distance, "value": v},
        "pointKey": (lat, lon),
        "distanceKm": distance,
        "layerKey": layer,
        "layerRank": rank,
    }


parts = {
    "zones": {
        "DK-TEST": [
            {"partId": "part-a", "landPoint": [10.0, 55.0], "waterPoint": [10.01, 55.0]},
            {"partId": "part-b", "landPoint": [11.0, 56.0], "waterPoint": [11.01, 56.0]},
        ]
    }
}
targets, cursor, selected = build_rotating_targets(parts, {"DK-TEST": "east"}, parts_per_run=1)
assert cursor == 1 and selected == ["part-a"]
assert len(targets) == 3 and {row["bandKm"] for row in targets} == {0.0, 5.0, 15.0}
assert all(row["researchCurrent"] is True for row in targets)
assert targets[0]["targetPoint"] == [10.01, 55.0]
assert targets[-1]["targetPoint"] != targets[-1]["sourceWaterPoint"]

national_parts = {
    "zones": {
        "DK-ROTATION": [
            {
                "partId": f"part-{index:03d}",
                "landPoint": [10.0, 55.0],
                "waterPoint": [10.01, 55.0],
            }
            for index in range(673)
        ]
    }
}
rotation_cursor = 0
visited: set[str] = set()
for _run in range(45):
    _targets, rotation_cursor, rotation_ids = build_rotating_targets(
        national_parts,
        {"DK-ROTATION": "east"},
        cursor=rotation_cursor,
        parts_per_run=15,
    )
    visited.update(rotation_ids)
assert len(visited) == 673 and rotation_cursor == 2

captured = datetime(2026, 8, 16, 3, 0, tzinfo=timezone.utc)
captured_iso = captured.isoformat().replace("+00:00", "Z")
replay_assets = eligible_replay_assets([
    {"valid": (captured - timedelta(hours=2)).isoformat().replace("+00:00", "Z"), "href": "too-old"},
    {"valid": (captured + timedelta(hours=6)).isoformat().replace("+00:00", "Z"), "href": "middle"},
    {"valid": (captured + timedelta(hours=1)).isoformat().replace("+00:00", "Z"), "href": "first"},
    {"valid": (captured + timedelta(hours=13)).isoformat().replace("+00:00", "Z"), "href": "too-new"},
], captured_iso, max_assets=2)
assert [asset["href"] for asset in replay_assets] == ["first", "middle"]

profile = representative_profile([
    choice(10.1, 55.1, 4.0, "depthbelowsea:100", 100, 9, 9),
    choice(10.01, 55.01, 1.0, "surface:0", 0, 1, 2),
    choice(10.01, 55.01, 1.0, "depthbelowsea:10", 10, 3, 4),
    choice(10.01, 55.01, 1.0, "depthbelowsea:20", 20, 5, 6),
])
assert profile is not None
assert profile["gridPoint"] == [10.01, 55.01]
assert profile["layers"]["surface"]["verticalLayer"] == "surface:0"
assert profile["layers"]["middle"]["verticalLayer"] == "depthbelowsea:10"
assert profile["layers"]["bottom"]["verticalLayer"] == "depthbelowsea:20"
assert representative_profile([choice(10, 55, 5.01, "surface:0", 0, 1, 1)]) is None

now = datetime.now(timezone.utc).replace(microsecond=0)
now_iso = now.isoformat().replace("+00:00", "Z")
valid_iso = (now + timedelta(hours=3)).isoformat().replace("+00:00", "Z")
target = targets[0]
document = empty_document()
written = record_profiles(
    document,
    {target["id"]: target},
    {target["id"]: [choice(10.01, 55.0, 1.0, "surface:0", 0, 1, 2)]},
    "dkss_test",
    now_iso,
    valid_iso,
    now_iso,
)
assert written == 1
assert record_profiles(document, {target["id"]: target}, {target["id"]: []}, "dkss_test", now_iso, valid_iso, now_iso) == 0
far_document = empty_document()
assert record_profiles(
    far_document,
    {target["id"]: target},
    {target["id"]: [choice(10.2, 55.0, 1.0, "surface:0", 0, 1, 2)]},
    "dkss_test",
    now_iso,
    valid_iso,
    now_iso,
) == 0
summary = status(document, selected, {
    "rotationAdvancedThisRun": True,
    "samplesWrittenThisRun": 1,
    "cachedReplayAssetsThisRun": 1,
})
assert summary["scoreImpact"] is False and summary["publicRuntime"] is False
assert summary["samples"] == 1 and summary["retentionHours"] == 168
assert summary["rotationAdvancedThisRun"] is True
assert summary["samplesWrittenThisRun"] == 1
assert summary["cachedReplayAssetsThisRun"] == 1

with tempfile.TemporaryDirectory() as directory:
    path = pathlib.Path(directory) / "shadow.json"
    save_document(path, document)
    restored = load_document(path)
    assert status(restored)["samples"] == 1

old_iso = (now - timedelta(hours=RETENTION_HOURS + 1)).isoformat().replace("+00:00", "Z")
document["anchors"][target["id"]]["samples"][0]["capturedAt"] = old_iso
removed = prune(document, now_iso)
assert removed == {"removedSamples": 1, "removedAnchors": 1}

bulk_source = (ROOT / "scripts" / "update-dmi-bulk.py").read_text("utf-8")
workflow = (ROOT / ".github" / "workflows" / "update-and-deploy.yml").read_text("utf-8")
assert 'not zone.get("researchCurrent")' in bulk_source
assert 'parameter in {"current-u", "current-v"}' in bulk_source
assert "record_current_field_profiles" in bulk_source
assert "replay_current_field_shadow_from_cache" in bulk_source
assert "no-eligible-cached-current-assets" in bulk_source
assert '"fresh-marine-asset-covered-selection"' in bulk_source
assert "current-field-shadow.json" in workflow
assert "Save private seven-day current-field research cache" in workflow

print("Current-field shadow regression: OK")
