import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ravScoreModelBinding as integratedBinding } from '../js/core/ravscore-model-contract.js';
import { presentActiveRavScoreExplanation as presentIntegrated } from '../js/core/ravscore-integrated-explanation-presenter.js';

const integrated = {
  available:true,
  score:64,
  components:{ huntability:70, transport:60, release:62 },
  modelBinding:integratedBinding(),
  localWeather:{ currentProvenance:{ sourceClass:'local-model-grid', distanceKm:3.2 } },
  explanation:{
    transportDiagnostics:{
      engine:'INTEGRATED_COASTAL_PROCESS',
      lastMileScoreEffect:'NONE',
      lastMileStatus:'LAST_MILE_UNRESOLVED_SCORE_NEUTRAL',
      lastMilePhysicalDeliveryResolved:false,
      lastMileStructuralUncertainty:true,
      resolvedSurfZoneIncluded:false,
      currentMemoryReady:true,
      currentMemoryStatus:'READY',
      currentMemoryCoverageHours:48,
      currentMemoryWindowHours:48,
    },
    mobilisationDiagnostics:{ mobilisationPotential:62 },
    waterLevelContext:{
      phase:'FALLING',
      jointContextCode:'FALLING_WITH_OUTBOUND_CURRENT_CONTEXT',
      currentRelation:'OUTBOUND',
      currentRelationDeadbandMps:0.03,
      trendSemantics:'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE',
      scoreEffectPoints:0,
      transportEffect:'NONE',
    },
  },
};
const integratedDa = presentIntegrated(integrated, { language:'da' });
assert.equal(integratedDa.available, true);
assert.match(integratedDa.sections.gridCurrent, /verificeret modelgridpunkt.*3,2 km fra RavRadars vandpunkt/);
assert.match(integratedDa.sections.gridCurrent, /ikke en direkte måling af lokal bundnær strøm/);
assert.doesNotMatch(integratedDa.sections.gridCurrent, /er lokal bundnær modelstrøm/,
  'model-grid current must never be identified as measured near-bed current');
const integratedEn = presentIntegrated(integrated, { language:'en' });
assert.match(integratedEn.sections.gridCurrent, /verified model grid point.*3\.2 km from RavRadar’s water point/);
assert.doesNotMatch(integratedEn.sections.gridCurrent, /is local near-bed model-grid current/);
for (const [language, pattern] of [
  ['da', /ejer-godkendt regionalt DMI-proxygridpunkt 12,4 km.*ikke et lokalt gridpunkt/],
  ['de', /freigegebenen regionalen DMI-Proxy-Gitterpunkt.*12,4 km.*kein lokaler Gitterpunkt/],
  ['en', /owner-approved regional DMI proxy grid point 12\.4 km.*not a local grid point/],
]) {
  const proxy = structuredClone(integrated);
  proxy.localWeather.currentProvenance = {
    sourceClass:'owner-approved-regional-proxy',
    distanceKm:12.4,
  };
  assert.match(presentIntegrated(proxy, { language }).sections.gridCurrent, pattern);
}
const proxyWithoutDistance = structuredClone(integrated);
proxyWithoutDistance.localWeather.currentProvenance = {
  sourceClass:'owner-approved-regional-proxy',
};
assert.deepEqual(presentIntegrated(proxyWithoutDistance, { language:'da' }), {
  available:false,
  reason:'CURRENT_PROVENANCE_CONTEXT_INVALID',
});
assert.equal(presentIntegrated({
  ...integrated,
  modelBinding:{ ...integrated.modelBinding, unknownRevision:true },
}).available, false, 'Ekstra eller ukendt binding skal afvises');
assert.equal(presentIntegrated({
  ...integrated,
  explanation:{ ...integrated.explanation, transportDiagnostics:{
    ...integrated.explanation.transportDiagnostics,
    engine:'CANDIDATE_G',
  } },
}).available, false, 'Candidate G må ikke fortolkes i et integreret artifact');

const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-presenter-'));
try {
  const files = [
    ['../js/core/ravscore-integrated-explanation-presenter.js', 'ravscore-integrated-explanation-presenter.js'],
    ['./rollback-assets/ravscore-model-contract.js', 'ravscore-model-contract.js'],
    ['./rollback-assets/ravscore-model-bundle.generated.js', 'ravscore-model-bundle.generated.js'],
  ];
  for (const [source, target] of files) {
    await fs.copyFile(new URL(source, import.meta.url), path.join(temporaryRoot, target));
  }
  const candidateContract = await import(`${pathToFileURL(path.join(temporaryRoot, 'ravscore-model-contract.js')).href}?test=1`);
  const candidatePresenter = await import(`${pathToFileURL(path.join(temporaryRoot, 'ravscore-integrated-explanation-presenter.js')).href}?test=1`);
  const candidate = {
    available:true,
    score:58,
    components:{ huntability:68, transport:51, release:63 },
    modelBinding:candidateContract.ravScoreModelBinding(),
    localWeather:{ waterLevelTrendCm3h:-4 },
    explanation:{
      modelId:candidateContract.RAVSCORE_MODEL_ID,
      transportDiagnostics:{
        engine:'CANDIDATE_G',
        transportMemoryReady:true,
        transportMemoryStatus:'READY',
        transportMemoryCoverageHours:48,
        transportMemoryWindowHours:48,
        transportPotential:55,
        deliveryPotential:50,
        transportAndDelivery:51,
        outflowExhaustionGateApplied:false,
      },
      mobilisationDiagnostics:{ mobilisationPotential:63 },
    },
  };
  const presentation = candidatePresenter.presentActiveRavScoreExplanation(candidate, { language:'da' });
  assert.equal(presentation.available, true);
  assert.match(presentation.title, /Candidate G-rollback/);
  assert.match(presentation.sections.lastMile, /15 %/);
  assert.match(presentation.sections.outflowGate, /13 effektive timer/);
  assert.match(presentation.sections.waterLevel, /allerede afleveret eller fastholdt rav/);
  assert.match(presentation.sections.waterLevel, /beviser ikke fysisk koncentration/);
  assert.match(presentation.sections.gridCurrent, /ikke en direkte måling af lokal bundnær strøm/);
  assert.doesNotMatch(presentation.sections.gridCurrent, /bruger lokal bundnær model-gridstrøm/);
  assert.equal(candidateContract.RAVSCORE_CALIBRATION_ELIGIBLE, false);
  assert.equal(candidatePresenter.presentActiveRavScoreExplanation({
    ...candidate,
    modelBinding:integratedBinding(),
  }).available, false, 'Integreret resultat må ikke fortolkes i Candidate G-artifact');
  assert.equal(candidatePresenter.presentActiveRavScoreExplanation({
    ...candidate,
    explanation:{ ...candidate.explanation, transportDiagnostics:{
      ...candidate.explanation.transportDiagnostics,
      engine:'UNKNOWN_ENGINE',
    } },
  }).available, false, 'Ukendt engine/bindingkombination skal fejle lukket');
} finally {
  await fs.rm(temporaryRoot, { recursive:true, force:true });
}

console.log('Aktiv RavScore-presenter vælger exact integreret/Candidate G-binding og afviser blanding eller ukendt engine.');
