#!/usr/bin/env python3
"""Targeted privacy, physics and exact-residual tests for Open-Meteo current."""
from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from http.client import IncompleteRead
import json
from pathlib import Path
import runpy
import tempfile
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from lib.copernicus_current import canonical_sha256, required_pairs_sha256
from lib.open_meteo_current_fallback import (
    CONTRACT_ID,
    DOCUMENT_SCHEMA_VERSION,
    OpenMeteoCurrentFallbackError,
    RECORD_SCHEMA_VERSION,
    build_document,
    build_record,
    merge_records,
    reusable_records,
    reusable_records_with_salvage,
    safe_projection,
    validate_checkpoint_document,
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


def runtime_rejected(callable_, expected_code: str) -> None:
    try:
        callable_()
    except RuntimeError as error:
        assert str(error) == expected_code
        return
    raise AssertionError(f"{expected_code} was not raised")


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
    checkpointed_at=acquired_at,
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
assert document["schemaVersion"] == DOCUMENT_SCHEMA_VERSION == 2
assert document["contractId"] == CONTRACT_ID
assert all(record["schemaVersion"] == RECORD_SCHEMA_VERSION == 1 for record in records)

# A v2 checkpoint preserves each record's original acquisition time. The
# document checkpoint time is metadata and cannot rejuvenate retained rows.
later_acquired_at = iso(REFERENCE + timedelta(minutes=35))
later_second_record = build_record(
    part_id="P1",
    valid_time=required[1]["validTime"],
    acquired_at=later_acquired_at,
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.6,
    toward_direction_deg=120,
    source_response_sha256=canonical_sha256({"fixture": "later-response"}),
)
mixed_document = build_document(
    targets=targets,
    required_pairs=required,
    records=[records[0], later_second_record],
    checkpointed_at=iso(REFERENCE + timedelta(minutes=40)),
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert mixed_document["oldestRecordAcquiredAt"] == acquired_at
assert mixed_document["newestRecordAcquiredAt"] == later_acquired_at
assert [row["acquiredAt"] for row in mixed_document["records"]] == [
    acquired_at, later_acquired_at,
]
assert validate_checkpoint_document(mixed_document, targets=targets) == mixed_document

next_reference = iso(REFERENCE + timedelta(hours=1))
next_required = [
    copy.deepcopy(required[1]),
    {"partId": "P1", "validTime": iso(REFERENCE + timedelta(hours=2))},
]
retained_for_next = reusable_records(
    mixed_document,
    targets=targets,
    required_pairs=next_required,
    production_reference_at=next_reference,
    checkpointed_at=iso(REFERENCE + timedelta(hours=1, minutes=10)),
)
assert retained_for_next == [later_second_record]
next_stage_sha = canonical_sha256({"fixture": "next-source-stage"})
next_regional_sha = canonical_sha256({"fixture": "next-regional"})
rebased = build_document(
    targets=targets,
    required_pairs=next_required,
    records=retained_for_next,
    checkpointed_at=iso(REFERENCE + timedelta(hours=1, minutes=10)),
    production_reference_at=next_reference,
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=next_stage_sha,
    copernicus_bounded_progress_accepted=True,
    regional_evidence_sha256=next_regional_sha,
)
assert rebased["status"] == "INCOMPLETE"
assert rebased["recordCount"] == 1 and rebased["missingPairCount"] == 1
assert rebased["records"][0]["recordId"] == later_second_record["recordId"]
assert rebased["records"][0]["acquiredAt"] == later_acquired_at
assert rebased["copernicusSourceStageSha256"] == next_stage_sha
assert rebased["regionalEvidenceSha256"] == next_regional_sha
rejected(lambda: validate_document(
    mixed_document,
    targets=targets,
    required_pairs=next_required,
    production_reference_at=next_reference,
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=next_stage_sha,
    copernicus_bounded_progress_accepted=True,
    regional_evidence_sha256=next_regional_sha,
    require_complete=False,
))

# Acquisition age never turns a structurally valid future record into missing.
boundary_pairs = [
    {"partId": "P1", "validTime": iso(REFERENCE + timedelta(hours=4))},
    {"partId": "P1", "validTime": iso(REFERENCE + timedelta(hours=5))},
]
boundary_records = [
    build_record(
        part_id="P1",
        valid_time=pair["validTime"],
        acquired_at=iso(REFERENCE),
        sampling_point=[10.0, 55.0],
        grid_point=[10.0, 55.0],
        speed_mps=0.4,
        toward_direction_deg=45,
        source_response_sha256=canonical_sha256({
            "fixture": "freshness-boundary", "index": index,
        }),
    )
    for index, pair in enumerate(boundary_pairs)
]
boundary_document = build_document(
    targets=targets,
    required_pairs=boundary_pairs,
    records=boundary_records,
    checkpointed_at=iso(REFERENCE),
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert reusable_records(
    boundary_document,
    targets=targets,
    required_pairs=[boundary_pairs[0]],
    production_reference_at=iso(REFERENCE + timedelta(hours=4)),
    checkpointed_at=iso(REFERENCE + timedelta(hours=4)),
) == [boundary_records[0]]
assert reusable_records(
    boundary_document,
    targets=targets,
    required_pairs=[boundary_pairs[1]],
    production_reference_at=iso(REFERENCE + timedelta(hours=5)),
    checkpointed_at=iso(REFERENCE + timedelta(hours=5)),
) == [boundary_records[1]]

# validTime expiration remains a hard availability boundary.
rejected(lambda: reusable_records(
    boundary_document,
    targets=targets,
    required_pairs=[boundary_pairs[0]],
    production_reference_at=iso(REFERENCE + timedelta(hours=5)),
    checkpointed_at=iso(REFERENCE + timedelta(hours=5)),
))

# Exact target-registry binding is mandatory even when the pair id survives.
changed_targets = copy.deepcopy(targets)
changed_targets[0]["waterPoint"] = [10.001, 55.0]
rejected(lambda: reusable_records(
    mixed_document,
    targets=changed_targets,
    required_pairs=next_required,
    production_reference_at=next_reference,
    checkpointed_at=iso(REFERENCE + timedelta(hours=1, minutes=10)),
))

# Newer acquisitions win. Equal-time divergent revisions are ambiguous and
# leave the exact pair missing; byte-identical duplicates are harmless.
newer_record = build_record(
    part_id="P1",
    valid_time=required[0]["validTime"],
    acquired_at=iso(REFERENCE + timedelta(minutes=50)),
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.7,
    toward_direction_deg=180,
    source_response_sha256=canonical_sha256({"fixture": "newest"}),
)
selected, conflicts = merge_records([records[0]], [newer_record])
assert selected == [newer_record] and conflicts == 0
selected, conflicts = merge_records([newer_record], [copy.deepcopy(newer_record)])
assert selected == [newer_record] and conflicts == 0
fractionally_newer_record = build_record(
    part_id="P1",
    valid_time=required[0]["validTime"],
    acquired_at=iso(
        REFERENCE + timedelta(minutes=50, microseconds=100000)
    ),
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.4,
    toward_direction_deg=45,
    source_response_sha256=canonical_sha256({
        "fixture": "fractionally-newer",
    }),
)
selected, conflicts = merge_records(
    [newer_record], [fractionally_newer_record],
)
assert selected == [fractionally_newer_record] and conflicts == 0
conflicting_record = build_record(
    part_id="P1",
    valid_time=required[0]["validTime"],
    acquired_at=newer_record["acquiredAt"],
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.8,
    toward_direction_deg=180,
    source_response_sha256=canonical_sha256({"fixture": "conflict"}),
)
selected, conflicts = merge_records([newer_record], [conflicting_record])
assert selected == [] and conflicts == 1

tampered_checkpoint = copy.deepcopy(mixed_document)
tampered_checkpoint["records"][0]["uMps"] = 999
tampered_checkpoint["documentSha256"] = canonical_sha256({
    key: value for key, value in tampered_checkpoint.items()
    if key != "documentSha256"
})
rejected(lambda: validate_checkpoint_document(
    tampered_checkpoint, targets=targets,
))

# A tampered record is now isolated: the unrelated positive survives, while
# the affected pair is explicit missing input for the current fetch queue.
salvaged_records, salvage = reusable_records_with_salvage(
    tampered_checkpoint,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    checkpointed_at=iso(REFERENCE + timedelta(hours=1)),
)
assert salvaged_records == [later_second_record]
assert salvage == {
    "salvaged": True,
    "droppedRecordCount": 1,
    "droppedPairCount": 1,
    "ignoredRecordCount": 0,
}
salvaged_document = build_document(
    targets=targets,
    required_pairs=required,
    records=salvaged_records,
    checkpointed_at=iso(REFERENCE + timedelta(hours=1)),
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert salvaged_document["recordCount"] == 1
assert salvaged_document["missingPairs"] == [required[0]]
assert validate_document(
    salvaged_document,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
    require_complete=False,
)

# Schema/contract/container and target-registry corruption is not salvageable.
for malformed_top in (
    {**copy.deepcopy(mixed_document), "kind": "WRONG"},
    {**copy.deepcopy(mixed_document), "records": {}},
    {
        **copy.deepcopy(mixed_document),
        "targetRegistrySha256": canonical_sha256({"wrong": "registry"}),
    },
):
    rejected(lambda malformed_top=malformed_top: reusable_records_with_salvage(
        malformed_top,
        targets=targets,
        required_pairs=required,
        production_reference_at=iso(REFERENCE),
        checkpointed_at=iso(REFERENCE + timedelta(hours=1)),
    ))

progress_document = build_document(
    targets=targets,
    required_pairs=required,
    records=records,
    checkpointed_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=True,
    regional_evidence_sha256=regional_sha,
)
validated_progress = validate_document(
    progress_document,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="IN_PROGRESS",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=True,
    regional_evidence_sha256=regional_sha,
)
assert validated_progress["copernicusSourceStageStatus"] == "IN_PROGRESS"
assert validated_progress["copernicusBoundedProgressAccepted"] is True

not_applicable_document = build_document(
    targets=targets,
    required_pairs=required,
    records=records,
    checkpointed_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="NOT_APPLICABLE",
    copernicus_source_stage_sha256=None,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
assert validate_document(
    not_applicable_document,
    targets=targets,
    required_pairs=required,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="NOT_APPLICABLE",
    copernicus_source_stage_sha256=None,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)["copernicusSourceStageStatus"] == "NOT_APPLICABLE"

for status, source_stage_sha256, bounded_progress in (
    ("READY", stage_sha, True),
    ("READY", None, False),
    ("IN_PROGRESS", stage_sha, False),
    ("IN_PROGRESS", None, True),
    ("NOT_APPLICABLE", stage_sha, False),
    ("NOT_APPLICABLE", None, True),
    ("UNKNOWN", stage_sha, False),
):
    rejected(lambda status=status, source_stage_sha256=source_stage_sha256,
             bounded_progress=bounded_progress: build_document(
        targets=targets,
        required_pairs=required,
        records=records,
        checkpointed_at=acquired_at,
        production_reference_at=iso(REFERENCE),
        copernicus_source_stage_status=status,
        copernicus_source_stage_sha256=source_stage_sha256,
        copernicus_bounded_progress_accepted=bounded_progress,
        regional_evidence_sha256=regional_sha,
    ))

incomplete = build_document(
    targets=targets,
    required_pairs=required,
    records=records[:1],
    checkpointed_at=acquired_at,
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
    checkpointed_at=acquired_at,
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
))

cli = runpy.run_path(str(Path(__file__).with_name("fill-open-meteo-current-fallback.py")))

with tempfile.TemporaryDirectory(prefix="ravradar-open-meteo-cache-") as raw_folder:
    unparseable_path = Path(raw_folder) / "progress.json"
    unparseable_path.write_text("{", encoding="utf-8")
    runtime_rejected(
        lambda: cli["read_optional_progress"](unparseable_path),
        "OPEN_METEO_CACHE_UNPARSEABLE",
    )
    assert unparseable_path.read_text(encoding="utf-8") == "{"

# A reusable partial Copernicus stage is an upstream availability checkpoint,
# not an all-or-nothing gate. Recompute its exact shadow residual, pass that
# through regional DMI, and give Open-Meteo only what remains.
partial_stage = {
    "status": "IN_PROGRESS",
    "productionReferenceAt": iso(REFERENCE),
    "missingPairCount": len(required),
    "missingPairsSha256": required_pairs_sha256(required),
}
dmi_sha = canonical_sha256({"fixture": "partial-dmi"})
copernicus_sha = canonical_sha256({"fixture": "partial-copernicus"})
partial_registry = {
    "dmiCurrentInputSha256": dmi_sha,
    "operationalRangeEndAt": iso(REFERENCE + timedelta(hours=117)),
    "operationalRequiredPairs": copy.deepcopy(required),
}
captured_partial_residual = {}

def fake_regional_plan(**kwargs):
    captured_partial_residual["pairs"] = copy.deepcopy(
        kwargs["residual_pairs"]
    )
    return {
        "openMeteoRequiredPairs": [copy.deepcopy(required[1])],
        "regionalPrivate": {
            "fixture": "regional-partial",
            "consumedPairs": [copy.deepcopy(required[0])],
        },
        "regionalDiagnostics": {
            "shadowHeaderQuarantined": True,
            "quarantinedAnchorOrSampleCount": 2,
            "quarantineCodes": {"PRIVATE_FIXTURE_CODE": 2},
        },
    }

with patch.dict(cli["residual_plan"].__globals__, {
    "validate_target_registry": lambda value: value,
    "file_sha256": lambda path: (
        dmi_sha if Path(path).name == "dmi.json" else copernicus_sha
    ),
    "validate_shadow": lambda value, *_args, **_kwargs: value,
    "validate_reusable_source_stage": (
        lambda *_args, **_kwargs: partial_stage
    ),
    "current_attestation_authorization_from_operational_ledger": (
        lambda _ledger: (set(), set())
    ),
    "canonical_verified_part_current_attestation": (
        lambda *_args, **_kwargs: {"fixture": "availability-attestation"}
    ),
    "select_required_records": (
        lambda *_args, **_kwargs: ([], copy.deepcopy(required))
    ),
    "build_regional_residual_plan": fake_regional_plan,
}):
    partial_plan = cli["residual_plan"](
        targets=targets,
        dmi={"diagnostics": {"currentOperationalLedger": {
            "fixture": "partial-ledger",
        }}},
        registry=partial_registry,
        copernicus={"fixture": "partial-shadow"},
        source_stage=partial_stage,
        regional={"fixture": "regional-shadow"},
        policy={"fixture": "regional-policy"},
        reference=iso(REFERENCE),
        copernicus_path=Path("copernicus.json"),
        dmi_path=Path("dmi.json"),
    )

assert captured_partial_residual["pairs"] == required
assert partial_plan["requiredPairs"] == [required[1]]
assert partial_plan["sourceStageStatus"] == "IN_PROGRESS"
assert partial_plan["sourceStageSha256"] == canonical_sha256(partial_stage)
assert partial_plan["boundedProgressAccepted"] is True
assert partial_plan["regionalDiagnostics"] == {
    "shadowHeaderQuarantined": True,
    "quarantinedAnchorOrSampleCount": 2,
    "quarantineCodes": {"PRIVATE_FIXTURE_CODE": 2},
}

safe_nested = type(
    "SafeNestedError",
    (Exception,),
    {"cause_code": "SHADOW_SOURCE_ASSET_HASH_MISMATCH"},
)()
unsafe_nested = type(
    "UnsafeNestedError",
    (Exception,),
    {"cause_code": "private detail: part-id"},
)()
assert cli["residual_plan_error_code"](safe_nested) == (
    "OPEN_METEO_RESIDUAL_PLAN_INVALID_SHADOW_SOURCE_ASSET_HASH_MISMATCH"
)
assert cli["residual_plan_error_code"](unsafe_nested) == "OPEN_METEO_RESIDUAL_PLAN_INVALID"

captured_query = {}
def fake_request_json(url, _timeout_seconds, _deadline):
    captured_query.update(parse_qs(urlparse(url).query))
    return {
        "latitude": 55.0,
        "longitude": 10.0,
        "utc_offset_seconds": 0,
        "timezone": "GMT",
        "hourly_units": {
            "time": "iso8601",
            "ocean_current_velocity": "m/s",
            "ocean_current_direction": "°",
        },
        "hourly": {
            "time": ["2026-09-05T01:00"],
            "ocean_current_velocity": [0.05],
            "ocean_current_direction": [90],
        },
    }

cli["fetch_records"].__globals__["request_json"] = fake_request_json
fetched = cli["fetch_records"](
    [required[0]], {"P1": targets[0]}, acquired_at, 30, 240,
)
assert captured_query["wind_speed_unit"] == ["ms"]
assert "velocity_unit" not in captured_query
assert len(fetched) == 1 and fetched[0]["speedMps"] == 0.05

def wrong_unit_response(url, timeout_seconds, deadline):
    response = fake_request_json(url, timeout_seconds, deadline)
    response["hourly_units"]["ocean_current_velocity"] = "km/h"
    return response

with patch.dict(cli["fetch_records"].__globals__, {
    "request_json": wrong_unit_response,
}):
    assert cli["fetch_records"](
        [required[0]], {"P1": targets[0]}, acquired_at, 30, 240,
    ) == []


def response_payload(target, *, times=None, speeds=None, directions=None):
    times = [iso(REFERENCE)] if times is None else times
    speeds = [0.05] * len(times) if speeds is None else speeds
    directions = [90] * len(times) if directions is None else directions
    return {
        "latitude": target["waterPoint"][1],
        "longitude": target["waterPoint"][0],
        "utc_offset_seconds": 0,
        "timezone": "GMT",
        "hourly_units": {
            "time": "iso8601",
            "ocean_current_velocity": "m/s",
            "ocean_current_direction": "°",
        },
        "hourly": {
            "time": times,
            "ocean_current_velocity": speeds,
            "ocean_current_direction": directions,
        },
    }


class FakeClock:
    def __init__(self):
        self.value = 100.0
        self.sleeps = []

    def monotonic(self):
        return self.value

    def sleep(self, seconds):
        self.sleeps.append(seconds)
        self.value += seconds


isolation_targets = [{
    "partId": f"I{index}",
    "parentZoneId": "ZI",
    "name": f"Isolation {index}",
    "waterPoint": [10.0 + index / 100, 55.0],
} for index in range(1, 7)]
isolation_target_map = {
    target["partId"]: target for target in isolation_targets
}
first_hour = iso(REFERENCE)
second_hour = iso(REFERENCE + timedelta(hours=1))
isolation_required = sorted([
    *[
        {"partId": target["partId"], "validTime": first_hour}
        for target in isolation_targets
    ],
    {"partId": "I5", "validTime": second_hour},
], key=lambda row: (row["validTime"], row["partId"]))
mixed_payloads = [
    response_payload(isolation_targets[0]),
    response_payload(isolation_targets[1]),
    response_payload(isolation_targets[2]),
    response_payload(isolation_targets[3]),
    response_payload(
        isolation_targets[4],
        times=[first_hour, second_hour],
        directions=[361, 90],
    ),
    response_payload(isolation_targets[5]),
]
mixed_payloads[1]["hourly_units"]["ocean_current_velocity"] = "km/h"
mixed_payloads[2]["timezone"] = "UTC"
mixed_payloads[3]["nonCanonicalNumber"] = float("nan")

with patch.dict(cli["fetch_records"].__globals__, {
    "request_json": lambda *_args: copy.deepcopy(mixed_payloads),
}):
    isolated_records = cli["fetch_records"](
        isolation_required, isolation_target_map, acquired_at, 30, 240,
    )

assert [
    (record["partId"], record["validTime"]) for record in isolated_records
] == [
    ("I1", first_hour),
    ("I6", first_hour),
    ("I5", second_hour),
]

# Duplicate response times are ambiguous and quarantine that payload.
duplicate_payload = response_payload(
    isolation_targets[0],
    times=[first_hour, first_hour],
    speeds=[0.05, 0.06],
    directions=[90, 90],
)
with patch.dict(cli["fetch_records"].__globals__, {
    "request_json": lambda *_args: duplicate_payload,
}):
    assert cli["fetch_records"](
        [isolation_required[0]],
        {"I1": isolation_target_map["I1"]},
        acquired_at,
        30,
        240,
    ) == []

# Request and response-cardinality failures reject only their exact batch.
batch_targets = isolation_targets[:4]
batch_target_map = {
    target["partId"]: target for target in batch_targets
}
batch_required = [
    {"partId": target["partId"], "validTime": first_hour}
    for target in batch_targets
]
batch_calls = []
batch_sequence = [0, 1, 2, 3, 1, 2]
batch_clock = FakeClock()


def locally_failing_request(*_args):
    index = len(batch_calls)
    target_index = batch_sequence[index]
    batch_calls.append(target_index)
    if index == 1:
        raise RuntimeError("OPEN_METEO_REQUEST_FAILED")
    if index == 2:
        return []
    return response_payload(batch_targets[target_index])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": locally_failing_request,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=batch_clock.monotonic,
), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=batch_clock.sleep,
):
    batch_local_records = cli["fetch_records"](
        batch_required, batch_target_map, acquired_at, 30, 240,
    )

assert [record["partId"] for record in batch_local_records] == [
    "I1", "I2", "I3", "I4",
]
assert batch_calls == [0, 1, 2, 3, 1, 2]
assert batch_clock.sleeps == [1]

# A truncated HTTP body is supplier-local: the failed first batch is requeued,
# the later batch checkpoints, and the retry converges without losing it.
incomplete_calls = []
incomplete_checkpoints = []
incomplete_diagnostics = {}
incomplete_clock = FakeClock()
incomplete_sequence = [
    None,
    response_payload(batch_targets[1]),
    response_payload(batch_targets[0]),
]


class SequencedHttpResponse:
    status = 200

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        if self.payload is None:
            raise IncompleteRead(b"{", 32)
        return json.dumps(self.payload).encode("utf-8")


def incomplete_urlopen(_request, *, timeout):
    assert timeout >= 1
    payload = incomplete_sequence[len(incomplete_calls)]
    incomplete_calls.append(payload)
    return SequencedHttpResponse(payload)


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": cli["request_json"],
    "urlopen": incomplete_urlopen,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=incomplete_clock.monotonic,
), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=incomplete_clock.sleep,
):
    incomplete_records = cli["fetch_records"](
        batch_required[:2],
        batch_target_map,
        acquired_at,
        30,
        240,
        checkpoint=lambda rows, _stats: incomplete_checkpoints.append([
            row["partId"] for row in rows
        ]),
        diagnostics=incomplete_diagnostics,
    )

