"""Exact-window acquisition priority, never provider admission or release proof.

Only independently validated donor selectors may supply covered pairs. Consumers
still derive their own truthful native coverage and final source-order closure.
This document may defer an acquisition; it cannot authorize a weather value.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
from typing import Any, Iterable

from .copernicus_target_identity import target_fingerprint


SCHEMA_VERSION = 1
KIND = "current-acquisition-plan"
CONTRACT_ID = "weather-acquisition-priority-v1"
FORECAST_HOUR_COUNT = 118
MAX_PLAN_BYTES = 16 * 1024 * 1024
_HASH = re.compile(r"sha256:[0-9a-f]{64}\Z")
_SOURCE_LABEL = re.compile(r"[a-z][a-z0-9-]{0,63}\Z")
_FIELDS = frozenset({
    "schemaVersion", "kind", "contractId", "productionReferenceAt",
    "targetRegistrySha256", "forecastHourCount", "coveredPairs",
    "sourceInputHashes", "bindingSha256",
})


class CurrentAcquisitionPlanError(ValueError):
    """Safe aggregate-only error: never include private inputs in its message."""


def exact_hour(value: Any) -> tuple[str, datetime]:
    try:
        instant = value if isinstance(value, datetime) else datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )
        if instant.tzinfo is None:
            raise ValueError
        instant = instant.astimezone(timezone.utc)
        if instant.minute or instant.second or instant.microsecond:
            raise ValueError
    except (TypeError, ValueError, OverflowError):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_REFERENCE_INVALID") from None
    return instant.strftime("%Y-%m-%dT%H:00:00Z"), instant


def _binding(document: dict[str, Any]) -> str:
    payload = {key: value for key, value in document.items() if key != "bindingSha256"}
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True,
                     separators=(",", ":"), allow_nan=False).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def _pair_keys(
    pairs: Iterable[Any], *, targets: list[dict[str, Any]],
    production_reference_at: Any,
) -> set[tuple[str, str]]:
    _, reference = exact_hour(production_reference_at)
    target_fingerprint(targets)  # Includes duplicate/sampling-identity checks.
    part_ids = {row["partId"] for row in targets}
    if not part_ids:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_TARGETS_EMPTY")
    last = reference + timedelta(hours=FORECAST_HOUR_COUNT - 1)
    keys: set[tuple[str, str]] = set()
    for pair in pairs:
        if isinstance(pair, dict) and set(pair) == {"partId", "validTime"}:
            part_id, valid_time = pair["partId"], pair["validTime"]
        elif isinstance(pair, (list, tuple)) and len(pair) == 2:
            part_id, valid_time = pair
        else:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIR_INVALID")
        if not isinstance(part_id, str) or part_id not in part_ids:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIR_TARGET_INVALID")
        text, instant = exact_hour(valid_time)
        if valid_time != text or not reference <= instant <= last:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIR_TIME_INVALID")
        key = (part_id, text)
        if key in keys:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIR_DUPLICATE")
        keys.add(key)
        if len(keys) > len(part_ids) * FORECAST_HOUR_COUNT:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIR_LIMIT")
    return keys


def build_current_acquisition_plan(
    *, targets: list[dict[str, Any]], production_reference_at: Any,
    covered_pairs: Iterable[Any], source_input_hashes: dict[str, str],
) -> dict[str, Any]:
    reference, _ = exact_hour(production_reference_at)
    keys = _pair_keys(covered_pairs, targets=targets, production_reference_at=reference)
    if not isinstance(source_input_hashes, dict) or len(source_input_hashes) > 32:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_INPUT_BINDING_INVALID")
    for label, digest in source_input_hashes.items():
        if not isinstance(label, str) or not _SOURCE_LABEL.fullmatch(label):
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_INPUT_LABEL_INVALID")
        if not isinstance(digest, str) or not _HASH.fullmatch(digest):
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_INPUT_HASH_INVALID")
    document = {
        "schemaVersion": SCHEMA_VERSION,
        "kind": KIND,
        "contractId": CONTRACT_ID,
        "productionReferenceAt": reference,
        "targetRegistrySha256": target_fingerprint(targets),
        "forecastHourCount": FORECAST_HOUR_COUNT,
        "coveredPairs": [
            {"partId": part_id, "validTime": valid_time}
            for part_id, valid_time in sorted(keys, key=lambda pair: (pair[1], pair[0]))
        ],
        "sourceInputHashes": dict(sorted(source_input_hashes.items())),
    }
    document["bindingSha256"] = _binding(document)
    return document


def validate_current_acquisition_plan(
    document: Any, *, production_reference_at: Any,
    targets: list[dict[str, Any]],
) -> set[tuple[str, str]]:
    if not isinstance(document, dict) or set(document) != _FIELDS:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_ENVELOPE_INVALID")
    if (type(document["schemaVersion"]) is not int
            or document["schemaVersion"] != SCHEMA_VERSION
            or document["kind"] != KIND or document["contractId"] != CONTRACT_ID
            or type(document["forecastHourCount"]) is not int
            or document["forecastHourCount"] != FORECAST_HOUR_COUNT):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_CONTRACT_INVALID")
    reference, _ = exact_hour(production_reference_at)
    if document["productionReferenceAt"] != reference:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_REFERENCE_MISMATCH")
    if document["targetRegistrySha256"] != target_fingerprint(targets):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_TARGET_MISMATCH")
    pairs = document["coveredPairs"]
    if not isinstance(pairs, list) or len(pairs) > len(targets) * FORECAST_HOUR_COUNT:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIRS_INVALID")
    if any(not isinstance(row, dict) or set(row) != {"partId", "validTime"}
           for row in pairs):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_PAIRS_INVALID")
    rebuilt = build_current_acquisition_plan(
        targets=targets, production_reference_at=reference,
        covered_pairs=pairs, source_input_hashes=document["sourceInputHashes"],
    )
    if document != rebuilt:
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_BINDING_INVALID")
    return {(row["partId"], row["validTime"]) for row in pairs}


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_DUPLICATE_FIELD")
        result[key] = value
    return result


def planning_regional_covered_pairs(
    *, dmi_ledger: dict[str, Any], dmi_attestation: dict[str, Any],
    targets: list[dict[str, Any]], regional_shadow: dict[str, Any],
    regional_policy: dict[str, Any], production_reference_at: Any,
) -> set[tuple[str, str]]:
    """Validate regional availability against this exact DMI ledger/target.

    Planning may know an eligible reserve before CP acquisition. Actual source
    selection must still follow CP and independently prove its final residual;
    this helper never writes, seals or admits a regional public assignment.
    """
    from .current_operational_closure import build_regional_residual_plan

    reference, _ = exact_hour(production_reference_at)
    pairs = dmi_ledger.get("operationalComplementPairs")
    if not isinstance(pairs, list):
        raise CurrentAcquisitionPlanError("ACQUISITION_REGIONAL_LEDGER_INVALID")
    plan = build_regional_residual_plan(
        residual_pairs=pairs, regional_policy=regional_policy, targets=targets,
        regional_shadow=regional_shadow, dmi_ledger=dmi_ledger,
        dmi_attestation=dmi_attestation, locked_reference=reference,
    )
    return _pair_keys(
        [{"partId": row["partId"], "validTime": row["validTime"]}
         for row in plan["regionalAssignments"]],
        targets=targets, production_reference_at=reference,
    )


def read_current_acquisition_plan(
    path: Path | str, *, production_reference_at: Any,
    targets: list[dict[str, Any]],
) -> set[tuple[str, str]]:
    try:
        with Path(path).open("rb") as handle:
            raw = handle.read(MAX_PLAN_BYTES + 1)
        if not raw or len(raw) > MAX_PLAN_BYTES:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_SIZE_INVALID")
        document = json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
        return validate_current_acquisition_plan(
            document, production_reference_at=production_reference_at, targets=targets,
        )
    except CurrentAcquisitionPlanError:
        raise
    except (OSError, UnicodeError, ValueError, TypeError, KeyError, RecursionError):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_INPUT_INVALID") from None


# V1 above remains exact. V2 embeds that unchanged document and adds only
# qualified retained scalar demand; it never admits a provider value.
QUALIFIED_KIND = "qualified-part-acquisition-plan"
QUALIFIED_CONTRACT_ID = "weather-qualified-scalar-priority-v2"
SCALAR_KIND = "retained-part-scalar-needs-v1"
SCALAR_COMPONENTS = ("wind", "waterLevel", "waterTemperature")
_SCALAR_FIELDS = frozenset({"schemaVersion", "kind", "productionReferenceAt", "partIds",
    "forecastHourCount", "supportHourCount", "encoding", "valueGapMasks",
    "waterTrendGapMask", "waterSupportMask", "snapshotInputHashes"})
_QUALIFIED_FIELDS = frozenset({"schemaVersion", "kind", "contractId", "productionReferenceAt",
    "targetRegistrySha256", "forecastHourCount", "currentPlan", "scalarPlan", "bindingSha256"})
_SNAPSHOT_RELATIVE_PATHS = {
    "parts": "data/live/coastal-parts-v2.json", "zones": "data/zones.geojson",
    "forecast": "data/live/dmi-forecast-cache.json", "stations": "data/live/dmi-water-stations.json",
    "deployed": ".cache/deployed-dmi-bulk-cache.json", "routing": "data/water-level-station-routing.json",
    "selection": ".cache/weather-component-selection-history.json",
    "openMeteo": ".cache/open-meteo-part-component-bank.json",
    "copernicus": ".cache/copernicus-component-bank.json",
    "pointState": ".cache/coastal-point-staging/activation-state-injection.json",
}


def scalar_snapshot_paths(root: Path | str, dmi_snapshot_path: Path | str,
                          historical_path: Path | str | None = None) -> dict[str, Path]:
    root = Path(root).resolve()
    result = {key: root / value for key, value in _SNAPSHOT_RELATIVE_PATHS.items()}
    result["dmi"] = Path(dmi_snapshot_path).resolve()
    if historical_path is not None:
        result["historical"] = Path(historical_path).resolve()
    return result


def _scalar_mask(value: Any, bits: int) -> bytes:
    size = (bits + 7) // 8
    if (not isinstance(value, str) or len(value) != 2 * size
            or re.fullmatch(r"[0-9a-f]*", value) is None):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_MASK_ENCODING_INVALID")
    raw = bytes.fromhex(value)
    remainder = bits % 8
    if remainder and raw[-1] >> remainder:
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_MASK_PADDING_INVALID")
    return raw


def _scalar_bit(raw: bytes, index: int) -> bool:
    return bool(raw[index // 8] & (1 << (index % 8)))


def validate_scalar_needs(document: Any, *, targets: list[dict[str, Any]],
                          production_reference_at: Any) -> dict[str, Any]:
    reference_text, reference = exact_hour(production_reference_at)
    target_fingerprint(targets)
    ids = sorted((row["partId"] for row in targets), key=lambda value: value.encode("utf-8"))
    if (not isinstance(document, dict) or set(document) != _SCALAR_FIELDS
            or type(document["schemaVersion"]) is not int or document["schemaVersion"] != 1
            or document["kind"] != SCALAR_KIND or document["productionReferenceAt"] != reference_text
            or document["partIds"] != ids or not ids
            or type(document["forecastHourCount"]) is not int or document["forecastHourCount"] != 118
            or type(document["supportHourCount"]) is not int or document["supportHourCount"] != 121
            or document["encoding"] != "hex-lsb0-v1"):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_DOMAIN_INVALID")
    values = document["valueGapMasks"]
    if not isinstance(values, dict) or set(values) != set(SCALAR_COMPONENTS):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_COMPONENTS_INVALID")
    masks = {key: _scalar_mask(values[key], len(ids) * 118) for key in SCALAR_COMPONENTS}
    trend = _scalar_mask(document["waterTrendGapMask"], len(ids) * 118)
    support = _scalar_mask(document["waterSupportMask"], len(ids) * 121)
    if any(a & b for a, b in zip(masks["waterLevel"], trend)):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_WATER_REASON_COLLISION")
    snapshot = document["snapshotInputHashes"]
    expected = set(_SNAPSHOT_RELATIVE_PATHS) | {"dmi"}
    if (not isinstance(snapshot, dict) or set(snapshot) not in (expected, expected | {"historical"})):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_ROLES_INVALID")
    for key, value in snapshot.items():
        if value is None and key not in {"dmi", "parts", "zones", "forecast", "stations", "historical"}:
            continue
        if (not isinstance(value, dict) or set(value) != {"bytes", "sha256"}
                or type(value["bytes"]) is not int or value["bytes"] <= 0
                or not isinstance(value["sha256"], str) or not _HASH.fullmatch(value["sha256"])):
            raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_HASH_INVALID")
    for part_index in range(len(ids)):
        water_needs = {i for i in range(118) if _scalar_bit(masks["waterLevel"], part_index * 118 + i)
                       or _scalar_bit(trend, part_index * 118 + i)}
        expected_support = {i + 3 for i in water_needs if i + 3 not in water_needs}
        actual_support = {i for i in range(121) if _scalar_bit(support, part_index * 121 + i)}
        if actual_support != expected_support:
            raise CurrentAcquisitionPlanError("SCALAR_PLAN_T_PLUS_3_INVALID")
    # Retain the existing per-PART masks until the normal producer determines
    # which targets that collection/parameter can actually serve. This internal
    # representation adds no wire fields or provider-availability assertion.
    return {"referenceAt": reference, "partIds": tuple(ids),
            "partIndexes": {part_id: i for i, part_id in enumerate(ids)},
            "parentZoneIds": {row["partId"]: row["parentZoneId"] for row in targets},
            "valueGapMasks": masks, "waterTrendGapMask": trend,
            "waterSupportMask": support}


def build_qualified_acquisition_plan(current_plan: dict[str, Any], scalar_plan: dict[str, Any], *,
                                     targets: list[dict[str, Any]], production_reference_at: Any) -> dict[str, Any]:
    reference, _ = exact_hour(production_reference_at)
    validate_current_acquisition_plan(current_plan, targets=targets, production_reference_at=reference)
    validate_scalar_needs(scalar_plan, targets=targets, production_reference_at=reference)
    document = {"schemaVersion": 2, "kind": QUALIFIED_KIND, "contractId": QUALIFIED_CONTRACT_ID,
        "productionReferenceAt": reference, "targetRegistrySha256": target_fingerprint(targets),
        "forecastHourCount": 118, "currentPlan": current_plan, "scalarPlan": scalar_plan}
    document["bindingSha256"] = _binding(document)
    return document


def validate_qualified_acquisition_plan(document: Any, current_plan: dict[str, Any], *,
                                        targets: list[dict[str, Any]], production_reference_at: Any) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != _QUALIFIED_FIELDS:
        raise CurrentAcquisitionPlanError("QUALIFIED_PLAN_ENVELOPE_INVALID")
    expected = build_qualified_acquisition_plan(current_plan, document["scalarPlan"],
        targets=targets, production_reference_at=production_reference_at)
    if document != expected:
        raise CurrentAcquisitionPlanError("QUALIFIED_PLAN_BINDING_INVALID")
    compiled = validate_scalar_needs(document["scalarPlan"], targets=targets,
                                     production_reference_at=production_reference_at)
    compiled["currentCoveredPairs"] = validate_current_acquisition_plan(
        current_plan, targets=targets, production_reference_at=production_reference_at)
    return compiled


def _planning_json(path: Path | str) -> Any:
    try:
        with Path(path).open("rb") as handle:
            raw = handle.read(MAX_PLAN_BYTES + 1)
        if not raw or len(raw) > MAX_PLAN_BYTES:
            raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_SIZE_INVALID")
        return json.loads(raw.decode("utf-8"), object_pairs_hook=_unique_object)
    except CurrentAcquisitionPlanError:
        raise
    except (OSError, UnicodeError, ValueError, TypeError, RecursionError):
        raise CurrentAcquisitionPlanError("ACQUISITION_PLAN_INPUT_INVALID") from None


def read_qualified_acquisition_plan(path: Path | str, *, current_plan_path: Path | str,
                                    targets: list[dict[str, Any]], production_reference_at: Any,
                                    snapshot_paths: dict[str, Path], check_continue=lambda: True) -> dict[str, Any]:
    current = _planning_json(current_plan_path)
    document = _planning_json(path)
    compiled = validate_qualified_acquisition_plan(document, current, targets=targets,
                                                   production_reference_at=production_reference_at)
    snapshot = document["scalarPlan"]["snapshotInputHashes"]
    if not isinstance(snapshot_paths, dict) or set(snapshot_paths) != set(snapshot):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_CONTEXT_INVALID")
    for role, filename in snapshot_paths.items():
        expected = snapshot[role]
        try:
            actual = Path(filename).lstat()
        except FileNotFoundError:
            if expected is None:
                continue
            raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_MISSING") from None
        if expected is None or Path(filename).is_symlink() or not Path(filename).is_file():
            raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_CHANGED")
        digest = hashlib.sha256()
        with Path(filename).open("rb") as handle:
            while True:
                if not check_continue():
                    raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_TIME_STOP")
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        after = Path(filename).lstat()
        if ((actual.st_dev, actual.st_ino, actual.st_size, actual.st_mtime_ns)
                != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)
                or actual.st_size != expected["bytes"] or "sha256:" + digest.hexdigest() != expected["sha256"]):
            raise CurrentAcquisitionPlanError("SCALAR_PLAN_SNAPSHOT_CHANGED")
    return compiled


def scalar_gap_components_at(plan: dict[str, Any] | None, valid_time: Any, *,
                             part_ids: Iterable[str] | None = None) -> frozenset[str]:
    if plan is None:
        return frozenset()
    _, instant = exact_hour(valid_time)
    selected = plan["partIds"] if part_ids is None else tuple(part_ids)
    if (isinstance(part_ids, str) or len(set(selected)) != len(selected)
            or any(part_id not in plan["partIndexes"] for part_id in selected)):
        raise CurrentAcquisitionPlanError("SCALAR_PLAN_TARGET_SCOPE_INVALID")
    offset = int((instant - plan["referenceAt"]).total_seconds() // 3600)
    if offset < 0 or offset >= 121:
        return frozenset()
    components: set[str] = set()
    for part_id in selected:
        index = plan["partIndexes"][part_id]
        if offset < 118:
            for component, mask in plan["valueGapMasks"].items():
                if _scalar_bit(mask, index * 118 + offset):
                    components.add(component)
            # TREND_GAP at T remains required alongside its T+3 support.
            if _scalar_bit(plan["waterTrendGapMask"], index * 118 + offset):
                components.add("waterLevel")
        if _scalar_bit(plan["waterSupportMask"], index * 121 + offset):
            components.add("waterLevel")
    return frozenset(components)
