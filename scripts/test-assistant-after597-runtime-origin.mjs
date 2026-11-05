// Kun kilde- og værdiprøver. Ingen original/B/S-, SQL- eller produktionsadgang.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as next,SCALAR597_LATER_H0_BEFORE as old594,
  assertAssistantAfter597CheckpointInverse} from './lib/assistant-later-h0-successor-source.mjs';
import {assistantAfter597RuntimePredecessor} from './assistant-later-h0-runtime-transition.mjs';
import {isScalar597OriginParentBinding,assertScalar597OriginParentMetadata,
  isAssistantAfter597OriginParentBinding,assertAssistantAfter597OriginParentMetadata,
  assertAssistantAfter597OriginTarget} from './lib/established-native-current-origin.mjs';
import {assistantAfter597ReconcileParent,requiresPrivateRuntimeCheckpointReconcile,
  privateRuntimeCheckpointReconcileFailureDiagnostic} from './reconcile-private-runtime-checkpoint.mjs';

const H0='2026-11-04T04:00:00.000Z',later='2026-11-04T08:00:00.000Z';
const descriptor={modelBinding:{modelBundleSha256:next.before.I},productionReferenceAt:H0,
  contractHashes:{continuationStateContractSha256:next.before.T}};
const checkpoint={candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:next.before.C}}};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('den faste597-originalfamilie kræver ægte597-metadata og en strengt nyere hel time',()=>{
  assert.equal(isAssistantAfter597OriginParentBinding(descriptor.modelBinding),true);
  assert.equal(isAssistantAfter597OriginParentBinding({modelBundleSha256:old594.I}),false);
  assert.equal(assertAssistantAfter597OriginParentMetadata(descriptor,checkpoint),true);
  assert.equal(assertAssistantAfter597OriginTarget(descriptor,later),true);
  for(const invalid of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T08:30:00.000Z','2026-13-04T08:00:00.000Z'])
    assert.throws(()=>assertAssistantAfter597OriginTarget(descriptor,invalid));
  assert.throws(()=>assertAssistantAfter597OriginParentMetadata({...descriptor,
    contractHashes:{continuationStateContractSha256:old594.T}},checkpoint));
  assert.throws(()=>assertAssistantAfter597OriginParentMetadata(descriptor,
    {candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:old594.C}}}));
  // Den gamle scalar-gren beholder sin egen594-familie. Ingen håndtag retagges.
  assert.equal(isScalar597OriginParentBinding({modelBundleSha256:old594.I}),true);
  assert.equal(isScalar597OriginParentBinding(descriptor.modelBinding),false);
  assert.equal(assertScalar597OriginParentMetadata({modelBinding:{modelBundleSha256:old594.I},
    contractHashes:{continuationStateContractSha256:old594.T}},
  {candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:old594.C}}}),true);
});

test('normale overgangs- og genopretningsgrene afviser uudstedt før input og transport',async()=>{
  const names=['readFile','readdir','mkdir','writeFile','copyFile','lstat','stat'];
  const saved=new Map(names.map(key=>[key,fs[key]])),fetch=globalThis.fetch;let io=0;
  for(const key of names)fs[key]=async()=>{io++;throw new Error('UVENTET_FILADGANG');};
  globalThis.fetch=async()=>{io++;throw new Error('UVENTET_NETADGANG');};
  const hostile=new Proxy({},{get(){io++;throw new Error('UVENTET_INPUTLÆSNING');}});
  try{
    assert.throws(()=>assistantAfter597RuntimePredecessor(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>assistantAfter597RuntimePredecessor({family:'594'}),/Ingen caller-valgt/);
    assert.throws(()=>assertAssistantAfter597CheckpointInverse(hostile,hostile,hostile),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>assistantAfter597ReconcileParent(hostile,hostile),/ASSISTANT_AFTER597_UNISSUED/);
    assert.equal(io,0);
  }finally{for(const[key,value]of saved)fs[key]=value;globalThis.fetch=fetch;}
  assert.equal(next.binding,null);assert.equal(next.output,null);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
});

test('normal familieklassifikation bevarer597 og afviser blandede eller ukendte metadata',()=>{
  assert.equal(requiresPrivateRuntimeCheckpointReconcile(descriptor),true);
  assert.equal(requiresPrivateRuntimeCheckpointReconcile({...descriptor,
    contractHashes:{continuationStateContractSha256:old594.T}}),false);
  assert.equal(requiresPrivateRuntimeCheckpointReconcile(null),false);
  assert.equal(requiresPrivateRuntimeCheckpointReconcile({}),false);
  const failure=privateRuntimeCheckpointReconcileFailureDiagnostic(
    new Error('PAIRED_PUBLICATION_GENUINE597_STRICTLY_OLDER'),'S_RELATION_GUARD');
  assert.deepEqual(failure,{phase:'S_RELATION_GUARD',code:'GENUINE597_STRICTLY_OLDER',errorClass:'ERROR'});
  const ordinary={GITHUB_WORKFLOW:'Run current RavRadar weather once',GITHUB_REF:'refs/heads/main',
    GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_SHA:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',OPERATIONAL_ACTION:'integrated'};
  assert.doesNotThrow(()=>next.assertCaller(ordinary));
  assert.throws(()=>next.assertCaller({...ordinary,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair'}));
  assert.throws(()=>next.assertCaller({...ordinary,COMPLETED_PRIVATE_RUNTIME:'true'}));
});

test('normal modelimport kræver præcise nye hunks og genskaber de ægte gamle hele kilder',async()=>{
  const reader=await fs.readFile(path.join(ROOT,'scripts/lib/model-source-imports.mjs'),'utf8');
  const match=/const ASSISTANT_AFTER597_REVIEW_DATA=(\{[\s\S]*?\});\nconst ASSISTANT_AFTER597_REVIEWED/.exec(reader);
  assert(match);const reviewed=JSON.parse(match[1]);
  // Uafhængige fulde803f-førbilleder. Ingen ny modelbinding eller testretagging.
  const expected={
    'scripts/check-assistant-later-h0-predecessor-source.mjs':'d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a',
    'scripts/lib/authenticated-frozen586-predecessor.mjs':'d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac',
    'scripts/lib/established-native-current-origin.mjs':'e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42',
    'scripts/assistant-later-h0-binding-prewrite.mjs':'a87b9960dfcd35ccda2a8de8ce6fea35783fc3a25ef49dde806643d309d05384',
  };
  assert.deepEqual(Object.keys(reviewed).sort(),Object.keys(expected).sort());
  for(const[file,pin]of Object.entries(expected)){
    const source=await fs.readFile(path.join(ROOT,file),'utf8');
    const imports=modelSourceRelativeModuleSpecifiers(source,file);let original=source;
    for(const row of [...reviewed[file].hunks].reverse()){
      assert.equal(original.split(row.after).length,2);original=original.replace(row.after,()=>row.before);
    }
    assert.equal(crypto.createHash('sha256').update(original).digest('hex'),pin);
    assert.deepEqual(modelSourceRelativeModuleSpecifiers(original,file),imports);
    if(!file.endsWith('binding-prewrite.mjs')){
      assert(!imports.some(value=>value.includes('assistant-later-h0-successor-source')));
      assert(!imports.some(value=>value.includes('integrated-cutover-readiness')));
    }
    const row=reviewed[file].hunks[0];assert.equal(source.split(row.after).length,2);
    for(const changed of [source.replace(row.after,''),source.replace(row.after,row.after+'\n// ændret'),source+'\n'+row.after])
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
  }
});
