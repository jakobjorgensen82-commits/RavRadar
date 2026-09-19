import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  OPEN_METEO_PART_BANK_MAX_BYTES, OPEN_METEO_PART_RESPONSE_MAX_BYTES,
  buildOpenMeteoPartRequest, mergeOpenMeteoPartBank, openMeteoPartSha256,
  validateOpenMeteoPartBank,
} from './open-meteo-part-bank.mjs';
import { produceOpenMeteoPartComponents } from '../produce-open-meteo-part-components.mjs';

const failure = (code, retryable = false, retryAfterMs = 0) =>
  Object.assign(new Error(code), { code, retryable, retryAfterMs });
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
function privatePaths({ privateCacheRoot, bankPath }) {
  if (typeof privateCacheRoot !== 'string' || typeof bankPath !== 'string'
    || !path.isAbsolute(privateCacheRoot) || !path.isAbsolute(bankPath)) throw failure('OPEN_METEO_PRIVATE_PATH_REQUIRED');
  const root = path.resolve(privateCacheRoot);
  const file = path.resolve(bankPath);
  if (root === path.parse(root).root || !inside(root, file) || path.extname(file) !== '.json') {
    throw failure('OPEN_METEO_PRIVATE_PATH_INVALID');
  }
  return { root, file };
}
async function checkedParent({ root, file }, { create = false } = {}) {
  try {
    if (create) await fs.mkdir(root, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(root)).isSymbolicLink()) throw failure('OPEN_METEO_PRIVATE_ROOT_SYMLINK');
    let directory = root;
    for (const segment of path.relative(root, path.dirname(file)).split(path.sep).filter(Boolean)) {
      directory = path.join(directory, segment);
      try {
        if ((await fs.lstat(directory)).isSymbolicLink()) throw failure('OPEN_METEO_PRIVATE_PATH_ESCAPE');
      } catch (error) {
        if (!create || error.code !== 'ENOENT') throw error;
        await fs.mkdir(directory, { mode: 0o700 });
      }
    }
    const actualRoot = await fs.realpath(root);
    const actualParent = await fs.realpath(path.dirname(file));
    if (actualParent !== actualRoot && !inside(actualRoot, actualParent)) throw failure('OPEN_METEO_PRIVATE_PATH_ESCAPE');
    try {
      if ((await fs.lstat(file)).isSymbolicLink()) throw failure('OPEN_METEO_PRIVATE_BANK_SYMLINK');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return true;
  } catch (error) {
    if (!create && error.code === 'ENOENT') return false;
    throw error;
  }
}
async function readBankFile(paths, maximumBytes = OPEN_METEO_PART_BANK_MAX_BYTES) {
  if (!await checkedParent(paths)) return null;
  let handle;
  try {
    handle = await fs.open(paths.file, 'r');
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > maximumBytes) throw failure('OPEN_METEO_PRIVATE_BANK_SIZE_INVALID');
    const chunks = [];
    let size = 0;
    while (true) {
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maximumBytes - size + 1));
      const { bytesRead } = await handle.read(buffer);
      if (!bytesRead) break;
      size += bytesRead;
      if (size > maximumBytes) throw failure('OPEN_METEO_PRIVATE_BANK_SIZE_INVALID');
      chunks.push(buffer.subarray(0, bytesRead));
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { throw failure('OPEN_METEO_PRIVATE_BANK_PARSE_INVALID'); }
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  } finally { await handle?.close(); }
}
async function saveBankFile(paths, bank) {
  await checkedParent(paths, { create: true });
  const bytes = Buffer.from(JSON.stringify(bank));
  if (bytes.length > OPEN_METEO_PART_BANK_MAX_BYTES) throw failure('OPEN_METEO_PRIVATE_BANK_SIZE_INVALID');
  const temporary = `${paths.file}.tmp-${process.pid}-${randomUUID()}`;
  let handle;
  try {
    handle = await fs.open(temporary, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await fs.rename(temporary, paths.file);
    // fsync the containing directory where the platform supports it. Windows
    // does not expose the same directory-handle operation through node:fs.
    if (process.platform !== 'win32') {
      const directory = await fs.open(path.dirname(paths.file), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    }
  } finally {
    await handle?.close();
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

// This helper does not acquire weather or mutate a cache. The caller supplies
// current central PARTs and the whole private history+forecast retention span.
export async function loadOpenMeteoPartRuntime(options = {}) {
  const paths = privatePaths(options);
  const previous = await readBankFile(paths);
  const bank = mergeOpenMeteoPartBank(previous, [], options);
  return { bank, index: validateOpenMeteoPartBank(bank, options) };
}

function retryAfter(response, now) {
  const value = response.headers?.get('retry-after');
  if (!value) return 0;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? Math.max(0, instant - now()) : 0;
}
async function responseAttempt(url, { fetchImpl, timeoutMs, stats, now }) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      stats.timeouts += 1;
      controller.abort();
      reject(failure('OPEN_METEO_PART_REQUEST_TIMEOUT', true));
    }, timeoutMs);
  });
  const operation = (async () => {
    let response;
    try { response = await fetchImpl(url, { method: 'GET', redirect: 'error',
      headers: { accept: 'application/json' }, signal: controller.signal }); }
    catch { throw failure('OPEN_METEO_PART_NETWORK_UNAVAILABLE', true); }
    if (response.url && response.url !== url) throw failure('OPEN_METEO_PART_RESPONSE_URL_MISMATCH');
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw failure('OPEN_METEO_PART_HTTP_UNAVAILABLE', response.status === 429 || response.status >= 500,
        retryAfter(response, now));
    }
    const declaredSize = response.headers?.get('content-length');
    if (declaredSize !== null && declaredSize !== undefined && /^\d+$/.test(declaredSize)
      && Number(declaredSize) > OPEN_METEO_PART_RESPONSE_MAX_BYTES) throw failure('OPEN_METEO_PART_RESPONSE_TOO_LARGE');
    if (!response.body?.getReader) throw failure('OPEN_METEO_PART_RESPONSE_STREAM_REQUIRED');
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) throw failure('OPEN_METEO_PART_RESPONSE_BYTES_INVALID');
        bytes += value.byteLength;
        if (bytes > OPEN_METEO_PART_RESPONSE_MAX_BYTES) throw failure('OPEN_METEO_PART_RESPONSE_TOO_LARGE');
        chunks.push(Buffer.from(value));
      }
    } catch (error) {
      if (error.code?.startsWith('OPEN_METEO_')) throw error;
      throw failure('OPEN_METEO_PART_RESPONSE_INTERRUPTED', true);
    } finally { reader.releaseLock(); }
    stats.responseBytes += bytes;
    let responseText;
    // Preserve a BOM rather than silently stripping bytes from the evidence.
    // JSON admission may subsequently reject it, but its hash is never relabeled.
    try { responseText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(Buffer.concat(chunks)); }
    catch { throw failure('OPEN_METEO_PART_RESPONSE_ENCODING_INVALID'); }
    return { responseText, acquiredAt: new Date(now()).toISOString() };
  })();
  try { return await Promise.race([operation, timeout]); }
  finally { clearTimeout(timer); controller.abort(); }
}

