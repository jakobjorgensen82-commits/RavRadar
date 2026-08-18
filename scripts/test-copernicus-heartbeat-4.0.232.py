#!/usr/bin/env python3
"""Regression for the external-heartbeat bridge to the private current pilot."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts/check-copernicus-current-hour.py"
WORKFLOW = ROOT / ".github/workflows/preserve-copernicus-current-shadow.yml"
NOW = "2026-08-18T14:37:00Z"


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_checker(shadow: Path, output: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CHECKER), "--shadow", str(shadow), "--at", NOW, "--github-output", str(output)],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def document(valid_times: list[str]) -> dict:
    return {
        "schemaVersion": 1,
        "retentionHours": 168,
        "scoreImpact": False,
        "publicRuntime": False,
        "records": [{"validTime": value, "uMps": 0.123, "vMps": -0.456} for value in valid_times],
    }


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        shadow = base / "shadow.json"
        output = base / "github-output.txt"

        missing = run_checker(shadow, output)
        need(missing.returncode == 0, "A missing cache must request collection without failing the heartbeat")
        need("current_hour_present=false" in output.read_text(encoding="utf-8"), "Missing cache must not suppress collection")

        output.unlink()
        shadow.write_text(json.dumps(document(["2026-08-18T13:00:00Z"])), encoding="utf-8")
        stale = run_checker(shadow, output)
        need(stale.returncode == 0, "A valid stale cache must remain inspectable")
        need("current_hour_present=false" in output.read_text(encoding="utf-8"), "A stale cache must request the current hour")
        need("0.123" not in stale.stdout and "-0.456" not in stale.stdout, "Inspection must never log raw U/V")

        output.unlink()
        shadow.write_text(json.dumps(document(["2026-08-18T14:00:00Z"])), encoding="utf-8")
        current = run_checker(shadow, output)
        need(current.returncode == 0, "The current-hour cache must pass")
        need("current_hour_present=true" in output.read_text(encoding="utf-8"), "Current evidence must suppress duplicate download")

        output.unlink()
        unsafe = document(["2026-08-18T14:00:00Z"])
        unsafe["publicRuntime"] = True
        shadow.write_text(json.dumps(unsafe), encoding="utf-8")
        rejected = run_checker(shadow, output)
        need(rejected.returncode != 0, "Unsafe cache metadata must fail closed")
        need("0.123" not in rejected.stdout and "-0.456" not in rejected.stdout, "Failure must not expose raw U/V")

    workflow = WORKFLOW.read_text(encoding="utf-8")
    for marker in (
        'workflows: ["Update weather and deploy RavRadar"]',
        "types: [requested]",
        "branches: [main]",
        "python3 scripts/check-copernicus-current-hour.py",
        "github.event_name == 'workflow_run'",
        "needs.preserve.outputs.current_hour_present != 'true'",
        "actions: write",
        "validate-copernicus-current-pilot.yml/dispatches",
        "-f ref=main",
    ):
        need(marker in workflow, f"Heartbeat workflow is missing {marker}")
    need("actions/cache/save@v4" not in workflow, "workflow_run heartbeat must not try to write a read-only cache")
    need("actions/upload-artifact" not in workflow, "Heartbeat must never export raw cache evidence")
    preserve_section = workflow[workflow.index("  preserve:"):workflow.index("  dispatch-pilot:")]
    need("actions: write" not in preserve_section, "Only the minimal dispatch job may receive Actions write permission")

    print("OK: external production heartbeat safely dispatches one private pilot per missing UTC hour")


if __name__ == "__main__":
    main()
