#!/usr/bin/env python3
"""Fail-closed contract test for the eight owner-approved Limfjord proxies."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def close(a: list[float], b: list[float], tolerance: float = 1e-7) -> bool:
    return len(a) == len(b) == 2 and all(math.isclose(float(x), float(y), abs_tol=tolerance) for x, y in zip(a, b))


def main() -> None:
    policy = json.loads((ROOT / "data/current-regional-proxy-policy.json").read_text(encoding="utf-8"))
    registry_path = Path(os.getenv("COASTAL_PARTS_PATH", str(ROOT / "data/live/coastal-parts-v2.json")))
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    indexed = {}
    for raw_parts in registry["zones"].values():
        for part in raw_parts if isinstance(raw_parts, list) else [raw_parts]:
            indexed[part["partId"]] = part

    parts = policy.get("parts") or []
    need(len(parts) == 8, "Regional proxy policy must contain exactly the eight owner-approved parts")
    need(len({row["partId"] for row in parts}) == 8, "Regional proxy part IDs must be unique")
    need(policy.get("regularMaximumDistanceKm") == 5, "Ordinary current must remain capped at 5 km")
    need(policy.get("regionalProxyMaximumDistanceKm") == 15, "The bounded regional proxy cap must be 15 km")
    need(policy.get("requiredCollection") == "dkss_lf", "Only the DMI Limfjord model may supply the exception")
    need(policy.get("sameConnectedWaterBody") == "Limfjorden", "The proxy must stay in the same connected water body")
    need(policy.get("globalOverrideAllowed") is False, "The policy must not create a global distance override")
    need(policy.get("interpolation") is False, "Regional proxy interpolation must remain forbidden")
    need(policy.get("scoreImpact") is False and policy.get("publicRuntime") is False, "Policy must stay private until gates pass")
    need(max(float(row["auditDistanceKm"]) for row in parts) < 15, "Every approved audit distance must fit the bounded cap")
    for row in parts:
        current = indexed.get(row["partId"])
        need(current is not None, f"Policy part is absent from central registry: {row['partId']}")
        need(close(current.get("waterPoint") or [], row["approvedSamplingPoint"]), f"Sampling point changed for {row['partId']}; reapproval required")
    print("OK: eight explicit Limfjord regional proxies, 15 km cap, no global override")


if __name__ == "__main__":
    main()