assert [row["partId"] for row in incomplete_records] == ["I1", "I2"]
assert len(incomplete_calls) == 3
assert incomplete_checkpoints == [["I2"], ["I1", "I2"]]
assert incomplete_diagnostics["batchAttemptCount"] == 3
assert incomplete_diagnostics["batchCompletedCount"] == 2
assert incomplete_diagnostics["batchUnresolvedCount"] == 0
assert incomplete_clock.sleeps == [1]


def requested_part_ids(url, candidates):
    query = parse_qs(urlparse(url).query)
    longitudes = [float(value) for value in query["longitude"][0].split(",")]
    latitudes = [float(value) for value in query["latitude"][0].split(",")]
    part_by_point = {
        tuple(target["waterPoint"]): target["partId"]
        for target in candidates
    }
    return [
        part_by_point[(longitude, latitude)]
        for longitude, latitude in zip(longitudes, latitudes)
    ], query["start_hour"][0], query["end_hour"][0]


# A successful subset of a same-cardinality multi-location response is
# checkpointed immediately. The next request contains only the exact unresolved
# part/hour; already accepted siblings and hours are never fetched again.
partial_targets = batch_targets[:2]
partial_target_map = {
    target["partId"]: target for target in partial_targets
}
partial_required = [
    {"partId": target["partId"], "validTime": valid_time}
    for target in partial_targets
    for valid_time in (first_hour, second_hour)
]
partial_calls = []
partial_checkpoints = []
partial_diagnostics = {}


