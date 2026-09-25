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
import os
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from lib.copernicus_weather_component_bank import (
    empty_component_bank, validate_component_bank, validate_component_plan,
    backfill_verified_component_banks, produce_component_bank, project_component_candidates, rebase_component_bank,
    save_component_bank, seal_component_projection,
    build_component_plan,
    _sealed,
)
from lib.copernicus_weather_components import read_component_subset, CONTRACTS
from lib.copernicus_component_spatial import (
    make_spatial_admitter, component_spatial_policy, eligible_static_cell, static_request,
)
from lib.copernicus_component_transport import (
    ComponentSubsetCache, BoundedComponentTransport, atomic_json, subset_worker,
)


def original_component_admitter(plan: dict, cache: ComponentSubsetCache):
    """One original-byte decision for retry planning and final admission."""
    parsed, receipts, static = {}, {}, {}

    def dynamic_verified(entry, request):
        row = entry["native"]
        key = request["requestSha256"], row["subsetSha256"]
        if key not in parsed:
            try:
                path, receipt = cache.load_receipt(request, row["subsetSha256"])
                read = read_component_subset(path, contract_key=row["contractKey"], target=request["target"],
                                              expected_times=request["expectedTimes"])
                parsed[key] = {native["validTime"]: native for native in read["records"]}
                receipts[key] = receipt
            except (OSError, ValueError, KeyError):
                parsed[key] = {}
        return bool(parsed[key].get(row["validTime"]) == row
            and entry["acquisitionAt"] == (receipts.get(key) or {}).get("acquisitionAt"))

    def evidence_for(contract_key, target, grid_point):
        key = contract_key, target["partId"], tuple(grid_point)
        if key not in static:
            try:
                static[key] = cache.load_static_for_grid(contract_key, target, grid_point)
            except (OSError, ValueError, KeyError):
                static[key] = None
        return static[key]
    actual_spatial = make_spatial_admitter(plan, evidence_for)
    def admit(entry, request, target):
        if not dynamic_verified(entry, request):
            return None
        certificate = actual_spatial(entry, request, target)
        if certificate is None:
            return None
        certificate["witness"]["dynamicReceipt"] = {k: v for k, v in receipts[
            (request["requestSha256"], entry["native"]["subsetSha256"])].items() if k != "request"}
        certificate["evidenceSha256"] = seal_component_projection({"spatialWitness": certificate["witness"]})["projectionSha256"]
        return certificate
    def reset():
        parsed.clear()
        receipts.clear()
        static.clear()
    return admit, dynamic_verified, reset


def verify_original_components(plan: dict, bank: dict, cache: ComponentSubsetCache) -> dict:
    """Bind values to original dynamic bytes and wetness to original mask bytes."""
    validate_component_plan(plan)
    validate_component_bank(bank, targets=plan["targets"])
    requests = {r["requestSha256"]: r for r in bank["requests"]}
    admit, dynamic_verified, _ = original_component_admitter(plan, cache)
    failures = []
    for entry in bank["records"]:
        if entry["native"]["component"] == "waterLevel":
            continue  # Preserved legacy bytes are not an authorised runtime source.
        if not dynamic_verified(entry, requests[entry["requestSha256"]]):
            failures.append({"recordId": entry["recordId"], "reason": "CP_ORIGINAL_DYNAMIC_BYTES_NOT_VERIFIED"})
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
    files, checked, checked_static = {}, set(), set()
    def add(path):
        relative = path.relative_to(cache.directory).as_posix()
        payload = path.read_bytes()
        files[relative] = {"relativePath": relative, "sha256": "sha256:" + hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}
    for entry in bank["records"]:
        request, row = requests[entry["requestSha256"]], entry["native"]
        static_req = static_request(row["contractKey"], request["target"])
        static_key = static_req["requestSha256"], tuple(row["gridPoint"])
        if static_key not in checked_static:
            evidence = cache.load_static_for_grid(row["contractKey"], request["target"], row["gridPoint"])
            if evidence is None:
                raise ValueError("CP_REFERENCED_STATIC_ORIGINAL_REQUIRED")
            subset = evidence["subsetSha256"]
            static_path, _ = cache.load_receipt(static_req, subset)
            add(static_path)
            add(cache.receipt_path(static_req["requestSha256"], subset))
            checked_static.add(static_key)
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
        if pointer.exists():
            if pointer.is_symlink():
                raise ValueError("CP_STATIC_POINTER_SYMLINK_INVALID")
            try:
                digest = json.loads(pointer.read_text(encoding="utf-8"))["subsetSha256"]
                path, _ = cache.load_receipt(static, digest)
            except (OSError, ValueError, KeyError):
                continue  # Optional acquisition hint, never a retained row's only proof.
            add(pointer)
            add(path)
            add(cache.receipt_path(static["requestSha256"], digest))
    return {"kind": "CP_COMPONENT_STORAGE_INVENTORY", "schemaVersion": 1,
            "bankSha256": bank["bankSha256"], "files": [files[k] for k in sorted(files)]}


