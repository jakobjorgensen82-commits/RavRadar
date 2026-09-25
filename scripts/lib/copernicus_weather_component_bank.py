"""Private non-current CP plan/producer/bank, independent of score and transport.

The caller supplies exact already-admitted gaps/challenges and an approved
product routing policy. No current-product boundary is borrowed for waves/SST.
The acquisition callback must execute the pinned request and return its local
response path. Spatial admission is a separate trusted verifier, not a flag in
the downloaded data. Legacy native level records remain readable for storage
integrity, but water level is DMI-only and is never planned or admitted here.
"""
from __future__ import annotations

import copy
import math
import os
import re
import struct
import tempfile
from datetime import timedelta
from pathlib import Path
from typing import Any, Callable

from .copernicus_current import canonical_json, canonical_sha256, valid_sha256, haversine_km
from .copernicus_target_identity import target_fingerprint
from .copernicus_weather_components import (
    CONTRACTS, ComponentReadError, _time, _iso, _values, read_component_subset,
)


PLAN_KIND = "RAVRADAR_PRIVATE_COPERNICUS_WEATHER_COMPONENT_PLAN"
BANK_KIND = "RAVRADAR_PRIVATE_COPERNICUS_WEATHER_COMPONENT_BANK"
STAGE_KIND = "RAVRADAR_PRIVATE_COPERNICUS_WEATHER_COMPONENT_PROGRESS"
COMPONENTS = {"wind", "wave", "waterLevel", "waterTemperature"}
REQUEST_CONTRACT = "cp-exact-part-component-native-hours-v1"
PROJECTION_KIND = "RAVRADAR_PRIVATE_CP_COMPONENT_PROJECTION"
PROJECTION_DOMAIN = "cp-exact-part-component-projection-typed-ieee754be-v1"


def binary64_hex(value: float | int) -> str:
    """Exact shared hash representation, not rounded scientific input."""
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError("CP_COMPONENT_PROJECTION_NUMBER_INVALID")
    return struct.pack(">d", float(value) if value != 0 else 0.0).hex()


def _numeric_hash_fields(value: Any) -> Any:
    if type(value) in (float, int):
        return "n:" + binary64_hex(value)
    if isinstance(value, str):
        return "s:" + value
    if isinstance(value, list):
        return [_numeric_hash_fields(v) for v in value]
    if isinstance(value, dict):
        return {k: _numeric_hash_fields(v) for k, v in value.items()}
    return value


def seal_component_projection(candidate: dict) -> dict:
    """Bind the complete selected candidate (values AND proof) for JS readers.

    Numeric leaves become n:<IEEE754 binary64 big-endian hex>; every string
    becomes s:<original>. Boolean/null retain type, preventing number/string
    collisions. Normal candidate fields remain ordinary JSON numbers. Hash
    equality is integrity, not independent spatial authorization.
    """
    return _sealed({"kind": PROJECTION_KIND, "schemaVersion": 1,
        "hashDomain": PROJECTION_DOMAIN,
        "payload": _numeric_hash_fields({k: v for k, v in candidate.items() if k != "projection"})}, "projectionSha256")


def _hour(value: Any):
    result = _time(value, "CP_COMPONENT_HOUR_INVALID")
    # JS toISOString() supplies .000Z; Python native proofs use Z. Accept only
    # these two exact UTC-hour spellings and normalise BEFORE sealing a plan.
    if (not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z", value)
        or result.minute or result.second or result.microsecond
        or _iso(result) != value.replace(".000Z", "Z")):
        raise ValueError("CP_COMPONENT_HOUR_INVALID")
    return result


def _sealed(value: dict, field: str) -> dict:
    return {**value, field: canonical_sha256(value)}


def _check_seal(value: dict, field: str) -> None:
    if not isinstance(value, dict) or value.get(field) != canonical_sha256({k: v for k, v in value.items() if k != field}):
        raise ValueError("CP_COMPONENT_DOCUMENT_HASH_INVALID")


def _targets(targets: list[dict]) -> dict:
    result = {}
    for target in targets:
        point = target.get("waterPoint")
        if (not isinstance(point, list) or len(point) != 2
            or any(type(v) not in (float, int) or not math.isfinite(v) for v in point)
            or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90
            or any(not isinstance(target.get(k), str) or not target[k] for k in ("partId", "parentZoneId"))
            or target["partId"] in result):
            raise ValueError("CP_COMPONENT_TARGET_INVALID")
        result[target["partId"]] = {k: copy.deepcopy(target[k]) for k in ("partId", "parentZoneId", "waterPoint")}
    if not result:
        raise ValueError("CP_COMPONENT_TARGETS_EMPTY")
    return result


def _need_key(row: dict) -> tuple:
    return row["partId"], row["component"], row["validTime"]


