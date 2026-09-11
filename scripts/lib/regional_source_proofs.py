"""Private, sample-bound regional source evidence co-located with the shadow.

This is not native DMI tuple authority. Producers may capture only after an
entire asset and its original outcome have passed validation. Migration accepts
original validated outcomes, never a source identity reconstructed from samples.
"""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime
import hashlib
import json
from typing import Any

try:
    from .dmi_native_provenance import (
        DKSS_MAX_FORECAST_LEAD_HOURS,
        canonical_current_source_asset, current_source_asset_sha256,
        validate_current_part_outcome_proof,
    )
except ImportError:  # pragma: no cover
    from dmi_native_provenance import (
        DKSS_MAX_FORECAST_LEAD_HOURS,
        canonical_current_source_asset, current_source_asset_sha256,
        validate_current_part_outcome_proof,
    )

FIELD = "regionalSourceProofs"
SAMPLE_REF = "regionalSourceProofRef"
CONTRACT = "regional-dmi-shadow-source-evidence-v1"
SOURCE_CONTRACT = "regional-dmi-original-asset-outcome-v1"
BINDING_CONTRACT = "regional-dmi-shadow-sample-binding-v1"


def _sha(value: Any) -> str:
    return "sha256:" + hashlib.sha256(json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")).hexdigest()


def _binding_key(part_id: str, sample_key: Any) -> str:
    if not isinstance(sample_key, str) or not sample_key:
        raise ValueError("REGIONAL_SAMPLE_IDENTITY_INVALID")
    return _sha({"contractId": BINDING_CONTRACT,
                 "partId": part_id, "sampleKey": sample_key})


def _sample_sha(sample: dict[str, Any]) -> str:
    return _sha({key: value for key, value in sample.items() if key != SAMPLE_REF})


def _container_valid(value: Any) -> bool:
    return (isinstance(value, dict) and value.get("schemaVersion") == 1
            and value.get("contractId") == CONTRACT
            and isinstance(value.get("sources"), dict)
            and isinstance(value.get("bindings"), dict))


def _source_body(*, source_asset: Any, part_outcome_proof: Any,
                 processing_signature: Any, target_ids: list[str],
                 target_registry_sha256: str, policy_sha256: str) -> dict[str, Any]:
    source = canonical_current_source_asset(source_asset)
    if (source is None or source != source_asset
            or source["collection"] != "dkss_lf"):
        raise ValueError("REGIONAL_ORIGINAL_SOURCE_INVALID")
    lead = (datetime.fromisoformat(source["validTime"].replace("Z", "+00:00"))
            - datetime.fromisoformat(source["modelRun"].replace("Z", "+00:00"))).total_seconds()
    if not 0 <= lead <= DKSS_MAX_FORECAST_LEAD_HOURS * 3600:
        raise ValueError("REGIONAL_ORIGINAL_SOURCE_HORIZON_INVALID")
    outcome = validate_current_part_outcome_proof(
        part_outcome_proof, target_ids, target_registry_sha256,
        processing_signature, source,
    )
    return {
        "contractId": SOURCE_CONTRACT, "sourceAsset": source,
        "processingSignature": processing_signature,
        "partOutcomeProof": outcome,
        "targetRegistrySha256": target_registry_sha256,
        "policySha256": policy_sha256,
    }


def create_regional_proof_context(
    shadow: dict[str, Any], *, target_ids: list[str],
    target_registry_sha256: str, policy_sha256: str,
) -> dict[str, Any]:
    """Create one read-only validation context; caches stay outside the shadow."""
    return {"indexPresent": FIELD in shadow, "index": shadow.get(FIELD),
            "targetIds": target_ids, "targetRegistrySha256": target_registry_sha256,
            "policySha256": policy_sha256, "validatedSources": {}}


def regional_sample_authorization(
    context: dict[str, Any], *, part_id: str, sample: dict[str, Any],
) -> tuple[str, dict[str, Any] | None]:
    """Return legacy/valid/invalid; invalid can NEVER fall back to ledger proof.

Unmarked legacy samples remain subject to the old selected-ledger admission.
A present binding or reference makes its positive proof mandatory. Corruption
of one source affects only its referring samples, not sibling assets.
"""
    try:
        key = _binding_key(part_id, sample.get("sampleKey"))
        index = context["index"]
        if not context["indexPresent"]:
            return ("invalid" if SAMPLE_REF in sample else "legacy"), None
        if not _container_valid(index):
            return "invalid", None
        binding = index["bindings"].get(key)
        if binding is None and SAMPLE_REF not in sample:
            return "legacy", None
        if sample.get(SAMPLE_REF) != key or not isinstance(binding, dict):
            return "invalid", None
        body = {name: value for name, value in binding.items()
                if name != "bindingSha256"}
        expected_fields = {"contractId", "partId", "sampleKey", "sampleSha256",
                           "sourceProofSha256", "policySha256", "targetRegistrySha256"}
        if (set(body) != expected_fields or body["contractId"] != BINDING_CONTRACT
                or body["partId"] != part_id
                or body["sampleKey"] != sample.get("sampleKey")
                or body["sampleSha256"] != _sample_sha(sample)
                or body["policySha256"] != context["policySha256"]
                or body["targetRegistrySha256"] != context["targetRegistrySha256"]
                or binding.get("bindingSha256") != _sha(body)):
            return "invalid", None
        proof_key = body["sourceProofSha256"]
        cache = context["validatedSources"]
        if proof_key not in cache:
            raw = index["sources"].get(proof_key)
            canonical = _source_body(
                source_asset=raw.get("sourceAsset") if isinstance(raw, dict) else None,
                part_outcome_proof=raw.get("partOutcomeProof") if isinstance(raw, dict) else None,
                processing_signature=raw.get("processingSignature") if isinstance(raw, dict) else None,
                target_ids=context["targetIds"],
                target_registry_sha256=context["targetRegistrySha256"],
                policy_sha256=context["policySha256"],
            )
            if raw != canonical or _sha(canonical) != proof_key:
                return "invalid", None
            cache[proof_key] = canonical
        source = cache[proof_key]["sourceAsset"]
        if (source["modelRun"] != sample.get("modelRun")
                or source["validTime"] != sample.get("validTime")
                or source["collection"] != sample.get("collection")
                or current_source_asset_sha256(source) != sample.get("sourceAssetSha256")):
            return "invalid", None
        return "valid", source
    except (ValueError, TypeError, KeyError, OverflowError):
        return "invalid", None


def capture_regional_source_proof(
    shadow: dict[str, Any], *, policy: dict[str, Any], targets: list[dict[str, Any]],
    source_asset: dict[str, Any], part_outcome_proof: dict[str, Any],
    processing_signature: str, replace_existing: bool = True,
    previous_shadow: dict[str, Any] | None = None,
) -> dict[str, int]:
    """Bind matching samples after validated EOF, in the isolated shadow stage.

Existing contradictory/invalid bindings may only be replaced after genuine
asset processing, never by migration or by a reader's ledger fallback.
The producer supplies its unchanged pre-stage shadow so a rejected new leaf
cannot displace a still-valid, positively bound old sample of the same identity.
"""
    # Lazy import avoids a cycle: the operational reader also uses this module.
    try:
        from . import regional_current_operational as regional
    except ImportError:  # pragma: no cover
        import regional_current_operational as regional
    bound, policy_sha, target_sha = regional._policy_and_target_binding(
        policy, targets, allow_target_rebinding_as_missing=True,
    )
    body = _source_body(
        source_asset=source_asset, part_outcome_proof=part_outcome_proof,
        processing_signature=processing_signature,
        target_ids=[str(row["partId"]) for row in targets],
        target_registry_sha256=target_sha, policy_sha256=policy_sha,
    )
    index = shadow.get(FIELD)
    if FIELD in shadow and not _container_valid(index):
        if not replace_existing:
            return {"boundSamples": 0, "invalidSamples": 0, "blockedIndex": 1,
                    "preservedSamples": 0}
        # Only genuine EOF may recover the envelope. Preserve its exact bytes
        # as private JSON and retain rejection barriers for every old sample;
        # only samples actually rebound below regain positive authorization.
        index = {"schemaVersion": 1, "contractId": CONTRACT, "sources": {},
                 "bindings": {}, "quarantinedIndexes": [deepcopy(index)]}
        recovery_anchors = dict(shadow.get("anchors") or {})
        for anchor_id, old_anchor in list(recovery_anchors.items()):
            if not isinstance(old_anchor, dict) or not old_anchor.get("regionalProxyCandidate"):
                continue
            old_anchor = deepcopy(old_anchor)
            recovery_anchors[anchor_id] = old_anchor
            for old_sample in old_anchor.get("samples") or []:
                if not isinstance(old_sample, dict):
                    continue
                try:
                    old_key = _binding_key(str(old_anchor.get("partId") or ""), old_sample.get("sampleKey"))
                except ValueError:
                    continue
                index["bindings"][old_key] = {"invalid": True}
                old_sample[SAMPLE_REF] = old_key
        shadow["anchors"] = recovery_anchors
        shadow[FIELD] = index
    if index is None:
        index = {"schemaVersion": 1, "contractId": CONTRACT, "sources": {}, "bindings": {}}
    proof_key = _sha(body)
    source_sha = current_source_asset_sha256(source_asset)
    ledger_sources = {(source_asset["modelRun"], source_asset["validTime"], source_sha): source_asset}
    previous_context = (
        create_regional_proof_context(
            previous_shadow, target_ids=[str(row["partId"]) for row in targets],
            target_registry_sha256=target_sha, policy_sha256=policy_sha,
        ) if replace_existing and isinstance(previous_shadow, dict) else None
    )

    def preserve_previous_sample(part_id: str, part: dict[str, Any],
                                 anchor: dict[str, Any], sample: dict[str, Any]) -> bool:
        if previous_context is None:
            return False
        try:
            key = _binding_key(part_id, sample.get("sampleKey"))
            old_anchor = (previous_shadow.get("anchors") or {}).get(f"REGIONAL_PROXY::{part_id}")
            old_samples = regional._validate_anchor(old_anchor, part, part_id)
            matches = [row for row in old_samples if isinstance(row, dict)
                       and row.get("sampleKey") == sample.get("sampleKey")]
            if len(matches) != 1:
                return False
            old_sample = matches[0]
            status, old_source = regional_sample_authorization(
                previous_context, part_id=part_id, sample=old_sample,
            )
            if status != "valid" or regional._validated_sample(
                old_sample, part_id=part_id, part=part, policy_sha256=policy_sha,
                target_registry_sha256=target_sha, ledger_sources={}, retained_sources={},
                durable_regional_source=old_source,
            ) is None:
                return False
            old_index = previous_context["index"]
            old_binding = old_index["bindings"][key]
            old_proof_key = old_binding["sourceProofSha256"]
            # Restore the exact positive proof and sample together. Neither a
            # legacy ledger fallback nor a duplicate/invalid old leaf qualifies.
            replacement = []
            restored = False
            for row in anchor["samples"]:
                if isinstance(row, dict) and row.get("sampleKey") == old_sample["sampleKey"]:
                    if not restored:
                        replacement.append(deepcopy(old_sample))
                        restored = True
                else:
                    replacement.append(row)
            if not restored:
                return False
            index["sources"][old_proof_key] = deepcopy(old_index["sources"][old_proof_key])
            index["bindings"][key] = deepcopy(old_binding)
            anchor["samples"] = replacement
            shadow[FIELD] = index
            return True
        except (regional.RegionalCurrentOperationalError, ValueError, TypeError, KeyError):
            return False

    written = invalid = preserved = 0
    for part_id, part in bound.items():
        if part.get("regionalEvidenceEligible") is False:
            continue
        anchor = (shadow.get("anchors") or {}).get(f"REGIONAL_PROXY::{part_id}")
        try:
            samples = regional._validate_anchor(anchor, part, part_id)
        except regional.RegionalCurrentOperationalError:
            invalid += 1
            continue
        key_counts: dict[str, int] = {}
        for sample in samples:
            if isinstance(sample, dict) and isinstance(sample.get("sampleKey"), str):
                sample_key = sample["sampleKey"]
                key_counts[sample_key] = key_counts.get(sample_key, 0) + 1
        preserved_keys: set[str] = set()
        for sample in list(samples):
            if not isinstance(sample, dict) or sample.get("sourceAssetSha256") != source_sha:
                continue
            try:
                key = _binding_key(part_id, sample.get("sampleKey"))
                if key in preserved_keys:
                    continue
                if key_counts.get(sample["sampleKey"], 0) != 1:
                    # Migration must not bind the first of ambiguous legacy
                    # duplicates and thereby suppress their conflict. Only a
                    # genuine re-read in record_profiles can replace them.
                    index["bindings"][key] = {"invalid": True}
                    sample[SAMPLE_REF] = key
                    shadow[FIELD] = index
                    invalid += 1
                    if preserve_previous_sample(part_id, part, anchor, sample):
                        preserved += 1
                        preserved_keys.add(key)
                    continue
                if not replace_existing and (key in index["bindings"] or SAMPLE_REF in sample):
                    continue
                validated = regional._validated_sample(
                    sample, part_id=part_id, part=part, policy_sha256=policy_sha,
                    target_registry_sha256=target_sha, ledger_sources=ledger_sources,
                    retained_sources={},
                )
                if validated is None:
                    if preserve_previous_sample(part_id, part, anchor, sample):
                        preserved += 1
                        preserved_keys.add(key)
                    continue
                binding = {
                    "contractId": BINDING_CONTRACT, "partId": part_id,
                    "sampleKey": sample["sampleKey"], "sampleSha256": _sample_sha(sample),
                    "sourceProofSha256": proof_key, "policySha256": policy_sha,
                    "targetRegistrySha256": target_sha,
                }
                binding["bindingSha256"] = _sha(binding)
                # Each source and sample binding is installed before its ref.
                index["sources"][proof_key] = deepcopy(body)
                index["bindings"][key] = binding
                sample[SAMPLE_REF] = key
                written += 1
            except (regional.RegionalCurrentOperationalError, ValueError, TypeError, KeyError):
                invalid += 1
                if preserve_previous_sample(part_id, part, anchor, sample):
                    preserved += 1
                    preserved_keys.add(key)
    if written:
        shadow[FIELD] = index
    return {"boundSamples": written, "invalidSamples": invalid, "blockedIndex": 0,
            "preservedSamples": preserved}


def migrate_regional_source_proofs(
    shadow: dict[str, Any], *, policy: dict[str, Any], targets: list[dict[str, Any]],
    original_proofs: list[dict[str, Any]],
) -> dict[str, int]:
    """Persist already validated original outcomes; never derive one from raw rows.

The caller must obtain these entries from validated original ledger/retained
metadata. This function independently checks every canonical source/outcome.
It neither edits native attestation lists nor manufactures native pair proof.
"""
    summary = {"boundSamples": 0, "invalidSamples": 0, "blockedIndex": 0,
               "invalidProofs": 0, "preservedSamples": 0}
    try:
        from . import regional_current_operational as regional
    except ImportError:  # pragma: no cover
        import regional_current_operational as regional
    _, policy_sha, target_sha = regional._policy_and_target_binding(
        policy, targets, allow_target_rebinding_as_missing=True,
    )
    candidates: dict[str, tuple[str, dict[str, Any]]] = {}
    conflicts: set[str] = set()
    for original in original_proofs:
        try:
            if not isinstance(original, dict):
                raise ValueError("REGIONAL_ORIGINAL_PROOF_INVALID")
            source = original.get("sourceAsset")
            if isinstance(source, dict) and source.get("collection") != "dkss_lf":
                continue
            body = _source_body(
                source_asset=source, part_outcome_proof=original.get("partOutcomeProof"),
                processing_signature=original.get("processingSignature"),
                target_ids=[str(row["partId"]) for row in targets],
                target_registry_sha256=target_sha, policy_sha256=policy_sha,
            )
            source_sha, proof_sha = current_source_asset_sha256(source), _sha(body)
            if source_sha in candidates and candidates[source_sha][0] != proof_sha:
                conflicts.add(source_sha)
            else:
                candidates[source_sha] = (proof_sha, original)
        except (ValueError, TypeError, KeyError):
            summary["invalidProofs"] += 1
    for source_sha, (_, original) in sorted(candidates.items()):
        if source_sha in conflicts:
            summary["invalidProofs"] += 1
            continue
        try:
            counts = capture_regional_source_proof(
                shadow, policy=policy, targets=targets, source_asset=original["sourceAsset"],
                part_outcome_proof=original.get("partOutcomeProof"),
                processing_signature=original.get("processingSignature"),
                replace_existing=False,
            )
            for key, value in counts.items():
                summary[key] += value
        except (ValueError, TypeError, KeyError):
            summary["invalidProofs"] += 1
    if conflicts:
        index = shadow.get(FIELD)
        if FIELD not in shadow:
            index = {"schemaVersion": 1, "contractId": CONTRACT, "sources": {}, "bindings": {}}
        if _container_valid(index):
            for anchor in (shadow.get("anchors") or {}).values():
                if not isinstance(anchor, dict) or not anchor.get("regionalProxyCandidate"):
                    continue
                for sample in anchor.get("samples") or []:
                    if not isinstance(sample, dict) or sample.get("sourceAssetSha256") not in conflicts:
                        continue
                    try:
                        key = _binding_key(str(anchor.get("partId") or ""), sample.get("sampleKey"))
                    except ValueError:
                        continue
                    # An existing durable binding already identifies its exact
                    # decoder/outcome. Only ambiguous unbound legacy leaves
                    # receive a rejection barrier here.
                    if key not in index["bindings"] and SAMPLE_REF not in sample:
                        index["bindings"][key] = {"invalid": True}
                        sample[SAMPLE_REF] = key
            shadow[FIELD] = index
    return summary


def prune_regional_source_proofs(shadow: dict[str, Any]) -> None:
    """Remove proofs only after their last sample has actually been removed."""
    index = shadow.get(FIELD)
    if not _container_valid(index):
        return
    referenced = set()
    for anchor in (shadow.get("anchors") or {}).values():
        if not isinstance(anchor, dict):
            continue
        part_id = str(anchor.get("partId") or "")
        for sample in anchor.get("samples") or []:
            if not isinstance(sample, dict):
                continue
            # Keep an existing invalid binding too: pruning must not turn a
            # known rejection into an unmarked legacy sample admitted later.
            try:
                referenced.add(_binding_key(part_id, sample.get("sampleKey")))
            except ValueError:
                pass
            if isinstance(sample.get(SAMPLE_REF), str):
                referenced.add(sample[SAMPLE_REF])
    index["bindings"] = {key: value for key, value in index["bindings"].items() if key in referenced}
    source_refs = {row.get("sourceProofSha256") for row in index["bindings"].values()
                   if isinstance(row, dict) and isinstance(row.get("sourceProofSha256"), str)}
    index["sources"] = {key: value for key, value in index["sources"].items() if key in source_refs}
