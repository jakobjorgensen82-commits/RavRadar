"""Aggregate-only, read-only causal probes; never production admission authority."""
from collections import Counter
from datetime import datetime, timezone


def residual_shape(missing, reference):
    per_part = Counter(part for part, _ in missing)
    per_hour = Counter(valid for _, valid in missing)
    bands = Counter({"0_5": 0, "6_23": 0, "24_53": 0, "54_117": 0})
    for _, valid in missing:
        offset = int((datetime.fromisoformat(valid.replace("Z", "+00:00")) - reference).total_seconds() / 3600)
        if not 0 <= offset <= 117:
            raise ValueError("residual outside fixed axis")
        bands["0_5" if offset < 6 else "6_23" if offset < 24 else "24_53" if offset < 54 else "54_117"] += 1
    return {"missingPairCount": len(missing), "affectedPartCount": len(per_part),
            "affectedHourCount": len(per_hour), "full118HourMissingPartCount": sum(n == 118 for n in per_part.values()),
            "missingHoursPerPartHistogram": dict(sorted(Counter(per_part.values()).items())),
            "missingPairOffsetBands": dict(bands)}


def dmi_routes(ledger, missing):
    """Caller must first validate this exact original ledger and attestation."""
    from lib.dmi_native_provenance import CURRENT_OPERATIONAL_LEDGER_STATES, MARINE_COLLECTIONS
    families, joint = [], {pair: [] for pair in missing}
    for collection in ledger["collections"]:
        name = collection["collection"]
        if name not in MARINE_COLLECTIONS:
            raise ValueError("unexpected current collection")
        by_time = {row["validTime"]: row for row in collection["validTimes"]}
        counts = Counter()
        for pair in missing:
            part, valid = pair
            row = by_time.get(valid)
            if row is None:
                reason = "OUTSIDE_ORIGINAL_LEDGER"
            elif row["state"] in {"PROCESSED", "VERIFIED"}:
                reason = ("PROCESSED_SPATIAL_UNAVAILABLE" if part in row["partOutcomeProof"]["spatialUnavailablePartIds"]
                          else "PROCESSED_NONSPATIAL_BUT_FINAL_MISSING")
            else:
                if row["state"] not in CURRENT_OPERATIONAL_LEDGER_STATES:
                    raise ValueError("invalid current state")
                reason = row["state"]
            counts[reason] += 1
            joint[pair].append(name + ":" + reason)
        if sum(counts.values()) != len(missing):
            raise ValueError("DMI route partition incomplete")
        families.append({"collection": name, "missingPairOutcomes": dict(sorted(counts.items()))})
    return {"families": families, "jointOutcomeCounts": dict(sorted(Counter("|".join(sorted(v)) for v in joint.values()).items()))}