def partial_request(url, *_args):
    part_ids, start_hour, end_hour = requested_part_ids(
        url, partial_targets,
    )
    partial_calls.append((part_ids, start_hour, end_hour))
    if len(partial_calls) == 1:
        assert part_ids == ["I1", "I2"]
        return [
            response_payload(
                partial_targets[0],
                times=[first_hour, second_hour],
            ),
            response_payload(partial_targets[1], times=[first_hour]),
        ]
    assert part_ids == ["I2"]
    return response_payload(partial_targets[1], times=[second_hour])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": partial_request,
}):
    partial_records = cli["fetch_records"](
        partial_required,
        partial_target_map,
        acquired_at,
        30,
        240,
        checkpoint=lambda rows, _stats: partial_checkpoints.append(
            copy.deepcopy(rows)
        ),
        diagnostics=partial_diagnostics,
    )

assert len(partial_calls) == 2
assert partial_calls[1] == (
    ["I2"],
    second_hour.removesuffix("Z"),
    second_hour.removesuffix("Z"),
)
assert [len(rows) for rows in partial_checkpoints] == [3, 4]
assert {
    (row["partId"], row["validTime"])
    for row in partial_checkpoints[0]
} == {
    ("I1", first_hour),
    ("I1", second_hour),
    ("I2", first_hour),
}
assert {
    (row["partId"], row["validTime"])
    for row in partial_records
} == {
    (target["partId"], valid_time)
    for target in partial_targets
    for valid_time in (first_hour, second_hour)
}
assert partial_diagnostics["batchAttemptCount"] == 2
assert partial_diagnostics["batchCompletedCount"] == 1
assert partial_diagnostics["batchUnresolvedCount"] == 0
assert partial_diagnostics["partialResponseBatchCount"] == 1
assert partial_diagnostics["pairHourMissingCount"] == 1
assert partial_diagnostics["adaptiveSplitCount"] == 0
assert partial_diagnostics["unresolvedPartCount"] == 0
assert partial_diagnostics["unresolvedPairCount"] == 0

