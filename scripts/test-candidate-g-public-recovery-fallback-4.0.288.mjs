import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [buildWorkflow, packageDocument, publicDataService] = await Promise.all([
  readProductionWorkflowSource('build'),
  fs.readFile('package.json', 'utf8').then(JSON.parse),
  fs.readFile('js/services/data-service.js', 'utf8'),
]);

for (const retiredMarker of [
  'Restore last verified Candidate G public fallback',
  'Stage audited last verified Candidate G public fallback',
  'Save last verified Candidate G public fallback',
  'candidate-g-last-ready-public-v1-',
  'candidate-g-public-recovery-fallback.mjs',
  'Publish bounded Candidate G recovery fallback',
  'steps.candidate-g-public-fallback-stage',
]) {
  assert.ok(!buildWorkflow.includes(retiredMarker),
    `Aktivt build-workflow må ikke genaktivere pensioneret offentlig Candidate G-fallback: ${retiredMarker}`);
}
assert.equal(
  Object.hasOwn(packageDocument.scripts || {}, 'test:candidate-g-public-recovery'),
  false,
  'Den pensionerede positive Candidate G-fallbacktest må ikke være et aktivt package-script',
);
assert.match(buildWorkflow, /Restore the latest atomic schema-6 and Candidate G rollback checkpoint/,
  'Aktiv recovery skal bruge det private atomiske schema-6-checkpoint med rollback-companion');
assert.match(buildWorkflow, /node scripts\/protected-ravscore-continuation-checkpoint\.mjs/,
  'Aktiv recovery skal verificere det beskyttede schema-6-checkpoint');
assert.match(
  publicDataService,
  /'recoveryFallback' in manifest[\s\S]{0,80}'emergencyFallback' in manifest/,
  'Den offentlige data-service skal afvise gamle fallbackfelter fail-closed',
);
assert.doesNotMatch(
  publicDataService,
  /function recoveryFallbackUrl|active-last-verified|last-verified-public/,
  'Den offentlige data-service må ikke indeholde en pensioneret fallbackvælger',
);

console.log('Candidate G public recovery fallback er pensioneret; schema-6-checkpoint og fail-closed public loader er aktive.');
