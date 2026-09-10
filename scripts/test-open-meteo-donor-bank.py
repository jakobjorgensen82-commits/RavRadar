#!/usr/bin/env python3
"""Focused donor/retry regressions; synthetic data only, no provider calls."""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import runpy
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from lib.copernicus_current import canonical_sha256
from lib.open_meteo_current_fallback import (
    OpenMeteoCurrentFallbackError, build_document, build_record,
    merge_donor_bank, select_donor_records, validate_donor_bank,
    validate_checkpoint_document,
)

BASE = datetime(2026, 9, 9, tzinfo=timezone.utc)
CLI = runpy.run_path(str(Path(__file__).with_name("fill-open-meteo-current-fallback.py")))
TARGETS = [{"partId": "P1", "parentZoneId": "Z1", "name": "Synthetic part", "waterPoint": [10.0, 55.0]}]


def at(hours=0, minutes=0):
    return (BASE + timedelta(hours=hours, minutes=minutes)).isoformat().replace("+00:00", "Z")


def row(hour=4, speed=0.5, acquired=None, part_id="P1"):
    return build_record(part_id=part_id, valid_time=at(hour), acquired_at=acquired or at(minutes=10),
                        sampling_point=[10.0, 55.0], grid_point=[10.0, 55.0], speed_mps=speed,
                        toward_direction_deg=90, source_response_sha256=canonical_sha256({"fixture": speed}))


def document(records, reference=0, checkpoint=None, targets=None):
    pairs = sorted([{"partId": item["partId"], "validTime": item["validTime"]} for item in records], key=lambda pair: (pair["validTime"], pair["partId"]))
    return build_document(targets=TARGETS if targets is None else targets, required_pairs=pairs, records=records,
                          production_reference_at=at(reference), checkpointed_at=checkpoint or at(reference, 20),
                          copernicus_source_stage_status="READY", copernicus_source_stage_sha256=canonical_sha256({"stage": reference}),
                          copernicus_bounded_progress_accepted=False, regional_evidence_sha256=canonical_sha256({"regional": reference}))


def merge(bank=None, documents=None, reference=0, targets=None):
    return merge_donor_bank(bank, documents or [], targets=TARGETS if targets is None else targets,
                            production_reference_at=at(reference), checkpointed_at=at(reference, 30))


def select(bank, hours, reference=0):
    return select_donor_records(bank, targets=TARGETS,
                                required_pairs=[{"partId": "P1", "validTime": at(hour)} for hour in sorted(hours)],
                                production_reference_at=at(reference), checkpointed_at=at(reference, 40))


