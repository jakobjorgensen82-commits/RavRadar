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
