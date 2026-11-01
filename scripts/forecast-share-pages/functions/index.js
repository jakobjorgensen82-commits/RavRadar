import { handleForecastShare } from '../../forecast-share/handler.mjs';
import { FORECAST_SHARE_PAGES_BASE_URL } from '../../../js/services/forecast-share-contract.js';
const APPROVED_CUSTOM_BASE_URL = 'https://del.ravradar.dk/';

// Two exact source-bound root hosts. Headers, context.env and query never
// select the upstream, public host, model or a replacement forecast time.
export function onRequest({ request }) {
  let shareBaseUrl = FORECAST_SHARE_PAGES_BASE_URL;
  try {
    if (new URL(request.url).origin === 'https://del.ravradar.dk') shareBaseUrl = APPROVED_CUSTOM_BASE_URL;
  } catch { /* The unchanged handler refuses an invalid route. */ }
  return handleForecastShare(request, { shareBaseUrl });
}
