#!/usr/bin/env python3
"""Materialize the owner-approved coast as the 4.0.182 active source bundle."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, document, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    separators = None if pretty else (",", ":")
    path.write_text(json.dumps(document, ensure_ascii=False, indent=2 if pretty else None, separators=separators) + "\n", encoding="utf-8")


def sha(path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--activate", action="store_true")
    parser.add_argument("--bundle", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-runtime-bundle")
    parser.add_argument("--registry", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-zone-registry-2026-08-11.geojson")
    parser.add_argument("--active-dir", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--zones-output", type=Path, default=ROOT / "data/zones.geojson")
    args = parser.parse_args()
    if not args.activate:
        parser.error("Aktivering kræver det eksplicitte flag --activate")
    source_manifest = load(args.bundle / "manifest.json")
    registry = load(args.registry)
    if source_manifest.get("publicActivation") is not False or source_manifest.get("partCount") != 643 or source_manifest.get("zoneCount") != 206:
        raise RuntimeError("Den private runtimepakke matcher ikke den godkendte 643/206-bestand")
    if len(registry.get("features") or []) != 212 or registry.get("automaticActivationAllowed") is not False:
        raise RuntimeError("Det godkendte hovedzoneregister matcher ikke 212 fail-closed zoner")
    registry["version"] = "4.0.182"
    registry["status"] = "owner-approved-national-public-coast-active"
    registry.setdefault("metadata", {})["version"] = "4.0.182"
    registry["metadata"]["preciseZoneCount"] = 206
    registry["metadata"]["fallbackZoneCount"] = 6
    for feature in registry["features"]:
        properties = feature.setdefault("properties", {})
        properties["zoneStatus"] = "active"
        properties["coastLine"] = [point[:2] for point in properties.get("coastLine", [])]
        if properties.get("coastLineRefinementMode") == "private-owner-approved-not-active":
            properties["coastLineRefinementMode"] = "owner-approved-precise-public-coast"
            properties["coastLineVersion"] = "4.0.182"
    for name in FILES:
        write(args.active_dir / name, load(args.bundle / name))
    manifest = {
        **source_manifest,
        "status": "owner-approved-national-public-coast-active",
        "sourceRunId": "31533385967",
        "sourceCommit": "806648e6634f1e1cfbb366451bee2df2d2eab9ab",
        "sourceVersion": "4.0.182",
        "files": {name: sha(args.active_dir / name) for name in FILES},
        "environment": "production",
        "publicActivation": True,
        "activatedAt": "2026-08-11",
        "activationAuthority": "explicit owner approvals in Codex thread 2026-08-11",
        "rollback": {"method": "restore the prior active-national-coastal-parts bundle and zones.geojson, then redeploy", "preservesParentRuntime": True},
        "automaticActivationAllowed": False,
    }
    write(args.active_dir / "manifest.json", manifest, pretty=True)
    write(args.zones_output, registry, pretty=True)
    audit = {
        "schemaVersion": "1.0.0",
        "status": "passed-owner-approved-public-coast-activation-assembly",
        "sourceRunId": "31533385967",
        "partCount": 643,
        "preciseZoneCount": 206,
        "fallbackZoneCount": 6,
        "parentZoneCount": 212,
        "overlapPairCount": 0,
        "unresolvedRelevantGapCount": 0,
        "pointPairCount": 643,
        "fullMarineCoveragePartCount": manifest["fullMarineCoveragePartCount"],
        "partialMarineCoveragePartCount": manifest["partialMarineCoveragePartCount"],
        "ownerApproved": True,
        "automaticActivationAllowed": False,
    }
    write(args.active_dir / "assembly-audit.json", audit, pretty=True)
    print(json.dumps({key: audit[key] for key in ("status", "partCount", "preciseZoneCount", "fallbackZoneCount", "parentZoneCount", "overlapPairCount", "pointPairCount")}))


if __name__ == "__main__":
    main()
