// Structural constructor plus the normal issued-only --check/--write entry.
// No release, tuple or SQL is guessed: the constructor remains DATA-only and
// the CLI refuses before construction or filesystem work while UNISSUED.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule} from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule} from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256} from './lib/ravscore-continuation-implementation-contract.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';
import {checkpointCasContractFromCanonicalSource,tripBindingPolicyFromCanonicalSource} from './integrated-cutover-readiness.mjs';
import {ASSISTANT_LATER_H0_BEFORE as OLD,ASSISTANT_LATER_H0_ALIASES as ALIASES,
  readAssistantLaterH0PredecessorCanonicalSource,assistantLaterH0Definition as definition,
  assistantLaterH0CheckpointContractFromBase,requireAssistantLaterH0Binding,
  requireAssistantLaterH0Output,assistantLaterH0Migration,
  ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
  readAssistantPublic587PredecessorCanonicalSource,assistantPublic587SuccessorCheckpointContractFromBase,
  requireAssistantPublic587SuccessorBinding,requireAssistantPublic587SuccessorOutput,
  requireAssistantPublic587SuccessorRelease,assistantPublic587SuccessorMigration,
  ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  readAssistantPublic588PredecessorCanonicalSource,assistantPublic588SuccessorCheckpointContractFromBase,
  requireAssistantPublic588SuccessorBinding,requireAssistantPublic588SuccessorOutput,
  requireAssistantPublic588SuccessorRelease,assistantPublic588SuccessorMigration,ACTIVE_ASSISTANT_SUCCESSOR}
  from './lib/assistant-later-h0-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const once=(s,a,b)=>{assert.equal(s.split(a).length,2,'One exact source insertion');return s.replace(a,()=>b);};
// Kun disse faste interne profilobjekter må vælge en forgænger.
// Ingen eksport eller caller-/miljøvalgt profil, rod, binding eller SQL-kilde.
const LEGACY586=Object.freeze({
  previous:OLD,aliases:ALIASES,previousRelease:586,validatorCount:31,
  readPredecessor:readAssistantLaterH0PredecessorCanonicalSource,
  checkpointFromBase:assistantLaterH0CheckpointContractFromBase,
  contractTail:"    || E'\\n-- native-original-continuity-same-h0-projection --\\n' || v_noc_same_h0_projection_definition;",
  kind:'ASSISTANT_LATER_H0_SUCCESSOR_STRUCTURE'});
const PUBLIC587=Object.freeze({
  previous:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
  previousRelease:587,validatorCount:33,
  readPredecessor:readAssistantPublic587PredecessorCanonicalSource,
  checkpointFromBase:assistantPublic587SuccessorCheckpointContractFromBase,
  contractTail:"    || E'\\n-- assistant-later-h0-original586-payload-validator --\\n' || v_ask586_payload_definition;",
  kind:'ASSISTANT_PUBLIC587_SUCCESSOR_STRUCTURE'});
const PUBLIC588=Object.freeze({
  previous:ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  previousRelease:588,validatorCount:35,
  readPredecessor:readAssistantPublic588PredecessorCanonicalSource,
  checkpointFromBase:assistantPublic588SuccessorCheckpointContractFromBase,
  contractTail:"    || E'\\n-- assistant-later-h0-original587-payload-validator --\\n' || v_ask587_payload_definition;",
  kind:'ASSISTANT_PUBLIC588_SUCCESSOR_STRUCTURE'});

function fixedProfile(profile){
  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');
  return profile;
}
function metadata(source,next,inventory,OLD){
  for(const key of ['C','I','T'])assert.equal(source.split(OLD[key]).length-1,inventory[key]??0);
  const forward=new Map(['C','I','T'].map(k=>[OLD[k],next[k]]));
  const backward=new Map([...forward].map(([a,b])=>[b,a]));
  const after=source.replace(/[a-f0-9]{64}/g,v=>forward.get(v)??v);
  assert.equal(after.replace(/[a-f0-9]{64}/g,v=>backward.get(v)??v),source,'Whole scalar metadata inverse');return after;
}
export async function prepareAssistantLaterH0SuccessorStructure({version}){
  assert.equal(arguments.length,1);
  return prepareStructure(LEGACY586,version);
}
export async function prepareAssistantPublic587SuccessorStructure(options){
  assert.equal(arguments.length,1);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['version'],'Kun normal tidsstempelinput; ingen caller-valgt profil eller tuple');
  return prepareStructure(PUBLIC587,options.version);
}
export async function prepareAssistantPublic588SuccessorStructure(options){
  assert.equal(arguments.length,1);
  assert(options&&Object.getPrototypeOf(options)===Object.prototype);
  assert.deepEqual(Object.keys(options),['version'],'Kun normal tidsstempelinput; ingen caller-valgt profil eller tuple');
  return prepareStructure(PUBLIC588,options.version);
}