def build_component_plan(*, targets: list[dict], production_reference_at: str,
                         needs: list[dict], product_routes: dict, routing_policy: dict,
                         retention_start_at: str, retention_end_at: str) -> dict:
    """Plan exact gaps, aged-DMI challenges and CP upgrades over Open-Meteo.

    product_routes[partId][component] is an explicitly approved ordered list of
    contract keys. Empty routes (including wind) remain visible unresolved work.
    Water level is DMI-only, including T+3: no reserve route is constructed.
    """
    reference = _hour(production_reference_at)
    lower, upper = _hour(retention_start_at), _hour(retention_end_at)
    production_reference_at, retention_start_at, retention_end_at = map(_iso, (reference, lower, upper))
    if not lower <= reference <= upper:
        raise ValueError("CP_COMPONENT_RETENTION_INTERVAL_INVALID")
    by_id = _targets(targets)
    if (set(routing_policy) != {"policyId", "policySha256"}
        or not isinstance(routing_policy["policyId"], str) or not routing_policy["policyId"]
        or not valid_sha256(routing_policy["policySha256"])):
        raise ValueError("CP_COMPONENT_ROUTING_POLICY_REQUIRED")
    rows, seen = [], set()
    for raw in needs:
        if not isinstance(raw, dict) or not {"partId", "component", "validTime", "purpose"} <= set(raw):
            raise ValueError("CP_COMPONENT_NEED_INVALID")
        row = {k: raw[k] for k in ("partId", "component", "validTime", "purpose")}
        row["validTime"] = _iso(_hour(row["validTime"]))
        if row["partId"] not in by_id or row["component"] not in COMPONENTS or _need_key(row) in seen:
            raise ValueError("CP_COMPONENT_NEED_INVALID")
        when = _hour(row["validTime"])
        if not lower <= when <= min(upper, reference + timedelta(hours=117)):
            raise ValueError("CP_COMPONENT_NEED_OUTSIDE_WINDOW")
        if row["purpose"] == "AGED_DMI_CHALLENGE":
            protected = _hour(raw.get("protectedModelRun"))
            if reference - protected < timedelta(hours=96):
                raise ValueError("CP_COMPONENT_DMI_CHALLENGE_PREMATURE")
            row["protectedModelRun"] = _iso(protected)
        elif row["purpose"] == "OPEN_METEO_UPGRADE":
            if row["component"] not in {"wave", "waterTemperature"}:
                raise ValueError("CP_COMPONENT_UPGRADE_PRODUCT_INVALID")
        elif row["purpose"] != "GAP":
            raise ValueError("CP_COMPONENT_NEED_PURPOSE_INVALID")
        seen.add(_need_key(row))
        if row["component"] == "waterLevel":
            continue
        rows.append(row)
    support_rows = []
    routes = {}
    for row in [*rows, *support_rows]:
        keys = product_routes.get(row["partId"], {}).get(row["component"], [])
        if (not isinstance(keys, list) or len(set(keys)) != len(keys)
            or any(key not in CONTRACTS or CONTRACTS[key].component != row["component"] for key in keys)):
            raise ValueError("CP_COMPONENT_PRODUCT_ROUTE_INVALID")
        routes.setdefault(row["partId"], {})[row["component"]] = keys[:]
    value = {"kind": PLAN_KIND, "schemaVersion": 1, "productionReferenceAt": production_reference_at,
             "retentionStartAt": retention_start_at, "retentionEndAt": retention_end_at,
             "targetRegistrySha256": target_fingerprint(list(by_id.values())),
             "targets": sorted(by_id.values(), key=lambda r: r["partId"]),
             "routingPolicy": copy.deepcopy(routing_policy), "productRoutes": routes,
             "needs": sorted(rows, key=lambda r: (r["validTime"], r["partId"], r["component"])),
             "privateSupportNeeds": support_rows}
    return _sealed(value, "planSha256")


def validate_component_plan(plan: dict) -> dict:
    _check_seal(plan, "planSha256")
    rebuilt = build_component_plan(targets=plan["targets"], production_reference_at=plan["productionReferenceAt"],
        needs=plan["needs"], product_routes=plan["productRoutes"], routing_policy=plan["routingPolicy"],
        retention_start_at=plan["retentionStartAt"], retention_end_at=plan["retentionEndAt"])
    if rebuilt != plan:
        raise ValueError("CP_COMPONENT_PLAN_INVALID")
    return plan


def _request(plan: dict, part_id: str, contract_key: str, times: list[str]) -> dict:
    contract = CONTRACTS[contract_key]
    target = next(t for t in plan["targets"] if t["partId"] == part_id)
    return _sealed({"contractId": REQUEST_CONTRACT, "contractKey": contract_key,
        "component": contract.component, "productId": contract.product_id,
        "datasetId": contract.dataset_id, "datasetVersion": contract.dataset_version,
        "variables": [f[0] for f in contract.fields], "target": copy.deepcopy(target),
        "targetRegistrySha256": plan["targetRegistrySha256"],
        "productionReferenceAt": plan["productionReferenceAt"], "expectedTimes": sorted(times),
        "retentionStartAt": plan["retentionStartAt"], "retentionEndAt": plan["retentionEndAt"],
        "routingPolicy": plan["routingPolicy"], "raiseIfUpdating": True}, "requestSha256")


def _validate_request(request: dict, targets: list[dict]) -> None:
    _check_seal(request, "requestSha256")
    by_id = _targets(targets)
    target = request.get("target", {})
    contract = CONTRACTS.get(request.get("contractKey"))
    if (contract is None or target != by_id.get(target.get("partId"))
        or request.get("targetRegistrySha256") != target_fingerprint(targets)
        or request.get("contractId") != REQUEST_CONTRACT or request.get("raiseIfUpdating") is not True
        or request.get("component") != contract.component
        or request.get("productId") != contract.product_id or request.get("datasetId") != contract.dataset_id
        or request.get("datasetVersion") != contract.dataset_version
        or request.get("variables") != [f[0] for f in contract.fields]):
        raise ValueError("CP_COMPONENT_REQUEST_INVALID")
    times = request.get("expectedTimes")
    reference = _hour(request.get("productionReferenceAt"))
    lower, upper = _hour(request["retentionStartAt"]), _hour(request["retentionEndAt"])
    if not lower <= reference <= upper:
        raise ValueError("CP_COMPONENT_REQUEST_RETENTION_INVALID")
    end = min(upper, reference + timedelta(hours=120 if contract.component == "waterLevel" else 117))
    if not isinstance(times, list) or not times or times != sorted(set(times)):
        raise ValueError("CP_COMPONENT_REQUEST_TIMES_INVALID")
    if any(not lower <= _hour(t) <= end for t in times):
        raise ValueError("CP_COMPONENT_REQUEST_WINDOW_INVALID")


