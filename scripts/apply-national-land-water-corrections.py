#!/usr/bin/env python3
"""Apply independently evidenced land/water corrections to point-pair JSON."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--decisions", type=Path, default=ROOT / "data/geometry-v2/national-land-water-side-evidence-2026-08-14.json")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--allow-deferred",
        action="store_true",
        help="Allow evidenced parts that are introduced by a later owner-correction stage to be deferred.",
    )
    args = parser.parse_args()
    points = load(args.input)
    evidence = load(args.decisions)
    corrections = evidence.get("corrections") or {}
    ambiguous = set(evidence.get("ambiguousPartIds") or [])
    rows = points.get("parts") or []
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
        row["landWaterSideEvidence"] = {
            "source": evidence["source"],
            "auditDate": evidence["auditDate"],
            "classification": "reversed-and-corrected",
        }
    for part_id in ambiguous & set(by_id):
        by_id[part_id]["landWaterSideEvidence"] = {
            "source": evidence["source"],
            "auditDate": evidence["auditDate"],
            "classification": "ambiguous-requires-review",
        }
    points["landWaterSideCorrectionCount"] = len(applied)
    points["landWaterSideDeferredCorrectionIds"] = missing
    points["landWaterSideAmbiguousCount"] = len(ambiguous & set(by_id))
    points["landWaterSideEvidenceSource"] = evidence["source"]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(points, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        f"Land/vand-korrektioner anvendt: {len(applied)}; "
        f"udskudt: {len(missing)}; tvetydige i punktbestanden: {len(ambiguous & set(by_id))}"
    )


if __name__ == "__main__":
    main()
