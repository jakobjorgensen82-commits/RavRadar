#!/usr/bin/env node
// UNEXECUTED SOURCE PROPOSAL. Intended scripts/build-account-assistant-binding-successor.mjs.
// No historical migration writes. ROOT must review this source before any run.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const ACCOUNT_ASSISTANT_SUCCESSOR_PATH='supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql';
export const ACCOUNT_ASSISTANT_SUCCESSOR_VERSION='20261013210000';
const SOURCE_130='supabase/migrations/20261010130000_owner_export_origin_bound_successor.sql';
const SOURCE_200='supabase/migrations/20261012200000_checkpoint_cas_single_projection_successor.sql';
const INPUT='scripts/fixtures/account-assistant-successor-inputs.json';
const CP='ravradar_ravscore_checkpoint_';
const PROJECTION=CP+'account_assistant_predecessor_projection';
const OLD=Object.freeze({I:'249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',C:'55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',T:'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'});
const NEXT=Object.freeze({I:'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',C:'2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',T:'7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const normalize=x=>x.replace(/\r\n?/g,'\n');
const occurrences=(s,v)=>s.split(v).length-1;
const once=(s,a,b)=>{assert.equal(occurrences(s,a),1,'Ambiguous exact hunk: '+a.slice(0,100));return s.replace(a,()=>b);};
function definition(s,name){const mark='create or replace function public.'+name+'(';assert.equal(occurrences(s,mark),1,name);const start=s.indexOf(mark),end=s.indexOf('\n$$;',start);assert(end>start);return s.slice(start,end+4);}
function body(s){const a=s.indexOf('as $$');assert(a>=0);return s.slice(a+5,s.lastIndexOf('$$;')).trim();}
function currentHashes(s,counts){for(const[k,n]of Object.entries(counts))assert.equal(occurrences(s,OLD[k]),n);const map=Object.fromEntries(Object.keys(OLD).map(k=>[OLD[k],NEXT[k]]));return s.replace(/[0-9a-f]{64}/g,x=>map[x]??x);}
function signature(s){const m=/^create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/.exec(s);assert(m);const types=m[2].trim()?m[2].split(',').map(x=>{const words=x.trim().split(/\s+/);assert.equal(words.length,2);return words[1];}):[];return 'public.'+m[1]+'('+types.join(',')+')';}
const pgDefinitionCheck=(sig,hash)=>`  if (select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc, E' \\n\\r\\t'), 'UTF8'), 'sha256'), 'hex') from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('${sig}')) is distinct from '${hash}' then raise exception 'account/assistant function definition mismatch: ${sig}'; end if;`;

export async function buildAccountAssistantBindingSuccessor({root=ROOT}={}){
 const read=async p=>normalize(await fs.readFile(path.join(root,p),'utf8'));
 const predecessor=await read(SOURCE_130),casSource=await read(SOURCE_200);
 assert.equal(sha(predecessor),'55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6');
 assert.equal(sha(casSource),'b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18');
 const inputs=JSON.parse(await read(INPUT));assert.equal(inputs.schemaVersion,1);assert.equal(inputs.notMigrationTargets,true);assert.equal(inputs.inputs.length,2);
 const expectedInput=['d840f5bc8d71ba3852bcb742587a2b7acc2d712f12e2e80917c22a1d5820b566','9e9ff91afec7d87655dad1dc5e133005f35638ab1058c2eb4ae908120d55fb6b'];
 const accountParts=inputs.inputs.map((row,index)=>{assert.equal(row.sha256,expectedInput[index]);assert.equal(sha(row.text),row.sha256);const start=row.text.indexOf('begin;\n'),end=row.text.lastIndexOf("notify pgrst, 'reload schema';\ncommit;\n");assert(start>=0&&end>start);return row.text.slice(start+7,end).trim();});
 // No caller-supplied target hash: verify actual normal C->renderC->I->T.
 const candidate=await computeCandidateGRollbackBundle({root});const ctext=renderCandidateGRollbackGeneratedModule(candidate);
 assert.equal(candidate.modelBundleSha256,NEXT.C);assert.equal(candidate.manifest.files.length,66);
 assert.equal(await read('scripts/rollback-assets/ravscore-model-bundle.generated.js'),ctext);
 const integrated=await computeRavScoreModelBundle({root,sourceOverrides:new Map([['scripts/rollback-assets/ravscore-model-bundle.generated.js',ctext]])});
 assert.equal(integrated.modelBundleSha256,NEXT.I);assert.equal(integrated.manifest.files.length,68);
 assert.equal(await read('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));
 assert.equal(await ravScoreContinuationImplementationSha256({repositoryRoot:root}),NEXT.T);
 assert.equal(integrated.contractSha256,'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b');
 assert.equal(candidate.contractSha256,'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8');
 const replacements=[];
 const add=(name,after,source=predecessor)=>{const before=definition(source,name);replacements.push({name,before,after,signature:signature(before)});};
 for(const[name,counts]of [['integrated_state_valid',{I:1,C:0,T:0}],['payload_valid',{I:1,C:1,T:1}],['integrated_state_reason',{I:1,C:0,T:0}],['payload_reason',{I:1,C:1,T:1}]])add(CP+name,currentHashes(definition(predecessor,CP+name),counts));
 const tripName='ravradar_trip_v3_binding_allowed';let trip=definition(predecessor,tripName);
 for(const k of ['I','C'])trip=once(trip,"        '"+OLD[k]+"'\n      )","        '"+OLD[k]+"',\n        '"+NEXT[k]+"'\n      )");
 add(tripName,trip); // Existing exact central-active-binding guard remains separate and unchanged.
 const userdata=definition(predecessor,CP+'userdata_predecessor_projection');
 const previous050={I:'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb',C:'8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3',T:'4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51'};
 const map={};for(const k of ['I','C','T']){map[previous050[k]]=OLD[k];map[OLD[k]]=NEXT[k];}
 const projection=userdata.replace(CP+'userdata_predecessor_projection',PROJECTION).replace(/[0-9a-f]{64}/g,x=>map[x]??x);
 for(const[k,n]of [['I',2],['C',1],['T',1]]){assert.equal(occurrences(projection,OLD[k]),n);assert.equal(occurrences(projection,NEXT[k]),n);}
 // The exact 673 old-hash states are projected only in metadata, then subjected
 // to the FULL new current validator. No per-field weather/history exclusions.
 const validTail='  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n  then return v_projected; end if;';
 add(CP+'userdata_predecessor_projection',once(userdata,validTail,'  v_projected := public.'+PROJECTION+'(v_projected, p_target_reference);\n  if v_projected is not null then return v_projected; end if;'));
 let pred=currentHashes(definition(predecessor,CP+'predecessor_payload_valid'),{I:0,C:0,T:6});
 pred=once(pred,'begin\n',`begin\n  if p_current_implementation_sha256 = '${NEXT.T}'\n    and public.${PROJECTION}(p_payload, p_target_reference) is not null\n  then return true; end if;\n`);
 add(CP+'predecessor_payload_valid',pred);
 // Use the ACTUAL 200000 single-projection CAS, never 130000's retired body.
 let cas=definition(casSource,CP+'cas');
 cas=once(cas,'  v_userdata_predecessor_payload jsonb;','  v_userdata_predecessor_payload jsonb;\n  v_account_assistant_predecessor_payload jsonb;');
 cas=once(cas,"'"+OLD.T+"'","'"+NEXT.T+"'");
 cas=once(cas,"      case v_payload #>> '{modelBinding,modelBundleSha256}'",`      case v_payload #>> '{modelBinding,modelBundleSha256}'\n        when '${OLD.I}' then\n          v_account_assistant_predecessor_payload :=\n            public.${PROJECTION}(v_payload, v_central_reference);`);
 cas=once(cas,'    if v_userdata_predecessor_payload is not null','    if v_account_assistant_predecessor_payload is not null\n      or v_userdata_predecessor_payload is not null');
 const oldBranch='    if v_central_is_compatible_predecessor and v_userdata_predecessor_payload is not null then';
 cas=once(cas,oldBranch,`    if v_central_is_compatible_predecessor and v_account_assistant_predecessor_payload is not null then\n      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n        and (v_account_assistant_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}')\n        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}');\n    elsif v_central_is_compatible_predecessor and v_userdata_predecessor_payload is not null then`);
 add(CP+'cas',cas,casSource);
 let contract=definition(predecessor,CP+'contract');
 contract=once(contract,'  v_userdata_projection_definition text;','  v_userdata_projection_definition text;\n  v_account_assistant_projection_definition text;');
 contract=once(contract,"    pg_catalog.to_regprocedure('public."+CP+"userdata_predecessor_projection(jsonb,timestamptz)')\n  ];","    pg_catalog.to_regprocedure('public."+CP+"userdata_predecessor_projection(jsonb,timestamptz)'),\n    pg_catalog.to_regprocedure('public."+PROJECTION+"(jsonb,timestamptz)')\n  ];");
 contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_account_assistant_projection_definition\n  from pg_catalog.pg_proc p where p.oid = v_validator_oids[11];\n\n  v_checkpoint_definition := v_canonical_time_definition");
 contract=once(contract,"    || E'\\n-- userdata-predecessor-projection --\\n' || v_userdata_projection_definition;","    || E'\\n-- userdata-predecessor-projection --\\n' || v_userdata_projection_definition\n    || E'\\n-- account-assistant-predecessor-projection --\\n' || v_account_assistant_projection_definition;");
 contract=once(contract,"'20261010130000'","'"+ACCOUNT_ASSISTANT_SUCCESSOR_VERSION+"'");
 add(CP+'contract',contract);
 assert.equal(replacements.length,9);
 const beforeGuard=[`do $account_assistant_before$\nbegin\n  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '20261012200000' then raise exception 'account/assistant successor requires exact installed 200000 predecessor'; end if;\n  if pg_catalog.to_regclass('public.account_activity_journal') is not null or pg_catalog.to_regclass('public.account_statistics_preferences') is not null or pg_catalog.to_regprocedure('public.${PROJECTION}(jsonb,timestamptz)') is not null then raise exception 'account/assistant successor destination already exists'; end if;`,...replacements.map(r=>pgDefinitionCheck(r.signature,sha(body(r.before)))),`  if not coalesce((select p.prosecdef
    and 'search_path=pg_catalog, public'=any(p.proconfig)
    and 'statement_timeout=55s'=any(p.proconfig)
    and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    from pg_catalog.pg_proc p
    where p.oid=pg_catalog.to_regprocedure('public.${CP}cas(bigint,timestamptz,jsonb)')),false)
  then raise exception 'checkpoint CAS predecessor properties or ACL changed'; end if;`,'end;\n$account_assistant_before$;'].join('\n');
 const privateProjection=`${projection}\nrevoke all on function public.${PROJECTION}(jsonb,timestamptz) from public, anon, authenticated;`;
 const casAcl=`revoke all on function public.${CP}cas(bigint,timestamptz,jsonb) from public, anon, authenticated;\ngrant execute on function public.${CP}cas(bigint,timestamptz,jsonb) to service_role;\nalter function public.${CP}cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';`;
 const afterGuard=['do $account_assistant_after$\nbegin',...replacements.map(r=>pgDefinitionCheck(r.signature,sha(body(r.after)))),pgDefinitionCheck('public.'+PROJECTION+'(jsonb,timestamptz)',sha(body(projection))),`  if not coalesce((select p.prosecdef and 'search_path=pg_catalog, public'=any(p.proconfig) and 'statement_timeout=55s'=any(p.proconfig) from pg_catalog.pg_proc p where p.oid=pg_catalog.to_regprocedure('public.${CP}cas(bigint,timestamptz,jsonb)')),false) then raise exception 'checkpoint CAS properties changed'; end if;\n  if not pg_catalog.has_function_privilege('service_role','public.${CP}cas(bigint,timestamptz,jsonb)','EXECUTE') or pg_catalog.has_function_privilege('anon','public.${CP}cas(bigint,timestamptz,jsonb)','EXECUTE') or pg_catalog.has_function_privilege('authenticated','public.${CP}cas(bigint,timestamptz,jsonb)','EXECUTE') then raise exception 'checkpoint CAS ACL changed'; end if;\nend;\n$account_assistant_after$;`].join('\n');
 const migration=['-- Append-only account/assistant technical binding successor; no installation authority.','-- Preserve original data, numeric state, history, geometry and the 200000 single-projection CAS.','begin;',"set local lock_timeout = '5s';",beforeGuard,...accountParts,privateProjection,...replacements.map(r=>r.after),casAcl,afterGuard,"notify pgrst, 'reload schema';",'commit;'].join('\n\n')+'\n';
 // Canonical READ VIEW for normal sync/readback: pinned old source plus exact
 // new definitions. This is NOT executable whole-old-migration replay.
 let canonical=predecessor;
 for(const r of replacements){const original=definition(canonical,r.name);canonical=once(canonical,original,r.after);}
 canonical=once(canonical,definition(canonical,CP+'userdata_predecessor_projection'),privateProjection+'\n\n'+definition(canonical,CP+'userdata_predecessor_projection'));
 let inverse=canonical;inverse=once(inverse,privateProjection+'\n\n','');
 for(const r of [...replacements].reverse())inverse=once(inverse,r.after,definition(predecessor,r.name));
 assert.equal(inverse,predecessor,'No canonical source delta outside nine definitions plus new projection');
 assert.equal(occurrences(migration,'set local lock_timeout'),1);assert.equal(occurrences(migration,'\ncommit;'),1);
 assert.equal(occurrences(migration,'v_account_assistant_predecessor_payload :=\n            public.'+PROJECTION+'('),1);
 return Object.freeze({migration,canonicalSource:canonical,accountSource:accountParts.join('\n\n')+'\n',sourcePins:{predecessor:sha(predecessor),cas:sha(casSource)},changes:replacements.map(r=>({name:r.name,beforeBodySha256:sha(body(r.before)),afterBodySha256:sha(body(r.after))})),oldBinding:OLD,newBinding:NEXT});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3);const mode=process.argv[2];assert(['--write','--check'].includes(mode));
 const output=await buildAccountAssistantBindingSuccessor();const destination=path.join(ROOT,ACCOUNT_ASSISTANT_SUCCESSOR_PATH);
 if(mode==='--write'){
  try{await fs.writeFile(destination,output.migration,{encoding:'utf8',flag:'wx'});}
  catch(error){if(error?.code!=='EEXIST')throw error;}
 }
 // Existing targets are read-only: only an exact whole-byte match is a no-op.
 const target=await fs.lstat(destination);
 assert(target.isFile()&&!target.isSymbolicLink(),'Account/assistant successor target must be a regular non-symlink file');
 assert.deepEqual(await fs.readFile(destination),Buffer.from(output.migration,'utf8'),'Account/assistant successor migration is stale');
 console.log('Exact account/assistant successor source: original 130000/200000 immutable, C66/I68/T12, single-projection CAS, no numeric/history rewrite.');
}
