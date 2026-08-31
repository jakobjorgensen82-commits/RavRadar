#!/usr/bin/env python3
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

ROOT = pathlib.Path(__file__).resolve().parents[1]
SYNC_METADATA_PATH = ROOT / ".cache/admin-config-sync.json"
URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ACTIVATION_KEY = "coastal-parts-v2-activation"
RAVSCORE_PROFILE_KEY = "ravscore-profile-selection"
RAVSCORE_OPERATIONAL_KEY = "ravscore-operational-model-activation"
RAVSCORE_OPERATIONAL_SCHEMA = "ravscore-operational-model-activation-v4"
INTEGRATED_PROFILE_PATH = ROOT / "data/admin/ravscore-profile-selection.json"
CANDIDATE_G_CONTRACT_PATH = ROOT / "scripts/rollback-assets/ravscore-model-contract.js"
CANDIDATE_G_BUNDLE_PATH = ROOT / "scripts/rollback-assets/ravscore-model-bundle.generated.js"
CANDIDATE_G_PROFILE_ID = "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3"
CANDIDATE_G_SCHEMA_VERSION = "2.0.0"
CANDIDATE_G_AVAILABILITY_POLICY = "candidate-g-local-fail-closed"
MODEL_BINDING_FIELDS = (
    "modelId",
    "stateSchemaVersion",
    "variantId",
    "profileId",
    "componentSchemaId",
    "explanationSchemaId",
    "rankingPolicyId",
    "bestTimePolicyId",
    "presentationPolicyId",
    "modelContractSha256",
    "modelBundleSha256",
)
SEALED_OPERATIONAL_PROFILE_FIELDS = (
    "schemaVersion", "sourceVersion", "switchVersion", "requestedProfileId",
    "activeModelId", "stateSchemaVersion", "variantId", "profileId",
    "componentSchemaId", "explanationSchemaId", "rankingPolicyId",
    "bestTimePolicyId", "presentationPolicyId", "modelContractSha256",
    "modelBundleSha256", "rollbackModelId", "runtimeFallbackModelId",
    "modelActivationEnabled", "automaticActivationAllowed",
    "publicAvailabilityPolicy", "crossModelRuntimeFallbackAllowed",
    "migrationRequiredAtFirstCutover", "status", "activationAuthority", "evidence",
)
OPERATIONAL_CONTROLLER_FIELDS = (
    "schemaVersion", "status", "transitionKind", "sourceHead", "datasetId",
    "productionReferenceAt", "rollbackId", "activeModelBinding",
    "requestedModelBinding", "sourceModelBinding", "candidatePlanSha256",
    "candidateFullSha256", "privateBundleContentSha256", "publicManifestSha256",
    "sourcePublicManifestSha256", "requestedPublicManifestSha256",
    "sourceImplementationClosureSha256", "requestedImplementationClosureSha256",
    "sourceDeploymentId", "deploymentId", "automaticActivationAllowed",
    "schedulerActivationAllowed", "calibrationEligible", "requestedAt",
    "activatedAt", "failureCode", "returnPlanSha256",
    "integratedReadinessSha256", "integratedPublicAuditSha256",
    "integratedManifestSha256",
)
OPERATIONAL_TRANSITIONS = {
    "CANDIDATE_G_ROLLBACK",
    "CANDIDATE_G_REFRESH",
    "CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER",
    "LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER",
    "INTEGRATED_RETURN",
    "INITIAL_INTEGRATED_CUTOVER",
}
SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
HEAD_PATTERN = re.compile(r"[0-9a-f]{40}")
SAFE_ID_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,199}")
MAP = {
    "water-level-station-routing": "data/water-level-station-routing.json",
    "direction-reviews": "data/admin/direction-reviews.json",
    "rules": "data/admin/admin-rules.json",
    "coastline-overrides": "data/admin/coastline-overrides.json",
    "dmi-water-stations": "data/live/dmi-water-stations.json",
    ACTIVATION_KEY: "data/geometry-v2/active-national-coastal-parts/manifest.json",
    RAVSCORE_PROFILE_KEY: "data/admin/ravscore-profile-selection.json",
}
CENTRAL_DOCUMENT_KEYS = tuple(MAP) + (RAVSCORE_OPERATIONAL_KEY,)


