import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { forecastDateKeyForDayOffset, forecastDateKeyInTimeZone } from '../js/core/forecast-calendar.js';
import { presentIntegratedRavScoreExplanation } from '../js/core/ravscore-integrated-explanation-presenter.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { askRavRadar, publicAssistantContext } from '../js/services/rav-assistant.js';

const memory = new Map();
globalThis.localStorage ??= {
  getItem:key => memory.get(String(key)) ?? null,
  setItem:(key, value) => memory.set(String(key), String(value)),
};

function integratedResult(waterPhase = 'FALLING', currentRelation = 'OUTBOUND') {
  const modelBinding = ravScoreModelBinding();
  return {
    available: true,
    score: 64,
    modelBinding,
    level: 'fair',
    components: { huntability: 72, transport: 61, release: 60 },
    explanation: {
      ...modelBinding,
      transportDiagnostics: {
        engine: 'INTEGRATED_COASTAL_PROCESS',
        lastMileScoreEffect: 'NONE',
        lastMileStatus: 'LAST_MILE_UNRESOLVED_SCORE_NEUTRAL',
        lastMilePhysicalDeliveryResolved: false,
        lastMileStructuralUncertainty: true,
        resolvedSurfZoneIncluded: false,
        currentMemoryReady: true,
        currentMemoryStatus: 'READY',
        currentMemoryCoverageHours: 47.5,
        currentMemoryWindowHours: 48,
      },
      mobilisationDiagnostics: { mobilisationPotential: 60 },
      waterLevelContext: {
        available: true,
        phase: waterPhase,
        jointContextCode: waterPhase === 'FALLING'
          ? `FALLING_WITH_${currentRelation}_CURRENT_CONTEXT`
          : `${waterPhase}_CURRENT_NOT_INTERPRETED_AS_TIDAL_PHASE`,
        currentRelation,
        currentRelationDeadbandMps: 0.03,
        trendSemantics: 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE',
        scoreEffectPoints: 0,
        transportEffect: 'NONE',
      },
    },
  };
}

const languageExpectations = {
  da: [/Faktor 1/, /0 scorepoint/, /undertow/, /feeder- eller langskyststrøm/, /ripstrømme/, /noget mobilt rav ud/, /lokal batymetri/],
  de: [/Faktor 1/, /0 Scorepunkte/, /Undertow/, /Küstenlängs-/, /Rippströmungen/, /Teil mobilen Bernsteins seewärts/, /lokale Bathymetrie/],
  en: [/Factor 1/, /0 score points/, /undertow/, /longshore current/, /rip currents/, /some mobile amber seaward/, /local bathymetry/],
};
for (const [language, patterns] of Object.entries(languageExpectations)) {
  const presentation = presentIntegratedRavScoreExplanation(integratedResult(), { language });
  assert.equal(presentation.available, true, `${language}: integreret forklaring skal være tilgængelig`);
  const text = [presentation.title, presentation.summary, ...presentation.facts].join('\n');
  for (const pattern of patterns) assert.match(text, pattern, `${language}: forklaringen mangler ${pattern}`);
  assert.match(presentation.facts[0], language === 'en' ? /47\.5 of 48/ : /47,5 (?:af|von) 48/,
    `${language}: memory coverage må ikke afrundes op til et falsk komplet vindue`);
  assert.match(text, language === 'da' ? /ikke 100 % levering/i
    : language === 'de' ? /nicht 100 % Lieferung/i
      : /not 100% delivery/i,
  `${language}: score-neutral faktor skal udtrykkeligt afvises som fysisk levering`);
}

