import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/test-current-spatial-scientific-audit-4.0.76.mjs', 'utf8');

assert.match(source, /const requiredPartCoverage=expectedParts\.length;/);
assert.match(source, /const verifiedScoreReadyParts=verifiedPartGridPoints\+verifiedNativeCadenceHeldParts;/);
assert.match(source, /accountedParts!==requiredPartCoverage\)failures\.push/);
assert.match(source, /controlledLive&&documentedMissingParts>0\)warnings\.push/);
assert.match(source, /publicAvailableCurrentParts>verifiedScoreReadyParts\)failures\.push/);
// Exercise the actual report expression without loading private production
// data. Accounted-for MISSING must never become numerical 100% coverage.
const expression = source.match(/requiredCoastalPartCoverageRatio:([^,]+),/)?.[1];
assert.ok(expression, 'the report must expose its measured coverage ratio');
const ratio = Function('controlledLive', 'verifiedScoreReadyParts', 'requiredPartCoverage',
  `return (${expression});`);
assert.equal(ratio(true, 673, 673), 1);
assert.equal(ratio(true, 665, 673), 665 / 673);
assert.equal(ratio(true, 0, 673), 0);
assert.equal(ratio(false, 665, 673), null);
assert.match(source, /dataCompletenessStatus:verifiedScoreReadyParts===requiredPartCoverage\?'COMPLETE':'INCOMPLETE'/);
assert.match(source, /dmiOnlyRollback.*resten er tydeligt missing/);
assert.doesNotMatch(source, /expectedParts\.length\s*\*\s*\.95/);
assert.doesNotMatch(source, /Math\.ceil\(expectedParts\.length/);

console.log('OK: actual numerical coverage stays distinct from accounted-for MISSING; incomplete data remains explicit without blocking valid local forecasts.');
