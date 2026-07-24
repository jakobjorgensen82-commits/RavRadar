const ADMIN_SESSION_KEY = 'ravradar-admin-session';
const OBSERVATION_KEY = 'ravradar-observations-v2';
const TRIP_KEYS = ['ravradar-trips-v1', 'ravradar-trips'];
const VERSION = window.RAVRADAR_VERSION || 'unknown';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getJson = async url => { const response = await fetch(url, { cache: 'no-store' }); if (!response.ok) throw new Error(`${url}: ${response.status}`); return response.json(); };
const readLocalArray = key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const formatDate = value => value ? new Date(value).toLocaleString('da-DK') : '–';
const formatNumber = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('da-DK', { maximumFractionDigits: digits }) : '–';

let model = { health:null, conditions:{zones:{}}, zones:{features:[]}, rules:[], knowledge:[], observations:[], trips:[] };

function requireAdminSession() {
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null'); } catch {}
  if (!session?.unlockedAt) {
    document.body.innerHTML = `<main class="admin-shell"><article class="admin-card"><h1>Administration er låst</h1><p>Åbn RavRadar, tryk på logoet 10 gange, indtast PIN-koden og vælg derefter <b>Åbn administration</b>.</p><a class="button" href="./">Tilbage til RavRadar</a></article></main>`;
    throw new Error('Admin session mangler');
  }
}

async function load() {
  document.querySelector('#adminStatus').textContent = 'Opdaterer data…';
  const [health, conditions, zones, national, local, experimental, amber, coastTypes, persistence] = await Promise.all([
    getJson('./data/live/weather-health.json').catch(() => null),
    getJson('./data/live/conditions.json').catch(() => ({ zones:{} })),
    getJson('./data/zones.geojson').catch(() => ({ features:[] })),
    getJson('./rules/national-rules.json').catch(() => ({ rules:[] })),
    getJson('./rules/local-rules.json').catch(() => ({ rules:[] })),
    getJson('./rules/experimental-rules.json').catch(() => ({ rules:[] })),
    getJson('./knowledge/amber-behaviour.json').catch(() => null),
    getJson('./knowledge/coast-types.json').catch(() => null),
    getJson('./knowledge/persistence-rules.json').catch(() => null)
  ]);
  model = {
    health,
    conditions,
    zones,
    rules:[...(national.rules||[]), ...(local.rules||[]), ...(experimental.rules||[])],
    knowledge:[amber, coastTypes, persistence].filter(Boolean),
    observations:readLocalArray(OBSERVATION_KEY),
    trips:TRIP_KEYS.flatMap(readLocalArray)
  };
  renderAll();
  document.querySelector('#adminStatus').textContent = `Version ${VERSION} · data genereret ${formatDate(conditions.generatedAt)}`;
}

function renderAll() {
  renderDashboard();
  renderWeather();
  renderZones();
  renderRules();
  renderKnowledge();
  renderAnalysis();
  renderSystem();
}

function providerCounts() {
  return Object.values(model.conditions.zones || {}).reduce((acc, zone) => {
    const provider = zone.provider || zone.source || 'ukendt';
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});
}

function renderDashboard() {
  const health = model.health;
  const status = health?.status || 'unknown';
  const weatherZoneCount = Object.keys(model.conditions.zones || {}).length;
  const zoneCount = model.zones.features?.length || 0;
  document.querySelector('#summary').innerHTML = `
    <article class="admin-card"><h2>Vejrstatus</h2><div class="metric status-${esc(status)}">${esc(status.toUpperCase())}</div><p>${esc(health?.dmi?.coveragePercent ?? 0)} % DMI-dækning</p></article>
    <article class="admin-card"><h2>Vejrzoner</h2><div class="metric">${weatherZoneCount}/${zoneCount}</div><p>${zoneCount ? Math.round(weatherZoneCount/zoneCount*100) : 0} % med aktuelle data</p></article>
    <article class="admin-card"><h2>DMI-fejl</h2><div class="metric">${esc(health?.dmi?.failureMinutes ?? 0)} min</div><p>Sammenhængende utilstrækkelig drift</p></article>
    <article class="admin-card"><h2>Administratoralarmer</h2><div class="metric">${esc(health?.alerts?.sentLast24Hours ?? 0)}/${esc(health?.alerts?.maxPer24Hours ?? 2)}</div><p>${health?.alerts?.shouldNotifyAdministrator ? 'Alarm bør sendes nu' : 'Ingen ny alarm nødvendig'}</p></article>
    <article class="admin-card"><h2>Regler</h2><div class="metric">${model.rules.filter(rule=>rule.status==='active').length}</div><p>${model.rules.length} regler i alt</p></article>
    <article class="admin-card"><h2>Observationer</h2><div class="metric">${model.observations.length}</div><p>På denne enhed</p></article>`;
  const providers = providerCounts();
  document.querySelector('#providers').innerHTML = Object.keys(providers).length
    ? `<table class="admin-table"><thead><tr><th>Kilde</th><th>Zoner</th></tr></thead><tbody>${Object.entries(providers).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`<tr><td>${esc(name)}</td><td>${count}</td></tr>`).join('')}</tbody></table>`
    : '<p>Ingen centrale vejrzonedata endnu.</p>';
  document.querySelector('#healthDetails').innerHTML = `<dl><dt>Genereret</dt><dd>${formatDate(health?.generatedAt)}</dd><dt>Seneste DMI-succes</dt><dd>${formatDate(health?.dmi?.lastSuccessfulAt)}</dd><dt>Fejl siden</dt><dd>${formatDate(health?.dmi?.consecutiveFailureSince)}</dd><dt>Næste alarm tidligst</dt><dd>${formatDate(health?.alerts?.nextAllowedAfter)}</dd></dl>`;
}

