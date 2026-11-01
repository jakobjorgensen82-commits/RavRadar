import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getHeapStatistics} from 'node:v8';
import {fileURLToPath} from 'node:url';
const INPUTS=Object.freeze({conditions:'data/live/conditions.json',startup:'data/live/public-conditions.json',details:'data/live/public-condition-details.json',manifest:'data/live/manifest.json',coastalParts:'data/live/coastal-parts-v2.json',zoneRegistry:'data/zones.geojson'});
const REPORT='.geometry-v2-work/ravscore-integrated-public-runtime-audit.json';
async function sizeObservation(file) {
  try {
    const stat=await fs.lstat(file);
    return stat.isFile()&&!stat.isSymbolicLink()&&Number.isSafeInteger(stat.size)&&stat.size>=0
      ?{status:'REGULAR',bytes:stat.size}:{status:'NOT_REGULAR',bytes:null};
  }catch(error){return{status:error?.code==='ENOENT'?'MISSING':'STAT_FAILED',bytes:null};}
}
export async function writeRuntimeAuditExecutionObservation({phase,exitCode=null,repositoryRoot=process.cwd()}={}) {
  if(!['before','after'].includes(phase)||(phase==='before'?exitCode!==null:!Number.isInteger(exitCode)||exitCode<0||exitCode>255))
    throw new Error('AUDIT_EXECUTION_ARGUMENTS');
  const root=path.resolve(repositoryRoot),report=path.join(root,REPORT);
  const [inputs,reportState,failureState]=await Promise.all([
    Promise.all(Object.entries(INPUTS).map(async([key,relative])=>[key,await sizeObservation(path.join(root,relative))])),
    sizeObservation(report),sizeObservation(report+'.failure.json'),
  ]);
  const heapLimitBytes=getHeapStatistics().heap_size_limit;
  if(!Number.isSafeInteger(heapLimitBytes)||heapLimitBytes<=0)throw new Error('AUDIT_EXECUTION_HEAP_INVALID');
  const value={schemaVersion:'ravradar-runtime-audit-execution-v1',phase:phase==='before'?'BEFORE_AUDIT':'AFTER_AUDIT',
    status:phase==='before'?'NOT_FINISHED':exitCode===0?'EXIT_ZERO':'EXIT_NONZERO',auditExitCode:exitCode,
    reportPresent:reportState.status==='REGULAR',failureReportPresent:failureState.status==='REGULAR',
    inputSizes:Object.fromEntries(inputs),heapLimitBytes,privatePayloadIncluded:false};
  const output=report+'.execution.json',temporary=output+'.tmp-'+randomUUID();
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(temporary,JSON.stringify(value)+'\n',{flag:'wx'});
  try{await fs.rename(temporary,output);}catch(error){await fs.unlink(temporary).catch(()=>{});throw error;}
  return value;
}
async function main(args) {
  if(args.length!==2&&args.length!==4)throw new Error('AUDIT_EXECUTION_ARGUMENTS');
  if(args[0]!=='--phase'||!['before','after'].includes(args[1]))throw new Error('AUDIT_EXECUTION_ARGUMENTS');
  let exitCode=null;
  if(args[1]==='before'&&args.length!==2)throw new Error('AUDIT_EXECUTION_ARGUMENTS');
  if(args[1]==='after'){
    if(args.length!==4||args[2]!=='--exit-code'||!/^(?:0|[1-9][0-9]{0,2})$/.test(args[3])||Number(args[3])>255)
      throw new Error('AUDIT_EXECUTION_ARGUMENTS');
    exitCode=Number(args[3]);
  }
  await writeRuntimeAuditExecutionObservation({phase:args[1],exitCode});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).catch(()=>{console.error('AUDIT_EXECUTION_OBSERVATION_FAILED');process.exitCode=1;});
}
