import { jordravControl, openJordravDetails, closeJordravOptions } from './test-helpers/jordrav-ui.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseView } from '../js/jordrav/view-state.js';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=path.resolve('docs/research/jordrav');
const diagnostic=JSON.parse(await fs.readFile(path.join(output,'national-landscape-context-2026-10-05.json')));
const outputPrefix=process.env.RAVRADAR_JORDRAV_LANDSCAPE_PREFIX||'landscape-2026-10-05';
if(!/^[\w.-]+$/.test(outputPrefix))throw Error('Invalid landscape browser output prefix');
const artifact=name=>path.join(output,`${outputPrefix}-${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,'')||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{
    let bytes=await fs.readFile(path.resolve(relative));
    if(relative==='js/jordrav/map.js')bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__landscapeHarness={get map(){return map},get data(){return data},get details(){return details},get selectedFeature(){return selectedFeature},get selectedDeepLayer(){return selectedDeepLayer},featureReference};')]);
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={scope:'Actual Chrome polygon clicks for all 27 national route classes; no field or production observation',dataset:diagnostic.manifestSha256,checks:[],errors:[]};
const ready=page=>page.waitForFunction(()=>window.__landscapeHarness?.data,null,{timeout:90000});
async function clickExample(page,example){
  await page.evaluate(b=>{window.__landscapeHarness.map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{maxZoom:13,animate:false});},example.bbox);
  await page.waitForFunction(o=>window.__landscapeHarness.details?.getLayers().some(l=>l.feature.properties.o===o),example.origin,{timeout:90000});
  const pixel=await page.evaluate(origin=>{
    const {map,details}=window.__landscapeHarness;
    function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [x,y]=ring[i],[xx,yy]=ring[j];if((y>p[1])!==(yy>p[1])&&p[0]<(xx-x)*(p[1]-y)/(yy-y)+x)yes=!yes;}return yes;}
    for(const layer of details.getLayers().filter(l=>l.feature.properties.o===origin)){
      const bounds=layer.getBounds(),size=map.getSize(),g=layer.feature.geometry,polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;
      for(let row=1;row<30;row++)for(let column=1;column<30;column++){
        const p=map.latLngToContainerPoint([bounds.getSouth()+(bounds.getNorth()-bounds.getSouth())*row/30,bounds.getWest()+(bounds.getEast()-bounds.getWest())*column/30]);
        if(p.x<15||p.y<15||p.x>size.x-15||p.y>size.y-35||(p.x<70&&p.y<100))continue;
        if([[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>{const q=map.containerPointToLatLng([p.x+dx,p.y+dy]);return polygons.some(r=>inside([q.lng,q.lat],r[0])&&!r.slice(1).some(ring=>inside([q.lng,q.lat],ring)));}))return{x:p.x,y:p.y};
      }
    }throw Error('No safe interior point');
  },example.origin);
  await closeJordravOptions(page);await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const box=await page.locator('#jordravMap').boundingBox();await page.mouse.click(box.x+pixel.x,box.y+pixel.y);
  await page.waitForFunction(o=>window.__landscapeHarness.selectedFeature?.properties.o===o,example.origin);
}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(address);await ready(page);
  for(const route of Object.keys(diagnostic.routes)){
    const e=diagnostic.examples[`route:${route}`];await clickExample(page,e);
    const section=page.locator('.jordrav-landscape-context');
    assert.equal(await section.getAttribute('data-route'),route);
    assert.ok((await page.locator('.jordrav-geological-basis>dl>dd').nth(3).textContent()).includes(e.entry.landscape));
    assert.equal(await section.getAttribute('open'),null);await (await jordravControl(page,'.jordrav-landscape-context>summary')).click();
    assert.notEqual(await section.getAttribute('open'),null);
    const text=await section.textContent();assert.ok(!text.includes('undefined')&&!text.includes('jordrav.'));
    assert.match(await page.locator('.jordrav-access-badge').textContent(),/Jagtbarhed uafklaret/);
    report.checks.push(`Real ${route} polygon renders its specific source landform and investigative route; huntability stays unknown`);
  }
  for(const key of ['raisedPlain','raisedRidge']){
    const e=diagnostic.examples[`code50:${key}`];await clickExample(page,e);
    assert.equal(e.entry.landscapeCode,50);
    assert.ok((await page.locator('.jordrav-geological-basis>dl>dd').nth(3).textContent()).includes(e.entry.landscape));
    assert.equal(await page.locator('.jordrav-landscape-context').getAttribute('data-route'),e.context.route);
  }
  report.checks.push('Both original code-50 names remain distinct in actual clicks');
  const young=diagnostic.examples['chronology:younger-on-raised'];await clickExample(page,young);
  let section=page.locator('.jordrav-landscape-context');await (await jordravControl(page,'.jordrav-landscape-context>summary')).focus();await page.keyboard.press('Enter');
  assert.notEqual(await section.getAttribute('open'),null);
  let text=await section.textContent();assert.match(text,/Landformen er senglacial/);assert.match(text,/postglacial gruppe/);
  await section.screenshot({path:artifact('younger-cover.png')});
  report.checks.push('Actual raised-landform/younger-upper-material explanation opens by keyboard without claiming a local date');
  await page.locator('#jordravCopyView').click();
  const url=await page.locator('#jordravViewLink').inputValue(),state=parseView(new URL(url).hash).state;assert.ok(state.feature);
  const restored=await context.newPage();await restored.goto(url);await ready(restored);await restored.waitForFunction(()=>window.__landscapeHarness.selectedFeature);
  assert.equal(await restored.evaluate(()=>window.__landscapeHarness.featureReference(window.__landscapeHarness.selectedFeature)),state.feature);
  assert.equal(await restored.locator('.jordrav-landscape-context').textContent(),text);await restored.close();
  report.checks.push('Saved fragment link restores the exact landscape and chronology explanation');
  await page.locator('[data-base="aerial"]').click();
  assert.equal(await section.textContent(),text);
  const exclude=young.entry.potential==='coastal'?'basin':'coastal';await (await jordravControl(page,'#jordravTrace')).selectOption(exclude);
  assert.equal(await page.locator('#jordravSelectionNote').isVisible(),true);assert.equal(await section.textContent(),text);
  report.checks.push('Aerial and excluding geological filter preserve the selected landscape explanation with an explicit hidden-selection message');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{window.__landscapeHarness.map.invalidateSize();});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await section.screenshot({path:artifact('mobile.png')});
  report.checks.push('Expanded source landform/chronology explanation fits 390px without horizontal overflow');
  for(const lang of ['de','en']){
    await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${lang}"]`).click()]);await ready(page);
    await (await jordravControl(page,'#jordravTrace')).selectOption('all');await clickExample(page,young);
    section=page.locator('.jordrav-landscape-context');await (await jordravControl(page,'.jordrav-landscape-context>summary')).click();text=await section.textContent();
    assert.match(text,lang==='de'?/postglazialen Gruppe/:/postglacial group/);
    assert.match(await page.locator('.jordrav-geological-basis>dl>dd').nth(3).textContent(),lang==='de'?/spätglazial/:/Late Glacial/);
    assert.ok(!text.includes('jordrav.')&&!text.includes('undefined'));
  }
  report.checks.push('German and English translate the exact landform and the younger-deposit explanation in actual mobile views');
  await page.evaluate(()=>{window.__landscapeHarness.map.setView([56.2,10.5],6,{animate:false});});
  await closeJordravOptions(page);await page.locator('.jordrav-deep-marker').first().click();await page.waitForFunction(()=>window.__landscapeHarness.selectedDeepLayer);
  assert.equal(await page.locator('.jordrav-landscape-context').count(),0);assert.match(await page.locator('.jordrav-access-badge').textContent(),/not readily huntable/);
  report.checks.push('Deep record replaces all surface-landform guidance and preserves inaccessible depth');
  assert.deepEqual(report.errors,[]);report.status='PASS';await context.close();
}catch(error){report.status='FAIL';report.errors.push(error.stack);const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:artifact('failure.png')});throw error;
}finally{await fs.writeFile(artifact('browser-audit.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors}));}
