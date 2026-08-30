import crypto from 'node:crypto';
import fs from 'node:fs/promises';

export const PROTECTED_RDKS_DOCUMENTS = Object.freeze([
  Object.freeze({
    id: 'current-truth',
    title: 'Gældende sandhed',
    description: 'Det aktuelle styringsgrundlag',
    sourcePath: 'docs/rdks/90_INDEX/CURRENT_TRUTH.md',
  }),
  Object.freeze({
    id: 'implementation-status',
    title: 'Implementeringsstatus',
    description: 'Hvad der er færdigt, delvist og planlagt',
    sourcePath: 'docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
  }),
  Object.freeze({
    id: 'active-requirements',
    title: 'Aktive krav',
    description: 'Bindende krav til kommende arbejde',
    sourcePath: 'docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md',
  }),
  Object.freeze({
    id: 'known-issues',
    title: 'Kendte problemer',
    description: 'Åbne og overvågede forhold',
    sourcePath: 'docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md',
  }),
  Object.freeze({
    id: 'master-log',
    title: 'Masterlog',
    description: 'Versions- og beslutningshistorik',
    sourcePath: 'docs/rdks/MASTER_LOG.md',
  }),
]);

const normalizeText = value => String(value).replace(/\r\n?/g, '\n');
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

export async function buildProtectedRdksDocumentation({
  readFile = fs.readFile,
  packagePath = 'package.json',
  documents = PROTECTED_RDKS_DOCUMENTS,
} = {}) {
  const packageDocument = JSON.parse(await readFile(packagePath, 'utf8'));
  const sourceVersion = String(packageDocument?.version ?? '');
  if (!/^\d+\.\d+\.\d+$/.test(sourceVersion)) {
    throw new Error('RDKS-dokumentationspakken mangler en gyldig releaseversion');
  }

  const seenIds = new Set();
  const payloadDocuments = [];
  for (const descriptor of documents) {
    if (!descriptor?.id || seenIds.has(descriptor.id)) {
      throw new Error(`RDKS-dokumentationspakken har et manglende eller dubleret id: ${descriptor?.id ?? 'ukendt'}`);
    }
    seenIds.add(descriptor.id);
    const content = normalizeText(await readFile(descriptor.sourcePath, 'utf8'));
    if (!content.trim()) {
      throw new Error(`RDKS-dokumentet er tomt: ${descriptor.sourcePath}`);
    }
    payloadDocuments.push({
      ...descriptor,
      contentType: 'text/markdown; charset=utf-8',
      bytes: Buffer.byteLength(content, 'utf8'),
      sha256: sha256(content),
      content,
    });
  }

  return {
    schemaVersion: 1,
    sourceVersion,
    documents: payloadDocuments,
  };
}