def version_tuple(value):
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", str(value or ""))
    return tuple(map(int, match.groups())) if match else None


def exact_keys(value, fields):
    return isinstance(value, dict) and set(value) == set(fields)


def is_sha256(value):
    return bool(SHA256_PATTERN.fullmatch(str(value or "")))


def is_safe_id(value):
    return bool(SAFE_ID_PATTERN.fullmatch(str(value or "")))


def is_valid_time(value):
    if not isinstance(value, str) or not value:
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def is_sealed_model_binding(binding):
    return bool(
        exact_keys(binding, MODEL_BINDING_FIELDS)
        and all(is_safe_id(binding.get(field)) for field in MODEL_BINDING_FIELDS[:9])
        and is_sha256(binding.get("modelContractSha256"))
        and is_sha256(binding.get("modelBundleSha256"))
    )


def same_sealed_binding(left, right):
    return bool(is_sealed_model_binding(left) and is_sealed_model_binding(right) and left == right)


def profile_model_binding(payload):
    if not isinstance(payload, dict):
        return None
    binding = {
        "modelId": payload.get("activeModelId"),
        **{field: payload.get(field) for field in MODEL_BINDING_FIELDS[1:]},
    }
    if payload.get("requestedProfileId") != binding["modelId"] or not is_sealed_model_binding(binding):
        return None
    return binding


def js_exported_string(path, name):
    """Read one sealed generated ESM string without executing repository code."""
    try:
        source = path.read_text(encoding="utf8")
    except OSError as error:
        raise RuntimeError(f"Sealed Candidate G source is unreadable: {path.name}") from error
    match = re.search(
        rf"export\s+const\s+{re.escape(name)}\s*=\s*['\"]([^'\"]+)['\"]\s*;",
        source,
    )
    if not match:
        raise RuntimeError(f"Sealed Candidate G source lacks {name}")
    return match.group(1)


def expected_candidate_g_binding():
    names = {
        "modelId": "RAVSCORE_MODEL_ID",
        "stateSchemaVersion": "RAVSCORE_STATE_SCHEMA_VERSION",
        "variantId": "RAVSCORE_VARIANT_ID",
        "profileId": "RAVSCORE_PROFILE_ID",
        "componentSchemaId": "RAVSCORE_COMPONENT_SCHEMA_ID",
        "explanationSchemaId": "RAVSCORE_EXPLANATION_SCHEMA_ID",
        "rankingPolicyId": "RAVSCORE_RANKING_POLICY_ID",
        "bestTimePolicyId": "RAVSCORE_BEST_TIME_POLICY_ID",
        "presentationPolicyId": "RAVSCORE_PRESENTATION_POLICY_ID",
    }
    binding = {
        key: js_exported_string(CANDIDATE_G_CONTRACT_PATH, export_name)
        for key, export_name in names.items()
    }
    binding["modelContractSha256"] = js_exported_string(
        CANDIDATE_G_BUNDLE_PATH, "GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256"
    )
    binding["modelBundleSha256"] = js_exported_string(
        CANDIDATE_G_BUNDLE_PATH, "GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256"
    )
    if binding["modelId"] != CANDIDATE_G_PROFILE_ID or not all(
        re.fullmatch(r"[0-9a-f]{64}", binding[key] or "")
        for key in ("modelContractSha256", "modelBundleSha256")
    ):
        raise RuntimeError("Sealed Candidate G binding is invalid")
    return binding


def preserve_newer_owner_approved_activation(local, central):
    """Permit the reviewed repository activation to cross the central boundary once.

    Equal or older repository versions never win. That keeps Supabase authoritative
    for later admin rollback after the new activation has been written centrally.
    """
    local_version = version_tuple(local.get("sourceVersion")) if isinstance(local, dict) else None
    central_version = version_tuple(central.get("sourceVersion")) if isinstance(central, dict) else None
    explicit_approval = (
        isinstance(local, dict)
        and local.get("publicActivation") is True
        and local.get("automaticActivationAllowed") is False
        and bool(str(local.get("activationAuthority") or "").strip())
        and str(local.get("status") or "").startswith("owner-approved-")
    )
    return bool(explicit_approval and local_version and central_version and local_version > central_version)