async function prepareStructure(profile,version){
  fixedProfile(profile);
  const OLD=profile.previous,ALIASES=profile.aliases;
  assert.match(version,/^[0-9]{14}$/);assert(version>OLD.version);
  // Version is a FUTURE ordinary constructor input, not issued by this call.
  // No caller-supplied C/I/T; the normal coherent physical graph is authority.
  const C=await computeCandidateGRollbackBundle();
  assert.equal((await fs.readFile(path.join(ROOT,'scripts/rollback-assets/ravscore-model-bundle.generated.js'),'utf8')).replace(/\r\n?/g,'\n'),
    renderCandidateGRollbackGeneratedModule(C));
  const I=await computeRavScoreModelBundle();
  assert.equal((await fs.readFile(path.join(ROOT,'js/core/ravscore-model-bundle.generated.js'),'utf8')).replace(/\r\n?/g,'\n'),
    renderGeneratedBundleModule(I));
  const next={version,C:C.modelBundleSha256,I:I.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  assert.equal(new Set(['C','I','T'].flatMap(k=>[OLD[k],next[k]])).size,6);
  const prior=await profile.readPredecessor(),before=prior.canonicalSource;
  assert.equal(sha(before),OLD.canonicalSha256);
  const [stateAlias,payloadAlias]=ALIASES.map(r=>r.name);
  for(const row of ALIASES)assert(!before.includes('function public.'+row.name+'('));
  const stateBefore=definition(before,CP+'integrated_state_valid'),payloadBefore=definition(before,CP+'payload_valid');
  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+stateAlias+'(');
  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+payloadAlias+'('),
    'public.'+CP+'integrated_state_valid(','public.'+stateAlias+'(');
  assert.equal(once(state,'function public.'+stateAlias+'(','function public.'+CP+'integrated_state_valid('),stateBefore);
  assert.equal(once(once(payload,'function public.'+payloadAlias+'(','function public.'+CP+'payload_valid('),
    'public.'+stateAlias+'(','public.'+CP+'integrated_state_valid('),payloadBefore);
  const aliases=[{...ALIASES[0],definition:state},{...ALIASES[1],definition:payload}];
  const changes=[],add=(name,after)=>changes.push({name,before:definition(before,name),after});
  for(const [suffix,inventory] of [['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])
    add(CP+suffix,metadata(definition(before,CP+suffix),next,inventory,OLD));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )","        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);
  const casBefore=definition(before,CP+'cas'),prefix='    elsif p_target_reference > v_central_reference\n';
  const at=casBefore.indexOf(prefix);assert(at>=0);
  const branch=prefix+"      and p_payload ->> 'continuationStateContractSha256' = '"+next.T+"'\n"
    +'      and public.'+payloadAlias+'(v_payload,v_central_reference)\n    then\n'
    +'      -- Authenticated immutable'+profile.previousRelease+' predecessor; only a strictly LATER ordinary generation.\n'
    +'      v_central_is_compatible_predecessor := false;\n';
  const cas=casBefore.slice(0,at)+branch+casBefore.slice(at);
  assert.equal(cas.replace(branch,''),casBefore,'Whole normal CAS inverse; same-target code is untouched');
  add(CP+'cas',cas);
  const contractBefore=definition(before,CP+'contract'),vars=['v_ask'+profile.previousRelease+'_state_definition','v_ask'+profile.previousRelease+'_payload_definition'];
  let contract=once(contractBefore,'declare\n','declare\n  '+vars.join(' text;\n  ')+' text;\n');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);assert(oid);
  const count=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(/g)].length;assert.equal(count,profile.validatorCount);
  const extra=ALIASES.map(row=>"    pg_catalog.to_regprocedure('public."+row.name+row.signature+"')").join(',\n');
  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\n'+extra+'\n  ];');
  const loads=vars.map((v,i)=>"  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into "+v+'\n'
    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(count+i+1)+'];\n').join('\n');
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',loads+'\n  v_checkpoint_definition := v_canonical_time_definition');
  const tail=profile.contractTail;
  contract=once(contract,tail,tail.slice(0,-1)+vars.map((v,i)=>"\n    || E'\\n-- assistant-later-h0-original"+profile.previousRelease+"-"
    +(i===0?'state':'payload')+"-validator --\\n' || "+v).join('')+';');
  contract=once(contract,"where m.version::text = '"+OLD.version+"'","where m.version::text = '"+version+"'");
  add(CP+'contract',contract);
  const addition=aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  canonicalSource=once(canonicalSource,changes[0].after,addition+changes[0].after);
  let inverse=once(canonicalSource,addition,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole genuine'+profile.previousRelease+' canonical inverse');
  for(const original of prior.originalDefinitions)assert.equal(definition(canonicalSource,original.name),original.definition);
  for(const name of [...before.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]))
    if(!changes.some(row=>row.name===name))assert.equal(definition(canonicalSource,name),definition(before,name),'Every untouched historical function whole');
  const checkpoint=profile.checkpointFromBase(canonicalSource,
    checkpointCasContractFromCanonicalSource(canonicalSource,{sourcePhase:'native-original-continuity'}));
  return Object.freeze({schemaVersion:1,kind:profile.kind,admission:'NO_ADMISSION',
    nextBinding:next,aliases,changes,canonicalSource,canonicalSha256:sha(canonicalSource),
    checkpointContractSha256:checkpoint.sha256,tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(canonicalSource).sha256,
    originalCanonicalSha256:sha(before),wholeCanonicalInverse:true,sameH0Capability:false,
    numericalSqlRulesChanged:false,migrationIssued:false,sqlExecuted:false,installationPerformed:false});
}

