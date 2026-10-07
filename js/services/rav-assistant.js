import { PUBLIC_CONFIG } from "../../config.js?v=4.0.549";
import { localRavKnowledgeAnswer, localRavFollowupAnswer, matchLocalRavKnowledge } from "../../knowledge/rav-assistant-local-v2.js?v=4.0.549";
import { buildLocalZoneScore, selectLocalBestForDay } from "../core/local-zone-score.js?v=4.0.549";
import { addNationalRanking, compareNationalRankingRows } from "../core/zone-ranking.js?v=4.0.549";
import { forecastDateKeyForDayOffset, forecastDateKeyInTimeZone } from "../core/forecast-calendar.js?v=4.0.549";
import {
  RAVSCORE_CALIBRATION_ELIGIBLE,
  ravScoreModelBinding,
} from "../core/ravscore-model-contract.js?v=4.0.549";
import { sameRavScoreModelBinding } from "../core/ravscore-public-runtime-contract.js?v=4.0.549";
import { presentActiveRavScoreExplanation } from "../core/ravscore-integrated-explanation-presenter.js?v=4.0.549";
import { bestTimeSelectionReasonI18nKey, ravScoreBestTimeSelectionReason } from "../core/best-time-policy.js?v=4.0.549";
import { formatDateTime, formatNumber, getLanguage, normaliseLanguage, t } from "../i18n.js?v=4.0.549";

// Compatibility name for existing source-contract tests. The implementation
// now selects the only adapter matching the artifact's exact active binding.
const presentIntegratedRavScoreExplanation = presentActiveRavScoreExplanation;
const ACTIVE_RAVSCORE_MODEL_BINDING = ravScoreModelBinding();
const RAV_ASSISTANT_KNOWLEDGE_SCHEMA = 'rav-assistant-public-knowledge-v1';
const RAV_ASSISTANT_KNOWLEDGE_SHA256 = '8f371d2bc96c06e09b42eb83089db60bd4fc5f6b3e42a7375e860efd17e5b305';
const RAV_ASSISTANT_BINDING_HEADERS = Object.freeze({
  modelId:'x-ravradar-model-id',
  modelStateVersion:'x-ravradar-model-state-version',
  modelContractSha256:'x-ravradar-model-contract-sha256',
  modelBundleSha256:'x-ravradar-model-bundle-sha256',
  knowledgeSchema:'x-ravradar-assistant-knowledge-schema',
  knowledgeSha256:'x-ravradar-assistant-knowledge-sha256',
});

