import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { forecastDateKeyInTimeZone, visibleForecastDays } from '../js/core/forecast-calendar.js';

// Exercise the real normal module in a fresh module instance, not a rewritten
// calendar. The original constructor is restored even when the regression fails.
const dateTimeFormatDescriptor = Object.getOwnPropertyDescriptor(Intl, 'DateTimeFormat');
const ActualDateTimeFormat = Intl.DateTimeFormat;
const formatterConstructions = [];
const CountedDateTimeFormat = new Proxy(ActualDateTimeFormat, {
  construct(target, argumentsList, newTarget) {
    formatterConstructions.push(argumentsList);
    return Reflect.construct(target, argumentsList, newTarget);
  },
});
try {
  Object.defineProperty(Intl, 'DateTimeFormat', {
    ...dateTimeFormatDescriptor, value: CountedDateTimeFormat,
  });
  const calendar = await import(new URL(
    '../js/core/forecast-calendar.js?calendar-constructor-count-4.0.307', import.meta.url,
  ));
  assert.equal(formatterConstructions.length, 0, 'Copenhagen-formatter skal oprettes lazy, ikke ved moduleimport');
  assert.throws(() => calendar.forecastDateKeyInTimeZone('not-a-date'),
    { name:'TypeError', message:'Ugyldigt tidspunkt til prognosekalenderen.' });
  assert.equal(formatterConstructions.length, 0, 'Ugyldig dato må ikke oprette formatter før datokontrollen');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z'), '2026-08-29');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T21:30:00.000Z', 'Europe/Copenhagen'), '2026-08-28');
  assert.equal(formatterConstructions.length, 1,
    'To normale Copenhagen-kald skal bruge præcis én faktisk Intl.DateTimeFormat-konstruktion');
  assert.deepEqual(formatterConstructions[0], ['en-GB', {
    timeZone:'Europe/Copenhagen', year:'numeric', month:'2-digit', day:'2-digit',
  }], 'Den genbrugte formatter skal beholde locale og alle oprindelige datoindstillinger');

  for (const [time, date] of [
    ['2026-03-28T22:30:00.000Z', '2026-03-28'],
    ['2026-03-28T23:30:00.000Z', '2026-03-29'],
    ['2026-03-29T21:30:00.000Z', '2026-03-29'],
    ['2026-03-29T22:30:00.000Z', '2026-03-30'],
    ['2026-10-24T21:30:00.000Z', '2026-10-24'],
    ['2026-10-24T22:30:00.000Z', '2026-10-25'],
    ['2026-10-25T22:30:00.000Z', '2026-10-25'],
    ['2026-10-25T23:30:00.000Z', '2026-10-26'],
  ]) {
    assert.equal(calendar.forecastDateKeyInTimeZone(time), date,
      `Samme Copenhagen-formatter skal følge lokal midnat på begge sider af DST: ${time}`);
  }
  assert.equal(formatterConstructions.length, 1, 'DST-datoer må ikke skabe flere Copenhagen-formatters');

  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z', 'UTC'), '2026-08-28');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z', 'UTC'), '2026-08-28');
  assert.equal(formatterConstructions.length, 3, 'Andre tidszoner skal fortsat få en frisk formatter pr. kald');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-29T02:30:00.000Z', 'America/New_York'), '2026-08-28');
  assert.equal(formatterConstructions.length, 4, 'Custom-TZ må ikke bruge Copenhagen-cachen');
  const wrappedCopenhagen = new String('Europe/Copenhagen');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z', wrappedCopenhagen), '2026-08-29');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z', wrappedCopenhagen), '2026-08-29');
  assert.equal(formatterConstructions.length, 6, 'Kun den eksakte primitive Copenhagen-streng må caches');

  assert.throws(() => calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z', 'Not/A_Real_Zone'),
    RangeError, 'Ugyldig tidszone skal fortsat afvises af Intl');
  assert.equal(formatterConstructions.length, 7, 'Ugyldig custom-TZ skal gå gennem den oprindelige constructor');
  for (const invalidDate of [Number.NaN, new Date(Number.NaN), 'not-a-date']) {
    assert.throws(() => calendar.forecastDateKeyInTimeZone(invalidDate, 'Not/A_Real_Zone'),
      { name:'TypeError', message:'Ugyldigt tidspunkt til prognosekalenderen.' },
      'Datokontrollen skal stadig komme før selv en ugyldig tidszone');
  }
  assert.equal(formatterConstructions.length, 7, 'Ugyldig dato må aldrig starte formatterkonstruktion');
  assert.equal(calendar.forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z'), '2026-08-29');
  assert.equal(formatterConstructions.length, 7, 'Custom-TZ og fejl må ikke erstatte den eksisterende Copenhagen-formatter');
} finally {
  Object.defineProperty(Intl, 'DateTimeFormat', dateTimeFormatDescriptor);
}
assert.deepEqual(Object.getOwnPropertyDescriptor(Intl, 'DateTimeFormat'), dateTimeFormatDescriptor,
  'Den faktiske globale Intl-constructor skal gendannes før de gamle regressioner');

assert.equal(forecastDateKeyInTimeZone('2026-08-28T22:30:00.000Z'), '2026-08-29', 'Copenhagen-dagen skal skifte ved lokal midnat');
assert.equal(forecastDateKeyInTimeZone('2026-08-28T21:30:00.000Z'), '2026-08-28', 'UTC-datoen må ikke alene styre kalenderdagen');

const staleEmergencyDays = [
  { date:'2026-08-27', marker:'expired-thursday' },
  { date:'2026-08-28', marker:'expired-friday' },
  { date:'2026-08-29', marker:'saturday' },
  { date:'2026-08-30', marker:'sunday' },
  { date:'2026-08-31', marker:'monday' }
];
assert.deepEqual(
  visibleForecastDays(staleEmergencyDays, { now:'2026-08-29T00:38:00+02:00' }).map(day => day.marker),
  ['saturday','sunday','monday'],
  'Nøddrift skal beholde de rigtige datoer og kun fjerne udløbne dage'
);
assert.deepEqual(
  visibleForecastDays([{date:'2026-09-02'},{date:'2026-08-31'},{date:'2026-09-01'}], { now:'2026-08-29T12:00:00+02:00', limit:2 }).map(day => day.date),
  ['2026-08-31','2026-09-01'],
  'Gyldige prognosedage skal sorteres og begrænses uden omdatéring'
);
assert.deepEqual(visibleForecastDays(staleEmergencyDays.slice(0,2), { now:'2026-08-29T00:38:00+02:00' }), [], 'Et helt udløbet datasæt må ikke vises som aktuelt');

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../js/ui/info-panel.js', import.meta.url), 'utf8');
const i18nSource = await readFile(new URL('../js/i18n.js', import.meta.url), 'utf8');
assert.match(appSource, /visibleForecastDays\(preparedAfterLoad\)/, 'Nationalprognosen skal filtrere forberedte nøddriftsdage');
assert.match(panelSource, /visibleForecastDays\(/, 'Zoneprognosen skal filtrere udløbne dage');
for (const key of ['forecast.expired','forecast.recoveryDays']) {
  assert.equal((i18nSource.match(new RegExp(`'${key.replace('.', '\\\.')}'`, 'g')) || []).length, 3, `${key} skal findes på DA/DE/EN`);
}

console.log('OK: prognosekalenderen fjerner udløbne dage i dansk tid uden at omdatere gamle prognoseværdier.');
