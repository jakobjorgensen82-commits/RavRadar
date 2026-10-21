import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertCurrentHistoryRawRetentionOrder, inverseCurrentHistoryRawRetentionOrder,
  inverseCurrentFamilyColdStartWorkflow }
  from './lib/completed-private-runtime-workflow-review.mjs';
import { inspectDmiForecastGridSampling } from './lib/dmi-forecast-store.mjs';
import { assertDmiPartHourlyGridSamplingApplicable } from './lib/ravscore-production-adapters.mjs';
import { buildNewestValidRavScoreRecoverySources,
  originalCurrentDecoderHistory } from './lib/ravscore-recovery-source-priority.mjs';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';
import { buildRavScoreProductionPartSeries, ravScoreOwnerCurrentHistoryStartAt,
  retainOwnerCurrentTransitionOriginal } from './lib/ravscore-production-part-pipeline.mjs';
import * as productionPipeline from './lib/ravscore-production-part-pipeline.mjs';
import { planRavScoreCurrentHistoryForPart, buildRavScoreCurrentHistoryDemand }
  from './plan-ravscore-current-history.mjs';
import * as currentHistoryPlanner from './plan-ravscore-current-history.mjs';

test('planner first failure: actual assertion gets a stable qualified frame, not values',async()=>{
  let original;try{assert.equal('PRIVATE_ACTUAL','PRIVATE_EXPECTED','PRIVATE_MESSAGE');}catch(error){original=error;}
  const observed=await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(original,'COMMITTED_RAW_RETENTION');
  assert.equal(observed.phase,'COMMITTED_RAW_RETENTION');
  assert.equal(observed.code,'ERR_ASSERTION');
  assert.equal(observed.exceptionType,'ASSERTION_ERROR');assert.equal(observed.operator,'strictEqual');
  assert.equal(observed.frame.module,'scripts/test-protected-dmi-native-current-proofs.mjs');
  assert.match(observed.frame.sha256,/^[a-f0-9]{64}$/);assert(observed.frame.line>0);
  assert.doesNotMatch(JSON.stringify(observed),/PRIVATE|message|actual|expected|stack/);
  assert.equal(original.message.includes('PRIVATE_ACTUAL'),true);
});
test('planner first failure: only actual fixed code/operator/type values leave the CLI',async()=>{
  const known=new Error('PRIVATE');known.code='RAVSCORE_CURRENT_HISTORY_DEMAND_RETENTION_B_S_DIFFER';
  assert.equal((await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(known)).code,known.code);
  const unknown=new Error('PRIVATE');unknown.code='RAVSCORE_CURRENT_HISTORY_DEMAND_PRIVATE_SENTINEL';unknown.operator='PRIVATE_OPERATOR';
  const observed=await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(unknown);
  assert.equal(observed.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');assert.equal(observed.operator,null);
  assert.doesNotMatch(JSON.stringify(observed),/PRIVATE/);
});
test('planner first failure: proxies and getters are not invoked and external frames stay unknown',async()=>{
  let calls=0;const getter=new Error('PRIVATE');
  for(const key of ['code','stack','message'])Object.defineProperty(getter,key,{configurable:true,get(){calls++;throw Error('PRIVATE_GETTER');}});
  const proxy=new Proxy({}, {get(){calls++;throw Error('PRIVATE_PROXY');},getOwnPropertyDescriptor(){calls++;throw Error('PRIVATE_PROXY');}});
  const proxyPrototype=new Error('PRIVATE');Object.setPrototypeOf(proxyPrototype,proxy);
  for(const error of [proxy,proxyPrototype,getter,null,undefined,false,0]){
    const observed=await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(error);
    assert.equal(observed.frame,null);assert.doesNotMatch(JSON.stringify(observed),/PRIVATE/);
  }
  assert.equal(calls,0);
  const external=new Error('PRIVATE');external.stack='PRIVATE\n    at external (file:///outside/private.mjs:1:1)';
  assert.equal((await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(external)).frame,null);
  const formatterBefore=Object.getOwnPropertyDescriptor(Error,'prepareStackTrace');
  try{
    const nativeStackError=new Error('PRIVATE');
    Object.defineProperty(Error,'prepareStackTrace',{configurable:true,get(){calls++;throw Error('PRIVATE_FORMATTER');}});
    assert.equal((await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(nativeStackError)).frame,null);
    assert.equal(calls,0);
  }finally{
    if(formatterBefore)Object.defineProperty(Error,'prepareStackTrace',formatterBefore);
    else delete Error.prepareStackTrace;
  }
  for(const key of ['name','message']){
    const nonPrimitive=new Error('PRIVATE');
    const descriptor=Object.getOwnPropertyDescriptor(nonPrimitive,'stack');
    Object.defineProperty(nonPrimitive,key,{configurable:true,value:{toString(){calls++;throw Error('PRIVATE_CONVERSION');}}});
    // Materialize Node22's ordinary data stack before installing bad inputs;
    // Node24 keeps its real VM getter for this same negative case.
    if(Object.hasOwn(descriptor,'value'))Object.defineProperty(nonPrimitive,'stack',{...descriptor,value:undefined});
    assert.equal((await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(nonPrimitive)).frame,null);
    assert.equal(calls,0);
  }
});
test('planner first failure: normal CLI handler preserves the failing stop and original error',async()=>{
  const beforeExit=process.exitCode,beforeError=console.error,lines=[],original=new TypeError('PRIVATE');
  try{
    console.error=value=>lines.push(value);
    await currentHistoryPlanner.reportRavScoreCurrentHistoryFailure(original);
    assert.equal(process.exitCode,1);assert.equal(lines.length,1);
    const observed=JSON.parse(lines[0]);assert.equal(observed.kind,'RAVSCORE_CURRENT_HISTORY_FIRST_FAILURE');
    assert.equal(observed.exceptionType,'TYPE_ERROR');assert.equal(observed.privatePayloadIncluded,false);
    assert.doesNotMatch(lines[0],/PRIVATE/);assert.equal(original.message,'PRIVATE');
  }finally{console.error=beforeError;process.exitCode=beforeExit;}
});

import { collectPostH0DmiOriginalDependencies as collectOriginalDependencies }
  from './lib/post-h0-dmi-original-dependencies.mjs';

test('planner original dependency: actual collector reasons survive the normal CLI without payload',async()=>{
  const fs=await import('node:fs/promises');
  const producer=await fs.readFile(new URL('./lib/post-h0-dmi-original-dependencies.mjs',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(producer).digest('hex'),
    '0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc');
  const planner=await fs.readFile(new URL('./plan-ravscore-current-history.mjs',import.meta.url),'utf8');
  const actualReasons=[...new Set([...producer.matchAll(/fail\('([A-Z_]+)'(?:,|\))/g)].map(match=>match[1]))].sort();
  const whitelist=planner.match(/const originalDependencyReasons=new Set\(\[([\s\S]*?)\]\);/);
  assert(whitelist,'The entire fixed family must be explicit');
  const listed=[...whitelist[1].matchAll(/'([A-Z_]+)'/g)].map(match=>match[1]).sort();
  assert.equal(listed.length,13);assert.deepEqual(listed,actualReasons);
  for(const [args,suffix]of [[undefined,'INPUT_INVALID'],[{part:{},initialSelection:{}},'INITIAL_SELECTION_INVALID']]){
    let original;try{collectOriginalDependencies(args);}catch(error){original=error;}
    assert(original instanceof Error);const expected='POST_H0_DMI_ORIGINAL_'+suffix;
    assert.equal(original.originalDependencyCode,expected);assert.equal(original.code,undefined);
    const message=original.message;
    const observed=await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(original,'COMMITTED_RAW_RETENTION');
    assert.equal(observed.code,expected);assert.equal(observed.exceptionType,'ERROR');
    assert.equal(observed.phase,'COMMITTED_RAW_RETENTION');
    assert.equal(observed.frame.module,'scripts/lib/post-h0-dmi-original-dependencies.mjs');
    assert.equal(observed.frame.line,18);
    assert.equal(observed.frame.sha256,'0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc');
    const beforeExit=process.exitCode,beforeError=console.error,lines=[];
    try{
      console.error=value=>lines.push(value);
      await currentHistoryPlanner.reportRavScoreCurrentHistoryFailure(original);
      assert.equal(process.exitCode,1);assert.equal(lines.length,1);
      assert.equal(JSON.parse(lines[0]).code,expected);
      assert.doesNotMatch(lines[0],/"(?:message|actual|expected|stack)"|PRIVATE_SENTINEL/);
    }finally{console.error=beforeError;process.exitCode=beforeExit;}
    assert.equal(original.message,message);assert.equal(original.originalDependencyCode,expected);
    assert.equal(original.code,undefined);
  }
});
test('planner original dependency: forged family, own getter, proxy and unknown code remain rejected',async()=>{
  const make=()=>{try{collectOriginalDependencies();}catch(error){return error;}};
  let calls=0;
  const getter=make();Object.defineProperty(getter,'originalDependencyCode',
    {get(){calls++;throw Error('PRIVATE_SENTINEL');},configurable:true});
  const proxy=new Proxy(make(),{get(){calls++;throw Error('PRIVATE_SENTINEL');},
    getOwnPropertyDescriptor(){calls++;throw Error('PRIVATE_SENTINEL');}});
  const nonString=make();nonString.originalDependencyCode={toString(){calls++;throw Error('PRIVATE_SENTINEL');}};
  const unknown=make();unknown.originalDependencyCode='POST_H0_DMI_ORIGINAL_PRIVATE_SENTINEL';
  const wrongFamily=make();wrongFamily.originalDependencyCode='OTHER_ORIGINAL_INPUT_INVALID';
  const wrongParent=make();wrongParent.originalDependencyCode='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_SOURCE_MISSING';
  const unlistedProof=make();unlistedProof.originalDependencyCode='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_PRIVATE_SENTINEL';
  const wrongFrame=new Error('PRIVATE_SENTINEL');wrongFrame.originalDependencyCode='POST_H0_DMI_ORIGINAL_INPUT_INVALID';
  const forged={originalDependencyCode:'POST_H0_DMI_ORIGINAL_INPUT_INVALID'};
  const inherited=make();Object.setPrototypeOf(inherited,Object.create(Error.prototype));
  for(const error of [getter,proxy,nonString,unknown,wrongFamily,wrongParent,unlistedProof,wrongFrame,forged,inherited]){
    const observed=await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(error,'COMMITTED_RAW_RETENTION');
    assert.equal(observed.code,'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');
    assert.doesNotMatch(JSON.stringify(observed),/PRIVATE_SENTINEL|OTHER_ORIGINAL/);
  }
  assert.equal(calls,0);
  const priority=make();priority.code='ENOENT';
  assert.equal((await currentHistoryPlanner.describeRavScoreCurrentHistoryFailure(priority)).code,'ENOENT',
    'The new diagnostic must never replace an existing accepted code');
});
import { buildIntegratedPartScoreSeries } from './lib/ravscore-integrated-runtime.mjs';
import { buildCandidateGRollbackPartScoreSeries } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import { buildRavScorePermittedCurrentHistory } from './lib/ravscore-recovery-replay.mjs';
import { buildCoastalPointActivationStatePair, candidateGStateKey,
  selectCoastalPointCandidateGRollbackContinuation } from './lib/coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION } from './lib/ravscore-recovery-replay.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent, eligibleBulkCurrent,
  eligibleDmiForecastComponentSource, eligibleDmiNativeComponentSource,
  verifiedIntegratedPartHourly } from './lib/ravscore-production-adapters.mjs';
import * as productionAdapters from './lib/ravscore-production-adapters.mjs';
import { PROTECTED_DMI_NATIVE_PROOF_LIMITS, buildProtectedDmiNativeCurrentProofs,
  createProtectedDmiNativeCurrentInspector, validateProtectedDmiNativeCurrentProofs,
  verifyProtectedDmiNativeCurrentProof } from './lib/protected-dmi-native-current-proofs.mjs';

// TEST-only stack view for the exact reviewed additive origin pipeline.
// Real production calls/errors remain unchanged; only known source positions
// are projected before the complete unchanged historical stack assertions.
let reviewedOriginPipelineSource = (await import('node:fs')).readFileSync(new URL('./lib/ravscore-production-part-pipeline.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// Exact whole D8 -> 584 collector inverse; no unknown source or callsite is
// accepted as the historical normal OWNER guard.
assert.equal(createHash('sha256').update(reviewedOriginPipelineSource).digest('hex'),
  '8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758');
for (const [before, after] of [
  ['  originHandle, part, targetReferenceAt,',
    '  originHandle, part, targetReferenceAt, requireMeasuredColdStart = false,'],
  ['  if (!record || !originHandle || record.originHandle !== originHandle',
    '  if (typeof requireMeasuredColdStart !== \'boolean\'\n'
      + '    || (requireMeasuredColdStart && record?.measuredColdStart !== true)\n'
      + '    || !record || !originHandle || record.originHandle !== originHandle'],
  ['      originHandle: establishedNativeCurrentOrigin,\n      context:',
    '      originHandle: establishedNativeCurrentOrigin,\n'
      + '      measuredColdStart: measuredColdStartAttested && initialSelection.state === null\n'
      + '        && candidateContinuationCount === 0 && initialSelection.source === \'COLD_START\',\n'
      + '      context:'],
]) {
  assert.equal(reviewedOriginPipelineSource.split(after).length, 2,
    'Exact reviewed measured-COLD collector hunk required');
  reviewedOriginPipelineSource = reviewedOriginPipelineSource.replace(after, () => before);
}
assert.equal(createHash('sha256').update(reviewedOriginPipelineSource).digest('hex'),
  'dadb5bf8c37fd12415b4596523df218f67cca4d4775b1cf8d0f2066c524cabd0');
function reviewedOriginPipelineStack(stack) {
  assert.equal(typeof stack, 'string');
  {
    // The first measured-COLD collector hunk adds exactly two lines before
    // this real call. Project only that pinned callsite, then keep both old
    // stack assertions below unchanged.
    const pattern = /(at buildRavScoreProductionPartSeries \([^\n]*ravscore-production-part-pipeline\.mjs:)623(:\d+\))/g;
    assert.equal([...stack.matchAll(pattern)].length, 1, 'Exact reviewed584 buildRavScoreProductionPartSeries callsite required');
    stack = stack.replace(pattern, (_whole, prefix, suffix) => prefix + '621' + suffix);
  }
  {
    const pattern = /(at transitionOwnerCurrentHistory \([^\n]*ravscore-production-part-pipeline\.mjs:)52(:\d+\))/g;
    assert.equal([...stack.matchAll(pattern)].length, 1, 'Exact reviewed transitionOwnerCurrentHistory callsite required');
    stack = stack.replace(pattern, (_whole, prefix, suffix) => prefix + '49' + suffix);
  }
  {
    const pattern = /(at buildRavScoreProductionPartSeries \([^\n]*ravscore-production-part-pipeline\.mjs:)621(:\d+\))/g;
    assert.equal([...stack.matchAll(pattern)].length, 1, 'Exact reviewed buildRavScoreProductionPartSeries callsite required');
    stack = stack.replace(pattern, (_whole, prefix, suffix) => prefix + '529' + suffix);
  }
  return stack;
}

const HOUR = 3_600_000;
test('owner current source policy is inventoried without changing the private storage ABI', async () => {
  const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  for (const source of ['scripts/lib/dmi-marine-zone-exclusions.mjs',
    'scripts/lib/dmi-marine-zone-exclusions.json']) {
    assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes(source),
      'the actual owner policy must be part of producer review');
  }
  assert.deepEqual(PRIVATE_RUNTIME_CONTRACT_FILES.fullRuntimeContractSha256,
    ['scripts/lib/private-weather-storage-abi.json'],
    'producer policy must not disguise itself as a changed persisted storage format');
});
const epoch = Date.parse('2026-09-01T00:00:00.000Z');
const at = offset => new Date(epoch + offset * HOUR).toISOString();
const copy = value => JSON.parse(JSON.stringify(value));
const vectorSelection = 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer';
function fixture({ partId = 'SYNTHETIC-PART', nativeHours = [0, 3], target = 1, run = -12,
  pythonTime = false, zoneId = 'SYNTHETIC-ZONE', collection = 'dkss_idw' } = {}) {
  const part = { partId, zoneId, waterPoint: [8, 55] };
  const expected = dmiExpectedIdentityForPart(part);
  const hourly = {};
  const nativeAt = hour => pythonTime === 'offset' ? at(hour).replace('.000Z', '+00:00')
    : pythonTime ? at(hour).replace('.000Z', 'Z') : at(hour);
  for (const hour of nativeHours) {
    const time = nativeAt(hour);
    const source = { provider: 'dmi', fallback: false, collection, collectionFamily: 'marine',
      component: 'current', componentKind: 'ocean-current-vector', fieldSet: ['current-u', 'current-v'],
      optionalFieldSet: [], modelRun: nativeAt(run), nativeValidTime: time, leadTimeHours: hour - run,
      ...expected, gridPoint: [8, 55], gridDefinitionSha256: 'b'.repeat(64), distanceKm: 0,
      spatialSelection: 'nearest-shared-grid-cell-no-spatial-interpolation', spatialSemanticsVersion: 1,
      vectorSelection, vectorSemanticsVersion: 3, verticalLayer: 'depth:1', verticalLayerRankM: 1,
      itemId: `synthetic-${partId}-${hour}`, assetIdentitySha256: 'a'.repeat(64),
      contentSha256: 'c'.repeat(64), acquiredAt: nativeAt(-1), itemUpdatedAt: nativeAt(run + 1) };
    hourly[time] = { time, 'current-u': 0.123456 + hour / 1000,
      'current-v': 0.234567 + hour / 1000, sources: { current: source } };
  }
  const bulk = { generatedAt: nativeAt(0), currentVectorSemanticsVersion: 3,
    currentVectorSelection: vectorSelection, currentMaxDistanceKm: 5, timeStrideHours: 3,
    zones: { [expected.entityId]: { ...expected, hourly } } };
  const ocean = Object.values(hourly).map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources }));
  const row = buildDmiForecastHourly({ ocean, generatedAt: at(0), startAt: at(target), hours: 1 }).hourly[0];
  return { part, row, bulk };
}
const bankFor = fixture => buildProtectedDmiNativeCurrentProofs({ selections: [fixture], contexts: [fixture.bulk] });
const inspect = (fixture, contexts = [fixture.bulk]) => createProtectedDmiNativeCurrentInspector({ contexts }).inspect(fixture);

