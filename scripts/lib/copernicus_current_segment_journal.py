"""Durable, bounded receipts between full Copernicus donor consolidations.

The journal never authorizes source admission by itself.  Each entry is an
immutable acquisition/record/attempt receipt which is replayed through the
ordinary donor-bank, provenance and mask validators before it can enter a
source stage.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from .copernicus_current import (
    HASH_PREFIX,
    _validate_acquisition,
    _validate_record,
    canonical_sha256,
    file_sha256,
    utc_iso,
    valid_sha256,
)
from .copernicus_current_source_stage import (
    PINNED_PRODUCTS,
    _validate_attempt,
)
from .copernicus_target_identity import target_fingerprint


SEGMENT_JOURNAL_SCHEMA_VERSION = 1
SEGMENT_JOURNAL_CONTRACT_ID = "copernicus-current-durable-segment-journal-v1"
SEGMENT_JOURNAL_MAX_BYTES = 256 * 1024 * 1024
SEGMENT_JOURNAL_FIELDS = {
    "schemaVersion",
    "contractId",
    "baseBankSha256",
    "productionReferenceAt",
    "targetRegistrySha256",
    "entries",
    "journalSha256",
}
SEGMENT_ENTRY_FIELDS = {
    "acquisition",
    "records",
    "attempt",
    "entrySha256",
}


def default_segment_journal_path(donor_bank_path: Path) -> Path:
    if donor_bank_path.name == "copernicus-current-donor-bank.json":
        return donor_bank_path.with_name("copernicus-current-segment-journal.json")
    return donor_bank_path.with_name(donor_bank_path.name + ".segment-journal.json")


def _entry_identity(entry: dict[str, Any]) -> dict[str, Any]:
    return {key: entry[key] for key in sorted(SEGMENT_ENTRY_FIELDS - {"entrySha256"})}


def _journal_identity(journal: dict[str, Any]) -> dict[str, Any]:
    return {key: journal[key] for key in sorted(SEGMENT_JOURNAL_FIELDS - {"journalSha256"})}


def _validate_entry(
    raw: Any,
    *,
    targets: list[dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(raw, dict) or set(raw) != SEGMENT_ENTRY_FIELDS:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ENTRY_FIELDS_INVALID")
    entry = raw
    if entry["entrySha256"] != canonical_sha256(_entry_identity(entry)):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ENTRY_HASH_INVALID")
    target_by_id = {row["partId"]: row for row in targets}
    records = entry["records"]
    if not isinstance(records, list) or records != sorted(
        records,
        key=lambda row: (
            row.get("validTime", "") if isinstance(row, dict) else "",
            row.get("partId", "") if isinstance(row, dict) else "",
            row.get("recordId", "") if isinstance(row, dict) else "",
        ),
    ):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_RECORDS_INVALID")
    acquisition = entry["acquisition"]
    validated_acquisition = None
    if records:
        validated_acquisition = _validate_acquisition(acquisition)
        try:
            acquisition_targets = [
                target_by_id[part_id]
                for part_id in validated_acquisition["targetPartIds"]
            ]
        except KeyError:
            raise ValueError("COPERNICUS_SEGMENT_JOURNAL_TARGET_INVALID") from None
        from .copernicus_current import geometry_fingerprint

        if (
            validated_acquisition["targetFingerprint"]
            != geometry_fingerprint(acquisition_targets)
        ):
            raise ValueError("COPERNICUS_SEGMENT_JOURNAL_TARGET_BINDING_INVALID")
    elif acquisition is not None:
        # Zero-row acquisitions are intentionally absent from the durable donor
        # projection and may legitimately have no native provider timestamp.
        # Their self-contained, immutable attempt is the complete proof.
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_EMPTY_ACQUISITION_INVALID")
    validated_records: dict[str, dict[str, Any]] = {}
    acquisition_by_id = (
        {validated_acquisition["acquisitionId"]: validated_acquisition}
        if validated_acquisition is not None
        else {}
    )
    for raw_record in records:
        record = _validate_record(raw_record, acquisition_by_id, target_by_id)
        if record["recordId"] in validated_records:
            raise ValueError("COPERNICUS_SEGMENT_JOURNAL_RECORD_DUPLICATE")
        validated_records[record["recordId"]] = record
    if records and len(records) != acquisition["recordCount"]:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_RECORD_COUNT_INVALID")

    attempt = entry["attempt"]
    product = next(
        (row for row in PINNED_PRODUCTS if row["source"] == attempt.get("source")),
        None,
    )
    if product is None:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_SOURCE_INVALID")
    requested = attempt.get("requestedPairs")
    if not isinstance(requested, list):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ATTEMPT_INVALID")
    reference_text = attempt.get("productionReferenceAt")
    if not isinstance(reference_text, str):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_REFERENCE_INVALID")
    reference = datetime.fromisoformat(reference_text.replace("Z", "+00:00"))
    _validate_attempt(
        attempt,
        reference=reference,
        required_set={
            (str(row.get("partId") or ""), str(row.get("validTime") or ""))
            for row in requested
            if isinstance(row, dict)
        },
        targets=targets,
        product=product,
        acquisitions=[acquisition] if acquisition is not None else [],
    )
    if acquisition is not None and attempt["acquisitionId"] != acquisition["acquisitionId"]:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ACQUISITION_INVALID")
    if attempt["parsedRecordCount"] != len(records):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ATTEMPT_COUNT_INVALID")
    return entry


def validate_segment_journal(
    document: Any,
    *,
    targets: list[dict[str, Any]],
    expected_base_bank_sha256: str | None = None,
) -> dict[str, Any]:
    if not isinstance(document, dict) or set(document) != SEGMENT_JOURNAL_FIELDS:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_FIELDS_INVALID")
    journal = document
    if (
        journal["schemaVersion"] != SEGMENT_JOURNAL_SCHEMA_VERSION
        or journal["contractId"] != SEGMENT_JOURNAL_CONTRACT_ID
        or not valid_sha256(journal["baseBankSha256"])
        or journal["targetRegistrySha256"] != target_fingerprint(targets)
    ):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_BINDING_INVALID")
    if (
        expected_base_bank_sha256 is not None
        and journal["baseBankSha256"] != expected_base_bank_sha256
    ):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_BASE_INVALID")
    reference = datetime.fromisoformat(
        str(journal["productionReferenceAt"]).replace("Z", "+00:00")
    )
    if journal["productionReferenceAt"] != utc_iso(reference):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_REFERENCE_INVALID")
    entries = journal["entries"]
    if not isinstance(entries, list) or not entries:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ENTRIES_INVALID")
    validated = [_validate_entry(row, targets=targets) for row in entries]
    canonical = sorted(
        validated,
        key=lambda row: (row["attempt"]["acquisitionAt"], row["attempt"]["attemptId"]),
    )
    if validated != canonical:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ORDER_INVALID")
    attempt_ids = [row["attempt"]["attemptId"] for row in validated]
    if len(set(attempt_ids)) != len(attempt_ids):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ATTEMPT_DUPLICATE")
    if journal["journalSha256"] != canonical_sha256(_journal_identity(journal)):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_HASH_INVALID")
    return journal


def load_segment_journal(
    path: Path,
    *,
    targets: list[dict[str, Any]],
    expected_base_bank_sha256: str,
) -> dict[str, Any] | None:
    if not path.exists():
        return None
    if (
        path.is_symlink()
        or not path.is_file()
        or not 0 < path.stat().st_size <= SEGMENT_JOURNAL_MAX_BYTES
    ):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_FILE_INVALID")
    return validate_segment_journal(
        json.loads(path.read_text(encoding="utf-8")),
        targets=targets,
        expected_base_bank_sha256=expected_base_bank_sha256,
    )


def _atomic_write_segment_journal(
    path: Path,
    journal: dict[str, Any],
    *,
    targets: list[dict[str, Any]],
) -> dict[str, Any]:
    validated = validate_segment_journal(journal, targets=targets)
    payload = (
        json.dumps(validated, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        + "\n"
    ).encode("utf-8")
    if len(payload) > SEGMENT_JOURNAL_MAX_BYTES:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_TOO_LARGE")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        expected_sha256 = HASH_PREFIX + hashlib.sha256(payload).hexdigest()
        if temporary.stat().st_size != len(payload) or file_sha256(temporary) != expected_sha256:
            raise RuntimeError("COPERNICUS_SEGMENT_JOURNAL_READBACK_DIFFERS")
        os.replace(temporary, path)
        _fsync_parent_directory(path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return validated


def append_segment_journal(
    path: Path,
    journal: dict[str, Any] | None,
    *,
    base_bank_sha256: str,
    production_reference_at: datetime,
    targets: list[dict[str, Any]],
    acquisition: dict[str, Any],
    records: list[dict[str, Any]],
    attempt: dict[str, Any],
) -> dict[str, Any]:
    if journal is None:
        journal = {
            "schemaVersion": SEGMENT_JOURNAL_SCHEMA_VERSION,
            "contractId": SEGMENT_JOURNAL_CONTRACT_ID,
            "baseBankSha256": base_bank_sha256,
            "productionReferenceAt": utc_iso(production_reference_at),
            "targetRegistrySha256": target_fingerprint(targets),
            "entries": [],
        }
    elif (
        journal.get("baseBankSha256") != base_bank_sha256
        or journal.get("productionReferenceAt") != utc_iso(production_reference_at)
    ):
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_APPEND_BINDING_INVALID")
    entry = {
        "acquisition": acquisition if records else None,
        "records": sorted(
            records,
            key=lambda row: (row["validTime"], row["partId"], row["recordId"]),
        ),
        "attempt": attempt,
    }
    entry["entrySha256"] = canonical_sha256(_entry_identity(entry))
    by_attempt = {row["attempt"]["attemptId"]: row for row in journal["entries"]}
    previous = by_attempt.get(attempt["attemptId"])
    if previous is not None and previous != entry:
        raise ValueError("COPERNICUS_SEGMENT_JOURNAL_ATTEMPT_COLLISION")
    by_attempt[attempt["attemptId"]] = entry
    next_journal = {
        **{key: value for key, value in journal.items() if key != "journalSha256"},
        "entries": sorted(
            by_attempt.values(),
            key=lambda row: (
                row["attempt"]["acquisitionAt"],
                row["attempt"]["attemptId"],
            ),
        ),
    }
    next_journal["journalSha256"] = canonical_sha256(_journal_identity(next_journal))
    return _atomic_write_segment_journal(path, next_journal, targets=targets)


def remove_segment_journal(path: Path) -> None:
    """Remove only the receipt whose complete donor transaction just committed."""
    if path.exists():
        if path.is_symlink() or not path.is_file():
            raise ValueError("COPERNICUS_SEGMENT_JOURNAL_FILE_INVALID")
        path.unlink()
        _fsync_parent_directory(path)


def _fsync_parent_directory(path: Path) -> None:
    """Persist directory-entry changes on the Linux production runner."""
    if os.name == "nt":
        # Windows does not expose a portable directory fsync through Python.
        # The journal remains write/readback verified there; production runs on
        # Linux, where the rename/unlink directory entry is also forced stable.
        return
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    descriptor = os.open(path.parent, flags)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
