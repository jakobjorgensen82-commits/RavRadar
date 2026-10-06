#!/usr/bin/env node
// Exact metadata-only successor. All applied migrations remain immutable.
// This does not change scores/state/evidence or admit excluded LF current.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { OWNER_CURRENT_DOMAIN_SUCCESSOR as previous,
  OWNER_WATER_LEVEL_ONLY_SUCCESSOR as next } from './lib/bounded-conditions-predecessor-transition.mjs';

const predecessor='supabase/migrations/20261004190000_owner_current_source_domain_binding.sql';
const destination='supabase/migrations/20261005000000_owner_water_level_only_binding.sql';
const helper='ravradar_ravscore_checkpoint_water_level_predecessor_projection';
const normalize=value=>value.replace(/\r\n?/g,'\n');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const count=(text,value)=>text.split(value).length-1;
const base=normalize(await fs.readFile(predecessor,'utf8'));
assert.equal(digest(base),'4e5ae691182ae6ef7b84f346bab0cfd828eedd321501424a307d5c918e449399',
  'The applied owner-current migration must remain immutable');
for (const value of Object.values(next)) assert.match(value,/^[0-9a-f]{64}$/);
function definition(text,name) {
  const marker='create or replace function public.'+name+'(';
  const start=text.indexOf(marker),end=text.indexOf('\n$$;',start);
  assert.ok(start>=0&&text.indexOf(marker,start+1)===-1&&end>start,name);
  return text.slice(start,end+4);
}
function once(text,before,after) {
  assert.equal(count(text,before),1,'Ambiguous reviewed replacement: '+before.slice(0,90));
  return text.replace(before,()=>after);
}
const replacements=[];
let result=base;
function replace(before,after) {result=once(result,before,after);replacements.push([before,after]);}
function renameCurrentHashes(text) {
  const pairs={ [previous.integratedBundleSha256]:next.integratedBundleSha256,
    [previous.candidateBundleSha256]:next.candidateBundleSha256,
    [previous.continuationStateContractSha256]:next.continuationStateContractSha256 };
  return text.replace(/[a-f0-9]{64}/g,value=>pairs[value]??value);
}
for (const name of ['ravradar_ravscore_checkpoint_integrated_state_valid',
  'ravradar_ravscore_checkpoint_payload_valid','ravradar_ravscore_checkpoint_integrated_state_reason',
  'ravradar_ravscore_checkpoint_payload_reason']) {
  const before=definition(base,name);
  assert.equal(count(before,previous.integratedBundleSha256),1,name);
  replace(before,renameCurrentHashes(before));
}
// Existing historical trip identifiers remain, and only exact successors add.
for (const key of ['integratedBundleSha256','candidateBundleSha256']) {
  replace("        '"+previous[key]+"'\n      )",
    "        '"+previous[key]+"',\n        '"+next[key]+"'\n      )");
}
const ownerName='ravradar_ravscore_checkpoint_owner_current_predecessor_projection';
const ownerBefore=definition(base,ownerName);
const mapping={
  '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948':previous.integratedBundleSha256,
  [previous.integratedBundleSha256]:next.integratedBundleSha256,
  '28a69936b3d9a9c655e967c5e0c352d8401e5894ef3011bbfc55c85ad37f7ce7':previous.candidateBundleSha256,
  [previous.candidateBundleSha256]:next.candidateBundleSha256,
  'd983bb085f75252d00f0e2585cd0e274ea86020000f99037e9054a3989a4aef6':previous.continuationStateContractSha256,
  [previous.continuationStateContractSha256]:next.continuationStateContractSha256,
};
const projection=ownerBefore.replace(ownerName,helper)
  .replace(/[a-f0-9]{64}/g,value=>mapping[value]??value);
for (const [key,n] of [['integratedBundleSha256',2],['candidateBundleSha256',1],['continuationStateContractSha256',1]]) {
  assert.equal(count(projection,previous[key]),n);assert.equal(count(projection,next[key]),n);
}
const ownerAfter=once(ownerBefore,
  '  if public.ravradar_ravscore_checkpoint_payload_valid(v_projected, p_target_reference)\n  then return v_projected; end if;',
  '  -- Preserve the original owner-current projection, then exact water-only binding.\n'
  +'  v_projected := public.'+helper+'(v_projected, p_target_reference);\n'
  +'  if v_projected is not null then return v_projected; end if;');
