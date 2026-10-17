// Fixed assistant-after0200 phase after whole issued0200 + installed statistics230.
// Source rendering/checking does not install SQL or establish production effect.
// Relative imports below are the existing normal repository APIs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule}
  from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule}
  from './build-ravscore-model-bundle.mjs';
import {ravScoreContinuationImplementationSha256}
  from './lib/ravscore-continuation-implementation-contract.mjs';
import {ASSISTANT_KNOWLEDGE_OUTPUT,requireAssistantKnowledgeBinding,requireAssistantKnowledgeOutput,assistantKnowledgeMigration,
  ASSISTANT_KNOWLEDGE_PROJECTION,ASSISTANT_KNOWLEDGE_REPLACEMENTS,ASSISTANT_KNOWLEDGE_BEFORE,
  ASSISTANT_KNOWLEDGE_SCHEMA2_SHA,readAssistantKnowledgeBeforeSource,assistantKnowledgeDefinition as kbDefinition}
  from './lib/assistant-knowledge-successor-source.mjs';
import {statisticsPreferenceRevisionCatalogQuery} from './verify-account-assistant-schema.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CP='ravradar_ravscore_checkpoint_';
const PROJECTION=ASSISTANT_KNOWLEDGE_PROJECTION; // Below PostgreSQL's 63-byte identifier limit.
const OLD=Object.freeze({
  I:ASSISTANT_KNOWLEDGE_BEFORE.integrated,
  C:ASSISTANT_KNOWLEDGE_BEFORE.candidate,
  T:ASSISTANT_KNOWLEDGE_BEFORE.continuation,
});
// This new phase does not rebuild, edit or retag either issued1414/1503 SQL.
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(source,value)=>source.split(value).length-1;
function once(source,before,after){
  assert.equal(count(source,before),1,'Exact unique response source hunk required');
  return source.replace(before,()=>after);
}
function definition(source,name){
  const marker='create or replace function public.'+name+'(';
  assert.equal(count(source,marker),1,'Whole canonical function required: '+name);
  const start=source.indexOf(marker),end=source.indexOf('\n$$;',start);
  assert(end>start);return source.slice(start,end+4);
}
function body(source){
  const start=source.indexOf('as $$');assert(start>0);
  return source.slice(start+5,source.lastIndexOf('$$;')).trim();
}
async function readRegular(relative){
  const filename=path.join(ROOT,relative),stat=await fs.lstat(filename);
  assert(stat.isFile()&&!stat.isSymbolicLink(),'Regular source required: '+relative);
  return fs.readFile(filename);
}
function currentHashes(source,next,counts){
  let after=source;
  for(const key of ['I','C','T']){
    assert.equal(count(source,OLD[key]),counts[key]??0,'Fixed current metadata occurrence '+key);
    assert.equal(count(source,next[key]),0,'New hash already present');
    after=after.split(OLD[key]).join(next[key]);
  }
  let inverse=after;
  for(const key of ['I','C','T'])inverse=inverse.split(next[key]).join(OLD[key]);
  assert.equal(inverse,source,'Whole validator metadata-only inverse');return after;
}

