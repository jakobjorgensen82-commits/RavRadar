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

from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed

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
WATER_SOURCES_PATH = ROOT / "data/live/dmi-water-stations.json"
OUTPUT_PATH = ROOT / "data/live/dmi-bulk-cache.json"
DIAGNOSTICS_JSON_PATH = ROOT / "data/diagnostics/dmi-ocean-diagnostics.json"
DIAGNOSTICS_TEXT_PATH = ROOT / "data/diagnostics/dmi-ocean-summary.txt"
RAW_DIR = pathlib.Path(os.getenv("DMI_BULK_RAW_DIR", str(ROOT / ".cache/dmi-grib")))
CACHE_AUDIT_PATH = ROOT / "data/diagnostics/dmi-cache-audit.json"
RAW_CACHE_MAX_BYTES = max(256 * 1024 * 1024, int(float(os.getenv("DMI_BULK_RAW_CACHE_MAX_MB", "4096")) * 1024 * 1024))
STAC_ROOT = os.getenv("DMI_STAC_ROOT", "https://opendataapi.dmi.dk/v1/forecastdata")
HOURS = max(1, int(os.getenv("DMI_BULK_HOURS", "120")))
MAX_DOWNLOAD_BYTES = max(1, int(float(os.getenv("DMI_BULK_MAX_DOWNLOAD_MB", "2048")) * 1024 * 1024))
MAX_RUNTIME_SECONDS = max(60, int(os.getenv("DMI_BULK_MAX_RUNTIME_SECONDS", "780")))
REQUEST_TIMEOUT = max(10, int(os.getenv("DMI_BULK_REQUEST_TIMEOUT_SECONDS", "90")))
MAX_ASSETS_PER_COLLECTION = max(1, int(os.getenv("DMI_BULK_MAX_ASSETS_PER_COLLECTION", "130")))
TIME_STRIDE_HOURS = max(1, int(os.getenv("DMI_BULK_TIME_STRIDE_HOURS", "3")))
COLLECTIONS_PER_RUN = max(1, int(os.getenv("DMI_BULK_COLLECTIONS_PER_RUN", "2")))
REFRESH_MINUTES = max(1, int(os.getenv("DMI_BULK_REFRESH_MINUTES", "60")))
COMPLETE_HORIZON_HOURS = max(24, int(os.getenv("DMI_BULK_COMPLETE_HORIZON_HOURS", "96")))
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
               status_forcelist=(500, 502, 503, 504), allowed_methods=frozenset({"GET"}),
               respect_retry_after_header=True)
_adapter = HTTPAdapter(max_retries=_retry, pool_connections=4, pool_maxsize=4)
for _session in (STAC_SESSION, DOWNLOAD_SESSION):
    _session.mount("https://", _adapter)
    _session.headers.update({"User-Agent": USER_AGENT})
STAC_SESSION.headers.update({"Accept": "application/geo+json, application/json"})
DOWNLOAD_SESSION.headers.update({"Accept": "application/x-grib, application/octet-stream, */*"})

PARSER_VERSION = 10
PARAMETER_MAP_VERSION = 2
GRID_LOOKUP_VERSION = 5
COLLECTION_ORDER = ["dkss_idw", "dkss_nsbs", "dkss_lf", "wam_dw", "wam_nsb", "harmonie_dini_sf"]
COLLECTION_FAMILY = {
    "dkss_idw": "marine", "dkss_nsbs": "marine", "dkss_lf": "marine",
    "harmonie_dini_sf": "wind", "wam_dw": "wave", "wam_nsb": "wave",
}
TARGETS = {
    "marine": ["sea-mean-deviation", "current-u", "current-v", "water-temperature"],
    "wind": ["wind-u-10m", "wind-v-10m"],
    "wave": ["significant-wave-height", "mean-wave-dir", "dominant-wave-period"],
}
REQUIRED_TARGETS = {
    "marine": {"sea-mean-deviation", "current-u", "current-v"},
    "wind": {"wind-u-10m", "wind-v-10m"},
    "wave": {"significant-wave-height", "mean-wave-dir", "dominant-wave-period"},
}

MARINE_COLLECTIONS = {"dkss_idw", "dkss_nsbs", "dkss_lf"}
MARINE_PARAMETERS = {"sea-mean-deviation", "current-u", "current-v", "water-temperature"}
VECTOR_PAIRS = {
    "current-u": ("current", "current-u", "current-v"),
    "current-v": ("current", "current-u", "current-v"),
    "wind-u-10m": ("wind", "wind-u-10m", "wind-v-10m"),
    "wind-v-10m": ("wind", "wind-u-10m", "wind-v-10m"),
}
GRID_CANDIDATE_TARGET = max(4, int(os.getenv("DMI_BULK_GRID_CANDIDATES", "16")))
MAX_GRID_DISTANCE_KM = {"limfjord": 24.0, "west": 40.0, "east": 32.0}
MARINE_MODEL_PENALTY_KM = {
    "limfjord": {"dkss_lf": 0.0, "dkss_idw": 8.0, "dkss_nsbs": 18.0},
    "west": {"dkss_nsbs": 0.0, "dkss_idw": 10.0, "dkss_lf": 22.0},
    "east": {"dkss_idw": 0.0, "dkss_lf": 10.0, "dkss_nsbs": 20.0},
}

# Strong aliases are used for STAC item/asset metadata. Single-letter aliases are
# intentionally excluded here because they caused every valid time to collapse to
# the water-temperature item in 3.2.1.
HINT_ALIASES = {
    "sea-mean-deviation": ("sea mean deviation", "sea surface height", "sea_surface_height", "sea-surface-height", "water level", "water surface elevation", "sea level", "surface elevation", "zos", "zeta", "ssh", "smd"),
    "current-u": ("u component of current", "u-component of sea water velocity", "eastward sea water velocity", "eastward current", "sea water x velocity", "current-u", "uo", "ucurr", "uocn", "vozocrtx"),
    "current-v": ("v component of current", "v-component of sea water velocity", "northward sea water velocity", "northward current", "sea water y velocity", "current-v", "vo", "vcurr", "vocn", "vomecrty"),
    "water-temperature": ("water temperature", "sea water temperature", "sea-water temperature", "sea surface temperature", "water-temperature", "temperature of sea water", "sst"),
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
        if any(alias_matches(text, alias) for alias in HINT_ALIASES.get(canonical, ())):
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




def raw_cache_inventory() -> dict[str, Any]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = [path for path in RAW_DIR.iterdir() if path.is_file()]
    rows = []
    for path in files:
        try:
            stat = path.stat()
            rows.append({"name": path.name, "bytes": stat.st_size, "modifiedAt": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat().replace("+00:00", "Z")})
        except OSError:
            continue
    rows.sort(key=lambda row: row["modifiedAt"])
    return {"files": len(rows), "bytes": sum(row["bytes"] for row in rows), "oldest": rows[0]["modifiedAt"] if rows else None, "newest": rows[-1]["modifiedAt"] if rows else None, "largestFiles": sorted(rows, key=lambda row: row["bytes"], reverse=True)[:20]}


def write_cache_audit(before: dict[str, Any], after: dict[str, Any], removed_files: int, removed_bytes: int) -> None:
    CACHE_AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_AUDIT_PATH.write_text(json.dumps({
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "policy": {"maxBytes": RAW_CACHE_MAX_BYTES, "strategy": "least-recently-used; reused files are touched before pruning"},
        "before": before, "after": after,
        "removedFiles": removed_files, "removedBytes": removed_bytes
    }, ensure_ascii=False, indent=2) + "\n", "utf-8")


def prune_raw_cache(max_bytes: int = RAW_CACHE_MAX_BYTES) -> dict[str, int]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    files = [path for path in RAW_DIR.iterdir() if path.is_file()]
    total = sum(path.stat().st_size for path in files)
    removed_files = 0
    removed_bytes = 0
    if total > max_bytes:
        for path in sorted(files, key=lambda item: item.stat().st_mtime):
            try:
                size = path.stat().st_size
                path.unlink(missing_ok=True)
                total -= size
                removed_files += 1
                removed_bytes += size
            except OSError:
                continue
            if total <= max_bytes:
                break
    return {"removedFiles": removed_files, "removedBytes": removed_bytes}

def download_asset(href: str, expected_size: int | None, budget: dict[str, int]) -> tuple[pathlib.Path, bool]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    suffix = pathlib.Path(href.split("?", 1)[0]).suffix or ".grib"
    path = RAW_DIR / f"{hashlib.sha256(href.encode()).hexdigest()[:24]}{suffix}"
    if path.exists() and path.stat().st_size > 0:
        try:
            os.utime(path, None)
        except OSError:
            pass
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
            ("shortName", "name", "cfName", "parameterName", "units", "typeOfLevel", "level", "paramId", "discipline", "parameterCategory", "parameterNumber", "numberOfPoints", "numberOfMissing", "minimum", "maximum", "indicatorOfParameter", "table2Version", "centre", "subCentre", "generatingProcessIdentifier", "scaledValueOfFirstFixedSurface", "typeOfFirstFixedSurface")}


