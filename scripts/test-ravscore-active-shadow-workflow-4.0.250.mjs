import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');
const audit = fs.readFileSync('scripts/audit-ravscore-next-generation-public.mjs', 'utf8');
for (const marker of [
  'ravscore_active_shadow:',
  'ravscore-active-shadow:',
  'Audit read-only 210/673 integrated RavScore public runtime',
  'Download read-only fallback-compatible 210/673 runtime',
  'node scripts/audit-ravscore-next-generation-public.mjs',
  'ravscore-public-runtime-audit.json',
  'ravradar-active-ravscore-shadow',
]) assert.ok(workflow.includes(marker), `Workflow mangler ${marker}`);

const sectionStart = workflow.indexOf('ravscore-active-shadow:');
const sectionEnd = workflow.indexOf('geometry-v2-pilot:', sectionStart);
assert.ok(sectionStart >= 0 && sectionEnd > sectionStart, 'RavScore-shadowjobbet kunne ikke afgrænses');
const section = workflow.slice(sectionStart, sectionEnd);
assert.match(section, /permissions:\s*\n\s*contents: read/);
assert.match(section, /public-condition-details\.json/);
assert.doesNotMatch(section, /pages:\s*write|id-token:\s*write|deploy-pages/);
for (const forbidden of [
  'SUPABASE_SERVICE_ROLE_KEY',
  'scripts/sync-admin-config.py',
  'pip install',
  'scripts/validate-national-local-part-dmi-grid.py',
  'scripts/build-national-weather-shadow-contract.py',
  'scripts/validate-national-multi-step-series.py',
  'scripts/validate-national-local-part-wind-series.py',
  'scripts/validate-national-shadow-score.mjs',
  'scripts/apply-central-zone-reviews.py',
  'scripts/sync-protected-admin-assets.mjs',
  'actions/upload-pages-artifact',
  'actions/deploy-pages',
]) assert.ok(!section.includes(forbidden), `Den fallback-kompatible shadow maa ikke bruge ${forbidden}`);

for (const marker of [
  'EXPECTED_ZONE_COUNT = 210',
  'EXPECTED_PART_COUNT = 673',
  'NEXT_RAVSCORE_MODEL_ID',
  'NEXT_RAVSCORE_STATE_SCHEMA_VERSION',
  'PUBLIC_PROFILE_MISMATCH',
  'ACTIVE_SCORE_RECONSTRUCTION_MISMATCH',
  'SURF_ZONE_PRECISION_CLAIMED',
  'EMPIRICAL_FIND_ACCURACY_CLAIMED',
  'rawVectorsLogged: false',
  'coordinatesLogged: false',
  'privatePayloadsLogged: false',
]) assert.ok(audit.includes(marker), `Runtimeauditen mangler ${marker}`);
assert.match(workflow, /build-and-prepare:[\s\S]{0,220}inputs\.ravscore_active_shadow != true/);
console.log('Read-only 210/673 integrated RavScore public runtime-workflow: bestået.');
