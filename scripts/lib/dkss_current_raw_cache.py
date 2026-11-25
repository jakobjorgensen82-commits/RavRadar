"""Read the normal local RAW inventory for private DKSS audit inputs.

The offline caller supplies endpoints from one authenticated H0. This leaf
has no CLI or provider path. Returned values are fixed codes in input order.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
import sys
import time

from .dkss_current_raw_audit import check_dkss_current_original
from .dmi_native_provenance import canonical_current_source_asset


def check_cached_dkss_originals(native_rows):
    if sys.platform != "linux":
        return ("OWNED_READER_UNAVAILABLE",) * len(native_rows)
    try:
        path = Path(__file__).resolve().parents[1] / "decode-coherent-current-originals.py"
        spec = importlib.util.spec_from_file_location("dkss_audit_existing_raw_reader", path)
        decoder = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(decoder)
        producer = decoder.load_producer()  # Requires cache-only and the standard RAW path.
    except Exception:
        return ("OWNED_READER_UNAVAILABLE",) * len(native_rows)
    return _check_cached_dkss_originals(native_rows, decoder, producer)


def _check_cached_dkss_originals(native_rows, decoder, producer):
    started = time.monotonic()
    jobs = {}
    outcomes = ["CAPTURE_UNPROVED"] * len(native_rows)
    for index, row in enumerate(native_rows):
        capture = canonical_current_source_asset(row["source"])
        if capture is not None:
            job = jobs.setdefault(tuple(capture.items()), {"capture": capture, "indices": []})
            job["indices"].append(index)
    if not jobs:
        return tuple(outcomes)

    def refuse(reason):
        for job in jobs.values():
            for index in job["indices"]:
                outcomes[index] = reason
        return tuple(outcomes)

    try:
        if len(jobs) > decoder.MAX_CAPTURES:
            return refuse("RAW_INVENTORY_UNPROVED")
        # Use strict complete-capture mode, including the stored acquisition.
        # If the whole set cannot be resolved, don't issue partial RAW proof.
        manifest = decoder.raw_inventory(producer, list(jobs.values()))
    except Exception:
        return refuse("RAW_INVENTORY_UNPROVED")

    try:
        for job in jobs.values():
            decoder.check_budget(started)
            capture = job["capture"]
            binding = {key: capture[key] for key in ("collection", "modelRun", "validTime")}
            with producer._grib_read_scope(job["path"], *binding.values()) as reader:
                observed = canonical_current_source_asset({**binding, **dict(reader.capture or {})})
                if observed != capture:
                    return refuse("RAW_CAPTURE_MISMATCH")
                indices = job["indices"]
                checked = check_dkss_current_original(reader.handle, capture,
                                                      [native_rows[index] for index in indices], producer)
                reader.check()
            if not reader.physically_closed or reader.retained:
                return refuse("OWNED_RAW_READ_UNPROVED")
            for index, outcome in zip(indices, checked, strict=True):
                outcomes[index] = outcome
        decoder.check_budget(started)
        if producer._legacy_current_fixed_bytes(decoder.MANIFEST_RELATIVE, maximum=decoder.MAX_BYTES) != manifest:
            return refuse("RAW_MANIFEST_CHANGED")
        if producer._UNSETTLED_GRIB_READS or producer._UNSETTLED_ASSET_DOWNLOADS:
            return refuse("OWNED_RAW_READ_UNPROVED")
    except Exception:
        return refuse("OWNED_RAW_READ_UNPROVED")
    return tuple(outcomes)
