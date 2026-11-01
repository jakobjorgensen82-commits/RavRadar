import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {planSourceImpact,SOURCE_IMPACT_KNOWN_TEXT_PATHS} from './source-impact-plan.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const KNOWN=new Set(SOURCE_IMPACT_KNOWN_TEXT_PATHS),ZERO='0'.repeat(40);
const TEXT_MAX=4*1024*1024,TOTAL_TEXT_MAX=32*1024*1024,DIFF_MAX=8*1024*1024;
const MODES=new Set(['000000','100644','100755','120000','160000']);
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const refuse=code=>{const error=new Error(code);error.code=code;throw error;};
const env=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
  LANG:'C',LC_ALL:'C',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',
  GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_CONFIG_NOSYSTEM:'1',
  GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
function git(args,phase,maxBuffer=65536){
  try{return execFileSync('git',['-C',ROOT,...args],{env:env(),timeout:30000,maxBuffer,
    stdio:['ignore','pipe','pipe']});}catch{refuse('SOURCE_IMPACT_GIT_'+phase);}
}
function rawEntries(bytes){
  const fields=[];let start=0;
  for(let i=0;i<bytes.length;i++)if(bytes[i]===0){fields.push(bytes.subarray(start,i));start=i+1;}
  if(start!==bytes.length||fields.length%2)refuse('SOURCE_IMPACT_GIT_RAW_FORMAT');
  const entries=[];
  for(let i=0;i<fields.length;i+=2){
    const m=/^:([0-7]{6}) ([0-7]{6}) ([a-f0-9]{40}) ([a-f0-9]{40}) ([A-Z][0-9]*)$/
      .exec(fields[i].toString('ascii'));
    if(!m||!fields[i+1].length||/^[RC]/.test(m[5]))refuse('SOURCE_IMPACT_GIT_RAW_FORMAT');
    let name=null;try{name=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(fields[i+1]);}catch{/* Full fallback below. */}
    entries.push({path:name,pathUtf8Hex:fields[i+1].toString('hex'),beforeMode:m[1],afterMode:m[2],
      beforeOid:m[3],afterOid:m[4],status:m[5]});
  }
  return entries;
}
const pathSupported=name=>typeof name==='string'&&/^[A-Za-z0-9_./-]+$/.test(name)
  &&!name.startsWith('/')&&!name.includes('//')&&!name.split('/').some(x=>x==='.'||x==='..');
const display=name=>name===null?'<non-UTF8 Git path>':[...name].map(char=>
  /^[\x20-\x7e]$/.test(char)?char:'\\u{'+char.codePointAt(0).toString(16)+'}').join('');

