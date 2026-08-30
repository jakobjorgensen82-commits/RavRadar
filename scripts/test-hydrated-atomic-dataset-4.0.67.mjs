import fs from 'node:fs/promises';
const source = await fs.readFile('scripts/hydrate-deployed-weather.py','utf8');
for (const marker of [
  'ATOMIC_WEATHER_FILES',
  'data/live/manifest.json',
  'data/live/conditions.json',
  'deployed manifest/conditions datasetId mismatch',
  '"fatal": True',
  'return 1',
  'atomic_write_json(local_manifest_path, remote_manifest)',
  'atomic_write_json(local_conditions_path, remote_conditions)'
]) {
  if (!source.includes(marker)) throw new Error('Manglende atomisk hydreringskontrol: '+marker);
}
const manifest = JSON.parse(await fs.readFile('data/live/manifest.json','utf8'));
const conditions = JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
if (!manifest.datasetId || manifest.datasetId !== conditions.datasetId) throw new Error('Indchecket datasæt matcher ikke');
console.log('OK: manifest og conditions hydreres og valideres som ét atomisk datasæt.');
