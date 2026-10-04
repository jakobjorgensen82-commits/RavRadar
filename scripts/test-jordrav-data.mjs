import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { MANIFEST_SHA256, MODEL_VERSION } from '../js/jordrav/dataset-binding.js';
import { validateManifest, intersects } from '../js/jordrav/data-service.js';
import '../js/jordrav/messages.js';
import { messageKeys } from '../js/jordrav/messages.js';
const appVersion=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8')).version;
const { hasTranslation }=await import(`../js/i18n.js?v=${appVersion}`);

const base = new URL('../data/jordrav/prototype-0.1.0/', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
test('all static geometry, explanations and rules bind to one verified manifest', async () => {
  const bytes = await fs.readFile(new URL('manifest.json', base));
  assert.equal(sha(bytes), MANIFEST_SHA256);
  const manifest = validateManifest(JSON.parse(bytes));
  const buildAudit = JSON.parse(await fs.readFile(new URL('../docs/research/jordrav/prototype-build-audit.json', import.meta.url)));
  for (const [file, expected] of [
    ['scripts/build-jordrav-prototype.py', buildAudit.scriptSha256],
    ['scripts/lib/jordrav_model.py', buildAudit.modelCodeSha256],
    ['data/jordrav/model-rules.json', buildAudit.rulesSha256]
  ]) assert.equal(sha(await fs.readFile(new URL(`../${file}`, import.meta.url))), expected, `${file} producer identity`);
  const catalogBytes = gunzipSync(await fs.readFile(new URL(manifest.catalog.file, base)));
  const catalog = JSON.parse(catalogBytes).entries;
  const classes = new Set();
  for (const entry of [manifest.overview, manifest.catalog, manifest.rules, ...manifest.tiles]) {
    const compressed = await fs.readFile(new URL(entry.file, base));
    assert.equal(sha(compressed), entry.sha256, entry.file);
    assert.equal(compressed.length, entry.bytes, entry.file);
    const decoded = entry.file.endsWith('.gz') ? gunzipSync(compressed) : compressed;
    assert.equal(decoded.length, entry.decodedBytes, entry.file);
    const data = JSON.parse(decoded);
    assert.equal(data.modelVersion, MODEL_VERSION);
    if (entry.file === manifest.rules.file) assert.deepEqual(data,
      JSON.parse(await fs.readFile(new URL('../data/jordrav/model-rules.json', import.meta.url))), 'Source and packaged rules differ');
    if (entry.file.startsWith('tile-')) assert.equal(data.features.length, entry.features, `${entry.file} feature count`);
    for (const feature of data.features || []) {
      assert.ok(['Polygon', 'MultiPolygon'].includes(feature.geometry.type));
      if (entry.file.startsWith('tile-')) {
        const explanation = catalog[feature.properties.i];
        assert.ok(explanation, `${entry.file} explanation`);
        assert.equal(explanation.confidence, 'weak');
        classes.add(explanation.potential);
        assert.ok(typeof feature.properties.o === 'string');
      }
    }
  }
  assert.deepEqual([...classes].sort(), ['enhanced','limited','possible','unresolved']);
  const injected = structuredClone(manifest);
  injected.tiles[0].file='../secret.json';
  assert.throws(() => validateManifest(injected));
  const mixed = structuredClone(manifest);
  mixed.modelVersion='different';
  assert.throws(() => validateManifest(mixed));
});
test('national detail data cannot be imported or precached by the coastal view', async () => {
  const bootstrap = await fs.readFile(new URL('../bootstrap.js', import.meta.url),'utf8');
  const worker = await fs.readFile(new URL('../service-worker.js', import.meta.url),'utf8');
  const inland = await fs.readFile(new URL('../js/jordrav/map.js', import.meta.url),'utf8');
  const html = await fs.readFile(new URL('../jordrav.html', import.meta.url),'utf8');
  assert.doesNotMatch(bootstrap, /jordrav\/(?:map|data-service|dataset-binding)/);
  assert.doesNotMatch(worker, /data\/jordrav/);
  assert.doesNotMatch(inland, /Supabase|supabase|dmi|data\/live|data-service\.js\?v=/);
  assert.match(html, /connect-src 'self';/);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.ok(intersects([9,55,10,56],[10,56,11,57]));
  assert.ok(!intersects([9,55,10,56],[11,55,12,56]));
});
test('all geological user messages exist in Danish, German and English', () => {
  for (const lang of ['da','de','en']) for (const key of messageKeys) assert.ok(hasTranslation(`jordrav.${key}`,lang), `${lang}/${key}`);
});