def _record(entry: dict, request: dict, targets: list[dict]) -> dict:
    _check_seal(entry, "recordId")
    row = entry["native"]
    contract = CONTRACTS[request["contractKey"]]
    target = request["target"]
    acquisition = _time(entry["acquisitionAt"], "CP_COMPONENT_ACQUISITION_INVALID")
    if (entry["requestSha256"] != request["requestSha256"]
        or row.get("validTime") not in request["expectedTimes"]
        or any(row.get(k) != target[k] for k in ("partId", "parentZoneId"))
        or row.get("samplingPoint") != target["waterPoint"]
        or row.get("provider") != "copernicus" or row.get("contractKey") != request["contractKey"]
        or any(row.get(k) != request[k] for k in ("component", "productId", "datasetId", "datasetVersion"))
        or row.get("admission") != "reader-only-pending-spatial-and-request-binding"
        or row.get("datasetBinding") != "caller-pinned-request" or row.get("interpolation") is not False
        or not valid_sha256(row.get("subsetSha256")) or not isinstance(row.get("gridPoint"), list)
        or len(row["gridPoint"]) != 2 or any(type(v) not in (int, float) or not math.isfinite(v) for v in row["gridPoint"])
        or not -180 <= row["gridPoint"][0] <= 180 or not -90 <= row["gridPoint"][1] <= 90):
        raise ValueError("CP_COMPONENT_BANK_RECORD_INVALID")
    distance = haversine_km(target["waterPoint"], row["gridPoint"])
    if (type(row.get("distanceKm")) not in (int, float) or not math.isfinite(row["distanceKm"])
        or distance > 2.0 + 1e-9 or abs(distance - row["distanceKm"]) > 1e-6
        or row.get("verticalLayerM") != contract.surface_depth_m
        or row.get("nativeFields") != [f[0] for f in contract.fields]):
        raise ValueError("CP_COMPONENT_BANK_SPATIAL_FIELDS_INVALID")
    indexes = row.get("gridIndex")
    if (not isinstance(indexes, dict) or set(indexes) != {"latitude", "longitude"}
        or any(type(v) is not int or v < 0 for v in [*indexes.values(), row.get("nativeTimeIndex")])):
        raise ValueError("CP_COMPONENT_BANK_NATIVE_INDEX_INVALID")
    names = {"wave": ["waveHeightM", "wavePeriodS", "waveDirectionDeg"],
             "waterTemperature": ["waterTemperatureC"], "waterLevel": ["seaSurfaceHeightM"]}[contract.component]
    if (not isinstance(row.get("values"), dict) or set(row["values"]) != set(names)
        or any(v is not None and (type(v) not in (int, float) or not math.isfinite(v)) for v in row["values"].values())):
        raise ValueError("CP_COMPONENT_BANK_VALUES_INVALID")
    physical, units = _values(contract.component, [float(row["values"][n]) if row["values"][n] is not None else math.nan for n in names])
    if physical != row["values"] or units != row["units"]:
        raise ValueError("CP_COMPONENT_BANK_VALUES_INVALID")
    if contract.component == "waterLevel" and row.get("datum") != contract.fields[0][1]:
        raise ValueError("CP_COMPONENT_BANK_DATUM_INVALID")
    if contract.component == "wave" and (row.get("wavePeriodSemantics") != "peak" or row.get("wavePeriodField") != "VTPK"):
        raise ValueError("CP_COMPONENT_BANK_PERIOD_INVALID")
    if row["modelRun"] is None:
        if row.get("modelReference") is not None or row.get("modelRunEvidence") != {
            "kind": "unavailable", "reason": "NO_RESPONSE_FORECAST_REFERENCE_TIME"}:
            raise ValueError("CP_COMPONENT_BANK_UNKNOWN_AGE_INVALID")
    else:
        run, valid = _hour(row["modelRun"]), _hour(row["validTime"])
        proof = row.get("modelReference")
        lead = (valid - run).total_seconds()
        if (not isinstance(proof, dict) or row.get("modelRunEvidence") != proof
            or proof.get("kind") != "subset-forecast-reference-time" or proof.get("payloadSha256") != row["subsetSha256"]
            or proof.get("modelRun") != row["modelRun"] or proof.get("validTime") != row["validTime"]
            or proof.get("leadSeconds") != lead or run > acquisition
            or not isinstance(proof.get("referenceVariable"), str) or not proof["referenceVariable"]
            or (proof.get("referenceIndex") is not None and proof["referenceIndex"] != row["nativeTimeIndex"])
            or type(proof.get("forecastPeriodChecked")) is not bool
            or (proof["forecastPeriodChecked"] and not isinstance(proof.get("forecastPeriodVariable"), str))
            or (not proof["forecastPeriodChecked"] and proof.get("forecastPeriodVariable") is not None)
            or run.hour not in contract.run_hours or not contract.lead_hours[0] * 3600 <= lead <= contract.lead_hours[1] * 3600):
            raise ValueError("CP_COMPONENT_BANK_MODEL_REFERENCE_INVALID")
    return row


