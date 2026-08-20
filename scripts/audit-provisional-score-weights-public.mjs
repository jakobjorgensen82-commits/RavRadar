import assert from 'node:assert/strict';
import fs from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Angiv public-condition-details.json som argument.');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const oldWeights = { huntability: 0.40, transport: 0.35, release: 0.25 };
const newWeights = { huntability: 0.25, transport: 0.40, release: 0.35 };
const clamp = value => Math.max(0, Math.min(100, value));
const weighted = (components, weights) => Math.round(
  Number(components.huntability) * weights.huntability +
  Number(components.transport) * weights.transport +
  Number(components.release) * weights.release
);
const sameWeights = (actual, expected) =>
  actual && Object.entries(expected).every(([key, value]) => Math.abs(Number(actual[key]) - value) < 1e-9);
const referenceBand = score => score >= 75 ? 'good' : score >= 55 ? 'fair' : score >= 35 ? 'weak' : 'poor';

const rows = [];
const zoneIdByPart = new Map(Object.entries(data.coastalParts?.parts || {}).map(([partId, part]) => [partId, String(part.zoneId || '').toUpperCase()]));
function visit(value, path) {
  if (!value || typeof value !== 'object') return;
  const components = value.components;
  if (
    Number.isFinite(Number(value.score)) &&
    components &&
    ['huntability', 'transport', 'release'].every(key => Number.isFinite(Number(components[key])))
  ) {
    const oldRaw = weighted(components, oldWeights);
    const newRaw = weighted(components, newWeights);
    const retainedAdjustment = Number(value.score) - oldRaw;
    const projectedScore = clamp(newRaw + retainedAdjustment);
    const partPrefix = 'root.coastalParts.parts.';
    const partId = path.startsWith(partPrefix) ? path.slice(partPrefix.length).split('.')[0] : null;
    const zoneId = zoneIdByPart.get(partId) || partId?.match(/^dk-b[0-9]{2}-[0-9]{2}/i)?.[0]?.toUpperCase() || null;
    rows.push({
      path,
      partId,
      zoneId,
      mode: path.endsWith('.waders') ? 'waders' : path.endsWith('.beach') ? 'beach' : 'other',
      scope: path.includes('.current.') ? 'current' : 'forecast',
      oldScore: Number(value.score),
      projectedScore,
      delta: projectedScore - Number(value.score),
      retainedAdjustment,
      oldWeightsMatch: value.explanation?.weights == null || sameWeights(value.explanation.weights, oldWeights),
      oldBand: referenceBand(Number(value.score)),
      projectedBand: referenceBand(projectedScore)
    });
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => visit(child, path + '[' + index + ']'));
  } else {
    Object.entries(value).forEach(([key, child]) => visit(child, path + '.' + key));
  }
}
visit(data, 'root');

const currentGroups = new Map();
for (const row of rows.filter(row => row.scope === 'current' && row.zoneId && row.mode !== 'other')) {
  const key = row.zoneId + '::' + row.mode;
  if (!currentGroups.has(key)) currentGroups.set(key, []);
  currentGroups.get(key).push(row);
}
const zoneWinnerRows = [...currentGroups.entries()].map(([key, group]) => {
  const oldWinner = group.reduce((best, row) => row.oldScore > best.oldScore ? row : best);
  const projectedWinner = group.reduce((best, row) => row.projectedScore > best.projectedScore ? row : best);
  return {
    key,
    zoneId: oldWinner.zoneId,
    mode: oldWinner.mode,
    oldScore: oldWinner.oldScore,
    projectedScore: projectedWinner.projectedScore,
    delta: projectedWinner.projectedScore - oldWinner.oldScore,
    oldPartId: oldWinner.partId,
    projectedPartId: projectedWinner.partId,
    oldBand: referenceBand(oldWinner.oldScore),
    projectedBand: referenceBand(projectedWinner.projectedScore)
  };
});
const zoneWinners = {
  records: zoneWinnerRows.length,
  zones: new Set(zoneWinnerRows.map(row => row.zoneId)).size,
  oldMean: Number((zoneWinnerRows.reduce((sum, row) => sum + row.oldScore, 0) / zoneWinnerRows.length).toFixed(3)),
  projectedMean: Number((zoneWinnerRows.reduce((sum, row) => sum + row.projectedScore, 0) / zoneWinnerRows.length).toFixed(3)),
  meanDelta: Number((zoneWinnerRows.reduce((sum, row) => sum + row.delta, 0) / zoneWinnerRows.length).toFixed(3)),
  minDelta: Math.min(...zoneWinnerRows.map(row => row.delta)),
  maxDelta: Math.max(...zoneWinnerRows.map(row => row.delta)),
  winnerChanges: zoneWinnerRows.filter(row => row.oldPartId !== row.projectedPartId).length,
  referenceBandChanges: zoneWinnerRows.filter(row => row.oldBand !== row.projectedBand).length,
  oldReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, zoneWinnerRows.filter(row => row.oldBand === band).length])),
  projectedReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, zoneWinnerRows.filter(row => row.projectedBand === band).length]))
};