test('normal original-wire identity uses exact Python round seven with measured IEEE parity', async () => {
  const round = productionAdapters.pythonRoundDmiSamplingCoordinate;
  const matches = productionAdapters.dmiOriginalWireIdentityMatchesCentralIdentity;
  assert.equal(typeof round, 'function'); assert.equal(typeof matches, 'function');
  const bits = value => { const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value); return view.getBigUint64(0); };
  const number = value => { const view = new DataView(new ArrayBuffer(8)); view.setBigUint64(0, value); return view.getFloat64(0); };
  const next = (value, up) => value === 0 ? (up ? Number.MIN_VALUE : -Number.MIN_VALUE)
    : number(bits(value) + ((value > 0) === up ? 1n : -1n));
  const seeds = [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, 1 / 256, 3 / 256,
    -1 / 256, -3 / 256, 1.23456785, -1.23456785, 8.00000004, -8.00000004,
    55.00000004, -55.00000004, 89.99999995, -89.99999995, 180, -180];
  const values = [...new Set(seeds.flatMap(value => [value, next(value, false), next(value, true)]))]
    .filter(value => Math.abs(value) <= 180);
  values.push(-0); // Set deliberately coalesces signed zeros; parity must not.
  const encoded = values.map(value => bits(value).toString(16).padStart(16, '0'));
  const { spawnSync } = await import('node:child_process');
  const python = spawnSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), ['-c',
    'import json,struct,sys; print(json.dumps([struct.pack(">d",round(struct.unpack(">d",bytes.fromhex(h))[0],7)).hex() for h in json.load(sys.stdin)]))'],
  { input: JSON.stringify(encoded), encoding: 'utf8', timeout: 20_000 });
  assert.equal(python.status, 0, 'Actual Python round parity is required, not a skipped native dependency');
  const expected = JSON.parse(python.stdout);
  assert.deepEqual(values.map(value => bits(round(value)).toString(16).padStart(16, '0')), expected);
  assert.equal(round(1 / 256), 0.0039062, 'exact halfway, even lower integer');
  assert.equal(round(3 / 256), 0.0117188, 'exact halfway, even upper integer');
  assert.ok(Object.is(round(-Number.MIN_VALUE), -0));
  const central = dmiExpectedIdentityForPart({ partId: 'WIRE', zoneId: 'PARENT', waterPoint: [8.00000004, 55.00000004] });
  const original = { ...central, samplingPoint: [8, 55] }, bytes = JSON.stringify({ original, central });
  assert.equal(matches(original, central), true); assert.equal(matches(central, central), true);
  for (const mutate of [value => { value.entityId += '-other'; }, value => { value.parentZoneId += '-other'; },
    value => { value.entityType = 'parent-zone'; }, value => { value.samplingContext += '-other'; },
    value => { value.samplingPoint[0] += 1e-8; }, value => { value.samplingPoint[0] = '8'; },
    value => { value.samplingPoint = [central.samplingPoint[0], 55]; },
    value => { value.samplingPoint.push(0); }, value => { value.samplingPoint[1] = 91; },
    value => { value.samplingPoint[0] = Infinity; }, value => { value.extra = true; }]) {
    const wrong = copy(original); mutate(wrong); assert.equal(matches(wrong, central), false);
  }
  assert.equal(matches({ ...original, samplingPoint: [181, 55] }, { ...central, samplingPoint: [181, 55] }), false);
  const tie = { ...central, samplingPoint: [1 / 256, -3 / 256] };
  assert.equal(matches({ ...original, samplingPoint: [0.0039062, -0.0117188] }, tie), true);
  assert.equal(matches({ ...original, samplingPoint: [0.0039063, -0.0117188] }, tie), false);
  assert.equal(JSON.stringify({ original, central }), bytes);
  console.log(`Measured exact JS/Python sampling-coordinate parity: ${values.length} IEEE cases`);
  const jsonSeeds = [0, -0, 1e20, 1e21, 1e-6, 1e-7, Number.MAX_VALUE, Number.MIN_VALUE,
    1000000000000000100, 1 / 256, 3 / 256, 1.0000000000000001e23];
  const jsonValues = jsonSeeds.flatMap(value => [value, -value, next(value, false), next(value, true)])
    .filter(Number.isFinite);
  // Fixed deterministic binary64 patterns include subnormals, large integers,
  // fractional vectors and rounding-boundary neighbors, not just display text.
  let state = 0x123456789abcdef0n;
  for (let i = 0; i < 256; i++) {
    state ^= state << 13n; state ^= state >> 7n; state ^= state << 17n; state = BigInt.asUintN(64, state);
    const value = number(state); if (Number.isFinite(value)) jsonValues.push(value);
  }
  const jsonParity = spawnSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), ['-c',
    'import json,struct,sys; sys.path.insert(0,"scripts"); from lib.dmi_legacy_current_recovery import _js_canonical; print(json.dumps([_js_canonical(struct.unpack(">d",bytes.fromhex(h))[0]) for h in json.load(sys.stdin)]))'],
  { input: JSON.stringify(jsonValues.map(value => bits(value).toString(16).padStart(16, '0'))), encoding: 'utf8', timeout: 20_000 });
  assert.equal(jsonParity.status, 0, jsonParity.stderr);
  assert.deepEqual(JSON.parse(jsonParity.stdout), jsonValues.map(value => JSON.stringify(value)));
  const unicode = { '\u{10000}': '\ud800', '\uffff': '\ud83d\ude00', nested: [0, -0, 1e-7, 1e20] };
  const canonicalUnicode = '{' + Object.keys(unicode).sort().map(key => JSON.stringify(key) + ':' + JSON.stringify(unicode[key])).join(',') + '}';
  const unicodeParity = spawnSync(process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3'), ['-c',
    'import json,sys; sys.path.insert(0,"scripts"); from lib.dmi_legacy_current_recovery import _js_canonical; print(json.dumps(_js_canonical(json.loads(sys.stdin.buffer.read().decode("utf-8")))))'],
  { input: JSON.stringify(unicode), encoding: 'utf8', timeout: 20_000 });
  assert.equal(unicodeParity.status, 0, unicodeParity.stderr);
  assert.equal(JSON.parse(unicodeParity.stdout), canonicalUnicode);
  console.log(`Measured exact Python/Node v2 canonical-number parity: ${jsonValues.length} IEEE cases plus UTF-16 sorting/strings`);
});

test('normal original-wire context keeps both actual endpoints and full admin precision through inspector bank and planner', () => {
  for (const collection of ['dkss_lf', 'dkss_nsbs']) {
    const f = fixture({ collection });
    f.part.onshoreDirectionDeg = 90;
    f.part.waterPoint = [8.00000004, 55.00000004];
    const identity = dmiExpectedIdentityForPart(f.part), own = f.bulk.zones[identity.entityId];
    const before = JSON.stringify(f);
    assert.equal(Object.keys(own.hourly).length, 2);
    for (const native of Object.values(own.hourly)) assert.ok(verifiedBulkCurrent(f.bulk, own,
      f.part.waterPoint, native.sources.current, native.time, identity));
    const actual = createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] }).inspectOriginals(f);
    assert.equal(actual.ok, true, actual.code);
    assert.equal(actual.nativeRows.length, 2);
    assert.deepEqual(actual.nativeRows[0].source.samplingPoint, [8, 55]);
    assert.deepEqual(f.part.waterPoint, [8.00000004, 55.00000004]);
    const bank = bankFor(f); assert.equal(verifyProtectedDmiNativeCurrentProof(bank, f).ok, true);
    const registry = { schemaVersion: 2, enabled: true, partCount: 1, zoneCount: 1,
      zones: { [f.part.zoneId]: [{ ...f.part }] } };
    const historyDemand = buildRavScoreCurrentHistoryDemand({ registry, conditions: { zones: {} },
      checkpoint: { loaded: false }, productionReferenceAt: at(1), registrySha256: `sha256:${'a'.repeat(64)}`,
      sourceHashes: { conditions: null, checkpoint: null, activation: null } });
    const plan = currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests({ registry, historyDemand,
      historyDemandSha256: `sha256:${'b'.repeat(64)}`, zones: { features: [] }, protectedBulk: f.bulk,
      persistedHourlyByPart: new Map([[f.part.partId, { hourly: [f.row] }]]),
      sourceHashes: { zones: `sha256:${'c'.repeat(64)}`, deployedBulk: `sha256:${'d'.repeat(64)}`,
        forecast: `sha256:${'e'.repeat(64)}`, candidate: null, active: null } });
    assert.equal(plan.reconstructionRequests.length, 0, 'TWO genuine native originals need no RAW reconstruction');
    assert.equal(JSON.stringify(f), before, 'No original/admin point or numeric data may be rewritten');
    const changed = copy(f); changed.bulk.zones[identity.entityId].samplingPoint[0] += 1e-8;
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [changed.bulk] }).inspectOriginals(changed).ok, false);
  }
});

test('owner-excluded LF stays authentic but cannot enter new or retained score input', () => {
  for (const [zoneId, collection, allowed] of [
    ['DK-B01-01', 'dkss_lf', false], ['DK-B01-02', 'dkss_lf', false],
    ['DK-B02-08', 'dkss_lf', false], ['DK-B02-09', 'dkss_lf', false],
    ['DK-B02-11', 'dkss_lf', false], ['DK-B03-01', 'dkss_lf', false],
    ['DK-B03-02', 'dkss_lf', false],
    ['DK-B01-02', 'dkss_nsbs', true], ['DK-B05-17', 'dkss_lf', true],
    ['DK-B02-10', 'dkss_lf', true], ['DK-B05-25', 'dkss_lf', true],
    ['DK-B01-03', 'dkss_lf', true],
  ]) {
    const f = fixture({ zoneId, collection });
    f.part.onshoreDirectionDeg = 90;
    const before = JSON.stringify(f);
    const identity = dmiExpectedIdentityForPart(f.part);
    const native = Object.values(f.bulk.zones[identity.entityId].hourly)[0];
    // Immutable original authentication is deliberately NOT changed by policy.
    assert.equal(verifyProtectedDmiNativeCurrentProof(bankFor(f), f).ok, true);
    assert.equal(Boolean(eligibleDmiNativeComponentSource(native.sources.current,
      native.time, 'current', identity)), allowed);
    assert.equal(Boolean(eligibleDmiForecastComponentSource(f.row.sources.current,
      f.row.time, 'current', identity)), allowed);
    assert.equal(Boolean(eligibleBulkCurrent(f.bulk, f.bulk.zones[identity.entityId],
      f.part.waterPoint, f.row.sources.current, f.row.time, identity)), allowed);
    const sanitized = verifiedIntegratedPartHourly({ hourly: [f.row] },
      f.bulk, identity.entityId, f.part)[0];
    assert.equal(Number.isFinite(sanitized.currentUMps), allowed, `${zoneId}/${collection}`);
    assert.equal(JSON.stringify(f), before, 'original input must remain byte-neutral');
  }
});

test('owner water-only exception admits authentic PART scalars but never LF current or temperature', () => {
  for (const zoneId of ['DK-B01-01','DK-B01-02','DK-B02-08','DK-B02-09','DK-B02-11','DK-B03-01','DK-B03-02']) {
    const f = fixture({ zoneId, collection: 'dkss_lf', target: 0 });
    const identity = dmiExpectedIdentityForPart(f.part);
    const native = Object.values(f.bulk.zones[identity.entityId].hourly)[0];
    for (const [component, field, value, kind] of [
      ['waterLevel','sea-mean-deviation',0.25,'marine-water-level-scalar'],
      ['waterTemperature','water-temperature',12,'marine-water-temperature-scalar'],
    ]) {
      const source = { ...copy(native.sources.current), component, componentKind: kind,
        fieldSet: [field], optionalFieldSet: [],
        spatialSelection:'nearest-valid-grid-cell-no-spatial-interpolation' };
      for (const key of ['vectorSelection','vectorSemanticsVersion','verticalLayer','verticalLayerRankM']) delete source[key];
      native[field] = value;
      native.sources[component] = source;
      assert.equal(Boolean(eligibleDmiNativeComponentSource(source,native.time,component,identity)),component==='waterLevel');
    }
    const original = JSON.stringify(f.bulk);
    const row = buildDmiForecastHourly({ ocean: [{step:native.time,
      'current-u':native['current-u'],'current-v':native['current-v'],
      'sea-mean-deviation':native['sea-mean-deviation'],'water-temperature':native['water-temperature'],
      provenance:native.sources}], generatedAt:at(0),startAt:at(0),hours:1 }).hourly[0];
    assert.ok(eligibleDmiForecastComponentSource(row.sources.waterLevel,row.time,'waterLevel',identity));
    const admitted = verifiedIntegratedPartHourly({hourly:[row]},f.bulk,identity.entityId,f.part)[0];
    assert.equal(admitted.waterLevelCm,25);
    assert.equal(admitted.currentUMps,null);
    assert.equal(admitted.waterTemperatureC,null);
    const forged = copy(native.sources.waterLevel);
    forged.entityId = 'SOURCE::NOT-THE-PART';
    assert.equal(eligibleDmiNativeComponentSource(forged,native.time,'waterLevel',identity),null);
    assert.equal(JSON.stringify(f.bulk),original,'No mutation of authenticated originals.');
  }
});

test('water-only technical original requires full canonical542 state and preserves541 control archive', async () => {
  const f=fixture({zoneId:'DK-B01-02',collection:'dkss_nsbs',nativeHours:[0],target:0});
  f.part.onshoreDirectionDeg=90;
  const hourly=[{...f.row,currentProvenance:{...f.row.sources.current,status:'verified'},
    currentCoastNormalSpeedMps:f.row.currentUMps}];
  const state=buildIntegratedPartScoreSeries({part:f.part,
    zone:{id:f.part.zoneId,onshoreDirectionDeg:90},hourly}).ravScoreState.continuationState;
  const {assertWaterLevelOnlyIntegratedOriginal,assertArchivedOwnerCurrentIntegratedOriginal}=
    await import('./lib/coastal-point-staging-contract.mjs');
  const previous={...copy(state),modelBundleSha256:'4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51'};
  const options={samplingContextKey:state.samplingContextKey};
  const before=JSON.stringify(previous);
  assert.equal(assertWaterLevelOnlyIntegratedOriginal(previous,options),previous);
  assert.equal(JSON.stringify(previous),before);
  for(const mutate of [value=>{value.modelBundleSha256='a'.repeat(64);},
    value=>{value.currentEvidence[0].strength=99;},value=>{value.extra='raw';},
    value=>{value.time='bad';},value=>{value.schemaVersion='5.0.0';}]) {
    const wrong=copy(previous);mutate(wrong);
    assert.throws(()=>assertWaterLevelOnlyIntegratedOriginal(wrong,options));
  }
  assert.throws(()=>assertWaterLevelOnlyIntegratedOriginal(previous,{samplingContextKey:'WRONG'}));
  const archiveOriginal={...copy(state),modelBundleSha256:'29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948'};
  assert.equal(assertArchivedOwnerCurrentIntegratedOriginal(archiveOriginal,options),archiveOriginal);
  assert.throws(()=>assertWaterLevelOnlyIntegratedOriginal(archiveOriginal,options));
  assert.throws(()=>assertArchivedOwnerCurrentIntegratedOriginal(previous,options),
    'The542 technical original must not masquerade as the old541 control archive.');
});

test('normal two-model caller enforces the owner source domain on selected public input', async t => {
  for (const [zoneId, collection, allowed] of [
    ['DK-B01-01', 'dkss_lf', false], ['DK-B01-02', 'dkss_lf', false],
    ['DK-B02-08', 'dkss_lf', false], ['DK-B02-09', 'dkss_lf', false],
    ['DK-B02-11', 'dkss_lf', false], ['DK-B03-01', 'dkss_lf', false],
    ['DK-B03-02', 'dkss_lf', false],
    ['DK-B01-01', 'dkss_nsbs', true], ['DK-B01-02', 'dkss_nsbs', true],
    ['DK-B05-17', 'dkss_lf', true], ['DK-B01-03', 'dkss_lf', true],
  ]) await t.test(`${zoneId}/${collection}`, () => {
    const f = fixture({ zoneId, collection, nativeHours: [0], target: 0 });
    f.part.onshoreDirectionDeg = 90;
    f.row.currentProvenance = { ...f.row.sources.current, status: 'verified' };
    const before = JSON.stringify(f);
    assert.equal(verifyProtectedDmiNativeCurrentProof(bankFor(f), f).ok, true);
    const build = () => buildRavScoreProductionPartSeries({
      part: f.part,
      zone: { id: zoneId, onshoreDirectionDeg: 90 },
      initialSelection: { state: null, source: 'COLD_START',
        candidateGSourceDisposition: RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION },
      candidateGRollbackMeasuredColdStart: true,
      targetReferenceAt: at(0), recoverySources: [], publicHourly: [f.row],
    });
    if (!allowed) assert.throws(build,
      error => error?.code === 'RAVSCORE_CURRENT_SOURCE_DOMAIN_EXCLUDED');
    else {
      const result = build();
      assert.deepEqual(result.scores.map(row => row.time), [at(0)]);
      assert.deepEqual(result.candidateGRollbackScores.map(row => row.time), [at(0)]);
    }
    assert.equal(JSON.stringify(f), before, 'original native input and proof are not rewritten');
  });
});

test('normal two-model continuation rebuilds only permitted current and preserves its original pair', async t => {
  for (const zoneId of ['DK-B01-01', 'DK-B01-02']) for (const [label, nativeHours, ready] of [
    ['partial', [48, 49], false],
    ['complete', Array.from({ length: 50 }, (_, i) => i), true],
    ['no-old-source-proof', [49], false],
  ]) await t.test(`${zoneId}/${label}`, () => {
    const old = fixture({ zoneId, collection: 'dkss_lf', target: 48,
      nativeHours: Array.from({ length: 49 }, (_, i) => i), run: -60 });
    old.part.onshoreDirectionDeg = 90;
    const zone = { id: zoneId, onshoreDirectionDeg: 90 };
    const oldHourly = Array.from({ length: 49 }, (_, hour) => {
      const f = fixture({ zoneId, collection: 'dkss_lf', target: hour,
        nativeHours: [hour], run: -60 });
      return { ...f.row, currentProvenance: { ...f.row.sources.current, status: 'verified' },
        currentCoastNormalSpeedMps: f.row.currentUMps,
        windSpeedMps: 8, windDirectionDeg: 270, waveHeightM: 1.2,
        wavePeriodS: 6, waveDirectionDeg: 90, waveProvenance: { status: 'verified' },
        waterLevelCm: 0, waterLevelTrendCm3h: 0 };
    });
    // Existing physical builders construct a genuine old synthetic state;
    // neither its source nor its sampling/model binding is relabelled.
    const integrated = buildIntegratedPartScoreSeries({ part: old.part, zone,
      hourly: oldHourly }).ravScoreState.continuationState;
    const candidate = buildCandidateGRollbackPartScoreSeries({ part: old.part, zone,
      hourly: oldHourly, measuredColdStart: true }).candidateGState.continuationState;
    assert.equal(integrated.currentMemoryReady, true);
    assert.equal(candidate.transportMemoryReady, true);
    const snapshot = JSON.stringify({ integrated, candidate });
    const permitted = fixture({ zoneId, collection: 'dkss_nsbs', nativeHours,
      target: nativeHours[0], run: -60 });
    permitted.part.onshoreDirectionDeg = 90;
    const identity = dmiExpectedIdentityForPart(permitted.part);
    const allowedHourly = verifiedIntegratedPartHourly({ point: permitted.part.waterPoint,
      hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(nativeHours[0]),
        hours: 50 - nativeHours[0],
        ocean: Object.values(permitted.bulk.zones[identity.entityId].hourly)
          .map(row => ({ step: row.time, 'current-u': row['current-u'],
            'current-v': row['current-v'], provenance: row.sources })) }).hourly },
      permitted.bulk, identity.entityId, permitted.part);
    const result = buildRavScoreProductionPartSeries({ part: old.part, zone,
      initialSelection: { state: integrated, source: 'INTEGRATED_CONTINUATION' },
      previousCandidateGContinuation: candidate, targetReferenceAt: at(49),
      recoverySources: [{ source: 'progressive-private-dmi', record: {
        point: permitted.part.waterPoint, hourly: allowedHourly } }],
      publicHourly: [{ ...allowedHourly.at(-1), windSpeedMps: 8, windDirectionDeg: 270,
        waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 90,
        waveProvenance: { status: 'verified' }, waterLevelCm: 0, waterLevelTrendCm3h: 0 }],
    });
    assert.ok(result.currentSourceDomainTransition, 'actual producer must transition both old states');
    assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
    assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
    assert.equal(result.ravScoreState.continuationState.currentMemoryReady, ready);
    assert.equal(result.candidateGState.continuationState.transportMemoryReady, ready);
    for (const mode of ['waders', 'beach']) {
      const oracle = result.candidateGRollbackScores[0].candidateG;
      assert.equal(oracle.modes[mode].available, true,
        'availability control needs otherwise-usable weather, not a missing-wave shortcut');
      assert.equal(oracle.publicModes[mode].available, ready,
        'the old finite private estimate must not escape as a safe rollback score');
      if (!ready) assert.notEqual(result.scores[0].ravScoreModel.modes[mode].scoreQuality,
        'FULL_HISTORY', 'unproved current cannot become full public score history');
    }
    if (!ready) assert.equal(result.ravScoreState.continuationState.supplyPotential, null,
      'unknown input is not a safe zero supply');
    const evidence = result.ravScoreState.continuationState.currentEvidence;
    if (!ready) assert.ok(evidence.filter(row => Date.parse(row.time) < Date.parse(at(48)))
      .every(row => row.strength === null), 'unknown old contributions must not survive as proved current');
    else assert.ok(evidence.every(row => Number.isFinite(row.strength)),
      'full proved NSBS history must not be discarded');
    assert.equal(JSON.stringify({ integrated, candidate }), snapshot, 'original pair stays immutable');
    assert.equal(ravScoreOwnerCurrentHistoryStartAt(old.part, integrated, at(49)), at(0));
    assert.equal(ravScoreOwnerCurrentHistoryStartAt({ ...old.part, zoneId: 'DK-B05-17' },
      integrated, at(49)), at(49), 'Fur history boundary is unchanged');
    const retained = retainOwnerCurrentTransitionOriginal({ ...result.currentSourceDomainTransition,
      referenceAt: result.ravScoreState.continuationState.time,
      originalIntegratedState: result.ravScoreState.continuationState,
      originalCandidateGState: result.candidateGState.continuationState },
    result.currentSourceDomainTransition, old.part);
    assert.deepEqual(retained.originalIntegratedState, integrated);
    assert.deepEqual(retained.originalCandidateGState, candidate);
    assert.throws(() => retainOwnerCurrentTransitionOriginal(result.currentSourceDomainTransition,
      { ...result.currentSourceDomainTransition, partId: 'WRONG' }, old.part), /incompatible target/);
    const sources = [{ record: { point: permitted.part.waterPoint, hourly: allowedHourly } }];
    const oldRows = { record: { point: old.part.waterPoint,
      hourly: oldHourly.map(row => ({ ...row })) } };
    const proved = buildRavScorePermittedCurrentHistory({ part: old.part,
      referenceAt: at(48), sourceRecords: sources });
    assert.deepEqual(buildRavScorePermittedCurrentHistory({ part: old.part,
      referenceAt: at(48), sourceRecords: [...sources, oldRows] }), proved,
    'authentic LF stays excluded without poisoning permitted input');
    if (ready) {
      const changed = copy(sources[0]);
      changed.record.hourly[0].currentUMps += 0.03;
      assert.throws(() => buildRavScorePermittedCurrentHistory({ part: old.part,
        referenceAt: at(48), sourceRecords: [changed] }),
      error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CURRENT_UNVERIFIED');
      const duplicate = copy(sources[0]);
      duplicate.record.hourly.push(copy(duplicate.record.hourly[0]));
      assert.throws(() => buildRavScorePermittedCurrentHistory({ part: old.part,
        referenceAt: at(48), sourceRecords: [duplicate] }),
      error => error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT');
    }
  });
});

