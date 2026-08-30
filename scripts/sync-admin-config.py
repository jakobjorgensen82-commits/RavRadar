#!/usr/bin/env python3
import json
import os
import pathlib
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SYNC_METADATA_PATH = ROOT / ".cache/admin-config-sync.json"
URL = os.getenv("SUPABASE_URL", "").rstrip("/")
KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ACTIVATION_KEY = "coastal-parts-v2-activation"
RAVSCORE_PROFILE_KEY = "ravscore-profile-selection"
INTEGRATED_PROFILE_PATH = ROOT / "data/admin/ravscore-profile-selection.json"
CANDIDATE_G_CONTRACT_PATH = ROOT / "scripts/rollback-assets/ravscore-model-contract.js"
CANDIDATE_G_BUNDLE_PATH = ROOT / "scripts/rollback-assets/ravscore-model-bundle.generated.js"
CANDIDATE_G_PROFILE_ID = "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3"
CANDIDATE_G_SCHEMA_VERSION = "2.0.0"
CANDIDATE_G_AVAILABILITY_POLICY = "candidate-g-local-fail-closed"
MAP = {
    "water-level-station-routing": "data/water-level-station-routing.json",
    "direction-reviews": "data/admin/direction-reviews.json",
    "rules": "data/admin/admin-rules.json",
    "coastline-overrides": "data/admin/coastline-overrides.json",
    "dmi-water-stations": "data/live/dmi-water-stations.json",
    ACTIVATION_KEY: "data/geometry-v2/active-national-coastal-parts/manifest.json",
    RAVSCORE_PROFILE_KEY: "data/admin/ravscore-profile-selection.json",
}


def version_tuple(value):
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", str(value or ""))
    return tuple(map(int, match.groups())) if match else None


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


def ravscore_selection_hydration_action(local, central):
    """Resolve central hydration without permitting a cross-model overwrite.

    The only first-cutover predecessor is the exact Candidate G-only contract.
    Once the integrated bundle exists centrally, the same/newer central version
    is runtime truth. Unknown models, bundles or newer conflicting documents are
    fatal and are never silently replaced.
    """
    expected = expected_integrated_selection()
    if not is_integrated_selection(local, expected):
        raise RuntimeError("Local integrated RavScore selection is invalid")
    local_version = version_tuple(local.get("sourceVersion")) if isinstance(local, dict) else None
    central_version = version_tuple(central.get("sourceVersion")) if isinstance(central, dict) else None
    if not central:
        return "preserve-local-integrated-first-install"
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
    raise RuntimeError("Unknown or conflicting central RavScore selection")


def preserve_newer_owner_approved_ravscore_selection(local, central):
    """Compatibility wrapper used by existing audits."""
    return ravscore_selection_hydration_action(local, central).startswith("preserve-")


def write_document(document_key, payload):
    target = ROOT / pathlib.Path(MAP[document_key])
    target.parent.mkdir(parents=True, exist_ok=True)
    if document_key == ACTIVATION_KEY and target.exists():
        try:
            local = json.loads(target.read_text(encoding="utf8"))
        except (OSError, json.JSONDecodeError):
            local = None
        if preserve_newer_owner_approved_activation(local, payload):
            return "preserved-newer-owner-approved-repository-activation"
    if document_key == RAVSCORE_PROFILE_KEY and target.exists():
        try:
            local = json.loads(target.read_text(encoding="utf8"))
        except (OSError, json.JSONDecodeError):
            local = None
        action = ravscore_selection_hydration_action(local, payload)
        if action.startswith("preserve-"):
            return action
        if action != "use-central-integrated-runtime-truth":
            raise RuntimeError(f"Unsupported RavScore hydration action: {action}")
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return "central"


def fetch_admin_rows(url, key, opener=urllib.request.urlopen, sleeper=time.sleep):
    """Read the central admin snapshot with one narrow secret-translation retry."""
    document_filter = ",".join(f'"{document_key}"' for document_key in MAP)
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


def main():
    if not URL or not KEY:
        if os.getenv("GITHUB_ACTIONS", "").lower() == "true":
            raise RuntimeError("Supabase secrets are required in GitHub Actions")
        print(json.dumps({"status": "fallback", "reason": "missing-supabase-secrets"}))
        return
    try:
        rows = fetch_admin_rows(URL, KEY)
        sources = {}
        metadata = {"schemaVersion": 1, "documents": {}}
        for row in rows:
            document_key = row.get("document_key")
            if document_key not in MAP:
                continue
            sources[document_key] = write_document(document_key, row["payload"])
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
