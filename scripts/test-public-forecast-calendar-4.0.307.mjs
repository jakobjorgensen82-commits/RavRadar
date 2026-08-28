import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { forecastDateKeyInTimeZone, visibleForecastDays } from '../js/core/forecast-calendar.js';

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
