import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const source = await fs.readFile('scripts/fetch-geodanmark-pilot.py', 'utf8');
const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');

for (const required of [
  'DATAFORDELER_API_KEY',
  'GetCapabilities',
  'GetFeature',
  'GeoDanmark Vektor WFS',
  'centralHydrationRequired',
  'not-exposed-by-source',
  'fetched-for-non-production-pilot'
]) assert.ok(source.includes(required), `GeoDanmark-fetch mangler ${required}`);

for (const forbidden of [
  'print(key)',
  'print(api_key',
  'apikey=',
  'apikey={',
  'DATAFORDELER_API_KEY='
]) assert.ok(!source.includes(forbidden), `GeoDanmark-fetch kan lække secret: ${forbidden}`);

assert.match(workflow, /geometry_v2_pilot:/);
assert.match(workflow, /DATAFORDELER_API_KEY:\s*\$\{\{ secrets\.DATAFORDELER_API_KEY \}\}/);
assert.match(workflow, /name: Run GeoDanmark geometry-v2 pilot/);
assert.match(workflow, /--exclude 'data\/geometry-v2\/'/);
assert.match(workflow, /--exclude '\.geometry-v2-work\/'/);
console.log('GeoDanmark pilotfetch-kontrakt: bestået.');