test('owner transition follows actual normal integrated, checkpoint and exact activation selectors', async t => {
  for (const zoneId of ['DK-B01-01', 'DK-B01-02', 'DK-B02-08', 'DK-B02-09',
    'DK-B02-11', 'DK-B03-01', 'DK-B03-02']) {
    const f = fixture({ zoneId, collection: 'dkss_nsbs', nativeHours: [48, 49], target: 48, run: -12 });
    f.part.onshoreDirectionDeg = 90;
    const zone = { id: zoneId, onshoreDirectionDeg: 90 };
    const oldHourly = Array.from({ length: 49 }, (_, hour) => {
      const old = fixture({ zoneId, collection: 'dkss_lf', nativeHours: [hour], target: hour });
      const wave = { ...old.row.sources.current, collection: 'wam_dw', collectionFamily: 'wave',
        component: 'wave', componentKind: 'wave-mobilisation-tuple',
        fieldSet: ['significant-wave-height', 'dominant-wave-period'], optionalFieldSet: ['mean-wave-dir'],
        spatialSelection: 'nearest-shared-wave-height-period-grid-cell-no-spatial-interpolation',
        wavePeriodSemantics: 'peak',
        wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null },
        nativeSteps: old.row.sources.current.nativeSteps.map(step => ({ ...step,
          optionalFieldSet: ['mean-wave-dir'], wavePeriodSemantics: 'peak',
          wavePeriodField: { shortName: 'pp1d', paramId: 231, indicatorOfParameter: null } })) };
      assert.ok(eligibleDmiForecastComponentSource(wave, old.row.time, 'wave',
        dmiExpectedIdentityForPart(f.part)), 'activation control requires the original admitted wave');
      return { ...old.row, currentProvenance: { ...old.row.sources.current, status: 'verified' },
        sources: { ...old.row.sources, wave },
        currentCoastNormalSpeedMps: old.row.currentUMps,
        waveHeightM: 1.2, wavePeriodS: 6, waveDirectionDeg: 90, waveProvenance: { status: 'verified' } };
    });
    const integrated = buildIntegratedPartScoreSeries({ part: f.part, zone, hourly: oldHourly })
      .ravScoreState.continuationState;
    const candidate = buildCandidateGRollbackPartScoreSeries({ part: f.part, zone,
      hourly: oldHourly, measuredColdStart: true }).candidateGState.continuationState;
    const pair = buildCoastalPointActivationStatePair({ partId: f.part.partId,
      samplingContextKey: ravScoreSamplingContextKey(f.part),
      expectedCandidateGStateKey: candidateGStateKey(f.part), integratedState: integrated,
      candidateGState: candidate });
    const identity = dmiExpectedIdentityForPart(f.part);
    const allowedHourly = verifiedIntegratedPartHourly({ point: f.part.waterPoint,
      hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(48), hours: 2,
        ocean: Object.values(f.bulk.zones[identity.entityId].hourly).map(row => ({ step: row.time,
          'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })) }).hourly },
    f.bulk, identity.entityId, f.part);
    const legacySelection = productionPipeline.selectRavScoreProductionInitialState({ part: f.part,
      existingPart: { candidateG: { currentState: candidate } }, targetReferenceAt: at(49) });
    assert.equal(legacySelection.source, 'CANDIDATE_G_MIGRATION');
    assert.throws(() => planRavScoreCurrentHistoryForPart({ part: f.part,
      existingPart: { candidateG: { currentState: candidate } }, targetReferenceAt: at(49) }),
    error => error?.code === 'RAVSCORE_CURRENT_HISTORY_DEMAND_NON_INTEGRATED_ROUTE');
    assert.throws(() => buildRavScoreProductionPartSeries({ part: f.part, zone,
      initialSelection: legacySelection, legacyCandidateGMigrationState: candidate,
      targetReferenceAt: at(49), recoverySources: [], publicHourly: [allowedHourly.at(-1)] }),
    error => error?.code === 'RAVSCORE_CURRENT_SOURCE_DOMAIN_LEGACY_UNSUPPORTED',
    'a legacy-only state must not be disguised as the unchanged two-model continuation contract');
    for (const source of ['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT', 'POINT_ACTIVATION']) {
      await t.test(`${zoneId}/${source}`, () => {
        const activation = source === 'POINT_ACTIVATION';
        const target = activation ? at(48) : at(49);
        const pairs = activation ? { [f.part.partId]: pair } : {};
        const initialSelection = productionPipeline.selectRavScoreProductionInitialState({ part: f.part,
          existingPart: source === 'EXISTING_INTEGRATED' ? { ravScoreModel: { currentState: integrated } } : null,
          checkpointStates: source === 'INTEGRATED_CHECKPOINT' ? { [f.part.partId]: integrated } : {},
          pointStateInjections: activation ? { [f.part.partId]: pair.integratedState } : {},
          targetReferenceAt: target });
        assert.equal(initialSelection.source, source);
        const demandInputs = { part: f.part,
          existingPart: source === 'EXISTING_INTEGRATED' ? { ravScoreModel: { currentState: integrated } } : null,
          checkpointStates: source === 'INTEGRATED_CHECKPOINT' ? { [f.part.partId]: integrated } : {},
          pointStateInjections: activation ? { [f.part.partId]: pair.integratedState } : {},
          targetReferenceAt: target };
        const demandBefore = JSON.stringify({ demandInputs, candidate, pair });
        const demand = planRavScoreCurrentHistoryForPart(demandInputs);
        assert.equal(demand.initialSource, initialSelection.source);
        assert.equal(demand.initialStateAt, integrated.time);
        assert.equal(demand.initialStateSha256,
          `sha256:${createHash('sha256').update(JSON.stringify(integrated)).digest('hex')}`);
        assert.equal(demand.startAt, at(-3), 'real H48 continuation needs H-3..H48 endpoint support');
        assert.equal(demand.endAt, target, 'bridge ends at the locked target, not at the old state');
        assert.equal(demand.samplingContextKey, ravScoreSamplingContextKey(f.part));
        assert.deepEqual(demand.samplingPoint, f.part.waterPoint);
        assert.equal(demand.parentZoneId, identity.parentZoneId);
        assert.equal(demand.zoneId, zoneId);
        assert.equal(Object.hasOwn(demand, 'state'), false);
        assert.equal(Object.hasOwn(demand, 'gridSampling'), false);
        if (!activation) {
          const bridged = planRavScoreCurrentHistoryForPart({ ...demandInputs, targetReferenceAt: at(120) });
          assert.equal(bridged.startAt, at(-3), 'no wall-clock 60h clipping at the 72h valid-state boundary');
          assert.equal(bridged.endAt, at(120));
          assert.equal((Date.parse(bridged.endAt) - Date.parse(bridged.startAt)) / HOUR, 123);
          const expired = planRavScoreCurrentHistoryForPart({ ...demandInputs, targetReferenceAt: at(121) });
          assert.equal(expired.initialSource, 'COLD_START', 'the genuine selector still expires old states');
          assert.equal(expired.initialStateAt, null);
          assert.equal(expired.initialStateSha256, null);
          assert.equal(expired.startAt, at(73), 'normal cold demand is target minus 48h, not a fake state');
        }
        assert.throws(() => planRavScoreCurrentHistoryForPart({ ...demandInputs, targetReferenceAt: at(47) }),
          error => error?.code === 'RAVSCORE_CURRENT_HISTORY_DEMAND_STATE_TIME_INVALID');
        assert.throws(() => planRavScoreCurrentHistoryForPart({ ...demandInputs,
          part: { ...f.part, waterPoint: [8.1, 55] } }));
        assert.equal(JSON.stringify({ demandInputs, candidate, pair }), demandBefore,
          'planning cannot mutate selected original state, companion, activation, points or bindings');
        const companion = selectCoastalPointCandidateGRollbackContinuation({ partId: f.part.partId,
          part: f.part, initialSelection, pointActivationStatePairs: pairs,
          privateCandidateGContinuation: source === 'EXISTING_INTEGRATED' ? candidate : null,
          checkpointCandidateGContinuation: source === 'INTEGRATED_CHECKPOINT' ? candidate : null,
          targetReferenceAt: target });
        const selected = { ...allowedHourly.find(row => row.time === target),
          waveHeightM: oldHourly.at(-1).waveHeightM, wavePeriodS: oldHourly.at(-1).wavePeriodS,
          waveDirectionDeg: oldHourly.at(-1).waveDirectionDeg,
          waveProvenance: oldHourly.at(-1).waveProvenance };
        selected.sources = { ...oldHourly.at(-1).sources, ...selected.sources };
        const result = buildRavScoreProductionPartSeries({ part: f.part, zone, initialSelection,
          previousCandidateGContinuation: companion.state, targetReferenceAt: target,
          recoverySources: [{ record: { point: f.part.waterPoint, hourly: allowedHourly } }],
          publicHourly: [selected] });
        assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
        assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
        assert.equal(result.ravScoreState.continuationState.currentMemoryReady, false);
        assert.equal(result.candidateGState.continuationState.transportMemoryReady, false);
        assert.deepEqual(result.scores.map(row => row.time), [target]);
      });
    }
  }
});

test('current-history demand is an exact private acquisition inventory, never a sampling receipt', () => {
  const part = { partId: 'SYNTHETIC-DEMAND', sourceZoneId: 'DK-B05-17',
    waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const registry = { schemaVersion: 2, enabled: true, partCount: 1, zoneCount: 1,
    zones: { 'DK-B01-01': [part] } };
  const input = { registry, conditions: { zones: {} }, checkpoint: { loaded: false },
    activationPairs: {}, productionReferenceAt: at(79),
    registrySha256: `sha256:${'a'.repeat(64)}`,
    sourceHashes: { conditions: null, checkpoint: null, activation: null } };
  const before = JSON.stringify(input);
  const demand = buildRavScoreCurrentHistoryDemand(input);
  assert.equal(demand.kind, 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND');
  assert.equal(demand.demands.length, 1);
  assert.deepEqual(demand.demands[0], {
    partId: part.partId, zoneId: 'DK-B01-01', parentZoneId: 'DK-B05-17',
    entityId: `PART::${part.partId}`, samplingPoint: part.waterPoint,
    samplingContextKey: ravScoreSamplingContextKey(part), initialSource: 'COLD_START',
    initialStateAt: null, initialStateSha256: null, startAt: at(31), endAt: at(79),
  });
  assert.equal(JSON.stringify(input), before);
  for (const mutation of [
    value => { value.registry.partCount = 2; },
    value => { value.registry.zones['DK-B01-01'].push(copy(part)); value.registry.partCount = 2; },
    value => { value.registrySha256 = 'unbound'; },
    value => { value.sourceHashes.unlisted = null; },
    value => { value.productionReferenceAt = ''; },
    value => { value.productionReferenceAt = at(79).replace('00:00.000Z', '00:30.000Z'); },
    value => { value.stateLessRecovery = 'true'; },
  ]) {
    const wrong = copy(input); mutation(wrong);
    assert.throws(() => buildRavScoreCurrentHistoryDemand(wrong));
  }
});

test('normal legacy-original requests discover selected own endpoints without creating numeric OLD proof', async () => {
  const f = fixture({ nativeHours: Array.from({ length: 20 }, (_, i) => -54 + i * 3), target: 1, run: -60 });
  const missingHour = -51, witnessHour = -50;
  f.part.onshoreDirectionDeg = 90;
  const identity = dmiExpectedIdentityForPart(f.part), own = f.bulk.zones[identity.entityId];
  const signature = `parser:20|params:4|grid:9|eccodes-api:2.48.0|eccodes-binding:2.48.0|zones:${'d'.repeat(16)}`;
  for (const native of Object.values(own.hourly)) Object.assign(native.sources.current,
    { contentLengthBytes: 1234, assetSizeBytes: 1234 });
  const ocean = Object.values(own.hourly).map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources }));
  const persisted = buildDmiForecastHourly({ ocean, generatedAt: at(0), startAt: at(-54), hours: 121 });
  const missing = own.hourly[at(missingHour)]; delete own.hourly[at(missingHour)];
  // An interpolated OWN forecast remains, but no own exact-native-time row can
  // provide the missing capture. Another PART contributes METADATA ONLY.
  persisted.hourly = persisted.hourly.map(row => row.time === at(missingHour)
    ? { ...row, currentUMps: null, currentVMps: null, sources: {} } : row);
  const other = fixture({ partId: 'SYNTHETIC-METADATA', nativeHours: [missingHour], target: missingHour, run: -60 });
  other.part.waterPoint = [8.01, 55];
  const otherId = dmiExpectedIdentityForPart(other.part).entityId;
  const foreign = other.bulk.zones[otherId];
  foreign.samplingPoint = [...other.part.waterPoint];
  Object.assign(foreign.hourly[at(missingHour)].sources.current, copy(missing.sources.current),
    dmiExpectedIdentityForPart(other.part), { gridPoint: [...other.part.waterPoint] });
  foreign.hourly[at(missingHour)]['current-u'] = 91; foreign.hourly[at(missingHour)]['current-v'] = -73;
  f.bulk.zones[otherId] = foreign;
  f.bulk.runs = { dkss_idw: { referenceTime: at(-60), parserVersion: 20,
    parameterMapVersion: 4, gridLookupVersion: 9, processingSignature: signature, processedSteps: {} } };
  for (const native of [...Object.values(own.hourly), missing]) {
    const source = native.sources.current;
    f.bulk.runs.dkss_idw.processedSteps[native.time] = { complete: true, parserVersion: 20,
      processingSignature: signature, recognizedParameters: ['current-u', 'current-v'], zonesTouched: 1,
      sourceAsset: { ...source, validTime: source.nativeValidTime } };
  }
  const registry = { schemaVersion: 2, enabled: true, partCount: 1, zoneCount: 1,
    zones: { [f.part.zoneId]: [{ ...f.part }] } };
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const state = buildIntegratedPartScoreSeries({ part: f.part,
    zone: { id: f.part.zoneId, onshoreDirectionDeg: 90 }, hourly: [{ time: at(0) }] }).ravScoreState.continuationState;
  const conditions = { zones: {}, coastalParts: { modelBinding: ravScoreModelBinding(), parts: {
    [f.part.partId]: { ...f.part, ravScoreModel: { currentState: state } } } } };
  const demand = buildRavScoreCurrentHistoryDemand({ registry, conditions,
    checkpoint: { loaded: false }, productionReferenceAt: at(1), registrySha256: `sha256:${'a'.repeat(64)}`,
    sourceHashes: { conditions: null, checkpoint: null, activation: null } });
  const input = { registry, historyDemand: demand, historyDemandSha256: `sha256:${'b'.repeat(64)}`,
    zones: { features: [{ properties: { id: f.part.zoneId, coastType: 'east' } }] },
    protectedBulk: f.bulk, progressCandidate: null, progressRole: null,
    persistedHourlyByPart: new Map([[f.part.partId, persisted]]),
    sourceHashes: { zones: `sha256:${'c'.repeat(64)}`, deployedBulk: `sha256:${'d'.repeat(64)}`,
      forecast: `sha256:${'e'.repeat(64)}`, candidate: null, active: null } };
  const before = JSON.stringify({ registry, demand, bulk: f.bulk, persisted });
  assert.equal(demand.demands[0].startAt, at(-51), 'actual existing initial state retains older-than-target48h demand');
  const selected = persisted.hourly.find(row => row.time === at(witnessHour));
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] })
    .inspectOriginals({ part: f.part, row: selected }).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  const plan = currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests(input);
  assert.equal(plan.kind, 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS');
  assert.ok(plan.reconstructionRequests.some(value => value.nativeValidTime === at(missingHour)));
  assert.ok(plan.reconstructionRequests.every(value => value.entityId === identity.entityId));
  assert.ok(plan.reconstructionRequests.every(value => value.reconstructionRequest.zone.lon === 8
    && value.reconstructionRequest.zone.lat === 55
    && value.reconstructionRequest.expectedSource.gridPoint.every((coordinate, index) => coordinate === f.part.waterPoint[index])));
  assert.ok(plan.reconstructionRequests.every(value => !Object.hasOwn(value.reconstructionRequest, 'currentUMps')
    && !Object.hasOwn(value.reconstructionRequest.expectedSource, 'nativeGridSampling')));
  assert.deepEqual(plan.projectionWitnesses.find(value => value.row.time === at(witnessHour)).row,
    { time: selected.time, currentUMps: selected.currentUMps, currentVMps: selected.currentVMps,
      sources: { current: selected.sources.current } });
  assert.ok(plan.reconstructionRequests.every(value => value.projectionWitnessRefs.length > 0));
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] })
    .inspectOriginals({ part: f.part, row: selected }).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING',
  'metadata discovery is NOT successful native numeric admission');
  assert.equal(JSON.stringify({ registry, demand, bulk: f.bulk, persisted }), before);
  // Null is an authentic UNKNOWN marker, not a sampling receipt. Build its
  // actual normal forecast shape; preserve the verbatim top AND step nulls.
  const nullOcean = copy(ocean);
  for (const native of nullOcean) native.provenance.current.nativeGridSampling = null;
  const nullPersisted = buildDmiForecastHourly({ ocean: nullOcean, generatedAt: at(0), startAt: at(-54), hours: 121 });
  nullPersisted.hourly = nullPersisted.hourly.map(row => row.time === at(missingHour)
    ? { ...row, currentUMps: null, currentVMps: null, sources: {} } : row);
  const nullSelected = nullPersisted.hourly.find(row => row.time === at(witnessHour));
  const nullComplete = copy(f.bulk);
  nullComplete.zones[identity.entityId].hourly = Object.fromEntries(nullOcean.map(native => [native.step,
    { time: native.step, 'current-u': native['current-u'], 'current-v': native['current-v'], sources: native.provenance }]));
  assert.equal(inspectDmiForecastGridSampling(nullSelected.sources.current, 'current', nullSelected.time, identity).status, 'unknown');
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [nullComplete] })
    .inspectOriginals({ part: f.part, row: nullSelected }).ok, true);
  const absentComplete = copy(nullComplete);
  for (const native of Object.values(absentComplete.zones[identity.entityId].hourly)) delete native.sources.current.nativeGridSampling;
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [absentComplete] })
    .inspectOriginals({ part: f.part, row: nullSelected }).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING',
  'stripping an original null from OLD context is NOT exact original projection');
  const nullBulk = copy(nullComplete); delete nullBulk.zones[identity.entityId].hourly[at(missingHour)];
  const nullInput = { ...input, protectedBulk: nullBulk,
    persistedHourlyByPart: new Map([[f.part.partId, nullPersisted]]) };
  const nullPlan = currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests(nullInput);
  const nullWitness = nullPlan.projectionWitnesses.find(value => value.row.time === at(witnessHour));
  assert.deepEqual(nullWitness.row.sources.current, nullSelected.sources.current, 'original null witness is never rewritten');
  assert.equal(nullWitness.row.sources.current.nativeGridSampling, null);
  assert.ok(nullWitness.row.sources.current.nativeSteps.every(step => step.nativeGridSampling === null));
  assert.ok(nullPlan.reconstructionRequests.every(value => Object.hasOwn(value.reconstructionRequest.expectedSource, 'nativeGridSampling')
    && value.reconstructionRequest.expectedSource.nativeGridSampling === null),
  'causal OWN OLD expectations preserve their actual step null shape, not a nonnull sampling receipt');
  for (const receipt of [{}, { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
    gridIndexIdentitySha256: 'e'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: nullSelected.sources.current.gridDefinitionSha256,
    gridPoint: [...nullSelected.sources.current.gridPoint], fieldSet: ['current-u', 'current-v'], optionalFieldSet: [] }]) {
    const invalidPersisted = copy(nullPersisted), selected = invalidPersisted.hourly.find(row => row.time === at(witnessHour));
    selected.sources.current.nativeGridSampling = copy(receipt);
    for (const step of selected.sources.current.nativeSteps) step.nativeGridSampling = copy(receipt);
    assert.throws(() => currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests({ ...nullInput,
      persistedHourlyByPart: new Map([[f.part.partId, invalidPersisted]]) }), 'nonnull/partial receipts never become OLD expectations');
  }
  for (const mutate of [
    value => { delete value.protectedBulk.zones[otherId]; },
    value => { value.protectedBulk.zones[otherId].hourly[at(missingHour)].sources.current.contentSha256 = 'f'.repeat(64); },
    value => { delete value.protectedBulk.runs; },
    value => { value.protectedBulk.runs.dkss_idw.processingSignature = signature.replace('parser:20', 'parser:21'); },
    value => { value.protectedBulk.runs.dkss_idw.processedSteps[at(missingHour)].sourceAsset.acquiredAt = at(-2); },
    value => { value.protectedBulk.zones[identity.entityId].hourly = []; },
    value => { value.progressRole = 'unlisted'; },
  ]) {
    const changed = { ...input, protectedBulk: copy(input.protectedBulk), progressCandidate: null };
    mutate(changed);
    assert.throws(() => currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests(changed));
  }
  // Actual normal mixed OLD/NEW source, not a receipt pasted over a forecast.
  // The missing OLD bracket is causal-decoded; its own existing NEW sibling
  // must remain an exact full-precision, same-document original.
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  for (const collection of ['dkss_lf', 'dkss_nsbs']) {
    const mixedBulk = copy(f.bulk), mixedOcean = copy(ocean);
    for (const zone of Object.values(mixedBulk.zones)) for (const raw of Object.values(zone.hourly)) raw.sources.current.collection = collection;
    for (const raw of mixedOcean) raw.provenance.current.collection = collection;
    mixedBulk.runs = { [collection]: copy(f.bulk.runs.dkss_idw) };
    for (const raw of Object.values(mixedBulk.runs[collection].processedSteps)) raw.sourceAsset.collection = collection;
    const retained = mixedOcean.find(raw => raw.step === at(-48)), source = retained.provenance.current;
    source.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: 'e'.repeat(64), coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
      fieldSet: [...source.fieldSet], optionalFieldSet: [] };
    mixedBulk.zones[identity.entityId].hourly[at(-48)].sources.current = copy(source);
    const mixedPersisted = buildDmiForecastHourly({ ocean: mixedOcean, generatedAt: at(0), startAt: at(-54), hours: 121 });
    mixedPersisted.hourly = mixedPersisted.hourly.map(row => row.time === at(missingHour)
      ? { ...row, currentUMps: null, currentVMps: null, sources: {} } : row);
    const mixedInput = { ...input, protectedBulk: mixedBulk,
      persistedHourlyByPart: new Map([[f.part.partId, mixedPersisted]]) };
    const unchanged = JSON.stringify({ mixedBulk, mixedPersisted });
    const mixedPlan = currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests(mixedInput);
    assert.equal(mixedPlan.schemaVersion, 2);
    assert.equal(mixedPlan.reconstructionRequests.length, 1, 'Never OLD-decode the actual NEW sibling');
    assert.equal(mixedPlan.existingNativeOriginals.length, 1);
    const ownNew = mixedPlan.existingNativeOriginals[0];
    assert.deepEqual(ownNew.row.sources.current.nativeGridSampling, source.nativeGridSampling);
    assert.equal(ownNew.row['current-u'], retained['current-u']);
    assert.equal(ownNew.documentSha256, mixedInput.sourceHashes.deployedBulk);
    assert.deepEqual(ownNew.rowPath, ['zones', identity.entityId, 'hourly', at(-48)]);
    const requestsSha256 = legacyOriginalHash(mixedPlan);
    const expected = { productionReferenceAt: mixedPlan.productionReferenceAt, modelBinding: mixedPlan.modelBinding,
      historyDemandSha256: mixedPlan.historyDemandSha256, registrySha256: mixedPlan.registrySha256,
      sourceHashes: mixedPlan.sourceHashes, requestsSha256 };
    const rows = {};
    for (const request of mixedPlan.reconstructionRequests) {
      const ownOld = mixedOcean.find(raw => raw.step === request.nativeValidTime);
      rows[request.requestId] = { time: request.nativeValidTime, 'current-u': ownOld['current-u'],
        'current-v': ownOld['current-v'], sources: { current: copy(request.reconstructionRequest.expectedSource) } };
    }
    const context = mixedPlan.documentContexts[0];
    const reconstruction = { schemaVersion: 1, kind: 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION', requestsSha256,
      document: { ...context.header, zones: { [identity.entityId]: { ...context.zones[0].zone, hourly: rows } } } };
    const verified = verifyDmiLegacyCurrentOriginalReconstruction({ requests: mixedPlan, requestsSha256,
      reconstruction, parts: [f.part], expected });
    const witness = mixedPlan.projectionWitnesses.find(value => value.row.time === at(-50));
    assert.ok(witness);
    const selection = { part: f.part, row: witness.row };
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [verified] }).inspectOriginals(selection).ok, true);
    const bank = buildProtectedDmiNativeCurrentProofs({ selections: [selection], contexts: [verified] });
    assert.equal(verifyProtectedDmiNativeCurrentProof(JSON.parse(JSON.stringify(bank)), selection).ok, true,
      'Actual normal bank serialization must retain all native/context/projection data');
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [JSON.parse(JSON.stringify(verified))] })
      .inspectOriginals(selection).code, 'DMI_NATIVE_PROOF_SCOPED_ORIGINAL_CONTEXT_UNAVAILABLE',
    'A copied mapper container is not a replacement for actual scoped native/context data');
    const invented = { ...witness.row, currentUMps: witness.row.currentUMps + 1e-8 };
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [verified] })
      .inspectOriginals({ part: f.part, row: invented }).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING',
    'No PASS flag may qualify a new source/tuple selection');
    const { buildPrivateDmiRecoveryRecord } = await import('./lib/private-dmi-recovery-record.mjs');
    const recovered = buildPrivateDmiRecoveryRecord({ properties: { id: identity.entityId, dataPoint: f.part.waterPoint } },
      mixedBulk, at(1), { startAt: demand.demands[0].startAt, expectedIdentity: identity,
        persistedHourly: mixedPersisted.hourly, historicalBulkCache: verified, protectPreviousDmi: true });
    const normalRow = recovered.hourly.find(row => row.time === witness.row.time);
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [mixedBulk, verified] })
      .inspectOriginals({ part: f.part, row: normalRow }).ok, true, 'Actual normal historical mapper retains a role-scoped proof');
    const oldHourly = verifiedIntegratedPartHourly({ hourly: [normalRow] }, verified, identity.entityId, f.part);
    const stillUnknown = error => error.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'unknown';
    assert.throws(() => assertDmiPartHourlyGridSamplingApplicable(oldHourly, identity.entityId, f.part), stillUnknown,
      'Authentic mixed OLD proof does not authorize new PUBLIC calculation');
    assert.throws(() => buildRavScorePermittedCurrentHistory({ part: f.part, referenceAt: normalRow.time,
      sourceRecords: [{ record: { point: f.part.waterPoint, hourly: oldHourly }, nativeCurrentContexts: [verified] }],
      requireNativeGridSampling: true }), stillUnknown, 'Strict OWNER new-use guard remains independent');
    const conflicting = copy(mixedBulk);
    conflicting.zones[identity.entityId].hourly[at(-48)]['current-u'] += 0.01;
    assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [verified, conflicting] })
      .inspectOriginals(selection).code, 'DMI_NATIVE_PROOF_NATIVE_CONFLICT');
    const missingNew = copy(mixedBulk); delete missingNew.zones[identity.entityId].hourly[at(-48)];
    assert.throws(() => currentHistoryPlanner.buildRavScoreLegacyCurrentOriginalRequests({ ...mixedInput,
      protectedBulk: missingNew }), /LEGACY_NEW_ENDPOINT_UNAVAILABLE/);
    for (const mutate of [
      value => { value.existingNativeOriginals[0].row['current-u'] += 0.01; },
      value => { value.existingNativeOriginals[0].row.sources.current.gridPoint[0] += 0.01; },
      value => { value.existingNativeOriginals[0].row.sources.current.nativeGridSampling.elementIndex = -1; },
      value => { value.existingNativeOriginals[0].rowPath[1] = 'PART::FOREIGN'; },
      value => { value.existingNativeOriginals[0].documentSha256 = `sha256:${'f'.repeat(64)}`; },
      value => { value.documentContexts[0].header.currentVectorSelection = 'forged'; },
      value => {
        value.sourceHashes.candidate = `sha256:${'f'.repeat(64)}`;
        value.documentContexts.push({ ...copy(value.documentContexts[0]), documentRole: 'candidate' });
        value.existingNativeOriginals[0].documentRole = 'candidate';
        value.existingNativeOriginals[0].documentSha256 = value.sourceHashes.candidate;
      },
    ]) {
      const wrong = copy(mixedPlan); mutate(wrong);
      for (const original of wrong.existingNativeOriginals) original.originalId = legacyOriginalHash(Object.fromEntries(
        Object.entries(original).filter(([key]) => !['originalId', 'projectionWitnessRefs'].includes(key))));
      const changedSha = legacyOriginalHash(wrong);
      assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction({ requests: wrong, requestsSha256: changedSha,
        reconstruction: { ...reconstruction, requestsSha256: changedSha }, parts: [f.part],
        expected: { ...expected, sourceHashes: wrong.sourceHashes, requestsSha256: changedSha } }), /DMI_LEGACY_CURRENT_/,
      'Even reissued descriptor hashes cannot qualify wrong tuple/source/header/path/role');
    }
    assert.equal(JSON.stringify({ mixedBulk, mixedPersisted }), unchanged);
  }
  // Exercise the actual fixed-path CLI on unchanged source bytes. No repository
  // originals, provider credentials, network, decoder or native runtime is used.
  const fs = await import('node:fs/promises'), path = await import('node:path');
  const os = await import('node:os'), { fileURLToPath } = await import('node:url');
  const { spawnSync } = await import('node:child_process');
  const { packDmiPartContinuity } = await import('./lib/dmi-part-continuity.mjs');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-legacy-original-plan-'));
  const repository = fileURLToPath(new URL('../', import.meta.url));
  const fixed = currentHistoryPlanner.RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS;
  const write = async (relative, value) => {
    const destination = path.join(temporary, relative);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
    await fs.writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  };
  try {
    // Copy bounded SOURCE ONLY, unchanged. The actual protected reader contains
    // archived dynamic loaders; do not rewrite/execute those loaders just to
    // discover a fixture closure. No data/, .cache, credentials or tests copied.
    let sourceFiles = 0, sourceBytes = 0;
    const copySources = async relative => {
      for (const entry of await fs.readdir(path.join(repository, relative), { withFileTypes: true })) {
        const next = path.posix.join(relative, entry.name);
        if (entry.isDirectory()) { await copySources(next); continue; }
        if (!entry.isFile() || !/\.(?:m?js|json)$/.test(entry.name) || entry.name.startsWith('test')) continue;
        const bytes = await fs.readFile(path.join(repository, next));
        sourceFiles++; sourceBytes += bytes.length;
        assert(sourceFiles <= 2048 && sourceBytes <= 32 * 1024 * 1024);
        await write(next, bytes);
      }
    };
    await copySources('scripts'); await copySources('js');
    await write('package.json', await fs.readFile(path.join(repository, 'package.json')));
    const registrySha256 = await write('data/live/coastal-parts-v2.json', registry);
    await write(fixed.zones, input.zones); await write(fixed.deployedBulk, f.bulk);
    const continuity = await packDmiPartContinuity(new Map([[f.part.partId,
      { ...persisted, point: f.part.waterPoint, zoneId: identity.entityId }]]), [f.part], at(-54));
    await write(fixed.forecast, { zones: {}, partContinuity: continuity });
    const conditionsSha256 = await write('data/live/conditions.json', conditions);
    const cliDemand = { ...copy(demand), registrySha256,
      sourceHashes: { ...demand.sourceHashes, conditions: conditionsSha256 } };
    await write(currentHistoryPlanner.RAVSCORE_CURRENT_HISTORY_DEMAND_PATH, cliDemand);
    const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'COMSPEC', 'PATHEXT']);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
    env.RAVRADAR_PRODUCTION_TARGET_HOUR = at(1);
    env.GITHUB_OUTPUT = path.join(temporary, 'github-output');
    const guard = 'data:text/javascript,' + encodeURIComponent(`
      import http from 'node:http'; import https from 'node:https';
      import {syncBuiltinESMExports} from 'node:module';
      const forbidden=()=>{process.stderr.write('FORBIDDEN_NETWORK\\n');process.exit(97)};
      globalThis.fetch=forbidden;http.get=http.request=https.get=https.request=forbidden;syncBuiltinESMExports();`);
    const run = (preload = null) => spawnSync(process.execPath, ['--import', guard,
      ...(preload ? ['--import', 'data:text/javascript,' + encodeURIComponent(preload)] : []),
      path.join(temporary, 'scripts/plan-dmi-legacy-current-originals.mjs')],
    { cwd: temporary, env, encoding: 'utf8', timeout: 15_000, maxBuffer: 64 * 1024, windowsHide: true });
    const result = run();
    assert.equal(result.error, undefined); assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
    const report = JSON.parse(result.stdout), file = path.join(temporary,
      currentHistoryPlanner.RAVSCORE_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH);
    const saved = await fs.readFile(file), savedPlan = JSON.parse(saved);
    assert.equal(report.requestCount, savedPlan.reconstructionRequests.length);
    assert.equal(report.requestsSha256, `sha256:${createHash('sha256').update(saved).digest('hex')}`);
    const output = Object.fromEntries((await fs.readFile(env.GITHUB_OUTPUT, 'utf8')).trim().split('\n')
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    assert.equal(output.requests_sha256, report.requestsSha256);
    assert.deepEqual(JSON.parse(output.expectation_json), { productionReferenceAt: savedPlan.productionReferenceAt,
      modelBinding: savedPlan.modelBinding, historyDemandSha256: savedPlan.historyDemandSha256,
      registrySha256: savedPlan.registrySha256, sourceHashes: savedPlan.sourceHashes,
      requestsSha256: report.requestsSha256 });
    assert.ok(savedPlan.reconstructionRequests.some(value => value.nativeValidTime === at(missingHour)));
    assert.deepEqual(savedPlan.projectionWitnesses.find(value => value.row.time === at(witnessHour)).row,
      plan.projectionWitnesses.find(value => value.row.time === at(witnessHour)).row);
    assert.equal(run().status, 1, 'existing private request file is never overwritten');
    assert.deepEqual(await fs.readFile(file), saved);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(temporary,
      currentHistoryPlanner.RAVSCORE_CURRENT_HISTORY_DEMAND_PATH))), cliDemand, 'original demand is unchanged');
    await fs.rename(file, file + '.preserved');
    env.GITHUB_OUTPUT = path.join(temporary, 'github-output-noop');
    const noClose = run(`import fs from 'node:fs/promises';
      const open=fs.open;fs.open=async(...args)=>{const h=await open(...args);
        if(String(args[0]).endsWith('dmi-legacy-current-original-requests.json')
          && (args[1]&fs.constants.O_WRONLY)) h.close=async()=>{};return h;};`);
    assert.equal(noClose.status, 1); assert.equal(noClose.stdout, '');
    assert.equal(noClose.stderr.trim(), 'RAVSCORE_CURRENT_HISTORY_DEMAND_LEGACY_WRITER_CLOSE_UNPROVED');
    await assert.rejects(fs.lstat(env.GITHUB_OUTPUT), { code: 'ENOENT' });
    assert.deepEqual(await fs.readFile(file + '.preserved'), saved, 'first request original remains intact');
    await fs.rename(file, file + '.unclosed');
    env.GITHUB_OUTPUT = path.join(temporary, 'github-output-write-failed');
    const writeFailed = run(`import fs from 'node:fs/promises';
      const open=fs.open;fs.open=async(...args)=>{const h=await open(...args);
        if(String(args[0]).endsWith('dmi-legacy-current-original-requests.json')
          && (args[1]&fs.constants.O_WRONLY)) {const close=h.close.bind(h);
          h.writeFile=async()=>{throw Object.assign(new Error('write failed'),{code:'SYNTHETIC_WRITE_FIRST'})};
          h.close=async()=>{await close();throw Object.assign(new Error('close failed'),{code:'SYNTHETIC_CLOSE_SECOND'})};
        }return h;};`);
    assert.equal(writeFailed.status, 1); assert.equal(writeFailed.stdout, '');
    assert.equal(writeFailed.stderr.trim(), 'SYNTHETIC_WRITE_FIRST', 'physical close error preserves first write cause');
    await assert.rejects(fs.lstat(env.GITHUB_OUTPUT), { code: 'ENOENT' });
  } finally {
    assert.equal(path.dirname(await fs.realpath(temporary)), await fs.realpath(os.tmpdir()));
    assert(path.basename(temporary).startsWith('rr-legacy-original-plan-'));
    await fs.rm(temporary, { recursive: true });
  }
});