# A cardinality mismatch is never positionally accepted. It is split
# breadth-first until each response can be bound unambiguously.
cardinality_targets = batch_targets
cardinality_target_map = batch_target_map
cardinality_calls = []
cardinality_checkpoints = []
cardinality_diagnostics = {}


def cardinality_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, cardinality_targets,
    )
    cardinality_calls.append(part_ids)
    if part_ids == ["I1", "I2", "I3", "I4"]:
        return [
            response_payload(cardinality_target_map[part_id])
            for part_id in part_ids[:3]
        ]
    if part_ids == ["I3", "I4"]:
        return [response_payload(cardinality_target_map["I3"])]
    payloads = [
        response_payload(cardinality_target_map[part_id])
        for part_id in part_ids
    ]
    return payloads[0] if len(payloads) == 1 else payloads


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": cardinality_request,
}):
    cardinality_records = cli["fetch_records"](
        batch_required,
        cardinality_target_map,
        acquired_at,
        30,
        240,
        checkpoint=lambda rows, _stats: cardinality_checkpoints.append([
            row["partId"] for row in rows
        ]),
        diagnostics=cardinality_diagnostics,
    )

assert cardinality_calls == [
    ["I1", "I2", "I3", "I4"],
    ["I1", "I2"],
    ["I3", "I4"],
    ["I3"],
    ["I4"],
]
assert cardinality_checkpoints == [
    ["I1", "I2"],
    ["I1", "I2", "I3"],
    ["I1", "I2", "I3", "I4"],
]
assert [row["partId"] for row in cardinality_records] == [
    "I1", "I2", "I3", "I4",
]
assert cardinality_diagnostics["responseCardinalityInvalidBatchCount"] == 2
assert cardinality_diagnostics["adaptiveSplitCount"] == 2
assert cardinality_diagnostics["batchAttemptCount"] == 5
assert cardinality_diagnostics["batchCompletedCount"] == 1
assert cardinality_diagnostics["batchUnresolvedCount"] == 0

# Retry-After from a retryable 429 is bounded and recorded without a real
# sleep. The provider error text and request URL never enter diagnostics.
retry_after_calls = []
retry_after_clock = FakeClock()
retry_after_diagnostics = {}


class RetryAfterHttpResponse:
    def __init__(self, status, payload=None, headers=None):
        self.status = status
        self.payload = payload
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def retry_after_urlopen(request, *, timeout):
    assert timeout >= 1
    retry_after_calls.append(request.full_url)
    if len(retry_after_calls) == 1:
        return RetryAfterHttpResponse(
            429,
            headers={"Retry-After": "7", "X-Private": "never-log-this"},
        )
    return RetryAfterHttpResponse(
        200, response_payload(batch_targets[0]),
    )


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": cli["request_json"],
    "urlopen": retry_after_urlopen,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=retry_after_clock.monotonic,
), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=retry_after_clock.sleep,
):
    retry_after_records = cli["fetch_records"](
        [batch_required[0]],
        {"I1": batch_target_map["I1"]},
        acquired_at,
        30,
        240,
        diagnostics=retry_after_diagnostics,
    )

