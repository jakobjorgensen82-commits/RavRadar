// Fixed existing GitHub operator operation -> existing protected admin document.
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readTripWeatherAggregate} from './lib/trip-weather-aggregate-client.mjs';
import {publishPrivateTripStudyAdmin} from './lib/private-trip-study-admin-transport.mjs';
export async function publishOwnerPrivateTripStudy(){
  const env=process.env;
  if(process.argv.length!==2||env.GITHUB_EVENT_NAME!=='workflow_dispatch'||env.GITHUB_WORKFLOW!=='Private RavRadar trip weather study'
    ||env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||env.TRIP_STORAGE_OPERATION!=='private-study-export'
    ||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))throw Error('PRIVATE_STUDY_OPERATOR_AUTHORITY');
  const childEnv={...env};for(const key of ['SUPABASE_ACCESS_TOKEN','SUPABASE_SERVICE_ROLE_KEY','TRIP_GATEWAY_SHARED_SECRET','TRIP_PSEUDONYM_SECRET_V1','CLOUDFLARE_API_TOKEN'])delete childEnv[key];
  const read=(command,args)=>execFileSync(command,args,{env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:65536});
  read('git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main']);
  for(const ref of ['HEAD^{commit}','origin/main^{commit}'])if(read('git',['rev-parse',ref]).trim()!==env.GITHUB_SHA)throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  if(!/^Source gate: required=false; reason=[^\r\n]+$/m.test(read('node',['scripts/weather-source-gate.mjs','check'])))throw Error('PRIVATE_STUDY_OPERATOR_SOURCE');
  const report=await readTripWeatherAggregate({supabaseUrl:'https://afqhhdrkjfjtpadntdzo.supabase.co',
    serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,gatewayUrl:env.CLOUDFLARE_TRIP_GATEWAY_URL,
    sharedSecret:env.TRIP_GATEWAY_SHARED_SECRET,pseudonymSecret:env.TRIP_PSEUDONYM_SECRET_V1});
  return publishPrivateTripStudyAdmin(report,{serviceRoleKey:env.SUPABASE_SERVICE_ROLE_KEY,accessToken:env.SUPABASE_ACCESS_TOKEN});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  publishOwnerPrivateTripStudy().then(receipt=>console.log(JSON.stringify(receipt))).catch(()=>{
    console.error('PRIVATE_STUDY_OPERATOR_FAILED');process.exitCode=1;
  });
}
