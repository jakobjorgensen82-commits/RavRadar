#!/usr/bin/env python3
"""Targeted privacy, physics and exact-residual tests for Open-Meteo current."""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone

from lib.copernicus_current import canonical_sha256
from lib.open_meteo_current_fallback import (
    OpenMeteoCurrentFallbackError,
    build_document,
    build_record,
    safe_projection,
    validate_document,
)


REFERENCE = datetime(2026, 9, 5, 1, tzinfo=timezone.utc)


def iso(value: datetime) -> str:
    return value.isoformat().replace("+00:00", "Z")


def rejected(callable_) -> None:
    try:
        callable_()
    except OpenMeteoCurrentFallbackError:
        return
    raise AssertionError("Invalid Open-Meteo evidence was accepted")


targets = [{
    "partId": "P1",
    "parentZoneId": "Z1",
    "name": "Part 1",
    "waterPoint": [10.0, 55.0],
}]
required = [
    {"partId": "P1", "validTime": iso(REFERENCE)},
    {"partId": "P1", "validTime": iso(REFERENCE + timedelta(hours=1))},
]
acquired_at = iso(REFERENCE + timedelta(minutes=20))
response_sha = canonical_sha256({"fixture": "open-meteo-response"})
stage_sha = canonical_sha256({"fixture": "source-stage"})
regional_sha = canonical_sha256({"fixture": "regional-evidence"})
records = [
    build_record(
        part_id="P1",
        valid_time=pair["validTime"],
        acquired_at=acquired_at,
        sampling_point=[10.0, 55.0],
        grid_point=[10.0, 55.0],
        speed_mps=0.5,
        toward_direction_deg=90 if index == 0 else 360,
        source_response_sha256=response_sha,
    )
    for index, pair in enumerate(required)
]
assert records[0]["uMps"] == 0.5 and abs(records[0]["vMps"]) < 1e-10
assert records[1]["towardDirectionDeg"] == 0
assert records[1]["uMps"] == 0 and records[1]["vMps"] == 0.5

document = build_document(
    targets=targets,
    required_pairs=required,
    records=records,
    acquired_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
validated = validate_document(
    document,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert validated["status"] == "COMPLETE" and validated["missingPairCount"] == 0
safe = safe_projection(validated)
assert safe["coordinatesIncluded"] is False and safe["rawVectorsIncluded"] is False
assert "records" not in safe and "missingPairs" not in safe

rejected(lambda: build_document(
    targets=targets,
    required_pairs=required,
    records=records,
    acquired_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=True,
    regional_evidence_sha256=regional_sha,
))

incomplete = build_document(
    targets=targets,
    required_pairs=required,
    records=records[:1],
    acquired_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert incomplete["status"] == "INCOMPLETE" and incomplete["missingPairCount"] == 1
rejected(lambda: validate_document(
    incomplete,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
))

for field, replacement in (
    ("physicalScope", "ocean-current-only"),
    ("scoreInputPolicyId", "wave-and-tide-reprojection"),
    ("calibrationEligible", True),
    ("copernicusSourceStageSha256", canonical_sha256({"wrong": "stage"})),
):
    poisoned = copy.deepcopy(document)
    poisoned[field] = replacement
    rejected(lambda poisoned=poisoned: validate_document(
        poisoned,
        targets=targets,
        required_pairs=required,
        production_reference_at=iso(REFERENCE),
        copernicus_source_stage_status="READY",
        copernicus_source_stage_sha256=stage_sha,
        copernicus_bounded_progress_accepted=False,
        regional_evidence_sha256=regional_sha,
    ))

rejected(lambda: build_document(
    targets=targets,
    required_pairs=required,
    records=records,
    acquired_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
))
rejected(lambda: build_record(
    part_id="P1",
    valid_time=iso(REFERENCE - timedelta(hours=1)),
    acquired_at=acquired_at,
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.5,
    toward_direction_deg=90,
    source_response_sha256=response_sha,
) and build_document(
    targets=targets,
    required_pairs=[{"partId": "P1", "validTime": iso(REFERENCE - timedelta(hours=1))}],
    records=[],
    acquired_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
))

print("OK: Open-Meteo current fallback is exact-residual, physical-scope bound and private.")