assert [row["partId"] for row in retry_after_records] == ["I1"]
assert len(retry_after_calls) == 2
assert retry_after_clock.sleeps == [7]
assert retry_after_diagnostics["httpRetryableBatchCount"] == 1
assert retry_after_diagnostics["transportRetryableBatchCount"] == 0
assert retry_after_diagnostics["httpPermanentBatchCount"] == 0
assert retry_after_diagnostics["retrySleepSeconds"] == 7
assert retry_after_diagnostics["batchAttemptCount"] == 2
assert retry_after_diagnostics["batchUnresolvedCount"] == 0
assert "never-log-this" not in repr(retry_after_diagnostics)
assert all(url not in repr(retry_after_diagnostics) for url in retry_after_calls)
retry_date_now = datetime(2026, 9, 5, 1, tzinfo=timezone.utc)
retry_date_value = (retry_date_now + timedelta(seconds=9)).strftime(
    "%a, %d %b %Y %H:%M:%S GMT"
)
assert cli["retry_after_seconds"](
    {"Retry-After": retry_date_value}, now=retry_date_now,
) == 9

# A permanent provider failure is split down to one bad singleton. Successful
# siblings remain checkpointed, and permanent failures never sleep.
permanent_calls = []
permanent_sleeps = []
permanent_checkpoints = []
permanent_diagnostics = {}


def permanent_isolation_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, batch_targets,
    )
    permanent_calls.append(part_ids)
    if part_ids in (
        ["I1", "I2", "I3", "I4"],
        ["I3", "I4"],
        ["I4"],
    ):
        raise cli["OpenMeteoRequestFailure"](
            "OPEN_METEO_REQUEST_FAILED",
            retryable=False,
            http=True,
        )
    payloads = [
        response_payload(batch_target_map[part_id])
        for part_id in part_ids
    ]
    return payloads[0] if len(payloads) == 1 else payloads


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": permanent_isolation_request,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=lambda seconds: permanent_sleeps.append(seconds),
):
    permanent_records = cli["fetch_records"](
        batch_required,
        batch_target_map,
        acquired_at,
        30,
        240,
        checkpoint=lambda rows, _stats: permanent_checkpoints.append([
            row["partId"] for row in rows
        ]),
        diagnostics=permanent_diagnostics,
    )

assert permanent_calls == [
    ["I1", "I2", "I3", "I4"],
    ["I1", "I2"],
    ["I3", "I4"],
    ["I3"],
    ["I4"],
]
assert [row["partId"] for row in permanent_records] == [
    "I1", "I2", "I3",
]
assert permanent_checkpoints == [
    ["I1", "I2"],
    ["I1", "I2", "I3"],
]
assert permanent_sleeps == []
assert permanent_diagnostics["httpPermanentBatchCount"] == 3
assert permanent_diagnostics["adaptiveSplitCount"] == 2
assert permanent_diagnostics["batchAttemptCount"] == 5
assert permanent_diagnostics["batchCompletedCount"] == 0
assert permanent_diagnostics["batchUnresolvedCount"] == 1
assert permanent_diagnostics["unresolvedPartCount"] == 1
assert permanent_diagnostics["unresolvedPairCount"] == 1

# Binary isolation must continue beyond the old three-round ceiling. One bad
# eighth sibling cannot strand any of the seven healthy locations.
deep_targets = [{
    "partId": f"D{index}",
    "parentZoneId": "ZD",
    "name": f"Deep {index}",
    "waterPoint": [11.0 + index / 1000, 55.0],
} for index in range(1, 9)]
deep_target_map = {target["partId"]: target for target in deep_targets}
deep_required = [{
    "partId": target["partId"],
    "validTime": first_hour,
} for target in deep_targets]
deep_calls = []
deep_diagnostics = {}


def deep_poison_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, deep_targets,
    )
    deep_calls.append(part_ids)
    if "D8" in part_ids:
        if len(part_ids) == 1:
            return []
        return [
            response_payload(deep_target_map[part_id])
            for part_id in part_ids[:-1]
        ]
    payloads = [
        response_payload(deep_target_map[part_id])
        for part_id in part_ids
    ]
    return payloads[0] if len(payloads) == 1 else payloads


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": deep_poison_request,
}):
    deep_records = cli["fetch_records"](
        deep_required,
        deep_target_map,
        acquired_at,
        30,
        240,
        diagnostics=deep_diagnostics,
    )

assert deep_calls == [
    ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
    ["D1", "D2", "D3", "D4"],
    ["D5", "D6", "D7", "D8"],
    ["D5", "D6"],
    ["D7", "D8"],
    ["D7"],
    ["D8"],
    ["D8"],
]
assert [row["partId"] for row in deep_records] == [
    f"D{index}" for index in range(1, 8)
]
assert deep_diagnostics["adaptiveSplitCount"] == 3
assert deep_diagnostics["batchAttemptCount"] == 8
assert deep_diagnostics["batchUnresolvedCount"] == 1
assert deep_diagnostics["unresolvedWorkItemCount"] == 1
assert deep_diagnostics["unresolvedPairCount"] == 1

# The maximum 50-location provider batch also converges through a depth greater
# than three. Every split has at most two disjoint children, even when every
# part has a distinct unresolved time signature.
wide_targets = [{
    "partId": f"W{index:02d}",
    "parentZoneId": "ZW",
    "name": f"Wide {index}",
    "waterPoint": [12.0 + index / 1000, 55.0],
} for index in range(1, 51)]
wide_target_map = {target["partId"]: target for target in wide_targets}
wide_required = [{
    "partId": target["partId"],
    "validTime": first_hour,
} for target in wide_targets]
signature_work = {
    target["partId"]: [iso(REFERENCE + timedelta(hours=index))]
    for index, target in enumerate(wide_targets)
}
signature_children = cli["split_unresolved_work"](signature_work)
assert len(signature_children) == 2
signature_parent_keys = cli["work_pair_keys"](signature_work)
signature_child_keys = [
    cli["work_pair_keys"](child) for child in signature_children
]
assert signature_child_keys[0].isdisjoint(signature_child_keys[1])
assert set().union(*signature_child_keys) == signature_parent_keys

wide_calls = []
wide_diagnostics = {}


def wide_last_sibling_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, wide_targets,
    )
    wide_calls.append(part_ids)
    if "W50" in part_ids and len(part_ids) > 1:
        return [
            response_payload(wide_target_map[part_id])
            for part_id in part_ids[:-1]
        ]
    payloads = [
        response_payload(wide_target_map[part_id])
        for part_id in part_ids
    ]
    return payloads[0] if len(payloads) == 1 else payloads


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": wide_last_sibling_request,
}):
    wide_records = cli["fetch_records"](
        wide_required,
        wide_target_map,
        acquired_at,
        30,
        240,
        diagnostics=wide_diagnostics,
    )

assert len(wide_records) == 50
assert wide_calls[0] == [f"W{index:02d}" for index in range(1, 51)]
assert wide_calls[-1] == ["W50"]
assert len(wide_calls) == 13
assert [len(call) for call in wide_calls] == [
    50, 25, 25, 12, 13, 6, 7, 3, 4, 2, 2, 1, 1,
]
assert all(1 <= len(call) <= 50 for call in wide_calls)
assert wide_diagnostics["adaptiveSplitCount"] == 6
assert wide_diagnostics["batchAttemptCount"] == 13
assert wide_diagnostics["batchUnresolvedCount"] == 0
assert wide_diagnostics["unresolvedPairCount"] == 0

# Isolation also descends through the time axis. A single poisoned hour leaves
# only that exact pair unresolved; seven healthy hours are retained.
hour_required = [{
    "partId": "P1",
    "validTime": iso(REFERENCE + timedelta(hours=index)),
} for index in range(8)]
poison_hour = hour_required[-1]["validTime"]
hour_calls = []
hour_diagnostics = {}


