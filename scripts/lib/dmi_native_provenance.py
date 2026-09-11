"""Import-safe verification contract for native DMI component evidence.

The bulk producer, gap-matrix builders and audits must call this module rather
than maintaining weaker local interpretations of a verified DMI row.  It has no
ecCodes, network, filesystem or runtime-data dependencies.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from .dmi_current_processing_compatibility import (
    retained_current_processing_signature_compatible,
)

from .dmi_wind_reference import WIND_VECTOR_VERSION, WIND_VECTOR_REFERENCE, WIND_VECTOR_TRANSFORMS


SPATIAL_PROVENANCE_VERSION = 1
CURRENT_VECTOR_SEMANTICS_VERSION = 3
CURRENT_VECTOR_SELECTION = (
    "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer"
)
CURRENT_PREFERRED_DISTANCE_KM = 3.0
CURRENT_MAX_DISTANCE_KM = 5.0
# DMI documents an approximately 1 km WAM-DW grid and approximately 5 km
# WAM-NSB grid. These hard bounds allow a bounded coastal wet-cell mask margin
# without permitting the generic 24-40 km marine search radii to become
# last-mile wave provenance.
WAM_MAX_DISTANCE_KM = {
    "wam_dw": 2.0,
    "wam_nsb": 8.0,
}

MARINE_COLLECTIONS = frozenset({"dkss_idw", "dkss_nsbs", "dkss_lf"})
COLLECTION_FAMILY = {
    "dkss_idw": "marine",
    "dkss_nsbs": "marine",
    "dkss_lf": "marine",
    "harmonie_dini_sf": "wind",
    "wam_dw": "wave",
    "wam_nsb": "wave",
}
COMPONENT_COLLECTIONS = {
    "current": MARINE_COLLECTIONS,
    "windTail": MARINE_COLLECTIONS,
    "waterLevel": MARINE_COLLECTIONS,
    "waterTemperature": MARINE_COLLECTIONS,
    "wind": frozenset({"harmonie_dini_sf"}),
    "wave": frozenset({"wam_dw", "wam_nsb"}),
}
COMPONENT_FIELD_SET = {
    "current": ("current-u", "current-v"),
    "wind": ("wind-u-10m", "wind-v-10m"),
    "windTail": ("wind-tail-u-10m", "wind-tail-v-10m"),
    "wave": ("significant-wave-height", "dominant-wave-period"),
    "waterLevel": ("sea-mean-deviation",),
    "waterTemperature": ("water-temperature",),
}
COMPONENT_KIND = {
    "current": "ocean-current-vector",
    "wind": "atmospheric-wind-vector",
    "windTail": "marine-wind-tail-vector",
    "wave": "wave-mobilisation-tuple",
    "waterLevel": "marine-water-level-scalar",
    "waterTemperature": "marine-water-temperature-scalar",
}
COMPONENT_SPATIAL_SELECTION = {
    "current": "nearest-shared-grid-cell-no-spatial-interpolation",
    "wind": "nearest-shared-grid-cell-no-spatial-interpolation",
    "windTail": "nearest-shared-grid-cell-no-spatial-interpolation",
    "wave": "nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation",
    "waterLevel": "nearest-valid-grid-cell-no-spatial-interpolation",
    "waterTemperature": "nearest-valid-grid-cell-no-spatial-interpolation",
}
_SHA256 = re.compile(r"[0-9a-f]{64}")
HASH_PREFIX = "sha256:"
CURRENT_ATTESTATION_CONTRACT_ID = "dmi-canonical-part-current-attestation-v2"
CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID = "dmi-official-dkss-operational-current-ledger-v4"
CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION = 4
CURRENT_OPERATIONAL_NON_FATAL_CODES = frozenset({"RETAINED_CURRENT_PART_TIME"})
DKSS_MAX_FORECAST_LEAD_HOURS = 120
CURRENT_PART_OUTCOME_CONTRACT_ID = "dmi-official-asset-current-part-outcomes-v1"
CURRENT_RETAINED_ASSET_PROOF_CONTRACT_ID = (
    "dmi-retained-current-asset-proof-v1"
)
CURRENT_OPERATIONAL_LEDGER_STATES = (
    "EXPECTED",
    "PROCESSED",
    "VERIFIED",
    "UPSTREAM_ABSENT",
    "LOCALLY_SKIPPED",
)
CURRENT_OFFICIAL_ASSET_FIELDS = frozenset({
    "collection", "modelRun", "validTime", "itemId", "assetIdentitySha256",
    "assetSizeBytes", "itemCreatedAt", "itemUpdatedAt",
})
CURRENT_SOURCE_ASSET_FIELDS = frozenset({
    *CURRENT_OFFICIAL_ASSET_FIELDS,
    "acquiredAt", "contentLengthBytes", "contentSha256",
})


def canonical_time(value: Any) -> str | None:
    if value is None:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return None
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def _canonical_sha256(value: Any) -> str:
    return HASH_PREFIX + hashlib.sha256(_canonical_json(value).encode("utf-8")).hexdigest()


def part_time_pairs_sha256(pairs: Any) -> str:
    """Hash a sanitized part/time matrix using the Copernicus pair contract."""
    if not isinstance(pairs, (list, tuple)):
        raise ValueError("Part/time pair matrix must be an array")
    normalized: list[dict[str, str]] = []
    for raw in pairs:
        if not isinstance(raw, dict):
            raise ValueError("Part/time pair row must be an object")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if not part_id or valid_time is None:
            raise ValueError("Part/time pair identity is invalid")
        normalized.append({"partId": part_id, "validTime": valid_time})
    normalized.sort(key=lambda row: (row["validTime"], row["partId"]))
    identities = [(row["partId"], row["validTime"]) for row in normalized]
    if len(set(identities)) != len(identities):
        raise ValueError("Part/time pair matrix contains duplicates")
    return _canonical_sha256({
        "contractId": "copernicus-required-part-time-pairs-v1",
        "pairs": normalized,
    })


def valid_times_sha256(valid_times: Any) -> str:
    if not isinstance(valid_times, (list, tuple, set, frozenset)):
        raise ValueError("Valid-time ledger must be an array")
    canonical = [canonical_time(value) for value in valid_times]
    if any(value is None for value in canonical):
        raise ValueError("Valid-time ledger contains an invalid time")
    normalized = sorted(str(value) for value in canonical)
    if len(set(normalized)) != len(normalized):
        raise ValueError("Valid-time ledger contains duplicates")
    return _canonical_sha256({
        "contractId": "dmi-official-valid-times-v1",
        "validTimes": normalized,
    })


def verified_source_times_sha256(rows: Any) -> str:
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Verified source-time evidence must be an array")
    normalized: list[dict[str, str]] = []
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Verified source-time row must be an object")
        collection = str(raw.get("collection") or "").strip()
        model_run = canonical_time(raw.get("modelRun"))
        valid_time = canonical_time(raw.get("validTime"))
        if collection not in MARINE_COLLECTIONS or model_run is None or valid_time is None:
            raise ValueError("Verified source-time identity is invalid")
        normalized.append({
            "collection": collection,
            "modelRun": model_run,
            "validTime": valid_time,
        })
    normalized.sort(key=lambda row: (row["validTime"], row["collection"], row["modelRun"]))
    identities = [
        (row["collection"], row["modelRun"], row["validTime"])
        for row in normalized
    ]
    if len(set(identities)) != len(identities):
        raise ValueError("Verified source-time evidence contains duplicates")
    return _canonical_sha256({
        "contractId": "dmi-verified-source-valid-times-v1",
        "sources": normalized,
    })


def canonical_current_source_asset(source: Any) -> dict[str, Any] | None:
    """Project one native current source to its payload-free asset identity."""
    if not isinstance(source, dict):
        return None
    collection = str(source.get("collection") or "").strip()
    model_run = canonical_time(source.get("modelRun"))
    valid_time = canonical_time(
        source.get("validTime")
        if source.get("validTime") is not None
        else source.get("nativeValidTime")
    )
    item_id = str(source.get("itemId") or "").strip()
    asset_sha256 = str(source.get("assetIdentitySha256") or "")
    asset_size = source.get("assetSizeBytes")
    content_length = source.get("contentLengthBytes")
    content_sha256 = str(source.get("contentSha256") or "")
    acquired_at = canonical_time(source.get("acquiredAt"))
    item_created_at = canonical_time(source.get("itemCreatedAt"))
    item_updated_at = canonical_time(source.get("itemUpdatedAt"))
    if not (
        collection in MARINE_COLLECTIONS
        and model_run
        and valid_time
        and item_id
        and _SHA256.fullmatch(asset_sha256)
        and (
            asset_size is None
            or isinstance(asset_size, int) and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and isinstance(content_length, int)
        and not isinstance(content_length, bool)
        and content_length > 0
        and _SHA256.fullmatch(content_sha256)
        and (asset_size is None or asset_size == content_length)
        and acquired_at
        and (source.get("itemCreatedAt") is None or item_created_at)
        and (source.get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    return {
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": item_id,
        "assetIdentitySha256": asset_sha256,
        "assetSizeBytes": asset_size,
        "acquiredAt": acquired_at,
        "contentLengthBytes": content_length,
        "contentSha256": content_sha256,
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }


def current_search_semantics() -> dict[str, Any]:
    """Return the payload-free current search contract bound into outcomes."""
    return {
        "spatialProvenanceVersion": SPATIAL_PROVENANCE_VERSION,
        "spatialSelection": COMPONENT_SPATIAL_SELECTION["current"],
        "vectorSelection": CURRENT_VECTOR_SELECTION,
        "vectorSemanticsVersion": CURRENT_VECTOR_SEMANTICS_VERSION,
        "maximumDistanceKm": CURRENT_MAX_DISTANCE_KM,
    }


def current_source_asset_sha256(source: Any) -> str:
    canonical = canonical_current_source_asset(source)
    if canonical is None:
        raise ValueError("Current outcome source asset is invalid")
    return _canonical_sha256({
        "contractId": "dmi-current-source-asset-content-v1",
        "source": canonical,
    })


def build_current_part_outcome_proof(
    spatial_unavailable_part_ids: Any,
    target_ids: Any,
    target_registry_sha256: Any,
    processing_signature: Any,
    source_asset: Any,
) -> dict[str, Any]:
    """Bind one processed official asset to an exact target outcome partition."""
    if not isinstance(target_ids, (list, tuple)):
        raise ValueError("Current outcome target ids are malformed")
    canonical_targets = sorted(str(value or "").strip() for value in target_ids)
    if (
        any(not value for value in canonical_targets)
        or len(set(canonical_targets)) != len(canonical_targets)
    ):
        raise ValueError("Current outcome target ids are invalid")
    if not isinstance(spatial_unavailable_part_ids, (list, tuple)):
        raise ValueError("Current spatial-unavailable ids are malformed")
    unavailable = sorted(str(value or "").strip() for value in spatial_unavailable_part_ids)
    if (
        any(not value for value in unavailable)
        or len(set(unavailable)) != len(unavailable)
        or not set(unavailable) <= set(canonical_targets)
    ):
        raise ValueError("Current spatial-unavailable ids are invalid")
    registry_sha256 = str(target_registry_sha256 or "")
    signature = str(processing_signature or "")
    if (
        not re.fullmatch(r"sha256:[0-9a-f]{64}", registry_sha256)
        or not signature
        or signature != signature.strip()
    ):
        raise ValueError("Current outcome processing identity is invalid")
    proof = {
        "contractId": CURRENT_PART_OUTCOME_CONTRACT_ID,
        "targetRegistrySha256": registry_sha256,
        "targetCount": len(canonical_targets),
        "processingSignature": signature,
        "sourceAssetSha256": current_source_asset_sha256(source_asset),
        "searchSemantics": current_search_semantics(),
        "spatialUnavailablePartCount": len(unavailable),
        "verifiedDmiPartCount": len(canonical_targets) - len(unavailable),
        "spatialUnavailablePartIds": unavailable,
    }
    return {
        **proof,
        "outcomesSha256": _canonical_sha256({
            "contractId": "dmi-official-asset-current-part-outcome-proof-v1",
            "proof": proof,
        }),
    }


def validate_current_part_outcome_proof(
    proof: Any,
    target_ids: Any,
    target_registry_sha256: Any,
    processing_signature: Any,
    source_asset: Any,
) -> dict[str, Any]:
    if not isinstance(proof, dict):
        raise ValueError("Current part outcome proof is missing")
    expected = build_current_part_outcome_proof(
        proof.get("spatialUnavailablePartIds"),
        target_ids,
        target_registry_sha256,
        processing_signature,
        source_asset,
    )
    if proof != expected:
        raise ValueError("Current part outcome proof is not canonical")
    return expected


def _part_ids_sha256(part_ids: Any) -> str:
    if not isinstance(part_ids, (list, tuple)):
        raise ValueError("Retained current part ids must be an array")
    normalized = sorted(str(value or "").strip() for value in part_ids)
    if any(not value for value in normalized) or len(set(normalized)) != len(
        normalized
    ):
        raise ValueError("Retained current part ids are invalid")
    return _canonical_sha256({
        "contractId": "dmi-retained-current-attested-parts-v1",
        "partIds": normalized,
    })


def build_retained_current_asset_proof(
    source_asset: Any,
    processing_signature: Any,
    part_outcome_proof: Any,
    attested_part_ids: Any,
    target_ids: Any,
    target_registry_sha256: Any,
) -> dict[str, Any]:
    """Bind prior actual attested rows to their canonical processed asset proof."""
    source = canonical_current_source_asset(source_asset)
    signature = str(processing_signature or "")
    if source is None or not signature or signature != signature.strip():
        raise ValueError("Retained current source identity is invalid")
    if _epoch(source["validTime"]) < _epoch(source["modelRun"]) or (
        _epoch(source["validTime"]) - _epoch(source["modelRun"])
    ) > DKSS_MAX_FORECAST_LEAD_HOURS * 3600:
        raise ValueError("Retained current source lead time is invalid")
    canonical_targets = sorted(str(value or "").strip() for value in target_ids)
    if (
        any(not value for value in canonical_targets)
        or len(set(canonical_targets)) != len(canonical_targets)
    ):
        raise ValueError("Retained current target ids are invalid")
    attested = sorted(str(value or "").strip() for value in attested_part_ids)
    if (
        not attested
        or any(not value for value in attested)
        or len(set(attested)) != len(attested)
        or not set(attested) <= set(canonical_targets)
    ):
        raise ValueError("Retained current attested part ids are invalid")
    outcome = validate_current_part_outcome_proof(
        part_outcome_proof,
        canonical_targets,
        target_registry_sha256,
        signature,
        source,
    )
    if set(attested) & set(outcome["spatialUnavailablePartIds"]):
        raise ValueError("Retained current attestation contradicts outcome proof")
    return {
        "contractId": CURRENT_RETAINED_ASSET_PROOF_CONTRACT_ID,
        "sourceAsset": source,
        "processingSignature": signature,
        "partOutcomeProof": outcome,
        "attestedPartCount": len(attested),
        "attestedPartIdsSha256": _part_ids_sha256(attested),
        "attestedPartIds": attested,
    }


def validate_retained_current_asset_proofs(
    rows: Any,
    target_ids: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> list[dict[str, Any]]:
    """Validate bounded carry-forward proof from an earlier accepted ledger."""
    if rows is None:
        rows = []
    if not isinstance(rows, list):
        raise ValueError("Retained current asset proofs must be an array")
    start, end = _exact_hour_bounds(range_start, range_end)
    normalized: list[dict[str, Any]] = []
    identities: set[str] = set()
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Retained current asset proof is malformed")
        expected = build_retained_current_asset_proof(
            raw.get("sourceAsset"),
            raw.get("processingSignature"),
            raw.get("partOutcomeProof"),
            raw.get("attestedPartIds"),
            target_ids,
            target_registry_sha256,
        )
        if raw != expected:
            raise ValueError("Retained current asset proof is not canonical")
        valid_time = datetime.fromisoformat(
            expected["sourceAsset"]["validTime"].replace("Z", "+00:00")
        )
        if valid_time < start or valid_time > end:
            raise ValueError("Retained current asset proof is out of range")
        identity = _canonical_json(expected["sourceAsset"])
        if identity in identities:
            raise ValueError("Retained current asset proof is duplicated")
        identities.add(identity)
        normalized.append(expected)
    normalized.sort(key=lambda row: (
        row["sourceAsset"]["validTime"],
        row["sourceAsset"]["collection"],
        row["sourceAsset"]["modelRun"],
        row["sourceAsset"]["itemId"],
        row["sourceAsset"]["contentSha256"],
    ))
    if rows != normalized:
        raise ValueError("Retained current asset proofs are not canonical")
    return normalized


def retained_current_asset_proofs_sha256(rows: Any) -> str:
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Retained current asset proofs must be an array")
    return _canonical_sha256({
        "contractId": "dmi-retained-current-asset-proofs-v1",
        "proofs": list(rows),
    })


def derive_current_part_outcome_partition(
    collections: Any,
    target_ids: Any,
    valid_times: Any,
    *,
    allow_local_unavailable: bool = False,
) -> dict[str, list[dict[str, str]]]:
    """Derive the exact DMI/current partition from per-asset outcomes.

    A locally unavailable asset is never presented as upstream absence or as a
    verified DMI value. Acquisition controllers may opt in to treating it as
    an exact fallback gap; the strict READY validator deliberately does not.
    """
    if not isinstance(collections, (list, tuple)):
        raise ValueError("Current outcome collections are malformed")
    by_collection = {
        str(row.get("collection") or ""): {
            str(item.get("validTime") or ""): item
            for item in (row.get("validTimes") or [])
            if isinstance(item, dict)
        }
        for row in collections
        if isinstance(row, dict)
    }
    if set(by_collection) != set(MARINE_COLLECTIONS):
        raise ValueError("Current outcome collection partition is incomplete")
    canonical_targets = sorted(str(value or "").strip() for value in target_ids)
    canonical_times = [canonical_time(value) for value in valid_times]
    if (
        any(not value for value in canonical_targets)
        or len(set(canonical_targets)) != len(canonical_targets)
        or any(value is None for value in canonical_times)
        or len(set(canonical_times)) != len(canonical_times)
    ):
        raise ValueError("Current outcome matrix identity is invalid")
    result = {
        "verifiedPairs": [],
        "upstreamAbsencePairs": [],
        "spatialUnavailablePairs": [],
        "operationalComplementPairs": [],
    }
    unavailable_by_collection_time = {
        (collection, valid_time): set(
            (row.get("partOutcomeProof") or {}).get(
                "spatialUnavailablePartIds"
            ) or []
        )
        for collection, rows in by_collection.items()
        for valid_time, row in rows.items()
        if isinstance(row, dict)
    }
    for valid_time in canonical_times:
        assert valid_time is not None
        for part_id in canonical_targets:
            outcomes: list[str] = []
            for collection in sorted(MARINE_COLLECTIONS):
                row = by_collection[collection].get(valid_time)
                if not isinstance(row, dict):
                    raise ValueError("Current outcome valid-time partition is incomplete")
                state = row.get("state")
                if state == "UPSTREAM_ABSENT":
                    outcomes.append("OFFICIAL_TIME_ABSENT")
                    continue
                proof = row.get("partOutcomeProof")
                if state in {"EXPECTED", "LOCALLY_SKIPPED"}:
                    if not allow_local_unavailable:
                        raise ValueError("Current outcome contains unfinished local work")
                    outcomes.append("DMI_LOCAL_UNAVAILABLE")
                    continue
                if state not in {"PROCESSED", "VERIFIED"} or not isinstance(proof, dict):
                    raise ValueError("Current outcome contains unfinished local work")
                if part_id in unavailable_by_collection_time.get(
                    (collection, valid_time), ()
                ):
                    outcomes.append("DMI_SPATIAL_UNAVAILABLE")
                else:
                    outcomes.append("VERIFIED_DMI")
            pair = {"partId": part_id, "validTime": valid_time}
            if "VERIFIED_DMI" in outcomes:
                result["verifiedPairs"].append(pair)
            elif all(outcome == "OFFICIAL_TIME_ABSENT" for outcome in outcomes):
                result["upstreamAbsencePairs"].append(pair)
                result["operationalComplementPairs"].append(pair)
            elif all(
                outcome in {"OFFICIAL_TIME_ABSENT", "DMI_SPATIAL_UNAVAILABLE"}
                for outcome in outcomes
            ):
                result["spatialUnavailablePairs"].append(pair)
                result["operationalComplementPairs"].append(pair)
            elif allow_local_unavailable and all(
                outcome in {
                    "OFFICIAL_TIME_ABSENT",
                    "DMI_SPATIAL_UNAVAILABLE",
                    "DMI_LOCAL_UNAVAILABLE",
                }
                for outcome in outcomes
            ):
                result["operationalComplementPairs"].append(pair)
            else:
                raise ValueError("Current outcome partition is ambiguous")
    return result


def exact_current_operational_complement(
    target_ids: Any,
    valid_times: Any,
    verified_pairs: Any,
) -> list[dict[str, str]]:
    """Return the unbounded exact matrix inverse of actual DMI attestation."""
    if not isinstance(target_ids, (list, tuple)) or not isinstance(
        valid_times, (list, tuple)
    ) or not isinstance(verified_pairs, (list, tuple)):
        raise ValueError("Current operational matrix is malformed")
    targets = sorted(str(value or "").strip() for value in target_ids)
    times = sorted(
        str(value) for value in (canonical_time(value) for value in valid_times)
        if value is not None
    )
    if (
        len(targets) != len(target_ids)
        or any(not value for value in targets)
        or len(set(targets)) != len(targets)
        or len(times) != len(valid_times)
        or len(set(times)) != len(times)
    ):
        raise ValueError("Current operational matrix identity is invalid")
    matrix = {(part_id, valid_time) for valid_time in times for part_id in targets}
    verified: set[tuple[str, str]] = set()
    for raw in verified_pairs:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime"}:
            raise ValueError("Verified current pair is malformed")
        identity = (
            str(raw.get("partId") or "").strip(),
            str(canonical_time(raw.get("validTime")) or ""),
        )
        if identity not in matrix or identity in verified:
            raise ValueError("Verified current pair is outside the exact matrix")
        verified.add(identity)
    return [
        {"partId": part_id, "validTime": valid_time}
        for valid_time in times
        for part_id in targets
        if (part_id, valid_time) not in verified
    ]


def current_pair_sources_sha256(rows: Any) -> str:
    """Hash exact part→selected-source identities, including acquisition."""
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Verified part/source matrix must be an array")
    normalized: list[dict[str, Any]] = []
    for raw in rows:
        if not isinstance(raw, dict):
            raise ValueError("Verified part/source row must be an object")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        source = canonical_current_source_asset(raw.get("source"))
        if not part_id or valid_time is None or source is None or source["validTime"] != valid_time:
            raise ValueError("Verified part/source identity is invalid")
        normalized.append({"partId": part_id, "validTime": valid_time, "source": source})
    normalized.sort(key=lambda row: (row["validTime"], row["partId"], _canonical_json(row["source"])))
    identities = [
        (row["partId"], row["validTime"])
        for row in normalized
    ]
    if len(set(identities)) != len(identities):
        raise ValueError("Verified part/source matrix contains duplicate part-times")
    return _canonical_sha256({
        "contractId": "dmi-verified-part-current-sources-v2",
        "pairs": normalized,
    })


def current_official_assets_sha256(rows: Any) -> str:
    """Hash a selected collection/run's sanitized official STAC identities."""
    if not isinstance(rows, (list, tuple)):
        raise ValueError("Official asset ledger must be an array")
    normalized = sorted(rows, key=lambda row: (str(row.get("validTime") or ""), str(row.get("itemId") or "")))
    return _canonical_sha256({
        "contractId": "dmi-selected-official-assets-v1",
        "assets": normalized,
    })


