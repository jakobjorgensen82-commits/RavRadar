"""Pinned static-mask admission; no network, geometry edits or datum conversion."""
from __future__ import annotations

import copy
import hashlib
import io
import json
import math
from pathlib import Path

import numpy as np
import xarray as xr

from .copernicus_current import canonical_sha256, haversine_km, valid_sha256
from .copernicus_weather_components import CONTRACTS, MAX_SUBSET_BYTES, _coordinate
from .copernicus_weather_component_bank import _sealed, _check_seal, _targets, seal_component_projection


POLICY = json.loads(Path(__file__).with_name("copernicus-component-spatial-policy.json").read_text(encoding="utf-8"))
POLICY_SHA256 = canonical_sha256(POLICY)


def component_spatial_policy() -> dict:
    return {"policyId": POLICY["policyId"], "policySha256": POLICY_SHA256}


def static_request(contract_key: str, target: dict) -> dict:
    contract = CONTRACTS.get(contract_key)
    policy = POLICY["contracts"].get(contract_key)
    if contract is None or policy is None:
        raise ValueError("CP_SPATIAL_CONTRACT_UNKNOWN")
    exact = _targets([target])[target["partId"]]
    # No validity time belongs to static geometry. Reuse it across time shifts,
    # but never across a changed point, dataset version, or field contract.
    return _sealed({"kind": "CP_PINNED_STATIC_REQUEST", "schemaVersion": 1,
        "productId": contract.product_id, "datasetId": policy["staticDatasetId"],
        "datasetVersion": policy["staticVersion"], "datasetPart": POLICY["staticPart"],
        "variables": [POLICY["maskVariable"], POLICY["depthVariable"]],
        "target": exact, "coordinatesSelectionMethod": "nearest", "raiseIfUpdating": True}, "requestSha256")


def _static_value(dataset: xr.Dataset, name: str, standard: str, unit: str,
                  selectors: dict, policy: dict, *, documented_missing_unit: str | None = None) -> tuple[float, float | None]:
    if name not in dataset or dataset[name].attrs.get("standard_name") != standard:
        raise ValueError("CP_STATIC_FIELD_SEMANTICS_INVALID")
    array = dataset[name]
    units = str(array.attrs.get("units", ""))
    # NWS 202511 bathymetry omits this attribute; its pinned product manual
    # specifies metres. Never reinterpret an explicit unit (even an empty
    # string), another variable, dataset/version, or undocumented product.
    if (name == POLICY["depthVariable"] and unit == "m" and "units" not in array.attrs
        and documented_missing_unit == "m"):
        units = "m"
    if (unit == "1" and units not in {"", "1"}) or (unit == "m" and units != "m"):
        raise ValueError("CP_STATIC_FIELD_UNIT_INVALID")
    extra = set(array.dims) - set(selectors)
    selected_depth = None
    selection = dict(selectors)
    if extra:
        if name != POLICY["maskVariable"] or len(extra) != 1 or policy["surfaceMaskDepth"] is None:
            raise ValueError("CP_STATIC_FIELD_DIMENSIONS_INVALID")
        depth_name = _coordinate(dataset, ("depth",), "depth")
        depth = dataset[depth_name]
        if (depth.ndim != 1 or set(depth.dims) != extra or depth.attrs.get("positive") != "down"
            or depth.attrs.get("units") != "m"):
            raise ValueError("CP_STATIC_MASK_SURFACE_INVALID")
        axis = np.asarray(depth.values, dtype=float)
        if not axis.size or not np.isfinite(axis).all() or len(np.unique(axis)) != len(axis) or np.min(axis) < 0:
            raise ValueError("CP_STATIC_MASK_SURFACE_INVALID")
        index = int(np.argmin(axis))
        selected_depth = float(axis[index])
        if (policy["surfaceMaskDepth"] == "exact-0.5" and abs(selected_depth - 0.5) > 1e-6
            or policy["surfaceMaskDepth"] == "at-most-0.5" and selected_depth > 0.5 + 1e-6):
            raise ValueError("CP_STATIC_MASK_SURFACE_MISSING")
        selection[depth.dims[0]] = index
    if set(array.dims) != set(selection) or len(array.dims) != len(selection) or array.dtype.kind not in "fiu":
        raise ValueError("CP_STATIC_FIELD_DIMENSIONS_INVALID")
    value = float(array.isel(selection).values)
    if not math.isfinite(value):
        raise ValueError("CP_STATIC_FIELD_VALUE_MISSING")
    return value, selected_depth