class DonorBankTests(unittest.TestCase):
    def test_three_cycle_gap_disappears_then_returns_without_refetch(self):
        original = [row(4), row(5)]
        legacy = document(original)
        immutable = copy.deepcopy(legacy)
        bank1, _ = merge(documents=[legacy])
        bank2, _ = merge(bank1, [document([], reference=1)], reference=1)
        bank3, _ = merge(bank2, reference=2)
        self.assertEqual(select(bank3, [4, 5], reference=2), original)
        self.assertEqual(legacy, immutable)
        self.assertEqual(bank3["entryCount"], 2)
        self.assertEqual(len(bank3["admissions"]), 1)
        self.assertEqual(bank3["historyAdmission"], "STORED_ONLY_NOT_AUTHORIZED")
        self.assertFalse(bank3["publicRuntime"])
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            validate_checkpoint_document(bank3, targets=TARGETS)

    def test_legacy_overlap_can_be_planned_before_current_cp_stage_exists(self):
        old = document([row(4), row(5)])
        bank, _ = merge(documents=[old], reference=3)
        self.assertEqual(len(select(bank, [3, 4, 5, 6], reference=3)), 2)
        self.assertEqual(next(iter(bank["admissions"].values()))["copernicusSourceStageSha256"], old["copernicusSourceStageSha256"])

    def test_projection_rebinding_does_not_duplicate_or_rejuvenate_admission(self):
        original = row(4)
        bank, _ = merge(documents=[document([original])])
        original_admission = copy.deepcopy(bank["admissions"])
        bank, _ = merge(bank, [document([original], reference=1)], reference=1)
        self.assertEqual(bank["admissions"], original_admission)
        self.assertEqual(select(bank, [4], reference=1), [original])

    def test_retention_is_48_hours_not_acquisition_expiry(self):
        bank, _ = merge(documents=[document([row(4)])])
        bank52, _ = merge(bank, reference=52)
        self.assertEqual(bank52["entryCount"], 1)
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            select(bank52, [4], reference=52)
        bank53, _ = merge(bank52, reference=53)
        self.assertEqual(bank53["entryCount"], 0)

    def test_newest_conflict_remains_unusable_across_empty_projection(self):
        first, second = row(4, 0.5), row(4, 0.6)
        bank, _ = merge(documents=[document([first]), document([second])])
        self.assertEqual(bank["entryCount"], 2)
        self.assertEqual(select(bank, [4]), [])
        next_bank, _ = merge(bank, [document([], reference=1)], reference=1)
        self.assertEqual(select(next_bank, [4], reference=1), [])
        newer = row(4, 0.7, acquired=at(1, 10))
        healed, _ = merge(next_bank, [document([newer], reference=1)], reference=1)
        self.assertEqual(select(healed, [4], reference=1), [newer])

    def test_leaf_corruption_is_local_and_cannot_resolve_a_known_conflict(self):
        bank, _ = merge(documents=[document([row(4), row(5)]), document([row(4, 0.6)])])
        damaged = copy.deepcopy(bank)
        damaged["entries"][0]["record"]["uMps"] = 999
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            validate_donor_bank(damaged, targets=TARGETS)
        repaired, stats = merge(damaged)
        self.assertTrue(stats["salvaged"])
        self.assertEqual(select(repaired, [4, 5]), [row(5)])
        direct_planning_bank, planning_stats = merge(damaged, [document([row(4)])])
        self.assertTrue(planning_stats["legacySuppressed"])
        self.assertEqual(select(direct_planning_bank, [4, 5]), [row(5)])

    def test_manifest_identifies_deleted_leaf_without_harming_the_other_pair(self):
        bank, _ = merge(documents=[document([row(4), row(5)])])
        damaged = copy.deepcopy(bank)
        damaged["entries"].pop()
        repaired, stats = merge(damaged)
        self.assertTrue(stats["salvaged"])
        self.assertEqual(select(repaired, [4, 5]), [row(4)])
        self.assertEqual([(item["partId"], item["validTime"]) for item in repaired["conflictMasks"]], [("P1", at(5))])

    def test_registry_and_admission_binding_remain_strict(self):
        bank, _ = merge(documents=[document([row(4)])])
        changed_targets = copy.deepcopy(TARGETS)
        changed_targets[0]["waterPoint"] = [10.01, 55.0]
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            merge_donor_bank(bank, [], targets=changed_targets,
                             production_reference_at=at(), checkpointed_at=at(minutes=40))
        damaged = copy.deepcopy(bank)
        admission = next(iter(damaged["admissions"].values()))
        admission["copernicusSourceStageSha256"] = canonical_sha256({"wrong": "proof"})
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            merge(damaged)

    def test_part_or_time_corruption_uses_original_membership_not_bad_payload(self):
        targets = [*TARGETS, {**TARGETS[0], "partId": "P2"}]
        other_part = row(4, part_id="P2")
        bank, _ = merge(documents=[
            document([row(4), row(5), other_part], targets=targets),
            document([row(4, 0.6)], targets=targets),
        ], targets=targets)
        for field, wrong in (("partId", "P2"), ("validTime", at(5))):
            with self.subTest(field=field):
                damaged = copy.deepcopy(bank)
                victim = next(item for item in damaged["entries"]
                              if item["record"]["partId"] == "P1" and item["record"]["validTime"] == at(4))
                victim["record"][field] = wrong
                with self.assertRaises(OpenMeteoCurrentFallbackError):
                    validate_donor_bank(damaged, targets=targets)
                repaired, _ = merge(damaged, targets=targets)
                validate_donor_bank(repaired, targets=targets)
                chosen = select_donor_records(
                    repaired, targets=targets,
                    required_pairs=[{"partId": "P1", "validTime": at(4)},
                                    {"partId": "P2", "validTime": at(4)},
                                    {"partId": "P1", "validTime": at(5)}],
                    production_reference_at=at(), checkpointed_at=at(minutes=40),
                )
                self.assertEqual({item["recordId"] for item in chosen}, {row(5)["recordId"], other_part["recordId"]})
                self.assertEqual({(item["partId"], item["validTime"]) for item in repaired["conflictMasks"]}, {("P1", at(4))})

    def test_missing_conflict_witness_plus_another_bad_leaf_remain_separate_holes(self):
        bank, _ = merge(documents=[document([row(4), row(5), row(6)]), document([row(4, 0.6)])])
        damaged = copy.deepcopy(bank)
        damaged["entries"].pop(0)
        next(item for item in damaged["entries"] if item["record"]["validTime"] == at(5))["record"]["uMps"] = 999
        repaired, stats = merge(damaged)
        self.assertEqual(stats["droppedRecordCount"], 2)
        self.assertEqual(select(repaired, [4, 5, 6]), [row(6)])
        self.assertEqual({item["validTime"] for item in repaired["conflictMasks"]}, {at(4), at(5)})

    def test_unknown_payload_identity_cannot_erase_original_pair_membership(self):
        bank, _ = merge(documents=[document([row(4), row(5)]), document([row(4, 0.6)])])
        damaged = copy.deepcopy(bank)
        damaged["entries"][0] = {"synthetic": "unidentifiable payload"}
        repaired, _ = merge(damaged)
        self.assertEqual(select(repaired, [4, 5]), [row(5)])
        # An extra unexplained payload with every original member intact has
        # no original identity to quarantine locally and rejects the envelope.
        unknown_extra = copy.deepcopy(bank)
        unknown_extra["entries"].append({"synthetic": "unbound extra"})
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            merge(unknown_extra)

    def test_masks_survive_serialization_rebase_and_later_legacy_import(self):
        bank, _ = merge(documents=[document([row(4), row(5)]), document([row(4, 0.6)])])
        bank["entries"].pop(0)
        bank, _ = merge(bank)
        original_mask = copy.deepcopy(bank["conflictMasks"])
        for reference in (1, 2, 3):
            bank = json.loads(json.dumps(bank))
            bank, _ = merge(bank, [document([row(4)], reference=reference)], reference=reference)
            validate_donor_bank(bank, targets=TARGETS)
            self.assertEqual(select(bank, [4, 5], reference=reference), [row(5)])
            self.assertEqual(bank["conflictMasks"][0]["acquiredAt"], original_mask[0]["acquiredAt"])

    def test_only_strictly_newer_valid_unambiguous_acquisition_clears_mask(self):
        bank, _ = merge(documents=[document([row(4)]), document([row(4, 0.6)])])
        bank["entries"].pop(0)
        bank, _ = merge(bank)
        for candidate in (row(4, 0.7, at(minutes=5)), row(4, 0.7)):
            bank, _ = merge(bank, [document([candidate])])
            self.assertEqual(select(bank, [4]), [])
        # A later acquisition which is itself ambiguous moves the barrier;
        # it does not release the source merely because its timestamp is newer.
        bank, _ = merge(bank, [document([row(4, 0.8, at(1, 10))], reference=1),
                              document([row(4, 0.9, at(1, 10))], reference=1)], reference=1)
        self.assertEqual(select(bank, [4], reference=1), [])
        self.assertEqual(bank["conflictMasks"][0]["acquiredAt"], at(1, 10))
        invalid = document([row(4, 1.0, at(2, 10))], reference=2)
        invalid["records"][0]["uMps"] = 999
        before = copy.deepcopy(bank)
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            merge(bank, [invalid], reference=2)
        self.assertEqual(bank, before)
        newer = row(4, 1.0, at(2, 10))
        bank, _ = merge(bank, [document([newer], reference=2)], reference=2)
        self.assertEqual(select(bank, [4], reference=2), [newer])
        self.assertEqual(bank["conflictMasks"], [])

    def test_manifest_control_or_proof_damage_is_not_healed_by_another_bad_leaf(self):
        bank, _ = merge(documents=[document([row(4), row(5)]), document([row(4, 0.6)])])
        for field in ("entryManifest", "conflictMasks", "admissions", "controlSha256", "manifestSha256"):
            with self.subTest(field=field):
                damaged = copy.deepcopy(bank)
                damaged["entries"][0]["record"]["uMps"] = 999
                if field in {"entryManifest", "conflictMasks"}:
                    damaged[field][0]["validTime"] = at(5)
                elif field == "admissions":
                    next(iter(damaged[field].values()))["regionalEvidenceSha256"] = "0" * 64
                else:
                    damaged[field] = "0" * 64
                with self.assertRaises(OpenMeteoCurrentFallbackError):
                    merge(damaged)

    def test_mask_retention_and_top_two_variant_limit_are_bounded(self):
        bank, _ = merge(documents=[document([row(4, speed)]) for speed in (0.5, 0.6, 0.7)])
        self.assertEqual(bank["entryCount"], 2)
        self.assertEqual(len(bank["conflictMasks"]), 1)
        bank["entries"] = []
        bank, _ = merge(bank)
        self.assertEqual(bank["entryCount"], 0)
        self.assertEqual(len(bank["conflictMasks"]), 1)
        retained, _ = merge(bank, reference=52)
        self.assertEqual(len(retained["conflictMasks"]), 1)
        expired, _ = merge(retained, reference=53)
        self.assertEqual(expired["conflictMasks"], [])
        self.assertEqual(expired["admissions"], {})

    def test_unmanifested_legacy_damage_requires_original_strict_seal(self):
        legacy = document([row(4), row(5)])
        legacy["records"][0]["uMps"] = 999
        before = copy.deepcopy(legacy)
        with self.assertRaises(OpenMeteoCurrentFallbackError):
            merge(documents=[legacy])
        self.assertEqual(legacy, before)

    def test_verified_atomic_write_retains_existing_bank_if_validation_fails(self):
        bank, _ = merge(documents=[document([row(4)])])
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "bank.json"
            CLI["atomic_write"](path, bank, validator=lambda value: validate_donor_bank(value, targets=TARGETS))
            before = path.read_bytes()
            with self.assertRaises(RuntimeError):
                CLI["atomic_write"](path, bank, validator=lambda _value: (_ for _ in ()).throw(RuntimeError("synthetic validation failure")))
            self.assertEqual(path.read_bytes(), before)