test('OLD null shape follows exact normal projection and never promotes a receipt', () => {
  const f = fixture(), identity = dmiExpectedIdentityForPart(f.part);
  const native = document => Object.values(document.zones[identity.entityId].hourly);
  const project = document => buildDmiForecastHourly({ ocean: native(document).map(row => ({ step: row.time,
    'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
  generatedAt: at(0), startAt: at(1), hours: 1 }).hourly[0];
  const inspect = (document, row) => createProtectedDmiNativeCurrentInspector({ contexts: [document] })
    .inspectOriginals({ part: f.part, row });
  const topOnly = copy(f.row); topOnly.sources.current.nativeGridSampling = null;
  assert.equal(inspectDmiForecastGridSampling(topOnly.sources.current, 'current', topOnly.time, identity).status, 'unknown');
  assert.equal(inspect(f.bulk, topOnly).code, 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH');
  const selectedNull = copy(f.bulk); native(selectedNull)[0].sources.current.nativeGridSampling = null;
  const selectedProjection = project(selectedNull);
  assert.equal(selectedProjection.sources.current.nativeGridSampling, null);
  assert.equal(selectedProjection.sources.current.nativeSteps[0].nativeGridSampling, null,
    'actual normal top-null always also emits its selected native step null');
  assert.equal(inspect(selectedNull, topOnly).code, 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH');
  assert.equal(inspect(selectedNull, selectedProjection).ok, true);
  const selectedStepOnly = copy(selectedProjection); delete selectedStepOnly.sources.current.nativeGridSampling;
  assert.equal(inspectDmiForecastGridSampling(selectedStepOnly.sources.current, 'current', selectedStepOnly.time, identity).status, 'unknown');
  assert.equal(inspect(selectedNull, selectedStepOnly).code, 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH',
    'selected-step null cannot silently synthesize a missing original top null');
  const nonselectedNull = copy(f.bulk); native(nonselectedNull)[1].sources.current.nativeGridSampling = null;
  const stepOnly = project(nonselectedNull);
  assert.equal(Object.hasOwn(stepOnly.sources.current, 'nativeGridSampling'), false);
  assert.equal(stepOnly.sources.current.nativeSteps[1].nativeGridSampling, null);
  assert.equal(inspect(nonselectedNull, stepOnly).ok, true, 'actual nonselected own-step null is losslessly projectable');
  assert.equal(inspect(f.bulk, stepOnly).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  const bothNull = copy(f.bulk);
  for (const row of native(bothNull)) row.sources.current.nativeGridSampling = null;
  const bothProjection = project(bothNull);
  assert.equal(bothProjection.sources.current.nativeGridSampling, null);
  assert.ok(bothProjection.sources.current.nativeSteps.every(step => step.nativeGridSampling === null));
  assert.equal(inspect(bothNull, bothProjection).ok, true);
  assert.equal(inspect(f.bulk, bothProjection).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  const partial = copy(f.bulk); native(partial)[1].sources.current.nativeGridSampling = {};
  const partialProjection = project(partial);
  assert.equal(inspectDmiForecastGridSampling(partialProjection.sources.current, 'current', partialProjection.time, identity).status,
    'contradictory', 'a nonnull partial record never becomes an OLD null expectation');
});

test('original metadata index is lazy and verifies native rows once across 673 selected calls', async () => {
  const { createSavedDmiOriginalDependencyDiscovery, resolveSavedDmiOriginalDependencyCaptures } =
    await import('./lib/saved-dmi-original-dependencies.mjs');
  const f = fixture();
  let nativeVerifierReads = 0;
  for (const zone of Object.values(f.bulk.zones)) for (const native of Object.values(zone.hourly)) {
    native.sources.current.contentLengthBytes = 1234;
    Object.defineProperty(native.sources.current, 'provider', { enumerable: true,
      get() { nativeVerifierReads++; return 'dmi'; } });
  }
  const discovery = createSavedDmiOriginalDependencyDiscovery({ protectedBulk: f.bulk });
  assert.equal(nativeVerifierReads, 0, 'constructor does not eagerly scan a national document');
  const ownHourly = [];
  const resolve = () => resolveSavedDmiOriginalDependencyCaptures(discovery,
    { protectedBulk: f.bulk, document: f.bulk, part: f.part, row: f.row, ownHourly });
  assert.equal(resolve().length, 2);
  const detached = resolve(); detached[0].contentSha256 = 'f'.repeat(64);
  assert.notEqual(resolve()[0].contentSha256, detached[0].contentSha256, 'returned captures cannot poison the sealed invocation cache');
  const once = nativeVerifierReads;
  assert.ok(once > 0 && once < 32);
  for (let index = 1; index < 673; index++) assert.equal(resolve().length, 2);
  assert.equal(nativeVerifierReads, once, 'same asset never revalidates every native donor per selected endpoint');
  const excessive = copy(f.bulk), zone = copy(Object.values(excessive.zones)[0]);
  for (let index = 0; index < 674; index++) excessive.zones[`PART::BOUNDED-${index}`] = zone;
  const bounded = createSavedDmiOriginalDependencyDiscovery({ protectedBulk: excessive });
  assert.throws(() => resolveSavedDmiOriginalDependencyCaptures(bounded,
    { protectedBulk: excessive, document: excessive, part: f.part, row: f.row }), /DONOR_INVALID/);
});

test('current-history demand runs after actual activation and before DMI without changing old routes', async () => {
  const { readFile } = await import('node:fs/promises');
  const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  const workflow = inverseCurrentHistoryRawRetentionOrder((await readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url),
    'utf8')).replaceAll('\r\n', '\n'), 'build');
  const name = '      - name: Plan bounded current history from the actual selected continuation\n';
  assert.equal(workflow.split(name).length - 1, 1);
  const start = workflow.indexOf(name);
  const end = workflow.indexOf('      - name: Refresh DMI water-source registry\n', start);
  const plan = workflow.slice(start, end);
  assert.ok(workflow.indexOf('      - name: Prepare only an explicitly requested READY point activation\n') < start);
  assert.ok(workflow.indexOf('      - name: Rebuild centrally reviewed coastal-part sampling points\n') < start);
  assert.ok(end < workflow.indexOf('      - name: Prepare strict active DMI donor or resumable candidate\n'));
  assert.ok(end < workflow.indexOf('      - name: Update DMI bulk model cache\n'));
  assert.ok(plan.includes("steps.weather-source-handoff.outputs.reused != 'true'"));
  assert.ok(plan.includes("steps.operational-action.outputs.action == 'integrated'"));
  assert.ok(plan.includes("steps.operational-action.outputs.action == 'integrated-historical-maintenance'"));
  assert.ok(plan.includes("steps.historical-wave-transition.outputs.required != 'true'"));
  assert.ok(plan.includes('run: node scripts/plan-ravscore-current-history.mjs'));
  assert.ok(plan.includes("steps.private-runtime-install.outcome == 'success'"));
  assert.ok(plan.includes("steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true'"));
  assert.ok(workflow.includes("DMI_BULK_CURRENT_HISTORY_DEMAND_PATH: ${{ steps.current-history-demand.outcome == 'success' && '.cache/ravscore-current-history-demand.json' || '' }}"));
  assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes('scripts/plan-ravscore-current-history.mjs'));
  assert.deepEqual(PRIVATE_RUNTIME_CONTRACT_FILES.fullRuntimeContractSha256,
    ['scripts/lib/private-weather-storage-abi.json']);
});
test('actual committed RAW demand follows the materialized generation before legacy binding', async () => {
  const { readFile } = await import('node:fs/promises');
  const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  // Qualify the complete reviewed C afterimage before the unchanged f644
  // order oracle; mutations never enter this exact whole-workflow inverse.
  const workflow = inverseCurrentFamilyColdStartWorkflow((await readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url),
    'utf8')).replaceAll('\r\n', '\n'), 'build');
  assertCurrentHistoryRawRetentionOrder(workflow);
  const name = '      - name: Plan bounded current history from the actual selected continuation\n';
  assert.equal(workflow.split(name).length - 1, 1);
  const start = workflow.indexOf(name);
  const end = workflow.indexOf('      - name: Bind causal OLD current reconstruction to the materialized saved inputs\n', start);
  assert.ok(end > start, 'the demand block must have the exact next legacy step');
  const plan = workflow.slice(start, end);
  assert.ok(workflow.indexOf('      - name: Prepare only an explicitly requested READY point activation\n') < start);
  assert.ok(workflow.indexOf('      - name: Rebuild centrally reviewed coastal-part sampling points\n') < start);
  assert.ok(workflow.indexOf('      - name: Prepare strict active DMI donor or resumable candidate\n') < start);
  assert.ok(end < workflow.indexOf('      - name: Update DMI bulk model cache\n'));
  assert.ok(plan.includes("steps.weather-source-handoff.outputs.reused != 'true'"));
  assert.ok(plan.includes("steps.operational-action.outputs.action == 'integrated'"));
  assert.ok(plan.includes("steps.operational-action.outputs.action == 'integrated-historical-maintenance'"));
  assert.ok(plan.includes("steps.historical-wave-transition.outputs.required != 'true'"));
  assert.ok(plan.includes('run: node scripts/plan-ravscore-current-history.mjs --retain-committed-raw'));
  assert.ok(plan.includes("steps.private-runtime-install.outcome == 'success'"));
  assert.ok(plan.includes("steps.legacy-bootstrap.outputs.stateless_integrated_recovery == 'true'"));
  assert.ok(workflow.includes("DMI_BULK_CURRENT_HISTORY_DEMAND_PATH: ${{ steps.current-history-demand.outcome == 'success' && '.cache/ravscore-current-history-demand.json' || '' }}"));
  assert.ok(workflow.includes("DMI_BULK_REQUIRE_COMMITTED_RAW_RETENTION: ${{ steps.private-runtime-install.outcome == 'success' && (steps.operational-action.outputs.action == 'integrated' || steps.operational-action.outputs.action == 'integrated-historical-maintenance') && inputs.weather_state_epoch_bootstrap != true && steps.legacy-bootstrap.outputs.stateless_integrated_recovery != 'true' && steps.historical-wave-transition.outputs.required != 'true' && 'true' || 'false' }}"));
  assert.ok(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes('scripts/plan-ravscore-current-history.mjs'));
  assert.deepEqual(PRIVATE_RUNTIME_CONTRACT_FILES.fullRuntimeContractSha256,
    ['scripts/lib/private-weather-storage-abi.json']);
});

test('private current source transition archive survives cold recovery and rejects malformed envelopes', async t => {
  const f = fixture({ zoneId: 'DK-B01-02', collection: 'dkss_lf', nativeHours: [0], target: 0 });
  f.part.onshoreDirectionDeg = 90;
  const zone = { id: f.part.zoneId, onshoreDirectionDeg: 90 };
  const hourly = [{ ...f.row, currentProvenance: { ...f.row.sources.current, status: 'verified' },
    currentCoastNormalSpeedMps: f.row.currentUMps }];
  const integrated = buildIntegratedPartScoreSeries({ part: f.part, zone, hourly })
    .ravScoreState.continuationState;
  const candidate = buildCandidateGRollbackPartScoreSeries({ part: f.part, zone,
    hourly, measuredColdStart: true }).candidateGState.continuationState;
  const record = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
    parentZoneId: f.part.zoneId, partId: f.part.partId, excludedCollection: 'dkss_lf',
    referenceAt: at(0), provedCurrentHours: 1, unknownCurrentHours: 48,
    originalIntegratedState: integrated, originalCandidateGState: candidate };
  const archive = { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE',
    privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', parts: { [f.part.partId]: record } };
  const snapshot = JSON.stringify(archive);
  await t.test('technical bridge archives the true pair without declaring its current input proved', async () => {
    const { preserveOwnerCurrentOriginalPairs, classifyOwnerCurrentArchiveBridge } =
      await import('./migrate-post-cutover-private-runtime.mjs');
    const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
    const previousBinding = { ...ravScoreModelBinding(),
      modelBundleSha256: '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948' };
    const predecessorState = { ...copy(integrated), modelBundleSha256: previousBinding.modelBundleSha256 };
    // Only the existing ONE canonical pair is evaluated. Opaque untargeted
    // identities exercise the inventory boundary, not a national model run.
    const parts = Object.fromEntries(Array.from({ length: 672 }, (_, index) => [
      'OPAQUE-' + index, { partId: 'OPAQUE-' + index, zoneId: 'DK-B05-17' } ]));
    const islandIds = ['DK-B11-SAM-01', 'DK-B11-SAM-02', 'DK-B11-SAM-03',
      'DK-B11-LAE-01', 'DK-B11-LAE-02', 'DK-B11-LAE-03'];
    islandIds.forEach((zoneId, index) => { parts['OPAQUE-' + index].zoneId = zoneId; });
    const zoneIds = [f.part.zoneId, 'DK-B05-17', ...islandIds,
      ...Array.from({ length: 202 }, (_, index) => 'FIXTURE-ZONE-' + index)];
    const zones = Object.fromEntries(zoneIds.map(zoneId => [zoneId, {}]));
    parts[f.part.partId] = { ...copy(f.part), ravScoreModel: { currentState: predecessorState } };
    const source = { productionReferenceAt: at(0), zones: copy(zones),
      coastalParts: { modelBinding: previousBinding, parts, zones: copy(zones) },
      ravScoreCandidateGWarmup: { runtime: { parts: {
        [f.part.partId]: { ravScoreModel: { currentState: copy(candidate) } } } } } };
    const before = JSON.stringify(source);
    const migrated = copy(source);
    migrated.coastalParts.modelBinding.modelBundleSha256 = 'e'.repeat(64);
    preserveOwnerCurrentOriginalPairs(source, migrated);
    const saved = migrated.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId];
    assert.deepEqual(saved.originalIntegratedState, predecessorState);
    assert.deepEqual(saved.originalCandidateGState, candidate);
    assert.equal(saved.provedCurrentHours, 0);
    assert.equal(saved.unknownCurrentHours, 49);
    assert.equal(saved.originalIntegratedState.modelBundleSha256, previousBinding.modelBundleSha256);
    const changes = ['coastalParts.modelBinding.modelBundleSha256', 'ravScoreCurrentSourceDomainTransitions'];
    const options = { source, migrated, bindingMetadataPaths: [changes[0]], verifiedChangedPaths: changes };
    assert.equal(classifyOwnerCurrentArchiveBridge(options), 'OWNER_CURRENT_ORIGINAL_ARCHIVE_BRIDGE');
    const wrong = copy(migrated);
    wrong.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId].provedCurrentHours = 1;
    wrong.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId].unknownCurrentHours = 48;
    assert.throws(() => classifyOwnerCurrentArchiveBridge({ ...options, migrated: wrong }), /True original-pair archive/);
    const changedState = copy(migrated);
    changedState.coastalParts.parts[f.part.partId].ravScoreModel.currentState.supplyPotential += 1;
    assert.throws(() => classifyOwnerCurrentArchiveBridge({ ...options, migrated: changedState }), /unverified changes/);
    const wrongTime = copy(source);
    wrongTime.ravScoreCandidateGWarmup.runtime.parts[f.part.partId].ravScoreModel.currentState.time = at(1);
    assert.throws(() => preserveOwnerCurrentOriginalPairs(wrongTime, {}), /original pair|original time/);
    const unknownParent = copy(source);
    unknownParent.coastalParts.parts['OPAQUE-0'].zoneId = 'DK-B05-99';
    assert.throws(() => preserveOwnerCurrentOriginalPairs(unknownParent, {}), /parent-zone and part identities/);
    const wrongPart = copy(source);
    wrongPart.coastalParts.parts['OPAQUE-0'].partId = 'OTHER';
    assert.throws(() => preserveOwnerCurrentOriginalPairs(wrongPart, {}), /parent-zone and part identities/);
    const mismatchedZones = copy(source);
    delete mismatchedZones.zones['DK-B11-SAM-01'];
    mismatchedZones.zones.UNKNOWN = {};
    assert.throws(() => preserveOwnerCurrentOriginalPairs(mismatchedZones, {}), /parent-zone and part identities/);
    assert.equal(JSON.stringify(source), before);
  });
  await t.test('normal metadata migration preserves validated private originals under their original binding', async () => {
    const { migrateExactModelBindingMetadata, classifyVerifiedRuntimeMigration,
      collectBundleHashPaths } =
      await import('./migrate-post-cutover-private-runtime.mjs');
    const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
    const previousBinding = ravScoreModelBinding();
    // Synthetic successor metadata exercises this pass only; it is NOT a
    // generated/new-binding, original private runtime or full migration proof.
    const successorBinding = { ...previousBinding, modelBundleSha256: 'e'.repeat(64) };
    const source = {
      productionReferenceAt: at(0),
      coastalParts: { modelBinding: copy(previousBinding), parts: {
        [f.part.partId]: { ...copy(f.part), ravScoreModel: {
          ...copy(previousBinding), currentState: copy(integrated),
        } },
      } },
      ravScoreCurrentSourceDomainTransitions: copy(archive),
    };
    const migrated = copy(source);
    const changed = migrateExactModelBindingMetadata(migrated, previousBinding, successorBinding);
    assert.deepEqual(migrated.ravScoreCurrentSourceDomainTransitions,
      source.ravScoreCurrentSourceDomainTransitions, 'historical originals must not be relabelled');
    assert.deepEqual(migrated.coastalParts.parts[f.part.partId].ravScoreModel.currentState,
      source.coastalParts.parts[f.part.partId].ravScoreModel.currentState,
      'the metadata pass must leave normal continuation handling to its strict owner');
    assert.deepEqual(changed.sort(), [
      'coastalParts.modelBinding.modelBundleSha256',
      'coastalParts.parts.SYNTHETIC-PART.ravScoreModel.modelBundleSha256',
    ]);
    assert.equal(classifyVerifiedRuntimeMigration({ source, migrated,
      bindingMetadataPaths: changed, verifiedChangedPaths: changed }), 'MODEL_BINDING_METADATA_ONLY');
    assert.deepEqual(collectBundleHashPaths(migrated,
      new Set([previousBinding.modelBundleSha256])), [
      'coastalParts.parts.SYNTHETIC-PART.ravScoreModel.currentState.modelBundleSha256',
    ], 'the normal stale-hash check must distinguish archived originals from live continuation');
    const nested = { other: { ravScoreCurrentSourceDomainTransitions: copy(archive) } };
    assert.deepEqual(collectBundleHashPaths(nested,
      new Set([previousBinding.modelBundleSha256])), [
      'other.ravScoreCurrentSourceDomainTransitions.parts.SYNTHETIC-PART.originalIntegratedState.modelBundleSha256',
    ], 'a same-named nested object is not a validated ROOT archive');
    for (const mutate of [
      value => { value.productionReferenceAt = at(-1); },
      value => { delete value.productionReferenceAt; },
      value => { value.ravScoreCurrentSourceDomainTransitions = null; },
      value => { value.ravScoreCurrentSourceDomainTransitions.extra = true; },
      value => { value.ravScoreCurrentSourceDomainTransitions.parts[f.part.partId]
        .originalIntegratedState.modelBundleSha256 = 'a'.repeat(64); },
      value => { value.coastalParts.parts[f.part.partId].zoneId = 'DK-B05-17'; },
      value => { delete value.coastalParts.parts[f.part.partId]; },
    ]) {
      const invalid = copy(source); mutate(invalid);
      const before = JSON.stringify(invalid);
      assert.throws(() => migrateExactModelBindingMetadata(invalid, previousBinding, successorBinding),
        /Private current source transition archive/);
      assert.equal(JSON.stringify(invalid), before, 'invalid archive must fail before metadata mutation');
    }
    assert.equal(JSON.stringify(source.ravScoreCurrentSourceDomainTransitions), snapshot);
  });
  await t.test('original predecessor is checked under its fixed binding without relabelling', async () => {
    const contract = await import('./lib/coastal-point-staging-contract.mjs');
    const validateOriginal = contract.assertArchivedOwnerCurrentIntegratedOriginal;
    assert.equal(typeof validateOriginal, 'function', 'preserved originals need their own strict binding check');
    const predecessor = copy(integrated);
    predecessor.modelBundleSha256 = '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948';
    const before = JSON.stringify(predecessor);
    const options = { samplingContextKey: ravScoreSamplingContextKey(f.part) };
    assert.equal(validateOriginal(predecessor, options), predecessor,
      'validation must return the unchanged original, not a successor projection');
    const core = await import('../js/core/ravscore-integrated-state-pipeline.js');
    const wrongBinding = { ...predecessor, modelBundleSha256: 'e'.repeat(64) };
    assert.throws(() => core.buildIntegratedRavScoreStateSeries([], {
      ...options, initialState: wrongBinding, expectedBundleSha256: wrongBinding.modelBundleSha256,
    }), 'normal initialization must not expose the internal original-binding validation parameter');
    for (const mutate of [
      state => { state.modelBundleSha256 = 'e'.repeat(64); },
      state => { state.modelContractSha256 = 'e'.repeat(64); },
      state => { state.currentMemoryReady = !state.currentMemoryReady; },
      state => { state.currentEvidence.push(copy(state.currentEvidence[0])); },
      state => { state.mobilisationPotential += 1; },
      state => { state.historyBounds.current.lowerPotential = 999; },
      state => { state.currentEvidence[0].currentUMps = 1; },
      state => { state.lineage = { unknown: true }; },
    ]) {
      const changed = copy(predecessor); mutate(changed);
      assert.throws(() => validateOriginal(changed, options));
      const changedRecord = { ...record, originalIntegratedState: changed };
      assert.throws(() => retainOwnerCurrentTransitionOriginal(null, changedRecord, f.part),
        /Private current source transition archive/);
    }
    assert.throws(() => validateOriginal(predecessor, { samplingContextKey: 'WRONG' }));
    assert.throws(() => validateOriginal(null, options));
    assert.equal(JSON.stringify(predecessor), before, 'predecessor checks must not mutate original history or binding');
  });
  await t.test('keep the first original pair even when this generation has no transition', () => {
    const retained = retainOwnerCurrentTransitionOriginal(null, record, f.part);
    assert.deepEqual(retained, record, 'cold recovery must not delete the private originals');
    assert.notEqual(retained, record, 'retained archive must not share a mutable record');
  });
  await t.test('validate the complete archive before passing its parts to the actual caller', () => {
    const readArchive = productionPipeline.readOwnerCurrentTransitionArchive;
    assert.equal(typeof readArchive, 'function', 'the caller needs an explicit archive-envelope check');
    assert.deepEqual(readArchive(archive, [f.part]), archive.parts);
    assert.deepEqual(readArchive(null, [f.part]), {});
    const lockedReference = { targetReferenceAt: at(0) };
    assert.deepEqual(readArchive(archive, [f.part], lockedReference), archive.parts);
    const futureRecord = copy(archive);
    futureRecord.parts[f.part.partId].referenceAt = at(1);
    assert.throws(() => readArchive(futureRecord, [f.part], lockedReference),
      /Private current source transition archive/,
      'a canonical original pair cannot attest an archive transition after the locked generation');
    assert.throws(() => readArchive(archive, [f.part], { targetReferenceAt: at(-1) }),
      /Private current source transition archive/);
    assert.throws(() => readArchive(archive, [f.part], { targetReferenceAt: 'invalid' }),
      /Private current source transition archive/);
    for (const changed of [
      { ...archive, schemaVersion: 2 }, { ...archive, privacyClass: 'PUBLIC' },
      { ...archive, parts: [] }, { ...archive, parts: null }, { ...archive, extra: true },
      { ...archive, parts: { WRONG: record } },
      { ...archive, parts: { [f.part.partId]: { ...record, unknownCurrentHours: 47 } } },
      { ...archive, parts: { [f.part.partId]: { ...record, referenceAt: at(-1) } } },
      { ...archive, parts: { [f.part.partId]: { ...record, extra: true } } },
    ]) assert.throws(() => readArchive(changed, [f.part]), /Private current source transition archive/);
    assert.throws(() => readArchive(archive, [{ ...f.part, zoneId: 'DK-B05-17' }]),
      /Private current source transition archive/);
  });
  assert.equal(JSON.stringify(archive), snapshot, 'archive validation and retention are byte-neutral');
});