def _epoch(value: Any) -> float:
    canonical = canonical_time(value)
    if canonical is None:
        return 0.0
    return datetime.fromisoformat(canonical.replace("Z", "+00:00")).timestamp()


def _finite_point(value: Any) -> list[float] | None:
    if not (
        isinstance(value, (list, tuple))
        and len(value) == 2
        and all(isinstance(item, (int, float)) and not isinstance(item, bool) for item in value)
        and all(math.isfinite(float(item)) for item in value)
    ):
        return None
    return [float(value[0]), float(value[1])]


def same_point(first: Any, second: Any, tolerance: float = 1e-7) -> bool:
    left, right = _finite_point(first), _finite_point(second)
    return bool(
        left is not None
        and right is not None
        and all(abs(left[index] - right[index]) <= tolerance for index in range(2))
    )


def haversine_point_km(first: Any, second: Any) -> float | None:
    left, right = _finite_point(first), _finite_point(second)
    if left is None or right is None:
        return None
    longitude1, latitude1 = left
    longitude2, latitude2 = right
    latitude_delta = math.radians(latitude2 - latitude1)
    longitude_delta = math.radians(longitude2 - longitude1)
    a = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(math.radians(latitude1))
        * math.cos(math.radians(latitude2))
        * math.sin(longitude_delta / 2) ** 2
    )
    return 6371.0088 * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def component_collection_allowed(component: str, collection: str) -> bool:
    return collection in COMPONENT_COLLECTIONS.get(component, ())