const CORE_REPLACEMENTS=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason']
.map(s=>CP+s).concat(['ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const literal=value=>{assert(typeof value==='string'&&!value.includes("'"));return "'"+value+"'";};

function body(source){
  const start=source.indexOf('as $$');assert(start>0);
  return source.slice(start+5,source.lastIndexOf('$$;')).trim();
}

function signature(source){
  const m=/^create or replace function public\.([a-z0-9_]+)\(([\s\S]*?)\)\s*returns/.exec(source);assert(m);
  const types=m[2].trim()?m[2].split(',').map(arg=>{const words=arg.trim().split(/\s+/);assert.equal(words.length,2);return words[1];}):[];
  return 'public.'+m[1]+'('+types.join(',')+')';
}

function headerProperties(source){
  const header=source.slice(0,source.indexOf('as $$'));
  const language=/\blanguage (sql|plpgsql)\b/.exec(header);assert(language);
  const result=/\breturns ([a-z]+)\b/.exec(header);assert(result);
  const configs=[...header.matchAll(/^set ([a-z_]+) = (.+)$/gm)].map(m=>m[1]+'='+m[2]);
  assert.deepEqual(configs,['search_path=pg_catalog, public'],'Exact normal header config');
  if(signature(source)==='public.'+CP+'cas(bigint,timestamptz,jsonb)')configs.push('statement_timeout=55s');
  return {language:language[1],result:result[1],definer:/\bsecurity definer\b/.test(header),
    volatility:/\bimmutable\b/.test(header)?'i':/\bstable\b/.test(header)?'s':'v',configs:configs.sort()};
}

function definitionGuard(source){
  const sig=signature(source),p=headerProperties(source);
  const config='array['+p.configs.map(literal).join(',')+']::text[]';
  const noPublic=sig!=='public.version_admin_document()';
  return `  if not coalesce((select p.prokind='f' and l.lanname=${literal(p.language)}
    and p.prorettype=${literal(p.result)}::regtype and not p.proretset
    and p.prosecdef=${p.definer} and p.provolatile=${literal(p.volatility)}
    and not p.proisstrict and not p.proleakproof and p.provariadic=0 and p.pronargdefaults=0
    and array(select unnest(p.proconfig) order by 1)=${config}
    and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \\n\\r\\t'),'UTF8'),'sha256'),'hex')=${literal(sha(body(source)))}
    ${noPublic?`and not pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    and not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      where a.grantee<>p.proowner and (a.grantee<>('service_role'::regrole)::oid or a.is_grantable))`:''}
    ${sig==='public.'+CP+'cas(bigint,timestamptz,jsonb)'?"and pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')":''}
    from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid=pg_catalog.to_regprocedure(${literal(sig)})),false)
    then raise exception 'CMW_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: ${sig}'; end if;`.replace(/^ +$/gm,'');
}

function schema2Guard(expected){
  assert.equal(sha(statisticsPreferenceRevisionCatalogQuery),'721ac0938241c1b3d7349e154e78a29e0d94647d67e5885253def69517bb98d1');
  assert.equal(expected.schemaVersion,2);assert.equal(Object.keys(expected.functions).length,5);
  const json=JSON.stringify(expected);assert(!json.includes('$cmw_expected$'));
  return `  select q.metadata into account_observed from (${statisticsPreferenceRevisionCatalogQuery.trim().slice(0,-1)}) q;
  foreach function_name in array array[${Object.keys(expected.functions).map(literal).join(',')}] loop
    if pg_catalog.jsonb_typeof(account_observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'CMW_SQL_SCHEMA2_SERVICE_SHAPE'; end if;
    -- Exact existing230 normalization only. ACL itself is preserved separately.
    account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if account_observed #> array['functions',function_name,'configuration']='["search_path="]'::jsonb then
      account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if account_observed is distinct from $cmw_expected$${json}$cmw_expected$::jsonb
    then raise exception 'CMW_SQL_EXACT_SCHEMA2_REQUIRED'; end if;`;
}

function preservationQuery(signatures){
  // No row/payload values. Includes actual old OIDs, ownership, ACL, defaults,
  // properties and account definitions. Body changes are checked separately.
  return `select pg_catalog.jsonb_build_object(
    'functions',(select pg_catalog.jsonb_object_agg(p.oid::text,
      pg_catalog.to_jsonb(p)-array['prosrc','prosqlbody']) from pg_catalog.pg_proc p
      where p.oid=any(array[${signatures.map(sig=>literal(sig)+'::regprocedure').join(',')}])),
    'accountFunctions',(select pg_catalog.jsonb_object_agg(p.proname,pg_catalog.to_jsonb(p))
      from pg_catalog.pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(array[
        'record_account_activity','get_own_statistics_preference','enable_own_statistics_preference',
        'disable_own_statistics_preference','set_own_statistics_preference'])),
    'tables',(select pg_catalog.jsonb_object_agg(r.relname,pg_catalog.jsonb_build_object(
      'relation',pg_catalog.jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
        'kind',r.relkind,'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'options',r.reloptions),
      'columns',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) order by a.attnum) from pg_catalog.pg_attribute a where a.attrelid=r.oid),
      'constraints',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) order by c.oid) from pg_catalog.pg_constraint c where c.conrelid=r.oid),
      'policies',(select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p) order by p.oid) from pg_catalog.pg_policy p where p.polrelid=r.oid)))
      from pg_catalog.pg_class r where r.oid=any(array['public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass])))`;
}




function wrap(core,prior,profile=LEGACY586){
  fixedProfile(profile);const OLD=profile.previous;
  assert.equal(core.kind,profile.kind);
  assert(core.wholeCanonicalInverse&&!core.sameH0Capability&&!core.numericalSqlRulesChanged);
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);assert.equal(prior.statisticsSchemaVersion,2);
  const names=[...prior.canonicalSource.matchAll(/^create or replace function public\.((?:ravradar_ravscore_checkpoint_[a-z0-9_]+)|version_admin_document|ravradar_trip_v3_binding_allowed)\(/gm)].map(m=>m[1]);
  assert.equal(names.length,new Set(names).size);const definitions=names.map(name=>definition(prior.canonicalSource,name));
  const signatures=definitions.map(signature),all=[...signatures,...core.aliases.map(row=>'public.'+row.name+row.signature)];
  assert.equal(new Set(all.map(value=>value.replace(/^public\.([a-z0-9_]+)\(/,(_all,name)=>'public.'+name.slice(0,63)+'('))).size,all.length);
  const commands=core.aliases.flatMap(row=>[row.definition,'revoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;'])
    .concat(core.changes.map(row=>row.after),['alter function public.'+CP+"cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';"]);
  assert(commands.every(value=>value.startsWith('create or replace function ')||value.startsWith('revoke all on function ')||value.startsWith('alter function public.'+CP+'cas(')));
  const ddl=commands.map((command,index)=>{const tag='$assistant_later_h0_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const absent=core.aliases.map(row=>"  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='"+row.name+"') then raise exception 'ASSISTANT_LATER_H0_DESTINATION_EXISTS'; end if;");
  const snapshot=preservationQuery(signatures);
  const prefix=['do $assistant_later_h0_successor$',
    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;','begin',
    "  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '"+OLD.version+"' then raise exception 'ASSISTANT_LATER_H0_EXACT_INSTALLED"+profile.previousRelease+"_REQUIRED'; end if;",
    "  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'ASSISTANT_LATER_H0_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;",
    "  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'ASSISTANT_LATER_H0_INSTALLED230_REQUIRED'; end if;",
    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\n');
  const migration=['-- Original-preserving post'+profile.previousRelease+' assistant strictly-later-H0 successor; SOURCE ONLY.',
    '-- Existing'+profile.previousRelease+' and older originals/projections and ALL numerical SQL guards preserved.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",prefix,...absent,
    ...definitions.map(definitionGuard),schema2Guard(prior.statisticsExpected),'  '+snapshot+' into original_catalog;',...ddl,
    ...names.map(name=>definitionGuard(definition(core.canonicalSource,name))),...core.aliases.map(row=>definitionGuard(row.definition)),
    schema2Guard(prior.statisticsExpected),'  '+snapshot+' into after_catalog;',
    "  if after_catalog is distinct from original_catalog then raise exception 'ASSISTANT_LATER_H0_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;",
    'end;\n$assistant_later_h0_successor$;',"notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...core.aliases.map(row=>row.name),...CORE_REPLACEMENTS]);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),afterCanonicalSha256:sha(core.canonicalSource),
    transactionalWrapperPrepared:true,statisticsSchema2Source:prior.statisticsSchema2Source,postgresRun:false,migrationIssued:false,productionAuthority:false});
}

export async function buildAssistantLaterH0BindingSuccessor(options){
  const core=await prepareAssistantLaterH0SuccessorStructure(options),prior=await readAssistantLaterH0PredecessorCanonicalSource();
  const result=wrap(core,prior);
  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);
  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});
}

export async function buildAssistantPublic587BindingSuccessor(options){
  assert.equal(arguments.length,1);
  const core=await prepareAssistantPublic587SuccessorStructure(options);
  const prior=await readAssistantPublic587PredecessorCanonicalSource();
  const result=wrap(core,prior,PUBLIC587);
  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);
  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});
}