def classify_parameter(gid: int, collection: str) -> str | None:
    sig = field_signature(gid)
    short = str(sig.get("shortName") or "").lower().strip()
    metadata = " ".join(str(sig.get(key) or "") for key in ("name", "cfName", "parameterName")).lower()
    level_type = str(sig.get("typeOfLevel") or "").lower()
    level = sig.get("level")
    family = COLLECTION_FAMILY[collection]

    candidates: list[str] = []
    # DMI DKSS uses local GRIB parameter ids. These numeric ids remain reliable
    # even when ecCodes cannot resolve the local shortName/name table.
    if family == "marine":
        raw_ids = {sig.get("paramId"), sig.get("indicatorOfParameter")}
        direct_ids = {
            82: "sea-mean-deviation", 3082: "sea-mean-deviation", 300082: "sea-mean-deviation",
            49: "current-u", 300049: "current-u",
            50: "current-v", 300050: "current-v",
            80: "water-temperature", 3080: "water-temperature", 300080: "water-temperature",
        }
        for raw_id in raw_ids:
            try:
                canonical = direct_ids.get(int(raw_id))
            except (TypeError, ValueError):
                canonical = None
            if canonical:
                candidates.append(canonical)
    for canonical in TARGETS[family]:
        if any(alias_matches(metadata, alias) or alias == short for alias in HINT_ALIASES.get(canonical, ())):
            candidates.append(canonical)
    # Collection-aware handling of ambiguous GRIB short names.
    if family == "marine" and short in {"u", "uo", "ucurr", "uocn", "vozocrtx"}:
        candidates.append("current-u")
    if family == "marine" and short in {"v", "vo", "vcurr", "vocn", "vomecrty"}:
        candidates.append("current-v")
    if family == "marine" and short in {"zos", "zeta", "ssh", "smd", "wlv", "sealev"}:
        candidates.append("sea-mean-deviation")
    if family == "marine" and sig.get("paramId") in {49, 50, 51, 131, 132}:
        # DMI/ecCodes local tables can expose ocean fields with generic ids; metadata still decides ambiguity below.
        if "eastward" in metadata or "u component" in metadata: candidates.append("current-u")
        if "northward" in metadata or "v component" in metadata: candidates.append("current-v")
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


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def nearest_candidates(gid: int, collection: str, zone: dict[str, Any]) -> list[dict[str, Any]]:
    """Find flere mulige havpunkter uden at antage, at de fire nærmeste er gyldige.

    ecCodes returnerer højst fire punkter pr. opslag på flere grids. Derfor probes
    et lille mønster omkring zonens datapunkt, kandidater deduplikeres på gridindeks,
    og den reelle afstand tilbage til zonen beregnes. Ingen kandidat accepteres alene
    fordi den ligger tæt på et probe-punkt.
    """
    # Atmosfæriske grids (HARMONIE) er komplette land/hav-grids og kræver ikke
    # den dyre marine kyst-probing. Ét nearest-opslag pr. zone/grid er nok og
    # genbruges på tværs af alle forecast-tider via GRID_INDEX_CACHE.
    candidate_target = GRID_CANDIDATE_TARGET if collection in MARINE_COLLECTIONS else 4
    cache_key = (collection, grid_signature(gid), zone["id"], candidate_target)
    cached = GRID_INDEX_CACHE.get(cache_key)
    if cached is not None:
        return cached
    if collection not in MARINE_COLLECTIONS:
        try:
            candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], npoints=4)
        except TypeError:
            candidates = codes_grib_find_nearest(gid, zone["lat"], zone["lon"], False, 4)
        except Exception:
            candidates = []
        if isinstance(candidates, dict):
            candidates = [candidates]
        direct = []
        for candidate in candidates or []:
            try:
                direct.append({
                    "index": int(candidate.get("index")),
                    "latitude": float(candidate.get("lat")),
                    "longitude": float(candidate.get("lon")),
                    "distanceKm": haversine_km(zone["lat"], zone["lon"], float(candidate.get("lat")), float(candidate.get("lon"))),
                })
            except (TypeError, ValueError):
                continue
        normalized = sorted(direct, key=lambda item: item["distanceKm"])[:candidate_target]
        GRID_INDEX_CACHE[cache_key] = normalized
        return normalized
    probes = [(0.0, 0.0)]
    for radius in (0.025, 0.05, 0.09, 0.14):
        probes.extend((dlat * radius, dlon * radius) for dlat, dlon in (
            (1, 0), (-1, 0), (0, 1), (0, -1),
            (0.707, 0.707), (0.707, -0.707), (-0.707, 0.707), (-0.707, -0.707),
        ))
    by_index: dict[int, dict[str, Any]] = {}
    for dlat, dlon in probes:
        try:
            candidates = codes_grib_find_nearest(gid, zone["lat"] + dlat, zone["lon"] + dlon, npoints=4)
        except TypeError:
            candidates = codes_grib_find_nearest(gid, zone["lat"] + dlat, zone["lon"] + dlon, False, 4)
        except Exception:
            candidates = []
        if isinstance(candidates, dict):
            candidates = [candidates]
        for candidate in candidates or []:
            try:
                index = int(candidate.get("index"))
                lat = float(candidate.get("lat"))
                lon = float(candidate.get("lon"))
                distance = haversine_km(zone["lat"], zone["lon"], lat, lon)
            except (TypeError, ValueError):
                continue
            prior = by_index.get(index)
            if prior is None or distance < prior["distanceKm"]:
                by_index[index] = {"index": index, "latitude": lat, "longitude": lon, "distanceKm": distance}
    normalized = sorted(by_index.values(), key=lambda item: item["distanceKm"])[:candidate_target]
    GRID_INDEX_CACHE[cache_key] = normalized
    return normalized