def wave_distance_allowed(collection: Any, distance_km: Any) -> bool:
    maximum = WAM_MAX_DISTANCE_KM.get(str(collection or ""))
    return bool(
        maximum is not None
        and isinstance(distance_km, (int, float))
        and not isinstance(distance_km, bool)
        and math.isfinite(float(distance_km))
        and 0 <= float(distance_km) <= maximum
    )


def sampling_identity(zone: dict[str, Any]) -> dict[str, Any] | None:
    entity_id = str(zone.get("id") or "").strip()
    sampling_point = _finite_point([zone.get("lon"), zone.get("lat")])
    if not entity_id or sampling_point is None:
        return None
    if entity_id.startswith("PART::"):
        parent_zone_id = str(zone.get("parentZoneId") or "").strip()
        if not parent_zone_id:
            return None
        entity_type = "coastal-part"
        sampling_context = "coastal-part-water-point"
    elif zone.get("waterSource"):
        parent_zone_id = entity_id
        entity_type = "water-level-source"
        sampling_context = "water-level-source-point"
    elif zone.get("privateStage"):
        parent_zone_id = str(zone.get("parentZoneId") or entity_id)
        entity_type = "private-stage"
        sampling_context = "private-stage-water-point"
    elif zone.get("researchCurrent"):
        parent_zone_id = str(zone.get("parentZoneId") or entity_id)
        entity_type = "private-research"
        sampling_context = "private-research-water-point"
    else:
        parent_zone_id = entity_id
        entity_type = "parent-zone"
        sampling_context = "parent-zone-water-point"
    return {
        "entityId": entity_id,
        "parentZoneId": parent_zone_id,
        "entityType": entity_type,
        "samplingContext": sampling_context,
        "samplingPoint": [round(sampling_point[0], 7), round(sampling_point[1], 7)],
    }


