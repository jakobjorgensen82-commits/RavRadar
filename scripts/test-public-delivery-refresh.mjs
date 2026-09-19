import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {
  createBoundedPublicMemory, publicDeliveryGeneration, reuseVerifiedPublicHour,
  refreshVerifiedPublicGeneration, assertPublicDeliveryDocument,
} from '../js/core/public-delivery-contract.js';
import { createPublicPageResumeHandler } from '../js/core/public-page-resume.js';
import { buildPublicDeliveryDocument } from './public-conditions-lib.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';

const h0 = '2026-09-19T00:00:00.000Z';
const h1 = '2026-09-19T01:00:00.000Z';
const manifest = { datasetId: 'a', generatedAt: h0, productionReferenceAt: h0,
  publicConditionsSha256: '1'.repeat(64), publicConditionDetailsSha256: '2'.repeat(64),
  detailDelivery: { hours: { [h0]: 'first-hour' } } };
const availability = { selectedReferenceAt: h0, evaluatedAt: h0 };
const conditions = { ...manifest, available: true, zones: { local: { intact: true } },
  publicRuntimeAvailability: availability, deliveryManifestIdentity: publicDeliveryGeneration(manifest) };
assert.equal(reuseVerifiedPublicHour(conditions, manifest, availability).zones, conditions.zones);
assert.equal(reuseVerifiedPublicHour(conditions, manifest, { ...availability, selectedReferenceAt: h1 }), null,
  'A prior hour may not be relabelled as the next hour during a network outage.');
assert.equal(reuseVerifiedPublicHour({ ...conditions, emergencyDetailsDeferred: true }, manifest, availability), null);

let candidateLoads = 0;
const dependencies = {
  readManifest: async () => null, // The real manifest reader maps network failure to null.
  loadConditions: async () => { candidateLoads++; throw new Error('offline'); },
  loadZones: async () => { throw new Error('offline'); },
  reevaluate: async ({ conditions, manifest }) => reuseVerifiedPublicHour(conditions, manifest, availability),
};
const request = { manifest, conditions, now: Date.parse(h0) + 20 * 60000 };
const offline = await refreshVerifiedPublicGeneration(request, dependencies);
assert.equal(offline.manifest, manifest);
assert.equal(offline.conditions.zones, conditions.zones);
assert.equal(candidateLoads, 0, 'An already verified selected hour does not need another download.');
const changedPacking = { ...manifest, detailDelivery: { hours: { [h0]: 'replacement-hour' } } };
const failedCandidate = await refreshVerifiedPublicGeneration(request, { ...dependencies,
  readManifest: async () => changedPacking,
  loadConditions: async () => ({ available: true, datasetId: 'new' }),
});
assert.equal(failedCandidate.manifest, manifest, 'Failed geometry must not install only the new manifest.');
assert.equal(failedCandidate.conditions.zones, conditions.zones);
const installed = await refreshVerifiedPublicGeneration(request, { ...dependencies,
  readManifest: async () => changedPacking,
  loadConditions: async () => ({ available: true, datasetId: 'new' }),
  loadZones: async () => ({ generation: 'new' }),
});
assert.equal(installed.manifest, changedPacking, 'Changing shard inventory alone changes the generation.');
assert.equal(installed.changed, true);
assert.equal(installed.zones.generation, 'new');
const older = await refreshVerifiedPublicGeneration(request, { ...dependencies,
  readManifest: async () => ({ ...changedPacking, productionReferenceAt: '2026-09-18T23:00:00.000Z' }),
});
assert.equal(older.manifest, manifest, 'An older weather target is not installed.');

const memory = createBoundedPublicMemory({ maxBytes: 10, maxFiles: 2 });
memory.remember('a', { bytes: 4 }); memory.remember('b', { bytes: 4 });
memory.get('a'); memory.remember('c', { bytes: 4 });
assert.equal(memory.get('b'), undefined, 'Least recently used entries are evicted.');
assert.deepEqual(memory.size(), { files: 2, bytes: 8 });
memory.remember('too-large', { bytes: 11 });
assert.deepEqual(memory.size(), { files: 2, bytes: 8 });
memory.remember('a', { bytes: 7 });
assert.deepEqual(memory.size(), { files: 1, bytes: 7 }, 'Replacement byte accounting also enforces the byte bound.');
memory.clear(); assert.deepEqual(memory.size(), { files: 0, bytes: 0 });

