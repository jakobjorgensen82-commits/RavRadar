#!/usr/bin/env python3
"""Download DMI forecast model GRIB assets through the STAC API and extract
nearest original model grid values for every RavRadar zone.

The script is deliberately fail-soft: an unavailable collection, unknown GRIB
parameter, rate limit or download budget never removes existing weather data.
It writes data/live/dmi-bulk-cache.json atomically only when it has a valid
result and preserves the previous cache component-by-component.
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
from eccodes import (codes_get, codes_get_array, codes_grib_find_nearest,
                     codes_grib_new_from_file, codes_release)

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
REFRESH_MINUTES = max(1, int(os.getenv("DMI_BULK_REFRESH_MINUTES", "60")))
FORCE_REFRESH = os.getenv("DMI_BULK_FORCE_REFRESH", "false").lower() in {"1", "true", "yes", "on"}
USER_AGENT = os.getenv("WEATHER_USER_AGENT", "RavRadar DMI bulk downloader")
API_KEY = os.getenv("DMI_API_KEY")
STARTED = time.monotonic()
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept": "application/geo+json, application/json"})
if API_KEY:
    SESSION.params.update({"api-key": API_KEY})

COLLECTIONS = {
    "marine": ["dkss_idw", "dkss_nsbs", "dkss_lf"],
    "wind": ["harmonie_dini_sf"],
    "wave": ["wam_dw", "wam_nsb"],
}

# Matching intentionally uses both GRIB short names and readable metadata.
PARAMETERS = {
    "sea-mean-deviation": {
        "short": {"zos", "ssh", "zeta", "sealevel", "sl"},
        "text": ("sea mean deviation", "sea surface height", "water level", "sea level"),
    },
    "current-u": {
        "short": {"uo", "ucurr", "uocn", "u"},
        "text": ("u component of current", "eastward sea water velocity", "eastward current"),
    },
    "current-v": {
        "short": {"vo", "vcurr", "vocn", "v"},
        "text": ("v component of current", "northward sea water velocity", "northward current"),
    },
    "water-temperature": {
        "short": {"thetao", "sst", "wtmp", "t"},
        "text": ("water temperature", "sea surface temperature", "sea water temperature"),
    },
    "wind-u-10m": {
        "short": {"10u", "u10", "u10m"},
        "text": ("10 metre u wind component", "u component of wind at 10", "eastward wind"),
    },
    "wind-v-10m": {
        "short": {"10v", "v10", "v10m"},
        "text": ("10 metre v wind component", "v component of wind at 10", "northward wind"),
    },
    "significant-wave-height": {
        "short": {"swh", "hs", "htsgw"},
        "text": ("significant height of combined wind waves and swell", "significant wave height"),
    },
    "mean-wave-dir": {
        "short": {"mwd", "dirpw", "wavedir"},
        "text": ("mean wave direction", "mean direction of waves"),
    },
    "dominant-wave-period": {
        "short": {"pp1d", "mwp", "perpw", "tp"},
        "text": ("peak wave period", "dominant wave period", "mean wave period"),
    },
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
    if not parsed:
        return 0.0
    return datetime.fromisoformat(parsed.replace("Z", "+00:00")).timestamp()


def request_json(url: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    response = SESSION.get(url, params=params, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    return response.json()


def item_run(item: dict[str, Any]) -> str | None:
    props = item.get("properties") or {}
    for key in ("forecast:reference_datetime", "reference_datetime", "modelRun", "model_run", "created"):
        value = iso(props.get(key))
        if value:
            return value
    item_id = str(item.get("id", ""))
    match = re.search(r"(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)[T_]?([0-2]\d)", item_id)
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


def grib_asset(item: dict[str, Any]) -> tuple[str, int | None] | None:
    assets = item.get("assets") or {}
    ranked: list[tuple[int, str, int | None]] = []
    for key, asset in assets.items():
        href = asset.get("href")
        if not href:
            continue
        media = str(asset.get("type", "")).lower()
        name = f"{key} {href}".lower()
        if "grib" not in media and not re.search(r"\.(grib2?|grb2?|bin)(\?|$)", name):
            continue
        size = asset.get("file:size") or asset.get("size")
        try:
            size = int(size) if size is not None else None
        except (TypeError, ValueError):
            size = None
        score = 0 if key in {"data", "grib", "download"} else 1
        ranked.append((score, href, size))
    if not ranked:
        return None
    ranked.sort(key=lambda row: row[0])
    return ranked[0][1], ranked[0][2]


def list_latest_assets(collection: str) -> tuple[str | None, list[dict[str, Any]]]:
    url = f"{STAC_ROOT}/collections/{collection}/items"
    data = request_json(url, {"limit": 1000})
    items = data.get("features") or []
    runs: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        run = item_run(item)
        valid = item_valid(item)
        asset = grib_asset(item)
        if not run or not valid or not asset:
            continue
        if epoch(valid) < epoch(run) - 3600 or epoch(valid) > epoch(run) + (HOURS + 6) * 3600:
            continue
        href, size = asset
        runs.setdefault(run, []).append({"valid": valid, "href": href, "size": size, "id": item.get("id")})
    if not runs:
        return None, []
    run = max(runs, key=epoch)
    unique = {row["valid"]: row for row in sorted(runs[run], key=lambda row: epoch(row["valid"]))}
    return run, list(unique.values())[:MAX_ASSETS_PER_COLLECTION]


def download_asset(href: str, expected_size: int | None, budget: dict[str, int]) -> pathlib.Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    suffix = pathlib.Path(href.split("?", 1)[0]).suffix or ".grib"
    path = RAW_DIR / f"{hashlib.sha256(href.encode()).hexdigest()[:24]}{suffix}"
    if path.exists() and path.stat().st_size > 0:
        return path
    if expected_size and budget["bytes"] + expected_size > MAX_DOWNLOAD_BYTES:
        raise RuntimeError("DMI bulk download budget would be exceeded")
    with SESSION.get(href, stream=True, timeout=REQUEST_TIMEOUT) as response:
        response.raise_for_status()
        content_length = int(response.headers.get("content-length", "0") or 0)
        if budget["bytes"] + content_length > MAX_DOWNLOAD_BYTES:
            raise RuntimeError("DMI bulk download budget exceeded before asset download")
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
    return path


def safe_get(gid: int, key: str) -> Any:
    try:
        return codes_get(gid, key)
    except Exception:
        return None


def classify_parameter(gid: int) -> str | None:
    short = str(safe_get(gid, "shortName") or "").lower().strip()
    metadata = " ".join(str(safe_get(gid, key) or "") for key in ("name", "cfName", "parameterName", "units")).lower()
    level_type = str(safe_get(gid, "typeOfLevel") or "").lower()
    level = safe_get(gid, "level")
    for canonical, spec in PARAMETERS.items():
        if short in spec["short"] or any(text in metadata for text in spec["text"]):
            if canonical.startswith("wind-") and not ("10" in metadata or "10" in short or level == 10 or "heightaboveground" in level_type):
                continue
            return canonical
    return None


def valid_value(value: Any, missing: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    try:
        if missing is not None and math.isclose(number, float(missing), rel_tol=0, abs_tol=1e-12):
            return None
    except (TypeError, ValueError):
        pass
    if abs(number) > 1e19:
        return None
    return number


def nearest_valid(gid: int, lat: float, lon: float) -> dict[str, float] | None:
    missing = safe_get(gid, "missingValue")
    try:
        candidates = codes_grib_find_nearest(gid, lat, lon, npoints=4)
    except TypeError:
        candidates = codes_grib_find_nearest(gid, lat, lon, False, 4)
    except Exception:
        return None
    if isinstance(candidates, dict):
        candidates = [candidates]
    for candidate in sorted(candidates or [], key=lambda item: float(item.get("distance", 1e99))):
        value = valid_value(candidate.get("value"), missing)
        if value is not None:
            return {"value": value, "latitude": float(candidate.get("lat")), "longitude": float(candidate.get("lon")), "distanceKm": float(candidate.get("distance", 0.0))}
    return None


def relevant_zones(collection: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if collection == "dkss_nsbs" or collection == "wam_nsb":
        return [z for z in zones if z["coastType"] == "west"]
    if collection == "dkss_lf":
        return [z for z in zones if z["coastType"] == "limfjord"]
    if collection == "dkss_idw" or collection == "wam_dw":
        return [z for z in zones if z["coastType"] != "west" and z["coastType"] != "limfjord"]
    return zones


def process_grib(path: pathlib.Path, collection: str, valid_time: str, zones: list[dict[str, Any]], output: dict[str, Any], diagnostics: dict[str, Any]) -> None:
    wanted = relevant_zones(collection, zones)
    found: set[str] = set()
    with path.open("rb") as handle:
        while True:
            gid = codes_grib_new_from_file(handle)
            if gid is None:
                break
            try:
                parameter = classify_parameter(gid)
                if not parameter:
                    continue
                found.add(parameter)
                units = str(safe_get(gid, "units") or "")
                for zone in wanted:
                    nearest = nearest_valid(gid, zone["lat"], zone["lon"])
                    if not nearest:
                        continue
                    value = nearest["value"]
                    if parameter == "water-temperature" and units.lower() in {"k", "kelvin"}:
                        value -= 273.15
                    point = output["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                    hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
                    hour[parameter] = value
                    point["gridPoints"][parameter] = {k: round(v, 5) for k, v in nearest.items() if k != "value"}
                    point["collections"][parameter] = collection
            finally:
                codes_release(gid)
    diagnostics.setdefault("parametersByCollection", {}).setdefault(collection, []).extend(sorted(found))


def wind_from_uv(hour: dict[str, Any]) -> None:
    u, v = hour.get("wind-u-10m"), hour.get("wind-v-10m")
    if isinstance(u, (int, float)) and isinstance(v, (int, float)):
        hour["wind-speed-10m"] = math.hypot(u, v)
        hour["wind-dir-10m"] = (math.degrees(math.atan2(-u, -v)) + 360.0) % 360.0


def load_previous() -> dict[str, Any]:
    try:
        return json.loads(OUTPUT_PATH.read_text("utf-8"))
    except Exception:
        return {"schemaVersion": 1, "zones": {}}


def merge_previous(current: dict[str, Any], previous: dict[str, Any]) -> None:
    for zone_id, old_zone in (previous.get("zones") or {}).items():
        new_zone = current["zones"].setdefault(zone_id, {"hourly": {}, "gridPoints": {}, "collections": {}})
        for valid, old_hour in (old_zone.get("hourly") or {}).items():
            new_hour = new_zone["hourly"].setdefault(valid, {"time": valid})
            for key, value in old_hour.items():
                if key not in new_hour:
                    new_hour[key] = value
        for field in ("gridPoints", "collections"):
            for key, value in (old_zone.get(field) or {}).items():
                new_zone[field].setdefault(key, value)


def main() -> int:
    previous = load_previous()
    previous_generated = epoch(previous.get("generatedAt"))
    previous_zone_count = len(previous.get("zones") or {})
    if not FORCE_REFRESH and previous_generated and previous_zone_count and time.time() - previous_generated < REFRESH_MINUTES * 60:
        print(json.dumps({"skipped": "fresh-bulk-cache", "zoneCount": previous_zone_count, "generatedAt": previous.get("generatedAt")}, ensure_ascii=False))
        return 0

    zones_geo = json.loads(ZONES_PATH.read_text("utf-8"))
    zones = []
    for feature in zones_geo.get("features", []):
        props = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        configured = props.get("dataPoint")
        if isinstance(configured, list) and len(configured) == 2:
            lon, lat = configured
        elif geometry.get("type") == "Point" and isinstance(geometry.get("coordinates"), list):
            lon, lat = geometry["coordinates"][:2]
        elif geometry.get("type") == "Polygon" and geometry.get("coordinates") and geometry["coordinates"][0]:
            ring = geometry["coordinates"][0]
            points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
            lon = sum(float(point[0]) for point in points) / len(points)
            lat = sum(float(point[1]) for point in points) / len(points)
        else:
            continue
        if not props.get("id"):
            continue
        zones.append({"id": props["id"], "lon": float(lon), "lat": float(lat), "coastType": props.get("coastType") or "east"})

    result = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "method": "DMI STAC whole-GRIB download; nearest valid original model grid point; no spatial interpolation",
        "hours": HOURS,
        "zones": {},
        "runs": {},
        "diagnostics": {"collectionsAttempted": [], "collectionsSucceeded": [], "errors": [], "downloadedBytes": 0, "parametersByCollection": {}},
    }
    budget = {"bytes": 0}
    stop = False
    for family, collections in COLLECTIONS.items():
        for collection in collections:
            if time.monotonic() - STARTED > MAX_RUNTIME_SECONDS:
                result["diagnostics"]["errors"].append({"collection": collection, "message": "bulk runtime budget reached"})
                stop = True
                break
            result["diagnostics"]["collectionsAttempted"].append(collection)
            try:
                run, assets = list_latest_assets(collection)
                if not assets:
                    raise RuntimeError("no GRIB assets found in latest STAC items")
                result["runs"][collection] = {"referenceTime": run, "assetsDiscovered": len(assets), "assetsProcessed": 0}
                for asset in assets:
                    if time.monotonic() - STARTED > MAX_RUNTIME_SECONDS:
                        raise RuntimeError("bulk runtime budget reached")
                    path = download_asset(asset["href"], asset.get("size"), budget)
                    process_grib(path, collection, asset["valid"], zones, result, result["diagnostics"])
                    result["runs"][collection]["assetsProcessed"] += 1
                result["diagnostics"]["collectionsSucceeded"].append(collection)
            except Exception as exc:
                result["diagnostics"]["errors"].append({"collection": collection, "message": str(exc)})
                if "budget" in str(exc).lower() or "runtime" in str(exc).lower():
                    stop = True
                    break
        if stop:
            break

    merge_previous(result, previous)
    cutoff = time.time() - 6 * 3600
    horizon = time.time() + (HOURS + 6) * 3600
    for zone in result["zones"].values():
        cleaned = {}
        for valid, hour in zone["hourly"].items():
            ts = epoch(valid)
            if cutoff <= ts <= horizon:
                wind_from_uv(hour)
                cleaned[valid] = hour
        zone["hourly"] = dict(sorted(cleaned.items(), key=lambda row: epoch(row[0])))
    result["zones"] = {key: value for key, value in result["zones"].items() if value["hourly"]}
    result["diagnostics"]["downloadedBytes"] = budget["bytes"]
    result["diagnostics"]["zoneCount"] = len(result["zones"])
    result["diagnostics"]["completeMarineZones"] = sum(
        1 for zone in result["zones"].values()
        if any("sea-mean-deviation" in hour and "current-u" in hour and "current-v" in hour for hour in zone["hourly"].values())
    )
    result["diagnostics"]["completeWindZones"] = sum(1 for zone in result["zones"].values() if any("wind-speed-10m" in hour for hour in zone["hourly"].values()))
    result["diagnostics"]["completeWaveZones"] = sum(1 for zone in result["zones"].values() if any("significant-wave-height" in hour for hour in zone["hourly"].values()))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    tmp.replace(OUTPUT_PATH)
    print(json.dumps(result["diagnostics"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"DMI bulk downloader failed safely: {exc}", file=sys.stderr)
        raise SystemExit(0)
