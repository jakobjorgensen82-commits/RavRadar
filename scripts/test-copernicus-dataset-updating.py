"""Bounded offline DatasetUpdating retries and the real partial-stage handoff."""
from __future__ import annotations

import contextlib
import io
import json
import os
import runpy
import sys
import tempfile
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
import xarray as xr

from lib.copernicus_current import DMI_VERIFIER_CONTRACT_ID, OPERATIONAL_MATRIX_CONTRACT_ID, file_sha256, required_pairs_sha256
from lib.copernicus_current_source_stage import validate_reusable_source_stage
from lib.copernicus_target_identity import target_fingerprint


ROOT = Path(__file__).resolve().parents[1]
PILOT = runpy.run_path(str(ROOT / "scripts/run-copernicus-current-pilot.py"))
PILOT_GLOBALS = PILOT["main"].__globals__
OM = runpy.run_path(str(ROOT / "scripts/fill-open-meteo-current-fallback.py"))
REFERENCE = datetime(2026, 9, 19, 0, tzinfo=timezone.utc)
FUTURE = REFERENCE + timedelta(hours=117)
TARGET = {"partId": "synthetic", "parentZoneId": "zone", "name": "Synthetic", "waterPoint": [10.0, 56.0]}
PRODUCT = PILOT["PRODUCTS"][0]


class DatasetUpdating(Exception):
    pass


def iso(value):
    return value.isoformat().replace("+00:00", "Z")


def registry(dmi_sha):
    pairs = [{"partId": TARGET["partId"], "validTime": iso(value)} for value in (REFERENCE, FUTURE)]
    return {
        "schemaVersion": 3, "kind": "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_RANGE_TARGET_REGISTRY",
        "matrixContractId": OPERATIONAL_MATRIX_CONTRACT_ID, "selectionMode": "dmi-gaps-only",
        "productionReferenceAt": iso(REFERENCE), "targetHour": iso(REFERENCE),
        "rangeStartAt": iso(REFERENCE - timedelta(hours=48)), "rangeEndAt": iso(FUTURE),
        "coldBridgeHours": 48, "publicHourCount": 118, "matrixHourCount": 166,
        "operationalRangeStartAt": iso(REFERENCE), "operationalRangeEndAt": iso(FUTURE), "operationalHourCount": 118,
        "advisoryHistoryStartAt": iso(REFERENCE - timedelta(hours=48)),
        "advisoryHistoryEndAt": iso(REFERENCE - timedelta(hours=1)), "advisoryHistoryHourCount": 48,
        "targetCount": 1, "sourcePartCount": 1, "partCount": 1, "operationalPartCount": 1,
        "advisoryHistoryPartCount": 0, "targetRegistrySha256": target_fingerprint([TARGET]),
        "dmiCurrentInputSha256": dmi_sha, "dmiVerifierContractId": DMI_VERIFIER_CONTRACT_ID,
        "operationalRequiredPairsSha256": required_pairs_sha256(pairs), "operationalRequiredPairCount": 2,
        "operationalDmiVerifiedPairCount": 116, "operationalTotalPairCount": 118,
        "advisoryHistoryRequiredPairsSha256": required_pairs_sha256([]), "advisoryHistoryRequiredPairCount": 0,
        "advisoryHistoryDmiVerifiedPairCount": 48, "advisoryHistoryTotalPairCount": 48,
        "dmiVerifiedPairCount": 164, "totalPairCount": 166, "coordinatesChanged": False,
        "targets": [TARGET], "operationalRequiredPairs": pairs, "advisoryHistoryRequiredPairs": [],
        "zones": {"zone": [{"partId": TARGET["partId"], "sourceZoneId": "zone", "name": TARGET["name"],
                              "waterPoint": TARGET["waterPoint"]}]},
    }


