#!/usr/bin/env python3
"""Run the authenticated, private and score-neutral Copernicus current pilot."""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import copernicusmarine
import xarray as xr

from lib.copernicus_current import LOCAL_MAX_DISTANCE_KM, load_targets, nearest_shared_uv, safe_record, safe_shadow_summary, update_shadow, utc_iso


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGETS = ROOT / "data/live/coastal-parts-v2.json"
DEFAULT_SHADOW = ROOT / ".cache/copernicus-current-shadow.json"
DEFAULT_REPORT = ROOT / "data/diagnostics/copernicus-current-pilot.json"
DEFAULT_SUMMARY = ROOT / "data/diagnostics/copernicus-current-pilot.txt"

PRODUCTS = [
    {
        "source": "copernicus-baltic-nemo",
        "productId": "BALTICSEA_ANALYSISFORECAST_PHY_003_006",
        "datasetId": "cmems_mod_bal_phy_anfc_PT1H-i",
        "datasetVersion": "202411",
        "minimumLongitude": 9.041582107543945,
        "maximumLongitude": 30.208656311035156,
        "minimumLatitude": 53.008296966552734,
        "maximumLatitude": 65.8909912109375,
        "targetMinimumLongitude": 8.94,
        "targetMaximumLongitude": 16.0,
    },
    {
        "source": "copernicus-nws-amm15",
        "productId": "NWSHELF_ANALYSISFORECAST_PHY_004_013",
        "datasetId": "cmems_mod_nws_phy-cur_anfc_1.5km-3D_PT1H-i",
        "datasetVersion": "202511",
        "minimumLongitude": -16.0,
        "maximumLongitude": 13.0,
        "minimumLatitude": 46.0,
        "maximumLatitude": 62.74324035644531,
        # AMM15 masks the Baltic/Kattegat. Keep the pilot request bounded to
        # west-coast and western-Limfjord candidates instead of downloading a
        # dense rectangle across all of Denmark.
        "targetMinimumLongitude": 7.5,
        "targetMaximumLongitude": 9.5,
    },
]


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--shadow", type=Path, default=DEFAULT_SHADOW)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--at", help="UTC time to sample; defaults to the current hour")
    parser.add_argument("--fixture-directory", type=Path, help="Use local NetCDF fixtures and skip authentication/download")
    return parser.parse_args()


def selected_time(value: str | None) -> datetime:
    if value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        parsed = datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def eligible_targets(targets: list[dict[str, Any]], product: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        target for target in targets
        if product["targetMinimumLongitude"] <= target["waterPoint"][0] <= product["targetMaximumLongitude"]
        and product["minimumLatitude"] <= target["waterPoint"][1] <= product["maximumLatitude"]
    ]


def request_bounds(targets: list[dict[str, Any]], product: dict[str, Any]) -> tuple[float, float, float, float]:
    if not targets:
        raise RuntimeError(f"No eligible targets for {product['source']}")
    longitudes = [row["waterPoint"][0] for row in targets]
    latitudes = [row["waterPoint"][1] for row in targets]
    return (
        max(product["minimumLongitude"], min(longitudes) - 0.12),
        min(product["maximumLongitude"], max(longitudes) + 0.12),
        max(product["minimumLatitude"], min(latitudes) - 0.08),
        min(product["maximumLatitude"], max(latitudes) + 0.08),
    )


def download_subset(product: dict[str, Any], targets: list[dict[str, Any]], at: datetime, output_directory: Path) -> Path:
    minimum_lon, maximum_lon, minimum_lat, maximum_lat = request_bounds(targets, product)
    response = copernicusmarine.subset(
        dataset_id=product["datasetId"],
        dataset_version=product["datasetVersion"],
        variables=["uo", "vo"],
        minimum_longitude=minimum_lon,
        maximum_longitude=maximum_lon,
        minimum_latitude=minimum_lat,
        maximum_latitude=maximum_lat,
        start_datetime=at,
        end_datetime=at,
        coordinates_selection_method="nearest",
        output_filename=f"{product['source']}.nc",
        output_directory=output_directory,
        file_format="netcdf",
        service="geoseries",
        overwrite=True,
        disable_progress_bar=True,
        netcdf_compression_level=1,
    )
    path = Path(response.file_path)
    if not path.exists() or path.stat().st_size <= 0:
        raise RuntimeError(f"Copernicus returned no subset for {product['source']}")
    return path


def fixture_path(directory: Path, product: dict[str, Any]) -> Path:
    path = directory / f"{product['source']}.nc"
    if not path.exists():
        raise RuntimeError(f"Missing fixture {path}")
    return path


