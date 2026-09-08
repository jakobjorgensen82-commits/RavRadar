#!/usr/bin/env python3
"""Read-only aggregate overlap between proved recovered DMI and Open-Meteo gaps.

This diagnostic never writes an input and never prints private part identifiers,
coordinates, vectors, hashes or cache contents. It does not certify a handoff.
"""
from __future__ import annotations

import argparse
import contextlib
import gc
import importlib.util
import json
import pathlib
import stat
import sys

sys.dont_write_bytecode = True
MAX_BYTES = 2 * 1024**3


class QuietSink:
    def write(self, value):
        return len(value)

    def flush(self):
        pass


def load_probe():
    path = pathlib.Path(__file__).with_name("inspect-dmi-reuse-proof.py")
    spec = importlib.util.spec_from_file_location("dmi_reuse_overlap_probe", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("probe import unavailable")
    module = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
        spec.loader.exec_module(module)
    return module


def read_object(path: pathlib.Path, maximum_bytes: int = MAX_BYTES):
    before = path.stat()
    if path.is_symlink() or not stat.S_ISREG(before.st_mode) or not 1 < before.st_size <= maximum_bytes:
        raise ValueError("input rejected")
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError("document rejected")
    return value, (before.st_size, before.st_mtime_ns)


def pair_set(document, targets, reference, signature, runtime):
    with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
        proofs = runtime._validated_candidate_retained_current_asset_proofs(
            document, targets, reference, signature,
        )
    return {
        (part_id, proof["sourceAsset"]["validTime"])
        for proof in proofs
        for part_id in proof["attestedPartIds"]
    }


def unchanged(path: pathlib.Path, identity):
    after = path.stat()
    return (after.st_size, after.st_mtime_ns) == identity


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--historical-dmi", type=pathlib.Path, required=True)
    parser.add_argument("--latest-dmi", type=pathlib.Path, required=True)
    parser.add_argument("--open-meteo", type=pathlib.Path, required=True)
    parser.add_argument("--target", required=True)
    args = parser.parse_args()
    try:
        probe = load_probe()
        runtime = probe.load_runtime()
        reference = runtime.production_reference_hour(args.target)

        historical, historical_identity = read_object(args.historical_dmi)
        targets = probe.bound_targets(historical, runtime)
        registry = runtime.target_fingerprint(targets)
        sampling_registry = historical.get("zoneRegistrySignature")
        current_signature = runtime.current_marine_processing_signature(sampling_registry)
        recovered = pair_set(
            historical,
            targets,
            reference,
            probe.DiagnosticCompatibleSignature(current_signature),
            runtime,
        )
        del historical
        gc.collect()

        latest, latest_identity = read_object(args.latest_dmi)
        latest_targets = probe.bound_targets(latest, runtime)
        if (
            runtime.target_fingerprint(latest_targets) != registry
            or latest.get("zoneRegistrySignature") != sampling_registry
        ):
            raise ValueError("DMI registry mismatch")
        recovered |= pair_set(latest, latest_targets, reference, current_signature, runtime)
        del latest
        gc.collect()

        open_meteo, open_meteo_identity = read_object(args.open_meteo, 64 * 1024 * 1024)
        from lib.open_meteo_current_fallback import validate_checkpoint_document
        if open_meteo.get("productionReferenceAt") != args.target:
            raise ValueError("Open-Meteo target mismatch")
        with contextlib.redirect_stdout(QuietSink()), contextlib.redirect_stderr(QuietSink()):
            validated = validate_checkpoint_document(open_meteo, targets=targets)
        missing = {
            (row["partId"], row["validTime"])
            for row in validated["missingPairs"]
        }
        intersection = recovered & missing
        report = {
            "contract": "DMI_OPEN_METEO_RECOVERY_OVERLAP_V1",
            "status": "INSPECTED_NOT_HANDOFF_CERTIFIED",
            "dmiRegistryMatched": True,
            "openMeteoValidated": True,
            "openMeteoMissingPairs": len(missing),
            "recoveredDmiPairs": len(recovered),
            "recoveredOpenMeteoMissingPairs": len(intersection),
            "remainingOpenMeteoMissingPairs": len(missing - recovered),
            "inputsUnchanged": all((
                unchanged(args.historical_dmi, historical_identity),
                unchanged(args.latest_dmi, latest_identity),
                unchanged(args.open_meteo, open_meteo_identity),
            )),
            "privatePayloadIncluded": False,
        }
        print(json.dumps(report, sort_keys=True, separators=(",", ":")))
        return 0 if report["inputsUnchanged"] else 1
    except Exception:
        print('{"status":"INSPECTION_FAILED","privatePayloadIncluded":false}')
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
