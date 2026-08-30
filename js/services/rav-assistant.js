import { PUBLIC_CONFIG } from "../../config.js?v=4.0.315";
import { localRavKnowledgeAnswer, matchLocalRavKnowledge } from "../../knowledge/rav-assistant-local-v2.js?v=4.0.315";
import { buildLocalZoneScore, selectLocalBestForDay } from "../core/local-zone-score.js?v=4.0.315";
import { formatDateTime, formatNumber, getLanguage, normaliseLanguage, t } from "../i18n.js?v=4.0.315";

const SECURITY_PATTERN = /api.?key|password|passwort|adgangskode|supabase|database|datenbank|sql|source code|kildekode|quellcode|system.?prompt|systeminstruk|admin|token|secret|hemmelig|geheim/i;
const OUT_OF_SCOPE_PATTERN = /(?<![\p{L}\p{N}_])(?:roulade|biskuitrolle|swiss roll|kage|kuchen|cake|fodbold|fußball|football|opskrift|rezept|recipe|politik|politics|aktie|stock price|matematik|math homework)(?![\p{L}\p{N}_])/iu;
const AMBER_DOMAIN_PATTERN = /(?<![\p{L}\p{N}_])(?:rav\p{L}*|bernstein\p{L}*|succinit|succinite|copal|kopal|amber\p{L}*|harpiks|harz|resin|fossili[sz]|inklusion|einschluss|inclusion|fluorescen|fluoreszenz|fluorescen[ct]e|uv.?light|395\s*nm|fosfor|phosphor|phosphorus|danefæ|kesse|kescher|kyst|küste|coast|strand|beach|hav|meer|sea|bølge|welle|wave|strøm|strömung|current|vandstand|wasserstand|water level|wader|wathose|opskyl|spülsaum|wash line|tang|seegras|seaweed|revle|sandbank|sandbar|revlehul|brandungsrückstrom|rip current|rende|rinne|channel|høfde|buhne|groyne|opdrift|auftrieb|buoyancy|massefylde|dichte|density|saltation|sediment|geologi|geology|geologie|istid|eiszeit|ice age)(?![\p{L}\p{N}_])/iu;
const INTENT_PATTERNS = Object.freeze({
  coast:/revle|sandbanke|rende|høfde|mole|kystknæk|læside|strandhældning|sandbank|rinne|buhne|küstenknick|leeseite|strandneigung|sandbar|channel|groyne|pier|coastal bend|lee side|beach slope/iu,
  'best-place':/bedste (?:sted|område)|hvor (?:skal|bør) (?:jeg|vi).*(?:lede|tage|køre)|hvor er (?:det )?bedst|køre hen|bester ort|bestes gebiet|wo (?:soll|sollte) (?:ich|wir).*(?:suchen|fahren)|wo ist es am besten|wohin fahren|best (?:place|area)|where should (?:i|we).*(?:search|go|drive)|where is best|drive to/iu,
  'best-time':/bedste tidspunkt|hvornår er (?:det )?bedste tidspunkt|hvilket tidspunkt|hvornår (?:skal|bør) (?:jeg|vi)|beste zeit|wann ist die beste zeit|zu welcher zeit|wann (?:soll|sollte) (?:ich|wir)|best time|what time|when is the best time|when should (?:i|we)/iu,
  score:/hvorfor.*score|score.*hvorfor|trækker op|trækker ned|warum.*score|score.*warum|warum.*ravscore|why.*score|score.*why/iu,
  safety:/sikkerhed|farlig|risiko|er det sikkert(?:\?|$| at)|sikkert at (?:gå|vade)|sicherheit|gefährlich|ist (?:es|das) sicher(?:\?|$| zu)|sicher zu waten|safety|danger|\brisk\b|is it safe(?:\?|$| to)|safe to (?:go|wade)/iu,
  model:/candidate\s*g|ravscore.*(?:vægt|model|beregn|betyder|procent)|hvordan (?:virker|beregnes) ravscore|ravscore.*(?:gewicht|modell|berechn|bedeutet|prozent)|wie (?:funktioniert|wird) ravscore|ravscore.*(?:weight|model|calculat|mean|percent)|how (?:does|is) ravscore/iu,
  'missing-data':/mangler.*(?:data|prognose|historik)|ingen.*(?:data|prognose)|utilgængelig|låner.*score|fehl(?:en|t).*(?:daten|prognose|verlauf)|(?:daten|prognose|verlauf).*fehl(?:en|t)|keine.*(?:daten|prognose)|nicht verfügbar|wert.*leihen|missing.*(?:data|forecast|history|evidence)|no.*(?:data|forecast)|unavailable|borrow.*score/iu,
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
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function tomorrowQuestion(question) {
  return /i morgen|imorgen|morgen|tomorrow/i.test(String(question || ''));
}

function clock(iso, language) {
  return formatDateTime(iso, { weekday:'short', hour:'2-digit', minute:'2-digit' }, language);
}

export function classifyRavQuestion(question) {
  const text = String(question || '').trim();
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

function allScored(context, dayOffset = 0) {
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + dayOffset);
  const date = target.toISOString().slice(0, 10);
  const mode = context.mode || 'waders';
  return (context.zones?.features || []).map(feature => {
    const zone = feature.properties;
    const best = selectLocalBestForDay({ coastalParts:context.conditions?.coastalParts, zoneId:zone.id, mode, date });
    return best ? { zone, ...best } : null;
  }).filter(Boolean).sort((left, right) => right.result.score - left.result.score || Date.parse(left.hour.time) - Date.parse(right.hour.time));
}

function selectedScored(context, dayOffset = 0) {
  const zone = context.zone;
  if (!zone) return [];
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + dayOffset);
  const date = target.toISOString().slice(0, 10);
  const coastalParts = context.conditions?.coastalParts;
  return (coastalParts?.zones?.[zone.id]?.hourly || [])
    .filter(row => String(row.time || '').slice(0, 10) === date)
    .map(row => ({ hour:{ time:row.time }, result:buildLocalZoneScore({ coastalParts, zoneId:zone.id, mode:context.mode || 'waders', time:row.time }) }))
    .filter(item => item.result?.available)
    .sort((left, right) => right.result.score - left.result.score || Date.parse(left.hour.time) - Date.parse(right.hour.time));
}

function scoreAnswer(context, language) {
  const result = context.result;
  const weather = context.weather || {};
  if (!result) return t('assistant.local.noZone', {}, language);
  const componentLines = [
    ['score.huntability', result.components?.huntability],
    ['score.transport', result.components?.transport],
    ['score.mobilisation', result.components?.mobilisation],
  ].filter(([, value]) => finite(value) !== null).map(([key, value]) => `• ${t(key, {}, language)}: ${Math.round(Number(value))}/100`);
  const state = result.explanation?.transportEvent?.stateExplanation;
  const history = state?.summary
    ? `\n\n${t('assistant.local.historyHeading', {}, language)} ${language === 'da' ? state.summary : t('assistant.local.historyGeneric', {}, language)}${language === 'da' && Array.isArray(state.facts) && state.facts.length ? `\n${state.facts.slice(0, 3).map(item => `• ${item}`).join('\n')}` : ''}`
    : '';
  return `${t('assistant.local.scoreHeading', { score:result.score, zone:context.zone?.name || t('common.unknown', {}, language) }, language)}\n\n${componentLines.join('\n') || `• ${t('assistant.local.scoreGeneric', {}, language)}`}${history}\n\n${t('assistant.local.currentWeather', {
    wind:formatNumber(weather.windSpeedMps, { maximumFractionDigits:1 }, language),
    waves:formatNumber(weather.waveHeightM, { maximumFractionDigits:1 }, language),
    current:formatNumber(weather.currentSpeedMps, { maximumFractionDigits:2 }, language),
    water:formatNumber(weather.waterLevelCm, { maximumFractionDigits:0 }, language),
  }, language)}`;
}

function bestPlace(context, question, language) {
  const tomorrow = tomorrowQuestion(question);
  const rows = allScored(context, tomorrow ? 1 : 0).slice(0, 5);
  if (!rows.length) return t('assistant.local.noRanking', {}, language);
  const day = t(tomorrow ? 'assistant.local.tomorrow' : 'assistant.local.today', {}, language);
  return `${t('assistant.local.bestPlaces', { day }, language)}\n\n${rows.map((item, index) => t('assistant.local.rankLine', {
    rank:index + 1, zone:item.zone.name, score:item.result.score, time:clock(item.hour.time, language)
  }, language)).join('\n')}\n\n${t('assistant.local.rankingBasis', {}, language)}`;
}

function bestTime(context, question, language) {
  if (!context.zone) return t('assistant.local.noZoneTime', {}, language);
  const tomorrow = tomorrowQuestion(question);
  const rows = selectedScored(context, tomorrow ? 1 : 0).slice(0, 3);
  if (!rows.length) return t('assistant.local.noZoneForecast', {}, language);
  const best = rows[0];
  const day = t(tomorrow ? 'assistant.local.tomorrow' : 'assistant.local.today', {}, language);
  const alternatives = rows.slice(1).map(item => `${clock(item.hour.time, language)} (${item.result.score})`).join(', ') || t('assistant.local.noNextTimes', {}, language);
  return `${t('assistant.local.bestTime', { day, zone:context.zone.name, time:clock(best.hour.time, language), score:best.result.score }, language)}\n\n${t('assistant.local.nextTimes', { times:alternatives }, language)}`;
}

function equipmentAnswer(context, language) {
  const wind = finite(context.weather?.windSpeedMps);
  const extra = wind !== null && wind >= 6
    ? ` ${t('assistant.local.equipmentWind', { wind:formatNumber(wind, { maximumFractionDigits:1 }, language) }, language)}`
    : '';
  return t('assistant.local.equipment', {}, language) + extra;
}

function localAnswer(question, context, language) {
  const knowledgeAnswer = localRavKnowledgeAnswer(question, language);
  if (knowledgeAnswer) return knowledgeAnswer;
  const intent = classifyRavQuestion(question);
  if (intent === 'equipment') return equipmentAnswer(context, language);
  if (intent === 'best-place') return bestPlace(context, question, language);
  if (intent === 'best-time') return bestTime(context, question, language);
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
  const context = value && typeof value === 'object' ? value : {};
  const zone = context.zone && typeof context.zone === 'object' ? context.zone : {};
  const result = context.result && typeof context.result === 'object' ? context.result : {};
  const weather = context.weather && typeof context.weather === 'object' ? context.weather : {};
  return {
    locale:normaliseLanguage(language),
    mode:context.mode === 'beach' ? 'beach' : 'waders',
    zone:{ id:shortText(zone.id, 80), name:shortText(zone.name, 100), coastType:shortText(zone.coastType, 60) },
    result:{ available:result.available !== false, score:finite(result.score), level:shortText(result.level, 40) },
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
    if (!response.ok) return null;
    const answer = (await response.json())?.answer;
    return typeof answer === 'string' && answer.trim() && answer.length <= 900 ? answer.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function askRavRadar(question, context = {}, options = {}) {
  const language = normaliseLanguage(options?.language || context?.locale || getLanguage());
  const safe = String(question || '').trim().slice(0, 600);
  if (!safe) throw new Error(t('assistant.empty', {}, language));
  const route = routeRavQuestion(safe);
  if (route === 'fixed-refusal') return t('assistant.refusal', {}, language);
  if (route === 'local-deterministic' || options?.localOnly) return localAnswer(safe, context, language);
  return await remoteAnswer(safe, context, language) || t('assistant.unknown', {}, language);
}

export function quickQuestions(language = getLanguage()) {
  return QUICK_KEYS.map(key => t(key, {}, language));
}

export const QUICK_QUESTIONS = Object.freeze(quickQuestions('da'));
