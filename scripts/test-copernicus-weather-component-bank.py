"""Local synthetic file -> producer -> bank -> admission -> resume contracts."""
from __future__ import annotations

import copy
import json
import runpy
import tempfile
import unittest
from pathlib import Path

import numpy as np

from lib.copernicus_current import canonical_sha256
from lib.copernicus_weather_component_bank import (
    _request, build_component_plan, empty_component_bank, merge_component_read,
    produce_component_bank, project_component_candidates, save_component_bank,
    validate_component_bank, validate_component_plan, rebase_component_bank,
)
from lib.copernicus_weather_components import read_component_subset


FIXTURE = runpy.run_path(str(Path(__file__).with_name("test-copernicus-weather-components.py")))["fixture"]
TARGET = {"partId": "SYNTHETIC-PART", "parentZoneId": "SYNTHETIC-ZONE", "waterPoint": [2.0, 1.0]}
T0, T1, T2 = [f"2026-09-19T0{h}:00:00Z" for h in range(3)]
POLICY = {"policyId": "synthetic-test-only", "policySha256": "sha256:" + "a" * 64}


def plan(needs, *, reference=T0, routes=None):
    return build_component_plan(targets=[TARGET], production_reference_at=reference,
        needs=[{"partId": TARGET["partId"], "purpose": "GAP", **n} for n in needs],
        product_routes={TARGET["partId"]: routes or {"wave": ["nws-wave"],
            "waterTemperature": ["nws-temperature"], "waterLevel": ["nws-level"]}}, routing_policy=POLICY,
        retention_start_at="2026-09-01T00:00:00Z", retention_end_at="2026-10-01T00:00:00Z")


def spatial_certificate(entry, request, target):
    """Synthetic trusted verifier; never a production geographic policy."""
    assert target == TARGET
    return {"recordId": entry["recordId"], "targetRegistrySha256": request["targetRegistrySha256"],
            "policyId": POLICY["policyId"], "policySha256": POLICY["policySha256"],
            "evidenceSha256": "sha256:" + "b" * 64}


class ComponentBankTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="rr-cp-component-bank-")
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.paths, self.calls, self.checkpoints = {}, [], []

    def write(self, key, dataset=None):
        path = self.folder / (key + ".nc")
        (dataset if dataset is not None else FIXTURE(key)).to_netcdf(path, engine="h5netcdf")
        self.paths[key] = path
        return path

    def acquire(self, request):
        self.calls.append(request)
        self.assertTrue(request["raiseIfUpdating"])
        self.assertEqual(request["target"], TARGET)
        value = self.paths[request["contractKey"]]
        if isinstance(value, Exception):
            raise value
        return value

    def run_plan(self, document, bank=None, **kwargs):
        return produce_component_bank(document, bank or empty_component_bank([TARGET]),
            acquire_subset=self.acquire, acquisition_at=lambda: "2026-09-19T03:00:00Z",
            checkpoint=lambda b, a: self.checkpoints.append((b, a)), **kwargs)

    def test_file_to_admitted_part_projections_preserves_unknown_age(self):
        self.write("nws-wave", FIXTURE("nws-wave", reference=False))
        document = plan([{"component": "wave", "validTime": t} for t in [T0, T1]])
        result = self.run_plan(document, admit_spatial=spatial_certificate)
        self.assertEqual(result["stage"]["status"], "CANDIDATES_READY")
        self.assertFalse(result["stage"]["provesUpstreamAbsence"])
        row = result["stage"]["candidates"][0]
        self.assertEqual(row["source"]["entityId"], "PART::SYNTHETIC-PART")
        self.assertEqual(row["source"]["samplingPoint"], TARGET["waterPoint"])
        self.assertIsNone(row["source"]["modelRun"])
        self.assertIsNone(row["source"]["modelReference"])
        self.assertEqual(row["source"]["status"], "qualified-native")

    def test_no_spatial_authority_does_not_promote_parser_output(self):
        self.write("nws-wave")
        document = plan([{"component": "wave", "validTime": T0}])
        result = self.run_plan(document)
        self.assertEqual(len(result["bank"]["records"]), 1)
        self.assertEqual(result["stage"]["status"], "IN_PROGRESS")
        self.assertEqual(result["stage"]["candidates"], [])
        self.assertEqual(len(result["stage"]["remainingNeeds"]), 1)

    def test_missing_sibling_and_failed_component_resume_only_unfinished_work(self):
        dataset = FIXTURE("nws-wave")
        dataset["VTPK"].values[1] = np.nan
        self.write("nws-wave", dataset)
        self.paths["nws-temperature"] = OSError("private transport detail")
        document = plan([*({"component": "wave", "validTime": t} for t in [T0, T1, T2]),
                         {"component": "waterTemperature", "validTime": T0}])
        first = self.run_plan(document, admit_spatial=spatial_certificate)
        self.assertEqual(len(first["bank"]["records"]), 2)
        self.assertEqual(len(first["stage"]["remainingNeeds"]), 2)
        self.assertNotIn("private transport detail", json.dumps(first["attempts"]))
        retained = {r["recordId"] for r in first["bank"]["records"]}
        self.write("nws-wave")
        self.write("nws-temperature")
        self.calls.clear()
        second = self.run_plan(document, first["bank"], admit_spatial=spatial_certificate)
        by_component = {r["component"]: r["expectedTimes"] for r in self.calls}
        self.assertEqual(by_component, {"wave": [T1], "waterTemperature": [T0]})
        self.assertTrue(retained <= {r["recordId"] for r in second["bank"]["records"]})
        self.assertEqual(second["stage"]["status"], "CANDIDATES_READY")

    def test_level_is_dmi_only_and_legacy_bank_cannot_reenter_projection(self):
        when, support = "2026-09-23T21:00:00Z", "2026-09-24T00:00:00Z"
        document = plan([{"component": "waterLevel", "validTime": when}])
        self.assertEqual(document["needs"], [])
        self.assertEqual(document["privateSupportNeeds"], [])
        self.assertEqual(document["productRoutes"], {})
        dataset = FIXTURE("nws-level")
        dataset = dataset.assign_coords(time=np.array([when[:-1], support[:-1], "2026-09-24T01:00:00"], dtype="datetime64[ns]"))
        dataset["forecast_period"].values[:] = [117, 120, 121]
        path = self.write("nws-level", dataset)
        result = self.run_plan(document, admit_spatial=spatial_certificate)
        self.assertEqual(self.calls, [])
        self.assertEqual(result["stage"]["remainingNeeds"], [])
        # Reconstruct a pre-policy stored record, not a production acquisition.
        request = _request(document, TARGET["partId"], "nws-level", [when, support])
        read = read_component_subset(path, contract_key="nws-level", target=TARGET, expected_times=[when, support])
        legacy = merge_component_read(result["bank"], plan=document, request=request, read=read,
                                      acquisition_at="2026-09-19T03:00:00Z")
        self.assertEqual(len(legacy["records"]), 2)
        stage = project_component_candidates(document, legacy, admit_spatial=spatial_certificate,
                                             include_retained_bank=True)
        self.assertEqual(stage["candidates"], [])
        self.assertEqual(stage["privateSupportCandidates"], [])
        self.assertEqual(stage["remainingNeeds"], [])

    def test_unknown_or_old_age_cannot_satisfy_aged_dmi_challenge(self):
        self.write("nws-wave", FIXTURE("nws-wave", reference=False))
        document = plan([{"component": "wave", "validTime": T0,
                          "purpose": "AGED_DMI_CHALLENGE", "protectedModelRun": "2026-09-15T00:00:00Z"}])
        first = self.run_plan(document, admit_spatial=spatial_certificate)
        self.assertFalse(first["stage"]["candidates"][0]["eligibleForRequestedPurpose"])
        self.assertEqual(first["stage"]["status"], "IN_PROGRESS")
        self.calls.clear()
        self.write("nws-wave")
        second = self.run_plan(document, first["bank"], admit_spatial=spatial_certificate)
        self.assertEqual(len(self.calls), 1)  # Unknown age must not make the challenge disappear.
        self.assertEqual(second["stage"]["status"], "CANDIDATES_READY")
        self.assertEqual(len(second["bank"]["records"]), 2)
        self.assertIn(first["bank"]["records"][0], second["bank"]["records"])
        with self.assertRaisesRegex(ValueError, "PREMATURE"):
            plan([{"component": "wave", "validTime": T0, "purpose": "AGED_DMI_CHALLENGE",
                   "protectedModelRun": "2026-09-15T01:00:00Z"}])

    def test_native_tail_and_old_hour_survive_window_shift(self):
        self.write("nws-wave")
        initial = plan([{"component": "wave", "validTime": t} for t in [T0, T2]])
        first = self.run_plan(initial)
        shifted = plan([{"component": "wave", "validTime": T1}], reference=T1)
        second = self.run_plan(shifted, first["bank"])
        self.assertEqual({e["native"]["validTime"] for e in second["bank"]["records"]}, {T0, T1, T2})
        self.assertEqual(self.calls[-1]["expectedTimes"], [T1])

    def test_unknown_new_download_and_partial_read_cannot_replace_existing(self):
        path = self.write("nws-wave")
        document = plan([{"component": "wave", "validTime": t} for t in [T0, T1]])
        initial = self.run_plan(document)
        dataset = FIXTURE("nws-wave", reference=False)
        dataset["VHM0"].values[:] = 2
        dataset["VTPK"].values[1] = np.nan
        self.write("nws-wave", dataset)
        request = _request(document, TARGET["partId"], "nws-wave", [T0, T1])
        read = read_component_subset(path, contract_key="nws-wave", target=TARGET, expected_times=[T0, T1])
        merged = merge_component_read(initial["bank"], plan=document, request=request, read=read,
                                      acquisition_at="2026-09-19T04:00:00Z")
        self.assertTrue(all(row in merged["records"] for row in initial["bank"]["records"]))
        self.assertEqual(len(merged["records"]), 3)  # Unknown alternative is not allowed to erase either known sibling.

    def test_source_errors_do_not_mark_complete_or_block_siblings(self):
        self.paths["nws-wave"] = RuntimeError("upstream still updating")
        self.write("nws-temperature")
        document = plan([{"component": "wave", "validTime": T0},
                         {"component": "waterTemperature", "validTime": T0},
                         {"component": "wind", "validTime": T0}])
        result = self.run_plan(document, admit_spatial=spatial_certificate)
        self.assertEqual(len(result["bank"]["records"]), 1)
        self.assertEqual({a["status"] for a in result["attempts"]}, {"RETRYABLE_ERROR", "PARSED"})
        self.assertEqual(len(result["stage"]["remainingNeeds"]), 2)
        self.assertFalse(result["stage"]["provesUpstreamAbsence"])

    def test_soft_stop_keeps_prior_checkpoint_and_unattempted_needs(self):
        self.write("nws-wave")
        self.write("nws-temperature")
        document = plan([{"component": "wave", "validTime": T0},
                         {"component": "waterTemperature", "validTime": T0}])
        allowed = iter([True, False])
        result = self.run_plan(document, admit_spatial=spatial_certificate, should_continue=lambda: next(allowed))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len(result["bank"]["records"]), 1)
        self.assertEqual(len(result["stage"]["remainingNeeds"]), 1)

    def test_tamper_wrong_target_and_false_admission_rejected(self):
        self.write("nws-wave")
        document = plan([{"component": "wave", "validTime": T0}])
        result = self.run_plan(document)
        bad = copy.deepcopy(result["bank"])
        bad["records"][0]["native"]["values"]["wavePeriodS"] = 90
        with self.assertRaises(ValueError):
            validate_component_bank(bad, targets=[TARGET])
        with self.assertRaises(ValueError):
            validate_component_bank(result["bank"], targets=[{**TARGET, "waterPoint": [2.01, 1.0]}])
        with self.assertRaisesRegex(ValueError, "CERTIFICATE_INVALID"):
            project_component_candidates(document, result["bank"], admit_spatial=lambda *args: {"status": "verified"})
        bad_plan = copy.deepcopy(document)
        bad_plan["needs"][0]["component"] = "wind"
        with self.assertRaises(ValueError):
            validate_component_plan(bad_plan)

    def test_atomic_persistence_and_persistence_error_are_not_hidden(self):
        self.write("nws-wave")
        document = plan([{"component": "wave", "validTime": T0}])
        first = self.run_plan(document)
        path = self.folder / "private-bank.json"
        save_component_bank(path, first["bank"], targets=[TARGET])
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), first["bank"])
        original = path.read_bytes()
        bad = copy.deepcopy(first["bank"])
        bad["records"][0]["native"]["values"]["wavePeriodS"] = None
        with self.assertRaises(ValueError):
            save_component_bank(path, bad, targets=[TARGET])
        self.assertEqual(path.read_bytes(), original)
        def failed_checkpoint(*_):
            raise OSError("synthetic disk failure")
        with self.assertRaisesRegex(OSError, "disk failure"):
            produce_component_bank(document, empty_component_bank([TARGET]), acquire_subset=self.acquire,
                acquisition_at=lambda: T2, checkpoint=failed_checkpoint)

    def test_js_utc_spelling_normalises_before_plan_hashing(self):
        ordinary = plan([{"component": "wave", "validTime": T0}])
        js = plan([{"component": "wave", "validTime": T0.replace("Z", ".000Z")}],
                  reference=T0.replace("Z", ".000Z"))
        self.assertEqual(js, ordinary)
        for invalid in [T0.replace("Z", ".001Z"), T0.replace("Z", "+00:00"), T0.replace("00:00Z", "01:00Z")]:
            with self.assertRaises(ValueError):
                plan([{"component": "wave", "validTime": invalid}])

    def test_explicit_retention_can_keep_history_beyond_168_hours(self):
        self.write("nws-wave")
        old = plan([{"component": "wave", "validTime": T0}])
        bank = self.run_plan(old)["bank"]
        later = plan([], reference="2026-09-29T00:00:00Z")
        kept = self.run_plan(later, bank)["bank"]
        self.assertEqual(kept["records"], bank["records"])
        trimmed = rebase_component_bank(kept, previous_targets=[TARGET], targets=[TARGET],
            retention_start_at=T1, retention_end_at="2026-10-01T00:00:00Z")
        self.assertEqual(trimmed["bank"]["records"], [])
        self.assertEqual(trimmed["excluded"][0]["reason"], "CP_OUTSIDE_CALLER_RETENTION_WINDOW")

    def test_changed_part_does_not_invalidate_unchanged_sibling_or_original_hashes(self):
        second = {**TARGET, "partId": "SECOND-SYNTHETIC-PART"}
        old_targets = [TARGET, second]
        route = {t["partId"]: {"wave": ["nws-wave"]} for t in old_targets}
        need = [{"partId": t["partId"], "component": "wave", "validTime": T0, "purpose": "GAP"} for t in old_targets]
        old_plan = build_component_plan(targets=old_targets, production_reference_at=T0,
            needs=need, product_routes=route, routing_policy=POLICY,
            retention_start_at=T0, retention_end_at=T2)
        path = self.write("nws-wave")
        old = produce_component_bank(old_plan, empty_component_bank(old_targets), acquire_subset=lambda _: path,
            acquisition_at=lambda: T2, checkpoint=lambda *_: None)["bank"]
        survivor = next(e for e in old["records"] if e["native"]["partId"] == TARGET["partId"])
        new_targets = [TARGET, {**second, "waterPoint": [2.001, 1.0]}]
        rebased = rebase_component_bank(old, previous_targets=old_targets, targets=new_targets,
            retention_start_at=T0, retention_end_at=T2)
        self.assertEqual(rebased["bank"]["records"], [survivor])
        self.assertEqual(len(rebased["excluded"]), 1)
        self.assertEqual(rebased["excluded"][0]["reason"], "CP_CENTRAL_TARGET_CHANGED_OR_REMOVED")
        self.assertEqual(rebased["bank"]["requests"][0]["targetRegistrySha256"], old["targetRegistrySha256"])
        validate_component_bank(rebased["bank"], targets=new_targets)
        new_plan = build_component_plan(targets=new_targets, production_reference_at=T0,
            needs=need, product_routes=route, routing_policy=POLICY,
            retention_start_at=T0, retention_end_at=T2)
        def new_authority(entry, request, target):
            return {**spatial_certificate(entry, request, target), "targetRegistrySha256": new_plan["targetRegistrySha256"]}
        stage = project_component_candidates(new_plan, rebased["bank"], admit_spatial=new_authority)
        self.assertEqual(stage["candidates"][0]["source"]["recordId"], survivor["recordId"])
        self.assertEqual(stage["candidates"][0]["source"]["requestTargetRegistrySha256"], old["targetRegistrySha256"])
        self.assertEqual(stage["candidates"][0]["source"]["targetRegistrySha256"], new_plan["targetRegistrySha256"])
        self.assertEqual(stage["remainingNeeds"][0]["partId"], second["partId"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
