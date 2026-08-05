import fs from 'node:fs';

const path = '.github/workflows/update-and-deploy.yml';
const text = fs.readFileSync(path, 'utf8');
const positions = {
  hydrate: text.indexOf('name: Hydrate latest deployed weather state'),
  preflight: text.indexOf('name: Decide whether weather needs updating'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
};
for (const [name, pos] of Object.entries(positions)) {
  if (pos < 0) throw new Error(`Mangler workflowtrin: ${name}`);
}
const expected = ['hydrate','preflight','weather','provenance','runtime','validate','gate'];
for (let i = 1; i < expected.length; i += 1) {
  const before = expected[i - 1];
  const after = expected[i];
  if (!(positions[before] < positions[after])) {
    throw new Error(`Forkert rækkefølge: ${before} skal ligge før ${after}`);
  }
}
const beforeWeather = text.slice(0, positions.weather);
if (beforeWeather.includes('npm run validate') || beforeWeather.includes('npm run release:gate')) {
  throw new Error('Validering/release gate må ikke køre før frisk vejr og u/v-proveniens er bygget.');
}
if (beforeWeather.includes('npm run build:current-provenance')) {
  throw new Error('Hydrerede data må ikke tvinges gennem strømaudit før frisk DMI-kørsel på tvungne/source runs.');
}
console.log('Workflow-rækkefølge 4.0.108 bestået: frisk vejr → u/v-proveniens → public runtime → validering → release gate.');