const deltas = rows.map(row => row.delta);
const byMode = Object.fromEntries(['waders', 'beach'].map(mode => {
  const subset = rows.filter(row => row.mode === mode);
  return [mode, {
    records: subset.length,
    oldMean: Number((subset.reduce((sum, row) => sum + row.oldScore, 0) / subset.length).toFixed(3)),
    projectedMean: Number((subset.reduce((sum, row) => sum + row.projectedScore, 0) / subset.length).toFixed(3)),
    oldReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, subset.filter(row => row.oldBand === band).length])),
    projectedReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, subset.filter(row => row.projectedBand === band).length])),
    meanDelta: Number((subset.reduce((sum, row) => sum + row.delta, 0) / subset.length).toFixed(3)),
    minDelta: Math.min(...subset.map(row => row.delta)),
    maxDelta: Math.max(...subset.map(row => row.delta)),
    referenceBandChanges: subset.filter(row => row.oldBand !== row.projectedBand).length
  }];
}));
const byScope = Object.fromEntries(['current', 'forecast'].map(scope => {
  const subset = rows.filter(row => row.scope === scope);
  return [scope, {
    records: subset.length,
    oldMean: Number((subset.reduce((sum, row) => sum + row.oldScore, 0) / subset.length).toFixed(3)),
    projectedMean: Number((subset.reduce((sum, row) => sum + row.projectedScore, 0) / subset.length).toFixed(3)),
    oldReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, subset.filter(row => row.oldBand === band).length])),
    projectedReferenceBands: Object.fromEntries(['poor', 'weak', 'fair', 'good'].map(band => [band, subset.filter(row => row.projectedBand === band).length])),
    meanDelta: Number((subset.reduce((sum, row) => sum + row.delta, 0) / subset.length).toFixed(3)),
    minDelta: Math.min(...subset.map(row => row.delta)),
    maxDelta: Math.max(...subset.map(row => row.delta)),
    referenceBandChanges: subset.filter(row => row.oldBand !== row.projectedBand).length
  }];
}));
const summary = {
  datasetId: data.datasetId || null,
  generatedAt: data.generatedAt || null,
  parts: new Set(rows.map(row => row.partId).filter(Boolean)).size,
  records: rows.length,
  currentRecords: rows.filter(row => row.scope === 'current').length,
  forecastRecords: rows.filter(row => row.scope === 'forecast').length,
  meanDelta: Number((deltas.reduce((sum, value) => sum + value, 0) / deltas.length).toFixed(3)),
  minDelta: Math.min(...deltas),
  maxDelta: Math.max(...deltas),
  changedRecords: rows.filter(row => row.delta !== 0).length,
  referenceBandChanges: rows.filter(row => row.oldBand !== row.projectedBand).length,
  retainedAdjustmentRange: [
    Math.min(...rows.map(row => row.retainedAdjustment)),
    Math.max(...rows.map(row => row.retainedAdjustment))
  ],
  explanationWeightMismatches: rows.filter(row => !row.oldWeightsMatch).length,
  zoneWinners,
  byScope,
  byMode
};

assert.equal(summary.parts, 673, 'Auditten skal dække alle 673 kystdele.');
assert.equal(summary.currentRecords, 1346, 'Auditten skal dække begge jagtformer for alle aktuelle kystdele.');
assert.equal(summary.zoneWinners.records, 420, 'Auditten skal dække begge jagtformer for 210 viste zoner.');
assert.equal(summary.zoneWinners.zones, 210, 'Auditten skal dække alle 210 viste zoner.');
assert.ok(summary.records >= 40000, 'Auditten skal dække den offentliggjorte prognosebredde.');
assert.equal(summary.explanationWeightMismatches, 0, 'Baselineforklaringerne skal bruge 40/35/25.');
assert.ok(summary.minDelta >= -15 && summary.maxDelta <= 15, 'Vægtændringen må ikke overskride den matematiske grænse på 15 point.');
assert.ok(byMode.waders.records > 0 && byMode.beach.records > 0, 'Begge jagtformer skal være dækket.');

console.log(JSON.stringify(summary, null, 2));
