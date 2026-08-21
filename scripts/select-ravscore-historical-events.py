#!/usr/bin/env python3
"""Select a small balanced catalog from private, derived historical features."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


FORBIDDEN_INPUT_KEYS = {
    "u", "v", "uo", "vo", "umps", "vmps", "longitude", "latitude",
    "coordinates", "landpoint", "waterpoint", "gridpoint", "samplingpoint",
}
EVENT_CLASSES = (
    "onshore-delivery",
    "offshore-removal",
    "conflicting-wave-current",
    "alongshore-mixed",
)


def utc(value: Any) -> datetime:
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Historical feature time must include timezone")
    return parsed.astimezone(timezone.utc)


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def percentile(values: list[float], fraction: float) -> float:
    if not values:
        raise ValueError("Cannot calculate percentile without values")
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    left = int(math.floor(position))
    right = int(math.ceil(position))
    if left == right:
        return ordered[left]
    weight = position - left
    return ordered[left] * (1 - weight) + ordered[right] * weight


def direction_class(value: float) -> str:
    if value >= 0.2:
        return "onshore"
    if value <= -0.35:
        return "offshore"
    return "alongshore"


def event_class(wave_alignment: float, current_alignment: float) -> str:
    wave = direction_class(wave_alignment)
    current = direction_class(current_alignment)
    if wave == "onshore" and current == "onshore":
        return "onshore-delivery"
    if wave == "offshore" and current == "offshore":
        return "offshore-removal"
    if {wave, current} == {"onshore", "offshore"}:
        return "conflicting-wave-current"
    return "alongshore-mixed"


def safe_document(document: dict[str, Any]) -> None:
    if document.get("rawUvStored") is not False or document.get("coordinateValuesStored") is not False:
        raise ValueError("Historical input must explicitly exclude raw U/V and coordinates")
    serialized_keys: set[str] = set()

    def collect(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                serialized_keys.add(str(key).lower())
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)

    collect(document)
    blocked = sorted(serialized_keys & FORBIDDEN_INPUT_KEYS)
    if blocked:
        raise ValueError("Historical input contains forbidden raw fields: " + ", ".join(blocked))


def normalise_samples(region: dict[str, Any]) -> list[dict[str, Any]]:
    rows = []
    for raw in region.get("samples") or []:
        required = (
            "waveHeightM", "wavePeriodS", "waveOnshoreAlignment",
            "currentSpeedMps", "currentOnshoreAlignment", "seaLevelM",
        )
        if not all(finite(raw.get(key)) for key in required):
            continue
        wave_height = max(0.0, float(raw["waveHeightM"]))
        wave_period = max(0.0, float(raw["wavePeriodS"]))
        rows.append({
            "time": utc(raw["time"]),
            "energy": wave_height * wave_height * wave_period,
            "waveAlignment": max(-1.0, min(1.0, float(raw["waveOnshoreAlignment"]))),
            "currentSpeed": max(0.0, float(raw["currentSpeedMps"])),
            "currentAlignment": max(-1.0, min(1.0, float(raw["currentOnshoreAlignment"]))),
            "seaLevel": float(raw["seaLevelM"]),
        })
    rows.sort(key=lambda row: row["time"])
    if len(rows) < 72:
        raise ValueError(f"Region {region.get('regionId')} has fewer than 72 valid samples")
    if len({row["time"] for row in rows}) != len(rows):
        raise ValueError(f"Region {region.get('regionId')} has duplicate times")
    return rows


def weighted_average(rows: list[dict[str, Any]], field: str, weight: str) -> float:
    total = sum(max(float(row[weight]), 1e-9) for row in rows)
    return sum(float(row[field]) * max(float(row[weight]), 1e-9) for row in rows) / total


def water_phase(rows: list[dict[str, Any]], peak: datetime) -> str:
    before = [row for row in rows if peak - timedelta(hours=12) <= row["time"] <= peak]
    after = [row for row in rows if peak <= row["time"] <= peak + timedelta(hours=18)]
    if not before or not after:
        return "unknown"
    change = after[-1]["seaLevel"] - before[0]["seaLevel"]
    if change >= 0.08:
        return "rising"
    if change <= -0.08:
        return "falling"
    return "near-level"


def event_id(region_id: str, peak: datetime, classification: str) -> str:
    digest = hashlib.sha256(f"{region_id}|{iso(peak)}|{classification}".encode("utf-8")).hexdigest()[:12]
    return f"hist-{digest}"


def build_event(
    region: dict[str, Any],
    all_rows: list[dict[str, Any]],
    segment: list[dict[str, Any]],
    threshold: float,
) -> dict[str, Any]:
    peak_row = max(segment, key=lambda row: (row["energy"], -row["time"].timestamp()))
    peak = peak_row["time"]
    wave_alignment = weighted_average(segment, "waveAlignment", "energy")
    current_alignment = weighted_average(segment, "currentAlignment", "currentSpeed")
    classification = event_class(wave_alignment, current_alignment)
    cadence_hours = max(1.0, (segment[-1]["time"] - segment[0]["time"]).total_seconds() / 3600 / max(1, len(segment) - 1))
    duration = (segment[-1]["time"] - segment[0]["time"]).total_seconds() / 3600 + cadence_hours
    window = [row for row in all_rows if peak - timedelta(hours=24) <= row["time"] <= peak + timedelta(hours=72)]
    return {
        "eventId": event_id(str(region["regionId"]), peak, classification),
        "regionId": str(region["regionId"]),
        "sourceProductIds": sorted(str(value) for value in region.get("sourceProductIds") or []),
        "classification": classification,
        "peakTime": iso(peak),
        "windowStart": iso(peak - timedelta(hours=24)),
        "windowEnd": iso(peak + timedelta(hours=72)),
        "eventSampleCount": len(segment),
        "windowSampleCount": len(window),
        "durationHours": round(duration, 2),
        "peakEnergyToRegionalP95": round(peak_row["energy"] / max(threshold, 1e-9), 3),
        "waveDirectionClass": direction_class(wave_alignment),
        "currentDirectionClass": direction_class(current_alignment),
        "waterLevelPhase": water_phase(all_rows, peak),
    }


def energetic_events(region: dict[str, Any], rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], float]:
    threshold = percentile([row["energy"] for row in rows], 0.95)
    active = [row for row in rows if row["energy"] >= threshold and row["energy"] > 0]
    segments: list[list[dict[str, Any]]] = []
    for row in active:
        if not segments or row["time"] - segments[-1][-1]["time"] > timedelta(hours=6):
            segments.append([row])
        else:
            segments[-1].append(row)
    events = [build_event(region, rows, segment, threshold) for segment in segments if len(segment) >= 2]
    events.sort(key=lambda row: (-row["peakEnergyToRegionalP95"], row["peakTime"]))
    return events, threshold


def calm_control(region: dict[str, Any], rows: list[dict[str, Any]], events: list[dict[str, Any]]) -> dict[str, Any] | None:
    event_peaks = [utc(event["peakTime"]) for event in events]
    low = percentile([row["energy"] for row in rows], 0.2)
    candidates = [
        row for row in rows
        if row["energy"] <= low
        and all(abs((row["time"] - peak).total_seconds()) >= 96 * 3600 for peak in event_peaks)
    ]
    if not candidates:
        return None
    center = candidates[len(candidates) // 2]
    classification = "calm-control"
    return {
        "eventId": event_id(str(region["regionId"]), center["time"], classification),
        "regionId": str(region["regionId"]),
        "sourceProductIds": sorted(str(value) for value in region.get("sourceProductIds") or []),
        "classification": classification,
        "peakTime": iso(center["time"]),
        "windowStart": iso(center["time"] - timedelta(hours=24)),
        "windowEnd": iso(center["time"] + timedelta(hours=72)),
        "eventSampleCount": 1,
        "windowSampleCount": sum(center["time"] - timedelta(hours=24) <= row["time"] <= center["time"] + timedelta(hours=72) for row in rows),
        "durationHours": 0,
        "peakEnergyToRegionalP95": 0,
        "waveDirectionClass": direction_class(center["waveAlignment"]),
        "currentDirectionClass": direction_class(center["currentAlignment"]),
        "waterLevelPhase": water_phase(rows, center["time"]),
    }


def select_events(document: dict[str, Any], requested: int = 12) -> dict[str, Any]:
    safe_document(document)
    regions = document.get("regions") or []
    if not regions:
        raise ValueError("Historical feature input has no regions")
    events_by_region: dict[str, list[dict[str, Any]]] = {}
    thresholds: dict[str, float] = {}
    controls: list[dict[str, Any]] = []
    for region in regions:
        region_id = str(region.get("regionId") or "")
        if not region_id:
            raise ValueError("Historical region has no id")
        rows = normalise_samples(region)
        events, threshold = energetic_events(region, rows)
        events_by_region[region_id] = events
        thresholds[region_id] = threshold
        control = calm_control(region, rows, events)
        if control:
            controls.append(control)

    selected: list[dict[str, Any]] = []
    used: set[str] = set()

    def add(event: dict[str, Any] | None) -> None:
        if event and event["eventId"] not in used and len(selected) < requested:
            used.add(event["eventId"])
            selected.append(event)

    for classification in EVENT_CLASSES:
        for region_id in sorted(events_by_region):
            add(next((event for event in events_by_region[region_id] if event["classification"] == classification), None))
    for control in sorted(controls, key=lambda row: row["regionId"]):
        add(control)
    remaining = sorted(
        (event for events in events_by_region.values() for event in events if event["eventId"] not in used),
        key=lambda row: (-row["peakEnergyToRegionalP95"], row["regionId"], row["peakTime"]),
    )
    for event in remaining:
        add(event)

    class_counts = {
        classification: sum(event["classification"] == classification for event in selected)
        for classification in (*EVENT_CLASSES, "calm-control")
    }
    return {
        "schemaVersion": "1.0.0",
        "status": "passed-private-ravscore-historical-event-selection",
        "generatedAt": iso(datetime.now(timezone.utc)),
        "requestedEventCount": requested,
        "selectedEventCount": len(selected),
        "regionCount": len(regions),
        "selectionMethod": "regional-p95-energy-events-balanced-by-direction-plus-calm-controls",
        "regionalThresholdDigests": {
            region_id: "sha256:" + hashlib.sha256(f"{threshold:.12g}".encode("utf-8")).hexdigest()
            for region_id, threshold in sorted(thresholds.items())
        },
        "classificationCounts": class_counts,
        "events": selected,
        "rawUvStored": False,
        "coordinateValuesStored": False,
        "rawWeatherSeriesStored": False,
        "productionGeometryChanged": False,
        "adminDataChanged": False,
        "weatherSamplingChanged": False,
        "stateChanged": False,
        "publicRuntimeChanged": False,
        "scoreChanged": False,
        "automaticActivationAllowed": False,
    }


def fixture() -> dict[str, Any]:
    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    classes = (
        (0.8, 0.8),
        (-0.8, -0.8),
        (0.8, -0.8),
        (0.0, 0.0),
        (-0.8, 0.8),
        (0.8, 0.8),
    )
    regions = []
    for region_index, region_id in enumerate(("north-sea", "baltic-transition")):
        samples = []
        for hour in range(24 * 48):
            timestamp = start + timedelta(hours=hour)
            sample = {
                "time": iso(timestamp),
                "waveHeightM": 0.2,
                "wavePeriodS": 4.0,
                "waveOnshoreAlignment": 0.0,
                "currentSpeedMps": 0.05,
                "currentOnshoreAlignment": 0.0,
                "seaLevelM": 0.02 * math.sin(hour / 12),
            }
            for event_index, (wave_alignment, current_alignment) in enumerate(classes):
                center = 72 + event_index * 168 + region_index * 12
                distance = abs(hour - center)
                if distance <= 8:
                    intensity = 1 - distance / 12
                    sample.update({
                        "waveHeightM": 1.2 + 1.8 * intensity,
                        "wavePeriodS": 6 + 2 * intensity,
                        "waveOnshoreAlignment": wave_alignment,
                        "currentSpeedMps": 0.2 + 0.25 * intensity,
                        "currentOnshoreAlignment": current_alignment,
                        "seaLevelM": 0.3 * intensity - 0.02 * max(0, hour - center),
                    })
            samples.append(sample)
        regions.append({
            "regionId": region_id,
            "sourceProductIds": [f"fixture-{region_id}-wave", f"fixture-{region_id}-physics"],
            "samples": samples,
        })
    return {
        "schemaVersion": "1.0.0",
        "status": "private-ravscore-historical-feature-series",
        "rawUvStored": False,
        "coordinateValuesStored": False,
        "regions": regions,
    }


def self_test() -> None:
    report = select_events(fixture(), 12)
    if report["selectedEventCount"] != 12 or report["regionCount"] != 2:
        raise AssertionError("Historical selector did not produce the requested balanced catalog")
    if not all(report["classificationCounts"][name] >= 1 for name in (*EVENT_CLASSES, "calm-control")):
        raise AssertionError("Historical selector omitted a required event class")
    if report["rawUvStored"] or report["coordinateValuesStored"] or report["automaticActivationAllowed"]:
        raise AssertionError("Historical selector violated the private score-neutral contract")
    serialized = json.dumps(report).lower()
    if any(token in serialized for token in ('"umps"', '"vmps"', '"waterpoint"', '"coordinates"')):
        raise AssertionError("Historical selector leaked a forbidden field")
    print("OK: historical event selector produced 12 balanced, private and score-neutral windows.")


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, nargs="?")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = arguments()
    if args.self_test:
        self_test()
        return 0
    if not args.input:
        raise RuntimeError("Usage: select-ravscore-historical-events.py <derived-feature-series.json> [--output path]")
    document = json.loads(args.input.read_text(encoding="utf-8"))
    report = select_events(document, max(1, args.count))
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
    else:
        print(serialized, end="")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Historical RavScore event selection failed: {error}")
        raise SystemExit(1)