def valid_candidates_batch(gid: int, collection: str, zones: list[dict[str, Any]]) -> dict[str, list[dict[str, float]]]:
    """Returner alle gyldige kandidater pr. zone for et GRIB-felt.

    Vektorkomponenter må ikke hver for sig vælge deres nærmeste gyldige punkt.
    Denne funktion bevarer kandidatlisten, så U og V efterfølgende kan vælge det
    nærmeste *fælles* fysiske gitterpunkt.
    """
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(gid, collection, zone)
        candidates_by_zone[zone["id"]] = candidates
        for candidate in candidates:
            index = int(candidate["index"])
            if index not in seen:
                seen.add(index)
                unique_indices.append(index)
    if not unique_indices:
        return {}
    try:
        raw_values = codes_get_elements(gid, "values", unique_indices)
    except Exception:
        return {}
    values = {index: raw_values[pos] for pos, index in enumerate(unique_indices)}
    resolved: dict[str, list[dict[str, float]]] = {}
    for zone_id, candidates in candidates_by_zone.items():
        rows = []
        for candidate in candidates:
            number = valid_value(values.get(int(candidate["index"])), missing)
            if number is None:
                continue
            rows.append({
                "index": int(candidate["index"]),
                "value": number,
                "latitude": candidate["latitude"],
                "longitude": candidate["longitude"],
                "distanceKm": candidate["distanceKm"],
            })
        if rows:
            resolved[zone_id] = rows
    return resolved


