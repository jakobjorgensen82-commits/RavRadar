import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const workflows = await readProductionWorkflowSources();
const audit = fs.readFileSync('scripts/audit-ravscore-candidate-g-public-shadow.mjs', 'utf8');
for (const [role, workflow] of Object.entries(workflows)) {
  for (const marker of [
  'ravscore_active_shadow:',
  'ravscore-active-shadow:',
  'Audit fallback-compatible 210/673 Candidate G public shadow',
  'Download read-only fallback-compatible 210/673 runtime',
  'node scripts/audit-ravscore-candidate-g-public-shadow.mjs',
  'candidate-g-public-shadow-audit.json',
  'ravradar-active-ravscore-shadow',
  ]) assert.ok(!workflow.includes(marker), `${role}-workflowet må ikke genåbne den pensionerede RavScore-shadow: ${marker}`);
}

for (const marker of [
  'EXPECTED_ZONES = 210',
  'EXPECTED_PARTS = 673',
  "scoreImpact === 'active-public'",
  'automaticActivationAllowed === false',
  'publicScoreChanged === true',
  'ACTIVE_SCORE_DOES_NOT_MATCH_CANDIDATE_G',
  'prePublicWarmupAccepted',
  'WINDOW_HAS_MISSING_EVIDENCE',
  'WINDOW_HAS_TIME_GAP',
  'LATEST_SAMPLE_MISSING',
  'CANDIDATE_SCORE_RECONSTRUCTION_MISMATCH',
  'rawCurrentVectorsIncluded: false',
  'coordinatesIncluded: false',
  'privateReplayPayloadIncluded: false',
]) assert.ok(audit.includes(marker), `Shadowauditen mangler ${marker}`);
console.log('Den pensionerede offentlige Candidate G-shadow har ingen workflow-entrypoint; det offline auditværktøj forbliver datasikkert.');
