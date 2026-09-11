#!/usr/bin/env python3
"""Replay candidate regional migration in memory against exact private inputs.

No provider calls, disk writes, cache saves or production admission. This probes
the real producer extractor, migrator and strict regional consumer together.
Only fixed aggregate counts leave the runner.
"""
from __future__ import annotations

import argparse
import contextlib
import copy
from collections import Counter
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import sys
import traceback

sys.dont_write_bytecode = True


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _exact_utc_hour_epoch(value):
    """Parse one canonical UTC hour without returning its private identity."""
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError("Copernicus sparsity time is not a canonical UTC hour")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as error:
        raise ValueError("Copernicus sparsity time is malformed") from error
    if (
        parsed.tzinfo is None
        or parsed.utcoffset() != timedelta(0)
        or parsed.minute != 0
        or parsed.second != 0
        or parsed.microsecond != 0
    ):
        raise ValueError("Copernicus sparsity time is not an exact UTC hour")
    return int(parsed.astimezone(timezone.utc).timestamp())


def _integer_histogram(values):
    return {
        str(value): count
        for value, count in sorted(Counter(values).items())
    }


def copernicus_sparse_request_summary(missing_pairs, targets):
    """Describe current min..max request waste without exposing target identity.

    Each product uses the production contract's configured eligibility and
    stable spatial shards.  ``logical*TargetHourCell`` describes only the
    rectangular target/time envelope implied by the current runner.  The API
    actually transfers a gridded lon/lat/depth subset, so this intentionally
    does not claim physical grid-cell or byte waste.
    """
    from lib.copernicus_current_source_stage import (
        PINNED_PRODUCTS,
        eligible_target,
        spatial_shards,
    )

    target_by_id = {}
    for target in targets:
        part_id = str(target.get("partId") or "") if isinstance(target, dict) else ""
        if not part_id or part_id in target_by_id:
            raise ValueError("Copernicus sparsity targets are not unique")
        target_by_id[part_id] = target

    normalized_pairs = set()
    epoch_by_time = {}
    for raw in missing_pairs:
        if not isinstance(raw, tuple) or len(raw) != 2:
            raise ValueError("Copernicus sparsity pair is malformed")
        part_id, valid_time = raw
        if part_id not in target_by_id:
            raise ValueError("Copernicus sparsity pair has no bound target")
        epoch_by_time.setdefault(valid_time, _exact_utc_hour_epoch(valid_time))
        normalized_pairs.add((part_id, valid_time))
    if len(normalized_pairs) != len(missing_pairs):
        raise ValueError("Copernicus sparsity pairs are not unique")

    products = []
    for ordinal, product in enumerate(PINNED_PRODUCTS):
        eligible = [target for target in targets if eligible_target(target, product)]
        eligible_ids = {target["partId"] for target in eligible}
        applicable_pairs = {
            pair for pair in normalized_pairs if pair[0] in eligible_ids
        }
        shard_metrics = []
        partitioned_pairs = set()
        affected_ids = set()
        global_native_times = set()
        stable_shards = spatial_shards(eligible, product)
        for shard in stable_shards:
            shard_ids = {target["partId"] for target in shard["targets"]}
            shard_pairs = {
                pair for pair in applicable_pairs if pair[0] in shard_ids
            }
            if not shard_pairs:
                continue
            if partitioned_pairs & shard_pairs:
                raise ValueError("Copernicus stable shards overlap")
            partitioned_pairs.update(shard_pairs)
            shard_times = sorted({epoch_by_time[valid_time] for _, valid_time in shard_pairs})
            affected_targets = {part_id for part_id, _ in shard_pairs}
            gaps = [
                max(0, int((after - before) // 3600) - 1)
                for before, after in zip(shard_times, shard_times[1:])
            ]
            envelope_hours = int((shard_times[-1] - shard_times[0]) // 3600) + 1
            unique_hours = len(shard_times)
            empty_hours = envelope_hours - unique_hours
            components = 1 + sum(gap > 0 for gap in gaps)
            logical_envelope_cells = envelope_hours * len(affected_targets)
            logical_unused_cells = logical_envelope_cells - len(shard_pairs)
            if empty_hours < 0 or logical_unused_cells < 0:
                raise ValueError("Copernicus sparsity envelope is inconsistent")
            affected_ids.update(affected_targets)
            global_native_times.update(shard_times)
            shard_metrics.append({
                "pairCount": len(shard_pairs),
                "affectedTargetCount": len(affected_targets),
                "uniqueNativeHourCount": unique_hours,
                "nativeEnvelopeHourCount": envelope_hours,
                "emptyNativeEnvelopeHourCount": empty_hours,
                "largestEmptyNativeGapHours": max(gaps, default=0),
                "connectedNativeTimeComponentCount": components,
                "logicalEnvelopeTargetHourCellCount": logical_envelope_cells,
                "logicalUnusedTargetHourCellCount": logical_unused_cells,
            })
        if partitioned_pairs != applicable_pairs:
            raise ValueError("Copernicus stable shards do not conserve applicable pairs")

        def total(field):
            return sum(row[field] for row in shard_metrics)

        def histogram(field):
            return _integer_histogram(row[field] for row in shard_metrics)

        logical_envelope = total("logicalEnvelopeTargetHourCellCount")
        logical_unused = total("logicalUnusedTargetHourCellCount")
        products.append({
            "source": product["source"],
            "productOrdinal": ordinal,
            "configuredEligibleTargetCount": len(eligible),
            "configuredStableShardCount": len(stable_shards),
            "affectedTargetCount": len(affected_ids),
            "affectedShardCount": len(shard_metrics),
            "exactPairCount": len(applicable_pairs),
            "uniqueNativeHourCountAcrossSource": len(global_native_times),
            "shardUniqueNativeHourCountTotal": total("uniqueNativeHourCount"),
            "nativeEnvelopeHourCountTotal": total("nativeEnvelopeHourCount"),
            "emptyNativeEnvelopeHourCountTotal": total("emptyNativeEnvelopeHourCount"),
            "largestEmptyNativeGapHours": max(
                (row["largestEmptyNativeGapHours"] for row in shard_metrics),
                default=0,
            ),
            "connectedNativeTimeComponentCountTotal": total(
                "connectedNativeTimeComponentCount"
            ),
            "logicalRequestedTargetHourCellCount": len(applicable_pairs),
            "logicalEnvelopeTargetHourCellCount": logical_envelope,
            "logicalUnusedTargetHourCellCount": logical_unused,
            "logicalUnusedTargetHourCellRatio": (
                round(logical_unused / logical_envelope, 6)
                if logical_envelope else 0.0
            ),
            "perAffectedShardHistograms": {
                "exactPairCount": histogram("pairCount"),
                "affectedTargetCount": histogram("affectedTargetCount"),
                "uniqueNativeHourCount": histogram("uniqueNativeHourCount"),
                "nativeEnvelopeHourCount": histogram("nativeEnvelopeHourCount"),
                "emptyNativeEnvelopeHourCount": histogram("emptyNativeEnvelopeHourCount"),
                "largestEmptyNativeGapHours": histogram("largestEmptyNativeGapHours"),
                "connectedNativeTimeComponentCount": histogram(
                    "connectedNativeTimeComponentCount"
                ),
                "logicalEnvelopeTargetHourCellCount": histogram(
                    "logicalEnvelopeTargetHourCellCount"
                ),
                "logicalUnusedTargetHourCellCount": histogram(
                    "logicalUnusedTargetHourCellCount"
                ),
            },
        })
    return {
        "productionAuthority": False,
        "admissionOrRequestOrderChanged": False,
        "stableSpatialShardContractUsed": True,
        "physicalGridCellOrByteWasteMeasured": False,
        "logicalTargetHourCellMetric": (
            "affected targets multiplied by inclusive min-to-max native hours; "
            "unused cells are that envelope minus exact requested pairs"
        ),
        "products": products,
    }


def regional_horizon_summary(runtime, ledger, remaining, bound, reference):
    """Temporal/catalog possibilities only, never a promise of usable vectors.

    The operational ledger does not inventory source times before its target.
    In particular, a missing T-1/T-2/T-3 source cannot be called upstream absent
    merely because this ledger starts at T.
    """
    from lib.regional_current_operational import NATIVE_CADENCE_HOURS, MAXIMUM_HOLD_HOURS
    from lib.dmi_native_provenance import DKSS_MAX_FORECAST_LEAD_HOURS
    lf = next(row for row in ledger["collections"] if row["collection"] == "dkss_lf")
    model_run = lf.get("modelRun")
    model_epoch = runtime.epoch(model_run) if model_run is not None else None
    reference_epoch = reference.timestamp()
    rows_by_time = {row["validTime"]: row for row in lf["validTimes"]}
    official_native = {
        time: row for time, row in rows_by_time.items()
        if row.get("officialAsset") is not None and model_epoch is not None
        and (runtime.epoch(time) - model_epoch) % (NATIVE_CADENCE_HOURS * 3600) == 0
    }
    policy_remaining = sorted(pair for pair in remaining if pair[0] in bound)
    routes = Counter()
    offset_counts = Counter()
    for _part_id, valid_time in policy_remaining:
        target_epoch = runtime.epoch(valid_time)
        offset_counts[int((target_epoch - reference_epoch) // 3600)] += 1
        candidates = [
            row for time, row in official_native.items()
            if 0 <= target_epoch - runtime.epoch(time) <= MAXIMUM_HOLD_HOURS * 3600
        ]
        if candidates:
            state = (
                "COMPLETED_OFFICIAL_ASSET_WITHOUT_ACCEPTED_REGIONAL_PAIR"
                if any(row["state"] in {"PROCESSED", "VERIFIED"} for row in candidates)
                else "UNPROCESSED_OFFICIAL_NATIVE_CADENCE_ASSET_AVAILABLE"
            )
        elif model_epoch is None:
            state = "NO_SELECTED_LF_MODEL_RUN"
        elif target_epoch > model_epoch + (DKSS_MAX_FORECAST_LEAD_HOURS + MAXIMUM_HOLD_HOURS) * 3600:
            state = "BEYOND_SELECTED_NATIVE_LEAD_AND_APPROVED_HOLD"
        elif any(
            target_epoch - age * 3600 < reference_epoch
            and target_epoch - age * 3600 >= model_epoch
            and (target_epoch - age * 3600 - model_epoch) % (NATIVE_CADENCE_HOURS * 3600) == 0
            for age in range(MAXIMUM_HOLD_HOURS + 1)
        ):
            state = "LEFT_SOURCE_TIME_OUTSIDE_LEDGER_AXIS_NOT_INVENTORIED"
        else:
            state = "NO_OFFICIAL_NATIVE_CADENCE_CANDIDATE_IN_LEDGER_AXIS"
        routes[state] += 1
    offset_ranges = []
    for offset, count in sorted(offset_counts.items()):
        if offset_ranges and offset == offset_ranges[-1]["endOffset"] + 1:
            offset_ranges[-1]["endOffset"] = offset
            offset_ranges[-1]["pairCount"] += count
        else:
            offset_ranges.append({"startOffset": offset, "endOffset": offset, "pairCount": count})
    if sum(routes.values()) != len(policy_remaining):
        raise ValueError("regional temporal route partition incomplete")
    last_native = max(official_native, key=runtime.epoch) if official_native else None
    return {
        "selectedModelRun": model_run,
        "targetMinusModelRunHours": (reference_epoch - model_epoch) / 3600 if model_epoch is not None else None,
        "nativeLeadLimitHours": DKSS_MAX_FORECAST_LEAD_HOURS,
        "approvedHoldLimitHours": MAXIMUM_HOLD_HOURS,
        "officialNativeCadenceTimesInsideLedger": len(official_native),
        "lastOfficialNativeTimeInsideLedger": last_native,
        "lastOfficialNativeWithHoldEndOffset": int((runtime.epoch(last_native) - reference_epoch) / 3600) + MAXIMUM_HOLD_HOURS if last_native else None,
        "remainingPolicyPairCount": len(policy_remaining),
        "remainingPairTemporalRoutes": dict(sorted(routes.items())),
        "remainingOffsetRanges": offset_ranges,
        "preTargetCatalogNotInspected": True,
        "usableVectorAvailabilityProven": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    args = parser.parse_args()
    helper = load_module("residual_reader", Path(__file__).with_name("inspect-current-residual-20260911.py"))
    sys.path.insert(0, str(args.source.resolve() / "scripts"))
    from lib.dmi_bulk_storage import read_dmi_bulk_document
    from lib.copernicus_target_identity import target_fingerprint
    from lib.dmi_native_provenance import (
        canonical_verified_part_current_attestation,
        current_attestation_authorization_from_operational_ledger,
        validate_current_operational_availability_ledger,
    )
    from lib.regional_source_proofs import migrate_regional_source_proofs
    from lib.regional_current_operational import build_regional_current_operational_evidence, MISSING

    with contextlib.redirect_stdout(helper.Quiet()), contextlib.redirect_stderr(helper.Quiet()):
        runtime = load_module("candidate_dmi_runtime", args.source / "scripts/update-dmi-bulk.py")

    paths = {
        "dmi": args.cache / "dmi-candidate-progress.json",
        "regional": args.cache / "current-field-shadow.json",
        "residual": args.cache / "open-meteo-current-fallback.json",
        "cp_stage": args.cache / "copernicus-current-source-stage.json",
        "cp_shadow": args.cache / "copernicus-current-shadow.json",
    }
    before = {name: helper.sha(path) for name, path in paths.items()}
    try:
        dmi = read_dmi_bulk_document(paths["dmi"])
        ledger = dmi["diagnostics"]["currentOperationalLedger"]
        reference_text = "2026-09-11T10:00:00Z"
        reference = runtime.production_reference_hour(reference_text)
        targets = []
        for key, zone in dmi["zones"].items():
            if not isinstance(key, str) or not key.startswith("PART::"):
                continue
            if zone.get("entityId") != key or zone.get("entityType") != "coastal-part":
                raise ValueError("invalid target identity")
            targets.append({"partId": key[6:], "parentZoneId": zone.get("parentZoneId"),
                            "waterPoint": zone.get("samplingPoint")})
        target_hash = target_fingerprint(targets)
        if (len(targets) != 673 or ledger.get("targetRegistrySha256") != target_hash
                or ledger.get("productionReferenceAt") != reference_text):
            raise ValueError("invalid exact-generation target binding")
        range_end = reference + timedelta(hours=117)
        authorized, retained = current_attestation_authorization_from_operational_ledger(ledger)
        attestation = canonical_verified_part_current_attestation(
            dmi, targets, reference_text, runtime.canonical_time(range_end), authorized, retained,
        )
        validate_current_operational_availability_ledger(
            ledger, attestation, targets, reference, range_end, target_hash,
        )
        missing = helper.keys(helper.bind_declared_residual(
            helper.read(paths["residual"]), targets=targets, reference_text=reference_text,
        ))
        if len(missing) != 1658:
            raise ValueError("unexpected residual generation")

        shadow = helper.read(paths["regional"])
        policy = helper.read(args.source / "data/current-regional-proxy-policy.json")
        from lib.regional_current_operational import _policy_and_target_binding
        bound, _, _ = _policy_and_target_binding(policy, targets, allow_target_rebinding_as_missing=True)
        gaps = [row for row in ledger["operationalComplementPairs"] if row["partId"] in bound]

        def classify(document):
            evidence = build_regional_current_operational_evidence(
                policy=policy, targets=targets, current_shadow=document,
                dmi_ledger=ledger, dmi_attestation=attestation,
                locked_reference=reference_text, dmi_gap_pairs=gaps,
                allow_target_rebinding_as_missing=True,
            )
            pairs = {(row["partId"], row["validTime"])
                     for row in evidence["privateProof"]["pairRefs"]
                     if row["classification"] != MISSING}
            return pairs, evidence

        baseline, _ = classify(shadow)
        regional_candidates = []
        signature = runtime.current_marine_processing_signature(dmi.get("zoneRegistrySignature"))
        with contextlib.redirect_stdout(helper.Quiet()), contextlib.redirect_stderr(helper.Quiet()):
            runtime._validated_candidate_retained_current_asset_proofs(
                dmi, targets, reference, signature,
                regional_source_proof_candidates=regional_candidates,
            )
        migrated = copy.deepcopy(shadow)
        summary = migrate_regional_source_proofs(
            migrated, policy=policy, targets=targets, original_proofs=regional_candidates,
        )
        after, evidence = classify(migrated)
        # Exercise the real serialized shape without writing any input/output file.
        roundtrip = json.loads(json.dumps(migrated, ensure_ascii=False, allow_nan=False))
        after_roundtrip, roundtrip_evidence = classify(roundtrip)
        serialized_before_repeat = json.dumps(roundtrip, sort_keys=True, allow_nan=False)
        repeat = migrate_regional_source_proofs(
            roundtrip, policy=policy, targets=targets, original_proofs=regional_candidates,
        )
        idempotent = serialized_before_repeat == json.dumps(roundtrip, sort_keys=True, allow_nan=False)
        gained = (after - baseline) & missing
        post_migration_missing = missing - after
        helper.emit(
            "candidate_regional_horizon_routes", productionAuthority=False,
            **regional_horizon_summary(runtime, ledger, post_migration_missing, bound, reference),
        )
        helper.emit(
            "candidate_post_migration_copernicus_sparsity",
            **copernicus_sparse_request_summary(post_migration_missing, targets),
        )
        from inspect_current_route_causes import cp_routes
        helper.emit(
            "candidate_post_migration_copernicus_attempt_routes",
            **cp_routes(
                helper.read(paths["cp_stage"]),
                helper.read(paths["cp_shadow"]),
                "sha256:" + before["cp_shadow"].hex(),
                targets,
                post_migration_missing,
                "sha256:" + before["dmi"].hex(),
                reference_text,
            ),
        )
        helper.emit(
            "candidate_regional_migration_replay", productionAuthority=False,
            originalProofCandidates=len(regional_candidates), migration=summary,
            baselineCoveredPairCount=len(baseline), migratedCoveredPairCount=len(after),
            gainedPairsInFixedResidual=len(gained), lostPreviouslyCoveredPairCount=len(baseline - after),
            remainingFixedResidualCount=len(post_migration_missing),
            serializationPreservedProof=after_roundtrip == after and roundtrip_evidence == evidence,
            idempotentMigration=idempotent, repeatMigration=repeat,
            quarantinedAnchorOrSampleCount=evidence["shadowDiagnostics"]["quarantinedAnchorOrSampleCount"],
        )
        if (len(gained) != 656 or baseline - after or after_roundtrip != after
                or roundtrip_evidence != evidence or not idempotent):
            raise ValueError("candidate does not reproduce measured non-regressing migration")
    finally:
        unchanged = all(helper.sha(paths[name]) == digest for name, digest in before.items())
        helper.emit("candidate_replay_input_integrity", allInputsUnchanged=unchanged,
                    cacheSaved=False, providerFetch=False, deploy=False)
        if not unchanged:
            raise ValueError("diagnostic input changed")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"event": "candidate_replay_failed", "errorType": type(error).__name__,
                          "frames": [{"file": Path(frame.filename).name, "line": frame.lineno,
                                      "function": frame.name}
                                     for frame in traceback.extract_tb(error.__traceback__)[-6:]],
                          "privatePayloadIncluded": False}), flush=True)
        sys.exit(1)
