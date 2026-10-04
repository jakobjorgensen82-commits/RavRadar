import './messages.js';
import { initialiseI18n, t } from '../i18n.js?v=4.0.541';
import { openDataset, intersects } from './data-service.js';

initialiseI18n();
const $ = id => document.getElementById(id);
const tr = key => t(`jordrav.${key}`);
const colours = { enhanced:'#d18a1d', possible:'#419e91', limited:'#85746a', unresolved:'#85939e' };
const materialKeys = {
  'glacial-coarse':'GlacialCoarse', 'glacial-fine':'GlacialFine', 'glacial-basin-coarse':'GlacialBasinCoarse', till:'Till',
  'marine-coarse':'MarineCoarse', 'marine-fine':'MarineFine', 'marine-mixed':'Mixed',
  'fresh-coarse':'FreshCoarse', 'fresh-fine':'FreshFine', 'fresh-mixed':'Mixed',
  'organic-cover':'Organic', 'aeolian-cover':'Aeolian', 'older-sediment':'Older',
  rock:'Rock', 'coarse-unspecified':'Coarse', mixed:'Mixed', unresolved:'Unresolved'
};
const processKeys = {meltwater:'Meltwater', erosion:'Erosion', pushed:'Pushed', 'older-till':'OlderTill', marine:'Marine', shore:'Shore', basin:'Basin', cover:'Cover', till:'Till', rock:'Rock', unresolved:'Unresolved', missing:'Missing'};
const accessKeys = {'near-surface':'nearSurface', layered:'layered', covered:'covered', unknown:'unknownDepth'};
const reasonKeys = {enhanced:'reasonEnhanced', possible:'reasonPossible', limited:'reasonLimited', unresolved:'reasonUnresolved'};
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const status = key => { $('jordravStatus').textContent = tr(key); };
let map, data, overview, details, selected;
let opacity = .45;
let generation = 0, requestController, timer;
let visible = true;

function featureStyle(feature) {
  const potential = feature.properties.potential || data.catalog[feature.properties.i].potential;
  return {fillColor: colours[potential], fillOpacity: opacity, weight: feature.properties.potential ? 0 : .4, color: colours[potential], opacity: .55};
}
function syncVisibility() {
  if (!map) return;
  const active = details || overview;
  for (const layer of [overview, details]) {
    if (!layer) continue;
    if (visible && layer === active) layer.addTo(map); else layer.remove();
  }
  if (selected) { if (visible) selected.addTo(map); else selected.remove(); }
}

