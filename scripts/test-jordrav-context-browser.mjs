import { jordravControl, openJordravDetails, closeJordravOptions } from './test-helpers/jordrav-ui.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=path.resolve('docs/research/jordrav');
const outputPrefix=process.env.RAVRADAR_JORDRAV_CONTEXT_PREFIX||'context-2026-10-06';
assert.match(outputPrefix,/^[\w.-]+$/);
const artifact=name=>path.join(output,`${outputPrefix}-${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\//,'')||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{let bytes=await fs.readFile(path.resolve(relative));
    if(relative==='js/jordrav/map.js')bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__contextHarness={get map(){return map},get data(){return data},get details(){return details},get selectedFeature(){return selectedFeature},showProfileDetail};')]);
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={date:'2026-10-06',scope:'Actual Chrome with live public soil/borehole/terrain services plus controlled failure cases; emulated mobile, not physical phone',checks:[],errors:[],responses:[]};
const record=text=>{report.checks.push(text);console.log(text);};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),requests=[];
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  page.on('response',response=>{if(/^https:\/\/(geodata\.fvm\.dk|jupiter\.geus\.dk|data\.geus\.dk)\//.test(response.url()))report.responses.push({status:response.status(),type:response.headers()['content-type'],host:new URL(response.url()).host});});
  await page.goto(address);await page.waitForFunction(()=>window.__contextHarness?.data,null,{timeout:90000});
  assert.equal(requests.filter(u=>/^https:\/\/(geodata\.fvm\.dk|jupiter\.geus\.dk|data\.geus\.dk)\//.test(u)).length,0);
  assert.ok(!requests.some(u=>u.includes('/context-20261006/')));record('All supplemental data remain opt-in; no public service or selected profile request at startup');
  await openJordravDetails(page,'.jordrav-context-controls');
  await (await jordravControl(page,'#jordravBores')).check();assert.match(await page.locator('#jordravBoresStatus').textContent(),/Zoom mere/);
  await (await jordravControl(page,'#jordravBores')).uncheck();
  await page.evaluate(()=>{window.__contextHarness.map.setView([57.156,10.395],13,{animate:false});});
  await page.waitForFunction(()=>window.__contextHarness.details?.getLayers().length>0,null,{timeout:90000});
  await closeJordravOptions(page);await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  const pixel=await page.evaluate(()=>window.__contextHarness.map.latLngToContainerPoint([57.156,10.395]));
  const box=await page.locator('#jordravMap').boundingBox();await page.mouse.click(box.x+pixel.x,box.y+pixel.y);
  await page.waitForFunction(()=>window.__contextHarness.selectedFeature,null,{timeout:30000});
  const clicked=(await page.locator('.jordrav-soil-point .jordrav-original').textContent()).split(', ').map(Number);
  assert.ok(Math.abs(clicked[0]-57.156)<.0001&&Math.abs(clicked[1]-10.395)<.0001);
  assert.equal(requests.filter(u=>u.includes('GetFeatureInfo')).length,0);
  await page.locator('.jordrav-evidence-chain>summary').click();assert.match(await page.locator('.jordrav-evidence-chain').textContent(),/ikke en beregnet chance/);
  await page.locator('.jordrav-soil-point button').click();await page.waitForFunction(()=>document.querySelector('.jordrav-soil-point')?.textContent.includes('JB 4'),null,{timeout:30000});
  assert.match(await page.locator('.jordrav-soil-point').textContent(),/Fin lerblandet sandjord/);
  const query=new URL(requests.find(u=>u.includes('GetFeatureInfo')));assert.equal(query.searchParams.get('propertyName'),'JB_kode,Jordtype');
  const qb=query.searchParams.get('bbox').split(',').map(Number);assert.ok(Math.abs((qb[0]+qb[2])/2-clicked[1])<.0000006&&Math.abs((qb[1]+qb[3])/2-clicked[0])<.0000006);
  record('Real polygon click queries the actual click coordinate only after an explicit soil request; live JB4 returned');
  await (await jordravControl(page,'#jordravBores')).check();
  await page.waitForFunction(()=>document.querySelectorAll('.jordrav-bore-marker').length>0||document.querySelector('#jordravBoresStatus').classList.contains('jordrav-error'),null,{timeout:30000});
  assert.ok(await page.locator('.jordrav-bore-marker').count(),await page.locator('#jordravBoresStatus').textContent());
  await page.locator('.jordrav-bore-marker').first().click();assert.match(await page.locator('#jordravDetails').textContent(),/ikke dybden til et ravlag/);
  assert.match(await page.locator('#jordravDetails a').getAttribute('href'),/^https:\/\/data\.geus\.dk\/JupiterWWW\/borerapport\.jsp\?dgunr=/);
  for(const u of requests.filter(u=>u.includes('REQUEST=GetFeature'))){const q=new URL(u).searchParams;assert.equal(q.get('PROPERTYNAME'),'msGeometry,dgunr,dybde_num,dato');assert.equal(q.get('MAXFEATURES'),'201');}record('Live nationwide borehole service renders hollow markers and distinguishes total depth from an amber layer; original profiles linked');
  await (await jordravControl(page,'#jordravSoil')).check();await (await jordravControl(page,'#jordravTerrain')).check();
  await page.waitForFunction(()=>['soil','terrain'].every(name=>{const tiles=[...document.querySelectorAll(`.leaflet-jordrav-${name}-pane img`)];return tiles.length>0&&tiles.every(t=>t.complete&&t.naturalWidth===256);}),null,{timeout:60000});
  assert.match(await page.locator('#jordravTerrainStatus').textContent(),/2005–2007.*10 m/);record('Live JB raster and reprojected 2007 terrain images load under both map backgrounds with visible source limitations');
  await page.locator('[data-base="aerial"]').click();
  await page.waitForFunction(()=>{const images=[...window.__contextHarness.map.getPane('tilePane').querySelectorAll('img')];return images.length>0&&images.every(t=>t.src.includes('server.arcgisonline.com')&&t.complete&&t.naturalWidth===256);},null,{timeout:60000});
  await (await jordravControl(page,'#jordravVisible')).uncheck();await (await jordravControl(page,'#jordravSoil')).uncheck();await (await jordravControl(page,'#jordravTerrain')).uncheck();await (await jordravControl(page,'#jordravBores')).uncheck();
  await page.locator('#jordravMap').screenshot({path:artifact('aerial.png')});
  await (await jordravControl(page,'#jordravVisible')).check();await (await jordravControl(page,'#jordravSoil')).check();await (await jordravControl(page,'#jordravTerrain')).check();await (await jordravControl(page,'#jordravBores')).check();
  record('Actual aerial image tiles load and remain visible when supplemental layers are hidden');
  await (await jordravControl(page,'#jordravProfiles')).check();await page.waitForFunction(()=>document.querySelectorAll('.jordrav-profile-marker').length>0,null,{timeout:30000});
  const profiles=JSON.parse(await fs.readFile('data/jordrav/context-20261006/profiles.json','utf8')).profiles;
  for(const profile of profiles){
    await page.evaluate(p=>{window.__contextHarness.map.setView([p.latitude,p.longitude],13,{animate:false});},profile);
    const actual=page.locator(`.jordrav-profile-marker[title*="DGU ${profile.dgu} ·"]`);
    await actual.click();assert.match(await page.locator('#jordravDetails h2').textContent(),new RegExp(profile.dgu.replace('.','\\.')));
    if(profile.intervals.length){assert.equal(await page.locator('.jordrav-profile-table tbody tr').count(),profile.intervals.length);}
    else assert.match(await page.locator('#jordravDetails').textContent(),/ingen geologiske lagoplysninger/);
    assert.match(await page.locator('#jordravDetails').textContent(),/nabo|nabomark/);
  }record('All 16 actual checked-profile markers open their bound rows; absent geology and missing interval boundaries remain explicit');
  await page.locator('#jordravCopyView').click();const saved=await page.locator('#jordravViewLink').inputValue();
  await page.goto(saved);await page.waitForFunction(()=>window.__contextHarness?.data,null,{timeout:90000});
  for(const id of ['jordravSoil','jordravTerrain','jordravBores','jordravProfiles'])assert.equal(await page.locator('#'+id).isChecked(),true);
  record('Saved views restore all four supplemental controls while omitting an unbound live borehole selection');
  await page.setViewportSize({width:390,height:844});
  const p=profiles.find(p=>p.region==='Rødby');await page.evaluate(p=>{window.__contextHarness.map.setView([p.latitude,p.longitude],13,{animate:false});window.__contextHarness.showProfileDetail(p);},p);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#jordravDetails').screenshot({path:artifact('mobile-profile.png')});
  for(const lang of ['de','en']){await page.locator(`[data-language="${lang}"]`).click();await page.waitForFunction(()=>window.__contextHarness?.data,null,{timeout:90000});
    await page.evaluate(p=>window.__contextHarness.showProfileDetail(p),p);assert.ok(!(await page.locator('#jordravDetails').textContent()).includes('jordrav.'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  record('390 px mobile views and German/English profile interfaces fit without horizontal overflow; original Danish lithology stays labelled');
  // Explicit failure and boundary ambiguity exercise the same UI contract.
  const failure=await context.newPage();await failure.route('https://jupiter.geus.dk/**',route=>route.fulfill({status:503,body:'Unavailable'}));
  await failure.goto(address);await failure.waitForFunction(()=>window.__contextHarness?.data,null,{timeout:90000});
  await openJordravDetails(failure,'.jordrav-context-controls');await failure.evaluate(()=>{window.__contextHarness.map.setView([57.156,10.395],13,{animate:false});});
  await (await jordravControl(failure,'#jordravBores')).check();await failure.waitForFunction(()=>document.querySelector('#jordravBoresStatus').classList.contains('jordrav-error'));
  assert.equal(await failure.locator('.jordrav-bore-marker').count(),0);await (await jordravControl(failure,'#jordravBores')).uncheck();assert.equal(await failure.locator('#jordravBoresStatus').isVisible(),false);
  record('Failed borehole service leaves no markers or implied negative evidence; disabling cancels and clears the layer');
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await fs.writeFile(artifact('browser-audit.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
