"""Deterministic identity for the centrally approved Copernicus target set.

This module intentionally uses only the Python standard library so the
credential-free heartbeat can verify target geometry without installing the
scientific Copernicus runtime.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any


FINGERPRINT_PREFIX = "sha256:"


def _canonical_coordinate(value: Any) -> str:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError("Target coordinate must be finite")
    return f"{number:.7f}"


def target_fingerprint(targets: list[dict[str, Any]]) -> str:
    """Hash part identity and current water points in a stable order."""
    rows: list[list[str]] = []
    seen: set[str] = set()
    for target in targets:
        part_id = str(target.get("partId") or "").strip()
        parent_zone_id = str(target.get("parentZoneId") or "").strip()
        point = target.get("waterPoint")
        if not part_id or not parent_zone_id:
            raise ValueError("Every Copernicus target needs part and parent-zone identity")
        if part_id in seen:
            raise ValueError(f"Duplicate Copernicus target id: {part_id}")
        if not isinstance(point, (list, tuple)) or len(point) < 2:
            raise ValueError(f"Copernicus target {part_id} has no water point")
        seen.add(part_id)
        rows.append([
            part_id,
            parent_zone_id,
            _canonical_coordinate(point[0]),
            _canonical_coordinate(point[1]),
        ])
    rows.sort()
    payload = json.dumps({"schemaVersion": 1, "targets": rows}, ensure_ascii=False, separators=(",", ":"))
    return FINGERPRINT_PREFIX + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def targets_from_registry(path: Path) -> list[dict[str, Any]]:
    """Load the same target identity used by the authenticated pilot."""
    document = json.loads(path.read_text(encoding="utf-8"))
    zones = document.get("zones")
    if not isinstance(zones, dict):
        raise ValueError("Coastal-part registry has no zones object")
    targets: list[dict[str, Any]] = []
    for parent_zone_id, raw_parts in zones.items():
        parts = raw_parts if isinstance(raw_parts, list) else [raw_parts]
        for part in parts:
            if not isinstance(part, dict):
                raise ValueError("Coastal-part registry contains a malformed part")
            point = part.get("waterPoint")
            if not isinstance(point, list) or len(point) < 2:
                raise ValueError(f"Coastal part {part.get('partId') or '<unknown>'} has no water point")
            targets.append({
                "partId": str(part.get("partId") or ""),
                "parentZoneId": str(part.get("sourceZoneId") or parent_zone_id),
                "waterPoint": [float(point[0]), float(point[1])],
            })
    expected = int(document.get("partCount") or len(targets))
    if len(targets) != expected:
        raise ValueError(f"Coastal-part target count mismatch: {len(targets)} != {expected}")
    return targets


def target_fingerprint_from_registry(path: Path) -> str:
    return target_fingerprint(targets_from_registry(path))
