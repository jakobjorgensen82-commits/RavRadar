import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const handbook = fs.readFileSync('HANDBOOK-RAVRADAR.md', 'utf8');
const webHandbook = JSON.parse(fs.readFileSync('docs/handbook/content.json', 'utf8'));
const webText = (webHandbook.sections || [])
  .map((section) => `${section.title}\n${section.body}`)
  .join('\n');
const notice = 'RavScore vurderer ravmuligheden, ikke om turen er sikker.';

assert.ok(!ui.includes('Hvor let og sikkert'), 'UI må ikke blande jagtbarhed og sikkerhed sammen');
assert.ok(!ui.includes('med den valgte jagtform med den valgte jagtform'), 'Jagtformen må ikke gentages i forklaringen');
assert.ok(
  ui.includes('Hvor let det er at lede på den valgte måde'),
  'Fem-døgnsvisningen skal forklare søgeforhold som praktisk søgning'
);
assert.ok(ui.includes(notice), 'UI skal vise den særskilte sikkerhedsnote');
assert.ok(
  ui.split(notice).length - 1 >= 2,
  'Sikkerhedsnoten skal bruges i både aktuel visning og fem-døgnsvisning'
);
assert.ok(handbook.includes('Søgeforhold handler om, hvor effektivt man kan lede – ikke om sikkerhed.'));
assert.ok(handbook.includes(notice));
assert.ok(webText.includes('Søgeforhold handler om, hvor effektivt man kan lede – ikke om sikkerhed.'));
assert.ok(webText.includes(notice));

console.log('Huntability and safety copy contract passed.');
