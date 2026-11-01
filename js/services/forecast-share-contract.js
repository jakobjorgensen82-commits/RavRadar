// Display-only selection. No score, provider, coordinate, account or trip authority.
export const FORECAST_SHARE_WORKER_BASE_URL = 'https://ravradar-prognosedeling.jakob-jorgensen82.workers.dev/';
export const FORECAST_SHARE_PAGES_BASE_URL = 'https://ravradar-del.pages.dev/';
// Frontend stays on the verified legacy host until Pages and DNS/TLS are accepted.
export const FORECAST_SHARE_BASE_URL = FORECAST_SHARE_WORKER_BASE_URL;
export const FORECAST_SHARE_TIME_ZONE = 'Europe/Copenhagen';
export const FORECAST_SHARE_BRAND_PATH = 'assets/icons/ravradar-512.png';
const MODES = ['waders', 'beach'];
const LANGUAGES = ['da', 'de', 'en'];
const KEYS = ['share', 'zone', 'time', 'mode', 'lang'];
const LOCALES = { da: 'da-DK', de: 'de-DE', en: 'en-GB' };
const COPY = {
  da: {
    title: 'Del prognose', share: 'Del', copy: 'Kopiér link', close: 'Luk',
    copied: 'Linket er kopieret.', manual: 'Markér og kopiér linket nedenfor.',
    note: 'Du skriver selv teksten til dit opslag. Prognosen kan ændre sig; linket beholder sted, tidspunkt og søgemåde.',
    loading: 'Åbner den delte prognosetime…',
    unavailable: 'Den delte prognosetime er udløbet, mangler eller kan ikke verificeres. Ingen score vises for den.',
    invalid: 'Delingslinket er ugyldigt. Ingen anden time vælges i stedet.',
    cancelled: 'Dit nye kortvalg har afløst det delte tidspunkt.',
    open: 'Åbn i RavRadar', score: 'RavScore', local: 'Bedste lokale sted',
    partial: 'Kun delvis zonedækning', history: 'Ufuldstændig historik',
    disclaimer: 'Beregnet vurdering, ikke en garanti for fund.',
    waders: 'I vandet (waders)', beach: 'På stranden',
  },
  de: {
    title: 'Prognose teilen', share: 'Teilen', copy: 'Link kopieren', close: 'Schließen',
    copied: 'Der Link wurde kopiert.', manual: 'Den Link unten markieren und kopieren.',
    note: 'Den Text deines Beitrags schreibst du selbst. Die Prognose kann sich ändern; Ort, Zeitpunkt und Suchart bleiben im Link erhalten.',
    loading: 'Die geteilte Prognosestunde wird geöffnet…',
    unavailable: 'Die geteilte Prognosestunde ist abgelaufen, fehlt oder kann nicht verifiziert werden. Dafür wird kein Score angezeigt.',
    invalid: 'Der geteilte Link ist ungültig. Es wird keine andere Stunde eingesetzt.',
    cancelled: 'Deine neue Kartenauswahl hat den geteilten Zeitpunkt ersetzt.',
    open: 'In RavRadar öffnen', score: 'BernsteinScore', local: 'Bester örtlicher Abschnitt',
    partial: 'Nur teilweise Zonenabdeckung', history: 'Unvollständiger Verlauf',
    disclaimer: 'Berechnete Einschätzung, keine Garantie für Funde.',
    waders: 'Im Wasser (Wathose)', beach: 'Am Strand',
  },
  en: {
    title: 'Share forecast', share: 'Share', copy: 'Copy link', close: 'Close',
    copied: 'Link copied.', manual: 'Select and copy the link below.',
    note: 'You write your own post. The forecast may change; the link keeps the place, time and search mode.',
    loading: 'Opening the shared forecast hour…',
    unavailable: 'The shared forecast hour has expired, is missing or cannot be verified. No score is shown for it.',
    invalid: 'This share link is invalid. No other hour is substituted.',
    cancelled: 'Your new map selection has replaced the shared time.',
    open: 'Open in RavRadar', score: 'AmberScore', local: 'Best local stretch',
    partial: 'Partial zone coverage only', history: 'Incomplete history',
    disclaimer: 'A calculated assessment, not a guarantee of finding amber.',
    waders: 'In the water (waders)', beach: 'On the beach',
  },
};
export function forecastShareCopy(language = 'da') { return COPY[language] || COPY.da; }

