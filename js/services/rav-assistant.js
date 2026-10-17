import { PUBLIC_CONFIG } from "../../config.js?v=4.0.580";
import { localRavKnowledgeAnswer, matchLocalRavKnowledge } from "../../knowledge/rav-assistant-local-v2.js?v=4.0.580";
import { buildLocalZoneScore, selectLocalBestForDay } from "../core/local-zone-score.js?v=4.0.580";
import { addNationalRanking, compareNationalRankingRows } from "../core/zone-ranking.js?v=4.0.580";
import { forecastDateKeyForDayOffset } from "../core/forecast-calendar.js?v=4.0.580";
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  ravScoreModelBinding,
} from "../core/ravscore-model-contract.js?v=4.0.580";
import { sameRavScoreModelBinding } from "../core/ravscore-public-runtime-contract.js?v=4.0.580";
import { presentActiveRavScoreExplanation } from "../core/ravscore-integrated-explanation-presenter.js?v=4.0.580";
import { bestTimeSelectionReasonI18nKey } from "../core/best-time-policy.js?v=4.0.580";
import { formatDateTime, formatNumber, getLanguage, normaliseLanguage, t } from "../i18n.js?v=4.0.580";

// Compatibility name for existing source-contract tests. The implementation
// now selects the only adapter matching the artifact's exact active binding.
const presentIntegratedRavScoreExplanation = presentActiveRavScoreExplanation;
const ACTIVE_RAVSCORE_MODEL_BINDING = ravScoreModelBinding();
const RAV_ASSISTANT_KNOWLEDGE_SCHEMA = 'rav-assistant-public-knowledge-v1';
const RAV_ASSISTANT_KNOWLEDGE_SHA256 = '72d84309e5ed5e4a180fc02b2d476041fcd65a576336a949df0bd43e87774378';
const RAV_ASSISTANT_BINDING_HEADERS = Object.freeze({
  modelId:'x-ravradar-model-id',
  modelStateVersion:'x-ravradar-model-state-version',
  modelContractSha256:'x-ravradar-model-contract-sha256',
  modelBundleSha256:'x-ravradar-model-bundle-sha256',
  knowledgeSchema:'x-ravradar-assistant-knowledge-schema',
  knowledgeSha256:'x-ravradar-assistant-knowledge-sha256',
});

