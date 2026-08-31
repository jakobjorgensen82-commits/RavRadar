import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const CANDIDATE_MODEL = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-legacy-bootstrap-contract-'));
const live = path.join(root, 'data', 'live');
await fs.mkdir(live, { recursive: true });
const zoneIds = Array.from({ length: 210 }, (_, index) => `zone-${index}`);
await fs.writeFile(path.join(root, 'data', 'zones.geojson'), JSON.stringify({
  type: 'FeatureCollection',
  features: zoneIds.map(id => ({ type: 'Feature', properties: { id }, geometry: null })),
}));

const localManifest = { datasetId: 'local-safe', generatedAt: '2026-08-24T12:00:00.000Z' };
const localConditions = {
  datasetId: 'local-safe',
  generatedAt: '2026-08-24T12:00:00.000Z',
  zones: Object.fromEntries(zoneIds.map(id => [id, {}])),
};
await fs.writeFile(path.join(live, 'manifest.json'), JSON.stringify(localManifest));
await fs.writeFile(path.join(live, 'conditions.json'), JSON.stringify(localConditions));

const candidatePartIds = Array.from({ length: 673 }, (_, index) => `part-${index}`);
const candidateParts = Object.fromEntries(candidatePartIds.map(partId => [
  partId,
  {
    candidateG: {
      currentState: {
        schemaVersion: '2.0.0',
        modelId: CANDIDATE_MODEL,
      },
    },
  },
]));
const activeRegistryPath = path.join(live, 'coastal-parts-v2.json');
const sourceRegistryPath = path.join(
  root, '.cache', 'ravscore-legacy-candidate-g-source', 'coastal-parts-v2.json',
);
const activeRegistrySentinel = '{"active-registry":"must-not-change"}\n';
await fs.writeFile(activeRegistryPath, activeRegistrySentinel);

let mismatch = true;
let integratedManifest = false;
let invalidRegistryPartSet = false;
let invalidRegistryZoneSet = false;
let invalidManifestPath = false;
let invalidManifestHash = false;
let invalidManifestBytes = false;

function registryDocument() {
  const registryZoneIds = invalidRegistryZoneSet
    ? [...zoneIds.slice(0, -1), 'zone-not-in-conditions']
    : zoneIds;
  const registryPartIds = [...candidatePartIds];
  if (invalidRegistryPartSet) registryPartIds[registryPartIds.length - 1] = 'part-not-in-conditions';
  const zones = Object.fromEntries(registryZoneIds.map(id => [id, []]));
  registryPartIds.forEach((partId, index) => {
    zones[registryZoneIds[index % registryZoneIds.length]].push({ partId });
  });
  return {
    schemaVersion: 2,
    enabled: true,
    partCount: 673,
    zoneCount: 210,
    zones,
  };
}

function registryPayload() {
  return Buffer.from(JSON.stringify(registryDocument()));
}