def inspect_static_subset(path: Path, *, contract_key: str, target: dict, receipt: dict) -> dict:
    request = static_request(contract_key, target)
    _check_seal(receipt, "receiptSha256")
    if (receipt.get("kind") != "CP_PINNED_SUBSET_RECEIPT" or receipt.get("requestSha256") != request["requestSha256"]
        or receipt.get("request") != request or not valid_sha256(receipt.get("subsetSha256"))):
        raise ValueError("CP_STATIC_REQUEST_RECEIPT_INVALID")
    path = Path(path)
    if path.stat().st_size > MAX_SUBSET_BYTES:
        raise ValueError("CP_STATIC_SIZE_LIMIT")
    with path.open("rb") as handle:
        payload = handle.read(MAX_SUBSET_BYTES + 1)
    if len(payload) > MAX_SUBSET_BYTES or "sha256:" + hashlib.sha256(payload).hexdigest() != receipt["subsetSha256"]:
        raise ValueError("CP_STATIC_PAYLOAD_INVALID")
    try:
        with xr.open_dataset(io.BytesIO(payload), decode_cf=True, mask_and_scale=True) as opened:
            if sum(v.nbytes for v in opened.variables.values()) > MAX_SUBSET_BYTES:
                raise ValueError("CP_STATIC_DECODED_SIZE_LIMIT")
            dataset = opened.load()
    except ValueError:
        raise
    except Exception:
        raise ValueError("CP_STATIC_DECODE_FAILED") from None
    for key, expected in (("product_id", request["productId"]), ("cmems_product_id", request["productId"]),
                          ("dataset_id", request["datasetId"]), ("dataset_version", request["datasetVersion"])):
        if key in dataset.attrs and str(dataset.attrs[key]) != expected:
            raise ValueError("CP_STATIC_DATASET_IDENTITY_CONFLICT")
    lon_name = _coordinate(dataset, ("longitude", "lon"), "longitude")
    lat_name = _coordinate(dataset, ("latitude", "lat"), "latitude")
    axes = []
    for name, bound, units in ((lon_name, 180, {"degrees_east", "degree_east"}),
                                (lat_name, 90, {"degrees_north", "degree_north"})):
        coordinate = dataset[name]
        axis = np.asarray(coordinate.values, dtype=float)
        if (coordinate.ndim != 1 or not axis.size or coordinate.attrs.get("units") not in units
            or not np.isfinite(axis).all() or len(np.unique(axis)) != len(axis) or np.any(np.abs(axis) > bound)):
            raise ValueError("CP_STATIC_COORDINATE_INVALID")
        axes.append(axis)
    if dataset[lon_name].dims == dataset[lat_name].dims:
        raise ValueError("CP_STATIC_GRID_DIMENSIONS_INVALID")
    lons, lats = axes
    point = target["waterPoint"]
    cap = float(POLICY["maximumDistanceKm"])
    y_candidates = np.flatnonzero(np.abs(lats - point[1]) <= cap / 110)
    x_candidates = np.flatnonzero(np.abs(lons - point[0]) <= cap / (110 * max(0.001, math.cos(math.radians(point[1])))))
    cells = [(haversine_km(point, [float(lons[x]), float(lats[y])]), float(lats[y]), float(lons[x]), int(y), int(x))
             for y in y_candidates for x in x_candidates]
    if not cells or min(cells)[0] > cap + 1e-9:
        raise ValueError("CP_STATIC_NATIVE_CELL_OUTSIDE_BOUND")
    distance, lat, lon, y, x = min(cells)
    selectors = {dataset[lat_name].dims[0]: y, dataset[lon_name].dims[0]: x}
    policy = POLICY["contracts"][contract_key]
    documented = POLICY.get("documentedMissingDepthUnits", {}).get(request["datasetId"], {})
    documented_unit = documented.get("units") if all(
        documented.get(key) == request[key] for key in ("productId", "datasetVersion", "datasetPart")
    ) else None
    mask, mask_depth = _static_value(dataset, POLICY["maskVariable"], POLICY["maskStandardName"], "1", selectors, policy)
    depth, _ = _static_value(dataset, POLICY["depthVariable"], POLICY["depthStandardName"], "m", selectors, policy,
                             documented_missing_unit=documented_unit)
    if mask not in {0.0, 1.0} or depth < 0:
        raise ValueError("CP_STATIC_MASK_OR_DEPTH_INVALID")
    return {"kind": "CP_PINNED_STATIC_CELL_EVIDENCE", "contractKey": contract_key,
        "policyId": POLICY["policyId"], "policySha256": POLICY_SHA256,
        "request": request, "receipt": copy.deepcopy(receipt), "target": copy.deepcopy(target),
        "gridPoint": [lon, lat], "gridIndex": {"latitude": y, "longitude": x},
        "distanceKm": distance, "mask": mask, "maskSurfaceDepthM": mask_depth, "depthM": depth,
        "subsetSha256": receipt["subsetSha256"]}


