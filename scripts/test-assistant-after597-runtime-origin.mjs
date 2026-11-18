// Kun kilde- og værdiprøver. Ingen original/B/S-, SQL- eller produktionsadgang.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
// Explicit normal current entry. No project constructor/runtime import
// precedes the fixed after598 issuance guard. Old PRE bodies stay unchanged.
const currentArguments=process.argv.slice(2);
assert(currentArguments.length===0||(currentArguments.length===1&&['--after598-current','--after599-current'].includes(currentArguments[0])),'Unknown or mixed assistant test mode');
const AFTER598_CURRENT_MODE=currentArguments[0]==='--after598-current';
const AFTER599_CURRENT_MODE=currentArguments[0]==='--after599-current';
const currentSource=await import('./lib/assistant-later-h0-successor-source.mjs');
if(AFTER598_CURRENT_MODE){
  currentSource.requireAssistantAfter598Output();currentSource.requireAssistantAfter598Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER598_SUCCESSOR);
}
if(AFTER599_CURRENT_MODE){
  currentSource.requireAssistantAfter599Output();currentSource.requireAssistantAfter599Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER599_SUCCESSOR);
}
const {modelSourceRelativeModuleSpecifiers}=await import('./lib/model-source-imports.mjs');
const {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR:next,SCALAR597_LATER_H0_BEFORE:old594,
  assertAssistantAfter597CheckpointInverse}=await import('./lib/assistant-later-h0-successor-source.mjs');
const {assistantAfter597RuntimePredecessor}=await import('./assistant-later-h0-runtime-transition.mjs');
const {isScalar597OriginParentBinding,assertScalar597OriginParentMetadata,
  isAssistantAfter597OriginParentBinding,assertAssistantAfter597OriginParentMetadata,
  assertAssistantAfter597OriginTarget}=await import('./lib/established-native-current-origin.mjs');
const {assistantAfter597ReconcileParent,requiresPrivateRuntimeCheckpointReconcile,
  privateRuntimeCheckpointReconcileFailureDiagnostic}=await import('./reconcile-private-runtime-checkpoint.mjs');

const H0='2026-11-04T04:00:00.000Z',later='2026-11-04T08:00:00.000Z';
const descriptor={modelBinding:{modelBundleSha256:next.before.I},productionReferenceAt:H0,
  contractHashes:{continuationStateContractSha256:next.before.T}};