test('strict OWNER history uses qualified same-original decoder association without changing originals', () => {
  // Synthetic complete native captures, not an ecCodes/provider/production proof.
  // Construct every variant before projection and snapshots; never repair a captured donor.
  const hash = value => createHash('sha256').update(value).digest('hex');
  const sampling = source => ({
    contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
    gridIndexIdentitySha256: hash('owner-synthetic-message-grid-index-order'),
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
    fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet],
  });
  const withWeather = row => ({ ...row,
    currentCoastNormalSpeedMps: row.currentUMps,
    windSpeedMps: 8, windDirectionDeg: 270, waveHeightM: 1.2,
    wavePeriodS: 6, waveDirectionDeg: 90, waveProvenance: { status: 'verified' },
    waterLevelCm: 0, waterLevelTrendCm3h: 0 });
  const ownerFailure = expectedStatus => error => {
    assert.equal(error?.code, 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED');
    assert.equal(error?.samplingStatus, expectedStatus);
    const actualStack = error.stack;
    try {
      error.stack = reviewedOriginPipelineStack(actualStack);
    assert.match(error.stack, /at currentComponent \([^\n]*ravscore-recovery-replay\.mjs:280:\d+\)/);
    assert.match(error.stack, /at buildRavScorePermittedCurrentHistory \([^\n]*ravscore-recovery-replay\.mjs:494:\d+\)/);
    assert.match(error.stack, /at transitionOwnerCurrentHistory \([^\n]*ravscore-production-part-pipeline\.mjs:49:\d+\)/);
    assert.match(error.stack, /at buildRavScoreProductionPartSeries \([^\n]*ravscore-production-part-pipeline\.mjs:529:\d+\)/);
    } finally { error.stack = actualStack; }
    return true;
  };
  for (const zoneId of ['DK-B01-01', 'DK-B01-02', 'DK-B02-08', 'DK-B02-09',
    'DK-B02-11', 'DK-B03-01', 'DK-B03-02']) {
    const old = fixture({ zoneId, collection: 'dkss_nsbs', run: -12,
      nativeHours: Array.from({ length: 50 }, (_, hour) => hour), target: 49 });
    old.part.onshoreDirectionDeg = 90;
    const part = old.part, zone = { id: zoneId, onshoreDirectionDeg: 90 };
    const identity = dmiExpectedIdentityForPart(part);
    for (const native of Object.values(old.bulk.zones[identity.entityId].hourly)) {
      const bytes = Buffer.from('owner-synthetic-original-' + native.time);
      const source = native.sources.current;
      Object.assign(source, { contentLengthBytes: bytes.length, assetSizeBytes: bytes.length,
        contentSha256: hash(bytes), assetIdentitySha256: hash('owner-synthetic-asset-' + native.time) });
      if (native.time !== at(24)) source.nativeGridSampling = sampling(source);
    }
    const corrected = copy(old.bulk);
    const correctedH24 = corrected.zones[identity.entityId].hourly[at(24)];
    correctedH24['current-u'] += 0.3;
    correctedH24['current-v'] += 0.1;
    correctedH24.sources.current.nativeGridSampling = sampling(correctedH24.sources.current);
    const project = bulk => verifiedIntegratedPartHourly({ point: part.waterPoint,
      hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 50,
        ocean: Object.values(bulk.zones[identity.entityId].hourly).map(row => ({
          step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'],
          provenance: row.sources })) }).hourly }, bulk, identity.entityId, part);
    const oldHourly = project(old.bulk), correctedHourly = project(corrected);
    assert.equal(oldHourly.length, 50);
    assert.equal(inspectDmiForecastGridSampling(oldHourly[24].currentProvenance,
      'current', at(24), identity).status, 'unknown');
    assert.equal(inspectDmiForecastGridSampling(correctedHourly[24].currentProvenance,
      'current', at(24), identity).status, 'coherent');
    for (const [bulk, row] of [[old.bulk, oldHourly[24]], [corrected, correctedHourly[24]]]) {
      assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [bulk] })
        .inspectOriginals({ part, row }).ok, true, 'both complete synthetic native rows pass the existing original inspector');
    }
    const historical = oldHourly.slice(0, 49).map(withWeather);
    const integratedResult = buildIntegratedPartScoreSeries({ part, zone, hourly: historical });
    const candidateResult = buildCandidateGRollbackPartScoreSeries({ part, zone,
      hourly: historical, measuredColdStart: true });
    const integrated = integratedResult.ravScoreState.continuationState;
    const candidate = candidateResult.candidateGState.continuationState;
    assert.equal(integrated.time, at(48));
    assert.equal(candidate.time, at(48));
    assert.equal(integrated.currentMemoryReady, true);
    assert.equal(candidate.transportMemoryReady, true);
    const initialSelection = productionPipeline.selectRavScoreProductionInitialState({ part,
      existingPart: { ravScoreModel: { currentState: integrated } }, targetReferenceAt: at(49) });
    assert.equal(initialSelection.source, 'EXISTING_INTEGRATED');
    const companion = selectCoastalPointCandidateGRollbackContinuation({ partId: part.partId,
      part, initialSelection, pointActivationStatePairs: {},
      privateCandidateGContinuation: candidate, checkpointCandidateGContinuation: null,
      targetReferenceAt: at(49) });
    assert.deepEqual(companion.state, candidate);
    const publicHourly = [withWeather(correctedHourly[49])];
    assertDmiPartHourlyGridSamplingApplicable(publicHourly, identity.entityId, part);
    const preserved = { old: old.bulk, corrected, oldHourly, correctedHourly,
      integratedResult, candidateResult, initialSelection, companion, publicHourly };
    const snapshot = JSON.stringify(preserved);
    const fallbackSource = { source: 'deployed-private-runtime',
      nativeCurrentContexts: [old.bulk], record: { point: part.waterPoint, hourly: oldHourly.slice(0, 49) } };
    const select = (bulk, rows = project(bulk), previous = fallbackSource) => {
      const preferredSource = { source: 'progressive-private-dmi',
        nativeCurrentContexts: [bulk], record: { point: part.waterPoint, hourly: rows } };
      const before = JSON.stringify({ previous, preferredSource });
      const selected = buildNewestValidRavScoreRecoverySources({ fallbackSource: previous,
        preferredSource, protectedPreviousSource: previous,
        productionReferenceAt: at(49), part });
      assert.equal(JSON.stringify({ previous, preferredSource }), before,
        'normal selection must preserve every supplied original and native context');
      return selected;
    };
    const run = recoverySources => buildRavScoreProductionPartSeries({ part, zone,
      initialSelection, previousCandidateGContinuation: companion.state,
      targetReferenceAt: at(49), recoverySources, publicHourly, requireNativeGridSampling: true });

    // Qualified PUBLIC H49 cannot qualify the allowed NSBS H24 retained in OWNER history.
    const unknown = select(corrected, [correctedHourly[49]]);
    assert.throws(() => run(unknown), ownerFailure('unknown'));
    assert.equal(JSON.stringify(preserved), snapshot, 'failed strict OWNER entry leaves original scores/states/data unchanged');

    const selected = select(corrected, correctedHourly);
    const permitted = buildRavScorePermittedCurrentHistory({ part, referenceAt: at(48),
      sourceRecords: selected, requireNativeGridSampling: true });
    assert.equal(permitted.length, 49);
    assert.equal(permitted[0].time, at(0));
    assert.equal(permitted.at(-1).time, at(48));
    assert.equal(permitted[24].currentSpeedMps, correctedHourly[24].currentSpeedMps);
    assert.notEqual(permitted[24].currentSpeedMps, oldHourly[24].currentSpeedMps);
    const originals = originalCurrentDecoderHistory(selected, permitted, part);
    assert.ok(originals, 'the genuine invocation-local same-capture association must exist');
    assert.equal(originals[24].currentSpeedMps, oldHourly[24].currentSpeedMps);
    const result = run(selected);
    assert.equal(result.currentSourceDomainTransition.provedCurrentHours, 49);
    assert.equal(result.currentSourceDomainTransition.unknownCurrentHours, 0);
    assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
    assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
    assert.equal(result.ravScoreState.continuationState.currentMemoryReady, true);
    assert.equal(result.candidateGState.continuationState.transportMemoryReady, true);
    assert.deepEqual(result.scores.map(row => row.time), [at(49)]);
    assert.equal(JSON.stringify(preserved), snapshot, 'successful strict transition preserves original history bytes');

    for (const [label, mutate, status, previous] of [
      ['different-capture', source => { source.contentSha256 = hash('different-owner-original'); },
        'unknown', fallbackSource],
      ['null-native-endpoint', source => { source.nativeGridSampling = null; },
        'unknown', fallbackSource],
      ['contradictory-native-endpoint', source => { source.nativeGridSampling.gridPoint = [8.01, 55]; },
        'contradictory', null],
    ]) {
      const changed = copy(corrected);
      mutate(changed.zones[identity.entityId].hourly[at(24)].sources.current);
      const changedBefore = JSON.stringify(changed);
      const rows = project(changed);
      if (label === 'null-native-endpoint') {
        assert.equal(rows[24].currentProvenance.nativeSteps[0].nativeGridSampling, null);
      }
      if (status === 'contradictory') {
        assert.equal(inspectDmiForecastGridSampling(rows[24].currentProvenance,
          'current', at(24), identity).status, 'contradictory');
      }
      const inputs = select(changed, rows, previous);
      assert.throws(() => run(inputs), ownerFailure(status), label);
      assert.equal(JSON.stringify(changed), changedBefore, label + ' must remain unchanged after refusal');
      assert.equal(JSON.stringify(preserved), snapshot, label + ' must not change protected originals');
    }
  }
});

