import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-hydrate-contract-'));
const live = path.join(root, 'data', 'live');
await fs.mkdir(live, { recursive: true });
await fs.writeFile(path.join(root, 'data', 'zones.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { id: 'zone-a' }, geometry: null }],
}));

const localManifest = { datasetId: 'local-safe', generatedAt: '2026-08-24T12:00:00.000Z' };
const localConditions = {
  datasetId: 'local-safe',
  generatedAt: '2026-08-24T12:00:00.000Z',
  zones: { 'zone-a': {} },
};
await fs.writeFile(path.join(live, 'manifest.json'), JSON.stringify(localManifest));
await fs.writeFile(path.join(live, 'conditions.json'), JSON.stringify(localConditions));

let mismatch = true;
const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/data/live/manifest.json') {
    response.end(JSON.stringify({ datasetId: 'remote-new', generatedAt: '2026-08-24T13:00:00.000Z' }));
    return;
  }
  if (request.url === '/data/live/conditions.json') {
    response.end(JSON.stringify({
      datasetId: mismatch ? 'remote-mismatch' : 'remote-new',
      generatedAt: '2026-08-24T13:00:00.000Z',
      zones: { 'zone-a': {} },
    }));
    return;
  }
  response.statusCode = 404;
  response.end('{}');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function hydrate() {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const child = spawn(python, [
    'scripts/hydrate-deployed-weather.py',
    '--base-url', baseUrl,
    '--root', root,
  ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

try {
  const failed = await hydrate();
  assert.notEqual(failed.code, 0, 'an atomic dataset mismatch must stop hydration');
  assert.match(failed.stdout, /"fatal": true/);
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'manifest.json'), 'utf8')).datasetId, 'local-safe');
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'conditions.json'), 'utf8')).datasetId, 'local-safe');

  mismatch = false;
  const succeeded = await hydrate();
  assert.equal(succeeded.code, 0, succeeded.stderr);
  assert.match(succeeded.stdout, /"fatal": false/);
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'manifest.json'), 'utf8')).datasetId, 'remote-new');
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'conditions.json'), 'utf8')).datasetId, 'remote-new');
  console.log('OK: atomisk hydration stopper ved fejl og opdaterer kun et komplet matchende datasæt.');
} finally {
  server.close();
  await fs.rm(root, { recursive: true, force: true });
}