def empty_component_bank(targets: list[dict]) -> dict:
    _targets(targets)
    return _sealed({"kind": BANK_KIND, "schemaVersion": 1,
        "targetRegistrySha256": target_fingerprint(targets), "targets": sorted(_targets(targets).values(), key=lambda t: t["partId"]), "targetRegistryHistory": [],
        "requests": [], "records": []}, "bankSha256")


def validate_component_bank(bank: dict, *, targets: list[dict]) -> dict:
    _check_seal(bank, "bankSha256")
    if (set(bank) != {"kind", "schemaVersion", "targetRegistrySha256", "targets", "targetRegistryHistory", "requests", "records", "bankSha256"}
        or bank["kind"] != BANK_KIND or bank["schemaVersion"] != 1
        or bank["targetRegistrySha256"] != target_fingerprint(targets)
        or bank["targets"] != sorted(_targets(targets).values(), key=lambda t: t["partId"])):
        raise ValueError("CP_COMPONENT_BANK_IDENTITY_INVALID")
    target_registries = {bank["targetRegistrySha256"]: targets}
    current_targets = _targets(targets)
    for historical in bank["targetRegistryHistory"]:
        if (set(historical) != {"targetRegistrySha256", "targets"}
            or historical["targetRegistrySha256"] in target_registries
            or target_fingerprint(historical["targets"]) != historical["targetRegistrySha256"]):
            raise ValueError("CP_COMPONENT_BANK_TARGET_HISTORY_INVALID")
        _targets(historical["targets"])
        target_registries[historical["targetRegistrySha256"]] = historical["targets"]
    requests = {}
    for request in bank["requests"]:
        original_targets = target_registries.get(request.get("targetRegistrySha256"))
        if original_targets is None or request.get("target") != current_targets.get(request.get("target", {}).get("partId")):
            raise ValueError("CP_COMPONENT_BANK_TARGET_REBIND_INVALID")
        _validate_request(request, original_targets)
        if request["requestSha256"] in requests:
            raise ValueError("CP_COMPONENT_BANK_DUPLICATE_REQUEST")
        requests[request["requestSha256"]] = request
    keys = set()
    for entry in bank["records"]:
        if entry.get("requestSha256") not in requests:
            raise ValueError("CP_COMPONENT_BANK_REQUEST_MISSING")
        row = _record(entry, requests[entry["requestSha256"]], targets)
        key = row["contractKey"], row["partId"], row["validTime"], bool(row["modelRun"])
        if key in keys:
            raise ValueError("CP_COMPONENT_BANK_DUPLICATE_ROW")
        keys.add(key)
    if set(requests) != {entry["requestSha256"] for entry in bank["records"]}:
        raise ValueError("CP_COMPONENT_BANK_ORPHAN_REQUEST")
    if set(target_registries) - {bank["targetRegistrySha256"]} != {
        r["targetRegistrySha256"] for r in requests.values()} - {bank["targetRegistrySha256"]}:
        raise ValueError("CP_COMPONENT_BANK_ORPHAN_TARGET_HISTORY")
    return bank


def _spatially_admitted(entry: dict, request: dict, plan: dict, admit_spatial: Callable | None) -> bool:
    if admit_spatial is None:
        return True
    proof = admit_spatial(copy.deepcopy(entry), copy.deepcopy(request), copy.deepcopy(request["target"]))
    return bool(isinstance(proof, dict)
        and proof.get("recordId") == entry["recordId"]
        and proof.get("targetRegistrySha256") == plan["targetRegistrySha256"]
        and isinstance(proof.get("policyId"), str) and proof["policyId"]
        and valid_sha256(proof.get("policySha256"))
        and valid_sha256(proof.get("evidenceSha256")))


def merge_component_read(bank: dict, *, plan: dict, request: dict, read: dict,
                         acquisition_at: str, admit_spatial: Callable | None = None) -> dict:
    """Merge atomic candidates; holes/unknown ages cannot erase valid donors."""
    validate_component_plan(plan)
    acquisition_at = _iso(_time(acquisition_at, "CP_COMPONENT_ACQUISITION_INVALID"))
    validate_component_bank(bank, targets=plan["targets"])
    _validate_request(request, plan["targets"])
    if (read.get("kind") != "RAVRADAR_PRIVATE_COPERNICUS_COMPONENT_SUBSET_READ" or read.get("schemaVersion") != 1
        or read.get("contractKey") != request["contractKey"] or not valid_sha256(read.get("subsetSha256"))):
        raise ValueError("CP_COMPONENT_READ_BINDING_INVALID")
    all_rows = [*read["records"], *read["missing"]]
    if sorted(r["validTime"] for r in all_rows) != request["expectedTimes"]:
        raise ValueError("CP_COMPONENT_READ_PARTITION_INVALID")
    # Keep an unknown-age donor alongside a newly proven bulletin. Unknown age
    # cannot justify replacing either direction; downstream selection decides.
    original_requests = {row["requestSha256"]: row for row in bank["requests"]}
    records = {(e["native"]["contractKey"], e["native"]["partId"], e["native"]["validTime"], bool(e["native"]["modelRun"])): copy.deepcopy(e)
               for e in bank["records"]}
    for native in read["records"]:
        if native.get("subsetSha256") != read["subsetSha256"]:
            raise ValueError("CP_COMPONENT_READ_PAYLOAD_INVALID")
        entry = _sealed({"requestSha256": request["requestSha256"], "acquisitionAt": acquisition_at,
                         "native": copy.deepcopy(native)}, "recordId")
        _record(entry, request, plan["targets"])
        key = native["contractKey"], native["partId"], native["validTime"], bool(native["modelRun"])
        previous = records.get(key)
        if previous:
            previous_admitted = _spatially_admitted(
                previous, original_requests[previous["requestSha256"]], plan, admit_spatial,
            )
            replacement_admitted = _spatially_admitted(entry, request, plan, admit_spatial)
            if not replacement_admitted:
                continue
            old = previous["native"]
            # Equal/unknown model ages never gain priority from download time.
            comparable = all(old.get(k) == native.get(k) for k in ("gridPoint", "verticalLayerM", "datum"))
            if previous_admitted and not (comparable and old["modelRun"] and native["modelRun"]
                    and _hour(native["modelRun"]) > _hour(old["modelRun"])):
                continue
        records[key] = entry
    lower, upper = _hour(plan["retentionStartAt"]), _hour(plan["retentionEndAt"])
    records = {k: e for k, e in records.items() if lower <= _hour(e["native"]["validTime"]) <= upper}
    requests = {r["requestSha256"]: r for r in [*bank["requests"], request]}
    used = {e["requestSha256"] for e in records.values()}
    result = _sealed({"kind": BANK_KIND, "schemaVersion": 1, "targetRegistrySha256": plan["targetRegistrySha256"], "targets": plan["targets"],
        "targetRegistryHistory": [h for h in bank["targetRegistryHistory"]
            if h["targetRegistrySha256"] in {requests[k]["targetRegistrySha256"] for k in used}],
        "requests": [requests[k] for k in sorted(used)],
        "records": sorted(records.values(), key=lambda e: (e["native"]["validTime"], e["native"]["partId"], e["native"]["contractKey"], bool(e["native"]["modelRun"])))}, "bankSha256")
    return validate_component_bank(result, targets=plan["targets"])


