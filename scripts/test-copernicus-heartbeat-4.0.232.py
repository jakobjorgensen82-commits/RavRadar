#!/usr/bin/env python3
"""Regression for the external-heartbeat bridge to the private current pilot."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from lib.copernicus_target_identity import target_fingerprint_from_registry


ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts/check-copernicus-current-hour.py"
WORKFLOW = ROOT / ".github/workflows/preserve-copernicus-current-shadow.yml"
NOW = "2026-08-18T14:37:00Z"


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_checker(shadow: Path, output: Path, targets: Path | None = None) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, str(CHECKER), "--shadow", str(shadow), "--at", NOW, "--github-output", str(output)]
    if targets:
        command.extend(["--targets", str(targets)])
    return subprocess.run(
        command,
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def document(valid_times: list[str], fingerprint: str = "sha256:" + "0" * 64) -> dict:
    return {
        "schemaVersion": 1,
        "retentionHours": 168,
        "scoreImpact": False,
        "publicRuntime": False,
        "records": [{"partId": "part-1", "samplingPoint": [9.0, 57.0], "validTime": value, "uMps": 0.123, "vMps": -0.456} for value in valid_times],
        "collections": [{"validTime": value, "targetFingerprint": fingerprint, "recordCount": 1, "uniqueTargetCount": 1} for value in valid_times],
    }


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory)
        shadow = base / "shadow.json"
        output = base / "github-output.txt"
        targets = base / "targets.json"
        targets.write_text(json.dumps({
            "partCount": 1,
            "zones": {"zone-1": [{"partId": "part-1", "waterPoint": [9.0, 57.0]}]},
        }), encoding="utf-8")
        fingerprint = target_fingerprint_from_registry(targets)

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
        legacy = document(["2026-08-18T14:00:00Z"])
        legacy.pop("collections")
        shadow.write_text(json.dumps(legacy), encoding="utf-8")
        legacy_result = run_checker(shadow, output)
        need(legacy_result.returncode == 0, "A legacy cache must be migrated through recollection")
        need("current_hour_present=false" in output.read_text(encoding="utf-8"),
             "Raw records without a completed collection manifest must not suppress migration")

        output.unlink()
        shadow.write_text(json.dumps(document(["2026-08-18T14:00:00Z"], fingerprint)), encoding="utf-8")
        current = run_checker(shadow, output, targets)
        need(current.returncode == 0, "The current-hour cache must pass")
        need("current_hour_present=true" in output.read_text(encoding="utf-8"), "Current evidence must suppress duplicate download")

        output.unlink()
        targets.write_text(json.dumps({
            "partCount": 1,
            "zones": {"zone-1": [{"partId": "part-1", "waterPoint": [9.1, 57.0]}]},
        }), encoding="utf-8")
        moved = run_checker(shadow, output, targets)
        need(moved.returncode == 0, "A moved central point must request safe recollection, not crash")
        moved_output = output.read_text(encoding="utf-8")
        need("current_hour_present=false" in moved_output and "target_fingerprint_match=false" in moved_output,
             "Same-hour evidence from old target geometry must not suppress recollection")

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
        "types: [requested, completed]",
        "branches: [main]",
        "copernicus-current-range-v2-keepalive-",
        "copernicus-current-range-v2-",
        "Report cache keepalive without reading private payloads",
        "github.event_name != 'workflow_run' || github.event.action == 'requested'",
        "retry-failed-production:",
        "contains(fromJSON('[\"failure\",\"timed_out\",\"startup_failure\"]'), github.event.workflow_run.conclusion)",
        "github.event.workflow_run.event == 'schedule'",
        "external_watchdog:",
        "default: false",
        "production-watchdog:",
        "github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)",
        "node scripts/check-production-watchdog.mjs",
        "runs?per_page=100",
        "--branch main",
        "id: watchdog-recheck",
        "MAXIMUM_SILENCE_MINUTES:",
        "external_watchdog == true && '15' || '45'",
        '--maximum-silence-minutes "$MAXIMUM_SILENCE_MINUTES"',
        "steps.watchdog.outputs.dispatch == 'true' && steps.watchdog-recheck.outputs.dispatch == 'true'",
    ):
        need(marker in workflow, f"Heartbeat workflow is missing {marker}")
    need(workflow.count("node scripts/check-production-watchdog.mjs") == 2,
         "Production watchdog must inspect once and recheck once before dispatch")
    need("runs?branch=main" not in workflow,
         "Production watchdog must not trust GitHub's transient branch-filtered run index")
    watchdog_section = workflow[workflow.index("  production-watchdog:"):]
    need("continue-on-error" not in watchdog_section,
         "Production watchdog inspection and recheck must fail closed")
    need("actions/cache/save@v6" not in workflow, "workflow_run heartbeat must not try to write a read-only cache")
    need("actions/upload-artifact" not in workflow, "Heartbeat must never export raw cache evidence")
    need("github.event_name == 'workflow_dispatch' && inputs.external_watchdog != true" not in workflow,
         "An ordinary manual keepalive must not become an implicit production watchdog")
    need("check-copernicus-current-hour.py" not in workflow,
         "Keepalive must not mistake one hour for an exact range proof")
    need("validate-copernicus-current-pilot.yml/dispatches" not in workflow,
         "Keepalive must not start a duplicate acquisition before the DMI gap matrix exists")
    pilot_workflow = (ROOT / ".github/workflows/validate-copernicus-current-pilot.yml").read_text(encoding="utf-8")
    for marker in (
        "Inspect the exact sealed DMI-gap range",
        "scripts/check-copernicus-current-range.py",
        "--registry .cache/copernicus-current-targets.json",
        "--dmi data/live/dmi-bulk-cache.json",
        "--targets data/live/coastal-parts-v2.json",
        "--source-stage .cache/copernicus-current-source-stage.json",
        "--allow-nonmatching-seal",
        "Remove only invalid restored Copernicus source disposition",
        "steps.cache-state.outputs.source_stage_ready != 'true'",
        "rm -f .cache/copernicus-current-source-stage.json",
        "build-copernicus-target-registry.py",
        "full_coast:",
        "steps.cache-state.outputs.source_stage_ready != 'true'",
        "--attempts 1",
        "--timeout-seconds 1200",
        "--require-source-stage-ready",
        "Save non-cancelled Copernicus source-stage progress",
        "steps.acquisition.outcome != 'cancelled'",
        "Report safe duplicate suppression",
    ):
        need(marker in pilot_workflow, f"Pilot workflow is missing geometry-aware duplicate control: {marker}")
    scheduled_pilot = pilot_workflow[:pilot_workflow.index("\n  operational-118-preflight:")]
    for obsolete in ("--attempts 2", "--timeout-seconds 600", "--require-complete"):
        need(obsolete not in scheduled_pilot, f"Scheduled pilot must not retain obsolete acquisition contract: {obsolete}")
    need(scheduled_pilot.count(".cache/copernicus-current-source-stage.json") >= 4,
         "Scheduled pilot must restore, inspect, prove and save the source-stage sidecar")
    inspection_position = scheduled_pilot.index("Inspect the exact sealed DMI-gap range")
    normalization_position = scheduled_pilot.index("Remove only invalid restored Copernicus source disposition")
    need("complete_range_present == 'true' ||" not in scheduled_pilot,
         "A complete seal must not delete its source-stage evidence")
    install_position = scheduled_pilot.index("Install Copernicus acquisition dependency only when source stage is absent")
    test_position = scheduled_pilot.index("Run deterministic pilot tests only before a new acquisition")
    acquisition_position = scheduled_pilot.index("Complete only the exact sealed DMI-gap range")
    progress_position = scheduled_pilot.index("Save non-cancelled Copernicus source-stage progress")
    need(inspection_position < normalization_position < install_position < test_position < acquisition_position,
         "Stage inspection/normalization and Copernicus-dependent tests must precede acquisition in order")
    acquisition_section = scheduled_pilot[install_position:progress_position]
    need(acquisition_section.count("steps.cache-state.outputs.source_stage_ready != 'true'") == 4,
         "Install, deterministic tests, credentials and acquisition must share the validated stage skip")
    for block in scheduled_pilot.split("\n      - name:"):
        if "actions/cache/" in block and ".cache/copernicus-current-shadow.json" in block:
            need(".cache/copernicus-current-source-stage.json" in block,
                 "Every scheduled shadow cache restore/save must carry its source-stage sidecar")
    preserve_section = workflow[workflow.index("  preserve:"):workflow.index("  retry-failed-production:")]
    need("actions: write" not in preserve_section, "Read-only cache keepalive may not receive Actions write permission")

    print("OK: GitHub-owned keepalive preserves range evidence without duplicate acquisition or private reads")


if __name__ == "__main__":
    main()
