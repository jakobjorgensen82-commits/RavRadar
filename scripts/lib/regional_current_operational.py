"""Private evidence for the bounded regional DMI current fallback.

This module is intentionally not wired into source selection or the public
runtime.  It validates and classifies only an already selected set of exact
DMI-gap pairs for the eight policy-bound Limfjord targets.  The caller remains
responsible for proving that Copernicus was attempted first and for combining
this standalone proof with the other source domains.

Raw vectors and coordinates are inspected only to validate the private shadow.
Neither is copied to the returned pair references or safe projection.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import re
from typing import Any

try:  # Support both ``lib.foo`` tests and direct ``scripts/lib`` imports.
    from .copernicus_target_identity import target_fingerprint
    from .dmi_native_provenance import (
        canonical_current_source_asset,
        canonical_time,
        current_source_asset_sha256,
        part_time_pairs_sha256,
        validate_current_operational_ledger,
    )
except ImportError:  # pragma: no cover - exercised by production-style import.
    from copernicus_target_identity import target_fingerprint
    from dmi_native_provenance import (
        canonical_current_source_asset,
        canonical_time,
        current_source_asset_sha256,
        part_time_pairs_sha256,
        validate_current_operational_ledger,
    )


SCHEMA_VERSION = 1
PRIVATE_CONTRACT_ID = "regional-dmi-operational-118-evidence-v1"
SAFE_CONTRACT_ID = "regional-dmi-operational-118-safe-v1"
POLICY_BINDING_CONTRACT_ID = "regional-dmi-eight-part-policy-binding-v1"
SOURCE_PROOF_CONTRACT_ID = "regional-dmi-native-source-proof-v1"
VECTOR_COMMITMENT_CONTRACT_ID = "regional-dmi-private-vector-commitment-v1"
PAIR_REFS_CONTRACT_ID = "regional-dmi-operational-pair-refs-v1"

EXPECTED_PART_COUNT = 8
OPERATIONAL_HOUR_COUNT = 118
OPERATIONAL_END_OFFSET_HOURS = 117
NATIVE_CADENCE_HOURS = 3
MAXIMUM_HOLD_HOURS = 3
REGULAR_MAXIMUM_DISTANCE_KM = 5.0
REGIONAL_MAXIMUM_DISTANCE_KM = 15.0
REQUIRED_COLLECTION = "dkss_lf"
TARGET_PREFIX = "REGIONAL_PROXY::"

REGIONAL_DMI_NATIVE = "REGIONAL_DMI_NATIVE"
REGIONAL_DMI_DERIVED_HOLD = "REGIONAL_DMI_DERIVED_HOLD"
MISSING = "MISSING"

REQUIRED_SOURCE_ASSET_HOOK = (
    "scripts/lib/current_field_shadow.py::record_profiles must persist "
    "sourceAssetSha256 from "
    "scripts/lib/dmi_native_provenance.py::current_source_asset_sha256 for "
    "the exact processed DMI sourceAsset; scripts/update-dmi-bulk.py must pass "
    "that source identity into the same transactional shadow write"
)

_SHA256 = re.compile(r"sha256:[0-9a-f]{64}")
_SELECTION_RULE = "nearest-exact-shared-uv-column-then-deepest-common-layer"
_ACTIVATION_REQUIRES = (
    "fresh-dmi-and-copernicus-pilot",
    "same-time-cell-layer-provenance",
    "full-project-validation",
    "release-gate",
    "fresh-production-workflow",
)

SAFE_PROJECTION_FIELDS = frozenset({
    "schemaVersion",
    "contractId",
    "status",
    "productionReferenceAt",
    "operationalRangeEndAt",
    "operationalHourCount",
    "configuredPartCount",
    "fallbackEligiblePairCount",
    "regionalNativePairCount",
    "regionalDerivedHoldPairCount",
    "missingPairCount",
    "policySha256",
    "targetRegistrySha256",
    "dmiLedgerSha256",
    "dmiAttestationSha256",
    "dmiGapPairsSha256",
    "pairRefsSha256",
    "partIdsIncluded",
    "coordinatesIncluded",
    "rawVectorsIncluded",
    "sourceAssetIdsIncluded",
    "combinedSealRequired",
})

PRIVATE_PROOF_FIELDS = frozenset({
    "schemaVersion",
    "contractId",
    "status",
    "productionReferenceAt",
    "operationalRangeEndAt",
    "operationalHourCount",
    "configuredPartCount",
    "nativeCadenceHours",
    "maximumDerivedHoldHours",
    "fallbackEligiblePairCount",
    "regionalNativePairCount",
    "regionalDerivedHoldPairCount",
    "missingPairCount",
    "policySha256",
    "targetRegistrySha256",
    "dmiLedgerContractId",
    "dmiLedgerSha256",
    "dmiAttestationSha256",
    "dmiGapPairsSha256",
    "pairRefsSha256",
    "pairRefs",
    "coordinatesIncluded",
    "rawVectorsIncluded",
    "combinedSealRequired",
    "publicRuntime",
})


class RegionalCurrentOperationalError(ValueError):
    """Fail-closed error whose rendered message never includes private data."""

    def __init__(self, code: str, *, required_hook: str | None = None) -> None:
        self.code = code
        self.required_hook = required_hook
        super().__init__(code)


def _fail(code: str, *, required_hook: str | None = None) -> None:
    raise RegionalCurrentOperationalError(code, required_hook=required_hook)


def _canonical_json(value: Any) -> str:
    try:
        return json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    except (TypeError, ValueError):
        _fail("CANONICAL_EVIDENCE_INVALID")
    raise AssertionError("unreachable")


def _sha256(value: Any) -> str:
    return "sha256:" + hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def _exact_utc_hour(value: Any, error_code: str) -> tuple[str, datetime]:
    normalized = canonical_time(value)
    if normalized is None:
        _fail(error_code)
    try:
        parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        _fail(error_code)
    parsed = parsed.astimezone(timezone.utc)
    if parsed.minute or parsed.second or parsed.microsecond:
        _fail(error_code)
    text = parsed.strftime("%Y-%m-%dT%H:00:00Z")
    if str(value) != text and not isinstance(value, datetime):
        _fail(error_code)
    return text, parsed


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _point(value: Any) -> tuple[float, float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    first = _finite_number(value[0])
    second = _finite_number(value[1])
    if first is None or second is None:
        return None
    return first, second


def _point_identity(value: Any) -> tuple[str, str] | None:
    point = _point(value)
    if point is None:
        return None
    return f"{point[0]:.7f}", f"{point[1]:.7f}"


def _haversine_km(first: tuple[float, float], second: tuple[float, float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (*first, *second))
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    term = (
        math.sin(delta_lat / 2.0) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2.0) ** 2
    )
    return 6371.0088 * 2.0 * math.atan2(
        math.sqrt(term), math.sqrt(max(0.0, 1.0 - term))
    )


def _policy_and_target_binding(
    policy: Any,
    targets: Any,
    *,
    allow_target_rebinding_as_missing: bool = False,
) -> tuple[dict[str, dict[str, Any]], str, str]:
    if not isinstance(policy, dict) or not isinstance(targets, list):
        _fail("POLICY_SCOPE_INVALID")
    expected_scalars = {
        "schemaVersion": 1,
        "status": "private-collection-enabled-public-activation-gated",
        "regularMaximumDistanceKm": 5,
        "regionalProxyMaximumDistanceKm": 15,
        "selectionRule": _SELECTION_RULE,
        "requiredCollection": REQUIRED_COLLECTION,
        "sameConnectedWaterBody": "Limfjorden",
        "interpolation": False,
        "globalOverrideAllowed": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "controlledLivePilotAllowed": True,
        "rawRetentionHours": 168,
        "supportReportRawVectors": False,
    }
    if any(policy.get(key) != value for key, value in expected_scalars.items()):
        _fail("POLICY_SCOPE_INVALID")
    decided_at = canonical_time(policy.get("decidedAt"))
    if decided_at is None or decided_at != policy.get("decidedAt"):
        _fail("POLICY_SCOPE_INVALID")
    if tuple(policy.get("activationRequires") or ()) != _ACTIVATION_REQUIRES:
        _fail("POLICY_SCOPE_INVALID")

    try:
        registry_sha256 = target_fingerprint(targets)
    except (TypeError, ValueError):
        _fail("TARGET_REGISTRY_INVALID")
    targets_by_id: dict[str, dict[str, Any]] = {}
    for target in targets:
        if not isinstance(target, dict):
            _fail("TARGET_REGISTRY_INVALID")
        part_id = str(target.get("partId") or "").strip()
        if not part_id or part_id in targets_by_id:
            _fail("TARGET_REGISTRY_INVALID")
        targets_by_id[part_id] = target

    rows = policy.get("parts")
    if not isinstance(rows, list) or len(rows) != EXPECTED_PART_COUNT:
        _fail("POLICY_SCOPE_INVALID")
    bound: dict[str, dict[str, Any]] = {}
    normalized_rows: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            _fail("POLICY_SCOPE_INVALID")
        part_id = str(row.get("partId") or "").strip()
        if not part_id or row.get("partId") != part_id or part_id in bound:
            _fail("POLICY_SCOPE_INVALID")
        name = str(row.get("name") or "").strip()
        approved_identity = _point_identity(row.get("approvedSamplingPoint"))
        audit_distance = _finite_number(row.get("auditDistanceKm"))
        if (
            not name
            or approved_identity is None
            or audit_distance is None
            or audit_distance <= REGULAR_MAXIMUM_DISTANCE_KM
            or audit_distance > REGIONAL_MAXIMUM_DISTANCE_KM
        ):
            _fail("POLICY_SCOPE_INVALID")
        target = targets_by_id.get(part_id)
        if target is None:
            _fail("POLICY_TARGET_BINDING_INVALID")
        target_point_identity = _point_identity(target.get("waterPoint"))
        parent_zone_id = str(target.get("parentZoneId") or "").strip()
        target_matches_policy = target_point_identity == approved_identity
        if not parent_zone_id or (
            not target_matches_policy and not allow_target_rebinding_as_missing
        ):
            _fail("POLICY_TARGET_BINDING_INVALID")
        bound[part_id] = {
            "target": target,
            "targetPoint": _point(target.get("waterPoint")),
            "targetPointIdentity": target_point_identity,
            "parentZoneId": parent_zone_id,
            "regionalEvidenceEligible": target_matches_policy,
        }
        normalized_rows.append({
            "partId": part_id,
            "name": name,
            "approvedSamplingPoint": list(approved_identity),
            "auditDistanceKm": f"{audit_distance:.5f}",
            "parentZoneId": parent_zone_id,
        })
    if len(bound) != EXPECTED_PART_COUNT:
        _fail("POLICY_SCOPE_INVALID")
    normalized_rows.sort(key=lambda row: row["partId"])
    policy_binding = {
        "schemaVersion": 1,
        "contractId": POLICY_BINDING_CONTRACT_ID,
        "decidedAt": decided_at,
        **expected_scalars,
        "activationRequires": list(_ACTIVATION_REQUIRES),
        "parts": normalized_rows,
    }
    return bound, _sha256(policy_binding), registry_sha256


def _normalize_gap_pairs(
    raw_pairs: Any,
    bound_parts: dict[str, dict[str, Any]],
    reference: datetime,
    ledger: dict[str, Any],
) -> tuple[list[dict[str, str]], str]:
    if not isinstance(raw_pairs, list):
        _fail("DMI_GAP_MATRIX_INVALID")
    complement = ledger.get("operationalComplementPairs")
    if not isinstance(complement, list):
        _fail("DMI_COMPLEMENT_INVALID")
    complement_keys: set[tuple[str, str]] = set()
    for row in complement:
        if not isinstance(row, dict):
            _fail("DMI_COMPLEMENT_INVALID")
        part_id = str(row.get("partId") or "").strip()
        valid_time = canonical_time(row.get("validTime"))
        if not part_id or valid_time is None:
            _fail("DMI_COMPLEMENT_INVALID")
        complement_keys.add((part_id, valid_time))

    normalized: list[dict[str, str]] = []
    identities: set[tuple[str, str]] = set()
    for row in raw_pairs:
        if not isinstance(row, dict) or set(row) != {"partId", "validTime"}:
            _fail("DMI_GAP_MATRIX_INVALID")
        part_id = str(row.get("partId") or "").strip()
        if not part_id or row.get("partId") != part_id:
            _fail("DMI_GAP_MATRIX_INVALID")
        valid_time, parsed = _exact_utc_hour(row.get("validTime"), "DMI_GAP_TIME_INVALID")
        seconds = (parsed - reference).total_seconds()
        if seconds % 3600:
            _fail("DMI_GAP_TIME_INVALID")
        offset = int(seconds // 3600)
        if offset < 0 or offset > OPERATIONAL_END_OFFSET_HOURS:
            _fail("DMI_GAP_OFFSET_INVALID")
        identity = (part_id, valid_time)
        if identity in identities:
            _fail("DMI_GAP_DUPLICATE")
        identities.add(identity)
        if part_id not in bound_parts or identity not in complement_keys:
            _fail("DMI_GAP_NOT_FALLBACK_ELIGIBLE")
        normalized.append({"partId": part_id, "validTime": valid_time})
    normalized.sort(key=lambda row: (row["validTime"], row["partId"]))
    try:
        pairs_sha256 = part_time_pairs_sha256(normalized)
    except (TypeError, ValueError):
        _fail("DMI_GAP_MATRIX_INVALID")
    return normalized, pairs_sha256


def _ledger_source_index(ledger: dict[str, Any]) -> dict[tuple[str, str, str], dict[str, Any]]:
    collections = ledger.get("collections")
    if not isinstance(collections, list):
        _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
    indexed: dict[tuple[str, str, str], dict[str, Any]] = {}
    for collection_row in collections:
        if not isinstance(collection_row, dict):
            _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
        if collection_row.get("collection") != REQUIRED_COLLECTION:
            continue
        collection_run = canonical_time(collection_row.get("modelRun"))
        rows = collection_row.get("validTimes")
        if collection_run is None or not isinstance(rows, list):
            _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
        for row in rows:
            if not isinstance(row, dict):
                _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
            if row.get("state") not in {"PROCESSED", "VERIFIED"}:
                continue
            source = canonical_current_source_asset(row.get("sourceAsset"))
            if source is None:
                _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
            valid_time = canonical_time(row.get("validTime"))
            if (
                valid_time is None
                or source["collection"] != REQUIRED_COLLECTION
                or source["modelRun"] != collection_run
                or source["validTime"] != valid_time
            ):
                _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
            try:
                source_sha256 = current_source_asset_sha256(source)
            except ValueError:
                _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
            identity = (collection_run, valid_time, source_sha256)
            if identity in indexed and indexed[identity] != source:
                _fail("DMI_LEDGER_SOURCE_INDEX_INVALID")
            indexed[identity] = source
    return indexed


def _validate_shadow_header(shadow: Any) -> dict[str, Any]:
    if not isinstance(shadow, dict):
        _fail("SHADOW_INVALID")
    if (
        shadow.get("schemaVersion") != 1
        or shadow.get("retentionHours") != 168
        or shadow.get("scoreImpact") is not False
        or shadow.get("publicRuntime") is not False
        or not isinstance(shadow.get("anchors"), dict)
    ):
        _fail("SHADOW_INVALID")
    return shadow


def _validate_anchor(
    anchor: Any,
    part: dict[str, Any],
    part_id: str,
) -> list[dict[str, Any]]:
    if anchor is None:
        return []
    if not isinstance(anchor, dict):
        _fail("SHADOW_TARGET_BINDING_INVALID")
    target_identity = part["targetPointIdentity"]
    if (
        anchor.get("partId") != part_id
        or anchor.get("parentZoneId") != part["parentZoneId"]
        or _point_identity(anchor.get("targetPoint")) != target_identity
        or _point_identity(anchor.get("sourceWaterPoint")) != target_identity
        or anchor.get("regionalProxyCandidate") is not True
        or anchor.get("requiredCollection") != REQUIRED_COLLECTION
        or _finite_number(anchor.get("maximumDistanceKm")) != REGIONAL_MAXIMUM_DISTANCE_KM
        or anchor.get("sameConnectedWaterBody") != "Limfjorden"
        or anchor.get("researchClass") != "owner-approved-regional-proxy"
        or _finite_number(anchor.get("bandKm")) != 0.0
        or anchor.get("scoreImpact") is not False
        or anchor.get("publicRuntime") is not False
    ):
        _fail("SHADOW_TARGET_BINDING_INVALID")
    samples = anchor.get("samples")
    if not isinstance(samples, list):
        _fail("SHADOW_INVALID")
    return samples


def _validated_sample(
    sample: Any,
    *,
    part_id: str,
    part: dict[str, Any],
    policy_sha256: str,
    target_registry_sha256: str,
    ledger_sources: dict[tuple[str, str, str], dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(sample, dict):
        _fail("SHADOW_SAMPLE_INVALID")
    collection = sample.get("collection")
    model_run, model_run_dt = _exact_utc_hour(
        sample.get("modelRun"), "SHADOW_SOURCE_BINDING_INVALID"
    )
    valid_time, valid_time_dt = _exact_utc_hour(
        sample.get("validTime"), "SHADOW_SOURCE_BINDING_INVALID"
    )
    if collection != REQUIRED_COLLECTION or model_run_dt > valid_time_dt:
        _fail("SHADOW_SOURCE_BINDING_INVALID")
    lead_seconds = (valid_time_dt - model_run_dt).total_seconds()
    if lead_seconds % (NATIVE_CADENCE_HOURS * 3600):
        _fail("SHADOW_NATIVE_CADENCE_INVALID")
    if canonical_time(sample.get("capturedAt")) is None:
        _fail("SHADOW_SAMPLE_INVALID")

    source_asset_sha256 = sample.get("sourceAssetSha256")
    if source_asset_sha256 is None:
        _fail(
            "SHADOW_SOURCE_ASSET_HASH_MISSING",
            required_hook=REQUIRED_SOURCE_ASSET_HOOK,
        )
    if not isinstance(source_asset_sha256, str) or not _SHA256.fullmatch(source_asset_sha256):
        _fail("SHADOW_SOURCE_ASSET_HASH_INVALID")
    expected_key = (
        f"{REQUIRED_COLLECTION}|{model_run}|{valid_time}|{source_asset_sha256}"
    )
    if sample.get("sampleKey") != expected_key:
        _fail("SHADOW_SOURCE_BINDING_INVALID")
    source = ledger_sources.get((model_run, valid_time, source_asset_sha256))
    if source is None:
        _fail("SHADOW_SOURCE_ASSET_HASH_MISMATCH")

    grid_point = _point(sample.get("gridPoint"))
    target_point = part["targetPoint"]
    declared_distance = _finite_number(sample.get("distanceKm"))
    if grid_point is None or target_point is None or declared_distance is None:
        _fail("SHADOW_SPATIAL_PROOF_INVALID")
    measured_distance = _haversine_km(target_point, grid_point)
    if (
        declared_distance <= REGULAR_MAXIMUM_DISTANCE_KM
        or declared_distance > REGIONAL_MAXIMUM_DISTANCE_KM
        or measured_distance > REGIONAL_MAXIMUM_DISTANCE_KM + 0.01
        or abs(measured_distance - declared_distance) > 0.02
    ):
        _fail("SHADOW_SPATIAL_PROOF_INVALID")

    layers = sample.get("layers")
    bottom = layers.get("bottom") if isinstance(layers, dict) else None
    layer_count = sample.get("availableLayerCount")
    if (
        not isinstance(bottom, dict)
        or not isinstance(bottom.get("verticalLayer"), str)
        or not bottom.get("verticalLayer")
        or _finite_number(bottom.get("verticalLayerRankM")) is None
        or _finite_number(bottom.get("uMps")) is None
        or _finite_number(bottom.get("vMps")) is None
        or isinstance(layer_count, bool)
        or not isinstance(layer_count, int)
        or layer_count < 1
    ):
        _fail("SHADOW_VECTOR_PROOF_INVALID")

    vector_commitment_sha256 = _sha256({
        "schemaVersion": 1,
        "contractId": VECTOR_COMMITMENT_CONTRACT_ID,
        "partId": part_id,
        "collection": REQUIRED_COLLECTION,
        "modelRun": model_run,
        "validTime": valid_time,
        "sourceAssetSha256": source_asset_sha256,
        "verticalLayer": bottom["verticalLayer"],
        "verticalLayerRankM": f"{float(bottom['verticalLayerRankM']):.3f}",
        "uMps": f"{float(bottom['uMps']):.5f}",
        "vMps": f"{float(bottom['vMps']):.5f}",
    })
    source_proof_sha256 = _sha256({
        "schemaVersion": 1,
        "contractId": SOURCE_PROOF_CONTRACT_ID,
        "partId": part_id,
        "parentZoneId": part["parentZoneId"],
        "targetPoint": list(part["targetPointIdentity"]),
        "gridPoint": list(_point_identity(grid_point) or ()),
        "distanceKm": f"{declared_distance:.5f}",
        "collection": REQUIRED_COLLECTION,
        "modelRun": model_run,
        "validTime": valid_time,
        "sourceAssetSha256": source_asset_sha256,
        "verticalLayer": bottom["verticalLayer"],
        "verticalLayerRankM": f"{float(bottom['verticalLayerRankM']):.3f}",
        "availableLayerCount": layer_count,
        "privateVectorCommitmentSha256": vector_commitment_sha256,
        "policySha256": policy_sha256,
        "targetRegistrySha256": target_registry_sha256,
    })
    return {
        "modelRun": model_run,
        "modelRunAt": model_run_dt,
        "validTime": valid_time,
        "validTimeAt": valid_time_dt,
        "sourceAssetSha256": source_asset_sha256,
        "sourceProofSha256": source_proof_sha256,
        "vectorCommitmentSha256": vector_commitment_sha256,
    }


def _samples_by_part(
    shadow: dict[str, Any],
    gaps: list[dict[str, str]],
    bound_parts: dict[str, dict[str, Any]],
    policy_sha256: str,
    target_registry_sha256: str,
    ledger_sources: dict[tuple[str, str, str], dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    candidate_times: dict[str, set[str]] = {part_id: set() for part_id in bound_parts}
    for gap in gaps:
        _, gap_dt = _exact_utc_hour(gap["validTime"], "DMI_GAP_TIME_INVALID")
        for age in range(0, MAXIMUM_HOLD_HOURS + 1):
            source_time = gap_dt - timedelta(hours=age)
            candidate_times[gap["partId"]].add(
                source_time.strftime("%Y-%m-%dT%H:00:00Z")
            )

    anchors = shadow["anchors"]
    result: dict[str, dict[str, Any]] = {}
    for part_id, part in bound_parts.items():
        if part.get("regionalEvidenceEligible") is False:
            result[part_id] = {
                "validated": [],
                "sourceMismatchTimes": set(),
            }
            continue
        anchor = anchors.get(f"{TARGET_PREFIX}{part_id}")
        raw_samples = _validate_anchor(anchor, part, part_id)
        validated: list[dict[str, Any]] = []
        source_mismatch_times: set[str] = set()
        seen_sample_keys: set[str] = set()
        for raw_sample in raw_samples:
            if not isinstance(raw_sample, dict):
                _fail("SHADOW_SAMPLE_INVALID")
            sample_time = canonical_time(raw_sample.get("validTime"))
            if sample_time is None:
                _fail("SHADOW_SOURCE_BINDING_INVALID")
            if sample_time not in candidate_times[part_id]:
                continue
            try:
                sample = _validated_sample(
                    raw_sample,
                    part_id=part_id,
                    part=part,
                    policy_sha256=policy_sha256,
                    target_registry_sha256=target_registry_sha256,
                    ledger_sources=ledger_sources,
                )
            except RegionalCurrentOperationalError as error:
                if error.code != "SHADOW_SOURCE_ASSET_HASH_MISMATCH":
                    raise
                # A revised official asset legitimately leaves an older byte-bound
                # sample beside its replacement.  Defer the mismatch: it is fatal
                # only when no currently ledger-bound exact/hold source can win.
                source_mismatch_times.add(sample_time)
                continue
            sample_key = str(raw_sample.get("sampleKey") or "")
            if sample_key in seen_sample_keys:
                _fail("SHADOW_SAMPLE_AMBIGUOUS")
            seen_sample_keys.add(sample_key)
            validated.append(sample)
        result[part_id] = {
            "validated": validated,
            "sourceMismatchTimes": source_mismatch_times,
        }
    return result


def _classify_pairs(
    gaps: list[dict[str, str]],
    samples_by_part: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for gap in gaps:
        part_id = gap["partId"]
        valid_time, gap_dt = _exact_utc_hour(gap["validTime"], "DMI_GAP_TIME_INVALID")
        part_samples = samples_by_part.get(part_id) or {}
        candidates = part_samples.get("validated") or []
        source_mismatch_times = part_samples.get("sourceMismatchTimes") or set()
        exact = [sample for sample in candidates if sample["validTime"] == valid_time]
        if exact:
            selected = max(exact, key=lambda row: (row["modelRun"], row["sourceAssetSha256"]))
            rows.append({
                "partId": part_id,
                "validTime": valid_time,
                "classification": REGIONAL_DMI_NATIVE,
                "sourceValidTime": selected["validTime"],
                "sourceModelRun": selected["modelRun"],
                "sourceAssetSha256": selected["sourceAssetSha256"],
                "sourceProofSha256": selected["sourceProofSha256"],
                "vectorCommitmentSha256": selected["vectorCommitmentSha256"],
            })
            continue
        prior: list[tuple[int, dict[str, Any]]] = []
        for sample in candidates:
            age_seconds = (gap_dt - sample["validTimeAt"]).total_seconds()
            if age_seconds % 3600:
                continue
            age_hours = int(age_seconds // 3600)
            if 1 <= age_hours <= MAXIMUM_HOLD_HOURS:
                prior.append((age_hours, sample))
        if prior:
            age_hours, selected = min(
                prior,
                key=lambda item: (
                    item[0],
                    -item[1]["modelRunAt"].timestamp(),
                    item[1]["sourceAssetSha256"],
                ),
            )
            rows.append({
                "partId": part_id,
                "validTime": valid_time,
                "classification": REGIONAL_DMI_DERIVED_HOLD,
                "sourceValidTime": selected["validTime"],
                "sourceModelRun": selected["modelRun"],
                "holdAgeHours": age_hours,
                "sourceAssetSha256": selected["sourceAssetSha256"],
                "sourceProofSha256": selected["sourceProofSha256"],
                "vectorCommitmentSha256": selected["vectorCommitmentSha256"],
            })
        elif any(
            (gap_dt - datetime.fromisoformat(value.replace("Z", "+00:00"))).total_seconds()
            in {0, 3600, 7200, 10800}
            for value in source_mismatch_times
        ):
            _fail("SHADOW_SOURCE_ASSET_HASH_MISMATCH")
        else:
            rows.append({
                "partId": part_id,
                "validTime": valid_time,
                "classification": MISSING,
            })
    return rows


def _nonnegative_int(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        return None
    return value


def _validate_private_proof(private_proof: Any) -> dict[str, Any]:
    if (
        not isinstance(private_proof, dict)
        or set(private_proof) != PRIVATE_PROOF_FIELDS
        or private_proof.get("schemaVersion") != SCHEMA_VERSION
        or private_proof.get("contractId") != PRIVATE_CONTRACT_ID
        or private_proof.get("operationalHourCount") != OPERATIONAL_HOUR_COUNT
        or private_proof.get("configuredPartCount") != EXPECTED_PART_COUNT
        or private_proof.get("nativeCadenceHours") != NATIVE_CADENCE_HOURS
        or private_proof.get("maximumDerivedHoldHours") != MAXIMUM_HOLD_HOURS
        or private_proof.get("coordinatesIncluded") is not False
        or private_proof.get("rawVectorsIncluded") is not False
        or private_proof.get("combinedSealRequired") is not True
        or private_proof.get("publicRuntime") is not False
        or not isinstance(private_proof.get("dmiLedgerContractId"), str)
        or not private_proof.get("dmiLedgerContractId")
    ):
        _fail("PRIVATE_PROOF_INVALID")
    reference_text, reference_dt = _exact_utc_hour(
        private_proof.get("productionReferenceAt"), "PRIVATE_PROOF_INVALID"
    )
    end_text, end_dt = _exact_utc_hour(
        private_proof.get("operationalRangeEndAt"), "PRIVATE_PROOF_INVALID"
    )
    if (
        reference_text != private_proof.get("productionReferenceAt")
        or end_text != private_proof.get("operationalRangeEndAt")
        or end_dt - reference_dt != timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
    ):
        _fail("PRIVATE_PROOF_INVALID")
    hash_fields = (
        "policySha256",
        "targetRegistrySha256",
        "dmiLedgerSha256",
        "dmiAttestationSha256",
        "dmiGapPairsSha256",
        "pairRefsSha256",
    )
    if any(
        not isinstance(private_proof.get(key), str)
        or not _SHA256.fullmatch(private_proof[key])
        for key in hash_fields
    ):
        _fail("PRIVATE_PROOF_INVALID")

    count_fields = (
        "fallbackEligiblePairCount",
        "regionalNativePairCount",
        "regionalDerivedHoldPairCount",
        "missingPairCount",
    )
    counts = {key: _nonnegative_int(private_proof.get(key)) for key in count_fields}
    if any(value is None for value in counts.values()):
        _fail("PRIVATE_PROOF_INVALID")
    total = int(counts["fallbackEligiblePairCount"] or 0)
    if total != sum(
        int(counts[key] or 0)
        for key in (
            "regionalNativePairCount",
            "regionalDerivedHoldPairCount",
            "missingPairCount",
        )
    ):
        _fail("PRIVATE_PROOF_INVALID")
    expected_status = (
        "REGIONAL_EVIDENCE_COMPLETE"
        if counts["missingPairCount"] == 0
        else "REGIONAL_EVIDENCE_INCOMPLETE"
    )
    if private_proof.get("status") != expected_status:
        _fail("PRIVATE_PROOF_INVALID")

    pair_refs = private_proof.get("pairRefs")
    if not isinstance(pair_refs, list) or len(pair_refs) != total:
        _fail("PRIVATE_PROOF_INVALID")
    normalized_pairs: list[dict[str, str]] = []
    classifications = {
        REGIONAL_DMI_NATIVE: 0,
        REGIONAL_DMI_DERIVED_HOLD: 0,
        MISSING: 0,
    }
    previous_identity: tuple[str, str] | None = None
    for row in pair_refs:
        if not isinstance(row, dict):
            _fail("PRIVATE_PROOF_INVALID")
        part_id = str(row.get("partId") or "").strip()
        valid_time, valid_dt = _exact_utc_hour(
            row.get("validTime"), "PRIVATE_PROOF_INVALID"
        )
        classification = row.get("classification")
        if (
            not part_id
            or row.get("partId") != part_id
            or classification not in classifications
            or valid_dt < reference_dt
            or valid_dt > end_dt
        ):
            _fail("PRIVATE_PROOF_INVALID")
        identity = (valid_time, part_id)
        if previous_identity is not None and identity <= previous_identity:
            _fail("PRIVATE_PROOF_INVALID")
        previous_identity = identity
        normalized_pairs.append({"partId": part_id, "validTime": valid_time})
        classifications[classification] += 1
        if classification == MISSING:
            if set(row) != {"partId", "validTime", "classification"}:
                _fail("PRIVATE_PROOF_INVALID")
            continue
        expected_fields = {
            "partId",
            "validTime",
            "classification",
            "sourceValidTime",
            "sourceModelRun",
            "sourceAssetSha256",
            "sourceProofSha256",
            "vectorCommitmentSha256",
        }
        if classification == REGIONAL_DMI_DERIVED_HOLD:
            expected_fields.add("holdAgeHours")
        if set(row) != expected_fields:
            _fail("PRIVATE_PROOF_INVALID")
        source_time, source_dt = _exact_utc_hour(
            row.get("sourceValidTime"), "PRIVATE_PROOF_INVALID"
        )
        _, model_run_dt = _exact_utc_hour(
            row.get("sourceModelRun"), "PRIVATE_PROOF_INVALID"
        )
        if (
            model_run_dt > source_dt
            or not isinstance(row.get("sourceAssetSha256"), str)
            or not _SHA256.fullmatch(row["sourceAssetSha256"])
            or not isinstance(row.get("sourceProofSha256"), str)
            or not _SHA256.fullmatch(row["sourceProofSha256"])
            or not isinstance(row.get("vectorCommitmentSha256"), str)
            or not _SHA256.fullmatch(row["vectorCommitmentSha256"])
        ):
            _fail("PRIVATE_PROOF_INVALID")
        if classification == REGIONAL_DMI_NATIVE:
            if source_time != valid_time:
                _fail("PRIVATE_PROOF_INVALID")
        else:
            age = _nonnegative_int(row.get("holdAgeHours"))
            if (
                age is None
                or age < 1
                or age > MAXIMUM_HOLD_HOURS
                or valid_dt - source_dt != timedelta(hours=age)
            ):
                _fail("PRIVATE_PROOF_INVALID")

    if (
        classifications[REGIONAL_DMI_NATIVE] != counts["regionalNativePairCount"]
        or classifications[REGIONAL_DMI_DERIVED_HOLD]
            != counts["regionalDerivedHoldPairCount"]
        or classifications[MISSING] != counts["missingPairCount"]
    ):
        _fail("PRIVATE_PROOF_INVALID")
    try:
        computed_gap_sha256 = part_time_pairs_sha256(normalized_pairs)
    except (TypeError, ValueError):
        _fail("PRIVATE_PROOF_INVALID")
    computed_refs_sha256 = _sha256({
        "schemaVersion": 1,
        "contractId": PAIR_REFS_CONTRACT_ID,
        "pairRefs": pair_refs,
    })
    if (
        private_proof.get("dmiGapPairsSha256") != computed_gap_sha256
        or private_proof.get("pairRefsSha256") != computed_refs_sha256
    ):
        _fail("PRIVATE_PROOF_INVALID")
    return private_proof


def safe_regional_current_operational_projection(
    private_proof: Any,
) -> dict[str, Any]:
    """Project only aggregate counts and cryptographic bindings."""
    private_proof = _validate_private_proof(private_proof)
    projection = {
        "schemaVersion": SCHEMA_VERSION,
        "contractId": SAFE_CONTRACT_ID,
        "status": private_proof.get("status"),
        "productionReferenceAt": private_proof.get("productionReferenceAt"),
        "operationalRangeEndAt": private_proof.get("operationalRangeEndAt"),
        "operationalHourCount": private_proof.get("operationalHourCount"),
        "configuredPartCount": private_proof.get("configuredPartCount"),
        "fallbackEligiblePairCount": private_proof.get("fallbackEligiblePairCount"),
        "regionalNativePairCount": private_proof.get("regionalNativePairCount"),
        "regionalDerivedHoldPairCount": private_proof.get("regionalDerivedHoldPairCount"),
        "missingPairCount": private_proof.get("missingPairCount"),
        "policySha256": private_proof.get("policySha256"),
        "targetRegistrySha256": private_proof.get("targetRegistrySha256"),
        "dmiLedgerSha256": private_proof.get("dmiLedgerSha256"),
        "dmiAttestationSha256": private_proof.get("dmiAttestationSha256"),
        "dmiGapPairsSha256": private_proof.get("dmiGapPairsSha256"),
        "pairRefsSha256": private_proof.get("pairRefsSha256"),
        "partIdsIncluded": False,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
        "sourceAssetIdsIncluded": False,
        "combinedSealRequired": True,
    }
    if set(projection) != SAFE_PROJECTION_FIELDS:
        _fail("SAFE_PROJECTION_INVALID")
    if any(
        not isinstance(projection.get(key), str)
        or not _SHA256.fullmatch(str(projection.get(key)))
        for key in (
            "policySha256",
            "targetRegistrySha256",
            "dmiLedgerSha256",
            "dmiAttestationSha256",
            "dmiGapPairsSha256",
            "pairRefsSha256",
        )
    ):
        _fail("SAFE_PROJECTION_INVALID")
    return projection


def build_regional_current_operational_evidence(
    *,
    policy: dict[str, Any],
    targets: list[dict[str, Any]],
    current_shadow: dict[str, Any],
    dmi_ledger: dict[str, Any],
    dmi_attestation: dict[str, Any],
    locked_reference: Any,
    dmi_gap_pairs: list[dict[str, Any]],
    allow_target_rebinding_as_missing: bool = False,
) -> dict[str, dict[str, Any]]:
    """Build private dispositions and a separate privacy-safe projection.

    ``dmi_gap_pairs`` is deliberately an input, not derived here.  Every pair
    must be both in the exact eight-part policy and in the validated official
    DMI operational complement.  A future caller must additionally restrict
    this input to the pairs for which Copernicus has already failed.
    """
    reference_text, reference_dt = _exact_utc_hour(
        locked_reference, "LOCKED_REFERENCE_INVALID"
    )
    range_end_dt = reference_dt + timedelta(hours=OPERATIONAL_END_OFFSET_HOURS)
    range_end_text = range_end_dt.strftime("%Y-%m-%dT%H:00:00Z")
    bound_parts, policy_sha256, target_registry_sha256 = _policy_and_target_binding(
        policy,
        targets,
        allow_target_rebinding_as_missing=allow_target_rebinding_as_missing,
    )
    if not isinstance(dmi_ledger, dict) or not isinstance(dmi_attestation, dict):
        _fail("LEDGER_ATTESTATION_INVALID")
    try:
        validated_ledger = validate_current_operational_ledger(
            dmi_ledger,
            dmi_attestation,
            targets,
            reference_text,
            range_end_text,
            target_registry_sha256,
        )
    except (TypeError, ValueError):
        _fail("LEDGER_ATTESTATION_INVALID")
    if not isinstance(validated_ledger, dict):
        _fail("LEDGER_ATTESTATION_INVALID")

    gaps, gaps_sha256 = _normalize_gap_pairs(
        dmi_gap_pairs, bound_parts, reference_dt, validated_ledger
    )
    shadow = _validate_shadow_header(current_shadow)
    ledger_sources = _ledger_source_index(validated_ledger)
    samples = _samples_by_part(
        shadow,
        gaps,
        bound_parts,
        policy_sha256,
        target_registry_sha256,
        ledger_sources,
    )
    pair_refs = _classify_pairs(gaps, samples)
    native_count = sum(
        row["classification"] == REGIONAL_DMI_NATIVE for row in pair_refs
    )
    hold_count = sum(
        row["classification"] == REGIONAL_DMI_DERIVED_HOLD for row in pair_refs
    )
    missing_count = sum(row["classification"] == MISSING for row in pair_refs)
    if native_count + hold_count + missing_count != len(gaps):
        _fail("PAIR_CLASSIFICATION_INCOMPLETE")
    pair_refs_sha256 = _sha256({
        "schemaVersion": 1,
        "contractId": PAIR_REFS_CONTRACT_ID,
        "pairRefs": pair_refs,
    })
    private_proof = {
        "schemaVersion": SCHEMA_VERSION,
        "contractId": PRIVATE_CONTRACT_ID,
        "status": (
            "REGIONAL_EVIDENCE_COMPLETE"
            if missing_count == 0
            else "REGIONAL_EVIDENCE_INCOMPLETE"
        ),
        "productionReferenceAt": reference_text,
        "operationalRangeEndAt": range_end_text,
        "operationalHourCount": OPERATIONAL_HOUR_COUNT,
        "configuredPartCount": EXPECTED_PART_COUNT,
        "nativeCadenceHours": NATIVE_CADENCE_HOURS,
        "maximumDerivedHoldHours": MAXIMUM_HOLD_HOURS,
        "fallbackEligiblePairCount": len(gaps),
        "regionalNativePairCount": native_count,
        "regionalDerivedHoldPairCount": hold_count,
        "missingPairCount": missing_count,
        "policySha256": policy_sha256,
        "targetRegistrySha256": target_registry_sha256,
        "dmiLedgerContractId": validated_ledger.get("contractId"),
        "dmiLedgerSha256": _sha256(validated_ledger),
        "dmiAttestationSha256": _sha256(dmi_attestation),
        "dmiGapPairsSha256": gaps_sha256,
        "pairRefsSha256": pair_refs_sha256,
        "pairRefs": pair_refs,
        "coordinatesIncluded": False,
        "rawVectorsIncluded": False,
        "combinedSealRequired": True,
        "publicRuntime": False,
    }
    return {
        "privateProof": private_proof,
        "safeProjection": safe_regional_current_operational_projection(private_proof),
    }


__all__ = [
    "MISSING",
    "REGIONAL_DMI_DERIVED_HOLD",
    "REGIONAL_DMI_NATIVE",
    "REQUIRED_SOURCE_ASSET_HOOK",
    "RegionalCurrentOperationalError",
    "SAFE_PROJECTION_FIELDS",
    "build_regional_current_operational_evidence",
    "safe_regional_current_operational_projection",
]
