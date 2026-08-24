import assert from 'node:assert/strict';
import {fetchPreviousHandbookSource,handbookPayloadDigest,mergeProtectedHandbook} from './lib/merge-protected-handbook.mjs';

const section=(id,body)=>({id,title:id,summary:`Kort ${id}`,body});
const baseline={handbookVersion:'4.0.269',updatedAt:'før',sections:[section('a','gammel a'),section('b','gammel b')]};
const source={handbookVersion:'4.0.270',updatedAt:'nu',sections:[section('a','ny a'),section('b','ny b'),section('c','ny c')]};

const unchanged=mergeProtectedHandbook({source,central:structuredClone(baseline),baseline});
assert.equal(unchanged.strategy,'source-update');
assert.deepEqual(unchanged.payload,source);

const central={...structuredClone(baseline),lastReviewId:'review-1'};
central.sections[1]={...central.sections[1],body:'ekspertens godkendte b'};
const merged=mergeProtectedHandbook({source,central,baseline});
assert.equal(merged.strategy,'three-way-merge');
assert.deepEqual(merged.preservedSectionIds,['b']);
assert.equal(merged.payload.handbookVersion,'4.0.270');
assert.equal(merged.payload.sections.find(x=>x.id==='a').body,'ny a');
assert.equal(merged.payload.sections.find(x=>x.id==='b').body,'ekspertens godkendte b');
assert.equal(merged.payload.sections.find(x=>x.id==='c').body,'ny c');
assert.equal(merged.payload.lastReviewId,'review-1');

assert.throws(
  ()=>mergeProtectedHandbook({source,central,baseline:null}),
  /tidligere kildebaseline mangler/,
  'En ukendt central håndbog må ikke overskrives uden en trevejsbaseline.'
);

const fetched=await fetchPreviousHandbookSource({
  url:'https://example.invalid/previous-handbook.json',
  expectedDigest:handbookPayloadDigest(baseline),
  fetchImpl:async()=>({ok:true,status:200,json:async()=>structuredClone(baseline)}),
});
assert.deepEqual(fetched,baseline,'Første migrering skal kunne bruge den verificerede tidligere versionsbundne kilde som baseline.');
await assert.rejects(
  fetchPreviousHandbookSource({
    url:'https://example.invalid/previous-handbook.json',
    expectedDigest:handbookPayloadDigest(source),
    fetchImpl:async()=>({ok:true,status:200,json:async()=>structuredClone(baseline)}),
  }),
  /matcher ikke det beskyttede manifest/,
  'En anden versionsbundet payload må ikke bruges som baseline.',
);

console.log('Beskyttet håndbog: officiel opdatering og ekspertændringer flettes uden datatab.');

