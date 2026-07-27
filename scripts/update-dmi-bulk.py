#!/usr/bin/env python3
"""Build RavRadar's DMI cache from forecast-step GRIB assets.

DMI STAC items represent forecast steps, not individual parameters. Each selected
GRIB file is downloaded once, inventoried message-by-message with ecCodes, and only
the collection-specific fields needed by RavRadar are extracted. Progress, failures
and collection rotation are persisted across runs.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import re
import sys
import tempfile
import time
from datetime import datetime, timezone
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
try:
    from eccodes import (
        codes_get, codes_get_elements, codes_grib_find_nearest,
        codes_grib_new_from_file, codes_release,
    )
except ImportError as exc:
    raise RuntimeError(
        "ecCodes Python API er ikke kompatibelt: codes_get_elements mangler. "
        "Installer requirements-dmi.txt igen."
    ) from exc

ROOT = pathlib.Path(__file__).resolve().parents[1]
ZONES_PATH = ROOT / "data/zones.geojson"
OUTPUT_PATH = ROOT / "data/live/dmi-bulk-cache.json"
RAW_DIR = pathlib.Path(os.getenv("DMI_BULK_RAW_DIR", str(ROOT / ".cache/dmi-grib")))
STAC_ROOT = os.getenv("DMI_STAC_ROOT", "https://opendataapi.dmi.dk/v1/forecastdata")
HOURS = max(1, int(os.getenv("DMI_BULK_HOURS", "120")))
MAX_DOWNLOAD_BYTES = max(1, int(float(os.getenv("DMI_BULK_MAX_DOWNLOAD_MB", "1400")) * 1024 * 1024))
MAX_RUNTIME_SECONDS = max(60, int(os.getenv("DMI_BULK_MAX_RUNTIME_SECONDS", "780")))
REQUEST_TIMEOUT = max(10, int(os.getenv("DMI_BULK_REQUEST_TIMEOUT_SECONDS", "90")))
MAX_ASSETS_PER_COLLECTION = max(1, int(os.getenv("DMI_BULK_MAX_ASSETS_PER_COLLECTION", "130")))
TIME_STRIDE_HOURS = max(1, int(os.getenv("DMI_BULK_TIME_STRIDE_HOURS", "3")))
COLLECTIONS_PER_RUN = max(1, int(os.getenv("DMI_BULK_COLLECTIONS_PER_RUN", "1")))
REFRESH_MINUTES = max(1, int(os.getenv("DMI_BULK_REFRESH_MINUTES", "60")))
FORCE_REFRESH = os.getenv("DMI_BULK_FORCE_REFRESH", "false").lower() in {"1", "true", "yes", "on"}
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar DMI bulk downloader")
API_KEY = os.getenv("DMI_API_KEY")
STARTED = time.monotonic()
FINALIZE_RESERVE_SECONDS = max(60, int(os.getenv("DMI_BULK_FINALIZE_RESERVE_SECONDS", "180")))
WORK_DEADLINE = STARTED + max(60, MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS)
GRID_INDEX_CACHE: dict[tuple[Any, ...], list[dict[str, Any]]] = {}

STAC_SESSION = requests.Session()
DOWNLOAD_SESSION = requests.Session()
_retry = Retry(total=4, connect=4, read=4, status=4, backoff_factor=1.5,
               status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET"}),
               respect_retry_after_header=True)
_adapter = HTTPAdapter(max_retries=_retry, pool_connections=4, pool_maxsize=4)
for _session in (STAC_SESSION, DOWNLOAD_SESSION):
    _session.mount("https://", _adapter)
    _session.headers.update({"User-Agent": USER_AGENT})
STAC_SESSION.headers.update({"Accept": "application/geo+json, application/json"})
DOWNLOAD_SESSION.headers.update({"Accept": "application/x-grib, application/octet-stream, */*"})

COLLECTION_ORDER = ["dkss_idw", "dkss_nsbs", "dkss_lf", "harmonie_dini_sf", "wam_dw", "wam_nsb"]
COLLECTION_FAMILY = {
    "dkss_idw": "marine", "dkss_nsbs": "marine", "dkss_lf": "marine",
    "harmonie_dini_sf": "wind", "wam_dw": "wave", "wam_nsb": "wave",
}
TARGETS = {
    "marine": ["sea-mean-deviation", "current-u", "current-v"],
    "wind": ["wind-u-10m", "wind-v-10m"],
    "wave": ["significant-wave-height", "mean-wave-dir", "dominant-wave-period"],
}

# Strong aliases are used for STAC item/asset metadata. Single-letter aliases are
# intentionally excluded here because they caused every valid time to collapse to
# the water-temperature item in 3.2.1.
HINT_ALIASES = {
    "sea-mean-deviation": ("sea mean deviation", "sea_surface_height", "sea-surface-height", "water level", "sea level", "zos", "zeta"),
    "current-u": ("u component of current", "eastward sea water velocity", "eastward current", "current-u", "uo", "ucurr", "uocn"),
    "current-v": ("v component of current", "northward sea water velocity", "northward current", "current-v", "vo", "vcurr", "vocn"),
    "wind-u-10m": ("10 metre u wind", "10 meter u wind", "10m u wind", "wind-u-10m", "10u", "u10", "u10m"),
    "wind-v-10m": ("10 metre v wind", "10 meter v wind", "10m v wind", "wind-v-10m", "10v", "v10", "v10m"),
    "significant-wave-height": ("significant wave height", "significant height of combined", "significant-wave-height", "swh", "htsgw"),
    "mean-wave-dir": ("mean wave direction", "mean direction of waves", "mean-wave-dir", "mwd", "dirpw", "wavedir"),
    "dominant-wave-period": ("peak wave period", "dominant wave period", "mean wave period", "dominant-wave-period", "pp1d", "mwp", "perpw"),
}


def iso(value: Any) -> str | None:
    if not value:
        return None
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except ValueError:
        return None


def epoch(value: Any) -> float:
    parsed = iso(value)
    return datetime.fromisoformat(parsed.replace("Z", "+00:00")).timestamp() if parsed else 0.0


def request_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    query = dict(params or {})
    if API_KEY and url.startswith(STAC_ROOT):
        query.setdefault("api-key", API_KEY)
    response = STAC_SESSION.get(url, params=query, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def item_run(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("forecast:reference_datetime", "reference_datetime", "modelRun", "model_run", "created"):
        value = iso(props.get(key))
        if value:
            return value
    match = re.search(r"(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)[T_]?([0-2]\d)", str(item.get("id", "")))
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}T{match.group(4)}:00:00Z"
    return iso(props.get("datetime") or props.get("start_datetime"))


def item_valid(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("datetime", "forecast:valid_time", "valid_time", "end_datetime", "start_datetime"):
        value = iso(props.get(key))
        if value:
            return value
    return None


def asset_map(item: dict[str, Any]) -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for container_name in ("assets", "asset"):
        container = item.get(container_name)
        if not isinstance(container, dict):
            continue
        if isinstance(container.get("href"), str):
            merged.setdefault(container_name, container)
        else:
            for key, value in container.items():
                if isinstance(value, dict):
                    merged.setdefault(str(key), value)
    return merged


def grib_asset(item: dict[str, Any]) -> tuple[str, int | None, str] | None:
    ranked: list[tuple[int, str, int | None, str]] = []
    for key, asset in asset_map(item).items():
        href = asset.get("href")
        if not isinstance(href, str) or not href.strip():
            continue
        media = str(asset.get("type", "")).lower()
        roles = " ".join(str(v).lower() for v in (asset.get("roles") or []))
        title = str(asset.get("title", ""))
        haystack = f"{key} {title} {roles} {href}".lower()
        if "grib" not in media and "grib" not in haystack and not re.search(r"\.(grib2?|grb2?|bin)(\?|$)", haystack):
            continue
        size = asset.get("file:size") or asset.get("size") or asset.get("content_length")
        try:
            size = int(size) if size is not None else None
        except (TypeError, ValueError):
            size = None
        preferred = key.lower() in {"data", "grib", "download"} or "data" in roles
        ranked.append((0 if preferred else 1, href.strip(), size, f"{key} {title}"))
    if not ranked:
        return None
    ranked.sort(key=lambda row: (row[0], row[1]))
    _, href, size, description = ranked[0]
    return href, size, description


def metadata_text(item: dict[str, Any], asset_description: str = "") -> str:
    props = item.get("properties") or {}
    selected = []
    for key, value in props.items():
        key_l = str(key).lower()
        if any(token in key_l for token in ("param", "variable", "element", "name", "title", "product")):
            selected.append(f"{key}={value}")
    return " ".join([str(item.get("id", "")), asset_description, *selected]).lower().replace("_", " ")


def alias_matches(text: str, alias: str) -> bool:
    normalized = alias.lower().replace("_", " ")
    if len(normalized) <= 4 and re.fullmatch(r"[a-z0-9]+", normalized):
        return re.search(rf"(?<![a-z0-9]){re.escape(normalized)}(?![a-z0-9])", text) is not None
    return normalized in text


def parameter_hint(item: dict[str, Any], family: str, asset_description: str = "") -> str | None:
    text = metadata_text(item, asset_description)
    for canonical in TARGETS[family]:
        if any(alias_matches(text, alias) for alias in HINT_ALIASES[canonical]):
            return canonical
    return None


def stride_selected(valid: str, run: str) -> bool:
    offset_hours = max(0, round((epoch(valid) - epoch(run)) / 3600))
    return offset_hours <= 6 or offset_hours % TIME_STRIDE_HOURS == 0 or offset_hours >= HOURS - 1


def list_latest_assets(collection: str) -> tuple[str | None, list[dict[str, Any]], dict[str, Any]]:
    data = request_json(f"{STAC_ROOT}/collections/{collection}/items",
                        {"limit": 1000, "bbox": "7,54,16,58", "sortorder": "datetime,DESC"})
    items = data.get("features") or []
    runs: dict[str, list[dict[str, Any]]] = {}
    stats = {
        "itemsSeen": len(items),
        "itemsWithoutGrib": 0,
        "forecastStepAssets": 0,
        "duplicateValidTimes": 0,
        "sampleItems": [],
    }
    for item in items:
        run, valid, asset = item_run(item), item_valid(item), grib_asset(item)
        if not run or not valid or not asset:
            stats["itemsWithoutGrib"] += 1
            continue
        href, size, _description = asset
        if epoch(valid) < epoch(run) - 3600 or epoch(valid) > epoch(run) + (HOURS + 6) * 3600:
            continue
        row = {"valid": valid, "href": href, "size": size, "id": item.get("id")}
        runs.setdefault(run, []).append(row)
        stats["forecastStepAssets"] += 1
        if len(stats["sampleItems"]) < 5:
            stats["sampleItems"].append({"id": item.get("id"), "run": run, "valid": valid})
    if not runs:
        return None, [], stats
    run = max(runs, key=epoch)
    unique: dict[str, dict[str, Any]] = {}
    for row in sorted(runs[run], key=lambda r: (epoch(r["valid"]), str(r["id"]))):
        if not stride_selected(row["valid"], run):
            continue
        if row["valid"] in unique:
            stats["duplicateValidTimes"] += 1
            continue
        unique[row["valid"]] = row
    rows = sorted(unique.values(), key=lambda r: epoch(r["valid"]))
    stats["selectedForecastSteps"] = min(len(rows), MAX_ASSETS_PER_COLLECTION)
    return run, rows[:MAX_ASSETS_PER_COLLECTION], stats


def download_asset(href: str, expected_size: int | None, budget: dict[str, int]) -> tuple[pathlib.Path, bool]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    suffix = pathlib.Path(href.split("?", 1)[0]).suffix or ".grib"
    path = RAW_DIR / f"{hashlib.sha256(href.encode()).hexdigest()[:24]}{suffix}"
    if path.exists() and path.stat().st_size > 0:
        return path, True
    if expected_size and budget["bytes"] + expected_size > MAX_DOWNLOAD_BYTES:
        raise RuntimeError("DMI bulk download budget would be exceeded")
    with DOWNLOAD_SESSION.get(href, stream=True, timeout=REQUEST_TIMEOUT) as response:
        response.raise_for_status()
        content_length = int(response.headers.get("content-length", "0") or 0)
        if budget["bytes"] + content_length > MAX_DOWNLOAD_BYTES:
            raise RuntimeError("DMI bulk download budget exceeded before next asset")
        with tempfile.NamedTemporaryFile(dir=RAW_DIR, delete=False) as tmp:
            tmp_path = pathlib.Path(tmp.name)
            for chunk in response.iter_content(1024 * 1024):
                if not chunk:
                    continue
                budget["bytes"] += len(chunk)
                if budget["bytes"] > MAX_DOWNLOAD_BYTES:
                    tmp_path.unlink(missing_ok=True)
                    raise RuntimeError("DMI bulk download budget exceeded during asset download")
                tmp.write(chunk)
    tmp_path.replace(path)
    return path, False


def safe_get(gid: int, key: str) -> Any:
    try:
        return codes_get(gid, key)
    except Exception:
        return None


def field_signature(gid: int) -> dict[str, Any]:
    return {key: safe_get(gid, key) for key in
            ("shortName", "name", "cfName", "parameterName", "units", "typeOfLevel", "level", "paramId", "discipline", "parameterCategory", "parameterNumber")}


def classify_parameter(gid: int, collection: str) -> str | None:
    sig = field_signature(gid)
    short = str(sig.get("shortName") or "").lower().strip()
    metadata = " ".join(str(sig.get(key) or "") for key in ("name", "cfName", "parameterName")).lower()
    level_type = str(sig.get("typeOfLevel") or "").lower()
    level = sig.get("level")
    family = COLLECTION_FAMILY[collection]

    candidates: list[str] = []
    for canonical in TARGETS[family]:
        if any(alias_matches(metadata, alias) or alias == short for alias in HINT_ALIASES[canonical]):
            candidates.append(canonical)
    # Collection-aware handling of ambiguous GRIB short names.
    if family == "marine" and short in {"u", "uo"}:
        candidates.append("current-u")
    if family == "marine" and short in {"v", "vo"}:
        candidates.append("current-v")
    if family == "wind" and short in {"u", "10u", "u10", "u10m"} and (level == 10 or "heightaboveground" in level_type or "10" in metadata):
        candidates.append("wind-u-10m")
    if family == "wind" and short in {"v", "10v", "v10", "v10m"} and (level == 10 or "heightaboveground" in level_type or "10" in metadata):
        candidates.append("wind-v-10m")
    candidates = list(dict.fromkeys(candidates))
    if len(candidates) == 1:
        return candidates[0]
    return None


def valid_value(value: Any, missing: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or abs(number) > 1e19:
        return None
    try:
        if missing is not None and math.isclose(number, float(missing), rel_tol=0, abs_tol=1e-12):
            return None
    except (TypeError, ValueError):
        pass
    return number


def runtime_remaining() -> float:
    return WORK_DEADLINE - time.monotonic()


def should_stop_work() -> bool:
    return runtime_remaining() <= 0


def progress(message: str) -> None:
    elapsed = time.monotonic() - STARTED
    print(f"[DMI bulk +{elapsed:6.1f}s] {message}", flush=True)


def grid_signature(gid: int) -> tuple[Any, ...]:
    keys = (
        "gridType", "Ni", "Nj", "numberOfPoints",
        "latitudeOfFirstGridPointInDegrees", "longitudeOfFirstGridPointInDegrees",
        "latitudeOfLastGridPointInDegrees", "longitudeOfLastGridPointInDegrees",
        "iDirectionIncrementInDegrees", "jDirectionIncrementInDegrees",
    )
    return tuple(safe_get(gid, key) for key in keys)


def nearest_candidates(gid: int, collection: str, zone: dict[str, Any]) -> list[dict[str, Any]]:
    cache_key = (collection, grid_signature(gid), zone["id"])
    cached = GRID_INDEX_CACHE.get(cache_key)
    if cached is not None:
        return cached
    try:
        candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], npoints=4)
    except TypeError:
        candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], False, 4)
    except Exception:
        candidates = []
    if isinstance(candidates, dict):
        candidates = [candidates]
    normalized = []
    for candidate in sorted(candidates or [], key=lambda item: float(item.get("distance", 1e99))):
        try:
            normalized.append({
                "index": int(candidate.get("index")),
                "latitude": float(candidate.get("lat")),
                "longitude": float(candidate.get("lon")),
                "distanceKm": float(candidate.get("distance", 0.0)),
            })
        except (TypeError, ValueError):
            continue
    GRID_INDEX_CACHE[cache_key] = normalized
    return normalized


def nearest_valid_cached(gid: int, collection: str, zone: dict[str, Any]) -> dict[str, float] | None:
    missing = safe_get(gid, "missingValue")
    candidates = nearest_candidates(gid, collection, zone)
    for candidate in candidates:
        try:
            value = codes_get_elements(gid, "values", [candidate["index"]])[0]
        except Exception:
            continue
        number = valid_value(value, missing)
        if number is not None:
            return {"value": number, "latitude": candidate["latitude"], "longitude": candidate["longitude"], "distanceKm": candidate["distanceKm"]}
    return None


def relevant_zones(collection: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if collection in {"dkss_nsbs", "wam_nsb"}:
        return [z for z in zones if z["coastType"] == "west"]
    if collection == "dkss_lf":
        return [z for z in zones if z["coastType"] == "limfjord"]
    if collection in {"dkss_idw", "wam_dw"}:
        return [z for z in zones if z["coastType"] not in {"west", "limfjord"}]
    return zones


def process_grib(path: pathlib.Path, collection: str, valid_time: str,
                 zones: list[dict[str, Any]], output: dict[str, Any], diagnostics: dict[str, Any]) -> tuple[set[str], set[str], bool, int, int]:
    wanted, found, touched = relevant_zones(collection, zones), set(), set()
    inventory = diagnostics.setdefault("gribFieldInventory", {}).setdefault(collection, {})
    messages_seen = 0
    zone_lookups = 0
    interrupted = False
    with path.open("rb") as handle:
        while True:
            if should_stop_work():
                interrupted = True
                break
            gid = codes_grib_new_from_file(handle)
            if gid is None:
                break
            messages_seen += 1
            try:
                sig = field_signature(gid)
                sig_key = "|".join(str(sig.get(k) or "") for k in ("shortName", "name", "units", "typeOfLevel", "level", "paramId"))
                if sig_key not in inventory and len(inventory) < 60:
                    inventory[sig_key] = {**sig, "messagesSeen": 1}
                elif sig_key in inventory:
                    inventory[sig_key]["messagesSeen"] = int(inventory[sig_key].get("messagesSeen") or 0) + 1
                parameter = classify_parameter(gid, collection)
                if not parameter:
                    continue
                found.add(parameter)
                for zone_number, zone in enumerate(wanted):
                    if zone_number % 8 == 0 and should_stop_work():
                        interrupted = True
                        break
                    nearest = nearest_valid_cached(gid, collection, zone)
                    zone_lookups += 1
                    if not nearest:
                        continue
                    touched.add(zone["id"])
                    point = output["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                    hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
                    hour[parameter] = nearest["value"]
                    point["gridPoints"][parameter] = {k: round(v, 5) for k, v in nearest.items() if k != "value"}
                    point["collections"][parameter] = collection
                if interrupted:
                    break
            finally:
                codes_release(gid)
    return found, touched, interrupted, messages_seen, zone_lookups

def wind_from_uv(hour: dict[str, Any]) -> None:
    u, v = hour.get("wind-u-10m"), hour.get("wind-v-10m")
    if isinstance(u, (int, float)) and isinstance(v, (int, float)):
        hour["wind-speed-10m"] = math.hypot(u, v)
        hour["wind-dir-10m"] = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0


def load_previous() -> dict[str, Any]:
    try:
        return json.loads(OUTPUT_PATH.read_text("utf-8"))
    except Exception:
        return {"schemaVersion": 2, "zones": {}, "runs": {}}


def merge_previous(current: dict[str, Any], previous: dict[str, Any]) -> None:
    for collection, details in (previous.get("runs") or {}).items():
        current.setdefault("runs", {}).setdefault(collection, details)
    for zone_id, old_zone in (previous.get("zones") or {}).items():
        new_zone = current["zones"].setdefault(zone_id, {"hourly": {}, "gridPoints": {}, "collections": {}})
        for valid, old_hour in (old_zone.get("hourly") or {}).items():
            new_hour = new_zone["hourly"].setdefault(valid, {"time": valid})
            for key, value in old_hour.items():
                new_hour.setdefault(key, value)
        for field in ("gridPoints", "collections"):
            for key, value in (old_zone.get(field) or {}).items():
                new_zone[field].setdefault(key, value)


def collection_schedule(previous: dict[str, Any]) -> list[str]:
    state = previous.get("collectionState") or {}
    now = time.time()
    def priority(collection: str) -> tuple[float, float, int, int]:
        entry = state.get(collection) or {}
        retry_after = epoch(entry.get("nextEligibleAt"))
        blocked = 1 if retry_after > now else 0
        # Rotate by last attempt even after failure; successful freshness is secondary.
        return (blocked, epoch(entry.get("lastAttemptAt")), epoch(entry.get("lastSuccessfulAt")), COLLECTION_ORDER.index(collection))
    eligible = sorted(COLLECTION_ORDER, key=priority)
    return eligible[:COLLECTIONS_PER_RUN]



def clean_and_summarize(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int]) -> None:
    cutoff, horizon = time.time() - 6 * 3600, time.time() + (HOURS + 6) * 3600
    for zone in result["zones"].values():
        cleaned = {}
        for valid, hour in zone.get("hourly", {}).items():
            if cutoff <= epoch(valid) <= horizon:
                wind_from_uv(hour)
                cleaned[valid] = hour
        zone["hourly"] = dict(sorted(cleaned.items(), key=lambda row: epoch(row[0])))
    result["zones"] = {k: v for k, v in result["zones"].items() if v.get("hourly")}
    diag = result["diagnostics"]
    diag["downloadedBytes"] = budget["bytes"]
    diag["freshZoneCount"] = len(fresh_zone_ids)
    diag["zoneCount"] = len(result["zones"])
    diag["completeMarineZones"] = sum(1 for z in result["zones"].values() if any(all(k in h for k in ("sea-mean-deviation", "current-u", "current-v")) for h in z["hourly"].values()))
    diag["completeWindZones"] = sum(1 for z in result["zones"].values() if any("wind-speed-10m" in h for h in z["hourly"].values()))
    diag["completeWaveZones"] = sum(1 for z in result["zones"].values() if any("significant-wave-height" in h for h in z["hourly"].values()))


def write_checkpoint(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int], status: str = "partial") -> None:
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    clean_and_summarize(result, fresh_zone_ids, budget)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    tmp.replace(OUTPUT_PATH)


def write_github_outputs(status: str, fresh_collections: int = 0, partial_collections: int = 0,
                         zone_count: int = 0, downloaded_bytes: int = 0, error: str | None = None) -> None:
    output_path = os.getenv("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as handle:
            handle.write(f"status={status}\n")
            handle.write(f"fresh_collections={fresh_collections}\n")
            handle.write(f"partial_collections={partial_collections}\n")
            handle.write(f"zone_count={zone_count}\n")
            handle.write(f"downloaded_bytes={downloaded_bytes}\n")
            if error:
                safe_error = str(error).replace("\r", " ").replace("\n", " ")[:500]
                handle.write(f"error={safe_error}\n")


def write_failure_summary(error: Exception) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write("- Status: **failed**\n")
            handle.write(f"- Opstartsfejl: `{str(error)[:500]}`\n")


def main() -> int:
    progress(f"starter; arbejdsbudget={MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS}s, afslutningsreserve={FINALIZE_RESERVE_SECONDS}s")
    previous = load_previous()
    previous_generated = epoch(previous.get("generatedAt"))
    if not FORCE_REFRESH and previous_generated and previous.get("zones") and time.time() - previous_generated < REFRESH_MINUTES * 60:
        print(json.dumps({"skipped": "fresh-bulk-cache", "zoneCount": len(previous.get("zones") or {}), "generatedAt": previous.get("generatedAt")}, ensure_ascii=False))
        return 0

    zones_geo = json.loads(ZONES_PATH.read_text("utf-8"))
    zones = []
    for feature in zones_geo.get("features", []):
        props, geometry = feature.get("properties") or {}, feature.get("geometry") or {}
        configured = props.get("dataPoint")
        if isinstance(configured, list) and len(configured) == 2:
            lon, lat = configured
        elif geometry.get("type") == "Point" and isinstance(geometry.get("coordinates"), list):
            lon, lat = geometry["coordinates"][:2]
        elif geometry.get("type") == "Polygon" and geometry.get("coordinates") and geometry["coordinates"][0]:
            ring = geometry["coordinates"][0]
            points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
            lon, lat = sum(float(p[0]) for p in points) / len(points), sum(float(p[1]) for p in points) / len(points)
        else:
            continue
        if props.get("id"):
            zones.append({"id": props["id"], "lon": float(lon), "lat": float(lat), "coastType": props.get("coastType") or "east"})

    generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result = {"schemaVersion": 2, "generatedAt": generated,
              "sourceUpdatedAt": previous.get("sourceUpdatedAt") or previous.get("generatedAt"),
              "method": f"DMI STAC forecast-step GRIB inventory; collection-specific field extraction; nearest original grid point; {TIME_STRIDE_HOURS}h model stride; no spatial interpolation",
              "hours": HOURS, "timeStrideHours": TIME_STRIDE_HOURS, "zones": {}, "runs": {},
              "collectionState": dict(previous.get("collectionState") or {}),
              "diagnostics": {"collectionsAttempted": [], "collectionsSucceeded": [], "collectionsPartial": [], "errors": [],
                              "downloadedBytes": 0, "reusedAssets": 0, "parametersByCollection": {}, "stacByCollection": {},
                              "assetsSkippedPreviouslyProcessed": 0, "messagesSeen": 0, "zoneLookups": 0,
                              "runtimeBudgetSeconds": MAX_RUNTIME_SECONDS, "finalizeReserveSeconds": FINALIZE_RESERVE_SECONDS}}
    merge_previous(result, previous)
    budget = {"bytes": 0}
    selected = collection_schedule(previous)
    result["diagnostics"]["scheduledCollections"] = selected
    fresh_zone_ids: set[str] = set()

    for collection in selected:
        if should_stop_work():
            result["diagnostics"]["errors"].append({"collection": collection, "message": "bulk runtime budget reached"})
            break
        result["diagnostics"]["collectionsAttempted"].append(collection)
        state = result["collectionState"].setdefault(collection, {})
        state["lastAttemptAt"] = generated
        try:
            run, assets, stac_stats = list_latest_assets(collection)
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            if not assets:
                raise RuntimeError("no forecast-step GRIB assets found in latest STAC run")
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            previously_processed = set(previous_run.get("processedValidTimes") or []) if previous_run.get("referenceTime") == run else set()
            run_info = {"referenceTime": run, "assetsDiscovered": len(assets), "assetsProcessed": 0, "assetsReused": 0,
                        "assetsSkippedPreviouslyProcessed": 0, "processedValidTimes": sorted(previously_processed),
                        "recognizedParameters": []}
            result["runs"][collection] = run_info
            recognized: set[str] = set()
            budget_stop = None
            for asset_number, asset in enumerate(assets, start=1):
                if asset["valid"] in previously_processed:
                    run_info["assetsSkippedPreviouslyProcessed"] += 1
                    result["diagnostics"]["assetsSkippedPreviouslyProcessed"] += 1
                    continue
                if should_stop_work():
                    budget_stop = "bulk runtime budget reached"
                    break
                try:
                    path, reused = download_asset(asset["href"], asset.get("size"), budget)
                except RuntimeError as exc:
                    if "budget" in str(exc).lower():
                        budget_stop = str(exc)
                        break
                    raise
                if reused:
                    result["diagnostics"]["reusedAssets"] += 1
                    run_info["assetsReused"] += 1
                progress(f"{collection}: behandler forecast-step {asset_number}/{len(assets)} {asset['valid']} ({'genbrugt' if reused else 'downloadet'})")
                found, touched, interrupted, messages_seen, zone_lookups = process_grib(path, collection, asset["valid"], zones, result, result["diagnostics"])
                recognized.update(found)
                result["diagnostics"]["messagesSeen"] += messages_seen
                result["diagnostics"]["zoneLookups"] += zone_lookups
                if not interrupted:
                    run_info["assetsProcessed"] += 1
                    previously_processed.add(asset["valid"])
                    run_info["processedValidTimes"] = sorted(previously_processed, key=epoch)
                fresh_zone_ids.update(touched)
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
                progress(f"{collection}: checkpoint gemt; steps={run_info['assetsProcessed']}, felter={sorted(recognized)}, resterende={runtime_remaining():.0f}s")
                if interrupted:
                    budget_stop = "bulk runtime budget reached inside GRIB processing"
                    break
            result["diagnostics"]["parametersByCollection"][collection] = sorted(recognized)
            run_info["recognizedParameters"] = sorted(recognized)
            required = set(TARGETS[COLLECTION_FAMILY[collection]])
            if recognized >= required and run_info["assetsProcessed"]:
                state["lastSuccessfulAt"] = generated
                state["referenceTime"] = run
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                state["lastError"] = None
                result["diagnostics"]["collectionsSucceeded"].append(collection)
            elif recognized:
                state["lastPartialAt"] = generated
                state["referenceTime"] = run
                state["consecutiveFailures"] = 0
                state["nextEligibleAt"] = None
                result["diagnostics"]["collectionsPartial"].append(collection)
            else:
                raise RuntimeError("GRIB downloaded but no required RavRadar parameters were recognized")
            if budget_stop:
                result["diagnostics"]["errors"].append({"collection": collection, "message": budget_stop, "partialProgressPreserved": True})
        except Exception as exc:
            failures = int(state.get("consecutiveFailures") or 0) + 1
            delay_minutes = min(180, 10 * (2 ** min(failures - 1, 4)))
            state["consecutiveFailures"] = failures
            state["lastError"] = str(exc)
            state["nextEligibleAt"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace("+00:00", "Z")
            result["diagnostics"]["errors"].append({"collection": collection, "message": str(exc), "retryAfterMinutes": delay_minutes})

    clean_and_summarize(result, fresh_zone_ids, budget)
    diag = result["diagnostics"]
    fresh_successes, fresh_partials = len(diag["collectionsSucceeded"]), len(diag["collectionsPartial"])
    if fresh_successes or fresh_partials:
        result["sourceUpdatedAt"] = generated
    result["refreshStatus"] = "ok" if fresh_successes == len(selected) else ("partial" if fresh_successes or fresh_partials else "failed")

    write_checkpoint(result, fresh_zone_ids, budget, result["refreshStatus"])
    summary = {**diag, "refreshStatus": result["refreshStatus"], "sourceUpdatedAt": result.get("sourceUpdatedAt"),
               "preservedPreviousZones": max(0, len(result["zones"]) - len(fresh_zone_ids))}
    write_github_outputs(
        result["refreshStatus"], fresh_successes, fresh_partials,
        len(result["zones"]), budget["bytes"]
    )
    if os.getenv("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as h:
            h.write("## DMI bulk refresh\n\n")
            h.write(f"- Status: **{result['refreshStatus']}**\n- Planlagte samlinger: **{', '.join(selected)}**\n")
            h.write(f"- Fuld/delvis succes: **{fresh_successes}/{fresh_partials}**\n- Zoner i cache: **{len(result['zones'])}**\n")
            h.write(f"- Downloadet denne kørsel: **{budget['bytes']} bytes**\n")
            if diag["errors"]:
                h.write("- Bemærkninger: " + "; ".join(f"{e['collection']}: {e['message']}" for e in diag["errors"]) + "\n")
    print(json.dumps(summary, ensure_ascii=False))
    return 0 if fresh_successes or fresh_partials else 2


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"DMI bulk downloader failed safely: {exc}", file=sys.stderr, flush=True)
        write_github_outputs("failed", error=str(exc))
        write_failure_summary(exc)
        raise SystemExit(2)