def is_candidate_g_only_selection(payload):
    """Return whether a document is the complete owner-approved public score contract."""
    if not isinstance(payload, dict):
        return False
    source_version = str(payload.get("sourceVersion") or "")
    evidence = payload.get("evidence") or {}
    return bool(
        version_tuple(source_version)
        and payload.get("schemaVersion") == CANDIDATE_G_SCHEMA_VERSION
        and payload.get("switchVersion") == f"RAVSCORE-PROFILE-SWITCH-{source_version}"
        and payload.get("requestedProfileId") == CANDIDATE_G_PROFILE_ID
        and payload.get("candidateProfileId") == CANDIDATE_G_PROFILE_ID
        and payload.get("rollbackProfileId") is None
        and payload.get("candidateActivationEnabled") is True
        and payload.get("prePublicWarmupAccepted") is True
        and payload.get("automaticActivationAllowed") is False
        and payload.get("publicAvailabilityPolicy") == CANDIDATE_G_AVAILABILITY_POLICY
        and payload.get("legacyPublicFallbackAllowed") is False
        and bool(str(payload.get("activationAuthority") or "").strip())
        and str(payload.get("status") or "").startswith("owner-approved-candidate-g-only-")
        and bool(str(evidence.get("ownerReviewDecisionId") or "").strip())
    )


def is_candidate_g_rollback_selection(payload):
    """Accept only the sealed schema-3 Candidate G operational overlay."""
    if not isinstance(payload, dict):
        return False
    candidate = expected_candidate_g_binding()
    integrated = expected_integrated_selection()
    evidence = payload.get("evidence") or {}
    binding_matches = (
        payload.get("requestedProfileId") == candidate["modelId"]
        and payload.get("activeModelId") == candidate["modelId"]
        and all(
            payload.get(field) == candidate[field]
            for field in (
                "stateSchemaVersion", "variantId", "profileId", "componentSchemaId",
                "explanationSchemaId", "rankingPolicyId", "bestTimePolicyId",
                "presentationPolicyId", "modelContractSha256", "modelBundleSha256",
            )
        )
    )
    return bool(
        version_tuple(payload.get("sourceVersion"))
        and payload.get("schemaVersion") == "3.0.0"
        and payload.get("switchVersion")
        == "RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0"
        and binding_matches
        and payload.get("rollbackModelId") == integrated.get("activeModelId")
        and payload.get("runtimeFallbackModelId") is None
        and payload.get("modelActivationEnabled") is True
        and payload.get("automaticActivationAllowed") is False
        and payload.get("publicAvailabilityPolicy") == CANDIDATE_G_AVAILABILITY_POLICY
        and payload.get("crossModelRuntimeFallbackAllowed") is False
        and payload.get("migrationRequiredAtFirstCutover") is False
        and payload.get("status")
        == "owner-approved-candidate-g-rollback-only-local-fail-closed"
        and payload.get("activationAuthority") == "DEC-0110-manual-candidate-g-rollback"
        and evidence.get("decisionId") == "DEC-0110"
        and evidence.get("exactHeadValidationRequired") is True
        and evidence.get("freshProductionValidationRequired") is True
    )


