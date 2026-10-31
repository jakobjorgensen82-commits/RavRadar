// Fixed genuine593 CODE for the existing native test host only. No runtime
// original authentication, B/S capability, installer or caller-selected source.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const execute=promisify(callbackExec),sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
export const FROZEN593_NATIVE_CODE=Object.freeze({
  head:'34cf42ff81cb8be7b3d8bb79029ae648e419a143',tree:'575dfca61399dd29309c4620aab96053f1d930b6',
  manifestSha256:'cc93a06a980a6d0589dd294edebd1f1fcd7fb304c45a59e699873a06e353609a',
  closureSha256:'979f20a99556ac76a918fe298d3373f3ad32e5a79dacdcc7fa97bcc888768b5a',
});
const environment=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
  GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{
  encoding,env:environment(),timeout:30000,maxBuffer:16*1024*1024})).stdout;
function relative(file){
  assert.equal(typeof file,'string');assert.match(file,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(file),file);assert(!path.posix.isAbsolute(file)&&file!=='.'
    &&file!=='..'&&!file.startsWith('../'));return file;
}
function directoryIdentity(stat){assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs];}
async function noLinks(file){let current=path.parse(file).root;
  for(const piece of path.relative(current,file).split(path.sep).filter(Boolean)){
    current=path.join(current,piece);assert(!(await fs.lstat(current)).isSymbolicLink());
  }
}
export function verifyFrozen593NativeCodeManifest(bytes){
  assert.equal(sha(bytes),FROZEN593_NATIVE_CODE.manifestSha256);
  const value=JSON.parse(bytes);assert.equal(value.schemaVersion,1);
  assert.equal(value.scope,'GENUINE_593_CODE_FOR_NATIVE_TEST_ONLY');
  assert.equal(value.head,FROZEN593_NATIVE_CODE.head);assert.equal(value.tree,FROZEN593_NATIVE_CODE.tree);
  assert.equal(value.files.length,186);assert.equal(value.closureSha256,FROZEN593_NATIVE_CODE.closureSha256);
  assert.equal(sha(JSON.stringify(value.files)),value.closureSha256);
  assert.deepEqual(value.files.map(row=>row.file),[...new Set(value.files.map(row=>relative(row.file)))].sort());
  for(const row of value.files){assert.deepEqual(Object.keys(row).sort(),['bytes','file','sha256']);
    assert(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert.match(row.sha256,/^[a-f0-9]{64}$/);}
  return value;
}
export async function withInstalled593CodePredecessorSource(callback){
  assert.equal(arguments.length,1,'No caller root, head, pins or overrides');assert.equal(typeof callback,'function');
  const manifestFile=path.join(ROOT,'scripts/fixtures/installed593-code-predecessor.json');
  await noLinks(manifestFile);const manifestStat=await fs.lstat(manifestFile);
  assert(manifestStat.isFile()&&!manifestStat.isSymbolicLink());
  const manifest=verifyFrozen593NativeCodeManifest(await fs.readFile(manifestFile));
  assert.equal(String(await git(['rev-parse',manifest.head+'^{tree}'],'utf8')).trim(),manifest.tree);
  const index=new Map(String(await git(['ls-tree','-rz','--full-tree',manifest.head],'utf8')).split('\0').filter(Boolean)
    .map(line=>{const match=/^(\d+) (blob|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(match);return[match[4],match];}));
  const files=new Map();
  for(const row of manifest.files){const record=index.get(row.file);assert(record&&/^100(?:644|755)$/.test(record[1])&&record[2]==='blob');
    const bytes=Buffer.from(await git(['cat-file','blob',manifest.head+':'+row.file]));
    assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);files.set(row.file,bytes);}
  const pkg=JSON.parse(files.get('package.json'));assert.equal(pkg.type,'module');assert.equal(pkg.version,'4.0.593');
  for(const file of files.keys())for(let dir=path.posix.dirname(file);dir!=='.';dir=path.posix.dirname(dir))
    assert(!index.has(dir+'/package.json'),'No hidden package resolution scope in the fixed native closure');
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
  await noLinks(gitDirectory);const gitIdentity=directoryIdentity(await fs.lstat(gitDirectory,{bigint:true}));
  files.set('.git',Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n'));
  const parent=await fs.realpath(os.tmpdir()),root=await fs.mkdtemp(path.join(parent,'rr-native593-source-'));
  assert.equal(path.dirname(root),parent);const owned=directoryIdentity(await fs.lstat(root,{bigint:true}));
  const exact=async()=>{
    const seen=[];
    async function visit(directory){for(const row of await fs.readdir(directory,{withFileTypes:true})){
      const file=path.join(directory,row.name);assert(!row.isSymbolicLink());
      if(row.isDirectory())await visit(file);else{assert(row.isFile());const rel=path.relative(root,file).split(path.sep).join('/');
        assert(files.has(rel));const stat=await fs.lstat(file,{bigint:true});assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n);
        assert.deepEqual(await fs.readFile(file),files.get(rel));seen.push(rel);}
    }}
    await visit(root);assert.deepEqual(seen.sort(),[...files.keys()].sort());
    await noLinks(root);assert.deepEqual(directoryIdentity(await fs.lstat(root,{bigint:true})),owned);
    await noLinks(gitDirectory);assert.deepEqual(directoryIdentity(await fs.lstat(gitDirectory,{bigint:true})),gitIdentity);
  };
  let value,first,failed=false;
  try{
    for(const[file,bytes]of files){const output=path.resolve(root,file);assert(path.relative(root,output)!=='..');
      await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,bytes,{flag:'wx',mode:0o600});}
    await exact();value=await callback(root);
  }catch(error){first=error;failed=true;}
  try{
    await exact();assert.equal(path.dirname(path.resolve(root)),parent);assert(path.basename(root).startsWith('rr-native593-source-'));
    for(const file of files.keys())await fs.unlink(path.join(root,file));
    const dirs=new Set();for(const file of files.keys())for(let dir=path.posix.dirname(file);dir!=='.';dir=path.posix.dirname(dir))dirs.add(dir);
    for(const dir of [...dirs].sort((a,b)=>b.length-a.length))await fs.rmdir(path.join(root,dir));await fs.rmdir(root);
  }catch(error){if(!failed){first=error;failed=true;}}
  if(failed)throw first;return value;
}