const SECURITY_PATTERN = /api.?key|api[\s\u2010-\u2015-]*(?:nøgle|schlüssel|schluessel)|password|passwort|adgangskode|supabase|database|datenbank|sql|source code|kildekode|quellcode|system.?prompt|systeminstruk|admin|token|secret|hemmelig|geheim/i;
const OUT_OF_SCOPE_PATTERN = /(?<![\p{L}\p{N}_])(?:roulade|biskuitrolle|swiss roll|kage|kuchen|cake|fodbold|fußball|football|opskrift|rezept|recipe|politik|politics|aktie|stock price|matematik|math homework)(?![\p{L}\p{N}_])/iu;
const AMBER_DOMAIN_PATTERN = /(?<![\p{L}\p{N}_])(?:rav\p{L}*|bernstein\p{L}*|succinit|succinite|copal|kopal|amber\p{L}*|harpiks|harz|resin|fossili[sz]|inklusion|einschluss|inclusion|fluorescen|fluoreszenz|fluorescen[ct]e|uv.?light|395\s*nm|fosfor|phosphor|phosphorus|danefæ|kesse|kescher|kyst|küste|coast|strand|beach|hav|meer|sea|bølge|welle|wave|strøm|strömung|current|vandstand|wasserstand|water level|wader|wathose|opskyl|spülsaum|wash line|tang|seegras|seaweed|revle|sandbank|sandbar|revlehul|brandungsrückstrom|rip current|rende|rinne|channel|høfde|buhne|groyne|opdrift|auftrieb|buoyancy|massefylde|dichte|density|saltation|sediment|geologi|geology|geologie|istid|eiszeit|ice age)(?![\p{L}\p{N}_])/iu;
const INTENT_PATTERNS = Object.freeze({
  coast:/revle|sandbanke|rende|høfde|mole|kystknæk|læside|strandhældning|sandbank|rinne|buhne|küstenknick|leeseite|strandneigung|sandbar|channel|groyne|pier|coastal bend|lee side|beach slope/iu,
  'best-place':/bedste (?:sted|område)|hvor (?:skal|bør) (?:jeg|vi).*(?:lede|tage|køre)|hvor er (?:det )?bedst|køre hen|bester ort|bestes gebiet|wo (?:soll|sollte) (?:ich|wir).*(?:suchen|fahren)|wo ist es am besten|wohin fahren|best (?:place|area)|where should (?:i|we).*(?:search|go|drive)|where is best|drive to/iu,
  'best-time':/bedste tidspunkt|hvornår er (?:det )?bedste tidspunkt|hvilket tidspunkt|hvornår (?:skal|bør) (?:jeg|vi)|beste zeit|wann ist die beste zeit|zu welcher zeit|wann (?:soll|sollte) (?:ich|wir)|best time|what time|when is the best time|when should (?:i|we)/iu,
  score:/hvorfor.*score|score.*hvorfor|trækker op|trækker ned|warum.*score|score.*warum|warum.*ravscore|why.*score|score.*why/iu,
  safety:/sikkerhed|farlig|risiko|er det sikkert(?:\?|$| at)|sikkert at (?:gå|vade)|sicherheit|gefährlich|ist (?:es|das) sicher(?:\?|$| zu)|sicher zu waten|safety|danger|\brisk\b|is it safe(?:\?|$| to)|safe to (?:go|wade)/iu,
  model:/candidate\s*g|ravscore.*(?:vægt|model|beregn|betyder|procent)|hvordan (?:virker|beregnes) ravscore|ravscore.*(?:gewicht|modell|berechn|bedeutet|prozent)|wie (?:funktioniert|wird) ravscore|ravscore.*(?:weight|model|calculat|mean|percent)|how (?:does|is) ravscore/iu,
  'missing-data':/mangler.*(?:data|prognose|historik)|historik.*mangler|ingen.*(?:data|prognose)|utilgængelig|låner.*score|fehl(?:en|t).*(?:daten|prognose|verlauf)|(?:daten|prognose|verlauf).*fehl(?:en|t)|keine.*(?:daten|prognose)|nicht verfügbar|wert.*leihen|missing.*(?:data|forecast|history|evidence)|(?:data|forecast|history).*missing|no.*(?:data|forecast)|unavailable|borrow.*score/iu,
  limitations:/garantere|garanti|chance for (?:at finde|fund)|procent.*(?:chance|sandsynlighed)|ved ravradar hvor ravet er|kan ravradar finde rav|garantier|fundchance|prozent.*chance|weiß ravradar wo bernstein ist|garantee|guarantee|chance of (?:a find|finding)|percent.*chance|does ravradar know where amber is/iu,
  origin:/hvor kommer rav(?:et)? fra|hvad er rav|hvordan (?:opstod|dannes|blev rav dannet)|rav.*(?:opstod|dannes|dannet)|ravets? (?:oprindelse|alder)|alder.*rav|hvor gammelt.*rav|rav.*hvor gammelt|fossili[st]|harpiks|woher kommt bernstein|was ist bernstein|wie (?:entsteht|entstand) bernstein|wie wurde bernstein gebildet|bernstein.*(?:entsteht|entstand|gebildet)|ursprung.*bernstein|alter.*bernstein|wie alt.*bernstein|bernstein.*wie alt|fossil(?:isiert)?|harz|where does amber come from|what is amber|how (?:is|was) amber formed|how did amber form|amber.*(?:formed|formation)|amber origin|age.*amber|how old.*amber|amber.*how old|fossili[sz]ed|resin/iu,
  identification:/ægte rav|identificer.*rav|kende forskel.*rav|teste? .*rav|rav.*plast|uv.*rav|rav.*uv|395\s*nm|varm nål|echt(?:er|es)? bernstein|bernstein.*erkennen|bernstein.*prüfen|bernstein.*plastik|uv.*bernstein|bernstein.*uv|heiße nadel|real amber|identify.*amber|test.*amber|amber.*plastic|uv.*amber|amber.*uv|hot needle/iu,
  lamp:/hvad er en ravlygte|ravlygte.*(?:virker|bruger|nm)|395\s*nm|uv.?lygte|was ist eine bernsteinlampe|bernsteinlampe.*(?:funktion|benutz|nm)|uv.?lampe|what is an amber (?:torch|light)|amber (?:torch|light).*(?:work|use|nm)|uv (?:torch|light)/iu,
  colours:/rav.*(?:farve|sort|hvid|gul|brun)|hvilke farver|bernstein.*(?:farbe|schwarz|weiß|gelb|braun)|welche farben|amber.*(?:colour|color|black|white|yellow|brown)|what colou?r/iu,
  care:/opbevar.*rav|rengør.*rav|pudse.*rav|fundet rav.*(?:gøre|behandle)|bernstein.*(?:aufbewahr|reinig|polier)|fund.*bernstein|store.*amber|clean.*amber|polish.*amber|found amber.*(?:do|care)/iu,
  seasons:/årstid|vinter.*rav|sommer.*rav|bedste måned|jahreszeit|winter.*bernstein|sommer.*bernstein|bester monat|season|winter.*amber|summer.*amber|best month/iu,
  geology:/istid|sekundært lager|ravførende lag|eiszeit|sekundär.*lager|bernsteinführende schicht|ice age|secondary store|amber-bearing layer/iu,
  'beach-or-water':/strand eller vand|vand eller strand|waders eller strand|strand.*waders|strand oder wasser|wathose oder strand|strand.*wathose|beach or water|waders or beach|beach.*waders/iu,
  equipment:/udstyr|ravlygte|hvilken lygte|briller|vadestav|handske|tøj|ausrüstung|bernsteinlampe|welche lampe|brille|watstock|handschuh|kleidung|equipment|amber torch|which torch|glasses|wading staff|gloves|clothing/iu,
  waders:/waders?|vadejagt|vadning|gå i vandet|wathose|waten|suche im wasser|wading|search in the water/iu,
  density:/flyder|synker|massefylde|vægtfylde|saltvand|koldt vand|rav.*lettere|schwimmt|sinkt|dichte|salzwasser|kaltes wasser|bernstein.*leichter|float|sink|density|salt water|cold water|amber.*lighter/iu,
  availability:/skaber.*rav|storm.*(?:intet|ingen|ikke).*rav|ingen rav.*storm|ravlager|tømt.*rav|macht.*bernstein|sturm.*kein.*bernstein|kein bernstein.*sturm|bernsteinvorrat|geleert|create.*amber|storm.*no amber|no amber.*storm|amber store|depleted/iu,
  wind:/vindretning|fralandsvind|pålandsvind|østenvind|vestenvind|vinden.*rav|windrichtung|ablandig|auflandig|ostwind|westwind|wind.*bernstein|wind direction|offshore wind|onshore wind|easterly|westerly|wind.*amber/iu,
  sequence:/efter storm|timerne efter|vejrforløb|aftagende fase|eftervejr|nach dem sturm|stunden danach|wetterverlauf|abklingende phase|after the storm|hours after|weather sequence|declining phase|aftermath/iu,
  current:/strøm|bundstrøm|strømpil|langs kysten|udstrøm|strömung|strömungspfeil|bodenströmung|längs der küste|ausströmung|current|current arrow|bottom current|alongshore|outflow/iu,
  waves:/bølge|storm|bølgehøjde|bølgeperiode|welle|sturm|wellenhöhe|wellenperiode|wave|storm|wave height|wave period/iu,
  water:/vandstand|tidevand|højvande|lavvande|wasserstand|gezeiten|hochwasser|niedrigwasser|water level|tide|high water|low water/iu,
  signs:/tang(?:linje)?|opskyl|træstump|frø|kul|skaller|felttegn|strandlinje|seegras|spülsaum|holzstück|samen|kohle|muschel|feldzeichen|seaweed|wash line|strandline|wood|seeds|coal|shells|field signs/iu,
  technique:/teknik|hvordan finder|hvordan leder|hvor skal jeg lede|systematisk|tips|technik|wie finde|wie suche|wo suchen|systematisch|tipps|technique|how (?:do|can) i find|how (?:do|should) i search|where (?:do|should) i search|systematically|tips/iu,
});

const QUICK_KEYS = Object.freeze([
  'assistant.quick.score', 'assistant.quick.time', 'assistant.quick.place',
  'assistant.quick.equipment', 'assistant.quick.current', 'assistant.quick.waves'
]);

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const ASSISTANT_HISTORY_HOURS = 48;
const ASSISTANT_HISTORY_REASON_CODE = /^[A-Z][A-Z0-9_]{0,79}$/;
const ASSISTANT_SCORE_BOUND_FIELDS = Object.freeze([
  'lower','upper','modelUncertaintyPoints','rawLower','rawUpper',
]);