def rebase_component_bank(bank: dict, *, previous_targets: list[dict], targets: list[dict],
                          retention_start_at: str, retention_end_at: str) -> dict:
    """Preserve immutable requests/records for exactly unchanged central parts.

    The caller supplies both authenticated target generations. Their complete
    fingerprints are checked; no old target is relocated or relabelled.
    """
    validate_component_bank(bank, targets=previous_targets)
    current = _targets(targets)
    lower, upper = _hour(retention_start_at), _hour(retention_end_at)
    if lower > upper:
        raise ValueError("CP_COMPONENT_RETENTION_INTERVAL_INVALID")
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    records, excluded = [], []
    for entry in bank["records"]:
        target = requests[entry["requestSha256"]]["target"]
        if target != current.get(target["partId"]):
            excluded.append({"recordId": entry["recordId"], "reason": "CP_CENTRAL_TARGET_CHANGED_OR_REMOVED"})
        elif not lower <= _hour(entry["native"]["validTime"]) <= upper:
            excluded.append({"recordId": entry["recordId"], "reason": "CP_OUTSIDE_CALLER_RETENTION_WINDOW"})
        else:
            records.append(copy.deepcopy(entry))
    used_requests = {e["requestSha256"] for e in records}
    current_hash = target_fingerprint(targets)
    required_history = {requests[k]["targetRegistrySha256"] for k in used_requests} - {current_hash}
    historical = {h["targetRegistrySha256"]: h for h in bank["targetRegistryHistory"]}
    historical[bank["targetRegistrySha256"]] = {"targetRegistrySha256": bank["targetRegistrySha256"],
        "targets": list(_targets(previous_targets).values())}
    result = _sealed({"kind": BANK_KIND, "schemaVersion": 1, "targetRegistrySha256": current_hash, "targets": sorted(current.values(), key=lambda t: t["partId"]),
        "targetRegistryHistory": [historical[h] for h in sorted(required_history)],
        "requests": [requests[k] for k in sorted(used_requests)], "records": records}, "bankSha256")
    validate_component_bank(result, targets=targets)
    return {"bank": result, "excluded": excluded}