for (const phase of ['FALLING', 'RISING', 'STABLE', 'UNKNOWN']) {
  const presentation = presentIntegratedRavScoreExplanation(integratedResult(phase), { language:'da' });
  assert.equal(presentation.available, true, `${phase}: pointneutral vandkontekst skal kunne forklares`);
  assert.match(presentation.facts.join(' '), /0 scorepoint/);
}
const fallingContexts = {
  OUTBOUND:/samtidig med verificeret søværts gridstrøm/i,
  INBOUND:/samtidig med verificeret gridstrøm mod kystzonen/i,
  ALONG_OR_WEAK:/højst ±0,03 m\/s[\s\S]*langs\/for svag/i,
  UNKNOWN_OR_NATIVE_HOLD:/ukendt eller holdes på kildens native cadence/i,
};
for (const [currentRelation, pattern] of Object.entries(fallingContexts)) {
  for (const language of ['da','de','en']) {
    const presentation = presentIntegratedRavScoreExplanation(
      integratedResult('FALLING', currentRelation),
      { language },
    );
    assert.equal(presentation.available, true,
      `${language}/${currentRelation}: fælleskonteksten skal kunne forklares`);
    assert.equal(presentation.waterCurrentRelation, currentRelation);
    if (language === 'da') assert.match(presentation.sections.waterLevel, pattern);
    assert.match(presentation.sections.waterLevel, language === 'da'
      ? /bestemmer ikke strømretningen/i
      : language === 'de' ? /bestimmt nicht die Strömungsrichtung/i
        : /does not determine current direction/i);
    assert.match(presentation.sections.waterLevel, language === 'da'
      ? /allerede afleveret eller fastholdt rav/i
      : language === 'de' ? /bereits angelieferten oder (?:hinter einer Sandbank )?zurückgehaltenen Bernstein/i
        : /amber already delivered or retained/i);
    assert.match(presentation.sections.waterLevel, language === 'da'
      ? /beviser ikke.*fysisk.*koncentr/i
      : language === 'de' ? /beweist(?: aber)? keine physische Konzentration/i
        : /does not prove.*physical.*concentr/i);
    assert.doesNotMatch(presentation.sections.waterLevel, language === 'da'
      ? /intet rav|alt (?:rav )?ført ud/i
      : language === 'de' ? /kein Bernstein|sämtlicher Bernstein.*hinaus/i
        : /no amber|all amber.*(?:carried|moved) (?:out|away)/i);
  }
}
const zeroTransportHighMobilisation = integratedResult('FALLING', 'OUTBOUND');
zeroTransportHighMobilisation.score = 44;
zeroTransportHighMobilisation.components.transport = 0;
zeroTransportHighMobilisation.components.release = 100;
zeroTransportHighMobilisation.explanation.mobilisationDiagnostics.mobilisationPotential = 100;
const zeroTransportPresentation = presentIntegratedRavScoreExplanation(
  zeroTransportHighMobilisation,
  { language:'da' },
);
assert.equal(zeroTransportPresentation.available, true);
assert.match(zeroTransportPresentation.summary, /transportbevis 0\/100[\s\S]*mobiliseringsmulighed 100\/100/);
assert.doesNotMatch(zeroTransportPresentation.facts.join(' '), /intet rav|alt (?:rav )?ført ud/i,
  'nul transport og høj mobilisering må ikke forklares som intet rav eller total udtransport');
const invalidWater = integratedResult();
invalidWater.explanation.waterLevelContext.scoreEffectPoints = 1;
assert.deepEqual(presentIntegratedRavScoreExplanation(invalidWater), {
  available:false,
  reason:'WATER_CONTEXT_NOT_SCORE_NEUTRAL',
});
const mismatchedJointWater = integratedResult('FALLING','OUTBOUND');
mismatchedJointWater.explanation.waterLevelContext.jointContextCode =
  'FALLING_WITH_INBOUND_CURRENT_CONTEXT';
assert.deepEqual(presentIntegratedRavScoreExplanation(mismatchedJointWater), {
  available:false,
  reason:'WATER_CONTEXT_NOT_SCORE_NEUTRAL',
},'Fælleskontekstens kode og verificerede strømklasse må ikke kunne modsige hinanden');
const resolvedLastMile = integratedResult();
resolvedLastMile.explanation.transportDiagnostics.lastMilePhysicalDeliveryResolved = true;
assert.equal(presentIntegratedRavScoreExplanation(resolvedLastMile).available, false,
  'presenteren skal fejle lukket ved en opdigtet opløst last mile');