def complete_native_source_for_hour(
    source: Any,
    component: str,
    entity_id: str,
    entity: dict[str, Any],
    valid_time: str,
) -> bool:
    """Verify one component source against one exact entity/native UTC time.

    For a current gap matrix the caller must additionally require finite U and V
    on the same row whose time equals ``valid_time``.  This function verifies the
    complete source, entity, temporal, cell, distance, item and vector proof.
    """
    if not isinstance(source, dict):
        return False
    collection = str(source.get("collection") or "")
    if component not in COMPONENT_FIELD_SET or not component_collection_allowed(component, collection):
        return False
    temporal = canonical_time(valid_time)
    model_run = canonical_time(source.get("modelRun"))
    native_valid = canonical_time(source.get("nativeValidTime"))
    sampling_point = source.get("samplingPoint")
    grid_point = source.get("gridPoint")
    physical_distance = haversine_point_km(sampling_point, grid_point)
    distance = source.get("distanceKm")
    expected_optional = source.get("optionalFieldSet") in ([], ["mean-wave-dir"])
    if component != "wave":
        expected_optional = source.get("optionalFieldSet") == []
    common_valid = bool(
        temporal
        and model_run
        and native_valid == temporal
        and _epoch(native_valid) >= _epoch(model_run)
        and source.get("provider") == "dmi"
        and source.get("fallback") is False
        and source.get("component") == component
        and source.get("componentKind") == COMPONENT_KIND[component]
        and source.get("fieldSet") == list(COMPONENT_FIELD_SET[component])
        and expected_optional
        and source.get("collectionFamily") == COLLECTION_FAMILY.get(collection)
        and source.get("entityId") == entity_id
        and source.get("parentZoneId") == entity.get("parentZoneId")
        and source.get("entityType") == entity.get("entityType")
        and source.get("samplingContext") == entity.get("samplingContext")
        and same_point(sampling_point, entity.get("samplingPoint"))
        and _finite_point(grid_point) is not None
        and _SHA256.fullmatch(str(source.get("gridDefinitionSha256") or ""))
        and isinstance(distance, (int, float))
        and not isinstance(distance, bool)
        and math.isfinite(float(distance))
        and float(distance) >= 0
        and physical_distance is not None
        and math.isclose(float(distance), physical_distance, rel_tol=0, abs_tol=0.02)
        and source.get("spatialSemanticsVersion") == SPATIAL_PROVENANCE_VERSION
        and source.get("spatialSelection") == COMPONENT_SPATIAL_SELECTION[component]
        and isinstance(source.get("leadTimeHours"), (int, float))
        and not isinstance(source.get("leadTimeHours"), bool)
        and math.isfinite(float(source["leadTimeHours"]))
        and math.isclose(
            float(source["leadTimeHours"]),
            (_epoch(native_valid) - _epoch(model_run)) / 3600.0,
            rel_tol=0,
            abs_tol=0.002,
        )
        and str(source.get("itemId") or "").strip()
        and _SHA256.fullmatch(str(source.get("assetIdentitySha256") or ""))
        and canonical_time(source.get("acquiredAt"))
        and (source.get("itemCreatedAt") is None or canonical_time(source.get("itemCreatedAt")))
        and (source.get("itemUpdatedAt") is None or canonical_time(source.get("itemUpdatedAt")))
    )
    if not common_valid:
        return False
    if component == "current":
        return bool(
            canonical_current_source_asset(source) is not None
            and float(source["leadTimeHours"])
                <= DKSS_MAX_FORECAST_LEAD_HOURS + 0.002
            and source.get("vectorSelection") == CURRENT_VECTOR_SELECTION
            and source.get("vectorSemanticsVersion") == CURRENT_VECTOR_SEMANTICS_VERSION
            and str(source.get("verticalLayer") or "").strip()
            and isinstance(source.get("verticalLayerRankM"), (int, float))
            and not isinstance(source.get("verticalLayerRankM"), bool)
            and math.isfinite(float(source["verticalLayerRankM"]))
            and float(distance) <= CURRENT_MAX_DISTANCE_KM
        )
    if component in {"wind", "windTail"}:
        return bool(
            source.get("vectorSelection") == "nearest-shared-grid-cell-no-spatial-interpolation"
            and source.get("vectorSemanticsVersion") == (WIND_VECTOR_VERSION if component == "wind" else 1)
            and (component != "wind" or (
                source.get("vectorReference") == WIND_VECTOR_REFERENCE
                and isinstance(source.get("vectorTransform"), str)
                and source.get("vectorTransform") in WIND_VECTOR_TRANSFORMS
            ))
        )
    if component == "wave":
        return wave_distance_allowed(collection, distance)
    return True


def _verified_part_current_row(
    row: Any,
    target: Any,
    valid_time: Any,
) -> bool:
    if not isinstance(row, dict) or not isinstance(target, dict):
        return False
    part_id = str(target.get("partId") or "").strip()
    parent_zone_id = str(target.get("parentZoneId") or "").strip()
    sampling_point = _finite_point(target.get("waterPoint"))
    expected_time = canonical_time(valid_time)
    if not part_id or not parent_zone_id or sampling_point is None or expected_time is None:
        return False
    parsed_time = datetime.fromisoformat(expected_time.replace("Z", "+00:00"))
    if parsed_time != parsed_time.replace(minute=0, second=0, microsecond=0):
        return False
    entity_id = f"PART::{part_id}"
    entity = {
        "parentZoneId": parent_zone_id,
        "entityType": "coastal-part",
        "samplingContext": "coastal-part-water-point",
        "samplingPoint": sampling_point,
    }
    current_u, current_v = row.get("current-u"), row.get("current-v")
    if not (
        isinstance(current_u, (int, float))
        and not isinstance(current_u, bool)
        and math.isfinite(float(current_u))
        and isinstance(current_v, (int, float))
        and not isinstance(current_v, bool)
        and math.isfinite(float(current_v))
    ):
        return False
    sources = row.get("sources")
    if not isinstance(sources, dict):
        return False
    source = sources.get("current") or {}
    return complete_native_source_for_hour(
        source,
        "current",
        entity_id,
        entity,
        expected_time,
    )


def _exact_hour_bounds(range_start: Any, range_end: Any) -> tuple[datetime, datetime]:
    start_text, end_text = canonical_time(range_start), canonical_time(range_end)
    if start_text is None or end_text is None:
        raise ValueError("Current attestation range must contain UTC timestamps")
    start = datetime.fromisoformat(start_text.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_text.replace("Z", "+00:00"))
    if (
        start != start.replace(minute=0, second=0, microsecond=0)
        or end != end.replace(minute=0, second=0, microsecond=0)
        or end < start
    ):
        raise ValueError("Current attestation range must contain inclusive exact UTC hours")
    return start, end


def _matching_verified_part_current_rows(
    document: Any,
    target: Any,
    range_start: Any,
    range_end: Any,
) -> list[tuple[str, dict[str, Any]]]:
    if not isinstance(document, dict) or not isinstance(target, dict):
        return []
    start, end = _exact_hour_bounds(range_start, range_end)
    part_id = str(target.get("partId") or "").strip()
    zones = document.get("zones")
    zone = zones.get(f"PART::{part_id}") if isinstance(zones, dict) else None
    hourly = zone.get("hourly") if isinstance(zone, dict) else None
    if not part_id or not isinstance(hourly, dict):
        return []
    matched: list[tuple[str, dict[str, Any]]] = []
    seen: set[str] = set()
    for key, row in hourly.items():
        if not isinstance(row, dict):
            continue
        # The cache key, public row time and native source time are three
        # independent temporal claims.  None may silently substitute for
        # another; all must canonicalize to the exact same UTC hour.
        key_time = canonical_time(key)
        row_time = canonical_time(row.get("time"))
        if key_time is None or row_time is None or key_time != row_time or row_time in seen:
            continue
        parsed = datetime.fromisoformat(row_time.replace("Z", "+00:00"))
        if (
            parsed != parsed.replace(minute=0, second=0, microsecond=0)
            or parsed < start
            or parsed > end
            or not _verified_part_current_row(row, target, row_time)
        ):
            continue
        seen.add(row_time)
        matched.append((row_time, row))
    matched.sort(key=lambda item: item[0])
    return matched


def verified_part_current_pair(
    document: Any,
    target: Any,
    valid_time: Any,
) -> bool:
    """Verify one finite same-row coastal-part current pair at one UTC hour."""
    expected_time = canonical_time(valid_time)
    if expected_time is None:
        return False
    try:
        return bool(_matching_verified_part_current_rows(
            document,
            target,
            expected_time,
            expected_time,
        ))
    except ValueError:
        return False


def verified_part_current_pair_for_collection(
    document: Any,
    target: Any,
    valid_time: Any,
    collection: Any,
    model_run: Any,
) -> bool:
    """Bind one verified pair to the selected official DKSS run."""
    expected_time = canonical_time(valid_time)
    expected_run = canonical_time(model_run)
    expected_collection = str(collection or "").strip()
    if (
        expected_time is None
        or expected_run is None
        or expected_collection not in MARINE_COLLECTIONS
    ):
        return False
    try:
        rows = _matching_verified_part_current_rows(
            document,
            target,
            expected_time,
            expected_time,
        )
    except ValueError:
        return False
    for _row_time, row in rows:
        source = ((row.get("sources") or {}).get("current") or {})
        if (
            source.get("collection") == expected_collection
            and canonical_time(source.get("modelRun")) == expected_run
        ):
            return True
    return False


