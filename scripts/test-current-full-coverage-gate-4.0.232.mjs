import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/test-current-spatial-scientific-audit-4.0.76.mjs', 'utf8');

assert.match(source, /const requiredPartCoverage=expectedParts\.length;/);
assert.match(source, /alle \$\{requiredPartCoverage\} kræves/);
assert.match(source, /requiredCoastalPartCoverageRatio:1/);
assert.doesNotMatch(source, /expectedParts\.length\s*\*\s*\.95/);
assert.doesNotMatch(source, /Math\.ceil\(expectedParts\.length/);

console.log('OK: production current coverage gate requires every active coastal part.');