def response(target, hours, null=False, far=False):
    return {"latitude": target["waterPoint"][1], "longitude": target["waterPoint"][0] + (1 if far else 0),
            "timezone": "GMT", "utc_offset_seconds": 0,
            "hourly_units": {"ocean_current_velocity": "m/s", "ocean_current_direction": "°"},
            "hourly": {"time": [at(hour).removesuffix("Z") for hour in hours],
                       "ocean_current_velocity": [None if null else 0.5 for _ in hours],
                       "ocean_current_direction": [None if null else 90 for _ in hours]}}


class FailureAwareRetryTests(unittest.TestCase):
    def fetch(self, required, targets, request, **overrides):
        diagnostics = {}
        with patch.dict(CLI["fetch_records"].__globals__, {"request_json": request, **overrides}):
            result = CLI["fetch_records"](required, {target["partId"]: target for target in targets},
                                         at(minutes=10), 30, 240, diagnostics=diagnostics)
        return result, diagnostics

    def test_nulls_get_one_isolated_probe_without_time_split_explosion(self):
        targets = [{**TARGETS[0], "partId": f"P{index}", "waterPoint": [10 + index / 100, 55.0]} for index in range(3)]
        required = [{"partId": target["partId"], "validTime": at(hour)} for target in targets for hour in range(8)]
        calls = []
        by_lon = {target["waterPoint"][0]: target for target in targets}

        def request(url, timeout, _deadline):
            query = parse_qs(urlparse(url).query)
            batch = [by_lon[float(value)] for value in query["longitude"][0].split(",")]
            calls.append((len(batch), timeout))
            payloads = [response(target, range(8), null=True) for target in batch]
            return payloads[0] if len(payloads) == 1 else payloads

        rows, stats = self.fetch(required, targets, request)
        self.assertEqual(rows, [])
        self.assertEqual(len(calls), 4)
        self.assertEqual(stats["adaptiveSplitCount"], 0)
        self.assertEqual(stats["providerNegativePairCount"], 24)
        self.assertEqual(stats["negativeRetrySuppressedPairCount"], 24)
        self.assertEqual(stats["pairNullSpeedCount"], 48)
        self.assertEqual(stats["unresolvedPairCount"], 24)
        self.assertTrue(all(timeout == 30 for _size, timeout in calls))

    def test_null_transient_can_succeed_and_a_new_invocation_is_not_blacklisted(self):
        required = [{"partId": "P1", "validTime": at(0)}]
        calls = []

        def request(*_args):
            calls.append(1)
            return response(TARGETS[0], [0], null=len(calls) == 1)

        rows, stats = self.fetch(required, TARGETS, request)
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(calls), 2)
        self.assertEqual(stats["negativeRetrySuppressedPairCount"], 0)
        rows2, _ = self.fetch(required, TARGETS, lambda *_args: response(TARGETS[0], [0]))
        self.assertEqual(len(rows2), 1)

    def test_far_grid_is_not_retried_by_hour_or_accepted(self):
        required = [{"partId": "P1", "validTime": at(hour)} for hour in range(8)]
        rows, stats = self.fetch(required, TARGETS, lambda *_args: response(TARGETS[0], range(8), far=True))
        self.assertEqual(rows, [])
        self.assertEqual(stats["batchAttemptCount"], 2)
        self.assertEqual(stats["adaptiveSplitCount"], 0)
        self.assertEqual(stats["negativeRetrySuppressedPairCount"], 8)

    def test_large_queue_does_not_reduce_request_timeout_to_one_second(self):
        targets = [{**TARGETS[0], "partId": f"P{index:03d}"} for index in range(200)]
        required = [{"partId": target["partId"], "validTime": at(0)} for target in targets]
        timeouts = []

        def request(_url, timeout, _deadline):
            timeouts.append(timeout)
            return response(targets[0], [0])

        rows, stats = self.fetch(required, targets, request, BATCH_SIZE=1, MAX_TOTAL_REQUEST_ATTEMPTS=1)
        self.assertEqual(len(rows), 1)
        self.assertEqual(timeouts, [30])
        self.assertTrue(stats["attemptBudgetReached"])

    def test_response_evidence_has_only_hash_and_shape_no_provider_values(self):
        payload = response(TARGETS[0], [0], null=True)
        evidence = CLI["safe_response_evidence"](payload, 1)
        text = json.dumps(evidence)
        self.assertEqual(evidence["responseSha256"], canonical_sha256(payload))
        self.assertEqual(evidence["nullSpeedCount"], 1)
        for forbidden in ("longitude", "latitude", "waterPoint", "uMps", "vMps", "P1", "https:"):
            self.assertNotIn(forbidden, text)


