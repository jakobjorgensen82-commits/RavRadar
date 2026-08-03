const EARTH_KM = 6371;

export function cloneLine(line = []) {
  return line.map(point => [Number(point[0]), Number(point[1])]);
}

export function normalizeLine(line = []) {
  const output = [];
  for (const point of line) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const lon = Number(point[0]);
    const lat = Number(point[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    const previous = output.at(-1);
    if (!previous || previous[0] !== lon || previous[1] !== lat) output.push([lon, lat]);
  }
  return output;
}

export function distanceKm(a, b) {
  const [lon1, lat1] = a.map(value => Number(value) * Math.PI / 180);
  const [lon2, lat2] = b.map(value => Number(value) * Math.PI / 180);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function lineLengthKm(line = []) {
  return line.slice(1).reduce((sum, point, index) => sum + distanceKm(line[index], point), 0);
}

export function insertPoint(line, index, point) {
  const next = cloneLine(line);
  next.splice(Math.max(0, Math.min(next.length, index)), 0, [Number(point[0]), Number(point[1])]);
  return normalizeLine(next);
}

export function movePoint(line, index, point) {
  const next = cloneLine(line);
  if (!next[index]) return next;
  next[index] = [Number(point[0]), Number(point[1])];
  return normalizeLine(next);
}

export function removePoint(line, index) {
  if (line.length <= 2) return cloneLine(line);
  const next = cloneLine(line);
  next.splice(index, 1);
  return normalizeLine(next);
}

export function nearestVertexIndex(line, point) {
  let best = -1;
  let bestDistance = Infinity;
  line.forEach((candidate, index) => {
    const distance = distanceKm(candidate, point);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return { index: best, distanceKm: bestDistance };
}

export function applyAnchor(line, anchor, radius = 2) {
  const normalized = cloneLine(line);
  const target = [Number(anchor[0]), Number(anchor[1])];
  const nearest = nearestVertexIndex(normalized, target);
  if (nearest.index < 0) return normalized;
  const source = normalized[nearest.index];
  const delta = [target[0] - source[0], target[1] - source[1]];
  const spread = Math.max(0, Math.trunc(radius));

  // A marker must create an actual curve, even when the source line is sparse.
  // Densify the affected neighbourhood first and then use a cosine falloff,
  // so adjacent points bend gradually instead of producing a new straight chord.
  const left = Math.max(0, nearest.index - Math.max(1, spread));
  const right = Math.min(normalized.length - 1, nearest.index + Math.max(1, spread));
  const dense = [];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    dense.push(normalized[i]);
    if (i >= left && i < right) {
      const subdivisions = 4;
      for (let step = 1; step < subdivisions; step += 1) {
        const t = step / subdivisions;
        dense.push([
          normalized[i][0] + (normalized[i + 1][0] - normalized[i][0]) * t,
          normalized[i][1] + (normalized[i + 1][1] - normalized[i][1]) * t
        ]);
      }
    }
  }
  dense.push(normalized.at(-1));
  const denseNearest = nearestVertexIndex(dense, source).index;
  const denseSpread = Math.max(1, spread * 4 + 2);
  return normalizeLine(dense.map((point, index) => {
    const offset = Math.abs(index - denseNearest);
    if (offset > denseSpread) return point;
    const weight = spread === 0
      ? (offset === 0 ? 1 : 0)
      : (0.5 + 0.5 * Math.cos(Math.PI * offset / denseSpread));
    return [point[0] + delta[0] * weight, point[1] + delta[1] * weight];
  }));
}

function orientation(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-12) return 0;
  return value > 0 ? 1 : 2;
}

function intersects(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 !== o2 && o3 !== o4;
}

export function selfIntersectionCount(line = []) {
  let count = 0;
  for (let i = 0; i < line.length - 1; i += 1) {
    for (let j = i + 2; j < line.length - 1; j += 1) {
      if (i === 0 && j === line.length - 2) continue;
      if (intersects(line[i], line[i + 1], line[j], line[j + 1])) count += 1;
    }
  }
  return count;
}

export function validateCoastLine(line, original = []) {
  const normalized = normalizeLine(line);
  const issues = [];
  if (normalized.length < 2) issues.push('Linjen skal mindst have to punkter.');
  const outsideDenmark = normalized.filter(([lon, lat]) => lon < 7 || lon > 16 || lat < 54 || lat > 58.5).length;
  if (outsideDenmark) issues.push(`${outsideDenmark} punkt(er) ligger uden for Danmark.`);
  const maxSegmentKm = normalized.slice(1).reduce((max, point, index) => Math.max(max, distanceKm(normalized[index], point)), 0);
  if (maxSegmentKm > 5) issues.push(`Et linjestykke er ${maxSegmentKm.toFixed(1)} km langt og bør kontrolleres.`);
  const intersections = selfIntersectionCount(normalized);
  if (intersections) issues.push(`Linjen krydser sig selv ${intersections} gang(e).`);
  const originalLengthKm = lineLengthKm(original);
  const editedLengthKm = lineLengthKm(normalized);
  const lengthRatio = originalLengthKm > 0 ? editedLengthKm / originalLengthKm : 1;
  if (lengthRatio < 0.45 || lengthRatio > 2.2) issues.push('Længden afviger meget fra den oprindelige kystlinje.');
  return {
    valid: normalized.length >= 2 && !outsideDenmark && !intersections,
    issues,
    pointCount: normalized.length,
    lengthKm: editedLengthKm,
    originalLengthKm,
    lengthRatio,
    maxSegmentKm,
    intersections
  };
}

export function createOverride(zone, line, note = '', zoneName = '') {
  const original = zone?.properties?.coastLine || [];
  const validation = validateCoastLine(line, original);
  return {
    zoneId: zone?.properties?.id,
    zoneName: String(zoneName || zone?.properties?.name || zone?.properties?.id || '').trim(),
    coastLine: cloneLine(line),
    originalCoastLine: cloneLine(original),
    note: String(note || '').trim(),
    status: 'published',
    published: true,
    validation,
    updatedAt: new Date().toISOString(),
    editorVersion: 2
  };
}

export function applyOverridesToCollection(collection, overrides = {}) {
  const next = structuredClone(collection);
  for (const feature of next.features || []) {
    const id = feature?.properties?.id;
    const override = overrides[id];
    // Historical drafts are deliberately ignored. Only an explicit save from
    // the simplified editor may become part of the authoritative zone file.
    if (!override || override.published !== true || override.status === 'discarded') continue;
    if (override.disabled === true) {
      feature.properties.active = false;
      feature.properties.disabledByAdmin = true;
      feature.properties.disabledAt = override.updatedAt;
      continue;
    }
    const nextName = String(override.zoneName || '').trim();
    if (nextName) {
      feature.properties.name = nextName;
      feature.properties.nameEditedAt = override.updatedAt;
      feature.properties.nameSource = 'admin-coastline-editor';
    }
    if (!override.coastLine) continue;
    const validation = validateCoastLine(override.coastLine, feature.properties?.coastLine || []);
    if (!validation.valid) continue;
    feature.properties.coastLine = cloneLine(override.coastLine);
    feature.properties.coastLineSource = 'admin-manual-editor';
    feature.properties.coastLineVersion = '4.0.90';
    feature.properties.coastLineEditedAt = override.updatedAt;
    feature.properties.coastLineEditNote = override.note || '';
    feature.properties.coastLineRollbackVersion = feature.properties.coastLineRollbackVersion || '4.0.44';
  }
  return next;
}
