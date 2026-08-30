import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  buildPublicConditionDetails,
  buildPublicConditions,
  buildPublicManifest,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';
import {
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import {
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
  ravScorePublicHorizonValidUntil,
} from '../js/core/ravscore-public-runtime-contract.js';
import { createTripStartFromPublicState } from '../js/services/trip-evidence-public-adapter.js';
import {
  completeTripEvidence,
  toObservationTripColumns,
} from '../js/services/trip-evidence-contract.js';

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const binding = ravScoreModelBinding();
const generatedAt = '2026-08-29T00:00:00.000Z';
const validUntil = ravScorePublicHorizonValidUntil(generatedAt);
const freshNow = Date.parse(generatedAt) + 30 * 60_000;
const emergencyNow = Date.parse(generatedAt) + 9 * 3_600_000 + 20 * 60_000;
const reconstructedTrust = Object.freeze({
  schemaVersion: 1,
  status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
  incidentId: 'RRGAP-2026-08-29-CANDIDATE-G-01',
  decisionId: 'DEC-0109',
  method: 'LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH',
  evidenceClassification: 'RECONSTRUCTED_DERIVED_NOT_MEASURED',
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  descriptorSha256: 'a'.repeat(64),
  affectedPartCount: 673,
  syntheticSampleCount: 673,
  activeUntil: '2026-08-31T09:00:00.000Z',
});
const horizonTimes = Array.from({ length: RAVSCORE_PUBLIC_FORECAST_HOURS }, (_, index) =>
  new Date(Date.parse(generatedAt) + index * 3_600_000).toISOString());
const zoneIds = Array.from({ length: 210 }, (_, index) => `zone-${index + 1}`);
const scoreProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
const partsByZone = Object.fromEntries(zoneIds.map((zoneId, zoneIndex) => {
  const count = zoneIndex < 43 ? 4 : 3;
  return [zoneId, Array.from({ length: count }, (_, localIndex) => {
    const partNumber = zoneIndex * 3 + Math.min(zoneIndex, 43) + localIndex + 1;
    const partId = `part-${partNumber}`;
    const lon = 8 + zoneIndex * 0.001 + localIndex * 0.0001;
    const lat = 55 + zoneIndex * 0.001;
    return {
      partId,
      sourceZoneId: zoneId,
      name: `Part ${partNumber}`,
      geometry: { type: 'LineString', coordinates: [[lon, lat], [lon + 0.00005, lat + 0.00005]] },
      landPoint: [lon + 0.00005, lat + 0.00005],
      waterPoint: [lon, lat],
      onshoreDirectionDeg: (zoneIndex + localIndex) % 360,
      marineCoverage: 'full',
      coverageGaps: [],
    };
  })];
}));
const allPartRows = Object.values(partsByZone).flat();
assert.equal(allPartRows.length, 673, 'The synthetic package must cover all 673 coastal parts.');
const coastalPartsDocument = {
  schemaVersion: 2,
  enabled: true,
  datasetVersion: 'synthetic-coast-v1',
  sourceRunId: 'synthetic',
  generatedAt,
  partCount: allPartRows.length,
  sourcePartCount: allPartRows.length,
  zoneCount: zoneIds.length,
  wholeZoneMarginPoints: 7,
  zones: partsByZone,
};
const coastalPartsText = compactJson(coastalPartsDocument);
const zoneCollection = {
  type: 'FeatureCollection',
  features: zoneIds.map((zoneId, index) => ({
    type: 'Feature',
    properties: { id: zoneId, zoneStatus: 'active', name: `Zone ${index + 1}` },
    geometry: { type: 'Polygon', coordinates: [[[8 + index * 0.001, 55], [8.1 + index * 0.001, 55], [8.1 + index * 0.001, 55.1], [8 + index * 0.001, 55]]] },
  })),
};
const zoneRegistryText = compactJson(zoneCollection);

function score(value, winningPart, comparisonPartCount, time) {
  return {
    available: true,
    status: 'whole-zone',
    score: value,
    winningPartId: winningPart.partId,
    winningPartName: winningPart.name,
    scoreSpread: 0,
    comparisonPartCount,
    validPartCount: comparisonPartCount,
    expectedPartCount: comparisonPartCount,
    components: { huntability: value, transport: value, release: value },
    weather: { time, windSpeedMps: 5 + (Date.parse(time) - Date.parse(generatedAt)) / 36_000_000 },
    modelBinding: binding,
    explanation: { ...binding },
    scoreProfileId: binding.modelId,
  };
}

function full(datasetId, scoreValue) {
  const zoneRows = Object.fromEntries(zoneIds.map((zoneId, zoneIndex) => {
    const zoneParts = partsByZone[zoneId];
    const winningPart = zoneParts[0];
    const rows = horizonTimes.map((time, hourIndex) => {
      const hourlyScore = scoreValue + (zoneIndex % 5) + (hourIndex % 20);
      return {
        time,
        waders: score(hourlyScore, winningPart, zoneParts.length, time),
        beach: score(hourlyScore + 1, winningPart, zoneParts.length, time),
      };
    });
    return [zoneId, rows];
  }));
  const partRecords = Object.fromEntries(allPartRows.map(part => {
    const zoneRowsForPart = zoneRows[part.sourceZoneId];
    return [part.partId, {
      zoneId: part.sourceZoneId,
      name: part.name,
      waterPoint: part.waterPoint,
      landPoint: part.landPoint,
      onshoreDirectionDeg: part.onshoreDirectionDeg,
      flowPoints: {
        current: part.waterPoint,
        wind: part.waterPoint,
        sources: { current: 'dmi-marine-grid', wind: 'dmi-atmospheric-grid' },
      },
      current: { ...zoneRowsForPart[0], weather: { time: generatedAt, windSpeedMps: 5 } },
    }];
  }));
  return {
    datasetId,
    generatedAt,
    productionReferenceAt: generatedAt,
    zones: Object.fromEntries(zoneIds.map((zoneId, zoneIndex) => [zoneId, {
        provider: 'dmi',
        current: { windSpeedMps: 4 },
        history: {},
        forecast: {
          provider: 'dmi',
          generatedAt,
          validUntil,
          hourly: horizonTimes.map((time, hourIndex) => ({
            time,
            windSpeedMps: 4 + hourIndex / 10,
            waveHeightM: 0.5 + zoneIndex / 1000,
          })),
        },
      }])),
    coastalParts: {
      schemaVersion: 2,
      enabled: true,
      modelBinding: binding,
      evidenceTrust: ravScoreVerifiedEvidenceTrust(),
      scoreProfile,
      scoreAvailability: {
        schemaVersion: 1,
        policy: 'integrated-model-local-fail-closed',
        allZonesActive: true,
        activeZoneCount: zoneIds.length,
        unavailableZoneCount: 0,
        totalZoneCount: zoneIds.length,
        evaluatedAt: generatedAt,
        unavailableZones: [],
      },
      expectedPartCount: allPartRows.length,
      scoredPartCount: allPartRows.length,
      parts: partRecords,
      zones: Object.fromEntries(zoneIds.map(zoneId => [zoneId, {
        expectedPartCount: partsByZone[zoneId].length,
        scoredPartCount: partsByZone[zoneId].length,
        currentReferenceAt: generatedAt,
        hourly: zoneRows[zoneId],
      }])),
    },
  };
}

function bundle(datasetId, scoreValue) {
  const source = full(datasetId, scoreValue);
  const startup = buildPublicConditions(source);
  const details = buildPublicConditionDetails(source);
  const startupText = compactJson(startup);
  const detailsText = compactJson(details);
  const manifest = buildPublicManifest(source, startupText, detailsText, coastalPartsText, zoneRegistryText);
  return { startup, details, startupText, detailsText, manifest };
}

function primaryUrl(manifest, details = false) {
  const hash = details ? manifest.publicConditionDetailsSha256 : manifest.publicConditionsSha256;
  const name = details ? 'public-condition-details.json' : 'public-conditions.json';
  return `./data/live/${name}?dataset=${manifest.datasetId}&sha=${hash}`;
}

function coastalUrl(manifest) {
  return `./data/live/coastal-parts-v2.json?dataset=${manifest.datasetId}&sha=${manifest.coastalPartsSha256}`;
}

function zoneUrl(manifest) {
  return `./data/zones.geojson?dataset=${manifest.datasetId}&sha=${manifest.zoneRegistrySha256}`;
}

const primary = bundle('primary-integrated', 61);
const publicProfileBinding = {
  modelId: primary.startup.coastalParts.scoreProfile.activeProfileId,
  stateSchemaVersion: primary.startup.coastalParts.scoreProfile.stateSchemaVersion,
  variantId: primary.startup.coastalParts.scoreProfile.variantId,
  profileId: primary.startup.coastalParts.scoreProfile.profileId,
  componentSchemaId: primary.startup.coastalParts.scoreProfile.componentSchemaId,
  explanationSchemaId: primary.startup.coastalParts.scoreProfile.explanationSchemaId,
  rankingPolicyId: binding.rankingPolicyId,
  bestTimePolicyId: binding.bestTimePolicyId,
  presentationPolicyId: primary.startup.coastalParts.scoreProfile.presentationPolicyId,
  modelContractSha256: primary.startup.coastalParts.scoreProfile.modelContractSha256,
  modelBundleSha256: primary.startup.coastalParts.scoreProfile.modelBundleSha256,
};
for (const key of Object.keys(binding)) {
  assert.equal(publicProfileBinding[key], binding[key], `Public score profile binding: ${key}`);
}
const documents = new Map([
  [primaryUrl(primary.manifest), primary.startupText],
  [primaryUrl(primary.manifest, true), primary.detailsText],
  [coastalUrl(primary.manifest), coastalPartsText],
  [zoneUrl(primary.manifest), zoneRegistryText],
]);
const requests = [];
globalThis.fetch = async (url, options = {}) => {
  const key = String(url);
  requests.push({ url: key, cache: options.cache || 'default' });
  if (!documents.has(key)) return { ok: false, status: 404, text: async () => '' };
  return {
    ok: true,
    status: 200,
    text: async () => documents.get(key),
    json: async () => JSON.parse(documents.get(key)),
  };
};
const warnings = [];
console.warn = (...parts) => warnings.push(parts.map(String).join(' '));

const service = await import('../js/services/data-service.js?ravscore-public-data-service-binding');

// App bootstrap must establish the manifest before the first kystdelsrequest.
const appSource = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const bootstrapStart = appSource.indexOf('await consumeAuthCallback()');
assert.ok(bootstrapStart >= 0, 'App bootstrap must remain present.');
const bootstrapSource = appSource.slice(bootstrapStart);
assert.ok(bootstrapSource.indexOf('loadDataManifest()') < bootstrapSource.indexOf('loadZones({manifest})'));
assert.match(appSource, /conditionDetailsReady=conditions\.detailsAvailable===true/);
assert.match(appSource, /if\(conditionDetailsReady\)return Promise\.resolve\(state\.conditions\)/);

for (const mutate of [
  manifest => { delete manifest.publicConditionsSha256; },
  manifest => { manifest.publicConditionDetailsSha256 = 'not-a-sha'; },
  manifest => { delete manifest.publicConditionsBytes; },
  manifest => { manifest.publicConditionDetailsBytes = 0; },
  manifest => { manifest.ravScoreRuntime.startup.bytes += 1; },
  manifest => { delete manifest.ravScoreRuntime.details.fileSha256; },
  manifest => { manifest.ravScoreRuntime.hiddenFallback = true; },
  manifest => { manifest.ravScoreRuntime.startup.hiddenFallback = true; },
  manifest => { manifest.ravScoreProfile.unexpectedShadowBinding = 'forbidden'; },
  manifest => { delete manifest.ravScoreProfile.rankingPolicyId; },
  manifest => { manifest.ravScoreProfile.bestTimePolicyId = 'forged-best-time'; },
  manifest => { delete manifest.zoneRegistrySha256; },
  manifest => { manifest.zoneRegistryBytes = 0; },
  manifest => { delete manifest.ravScoreEvidenceTrust; },
  manifest => { manifest.ravScoreEvidenceTrust = structuredClone(reconstructedTrust); },
  manifest => { manifest.ravScoreEvidenceTrust.unexpected = true; },
]) {
  const invalidManifest = structuredClone(primary.manifest);
  mutate(invalidManifest);
  await assert.rejects(
    () => service.loadZones({ manifest: invalidManifest }),
    /manifest|filhash|byteantal|ufuldstændig|runtime|scoreprofil|profile|evidens|trust|VERIFIED_ONLY/i,
  );
}

for (const [label, mutate] of [
  ['extra payload envelope', startup => { startup.ravScoreRuntime.hiddenFallback = true; }],
  ['partial payload profile', startup => { delete startup.coastalParts.scoreProfile.rankingPolicyId; }],
  ['extra payload profile', startup => {
    startup.coastalParts.scoreProfile.unexpectedShadowBinding = 'forbidden';
  }],
  ['forged payload profile', startup => {
    startup.coastalParts.scoreProfile.bestTimePolicyId = 'forged-best-time';
  }],
  ['reconstructed root trust', startup => {
    startup.ravScoreEvidenceTrust = structuredClone(reconstructedTrust);
  }],
  ['reconstructed nested trust', startup => {
    startup.coastalParts.evidenceTrust = structuredClone(reconstructedTrust);
  }],
  ['missing part trust', startup => {
    delete startup.coastalParts.parts['part-1'].ravScoreEvidenceTrust;
  }],
]) {
  service.clearDataMemoryCache();
  const invalidStartup = structuredClone(primary.startup);
  mutate(invalidStartup);
  invalidStartup.ravScoreRuntime.payloadBodySha256 = sha256Text(
    canonicalPublicRuntimeJson(publicRuntimeDocumentBody(invalidStartup)),
  );
  const invalidText = compactJson(invalidStartup);
  const invalidManifest = structuredClone(primary.manifest);
  invalidManifest.publicConditionsSha256 = sha256Text(invalidText);
  invalidManifest.publicConditionsBytes = Buffer.byteLength(invalidText);
  Object.assign(invalidManifest.ravScoreRuntime.startup, {
    payloadBodySha256: invalidStartup.ravScoreRuntime.payloadBodySha256,
    fileSha256: invalidManifest.publicConditionsSha256,
    bytes: invalidManifest.publicConditionsBytes,
  });
  documents.set(primaryUrl(invalidManifest), invalidText);
  const rejected = await service.loadConditions({ manifest: invalidManifest, now: freshNow });
  assert.equal(rejected.available, false, label);
}

const loadedZones = await service.loadZones({ manifest: primary.manifest });
assert.equal(loadedZones.features.length, 210);
assert.equal(loadedZones.coastalParts.partCount, 673);
assert.ok(requests.some(request => request.url === coastalUrl(primary.manifest)
  && request.cache === 'force-cache'));
assert.ok(requests.some(request => request.url === zoneUrl(primary.manifest)
  && request.cache === 'force-cache'));
assert.equal(requests.some(request => request.url === './data/live/coastal-parts-v2.json'), false);
const inconsistentCachedManifest = {
  ...structuredClone(primary.manifest),
  coastalPartsBytes: primary.manifest.coastalPartsBytes + 1,
};
await assert.rejects(
  () => service.loadZones({ manifest: inconsistentCachedManifest }),
  /cachede fil matcher ikke det aktuelle manifest/i,
);

// The exact manifest bytes and hash are both gates. A path-correct but modified
// file may neither be used nor enter the in-memory cache.
service.clearDataMemoryCache();
documents.set(coastalUrl(primary.manifest), `${coastalPartsText.trim()} `);
await assert.rejects(() => service.loadZones({ manifest: primary.manifest }), /byteantal|SHA-256/i);
documents.set(coastalUrl(primary.manifest), coastalPartsText);

service.clearDataMemoryCache();
documents.set(zoneUrl(primary.manifest), `${zoneRegistryText.trim()} `);
await assert.rejects(() => service.loadZones({ manifest: primary.manifest }), /byteantal|SHA-256/i);
documents.set(zoneUrl(primary.manifest), zoneRegistryText);

service.clearDataMemoryCache();
const wrongZoneRegistry = structuredClone(zoneCollection);
wrongZoneRegistry.features[0].properties.id = 'other-zone';
const wrongZoneRegistryText = compactJson(wrongZoneRegistry);
const wrongZoneManifest = {
  ...structuredClone(primary.manifest),
  zoneRegistrySha256: sha256Text(wrongZoneRegistryText),
  zoneRegistryBytes: Buffer.byteLength(wrongZoneRegistryText),
};
documents.set(zoneUrl(wrongZoneManifest), wrongZoneRegistryText);
await assert.rejects(() => service.loadZones({ manifest: wrongZoneManifest }), /210\/673-datasæt/i);

service.clearDataMemoryCache();
const wrongCoastalBytesManifest = {
  ...structuredClone(primary.manifest),
  coastalPartsBytes: primary.manifest.coastalPartsBytes + 1,
};
documents.set(coastalUrl(wrongCoastalBytesManifest), coastalPartsText);
await assert.rejects(() => service.loadZones({ manifest: wrongCoastalBytesManifest }), /byteantal/i);

// Even consistently rehashed content fails closed when dataset, model binding,
// or the manifest's zone/part coverage is mixed.
service.clearDataMemoryCache();
const wrongDatasetDocument = { ...structuredClone(coastalPartsDocument), datasetId: 'other-dataset' };
const wrongDatasetText = compactJson(wrongDatasetDocument);
const wrongDatasetManifest = {
  ...structuredClone(primary.manifest),
  coastalPartsSha256: sha256Text(wrongDatasetText),
  coastalPartsBytes: Buffer.byteLength(wrongDatasetText),
};
documents.set(coastalUrl(wrongDatasetManifest), wrongDatasetText);
await assert.rejects(() => service.loadZones({ manifest: wrongDatasetManifest }), /andet datasæt/i);

service.clearDataMemoryCache();
const wrongModelDocument = {
  ...structuredClone(coastalPartsDocument),
  modelBinding: { ...binding, profileId: 'mixed-profile' },
};
const wrongModelText = compactJson(wrongModelDocument);
const wrongModelManifest = {
  ...structuredClone(primary.manifest),
  coastalPartsSha256: sha256Text(wrongModelText),
  coastalPartsBytes: Buffer.byteLength(wrongModelText),
};
documents.set(coastalUrl(wrongModelManifest), wrongModelText);
await assert.rejects(() => service.loadZones({ manifest: wrongModelManifest }), /anden RavScore-model|profileId/i);

service.clearDataMemoryCache();
const wrongCoverageDocument = { ...structuredClone(coastalPartsDocument), partCount: 674 };
const wrongCoverageText = compactJson(wrongCoverageDocument);
const wrongCoverageManifest = {
  ...structuredClone(primary.manifest),
  coastalPartsSha256: sha256Text(wrongCoverageText),
  coastalPartsBytes: Buffer.byteLength(wrongCoverageText),
};
documents.set(coastalUrl(wrongCoverageManifest), wrongCoverageText);
await assert.rejects(() => service.loadZones({ manifest: wrongCoverageManifest }), /210\/673-datasæt/i);

// First schema-4 rollout has no same-model fallback and must load normally.
const first = await service.loadConditions({ manifest: primary.manifest, now: freshNow });
assert.equal(first.available, true, warnings.join('\n'));
assert.equal(first.datasetId, primary.manifest.datasetId);
assert.equal(first.publicRuntimeAvailability.mode, 'FRESH');
assert.equal(first.publicRuntimeAvailability.selectedReferenceAt, generatedAt);
assert.equal(first.recoveryFallbackActive, undefined);
const firstDetails = await service.loadConditionDetails({ manifest: primary.manifest, conditions: first });
const merged = service.mergeConditionDetails(first, firstDetails);
assert.equal(merged.detailsAvailable, true);
assert.equal(merged.coastalParts.parts['part-1'].current.waders.score, 61);
const tripStart = createTripStartFromPublicState({
  tripId: '11111111-1111-4111-8111-111111111111',
  startedAt: new Date(Date.parse(generatedAt) + 5 * 60000).toISOString(),
  mode: 'waders',
  zoneId: 'zone-1',
  coastalPartId: 'part-1',
  manifest: primary.manifest,
  conditions: merged,
  coastalPart: merged.coastalParts.parts['part-1'],
  appVersion: '4.0.999',
  modelVersion: binding.modelId,
  modelBinding: binding,
});
assert.equal(tripStart.calibrationFeatures.modelBundleSha256, binding.modelBundleSha256);
assert.equal(tripStart.calibrationFeatures.modelContractSha256, binding.modelContractSha256);
assert.equal(tripStart.calibrationFeatures.modelStateVersion, binding.stateSchemaVersion);
assert.equal(tripStart.calibrationFeatures.modelPresentationPolicyId, binding.presentationPolicyId);
assert.equal(tripStart.calibrationFeatures.windSpeedMs, 5, 'Trip snapshot must use the winning coastal part weather.');
assert.throws(() => createTripStartFromPublicState({
  tripId: '22222222-2222-4222-8222-222222222222',
  startedAt: new Date(Date.parse(generatedAt) + 5 * 60000).toISOString(),
  mode: 'waders', zoneId: 'zone-1', coastalPartId: 'part-1',
  manifest: primary.manifest, conditions: merged,
  coastalPart: merged.coastalParts.parts['part-1'], appVersion: '4.0.999',
  modelVersion: binding.modelId, modelBinding: { ...binding, profileId: 'wrong-profile' },
}), /modelbundle|profileId/i);
assert.throws(() => createTripStartFromPublicState({
  tripId: '33333333-3333-4333-8333-333333333333',
  startedAt: new Date(Date.parse(generatedAt) + 5 * 60000).toISOString(),
  mode: 'waders', zoneId: 'zone-1', coastalPartId: 'part-1',
  manifest: primary.manifest, conditions: merged,
  coastalPart: merged.coastalParts.parts['part-1'], appVersion: '4.0.999',
  modelVersion: binding.modelId,
  modelBinding: { ...binding, hiddenModelRevision: 'must-fail-closed' },
}), /exact key set/i);

// Once the one-hour operational grace has passed, the very same exact four-file
// bundle is projected to the latest hourly score at or before the browser clock.
// No Candidate G model or separately named fallback payload participates.
service.clearDataMemoryCache();
const emergencyRequestStart = requests.length;
const emergency = await service.loadConditions({ manifest: primary.manifest, now: emergencyNow });
assert.equal(emergency.available, true, warnings.join('\n'));
assert.equal(emergency.publicRuntimeAvailability.mode, 'EMERGENCY_LAST_COMPLETE');
assert.equal(emergency.publicRuntimeAvailability.selectedReferenceAt, horizonTimes[9]);
assert.equal(emergency.detailsAvailable, true);
assert.equal(emergency.zones['zone-1'].currentReferenceAt, horizonTimes[9]);
assert.equal(emergency.zones['zone-1'].current.windSpeedMps, 4.9);
assert.equal(emergency.coastalParts.zones['zone-1'].currentReferenceAt, horizonTimes[9]);
assert.equal(emergency.coastalParts.zones['zone-1'].hourly[9].waders.score, 70);
assert.equal(emergency.coastalParts.parts['part-1'].current.time, horizonTimes[9]);
assert.equal(emergency.coastalParts.parts['part-1'].current.waders.score, 70);
assert.equal(emergency.coastalParts.parts['part-1'].current.weather.windSpeedMps, 5.9);
assert.equal(emergency.coastalParts.parts['part-2'].current.waders.available, false);
assert.equal(emergency.coastalParts.parts['part-2'].current.weather, null);
assert.equal(Object.keys(emergency.coastalParts.parts).length, 673);
assert.equal(emergency.nationalForecast, null,
  'Emergency rankings must be rebuilt from verified detailed rows at runtime.');
const emergencyRequests = requests.slice(emergencyRequestStart).map(request => request.url);
assert.deepEqual(new Set(emergencyRequests), new Set([
  primaryUrl(primary.manifest),
  primaryUrl(primary.manifest, true),
  coastalUrl(primary.manifest),
  zoneUrl(primary.manifest),
]), 'Emergency must verify exactly the manifest-bound four-file package.');

const emergencyStart = createTripStartFromPublicState({
  tripId: '44444444-4444-4444-8444-444444444444',
  startedAt: new Date(emergencyNow + 60_000).toISOString(),
  mode: 'waders', zoneId: 'zone-1', coastalPartId: 'part-1',
  manifest: primary.manifest, conditions: emergency,
  coastalPart: emergency.coastalParts.parts['part-1'], appVersion: '4.0.999',
  modelVersion: binding.modelId, modelBinding: binding,
});
assert.deepEqual(emergencyStart.calibrationFeatures.reasonCodes,
  ['public-emergency-last-complete']);
const emergencyEvidence = completeTripEvidence(emergencyStart, {
  endedAt: new Date(emergencyNow + 31 * 60_000).toISOString(),
  zoneId: 'zone-1', coastalPartId: 'part-1', searchCoverage: 'normal', found: false,
});
assert.equal(emergencyEvidence.calibrationEligible, false);
assert.equal(toObservationTripColumns(emergencyEvidence).calibration_eligible, false);
assert.throws(() => createTripStartFromPublicState({
  tripId: '55555555-5555-4555-8555-555555555555',
  startedAt: new Date(emergencyNow + 60_000).toISOString(),
  mode: 'waders', zoneId: 'zone-1', coastalPartId: 'part-2',
  manifest: primary.manifest, conditions: emergency,
  coastalPart: emergency.coastalParts.parts['part-2'], appVersion: '4.0.999',
  modelVersion: binding.modelId, modelBinding: binding,
}), /komplet aktuel score/i, 'A non-winning part must never reuse its stale build-time snapshot.');

const nextEmergencyHour = await service.reevaluatePublicConditions({
  manifest: primary.manifest,
  conditions: emergency,
  now: Date.parse(generatedAt) + 10 * 3_600_000 + 5 * 60_000,
});
assert.equal(nextEmergencyHour.publicRuntimeAvailability.selectedReferenceAt, horizonTimes[10]);
assert.equal(nextEmergencyHour.coastalParts.parts['part-1'].current.waders.score, 71);
const expired = await service.reevaluatePublicConditions({
  manifest: primary.manifest,
  conditions: nextEmergencyHour,
  now: Date.parse(primary.manifest.validUntil) + 1,
});
assert.equal(expired.available, false, 'The last score row must disappear one millisecond after its horizon.');

assert.match(appSource,
  /availability\?\.mode==='EMERGENCY_LAST_COMPLETE'[\s\S]{0,220}t\('data\.emergency',[\s\S]{0,180}selectedReferenceAt/,
  'The public status line must identify same-model emergency data and its projected hour');
assert.match(appSource,
  /conditionDetailsReady=conditions\.detailsAvailable===true;[\s\S]{0,100}scheduleConditionRuntimeGate\(\)/,
  'An atomically loaded emergency detail bundle must not be fetched a second time');
assert.match(appSource,
  /visibilitychange[\s\S]{0,160}reevaluateConditionRuntime\(\)/,
  'A restored or newly visible page must re-evaluate the emergency horizon');

service.clearDataMemoryCache();
documents.set(primaryUrl(primary.manifest, true), `${primary.detailsText.trim()} `);
const detailsHashFailed = await service.loadConditions({ manifest: primary.manifest, now: emergencyNow });
assert.equal(detailsHashFailed.available, false,
  'One invalid details file must make the whole emergency package unavailable.');
documents.set(primaryUrl(primary.manifest, true), primary.detailsText);

service.clearDataMemoryCache();
const reconstructedDetails = structuredClone(primary.details);
reconstructedDetails.ravScoreEvidenceTrust = structuredClone(reconstructedTrust);
reconstructedDetails.ravScoreRuntime.payloadBodySha256 = sha256Text(
  canonicalPublicRuntimeJson(publicRuntimeDocumentBody(reconstructedDetails)),
);
const reconstructedDetailsText = compactJson(reconstructedDetails);
const reconstructedDetailsManifest = structuredClone(primary.manifest);
reconstructedDetailsManifest.publicConditionDetailsSha256 = sha256Text(reconstructedDetailsText);
reconstructedDetailsManifest.publicConditionDetailsBytes = Buffer.byteLength(reconstructedDetailsText);
Object.assign(reconstructedDetailsManifest.ravScoreRuntime.details, {
  payloadBodySha256: reconstructedDetails.ravScoreRuntime.payloadBodySha256,
  fileSha256: reconstructedDetailsManifest.publicConditionDetailsSha256,
  bytes: reconstructedDetailsManifest.publicConditionDetailsBytes,
});
documents.set(primaryUrl(reconstructedDetailsManifest, true), reconstructedDetailsText);
const reconstructedEmergency = await service.loadConditions({
  manifest: reconstructedDetailsManifest,
  now: emergencyNow,
});
assert.equal(reconstructedEmergency.available, false,
  'a consistently rehashed reconstructed details package must never enter integrated emergency mode');

// File bytes are checked, not merely named by a hash-bearing URL.
service.clearDataMemoryCache();
documents.set(primaryUrl(primary.manifest), `${primary.startupText.trim()} `);
const byteTampered = await service.loadConditions({ manifest: primary.manifest, now: freshNow });
assert.equal(byteTampered.available, false);
documents.set(primaryUrl(primary.manifest), primary.startupText);

// Even a newly hashed file is rejected if its internal body digest no longer matches.
service.clearDataMemoryCache();
const bodyTamperedDocument = structuredClone(primary.startup);
bodyTamperedDocument.zones['zone-1'].provider = 'tampered';
const bodyTamperedText = compactJson(bodyTamperedDocument);
const bodyTamperedManifest = structuredClone(primary.manifest);
bodyTamperedManifest.publicConditionsSha256 = sha256Text(bodyTamperedText);
bodyTamperedManifest.publicConditionsBytes = Buffer.byteLength(bodyTamperedText);
bodyTamperedManifest.ravScoreRuntime.startup.fileSha256 = bodyTamperedManifest.publicConditionsSha256;
bodyTamperedManifest.ravScoreRuntime.startup.bytes = bodyTamperedManifest.publicConditionsBytes;
documents.set(primaryUrl(bodyTamperedManifest), bodyTamperedText);
const bodyTampered = await service.loadConditions({ manifest: bodyTamperedManifest, now: freshNow });
assert.equal(bodyTampered.available, false);

// Even consistently re-hashed bytes may not hide a cross-model score inside a canonical envelope.
service.clearDataMemoryCache();
const nestedMixedDocument = structuredClone(primary.startup);
nestedMixedDocument.coastalParts.zones['zone-1'].hourly[0].waders.modelBinding.modelId = 'RRS-CANDIDATE-G';
nestedMixedDocument.ravScoreRuntime.payloadBodySha256 = sha256Text(
  canonicalPublicRuntimeJson(publicRuntimeDocumentBody(nestedMixedDocument)),
);
const nestedMixedText = compactJson(nestedMixedDocument);
const nestedMixedManifest = structuredClone(primary.manifest);
nestedMixedManifest.publicConditionsSha256 = sha256Text(nestedMixedText);
nestedMixedManifest.publicConditionsBytes = Buffer.byteLength(nestedMixedText);
nestedMixedManifest.ravScoreRuntime.startup.fileSha256 = nestedMixedManifest.publicConditionsSha256;
nestedMixedManifest.ravScoreRuntime.startup.bytes = nestedMixedManifest.publicConditionsBytes;
nestedMixedManifest.ravScoreRuntime.startup.payloadBodySha256 = nestedMixedDocument.ravScoreRuntime.payloadBodySha256;
documents.set(primaryUrl(nestedMixedManifest), nestedMixedText);
const nestedMixed = await service.loadConditions({ manifest: nestedMixedManifest, now: freshNow });
assert.equal(nestedMixed.available, false);

// Obsolete recovery metadata, whether cross-model or same-model, is rejected.
// Schema 4's four primary files are the only public runtime selected by the browser.
service.clearDataMemoryCache();
const mixedFallbackManifest = structuredClone(primary.manifest);
mixedFallbackManifest.recoveryFallback = {
  status: 'active-last-verified',
  datasetId: 'candidate-g-fallback',
  generatedAt,
  productionReferenceAt: generatedAt,
  validUntil,
  maximumAgeHours: 72,
  conditionsPath: './old-public-conditions.json',
  conditionDetailsPath: './old-public-condition-details.json',
  publicConditionsSha256: 'a'.repeat(64),
  publicConditionDetailsSha256: 'b'.repeat(64),
  ravScoreModelBinding: { ...binding, modelId: 'RRS-CANDIDATE-G' },
  ravScoreRuntime: structuredClone(primary.manifest.ravScoreRuntime),
};
const afterMixedFallback = await service.loadConditions({ manifest: mixedFallbackManifest, now: freshNow });
assert.equal(afterMixedFallback.available, false);

service.clearDataMemoryCache();
const sameModelManifest = structuredClone(primary.manifest);
sameModelManifest.recoveryFallback = {
  status: 'active-last-verified',
  datasetId: 'same-model-fallback',
  generatedAt,
  productionReferenceAt: generatedAt,
  validUntil,
  maximumAgeHours: 72,
  conditionsPath: './same-model-last-verified-public-conditions.json',
  conditionDetailsPath: './same-model-last-verified-public-condition-details.json',
  publicConditionsSha256: primary.manifest.publicConditionsSha256,
  publicConditionDetailsSha256: primary.manifest.publicConditionDetailsSha256,
  ravScoreModelBinding: binding,
  ravScoreRuntime: structuredClone(primary.manifest.ravScoreRuntime),
};
const afterSameModelFallback = await service.loadConditions({ manifest: sameModelManifest, now: freshNow });
assert.equal(afterSameModelFallback.available, false);
assert.equal(
  requests.some(request => /old-public|same-model-last-verified/.test(request.url)),
  false,
  'Obsolete recovery metadata must never redirect public startup or details requests.',
);

const mixedDetails = structuredClone(firstDetails);
mixedDetails.ravScoreRuntime.modelBinding.modelId = 'RRS-CANDIDATE-G';
assert.throws(() => service.mergeConditionDetails(first, mixedDetails), /modelId|model\s*bundle/i);
const trustMixedDetails = structuredClone(firstDetails);
trustMixedDetails.ravScoreEvidenceTrust = structuredClone(reconstructedTrust);
assert.throws(() => service.mergeConditionDetails(first, trustMixedDetails), /VERIFIED_ONLY/i,
  'progressive merging must independently reject reconstructed trust');

assert.ok(requests.some(request => request.cache === 'force-cache'));

globalThis.fetch = realFetch;
console.warn = realWarn;
console.log('OK: public data-service verifies manifest-first coastal parts and one schema-4 model-atomic runtime.');