class BankCheckpointLifecycleTests(unittest.TestCase):
    def exercise(self, *, bank=None, fetched=None, fail_write=None, fail_fetch=False):
        args = SimpleNamespace(
            targets=Path("targets.json"), dmi=Path("dmi.json"), registry=Path("registry.json"),
            copernicus=Path("cp.json"), source_stage=Path("stage.json"), regional=Path("regional.json"),
            policy=Path("policy.json"), output=Path("projection.json"), report=Path("safe.json"),
            donor_bank=Path("bank.json"), fetch_report=Path("fetch-safe.json"),
            reuse_only=False, critical_only=True, at=at(), timeout_seconds=30, runtime_seconds=60,
        )
        writes, outputs = {}, []

        def write(path, value, *, validator=None):
            if path.name == fail_write:
                raise RuntimeError("synthetic write failure: " + path.name)
            if validator is not None:
                validator(value)
            writes[path.name] = copy.deepcopy(value)

        def fetch(_pairs, _targets, _at, _timeout, _runtime, *, checkpoint, diagnostics,
                  deadline_monotonic, preserve_input_order=False):
            if fail_fetch:
                raise RuntimeError("synthetic fetch failure")
            rows = copy.deepcopy(fetched or [])
            diagnostics.update(CLI["initial_fetch_diagnostics"](1))
            checkpoint(rows, diagnostics)
            return rows

        def read(path):
            if path == args.donor_bank and bank is not None:
                return copy.deepcopy(bank), "present"
            return None, "absent"

        result, error = None, None
        with patch.dict(CLI["main"].__globals__, {
            "arguments": lambda: args, "load_targets": lambda _path: copy.deepcopy(TARGETS),
            "read_dmi_bulk_document": lambda _path: {}, "read_object": lambda _path: {},
            "load_regional_shadow": lambda _path: {},
            "residual_plan": lambda **_kwargs: {
                "requiredPairs": [{"partId": "P1", "validTime": at(4)}],
                "sourceStageStatus": "READY", "sourceStageSha256": canonical_sha256({"stage": 0}),
                "boundedProgressAccepted": False, "regionalEvidenceSha256": canonical_sha256({"regional": 0}),
                "regionalDiagnostics": {},
            },
            "canonical_now": lambda: at(minutes=30), "read_optional_progress": read,
            "fetch_records": fetch, "atomic_write": write,
            "export_github_outputs": lambda value: outputs.append(copy.deepcopy(value)),
            "print": lambda *_args, **_kwargs: None,
        }):
            try:
                result = CLI["main"]()
            except Exception as caught:
                error = caught
        return result, error, writes, outputs

    def test_projection_is_reselected_from_masked_bank_after_new_records(self):
        bank, _ = merge(documents=[document([row(4)]), document([row(4, 0.6)])])
        bank["entries"].pop(0)
        bank, _ = merge(bank)
        result, error, writes, outputs = self.exercise(bank=bank, fetched=[row(4)])
        self.assertIsNone(error)
        self.assertEqual(result, 1)
        self.assertEqual(writes["projection.json"]["recordCount"], 0)
        self.assertEqual(writes["projection.json"]["missingPairCount"], 1)
        self.assertEqual(len(writes["bank.json"]["conflictMasks"]), 1)
        self.assertEqual(outputs[-1]["critical_missing_pair_count"], 1)

    def test_bank_commit_exports_success_before_projection_failure(self):
        _, error, writes, outputs = self.exercise(fail_write="projection.json")
        self.assertEqual(str(error), "synthetic write failure: projection.json")
        self.assertIn("bank.json", writes)
        self.assertEqual(outputs, [{"donor_bank_written": True}])

    def test_initial_bank_and_projection_flags_survive_fetch_failure(self):
        _, error, writes, outputs = self.exercise(fail_fetch=True)
        self.assertEqual(str(error), "synthetic fetch failure")
        self.assertIn("bank.json", writes)
        self.assertIn("projection.json", writes)
        self.assertEqual(outputs, [{"donor_bank_written": True}, {"checkpoint_written": True}])

    def test_failed_bank_write_never_exports_intended_success(self):
        _, error, writes, outputs = self.exercise(fail_write="bank.json")
        self.assertEqual(str(error), "synthetic write failure: bank.json")
        self.assertNotIn("bank.json", writes)
        self.assertEqual(outputs, [])

    def test_safe_report_failure_does_not_hide_completed_strict_projection(self):
        _, error, writes, outputs = self.exercise(fail_write="safe.json")
        self.assertEqual(str(error), "synthetic write failure: safe.json")
        self.assertIn("projection.json", writes)
        self.assertEqual(outputs, [{"donor_bank_written": True}, {"checkpoint_written": True}])


