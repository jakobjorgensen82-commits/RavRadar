#!/usr/bin/env python3
"""Apply independently evidenced land/water corrections to point-pair JSON."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from lib.national_land_water_evidence import point_pair_fingerprint

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, default=ROOT / "data/geometry-v2/national-land-water-side-evidence-2026-08-14.json")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--candidate-input", type=Path)
    parser.add_argument("--candidate-output", type=Path)
    parser.add_argument(
        "--allow-deferred",
        action="store_true",
        help="Allow evidenced parts that are introduced by a later owner-correction stage to be deferred.",
    )
    parser.add_argument(
        "--require-exact-evidence",
        action="store_true",
        help="Require evidence generated from the exact uncorrected point-pair input.",
    )
    args = parser.parse_args()
    points = load(args.input)
    evidence = load(args.decisions)
    corrections = evidence.get("corrections") or {}
    ambiguous = set(evidence.get("ambiguousPartIds") or [])
    rows = points.get("parts") or []
    evidence_fingerprint = evidence.get("inputPointPairSha256")
    if args.require_exact_evidence and not evidence_fingerprint:
        raise RuntimeError("Det kandidat-specifikke land/vand-bevis mangler inputfingeraftryk")
    if evidence_fingerprint:
        actual_fingerprint = point_pair_fingerprint(rows)
        if actual_fingerprint != evidence_fingerprint:
            raise RuntimeError(
                "Land/vand-beviset matcher ikke kandidatens præcise, ukorrigerede punktbestand"
            )
        audited_count = evidence.get("auditedPartCount")
        if audited_count != len(rows):
            raise RuntimeError(
                f"Land/vand-bevisets antal er {audited_count}, men punktbestanden har {len(rows)} dele"
            )
    by_id = {row.get("finalPartId") or row.get("partId"): row for row in rows}
    missing = sorted(set(corrections) - set(by_id))
    if missing and not args.allow_deferred:
        raise RuntimeError("Korrektioner mangler i punktbestanden: " + ", ".join(missing))
    applied = sorted(set(corrections) & set(by_id))
    for part_id in applied:
        correction = corrections[part_id]
        row = by_id[part_id]
        row["landPoint"] = correction["landPoint"]
        row["waterPoint"] = correction["waterPoint"]
        row["onshoreDirectionDeg"] = correction["onshoreDirectionDeg"]
        # The independent transect evidence resolves the side ambiguity even
        # when the preliminary witness builder had to block the row. Keep the
        # corrected pair isolated until the later DMI and owner-review gates.
        row["status"] = "private-point-pair-proposed"
        row["blockingReasons"] = []
        row["unresolvedNormalCandidates"] = []
        row["weatherSamplingEnabled"] = False
        row["stateEnabled"] = False
        row["scoreEnabled"] = False
        row["automaticActivationAllowed"] = False
        row["landWaterSideEvidence"] = {
            "source": evidence["source"],
            "auditDate": evidence["auditDate"],
            "classification": "reversed-and-corrected",
        }
    for part_id in ambiguous & set(by_id):
        row = by_id[part_id]
        land_point = row.get("landPoint")
        water_point = row.get("waterPoint")
        if (
            row.get("status") == "private-point-pair-proposed"
            and isinstance(land_point, list) and len(land_point) >= 2
            and isinstance(water_point, list) and len(water_point) >= 2
        ):
            row["status"] = "blocked-point-pair-evidence"
            row["landPoint"] = None
            row["waterPoint"] = None
            row["onshoreDirectionDeg"] = None
            row["unresolvedNormalCandidates"] = [
                {"side": 1, "landCandidate": land_point, "waterCandidate": water_point},
                {"side": -1, "landCandidate": water_point, "waterCandidate": land_point},
            ]
            row["blockingReasons"] = sorted(set(
                (row.get("blockingReasons") or []) + ["AMBIGUOUS_ESA_LAND_WATER_SIDE"]
            ))
        row["weatherSamplingEnabled"] = False
        row["stateEnabled"] = False
        row["scoreEnabled"] = False
        row["automaticActivationAllowed"] = False
        row["landWaterSideEvidence"] = {
            "source": evidence["source"],
            "auditDate": evidence["auditDate"],
            "classification": "ambiguous-requires-review",
        }
    points["landWaterSideCorrectionCount"] = len(applied)
    points["landWaterSideDeferredCorrectionIds"] = missing
    points["landWaterSideAmbiguousCount"] = len(ambiguous & set(by_id))
    points["landWaterSideEvidenceSource"] = evidence["source"]
    points["proposedPointPairCount"] = sum(
        row.get("status") == "private-point-pair-proposed" for row in rows
    )
    points["blockedPointPairCount"] = len(rows) - points["proposedPointPairCount"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(points, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    if bool(args.candidate_input) != bool(args.candidate_output):
        raise RuntimeError("--candidate-input og --candidate-output skal bruges sammen")
    if args.candidate_input:
        candidate = load(args.candidate_input)
        candidate_ids = []
        for candidate_rows in (candidate.get("zones") or {}).values():
            for candidate_row in candidate_rows:
                candidate_id = candidate_row.get("partId")
                candidate_ids.append(candidate_id)
                point_row = by_id.get(candidate_id)
                if not point_row:
                    raise RuntimeError(f"Fallback-kandidaten mangler punktbevis for {candidate_id}")
                for key in (
                    "landPoint", "waterPoint", "onshoreDirectionDeg", "status",
                    "blockingReasons", "unresolvedNormalCandidates", "landWaterSideEvidence",
                ):
                    candidate_row[key] = point_row.get(key)
                candidate_row["weatherSamplingEnabled"] = False
                candidate_row["stateEnabled"] = False
                candidate_row["scoreEnabled"] = False
                candidate_row["automaticActivationAllowed"] = False
        if set(candidate_ids) != set(by_id):
            raise RuntimeError("Fallback-kandidat og punktbestand er ikke 1:1")
        candidate["status"] = (
            "private-land-water-evidence-applied-with-blocked-parts"
            if points["blockedPointPairCount"] else "private-land-water-evidence-applied"
        )
        candidate["pointPairCount"] = points["proposedPointPairCount"]
        candidate["blockedPointPairCount"] = points["blockedPointPairCount"]
        candidate["automaticActivationAllowed"] = False
        args.candidate_output.parent.mkdir(parents=True, exist_ok=True)
        args.candidate_output.write_text(
            json.dumps(candidate, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
    print(
        f"Land/vand-korrektioner anvendt: {len(applied)}; "
        f"udskudt: {len(missing)}; tvetydige i punktbestanden: {len(ambiguous & set(by_id))}"
    )


if __name__ == "__main__":
    main()
