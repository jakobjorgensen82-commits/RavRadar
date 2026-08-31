import fs from 'node:fs';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const hydrate = fs.readFileSync('scripts/hydrate-deployed-weather.py', 'utf8');
const buildWorkflow = await readProductionWorkflowSource('build');

for (const marker of [
  'RETIRED_ZONE_IDS = {"DK-B04-09"}',
  'def active_zone_ids()',
  'def sanitize_remote_document',
  'relative != "data/live/conditions.json"',
  'removedUnknownZoneIds',
  'remote, removed_zone_ids = sanitize_remote_document'
]) {
  if (!hydrate.includes(marker)) throw new Error(`Hydrering mangler beskyttelse: ${marker}`);
}
if (!buildWorkflow.includes('python scripts/hydrate-deployed-weather.py')) {
  throw new Error('Workflow bruger ikke den beskyttede hydrering');
}
console.log('OK: Hydreret conditions renses for pensionerede og ukendte zoner før validering.');
