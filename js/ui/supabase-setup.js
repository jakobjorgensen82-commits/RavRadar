import { PUBLIC_CONFIG, saveLocalPublicConfig } from '../../config.js?v=4.0.188';

const form = document.querySelector('#setupForm');
const status = document.querySelector('#setupStatus');
const submitButton = form.querySelector('button[type="submit"]');

form.elements.url.value = PUBLIC_CONFIG.supabaseUrl || '';
form.elements.key.value = PUBLIC_CONFIG.supabasePublishableKey || '';

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function validateInput(url, key) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Project URL er ikke gyldig.');
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
    throw new Error('Project URL skal være en https-adresse, der slutter på .supabase.co.');
  }
  if (!key.startsWith('sb_publishable_') && !key.startsWith('eyJ')) {
    throw new Error('Nøglen ligner ikke en Supabase Publishable key.');
  }
}

async function testConnection(url, key) {
  validateInput(url, key);

  // /auth/v1/settings er offentlig projektmetadata og kræver kun apikey.
  // Den tester derfor URL + publishable key uden at ramme RLS-beskyttede tabeller.
  const response = await fetch(`${url}/auth/v1/settings`, {
    method: 'GET',
    headers: {
      apikey: key,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.msg || body?.error_description || '';
    } catch {}
    if (response.status === 401 || response.status === 403) {
      throw new Error('Supabase afviste nøglen. Kopiér Publishable key igen og prøv på ny.');
    }
    throw new Error(`Supabase svarede ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return true;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const url = normalizeUrl(form.elements.url.value);
  const key = form.elements.key.value.trim();

  submitButton.disabled = true;
  status.className = '';
  status.textContent = 'Tester forbindelse…';

  try {
    await testConnection(url, key);
    saveLocalPublicConfig({ supabaseUrl: url, supabasePublishableKey: key });
    status.className = 'status-good';
    status.innerHTML = 'Forbindelsen virker og er gemt på denne computer. <a href="admin.html">Åbn administrationen og log ind</a>.';
  } catch (error) {
    status.className = 'status-bad';
    status.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#downloadConfig').addEventListener('click', () => {
  const url = normalizeUrl(form.elements.url.value);
  const key = form.elements.key.value.trim();
  try {
    validateInput(url, key);
  } catch (error) {
    status.className = 'status-bad';
    status.textContent = error.message;
    return;
  }
  const text = `export const PUBLIC_CONFIG = Object.freeze({\n  supabaseUrl: ${JSON.stringify(url)},\n  supabasePublishableKey: ${JSON.stringify(key)}\n});\nexport function saveLocalPublicConfig(){}\nexport function clearLocalPublicConfig(){}\n`;
  const href = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = 'config.js';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
});