export function exactForecastShareSelection(value) {
  if (!value || !/^[a-zA-Z0-9_-]{1,80}$/.test(value.zoneId || '')
      || !MODES.includes(value.mode) || !LANGUAGES.includes(value.language)
      || typeof value.time !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value.time)) return null;
  const stamp = Date.parse(value.time);
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString() !== value.time) return null;
  return Object.freeze({ zoneId: value.zoneId, time: value.time, mode: value.mode, language: value.language });
}

export function readForecastShare(url) {
  let params;
  try { params = new URL(url).searchParams; } catch { return { status: 'invalid' }; }
  if (!params.has('share')) return { status: 'absent' };
  // Facebook may append fbclid. It is ignored, never copied or used as data.
  if ([...params.keys()].some(key => !KEYS.includes(key) && key !== 'fbclid')
      || params.getAll('fbclid').length > 1
      || KEYS.some(key => params.getAll(key).length !== 1)
      || params.get('share') !== 'forecast') return { status: 'invalid' };
  const selection = exactForecastShareSelection({
    zoneId: params.get('zone'), time: params.get('time'), mode: params.get('mode'), language: params.get('lang'),
  });
  return selection ? { status: 'valid', selection } : { status: 'invalid' };
}

export function forecastShareUrl(pageUrl, input) {
  const selection = exactForecastShareSelection(input);
  if (!selection) throw new Error('FORECAST_SHARE_SELECTION_INVALID');
  const url = new URL(pageUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('FORECAST_SHARE_BASE_INVALID');
  }
  // Never copy an auth fragment, account parameter or user-supplied score.
  url.search = ''; url.hash = '';
  url.search = new URLSearchParams({ share: 'forecast', zone: selection.zoneId,
    time: selection.time, mode: selection.mode, lang: selection.language }).toString();
  return url.href;
}

const shareDateFormatters = new Map();
function forecastShareDateFormatters(locale) {
  const fixed = locale === 'da-DK' || locale === 'de-DE' || locale === 'en-GB';
  if (fixed && shareDateFormatters.has(locale)) return shareDateFormatters.get(locale);
  const formatters = {
    day: new Intl.DateTimeFormat(locale, {
      timeZone: FORECAST_SHARE_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long',
    }),
    clock: new Intl.DateTimeFormat(locale, { timeZone: FORECAST_SHARE_TIME_ZONE,
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  };
  if (fixed) shareDateFormatters.set(locale, formatters);
  return formatters;
}

export function forecastShareDate(time, language = 'da') {
  const locale = LOCALES[language] || LOCALES.da;
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) return '';
  const formatters = forecastShareDateFormatters(locale);
  const day = formatters.day.format(date);
  const parts = formatters.clock.formatToParts(date);
  const hour = parts.find(part => part.type === 'hour').value;
  const minute = parts.find(part => part.type === 'minute').value;
  const clock = hour + (language === 'da' ? '.' : ':') + minute;
  const label = day.charAt(0).toLocaleUpperCase(locale) + day.slice(1);
  return label + (language === 'da' ? ' · kl. ' : ' · ') + clock + (language === 'de' ? ' Uhr' : '');
}

export function forecastShareScoreText(result, language = 'da') {
  const copy = forecastShareCopy(language);
  if (result?.available !== true || typeof result.score !== 'number'
      || !Number.isFinite(result.score) || result.score < 0 || result.score > 100) return copy.unavailable;
  const qualifiers = [copy.local];
  if (result.localCoverage?.status === 'partial-zone') qualifiers.push(copy.partial);
  if (result.scoreQuality === 'HISTORY_INCOMPLETE') qualifiers.push(copy.history);
  return copy.score + ' ' + result.score + '/100 · ' + qualifiers.join(' · ');
}
