import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA =
  'ravscore-public-browser-closure-v1';
export const RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION =
  'multi-html-executable-surface-lexer-esm-closure-utf8-lf-static-cachebuster-v2';
export const RAVSCORE_PUBLIC_BROWSER_HTML_ENTRYPOINTS = Object.freeze([
  Object.freeze({ path: 'index.html', moduleScripts: Object.freeze(['bootstrap.js']) }),
  Object.freeze({ path: 'admin.html', moduleScripts: Object.freeze(['js/ui/admin-dashboard.js']) }),
]);
export const RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS = Object.freeze([
  'bootstrap.js',
  'service-worker.js',
  'js/ui/admin-dashboard.js',
]);
export const RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS = Object.freeze([
  'app.js',
  'bootstrap.js',
  'service-worker.js',
  'js/core/best-time-selector.js',
  'js/core/local-zone-score.js',
  'js/core/ravscore-candidate-g.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
  'js/core/ravscore-current-supply-memory.js',
  'js/core/ravscore-integrated.js',
  'js/core/ravscore-integrated-state-pipeline.js',
  'js/core/ravscore-profile-switch.js',
  'js/core/ravscore-public-model.js',
  'js/core/ravscore-regime-memory.js',
  'js/core/ravscore-wave-mobilisation-state.js',
  'js/services/rav-assistant.js',
  'js/services/trip-evidence-public-adapter.js',
  'js/ui/admin-active-ravscore.js',
  'js/ui/admin-dashboard.js',
]);
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const posix = value => value.split(path.sep).join('/');
const normalizedSource = value => String(value)
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');

