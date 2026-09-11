#!/usr/bin/env python3
"""Focused contracts for the single native WAM owner policy."""
from __future__ import annotations

import json
import sys
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from lib.coastal_point_staging import stage_asset_complete  # noqa: E402
from lib.dmi_wave_history_bootstrap import (  # noqa: E402
    load_coastal_part_registry,
)
from lib.dmi_wave_owner import (  # noqa: E402
    WAM_DW_PART_OVERRIDES,
    wave_owner_by_cache_key,
    wave_owner_collection,
    wave_owner_for_target,
)


class WaveOwnerPolicyTests(unittest.TestCase):
    def test_only_exact_audited_west_parts_override_the_coast_rule(self) -> None:
        for part_id in WAM_DW_PART_OVERRIDES:
            self.assertEqual(wave_owner_collection(part_id, "west"), "wam_dw")
        self.assertEqual(wave_owner_collection("ordinary-west", "west"), "wam_nsb")
        self.assertEqual(wave_owner_collection("ordinary-east", "east"), "wam_dw")
        self.assertEqual(wave_owner_collection("ordinary-fjord", "limfjord"), "wam_dw")
        with self.assertRaises(ValueError):
            wave_owner_collection(next(iter(WAM_DW_PART_OVERRIDES)), "east")
        with self.assertRaises(ValueError):
            wave_owner_collection("ordinary", "unknown")

    def test_stage_completion_uses_the_same_owner_for_normal_and_oneoff_runtime(self) -> None:
        override = next(iter(WAM_DW_PART_OVERRIDES))
        target = {
            "id": f"PART::{override}",
            "partId": override,
            "coastType": "west",
        }
        self.assertEqual(wave_owner_for_target(target), "wam_dw")
        empty_stage = {"zones": {}}
        self.assertFalse(stage_asset_complete(
            empty_stage, [target], "wam_dw", "2026-09-11T05:00:00Z",
        ))
        self.assertTrue(stage_asset_complete(
            empty_stage, [target], "wam_nsb", "2026-09-11T05:00:00Z",
        ))

    def test_live_registry_has_one_owner_per_native_part(self) -> None:
        registry_document = json.loads(
            (ROOT / "data/live/coastal-parts-v2.json").read_text(encoding="utf-8")
        )
        zones_document = json.loads(
            (ROOT / "data/zones.geojson").read_text(encoding="utf-8")
        )
        registry = load_coastal_part_registry(registry_document)
        coast_types = {
            feature["properties"]["id"]: feature["properties"]["coastType"]
            for feature in zones_document["features"]
        }
        owners = wave_owner_by_cache_key(registry.parts, coast_types)
        operational = {
            part.cache_key: owners[part.cache_key]
            for part in registry.parts
            if part.parent_zone_id != "DK-B05-11"
        }
        self.assertEqual(len(operational), 670)
        self.assertEqual(Counter(operational.values()), Counter({
            "wam_dw": 458,
            "wam_nsb": 212,
        }))
        for part_id in WAM_DW_PART_OVERRIDES:
            self.assertEqual(owners[f"PART::{part_id}"], "wam_dw")


if __name__ == "__main__":
    unittest.main()
