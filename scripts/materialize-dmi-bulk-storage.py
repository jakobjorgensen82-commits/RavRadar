#!/usr/bin/env python3
"""Materialize one restored DMI cache without modifying its source."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.dmi_bulk_storage import materialize_dmi_bulk_document


def source_normal_generation_prepare() -> int:
    """The normal workflow's fixed generation/recovery seam, under its owner."""
    import importlib.util
    import os
    import shutil
    import stat
    import sys

    root = Path(__file__).resolve().parent.parent
    if sys.platform != "linux" or Path.cwd().resolve() != root:
        raise RuntimeError("SOURCE_DMI_PREPARATION_ROOT_INVALID")
    temporary = Path(os.environ.get("RUNNER_TEMP", ""))
    if not temporary.is_absolute() or temporary.resolve() != temporary \
            or temporary.is_symlink() or not temporary.is_dir():
        raise RuntimeError("SOURCE_DMI_PREPARATION_TEMP_INVALID")
    # The normal workflow already uses this fixed scratch location. Do not
    # adopt an earlier operation's partial scratch or overwrite its evidence.
    proof = temporary / "dmi-active-proof"
    proof.mkdir(mode=0o700, exist_ok=False)
    proof_identity = proof.stat()

    def normal_module(name):
        filename = root / "scripts" / (name + ".py")
        spec = importlib.util.spec_from_file_location("source_normal_" + name.replace("-", "_"), filename)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module

    def existing(relative):
        filename = root / relative
        cursor = root
        for component in Path(relative).parts[:-1]:
            cursor /= component
            item = cursor.lstat()
            if not stat.S_ISDIR(item.st_mode) or stat.S_ISLNK(item.st_mode):
                raise RuntimeError("SOURCE_DMI_PREPARATION_DIRECTORY_INVALID")
        try:
            item = filename.lstat()
        except FileNotFoundError:
            return None
        if not stat.S_ISREG(item.st_mode) or stat.S_ISLNK(item.st_mode) or item.st_nlink != 1:
            raise RuntimeError("SOURCE_DMI_PREPARATION_FILE_INVALID")
        return filename if item.st_size else None

    def copy_atomically(source, destination):
        destination = root / destination
        staged = destination.with_name(destination.name + ".tmp")
        # Unknown pre-existing temporaries are retained, never adopted.
        with staged.open("xb") as output:
            with source.open("rb") as reader:
                shutil.copyfileobj(reader, output, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        os.replace(staged, destination)

    active = existing(".cache/dmi-active-complete.json")
    candidate = existing(".cache/dmi-candidate-progress.json")
    deployed = existing("data/live/dmi-bulk-cache.json")
    checkpoint_only = os.environ.get("DMI_BULK_CACHE_ONLY", "false")
    if checkpoint_only not in ("true", "false"):
        raise RuntimeError("SOURCE_CHECKPOINT_REQUEST_INVALID")
    if checkpoint_only == "true":
        if candidate is None:
            raise RuntimeError("SOURCE_CHECKPOINT_CANDIDATE_REQUIRED")
        kind, source = "candidate", candidate
    else:
        kind, source = ("active", active) if active else ("candidate", candidate) if candidate \
            else ("deployed", deployed) if deployed else ("empty", proof / "empty.json")
    if kind == "empty":
        # Existing normal cold candidate only; not B, S, READY or 48h history.
        with source.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write('{"zones":{}}\n')
            handle.flush()
            os.fsync(handle.fileno())
    materialized = proof / "materialized.json"
    materialize_dmi_bulk_document(source, materialized)
    ready = normal_module("check-dmi-bulk-operational-ready")
    strict = False
    reference = None
    if kind == "active":
        reference = ready.operational_ready_reference(materialized)
        strict = True
    elif kind == "deployed":
        try:
            reference = ready.operational_ready_reference(materialized)
            strict = True
        except RuntimeError as error:
            if str(error) != "DMI_OPERATIONAL_READY_LEDGER_INVALID":
                raise
    if strict:
        targets = normal_module("build-copernicus-target-registry")
        document = targets.build_registry(targets.load_targets(root / "data/live/coastal-parts-v2.json"),
            targets.read_dmi_bulk_document(materialized), targets.utc_hour(reference),
            targets.file_sha256(materialized), full_coast=False, require_strict_dmi_ledger=True)
        targets.atomic_write(proof / "targets.json", document)
        copy_atomically(materialized, ".cache/dmi-active-complete.json")
        copy_atomically(root / ".cache/dmi-active-complete.json", "data/live/dmi-bulk-cache.json")
    else:
        copy_atomically(materialized, ".cache/dmi-candidate-progress.json")
    # Same normal candidate-first recovery selection and existing decide().
    recovery_cache = materialized
    if existing(".cache/dmi-candidate-progress.json"):
        recovery_cache = proof / "recovery-candidate.json"
        materialize_dmi_bulk_document(root / ".cache/dmi-candidate-progress.json", recovery_cache)
    planner = normal_module("plan-dmi-recovery")
    target = os.environ.get("RAVRADAR_PRODUCTION_TARGET_HOUR", "")
    result = planner.decide(planner.load_cache(recovery_cache),
        json.loads((root / "data/live/coastal-parts-v2.json").read_text(encoding="utf-8")), target)
    after = proof.lstat()
    if not stat.S_ISDIR(after.st_mode) or (after.st_dev, after.st_ino, after.st_mode) != \
            (proof_identity.st_dev, proof_identity.st_ino, proof_identity.st_mode):
        raise RuntimeError("SOURCE_DMI_PREPARATION_DIRECTORY_CHANGED")
    # H owns/seals this exact output fd after physical drain. These are normal
    # semantic outcomes, not stop/provenance/completion proof supplied by a user.
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as output:
        output.write(f"strict_active_ready={'true' if strict else 'false'}\n")
        output.write(f"candidate_seeded={'false' if strict else 'true'}\n")
        output.write(f"extended={'true' if result['extended'] else 'false'}\n")
        output.write(f"missing_pair_counts_json={json.dumps(result['missingDmiPairs'], separators=(',', ':'))}\n")
    return 0


def main() -> int:
    if sys.argv[1:] == ["--source-normal-generation-prepare"]:
        return source_normal_generation_prepare()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        result = materialize_dmi_bulk_document(args.input, args.output)
    except Exception:
        print("DMI storage materialization failed closed.", flush=True)
        return 1
    print(json.dumps(
        {
            "event": "dmi-storage-materialized",
            **result,
            "sourcePreserved": True,
        },
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    ), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
