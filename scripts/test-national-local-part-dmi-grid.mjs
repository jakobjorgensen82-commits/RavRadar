import fs from 'node:fs';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const workflow = await readProductionWorkflowSource('orchestrator');
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
for (const step of [
  'Validate all private water candidates on native DMI grids',
  'Validate final water points on native DMI grids',
  'Validate fallback water points on native DMI grids',
]) {
  const start = workflow.indexOf(`name: ${step}`);
  const end = workflow.indexOf('\n\n', start);
  const block = start < 0 ? '' : workflow.slice(start, end < 0 ? workflow.length : end);
  if (!block.includes('DMI_BULK_MAX_RUNTIME_SECONDS: "3000"')) {
    throw new Error(`${step} mangler eksplicit nationalt privat tidsbudget`);
  }
}
console.log('National local part DMI-grid kontrakt: bestået.');