function stationText(waterLevel) {
  const stations = waterLevel?.stations || waterLevel?.stationInterpolation?.stations || [];
  if (!stations.length) return '–';
  return stations.map(station => `${station.name || station.stationId || 'station'} (${formatNumber(station.distanceKm,1)} km · ${formatNumber((station.weight ?? 0)*100,0)} %)`).join('<br>');
}

function renderWeather() {
  const rows = Object.entries(model.conditions.zones || {}).map(([zoneId, weather]) => ({ zoneId, ...weather }));
  document.querySelector('#weatherTable').innerHTML = rows.length ? `<table class="admin-table"><thead><tr><th>Zone</th><th>Kilde</th><th>Vind</th><th>Bølger</th><th>Vandstand</th><th>Stationer/interpolation</th></tr></thead><tbody>${rows.slice(0,500).map(row => {
    const water = row.current?.waterLevel || row.waterLevel || {};
    return `<tr><td>${esc(row.zoneName || row.name || row.zoneId)}</td><td><span class="badge">${esc(row.provider || row.source || 'ukendt')}</span></td><td>${formatNumber(row.current?.windSpeedMs ?? row.windSpeedMs,1)} m/s</td><td>${formatNumber(row.current?.waveHeightM ?? row.waveHeightM,1)} m</td><td>${formatNumber(water.valueCm ?? row.current?.waterLevelCm ?? row.waterLevelCm,0)} cm<br><span class="muted">${esc(water.method || '')}</span></td><td>${stationText(water)}</td></tr>`;
  }).join('')}</tbody></table>` : '<p>Der er endnu ingen genererede vejrzoner i <code>conditions.json</code>.</p>';
}

function renderZones() {
  const query = (document.querySelector('#zoneSearch')?.value || '').trim().toLowerCase();
  const conditionMap = model.conditions.zones || {};
  const rows = (model.zones.features || []).map(feature => {
    const p = feature.properties || {};
    const id = p.id || feature.id || p.zoneId;
    const weather = conditionMap[id] || {};
    const water = weather.current?.waterLevel || weather.waterLevel || {};
    return { id, name:p.name || p.zoneName || id, coastType:p.coastType || '–', region:p.region || p.area || '–', provider:weather.provider || 'ingen data', water };
  }).filter(row => !query || `${row.name} ${row.region} ${row.id}`.toLowerCase().includes(query));
  document.querySelector('#zonesTable').innerHTML = `<p>${rows.length} zoner vist.</p><table class="admin-table"><thead><tr><th>Zone</th><th>Region</th><th>Kysttype</th><th>Vejrkilde</th><th>Vandstandsstationer</th></tr></thead><tbody>${rows.map(row=>`<tr><td><b>${esc(row.name)}</b><br><span class="muted">${esc(row.id)}</span></td><td>${esc(row.region)}</td><td>${esc(row.coastType)}</td><td>${esc(row.provider)}</td><td>${stationText(row.water)}</td></tr>`).join('')}</tbody></table>`;
}

