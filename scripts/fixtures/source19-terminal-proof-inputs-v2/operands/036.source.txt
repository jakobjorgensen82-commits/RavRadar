// Fixed private H71 consumer. JSON is transport, never SOURCE/stop authority.
import fs from 'node:fs/promises';
import { constants, fstat, write as unionResultWrite, fsync as unionResultSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeVerifiedProtectedProgressComponents } from './lib/verified-protected-progress-components.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './lib/private-weather-progress-files.mjs';
import {openSourceUnionBirthJournal,finishSourceUnionBirthJournal} from './lib/source-union-birth-journal.mjs';

const MAX = 32 * 1024 * 1024;
const fail = () => { throw new Error('SOURCE_PROGRESS_UNION_TRANSPORT_INVALID'); };
const identityKeys = ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'];
const same = (a,b) => identityKeys.every(k => a[k] === b[k]);
const names = new Set([...Object.values(PRIVATE_WEATHER_COMPONENT_FILES), ...Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES)]);
const allowed = s => names.has(s) || /^\.cache\/copernicus-components\/(?:objects\/[0-9a-f]{64}\.nc|receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json|static\/[0-9a-f]{64}\.json)$/.test(s);
async function rawStat(fd) {
  return new Promise((resolve,reject) => fstat(fd, { bigint:true }, (e,s) => e ? reject(e) : resolve(s)));
}
async function directory(fd) {
  const actual = await rawStat(fd), named = await fs.realpath(`/proc/self/fd/${fd}`);
  const stat = await fs.lstat(named, { bigint:true });
  if (!actual.isDirectory() || !stat.isDirectory() || stat.isSymbolicLink()
    || ['dev','ino','mode'].some(k => actual[k] !== stat[k])) fail();
  return named;
}
async function noSymlinkParents(root, relative) {
  let at = root;
  for (const segment of relative.split('/').slice(0,-1)) {
    at = path.join(at,segment);
    const s = await fs.lstat(at, { bigint:true });
    if (!s.isDirectory() || s.isSymbolicLink() || await fs.realpath(at) !== at) fail();
  }
}
async function hashRow(row) {
  const named = await fs.lstat(row.path,{bigint:true}), actual = await row.handle.stat({bigint:true});
  if (!same(row.stat,named) || !same(row.stat,actual) || named.isSymbolicLink()) fail();
  const hash = crypto.createHash('sha256'), b = Buffer.alloc(65536); let at = 0;
  while (at < row.bytes) {
    const {bytesRead} = await row.handle.read(b,0,Math.min(b.length,row.bytes-at),at);
    if (!bytesRead) fail(); hash.update(b.subarray(0,bytesRead)); at += bytesRead;
  }
  if ((await row.handle.read(b,0,1,at)).bytesRead || hash.digest('hex') !== row.sha256
    || !same(row.stat,await row.handle.stat({bigint:true}))
    || !same(row.stat,await fs.lstat(row.path,{bigint:true}))) fail();
}
async function closeRow(row) {
  if (row.closed) return;
  if (row.closeAttempted) fail();
  row.closeAttempted = true;
  let first = null;
  try { await row.handle.close(); } catch (error) { first = [error]; }
  try { row.closed = await rawStat(row.fd).then(()=>false,error=>error?.code === 'EBADF');
    if (!row.closed) fail(); } catch (error) { first ??= [error]; }
  if (first !== null) throw first[0];
}
async function openRow(root, file, owned) {
  if (!file || Object.keys(file).sort().join(',') !== 'bytes,relativePath,sha256'
    || !allowed(file.relativePath) || !Number.isSafeInteger(file.bytes) || file.bytes < 0
    || !/^[0-9a-f]{64}$/.test(file.sha256)) fail();
  await noSymlinkParents(root,file.relativePath);
  const named = path.join(root,file.relativePath), stat = await fs.lstat(named,{bigint:true});
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size !== BigInt(file.bytes)) fail();
  const handle = await fs.open(named,constants.O_RDONLY | constants.O_NOFOLLOW);
  const row = {handle,fd:handle.fd,path:named,stat,bytes:file.bytes,sha256:file.sha256,closed:false};
  owned.push(row); await hashRow(row); await closeRow(row);
  return {...file,sourcePath:named};
}
async function inventory(directory, root = directory, out = {files:[],directories:[]}) {
  const named = await fs.lstat(directory,{bigint:true});
  if (!named.isDirectory() || named.isSymbolicLink() || await fs.realpath(directory) !== directory) fail();
  out.directories.push({relative:path.relative(root,directory).split(path.sep).join('/'),
    identity:Object.fromEntries(['dev','ino','mode'].map(k => [k,String(named[k])]))});
  for (const item of await fs.readdir(directory,{withFileTypes:true})) {
    if (directory === root && ['union-result.json','union-birth.jsonl'].includes(item.name)) continue; // Actual H-born FDs.
    const file = path.join(directory,item.name);
    if (item.isDirectory()) await inventory(file,root,out);
    else if (item.isFile()) {
      const stat = await fs.lstat(file,{bigint:true});
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) fail();
      const handle = await fs.open(file,constants.O_RDONLY | constants.O_NOFOLLOW);
      const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(65536); let position = 0;
      const row = {handle,fd:handle.fd,closed:false}; let first = null;
      try {
        for (;;) { const {bytesRead} = await handle.read(buffer,0,buffer.length,position);
          if (!bytesRead) break; position += bytesRead; hash.update(buffer.subarray(0,bytesRead)); }
        if (!same(stat,await handle.stat({bigint:true})) || !same(stat,await fs.lstat(file,{bigint:true}))) fail();
        out.files.push({relative:path.relative(root,file).split(path.sep).join('/'),bytes:position,sha256:hash.digest('hex'),
          identity:Object.fromEntries(identityKeys.map(k => [k,String(stat[k])]))});
      } catch (error) { first = [error]; }
      try { await closeRow(row); } catch (error) { first ??= [error]; }
      if (first !== null) throw first[0];
    } else fail();
  }
  return out;
}
function sourceProgressUnionTransportValid(input) {
  const hour=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().replace('.000Z','Z')===value.replace('.000Z','Z');
  return input && Object.keys(input).sort().join(',')==='complete,kind,productionReferenceAt,progress,schemaVersion,target'
    && input.schemaVersion===1 && input.kind==='SOURCE_PROGRESS_UNION_INPUT'
    && hour(input.target) && hour(input.productionReferenceAt)
    && Array.isArray(input.progress) && Array.isArray(input.complete)
    && input.progress.length+input.complete.length<=131072;
}
function sourceProgressUnionMergeArguments(input,root,progressRoot,outputRoot,files,completeFiles,python) {
  // Control/ACK target and the normal consumer's older S reference are distinct.
  return {root,progressFiles:files,progressVerifiedRoot:progressRoot,
    temporaryDirectory:outputRoot,productionReferenceAt:input.productionReferenceAt,
    completeFiles,pythonExecutable:python};
}
async function sourceProgressUnionWriteBorrowedResult(fd, body) {
  let position=0;
  while(position<body.length) {
    const written=await new Promise((resolve,reject)=>unionResultWrite(fd,body,position,body.length-position,position,
      (error,bytes)=>error?reject(error):resolve(bytes)));
    if(!written) fail(); position+=written;
  }
  await new Promise((resolve,reject)=>unionResultSync(fd,error=>error?reject(error):resolve()));
  // Borrowed from H. Only H closes the authoritative descriptor after ECHILD.
}
async function run() {
  if (process.platform !== 'linux' || process.argv.length !== 3 || process.argv[2] !== '--source-owned-progress-union') fail();
  const parent = process.ppid, root = await directory(5), outputRoot = await directory(6), progressRoot = await directory(7);
  const command = (await fs.readFile(`/proc/${parent}/cmdline`)).toString('utf8').split('\0').filter(Boolean);
  if (command.length !== 5 || command[1] !== '-I' || command[2] !== '-B'
    || path.resolve(command[3]) !== path.join(root,'scripts/lib/copernicus_component_process.py')
    || command[4] !== '--source-normal-program-cohort' || process.ppid !== parent
    || path.basename(outputRoot) !== 'source-union' || path.basename(progressRoot) !== 'verified'
    || path.dirname(outputRoot) !== path.dirname(progressRoot)
    || (await fs.readdir(outputRoot)).sort().join(',') !== 'union-birth.jsonl,union-result.json') fail();
  const resultFdText=process.env.RAVRADAR_SOURCE_UNION_RESULT_FD;
  if(!/^[0-9]+$/.test(resultFdText??'')) fail();
  const resultFd=Number(resultFdText);
  if(!Number.isSafeInteger(resultFd) || resultFd<8) fail();
  const resultBirth=await rawStat(resultFd), resultNamed=await fs.lstat(path.join(outputRoot,'union-result.json'),{bigint:true});
  if(!resultBirth.isFile() || resultBirth.nlink!==1n || resultBirth.size!==0n
    || resultNamed.isSymbolicLink() || !same(resultBirth,resultNamed)) fail();
  const capsuleStat = await rawStat(4);
  if (!capsuleStat.isFile() || !Number.isSafeInteger(Number(capsuleStat.size)) || capsuleStat.size < 2n || capsuleStat.size > BigInt(MAX)) fail();
  const capsule = await fs.readFile('/proc/self/fd/4');
  if (BigInt(capsule.length) !== capsuleStat.size || !same(capsuleStat,await rawStat(4))) fail();
  const input = JSON.parse(capsule);
  if (!sourceProgressUnionTransportValid(input)) fail();
  const rows = []; let first = null;
  try {
    const files = [], completeFiles = [];
    for (const [from,into,base] of [[input.progress,files,progressRoot],[input.complete,completeFiles,root]]) {
      if (new Set(from.map(f=>f?.relativePath)).size !== from.length) fail();
      for (const file of from) into.push(await openRow(base,file,rows));
    }
    const journal=await openSourceUnionBirthJournal(outputRoot);
    const python = await fs.readlink(`/proc/${parent}/exe`);
    const result = await mergeVerifiedProtectedProgressComponents(sourceProgressUnionMergeArguments(
      input,root,progressRoot,outputRoot,files,completeFiles,python), journal);
    // Keep worker FD use bounded; P retains the genuine original descriptors.
    // Reopen and rehash one row at a time after the complete normal merger.
    for (const original of [...rows]) {
      const handle = await fs.open(original.path,constants.O_RDONLY | constants.O_NOFOLLOW);
      const row = {...original,handle,fd:handle.fd,closed:false,closeAttempted:false}; rows.push(row);
      await hashRow(row); await closeRow(row);
    }
    await finishSourceUnionBirthJournal(journal);
    const catalog = await inventory(outputRoot), outputs = [];
    for (const file of result.files) {
      const original = rows.find(row=>row.path === file.sourcePath);
      const relative = path.relative(outputRoot,file.sourcePath).split(path.sep).join('/');
      const produced = catalog.files.find(row=>row.relative === relative);
      if (!allowed(file.relativePath) || (!original && !produced)
        || (original && original.path !== path.join(progressRoot,file.relativePath))) fail();
      outputs.push({relativePath:file.relativePath,root:original?'progress':'output',
        relative:original?path.relative(progressRoot,original.path).split(path.sep).join('/'):relative,
        bytes:(original??produced).bytes,sha256:(original??produced).sha256});
    }
    const body = Buffer.from(JSON.stringify({schemaVersion:1,kind:'SOURCE_PROGRESS_UNION_RESULT',
      target:input.target,outputs,catalog,result:{...result,files:undefined}})+'\n');
    if (body.length > MAX) fail();
    await sourceProgressUnionWriteBorrowedResult(resultFd,body);
    const finalResult=await rawStat(resultFd), finalNamed=await fs.lstat(path.join(outputRoot,'union-result.json'),{bigint:true});
    if(finalResult.size!==BigInt(body.length) || !same(finalResult,finalNamed)
      || ['dev','ino','mode','nlink'].some(key=>finalResult[key]!==resultBirth[key])) fail();
  } catch (error) { first = [error]; }
  for (const row of rows) {
    try { await closeRow(row); }
    catch (error) { first ??= [error]; }
  }
  if (first !== null) throw first[0];
  // H alone reads this output after ECHILD and closes its own borrowed FDs.
}
if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await run();