const server = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/data/live/manifest.json') {
    const coastalParts = registryPayload();
    response.end(JSON.stringify(integratedManifest ? {
      schemaVersion: 4,
      datasetId: 'remote-integrated',
      generatedAt: '2026-08-24T13:00:00.000Z',
      complete: true,
    } : {
      schemaVersion: 2,
      datasetId: 'remote-new',
      generatedAt: '2026-08-24T13:00:00.000Z',
      fullConditionsPath: './conditions.json',
      coastalPartsPath: invalidManifestPath ? '../coastal-parts-v2.json' : './coastal-parts-v2.json',
      coastalPartsSha256: invalidManifestHash
        ? '0'.repeat(64)
        : crypto.createHash('sha256').update(coastalParts).digest('hex'),
      coastalPartsBytes: coastalParts.length + (invalidManifestBytes ? 1 : 0),
    }));
    return;
  }
  if (request.url === '/data/live/coastal-parts-v2.json') {
    response.end(registryPayload());
    return;
  }
  if (request.url === '/data/live/conditions.json') {
    response.end(JSON.stringify({
      datasetId: mismatch ? 'remote-mismatch' : 'remote-new',
      generatedAt: '2026-08-24T13:00:00.000Z',
      productionReferenceAt: '2026-08-24T13:00:00.000Z',
      zones: Object.fromEntries(zoneIds.map(id => [id, {}])),
      coastalParts: {
        scoreProfile: { activeProfileId: CANDIDATE_MODEL },
        parts: candidateParts,
      },
    }));
    return;
  }
  if ([
    '/data/live/dmi-forecast-cache.json',
    '/data/live/dmi-bulk-cache.json',
    '/data/live/current-pilot-history.json',
  ].includes(request.url)) {
    response.end(JSON.stringify({ schemaVersion: 1, generatedAt: '2026-08-24T13:00:00.000Z', zones: {} }));
    return;
  }
  response.statusCode = 404;
  response.end('{}');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function hydrate({ allowLegacy = true } = {}) {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const args = [
    'scripts/hydrate-deployed-weather.py',
    '--base-url', baseUrl,
    '--root', root,
  ];
  if (allowLegacy) args.push('--legacy-candidate-g-bootstrap');
  const child = spawn(python, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const [code] = await once(child, 'close');
  return { code, stdout, stderr };
}

try {
  const retiredDefault = await hydrate({ allowLegacy: false });
  assert.notEqual(retiredDefault.code, 0);
  assert.match(retiredDefault.stdout, /generic-public-private-runtime-hydration-retired/);

  const failed = await hydrate();
  assert.notEqual(failed.code, 0, 'an atomic dataset mismatch must stop the one-time import');
  assert.match(failed.stdout, /"fatal": true/);
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'manifest.json'), 'utf8')).datasetId, 'local-safe');
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'conditions.json'), 'utf8')).datasetId, 'local-safe');
  await assert.rejects(fs.access(sourceRegistryPath));
  assert.equal(await fs.readFile(activeRegistryPath, 'utf8'), activeRegistrySentinel);

  mismatch = false;
  const succeeded = await hydrate();
  assert.equal(succeeded.code, 0, succeeded.stderr);
  assert.match(succeeded.stdout, /"fatal": false/);
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'manifest.json'), 'utf8')).datasetId, 'remote-new');
  assert.equal(JSON.parse(await fs.readFile(path.join(live, 'conditions.json'), 'utf8')).datasetId, 'remote-new');
  assert.deepEqual(await fs.readFile(sourceRegistryPath), registryPayload());
  assert.equal(await fs.readFile(activeRegistryPath, 'utf8'), activeRegistrySentinel);
  assert.ok(JSON.parse(succeeded.stdout).hydrated.includes(
    '.cache/ravscore-legacy-candidate-g-source/coastal-parts-v2.json',
  ));

  const exactSourceRegistry = await fs.readFile(sourceRegistryPath);
  for (const [name, activate, deactivate] of [
    ['path', () => { invalidManifestPath = true; }, () => { invalidManifestPath = false; }],
    ['hash', () => { invalidManifestHash = true; }, () => { invalidManifestHash = false; }],
    ['bytes', () => { invalidManifestBytes = true; }, () => { invalidManifestBytes = false; }],
    ['part-set', () => { invalidRegistryPartSet = true; }, () => { invalidRegistryPartSet = false; }],
    ['zone-set', () => { invalidRegistryZoneSet = true; }, () => { invalidRegistryZoneSet = false; }],
  ]) {
    activate();
    const rejected = await hydrate();
    deactivate();
    assert.notEqual(rejected.code, 0, `${name} mismatch must reject the atomic source unit`);
    assert.match(rejected.stdout, /"fatal": true/);
    assert.deepEqual(await fs.readFile(sourceRegistryPath), exactSourceRegistry);
    assert.equal(await fs.readFile(activeRegistryPath, 'utf8'), activeRegistrySentinel);
    assert.equal(JSON.parse(await fs.readFile(path.join(live, 'manifest.json'), 'utf8')).datasetId, 'remote-new');
    assert.equal(JSON.parse(await fs.readFile(path.join(live, 'conditions.json'), 'utf8')).datasetId, 'remote-new');
  }

  integratedManifest = true;
  const secondImport = await hydrate();
  assert.notEqual(secondImport.code, 0, 'an integrated public manifest must permanently close legacy import');
  assert.match(secondImport.stdout, /"fatal": true/);
  console.log('One-time Candidate G bootstrap is atomic and refuses mismatch, default use and integrated re-import.');
} finally {
  server.close();
  await fs.rm(root, { recursive: true, force: true });
}
