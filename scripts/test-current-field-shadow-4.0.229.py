#!/usr/bin/env python3
"""Regression contract for private seven-day current-field research sampling."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import importlib.util
import json
import pathlib
import sys
import tempfile
import types

from lib.current_field_shadow import (
    RETENTION_HOURS,
    build_rotating_targets,
    eligible_replay_assets,
    empty_document,
    load_document,
    nearest_shared_uv_evidence,
    owner_coverage_audit,
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
spread_assets = eligible_replay_assets([
    {"valid": (captured + timedelta(hours=offset)).isoformat().replace("+00:00", "Z"), "href": str(offset)}
    for offset in range(13)
], captured_iso, max_assets=5)
assert [asset["href"] for asset in spread_assets] == ["0", "3", "6", "9", "12"]

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
far_evidence = nearest_shared_uv_evidence(
    [
        choice(10.2, 55.0, 0.1, "depthbelowsea:20", 20, 1, 2),
        choice(10.1, 55.0, 10.0, "depthbelowsea:20", 20, 1, 2),
    ],
    [10.01, 55.0],
)
assert far_evidence is not None and far_evidence["distanceKm"] > 5.0
assert far_evidence["gridPoint"] == [10.1, 55.0]
assert far_evidence["withinAccepted5Km"] is False
assert "uMps" not in far_evidence and "vMps" not in far_evidence

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
far_audit = far_document["coverageAudits"][target["id"]]
assert far_audit["observations"]["dkss_test"]["nearestSharedUv"]["distanceKm"] > 5.0
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

owner_audit = owner_coverage_audit(
    far_document,
    parts,
    {
        "zones": {
            "DK-TEST": {"samplingPoint": [10.01, 55.0], "hourly": {}, "gridPoints": {}},
            "PART::part-a": {"samplingPoint": [10.01, 55.0], "hourly": {}, "gridPoints": {}},
            "PART::part-b": {
                "samplingPoint": [11.01, 56.0],
                "hourly": {valid_iso: {"current-u": 0.1, "current-v": 0.2}},
                "gridPoints": {
                    "current-u": {
                        "longitude": 11.02,
                        "latitude": 56.0,
                        "distanceKm": 0.62,
                        "verticalLayer": "depthbelowsea:20",
                    },
                    "current-v": {
                        "longitude": 11.02,
                        "latitude": 56.0,
                        "distanceKm": 0.62,
                        "verticalLayer": "depthbelowsea:20",
                    },
                },
            },
        }
    },
    {
        "features": [{
            "type": "Feature",
            "properties": {"id": "DK-TEST", "name": "Testzone"},
            "geometry": {"type": "Point", "coordinates": [10.01, 55.0]},
        }]
    },
    now_iso,
)
assert owner_audit["scoreImpact"] is False and owner_audit["publicRuntime"] is False
assert owner_audit["automaticPointMovement"] is False
assert owner_audit["summary"]["runtimeMissingCoastalParts"] == 1
assert owner_audit["missingCoastalParts"][0]["classification"] == "structural-model-gap-over-8km"
assert owner_audit["missingMainZones"][0]["classification"] == "main-point-review-supported-by-local-current"
serialized_owner_audit = json.dumps(owner_audit)
assert '"uMps"' not in serialized_owner_audit and '"vMps"' not in serialized_owner_audit

with tempfile.TemporaryDirectory() as directory:
    path = pathlib.Path(directory) / "shadow.json"
    save_document(path, document)
    restored = load_document(path)
    assert status(restored)["samples"] == 1

old_iso = (now - timedelta(hours=RETENTION_HOURS + 1)).isoformat().replace("+00:00", "Z")
document["anchors"][target["id"]]["samples"][0]["capturedAt"] = old_iso
document["coverageAudits"][target["id"]]["observations"]["dkss_test"]["capturedAt"] = old_iso
removed = prune(document, now_iso)
assert removed == {"removedSamples": 1, "removedAnchors": 1}
assert target["id"] not in document["coverageAudits"]

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
assert "CURRENT_FIELD_SHADOW_REPLAY_ASSETS_PER_COLLECTION: 5" in workflow
assert "CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN: 3" in workflow
main_source = bulk_source.split("def main()", 1)[1]
assert main_source.index("for collection in scheduled") < main_source.rindex("replay_current_field_shadow_from_cache(")
assert "currentFieldShadowPrefetchErrors" in main_source
assert "current-coverage-owner-audit.json" in bulk_source
assert "write_current_coverage_owner_audit" in bulk_source

# The raw cache key must ignore volatile signed query parameters, retain one
# current marine replay file ahead of unrelated LRU entries, and permit one
# bounded private-only bootstrap when an older cache has no stable-key file.
if "eccodes" not in sys.modules:
    fake_eccodes = types.ModuleType("eccodes")
    for function_name in (
        "codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
        "codes_grib_new_from_file", "codes_release",
    ):
        setattr(fake_eccodes, function_name, lambda *args, **kwargs: None)
    sys.modules["eccodes"] = fake_eccodes
spec = importlib.util.spec_from_file_location("ravradar_bulk_cache_test", ROOT / "scripts" / "update-dmi-bulk.py")
assert spec and spec.loader
bulk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bulk)

with tempfile.TemporaryDirectory() as directory:
    original_raw_dir = bulk.RAW_DIR
    bulk.RAW_DIR = pathlib.Path(directory)
    try:
        first_path = bulk.cached_asset_path("https://example.test/current.grib?sig=first")
        second_path = bulk.cached_asset_path("https://example.test/current.grib?sig=second")
        assert first_path == second_path
        first_path.write_bytes(b"12345678")
        valid = (now + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        bulk.register_raw_cache_asset(first_path, "https://example.test/current.grib?sig=first", "dkss_idw", now_iso, valid)
        disposable = bulk.RAW_DIR / "disposable.grib"
        disposable.write_bytes(b"abcdefgh")
        removed = bulk.prune_raw_cache(max_bytes=10)
        assert removed["removedFiles"] == 1
        assert first_path.exists() and not disposable.exists()
        assert first_path.name in bulk.reserved_current_replay_files(bulk.load_raw_cache_manifest())
    finally:
        bulk.RAW_DIR = original_raw_dir

original_download = bulk.download_asset
original_process = bulk.process_grib
original_limit = bulk.CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN
with tempfile.TemporaryDirectory() as directory:
    original_raw_dir = bulk.RAW_DIR
    bulk.RAW_DIR = pathlib.Path(directory)
    private_path = bulk.RAW_DIR / "bootstrap.grib"

    def fake_download(href, expected_size, budget, **metadata):
        private_path.write_bytes(b"private")
        budget["bytes"] += 7
        assert metadata["collection"] == "dkss_idw"
        return private_path, False

    def fake_process(path, collection, model_run, valid_time, zones, output, diagnostics, shadow):
        assert path == private_path and collection == "dkss_idw"
        assert zones and all(zone.get("researchCurrent") for zone in zones)
        assert output == {"generatedAt": captured_iso, "zones": {}}
        diagnostics["currentFieldShadowSamplesWritten"] = 1
        return {"current-u", "current-v"}, set(), False, 2, len(zones)

    try:
        bulk.download_asset = fake_download
        bulk.process_grib = fake_process
        bulk.CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN = 1
        replay = bulk.replay_current_field_shadow_from_cache(
            {"dkss_idw": {"modelRun": captured_iso, "assets": [
                {"valid": (captured + timedelta(hours=1)).isoformat().replace("+00:00", "Z"), "href": "https://example.test/bootstrap.grib", "size": 7}
            ]}},
            targets,
            empty_document(),
            captured_iso,
            {"bytes": 0},
        )
        assert replay["reason"] == "completed"
        assert replay["assetsCompleted"] == 1 and replay["bootstrapDownloads"] == 1
        assert replay["bootstrapDownloadedBytes"] == 7 and replay["samplesWritten"] == 1
    finally:
        bulk.download_asset = original_download
        bulk.process_grib = original_process
        bulk.CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN = original_limit
        bulk.RAW_DIR = original_raw_dir

print("Current-field shadow regression: OK")
