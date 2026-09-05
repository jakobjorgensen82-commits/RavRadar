#!/usr/bin/env python3
"""Regression for the process-level Copernicus timeout and retry contract."""
from __future__ import annotations

import importlib.util
import os
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
    assert retried == {
        "ok": True,
        "attempt": 2,
        "reason": "completed",
        "boundedProgress": False,
    }

    deadline_marker = Path(raw) / "deadline"
    deadline_code = (
        "import os, sys, time; from pathlib import Path; "
        "value=float(os.environ['RAVRADAR_COPERNICUS_SOFT_DEADLINE_EPOCH']); "
        "assert time.time() < value < time.time()+2; "
        "Path(sys.argv[1]).write_text(str(value), encoding='utf-8')"
    )
    deadline_result = module.run_bounded(
        [sys.executable, "-c", deadline_code, str(deadline_marker)],
        attempts=1,
        timeout_seconds=2,
        backoff_seconds=0,
    )
    assert deadline_result == {
        "ok": True,
        "attempt": 1,
        "reason": "completed",
        "boundedProgress": False,
    }
    assert deadline_marker.exists()

    bounded_result = module.run_bounded(
        [sys.executable, "-c", "raise SystemExit(75)"],
        attempts=1,
        timeout_seconds=2,
        backoff_seconds=0,
    )
    assert bounded_result == {
        "ok": True,
        "attempt": 1,
        "reason": "bounded-progress",
        "boundedProgress": True,
    }
    github_output = Path(raw) / "github-output.txt"
    previous_output = os.environ.get("GITHUB_OUTPUT")
    os.environ["GITHUB_OUTPUT"] = str(github_output)
    try:
        module.write_github_outputs(bounded_result)
    finally:
        if previous_output is None:
            os.environ.pop("GITHUB_OUTPUT", None)
        else:
            os.environ["GITHUB_OUTPUT"] = previous_output
    assert github_output.read_text(encoding="utf-8").splitlines() == [
        "bounded_progress=true",
        "source_stage_disposition=IN_PROGRESS",
    ]

timed_out = module.run_bounded(
    [sys.executable, "-c", "import time; time.sleep(1)"],
    attempts=1,
    timeout_seconds=0.05,
    backoff_seconds=0,
)
assert timed_out == {"ok": False, "attempt": 1, "reason": "timeout"}

module.validate_budget(1, 3300, 0)

for invalid in ((0, 1, 0), (4, 1, 0), (1, 3301, 0), (1, 1, 121)):
    try:
        module.validate_budget(*invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Unbounded retry setting was accepted: {invalid}")

print("OK: Copernicus retries are process-isolated, time-bounded and capped.")
