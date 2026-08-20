import assert from 'node:assert/strict';

const oldWeights = { huntability: 0.40, transport: 0.35, release: 0.25 };
const newWeights = { huntability: 0.25, transport: 0.40, release: 0.35 };
const score = (components, weights) => Math.round(
  components.huntability * weights.huntability +
  components.transport * weights.transport +
  components.release * weights.release
);

const rows = [];
for (let huntability = 0; huntability <= 100; huntability += 5) {
  for (let transport = 0; transport <= 100; transport += 5) {
    for (let release = 0; release <= 100; release += 5) {
      const components = { huntability, transport, release };
      const oldScore = score(components, oldWeights);
      const newScore = score(components, newWeights);
      rows.push({ ...components, oldScore, newScore, delta: newScore - oldScore });
    }
  }
}

const deltas = rows.map(row => row.delta);
const summary = {
  scenarios: rows.length,
  meanDelta: Number((deltas.reduce((sum, value) => sum + value, 0) / deltas.length).toFixed(3)),
  minDelta: Math.min(...deltas),
  maxDelta: Math.max(...deltas),
  changed: rows.filter(row => row.delta !== 0).length,
  unchanged: rows.filter(row => row.delta === 0).length
};

assert.equal(summary.scenarios, 9261);
assert.equal(summary.minDelta, -15, 'Jagtbarhedsdominerede yderpunkter må højst falde 15 point.');
assert.equal(summary.maxDelta, 15, 'Mobiliserings-/transportdominerede yderpunkter må højst stige 15 point.');
assert.equal(score({ huntability: 50, transport: 50, release: 50 }, newWeights), 50, 'Balancerede komponenter skal være score-neutrale.');
assert.equal(score({ huntability: 100, transport: 100, release: 100 }, newWeights), 100);
assert.equal(score({ huntability: 0, transport: 0, release: 0 }, newWeights), 0);

console.log(JSON.stringify(summary, null, 2));