replace(ownerBefore,projection+'\nrevoke all on function public.'+helper
  +'(jsonb,timestamptz) from public, anon, authenticated;\n\n'+ownerAfter);
const predecessorBefore=definition(base,'ravradar_ravscore_checkpoint_predecessor_payload_valid');
replace(predecessorBefore,once(renameCurrentHashes(predecessorBefore),'begin\n',
  'begin\n  if p_current_implementation_sha256 = \''+next.continuationStateContractSha256+'\'\n'
  +'    and public.'+helper+'(p_payload, p_target_reference) is not null\n'
  +'  then return true; end if;\n'));
replace('  v_owner_current_predecessor_payload jsonb;',
  '  v_owner_current_predecessor_payload jsonb;\n  v_water_level_predecessor_payload jsonb;');
replace('    if v_central_is_compatible_predecessor and v_owner_current_predecessor_payload is not null then',
  '    v_water_level_predecessor_payload := public.'+helper+'(v_payload, v_central_reference);\n'
  +'    if v_central_is_compatible_predecessor and v_water_level_predecessor_payload is not null then\n'
  +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\n'
  +"        and (v_water_level_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  +"          #- '{candidateGRollbackCompanion,generationSha256}')\n"
  +"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\n"
  +"          #- '{candidateGRollbackCompanion,generationSha256}');\n"
  +'    elsif v_central_is_compatible_predecessor and v_owner_current_predecessor_payload is not null then');
const contractBefore=definition(base,'ravradar_ravscore_checkpoint_contract');
let contract=once(contractBefore,'  v_owner_current_projection_definition text;',
  '  v_owner_current_projection_definition text;\n  v_water_level_projection_definition text;');
contract=once(contract,
  "pg_catalog.to_regprocedure('public."+ownerName+"(jsonb,timestamptz)')\n  ];",
  "pg_catalog.to_regprocedure('public."+ownerName+"(jsonb,timestamptz)'),\n"
  +"    pg_catalog.to_regprocedure('public."+helper+"(jsonb,timestamptz)')\n  ];");
contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',
  "  select pg_catalog.btrim(p.prosrc, E' \\n\\r\\t') into v_water_level_projection_definition\n"
  +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids[9];\n\n'
  +'  v_checkpoint_definition := v_canonical_time_definition');
contract=once(contract,
  "    || E'\\n-- owner-current-predecessor-projection --\\n' || v_owner_current_projection_definition;",
  "    || E'\\n-- owner-current-predecessor-projection --\\n' || v_owner_current_projection_definition\n"
  +"    || E'\\n-- water-level-predecessor-projection --\\n' || v_water_level_projection_definition;");
contract=once(contract,"'20261004190000'","'20261005000000'");
replace(contractBefore,contract);
replace('-- DEC-0291: seven owner zones exclude dkss_lf; only technical binding advances here. Physical formulas remain unchanged.',
  '-- Seven coastal zones allow verified dkss_lf waterLevel ONLY. Current/temperature exclusions, physical formulas and history remain unchanged.');
let inverse=result;
for (const [before,after] of [...replacements].reverse()) inverse=once(inverse,after,before);
assert.equal(inverse,base,'Unreviewed SQL change outside the exact technical bridge');
assert.equal(count(result,"set statement_timeout = '55s'"),2);
assert.equal(count(result,"set statement_timeout = '30s'"),0);
assert.equal(count(result,"'20261005000000'"),1);
const mode=process.argv[2]??'--check';assert.ok(['--check','--write'].includes(mode));
if(mode==='--write')await fs.writeFile(destination,result,'utf8');
else assert.equal(normalize(await fs.readFile(destination,'utf8')),result,'Water-only migration is stale');
console.log('Water-only technical binding: immutable predecessor, exact inverse, historical chains and 55s unchanged.');
