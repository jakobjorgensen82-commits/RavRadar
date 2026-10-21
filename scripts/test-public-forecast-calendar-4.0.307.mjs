import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { forecastDateKeyInTimeZone, forecastDateKeyForDayOffset, visibleForecastDays } from '../js/core/forecast-calendar.js';

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

// Pure formatter reuse: identical civil dates, bounded constructors, no date cache.
const NativeDateTimeFormat = Intl.DateTimeFormat;
const uncachedDateKey = (now, timeZone = 'Europe/Copenhagen') => {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) throw new TypeError('Ugyldigt tidspunkt til prognosekalenderen.');
  const parts = new NativeDateTimeFormat('en-GB', {timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const dates = ['2026-03-28T22:59:59Z','2026-03-28T23:00:00Z','2026-03-29T00:59:59Z',
  '2026-03-29T01:00:00Z','2026-10-24T21:59:59Z','2026-10-24T22:00:00Z',
  '2026-10-25T00:59:59Z','2026-10-25T01:00:00Z','2026-03-08T07:00:00Z',
  '2026-11-01T06:00:00Z','2028-02-29T23:00:00Z',-1,0,8640000000000000,-8640000000000000];
for (const zone of ['Europe/Copenhagen','Europe/Berlin','UTC','America/New_York','Etc/GMT+1']) {
  for (const now of dates) assert.equal(forecastDateKeyInTimeZone(now,zone),uncachedDateKey(now,zone));
}
assert.equal(forecastDateKeyForDayOffset('2026-03-28T23:30:00Z',1),'2026-03-30');
assert.equal(forecastDateKeyForDayOffset('2026-10-24T22:30:00Z',1),'2026-10-26');
let constructions = 0;
function CountingDateTimeFormat(...args) { constructions++; return new NativeDateTimeFormat(...args); }
Intl.DateTimeFormat = CountingDateTimeFormat;
try {
  for (let hour=0; hour<2048; hour++) {
    const at = Date.UTC(2026,0,1,hour);
    assert.equal(forecastDateKeyInTimeZone(at,'Europe/Copenhagen'),uncachedDateKey(at,'Europe/Copenhagen'));
  }
  assert.equal(constructions,1,'2048 different hours must share one formatter, not one result');
  let timezoneCoercions=0;
  const objectZone = {[Symbol.toPrimitive](){timezoneCoercions++;return timezoneCoercions===1?'UTC':'Europe/Copenhagen';}};
  assert.equal(forecastDateKeyInTimeZone('2026-08-28T22:30:00Z',objectZone),'2026-08-28');
  assert.equal(forecastDateKeyInTimeZone('2026-08-28T22:30:00Z',objectZone),'2026-08-29');
  assert.equal(timezoneCoercions,2);assert.equal(constructions,3,'Object coercion may not be cached');
  let invalidDateCoercions=0;
  const unusedZone={toString(){invalidDateCoercions++;return 'UTC';}};
  for(const invalid of [NaN,Infinity,new Date(NaN)]) assert.throws(()=>forecastDateKeyInTimeZone(invalid,unusedZone),TypeError);
  assert.equal(invalidDateCoercions,0);assert.equal(constructions,3,'Invalid date fails before constructor and timezone coercion');
  const fixedError=new Error('timezone coercion sentinel');
  assert.throws(()=>forecastDateKeyInTimeZone(0,{toString(){throw fixedError;}}),error=>error===fixedError);
  for(const zone of ['No/Such_Zone',' Europe/Copenhagen ','x'.repeat(65),null,Symbol('zone')]) {
    for(let pass=0;pass<2;pass++) {
      let expected;try{uncachedDateKey(0,zone);}catch(error){expected=error;}
      assert(expected);assert.throws(()=>forecastDateKeyInTimeZone(0,zone),error=>error.constructor===expected.constructor&&error.message===expected.message);
    }
  }
  const beforeImplicit=constructions;
  assert.equal(forecastDateKeyInTimeZone('2026-08-28T22:30:00Z'), '2026-08-29');
  assert.equal(forecastDateKeyInTimeZone('2026-08-28T22:30:00Z',undefined), '2026-08-29');
  assert.equal(constructions,beforeImplicit,'Implicit argument keeps the existing Copenhagen default');
  const zones=['Etc/GMT',...Array.from({length:12},(_,i)=>'Etc/GMT+'+i),...Array.from({length:5},(_,i)=>'Etc/GMT-'+(i+1))];
  for(const zone of zones) assert.equal(forecastDateKeyInTimeZone(0,zone),uncachedDateKey(0,zone));
  const fullCount=constructions;
  for(const zone of zones.slice(-16)) forecastDateKeyInTimeZone(0,zone);
  assert.equal(constructions,fullCount,'All16 most recently inserted exact keys remain cached');
  forecastDateKeyInTimeZone(0,zones[0]);assert.equal(constructions,fullCount+1,'The oldest key is evicted at the16-key bound');
  let replacementCalls=0;
  Intl.DateTimeFormat=function ReplacementDateTimeFormat(...args){replacementCalls++;return new NativeDateTimeFormat(...args);};
  forecastDateKeyInTimeZone(0,'Europe/Copenhagen');forecastDateKeyInTimeZone(1,'Europe/Copenhagen');
  assert.equal(replacementCalls,1,'A changed Intl constructor invalidates old formatter identity');
} finally { Intl.DateTimeFormat=NativeDateTimeFormat; }

console.log('OK: prognosekalenderen fjerner udløbne dage i dansk tid uden at omdatere gamle prognoseværdier.');