def backfill_verified_component_banks(latest: dict, complete: dict, *, targets: list[dict],
                                      retention_start_at: str, retention_end_at: str,
                                      admit_latest: Callable, admit_complete: Callable) -> dict:
    """Unite two independently verified generations without a blind bank merge.

    An original record only wins a conflicting native slot when its own
    dynamic/static bytes have been admitted by the caller against the source
    generation. The latest generation remains the progress baseline, while a
    qualified older record can restore a missing or invalid latest slot.
    """
    if not callable(admit_latest) or not callable(admit_complete):
        raise ValueError("CP_COMPONENT_ORIGINAL_ADMITTERS_REQUIRED")
    current = sorted(_targets(targets).values(), key=lambda row: row["partId"])
    candidates = []
    for generation, bank, admit in (("latest", latest, admit_latest),
                                    ("complete", complete, admit_complete)):
        validate_component_bank(bank, targets=bank["targets"])
        originals = {row["requestSha256"]: row for row in bank["requests"]}
        admitted = {}
        for entry in bank["records"]:
            request = originals[entry["requestSha256"]]
            proof = admit(copy.deepcopy(entry), copy.deepcopy(request), copy.deepcopy(request["target"]))
            admitted[entry["recordId"]] = bool(isinstance(proof, dict)
                and proof.get("recordId") == entry["recordId"]
                and proof.get("targetRegistrySha256") == bank["targetRegistrySha256"]
                and isinstance(proof.get("policyId"), str) and proof["policyId"]
                and valid_sha256(proof.get("policySha256"))
                and valid_sha256(proof.get("evidenceSha256")))
        rebased = rebase_component_bank(bank, previous_targets=bank["targets"],
            targets=current, retention_start_at=retention_start_at,
            retention_end_at=retention_end_at)["bank"]
        candidates.append((generation, rebased, admitted))

    def slot(entry: dict) -> tuple:
        row = entry["native"]
        return row["contractKey"], row["partId"], row["validTime"], bool(row["modelRun"])

    winners = {}
    for generation, bank, admitted in candidates:
        for entry in bank["records"]:
            key = slot(entry)
            previous = winners.get(key)
            if previous is None:
                winners[key] = (generation, entry, admitted[entry["recordId"]])
                continue
            _, old_entry, old_ok = previous
            new_ok = admitted[entry["recordId"]]
            if new_ok != old_ok:
                if new_ok:
                    winners[key] = (generation, entry, True)
                continue
            old_run = old_entry["native"]["modelRun"]
            new_run = entry["native"]["modelRun"]
            # Both candidates were independently admitted. A newer official
            # model run may win even when its individually valid wet grid has
            # moved. Unknown/equal ages cannot displace the latest generation.
            if old_ok and new_ok and old_run and new_run and _hour(new_run) > _hour(old_run):
                winners[key] = (generation, entry, True)

    requests, histories = {}, {}
    for _, bank, _ in candidates:
        for request in bank["requests"]:
            key = request["requestSha256"]
            if key in requests and requests[key] != request:
                raise ValueError("CP_COMPONENT_GENERATION_REQUEST_CONFLICT")
            requests[key] = request
        for history in bank["targetRegistryHistory"]:
            key = history["targetRegistrySha256"]
            if key in histories and histories[key] != history:
                raise ValueError("CP_COMPONENT_GENERATION_TARGET_CONFLICT")
            histories[key] = history
    # Only originally admitted rows may enter the merged private generation.
    # An invalid row cannot be packed with its claimed immutable originals;
    # dropping that precise slot leaves it eligible for a later real retry.
    # Two independent acquisitions of the *same* request and *same* subset
    # bytes can have different receipt timestamps. The content-addressed
    # receipt path stores only one of them. Rebind all selected rows from that
    # identical subset to one verified receipt, preferring the latest source;
    # their native values are not changed, and the record IDs are resealed.
    canonical_receipts = {}
    for generation, entry, admitted in winners.values():
        if not admitted:
            continue
        pair = entry["requestSha256"], entry["native"]["subsetSha256"]
        if pair not in canonical_receipts or generation == "latest":
            canonical_receipts[pair] = entry["acquisitionAt"]
    records = []
    for _, entry, admitted in winners.values():
        if not admitted:
            continue
        pair = entry["requestSha256"], entry["native"]["subsetSha256"]
        if entry["acquisitionAt"] != canonical_receipts[pair]:
            entry = _sealed({"requestSha256": entry["requestSha256"],
                "acquisitionAt": canonical_receipts[pair],
                "native": copy.deepcopy(entry["native"])}, "recordId")
        records.append(copy.deepcopy(entry))
    used = {row["requestSha256"] for row in records}
    current_hash = target_fingerprint(current)
    required_history = {requests[key]["targetRegistrySha256"] for key in used} - {current_hash}
    result = _sealed({"kind": BANK_KIND, "schemaVersion": 1,
        "targetRegistrySha256": current_hash, "targets": current,
        "targetRegistryHistory": [histories[key] for key in sorted(required_history)],
        "requests": [requests[key] for key in sorted(used)],
        "records": sorted(records, key=lambda entry: (
            entry["native"]["validTime"], entry["native"]["partId"],
            entry["native"]["contractKey"], bool(entry["native"]["modelRun"])))}, "bankSha256")
    return validate_component_bank(result, targets=current)


