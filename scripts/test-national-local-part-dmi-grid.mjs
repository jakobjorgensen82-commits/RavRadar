import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/update-and-deploy.yml', 'utf8');
const source = fs.readFileSync('scripts/validate-national-local-part-dmi-grid.py', 'utf8');

for (const marker of [
  'national-local-part-point-pairs.json',
  'national-local-part-dmi-grid.json',
  'production nearest-valid-cell search',
  'NO_SHARED_UV_GRID_POINT',
  'valid-native-marine-grid-evidence',
  'partialCoverageSelectedPointCount',
  'blocked-ambiguous-native-water-side',
  'automaticActivationAllowed',
]) {
  if (!source.includes(marker)) throw new Error(`National DMI-gridvalidator mangler ${marker}`);
}
for (const marker of [
  'python -m pip install --disable-pip-version-check -r requirements-dmi.txt',
  'python scripts/validate-national-local-part-dmi-grid.py',
  '.geometry-v2-work/national-local-part-dmi-grid.json',
]) {
  if (!workflow.includes(marker)) throw new Error(`Nationalt workflow mangler ${marker}`);
}
console.log('National local part DMI-grid kontrakt: bestået.');