// Fixed normal entry, with no root/options/hash/sourceOverrides admission.
export async function prepareAssistantKnowledgeMetadataSource(){
  assert.equal(arguments.length,0,'No source or binding override');
  const ISSUED_RESPONSE=requireAssistantKnowledgeBinding();
  assert.deepEqual(Object.keys(ISSUED_RESPONSE).sort(),
    ['C','I','T','candidateManifestSha256','integratedManifestSha256','version']);
  const next=ISSUED_RESPONSE;
  assert.match(next.version,/^\d{14}$/);assert(next.version>ASSISTANT_KNOWLEDGE_BEFORE.version);
  for(const key of ['I','C','T']){
    assert.match(next[key],/^[a-f0-9]{64}$/);assert.notEqual(next[key],OLD[key]);
  }
  assert.equal(new Set([next.I,next.C,next.T,OLD.I,OLD.C,OLD.T]).size,6);
  assert(Buffer.byteLength(PROJECTION,'ascii')<=63);
  const issuedBefore=await readAssistantKnowledgeBeforeSource();
  const {canonicalSource:before,historicalSchema1,statisticsSchema2Source,statisticsExpected}=issuedBefore;
  assert.equal(sha(before),ASSISTANT_KNOWLEDGE_BEFORE.canonicalSha256);
  assert.equal(sha(historicalSchema1),ASSISTANT_KNOWLEDGE_BEFORE.accountSourceSha256);
  assert.equal(sha(statisticsSchema2Source),ASSISTANT_KNOWLEDGE_SCHEMA2_SHA);
  assert.equal(issuedBefore.statisticsSchemaVersion,2);
  assert.equal(issuedBefore.migration.version,ASSISTANT_KNOWLEDGE_BEFORE.version);

  const candidate=await computeCandidateGRollbackBundle();
  assert.equal(candidate.contractSha256,'c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8');
  assert.equal(candidate.modelBundleSha256,next.C);
  assert.equal(sha(JSON.stringify(candidate.manifest)),next.candidateManifestSha256);
  assert.equal((await readRegular('scripts/rollback-assets/ravscore-model-bundle.generated.js'))
    .toString('utf8').replace(/\r\n?/g,'\n'),renderCandidateGRollbackGeneratedModule(candidate));
  // The real rendered C is already on disk before this normal I call.
  const integrated=await computeRavScoreModelBundle();
  assert.equal(integrated.contractSha256,'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b');
  assert.equal(integrated.modelBundleSha256,next.I);
  assert.equal(sha(JSON.stringify(integrated.manifest)),next.integratedManifestSha256);
  assert.equal((await readRegular('js/core/ravscore-model-bundle.generated.js'))
    .toString('utf8').replace(/\r\n?/g,'\n'),renderGeneratedBundleModule(integrated));
  assert.equal(await ravScoreContinuationImplementationSha256(),next.T);

  const core=compileCurrentMemory0200Structure(issuedBefore,next);
  assert.deepEqual(await readAssistantKnowledgeBeforeSource(),issuedBefore,
    'Every issued source and schema2 initializer stays exact');
  return core;
}

