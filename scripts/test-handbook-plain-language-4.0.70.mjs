import fs from 'node:fs';
import {
  GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as integratedBundleManifest,
} from '../js/core/ravscore-model-bundle.generated.js';
import {
  GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as candidateGRollbackBundleManifest,
} from './rollback-assets/ravscore-model-bundle.generated.js';

const book = JSON.parse(fs.readFileSync('docs/handbook/content.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const versionDocument = JSON.parse(fs.readFileSync('version.json', 'utf8'));
const markdown = fs.readFileSync('HANDBOOK-RAVRADAR.md', 'utf8');
const systemSpecification = fs.readFileSync('docs/RavRadar-System-Specification.md', 'utf8');
const ruleEngineSpecification = fs.readFileSync('docs/Rule-Engine.md', 'utf8');
const weatherPipelineSpecification = fs.readFileSync('docs/Weather-Pipeline.md', 'utf8');
const aiKnowledgeBase = fs.readFileSync('docs/ai/AI_KNOWLEDGE_BASE.md', 'utf8');
const aiRoadmap = fs.readFileSync('docs/ai/AI_ROADMAP.md', 'utf8');

if (book.handbookVersion !== pkg.version) {
  throw new Error(`Forkert håndbogsversion: ${book.handbookVersion} mod ${pkg.version}`);
}

const duplicateIds = book.sections
  .map((section) => section.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Dublerede håndbogsid'er: ${duplicateIds.join(', ')}`);

const byId = (id) => book.sections.find((section) => section.id === id);
const releaseContract = versionDocument.releaseContract;
const integratedReleaseBinding = releaseContract?.modelBindings?.integrated;
const candidateGRollbackReleaseBinding = releaseContract?.modelBindings?.candidateGRollback;
const publicManifestAuthority = releaseContract?.publicManifestAuthority;
if (!integratedReleaseBinding || !candidateGRollbackReleaseBinding || !publicManifestAuthority) {
  throw new Error('version.json mangler den centrale releaseContract-modelbinding');
}
const integratedBundleFileCount = integratedBundleManifest?.files?.length;
const candidateGRollbackBundleFileCount = candidateGRollbackBundleManifest?.files?.length;
if (!Number.isInteger(integratedBundleFileCount) || integratedBundleFileCount <= 0
  || !Number.isInteger(candidateGRollbackBundleFileCount) || candidateGRollbackBundleFileCount <= 0) {
  throw new Error('De genererede RavScore-bundlemanifester mangler et gyldigt filantal');
}
const requireMarkers = (label, text, markers) => {
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`${label} mangler: ${marker}`);
  }
};
const forbidMarkers = (label, text, markers) => {
  for (const marker of markers) {
    if (text.includes(marker)) throw new Error(`${label} indeholder erstattet aktiv sandhed: ${marker}`);
  }
};


const operational318 = byId('ravscore-operational-recovery-and-historical-maintenance-4-0-318');
requireMarkers('Den historiske 4.0.318-driftsevidens', `${operational318?.title || ''}\n${operational318?.body || ''}`, [
  'PR #237',
  '<code>33352520408</code>',
  '<code>8c03e25d</code>',
  '<code>33352661061</code>',
  '<code>33352634365</code>',
  '<code>33354263148</code>',
  '<code>rr-20260831034128-210</code>',
  'komplet 210/673 uden syntetiske samples',
  'PR #242 bestod exact-head <code>33408976253</code>',
  'merged som <code>29f39cce</code>',
  'Frisk produktion <code>33412497717</code>',
  'stoppede før artifact, Pages og deploy',
  'Den hårde WAM-gate er bevaret',
]);
forbidMarkers('Den historiske 4.0.318-driftsevidens', operational318?.body || '', [
  'bounded retry-rettelsens PR/commit er åbne',
]);

const active419 = byId('integrated-cutover-data-and-calibration-closure-4-0-318');
requireMarkers(`Den aktive ${pkg.version}-binding`, `${active419?.title || ''}\n${active419?.body || ''}`, [
  `RavScore ${pkg.version}`,
  'Candidate G/4.0.316 er fortsat offentlig',
  `<code>modelContractSha256=${integratedReleaseBinding.modelContractSha256}</code>`,
  `<code>modelBundleSha256=${integratedReleaseBinding.modelBundleSha256}</code>`,
  `over ${integratedBundleFileCount} kanonisk normaliserede transitive implementeringsfiler`,
  'deklarerede forbrugere',
  `<code>modelContractSha256=${candidateGRollbackReleaseBinding.modelContractSha256}</code>`,
  `<code>modelBundleSha256=${candidateGRollbackReleaseBinding.modelBundleSha256}</code>`,
  `over ${candidateGRollbackBundleFileCount} transitive filer`,
  '<code>version.json.releaseContract.modelBindings</code>',
]);

const state6 = byId('integrated-ravscore-state6-history-bounds-2026-08-30');
requireMarkers('Det historiske state-6-kapitel', `${state6?.title || ''}\n${state6?.body || ''}`, [
  'Candidate G er fortsat den eneste offentlige model',
  '4.0.317-testkandidat',
  'state <code>6.0.0</code>',
  '<code>FULL_HISTORY</code>',
  '<code>HISTORY_INCOMPLETE</code>',
  '<code>UNAVAILABLE</code>',
  '<code>EXACT_POINT_SCORE</code>',
  '<code>CONSERVATIVE_TAIL_RESET_POINT_SCORE</code>',
  '<code>bounded-private-48h-history-cold-replay-v3</code>',
  '<code>expectedCausalPositionCount=48</code>',
  '<code>VERIFIED_CAUSAL_HISTORY_WINDOW</code>',
  '<code>UNKNOWN_HISTORY_INTERVAL</code>',
  'også 48 komplette timer',
  '288 timers kausal fortsættelse',
  '<code>conservativeResetAt</code>',
  '168 timers datasikker researchretention',
  '<code>direction-broad-19-history-tie-v2</code>',
  '<code>score-history-water-tie-earliest-v3</code>',
  '<code>score-bands-35-55-75-exceptional90-v1</code>',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5',
  'integrated-schema5-ready-point-to-schema6-history-bounds-v1',
  'integrated-schema6-to-candidate-g-schema2-v3',
  '<code>READY</code>/<code>memoryReady</code>',
  'collapsed bounds, span 0, coverage 48',
  '<code>calibrationEligible=false</code> består separat',
  'atomisk checkpointschema 4',
  '<code>ravscore-continuation-schema6-v2</code>',
  'eksakt otte-fils bundle',
  'Trip-/observationslagring af lower/upper/span/coverage/reasons er implementeret',
  'samlet exact-head-/workflow-/produktionsbevis udestår',
  '4.0.316/<code>49dd4cb</code>',
  '<code>rr-20260830091913-210</code>',
  '210 zoner/673 kystdele',
  '0 aktive zoner og 210 <code>UNAVAILABLE</code>',
  'ikke at state 6 er udgivet eller empirisk mere fundpræcis',
]);

const feggesundPartGate = byId('feggesund-direct-first-two-neighbor-wave-proxy-2026-09-02');
const feggesundPartGateText = `${feggesundPartGate?.title || ''}\n${feggesundPartGate?.summary || ''}\n${feggesundPartGate?.body || ''}`;
requireMarkers('Den aktive Feggesund direct-first-gate', feggesundPartGateText, [
  '<code>DK-B05-11</code>',
  'komplette lokale DMI-WAM-tuple altid',
  'Kun når hele tupletten',
  '<code>DK-B05-10</code>',
  '<code>DK-B05-12</code>',
  'wave-only proxy',
  'Delvis lokal tuple',
  '<code>MISSING</code>',
  'kvadratroden af middelværdien af <code>Hs²</code>',
  'cirkulær FROM-retning',
  '<code>LOW</code>',
  '<code>MODERATE</code>',
  '<code>HIGH</code>',
  'DA/DE/EN',
  '<code>calibrationEligible=false</code>',
  '<code>FULL_HISTORY</code>',
  'currenthistorik',
  'recovery-backfill',
  'land-/vandpunkter eller kystnormal',
  'Direct + proxy skal være 354 og missing 0',
  'ikke lokal surfzonemodel eller bevis for bedre fundpræcision',
]);
forbidMarkers('Den aktive Feggesund direct-first-gate', feggesundPartGateText, [
  'en proxy kan være unødvendig',
  'ikke implementeret',
]);

const ddmStaticContext = byId('ddm-2024-static-context-not-surf-score-2026-08-30');
requireMarkers('DDM 2024/v2-grænsen', `${ddmStaticContext?.title || ''}\n${ddmStaticContext?.body || ''}`, [
  '50 × 50 m middel-dybdegrid',
  'dybde-, kilde- og opmålingsårslag',
  'lavtvandsdata fra satellit og lidar',
  'ikke DDM, fordi den mangler lavtvandsdata',
  'generaliseret 1:100.000',
  'dynamiske sandrevler',
  'aktuelle ripkanaler',
  'ikke som zonetime-score',
  'land-/vandpunkter eller kystnormaler',
]);

const withoutGuide = book.sections.filter((section) => (
  section.id === 'ekspertmatrix'
    ? !section.body.includes('plain-language-intro')
    : !section.body.includes('reader-guide')
));
if (withoutGuide.length) {
  throw new Error(`${withoutGuide.length} kapitler mangler læsehjælp: ${withoutGuide.map((section) => section.id).join(', ')}`);
}

const status = byId('integrated-ravscore-release-candidate-status-2026-08-29');
requireMarkers('Den historiske state-5-status', `${status?.title || ''}\n${status?.body || ''}`, [
  'Historisk: den aldrig-offentlige state-5-releasekandidat',
  '4.0.315-releasekandidaten',
  '4.0.310 med Candidate G',
  'state <code>5.0.0</code>',
  'exact-head',
  'atomiske cutover',
  'ikke produktionsbevis',
  'offline-/rollback-orakel',
  'DEC-0109 er kun dokumentation',
]);

const score = byId('score-implementering');
requireMarkers('Det integrerede kodekapitel', `${score?.title || ''}\n${score?.body || ''}`, [
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  '5.0.0',
  'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2',
  'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4',
  'ravscore-components-huntability-delivery-mobilisation-v4',
  'ravscore-explanation-integrated-v4',
  'DEC-0110',
  'kontrakt- og bundlehash',
  'søgeforhold × 0,20',
  'levering mod kystzonen × 0,50',
  'rav i bevægelse × 0,30',
  '0,03/0,15 m/s',
  '+10',
  '-8',
  '24 timers fuld vægt',
  'nul ved 48 timer',
  'Hs² × T',
  'fire timers',
  'cirka 4/48 timer',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'delivery=supply×factor',
  'physicalDeliveryResolved=false',
  'højst 7,5 rå totalscorepoint fjernes før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'ingen 13-timers helscore-gate',
  'Bølger kan aldrig skabe eller øge supply',
  'ikke dokumenteret empirisk mere fundpræcis',
]);
forbidMarkers('Det integrerede kodekapitel', score?.body || '', [
  'transportpotentiale 0 sættes hele RavScore til 0',
  '65 % dokumenteret transportpotentiale',
  'delivery = transportPotential × 1',
  'sidste mile er uopløst og score-neutral',
  'ravscore-candidate-g.js',
]);

const matrix = byId('ekspertmatrix');
if (!matrix?.title.includes('arbejdsplan')) throw new Error('Ekspertmatrixen mangler');
for (let number = 1; number <= 22; number += 1) {
  const id = `E-${String(number).padStart(2, '0')}`;
  if (!matrix.body.includes(id)) throw new Error(`Ekspertmatrixen mangler ${id}`);
}
requireMarkers('Ekspertens arbejdsplan', matrix.body, [
  '0,03 m/s er dødzone',
  '0,15 m/s fuld styrke',
  'indgående giver +10',
  'udgående -8',
  'første 24 timer vægtes fuldt',
  'nul ved 48',
  'nulstiller ikke hele RavScore',
  'Vandstand giver 0 direkte scorepoint',
  'bestemmer ikke strømretningen',
  'søværts transport af noget mobilt rav',
  'allerede afleveret eller fastholdt rav',
  'beviser ikke fysisk koncentration',
  'Gridstrømmen er ikke undertow',
  'Den fysiske sidste mile er uopløst',
  'afgrænset kausal energivægtet wave-approach med fire timers halveringstid',
  'dæmpe allerede eksisterende supply én gang',
  'ikke dokumenteret empirisk mere fundpræcis',
]);
forbidMarkers('Ekspertens arbejdsplan', matrix.body, [
  'Candidate G bruger',
  'transport 0 efter 13 timers fuld udtransport',
  'fuld udtransport tømmer den ved 13 timer',
  'Transport bruger 48 timers strømhukommelse',
  'blotlægge eller koncentrere allerede afleveret rav',
  'Holder levering score-neutral',
]);

const runtime = byId('public-runtime-pipeline');
requireMarkers('Runtime- og migrationskapitlet', runtime?.body || '', [
  'præcis fire schema-4-livefiler',
  'DEC-0110-cutover',
  'Manifestet binder dataset-id, model/state',
  'private atomiske bundle',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4',
  'signerede, allerede afledte kystnormale currentevidens',
  'læser eller kopierer ikke rå U/V',
  '40 private præ-target-positioner',
  'same-cell native provenance',
  'højst fire timer',
  '<code>1/1024</code>',
  '<code>0,01171875</code>',
  'Præcis 673 gyldige schema-2-states',
  'ét fælles kanonisk target',
  'Candidate G forbliver offentlig',
  'syntetisk eller offentlig historik dannes ikke',
  '48 sammenhængende private, verificerede timepositioner plus reel target',
  'integrated-schema5-to-candidate-g-schema2-v2',
  'samme targettid uden dobbelt recovery-credit',
  'same-model, komplet, atomisk og hashbundet nøddrift',
  'højst 72 timer eller kortere forecastudløb',
  'Cross-model fallback og interpolation er forbudt',
  '<code>VERIFIED_ONLY</code> er kalibreringsegnet',
  'før descriptor, apply, mutation eller offentliggørelse',
  'privat migrations-/offline-/rollback-orakel',
  'aldrig samtidig eller automatisk offentlig nødmodel',
  '20260829010000_ravscore_operational_documents_no_history.sql',
  '20260829020000_integrated_trip_calibration_binding.sql',
  'Protected readiness, exact-head, Edge-<code>409</code>, 210/673',
  'source/PENDING/target/reconcile',
  'holder Candidate G offentlig',
  'aktiveres atomisk',
]);
forbidMarkers('Runtime- og migrationskapitlet', runtime?.body || '', [
  'candidate-g-schema2-private-exact-current-and-wave-direction-rebuild-to-integrated-schema5-v3',
]);

const integratedModel = byId('how-ravradar-decides-amber-arrival');
requireMarkers('Det samlede webhåndbogskapitels migration', integratedModel?.body || '', [
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4',
  'rå U/V læses eller kopieres ikke',
  '40 private præ-target-positioner',
  'same-cell native provenance',
  '<code>1/1024</code>',
  '<code>0,01171875</code>',
  'Præcis 673 gyldige schema-2-states',
  'ét fælles target',
  'Candidate G forbliver offentlig',
  '48 sammenhængende private, verificerede timepositioner plus reel target',
  'WAM-bootstrapinterpolation gælder ikke nøddrift',
]);

const operationalRollback = byId('operational-candidate-g-rollback-2026-08-29');
requireMarkers('Den aktuelle state-6-kontrakt for Candidate G-rollback', `${operationalRollback?.title || ''}\n${operationalRollback?.body || ''}`, [
  'Historisk 55.1 State-5-plan for Candidate G-helrollback',
  'integrated-schema6-to-candidate-g-schema2-v3',
  'ravscore-operational-model-activation',
  'ravscore-operational-model-activation-v4',
  '<code>CANDIDATE_G_PENDING</code>',
  '<code>CANDIDATE_G_ACTIVE</code>',
  '<code>INTEGRATED_PENDING</code>',
  '<code>CANDIDATE_G_ROLLBACK</code>',
  '<code>INTEGRATED_RETURN</code>',
  '<code>CANDIDATE_G_REFRESH</code>',
  '210/673-verifikation',
  'bevarer integreret central profil',
  'samtidigt <code>CANDIDATE_G_ACTIVE</code>',
  'requested/source/third manifest fail-closed',
  'Scheduleren kan kun udføre',
  'ingen Candidate G-assistent-Edge',
  'integreret Edge afviser Candidate G-bindingen',
  'lokale DA/DE/EN-svar',
  '<code>calibration_eligible=false</code>',
  'egne kontrakt- og bundlefingeraftryk',
  'fastsættes på afsluttet head',
]);

const water = byId('vandstand');
const undertow = byId('undertow');
const waves = byId('boelger');
const sources = byId('kilder');
const feedback = byId('feedback-ai');
const huntingLearning = byId('public-amber-hunting-learning-4-0-268');
requireMarkers('Vandstandskapitlet', water?.body || '', [
  'fremadrettede modelændring',
  'bestemmer ikke strømretningen',
  'søværts transport af noget mobilt rav',
  'allerede er afleveret eller fastholdt',
  'beviser ikke, at vandstandsfaldet fysisk har koncentreret ravet',
  'udgående, indgående, langs/for svag inden for ±0,03 m/s eller ukendt/native-hold',
  'score-neutral fælleskontekst',
  'ekstra “hele vandsøjlen”-strøm',
  'ikke bevis for hver lokal proces',
  'ingen direkte dubletterm',
  'residual korrelation',
  'søgbarhedsprioritet, ikke tegn på mere rav eller en sikkerhedsvurdering',
  'DKSS-dokumentation',
  'Copernicus',
]);
requireMarkers('Konto- og turlogkontrakten', feedback?.body || '', [
  'oprindelige, uforanderlige modelbinding',
  'privacy-sikre eksakte <code>model_binding</code>',
  'aktive kanoniske modeloverlay',
  'Candidate G aktuelle',
  'integrerede ture vises som historiske',
  'Ingen gemt tur ommærkes',
  'eksakte 11-feltsbinding',
  'ukendt eller forfalsket modelbinding',
  'calibration_eligible=false',
]);
requireMarkers('Bølgernes to adskilte modelroller', waves?.body || '', [
  'Bølger kan mobilisere, påvirke søgeforhold og afgrænset dæmpe sidste levering',
  '<code>Hs² × T</code>',
  'cirka fire timers',
  'cirka 48 timers halveringstid',
  'metode-/sigtbarhed',
  'kausal energivægtet DMI-WAM-retning med fire timers halveringstid',
  'kan kun dæmpe eksisterende supply højst 15 %',
  'aldrig øge det',
  '<code>FROM</code>',
  '<code>TOWARD</code>',
  'De tre bølgeroller må ikke give hinanden ekstra kredit',
  '<code>physicalDeliveryResolved=false</code>',
]);
requireMarkers('Grundbogens aktive modeltekst', huntingLearning?.body || '', [
  'den integrerede RavScore',
  'transportbevis',
  'historiske 13-timers helscore-gate er fjernet',
  'Historisk versionsnote',
  'aktive modelkontrakt står nu i kapitel 18 og DEC-0110',
]);
requireMarkers('Surfzonekildekritikken', undertow?.body || '', [
  'Undertow',
  'Feeder-/langskyststrøm',
  'Ripstrøm',
  'gridstrøm',
  'ikke som stedfortræder',
  '10.1029/2000JC900084',
  '10.1029/2008JC005153',
  '10.1016/j.margeo.2018.07.015',
  '10.1016/j.margeo.2009.09.011',
  '10.1016/S0025-3227(97)00025-X',
  '10.1016/S0025-3227(02)00193-7',
  '10.1002/2016JC012222',
  '10.1029/2001JC000955',
  'laboratorieforsøg',
  'ikke lavvandsfeltbevis',
  'Gallop m.fl. (2018)',
  '10.1029/2020JC016259',
  'treugers feltstudie',
  '10.5194/gmd-18-319-2025',
  '10.1016/j.watres.2023.120329',
  '10.1016/j.envpol.2017.01.085',
  '1 041 kg/m³',
  'ikke en dansk surfzonemodel',
  'Hverken gridstrøm, vandstand eller bølger alene bestemmer sidste-mile-fortegnet',
  'systematisk ravmonitorering mangler',
  '0 direkte scorepoint',
  'ingen landsdækkende faldende-vand-regel',
]);
forbidMarkers('Surfzonekildekritikken', undertow?.body || '', [
  'McCarroll m.fl. (2018)',
  'beskriver faldende-/lavvandsobservationer',
  'blotlægge eller koncentrere tidligere afleveret rav',
]);
requireMarkers('Ravkildens bibliografiske kontrakt', sources?.body || '', [
  'Environmental Pollution 224',
  '10.1016/j.envpol.2017.01.085',
  '10.1016/S0025-3227(02)00193-7',
  '10.5194/gmd-18-319-2025',
  '10.1016/j.watres.2023.120329',
  'systematisk ravmonitorering mangler',
  'ingen dansk tærskel eller universel retningseffekt',
]);
forbidMarkers('Ravkildens bibliografiske kontrakt', sources?.body || '', [
  'Baltic amber*. Marine Pollution Bulletin',
]);

const activeGenericIds = [
  'rav-egenskaber',
  'proceskaede',
  'boelger',
  'stroem',
  'vind',
  'vandstand',
  'langskyst',
  'undertow',
  'score-implementering',
  'regler',
  'scenarier',
  'boelgespektrum',
  'regional-oceanografi',
  'kodematrix',
  'flere-transportveje',
  'how-ravradar-decides-amber-arrival',
  'public-runtime-pipeline',
  'operational-candidate-g-rollback-2026-08-29',
];
const activeGenericText = activeGenericIds
  .map((id) => `${byId(id)?.title || ''}\n${byId(id)?.body || ''}`)
  .join('\n');
forbidMarkers('Aktive generiske kapitler', activeGenericText, [
  'js/core/ravscore-candidate-g.js',
  'js/core/ravscore-candidate-g-state-pipeline.js',
  'transport 0 giver samlet RavScore 0',
  'hele RavScore 0, selv om',
  'Transport starter på 34',
  'Frigivelse starter på 22',
  '0,15–0,65 m/s bonus',
  '3–18 timer efter høj energi',
]);

for (const historicalId of [
  'ravscore-operational-recovery-and-historical-maintenance-4-0-318',
  'integrated-ravscore-state6-history-bounds-2026-08-30',
  'causal-production-bounded-recovery-4-0-289',
  'candidate-g-rolling-boundary-continuity-4-0-286',
  'candidate-g-state-continuity-recovery-4-0-272',
  'prelaunch-expert-admin-visible-ranking-4-0-270',
  'public-current-score-explanations-4-0-269',
  'production-shadow-validation-4-0-113',
  'verified-current-history-readiness-4-0-220',
  'candidate-g-wave-mobilisation-memory-2026-08-23',
]) {
  const section = byId(historicalId);
  const text = `${section?.title || ''} ${section?.summary || ''} ${section?.body || ''}`.toLowerCase();
  if (!text.includes('historisk')) throw new Error(`${historicalId} er ikke tydeligt historisk markeret`);
}

requireMarkers('Markdown-håndbogens aktuelle status og kontrakt', markdown, [
  'Frisk vejrvisning kræver ikke en gyldig ældre reserve – offentlig 4.0.316',
  '33345476979',
  'rr-20260831010337-210',
  '33347230240',
  'rr-20260831012407-210',
  'VERIFIED_ONLY',
  'syntheticSampleCount=0',
  '0 aktive zoner og 210 `UNAVAILABLE`',
  'Aktuel status – RavScore 4.0.319 first-cutover-kandidat',
  'Status for det aktuelle modelarbejde – lokal 4.0.319-cutoverkandidat, ikke produktion',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `6.0.0`',
  'DEC-0110/DEC-0112',
  '`modelContractSha256` binder parameterkontrakten',
  `4.0.319 er låst med ` + '`modelContractSha256=' + integratedReleaseBinding.modelContractSha256 + '`',
  '`modelBundleSha256=' + integratedReleaseBinding.modelBundleSha256 + '` over ' + integratedBundleFileCount + ' kanonisk normaliserede transitive implementeringsfiler',
  'deklarerede forbrugere',
  '`ravscore-schema6-with-candidate-g-rollback-companion`',
  '`candidate-g-rollback-ready-companion`',
  '`ravscore-continuation-schema6-v2`',
  '`modelContractSha256=' + candidateGRollbackReleaseBinding.modelContractSha256 + '`',
  '`modelBundleSha256=' + candidateGRollbackReleaseBinding.modelBundleSha256 + '`',
  'over ' + candidateGRollbackBundleFileCount + ' transitive filer',
  '`factor=clamp(1-0.15×W×(1-approach),0.85,1)`',
  '`delivery=supply×factor`',
  '`physicalDeliveryResolved=false`',
  'højst 7,5 rå totalscorepoint kan fjernes før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'ingen helscore-gate ved 13 timers udgående strøm',
  'må ikke kaldes empirisk mere fundpræcis',
  '`FULL_HISTORY`',
  '`HISTORY_INCOMPLETE`',
  '`UNAVAILABLE`',
  '`bounded-private-48h-history-cold-replay-v3`',
  '`VERIFIED_CAUSAL_HISTORY_WINDOW`',
  '`UNKNOWN_HISTORY_INTERVAL`',
  'også efter 48/48',
  'først lukkes efter 288 timers kausal recovery',
  'integrated-schema6-to-candidate-g-schema2-v3',
  'atomisk checkpointschema 4/cache-v2',
  '`READY`/`memoryReady` Candidate G-runtime',
  'collapsed bounds og 48 timers coverage',
  '`calibrationEligible=false` består',
  'cross-model fallback og interpolation er forbudt',
  'højst 72 timer eller kortere forecastudløb',
  'Feggesund/`DK-B05-11` har et vedvarende lokalt bølgehul',
  'Den nye regel er direct-first',
  'Kun når hele tupletten med signifikant bølgehøjde, periode og middelretning mangler',
  '`DK-B05-10`',
  '`DK-B05-12`',
  '`calibrationEligible=false`',
  'direkte + proxy skal være 354',
  'missing skal være 0',
  'ikke en lokal surfzonemodel',
]);

requireMarkers('Gældende systemspecifikation', systemSpecification, [
  'offentlige 4.0.316/Candidate G-baseline',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'stateversion `6.0.0`',
  'DEC-0112',
  'modelContractSha256',
  'modelBundleSha256',
  'direction-broad-19-history-tie-v2',
  'score-history-water-tie-earliest-v3',
  '`FULL_HISTORY`',
  '`HISTORY_INCOMPLETE`',
  '`UNAVAILABLE`',
  '288 timer',
  '168 timers researchretention har ingen scoreeffekt',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'delivery=supply×factor',
  'den rå totalscore højst dæmpes 7,5 point før slutafrunding',
  'den viste heltalsscore kan derfor ændres 8 point',
  'physicalDeliveryResolved=false',
  'ikke en måling af lokal bundnær strøm',
  'ingen 13-timers gate, som nulstiller hele RavScore',
  'Hs² × T',
  'Vandstand giver derfor 0 direkte scorepoint',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5',
  'integrated-schema5-ready-point-to-schema6-history-bounds-v1',
  'bounded-private-48h-history-cold-replay-v3',
  'expectedCausalPositionCount=48',
  'VERIFIED_CAUSAL_HISTORY_WINDOW',
  'UNKNOWN_HISTORY_INTERVAL',
  'også ved 48 timer',
  'integrated-schema6-to-candidate-g-schema2-v3',
  '`READY`/`memoryReady` Candidate G-runtime',
  '`FULL_HISTORY` + `EXACT_POINT_SCORE`',
  'collapsed bounds, span 0, coverage 48',
  '`calibrationEligible=false` består separat',
  'eksakt point-aktivering → gyldig integreret privat continuation → gyldigt integreret checkpoint → engangs-Candidate G-import',
  'Første cutover er `INITIAL_INTEGRATED_CUTOVER`',
  'ingen særskilt Candidate G-assistent-Edge',
  'Cross-model fallback og interpolation er forbudt',
  'Feggesund/`DK-B05-11` har én fast wave-only undtagelse',
  'Komplet lokal DMI-WAM-tuple vinder altid',
  '`DK-B05-10`',
  '`DK-B05-12`',
  '`calibrationEligible=false`',
  '3 × 118',
  'direct + proxy = 354',
  'missing = 0',
  'ikke lokal surfzonemodel eller empirisk fundpræcisionsbevis',
]);
forbidMarkers('Gældende systemspecifikation', systemSpecification, [
  'Når transport er 0, er den samlede RavScore 0',
  'Den bundnære strøm vurderes mod den lokale kystretning',
  'Denne specifikation beskriver den aktive Candidate G-arkitektur',
  'hel rollback af central profil, Edge/backend og Pages',
]);

requireMarkers('AI-vidensbasens aktuelle modelstatus', aiKnowledgeBase, [
  'Aktuelt DEC-0110/0112-modelarbejde – state 6 er ikke udgivet',
  'Offentlig 4.0.316 bruger fortsat Candidate G',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `6.0.0`',
  'direkte input→`UNAVAILABLE`',
  'historikmissing→konservativ `HISTORY_INCOMPLETE`',
  '48 h aktiv currenthistorik',
  '168 h score-neutral researchretention',
  '288/40 h conservative tail closure',
  'bounded-private-48h-history-cold-replay-v3',
  '48/48 dokumenterer et fuldt currentvindue',
  'exact full-history med collapsed bounds/coverage 48',
  '`calibrationEligible=false` består',
  'Trip-bounds-persistens er lukket lokalt',
  'Checkpointschema 4/cache-v2 med atomisk READY companion er implementeret',
  'rr-20260830091913-210',
  'ikke state-6-bevis',
  'må ikke kaldes offentlig eller empirisk mere fundpræcis',
]);
forbidMarkers('AI-vidensbasens aktuelle modelstatus', aiKnowledgeBase, [
  '## Aktuel modelstatus 2026-08-30 – offentlig Candidate G, 4.0.315 integreret releasekandidat',
]);

requireMarkers('AI-roadmappets aktuelle modelstatus', aiRoadmap, [
  'Offentlig baseline – 4.0.316 Candidate G',
  'Model-P0 – færdiggør og verificér den samlede DEC-0110-model',
  'state `6.0.0`',
  'bounded-private-48h-history-cold-replay-v3',
  'også ved 48/48 `HISTORY_INCOMPLETE`',
  'Trip-/observationspersistens af lower/upper/span/coverage/reasons er lokalt lukket',
  'Checkpointschema 4/cache-v2',
  'parrede READY Candidate G-companion',
  'modelContractSha256',
  'modelBundleSha256',
  'offentlig 210/673 mobil-/desktopkontrol',
  'ingen Candidate G-assistent-Edge',
  'Historisk roadmaparkiv',
]);

requireMarkers('Regelværkstedspecifikationen', ruleEngineSpecification, [
  'Candidate G er fortsat den produktionsverificerede offentlige model i 4.0.316',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `6.0.0`',
  'DEC-0110/0112-cutover',
  'gridstrømmens fulde vægt i 24 timer',
  'cosinusfade til nul ved 48 timer',
  'transport 0 ikke nulstiller mobilisering, jagtbarhed eller hele RavScore',
  'kausal energivægtet bølgeapproach med fire timers halveringstid',
  'delivery=supply×factor',
  'aldrig kan skabe/øge supply',
  'højst kan fjerne 7,5 rå totalscorepoint før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'physicalDeliveryResolved=false',
  'direkte inputmissing (`UNAVAILABLE`)',
  'historikmissing (`HISTORY_INCOMPLETE`',
  '168-timers score-neutral researchretention',
  '288-timers wave-tail',
  'conservativeResetAt',
  'gældende integrerede modelbinding',
  'Assistentens integrerede Edge rulles ikke tilbage til Candidate G',
]);
forbidMarkers('Regelværkstedspecifikationen', ruleEngineSpecification, [
  'særreglen om, at transport 0 giver samlet score 0',
  'versionsstyret Candidate G-kode og RDKS-beslutning',
]);

requireMarkers('Vejrpipelinespecifikationen', weatherPipelineSpecification, [
  'Kildeprioriteten er komponentvis, ikke én fælles kæde',
  'DMI er førstevalg',
  'kontrollerede Copernicus-/regionalproxykontrakt',
  'Open-Meteo/MET-strøm må ikke blive scoregrundlag',
  'Cache og privat runtime',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`/state `6.0.0',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5',
  'signerede, allerede afledte kystnormale currentevidens',
  'læse/kopiere rå U/V',
  'præcis 673 schema-2-states',
  'ét fælles kanonisk target',
  '40 private præ-target-positioner',
  'same-cell native provenance',
  'højst fire timer',
  'Udeladt EWMA-hale er højst `1/1024`',
  'rå-scorefejl er højst `0.01171875`',
  'bevarer Candidate G offentlig',
  'ingen syntetisk eller offentlig historik',
  'bounded-private-48h-history-cold-replay-v3',
  'expectedCausalPositionCount=48',
  'VERIFIED_CAUSAL_HISTORY_WINDOW',
  'UNKNOWN_HISTORY_INTERVAL',
  'stadig `HISTORY_INCOMPLETE` — også ved 48 timer',
  '288 timers kausal recovery',
  'strøm-interpolation må heller ikke erstatte manglende evidens',
  'private hashbundne runtime',
  'beskyttet state-6-checkpoint',
  'integrated-schema5-ready-point-to-schema6-history-bounds-v1',
  'integrated-schema6-to-candidate-g-schema2-v3',
  'fulde 11-feltsbinding',
  'samme targettime',
  'recovery-credit',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'som dæmper allerede eksisterende supply',
  'aldrig opretter eller øger det',
  'Modelgridstrømmen er ikke lokal bundnær strøm',
  'cirka 1 km DW- og 5 km NSB-grid',
  'øverste lag er 8 m i NSBS/Vadehavet og ellers 2 m',
  'offentlige 4.0.316-side bruger fortsat Candidate G',
  '33345476979',
  'rr-20260831010337-210',
  '33347230240',
  'rr-20260831012407-210',
  'VERIFIED_ONLY',
  'syntheticSampleCount=0',
  'Feggesund har én fast direct-first-undtagelse',
  'FEGGESUND_TWO_NEIGHBOR_WAVE_INTERPOLATION',
  '`DK-B05-10`',
  '`DK-B05-12`',
  '`calibrationEligible=false`',
  '3 × 118 privacy-sikre dispositioner',
  'direct + proxy = 354',
  'missing = 0',
  'aldrig current, historik, recovery-backfill',
  'ravScoreCandidateGRollback',
  'CANDIDATE_G_PENDING',
  'INTEGRATED_PENDING',
  'source/PENDING/target/reconcile',
  'Ordinary schedulermaintenance bruger `CANDIDATE_G_REFRESH` på exact current Candidate G',
  'ingen særskilt Candidate G-assistent-Edge',
  'Vandstandstrend bliver ikke konverteret til en ekstra strømvektor',
  'DMI DKSS',
  'Copernicus Baltic NEMO',
  'dobbeltregne korreleret dynamik',
]);

const installSql = fs.readFileSync('supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql', 'utf8');
const sqlPayload = JSON.stringify(book).replaceAll("'", "''");
if (!installSql.includes(`values('handbook','${sqlPayload}'::jsonb,null)`)) {
  throw new Error('Supabase-installationsfilens håndbog er ikke identisk med den aktuelle webhåndbog');
}

console.log(`OK: ${book.sections.length} kapitler har læsehjælp og den integrerede RavScore-kontrakt er dokumenteret uden aktiv Candidate G-modsigelse.`);
