import { PUBLIC_CONFIG } from '../config.js';

const baseUrl = (process.env.SUPABASE_URL || PUBLIC_CONFIG.supabaseUrl || '').replace(/\/$/, '');
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_CONFIG.supabasePublishableKey || '';
if (!baseUrl || !publishableKey) throw new Error('Edge-verifikationens offentlige konfiguration mangler.');

async function invoke(functionName, { origin, method = 'POST', body = '{}' } = {}) {
  return fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method,
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${publishableKey}`,
      origin,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body } : {}),
  });
}

for (const functionName of ['submit-observation', 'trip-log']) {
  const preflight = await invoke(functionName, { origin: 'https://ravradar.dk', method: 'OPTIONS' });
  if (preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== 'https://ravradar.dk') {
    throw new Error(`${functionName}: tilladt CORS-preflight fejlede.`);
  }
  const foreign = await invoke(functionName, { origin: 'https://example.invalid', method: 'OPTIONS' });
  if (foreign.status !== 403 || foreign.headers.get('access-control-allow-origin')) {
    throw new Error(`${functionName}: fremmed origin blev ikke afvist sikkert.`);
  }
}

const unauthenticatedLog = await invoke('trip-log', { origin: 'https://ravradar.dk', body: JSON.stringify({ limit: 1 }) });
if (unauthenticatedLog.status !== 401) throw new Error(`Turloggen accepterede en ikke-indlogget læsning (${unauthenticatedLog.status}).`);
const unauthenticatedBody = await unauthenticatedLog.json().catch(() => ({}));
if (unauthenticatedBody?.error !== 'LOGIN_REQUIRED') throw new Error('Turloggens sikre loginfejl mangler.');

const invalidObservation = await invoke('submit-observation', { origin: 'https://ravradar.dk' });
if (invalidObservation.status !== 400) throw new Error(`Observationens feltgate svarede uventet (${invalidObservation.status}).`);

console.log('Edge-verifikation: CORS, loginbeskyttet turlog og observationsvalidering er grønne uden at oprette data.');
