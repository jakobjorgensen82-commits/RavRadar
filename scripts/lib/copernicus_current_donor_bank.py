"""Atomic Copernicus donors with original membership and persistent damage masks.

The control hash is independent of mutable vector leaves. An intact manifest
identifies the ORIGINAL pair/source when a leaf is damaged, even if its own
partId/time/id was changed. Salvage never trusts that damaged metadata.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .copernicus_current import (
    COPERNICUS_SOURCE_CONTRACTS, RETENTION_HOURS, PUBLIC_END_OFFSET_HOURS,
    TOP_LEVEL_FIELDS, _merge_cache_evidence_unvalidated,
    _validate_acquisition, _validate_record, canonical_sha256, empty_shadow,
    merge_cache_evidence, utc_iso, valid_sha256, validate_shadow,
)
from .copernicus_target_identity import target_fingerprint
from .copernicus_current_source_stage import (
    admission_policy_sha256, merge_positive_admissions,
    original_stage_positive_evidence, select_source_order_admissible_records,
    stage_positive_evidence, validate_positive_admissions,
)

DEFAULT_DONOR_BANK = Path(".cache/copernicus-current-donor-bank.json")
BANK_KIND = "RAVRADAR_PRIVATE_COPERNICUS_CURRENT_DONOR_BANK"
BANK_CONTRACT = "copernicus-current-atomic-manifest-donor-bank-v1"
BANK_MAX_BYTES = 1024 * 1024 * 1024
BANK_FIELDS = {"schemaVersion", "kind", "contractId", "targetRegistrySha256",
               "shadow", "positiveAdmissions", "admissionAttempts",
               "admissionPolicySha256", "manifest", "manifestSha256",
               "sourceMasks", "controlSha256", "bankSha256"}
MANIFEST_ACQUISITION_FIELDS = {"acquisitionId", "source", "acquisitionAt"}
MANIFEST_RECORD_FIELDS = {"recordId", "acquisitionId", "partId", "validTime", "admissionId"}
MASK_FIELDS = {"partId", "validTime", "source", "blockedThroughAcquisitionAt",
               "originManifestSha256", "maskId"}


def _time(value: Any, *, hour: bool = False) -> datetime:
    if not isinstance(value, str):
        raise ValueError("COPERNICUS_DONOR_TIME_INVALID")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or utc_iso(parsed) != value:
        raise ValueError("COPERNICUS_DONOR_TIME_INVALID")
    if hour and parsed != parsed.replace(minute=0, second=0, microsecond=0):
        raise ValueError("COPERNICUS_DONOR_HOUR_INVALID")
    return parsed


def _shadow_header(shadow: Any) -> dict[str, Any]:
    if not isinstance(shadow, dict) or set(shadow) != TOP_LEVEL_FIELDS:
        raise ValueError("COPERNICUS_DONOR_SHADOW_ENVELOPE_INVALID")
    return {key: value for key, value in shadow.items() if key not in {"records", "acquisitions"}}


def _control_payload(document: dict[str, Any]) -> dict[str, Any]:
    return {**{key: document[key] for key in BANK_FIELDS
               if key not in {"shadow", "controlSha256", "bankSha256"}},
            "shadowHeader": _shadow_header(document["shadow"])}


def _manifest(shadow: dict[str, Any], positive: dict[str, Any]) -> dict[str, Any]:
    admission_by_record = {row["recordId"]: row["admissionId"] for row in positive["positiveAdmissions"]}
    return {
        "acquisitions": sorted([
            {key: row[key] for key in MANIFEST_ACQUISITION_FIELDS}
            for row in shadow["acquisitions"]], key=lambda row: row["acquisitionId"]),
        "records": sorted([
            {**{key: row[key] for key in ("recordId", "acquisitionId", "partId", "validTime")},
             "admissionId": admission_by_record.get(row["recordId"])}
            for row in shadow["records"]], key=lambda row: row["recordId"]),
    }


def _validate_control(document: Any, *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != BANK_FIELDS:
        raise ValueError("COPERNICUS_DONOR_BANK_ENVELOPE_INVALID")
    if (type(document["schemaVersion"]) is not int or document["schemaVersion"] != 1
        or document["kind"] != BANK_KIND or document["contractId"] != BANK_CONTRACT
        or document["targetRegistrySha256"] != target_fingerprint(targets)
        or document["admissionPolicySha256"] != admission_policy_sha256()
        or not valid_sha256(document["bankSha256"])
        or document["controlSha256"] != canonical_sha256(_control_payload(document))
        or document["manifestSha256"] != canonical_sha256(document["manifest"])):
        raise ValueError("COPERNICUS_DONOR_BANK_CONTROL_INVALID")
    header = _shadow_header(document["shadow"])
    validate_shadow({**header, "records": [], "acquisitions": []},
                    {row["partId"]: row for row in targets}, require_collection=False)
    if header["collections"]:
        raise ValueError("COPERNICUS_DONOR_BANK_MUST_NOT_CARRY_OPERATIONAL_SEAL")
    manifest = document["manifest"]
    if not isinstance(manifest, dict) or set(manifest) != {"records", "acquisitions"}:
        raise ValueError("COPERNICUS_DONOR_MANIFEST_INVALID")
    if not isinstance(manifest["records"], list) or not isinstance(manifest["acquisitions"], list):
        raise ValueError("COPERNICUS_DONOR_MANIFEST_INVALID")
    acquisition_by_id = {}
    for row in manifest["acquisitions"]:
        if (not isinstance(row, dict) or set(row) != MANIFEST_ACQUISITION_FIELDS
            or not valid_sha256(row["acquisitionId"]) or row["source"] not in COPERNICUS_SOURCE_CONTRACTS
            or row["acquisitionId"] in acquisition_by_id):
            raise ValueError("COPERNICUS_DONOR_ACQUISITION_MANIFEST_INVALID")
        _time(row["acquisitionAt"])
        acquisition_by_id[row["acquisitionId"]] = row
    target_ids = {row["partId"] for row in targets}
    record_ids: set[str] = set()
    cert_by_record = {row["recordId"]: row for row in document["positiveAdmissions"]}
    for row in manifest["records"]:
        if (not isinstance(row, dict) or set(row) != MANIFEST_RECORD_FIELDS
            or not valid_sha256(row["recordId"]) or row["recordId"] in record_ids
            or row["acquisitionId"] not in acquisition_by_id or row["partId"] not in target_ids
            or row["admissionId"] != cert_by_record.get(row["recordId"], {}).get("admissionId")):
            raise ValueError("COPERNICUS_DONOR_RECORD_MANIFEST_INVALID")
        _time(row["validTime"], hour=True)
        record_ids.add(row["recordId"])
    if (manifest["acquisitions"] != sorted(manifest["acquisitions"], key=lambda row: row["acquisitionId"])
        or manifest["records"] != sorted(manifest["records"], key=lambda row: row["recordId"])
        or {row["acquisitionId"] for row in manifest["records"]} != set(acquisition_by_id)):
        raise ValueError("COPERNICUS_DONOR_MANIFEST_MEMBERSHIP_INVALID")
    # Certificates and immutable witnesses are CONTROL evidence, not salvageable
    # leaves. Minimal original identities suffice for this per-record proof
    # validation; no fabricated vector is admitted or returned from these rows.
    validate_positive_admissions(document["positiveAdmissions"], document["admissionAttempts"],
                                 records=manifest["records"], acquisitions=manifest["acquisitions"],
                                 targets=targets)
    masks = document["sourceMasks"]
    if not isinstance(masks, list):
        raise ValueError("COPERNICUS_DONOR_MASKS_INVALID")
    seen_masks: set[tuple[str, str, str]] = set()
    for row in masks:
        if (not isinstance(row, dict) or set(row) != MASK_FIELDS
            or row["partId"] not in target_ids or row["source"] not in COPERNICUS_SOURCE_CONTRACTS
            or not valid_sha256(row["originManifestSha256"])
            or row["maskId"] != canonical_sha256({key: value for key, value in row.items() if key != "maskId"})):
            raise ValueError("COPERNICUS_DONOR_MASK_INVALID")
        _time(row["validTime"], hour=True)
        _time(row["blockedThroughAcquisitionAt"])
        key = (row["partId"], row["validTime"], row["source"])
        if key in seen_masks:
            raise ValueError("COPERNICUS_DONOR_MASK_DUPLICATE")
        seen_masks.add(key)
    if masks != sorted(masks, key=lambda row: (row["validTime"], row["partId"], row["source"])):
        raise ValueError("COPERNICUS_DONOR_MASK_ORDER_INVALID")
    return document


def validate_copernicus_donor_bank(document: Any, *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    bank = _validate_control(document, targets=targets)
    if bank["bankSha256"] != canonical_sha256({key: value for key, value in bank.items() if key != "bankSha256"}):
        raise ValueError("COPERNICUS_DONOR_BANK_CONTENT_INVALID")
    shadow = validate_shadow(bank["shadow"], {row["partId"]: row for row in targets}, require_collection=False)
    if bank["manifest"] != _manifest(shadow, bank):
        raise ValueError("COPERNICUS_DONOR_BANK_LEAF_MEMBERSHIP_INVALID")
    validate_positive_admissions(bank["positiveAdmissions"], bank["admissionAttempts"],
                                 records=shadow["records"], acquisitions=shadow["acquisitions"], targets=targets)
    return bank


def _seal_bank(shadow: dict[str, Any], positive: dict[str, Any], masks: list[dict[str, Any]],
               *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    manifest = _manifest(shadow, positive)
    value = {"schemaVersion": 1, "kind": BANK_KIND, "contractId": BANK_CONTRACT,
             "targetRegistrySha256": target_fingerprint(targets), "shadow": shadow,
             **positive, "sourceMasks": masks, "manifest": manifest,
             "manifestSha256": canonical_sha256(manifest)}
    # bankSha256/controlSha256 do not participate in the independent control payload.
    value["controlSha256"] = canonical_sha256(_control_payload(value))
    value["bankSha256"] = canonical_sha256(value)
    return value


def _merge_masks(masks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in masks:
        key = (row["partId"], row["validTime"], row["source"])
        previous = by_key.get(key)
        if previous is None or (_time(row["blockedThroughAcquisitionAt"]), row["maskId"]) > (
                _time(previous["blockedThroughAcquisitionAt"]), previous["maskId"]):
            by_key[key] = row
    return sorted(by_key.values(), key=lambda row: (row["validTime"], row["partId"], row["source"]))


def _unhealed_masks(shadow: dict[str, Any], positive: dict[str, Any], masks: list[dict[str, Any]],
                    *, targets: list[dict[str, Any]], reference: datetime) -> list[dict[str, Any]]:
    if not masks:
        return []
    acquisition_by_id = {row["acquisitionId"]: row for row in shadow["acquisitions"]}
    selected_by_key = {}
    for source in {row["source"] for row in masks}:
        acquisitions = [row for row in shadow["acquisitions"] if row["source"] == source]
        ids = {row["acquisitionId"] for row in acquisitions}
        records = [row for row in shadow["records"] if row["acquisitionId"] in ids]
        pairs = [{"partId": row["partId"], "validTime": row["validTime"]}
                 for row in masks if row["source"] == source]
        refs, _, _ = select_source_order_admissible_records(
            pairs, acquisitions, records, reference, targets, [], **stage_positive_evidence(positive))
        for row in refs:
            selected_by_key[(row["partId"], row["validTime"], row["source"])] = acquisition_by_id[row["acquisitionId"]]
    lower = reference - timedelta(hours=RETENTION_HOURS)
    upper = reference + timedelta(hours=PUBLIC_END_OFFSET_HOURS)
    retained = []
    for mask in masks:
        if not lower <= _time(mask["validTime"], hour=True) <= upper:
            continue
        selected = selected_by_key.get((mask["partId"], mask["validTime"], mask["source"]))
        if selected and _time(selected["acquisitionAt"]) > _time(mask["blockedThroughAcquisitionAt"]):
            continue
        retained.append(mask)
    return retained


def _build_copernicus_donor_bank(
    shadow: dict[str, Any], *, targets: list[dict[str, Any]], attempts: list[dict[str, Any]],
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
    previous_bank: dict[str, Any] | None = None,
    source_masks: list[dict[str, Any]] | None = None,
    production_reference_at: datetime | None = None,
    trusted_previous_generation: bool = False,
) -> dict[str, Any]:
    reference = production_reference_at or _time(shadow["updatedAt"]).replace(minute=0, second=0, microsecond=0)
    donor_shadow = {**shadow, "collections": []}
    masks = list(source_masks or [])
    if previous_bank is not None:
        previous = (
            previous_bank
            if trusted_previous_generation
            else validate_copernicus_donor_bank(previous_bank, targets=targets)
        )
        merge = (
            _merge_cache_evidence_unvalidated
            if trusted_previous_generation
            else merge_cache_evidence
        )
        acquisitions, records = merge(
            previous["shadow"],
            shadow["acquisitions"],
            shadow["records"],
            reference,
            {row["partId"]: row for row in targets},
        )
        donor_shadow = {**donor_shadow, "acquisitions": acquisitions, "records": records}
        masks.extend(previous["sourceMasks"])
        # Full previous reserve proof wins over any disposable stage projection.
        certs = {row["recordId"]: row for row in positive_admissions or []}
        certs.update({row["recordId"]: row for row in previous["positiveAdmissions"]})
        witnesses = {row["attemptId"]: row for row in admission_attempts or []}
        witnesses.update({row["attemptId"]: row for row in previous["admissionAttempts"]})
        positive_admissions = sorted(certs.values(), key=lambda row: row["recordId"])
        admission_attempts = sorted(witnesses.values(), key=lambda row: row["attemptId"])
    if not trusted_previous_generation:
        validate_shadow(
            donor_shadow,
            {row["partId"]: row for row in targets},
            require_collection=False,
        )
    positive = merge_positive_admissions(records=donor_shadow["records"], acquisitions=donor_shadow["acquisitions"],
        targets=targets, attempts=attempts, positive_admissions=positive_admissions, admission_attempts=admission_attempts)
    masks = _unhealed_masks(donor_shadow, positive, _merge_masks(masks), targets=targets, reference=reference)
    return _seal_bank(donor_shadow, positive, masks, targets=targets)


def build_copernicus_donor_bank(
    shadow: dict[str, Any], *, targets: list[dict[str, Any]], attempts: list[dict[str, Any]],
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
    previous_bank: dict[str, Any] | None = None,
    source_masks: list[dict[str, Any]] | None = None,
    production_reference_at: datetime | None = None,
) -> dict[str, Any]:
    """Public strict builder; prepared checkpoints use the sealed fast path."""
    return _build_copernicus_donor_bank(
        shadow,
        targets=targets,
        attempts=attempts,
        positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
        previous_bank=previous_bank,
        source_masks=source_masks,
        production_reference_at=production_reference_at,
        trusted_previous_generation=False,
    )


def _advance_validated_copernicus_donor_bank(
    shadow: dict[str, Any],
    *,
    targets: list[dict[str, Any]],
    attempts: list[dict[str, Any]],
    previous_bank: dict[str, Any],
    positive_admissions: list[dict[str, Any]] | None = None,
    admission_attempts: list[dict[str, Any]] | None = None,
    source_masks: list[dict[str, Any]] | None = None,
    production_reference_at: datetime | None = None,
) -> dict[str, Any]:
    """Advance one process-local validated bank, then validate the result once."""
    candidate = _build_copernicus_donor_bank(
        shadow,
        targets=targets,
        attempts=attempts,
        positive_admissions=positive_admissions,
        admission_attempts=admission_attempts,
        previous_bank=previous_bank,
        source_masks=source_masks,
        production_reference_at=production_reference_at,
        trusted_previous_generation=True,
    )
    return validate_copernicus_donor_bank(candidate, targets=targets)


def recover_copernicus_donor_bank(document: Any, *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    """Recover only leaves whose original membership remains independently intact."""
    bank = _validate_control(document, targets=targets)
    manifest = bank["manifest"]
    raw_shadow = bank["shadow"]
    if not isinstance(raw_shadow["acquisitions"], list) or not isinstance(raw_shadow["records"], list):
        raise ValueError("COPERNICUS_DONOR_LEAF_TABLE_INVALID")
    targets_by_id = {row["partId"]: row for row in targets}
    expected_acquisitions = {row["acquisitionId"]: row for row in manifest["acquisitions"]}
    raw_acquisitions: dict[str, list[Any]] = {}
    for row in raw_shadow["acquisitions"]:
        if isinstance(row, dict) and isinstance(row.get("acquisitionId"), str):
            raw_acquisitions.setdefault(row["acquisitionId"], []).append(row)
    acquisitions = {}
    validated_acquisitions = {}
    for key, expected in expected_acquisitions.items():
        candidates = raw_acquisitions.get(key, [])
        try:
            if len(candidates) != 1:
                raise ValueError("Missing or duplicate original acquisition")
            validated = _validate_acquisition(candidates[0])
            if any(candidates[0][field] != expected[field] for field in MANIFEST_ACQUISITION_FIELDS):
                raise ValueError("Acquisition differs from original membership")
            validated_acquisitions[key] = validated
            acquisitions[key] = candidates[0]
        except (KeyError, TypeError, ValueError):
            continue
    raw_records: dict[str, list[Any]] = {}
    for row in raw_shadow["records"]:
        if isinstance(row, dict) and isinstance(row.get("recordId"), str):
            raw_records.setdefault(row["recordId"], []).append(row)
    records = []
    masks = list(bank["sourceMasks"])
    for expected in manifest["records"]:
        candidates = raw_records.get(expected["recordId"], [])
        try:
            if len(candidates) != 1:
                raise ValueError("Missing or duplicate original record")
            candidate = candidates[0]
            _validate_record(candidate, validated_acquisitions, targets_by_id)
            if any(candidate[field] != expected[field] for field in ("recordId", "acquisitionId", "partId", "validTime")):
                raise ValueError("Record differs from original membership")
            records.append(candidate)
        except (KeyError, TypeError, ValueError):
            original_acquisition = expected_acquisitions[expected["acquisitionId"]]
            mask = {"partId": expected["partId"], "validTime": expected["validTime"],
                    "source": original_acquisition["source"],
                    "blockedThroughAcquisitionAt": original_acquisition["acquisitionAt"],
                    "originManifestSha256": bank["manifestSha256"]}
            masks.append({**mask, "maskId": canonical_sha256(mask)})
    # Unlisted raw leaves are never admitted. If an original leaf changed its
    # ID, its expected ID above is missing and masks the ORIGINAL manifest scope.
    used = {row["acquisitionId"] for row in records}
    shadow = {**_shadow_header(raw_shadow),
              "acquisitions": [acquisitions[key] for key in sorted(used)],
              "records": sorted(records, key=lambda row: (row["validTime"], row["partId"], row["recordId"]))}
    validate_shadow(shadow, targets_by_id, require_collection=False)
    positive = merge_positive_admissions(records=shadow["records"], acquisitions=shadow["acquisitions"],
        targets=targets, attempts=[], **stage_positive_evidence(bank))
    reference = _time(shadow["updatedAt"]).replace(minute=0, second=0, microsecond=0)
    masks = _unhealed_masks(shadow, positive, _merge_masks(masks), targets=targets, reference=reference)
    recovered = _seal_bank(shadow, positive, masks, targets=targets)
    return validate_copernicus_donor_bank(recovered, targets=targets)


def _project_validated_donor_shadow(bank: dict[str, Any]) -> dict[str, Any]:
    masks = {(row["partId"], row["validTime"], row["source"]) for row in bank["sourceMasks"]}
    acquisitions_by_id = {row["acquisitionId"]: row for row in bank["shadow"]["acquisitions"]}
    records = [row for row in bank["shadow"]["records"]
               if (row["partId"], row["validTime"], acquisitions_by_id[row["acquisitionId"]]["source"]) not in masks]
    used = {row["acquisitionId"] for row in records}
    return {**bank["shadow"], "records": records,
            "acquisitions": [row for row in bank["shadow"]["acquisitions"] if row["acquisitionId"] in used]}


def projected_donor_shadow(bank_document: dict[str, Any], *, targets: list[dict[str, Any]]) -> dict[str, Any]:
    """One projection rule for acquisition, planning, checker and handoff.

    The bank keeps valid siblings and proof while a source/pair is masked.
    Only the disposable projection omits that ENTIRE source for the pair.
    """
    bank = validate_copernicus_donor_bank(bank_document, targets=targets)
    return _project_validated_donor_shadow(bank)


def legacy_donor_bank(
    shadow: dict[str, Any], source_stage: dict[str, Any] | None, *,
    targets: list[dict[str, Any]], shadow_sha256: str,
) -> dict[str, Any]:
    """Migrate original legacy proof before today's rebase; never invent it."""
    if source_stage is None:
        return build_copernicus_donor_bank(shadow, targets=targets, attempts=[])
    positive, _ = original_stage_positive_evidence(source_stage, shadow=shadow, targets=targets,
                                                 shadow_sha256=shadow_sha256)
    return build_copernicus_donor_bank(shadow, targets=targets, attempts=[], **stage_positive_evidence(positive))