def nearest_valid_batch(gid: int, collection: str, zones: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    """Resolve all zone values with one ecCodes array lookup per GRIB message.

    Candidate indices remain tied to the current zone-registry hash through the
    processing signature. Moving a land/data point therefore forces a rebuild,
    while repeated forecast steps on the same grid reuse the nearest-index map.
    """
    missing = safe_get(gid, "missingValue")
    candidates_by_zone: dict[str, list[dict[str, Any]]] = {}
    unique_indices: list[int] = []
    seen: set[int] = set()
    for zone in zones:
        candidates = nearest_candidates(gid, collection, zone)
        candidates_by_zone[zone["id"]] = candidates
        for candidate in candidates:
            index = int(candidate["index"])
            if index not in seen:
                seen.add(index)
                unique_indices.append(index)
    if not unique_indices:
        return {}
    try:
        raw_values = codes_get_elements(gid, "values", unique_indices)
    except Exception:
        return {}
    values = {index: raw_values[pos] for pos, index in enumerate(unique_indices)}
    resolved: dict[str, dict[str, float]] = {}
    for zone_id, candidates in candidates_by_zone.items():
        for candidate in candidates:
            number = valid_value(values.get(int(candidate["index"])), missing)
            if number is not None:
                resolved[zone_id] = {
                    "value": number,
                    "latitude": candidate["latitude"],
                    "longitude": candidate["longitude"],
                    "distanceKm": candidate["distanceKm"],
                }
                break
    return resolved


def relevant_zones(collection: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # Marine collections må overlappe. coastType bestemmer prioritet og afstandsgrænse,
    # men må ikke længere blokere en alternativ DMI-model med et bedre gyldigt havpunkt.
    if collection in MARINE_COLLECTIONS:
        return zones
    if collection == "wam_nsb":
        return [z for z in zones if z["coastType"] == "west"]
    if collection == "wam_dw":
        return [z for z in zones if z["coastType"] != "west"]
    return zones


def marine_model_score(zone: dict[str, Any], collection: str, distance_km: float) -> float:
    coast = zone.get("coastType") or "east"
    penalty = MARINE_MODEL_PENALTY_KM.get(coast, MARINE_MODEL_PENALTY_KM["east"]).get(collection, 25.0)
    return float(distance_km) + float(penalty)


def accept_marine_collection(point: dict[str, Any], zone: dict[str, Any], collection: str, distance_km: float) -> bool:
    coast = zone.get("coastType") or "east"
    if distance_km > MAX_GRID_DISTANCE_KM.get(coast, 32.0):
        return False
    selection = point.get("marineSelection") or {}
    score = marine_model_score(zone, collection, distance_km)
    current_score = selection.get("score")
    if current_score is not None and float(current_score) <= score and selection.get("collection") != collection:
        return False
    if selection.get("collection") != collection:
        for hour in (point.get("hourly") or {}).values():
            for key in MARINE_PARAMETERS:
                hour.pop(key, None)
        for key in MARINE_PARAMETERS:
            (point.get("gridPoints") or {}).pop(key, None)
            (point.get("collections") or {}).pop(key, None)
    point["marineSelection"] = {
        "collection": collection, "score": round(score, 3),
        "distanceKm": round(distance_km, 3), "coastType": coast,
        "modelPenaltyKm": MARINE_MODEL_PENALTY_KM.get(coast, {}).get(collection, 25.0),
    }
    return True


def parameter_zones(collection: str, parameter: str, zones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Afgræns sampling efter faktisk databehov.

    Vandstandskilder er hjælpepunkter til DKSS-vandstand. De er ikke forecastzoner
    og må derfor ikke forbruge opslag på strøm, vind, bølger eller temperatur.
    """
    regular = [zone for zone in zones if not zone.get("waterSource")]
    sources = [zone for zone in zones if zone.get("waterSource")]
    base_regular = relevant_zones(collection, regular)
    if collection in MARINE_COLLECTIONS and water_source_parameter_allowed(parameter):
        return base_regular + sources
    return base_regular


def process_grib(path: pathlib.Path, collection: str, valid_time: str,
                 zones: list[dict[str, Any]], output: dict[str, Any], diagnostics: dict[str, Any]) -> tuple[set[str], set[str], bool, int, int]:
    found, touched = set(), set()
    vector_candidates: dict[tuple[str, str], dict[str, list[dict[str, Any]]]] = {}
    inventory = diagnostics.setdefault("gribFieldInventory", {}).setdefault(collection, {})
    persistent_inventory = diagnostics.setdefault("persistentFieldInventory", {}).setdefault(collection, {
        "capturedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "parserVersion": PARSER_VERSION,
        "fields": {},
    })
    persistent_inventory["capturedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    persistent_inventory["parserVersion"] = PARSER_VERSION
    persistent_fields = persistent_inventory.setdefault("fields", {})
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
                if sig_key not in inventory and len(inventory) < 120:
                    inventory[sig_key] = {**sig, "messagesSeen": 1}
                elif sig_key in inventory:
                    inventory[sig_key]["messagesSeen"] = int(inventory[sig_key].get("messagesSeen") or 0) + 1
                if sig_key not in persistent_fields and len(persistent_fields) < 240:
                    persistent_fields[sig_key] = {**sig, "messagesSeen": 1}
                elif sig_key in persistent_fields:
                    persistent_fields[sig_key]["messagesSeen"] = int(persistent_fields[sig_key].get("messagesSeen") or 0) + 1
                parameter = classify_parameter(gid, collection)
                if not parameter:
                    continue
                found.add(parameter)
                wanted = parameter_zones(collection, parameter, zones)
                zone_lookups += len(wanted)
                if parameter in VECTOR_PAIRS:
                    candidates = valid_candidates_batch(gid, collection, wanted)
                    diagnostics["batchedGridReads"] = int(diagnostics.get("batchedGridReads") or 0) + 1
                    family, first_key, second_key = VECTOR_PAIRS[parameter]
                    for zone in wanted:
                        zone_candidates = candidates.get(zone["id"]) or []
                        cache = vector_candidates.setdefault((family, zone["id"]), {})
                        cache[parameter] = zone_candidates
                        if first_key not in cache or second_key not in cache:
                            continue
                        pair = select_common_vector_candidate(cache[first_key], cache[second_key])
                        if not pair:
                            if family == "current":
                                search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                                    "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                                })
                                search["rejectedReason"] = "NO_SHARED_UV_GRID_POINT"
                            continue
                        first, second = pair
                        distance = max(float(first["distanceKm"]), float(second["distanceKm"]))
                        point = output["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                        if family == "current":
                            search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                                "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                            })
                            search["candidatesExamined"] = max(int(search.get("candidatesExamined") or 0), len(cache[first_key]), len(cache[second_key]))
                            old_distance = search.get("nearestValidDistanceKm")
                            search["nearestValidDistanceKm"] = round(distance if old_distance is None else min(float(old_distance), distance), 3)
                            for key in (first_key, second_key):
                                if key not in search["parametersFound"]:
                                    search["parametersFound"].append(key)
                            if distance > MAX_GRID_DISTANCE_KM.get(zone.get("coastType") or "east", 32.0):
                                search["rejectedReason"] = "VALID_POINT_TOO_FAR"
                                continue
                            if not accept_marine_collection(point, zone, collection, distance):
                                search["rejectedReason"] = "BETTER_COLLECTION_SELECTED"
                                continue
                            search["selected"] = True
                            search.pop("rejectedReason", None)
                        touched.add(zone["id"])
                        hour = point["hourly"].setdefault(valid_time, {"time": valid_time})
                        for key, candidate in ((first_key, first), (second_key, second)):
                            hour[key] = candidate["value"]
                            point["gridPoints"][key] = {k: round(v, 5) for k, v in candidate.items() if k not in {"value", "index"}}
                            point["collections"][key] = collection
                    continue

                resolved = nearest_valid_batch(gid, collection, wanted)
                diagnostics["batchedGridReads"] = int(diagnostics.get("batchedGridReads") or 0) + 1
                for zone in wanted:
                    nearest = resolved.get(zone["id"])
                    if not nearest:
                        continue
                    point = output["zones"].setdefault(zone["id"], {"hourly": {}, "gridPoints": {}, "collections": {}})
                    if collection in MARINE_COLLECTIONS and parameter in MARINE_PARAMETERS:
                        search = diagnostics.setdefault("marineGridSearch", {}).setdefault(zone["id"], {}).setdefault(collection, {
                            "candidatesExamined": 0, "nearestValidDistanceKm": None, "parametersFound": []
                        })
                        search["candidatesExamined"] = max(int(search.get("candidatesExamined") or 0), len(nearest_candidates(gid, collection, zone)))
                        old_distance = search.get("nearestValidDistanceKm")
                        distance = float(nearest["distanceKm"])
                        search["nearestValidDistanceKm"] = round(distance if old_distance is None else min(float(old_distance), distance), 3)
                        if parameter not in search["parametersFound"]:
                            search["parametersFound"].append(parameter)
                        if distance > MAX_GRID_DISTANCE_KM.get(zone.get("coastType") or "east", 32.0):
                            search["rejectedReason"] = "VALID_POINT_TOO_FAR"
                            continue
                        if not accept_marine_collection(point, zone, collection, distance):
                            search["rejectedReason"] = "BETTER_COLLECTION_SELECTED"
                            continue
                        search["selected"] = True
                    touched.add(zone["id"])
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


def collection_schedule(previous: dict[str, Any], active_zone_ids: list[str]) -> tuple[list[str], dict[str, Any]]:
    """Planlæg collections ud fra det aktuelle aktive zoneregister.

    Cache må aldrig definere nævneren: nye aktive zoner skal tælle som manglende,
    og udgåede cachezoner må ikke holde en familie kunstigt komplet. Marine er
    fortsat release-kritisk og rangeres først under recovery. Når alle aktive
    zoner har mindst noget gyldigt marinegrundlag, må en helt udsultet vind-
    eller bølgefamilie få andenpladsen, så femdøgnshorisonten kan bygges op.
    """
    state = previous.get("collectionState") or {}
    now = time.time()
    active_ids = list(dict.fromkeys(str(zone_id) for zone_id in active_zone_ids if zone_id and not str(zone_id).startswith("SOURCE::")))
    active_zones = {zone_id: (previous.get("zones") or {}).get(zone_id, {}) for zone_id in active_ids}
    zone_count = max(1, len(active_ids))
    coverage = {
        "wind": coverage_summary(active_zones, ("wind-speed-10m",)),
        "wave": coverage_summary(active_zones, ("significant-wave-height",)),
        "marine": coverage_summary(active_zones, ("sea-mean-deviation", "current-u", "current-v")),
    }
    complete96 = {family: int(details.get("zonesWith96Hours") or 0) for family, details in coverage.items()}
    any_data = {family: int(details.get("zonesWithAnyData") or 0) for family, details in coverage.items()}
    missing96 = {family: max(0, zone_count - complete96[family]) for family in ("wind", "wave", "marine")}
    missing_any = {family: max(0, zone_count - any_data[family]) for family in ("wind", "wave", "marine")}
    marine_recovery_active = missing96["marine"] > 0
    marine_foundation_missing = missing_any["marine"] > 0

    def priority(collection: str) -> tuple[int, int, int, int, float, float, int]:
        entry = state.get(collection) or {}
        blocked_parser_version = int(entry.get("blockedParserVersion") or 0)
        parser_block_obsolete = entry.get("failureClass") == "parser-blocked" and blocked_parser_version != PARSER_VERSION
        retry_after = epoch(entry.get("nextEligibleAt"))
        blocked = 0 if parser_block_obsolete else (1 if retry_after > now else 0)
        if parser_block_obsolete:
            entry["nextEligibleAt"] = None
            entry["failureClass"] = None
            entry["blockedParserVersion"] = None
            entry["consecutiveFailures"] = 0

        family = COLLECTION_FAMILY[collection]
        # Mangler en aktiv zone helt marinegrundlag, er DKSS ubetinget først.
        if marine_foundation_missing:
            family_rank = 0 if family == "marine" else 1
        elif marine_recovery_active:
            # Marine beholder førstepladsen, men en helt udsultet familie får
            # næste prioritet, så vind/bølger ikke kan sulte på ubestemt tid.
            if family == "marine":
                family_rank = 0
            elif any_data.get(family, 0) == 0:
                family_rank = 1
            else:
                family_rank = 2
        else:
            family_rank = 0
        deficit_rank = -missing96.get(family, 0)
        complete_family_rank = 1 if missing96.get(family, 0) == 0 else 0
        return (
            blocked, family_rank, complete_family_rank, deficit_rank,
            epoch(entry.get("lastAttemptAt")), epoch(entry.get("lastSuccessfulAt")),
            COLLECTION_ORDER.index(collection),
        )

    diagnostics = {
        "zoneCount": zone_count,
        "wind": complete96["wind"], "wave": complete96["wave"], "marine": complete96["marine"],
        "windHorizon": coverage["wind"], "waveHorizon": coverage["wave"], "marineHorizon": coverage["marine"],
        "missingWind": missing96["wind"], "missingWave": missing96["wave"], "missingMarine": missing96["marine"],
        "missingAnyWind": missing_any["wind"], "missingAnyWave": missing_any["wave"], "missingAnyMarine": missing_any["marine"],
        "marineRecoveryActive": marine_recovery_active,
        "marineFoundationMissing": marine_foundation_missing,
        "atmosphereDeferredDuringMarineRecovery": marine_foundation_missing,
        "completionDefinition": f"component horizon >= {COMPLETE_HORIZON_HOURS} hours",
        "coverageDenominator": "current-active-zone-registry",
    }
    return sorted(COLLECTION_ORDER, key=priority), diagnostics


def component_horizon_hours(zone: dict[str, Any], required: tuple[str, ...], now_epoch: float | None = None) -> float:
    now_value = time.time() if now_epoch is None else now_epoch
    valid_times = [epoch(valid) for valid, hour in (zone.get("hourly") or {}).items()
                   if epoch(valid) >= now_value - 3600 and all(key in hour for key in required)]
    return max(0.0, (max(valid_times) - now_value) / 3600.0) if valid_times else 0.0


def coverage_summary(zones: dict[str, Any], required: tuple[str, ...]) -> dict[str, Any]:
    now_value = time.time()
    horizons = [component_horizon_hours(zone, required, now_value) for zone in zones.values()]
    return {
        "zonesWithAnyData": sum(1 for value in horizons if value > 0),
        "zonesWith24Hours": sum(1 for value in horizons if value >= 24),
        "zonesWith96Hours": sum(1 for value in horizons if value >= COMPLETE_HORIZON_HOURS),
        "averageHours": round(sum(horizons) / len(horizons), 1) if horizons else 0,
        "minimumHours": round(min(horizons), 1) if horizons else 0,
        "maximumHours": round(max(horizons), 1) if horizons else 0,
        "requiredHorizonHours": COMPLETE_HORIZON_HOURS,
    }


def sanitize_vector_integrity(zone: dict[str, Any]) -> list[str]:
    """Fjern gamle/partielle vektorer der ikke kan bevises at dele gitterpunkt."""
    removed = []
    for first_key, second_key in (("current-u", "current-v"), ("wind-u-10m", "wind-v-10m")):
        first_point = (zone.get("gridPoints") or {}).get(first_key)
        second_point = (zone.get("gridPoints") or {}).get(second_key)
        has_any = first_point is not None or second_point is not None
        if not has_any:
            continue
        if same_grid_point(first_point, second_point):
            continue
        for hour in (zone.get("hourly") or {}).values():
            hour.pop(first_key, None)
            hour.pop(second_key, None)
            if first_key.startswith("wind-"):
                hour.pop("wind-speed-10m", None)
                hour.pop("wind-dir-10m", None)
        for key in (first_key, second_key):
            (zone.get("gridPoints") or {}).pop(key, None)
            (zone.get("collections") or {}).pop(key, None)
        removed.append(f"{first_key}/{second_key}")
    return removed


def clean_and_summarize(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int]) -> None:
    cutoff, horizon = time.time() - 6 * 3600, time.time() + (HOURS + 6) * 3600
    invalidated_vectors = {}
    for zone_id, zone in result["zones"].items():
        removed = sanitize_vector_integrity(zone)
        if removed:
            invalidated_vectors[zone_id] = removed
        cleaned = {}
        for valid, hour in zone.get("hourly", {}).items():
            if cutoff <= epoch(valid) <= horizon:
                wind_from_uv(hour)
                cleaned[valid] = hour
        zone["hourly"] = dict(sorted(cleaned.items(), key=lambda row: epoch(row[0])))
    result["zones"] = {k: v for k, v in result["zones"].items() if v.get("hourly")}
    diag = result["diagnostics"]
    diag["invalidatedMismatchedVectors"] = invalidated_vectors
    diag["downloadedBytes"] = budget["bytes"]
    diag["freshZoneCount"] = len(fresh_zone_ids)
    production_zones = {zone_id: zone for zone_id, zone in result["zones"].items() if not zone_id.startswith("SOURCE::")}
    diag["zoneCount"] = len(production_zones)
    diag["waterSourceCount"] = sum(1 for zone_id in result["zones"] if zone_id.startswith("SOURCE::"))
    component_coverage = {
        "wind": coverage_summary(production_zones, ("wind-speed-10m",)),
        "wave": coverage_summary(production_zones, ("significant-wave-height",)),
        "marine": coverage_summary(production_zones, ("sea-mean-deviation", "current-u", "current-v")),
    }
    diag["componentHorizonCoverage"] = component_coverage
    # Backwards-compatible names now mean sufficient forecast horizon, not merely one value.
    diag["completeMarineZones"] = component_coverage["marine"]["zonesWith96Hours"]
    diag["completeWindZones"] = component_coverage["wind"]["zonesWith96Hours"]
    diag["completeWaveZones"] = component_coverage["wave"]["zonesWith96Hours"]



def build_ocean_diagnostics(result: dict[str, Any]) -> dict[str, Any]:
    marine_collections = ["dkss_idw", "dkss_nsbs", "dkss_lf"]
    parameter_keys = ["sea-mean-deviation", "current-u", "current-v", "water-temperature"]
    all_zones = result.get("zones") or {}
    zones = {zone_id: zone for zone_id, zone in all_zones.items() if not str(zone_id).startswith("SOURCE::")}
    per_parameter = {}
    for key in parameter_keys:
        zone_count = 0
        value_count = 0
        min_value = None
        max_value = None
        for zone in zones.values():
            zone_has = False
            for hour in (zone.get("hourly") or {}).values():
                value = hour.get(key)
                if isinstance(value, (int, float)) and math.isfinite(float(value)):
                    number = float(value)
                    value_count += 1
                    zone_has = True
                    min_value = number if min_value is None else min(min_value, number)
                    max_value = number if max_value is None else max(max_value, number)
            if zone_has:
                zone_count += 1
        per_parameter[key] = {
            "zonesPopulated": zone_count,
            "finiteValues": value_count,
            "minimum": min_value,
            "maximum": max_value,
        }

    collection_details = {}
    diagnostics = result.get("diagnostics") or {}
    for collection in marine_collections:
        state = (result.get("collectionState") or {}).get(collection) or {}
        run = (result.get("runs") or {}).get(collection) or {}
        inventory = (diagnostics.get("gribFieldInventory") or {}).get(collection) or {}
        recognized = (diagnostics.get("parametersByCollection") or {}).get(collection) or run.get("recognizedParameters") or []
        collection_details[collection] = {
            "scheduledThisRun": collection in (diagnostics.get("scheduledCollections") or []),
            "attemptedThisRun": collection in (diagnostics.get("collectionsAttempted") or []),
            "succeededThisRun": collection in ((diagnostics.get("collectionsSucceeded") or []) + (diagnostics.get("collectionsUnchanged") or [])),
            "partialThisRun": collection in (diagnostics.get("collectionsPartial") or []),
            "referenceTime": run.get("referenceTime"),
            "assetsDiscovered": run.get("assetsDiscovered", 0),
            "assetsProcessed": run.get("assetsProcessed", 0),
            "assetsReused": run.get("assetsReused", 0),
            "assetsSkippedPreviouslyProcessed": run.get("assetsSkippedPreviouslyProcessed", 0),
            "healthState": ("fresh" if collection in (diagnostics.get("collectionsSucceeded") or []) else "unchanged-valid" if collection in (diagnostics.get("collectionsUnchanged") or []) else "partial" if collection in (diagnostics.get("collectionsPartial") or []) else "failed" if state.get("lastError") else "not-run"),
            "recognizedParameters": recognized,
            "requiredParameters": TARGETS["marine"],
            "missingParameters": [key for key in TARGETS["marine"] if key not in recognized],
            "inventoryMessageTypes": len(inventory),
            "lastSuccessfulAt": state.get("lastSuccessfulAt"),
            "lastPartialAt": state.get("lastPartialAt"),
            "lastError": state.get("lastError"),
            "nextEligibleAt": state.get("nextEligibleAt"),
        }

    marine_errors = [error for error in (diagnostics.get("errors") or []) if error.get("collection") in marine_collections]
    complete_current = per_parameter["current-u"]["zonesPopulated"] and per_parameter["current-v"]["zonesPopulated"]
    complete_marine_ids = {
        zone_id for zone_id, zone in zones.items()
        if any(all(key in hour for key in ("sea-mean-deviation", "current-u", "current-v")) for hour in (zone.get("hourly") or {}).values())
    }
    fresh_marine_ids = set(diagnostics.get("freshMarineZoneIds") or []) & complete_marine_ids
    preserved_marine_ids = complete_marine_ids - fresh_marine_ids
    grid_search = diagnostics.get("marineGridSearch") or {}
    missing_zone_reasons = {}
    for zone_id in sorted(set(grid_search) | set(zones)):
        if zone_id in complete_marine_ids:
            continue
        attempts = grid_search.get(zone_id) or {}
        parameter_union = set()
        nearest = None
        for details in attempts.values():
            parameter_union.update(details.get("parametersFound") or [])
            distance = details.get("nearestValidDistanceKm")
            if distance is not None:
                nearest = float(distance) if nearest is None else min(nearest, float(distance))
        missing = sorted(REQUIRED_TARGETS["marine"] - parameter_union)
        if not attempts:
            reason = "PRIMARY_COLLECTION_NO_COVERAGE"
        elif all(details.get("rejectedReason") == "VALID_POINT_TOO_FAR" for details in attempts.values() if details):
            reason = "VALID_POINT_TOO_FAR"
        elif missing:
            reason = "MISSING_" + "_AND_".join(key.upper().replace("-", "_") for key in missing)
        else:
            reason = "NO_VALID_GRID_POINT"
        missing_zone_reasons[zone_id] = {
            "reason": reason, "collectionsTried": sorted(attempts),
            "nearestValidDistanceKm": nearest, "missingParameters": missing, "attempts": attempts,
        }
    return {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "bulkCacheGeneratedAt": result.get("generatedAt"),
        "refreshStatus": result.get("refreshStatus"),
        "method": result.get("method"),
        "summary": {
            "zonesInBulkCache": len(zones),
            "waterLevelZones": per_parameter["sea-mean-deviation"]["zonesPopulated"],
            "currentUZones": per_parameter["current-u"]["zonesPopulated"],
            "currentVZones": per_parameter["current-v"]["zonesPopulated"],
            "currentVectorAvailable": bool(complete_current),
            "waterTemperatureZones": per_parameter["water-temperature"]["zonesPopulated"],
            "marineErrors": len(marine_errors),
            "freshMarineZones": len(fresh_marine_ids),
            "preservedMarineZones": len(preserved_marine_ids),
            "fallbackOrMissingMarineZones": len(missing_zone_reasons),
        },
        "parameters": per_parameter,
        "collections": collection_details,
        "errors": marine_errors,
        "missingZones": missing_zone_reasons,
        "modelSelections": {zone_id: zone.get("marineSelection") for zone_id, zone in zones.items() if zone.get("marineSelection")},
        "pipelineCounters": {
            "messagesSeen": diagnostics.get("messagesSeen", 0),
            "zoneLookups": diagnostics.get("zoneLookups", 0),
            "downloadedBytes": diagnostics.get("downloadedBytes", 0),
            "freshZoneCount": diagnostics.get("freshZoneCount", 0),
            "freshMarineZones": len(fresh_marine_ids),
            "preservedMarineZones": len(preserved_marine_ids),
        },
    }


def write_ocean_diagnostics(result: dict[str, Any]) -> None:
    report = build_ocean_diagnostics(result)
    DIAGNOSTICS_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    DIAGNOSTICS_JSON_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")
    lines = [
        "RavRadar DMI ocean diagnostics",
        f"Generated: {report['generatedAt']}",
        f"Bulk status: {report.get('refreshStatus')}",
        f"Zones in bulk cache: {report['summary']['zonesInBulkCache']}",
        f"Water-level zones: {report['summary']['waterLevelZones']}",
        f"Current U zones: {report['summary']['currentUZones']}",
        f"Current V zones: {report['summary']['currentVZones']}",
        f"Water-temperature zones: {report['summary']['waterTemperatureZones']}",
        f"Fresh marine zones this run: {report['summary']['freshMarineZones']}",
        f"Preserved marine zones: {report['summary']['preservedMarineZones']}",
        f"Fallback/missing marine zones: {report['summary']['fallbackOrMissingMarineZones']}",
        "",
        "Collections:",
    ]
    for name, details in report["collections"].items():
        missing = ", ".join(details["missingParameters"]) or "none"
        lines.append(f"- {name}: attempted={details['attemptedThisRun']} health={details.get('healthState')} success={details['succeededThisRun']} partial={details['partialThisRun']} assets={details['assetsProcessed']}/{details['assetsDiscovered']} reused={details.get('assetsReused', 0)} skipped={details.get('assetsSkippedPreviouslyProcessed', 0)} missing={missing} error={details['lastError'] or 'none'}")
    if report["errors"]:
        lines.extend(["", "Errors:"])
        lines.extend(f"- {item.get('collection')}: {item.get('message')}" for item in report["errors"])
    DIAGNOSTICS_TEXT_PATH.write_text("\n".join(lines) + "\n", "utf-8")


def write_checkpoint(result: dict[str, Any], fresh_zone_ids: set[str], budget: dict[str, int], status: str = "partial") -> None:
    result["refreshStatus"] = status
    result["checkpointedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    clean_and_summarize(result, fresh_zone_ids, budget)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUTPUT_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    tmp.replace(OUTPUT_PATH)
    write_ocean_diagnostics(result)


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



def write_step_summary(result: dict[str, Any], scheduled: list[str], diag: dict[str, Any], budget: dict[str, int], fresh_successes: int, fresh_partials: int) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    try:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write(f"- Status: **{result.get('refreshStatus', 'unknown')}**\n")
            handle.write(f"- Planlagte samlinger: **{', '.join(scheduled or [])}**\n")
            handle.write(f"- Fuld/delvis succes: **{fresh_successes}/{fresh_partials}**\n")
            handle.write(f"- Zoner i cache: **{len(result.get('zones') or {})}**\n")
            handle.write(f"- Downloadet denne kørsel: **{budget.get('bytes', 0)} bytes**\n")
            ocean = build_ocean_diagnostics(result)["summary"]
            handle.write(f"- Ocean-dækning: vandstand **{ocean['waterLevelZones']}** zoner, strøm-U/V **{ocean['currentUZones']}/{ocean['currentVZones']}**, temperatur **{ocean['waterTemperatureZones']}**\n")
            handle.write("- Diagnostik: `data/diagnostics/dmi-ocean-diagnostics.json` og `data/diagnostics/dmi-ocean-summary.txt`\n")
            if diag.get("errors"):
                handle.write("- Bemærkninger: " + "; ".join(f"{e.get('collection')}: {e.get('message')}" for e in diag["errors"]) + "\n")
    except Exception as exc:
        print(f"Kunne ikke skrive GitHub-stepoversigt: {exc}", file=sys.stderr, flush=True)

def write_failure_summary(error: Exception) -> None:
    summary_path = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as handle:
            handle.write("## DMI bulk refresh\n\n")
            handle.write("- Status: **failed**\n")
            handle.write(f"- Opstartsfejl: `{str(error)[:500]}`\n")


def main() -> int:
    progress(f"starter; arbejdsbudget={MAX_RUNTIME_SECONDS - FINALIZE_RESERVE_SECONDS}s, afslutningsreserve={FINALIZE_RESERVE_SECONDS}s")
    cache_before = raw_cache_inventory()
    previous = load_previous()
    signature_bytes = ZONES_PATH.read_bytes() + (WATER_SOURCES_PATH.read_bytes() if WATER_SOURCES_PATH.exists() else b'')
    current_zone_registry_signature = hashlib.sha256(signature_bytes).hexdigest()[:16]
    previous_zone_registry_signature = previous.get("zoneRegistrySignature")
    zone_registry_unchanged = previous_zone_registry_signature == current_zone_registry_signature
    previous_generated = epoch(previous.get("generatedAt"))
    previous_diag = previous.get("diagnostics") or {}
    previous_ocean = build_ocean_diagnostics(previous)["summary"] if previous.get("zones") else {}
    previous_marine_errors = [
        error for error in (previous_diag.get("errors") or [])
        if str(error.get("collection", "")).startswith("dkss_")
    ]
    previous_refresh_status = str(previous.get("refreshStatus") or "").lower()
    horizon_coverage = previous_diag.get("componentHorizonCoverage") or {}
    previous_zone_count = max(1, int(previous_diag.get("zoneCount") or len(previous.get("zones") or {}) or 1))
    wind_horizon_healthy = int((horizon_coverage.get("wind") or {}).get("zonesWith96Hours") or 0) >= previous_zone_count
    marine_horizon_healthy = int((horizon_coverage.get("marine") or {}).get("zonesWith96Hours") or 0) >= previous_zone_count
    marine_cache_healthy = (
        int(previous_ocean.get("waterLevelZones") or 0) > 0
        and int(previous_ocean.get("currentUZones") or 0) > 0
        and int(previous_ocean.get("currentVZones") or 0) > 0
        and marine_horizon_healthy
        and wind_horizon_healthy
        and not previous_marine_errors
        and previous_refresh_status not in {"failed", "partial"}
    )
    if (
        not FORCE_REFRESH
        and previous_generated
        and previous.get("zones")
        and time.time() - previous_generated < REFRESH_MINUTES * 60
        and marine_cache_healthy
        and zone_registry_unchanged
    ):
        # Kun en både tidsmæssigt frisk og funktionelt sund marine-cache genbruges.
        # En nylig parserfejl må aldrig blokere et nyt DKSS-forsøg efter en kodeopdatering.
        previous.setdefault("refreshStatus", "fresh-bulk-cache")
        previous.setdefault("diagnostics", {})
        write_ocean_diagnostics(previous)
        ocean = build_ocean_diagnostics(previous)["summary"]
        write_github_outputs(
            "fresh-bulk-cache",
            zone_count=len(previous.get("zones") or {}),
            downloaded_bytes=0,
        )
        if os.getenv("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as h:
                h.write("## DMI bulk refresh\n\n")
                h.write("- Status: **fresh bulk-cache genbrugt**\n")
                h.write(f"- Zoner i cache: **{len(previous.get('zones') or {})}**\n")
                h.write(f"- Ocean-dækning: vandstand **{ocean['waterLevelZones']}** zoner, strøm-U/V **{ocean['currentUZones']}/{ocean['currentVZones']}**, temperatur **{ocean['waterTemperatureZones']}**\n")
                h.write("- Diagnostik blev regenereret fra den hydratiserede cache.\n")
        print(json.dumps({
            "skipped": "fresh-bulk-cache",
            "zoneCount": len(previous.get("zones") or {}),
            "generatedAt": previous.get("generatedAt"),
            "diagnosticsRegenerated": True,
            "ocean": ocean,
        }, ensure_ascii=False))
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

    # Vandstandskilder (målestationer og DMI-prognosepunkter) samples i samme
    # DKSS-GRIB som zonerne. Dermed får begge kildetyper sammenlignelige
    # femdøgnsserier uden et stort antal ForecastEDR-kald.
    if WATER_SOURCES_PATH.exists():
        try:
            source_doc = json.loads(WATER_SOURCES_PATH.read_text("utf-8"))
            zone_points = list(zones)
            for source in source_doc.get("stations", []):
                coords = source.get("point")
                source_key = source.get("sourceKey")
                if not source_key or not isinstance(coords, list) or len(coords) != 2:
                    continue
                lon, lat = float(coords[0]), float(coords[1])
                nearest = min(zone_points, key=lambda z: (z["lon"]-lon)**2 + (z["lat"]-lat)**2) if zone_points else None
                zones.append({"id": f"SOURCE::{source_key}", "lon": lon, "lat": lat, "coastType": (nearest or {}).get("coastType", "east"), "waterSource": True})
        except Exception as exc:
            print(f"Advarsel: vandstandskilder kunne ikke føjes til bulk-grid: {exc}", file=sys.stderr)

    generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    result = {"schemaVersion": 2, "generatedAt": generated,
              "sourceUpdatedAt": previous.get("sourceUpdatedAt") or previous.get("generatedAt"),
              "method": f"DMI STAC forecast-step GRIB inventory; collection-specific field extraction; multi-candidate nearest valid grid point with shared-grid U/V vector pairing and marine collection overlap; {TIME_STRIDE_HOURS}h model stride; no spatial interpolation",
              "hours": HOURS, "timeStrideHours": TIME_STRIDE_HOURS, "zoneRegistrySignature": current_zone_registry_signature, "zones": {}, "runs": {},
              "collectionState": dict(previous.get("collectionState") or {}),
              "diagnostics": {"collectionsAttempted": [], "collectionsSucceeded": [], "collectionsPartial": [], "errors": [],
                              "downloadedBytes": 0, "reusedAssets": 0, "parametersByCollection": {}, "stacByCollection": {},
                              "assetsSkippedPreviouslyProcessed": 0, "assetsRetriedIncomplete": 0, "zeroProgressCollections": [], "collectionsUnchanged": [], "messagesSeen": 0, "zoneLookups": 0, "batchedGridReads": 0, "marineGridSearch": {},
                              "runtimeBudgetSeconds": MAX_RUNTIME_SECONDS, "finalizeReserveSeconds": FINALIZE_RESERVE_SECONDS,
                              "persistentFieldInventory": dict(((previous.get("diagnostics") or {}).get("persistentFieldInventory") or {}))}}
    merge_previous(result, previous)
    budget = {"bytes": 0}
    active_zone_ids = [zone["id"] for zone in zones if not zone.get("waterSource")]
    scheduled, schedule_coverage = collection_schedule(previous, active_zone_ids)
    result["diagnostics"]["scheduledCollections"] = scheduled
    result["diagnostics"]["scheduleCoverageBeforeRun"] = schedule_coverage
    fresh_zone_ids: set[str] = set()
    fresh_marine_zone_ids: set[str] = set()
    productive_collections = 0

    for collection in scheduled:
        if productive_collections >= COLLECTIONS_PER_RUN:
            break
        if should_stop_work():
            result["diagnostics"]["errors"].append({"collection": collection, "message": "bulk runtime budget reached"})
            break
        result["diagnostics"]["collectionsAttempted"].append(collection)
        collection_start_bytes = budget["bytes"]
        collection_start_reused = int(result["diagnostics"].get("reusedAssets") or 0)
        state = result["collectionState"].setdefault(collection, {})
        state["lastAttemptAt"] = generated
        try:
            run, assets, stac_stats = list_latest_assets(collection)
            result["diagnostics"]["stacByCollection"][collection] = stac_stats
            if not assets:
                raise RuntimeError("no forecast-step GRIB assets found in latest STAC run")
            previous_run = (previous.get("runs") or {}).get(collection) or {}
            zone_registry_signature = current_zone_registry_signature
            processing_signature = f"parser:{PARSER_VERSION}|params:{PARAMETER_MAP_VERSION}|grid:{GRID_LOOKUP_VERSION}|zones:{zone_registry_signature}"
            same_processing = previous_run.get("processingSignature") == processing_signature
            same_run = previous_run.get("referenceTime") == run
            previous_steps = dict(previous_run.get("processedSteps") or {}) if same_processing and same_run else {}
            required_for_family = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
            previously_processed = {
                valid for valid, step in previous_steps.items()
                if step.get("complete") is True
                and set(step.get("recognizedParameters") or []) >= required_for_family
                and int(step.get("zonesTouched") or 0) > 0
            }
            result["diagnostics"]["assetsRetriedIncomplete"] += max(0, len(previous_steps) - len(previously_processed))
            run_info = {"referenceTime": run, "parserVersion": PARSER_VERSION,
                        "parameterMapVersion": PARAMETER_MAP_VERSION, "gridLookupVersion": GRID_LOOKUP_VERSION,
                        "processingSignature": processing_signature,
                        "assetsDiscovered": len(assets), "assetsProcessed": 0, "assetsReused": 0,
                        "assetsSkippedPreviouslyProcessed": 0, "processedValidTimes": sorted(previously_processed),
                        "processedSteps": previous_steps, "recognizedParameters": []}
            result["runs"][collection] = run_info
            recognized: set[str] = set()
            for previous_step in (run_info.get("processedSteps") or {}).values():
                if previous_step.get("complete"):
                    recognized.update(previous_step.get("recognizedParameters") or [])
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
                required_for_family = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
                step_recognized = sorted(set(found) & set(TARGETS[COLLECTION_FAMILY[collection]]))
                step_complete = set(step_recognized) >= required_for_family and len(touched) > 0
                if not interrupted and step_complete:
                    run_info["assetsProcessed"] += 1
                    previously_processed.add(asset["valid"])
                    run_info["processedValidTimes"] = sorted(previously_processed, key=epoch)
                elif not interrupted:
                    previously_processed.discard(asset["valid"])
                    run_info["processedValidTimes"] = sorted(previously_processed, key=epoch)
                if not interrupted:
                    run_info["processedSteps"][asset["valid"]] = {
                        "recognizedParameters": step_recognized,
                        "requiredParameters": sorted(required_for_family),
                        "missingRequiredParameters": sorted(required_for_family - set(step_recognized)),
                        "zonesTouched": len(touched),
                        "complete": step_complete,
                        "parserVersion": PARSER_VERSION,
                        "processingSignature": processing_signature
                    }
                fresh_zone_ids.update(touched)
                if collection in MARINE_COLLECTIONS:
                    fresh_marine_zone_ids.update(touched)
                write_checkpoint(result, fresh_zone_ids, budget, "partial")
                progress(f"{collection}: checkpoint gemt; steps={run_info['assetsProcessed']}, felter={sorted(recognized)}, resterende={runtime_remaining():.0f}s")
                if interrupted:
                    budget_stop = "bulk runtime budget reached inside GRIB processing"
                    break
            result["diagnostics"]["parametersByCollection"][collection] = sorted(recognized)
            run_info["recognizedParameters"] = sorted(recognized)
            required = REQUIRED_TARGETS[COLLECTION_FAMILY[collection]]
            made_progress = (run_info["assetsProcessed"] > 0 or int(result["diagnostics"].get("reusedAssets") or 0) > collection_start_reused or budget["bytes"] > collection_start_bytes)
            if not made_progress and recognized >= required and run_info["assetsSkippedPreviouslyProcessed"] == len(assets):
                state["lastCheckedAt"] = generated
                state["referenceTime"] = run
                state["lastError"] = None
                result["diagnostics"]["collectionsUnchanged"].append(collection)
                result["diagnostics"]["zeroProgressCollections"].append(collection)
            elif recognized >= required and run_info["assetsProcessed"]:
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
            if made_progress:
                productive_collections += 1
            if budget_stop:
                result["diagnostics"]["errors"].append({"collection": collection, "message": budget_stop, "partialProgressPreserved": True})
        except Exception as exc:
            message = str(exc)
            failures = int(state.get("consecutiveFailures") or 0) + 1
            parser_blocked = "no required RavRadar parameters" in message
            parser_exception = isinstance(exc, (KeyError, TypeError, IndexError, AttributeError))
            failure_class = "parser-blocked" if parser_blocked else ("parser-exception" if parser_exception else "transient")
            delay_minutes = 24 * 60 if parser_blocked else (15 if parser_exception else min(180, 10 * (2 ** min(failures - 1, 4))))
            state["consecutiveFailures"] = failures
            state["lastError"] = message
            state["failureClass"] = failure_class
            state["blockedParserVersion"] = PARSER_VERSION if (parser_blocked or parser_exception) else None
            state["nextEligibleAt"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace("+00:00", "Z")
            result["diagnostics"]["errors"].append({"collection": collection, "message": message, "failureClass": state["failureClass"], "retryAfterMinutes": delay_minutes})

    result["diagnostics"]["freshMarineZoneIds"] = sorted(fresh_marine_zone_ids)
    clean_and_summarize(result, fresh_zone_ids, budget)
    diag = result["diagnostics"]
    fresh_successes, fresh_partials = len(diag["collectionsSucceeded"]), len(diag["collectionsPartial"])
    if fresh_successes or fresh_partials:
        result["sourceUpdatedAt"] = generated
    result["refreshStatus"] = "ok" if productive_collections >= COLLECTIONS_PER_RUN and fresh_successes else ("partial" if fresh_successes or fresh_partials or result["diagnostics"]["zeroProgressCollections"] else "failed")

    write_checkpoint(result, fresh_zone_ids, budget, result["refreshStatus"])
    prune_stats = prune_raw_cache()
    cache_after = raw_cache_inventory()
    write_cache_audit(cache_before, cache_after, prune_stats["removedFiles"], prune_stats["removedBytes"])
    result["diagnostics"]["rawCache"] = {"before": cache_before, "after": cache_after, **prune_stats, "maxBytes": RAW_CACHE_MAX_BYTES}
    summary = {**diag, "refreshStatus": result["refreshStatus"], "sourceUpdatedAt": result.get("sourceUpdatedAt"),
               "preservedPreviousZones": max(0, len(result["zones"]) - len(fresh_zone_ids))}
    write_github_outputs(
        result["refreshStatus"], fresh_successes, fresh_partials,
        len(result["zones"]), budget["bytes"]
    )
    write_step_summary(result, scheduled, diag, budget, fresh_successes, fresh_partials)
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

# 4.0.29 diagnostics placeholders: zonesWithAnyData/zonesWith96Hours
