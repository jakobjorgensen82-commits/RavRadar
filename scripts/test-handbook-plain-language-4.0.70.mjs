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
  '4.0.308 med Candidate G',
  'exact-head',
  'atomisk cutover',
  'ikke i sig selv produktionsbevis',
  'offline-/rollback-orakel',
]);

const score = byId('score-implementering');
requireMarkers('Det integrerede kodekapitel', `${score?.title || ''}\n${score?.body || ''}`, [
  'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0',
  '4.0.0',
  'COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1',
  'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3',
  'modelContractSha256',
  'modelBundleSha256',
  '34+ kanonisk normaliserede transitive implementeringsfiler',
  'søgeforhold × 0,20',
  'transportbevis × 0,50',
  'rav i bevægelse × 0,30',
  '0,03 m/s er dødzone',
  '0,15 m/s fuld styrke',
  '+10',
  '-8',
  'fuldt i 24 timer',
  'nul ved 48 timer',
  'Hs² × T',
  'fire timers',
  '48 timers halveringstid',
  'delivery = transportPotential × 1',
  'ikke 100 % fysisk levering',
  'ingen 13-timers helscore-gate',
  'Gridstrøm er ikke bølgeorbital',
  'ikke dokumenteret empirisk mere fundpræcis',
]);
forbidMarkers('Det integrerede kodekapitel', score?.body || '', [
  'transportpotentiale 0 sættes hele RavScore til 0',
  '65 % dokumenteret transportpotentiale',
  'mild fysisk begrænsning på højst 15 %',
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
  'Sidste mile er uopløst og score-neutral',
  'ikke dokumenteret empirisk mere fundpræcis',
]);
forbidMarkers('Ekspertens arbejdsplan', matrix.body, [
  'Candidate G bruger',
  'transport 0 efter 13 timers fuld udtransport',
  'fuld udtransport tømmer den ved 13 timer',
  'Transport bruger 48 timers strømhukommelse',
  'blotlægge eller koncentrere allerede afleveret rav',
]);

const runtime = byId('public-runtime-pipeline');
requireMarkers('Runtime- og migrationskapitlet', runtime?.body || '', [
  'præcis fire bundne livefiler',
  'Manifest schema 4',
  'privat otte-filers',
  'ravradar-private-production-runtime',
  'ravScoreCandidateGRollback',
  'current + previous',
  'anonym adgang skal være afvist',
  '210 zoner/673 kystdele',
  'schema-2→schema-4',
  'allerede hentede og validerede afledte vejrhistorik',
  'ikke skal hente flere dages ny cache',
  'target−48 h til target−1 h',
  'Offentlige eller syntetiske pre-target-rækker',
  'kun target og senere rækker scores offentligt',
  '<code>READY</code> ved første offentlige target',
  'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
  '48 timers offentlig opvarmning',
  'exact point-aktivering',
  'ugyldig ordinær kilde ikke må skygge for en gyldig lavere prioritet',
  'fulde 11-feltsbinding',
  'privat migrations-/offline-/rollback-orakel',
  'aldrig samtidig eller automatisk offentlig nødmodel',
  '20260829010000_ravscore_operational_documents_no_history.sql',
  '20260829020000_integrated_trip_calibration_binding.sql',
  'Protected readiness binder begge',
  'eksakt HTTP <code>409</code>',
  'gammel klient bruger sin lokale Candidate G',
  'exact point-aktivering → gyldig integreret bundle → gyldigt integreret checkpoint → dybt valideret engangs-Candidate G-import',
  '<code>INTEGRATED_PENDING</code>',
  'centrale profil forbliver Candidate G',
  'samtidigt <code>INTEGRATED_ACTIVE</code>',
  'live målhash',
  'live kildehash',
  'tredje hash',
  'ingen særskilt Candidate G-assistent-Edge',
  'admin_document_versions',
  'sletter ingen historik',
  '<code>origin/main == GITHUB_SHA</code>',
  'samme validerede checkout og migrationssnapshot',
]);