// Run the actual app details/resume functions with small UI doubles. This
// exercises completion and late-response guards without a 210/673 fixture.
const app = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const ensureSource = app.slice(app.indexOf('function ensureConditionDetails('), app.indexOf('function nextConditionRuntimeGateAt('));
let releaseDetails;
let merges = 0;
let reloads = 0;
let resumes = 0;
const context = vm.createContext({
  loadConditionDetails: () => new Promise(resolve => { releaseDetails = resolve; }),
  mergeConditionDetails: (state, details) => { merges++; return { ...state, loadedDetailZones: [details.zoneId] }; },
  createPublicPageResumeHandler,
  refreshZoneStyles() {}, currentScoreFor() {}, renderRanking() {}, renderSelectedZone() {},
  performance: { mark() {} }, location: { reload() { reloads++; } },
  reevaluateConditionRuntime: async () => {}, resumePublicView: async () => { resumes++; },
  console,
});
vm.runInContext(`
  let activeManifest={detailDelivery:{}};
  let runtimeGeneration=1,conditionDetailsPromise=null,conditionDetailsReady=false;
  let coreViewReady=true;
  const pendingZoneDetails=new Map();
  const state={selectedZone:{id:'z1'},zoneLayer:{},zones:{features:[]},conditions:{available:true,
    publicRuntimeAvailability:{selectedReferenceAt:'${h0}'}}, currentScores:new Map(),forecastGroups:new Map()};
  ${ensureSource}
`, context);
const completed = vm.runInContext('ensureConditionDetails()', context);
releaseDetails({ zoneId: 'z1' }); await completed;
assert.equal(merges, 1);
assert.equal(vm.runInContext('conditionDetailsPromise', context), null);
assert.equal(vm.runInContext('pendingZoneDetails.size', context), 0);
const resumeStart = app.indexOf('const handlePublicPageShow=createPublicPageResumeHandler(');
const resumeEnd = app.indexOf("addEventListener('pageshow'", resumeStart);
vm.runInContext(app.slice(resumeStart, resumeEnd), context);
assert.equal(await vm.runInContext('handlePublicPageShow({persisted:true})', context), 'resumed');
assert.equal(reloads, 0); assert.equal(resumes, 1);
vm.runInContext("state.selectedZone={id:'z2'}", context);
const late = vm.runInContext('ensureConditionDetails()', context);
vm.runInContext('runtimeGeneration++', context);
releaseDetails({ zoneId: 'z2' }); await late;
assert.equal(merges, 1, 'A response from a superseded generation must not merge.');
const wrongHour = vm.runInContext('ensureConditionDetails()', context);
vm.runInContext(`state.conditions.publicRuntimeAvailability.selectedReferenceAt='${h1}'`, context);
releaseDetails({ zoneId: 'z2' }); await wrongHour;
assert.equal(merges, 1, 'A response for an old selected hour must not merge.');

let releaseRefresh;
const refreshContext = vm.createContext({
  refreshPublicRuntimeGeneration: () => new Promise(resolve => { releaseRefresh = resolve; }),
  projectPublicCoastlines: value => value,
  renderZones: () => { throw new Error('simulated replacement preparation failure'); },
  scheduleConditionRuntimeGate() {}, updatePublicDataStatus() {}, updateTripUi() {},
  Date, console: { warn() {} },
});
const refreshSource = app.slice(app.indexOf('async function reevaluateConditionRuntime()'), app.indexOf('function setMode('));
vm.runInContext(`
  let activeManifest={datasetId:'old'},conditionRuntimePromise=null,conditionDetailsPromise=null,
    runtimeGeneration=1,conditionDetailsReady=false,coreViewReady=false;
  const pendingZoneDetails=new Map(),map={};
  const state={conditions:{available:true,publicRuntimeAvailability:{selectedReferenceAt:'${h0}'},
    loadedDetailZones:[]},zones:{id:'old'},flowArrows:{}};
  ${refreshSource}
`, refreshContext);
const sameHourRefresh = vm.runInContext('reevaluateConditionRuntime()', refreshContext);
const initial = vm.runInContext('state.conditions', refreshContext);
vm.runInContext("state.conditions={...state.conditions,loadedDetailZones:['arrived-during-refresh']}", refreshContext);
releaseRefresh({ manifest: { datasetId: 'old' }, conditions: initial, zones: null, changed: false });
await sameHourRefresh;
assert.equal(vm.runInContext('state.conditions.loadedDetailZones[0]', refreshContext), 'arrived-during-refresh');
assert.equal(vm.runInContext('runtimeGeneration', refreshContext), 1, 'Same-hour revalidation does not invalidate pending zone work.');
const failedInstall = vm.runInContext('reevaluateConditionRuntime()', refreshContext);
releaseRefresh({ manifest: { datasetId: 'new' }, conditions: initial, zones: { id: 'new' }, changed: true });
await failedInstall;
assert.equal(vm.runInContext('activeManifest.datasetId', refreshContext), 'old');
assert.equal(vm.runInContext('state.zones.id', refreshContext), 'old', 'Failed replacement preparation preserves the complete old generation.');

