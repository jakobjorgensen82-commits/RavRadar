#!/usr/bin/env python3
import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
import urllib.error
import urllib.parse
from unittest import mock

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


def integrated_selection(version, active=True, binding=None):
    payload = json.loads(MODULE.INTEGRATED_PROFILE_PATH.read_text(encoding="utf8"))
    payload["sourceVersion"] = version
    payload["modelActivationEnabled"] = active
    if binding is not None:
        payload["requestedProfileId"] = binding["modelId"]
        payload["activeModelId"] = binding["modelId"]
        for field in MODULE.MODEL_BINDING_FIELDS[1:]:
            payload[field] = binding[field]
    return payload


def candidate_g_rollback_selection(version, binding=None):
    candidate = binding or MODULE.expected_candidate_g_binding()
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
        "activationAuthority": "DEC-0110-manual-candidate-g-rollback",
        "evidence": {
            "decisionId": "DEC-0110",
            "exactHeadValidationRequired": True,
            "freshProductionValidationRequired": True,
        },
    }


def historical_binding(binding, marker):
    sealed = dict(binding)
    sealed["profileId"] = f"{binding['profileId']}-{marker}"
    sealed["modelContractSha256"] = "1" * 64
    sealed["modelBundleSha256"] = "2" * 64
    return sealed


def active_controller(binding, model_kind):
    candidate = model_kind == "candidate-g"
    source_public = "4" * 64
    requested_public = "5" * 64
    source_closure = "6" * 64
    requested_closure = "7" * 64
    source_deployment = "rr-source-deployment"
    return {
        "schemaVersion": MODULE.RAVSCORE_OPERATIONAL_SCHEMA,
        "status": "CANDIDATE_G_ACTIVE" if candidate else "INTEGRATED_ACTIVE",
        "transitionKind": "CANDIDATE_G_REFRESH" if candidate else "INTEGRATED_RETURN",
        "sourceHead": "a" * 40,
        "datasetId": "rr-test-dataset",
        "productionReferenceAt": "2026-08-31T00:00:00.000Z",
        "rollbackId": MODULE.expected_operational_rollback_id(),
        "activeModelBinding": dict(binding),
        "requestedModelBinding": dict(binding),
        "sourceModelBinding": dict(binding),
        "candidatePlanSha256": "8" * 64 if candidate else None,
        "candidateFullSha256": "9" * 64 if candidate else None,
        "privateBundleContentSha256": "a" * 64 if candidate else None,
        "publicManifestSha256": requested_public if candidate else source_public,
        "sourcePublicManifestSha256": source_public,
        "requestedPublicManifestSha256": requested_public if candidate else source_public,
        "sourceImplementationClosureSha256": source_closure,
        "requestedImplementationClosureSha256": (
            requested_closure if candidate else source_closure
        ),
        "sourceDeploymentId": source_deployment,
        "deploymentId": "rr-requested-deployment" if candidate else source_deployment,
        "automaticActivationAllowed": False,
        "schedulerActivationAllowed": False,
        "calibrationEligible": not candidate,
        "requestedAt": "2026-08-31T00:01:00.000Z",
        "activatedAt": "2026-08-31T00:02:00.000Z",
        "failureCode": None,
        "returnPlanSha256": None,
        "integratedReadinessSha256": None,
        "integratedPublicAuditSha256": None,
        "integratedManifestSha256": None,
    }