function publicScoreBounds(result, available) {
  if (!available) return result?.scoreBounds === null ? null : undefined;
  const bounds=result?.scoreBounds;
  if (!bounds||typeof bounds!=='object'||Array.isArray(bounds)
    ||JSON.stringify(Object.keys(bounds).sort())
      !==JSON.stringify([...ASSISTANT_SCORE_BOUND_FIELDS].sort())
    ||ASSISTANT_SCORE_BOUND_FIELDS.some(field=>finite(bounds[field])===null)
    ||bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper
    ||bounds.rawLower<0||bounds.rawUpper>100||bounds.rawLower>bounds.rawUpper
    ||Math.abs(bounds.modelUncertaintyPoints-(bounds.upper-bounds.lower))>1e-9
    ||result.score!==bounds.lower)return undefined;
  if(result.scoreQuality==='FULL_HISTORY'
    &&(bounds.lower!==bounds.upper||bounds.rawLower!==bounds.rawUpper))return undefined;
  return {...bounds};
}

function publicScoreQuality(result, available) {
  const coverage = finite(result?.historyCoverageHours);
  const reasonCodes = Array.isArray(result?.historyReasonCodes)
    && result.historyReasonCodes.length <= 12
    && result.historyReasonCodes.every(code => typeof code === 'string'
      && ASSISTANT_HISTORY_REASON_CODE.test(code))
    && new Set(result.historyReasonCodes).size === result.historyReasonCodes.length
    ? [...result.historyReasonCodes]
    : null;
  const scoreBounds=publicScoreBounds(result,available);
  if(scoreBounds===undefined)return {
    scoreQuality:'UNAVAILABLE',calibrationEligible:false,scoreSemantics:null,
    conservativeTailResetApplied:false,scoreBounds:null,
    historyCoverageHours:null,historyReasonCodes:[],
  };
  if (available
    && result.scoreQuality === 'FULL_HISTORY'
    && typeof result.calibrationEligible === 'boolean'
    && (RAVSCORE_CALIBRATION_ELIGIBLE === true
      || result.calibrationEligible === false)
    && coverage === ASSISTANT_HISTORY_HOURS
    && reasonCodes?.length === 0
    && ['EXACT_POINT_SCORE','CONSERVATIVE_TAIL_RESET_POINT_SCORE']
      .includes(result.scoreSemantics)
    && typeof result.conservativeTailResetApplied==='boolean'
    && result.conservativeTailResetApplied
      ===(result.scoreSemantics==='CONSERVATIVE_TAIL_RESET_POINT_SCORE')) {
    return {
      scoreQuality:'FULL_HISTORY',
      calibrationEligible:result.calibrationEligible,
      scoreSemantics:result.scoreSemantics,
      conservativeTailResetApplied:result.conservativeTailResetApplied,
      scoreBounds,historyCoverageHours:coverage, historyReasonCodes:[],
    };
  }
  if (available
    && result.scoreQuality === 'HISTORY_INCOMPLETE'
    && RAVSCORE_CALIBRATION_ELIGIBLE === true
    && result.calibrationEligible === false
    && coverage !== null
    && coverage >= 0
    && coverage <= ASSISTANT_HISTORY_HOURS
    && reasonCodes?.length > 0
    && result.scoreSemantics==='CONSERVATIVE_ENCLOSING_LOWER_BOUND'
    && typeof result.conservativeTailResetApplied==='boolean') {
    return {
      scoreQuality:'HISTORY_INCOMPLETE', calibrationEligible:false,
      scoreSemantics:result.scoreSemantics,
      conservativeTailResetApplied:result.conservativeTailResetApplied,
      scoreBounds,historyCoverageHours:coverage, historyReasonCodes:reasonCodes,
    };
  }
  if (!available
    && result.scoreQuality === 'UNAVAILABLE'
    && result.calibrationEligible === false
    && result.historyCoverageHours === null
    && reasonCodes?.length === 0
    && result.scoreSemantics===null
    && result.conservativeTailResetApplied===false) {
    return {
      scoreQuality:'UNAVAILABLE', calibrationEligible:false,
      scoreSemantics:null,conservativeTailResetApplied:false,scoreBounds:null,
      historyCoverageHours:null, historyReasonCodes:[],
    };
  }
  return {
    scoreQuality:'UNAVAILABLE', calibrationEligible:false,
    scoreSemantics:null,conservativeTailResetApplied:false,scoreBounds:null,
    historyCoverageHours:null, historyReasonCodes:[],
  };
}

function scoreRangeNotice(result, language) {
  const bounds=result?.scoreBounds;
  if(result?.scoreQuality!=='HISTORY_INCOMPLETE'
    ||finite(bounds?.lower)===null||finite(bounds?.upper)===null
    ||finite(bounds?.modelUncertaintyPoints)===null)return '';
  return `${t('score.historyIncomplete.short',{},language)}: ${t('score.historyIncomplete.range',{
    lower:formatNumber(bounds.lower,{maximumFractionDigits:1},language),
    upper:formatNumber(bounds.upper,{maximumFractionDigits:1},language),
    span:formatNumber(bounds.modelUncertaintyPoints,{maximumFractionDigits:1},language),
  },language)}.`;
}

function tomorrowQuestion(question) {
  return /i morgen|imorgen|morgen|tomorrow/i.test(String(question || ''));
}

function clock(iso, language) {
  return formatDateTime(iso, { weekday:'short', hour:'2-digit', minute:'2-digit' }, language);
}

