// Fælles ren kontrol af den allerede gennemgåede 591→593-projektion.
// Normal kalder binder aktuel T til sin fysisk afledte, udstedte kilde først.
// Denne funktion autentificerer ingen B/S og udsteder ingen adgang.
import assert from 'node:assert/strict';
import {FROZEN591_CODE_SOURCE_PROVENANCE as ORIGINAL591}
  from '../check-assistant-later-h0-predecessor-source.mjs';
const ORIGINAL=Object.freeze({
  continuationStateContractSha256:'b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d',
  fullRuntimeContractSha256:ORIGINAL591.fullRuntimeContractSha256,
  publicProjectionContractSha256:ORIGINAL591.publicProjectionContractSha256,
});
// Flyttet uændret fra den udstedte593-controllers præcise projektionskontrol.
const COMPACT_PUBLIC_PROJECTION='24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec';
export function assertFrozen591CompactRuntimeContracts(previous,current){
  assert.equal(arguments.length,2);
  assert.deepEqual(previous,ORIGINAL,'Hele den autentificerede591-kontraktmap');
  assert.match(current?.continuationStateContractSha256??'',/^[a-f0-9]{64}$/);
  assert.notEqual(current.continuationStateContractSha256,ORIGINAL.continuationStateContractSha256);
  assert.deepEqual(current,{...ORIGINAL,
    continuationStateContractSha256:current.continuationStateContractSha256,
    publicProjectionContractSha256:COMPACT_PUBLIC_PROJECTION},
  'Hele den gennemgåede kompakte projektion med uændret lager-ABI');
  return true;
}
