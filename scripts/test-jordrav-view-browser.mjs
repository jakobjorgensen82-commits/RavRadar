import { jordravControl, openJordravDetails, closeJordravOptions } from './test-helpers/jordrav-ui.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { TRACE_CLASSES, encodeView, parseView } from '../js/jordrav/view-state.js';
import { MANIFEST_SHA256 } from '../js/jordrav/dataset-binding.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=path.resolve('docs/research/jordrav');
const diagnostic=JSON.parse(await fs.readFile(path.join(output,'national-search-context-2026-10-05.json')));
const outputPrefix=process.env.RAVRADAR_JORDRAV_VIEW_PREFIX||'planning-2026-10-05';
if(!/^[\w.-]+$/.test(outputPrefix))throw Error('Invalid planning browser output prefix');
const artifact=name=>path.join(output,`${outputPrefix}-${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,'')||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{
    let bytes=await fs.readFile(path.resolve(relative));
    if(relative==='js/jordrav/map.js')bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__viewHarness={get map(){return map},get data(){return data},get overview(){return overview},get details(){return details},get selected(){return selected},get selectedFeature(){return selectedFeature},get selectedDeepLayer(){return selectedDeepLayer},featureReference};')]);
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={scope:'Local Chrome UI, saved-link restoration and 390px emulation; no physical mobile or production claim',dataset:MANIFEST_SHA256,checks:[],errors:[]};
const ready=page=>page.waitForFunction(()=>window.__viewHarness?.data&&!document.getElementById('jordravCopyView').disabled,null,{timeout:90000});
const selection=page=>page.evaluate(()=>{
  const h=window.__viewHarness;return h.featureReference(h.selectedFeature);
});
async function clickExample(page,example){
  await page.evaluate(b=>{window.__viewHarness.map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{maxZoom:13,animate:false});},example.bbox);
  await page.waitForFunction(o=>window.__viewHarness.details?.getLayers().some(l=>l.feature.properties.o===o),example.origin,{timeout:90000});
  const pixel=await page.evaluate(origin=>{
    const {map,details}=window.__viewHarness;
    function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [x,y]=ring[i],[xx,yy]=ring[j];if((y>p[1])!==(yy>p[1])&&p[0]<(xx-x)*(p[1]-y)/(yy-y)+x)yes=!yes;}return yes;}
    for(const layer of details.getLayers().filter(l=>l.feature.properties.o===origin)){
      const bounds=layer.getBounds(),size=map.getSize(),geometry=layer.feature.geometry;
      const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
      for(let row=1;row<30;row++)for(let column=1;column<30;column++){
        const lat=bounds.getSouth()+(bounds.getNorth()-bounds.getSouth())*row/30,lng=bounds.getWest()+(bounds.getEast()-bounds.getWest())*column/30;
        const p=map.latLngToContainerPoint([lat,lng]);
        if(p.x<15||p.y<15||p.x>size.x-15||p.y>size.y-35||(p.x<70&&p.y<100))continue;
        if([[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>{const q=map.containerPointToLatLng([p.x+dx,p.y+dy]);return polygons.some(r=>inside([q.lng,q.lat],r[0])&&!r.slice(1).some(ring=>inside([q.lng,q.lat],ring)));}))return{x:p.x,y:p.y};
      }
    }throw Error('No safe interior point');
  },example.origin);
  await closeJordravOptions(page);await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const box=await page.locator('#jordravMap').boundingBox();
  await page.mouse.click(box.x+pixel.x,box.y+pixel.y);
  await page.waitForFunction(o=>window.__viewHarness.selectedFeature?.properties.o===o,example.origin);
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(address).origin});
  const requests=[];
  page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(address);await ready(page);
  for(const trace of TRACE_CLASSES){
    await (await jordravControl(page,'#jordravTrace')).selectOption(trace);
    const categories=await page.evaluate(()=>window.__viewHarness.overview.getLayers().map(l=>l.feature.properties.potential));
    assert.ok(categories.length>0,trace);assert.ok(categories.every(p=>p===trace),trace);
    assert.equal(await page.locator('#jordravLegend>span').count(),2);
  }
  assert.ok(!requests.some(u=>/tile-.*\.geojson\.gz/.test(u)));
  report.checks.push('All five lead filters redraw nationwide overview, update legend and request no detail tiles');
  await (await jordravControl(page,'#jordravTrace')).selectOption('all');
  await clickExample(page,diagnostic.materialExamples.marineOrganic);
  const geologicalDetailText=target=>target.locator('#jordravDetails').evaluate(panel=>{
    const copy=panel.cloneNode(true);copy.querySelector('.jordrav-soil-point')?.remove();return copy.textContent;
  });
  const reference=await selection(page),detailText=await geologicalDetailText(page);
  assert.ok(await page.locator('.jordrav-soil-point button').count());
  await (await jordravControl(page,'#jordravTrace')).selectOption('basin');
  await page.waitForFunction(()=>window.__viewHarness.details&&window.__viewHarness.details.getLayers().every(l=>window.__viewHarness.data.catalog[l.feature.properties.i].potential==='basin'));
  assert.equal(await selection(page),reference);assert.equal(await page.locator('#jordravSelectionNote').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__viewHarness.map.hasLayer(window.__viewHarness.selected)),false);
  await (await jordravControl(page,'#jordravTrace')).selectOption('coastal');
  assert.equal(await page.locator('#jordravSelectionNote').isVisible(),false);
  report.checks.push('Local lead filter preserves explanation and explicitly marks a hidden selection; matching filter restores highlight');
  await page.locator('[data-base="aerial"]').click();await (await jordravControl(page,'#jordravFields')).check();
  await (await jordravControl(page,'#jordravFocus')).check();await (await jordravControl(page,'#jordravDeepVisible')).uncheck();
  await (await jordravControl(page,'#jordravOpacity')).fill('35');
  await page.locator('#jordravCopyView').click();
  await page.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.startsWith('Link kopieret'));
  const savedURL=await page.locator('#jordravViewLink').inputValue(),saved=parseView(new URL(savedURL).hash).state;
  assert.equal(saved.feature,reference);assert.equal(saved.dataset,MANIFEST_SHA256);assert.equal(saved.fields,true);assert.equal(saved.trace,'coastal');
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),savedURL);
  report.checks.push('Copy button creates a bounded dataset-bound link and writes exactly that URL to clipboard');
  await page.evaluate(()=>{window.__viewHarness.map.setView([56,10],6,{animate:false,reset:true});});
  await page.locator('#jordravCopyView').click();
  await page.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('ikke med'));
  assert.equal(parseView(new URL(await page.locator('#jordravViewLink').inputValue()).hash).state.feature,null);
  report.checks.push('Copying after leaving the detail view omits the old polygon and explains the omission');
  const restoredContext=await browser.newContext({viewport:{width:1440,height:1000}}),restored=await restoredContext.newPage();
  let releaseTiles;const tileGate=new Promise(resolve=>{releaseTiles=resolve;});
  await restored.route('**/tile-*.geojson.gz*',async route=>{await tileGate;await route.continue();});
  restored.on('pageerror',e=>report.errors.push(e.message));
  const restoredRequests=[];restored.on('request',r=>restoredRequests.push(r.url()));
  await restored.goto(savedURL);await ready(restored);
  assert.equal(await selection(restored),null);
  await restored.locator('#jordravCopyView').click();
  assert.equal(parseView(new URL(await restored.locator('#jordravViewLink').inputValue()).hash).state.feature,reference);
  releaseTiles();
  report.checks.push('Copying while detail data are still loading preserves the pending exact fragment reference');
  await restored.waitForFunction(ref=>window.__viewHarness.featureReference(window.__viewHarness.selectedFeature)===ref,reference,{timeout:90000});
  assert.equal(await geologicalDetailText(restored),detailText);
  assert.match(await restored.locator('.jordrav-soil-point').textContent(),/En gemt flade har ikke et automatisk prøvepunkt/);
  assert.equal(await restored.locator('.jordrav-soil-point button').count(),0);
  for(const [id,value] of [['jordravTrace','coastal'],['jordravOpacity','35'],['jordravColourMode','potential']])assert.equal(await restored.locator(`#${id}`).inputValue(),value);
  for(const [id,value] of [['jordravFocus',true],['jordravVisible',true],['jordravFields',true],['jordravDeepVisible',false]])assert.equal(await restored.locator(`#${id}`).isChecked(),value);
  assert.equal(await restored.locator('[data-base="aerial"]').getAttribute('aria-pressed'),'true');
  const position=await restored.evaluate(()=>({lat:window.__viewHarness.map.getCenter().lat,lng:window.__viewHarness.map.getCenter().lng,zoom:window.__viewHarness.map.getZoom()}));
  assert.ok(Math.abs(position.lat-saved.latitude)<1e-6&&Math.abs(position.lng-saved.longitude)<1e-6);assert.equal(position.zoom,saved.zoom);
  assert.ok(new Set(restoredRequests.filter(u=>/tile-.*\.geojson\.gz/.test(u))).size<=12);
  report.checks.push('Fresh browser context restores exact clipped polygon, physical explanation, camera and every saved control with bounded local loading');
  await restored.evaluate(hash=>{location.hash=hash;},encodeView({...saved,trace:'basin'}));
  await restored.waitForFunction(()=>document.getElementById('jordravSelectionNote').hidden===false);
  assert.equal(await selection(restored),reference);
  report.checks.push('A saved polygon excluded by the lead filter is identified honestly without colouring a different area');
  await restored.evaluate(hash=>{location.hash=hash;},encodeView({...saved,dataset:'a'.repeat(64)}));
  await restored.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('Geologidata har ændret sig'));
  assert.equal(await selection(restored),null);assert.match(await restored.locator('#jordravDetails').textContent(),/Vælg et sted på kortet/);
  report.checks.push('Changed dataset restores camera and controls but clears earlier polygon and explanation with explicit warning');
  await restored.evaluate(hash=>{location.hash=hash;},encodeView({...saved,feature:'n-missing~10.40000000,57.16000000,10.41000000,57.17000000'}));
  await restored.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('findes ikke her'),null,{timeout:90000});
  assert.equal(await selection(restored),null);
  report.checks.push('Missing fragment gives explicit message and never substitutes another polygon');
  const deepState={...saved,feature:null,point:'aalbaek-deep-sand',deep:true,mode:'access'};
  await restored.evaluate(hash=>{location.hash=hash;},encodeView(deepState));
  await restored.waitForFunction(()=>window.__viewHarness.selectedDeepLayer?.id==='aalbaek-deep-sand');
  assert.match(await restored.locator('#jordravDetails').textContent(),/80–90,5 m; 107–112 m/);
  assert.match(await restored.locator('#jordravDetails').textContent(),/ikke umiddelbart jagtbart/i);
  report.checks.push('Deep-point link restores registered intervals and inaccessible status, independently of surface trace');
  await restored.evaluate(hash=>{location.hash=hash;},encodeView({...saved,feature:null,point:'unlisted-point'}));
  await restored.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('findes ikke her'));
  assert.equal(await restored.evaluate(()=>window.__viewHarness.selectedDeepLayer),null);
  await restored.evaluate(()=>{location.hash='#v=2&map=57,10,13';});
  await restored.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('kunne ikke læses'));
  report.checks.push('Unknown deep point and malformed version are rejected visibly without stale detail content');
  await restored.evaluate(hashes=>{const map=window.__viewHarness.map;map.setView([56,9],12);location.hash=hashes[0];location.hash=hashes[1];},[
    encodeView({...saved,latitude:55.5,longitude:11,feature:null}),encodeView(saved)]);
  await restored.waitForFunction(ref=>window.__viewHarness.featureReference(window.__viewHarness.selectedFeature)===ref,reference,{timeout:90000});
  assert.equal(await restored.locator('#jordravTrace').inputValue(),'coastal');
  const finalCenter=await restored.evaluate(()=>window.__viewHarness.map.getCenter());assert.ok(Math.abs(finalCenter.lat-saved.latitude)<1e-6);
  report.checks.push('Rapid link navigation during map movement honours the latest view and selection');
  await restored.setViewportSize({width:390,height:844});await restored.evaluate(()=>{window.__viewHarness.map.invalidateSize();});
  assert.ok(await restored.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await restored.locator('#jordravCopyView').scrollIntoViewIfNeeded();await restored.screenshot({path:artifact('mobile.png')});
  await (await jordravControl(restored,'#jordravTrace')).selectOption('covered');
  assert.ok(await restored.evaluate(()=>{const s=document.getElementById('jordravTrace').getBoundingClientRect(),c=document.querySelector('.jordrav-map-column').getBoundingClientRect();return s.left>=c.left&&s.right<=c.right;}));
  await restored.locator('#jordravTrace').scrollIntoViewIfNeeded();await restored.screenshot({path:artifact('mobile-controls.png')});
  for(const lang of ['de','en']){
    await Promise.all([restored.waitForEvent('load'),restored.locator(`[data-language="${lang}"]`).click()]);await ready(restored);
    await restored.waitForFunction(ref=>window.__viewHarness.featureReference(window.__viewHarness.selectedFeature)===ref,reference,{timeout:90000});
    assert.match(await restored.locator('#jordravCopyView').textContent(),lang==='de'?/Link kopieren/:/Copy link/);
    assert.ok(!(await restored.locator('body').textContent()).includes('jordrav.'));
    await jordravControl(restored,'#jordravTrace');
    assert.ok(await restored.evaluate(()=>{const s=document.getElementById('jordravTrace').getBoundingClientRect(),c=document.querySelector('.jordrav-map-column').getBoundingClientRect();return s.left>=c.left&&s.right<=c.right;}));
  }
  report.checks.push('390px mobile emulation and German/English navigation preserve saved selection and translate new controls');
  const denied=await browser.newContext(),manual=await denied.newPage();
  await manual.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('Clipboard denied'))}});});
  manual.on('pageerror',e=>report.errors.push(e.message));
  await manual.goto(savedURL);await ready(manual);await manual.locator('#jordravCopyView').click();
  await manual.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('manuelt'));
  assert.ok(await manual.locator('#jordravViewLink').isVisible());
  assert.ok(await manual.evaluate(()=>{const i=document.getElementById('jordravViewLink');return i.readOnly&&i.selectionStart===0&&i.selectionEnd===i.value.length;}));
  await manual.waitForFunction(ref=>window.__viewHarness.featureReference(window.__viewHarness.selectedFeature)===ref,reference,{timeout:90000});
  await manual.evaluate(()=>{window.__viewHarness.map.setView([56,10],6,{animate:false,reset:true});});
  await manual.locator('#jordravCopyView').click();
  await manual.waitForFunction(()=>document.getElementById('jordravLinkStatus').textContent.includes('ikke med'));
  assert.equal(parseView(new URL(await manual.locator('#jordravViewLink').inputValue()).hash).state.feature,null);
  report.checks.push('Clipboard denial leaves a selected readonly URL for manual copying without a page error');
  assert.ok(![...requests,...restoredRequests].some(u=>/supabase|dmi\.dk|update-weather|GetFeatureInfo|GetFeature[^s]/i.test(u)));
  assert.deepEqual(report.errors,[]);report.status='PASS';
  report.checks.push('No weather, account, GPS or field-attribute service is introduced; no browser page errors');
  await denied.close();await restoredContext.close();await context.close();
}catch(error){report.status='FAIL';report.errors.push(error.stack);throw error;}
finally{
  await fs.writeFile(artifact('browser-audit.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({status:report.status,checks:report.checks,errors:report.errors}));
}
