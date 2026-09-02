"""Private, score-neutral seven-day current-field research sampling.

The public product keeps one verified nearshore current per forecast entity.
This module reuses the already downloaded DKSS GRIB fields to retain a small
private comparison set along seaward transects. It never writes score input or
public runtime data.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import math
import pathlib
from typing import Any


SCHEMA_VERSION = 1
RETENTION_HOURS = 7 * 24
DISTANCE_BANDS_KM = (0.0, 5.0, 15.0)
FORECAST_LEAD_MAX_HOURS = 12.0
REGIONAL_PROXY_OPERATIONAL_FORECAST_LEAD_MAX_HOURS = 117.0
MAX_GRID_DISTANCE_KM = 5.0
REGIONAL_PROXY_POLICY_SCHEMA_VERSION = 1
REGIONAL_PROXY_REQUIRED_COLLECTION = "dkss_lf"
REGIONAL_PROXY_MAX_GRID_DISTANCE_KM = 15.0
REGIONAL_PROXY_TARGET_PREFIX = "REGIONAL_PROXY::"


def _epoch(value: Any) -> float:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return 0.0


def _valid_source_asset_sha256(value: Any) -> bool:
    text = str(value or "")
    return (
        text.startswith("sha256:")
        and len(text) == 71
        and all(character in "0123456789abcdef" for character in text[7:])
    )


def destination_point(origin: list[float], bearing_deg: float, distance_km: float) -> list[float]:
    """Move from ``origin`` on a spherical Earth."""
    radius_km = 6371.0088
    lon1, lat1 = map(math.radians, (float(origin[0]), float(origin[1])))
    bearing = math.radians(float(bearing_deg))
    angular = float(distance_km) / radius_km
    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular)
        + math.cos(lat1) * math.sin(angular) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular) * math.cos(lat1),
        math.cos(angular) - math.sin(lat1) * math.sin(lat2),
    )
    return [round(math.degrees(lon2), 7), round(math.degrees(lat2), 7)]


def bearing_degrees(start: list[float], end: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(
        math.radians,
        (float(start[0]), float(start[1]), float(end[0]), float(end[1])),
    )
    delta_lon = lon2 - lon1
    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def haversine_km(first: list[float], second: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(
        math.radians,
        (float(first[0]), float(first[1]), float(second[0]), float(second[1])),
    )
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    term = (
        math.sin(delta_lat / 2.0) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2.0) ** 2
    )
    return 6371.0088 * 2.0 * math.atan2(math.sqrt(term), math.sqrt(1.0 - term))


def build_rotating_targets(
    part_document: dict[str, Any],
    zone_coast_types: dict[str, str],
    cursor: int = 0,
    parts_per_run: int = 15,
) -> tuple[list[dict[str, Any]], int, list[str]]:
    """Build a bounded rotating set of near/transition/offshore targets."""
    parts: list[tuple[str, dict[str, Any]]] = []
    for parent_zone_id, rows in sorted((part_document.get("zones") or {}).items()):
        for part in rows or []:
            part_id = str(part.get("partId") or "")
            land = part.get("landPoint")
            water = part.get("waterPoint")
            if not part_id or not _valid_point(land) or not _valid_point(water):
                continue
            parts.append((str(parent_zone_id), part))
    parts.sort(key=lambda item: str(item[1].get("partId")))
    if not parts:
        return [], 0, []
    count = min(len(parts), max(1, int(parts_per_run)))
    start = int(cursor) % len(parts)
    selected = [parts[(start + offset) % len(parts)] for offset in range(count)]
    targets: list[dict[str, Any]] = []
    selected_ids: list[str] = []
    for parent_zone_id, part in selected:
        part_id = str(part["partId"])
        selected_ids.append(part_id)
        land = [float(part["landPoint"][0]), float(part["landPoint"][1])]
        water = [float(part["waterPoint"][0]), float(part["waterPoint"][1])]
        bearing = bearing_degrees(land, water)
        for band_km in DISTANCE_BANDS_KM:
            target = water if band_km == 0 else destination_point(water, bearing, band_km)
            band_label = str(int(band_km))
            targets.append({
                "id": f"RESEARCH::{part_id}::{band_label}km",
                "lon": float(target[0]),
                "lat": float(target[1]),
                "coastType": zone_coast_types.get(parent_zone_id, "east"),
                "researchCurrent": True,
                "partId": part_id,
                "parentZoneId": parent_zone_id,
                "bandKm": band_km,
                "targetPoint": [round(float(target[0]), 7), round(float(target[1]), 7)],
                "sourceWaterPoint": [round(water[0], 7), round(water[1], 7)],
                "seawardBearingDeg": round(bearing, 3),
            })
    return targets, (start + count) % len(parts), selected_ids


def build_regional_proxy_targets(
    policy_document: dict[str, Any],
    part_document: dict[str, Any],
    zone_coast_types: dict[str, str],
) -> list[dict[str, Any]]:
    """Build the eight fail-closed private Limfjord proxy targets.

    The checked-in policy is only an allowlist.  The current centrally hydrated
    coastal-part registry remains runtime truth, so every approved point is
    compared with that registry before any distant U/V values may be retained.
    """
    if policy_document.get("schemaVersion") != REGIONAL_PROXY_POLICY_SCHEMA_VERSION:
        raise ValueError("Unsupported regional current proxy policy schema")
    if policy_document.get("scoreImpact") is not False or policy_document.get("publicRuntime") is not False:
        raise ValueError("Regional current proxy policy must remain private and score-neutral")
    if policy_document.get("status") != "private-collection-enabled-public-activation-gated":
        raise ValueError("Regional current proxy policy is not approved for private-only collection")
    if int(policy_document.get("rawRetentionHours") or -1) != RETENTION_HOURS:
        raise ValueError("Regional current proxy policy must retain the seven-day raw limit")
    if policy_document.get("supportReportRawVectors") is not False:
        raise ValueError("Regional current proxy support reports cannot contain raw vectors")
    if policy_document.get("globalOverrideAllowed") is not False or policy_document.get("interpolation") is not False:
        raise ValueError("Regional current proxy policy cannot enable interpolation or a global override")
    if float(policy_document.get("regularMaximumDistanceKm") or -1) != MAX_GRID_DISTANCE_KM:
        raise ValueError("Regional current proxy policy changed the ordinary 5 km limit")
    if float(policy_document.get("regionalProxyMaximumDistanceKm") or -1) != REGIONAL_PROXY_MAX_GRID_DISTANCE_KM:
        raise ValueError("Regional current proxy policy must retain the 15 km cap")
    if policy_document.get("requiredCollection") != REGIONAL_PROXY_REQUIRED_COLLECTION:
        raise ValueError("Regional current proxy policy must use only dkss_lf")
    if policy_document.get("sameConnectedWaterBody") != "Limfjorden":
        raise ValueError("Regional current proxy policy must remain restricted to Limfjorden")

    indexed_parts: dict[str, tuple[str, dict[str, Any]]] = {}
    for parent_zone_id, rows in (part_document.get("zones") or {}).items():
        for part in rows or []:
            part_id = str(part.get("partId") or "")
            if part_id:
                indexed_parts[part_id] = (str(parent_zone_id), part)

    policy_rows = list(policy_document.get("parts") or [])
    policy_ids = [str(row.get("partId") or "") for row in policy_rows]
    if len(policy_rows) != 8 or len(set(policy_ids)) != 8 or any(not part_id for part_id in policy_ids):
        raise ValueError("Regional current proxy policy must contain exactly eight unique parts")

    targets: list[dict[str, Any]] = []
    for row in policy_rows:
        part_id = str(row["partId"])
        indexed = indexed_parts.get(part_id)
        if indexed is None:
            raise ValueError(f"Regional current proxy part is absent from central registry: {part_id}")
        parent_zone_id, part = indexed
        water = part.get("waterPoint")
        approved = row.get("approvedSamplingPoint")
        if not _valid_point(water) or not _valid_point(approved):
            raise ValueError(f"Regional current proxy point is invalid: {part_id}")
        current_point = [round(float(water[0]), 7), round(float(water[1]), 7)]
        approved_point = [round(float(approved[0]), 7), round(float(approved[1]), 7)]
        if current_point != approved_point:
            raise ValueError(f"Regional current proxy sampling point changed; reapproval required: {part_id}")
        if zone_coast_types.get(parent_zone_id) != "limfjord":
            raise ValueError(f"Regional current proxy left the Limfjord zone class: {part_id}")
        audit_distance = float(row.get("auditDistanceKm") or math.inf)
        if not math.isfinite(audit_distance) or audit_distance > REGIONAL_PROXY_MAX_GRID_DISTANCE_KM:
            raise ValueError(f"Regional current proxy exceeds its approved distance cap: {part_id}")
        targets.append({
            "id": f"{REGIONAL_PROXY_TARGET_PREFIX}{part_id}",
            "lon": float(current_point[0]),
            "lat": float(current_point[1]),
            "coastType": "limfjord",
            "researchCurrent": True,
            "regionalProxyCandidate": True,
            "researchClass": "owner-approved-regional-proxy",
            "partId": part_id,
            "parentZoneId": parent_zone_id,
            "name": str(row.get("name") or part.get("name") or part_id),
            "bandKm": 0.0,
            "targetPoint": current_point,
            "sourceWaterPoint": current_point,
            "approvedSamplingPoint": approved_point,
            "requiredCollection": REGIONAL_PROXY_REQUIRED_COLLECTION,
            "maximumDistanceKm": REGIONAL_PROXY_MAX_GRID_DISTANCE_KM,
            "sameConnectedWaterBody": "Limfjorden",
            "scoreImpact": False,
            "publicRuntime": False,
        })
    return targets


def eligible_replay_assets(
    assets: list[dict[str, Any]],
    captured_at: str,
    max_assets: int = 5,
    maximum_lead_hours: float = FORECAST_LEAD_MAX_HOURS,
) -> list[dict[str, Any]]:
    """Select cached forecast steps that can add useful research profiles.

    Ordinary workflow runs must be able to advance the geographic rotation even
    when DMI has not published a new model generation.  The caller still checks
    that the corresponding GRIB file exists locally; this helper only applies the
    same honest time window as :func:`record_profiles` and bounds replay work.
    """
    captured_epoch = _epoch(captured_at)
    if not captured_epoch:
        return []
    lower = captured_epoch - 3600
    upper = captured_epoch + float(maximum_lead_hours) * 3600
    eligible = [
        asset for asset in assets
        if lower <= _epoch(asset.get("valid")) <= upper
    ]
    eligible.sort(key=lambda asset: (_epoch(asset.get("valid")), str(asset.get("href") or "")))
    limit = max(1, int(max_assets))
    if len(eligible) <= limit:
        return eligible
    if limit == 1:
        return [eligible[-1]]
    # Preserve the near-term and far edge of the honest +12 h window instead of
    # selecting only the first hourly steps.  A small evenly spaced set gives
    # better research spread and lets one retained far-edge asset remain usable
    # across many ordinary workflow runs.
    indices = [round(index * (len(eligible) - 1) / (limit - 1)) for index in range(limit)]
    return [eligible[index] for index in indices]


def _valid_point(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) >= 2
        and all(isinstance(number, (int, float)) and math.isfinite(float(number)) for number in value[:2])
    )


def representative_profile(
    choices: list[dict[str, Any]],
    maximum_distance_km: float = MAX_GRID_DISTANCE_KM,
) -> dict[str, Any] | None:
    """Return representative layers at the single nearest shared U/V column."""
    resolved = _nearest_shared_uv_column(choices)
    if resolved is None:
        return None
    nearest, layers = resolved
    if float(nearest["distanceKm"]) > float(maximum_distance_km):
        return None
    surface = next((row for row in layers if str(row["layerKey"]).startswith("surface:")), None)
    top = surface or layers[0]
    bottom = layers[-1]
    middle = None
    if len(layers) >= 3:
        midpoint = (float(top["layerRank"]) + float(bottom["layerRank"])) / 2.0
        interior = [row for row in layers if row is not top and row is not bottom]
        if interior:
            middle = min(interior, key=lambda row: abs(float(row["layerRank"]) - midpoint))

    def compact(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if row is None:
            return None
        return {
            "verticalLayer": row["layerKey"],
            "verticalLayerRankM": round(float(row["layerRank"]), 3),
            "uMps": round(float(row["first"]["value"]), 5),
            "vMps": round(float(row["second"]["value"]), 5),
        }

    return {
        "gridPoint": [round(float(nearest["first"]["longitude"]), 7), round(float(nearest["first"]["latitude"]), 7)],
        "distanceKm": round(float(nearest["distanceKm"]), 5),
        "layers": {
            "surface": compact(surface),
            "topAvailable": compact(top),
            "middle": compact(middle),
            "bottom": compact(bottom),
        },
        "availableLayerCount": len(layers),
    }


def _nearest_shared_uv_column(
    choices: list[dict[str, Any]],
) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    """Resolve the nearest exact U/V column without applying the public 5 km gate."""
    if not choices:
        return None
    nearest = min(
        choices,
        key=lambda row: (float(row["distanceKm"]), tuple(row["pointKey"])),
    )
    point_key = tuple(nearest["pointKey"])
    column = [row for row in choices if tuple(row["pointKey"]) == point_key]
    by_layer = {str(row["layerKey"]): row for row in column}
    layers = sorted(
        by_layer.values(),
        key=lambda row: (float(row["layerRank"]), str(row["layerKey"])),
    )
    return (nearest, layers) if layers else None


def nearest_shared_uv_evidence(
    choices: list[dict[str, Any]],
    target_point: list[float],
) -> dict[str, Any] | None:
    """Describe exact paired U/V coverage without exposing or accepting its values.

    This evidence may be farther than the public 5 km limit.  It is used only to
    distinguish a reviewable point-placement edge from a structural model gap.
    No U/V values are returned and :func:`representative_profile` still rejects
    every column beyond five kilometres.
    """
    if not choices:
        return None
    columns: dict[tuple[Any, ...], list[dict[str, Any]]] = {}
    for row in choices:
        columns.setdefault(tuple(row["pointKey"]), []).append(row)
    _point_key, column = min(
        columns.items(),
        key=lambda item: (
            haversine_km(
                target_point,
                [float(item[1][0]["first"]["longitude"]), float(item[1][0]["first"]["latitude"])],
            ),
            item[0],
        ),
    )
    by_layer = {str(row["layerKey"]): row for row in column}
    layers = sorted(
        by_layer.values(),
        key=lambda row: (float(row["layerRank"]), str(row["layerKey"])),
    )
    if not layers:
        return None
    nearest = layers[0]
    grid_point = [
        round(float(nearest["first"]["longitude"]), 7),
        round(float(nearest["first"]["latitude"]), 7),
    ]
    distance = haversine_km(target_point, grid_point)
    deepest = layers[-1]
    return {
        "gridPoint": grid_point,
        "distanceKm": round(distance, 5),
        "withinPreferred3Km": distance <= 3.0,
        "withinAccepted5Km": distance <= MAX_GRID_DISTANCE_KM,
        "availableLayerCount": len(layers),
        "deepestAvailableLayer": str(deepest["layerKey"]),
        "deepestAvailableLayerRankM": round(float(deepest["layerRank"]), 3),
    }


def empty_document() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "distanceBandsKm": list(DISTANCE_BANDS_KM),
        "layerPolicy": "nearest-water-column; retain surface/top-available/middle/bottom layers",
        "cursor": 0,
        "anchors": {},
        "coverageAudits": {},
    }


def load_document(path: pathlib.Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
    except Exception:
        return empty_document()
    if value.get("schemaVersion") != SCHEMA_VERSION or not isinstance(value.get("anchors"), dict):
        return empty_document()
    value["retentionHours"] = RETENTION_HOURS
    value["scoreImpact"] = False
    value["publicRuntime"] = False
    value["distanceBandsKm"] = list(DISTANCE_BANDS_KM)
    if not isinstance(value.get("coverageAudits"), dict):
        value["coverageAudits"] = {}
    return value


def _target_identity(target: dict[str, Any]) -> dict[str, Any]:
    return {
        "partId": target.get("partId"),
        "parentZoneId": target.get("parentZoneId"),
        "name": target.get("name"),
        "bandKm": target.get("bandKm"),
        "targetPoint": target.get("targetPoint"),
        "sourceWaterPoint": target.get("sourceWaterPoint"),
        "seawardBearingDeg": target.get("seawardBearingDeg"),
        "researchClass": target.get("researchClass") or "transect",
        "regionalProxyCandidate": bool(target.get("regionalProxyCandidate")),
        "requiredCollection": target.get("requiredCollection"),
        "maximumDistanceKm": target.get("maximumDistanceKm") or MAX_GRID_DISTANCE_KM,
        "sameConnectedWaterBody": target.get("sameConnectedWaterBody"),
        "scoreImpact": False,
        "publicRuntime": False,
    }


def _same_target_identity(existing: dict[str, Any], identity: dict[str, Any]) -> bool:
    required = ("partId", "parentZoneId", "bandKm", "targetPoint", "sourceWaterPoint")
    if any(existing.get(key) != identity.get(key) for key in required):
        return False
    # Schema-v1 caches predate the policy metadata.  Missing additive fields are
    # upgraded in place; a conflicting value still invalidates the target.
    return all(key not in existing or existing.get(key) == value for key, value in identity.items())


def _coverage_audit_for_target(
    document: dict[str, Any],
    target_id: str,
    target: dict[str, Any],
) -> dict[str, Any]:
    audits = document.setdefault("coverageAudits", {})
    identity = _target_identity(target)
    existing = audits.get(target_id)
    if not isinstance(existing, dict) or not _same_target_identity(existing, identity):
        existing = {**identity, "observations": {}}
        audits[target_id] = existing
    else:
        existing.update(identity)
    return existing


def _target_maximum_distance_km(target: dict[str, Any], collection: str) -> float | None:
    if not target.get("regionalProxyCandidate"):
        return MAX_GRID_DISTANCE_KM
    if target.get("requiredCollection") != REGIONAL_PROXY_REQUIRED_COLLECTION:
        return None
    if collection != REGIONAL_PROXY_REQUIRED_COLLECTION:
        return None
    try:
        maximum = float(target.get("maximumDistanceKm"))
    except (TypeError, ValueError):
        return None
    if not math.isfinite(maximum) or maximum <= MAX_GRID_DISTANCE_KM or maximum > REGIONAL_PROXY_MAX_GRID_DISTANCE_KM:
        return None
    return maximum


def _record_coverage_observation(
    document: dict[str, Any],
    target_id: str,
    target: dict[str, Any],
    choices: list[dict[str, Any]],
    collection: str,
    model_run: str,
    valid_time: str,
    captured_at: str,
) -> None:
    audit = _coverage_audit_for_target(document, target_id, target)
    observations = audit.setdefault("observations", {})
    previous = observations.get(collection) or {}
    same_capture = (
        previous.get("capturedAt") == captured_at
        and previous.get("modelRun") == model_run
    )
    prior_evidence = previous.get("nearestSharedUv") if same_capture else None
    evidence = nearest_shared_uv_evidence(choices, target["targetPoint"])
    if evidence is not None:
        evidence = {**evidence, "validTime": valid_time}
    if (
        isinstance(prior_evidence, dict)
        and (
            evidence is None
            or float(prior_evidence.get("distanceKm") or math.inf)
            <= float(evidence.get("distanceKm") or math.inf)
        )
    ):
        evidence = prior_evidence
    observations[collection] = {
        "capturedAt": captured_at,
        "modelRun": model_run,
        "latestValidTime": valid_time,
        "status": "shared-uv-observed" if evidence is not None else "no-shared-uv-observed",
        "nearestSharedUv": evidence,
    }


def record_profiles(
    document: dict[str, Any],
    target_by_id: dict[str, dict[str, Any]],
    choices_by_target: dict[str, list[dict[str, Any]]],
    collection: str,
    model_run: str,
    valid_time: str,
    captured_at: str,
    source_asset_sha256: str | None = None,
) -> int:
    if _epoch(valid_time) < _epoch(captured_at) - 3600:
        return 0
    written = 0
    anchors = document.setdefault("anchors", {})
    for target_id, target in target_by_id.items():
        regional_operational_target = bool(
            target.get("regionalProxyCandidate")
            and target.get("requiredCollection") == collection
        )
        # The regional path can affect the controlled live runtime. Unlike the
        # score-neutral transect research, every such sample must therefore be
        # bound to the exact canonical DMI bytes that were processed.
        if regional_operational_target and not _valid_source_asset_sha256(source_asset_sha256):
            continue
        maximum_lead_hours = (
            REGIONAL_PROXY_OPERATIONAL_FORECAST_LEAD_MAX_HOURS
            if regional_operational_target
            else FORECAST_LEAD_MAX_HOURS
        )
        if _epoch(valid_time) > _epoch(captured_at) + maximum_lead_hours * 3600:
            continue
        maximum_distance = _target_maximum_distance_km(target, collection)
        if maximum_distance is None:
            continue
        choices = choices_by_target.get(target_id) or []
        _record_coverage_observation(
            document,
            target_id,
            target,
            choices,
            collection,
            model_run,
            valid_time,
            captured_at,
        )
        profile = representative_profile(choices, maximum_distance)
        if not profile:
            continue
        if haversine_km(target["targetPoint"], profile["gridPoint"]) > maximum_distance + 0.01:
            continue
        anchor = anchors.get(target_id)
        identity = _target_identity(target)
        if not isinstance(anchor, dict) or not _same_target_identity(anchor, identity):
            anchor = {**identity, "samples": []}
            anchors[target_id] = anchor
        else:
            anchor.update(identity)
        source_binding = (
            str(source_asset_sha256)
            if _valid_source_asset_sha256(source_asset_sha256)
            else "unbound-research"
        )
        sample_key = f"{collection}|{model_run}|{valid_time}|{source_binding}"
        samples = list(anchor.get("samples") or [])
        if any(row.get("sampleKey") == sample_key for row in samples):
            continue
        samples.append({
            "sampleKey": sample_key,
            "capturedAt": captured_at,
            "collection": collection,
            "modelRun": model_run,
            "validTime": valid_time,
            **({"sourceAssetSha256": source_binding}
               if source_binding != "unbound-research" else {}),
            **profile,
        })
        anchor["samples"] = samples
        written += 1
    document["generatedAt"] = captured_at
    return written


def regional_proxy_safe_report(
    document: dict[str, Any],
    targets: list[dict[str, Any]],
    generated_at: str,
) -> dict[str, Any]:
    """Return support-only evidence without copying private current values."""
    rows: list[dict[str, Any]] = []
    for target in sorted(targets, key=lambda row: str(row.get("partId") or "")):
        target_id = str(target["id"])
        anchor = (document.get("anchors") or {}).get(target_id) or {}
        samples = [
            sample for sample in (anchor.get("samples") or [])
            if sample.get("collection") == REGIONAL_PROXY_REQUIRED_COLLECTION
        ]
        audit = (document.get("coverageAudits") or {}).get(target_id) or {}
        observation = (audit.get("observations") or {}).get(REGIONAL_PROXY_REQUIRED_COLLECTION) or {}
        evidence = observation.get("nearestSharedUv") if isinstance(observation.get("nearestSharedUv"), dict) else None
        grid_points = sorted({
            tuple(round(float(value), 7) for value in sample.get("gridPoint", [])[:2])
            for sample in samples
            if _valid_point(sample.get("gridPoint"))
        })
        distances = sorted({round(float(sample["distanceKm"]), 5) for sample in samples if isinstance(sample.get("distanceKm"), (int, float))})
        layers = sorted({
            str(layer.get("verticalLayer"))
            for sample in samples
            for layer in (sample.get("layers") or {}).values()
            if isinstance(layer, dict) and layer.get("verticalLayer")
        })
        valid_times = sorted({str(sample.get("validTime")) for sample in samples if sample.get("validTime")}, key=_epoch)
        model_runs = sorted({str(sample.get("modelRun")) for sample in samples if sample.get("modelRun")}, key=_epoch)
        if samples:
            state = "private-vector-samples-collected"
        elif evidence and float(evidence.get("distanceKm") or math.inf) > REGIONAL_PROXY_MAX_GRID_DISTANCE_KM:
            state = "nearest-shared-uv-beyond-15km"
        elif evidence:
            state = "shared-uv-observed-without-stored-profile"
        elif observation:
            state = "no-shared-uv-observed"
        else:
            state = "not-yet-observed"
        rows.append({
            "partId": target.get("partId"),
            "name": target.get("name"),
            "parentZoneId": target.get("parentZoneId"),
            "samplingPoint": target.get("targetPoint"),
            "requiredCollection": REGIONAL_PROXY_REQUIRED_COLLECTION,
            "maximumDistanceKm": REGIONAL_PROXY_MAX_GRID_DISTANCE_KM,
            "qualityClass": "regional-proxy-candidate",
            "status": state,
            "sampleCount": len(samples),
            "modelRuns": model_runs,
            "validTimes": valid_times,
            "gridPoints": [list(point) for point in grid_points],
            "distanceKmValues": distances,
            "verticalLayers": layers,
            "latestObservedAt": observation.get("capturedAt"),
        })
    return {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "rawVectorsIncluded": False,
        "requiredCollection": REGIONAL_PROXY_REQUIRED_COLLECTION,
        "maximumDistanceKm": REGIONAL_PROXY_MAX_GRID_DISTANCE_KM,
        "configuredParts": len(rows),
        "partsWithSamples": sum(1 for row in rows if row["sampleCount"] > 0),
        "samples": sum(int(row["sampleCount"]) for row in rows),
        "parts": rows,
    }


def prune(document: dict[str, Any], now_iso: str) -> dict[str, int]:
    cutoff = _epoch(now_iso) - RETENTION_HOURS * 3600
    removed_samples = 0
    removed_anchors = 0
    for anchor_id in list((document.get("anchors") or {}).keys()):
        anchor = document["anchors"][anchor_id]
        samples = [row for row in (anchor.get("samples") or []) if _epoch(row.get("capturedAt")) >= cutoff]
        removed_samples += len(anchor.get("samples") or []) - len(samples)
        if samples:
            anchor["samples"] = sorted(samples, key=lambda row: (_epoch(row.get("validTime")), str(row.get("sampleKey"))))
        else:
            document["anchors"].pop(anchor_id, None)
            removed_anchors += 1
    for audit_id in list((document.get("coverageAudits") or {}).keys()):
        audit = document["coverageAudits"][audit_id]
        observations = {
            collection: row
            for collection, row in (audit.get("observations") or {}).items()
            if _epoch(row.get("capturedAt")) >= cutoff
        }
        if observations:
            audit["observations"] = observations
        else:
            document["coverageAudits"].pop(audit_id, None)
    document["generatedAt"] = now_iso
    return {"removedSamples": removed_samples, "removedAnchors": removed_anchors}


def save_document(path: pathlib.Path, document: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    temporary.replace(path)


def status(
    document: dict[str, Any],
    selected_part_ids: list[str] | None = None,
    run_metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    samples = [sample for anchor in (document.get("anchors") or {}).values() for sample in (anchor.get("samples") or [])]
    parts = {anchor.get("partId") for anchor in (document.get("anchors") or {}).values() if anchor.get("partId")}
    captured = sorted(row.get("capturedAt") for row in samples if row.get("capturedAt"))
    metrics = run_metrics or {}
    zero_band_audits = [
        audit for audit in (document.get("coverageAudits") or {}).values()
        if float(audit.get("bandKm") or 0.0) == 0.0
    ]
    observed_coverage_parts = set()
    accepted_coverage_parts = set()
    beyond_coverage_parts = set()
    no_pair_coverage_parts = set()
    for audit in zero_band_audits:
        observations = list((audit.get("observations") or {}).values())
        if not observations or not audit.get("partId"):
            continue
        part_id = audit["partId"]
        observed_coverage_parts.add(part_id)
        evidence = [
            row.get("nearestSharedUv") for row in observations
            if isinstance(row.get("nearestSharedUv"), dict)
        ]
        if any(bool(row.get("withinAccepted5Km")) for row in evidence):
            accepted_coverage_parts.add(part_id)
        elif evidence:
            beyond_coverage_parts.add(part_id)
        else:
            no_pair_coverage_parts.add(part_id)
    regional_anchors = [
        anchor for anchor in (document.get("anchors") or {}).values()
        if anchor.get("regionalProxyCandidate")
    ]
    regional_samples = [sample for anchor in regional_anchors for sample in (anchor.get("samples") or [])]
    return {
        "schemaVersion": 1,
        "generatedAt": document.get("generatedAt") or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "retentionHours": RETENTION_HOURS,
        "scoreImpact": False,
        "publicRuntime": False,
        "distanceBandsKm": list(DISTANCE_BANDS_KM),
        "anchorsWithSamples": len(document.get("anchors") or {}),
        "partsWithSamples": len(parts),
        "samples": len(samples),
        "oldestCapturedAt": captured[0] if captured else None,
        "newestCapturedAt": captured[-1] if captured else None,
        "selectedPartsThisRun": len(selected_part_ids or []),
        "rotationCursor": int(document.get("cursor") or 0),
        "rotationAdvancedThisRun": bool(metrics.get("rotationAdvancedThisRun")),
        "samplesWrittenThisRun": int(metrics.get("samplesWrittenThisRun") or 0),
        "cachedReplayAssetsThisRun": int(metrics.get("cachedReplayAssetsThisRun") or 0),
        "coveragePartsVisited": len(observed_coverage_parts),
        "coveragePartsWithSharedUvWithin5Km": len(accepted_coverage_parts),
        "coveragePartsWithOnlyDistantSharedUv": len(beyond_coverage_parts),
        "coveragePartsWithNoSharedUvObserved": len(no_pair_coverage_parts),
        "regionalProxyConfiguredThisRun": int(metrics.get("regionalProxyConfiguredThisRun") or 0),
        "regionalProxyPartsWithSamples": len({anchor.get("partId") for anchor in regional_anchors if anchor.get("partId")}),
        "regionalProxySamples": len(regional_samples),
    }


def _runtime_has_current(zone: dict[str, Any] | None) -> bool:
    if not isinstance(zone, dict):
        return False
    return any(
        isinstance(hour.get("current-u"), (int, float))
        and math.isfinite(float(hour["current-u"]))
        and isinstance(hour.get("current-v"), (int, float))
        and math.isfinite(float(hour["current-v"]))
        for hour in (zone.get("hourly") or {}).values()
    )


def owner_coverage_audit(
    document: dict[str, Any],
    part_document: dict[str, Any],
    bulk_document: dict[str, Any],
    zones_geojson: dict[str, Any],
    generated_at: str,
) -> dict[str, Any]:
    """Build a support-only owner action list without copying current values."""
    bulk_zones = bulk_document.get("zones") or {}
    part_rows: list[tuple[str, str, dict[str, Any]]] = []
    for parent_zone_id, rows in sorted((part_document.get("zones") or {}).items()):
        for part in rows or []:
            part_id = str(part.get("partId") or "")
            if part_id:
                part_rows.append((str(parent_zone_id), part_id, part))

    runtime_part_ids = {
        part_id for _parent, part_id, _part in part_rows
        if _runtime_has_current(bulk_zones.get(f"PART::{part_id}"))
    }
    missing_parts = []
    classifications: dict[str, int] = {}
    visited_missing_parts = 0
    audits = document.get("coverageAudits") or {}
    for parent_zone_id, part_id, part in part_rows:
        if part_id in runtime_part_ids:
            continue
        audit = audits.get(f"RESEARCH::{part_id}::0km")
        observations = list((audit or {}).get("observations", {}).values())
        evidence_rows = [
            {"collection": collection, **row["nearestSharedUv"]}
            for collection, row in (audit or {}).get("observations", {}).items()
            if isinstance(row.get("nearestSharedUv"), dict)
        ]
        evidence_rows.sort(key=lambda row: (float(row["distanceKm"]), str(row["collection"])))
        evidence = evidence_rows[0] if evidence_rows else None
        if audit and observations:
            visited_missing_parts += 1
        if not audit or not observations:
            classification = "not-yet-visited"
            advice = "Afvent den private rotationsmåling; flyt ikke punktet på dette grundlag."
        elif evidence is None:
            classification = "no-shared-uv-observed"
            advice = "Ingen fælles U/V-vandsøjle er observeret; jagt ikke en ukendt gittercelle manuelt."
        elif float(evidence["distanceKm"]) <= MAX_GRID_DISTANCE_KM:
            classification = "within-5km-but-runtime-missing"
            advice = "Punktet ligger inden for grænsen; undersøg tids-/cachekæden i stedet for at flytte det."
        elif float(evidence["distanceKm"]) <= 6.0:
            classification = "near-threshold-5-to-6km-manual-review"
            advice = "Kontrollér punktet optisk; ret det kun, hvis selve hav/land-placeringen er forkert, aldrig alene for at nå en modelcelle."
        elif float(evidence["distanceKm"]) <= 8.0:
            classification = "model-gap-6-to-8km"
            advice = "Flyt ikke et fysisk korrekt kystpunkt for at nå modellen; afstanden er for stor til en ren tærskeljustering."
        else:
            classification = "structural-model-gap-over-8km"
            advice = "Flyt ikke kystpunktet flere kilometer for at jagte modellen; dette er et model-/politikspørgsmål."
        classifications[classification] = classifications.get(classification, 0) + 1
        missing_parts.append({
            "partId": part_id,
            "parentZoneId": parent_zone_id,
            "name": part.get("name"),
            "sourceWaterPoint": part.get("waterPoint"),
            "classification": classification,
            "ownerAdvice": advice,
            "nearestSharedUv": evidence,
            "minimumDistanceReductionTo5Km": (
                round(max(0.0, float(evidence["distanceKm"]) - MAX_GRID_DISTANCE_KM), 3)
                if evidence is not None else None
            ),
        })

    part_rows_by_zone: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    for parent_zone_id, part_id, part in part_rows:
        part_rows_by_zone.setdefault(parent_zone_id, []).append((part_id, part))
    feature_by_id = {
        str((feature.get("properties") or {}).get("id")): feature
        for feature in (zones_geojson.get("features") or [])
        if (feature.get("properties") or {}).get("id")
    }
    missing_main_zones = []
    main_classifications: dict[str, int] = {}
    runtime_main_ids = {
        zone_id for zone_id in feature_by_id
        if _runtime_has_current(bulk_zones.get(zone_id))
    }
    for zone_id, feature in sorted(feature_by_id.items()):
        if zone_id in runtime_main_ids:
            continue
        local_rows = part_rows_by_zone.get(zone_id, [])
        verified_references = []
        for part_id, part in local_rows:
            if part_id not in runtime_part_ids:
                continue
            runtime = bulk_zones.get(f"PART::{part_id}") or {}
            grid = runtime.get("gridPoints") or {}
            current_u = grid.get("current-u") or {}
            current_v = grid.get("current-v") or {}
            if (
                current_u.get("latitude") != current_v.get("latitude")
                or current_u.get("longitude") != current_v.get("longitude")
            ):
                continue
            verified_references.append({
                "partId": part_id,
                "name": part.get("name"),
                "waterPoint": part.get("waterPoint"),
                "verifiedGridPoint": [current_u.get("longitude"), current_u.get("latitude")],
                "distanceKm": current_u.get("distanceKm"),
                "verticalLayer": current_u.get("verticalLayer"),
            })
        if verified_references:
            classification = "main-point-review-supported-by-local-current"
            advice = "Hovedpunktet kan optisk sammenholdes med de verificerede lokale referencepunkter; intet flyttes automatisk."
        else:
            classification = "zone-wide-model-gap"
            advice = "Ingen lokal del i zonen har verificeret strøm; en hovedpunktsflytning alene løser ikke den lokale dækning."
        main_classifications[classification] = main_classifications.get(classification, 0) + 1
        props = feature.get("properties") or {}
        missing_main_zones.append({
            "zoneId": zone_id,
            "name": props.get("name"),
            "samplingPoint": (bulk_zones.get(zone_id) or {}).get("samplingPoint"),
            "classification": classification,
            "ownerAdvice": advice,
            "verifiedLocalPartCount": len(verified_references),
            "localPartCount": len(local_rows),
            "verifiedLocalReferences": verified_references,
        })

    return {
        "schemaVersion": 1,
        "generatedAt": generated_at,
        "source": "private seven-day current-field coverage observations plus exact public runtime provenance",
        "scoreImpact": False,
        "publicRuntime": False,
        "automaticPointMovement": False,
        "currentPreferredDistanceKm": 3.0,
        "currentMaxDistanceKm": MAX_GRID_DISTANCE_KM,
        "summary": {
            "mainZones": len(feature_by_id),
            "runtimeVerifiedMainZones": len(runtime_main_ids),
            "runtimeMissingMainZones": len(missing_main_zones),
            "mainMissingClassifications": main_classifications,
            "coastalParts": len(part_rows),
            "runtimeVerifiedCoastalParts": len(runtime_part_ids),
            "runtimeMissingCoastalParts": len(missing_parts),
            "visitedMissingCoastalParts": visited_missing_parts,
            "missingPartClassifications": classifications,
        },
        "missingMainZones": missing_main_zones,
        "missingCoastalParts": missing_parts,
    }