def no_credentials_in_report(report: dict[str, Any]) -> None:
    serialized = json.dumps(report, ensure_ascii=False).lower()
    forbidden_values = [
        os.getenv("COPERNICUSMARINE_SERVICE_USERNAME", ""),
        os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD", ""),
    ]
    for value in forbidden_values:
        if value and value.lower() in serialized:
            raise RuntimeError("Credential material reached the safe pilot report")
    if any(token in serialized for token in ("password", "service_username", "service_password")):
        raise RuntimeError("Credential field name reached the safe pilot report")


def main() -> int:
    args = arguments()
    at = selected_time(args.at)
    targets = load_targets(args.targets)
    if not args.fixture_directory:
        if not os.getenv("COPERNICUSMARINE_SERVICE_USERNAME") or not os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"):
            raise RuntimeError("Copernicus credentials are required through environment secrets")

    temporary = Path(tempfile.mkdtemp(prefix="ravradar-copernicus-"))
    raw_records: list[dict[str, Any]] = []
    product_reports: list[dict[str, Any]] = []
    selected_by_part: dict[str, dict[str, Any]] = {}
    try:
        for product in PRODUCTS:
            product_targets = eligible_targets(targets, product)
            path = fixture_path(args.fixture_directory, product) if args.fixture_directory else download_subset(product, product_targets, at, temporary)
            with xr.open_dataset(path) as dataset:
                records = [
                    record for target in product_targets
                    if (record := nearest_shared_uv(
                        dataset,
                        target,
                        source=product["source"],
                        product_id=product["productId"],
                        dataset_id=product["datasetId"],
                        dataset_version=product["datasetVersion"],
                        expected_time=at,
                    )) is not None
                ]
            raw_records.extend(records)
            for record in records:
                selected_by_part.setdefault(record["partId"], record)
            product_reports.append({
                "source": product["source"],
                "productId": product["productId"],
                "datasetId": product["datasetId"],
                "datasetVersion": product["datasetVersion"],
                "eligibleTargetCount": len(product_targets),
                "verifiedWithin5KmCount": len(records),
                "surfaceOnlyCount": sum(row["layerQuality"] == "surface-only" for row in records),
                "validTimes": sorted({row["validTime"] for row in records}),
            })
    finally:
        shutil.rmtree(temporary, ignore_errors=True)

    shadow = update_shadow(args.shadow, raw_records, datetime.now(timezone.utc))
    selected = [safe_record(selected_by_part[key]) for key in sorted(selected_by_part)]
    report = {
        "schemaVersion": 1,
        "generatedAt": utc_iso(datetime.now(timezone.utc)),
        "requestedTime": utc_iso(at),
        "source": "authenticated-copernicus-marine-toolbox" if not args.fixture_directory else "local-fixture",
        "toolboxVersion": importlib.metadata.version("copernicusmarine"),
        "selectionRule": "source-order-then-nearest-shared-uv-column-then-deepest-common-layer",
        "sourceOrder": [row["source"] for row in PRODUCTS],
        "maximumDistanceKm": LOCAL_MAX_DISTANCE_KM,
        "interpolation": False,
        "scoreImpact": False,
        "publicRuntime": False,
        "retentionHours": 168,
        "targetCount": len(targets),
        "verifiedUniqueTargetCount": len(selected),
        "missingTargetCount": len(targets) - len(selected),
        "shadowRecordCount": len(shadow.get("records") or []),
        "shadowEvidence": safe_shadow_summary(shadow),
        "products": product_reports,
        "verifiedTargets": selected,
    }
    no_credentials_in_report(report)
    if any("uMps" in row or "vMps" in row for row in report["verifiedTargets"]):
        raise RuntimeError("Raw U/V leaked into the safe pilot report")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "RavRadar privat Copernicus-strømpilot",
        f"Genereret: {report['generatedAt']}",
        f"Mål: {report['targetCount']}",
        f"Unikke mål med eksakt fælles U/V inden for 5 km: {report['verifiedUniqueTargetCount']}",
        f"Fortsat uden Copernicus-par: {report['missingTargetCount']}",
        "Scorepåvirkning: nej",
        "Offentlig runtime: nej",
        "Interpolation: nej",
    ]
    for product in product_reports:
        lines.append(
            f"{product['source']}: {product['verifiedWithin5KmCount']}/{product['eligibleTargetCount']} "
            f"(kun overfladelag: {product['surfaceOnlyCount']})"
        )
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # concise CI failure without dumping credential-bearing state
        print(f"Copernicus pilot failed: {error}", file=sys.stderr)
        raise SystemExit(1)
