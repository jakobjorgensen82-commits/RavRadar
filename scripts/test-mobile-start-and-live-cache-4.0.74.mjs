import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [html,css,app,sw,ds,manifest]=await Promise.all(['index.html','style.css','app.js','service-worker.js','js/services/data-service.js','data/live/manifest.json'].map(file=>fs.readFile(file,'utf8')));
if(html.includes('id="locateButton"'))throw new Error('Den selvstændige GPS-knap findes stadig.');
if(!html.includes('account-icon-button')||!html.includes('<svg'))throw new Error('Konto vises ikke som personikon.');
if(!html.includes('primary-header-actions'))throw new Error('Start ravtur og Spørg RavRadar er ikke samlet side om side.');
// The approved timeline is a sibling BETWEEN map and legend. Check actual
// containment/order, not the obsolete immediate-adjacency string.
function mapLegendBelowMap(markup){
  const start=markup.indexOf('<div class="map-column"');if(start<0)return false;
  const stack=[],children=[];let root=null,mapInsideShell=false,closed=false;
  for(const match of markup.slice(start).matchAll(/<(\/?)([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
    const [,closing,name,attributes]=match,tag=name.toLowerCase();
    if(closing){if(stack.at(-1)?.tag!==tag)return false;stack.pop();if(!stack.length){closed=true;break;}continue;}
    const attribute=key=>new RegExp('(?:^|\\s)'+key+'="([^"]*)"').exec(attributes)?.[1]??'';
    const node={tag,id:attribute('id'),classes:attribute('class').split(/\s+/),parent:stack.at(-1)};
    if(!root)root=node;
    if(node.parent===root)children.push(node);
    if(node.id==='map'&&node.parent?.classes.includes('map-shell')&&node.parent.parent===root)mapInsideShell=true;
    if(!/\/$/.test(attributes)&&!['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(tag))stack.push(node);
  }
  const maps=children.filter(node=>node.classes.includes('map-shell'));
  const legends=children.filter(node=>node.tag==='div'&&node.classes.includes('legend'));
  const timelines=children.filter(node=>node.id==='mapTimeline');
  if(!closed||!mapInsideShell||maps.length!==1||legends.length!==1||timelines.length>1)return false;
  const mapIndex=children.indexOf(maps[0]),legendIndex=children.indexOf(legends[0]);
  return legendIndex>mapIndex&&(!timelines.length||(timelines[0].tag==='section'
    &&children.indexOf(timelines[0])>mapIndex&&children.indexOf(timelines[0])<legendIndex));
}
const mapFixture='<div class="map-shell"><div id="map"></div></div>';
const legendFixture='<div class="legend"></div>';
const timelineFixture='<section id="mapTimeline" class="map-timeline"></section>';
const column=body=>'<div class="map-column">'+body+'</div>';
assert.equal(mapLegendBelowMap(column(mapFixture+legendFixture)),true,'Original layout remains a valid below-map legend');
assert.equal(mapLegendBelowMap(column(mapFixture+timelineFixture+legendFixture)),true,'Approved timeline stays between map and legend');
for(const invalid of [column(legendFixture+mapFixture),column(mapFixture)+legendFixture,
  column(mapFixture+legendFixture+timelineFixture),column(mapFixture+legendFixture+legendFixture),
  column('<div id="map"></div>'+timelineFixture+legendFixture)])
  assert.equal(mapLegendBelowMap(invalid),false,'Misplaced, duplicated or uncontained legend/map must fail');
if(!mapLegendBelowMap(html))throw new Error('Farveforklaringen ligger ikke under kortet.');
if(!css.includes('#map{height:58vh')&&!css.includes('#map { height: 58vh'))throw new Error('Mobilkortet er ikke gjort større.');
if(app.includes('locateButton'))throw new Error('Appen binder stadig en selvstændig GPS-knap.');
if(!app.includes('createPublicTripEvidenceRuntime')||!app.includes("publicTripEvidenceRuntime.startWithPrompt()"))throw new Error('Den direkte v2-start af ravtur er ikke bevaret.');
if(app.includes('startTrip()'))throw new Error('Den gamle parallelle turstart findes stadig.');
if(!sw.includes("url.pathname.includes('/data/live/')")||!sw.includes('isContentAddressedLiveData')||!sw.includes("?'force-cache':'no-store'"))throw new Error('Live-data skelner ikke mellem frisk manifestadgang og SHA-adresseret genbrug.');
if(!ds.includes('public-conditions.json'))throw new Error('Den offentlige side bruger ikke public-conditions.json.');
if(!ds.includes('public-condition-details.json')||!/conditions\.datasetId\s*!==\s*details(?:\?)?\.datasetId/.test(ds)||!ds.includes("params.set('sha'"))throw new Error('Den progressive detaljepakke, dens datasetværn eller dens SHA-adresse mangler.');
const m=JSON.parse(manifest);if(m.conditionsPath!=='./public-conditions.json')throw new Error('Manifestet peger ikke på public-conditions.json.');
console.log('OK: mobilprioritet, direkte turflow uden GPS-sporing og sikker live-cache er koblet ind.');