def hour_poison_request(url, *_args):
    query = parse_qs(urlparse(url).query)
    start_value = datetime.fromisoformat(query["start_hour"][0]).replace(
        tzinfo=timezone.utc,
    )
    end_value = datetime.fromisoformat(query["end_hour"][0]).replace(
        tzinfo=timezone.utc,
    )
    requested_times = []
    cursor = start_value
    while cursor <= end_value:
        requested_times.append(iso(cursor))
        cursor += timedelta(hours=1)
    hour_calls.append(requested_times)
    if poison_hour in requested_times:
        return response_payload(targets[0], times=[])
    return response_payload(targets[0], times=requested_times)


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": hour_poison_request,
}):
    hour_records = cli["fetch_records"](
        hour_required,
        {"P1": targets[0]},
        acquired_at,
        30,
        240,
        diagnostics=hour_diagnostics,
    )

assert [row["validTime"] for row in hour_records] == [
    row["validTime"] for row in hour_required[:-1]
]
assert len(hour_calls) == 11
assert hour_calls[-1] == [poison_hour]
assert hour_diagnostics["adaptiveSplitCount"] == 3
assert hour_diagnostics["batchUnresolvedCount"] == 1
assert hour_diagnostics["unresolvedPairCount"] == 1

# Explicit request and queue caps never convert unattempted work into success.
attempt_cap_calls = []
attempt_cap_diagnostics = {}
attempt_cap_targets = batch_targets[:3]
attempt_cap_target_map = {
    target["partId"]: target for target in attempt_cap_targets
}
attempt_cap_required = batch_required[:3]


def attempt_cap_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, attempt_cap_targets,
    )
    attempt_cap_calls.append(part_ids)
    return response_payload(attempt_cap_target_map[part_ids[0]])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "MAX_TOTAL_REQUEST_ATTEMPTS": 2,
    "request_json": attempt_cap_request,
}):
    attempt_cap_records = cli["fetch_records"](
        attempt_cap_required,
        attempt_cap_target_map,
        acquired_at,
        30,
        240,
        diagnostics=attempt_cap_diagnostics,
    )

assert attempt_cap_calls == [["I1"], ["I2"]]
assert [row["partId"] for row in attempt_cap_records] == ["I1", "I2"]
assert attempt_cap_diagnostics["attemptBudgetReached"] is True
assert attempt_cap_diagnostics["runtimeBudgetReached"] is False
assert attempt_cap_diagnostics["batchUnresolvedCount"] == 1
assert attempt_cap_diagnostics["unresolvedPairCount"] == 1

queue_cap_diagnostics = {}
with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "MAX_PENDING_WORK_ITEMS": 1,
    "request_json": lambda *_args: [],
}):
    assert cli["fetch_records"](
        batch_required,
        batch_target_map,
        acquired_at,
        30,
        240,
        diagnostics=queue_cap_diagnostics,
    ) == []

assert queue_cap_diagnostics["queueBudgetReached"] is True
assert queue_cap_diagnostics["batchAttemptCount"] == 1
assert queue_cap_diagnostics["adaptiveSplitCount"] == 0
assert queue_cap_diagnostics["batchUnresolvedCount"] == 1
assert queue_cap_diagnostics["unresolvedPairCount"] == 4

# Transport retries are per exact work item, not global rounds. A permanently
# failing first location is tried exactly three times while its healthy sibling
# still completes before the delayed retries.
transport_limit_calls = []
transport_limit_clock = FakeClock()
transport_limit_diagnostics = {}


def transport_limit_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, batch_targets[:2],
    )
    transport_limit_calls.append(part_ids)
    if part_ids == ["I1"]:
        raise cli["OpenMeteoRequestFailure"](
            "OPEN_METEO_REQUEST_FAILED",
            retryable=True,
        )
    return response_payload(batch_target_map[part_ids[0]])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": transport_limit_request,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=transport_limit_clock.monotonic,
), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=transport_limit_clock.sleep,
):
    transport_limit_records = cli["fetch_records"](
        batch_required[:2],
        batch_target_map,
        acquired_at,
        30,
        240,
        diagnostics=transport_limit_diagnostics,
    )

assert transport_limit_calls == [["I1"], ["I2"], ["I1"], ["I1"]]
assert [row["partId"] for row in transport_limit_records] == ["I2"]
assert transport_limit_clock.sleeps == [1, 2]
assert transport_limit_diagnostics["transportRetryableBatchCount"] == 3
assert transport_limit_diagnostics["batchAttemptCount"] == 4
assert transport_limit_diagnostics["batchUnresolvedCount"] == 1
assert transport_limit_diagnostics["unresolvedPairCount"] == 1

# An exhausted 429 still establishes provider-wide cooldown for a queued
# sibling; the per-item retry ceiling cannot cancel Retry-After.
exhausted_http_calls = []
exhausted_http_clock = FakeClock()
exhausted_http_diagnostics = {}


def exhausted_http_request(url, *_args):
    part_ids, _start_hour, _end_hour = requested_part_ids(
        url, batch_targets[:2],
    )
    exhausted_http_calls.append(part_ids)
    if part_ids == ["I1"]:
        raise cli["OpenMeteoRequestFailure"](
            "OPEN_METEO_REQUEST_FAILED",
            retryable=True,
            http=True,
            retry_after_seconds=7,
        )
    return response_payload(batch_target_map[part_ids[0]])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "MAX_TRANSPORT_ATTEMPTS": 1,
    "request_json": exhausted_http_request,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=exhausted_http_clock.monotonic,
), patch.object(
    cli["fetch_records"].__globals__["time"],
    "sleep",
    side_effect=exhausted_http_clock.sleep,
):
    exhausted_http_records = cli["fetch_records"](
        batch_required[:2],
        batch_target_map,
        acquired_at,
        30,
        240,
        diagnostics=exhausted_http_diagnostics,
    )

assert exhausted_http_calls == [["I1"], ["I2"]]
assert [row["partId"] for row in exhausted_http_records] == ["I2"]
assert exhausted_http_clock.sleeps == [7]
assert exhausted_http_diagnostics["httpRetryableBatchCount"] == 1
assert exhausted_http_diagnostics["batchUnresolvedCount"] == 1
assert exhausted_http_diagnostics["unresolvedPairCount"] == 1

# A global permanent provider/contract failure stops the family once, while a
# size-local permanent failure remains eligible for binary isolation.
global_failure_calls = []
global_failure_diagnostics = {}


def global_failure_urlopen(_request, *, timeout):
    assert timeout >= 1
    global_failure_calls.append(True)
    return RetryAfterHttpResponse(400)


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 50,
    "request_json": cli["request_json"],
    "urlopen": global_failure_urlopen,
}):
    assert cli["fetch_records"](
        batch_required,
        batch_target_map,
        acquired_at,
        30,
        240,
        diagnostics=global_failure_diagnostics,
    ) == []

assert len(global_failure_calls) == 1
assert global_failure_diagnostics["globalProviderFailure"] is True
assert global_failure_diagnostics["httpPermanentBatchCount"] == 1
assert global_failure_diagnostics["adaptiveSplitCount"] == 0
assert global_failure_diagnostics["unresolvedPairCount"] == 4

# The post-critical refresh queue preserves its oldest-first part order instead
# of reverting to the ordinary alphabetical critical-batch order.
priority_targets = [batch_targets[2], batch_targets[0], batch_targets[1]]
priority_required = [
    {"partId": target["partId"], "validTime": first_hour}
    for target in priority_targets
]
priority_calls = []