const inventedSurfZone = integratedResult();
inventedSurfZone.explanation.transportDiagnostics.resolvedSurfZoneIncluded = true;
assert.equal(presentIntegratedRavScoreExplanation(inventedSurfZone).available, false,
  'presenteren må ikke forklare en model, som hævder en opløst surfzone');
const wrongModel = integratedResult();
wrongModel.modelBinding = { ...wrongModel.modelBinding, modelId:'candidate-g-state-v1' };
assert.equal(presentIntegratedRavScoreExplanation(wrongModel).available, false,
  'presenteren må ikke legitimere en anden modelidentitet med integreret tekst');
for (const numericStringResult of [
  { ...integratedResult(), score: '64' },
  {
    ...integratedResult(),
    components: { ...integratedResult().components, release: '60' },
  },
]) {
  assert.equal(presentIntegratedRavScoreExplanation(numericStringResult).available, false,
    'presenteren må ikke gøre numeriske strenge til offentlige modeltal');
}

const questions = {
  da:'Hvorfor denne score?',
  de:'Warum diese BernsteinScore?',
  en:'Why this AmberScore?',
};
const currentQuestions = {
  da:'Hvordan påvirker strøm ravjagt?',
  de:'Wie beeinflusst Strömung die Bernsteinsuche?',
  en:'How does current affect amber hunting?',
};
const waterQuestions = {
  da:'Hvad betyder faldende vandstand?',
  de:'Was bedeutet fallender Wasserstand?',
  en:'What does falling water level mean?',
};
for (const language of Object.keys(questions)) {
  const context = {
    zone:{ id:'z1', name:'Testkyst' },
    result:integratedResult(),
    weather:{ windSpeedMps:null, waveHeightM:1.1, currentSpeedMps:0.09, waterLevelCm:-8 },
  };
  const answer = await askRavRadar(questions[language], context,
    { language, localOnly:true, now:'2026-03-29T10:00:00+02:00' });
  for (const pattern of languageExpectations[language].slice(0, 3)) assert.match(answer, pattern);
  assert.doesNotMatch(answer, /vind 0|Wind 0|wind 0/i,
    `${language}: manglende vind må ikke omdannes til nul`);
  const currentAnswer = await askRavRadar(currentQuestions[language], context, { language, localOnly:true });
  assert.match(currentAnswer, language === 'da' ? /feeder- eller langskyststrøm/
    : language === 'de' ? /Zubringer-[\s\S]*Küstenlängs-/
      : /feeder or longshore current/);
  assert.match(currentAnswer, /undertow|Unterströmung/i);
  assert.match(currentAnswer, language === 'da' ? /noget mobilt materiale ud[\s\S]*ikke.*alt lokalt rav/i
    : language === 'de' ? /Teil mobilen Materials seewärts[\s\S]*nicht.*gesamte lokale Bernstein/i
      : /some mobile material seaward[\s\S]*not prove.*all local amber/i,
  `${language}: fralandskomponenten skal være negativ evidens uden alt-er-væk-påstand`);
  const fallbackCurrentAnswer = await askRavRadar(currentQuestions[language], {
    zone:context.zone,
    result:{ available:false, score:null },
  }, { language, localOnly:true });
  assert.match(fallbackCurrentAnswer, language === 'da' ? /bølgeorbitaler[\s\S]*feeder-\/langskyststrøm/i
    : language === 'de' ? /Wellenorbitalbewegung[\s\S]*Zubringer- oder küstenparallele Strömung/i
      : /wave orbitals[\s\S]*feeder or longshore currents/i,
  `${language}: fallback-strømteksten skal bevare lagdelingen uden integreret resultat`);
  assert.match(fallbackCurrentAnswer, language === 'da' ? /noget mobilt materiale ud[\s\S]*ikke.*alt lokalt rav/i
    : language === 'de' ? /Teil mobilen Materials seewärts[\s\S]*nicht.*gesamte lokale Bernstein/i
      : /some mobile material seaward[\s\S]*not prove.*all local amber/i,
  `${language}: fallback må heller ikke gøre fralandsstrøm til bevis for totalt tab`);
  const waterAnswer = await askRavRadar(waterQuestions[language], context, { language, localOnly:true });
  assert.match(waterAnswer, /0 (?:scorepoint|Scorepunkte|score points)/i);
  assert.match(waterAnswer, language === 'da' ? /føre[\s\S]*rav ud[\s\S]*blotlæg/
    : language === 'de' ? /seewärts[\s\S]*freileg/
      : /move[\s\S]*seaward[\s\S]*expos/);
}

