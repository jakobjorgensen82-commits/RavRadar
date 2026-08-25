#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from lib.copernicus_target_identity import target_fingerprint, targets_from_registry  # noqa: E402


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def run_builder(folder: Path, at: str = "2026-08-18T15:30:00Z") -> tuple[dict, dict]:
    output = folder / "history.json"
    report = folder / "report.json"
    command = [
        sys.executable,
        "-B",
        str(ROOT / "scripts/build-live-current-pilot.py"),
        "--targets", str(folder / "targets.json"),
        "--dmi", str(folder / "dmi.json"),
        "--copernicus", str(folder / "copernicus.json"),
        "--regional", str(folder / "regional.json"),
        "--policy", str(folder / "policy.json"),
        "--control", str(folder / "control.json"),
        "--output", str(output),
        "--report", str(report),
        "--at", at,
    ]
    environment = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    completed = subprocess.run(command, cwd=ROOT, env=environment, check=False, capture_output=True, text=True)
    if completed.returncode:
        raise AssertionError(f"Builder failed:\n{completed.stdout}\n{completed.stderr}")
    if "uMps" in completed.stdout or "vMps" in completed.stdout:
        raise AssertionError("Builder loggede rå vektornøgler")
    return json.loads(output.read_text("utf-8")), json.loads(report.read_text("utf-8"))


