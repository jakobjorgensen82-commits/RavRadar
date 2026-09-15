const ARCHIVE_SCHEMA_VERSION = 1;

function decodeBase64(value) {
  if (typeof value !== 'string' || !value) throw new Error('Runtime-arkivet mangler komprimerede data.');
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', value);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function gunzip(value) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('Browseren understøtter ikke sikker udpakning af runtime-diagnostik.');
  }
  const stream = new Blob([value]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function hasProtectedRuntimeArchive(payload) {
  return Boolean(payload?.protectedRuntimeArchive);
}

export async function decodeRuntimeDiagnosticsEnvelope(payload) {
  if (!hasProtectedRuntimeArchive(payload)) return payload;

  const archive = payload.protectedRuntimeArchive;
  if (archive.schemaVersion !== ARCHIVE_SCHEMA_VERSION || archive.encoding !== 'gzip-base64' || archive.mediaType !== 'application/json') {
    throw new Error('Runtime-arkivet bruger et ukendt format.');
  }

  const compressed = decodeBase64(archive.data);
  if (compressed.byteLength !== archive.compressedBytes) {
    throw new Error('Runtime-arkivets komprimerede størrelse stemmer ikke.');
  }

  const raw = await gunzip(compressed);
  if (raw.byteLength !== archive.uncompressedBytes) {
    throw new Error('Runtime-arkivets udpakkede størrelse stemmer ikke.');
  }
  if (await sha256(raw) !== archive.sha256) {
    throw new Error('Runtime-arkivets digitale fingeraftryk stemmer ikke.');
  }

  let decoded;
  try {
    decoded = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new Error('Runtime-arkivet indeholder ikke gyldig JSON.');
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new Error('Runtime-arkivet indeholder ikke et diagnostikobjekt.');
  }
  if (payload.generatedAt && decoded.generatedAt !== payload.generatedAt) {
    throw new Error('Runtime-arkivets tidspunkt stemmer ikke med oversigten.');
  }
  if (payload.version && decoded.version !== payload.version) {
    throw new Error('Runtime-arkivets version stemmer ikke med oversigten.');
  }
  return decoded;
}
