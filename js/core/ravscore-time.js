const RFC3339_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/i;

const DAYS_IN_MONTH = Object.freeze([
  31,
  28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
]);

function leapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/**
 * Returns one canonical millisecond UTC timestamp only for a complete,
 * calendar-valid RFC 3339 instant. JavaScript's permissive Date parser rolls
 * malformed dates such as February 30 and 24:00 into a different hour/day;
 * model evidence must fail closed instead of being silently moved.
 */
export function canonicalRavScoreTime(value) {
  if (typeof value !== 'string') return null;
  const match = RFC3339_TIME.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const zone = match[8];
  const maximumDay = month === 2 && leapYear(year)
    ? 29
    : DAYS_IN_MONTH[month - 1];
  if (!maximumDay
    || day < 1 || day > maximumDay
    || hour > 23 || minute > 59 || second > 59) return null;
  if (zone !== 'Z' && zone !== 'z') {
    const zoneHour = Number(zone.slice(1, 3));
    const zoneMinute = Number(zone.slice(4, 6));
    if (zoneHour > 23 || zoneMinute > 59) return null;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : null;
}
