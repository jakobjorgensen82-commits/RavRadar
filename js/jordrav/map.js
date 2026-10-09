import './messages.js?v=4.0.554';
import './context-messages.js?v=4.0.554';
import { initialiseI18n, getLanguage, t } from '../i18n.js?v=4.0.554';
import { openDataset, intersects } from './data-service.js?v=4.0.554';
import { REGIONAL_HYPOTHESES } from './regional-hypotheses.js?v=4.0.554';
import { ACCESS_COLOURS, SURFACE_HUNTABILITY, DEEP_LAYER_EXAMPLES } from './accessibility.js?v=4.0.554';
import { searchContext } from './search-context.js?v=4.0.554';
import { layerAccessPlan } from './layer-access.js?v=4.0.554';
import { landscapeContext } from './landscape-context.js?v=4.0.554';
import { initialiseFieldContext, FIELD_SERVICE } from './field-context.js?v=4.0.554';
import { TRACE_CLASSES, acceptsPotential, parseView, encodeView, featureReference } from './view-state.js?v=4.0.554';
import { MANIFEST_SHA256 } from './dataset-binding.js?v=4.0.554';
import { evidenceChain } from './evidence-chain.js?v=4.0.554';
import { initialiseContextRaster, initialiseBoreContext, soilPointURL, parseSoilPoint, fetchPublicJSON, boreProfileURL, publicBoreDate, SOIL_CONTEXT, BORE_CONTEXT, TERRAIN_CONTEXT } from './public-context.js?v=4.0.554';
import { initialiseProfileExamples } from './profile-examples.js?v=4.0.554';

initialiseI18n();
const $ = id => document.getElementById(id);
const tr = key => t(`jordrav.${key}`);
const colours = { enhanced:'#d18a1d', coastal:'#247bc1', basin:'#bd547f', reworked:'#c0a535', covered:'#60a9a3', possible:'#8c959b', limited:'#85746a', unresolved:'#85939e' };
const categoryKey = category => category === 'covered' ? 'coveredCategory' : category;
const materialKeys = {
  'glacial-coarse':'GlacialCoarse', 'glacial-fine':'GlacialFine', 'glacial-basin-coarse':'GlacialBasinCoarse', till:'Till',
  'marine-coarse':'MarineCoarse', 'marine-fine':'MarineFine', 'marine-mixed':'Mixed',
  'fresh-coarse':'FreshCoarse', 'fresh-fine':'FreshFine', 'fresh-mixed':'Mixed',
  'organic-cover':'Organic', 'aeolian-cover':'Aeolian', 'older-sediment':'Older',
  rock:'Rock', 'coarse-unspecified':'Coarse', mixed:'Mixed', unresolved:'Unresolved'
};
const processKeys = {meltwater:'Meltwater', erosion:'Erosion', pushed:'Pushed', 'older-till':'OlderTill', marine:'Marine', shore:'Shore', basin:'Basin', cover:'Cover', till:'Till', rock:'Rock', unresolved:'Unresolved', missing:'Missing'};
const accessKeys = {'near-surface':'nearSurface', layered:'layered', covered:'covered', unknown:'unknownDepth'};
const reasonKeys = {enhanced:'reasonEnhanced', coastal:'reasonCoastal', basin:'reasonBasin', reworked:'reasonReworked', covered:'reasonCovered', possible:'reasonPossible', limited:'reasonLimited', unresolved:'reasonUnresolved'};
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const status = key => { $('jordravStatus').textContent = tr(key); };

function initialiseInterface() {
  const options=$('jordravMapOptions'),summary=options.querySelector('summary');
  const selectedLayers=['Visible','DeepVisible','Fields','Soil','Terrain','Bores','Profiles'];
  const refreshCount=()=>{$('jordravLayerCount').textContent=String(selectedLayers.filter(name=>$(`jordrav${name}`).checked).length);};
  options.addEventListener('change',refreshCount,true);refreshCount();
  options.addEventListener('focusout',event=>{if(!options.contains(event.relatedTarget))options.open=false;});
  document.addEventListener('pointerdown',event=>{if(options.open&&!options.contains(event.target))options.open=false;},true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&options.open){options.open=false;summary.focus();event.preventDefault();}
  });
  $('jordravDetailJump').addEventListener('click',()=>{
    const panel=$('jordravDetails');panel.scrollIntoView({block:'start'});panel.focus({preventScroll:true});
  });
  document.querySelector('.jordrav-regions').open=matchMedia('(min-width:761px)').matches;
}

