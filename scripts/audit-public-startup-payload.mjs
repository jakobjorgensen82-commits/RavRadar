import fs from 'node:fs/promises';

const inputPath = process.argv[2] || 'data/live/public-conditions.json';
const remote = /^https?:\/\//i.test(inputPath);
const response = remote ? await fetch(inputPath, { headers: { 'user-agent': 'RavRadar startup payload audit' } }) : null;
if (response && !response.ok) throw new Error(`Kunne ikke hente ${inputPath}: HTTP ${response.status}`);
const text = remote ? await response.text() : await fs.readFile(inputPath, 'utf8');
const document = JSON.parse(text);
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const addFields = (target, source) => {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + bytes(value);
  }
};
const sortBytes = values => Object.fromEntries(Object.entries(values).sort((a, b) => b[1] - a[1]));
const zoneFields = {};
const forecastFields = {};
const hourlyFields = {};
const coastalPartFields = {};
const coastalZoneFields = {};
const coastalHourlyFields = {};
let hourlyRows = 0;
let coastalHourlyRows = 0;

for (const zone of Object.values(document.zones || {})) {
  addFields(zoneFields, zone);
  addFields(forecastFields, zone.forecast);
  for (const hour of zone.forecast?.hourly || []) {
    hourlyRows += 1;
    addFields(hourlyFields, hour);
  }
}

addFields(coastalPartFields, document.coastalParts);
for (const zone of Object.values(document.coastalParts?.zones || {})) {
  addFields(coastalZoneFields, zone);
  for (const hour of zone.hourly || []) {
    coastalHourlyRows += 1;
    addFields(coastalHourlyFields, hour);
  }
}

const fileBytes = Buffer.byteLength(text);
const hourlyBytes = forecastFields.hourly || 0;
const result = {
  inputPath,
  datasetId: document.datasetId || null,
  generatedAt: document.generatedAt || null,
  fileBytes,
  zoneCount: Object.keys(document.zones || {}).length,
  hourlyRows,
  coastalHourlyRows,
  hourlySharePercent: fileBytes ? Number((hourlyBytes / fileBytes * 100).toFixed(2)) : 0,
  topLevelBytes: sortBytes(Object.fromEntries(Object.entries(document).map(([key, value]) => [key, bytes(value)]))),
  zoneFieldBytes: sortBytes(zoneFields),
  forecastFieldBytes: sortBytes(forecastFields),
  hourlyFieldBytes: sortBytes(hourlyFields),
  coastalPartFieldBytes: sortBytes(coastalPartFields),
  coastalZoneFieldBytes: sortBytes(coastalZoneFields),
  coastalHourlyFieldBytes: sortBytes(coastalHourlyFields)
};

console.log(JSON.stringify(result, null, 2));
