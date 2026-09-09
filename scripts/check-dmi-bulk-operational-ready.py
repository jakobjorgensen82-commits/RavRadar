#!/usr/bin/env python3
"""Validate one private DMI bulk READY ledger and emit only its UTC reference."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

from lib.dmi_bulk_storage import read_dmi_bulk_document


UTC_HOUR = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", type=Path, required=True)
    args = parser.parse_args()
    document = read_dmi_bulk_document(args.cache, expand_sources=False)
    ledger = ((document.get("diagnostics") or {}).get("currentOperationalLedger"))
    reference = ledger.get("productionReferenceAt") if isinstance(ledger, dict) else None
    if not isinstance(ledger, dict) or ledger.get("ready") is not True \
            or not isinstance(reference, str) or UTC_HOUR.fullmatch(reference) is None:
        raise RuntimeError("DMI_OPERATIONAL_READY_LEDGER_INVALID")
    print(reference)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