// General model meaning, not an explanation of a selected coast or hour.
// Match the WHOLE raw message, as in the existing low-score/find contract.
function isGeneralHighScoreNoFindQuestion(value) {
  const raw = String(value || '').trim();
  if (raw.length > 600 || SECURITY_PATTERN.test(raw) || OUT_OF_SCOPE_PATTERN.test(raw)) return false;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ');
  return [
    /^(?:hvorfor|hvordan) kan (?:scoren|ravscore) være høj,? (?:uden at (?:jeg|vi|man) finder rav|(?:selv ?om|når) (?:jeg|vi|man) ikke finder rav)[?!.]*$/iu,
    /^(?:warum|wie) kann (?:der (?:bernsteinscore|ravscore|score)|bernsteinscore|ravscore) hoch sein,? (?:obwohl (?:ich keinen bernstein finde|wir keinen bernstein finden|man keinen bernstein findet)|ohne dass (?:ich bernstein finde|wir bernstein finden|man bernstein findet))[?!.]*$/iu,
    /^(?:why|how) can (?:the (?:amberscore|ravscore|score)|amberscore|ravscore) be high,? (?:without (?:me|us) finding (?:any )?amber|even (?:if|though) (?:i|we) (?:do not|don't) find (?:any )?amber)[?!.]*$/iu,
  ].some(pattern => pattern.test(text));
}

export function classifyRavQuestion(question) {
  const text = String(question || '').trim();
  if (practicalSearchPlan(text)) return 'practical-search-plan';
  if (isPracticalAlongshoreQuestion(text)) return 'practical-alongshore';
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) if (pattern.test(text)) return intent;
  const knowledge = matchLocalRavKnowledge(text);
  if (knowledge) return `knowledge:${knowledge.id}`;
  return 'unknown';
}

export function routeRavQuestion(question) {
  const text = String(question || '').trim();
  if (!text || SECURITY_PATTERN.test(text) || OUT_OF_SCOPE_PATTERN.test(text)) return 'fixed-refusal';
  const intent = classifyRavQuestion(text);
  if (intent !== 'unknown') return 'local-deterministic';
  return AMBER_DOMAIN_PATTERN.test(text) ? 'remote-candidate' : 'fixed-refusal';
}

export function ravQuestionNeedsConditionDetails(question) {
  if (matchLocalRavKnowledge(question)) return false;
  return ['best-place', 'best-time', 'score'].includes(classifyRavQuestion(question));
}

function allScored(context, dayOffset = 0, now = Date.now()) {
  const date = forecastDateKeyForDayOffset(now, dayOffset);
  const mode = context.mode || 'waders';
  return (context.zones?.features || []).map(feature => {
    const zone = feature.properties;
    const best = selectLocalBestForDay({ coastalParts:context.conditions?.coastalParts, zoneId:zone.id, mode, date, now });
    return best ? addNationalRanking({ zone, ...best }, context.zones?.coastalParts?.zones?.[zone.id] || []) : null;
  }).filter(Boolean).sort(compareNationalRankingRows);
}

function selectedScored(context, dayOffset = 0, now = Date.now()) {
  const zone = context.zone;
  if (!zone) return [];
  const date = forecastDateKeyForDayOffset(now, dayOffset);
  const coastalParts = context.conditions?.coastalParts;
  const mode = context.mode || 'waders';
  const selected = selectLocalBestForDay({ coastalParts, zoneId:zone.id, mode, date, now });
  return (selected?.candidates || []).map((candidate, index) => ({
    hour:{ time:candidate.time },
    result:buildLocalZoneScore({ coastalParts, zoneId:zone.id, mode, time:candidate.time }),
    selectionReason:index === 0 ? selected.selectionReason ?? null : null,
  })).filter(item => item.result?.available);
}

function scoreAnswer(context, language) {
  const result = context.result;
  const weather = context.weather || {};
  if (!context.zone) return t('assistant.local.noZone', {}, language);
  if (result?.available !== true || finite(result?.score) === null) {
    return t('assistant.local.noZoneForecast', {}, language);
  }
  const componentLines = [
    ['score.huntability', result.components?.huntability],
    ['score.transport', result.components?.transport],
    ['score.mobilisation', result.components?.release],
  ].filter(([, value]) => finite(value) !== null).map(([key, value]) => `• ${t(key, {}, language)}: ${Math.round(Number(value))}/100`);
  const presentation = presentIntegratedRavScoreExplanation(result, { language });
  if (!presentation.available) return t('assistant.local.noZoneForecast', {}, language);
  const process = `\n\n${presentation.summary}\n${presentation.facts.map(item => `• ${item}`).join('\n')}`;
  const qualityNotice=scoreRangeNotice(result,language);
  const localityNotice=result.winningPartUncertain===true
    ? t('assistant.local.winnerUncertain',{},language):'';
  const metric = (value, digits) => finite(value) === null
    ? t('common.missing', {}, language)
    : formatNumber(value, { maximumFractionDigits:digits }, language);
  return `${t('assistant.local.scoreHeading', { score:result.score, zone:context.zone?.name || t('common.unknown', {}, language) }, language)}${qualityNotice?`\n${qualityNotice}`:''}${localityNotice?`\n${localityNotice}`:''}\n\n${componentLines.join('\n') || `• ${t('assistant.local.scoreGeneric', {}, language)}`}${process}\n\n${t('assistant.local.currentWeather', {
    wind:metric(weather.windSpeedMps, 1),
    waves:metric(weather.waveHeightM, 1),
    current:metric(weather.currentSpeedMps, 2),
    water:metric(weather.waterLevelCm, 0),
  }, language)}`;
}

function bestPlace(context, question, language, now) {
  const tomorrow = tomorrowQuestion(question);
  const rows = allScored(context, tomorrow ? 1 : 0, now).slice(0, 5);
  if (!rows.length) return t('assistant.local.noRanking', {}, language);
  const day = t(tomorrow ? 'assistant.local.tomorrow' : 'assistant.local.today', {}, language);
  const qualityNotice=rows.some(item=>item.result.scoreQuality==='HISTORY_INCOMPLETE')
    ? `\n\n${t('assistant.local.historyRankingCaveat',{},language)}`:'';
  return `${t('assistant.local.bestPlaces', { day }, language)}\n\n${rows.map((item, index) => t('assistant.local.rankLine', {
    rank:index + 1, zone:item.zone.name, score:item.rankingDisplayScore ?? item.result.score, time:clock(item.hour.time, language)
  }, language)+(scoreRangeNotice(item.result,language)?` · ${scoreRangeNotice(item.result,language)}`:'')).join('\n')}\n\n${t('assistant.local.rankingBasis', {}, language)}${qualityNotice}`;
}

function bestTime(context, question, language, now) {
  if (!context.zone) return t('assistant.local.noZoneTime', {}, language);
  const tomorrow = tomorrowQuestion(question);
  const rows = selectedScored(context, tomorrow ? 1 : 0, now).slice(0, 3);
  if (!rows.length) return t('assistant.local.noZoneForecast', {}, language);
  const best = rows[0];
  const day = t(tomorrow ? 'assistant.local.tomorrow' : 'assistant.local.today', {}, language);
  const alternatives = rows.slice(1).map(item => `${clock(item.hour.time, language)} (${item.result.score})`).join(', ') || t('assistant.local.noNextTimes', {}, language);
  const reason = best.selectionReason
    ? t(bestTimeSelectionReasonI18nKey(best.selectionReason), {}, language)
    : t('score.bestTimeBody', { future:'' }, language);
  const qualityNotice=scoreRangeNotice(best.result,language);
  return `${t('assistant.local.bestTime', { day, zone:context.zone.name, time:clock(best.hour.time, language), score:best.result.score }, language)}${qualityNotice?`\n${qualityNotice}`:''}\n\n${reason}\n\n${t('assistant.local.nextTimes', { times:alternatives }, language)}`;
}

function equipmentAnswer(context, language) {
  const wind = finite(context.weather?.windSpeedMps);
  const extra = wind !== null && wind >= 6
    ? ` ${t('assistant.local.equipmentWind', { wind:formatNumber(wind, { maximumFractionDigits:1 }, language) }, language)}`
    : '';
  return t('assistant.local.equipment', {}, language) + extra;
}

// Account for each independent field question before a broad catalogue match
// can consume its neighbours. Current authored units only; no chat history.
// Vocabulary certifies only understood qualifications; it never supplies facts.
const FIELD_COMPOUND_WORDS = new Set(('jeg vi mig os er en et at og på i til skal bør kan vil være helt det den de der som hvilken hvilket hvilke hvad hvor hvordan bruge bruger vælge nyttigt nyttige anbefaler anbefales har brug for du systematisk vandet vand gå med trygt ud begynder begyndere nybegynder nybegyndere lede leder søger søge kigge se finder finde rav stranden strand udstyr betyder høj lav score ravscore sikker sikkert sikre så genkender identificerer genkende identificere '
  + 'ich wir mich uns bin sind ein eine das die der es und am im zu auf für ist kann können soll sollte brauche brauchen benutzen wählen nützlich wo wie was welche welcher welches möchte möchten wollen anfänger finden suchen suche schauen bernstein strand ausrüstung bedeutet hoher niedriger score ravscore sicher sein gefahrlos ins wasser gehen waten erkenne erkennen '
  + 'what which where how why i we me us am are a an the it and on in into to for is can should do does want would like need use choose useful recommend beginner beginners look search find finding amber beach equipment mean means high low score ravscore sure be of safely safe go wade water identify recognise recognize').split(/\s+/u));

function fieldCompoundAnswer(question, language) {
  const raw = String(question || '').trim();
  if (raw.length > 600) return null;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ');
  const starter = String.raw`(?:hvor|hvordan|hvad|hvilk(?:et|en|e)|kan|er|betyder|wo|wie|was|welch(?:e|es|er)|kann|bin|bedeutet|where|how|what|which|can|am|does)\b`;
  const parts = text.split(new RegExp(
    String.raw`[?？]\s*(?=\p{L})|[,:.;]\s*(?:(?:og|und|and)\s+)?(?=${starter})|\s+(?:og|und|and)\s+(?=${starter})`, 'iu')).map(part => part.trim()).filter(Boolean);
  if (parts.some(part => tomorrowQuestion(part)
    || ['current','wind','waves','water','best-time','score','model','practical-alongshore'].includes(classifyRavQuestion(part)))) return null;
  const units = [];
  let beachContext = false, unresolved = false;
  for (const part of parts) {
    const clause = part.replace(/^(?:og|und|and)\s+/iu, '');
    const words = clause.toLowerCase().match(/\p{L}+/gu) || [];
    const covered = words.length > 0 && !/\d/u.test(clause)
      && words.every(word => FIELD_COMPOUND_WORDS.has(word));
    // A whole beginner statement supplies no fact and is not an unanswered request.
    if (covered && /^(?:jeg er (?:en )?(?:nybegynder|begynder)|ich bin (?:ein )?anfänger|i am (?:a )?beginner)[.!]*$/iu.test(clause)) continue;
    const identification = /^(?:hvordan (?:(?:genkender|identificerer) (?:jeg|vi)|kan (?:jeg|vi) (?:genkende|identificere)) rav|wie (?:erkenne ich|erkennen wir) bernstein|how (?:do|can) (?:i|we) (?:identify|recognise|recognize) amber)[?.!]*$/iu.test(clause);
    const safety = INTENT_PATTERNS.safety.test(clause);
    const certainty = !safety
      && /(?<!\p{L})(?:sikker|sikkert|sikre|sicher|sure|certain|guaranteed)(?!\p{L})/iu.test(clause)
      && /(?:finde[rn]?|find(?:ing)?)\s+(?:rav|bernstein|amber)(?!\p{L})|bernstein\s+zu\s+finden/iu.test(clause);
    const search = /(?<!\p{L})(?:lede|leder|søge|søger|kigge|suchen|suche|schauen|look|search)(?!\p{L})/iu.test(clause);
    const beach = /(?<!\p{L})(?:stranden|strand|beach)(?!\p{L})/iu.test(clause);
    const intent = classifyRavQuestion(clause);
    if (intent === 'best-place' && !(covered && search && (beach || beachContext))) return null;
    let unit = null;
    if (safety) {
      unit = { key:'safety', answer:t('assistant.local.safety', {}, language) };
      if (!covered) unresolved = true;
    } else if (covered && identification) {
      unit = { key:'identification', answer:t('assistant.local.identification', {}, language) };
    } else if (covered && certainty) {
      unit = { key:'limitations', answer:t('assistant.local.limitations', {}, language) };
    } else if (covered && INTENT_PATTERNS['beach-or-water'].test(clause)) {
      unit = { key:'beach-or-water', answer:t('assistant.local.beachOrWater', {}, language) };
    } else if (covered && search && (beach || beachContext)
      && !['best-time','score'].includes(intent)) {
      beachContext = true;
      unit = { key:'beach-method', answer:localRavKnowledgeAnswer('strandjagt teknik', language) };
    } else if (covered && intent === 'equipment') {
      unit = { key:'equipment', answer:t('assistant.local.equipment', {}, language) };
    }
    if (unit?.answer) units.push(unit);
    else {
      // A different known topic belongs to the established normal composer,
      // not to this field-only coverage contract. Do not relabel it unknown.
      if (matchLocalRavKnowledge(clause)
        || !['unknown','equipment','safety','limitations','technique','beach-or-water','identification'].includes(intent)) return null;
      unresolved = true;
    }
  }
  // Ordinary single questions and unrelated compounds keep their existing
  // routes. Finding certainty is a self-contained follow-up, not safety.
  if (parts.length === 1 && units[0]?.key !== 'limitations') return null;
  if (!units.some(unit => ['beach-method','equipment','beach-or-water','limitations'].includes(unit.key))) return null;
  const answers = [...new Set(units.map(unit => unit.answer))];
  if (unresolved) answers.push(t('assistant.unknown', {}, language));
  const answer = answers.join('\n\n');
  // All understood units or an honest unresolved answer: never first-N or
  // clipping that silently removes a qualification or an unanswered clause.
  const topic = !unresolved && units.some(unit => unit.key === 'identification')
    && units.some(unit => unit.key === 'equipment')
    && units.every(unit => ['identification','equipment'].includes(unit.key)) ? 'field-identification-equipment' : null;
  return { answer:answer.length <= 900 ? answer : t('assistant.unknown', {}, language),
    topic:answer.length <= 900 ? topic : null };
}

function localAnswer(question, context, language, now = Date.now()) {
  const plan = practicalSearchPlan(question);
  if (plan) return practicalSearchPlanAnswer(plan, language);
  const intent = classifyRavQuestion(question);
  if (intent === 'practical-alongshore') {
    const topic = matchLocalRavKnowledge('Kan strøm langs kysten flytte rav?');
    const answer = topic.answers[language] + '\n\n' + t('assistant.local.signs', {}, language);
    return answer.length <= 900 ? answer : t('assistant.unknown', {}, language);
  }
  const presentation = presentIntegratedRavScoreExplanation(context?.result, { language });
  if (presentation.available) {
    if (intent === 'current') return `${presentation.sections.gridCurrent}\n\n${presentation.sections.lastMile}`;
    if (intent === 'waves') return `${t('assistant.local.waves', {}, language)}\n\n${presentation.sections.lastMile}`;
    if (intent === 'water') return `${presentation.sections.waterLevel}\n\n${presentation.sections.lastMile}`;
    if (intent === 'model') return `${presentation.summary}\n\n${presentation.facts.map(item => `• ${item}`).join('\n')}`;
    if (intent === 'limitations') return `${presentation.sections.limitations}\n\n${presentation.sections.lastMile}`;
  }
  const knowledgeAnswer = localRavKnowledgeAnswer(question, language);
  if (knowledgeAnswer) return knowledgeAnswer;
  if (intent === 'equipment') return equipmentAnswer(context, language);
  if (intent === 'best-place') return bestPlace(context, question, language, now);
  if (intent === 'best-time') return bestTime(context, question, language, now);
  if (intent === 'score') return scoreAnswer(context, language);
  if (intent === 'safety') return t('assistant.local.safety', {}, language);
  if (intent === 'model') return t('assistant.local.model', {}, language);
  if (intent === 'missing-data') return t('assistant.local.missingData', {}, language);
  if (intent === 'limitations') return t('assistant.local.limitations', {}, language);
  if (intent === 'origin') return t('assistant.local.origin', {}, language);
  if (intent === 'identification') return t('assistant.local.identification', {}, language);
  if (intent === 'lamp') return t('assistant.local.lamp', {}, language);
  if (intent === 'colours') return t('assistant.local.colours', {}, language);
  if (intent === 'care') return t('assistant.local.care', {}, language);
  if (intent === 'seasons') return t('assistant.local.seasons', {}, language);
  if (intent === 'geology') return t('assistant.local.geology', {}, language);
  if (intent === 'beach-or-water') return t('assistant.local.beachOrWater', {}, language);
  if (intent === 'waders') return t('assistant.local.waders', {}, language);
  if (intent === 'density') return t('assistant.local.density', {}, language);
  if (intent === 'availability') return t('assistant.local.availability', {}, language);
  if (intent === 'wind') return t('assistant.local.wind', {}, language);
  if (intent === 'current') return t('assistant.local.current', {}, language);
  if (intent === 'waves') return t('assistant.local.waves', {}, language);
  if (intent === 'water') return t('assistant.local.water', {}, language);
  if (intent === 'coast') return t('assistant.local.coast', {}, language);
  if (intent === 'signs') return t('assistant.local.signs', {}, language);
  if (intent === 'sequence') return t('assistant.local.sequence', {}, language);
  if (intent === 'technique') return t('assistant.local.technique', {}, language);
  return t('assistant.unknown', {}, language);
}

function shortText(value, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

export function publicAssistantContext(value = {}, language = getLanguage()) {
  const context = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const zone = context.zone && typeof context.zone === 'object' && !Array.isArray(context.zone) ? context.zone : {};
  const result = context.result && typeof context.result === 'object' && !Array.isArray(context.result) ? context.result : {};
  const weather = context.weather && typeof context.weather === 'object' && !Array.isArray(context.weather) ? context.weather : {};
  const modelBindingMatches = sameRavScoreModelBinding(
    context.modelBinding,
    ACTIVE_RAVSCORE_MODEL_BINDING,
  );
  const numericScore = finite(result.score);
  const basicScoreAvailable = modelBindingMatches
    && result.available === true
    && numericScore !== null
    && numericScore >= 0
    && numericScore <= 100;
  const scoreQuality = publicScoreQuality(result, basicScoreAvailable);
  const scoreAvailable = basicScoreAvailable && scoreQuality.scoreQuality !== 'UNAVAILABLE';
  return {
    locale:normaliseLanguage(language),
    mode:context.mode === 'beach' ? 'beach' : 'waders',
    modelBinding:{ ...ACTIVE_RAVSCORE_MODEL_BINDING },
    zone:{ id:shortText(zone.id, 80), name:shortText(zone.name, 100), coastType:shortText(zone.coastType, 60) },
    result:{
      available:scoreAvailable,
      score:scoreAvailable ? numericScore : null,
      level:scoreAvailable ? shortText(result.level, 40) : null,
      ...(scoreAvailable ? scoreQuality : publicScoreQuality(result, false)),
    },
    weather:{
      time:shortText(weather.time, 40), provider:shortText(weather.provider, 60),
      windSpeedMps:finite(weather.windSpeedMps), windDirectionDeg:finite(weather.windDirectionDeg),
      waveHeightM:finite(weather.waveHeightM), wavePeriodS:finite(weather.wavePeriodS),
      waterLevelCm:finite(weather.waterLevelCm), currentSpeedMps:finite(weather.currentSpeedMps),
      currentDirectionDeg:finite(weather.currentDirectionDeg), waterTemperatureC:finite(weather.waterTemperatureC)
    }
  };
}

async function remoteAnswer(question, context, language) {
  if (PUBLIC_CONFIG.ravAssistantRemoteEnabled !== true || !PUBLIC_CONFIG.supabaseUrl || !PUBLIC_CONFIG.supabasePublishableKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${PUBLIC_CONFIG.supabaseUrl}/functions/v1/ravradar-assistant`, {
      method:'POST',
      headers:{ apikey:PUBLIC_CONFIG.supabasePublishableKey, 'Content-Type':'application/json' },
      body:JSON.stringify({ question, locale:normaliseLanguage(language), context:publicAssistantContext(context, language) }),
      signal:controller.signal
    });
    if (!response.ok) return t('assistant.remoteUnavailable', {}, language);
    const responseBindingMatches = response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelId) === ACTIVE_RAVSCORE_MODEL_BINDING.modelId
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelStateVersion) === ACTIVE_RAVSCORE_MODEL_BINDING.stateSchemaVersion
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelContractSha256) === ACTIVE_RAVSCORE_MODEL_BINDING.modelContractSha256
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelBundleSha256) === ACTIVE_RAVSCORE_MODEL_BINDING.modelBundleSha256
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.knowledgeSchema) === RAV_ASSISTANT_KNOWLEDGE_SCHEMA
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.knowledgeSha256) === RAV_ASSISTANT_KNOWLEDGE_SHA256;
    if (!responseBindingMatches) return t('assistant.remoteUnavailable', {}, language);
    const answer = (await response.json())?.answer;
    return typeof answer === 'string' && answer.trim() && answer.length <= 900 ? answer.trim() : t('assistant.remoteUnavailable', {}, language);
  } catch {
    return t('assistant.remoteUnavailable', {}, language);
  } finally {
    clearTimeout(timer);
  }
}

export async function askRavRadar(question, context = {}, options = {}) {
  const language = normaliseLanguage(options?.language || context?.locale || getLanguage());
  const raw = String(question || '').trim();
  if (!raw) throw new Error(t('assistant.empty', {}, language));
  if (SECURITY_PATTERN.test(raw) || OUT_OF_SCOPE_PATTERN.test(raw)) return t('assistant.refusal', {}, language);
  const safe = raw.slice(0, 600);
  const route = routeRavQuestion(safe);
  if (classifyRavQuestion(safe) === 'practical-alongshore' && !isPracticalAlongshoreQuestion(question)) {
    return t('assistant.unknown', {}, language);
  }
  if (route === 'fixed-refusal') return t('assistant.refusal', {}, language);
  const field = fieldCompoundAnswer(raw, language);
  if (field) return field.answer;
  if (isGeneralHighScoreNoFindQuestion(question)) {
    return t('assistant.local.limitations', {}, language) + '\n\n' + t('assistant.local.availability', {}, language);
  }
  if (practicalSearchPlan(safe) && !practicalSearchPlan(question)) return t('assistant.unknown', {}, language);
  if (route === 'local-deterministic' || options?.localOnly) {
    return localAnswer(safe, context, language, options?.now ?? Date.now());
  }
  return await remoteAnswer(safe, context, language)
    || localAnswer(safe, context, language, options?.now ?? Date.now());
}


// A complete time-bounded field request, not a forecast or an inferred place.
// The three independent clauses describe the task, time and optional premises;
// anything left over keeps the ordinary route. No private context is consulted.
function practicalSearchPlan(value) {
  const raw = String(value || '').trim();
  if (raw.length > 600) return null;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ').replace(/[?.!]+$/u, '');
  const grammars = [
    { request:/^(?:hvordan (?:planlægger|tilrettelægger) (?:jeg|vi)|(?:lav|læg|giv mig) en plan for) (.+)$/iu,
      duration:/^(?:(en halv|en|to|tre) (?:times?|timers)|([1-9]\d{0,2}) minutter(?:s)?) (?:ravjagt|ravtur|søgning efter rav)(?: på stranden)?$/iu,
      split:/,? (?:når|hvis) /iu, join:/,? og /iu,
      current:/^(?:strømmen|strøm) (?:går|løber) (?:langs (?:kysten|stranden)|parallelt med (?:kysten|stranden))$/iu,
      sparse:/^(?:der (?:er|ligger) (?:næsten ingen|meget lidt|lidt|ingen) (?:tang|opskyl)|der (?:næsten ikke|ikke) er (?:tang|opskyl))$/iu,
      hours:{'en halv':30,en:60,to:120,tre:180} },
    { request:/^(?:wie (?:plane|organisiere) ich|(?:erstelle|gib mir) einen plan für) (.+)$/iu,
      duration:/^(?:(eine halbe|eine|zwei|drei) stunden?|([1-9]\d{0,2}) minuten) (?:bernsteinsuche|bernsteinjagd)(?: am strand)?$/iu,
      split:/,? (?:wenn|falls) /iu, join:/,? und /iu,
      current:/^die strömung (?:(?:flie(?:ß|ss)t|verläuft) (?:entlang der küste|parallel zur küste)|(?:entlang der küste|parallel zur küste) (?:flie(?:ß|ss)t|verläuft))$/iu,
      sparse:/^(?:es (?:fast kein|kein|wenig|sehr wenig) (?:seegras|spülsaum) gibt|(?:fast kein|kein|wenig|sehr wenig) (?:seegras|spülsaum) da ist)$/iu,
      hours:{'eine halbe':30,eine:60,zwei:120,drei:180} },
    { request:/^(?:how (?:do|should|can) (?:i|we) plan|(?:make|give me) a plan for) (.+)$/iu,
      duration:/^(?:(half an|an|one|two|three) hours?|([1-9]\d{0,2}) minutes?) (?:of )?(?:amber hunting|amber searching|searching for amber)(?: on the beach)?$/iu,
      split:/,? (?:when|if) /iu, join:/,? and /iu,
      current:/^the current (?:flows|runs) (?:along the coast|alongshore|parallel to the coast)$/iu,
      sparse:/^(?:there is|there's) (?:almost no|no|little|very little) (?:seaweed|wrack)$/iu,
      hours:{'half an':30,an:60,one:60,two:120,three:180} },
  ];
  for (const grammar of grammars) {
    const request = text.match(grammar.request);
    if (!request) continue;
    const [task, ...conditions] = request[1].split(grammar.split);
    if (conditions.length > 1) continue;
    const duration = task.match(grammar.duration);
    if (!duration) continue;
    const minutes = duration[1] ? grammar.hours[duration[1].toLowerCase()] : Number(duration[2]);
    // The route is a short beach outing, not an expedition or safety judgement.
    if (!Number.isSafeInteger(minutes) || minutes < 15 || minutes > 180) continue;
    const seen = new Set();
    for (const condition of conditions.flatMap(part => part.split(grammar.join))) {
      const kind = grammar.current.test(condition) ? 'alongshore' : grammar.sparse.test(condition) ? 'sparse' : null;
      if (!kind || seen.has(kind)) { seen.add('unknown'); break; }
      seen.add(kind);
    }
    if (!seen.has('unknown')) return { minutes, alongshore:seen.has('alongshore'), sparse:seen.has('sparse') };
  }
  return null;
}

function practicalSearchPlanAnswer(plan, language) {
  // Suggested allocation of the user's time, not a model threshold or promise.
  const first = Math.max(3, Math.round(plan.minutes / 6));
  const last = plan.minutes - first;
  const copy = {
    da:[`Forsigtig strandplan for ${plan.minutes} minutter – ikke en vadeplan:`,
      `0–${first} min: Se efter opskyl, let materiale og overgange fra land. Vælg en kort strækning med sikker adgang.`,
      `${first}–${last} min: Gå langsomt langs kanter og små ansamlinger; sammenlign også foran og bag opskyllet.`,
      `${last}–${plan.minutes} min: Gense de tydeligste spor, eller afslut turen, hvis der ikke er noget at følge.`,
      'Med den strømretning, du beskriver, kan du sammenligne overgange langs stranden; den fortæller ikke, hvor rav ender.',
      'Når der er lidt tang som beskrevet, så kig også efter træstumper, frø og sorterede bånd; få spor er ikke bevis på intet rav.',
      'Bliv på land ved usikre forhold. Planen garanterer hverken sikre forhold eller fund.'],
    de:[`Vorsichtiger Strandplan für ${plan.minutes} Minuten – kein Watplan:`,
      `0–${first} Min.: Suche vom Land aus nach Spülsäumen, Leichtmaterial und Übergängen. Wähle einen kurzen Abschnitt mit sicherem Zugang.`,
      `${first}–${last} Min.: Gehe langsam an Kanten und kleinen Ansammlungen entlang; vergleiche auch vor und hinter dem Spülsaum.`,
      `${last}–${plan.minutes} Min.: Prüfe die deutlichsten Spuren erneut oder beende die Suche, wenn es keine gibt.`,
      'Bei der beschriebenen Strömungsrichtung kannst du Übergänge am Strand vergleichen; sie sagt nicht, wo Bernstein endet.',
      'Bei wenig Seegras wie beschrieben achte auch auf Holz, Samen und sortierte Bänder; wenige Spuren beweisen nicht, dass Bernstein fehlt.',
      'Bleibe bei unsicheren Bedingungen an Land. Der Plan garantiert weder Sicherheit noch Funde.'],
    en:[`Cautious beach plan for ${plan.minutes} minutes – not a wading plan:`,
      `0–${first} min: Look from land for wrack lines, light material and transitions. Choose a short stretch with safe access.`,
      `${first}–${last} min: Search slowly along edges and small accumulations; compare in front of and behind the wrack line too.`,
      `${last}–${plan.minutes} min: Recheck the clearest clues, or finish if there is nothing to follow.`,
      'With the current direction you describe, compare transitions along the beach; it does not tell you where amber ends up.',
      'With little seaweed as described, also look for wood, seeds and sorted bands; few clues do not prove there is no amber.',
      'Stay on land in uncertain conditions. The plan guarantees neither safety nor finds.'],
  }[language];
  return [copy[0],copy[1],copy[2],copy[3],...(plan.alongshore?[copy[4]]:[]),...(plan.sparse?[copy[5]]:[]),copy[6]].join('\n\n');
}

// A generic transport premise plus a practical search question, not a live
// forecast, safety assessment, score calculation or inferred earlier turn.
// Consume the whole input: extra/unknown clauses keep their ordinary route.
function isPracticalAlongshoreQuestion(value) {
  const raw = String(value || '').trim();
  if (raw.length > 600) return false;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ');
  const transport = 'strøm(?:men)? (?:går|løber|bevæger sig) (?:langs (?:stranden|kysten)|parallelt med (?:stranden|kysten))(?: i stedet for mod land)?';
  const search = '(?:(?:er det|kan det være) (?:så )?(?:stadig )?(?:godt|relevant|værd) at (?:lede|søge)(?: efter rav)?|(?:kan|bør) (?:jeg|vi) (?:så )?(?:stadig )?(?:lede|søge) efter rav)';
  return new RegExp('^(?:(?:når|hvis) ' + transport + ',? ' + search + '|' + search + ',? (?:når|hvis) ' + transport + ')[?.!]*$', 'iu').test(text);
}


// Only this explicit authored topic may be retained by the local dialog.
// No question, answer, location details or transcript is retained/sent.
export function assistantTopicForQuestion(question) {
  const text = String(question || '').trim();
  if (SECURITY_PATTERN.test(text) || OUT_OF_SCOPE_PATTERN.test(text)) return null;
  return fieldCompoundAnswer(text, getLanguage())?.topic
    ?? (isPracticalAlongshoreQuestion(text) ? 'alongshore' : null);
}

export function assistantLocalFollowupAnswer(question, topic, language = getLanguage()) {
  const raw = String(question || '').trim();
  if (raw.length > 600 || SECURITY_PATTERN.test(raw) || OUT_OF_SCOPE_PATTERN.test(raw)) return null;
  const text = raw.normalize('NFKC').replace(/\s+/gu, ' ');
  const daylight = [
    /^(?:(?:og|så) )?hvis (?:jeg|vi) kun (?:leder|søger) i dagslys[?.!]*$/iu,
    /^(?:(?:und|also) )?wenn (?:ich nur bei tageslicht suche|wir nur bei tageslicht suchen)[?.!]*$/iu,
    /^(?:(?:and|so) )?if (?:i|we) only (?:search|look) in daylight[?.!]*$/iu,
  ];
  if (daylight.some(pattern => pattern.test(text))) {
    if (topic !== 'field-identification-equipment') return t('assistant.unknown', {}, language);
    const answer = t('assistant.local.technique', {}, language) + '\n\n' + t('assistant.local.identification', {}, language);
    return answer.length <= 900 ? answer : t('assistant.unknown', {}, language);
  }
  const patterns = [
    /^(?:(?:og|så) )?hvor (?:skal|kan|bør) (?:jeg|vi) (?:kigge|lede|søge)(?: efter rav)? (?:i den situation|i det tilfælde|så|der)[?.!]*$/iu,
    /^(?:(?:und|also) )?wo (?:soll|kann|sollte) (?:ich|wir) (?:dann )?(?:nach bernstein )?suchen (?:in dieser situation|in diesem fall|dann|dort)[?.!]*$/iu,
    /^(?:(?:and|so) )?where (?:should|can) (?:i|we) (?:look|search)(?: for amber)? (?:in that situation|in that case|then|there)[?.!]*$/iu,
  ];
  if (!patterns.some(pattern=>pattern.test(text))) return null;
  if (topic !== 'alongshore') return t('assistant.unknown', {}, language);
  return localRavKnowledgeAnswer('Hvordan leder jeg systematisk på stranden?', language);
}

export function quickQuestions(language = getLanguage()) {
  return QUICK_KEYS.map(key => t(key, {}, language));
}

export const QUICK_QUESTIONS = Object.freeze(quickQuestions('da'));
