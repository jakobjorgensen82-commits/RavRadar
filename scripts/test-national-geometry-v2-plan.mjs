import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const policy = JSON.parse(await fs.readFile('data/geometry-v2/national-conflict-policy.json', 'utf8'));
const source = await fs.readFile('scripts/build-national-geometry-v2-plan.py', 'utf8');

assert.equal(policy.expectedEffectiveZoneCount, 210);
assert.equal(policy.zones['DK-B03-13'].conflictClass, 'local-geometry-refinement');
assert.equal(policy.zones['DK-B04-08'].conflictClass, 'semantic-migration-review');
assert.equal(policy.zones['DK-B10-17'].conflictClass, 'semantic-migration-review');
assert.ok(policy.gates.includes('central-admin-hydration-and-tombstones'));
assert.ok(policy.gates.includes('national-release-and-pages-activation'));
assert.match(source, /centrally hydrated active zone registry/i);
assert.match(source, /central-admin-conflict-review/);
assert.match(source, /automaticActivationAllowed/);
assert.match(source, /zone-geometry-and-coast-evidence-bounds/);

const analysisSource = await fs.readFile('scripts/analyze-geodanmark-national.py', 'utf8');
assert.match(analysisSource, /zone-ownership-window-recovery/);
assert.match(analysisSource, /active-parts/);
const publicCoverageAudit = await fs.readFile('scripts/audit-national-public-coast-coverage.py', 'utf8');
for (const marker of ['missingMainZoneIds', 'officialSourceOutlierCount', 'crossZoneOverlapCount', 'uncoveredReviewPartCount', 'automaticActivationAllowed']) {
  assert.match(publicCoverageAudit, new RegExp(marker));
}

const command = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(command, ['scripts/build-national-geometry-v2-plan.py', '--self-test'], {encoding: 'utf8'});
if (result.status !== null) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test:/);
}

const fetchResult = spawnSync(command, ['scripts/fetch-geodanmark-national.py', '--self-test'], {encoding: 'utf8'});
if (fetchResult.status !== null) {
  assert.equal(fetchResult.status, 0, fetchResult.stderr || fetchResult.stdout);
  assert.match(fetchResult.stdout, /self-test:/);
}
const publicAuditResult = spawnSync(command, ['scripts/audit-national-public-coast-coverage.py', '--self-test'], {encoding: 'utf8'});
if (publicAuditResult.status !== null) {
  assert.equal(publicAuditResult.status, 0, publicAuditResult.stderr || publicAuditResult.stdout);
  assert.match(publicAuditResult.stdout, /self-test:/);
}
await import('./test-geodanmark-national-fetch.mjs');
await import('./test-geodanmark-national-source-validation.mjs');
await import('./test-geodanmark-national-analysis.mjs');
await import('./test-national-topology-audit.mjs');
await import('./test-national-coastal-parts.mjs');
await import('./test-national-coastal-part-names.mjs');
await import('./test-national-locality-partitions.mjs');
await import('./test-national-local-part-names.mjs');
await import('./test-national-local-part-points.mjs');
await import('./test-national-local-part-dmi-grid.mjs');
await import('./test-national-weather-shadow-contract.mjs');

console.log('National geometry-v2-plan kontrakt: bestået.');
