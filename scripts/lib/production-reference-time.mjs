export function resolveProductionReferenceTime(value, fallback = new Date()) {
  const supplied = String(value ?? '').trim();
  if (!supplied) return new Date(fallback).toISOString();

  const parsed = Date.parse(supplied);
  if (!Number.isFinite(parsed)) {
    throw new Error('RAVRADAR_PRODUCTION_TARGET_HOUR must be a valid UTC timestamp');
  }
  const resolved = new Date(parsed);
  if (
    resolved.getUTCMinutes() !== 0
    || resolved.getUTCSeconds() !== 0
    || resolved.getUTCMilliseconds() !== 0
  ) {
    throw new Error('RAVRADAR_PRODUCTION_TARGET_HOUR must identify an exact UTC hour');
  }
  return resolved.toISOString();
}
