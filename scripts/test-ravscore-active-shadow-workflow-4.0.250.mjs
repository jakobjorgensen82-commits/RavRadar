import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');
const audit = fs.readFileSync('scripts/audit-ravscore-candidate-g-public-shadow.mjs', 'utf8');
for (const marker of [
  'ravscore_active_shadow:',
  'ravscore-active-shadow:',
  'Audit fallback-compatible 210/673 Candidate G public shadow',
  'Download read-only fallback-compatible 210/673 runtime',
  'node scripts/audit-ravscore-candidate-g-public-shadow.mjs',
  'candidate-g-public-shadow-audit.json',
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
  'EXPECTED_ZONES = 210',
  'EXPECTED_PARTS = 673',
  "scoreImpact === 'diagnostic-only'",
  'automaticActivationAllowed === false',
  'publicScoreChanged === false',
  'CANDIDATE_SCORE_RECONSTRUCTION_MISMATCH',
  'rawCurrentVectorsIncluded: false',
  'coordinatesIncluded: false',
  'privateReplayPayloadIncluded: false',
]) assert.ok(audit.includes(marker), `Shadowauditen mangler ${marker}`);
assert.match(workflow, /build-and-prepare:[\s\S]{0,220}inputs\.ravscore_active_shadow != true/);
console.log('Fallback-kompatibel 210/673 Candidate G public shadow-workflow: bestået.');
