#!/usr/bin/env python3
"""Build a private read-only shadow contract input from active public points."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DETAILS = ROOT / ".cache" / "active-public-condition-details.json"
DEFAULT_ZONES = ROOT / "data" / "zones.geojson"
DEFAULT_POINTS = ROOT / ".geometry-v2-work" / "national-local-part-point-pairs.json"
DEFAULT_PLAN = ROOT / ".geometry-v2-work" / "national-work-plan.json"
FALSE_FLAGS = (
    "productionGeometryChanged", "adminDataChanged", "weatherSamplingChanged",
    "stateChanged", "publicRuntimeChanged", "scoreChanged", "automaticActivationAllowed",
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def point(value: Any, label: str) -> list[float]:
    if not isinstance(value, list) or len(value) != 2:
        raise RuntimeError(f"{label} mangler et gyldigt koordinatpar")
    result = [float(value[0]), float(value[1])]
    if not (-180 <= result[0] <= 180 and -90 <= result[1] <= 90):
        raise RuntimeError(f"{label} ligger uden for gyldige koordinater")
    return result


def build(details: dict[str, Any], zones: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    coastal = details.get("coastalParts") or {}
    parts = coastal.get("parts") or {}
    zone_rows = details.get("zones") or {}
    expected = int(coastal.get("expectedPartCount") or 0)
    scored = int(coastal.get("scoredPartCount") or 0)
    if not details.get("datasetId") or expected < 1 or len(parts) != expected or scored != expected:
        raise RuntimeError("Det offentlige runtime har ikke en komplet aktiv kystdelsbestand")
    if not isinstance(zone_rows, dict) or not zone_rows:
        raise RuntimeError("Det offentlige runtime mangler aktive parentzoner")

    feature_by_id = {
        str((feature.get("properties") or {}).get("id")): feature.get("properties") or {}
        for feature in zones.get("features") or []
        if (feature.get("properties") or {}).get("id")
    }
    if not set(zone_rows).issubset(feature_by_id):
        raise RuntimeError("En eller flere aktive runtimezoner mangler i repositoryets zonebestand")

    rows = []
    for part_id, source in sorted(parts.items()):
        zone_id = str(source.get("zoneId") or "")
        feature = feature_by_id.get(zone_id) or {}
        coast_type = str(feature.get("coastType") or "")
        if coast_type not in {"west", "east", "limfjord"}:
            raise RuntimeError(f"{part_id} mangler gyldig coastType")
        direction = source.get("onshoreDirectionDeg")
        if not isinstance(direction, (int, float)):
            raise RuntimeError(f"{part_id} mangler retning mod kysten")
        rows.append({
            "zoneId": zone_id,
            "coastType": coast_type,
            "finalPartId": part_id,
            "suggestedName": source.get("name") or part_id,
            "status": "private-point-pair-proposed",
            "landPoint": point(source.get("landPoint"), f"{part_id}/land"),
            "waterPoint": point(source.get("waterPoint"), f"{part_id}/water"),
            "onshoreDirectionDeg": float(direction),
            "sourceStatus": "active-public-runtime-read-only",
        })

    flags = {key: False for key in FALSE_FLAGS}
    digest = hashlib.sha256(json.dumps([
        details["datasetId"], details.get("generatedAt"),
        [[row["finalPartId"], row["zoneId"], row["landPoint"], row["waterPoint"]] for row in rows],
    ], separators=(",", ":")).encode("utf-8")).hexdigest()
    points = {
        "schemaVersion": "1.0.0", "status": "private-national-read-only-local-part-point-pairs",
        "generatedAt": now(), "sourceDatasetId": details["datasetId"], "sourceGeneratedAt": details.get("generatedAt"),
        "sourceDigest": digest, "activeRuntimeReadOnly": True, "finalPartCount": len(rows),
        "proposedPointPairCount": len(rows), "blockedPointPairCount": 0, "parts": rows, **flags,
    }
    plan = {
        "schemaVersion": "1.0.0", "status": "private-active-runtime-shadow-plan", "generatedAt": now(),
        "sourceDatasetId": details["datasetId"], "sourceZoneCount": len(zone_rows),
        "zones": [{"zoneId": zone_id} for zone_id in sorted(zone_rows)],
        "productionGeometryChanged": False, "adminDataChanged": False,
        "publicRuntimeChanged": False, "automaticActivationAllowed": False,
    }
    summary = {
        "status": "private-active-runtime-shadow-input-ready", "sourceDatasetId": details["datasetId"],
        "zoneCount": len(zone_rows), "partCount": len(rows), "sourceDigest": digest,
        "coordinatesStoredInSummary": False, "scoreChanged": False,
        "publicRuntimeChanged": False, "automaticActivationAllowed": False,
    }
    return points, plan, summary


def self_test() -> None:
    zones = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"id": "Z1", "coastType": "west"}, "geometry": None},
        {"type": "Feature", "properties": {"id": "Z2", "coastType": "east"}, "geometry": None},
        {"type": "Feature", "properties": {"id": "HISTORICAL", "coastType": "east"}, "geometry": None},
    ]}
    details = {"datasetId": "rr-test", "generatedAt": "2026-08-21T00:00:00Z", "zones": {"Z1": {}, "Z2": {}},
               "coastalParts": {"expectedPartCount": 2, "scoredPartCount": 2, "parts": {
                   "p1": {"zoneId": "Z1", "name": "En", "landPoint": [8, 56], "waterPoint": [8.01, 56], "onshoreDirectionDeg": 90},
                   "p2": {"zoneId": "Z2", "name": "To", "landPoint": [9, 55], "waterPoint": [9.01, 55], "onshoreDirectionDeg": 270},
               }}}
    points, plan, summary = build(details, zones)
    assert points["finalPartCount"] == 2 and plan["sourceZoneCount"] == 2 and summary["partCount"] == 2
    assert points["parts"][0]["status"] == "private-point-pair-proposed"
    assert points["productionGeometryChanged"] is False and summary["automaticActivationAllowed"] is False
    broken = json.loads(json.dumps(details)); broken["coastalParts"]["scoredPartCount"] = 1
    try: build(broken, zones)
    except RuntimeError: pass
    else: raise AssertionError("Ufuldstændigt runtime blev accepteret")
    print("Aktivt runtime til privat RavScore-shadow self-test: bestået")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--details", type=Path, default=DEFAULT_DETAILS)
    parser.add_argument("--zones", type=Path, default=DEFAULT_ZONES)
    parser.add_argument("--points", type=Path, default=DEFAULT_POINTS)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--summary", type=Path, default=ROOT / ".geometry-v2-work" / "active-runtime-shadow-input-summary.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test(); return 0
    points, plan, summary = build(json.loads(args.details.read_text("utf-8")), json.loads(args.zones.read_text("utf-8")))
    for target, document in ((args.points, points), (args.plan, plan), (args.summary, summary)):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(json.dumps({key: summary[key] for key in ("status", "sourceDatasetId", "zoneCount", "partCount", "scoreChanged")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
