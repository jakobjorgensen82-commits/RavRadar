const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const normText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function localKm(point, origin) {
  const latScale = 111.32;
  const lonScale = 111.32 * Math.cos((origin?.[1] ?? 56) * Math.PI / 180);
  return [(point[0] - origin[0]) * lonScale, (point[1] - origin[1]) * latScale];
}

function coastlineAxis(point, coastLine) {
  const line = Array.isArray(coastLine) ? coastLine.filter(p => Array.isArray(p) && p.length === 2) : [];
  if (line.length < 2) return null;
  let best = null;
  for (let i = 0; i < line.length - 1; i += 1) {
    const a = localKm(line[i], point), b = localKm(line[i + 1], point);
    const vx = b[0] - a[0], vy = b[1] - a[1], length = Math.hypot(vx, vy);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, -(a[0] * vx + a[1] * vy) / (length * length)));
    const distance = Math.hypot(a[0] + t * vx, a[1] + t * vy);
    if (!best || distance < best.distance) best = { x: vx / length, y: vy / length, distance };
  }
  if (best) return best;
  const a = localKm(line[0], point), b = localKm(line.at(-1), point), length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return length ? { x: (b[0] - a[0]) / length, y: (b[1] - a[1]) / length, distance: 0 } : null;
}

function stationUsable(station) {
  if (!station?.stationId || !Array.isArray(station.point) || station.point.length !== 2) return false;
  const status = normText(station.registryStatus ?? station.properties?.status);
  return !['retired', 'deleted'].includes(status);
}

function weightedSelection(selected) {
  const inverse = selected.map(item => 1 / Math.max(0.5, Math.abs(item.alongKm)));
  const total = inverse.reduce((sum, value) => sum + value, 0) || 1;
  return selected.map((item, index) => ({ ...item, weight: inverse[index] / total }));
}

const SPECIAL_BRACKETS = [{
  id: 'mariager-fjord-mouth',
  zonePattern: /(oster hurup|als odde|helberskov|mariager fjord)/,
  sides: [/(^|\b)hals(\b|\s|i|ii|2)/, /(als odde|helberskov|\bals\b)/]
}];

export function recommendWaterStationBracket({ zoneId, zoneName, point, coastLine, stations, levels = null, haversineKm = null, maxDistanceKm = 140 } = {}) {
  const axis = coastlineAxis(point, coastLine);
  const zoneText = normText(`${zoneName ?? ''} ${zoneId ?? ''}`);
  const raw = (stations ?? []).filter(stationUsable).map(station => {
    const v = localKm(station.point, point);
    const distanceKm = haversineKm ? haversineKm(point, station.point) : Math.hypot(v[0], v[1]);
    const alongKm = axis ? v[0] * axis.x + v[1] * axis.y : null;
    const crossKm = axis ? Math.abs(-v[0] * axis.y + v[1] * axis.x) : null;
    const level = levels?.get?.(String(station.stationId)) ?? levels?.get?.(station.stationId) ?? null;
    return { ...station, level, distanceKm, alongKm, crossKm };
  }).filter(item => Number.isFinite(item.distanceKm) && item.distanceKm <= maxDistanceKm && (!levels || finite(item.level?.valueCm) !== null));

  const special = SPECIAL_BRACKETS.find(rule => rule.zonePattern.test(zoneText));
  if (special) {
    const selected = special.sides.map(pattern => raw.filter(item => pattern.test(normText(item.name))).sort((a, b) => a.distanceKm - b.distanceKm)[0]).filter(Boolean);
    if (selected.length === 2 && String(selected[0].stationId) !== String(selected[1].stationId)) {
      return { method: 'named-topology-bracket', ruleId: special.id, completeBracket: true, axis, stations: weightedSelection(selected).map((item, i) => ({ ...item, role: i ? 'coast-side-b' : 'coast-side-a' })), candidates: raw.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12), reason: null };
    }
  }

  if (!axis) return { method: 'no-coast-axis', completeBracket: false, axis: null, stations: [], candidates: raw.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12), reason: 'Zonen mangler en brugbar kystlinjeakse.' };
  const corridor = raw.filter(item => item.crossKm <= Math.max(30, Math.min(65, Math.abs(item.alongKm) * 1.25 + 10)));
  const negative = corridor.filter(item => item.alongKm < -0.5).sort((a,b)=>Math.abs(a.alongKm)-Math.abs(b.alongKm) || a.distanceKm-b.distanceKm)[0];
  const positive = corridor.filter(item => item.alongKm > 0.5).sort((a,b)=>Math.abs(a.alongKm)-Math.abs(b.alongKm) || a.distanceKm-b.distanceKm)[0];
  const selected = [negative, positive].filter(Boolean);
  const completeBracket = selected.length === 2 && String(selected[0].stationId) !== String(selected[1].stationId);
  return {
    method: completeBracket ? 'topology-bracket-opposite-coast-sides' : 'topology-bracket-incomplete',
    completeBracket,
    axis,
    stations: weightedSelection(selected).map(item => ({ ...item, role: item.alongKm < 0 ? 'coast-before' : 'coast-after' })),
    candidates: corridor.sort((a,b)=>Math.abs(a.alongKm)-Math.abs(b.alongKm)).slice(0,12),
    reason: completeBracket ? null : !negative && !positive ? 'Ingen kompatible stationer langs kystkorridoren.' : !negative ? 'Mangler station på den ene side af zonen langs kysten.' : 'Mangler station på den anden side af zonen langs kysten.'
  };
}
