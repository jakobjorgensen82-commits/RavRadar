import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const RUNTIME_DIAGNOSTICS_ARCHIVE_SCHEMA_VERSION = 1;

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

export function buildRuntimeDiagnosticsEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Runtime-diagnostikken skal være et JSON-objekt');
  }

  const raw = Buffer.from(JSON.stringify(payload), 'utf8');
  const compressed = zlib.gzipSync(raw, { level: 9, mtime: 0 });
  const summary = {
    schemaVersion: payload.schemaVersion ?? null,
    generatedAt: payload.generatedAt ?? null,
    version: payload.version ?? null,
    componentCoverage: payload.componentCoverage ?? null,
    protectedRuntimeArchive: {
      schemaVersion: RUNTIME_DIAGNOSTICS_ARCHIVE_SCHEMA_VERSION,
      encoding: 'gzip-base64',
      mediaType: 'application/json',
      sha256: sha256(raw),
      uncompressedBytes: raw.length,
      compressedBytes: compressed.length,
      data: compressed.toString('base64')
    }
  };

  return {
    payload: summary,
    originalBytes: raw.length,
    storedBytes: Buffer.byteLength(JSON.stringify(summary), 'utf8')
  };
}