def expected_integrated_selection():
    try:
        return json.loads(INTEGRATED_PROFILE_PATH.read_text(encoding="utf8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Local integrated RavScore profile is unreadable") from error


def is_integrated_selection(payload, expected=None):
    """Validate the complete integrated-model-only activation contract."""
    if not isinstance(payload, dict):
        return False
    expected = expected if isinstance(expected, dict) else expected_integrated_selection()
    source_version = str(payload.get("sourceVersion") or "")
    exact_fields = (
        "schemaVersion", "switchVersion", "requestedProfileId", "activeModelId",
        "stateSchemaVersion", "variantId", "profileId", "componentSchemaId",
        "explanationSchemaId", "rankingPolicyId", "bestTimePolicyId",
        "presentationPolicyId", "modelContractSha256", "modelBundleSha256", "rollbackModelId",
        "runtimeFallbackModelId", "publicAvailabilityPolicy",
        "crossModelRuntimeFallbackAllowed", "migrationRequiredAtFirstCutover",
    )
    evidence = payload.get("evidence") or {}
    expected_evidence = expected.get("evidence") or {}
    return bool(
        version_tuple(source_version)
        and all(payload.get(field) == expected.get(field) for field in exact_fields)
        and payload.get("modelActivationEnabled") is True
        and payload.get("automaticActivationAllowed") is False
        and str(payload.get("status") or "").startswith(
            "owner-approved-integrated-model-only-"
        )
        and bool(str(payload.get("activationAuthority") or "").strip())
        and evidence.get("decisionId") == expected_evidence.get("decisionId") == "DEC-0110"
        and evidence.get("exactHeadValidationRequired") is True
        and evidence.get("freshProductionValidationRequired") is True
    )


def is_sealed_candidate_g_selection_for_binding(payload, binding):
    """Validate one historical schema-3 Candidate profile against its own sealed binding."""
    if not isinstance(payload, dict) or not is_sealed_model_binding(binding):
        return False
    integrated = expected_integrated_selection()
    evidence = payload.get("evidence")
    return bool(
        exact_keys(payload, SEALED_OPERATIONAL_PROFILE_FIELDS)
        and exact_keys(evidence, (
            "decisionId", "exactHeadValidationRequired", "freshProductionValidationRequired",
        ))
        and binding.get("modelId") == CANDIDATE_G_PROFILE_ID
        and same_sealed_binding(profile_model_binding(payload), binding)
        and version_tuple(payload.get("sourceVersion"))
        and payload.get("schemaVersion") == "3.0.0"
        and payload.get("switchVersion")
        == "RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0"
        and payload.get("rollbackModelId") == integrated.get("activeModelId")
        and payload.get("runtimeFallbackModelId") is None
        and payload.get("modelActivationEnabled") is True
        and payload.get("automaticActivationAllowed") is False
        and payload.get("publicAvailabilityPolicy") == CANDIDATE_G_AVAILABILITY_POLICY
        and payload.get("crossModelRuntimeFallbackAllowed") is False
        and payload.get("migrationRequiredAtFirstCutover") is False
        and payload.get("status")
        == "owner-approved-candidate-g-rollback-only-local-fail-closed"
        and payload.get("activationAuthority") == "DEC-0110-manual-candidate-g-rollback"
        and evidence.get("decisionId") == "DEC-0110"
        and evidence.get("exactHeadValidationRequired") is True
        and evidence.get("freshProductionValidationRequired") is True
    )


def is_sealed_integrated_selection_for_binding(payload, binding, expected=None):
    """Validate one historical schema-3 integrated profile against its own sealed binding."""
    if not isinstance(payload, dict) or not is_sealed_model_binding(binding):
        return False
    expected = expected if isinstance(expected, dict) else expected_integrated_selection()
    evidence = payload.get("evidence")
    exact_semantic_fields = (
        "schemaVersion", "switchVersion", "rollbackModelId", "runtimeFallbackModelId",
        "publicAvailabilityPolicy", "crossModelRuntimeFallbackAllowed",
        "migrationRequiredAtFirstCutover",
    )
    return bool(
        exact_keys(payload, SEALED_OPERATIONAL_PROFILE_FIELDS)
        and exact_keys(evidence, (
            "decisionId", "exactHeadValidationRequired", "freshProductionValidationRequired",
        ))
        and binding.get("modelId") == expected.get("activeModelId")
        and same_sealed_binding(profile_model_binding(payload), binding)
        and version_tuple(payload.get("sourceVersion"))
        and all(payload.get(field) == expected.get(field) for field in exact_semantic_fields)
        and payload.get("modelActivationEnabled") is True
        and payload.get("automaticActivationAllowed") is False
        and payload.get("status") == "owner-approved-integrated-model-only-local-fail-closed"
        and payload.get("activationAuthority")
        == "DEC-0110-integrated-ravscore-release-decision"
        and evidence.get("decisionId") == "DEC-0110"
        and evidence.get("exactHeadValidationRequired") is True
        and evidence.get("freshProductionValidationRequired") is True
    )


def sealed_binding_kind(binding):
    if not is_sealed_model_binding(binding):
        return None
    if binding.get("modelId") == CANDIDATE_G_PROFILE_ID:
        return "candidate-g"
    if binding.get("modelId") == expected_integrated_selection().get("activeModelId"):
        return "integrated"
    return None


def hash_group_state(values):
    if all(value is None for value in values):
        return "none"
    if all(is_sha256(value) for value in values):
        return "exact"
    return "invalid"


def expected_operational_rollback_id():
    return js_exported_string(CANDIDATE_G_CONTRACT_PATH, "RAVSCORE_ROLLBACK_ID")


def transition_binding_contract(controller):
    """Validate the source/requested lineage and proof groups for one transition."""
    transition = controller.get("transitionKind")
    source_kind = sealed_binding_kind(controller.get("sourceModelBinding"))
    requested_kind = sealed_binding_kind(controller.get("requestedModelBinding"))
    candidate_state = hash_group_state([
        controller.get("candidatePlanSha256"),
        controller.get("candidateFullSha256"),
        controller.get("privateBundleContentSha256"),
    ])
    return_state = hash_group_state([
        controller.get("returnPlanSha256"),
        controller.get("integratedReadinessSha256"),
        controller.get("integratedPublicAuditSha256"),
        controller.get("integratedManifestSha256"),
    ])
    if (
        transition == "INTEGRATED_RETURN"
        and source_kind == "integrated"
        and requested_kind == "integrated"
        and not same_sealed_binding(
            controller.get("sourceModelBinding"),
            controller.get("requestedModelBinding"),
        )
    ):
        return candidate_state in {"none", "exact"} and return_state == "exact"
    contracts = {
        "CANDIDATE_G_ROLLBACK": ("integrated", "candidate-g", "exact", "none"),
        "CANDIDATE_G_REFRESH": ("candidate-g", "candidate-g", "exact", "none"),
        "CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER": (
            "candidate-g", "candidate-g", "exact", "exact",
        ),
        "LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER": (
            "candidate-g", "candidate-g", "exact", "none",
        ),
        "INTEGRATED_RETURN": ("candidate-g", "integrated", "exact", "exact"),
        "INITIAL_INTEGRATED_CUTOVER": ("candidate-g", "integrated", "none", "exact"),
    }
    return contracts.get(transition) == (
        source_kind, requested_kind, candidate_state, return_state,
    )


def is_exact_active_operational_controller(controller, profile_binding, profile_kind):
    """Accept a historical profile only beside its exact ACTIVE schema-v4 controller."""
    if not isinstance(controller, dict) or not exact_keys(controller, OPERATIONAL_CONTROLLER_FIELDS):
        return False
    active_binding = controller.get("activeModelBinding")
    source_binding = controller.get("sourceModelBinding")
    requested_binding = controller.get("requestedModelBinding")
    if not (
        controller.get("schemaVersion") == RAVSCORE_OPERATIONAL_SCHEMA
        and controller.get("status") in {"CANDIDATE_G_ACTIVE", "INTEGRATED_ACTIVE"}
        and controller.get("transitionKind") in OPERATIONAL_TRANSITIONS
        and HEAD_PATTERN.fullmatch(str(controller.get("sourceHead") or ""))
        and is_safe_id(controller.get("datasetId"))
        and is_valid_time(controller.get("productionReferenceAt"))
        and controller.get("rollbackId") == expected_operational_rollback_id()
        and is_sealed_model_binding(active_binding)
        and is_sealed_model_binding(source_binding)
        and is_sealed_model_binding(requested_binding)
        and same_sealed_binding(active_binding, profile_binding)
        and is_sha256(controller.get("publicManifestSha256"))
        and is_sha256(controller.get("sourcePublicManifestSha256"))
        and is_sha256(controller.get("requestedPublicManifestSha256"))
        and is_sha256(controller.get("sourceImplementationClosureSha256"))
        and is_sha256(controller.get("requestedImplementationClosureSha256"))
        and is_safe_id(controller.get("sourceDeploymentId"))
        and is_safe_id(controller.get("deploymentId"))
        and controller.get("automaticActivationAllowed") is False
        and controller.get("schedulerActivationAllowed") is False
        and isinstance(controller.get("calibrationEligible"), bool)
        and is_valid_time(controller.get("requestedAt"))
        and is_valid_time(controller.get("activatedAt"))
        and hash_group_state([
            controller.get("candidatePlanSha256"),
            controller.get("candidateFullSha256"),
            controller.get("privateBundleContentSha256"),
        ]) != "invalid"
        and hash_group_state([
            controller.get("returnPlanSha256"),
            controller.get("integratedReadinessSha256"),
            controller.get("integratedPublicAuditSha256"),
            controller.get("integratedManifestSha256"),
        ]) != "invalid"
    ):
        return False

    status = controller["status"]
    failure_code = controller.get("failureCode")
    failed = failure_code is not None
    if failed and not is_safe_id(failure_code):
        return False
    public_matches_source = (
        controller["publicManifestSha256"] == controller["sourcePublicManifestSha256"]
        and controller["deploymentId"] == controller["sourceDeploymentId"]
    )
    public_matches_requested = (
        controller["publicManifestSha256"] == controller["requestedPublicManifestSha256"]
    )

    if profile_kind == "candidate-g":
        if status != "CANDIDATE_G_ACTIVE" or controller["calibrationEligible"] is not False:
            return False
        if not transition_binding_contract(controller):
            return False
        if failed:
            return bool(
                same_sealed_binding(active_binding, source_binding)
                and sealed_binding_kind(source_binding) == "candidate-g"
                and public_matches_source
            )
        return bool(
            same_sealed_binding(active_binding, requested_binding)
            and sealed_binding_kind(requested_binding) == "candidate-g"
            and public_matches_requested
        )

    if profile_kind != "integrated" or status != "INTEGRATED_ACTIVE":
        return False
    if controller["calibrationEligible"] is not True:
        return False

    integrated_maintenance = (
        same_sealed_binding(source_binding, requested_binding)
        and same_sealed_binding(requested_binding, active_binding)
        and sealed_binding_kind(active_binding) == "integrated"
    )
    if integrated_maintenance:
        return bool(
            not failed
            and controller["transitionKind"] in {"INTEGRATED_RETURN", "INITIAL_INTEGRATED_CUTOVER"}
            and public_matches_source
            and public_matches_requested
            and controller["sourceImplementationClosureSha256"]
            == controller["requestedImplementationClosureSha256"]
        )

    historical_integrated_return = (
        controller["transitionKind"] == "INTEGRATED_RETURN"
        and sealed_binding_kind(source_binding) == "integrated"
        and sealed_binding_kind(requested_binding) == "integrated"
        and not same_sealed_binding(source_binding, requested_binding)
    )
    if historical_integrated_return:
        exact_lineage = (
            transition_binding_contract(controller)
            and controller["integratedManifestSha256"]
            == controller["requestedPublicManifestSha256"]
            and controller["sourceImplementationClosureSha256"]
            != controller["requestedImplementationClosureSha256"]
        )
        if failed:
            return bool(
                exact_lineage
                and same_sealed_binding(active_binding, source_binding)
                and public_matches_source
            )
        return bool(
            exact_lineage
            and same_sealed_binding(active_binding, requested_binding)
            and public_matches_requested
        )

    if controller["transitionKind"] == "CANDIDATE_G_ROLLBACK":
        return bool(
            failed
            and transition_binding_contract(controller)
            and same_sealed_binding(active_binding, source_binding)
            and sealed_binding_kind(source_binding) == "integrated"
            and public_matches_source
        )

    return bool(
        not failed
        and transition_binding_contract(controller)
        and same_sealed_binding(active_binding, requested_binding)
        and sealed_binding_kind(requested_binding) == "integrated"
        and public_matches_requested
    )


def claims_historical_integrated_return(controller):
    """Recognize an integrated H0 -> H1 claim before current-profile precedence."""
    if not isinstance(controller, dict) or controller.get("transitionKind") != "INTEGRATED_RETURN":
        return False
    source = controller.get("sourceModelBinding")
    requested = controller.get("requestedModelBinding")
    if not isinstance(source, dict) or not isinstance(requested, dict):
        return False
    integrated_id = expected_integrated_selection().get("activeModelId")
    candidate_id = CANDIDATE_G_PROFILE_ID
    endpoints_differ = (
        source != requested
        or controller.get("sourcePublicManifestSha256")
        != controller.get("requestedPublicManifestSha256")
        or controller.get("sourceImplementationClosureSha256")
        != controller.get("requestedImplementationClosureSha256")
    )
    return bool(
        requested.get("modelId") == integrated_id
        and source.get("modelId") != candidate_id
        and endpoints_differ
    )


def historical_selection_binding(payload, expected):
    binding = profile_model_binding(payload)
    if binding is None:
        return None
    candidate = expected_candidate_g_binding()
    integrated = profile_model_binding(expected)
    if same_sealed_binding(binding, candidate) or same_sealed_binding(binding, integrated):
        return None
    if is_sealed_candidate_g_selection_for_binding(payload, binding):
        return "candidate-g", binding
    if is_sealed_integrated_selection_for_binding(payload, binding, expected):
        return "integrated", binding
    return None


def ravscore_selection_hydration_action(local, central, operational_controller=None):
    """Resolve central hydration without permitting a cross-model overwrite.

    The only first-cutover predecessor is the exact Candidate G-only contract.
    A historical schema-3 binding is only a build predecessor when the same
    central snapshot proves that exact binding ACTIVE in the schema-v4 controller.
    Current integrated documents retain their existing version precedence.
    Unknown, incomplete or conflicting documents are fatal.
    """
    expected = expected_integrated_selection()
    if not is_integrated_selection(local, expected):
        raise RuntimeError("Local integrated RavScore selection is invalid")
    local_version = version_tuple(local.get("sourceVersion")) if isinstance(local, dict) else None
    central_version = version_tuple(central.get("sourceVersion")) if isinstance(central, dict) else None
    if not central:
        return "preserve-local-integrated-first-install"
    if claims_historical_integrated_return(operational_controller):
        binding = profile_model_binding(central)
        if (
            binding is None
            or sealed_binding_kind(binding) != "integrated"
            or not is_sealed_integrated_selection_for_binding(central, binding, expected)
            or not is_exact_active_operational_controller(
                operational_controller, binding, "integrated"
            )
        ):
            raise RuntimeError(
                "Unknown or conflicting historical integrated return: "
                "requires an exact matching ACTIVE schema-v4 controller/profile snapshot"
            )
    if is_candidate_g_only_selection(central):
        if central_version is None or not (local_version and local_version > central_version):
            raise RuntimeError("Integrated RavScore cutover is not newer than Candidate G")
        return "preserve-local-integrated-candidate-g-cutover"
    if is_candidate_g_rollback_selection(central):
        # The operational status/controller is central truth. The build checkout
        # deliberately keeps the exact integrated profile long enough to build
        # the fresh private dual-model runtime; only the separately audited
        # Candidate stage may become the public overlay.
        return "preserve-local-integrated-for-candidate-maintenance"
    if is_integrated_selection(central, expected):
        if central_version is not None and local_version is not None and central_version >= local_version:
            return "use-central-integrated-runtime-truth"
        return "preserve-newer-local-integrated-release"
    historical = historical_selection_binding(central, expected)
    if historical is not None:
        model_kind, binding = historical
        if not is_exact_active_operational_controller(
            operational_controller, binding, model_kind
        ):
            raise RuntimeError(
                "Unknown or conflicting historical central RavScore selection: "
                "requires an exact matching "
                "ACTIVE schema-v4 operational controller from the same snapshot"
            )
        return f"preserve-local-integrated-for-historical-{model_kind}-maintenance"
    raise RuntimeError("Unknown or conflicting central RavScore selection")


def preserve_newer_owner_approved_ravscore_selection(local, central, operational_controller=None):
    """Compatibility wrapper used by existing audits."""
    return ravscore_selection_hydration_action(
        local, central, operational_controller
    ).startswith("preserve-")


def write_document(document_key, payload, operational_controller=None):
    target = ROOT / pathlib.Path(MAP[document_key])
    target.parent.mkdir(parents=True, exist_ok=True)
    if document_key == ACTIVATION_KEY and target.exists():
        try:
            local = json.loads(target.read_text(encoding="utf8"))
        except (OSError, json.JSONDecodeError):
            local = None
        if preserve_newer_owner_approved_activation(local, payload):
            return "preserved-newer-owner-approved-repository-activation"
    if document_key == RAVSCORE_PROFILE_KEY:
        try:
            local = json.loads(target.read_text(encoding="utf8")) if target.exists() else None
        except (OSError, json.JSONDecodeError):
            local = None
        action = ravscore_selection_hydration_action(
            local, payload, operational_controller
        )
        if action.startswith("preserve-"):
            return action
        if action != "use-central-integrated-runtime-truth":
            raise RuntimeError(f"Unsupported RavScore hydration action: {action}")
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return "central"


def fetch_admin_rows(url, key, opener=urllib.request.urlopen, sleeper=time.sleep):
    """Read the central admin snapshot with one narrow secret-translation retry."""
    document_filter = ",".join(f'"{document_key}"' for document_key in CENTRAL_DOCUMENT_KEYS)
    query = urllib.parse.urlencode(
        {"select": "document_key,payload,version,updated_at", "document_key": f"in.({document_filter})"}
    )
    headers = {"apikey": key} if key.startswith("sb_secret_") else {
        "apikey": key,
        "Authorization": "Bearer " + key,
    }
    request = urllib.request.Request(url + "/rest/v1/admin_documents?" + query, headers=headers)
    for attempt in range(2):
        try:
            with opener(request, timeout=20) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf8", errors="replace")
            try:
                code = json.loads(body).get("code")
            except (json.JSONDecodeError, AttributeError):
                code = None
            if attempt == 0 and key.startswith("sb_secret_") and error.code == 401 and code == "PGRST303":
                print(json.dumps({"status": "retry", "reason": "supabase-secret-translation-pgrst303"}))
                sleeper(1)
                continue
            suffix = f" {code}" if code else ""
            raise RuntimeError(f"Central admin sync failed: HTTP {error.code}{suffix}") from None
        except Exception as error:
            raise RuntimeError(f"Central admin sync could not be reached ({type(error).__name__})") from None
    raise RuntimeError("Central admin sync failed after the single safe retry")


def index_admin_snapshot(rows):
    """Index the single REST response; duplicate or malformed rows are ambiguous."""
    if not isinstance(rows, list) or len(rows) > len(CENTRAL_DOCUMENT_KEYS):
        raise RuntimeError("Central admin snapshot is malformed or ambiguous")
    by_key = {}
    for row in rows:
        document_key = row.get("document_key") if isinstance(row, dict) else None
        if (
            document_key not in CENTRAL_DOCUMENT_KEYS
            or document_key in by_key
            or "payload" not in row
        ):
            raise RuntimeError("Central admin snapshot is malformed or ambiguous")
        by_key[document_key] = row
    return by_key


def main():
    if not URL or not KEY:
        if os.getenv("GITHUB_ACTIONS", "").lower() == "true":
            raise RuntimeError("Supabase secrets are required in GitHub Actions")
        print(json.dumps({"status": "fallback", "reason": "missing-supabase-secrets"}))
        return
    try:
        rows = fetch_admin_rows(URL, KEY)
        snapshot = index_admin_snapshot(rows)
        operational_row = snapshot.get(RAVSCORE_OPERATIONAL_KEY)
        operational_controller = (
            operational_row.get("payload") if operational_row is not None else None
        )
        sources = {}
        metadata = {"schemaVersion": 1, "documents": {}}
        for document_key, row in snapshot.items():
            if document_key not in MAP:
                continue
            sources[document_key] = write_document(
                document_key, row["payload"], operational_controller
            )
            metadata["documents"][document_key] = {
                "version": row.get("version"),
                "updatedAt": row.get("updated_at"),
            }
        SYNC_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
        temporary = SYNC_METADATA_PATH.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
        temporary.replace(SYNC_METADATA_PATH)
        print(json.dumps({"status": "ok", "documents": list(sources), "sources": sources}))
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        raise


if __name__ == "__main__":
    main()