// The production workflow owns single-writer serialization and private cache
// upload. This adapter never activates/deploys data or widens a spatial policy.
export async function runOpenMeteoPartRuntime({
  privateCacheRoot, bankPath, parts, productionReferenceAt, spatialPolicies,
  requiredPairs, retentionStartAt, retentionEndAt, budgetMs,
  requestTimeoutMs = 15_000, maxRetries = 2,
  fetchImpl = globalThis.fetch, now = Date.now,
} = {}) {
  if (!Number.isInteger(budgetMs) || budgetMs < 0 || !Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1
    || !Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 3 || typeof fetchImpl !== 'function'
    || typeof now !== 'function') throw failure('OPEN_METEO_PART_TRANSPORT_BUDGET_INVALID');
  const options = { privateCacheRoot, bankPath, parts, spatialPolicies, retentionStartAt, retentionEndAt };
  const paths = privatePaths(options);
  const cursorPaths = privatePaths({ privateCacheRoot,
    bankPath: path.join(privateCacheRoot, 'weather-component-fallback-cursor.json') });
  const deadline = performance.now() + budgetMs;
  const previous = await readBankFile(paths);
  const cursor = await readBankFile(cursorPaths, 64 * 1024);
  if (cursor !== null && (cursor.kind !== 'WEATHER_COMPONENT_FALLBACK_CURSOR' || cursor.schemaVersion !== 1
    || typeof cursor.openMeteoLastAttemptedPartId !== 'string' || !cursor.openMeteoLastAttemptedPartId)) {
    throw failure('OPEN_METEO_PART_CURSOR_INVALID');
  }
  const remaining = () => Math.max(0, Math.floor(deadline - performance.now()));
  const targets = new Map((parts ?? []).map(part => [part.partId, part]));
  const stats = { httpAttempts: 0, retries: 0, timeouts: 0, responseBytes: 0 };
  const fetchResponse = async request => {
    const partId = request.identity.entityId.replace(/^PART::/, '');
    const canonical = buildOpenMeteoPartRequest(targets.get(partId), request);
    if (openMeteoPartSha256(request) !== openMeteoPartSha256(canonical)) throw failure('OPEN_METEO_PART_TRANSPORT_REQUEST_INVALID');
    const url = `${canonical.endpoint}?${new URLSearchParams(canonical.query)}`;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (!remaining()) throw failure('OPEN_METEO_PART_RUNTIME_BUDGET_REACHED');
      stats.httpAttempts += 1;
      try { return await responseAttempt(url, { fetchImpl, timeoutMs: Math.min(requestTimeoutMs, remaining()), stats, now }); }
      catch (error) {
        if (!error.retryable || attempt === maxRetries) throw error;
        const delay = Math.max(250 * 2 ** attempt, error.retryAfterMs ?? 0);
        if (delay >= remaining()) throw failure('OPEN_METEO_PART_RUNTIME_BUDGET_REACHED');
        stats.retries += 1;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw failure('OPEN_METEO_PART_NETWORK_UNAVAILABLE');
  };
  const result = await produceOpenMeteoPartComponents({
    ...options, previousBank: previous, productionReferenceAt, requiredPairs,
    startAfterPartId: cursor?.openMeteoLastAttemptedPartId ?? null,
    shouldContinue: () => remaining() > 0, fetchResponse,
    // Builder already revalidates original evidence once and each admission.
    // Do not decode the entire growing bank again for every small checkpoint.
    checkpoint: bank => saveBankFile(paths, bank),
  });
  if (result.summary.lastAttemptedPartId !== null) {
    await saveBankFile(cursorPaths, { kind: 'WEATHER_COMPONENT_FALLBACK_CURSOR', schemaVersion: 1,
      openMeteoLastAttemptedPartId: result.summary.lastAttemptedPartId });
  }
  return { ...result, index: validateOpenMeteoPartBank(result.bank, options),
    summary: { ...result.summary, transport: stats } };
}
