#!/usr/bin/env python3
"""Read-only historical cache overlap; never authorizes production reuse.

Run against an independently checked out, exact production source revision.
Only aggregate counts and fixed error categories leave the private runner.
"""
from __future__ import annotations

import argparse
import contextlib
import gc
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import sys
import traceback
from datetime import datetime, timedelta, timezone

sys.dont_write_bytecode = True


class Quiet:
    def write(self, value):
        return len(value)

    def flush(self):
        pass


def emit(event, **fields):
    print(json.dumps({"event": event, "diagnosticOnly": True,
                      "privatePayloadIncluded": False, **fields}, sort_keys=True), flush=True)


def safe_error_type(error):
    allowed = {"ValueError", "TypeError", "KeyError", "RuntimeError", "OSError",
               "MemoryError", "FileNotFoundError", "RecursionError"}
    return type(error).__name__ if type(error).__name__ in allowed else "Exception"


def safe_error_code(error):
    # Fixed production enum only: never publish arbitrary exception messages.
    allowed = {
        "OPEN_METEO_DOCUMENT_INVALID", "OPEN_METEO_DOCUMENT_IDENTITY_INVALID",
        "OPEN_METEO_RECORD_INVALID", "OPEN_METEO_RECORD_DUPLICATE",
        "OPEN_METEO_TARGETS_INVALID", "OPEN_METEO_TARGET_BINDING_INVALID",
        "OPEN_METEO_REFERENCE_INVALID", "OPEN_METEO_CHECKPOINT_TIME_INVALID",
        "OPEN_METEO_REQUIRED_PAIRS_INVALID",
        "OPEN_METEO_REQUIRED_PAIRS_OUTSIDE_OPERATIONAL_RANGE",
        "OPEN_METEO_UPSTREAM_DISPOSITION_INVALID",
        "OPEN_METEO_DONOR_BANK_INVALID", "OPEN_METEO_DONOR_BANK_TIME_REGRESSION",
        "OPEN_METEO_DONOR_MASK_INVALID",
    }
    code = getattr(error, "code", None)
    return code if code in allowed else None


def bind_declared_residual(document, *, targets, reference_text):
    """Bind the investigation's pair list, NOT positive weather admission.

    A damaged weather row must not prevent inspecting unrelated provider banks.
    The reference list still requires intact original control, whole-document
    hash, exact target/hour binding and its separately sealed missing-pair hash.
    """
    from lib.copernicus_current import canonical_sha256, required_pairs_sha256
    from lib.open_meteo_current_fallback import (
        PRIVATE_FIELDS, _canonical_pairs, _validate_reusable_envelope,
        validate_checkpoint_document,
    )

    emit("reference_checkpoint_structure",
         exactFieldSetMatch=set(document) == PRIVATE_FIELDS,
         declaredSchemaIsV2=document.get("schemaVersion") == 2,
         referenceMatches=document.get("productionReferenceAt") == reference_text,
         recordsAreList=isinstance(document.get("records"), list),
         missingPairsAreList=isinstance(document.get("missingPairs"), list))
    _validate_reusable_envelope(document, targets=targets)
    if document["productionReferenceAt"] != reference_text:
        raise ValueError("residual target mismatch")
    if canonical_sha256({key: value for key, value in document.items()
                         if key != "documentSha256"}) != document["documentSha256"]:
        raise ValueError("residual document digest mismatch")
    missing_rows = _canonical_pairs(document["missingPairs"], "OPEN_METEO_DOCUMENT_INVALID")
    if (len(missing_rows) != document["missingPairCount"]
            or required_pairs_sha256(missing_rows) != document["missingPairsSha256"]):
        raise ValueError("residual pair binding mismatch")
    status, error_code = "validated", None
    try:
        validate_checkpoint_document(document, targets=targets)
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        status, error_code = "whole-weather-checkpoint-rejected", safe_error_code(error)
    emit("reference_checkpoint_validation", admissionStatus=status,
         admissionErrorCode=error_code, declaredMissingPairCount=len(missing_rows),
         intactControlAndPairHashes=True, productionAuthority=False)
    return missing_rows


def sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.digest()


