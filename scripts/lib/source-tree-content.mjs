import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const MAX_GIT_OUTPUT_BYTES = 512 * 1024 * 1024;
const SHA256_PREFIX = 'sha256:';

function gitBuffer(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'buffer',
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
}

function parseTree(raw) {
  const entries = [];
  for (const item of raw.subarray(0, raw.length - (raw.at(-1) === 0 ? 1 : 0)).toString('utf8').split('\0')) {
    if (!item) continue;
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40,64})\t([\s\S]+)$/.exec(item);
    if (!match) throw new Error('Tracked Git tree entry is malformed');
    entries.push({ mode: match[1], type: match[2], oid: match[3], path: match[4] });
  }
  if (!entries.length) throw new Error('Tracked Git tree is empty');
  return entries;
}

function batchBlobSha256(oids, git = gitBuffer) {
  const unique = [...new Set(oids)].sort();
  if (!unique.length) return new Map();
  const output = git(['cat-file', '--batch'], {
    input: Buffer.from(`${unique.join('\n')}\n`, 'ascii'),
  });
  const hashes = new Map();
  let offset = 0;
  for (const expectedOid of unique) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) throw new Error('Git blob batch header is truncated');
    const header = output.subarray(offset, headerEnd).toString('ascii');
    const match = /^([a-f0-9]{40,64}) blob (\d+)$/.exec(header);
    if (!match || match[1] !== expectedOid) throw new Error('Git blob batch identity differs');
    const size = Number(match[2]);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error('Git blob size is invalid');
    const start = headerEnd + 1;
    const end = start + size;
    if (end >= output.length || output[end] !== 0x0a) throw new Error('Git blob batch payload is truncated');
    hashes.set(expectedOid, crypto.createHash('sha256').update(output.subarray(start, end)).digest('hex'));
    offset = end + 1;
  }
  if (offset !== output.length) throw new Error('Git blob batch has trailing bytes');
  return hashes;
}

export function sourceTreeContentSha256(ref = 'HEAD', { git = gitBuffer } = {}) {
  const entries = parseTree(git(['ls-tree', '-rz', '--full-tree', ref]));
  const blobHashes = batchBlobSha256(
    entries.filter(entry => entry.type === 'blob').map(entry => entry.oid),
    git,
  );
  const digest = crypto.createHash('sha256');
  digest.update('ravradar-source-tree-content-v1\0', 'utf8');
  for (const entry of entries) {
    digest.update(entry.mode, 'ascii');
    digest.update('\0');
    digest.update(entry.type, 'ascii');
    digest.update('\0');
    digest.update(entry.path, 'utf8');
    digest.update('\0');
    digest.update(
      entry.type === 'blob' ? blobHashes.get(entry.oid) : entry.oid,
      'ascii',
    );
    digest.update('\n');
  }
  return SHA256_PREFIX + digest.digest('hex');
}

export function sourceTreeProofArtifactName({ pullRequestNumber, headSha, sourceTreeSha256 }) {
  const digest = String(sourceTreeSha256 || '').replace(/^sha256:/, '');
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1
      || !/^[a-f0-9]{40}$/.test(headSha || '') || !/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error('Source tree proof artifact identity is invalid');
  }
  return `ravradar-source-validation-v2-pr-${pullRequestNumber}-${headSha}-${digest}`;
}