// Small real producer projection: a nonwinning local part has independent
// weather; its private fields and raw U/V never pass the public allowlist.
const binding = ravScoreModelBinding();
const trust = ravScoreVerifiedEvidenceTrust();
const metadata = id => ({ zoneId: 'z1', name: id, id, ravScoreEvidenceTrust: trust });
const timeRows = [h0, h1].map(time => ({ time, waders: null, beach: null }));
const details = { datasetId: 'a', generatedAt: h0, productionReferenceAt: h0, ravScoreEvidenceTrust: trust,
  zones: { z1: { forecast: { hourly: [h0, h1].map(time => ({ time, windSpeedMps: 4 })) } } },
  coastalParts: { zones: { z1: { expectedPartCount: 2, hourly: timeRows } },
    parts: { p1: metadata('p1'), p2: metadata('p2') } } };
const full = { ...details, coastalParts: { ...details.coastalParts, modelBinding: binding,
  scoreProfile: resolvePublicRavScoreProfile({ modelCoverageReady: true, modelMemoryReady: true, modelMigrationReady: true }),
  parts: {
    p1: { zoneId: 'z1', name: 'p1', current: { time: h0 }, flowPoints: { current: [8, 55] } },
    p2: { zoneId: 'z1', name: 'p2', rawPayload: 'private', hourly: [{ time: h1,
      weather: { time: h1, windSpeedMps: 7, currentUMps: 0.123, privatePayload: 'private' }, waders: null, beach: null,
      flowPoints: { current: [8.1, 55.1], sources: { current: 'dmi-marine-grid' } } }] },
  } } };
const shardManifest = { ...manifest, ravScoreModelBinding: binding, coastalPartCount: 2,
  detailDelivery: { zones: { z1: {} }, hours: { [h0]: {}, [h1]: {} } } };
const shard = buildPublicDeliveryDocument(full, details, shardManifest, 'hour', h1);
assert.equal(shard.coastalParts.parts.p2.current.weather.windSpeedMps, 7);
assert.equal(shard.coastalParts.parts.p1.current, undefined, 'Legacy H0 is not invented as future local weather.');
assert.equal(shard.coastalParts.parts.p1.flowPoints, undefined);
assert.doesNotMatch(JSON.stringify(shard), /privatePayload|rawPayload|currentUMps/);
assertPublicDeliveryDocument(shard, shardManifest, { kind: 'hour', key: h1 });
shard.coastalParts.parts.p2.current.weather.time = h0;
assert.throws(() => assertPublicDeliveryDocument(shard, shardManifest, { kind: 'hour', key: h1 }), /stale local/);
const duplicated = structuredClone(full);
duplicated.coastalParts.parts.p2.hourly.push(structuredClone(duplicated.coastalParts.parts.p2.hourly[0]));
assert.throws(() => buildPublicDeliveryDocument(duplicated, details, shardManifest, 'hour', h1), /ambiguous local/);
const shifted = structuredClone(full);
shifted.coastalParts.parts.p2.hourly[0].weather.time = h0;
assert.throws(() => buildPublicDeliveryDocument(shifted, details, shardManifest, 'hour', h1), /mismatched local/);

console.log('OK: public generation atomicity, offline exact-hour reuse, bounded memory, mobile resume, late responses and PART allowlist.');
