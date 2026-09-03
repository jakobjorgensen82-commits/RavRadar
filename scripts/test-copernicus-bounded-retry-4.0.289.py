#!/usr/bin/env python3
"""Regression for the process-level Copernicus timeout and retry contract."""
from __future__ import annotations

import importlib.util
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/run-copernicus-current-pilot-with-retry.py"
spec = importlib.util.spec_from_file_location("copernicus_retry", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


with tempfile.TemporaryDirectory(prefix="ravradar-copernicus-retry-") as raw:
    marker = Path(raw) / "attempted"
    retry_code = (
        "from pathlib import Path; import sys; "
        "p=Path(sys.argv[1]); existed=p.exists(); p.write_text('seen', encoding='utf-8'); "
        "raise SystemExit(0 if existed else 7)"
    )
    retried = module.run_bounded(
        [sys.executable, "-c", retry_code, str(marker)],
        attempts=2,
        timeout_seconds=2,
        backoff_seconds=0,
    )
    assert retried == {"ok": True, "attempt": 2, "reason": "completed"}

timed_out = module.run_bounded(
    [sys.executable, "-c", "import time; time.sleep(1)"],
    attempts=1,
    timeout_seconds=0.05,
    backoff_seconds=0,
)
assert timed_out == {"ok": False, "attempt": 1, "reason": "timeout"}

for invalid in ((0, 1, 0), (4, 1, 0), (1, 1201, 0), (1, 1, 121)):
    try:
        module.validate_budget(*invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Unbounded retry setting was accepted: {invalid}")

print("OK: Copernicus retries are process-isolated, time-bounded and capped.")