function revealDetail() {
  $('jordravDetailJump').hidden=false;
  // A new selection starts at its heading, including within the desktop panel.
  $('jordravDetails').scrollTop=0;
}
let map, data, overview, details, selected, selectedFeature, deepLayers, selectedDeepLayer;
let opacity = .45;
let generation = 0, requestController, timer;
let visible = true;
let onlyEnhanced = false;
let colourMode = 'potential', showDeep = true, trace='all', currentBase='street', pendingSelection;
let cancelRegionNavigation=()=>{};
let contextRequest, selectedBorehole;
const potentialOf = feature => feature.properties.potential || data.catalog[feature.properties.i].potential;
const acceptsFeature = feature => acceptsPotential(potentialOf(feature),trace,onlyEnhanced);

function featureStyle(feature) {
  const potential = potentialOf(feature);
  const colour = colourMode === 'access' ? ACCESS_COLOURS[SURFACE_HUNTABILITY] : colours[potential];
  // General sediment context stays queryable, without colouring almost all
  // land as a recommendation. Accessibility is a separate, explicit view.
  const uncoloured = colourMode === 'potential' && potential === 'possible';
  const cover = colourMode === 'potential' && potential === 'covered';
  return {fillColor: colour, fillOpacity: uncoloured ? 0 : cover ? opacity * .65 : opacity,
    weight: uncoloured ? 0 : cover ? 1 : feature.properties.potential ? 0 : .4,
    dashArray: cover ? '4 4' : null,
    color: colour, opacity: uncoloured ? 0 : .55};
}
function syncVisibility() {
  if (!map) return;
  const active = details || overview;
  for (const layer of [overview, details]) {
    if (!layer) continue;
    if (visible && layer === active) layer.addTo(map); else layer.remove();
  }
  if (deepLayers) {if (visible && showDeep) deepLayers.addTo(map);else deepLayers.remove();}
  if (selected) {
    const accepted = selectedDeepLayer ? showDeep : acceptsFeature(selectedFeature);
    if (visible && accepted) selected.addTo(map);else selected.remove();
    $('jordravSelectionNote').hidden=visible&&accepted;
  } else {
    $('jordravSelectionNote').hidden=true;
  }
}

function renderLegend() {
  const legend = $('jordravLegend');
  legend.replaceChildren();
  const categories = colourMode === 'access' ? [[SURFACE_HUNTABILITY,'huntUnknown']] :
    (trace==='all'?Object.keys(colours):[trace]).map(key=>[key,categoryKey(key)]);
  for (const [category, key] of [...categories,['deep','deepLegend']]) {
    const item=node('span');const swatch=node('i');
    const uncoloured=colourMode==='potential' && category==='possible';
    swatch.style.background=uncoloured ? 'transparent' : category==='deep' ? ACCESS_COLOURS.deep : colourMode==='access' ? ACCESS_COLOURS[category] : colours[category];
    if(uncoloured)swatch.classList.add('jordrav-uncoloured-swatch');
    if(category==='covered' && colourMode==='potential')swatch.style.border='2px dashed #276963';
    if(category==='deep')swatch.classList.add('jordrav-deep-swatch');
    item.append(swatch,node('span',tr(key)));legend.append(item);
  }
  $('jordravColourNote').textContent=tr(colourMode==='access'?'accessColourNote':'potentialColourNote');
  $('jordravFocusNote').hidden=!onlyEnhanced||trace!=='all';
}

function rebuildSurfaceLayers() {
  if(!data)return;
  details?.remove();details=null;overview?.remove();overview=createOverview();
  syncVisibility();renderLegend();void loadViewport();
}

function restoreSelection(features) {
  if(!pendingSelection)return;
  const feature=features.find(item=>featureReference(item)===pendingSelection);
  pendingSelection=null;
  if(feature){showDetail(feature);$('jordravLinkStatus').textContent=tr('viewRestored');}
  else $('jordravLinkStatus').textContent=tr('viewSelectionMissing');
}

function resetDetail() {
  contextRequest?.abort();selectedBorehole=null;
  selected?.remove();selected=null;selectedFeature=null;selectedDeepLayer=null;
  const note=node('div',undefined,'jordrav-method-note');
  note.append(node('strong',tr('confidenceTitle')),node('p',tr('methodNote')));
  const icon=node('div',undefined,'jordrav-empty-icon');icon.setAttribute('aria-hidden','true');
  const steps=node('ol',undefined,'jordrav-guide-steps');
  for(const key of ['uiStepExplore','uiStepClick','uiStepRead'])steps.append(node('li',tr(key)));
  $('jordravDetails').replaceChildren(icon,node('h2',tr('selectTitle')),node('p',tr('selectHelp')),steps,note);
  $('jordravDetailJump').hidden=true;
  syncVisibility();
}