const checkpoint={candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:next.before.C}}};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Current source checks run only after the fixed issuance/ACTIVE admission above.
if(AFTER598_CURRENT_MODE){
  const {verifyAssistantAfter598SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter598SourceTarget();
}
if(AFTER599_CURRENT_MODE){
  const {verifyAssistantAfter599SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter599SourceTarget();
}
if(!AFTER598_CURRENT_MODE&&!AFTER599_CURRENT_MODE){

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

}else if(AFTER598_CURRENT_MODE){

  const origin=await import('./lib/established-native-current-origin.mjs');
  const runtime=await import('./assistant-later-h0-runtime-transition.mjs'),reconcile=await import('./reconcile-private-runtime-checkpoint.mjs');
  const before598=currentSource.ASSISTANT_AFTER598_BEFORE;
  const oldDescriptor={modelBinding:{modelBundleSha256:before598.I},productionReferenceAt:H0,contractHashes:{continuationStateContractSha256:before598.T}};
  const oldCheckpoint={candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:before598.C}}};
  test('after598 current fixed old598 origin enforces each C/I/T and strictly later whole H0',()=>{
    assert.equal(origin.isAssistantAfter598OriginParentBinding(oldDescriptor.modelBinding),true);
    assert.equal(origin.assertAssistantAfter598OriginParentMetadata(oldDescriptor,oldCheckpoint),true);
    assert.equal(origin.assertAssistantAfter598OriginTarget(oldDescriptor,later),true);
    for(const time of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T08:30:00.000Z','invalid'])
      assert.throws(()=>origin.assertAssistantAfter598OriginTarget(oldDescriptor,time));
    for(const prior of [old594,next.before]){
      assert.equal(origin.isAssistantAfter598OriginParentBinding({modelBundleSha256:prior.I}),false);
      assert.throws(()=>origin.assertAssistantAfter598OriginParentMetadata({...oldDescriptor,modelBinding:{modelBundleSha256:prior.I}},oldCheckpoint));
      assert.throws(()=>origin.assertAssistantAfter598OriginParentMetadata({...oldDescriptor,contractHashes:{continuationStateContractSha256:prior.T}},oldCheckpoint));
      assert.throws(()=>origin.assertAssistantAfter598OriginParentMetadata(oldDescriptor,{candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:prior.C}}}));
    }
    assert.equal(isScalar597OriginParentBinding({modelBundleSha256:old594.I}),true);
    assert.equal(isAssistantAfter597OriginParentBinding({modelBundleSha256:next.before.I}),true);
    assert.equal(isAssistantAfter597OriginParentBinding(oldDescriptor.modelBinding),false);
  });
  test('after598 current runtime and reconcile select old598 only and reject foreign original handles or caller overrides',()=>{
    const fixed=runtime.assistantAfter598RuntimePredecessor();assert.equal(typeof fixed.snapshot,'function');
    assert.throws(()=>fixed.snapshot({}));assert.throws(()=>runtime.assistantAfter598RuntimePredecessor({family:'597'}));
    assert.throws(()=>runtime.assistantAfter597RuntimePredecessor({family:'598'}));
    const rows=[{payload:{modelBinding:oldDescriptor.modelBinding,continuationStateContractSha256:before598.T,productionReferenceAt:H0}}];
    assert.equal(reconcile.assistantAfter598ReconcileParent(rows,later),true);
    for(const time of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T08:30:00.000Z'])assert.throws(()=>reconcile.assistantAfter598ReconcileParent(rows,time));
    assert.equal(reconcile.assistantAfter598ReconcileParent([{payload:{...rows[0].payload,continuationStateContractSha256:next.before.T}}],later),false);
    const ordinary={GITHUB_WORKFLOW:'Run current RavRadar weather once',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',
      GITHUB_SHA:'82200280c42b9060f14be2721ba7b766e0ede5a6',OPERATIONAL_ACTION:'integrated'};
    assert.doesNotThrow(()=>currentSource.ACTIVE_ASSISTANT_SUCCESSOR.assertCaller(ordinary));
    for(const invalid of [{...ordinary,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair'},{...ordinary,COMPLETED_PRIVATE_RUNTIME:'true'}])
      assert.throws(()=>currentSource.ACTIVE_ASSISTANT_SUCCESSOR.assertCaller(invalid));
  });
  test('after598 current four reviewed import frames reconstruct whole genuine old sources and reject unknown changes',async()=>{
    const reader=await fs.readFile(path.join(ROOT,'scripts/lib/model-source-imports.mjs'),'utf8');
    const match=/const ASSISTANT_AFTER598_REVIEW_DATA=(\{[\s\S]*?\});\nconst ASSISTANT_AFTER598_REVIEWED/.exec(reader);assert(match);
    const reviewed=JSON.parse(match[1]);assert.equal(Object.keys(reviewed).length,4);
    for(const[file,row]of Object.entries(reviewed)){
      const source=await fs.readFile(path.join(ROOT,file),'utf8'),imports=modelSourceRelativeModuleSpecifiers(source,file);let original=source;
      for(const hunk of [...row.hunks].reverse()){assert.equal(original.split(hunk.after).length,2);original=original.replace(hunk.after,()=>hunk.before);}
      assert.equal(crypto.createHash('sha256').update(original).digest('hex'),row.beforeSha256);
      assert.deepEqual(modelSourceRelativeModuleSpecifiers(original,file),imports);
      const hunk=row.hunks[0];for(const changed of [source.replace(hunk.after,''),source.replace(hunk.after,hunk.after+'\n// unknown'),source+'\n'+hunk.after])
        assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file));
    }
  });

}else{

  const origin=await import('./lib/established-native-current-origin.mjs');
  const runtime=await import('./assistant-later-h0-runtime-transition.mjs'),reconcile=await import('./reconcile-private-runtime-checkpoint.mjs');
  const before599=currentSource.ASSISTANT_AFTER599_BEFORE;
  const oldDescriptor={modelBinding:{modelBundleSha256:before599.I},productionReferenceAt:H0,contractHashes:{continuationStateContractSha256:before599.T}};
  const oldCheckpoint={candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:before599.C}}};
  test('after599 current fixed old599 origin enforces each C/I/T and strictly later whole H0',()=>{
    assert.equal(origin.isAssistantAfter599OriginParentBinding(oldDescriptor.modelBinding),true);
    assert.equal(origin.assertAssistantAfter599OriginParentMetadata(oldDescriptor,oldCheckpoint),true);
    assert.equal(origin.assertAssistantAfter599OriginTarget(oldDescriptor,later),true);
    for(const time of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T08:30:00.000Z','invalid'])
      assert.throws(()=>origin.assertAssistantAfter599OriginTarget(oldDescriptor,time));
    for(const prior of [old594,next.before]){
      assert.equal(origin.isAssistantAfter599OriginParentBinding({modelBundleSha256:prior.I}),false);
      assert.throws(()=>origin.assertAssistantAfter599OriginParentMetadata({...oldDescriptor,modelBinding:{modelBundleSha256:prior.I}},oldCheckpoint));
      assert.throws(()=>origin.assertAssistantAfter599OriginParentMetadata({...oldDescriptor,contractHashes:{continuationStateContractSha256:prior.T}},oldCheckpoint));
      assert.throws(()=>origin.assertAssistantAfter599OriginParentMetadata(oldDescriptor,{candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:prior.C}}}));
    }
    assert.equal(isScalar597OriginParentBinding({modelBundleSha256:old594.I}),true);
    assert.equal(isAssistantAfter597OriginParentBinding({modelBundleSha256:next.before.I}),true);
    assert.equal(isAssistantAfter597OriginParentBinding(oldDescriptor.modelBinding),false);
  });
  test('after599 current runtime and reconcile select old599 only and reject foreign original handles or caller overrides',()=>{
    const fixed=runtime.assistantAfter599RuntimePredecessor();assert.equal(typeof fixed.snapshot,'function');
    assert.throws(()=>fixed.snapshot({}));assert.throws(()=>runtime.assistantAfter599RuntimePredecessor({family:'597'}));
    assert.throws(()=>runtime.assistantAfter597RuntimePredecessor({family:'599'}));
    const rows=[{payload:{modelBinding:oldDescriptor.modelBinding,continuationStateContractSha256:before599.T,productionReferenceAt:H0}}];
    assert.equal(reconcile.assistantAfter599ReconcileParent(rows,later),true);
    for(const time of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T08:30:00.000Z'])assert.throws(()=>reconcile.assistantAfter599ReconcileParent(rows,time));
    assert.equal(reconcile.assistantAfter599ReconcileParent([{payload:{...rows[0].payload,continuationStateContractSha256:next.before.T}}],later),false);
    const ordinary={GITHUB_WORKFLOW:'Run current RavRadar weather once',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',
      GITHUB_SHA:'82200280c42b9060f14be2721ba7b766e0ede5a6',OPERATIONAL_ACTION:'integrated'};
    assert.doesNotThrow(()=>currentSource.ACTIVE_ASSISTANT_SUCCESSOR.assertCaller(ordinary));
    for(const invalid of [{...ordinary,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair'},{...ordinary,COMPLETED_PRIVATE_RUNTIME:'true'}])
      assert.throws(()=>currentSource.ACTIVE_ASSISTANT_SUCCESSOR.assertCaller(invalid));
  });
  test('after599 current four register inverses retain the existing whole old rule',async()=>{
    const {assistantAfter599RegisterImportBeforeSource}=await import('./lib/model-source-imports.mjs');
    for(const file of ['scripts/check-assistant-later-h0-predecessor-source.mjs',
      'scripts/lib/authenticated-frozen586-predecessor.mjs','scripts/lib/established-native-current-origin.mjs',
      'scripts/assistant-later-h0-binding-prewrite.mjs']){
      const source=await fs.readFile(path.join(ROOT,file),'utf8');
      const original=assistantAfter599RegisterImportBeforeSource(source,file);
      assert.deepEqual(modelSourceRelativeModuleSpecifiers(source,file),modelSourceRelativeModuleSpecifiers(original,file));
      for(const changed of [source+'\n// unexplained change\n',source+"\nimport(unknown.path);\n"])
        assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file));
    }
  });

}
