import { handleForecastShare } from './handler.mjs';
import { FORECAST_SHARE_BASE_URL } from '../../js/services/forecast-share-contract.js';

// Kun den faste offentlige rute. Request, miljø og headere giver ingen ny autoritet.
export default {
  fetch(request) {
    return handleForecastShare(request, { shareBaseUrl: FORECAST_SHARE_BASE_URL });
  },
};