function restorePoint(state) {
  if(!state?.point||state.dataset!==MANIFEST_SHA256)return;
  const example=DEEP_LAYER_EXAMPLES.find(item=>item.id===state.point);
  if(example)showDeepDetail(example);else $('jordravLinkStatus').textContent=tr('viewSelectionMissing');
}

const depthText = example => example.intervals.map(interval=>`${interval.top_m.toLocaleString(getLanguage())}–${interval.bottom_m.toLocaleString(getLanguage())} m`).join('; ');

function showDeepDetail(example) {
  contextRequest?.abort();selectedBorehole=null;
  pendingSelection=null;
  const panel=$('jordravDetails');
  panel.replaceChildren(node('h2',example.name));
  const badge=node('div',tr('deepNotHuntable'),'jordrav-badge jordrav-access-badge');
  badge.style.borderColor=ACCESS_COLOURS.deep;
  panel.append(badge,node('p',tr('deepPointOnly'),'jordrav-original'));
  const facts=node('dl');
  const fact=(key,value)=>facts.append(node('dt',tr(key)),node('dd',value));
  fact('recordedDepth',depthText(example));
  fact('deepMaterial',tr('deepSand'));
  fact('borehole',`DGU ${example.dgu} · ${example.drilledOn}`);
  fact('huntability',tr('deepNotHuntable'));
  panel.append(facts,node('h3',tr('exposureTitle')),node('p',tr('deepExposure')),
    node('h3',tr('inference')),node('p',tr('deepInference')),
    node('p',tr('deepCodeNote'),'jordrav-original'));
  const note=node('div',undefined,'jordrav-method-note');
  note.append(node('strong',tr('confidenceTitle')),node('p',tr('deepConfidence')));
  const source=node('p');source.append(sourceLink({name:`GEUS Jupiter · DGU ${example.dgu}`,url:example.source}));
  panel.append(note,node('h3',tr('sources')),source);
  selected?.remove();selectedFeature=null;selectedDeepLayer=example;
  selected=L.circleMarker([example.latitude,example.longitude],{pane:'jordrav-selection',radius:15,color:'#102f3a',weight:2.5,fill:false,interactive:false});
  revealDetail();
  syncVisibility();
}

function initialiseDeepLayers() {
  deepLayers=L.layerGroup();
  for(const example of DEEP_LAYER_EXAMPLES) {
    const title=`${example.name} · ${tr('deepNotHuntable')} · ${depthText(example)}`;
    const marker=L.marker([example.latitude,example.longitude],{
      title,alt:title,keyboard:true,
      icon:L.divIcon({className:'jordrav-deep-marker',html:'<span aria-hidden="true">↓</span>',iconSize:[24,24],iconAnchor:[12,12]})
    });
    marker.bindTooltip(title,{direction:'top'}).on('click',()=>showDeepDetail(example));
    deepLayers.addLayer(marker);
  }
  $('jordravDeepVisible').addEventListener('change',event=>{showDeep=event.target.checked;syncVisibility();});
}

function createOverview() {
  return L.geoJSON(data.overview, {filter:acceptsFeature, style:featureStyle,
    onEachFeature:(_feature, layer) => layer.on('click', event => map.setView(event.latlng, data.manifest.detailZoom))});
}