def project_component_candidates(plan: dict, bank: dict, *, admit_spatial: Callable | None = None,
                                 include_retained_bank: bool = False) -> dict:
    """Recheck spatial authority every time; a bank hash is not admission.

    admit_spatial(entry, request, target) returns a trusted verifier certificate:
    {recordId,targetRegistrySha256,policyId,policySha256,evidenceSha256} or None.
    Legacy level records remain stored but cannot enter the runtime index.
    """
    validate_component_plan(plan)
    validate_component_bank(bank, targets=plan["targets"])
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    records, contracts_by_need = {}, {}
    for entry in bank["records"]:
        row = entry["native"]
        if row["component"] == "waterLevel":
            continue
        records.setdefault((row["partId"], row["component"], row["validTime"], row["contractKey"]), []).append(entry)
        contracts_by_need.setdefault((row["partId"], row["component"], row["validTime"]), set()).add(row["contractKey"])
    candidates, private_support_candidates, remaining = [], [], []
    needs = {_need_key(n): n for n in [*plan["needs"], *plan["privateSupportNeeds"]]}
    requested = {_need_key(n) for n in plan["needs"]}
    if include_retained_bank:
        lower, upper = _hour(plan["retentionStartAt"]), _hour(plan["retentionEndAt"])
        public_end = _hour(plan["productionReferenceAt"]) + timedelta(hours=117)
        for part_id, component, valid_time, _ in records:
            when = _hour(valid_time)
            if lower <= when <= min(upper, public_end):
                needs.setdefault((part_id, component, valid_time), {"partId": part_id, "component": component,
                    "validTime": valid_time, "purpose": "PRIVATE_T_PLUS_3_SUPPORT" if when > public_end else "GAP"})
    for need in sorted(needs.values(), key=lambda n: (_need_key(n))):
        private_support = need["purpose"] == "PRIVATE_T_PLUS_3_SUPPORT"
        admitted = False
        keys = plan["productRoutes"].get(need["partId"], {}).get(need["component"], [])
        if include_retained_bank:
            # The read index's native product order cannot change merely
            # because current needs are empty. Keep pinned contract ordering.
            keys = [key for key in CONTRACTS if key in contracts_by_need.get(_need_key(need), set())]
        for entry in (e for key in keys
                      for e in records.get((*_need_key(need), key), [])):
            if admit_spatial is None:
                continue
            row, request = entry["native"], requests[entry["requestSha256"]]
            proof = admit_spatial(copy.deepcopy(entry), copy.deepcopy(request), copy.deepcopy(request["target"]))
            if proof is None:
                continue
            if (not isinstance(proof, dict) or proof.get("recordId") != entry["recordId"]
                or proof.get("targetRegistrySha256") != plan["targetRegistrySha256"]
                or not isinstance(proof.get("policyId"), str) or not proof["policyId"]
                or not all(valid_sha256(proof.get(k)) for k in ("policySha256", "evidenceSha256"))):
                raise ValueError("CP_COMPONENT_SPATIAL_CERTIFICATE_INVALID")
            source = {k: copy.deepcopy(row[k]) for k in ("provider", "component", "productId", "datasetId", "datasetVersion",
                "samplingPoint", "gridPoint", "distanceKm", "verticalLayerM", "validTime", "modelRun", "modelReference",
                "modelRunEvidence", "subsetSha256", "units", "nativeFields")}
            source.update({"entityId": "PART::" + row["partId"], "parentZoneId": row["parentZoneId"],
                "entityType": "coastal-part", "samplingContext": "coastal-part-water-point",
                "contractKey": row["contractKey"], "recordId": entry["recordId"], "requestSha256": entry["requestSha256"],
                "acquisitionAt": entry["acquisitionAt"], "targetRegistrySha256": plan["targetRegistrySha256"],
                "requestTargetRegistrySha256": request["targetRegistrySha256"],
                "gridIndex": row["gridIndex"], "nativeTimeIndex": row["nativeTimeIndex"],
                "nativeValidTimes": [row["validTime"]], "timeResolution": "native", "spatialAdmission": proof,
                "status": "qualified-native", "datum": row.get("datum"),
                "wavePeriodSemantics": row.get("wavePeriodSemantics"), "wavePeriodField": row.get("wavePeriodField")})
            challenge_ok = need["purpose"] != "AGED_DMI_CHALLENGE" or bool(row["modelRun"]
                and _hour(need["protectedModelRun"]) < _hour(row["modelRun"]) <= _hour(plan["productionReferenceAt"]))
            candidate = {"partId": row["partId"], "component": row["component"], "time": row["validTime"],
                "values": copy.deepcopy(row["values"]), "source": source,
                "eligibleForRequestedPurpose": True if include_retained_bank else challenge_ok, "nativeDatumOnly": False,
                "privateSupportOnly": private_support}
            candidate["projection"] = seal_component_projection(candidate)
            (private_support_candidates if private_support else candidates).append(candidate)
            admitted = admitted or challenge_ok
        if not admitted and not private_support and _need_key(need) in requested:
            reason = ("CP_PRODUCT_NOT_ROUTED" if not plan["productRoutes"].get(need["partId"], {}).get(need["component"])
                      else "CP_NO_ADMITTED_CANDIDATE_FOR_NEED")
            remaining.append({**need, "reason": reason})
    return {"kind": STAGE_KIND, "schemaVersion": 1, "planSha256": plan["planSha256"], "bankSha256": bank["bankSha256"],
            "status": "IN_PROGRESS" if remaining else "CANDIDATES_READY", "candidates": candidates,
            "privateSupportCandidates": private_support_candidates,
            "remainingNeeds": remaining, "provesUpstreamAbsence": False}


