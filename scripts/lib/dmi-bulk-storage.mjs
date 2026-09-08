import fs from 'node:fs/promises';
import path from 'node:path';

export const DMI_BULK_STORAGE_SCHEMA = 'dmi-bulk-source-dictionary-v1';
export const DMI_BULK_MAX_STORED_BYTES = 256 * 1024 * 1024;
export const DMI_BULK_MAX_LEGACY_BYTES = 1536 * 1024 * 1024;
const MAX_SOURCE_RECORDS = 2_000_000;
const MAX_CONTAINER_NODES = 50_000_000;
const MAX_DEPTH = 64;
const GROUPS = Object.freeze(['asset', 'spatial', 'semantics']);
const REFERENCE_KEY = '$dmiSource';
const ASSET_FIELDS = new Set([
  'collection', 'modelRun', 'itemId', 'assetIdentitySha256', 'assetSizeBytes',
  'acquiredAt', 'contentLengthBytes', 'contentSha256', 'itemCreatedAt',
  'itemUpdatedAt', 'nativeValidTime',
]);
const SPATIAL_FIELDS = new Set([
  'gridPoint', 'gridDefinitionSha256', 'distanceKm', 'samplingPoint',
  'samplingPointSha256', 'samplingIdentitySha256', 'sourceRegistrySha256',
  'coastalPartId', 'partId', 'zoneId', 'entityId', 'entityType', 'parentZoneId',
  'samplingContext', 'physicalPointSha256', 'verticalLayer', 'verticalLayerRankM',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isObject(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function sourceContainers(document) {
  if (!isObject(document) || !isObject(document.zones)) {
    throw new Error('DMI bulk document has no zones object');
  }
  const result = [];
  for (const zone of Object.values(document.zones)) {
    if (!isObject(zone)) continue;
    const rows = isObject(zone.hourly)
      ? Object.values(zone.hourly) : Array.isArray(zone.hourly) ? zone.hourly : [];
    for (const row of rows) {
      if (isObject(row) && isObject(row.sources)) result.push(row.sources);
    }
  }
  return result;
}

function partition(source) {
  if (Object.hasOwn(source, REFERENCE_KEY)) {
    throw new Error('DMI source collides with reserved storage reference');
  }
  const entries = Object.fromEntries(GROUPS.map(group => [group, []]));
  for (const entry of Object.entries(source)) {
    const group = ASSET_FIELDS.has(entry[0]) ? 'asset' : SPATIAL_FIELDS.has(entry[0]) ? 'spatial' : 'semantics';
    entries[group].push(entry);
  }
  return Object.fromEntries(GROUPS.map(group => [group, Object.fromEntries(entries[group])]));
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function boundedTree(root) {
  const stack = [[root, 0]];
  let nodes = 0;
  let references = 0;
  while (stack.length) {
    const [value, depth] = stack.pop();
    nodes += 1;
    if (nodes > MAX_CONTAINER_NODES || depth > MAX_DEPTH) {
      throw new Error('DMI storage structure bound exceeded');
    }
    if (isObject(value)) {
      if (Object.hasOwn(value, REFERENCE_KEY)) references += 1;
      for (const child of Object.values(value)) stack.push([child, depth + 1]);
    } else if (Array.isArray(value)) {
      for (const child of value) stack.push([child, depth + 1]);
    }
  }
  return references;
}

function validateTables(tables) {
  if (!exactKeys(tables, GROUPS)) throw new Error('DMI source table shape is invalid');
  for (const group of GROUPS) {
    if (!Array.isArray(tables[group]) || tables[group].length > MAX_SOURCE_RECORDS) {
      throw new Error('DMI source table bound is invalid');
    }
    for (const row of tables[group]) {
      if (!isObject(row) || Object.hasOwn(row, REFERENCE_KEY)) {
        throw new Error('DMI source table row is invalid');
      }
      const keys = Object.keys(row);
      if ((group === 'asset' && keys.some(key => !ASSET_FIELDS.has(key)))
        || (group === 'spatial' && keys.some(key => !SPATIAL_FIELDS.has(key)))
        || (group === 'semantics' && keys.some(key => ASSET_FIELDS.has(key) || SPATIAL_FIELDS.has(key)))) {
        throw new Error('DMI source table partition is invalid');
      }
    }
  }
  return tables;
}

function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value));
}

export function decodeDmiBulkWrapper(wrapper, { storedBytes = 0, expandSources = true } = {}) {
  if (!exactKeys(wrapper, ['storageSchema', 'sourceTables', 'document'])
    || wrapper.storageSchema !== DMI_BULK_STORAGE_SCHEMA) {
    throw new Error('DMI storage wrapper identity is invalid');
  }
  const referencesInTree = boundedTree(wrapper.document);
  if (boundedTree(wrapper.sourceTables) !== 0) {
    throw new Error('DMI source table contains a storage reference');
  }
  const tables = validateTables(wrapper.sourceTables);
  const tableBytes = Object.fromEntries(GROUPS.map(group => [
    group, tables[group].map(jsonBytes),
  ]));
  let count = 0;
  let logicalUpperBound = Math.max(0, storedBytes);
  for (const sources of sourceContainers(wrapper.document)) {
    for (const component of Object.keys(sources)) {
      const reference = sources[component];
      if (!isObject(reference) || !exactKeys(reference, [REFERENCE_KEY])) {
        if (isObject(reference)) throw new Error('DMI encoded source reference is invalid');
        continue;
      }
      const indices = reference[REFERENCE_KEY];
      if (!Array.isArray(indices) || indices.length !== GROUPS.length) {
        throw new Error('DMI encoded source tuple is invalid');
      }
      const keys = new Set();
      let bodyBytes = 0;
      let nonemptyGroups = 0;
      for (let offset = 0; offset < GROUPS.length; offset += 1) {
        const group = GROUPS[offset];
        const index = indices[offset];
        if (!Number.isSafeInteger(index) || index < 0 || index >= tables[group].length) {
          throw new Error('DMI encoded source index is invalid');
        }
        const row = tables[group][index];
        for (const key of Object.keys(row)) {
          if (keys.has(key)) throw new Error('DMI encoded source fields overlap');
          keys.add(key);
        }
        const bytes = tableBytes[group][index];
        if (bytes > 2) { bodyBytes += bytes - 2; nonemptyGroups += 1; }
      }
      const mergedBytes = 2 + bodyBytes + Math.max(0, nonemptyGroups - 1);
      logicalUpperBound += Math.max(0, mergedBytes - jsonBytes(reference));
      if (logicalUpperBound > DMI_BULK_MAX_LEGACY_BYTES) {
        throw new Error('DMI decoded document exceeds its logical bound');
      }
      count += 1;
      if (count > MAX_SOURCE_RECORDS) throw new Error('DMI source record bound exceeded');
    }
  }
  if (count !== referencesInTree) {
    throw new Error('DMI source reference appeared outside an hourly source container');
  }
  if (expandSources) {
    for (const group of GROUPS) {
      for (const row of tables[group]) deepFreeze(row);
      Object.freeze(tables[group]);
    }
    Object.freeze(tables);
    for (const sources of sourceContainers(wrapper.document)) {
      for (const component of Object.keys(sources)) {
        const reference = sources[component];
        if (!isObject(reference) || !exactKeys(reference, [REFERENCE_KEY])) continue;
        const entries = GROUPS.flatMap((group, offset) => (
          Object.entries(tables[group][reference[REFERENCE_KEY][offset]])
        ));
        sources[component] = Object.freeze(Object.fromEntries(entries));
      }
    }
  }
  return wrapper.document;
}

export async function readDmiBulkDocument(file, { optional = false, expandSources = true } = {}) {
  const info = await fs.lstat(file).catch(error => {
    if (optional && error?.code === 'ENOENT') return null;
    throw error;
  });
  if (info === null) return null;
  if (!info.isFile() || info.isSymbolicLink() || info.size < 2 || info.size > DMI_BULK_MAX_LEGACY_BYTES) {
    throw new Error('DMI bulk input is not a bounded regular file');
  }
  if (info.size > 512 * 1024 * 1024) {
    throw new Error('Legacy DMI bulk input requires Python producer normalization before Node use');
  }
  let parsed;
  try { parsed = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { throw new Error('DMI bulk input cannot be parsed'); }
  if (!isObject(parsed)) throw new Error('DMI bulk input must be an object');
  if (Object.hasOwn(parsed, 'storageSchema')) {
    if (info.size > DMI_BULK_MAX_STORED_BYTES) {
      throw new Error('DMI encoded input exceeds its stored byte bound');
    }
    return decodeDmiBulkWrapper(parsed, { storedBytes: info.size, expandSources });
  }
  if (!isObject(parsed.zones)) throw new Error('DMI legacy bulk input has no zones object');
  return parsed;
}

function encodedView(document) {
  if (!isObject(document) || !isObject(document.zones)) {
    throw new Error('DMI bulk document has no zones object');
  }
  const tables = Object.fromEntries(GROUPS.map(group => [group, []]));
  const indexes = Object.fromEntries(GROUPS.map(group => [group, new Map()]));
  let count = 0;
  const zones = Object.fromEntries(Object.entries(document.zones).map(([zoneId, zone]) => {
    if (!isObject(zone)) return [zoneId, zone];
    const encodeRow = row => {
      if (!isObject(row) || !isObject(row.sources)) return row;
      const sources = Object.fromEntries(Object.entries(row.sources).map(([component, source]) => {
        if (!isObject(source)) return [component, source];
        const grouped = partition(source);
        const references = GROUPS.map(group => {
          const key = JSON.stringify(grouped[group]);
          let index = indexes[group].get(key);
          if (index === undefined) {
            index = tables[group].length;
            indexes[group].set(key, index);
            tables[group].push(grouped[group]);
          }
          return index;
        });
        count += 1;
        if (count > MAX_SOURCE_RECORDS) throw new Error('DMI source record bound exceeded');
        return [component, { [REFERENCE_KEY]: references }];
      }));
      return { ...row, sources };
    };
    const hourly = isObject(zone.hourly)
      ? Object.fromEntries(Object.entries(zone.hourly).map(([time, row]) => [time, encodeRow(row)]))
      : Array.isArray(zone.hourly) ? zone.hourly.map(encodeRow) : zone.hourly;
    return [zoneId, { ...zone, hourly }];
  }));
  const encodedDocument = { ...document, zones };
  return { storageSchema: DMI_BULK_STORAGE_SCHEMA, sourceTables: tables, document: encodedDocument };
}

export async function writeDmiBulkDocument(file, document) {
  const destination = path.resolve(file);
  const temporary = `${destination}.tmp`;
  const wrapper = encodedView(document);
  try {
    const bytes = Buffer.from(`${JSON.stringify(wrapper)}\n`, 'utf8');
    if (bytes.length > DMI_BULK_MAX_STORED_BYTES) {
      throw new Error('DMI encoded output exceeds its stored byte bound');
    }
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, destination);
    return bytes.length;
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}