def regional_routes(ledger, shadow, policy, targets, missing):
    """Measure an explicitly hypothetical old-outcome path; no runtime patch."""
    from lib import regional_current_operational as regional
    from lib.dmi_native_provenance import current_source_asset_sha256
    bound, policy_sha, target_sha = regional._policy_and_target_binding(
        policy, targets, allow_target_rebinding_as_missing=True)
    regional._validate_shadow_header(shadow)
    sources, retained, selected_runs = regional._ledger_source_index(ledger)
    extra = {}
    for proof in ledger.get("retainedCurrentAssetProofs", []):
        source = proof["sourceAsset"]
        if source["collection"] != "dkss_lf":
            continue
        digest = current_source_asset_sha256(source)
        for part in proof["partOutcomeProof"]["spatialUnavailablePartIds"]:
            if part in bound:
                extra[(part, source["modelRun"], source["validTime"], digest)] = source
    candidate_counts = Counter()
    raw_policy_pairs = set()
    for part, binding in bound.items():
        if not binding["regionalEvidenceEligible"]:
            candidate_counts["policyReboundPartCount"] += 1
            continue
        anchor = shadow["anchors"].get(regional.TARGET_PREFIX + part)
        try:
            samples = regional._validate_anchor(anchor, binding, part)
        except regional.RegionalCurrentOperationalError:
            candidate_counts["invalidOrMissingAnchorCount"] += 1
            continue
        for sample in samples:
            candidate_counts["policyScopedRawSampleCount"] += 1
            if not isinstance(sample, dict):
                candidate_counts["malformedSampleCount"] += 1
                continue
            valid = sample.get("validTime")
            if isinstance(valid, str) and (part, valid) in missing:
                raw_policy_pairs.add((part, valid))
            identity = (part, sample.get("modelRun"), valid, sample.get("sourceAssetSha256"))
            if all(isinstance(value, str) for value in identity):
                if identity[1:] in sources:
                    candidate_counts["selectedAssetIdentityMatchCount"] += 1
                elif identity in retained:
                    candidate_counts["retainedNativeIdentityMatchCount"] += 1
                elif identity in extra:
                    candidate_counts["retainedRegionalOutcomeIdentityMatchCount"] += 1
                else:
                    candidate_counts["noRetainedAssetIdentityMatchCount"] += 1
    complement = {(row["partId"], row["validTime"]) for row in ledger["operationalComplementPairs"]}
    regional_missing = {pair for pair in missing if pair[0] in bound}
    gaps = [{"partId": p, "validTime": t} for p, t in sorted(regional_missing & complement, key=lambda x: (x[1], x[0]))]
    original_reference = datetime.fromisoformat(ledger["productionReferenceAt"].replace("Z", "+00:00"))
    gaps, _ = regional._normalize_gap_pairs(gaps, bound, original_reference, ledger)
    baseline, baseline_quarantine = regional._samples_by_part(
        shadow, gaps, bound, policy_sha, target_sha, sources, retained, selected_runs)
    expanded, expanded_quarantine = regional._samples_by_part(
        shadow, gaps, bound, policy_sha, target_sha, sources, {**extra, **retained}, selected_runs)
    base_rows = regional._classify_pairs(gaps, baseline)
    extra_rows = regional._classify_pairs(gaps, expanded)
    base_pairs = {(row["partId"], row["validTime"]) for row in base_rows if row["classification"] != regional.MISSING}
    extra_pairs = {(row["partId"], row["validTime"]) for row in extra_rows if row["classification"] != regional.MISSING}
    return {"productionAuthority": False, "counterfactualOnly": True,
            "policyPartCount": len(bound), "missingPairsInsideRegionalPolicy": len(regional_missing),
            "missingPairsOutsideRegionalPolicy": len(missing) - len(regional_missing),
            "originalLedgerComplementOverlap": len(gaps),
            "outsideOriginalLedgerComplement": len(regional_missing - complement),
            "policyScopedRawIdentitiesInResidual": len(raw_policy_pairs),
            "sampleCounters": dict(sorted(candidate_counts.items())),
            "baselineClassifierCoveredInResidual": len(base_pairs),
            "counterfactualClassifierCoveredInResidual": len(extra_pairs),
            "additionalPairsFromRetainedRegionalOutcome": len(extra_pairs - base_pairs),
            "lostPairsInCounterfactual": len(base_pairs - extra_pairs),
            "counterfactualMissingShape": residual_shape(
                {(row["partId"], row["validTime"]) for row in extra_rows if row["classification"] == regional.MISSING},
                original_reference),
            "counterfactualMissingWithExactRawSampleCount": len(
                (regional_missing - extra_pairs) & raw_policy_pairs),
            "counterfactualClassificationCounts": dict(sorted(Counter(row["classification"] for row in extra_rows).items())),
            "baselineQuarantineCount": baseline_quarantine["quarantinedAnchorOrSampleCount"],
            "counterfactualQuarantineCount": expanded_quarantine["quarantinedAnchorOrSampleCount"]}


def om_routes(bank, targets, missing):
    from lib import open_meteo_current_fallback as om
    # This call validates immutable control/manifest before leaf salvage. It does
    # not mutate bank, and salvaged leaves are NOT written or promoted.
    accepted, admissions, dropped, _ = om._read_bank_entries(bank, targets=targets, strict=False)
    manifest_pairs = {(row["partId"], row["validTime"]) for row in bank["entryManifest"]}
    masks = {(row["partId"], row["validTime"]) for row in bank["conflictMasks"]}
    checkpoint = datetime.fromisoformat(bank["checkpointedAt"].replace("Z", "+00:00"))
    target_map = {row["partId"]: row for row in targets}
    allowed_members = {row["entrySha256"]: row for row in bank["entryManifest"]}
    counts = Counter()
    payloads_by_id = {}
    for entry in bank["entries"]:
        if not isinstance(entry, dict) or entry.get("entrySha256") not in allowed_members:
            counts["unknownPayloadCount"] += 1
            continue
        payloads_by_id.setdefault(entry["entrySha256"], []).append(entry)
    for original in bank["entryManifest"]:
        payloads = payloads_by_id.get(original["entrySha256"], [])
        if len(payloads) != 1:
            counts["missingOrDuplicateOriginalPayloadCount"] += 1
            continue
        entry = payloads[0]
        try:
            validated = om._validated_bank_entry(entry, admissions, target_map, checkpoint)
            if om._entry_membership(validated) != original:
                counts["manifestMembershipMismatchCount"] += 1
                continue
            counts["acceptedAgainstDmiReconstructedPointCount"] += 1
            continue
        except (ValueError, TypeError, KeyError, RuntimeError):
            counts["rejectedAgainstDmiReconstructedPointCount"] += 1
        record = entry.get("record")
        part = record.get("partId") if isinstance(record, dict) else None
        target = target_map.get(part)
        point = om._point(record.get("samplingPoint")) if isinstance(record, dict) else None
        target_point = om._point(target.get("waterPoint")) if target else None
        if point is None or target_point is None:
            counts["missingPointIdentityCount"] += 1
            continue
        if point == target_point:
            counts["rejectedDespiteExactPointMatchCount"] += 1
            continue
        if tuple(f"{x:.7f}" for x in point) != tuple(f"{x:.7f}" for x in target_point):
            counts["differentCanonicalPointCount"] += 1
            continue
        # Sensitivity experiment only: use the record's own sub-precision point.
        # This is intentionally NOT authoritative target reconstruction.
        hypothetical = {**target_map, part: {**target, "waterPoint": list(point)}}
        try:
            validated = om._validated_bank_entry(entry, admissions, hypothetical, checkpoint)
            if om._entry_membership(validated) != original:
                raise ValueError("membership mismatch")
            counts["rejectionExplainedOnlyBySubSevenDecimalPointCount"] += 1
        except (ValueError, TypeError, KeyError, RuntimeError):
            counts["rejectedEvenAfterPointSensitivityCount"] += 1
    return {"productionAuthority": False, "sensitivityOnly": True,
            "manifestPairsInResidual": len(manifest_pairs & missing),
            "originalMaskedPairsInResidual": len(masks & missing),
            "manifestControlValidated": True, "acceptedEntryCount": len(accepted),
            "droppedEntryCount": dropped, "recordCounters": dict(sorted(counts.items()))}


