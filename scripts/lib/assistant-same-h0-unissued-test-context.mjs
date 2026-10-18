// Test-only whole-source inverse. Never imported by a production caller.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {registerHooks} from 'node:module';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const target=new URL('./assistant-same-h0-successor-source.mjs',import.meta.url);
assert.equal(sha(fs.readFileSync(target)),'1a1d762098885116dbcc9a91f46ca2f5ac908458634d51120407de2f04430acb');
const fixture=fs.readFileSync(new URL('../fixtures/assistant-same-h0-unissued-source.txt',import.meta.url));
assert.equal(sha(fixture),'cc01b0773c228cc09b84f1857e8b0778cc49effe9067e205b14fec67e56a77ab');
// Exactly the reviewed null-BINDING/null-OUTPUT source at its ORIGINAL URL;
// all actual relative imports and normal functions execute unchanged.
const hooks=registerHooks({load(url,context,next){
  const actual=new URL(url);actual.search='';actual.hash='';
  return actual.href===target.href?{format:'module',source:fixture.toString('utf8'),shortCircuit:true}:next(url,context);
}});
process.on('exit',()=>hooks.deregister());