function sourceLink(source) {
  const link = node('a', source.name);
  link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
function materialAtDepth(code) {
  if(['HV-L','HV-S'].includes(code))return tr('materialMarineFine');
  const groups=data.rules.newerGroups;
  const parts=code.split('-');
  const names=new Set(parts.map(part=>Object.keys(groups).find(key=>groups[key].includes(part)) || 'unresolved'));
  const name=names.size===1?[...names][0]:'mixed';
  return tr(`material${materialKeys[name]}`);
}

function showDetail(feature) {
  const entry = data.catalog[feature.properties.i];
  const panel = $('jordravDetails');
  panel.replaceChildren(node('h2', tr('selected')));
  const badge = node('div', tr(entry.potential), 'jordrav-badge');
  badge.style.borderColor = colours[entry.potential];
  panel.append(badge, node('p', tr('hypothesis'), 'jordrav-original'));
  const facts = node('dl');
  const fact = (key, value) => facts.append(node('dt', tr(key)), node('dd', value));
  fact('basis', feature.properties.o.startsWith('gap:') ? tr('sourceGap') : tr(entry.source === 'soil-old' ? 'oldBasis' : 'newBasis'));
  fact('surface', `${tr(`material${materialKeys[entry.material]}`)} (${entry.surface || '—'})`);
  fact('depth', entry.source === 'soil-old' ? tr('depthMissing') : entry.depth ? `${materialAtDepth(entry.depth)} (${entry.depth})` : '—');
  fact('landscape', tr(`process${processKeys[entry.process]}`));
  fact('access', tr(accessKeys[entry.accessibility]));
  const story=entry.potential==='unresolved'?'Unresolved':materialKeys[entry.material];
  panel.append(facts, node('h3', tr('inference')), node('p', tr(`story${story}`)), node('p', tr(reasonKeys[entry.potential])));
  if (entry.conflictSymbols) panel.append(node('p', `GEUS: ${entry.conflictSymbols}`, 'jordrav-original'));
  const note = node('div', undefined, 'jordrav-method-note');
  note.append(node('strong', tr(entry.potential==='unresolved'?'confidenceUnresolved':'confidenceTitle')), node('p', tr(entry.potential==='unresolved'?'cardUnresolved':'cardConfidence')));
  panel.append(note, node('h3', tr('uncertainty')), node('p', tr('uncertaintyBody')),
    node('p', `${tr('original')}: jsym1=${entry.surface || '—'}; jsym2=${entry.depth || '—'}; TSYM=${entry.symbol}; ${entry.landscape} (${entry.landscapeCode ?? '—'}). ID ${feature.properties.o}`, 'jordrav-original'), node('h3', tr('sources')));
  const list = node('ul');
  const relevant = [entry.source, 'landscape', ...(entry.material.startsWith('marine') ? ['baltic'] : ['rubjerg', 'hartz'])];
  for (const id of relevant) {
    const source = data.rules.sources.find(item => item.id === id);
    const li = node('li'); li.append(sourceLink(source)); list.append(li);
  }
  panel.append(list);
  selected?.remove();
  selected = L.geoJSON(feature, {style:{color:'#102f3a', weight:2.5, fill:false}, interactive:false});
  syncVisibility();
}

async function loadViewport() {
  if (!data || !map) return;
  const current = ++generation;
  requestController?.abort();
  if(!visible){status('hiddenOverlay');return;}
  if (map.getZoom() < data.manifest.detailZoom) {
    details?.remove(); details = null; syncVisibility(); status('overview'); return;
  }
  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const tiles = data.manifest.tiles.filter(tile => intersects(tile.bbox, bbox));
  if (!tiles.length || tiles.length > data.manifest.maxVisibleTiles) {
    details?.remove(); details = null; syncVisibility(); status(tiles.length ? 'zoomMore' : 'overview'); return;
  }
  requestController = new AbortController();
  const signal = requestController.signal;
  status('loadingDetail');
  try {
    const loaded = [];
    // Bound concurrency and work to the viewport. National detail data are
    // never prefetched; cache retains at most the declared 18 local tiles.
    for (let i=0; i<tiles.length; i+=3) {
      loaded.push(...await Promise.all(tiles.slice(i,i+3).map(tile => data.tile(tile, signal))));
      if (current !== generation) return;
    }
    const features=loaded.flatMap(tile => tile.features).filter(feature=>intersects(feature.bbox,bbox));
    if(features.length>12000) {
      details?.remove();details=null;syncVisibility();status('zoomMore');return;
    }
    const layer = L.geoJSON(features, {
      style:featureStyle, onEachFeature:(feature, item) => item.on('click', () => showDetail(feature))
    });
    details?.remove(); details = layer; syncVisibility(); status('detail');
  } catch (error) {
    if (current !== generation || error.name === 'AbortError') return;
    details?.remove(); details = null; syncVisibility(); status('detailFailed');
  }
}

async function start() {
  if (!globalThis.L) throw new Error('Leaflet unavailable');
  map = L.map('jordravMap', {preferCanvas:true, minZoom:6, maxZoom:17});
  map.fitBounds([[54.5,7.7],[57.8,15.25]]);
  const bases = {
    street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    aerial:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'Imagery © Esri, Vantor, Earthstar Geographics, GIS Community · <a href="https://goto.arcgis.com/termsofuse/viewsummary">Terms</a>'})
  };
  let currentBase = 'street';
  try { if (localStorage.getItem('ravradar-jordrav-basemap') === 'aerial') currentBase='aerial'; } catch {}
  const baseStatus = $('jordravBaseStatus');
  for (const [key, layer] of Object.entries(bases)) layer.on('tileerror', () => {
    if (currentBase !== key) return;
    baseStatus.textContent = tr('baseFailed'); baseStatus.hidden = false;
  });
  function setBase(key) {
    bases[currentBase].remove(); currentBase=key; bases[key].addTo(map);
    document.querySelectorAll('[data-base]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.base===key)));
    baseStatus.hidden = true;
    $('jordravAerialSource').hidden=key!=='aerial';
    try { localStorage.setItem('ravradar-jordrav-basemap',key); } catch {}
  }
  document.querySelectorAll('[data-base]').forEach(button => button.addEventListener('click', () => setBase(button.dataset.base)));
  setBase(currentBase);
  $('jordravDenmark').addEventListener('click', () => map.fitBounds([[54.5,7.7],[57.8,15.25]]));
  $('jordravVisible').addEventListener('change', event => { visible=event.target.checked; syncVisibility(); void loadViewport(); });
  $('jordravOpacity').addEventListener('input', event => {
    opacity=Number(event.target.value)/100;
    overview?.setStyle(featureStyle); details?.setStyle(featureStyle);
  });
  for (const category of Object.keys(colours)) {
    const item=node('span'); const swatch=node('i'); swatch.style.background=colours[category]; item.append(swatch,node('span',tr(category))); $('jordravLegend').append(item);
  }
  data = await openDataset();
  overview = L.geoJSON(data.overview, {style:featureStyle, onEachFeature:(_feature, layer) => layer.on('click', event => map.setView(event.latlng, data.manifest.detailZoom))});
  syncVisibility();
  const method=$('jordravMethodContent');
  for (const key of ['methodBody','methodCover','methodChronology','methodScale','methodOld','methodFinds']) method.append(node('p',tr(key)));
  const sources=node('ul');
  for (const source of data.rules.sources) {const li=node('li');li.append(sourceLink(source));if(source.license)li.append(document.createTextNode(` · ${source.license.split(';')[0]}`));sources.append(li);}
  method.append(sources);
  map.attributionControl.addAttribution('<a href="https://dataverse.geus.dk/">GEUS</a> · geological model 0.1');
  map.on('moveend', () => {clearTimeout(timer);timer=setTimeout(loadViewport,180);});
  await loadViewport();
}
start().catch(() => {status('failed');$('jordravStatus').classList.add('jordrav-error');});
