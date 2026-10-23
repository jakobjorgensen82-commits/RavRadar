// Small SOURCE test: exact real adapter literal/receipt predicate, unchanged
// normal supervisor and a TESTONLY local producer. No model/673/provider work.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const ROOT = process.env.RAVRADAR_PRIVATE_COLD_WRAPPER_TEST_ROOT
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = process.env.RAVRADAR_PRIVATE_COLD_CLI_TEST_SOURCE
  ?? path.join(ROOT, 'scripts/run-current-family-cold-start.mjs');
const text = await fs.readFile(CLI, 'utf8');
const literal = /const STAGED_STOP_CODE = (`[\s\S]*?`);/.exec(text)?.[1];
assert(literal && !literal.includes('${'), 'The staged adapter must remain a literal.');
const staged = new Function('return ' + literal)();
const begin = text.indexOf('requireFlag(Object.keys(receipt).sort()');
const ending = "'PRODUCER_STOP_UNPROVED');";
const end = text.indexOf(ending, begin);
assert(begin >= 0 && end > begin);
const predicate = new Function('receipt','nonce','completion','requireFlag',text.slice(begin,end+ending.length));
const accepted = (receipt, nonce, completion) => {
  try { predicate(receipt,nonce,completion,(ok,code)=>{if(!ok) throw new Error(code);}); return true; }
  catch { return false; }
};
async function run(mode, { collision = false, missing = false, signal = false } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cold-stop-')));
  await fs.mkdir(path.join(root,'scripts'));
  await fs.copyFile(path.join(ROOT,'scripts/run-dmi-bulk-supervised.py'),path.join(root,'scripts/run-dmi-bulk-supervised.py'));
  const producer = `import os,sys,time
assert 'RAVRADAR_COLD_STOP_NONCE' not in os.environ
assert 'RAVRADAR_COLD_STOP_FILE' not in os.environ
print('CONTROLLED_PRODUCER_READY',flush=True)
if os.environ['COLD_TEST_MODE']=='signal':
    time.sleep(0.5)
sys.exit(2 if os.environ['COLD_TEST_MODE']=='nonzero' else 0)
`;
  await fs.writeFile(path.join(root,'scripts/update-dmi-bulk.py'),producer,{flag:'wx'});
  const nonce = crypto.randomBytes(24).toString('hex');
  const receipt = path.join(root,missing?'absent/receipt.json':'receipt.json');
  const foreign = {schemaVersion:1,kind:'ACTUAL_NORMAL_SUPERVISOR_RETURN',nonce:'FOREIGN',exitCode:1,closed:true};
  if(collision) await fs.writeFile(receipt,JSON.stringify(foreign),{flag:'wx'});
  const child = spawn(process.env.PYTHON ?? 'python',['-B','-u','-c',staged],{
    cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,
      RAVRADAR_COLD_STOP_NONCE:nonce,RAVRADAR_COLD_STOP_FILE:receipt,COLD_TEST_MODE:mode,
      DMI_BULK_MAX_RUNTIME_SECONDS:'180',DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS:'120',
    }});
  let stdout='',stderr='',sent=false;
  const completion=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('LOCAL_TEST_DEADLINE'));},20000);
    child.stdout.on('data',chunk=>{stdout+=chunk;if(signal&&!sent&&stdout.includes('CONTROLLED_PRODUCER_READY')){sent=true;child.kill('SIGTERM');}});
    child.stderr.on('data',chunk=>{stderr+=chunk;});
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  if(signal) await new Promise(resolve=>setTimeout(resolve,750));
  let value=null; try{value=JSON.parse(await fs.readFile(receipt));}catch{}
  return {root,nonce,receipt,value,stdout,stderr,completion};
}
test('actual normal supervisor/adapter owns its own closed receipt at zero and nonzero exit',async()=>{
  for(const mode of ['positive','nonzero']) {
    const row=await run(mode);
    assert.equal(row.completion.code,mode==='nonzero'?2:0,row.stderr);
    assert.equal(row.completion.signal,null);
    assert(accepted(row.value,row.nonce,row.completion));
    assert.match(row.stdout,/CONTROLLED_PRODUCER_READY/);
  }
});
test('actual missing or foreign collision receipt cannot authorize closure',async()=>{
  for(const options of [{missing:true},{collision:true}]) {
    const row=await run('positive',options);
    assert.notEqual(row.completion.code,0);
    assert(!accepted(row.value,row.nonce,row.completion));
    if(options.collision) assert.equal(row.value.nonce,'FOREIGN','wx must preserve foreign bytes');
  }
});
test('actual signal stops normal adapter without accepting a receipt',async()=>{
  const row=await run('signal',{signal:true});
  assert(row.completion.signal!==null||row.completion.code!==0);
  assert(!accepted(row.value,row.nonce,row.completion));
});
test('receipt predicate rejects wrong nonce/code/shape even after an actual positive return',async()=>{
  const row=await run('positive'); assert(accepted(row.value,row.nonce,row.completion));
  for(const value of [{...row.value,nonce:'FOREIGN'},{...row.value,exitCode:2},{...row.value,closed:false},
    {...row.value,unexpected:true},{...row.value,kind:'JSON_CLAIM'}])
    assert(!accepted(value,row.nonce,row.completion));
});
test('CLI diagnostics allow only the fixed helper-code catalogue, never raw unknown messages',()=>{
  const literal=/const SAFE_HELPER_CODES = new Set\((\[[^\n]*\])\);/.exec(text)?.[1];
  assert(literal); const codes=new Set(JSON.parse(literal));
  assert(codes.has('CURRENT_FAMILY_COLD_START_FILE_IDENTITY'));
  assert(codes.has('CURRENT_FAMILY_COLD_START_ORIGINAL_CANDIDATE_CHANGED'));
  const currentCodes = ['CURRENT_FAMILY_COLD_START_PENDING_POINT_PROMOTION',
    ...['BOUNDS_INVALID', 'CHANGED', 'DUPLICATE_KEY', 'INVALID_FILE', 'INVALID_JSON',
      'INVALID_KEY', 'INVALID_SIZE', 'RECORD_DESCRIPTOR_INVALID', 'RECORD_SIZE_LIMIT',
      'SHAPE_INVALID', 'STRUCTURE_LIMIT', 'MISSING', 'READ_UNAVAILABLE']
      .map(code => 'DMI_FORECAST_FILE_' + code),
    'DMI_PART_CONTINUITY_NATIVE_ORIGINAL_INVALID',
    'DMI_PART_CONTINUITY_TOTAL_RAW_SIZE_LIMIT',
    'DMI_PART_CONTINUITY_TOTAL_COMPRESSED_SIZE_LIMIT',
    'DMI_PART_CONTINUITY_INPUT_INVALID',
    'DMI_PART_CONTINUITY_DOMAIN_INVALID',
    'DMI_PART_CONTINUITY_RECORD_INVALID',
    'DMI_PART_CONTINUITY_PART_SIZE_LIMIT',
    'DMI_PART_CONTINUITY_PART_COMPRESSED_SIZE_LIMIT',
    'DMI_PART_CONTINUITY_MARKER_INVALID',
    'DMI_PART_CONTINUITY_ENTRY_INVALID',
    'DMI_PART_CONTINUITY_COMPRESSED_DIGEST_INVALID',
    'DMI_PART_CONTINUITY_RAW_DIGEST_INVALID',
    'DMI_PART_CONTINUITY_JSON_INVALID',
    'DMI_PART_CONTINUITY_DOCUMENT_INVALID',
    'DMI_PART_CONTINUITY_TOTAL_SIZE_MISMATCH',
    'DMI_NATIVE_PROOF_BANK_BOUND',
    'DMI_NATIVE_PROOF_BANK_INVALID',
    'DMI_NATIVE_PROOF_CONTEXT_CONFLICT',
    'DMI_NATIVE_PROOF_CONTEXT_DIGEST_INVALID',
    'DMI_NATIVE_PROOF_CONTEXT_INVALID',
    'DMI_NATIVE_PROOF_CONTEXT_REFERENCE_MISSING',
    'DMI_NATIVE_PROOF_DOMAIN_BOUND',
    'DMI_NATIVE_PROOF_DONOR_BOUND',
    'DMI_NATIVE_PROOF_ENDPOINT_MISMATCH',
    'DMI_NATIVE_PROOF_ENTRY_DUPLICATE_OR_ORDER',
    'DMI_NATIVE_PROOF_ENTRY_INVALID',
    'DMI_NATIVE_PROOF_GEOMETRY_MISMATCH',
    'DMI_NATIVE_PROOF_INPUT_BOUND',
    'DMI_NATIVE_PROOF_NATIVE_CONFLICT',
    'DMI_NATIVE_PROOF_NATIVE_DIGEST_INVALID',
    'DMI_NATIVE_PROOF_NATIVE_DUPLICATE_OR_ORDER',
    'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING',
    'DMI_NATIVE_PROOF_NATIVE_INVALID',
    'DMI_NATIVE_PROOF_NATIVE_RECORD_INVALID',
    'DMI_NATIVE_PROOF_NATIVE_REFERENCE_MISSING',
    'DMI_NATIVE_PROOF_PROJECTION_MISMATCH',
    'DMI_NATIVE_PROOF_RECORD_BOUND',
    'DMI_NATIVE_PROOF_RECORD_SHAPE',
    'DMI_NATIVE_PROOF_SCOPED_ORIGINAL_CONTEXT_UNAVAILABLE',
    'DMI_NATIVE_PROOF_SELECTION_DUPLICATE',
    'DMI_NATIVE_PROOF_SELECTION_INVALID',
    'DMI_NATIVE_PROOF_SELECTION_NOT_PROVED',
    'DMI_NATIVE_PROOF_UNREFERENCED_EVIDENCE'];
  for (const code of currentCodes) assert(codes.has(code), code);
  const body = text.slice(text.lastIndexOf('}).catch(error => {') + '}).catch(error => {'.length,
    text.lastIndexOf('  });'));
  assert(body.includes('SAFE_HELPER_CODES.has(error.message)'));
  const report = new Function('error', 'SAFE_HELPER_CODES', 'console', 'process', body);
  for (const message of [...currentCodes, 'DMI_FORECAST_FILE_SECRET_PAYLOAD',
    'DMI_PART_CONTINUITY_SECRET_PAYLOAD', 'DMI_NATIVE_PROOF_SECRET_PAYLOAD',
    'DMI_PART_CONTINUITY_NATIVE_ORIGINAL_INVALID: private content',
    'DMI_NATIVE_PROOF_PROJECTION_MISMATCH: private content',
    'DMI_FORECAST_FILE_INVALID_JSON: private content', 'ENOENT: private path']) {
    const lines = [], processResult = { exitCode: 0 };
    report({ message }, codes, { error: value => lines.push(value) }, processResult);
    assert.deepEqual(lines, [currentCodes.includes(message) ? message : 'CURRENT_FAMILY_COLD_CLI_REFUSED']);
    assert.equal(processResult.exitCode, 1);
  }
  assert(!codes.has('CURRENT_FAMILY_COLD_START_SECRET_PAYLOAD'));
  assert(text.includes('SAFE_HELPER_CODES.has(error.message)'));
  assert(text.includes("'CURRENT_FAMILY_COLD_CLI_REFUSED'"));
  assert(!text.includes('console.error(error.stack)'));
});
