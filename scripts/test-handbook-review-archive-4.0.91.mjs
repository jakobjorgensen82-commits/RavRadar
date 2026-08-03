import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync('js/services/handbook-review-store.js','utf8');
assert.ok(!/status:'archived'/.test(src),'Supabase-skemaet tillader ikke status archived');
assert.match(src,/status:'rejected'/);
assert.match(src,/\[ARKIVERET\]/);
assert.match(src,/filter\(row=>!String\(row\.resolution_note/);
console.log('Review-arkivering bruger gyldig Supabase-status og skjules i normal kø.');