def priority_request(*_args):
    target = priority_targets[len(priority_calls)]
    priority_calls.append(target["partId"])
    return response_payload(target)


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": priority_request,
}):
    cli["fetch_records"](
        priority_required,
        batch_target_map,
        acquired_at,
        30,
        240,
        preserve_input_order=True,
    )

assert priority_calls == ["I3", "I1", "I2"]

# Exhausting the runtime budget between batches returns accumulated records.
deadline_targets = isolation_targets[:3]
deadline_target_map = {
    target["partId"]: target for target in deadline_targets
}
deadline_required = [
    {"partId": target["partId"], "validTime": first_hour}
    for target in deadline_targets
]
deadline_calls = []


def deadline_request(*_args):
    index = len(deadline_calls)
    deadline_calls.append(index)
    return response_payload(deadline_targets[index])


with patch.dict(cli["fetch_records"].__globals__, {
    "BATCH_SIZE": 1,
    "request_json": deadline_request,
}), patch.object(
    cli["fetch_records"].__globals__["time"],
    "monotonic",
    side_effect=[100.0, 100.0, 116.0],
):
    deadline_records = cli["fetch_records"](
        deadline_required, deadline_target_map, acquired_at, 30, 15,
    )

assert [record["partId"] for record in deadline_records] == ["I1"]
assert len(deadline_calls) == 1

# Main persists that partial result as an honest INCOMPLETE private document
# plus its privacy-safe projection.
main_writes = {}
main_write_history = []
main_prints = []
main_outputs = []
main_args = SimpleNamespace(
    targets=Path("targets.json"),
    dmi=Path("dmi.json"),
    registry=Path("registry.json"),
    copernicus=Path("copernicus.json"),
    source_stage=Path("source-stage.json"),
    regional=Path("regional.json"),
    policy=Path("policy.json"),
    output=Path("private.json"),
    report=Path("safe.json"),
    at=first_hour,
    timeout_seconds=30,
    runtime_seconds=15,
)


def capture_write(path, value):
    main_writes[path.name] = copy.deepcopy(value)
    main_write_history.append((path.name, copy.deepcopy(value)))


def main_fetch(_required, _targets, _acquired_at, _timeout, _runtime, *,
               checkpoint, diagnostics, deadline_monotonic,
               preserve_input_order=False):
    assert isinstance(deadline_monotonic, float)
    assert preserve_input_order is False
    stats = cli["initial_fetch_diagnostics"](3)
    stats.update({
        "batchAttemptCount": 1,
        "batchCompletedCount": 1,
        "batchUnresolvedCount": 2,
        "unresolvedWorkItemCount": 2,
        "retryRoundCount": 0,
        "conflictPairCount": 0,
        "runtimeBudgetReached": True,
        "unresolvedPartCount": 2,
        "unresolvedPairCount": 2,
    })
    diagnostics.update(stats)
    result = copy.deepcopy(deadline_records)
    checkpoint(result, stats)
    return result


with patch.dict(cli["main"].__globals__, {
    "arguments": lambda: main_args,
    "load_targets": lambda _path: copy.deepcopy(deadline_targets),
    "read_dmi_bulk_document": lambda _path: {},
    "read_object": lambda _path: {},
    "residual_plan": lambda **_kwargs: {
        "requiredPairs": copy.deepcopy(deadline_required),
        "sourceStageStatus": "READY",
        "sourceStageSha256": stage_sha,
        "boundedProgressAccepted": False,
        "regionalEvidenceSha256": regional_sha,
        "regionalDiagnostics": {
            "shadowHeaderQuarantined": True,
            "quarantinedAnchorOrSampleCount": 2,
            "quarantineCodes": {"PRIVATE_FIXTURE_CODE": 2},
        },
    },
    "canonical_now": lambda: acquired_at,
    "read_optional_progress": lambda _path: (None, "absent"),
    "fetch_records": main_fetch,
    "atomic_write": capture_write,
    "export_github_outputs": lambda value: main_outputs.append(copy.deepcopy(value)),
    "print": lambda value: main_prints.append(value),
}):
    assert cli["main"]() == 1

assert main_writes["private.json"]["status"] == "INCOMPLETE"
assert main_writes["private.json"]["recordCount"] == 1
assert main_writes["private.json"]["missingPairCount"] == 2
assert main_writes["safe.json"]["status"] == "INCOMPLETE"
assert "records" not in main_writes["safe.json"]
assert "missingPairs" not in main_writes["safe.json"]
assert [
    value["recordCount"] for name, value in main_write_history
    if name == "private.json"
] == [0, 1, 1]
assert main_outputs[0] == {"checkpoint_written": True}
assert main_outputs[-1]["checkpoint_written"] is True
assert main_outputs[-1]["retained_record_count"] == 0
assert main_outputs[-1]["fetched_record_count"] == 1
assert main_outputs[-1]["batch_unresolved_count"] == 2
assert main_prints == [
    "Open-Meteo current residual: required=3; filled=1; missing=2; "
    "retained=0; fetched=1; refreshed=0; criticalMissing=2; "
    "batchAttempts=1; batchCompleted=1; batchUnresolved=2; "
    "workUnresolved=2; "
    "checkpointWritten=true; cacheReuse=absent; "
    "regionalQuarantined=2; headerQuarantined=true.",
    "Open-Meteo safe rejection aggregates: unresolvedParts=2; "
    "unresolvedPairs=2; adaptiveSplits=0; partialResponses=0; "
    "transportRetryable=0; httpRetryable=0; httpPermanent=0; "
    "containerInvalid=0; cardinalityInvalid=0; "
    "payloadContractInvalid=0; payloadUnitsInvalid=0; "
    "payloadTimezoneInvalid=0; payloadGridDistanceInvalid=0; "
    "payloadTimeAxisInvalid=0; pairHourMissing=0; "
    "pairValueInvalid=0; pairBuildInvalid=0; retrySleepSeconds=0; "
    "runtimeBudgetReached=true; attemptBudgetReached=false; "
    "queueBudgetReached=false; globalProviderFailure=false."
]
assert "PRIVATE_FIXTURE_CODE" not in main_prints[0]

# Main reuses only the exact current overlap, fetches only the remaining tail,
# and rewrites the document against the new source-stage/regional bindings.
reuse_now = iso(REFERENCE + timedelta(hours=1, minutes=10))
reuse_new_record = build_record(
    part_id="P1",
    valid_time=next_required[1]["validTime"],
    acquired_at=reuse_now,
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.3,
    toward_direction_deg=270,
    source_response_sha256=canonical_sha256({"fixture": "reuse-fetch"}),
)
reuse_writes = {}
reuse_outputs = []
reuse_fetch_calls = []
reuse_args = copy.copy(main_args)
reuse_args.at = next_reference


def reuse_fetch(fetch_required, _targets, _acquired_at, _timeout, _runtime, *,
                checkpoint, diagnostics, deadline_monotonic,
                preserve_input_order=False):
    assert isinstance(deadline_monotonic, float)
    reuse_fetch_calls.append(copy.deepcopy(fetch_required))
    assert preserve_input_order is False
    assert fetch_required == [next_required[1]]
    stats = {
        "batchCount": 1,
        "batchAttemptCount": 1,
        "batchCompletedCount": 1,
        "batchUnresolvedCount": 0,
        "retryRoundCount": 0,
        "conflictPairCount": 0,
        "runtimeBudgetReached": False,
    }
    diagnostics.update(stats)
    checkpoint([copy.deepcopy(reuse_new_record)], stats)
    return [copy.deepcopy(reuse_new_record)]