def read(path):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= 1536 * 1024**2:
        raise ValueError("invalid diagnostic input")
    with path.open(encoding="utf-8") as handle:
        document = json.load(handle)
    if not isinstance(document, dict):
        raise ValueError("invalid diagnostic document")
    return document


def keys(rows):
    return {(row["partId"], row["validTime"]) for row in rows}


def safe_pair_identities(rows, universe):
    """Count only harmless exact identities from possibly damaged raw leaves."""
    result = set()
    if not isinstance(rows, list):
        return result
    for row in rows:
        if not isinstance(row, dict):
            continue
        part_id, valid_time = row.get("partId"), row.get("validTime")
        if isinstance(part_id, str) and isinstance(valid_time, str):
            pair = (part_id, valid_time)
            if pair in universe:
                result.add(pair)
    return result


def safe_regional_sample_identities(document, universe):
    """Observe exact raw regional sample identities without admitting values."""
    result = set()
    anchors = document.get("anchors") if isinstance(document, dict) else None
    if not isinstance(anchors, dict):
        return result
    for anchor in anchors.values():
        if not isinstance(anchor, dict):
            continue
        part_id, samples = anchor.get("partId"), anchor.get("samples")
        if not isinstance(part_id, str) or not isinstance(samples, list):
            continue
        for sample in samples:
            valid_time = sample.get("validTime") if isinstance(sample, dict) else None
            if isinstance(valid_time, str) and (part_id, valid_time) in universe:
                result.add((part_id, valid_time))
    return result


def canonical_pairs(pairs):
    return [{"partId": part_id, "validTime": valid_time}
            for part_id, valid_time in sorted(pairs, key=lambda pair: (pair[1], pair[0]))]


def state_sha256(document):
    payload = {key: value for key, value in document.items() if key != "stateSha256"}
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":"), allow_nan=False).encode("utf-8")
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def empty_union_state(*, reference_text, target_hash, missing_count, missing_sha256):
    state = {
        "schemaVersion": 1,
        "kind": "RAVRADAR_PRIVATE_DIAGNOSTIC_CURRENT_RESIDUAL_UNION",
        "diagnosticOnly": True,
        "productionReferenceAt": reference_text,
        "targetRegistrySha256": target_hash,
        "missingPairCount": missing_count,
        "missingPairsSha256": missing_sha256,
        "generations": [],
        "rawPairs": [],
        "provedPairs": [],
        "legacyProjectionProvedPairs": [],
    }
    state["stateSha256"] = state_sha256(state)
    return state


def read_union_state(path):
    if path.is_symlink() or not path.is_file() or not 0 < path.stat().st_size <= 2 * 1024**2:
        raise ValueError("invalid diagnostic union state file")

    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("duplicate diagnostic union state field")
            result[key] = value
        return result

    document = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    if not isinstance(document, dict):
        raise ValueError("invalid diagnostic union state document")
    return document


def validate_union_state(document, *, reference_text, target_hash, missing,
                         missing_sha256):
    expected_fields = {
        "schemaVersion", "kind", "diagnosticOnly", "productionReferenceAt",
        "targetRegistrySha256", "missingPairCount", "missingPairsSha256",
        "generations", "rawPairs", "provedPairs",
        "legacyProjectionProvedPairs", "stateSha256",
    }
    if not isinstance(document, dict) or set(document) != expected_fields:
        raise ValueError("invalid diagnostic union state")
    if (
        document["schemaVersion"] != 1
        or document["kind"] != "RAVRADAR_PRIVATE_DIAGNOSTIC_CURRENT_RESIDUAL_UNION"
        or document["diagnosticOnly"] is not True
        or document["productionReferenceAt"] != reference_text
        or document["targetRegistrySha256"] != target_hash
        or document["missingPairCount"] != len(missing)
        or document["missingPairsSha256"] != missing_sha256
        or document["stateSha256"] != state_sha256(document)
    ):
        raise ValueError("diagnostic union binding mismatch")
    generations = document["generations"]
    if (
        not isinstance(generations, list)
        or generations != sorted(set(generations))
        or any(not isinstance(value, str) or re.fullmatch(r"[0-9]{6,20}", value) is None
               for value in generations)
    ):
        raise ValueError("invalid diagnostic union generations")
    result = {}
    for field in ("rawPairs", "provedPairs", "legacyProjectionProvedPairs"):
        rows = document[field]
        if (not isinstance(rows, list) or rows != canonical_pairs(keys(rows))
                or not keys(rows) <= missing):
            raise ValueError("invalid diagnostic union pairs")
        result[field] = keys(rows)
    return (document, result["rawPairs"], result["provedPairs"],
            result["legacyProjectionProvedPairs"])