test('native, interpolated and nearest-edge reproduce unchanged original forecast/source', () => {
  for (const options of [{ target: 0 }, { target: 1 }, { nativeHours: [0], target: 1 }, { pythonTime: 'offset' }]) {
    const f = fixture(options), before = JSON.stringify(f);
    const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
    assert.equal(proof.ok, true);
    assert.deepEqual(proof.source, f.row.sources.current);
    assert.equal(proof.currentUMps, f.row.currentUMps);
    assert.equal(proof.currentVMps, f.row.currentVMps);
    assert.equal(bank.scope, 'PUBLIC_PART_FORECAST_121');
    assert.equal(bank.nativeRows.length, f.row.sources.current.nativeSteps.length);
    assert.equal(JSON.stringify(f), before, 'inputs and original source remain immutable');
    assert.equal(inspect(f).ok, true);
  }
});

test('real Python native timestamp spelling survives exact forecast proof unchanged', () => {
  const f = fixture({ pythonTime: true }), bank = bankFor(f);
  assert.equal(inspect(f).ok, true);
  assert.equal(bank.contexts[0].value.header.generatedAt, '2026-09-01T00:00:00Z');
  assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  assert.ok(bank.nativeRows.every(record => !record.value.time.includes('.000')));
});

test('explicit offsets and microsecond producer generation are accepted without rewriting proof', () => {
  for (const generatedAt of ['2026-09-01T00:00:00.116728Z', '2026-09-01T00:00:00.116728+00:00']) {
    const f = fixture({ pythonTime: true });
    f.bulk.generatedAt = generatedAt;
    // The raw row's spelling can differ from the provenance's same instant.
    for (const native of Object.values(Object.values(f.bulk.zones)[0].hourly)) {
      native.time = native.time.replace('Z', '+00:00');
    }
    const bank = bankFor(f);
    assert.equal(inspect(f).ok, true);
    assert.equal(bank.contexts[0].value.header.generatedAt, generatedAt);
    assert.ok(bank.nativeRows.every(record => record.value.time.endsWith('+00:00')));
    assert.deepEqual(verifyProtectedDmiNativeCurrentProof(bank, f).source, f.row.sources.current);
  }
  const noTimezone = fixture(); noTimezone.bulk.generatedAt = '2026-09-01T00:00:00';
  assert.equal(inspect(noTimezone).code, 'DMI_NATIVE_PROOF_CONTEXT_INVALID');
});

test('valid metadata alone is not actual native U/V proof', () => {
  const f = fixture();
  const expected = dmiExpectedIdentityForPart(f.part);
  assert.ok(verifiedBulkCurrent(f.bulk, f.bulk.zones[expected.entityId], f.part.waterPoint,
    f.row.sources.current, f.row.time, expected));
  f.bulk.zones[expected.entityId].hourly = {};
  assert.deepEqual(inspect(f), { ok: false, code: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' });
  assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING/);
});

test('derived forecast row cannot masquerade as an actual native endpoint', () => {
  const f = fixture({ target: 0 });
  const native = f.bulk.zones[dmiExpectedIdentityForPart(f.part).entityId].hourly[at(0)];
  native.sources.current = copy(f.row.sources.current);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
});

test('wrong native tuple, point, asset, layer and source-only additions fail closed', () => {
  const changes = [
    f => { f.row.currentUMps += 0.01; },
    f => { f.part.waterPoint[0] += 0.01; },
    f => { f.row.sources.current.assetIdentitySha256 = 'd'.repeat(64); },
    f => { f.row.sources.current.verticalLayer = 'depth:2'; },
    f => { f.row.sources.current.unknownField = 'not present on native'; },
  ];
  for (const mutate of changes) {
    const f = fixture(); mutate(f);
    assert.equal(inspect(f).ok, false);
    assert.throws(() => bankFor(f), /DMI_NATIVE_PROOF_/);
  }
});

test('bank hashes bind native payload, source, selected tuple and diagnostic age', () => {
  const f = fixture(), bank = bankFor(f);
  for (const mutate of [
    b => { b.nativeRows[0].value.uMps += 0.01; },
    b => { b.contexts[0].value.zone.samplingPoint[0] += 0.01; },
    b => { b.selections[0].forecastAgeHours += 1; },
    b => { b.selections[0].tupleSha256 = 'd'.repeat(64); },
    b => { b.nativeRows.reverse(); },
  ]) {
    const changed = copy(bank); mutate(changed);
    assert.equal(verifyProtectedDmiNativeCurrentProof(changed, f).ok, false);
    assert.throws(() => validateProtectedDmiNativeCurrentProofs(changed), /DMI_NATIVE_PROOF_/);
  }
});

test('age is diagnostic only; cannot select run, endpoint, tuple or silently mutate proof', () => {
  const f = fixture(), original = copy(f.row.sources.current), originalBank = bankFor(f);
  f.row.sources.current.forecastAgeHours = 999;
  const bank = bankFor(f), proof = verifyProtectedDmiNativeCurrentProof(bank, f);
  assert.equal(proof.ok, true, 'native identity is independent of the age diagnostic');
  assert.equal(proof.source.forecastAgeHours, 999, 'the exact authenticated diagnostic is preserved');
  assert.equal(proof.source.modelRun, original.modelRun);
  assert.deepEqual(proof.source.nativeSteps, original.nativeSteps);
  assert.equal(verifyProtectedDmiNativeCurrentProof(originalBank, f).ok, false,
    'an old bank does not authenticate a changed age value');
  f.row.sources.current.nativeSteps[0].nativeValidTime = at(-1);
  assert.equal(inspect(f).ok, false, 'age cannot manufacture a native endpoint');
});

test('identical donors dedupe; same immutable native identity with conflicting U/V rejects', () => {
  const f = fixture();
  const once = bankFor(f);
  const twice = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [f.bulk, copy(f.bulk)] });
  assert.deepEqual(twice, once);
  const conflicting = copy(f.bulk);
  Object.values(conflicting.zones)[0].hourly[at(0)]['current-u'] += 0.01;
  assert.equal(inspect(f, [f.bulk, conflicting]).code, 'DMI_NATIVE_PROOF_NATIVE_CONFLICT');
});

test('single-donor availability does not claim split endpoint completeness', () => {
  const f = fixture(), before = copy(f.bulk), after = copy(f.bulk);
  delete Object.values(before.zones)[0].hourly[at(3)];
  delete Object.values(after.zones)[0].hourly[at(0)];
  assert.equal(inspect(f, [before]).ok, false);
  assert.equal(inspect(f, [after]).ok, false);
  assert.equal(inspect(f, [before, after]).ok, true,
    'only an explicitly combined authenticated donor set proves both endpoints');
});

test('ten subsequent selected-only generations retain proof without accumulating donors', () => {
  const f = fixture();
  let bank = bankFor(f);
  const original = copy(bank);
  for (let generation = 0; generation < 10; generation++) {
    bank = buildProtectedDmiNativeCurrentProofs({ selections: [f], contexts: [], previousBank: bank });
    assert.deepEqual(bank, original);
    assert.equal(verifyProtectedDmiNativeCurrentProof(bank, f).ok, true);
  }
  const empty = buildProtectedDmiNativeCurrentProofs({ selections: [], previousBank: bank });
  assert.equal(empty.nativeRows.length, 0);
  assert.equal(empty.contexts.length, 0);
});

test('does not select an older donor instead of an already selected newer forecast', () => {
  const older = fixture(), newer = fixture({ run: -6 });
  assert.equal(inspect(newer, [older.bulk]).ok, false);
  const bank = buildProtectedDmiNativeCurrentProofs({ selections: [newer], contexts: [older.bulk, newer.bulk] });
  const proof = verifyProtectedDmiNativeCurrentProof(bank, newer);
  assert.equal(proof.ok, true);
  assert.equal(proof.source.modelRun, newer.row.sources.current.modelRun);
});

test('strict domain, per-record and donor-count bounds apply before persistence', () => {
  const f = fixture();
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: [f, f], contexts: [f.bulk] }),
    /DMI_NATIVE_PROOF_SELECTION_DUPLICATE/);
  assert.throws(() => createProtectedDmiNativeCurrentInspector({ contexts: Array(17).fill(f.bulk) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  f.row.sources.current.padding = 'x'.repeat(PROTECTED_DMI_NATIVE_PROOF_LIMITS.recordBytes + 1);
  assert.equal(inspect(f).code, 'DMI_NATIVE_PROOF_RECORD_BOUND');
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections: Array(PROTECTED_DMI_NATIVE_PROOF_LIMITS.selections + 1) }),
    /DMI_NATIVE_PROOF_INPUT_BOUND/);
  const huge = fixture();
  huge.row.sources.current.nativeSteps = Array(100_000).fill(huge.row.sources.current.nativeSteps[0]);
  assert.equal(inspect(huge).code, 'DMI_NATIVE_PROOF_RECORD_BOUND', 'bound before temporal verifier traverses input');
  const oversizedDonor = fixture();
  const zone = Object.values(oversizedDonor.bulk.zones)[0], one = Object.values(zone.hourly)[0];
  zone.hourly = Object.fromEntries(Array.from({ length: 10_001 }, (_, i) => [String(i), one]));
  assert.equal(inspect(oversizedDonor).code, 'DMI_NATIVE_PROOF_DONOR_BOUND');
});

test('per-PART bank scope rejects the 122nd selected hour without partial output', () => {
  const nativeHours = Array.from({ length: 123 }, (_, index) => index);
  const f = fixture({ nativeHours, target: 0 });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 122,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  const selections = rows.map(row => ({ part: f.part, row }));
  assert.equal(buildProtectedDmiNativeCurrentProofs({ selections: selections.slice(0, 121), contexts: [f.bulk] }).selections.length, 121);
  assert.throws(() => buildProtectedDmiNativeCurrentProofs({ selections, contexts: [f.bulk] }), /DMI_NATIVE_PROOF_DOMAIN_BOUND/);
});

test('inspector caches one PART and safely handles sequential parts', () => {
  const first = fixture(), second = fixture({ partId: 'SECOND-SYNTHETIC-PART' });
  const bulk = { ...first.bulk, zones: { ...first.bulk.zones, ...second.bulk.zones } };
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [bulk] });
  for (const input of [first, first, second, second, first]) assert.equal(inspector.inspect(input).ok, true);
});

if (process.env.RAVRADAR_NATIVE_PROOF_BENCHMARK === '1') test('opt-in dense 673 x 121 inspector CPU measurement', () => {
  const f = fixture({ nativeHours: Array.from({ length: 43 }, (_, i) => i * 3), target: 0, pythonTime: true });
  const rows = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 121,
    ocean: Object.values(Object.values(f.bulk.zones)[0].hourly).map(row => ({
      step: row.time, 'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources,
    })) }).hourly;
  let complete = 0;
  const started = performance.now();
  for (let part = 0; part < 673; part++) {
    // Recreate the index for each part, as a real sequential-PART scan does.
    // Geometry/file decoding/transport are not included in this CPU floor.
    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] });
    for (const row of rows) {
      assert.equal(inspector.inspect({ part: f.part, row }).ok, true);
      complete++;
    }
  }
  assert.equal(complete, 673 * 121);
  console.log(JSON.stringify({ syntheticNativeInspector: { selections: complete,
    elapsedMs: Math.round(performance.now() - started), maximumRssBytes: process.resourceUsage().maxRSS * 1024,
    includesFileDecodeOrRemote: false } }));
});

