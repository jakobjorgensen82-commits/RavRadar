// Test phase selection only. No metadata is written or reset and no native
// capability is created. Real current/native/national cases do not use this.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SOURCE_PRODUCER_AFTER597_PARENT as source}
  from './source-producer-after597-parent.mjs';
import {requireSourceProducerOutput} from './source-producer-after597-runtime-family.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as active,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR as old597,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as genuine598}
  from './assistant-later-h0-successor-source.mjs';

export function sourceAfter598PreissuanceTest(name,optionsOrBody,optionalBody){
  assert(arguments.length===2||arguments.length===3);
  const body=arguments.length===2?optionsOrBody:optionalBody;
  const options=arguments.length===2?{}:optionsOrBody;
  assert.equal(typeof body,'function');
  return test(name,options,async context=>{
    if(source.binding===null&&source.output===null&&source.nextRelease===null)return body(context);
    requireSourceProducerOutput(); // Binding-only/invalid issued state MUST fail.
    context.skip('Historical pre-issuance NULL/package598 premise: not applicable after normal Source output guard. Current native, clock and national gates remain required.');
  });
}

export function historicalScalar597SyncTest(name,body){
  assert.equal(arguments.length,2);assert.equal(typeof body,'function');
  return test(name,async context=>{
    if(active===old597&&genuine598.binding===null&&genuine598.output===null)return body(context);
    if(source.binding!==null||source.output!==null||source.nextRelease!==null)requireSourceProducerOutput();
    else {assert.equal(active,genuine598);genuine598.requireBinding();genuine598.requireOutput();genuine598.requireRelease();}
    context.skip('Historical scalar597/NULL-assistant598 sync premise: not applicable after actual issued-family output guard. Current normal sync and native gates remain required.');
  });
}
