import { PUBLIC_CONFIG } from "../../config.js?v=4.0.291";
import { buildLocalZoneScore, selectLocalBestForDay } from "../core/local-zone-score.js?v=4.0.291";
import { formatDateTime, formatNumber, getLanguage, normaliseLanguage, t } from "../i18n.js?v=4.0.291";

const SECURITY_PATTERN = /api.?key|password|passwort|adgangskode|supabase|database|datenbank|sql|source code|kildekode|quellcode|system.?prompt|systeminstruk|admin|token|secret|hemmelig|geheim/i;
const OUT_OF_SCOPE_PATTERN = /roulade|biskuitrolle|swiss roll|kage|kuchen|cake|fodbold|fußball|football|opskrift|rezept|recipe|politik|politics|aktie|stock price|matematik|math homework/i;
const AMBER_DOMAIN_PATTERN = /\brav|bernstein|bernsteinsuche|amber|amber hunt|kyst|küste|coast|strand|beach|hav|meer|sea|bølge|welle|wave|strøm|strömung|current|vandstand|wasserstand|water level|wader|uv.?light/i;
const INTENT_PATTERNS = Object.freeze({
  equipment:/udstyr|lygte|briller|waders?|vadestav|handske|tøj|ausrüstung|lampe|brille|watthose|handschuh|kleidung|equipment|torch|glasses|wading staff|gloves|clothing/i,
  'best-place':/bedste sted|hvor skal|hvor er bedst|køre hen|bester ort|wo (?:soll|ist es am besten)|wohin fahren|best place|where should|where is best|drive to/i,
  'best-time':/bedste tidspunkt|hvornår|hvilket tidspunkt|beste zeit|wann|best time|what time|when should/i,
  score:/hvorfor.*score|score.*hvorfor|trækker op|trækker ned|warum.*score|score.*warum|warum.*ravscore|why.*score|score.*why/i,
  safety:/sikker|farlig|risiko|sicherheit|gefährlich|risiko|safe|danger|risk/i,
  current:/strøm|bundstrøm|strømpil|strömung|strömungspfeil|current|current arrow/i,
  waves:/bølge|storm|welle|sturm|wave|storm/i,
  water:/vandstand|tidevand|wasserstand|gezeiten|water level|tide/i,
  technique:/teknik|hvordan finder|hvor skal jeg lede|tips|technik|wie finde|wo suchen|tipps|technique|how (?:do|can) i find|where (?:do|should) i search|tips/i,
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
  return 'unknown';
}

export function routeRavQuestion(question) {
  const text = String(question || '').trim();
  if (!text || SECURITY_PATTERN.test(text) || OUT_OF_SCOPE_PATTERN.test(text)) return 'fixed-refusal';
  const intent = classifyRavQuestion(text);
  if (intent !== 'unknown') return 'local-deterministic';
  return AMBER_DOMAIN_PATTERN.test(text) ? 'remote-candidate' : 'fixed-refusal';
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
  const intent = classifyRavQuestion(question);
  if (intent === 'equipment') return equipmentAnswer(context, language);
  if (intent === 'best-place') return bestPlace(context, question, language);
  if (intent === 'best-time') return bestTime(context, question, language);
  if (intent === 'score') return scoreAnswer(context, language);
  if (intent === 'safety') return t('assistant.local.safety', {}, language);
  if (intent === 'current') return t('assistant.local.current', {}, language);
  if (intent === 'waves') return t('assistant.local.waves', {}, language);
  if (intent === 'water') return t('assistant.local.water', {}, language);
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
