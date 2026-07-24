const getJson = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function load() {
  const [health, conditions, ...ruleFiles] = await Promise.all([
    getJson('./data/live/weather-health.json').catch(() => null),
    getJson('./data/live/conditions.json').catch(() => ({ zones:{} })),
    getJson('./rules/national-rules.json').catch(() => ({rules:[]})),
    getJson('./rules/local-rules.json').catch(() => ({rules:[]})),
    getJson('./rules/experimental-rules.json').catch(() => ({rules:[]}))
  ]);
  const providers = Object.values(conditions.zones || {}).reduce((acc, z) => (acc[z.provider]=(acc[z.provider]||0)+1, acc), {});
  const status = health?.status || 'unknown';
  document.querySelector('#summary').innerHTML = `
    <article class="admin-card"><h2>Vejrstatus</h2><div class="metric status-${esc(status)}">${esc(status.toUpperCase())}</div><p>${esc(health?.dmi?.coveragePercent ?? 0)} % DMI-dækning</p></article>
    <article class="admin-card"><h2>DMI-fejl</h2><div class="metric">${esc(health?.dmi?.failureMinutes ?? 0)} min</div><p>Sammenhængende utilstrækkelig drift</p></article>
    <article class="admin-card"><h2>Administratoralarmer</h2><div class="metric">${esc(health?.alerts?.sentLast24Hours ?? 0)}/2</div><p>${health?.alerts?.shouldNotifyAdministrator?'Alarm bør sendes nu':'Ingen ny alarm nødvendig'}</p></article>
    <article class="admin-card"><h2>Kilder</h2><p>${Object.entries(providers).map(([k,v])=>`${esc(k)}: <b>${v}</b>`).join('<br>') || 'Ingen data'}</p></article>`;
  const rules = ruleFiles.flatMap(file => file.rules || []);
  document.querySelector('#rules').innerHTML = rules.length ? `<table><thead><tr><th>Regel</th><th>Status</th><th>Klasse</th><th>Tillid</th><th>Version</th></tr></thead><tbody>${rules.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.status)}</td><td>${esc(r.knowledgeClass)}</td><td>${esc(r.confidence)}</td><td>${esc(r.version)}</td></tr>`).join('')}</tbody></table>` : '<p>Ingen regler oprettet.</p>';
  const observations = JSON.parse(localStorage.getItem('ravradar-observations-v2') || '[]');
  document.querySelector('#observations').innerHTML = `<p><b>${observations.length}</b> observationer på denne enhed. Vejrsnapshots bevares uafhængigt af central vejrretention.</p>`;
}

document.querySelector('#refresh').addEventListener('click', load);
document.querySelector('#downloadObservations').addEventListener('click', () => {
  const rows = JSON.parse(localStorage.getItem('ravradar-observations-v2') || '[]').map(({anonymous_id,user_id,gps,...row}) => ({...row, gps: gps ? {accuracy:gps.accuracy ?? null} : null}));
  const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(),privacyProfile:'pseudonymised',rows}, null, 2)], {type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ravradar-observationer.json';a.click();URL.revokeObjectURL(a.href);
});
load();
