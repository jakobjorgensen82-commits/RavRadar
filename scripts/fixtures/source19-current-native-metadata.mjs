// PRIVATE normal CURRENT metadata dispatch. No SQL issuer or reuse authority.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from '../lib/source-producer-current-native-profile.mjs';

const route = (scope, module, exportName, args=[], context=false, reconfirm=false) =>
  Object.freeze({scope,module,exportName,arguments:Object.freeze(args),context,reconfirm});
const MODES = Object.freeze({
  '--qualify':route('BACKEND','./source19-current-native-backend.mjs','qualify'),
  '--rpc-request':route('BACKEND','./source19-current-native-backend.mjs','rpcRequest'),
  '--initial-rpc-request':route('BACKEND','./source19-current-native-backend.mjs','rpcRequest',[true]),
  '--current598-initial-rpc-request':route('BACKEND','./source19-current-native-backend.mjs','current598InitialRpcRequest'),
  '--capture-github':route('FRESH_PROVENANCE','./source19-current-native-provenance.mjs','captureGithub'),
  '--capture-source-pr-native-test':route('FRESH_PROVENANCE','./source19-current-native-provenance.mjs','captureSourcePrNativeTest',[],true,false),
  '--reconfirm-source-pr-native-test':route('FRESH_PROVENANCE','./source19-current-native-provenance.mjs','captureSourcePrNativeTest',[],true,true),
});
export function sourceCurrentNativeMetadataMode(mode) {
  assert.equal(arguments.length,1,'Metadata mode accepts no caller root or loader');
  assert(typeof mode==='string'&&Object.hasOwn(MODES,mode),'Unknown normal CURRENT metadata mode');
  return MODES[mode];
}
const modulePath = value => path.posix.join('scripts/fixtures',value.module);
export function sourceCurrentNativeMetadataInputDeclarations() {
  assert.equal(arguments.length,0,'Metadata declarations accept no caller root or modes');
  const entries=Object.entries(MODES),modes=entries.map(([mode,value])=>Object.freeze({
    mode,scope:value.scope,path:modulePath(value),exportName:value.exportName,
    arguments:value.arguments,context:value.context,reconfirm:value.reconfirm}));
  const modules=scope=>Object.freeze([...new Set(entries.filter(([,value])=>value.scope===scope)
    .map(([,value])=>modulePath(value)))].sort().map(file=>Object.freeze({
      role:scope==='BACKEND'?'BACKEND_METADATA':'FRESH_METADATA_PROVENANCE',namespace:'CURRENT',path:file})));
  return Object.freeze({scope:'SOURCE_CURRENT_METADATA_OWNED_MODES_ONLY',
    backendModes:Object.freeze(modes.filter(value=>value.scope==='BACKEND')),
    freshModes:Object.freeze(modes.filter(value=>value.scope==='FRESH_PROVENANCE')),
    moduleDeclarations:modules('BACKEND'),freshModuleDeclarations:modules('FRESH_PROVENANCE'),
    sourceGraphClosed:false,pgExecuted:false,reuseAuthority:false});
}
async function loadMode(value) {
  return import(new URL(value.module,import.meta.url).href);
}
// Preserve the existing public export and the original function's own guards.
export async function captureSourcePrNativeTest(...args) {
  const value=sourceCurrentNativeMetadataMode('--capture-source-pr-native-test');
  return (await loadMode(value))[value.exportName](...args);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  requireSourceProducerOutput();assert.equal(process.argv.length,3);
  const value=sourceCurrentNativeMetadataMode(process.argv[2]),api=await loadMode(value);
  const args=value.context?[await api.sourcePrNativeContextInput(),{reconfirm:value.reconfirm}]:value.arguments;
  console.log(JSON.stringify(await api[value.exportName](...args)));
}
