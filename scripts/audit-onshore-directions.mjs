import fs from 'node:fs/promises';

const ZONES_PATH = 'data/zones.geojson';
const OUTPUT_PATH = 'ONSHORE-DIRECTION-AUDIT.json';
const APPLY = process.argv.includes('--apply');
if (APPLY) throw new Error('Automatisk --apply er deaktiveret: dataPoint/pinPoint dokumenterer ikke sikkert hav→land-retningen. Retninger skal ændres via geografisk godkendt kildedata.');
const normalize = value => ((value % 360) + 360) % 360;
const angularDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

function bearing(from, to) {
  const meanLat = ((from[1] + to[1]) / 2) * Math.PI / 180;
  const east = (to[0] - from[0]) * Math.cos(meanLat);
  const north = to[1] - from[1];
  if (Math.hypot(east, north) < 1e-10) return null;
  return normalize(Math.atan2(east, north) * 180 / Math.PI);
}

function haversineKm(a, b) {
  const toRad = degrees => degrees * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const geojson = JSON.parse(await fs.readFile(ZONES_PATH, 'utf8'));
const previousAudit = await fs.readFile(OUTPUT_PATH, 'utf8').then(JSON.parse).catch(() => ({ zones: [] }));
const previousById = new Map((previousAudit.zones ?? []).map(item => [item.zoneId, item]));
const audit = [];
let changed = 0;

for (const feature of geojson.features ?? []) {
  const p = feature.properties ?? {};
  if (p.zoneStatus !== 'active') continue;
  if (!Array.isArray(p.dataPoint) || !Array.isArray(p.pinPoint)) throw new Error(`${p.id}: dataPoint/pinPoint mangler`);
  const expectedRaw = bearing(p.dataPoint, p.pinPoint);
  const expected = expectedRaw === null ? null : Math.round(expectedRaw);
  const configured = Number(p.onshoreDirectionDeg);
  const distanceKm = haversineKm(p.dataPoint, p.pinPoint);
  const delta = expected === null ? null : angularDifference(configured, expected);
  const historical = previousById.get(p.id);
  const warnings = [];
  if (expected === null || distanceKm < 0.15) warnings.push('IDENTICAL_OR_TOO_CLOSE_POINTS');
  if (distanceKm > 8) warnings.push('POINTS_TOO_FAR_APART');
  if (expected !== null && delta > 1) warnings.push(delta >= 150 ? 'LIKELY_180_DEG_MISMATCH' : 'DIRECTION_MISMATCH');
  if (['limfjord', 'island'].includes(String(p.coastType ?? '').toLowerCase()) || /odde|næs|bugt|fjord|ø\b/i.test(String(p.name ?? ''))) warnings.push('COMPLEX_COAST_MANUAL_REVIEW');



  audit.push({
    zoneId: p.id,
    name: p.name,
    historicalDirectionDeg: Number.isFinite(historical?.previous) ? historical.previous : null,
    configuredDirectionDeg: configured,
    pointBearingDeg: expected,
    differenceDeg: delta === null ? null : Math.round(delta),
    pointDistanceKm: Number(distanceKm.toFixed(2)),
    status: warnings.some(item => item === 'IDENTICAL_OR_TOO_CLOSE_POINTS' || item === 'LIKELY_180_DEG_MISMATCH') ? 'FAIL' : warnings.length ? 'REVIEW' : 'PASS',
    warnings
  });
}

const summary = {
  activeZones: audit.length,
  pass: audit.filter(item => item.status === 'PASS').length,
  review: audit.filter(item => item.status === 'REVIEW').length,
  fail: audit.filter(item => item.status === 'FAIL').length,
  historicalCorrectionsOver90Deg: audit.filter(item => Number.isFinite(item.historicalDirectionDeg) && angularDifference(item.historicalDirectionDeg, item.configuredDirectionDeg) > 90).length,
  identicalOrTooClosePoints: audit.filter(item => item.warnings.includes('IDENTICAL_OR_TOO_CLOSE_POINTS')).length,
  pointsTooFarApart: audit.filter(item => item.warnings.includes('POINTS_TOO_FAR_APART')).length,
  complexCoastsForManualReview: audit.filter(item => item.warnings.includes('COMPLEX_COAST_MANUAL_REVIEW')).length
};

await fs.writeFile(OUTPUT_PATH, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: 'audit-only',
  method: 'Independent consistency audit of configured direction against dataPoint→pinPoint bearing. This does not prove that either point is geographically correct.',
  summary,
  zones: audit
}, null, 2)}\n`);
console.log(`Onshore-audit: ${summary.pass} PASS, ${summary.review} REVIEW, ${summary.fail} FAIL. Ingen zonedata blev ændret.`);