def update_union_state(path, *, cache_path, generation, reference_text, target_hash,
                       missing, missing_sha256, raw_pairs, proved_pairs,
                       legacy_projection_proved_pairs):
    cache_root = cache_path.resolve()
    resolved = path.resolve()
    if resolved == cache_root or cache_root in resolved.parents:
        raise ValueError("diagnostic union state must be outside input cache")
    if Path(os.path.abspath(path)) != resolved:
        raise ValueError("invalid diagnostic union state path")
    if path.exists():
        state = read_union_state(path)
    else:
        state = empty_union_state(
            reference_text=reference_text,
            target_hash=target_hash,
            missing_count=len(missing),
            missing_sha256=missing_sha256,
        )
    state, old_raw, old_proved, old_legacy_proved = validate_union_state(
        state,
        reference_text=reference_text,
        target_hash=target_hash,
        missing=missing,
        missing_sha256=missing_sha256,
    )
    state["generations"] = sorted({*state["generations"], generation})
    state["rawPairs"] = canonical_pairs(old_raw | (raw_pairs & missing))
    state["provedPairs"] = canonical_pairs(old_proved | (proved_pairs & missing))
    state["legacyProjectionProvedPairs"] = canonical_pairs(
        old_legacy_proved | (legacy_projection_proved_pairs & missing)
    )
    state["stateSha256"] = state_sha256(state)
    validate_union_state(
        state,
        reference_text=reference_text,
        target_hash=target_hash,
        missing=missing,
        missing_sha256=missing_sha256,
    )
    if path.is_symlink() or (path.parent.exists() and path.parent.is_symlink()):
        raise ValueError("invalid diagnostic union state path")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as handle:
            json.dump(state, handle, ensure_ascii=False, sort_keys=True,
                      separators=(",", ":"), allow_nan=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--target", required=True)
    parser.add_argument("--generation", required=True)
    parser.add_argument("--union-state", type=Path)
    args = parser.parse_args()
    if re.fullmatch(r"[0-9]{6,20}", args.generation) is None:
        raise ValueError("invalid diagnostic generation")
    sys.path.insert(0, str(args.source.resolve() / "scripts"))
    from lib.dmi_bulk_storage import read_dmi_bulk_document
    from lib.copernicus_target_identity import target_fingerprint
    from lib.copernicus_current_donor_bank import load_copernicus_donor_bank, planning_covered_pairs
    from lib.dmi_native_provenance import (
        canonical_verified_part_current_attestation,
        current_attestation_authorization_from_operational_ledger,
        validate_current_operational_availability_ledger,
    )
    from lib.open_meteo_current_fallback import merge_donor_bank, select_donor_records, validate_checkpoint_document
    from lib.weather_acquisition_plan import planning_regional_covered_pairs

    spec = importlib.util.spec_from_file_location("diagnostic_dmi_runtime", args.source / "scripts/update-dmi-bulk.py")
    runtime = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(Quiet()), contextlib.redirect_stderr(Quiet()):
        spec.loader.exec_module(runtime)

    paths = {name: args.cache / filename for name, filename in {
        "latest_dmi": "diagnostic-latest-candidate.json",
        "dmi": "dmi-candidate-progress.json",
        "cp": "copernicus-current-donor-bank.json",
        "om": "open-meteo-current-donor-bank.json",
        "om_projection": "open-meteo-generation-projection.json",
        "residual": "open-meteo-current-fallback.json",
        "regional": "current-field-shadow.json",
    }.items()}
    before = {name: sha(path) for name, path in paths.items()}
    reference = runtime.production_reference_hour(args.target)
    reference_text = reference.strftime("%Y-%m-%dT%H:00:00Z")
    latest = read_dmi_bulk_document(paths["latest_dmi"])
    ledger = latest.get("diagnostics", {}).get("currentOperationalLedger", {})
    targets = []
    for key, zone in latest.get("zones", {}).items():
        if not isinstance(key, str) or not key.startswith("PART::"):
            continue
        if zone.get("entityId") != key or zone.get("entityType") != "coastal-part":
            raise ValueError("target identity mismatch")
        targets.append({"partId": key[6:], "parentZoneId": zone.get("parentZoneId"),
                        "waterPoint": zone.get("samplingPoint")})
    if (len(targets) != 673 or target_fingerprint(targets) != ledger.get("targetRegistrySha256")
            or ledger.get("productionReferenceAt") != reference_text):
        raise ValueError("target binding mismatch")
    target_hash = target_fingerprint(targets)
    latest = ledger = None
    gc.collect()

    residual = read(paths["residual"])
    missing = keys(bind_declared_residual(
        residual, targets=targets, reference_text=reference_text,
    ))
    missing_sha256 = residual["missingPairsSha256"]
    required = [{"partId": target["partId"], "validTime":
                 (reference + timedelta(hours=offset)).strftime("%Y-%m-%dT%H:00:00Z")}
                for offset in range(118) for target in sorted(targets, key=lambda row: row["partId"])]
    universe = keys(required)
    if not missing <= universe:
        raise ValueError("residual out of range")
    emit("bound_residual", requiredPairCount=len(universe), missingPairCount=len(missing),
         targetBinding="LATEST_CACHED_LEDGER_AND_DECLARED_OM_MISSING_PAIR_HASH_MATCH",
         productionAuthority=False)
    residual = None
    gc.collect()
    independently_proved = set()
    legacy_projection_proved = set()
    raw_observed = set()

    dmi = read_dmi_bulk_document(paths["dmi"])
    dmi_ledger = dmi.get("diagnostics", {}).get("currentOperationalLedger", {})
    dmi_target_matches = dmi_ledger.get("targetRegistrySha256") == target_hash
    raw = set()
    for target in targets:
        zone = dmi.get("zones", {}).get("PART::" + target["partId"], {})
        for valid, row in (zone.get("hourly") or {}).items():
            if (target["partId"], valid) in universe and isinstance(row, dict) and all(
                    isinstance(row.get(k), (int, float)) and not isinstance(row[k], bool)
                    and math.isfinite(row[k]) for k in ("current-u", "current-v")):
                raw.add((target["partId"], valid))
    signature = runtime.current_marine_processing_signature(dmi.get("zoneRegistrySignature"))
    proofs = []
    dmi_status, dmi_error_type = "validated", None
    try:
        if not dmi_target_matches:
            raise ValueError("historical DMI target mismatch")
        with contextlib.redirect_stdout(Quiet()), contextlib.redirect_stderr(Quiet()):
            proofs = runtime._validated_candidate_retained_current_asset_proofs(dmi, targets, reference, signature)
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        dmi_status, dmi_error_type = "not-admissible", safe_error_type(error)
    admitted = {(part_id, proof["sourceAsset"]["validTime"])
                for proof in proofs for part_id in proof["attestedPartIds"]} & universe
    emit("dmi_overlap", rawCurrentPairCount=len(raw), independentlyProvedPairCount=len(admitted),
         rawPairsInFinalResidual=len(raw & missing), provedPairsInFinalResidual=len(admitted & missing),
         provedPairCountOutsideRaw=len(admitted - raw), targetRegistryMatches=dmi_target_matches,
         admissionStatus=dmi_status, admissionErrorType=dmi_error_type)
    raw_observed.update(raw)
    independently_proved.update(admitted)

    regional_shadow = read(paths["regional"])
    raw_regional = safe_regional_sample_identities(regional_shadow, universe)
    regional_policy = read(args.source / "data/current-regional-proxy-policy.json")
    regional_admitted = set()
    regional_status = "validated"
    regional_error_type = None
    donor_reference_text = None
    original_attestation = None
    try:
        donor_reference = runtime.production_reference_hour(dmi_ledger.get("productionReferenceAt"))
        donor_end = runtime.production_reference_hour(dmi_ledger.get("operationalRangeEndAt"))
        if donor_end != donor_reference + timedelta(hours=117):
            raise ValueError("historical DMI range mismatch")
        donor_reference_text = donor_reference.strftime("%Y-%m-%dT%H:00:00Z")
        authorized, retained = current_attestation_authorization_from_operational_ledger(dmi_ledger)
        original_attestation = canonical_verified_part_current_attestation(
            dmi,
            targets,
            donor_reference_text,
            donor_end.strftime("%Y-%m-%dT%H:00:00Z"),
            authorized,
            retained,
        )
        validate_current_operational_availability_ledger(
            dmi_ledger,
            original_attestation,
            targets,
            donor_reference,
            donor_end,
            target_hash,
        )
        regional_admitted = planning_regional_covered_pairs(
            dmi_ledger=dmi_ledger,
            dmi_attestation=original_attestation,
            targets=targets,
            regional_shadow=regional_shadow,
            regional_policy=regional_policy,
            production_reference_at=donor_reference,
        ) & universe
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        # Match the production planner: an optional regional donor that cannot
        # establish its normal proof contributes zero, without blocking others.
        regional_status = "not-admissible-for-original-ledger"
        regional_error_type = safe_error_type(error)
    emit(
        "regional_overlap",
        admissionStatus=regional_status,
        admissionErrorType=regional_error_type,
        generationReferenceAt=donor_reference_text,
        rawCurrentSampleIdentityCount=len(raw_regional),
        independentlyProvedPairCount=len(regional_admitted),
        rawSampleIdentitiesInFinalResidual=len(raw_regional & missing),
        provedPairsInFinalResidual=len(regional_admitted & missing),
    )
    raw_observed.update(raw_regional)
    independently_proved.update(regional_admitted)
    dmi = dmi_ledger = proofs = raw = admitted = original_attestation = None
    regional_shadow = regional_policy = raw_regional = regional_admitted = None
    gc.collect()

    raw_document = read(paths["cp"])
    raw = safe_pair_identities(
        (raw_document.get("shadow") or {}).get("records")
        if isinstance(raw_document.get("shadow"), dict) else None,
        universe,
    )
    raw_document = None
    recovery = {}
    admitted = set()
    masks = set()
    cp_status = "validated"
    cp_error_type = None
    try:
        with contextlib.redirect_stdout(Quiet()), contextlib.redirect_stderr(Quiet()):
            bank = load_copernicus_donor_bank(paths["cp"], targets=targets, diagnostics=recovery)
            admitted = planning_covered_pairs(bank, targets=targets, production_reference_at=reference_text)
        masks = keys(bank["sourceMasks"]) & universe
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        cp_status = "not-admissible"
        cp_error_type = safe_error_type(error)
        bank = None
    emit("copernicus_overlap", rawCurrentPairCount=len(raw), independentlyProvedPairCount=len(admitted),
         rawPairsInFinalResidual=len(raw & missing), provedPairsInFinalResidual=len(admitted & missing),
         maskedPairsInFinalResidual=len(masks & missing), recovered=bool(recovery.get("recovered")),
         admissionStatus=cp_status, admissionErrorType=cp_error_type)
    raw_observed.update(raw)
    independently_proved.update(admitted)
    bank = raw = masks = admitted = None
    gc.collect()

    projection = read(paths["om_projection"])
    raw_projection = safe_pair_identities(projection.get("records"), universe)
    checked_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    legacy_admitted = set()
    legacy_status = "validated-original-projection"
    legacy_error_type = None
    try:
        validate_checkpoint_document(projection, targets=targets)
        legacy_bank, _legacy_stats = merge_donor_bank(
            None,
            [projection],
            targets=targets,
            production_reference_at=reference_text,
            checkpointed_at=checked_at,
        )
        legacy_admitted = keys(select_donor_records(
            legacy_bank,
            targets=targets,
            required_pairs=required,
            production_reference_at=reference_text,
            checkpointed_at=checked_at,
        ))
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        legacy_status = "not-admissible-at-original-proof"
        legacy_error_type = safe_error_type(error)

    bank = read(paths["om"])
    raw = safe_pair_identities(
        [entry.get("record") for entry in bank.get("entries", [])
         if isinstance(entry, dict)] if isinstance(bank.get("entries"), list) else None,
        universe,
    )
    admitted = set()
    masks = set()
    stats = {"droppedRecordCount": None}
    om_status = "validated"
    om_error_type = None
    try:
        bank, stats = merge_donor_bank(bank, [], targets=targets, production_reference_at=reference_text,
                                     checkpointed_at=checked_at)
        admitted = keys(select_donor_records(bank, targets=targets, required_pairs=required,
                                            production_reference_at=reference_text, checkpointed_at=checked_at))
        masks = keys(bank["conflictMasks"]) & universe
    except (OSError, ValueError, TypeError, KeyError, RuntimeError, RecursionError) as error:
        om_status = "not-admissible"
        om_error_type = safe_error_type(error)
    emit("open_meteo_overlap", rawCurrentPairCount=len(raw), independentlyProvedPairCount=len(admitted),
         rawPairsInFinalResidual=len(raw & missing), provedPairsInFinalResidual=len(admitted & missing),
         maskedPairsInFinalResidual=len(masks & missing), droppedRecordCount=stats["droppedRecordCount"],
         admissionStatus=om_status, admissionErrorType=om_error_type)
    emit(
        "open_meteo_legacy_projection_overlap",
        admissionStatus=legacy_status,
        admissionErrorType=legacy_error_type,
        rawCurrentPairCount=len(raw_projection),
        independentlyProvedPairCount=len(legacy_admitted),
        rawPairsInFinalResidual=len(raw_projection & missing),
        provedPairsInFinalResidual=len(legacy_admitted & missing),
        provedPairsHiddenByBankAuthorityInFinalResidual=len(
            (legacy_admitted - admitted) & missing
        ),
        productionAuthority=False,
    )
    raw_observed.update(raw)
    raw_observed.update(raw_projection)
    independently_proved.update(admitted)
    legacy_projection_proved.update(legacy_admitted)
    # A historical generation is not authority to override a newer damage mask.
    # These counts establish existence and original proof only, never promotion.
    emit("historical_provider_union", independentlyProvedPairCount=len(independently_proved),
         provedPairsInFinalResidual=len(independently_proved & missing),
         missingPairsWithoutProofInThisGeneration=len(missing - independently_proved),
         legacyProjectionProvedPairsInFinalResidual=len(legacy_projection_proved & missing),
         missingPairsWithoutAnyHistoricalProofInThisGeneration=len(
             missing - independently_proved - legacy_projection_proved
         ),
         currentGenerationConflictReviewRequired=True)
    if any(sha(paths[name]) != digest for name, digest in before.items()):
        raise ValueError("diagnostic input changed")
    if args.union_state is not None:
        state = update_union_state(
            args.union_state,
            cache_path=args.cache,
            generation=args.generation,
            reference_text=reference_text,
            target_hash=target_hash,
            missing=missing,
            missing_sha256=missing_sha256,
            raw_pairs=raw_observed,
            proved_pairs=independently_proved,
            legacy_projection_proved_pairs=legacy_projection_proved,
        )
        union_raw = keys(state["rawPairs"])
        union_proved = keys(state["provedPairs"])
        union_legacy_proved = keys(state["legacyProjectionProvedPairs"])
        emit(
            "cross_generation_union",
            generationCount=len(state["generations"]),
            rawPairsInFinalResidual=len(union_raw),
            provedPairsInFinalResidual=len(union_proved),
            legacyProjectionProvedPairsInFinalResidual=len(union_legacy_proved),
            missingPairsWithoutRaw=len(missing - union_raw),
            missingPairsWithoutProof=len(missing - union_proved),
            missingPairsWithoutAnyHistoricalProof=len(
                missing - union_proved - union_legacy_proved
            ),
        )
    emit("input_integrity", allInputsUnchanged=True, cacheSaved=False, providerFetch=False, deploy=False)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        frame = traceback.extract_tb(exc.__traceback__)[-1]
        emit("inspection_failed", errorType=safe_error_type(exc),
             errorCode=safe_error_code(exc),
             sourceFile=Path(frame.filename).name, sourceLine=frame.lineno)
        sys.exit(1)
