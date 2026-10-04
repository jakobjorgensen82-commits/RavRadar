// Local UI verification with real Leaflet and real generated public geology.
// A test-only module tail exposes existing instances for assertions; no test
// hooks, weather stubs or production services are added to the product.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = process.cwd();
const output = path.join(root, 'docs/research/jordrav');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.gz':'application/gzip'};
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url,'http://localhost');
  let relative = decodeURIComponent(url.pathname).replace(/^\//,'');
  if (!relative) relative='jordrav.html';
  if (!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)) {
    response.writeHead(404); response.end(); return;
  }
  try {
    let bytes = await fs.readFile(path.join(root,relative));
    if (relative === 'js/jordrav/map.js') bytes = Buffer.concat([bytes, Buffer.from('\nwindow.__jordravHarness={get map(){return map},get data(){return data},get overview(){return overview},get details(){return details},get selected(){return selected}};')]);
    response.writeHead(200, {'Content-Type':mime[path.extname(relative)] || 'application/octet-stream', 'Cache-Control':'no-store'}); response.end(bytes);
  } catch {response.writeHead(404);response.end();}
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser = await chromium.launch({headless:true, executablePath:process.env.RAVRADAR_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report = {scope:'Local generated public geology; desktop and mobile; no production verification', checks:[], errors:[], network:{street200:0,aerial200:0,aerialStatuses:{},failedAerial:[],geologyBytes:0}, timings:[]};
try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('requestfailed', request=>{if(request.url().includes('World_Imagery'))report.network.failedAerial.push(request.failure()?.errorText);});
  page.on('response', response => {
    if (response.status()===200 && response.url().includes('tile.openstreetmap.org/')) report.network.street200++;
    if (response.status()===200 && response.url().includes('World_Imagery/MapServer/tile/')) report.network.aerial200++;
    if(response.url().includes('World_Imagery/MapServer/tile/'))report.network.aerialStatuses[response.status()]=(report.network.aerialStatuses[response.status()]||0)+1;
  });
  let start=performance.now();
  await page.goto(address);
  await page.waitForFunction(() => window.__jordravHarness?.data && document.getElementById('jordravStatus').textContent.startsWith('Generaliseret'),null,{timeout:90000});
  report.timings.push({stage:'coldNationalOverviewMs',value:Math.round(performance.now()-start)});
  const nationalBytes=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/data/jordrav/')).reduce((sum,entry)=>sum+entry.encodedBodySize,0));
  report.timings.at(-1).geologyEncodedBytes=nationalBytes;
  assert.equal(requests.filter(url=>/tile-\d+-\d+\.geojson/.test(url)).length,0);
  assert.ok(!requests.some(url=>/supabase|dmi\.dk|data\/live|weather/i.test(url)));
  report.checks.push('National overview loads without local tiles, weather or Supabase');
  await page.screenshot({path:path.join(output,'prototype-desktop.png'),fullPage:true});
  const overviewCount=await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length);
  await page.locator('#jordravFocus').check();
  assert.ok(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length>0 &&
    window.__jordravHarness.overview.getLayers().every(layer=>layer.feature.properties.potential==='enhanced')));
  assert.ok(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length)<overviewCount);
  assert.equal(requests.filter(url=>/tile-\d+-\d+\.geojson/.test(url)).length,0);
  await page.locator('#jordravFocus').uncheck();
  assert.equal(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length),overviewCount);
  report.checks.push('National focus hides other classes and restores them without loading detail data');
  await page.locator('.jordrav-regions summary').click();
  for (const region of ['rubjerg','northeast-zealand','stenstrup','varde','vendsyssel-marine']) {
    await page.locator('#jordravRegion').selectOption(region);
    assert.ok((await page.locator('#jordravRegionalExplanation h2').textContent()).trim());
    assert.equal(await page.locator('.jordrav-region-grid h3').count(),4);
    assert.ok(await page.locator('#jordravRegionalExplanation a').count()>0);
    if(region==='rubjerg')await page.locator('.jordrav-regions').screenshot({path:path.join(output,'prototype-regional-guide.png')});
    if(region==='northeast-zealand')await page.evaluate(()=>{const map=window.__jordravHarness.map;map.setView(map.getCenter(),map.getZoom()+1,{animate:true});});
    await page.locator('#jordravRegionGo').click();
    await page.waitForFunction(id=>{
      const center=window.__jordravHarness.map.getCenter();
      const bounds={rubjerg:[57.40,9.68,57.52,10.02],'northeast-zealand':[55.86,12.12,56.12,12.48],stenstrup:[55.04,10.44,55.20,10.70],varde:[55.49,8.30,55.77,8.73],'vendsyssel-marine':[57.36,10.15,57.71,10.58]}[id];
      return center.lat>=bounds[0] && center.lng>=bounds[1] && center.lat<=bounds[2] && center.lng<=bounds[3];
    },region);
  }
  assert.equal(await page.evaluate(()=>window.__jordravHarness.data.overview.features.length),overviewCount);
  report.checks.push('Five regional explanations render sources and navigate without changing source overview');
  await page.locator('.jordrav-regions summary').click();
  const bytesBeforeLocal=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/data/jordrav/')).reduce((sum,entry)=>sum+entry.encodedBodySize,0));
  start=performance.now();
  await page.evaluate(()=>{window.__jordravHarness.map.setView([56.14,8.76],11);});
  await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer'),null,{timeout:90000});
  await page.waitForFunction(()=>window.__jordravHarness.details?.getLayers().some(layer=>
    window.__jordravHarness.map.getBounds().contains(layer.getBounds().getCenter())),null,{timeout:90000});
  report.timings.push({stage:'localDetailAfterRegionalNavigationMs',value:Math.round(performance.now()-start)});
  report.network.geologyBytes=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/data/jordrav/')).reduce((sum,entry)=>sum+entry.encodedBodySize,0));
  report.timings.at(-1).geologyEncodedBytes=report.network.geologyBytes-bytesBeforeLocal;
  await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  const location = await page.evaluate(()=> {
    const {map,details,data}=window.__jordravHarness;
    function insideRing(p,ring) {
      let inside=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
        const [x,y]=ring[i], [xx,yy]=ring[j];
        if((y>p[1])!==(yy>p[1]) && p[0]<(xx-x)*(p[1]-y)/(yy-y)+x) inside=!inside;
      }
      return inside;
    }
    for(const layer of details.getLayers()) {
      if(data.catalog[layer.feature.properties.i].potential!=='enhanced')continue;
      const center=layer.getBounds().getCenter();
      if(!map.getBounds().contains(center))continue;
      const geometry=layer.feature.geometry;
      const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
      if(!polys.some(rings=>insideRing([center.lng,center.lat],rings[0]) && !rings.slice(1).some(ring=>insideRing([center.lng,center.lat],ring))))continue;
      const pixel=map.latLngToContainerPoint(center), size=map.getSize();
      if(pixel.x<25||pixel.y<25||pixel.x>size.x-25||pixel.y>size.y-25)continue;
      const safelyInside=[[0,0],[3,0],[-3,0],[0,3],[0,-3]].every(([dx,dy])=>{
        const p=map.containerPointToLatLng([pixel.x+dx,pixel.y+dy]);
        return polys.some(rings=>insideRing([p.lng,p.lat],rings[0])&&!rings.slice(1).some(ring=>insideRing([p.lng,p.lat],ring)));
      });
      if(!safelyInside)continue;
      return {x:pixel.x,y:pixel.y};
    }
    throw new Error('No interior click target');
  });
  const box = await page.locator('#jordravMap').boundingBox();
  await page.mouse.click(box.x+location.x,box.y+location.y);
  await page.waitForFunction(()=>Boolean(window.__jordravHarness.selected));
  const before = await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()), text:document.getElementById('jordravDetails').textContent}));
  const localCount=await page.evaluate(()=>window.__jordravHarness.details.getLayers().length);
  await page.locator('#jordravFocus').check();
  await page.waitForFunction(()=>window.__jordravHarness.details &&
    window.__jordravHarness.details.getLayers().length>0 &&
    window.__jordravHarness.details.getLayers().every(layer=>window.__jordravHarness.data.catalog[layer.feature.properties.i].potential==='enhanced'));
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().length)<localCount);
  assert.equal(await page.evaluate(()=>document.getElementById('jordravDetails').textContent),before.text);
  await page.locator('#jordravFocus').uncheck();
  await page.waitForFunction(count=>window.__jordravHarness.details?.getLayers().length===count,localCount);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__jordravHarness.selected.toGeoJSON())),before.selected);
  report.checks.push('Local focus filters real polygons and restores all classes while preserving the selected explanation');
  const aerialLoaded=page.waitForResponse(response=>response.url().includes('World_Imagery/MapServer/tile/')&&response.status()===200,{timeout:45000});
  await page.locator('[data-base="aerial"]').click();
  await aerialLoaded;
  await page.waitForFunction(()=>document.querySelector('[data-base="aerial"]').getAttribute('aria-pressed')==='true');
  const after = await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()), text:document.getElementById('jordravDetails').textContent}));
  assert.deepEqual(after,before);
  report.checks.push('Actual polygon click renders explanation; aerial switch preserves geometry, selection, view and explanation');
  await page.locator('#jordravOpacity').focus();
  await page.locator('#jordravOpacity').press('End');
  await page.locator('#jordravVisible').uncheck();
  assert.equal(await page.evaluate(()=>window.__jordravHarness.map.hasLayer(window.__jordravHarness.details)),false);
  await page.locator('#jordravVisible').check();
  assert.equal(await page.evaluate(()=>window.__jordravHarness.map.hasLayer(window.__jordravHarness.details)),true);
  await page.locator('#jordravOpacity').press('Home');
  report.checks.push('Opacity and overlay visibility controls work independently of base map');
  await page.waitForFunction(() => {
    const bounds = document.getElementById('jordravMap').getBoundingClientRect();
    const visible = [...document.querySelectorAll('.leaflet-tile-pane img')].filter(tile => {
      const rect = tile.getBoundingClientRect();
      return tile.src.includes('World_Imagery/MapServer/tile/') &&
        rect.right > bounds.left && rect.left < bounds.right &&
        rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    return visible.length > 0 && visible.every(tile => tile.complete &&
      tile.naturalWidth > 0 && Number(getComputedStyle(tile).opacity) >= 0.95);
  }, null, {timeout:45000});
  report.checks.push('All visible aerial tiles finish loading before visual capture');
  await page.screenshot({path:path.join(output,'prototype-aerial-detail.png'),fullPage:true});
  await page.locator('[data-base="street"]').click();
  await page.locator('#jordravDenmark').click();
  await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Generaliseret'));
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__jordravHarness.map.invalidateSize();});
  await page.locator('#jordravDenmark').click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-regions summary').click();
  await page.locator('#jordravRegion').selectOption('stenstrup');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-field summary').click();
  assert.equal(await page.locator('.jordrav-field p').count(),4);
  assert.match(await page.locator('.jordrav-field').textContent(),/under pløjelaget/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-field').screenshot({path:path.join(output,'prototype-field-guide.png')});
  await page.screenshot({path:path.join(output,'prototype-mobile.png'),fullPage:true});
  report.checks.push('Field guide separates ploughing, rain visibility and below-plough geological mapping on mobile');
  report.checks.push('Mobile 390px has no horizontal overflow');
  for(const [lang,label] of [['de','Luftbild'],['en','Aerial imagery']]) {
    await page.locator(`[data-language="${lang}"]`).click();
    await page.waitForFunction(()=>Boolean(window.__jordravHarness?.data),null,{timeout:90000});
    assert.equal(await page.locator('[data-base="aerial"]').textContent(),label);
    assert.ok(!await page.locator('body').textContent().then(text=>text.includes('jordrav.')));
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    await page.locator('.jordrav-regions summary').click();
    await page.locator('#jordravRegion').selectOption('stenstrup');
    assert.ok((await page.locator('#jordravRegionalExplanation h2').textContent()).includes('Stenstrup'));
    await page.locator('.jordrav-field summary').click();
    assert.equal(await page.locator('.jordrav-field summary').textContent(),lang==='de'?'Feldbernstein nach Pflügen und Regen':'Field amber after ploughing and rain');
    assert.match(await page.locator('.jordrav-field').textContent(),lang==='de'?/unter dem Pflughorizont/:/below the plough zone/);
  }
  report.checks.push('German and English rendering have no unresolved translation keys');
  // A fresh context avoids the in-memory tile cache and checks safe fallback.
  const failureContext=await browser.newContext();
  const failurePage=await failureContext.newPage();
  await failurePage.route('**/tile-*.geojson.gz?*',route=>route.abort());
  await failurePage.goto(address);
  await failurePage.waitForFunction(()=>Boolean(window.__jordravHarness?.data),null,{timeout:90000});
  await failurePage.evaluate(()=>{window.__jordravHarness.map.setView([56.14,8.76],11);});
  await failurePage.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer kunne ikke'),null,{timeout:90000});
  assert.equal(await failurePage.evaluate(()=>window.__jordravHarness.details),null);
  report.checks.push('Missing local data retain an explicit overview fallback');
  await failureContext.close();
  assert.deepEqual(report.errors,[]);
  assert.ok(report.network.street200>0,'No live OSM tile succeeded');
  assert.ok(report.network.aerial200>0,'No live aerial tile succeeded');
  report.checks.push('Live viewport tiles succeeded for both OSM and Esri');
  report.status='PASS';
  await context.close();
} catch(error) {
  report.status='FAIL';report.errors.push(error.stack);
  const pages=browser.contexts().flatMap(context=>context.pages());
  if(pages[0])report.lastMapView=await pages[0].evaluate(()=>({region:document.getElementById('jordravRegion')?.value,center:window.__jordravHarness?.map?.getCenter(),zoom:window.__jordravHarness?.map?.getZoom(),status:document.getElementById('jordravStatus')?.textContent})).catch(()=>null);
  throw error;
} finally {
  await fs.writeFile(path.join(output,'prototype-browser-audit.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({status:report.status,checks:report.checks,network:report.network,timings:report.timings,lastMapView:report.lastMapView}));
}