def canonical_verified_part_current_attestation(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    allowed_source_assets: Any = None,
    allowed_retained_pair_sources: Any = None,
) -> dict[str, Any]:
    """Build the one canonical, payload-free current proof used by every gate."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(targets, (list, tuple)):
        raise ValueError("Current attestation targets must be an array")
    normalized_targets: list[tuple[str, dict[str, Any]]] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("Current attestation target must be an object")
        part_id = str(target.get("partId") or "").strip()
        parent_zone_id = str(target.get("parentZoneId") or "").strip()
        if not part_id or not parent_zone_id or _finite_point(target.get("waterPoint")) is None:
            raise ValueError("Current attestation target identity is invalid")
        normalized_targets.append((part_id, target))
    normalized_targets.sort(key=lambda item: item[0])
    if len({part_id for part_id, _target in normalized_targets}) != len(normalized_targets):
        raise ValueError("Current attestation target ids must be unique")

    allowed_asset_keys: set[str] | None = None
    if allowed_source_assets is not None:
        if not isinstance(allowed_source_assets, (list, tuple)):
            raise ValueError("Selected current source assets must be an array")
        allowed_asset_keys = set()
        for raw in allowed_source_assets:
            source_asset = canonical_current_source_asset(raw)
            if source_asset is None:
                raise ValueError("Selected current source asset is invalid")
            allowed_asset_keys.add(_canonical_json(source_asset))

    allowed_retained_keys: set[tuple[str, str, str]] | None = None
    if allowed_retained_pair_sources is not None:
        if not isinstance(allowed_retained_pair_sources, (list, tuple)):
            raise ValueError("Retained current pair sources must be an array")
        allowed_retained_keys = set()
        for raw in allowed_retained_pair_sources:
            if not isinstance(raw, dict):
                raise ValueError("Retained current pair source is malformed")
            part_id = str(raw.get("partId") or "").strip()
            valid_time = canonical_time(raw.get("validTime"))
            source_asset = canonical_current_source_asset(raw.get("source"))
            if (
                not part_id
                or valid_time is None
                or raw.get("validTime") != valid_time
                or source_asset is None
                or source_asset["validTime"] != valid_time
            ):
                raise ValueError("Retained current pair source is invalid")
            identity = (part_id, valid_time, _canonical_json(source_asset))
            if identity in allowed_retained_keys:
                raise ValueError("Retained current pair source is duplicated")
            allowed_retained_keys.add(identity)

    verified_pairs: list[dict[str, str]] = []
    verified_pair_sources: list[dict[str, Any]] = []
    source_times: set[tuple[str, str, str]] = set()
    for part_id, target in normalized_targets:
        for valid_time, row in _matching_verified_part_current_rows(
            document,
            target,
            start,
            end,
        ):
            source = ((row.get("sources") or {}).get("current") or {})
            source_asset = canonical_current_source_asset(source)
            if source_asset is None:
                continue
            source_key = _canonical_json(source_asset)
            current_asset_allowed = bool(
                allowed_asset_keys is not None and source_key in allowed_asset_keys
            )
            retained_pair_allowed = bool(
                allowed_retained_keys is not None
                and (part_id, valid_time, source_key) in allowed_retained_keys
            )
            if (
                allowed_asset_keys is not None
                or allowed_retained_keys is not None
            ) and not (current_asset_allowed or retained_pair_allowed):
                continue
            verified_pairs.append({"partId": part_id, "validTime": valid_time})
            verified_pair_sources.append({
                "partId": part_id,
                "validTime": valid_time,
                "source": source_asset,
            })
            source_times.add((source_asset["collection"], source_asset["modelRun"], valid_time))
    verified_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    verified_pair_sources.sort(key=lambda row: (row["validTime"], row["partId"]))
    verified_sources = [
        {"collection": collection, "modelRun": model_run, "validTime": valid_time}
        for collection, model_run, valid_time in sorted(
            source_times,
            key=lambda item: (item[2], item[0], item[1]),
        )
    ]
    return {
        "schemaVersion": 2,
        "contractId": CURRENT_ATTESTATION_CONTRACT_ID,
        "rangeStartAt": canonical_time(start),
        "rangeEndAt": canonical_time(end),
        "targetCount": len(normalized_targets),
        "verifiedPairCount": len(verified_pairs),
        "verifiedPairsSha256": part_time_pairs_sha256(verified_pairs),
        "verifiedPairSourcesSha256": current_pair_sources_sha256(verified_pair_sources),
        "verifiedSourceTimeCount": len(verified_sources),
        "verifiedSourceTimesSha256": verified_source_times_sha256(verified_sources),
        "verifiedPairs": verified_pairs,
        "verifiedPairSources": verified_pair_sources,
        "verifiedSourceTimes": verified_sources,
    }


def canonical_pre_sanitize_current_identity_attestation(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    allowed_source_assets: Any = None,
    allowed_retained_pair_sources: Any = None,
) -> dict[str, Any]:
    """Rebuild only the persisted part/time/source identity before sanitation.

    This recovery-only view never makes a weather row usable. It requires the
    exact target set, hour, finite U/V tuple and canonical immutable source
    asset, but ignores other source metadata that the normal row validator may
    remove. Its consumer must match the persisted attestation digest first and
    then apply the normal strict validator to every surviving row.
    """
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(targets, (list, tuple)):
        raise ValueError("Pre-sanitize current targets must be an array")
    target_ids: list[str] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("Pre-sanitize current target is malformed")
        part_id = str(target.get("partId") or "").strip()
        if (
            not part_id
            or not str(target.get("parentZoneId") or "").strip()
            or _finite_point(target.get("waterPoint")) is None
        ):
            raise ValueError("Pre-sanitize current target identity is invalid")
        target_ids.append(part_id)
    if len(set(target_ids)) != len(target_ids):
        raise ValueError("Pre-sanitize current target ids are not unique")
    zones = document.get("zones") if isinstance(document, dict) else None
    expected_zone_ids = {f"PART::{part_id}" for part_id in target_ids}
    actual_zone_ids = {
        str(zone_id)
        for zone_id in (zones or {})
        if str(zone_id).startswith("PART::")
    } if isinstance(zones, dict) else set()
    if actual_zone_ids != expected_zone_ids:
        raise ValueError("Pre-sanitize current target set is incomplete")

    allowed_assets = None
    if allowed_source_assets is not None:
        if not isinstance(allowed_source_assets, (list, tuple)):
            raise ValueError("Pre-sanitize current assets are malformed")
        normalized_assets = [
            canonical_current_source_asset(raw) for raw in allowed_source_assets
        ]
        if any(source is None for source in normalized_assets):
            raise ValueError("Pre-sanitize current asset identity is invalid")
        allowed_assets = {
            _canonical_json(source) for source in normalized_assets
            if source is not None
        }
    allowed_retained = None
    if allowed_retained_pair_sources is not None:
        if not isinstance(allowed_retained_pair_sources, (list, tuple)):
            raise ValueError("Pre-sanitize retained current rows are malformed")
        allowed_retained = set()
        for raw in allowed_retained_pair_sources:
            if not isinstance(raw, dict):
                raise ValueError("Pre-sanitize retained current row is malformed")
            part_id = str(raw.get("partId") or "").strip()
            valid_time = canonical_time(raw.get("validTime"))
            source = canonical_current_source_asset(raw.get("source"))
            if (
                not part_id
                or valid_time is None
                or source is None
                or source["validTime"] != valid_time
            ):
                raise ValueError("Pre-sanitize retained current identity is invalid")
            allowed_retained.add((part_id, valid_time, _canonical_json(source)))
        if len(allowed_retained) != len(allowed_retained_pair_sources):
            raise ValueError("Pre-sanitize retained current identity is duplicated")

    verified_pairs: list[dict[str, str]] = []
    verified_pair_sources: list[dict[str, Any]] = []
    source_times: set[tuple[str, str, str]] = set()
    for part_id in sorted(target_ids):
        hourly = ((zones or {}).get(f"PART::{part_id}") or {}).get("hourly")
        if not isinstance(hourly, dict):
            continue
        for raw_time, row in hourly.items():
            valid_time = canonical_time(raw_time)
            if (
                valid_time is None
                or raw_time != valid_time
                or not isinstance(row, dict)
                or canonical_time(row.get("time")) != valid_time
                or not start <= datetime.fromisoformat(
                    valid_time.replace("Z", "+00:00")
                ) <= end
                or any(
                    isinstance(row.get(field), bool)
                    or not isinstance(row.get(field), (int, float))
                    or not math.isfinite(float(row[field]))
                    for field in ("current-u", "current-v")
                )
            ):
                continue
            source = canonical_current_source_asset(
                ((row.get("sources") or {}).get("current"))
            )
            if source is None or source["validTime"] != valid_time:
                continue
            source_key = _canonical_json(source)
            if (
                allowed_assets is not None or allowed_retained is not None
            ) and not (
                allowed_assets is not None and source_key in allowed_assets
                or allowed_retained is not None
                and (part_id, valid_time, source_key) in allowed_retained
            ):
                continue
            verified_pairs.append({"partId": part_id, "validTime": valid_time})
            verified_pair_sources.append({
                "partId": part_id, "validTime": valid_time, "source": source,
            })
            source_times.add((
                source["collection"], source["modelRun"], valid_time,
            ))
    verified_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    verified_pair_sources.sort(
        key=lambda row: (row["validTime"], row["partId"])
    )
    verified_sources = [
        {"collection": collection, "modelRun": model_run, "validTime": valid_time}
        for collection, model_run, valid_time in sorted(
            source_times, key=lambda item: (item[2], item[0], item[1]),
        )
    ]
    return {
        "schemaVersion": 2,
        "contractId": CURRENT_ATTESTATION_CONTRACT_ID,
        "rangeStartAt": canonical_time(start),
        "rangeEndAt": canonical_time(end),
        "targetCount": len(target_ids),
        "verifiedPairCount": len(verified_pairs),
        "verifiedPairsSha256": part_time_pairs_sha256(verified_pairs),
        "verifiedPairSourcesSha256": current_pair_sources_sha256(
            verified_pair_sources
        ),
        "verifiedSourceTimeCount": len(verified_sources),
        "verifiedSourceTimesSha256": verified_source_times_sha256(
            verified_sources
        ),
        "verifiedPairs": verified_pairs,
        "verifiedPairSources": verified_pair_sources,
        "verifiedSourceTimes": verified_sources,
    }


def sanitized_current_attestation(attestation: Any) -> dict[str, Any]:
    """Drop internal pair lists while retaining exact digest/count evidence."""
    if not isinstance(attestation, dict):
        raise ValueError("Current attestation must be an object")
    fields = (
        "schemaVersion",
        "contractId",
        "rangeStartAt",
        "rangeEndAt",
        "targetCount",
        "verifiedPairCount",
        "verifiedPairsSha256",
        "verifiedPairSourcesSha256",
        "verifiedSourceTimeCount",
        "verifiedSourceTimesSha256",
    )
    return {field: attestation.get(field) for field in fields}


def validate_current_attestation(
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
) -> dict[str, Any]:
    """Recompute every v2 list/count/digest claim before ledger acceptance."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(attestation, dict) or set(attestation) != {
        "schemaVersion", "contractId", "rangeStartAt", "rangeEndAt",
        "targetCount", "verifiedPairCount", "verifiedPairsSha256",
        "verifiedPairSourcesSha256", "verifiedSourceTimeCount",
        "verifiedSourceTimesSha256", "verifiedPairs", "verifiedPairSources",
        "verifiedSourceTimes",
    }:
        raise ValueError("DMI current attestation is malformed")
    if (
        attestation.get("schemaVersion") != 2
        or attestation.get("contractId") != CURRENT_ATTESTATION_CONTRACT_ID
        or attestation.get("rangeStartAt") != canonical_time(start)
        or attestation.get("rangeEndAt") != canonical_time(end)
    ):
        raise ValueError("DMI current attestation contract/range mismatch")
    if not isinstance(targets, (list, tuple)):
        raise ValueError("DMI current attestation targets are malformed")
    target_ids: list[str] = []
    for target in targets:
        if not isinstance(target, dict):
            raise ValueError("DMI current attestation target is malformed")
        part_id = str(target.get("partId") or "").strip()
        if (
            not part_id
            or not str(target.get("parentZoneId") or "").strip()
            or _finite_point(target.get("waterPoint")) is None
        ):
            raise ValueError("DMI current attestation target identity is invalid")
        target_ids.append(part_id)
    if len(set(target_ids)) != len(target_ids):
        raise ValueError("DMI current attestation target ids are not unique")
    if attestation.get("targetCount") != len(target_ids):
        raise ValueError("DMI current attestation target count mismatch")
    allowed_target_ids = set(target_ids)

    expected_times: set[str] = set()
    cursor = start
    while cursor <= end:
        expected_times.add(canonical_time(cursor) or "")
        cursor += timedelta(hours=1)
    pairs = attestation.get("verifiedPairs")
    if not isinstance(pairs, list):
        raise ValueError("DMI current attestation pair list is malformed")
    normalized_pairs: list[dict[str, str]] = []
    for raw in pairs:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime"}:
            raise ValueError("DMI current attestation pair is malformed")
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if (
            part_id not in allowed_target_ids
            or valid_time not in expected_times
            or raw.get("validTime") != valid_time
        ):
            raise ValueError("DMI current attestation pair is out of range")
        normalized_pairs.append({"partId": part_id, "validTime": valid_time})
    normalized_pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    if pairs != normalized_pairs:
        raise ValueError("DMI current attestation pair list is not canonical")

    pair_sources = attestation.get("verifiedPairSources")
    if not isinstance(pair_sources, list):
        raise ValueError("DMI current attestation pair/source list is malformed")
    normalized_pair_sources: list[dict[str, Any]] = []
    for raw in pair_sources:
        if not isinstance(raw, dict) or set(raw) != {"partId", "validTime", "source"}:
            raise ValueError("DMI current attestation pair/source row is malformed")
        source_raw = raw.get("source")
        source = canonical_current_source_asset(source_raw)
        part_id = str(raw.get("partId") or "").strip()
        valid_time = canonical_time(raw.get("validTime"))
        if (
            not isinstance(source_raw, dict)
            or set(source_raw) != CURRENT_SOURCE_ASSET_FIELDS
            or source is None
            or part_id not in allowed_target_ids
            or valid_time not in expected_times
            or raw.get("validTime") != valid_time
            or source["validTime"] != valid_time
        ):
            raise ValueError("DMI current attestation pair/source identity is invalid")
        normalized_pair_sources.append({
            "partId": part_id,
            "validTime": valid_time,
            "source": source,
        })
    normalized_pair_sources.sort(key=lambda row: (row["validTime"], row["partId"]))
    if pair_sources != normalized_pair_sources:
        raise ValueError("DMI current attestation pair/source list is not canonical")
    if [
        {"partId": row["partId"], "validTime": row["validTime"]}
        for row in normalized_pair_sources
    ] != normalized_pairs:
        raise ValueError("DMI current attestation pair/source parity mismatch")

    expected_source_times = sorted(
        {
            (
                row["source"]["collection"],
                row["source"]["modelRun"],
                row["validTime"],
            )
            for row in normalized_pair_sources
        },
        key=lambda item: (item[2], item[0], item[1]),
    )
    canonical_source_times = [
        {"collection": collection, "modelRun": model_run, "validTime": valid_time}
        for collection, model_run, valid_time in expected_source_times
    ]
    if attestation.get("verifiedSourceTimes") != canonical_source_times:
        raise ValueError("DMI current attestation source-time list mismatch")
    if (
        attestation.get("verifiedPairCount") != len(normalized_pairs)
        or attestation.get("verifiedPairsSha256")
            != part_time_pairs_sha256(normalized_pairs)
        or attestation.get("verifiedPairSourcesSha256")
            != current_pair_sources_sha256(normalized_pair_sources)
        or attestation.get("verifiedSourceTimeCount") != len(canonical_source_times)
        or attestation.get("verifiedSourceTimesSha256")
            != verified_source_times_sha256(canonical_source_times)
    ):
        raise ValueError("DMI current attestation count/digest mismatch")
    return attestation


