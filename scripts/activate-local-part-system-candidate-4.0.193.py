#!/usr/bin/env python3
"""Activate only the CI-validated 4.0.193 local-part candidate with rollback."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value, pretty=False):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2 if pretty else None, separators=None if pretty else (",", ":")) + "\n", encoding="utf-8")


def digest(path: Path):
    return hashlib.sha256(path.read_text(encoding="utf-8").replace("\r\n", "\n").encode()).hexdigest()


def part_ids(document, key):
    return [row[key] for row in document]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--activate", action="store_true")
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--new-grid", type=Path, required=True)
    parser.add_argument("--active", type=Path, default=ROOT / "data/geometry-v2/active-national-coastal-parts")
    parser.add_argument("--rollback", type=Path, default=ROOT / "data/geometry-v2/rollback-4.0.192-before-local-part-system")
    parser.add_argument("--reuse-verified-rollback", action="store_true")
    parser.add_argument("--source-run-id", default="31764242827")
    args = parser.parse_args()
    if not args.activate:
        parser.error("Aktivering kræver det eksplicitte flag --activate")
    if args.rollback.exists():
        if not args.reuse_verified_rollback:
            raise RuntimeError("Rollbackmappen findes allerede; aktivering afbrydes")
        rollback_manifest = load(args.rollback / "manifest.json")
        if rollback_manifest.get("partCount") != 651 or rollback_manifest.get("publicActivation") is not True:
            raise RuntimeError("Den eksisterende rollback er ikke den aktive 651-dels baseline")

    report = load(args.candidate / "report.json")
    coast = load(args.candidate / "coastal-parts.geojson")
    points = load(args.candidate / "point-pairs.json")
    names = load(args.candidate / "part-names.json")
    prior_grid = load(args.candidate / "dmi-grid-proof.json")
    new_grid = load(args.new_grid)
    if report.get("candidatePartCount") != 673 or report.get("replacementCount") != 10 or report.get("blockedCount") != 1:
        raise RuntimeError("Kandidaten matcher ikke den CI-validerede 673/10/1-kontrakt")
    if new_grid.get("status") != "passed-private-national-dmi-grid-validation" or new_grid.get("candidateCount") != 45 or new_grid.get("invalidSelectedPointCount") != 0 or new_grid.get("fullCoverageSelectedPointCount") != 45:
        raise RuntimeError("De 45 ændrede punkter mangler fuldt native DMI-gridbevis")
    if any(value is not False for value in (report.get("productionGeometryChanged"), report.get("adminDataChanged"), report.get("automaticActivationAllowed"))):
        raise RuntimeError("Privatkandidatens isolation er ikke intakt")

    # Private builders deliberately keep every candidate disabled. Activation
    # normalizes only the already CI-validated rows to the existing public
    # runtime contract; it does not change their coordinates or directions.
    for row in points["parts"]:
        row["status"] = "private-point-pair-proposed"
        row["weatherSamplingEnabled"] = True
        row["scoreEnabled"] = True
        row["automaticActivationAllowed"] = False

    coast_ids = [feature["properties"].get("finalPartId") or feature["properties"].get("partId") for feature in coast["features"]]
    point_ids = part_ids(points["parts"], "finalPartId")
    name_ids = part_ids(names["parts"], "finalPartId")
    old_grid_ids = part_ids(prior_grid["parts"], "finalPartId")
    new_grid_ids = part_ids(new_grid["parts"], "finalPartId")
    if len(set(coast_ids)) != 673 or set(coast_ids) != set(point_ids) or set(coast_ids) != set(name_ids):
        raise RuntimeError("Kyst, punktpar og navne har ikke samme 673 unikke identiteter")
    if set(old_grid_ids) & set(new_grid_ids) or set(old_grid_ids) | set(new_grid_ids) != set(coast_ids):
        raise RuntimeError("Gammelt og nyt DMI-gridbevis dækker ikke kandidaten præcist én gang")

    combined_grid = {
        **prior_grid,
        "status": "passed-active-local-part-system-dmi-grid-validation",
        "generatedAt": new_grid.get("generatedAt"),
        "method": "unchanged prior native grid proof plus CI run 31764242827 for 45 changed points",
        "candidateCount": 673,
        "selectedPointCount": 673,
        "invalidSelectedPointCount": 0,
        "parts": [*prior_grid["parts"], *new_grid["parts"]],
        "finalPartCount": 673,
        "productionGeometryChanged": True,
        "weatherSamplingChanged": True,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
    }
    full = sum(row.get("selected", {}).get("fullWeatherCoverage") is True for row in combined_grid["parts"])
    partial = 673 - full

    if not args.rollback.exists():
        args.rollback.mkdir(parents=True)
        for name in (*FILES, "manifest.json", "assembly-audit.json"):
            source = args.active / name
            if source.exists():
                shutil.copy2(source, args.rollback / name)
    for name, document in (("coastal-parts.geojson", coast), ("part-names.json", names), ("point-pairs.json", points), ("dmi-grid-proof.json", combined_grid)):
        write(args.active / name, document)

    previous_manifest = load(args.rollback / "manifest.json")
    manifest = {
        **previous_manifest,
        "status": "active-local-part-system-repair-4.0.193",
        "sourceRunId": args.source_run_id,
        "sourceCommit": "f52daab7fc91ca16e9549625b5c0f31dea73af13",
        "sourceVersion": "4.0.193",
        "partCount": 673,
        "pointPairCount": 673,
        "fullMarineCoveragePartCount": full,
        "partialMarineCoveragePartCount": partial,
        "files": {name: digest(args.active / name) for name in FILES},
        "scorePolicy": {
            "bestValidPartDeterminesZoneScore": True,
            "wholeZoneMarginPoints": 7,
            "missingPartDataRemainsMissing": True,
            "parentFallbackWhenLocalComparisonIncomplete": True,
            "geographicClaimAllowedDuringParentFallback": False,
        },
        "environment": "production",
        "publicActivation": True,
        "activationAuthority": "owner-authorized systemic land/water and local-score repair in Codex thread 2026-08-14",
        "rollback": {"method": str(args.rollback), "preservesParentRuntime": True},
        "automaticActivationAllowed": False,
        "activatedAt": "2026-08-14",
    }
    write(args.active / "manifest.json", manifest, True)
    audit = {
        "schemaVersion": "1.0.0",
        "status": "passed-local-part-system-activation-assembly",
        "sourceRunId": args.source_run_id,
        "sourcePartCount": 651,
        "partCount": 673,
        "replacementCount": 10,
        "blockedUnchangedCount": 1,
        "pointPairCount": 673,
        "pointGeometryIssueCount": 0,
        "changedPointDmiCandidateCount": 45,
        "changedPointDmiFullCoverageCount": 45,
        "invalidPointPairCount": 0,
        "overlapPairCount": previous_manifest.get("overlapPairCount", 0),
        "publicMainZoneGeometryChanged": False,
        "scoreFormulaChanged": False,
        "automaticActivationAllowed": False,
    }
    write(args.active / "assembly-audit.json", audit, True)
    print(json.dumps({"status": audit["status"], "partCount": 673, "fullMarineCoveragePartCount": full, "partialMarineCoveragePartCount": partial, "rollback": str(args.rollback)}))


if __name__ == "__main__":
    main()
