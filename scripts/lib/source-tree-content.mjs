import fs from 'node:fs';
import path from 'node:path';
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

export function sourceTreeContentIdentity(ref = 'HEAD', { git = gitBuffer } = {}) {
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
  return Object.freeze({sha256:SHA256_PREFIX + digest.digest('hex'),
    files:Object.freeze(entries.map(entry=>Object.freeze({...entry,
      sha256:entry.type==='blob'?blobHashes.get(entry.oid):null})))});
}

export function sourceTreeContentSha256(ref = 'HEAD', options = {}) {
  return sourceTreeContentIdentity(ref,options).sha256;
}

// Only a physical CODE comparison against independently read committed Git
// facts. It grants no source/PG/private-runtime authority. Normal Source calls
// this exactly once BEFORE central hydration and any RavRadar private access.
export function assertSourceTreePhysicalIdentity(identity, root) {
  const started=performance.now();
  if(!identity || !Array.isArray(identity.files) || !identity.files.length
    || !/^sha256:[a-f0-9]{64}$/.test(identity.sha256 ?? '')
    || !path.isAbsolute(root) || fs.realpathSync(root)!==root) {
    throw new Error('SOURCE_PHYSICAL_CODE_INPUT');
  }
  let bytes=0;
  const parents=new Map();
  const same=(a,b)=>['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].every(key=>a[key]===b[key]);
  const parent=file=>{
    for(let at=path.dirname(file);;at=path.dirname(at)){
      if(parents.has(at))break;
      const stat=fs.lstatSync(at,{bigint:true});
      if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync(at)!==at)
        throw new Error('SOURCE_PHYSICAL_CODE_PARENT');
      parents.set(at,stat);
      if(at===root)break;
      if(at===path.dirname(at))throw new Error('SOURCE_PHYSICAL_CODE_ESCAPE');
    }
  };
  for(const row of identity.files) {
    const rel=row.path;
    if(row.type!=='blob'||row.mode!=='100644'||typeof rel!=='string'
      ||path.posix.normalize(rel)!==rel||rel.startsWith('/')||rel.includes('\\')
      ||rel.split('/').some(part=>part==='.'||part==='..')||/[\x00-\x1f\x7f]/.test(rel)
      ||!/^[a-f0-9]{64}$/.test(row.sha256??''))throw new Error('SOURCE_PHYSICAL_CODE_PATH');
    const file=path.resolve(root,rel);
    if(path.relative(root,file).startsWith('..')||path.isAbsolute(path.relative(root,file)))
      throw new Error('SOURCE_PHYSICAL_CODE_ESCAPE');
    parent(file);
    const named=fs.lstatSync(file,{bigint:true});
    if(!named.isFile()||named.isSymbolicLink()||named.nlink!==1n
      ||named.size<0n||named.size>BigInt(MAX_GIT_OUTPUT_BYTES)||fs.realpathSync(file)!==file)
      throw new Error('SOURCE_PHYSICAL_CODE_FILE');
    const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    try{
      const opened=fs.fstatSync(fd,{bigint:true});
      if(!same(opened,named))throw new Error('SOURCE_PHYSICAL_CODE_CHANGED');
      const digest=crypto.createHash('sha256'),buffer=Buffer.alloc(64*1024);
      let offset=0;
      while(offset<Number(opened.size)){
        const count=fs.readSync(fd,buffer,0,Math.min(buffer.length,Number(opened.size)-offset),offset);
        if(count<=0)throw new Error('SOURCE_PHYSICAL_CODE_TRUNCATED');
        digest.update(buffer.subarray(0,count));offset+=count;
      }
      if(fs.readSync(fd,buffer,0,1,offset)!==0||digest.digest('hex')!==row.sha256
        ||!same(opened,fs.fstatSync(fd,{bigint:true}))||!same(opened,fs.lstatSync(file,{bigint:true})))
        throw new Error('SOURCE_PHYSICAL_CODE_CHANGED');
      bytes+=offset;
    }finally{fs.closeSync(fd);}
  }
  for(const [file,before] of parents){
    const after=fs.lstatSync(file,{bigint:true});
    if(!after.isDirectory()||after.isSymbolicLink()||fs.realpathSync(file)!==file
      ||['dev','ino','mode','nlink'].some(key=>before[key]!==after[key]))
      throw new Error('SOURCE_PHYSICAL_CODE_PARENT_CHANGED');
  }
  return {files:identity.files.length,bytes,elapsedMs:Math.round(performance.now()-started)};
}

export function sourceTreeProofArtifactName({ pullRequestNumber, headSha, sourceTreeSha256 }) {
  const digest = String(sourceTreeSha256 || '').replace(/^sha256:/, '');
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1
      || !/^[a-f0-9]{40}$/.test(headSha || '') || !/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error('Source tree proof artifact identity is invalid');
  }
  return `ravradar-source-validation-v2-pr-${pullRequestNumber}-${headSha}-${digest}`;
}

// Actual immutable committed blob identities. This is CODE data, never CI authority.
// Reuse the normal tree parser and batch reader; no one-process-per-file loop.
export function committedSourceFileIdentities(ref, paths, { git = gitBuffer } = {}) {
  if (!/^[a-f0-9]{40}$/.test(ref) || !Array.isArray(paths) || paths.length < 1
    || new Set(paths).size !== paths.length || paths.some(file =>
      typeof file !== 'string' || !/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(file)
      || file.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('Committed source identity input is malformed');
  }
  const entries = parseTree(git(['ls-tree', '-rz', '--full-tree', ref, '--', ...paths]));
  if (entries.length !== paths.length || entries.some(entry => entry.mode !== '100644'
      || entry.type !== 'blob') || new Set(entries.map(entry => entry.path)).size !== paths.length
      || paths.some(file => !entries.some(entry => entry.path === file))) {
    throw new Error('Committed source identity path or mode differs');
  }
  const hashes = batchBlobSha256(entries.map(entry => entry.oid), git);
  return entries.map(entry => Object.freeze({ path: entry.path, sha256: hashes.get(entry.oid) }));
}
