// INTERNAL native-only response phase; never a runtime or installer admission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {requireAssistantResponseBinding,ASSISTANT_RESPONSE_SOURCE_PINS}
  from './assistant-response-successor-source.mjs';
const NATIVE_RESPONSE_MODULE_PINS=Object.freeze({
  issued220:'5d51bb4c835c9e45d4ee5fbe4495597c5495b2bdabd4fef94d727d1fb2cd6b3d',
  after:'47e3df77ca35a54571c2b9e5a506367d0a2e3c20e831024657bfa408f785cabe',
});
export async function loadNativeAssistantResponsePrerequisites(){
  requireAssistantResponseBinding();
  assert(ASSISTANT_RESPONSE_SOURCE_PINS,'RESPONSE_SQL_SOURCE_UNFROZEN');
  assert.deepEqual(Object.keys(NATIVE_RESPONSE_MODULE_PINS).sort(),['after','issued220']);
  const read=async(name,filename)=>{
    assert.match(NATIVE_RESPONSE_MODULE_PINS[name],/^[a-f0-9]{64}$/);
    const url=new URL(filename,import.meta.url),stat=await fs.lstat(url);
    assert(stat.isFile()&&!stat.isSymbolicLink());
    assert.equal(crypto.createHash('sha256').update(await fs.readFile(url)).digest('hex'),
      NATIVE_RESPONSE_MODULE_PINS[name]);
    return import(url.href);
  };
  const issued=await read('issued220','./current-grid-issued-native-fixture.mjs');
  const after=await read('after','./assistant-response-native-postgres.mjs');
  assert.equal(typeof issued.createIssuedCurrentGridFixture,'function');
  assert.equal(typeof issued.closeIssuedCurrentGridFixture,'function');
  assert.equal(typeof after.runNativeAssistantResponseSuccessor,'function');
  return Object.freeze({createIssuedCurrentGridFixture:issued.createIssuedCurrentGridFixture,
    closeIssuedCurrentGridFixture:issued.closeIssuedCurrentGridFixture,
    runNativeAssistantResponseSuccessor:after.runNativeAssistantResponseSuccessor});
}

// The preserved historical flag has its own fixed1414 constructors. This
// loader does not admit response SQL or create a production runtime owner.
export async function loadNativeIssuedAssistantKnowledgeConstructors(){
  const url=new URL('./assistant-knowledge-issued-native-fixture.mjs',import.meta.url);
  const stat=await fs.lstat(url);
  assert(stat.isFile()&&!stat.isSymbolicLink());
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(url)).digest('hex'),
    'e977b60bb008f296c5d6cf4571bcc2831dabf6a05dd382b1cc0ee26c8e10cce1');
  const issued=await import(url.href);
  assert.equal(typeof issued.createIssuedAssistantKnowledgeFixture,'function');
  assert.equal(typeof issued.closeIssuedAssistantKnowledgeFixture,'function');
  return Object.freeze({createIssuedAssistantKnowledgeFixture:issued.createIssuedAssistantKnowledgeFixture,
    closeIssuedAssistantKnowledgeFixture:issued.closeIssuedAssistantKnowledgeFixture});
}
