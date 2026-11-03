// Fixed H71 birth transport, not a SOURCE owner or stop issuer.
import fs from 'node:fs/promises';
import {constants, fstat, write, fsync} from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {types} from 'node:util';
import {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './private-weather-component-pack.mjs';

const contexts = new WeakMap();
const fail = () => { throw new Error('SOURCE_UNION_BIRTH_UNPROVED'); };
const statKeys = ['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'];
const same = (a,b,all=true) => (all?statKeys:['dev','ino','mode']).every(key=>a[key]===b[key]);
const encode = stat => Object.fromEntries(statKeys.map(key=>[key,String(stat[key])]));
const rawStat = fd => new Promise((resolve,reject)=>fstat(fd,{bigint:true},(error,value)=>error?reject(error):resolve(value)));
function stateOf(token) {
  const state=contexts.get(token);
  if(!state || state.firstFailure!==null) {
    if(state?.firstFailure!==null && state?.firstFailure!==undefined) throw state.firstFailure[0];
    fail();
  }
  return state;
}
function relative(state,file) {
  const name=path.relative(state.root,path.resolve(file)).split(path.sep).join('/');
  if(!name || name.length>4096 || name.includes('\\') || name.split('/').some(part=>!part||part==='.'||part==='..')
    || path.isAbsolute(name) || ['union-result.json','union-birth.jsonl'].includes(name)) fail();
  return name;
}
async function append(state,value) {
  try {
    const body=Buffer.from(JSON.stringify({schemaVersion:1,actor:'node',pid:process.pid,...value})+'\n');
    const actual=await rawStat(state.fd),named=await fs.lstat(path.join(state.root,"union-birth.jsonl"),{bigint:true});
    if(body.length>8192 || !same(state.birth,actual,false) || actual.nlink!==1n
      || named.isSymbolicLink() || !same(actual,named) || actual.size+BigInt(body.length)>32n*1024n*1024n) fail();
    // O_APPEND is shared only by the fixed sequential normal merger callers.
    const written=await new Promise((resolve,reject)=>write(state.fd,body,0,body.length,null,
      (error,count)=>error?reject(error):resolve(count)));
    if(written!==body.length) fail();
    state.bytes+=body.length;
  } catch(error) { state.firstFailure??=[error]; throw state.firstFailure[0]; }
}
export async function openSourceUnionBirthJournal(root) {
  if(process.platform!=='linux' || process.argv.length!==3 || process.argv[2]!=='--source-owned-progress-union') fail();
  const text=process.env.RAVRADAR_SOURCE_UNION_BIRTH_FD;
  if(!/^[0-9]+$/.test(text??'')) fail();
  const fd=Number(text), rootStat=await rawStat(6);
  if(!Number.isSafeInteger(fd)||fd<8 || !rootStat.isDirectory() || await fs.realpath('/proc/self/fd/6')!==root) fail();
  const born=await rawStat(fd), named=await fs.lstat(path.join(root,'union-birth.jsonl'),{bigint:true});
  if(!born.isFile()||born.nlink!==1n||born.size!==0n||named.isSymbolicLink()||!same(born,named)) fail();
  const state={fd,root,rootStat,birth:born,bytes:0,firstFailure:null,files:new Map(),directories:new Map()};
  const token=Object.freeze({}); contexts.set(token,state);
  await append(state,{event:'header',parent:process.ppid,root:encode(rootStat),journal:encode(born)});
  return token;
}
export function sourceUnionBirthChildTransport(token,root) {
  const state=stateOf(token);
  if(state.root!==path.resolve(root)) fail();
  return Object.freeze({args:Object.freeze(['--source-union-born-journal']),
    stdio:Object.freeze(['ignore','ignore','ignore',state.fd,6])});
}
export async function sourceUnionBirthFileOpened(token,file,handle) {
  const state=stateOf(token), name=relative(state,file);
  if(state.files.has(name)) fail();
  const row={name,handle,fd:handle.fd,birth:null,closed:false,descriptorIdentity:ownFileDescriptorIdentity(handle.fd)};
  state.files.set(name,row); // Retain the actual handle before the first await.
  try {
    const birth=await handle.stat({bigint:true}); row.birth=birth;
    if(row.descriptorIdentity===null||!birth.isFile()||birth.nlink!==1n||birth.size!==0n||!same(birth,await fs.lstat(file,{bigint:true}))) fail();
    await append(state,{event:'file-born',relative:name,identity:encode(birth)});
  } catch(error) { state.firstFailure??=[error]; throw state.firstFailure[0]; }
}
export async function sourceUnionBirthFileClosed(token,file,handle,identity,bytes,sha256) {
  const state=stateOf(token), name=relative(state,file), row=state.files.get(name);
  try {
    if(!row||row.handle!==handle||row.closed||row.birth===null||handle.fd!==-1
      || !Number.isSafeInteger(bytes)||bytes<0||!/^[0-9a-f]{64}$/.test(sha256)
      || identity.size!==BigInt(bytes)||!same(row.birth,identity,false)||identity.nlink!==1n) fail();
    if(row.descriptorIdentity===null||!await ownedFileDescriptorClosed(row.fd,row.descriptorIdentity)) fail();
    if(!same(identity,await fs.lstat(file,{bigint:true}))) fail();
    row.closed=true; row.identity=identity;
    await append(state,{event:'file-closed',relative:name,identity:encode(identity),bytes,sha256});
  } catch(error) { state.firstFailure??=[error]; throw state.firstFailure[0]; }
}
export async function finishSourceUnionBirthJournal(token) {
  const state=stateOf(token);
  if([...state.files.values()].some(row=>!row.closed)) fail();
  await append(state,{event:'worker-complete'});
  await new Promise((resolve,reject)=>fsync(state.fd,error=>error?reject(error):resolve()));
  const actual=await rawStat(state.fd), named=await fs.lstat(path.join(state.root,'union-birth.jsonl'),{bigint:true});
  if(!same(state.birth,actual,false)||actual.nlink!==1n||!same(actual,named)||actual.size>32n*1024n*1024n) fail();
  // FD belongs to H; neither this factory nor a child closes or releases it.
}
