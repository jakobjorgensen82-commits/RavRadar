import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');

assert.match(source,/PARSER_VERSION = 18/,'Behandlingssignaturen skal tvinge en kontrolleret genindlaesning.');
assert.match(source,/if old_zone\.get\("marineSelection"\):[\s\S]{0,160}new_zone\.setdefault\("marineSelection"/,'Eksisterende skalar-modelvalg skal overleve cachemerge.');
assert.match(source,/def restore_marine_selections\(/,'Legacy-cache skal kunne faa skalar-modelvalget tilbage.');
assert.match(source,/for key in \("wind-tail-u-10m", "sea-mean-deviation", "water-temperature"\)/,'Legacy-gendannelse skal bruge et skalarfelt.');
assert.doesNotMatch(source,/collection = collections\.get\("current-u"\)/,'Stroem-collection maa ikke laengere laase skalarfelternes havmodel.');
assert.match(source,/prefer_current_hour_candidate/,'Stroem skal vaelges uafhaengigt pr. native tid.');
assert.match(source,/restoredMarineSelections/,'Gendannelsen skal kunne maales i produktionsdiagnostikken.');
assert.match(source,/restore_marine_selections\(result, zones\)/,'Skalar-modelvalget skal gendannes foer DMI-filer behandles.');

console.log('OK: scalar marine selection is retained independently from native-time current selection.');
