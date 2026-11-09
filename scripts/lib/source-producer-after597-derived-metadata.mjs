// Generated DATA parser only. No builder, caller-selected root or issuance.
import assert from 'node:assert/strict';
import {ASSISTANT_AFTER597_BINDING} from './assistant-later-h0-successor-source.mjs';
export const SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH=
  'scripts/lib/source-producer-after597-binding.generated.json';
export const SOURCE_PRODUCER_AFTER597_PREDECESSOR_VERSION=ASSISTANT_AFTER597_BINDING.version;
const exact=(value,keys)=>{
  assert(value&&Object.getPrototypeOf(value)===Object.prototype,'SOURCE_AFTER597_METADATA_OBJECT');
  const own=Reflect.ownKeys(value);
  assert(own.every(key=>typeof key==='string'),'SOURCE_AFTER597_METADATA_KEYS');
  assert.deepEqual(own,keys,'SOURCE_AFTER597_METADATA_KEYS');
  const descriptors=Object.getOwnPropertyDescriptors(value);
  for(const key of own)assert(Object.hasOwn(descriptors[key],'value')&&descriptors[key].enumerable,
    'SOURCE_AFTER597_METADATA_DATA_ONLY');
};
export function assertSourceProducerAfter597Release(value){
  assert.equal(arguments.length,1);
  assert.equal(typeof value,'string','SOURCE_AFTER597_LATER_RELEASE_REQUIRED');
  assert.match(value,/^4\.0\.[1-9][0-9]*$/,'SOURCE_AFTER597_LATER_RELEASE_REQUIRED');
  const patch=Number(value.slice(4));
  assert(Number.isSafeInteger(patch)&&patch>598,'SOURCE_AFTER597_LATER_RELEASE_REQUIRED');
  return value;
}
export function assertSourceProducerAfter597DerivedMetadata(value){
  assert.equal(arguments.length,1);
  exact(value,['schemaVersion','release','version','binding','output']);
  assert.equal(value.schemaVersion,'source-producer-after597-derived-metadata-v1');
  if(value.binding===null){
    for(const key of ['release','version','output'])assert.equal(value[key],null,'SOURCE_AFTER597_NULL_PHASE');
  }else{
    assertSourceProducerAfter597Release(value.release);
    assert.equal(typeof value.version,'string');assert.match(value.version,/^[0-9]{14}$/);
    assert(value.version>SOURCE_PRODUCER_AFTER597_PREDECESSOR_VERSION,'SOURCE_AFTER597_LATER_VERSION_REQUIRED');
    exact(value.binding,['version','C','I','T','candidateManifestSha256','integratedManifestSha256']);
    assert.equal(value.binding.version,value.version);
    for(const key of ['C','I','T','candidateManifestSha256','integratedManifestSha256'])
      assert.match(value.binding[key],/^[a-f0-9]{64}$/);
    assert.equal(value.binding.C,value.binding.candidateManifestSha256);
    assert.equal(value.binding.I,value.binding.integratedManifestSha256);
    assert.equal(new Set(['C','I','T'].map(key=>value.binding[key])).size,3);
    assert.equal(new Set(['C','I','T'].flatMap(key=>[ASSISTANT_AFTER597_BINDING[key],value.binding[key]])).size,6,
      'SOURCE_AFTER597_SIX_DISTINCT_METADATA_HASHES');
    Object.freeze(value.binding);
    if(value.output!==null){
      exact(value.output,['migrationSha256','canonicalSha256','checkpointContractSha256','tripBindingPolicySha256']);
      for(const pin of Object.values(value.output))assert.match(pin,/^[a-f0-9]{64}$/);
      Object.freeze(value.output);
    }
  }
  return Object.freeze(value);
}
export function sourceProducerAfter597DerivedMetadataFromText(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  assert(Buffer.byteLength(source,'utf8')<=8192,'SOURCE_AFTER597_METADATA_SIZE');
  const value=assertSourceProducerAfter597DerivedMetadata(JSON.parse(source));
  assert.equal(source,JSON.stringify(value,null,2)+'\n','SOURCE_AFTER597_CANONICAL_JSON_REQUIRED');
  return value;
}
