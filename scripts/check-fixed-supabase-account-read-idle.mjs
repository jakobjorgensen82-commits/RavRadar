#!/usr/bin/env node
// Fixed metadata-only guard for the two authorised account-reader operations.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY='jakobjorgensen82-commits/RavRadar';
const BODY_BYTES=65536, REQUEST_MS=5000;
const LEGACY_PATH='.github/workflows/update-and-deploy.yml';
// Same three exact historical identities as the existing cadence watchdog;
// this stricter reader also requires main/path/conclusion and fresh jobs=0.
const INERT_LEGACY_QUEUE=new Map([
  [34868901509,{at:'2026-09-14T16:29:10Z',sha:'c4930944a6273c00f201994504e3971ad3f2b165'}],
  [34613079069,{at:'2026-09-11T14:55:55Z',sha:'5587001b45ffea056addaf6cd20084719540336a'}],
  [34228112413,{at:'2026-09-08T12:47:45Z',sha:'b814b525962514a368536f456477881390d6b333'}],
]);
class FixedReadIdleFailure extends Error {
  constructor(code){super(code);this.code=code;}
}
const fail=code=>{throw new FixedReadIdleFailure(code);};
const need=(value,code)=>{if(!value)fail(code);};
const keys=(value,expected)=>value!==null&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).sort().join('\n')===[...expected].sort().join('\n');

async function readFixedGithub(route,token,fetchImpl) {
  const controller=new AbortController();
  let timer,reader=null,expired=false;
  const deadline=new Promise((_,reject)=>{
    timer=setTimeout(()=>{
      expired=true;
      reject(new FixedReadIdleFailure('FIXED_READ_IDLE_DEADLINE'));
      controller.abort();
    },REQUEST_MS);
  });
  try {
    const read=async()=>{
      const response=await fetchImpl('https://api.github.com/repos/'+REPOSITORY+route,{
        method:'GET',redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal,
        headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
          'x-github-api-version':'2022-11-28'},
      });
      if(expired)fail('FIXED_READ_IDLE_DEADLINE');
      need(response.status===200&&!response.redirected&&response.body,'FIXED_READ_IDLE_UNAVAILABLE');
      const declared=response.headers.get('content-length');
      if(declared!==null)need(/^\d+$/.test(declared)&&Number(declared)<=BODY_BYTES,'FIXED_READ_IDLE_BOUND');
      reader=response.body.getReader();
      const chunks=[];let size=0;
      while(true) {
        const chunk=await reader.read();
        if(expired)fail('FIXED_READ_IDLE_DEADLINE');
        if(chunk.done)break;
        need(chunk.value instanceof Uint8Array&&chunk.value.byteLength<=BODY_BYTES-size,'FIXED_READ_IDLE_BOUND');
        size+=chunk.value.byteLength;chunks.push(chunk.value);
      }
      reader.releaseLock();reader=null;
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,size)));
    };
    return await Promise.race([read(),deadline]);
  } catch(error) {
    if(expired)fail('FIXED_READ_IDLE_DEADLINE');
    if(error instanceof FixedReadIdleFailure)throw error;
    fail('FIXED_READ_IDLE_UNAVAILABLE');
  } finally {
    clearTimeout(timer);controller.abort();
    if(reader) {
      try{void reader.cancel().catch(()=>{});}catch{}
      try{reader.releaseLock();}catch{}
    }
  }
}

export async function checkFixedSupabaseAccountReadIdle(options) {
  need(keys(options,['repository','runId','githubToken'])
    ||keys(options,['repository','runId','githubToken','fetchImpl']),'FIXED_READ_GITHUB_SCOPE');
  const {repository,runId,githubToken,fetchImpl=globalThis.fetch}=options;
  need(repository===REPOSITORY&&Number.isSafeInteger(runId)&&runId>0
    &&typeof githubToken==='string'&&githubToken.trim()&&typeof fetchImpl==='function','FIXED_READ_GITHUB_SCOPE');
  let requests=0,inertQueuedRuns=0;
  const get=async route=>{requests++;return readFixedGithub(route,githubToken,fetchImpl);};
  for(const status of ['in_progress','queued','waiting','pending','requested']) {
    const value=await get('/actions/runs?branch=main&per_page='+(status==='queued'?100:1)+'&status='+status);
    need(value!==null&&typeof value==='object'&&Number.isSafeInteger(value.total_count)&&value.total_count>=0&&Array.isArray(value.workflow_runs)
      &&value.workflow_runs.length===value.total_count,'FIXED_READ_INVENTORY_INCOMPLETE');
    if(status==='queued') {
      need(value.total_count<=INERT_LEGACY_QUEUE.size,'FIXED_READ_MAIN_NOT_IDLE');
      const seen=new Set();
      for(const run of value.workflow_runs) {
        const known=INERT_LEGACY_QUEUE.get(run?.id);
        need(known&&!seen.has(run.id)&&run.head_branch==='main'&&run.path===LEGACY_PATH
          &&run.status==='queued'&&run.conclusion===null&&run.run_attempt===1&&run.event==='workflow_dispatch'
          &&run.head_sha===known.sha&&run.created_at===known.at&&run.updated_at===known.at,'FIXED_READ_MAIN_NOT_IDLE');
        seen.add(run.id);
      }
      // Validate the complete identity inventory before making any jobs read.
      for(const run of value.workflow_runs) {
        const jobs=await get('/actions/runs/'+run.id+'/attempts/1/jobs?per_page=1');
        need(jobs!==null&&typeof jobs==='object'&&jobs.total_count===0&&Array.isArray(jobs.jobs)&&jobs.jobs.length===0,'FIXED_READ_LEGACY_JOBS_NOT_EMPTY');
        inertQueuedRuns++;
      }
    } else if(status==='in_progress') {
      need(value.total_count===1&&value.workflow_runs[0]?.id===runId
        &&value.workflow_runs[0].status==='in_progress'&&value.workflow_runs[0].head_branch==='main','FIXED_READ_MAIN_NOT_IDLE');
    } else need(value.total_count===0,'FIXED_READ_MAIN_NOT_IDLE');
  }
  return Object.freeze({schemaVersion:1,status:'FIXED_READ_MAIN_IDLE',requests,inertQueuedRuns,
    emptyJobInventories:inertQueuedRuns,atomicWriterLease:false});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    need(process.argv.length===2&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch'
      &&process.env.GITHUB_REF==='refs/heads/main'&&process.env.GITHUB_RUN_ATTEMPT==='1','FIXED_READ_INVOCATION');
    console.log(JSON.stringify(await checkFixedSupabaseAccountReadIdle({
      repository:process.env.GITHUB_REPOSITORY,runId:Number(process.env.GITHUB_RUN_ID),
      githubToken:process.env.GITHUB_TOKEN,
    })));
  } catch(error) {
    console.error(error instanceof FixedReadIdleFailure?error.code:'FIXED_READ_IDLE_UNAVAILABLE');
    process.exitCode=1;
  }
}