function exactKeys(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

export function ravScorePublicEntrypointDescriptor(text, {
  expectedModuleScripts = ['bootstrap.js'],
} = {}) {
  const html = String(text);
  if (/<base\b/i.test(html)) {
    throw new Error('Public browser entrypoint may not redirect relative module resolution');
  }
  if (/\son[a-z0-9_-]+\s*=/i.test(html)
    || /(?:href|src|action)\s*=\s*["']\s*javascript:/i.test(html)
    || /<(?:iframe|object|embed)\b/i.test(html)
    || /\ssrcdoc\s*=/i.test(html)
    || /<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) {
    throw new Error('Public browser entrypoint contains an unmodeled executable surface');
  }
  const cspTag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(match => match[0])
    .find(tag => /\bhttp-equiv=(?:"Content-Security-Policy"|'Content-Security-Policy')/i.test(tag));
  const cspMatch = cspTag?.match(/\bcontent=(?:"([^"]*)"|'([^']*)')/i);
  const csp = cspMatch?.[1] ?? cspMatch?.[2] ?? null;
  const scriptDirective = csp?.split(';').map(value => value.trim())
    .find(value => value.startsWith('script-src ')) ?? null;
  if (scriptDirective !== "script-src 'self' https://unpkg.com"
    || /'unsafe-(?:inline|eval)'|\bnonce-|\bsha(?:256|384|512)-/i.test(scriptDirective)) {
    throw new Error('Public browser entrypoint lacks the sealed same-origin script policy');
  }
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].map(match => {
    const attributes = match[1];
    const body = match[2];
    const source = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? null;
    const type = attributes.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? null;
    if (source === null && body.trim()) {
      throw new Error('Public browser entrypoint contains inline executable code');
    }
    return Object.freeze({ source, type });
  });
  const moduleScripts = scripts.filter(item => item.type === 'module')
    .map(item => String(item.source ?? '').split(/[?#]/, 1)[0].replace(/^\.\//, ''));
  const localClassicScripts = scripts.filter(item => item.type !== 'module'
    && typeof item.source === 'string' && !/^https:\/\//.test(item.source))
    .map(item => item.source);
  const externalClassicScripts = scripts.filter(item => item.type !== 'module'
    && /^https:\/\//.test(String(item.source ?? ''))).map(item => item.source);
  if (!same(moduleScripts, expectedModuleScripts) || localClassicScripts.length !== 0
    || !same(externalClassicScripts, ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'])) {
    throw new Error('Public browser entrypoint does not load the exact bootstrap surface');
  }
  return Object.freeze({
    moduleScripts,
    externalClassicScripts,
    cspSha256: sha256(csp.replace(/\s+/g, ' ').trim()),
    inlineExecutableCount: 0,
    baseHref: null,
  });
}

async function regularFile(filePath) {
  try {
    const stat = await fs.lstat(filePath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch { return false; }
}

async function resolveImport(root, importer, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = path.resolve(path.dirname(path.join(root, importer)), clean);
  const candidates = path.extname(base)
    ? [base] : [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    const relative = posix(path.relative(root, candidate));
    if (relative.startsWith('../') || path.isAbsolute(relative)) {
      throw new Error(`Public browser import escapes repository: ${importer}`);
    }
    if (await regularFile(candidate)) return relative;
  }
  throw new Error(`Public browser import cannot be resolved: ${importer} -> ${clean}`);
}

export async function computeRavScorePublicBrowserClosure({
  root = ROOT,
  sourceOverrides = new Map(),
} = {}) {
  const readRaw = async relative => String(sourceOverrides.has(relative)
    ? sourceOverrides.get(relative) : await fs.readFile(path.join(root, relative), 'utf8'));
  const read = async relative => normalizedSource(await readRaw(relative));
  const htmlEntrypoints = Object.freeze(await Promise.all(
    RAVSCORE_PUBLIC_BROWSER_HTML_ENTRYPOINTS.map(async entrypoint => {
    const htmlRaw = await readRaw(entrypoint.path);
    return Object.freeze({
      path: entrypoint.path,
      sourceSha256: sha256(normalizedSource(htmlRaw)),
      executableSurface: ravScorePublicEntrypointDescriptor(htmlRaw, {
        expectedModuleScripts: entrypoint.moduleScripts,
      }),
    });
    }),
  ));
  const pending = [...new Set([
    ...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS,
    ...RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS,
  ])];
  const sources = new Map();
  while (pending.length) {
    const relative = pending.pop();
    if (sources.has(relative)) continue;
    const source = await read(relative);
    sources.set(relative, source);
    for (const specifier of exactRelativeModuleSpecifiers(source, relative)) {
      const imported = await resolveImport(root, relative, specifier);
      if (!sources.has(imported)) pending.push(imported);
    }
  }
  for (const required of RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS) {
    if (!sources.has(required)) {
      throw new Error(`Public browser closure omits required model consumer ${required}`);
    }
  }
  const files = [...sources.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, source]) => Object.freeze({ path: filePath, sha256: sha256(source) }));
  const manifest = Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA,
    normalizationId: RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION,
    htmlEntrypoints,
    executableEntrypoints: Object.freeze([...RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS]),
    files: Object.freeze(files),
  });
  return Object.freeze({
    manifest,
    publicBrowserClosureSha256: sha256(JSON.stringify(canonical(manifest))),
  });
}

export function assertRavScorePublicBrowserClosure(value) {
  if (!exactKeys(value, [
    'schemaVersion', 'normalizationId', 'htmlEntrypoints', 'executableEntrypoints', 'files',
  ])
    || value.schemaVersion !== RAVSCORE_PUBLIC_BROWSER_CLOSURE_SCHEMA
    || value.normalizationId !== RAVSCORE_PUBLIC_BROWSER_CLOSURE_NORMALIZATION
    || !Array.isArray(value.htmlEntrypoints)
    || value.htmlEntrypoints.length !== RAVSCORE_PUBLIC_BROWSER_HTML_ENTRYPOINTS.length
    || !same(value.executableEntrypoints, RAVSCORE_PUBLIC_BROWSER_EXECUTABLE_ENTRYPOINTS)
    || !Array.isArray(value.files)) {
    throw new Error('Sealed public browser closure has an incompatible exact contract');
  }
  for (let index = 0; index < RAVSCORE_PUBLIC_BROWSER_HTML_ENTRYPOINTS.length; index += 1) {
    const expected = RAVSCORE_PUBLIC_BROWSER_HTML_ENTRYPOINTS[index];
    const actual = value.htmlEntrypoints[index];
    if (!exactKeys(actual, ['path', 'sourceSha256', 'executableSurface'])
      || actual.path !== expected.path
      || !SHA256_PATTERN.test(String(actual.sourceSha256 ?? ''))
      || !exactKeys(actual.executableSurface, [
        'moduleScripts', 'externalClassicScripts', 'cspSha256', 'inlineExecutableCount', 'baseHref',
      ])
      || !same(actual.executableSurface.moduleScripts, expected.moduleScripts)
      || !same(actual.executableSurface.externalClassicScripts,
        ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'])
      || !SHA256_PATTERN.test(String(actual.executableSurface.cspSha256 ?? ''))
      || actual.executableSurface.inlineExecutableCount !== 0
      || actual.executableSurface.baseHref !== null) {
      throw new Error('Sealed public browser closure has an incompatible HTML entrypoint');
    }
  }
  const seen = new Set();
  for (const item of value.files) {
    if (!exactKeys(item, ['path', 'sha256'])
      || typeof item.path !== 'string'
      || !/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(item.path)
      || item.path.startsWith('../') || seen.has(item.path)
      || !SHA256_PATTERN.test(String(item.sha256 ?? ''))) {
      throw new Error('Sealed public browser closure contains an unsafe or duplicate file');
    }
    seen.add(item.path);
  }
  for (const required of RAVSCORE_PUBLIC_BROWSER_REQUIRED_MODEL_CONSUMERS) {
    if (!seen.has(required)) throw new Error(`Sealed public browser closure omits ${required}`);
  }
  return true;
}