with patch.dict(cli["main"].__globals__, {
    "arguments": lambda: reuse_args,
    "load_targets": lambda _path: copy.deepcopy(targets),
    "read_dmi_bulk_document": lambda _path: {},
    "read_object": lambda _path: {},
    "residual_plan": lambda **_kwargs: {
        "requiredPairs": copy.deepcopy(next_required),
        "sourceStageStatus": "IN_PROGRESS",
        "sourceStageSha256": next_stage_sha,
        "boundedProgressAccepted": True,
        "regionalEvidenceSha256": next_regional_sha,
        "regionalDiagnostics": {
            "shadowHeaderQuarantined": False,
            "quarantinedAnchorOrSampleCount": 0,
        },
    },
    "canonical_now": lambda: reuse_now,
    "read_optional_progress": lambda _path: (
        copy.deepcopy(mixed_document), "present",
    ),
    "fetch_records": reuse_fetch,
    "atomic_write": lambda path, value: reuse_writes.__setitem__(
        path.name, copy.deepcopy(value),
    ),
    "export_github_outputs": lambda value: reuse_outputs.append(
        copy.deepcopy(value)
    ),
    "print": lambda _value: None,
}):
    assert cli["main"]() == 0

reuse_final = reuse_writes["private.json"]
assert reuse_final["status"] == "COMPLETE"
assert reuse_final["copernicusSourceStageSha256"] == next_stage_sha
assert reuse_final["regionalEvidenceSha256"] == next_regional_sha
assert [row["recordId"] for row in reuse_final["records"]] == [
    later_second_record["recordId"], reuse_new_record["recordId"],
]
assert [row["acquiredAt"] for row in reuse_final["records"]] == [
    later_acquired_at, reuse_now,
]
assert reuse_outputs[-1]["retained_record_count"] == 1
assert reuse_outputs[-1]["fetched_record_count"] == 1
assert reuse_outputs[-1]["critical_fetched_record_count"] == 1
assert reuse_outputs[-1]["critical_missing_pair_count"] == 0
assert reuse_outputs[-1]["refresh_candidate_count"] == 0
assert reuse_outputs[-1]["refreshed_record_count"] == 0
assert reuse_outputs[-1]["refresh_attempted"] is False
assert reuse_outputs[-1]["missing_pair_count"] == 0
assert reuse_outputs[-1]["cache_reuse_status"] == "valid"
assert reuse_fetch_calls == [[next_required[1]]]

# A retained row younger than two reference-hours above caused no refresh.
# Once the same kind of row crosses the two-hour threshold, it is queued after
# the empty critical queue; an exhausted refresh leaves the donor byte-exact.
aged_pair = {
    "partId": "P1",
    "validTime": iso(REFERENCE + timedelta(hours=3)),
}
aged_record = build_record(
    part_id="P1",
    valid_time=aged_pair["validTime"],
    acquired_at=iso(REFERENCE),
    sampling_point=[10.0, 55.0],
    grid_point=[10.0, 55.0],
    speed_mps=0.25,
    toward_direction_deg=200,
    source_response_sha256=canonical_sha256({"fixture": "aged-donor"}),
)
aged_document = build_document(
    targets=targets,
    required_pairs=[aged_pair],
    records=[aged_record],
    checkpointed_at=iso(REFERENCE + timedelta(minutes=10)),
    production_reference_at=iso(REFERENCE),
    copernicus_source_stage_status="READY",
    copernicus_source_stage_sha256=stage_sha,
    copernicus_bounded_progress_accepted=False,
    regional_evidence_sha256=regional_sha,
)
aged_reference = iso(REFERENCE + timedelta(hours=3))
aged_now = iso(REFERENCE + timedelta(hours=3, minutes=10))
aged_args = copy.copy(main_args)
aged_args.at = aged_reference
aged_writes = {}
aged_outputs = []
aged_fetch_calls = []


def aged_fetch(fetch_required, _targets, _acquired_at, _timeout, _runtime, *,
               checkpoint, diagnostics, deadline_monotonic,
               preserve_input_order=False):
    assert isinstance(deadline_monotonic, float)
    aged_fetch_calls.append((copy.deepcopy(fetch_required), preserve_input_order))
    if not preserve_input_order:
        assert fetch_required == []
        stats = {
            "batchCount": 0,
            "batchAttemptCount": 0,
            "batchCompletedCount": 0,
            "batchUnresolvedCount": 0,
            "retryRoundCount": 0,
            "conflictPairCount": 0,
            "runtimeBudgetReached": False,
        }
    else:
        assert fetch_required == [aged_pair]
        stats = {
            "batchCount": 1,
            "batchAttemptCount": 3,
            "batchCompletedCount": 0,
            "batchUnresolvedCount": 1,
            "retryRoundCount": 2,
            "conflictPairCount": 0,
            "runtimeBudgetReached": False,
        }
    diagnostics.update(stats)
    return []


with patch.dict(cli["main"].__globals__, {
    "arguments": lambda: aged_args,
    "load_targets": lambda _path: copy.deepcopy(targets),
    "read_dmi_bulk_document": lambda _path: {},
    "read_object": lambda _path: {},
    "residual_plan": lambda **_kwargs: {
        "requiredPairs": [copy.deepcopy(aged_pair)],
        "sourceStageStatus": "IN_PROGRESS",
        "sourceStageSha256": next_stage_sha,
        "boundedProgressAccepted": True,
        "regionalEvidenceSha256": next_regional_sha,
        "regionalDiagnostics": {
            "shadowHeaderQuarantined": False,
            "quarantinedAnchorOrSampleCount": 0,
        },
    },
    "canonical_now": lambda: aged_now,
    "read_optional_progress": lambda _path: (
        copy.deepcopy(aged_document), "present",
    ),
    "fetch_records": aged_fetch,
    "atomic_write": lambda path, value: aged_writes.__setitem__(
        path.name, copy.deepcopy(value),
    ),
    "export_github_outputs": lambda value: aged_outputs.append(
        copy.deepcopy(value)
    ),
    "print": lambda _value: None,
}):
    assert cli["main"]() == 0

aged_final = aged_writes["private.json"]
assert aged_final["records"] == [aged_record]
assert aged_final["records"][0]["acquiredAt"] == aged_record["acquiredAt"]
assert aged_outputs[-1]["critical_missing_pair_count"] == 0
assert aged_outputs[-1]["refresh_candidate_count"] == 1
assert aged_outputs[-1]["refreshed_record_count"] == 0
assert aged_outputs[-1]["refresh_attempted"] is True
assert aged_fetch_calls == [([], False), ([aged_pair], True)]

# Budget and authoritative target guards remain globally strict.
runtime_rejected(
    lambda: cli["fetch_records"](
        [required[0]], {"P1": targets[0]}, acquired_at, 0, 240,
    ),
    "OPEN_METEO_TIMEOUT_BUDGET_INVALID",
)
runtime_rejected(
    lambda: cli["fetch_records"](
        [required[0]], {"P1": targets[0]}, acquired_at, 30, 14,
    ),
    "OPEN_METEO_RUNTIME_BUDGET_INVALID",
)
invalid_target = copy.deepcopy(targets[0])
invalid_target["waterPoint"] = [float("nan"), 55.0]
runtime_rejected(
    lambda: cli["fetch_records"](
        [required[0]], {"P1": invalid_target}, acquired_at, 30, 240,
    ),
    "OPEN_METEO_TARGET_POINT_INVALID",
)

print("OK: Open-Meteo current fallback is exact-residual, physical-scope bound and private.")
