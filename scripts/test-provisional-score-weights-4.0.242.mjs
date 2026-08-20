import assert from 'node:assert/strict';
import { SCORE_WEIGHTS } from '../js/core/score-engine.js?weights=4.0.242';
import { DEFAULT_ADAPTIVE_MODEL } from '../js/core/adaptive-model.js?weights=4.0.242';

const expected = { huntability: 0.25, transport: 0.40, release: 0.35 };
assert.deepEqual(SCORE_WEIGHTS, expected, 'Den aktive score skal bruge 25/40/35.');
assert.deepEqual(DEFAULT_ADAPTIVE_MODEL.weights, expected, 'Adminmodellens standardvisning skal matche den aktive score.');
assert.equal(Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0), 1, 'Vægtene skal summere til 1.');

const weighted = ({ huntability, transport, release }) =>
  Math.round(huntability * SCORE_WEIGHTS.huntability + transport * SCORE_WEIGHTS.transport + release * SCORE_WEIGHTS.release);

assert.equal(weighted({ huntability: 100, transport: 0, release: 0 }), 25);
assert.equal(weighted({ huntability: 0, transport: 100, release: 0 }), 40);
assert.equal(weighted({ huntability: 0, transport: 0, release: 100 }), 35);
assert.equal(weighted({ huntability: 100, transport: 100, release: 100 }), 100);
assert.equal(weighted({ huntability: 0, transport: 0, release: 0 }), 0);

console.log('OK: aktive RavScore-vægte og adminstandard er låst til 25/40/35.');