def produce_component_bank(plan: dict, bank: dict, *, acquire_subset: Callable,
                           acquisition_at: Callable, checkpoint: Callable,
                           admit_spatial: Callable | None = None, should_continue: Callable = lambda: True,
                           start_after: tuple[str, str] | None = None,
                           prepare_reusable_group: Callable | None = None,
                           refresh_unadmitted_static: Callable | None = None) -> dict:
    """Run a bounded caller-owned transport, checkpointing each parsed request.

    Transport/schema errors remain retryable; siblings and other components
    continue. Exceptions never become COMPLETE/absence evidence. The caller's
    transport owns timeout/retry and must honour request.raiseIfUpdating.
    """
    validate_component_plan(plan)
    validate_component_bank(bank, targets=plan["targets"])
    trimmed = rebase_component_bank(bank, previous_targets=plan["targets"], targets=plan["targets"],
        retention_start_at=plan["retentionStartAt"], retention_end_at=plan["retentionEndAt"])["bank"]
    if trimmed["bankSha256"] != bank["bankSha256"]:
        checkpoint(copy.deepcopy(trimmed), [])
        bank = trimmed
    grouped, challenges_by_component = {}, {}
    for need in [*plan["needs"], *plan["privateSupportNeeds"]]:
        for key in plan["productRoutes"].get(need["partId"], {}).get(need["component"], []):
            grouped.setdefault((need["partId"], key), set()).add(need["validTime"])
        if need["purpose"] == "AGED_DMI_CHALLENGE":
            challenges_by_component.setdefault((need["partId"], need["component"]), {})[need["validTime"]] = need
    existing_by_group = {}
    requests_by_sha = {row["requestSha256"]: row for row in bank["requests"]}
    for entry in bank["records"]:
        row = entry["native"]
        existing_by_group.setdefault((row["partId"], row["contractKey"]), []).append(entry)
    attempts = []
    ordered = list(grouped)
    if start_after in grouped:
        offset = ordered.index(start_after) + 1
        ordered = ordered[offset:] + ordered[:offset]
    for part_id, key in ordered:
        times = grouped[(part_id, key)]
        challenges = challenges_by_component.get((part_id, CONTRACTS[key].component), {})
        target = next(t for t in plan["targets"] if t["partId"] == part_id)
        group_entries = existing_by_group.get((part_id, key), [])
        needs_static_repair = bool(admit_spatial is not None and group_entries and any(
            not _spatially_admitted(entry, requests_by_sha[entry["requestSha256"]], plan, admit_spatial)
            for entry in group_entries
        ))
        if needs_static_repair and prepare_reusable_group is not None:
            if not should_continue():
                break
            repaired = prepare_reusable_group(key, copy.deepcopy(target))
            attempts.append({"partId": part_id, "contractKey": key,
                "status": "STATIC_EVIDENCE_READY" if repaired else "RETRYABLE_ERROR",
                "reason": None if repaired else "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"})
            checkpoint(copy.deepcopy(bank), copy.deepcopy(attempts))
            if not repaired:
                continue
            if refresh_unadmitted_static is not None and any(
                not _spatially_admitted(entry, requests_by_sha[entry["requestSha256"]], plan, admit_spatial)
                for entry in group_entries
            ):
                refreshed = refresh_unadmitted_static(key, copy.deepcopy(target),
                    [(copy.deepcopy(entry), copy.deepcopy(requests_by_sha[entry["requestSha256"]]))
                     for entry in group_entries])
                if refreshed is not None:
                    attempts.append({"partId": part_id, "contractKey": key,
                        "status": "STATIC_EVIDENCE_READY" if refreshed else "RETRYABLE_ERROR",
                        "reason": None if refreshed else "CP_COMPONENT_STATIC_GRID_REFRESH_UNAVAILABLE"})
                    checkpoint(copy.deepcopy(bank), copy.deepcopy(attempts))
                    # A stale *old* cell must not suppress a fresh dynamic
                    # request for another still-missing hour in this group.
        existing = set()
        for entry in group_entries:
            row = entry["native"]
            if not _spatially_admitted(
                entry, requests_by_sha[entry["requestSha256"]], plan, admit_spatial,
            ):
                continue
            challenge = challenges.get(row["validTime"])
            if challenge and (not row["modelRun"] or _hour(row["modelRun"]) <= _hour(challenge["protectedModelRun"])):
                continue
            existing.add(row["validTime"])
        pending = sorted(times - existing)
        if not pending:
            if prepare_reusable_group is not None and admit_spatial is None:
                if not should_continue():
                    break
                ready = prepare_reusable_group(key, copy.deepcopy(target))
                attempts.append({"partId": part_id, "contractKey": key,
                    "status": "STATIC_EVIDENCE_READY" if ready else "RETRYABLE_ERROR",
                    "reason": None if ready else "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"})
                checkpoint(copy.deepcopy(bank), copy.deepcopy(attempts))
            continue
        if not should_continue():
            break
        request = _request(plan, part_id, key, pending)
        try:
            path = acquire_subset(copy.deepcopy(request))
            read = read_component_subset(path, contract_key=key, target=request["target"], expected_times=pending)
            acquired_at = acquisition_at()
            if admit_spatial is not None and refresh_unadmitted_static is not None:
                new_entries = [_sealed({"requestSha256": request["requestSha256"],
                    "acquisitionAt": acquired_at, "native": copy.deepcopy(native)}, "recordId")
                    for native in read["records"]]
                if any(not _spatially_admitted(entry, request, plan, admit_spatial)
                       for entry in new_entries):
                    refresh_unadmitted_static(key, copy.deepcopy(target),
                        [(entry, copy.deepcopy(request)) for entry in new_entries])
            updated = merge_component_read(bank, plan=plan, request=request, read=read,
                acquisition_at=acquired_at, admit_spatial=admit_spatial)
        except (OSError, ValueError, RuntimeError) as error:
            supplied = str(error)
            # Bounded transport failures carry payload-free reason codes.
            # Arbitrary exception text may contain a path or provider detail
            # and must never escape into the aggregate production report.
            reason = (supplied if isinstance(error, ComponentReadError)
                      or re.fullmatch(r"CP_COMPONENT_[A-Z0-9_]+", supplied)
                      else "CP_COMPONENT_REQUEST_RETRYABLE_ERROR")
            attempts.append({"requestSha256": request["requestSha256"], "partId": part_id, "contractKey": key,
                             "status": "RETRYABLE_ERROR", "reason": reason})
            checkpoint(copy.deepcopy(bank), copy.deepcopy(attempts))
            continue
        attempts.append({"requestSha256": request["requestSha256"], "partId": part_id, "contractKey": key, "status": "PARSED",
                         "positiveCount": len(read["records"]), "missingCount": len(read["missing"])})
        # Persist before exposing the new in-memory generation to the next task.
        # A persistence failure must propagate, not pretend that progress is safe.
        checkpoint(copy.deepcopy(updated), copy.deepcopy(attempts))
        bank = updated
    stage = project_component_candidates(plan, bank, admit_spatial=admit_spatial)
    return {"bank": bank, "stage": stage, "attempts": attempts}


def save_component_bank(path: Path, bank: dict, *, targets: list[dict]) -> None:
    """Atomic private checkpoint; never writes a partial bank over a good one."""
    validate_component_bank(bank, targets=targets)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix="." + path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(canonical_json(bank))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
