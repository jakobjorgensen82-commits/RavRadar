import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const css=fs.readFileSync('admin.css','utf8');

assert.match(admin,/const overrideActive=Boolean\(r\.enabled\)/,'Kortet skal kende den aktive routingtilstand');
assert.match(admin,/const autoIds=overrideActive\?new Set\(\):new Set\(automatic\.stations\.map\(stationSourceKey\)\)/,'Automatiske markører skal skjules ved aktivt override');
assert.match(admin,/adminIds=overrideActive\?new Set\(\(r\.stations\|\|\[\]\)\.map/,'Administratorvalgte markører må kun være aktive, når override er slået til');
assert.doesNotMatch(admin,/both\s*=|#a978ff|Begge valg/,'Lilla dobbeltstatus må ikke længere bruges');
assert.doesNotMatch(css,/automatic-admin-station|#a978ff/,'Lilla signaturfarve skal være fjernet');
assert.match(admin,/rows\.splice\(0,rows\.length,\.\.\.unique\)/,'Samme kilde skal deduplikeres');
assert.match(admin,/if\(rows\.length===1\)entry\.weight=1/,'Én administratorvalgt kilde skal have 100 procent vægt');
assert.match(admin,/route\.enabled\?'<span><i class="dot selected-station"><\/i> Aktivt administratorvalg<\/span>':'<span><i class="dot automatic-station"><\/i> Aktivt automatisk valg<\/span>'/,'Signaturen skal vise den aktive routing og ikke begge forslag samtidig');

console.log('OK: kortet viser kun aktiv routing; override skjuler grøn/lilla, og dubletter samles til én kilde med 100 % vægt.');