function initialiseRegionalGuide() {
  const select = $('jordravRegion');
  const go = $('jordravRegionGo');
  const panel = $('jordravRegionalExplanation');
  const language = getLanguage();
  let moving = false, zooming = false, pendingRegion;
  cancelRegionNavigation=()=>{pendingRegion=null;};
  const navigate = region => {
    map.fitBounds(region.bounds, {padding:[24,24],maxZoom:11,animate:false});
    if(matchMedia('(max-width:760px)').matches){
      $('jordravMap').scrollIntoView({block:'start'});$('jordravMap').focus({preventScroll:true});
    }
  };
  map.on('movestart', () => {moving=true;});
  map.on('zoomstart', () => {zooming=true;});
  map.on('zoomend', () => {zooming=false;});
  map.on('moveend', () => {
    moving=false;
    if (pendingRegion && !zooming) {const region=pendingRegion;pendingRegion=null;navigate(region);}
  });
  for (const region of REGIONAL_HYPOTHESES) {
    const option = node('option', region.copy[language].name);
    option.value = region.id; select.append(option);
  }
  select.addEventListener('change', () => {
    const region = REGIONAL_HYPOTHESES.find(item => item.id === select.value);
    go.disabled = !region; panel.hidden = !region; panel.replaceChildren();
    $('jordravRegionStory').hidden=!region;
    $('jordravRegionStory').open=false;
    if (!region) return;
    const copy = region.copy[language];
    panel.append(node('h2', copy.name));
    const grid = node('div', undefined, 'jordrav-region-grid');
    for (const [title, key] of [['regionalBasis','basis'],['regionalChain','chain'],['regionalFocus','focus'],['regionalChallenge','challenge']]) {
      const section = node('div'); section.append(node('h3',tr(title)),node('p',copy[key])); grid.append(section);
    }
    panel.append(grid);
    const list = node('ul');
    for (const source of region.sources) {const li=node('li');li.append(sourceLink(source));list.append(li);}
    panel.append(list);
  });
  go.addEventListener('click', () => {
    const region = REGIONAL_HYPOTHESES.find(item => item.id === select.value);
    if (!region) return;
    // A second fitBounds during an ongoing Leaflet zoom can be ignored.
    // Keep the latest requested region until the existing movement ends.
    if (moving || zooming) {pendingRegion=region;if(!zooming)map.stop();} else navigate(region);
    if(matchMedia('(min-width:761px)').matches)$('jordravMap').scrollIntoView({block:'center'});
  });
}

function sourceLink(source) {
  const link = node('a', source.name);
  link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  return link;
}
function appendSearchContext(panel, entry) {
  const context = searchContext(entry);
  const section = node('details', undefined, 'jordrav-search-context');
  section.append(node('summary', tr('searchTitle')));
  const facts = node('dl');
  facts.append(node('dt', tr('searchMaterial')), node('dd', context.upper.types.map(type=>tr(`physical_${type}`)).join(' · ')));
  facts.append(node('dt', tr('searchLayers')), node('dd', tr(`relationship_${context.relationship}`)));
  section.append(facts);
  if(context.upper.lateralMixture || context.lower?.lateralMixture) section.append(node('p',tr('searchMixture')));
  for(const type of context.tasks) section.append(node('p',tr(`task_${type}`)));
  section.append(node('h4', tr('searchMissingLink')),node('p',tr(`missing_${context.missingLink}`)));
  panel.append(section);
}

function appendLayerAccess(panel, entry) {
  const plan = layerAccessPlan(entry);
  const section = node('details', undefined, 'jordrav-layer-access');
  section.dataset.kind = plan.kind;
  section.append(node('summary', tr('layerAccessTitle')));
  const facts = node('dl');
  facts.append(node('dt', tr('layerAccessUpper')), node('dd', `${entry.surface || '—'} · ${plan.upper.types.map(type=>tr(`physical_${type}`)).join(' · ')}`));
  facts.append(node('dt', tr('layerAccessLower')), node('dd', plan.lower ? `${entry.depth || '—'} · ${plan.lower.types.map(type=>tr(`physical_${type}`)).join(' · ')}` : tr('depthMissing')));
  section.append(facts, node('p', tr(`layerCase_${plan.kind}`)));
  const steps = node('ol');
  for (const step of plan.steps) steps.append(node('li', tr(`layerStep_${step}`)));
  section.append(steps);
  const landscape = landscapeContext(entry);
  const context = node('details', undefined, 'jordrav-landscape-context');
  context.dataset.route = landscape.route;
  context.dataset.chronology = landscape.chronology;
  context.append(node('summary', tr('landscapeRouteTitle')));
  context.append(node('p', tr(`landscapeRoute_${landscape.route}`)));
  const history = node('p');
  history.append(node('strong', `${tr('landscapeUpperHistory')}: `),document.createTextNode(tr(`sedimentHistory_${landscape.history}`)));
  context.append(history, node('p', tr(`landscapeChronology_${landscape.chronology}`)));
  const contextSource = node('p', undefined, 'jordrav-original');
  contextSource.append(sourceLink({name:tr('landscapeMethod'),url:'https://geuskort.geus.dk/siteeval/tilltyper/den_lille_kvartaergeolog.pdf#page=6'}));
  contextSource.append(document.createTextNode(' · '),sourceLink({name:tr('sedimentHistoryMethod'),url:'https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf#page=16'}));
  context.append(contextSource);
  section.append(context);
  const source = node('p', undefined, 'jordrav-original');
  source.append(sourceLink({name:tr('layerAccessMethod'),url:'https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf#page=4'}));
  section.append(source);
  panel.append(section);
}

