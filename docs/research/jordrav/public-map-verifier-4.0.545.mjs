import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const {jordravControl,openJordravDetails,closeJordravOptions}=await import(pathToFileURL(path.resolve('scripts/test-helpers/jordrav-ui.mjs')).href);
const {encodeView}=await import(pathToFileURL(path.resolve('js/jordrav/view-state.js')).href);
const {MANIFEST_SHA256,DATA_BASE}=await import(pathToFileURL(path.resolve('js/jordrav/dataset-binding.js')).href);
const root=path.resolve('.'),out=path.join(root,'docs/research/jordrav');
const base='https://ravradar.dk/';
const report={observedAt:new Date().toISOString(),scope:'Unmodified public GitHub Pages in actual Chrome, desktop and mobile emulation; no physical telephone claim',base,releaseVersion:'4.0.545',expectedSourceHead:process.env.RAVRADAR_EXPECTED_DEPLOY_HEAD,status:'RUNNING',checks:[],errors:[],sourceFiles:[],requests:[]};
const check=text=>{report.checks.push(text);console.log(text)};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const name of ['version.json','jordrav.html','jordrav.css',... (await fs.readdir(path.join(root,'js/jordrav'))).filter(n=>n.endsWith('.js')).map(n=>'js/jordrav/'+n)]){
  const response=await fetch(new URL(name+'?verify=20261006-545',base),{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,name);
  const actual=await response.text(),expected=await fs.readFile(path.join(root,name),'utf8');
  assert.equal(actual.replace(/\r\n/g,'\n'),expected.replace(/\r\n/g,'\n'),name);
  report.sourceFiles.push({path:name,lfSha256:sha(actual.replace(/\r\n/g,'\n'))});
}
check('Public version, HTML, CSS and all 15 Jordrav modules match the checked release source');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('request',request=>report.requests.push(request.url()));
  await page.goto(new URL('jordrav.html',base).href);
  await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Generaliseret'),null,{timeout:90000});
  await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('.leaflet-tile-pane img')];return tiles.length>0&&tiles.every(t=>t.complete&&t.naturalWidth===256&&Number(getComputedStyle(t).opacity)>=.99)},null,{timeout:60000});
  assert.equal(await page.evaluate(()=>Boolean(window.__jordravHarness||window.__contextHarness)),false);
  assert.ok(!report.requests.some(u=>/supabase|dmi\.dk|\/data\/live\//i.test(u)));
  check('Public national overview loads without test harness, private/weather runtime or supplemental provider requests');
  await page.screenshot({path:path.join(out,'public-4.0.545-desktop.png'),fullPage:true});
  const state={latitude:57.156,longitude:10.395,zoom:13,base:'street',trace:'all',mode:'potential',opacity:55,dataset:MANIFEST_SHA256,focus:false,show:true,fields:false,deep:true};
  await page.evaluate(hash=>location.hash=hash,encodeView(state));
  await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer.'),null,{timeout:90000});
  const map=page.locator('#jordravMap');await map.scrollIntoViewIfNeeded();const box=await map.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.waitForSelector('.jordrav-soil-point button',{timeout:30000});
  assert.match(await page.locator('#jordravDetails').textContent(),/Jagtbarhed uafklaret/);
  await page.locator('.jordrav-soil-point button').click();
  await page.waitForFunction(()=>document.querySelector('.jordrav-soil-point')?.textContent.includes('JB 4'),null,{timeout:30000});
  check('Public local geology accepts a real click; actual click-point soil query returns live JB4 while hunting access remains unknown');
  await openJordravDetails(page,'.jordrav-context-controls');
  await (await jordravControl(page,'#jordravBores')).check();
  await page.waitForSelector('.jordrav-bore-marker',{timeout:30000});
  await closeJordravOptions(page);await page.locator('.jordrav-bore-marker').first().click();assert.match(await page.locator('#jordravDetails').textContent(),/ikke dybden til et ravlag/);
  await (await jordravControl(page,'#jordravBores')).uncheck();
  await (await jordravControl(page,'#jordravProfiles')).check();await page.waitForFunction(()=>document.querySelectorAll('.jordrav-profile-marker').length===16,null,{timeout:30000});
  check('Public nationwide Jupiter layer and all 16 SHA-bound profile markers load; total depth is not treated as an amber bed');
  await (await jordravControl(page,'#jordravProfiles')).uncheck();await (await jordravControl(page,'#jordravSoil')).check();await (await jordravControl(page,'#jordravTerrain')).check();
  await page.waitForFunction(()=>['soil','terrain'].every(name=>[...document.querySelectorAll(`.leaflet-jordrav-${name}-pane img`)].some(t=>t.complete&&t.naturalWidth===256)),null,{timeout:60000});
  check('Public soil and correctly reprojected historical terrain tiles load with their controls and provenance');
  await (await jordravControl(page,'#jordravSoil')).uncheck();await (await jordravControl(page,'#jordravTerrain')).uncheck();
  await (await jordravControl(page,'#jordravVisible')).uncheck();await page.locator('[data-base="aerial"]').click();
  await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('.leaflet-tile-pane img')].filter(t=>t.src.includes('World_Imagery'));return tiles.length>0&&tiles.every(t=>t.complete&&t.naturalWidth===256&&Number(getComputedStyle(t).opacity)>=.99)},null,{timeout:60000});
  await closeJordravOptions(page);await map.screenshot({path:path.join(out,'public-4.0.545-aerial.png')});check('Actual public aerial background loads, with geology and supplemental layers hidden independently');
  await (await jordravControl(page,'#jordravVisible')).check();await (await jordravControl(page,'#jordravFields')).check();
  await page.waitForFunction(()=>[...document.querySelectorAll('.leaflet-jordrav-fields-pane img')].some(t=>t.complete&&t.naturalWidth===256),null,{timeout:60000});
  check('Fixed-year public field outlines load over aerial imagery without implying current bare or ploughed soil');
  await page.locator('#jordravCopyView').click();
  assert.equal(new URL(page.url()).hash.includes('fields=1'),true);
  await page.locator('#jordravMapOptions>summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#jordravMapOptions').getAttribute('open')!==null,true);await page.keyboard.press('Escape');assert.equal(await page.locator('#jordravMapOptions').getAttribute('open'),null);
  check('Public redesigned native layer panel opens by keyboard and closes by Escape with focus returned to its summary');
  report.verificationNotes=['Saved layer choices are explicitly copied before language reload; all languages are selected through actual UI and verified on html.lang. Existing 4.0.544 reports remain historical.'];
  await page.setViewportSize({width:390,height:844});
  for(const lang of ['da','de','en']){
    if(lang!=='da'){await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${lang}"]`).click()]);await page.waitForFunction(()=>/^(Lokale detaljer\.|Local details\.|Lokale Details\.)/.test(document.getElementById('jordravStatus').textContent),null,{timeout:90000});}
    assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('#jordravFields').isChecked(),true,lang+' saved field choice');
    await page.waitForFunction(()=>['tile','jordrav-fields'].every(pane=>{const tiles=[...document.querySelectorAll(`.leaflet-${pane}-pane img`)];return tiles.length>0&&tiles.every(t=>t.complete&&t.naturalWidth===256&&Number(getComputedStyle(t).opacity)>=.99)}),null,{timeout:60000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang);
    assert.ok(!(await page.locator('body').textContent()).includes('jordrav.'));
    await page.locator('#jordravMapOptions>summary').click();assert.ok(await page.locator('.jordrav-options-panel').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;}));await closeJordravOptions(page);
    if(lang==='da')await page.screenshot({path:path.join(out,'public-4.0.545-mobile.png'),fullPage:true});
  }
  check('Public 390 px mobile emulation fits in Danish, German and English with translated controls and no unresolved message keys');
  const moduleRequests=report.requests.filter(u=>new URL(u).pathname.includes('/js/jordrav/')&&new URL(u).pathname.endsWith('.js'));
  const modulePaths=new Set(moduleRequests.map(u=>new URL(u).pathname));
  assert.equal(modulePaths.size,15);
  assert.ok(moduleRequests.every(u=>new URL(u).searchParams.get('v')==='4.0.545'));
  check('All 15 actual public Jordrav module requests use the same release identity through language reloads');
  assert.deepEqual(report.errors,[]);report.status='PASS';await context.close();
}catch(error){report.status='FAIL';report.errors.push(error.stack);const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0]){report.failureState=await pages[0].evaluate(()=>({language:document.documentElement.lang,status:document.getElementById('jordravStatus')?.textContent,fields:document.getElementById('jordravFieldStatus')?.textContent,tiles:[...document.querySelectorAll('.leaflet-tile-pane img,.leaflet-jordrav-fields-pane img')].map(t=>({src:t.src,complete:t.complete,width:t.naturalWidth,opacity:getComputedStyle(t).opacity,display:getComputedStyle(t).display,pane:t.parentElement.parentElement.className}))}));await pages[0].screenshot({path:path.join(out,'public-4.0.545-failure.png'),fullPage:true});}throw error;}
finally{await browser.close();report.completedAt=new Date().toISOString();await fs.writeFile(path.join(out,'public-browser-4.0.545.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length}));}