for (const missingScore of [null, '', '   ', '73', false, true, undefined, [], {}, -1, 101]) {
  const context = publicAssistantContext({ result:{ available:true, score:missingScore, level:'poor' } }, 'da');
  assert.deepEqual(context.result, { available:false, score:null, level:null },
    `assistentkontekst må ikke omdanne ${String(missingScore)} til score 0`);
}
for (const field of [
  'windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'wavePeriodS',
  'waterLevelCm', 'currentSpeedMps', 'currentDirectionDeg', 'waterTemperatureC',
]) {
  for (const malformed of ['7.2', true, [7.2], { value:7.2 }]) {
    const context = publicAssistantContext({
      result:{ available:true, score:73, level:'fair' },
      weather:{ [field]:malformed },
    }, 'da');
    assert.equal(context.weather[field], null,
      `lokal assistentkontekst må ikke typekonvertere ${field}=${JSON.stringify(malformed)}`);
  }
}
assert.deepEqual(
  publicAssistantContext({ result:{ available:false, score:73, level:'fair' } }, 'en').result,
  { available:false, score:null, level:null },
  'en score må ikke frigives, medmindre available er eksakt true',
);
const unavailableAnswer = await askRavRadar('Hvorfor denne score?', {
  zone:{id:'z1',name:'Testkyst'},
  result:{available:false,score:null},
}, { language:'da', localOnly:true });
assert.match(unavailableAnswer, /ikke nok prognosedata/i);
assert.doesNotMatch(unavailableAnswer, /score 0/i);

assert.equal(forecastDateKeyInTimeZone('2026-03-28T23:30:00.000Z'), '2026-03-29');
assert.equal(forecastDateKeyForDayOffset('2026-03-28T23:30:00.000Z', 1), '2026-03-30',
  'forårsskiftet skal følge den københavnske kalenderdag');
assert.equal(forecastDateKeyInTimeZone('2026-10-24T22:30:00.000Z'), '2026-10-25');
assert.equal(forecastDateKeyForDayOffset('2026-10-24T22:30:00.000Z', 1), '2026-10-26',
  'efterårsskiftet skal følge den københavnske kalenderdag');

const futureResult = integratedResult('STABLE');
futureResult.score = 71;
const coastalParts = {
  enabled:true,
  generatedAt:'2026-03-30T08:00:00.000Z',
  parts:{ p1:{ id:'p1', name:'Testdel', zoneId:'z1' } },
  zones:{ z1:{ expectedPartCount:1, hourly:[{
    time:'2026-03-30T08:00:00.000Z',
    waders:{
      ...futureResult,
      status:'whole-zone',
      winningPartId:'p1',
      winningPartName:'Testdel',
      comparisonPartCount:1,
      weather:{windSpeedMps:4,waveHeightM:1,currentSpeedMps:.1,waterLevelCm:0},
    },
  }] } },
};
const tomorrowAnswer = await askRavRadar('Hvornår er bedste tidspunkt i morgen?', {
  zone:{ id:'z1', name:'Testzone' }, mode:'waders', conditions:{coastalParts},
}, { language:'da', localOnly:true, now:'2026-03-28T23:30:00.000Z' });
assert.match(tomorrowAnswer, /RavScore 71|score 71/i,
  'assistentens injicerede ur skal finde den københavnske morgendag over DST-skiftet');

