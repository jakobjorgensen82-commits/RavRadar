// Lokale normale kildekaldere. Ingen SQL, originale B/S, provider eller drift.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {
  assistantAfter597CheckpointInspectionView,
  nativeOriginalContinuityCheckpointInspectionView,
  assistantLaterH0CheckpointInspectionView,
  assistantPublic587SuccessorCheckpointInspectionView,
  assistantPublic588SuccessorCheckpointInspectionView,
  assistantPublic590SuccessorCheckpointInspectionView,
  assistantPublic591SuccessorCheckpointInspectionView,
  installed593Original591CheckpointInspectionView,
  scalar597LaterH0CheckpointInspectionView,
  checkpointMetadataCasBlock,synchronizeRavScoreModelBinding,
} from './sync-ravscore-model-binding.mjs';
import {readNativeOriginalContinuityCanonicalSource}
  from './lib/native-original-continuity-successor-source.mjs';
import {
  ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as NEXT,
  readAssistantLaterH0CanonicalSource,readAssistantPublic587SuccessorCanonicalSource,
  readAssistantPublic588SuccessorCanonicalSource,readAssistantPublic590SuccessorCanonicalSource,
  readAssistantPublic591SuccessorCanonicalSource,readInstalled593Original591CanonicalSource,
  readScalar597LaterH0CanonicalSource,SCALAR597_LATER_H0_ALIASES,
} from './lib/assistant-later-h0-successor-source.mjs';
import {RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,ravScoreContinuationImplementationSha256}
  from './lib/ravscore-continuation-implementation-contract.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const CONSUMERS=['knowledge/rav-assistant-public-v1.json','scripts/fixtures/rav-assistant-evals-v1.json',
  'version.json','data/admin/ravscore-profile-selection.json',
  'supabase/functions/_shared/rav-assistant-contract.ts','supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql'];

test('alle gamle navngivne kontrolvisninger læser deres egne ægte hele kanoniske kilder',async()=>{
  const pairs=[
    [readNativeOriginalContinuityCanonicalSource,nativeOriginalContinuityCheckpointInspectionView],
    [readAssistantLaterH0CanonicalSource,assistantLaterH0CheckpointInspectionView],
    [readAssistantPublic587SuccessorCanonicalSource,assistantPublic587SuccessorCheckpointInspectionView],
    [readAssistantPublic588SuccessorCanonicalSource,assistantPublic588SuccessorCheckpointInspectionView],
    [readAssistantPublic590SuccessorCanonicalSource,assistantPublic590SuccessorCheckpointInspectionView],
    [readAssistantPublic591SuccessorCanonicalSource,assistantPublic591SuccessorCheckpointInspectionView],
    [readInstalled593Original591CanonicalSource,installed593Original591CheckpointInspectionView],
    [readScalar597LaterH0CanonicalSource,scalar597LaterH0CheckpointInspectionView],
  ];
  for(const[read,inspect]of pairs){
    const original=await read();assert.equal(original.admission,'NO_ADMISSION');
    const source=original.canonicalSource,bytes=Buffer.from(source),view=inspect(source);
    assert(view.length<source.length);assert.deepEqual(Buffer.from(source),bytes);
    for(const invalid of [source+'\n-- ukendt variant\n',source.slice(1),source+source])
      assert.throws(()=>inspect(invalid),/entire issued canonical source/);
  }
  const scalar=(await readScalar597LaterH0CanonicalSource()).canonicalSource;
  const view=scalar597LaterH0CheckpointInspectionView(scalar);
  for(const row of SCALAR597_LATER_H0_ALIASES)
    assert(!view.includes('create or replace function public.'+row.name+'('));
  const block=checkpointMetadataCasBlock(scalar,ravScoreModelBinding(),candidateBinding(),
    await ravScoreContinuationImplementationSha256({repositoryRoot:ROOT}));
  assert(scalar.includes(block));
  assert.equal(ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
});

test('ny kontrolvisning afviser uudstedt før input, filadgang og netadgang',async t=>{
  let accessed=0;
  const hostile=new Proxy({},{get(){accessed++;throw Error('UVENTET_INPUT');}});
  for(const key of ['readFile','writeFile','lstat','stat','readdir','mkdir','copyFile'])
    t.mock.method(fs,key,async()=>{accessed++;throw Error('UVENTET_FILADGANG');});
  t.mock.method(globalThis,'fetch',async()=>{accessed++;throw Error('UVENTET_NETADGANG');});
  assert.throws(()=>assistantAfter597CheckpointInspectionView(hostile),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>assistantAfter597CheckpointInspectionView(),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>assistantAfter597CheckpointInspectionView(hostile,{family:'594'}),/ASSISTANT_AFTER597_UNISSUED/);
  assert.equal(accessed,0);assert.equal(NEXT.binding,null);assert.equal(NEXT.output,null);
  assert.equal(ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
});

test('normal synkronisering og genkontrol bevarer mixedV2 Edge og afviser defekt SQL før skrivning',async()=>{
  const stage=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after597-normal-sync-'));
  const migration='supabase/migrations/'+ACTIVE.migration().filename;
  const files=[...new Set([...CONSUMERS,...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,migration])];
  try{
    for(const file of files){
      const target=path.join(stage,file);await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.copyFile(path.join(ROOT,file),target);
    }
    const edgePath=path.join(stage,'supabase/functions/_shared/rav-assistant-contract.ts');
    const edgeBefore=await fs.readFile(edgePath);
    // Hele den allerede gennemgåede Edge-semantik, med ægte597-binding.
    assert.equal(digest(edgeBefore),'c15f449bd4ab9845aed89acb8690db4cc69753d8c823d347d1c24bd7ec7f844d');
    const first=await synchronizeRavScoreModelBinding({write:true,root:stage});
    assert.deepEqual(first.binding,ravScoreModelBinding());
    assert.deepEqual(first.candidateBinding,candidateBinding());
    assert.deepEqual(await fs.readFile(edgePath),edgeBefore);
    const after=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
    const second=await synchronizeRavScoreModelBinding({root:stage});
    assert.deepEqual(second.changed,[]);
    for(const[file,bytes]of after)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
    const bad='supabase/schema.sql',badPath=path.join(stage,bad);
    const sql=await fs.readFile(badPath,'utf8');
    const marker='-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN';
    assert.equal(sql.split(marker).length,2);
    await fs.writeFile(badPath,sql+'\n'+marker+'\n');
    const beforeRejected=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
    await assert.rejects(synchronizeRavScoreModelBinding({write:true,root:stage}),/missing or duplicated/);
    for(const[file,bytes]of beforeRejected)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
  }finally{
    // Kun dette tests egne, konkrete midlertidige træ.
    assert(path.basename(stage).startsWith('rr-after597-normal-sync-'));
    assert.equal(path.dirname(stage),path.resolve(os.tmpdir()));
    await fs.rm(stage,{recursive:true,force:false});
  }
});
