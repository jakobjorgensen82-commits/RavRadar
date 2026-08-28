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
PUBLIC_RAVSCORE_PROFILE_ID = "RRS-COASTAL-CAUSAL-CHAIN-1"
PUBLIC_RAVSCORE_SCHEMA_VERSION = "3.0.0"
PUBLIC_RAVSCORE_SWITCH_VERSION = "RAVSCORE-PROFILE-SWITCH-4.0.306"
PUBLIC_RAVSCORE_AVAILABILITY_POLICY = "ravscore-local-fail-closed"
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


def is_public_ravscore_selection(payload):
    """Return whether a document is the complete owner-approved public score contract."""
    if not isinstance(payload, dict):
        return False
    source_version = str(payload.get("sourceVersion") or "")
    evidence = payload.get("evidence") or {}
    return bool(
        version_tuple(source_version)
        and payload.get("schemaVersion") == PUBLIC_RAVSCORE_SCHEMA_VERSION
        and payload.get("switchVersion") == PUBLIC_RAVSCORE_SWITCH_VERSION
        and payload.get("requestedProfileId") == PUBLIC_RAVSCORE_PROFILE_ID
        and payload.get("modelProfileId") == PUBLIC_RAVSCORE_PROFILE_ID
        and payload.get("rollbackProfileId") is None
        and payload.get("publicModelEnabled") is True
        and payload.get("prePublicWarmupAccepted") is False
        and payload.get("automaticActivationAllowed") is False
        and payload.get("publicAvailabilityPolicy") == PUBLIC_RAVSCORE_AVAILABILITY_POLICY
        and payload.get("legacyPublicFallbackAllowed") is False
        and bool(str(payload.get("activationAuthority") or "").strip())
        and str(payload.get("status") or "").startswith("owner-approved-integrated-next-ravscore-")
        and bool(str(evidence.get("ownerReviewDecisionId") or "").strip())
    )


def preserve_newer_owner_approved_ravscore_selection(local, central):
    """Keep the integrated public RavScore authoritative across central hydration.

    The old public profile is no longer a permitted admin rollback. A central
    legacy/rollback document must therefore never overwrite the versioned
    integrated single-model contract, even if that stale document carries an equal or
    syntactically newer version. A valid equal/newer integrated central
    document remains authoritative.
    """
    local_version = version_tuple(local.get("sourceVersion")) if isinstance(local, dict) else None
    central_version = version_tuple(central.get("sourceVersion")) if isinstance(central, dict) else None
    return bool(
        is_public_ravscore_selection(local)
        and local_version
        and (
            not is_public_ravscore_selection(central)
            or central_version is None
            or local_version > central_version
        )
    )


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
        if preserve_newer_owner_approved_ravscore_selection(local, payload):
            return "preserved-owner-approved-integrated-ravscore-contract"
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
