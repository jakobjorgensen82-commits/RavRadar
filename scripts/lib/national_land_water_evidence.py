"""Stable provenance helpers for national land/water side evidence."""
from __future__ import annotations

import hashlib
import json


def part_id(row):
    return row.get("finalPartId") or row.get("partId")


def point_pair_fingerprint(rows):
    """Hash the exact uncorrected point-pair input used by the side audit."""
    normalized = []
    seen = set()
    for row in rows:
        row_id = part_id(row)
        if not row_id or row_id in seen:
            raise RuntimeError(f"Ugyldigt eller duplikeret kystdel-id i punktbestanden: {row_id!r}")
        seen.add(row_id)
        normalized.append({
            "partId": row_id,
            "zoneId": row.get("zoneId") or row.get("sourceZoneId"),
            "coastReferencePoint": row.get("coastReferencePoint"),
            "landPoint": row.get("landPoint"),
            "waterPoint": row.get("waterPoint"),
            "onshoreDirectionDeg": row.get("onshoreDirectionDeg"),
        })
    payload = json.dumps(
        sorted(normalized, key=lambda item: item["partId"]),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