function appendEvidenceChain(panel,entry) {
  const chain=evidenceChain(entry),section=node('details',undefined,'jordrav-evidence-chain');
  section.dataset.priority=chain.priority;section.append(node('summary',tr('chainTitle')),node('p',tr('chainNote')));
  const camel=value=>value.replace(/-([a-z])/g,(_m,c)=>c.toUpperCase());
  const steps=node('ol');for(const step of chain.steps)steps.append(node('li',tr(`step_${camel(step)}`)));
  const facts=node('dl');for(const [key,value] of Object.entries({Source:chain.source,Transport:chain.transport,Receiver:chain.receiver,Preservation:chain.preservation,Access:chain.access})){
    facts.append(node('dt',tr(`chain${key}`)),node('dd',tr(`chainState_${camel(value)}`)));
  }
  section.append(steps,facts);panel.append(section);
}
function appendSoilPoint(panel,point) {
  const section=node('section',undefined,'jordrav-soil-point');section.append(node('h3',tr('soilAtClick')));
  if(!point){section.append(node('p',tr('soilNoClick')));panel.append(section);return;}
  section.append(node('p',`${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`,'jordrav-original'),node('p',tr('soilPointNote')));
  const button=node('button',tr('soilRequest')),result=node('div');button.type='button';result.setAttribute('role','status');
  button.addEventListener('click',async()=>{
    contextRequest?.abort();const active=new AbortController();contextRequest=active;button.disabled=true;result.replaceChildren(node('p',tr('soilPointLoading')));
    const timeout=setTimeout(()=>active.abort(),12000);
    try{
      const answer=parseSoilPoint(await fetchPublicJSON(soilPointURL(point.lat,point.lng),active.signal));
      if(contextRequest!==active||!section.isConnected)return;
      result.replaceChildren();
      if(!answer.rows.length)result.append(node('p',tr('soilPointEmpty')));
      else{for(const row of answer.rows)result.append(node('p',`JB ${row.code} · ${row.name}`));result.append(node('p',tr('soilInterpretation')));}
      if(answer.ambiguous)result.append(node('p',tr('soilAmbiguous')));
      if(answer.truncated)result.append(node('p',tr('soilTruncated')));
    }catch{if(contextRequest===active&&section.isConnected)result.replaceChildren(node('p',tr('soilPointFailed')));}
    finally{clearTimeout(timeout);button.disabled=false;}
  });
  const source=node('p');source.append(sourceLink({name:tr('soilSource'),url:SOIL_CONTEXT.source}));
  section.append(button,result,source);panel.append(section);
}
function showBoreContext(row) {
  contextRequest?.abort();pendingSelection=null;selected?.remove();selected=null;selectedFeature=null;selectedDeepLayer=null;selectedBorehole=row;
  const panel=$('jordravDetails');panel.replaceChildren(node('h2',`${tr('boreTitle')} · DGU ${row.dgu}`));
  const facts=node('dl');facts.append(node('dt',tr('boreTotal')),node('dd',row.depth===null?tr('contextMissing'):`${row.depth.toLocaleString(getLanguage())} m`),
    node('dt',tr('boreDate')),node('dd',row.date||tr('contextMissing')));
  const source=node('p');source.append(sourceLink({name:tr('boreOpen'),url:boreProfileURL(row.dgu)}));
  panel.append(facts,node('p',tr('boreCaution')),source);
  revealDetail();
  syncVisibility();
}
function showProfileDetail(profile) {
  showBoreContext({dgu:profile.dgu,depth:profile.totalDepth_m??null,date:publicBoreDate(profile.drilledOn)});
  const panel=$('jordravDetails');panel.querySelector('h2').textContent=`${profile.region} · DGU ${profile.dgu}`;
  panel.append(node('p',`${tr('profileObserved')}: ${profile.observedAt.slice(0,10)}`,'jordrav-original'),node('h3',tr('profileIntervals')),
    node('p',tr('profileDepthNote')),node('p',tr('profileOriginalNote'),'jordrav-original'));
  if(!profile.intervals.length){panel.append(node('p',tr('profileNoGeology')));return;}
  const table=node('table',undefined,'jordrav-profile-table'),head=node('thead'),titles=node('tr');
  for(const key of ['profileTop','profileBottom','profileMaterial']){const th=node('th',tr(key));th.scope='col';titles.append(th);}head.append(titles);table.append(head);
  const body=node('tbody'),depth=value=>value===null?tr('profileUnknownBoundary'):value.toLocaleString(getLanguage());
  for(const interval of profile.intervals){const row=node('tr');
    row.append(node('td',depth(interval.top_m),interval.top_m>0?'jordrav-buried-cell':undefined),node('td',depth(interval.bottom_m)),
      node('td',`${interval.description}${interval.code?' · '+interval.code:''}`));body.append(row);}
  table.append(body);panel.append(table);
}
function showDetail(feature,point=null) {
  contextRequest?.abort();selectedBorehole=null;
  pendingSelection=null;
  const entry = data.catalog[feature.properties.i];
  const panel = $('jordravDetails');
  panel.replaceChildren(node('h2', tr('selected')));
  const badge = node('div', tr(categoryKey(entry.potential)), 'jordrav-badge');
  badge.style.borderColor = colours[entry.potential];
  panel.append(badge, node('p', tr('hypothesis'), 'jordrav-original'));
  const accessBadge=node('div',tr('huntUnknown'),'jordrav-badge jordrav-access-badge');
  accessBadge.style.borderColor=ACCESS_COLOURS.unknown;
  panel.append(accessBadge,node('p',tr('surfaceHuntabilityNote')));
  const facts = node('dl');
  const fact = (key, value) => facts.append(node('dt', tr(key)), node('dd', value));
  const physical = searchContext(entry);
  const material = layer => layer.types.map(type=>tr(`physical_${type}`)).join(' · ');
  fact('basis', feature.properties.o.startsWith('gap:') ? tr('sourceGap') : tr(entry.source === 'soil-old' ? 'oldBasis' : 'newBasis'));
  fact('surface', `${material(physical.upper)} (${entry.surface || '—'})`);
  fact('depth', physical.lower ? `${material(physical.lower)} (${entry.depth || '—'})` : tr('depthMissing'));
  const landscape = landscapeContext(entry);
  fact('landscape', `${landscape.key ? tr(`landscapeName_${landscape.key}`) : entry.landscape || tr('landscapeMissing')} · ${tr(`process${processKeys[entry.process]}`)}`);
  fact('access', tr(accessKeys[entry.accessibility]));
  const story=entry.potential==='unresolved'?'Unresolved':materialKeys[entry.material];
  panel.append(node('h3', tr('inference')), node('p', tr(`story${story}`)), node('p', tr(reasonKeys[entry.potential])));
  appendEvidenceChain(panel,entry);
  appendSoilPoint(panel,point);
  appendSearchContext(panel, entry);
  appendLayerAccess(panel, entry);
  const basis=node('details',undefined,'jordrav-geological-basis');
  basis.append(node('summary',tr('uiBasis')),facts);panel.append(basis);
  if (entry.conflictSymbols) panel.append(node('p', `GEUS: ${entry.conflictSymbols}`, 'jordrav-original'));
  const note = node('div', undefined, 'jordrav-method-note');
  note.append(node('strong', tr(entry.potential==='unresolved'?'confidenceUnresolved':'confidenceTitle')), node('p', tr(entry.potential==='unresolved'?'cardUnresolved':'cardConfidence')));
  panel.append(note, node('h3', tr('uncertainty')), node('p', tr('uncertaintyBody')),
    node('p', `${tr('original')}: jsym1=${entry.surface || '—'}; jsym2=${entry.depth || '—'}; TSYM=${entry.symbol}; ${entry.landscape} (${entry.landscapeCode ?? '—'}). ID ${feature.properties.o}`, 'jordrav-original'), node('h3', tr('sources')));
  const list = node('ul');
  const relevant = [entry.source, 'landscape', ...(entry.potential==='coastal' || ['marine','shore'].includes(entry.process) || entry.material.startsWith('marine') ? ['baltic'] : ['rubjerg', 'hartz'])];
  for (const id of relevant) {
    const source = data.rules.sources.find(item => item.id === id);
    const li = node('li'); li.append(sourceLink(source)); list.append(li);
  }
  panel.append(list);
  selected?.remove();
  selectedFeature = feature;selectedDeepLayer=null;
  selected = L.geoJSON(feature, {pane:'jordrav-selection',style:{color:'#102f3a', weight:2.5, fill:false}, interactive:false});
  revealDetail();
  syncVisibility();
}

