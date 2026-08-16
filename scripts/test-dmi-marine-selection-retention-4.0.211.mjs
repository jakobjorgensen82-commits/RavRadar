import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('scripts/update-dmi-bulk.py','utf8');

assert.match(source,/GRID_LOOKUP_VERSION = [7-9]|GRID_LOOKUP_VERSION = \d{2,}/,'Behandlingssignaturen må ikke rulles tilbage under senere kontrollerede genindlæsninger.');
assert.match(source,/if old_zone\.get\("marineSelection"\):[\s\S]{0,160}new_zone\.setdefault\("marineSelection"/,'Eksisterende modelvalg skal overleve cachemerge.');
assert.match(source,/def restore_marine_selections\(/,'Legacy-cache skal kunne få modelvalget tilbage.');
assert.match(source,/collection = collections\.get\("current-u"\)/,'Gendannelse skal bruge den faktisk valgte strøm-collection.');
assert.doesNotMatch(source,/collection = collections\.get\("current-u"\) or collections\.get\("sea-mean-deviation"\)/,'Et vandstandsfelt må ikke låse et senere strømvalg til en forkert havmodel.');
assert.match(source,/restoredMarineSelections/,'Gendannelsen skal kunne måles i produktionsdiagnostikken.');
assert.match(source,/restore_marine_selections\(result, zones\)/,'Modelvalget skal gendannes før DMI-filer behandles.');

console.log('OK: valgt DMI-havmodel bevares mellem kørsler, legacy-cache gendannes, og aktuelle felter genbehandles én gang.');
