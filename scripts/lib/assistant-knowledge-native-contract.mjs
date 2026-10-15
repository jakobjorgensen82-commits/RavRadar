// Proposed INTERNAL native-only loader. Nothing is frozen or executed here.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {requireAssistantKnowledgeBinding,ASSISTANT_KNOWLEDGE_SOURCE_PINS}
  from './assistant-knowledge-successor-source.mjs';

// Must be filled only after the two genuine normal modules below exist and are
// reviewed. Never use a callback/JSON report/current tuple as issued220 provenance.
const NATIVE_KB_MODULE_PINS=Object.freeze({"issued220":"5d51bb4c835c9e45d4ee5fbe4495597c5495b2bdabd4fef94d727d1fb2cd6b3d","after":"7e127feb294eaf2bf4c69ade3127fbe666e1e5b46a95cbfa50b37db22afc0e9a"});
export async function loadNativeAssistantKnowledgePrerequisites(){
  requireAssistantKnowledgeBinding();
  assert(ASSISTANT_KNOWLEDGE_SOURCE_PINS,'KB_SQL_SOURCE_UNFROZEN');
  assert(NATIVE_KB_MODULE_PINS,'KB_NATIVE_ISSUED220_FACTORY_AND_AFTER_ADAPTER_UNFROZEN');
  assert.deepEqual(Object.keys(NATIVE_KB_MODULE_PINS).sort(),['after','issued220']);
  const read=async(name,filename)=>{
    assert.match(NATIVE_KB_MODULE_PINS[name],/^[a-f0-9]{64}$/);
    const url=new URL(filename,import.meta.url),stat=await fs.lstat(url);
    assert(stat.isFile()&&!stat.isSymbolicLink());
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(url)).digest('hex'),
      NATIVE_KB_MODULE_PINS[name]);
    return import(url.href);
  };
  const issued=await read('issued220','./current-grid-issued-native-fixture.mjs');
  const after=await read('after','./assistant-knowledge-native-postgres.mjs');
  assert.equal(typeof issued.createIssuedCurrentGridFixture,'function');
  assert.equal(typeof issued.closeIssuedCurrentGridFixture,'function');
  assert.equal(typeof after.runNativeAssistantKnowledgeSuccessor,'function');
  return Object.freeze({createIssuedCurrentGridFixture:issued.createIssuedCurrentGridFixture,
    closeIssuedCurrentGridFixture:issued.closeIssuedCurrentGridFixture,
    runNativeAssistantKnowledgeSuccessor:after.runNativeAssistantKnowledgeSuccessor});
}