async function loadViewport() {
  if (!data || !map) return;
  const current = ++generation;
  requestController?.abort();
  if(!visible){status('hiddenOverlay');if(pendingSelection)$('jordravLinkStatus').textContent=tr('viewSelectionWaiting');return;}
  if (map.getZoom() < data.manifest.detailZoom) {
    details?.remove(); details = null; syncVisibility(); status('overview');
    if(pendingSelection)$('jordravLinkStatus').textContent=tr('viewSelectionWaiting');return;
  }
  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const tiles = data.manifest.tiles.filter(tile => intersects(tile.bbox, bbox));
  if (!tiles.length || tiles.length > data.manifest.maxVisibleTiles) {
    details?.remove(); details = null; syncVisibility(); status(tiles.length ? 'zoomMore' : 'overview');
    if(pendingSelection)$('jordravLinkStatus').textContent=tr('viewSelectionWaiting');return;
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
    const viewportFeatures=loaded.flatMap(tile => tile.features).filter(feature=>intersects(feature.bbox,bbox));
    const features=viewportFeatures.filter(acceptsFeature);
    if(features.length>12000) {
      details?.remove();details=null;syncVisibility();status('zoomMore');
      if(pendingSelection)$('jordravLinkStatus').textContent=tr('viewSelectionWaiting');return;
    }
    const layer = L.geoJSON(features, {
      style:featureStyle, onEachFeature:(feature, item) => item.on('click', event => showDetail(feature,event.latlng))
    });
    details?.remove(); details = layer; syncVisibility(); status('detail');
    restoreSelection(viewportFeatures);
  } catch (error) {
    if (current !== generation || error.name === 'AbortError') return;
    details?.remove(); details = null; syncVisibility(); status('detailFailed');
    if(pendingSelection)$('jordravLinkStatus').textContent=tr('viewSelectionFailed');
  }
}

