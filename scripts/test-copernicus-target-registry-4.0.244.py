#!/usr/bin/env python3
"""Regression for split operational/advisory Copernicus DMI-gap matrices."""
from __future__ import annotations

import copy
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_current import validate_target_registry
from lib.dmi_native_provenance import strict_verified_part_current_pair_count


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/build-copernicus-target-registry.py"
REFERENCE = datetime(2026, 8, 21, 8, tzinfo=timezone.utc)
AT = REFERENCE.isoformat().replace("+00:00", "Z")


def write(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value), encoding="utf-8")


def source(part: dict, valid_time: datetime, **overrides: object) -> dict:
    valid = valid_time.isoformat().replace("+00:00", "Z")
    model_run = (valid_time - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    value = {
        "provider": "dmi", "fallback": False, "collection": "dkss_idw", "collectionFamily": "marine",
        "component": "current", "componentKind": "ocean-current-vector",
        "fieldSet": ["current-u", "current-v"], "optionalFieldSet": [],
        "modelRun": model_run, "nativeValidTime": valid, "leadTimeHours": 1,
        "entityId": f"PART::{part['partId']}", "parentZoneId": part["sourceZoneId"],
        "entityType": "coastal-part", "samplingContext": "coastal-part-water-point",
        "samplingPoint": part["waterPoint"], "gridPoint": part["waterPoint"],
        "gridDefinitionSha256": "a" * 64, "distanceKm": 0.0,
        "spatialSemanticsVersion": 1,
        "spatialSelection": "nearest-shared-grid-cell-no-spatial-interpolation",
        "itemId": f"item-{part['partId']}", "assetIdentitySha256": "b" * 64,
        "acquiredAt": AT, "verticalLayer": "depthbelowsea:5", "verticalLayerRankM": 5.0,
        "vectorSelection": "nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer",
        "vectorSemanticsVersion": 3,
    }
    value.update(overrides)
    return value


def run(folder: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([
        sys.executable, "-B", str(SCRIPT),
        "--targets", str(folder / "targets.json"),
        "--dmi", str(folder / "dmi.json"),
        "--output", str(folder / "selected.json"),
        "--at", AT,
        *extra,
    ], cwd=ROOT, capture_output=True, text=True, check=False)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-targets-") as raw:
    folder = Path(raw)
    parts = [
        {"partId": "dmi-ok", "sourceZoneId": "Z1", "name": "DMI", "waterPoint": [9.0, 57.0]},
        {"partId": "bad-proof", "sourceZoneId": "Z1", "name": "Bad", "waterPoint": [9.1, 57.0]},
        {"partId": "missing", "sourceZoneId": "Z2", "name": "Missing", "waterPoint": [10.0, 56.0]},
    ]
    write(folder / "targets.json", {"partCount": 3, "zones": {"Z1": parts[:2], "Z2": parts[2:]}})
    valid = AT
    dmi_document = {"zones": {
        "PART::dmi-ok": {"samplingPoint": parts[0]["waterPoint"], "hourly": {valid: {
            "time": valid, "current-u": 0.1, "current-v": 0.2,
            "sources": {"current": source(parts[0], REFERENCE)},
        }}},
        "PART::bad-proof": {"samplingPoint": parts[1]["waterPoint"], "hourly": {valid: {
            "time": valid, "current-u": 0.1, "current-v": 0.2,
            "sources": {"current": source(parts[1], REFERENCE, fieldSet=["current-u"])},
        }}},
    }}
    write(folder / "dmi.json", dmi_document)

    github_output = folder / "github-output.txt"
    targeted = run(folder, "--nearest-dmi-hour", "--github-output", str(github_output))
    assert targeted.returncode == 0, targeted.stdout + targeted.stderr
    selected = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert selected["schemaVersion"] == 3 and selected["matrixHourCount"] == 166
    assert selected["operationalHourCount"] == 118
    assert selected["advisoryHistoryHourCount"] == 48
    assert selected["productionReferenceAt"] == AT and selected["targetHour"] == AT
    assert selected["rangeStartAt"] == (REFERENCE - timedelta(hours=48)).isoformat().replace("+00:00", "Z")
    assert selected["rangeEndAt"] == (REFERENCE + timedelta(hours=117)).isoformat().replace("+00:00", "Z")
    assert selected["totalPairCount"] == 498
    assert selected["dmiVerifiedPairCount"] == 1
    assert selected["operationalTotalPairCount"] == 354
    assert selected["operationalDmiVerifiedPairCount"] == 1
    assert selected["advisoryHistoryTotalPairCount"] == 144
    assert selected["advisoryHistoryDmiVerifiedPairCount"] == 0
    verifier_targets = [{
        "partId": part["partId"],
        "parentZoneId": part["sourceZoneId"],
        "name": part["name"],
        "waterPoint": part["waterPoint"],
    } for part in parts]
    assert strict_verified_part_current_pair_count(
        dmi_document,
        verifier_targets,
        REFERENCE - timedelta(hours=48),
        REFERENCE + timedelta(hours=117),
    ) == selected["dmiVerifiedPairCount"]
    assert selected["operationalRequiredPairCount"] == 353
    assert selected["advisoryHistoryRequiredPairCount"] == 144
    assert selected["partCount"] == 3, "Every part has at least one exact gap across the range"
    assert selected["coordinatesChanged"] is False
    assert any(row == {"partId": "bad-proof", "validTime": AT} for row in selected["operationalRequiredPairs"])
    assert not any(row == {"partId": "dmi-ok", "validTime": AT} for row in selected["operationalRequiredPairs"])
    output_values = dict(line.split("=", 1) for line in github_output.read_text(encoding="utf-8").splitlines())
    assert output_values["target_hour"] == AT and output_values["production_reference_at"] == AT
    assert output_values["required_pair_count"] == "353"
    assert output_values["advisory_history_required_pair_count"] == "144"

    # The private registry is itself a strict trust boundary: extra fields,
    # boolean-as-number points and a disguised implicit full-coast matrix are
    # rejected before authenticated acquisition starts.
    for mutate in (
        lambda value: value.update(unexpected=True),
        lambda value: value["targets"][0].update(waterPoint=[True, 57.0]),
        lambda value: value.update(operationalDmiVerifiedPairCount=0),
    ):
        damaged = copy.deepcopy(selected)
        mutate(damaged)
        try:
            validate_target_registry(damaged)
        except (TypeError, ValueError):
            pass
        else:
            raise AssertionError("Damaged Copernicus target registry must fail closed")

    # A nearby valid DMI row cannot move the locked production reference or
    # fill the missing exact hour, even when an old workflow passes the flag.
    nearby = REFERENCE - timedelta(hours=1)
    nearby_text = nearby.isoformat().replace("+00:00", "Z")
    operational_anchor = REFERENCE + timedelta(hours=1)
    operational_anchor_text = operational_anchor.isoformat().replace("+00:00", "Z")
    dmi = json.loads((folder / "dmi.json").read_text(encoding="utf-8"))
    dmi["zones"]["PART::dmi-ok"]["hourly"] = {
        nearby_text: {
            "time": nearby_text, "current-u": 0.1, "current-v": 0.2,
            "sources": {"current": source(parts[0], nearby)},
        },
        operational_anchor_text: {
            "time": operational_anchor_text, "current-u": 0.1, "current-v": 0.2,
            "sources": {"current": source(parts[0], operational_anchor)},
        },
    }
    write(folder / "dmi.json", dmi)
    locked = run(folder, "--nearest-dmi-hour")
    assert locked.returncode == 0, locked.stdout + locked.stderr
    locked_registry = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert locked_registry["productionReferenceAt"] == AT
    assert {"partId": "dmi-ok", "validTime": AT} in locked_registry["operationalRequiredPairs"]

    # Weak/incomplete provenance across the whole matrix must stop rather than
    # implicitly requesting a nationwide authenticated download.
    write(folder / "dmi.json", {"zones": {}})
    refused = run(folder)
    assert refused.returncode != 0 and "refusing implicit full-coast" in refused.stdout

    full = run(folder, "--full-coast")
    assert full.returncode == 0, full.stdout + full.stderr
    nationwide = json.loads((folder / "selected.json").read_text(encoding="utf-8"))
    assert nationwide["selectionMode"] == "manual-full-coast"
    assert nationwide["operationalRequiredPairCount"] == 354
    assert nationwide["advisoryHistoryRequiredPairCount"] == 144

print("OK: Copernicus target registry separates exact operational gaps from advisory measured history.")