class DatasetUpdatingTests(unittest.TestCase):
    def download(self, folder):
        return PILOT["download_subset"](PRODUCT, [TARGET], REFERENCE, REFERENCE, folder, 0)

    def test_flag_and_only_one_retry_then_success(self):
        with tempfile.TemporaryDirectory() as raw:
            folder = Path(raw)
            path = folder / "synthetic.nc"
            path.write_bytes(b"synthetic-subset")
            subset = Mock(side_effect=[DatasetUpdating("private upstream message"), types.SimpleNamespace(file_path=path)])
            module = types.SimpleNamespace(subset=subset, DatasetUpdating=DatasetUpdating)
            with patch.dict(sys.modules, {"copernicusmarine": module}), \
                 patch.dict(os.environ, {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: ""}), \
                 patch.object(PILOT["time"], "sleep") as sleep, contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(self.download(folder), path)
            self.assertEqual(subset.call_count, 2)
            self.assertTrue(all(call.kwargs["raise_if_updating"] for call in subset.call_args_list))
            sleep.assert_called_once_with(PILOT["DATASET_UPDATING_BACKOFF_SECONDS"])

    def test_exhaustion_is_local_retryable_and_does_not_expose_provider_message(self):
        subset = Mock(side_effect=DatasetUpdating("PRIVATE_PROVIDER_MESSAGE"))
        module = types.SimpleNamespace(subset=subset, DatasetUpdating=DatasetUpdating)
        with patch.dict(sys.modules, {"copernicusmarine": module}), \
             patch.dict(os.environ, {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: ""}), \
             patch.object(PILOT["time"], "sleep") as sleep, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(PILOT["CopernicusDatasetUpdatingDeferred"]) as caught:
                self.download(Path("unused"))
        self.assertEqual(subset.call_count, 2)
        sleep.assert_called_once()
        self.assertIsInstance(caught.exception, PILOT["COPERNICUS_SHARD_DATA_ERRORS"])
        self.assertNotIn("PRIVATE_PROVIDER_MESSAGE", str(caught.exception))

    def test_insufficient_soft_budget_does_not_sleep_or_retry(self):
        subset = Mock(side_effect=DatasetUpdating("updating"))
        module = types.SimpleNamespace(subset=subset, DatasetUpdating=DatasetUpdating)
        with patch.dict(sys.modules, {"copernicusmarine": module}), \
             patch.dict(os.environ, {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: "1040"}), \
             patch.object(PILOT["time"], "time", return_value=1000), \
             patch.object(PILOT["time"], "sleep") as sleep:
            with self.assertRaises(PILOT["CopernicusDatasetUpdatingDeferred"]):
                self.download(Path("unused"))
        self.assertEqual(subset.call_count, 1)
        sleep.assert_not_called()

    def test_budget_is_rechecked_after_wait_before_retry(self):
        subset = Mock(side_effect=DatasetUpdating("updating"))
        module = types.SimpleNamespace(subset=subset, DatasetUpdating=DatasetUpdating)
        with patch.dict(sys.modules, {"copernicusmarine": module}), \
             patch.dict(os.environ, {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: "1100"}), \
             patch.object(PILOT["time"], "time", side_effect=[1000, 1000, 1100]), \
             patch.object(PILOT["time"], "sleep"), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(PILOT["CopernicusOperationalBudgetReached"]):
                self.download(Path("unused"))
        self.assertEqual(subset.call_count, 1)

    def test_schema_error_is_not_retried(self):
        subset = Mock(side_effect=ValueError("synthetic schema error"))
        module = types.SimpleNamespace(subset=subset, DatasetUpdating=DatasetUpdating)
        with patch.dict(sys.modules, {"copernicusmarine": module}), \
             patch.dict(os.environ, {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: ""}), \
             patch.object(PILOT["time"], "sleep") as sleep:
            with self.assertRaisesRegex(ValueError, "synthetic schema error"):
                self.download(Path("unused"))
        self.assertEqual(subset.call_count, 1)
        sleep.assert_not_called()

    def test_real_checkpoint_om_residual_and_resume_preserve_sibling(self):
        with tempfile.TemporaryDirectory(prefix="rr-updating-checkpoint-") as raw:
            folder = Path(raw)
            dmi = {"diagnostics": {"currentOperationalLedger": {"synthetic": True}}}
            dmi_path = folder / "dmi.json"
            dmi_path.write_text(json.dumps(dmi), encoding="utf-8")
            matrix = registry(file_sha256(dmi_path))
            registry_path = folder / "registry.json"
            registry_path.write_text(json.dumps(matrix), encoding="utf-8")
            targets_path = folder / "targets.json"
            targets_path.write_text(json.dumps({"partCount": 1, "zones": matrix["zones"]}), encoding="utf-8")
            args = types.SimpleNamespace(targets=registry_path, authoritative_targets=targets_path,
                shadow=folder / "shadow.json", source_stage=folder / "stage.json", donor_bank=folder / "bank.json",
                segment_journal=folder / "journal.json", acquisition_plan=folder / "plan.json",
                report=folder / "report.json", summary=folder / "summary.txt", at=iso(REFERENCE),
                acquisition_at=iso(REFERENCE + timedelta(minutes=10)), fixture_directory=None, refresh_only=False)
            updating = True
            calls = []

            def synthetic_subset(**kwargs):
                self.assertTrue(kwargs["raise_if_updating"])
                calls.append(kwargs["start_datetime"])
                if kwargs["start_datetime"] == FUTURE and updating:
                    raise DatasetUpdating("synthetic live update")
                path = kwargs["output_directory"] / kwargs["output_filename"]
                xr.Dataset({"uo": (("time", "depth", "latitude", "longitude"), np.array([[[[0.1]]]])),
                            "vo": (("time", "depth", "latitude", "longitude"), np.array([[[[0.2]]]]))},
                    coords={"time": np.array([kwargs["start_datetime"].replace(tzinfo=None)], dtype="datetime64[ns]"),
                            "depth": [5.0], "latitude": [56.0], "longitude": [10.0]}).to_netcdf(path, engine="h5netcdf")
                return types.SimpleNamespace(file_path=path)

            module = types.SimpleNamespace(subset=synthetic_subset, DatasetUpdating=DatasetUpdating)
            env = {PILOT["SOFT_DEADLINE_EPOCH_ENV"]: "", "COPERNICUSMARINE_SERVICE_USERNAME": "fixture-user",
                   "COPERNICUSMARINE_SERVICE_PASSWORD": "fixture-secret", "RAVRADAR_COPERNICUS_ATTEMPT_ORDINAL": "0",
                   "GITHUB_RUN_ATTEMPT": "1"}
            with patch.dict(sys.modules, {"copernicusmarine": module}), patch.dict(os.environ, env), \
                 patch.dict(PILOT_GLOBALS, {"arguments": lambda: args}), \
                 patch.object(PILOT["time"], "sleep"), contextlib.redirect_stdout(io.StringIO()), \
                 contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(PILOT["CopernicusOperationalBudgetReached"]):
                    PILOT["main"]()
                shadow = json.loads(args.shadow.read_text(encoding="utf-8"))
                stage = json.loads(args.source_stage.read_text(encoding="utf-8"))
                stage = validate_reusable_source_stage(stage, registry=matrix, shadow=shadow,
                    target_identities={TARGET["partId"]: TARGET}, shadow_sha256=file_sha256(args.shadow), allow_rebase=False)
                self.assertEqual(stage["status"], "IN_PROGRESS")
                self.assertEqual(stage["missingPairCount"], 1)
                self.assertEqual(len(shadow["records"]), 1)
                sibling = shadow["records"][0]
                self.assertEqual(sibling["validTime"], iso(REFERENCE))
                self.assertEqual(len(stage["attempts"]), 1)
                self.assertEqual(stage["attempts"][0]["requestedPairs"], matrix["operationalRequiredPairs"][:1])
                self.assertEqual(calls.count(FUTURE), 2)

                # CP stage/hash/residual validation is real. Only independent
                # DMI/regional-provider evidence is stubbed: no provider calls.
                with patch.dict(OM["residual_plan"].__globals__, {
                    "current_attestation_authorization_from_operational_ledger": lambda _ledger: (set(), set()),
                    "canonical_verified_part_current_attestation": lambda *_a, **_k: {"synthetic": True},
                    "build_regional_residual_plan": lambda **kw: {"openMeteoRequiredPairs": kw["residual_pairs"],
                        "regionalPrivate": {}, "regionalDiagnostics": {}},
                }):
                    residual = OM["residual_plan"](targets=[TARGET], dmi=dmi, registry=matrix, copernicus=shadow,
                        source_stage=stage, regional={}, policy={}, reference=iso(REFERENCE),
                        copernicus_path=args.shadow, dmi_path=dmi_path)
                self.assertEqual(residual["requiredPairs"], matrix["operationalRequiredPairs"][1:])
                self.assertTrue(residual["boundedProgressAccepted"])

                updating = False
                calls.clear()
                self.assertEqual(PILOT["main"](), 0)
                resumed = json.loads(args.shadow.read_text(encoding="utf-8"))
                self.assertEqual(len(resumed["records"]), 2)
                self.assertIn(sibling, resumed["records"])
                self.assertEqual(calls, [FUTURE])


if __name__ == "__main__":
    unittest.main(verbosity=2)
