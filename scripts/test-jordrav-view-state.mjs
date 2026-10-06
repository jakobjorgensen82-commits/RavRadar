import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { TRACE_CLASSES, acceptsPotential, parseView, encodeView, featureReference } from '../js/jordrav/view-state.js';
import { MANIFEST_SHA256, DATA_BASE } from '../js/jordrav/dataset-binding.js';
import { geometryBounds } from '../js/jordrav/data-service.js';

const state={latitude:57.167,longitude:10.433,zoom:13,base:'aerial',trace:'coastal',mode:'potential',opacity:35,
  focus:true,show:true,fields:true,deep:false,dataset:MANIFEST_SHA256,feature:null,point:null};

test('each geological lead filters the existing category without ranking or excluding general geology from all',()=>{
  const potentials=[...TRACE_CLASSES,'possible','limited','unresolved'];
  for(const trace of TRACE_CLASSES)for(const potential of potentials)for(const focus of [true,false])
    assert.equal(acceptsPotential(potential,trace,focus),trace===potential);
  for(const potential of potentials){
    assert.equal(acceptsPotential(potential,'all',false),true);
    assert.equal(acceptsPotential(potential,'all',true),TRACE_CLASSES.includes(potential));
  }
});
test('saved views round-trip all controls, dataset binding and clipped-fragment identity',()=>{
  const feature={properties:{o:'gap:n12:g45'},bbox:[10.4,57.16,10.41,57.17]};
  const reference=featureReference(feature);
  assert.equal(reference,'gap:n12:g45~10.40000000,57.16000000,10.41000000,57.17000000');
  assert.notEqual(reference,featureReference({...feature,bbox:[10.4,57.16,10.415,57.17]}));
  for(const base of ['street','aerial'])for(const mode of ['potential','access'])for(const show of [true,false]){
    const original={...state,base,mode,show,feature:reference};
    assert.deepEqual(parseView(encodeView(original)),{state:original,error:false});
  }
  const deep={...state,point:'aalbaek-deep-sand'};
  assert.deepEqual(parseView(encodeView(deep)),{state:deep,error:false});
});
test('malformed links, duplicate fields, injected IDs and stale formats cannot fabricate a selection',()=>{
  const hash=encodeView(state);
  for(const suffix of ['&zoom=13','&trace=basin','&point=a&feature=n1%7E10,57,11,58','&point=%3Cscript%3E','&feature=n1%7E10,57,11,58%7Eextra'])
    assert.equal(parseView(hash+suffix).error,true,suffix);
  for(const [key,value] of [['v','2'],['map','57,10,18'],['map','Infinity,10,13'],['map','86,10,13'],['map','57,181,13'],['map','57,10,13.5'],['opacity','NaN'],['opacity','90'],['fields','true'],['dataset','123'],['base','https://other.example']]){
    const params=new URLSearchParams(hash.slice(1));params.set(key,value);
    assert.equal(parseView(`#${params}`).error,true,`${key}:${value}`);
  }
  assert.equal(parseView('#v='+ 'a'.repeat(1200)).error,true);
  assert.deepEqual(parseView(''),{state:null,error:false});
  assert.deepEqual(parseView('#method'),{state:null,error:false});
  assert.equal(featureReference({properties:{o:'<script>'},bbox:[10,57,11,58]}),null);
  assert.equal(featureReference({properties:{o:'n1'},bbox:[11,58,10,57]}),null);
});
test('all existing national detail origins can be saved, without changing dataset bytes',async()=>{
  const root=DATA_BASE;
  const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',root)));
  let features=0;const references=new Set();
  for(const tile of manifest.tiles){
    const bytes=await fs.readFile(new URL(tile.file,root));
    const collection=JSON.parse(gunzipSync(bytes));
    for(const feature of collection.features){
      const reference=featureReference({...feature,bbox:geometryBounds(feature.geometry)});
      assert.ok(reference,feature.properties.o);
      assert.ok(!references.has(reference),`Ambiguous fragment reference: ${reference}`);
      references.add(reference);
      features++;
    }
  }
  assert.equal(features,505834);
});