export async function buildAssistantPublic588BindingSuccessor(options){
  assert.equal(arguments.length,1);
  const core=await prepareAssistantPublic588SuccessorStructure(options);
  const prior=await readAssistantPublic588PredecessorCanonicalSource();
  const result=wrap(core,prior,PUBLIC588);
  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);
  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});
}


async function main(){
  const args=process.argv.slice(2);
  if(args[0]==='--active'){
    // Det eksisterende normale source-mål følger kun det kildeejede aktive objekt.
    // De navngivne gamle CLI-indgange bevares til autentiske frozen-banker.
    assert(['assistant-public587-successor','assistant-public588-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));
    args.shift();args.unshift(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'
      ?'--public588-successor':'--public587-successor');
  }
  const public588=args[0]==='--public588-successor',public587=args[0]==='--public587-successor';
  if(public588||public587)args.shift();
  if(public588){
    // Lukket ny indgang: NULL afvises før konstruktion, modelberegning eller fil-I/O.
    const issued=requireAssistantPublic588SuccessorBinding(),pins=requireAssistantPublic588SuccessorOutput();
    requireAssistantPublic588SuccessorRelease();
    assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));
    const result=await buildAssistantPublic588BindingSuccessor({version:issued.version});
    assert.deepEqual(result.nextBinding,issued,'Only the actual physical issued C/I/T');
    assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
      checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
    const migration=assistantPublic588SuccessorMigration(),file=path.join(ROOT,'supabase/migrations',migration.filename);
    if(args[0]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
    else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
    console.log('Exact original-preserving calendar588 later-H0 metadata source checked; no installation or state admission.');
    return;
  }
  assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));
  // Den nye faste indgang afviser UNISSUED før konstruktør, fil-I/O eller SQL.
  // Den oprindelige indgang vælger fortsat præcis den allerede udstedte 587.
  const issued=public587?requireAssistantPublic587SuccessorBinding():requireAssistantLaterH0Binding();
  const pins=public587?requireAssistantPublic587SuccessorOutput():requireAssistantLaterH0Output();
  if(public587)requireAssistantPublic587SuccessorRelease();
  const result=public587?await buildAssistantPublic587BindingSuccessor({version:issued.version})
    :await buildAssistantLaterH0BindingSuccessor({version:issued.version});
  assert.deepEqual(result.nextBinding,issued,'Only the actual physical issued C/I/T');
  assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,
    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);
  const migration=public587?assistantPublic587SuccessorMigration():assistantLaterH0Migration();
  const file=path.join(ROOT,'supabase/migrations',migration.filename);
  if(args[0]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});
  else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));
  console.log('Exact original-preserving assistant later-H0 metadata source checked; no installation or state admission.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
