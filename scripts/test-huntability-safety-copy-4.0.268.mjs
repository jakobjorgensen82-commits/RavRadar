import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('js/ui/info-panel.js', 'utf8');
const assistant = fs.readFileSync('js/services/rav-assistant.js', 'utf8');
const i18n = fs.readFileSync('js/i18n.js', 'utf8');
const learning = fs.readFileSync('learn.html', 'utf8');

assert.ok(!ui.includes('Hvor let og sikkert'), 'Søgeforhold og sikkerhed må ikke blandes sammen');
assert.ok(ui.includes("t('score.huntabilityDefinition')"), 'Scorepanelet skal bruge den stabile nøgle for søgeforhold');
assert.ok(i18n.includes("'score.huntabilityDefinition':'Hvor let det er at lede på den valgte måde"), 'Dansk fallback skal forklare søgeforhold som praktisk søgning');
assert.ok(!ui.includes('RavScore vurderer ravmuligheden, ikke om turen er sikker.'), 'Scorepanelet må ikke gentage en sikkerhedsadvarsel ved hver delscore');
assert.ok(assistant.includes("if (intent === 'safety') return t('assistant.local.safety'"), 'Et direkte spørgsmål om sikkerhed skal stadig kunne besvares');
assert.ok(i18n.includes("'assistant.local.safety':'RavScore er en vurdering af ravforholdene, ikke en sikkerhedsvurdering."), 'Dansk fallback skal bevare sikkerhedsgrænsen');
assert.ok(learning.includes('RavRadar beskriver rav- og søgeforhold, ikke om en tur er sikker.'), 'Læringsmodulet skal forklare modellens grænse ét samlet sted');
assert.equal((learning.match(/ikke om en tur er sikker/g) || []).length, 1, 'Sikkerhedsgrænsen skal kun forklares ét samlet sted');

console.log('Søgeforhold forklares uden en offentlig sikkerhedsscore eller gentagne advarsler.');
