// Inactive SOURCE parent/compiler boundary. No release, tuple, SQL, state,
// runtime handle, staging or publication is issued by this module.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ASSISTANT_AFTER597_BINDING,ASSISTANT_AFTER597_OUTPUT,
  requireAssistantAfter597Binding,requireAssistantAfter597Output,requireAssistantAfter597Release}
  from './assistant-later-h0-successor-source.mjs';
import {SOURCE598_CODE_SOURCE_PROVENANCE,assertSource598CodeSourceSelected,withSource598CodeParent}
  from '../check-assistant-later-h0-predecessor-source.mjs';

import derivedMetadata from './source-producer-after597-binding.generated.json' with {type:'json'};
import {assertSourceProducerAfter597DerivedMetadata,SOURCE_PRODUCER_AFTER597_PREDECESSOR_VERSION}
  from './source-producer-after597-derived-metadata.mjs';
const metadata=assertSourceProducerAfter597DerivedMetadata(derivedMetadata);

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const CP='ravradar_ravscore_checkpoint_';
export const SOURCE_PRODUCER_AFTER597_PARENT=Object.freeze({
  release:'4.0.598',code:SOURCE598_CODE_SOURCE_PROVENANCE,
  before:Object.freeze({...ASSISTANT_AFTER597_BINDING,...ASSISTANT_AFTER597_OUTPUT}),
  binding:metadata.binding,output:metadata.output,nextRelease:metadata.release,
});

export function requireSourceProducerAfter597CodeParent(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 parent');
  assert.equal(assertSource598CodeSourceSelected(),SOURCE_PRODUCER_AFTER597_PARENT.code);
  assert.equal(requireAssistantAfter597Release(),SOURCE_PRODUCER_AFTER597_PARENT.release);
  assert.deepEqual({...requireAssistantAfter597Binding(),...requireAssistantAfter597Output()},
    SOURCE_PRODUCER_AFTER597_PARENT.before);
  return SOURCE_PRODUCER_AFTER597_PARENT.before; // CODE only; never B/S admission.
}

export function requireSourceProducerAfter597Binding(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 tuple');
  const binding=SOURCE_PRODUCER_AFTER597_PARENT.binding;
  assert(binding&&Object.isFrozen(binding),'SOURCE_PRODUCER_AFTER597_UNISSUED');
  const before=requireSourceProducerAfter597CodeParent();
  assert.equal(before.version,SOURCE_PRODUCER_AFTER597_PREDECESSOR_VERSION);
  assert.equal(binding.version,metadata.version);assert.equal(metadata.release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);
  assert.equal(new Set(['C','I','T'].flatMap(key=>[before[key],binding[key]])).size,6,
    'SOURCE_AFTER597_SIX_DISTINCT_METADATA_HASHES');
}
export function requireSourceProducerAfter597Output(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 output');
  requireSourceProducerAfter597Binding();
  assert(SOURCE_PRODUCER_AFTER597_PARENT.output&&Object.isFrozen(SOURCE_PRODUCER_AFTER597_PARENT.output),
    'SOURCE_PRODUCER_AFTER597_SQL_UNISSUED');
}

// No old595/596 generated metadata is imported. A future actual issuance must
// replace this closed NULL phase through its reviewed normal compiler.
export function assertSourceProducerAfter597UnissuedMetadata(value){
  assert.equal(arguments.length,1);assertSourceProducerAfter597DerivedMetadata(value);
  for(const key of ['release','version','binding','output'])assert.equal(value[key],null,'SOURCE_PRODUCER_AFTER597_UNISSUED_METADATA');
  return true;
}

export function sourceProducerAfter597PredecessorCompilationLayout(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  const parent=requireSourceProducerAfter597CodeParent();
  assert.equal(sha(source),parent.canonicalSha256,'Whole issued598 canonical source');
  const start=source.indexOf('create or replace function public.'+CP+'contract(');
  assert(start>=0);const end=source.indexOf('$$;',start);assert(end>start);
  const contract=source.slice(start,end+3);
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  const checkpoint=/  v_checkpoint_definition := v_canonical_time_definition[\s\S]*?;/.exec(contract);
  assert(oid&&checkpoint);
  assert.equal(sha(oid[1]),'4188977f0c5409cd6a15a5db178a3da4a4effef7a89737ca55ed0fe1893e3845');
  assert.equal(sha(checkpoint[0]),'013dd16abea8762c6f007a45057df11a19d6feffc8564edafb179500cef2c344');
  const validators=[...oid[1].matchAll(/pg_catalog\.to_regprocedure\(\s*'([^']+)'\s*\)/g)].map(row=>row[1]);
  assert.equal(validators.length,45);assert.equal(new Set(validators).size,45);
  assert.deepEqual(validators.slice(-2),['public.'+CP+'ask597_state_valid(jsonb,text)',
    'public.'+CP+'ask597_payload_valid(jsonb,timestamptz)']);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,48);
  const oldTail="    || E'\\n-- assistant-later-h0-original597-payload-validator --\\n' || v_ask597_payload_definition;";
  assert(checkpoint[0].endsWith(oldTail),'Whole issued598 checkpoint ends at ask597');
  return Object.freeze({contract,oid:oid[0],validators:Object.freeze(validators),checkpoint:checkpoint[0],
    validatorCount:45,definitionCount:48,oldTail,admission:'NO_ADMISSION'});
}

export async function readSourceProducerAfter597PredecessorCanonicalSource(){
  assert.equal(arguments.length,0,'No caller-selected SOURCE597 canonical source');
  const parent=requireSourceProducerAfter597CodeParent();
  return withSource598CodeParent(async root=>{
    const api=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    assert.equal(api.requireAssistantAfter597Release(),'4.0.598');
    assert.deepEqual({...api.requireAssistantAfter597Binding(),...api.requireAssistantAfter597Output()},parent);
    const source=await api.readAssistantAfter597CanonicalSource();
    sourceProducerAfter597PredecessorCompilationLayout(source.canonicalSource);
    assert.equal(source.admission,'NO_ADMISSION');return source;
  });
}
