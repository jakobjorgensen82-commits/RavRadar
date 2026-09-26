"""Offline scheduling regressions: actual CP bank loop, no files/providers."""
from __future__ import annotations

import copy
import runpy
import unittest
from pathlib import Path

from lib.copernicus_weather_component_bank import (
    build_component_plan, empty_component_bank, produce_component_bank,
)

RUNNER = runpy.run_path(str(Path(__file__).with_name("run-copernicus-weather-components.py")))
LANE = RUNNER["component_progress_lane"]
CURSORS = RUNNER["component_progress_cursors"]
CHECKPOINT = RUNNER["component_progress_checkpoint"]
PARTS = [{"partId": key, "parentZoneId": "SYNTHETIC", "waterPoint": [10.0, 58.0]}
         for key in ("GAP-A", "GAP-B", "GAP-C", "UPGRADE-A", "UPGRADE-B")]
REFERENCE = "2026-09-26T08:00:00Z"


def plan(ids, *, purpose="GAP", reference=REFERENCE, times=None):
    needs = [{"partId": key, "component": "wave", "purpose": purpose,
              "validTime": (times or {}).get(key, reference)} for key in ids]
    if purpose == "AGED_DMI_CHALLENGE":
        for need in needs:
            need["protectedModelRun"] = "2026-09-20T00:00:00Z"
    return build_component_plan(
        targets=PARTS, production_reference_at=reference, needs=needs,
        product_routes={part["partId"]: {"wave": ["nws-wave"]} for part in PARTS},
        routing_policy={"policyId": "synthetic-routing", "policySha256": "sha256:" + "a" * 64},
        retention_start_at="2026-09-25T00:00:00Z", retention_end_at="2026-10-01T00:00:00Z",
    )


def turn(value, previous, *, limit=1):
    """One bounded invocation, including the runner's real cursor checkpoints."""
    state = copy.deepcopy(previous)
    attempts = []
    def acquire(request):
        attempts.append(request["target"]["partId"])
        raise RuntimeError("CP_COMPONENT_REQUEST_TIMEOUT")
    def checkpoint(bank, rows):
        nonlocal state
        state = CHECKPOINT(state, value, bank, rows)
    cursor = CURSORS(state)[LANE(value)]
    result = produce_component_bank(
        value, empty_component_bank(PARTS), acquire_subset=acquire,
        acquisition_at=lambda: REFERENCE, checkpoint=checkpoint,
        should_continue=lambda: len(attempts) < limit,
        start_after=tuple(cursor) if cursor else None,
    )
    # A negative scheduling turn must never become successful provider data.
    assert result["bank"]["records"] == []
    assert result["stage"]["candidates"] == []
    return attempts, state


class ComponentCursorTests(unittest.TestCase):
    def test_disjoint_critical_and_upgrade_passes_cannot_reset_each_other(self):
        critical = plan(["GAP-A", "GAP-B"])
        upgrade = plan(["UPGRADE-A", "UPGRADE-B"], purpose="OPEN_METEO_UPGRADE")
        state, seen = {}, []
        for _ in range(3):
            for value in (critical, upgrade):
                attempts, state = turn(value, state)
                seen.extend(attempts)
        self.assertEqual(seen, ["GAP-A", "UPGRADE-A", "GAP-B", "UPGRADE-B", "GAP-A", "UPGRADE-A"])
        self.assertEqual(state["schemaVersion"], 2)

    def test_removed_pending_cursor_resumes_its_stable_successor(self):
        state = {"schemaVersion": 2, "cursors": {"critical": ["GAP-B", "nws-wave"]}}
        attempts, _ = turn(plan(["GAP-A", "GAP-C"]), state)
        self.assertEqual(attempts, ["GAP-C"])

    def test_target_shift_and_first_needed_time_cannot_reset_group_order(self):
        _, state = turn(plan(["GAP-A", "GAP-B", "GAP-C"]), {})
        shifted = plan(["GAP-A", "GAP-B", "GAP-C"], reference="2026-09-26T09:00:00Z",
                       times={"GAP-A": "2026-09-26T12:00:00Z", "GAP-C": "2026-09-26T09:00:00Z",
                              "GAP-B": "2026-09-26T10:00:00Z"})
        attempts, _ = turn(shifted, state)
        self.assertEqual(attempts, ["GAP-B"])

    def test_no_attempt_preserves_both_cursors_including_empty_checkpoint(self):
        state = {"schemaVersion": 2, "cursors": {
            "critical": ["GAP-A", "nws-wave"], "upgrade": ["UPGRADE-B", "nws-wave"]}}
        value = plan(["GAP-A", "GAP-B"])
        attempts, after = turn(value, state, limit=0)
        self.assertEqual(attempts, [])
        self.assertEqual(CURSORS(after), CURSORS(state))
        checkpoint = CHECKPOINT(state, value, empty_component_bank(PARTS), [])
        self.assertEqual(checkpoint["cursors"], state["cursors"])
        self.assertEqual(state["cursors"]["critical"], ["GAP-A", "nws-wave"])

    def test_legacy_cursor_is_seeded_once_without_losing_the_other_lane(self):
        old = {"kind": "CP_COMPONENT_PROGRESS_CURSOR", "schemaVersion": 1,
               "nextCursor": ["GAP-A", "nws-wave"]}
        self.assertEqual(CURSORS(old), {"critical": ["GAP-A", "nws-wave"],
                                       "upgrade": ["GAP-A", "nws-wave"]})
        attempts, upgraded = turn(plan(["GAP-A", "GAP-B"]), old)
        self.assertEqual(attempts, ["GAP-B"])
        self.assertEqual(upgraded["cursors"]["upgrade"], ["GAP-A", "nws-wave"])
        self.assertEqual(old["nextCursor"], ["GAP-A", "nws-wave"])

    def test_missing_new_lane_does_not_read_other_lanes_legacy_alias(self):
        current = {"schemaVersion": 2, "lane": "upgrade", "nextCursor": ["UPGRADE-B", "nws-wave"],
                   "cursors": {"upgrade": ["UPGRADE-B", "nws-wave"]}}
        self.assertIsNone(CURSORS(current)["critical"])

    def test_aged_dmi_challenges_share_critical_not_upgrade_lane(self):
        self.assertEqual(LANE(plan(["GAP-A"], purpose="AGED_DMI_CHALLENGE")), "critical")
        self.assertEqual(LANE(plan(["UPGRADE-A"], purpose="OPEN_METEO_UPGRADE")), "upgrade")

    def test_invalid_scheduling_hint_does_not_become_data_or_block_work(self):
        attempts, _ = turn(plan(["GAP-A"]), {"schemaVersion": 2,
                                             "cursors": {"critical": [None, 17]}})
        self.assertEqual(attempts, ["GAP-A"])
        self.assertEqual(CURSORS([]), {"critical": None, "upgrade": None})

    def test_absent_cursor_after_end_wraps_without_losing_attempts(self):
        attempts, _ = turn(plan(["GAP-A", "GAP-B"]), {
            "schemaVersion": 2, "cursors": {"critical": ["UPGRADE-B", "nws-wave"]}})
        self.assertEqual(attempts, ["GAP-A"])


if __name__ == "__main__":
    unittest.main()
