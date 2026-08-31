const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function forecastDateKeyInTimeZone(now = Date.now(), timeZone = 'Europe/Copenhagen') {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Ugyldigt tidspunkt til prognosekalenderen.');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year:'numeric',
    month:'2-digit',
    day:'2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function forecastDateKeyForDayOffset(now = Date.now(), dayOffset = 0, timeZone = 'Europe/Copenhagen') {
  const offset = Number(dayOffset);
  if (!Number.isSafeInteger(offset)) throw new TypeError('Ugyldigt dagsskift til prognosekalenderen.');
  const localDate = forecastDateKeyInTimeZone(now, timeZone);
  const [year, month, day] = localDate.split('-').map(Number);
  const civilDate = new Date(Date.UTC(year, month - 1, day + offset, 12));
  return `${civilDate.getUTCFullYear()}-${String(civilDate.getUTCMonth() + 1).padStart(2, '0')}-${String(civilDate.getUTCDate()).padStart(2, '0')}`;
}

export function visibleForecastDays(days, {
  now = Date.now(),
  timeZone = 'Europe/Copenhagen',
  limit = 5
} = {}) {
  const today = forecastDateKeyInTimeZone(now, timeZone);
  const maximum = Math.max(0, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : 5);
  return (Array.isArray(days) ? days : [])
    .map((item, index) => ({
      item,
      index,
      date:typeof item === 'string' ? item : item?.date
    }))
    .filter(entry => ISO_DATE_PATTERN.test(String(entry.date || '')) && entry.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date) || left.index - right.index)
    .slice(0, maximum)
    .map(entry => entry.item);
}
