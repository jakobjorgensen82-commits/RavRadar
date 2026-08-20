const HOUR_MS = 3600000;
export const OPEN_METEO_FUTURE_HOURS = 120;

export function openMeteoPastHours(referenceAt, buildAt = new Date()) {
  const referenceMs = Date.parse(referenceAt);
  const buildMs = buildAt instanceof Date ? buildAt.getTime() : Date.parse(buildAt);
  if (!Number.isFinite(referenceMs) || !Number.isFinite(buildMs)) return 2;
  const lagHours = Math.max(0, (buildMs - referenceMs) / HOUR_MS);
  return Math.max(1, Math.min(24, Math.ceil(lagHours) + 1));
}

export function trimOpenMeteoForecast(rows = [], referenceAt) {
  const referenceMs = Date.parse(referenceAt);
  const cutoffMs = Number.isFinite(referenceMs) ? referenceMs - 30 * 60000 : -Infinity;
  return rows
    .filter(row => Number.isFinite(Date.parse(row?.time)) && Date.parse(row.time) >= cutoffMs)
    .slice(0, OPEN_METEO_FUTURE_HOURS);
}