def eligible_static_cell(evidence: dict) -> bool:
    policy = POLICY["contracts"].get(evidence.get("contractKey"))
    if not policy or evidence.get("policySha256") != POLICY_SHA256 or evidence.get("mask") != 1:
        return False
    minimum, depth = float(policy["minimumDepthM"]), evidence.get("depthM")
    return type(depth) in (int, float) and math.isfinite(depth) and (
        depth >= minimum if policy["depthComparison"] == ">=" else depth > minimum)


def make_spatial_admitter(plan: dict, evidence_for: callable):
    """Return the bank callback backed by already-byte-verified static evidence.

    evidence_for(contract_key,target,grid_point) must load via
    inspect_static_subset, not accept an arbitrary certificate. A failed
    original request returns None, not falsely admitted data.
    """
    current = _targets(plan["targets"])
    def admit(entry, request, target):
        row = entry["native"]
        if target != current.get(row["partId"]) or target != request["target"]:
            return None
        evidence = evidence_for(row["contractKey"], target, row["gridPoint"])
        if evidence is None or not eligible_static_cell(evidence):
            return None
        if (evidence["target"] != target or evidence["request"] != static_request(row["contractKey"], target)
            or evidence["gridPoint"] != row["gridPoint"]
            or abs(evidence["distanceKm"] - row["distanceKm"]) > 1e-6
            or row["distanceKm"] > float(POLICY["maximumDistanceKm"])):
            return None
        # Full original requests stay in the bank/cache. Repeating their whole
        # expectedTimes axis in every hourly projection grows quadratically.
        # This compact witness is created only after the actual byte readers;
        # immutable hashes bind the omitted request/receipt content exactly.
        static_evidence = copy.deepcopy(evidence)
        static_evidence["receipt"].pop("request", None)
        request_binding = {k: copy.deepcopy(request[k]) for k in ("requestSha256", "contractKey", "productId", "datasetId", "datasetVersion", "targetRegistrySha256", "target")}
        request_binding["nativeValidTime"] = row["validTime"]
        witness = {"kind": "CP_STATIC_DYNAMIC_SAME_CELL_WITNESS", "static": static_evidence,
            "dynamicRequest": request_binding, "recordId": entry["recordId"],
            "dynamicSubsetSha256": row["subsetSha256"], "validTime": row["validTime"],
            "targetRegistrySha256": plan["targetRegistrySha256"]}
        return {"recordId": entry["recordId"], "targetRegistrySha256": plan["targetRegistrySha256"],
            **component_spatial_policy(), "evidenceSha256": seal_component_projection({"spatialWitness": witness})["projectionSha256"],
            "witness": witness}
    return admit
