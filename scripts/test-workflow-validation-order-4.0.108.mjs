import fs from 'node:fs';

const path = '.github/workflows/update-and-deploy.yml';
const text = fs.readFileSync(path, 'utf8');
const positions = {
  hydrate: text.indexOf('name: Hydrate latest deployed weather state'),
  preflight: text.indexOf('name: Decide whether weather needs updating'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  reference: text.indexOf('name: Generate and strictly validate production reference zones'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
};
for (const [name, pos] of Object.entries(positions)) {
  if (pos < 0) throw new Error(`Mangler workflowtrin: ${name}`);
}
const expected = ['hydrate','preflight','weather','provenance','runtime','reference','validate','gate'];
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
if (!text.includes('uses: actions/cache/restore@v4') || !text.includes('uses: actions/cache/save@v4')) throw new Error('DMI GRIB-cachen skal både gendannes og gemmes med fremdrift.');
if (/uses: actions\/cache@v4[\s\S]{0,300}key: dmi-grib-v3-/.test(text)) throw new Error('Den uforanderlige ugentlige primærnøgle må ikke genindføres.');
if (!text.includes('${{ github.run_id }}-${{ github.run_attempt }}')) throw new Error('Den gemte DMI-cache skal have en unik nøgle pr. kørsel.');
console.log('Workflow-rækkefølge og progressiv DMI-cache består.');