function renderRules() {
  document.querySelector('#rules').innerHTML = model.rules.length ? `<table class="admin-table"><thead><tr><th>Regel</th><th>Status</th><th>Type</th><th>Vidensklasse</th><th>Tillid</th><th>Prioritet</th><th>Version</th></tr></thead><tbody>${model.rules.map(rule=>`<tr><td><b>${esc(rule.name || rule.id)}</b><br><span class="muted">${esc(rule.id)}</span></td><td><span class="badge ${esc(rule.status)}">${esc(rule.status)}</span></td><td>${esc(rule.kind)}</td><td>${esc(rule.knowledgeClass)}</td><td><span class="badge ${esc(rule.confidence)}">${esc(rule.confidence)}</span></td><td>${esc(rule.priority ?? '–')}</td><td>${esc(rule.version ?? '–')}</td></tr>`).join('')}</tbody></table>` : '<p>Ingen regler fundet.</p>';
}

function renderKnowledge() {
  document.querySelector('#knowledge').innerHTML = model.knowledge.length ? model.knowledge.map((item,index)=>`<details ${index===0?'open':''}><summary>${esc(item.title || item.name || item.id || `Videnskilde ${index+1}`)}</summary><pre>${esc(JSON.stringify(item,null,2))}</pre></details>`).join('') : '<p>Ingen vidensfiler fundet.</p>';
}

function renderAnalysis() {
  const withSnapshot = model.observations.filter(row => row.weatherSnapshot || row.weather_snapshot).length;
  document.querySelector('#observations').innerHTML = `<dl><dt>Observationer</dt><dd>${model.observations.length}</dd><dt>Med vejrsnapshot</dt><dd>${withSnapshot}</dd><dt>Uden vejrsnapshot</dt><dd>${model.observations.length-withSnapshot}</dd></dl><p class="muted">Eksporten fjerner direkte bruger-id og præcis GPS-position.</p>`;
  document.querySelector('#trips').innerHTML = `<dl><dt>Registrerede ture</dt><dd>${model.trips.length}</dd><dt>Afsluttede</dt><dd>${model.trips.filter(t=>t.endedAt||t.endTime).length}</dd></dl>`;
}

function renderSystem() {
  const storageBytes = Object.keys(localStorage).reduce((sum,key)=>sum + key.length + (localStorage.getItem(key)?.length || 0),0) * 2;
  document.querySelector('#systemInfo').innerHTML = `<dl><dt>Version</dt><dd>${esc(VERSION)}</dd><dt>Service worker</dt><dd>${'serviceWorker' in navigator ? 'Understøttet' : 'Ikke understøttet'}</dd><dt>Online</dt><dd>${navigator.onLine ? 'Ja' : 'Nej'}</dd><dt>Lokal lagring</dt><dd>${formatNumber(storageBytes/1024,1)} KiB</dd><dt>Vejr genereret</dt><dd>${formatDate(model.conditions.generatedAt)}</dd></dl>`;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

function wireEvents() {
  document.querySelectorAll('.admin-tab').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(item=>item.classList.toggle('active',item===button));
    document.querySelectorAll('.admin-view').forEach(view=>view.classList.toggle('active',view.id===`tab-${button.dataset.tab}`));
  }));
  document.querySelector('#refresh').addEventListener('click', load);
  document.querySelector('#zoneSearch').addEventListener('input', renderZones);
  document.querySelector('#downloadObservations').addEventListener('click', () => {
    const rows = model.observations.map(({anonymous_id,user_id,gps,...row}) => ({...row, gps:gps ? {accuracy:gps.accuracy ?? null}:null}));
    downloadJson('ravradar-observationer-pseudonymiseret.json',{exportedAt:new Date().toISOString(),privacyProfile:'pseudonymised',rows});
  });
  document.querySelector('#downloadDiagnostics').addEventListener('click', () => downloadJson('ravradar-diagnostik.json',{generatedAt:new Date().toISOString(),version:VERSION,health:model.health,weatherGeneratedAt:model.conditions.generatedAt,weatherZones:Object.keys(model.conditions.zones||{}).length,zones:model.zones.features?.length||0,rules:model.rules.length,observations:model.observations.length,trips:model.trips.length,navigator:{online:navigator.onLine,userAgent:navigator.userAgent}}));
  document.querySelector('#clearAppCaches').addEventListener('click', async () => {
    if (!('caches' in window)) return alert('Cache API er ikke tilgængelig i denne browser.');
    const keys = await caches.keys();
    const targets = keys.filter(key=>key.startsWith('ravradar-app-'));
    await Promise.all(targets.map(key=>caches.delete(key)));
    alert(`${targets.length} RavRadar-cache(r) blev ryddet. Brugerdata i localStorage blev ikke slettet.`);
  });
}

try { requireAdminSession(); wireEvents(); load(); } catch (error) { console.warn(error.message); }