def load_copernicus_donor_bank(path: Path, *, targets: list[dict[str, Any]],
                             diagnostics: dict[str, Any] | None = None) -> dict[str, Any] | None:
    if diagnostics is not None:
        diagnostics.update(recovered=False)
    if not path.exists():
        return None
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= BANK_MAX_BYTES:
        raise ValueError("COPERNICUS_DONOR_BANK_FILE_INVALID")
    raw = path.read_bytes()
    if diagnostics is not None:
        diagnostics["originalFileSha256"] = "sha256:" + hashlib.sha256(raw).hexdigest()
    document = json.loads(raw.decode("utf-8"))
    del raw
    try:
        return validate_copernicus_donor_bank(document, targets=targets)
    except (KeyError, TypeError, ValueError):
        try:
            recovered = recover_copernicus_donor_bank(document, targets=targets)
        except (AttributeError, KeyError, TypeError, ValueError) as error:
            raise ValueError("COPERNICUS_DONOR_BANK_CONTROL_OR_PROOF_INVALID") from error
        if diagnostics is not None:
            diagnostics.update(recovered=True, sourceMaskCount=len(recovered["sourceMasks"]))
        return recovered


def atomic_write_copernicus_donor_bank(
    path: Path, document: dict[str, Any], *, targets: list[dict[str, Any]],
) -> dict[str, Any]:
    validated = validate_copernicus_donor_bank(document, targets=targets)
    payload = (json.dumps(validated, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n").encode("utf-8")
    if len(payload) > BANK_MAX_BYTES:
        raise ValueError("COPERNICUS_DONOR_BANK_TOO_LARGE")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        expected_sha256 = hashlib.sha256(payload).digest()
        expected_size = len(payload)
        del payload
        readback_sha256 = hashlib.sha256()
        readback_size = 0
        with temporary.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                readback_size += len(chunk)
                readback_sha256.update(chunk)
        if readback_size != expected_size or readback_sha256.digest() != expected_sha256:
            raise ValueError("COPERNICUS_DONOR_BANK_READBACK_DIFFERS")
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return validated


def planning_covered_pairs(
    bank_document: dict[str, Any], *, targets: list[dict[str, Any]],
    production_reference_at: datetime | str,
) -> set[tuple[str, str]]:
    bank = validate_copernicus_donor_bank(bank_document, targets=targets)
    reference = _time(production_reference_at, hour=True) if isinstance(production_reference_at, str) else production_reference_at
    if reference.tzinfo is None or reference != reference.replace(minute=0, second=0, microsecond=0):
        raise ValueError("COPERNICUS_PLANNING_REFERENCE_INVALID")
    reference = reference.astimezone(timezone.utc)
    required = [{"partId": target["partId"], "validTime":
                 (reference + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")}
                for offset in range(118) for target in sorted(targets, key=lambda row: row["partId"])]
    shadow = projected_donor_shadow(bank, targets=targets)
    refs, _, _ = select_source_order_admissible_records(
        required, shadow["acquisitions"], shadow["records"], reference,
        targets, [], **stage_positive_evidence(bank))
    return {(row["partId"], row["validTime"]) for row in refs}
