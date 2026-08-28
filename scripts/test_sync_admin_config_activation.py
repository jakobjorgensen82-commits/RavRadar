#!/usr/bin/env python3
import importlib.util
import io
import json
import pathlib
import unittest
import urllib.error

SCRIPT = pathlib.Path(__file__).with_name("sync-admin-config.py")
SPEC = importlib.util.spec_from_file_location("sync_admin_config", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def manifest(version, active=True, approved=True):
    return {
        "sourceVersion": version,
        "status": "owner-approved-national-public-coast-active" if approved else "generated",
        "publicActivation": active,
        "automaticActivationAllowed": False,
        "activationAuthority": "explicit owner approval" if approved else "",
    }


def ravscore_selection(version, active=True, approved=True, legacy=False):
    model_id = MODULE.PUBLIC_RAVSCORE_PROFILE_ID
    payload = {
        "schemaVersion": "3.0.0",
        "sourceVersion": version,
        "switchVersion": "RAVSCORE-PROFILE-SWITCH-4.0.306",
        "requestedProfileId": model_id,
        "modelProfileId": model_id,
        "rollbackProfileId": None,
        "status": "owner-approved-integrated-next-ravscore-local-fail-closed" if approved else "draft",
        "publicModelEnabled": active,
        "prePublicWarmupAccepted": False,
        "automaticActivationAllowed": False,
        "publicAvailabilityPolicy": "ravscore-local-fail-closed",
        "legacyPublicFallbackAllowed": False,
        "activationAuthority": "DEC-0102" if approved else "",
        "evidence": {"ownerReviewDecisionId": "DEC-0102-OWNER" if approved else None},
    }
    if legacy:
        payload.update({
            "requestedProfileId": "RRS-CURRENT-B0-4.0.247",
            "rollbackProfileId": "RRS-CURRENT-B0-4.0.247",
            "publicModelEnabled": False,
            "publicAvailabilityPolicy": None,
            "legacyPublicFallbackAllowed": True,
            "status": "owner-approved-global-rollback",
        })
    return payload


class ActivationPrecedenceTest(unittest.TestCase):
    def test_newer_explicit_owner_activation_crosses_central_boundary(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.182"), manifest("4.0.181")))

    def test_equal_version_keeps_central_rollback_authoritative(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.182"), manifest("4.0.182", active=False)))

    def test_unapproved_or_inactive_local_manifest_never_wins(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.183", approved=False), manifest("4.0.182")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.183", active=False), manifest("4.0.182")))

    def test_invalid_or_older_versions_never_win(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("next"), manifest("4.0.182")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_activation(manifest("4.0.181"), manifest("4.0.182")))


class RavScoreSelectionPrecedenceTest(unittest.TestCase):
    def test_newer_explicit_owner_selection_crosses_central_boundary(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), ravscore_selection("4.0.260")))

    def test_first_owner_selection_is_preserved_when_central_version_is_missing(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), {}))

    def test_equal_or_newer_legacy_central_selection_can_never_reintroduce_fallback(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), ravscore_selection("4.0.261", legacy=True)))
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), ravscore_selection("9.9.999", legacy=True)))

    def test_equal_or_newer_valid_integrated_central_remains_authoritative(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), ravscore_selection("4.0.261")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261"), ravscore_selection("4.0.262")))

    def test_unapproved_or_inactive_selection_never_wins(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261", approved=False), ravscore_selection("4.0.260")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            ravscore_selection("4.0.261", active=False), ravscore_selection("4.0.260")))

    def test_complete_contract_is_required(self):
        incomplete = ravscore_selection("4.0.261")
        incomplete.pop("publicAvailabilityPolicy")
        self.assertFalse(MODULE.is_public_ravscore_selection(incomplete))
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            incomplete, ravscore_selection("4.0.260", legacy=True)))


class CentralAdminRequestTest(unittest.TestCase):
    def test_secret_key_retries_only_pgrst303_once(self):
        calls = []
        sleeps = []

        def opener(request, timeout):
            calls.append(request)
            self.assertEqual(timeout, 20)
            if len(calls) == 1:
                raise urllib.error.HTTPError(
                    request.full_url,
                    401,
                    "unauthorized",
                    {},
                    io.BytesIO(json.dumps({"code": "PGRST303"}).encode("utf8")),
                )
            return io.BytesIO(b'[{"document_key":"direction-reviews","payload":{}}]')

        rows = MODULE.fetch_admin_rows(
            "https://example.invalid",
            "sb_secret_test-value",
            opener=opener,
            sleeper=sleeps.append,
        )
        self.assertEqual(rows[0]["document_key"], "direction-reviews")
        self.assertEqual(len(calls), 2)
        self.assertEqual(sleeps, [1])
        self.assertEqual(calls[0].get_header("Apikey"), "sb_secret_test-value")
        self.assertIsNone(calls[0].get_header("Authorization"))

    def test_other_auth_error_fails_without_retry(self):
        calls = []

        def opener(request, timeout):
            calls.append(request)
            raise urllib.error.HTTPError(
                request.full_url,
                401,
                "unauthorized",
                {},
                io.BytesIO(json.dumps({"code": "PGRST301"}).encode("utf8")),
            )

        with self.assertRaisesRegex(RuntimeError, r"HTTP 401 PGRST301"):
            MODULE.fetch_admin_rows(
                "https://example.invalid",
                "sb_secret_test-value",
                opener=opener,
                sleeper=lambda _: None,
            )
        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