def strict_verified_part_current_pair_count(
    document: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
) -> int:
    """Count strict part/hour pairs in one inclusive exact-hour matrix."""
    try:
        return int(canonical_verified_part_current_attestation(
            document,
            targets,
            range_start,
            range_end,
        )["verifiedPairCount"])
    except (TypeError, ValueError):
        return 0


def processed_source_assets_from_current_operational_ledger(ledger: Any) -> list[dict[str, Any]]:
    """Extract only terminal processed asset proofs for attestation filtering."""
    if not isinstance(ledger, dict):
        return []
    assets: list[dict[str, Any]] = []
    for collection_row in ledger.get("collections") or []:
        if not isinstance(collection_row, dict):
            continue
        for row in collection_row.get("validTimes") or []:
            if (
                isinstance(row, dict)
                and row.get("state") in {"PROCESSED", "VERIFIED"}
            ):
                asset = canonical_current_source_asset(row.get("sourceAsset"))
                if asset is not None:
                    assets.append(asset)
    unique = {_canonical_json(asset): asset for asset in assets}
    return [unique[key] for key in sorted(unique)]


def current_attestation_authorization_from_operational_ledger(
    ledger: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Return current assets plus exact retained part/time/source authorizations."""
    current_assets = processed_source_assets_from_current_operational_ledger(ledger)
    if not isinstance(ledger, dict):
        return current_assets, []
    raw_proofs = ledger.get("retainedCurrentAssetProofs", [])
    if not isinstance(raw_proofs, list):
        raise ValueError("Retained current asset proofs must be an array")
    retained: list[dict[str, Any]] = []
    pair_identities: set[tuple[str, str]] = set()
    for raw in raw_proofs:
        if not isinstance(raw, dict):
            raise ValueError("Retained current asset proof is malformed")
        source = canonical_current_source_asset(raw.get("sourceAsset"))
        part_ids = raw.get("attestedPartIds")
        if source is None or not isinstance(part_ids, list):
            raise ValueError("Retained current asset proof identity is invalid")
        for raw_part_id in part_ids:
            part_id = str(raw_part_id or "").strip()
            identity = (part_id, source["validTime"])
            if not part_id or identity in pair_identities:
                raise ValueError("Retained current pair authorization is invalid")
            pair_identities.add(identity)
            retained.append({
                "partId": part_id,
                "validTime": source["validTime"],
                "source": source,
            })
    retained.sort(key=lambda row: (row["validTime"], row["partId"]))
    return current_assets, retained


def _canonical_official_current_asset(
    raw: Any,
    collection: str,
    model_run: str | None,
    valid_time: str,
) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or model_run is None:
        return None
    raw_collection = str(raw.get("collection") or "").strip()
    raw_model_run = canonical_time(raw.get("modelRun"))
    raw_valid_time = canonical_time(raw.get("validTime"))
    item_id = str(raw.get("itemId") or "").strip()
    asset_sha256 = str(raw.get("assetIdentitySha256") or "")
    asset_size = raw.get("assetSizeBytes")
    item_created_at = canonical_time(raw.get("itemCreatedAt"))
    item_updated_at = canonical_time(raw.get("itemUpdatedAt"))
    if not (
        raw_collection == collection
        and raw_model_run == model_run
        and raw_valid_time == valid_time
        and item_id
        and _SHA256.fullmatch(asset_sha256)
        and (
            asset_size is None
            or isinstance(asset_size, int) and not isinstance(asset_size, bool)
            and asset_size > 0
        )
        and (raw.get("itemCreatedAt") is None or item_created_at)
        and (raw.get("itemUpdatedAt") is None or item_updated_at)
    ):
        return None
    return {
        "collection": collection,
        "modelRun": model_run,
        "validTime": valid_time,
        "itemId": item_id,
        "assetIdentitySha256": asset_sha256,
        "assetSizeBytes": asset_size,
        "itemCreatedAt": item_created_at,
        "itemUpdatedAt": item_updated_at,
    }


def current_source_matches_official_asset(
    source_asset: Any,
    official_asset: Any,
) -> bool:
    """Match a content-proven source to every field of its official identity."""
    source = canonical_current_source_asset(source_asset)
    if source is None:
        return False
    official = _canonical_official_current_asset(
        official_asset,
        source["collection"],
        source["modelRun"],
        source["validTime"],
    )
    return official is not None and all(
        source[field] == official[field]
        for field in CURRENT_OFFICIAL_ASSET_FIELDS
    )


def _validate_current_operational_ledger(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
    *,
    allow_incomplete: bool,
) -> dict[str, Any]:
    """Validate exact per-asset evidence and its DMI/fallback partition."""
    start, end = _exact_hour_bounds(range_start, range_end)
    if not isinstance(ledger, dict) or not isinstance(attestation, dict):
        raise ValueError("DMI current operational ledger or attestation is missing")
    validate_current_attestation(attestation, targets, start, end)
    if ledger.get("schemaVersion") != CURRENT_OPERATIONAL_LEDGER_SCHEMA_VERSION:
        raise ValueError("DMI current operational ledger schema mismatch")
    if ledger.get("contractId") != CURRENT_OPERATIONAL_LEDGER_CONTRACT_ID:
        raise ValueError("DMI current operational ledger contract mismatch")
    if ledger.get("productionReferenceAt") != canonical_time(start):
        raise ValueError("DMI current operational ledger start mismatch")
    if ledger.get("operationalRangeEndAt") != canonical_time(end):
        raise ValueError("DMI current operational ledger end mismatch")
    expected_times: list[str] = []
    cursor = start
    while cursor <= end:
        expected_times.append(canonical_time(cursor) or "")
        cursor += timedelta(hours=1)
    if ledger.get("hourCount") != len(expected_times):
        raise ValueError("DMI current operational ledger hour count mismatch")
    if ledger.get("targetCount") != len(targets or []):
        raise ValueError("DMI current operational ledger target count mismatch")
    if ledger.get("targetRegistrySha256") != target_registry_sha256:
        raise ValueError("DMI current operational ledger registry binding mismatch")
    if ledger.get("attestation") != sanitized_current_attestation(attestation):
        raise ValueError("DMI current operational ledger attestation mismatch")
    if not isinstance(targets, (list, tuple)):
        raise ValueError("DMI current operational targets are malformed")
    target_ids = sorted(
        str(target.get("partId") or "").strip()
        for target in targets
        if isinstance(target, dict)
    )
    if (
        len(target_ids) != len(targets)
        or len(set(target_ids)) != len(target_ids)
        or any(not part_id for part_id in target_ids)
    ):
        raise ValueError("DMI current operational target ids are invalid")

    retained_fields = (
        "retainedCurrentAssetProofCount",
        "retainedCurrentAssetProofsSha256",
        "retainedCurrentAssetProofs",
    )
    retained_fields_present = [field in ledger for field in retained_fields]
    if any(retained_fields_present) and not all(retained_fields_present):
        raise ValueError("DMI retained current proof header is incomplete")
    retained_proofs = validate_retained_current_asset_proofs(
        ledger.get("retainedCurrentAssetProofs", []),
        target_ids,
        start,
        end,
        target_registry_sha256,
    )
    if all(retained_fields_present) and (
        ledger.get("retainedCurrentAssetProofCount") != len(retained_proofs)
        or ledger.get("retainedCurrentAssetProofsSha256")
            != retained_current_asset_proofs_sha256(retained_proofs)
    ):
        raise ValueError("DMI retained current proof identity mismatch")
    retained_pair_source_keys = {
        (
            part_id,
            proof["sourceAsset"]["validTime"],
            _canonical_json(proof["sourceAsset"]),
        )
        for proof in retained_proofs
        for part_id in proof["attestedPartIds"]
    }
    retained_pair_keys = {
        (part_id, valid_time)
        for part_id, valid_time, _source in retained_pair_source_keys
    }
    if len(retained_pair_source_keys) != len(retained_pair_keys):
        raise ValueError("DMI retained current pair has multiple source assets")

    collections = ledger.get("collections")
    if not isinstance(collections, list) or [row.get("collection") for row in collections if isinstance(row, dict)] != sorted(MARINE_COLLECTIONS):
        raise ValueError("DMI current operational collection ledger is incomplete")
    pair_source_evidence = {
        _canonical_json(source)
        for row in (attestation.get("verifiedPairSources") or [])
        if isinstance(row, dict)
        for source in [canonical_current_source_asset(row.get("source"))]
        if source is not None
    }
    state_by_collection: dict[str, dict[str, dict[str, Any]]] = {}
    model_run_by_collection: dict[str, str | None] = {}
    processing_signature_by_collection: dict[str, str | None] = {}
    locally_unavailable_collection: dict[str, bool] = {}
    official_asset_count = 0
    for collection_row in collections:
        if not isinstance(collection_row, dict):
            raise ValueError("DMI current operational collection row is malformed")
        collection = str(collection_row.get("collection") or "")
        raw_model_run = collection_row.get("modelRun")
        model_run = canonical_time(raw_model_run)
        if (
            model_run is None
            and (not allow_incomplete or raw_model_run is not None)
        ) or (
            model_run is not None and raw_model_run != model_run
        ):
            raise ValueError("DMI current operational collection run is invalid")
        processing_signature = collection_row.get("processingSignature")
        signature_valid = (
            isinstance(processing_signature, str)
            and bool(processing_signature)
            and processing_signature == processing_signature.strip()
        )
        if not signature_valid and (
            not allow_incomplete or processing_signature is not None
        ):
            raise ValueError("DMI current operational processing signature is invalid")
        rows = collection_row.get("validTimes")
        if not isinstance(rows, list) or len(rows) != len(expected_times):
            raise ValueError("DMI current operational valid-time ledger is incomplete")
        if [row.get("validTime") for row in rows if isinstance(row, dict)] != expected_times:
            raise ValueError("DMI current operational valid-time ledger is not canonical")
        states: dict[str, dict[str, Any]] = {}
        official_assets: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict) or set(row) != {
                "validTime", "state", "officialAsset", "sourceAsset",
                "partOutcomeProof",
            }:
                raise ValueError("DMI current operational valid-time row is malformed")
            state = str(row.get("state") or "")
            valid_time = str(row.get("validTime") or "")
            if state not in CURRENT_OPERATIONAL_LEDGER_STATES:
                raise ValueError("DMI current operational valid-time state is invalid")
            raw_official_asset = row.get("officialAsset")
            raw_source_asset = row.get("sourceAsset")
            raw_part_outcome_proof = row.get("partOutcomeProof")
            if raw_official_asset is not None and (
                not isinstance(raw_official_asset, dict)
                or set(raw_official_asset) != CURRENT_OFFICIAL_ASSET_FIELDS
            ):
                raise ValueError("DMI official asset ledger is not sanitized")
            if raw_source_asset is not None and (
                not isinstance(raw_source_asset, dict)
                or set(raw_source_asset) != CURRENT_SOURCE_ASSET_FIELDS
            ):
                raise ValueError("DMI processed source ledger is not sanitized")
            official_asset = _canonical_official_current_asset(
                raw_official_asset, collection, model_run, valid_time,
            )
            source_asset = canonical_current_source_asset(raw_source_asset)
            if raw_official_asset is not None and official_asset is None:
                raise ValueError(
                    "DMI official asset evidence is present but non-canonical"
                )
            if raw_source_asset is not None and source_asset is None:
                raise ValueError(
                    "DMI source asset evidence is present but non-canonical"
                )
            if state == "UPSTREAM_ABSENT":
                if (
                    official_asset is not None
                    or source_asset is not None
                    or raw_part_outcome_proof is not None
                ):
                    raise ValueError("DMI upstream-absent state contains local asset evidence")
                part_outcome_proof = None
            elif state in {"PROCESSED", "VERIFIED"}:
                if official_asset is None or source_asset is None:
                    raise ValueError("DMI processed state lacks exact official/source asset evidence")
                if (
                    source_asset["collection"] != collection
                    or source_asset["modelRun"] != model_run
                    or source_asset["validTime"] != valid_time
                    or source_asset["itemId"] != official_asset["itemId"]
                    or source_asset["assetIdentitySha256"] != official_asset["assetIdentitySha256"]
                    or source_asset["assetSizeBytes"] != official_asset["assetSizeBytes"]
                    or source_asset["itemCreatedAt"] != official_asset["itemCreatedAt"]
                    or source_asset["itemUpdatedAt"] != official_asset["itemUpdatedAt"]
                ):
                    raise ValueError("DMI processed source does not match the selected official asset")
                if state == "VERIFIED" and _canonical_json(source_asset) not in pair_source_evidence:
                    raise ValueError("DMI current VERIFIED state has no canonical pair/source evidence")
                part_outcome_proof = validate_current_part_outcome_proof(
                    raw_part_outcome_proof,
                    target_ids,
                    target_registry_sha256,
                    processing_signature,
                    source_asset,
                )
            else:
                if source_asset is not None or raw_part_outcome_proof is not None:
                    raise ValueError(
                        "DMI unfinished state may not claim processed outcome evidence"
                    )
                part_outcome_proof = None
            if official_asset is not None:
                official_assets.append(official_asset)
            states[valid_time] = {
                "state": state,
                "officialAsset": official_asset,
                "sourceAsset": source_asset,
                "partOutcomeProof": part_outcome_proof,
                "spatialUnavailablePartIds": frozenset(
                    (part_outcome_proof or {}).get(
                        "spatialUnavailablePartIds"
                    ) or []
                ),
            }
        counts = {
            state: sum(value["state"] == state for value in states.values())
            for state in CURRENT_OPERATIONAL_LEDGER_STATES
        }
        if collection_row.get("stateCounts") != counts:
            raise ValueError("DMI current operational state counts mismatch")
        official_times = sorted(asset["validTime"] for asset in official_assets)
        native_terminal_time = (
            canonical_time(
                datetime.fromisoformat(model_run.replace("Z", "+00:00"))
                + timedelta(hours=DKSS_MAX_FORECAST_LEAD_HOURS)
            )
            if model_run is not None
            else None
        )
        terminal_asset = None
        if "nativeTerminalAsset" in collection_row:
            raw_terminal_asset = collection_row["nativeTerminalAsset"]
            if (
                not isinstance(raw_terminal_asset, dict)
                or set(raw_terminal_asset) != CURRENT_OFFICIAL_ASSET_FIELDS
            ):
                raise ValueError("DMI native terminal asset is not sanitized")
            terminal_asset = _canonical_official_current_asset(
                raw_terminal_asset, collection, model_run, native_terminal_time,
            )
            if terminal_asset is None or terminal_asset != raw_terminal_asset:
                raise ValueError("DMI native terminal asset identity is invalid")
            if native_terminal_time in states and (
                states[native_terminal_time]["officialAsset"] != terminal_asset
            ):
                raise ValueError("DMI native terminal asset contradicts required inventory")
        if (
            not allow_incomplete and native_terminal_time not in official_times
            and terminal_asset is None
        ):
            raise ValueError(
                "DMI current official inventory lacks its native terminal asset"
            )
        if (
            collection_row.get("officialValidTimeCount") != len(official_times)
            or collection_row.get("officialValidTimesSha256") != valid_times_sha256(official_times)
            or collection_row.get("officialAssetsSha256")
                != current_official_assets_sha256(official_assets)
        ):
            raise ValueError("DMI current official valid-time identity mismatch")
        official_asset_count += len(official_assets)
        state_by_collection[collection] = states
        model_run_by_collection[collection] = model_run
        processing_signature_by_collection[collection] = (
            processing_signature if signature_valid else None
        )
        locally_unavailable_collection[collection] = bool(states) and all(
            value["state"] == "LOCALLY_SKIPPED" for value in states.values()
        )

    if official_asset_count == 0 and not allow_incomplete:
        raise ValueError("DMI current official inventory is empty")

    partition = derive_current_part_outcome_partition(
        collections,
        target_ids,
        expected_times,
        allow_local_unavailable=allow_incomplete,
    )
    attested_pair_keys = {
        (row["partId"], row["validTime"])
        for row in (attestation.get("verifiedPairs") or [])
    }
    outcome_verified_keys = {
        (row["partId"], row["validTime"])
        for row in partition["verifiedPairs"]
    }
    attested_pair_source_keys = {
        (
            str(row.get("partId") or "").strip(),
            str(canonical_time(row.get("validTime")) or ""),
            _canonical_json(canonical_current_source_asset(row.get("source"))),
        )
        for row in (attestation.get("verifiedPairSources") or [])
        if isinstance(row, dict)
        and canonical_current_source_asset(row.get("source")) is not None
    }
    if not retained_pair_source_keys <= attested_pair_source_keys:
        raise ValueError("DMI retained current proof is unused by actual attestation")
    retained_requires_catalog_outage = False
    retained_requires_local_failure = False
    for proof in retained_proofs:
        source = proof["sourceAsset"]
        collection = source["collection"]
        if not retained_current_processing_signature_compatible(
            proof["processingSignature"],
            processing_signature_by_collection.get(collection),
        ):
            raise ValueError("DMI retained current processing semantics mismatch")
        selected_model_run = model_run_by_collection.get(collection)
        if selected_model_run is None:
            if not locally_unavailable_collection.get(collection):
                raise ValueError("DMI retained current source lacks catalog-outage evidence")
            retained_requires_catalog_outage = True
            continue
        source_run_epoch = _epoch(source["modelRun"])
        selected_run_epoch = _epoch(selected_model_run)
        if source_run_epoch > selected_run_epoch:
            raise ValueError("DMI retained current source is newer than selected run")
        # For an older model run, availability is decided by the actual
        # attested row, not a newer asset's positive processing metadata.
        # retained_pair_source_keys <= attested_pair_source_keys above proves
        # that every retained tuple is still the exact cached winner. Once a
        # newer row replaces it, an old retained proof is unused and rejected.
        if source_run_epoch == selected_run_epoch:
            state_row = state_by_collection.get(collection, {}).get(
                source["validTime"]
            )
            if (
                state_row is None
                or state_row["state"] != "LOCALLY_SKIPPED"
                or not current_source_matches_official_asset(
                    source, state_row["officialAsset"],
                )
            ):
                raise ValueError(
                    "DMI same-run retained source is not the selected official asset"
                )
            retained_requires_local_failure = True
    if not attested_pair_keys <= outcome_verified_keys | retained_pair_keys:
        raise ValueError("DMI attestation is not backed by current or retained proof")
    unattested_outcome_pairs = outcome_verified_keys - attested_pair_keys
    raw_failure_codes = ledger.get("failureCodes")
    if unattested_outcome_pairs and (
        not isinstance(raw_failure_codes, list)
        or "UNATTESTED_CURRENT_PART_TIME" not in raw_failure_codes
    ):
        raise ValueError("DMI unattested outcome is missing failure evidence")
    if not allow_incomplete and unattested_outcome_pairs:
        raise ValueError("DMI outcome proof and current attestation diverge")
    verified_times = {row["validTime"] for row in attestation.get("verifiedPairs") or []}
    for valid_time in expected_times:
        states = [
            state_by_collection[collection][valid_time]["state"]
            for collection in sorted(MARINE_COLLECTIONS)
        ]
        if (
            any(state in {"EXPECTED", "LOCALLY_SKIPPED"} for state in states)
            and not allow_incomplete
        ):
            raise ValueError("DMI current ledger contains unfinished local work")
        if (
            not all(state == "UPSTREAM_ABSENT" for state in states)
            and valid_time not in verified_times
            and not allow_incomplete
        ):
            raise ValueError("DMI current ledger has a systemic official-time collapse")

    for raw in attestation.get("verifiedPairSources") or []:
        if not isinstance(raw, dict):
            raise ValueError("DMI canonical pair/source evidence is malformed")
        source = canonical_current_source_asset(raw.get("source"))
        if source is None:
            raise ValueError("DMI canonical pair/source identity is invalid")
        state_row = state_by_collection.get(source["collection"], {}).get(source["validTime"])
        part_id = str(raw.get("partId") or "").strip()
        current_bound = bool(
            state_row
            and state_row["state"] == "VERIFIED"
            and state_row["sourceAsset"] == source
            and part_id not in state_row["spatialUnavailablePartIds"]
        )
        retained_bound = (
            part_id,
            source["validTime"],
            _canonical_json(source),
        ) in retained_pair_source_keys
        if not current_bound and not retained_bound:
            raise ValueError("DMI pair/source is not bound to a selected processed ledger state")

    expected_complement = exact_current_operational_complement(
        target_ids,
        expected_times,
        attestation.get("verifiedPairs") or [],
    )
    complement_keys = {
        (row["partId"], row["validTime"])
        for row in expected_complement
    }
    expected_upstream_absence = [
        row for row in partition["upstreamAbsencePairs"]
        if (row["partId"], row["validTime"]) in complement_keys
    ]
    expected_spatial_unavailable = [
        row for row in partition["spatialUnavailablePairs"]
        if (row["partId"], row["validTime"]) in complement_keys
    ]
    if (
        ledger.get("upstreamAbsencePairs") != expected_upstream_absence
        or ledger.get("upstreamAbsencePairCount") != len(expected_upstream_absence)
        or ledger.get("upstreamAbsencePairsSha256")
            != part_time_pairs_sha256(expected_upstream_absence)
    ):
        raise ValueError("DMI current upstream-absence proof is not exact")
    if (
        ledger.get("spatialUnavailablePairs") != expected_spatial_unavailable
        or ledger.get("spatialUnavailablePairCount")
            != len(expected_spatial_unavailable)
        or ledger.get("spatialUnavailablePairsSha256")
            != part_time_pairs_sha256(expected_spatial_unavailable)
    ):
        raise ValueError("DMI current spatial-unavailable proof is not exact")
    complement = ledger.get("operationalComplementPairs")
    if complement != expected_complement:
        raise ValueError("DMI current operational complement is not exact")
    if (
        ledger.get("operationalComplementPairCount") != len(expected_complement)
        or ledger.get("operationalComplementPairsSha256")
            != part_time_pairs_sha256(expected_complement)
    ):
        raise ValueError("DMI current operational complement identity mismatch")
    failure_codes = ledger.get("failureCodes")
    disposition_ready = (
        isinstance(failure_codes, list)
        and not any(
            code not in CURRENT_OPERATIONAL_NON_FATAL_CODES
            for code in failure_codes
        )
    )
    if (
        not isinstance(ledger.get("ready"), bool)
        or not isinstance(failure_codes, list)
        or len(failure_codes) > 16
        or failure_codes != sorted(set(failure_codes))
        or any(
            not isinstance(code, str)
            or not re.fullmatch(r"[A-Z][A-Z0-9_]{2,63}", code)
            for code in failure_codes
        )
        or ledger["ready"] is not disposition_ready
    ):
        raise ValueError("DMI current operational ledger disposition is invalid")
    if retained_requires_catalog_outage and (
        "OFFICIAL_DKSS_CATALOG_INCOMPLETE" not in failure_codes
        and "OFFICIAL_DKSS_CATALOG_COLLAPSE" not in failure_codes
    ):
        raise ValueError("DMI retained current catalog-outage evidence is missing")
    if retained_requires_local_failure and (
        "LOCALLY_SKIPPED_DKSS_ASSET" not in failure_codes
    ):
        raise ValueError("DMI retained current local-failure evidence is missing")
    if not allow_incomplete and ledger["ready"] is not True:
        raise ValueError("DMI current operational ledger is not ready")
    return ledger


def validate_current_operational_ledger(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> dict[str, Any]:
    """Validate a complete official-DKSS ledger and its exact complement."""
    return _validate_current_operational_ledger(
        ledger,
        attestation,
        targets,
        range_start,
        range_end,
        target_registry_sha256,
        allow_incomplete=False,
    )


def validate_current_operational_availability_ledger(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> dict[str, Any]:
    """Validate exact usable DMI pairs plus honest local/upstream fallback gaps."""
    return _validate_current_operational_ledger(
        ledger,
        attestation,
        targets,
        range_start,
        range_end,
        target_registry_sha256,
        allow_incomplete=True,
    )


def current_operational_ledger_ready(
    ledger: Any,
    attestation: Any,
    targets: Any,
    range_start: Any,
    range_end: Any,
    target_registry_sha256: Any,
) -> bool:
    try:
        validate_current_operational_ledger(
            ledger,
            attestation,
            targets,
            range_start,
            range_end,
            target_registry_sha256,
        )
        return True
    except (TypeError, ValueError):
        return False


verified_native_component_source = complete_native_source_for_hour
