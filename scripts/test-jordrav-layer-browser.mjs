import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { layerAccessPlan } from '../js/jordrav/layer-access.js';
import { parseView } from '../js/jordrav/view-state.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=path.resolve('docs/research/jordrav');
const diagnostic=JSON.parse(await fs.readFile(path.join(output,'national-layer-access-2026-10-05.json')));
const prefix=process.env.RAVRADAR_JORDRAV_LAYER_PREFIX||'layer-access-2026-10-05';
assert.match(prefix,/^[\w-]+$/);
const artifact=name=>path.join(output,`${prefix}-${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,'')||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{
    let bytes=await fs.readFile(path.resolve(relative));
    if(relative==='js/jordrav/map.js')bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__layerHarness={get map(){return map},get data(){return data},get details(){return details},get selected(){return selected},get selectedFeature(){return selectedFeature},get selectedDeepLayer(){return selectedDeepLayer},featureReference};')]);
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={scope:'Actual local Chrome clicks on SHA-bound national fragments and 390px emulation; no field observation or production claim',dataset:diagnostic.manifestSha256,checks:[],errors:[]};
const ready=page=>page.waitForFunction(()=>window.__layerHarness?.data,null,{timeout:90000});
async function clickExample(page,example){
  await page.evaluate(b=>{window.__layerHarness.map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{maxZoom:13,animate:false});},example.bbox);
  await page.waitForFunction(o=>window.__layerHarness.details?.getLayers().some(l=>l.feature.properties.o===o),example.origin,{timeout:90000});
  const pixel=await page.evaluate(origin=>{
    const {map,details}=window.__layerHarness;
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
  await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const box=await page.locator('#jordravMap').boundingBox();
  await page.mouse.click(box.x+pixel.x,box.y+pixel.y);
  await page.waitForFunction(o=>window.__layerHarness.selectedFeature?.properties.o===o,example.origin);
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(address);await ready(page);
  for(const kind of Object.keys(diagnostic.kinds)){
    const e=diagnostic.examples[kind];await clickExample(page,e);
    const section=page.locator('.jordrav-layer-access'),plan=layerAccessPlan(e.entry);
    assert.equal(await section.getAttribute('data-kind'),kind);
    assert.equal(await section.locator('ol>li').count(),plan.steps.length);
    const text=await section.textContent();assert.ok(!text.includes('undefined')&&!text.includes('jordrav.'));
    assert.match(text,new RegExp(e.entry.surface.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.match(await page.locator('.jordrav-access-badge').textContent(),/Jagtbarhed uafklaret/);
    assert.match(await section.locator('a').last().getAttribute('href'),/GEUS-R_2025_32_web\.pdf#page=4$/);
    if(kind==='variant'){
      const main=page.locator('#jordravDetails>dl>dd');
      assert.match(await main.nth(1).textContent(),/underkode uafklaret/);
      assert.match(await main.nth(2).textContent(),/underkode uafklaret/);
    }
    report.checks.push(`Real ${kind} polygon click preserves unknown huntability and renders its layer-specific investigation steps`);
  }
  const peat=diagnostic.examples['organic-below-mineral'];await clickExample(page,peat);
  let text=await page.locator('.jordrav-layer-access').textContent();
  assert.match(text,/FT · Tørv og gytje/);assert.match(text,/øvre materiales egen ravmulighed/);
  assert.match(text,/Regn kan rense rav/);
  assert.match(await page.locator('#jordravDetails>dl>dd').nth(2).textContent(),/Tørv og gytje \(FT\)/);
  await page.locator('.jordrav-layer-access').screenshot({path:artifact('buried-organic.png')});
  report.checks.push('Real ES/FT record shows peat beneath wind-blown sand, while each layer retains its own supply hypothesis');
  await page.locator('#jordravCopyView').click();
  const url=await page.locator('#jordravViewLink').inputValue(),state=parseView(new URL(url).hash).state;
  assert.ok(state.feature);
  const restored=await context.newPage();await restored.goto(url);await ready(restored);
  await restored.waitForFunction(()=>window.__layerHarness.selectedFeature);
  assert.equal(await restored.evaluate(()=>window.__layerHarness.featureReference(window.__layerHarness.selectedFeature)),state.feature);
  assert.equal(await restored.locator('.jordrav-layer-access').textContent(),text);
  report.checks.push('Saved fragment link restores the exact layer investigation plan in a new tab');await restored.close();
  await page.locator('[data-base="aerial"]').click();
  assert.equal(await page.locator('.jordrav-layer-access').textContent(),text);
  await page.locator('#jordravTrace').selectOption('coastal');
  assert.equal(await page.locator('.jordrav-layer-access').textContent(),text);
  assert.equal(await page.locator('#jordravSelectionNote').isVisible(),true);
  report.checks.push('Layer plan survives aerial switch and a filter that explicitly hides the selected cover polygon');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__layerHarness.map.invalidateSize();});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-layer-access').screenshot({path:artifact('mobile.png')});
  report.checks.push('Layer materials and ordered steps fit a 390px viewport without horizontal overflow');
  for(const lang of ['de','en']){
    await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${lang}"]`).click()]);await ready(page);
    await page.locator('#jordravTrace').selectOption('all');
    await clickExample(page,peat);
    text=await page.locator('.jordrav-layer-access').textContent();
    assert.match(text,lang==='de'?/Torf und Gyttja/:/Peat and gyttja/);
    assert.match(text,lang==='de'?/Schichtkontakt/:/layer contact/);
    assert.ok(!text.includes('jordrav.')&&!text.includes('undefined'));
  }
  report.checks.push('German and English mobile views translate the actual layer materials and investigation plan');
  await page.locator('#jordravTrace').selectOption('all');
  await page.evaluate(()=>{window.__layerHarness.map.setView([56.2,10.5],6,{animate:false});});
  await page.locator('.jordrav-deep-marker').first().click();
  await page.waitForFunction(()=>window.__layerHarness.selectedDeepLayer);
  assert.equal(await page.locator('.jordrav-layer-access').count(),0);
  assert.match(await page.locator('.jordrav-access-badge').textContent(),/not readily huntable/);
  report.checks.push('Deep borehole selection replaces the surface plan and retains its inaccessible depth record');
  assert.deepEqual(report.errors,[]);report.status='PASS';await context.close();
}catch(error){
  report.status='FAIL';report.errors.push(error.stack);
  const page=browser.contexts()[0]?.pages()[0];
  if(page){report.lastState=await page.evaluate(()=>({zoom:window.__layerHarness?.map.getZoom(),selected:window.__layerHarness?.selectedFeature?.properties.o,kind:document.querySelector('.jordrav-layer-access')?.dataset.kind})).catch(()=>null);await page.screenshot({path:artifact('failure.png')});}
  throw error;
}finally{
  await fs.writeFile(artifact('browser-audit.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({status:report.status,checks:report.checks,errors:report.errors}));
}
