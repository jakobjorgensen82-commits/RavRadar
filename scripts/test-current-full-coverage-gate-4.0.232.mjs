import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/test-current-spatial-scientific-audit-4.0.76.mjs', 'utf8');

assert.match(source, /const requiredPartCoverage=expectedParts\.length;/);
assert.match(source, /const verifiedScoreReadyParts=verifiedPartGridPoints\+verifiedNativeCadenceHeldParts;/);
assert.match(source, /controlledLive&&verifiedScoreReadyParts<requiredPartCoverage/);
assert.match(source, /alle \$\{requiredPartCoverage\} kræves/);
assert.match(source, /requiredCoastalPartCoverageRatio:controlledLive\?1:null/);
assert.match(source, /dmiOnlyRollback.*resten er tydeligt missing/);
assert.doesNotMatch(source, /expectedParts\.length\s*\*\s*\.95/);
assert.doesNotMatch(source, /Math\.ceil\(expectedParts\.length/);

console.log('OK: normal drift requires every active coastal part; explicit DMI-only rollback cannot claim full coverage.');
