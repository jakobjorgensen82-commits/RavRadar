#!/usr/bin/env python3
"""Fetch bounded, non-production GeoDanmark source data for geometry-v2 pilots.

The Datafordeler key is read only from DATAFORDELER_API_KEY. It is deliberately
never written to a file, URL log, diagnostic, exception or artifact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
WFS_URL = "https://wfs.datafordeler.dk/GEODKV/GEODKV_WFS/1.0.0/WFS"
REQUIRED_LAYER = "Kyst"
OPTIONAL_LAYERS = ("Havn", "Vandloebskant", "Vandloebsmidte", "Hoefde", "SandKlit", "Skraent")
SAFE_TIMEOUT_SECONDS = 60


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(1)


def api_key():
    value = os.environ.get("DATAFORDELER_API_KEY", "").strip()
    if not value:
        fail("DATAFORDELER_API_KEY mangler; pilotfetch blev ikke forsøgt.")
    return value


def safe_get(params, key):
    try:
        response = requests.get(WFS_URL, params={**params, "apikey": key}, timeout=SAFE_TIMEOUT_SECONDS)
    except requests.RequestException:
        fail("Datafordeler-kaldet kunne ikke gennemføres; nøglen eller request-URL'en logges ikke.")
    if not response.ok:
        fail(f"Datafordeler afviste forespørgslen (HTTP {response.status_code}); nøglen eller request-URL'en logges ikke.")
    return response


def capability_layers(key):
    response = safe_get({"service": "WFS", "version": "2.0.0", "request": "GetCapabilities"}, key)
    try:
        root = ET.fromstring(response.content)
    except ET.ParseError:
        fail("Datafordeler returnerede ikke et gyldigt WFS-capabilities-dokument.")
    names = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] == "Name" and element.text:
            text = element.text.strip()
            if text and text not in names:
                names.append(text)
    if not names:
        fail("Datafordeler-capabilities indeholder ingen feature-lagnavne.")
    return names


def find_layer(available, desired):
    folded = desired.lower().replace("ø", "oe").replace("å", "aa")
    exact = [name for name in available if name.rsplit(":", 1)[-1].lower() == folded]
    if len(exact) == 1:
        return exact[0]
    suffix = [name for name in available if name.rsplit(":", 1)[-1].lower().endswith(folded)]
    return suffix[0] if len(suffix) == 1 else None


def lon_lat_bounds(feature_collection, zone_ids):
    selected = [
        feature for feature in feature_collection.get("features", [])
        if feature.get("properties", {}).get("zoneStatus") == "active"
        and feature.get("properties", {}).get("id") in zone_ids
    ]
    found = {feature.get("properties", {}).get("id") for feature in selected}
    missing = sorted(set(zone_ids) - found)
    if missing:
        fail("Pilotzoner mangler efter central hydrering: " + ", ".join(missing))
    points = []
    for feature in selected:
        geometry = feature.get("geometry") or {}
        for ring in geometry.get("coordinates", []):
            points.extend(ring)
    if not points:
        fail("Pilotzonernes polygoner mangler koordinater.")
    longitudes = [float(point[0]) for point in points]
    latitudes = [float(point[1]) for point in points]
    # A maximum 5 km buffer keeps the free source request bounded and auditable.
    margin_degrees = 0.05
    return [
        max(7.0, min(longitudes) - margin_degrees),
        max(54.0, min(latitudes) - margin_degrees),
        min(16.0, max(longitudes) + margin_degrees),
        min(58.5, max(latitudes) + margin_degrees),
    ]


def fetch_layer(layer_name, bounds, target, key):
    bbox = ",".join(f"{value:.6f}" for value in bounds) + ",EPSG:4326"
    response = safe_get({
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": layer_name,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",
        "bbox": bbox,
        "count": "50000",
    }, key)
    try:
        payload = response.json()
    except ValueError:
        fail(f"Datafordeler leverede ikke gyldig GeoJSON for laget {layer_name}.")
    if payload.get("type") != "FeatureCollection":
        fail(f"Datafordeler leverede ikke en FeatureCollection for laget {layer_name}.")
    encoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    target.write_bytes(encoded + b"\n")
    return {
        "layer": layer_name,
        "featureCount": len(payload.get("features") or []),
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "file": target.name,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zones", type=Path, default=ROOT / "data" / "zones.geojson")
    parser.add_argument("--pilot-areas", type=Path, default=ROOT / "data" / "geometry-v2" / "pilot-areas.json")
    parser.add_argument("--work-dir", type=Path, default=ROOT / ".geometry-v2-work")
    parser.add_argument("--report", type=Path, default=ROOT / "data" / "diagnostics" / "geodanmark-pilot-report.json")
    args = parser.parse_args()
    key = api_key()
    zones = json.loads(args.zones.read_text(encoding="utf-8"))
    areas = json.loads(args.pilot_areas.read_text(encoding="utf-8"))
    requested_areas = areas.get("areas") or []
    if not requested_areas:
        fail("Pilotmanifestet indeholder ingen pilotområder.")
    available = capability_layers(key)
    layers = {name: find_layer(available, name) for name in (REQUIRED_LAYER, *OPTIONAL_LAYERS)}
    if not layers[REQUIRED_LAYER]:
        fail("GeoDanmark WFS eksponerer ikke det krævede Kyst-lag for denne adgang.")
    work_dir = args.work_dir.resolve()
    if ROOT not in work_dir.parents:
        fail("Pilotens arbejdsmappe skal ligge i workspace.")
    work_dir.mkdir(parents=True, exist_ok=True)
    result_areas = []
    for area in requested_areas:
        area_id = str(area.get("id") or "")
        if not re.fullmatch(r"[a-z0-9-]+", area_id):
            fail("Pilotområdet mangler et sikkert id.")
        bounds = lon_lat_bounds(zones, area.get("zoneIds") or [])
        area_dir = work_dir / area_id
        area_dir.mkdir(parents=True, exist_ok=True)
        layer_results = []
        for desired, layer_name in layers.items():
            if not layer_name:
                layer_results.append({"requestedLayer": desired, "status": "not-exposed-by-source"})
                continue
            layer_results.append({
                "requestedLayer": desired,
                "status": "fetched",
                **fetch_layer(layer_name, bounds, area_dir / f"{desired}.geojson", key),
            })
        result_areas.append({"id": area_id, "boundsWgs84": bounds, "layers": layer_results})
    report = {
        "schemaVersion": "1.0.0",
        "status": "fetched-for-non-production-pilot",
        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "GeoDanmark Vektor WFS",
        "licence": "CC-BY-4.0",
        "costClass": "free-data-only",
        "sourceCrs": "EPSG:25832",
        "requestedOutputCrs": "EPSG:4326",
        "centralHydrationRequired": True,
        "availableLayerCount": len(available),
        "areas": result_areas,
        "secretHandling": "DATAFORDELER_API_KEY was read only from the process environment and was not persisted.",
    }
    report_target = args.report.resolve()
    if ROOT not in report_target.parents:
        fail("Pilotrapporten skal ligge i workspace.")
    report_target.parent.mkdir(parents=True, exist_ok=True)
    report_target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("GeoDanmark pilotdata hentet til privat workflow-arbejdsmappe; rapporten indeholder ingen secretværdi.")


if __name__ == "__main__":
    main()