def merge_original_component_generations(latest: dict, latest_cache: ComponentSubsetCache,
                                         complete: dict, complete_cache: ComponentSubsetCache,
                                         *, targets: list[dict], retention_start_at: str,
                                         retention_end_at: str, output_root: Path) -> dict:
    """Stage a dual-bank union with every selected immutable original, or none.

    Both inputs must already come from independently verified protected packs.
    This function still rechecks native bytes and wet-cell evidence rather than
    trusting the pack manifest as scientific admission. Identical dynamic
    subset bytes are rebound to one genuine receipt; an incompatible dynamic
    receipt or original-file collision still fails closed.
    """
    validate_component_bank(latest, targets=latest["targets"])
    validate_component_bank(complete, targets=complete["targets"])
    output_root = Path(output_root)
    if output_root.exists():
        raise ValueError("CP_COMPONENT_MERGE_DESTINATION_EXISTS")
    output_root.parent.mkdir(parents=True, exist_ok=True)
    source_roots = [latest_cache.directory.resolve(), complete_cache.directory.resolve()]
    if any(output_root.resolve() == root or root in output_root.resolve().parents
           or output_root.resolve() in root.parents for root in source_roots):
        raise ValueError("CP_COMPONENT_MERGE_SOURCE_DESTINATION_OVERLAP")
    source_rows = []
    for bank, cache in ((latest, latest_cache), (complete, complete_cache)):
        plan = {"targets": bank["targets"], "targetRegistrySha256": bank["targetRegistrySha256"]}
        admit, _, _ = original_component_admitter(plan, cache)
        source_rows.append((bank, cache, admit,
                            {row["requestSha256"]: row for row in bank["requests"]},
                            {(row["requestSha256"], row["native"]["subsetSha256"],
                              row["native"]["validTime"]): row for row in bank["records"]}))
    merged = backfill_verified_component_banks(latest, complete, targets=targets,
        retention_start_at=retention_start_at, retention_end_at=retention_end_at,
        admit_latest=source_rows[0][2], admit_complete=source_rows[1][2])
    requests = {row["requestSha256"]: row for row in merged["requests"]}
    with tempfile.TemporaryDirectory(prefix=".cp-generation-", dir=output_root.parent,
                                     ignore_cleanup_errors=True) as temporary:
        staged = Path(temporary)
        destination_cache = ComponentSubsetCache(staged / "cache")
        destination_cache.directory.mkdir()
        def copy_exact(source: Path, destination: Path, *, same_verified_static=False):
            if source.is_symlink():
                raise ValueError("CP_COMPONENT_MERGE_SOURCE_SYMLINK")
            content = source.read_bytes()
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists():
                if destination.is_symlink() or (destination.read_bytes() != content
                    and not same_verified_static):
                    raise ValueError("CP_COMPONENT_MERGE_ORIGINAL_CONFLICT")
                return
            with destination.open("xb") as handle:
                handle.write(content)
        for entry in sorted(merged["records"],
                            key=lambda row: row["native"]["validTime"], reverse=True):
            request = requests[entry["requestSha256"]]
            record_key = (entry["requestSha256"], entry["native"]["subsetSha256"],
                          entry["native"]["validTime"])
            source = next(((cache, originals) for bank, cache, admit, originals, records in source_rows
                           if (original := records.get(record_key)) is not None
                           and original["native"] == entry["native"]
                           and admit(original, originals[entry["requestSha256"]], request["target"])), None)
            if source is None:
                raise ValueError("CP_COMPONENT_MERGE_SELECTED_ORIGINAL_UNAVAILABLE")
            cache, originals = source
            original_request = originals[entry["requestSha256"]]
            dynamic_hash = entry["native"]["subsetSha256"]
            dynamic_cache = None
            for _, candidate_cache, _, candidate_requests, _ in source_rows:
                candidate_request = candidate_requests.get(entry["requestSha256"])
                if candidate_request is None:
                    continue
                try:
                    _, candidate_receipt = candidate_cache.load_receipt(candidate_request, dynamic_hash)
                except (OSError, ValueError, KeyError):
                    continue
                if candidate_receipt["acquisitionAt"] == entry["acquisitionAt"]:
                    dynamic_cache = candidate_cache
                    break
            if dynamic_cache is None:
                raise ValueError("CP_COMPONENT_MERGE_RECEIPT_UNAVAILABLE")
            copy_exact(dynamic_cache.object_path(dynamic_hash), destination_cache.object_path(dynamic_hash))
            copy_exact(dynamic_cache.receipt_path(entry["requestSha256"], dynamic_hash),
                       destination_cache.receipt_path(entry["requestSha256"], dynamic_hash))
            static = static_request(entry["native"]["contractKey"], original_request["target"])
            evidence = cache.load_static_for_grid(entry["native"]["contractKey"],
                                                  original_request["target"], entry["native"]["gridPoint"])
            if evidence is None:
                raise ValueError("CP_COMPONENT_MERGE_STATIC_ORIGINAL_UNAVAILABLE")
            static_hash = evidence["subsetSha256"]
            cache.load_receipt(static, static_hash)
            copy_exact(cache.object_path(static_hash), destination_cache.object_path(static_hash))
            copy_exact(cache.receipt_path(static["requestSha256"], static_hash),
                       destination_cache.receipt_path(static["requestSha256"], static_hash),
                       same_verified_static=True)
            pointer = destination_cache.directory / "static" / (static["requestSha256"][7:] + ".json")
            if not pointer.exists():
                atomic_json(pointer, {"subsetSha256": static_hash})
        save_component_bank(staged / "bank.json", merged, targets=targets)
        merged_admit, _, _ = original_component_admitter(
            {"targets": merged["targets"], "targetRegistrySha256": merged["targetRegistrySha256"]},
            destination_cache)
        if any(merged_admit(entry, requests[entry["requestSha256"]],
                            requests[entry["requestSha256"]]["target"]) is None
               for entry in merged["records"]):
            raise ValueError("CP_COMPONENT_MERGE_FINAL_ORIGINAL_INVALID")
        storage_inventory(merged, destination_cache)
        os.replace(staged, output_root)
    return {"bankSha256": merged["bankSha256"], "recordCount": len(merged["records"]),
            "latestRecordCount": len(latest["records"]), "completeRecordCount": len(complete["records"])}


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


