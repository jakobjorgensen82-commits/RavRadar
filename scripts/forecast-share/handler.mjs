// INACTIVE HOST-NEUTRAL HANDLER. No Worker/Edge registration, credentials,
// domain route, scheduled generation, database or image storage is provided.
// Activation requires a separately reviewed public host and exact route binding.
import { loadPublicForecastShareSelection } from '../../js/services/data-service.js?v=4.0.587';
import { readForecastShare, forecastShareUrl, forecastShareCopy, forecastShareDate,
  forecastShareScoreText, FORECAST_SHARE_BRAND_PATH } from '../../js/services/forecast-share-contract.js?v=4.0.587';

const PUBLIC_PAGE = 'https://ravradar.dk/';
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

// shareBaseUrl has NO default: a future approved host must supply the exact
// route. It is deployment configuration, never a query/header/body value.
export async function handleForecastShare(request, { shareBaseUrl, fetchPublic = globalThis.fetch } = {}) {
  let base, url;
  try {
    base = new URL(shareBaseUrl); url = new URL(request.url);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
        || url.origin !== base.origin || url.pathname !== base.pathname) throw new Error('UNBOUND_ROUTE');
  } catch { return new Response('Share route not configured.', { status: 503 }); }
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const incoming = readForecastShare(url.href);
  const selection = incoming.selection;
  const copy = forecastShareCopy(selection?.language);
  let verified = null;
  if (incoming.status === 'valid') {
    try {
      verified = await loadPublicForecastShareSelection(selection, {
        fetchPublic: (path, options) => {
          // Only source-owned fixed paths and manifest-owned hashes reach here.
          if (path !== './data/live/manifest.json' && path !== './data/zones.geojson'
              && !/^\.\/data\/live\/forecast\/[a-f0-9]{64}\.json$/.test(path)) throw new Error('PUBLIC_PATH_REJECTED');
          return fetchPublic(new URL(path, PUBLIC_PAGE), {
            ...options, redirect: 'error', credentials: 'omit', headers: { Accept: 'application/json' },
          });
        },
      });
    } catch { /* Fail closed without returning internal errors or a stale score. */ }
  }
  const present = verified?.result?.available === true;
  const title = verified
    ? verified.zoneName + (present ? ' · ' + copy.score + ' ' + verified.result.score + '/100' : ' · ' + copy.title) + ' · RavRadar'
    : copy.title + ' · RavRadar';
  const description = selection
    ? forecastShareDate(selection.time, selection.language) + ' · '
      + (present ? forecastShareScoreText(verified.result, selection.language) : copy.unavailable)
      + ' ' + copy.disclaimer
    : copy.invalid;
  const shareUrl = selection ? forecastShareUrl(base.href, selection) : base.href;
  const appUrl = selection ? forecastShareUrl(PUBLIC_PAGE, selection) : PUBLIC_PAGE;
  const image = new URL(FORECAST_SHARE_BRAND_PATH, PUBLIC_PAGE).href;
  // These tags are in the HTTP HTML body, not client-JS mutations.
  const html = '<!doctype html><html lang="' + escape(selection?.language || 'da') + '"><head>'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex"><title>' + escape(title) + '</title>'
    + '<meta property="og:type" content="website"><meta property="og:site_name" content="RavRadar.dk">'
    + '<meta property="og:title" content="' + escape(title) + '">'
    + '<meta property="og:description" content="' + escape(description) + '">'
    + '<meta name="description" content="' + escape(description) + '">'
    + '<meta property="og:url" content="' + escape(shareUrl) + '">'
    + '<meta property="og:image" content="' + escape(image) + '">'
    + '<meta property="og:image:width" content="512"><meta property="og:image:height" content="512">'
    + '<meta property="og:image:alt" content="RavRadar"><link rel="canonical" href="' + escape(shareUrl) + '">'
    + '</head><body><main><h1>' + escape(title) + '</h1><p>' + escape(description)
    + '</p><p><a href="' + escape(appUrl) + '">' + escape(copy.open) + '</a></p></main></body></html>';
  return new Response(request.method === 'HEAD' ? null : html, {
    status: incoming.status === 'valid' ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" },
  });
}
