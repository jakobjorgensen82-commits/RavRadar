"""Response-bound current forecast age; acquisition time is never model time."""
from __future__ import annotations

from datetime import datetime, timezone
import math
from typing import Any


REFERENCE_FIELDS = {"kind", "payloadSha256", "modelRun", "validTime", "referenceVariable",
                    "referenceIndex", "forecastPeriodVariable", "forecastPeriodChecked", "leadSeconds"}


def exact_hour(value: Any) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("CURRENT_MODEL_REFERENCE_TIME_INVALID")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.minute or result.second or result.microsecond:
        raise ValueError("CURRENT_MODEL_REFERENCE_TIME_INVALID")
    return result


def validate_model_reference(proof: Any, *, subset_sha256: str, valid_time: str,
                             acquisition_at: str | None = None) -> dict:
    from .copernicus_current import valid_sha256
    if not isinstance(proof, dict) or set(proof) != REFERENCE_FIELDS:
        raise ValueError("CURRENT_MODEL_REFERENCE_INVALID")
    run, valid = exact_hour(proof["modelRun"]), exact_hour(valid_time)
    lead = proof["leadSeconds"]
    if (proof["kind"] != "subset-forecast-reference-time"
            or proof["payloadSha256"] != subset_sha256 or not valid_sha256(subset_sha256)
            or proof["validTime"] != valid_time or run > valid
            or not isinstance(proof["referenceVariable"], str) or not proof["referenceVariable"]
            or (proof["referenceIndex"] is not None and (type(proof["referenceIndex"]) is not int or proof["referenceIndex"] < 0))
            or (proof["forecastPeriodVariable"] is not None and (not isinstance(proof["forecastPeriodVariable"], str) or not proof["forecastPeriodVariable"]))
            or type(proof["forecastPeriodChecked"]) is not bool
            or proof["forecastPeriodChecked"] != (proof["forecastPeriodVariable"] is not None)
            or isinstance(lead, bool) or not isinstance(lead, (int, float)) or not math.isfinite(lead)
            or lead != (valid - run).total_seconds()):
        raise ValueError("CURRENT_MODEL_REFERENCE_INVALID")
    if acquisition_at is not None and run > datetime.fromisoformat(acquisition_at.replace("Z", "+00:00")):
        raise ValueError("CURRENT_MODEL_REFERENCE_AFTER_ACQUISITION")
    return proof


def extract_subset_model_references(dataset: Any, subset_sha256: str) -> dict[str, dict]:
    """Read only CF forecast-reference coordinates from the exact decoded subset.

    Missing reference metadata is normal and grants no challenge authority.
    Ambiguous/malformed metadata is rejected, not inferred from download/global
    creation attributes. Per-time reference arrays are supported without mixing.
    """
    import numpy as np

    def variable(standard: str) -> str | None:
        names = [str(name) for name in dataset.variables
                 if str(name) == standard or dataset[name].attrs.get("standard_name") == standard]
        if not names:
            return None
        if len(names) != 1 or dataset[names[0]].attrs.get("standard_name", standard) != standard:
            raise ValueError("CURRENT_MODEL_REFERENCE_AMBIGUOUS")
        return names[0]

    ref_name, period_name = variable("forecast_reference_time"), variable("forecast_period")
    if ref_name is None:
        return {}
    if "time" not in dataset or dataset["time"].ndim != 1:
        raise ValueError("CURRENT_MODEL_REFERENCE_TIME_AXIS_INVALID")
    dimension = dataset["time"].dims[0]

    def at(name: str, index: int) -> Any:
        array = dataset[name]
        if array.ndim == 0:
            return array.values[()]
        if array.dims == (dimension,):
            return array.values[index]
        raise ValueError("CURRENT_MODEL_REFERENCE_DIMENSIONS_INVALID")

    def iso(value: Any) -> str:
        if not isinstance(value, np.datetime64) or np.isnat(value):
            raise ValueError("CURRENT_MODEL_REFERENCE_TIME_INVALID")
        text = np.datetime_as_string(value.astype("datetime64[us]"), unit="us") + "Z"
        parsed = exact_hour(text)
        return parsed.strftime("%Y-%m-%dT%H:00:00Z")

    result = {}
    for index, raw_valid in enumerate(dataset["time"].values):
        valid_time, model_run = iso(raw_valid), iso(at(ref_name, index))
        lead = int((exact_hour(valid_time) - exact_hour(model_run)).total_seconds())
        if lead < 0:
            # A subset may include analysis/history before its forecast origin.
            # That origin does not prove the historical field's model age; keep
            # the independently valid legacy row without granting age authority.
            continue
        if period_name is not None:
            raw = at(period_name, index)
            if isinstance(raw, np.timedelta64) and not np.isnat(raw):
                observed = float(raw / np.timedelta64(1, "s"))
            else:
                factors = {"s": 1, "second": 1, "seconds": 1, "h": 3600, "hour": 3600, "hours": 3600}
                factor = factors.get(str(dataset[period_name].attrs.get("units", "")).lower())
                if factor is None or isinstance(raw, (bool, np.bool_)) or not isinstance(raw, (int, float, np.number)):
                    raise ValueError("CURRENT_MODEL_REFERENCE_LEAD_INVALID")
                observed = float(raw) * factor
            if not math.isfinite(observed) or abs(observed - lead) > 1:
                raise ValueError("CURRENT_MODEL_REFERENCE_LEAD_MISMATCH")
        proof = {"kind": "subset-forecast-reference-time", "payloadSha256": subset_sha256,
                 "modelRun": model_run, "validTime": valid_time, "referenceVariable": ref_name,
                 "referenceIndex": index if dataset[ref_name].ndim else None,
                 "forecastPeriodVariable": period_name, "forecastPeriodChecked": period_name is not None,
                 "leadSeconds": lead}
        validate_model_reference(proof, subset_sha256=subset_sha256, valid_time=valid_time)
        result[valid_time] = proof
    return result