function compileCurrentMemory0200Structure(issuedBefore,next){
  const {canonicalSource:before,historicalSchema1,statisticsSchema2Source,statisticsExpected}=issuedBefore;
  const changes=[];
  const add=(name,after)=>changes.push(Object.freeze({name,before:definition(before,name),after}));
  for(const [suffix,counts] of [
    ['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],
    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}],
  ])add(CP+suffix,currentHashes(definition(before,CP+suffix),next,counts));
  let trip=definition(before,'ravradar_trip_v3_binding_allowed');
  for(const key of ['I','C'])trip=once(trip,"        '"+OLD[key]+"'\n      )",
    "        '"+OLD[key]+"',\n        '"+next[key]+"'\n      )");
  add('ravradar_trip_v3_binding_allowed',trip);

  // Exact213 projection structure, reissued under a NEW short private name.
  // These are a bijective METADATA view, not authentication or original retag.
  const projectionSource=definition(before,CP+'account_assistant_predecessor_projection');
  const previous={I:'249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932',
    C:'55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957',
    T:'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0'};
  const previousNext={I:'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5',
    C:'2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9',
    T:'7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b'};
  const map=new Map(),inverseMap=new Map();
  for(const [key,n] of [['I',2],['C',1],['T',1]]){
    assert.equal(count(projectionSource,previous[key]),n);
    assert.equal(count(projectionSource,previousNext[key]),n);
    map.set(previous[key],OLD[key]);map.set(previousNext[key],next[key]);
    inverseMap.set(OLD[key],previous[key]);inverseMap.set(next[key],previousNext[key]);
  }
  let projection=once(projectionSource,'function public.'+CP+'account_assistant_predecessor_projection(',
    'function public.'+PROJECTION+'(').replace(/[a-f0-9]{64}/g,value=>map.get(value)??value);
  const projectionInverse=once(projection,'function public.'+PROJECTION+'(',
    'function public.'+CP+'account_assistant_predecessor_projection(')
    .replace(/[a-f0-9]{64}/g,value=>inverseMap.get(value)??value);
  assert.equal(projectionInverse,projectionSource,'Whole projection structure and numeric/673 guards');
  let predecessor=definition(before,CP+'predecessor_payload_valid');
  predecessor=once(predecessor,'begin\n',`begin\n  if p_current_implementation_sha256 = '${next.T}'\n    and p_payload #>> '{modelBinding,modelBundleSha256}' = '${OLD.I}'\n    and public.${PROJECTION}(p_payload, p_target_reference) is not null\n  then return true; end if;\n`);
  add(CP+'predecessor_payload_valid',predecessor);

  const casBefore=definition(before,CP+'cas');
  let cas=casBefore;
  cas=once(cas,'  v_account_assistant_predecessor_payload jsonb;',
    '  v_account_assistant_predecessor_payload jsonb;\n  v_ak_predecessor_payload jsonb;');
  const dispatch="    if p_payload ->> 'continuationStateContractSha256' =\n      '"+previousNext.T+"'\n    then";
  cas=once(cas,dispatch,`    if p_payload ->> 'continuationStateContractSha256' = '${next.T}'\n      and v_payload #>> '{modelBinding,modelBundleSha256}' = '${OLD.I}'\n    then\n      v_ak_predecessor_payload := public.${PROJECTION}(v_payload, v_central_reference);\n    end if;\n`+dispatch);
  cas=once(cas,'    if v_cmw_predecessor_payload is not null',
    '    if v_ak_predecessor_payload is not null\n      or v_cmw_predecessor_payload is not null');
  const comparison='    if v_central_is_compatible_predecessor and v_cmw_predecessor_payload is not null then';
  cas=once(cas,comparison,`    if v_central_is_compatible_predecessor and v_ak_predecessor_payload is not null then\n      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n        and (v_ak_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}')\n        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n          #- '{candidateGRollbackCompanion,generationSha256}');\n    elsif v_central_is_compatible_predecessor and v_cmw_predecessor_payload is not null then`);
  assert.equal(count(cas,'v_ak_predecessor_payload := public.'+PROJECTION+'('),1);
  const oldDispatchStart=casBefore.indexOf(dispatch);
  const oldDispatchEnd=casBefore.indexOf('\n    if v_cmw_predecessor_payload is not null',oldDispatchStart+dispatch.length);
  assert(oldDispatchStart>=0&&oldDispatchEnd>oldDispatchStart);
  assert(cas.includes(casBefore.slice(oldDispatchStart,oldDispatchEnd)),'Whole issued213 dispatch stays exact');
  const oldComparisonStart=casBefore.indexOf(comparison);
  const oldComparisonEnd=casBefore.indexOf('\n    elsif ',oldComparisonStart+comparison.length);
  assert(oldComparisonStart>=0&&oldComparisonEnd>oldComparisonStart);
  assert(cas.includes(casBefore.slice(oldComparisonStart,oldComparisonEnd).replace('    if ','    elsif ')),
    'Whole issued213 comparison body stays exact');
  const retryTail=casBefore.indexOf('    -- Equality is checked before the expected version.');
  assert(retryTail>=0&&cas.endsWith(casBefore.slice(retryTail)),'Whole idempotency/refusal/update tail stays exact');
  const numericalPrefix='    elsif p_target_reference > v_central_reference\n';
  const numericStart=casBefore.indexOf(numericalPrefix);
  const numericEnd=casBefore.indexOf('\n    elsif ',numericStart+numericalPrefix.length);
  assert(numericStart>=0&&numericEnd>numericStart);
  // Only the immediate0200 T-gated arm is cloned. Every older numerical arm
  // remains exactly once in its old order; do not duplicate a whole elsif tail.
  const oldNumerical=casBefore.slice(numericStart,numericEnd+1);
  assert.equal(count(oldNumerical,OLD.T),1);
  const nextNumerical=oldNumerical.replace(OLD.T,next.T);
  cas=once(cas,oldNumerical,nextNumerical+oldNumerical);
  assert(cas.includes(oldNumerical),'Whole0200 numerical branch stays exact');
  assert.equal(count(cas,oldNumerical),1,'Do not duplicate the immediate old arm');
  add(CP+'cas',cas);

  let contract=definition(before,CP+'contract');
  contract=once(contract,'  v_grid_c1ac_payload_definition text;',
    '  v_grid_c1ac_payload_definition text;\n  v_ak_projection_definition text;');
  const oidTail="    pg_catalog.to_regprocedure('public."+CP+"cmw_predecessor_projection(jsonb,timestamptz)')\n  ];";
  contract=once(contract,oidTail,oidTail.slice(0,-5)+",\n    pg_catalog.to_regprocedure('public."+PROJECTION+"(jsonb,timestamptz)')\n  ];");
  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',
    "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_ak_projection_definition\n  from pg_catalog.pg_proc p where p.oid = v_validator_oids[21];\n\n  v_checkpoint_definition := v_canonical_time_definition");
  const bodyTail="    || E'\\n-- current-memory-warmup-predecessor-projection --\\n' || v_cmw_projection_definition;";
  contract=once(contract,bodyTail,bodyTail.slice(0,-1)+"\n    || E'\\n-- assistant-knowledge-predecessor-projection --\\n' || v_ak_projection_definition;");
  contract=once(contract,"where m.version::text = '20261017020000'",
    "where m.version::text = '"+next.version+"'");
  add(CP+'contract',contract);
  assert.equal(changes.length,8);
  const privateProjection=projection+'\nrevoke all on function public.'+PROJECTION
    +'(jsonb,timestamptz) from public, anon, authenticated;';
  let canonicalSource=before;
  for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');
  canonicalSource=once(canonicalSource,anchor,privateProjection+'\n\n'+anchor);
  let inverse=once(canonicalSource,privateProjection+'\n\n','');
  for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);
  assert.equal(inverse,before,'Whole current0200 canonical inverse: only eight replacements and one new projection');
  assert(!canonicalSource.includes(CP+'kb_predecessor_projection'),'Archived14140000 must not enter runtime');
  for(const name of [...['ffc','249','c1ac'].flatMap(family=>['state','payload'].map(kind=>CP+'grid_'+family+'_'+kind+'_valid')),
    CP+'native_identity_i71_state_valid',CP+'native_identity_i71_payload_valid']){
    assert.equal(definition(canonicalSource,name),definition(before,name),'Whole original-family validator preserved');
  }
  return Object.freeze({canonicalSource,projection,changes:Object.freeze(changes),
    beforeCanonicalSha256:sha(before),afterCanonicalSha256:sha(canonicalSource),
    changedDefinitions:changes.map(row=>({name:row.name,beforeBodySha256:sha(body(row.before)),afterBodySha256:sha(body(row.after))})),
    historicalSchema1,statisticsSchema2Source,statisticsSchema2Expected:statisticsExpected,
    oldBinding:OLD,newBinding:next,migration:null,canonicalIssuer:false,installation:false});
}

