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


def candidate_g_selection(version):
    candidate_id = MODULE.CANDIDATE_G_PROFILE_ID
    return {
        "schemaVersion": "2.0.0",
        "sourceVersion": version,
        "switchVersion": f"RAVSCORE-PROFILE-SWITCH-{version}",
        "requestedProfileId": candidate_id,
        "candidateProfileId": candidate_id,
        "rollbackProfileId": None,
        "status": "owner-approved-candidate-g-only-local-fail-closed",
        "candidateActivationEnabled": True,
        "prePublicWarmupAccepted": True,
        "automaticActivationAllowed": False,
        "publicAvailabilityPolicy": "candidate-g-local-fail-closed",
        "legacyPublicFallbackAllowed": False,
        "activationAuthority": "DEC-0072",
        "evidence": {"ownerReviewDecisionId": "DEC-0072-OWNER"},
    }


def integrated_selection(version, active=True):
    payload = json.loads(MODULE.INTEGRATED_PROFILE_PATH.read_text(encoding="utf8"))
    payload["sourceVersion"] = version
    payload["modelActivationEnabled"] = active
    return payload


def candidate_g_rollback_selection(version):
    candidate = MODULE.expected_candidate_g_binding()
    integrated = integrated_selection(version)
    return {
        "schemaVersion": "3.0.0",
        "sourceVersion": version,
        "switchVersion": "RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0",
        "requestedProfileId": candidate["modelId"],
        "activeModelId": candidate["modelId"],
        **{key: candidate[key] for key in (
            "stateSchemaVersion", "variantId", "profileId", "componentSchemaId",
            "explanationSchemaId", "rankingPolicyId", "bestTimePolicyId",
            "presentationPolicyId", "modelContractSha256", "modelBundleSha256",
        )},
        "rollbackModelId": integrated["activeModelId"],
        "runtimeFallbackModelId": None,
        "modelActivationEnabled": True,
        "automaticActivationAllowed": False,
        "publicAvailabilityPolicy": "candidate-g-local-fail-closed",
        "crossModelRuntimeFallbackAllowed": False,
        "migrationRequiredAtFirstCutover": False,
        "status": "owner-approved-candidate-g-rollback-only-local-fail-closed",
        "activationAuthority": "DEC-0108-manual-candidate-g-rollback",
        "evidence": {
            "decisionId": "DEC-0108",
            "exactHeadValidationRequired": True,
            "freshProductionValidationRequired": True,
        },
    }


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
    def test_exact_candidate_g_to_newer_integrated_cutover_is_preserved(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            integrated_selection("4.0.308"), candidate_g_selection("4.0.307")))

    def test_first_integrated_install_is_preserved_when_central_is_missing(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            integrated_selection("4.0.307"), {}))

    def test_active_candidate_overlay_is_validated_but_integrated_build_profile_is_preserved(self):
        central = candidate_g_rollback_selection("4.0.309")
        self.assertTrue(MODULE.is_candidate_g_rollback_selection(central))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.309"), central
            ),
            "preserve-local-integrated-for-candidate-maintenance",
        )

    def test_forged_candidate_overlay_binding_is_fatal(self):
        for field in (
            "variantId", "profileId", "componentSchemaId", "explanationSchemaId",
            "rankingPolicyId", "bestTimePolicyId", "presentationPolicyId",
            "modelContractSha256", "modelBundleSha256",
        ):
            forged = candidate_g_rollback_selection("4.0.309")
            forged[field] = f"forged-{field}"
            self.assertFalse(MODULE.is_candidate_g_rollback_selection(forged))
            with self.assertRaisesRegex(RuntimeError, "Unknown or conflicting"):
                MODULE.ravscore_selection_hydration_action(
                    integrated_selection("4.0.309"), forged
                )

    def test_candidate_g_cutover_must_be_monotonically_newer(self):
        with self.assertRaisesRegex(RuntimeError, "not newer"):
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.306"), candidate_g_selection("4.0.306"))

    def test_equal_or_newer_same_bundle_central_remains_authoritative(self):
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            integrated_selection("4.0.307"), integrated_selection("4.0.307")))
        self.assertFalse(MODULE.preserve_newer_owner_approved_ravscore_selection(
            integrated_selection("4.0.307"), integrated_selection("4.0.308")))

    def test_newer_local_release_of_same_bundle_is_preserved(self):
        self.assertTrue(MODULE.preserve_newer_owner_approved_ravscore_selection(
            integrated_selection("4.0.308"), integrated_selection("4.0.307")))

    def test_unknown_central_model_or_bundle_is_fatal(self):
        unknown = integrated_selection("9.9.999")
        unknown["modelBundleSha256"] = "unknown"
        with self.assertRaisesRegex(RuntimeError, "Unknown or conflicting"):
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.307"), unknown)

        unknown_contract = integrated_selection("9.9.999")
        unknown_contract["modelContractSha256"] = "unknown"
        with self.assertRaisesRegex(RuntimeError, "Unknown or conflicting"):
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.307"), unknown_contract)

    def test_inactive_local_selection_is_fatal(self):
        with self.assertRaisesRegex(RuntimeError, "Local integrated"):
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.307", active=False),
                candidate_g_selection("4.0.306"),
            )

    def test_complete_contract_is_required(self):
        incomplete = integrated_selection("4.0.307")
        incomplete.pop("publicAvailabilityPolicy")
        self.assertFalse(MODULE.is_integrated_selection(incomplete, integrated_selection("4.0.307")))
        with self.assertRaisesRegex(RuntimeError, "Local integrated"):
            MODULE.ravscore_selection_hydration_action(
                incomplete, candidate_g_selection("4.0.306"))


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
