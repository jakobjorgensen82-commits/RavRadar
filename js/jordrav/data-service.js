import { DATA_BASE, MANIFEST_SHA256, MODEL_VERSION } from './dataset-binding.js?v=4.0.559';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DECODED_BYTES = 80 * 1024 * 1024;
export async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}
export function intersects(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
export function geometryBounds(geometry) {
  if (!['Polygon','MultiPolygon'].includes(geometry?.type)) throw new Error('Invalid jordrav geometry');
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  const stack=[geometry.coordinates];
  while(stack.length) {
    const value=stack.pop();
    if(Array.isArray(value?.[0])) {for(const child of value)stack.push(child);}
    else {
      if(!Array.isArray(value)||value.length<2||!value.slice(0,2).every(Number.isFinite))throw new Error('Invalid jordrav coordinate');
      bounds[0]=Math.min(bounds[0],value[0]);bounds[1]=Math.min(bounds[1],value[1]);
      bounds[2]=Math.max(bounds[2],value[0]);bounds[3]=Math.max(bounds[3],value[1]);
    }
  }
  return bounds;
}
export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || manifest.modelVersion !== MODEL_VERSION ||
      !Array.isArray(manifest.tiles) || !manifest.tiles.length || manifest.tiles.length > 600 ||
      manifest.detailZoom !== 11 || manifest.maxVisibleTiles !== 12 || manifest.maxTileCache !== 18) {
    throw new Error('Invalid jordrav manifest');
  }
  const files = [manifest.overview, manifest.catalog, manifest.rules, ...manifest.tiles];
  const names = new Set();
  for (const entry of files) {
    if (!/^(?:overview\.geojson\.gz|catalog\.json\.gz|rules\.json|tile-\d+-\d+\.geojson\.gz)$/.test(entry?.file || '') ||
        !/^[a-f0-9]{64}$/.test(entry.sha256 || '') || names.has(entry.file) ||
        !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_FILE_BYTES ||
        !Number.isSafeInteger(entry.decodedBytes) || entry.decodedBytes < 1 || entry.decodedBytes > MAX_DECODED_BYTES) {
      throw new Error('Invalid jordrav file binding');
    }
    names.add(entry.file);
  }
  if (manifest.overview.file !== 'overview.geojson.gz' || manifest.catalog.file !== 'catalog.json.gz' || manifest.rules.file !== 'rules.json') throw new Error('Invalid jordrav roles');
  for (const tile of manifest.tiles) {
    if (!Array.isArray(tile.bbox) || tile.bbox.length !== 4 || !tile.bbox.every(Number.isFinite) ||
        tile.bbox[0] >= tile.bbox[2] || tile.bbox[1] >= tile.bbox[3] ||
        !Number.isSafeInteger(tile.features) || tile.features < 1) throw new Error('Invalid tile extent');
  }
  return manifest;
}

async function readBoundJson(entry, signal) {
  const url = new URL(entry.file, DATA_BASE);
  url.searchParams.set('sha', entry.sha256);
  const response = await fetch(url, { signal, cache: 'force-cache' });
  if (!response.ok) throw new Error(`Jordrav file HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== entry.bytes || await sha256(bytes) !== entry.sha256) throw new Error('Jordrav content identity mismatch');
  let decoded = bytes;
  const header = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (header[0] === 0x1f && header[1] === 0x8b) {
    if (typeof DecompressionStream !== 'function') throw new Error('Gzip decompression unavailable');
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > entry.decodedBytes || length > MAX_DECODED_BYTES) throw new Error('Jordrav decoded length exceeded');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const merged = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    decoded = merged.buffer;
  }
  if (decoded.byteLength !== entry.decodedBytes) throw new Error('Jordrav decoded length mismatch');
  const value = JSON.parse(new TextDecoder().decode(decoded));
  if (value.modelVersion !== MODEL_VERSION) throw new Error('Jordrav model mismatch');
  return value;
}

export async function openDataset() {
  const url = new URL('manifest.json', DATA_BASE);
  url.searchParams.set('sha', MANIFEST_SHA256);
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Jordrav manifest unavailable');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 200000 || await sha256(bytes) !== MANIFEST_SHA256) throw new Error('Jordrav manifest identity mismatch');
  const manifest = validateManifest(JSON.parse(new TextDecoder().decode(bytes)));
  const [overview, catalog, rules] = await Promise.all([
    readBoundJson(manifest.overview), readBoundJson(manifest.catalog), readBoundJson(manifest.rules)
  ]);
  if (overview.type !== 'FeatureCollection' || !Array.isArray(overview.features) || !Array.isArray(catalog.entries)) throw new Error('Invalid jordrav dataset');
  const cache = new Map();
  return {
    manifest, overview, catalog: catalog.entries, rules,
    async tile(entry, signal) {
      if (cache.has(entry.id)) {
        const cached = cache.get(entry.id);
        cache.delete(entry.id); cache.set(entry.id, cached);
        return cached.data;
      }
      const value = await readBoundJson(entry, signal);
      if (value.type !== 'FeatureCollection' || !Array.isArray(value.features) || value.features.length !== entry.features ||
          value.features.some(feature => !Number.isSafeInteger(feature.properties?.i) || !catalog.entries[feature.properties.i])) throw new Error('Invalid jordrav tile');
      for(const feature of value.features) feature.bbox=geometryBounds(feature.geometry);
      cache.set(entry.id, {data:value,size:entry.decodedBytes});
      while (cache.size > manifest.maxTileCache || [...cache.values()].reduce((sum,item)=>sum+item.size,0)>24*1024*1024) cache.delete(cache.keys().next().value);
      return value;
    }
  };
}