test('normal private recovery maps the complete 72h bridge without widening public 121', async () => {
  const { readFile } = await import('node:fs/promises');
  const normal = await import('./lib/private-dmi-recovery-record.mjs');
  const store = await import('./lib/dmi-forecast-store.mjs');
  const adapters = await import('./lib/ravscore-production-adapters.mjs');
  const marine = await import('./lib/dmi-marine-run-seam-recovery.mjs');
  const selection = await import('./lib/weather-component-selection.mjs');
  const wave = await import('./lib/dmi-wave-tuple-proof.mjs');
  const continuity = await import('./lib/water-level-continuity.mjs');
  const protectedCurrent = await import('./lib/protected-dmi-current-context.mjs');
  const assembly = await import('./lib/protected-live-current-assembly.mjs');
  const feggesund = await import('./lib/feggesund-wave-proxy.mjs');
  const recovery = await import('./lib/ravscore-recovery-replay.mjs');
  const source = (await readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const fixtureSource = (await readFile(new URL('./test-dmi-protected-tuple-continuity.mjs',
    import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const slice = (text, first, next) => {
    assert.equal(text.split(first).length - 1, 1, first + ' must be the actual unique caller');
    const from = text.indexOf(first), until = text.indexOf(next, from);
    assert.ok(until > from, next);
    return text.slice(from, until);
  };
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const scope = { ...store, ...adapters, ...marine, ...selection, ...wave, ...continuity,
    ...feggesund, createProtectedDmiNativeCurrentInspector,
    verifiedDmiForecastComponentSource: adapters.eligibleDmiForecastComponentSource,
    verifiedDmiNativeComponentSource: adapters.eligibleDmiNativeComponentSource,
    verifiedBulkCurrent: adapters.eligibleBulkCurrent,
    ravScoreNumber: number, num: number, CURRENT_VECTOR_SEMANTICS_VERSION: 3,
    RAVSCORE_PUBLIC_FORECAST_HOURS: 118, ACCEPTED_FORECAST_HOURS: 118,
    SHORT_DMI_WATER_GAP_HOURS: 6, WATER_LEVEL_JUMP_WARN_CM: 35,
    RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS: recovery.RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS };
  // Actual producer functions and the actual two recovery-callsite block.
  // No mapper, sanitizer, selection, original inspector or pipeline is mocked.
  // The exact normal mapper is now import-safe; the orchestration callsite
  // below is still extracted from the real executable without running IO.
  const part = { partId: 'SYNTHETIC-BRIDGE-PART', zoneId: 'DK-B01-01',
    waterPoint: [8, 55], onshoreDirectionDeg: 90 };
  const identity = dmiExpectedIdentityForPart(part), zone = { id: part.zoneId, onshoreDirectionDeg: 90 };
  const feature = { properties: { id: identity.entityId, dataPoint: part.waterPoint } };
  const factory = Function('part', 'identity', 'time',
    slice(fixtureSource, 'const vectorSelection =', 'const options =')
    + slice(fixtureSource, 'const asNative = rows =>', 'const nativeHistorical =')
    + ';return { row, asNative };')(part, identity, at);
  const old = factory.asNative(Array.from({ length: 127 }, (_, i) => factory.row(i - 3)));
  const hash = value => createHash('sha256').update(value).digest('hex');
  const sampling = value => ({ contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
    gridIndexIdentitySha256: hash('bridge-synthetic-grid-index-order'),
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
    gridDefinitionSha256: value.gridDefinitionSha256, gridPoint: [...value.gridPoint],
    fieldSet: [...value.fieldSet], optionalFieldSet: [...value.optionalFieldSet] });
  for (const native of Object.values(old.zones[identity.entityId].hourly)) {
    const bytes = Buffer.from('bridge-synthetic-original-' + native.time);
    const current = native.sources.current;
    Object.assign(current, { contentLengthBytes: bytes.length, assetSizeBytes: bytes.length,
      contentSha256: hash(bytes), assetIdentitySha256: hash('bridge-asset-' + native.time) });
    if (native.time !== at(24)) current.nativeGridSampling = sampling(current);
  }
  const fresh = copy(old), changed = fresh.zones[identity.entityId].hourly[at(24)];
  changed['current-u'] += 0.3;
  changed['current-v'] += 0.1;
  changed.sources.current.nativeGridSampling = sampling(changed.sources.current);
  const sanitize = (record, bulk) => verifiedIntegratedPartHourly(record, bulk, identity.entityId, part);
  const oldDefault = normal.bulkZoneToForecastRecord(feature, old, at(120), null,
    { startAt: at(-3), expectedIdentity: identity });
  assert.equal(oldDefault.hourly.length, 121);
  assert.equal(oldDefault.hourly.at(-1).time, at(117), 'the unchanged default mapper shows the former private gap');
  const oldHourly = sanitize(oldDefault, old);
  const initialHistory = oldHourly.filter(row => row.time >= at(0) && row.time <= at(48));
  assert.equal(initialHistory.length, 49);
  const integrated = buildIntegratedPartScoreSeries({ part, zone, hourly: initialHistory })
    .ravScoreState.continuationState;
  const candidate = buildCandidateGRollbackPartScoreSeries({ part, zone,
    hourly: initialHistory, measuredColdStart: true }).candidateGState.continuationState;
  const initialSelection = productionPipeline.selectRavScoreProductionInitialState({ part,
    existingPart: { ravScoreModel: { currentState: integrated } }, targetReferenceAt: at(120) });
  assert.equal(initialSelection.source, 'EXISTING_INTEGRATED');
  assert.equal(initialSelection.state.time, at(48));
  const companion = selectCoastalPointCandidateGRollbackContinuation({ partId: part.partId, part,
    initialSelection, pointActivationStatePairs: {}, privateCandidateGContinuation: candidate,
    checkpointCandidateGContinuation: null, targetReferenceAt: at(120) });
  assert.deepEqual(companion.state, candidate);
  const snapshots = JSON.stringify({ old, fresh, integrated, candidate, initialSelection, companion });
  const callScope = { ...normal, ...protectedCurrent, ...assembly,
    verifiedIntegratedPartHourly, verifiedBulkCurrent: adapters.eligibleBulkCurrent,
    buildNewestValidRavScoreRecoverySources,
    ravScoreOwnerCurrentHistoryStartAt, ravScoreRecoverySourceStartAt: recovery.ravScoreRecoverySourceStartAt,
    part, zoneId: part.zoneId, initialSelection, generatedAt: at(120), feature,
    archivedRestartInputs: null,
    deployedBulkCache: old, historicalDmiBulkCache: null, bulkCache: fresh,
    bulkId: identity.entityId, partDmiIdentity: identity, liveCurrentPilot: null, componentInputs: {},
    persistedDmiPartRows: new Map([[part.partId, { hourly: oldDefault.hourly }]]),
    protectedSameRunDmiRetentions: { current: { SAME_VALUES: 0, DIFFERENT_VALUES: 0 },
      wave: { SAME_VALUES: 0, DIFFERENT_VALUES: 0 } } };
  const actualRecovery = Function(...Object.keys(callScope),
    slice(source, '      const replayStartAt = archivedRestartInputs !== null ? generatedAt',
      '      let productionSeries;')
    + ';return { replayStartAt, deployedRecoverySource, progressiveRecoverySource, recoverySources };')(
    ...Object.values(callScope));
  assert.equal(actualRecovery.replayStartAt, at(-3));
  for (const input of [actualRecovery.deployedRecoverySource, actualRecovery.progressiveRecoverySource]) {
    assert.equal(input.record.hourly.length, 127, '124 private target rows plus three existing scalar support hours');
    assert.equal(input.record.hourly.at(-1).time, at(123));
    for (const hour of [118, 119]) {
      const row = input.record.hourly.find(value => value.time === at(hour));
      assert.ok(Number.isFinite(row.currentUMps), 'both former missing bridge hours use the actual mapper');
      assert.ok(Number.isFinite(row.waterLevelTrendCm3h), 'private tail retains the ordinary T+3 counterpart');
    }
  }
  assert.equal(actualRecovery.deployedRecoverySource.nativeCurrentContexts[0], old);
  assert.equal(actualRecovery.progressiveRecoverySource.nativeCurrentContexts[0], fresh);
  const permitted = buildRavScorePermittedCurrentHistory({ part, referenceAt: at(48),
    sourceRecords: actualRecovery.recoverySources, requireNativeGridSampling: true });
  const originalHistory = originalCurrentDecoderHistory(actualRecovery.recoverySources, permitted, part);
  assert.ok(originalHistory, 'same captured originals remain associated through the actual priority caller');
  assert.equal(originalHistory[24].currentSpeedMps, oldHourly.find(row => row.time === at(24)).currentSpeedMps);
  const publicRecord = normal.bulkZoneToForecastRecord(feature, fresh, at(120), null,
    { startAt: at(120), expectedIdentity: identity });
  assert.equal(publicRecord.hourly.length, 121);
  const publicHourly = sanitize(publicRecord, fresh).slice(0, 1);
  const result = buildRavScoreProductionPartSeries({ part, zone, initialSelection,
    previousCandidateGContinuation: companion.state, targetReferenceAt: at(120),
    recoverySources: actualRecovery.recoverySources, publicHourly, requireNativeGridSampling: true });
  for (const hour of [118, 119]) assert.equal(result.recovery.hourly.find(row => row.time === at(hour))
    ?.currentProvenance?.status, 'verified');
  assert.deepEqual(result.scores.map(row => row.time), [at(120)]);
  assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
  assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
  assert.equal(JSON.stringify({ old, fresh, integrated, candidate, initialSelection, companion }), snapshots);
  assert.deepEqual(normal.buildPrivateDmiRecoveryRecord(feature, fresh, at(120),
    { startAt: at(120), expectedIdentity: identity }), publicRecord, 'ordinary 121 stays byte-equivalent');
  for (const startAt of [at(-4), at(121), 'invalid', at(-3).replace('.000Z', 'Z')]) {
    assert.throws(() => normal.buildPrivateDmiRecoveryRecord(feature, fresh, at(120),
      { startAt, expectedIdentity: identity }), /DMI_PRIVATE_RECOVERY_WINDOW_INVALID/);
  }
  assert.equal(JSON.stringify({ old, fresh, integrated, candidate, initialSelection, companion }), snapshots,
    'range refusals cannot mutate original donors or the two original states');
});

// Reconstruction verifies actual OLD native values; forecast tuples below are
// unchanged projection witnesses, never an inverse source for native numbers.
const legacyOriginalCanonical = value => JSON.stringify(value, (_key, item) =>
  item !== null && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const legacyOriginalHash = value => 'sha256:' + createHash('sha256')
  .update(legacyOriginalCanonical(value)).digest('hex');
async function legacyOriginalFixture({ twoRoles = false, nativeHours = [0, 3],
  target = 1, everyNativeWitness = false, productionReferenceAt = at(4), zoneId = 'DK-B05-17', nativeNull = false,
  collection = 'dkss_idw', adminWaterPoint = null } = {}) {
  const { ravScoreModelBinding } = await import('../js/core/ravscore-model-contract.js');
  const { canonicalSavedDmiOriginalCapture } = await import('./lib/saved-dmi-original-capture.mjs');
  const roles = twoRoles ? ['deployedBulk', 'candidate'] : ['deployedBulk'];
  const originals = roles.map((documentRole, index) => {
    const value = fixture({ partId: 'LEGACY-RECONSTRUCTION', zoneId,
      collection: index ? 'dkss_nsbs' : collection, run: -12 + index * 6, nativeHours, target });
    value.bulk.generatedAt = at(index);
    for (const raw of Object.values(Object.values(value.bulk.zones)[0].hourly)) {
      const bytes = Buffer.from('synthetic-independent-capture-' + documentRole + raw.time);
      Object.assign(raw.sources.current, { assetSizeBytes: bytes.length,
        contentLengthBytes: bytes.length,
        contentSha256: createHash('sha256').update(bytes).digest('hex') });
      if (nativeNull) raw.sources.current.nativeGridSampling = null;
    }
    value.row = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(target), hours: 1,
      ocean: Object.values(Object.values(value.bulk.zones)[0].hourly).map(raw => ({
        step: raw.time, 'current-u': raw['current-u'], 'current-v': raw['current-v'], provenance: raw.sources,
      })) }).hourly[0];
    return { ...value, documentRole };
  });
  const part = originals[0].part;
  if (adminWaterPoint) part.waterPoint = [...adminWaterPoint];
  const identity = dmiExpectedIdentityForPart(part);
  const context = value => ({ documentRole: value.documentRole,
    header: Object.fromEntries(['generatedAt', 'currentVectorSemanticsVersion',
      'currentVectorSelection', 'currentMaxDistanceKm', 'timeStrideHours']
      .filter(key => Object.hasOwn(value.bulk, key)).map(key => [key, value.bulk[key]])),
    zones: [{ partId: part.partId, zone: Object.fromEntries(Object.keys(identity)
      .map(key => [key, copy(value.bulk.zones[identity.entityId][key])])) }] });
  const witnesses = originals.flatMap(value => (everyNativeWitness ? nativeHours.map(hour =>
    buildDmiForecastHourly({ generatedAt: at(0), startAt: at(hour), hours: 1,
      ocean: Object.values(Object.values(value.bulk.zones)[0].hourly).map(raw => ({
        step: raw.time, 'current-u': raw['current-u'], 'current-v': raw['current-v'], provenance: raw.sources,
      })) }).hourly[0]) : [value.row]).map(selected => {
    const row = { time: selected.time, currentUMps: selected.currentUMps,
      currentVMps: selected.currentVMps, sources: { current: copy(selected.sources.current) } };
    const fields = { partId: part.partId, documentRole: value.documentRole, row };
    return { witnessId: legacyOriginalHash(fields), ...fields,
      sourceSha256: legacyOriginalHash(row.sources.current),
      tupleSha256: legacyOriginalHash([row.currentUMps, row.currentVMps]) };
  }));
  const reconstructionRequests = [], rows = {};
  for (const [index, value] of originals.entries()) {
    for (const raw of Object.values(value.bulk.zones[identity.entityId].hourly)) {
      const inner = { zone: { id: identity.entityId, lat: part.waterPoint[1],
        lon: part.waterPoint[0], coastType: 'limfjord' }, expectedSource: copy(raw.sources.current),
        capture: canonicalSavedDmiOriginalCapture(raw.sources.current),
        processingSignature: 'parser:20|params:4|grid:9|eccodes-api:2.48.2|eccodes-binding:2.48.0|zones:' + 'a'.repeat(16) };
      const fields = { partId: part.partId, entityId: identity.entityId,
        documentRole: value.documentRole, nativeValidTime: raw.time,
        reconstructionRequest: inner, processingEvidence: { kind: 'RUN_PROCESSED_STEP',
          path: ['runs', raw.sources.current.collection, 'processedSteps', raw.time],
          sha256: legacyOriginalHash({ capture: inner.capture, processingSignature: inner.processingSignature }) } };
      const requestId = legacyOriginalHash(fields);
      const refs = witnesses.filter(witness => witness.documentRole === value.documentRole
        && witness.row.sources.current.nativeSteps.some(step => step.itemId === raw.sources.current.itemId
          && step.assetIdentitySha256 === raw.sources.current.assetIdentitySha256
          && Date.parse(step.nativeValidTime) === Date.parse(raw.time))).map(witness => witness.witnessId);
      reconstructionRequests.push({ requestId, ...fields, projectionWitnessRefs: refs });
      rows[requestId] = copy(raw);
    }
  }
  const requests = { schemaVersion: 1, kind: 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS',
    productionReferenceAt, modelBinding: { ...ravScoreModelBinding() },
    historyDemandSha256: 'sha256:' + 'd'.repeat(64), registrySha256: 'sha256:' + 'e'.repeat(64),
    sourceHashes: { zones: 'sha256:' + '1'.repeat(64), deployedBulk: 'sha256:' + '2'.repeat(64),
      forecast: 'sha256:' + '3'.repeat(64), candidate: twoRoles ? 'sha256:' + '4'.repeat(64) : null, active: null },
    sourcePaths: { zones: 'data/zones.geojson', deployedBulk: '.cache/deployed-dmi-bulk-cache.json',
      forecast: 'data/live/dmi-forecast-cache.json', candidate: '.cache/dmi-candidate-progress.json', active: '.cache/dmi-active-complete.json' },
    documentContexts: originals.map(context), projectionWitnesses: witnesses, reconstructionRequests };
  const requestBytes = Buffer.from(JSON.stringify(requests) + '\n');
  const requestsSha256 = 'sha256:' + createHash('sha256').update(requestBytes).digest('hex');
  const document = { ...context(originals[0]).header,
    zones: { [identity.entityId]: { ...context(originals[0]).zones[0].zone, hourly: rows } } };
  const reconstruction = { schemaVersion: 1, kind: 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION', requestsSha256, document };
  const expected = Object.fromEntries(['productionReferenceAt', 'modelBinding', 'historyDemandSha256',
    'registrySha256', 'sourceHashes'].map(key => [key, copy(requests[key])]));
  expected.requestsSha256 = requestsSha256;
  return { requests, requestsSha256, reconstruction, parts: [part], expected, requestBytes, originals };
}

test('normal original-wire reconstruction receiver preserves verbatim wire context and full admin point', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  for (const collection of ['dkss_lf', 'dkss_nsbs']) {
    const f = await legacyOriginalFixture({ collection, adminWaterPoint: [8.00000004, 55.00000004] });
    const before = JSON.stringify(f);
    const donor = verifyDmiLegacyCurrentOriginalReconstruction(f);
    assert.equal(donor, f.reconstruction.document);
    assert.deepEqual(Object.values(donor.zones)[0].samplingPoint, [8, 55]);
    assert.deepEqual(f.parts[0].waterPoint, [8.00000004, 55.00000004]);
    assert.equal(JSON.stringify(f), before);
    const wrong = copy(f.reconstruction);
    Object.values(wrong.document.zones)[0].samplingPoint = [...f.parts[0].waterPoint];
    assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction({ ...f, reconstruction: wrong }),
      /DMI_LEGACY_CURRENT_DOCUMENT_ROW_INVALID/, 'An admissible full point may not replace the actual wire context');
  }
});

test('legacy current reconstruction preserves the own UNKNOWN null shape without a sampling receipt', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  const f = await legacyOriginalFixture({ nativeNull: true });
  const before = JSON.stringify(f);
  for (const request of f.requests.reconstructionRequests) {
    assert.ok(Object.hasOwn(request.reconstructionRequest.expectedSource, 'nativeGridSampling'));
    assert.equal(request.reconstructionRequest.expectedSource.nativeGridSampling, null);
  }
  assert.equal(verifyDmiLegacyCurrentOriginalReconstruction(f), f.reconstruction.document);
  assert.equal(JSON.stringify(f), before, 'verification must not normalise any original null marker');
  const changed = copy(f.reconstruction);
  delete Object.values(Object.values(changed.document.zones)[0].hourly)[0].sources.current.nativeGridSampling;
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction({ ...f, reconstruction: changed }),
    /DMI_LEGACY_CURRENT_DOCUMENT_ROW_INVALID/, 'absence cannot replace this own original null');
});

test('legacy current reconstruction preserves complete native originals and exact old projection', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  const f = await legacyOriginalFixture();
  const before = JSON.stringify(f);
  assert.equal(verifyDmiLegacyCurrentOriginalReconstruction(f), f.reconstruction.document);
  assert.equal(JSON.stringify(f), before, 'verification cannot rewrite a source, number or witness');
  for (const mutate of [
    value => { Object.values(Object.values(value.reconstruction.document.zones)[0].hourly)[0]['current-u'] += 0.001; },
    value => { Object.values(Object.values(value.reconstruction.document.zones)[0].hourly)[0].sources.current.nativeGridSampling = {}; },
    value => { Object.values(Object.values(value.reconstruction.document.zones)[0].hourly)[0]['sea-mean-deviation'] = 0; },
    value => { Object.values(Object.values(value.reconstruction.document.zones)[0].hourly)[0]['current-v'] = '0.2'; },
    value => { value.reconstruction.document.zones.EXTRA = copy(Object.values(value.reconstruction.document.zones)[0]); },
    value => { delete Object.values(value.reconstruction.document.zones)[0].hourly[value.requests.reconstructionRequests[0].requestId]; },
    value => { value.requests.reconstructionRequests.push(copy(value.requests.reconstructionRequests[0])); },
    value => { value.requests.projectionWitnesses[0].row.currentUMps += 0.000001; },
    value => { value.expected.registrySha256 = 'sha256:' + 'f'.repeat(64); },
    value => { value.expected.sourceHashes.candidate = 'sha256:' + 'f'.repeat(64); },
    value => { value.parts[0].waterPoint[0] += 0.01; },
    value => { value.reconstruction.requestsSha256 = 'sha256:' + 'f'.repeat(64); },
  ]) {
    const invalid = copy(f); mutate(invalid);
    assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(invalid), /DMI_LEGACY_CURRENT_/);
  }
});

test('legacy current reconstruction retains two captures at the same PART hour through normal mapper', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  const { bulkZoneToForecastRecord } = await import('./lib/private-dmi-recovery-record.mjs');
  const f = await legacyOriginalFixture({ twoRoles: true }), part = f.parts[0];
  const donor = verifyDmiLegacyCurrentOriginalReconstruction(f), identity = dmiExpectedIdentityForPart(part);
  assert.equal(Object.keys(donor.zones[identity.entityId].hourly).length, 4);
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [donor] });
  for (const witness of f.requests.projectionWitnesses) assert.equal(inspector.inspectOriginals({ part, row: witness.row }).ok, true);
  const mapped = bulkZoneToForecastRecord({ properties: { id: identity.entityId, dataPoint: part.waterPoint } },
    donor, at(0), null, { startAt: at(1), expectedIdentity: identity, materializeMissingHorizon: true });
  assert.equal(mapped.hourly[0].time, at(1));
  assert.equal(mapped.hourly[0].currentUMps, null,
    'Known isolated-mapper limitation: last-before/first-after can be different model series; not fabricated coverage');
  assert.equal(Object.keys(donor.zones[identity.entityId].hourly).length, 4, 'normal mapper does not erase an alternate original');
  const wrong = copy(f); wrong.requests.documentContexts[1].header.timeStrideHours = 6;
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(wrong), /DMI_LEGACY_CURRENT_CONTEXT_CONTRACT_COLLISION/);
});

