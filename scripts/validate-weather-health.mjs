import fs from 'node:fs/promises';

const path = 'data/live/weather-health.json';

let data;
try {
  data = JSON.parse(await fs.readFile(path, 'utf8'));
} catch {
  console.log('weather-health.json oprettes ved første centrale vejr-opdatering.');
  process.exit(0);
}

const allowed = {
  status: new Set(['ok', 'warning', 'degraded', 'alarm']),
  serviceStatus: new Set(['ok', 'degraded', 'alarm']),
  userForecastStatus: new Set(['ok', 'warning', 'alarm']),
  dmiCoverageStatus: new Set(['ok', 'warning', 'alarm']),
  apiConnectivityStatus: new Set(['ok', 'warning', 'rate-limited', 'alarm'])
};

function validateOptionalStatus(field) {
  const value = data[field];
  if (value === undefined || value === null || value === '') return false;
  if (!allowed[field].has(value)) {
    throw new Error(`Ugyldig weather-health ${field}: ${JSON.stringify(value)}`);
  }
  return true;
}

const hasLegacyStatus = validateOptionalStatus('status');
const hasStructuredStatus = [
  'serviceStatus',
  'userForecastStatus',
  'dmiCoverageStatus',
  'apiConnectivityStatus'
].map(validateOptionalStatus).some(Boolean);

if (!hasLegacyStatus && !hasStructuredStatus) {
  throw new Error('Weather-health mangler både status og den strukturerede statusmodel');
}

if (hasStructuredStatus) {
  for (const field of [
    'serviceStatus',
    'userForecastStatus',
    'dmiCoverageStatus',
    'apiConnectivityStatus'
  ]) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error(`Weather-health mangler ${field} i den strukturerede statusmodel`);
    }
  }
}

if ((data.alerts?.maxPer24Hours ?? 2) > 2) {
  throw new Error('Alarmgrænsen må højst være 2');
}

console.log(
  `Weather health bestået (${hasStructuredStatus ? 'struktureret statusmodel' : 'legacy statusmodel'}).`
);
