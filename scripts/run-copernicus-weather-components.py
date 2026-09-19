#!/usr/bin/env python3
"""Bounded private CP component producer, or credential-free original-byte audit.

No score/deploy/workflow mutation. The --verify-only path cannot call providers;
it re-parses immutable dynamic and static files and returns only admitted bank
members. The Node consumer uses this actual process result as opaque authority.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

from lib.copernicus_weather_component_bank import (
    empty_component_bank, validate_component_bank, validate_component_plan,
    produce_component_bank, project_component_candidates, rebase_component_bank,
    save_component_bank, seal_component_projection,
    build_component_plan,
    _sealed,
)
from lib.copernicus_weather_components import read_component_subset, CONTRACTS
from lib.copernicus_component_spatial import make_spatial_admitter, component_spatial_policy, static_request
from lib.copernicus_component_transport import (
    ComponentSubsetCache, BoundedComponentTransport, atomic_json, subset_worker,
)


def verify_original_components(plan: dict, bank: dict, cache: ComponentSubsetCache) -> dict:
    """Bind values to original dynamic bytes and wetness to original mask bytes."""
    validate_component_plan(plan)
    validate_component_bank(bank, targets=plan["targets"])
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    parsed, receipts, static, failures = {}, {}, {}, []
    authorized = set()
    for entry in bank["records"]:
        row = entry["native"]
        if row["component"] == "waterLevel":
            continue  # Preserved legacy bytes are not an authorised runtime source.
        request = requests[entry["requestSha256"]]
        key = request["requestSha256"], row["subsetSha256"]
        if key not in parsed:
            try:
                path, receipt = cache.load_receipt(request, row["subsetSha256"])
                read = read_component_subset(path, contract_key=row["contractKey"], target=request["target"],
                                              expected_times=request["expectedTimes"])
                parsed[key] = {r["validTime"]: r for r in read["records"]}
                receipts[key] = receipt
            except (OSError, ValueError, KeyError):
                parsed[key] = {}
        if parsed[key].get(row["validTime"]) == row and entry["acquisitionAt"] == receipts[key]["acquisitionAt"]:
            authorized.add(entry["recordId"])
        else:
            failures.append({"recordId": entry["recordId"], "reason": "CP_ORIGINAL_DYNAMIC_BYTES_NOT_VERIFIED"})
    def evidence_for(contract_key, target):
        key = contract_key, target["partId"]
        if key not in static:
            try:
                static[key] = cache.load_static(contract_key, target)
            except (OSError, ValueError, KeyError):
                static[key] = None
        return static[key]
    actual_spatial = make_spatial_admitter(plan, evidence_for)
    def admit(entry, request, target):
        if entry["recordId"] not in authorized:
            return None
        certificate = actual_spatial(entry, request, target)
        if certificate is None:
            return None
        certificate["witness"]["dynamicReceipt"] = {k: v for k, v in receipts[
            (request["requestSha256"], entry["native"]["subsetSha256"])].items() if k != "request"}
        certificate["evidenceSha256"] = seal_component_projection({"spatialWitness": certificate["witness"]})["projectionSha256"]
        return certificate
    stage = project_component_candidates(plan, bank, admit_spatial=admit, include_retained_bank=True)
    return {"kind": "RAVRADAR_PRIVATE_CP_COMPONENT_AUTHORITY", "schemaVersion": 1,
        "targets": plan["targets"], "productionReferenceAt": plan["productionReferenceAt"],
        "retentionStartAt": plan["retentionStartAt"], "retentionEndAt": plan["retentionEndAt"],
        "spatialPolicy": component_spatial_policy(), "planSha256": plan["planSha256"],
        "bankSha256": bank["bankSha256"], "stage": stage, "recordFailures": failures,
        "originalBytesVerified": True}


def pinned_plan(raw: dict) -> dict:
    """Coverage rectangles only avoid impossible requests; they grant no admission.

    Official PUMs: NWS 004-013/014 section General Information; Baltic
    003-006/007 section II.3.7 and 003-010 section II.3. Actual nearest wet
    native cell/static-byte verification is still mandatory afterwards.
    """
    targets = [{"partId": p["partId"], "parentZoneId": p.get("zoneId", p.get("parentZoneId", p.get("sourceZoneId"))),
                "waterPoint": p["waterPoint"]} for p in raw["parts"]]
    routes = {}
    for target in targets:
        lon, lat = target["waterPoint"]
        regions = []
        if -16 <= lon <= 13 and 46 <= lat <= 62.75:
            regions.append("nws")
        if 9 <= lon <= 30 and 53 <= lat <= 66:
            regions.append("baltic")
        routes[target["partId"]] = {"wind": [], **{component: [r + "-" + suffix for r in regions]
            for component, suffix in (("wave", "wave"), ("waterTemperature", "temperature"))}}
    return build_component_plan(targets=targets, production_reference_at=raw["productionReferenceAt"],
        needs=raw["needs"], product_routes=routes, routing_policy=component_spatial_policy(),
        retention_start_at=raw["retentionStartAt"], retention_end_at=raw["retentionEndAt"])


def storage_inventory(bank: dict, cache: ComponentSubsetCache) -> dict:
    """Exact bank-referenced files only; no glob, recursive inventory or network."""
    validate_component_bank(bank, targets=bank["targets"])
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    files, checked, required_static = {}, set(), set()
    def add(path):
        relative = path.relative_to(cache.directory).as_posix()
        payload = path.read_bytes()
        files[relative] = {"relativePath": relative, "sha256": "sha256:" + hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}
    for entry in bank["records"]:
        request, row = requests[entry["requestSha256"]], entry["native"]
        required_static.add(static_request(row["contractKey"], request["target"])["requestSha256"])
        pair = request["requestSha256"], row["subsetSha256"]
        if pair in checked:
            continue
        checked.add(pair)
        path, _ = cache.load_receipt(request, row["subsetSha256"])
        add(path)
        add(cache.receipt_path(*pair))
    # Also retain already observed land/ineligible masks, which have no positive
    # dynamic row. The finite central target x pinned product set bounds this;
    # no arbitrary path or old/changed point is swept into the bundle.
    for target in bank["targets"]:
      for contract_key in CONTRACTS:
        static = static_request(contract_key, target)
        pointer = cache.directory / "static" / (static["requestSha256"][7:] + ".json")
        if not pointer.exists() and static["requestSha256"] in required_static:
            raise ValueError("CP_REFERENCED_STATIC_ORIGINAL_REQUIRED")
        if pointer.exists():
            digest = json.loads(pointer.read_text(encoding="utf-8"))["subsetSha256"]
            path, _ = cache.load_receipt(static, digest)
            add(pointer)
            add(path)
            add(cache.receipt_path(static["requestSha256"], digest))
    return {"kind": "CP_COMPONENT_STORAGE_INVENTORY", "schemaVersion": 1,
            "bankSha256": bank["bankSha256"], "files": [files[k] for k in sorted(files)]}


def exclude_unverifiable_originals(bank: dict, cache: ComponentSubsetCache) -> tuple[dict, int]:
    """Release only slots whose immutable originals cannot be authenticated.

    No original file is deleted. Good siblings and all their original proofs
    survive. A self-consistent bank row without its bytes must not suppress
    the subsequent actual acquisition plan forever.
    """
    validate_component_bank(bank, targets=bank["targets"])
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    available = {}
    records = []
    for entry in bank["records"]:
        key = entry["requestSha256"], entry["native"]["subsetSha256"]
        if key not in available:
            try:
                _, receipt = cache.load_receipt(requests[key[0]], key[1])
                available[key] = receipt["acquisitionAt"]
            except (OSError, ValueError, KeyError):
                available[key] = False
        if available[key] == entry["acquisitionAt"]:
            records.append(entry)
    removed = len(bank["records"]) - len(records)
    if not removed:
        return bank, 0
    used = {e["requestSha256"] for e in records}
    histories = {requests[h]["targetRegistrySha256"] for h in used}
    value = {k: v for k, v in bank.items() if k != "bankSha256"}
    value.update(records=records, requests=[r for r in bank["requests"] if r["requestSha256"] in used],
        targetRegistryHistory=[h for h in bank["targetRegistryHistory"] if h["targetRegistrySha256"] in histories])
    result = _sealed(value, "bankSha256")
    validate_component_bank(result, targets=bank["targets"])
    return result, removed


def main(argv=None) -> int:
    args_list = list(sys.argv[1:] if argv is None else argv)
    if args_list[:1] == ["--subset-worker"]:
        if len(args_list) != 3:
            return 1
        return subset_worker(Path(args_list[1]), Path(args_list[2]))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--plan-input", type=Path)
    parser.add_argument("--bank", type=Path, required=True)
    parser.add_argument("--cache-directory", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--storage-inventory", type=Path)
    parser.add_argument("--previous-targets", type=Path)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--budget-seconds", type=float)
    parser.add_argument("--request-timeout-seconds", type=float)
    parser.add_argument("--maximum-requests", type=int)
    parser.add_argument("--maximum-download-bytes", type=int)
    args = parser.parse_args(args_list)
    cache = ComponentSubsetCache(args.cache_directory)
    if args.storage_inventory is not None:
        bank = json.loads(args.bank.read_text(encoding="utf-8"))
        atomic_json(args.storage_inventory, storage_inventory(bank, cache))
        return 0
    if args.output is None or bool(args.plan) == bool(args.plan_input):
        raise ValueError("CP_COMPONENT_ONE_PLAN_INPUT_AND_OUTPUT_REQUIRED")
    plan = (pinned_plan(json.loads(args.plan_input.read_text(encoding="utf-8"))) if args.plan_input else
            validate_component_plan(json.loads(args.plan.read_text(encoding="utf-8"))))
    bank = json.loads(args.bank.read_text(encoding="utf-8")) if args.bank.exists() else empty_component_bank(plan["targets"])
    if bank["targetRegistrySha256"] != plan["targetRegistrySha256"]:
        previous_targets = json.loads(args.previous_targets.read_text(encoding="utf-8")) if args.previous_targets else bank["targets"]
        bank = rebase_component_bank(bank, previous_targets=previous_targets,
            targets=plan["targets"], retention_start_at=plan["retentionStartAt"], retention_end_at=plan["retentionEndAt"])["bank"]
    validate_component_bank(bank, targets=plan["targets"])
    attempts = []
    invalid_original_records = 0
    if not args.verify_only:
        if (args.budget_seconds is None or not 0 < args.budget_seconds <= 3300
            or any(v is None for v in (args.request_timeout_seconds, args.maximum_requests, args.maximum_download_bytes))):
            raise ValueError("CP_COMPONENT_EXPLICIT_TRANSPORT_BUDGET_REQUIRED")
        if plan["routingPolicy"] != component_spatial_policy():
            raise ValueError("CP_COMPONENT_PINNED_ROUTING_POLICY_REQUIRED")
        bank, invalid_original_records = exclude_unverifiable_originals(bank, cache)
        if invalid_original_records:
            save_component_bank(args.bank, bank, targets=plan["targets"])
        transport = BoundedComponentTransport(cache, deadline_epoch=time.time() + args.budget_seconds,
            request_timeout_seconds=args.request_timeout_seconds, maximum_requests=args.maximum_requests,
            maximum_download_bytes=args.maximum_download_bytes)
        progress_path = args.bank.with_suffix(args.bank.suffix + ".progress.json")
        previous = json.loads(progress_path.read_text(encoding="utf-8")) if progress_path.exists() else {}
        cursor = previous.get("nextCursor")
        def checkpoint(value, attempt_rows):
            save_component_bank(args.bank, value, targets=plan["targets"])
            latest = attempt_rows[-1] if attempt_rows else None
            atomic_json(progress_path, {"kind": "CP_COMPONENT_PROGRESS_CURSOR", "schemaVersion": 1,
                "planSha256": plan["planSha256"], "bankSha256": value["bankSha256"],
                "attempts": attempt_rows, "nextCursor": [latest["partId"], latest["contractKey"]] if latest else cursor})
        result = produce_component_bank(plan, bank, acquire_subset=transport.acquire_subset,
            acquisition_at=lambda: transport.last_receipt["acquisitionAt"],
            checkpoint=checkpoint, should_continue=transport.can_continue,
            start_after=tuple(cursor) if isinstance(cursor, list) and len(cursor) == 2 else None,
            prepare_reusable_group=lambda key, target: transport.evidence_for(key, target) is not None)
        bank, attempts = result["bank"], result["attempts"]
        # Even zero work emits a valid bank; the following verification has no
        # network path and cannot claim success merely from a status marker.
        save_component_bank(args.bank, bank, targets=plan["targets"])
    authority = verify_original_components(plan, bank, cache)
    authority["attempts"] = attempts
    authority["invalidOriginalRecordsReleasedForRetry"] = invalid_original_records
    # An in-memory rebase/empty view is not a claim that a new bank was saved.
    authority["persistedBankSha256"] = (json.loads(args.bank.read_text(encoding="utf-8"))["bankSha256"]
        if args.bank.exists() else None)
    atomic_json(args.output, authority)
    # In-progress is legitimate bounded progress; remainingNeeds routes to OM.
    print("Copernicus component progress saved; original-byte admission completed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        print("CP_COMPONENT_RUN_FAILED_SAFELY", file=sys.stderr)
        raise SystemExit(1)
