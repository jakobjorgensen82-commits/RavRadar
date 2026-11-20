import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fetchPreviousHandbookSource,handbookPayloadDigest,mergeProtectedHandbook,stableJsonDigest,syncProtectedHandbook} from './lib/merge-protected-handbook.mjs';

assert.equal(
  stableJsonDigest({z:1,nested:{b:2,a:3}}),
  stableJsonDigest({nested:{a:3,b:2},z:1}),
  'Stabil JSON-digest skal tåle Supabase JSONB-nøgleorden',
);
assert.notEqual(
  stableJsonDigest({z:1,nested:{a:3,b:2}}),
  stableJsonDigest({z:1,nested:{a:3,b:4}}),
  'Stabil JSON-digest skal stadig opdage indholdsændringer',
);

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

function handbookTransport(initial){
  let lastUpdate=0;
  const rows=new Map();
  const calls=[];
  const transport={rows,calls};
  function setRow(key,payload,version=(rows.get(key)?.version??0)+1){
    const row={document_key:key,payload:structuredClone(payload),version,updated_at:new Date(++lastUpdate*1000).toISOString()};
    rows.set(key,row);
    return row;
  }
  transport.setRow=setRow;
  for(const [key,payload] of Object.entries(initial))setRow(key,payload);
  transport.request=async(suffix,{method='GET',headers,body}={})=>{
    const query=new URLSearchParams(suffix);
    const columns=query.get('select').split(',');
    const project=row=>Object.fromEntries(columns.map(key=>[key,structuredClone(row[key])]));
    if(method==='GET'){
      calls.push(columns.includes('payload')?'full':'metadata');
      assert.equal(query.get('document_key'),'in.(handbook,handbook-source-baseline)');
      transport.beforeRead?.(calls.at(-1));
      return [...rows.values()].map(project);
    }
    assert.ok(!columns.includes('payload'),'Skrivningen skal kun returnere rækkeidentitet');
    const incoming=JSON.parse(body);
    const key=incoming.document_key??query.get('document_key')?.slice(3);
    calls.push(`${method}:${key}`);
    transport.beforeWrite?.(key);
    const existing=rows.get(key);
    if(method==='PATCH'){
      assert.equal(headers.Prefer,'return=representation');
      if(!existing||query.get('version')!==`eq.${existing.version}`
        ||query.get('updated_at')!==`eq.${existing.updated_at}`)return [];
    }else{
      assert.equal(method,'POST');
      assert.equal(query.get('on_conflict'),'document_key');
      assert.equal(headers.Prefer,'resolution=ignore-duplicates,return=representation');
      if(existing)return [];
    }
    return [project(setRow(key,incoming.payload))];
  };
  return transport;
}

const handbookKey='handbook';
const baselineKey='handbook-source-baseline';
const manifest=outcome=>({schemaVersion:1,assets:{handbook:outcome.asset},handbookSync:outcome.receipt});
const store=handbookTransport({[handbookKey]:baseline,[baselineKey]:baseline});
const loaded=await syncProtectedHandbook({request:store.request,source});
assert.deepEqual(store.calls,['full','PATCH:handbook','PATCH:handbook-source-baseline','full']);
store.calls.length=0;
const skipped=await syncProtectedHandbook({request:store.request,source,previousManifest:manifest(loaded)});
assert.equal(skipped.strategy,'unchanged-verified-rows');
assert.deepEqual(skipped.receipt,loaded.receipt);
assert.deepEqual(store.calls,['metadata'],'Et match må ikke læse eller skrive en håndbogspayload');

const edited=structuredClone(source);
edited.sections[1].body=central.sections[1].body;
store.setRow(handbookKey,edited,loaded.receipt.rows.handbook.version); // Same version after a row replacement, newer timestamp.
store.calls.length=0;
const preserved=await syncProtectedHandbook({request:store.request,source,previousManifest:manifest(loaded)});
assert.deepEqual(store.calls,['metadata','full']);
assert.deepEqual(preserved.preservedSectionIds,['b']);
assert.equal(store.rows.get(handbookKey).payload.sections[1].body,central.sections[1].body);
assert.notEqual(preserved.receipt.rows.handbook.updatedAt,loaded.receipt.rows.handbook.updatedAt);

const nextSource={...source,handbookVersion:'next-source',sections:[section('a','nyere a'),...source.sections.slice(1)]};
store.calls.length=0;
const next=await syncProtectedHandbook({request:store.request,source:nextSource,previousManifest:manifest(preserved)});
assert.deepEqual(store.calls,['full','PATCH:handbook','PATCH:handbook-source-baseline','full']);
assert.equal(store.rows.get(handbookKey).payload.sections[0].body,'nyere a');
assert.equal(store.rows.get(handbookKey).payload.sections[1].body,central.sections[1].body);
assert.notEqual(next.receipt.sourceSha256,preserved.receipt.sourceSha256);

const legacy=handbookTransport({[handbookKey]:central});
const previousSourceUrl='https://example.invalid/previous-handbook.json';
const legacyManifest={assets:{handbook:{sha256:handbookPayloadDigest(baseline)}}};
const migrated=await syncProtectedHandbook({request:legacy.request,source,previousManifest:legacyManifest,previousSourceUrl,
  fetchImpl:async url=>{assert.equal(url,previousSourceUrl);return {ok:true,json:async()=>baseline};},
});
assert.deepEqual(migrated.preservedSectionIds,['b']);
assert.deepEqual(legacy.calls,['full','PATCH:handbook','POST:handbook-source-baseline','full']);

const concurrent=handbookTransport({[handbookKey]:baseline,[baselineKey]:baseline});
concurrent.beforeWrite=()=>concurrent.setRow(handbookKey,central);
await assert.rejects(syncProtectedHandbook({request:concurrent.request,source}),/ændret under synkroniseringen/);
assert.deepEqual(concurrent.calls,['full','PATCH:handbook']);
assert.deepEqual(concurrent.rows.get(handbookKey).payload,central);

const interrupted=handbookTransport({[handbookKey]:baseline,[baselineKey]:baseline});
interrupted.beforeRead=()=>{
  if(interrupted.calls.length===4)interrupted.setRow(handbookKey,edited);
};
await assert.rejects(syncProtectedHandbook({request:interrupted.request,source}),/kunne ikke verificeres efter synkronisering/);

const sourceHandbook=JSON.parse(fs.readFileSync('docs/handbook/content.json','utf8'));
const installSql=fs.readFileSync('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql','utf8');
const sqlPayload=JSON.stringify(sourceHandbook).replaceAll("'","''");
assert.ok(
  installSql.includes(`values('handbook','${sqlPayload}'::jsonb,null)`),
  'Supabase-installationskopien skal matche repositoryets kildehåndbog før central hydrering.',
);

console.log('Beskyttet håndbog: kildekopi, officiel opdatering og ekspertændringer kontrolleres uden datatab.');

