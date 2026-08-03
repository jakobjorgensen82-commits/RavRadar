import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const optionalJson = path => {
  try { return readJson(path); } catch { return null; }
};

export function baselineZoneIds({ baselinePath = 'data/geometry-snapshots/zones-4.0.44.geojson', permanentlyRetired = ['DK-B04-09'] } = {}) {
  const baseline = readJson(baselinePath);
  if (baseline?.type !== 'FeatureCollection' || !Array.isArray(baseline.features)) {
    throw new Error(`Ugyldigt historisk zoneregister: ${baselinePath}`);
  }
  const ids = new Set(baseline.features.map(feature => String(feature?.properties?.id || '')).filter(Boolean));
  for (const id of permanentlyRetired) ids.delete(String(id));
  return ids;
}

export function explicitDeletedZoneIds({ reviewsPath = 'data/admin/direction-reviews.json' } = {}) {
  const document = optionalJson(reviewsPath);
  const rows = document?.zones ?? (document && typeof document === 'object' ? document : {});
  const deleted = new Set();
  for (const [zoneId, review] of Object.entries(rows || {})) {
    if (review?.deleted === true || review?.status === 'deleted') deleted.add(String(zoneId));
  }
  return deleted;
}

export function expectedActiveZoneIds(options = {}) {
  const expected = baselineZoneIds(options);
  for (const id of explicitDeletedZoneIds(options)) expected.delete(id);
  return expected;
}

export function validateActiveZoneIds(actualIds, options = {}) {
  const actual = new Set([...actualIds].map(String));
  const expected = expectedActiveZoneIds(options);
  const missingWithoutDeletion = [...expected].filter(id => !actual.has(id));
  const unexpected = [...actual].filter(id => !expected.has(id));
  if (missingWithoutDeletion.length) {
    throw new Error(`Zoneregisteret mangler ${missingWithoutDeletion.length} zoner uden eksplicit administratorsletning, bl.a. ${missingWithoutDeletion.slice(0, 5).join(', ')}`);
  }
  if (unexpected.length) {
    throw new Error(`Zoneregisteret indeholder ${unexpected.length} ukendte eller genopståede zoner, bl.a. ${unexpected.slice(0, 5).join(', ')}`);
  }
  return { actual, expected, deleted: explicitDeletedZoneIds(options) };
}
