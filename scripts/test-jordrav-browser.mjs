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
const outputPrefix=process.env.RAVRADAR_JORDRAV_BROWSER_PREFIX || 'national-0.2';
assert.match(outputPrefix,/^[\w.-]+$/);
const artifact=file=>path.join(output,file.replace(/^national-0\.2/,outputPrefix));
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
    if (relative === 'js/jordrav/map.js') bytes = Buffer.concat([bytes, Buffer.from('\nwindow.__jordravHarness={get map(){return map},get data(){return data},get overview(){return overview},get details(){return details},get selected(){return selected},get deepLayers(){return deepLayers}};')]);
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
  async function waitForVisibleStreetTiles() {
    await page.waitForFunction(()=>{
      const bounds=document.getElementById('jordravMap').getBoundingClientRect();
      const visible=[...document.querySelectorAll('.leaflet-tile-pane img')].filter(tile=>{
        const rect=tile.getBoundingClientRect();
        return tile.src.includes('tile.openstreetmap.org/') && rect.right>bounds.left &&
          rect.left<bounds.right && rect.bottom>bounds.top && rect.top<bounds.bottom;
      });
      return visible.length>0 && visible.every(tile=>tile.complete && tile.naturalWidth===256 &&
        Number(getComputedStyle(tile).opacity)>=0.95);
    },null,{timeout:45000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
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
  const nationalStyle=await page.evaluate(()=>window.__jordravHarness.overview.getLayers().map(layer=>({
    category:layer.feature.properties.potential,fillOpacity:layer.options.fillOpacity,
    opacity:layer.options.opacity,weight:layer.options.weight,colour:layer.options.fillColor})));
  assert.ok(nationalStyle.some(layer=>layer.category==='possible'));
  assert.ok(nationalStyle.filter(layer=>layer.category==='possible').every(layer=>layer.fillOpacity===0 && layer.opacity===0 && layer.weight===0));
  assert.ok(nationalStyle.filter(layer=>layer.category==='enhanced').every(layer=>layer.fillOpacity>0 && layer.colour==='#d18a1d'));
  for(const [category,colour] of [['coastal','#247bc1'],['basin','#bd547f'],['reworked','#c0a535'],['covered','#60a9a3']]) {
    assert.ok(nationalStyle.some(layer=>layer.category===category),category+' absent nationally');
    assert.ok(nationalStyle.filter(layer=>layer.category===category).every(layer=>layer.fillOpacity>0 && layer.colour===colour));
  }
  assert.equal(await page.evaluate(()=>window.__jordravHarness.data.manifest.modelVersion),'0.2.0-prototype');
  report.checks.push('All four new mechanisms have visible nationwide polygon colours on model 0.2');
  assert.match(await page.locator('#jordravLegend').textContent(),/ingen særskilt udpegning/);
  assert.match(await page.locator('#jordravColourNote').textContent(),/betyder ikke, at ravmuligheder er udelukket/);
  report.checks.push('General sediment context is uncoloured nationally; orange process hypotheses remain visible and uncoloured is not a negative amber assessment');
  await waitForVisibleStreetTiles();
  await page.screenshot({path:artifact('national-0.2-desktop.png'),fullPage:true});
  const overviewCount=await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length);
  await page.locator('#jordravFocus').check();
  assert.ok(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length>0 &&
    window.__jordravHarness.overview.getLayers().every(layer=>['enhanced','coastal','basin','reworked','covered'].includes(layer.feature.properties.potential))));
  assert.ok(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length)<overviewCount);
  assert.equal(requests.filter(url=>/tile-\d+-\d+\.geojson/.test(url)).length,0);
  await page.locator('#jordravFocus').uncheck();
  assert.equal(await page.evaluate(()=>window.__jordravHarness.overview.getLayers().length),overviewCount);
  report.checks.push('National focus hides other classes and restores them without loading detail data');
  await page.locator('.jordrav-regions summary').click();
  for (const region of ['rubjerg','northeast-zealand','stenstrup','varde','vendsyssel-marine','asaa-voersaa']) {
    await page.locator('#jordravRegion').selectOption(region);
    assert.ok((await page.locator('#jordravRegionalExplanation h2').textContent()).trim());
    assert.equal(await page.locator('.jordrav-region-grid h3').count(),4);
    assert.ok(await page.locator('#jordravRegionalExplanation a').count()>0);
    if(region==='rubjerg')await page.locator('.jordrav-regions').screenshot({path:artifact('national-0.2-regional-guide.png')});
    if(region==='northeast-zealand')await page.evaluate(()=>{const map=window.__jordravHarness.map;map.setView(map.getCenter(),map.getZoom()+1,{animate:true});});
    await page.locator('#jordravRegionGo').click();
    await page.waitForFunction(id=>{
      const center=window.__jordravHarness.map.getCenter();
      const bounds={rubjerg:[57.40,9.68,57.52,10.02],'northeast-zealand':[55.86,12.12,56.12,12.48],stenstrup:[55.04,10.44,55.20,10.70],varde:[55.49,8.30,55.77,8.73],'vendsyssel-marine':[57.36,10.15,57.71,10.58],'asaa-voersaa':[57.148,10.405,57.210,10.510]}[id];
      return center.lat>=bounds[0] && center.lng>=bounds[1] && center.lat<=bounds[2] && center.lng<=bounds[3];
    },region);
  }
  assert.equal(await page.evaluate(()=>window.__jordravHarness.data.overview.features.length),overviewCount);
  assert.match(await page.locator('#jordravRegionalExplanation').textContent(),/Sæbyvej\/Østkystvejen/);
  assert.match(await page.locator('#jordravRegionalExplanation').textContent(),/viser de marine aflejringer blåt/);
  await page.locator('.jordrav-regions').screenshot({path:artifact('national-0.2-asaa-voersaa-guide.png')});
  report.checks.push('Six regional explanations render sources and navigate without changing source overview; Asaa–Voersaa names the coastal fields and their marine designation');
  for(const [region,bounds] of [
    ['hals-hou',[56.99,10.21,57.12,10.39]],['jerup-aalbaek',[57.52,10.35,57.62,10.49]],
    ['lammefjord',[55.76,11.30,55.87,11.56]],['roedbyfjord',[54.66,11.23,54.78,11.42]],
    ['hjardemaal',[57.03,8.66,57.11,8.84]]]) {
    await page.locator('#jordravRegion').selectOption(region);
    assert.equal(await page.locator('.jordrav-region-grid h3').count(),4);
    assert.ok(await page.locator('#jordravRegionalExplanation a').count()>=2);
    await page.locator('#jordravRegionGo').click();
    await page.waitForFunction(bounds=>{
      const center=window.__jordravHarness.map.getCenter();
      return center.lat>=bounds[0]&&center.lng>=bounds[1]&&center.lat<=bounds[2]&&center.lng<=bounds[3];
    },bounds);
    assert.equal(await page.evaluate(()=>window.__jordravHarness.data.overview.features.length),overviewCount);
  }
  report.checks.push('Five further comparative marine-field guides navigate and explain distinct sediment/cover histories without class bonuses');
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
  const interiorClickTarget = potential => page.evaluate(potential=> {
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
      if(data.catalog[layer.feature.properties.i].potential!==potential)continue;
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
  },potential);
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().filter(layer=>window.__jordravHarness.data.catalog[layer.feature.properties.i].potential==='possible').every(layer=>layer.options.fillOpacity===0 && layer.options.opacity===0 && layer.options.weight===0)));
  const generalLocation=await interiorClickTarget('possible');
  const generalBox=await page.locator('#jordravMap').boundingBox();
  await page.mouse.click(generalBox.x+generalLocation.x,generalBox.y+generalLocation.y);
  await page.waitForFunction(()=>document.getElementById('jordravDetails').textContent.includes('Generel geologi · ingen særskilt udpegning'));
  assert.match(await page.locator('#jordravDetails').textContent(),/ikke en negativ vurdering af ravmulighederne/);
  const generalSelection=await page.evaluate(()=>JSON.stringify(window.__jordravHarness.selected.toGeoJSON()));
  await page.locator('#jordravOpacity').focus();
  await page.locator('#jordravOpacity').press('End');
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().filter(layer=>window.__jordravHarness.data.catalog[layer.feature.properties.i].potential==='possible').every(layer=>layer.options.fillOpacity===0 && layer.options.opacity===0 && layer.options.weight===0)));
  await page.locator('#jordravColourMode').selectOption('access');
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().every(layer=>layer.options.fillColor==='#778c99' && layer.options.fillOpacity>0)));
  await page.locator('#jordravColourMode').selectOption('potential');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__jordravHarness.selected.toGeoJSON())),generalSelection);
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().filter(layer=>window.__jordravHarness.data.catalog[layer.feature.properties.i].potential==='possible').every(layer=>layer.options.fillOpacity===0 && layer.options.opacity===0 && layer.options.weight===0)));
  await page.locator('#jordravOpacity').focus();
  for(let step=0;step<30;step++)await page.locator('#jordravOpacity').press('ArrowLeft');
  report.checks.push('Uncoloured local geology accepts an actual mouse click and stays uncoloured through opacity/accessibility changes while preserving the selected geometry');
  await page.waitForFunction(()=>{
    const bounds=document.getElementById('jordravMap').getBoundingClientRect();
    const visible=[...document.querySelectorAll('.leaflet-tile-pane img')].filter(tile=>{
      const rect=tile.getBoundingClientRect();
      return tile.src.includes('tile.openstreetmap.org/') && rect.right>bounds.left &&
        rect.left<bounds.right && rect.bottom>bounds.top && rect.top<bounds.bottom;
    });
    return visible.length>0 && visible.every(tile=>tile.complete && tile.naturalWidth===256);
  },null,{timeout:45000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:artifact('national-0.2-uncoloured-detail.png'),fullPage:true});
  const location=await interiorClickTarget('enhanced');
  const box = await page.locator('#jordravMap').boundingBox();
  await page.mouse.click(box.x+location.x,box.y+location.y);
  await page.waitForFunction(()=>document.querySelector('#jordravDetails > .jordrav-badge')?.textContent==='Transport og sortering');
  const before = await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()), text:document.getElementById('jordravDetails').textContent}));
  const localCount=await page.evaluate(()=>window.__jordravHarness.details.getLayers().length);
  await page.locator('#jordravFocus').check();
  await page.waitForFunction(()=>window.__jordravHarness.details &&
    window.__jordravHarness.details.getLayers().length>0 &&
    window.__jordravHarness.details.getLayers().every(layer=>['enhanced','coastal','basin','reworked','covered'].includes(window.__jordravHarness.data.catalog[layer.feature.properties.i].potential)));
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
  await page.screenshot({path:artifact('national-0.2-aerial-detail.png'),fullPage:true});
  assert.match(before.text,/Jagtbarhed uafklaret/);
  const colourBefore=await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()),text:document.getElementById('jordravDetails').textContent}));
  await page.locator('#jordravColourMode').selectOption('access');
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().every(layer=>layer.options.fillColor==='#778c99')));
  assert.deepEqual(await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()),text:document.getElementById('jordravDetails').textContent})),colourBefore);
  assert.match(await page.locator('#jordravColourNote').textContent(),/Ingen af de nuværende flader er verificeret/);
  assert.match(await page.locator('#jordravLegend').textContent(),/Dybt lag · ikke umiddelbart jagtbart/);
  await page.screenshot({path:artifact('national-0.2-accessibility.png'),fullPage:true});
  await page.locator('#jordravColourMode').selectOption('potential');
  assert.ok(await page.evaluate(()=>window.__jordravHarness.details.getLayers().some(layer=>layer.options.fillColor!=='#778c99')));
  report.checks.push('Hunting accessibility remains unknown for surface polygons; colour changes preserve geometry, view and explanation');

  await page.evaluate(()=>{window.__jordravHarness.map.setView([57.432965,10.374907],11,{animate:false});});
  const deepMarker=page.locator('.jordrav-deep-marker[title^="Åsted Vest"]');
  await deepMarker.click();
  await page.waitForFunction(()=>document.getElementById('jordravDetails').textContent.includes('82–89 m'));
  assert.equal(await deepMarker.evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(108, 59, 145)');
  assert.match(await page.locator('#jordravDetails').textContent(),/Dyb lagregistrering · ikke umiddelbart jagtbart/);
  assert.match(await page.locator('#jordravDetails').textContent(),/Intet ravfund eller kortlagt ravlag/);
  assert.equal(await page.locator('#jordravDetails a').getAttribute('href'),'https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=10.934');
  assert.equal(await page.evaluate(()=>window.__jordravHarness.selected.toGeoJSON().geometry.type),'Point');
  const deepBefore=await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()),text:document.getElementById('jordravDetails').textContent}));
  await page.locator('[data-base="street"]').click();
  await page.locator('#jordravColourMode').selectOption('access');
  assert.deepEqual(await page.evaluate(()=>({center:window.__jordravHarness.map.getCenter(),zoom:window.__jordravHarness.map.getZoom(),selected:JSON.stringify(window.__jordravHarness.selected.toGeoJSON()),text:document.getElementById('jordravDetails').textContent})),deepBefore);
  await page.locator('#jordravDeepVisible').uncheck();
  assert.ok(await page.evaluate(()=>!window.__jordravHarness.map.hasLayer(window.__jordravHarness.deepLayers)&&!window.__jordravHarness.map.hasLayer(window.__jordravHarness.selected)));
  await page.locator('#jordravDeepVisible').check();
  assert.ok(await page.evaluate(()=>window.__jordravHarness.map.hasLayer(window.__jordravHarness.deepLayers)&&window.__jordravHarness.map.hasLayer(window.__jordravHarness.selected)));
  await page.locator('#jordravVisible').uncheck();
  assert.ok(await page.evaluate(()=>!window.__jordravHarness.map.hasLayer(window.__jordravHarness.deepLayers)&&!window.__jordravHarness.map.hasLayer(window.__jordravHarness.selected)));
  await page.locator('#jordravVisible').check();
  assert.ok(await page.evaluate(()=>window.__jordravHarness.map.hasLayer(window.__jordravHarness.deepLayers)&&window.__jordravHarness.map.hasLayer(window.__jordravHarness.selected)));
  await page.locator('#jordravFocus').check();
  assert.equal(await page.evaluate(()=>window.__jordravHarness.deepLayers.getLayers().length),2);
  assert.ok(await page.evaluate(()=>window.__jordravHarness.map.hasLayer(window.__jordravHarness.selected)));
  await page.locator('#jordravFocus').uncheck();
  assert.equal(await page.locator('#jordravDetails').textContent(),deepBefore.text);
  report.checks.push('Purple deep points display recorded depths and source without implying amber or extent; base, colour and visibility controls preserve the explanation');

  await page.evaluate(()=>{window.__jordravHarness.map.setView([57.566727,10.357506],11,{animate:false});});
  await page.locator('.jordrav-deep-marker[title^="Ålbæk Lyngshede"]').click();
  await page.waitForFunction(()=>document.getElementById('jordravDetails').textContent.includes('80–90,5 m; 107–112 m'));
  const waitForDeepView=async()=>{
    await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer'),null,{timeout:90000});
    await page.waitForFunction(()=>{
      const bounds=document.getElementById('jordravMap').getBoundingClientRect();
      const visible=[...document.querySelectorAll('.leaflet-tile-pane img')].filter(tile=>{
        const rect=tile.getBoundingClientRect();
        return tile.src.includes('tile.openstreetmap.org/')&&rect.right>bounds.left&&rect.left<bounds.right&&rect.bottom>bounds.top&&rect.top<bounds.bottom;
      });
      return visible.length>0&&visible.every(tile=>tile.complete&&tile.naturalWidth>0&&Number(getComputedStyle(tile).opacity)>=0.95);
    },null,{timeout:45000});
  };
  await waitForDeepView();
  await page.screenshot({path:artifact('national-0.2-deep-layer.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{window.__jordravHarness.map.invalidateSize();});
  await waitForDeepView();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await waitForVisibleStreetTiles();
  await page.screenshot({path:artifact('national-0.2-deep-mobile.png'),fullPage:true});
  report.checks.push('Separate deep sand intervals remain separate; mobile depth panel and colour controls have no horizontal overflow');
  await page.locator('#jordravColourMode').selectOption('potential');
  await page.locator('#jordravOpacity').focus();
  await page.locator('#jordravOpacity').press('Home');
  for(let step=0;step<30;step++)await page.locator('#jordravOpacity').press('ArrowRight');
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
  assert.match(await page.locator('.jordrav-field').textContent(),/Markgrænser 2026/);
  assert.match(await page.locator('.jordrav-field').textContent(),/Registreringen fastlægger ikke dagens afgrøde/);
  assert.match(await page.locator('.jordrav-field').textContent(),/under pløjelaget/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.jordrav-field').screenshot({path:artifact('national-0.2-field-guide.png')});
  await waitForVisibleStreetTiles();
  await page.screenshot({path:artifact('national-0.2-mobile.png'),fullPage:true});
  report.checks.push('Field guide separates ploughing, rain visibility and below-plough geological mapping on mobile');
  report.checks.push('Mobile 390px has no horizontal overflow');
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('#jordravColourMode').selectOption('potential');
  const verification=JSON.parse(await fs.readFile(path.join(output,'national-model-0.2-independent-verification.json'),'utf8'));
  for(const fixture of [...verification.browserFixtures,{class:'coastal',latitude:57.1670255194,longitude:10.4332533245,surface:'HS',landscape:'Marin flade'}]) {
    await page.locator('[data-base="street"]').click();
    await page.evaluate(f=>{window.__jordravHarness.map.setView([f.latitude,f.longitude],13,{animate:false});},fixture);
    await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer'),null,{timeout:90000});
    await page.locator('#jordravMap').scrollIntoViewIfNeeded();
    const point=await page.evaluate(f=>window.__jordravHarness.map.latLngToContainerPoint([f.latitude,f.longitude]),fixture);
    const box=await page.locator('#jordravMap').boundingBox();
    await page.mouse.click(box.x+point.x,box.y+point.y);
    const labels={coastal:'Marine aflejringer',basin:'Ferskvands- og bassinmodtagere',covered:'Dæklag i muligt modtagermiljø',reworked:'Omlejringsmiljøer'};
    await page.waitForFunction(label=>document.querySelector('#jordravDetails > .jordrav-badge')?.textContent===label,labels[fixture.class]);
    const text=await page.locator('#jordravDetails').textContent();
    assert.ok(text.includes(fixture.surface) && text.includes(fixture.landscape));
    assert.match(text,/Jagtbarhed uafklaret/);
    if(fixture.origin)assert.ok(text.includes(fixture.origin));
    const style=await page.evaluate(()=>{const h=window.__jordravHarness;const selected=h.selected.toGeoJSON().features[0];return h.details.getLayers().find(layer=>layer.feature.properties.o===selected.properties.o).options;});
    assert.ok(style.fillOpacity>0);
    assert.equal(style.fillColor,{coastal:'#247bc1',basin:'#bd547f',reworked:'#c0a535',covered:'#60a9a3'}[fixture.class]);
    if(fixture.class==='covered')assert.equal(style.dashArray,'4 4');
    if(!fixture.origin){
      await waitForVisibleStreetTiles();
      await page.screenshot({path:artifact('national-0.2-asaa-blue.png'),fullPage:true});
    }
  }
  report.checks.push('Actual mouse clicks verify blue marine, pink basin, ochre reworking and dashed turquoise cover polygons, plus Asaa coastal fields; all retain unknown hunting access');
  await page.setViewportSize({width:390,height:844});
  for(const [lang,label] of [['de','Luftbild'],['en','Aerial imagery']]) {
    await page.locator(`[data-language="${lang}"]`).click();
    await page.waitForFunction(()=>Boolean(window.__jordravHarness?.data),null,{timeout:90000});
    assert.equal(await page.locator('[data-base="aerial"]').textContent(),label);
    assert.equal(await page.locator('#jordravColourMode option[value="access"]').textContent(),lang==='de'?'Zugänglichkeit':'Hunting accessibility');
    assert.equal(await page.locator('[data-i18n="jordrav.overlay"]').textContent(),lang==='de'?'Geologische Schichten anzeigen':'Show geological layers');
    assert.equal(await page.locator('#jordravDeepVisible').isChecked(),true);
    assert.ok(!await page.locator('body').textContent().then(text=>text.includes('jordrav.')));
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    await page.locator('.jordrav-regions summary').click();
    await page.locator('#jordravRegion').selectOption('stenstrup');
    assert.ok((await page.locator('#jordravRegionalExplanation h2').textContent()).includes('Stenstrup'));
    await page.locator('#jordravRegion').selectOption('asaa-voersaa');
    assert.match(await page.locator('#jordravRegionalExplanation h2').textContent(),/Asaa–Voerså/);
    assert.match(await page.locator('#jordravRegionalExplanation').textContent(),/Sæbyvej\/Østkystvejen/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.match(await page.locator('#jordravLegend').textContent(),lang==='de'?/keine gesonderte Ausweisung/:/no specific designation/);
    for(const region of ['hals-hou','jerup-aalbaek','lammefjord','roedbyfjord','hjardemaal']) {
      await page.locator('#jordravRegion').selectOption(region);
      assert.equal(await page.locator('.jordrav-region-grid h3').count(),4);
      assert.ok(!await page.locator('#jordravRegionalExplanation').textContent().then(text=>text.includes('undefined')));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
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
  await fs.writeFile(artifact('national-0.2-browser-audit.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();await new Promise(resolve=>server.close(resolve));
  console.log(JSON.stringify({status:report.status,checks:report.checks,network:report.network,timings:report.timings,lastMapView:report.lastMapView}));
}