const operationalRollback = byId('operational-candidate-g-rollback-2026-08-29');
requireMarkers('Den operationelle Candidate G-rollback', `${operationalRollback?.title || ''}\n${operationalRollback?.body || ''}`, [
  'Manuel Candidate G-helrollback',
  'integrated-schema4-to-candidate-g-schema2-v1',
  'ravscore-operational-model-activation',
  'ravscore-operational-model-activation-v3',
  'INTEGRATED_ACTIVE',
  'CANDIDATE_G_PENDING',
  'CANDIDATE_G_ACTIVE',
  'INTEGRATED_PENDING',
  'CANDIDATE_G_ROLLBACK',
  'INTEGRATED_RETURN',
  'CANDIDATE_G_REFRESH',
  '210/673-verifikation',
  'bevarer integreret central profil',
  'samtidigt <code>CANDIDATE_G_ACTIVE</code>',
  'live manifest med gemt source og requested',
  'tredje hash',
  'Scheduleren kan ikke førstegangsaktivere',
  'ingen særskilt Candidate G-assistent-Edge',
  'integrerede Edge afviser Candidate G-bindingen',
  'deterministiske lokale DA/DE/EN-svar',
  'Schema-3-ture og -observationer',
  'calibration_eligible=false',
  'fail-closed/local-only',
  'ikke en Edge/backend-helrollback eller skjult dualmodel',
  'modelContractSha256',
  'modelBundleSha256',
  'først efter regeneration',
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
  'bølgehøjden optræder to steder',
  'fysisk mobiliseringssignal',
  'metode-/sigtbarhed',
  'kan ikke bygge mobilisering',
  'ikke samme positive bølgebidrag talt to gange',
]);
requireMarkers('Grundbogens aktive modeltekst', huntingLearning?.body || '', [
  'den integrerede RavScore',
  'transportbevis',
  'historiske 13-timers helscore-gate er fjernet',
  'Historisk versionsnote',
  'aktive modelkontrakt står nu i kapitel 18 og DEC-0108',
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
  '4.0.308 med Candidate G',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0',
  'stateformat `4.0.0`',
  '`modelContractSha256` binder parameterkontrakten',
  '`modelBundleSha256` binder 34 eller flere kanonisk normaliserede transitive implementeringsfiler',
  'delivery = transportPotential × factor',
  'ikke et estimat om 100 % fysisk levering',
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
  'target−48 h til target−1 h',
  'offentlige eller syntetiske rækker før target',
  '`READY` ved første offentlige target',
  'fulde 11-feltsbinding',
  '`RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`',
  'En ugyldig exact point-aktivering stopper straks',
  'bølgehøjden optræder to steder',
  'Søgevejen kan ikke bygge mobilisering',
  'ikke samme positive bølgebidrag talt to gange',
]);

requireMarkers('Gældende systemspecifikation', systemSpecification, [
  'produktionsverificerede offentlige baseline 4.0.308',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0',
  'modelContractSha256',
  'modelBundleSha256',
  'verificerede kystnormale modelgridstrøm',
  'ikke en måling af lokal bundnær strøm',
  'ingen 13-timers gate, som nulstiller hele RavScore',
  'Hs² × T',
  'Vandstand giver derfor 0 direkte scorepoint',
  'ravradar-private-production-runtime',
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
  'ingen destruktiv oprydning',
  'origin/main == GITHUB_SHA',
  'samme checkout og migrationssnapshot',
  'Vandstandstrend omsættes ikke til en ekstra “hele vandsøjlen”-strøm',
  'dobbeltregne et korreleret signal',
  'eksakt point-aktivering → gyldig integreret continuation → gyldigt checkpoint → dybt valideret Candidate G-state',
  'ugyldig exact point-aktivering stopper straks',
  'target−48 h til target−1 h',
  'Offentlige eller syntetiske pre-target-rækker',
  '`READY` ved første offentlige target',
  'fulde 11-feltsbinding',
  'RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING',
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
  'Aktuel modelstatus 2026-08-29 – offentlig Candidate G, lokal integreret releasekandidat',
  'produktionsverificerede offentlige baseline er 4.0.308',
  'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0',
  'modelContractSha256',
  'modelBundleSha256',
  'delivery = transportPotential × 1',
  'Vandstand giver 0 direkte point',
  'CANDIDATE_G_PENDING',
  'INTEGRATED_PENDING',
  'source/requested-manifesthash',
  'central Candidate-profil',
  'ingen Candidate G-assistent-Edge',
  'calibration_eligible=false',
  'admin_document_versions',
  'origin/main == GITHUB_SHA',
  'Historisk 4.0.117-grundlag',
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
  'Candidate G er fortsat den produktionsverificerede offentlige model gennem 4.0.308',
  'gridstrømmens fulde vægt i 24 timer',
  'cosinusfade til nul ved 48 timer',
  'transport 0 ikke nulstiller mobilisering, jagtbarhed eller hele RavScore',
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
  'genbruger de allerede hentede, validerede og provenancebundne DMI-/Copernicus-forløb',
  'hverken opfinde fortid',
  'private syvfilers runtime',
  'admin_document_versions',
  'migrationen sletter intet',
  'Modelgridstrømmen er ikke lokal bundnær strøm',
  'sidste mile forbliver uopløst og score-neutral',
  '4.0.308-side bruger fortsat Candidate G',
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