async function start() {
  if (!globalThis.L) throw new Error('Leaflet unavailable');
  map = L.map('jordravMap', {preferCanvas:true, minZoom:6, maxZoom:17});
  const selectionPane=map.createPane('jordrav-selection');
  selectionPane.style.zIndex='460';selectionPane.style.pointerEvents='none';
  map.fitBounds([[54.5,7.7],[57.8,15.25]]);
  const saved=parseView(location.hash);
  function setViewControls(state) {
    trace=state.trace;onlyEnhanced=state.focus;colourMode=state.mode;opacity=state.opacity/100;
    visible=state.show;showDeep=state.deep;
    $('jordravTrace').value=trace;$('jordravFocus').checked=onlyEnhanced;
    $('jordravFocusNote').hidden=!onlyEnhanced;$('jordravColourMode').value=colourMode;
    $('jordravOpacity').value=String(state.opacity);$('jordravVisible').checked=visible;
    $('jordravFields').checked=state.fields;$('jordravDeepVisible').checked=showDeep;
    for(const name of ['Soil','Terrain','Bores','Profiles'])$(`jordrav${name}`).checked=Boolean(state[name.toLowerCase()]);
    cancelRegionNavigation();map.stop();
    map.setView([state.latitude,state.longitude],state.zoom,{animate:false,reset:true});
    pendingSelection=state.dataset===MANIFEST_SHA256?state.feature:null;
    $('jordravLinkStatus').textContent=tr(state.dataset===MANIFEST_SHA256?'viewRestored':'viewDatasetChanged');
  }
  if(saved.state)setViewControls(saved.state);
  else if(saved.error)$('jordravLinkStatus').textContent=tr('viewInvalid');
  initialiseInterface();
  const bases = {
    street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}),
    aerial:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, attribution:'Imagery © Esri, Vantor, Earthstar Geographics, GIS Community · <a href="https://goto.arcgis.com/termsofuse/viewsummary">Terms</a>'})
  };
  try { if (localStorage.getItem('ravradar-jordrav-basemap') === 'aerial') currentBase='aerial'; } catch {}
  if(saved.state)currentBase=saved.state.base;
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
  initialiseRegionalGuide();
  initialiseDeepLayers();
  initialiseFieldContext(map, $('jordravFields'), $('jordravFieldsStatus'), tr, L);
  initialiseContextRaster(map,$('jordravSoil'),$('jordravSoilStatus'),tr,L,'soil');
  initialiseContextRaster(map,$('jordravTerrain'),$('jordravTerrainStatus'),tr,L,'terrain');
  initialiseBoreContext(map,$('jordravBores'),$('jordravBoresStatus'),tr,L,showBoreContext);
  initialiseProfileExamples(map,$('jordravProfiles'),$('jordravProfilesStatus'),tr,L,showProfileDetail);
  $('jordravFieldSource').href = FIELD_SERVICE.source;
  $('jordravDenmark').addEventListener('click', () => map.fitBounds([[54.5,7.7],[57.8,15.25]]));
  $('jordravVisible').addEventListener('change', event => { visible=event.target.checked; syncVisibility(); void loadViewport(); });
  $('jordravFocus').addEventListener('change', event => {
    onlyEnhanced = event.target.checked;
    $('jordravFocusNote').hidden = !onlyEnhanced;
    rebuildSurfaceLayers();
  });
  $('jordravTrace').addEventListener('change',event=>{trace=TRACE_CLASSES.includes(event.target.value)?event.target.value:'all';rebuildSurfaceLayers();});
  $('jordravOpacity').addEventListener('input', event => {
    opacity=Number(event.target.value)/100;
    overview?.setStyle(featureStyle); details?.setStyle(featureStyle);
  });
  $('jordravColourMode').addEventListener('change',event=>{
    colourMode=event.target.value==='access'?'access':'potential';
    overview?.setStyle(featureStyle);details?.setStyle(featureStyle);renderLegend();
  });
  renderLegend();
  data = await openDataset();
  overview = createOverview();
  syncVisibility();
  restorePoint(saved.state);
  $('jordravCopyView').disabled=false;
  $('jordravCopyView').addEventListener('click',async()=>{
    const center=map.getCenter().wrap(),bounds=map.getBounds();
    const bbox=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()];
    const reference=selectedFeature?featureReference(selectedFeature):pendingSelection;
    const referenceBounds=selectedFeature?.bbox||(reference?reference.split('~')[1].split(',').map(Number):null);
    const canSaveFeature=Boolean(reference&&visible&&map.getZoom()>=data.manifest.detailZoom&&intersects(referenceBounds,bbox));
    const omittedSelection=Boolean((reference&&!canSaveFeature)||selectedBorehole);
    const state={latitude:center.lat,longitude:center.lng,zoom:map.getZoom(),base:currentBase,trace,mode:colourMode,opacity:Math.round(opacity*100),
      focus:onlyEnhanced,show:visible,fields:$('jordravFields').checked,deep:showDeep,dataset:MANIFEST_SHA256,
      soil:$('jordravSoil').checked,terrain:$('jordravTerrain').checked,bores:$('jordravBores').checked,
      profiles:$('jordravProfiles').checked,
      feature:canSaveFeature?reference:null,point:selectedDeepLayer?.id||null};
    const url=new URL(location.href);
    try {url.hash=encodeView(state);}catch{$('jordravLinkStatus').textContent=tr('viewCannotSave');return;}
    const input=$('jordravViewLink');input.value=url.href;input.hidden=false;
    history.replaceState(null,'',url);
    try {
      await navigator.clipboard.writeText(url.href);
      $('jordravLinkStatus').textContent=tr(omittedSelection?'viewCopiedWithoutSelection':'viewCopied');
    } catch {
      input.focus();input.select();$('jordravLinkStatus').textContent=tr(omittedSelection?'viewManualCopyWithoutSelection':'viewManualCopy');
    }
  });
  window.addEventListener('hashchange',()=>{
    const next=parseView(location.hash);
    if(!next.state){if(next.error)$('jordravLinkStatus').textContent=tr('viewInvalid');return;}
    resetDetail();
    setViewControls(next.state);setBase(next.state.base);rebuildSurfaceLayers();
    $('jordravFields').dispatchEvent(new Event('change'));
    for(const name of ['Soil','Terrain','Bores','Profiles'])$(`jordrav${name}`).dispatchEvent(new Event('change'));
    restorePoint(next.state);
  });
  const method=$('jordravMethodContent');
  for (const key of ['methodBody','methodCover','methodChronology','methodScale','methodOld','methodFinds']) method.append(node('p',tr(key)));
  const sources=node('ul');
  for (const source of data.rules.sources) {const li=node('li');li.append(sourceLink(source));if(source.license)li.append(document.createTextNode(` · ${source.license.split(';')[0]}`));sources.append(li);}
  method.append(sources);
  for(const source of [{name:'JB 2024 · AU / SGAV',url:SOIL_CONTEXT.source},{name:'Jupiter · GEUS',url:BORE_CONTEXT.source},{name:'DHM 2007 · SDFI / GEUS · 10 m',url:TERRAIN_CONTEXT.source}]){
    const li=node('li');li.append(sourceLink(source));sources.append(li);
  }
  map.attributionControl.addAttribution(`<a href="https://dataverse.geus.dk/">GEUS</a> · geological model ${data.manifest.modelVersion}`);
  map.on('moveend', () => {
    clearTimeout(timer);
    if (visible && map.getZoom() >= data.manifest.detailZoom) status('loadingDetail');
    timer=setTimeout(loadViewport,180);
  });
  await loadViewport();
}
start().catch(() => {status('failed');$('jordravStatus').classList.add('jordrav-error');});