test('legacy current fixed reader is bounded, readonly and refuses orphan or stale output', async () => {
  const { readDmiLegacyCurrentOriginals } = await import('./lib/dmi-legacy-current-originals.mjs');
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-legacy-current-verifier-'));
  const requestPath = path.join(root, '.cache/dmi-legacy-current-original-requests.json');
  const outputPath = path.join(root, '.cache/dmi-legacy-current-originals.json');
  const f = await legacyOriginalFixture(), options = { repositoryRoot: root, parts: f.parts, expected: f.expected };
  try {
    await fs.mkdir(path.dirname(requestPath));
    assert.equal(await readDmiLegacyCurrentOriginals({ ...options, required: false }), null);
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, required: true }), /DMI_LEGACY_CURRENT_REQUESTS_REQUIRED/);
    await fs.writeFile(outputPath, JSON.stringify(f.reconstruction));
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, required: false }), /DMI_LEGACY_CURRENT_OUTPUT_WITHOUT_REQUESTS/);
    await fs.writeFile(requestPath, f.requestBytes);
    assert.deepEqual(await readDmiLegacyCurrentOriginals({ ...options, required: true }), f.reconstruction.document);
    assert.deepEqual(await fs.readFile(requestPath), f.requestBytes);
    assert.equal(await fs.readFile(outputPath, 'utf8'), JSON.stringify(f.reconstruction));
    await fs.appendFile(requestPath, ' ');
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, required: true }), /DMI_LEGACY_CURRENT_REQUESTS_HASH_MISMATCH/);
    await fs.writeFile(requestPath, f.requestBytes);
    await fs.writeFile(outputPath, JSON.stringify(f.reconstruction).replace('{', '{"schemaVersion":1,'));
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, required: true }), /DMI_LEGACY_CURRENT_DUPLICATE_KEY/);
    const empty = copy(f.requests);
    empty.documentContexts = []; empty.projectionWitnesses = []; empty.reconstructionRequests = [];
    const emptyBytes = Buffer.from(JSON.stringify(empty) + '\n');
    const emptyExpected = { ...f.expected,
      requestsSha256: 'sha256:' + createHash('sha256').update(emptyBytes).digest('hex') };
    await fs.writeFile(requestPath, emptyBytes); await fs.unlink(outputPath);
    assert.equal(await readDmiLegacyCurrentOriginals({ ...options, expected: emptyExpected, required: true }), null,
      'an empty request set is explicitly NO OP, never successful decoding');
    await fs.writeFile(outputPath, JSON.stringify(f.reconstruction));
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, expected: emptyExpected, required: true }),
      /DMI_LEGACY_CURRENT_EMPTY_REQUESTS_NOT_DECODED/);
    await fs.writeFile(requestPath, f.requestBytes);
    await fs.link(requestPath, path.join(root, 'own-linked-request.json'));
    await assert.rejects(readDmiLegacyCurrentOriginals({ ...options, required: true }), /DMI_LEGACY_CURRENT_INVALID_FILE/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('legacy current normal recovery caller preserves both OLD series and proves strict OWNER transition', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  const { buildPartDmiForecastWithProtectedRetention, buildPrivateDmiRecoveryRecord } =
    await import('./lib/private-dmi-recovery-record.mjs');
  const { verifiedProtectedDmiPartHourly } = await import('./lib/protected-dmi-current-context.mjs');
  const f = await legacyOriginalFixture({ twoRoles: true,
    nativeHours: Array.from({ length: 50 }, (_, i) => i), target: 49,
    everyNativeWitness: true, productionReferenceAt: at(49), zoneId: 'DK-B01-02' });
  const part = f.parts[0]; part.onshoreDirectionDeg = 90;
  const identity = dmiExpectedIdentityForPart(part), zone = { id: part.zoneId, onshoreDirectionDeg: 90 };
  const donor = verifyDmiLegacyCurrentOriginalReconstruction(f);
  const feature = { properties: { id: identity.entityId, dataPoint: part.waterPoint } };
  const project = bulk => verifiedIntegratedPartHourly({ point: part.waterPoint,
    hourly: buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 50,
      ocean: Object.values(bulk.zones[identity.entityId].hourly).map(row => ({ step: row.time,
        'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })) }).hourly },
    bulk, identity.entityId, part);
  const byRole = f.originals.map(value => project(value.bulk));
  const oldHourly = Array.from({ length: 50 }, (_, i) => copy(byRole[i < 25 ? 0 : 1][i]));
  const fresh = { ...copy(f.originals[0].bulk), zones: { [identity.entityId]: { ...identity, hourly: {} } } };
  for (let i = 0; i < 50; i++) {
    const raw = copy(f.originals[i < 25 ? 0 : 1].bulk.zones[identity.entityId].hourly[at(i)]);
    raw['current-u'] += 0.3; raw['current-v'] += 0.1;
    raw.sources.current.nativeGridSampling = { contractId: 'dmi-native-grid-sampling-v1',
      elementIndex: 71, gridIndexIdentitySha256: '5'.repeat(64),
      coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: raw.sources.current.gridDefinitionSha256,
      gridPoint: [...raw.sources.current.gridPoint], fieldSet: [...raw.sources.current.fieldSet], optionalFieldSet: [] };
    fresh.zones[identity.entityId].hourly[raw.time] = raw;
  }
  const correctedHourly = project(fresh);
  const weather = row => ({ ...row, currentCoastNormalSpeedMps: row.currentCoastNormalSpeedMps ?? row.currentUMps,
    windSpeedMps: 8, windDirectionDeg: 270, waveHeightM: 1.2, wavePeriodS: 6,
    waveDirectionDeg: 90, waveProvenance: { status: 'verified' }, waterLevelCm: 0, waterLevelTrendCm3h: 0 });
  // Reproduce the OLD normal replay projection, not a hand-set coast-normal
  // approximation. The original state must match this actual numeric path.
  const historical = buildRavScorePermittedCurrentHistory({ part, referenceAt: at(48),
    sourceRecords: [{ source: 'deployed-private-runtime', record: { point: part.waterPoint, hourly: oldHourly } }],
    requireNativeGridSampling: false }).map(weather);
  const integrated = buildIntegratedPartScoreSeries({ part, zone, hourly: historical }).ravScoreState.continuationState;
  const candidate = buildCandidateGRollbackPartScoreSeries({ part, zone,
    hourly: historical, measuredColdStart: true }).candidateGState.continuationState;
  const initialSelection = productionPipeline.selectRavScoreProductionInitialState({ part,
    existingPart: { ravScoreModel: { currentState: integrated } }, targetReferenceAt: at(49) });
  const companion = selectCoastalPointCandidateGRollbackContinuation({ partId: part.partId, part,
    initialSelection, pointActivationStatePairs: {}, privateCandidateGContinuation: candidate,
    checkpointCandidateGContinuation: null, targetReferenceAt: at(49) });
  const before = JSON.stringify({ f, donor, fresh, oldHourly, integrated, candidate });
  const publicRecord = buildPartDmiForecastWithProtectedRetention(feature, fresh, null, at(49), {
    startAt: at(0), expectedIdentity: identity, persistedHourly: oldHourly,
    historicalBulkCache: donor, currentDecoderTransitionPart: part });
  assert.equal(publicRecord.hourly[24].currentUMps, correctedHourly[24].currentUMps);
  assert.equal(publicRecord.hourly[25].currentUMps, correctedHourly[25].currentUMps);
  const deployed = buildPrivateDmiRecoveryRecord(feature, null, at(49), {
    startAt: at(0), expectedIdentity: identity, persistedHourly: oldHourly,
    historicalBulkCache: donor, protectPreviousDmi: true });
  for (let i = 0; i < 49; i++) assert.deepEqual(deployed.hourly[i].sources.current, oldHourly[i].sources.current,
    'actual protected-replay caller retains its selected OLD model at ' + i);
  const progressive = buildPrivateDmiRecoveryRecord(feature, fresh, at(49), {
    startAt: at(0), expectedIdentity: identity });
  const fallbackSource = { source: 'deployed-private-runtime', nativeCurrentContexts: [donor],
    record: { ...deployed, hourly: verifiedProtectedDmiPartHourly(deployed, [donor], identity.entityId,
      part, { requireNativeGridSampling: false }) } };
  const preferredSource = { source: 'progressive-private-dmi', nativeCurrentContexts: [fresh],
    record: { ...progressive, hourly: verifiedIntegratedPartHourly(progressive, fresh,
      identity.entityId, part, { requireNativeGridSampling: false }) } };
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource, preferredSource,
    protectedPreviousSource: fallbackSource, productionReferenceAt: at(49), part });
  const result = buildRavScoreProductionPartSeries({ part, zone, initialSelection,
    previousCandidateGContinuation: companion.state, targetReferenceAt: at(49),
    recoverySources, publicHourly: [weather(correctedHourly[49])], requireNativeGridSampling: true });
  assert.equal(result.currentSourceDomainTransition.provedCurrentHours, 49);
  assert.equal(result.currentSourceDomainTransition.unknownCurrentHours, 0);
  assert.deepEqual(result.currentSourceDomainTransition.originalIntegratedState, integrated);
  assert.deepEqual(result.currentSourceDomainTransition.originalCandidateGState, candidate);
  assert.equal(JSON.stringify({ f, donor, fresh, oldHourly, integrated, candidate }), before);
});

test('legacy current fixed reader proves native fd closure and preserves the first raw failure', async () => {
  const fs = await import('node:fs/promises'), native = await import('node:fs');
  const os = await import('node:os'), path = await import('node:path');
  const text = await fs.readFile(new URL('./lib/dmi-legacy-current-originals.mjs', import.meta.url), 'utf8');
  const first = 'async function closeOwnedLegacyCurrentReader(row, primary) {';
  const next = '\nasync function readFixed(root, relative) {';
  assert.equal(text.split(first).length - 1, 1); assert.equal(text.split(next).length - 1, 1);
  const helper = text.slice(text.indexOf(first), text.indexOf(next, text.indexOf(first)));
  const retained = new Map();
  const close = new Function('fstatSync', 'uncertainReaders', 'fail', helper + ';return closeOwnedLegacyCurrentReader;')(
    native.fstatSync, retained, code => { throw new Error('DMI_LEGACY_CURRENT_' + code); });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-legacy-close-'));
  const file = path.join(root, 'own.txt'); await fs.writeFile(file, 'synthetic');
  try {
    for (const mode of ['normal', 'noop', 'close-then-throw']) {
      const handle = await fs.open(file, 'r'), actualClose = handle.close.bind(handle);
      const row = { handle, fd: handle.fd, closeAttempted: false, closed: false };
      retained.set(handle, row);
      const firstFailure = new Error('SYNTHETIC_FIRST_FAILURE');
      if (mode === 'noop') handle.close = async () => {};
      if (mode === 'close-then-throw') handle.close = async () => { await actualClose(); throw new Error('SYNTHETIC_LATE_CLOSE'); };
      try {
        const failure = await close(row, mode === 'normal' ? null : firstFailure);
        assert.equal(failure, mode === 'normal' ? null : firstFailure);
        assert.equal(row.closed, mode !== 'noop');
        assert.equal(retained.has(handle), mode === 'noop');
        if (mode === 'noop') assert.doesNotThrow(() => native.fstatSync(row.fd));
        else assert.throws(() => native.fstatSync(row.fd), error => error.code === 'EBADF');
        await assert.rejects(close(row, failure), /DMI_LEGACY_CURRENT_CLOSE_REPEATED/);
      } finally { if (mode === 'noop') await actualClose(); retained.delete(handle); }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('legacy current private request counts allow 124 target hours but do not widen PUBLIC_121', async () => {
  const { verifyDmiLegacyCurrentOriginalReconstruction } = await import('./lib/dmi-legacy-current-originals.mjs');
  const f = await legacyOriginalFixture();
  assert.equal(PROTECTED_DMI_NATIVE_PROOF_LIMITS.hoursPerPart, 121);
  assert.equal(PROTECTED_DMI_NATIVE_PROOF_LIMITS.selections, 673 * 121);
  assert.equal(PROTECTED_DMI_NATIVE_PROOF_LIMITS.nativeRows, 2 * 673 * 121);
  // Sparse synthetic invalid records distinguish the count boundary from real
  // row admission without constructing or claiming a national decoded donor.
  const witnesses = count => ({ ...f, requests: { ...f.requests,
    projectionWitnesses: Array(count).fill(null) } });
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(witnesses(673 * 124)),
    /DMI_LEGACY_CURRENT_WITNESS_INVALID/);
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(witnesses(673 * 124 + 1)),
    /DMI_LEGACY_CURRENT_REQUEST_BOUND/);
  const natives = count => ({ ...f, requests: { ...f.requests,
    reconstructionRequests: Array(count).fill(null) } });
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(natives(2 * 673 * 124)),
    /DMI_LEGACY_CURRENT_REQUEST_INVALID/);
  assert.throws(() => verifyDmiLegacyCurrentOriginalReconstruction(natives(2 * 673 * 124 + 1)),
    /DMI_LEGACY_CURRENT_REQUEST_BOUND/);
});

test('legacy current request CLI proves hash-reader native closure before publishing', async () => {
  const fs = await import('node:fs/promises'), native = await import('node:fs');
  const os = await import('node:os'), path = await import('node:path');
  const text = await fs.readFile(new URL('./plan-dmi-legacy-current-originals.mjs', import.meta.url), 'utf8');
  const first = 'async function closeOwnedLegacyHashReader(row, primary) {';
  const next = '\nasync function hashLegacyFixedFile(relative, optional = false) {';
  assert.equal(text.split(first).length - 1, 1); assert.equal(text.split(next).length - 1, 1);
  const helper = text.slice(text.indexOf(first), text.indexOf(next, text.indexOf(first)));
  const retained = new Map();
  const close = new Function('fstatSync', 'ownedLegacyHashReaders', 'refuse',
    helper + ';return closeOwnedLegacyHashReader;')(native.fstatSync, retained,
    code => { throw new Error('RAVSCORE_CURRENT_HISTORY_DEMAND_' + code); });
  assert.match(text, /await closeOwnedLegacyHashReader\(reader, primary\)/,
    'normal file hashing must await the physically checked close helper');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-legacy-request-close-'));
  const file = path.join(root, 'own.txt'); await fs.writeFile(file, 'synthetic');
  try {
    for (const mode of ['normal', 'noop', 'read-error-and-noop', 'close-then-error']) {
      const handle = await fs.open(file, 'r'), actualClose = handle.close.bind(handle);
      const row = { handle, fd: handle.fd, closeAttempted: false, closed: false };
      const firstFailure = mode === 'read-error-and-noop' ? new Error('SYNTHETIC_FIRST_READ_FAILURE') : null;
      const closeFailure = new Error('SYNTHETIC_CLOSE_FAILURE');
      retained.set(handle, row);
      if (mode.includes('noop')) handle.close = async () => {};
      if (mode === 'close-then-error') handle.close = async () => { await actualClose(); throw closeFailure; };
      try {
        const failure = await close(row, firstFailure);
        const physicallyClosed = mode === 'normal' || mode === 'close-then-error';
        assert.equal(row.closed, physicallyClosed);
        assert.equal(retained.has(handle), !physicallyClosed);
        if (firstFailure) assert.equal(failure, firstFailure, 'exact first read failure survives uncertain close');
        else if (mode === 'noop') assert.match(failure.message, /LEGACY_HASH_READER_CLOSE_UNPROVED/);
        else assert.equal(failure, mode === 'normal' ? null : closeFailure);
        if (physicallyClosed) assert.throws(() => native.fstatSync(row.fd), error => error.code === 'EBADF');
        else assert.doesNotThrow(() => native.fstatSync(row.fd));
        await assert.rejects(close(row, failure), /LEGACY_HASH_READER_CLOSE_REPEATED/);
      } finally { if (mode.includes('noop')) await actualClose(); retained.delete(handle); }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('inspector previous bank: normal coherent native121 survives serialization without its old document', () => {
  // Existing normal fixture/projection/bank contracts on synthetic originals.
  // JSON readback is not authenticated B/GCM, a saved-bundle caller or GRIB.
  const f = fixture({ nativeHours: Array.from({ length: 43 }, (_, index) => index * 3), target: 0 });
  const identity = dmiExpectedIdentityForPart(f.part), own = f.bulk.zones[identity.entityId];
  for (const native of Object.values(own.hourly)) {
    const source = native.sources.current;
    source.nativeGridSampling = {
      contractId: 'dmi-native-grid-sampling-v1', elementIndex: 71,
      gridIndexIdentitySha256: createHash('sha256').update('synthetic-previous-bank-native121').digest('hex'),
      coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1',
      gridDefinitionSha256: source.gridDefinitionSha256, gridPoint: [...source.gridPoint],
      fieldSet: [...source.fieldSet], optionalFieldSet: [...source.optionalFieldSet],
    };
  }
  const hourly = buildDmiForecastHourly({ generatedAt: at(0), startAt: at(0), hours: 121,
    ocean: Object.values(own.hourly).map(native => ({ step: native.time,
      'current-u': native['current-u'], 'current-v': native['current-v'], provenance: native.sources })) }).hourly;
  const selections = hourly.map(row => ({ part: f.part, row }));
  assert.equal(selections.length, 121);
  assert.deepEqual(hourly[1].sources.current.nativeSteps.map(step => step.nativeValidTime), [at(0), at(3)]);
  const originalBefore = JSON.stringify(f.bulk);
  const bank = buildProtectedDmiNativeCurrentProofs({ selections, contexts: [f.bulk] });
  const serialized = JSON.stringify(bank), reloaded = JSON.parse(serialized);
  assert.deepEqual(reloaded, bank);
  // No original document with an endpoint remains among the inspector inputs.
  const current = copy(f.bulk); current.zones[identity.entityId].hourly = {};
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [current] }).inspect(selections[1]).code,
    'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING');
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [current], previousBank: reloaded });
  for (const selection of selections) {
    assert.equal(inspector.inspect(selection).ok, true);
    const actual = inspector.inspectOriginals(selection);
    assert.equal(actual.ok, true, actual.code);
    assert.equal(actual.nativeRows.length, selection.row.sources.current.nativeSteps.length);
    assert(actual.nativeRows.every(native => native.source.nativeGridSampling.coordinateInterpretation
      === 'dmi-dkss-grib1-header-endpoints-v1'));
    const endpoints = inspector.inspectEndpointOriginals(selection);
    assert.equal(endpoints.ok, true, endpoints.code);
    assert(endpoints.endpoints.every(Boolean));
  }
  assert.equal(JSON.stringify(reloaded), serialized, 'inspector preserves caller bank bytes');
  assert.equal(JSON.stringify(f.bulk), originalBefore, 'normal bank/proof path preserves actual original inputs');
  assert.deepEqual(current.zones[identity.entityId].hourly, {});
});

test('inspector previous bank: detached snapshot does not cache PASS or accept a changed bank on new construction', () => {
  const f = fixture(), next = fixture({ target: 2 });
  const bank = JSON.parse(JSON.stringify(bankFor(f))), originalBank = JSON.stringify(bank);
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [], previousBank: bank });
  assert.equal(JSON.stringify(bank), originalBank);
  assert.equal(inspector.inspect(f).ok, true);
  assert.equal(inspector.inspect(next).ok, true, 'every distinct selection is genuinely projected from the retained endpoints');
  const detached = inspector.inspectOriginals(f);
  detached.nativeRows[0].uMps += 1;
  bank.nativeRows[0].value.uMps += 1;
  bank.contexts[0].value.header.timeStrideHours = 24;
  bank.selections[0].sourceSha256 = 'd'.repeat(64);
  assert.equal(inspector.inspectOriginals(f).ok, true, 'already validated private snapshot is independent of caller/output mutation');
  const changedTuple = { part: f.part, row: { ...f.row, currentUMps: f.row.currentUMps + 0.01 } };
  assert.deepEqual(inspector.inspect(changedTuple), { ok: false, code: 'DMI_NATIVE_PROOF_PROJECTION_MISMATCH' });
  assert.throws(() => createProtectedDmiNativeCurrentInspector({ previousBank: bank }), /DMI_NATIVE_PROOF_BANK_INVALID/,
    'fresh construction must validate current bytes instead of trusting an earlier PASS/hash label');
});

test('inspector previous bank: tuple context grid collision and scoped-donor refusals remain closed', () => {
  const f = fixture(), bank = JSON.parse(JSON.stringify(bankFor(f)));
  const inspector = createProtectedDmiNativeCurrentInspector({ previousBank: bank });
  for (const mutate of [
    value => { value.row.currentVMps += 0.01; },
    value => { value.part.waterPoint[0] += 0.01; },
    value => { value.row.sources.current.gridPoint[0] += 0.01; },
    value => { value.row.sources.current.nativeSteps[0].assetIdentitySha256 = 'd'.repeat(64); },
  ]) {
    const invalid = copy(f); mutate(invalid);
    assert.equal(inspector.inspect(invalid).ok, false);
  }
  const invalidContext = copy(f.bulk);
  invalidContext.zones[dmiExpectedIdentityForPart(f.part).entityId].entityType = 'parent-zone';
  assert.deepEqual(createProtectedDmiNativeCurrentInspector({ contexts: [invalidContext], previousBank: bank }).inspect(f),
    { ok: false, code: 'DMI_NATIVE_PROOF_CONTEXT_INVALID' });
  const conflicting = copy(f.bulk);
  conflicting.zones[dmiExpectedIdentityForPart(f.part).entityId].hourly[at(0)]['current-u'] += 0.01;
  assert.deepEqual(createProtectedDmiNativeCurrentInspector({ contexts: [conflicting], previousBank: bank }).inspect(f),
    { ok: false, code: 'DMI_NATIVE_PROOF_NATIVE_CONFLICT' }, 'a bank cannot hide conflicting actual same-identity originals');
  const lostScope = copy(f.bulk); lostScope.nativeCurrentOriginalScope = 'role-scoped-native-originals-v2';
  assert.deepEqual(createProtectedDmiNativeCurrentInspector({ contexts: [lostScope], previousBank: bank }).inspect(f),
    { ok: false, code: 'DMI_NATIVE_PROOF_SCOPED_ORIGINAL_CONTEXT_UNAVAILABLE' },
    'the existing refusal marker cannot be flattened into a global donor pool even beside a valid bank');
  for (const mutate of [
    value => { value.nativeRows[0].value.vMps += 0.01; },
    value => { value.contexts[0].value.zone.parentZoneId += '-different'; },
    value => { value.nativeRows[0].value.source.gridPoint[0] += 0.01; },
  ]) {
    const tampered = copy(bank); mutate(tampered);
    assert.throws(() => createProtectedDmiNativeCurrentInspector({ previousBank: tampered }), /DMI_NATIVE_PROOF_BANK_INVALID/);
  }
  assert.equal(createProtectedDmiNativeCurrentInspector({ contexts: [f.bulk] }).inspect(f).ok, true);
  assert.deepEqual(createProtectedDmiNativeCurrentInspector({ contexts: [] }).inspect(f),
    { ok: false, code: 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING' }, 'legacy no-bank behavior is unchanged');
});
