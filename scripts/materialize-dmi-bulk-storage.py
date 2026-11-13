#!/usr/bin/env python3
"""Materialize one restored DMI cache without modifying its source."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.dmi_bulk_storage import materialize_dmi_bulk_document

from types import MappingProxyType

SOURCE_NORMAL_GENERATION_MODULES = MappingProxyType({
    "READY": "check-dmi-bulk-operational-ready",
    "TARGETS": "build-copernicus-target-registry",
    "PLANNER": "plan-dmi-recovery",
})


def source_normal_generation_module_path(root, name):
    if not isinstance(root, Path) or name not in SOURCE_NORMAL_GENERATION_MODULES.values():
        raise RuntimeError("SOURCE_DMI_PREPARATION_UNPROVED_SOURCE_OPERAND")
    return root / "scripts" / (name + ".py")


def source_normal_generation_module_inputs():
    import hashlib
    return {"scope": "SOURCE_NORMAL_GENERATION_FIXED_MODULES_ONLY",
        "modules": [{"selector": selector, "name": name, "namespace": "CURRENT",
            "path": source_normal_generation_module_path(Path("."), name).as_posix(),
            "bindingState": "UNPROVED_SOURCE_OPERAND"}
            for selector, name in SOURCE_NORMAL_GENERATION_MODULES.items()],
        "scalarModuleDeclarations": [{"role": role, "namespace": "CURRENT", "path": path}
            for role, path in SOURCE_SCALAR_PLANNING_MODULES.items()],
        "scalarProgramSha256": hashlib.sha256(SOURCE_SCALAR_PLANNING_PROGRAM.encode("utf-8")).hexdigest(),
        "sourceGraphClosed": False, "moduleImported": False,
        "workerStarted": False, "pgExecuted": False, "reuseAuthority": False}




SOURCE_SCALAR_PLANNING_MODULES = MappingProxyType({
    "RUNTIME": "scripts/lib/weather-component-runtime.mjs",
    "ENCODER": "scripts/plan-weather-scalar-acquisition.mjs",
    "SETTLEMENT": "scripts/lib/weather-transport-settlement.mjs",
})

SOURCE_SCALAR_PLANNING_PROGRAM = "import fs from 'node:fs/promises';\nimport path from 'node:path';\nimport {pathToFileURL} from 'node:url';\nconst [root,codeRoot,cache,at,historical]=process.argv.slice(1);\nlet handle=null,owned=false,diagnostic=null,phase='LOAD';\nconst startedAt=performance.now();\nconst output=path.join(root,'.cache/weather-scalar-needs.json'),temporary=output+'.tmp';\ntry {\n  const {loadRetainedPartScalarPlanning,retainedScalarPlanningFailureDiagnostic}=await import(pathToFileURL(path.join(codeRoot,'@SOURCE_SCALAR_RUNTIME@')));\n  diagnostic=retainedScalarPlanningFailureDiagnostic;\n  const {encodeRetainedScalarNeeds}=await import(pathToFileURL(path.join(codeRoot,'@SOURCE_SCALAR_ENCODER@')));\n  const plan=await loadRetainedPartScalarPlanning({root,dmiCachePath:cache,productionReferenceAt:new Date(at).toISOString(),historicalCachePath:historical||null});\n  phase='ENCODE';\n  const bytes=Buffer.from(JSON.stringify(encodeRetainedScalarNeeds(plan))+'\\n');\n  if(bytes.length>16*1024*1024)throw Error('SOURCE_SCALAR_PLAN_SIZE');\n  phase='PUBLISH';\n  handle=await fs.open(temporary,'wx',0o600);owned=true;\n  await handle.writeFile(bytes);await handle.sync();await handle.close();handle=null;\n  await fs.rename(temporary,output);owned=false;\n} catch(error) {\n  const {isWeatherTransportStopUnproved}=await import(pathToFileURL(path.join(codeRoot,'@SOURCE_SCALAR_SETTLEMENT@')));\n  process.stderr.write(isWeatherTransportStopUnproved(error)?'SOURCE_SCALAR_PLAN_STOP_UNPROVED\\n':'SOURCE_SCALAR_PLAN_UNAVAILABLE\\n');\n  process.stderr.write(JSON.stringify({...(diagnostic?diagnostic(error,phase):{phase:'LOAD',errorCategory:'UNKNOWN_FAILURE'}),elapsedMillis:Math.max(0,Math.round(performance.now()-startedAt))})+'\\n');\n  process.exitCode=isWeatherTransportStopUnproved(error)?2:1;\n} finally {\n  await handle?.close();\n  if(owned)await fs.unlink(temporary);\n}\n"
for _scalar_role, _scalar_module in SOURCE_SCALAR_PLANNING_MODULES.items():
    SOURCE_SCALAR_PLANNING_PROGRAM = SOURCE_SCALAR_PLANNING_PROGRAM.replace(
        "@SOURCE_SCALAR_" + _scalar_role + "@", _scalar_module)
del _scalar_role, _scalar_module


def source_scalar_acquisition_plan(root: Path, recovery_cache: Path, target: str,
                                   historical_cache: Path | None = None) -> int:
    """Advisory only; the actual owned phase authenticates/retains its inputs.

    Reuse V7's shared readers and encoder directly. No ordinary-restored or
    caller-verified flag can create SOURCE admission, B/S or an owner here.
    The existing Source cohort still owns every descendant and absolute cutoff.
    """
    import os
    import shutil
    import subprocess

    code_root = Path(__file__).resolve().parent.parent
    if not root.is_absolute() or root.resolve() != root or not recovery_cache.is_absolute() \
            or (historical_cache is not None and not historical_cache.is_absolute()):
        raise RuntimeError("SOURCE_SCALAR_PLANNING_PATH_INVALID")
    outputs = [root / ".cache/weather-scalar-needs.json",
               root / ".cache/weather-current-acquisition-plan.json",
               root / ".cache/weather-qualified-acquisition-plan.json",
               root / "data/diagnostics/weather-acquisition-plan-before-dmi.json"]
    # The existing parent preservation phase has already retained old working
    # advice. Never adopt/overwrite an unknown output or leftover temporary.
    for output in outputs:
        if output.exists() or output.is_symlink() or output.with_name(output.name + ".tmp").exists() or output.with_name(output.name + ".tmp").is_symlink():
            raise RuntimeError("SOURCE_SCALAR_PLANNING_OUTPUT_EXISTS")
    node = shutil.which("node")
    scalar_code = 1
    if node is not None:
        scalar_code = subprocess.run([node, "--input-type=module", "-e", SOURCE_SCALAR_PLANNING_PROGRAM,
            str(root), str(code_root), str(recovery_cache), target,
            str(historical_cache) if historical_cache is not None else ""], cwd=root, check=False).returncode
    if scalar_code == 2:
        return 2  # Unproved transport stop is never advisory fallback.
    if scalar_code < 0:
        raise RuntimeError("SOURCE_SCALAR_PLANNING_INTERRUPTED")
    if scalar_code != 0:
        outputs[0].unlink(missing_ok=True)
        print("SOURCE_SCALAR_PLANNING_UNAVAILABLE", flush=True)
    command = [sys.executable, "-B", str(code_root / "scripts/build-weather-acquisition-plan.py"),
               "--at", target, "--scalar-snapshot", str(recovery_cache),
               "--report", "data/diagnostics/weather-acquisition-plan-before-dmi.json"]
    if historical_cache is not None:
        command += ["--scalar-history", str(historical_cache)]
    compiled = subprocess.run(command, cwd=root, check=False).returncode
    if compiled < 0:
        raise RuntimeError("SOURCE_SCALAR_COMPILER_INTERRUPTED")
    if compiled != 0:
        # Only this phase's new, fixed advisory outputs; originals remain in
        # the parent's verified preservation view. No private source is removed.
        for output in outputs:
            output.unlink(missing_ok=True)
        print("SOURCE_QUALIFIED_PLANNING_UNAVAILABLE", flush=True)
    return 0


def require_source_generation_prepare_owner() -> None:
    """Only the actual guardian's borrowed output may reach the fixed seam.

    The parent/fd checks establish the real cohort. The current Node module
    checks the real issued output; environment or JSON alone never admits it.
    No scratch directory or weather document is touched before both checks.
    """
    import os
    import shutil
    import stat
    import subprocess

    if sys.platform != "linux" or os.environ.get("INPUT_OPERATION") != "source" \
            or os.environ.get("DMI_BULK_CACHE_ONLY", "false") != "false":
        raise RuntimeError("SOURCE_DMI_PREPARATION_OWNER_REQUIRED")
    root = Path(__file__).resolve().parent.parent
    parent = os.getppid()
    command = Path(f"/proc/{parent}/cmdline").read_bytes().split(b"\0")
    expected = os.fsencode(str(root / "scripts/lib/copernicus_component_process.py"))
    if len(command) != 6 or command[-1] != b"" or command[1:3] != [b"-I", b"-B"] \
            or command[3] != expected or command[4] != b"--source-normal-program-cohort" \
            or os.readlink(f"/proc/{parent}/exe") != os.readlink("/proc/self/exe") \
            or os.getppid() != parent:
        raise RuntimeError("SOURCE_DMI_PREPARATION_OWNER_REQUIRED")
    output = os.environ.get("GITHUB_OUTPUT", "")
    prefix = f"/proc/{parent}/fd/"
    descriptor = output[len(prefix):] if output.startswith(prefix) else ""
    if not descriptor.isascii() or not descriptor.isdecimal() or int(descriptor) < 4 \
            or str(int(descriptor)) != descriptor:
        raise RuntimeError("SOURCE_DMI_PREPARATION_OUTPUT_REQUIRED")
    descriptor = int(descriptor)
    owned, named = os.fstat(descriptor), os.stat(output)
    keys = ("st_dev", "st_ino", "st_mode", "st_nlink", "st_size")
    if not stat.S_ISREG(owned.st_mode) or owned.st_nlink != 0 or owned.st_size != 0 \
            or any(getattr(owned, key) != getattr(named, key) for key in keys) \
            or os.readlink(output) != "/memfd:ravradar-source-normal-output (deleted)":
        raise RuntimeError("SOURCE_DMI_PREPARATION_OUTPUT_REQUIRED")
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("SOURCE_DMI_PREPARATION_ISSUED_OUTPUT_REQUIRED")
    program = ("import path from 'node:path';import {pathToFileURL} from 'node:url';"
        "const api=await import(pathToFileURL(path.join(process.argv[1],"
        "'scripts/lib/source-producer-after597-parent.mjs')).href);"
        "api.requireSourceProducerAfter597Output();")
    # No child-specific replacement deadline: the SAME guardian owns this
    # descendant and its physical stop within the original absolute cutoff.
    result = subprocess.run([node, "--input-type=module", "-e", program, str(root)],
        cwd=root, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL, check=False)
    if result.returncode != 0 or os.getppid() != parent \
            or any(getattr(owned, key) != getattr(os.fstat(descriptor), key) for key in keys):
        raise RuntimeError("SOURCE_DMI_PREPARATION_ISSUED_OUTPUT_REQUIRED")


def source_normal_generation_prepare() -> int:
    """The normal workflow's fixed generation/recovery seam, under its owner."""
    require_source_generation_prepare_owner()
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
        filename = source_normal_generation_module_path(root, name)
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
    ready = normal_module(SOURCE_NORMAL_GENERATION_MODULES["READY"])
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
        targets = normal_module(SOURCE_NORMAL_GENERATION_MODULES["TARGETS"])
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
    planner = normal_module(SOURCE_NORMAL_GENERATION_MODULES["PLANNER"])
    target = os.environ.get("RAVRADAR_PRODUCTION_TARGET_HOUR", "")
    result = planner.decide(planner.load_cache(recovery_cache),
        json.loads((root / "data/live/coastal-parts-v2.json").read_text(encoding="utf-8")), target)
    historical = os.environ.get("DMI_PART_CONTINUITY_DONOR_PATH", "")
    if source_scalar_acquisition_plan(root, recovery_cache, target,
            Path(historical) if historical else None) == 2:
        return 2
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
        output.write(f"recovery_snapshot={recovery_cache.name}\n")
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