def historical_integrated_return_controller(source_binding, target_binding, outcome):
    if outcome not in {"completed", "aborted"}:
        raise ValueError("unknown historical integrated outcome")
    active_binding = target_binding if outcome == "completed" else source_binding
    controller = active_controller(active_binding, "integrated")
    controller.update({
        "transitionKind": "INTEGRATED_RETURN",
        "activeModelBinding": dict(active_binding),
        "requestedModelBinding": dict(target_binding),
        "sourceModelBinding": dict(source_binding),
        "publicManifestSha256": "5" * 64 if outcome == "completed" else "4" * 64,
        "sourcePublicManifestSha256": "4" * 64,
        "requestedPublicManifestSha256": "5" * 64,
        "sourceImplementationClosureSha256": "6" * 64,
        "requestedImplementationClosureSha256": "7" * 64,
        "sourceDeploymentId": "rr-source-deployment",
        "deploymentId": (
            "rr-requested-deployment" if outcome == "completed"
            else "rr-source-deployment"
        ),
        "failureCode": (
            None if outcome == "completed"
            else "HISTORICAL_INTEGRATED_TARGET_NOT_ACCEPTED"
        ),
        "returnPlanSha256": "8" * 64,
        "integratedReadinessSha256": "9" * 64,
        "integratedPublicAuditSha256": "a" * 64,
        "integratedManifestSha256": "5" * 64,
    })
    return controller


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

    def test_historical_candidate_binding_requires_and_accepts_matching_active_controller(self):
        binding = historical_binding(MODULE.expected_candidate_g_binding(), "historical")
        central = candidate_g_rollback_selection("4.0.309", binding)
        controller = active_controller(binding, "candidate-g")
        self.assertFalse(MODULE.is_candidate_g_rollback_selection(central))
        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, binding, "candidate-g"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.309"), central, controller
            ),
            "preserve-local-integrated-for-historical-candidate-g-maintenance",
        )

    def test_historical_integrated_binding_requires_and_accepts_matching_active_controller(self):
        current = integrated_selection("4.0.309")
        binding = historical_binding(MODULE.profile_model_binding(current), "historical")
        central = integrated_selection("4.0.308", binding=binding)
        controller = active_controller(binding, "integrated")
        self.assertFalse(MODULE.is_integrated_selection(central, current))
        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, binding, "integrated"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(current, central, controller),
            "preserve-local-integrated-for-historical-integrated-maintenance",
        )

    def test_historical_integrated_warmup_controller_false_is_preserved(self):
        current = integrated_selection("4.0.309")
        binding = historical_binding(MODULE.profile_model_binding(current), "warmup")
        central = integrated_selection("4.0.308", binding=binding)
        controller = active_controller(binding, "integrated")
        controller["calibrationEligible"] = False

        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, binding, "integrated"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(current, central, controller),
            "preserve-local-integrated-for-historical-integrated-maintenance",
        )

    def test_historical_integrated_return_complete_installs_exact_current_target(self):
        current = integrated_selection("4.0.309")
        target = MODULE.profile_model_binding(current)
        source = historical_binding(target, "historical-source")
        controller = historical_integrated_return_controller(source, target, "completed")

        self.assertTrue(MODULE.transition_binding_contract(controller))
        self.assertTrue(MODULE.claims_historical_integrated_return(controller))
        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, target, "integrated"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(current, current, controller),
            "use-central-integrated-runtime-truth",
        )

    def test_historical_integrated_return_abort_preserves_exact_historical_source(self):
        current = integrated_selection("4.0.309")
        target = MODULE.profile_model_binding(current)
        source = historical_binding(target, "historical-source")
        central_source = integrated_selection("4.0.308", binding=source)
        controller = historical_integrated_return_controller(source, target, "aborted")

        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, source, "integrated"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(
                current, central_source, controller
            ),
            "preserve-local-integrated-for-historical-integrated-maintenance",
        )

    def test_historical_integrated_return_fails_closed_for_endpoint_tamper(self):
        current = integrated_selection("4.0.309")
        target = MODULE.profile_model_binding(current)
        source = historical_binding(target, "historical-source")
        valid = historical_integrated_return_controller(source, target, "completed")
        third = historical_binding(target, "third-active")

        tampered_binding = json.loads(json.dumps(valid))
        tampered_binding["activeModelBinding"]["modelBundleSha256"] = "c" * 64
        tampered_manifest = json.loads(json.dumps(valid))
        tampered_manifest["publicManifestSha256"] = "b" * 64
        tampered_closure = json.loads(json.dumps(valid))
        tampered_closure["requestedImplementationClosureSha256"] = (
            tampered_closure["sourceImplementationClosureSha256"]
        )
        pending = json.loads(json.dumps(valid))
        pending["status"] = "INTEGRATED_PENDING"
        stale_source = json.loads(json.dumps(valid))
        stale_source["activeModelBinding"] = dict(source)
        third_active = json.loads(json.dumps(valid))
        third_active["activeModelBinding"] = dict(third)
        collapsed_binding_only = json.loads(json.dumps(valid))
        collapsed_binding_only["sourceModelBinding"] = dict(target)

        for label, controller in (
            ("tampered-binding", tampered_binding),
            ("tampered-manifest", tampered_manifest),
            ("tampered-closure", tampered_closure),
            ("pending", pending),
            ("stale-source", stale_source),
            ("third-active", third_active),
            ("collapsed-binding-only", collapsed_binding_only),
        ):
            with self.subTest(label=label):
                self.assertTrue(MODULE.claims_historical_integrated_return(controller))
                self.assertFalse(MODULE.is_exact_active_operational_controller(
                    controller, target, "integrated"
                ))
                with self.assertRaisesRegex(
                    RuntimeError, "historical integrated return"
                ):
                    MODULE.ravscore_selection_hydration_action(
                        current, current, controller
                    )

        tampered_profile = integrated_selection("4.0.309")
        tampered_profile["modelContractSha256"] = "d" * 64
        with self.assertRaisesRegex(RuntimeError, "historical integrated return"):
            MODULE.ravscore_selection_hydration_action(
                current, tampered_profile, valid
            )

    def test_historical_integrated_abort_requires_controller_and_matching_source_profile(self):
        current = integrated_selection("4.0.309")
        target = MODULE.profile_model_binding(current)
        source = historical_binding(target, "historical-source")
        central_source = integrated_selection("4.0.308", binding=source)
        controller = historical_integrated_return_controller(source, target, "aborted")

        with self.assertRaisesRegex(RuntimeError, "ACTIVE schema-v4"):
            MODULE.ravscore_selection_hydration_action(
                current, central_source, None
            )
        stale_target_profile = integrated_selection("4.0.308")
        with self.assertRaisesRegex(RuntimeError, "historical integrated return"):
            MODULE.ravscore_selection_hydration_action(
                current, stale_target_profile, controller
            )
        unbounded_failure = json.loads(json.dumps(controller))
        unbounded_failure["failureCode"] = "unsafe failure with spaces"
        self.assertFalse(MODULE.is_exact_active_operational_controller(
            unbounded_failure, source, "integrated"
        ))

    def test_current_integrated_maintenance_remains_exact_and_unchanged(self):
        current = integrated_selection("4.0.309")
        binding = MODULE.profile_model_binding(current)
        controller = active_controller(binding, "integrated")
        controller.update({
            "returnPlanSha256": "8" * 64,
            "integratedReadinessSha256": "9" * 64,
            "integratedPublicAuditSha256": "a" * 64,
            "integratedManifestSha256": controller["publicManifestSha256"],
        })

        self.assertFalse(MODULE.claims_historical_integrated_return(controller))
        self.assertTrue(MODULE.is_exact_active_operational_controller(
            controller, binding, "integrated"
        ))
        self.assertEqual(
            MODULE.ravscore_selection_hydration_action(current, current, controller),
            "use-central-integrated-runtime-truth",
        )

    def test_historical_binding_fails_closed_for_missing_pending_mismatch_or_tamper(self):
        binding = historical_binding(MODULE.expected_candidate_g_binding(), "historical")
        central = candidate_g_rollback_selection("4.0.309", binding)
        valid = active_controller(binding, "candidate-g")

        pending = json.loads(json.dumps(valid))
        pending["status"] = "CANDIDATE_G_PENDING"
        mismatch = json.loads(json.dumps(valid))
        mismatch["activeModelBinding"]["modelBundleSha256"] = "3" * 64
        tampered_identity = json.loads(json.dumps(valid))
        tampered_identity["publicManifestSha256"] = "b" * 64
        extra_field = json.loads(json.dumps(valid))
        extra_field["unexpected"] = True
        incomplete_binding = json.loads(json.dumps(valid))
        incomplete_binding["activeModelBinding"].pop("rankingPolicyId")

        for label, controller in (
            ("missing", None),
            ("pending", pending),
            ("mismatch", mismatch),
            ("tampered-public-identity", tampered_identity),
            ("extra-field", extra_field),
            ("incomplete-11-field-binding", incomplete_binding),
        ):
            with self.subTest(label=label):
                with self.assertRaisesRegex(RuntimeError, "ACTIVE schema-v4"):
                    MODULE.ravscore_selection_hydration_action(
                        integrated_selection("4.0.309"), central, controller
                    )

    def test_historical_profile_tamper_cannot_borrow_a_valid_controller(self):
        binding = historical_binding(MODULE.expected_candidate_g_binding(), "historical")
        central = candidate_g_rollback_selection("4.0.309", binding)
        controller = active_controller(binding, "candidate-g")
        central["modelContractSha256"] = "c" * 64
        with self.assertRaisesRegex(RuntimeError, "ACTIVE schema-v4"):
            MODULE.ravscore_selection_hydration_action(
                integrated_selection("4.0.309"), central, controller
            )

    def test_historical_integrated_also_fails_closed_without_exact_active_controller(self):
        current = integrated_selection("4.0.309")
        binding = historical_binding(MODULE.profile_model_binding(current), "historical")
        central = integrated_selection("4.0.308", binding=binding)
        valid = active_controller(binding, "integrated")
        pending = json.loads(json.dumps(valid))
        pending["status"] = "INTEGRATED_PENDING"
        mismatch = json.loads(json.dumps(valid))
        mismatch["activeModelBinding"]["modelContractSha256"] = "d" * 64

        for label, controller in (("missing", None), ("pending", pending), ("mismatch", mismatch)):
            with self.subTest(label=label):
                with self.assertRaisesRegex(RuntimeError, "ACTIVE schema-v4"):
                    MODULE.ravscore_selection_hydration_action(
                        current, central, controller
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

    def test_missing_local_profile_cannot_bypass_hydration_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            with mock.patch.object(MODULE, "ROOT", root):
                with self.assertRaisesRegex(RuntimeError, "Local integrated"):
                    MODULE.write_document(
                        MODULE.RAVSCORE_PROFILE_KEY,
                        integrated_selection("4.0.309"),
                    )
                target = root / MODULE.MAP[MODULE.RAVSCORE_PROFILE_KEY]
                self.assertFalse(target.exists())


class CentralAdminRequestTest(unittest.TestCase):
    def test_profile_and_controller_are_requested_in_one_central_snapshot(self):
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return io.BytesIO(b'[]')

        MODULE.fetch_admin_rows(
            "https://example.invalid",
            "legacy-service-role-key",
            opener=opener,
            sleeper=lambda _: None,
        )
        self.assertEqual(len(calls), 1)
        url = urllib.parse.unquote(calls[0].full_url)
        self.assertIn(MODULE.RAVSCORE_PROFILE_KEY, url)
        self.assertIn(MODULE.RAVSCORE_OPERATIONAL_KEY, url)

    def test_duplicate_snapshot_row_is_fatal(self):
        row = {
            "document_key": MODULE.RAVSCORE_PROFILE_KEY,
            "payload": integrated_selection("4.0.309"),
        }
        with self.assertRaisesRegex(RuntimeError, "malformed or ambiguous"):
            MODULE.index_admin_snapshot([row, dict(row)])

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
