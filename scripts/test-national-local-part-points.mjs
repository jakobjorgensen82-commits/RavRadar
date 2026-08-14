import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/build-national-local-part-points.py', 'utf8');
const validator = await fs.readFile('scripts/validate-national-local-part-points.py', 'utf8');
const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');
const audit = await fs.readFile('scripts/audit-national-local-part-land-water.py', 'utf8');
const apply = await fs.readFile('scripts/apply-national-land-water-corrections.py', 'utf8');
const fallbackBuilder = await fs.readFile('scripts/build-fallback-zone-recovery-review.py', 'utf8');
const fallbackValidator = await fs.readFile('scripts/validate-fallback-zone-recovery.py', 'utf8');
const approvedPointBuilder = await fs.readFile('scripts/build-approved-public-coast-points.py', 'utf8');
const initialEvidence = JSON.parse(await fs.readFile(
  'data/geometry-v2/national-private-initial-land-water-evidence-2026-08-14.json',
  'utf8'
));
const finalEvidence = JSON.parse(await fs.readFile(
  'data/geometry-v2/national-private-final-land-water-evidence-2026-08-14.json',
  'utf8'
));
const fallbackEvidence = JSON.parse(await fs.readFile(
  'data/geometry-v2/national-private-fallback-land-water-evidence-2026-08-14.json',
  'utf8'
));

for (const token of [
  'centrally-hydrated-zone-dataPoint',
  'official-farvand-place-candidate',
  'NO_OFFICIAL_LAND_WITNESS',
  'NO_VALID_OPPOSITE_WITNESS_PAIR',
  'unresolvedNormalCandidates',
  'coastType',
  'weatherSamplingEnabled":False',
  'automaticActivationAllowed":False'
]) assert.ok(source.includes(token), `Punktbygger mangler ${token}`);

for (const token of [
  'build-national-local-part-points.py',
  'validate-national-local-part-points.py',
  'national-local-part-point-pairs.json'
]) assert.ok(workflow.includes(token), `Workflow mangler ${token}`);

assert.ok(validator.includes('to DMI-reviewkandidater'), 'Validator mangler fail-closed punktkontrol.');
for (const token of ['--points', '--coast', '--base-coast', '--locality', 'missing-point-pair', 'inputPointPairSha256'])
  assert.ok(audit.includes(token), `Uafhængig land/vand-audit mangler ${token}`);
for (const token of ['point_pair_fingerprint', '--require-exact-evidence', 'AMBIGUOUS_ESA_LAND_WATER_SIDE', 'blocked-point-pair-evidence', '--candidate-input', '--candidate-output'])
  assert.ok(apply.includes(token), `Land/vand-anvendelse mangler ${token}`);
for (const token of [
  '--require-exact-evidence',
  'national-private-initial-land-water-evidence-2026-08-14.json',
  'national-private-final-land-water-evidence-2026-08-14.json',
  'national-private-fallback-land-water-evidence-2026-08-14.json'
]) assert.ok(workflow.includes(token), `Workflow mangler kandidatbundet land/vand-gate: ${token}`);
assert.ok(
  !workflow.includes('apply-national-land-water-corrections.py --allow-deferred'),
  'Workflow må ikke udskyde land/vand-bevis for den private kandidat.'
);
assert.deepEqual(
  [initialEvidence.auditedPartCount, initialEvidence.correctionCount, initialEvidence.ambiguousCount],
  [835, 149, 166]
);
assert.deepEqual(
  [finalEvidence.auditedPartCount, finalEvidence.correctionCount, finalEvidence.ambiguousCount],
  [652, 111, 114]
);
assert.deepEqual(
  [fallbackEvidence.auditedPartCount, fallbackEvidence.correctionCount, fallbackEvidence.ambiguousCount],
  [17, 4, 2]
);
for (const evidence of [initialEvidence, finalEvidence, fallbackEvidence])
  assert.match(evidence.inputPointPairSha256, /^[a-f0-9]{64}$/);
assert.ok(!fallbackBuilder.includes('"DK-B10-16": ('), 'Fallback-bygger må ikke genoplive Fejø/Femø.');
assert.ok(fallbackBuilder.includes('"deletedZonesPreserved": ["DK-B02-14", "DK-B10-16"]'));
assert.ok(
  fallbackBuilder.includes('for path in (args.output, args.candidate, args.bundle, args.report):')
    && fallbackBuilder.includes('path.parent.mkdir(parents=True, exist_ok=True)'),
  'Fallback-byggeren skal selv oprette alle outputmapper i en ren CI-runner.'
);
for (const token of ['active_index.get(part_id)', 'existing_remainders', 'already-active-validated-neighbour-remainder'])
  assert.ok(fallbackBuilder.includes(token), `Fallback-byggeren mangler idempotent naboregel: ${token}`);
for (const token of ['already-active-validated-point-pair', 'eksisterende punktpar uden retning'])
  assert.ok(approvedPointBuilder.includes(token), `Punktbyggeren mangler idempotent punktregel: ${token}`);
for (const token of ['Den slettede Fejø/Femø-zone er genoplivet', 'completedOwnershipMoveCount', 'completedReplacementPartCount'])
  assert.ok(fallbackValidator.includes(token), `Fallback-validator mangler ${token}`);

console.log('National local part point pairs kontrakt: bestået.');
