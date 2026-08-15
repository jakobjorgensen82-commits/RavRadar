#!/usr/bin/env python3
"""Read-only P1 coverage/provenance matrix for a protected conditions artifact."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path


COMPONENTS = {
    "wind": ("windSpeedMps", "windDirectionDeg"),
    "wave": ("waveHeightM", "waveDirectionDeg", "wavePeriodS"),
    "current": ("currentSpeedMps", "currentDirectionDeg"),
    "waterLevel": ("waterLevelCm",),
    "waterTemperature": ("waterTemperatureC",),
}

CIRCULAR_FIELDS = {"windDirectionDeg", "waveDirectionDeg", "currentDirectionDeg"}


def field_delta(field: str, before: float, after: float) -> float:
    delta = abs(float(after) - float(before))
    return min(delta, 360.0 - delta) if field in CIRCULAR_FIELDS else delta


def metric_summary(rows: list[dict]) -> dict:
    if not rows:
        return {"count": 0, "mean": None, "p95": None, "maximum": None, "maximumAt": None}
    ordered = sorted(rows, key=lambda row: row["delta"])
    p95_index = max(0, min(len(ordered) - 1, (95 * len(ordered) + 99) // 100 - 1))
    maximum = ordered[-1]
    return {
        "count": len(rows),
        "mean": round(sum(row["delta"] for row in rows) / len(rows), 3),
        "p95": round(ordered[p95_index]["delta"], 3),
        "maximum": round(maximum["delta"], 3),
        "maximumAt": {key: maximum[key] for key in ("zoneId", "time", "from", "to")},
    }


def provider_group(source: dict) -> str:
    provider = str((source or {}).get("provider") or "missing").lower()
    if provider == "dmi":
        return "dmi"
    if provider == "missing":
        return "missing"
    return "fallback"


def parse_time(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def distribution(values: list[float], digits: int = 2) -> dict[str, int]:
    return dict(sorted(Counter(round(value, digits) for value in values).items()))


def history_summary(zones: dict, key: str) -> dict:
    counts: list[int] = []
    spans: list[float] = []
    verified_shares: list[float] = []
    verified_counts: list[int] = []
    verified_spans: list[float] = []
    largest_gaps: list[float] = []
    invalid_times: list[str] = []
    zones_below_72: list[str] = []
    zones_below_72_verified: list[str] = []
    zones_without_verified_samples: list[str] = []
    zones_with_gap_over_hour: list[str] = []
    for zone_id, zone in zones.items():
        rows = zone.get(key) or []
        times = [parse_time(row.get("at")) for row in rows]
        valid_times = sorted(time for time in times if time is not None)
        counts.append(len(rows))
        if len(valid_times) != len(rows):
            invalid_times.append(zone_id)
        span = ((valid_times[-1] - valid_times[0]).total_seconds() / 3600) if len(valid_times) > 1 else 0.0
        spans.append(span)
        if key == "samples72h" and span < 71.5:
            zones_below_72.append(zone_id)
        gaps = [(after - before).total_seconds() / 3600 for before, after in zip(valid_times, valid_times[1:])]
        largest_gap = max(gaps, default=0.0)
        largest_gaps.append(largest_gap)
        if largest_gap > 1.0:
            zones_with_gap_over_hour.append(zone_id)
        if rows:
            verified_rows = [row for row in rows if row.get("currentVerified") is True]
            verified_shares.append(len(verified_rows) / len(rows))
        else:
            verified_rows = []
        verified_counts.append(len(verified_rows))
        verified_times = sorted(
            time for time in (parse_time(row.get("at")) for row in verified_rows) if time is not None
        )
        verified_span = (
            (verified_times[-1] - verified_times[0]).total_seconds() / 3600
            if len(verified_times) > 1 else 0.0
        )
        verified_spans.append(verified_span)
        if not verified_rows:
            zones_without_verified_samples.append(zone_id)
        if key == "samples72h" and verified_span < 71.5:
            zones_below_72_verified.append(zone_id)
    return {
        "sampleCountDistribution": dict(sorted(Counter(counts).items())),
        "spanHoursDistribution": distribution(spans),
        "minimumSpanHours": round(min(spans), 3) if spans else 0,
        "maximumSpanHours": round(max(spans), 3) if spans else 0,
        "currentVerifiedShare": {
            "minimum": round(min(verified_shares), 4) if verified_shares else None,
            "mean": round(sum(verified_shares) / len(verified_shares), 4) if verified_shares else None,
            "maximum": round(max(verified_shares), 4) if verified_shares else None,
        },
        "verifiedSampleCountDistribution": dict(sorted(Counter(verified_counts).items())),
        "verifiedSpanHoursDistribution": distribution(verified_spans),
        "minimumVerifiedSpanHours": round(min(verified_spans), 3) if verified_spans else 0,
        "maximumVerifiedSpanHours": round(max(verified_spans), 3) if verified_spans else 0,
        "largestGapHours": round(max(largest_gaps), 3) if largest_gaps else 0,
        "zonesBelow72Hours": zones_below_72 if key == "samples72h" else [],
        "zonesBelow72VerifiedHours": zones_below_72_verified if key == "samples72h" else [],
        "zonesWithoutVerifiedSamples": zones_without_verified_samples,
        "zonesWithGapOverOneHour": zones_with_gap_over_hour,
        "zonesWithInvalidTimes": invalid_times,
    }


def audit(document: dict) -> dict:
    zones = document.get("zones") or {}
    result = {
        "datasetId": document.get("datasetId"),
        "generatedAt": document.get("generatedAt"),
        "zoneCount": len(zones),
        "currentVerification": dict(sorted(Counter(
            str(((zone.get("current") or {}).get("currentProvenance") or {}).get("status") or "missing")
            for zone in zones.values()
        ).items())),
        "components": {},
        "history": {},
    }
    for component, fields in COMPONENTS.items():
        valid_by_zone = {}
        providers = Counter()
        dmi_collections = Counter()
        dmi_model_runs = Counter()
        dmi_collection_model_runs = Counter()
        dmi_model_run_zones: dict[str, set[str]] = {}
        dmi_collection_model_run_zones: dict[str, set[str]] = {}
        dmi_temporal_resolutions = Counter()
        transitions = Counter()
        transition_pairs = Counter()
        transition_metrics = {field: [] for field in fields}
        transition_metrics_by_pair = {field: {} for field in fields}
        ordinary_metrics = {field: [] for field in fields}
        missing_zone_ids = []
        for zone_id, zone in zones.items():
            hours = (zone.get("forecast") or {}).get("hourly") or []
            valid = 0
            previous = None
            previous_hour = None
            zone_transitions = 0
            for hour in hours:
                present = all(hour.get(field) is not None for field in fields)
                group = provider_group((hour.get("sources") or {}).get(component)) if present else "missing"
                source = (hour.get("sources") or {}).get(component) or {}
                providers[group] += 1
                if present and group == "dmi":
                    collection = str(source.get("collection") or "undocumented")
                    model_run = str(source.get("modelRun") or "undocumented")
                    temporal_resolution = str(source.get("temporalResolution") or "undocumented")
                    dmi_collections[collection] += 1
                    dmi_model_runs[model_run] += 1
                    collection_model_run = f"{collection}@{model_run}"
                    dmi_collection_model_runs[collection_model_run] += 1
                    dmi_model_run_zones.setdefault(model_run, set()).add(zone_id)
                    dmi_collection_model_run_zones.setdefault(collection_model_run, set()).add(zone_id)
                    dmi_temporal_resolutions[temporal_resolution] += 1
                valid += int(present)
                if previous is not None and group != previous:
                    zone_transitions += 1
                    transition_pairs[f"{previous}->{group}"] += 1
                    for field in fields:
                        before = (previous_hour or {}).get(field)
                        after = hour.get(field)
                        if before is None or after is None:
                            continue
                        transition_metrics[field].append({
                            "delta": field_delta(field, before, after),
                            "zoneId": zone_id,
                            "time": hour.get("time"),
                            "from": previous,
                            "to": group,
                        })
                        pair = f"{previous}->{group}"
                        transition_metrics_by_pair[field].setdefault(pair, []).append(
                            transition_metrics[field][-1]
                        )
                elif previous is not None and group == previous and group != "missing":
                    for field in fields:
                        before = (previous_hour or {}).get(field)
                        after = hour.get(field)
                        if before is None or after is None:
                            continue
                        ordinary_metrics[field].append({
                            "delta": field_delta(field, before, after),
                            "zoneId": zone_id,
                            "time": hour.get("time"),
                            "from": group,
                            "to": group,
                        })
                previous = group
                previous_hour = hour
            valid_by_zone[zone_id] = valid
            transitions[zone_transitions] += 1
            if valid == 0:
                missing_zone_ids.append(zone_id)
        counts = Counter(valid_by_zone.values())
        maximum = max(valid_by_zone.values(), default=0)
        result["components"][component] = {
            "zonesWithAny": sum(value > 0 for value in valid_by_zone.values()),
            "zonesWithFullDisplayedHorizon": sum(value == maximum and maximum > 0 for value in valid_by_zone.values()),
            "minimumValidHours": min(valid_by_zone.values(), default=0),
            "maximumValidHours": maximum,
            "validHoursDistribution": dict(sorted(counts.items())),
            "providerHours": dict(providers),
            "dmiCollections": dict(sorted(dmi_collections.items())),
            "dmiModelRuns": dict(sorted(dmi_model_runs.items())),
            "dmiCollectionModelRuns": dict(sorted(dmi_collection_model_runs.items())),
            "dmiModelRunZoneCounts": {
                model_run: len(zone_ids)
                for model_run, zone_ids in sorted(dmi_model_run_zones.items())
            },
            "dmiCollectionModelRunZoneCounts": {
                collection_model_run: len(zone_ids)
                for collection_model_run, zone_ids in sorted(dmi_collection_model_run_zones.items())
            },
            "dmiTemporalResolutions": dict(sorted(dmi_temporal_resolutions.items())),
            "dmiHoursWithoutCollection": dmi_collections.get("undocumented", 0),
            "dmiHoursWithoutModelRun": dmi_model_runs.get("undocumented", 0),
            "sourceTransitionsPerZone": dict(sorted(transitions.items())),
            "sourceTransitionPairs": dict(sorted(transition_pairs.items())),
            "transitionDeltas": {
                field: metric_summary(rows) for field, rows in transition_metrics.items()
            },
            "transitionDeltasByPair": {
                field: {pair: metric_summary(rows) for pair, rows in sorted(pairs.items())}
                for field, pairs in transition_metrics_by_pair.items()
            },
            "ordinaryHourlyDeltas": {
                field: metric_summary(rows) for field, rows in ordinary_metrics.items()
            },
            "zonesWithNoData": missing_zone_ids,
            "zonesBelowFullDisplayedHorizon": sorted(
                zone_id for zone_id, value in valid_by_zone.items() if value < maximum
            ),
        }
    for key in ("samples24h", "samples72h"):
        result["history"][key] = history_summary(zones, key)
    return result


def self_test() -> None:
    rows = [
        {"at": "2026-08-15T00:00:00Z", "currentVerified": False},
        {"at": "2026-08-15T01:00:00Z", "currentVerified": True},
        {"at": "2026-08-15T02:00:00Z", "currentVerified": True},
    ]
    document = {
        "datasetId": "self-test",
        "zones": {
            "A": {
                "current": {"currentProvenance": {"status": "verified"}},
                "forecast": {"hourly": [
                    {
                        "time": "2026-08-15T00:00:00Z",
                        "windSpeedMps": 4,
                        "windDirectionDeg": 90,
                        "sources": {"wind": {
                            "provider": "dmi",
                            "collection": "harmonie",
                            "modelRun": "2026-08-14T18:00:00Z",
                            "temporalResolution": "native",
                        }},
                    },
                    {
                        "time": "2026-08-15T01:00:00Z",
                        "windSpeedMps": 5,
                        "windDirectionDeg": 95,
                        "sources": {"wind": {"provider": "dmi"}},
                    },
                ]},
                "samples24h": rows,
                "samples72h": rows,
            },
            "B": {
                "current": {"currentProvenance": {"status": "unverified"}},
                "samples24h": rows[:1],
                "samples72h": rows[:1],
            },
        },
    }
    result = audit(document)
    history = result["history"]["samples72h"]
    assert result["currentVerification"] == {"unverified": 1, "verified": 1}
    assert history["verifiedSampleCountDistribution"] == {0: 1, 2: 1}
    assert history["verifiedSpanHoursDistribution"] == {0.0: 1, 1.0: 1}
    assert history["zonesWithoutVerifiedSamples"] == ["B"]
    assert history["zonesBelow72VerifiedHours"] == ["A", "B"]
    wind = result["components"]["wind"]
    assert wind["dmiCollections"] == {"harmonie": 1, "undocumented": 1}
    assert wind["dmiModelRuns"] == {"2026-08-14T18:00:00Z": 1, "undocumented": 1}
    assert wind["dmiCollectionModelRuns"] == {
        "harmonie@2026-08-14T18:00:00Z": 1,
        "undocumented@undocumented": 1,
    }
    assert wind["dmiModelRunZoneCounts"] == {
        "2026-08-14T18:00:00Z": 1,
        "undocumented": 1,
    }
    assert wind["dmiCollectionModelRunZoneCounts"] == {
        "harmonie@2026-08-14T18:00:00Z": 1,
        "undocumented@undocumented": 1,
    }
    assert wind["dmiHoursWithoutCollection"] == 1
    assert wind["dmiHoursWithoutModelRun"] == 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("conditions", type=Path, nargs="?")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("OK: P1-audit skelner rå og verificeret strømhistorik.")
        return 0
    if args.conditions is None:
        parser.error("conditions er påkrævet uden --self-test")
    document = json.loads(args.conditions.read_text("utf-8"))
    print(json.dumps(audit(document), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
