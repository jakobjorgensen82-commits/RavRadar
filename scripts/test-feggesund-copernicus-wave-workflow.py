#!/usr/bin/env python3
"""Static safety contract for the branch-dispatchable Feggesund pilot job."""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/build-ravscore-historical-wave-pilot.yml"
text = WORKFLOW.read_text(encoding="utf-8")
lower = text.lower()

assert "workflow_dispatch:" in text
assert "schedule:" not in text
assert "push:" not in text
assert "pull_request:" not in text
assert "contents: read" in text
assert "contents: write" not in text
assert "feggesund_wave_feasibility" in text
assert "if: inputs.mode == 'historical'" in text
assert "if: inputs.mode == 'feggesund_wave_feasibility'" in text
assert "scripts/test-feggesund-copernicus-wave-pilot.py" in text
assert "scripts/pilot-feggesund-copernicus-wave.py" in text
assert "--target-hour \"$TARGET_HOUR\"" in text
assert "continue-on-error: true" in text
assert "steps.feasibility.outcome" in text
assert "steps.privacy.outcome" in text
assert "actions/upload-artifact@v7" in text
assert "coordinateValuesStored" in text
assert "rawWeatherValuesStored" in text
assert "rawDirectionValuesStored" in text
assert "rawNetcdfStored" in text
assert "COPERNICUSMARINE_SERVICE_USERNAME" in text
assert "COPERNICUSMARINE_SERVICE_PASSWORD" in text
assert "SUPABASE_SERVICE_ROLE_KEY" in text
assert "os.environ['TARGET_HOUR']" in text

for forbidden in (
    "actions/deploy-pages",
    "cloudflare/pages-action",
    "wrangler pages deploy",
    "actions/cache/save",
    "git push",
    "supabase db push",
):
    assert forbidden not in lower

print("Feggesund wave feasibility workflow: manual, read-only, aggregate-only and fail-closed")
