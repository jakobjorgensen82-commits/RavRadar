"""Selected-source planning is separate from the immutable native DMI ledger."""
from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any
from .current_model_reference import exact_hour, validate_model_reference

CONTRACT_ID = "current-aged-dmi-response-bound-challenge-v1"


def build_challenge_plan(*, attestation: dict, ledger: dict, dmi_input_sha256: str,
                         production_reference_at: str) -> dict:
    from .copernicus_current import canonical_sha256
    from .dmi_native_provenance import current_source_asset_sha256
    reference = exact_hour(production_reference_at)
    pairs = []
    for row in attestation["verifiedPairSources"]:
        source = row["source"]
        if reference - exact_hour(source["modelRun"]) < timedelta(hours=96):
            continue
        pairs.append({"partId": row["partId"], "validTime": row["validTime"],
                      "protectedModelRun": source["modelRun"],
                      "protectedSourceAssetSha256": current_source_asset_sha256(source)})
    pairs.sort(key=lambda row: (row["validTime"], row["partId"]))
    value = {"contractId": CONTRACT_ID, "productionReferenceAt": production_reference_at,
             "dmiCurrentInputSha256": dmi_input_sha256, "dmiLedgerSha256": canonical_sha256(ledger),
             "dmiAttestationSha256": canonical_sha256(attestation),
             "rawDmiVerifiedPairCount": len(attestation["verifiedPairSources"]),
             "challengePairCount": len(pairs), "challengePairs": pairs}
    value["planSha256"] = canonical_sha256(value)
    return validate_challenge_plan(value)


def validate_challenge_plan(plan: Any) -> dict:
    from .copernicus_current import canonical_sha256, valid_sha256
    fields = {"contractId", "productionReferenceAt", "dmiCurrentInputSha256", "dmiLedgerSha256",
              "dmiAttestationSha256", "rawDmiVerifiedPairCount", "challengePairCount", "challengePairs", "planSha256"}
    if not isinstance(plan, dict) or set(plan) != fields or plan["contractId"] != CONTRACT_ID:
        raise ValueError("CURRENT_CHALLENGE_PLAN_INVALID")
    reference = exact_hour(plan["productionReferenceAt"])
    pairs = plan["challengePairs"]
    if (not isinstance(pairs, list) or type(plan["challengePairCount"]) is not int
            or type(plan["rawDmiVerifiedPairCount"]) is not int
            or len(pairs) != plan["challengePairCount"] or not 0 <= len(pairs) <= plan["rawDmiVerifiedPairCount"]
            or any(not valid_sha256(plan[field]) for field in ("dmiCurrentInputSha256", "dmiLedgerSha256", "dmiAttestationSha256", "planSha256"))
            or plan["planSha256"] != canonical_sha256({key: value for key, value in plan.items() if key != "planSha256"})):
        raise ValueError("CURRENT_CHALLENGE_PLAN_INVALID")
    keys = []
    for row in pairs:
        if (not isinstance(row, dict) or set(row) != {"partId", "validTime", "protectedModelRun", "protectedSourceAssetSha256"}
                or not isinstance(row["partId"], str) or not row["partId"]
                or not valid_sha256(row["protectedSourceAssetSha256"])
                or reference - exact_hour(row["protectedModelRun"]) < timedelta(hours=96)
                or not reference <= exact_hour(row["validTime"]) <= reference + timedelta(hours=117)):
            raise ValueError("CURRENT_CHALLENGE_PAIR_INVALID")
        keys.append((row["validTime"], row["partId"]))
    if keys != sorted(set(keys)):
        raise ValueError("CURRENT_CHALLENGE_PAIR_INVALID")
    return plan


def challenge_pairs(plan: dict | None) -> dict[tuple[str, str], dict]:
    if plan is None:
        return {}
    return {(row["partId"], row["validTime"]): row for row in validate_challenge_plan(plan)["challengePairs"]}


def eligible_challenge_record(record: dict, acquisition: dict, challenge: dict,
                              reference: datetime) -> bool:
    proof = record.get("modelReference")
    if proof is None:
        return False
    validate_model_reference(proof, subset_sha256=acquisition["subsetSha256"],
                             valid_time=record["validTime"], acquisition_at=acquisition["acquisitionAt"])
    return exact_hour(challenge["protectedModelRun"]) < exact_hour(proof["modelRun"]) <= reference
