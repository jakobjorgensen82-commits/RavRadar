#!/usr/bin/env python3
"""Assemble a disabled runtime-format bundle for the final approved coast."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FALSE_FLAGS = {
    "productionGeometryChanged": False,
    "adminDataChanged": False,
    "weatherSamplingChanged": False,
    "stateChanged": False,
    "scoreChanged": False,
    "automaticActivationAllowed": False,
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha(path: Path):
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build(candidate, old_names, old_points, old_grid, new_points, new_grid):
    old_name = {row["finalPartId"]: row for row in old_names.get("parts") or []}
    old_point = {row["finalPartId"]: row for row in old_points.get("parts") or []}
    old_proof = {row["finalPartId"]: row for row in old_grid.get("parts") or []}
    new_point = {row["finalPartId"]: row for row in new_points.get("parts") or []}
    new_proof = {row["finalPartId"]: row for row in new_grid.get("parts") or []}
    features, names, points, proofs = [], [], [], []
    seen = set()
    for zone_id in sorted(candidate.get("zones") or {}):
        for part in candidate["zones"][zone_id]:
            part_id = part["partId"]
            if part_id in seen:
                raise RuntimeError(f"Dubleret partId: {part_id}")
            seen.add(part_id)
            point = old_point.get(part_id) or new_point.get(part_id)
            proof = old_proof.get(part_id) or new_proof.get(part_id)
            name = old_name.get(part_id, {}).get("suggestedName") or part.get("name") or zone_id
            if not point or not proof:
                raise RuntimeError(f"{part_id} mangler punkt- eller DMI-bevis")
            if point.get("status") != "private-point-pair-proposed" or proof.get("status") != "validated-selected-water-point":
                raise RuntimeError(f"{part_id} er ikke valideret til runtimeformat")
            features.append({
                "type": "Feature",
                "properties": {"zoneId": zone_id, "partId": part_id, "finalPartId": part_id},
                "geometry": part["geometry"],
            })
            names.append({"finalPartId": part_id, "zoneId": zone_id, "suggestedName": name, "sourcePartId": part_id})
            points.append(point)
            proofs.append(proof)
    if len(features) != candidate.get("partCount") or len(features) != 643:
        raise RuntimeError(f"Runtimepakken skal have 643 dele, fik {len(features)}")
    full = sum(row.get("selected", {}).get("fullWeatherCoverage") is True for row in proofs)
    return (
        {"type": "FeatureCollection", "features": features},
        {"schemaVersion": "1.0.0", "status": "private-owner-approved-part-names", "generatedAt": now(), "finalPartCount": len(names), "suggestedNameCount": len(names), "blockedNameCount": 0, **FALSE_FLAGS, "parts": names},
        {"schemaVersion": "1.0.0", "status": "private-national-read-only-local-part-point-pairs", "generatedAt": now(), "finalPartCount": len(points), "proposedPointPairCount": len(points), "blockedPointPairCount": 0, **FALSE_FLAGS, "parts": points},
        {"schemaVersion": "1.0.0", "status": "passed-private-national-dmi-grid-validation", "generatedAt": now(), "method": "combined prior owner-approved proof and final native DMI validation", "candidateCount": len(proofs), "selectedPointCount": len(proofs), "invalidSelectedPointCount": 0, "fullCoverageSelectedPointCount": full, "partialCoverageSelectedPointCount": len(proofs) - full, "ambiguousPartCount": 0, "uniquelyResolvedAmbiguousPartCount": 0, "stillBlockedAmbiguousPartCount": 0, **FALSE_FLAGS, "parts": proofs},
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-candidate-2026-08-11.json")
    parser.add_argument("--new-points", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-point-pairs-2026-08-11.json")
    parser.add_argument("--new-grid", type=Path, default=ROOT / "data/geometry-v2/approved-public-coast-dmi-grid-2026-08-11.json")
    parser.add_argument("--old-dir", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--output-dir", type=Path, default=ROOT / ".geometry-v2-work/approved-public-coast-runtime-bundle")
    args = parser.parse_args()
    documents = build(
        load(args.candidate), load(args.old_dir / "part-names.json"), load(args.old_dir / "point-pairs.json"),
        load(args.old_dir / "dmi-grid-proof.json"), load(args.new_points), load(args.new_grid),
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    names = ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")
    for name, document in zip(names, documents):
        (args.output_dir / name).write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    grid = documents[-1]
    manifest = {
        "schemaVersion": "1.0.0",
        "status": "private-owner-approved-runtime-bundle-not-active",
        "sourceRunId": "31532688885",
        "sourceCommit": "7bc1c6361e909a26e7c5ed893ac56c3a6978dc8d",
        "sourceVersion": "private-approved-public-coast-2026-08-11",
        "partCount": 643,
        "zoneCount": 206,
        "parentZoneCount": 212,
        "overlapPairCount": 0,
        "pointPairCount": 643,
        "invalidPointPairCount": 0,
        "fullMarineCoveragePartCount": grid["fullCoverageSelectedPointCount"],
        "partialMarineCoveragePartCount": grid["partialCoverageSelectedPointCount"],
        "files": {name: sha(args.output_dir / name) for name in names},
        "scorePolicy": {"bestValidPartDeterminesZoneScore": True, "wholeZoneMarginPoints": 7, "missingPartDataRemainsMissing": True, "parentFallbackForbidden": True},
        "environment": "private-validation-only",
        "publicActivation": False,
        "activationAuthority": None,
        "rollback": {"method": "bundle is disabled and cannot replace central runtime truth", "preservesParentRuntime": True},
        "automaticActivationAllowed": False,
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: manifest[key] for key in ("status", "partCount", "zoneCount", "parentZoneCount", "fullMarineCoveragePartCount", "partialMarineCoveragePartCount", "publicActivation")}))


if __name__ == "__main__":
    main()