export async function inspectAssistantKnowledgeStructure(options){
  assert.equal(arguments.length,0,'No inspection binding or source override');
  const prior=await readAssistantKnowledgeBeforeSource();
  const core=await prepareAssistantKnowledgeMetadataSource();
  const beforeContract=definition(prior.canonicalSource,CP+'contract');
  const afterContract=definition(core.canonicalSource,CP+'contract');
  const slots=s=>[...s.split('  v_validator_oids oid[] := array[')[1].split('\n  ];')[0]
    .matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(m=>m[1]);
  const oldSlots=slots(beforeContract),newSlots=slots(afterContract);
  assert.equal(oldSlots.length,20);assert.equal(newSlots.length,21);
  assert.deepEqual(newSlots.slice(0,20),oldSlots);
  assert.equal(newSlots[20],'public.'+PROJECTION+'(jsonb,timestamptz)');
  const bodies=s=>[...s.split('  v_checkpoint_definition := ')[1].split(';')[0]
    .matchAll(/\bv_[a-z0-9_]+_definition\b/g)].map(m=>m[0]);
  const oldBodies=bodies(beforeContract),newBodies=bodies(afterContract);
  assert.equal(oldBodies.length,23);assert.equal(newBodies.length,24);
  assert.deepEqual(newBodies.slice(0,23),oldBodies);
  assert.equal(newBodies[23],'v_ak_projection_definition');
  assert(afterContract.includes('p.oid = v_validator_oids[18]'));
  assert(afterContract.includes('p.oid = v_validator_oids[19]'));
  assert(afterContract.includes('p.oid = v_validator_oids[20]'));
  assert(afterContract.includes('p.oid = v_validator_oids[21]'));
  assert(afterContract.includes("then '20260920220000' else null end"));
  return Object.freeze({kind:'ACTUAL_ASSISTANT_KNOWLEDGE_SOURCE_STRUCTURE',migration:assistantKnowledgeMigration(),newBinding:core.newBinding,
    oldCanonicalSha256:core.beforeCanonicalSha256,inverseCanonicalSha256:prior.predecessor.canonicalSha256,
    replacements:Object.freeze(core.changes.map(row=>row.name)),originalCount:prior.originalDefinitions.length,
    oldSlots:Object.freeze(oldSlots),newSlots:Object.freeze(newSlots),
    oldBodies:Object.freeze(oldBodies),newBodies:Object.freeze(newBodies),wholeInverse:true,
    oldDispatchPreserved:true,oldNumericalBranchPreserved:true,retryTailPreserved:true,
    numericalNewReferenceOnly:true,canonicalIssuer:false,installation:false});
}
const literal=value=>{assert(typeof value==='string'&&!value.includes("'"));return "'"+value+"'";};
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
    then raise exception 'AK_SQL_FUNCTION_BODY_OR_PROPERTIES_MISMATCH: ${sig}'; end if;`.replace(/^ +$/gm,'');
}
function schema2Guard(expected){
  assert.equal(sha(statisticsPreferenceRevisionCatalogQuery),'721ac0938241c1b3d7349e154e78a29e0d94647d67e5885253def69517bb98d1');
  assert.equal(expected.schemaVersion,2);assert.equal(Object.keys(expected.functions).length,5);
  const json=JSON.stringify(expected);assert(!json.includes('$ak_expected$'));
  return `  select q.metadata into account_observed from (${statisticsPreferenceRevisionCatalogQuery.trim().slice(0,-1)}) q;
  foreach function_name in array array[${Object.keys(expected.functions).map(literal).join(',')}] loop
    if pg_catalog.jsonb_typeof(account_observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'AK_SQL_SCHEMA2_SERVICE_SHAPE'; end if;
    -- Exact existing230 normalization only. ACL itself is preserved separately.
    account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if account_observed #> array['functions',function_name,'configuration']='["search_path="]'::jsonb then
      account_observed:=pg_catalog.jsonb_set(account_observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if account_observed is distinct from $ak_expected$${json}$ak_expected$::jsonb
    then raise exception 'AK_SQL_EXACT_SCHEMA2_REQUIRED'; end if;`;
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
function wrapAssistantKnowledgeMetadataSource(core){
  const next=requireAssistantKnowledgeBinding();assert.strictEqual(core.newBinding,next);
  assert.equal(core.beforeCanonicalSha256,ASSISTANT_KNOWLEDGE_BEFORE.canonicalSha256);
  assert.equal(sha(core.historicalSchema1),ASSISTANT_KNOWLEDGE_BEFORE.accountSourceSha256);
  assert.deepEqual(core.changes.map(row=>row.name),ASSISTANT_KNOWLEDGE_REPLACEMENTS);
  const insertion=core.projection+'\nrevoke all on function public.'+ASSISTANT_KNOWLEDGE_PROJECTION+'(jsonb,timestamptz) from public, anon, authenticated;\n\n';
  let before=once(core.canonicalSource,insertion,'');
  for(const row of [...core.changes].reverse())before=once(before,row.after,row.before);
  assert.equal(sha(before),ASSISTANT_KNOWLEDGE_BEFORE.canonicalSha256,'No caller-supplied canonical override');
  const names=[...before.matchAll(/^create or replace function public\.((?:ravradar_ravscore_checkpoint_[a-z0-9_]+)|version_admin_document|ravradar_trip_v3_binding_allowed)\(/gm)].map(m=>m[1]);
  assert.equal(names.length,new Set(names).size);
  const oldDefinitions=names.map(name=>kbDefinition(before,name));
  const signatures=oldDefinitions.map(signature);
  const physical=sig=>sig.replace(/^public\.([a-z0-9_]+)\(/,(_,name)=>'public.'+name.slice(0,63)+'(');
  assert.equal(new Set([...signatures,signature(core.projection)].map(physical)).size,signatures.length+1);
  const snapshot=preservationQuery(signatures);
  const commands=[core.projection,
    'revoke all on function public.'+ASSISTANT_KNOWLEDGE_PROJECTION+'(jsonb,timestamptz) from public, anon, authenticated;',
    ...core.changes.map(row=>row.after),
    'alter function public.'+CP+"cas(bigint,timestamptz,jsonb) set statement_timeout = '55s';"];
  const ddl=commands.map((command,index)=>{const tag='$ak_ddl_'+index+'$';assert(!command.includes(tag));return '  execute '+tag+'\n'+command+'\n'+tag+';';});
  const afterDefinitions=names.map(name=>kbDefinition(core.canonicalSource,name));
  const migration=[
    '-- Append-only assistant-after0200 metadata AFTER exact installed current0200/statistics230; issued1414/1503 remain uninstalled archives.',
    '-- Original numerical values/history and all issued families are unchanged. No account DDL.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",
    `do $ak_successor$
declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;
begin
  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '20261017020000'
    then raise exception 'AK_SQL_EXACT_INSTALLED_CURRENT0200_REQUIRED'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261016060000')
    then raise exception 'AK_SQL_INSTALLED0600_REQUIRED'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version::text='20261014140000')
    then raise exception 'AK_SQL_ARCHIVED14140000_MUST_BE_ABSENT'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version::text='20261015030000')
    then raise exception 'AK_SQL_ARCHIVED15030000_MUST_BE_ABSENT'; end if;
  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000')
    then raise exception 'AK_SQL_INSTALLED230_REQUIRED'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version::text='20261016030000')
    then raise exception 'AK_SQL_OLD1603_MUST_BE_ABSENT'; end if;
  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace
    and proname='ravradar_ravscore_checkpoint_kb_predecessor_projection')
    then raise exception 'AK_SQL_ARCHIVED_KB_PROJECTION_MUST_BE_ABSENT'; end if;
  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;
  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='${ASSISTANT_KNOWLEDGE_PROJECTION}')
    then raise exception 'ASSISTANT_KNOWLEDGE_PROJECTION_DESTINATION_EXISTS'; end if;`,
    ...oldDefinitions.map(definitionGuard),schema2Guard(core.statisticsSchema2Expected),
    '  '+snapshot+' into original_catalog;',...ddl,
    ...afterDefinitions.map(definitionGuard),definitionGuard(core.projection),schema2Guard(core.statisticsSchema2Expected),
    '  '+snapshot+' into after_catalog;',
    `  if after_catalog is distinct from original_catalog then raise exception 'AK_SQL_ORIGINAL_PROPERTIES_OR_ACCOUNT_CHANGED'; end if;
