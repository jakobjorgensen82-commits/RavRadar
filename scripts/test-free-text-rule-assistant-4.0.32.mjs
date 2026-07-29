import assert from 'node:assert/strict';
import { interpretFreeTextRule } from '../js/core/free-text-rule-assistant.js';
const r=interpretFreeTextRule('Ved wadersjagt skal bølger under 0,7 m og vind under 6 m/s give bonus 8 point inden for 12 timer efter kraftigt vejr.');
assert.equal(r.ok,true);assert.deepEqual(r.draft.conditions.huntModes,['waders']);assert.equal(r.draft.conditions.maxWindSpeedMps,6);assert.equal(r.draft.conditions.maxWaveHeightM,0.7);assert.equal(r.draft.conditions.maxHoursSinceHighEnergy,12);assert.equal(r.draft.effect.scoreAdjustment,8);assert.equal(r.draft.status,'draft');
console.log('OK: fri tekst bliver kun til gennemgåelig regelkladde.');
