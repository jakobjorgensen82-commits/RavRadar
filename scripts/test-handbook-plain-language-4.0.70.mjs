import fs from 'node:fs';

const book = JSON.parse(fs.readFileSync('docs/handbook/content.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
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

const withoutGuide = book.sections.filter((section) => (
  section.id === 'ekspertmatrix'
    ? !section.body.includes('plain-language-intro')
    : !section.body.includes('reader-guide')
));
if (withoutGuide.length) {
  throw new Error(`${withoutGuide.length} kapitler mangler læsehjælp: ${withoutGuide.map((section) => section.id).join(', ')}`);
}

const status = byId('integrated-ravscore-release-candidate-status-2026-08-29');
requireMarkers('Aktuel status', `${status?.title || ''}\n${status?.body || ''}`, [
  'lokal releasekandidat',
  '4.0.310 med Candidate G',
  'exact-head',
  'atomiske cutover',
  'ikke produktionsbevis',
  'offline-/rollback-orakel',
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
requireMarkers('Den operationelle Candidate G-rollback', `${operationalRollback?.title || ''}\n${operationalRollback?.body || ''}`, [
  'Manuel Candidate G-helrollback',
  'integrated-schema5-to-candidate-g-schema2-v2',
  'ravscore-operational-model-activation',
  'ravscore-operational-model-activation-v3',
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
  'lokal releasekandidat, ikke produktion',
  '4.0.310 med Candidate G',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'stateformat `5.0.0`',
  'DEC-0110',
  '`modelContractSha256` binder parameterkontrakten',
  '`modelBundleSha256` binder 34 eller flere kanonisk normaliserede transitive implementeringsfiler',
  '`factor=clamp(1-0.15×W×(1-approach),0.85,1)`',
  '`delivery=supply×factor`',
  '`physicalDeliveryResolved=false`',
  'højst 7,5 rå totalscorepoint kan fjernes før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'ingen helscore-gate ved 13 timers udgående strøm',
  'Faldende vand bestemmer ikke strømretningen',
  'falde sammen med en søværts transportvej for mobilt rav',
  'blotlægge rav, som allerede er afleveret eller fastholdt',
  'ikke bevis for, at vandstandsfaldet fysisk har koncentreret ravet',
  '10.1029/2000JC900084',
  '10.1029/2008JC005153',
  '10.1016/j.margeo.2018.07.015',
  '10.1016/j.margeo.2009.09.011',
  '10.1016/S0025-3227(97)00025-X',
  '10.1016/S0025-3227(02)00193-7',
  '10.1002/2016JC012222',
  '10.1029/2001JC000955',
  'Gallop m.fl. (2018)',
  'laboratorieforsøg på en fast revlestrand',
  'ikke feltbevis for en lavvandsregel',
  '10.1029/2020JC016259',
  '10.5194/gmd-18-319-2025',
  '10.1016/j.watres.2023.120329',
  '10.1016/j.envpol.2017.01.085',
  'Environmental Pollution 224',
  'må ikke kaldes empirisk mere fundpræcis',
  "Protected readiness binder begge id'er",
  '`INTEGRATED_PENDING`',
  'centrale profil fortsat er Candidate G',
  'samtidigt status til `INTEGRATED_ACTIVE`',
  'offentlige manifesthash er det aftalte mål',
  '`20260829010000_ravscore_operational_documents_no_history.sql`',
  '`20260829020000_integrated_trip_calibration_binding.sql`',
  'eksakt HTTP `409`',
  '`ravScoreCandidateGRollback`',
  '`ravscore-operational-model-activation`',
  '`CANDIDATE_G_PENDING`',
  '`CANDIDATE_G_ACTIVE`',
  '`INTEGRATED_PENDING`',
  '`INTEGRATED_RETURN`',
  '`CANDIDATE_G_REFRESH`',
  'ingen særskilt Candidate G-assistent-Edge',
  'deterministiske lokale svar på dansk, tysk eller engelsk',
  '`calibration_eligible=false`',
  '`admin_document_versions`',
  'sletter ingen historik',
  '`origin/main`',
  '`GITHUB_SHA`',
  'samme validerede checkout og migrationssnapshot',
  'ekstra “hele vandsøjlen”-strøm',
  'ingen direkte dubletterm',
  'residual korrelation',
  'oprindelige, uforanderlige modelbinding',
  'aktive kanoniske modeloverlay',
  'eksakt Candidate G aktuelle, men fortsat `calibration_eligible=false`',
  'integrerede ture vises som historiske',
  'eksakte 11-feltsbinding',
  'ukendt eller forfalsket modelbinding',
  'præcis 48 private, verificerede timer plus den reelle targettime',
  'Der dannes ingen syntetisk eller offentlig historik',
  'Cross-model fallback og interpolation er forbudt',
  'fulde 11-feltsbinding',
  'integrated-schema5-to-candidate-g-schema2-v2',
  'samme targettid uden dobbelt recovery-credit',
  'komplet, atomisk og hashbundet state fra samme integrerede model',
  'højst 72 timer eller kortere forecastudløb',
  '`VERIFIED_ONLY` er kalibreringsegnet',
  'bølgehøjden optræder to steder',
  'Søgevejen kan ikke bygge mobilisering',
  'ikke samme positive bølgebidrag talt to gange',
]);

requireMarkers('Gældende systemspecifikation', systemSpecification, [
  'produktionsverificerede offentlige baseline 4.0.310',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'stateversion `5.0.0`',
  'DEC-0110',
  'modelContractSha256',
  'modelBundleSha256',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'delivery=supply×factor',
  'den rå totalscore højst dæmpes 7,5 point før slutafrunding',
  'den viste heltalsscore kan derfor ændres 8 point',
  'physicalDeliveryResolved=false',
  'verificerede kystnormale modelgridstrøm',
  'ikke en måling af lokal bundnær strøm',
  'ingen 13-timers gate, som nulstiller hele RavScore',
  'Hs² × T',
  'Vandstand giver derfor 0 direkte scorepoint',
  'private hashbundne runtime',
  'eksakt point-aktivering → gyldig integreret privat continuation → gyldigt integreret checkpoint → engangs-Candidate G-import',
  'Første cutover er `INITIAL_INTEGRATED_CUTOVER`',
  'centrale profil forbliver Candidate G',
  'samtidigt `INTEGRATED_ACTIVE`',
  'live målhash',
  'live kildehash',
  'ingen særskilt Candidate G-assistent-Edge',
  '20260829010000_ravscore_operational_documents_no_history.sql',
  '20260829020000_integrated_trip_calibration_binding.sql',
  'eksakt HTTP `409`',
  'ravScoreCandidateGRollback',
  'ravscore-operational-model-activation',
  'CANDIDATE_G_PENDING',
  'CANDIDATE_G_ACTIVE',
  'INTEGRATED_PENDING',
  'INTEGRATED_RETURN',
  'CANDIDATE_G_REFRESH',
  'deterministiske lokale DA/DE/EN-svar',
  'calibration_eligible=false',
  'admin_document_versions',
  'sletter ingen eksisterende `admin_document_versions`-rækker',
  'origin/main == GITHUB_SHA',
  'samme checkout og migrationssnapshot',
  'Vandstandstrend omsættes ikke til en ekstra “hele vandsøjlen”-strøm',
  'dobbeltregne et korreleret signal',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4',
  'signerede, allerede afledte kystnormale currentevidens',
  'læser/kopierer ikke rå U/V',
  'præcis 673 validerede schema-2-states',
  'ét fælles kanonisk target',
  '40 private præ-target-positioner',
  'same-cell native provenance',
  'højst fire timer',
  'udeladte EWMA-hale er højst `1/1024`',
  'rå-scorefejl er højst `0.01171875`',
  'Candidate G forbliver offentlig',
  '48 sammenhængende private, proveniensverificerede timepositioner plus den reelle targetrække',
  'fulde 11-feltsbinding',
  'integrated-schema5-to-candidate-g-schema2-v2',
  'samme targettid',
  'ekstra recovery-credit',
  'metode-/sigtbarhed i 20 %-komponenten',
  'samme positive procesbidrag tælles to gange',
  'Schema 3 accepterer kun eksakt integreret eller forseglet Candidate G-11-feltsbinding',
  'ukendt eller forfalsket binding afvises',
  'Pages udleder current/historical/ineligible på ny mod det aktive overlay',
]);
forbidMarkers('Gældende systemspecifikation', systemSpecification, [
  'Når transport er 0, er den samlede RavScore 0',
  'Den bundnære strøm vurderes mod den lokale kystretning',
  'Denne specifikation beskriver den aktive Candidate G-arkitektur',
  'hel rollback af central profil, Edge/backend og Pages',
]);

requireMarkers('AI-vidensbasens aktuelle modelstatus', aiKnowledgeBase, [
  'Aktuel modelstatus 2026-08-30 – offentlig Candidate G, 4.0.315 integreret releasekandidat',
  'produktionsverificerede offentlige baseline er 4.0.310',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `5.0.0`',
  'DEC-0110',
  'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2',
  'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4',
  'ravscore-components-huntability-delivery-mobilisation-v4',
  'ravscore-explanation-integrated-v4',
  'Slutdigests fastlåses først på den afsluttede head',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'delivery=supply×factor',
  'maksimal rå totalscoredæmpning er 7,5 point før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'physicalDeliveryResolved=false',
  'vandstand giver derfor 0 direkte point',
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4',
  'signerede, allerede afledte kystnormale currentevidens',
  'rå U/V læses/kopieres ikke',
  'Præcis 673 gyldige schema-2-states',
  'ét fælles kanonisk target',
  '40 private præ-target-positioner',
  'same-cell native provenance',
  'højst fire timer',
  'Udeladt EWMA-hale er højst `1/1024`',
  'rå-scorefejl er højst `0.01171875`',
  'Candidate G forbliver offentlig',
  '48 sammenhængende private verificerede timepositioner plus den reelle targetrække',
  'integrated-schema5-to-candidate-g-schema2-v2',
  'samme targettid uden dobbelt recovery-credit',
  'komplet atomisk continuation fra samme integrerede model i højst 72 timer',
  'cross-model fallback og interpolation er forbudt',
  'Kun `VERIFIED_ONLY` er kalibreringsegnet',
  'reconstructed/emergency og ture er ikke kalibreringsgrundlag',
  'privat migration-/offline-/rollback-orakel',
  'exact-head, merge, frisk produktion og offentlig kontrol mangler',
]);
forbidMarkers('AI-vidensbasens aktuelle modelstatus', aiKnowledgeBase, [
  '## 4.0.308-kandidat',
  '## 4.0.307-kandidat',
  '## RavScore og historisk state',
]);

requireMarkers('AI-roadmappets aktuelle modelstatus', aiRoadmap, [
  'Produktionsverificeret smårettelsesspor – 4.0.308',
  'PR #220 exact-head `33221847955`',
  'P0 lokal releasekandidat – én integreret næste RavScore-generation',
  'modelContractSha256',
  'modelBundleSha256',
  'offentlig 210/673 mobil-/desktopkontrol',
  'ingen Candidate G-assistent-Edge',
  'HEAD == origin/main == GITHUB_SHA',
  'Historisk roadmaparkiv',
]);
forbidMarkers('AI-roadmappets aktuelle modelstatus', aiRoadmap, [
  '## Aktivt smårettelsesspor – 4.0.308',
  '## Parallelt P1 – mindre rettelser uden modeloverlap',
]);

requireMarkers('Regelværkstedspecifikationen', ruleEngineSpecification, [
  'Candidate G er fortsat den produktionsverificerede offentlige model i 4.0.310',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `5.0.0`',
  'DEC-0110-cutover',
  'gridstrømmens fulde vægt i 24 timer',
  'cosinusfade til nul ved 48 timer',
  'transport 0 ikke nulstiller mobilisering, jagtbarhed eller hele RavScore',
  'kausal energivægtet bølgeapproach med fire timers halveringstid',
  'delivery=supply×factor',
  'aldrig kan skabe/øge supply',
  'højst kan fjerne 7,5 rå totalscorepoint før slutafrunding',
  'vist RavScore kan derfor ændres 8 point',
  'physicalDeliveryResolved=false',
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
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4',
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
  '48 sammenhængende private, verificerede timepositioner plus den reelle targetrække',
  'strøm-interpolation må ikke erstatte manglende evidens',
  'private hashbundne runtime',
  'beskyttet state-5-checkpoint',
  'fulde 11-feltsbinding',
  'samme targettime',
  'recovery-credit',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
  'state `5.0.0`',
  'factor=clamp(1-0.15×W×(1-approach),0.85,1)',
  'kan kun dæmpe allerede eksisterende supply',
  'kan aldrig oprette eller øge det',
  'Modelgridstrømmen er ikke lokal bundnær strøm',
  '4.0.310-side bruger fortsat Candidate G',
  'ravScoreCandidateGRollback',
  'CANDIDATE_G_PENDING',
  'INTEGRATED_PENDING',
  'source/PENDING/target/reconcile',
  'Scheduler kan kun `CANDIDATE_G_REFRESH`',
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
