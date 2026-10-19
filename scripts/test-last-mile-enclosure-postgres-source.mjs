// Source contract only; this target NEVER executes PostgreSQL or simulates it.
import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertLastMileEnclosureTransactionBounds,lastMileEnclosureBeforeGuards,
  LAST_MILE_ENCLOSURE_OLD_PG_ROWS,compareLastMileEnclosureSuccessor}
  from './lib/last-mile-enclosure-postgres.mjs';
import {LAST_MILE_ENCLOSURE_ALIASES,requireLastMileEnclosureBinding,requireLastMileEnclosureOutput,
  lastMileEnclosureMigration,readLastMileEnclosureCanonicalSource,lastMileEnclosureDefinition}
  from './lib/last-mile-enclosure-successor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
test('issued584 full migration keeps55s/5s and actual25OID/28body contract',async()=>{
  const next=requireLastMileEnclosureBinding(),pins=requireLastMileEnclosureOutput();
  assert.equal(next.version,'20261019060000');
  const migration=lastMileEnclosureMigration();
  const sql=await fs.readFile(path.join(ROOT,'supabase/migrations',migration.filename),'utf8');
  assert.equal(sha(sql),pins.migrationSha256);assertLastMileEnclosureTransactionBounds(sql);
  assert.throws(()=>assertLastMileEnclosureTransactionBounds(sql.replace("statement_timeout = '55s'","statement_timeout = '54s'")));
  assert.throws(()=>assertLastMileEnclosureTransactionBounds(sql.replace("lock_timeout = '5s'","lock_timeout = '6s'")));
  const after=await readLastMileEnclosureCanonicalSource();assert.equal(sha(after.canonicalSource),pins.canonicalSha256);
  const definition=lastMileEnclosureDefinition(after.canonicalSource,'ravradar_ravscore_checkpoint_contract');
  const oids=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(definition);assert(oids);
  assert.equal((oids[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,25);
  assert.equal((definition.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,28);
  assert.equal(LAST_MILE_ENCLOSURE_ALIASES.length,2);
});
test('native phase exposes eight concrete beforeguards and only the genuine old140000 bank identities',()=>{
  assert.equal(typeof compareLastMileEnclosureSuccessor,'function');
  const guards=lastMileEnclosureBeforeGuards();assert.equal(guards.length,8);
  assert.deepEqual(guards.map(row=>row[0]),['missing140000','missing230','forbiddenArchivedPhase','casDefiner','cas55s','casServiceGrant','oldPrivateAliasAcl','destinationAbsent']);
  for(const[name,drift,restore]of guards){assert.equal(typeof name,'string');assert(drift.endsWith(';'));assert(restore.endsWith(';'));assert.notEqual(drift,restore);}
  assert.deepEqual(LAST_MILE_ENCLOSURE_OLD_PG_ROWS,{same:'origin-current-same',newer:'origin-current-newer',changed:'origin-current-changed'});
});
test('seven-hour constructor uses both real builders instead of sourceDocumentAt6 candidate49-hour history',async()=>{
  const text=await fs.readFile(path.join(ROOT,'scripts/lib/last-mile-enclosure-postgres.mjs'),'utf8');
  const begin=text.indexOf('export function lastMileEnclosureSevenHourSource(');
  const end=text.indexOf('export async function compareLastMileEnclosureSuccessor(',begin);
  assert(begin>=0&&end>begin);const cold=text.slice(begin,end);
  assert(cold.includes('Array.from({length:7}'));
  assert(cold.includes('buildIntegratedRavScoreStateSeries(partRows,'));
  assert(cold.includes('buildCandidateGDerivedStateSeries(partRows,'));
  assert(!/initialState\s*:/.test(cold));
  assert(cold.includes("assert.equal(integrated.initialStateSource,'COLD_START')"));
  assert(cold.includes('assert.equal(candidate.continuationState.transportMemoryReady,false)'));
  assert(cold.includes("kind:'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME'"));
  assert(!cold.includes('modelBundleSha256 ='));assert(!cold.includes('TESTONLY'));
});

// Actual current constructor/save/load evidence only; no PostgreSQL execution.
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {lastMileEnclosureSevenHourSource} from './lib/last-mile-enclosure-postgres.mjs';
import {loadRavScoreContinuationCheckpointForTarget} from './ravscore-continuation-checkpoint.mjs';
const CURRENT_FACTORY_RANGE_SHA256='832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2';
const CURRENT_FACTORY_IMPORTS=Object.freeze([
  ['buildIntegratedRavScoreStateSeries','../js/core/ravscore-integrated-state-pipeline.js'],
  ['buildCandidateGDerivedStateSeries','../js/core/ravscore-candidate-g-state-pipeline.js'],
  ['ravScoreModelBinding','../js/core/ravscore-model-contract.js'],
  ['ravScoreModelBinding as candidateGRollbackModelBinding','./rollback-assets/ravscore-model-contract.js'],
  ['candidateGStateKey','./lib/coastal-point-staging-contract.mjs'],
  ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','./lib/ravscore-candidate-g-rollback-runtime.mjs'],
  ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','./ravscore-continuation-checkpoint.mjs'],
  ['ravScoreContinuationImplementationSha256','./lib/ravscore-continuation-implementation-contract.mjs'],
]);
async function currentLastMileCheckpointFactory(){
  const text=(await fs.readFile(path.join(ROOT,'scripts/test-protected-ravscore-continuation-checkpoint.mjs'),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const slice=(begin,end)=>{
    assert.equal(text.split(begin).length,2);assert.equal(text.split(end).length,2);
    const start=text.indexOf(begin),stop=text.indexOf(end);assert(start>=0&&stop>start);
    return text.slice(start,stop);
  };
  const factory=slice('const PART_COUNT =','const safeShape =')
    +slice('const samples =','const sourceDocument =');
  assert.equal(sha(factory),CURRENT_FACTORY_RANGE_SHA256,'Use the genuine whole current factory, never a retagged scaffold');
  const imports=[...text.matchAll(/\bimport\s*\{([^}]+)\}\s*from\s*(['"])([^'"\r\n]+)\2\s*;/g)];
  const names=raw=>raw.split(',').map(value=>value.trim().replace(/\s+/g,' ')).filter(Boolean);
  for(const[wanted,specifier]of CURRENT_FACTORY_IMPORTS){
    const matches=imports.filter(row=>row[3]===specifier&&names(wanted).every(name=>names(row[1]).includes(name)));
    assert.equal(matches.length,1,'Exactly one genuine named-import declaration for '+specifier);
  }
  const declarations=CURRENT_FACTORY_IMPORTS.map(([wanted,specifier])=>'import { '+wanted+' } from '
    +JSON.stringify(pathToFileURL(path.resolve(ROOT,'scripts',specifier)).href)+';');
  const moduleSource="import crypto from 'node:crypto';\n"+declarations.join('\n')+'\n'+factory
    +'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,'
    +'candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};\n';
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
  const next=requireLastMileEnclosureBinding();
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,next.I);
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,next.C);
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,next.T);
  return loaded;
}
test('genuine current673 constructor saves and reloads exactly seven new I/G hours without the factory49-hour G donor',async()=>{
  const factory=await currentLastMileCheckpointFactory(),next=requireLastMileEnclosureBinding();
  // Prove the specific old test-fixture trap before testing the real cold constructor.
  const ordinarySix=factory.sourceDocumentAt(6);
  const ordinaryG=Object.values(ordinarySix.ravScoreCandidateGRollback.runtime.parts)[0].ravScoreModel.currentState;
  assert.equal(ordinaryG.transportEvidence.length,49);
  assert.equal(ordinaryG.transportEvidence[0].time,factory.atHour(-42));
  const cold=lastMileEnclosureSevenHourSource(factory.sourceDocumentAt,factory.atHour);
  const expectedTimes=Array.from({length:7},(_,hour)=>factory.atHour(hour));
  assert.equal(cold.productionReferenceAt,factory.atHour(6));
  assert.equal(cold.ravScoreCandidateGWarmup.sourceModelBinding.modelBundleSha256,next.I);
  assert.equal(cold.ravScoreCandidateGWarmup.candidateModelBinding.modelBundleSha256,next.C);
  assert.equal(cold.ravScoreCandidateGWarmup.runtime.modelBinding.modelBundleSha256,next.C);
  const integratedParts=cold.coastalParts.parts,candidateParts=cold.ravScoreCandidateGWarmup.runtime.parts;
  const ids=Object.keys(integratedParts).sort();assert.equal(ids.length,673);
  assert.deepEqual(Object.keys(candidateParts).sort(),ids);
  for(const partId of ids){
    const integrated=integratedParts[partId].ravScoreModel.currentState;
    const candidate=candidateParts[partId].ravScoreModel.currentState;
    assert.deepEqual(integrated.currentEvidence.map(row=>row.time),expectedTimes);
    assert.deepEqual(candidate.transportEvidence.map(row=>row.time),expectedTimes);
    assert.equal(integrated.currentEvidence.length,7);assert.equal(candidate.transportEvidence.length,7);
    assert.equal(integrated.time,factory.atHour(6));assert.equal(candidate.time,factory.atHour(6));
    assert.equal(integrated.currentMemoryReady,false);assert.equal(candidate.transportMemoryReady,false);
    assert.equal(integrated.modelBundleSha256,next.I);
  }
  const temporaryParent=await fs.realpath(os.tmpdir());
  const work=await fs.mkdtemp(path.join(temporaryParent,'rr-last-mile-seven-source-'));
  const ownedReal=await fs.realpath(work),owned=await fs.lstat(work,{bigint:true});
  assert.equal(path.dirname(ownedReal),temporaryParent);assert(owned.isDirectory()&&!owned.isSymbolicLink());
  assert(path.basename(ownedReal).startsWith('rr-last-mile-seven-source-'));
  let complete=false;
  try{
    const sourcePath=path.join(work,'conditions.json');
    const checkpointPath=path.join(work,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await fs.writeFile(sourcePath,JSON.stringify(cold)+'\n',{flag:'wx'});
    const sourceBytes=await fs.readFile(sourcePath);
    const saved=await factory.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot:ROOT});
    assert.equal(saved.saved,true);assert.equal(saved.partCount,673);assert.equal(saved.candidateGRollbackPartCount,673);
    assert.equal(saved.modelBundleSha256,next.I);assert.equal(saved.continuationStateContractSha256,next.T);
    const checkpointBytes=await fs.readFile(checkpointPath),checkpoint=JSON.parse(checkpointBytes);
    assert.equal(checkpoint.modelBinding.modelBundleSha256,next.I);
    assert.equal(checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256,next.C);
    assert.equal(checkpoint.continuationStateContractSha256,next.T);
    assert.equal(checkpoint.partCount,673);assert.equal(checkpoint.candidateGRollbackCompanion.partCount,673);
    assert.deepEqual(Object.keys(checkpoint.states).sort(),ids);
    assert.deepEqual(Object.keys(checkpoint.candidateGRollbackCompanion.states).sort(),ids);
    const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath,targetReference:factory.atHour(7),repositoryRoot:ROOT});
    assert.equal(loaded.loaded,true);assert.equal(loaded.continuationAvailable,true);assert.equal(loaded.reason,'checkpoint-ready');
    assert.equal(loaded.partCount,673);assert.equal(loaded.checkpointAt,factory.atHour(6));
    assert.equal(loaded.targetReferenceAt,factory.atHour(7));assert.equal(loaded.ageHours,1);
    assert.equal(loaded.modelBundleSha256,next.I);assert.equal(loaded.candidateGRollbackModelBinding.modelBundleSha256,next.C);
    assert.equal(loaded.continuationStateContractSha256,next.T);
    assert.equal(loaded.continuationReattestedFromImplementationSha256,null);
    assert.equal(loaded.continuationReattestedFromSourceHead,null);
    assert.deepEqual(Object.keys(loaded.states).sort(),ids);
    assert.deepEqual(Object.keys(loaded.candidateGRollbackStates).sort(),ids);
    for(const partId of ids){
      const integrated=integratedParts[partId].ravScoreModel.currentState;
      const candidate=candidateParts[partId].ravScoreModel.currentState;
      assert.deepEqual(checkpoint.states[partId],integrated);
      assert.deepEqual(checkpoint.candidateGRollbackCompanion.states[partId],candidate);
      assert.deepEqual(loaded.states[partId],integrated);
      assert.deepEqual(loaded.candidateGRollbackStates[partId],candidate);
      assert.deepEqual(loaded.states[partId].currentEvidence.map(row=>row.time),expectedTimes);
      assert.deepEqual(loaded.candidateGRollbackStates[partId].transportEvidence.map(row=>row.time),expectedTimes);
      assert.equal(loaded.states[partId].currentMemoryReady,false);
      assert.equal(loaded.candidateGRollbackStates[partId].transportMemoryReady,false);
    }
    assert.deepEqual(await fs.readFile(sourcePath),sourceBytes);
    assert.deepEqual(await fs.readFile(checkpointPath),checkpointBytes);
    complete=true;
  }finally{
    // On failure preserve this owned fixture for first-cause inspection.
    if(complete){
      const current=await fs.lstat(work,{bigint:true});
      assert(current.isDirectory()&&!current.isSymbolicLink());
      assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);
      assert.equal(await fs.realpath(work),ownedReal);assert.equal(path.dirname(ownedReal),temporaryParent);
      await fs.rm(ownedReal,{recursive:true,force:false});
    }
  }
});