end;
$ak_successor$;`,"notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  assert.deepEqual([...migration.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),[ASSISTANT_KNOWLEDGE_PROJECTION,...ASSISTANT_KNOWLEDGE_REPLACEMENTS]);
  const statisticsSchema2Source=core.statisticsSchema2Source;
  assert.equal(sha(statisticsSchema2Source),ASSISTANT_KNOWLEDGE_SCHEMA2_SHA);
  return Object.freeze({...core,migration,migrationSha256:sha(migration),statisticsSchema2Source,
    schema2InitializerSha256:sha(statisticsSchema2Source),canonicalIssuer:false,installation:false});
}

export async function buildAssistantKnowledgeBindingSuccessor(){
  assert.equal(arguments.length,0,'No caller root, hash, source or schema override');
  return wrapAssistantKnowledgeMetadataSource(await prepareAssistantKnowledgeMetadataSource());
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert(['--write','--check'].includes(process.argv[2]));
  requireAssistantKnowledgeOutput(); // fails before any IO while outputs are unissued
  const descriptor=assistantKnowledgeMigration();
  assert(ASSISTANT_KNOWLEDGE_OUTPUT,'AK_SQL_SQL_SOURCE_UNFROZEN');
  const output=await buildAssistantKnowledgeBindingSuccessor();
  assert.equal(output.migrationSha256,ASSISTANT_KNOWLEDGE_OUTPUT.migrationSha256);
  assert.equal(output.afterCanonicalSha256,ASSISTANT_KNOWLEDGE_OUTPUT.canonicalSha256);
  assert.equal(output.schema2InitializerSha256,ASSISTANT_KNOWLEDGE_SCHEMA2_SHA);
  const destination=path.join(ROOT,'supabase/migrations',descriptor.filename);
  if(process.argv[2]==='--write'){
    try{const handle=await fs.open(destination,'wx');try{await handle.writeFile(output.migration,'utf8');await handle.sync();}finally{await handle.close();}}
    catch(error){if(error?.code!=='EEXIST')throw error;}
  }
  const stat=await fs.lstat(destination);assert(stat.isFile()&&!stat.isSymbolicLink());
  assert.deepEqual(await fs.readFile(destination),Buffer.from(output.migration),'No overwrite of a differing issued source');
  console.log('Exact response metadata source after current0200/statistics230; issued1414/1503 archived; no installation or activation performed.');
}