// No caller root, mode, path list or command override. Only exact commit IDs.
export function planSourceImpactFromGit(input){
  const refused=code=>({schemaVersion:1,kind:'RAVRADAR_PRIVATE_GIT_IMPACT_PLAN_V1',status:'REFUSED',
    failureCode:code,cheapPlanAvailable:false,deliveryAuthority:false,qualifiedGitHubBaseline:false});
  if(arguments.length!==1||!input||Object.getPrototypeOf(input)!==Object.prototype
    ||Object.keys(input).sort().join(',')!=='baselineCommit,candidateCommit,expectedHead'
    ||!Object.values(input).every(value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value)))
    return refused('SOURCE_IMPACT_GIT_INPUT');
  const {baselineCommit,candidateCommit,expectedHead}=input;
  if(candidateCommit!==expectedHead)return refused('SOURCE_IMPACT_GIT_EXPECTED_HEAD');
  try{
    const top=git(['rev-parse','--show-toplevel'],'ROOT_QUERY').toString('utf8').trim();
    // Windows may report the same temp directory through long/8.3 spellings.
    // Compare the actual directory, never accept a parent repository by text.
    const a=fs.statSync(fs.realpathSync(top),{bigint:true}),b=fs.statSync(fs.realpathSync(ROOT),{bigint:true});
    if(!a.isDirectory()||!b.isDirectory()||a.ino===0n||a.dev!==b.dev||a.ino!==b.ino)
      refuse('SOURCE_IMPACT_GIT_ROOT_IDENTITY');
    for(const commit of [baselineCommit,candidateCommit])
      if(git(['cat-file','-t',commit],'COMMIT').toString('ascii').trim()!=='commit')
        refuse('SOURCE_IMPACT_GIT_NOT_COMMIT');
    const actualHead=git(['rev-parse','--verify','HEAD'],'HEAD').toString('ascii').trim();
    if(actualHead!==expectedHead)refuse('SOURCE_IMPACT_GIT_ACTUAL_HEAD');
    const ancestry=spawnSync('git',['-C',ROOT,'merge-base','--is-ancestor',baselineCommit,candidateCommit],
      {env:env(),timeout:30000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});
    if(ancestry.error||ancestry.signal||ancestry.status!==0)refuse('SOURCE_IMPACT_GIT_BASELINE_NOT_ANCESTOR');
    const raw=git(['diff-tree','-r','--raw','-z','--no-abbrev','--no-renames','--no-ext-diff',
      '--no-textconv','--no-commit-id',baselineCommit,candidateCommit,'--'],'DIFF',DIFF_MAX);
    const entries=rawEntries(raw),rows=[],inventory=[];let readBytes=0,readCount=0;
    const text=(entry,side)=>{
      const mode=entry[side+'Mode'],oid=entry[side+'Oid'];
      if(mode==='000000'||oid===ZERO)return {text:null,read:'ABSENT'};
      if(!KNOWN.has(entry.path))return {text:null,read:'NOT_KNOWN_TEXT_PATH'};
      if(entry.beforeMode!=='100644'||entry.afterMode!=='100644')return {text:null,read:'MODE_REQUIRES_FULL'};
      if(git(['cat-file','-t',oid],'BLOB_TYPE').toString('ascii').trim()!=='blob')
        refuse('SOURCE_IMPACT_GIT_NOT_BLOB');
      const sizeText=git(['cat-file','-s',oid],'BLOB_SIZE').toString('ascii').trim();
      if(!/^[0-9]+$/.test(sizeText))refuse('SOURCE_IMPACT_GIT_BLOB_SIZE');
      const bytes=Number(sizeText);
      if(!Number.isSafeInteger(bytes)||bytes>TEXT_MAX)return {text:null,read:'TEXT_TOO_LARGE',bytes};
      if(bytes>TOTAL_TEXT_MAX-readBytes)return {text:null,read:'TOTAL_TEXT_BOUND',bytes};
      const body=git(['cat-file','blob',oid],'BLOB_READ',TEXT_MAX+1024);readCount++;readBytes+=body.length;
      const identity=crypto.createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
      if(body.length!==bytes||identity!==oid)refuse('SOURCE_IMPACT_GIT_BLOB_IDENTITY');
      let decoded=null;try{decoded=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(body);}catch{/* Binary -> FULL. */}
      if(decoded===null||body.includes(0))return {text:null,read:'BINARY_OR_NON_UTF8',bytes};
      return {text:decoded,read:'BOUNDED_UTF8',bytes,sha256:sha256(body)};
    };
    for(const entry of entries){
      const before=text(entry,'before'),after=text(entry,'after');
      rows.push({path:entry.path,before:before.text,after:after.text,
        beforeMode:entry.beforeMode,afterMode:entry.afterMode});
      const safe=result=>Object.fromEntries(Object.entries(result).filter(([key])=>key!=='text'));
      inventory.push({pathDisplay:display(entry.path),pathUtf8Hex:entry.pathUtf8Hex,status:entry.status,
        beforeMode:entry.beforeMode,afterMode:entry.afterMode,beforeOid:entry.beforeOid,afterOid:entry.afterOid,
        before:safe(before),after:safe(after)});
    }
    const unsupported=entries.some(entry=>!pathSupported(entry.path)
      ||!MODES.has(entry.beforeMode)||!MODES.has(entry.afterMode));
    // Unsupported valid Git names retain the WHOLE inventory and choose FULL;
    // no filtering to a cheap subset and no unnecessary red workflow.
    const plan=planSourceImpact(unsupported?[]:rows);
    if(unsupported)plan.reasons=['complete-git-inventory-has-unsupported-path-or-mode-full-fallback'];
    if(git(['rev-parse','--verify','HEAD'],'FRESH_HEAD').toString('ascii').trim()!==expectedHead)
      refuse('SOURCE_IMPACT_GIT_HEAD_MOVED');
    return {schemaVersion:1,kind:'RAVRADAR_PRIVATE_GIT_IMPACT_PLAN_V1',status:'PLANNED',
      git:{baselineCommit,candidateCommit,expectedHead,actualHead,ancestorVerified:true,
        completeInventory:true,changedRows:entries.length,rawInventorySha256:sha256(raw),
        renameDetection:false,offlineOnly:true},inventory,blobReads:{count:readCount,bytes:readBytes,
        perBlobLimit:TEXT_MAX,totalLimit:TOTAL_TEXT_MAX},plan,
      cheapPlanAvailable:plan.selection==='TARGETED',deliveryAuthority:false,qualifiedGitHubBaseline:false};
  }catch(error){return refused(/^SOURCE_IMPACT_GIT_[A-Z_]+$/.test(error?.code??'')
    ?error.code:'SOURCE_IMPACT_GIT_UNEXPECTED_REFUSAL');}
}
