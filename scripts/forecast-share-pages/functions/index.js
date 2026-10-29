import { handleForecastShare } from '../../forecast-share/handler.mjs';
import { FORECAST_SHARE_PAGES_BASE_URL } from '../../../js/services/forecast-share-contract.js';

// One source-bound root route. Headers, context.env and query parameters never
// select the upstream, public host, model or a replacement forecast time.
export function onRequest({ request }) {
  return handleForecastShare(request, { shareBaseUrl: FORECAST_SHARE_PAGES_BASE_URL });
}