with tempfile.TemporaryDirectory(prefix="ravradar-live-current-") as raw_folder:
    folder = Path(raw_folder)
    parts = [
        {"partId": "dmi-part", "sourceZoneId": "Z-DMI", "waterPoint": [10.0, 55.0]},
        {"partId": "cop-part", "sourceZoneId": "Z-COP", "waterPoint": [10.2, 55.0]},
    ]
    proxy_parts = []
    for index in range(8):
        proxy_parts.append({
            "partId": f"proxy-{index + 1}",
            "sourceZoneId": "Z-PROXY",
            "waterPoint": [11.0 + index * 0.2, 56.0],
        })
    all_parts = parts + proxy_parts
    zones: dict[str, list[dict]] = {}
    for part in all_parts:
        zones.setdefault(part["sourceZoneId"], []).append(part)
    write(folder / "targets.json", {"schemaVersion": 2, "partCount": len(all_parts), "zones": zones})
    targets = targets_from_registry(folder / "targets.json")
    fingerprint = target_fingerprint(targets)
    copernicus_target_ids = ["cop-part"]
    copernicus_fingerprint = target_fingerprint([row for row in targets if row["partId"] in copernicus_target_ids])
    selection = "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer"
    dmi_source = {
        "provider": "dmi", "vectorSemanticsVersion": 3, "verticalLayer": "depthbelowsea:7",
        "vectorSelection": selection, "samplingPoint": [10.0, 55.0], "gridPoint": [10.0, 55.0],
        "distanceKm": 0,
    }
    dmi_zones = {
        f"PART::{part['partId']}": {
            "samplingPoint": part["waterPoint"],
            "hourly": {"2026-08-18T15:00:00Z": {"time": "2026-08-18T15:00:00Z"}},
        }
        for part in all_parts
    }
    dmi_zones["PART::dmi-part"]["hourly"]["2026-08-18T15:00:00Z"].update({
        "current-u": 0.1, "current-v": 0.2, "sources": {"current": dmi_source},
    })
    write(folder / "dmi.json", {
        "schemaVersion": 2, "currentVectorSemanticsVersion": 3,
        "currentVectorSelection": selection, "currentMaxDistanceKm": 5,
        "zones": dmi_zones,
    })
    cop_record = {
        "partId": "cop-part", "parentZoneId": "Z-COP", "validTime": "2026-08-18T15:00:00Z",
        "samplingPoint": [10.2, 55.0], "source": "copernicus-baltic-nemo",
        "productId": "TEST_PRODUCT", "datasetId": "TEST_DATASET", "datasetVersion": "1",
        "gridPoint": [10.21, 55.0], "distanceKm": 0.64, "verticalLayerM": 12,
        "layerQuality": "deepest-common-layer", "componentPair": "same-time-cell-layer",
        "interpolation": False, "uMps": 0.3, "vMps": -0.1,
    }
    stale_cop_record = {
        **cop_record,
        "validTime": "2026-08-10T15:00:00Z",
        "uMps": 9.9,
        "vMps": 9.9,
    }
    write(folder / "copernicus.json", {
        "scoreImpact": False, "publicRuntime": False, "records": [stale_cop_record, cop_record],
        "collections": [
            {"validTime": "2026-08-10T15:00:00Z", "targetFingerprint": copernicus_fingerprint, "targetPartIds": copernicus_target_ids, "recordCount": 1},
            {"validTime": "2026-08-18T15:00:00Z", "targetFingerprint": copernicus_fingerprint, "targetPartIds": copernicus_target_ids, "recordCount": 1},
        ],
    })
    policy_rows = [{"partId": row["partId"], "approvedSamplingPoint": row["waterPoint"]} for row in proxy_parts]
    write(folder / "policy.json", {"controlledLivePilotAllowed": True, "parts": policy_rows})
    anchors = {}
    for index, row in enumerate(proxy_parts):
        sampling = row["waterPoint"]
        grid = [sampling[0] + 0.1, sampling[1]]
        anchors[f"REGIONAL_PROXY::{row['partId']}"] = {
            "regionalProxyCandidate": True, "requiredCollection": "dkss_lf",
            "partId": row["partId"], "parentZoneId": row["sourceZoneId"],
            "targetPoint": sampling, "sourceWaterPoint": sampling,
            "researchClass": "owner-approved-regional-proxy",
            "sameConnectedWaterBody": "Limfjorden", "maximumDistanceKm": 15,
            "samples": [{
                "collection": "dkss_lf", "modelRun": "2026-08-18T12:00:00Z",
                "validTime": "2026-08-18T15:00:00Z", "capturedAt": "2026-08-18T15:20:00Z",
                "gridPoint": grid, "distanceKm": 6.2 + index * 0.1,
                "layers": {"bottom": {"verticalLayer": "depthbelowsea:5", "verticalLayerRankM": 5, "uMps": -0.2, "vMps": 0.4}},
            }],
        }
    write(folder / "regional.json", {"scoreImpact": False, "publicRuntime": False, "anchors": anchors})
    live_control = {
        "schemaVersion": 1, "mode": "controlled-live", "credentialsPublic": False,
        "currentDataPublic": True, "historyPublic": True,
        "rollbackBehavior": "disable-supplemental-current-score-and-arrows",
    }
    write(folder / "control.json", live_control)

    history, report = run_builder(folder)
    assert history["enabled"] is True and history["mode"] == "controlled-live"
    assert history["credentialsIncluded"] is False and history["historyPublic"] is True
    assert history["retentionHours"] == 168 and report["retentionHours"] == 168
    assert len(history["entries"]) == 9
    assert all("uMps" in row and "vMps" in row for row in history["entries"])
    assert report["verifiedPartCount"] == 10 and report["coverageRequirementMet"] is True
    assert report["exactVerifiedPartCount"] == 10
    assert report["nativeCadenceHeldPartCount"] == 0
    assert report["partsBySelectedSource"] == {"dmi-local": 1, "copernicus-local": 1, "dmi-regional-proxy": 8}
    assert report["coverageReferenceAt"] == "2026-08-18T15:00:00Z"
    assert report["retainedHistoryPartCount"] == 10
    assert report["historyPartsBySelectedSource"] == report["partsBySelectedSource"]
    serialized = json.dumps(history).lower()
    assert "password" not in serialized and "username" not in serialized and "credential" not in serialized.replace("credentialsincluded", "")

    for part in all_parts:
        dmi_zones[f"PART::{part['partId']}"]["hourly"]["2026-08-18T16:00:00Z"] = {
            "time": "2026-08-18T16:00:00Z"
        }
    dmi_zones["PART::dmi-part"]["hourly"]["2026-08-18T16:00:00Z"].update({
        "current-u": 0.1, "current-v": 0.2, "sources": {"current": dmi_source},
    })
    write(folder / "dmi.json", {
        "schemaVersion": 2, "currentVectorSemanticsVersion": 3,
        "currentVectorSelection": selection, "currentMaxDistanceKm": 5,
        "zones": dmi_zones,
    })
    cop_record_16 = {**cop_record, "validTime": "2026-08-18T16:00:00Z"}
    write(folder / "copernicus.json", {
        "scoreImpact": False, "publicRuntime": False, "records": [cop_record, cop_record_16],
        "collections": [
            {"validTime": "2026-08-18T15:00:00Z", "targetFingerprint": copernicus_fingerprint, "targetPartIds": copernicus_target_ids, "recordCount": 1},
            {"validTime": "2026-08-18T16:00:00Z", "targetFingerprint": copernicus_fingerprint, "targetPartIds": copernicus_target_ids, "recordCount": 1},
        ],
    })
    _, held_report = run_builder(folder, "2026-08-18T16:30:00Z")
    assert held_report["verifiedPartCount"] == 10 and held_report["coverageRequirementMet"] is True
    assert held_report["exactVerifiedPartCount"] == 2
    assert held_report["nativeCadenceHeldPartCount"] == 8
    assert held_report["nativeCadenceMaximumAgeHours"] == 1

    future_only_anchors = json.loads(json.dumps(anchors))
    for anchor in future_only_anchors.values():
        anchor["samples"][0]["validTime"] = "2026-08-18T17:00:00Z"
    write(folder / "regional.json", {"scoreImpact": False, "publicRuntime": False, "anchors": future_only_anchors})
    _, future_only_report = run_builder(folder, "2026-08-18T16:30:00Z")
    assert future_only_report["verifiedPartCount"] == 2
    assert future_only_report["nativeCadenceHeldPartCount"] == 0
    assert future_only_report["coverageRequirementMet"] is False
    write(folder / "regional.json", {"scoreImpact": False, "publicRuntime": False, "anchors": anchors})

    live_control["mode"] = "dmi-only-rollback"
    write(folder / "control.json", live_control)
    rollback_history, rollback_report = run_builder(folder, "2026-08-18T16:30:00Z")
    assert rollback_history["enabled"] is False and rollback_history["mode"] == "dmi-only-rollback"
    assert len(rollback_history["entries"]) == 10
    assert rollback_report["verifiedPartCount"] == 10

    recent_history_record = {**cop_record, "validTime": "2026-08-18T14:00:00Z"}
    write(folder / "copernicus.json", {
        "scoreImpact": False, "publicRuntime": False, "records": [recent_history_record],
        "collections": [{"validTime": "2026-08-18T14:00:00Z", "targetFingerprint": copernicus_fingerprint, "targetPartIds": copernicus_target_ids, "recordCount": 1}],
    })
    live_control["mode"] = "controlled-live"
    write(folder / "control.json", live_control)
    history_only, history_only_report = run_builder(folder)
    assert len(history_only["entries"]) == 9, "Historikken skal fortsat bevare den friske, men for gamle post"
    assert history_only_report["retainedHistoryPartCount"] == 10
    assert history_only_report["verifiedPartCount"] == 9
    assert history_only_report["coverageRequirementMet"] is False
    assert history_only_report["missingPartIds"] == ["cop-part"]
    assert history_only_report["partsBySelectedSource"] == {"dmi-local": 1, "copernicus-local": 0, "dmi-regional-proxy": 8}

print("OK: offentlig livehistorik bevarer U/V uden credentials, DMI står først, og rollback slår kun anvendelsen fra.")