const SECURITY_PATTERN = /api.?key|password|passwort|adgangskode|supabase|database|datenbank|sql|source code|kildekode|quellcode|system.?prompt|systeminstruk|admin|token|secret|hemmelig|geheim|credential|hack/i;
function isSecurityRequest(question) {
  const text = String(question || '').trim();
  if (!SECURITY_PATTERN.test(text)) return false;
  // A forgotten-password/no-password login-link explanation is public help,
  // not a credential request. Only this topic's COMPLETE authored pattern
  // can admit those words; the question index, clause splitting, appended
  // credentials, a person's status or other security terms cannot do so.
  const topic = matchLocalRavKnowledge(text);
  if (topic?.id !== 'app-account-login-link' || !topic.pattern.test(text)) return true;
  return SECURITY_PATTERN.test(text.replace(/password|passwort|adgangskode/gi, ''));
}
const OUT_OF_SCOPE_PATTERN = /(?<![\p{L}\p{N}_])(?:roulade|biskuitrolle|swiss roll|kage|kuchen|cake|fodbold|fußball|football|opskrift|rezept|recipe|politik|politics|aktie|stock price|matematik|math homework)(?![\p{L}\p{N}_])/iu;
const AMBER_DOMAIN_PATTERN = /(?<![\p{L}\p{N}_])(?:rav\p{L}*|bernstein\p{L}*|succinit|succinite|copal|kopal|amber\p{L}*|harpiks|harz|resin|fossili[sz]|inklusion|einschluss|inclusion|fluorescen|fluoreszenz|fluorescen[ct]e|uv.?light|395\s*nm|fosfor|phosphor|phosphorus|danefæ|kesse|kescher|kyst|küste|coast|strand|beach|hav|meer|sea|bølge|welle|wave|strøm|strömung|current|vandstand|wasserstand|water level|wader|wathose|opskyl|spülsaum|wash line|tang|seegras|seaweed|revle|sandbank|sandbar|revlehul|brandungsrückstrom|rip current|rende|rinne|channel|høfde|buhne|groyne|opdrift|auftrieb|buoyancy|massefylde|dichte|density|saltation|sediment|geologi|geology|geologie|istid|eiszeit|ice age)(?![\p{L}\p{N}_])/iu;
const INTENT_PATTERNS = Object.freeze({
  coast:/revle|sandbanke|rende|høfde|(?<!\p{L})mole(?:n|r|rne)?(?!\p{L})|kystknæk|læside|strandhældning|sandbank|rinne|buhne|küstenknick|leeseite|strandneigung|sandbar|channel|groyne|pier|coastal bend|lee side|beach slope/iu,
  'best-place':/bedste (?:sted|område|strand)|hvor (?:skal|bør) (?:jeg|vi).*(?:lede|tage|køre)|hvor er (?:det )?bedst|køre hen|hvilke(?:n|t)? (?:strand|ravstrand|sted|steder|område|områder).*(?:bedst|anbefal|vælg)|anbefal (?:et|en) (?:sted|strand|område)|best(?:er|e|es|en) (?:ort|orte|gebiet|strand)|wo (?:soll|sollte) (?:ich|wir).*(?:suchen|fahren)|wo ist es am besten|wohin fahren|welche(?:r|s|n)? (?:strand|ort|orte|gebiet).*(?:best|empfiehl|empfehl|wähl)|empfiehl (?:mir |uns )?(?:einen|ein) (?:ort|strand|gebiet)|best (?:place|area|beach)|where should (?:i|we).*(?:search|go|drive)|where is best|drive to|which (?:beach|place|places|area|areas).*(?:best|recommend|choose)|recommend (?:a|an) (?:place|beach|area)/iu,
  'best-time':/bedste tidspunkt|hvornår er (?:det )?bedste tidspunkt|hvilket tidspunkt|hvornår (?:skal|bør) (?:jeg|vi)|hvad tid.*bedst|hvornår er.*bedst|beste zeit|best(?:e|er|es) zeitpunkt|wann ist.*am besten|wann ist die beste zeit|zu welcher zeit|wann (?:soll|sollte) (?:ich|wir)|best time|what time|when is.*best|when should (?:i|we)/iu,
  score:/hvorfor.*score|score.*hvorfor|trækker op|trækker ned|warum.*score|score.*warum|warum.*ravscore|why.*score|score.*why/iu,
  safety:/sikkerhed|farlig|risiko|er det sikkert(?:\?|$| at)|sikkert at (?:gå|vade)|sicherheit|gefährlich|ist (?:es|das) sicher(?:\?|$| zu)|sicher zu waten|ist (?:waten|die strömung|der ravscore)\b[^?]{0,120}\bsicher\b|safety|danger|\brisk\b|is it safe(?:\?|$| to)|safe to (?:go|wade)|is (?:wading|the current|a high ravscore)\b[^?]{0,120}\bsafe\b/iu,
  model:/candidate\s*g|ravscore.*(?:vægt|model|beregn|betyder|procent)|hvordan (?:virker|beregnes) ravscore|ravscore.*(?:gewicht|modell|berechn|bedeutet|prozent)|wie (?:funktioniert|wird) ravscore|ravscore.*(?:weight|model|calculat|mean|percent)|how (?:does|is) ravscore/iu,
  'missing-data':/mangler.*(?:data|prognose|historik)|historik.*mangler|ingen.*(?:data|prognose)|utilgængelig|låner.*score|fehl(?:en|t).*(?:daten|prognose|verlauf)|(?:daten|prognose|verlauf).*fehl(?:en|t)|keine.*(?:daten|prognose)|nicht verfügbar|wert.*leihen|missing.*(?:data|forecast|history|evidence)|(?:data|forecast|history).*missing|no.*(?:data|forecast)|unavailable|borrow.*score/iu,
  limitations:/garantere|garanti|chance for (?:at finde|fund)|procent.*(?:chance|sandsynlighed)|ved ravradar hvor ravet er|kan ravradar finde rav|garantier|fundchance|prozent.*chance|weiß ravradar wo bernstein ist|garantee|guarantee|chance of (?:a find|finding)|percent.*chance|does ravradar know where amber is/iu,
  origin:/hvor kommer rav(?:et)? fra|hvad er rav(?:et)?(?:\s+egentlig)?\s*[?.!]*\s*$|hvordan (?:opstod|dannes|blev rav dannet)|rav.*(?:opstod|dannes|dannet)|ravets? (?:oprindelse|alder)|alder.*rav|hvor gammelt.*rav|rav.*hvor gammelt|fossili[st]|harpiks|woher kommt bernstein|was ist bernstein(?:\s+eigentlich)?\s*[?.!]*\s*$|wie (?:entsteht|entstand) bernstein|wie wurde bernstein gebildet|bernstein.*(?:entsteht|entstand|gebildet)|ursprung.*bernstein|alter.*bernstein|wie alt.*bernstein|bernstein.*wie alt|fossil(?:isiert)?|harz|where does amber come from|what is amber(?:\s+(?:exactly|actually))?\s*[?.!]*\s*$|how (?:is|was) amber formed|how did amber form|amber.*(?:formed|formation)|amber origin|age.*amber|how old.*amber|amber.*how old|fossili[sz]ed|resin/iu,
  identification:/ægte rav|identificer.*rav|kende forskel.*rav|teste? .*rav|rav.*plast|uv.*rav|rav.*uv|395\s*nm|varm nål|echt(?:er|es)? bernstein|bernstein.*erkennen|bernstein.*prüfen|bernstein.*plastik|uv.*bernstein|bernstein.*uv|heiße nadel|real amber|identify.*amber|test.*amber|amber.*plastic|uv.*amber|amber.*uv|hot needle/iu,
  lamp:/hvad er en ravlygte|ravlygte.*(?:virker|bruger|nm)|395\s*nm|uv.?lygte|was ist eine bernsteinlampe|bernsteinlampe.*(?:funktion|benutz|nm)|uv.?lampe|what is an amber (?:torch|light)|amber (?:torch|light).*(?:work|use|nm)|uv (?:torch|light)/iu,
  colours:/rav.*(?:farve|sort|hvid|gul|brun)|hvilke farver|bernstein.*(?:farbe|schwarz|weiß|gelb|braun)|welche farben|amber.*(?:colour|color|black|white|yellow|brown)|what colou?r/iu,
  care:/opbevar.*rav|rengør.*rav|pudse.*rav|fundet rav.*(?:gøre|behandle)|bernstein.*(?:aufbewahr|reinig|polier)|fund.*bernstein|store.*amber|clean.*amber|polish.*amber|found amber.*(?:do|care)/iu,
  seasons:/årstid|vinter.*rav|sommer.*rav|bedste måned|jahreszeit|winter.*bernstein|sommer.*bernstein|bester monat|season|winter.*amber|summer.*amber|best month/iu,
  geology:/istid|sekundært lager|ravførende lag|eiszeit|sekundär.*lager|bernsteinführende schicht|ice age|secondary store|amber-bearing layer/iu,
  'beach-or-water':/strand eller vand|vand eller strand|waders eller strand|strand.*waders|strand oder wasser|wathose oder strand|strand.*wathose|beach or water|waders or beach|beach.*waders/iu,
  equipment:/udstyr|ravlygte|hvilken lygte|briller|ravkese|ravkesse|vadestav|handske|tøj|ausrüstung|bernsteinlampe|welche lampe|brille|bernsteinkescher|watstock|handschuh|kleidung|equipment|amber torch|which torch|glasses|amber net|wading staff|gloves|clothing/iu,
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

// Explicit hunting modes share one bounded vocabulary between request
// parsing and polite question classification. A destination such as
// "a beach" is deliberately not a beach-mode qualifier.
const FORECAST_SEARCH_MODE_PATTERNS=Object.freeze({
  beach:/(?<!\p{L})(?:på stranden|til strandjagt|til strandsøgning|strandjagt|strandsøgning|für die strandsuche|für strandsuche|zur strandsuche|strandsuche|am strand|for beach hunting|for beach searching|beach hunting|on the beach|from the beach)(?!\p{L})/iu,
  waders:/(?<!\p{L})(?:med waders|til waders|i waders|i vandet|til vadejagt|vadejagt|mit wathose|in wathose|beim waten|zum waten|im wasser|in waders|with waders|for waders|for wading|while wading|in the water)(?!\p{L})/iu,
});
const FORECAST_PLACE_OUTLOOK_STARTER=/^(?:hvilke (?:strande|steder|områder) (?:ser|er)|hvor ser det lovende ud|welche (?:strände|orte|gebiete) (?:sehen|lohnen|sind)|wo sieht es|which (?:beaches|places|areas) (?:look|are)|where looks)(?!\p{L})/iu;
const FORECAST_PLACE_OUTLOOK_QUESTION=/^(?:hvilke (?:strande|steder|områder) (?:ser lovende ud|er værd at besøge)|hvor ser det lovende ud|welche (?:strände|orte|gebiete) (?:sehen vielversprechend aus|lohnen sich|sind am besten)|wo sieht es vielversprechend aus|which (?:beaches|places|areas) (?:look promising|are worth visiting)|where looks promising)\s*[?!.]*$/iu;
const FORECAST_PLACE_POLITE_QUESTION=/^(?:(?:kan|kunne|vil) du (?:anbefale|foreslå) (?:en (?:ravstrand|strand)|et (?:sted|område))(?: til ravjagt)?|har du et (?:godt )?forslag til (?:en (?:ravstrand|strand)|et (?:sted|område))(?: til ravjagt)?|(?:kannst|könntest|würdest) du (?:mir |uns )?(?:einen (?:ort|strand)|ein gebiet)(?: für die bernsteinsuche)? (?:empfehlen|vorschlagen)|(?:can|could|would) you (?:please )?(?:recommend|suggest) (?:a (?:beach|place)|an area)(?: for amber hunting)?)\s*[?!.]*$/iu;
const FORECAST_PLACE_CONVERSATION_QUESTION=/^(?:hvor ville du (?:selv )?(?:(?:tage|køre) hen|lede efter rav|søge efter rav)|wohin würdest du (?:selbst )?(?:fahren|gehen)|wo würdest du (?:selbst )?bernstein suchen|where would you (?:yourself )?(?:go|search for amber|hunt for amber))\s*[?!.]*$/iu;
// Everyday "where do I find amber" is a forecast request only when dated.
// Keep the complete question for normal constraint/data validation; do not
// turn a nearby-place request or a guarantee into a free national ranking.
const FORECAST_FIND_PLACE_STARTER=/^(?:hvor finder (?:jeg|vi|man) rav|hvor kan man (?:finde|lede efter|søge efter) rav|hvad er (?:det )?bedste (?:sted|område)(?: til ravjagt)?|wo finde(?:n)? (?:ich|wir|man) bernstein|wo kann man bernstein (?:finden|suchen)|was ist (?:der|das) beste (?:ort|gebiet)(?: für die bernsteinsuche)?|where do (?:i|we) (?:find|look for) amber|where can one (?:find|search for|look for) amber|what is (?:the )?best (?:place|area)(?: for amber hunting)?)(?!\p{L})/iu;
const FORECAST_FIND_PLACE_QUESTION=new RegExp(FORECAST_FIND_PLACE_STARTER.source+'\\s*[?!.]*$','iu');
// Direct legacy intents contain broad substring patterns. Their answer must
// still account for the complete request; a place/radius, shop or guarantee
// left after known qualifiers cannot become an unconstrained national list.
const FORECAST_PLACE_DIRECT_QUESTION=new RegExp('^(?:'+[
  String.raw`(?:hvor er (?:(?:det|den|de) )?)?bedste (?:sted|steder|område|områder|strand|strande|ravstrand)|hvor er (?:det )?bedst`,
  String.raw`hvilk(?:e|en|et) (?:strand|strande|ravstrand|sted|steder|område|områder) (?:er (?:(?:det|den|de) )?bedst(?:e)?|anbefaler du|vil du anbefale|skal (?:jeg|vi) vælge)`,
  String.raw`hvor (?:skal|bør) (?:jeg|vi) (?:(?:tage|køre) hen(?: efter rav| på ravjagt)?|lede(?: efter rav)?|søge(?: efter rav)?)`,
  String.raw`hvor kan (?:jeg|vi) (?:finde|lede efter|søge efter) rav|(?:anbefal|foreslå) (?:en (?:ravstrand|strand)|et (?:sted|område))(?: til ravjagt)?`,
  String.raw`(?:wo (?:ist|sind) (?:der|das|die) )?beste(?:r|s|n)? (?:ort|orte|gebiet|strand)|wo ist es am besten`,
  String.raw`welch(?:e|er|es|en) (?:strand|strände|ort|orte|gebiet|gebiete) (?:(?:ist|sind) am besten|ist (?:der|das) beste|sind die besten|empfiehlst du|würdest du empfehlen)`,
  String.raw`wo (?:soll|sollte) (?:ich|wir) (?:suchen(?: nach bernstein)?|fahren(?: zur bernsteinsuche)?|zur bernsteinsuche fahren)|wohin fahren|wo kann (?:ich|wir) bernstein suchen|empfiehl (?:mir |uns )?(?:einen (?:ort|strand)|ein gebiet)(?: für die bernsteinsuche)?`,
  String.raw`(?:where (?:is|are) (?:the )?)?best (?:place|places|area|areas|beach|beaches)|where is best`,
  String.raw`which (?:beach|beaches|place|places|area|areas) (?:is (?:the )?best|are (?:the )?best|do you recommend|would you (?:recommend|choose)|should (?:i|we) choose)`,
  String.raw`where should (?:i|we) (?:search(?: for amber)?|(?:go|drive)(?: for amber| amber hunting)?)|where can (?:i|we) (?:search for|find|look for) amber|recommend (?:a (?:place|beach)|an area)(?: for amber hunting)?`,
].join('|')+')\\s*[?!.]*$','iu');
const FORECAST_WEEKDAYS=Object.freeze([
  ['søndag','sonntag','sunday'],['mandag','montag','monday'],
  ['tirsdag','dienstag','tuesday'],['onsdag','mittwoch','wednesday'],
  ['torsdag','donnerstag','thursday'],['fredag','freitag','friday'],
  ['lørdag','samstag','saturday'],
]);
// Classification recognises date-shaped qualifiers; only forecastRequest
// validates them and chooses a day. Keep complete years and explicit cues,
// and never mistake an uncued decimal such as 1.9 for a short dotted date.
const FORECAST_TRIP_DATE_PATTERN=new RegExp([
  String.raw`(?<!\p{L})(?:i overmorgen|overmorgen|übermorgen|(?:the )?day after tomorrow|i dag|idag|heute|today|i morgen|imorgen|morgen|tomorrow)(?!\p{L})`,
  String.raw`(?<!\p{L})(?:(?:på|den|am|on)\s+)?(?:(?:næste|nächsten?|next)\s+)?(?:${FORECAST_WEEKDAYS.flat().join('|')})(?!\p{L})`,
  String.raw`(?<!\p{L})(?:om|in)\s+\d+\s*(?:dage|days|tagen?)(?!\p{L})`,
  String.raw`(?<![\d/.])(?:(?:den|d\.|am|on)\s+)?\d{4}-\d{2}-\d{2}(?!\d|[/.]\d)`,
  String.raw`(?<![\d/.])(?:(?:den|d\.|am|on)\s+)?\d{1,2}\/\d{1,2}(?:\/\d+)?(?!\d|[/.]\d)`,
  String.raw`(?<![\d/.])(?:(?:den|d\.|am|on)\s+)?\d{1,2}\.\d{1,2}\.\d+(?!\d|[/.]\d)`,
  String.raw`(?<!\p{L})(?:den|d\.|am|on)\s+\d{1,2}\.\d{1,2}(?!\d|[/.]\d)`,
].join('|'),'giu');

function forecastClockWindow(question) {
  const windows=[];
  let invalid=false;
  const text=String(question || '').toLocaleLowerCase().replace(
    /(?<!\p{L})(?:mellem|zwischen|between|fra|von|from|kl\.?|klokken)\s*(?:kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?(?!\d|[:.]\d)\s*(?:-|–|—|til|og|bis|und|to|and)\s*(?:kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?(?!\d|[:.]\d)\s*(?:uhr(?!\p{L}))?/giu,
    (_match,startHour,startMinute,endHour,endMinute)=>{
      const start=Number(startHour)*60+Number(startMinute||0);
      const end=Number(endHour)*60+Number(endMinute||0);
      if(Number(startMinute||0)>59 || Number(endMinute||0)>59
        || start<0 || start>=1440 || end>1440 || end<=start) invalid=true;
      windows.push({start,end});
      // German decimal clock notation is not a short calendar date.
      return ' ';
    },
  );
  // Do not silently discard an unsupported clock, daypart, second window
  // or an explicit timezone different from the site's Danish-local clock.
  if(/\b(?:kl\.?|klokken|at)\s*\d|\d\s*uhr\b|\b(?:utc|gmt|cet|cest)\b|\bom morgenen\b|\bom aftenen\b|\b(?:formiddag|eftermiddag|morgen früh|vormittags|nachmittags|abends|morning|afternoon|evening)\b/iu.test(text)) invalid=true;
  if(windows.length>1 && new Set(windows.map(w=>`${w.start}:${w.end}`)).size>1) invalid=true;
  return invalid?null:{text,window:windows[0]||null};
}

function forecastHourInWindow(time,window) {
  if(!window) return true;
  const date=new Date(time);
  if(!Number.isFinite(date.getTime())) return false;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Copenhagen',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(date).map(part=>[part.type,part.value]));
  const minute=Number(parts.hour)*60+Number(parts.minute);
  return minute>=window.start && minute<=window.end;
}

function forecastWindowLabel(window) {
  const clock=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
  return `${clock(window.start)}–${clock(window.end)}`;
}

function forecastRequest(question, context, now) {
  const clockRequest=forecastClockWindow(question);
  if(!clockRequest) return null;
  const text=clockRequest.text;
  const offsets=[];
  // A weekend is two dates, not permission to silently use today's list.
  if (/(?<!\p{L})(?:weekenden|weekend|wochenende)(?!\p{L})/iu.test(text)) return null;
  const todayDate=forecastDateKeyForDayOffset(now,0);
  const todayNoon=Date.parse(`${todayDate}T12:00:00.000Z`);
  const todayWeekday=new Date(todayNoon).getUTCDay();
  for (const [weekday,names] of FORECAST_WEEKDAYS.entries()) for (const name of names) {
    if(new RegExp(`(?<!\\p{L})${name}(?!\\p{L})`,'iu').test(text)) {
      const offset=(weekday-todayWeekday+7)%7;
      const explicitlyNext=new RegExp(`(?:næste|nächsten?|next)\\s+${name}(?!\\p{L})`,'iu').test(text);
      offsets.push(offset===0 && explicitlyNext?7:offset);
    }
  }
  // Remove longer relative days before looking for "morgen/tomorrow".
  const rest=text.replace(/(?<!\p{L})(?:i overmorgen|overmorgen|übermorgen|(?:the )?day after tomorrow)(?!\p{L})/giu,()=>{offsets.push(2);return ' ';});
  if (/\b(?:i morgen|imorgen|morgen|tomorrow)\b/iu.test(rest)) offsets.push(1);
  if (/\b(?:i dag|idag|heute|today)\b/iu.test(rest)) offsets.push(0);
  for(const match of rest.matchAll(/\b(?:om|in)\s+(\d+)\s*(?:dage|days|tagen?)\b/giu)) offsets.push(Number(match[1]));
  for(const match of rest.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/gu)) {
    const date=new Date(`${match[1]}T12:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==match[1]) return null;
    offsets.push(Math.round((date.getTime()-todayNoon)/86_400_000));
  }
  for(const match of rest.matchAll(/\b\d{1,2}([/.])\d{1,2}\1(\d+)\b/gu)) {
    if(match[2].length!==4) return null;
  }
  for(const match of rest.matchAll(/\b(\d{1,2})([/.])(\d{1,2})\2(\d{4})\b/gu)) {
    const civilDate=`${match[4]}-${match[3].padStart(2,'0')}-${match[1].padStart(2,'0')}`;
    const date=new Date(`${civilDate}T12:00:00.000Z`);
    if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==civilDate) return null;
    offsets.push(Math.round((date.getTime()-todayNoon)/86_400_000));
  }
  // A yearless civil date must not silently become today's forecast.
  // Keep the same European day/month convention as explicit dates. A
  // dotted short date needs a date cue, so decimal measurements are not
  // mistaken for dates. Complete year-bearing dates are excluded here.
  for(const match of rest.matchAll(/(?<![\d/.])(?:(den|d\.|am|on)\s+)?(\d{1,2})([/.])(\d{1,2})(?!\d|[/.]\d)/giu)) {
    if(match[3]==='.' && !match[1]) continue;
    let year=Number(todayDate.slice(0,4));
    const month=match[4].padStart(2,'0'),day=match[2].padStart(2,'0');
    if(todayDate.slice(5,7)==='12' && month==='01') year+=1;
    const civilDate=`${year}-${month}-${day}`;
    const date=new Date(`${civilDate}T12:00:00.000Z`);
    if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==civilDate) return null;
    offsets.push(Math.round((date.getTime()-todayNoon)/86_400_000));
  }
  if(new Set(offsets).size>1) return null;
  const dayOffset=offsets[0]??0;
  if(!Number.isSafeInteger(dayOffset) || dayOffset<0) return null;
  const coasts=[
    ['west',/(?<!\p{L})(?:vestkyst(?:en)?|vesterhavet|westküste|west coast)(?!\p{L})/iu],
    ['east',/(?<!\p{L})(?:østkyst(?:en)?|ostküste|east coast)(?!\p{L})/iu],
    ['limfjord',/(?<!\p{L})(?:limfjord(?:en)?)(?!\p{L})/iu],
  ].filter(([,pattern])=>pattern.test(text)).map(([coast])=>coast);
  if(coasts.length>1) return null;
  const beach=FORECAST_SEARCH_MODE_PATTERNS.beach.test(text);
  const waders=FORECAST_SEARCH_MODE_PATTERNS.waders.test(text);
  if(beach && waders) return null;
  const mode=beach?'beach':waders?'waders':context.mode||'waders';
  return {dayOffset,mode,date:forecastDateKeyForDayOffset(now,dayOffset),coastType:coasts[0]??null,hourWindow:clockRequest.window};
}

function forecastDayLabel(request,language) {
  if(request.dayOffset<2) return t(request.dayOffset===1?'assistant.local.tomorrow':'assistant.local.today',{},language);
  return formatDateTime(`${request.date}T12:00:00.000Z`,{weekday:'long',day:'numeric',month:'long'},language);
}

function clock(iso, language) {
  return formatDateTime(iso, { weekday:'short', hour:'2-digit', minute:'2-digit' }, language);
}

const FORECAST_COAST_QUALIFIER=/(?<!\p{L})(?:på (?:vestkyst(?:en)?|østkyst(?:en)?)|ved vesterhavet|i limfjord(?:en)?|an der (?:westküste|ostküste)|im limfjord|on the (?:west coast|east coast)|in the limfjord)(?!\p{L})/iu;

function forecastTripResidual(question,tripDatePattern=null) {
  const clockRequest=forecastClockWindow(question);
  const qualifiers=[FORECAST_COAST_QUALIFIER,...(tripDatePattern
    ?[tripDatePattern,...Object.values(FORECAST_SEARCH_MODE_PATTERNS)]:[])];
  const qualifier=qualifiers.map(pattern=>`(?:${pattern.source})`).join('|');
  // A conjunction is removable only between recognised qualifiers. The
  // normal forecast parser still rejects conflicting dates/coasts/modes;
  // "and within 10 km" is not a qualifier chain and must remain unknown.
  return clockRequest?.text.replace(
    new RegExp(`(?:${qualifier})(?:\\s+(?:og|und|and)\\s+(?:${qualifier}))*`,'giu'),' ',
  ).replace(/\s+/gu,' ').trim();
}

export function classifyRavQuestion(question) {
  const text = String(question || '').trim();
  // A dated trip request reads forecasts. The same physical question about
  // a wash line or sandbar without a date must remain field guidance.
  const tripDatePattern=FORECAST_TRIP_DATE_PATTERN;
  const withoutTripDate=text.replace(tripDatePattern,' ');
  const datedTrip=withoutTripDate!==text;
  if(datedTrip && FORECAST_FIND_PLACE_STARTER.test(withoutTripDate.replace(/\s+/gu,' ').trim()))
    return 'best-place';
  const withoutTripMode=Object.values(FORECAST_SEARCH_MODE_PATTERNS).reduce(
    (trip,pattern)=>trip.replace(new RegExp(pattern.source,'giu'),' '),withoutTripDate,
  );
  // The existing guide's German wording puts the date/mode between
  // "wo ist es" and "am besten". Match the complete residual question,
  // not an arbitrary intervening place, distance or factual condition.
  if(datedTrip && /^(?:hvor er (?:det )?bedst|wo ist es am besten|where is best)\s*[?!.]*$/iu.test(
    withoutTripMode.replace(/\s+/gu,' ').trim(),
  )) return 'best-place';
  // Natural recommendations such as "which beaches look promising" read
  // the prepared forecast too. Require the complete supported question:
  // proximity, guarantees and other unimplemented constraints must not be
  // silently discarded or fall through to the older "best" substring.
  if(datedTrip && /(?<!\p{L})(?:lovende|værd at besøge|vielversprechend|lohnen sich|am besten|promising|worth visiting)(?!\p{L})/iu.test(text)
    && FORECAST_PLACE_OUTLOOK_STARTER.test(text)) {
    const trip=forecastTripResidual(text,tripDatePattern);
    if(trip && FORECAST_PLACE_OUTLOOK_QUESTION.test(trip))
      return 'best-place';
    return 'unknown';
  }
  // Polite recommendations use the same validated forecast as direct
  // questions. Only remove qualifiers already understood by the normal
  // forecast parser; an unsupported distance, shop or guarantee must not
  // fall through to the older substring-based national-place intent.
  if(datedTrip && /^(?:(?:kan|kunne|vil) du (?:anbefale|foreslå)|har du et (?:godt )?forslag til|(?:kannst|könntest|würdest) du(?=[\s\S]*(?:empfehlen|vorschlagen)(?!\p{L}))|(?:can|could|would) you (?:please )?(?:recommend|suggest))(?!\p{L})/iu.test(text)) {
    const trip=forecastTripResidual(withoutTripMode);
    if(trip && FORECAST_PLACE_POLITE_QUESTION.test(trip))
      return 'best-place';
    return 'unknown';
  }
  // A conversational recommendation still uses the real national forecast.
  // Accept only the date plus a complete supported trip question, so a
  // wash-line explanation, shop or unimplemented nearby-region constraint
  // cannot silently become an unconstrained national recommendation.
  if(datedTrip && FORECAST_PLACE_CONVERSATION_QUESTION.test(withoutTripDate.replace(/\s+/gu,' ').trim()))
    return 'best-place';
  if(datedTrip && /hvor kan (?:jeg|vi).*(?:finde|lede efter|søge efter).*rav|wo kann (?:ich|wir).*bernstein.*suchen|where can (?:i|we).*(?:search for|find|look for).*amber/iu.test(text))
    return 'best-place';
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) if (pattern.test(text)) return intent;
  const knowledge = matchLocalRavKnowledge(text);
  if (knowledge) return `knowledge:${knowledge.id}`;
  return 'unknown';
}

export function routeRavQuestion(question) {
  const text = String(question || '').trim();
  if (!text || isSecurityRequest(text) || OUT_OF_SCOPE_PATTERN.test(text)) return 'fixed-refusal';
  const intent = classifyRavQuestion(text);
  if (intent !== 'unknown') return 'local-deterministic';
  return AMBER_DOMAIN_PATTERN.test(text) ? 'remote-candidate' : 'fixed-refusal';
}

export function ravQuestionNeedsConditionDetails(question, context = {}) {
  if (routeRavQuestion(question)==='fixed-refusal') return false;
  return splitRavQuestions(question).some(part => {
    if (matchLocalRavKnowledge(part)) return false;
    const intent=classifyRavQuestion(part);
    // National Top 20 is already in the manifest-validated startup. Loading
    // a selected zone cannot complete or replace that national forecast.
    if (intent==='best-place' && context.conditions?.nationalForecast!=null) return false;
    return ['best-place','best-time','score'].includes(intent);
  });
}

export function splitRavQuestions(question) {
  // Which/hvilket/welche needs an interrogative predicate, not just a
  // coordinated noun phrase. Likewise distinguish "where is ..." from
  // embedded descriptions such as "where it occurs".
  const nounPhrase=String.raw`(?:(?!(?:jeg|du|vi|man|det|de|ich|wir|es|sie|i|you|we|it|they)\b)[\p{L}-]+\s+){1,3}`;
  const independentStarter=String.raw`(?:er|hvad|hvorfor|hvordan|kan|betyder|giver|ist|was|warum|wie|kann|bedeutet|bringt|is|what|why|how|can|does|(?:kunne|vil)\s+du|har\s+du(?=\s+et\s+(?:godt\s+)?forslag\b)|(?:könntest|würdest)\s+du|(?:could|would)\s+you|hvor\s+(?:er|kan|skal|bør|ville|kommer|finder)|wo\s+(?:ist|sind|kann|soll|sollte|würdest|kommt|finde)|wohin\s+würdest|woher\s+(?:kommt|kommen)|where\s+(?:is|are|do|does|can|should|would)|hvilk(?:e|en|et)\s+${nounPhrase}(?:er|kan|skal|bør|vil)|welch(?:e|er|es|en|em)\s+${nounPhrase}(?:ist|sind|kann|soll|brauche)|which\s+${nounPhrase}(?:is|are|can|should|do|does)|${FORECAST_PLACE_OUTLOOK_STARTER.source.slice(1)})\b`;
  return String(question || '').trim().split(
    new RegExp(String.raw`[?？]\s*(?=(?:(?:\d{1,2}[.)]|[-*•])\s+)?\p{L})|\r?\n\s*(?=(?:\d{1,2}[.)]|[-*•])\s+\p{L})|[,;]\s*(?:og|und|and)\s+(?=${independentStarter})|\s+(?:og|und|and)\s+(?=${independentStarter})`,'iu')
  // Users also end questions with sentence punctuation. Require a fresh
  // capitalized question starter after an actual question/request, rather
  // than turning a context introduction, decimal or abbreviation into an
  // unanswered question. Whole-message refusals still run first.
  ).map((part,index)=>{
    const clause=part.trim().replace(/^(?:\d{1,2}[.)]|[-*•])\s+(?=\p{L})/u,'');
    // A question mark can precede "and What ...". Remove only this
    // conjunction in a later, independently interrogative clause, never
    // the initial phrase or a coordinated noun/date/place qualification.
    return index>0
      ? clause.replace(new RegExp(String.raw`^(?:og|und|and)\s+(?=${independentStarter})`,'iu'),'')
      : clause;
  })
    .flatMap(part=>/^(?:er|hvad|hvor|hvorfor|hvordan|hvilk(?:e|en|et)|kan|betyder|giver|(?:kunne|vil)\s+du|har\s+du(?=\s+et\s+(?:godt\s+)?forslag\b)|forklar|ist|was|wo|wohin|woher|warum|wie|welch(?:e|er|es|en|em)|kann|bedeutet|bringt|(?:könntest|würdest)\s+du|erkläre|is|what|where|why|how|which|can|does|(?:could|would)\s+you|explain)\b/iu.test(part)
      ? part.split(/[.!;]\s+(?=(?:Er|Hvad|Hvor|Hvorfor|Hvordan|Hvilk(?:e|en|et)|Kan|Betyder|Giver|(?:Kunne|Vil)\s+du|Har\s+du(?=\s+et\s+(?:godt\s+)?forslag\b)|Ist|Was|Wo|Wohin|Woher|Warum|Wie|Welch(?:e|er|es|en|em)|Kann|Bedeutet|Bringt|(?:Könntest|Würdest)\s+du|Is|What|Where|Why|How|Which|Can|Does|(?:Could|Would)\s+you)\b)/u)
      : [part])
    .filter(Boolean);
}

function localQuestionClauses(question, language='da', previousTopicId=null) {
  let topicId=previousTopicId;
  let explicitAmberReferent=false;
  return splitRavQuestions(question).map(part=>{
    // Resolve only this one unambiguous origin question immediately after
    // an explicit amber definition in the same message. No transcript,
    // persistent alias, inferred zone/date or new factual answer is used.
    const originFollowup=explicitAmberReferent
      && /^(?:hvor kommer det fra|wo kommt (?:er|es) her|woher kommt (?:er|es)|where does it come from)\s*[?!.]*$/iu.test(part)
      ? t('assistant.local.origin',{},language) : null;
    const followup=localRavFollowupAnswer(part,topicId,language) || originFollowup;
    if (!followup) topicId=matchLocalRavKnowledge(part)?.id || null;
    explicitAmberReferent=/^(?:hvad er rav(?:et)?(?:\s+egentlig)?|was ist bernstein(?:\s+eigentlich)?|what is amber(?:\s+(?:exactly|actually))?)\s*[?!.]*$/iu.test(part);
    return {question:part,followup,topicId};
  });
}

export function ravQuestionKnowledgeTopic(question, previousTopicId=null) {
  if (isSecurityRequest(question) || OUT_OF_SCOPE_PATTERN.test(question)) return null;
  return localQuestionClauses(question,'da',previousTopicId).at(-1)?.topicId || null;
}

function allScored(context, dayOffset = 0, now = Date.now()) {
  const date = forecastDateKeyForDayOffset(now, dayOffset);
  const mode = context.mode || 'waders';
  if (context.conditions?.available===false) return [];
  const prepared=context.conditions?.nationalForecast;
  if (prepared!=null) {
    // Read exactly the same national generation, day, mode, ranking and
    // conservative score quality that the normal five-day UI displays.
    // An invalid authoritative startup is not replaced by a partly loaded
    // zone, another day's scores, a forecast rebuild or a remote AI guess.
    if (!sameRavScoreModelBinding(context.modelBinding,ACTIVE_RAVSCORE_MODEL_BINDING)
      || !sameRavScoreModelBinding(prepared.modelBinding,ACTIVE_RAVSCORE_MODEL_BINDING)
      || !Array.isArray(prepared.modes?.[mode])) return [];
    const days=prepared.modes[mode].filter(day=>day?.date===date);
    if(days.length!==1 || !Array.isArray(days[0].rows) || days[0].rows.length>20) return [];
    const zones=new Map((context.zones?.features || []).map(feature=>[feature.properties?.id,feature.properties]));
    const seen=new Set();
    const rows=[];
    for(const row of days[0].rows) {
      const zone=zones.get(row?.zoneId);
      const score=finite(row?.score),rankingScore=finite(row?.rankingScore);
      let timeDate=null;
      try {timeDate=forecastDateKeyInTimeZone(row?.time);} catch {return [];}
      const quality=publicScoreQuality(row,true);
      if (!zone || seen.has(zone.id) || timeDate!==date || row.available===false
        || score===null || score<0 || score>100 || rankingScore===null
        || rankingScore>score || rankingScore<score-19
        || row.rankingDisplayScore!==Math.round(Math.max(0,Math.min(100,rankingScore)))
        || quality.scoreQuality==='UNAVAILABLE'
        || (row.modelBinding && !sameRavScoreModelBinding(row.modelBinding,ACTIVE_RAVSCORE_MODEL_BINDING))) return [];
      seen.add(zone.id);
      if (date===forecastDateKeyForDayOffset(now,0)
        && Date.parse(row.time)<Math.floor(new Date(now).getTime()/3_600_000)*3_600_000) continue;
      rows.push({zone,result:{available:true,score,...quality},hour:{time:row.time},
        rankingScore,rankingDisplayScore:row.rankingDisplayScore});
    }
    return rows.sort(compareNationalRankingRows);
  }
  return (context.zones?.features || []).map(feature => {
    const zone = feature.properties;
    const best = selectLocalBestForDay({ coastalParts:context.conditions?.coastalParts, zoneId:zone.id, mode, date, now });
    return best ? addNationalRanking({ zone, ...best }, context.zones?.coastalParts?.zones?.[zone.id] || []) : null;
  }).filter(Boolean).sort(compareNationalRankingRows);
}

function selectedScored(context, dayOffset = 0, now = Date.now(), hourWindow = null) {
  const zone = context.zone;
  if (!zone) return [];
  const date = forecastDateKeyForDayOffset(now, dayOffset);
  const coastalParts = context.conditions?.coastalParts;
  const mode = context.mode || 'waders';
  const selected = selectLocalBestForDay({ coastalParts, zoneId:zone.id, mode, date, now });
  const rows=(selected?.candidates || []).filter(candidate=>forecastHourInWindow(candidate.time,hourWindow)).map((candidate, index) => ({
    hour:{ time:candidate.time },
    result:buildLocalZoneScore({ coastalParts, zoneId:zone.id, mode, time:candidate.time }),
    selectionReason:index === 0 ? selected.selectionReason ?? null : null,
  })).filter(item => item.result?.available);
  if(hourWindow && rows.length) rows[0].selectionReason=ravScoreBestTimeSelectionReason(rows,mode);
  return rows;
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
  const request=forecastRequest(question,context,now);
  if (!request) return t('assistant.local.clarifyForecast',{},language);
  const residual=forecastTripResidual(question,FORECAST_TRIP_DATE_PATTERN);
  if(!residual || ![FORECAST_PLACE_DIRECT_QUESTION,FORECAST_PLACE_OUTLOOK_QUESTION,
    FORECAST_PLACE_POLITE_QUESTION,FORECAST_PLACE_CONVERSATION_QUESTION,FORECAST_FIND_PLACE_QUESTION]
    .some(pattern=>pattern.test(residual)))
    return t('assistant.local.unsupportedPlaceRequest',{},language);
  if(request.hourWindow) return t('assistant.local.noWindowRanking',{
    interval:forecastWindowLabel(request.hourWindow),
  },language);
  const validRows = allScored({...context,mode:request.mode}, request.dayOffset, now);
  if (!validRows.length) return t('assistant.local.noRanking', {}, language);
  // Validate the complete authoritative list before geographic filtering:
  // an invalid row on another coast still invalidates that public list.
  const rows=validRows.filter(item=>!request.coastType || item.zone.coastType===request.coastType).slice(0,5);
  const coast=request.coastType?t(`assistant.local.coast.${request.coastType}`,{},language):null;
  if(!rows.length) return context.conditions?.nationalForecast!=null
    ? t('assistant.local.noCoastRanking',{coast},language)
    : t('assistant.local.noCoastForecast',{coast},language);
  const day = forecastDayLabel(request,language);
  const qualityNotice=rows.some(item=>item.result.scoreQuality==='HISTORY_INCOMPLETE')
    ? `\n\n${t('assistant.local.historyRankingCaveat',{},language)}`:'';
  const coastNotice=coast?`\n${t('assistant.local.rankingCoast',{coast},language)}`:'';
  const coastBasis=coast && context.conditions?.nationalForecast!=null
    ? `\n${t('assistant.local.coastRankingBasis',{},language)}`:'';
  return `${t('assistant.local.bestPlaces', { day }, language)}\n${t('assistant.local.rankingMode',{mode:t(request.mode==='beach'?'mode.beach':'mode.waders',{},language)},language)}${coastNotice}\n\n${rows.map((item, index) => t('assistant.local.rankLine', {
    rank:index + 1, zone:item.zone.name, score:item.rankingDisplayScore ?? item.result.score, time:clock(item.hour.time, language)
  }, language)+` · ${t('assistant.local.rankingLocalScore',{score:item.result.score},language)}`+(scoreRangeNotice(item.result,language)?` · ${scoreRangeNotice(item.result,language)}`:'')).join('\n')}\n\n${t('assistant.local.rankingBasis', {}, language)}${coastBasis}${qualityNotice}`;
}

function bestTime(context, question, language, now) {
  if (!context.zone) return t('assistant.local.noZoneTime', {}, language);
  const request=forecastRequest(question,context,now);
  if (!request) return t('assistant.local.clarifyForecast',{},language);
  if(request.coastType && context.zone.coastType!==request.coastType)
    return t('assistant.local.noZoneCoast',{coast:t(`assistant.local.coast.${request.coastType}`,{},language)},language);
  const rows = selectedScored({...context,mode:request.mode}, request.dayOffset, now, request.hourWindow).slice(0, 3);
  if (!rows.length) return request.hourWindow
    ? t('assistant.local.noWindowForecast',{interval:forecastWindowLabel(request.hourWindow)},language)
    : t('assistant.local.noZoneForecast', {}, language);
  const best = rows[0];
  const day = forecastDayLabel(request,language);
  const alternatives = rows.slice(1).map(item => `${clock(item.hour.time, language)} (${item.result.score})`).join(', ') || t('assistant.local.noNextTimes', {}, language);
  const reason = request.hourWindow
    ? t('assistant.local.windowSelection',{},language)
    : best.selectionReason
    ? t(bestTimeSelectionReasonI18nKey(best.selectionReason), {}, language)
    : t('score.bestTimeBody', { future:'' }, language);
  const qualityNotice=scoreRangeNotice(best.result,language);
  const windowNotice=request.hourWindow?`\n${t('assistant.local.timeWindow',{interval:forecastWindowLabel(request.hourWindow)},language)}`:'';
  return `${t('assistant.local.bestTime', { day, zone:context.zone.name, time:clock(best.hour.time, language), score:best.result.score }, language)}${windowNotice}${qualityNotice?`\n${qualityNotice}`:''}\n\n${reason}\n\n${t('assistant.local.nextTimes', { times:alternatives }, language)}`;
}

function equipmentAnswer(context, language) {
  const wind = finite(context.weather?.windSpeedMps);
  const extra = wind !== null && wind >= 6
    ? ` ${t('assistant.local.equipmentWind', { wind:formatNumber(wind, { maximumFractionDigits:1 }, language) }, language)}`
    : '';
  return t('assistant.local.equipment', {}, language) + extra;
}

function localAnswer(question, context, language, now = Date.now(), followupTopicId=null) {
  return [...new Set(localQuestionClauses(question,language,followupTopicId).map(part =>
    part.followup || localSingleAnswer(part.question,context,language,now)))].join('\n\n');
}

function localSingleAnswer(question, context, language, now) {
  const productKnowledge=matchLocalRavKnowledge(question);
  if (productKnowledge?.id.startsWith('app-')) return productKnowledge.answers[language] || productKnowledge.answers.da;
  const intent = classifyRavQuestion(question);
  const presentation = presentIntegratedRavScoreExplanation(context?.result, { language });
  if (presentation.available) {
    if (intent === 'current') return `${presentation.sections.gridCurrent}\n\n${presentation.sections.lastMile}`;
    if (intent === 'waves') return `${t('assistant.local.waves', {}, language)}\n\n${presentation.sections.lastMile}`;
    if (intent === 'water') return `${presentation.sections.waterLevel}\n\n${presentation.sections.lastMile}`;
    if (intent === 'model') return `${presentation.summary}\n\n${presentation.facts.map(item => `• ${item}`).join('\n')}`;
    if (intent === 'limitations') return `${presentation.sections.limitations}\n\n${presentation.sections.lastMile}`;
  }
  // A dated national request already has an explicit forecast intent.
  // Generic coast/field knowledge must not replace that actual ranking
  // (or its precise constraint refusal). Undated field questions retain
  // their existing source-bound explanation and precedence.
  if(intent==='best-place' && question.replace(FORECAST_TRIP_DATE_PATTERN,' ')!==question)
    return bestPlace(context,question,language,now);
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
    if (!response.ok) return null;
    const responseBindingMatches = response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelId) === ACTIVE_RAVSCORE_MODEL_BINDING.modelId
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelStateVersion) === ACTIVE_RAVSCORE_MODEL_BINDING.stateSchemaVersion
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelContractSha256) === ACTIVE_RAVSCORE_MODEL_BINDING.modelContractSha256
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.modelBundleSha256) === ACTIVE_RAVSCORE_MODEL_BINDING.modelBundleSha256
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.knowledgeSchema) === RAV_ASSISTANT_KNOWLEDGE_SCHEMA
      && response.headers.get(RAV_ASSISTANT_BINDING_HEADERS.knowledgeSha256) === RAV_ASSISTANT_KNOWLEDGE_SHA256;
    if (!responseBindingMatches) return null;
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
  const raw = String(question || '').trim();
  const safe = raw.slice(0, 600);
  if (!safe) throw new Error(t('assistant.empty', {}, language));
  // Check the WHOLE message before the existing bounded answering input;
  // a forbidden suffix beyond character 600 must not become safe help.
  if (isSecurityRequest(raw) || OUT_OF_SCOPE_PATTERN.test(raw)) return t('assistant.refusal', {}, language);
  const followup=localRavFollowupAnswer(safe,options?.followupTopicId,language);
  if (followup) return followup;
  const clauses=localQuestionClauses(safe,language,options?.followupTopicId);
  const parts=clauses.map(part=>part.question);
  // Follow-up context is only the previous public topic ID, never a transcript.
  // Resolve each clause locally; an independent second question must survive.
  const remoteParts=parts.filter(part=>routeRavQuestion(part)==='remote-candidate');
  if (!options?.localOnly && parts.length>1 && remoteParts.length>0
    && clauses.some(part=>part.followup || routeRavQuestion(part.question)==='local-deterministic')) {
    // A known first question must not hide the remaining amber question.
    // Only the unknown public questions go to the existing bounded endpoint:
    // one request, no transcript, and no AI-generated weather/score selection.
    const remoteQuestion=remoteParts.join('\n');
    const remote=await remoteAnswer(remoteQuestion,context,language)
      || localAnswer(remoteQuestion,context,language,options?.now??Date.now());
    let remoteInserted=false;
    const answers=clauses.map(part=>{
      if (remoteParts.includes(part.question)) {
        if(remoteInserted)return null;
        remoteInserted=true;
        return remote;
      }
      return part.followup || localSingleAnswer(part.question,context,language,options?.now??Date.now());
    }).filter(Boolean);
    return [...new Set(answers)].join('\n\n');
  }
  const route = clauses.some(part=>part.followup || routeRavQuestion(part.question)==='local-deterministic')
    ? 'local-deterministic' : routeRavQuestion(safe);
  if (route === 'fixed-refusal') return t('assistant.refusal', {}, language);
  if (route === 'local-deterministic' || options?.localOnly) {
    return localAnswer(safe, context, language, options?.now ?? Date.now(), options?.followupTopicId);
  }
  return await remoteAnswer(safe, context, language)
    || localAnswer(safe, context, language, options?.now ?? Date.now());
}

export function quickQuestions(language = getLanguage()) {
  return QUICK_KEYS.map(key => t(key, {}, language));
}

export const QUICK_QUESTIONS = Object.freeze(quickQuestions('da'));
