import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const output=path.resolve('docs/research/jordrav');
const diagnostic=JSON.parse(await fs.readFile(path.join(output,'national-search-context-2026-10-05.json')));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const url=new URL(request.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{
    let bytes=await fs.readFile(path.resolve(relative));
    if(relative==='js/jordrav/map.js')bytes=Buffer.concat([bytes,Buffer.from('\nwindow.__searchHarness={get map(){return map},get data(){return data},get details(){return details},get selected(){return selected},get selectedFeature(){return selectedFeature}};')]);
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={scope:'Local UI with live national SGAV raster service; no production or physical-mobile claim',checks:[],errors:[],fieldResponses:[]};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const requests=[];
  page.on('request',request=>requests.push(request.url()));
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith('https://geodata.fvm.dk/'))report.fieldResponses.push({status:response.status(),contentType:response.headers()['content-type']});});
  await page.goto(address);
  await page.waitForFunction(()=>window.__searchHarness?.data,null,{timeout:90000});
  assert.ok(!requests.some(url=>url.startsWith('https://geodata.fvm.dk/')));
  await page.locator('#jordravFields').check();
  assert.match(await page.locator('#jordravFieldsStatus').textContent(),/Zoom til niveau 12/);
  assert.ok(!requests.some(url=>url.startsWith('https://geodata.fvm.dk/')));
  report.checks.push('Field overlay is opt-in and requests no nationwide raster at overview zoom');
  await page.evaluate(()=>{window.__searchHarness.map.setView([57.167,10.433],13,{animate:false});});
  await page.waitForFunction(()=>{
    const tiles=[...document.querySelectorAll('.leaflet-jordrav-fields-pane img')];
    return tiles.length>0&&tiles.every(tile=>tile.complete&&tile.naturalWidth===256);
  },null,{timeout:90000});
  assert.match(await page.locator('#jordravFieldsStatus').textContent(),/Sort\/hvide linjer/);
  const fieldRequests=requests.filter(url=>url.startsWith('https://geodata.fvm.dk/'));
  assert.ok(fieldRequests.length>0);
  for(const url of fieldRequests){
    const params=new URL(url).searchParams;
    assert.equal(params.get('request'),'GetMap');assert.equal(params.get('layers'),'Marker:Marker_2026');
    assert.equal(params.get('srs'),'EPSG:3857');assert.ok(params.get('sld_body').includes('<Stroke>'));
    assert.ok(!params.get('sld_body').includes('<Fill>'));
  }
  await page.locator('#jordravMap').screenshot({path:path.join(output,'search-context-fields-2026.png')});
  report.checks.push('Live Asaa field tiles are transparent fixed-year outlines in EPSG:3857');
  const before=await page.evaluate(()=>({center:window.__searchHarness.map.getCenter(),zoom:window.__searchHarness.map.getZoom()}));
  await page.locator('[data-base="aerial"]').click();
  await page.waitForFunction(()=>{
    const bounds=document.getElementById('jordravMap').getBoundingClientRect();
    const tiles=[...document.querySelectorAll('.leaflet-tile-pane img')].filter(tile=>{
      const r=tile.getBoundingClientRect();return tile.src.includes('World_Imagery')&&r.right>bounds.left&&r.left<bounds.right&&r.bottom>bounds.top&&r.top<bounds.bottom;
    });
    return tiles.length>0&&tiles.every(tile=>tile.complete&&tile.naturalWidth===256&&Number(getComputedStyle(tile).opacity)>=.95);
  },null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>({center:window.__searchHarness.map.getCenter(),zoom:window.__searchHarness.map.getZoom()})),before);
  assert.ok(await page.locator('.leaflet-jordrav-fields-pane img').count()>0);
  await page.locator('#jordravMap').screenshot({path:path.join(output,'search-context-fields-aerial.png')});
  report.checks.push('Field boundaries remain on aerial background without moving the map');
  await page.locator('#jordravFields').uncheck();
  assert.equal(await page.locator('.leaflet-jordrav-fields-pane img').count(),0);

  async function clickExample(example){
    const bbox=example.bbox;
    await page.evaluate(b=>{window.__searchHarness.map.fitBounds([[b[1],b[0]],[b[3],b[2]]],{maxZoom:13,animate:false});},bbox);
    await page.waitForFunction(origin=>window.__searchHarness.details?.getLayers().some(layer=>layer.feature.properties.o===origin),example.origin,{timeout:90000});
    const pixel=await page.evaluate(origin=>{
      const {map,details}=window.__searchHarness;
      function inside(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [x,y]=ring[i],[xx,yy]=ring[j];if((y>p[1])!==(yy>p[1])&&p[0]<(xx-x)*(p[1]-y)/(yy-y)+x)yes=!yes;}return yes;}
      for(const layer of details.getLayers().filter(layer=>layer.feature.properties.o===origin)){
        const bounds=layer.getBounds(),size=map.getSize(),geometry=layer.feature.geometry;
        const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
        for(let row=1;row<30;row++)for(let column=1;column<30;column++){
          const lat=bounds.getSouth()+(bounds.getNorth()-bounds.getSouth())*row/30,lng=bounds.getWest()+(bounds.getEast()-bounds.getWest())*column/30;
          const point=map.latLngToContainerPoint([lat,lng]);
          if(point.x<15||point.y<15||point.x>size.x-15||point.y>size.y-35||(point.x<70&&point.y<100))continue;
          if([[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>{const p=map.containerPointToLatLng([point.x+dx,point.y+dy]);return polygons.some(rings=>inside([p.lng,p.lat],rings[0])&&!rings.slice(1).some(ring=>inside([p.lng,p.lat],ring)));}))return{x:point.x,y:point.y};
        }
      }throw Error('No safe interior point');
    },example.origin);
    await page.locator('#jordravMap').scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const rectangle=await page.locator('#jordravMap').boundingBox();
    report.lastClick={expectedOrigin:example.origin,pixel,rectangle,element:await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.outerHTML.slice(0,250),{x:rectangle.x+pixel.x,y:rectangle.y+pixel.y})};
    await page.mouse.click(rectangle.x+pixel.x,rectangle.y+pixel.y);
    await page.waitForFunction(origin=>window.__searchHarness.selectedFeature?.properties.o===origin,example.origin);
  }
  await clickExample(diagnostic.materialExamples.marineOrganic);
  let text=await page.locator('.jordrav-search-context').textContent();
  assert.match(text,/Tørv og gytje/);assert.match(text,/Silt og ler/);
  assert.match(text,/side om side/);assert.match(text,/Ingen laggrænse/);
  assert.match(await page.locator('.jordrav-badge').first().textContent(),/Marine aflejringer/);
  await page.locator('.jordrav-search-context').screenshot({path:path.join(output,'search-context-marine-organic.png')});
  report.checks.push('Real mixed marine organic/clay click distinguishes peat from sand and lateral mixture from vertical cover');
  await clickExample(diagnostic.materialExamples.lateralMixture);
  text=await page.locator('.jordrav-search-context').textContent();
  assert.match(text,/Sand og grus/);assert.match(text,/side om side/);
  const selected=await page.evaluate(()=>window.__searchHarness.selectedFeature.properties.o);
  await page.locator('#jordravFields').check();
  assert.equal(await page.evaluate(()=>window.__searchHarness.selectedFeature.properties.o),selected);
  assert.ok(await page.evaluate(()=>Number(window.__searchHarness.map.getPane('jordrav-selection').style.zIndex)>Number(window.__searchHarness.map.getPane('jordrav-fields').style.zIndex)));
  report.checks.push('Same-family sand/gravel mixture retains mixture explanation; field toggle preserves selection');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__searchHarness.map.invalidateSize();});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-search-context').screenshot({path:path.join(output,'search-context-mobile.png')});
  report.checks.push('390px mobile layout includes search guidance and field controls without horizontal overflow');
  for(const lang of ['de','en']){
    await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${lang}"]`).click()]);
    await page.waitForFunction(()=>window.__searchHarness?.data,null,{timeout:90000});
    await clickExample(diagnostic.materialExamples.marineOrganic);
    text=await page.locator('.jordrav-search-context').textContent();
    assert.match(text,lang==='de'?/Torf und Gyttja/:/Peat and gyttja/);
    assert.ok(!text.includes('jordrav.')&&!text.includes('undefined'));
  }
  report.checks.push('German and English physical search guidance uses translated material and layer descriptions');
  const failure=await browser.newContext(),failurePage=await failure.newPage();
  await failurePage.route('https://geodata.fvm.dk/**',route=>route.abort());
  await failurePage.goto(address);await failurePage.waitForFunction(()=>window.__searchHarness?.data,null,{timeout:90000});
  await failurePage.locator('#jordravFields').check();
  await failurePage.evaluate(()=>{window.__searchHarness.map.setView([57.167,10.433],13,{animate:false});});
  await failurePage.waitForFunction(()=>document.getElementById('jordravFieldsStatus').classList.contains('jordrav-error'),null,{timeout:45000});
  assert.match(await failurePage.locator('#jordravFieldsStatus').textContent(),/Manglende linjer/);
  assert.ok(await failurePage.evaluate(()=>Boolean(window.__searchHarness.data)));
  report.checks.push('A failed field service leaves geology usable and explicitly distinguishes missing data from missing fields');
  await failure.close();assert.deepEqual(report.errors,[]);
  assert.ok(report.fieldResponses.some(r=>r.status===200&&r.contentType.startsWith('image/png')));
  report.status='PASS';await context.close();
}catch(error){
  report.status='FAIL';report.errors.push(error.stack);
  const page=browser.contexts()[0]?.pages()[0];
  if(page){report.lastState=await page.evaluate(()=>({lang:document.documentElement.lang,zoom:window.__searchHarness?.map.getZoom(),selected:window.__searchHarness?.selectedFeature?.properties.o,detailText:document.getElementById('jordravDetails')?.textContent.slice(0,400)})).catch(()=>null);await page.screenshot({path:path.join(output,'search-context-failure.png')});}
  throw error;
}
finally{
  await fs.writeFile(path.join(output,'search-context-browser-2026-10-05.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({status:report.status,checks:report.checks,fieldResponses:report.fieldResponses.length,errors:report.errors}));
}
