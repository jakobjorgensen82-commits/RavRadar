import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { forecastDateKeyForDayOffset, forecastDateKeyInTimeZone } from '../js/core/forecast-calendar.js';
import { presentIntegratedRavScoreExplanation } from '../js/core/ravscore-integrated-explanation-presenter.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { askRavRadar, publicAssistantContext } from '../js/services/rav-assistant.js';
import { setLanguage, t } from '../js/i18n.js';
import { bindZoneInfoInteractions } from '../js/ui/info-panel.js';

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
    scoreBounds:{lower:64,upper:64,modelUncertaintyPoints:0,rawLower:64,rawUpper:64},
    scoreQuality: 'FULL_HISTORY',
    calibrationEligible: true,
    scoreSemantics:'EXACT_POINT_SCORE',
    conservativeTailResetApplied:false,
    historyCoverageHours: 48,
    historyReasonCodes: [],
    modelBinding,
    level: 'fair',
    components: { huntability: 72, transport: 61, release: 60 },
    localWeather: {
      currentProvenance: {
        status: 'verified',
        sourceClass: 'local-model-grid',
        distanceKm: 1.2,
      },
    },
    explanation: {
      ...modelBinding,
      transportDiagnostics: {
        engine: 'INTEGRATED_COASTAL_PROCESS',
        lastMileScoreEffect: 'BOUNDED_SUPPLY_ATTENUATION_ONLY',
        lastMileStatus: 'LAST_MILE_BOUNDED_WAVE_APPROACH_READY',
        lastMileDeliveryFactor: 0.92,
        lastMileWaveActivity: 0.8,
        lastMileApproach: 1 / 3,
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

function setExactScore(result,score){
  result.score=score;
  result.scoreBounds={lower:score,upper:score,modelUncertaintyPoints:0,rawLower:score,rawUpper:score};
  return result;
}

function historyIncompleteResult(reasonCode,{coverage=48,currentGap=false,status}={}){
  const result=integratedResult();
  result.scoreQuality='HISTORY_INCOMPLETE';
  result.calibrationEligible=false;
  result.scoreSemantics='CONSERVATIVE_ENCLOSING_LOWER_BOUND';
  result.conservativeTailResetApplied=false;
  result.historyCoverageHours=coverage;
  result.historyReasonCodes=[reasonCode];
  result.scoreBounds={lower:64,upper:78,modelUncertaintyPoints:14,rawLower:64,rawUpper:78};
  result.explanation.transportDiagnostics.currentMemoryReady=!currentGap;
  result.explanation.transportDiagnostics.currentMemoryStatus=currentGap
    ? 'WINDOW_HAS_TIME_GAP':'READY';
  result.explanation.transportDiagnostics.lastMileStatus=status
    ?? 'LAST_MILE_HISTORY_INCOMPLETE_ENCLOSING_BOUND';
  return result;
}

const languageExpectations = {
  da: [/kausalt, energivægtet gennemsnit af bølgernes retning/, /kun den aktuelle og de tidligere timer.*aldrig fremtidige timer/, /fire timers halveringstid/, /ældre timer tæller gradvist mindre/, /højst 15 %/, /aldrig skabe eller øge/, /fysisk uopløst/, /0 scorepoint/, /undertow/, /feeder- eller langskyststrøm/, /ripstrømme/, /noget mobilt rav ud/, /lokal batymetri/],
  de: [/kausalen, energiegewichteten Durchschnitt der Wellenrichtung/, /Nur die aktuelle Stunde und frühere Stunden.*niemals zukünftige Stunden/, /Halbwertszeit von vier Stunden/, /ältere Stunden schrittweise weniger zählen/, /höchstens 15 %/, /niemals erzeugen oder erhöhen/, /physikalisch unaufgelöst/, /0 Scorepunkte/, /Undertow/, /Küstenlängs-/, /Rippströmungen/, /Teil mobilen Bernsteins seewärts/, /lokale Bathymetrie/],
  en: [/causal, energy-weighted average of wave direction/, /only the current and earlier hours.*never future hours/, /four-hour half-life/, /older hours gradually count less/, /at most 15%/, /never create or increase/, /physically unresolved/, /0 score points/, /undertow/, /longshore current/, /rip currents/, /some mobile amber seaward/, /local bathymetry/],
};
for (const [language, patterns] of Object.entries(languageExpectations)) {
  const presentation = presentIntegratedRavScoreExplanation(integratedResult(), { language });
  assert.equal(presentation.available, true, `${language}: integreret forklaring skal være tilgængelig`);
  const text = [presentation.title, presentation.summary, ...presentation.facts].join('\n');
  for (const pattern of patterns) assert.match(text, pattern, `${language}: forklaringen mangler ${pattern}`);
  assert.doesNotMatch(text, /W\/N\/T|EWMA/i, `${language}: den offentlige forklaring må ikke vise intern bølgestate-jargon`);
  assert.match(presentation.facts[0], language === 'en' ? /48 verified history hours.*48-hour/
    : language === 'de' ? /48 verifizierte Verlaufsstunden.*48-Stunden/
      : /48 verificerede historiktimer.*48-timers/,
  `${language}: FULL_HISTORY skal forklare det kontraktlige komplette 48-timers vindue`);
  assert.match(text, language === 'da' ? /fortsat fysisk uopløst/i
    : language === 'de' ? /bleibt physikalisch unaufgelöst/i
      : /remains physically unresolved/i,
  `${language}: den afgrænsede faktor må ikke fremstilles som opløst fysisk levering`);
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
setExactScore(zeroTransportHighMobilisation,44);
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
const missingResolutionClaim = integratedResult();
delete missingResolutionClaim.explanation.transportDiagnostics.lastMilePhysicalDeliveryResolved;
assert.equal(presentIntegratedRavScoreExplanation(missingResolutionClaim).available, false,
  'presenteren skal fejle lukket, hvis producenten ikke udtrykkeligt markerer last mile som fysisk uopløst');
const missingDeliveryFactor = integratedResult();
delete missingDeliveryFactor.explanation.transportDiagnostics.lastMileDeliveryFactor;
assert.equal(presentIntegratedRavScoreExplanation(missingDeliveryFactor).available, false,
  'presenteren skal fejle lukket uden den anvendte afgrænsede leveringsfaktor');
for (const factor of [0.849999, 1.000001]) {
  const invalidDeliveryFactor = integratedResult();
  invalidDeliveryFactor.explanation.transportDiagnostics.lastMileDeliveryFactor = factor;
  assert.equal(presentIntegratedRavScoreExplanation(invalidDeliveryFactor).available, false,
    `presenteren skal afvise leveringsfaktor ${factor} uden for 0,85..1,00`);
}

const gapCases=[
  ['CURRENT_HISTORY_INCOMPLETE',{coverage:17,currentGap:true}],
  ['WAVE_HISTORY_INCOMPLETE',{coverage:48}],
  ['LAST_MILE_HISTORY_INCOMPLETE',{coverage:48}],
];
for(const [reasonCode,options] of gapCases){
  for(const language of ['da','de','en']){
    const result=historyIncompleteResult(reasonCode,options);
    const presentation=presentIntegratedRavScoreExplanation(result,{language});
    assert.equal(presentation.available,true,`${reasonCode}/${language}: gapscore skal forklares`);
    assert.match(presentation.sections.scoreQuality,language==='da'?/forsigtigt minimum.*64–78/i
      :language==='de'?/vorsichtiger Mindestwert.*64–78/i
        :/conservative minimum.*64–78/i);
    assert.match(presentation.sections.memory,language==='da'?/dækningsomfang.*ikke bevis.*ubrudt/i
      :language==='de'?/Deckungsumfang.*nicht.*lückenlosen/i
        :/coverage, not proof of an unbroken/i);
    const answer=await askRavRadar(
      language==='da'?'Hvorfor denne score?':language==='de'?'Warum dieser BernsteinScore?':'Why this AmberScore?',
      {zone:{id:'z1',name:'Testkyst'},result,weather:{}},
      {language,localOnly:true},
    );
    assert.match(answer,/64[–-]78/,
      `${reasonCode}/${language}: assistentsvaret skal vise minimumsintervallet`);
    assert.doesNotMatch(answer,/ikke nok prognosedata|nicht genug Prognosedaten|not enough forecast data/i);
  }
}
const tailResetResult=integratedResult();
tailResetResult.scoreSemantics='CONSERVATIVE_TAIL_RESET_POINT_SCORE';
tailResetResult.conservativeTailResetApplied=true;
tailResetResult.explanation.transportDiagnostics.lastMileStatus=
  'LAST_MILE_CONSERVATIVE_TAIL_RESET_POINT';
const tailResetPresentation=presentIntegratedRavScoreExplanation(tailResetResult,{language:'da'});
assert.equal(tailResetPresentation.available,true);
assert.match(tailResetPresentation.sections.scoreQuality,/tidsgrænse/i);

const forgedGap=historyIncompleteResult('CURRENT_HISTORY_INCOMPLETE',{coverage:17,currentGap:true});
forgedGap.scoreBounds.upper=63;
assert.equal(presentIntegratedRavScoreExplanation(forgedGap).available,false,
  'presenteren skal fejle lukket ved et forfalsket interval');
const legacyNeutralLastMile = integratedResult();
legacyNeutralLastMile.explanation.transportDiagnostics.lastMileScoreEffect = 'NONE';
assert.equal(presentIntegratedRavScoreExplanation(legacyNeutralLastMile).available, false,
  'presenteren må ikke acceptere den erstattede score-neutrale last-mile-kontrakt');
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
const historyMissingQuestions = {
  da:'Hvad sker der med RavScore og femdøgnsprognosen, når historikken mangler?',
  de:'Was passiert mit RavScore und Fünf-Tage-Prognose, wenn Verlaufsdaten fehlen?',
  en:'What happens to RavScore and the five-day forecast when history is missing?',
};
const directMissingQuestions = {
  da:'Hvad sker der med en prognosetime, hvis der mangler direkte vejrdata?',
  de:'Was passiert mit einer Prognosestunde, wenn direkte Wetterdaten fehlen?',
  en:'What happens to a forecast hour when direct weather data is missing?',
};
const missingDataExpectations = {
  da:[/konservativ minimumsscore/, /modelinterval/, /aktuelle prognose og femdøgnsprognosen/, /midlertidig advarsel.*forsvinder automatisk/, /obligatorisk direkte input.*utilgængelig.*udelades fra rangeringer/],
  de:[/vorsichtigen Mindestwert/, /Modellintervall/, /vollständige aktuelle Prognose und Fünf-Tage-Prognose/, /vorübergehender Hinweis.*verschwindet automatisch/, /erforderliche direkte Eingabe.*nicht verfügbar.*Ranglisten/],
  en:[/conservative minimum score/, /model range/, /full current and five-day forecasts/, /temporary notice.*disappears automatically/, /required direct input.*unavailable.*omitted from rankings/],
};
for (const language of Object.keys(questions)) {
  const context = {
    zone:{ id:'z1', name:'Testkyst' },
    result:integratedResult(),
    weather:{ windSpeedMps:null, waveHeightM:1.1, currentSpeedMps:0.09, waterLevelCm:-8 },
  };
  for (const [question, result] of [
    [historyMissingQuestions[language], historyIncompleteResult('CURRENT_HISTORY_INCOMPLETE',{coverage:19,currentGap:true})],
    [directMissingQuestions[language], {available:false,score:null}],
  ]) {
    const missingAnswer = await askRavRadar(
      question,
      {...context,result},
      {language,localOnly:true},
    );
    for (const pattern of missingDataExpectations[language]) assert.match(missingAnswer, pattern);
    assert.doesNotMatch(missingAnswer, /W\/N\/T|EWMA/i);
  }
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

const boundAssistantContext = publicAssistantContext({
  modelBinding:ravScoreModelBinding(),
  result:{
    available:true, score:73, level:'fair', scoreQuality:'FULL_HISTORY',
    calibrationEligible:true, scoreSemantics:'EXACT_POINT_SCORE',
    conservativeTailResetApplied:false,
    scoreBounds:{lower:73,upper:73,modelUncertaintyPoints:0,rawLower:73,rawUpper:73},
    historyCoverageHours:48, historyReasonCodes:[],
  },
}, 'da');
assert.deepEqual(boundAssistantContext.result, {
  available:true, score:73, level:'fair', scoreQuality:'FULL_HISTORY',
  calibrationEligible:true, scoreSemantics:'EXACT_POINT_SCORE',
  conservativeTailResetApplied:false,
  scoreBounds:{lower:73,upper:73,modelUncertaintyPoints:0,rawLower:73,rawUpper:73},
  historyCoverageHours:48, historyReasonCodes:[],
},
  'assistenten skal bevare en tilgængelig score med eksakt aktiv dataset-/modelbinding');
const historyIncompleteAssistantContext = publicAssistantContext({
  modelBinding:ravScoreModelBinding(),
  result:{
    available:true, score:61, level:'fair', scoreQuality:'HISTORY_INCOMPLETE',
    calibrationEligible:false, scoreSemantics:'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
    conservativeTailResetApplied:false,
    scoreBounds:{lower:61,upper:75,modelUncertaintyPoints:14,rawLower:61,rawUpper:75},
    historyCoverageHours:19,
    historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],
  },
}, 'da');
assert.deepEqual(historyIncompleteAssistantContext.result, {
  available:true, score:61, level:'fair', scoreQuality:'HISTORY_INCOMPLETE',
  calibrationEligible:false, scoreSemantics:'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
  conservativeTailResetApplied:false,
  scoreBounds:{lower:61,upper:75,modelUncertaintyPoints:14,rawLower:61,rawUpper:75},
  historyCoverageHours:19,
  historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],
}, 'assistenten skal bevare en datasikker numerisk HISTORY_INCOMPLETE-score');
const mixedAssistantContext = publicAssistantContext({
  modelBinding:{ ...ravScoreModelBinding(), modelBundleSha256:'0'.repeat(64) },
  result:{
    available:true, score:73, level:'fair', scoreQuality:'FULL_HISTORY',
    calibrationEligible:true, scoreSemantics:'EXACT_POINT_SCORE',
    conservativeTailResetApplied:false,
    scoreBounds:{lower:73,upper:73,modelUncertaintyPoints:0,rawLower:73,rawUpper:73},
    historyCoverageHours:48, historyReasonCodes:[],
  },
}, 'da');
assert.deepEqual(mixedAssistantContext.result, {
  available:false, score:null, level:null, scoreQuality:'UNAVAILABLE',
  calibrationEligible:false, scoreSemantics:null,conservativeTailResetApplied:false,
  scoreBounds:null,historyCoverageHours:null, historyReasonCodes:[],
},
  'assistenten skal fjerne en score, når dataset- og aktiv modelbinding ikke matcher eksakt');

for (const missingScore of [null, '', '   ', '73', false, true, undefined, [], {}, -1, 101]) {
  const context = publicAssistantContext({ result:{ available:true, score:missingScore, level:'poor' } }, 'da');
  assert.deepEqual(context.result, {
    available:false, score:null, level:null, scoreQuality:'UNAVAILABLE',
    calibrationEligible:false, scoreSemantics:null,conservativeTailResetApplied:false,
    scoreBounds:null,historyCoverageHours:null, historyReasonCodes:[],
  },
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
  {
    available:false, score:null, level:null, scoreQuality:'UNAVAILABLE',
    calibrationEligible:false, scoreSemantics:null,conservativeTailResetApplied:false,
    scoreBounds:null,historyCoverageHours:null, historyReasonCodes:[],
  },
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
setExactScore(futureResult,71);
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
      winningPartUncertain:false,
      possibleWinningPartCount:1,
      possibleWinningParts:[{
        partId:'p1',name:'Testdel',score:71,scoreBounds:{...futureResult.scoreBounds},
      }],
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
setExactScore(pastResult,99);
const comingResult = integratedResult('STABLE');
setExactScore(comingResult,60);
const todayParts = structuredClone(coastalParts);
todayParts.generatedAt = '2026-03-29T11:00:00.000Z';
todayParts.zones.z1.hourly = [
  { time:'2026-03-29T06:00:00.000Z', waders:{
    ...pastResult, status:'whole-zone', winningPartId:'p1', winningPartName:'Testdel',
    winningPartUncertain:false,possibleWinningPartCount:1,
    possibleWinningParts:[{partId:'p1',name:'Testdel',score:99,scoreBounds:{...pastResult.scoreBounds}}],
    comparisonPartCount:1,
  } },
  { time:'2026-03-29T11:00:00.000Z', waders:{
    ...comingResult, status:'whole-zone', winningPartId:'p1', winningPartName:'Testdel',
    winningPartUncertain:false,possibleWinningPartCount:1,
    possibleWinningParts:[{partId:'p1',name:'Testdel',score:60,scoreBounds:{...comingResult.scoreBounds}}],
    comparisonPartCount:1,
  } },
];
const injectedTodayAnswer = await askRavRadar('Hvornår er bedste tidspunkt i dag?', {
  zone:{ id:'z1', name:'Testzone' }, mode:'waders', conditions:{ coastalParts:todayParts },
}, { language:'da', localOnly:true, now:'2026-03-29T10:00:00.000Z' });
assert.match(injectedTodayAnswer, /RavScore 60|score 60/i,
  'assistentens ISO-injicerede ur skal frasortere dagens allerede passerede højere score');
assert.doesNotMatch(injectedTodayAnswer, /RavScore 99|score 99/i);

function renderSecondaryScoreLists(language,{coverageKind='several-parts'}={}) {
  setLanguage(language);
  const selected=historyIncompleteResult('CURRENT_HISTORY_INCOMPLETE',{
    coverage:24,currentGap:true,
  });
  selected.localPartName=coverageKind==='only-part'?'Ufuldstændig del':'Fuld del';
  selected.winningPartUncertain=true;
  selected.localCoverage={scoreSpread:2,winningPartName:selected.localPartName};
  selected.localCoverageSummary={
    kind:coverageKind,
    parts:coverageKind==='only-part'?[{
      name:'Ufuldstændig del',score:64,scoreQuality:'HISTORY_INCOMPLETE',
      scoreBounds:{lower:64,upper:78,modelUncertaintyPoints:14,rawLower:64,rawUpper:78},
      historyCoverageHours:24,historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],
    }]:[
      {name:'Fuld del',score:64,scoreQuality:'FULL_HISTORY',
        scoreBounds:{lower:64,upper:64,modelUncertaintyPoints:0,rawLower:64,rawUpper:64},
        historyCoverageHours:48,historyReasonCodes:[]},
      {name:'Ufuldstændig del',score:62,scoreQuality:'HISTORY_INCOMPLETE',
        scoreBounds:{lower:62,upper:75,modelUncertaintyPoints:13,rawLower:62,rawUpper:75},
        historyCoverageHours:24,historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE']},
    ],
  };
  const summaries=[{
    date:'2026-03-30',hours:[],best:{
      recommended:true,isNow:false,displayScope:'local',
      hour:{time:'2026-03-30T08:00:00.000Z'},result:selected,
      candidates:[
        {time:'2026-03-30T08:00:00.000Z',score:64,scoreQuality:'HISTORY_INCOMPLETE',
          scoreBounds:{lower:64,upper:78,modelUncertaintyPoints:14,rawLower:64,rawUpper:78},
          historyCoverageHours:24,historyReasonCodes:['CURRENT_HISTORY_INCOMPLETE'],isNow:false},
        {time:'2026-03-30T09:00:00.000Z',score:63,scoreQuality:'FULL_HISTORY',
          scoreBounds:{lower:63,upper:63,modelUncertaintyPoints:0,rawLower:63,rawUpper:63},
          historyCoverageHours:48,historyReasonCodes:[],isNow:false},
        {time:'2026-03-30T10:00:00.000Z',score:0,scoreQuality:'UNAVAILABLE',
          scoreBounds:null,historyCoverageHours:null,historyReasonCodes:[],isNow:false},
      ],
    },
  }];
  const detail={innerHTML:''};
  const dayButton={
    classList:{toggle(){}},setAttribute(){},addEventListener(){},
  };
  const forecastSection={
    querySelector(selector){
      if(selector==='.forecast-payload')return {textContent:JSON.stringify(summaries)};
      if(selector==='[data-forecast-detail]')return detail;
      return null;
    },
    querySelectorAll(selector){return selector==='.forecast-score-day'?[dayButton]:[];},
  };
  const element={
    addEventListener(){},removeEventListener(){},
    querySelector(selector){return selector==='[data-forecast-section]'?forecastSection:null;},
  };
  bindZoneInfoInteractions(element,{id:'z1',name:'Testzone'},'waders',{});
  return detail.innerHTML;
}

for(const language of ['da','de','en']){
  const html=renderSecondaryScoreLists(language);
  assert.equal((html.match(/class="score-quality-inline"/g)||[]).length,2,
    `${language}: kun de to HISTORY_INCOMPLETE-sekundærrækker skal have kompakt markør`);
  assert.equal((html.match(/data-history-reasons="CURRENT_HISTORY_INCOMPLETE"/g)||[]).length,2,
    `${language}: alternative tider og delscorer skal bevare maskinlæsbare årsagskoder`);
  assert.match(html,/64–78/,
    `${language}: den alternative HISTORY_INCOMPLETE-time skal vise sit interval`);
  assert.match(html,/62–75/,
    `${language}: HISTORY_INCOMPLETE-delscoren skal vise sit eget interval`);
  assert.match(html,/<b>RavScore 63<\/b><\/li>/,
    `${language}: FULL_HISTORY-alternativet skal beholde sin hidtidige punktvisning`);
  assert.match(html,new RegExp(t('score.historyIncomplete.short',{},language)),
    `${language}: den kompakte advarsel skal være lokaliseret`);
  assert.match(html,new RegExp(t('score.unavailable',{},language)),
    `${language}: UNAVAILABLE skal vises som utilgængelig`);
  assert.doesNotMatch(html,/RavScore 0/,
    `${language}: UNAVAILABLE må aldrig gengives som en nulscore`);
  const onlyPartHtml=renderSecondaryScoreLists(language,{coverageKind:'only-part'});
  const expectedOnlyPartText=t('score.local.only.text',{
    part:'Ufuldstændig del',
    score:`64–78 · ${t('score.historyIncomplete.short')}`,
  });
  assert.ok(onlyPartHtml.includes(expectedOnlyPartText),
    `${language}: enkelt-kystdelsteksten må ikke fremstille minimumsværdien som en sikker punktscore`);
}
setLanguage('da');

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
  /const basicScoreAvailable = modelBindingMatches[\s\S]{0,180}result\.available === true[\s\S]{0,180}numericScore >= 0[\s\S]{0,80}numericScore <= 100/,
  'Edge-assistenten skal have samme strenge availability- og scoreintervalkontrakt');
assert.match(edgeSource,
  /scoreQuality:"HISTORY_INCOMPLETE"[\s\S]{0,120}calibrationEligible:false/,
  'Edge-assistenten skal bevare historikufuldstændig scorekvalitet uden kalibreringsret');
assert.match(edgeSource, /typeof value === "number" && Number\.isFinite\(value\)/,
  'Edge-assistenten må ikke typekonvertere offentlige fysiske tal');
assert.match(edgeSource, /undertow, feeder or longshore currents, rip currents/,
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