def cp_domain_routes(targets, missing):
    from lib.copernicus_current_source_stage import PINNED_PRODUCTS, eligible_target
    result = []
    for ordinal, product in enumerate(PINNED_PRODUCTS):
        eligible = {row["partId"] for row in targets if eligible_target(row, product)}
        rectangle = {row["partId"] for row in targets
                     if product["minimumLongitude"] <= row["waterPoint"][0] <= product["maximumLongitude"]
                     and product["minimumLatitude"] <= row["waterPoint"][1] <= product["maximumLatitude"]}
        excluded = rectangle - eligible
        affected = {(p, t) for p, t in missing if p in excluded}
        result.append({"productOrdinal": ordinal, "configuredEligiblePartCount": len(eligible),
                       "insideDatasetRectanglePartCount": len(rectangle),
                       "codeExcludedInsideRectanglePartCount": len(excluded),
                       "residualPairsCodeExcludedInsideRectangle": len(affected),
                       "residualPartsCodeExcludedInsideRectangle": len({p for p, _ in affected})})
    return {"productionAuthority": False, "rectangleDoesNotProveWetCellCoverage": True, "products": result}


def cp_routes(stage, shadow, shadow_sha, targets, missing, dmi_sha, reference_text):
    from lib.copernicus_current_source_stage import (
        original_stage_positive_evidence, PINNED_PRODUCTS, eligible_target)
    _, attempts = original_stage_positive_evidence(stage, shadow=shadow, targets=targets, shadow_sha256=shadow_sha)
    target_map = {row["partId"]: row for row in targets}
    by_source = {}
    for attempt in attempts:
        indexed = by_source.setdefault(attempt["source"], {})
        for row in attempt["requestedPairs"]:
            indexed.setdefault((row["partId"], row["validTime"]), []).append(attempt)
    summaries = []
    joint = {pair: [] for pair in missing}
    for ordinal, product in enumerate(PINNED_PRODUCTS):
        counts = Counter()
        indexed = by_source.get(product["source"], {})
        for pair in missing:
            part, valid = pair
            tried = indexed.get(pair, [])
            if not eligible_target(target_map[part], product):
                reason = "OUTSIDE_CONFIGURED_PRODUCT_DOMAIN"
            elif not tried:
                reason = "NO_COMPLETED_RECORDED_ATTEMPT"
            elif any(valid in attempt.get("observedNativeValidTimes", []) for attempt in tried):
                reason = "REQUESTED_NATIVE_TIME_RETURNED_BUT_PAIR_MISSING"
            elif all("observedNativeValidTimes" in attempt for attempt in tried):
                reason = "REQUESTED_NATIVE_TIME_ABSENT_IN_RESPONSES"
            else:
                reason = "LEGACY_ATTEMPT_WITHOUT_NATIVE_AXIS_DETAIL"
            counts[reason] += 1
            joint[pair].append(str(ordinal) + ":" + reason)
        if sum(counts.values()) != len(missing):
            raise ValueError("CP route partition incomplete")
        summaries.append({"productOrdinal": ordinal, "missingPairOutcomes": dict(sorted(counts.items()))})
    return {"originalStageValidated": True, "recordedAttemptCount": len(attempts),
            "productionAuthority": False, "originalJournalEvidenceOnly": True,
            "generationDmiInputHashMatches": stage["dmiCurrentInputSha256"] == dmi_sha,
            "referenceMatchesResidual": stage["productionReferenceAt"] == reference_text,
            "products": summaries, "jointOutcomeCounts": dict(sorted(Counter("|".join(v) for v in joint.values()).items()))}
