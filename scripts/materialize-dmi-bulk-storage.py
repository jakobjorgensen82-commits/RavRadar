#!/usr/bin/env python3
"""Materialize one restored DMI cache without modifying its source."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from lib.dmi_bulk_storage import materialize_dmi_bulk_document


def main() -> int:
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