const pastResult = integratedResult('STABLE');
pastResult.score = 99;
const comingResult = integratedResult('STABLE');
comingResult.score = 60;
const todayParts = structuredClone(coastalParts);
todayParts.generatedAt = '2026-03-29T11:00:00.000Z';
todayParts.zones.z1.hourly = [
  { time:'2026-03-29T06:00:00.000Z', waders:{
    ...pastResult, status:'whole-zone', winningPartId:'p1', winningPartName:'Testdel', comparisonPartCount:1,
  } },
  { time:'2026-03-29T11:00:00.000Z', waders:{
    ...comingResult, status:'whole-zone', winningPartId:'p1', winningPartName:'Testdel', comparisonPartCount:1,
  } },
];
const injectedTodayAnswer = await askRavRadar('Hvornår er bedste tidspunkt i dag?', {
  zone:{ id:'z1', name:'Testzone' }, mode:'waders', conditions:{ coastalParts:todayParts },
}, { language:'da', localOnly:true, now:'2026-03-29T10:00:00.000Z' });
assert.match(injectedTodayAnswer, /RavScore 60|score 60/i,
  'assistentens ISO-injicerede ur skal frasortere dagens allerede passerede højere score');
assert.doesNotMatch(injectedTodayAnswer, /RavScore 99|score 99/i);

const [panelSource, assistantSource, edgeSource, appSource, generatorSource, workerSource,
  developerSource, workflowSource, trackerSource] = await Promise.all([
  fs.readFile(new URL('../js/ui/info-panel.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../js/services/rav-assistant.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../supabase/functions/_shared/rav-assistant-contract.ts', import.meta.url), 'utf8'),
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('./public-conditions-lib.mjs', import.meta.url), 'utf8'),
  fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../js/ui/developer-panel.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../.github/workflows/update-and-deploy.yml', import.meta.url), 'utf8'),
  fs.readFile(new URL('../js/services/trip-service.js', import.meta.url), 'utf8'),
]);
for (const source of [panelSource, assistantSource]) assert.doesNotMatch(source, /transportEvent/,
  'offentlige consumer-forklaringer må ikke bruge Candidate G transportEvent');
assert.equal((panelSource.match(/integratedExplanationPanel\(r(?:esult)?\)/g) || []).length >= 2, true,
  'samme presenter skal bruges i både nu- og femdøgnsdetaljer');
assert.match(assistantSource, /presentIntegratedRavScoreExplanation\(result/,
  'den lokale assistent skal bruge samme presenter');
assert.match(appSource, /forecastDateKeyInTimeZone\(hour\?\.time\)/,
  'appens prognosegrupper skal bruge den fælles københavnske kalender');
assert.match(generatorSource, /forecastDateKeyInTimeZone\(row\?\.time\)/,
  'producentens prognosedatoer skal bruge den fælles københavnske kalender');
assert.match(edgeSource,
  /const scoreAvailable = result\.available === true[\s\S]{0,180}numericScore >= 0[\s\S]{0,80}numericScore <= 100/,
  'Edge-assistenten skal have samme strenge availability- og scoreintervalkontrakt');
assert.match(edgeSource, /typeof value === "number" && Number\.isFinite\(value\)/,
  'Edge-assistenten må ikke typekonvertere offentlige fysiske tal');
assert.match(edgeSource, /undertow, feeder or longshore currents, or rip currents/,
  'Edge-fakta skal bevare skellet mellem gridstrøm og surfzonens strømtyper');
assert.doesNotMatch(workerSource, /trip-service\.js|trip-evidence-legacy-bridge\.js/,
  'service workeren må ikke cache den pensionerede GPS-runtime');
assert.doesNotMatch(developerSource, /from ["'][^"']*trip-service\.js/,
  'Pages-importgrafen må ikke nå GPS-trackeren via udviklerpanelet');
for (const retired of ['js/services/trip-service.js','js/services/trip-evidence-legacy-bridge.js']) {
  assert.match(workflowSource, new RegExp(`--exclude '${retired.replaceAll('/', '\\/')}'`),
    `${retired} skal holdes ude af Pages-artifactet`);
}
assert.match(trackerSource, /ravradar-trips-v1/,
  'den lokale historikfil bevares i repositoryet og må ikke slettes som del af runtimepensioneringen');

console.log('Integrerede offentlige forklaringer, strict missing, København/DST og GPS-runtimepensionering: bestået.');