class OptionalBankRecoveryTests(unittest.TestCase):
    def test_valid_bank_is_authoritative_over_old_startup_projection(self):
        bank, _ = merge(documents=[document([row(4, 0.6)])])
        reads = []
        bank_path, projection_path = Path("bank.json"), Path("projection.json")

        def read(path):
            reads.append(path)
            if path == bank_path:
                return copy.deepcopy(bank), "present"
            raise AssertionError("A valid bank must not re-import the old projection")

        with patch.dict(CLI["prepare_donor_bank"].__globals__, {"read_optional_progress": read}):
            restored, _stats, status, recovery = CLI["prepare_donor_bank"](
                bank_path, projection_path, targets=TARGETS, reference=at(), checkpointed_at=at(minutes=30))
        self.assertEqual(reads, [bank_path])
        self.assertEqual(status, "valid")
        self.assertTrue(recovery["legacySuppressed"])
        self.assertEqual(select(restored, [4]), [row(4, 0.6)])

    def test_rejected_header_preserves_original_bytes_and_does_not_import_legacy(self):
        bank, _ = merge(documents=[document([row(4)])])
        bank["contractId"] = "synthetic-invalid-bank-contract"
        with tempfile.TemporaryDirectory() as temporary:
            bank_path = Path(temporary) / "bank.json"
            projection_path = Path(temporary) / "projection.json"
            CLI["atomic_write"](bank_path, bank)
            CLI["atomic_write"](projection_path, document([row(4)]))
            original = bank_path.read_bytes()
            legacy_original = projection_path.read_bytes()
            recovered, _stats, status, recovery = CLI["prepare_donor_bank"](
                bank_path, projection_path, targets=TARGETS, reference=at(), checkpointed_at=at(minutes=30))
            self.assertEqual(recovered["entryCount"], 0)
            self.assertEqual(status, "recovered")
            self.assertTrue(recovery["legacySuppressed"])
            self.assertTrue(recovery["bankWriteEnabled"])
            self.assertTrue(recovery["projectionWriteEnabled"])
            self.assertEqual(bank_path.with_name("bank.json.rejected").read_bytes(), original)
            self.assertEqual(projection_path.with_name("projection.json.rejected").read_bytes(), legacy_original)
            self.assertEqual(bank_path.read_bytes(), original)
            # Fresh, independently valid data can replace the active bank only
            # after the rejected bytes have been preserved; no legacy reuse.
            fresh = row(4, 0.7, acquired=at(minutes=25))
            fresh_bank, _ = merge(recovered, [document([fresh], checkpoint=at(minutes=26))])
            CLI["atomic_write"](bank_path, fresh_bank,
                                validator=lambda value: validate_donor_bank(value, targets=TARGETS))
            self.assertEqual(select(fresh_bank, [4]), [fresh])
            self.assertEqual(bank_path.with_name("bank.json.rejected").read_bytes(), original)

    def test_local_leaf_salvage_cannot_revive_the_pair_from_legacy(self):
        bank, _ = merge(documents=[document([row(4), row(5)]), document([row(4, 0.6)])])
        bank["entries"][0]["record"]["uMps"] = 999
        bank_path, legacy_path = Path("bank.json"), Path("projection.json")
        with patch.dict(CLI["prepare_donor_bank"].__globals__, {
            "read_optional_progress": lambda path: (copy.deepcopy(bank) if path == bank_path else document([row(4)]), "present"),
            "preserve_rejected_snapshot": lambda _path: True,
        }):
            recovered, _stats, status, recovery = CLI["prepare_donor_bank"](
                bank_path, legacy_path, targets=TARGETS, reference=at(), checkpointed_at=at(minutes=30))
        self.assertEqual(status, "salvaged")
        self.assertTrue(recovery["legacySuppressed"])
        self.assertEqual(select(recovered, [4, 5]), [row(5)])

    def test_two_quarantine_generations_never_evict_different_original_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "bank.json"
            originals = []
            for index in range(3):
                CLI["atomic_write"](path, {"syntheticRejectedGeneration": index})
                originals.append(path.read_bytes())
                self.assertEqual(CLI["preserve_rejected_snapshot"](path), index < 2)
            self.assertEqual(path.with_name("bank.json.rejected").read_bytes(), originals[0])
            self.assertEqual(path.with_name("bank.json.rejected.previous").read_bytes(), originals[1])
            self.assertEqual(path.read_bytes(), originals[2])

    def test_failed_preservation_disables_only_the_affected_original_replacement(self):
        bank_path, legacy_path = Path("bank.json"), Path("projection.json")
        with patch.dict(CLI["prepare_donor_bank"].__globals__, {
            "read_optional_progress": lambda _path: ({"syntheticInvalidBank": True}, "present"),
            "preserve_rejected_snapshot": lambda path: path != bank_path,
        }):
            recovered, _stats, _status, recovery = CLI["prepare_donor_bank"](
                bank_path, legacy_path, targets=TARGETS, reference=at(), checkpointed_at=at(minutes=30))
        self.assertEqual(recovered["entryCount"], 0)
        self.assertFalse(recovery["bankWriteEnabled"])
        self.assertTrue(recovery["projectionWriteEnabled"])
        self.assertFalse(recovery["quarantinePreserved"])


if __name__ == "__main__":
    unittest.main()