def central_component_targets(registry: dict) -> list[dict]:
    zones = registry.get("zones")
    if (not isinstance(zones, dict) or type(registry.get("partCount")) is not int
        or registry["partCount"] < 1):
        raise ValueError("CP_COMPONENT_CENTRAL_TARGET_REGISTRY_INVALID")
    targets = []
    for zone_id, parts in zones.items():
        if not isinstance(parts, list):
            raise ValueError("CP_COMPONENT_CENTRAL_TARGET_REGISTRY_INVALID")
        for part in parts:
            if not isinstance(part, dict) or part.get("sourceZoneId") != zone_id:
                raise ValueError("CP_COMPONENT_CENTRAL_TARGET_REGISTRY_INVALID")
            targets.append({"partId": part.get("partId"), "parentZoneId": zone_id,
                            "waterPoint": part.get("waterPoint")})
    if len(targets) != registry["partCount"]:
        raise ValueError("CP_COMPONENT_CENTRAL_TARGET_COUNT_INVALID")
    # The bank validator enforces unique ids, finite water points and a
    # deterministic central fingerprint before any output is committed.
    empty_component_bank(targets)
    return targets


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
    parser.add_argument("--merge-generations", action="store_true")
    parser.add_argument("--complete-bank", type=Path)
    parser.add_argument("--complete-cache-directory", type=Path)
    parser.add_argument("--merge-output-root", type=Path)
    parser.add_argument("--target-registry", type=Path)
    parser.add_argument("--target-reference")
    parser.add_argument("--previous-targets", type=Path)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--budget-seconds", type=float)
    parser.add_argument("--request-timeout-seconds", type=float)
    parser.add_argument("--maximum-requests", type=int)
    parser.add_argument("--maximum-download-bytes", type=int)
    args = parser.parse_args(args_list)
    cache = ComponentSubsetCache(args.cache_directory)
    if args.merge_generations:
        if (args.output is None or args.complete_bank is None or args.complete_cache_directory is None
            or args.merge_output_root is None or args.target_registry is None
            or args.target_reference is None or args.plan is not None or args.plan_input is not None
            or args.verify_only or args.storage_inventory is not None):
            raise ValueError("CP_COMPONENT_MERGE_ARGUMENTS_INVALID")
        reference = datetime.fromisoformat(args.target_reference.replace("Z", "+00:00"))
        if reference.tzinfo is None or reference.utcoffset() != timedelta(0) or any(
            (reference.minute, reference.second, reference.microsecond)):
            raise ValueError("CP_COMPONENT_MERGE_TARGET_REFERENCE_INVALID")
        iso = lambda value: value.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        summary = merge_original_component_generations(
            json.loads(args.bank.read_text(encoding="utf-8")), cache,
            json.loads(args.complete_bank.read_text(encoding="utf-8")),
            ComponentSubsetCache(args.complete_cache_directory),
            targets=central_component_targets(json.loads(args.target_registry.read_text(encoding="utf-8"))),
            retention_start_at=iso(reference - timedelta(days=14)),
            retention_end_at=iso(reference + timedelta(days=7)),
            output_root=args.merge_output_root)
        atomic_json(args.output, {"kind": "CP_COMPONENT_DUAL_GENERATION_STAGE", "schemaVersion": 1, **summary})
        return 0
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
        admit_existing_or_new, dynamic_verified, reset_original_checks = original_component_admitter(plan, cache)
        def acquire_and_recheck(request):
            try:
                return transport.acquire_subset(request)
            finally:
                # New immutable static/dynamic receipts invalidate any cached
                # negative original-byte decision from the preceding bank scan.
                reset_original_checks()
        def prepare_and_recheck(key, target):
            try:
                return transport.evidence_for(key, target) is not None
            finally:
                reset_original_checks()
        def refresh_grid_if_needed(key, target, entry_requests):
            # A broken dynamic original needs a dynamic retry, not an extra
            # static request. A sound dynamic row on an unproved grid can only
            # be rescued by an independently downloaded immutable static file.
            if not any(dynamic_verified(entry, request) for entry, request in entry_requests):
                return None
            try:
                evidence = transport.refresh_static(key, target)
                return eligible_static_cell(evidence)
            except (OSError, ValueError, RuntimeError):
                return False
            finally:
                reset_original_checks()
        result = produce_component_bank(plan, bank, acquire_subset=acquire_and_recheck,
            acquisition_at=lambda: transport.last_receipt["acquisitionAt"],
            checkpoint=checkpoint, should_continue=transport.can_continue,
            start_after=tuple(cursor) if isinstance(cursor, list) and len(cursor) == 2 else None,
            admit_spatial=admit_existing_or_new,
            prepare_reusable_group=prepare_and_recheck,
            refresh_unadmitted_static=refresh_grid_if_needed)
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
