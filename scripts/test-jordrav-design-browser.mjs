import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { encodeView } from '../js/jordrav/view-state.js';
import { MANIFEST_SHA256 } from '../js/jordrav/dataset-binding.js';
import { jordravControl, openJordravDetails, closeJordravOptions } from './test-helpers/jordrav-ui.mjs';

const { chromium }=createRequire(import.meta.url)('playwright');
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const output=path.resolve('docs/research/jordrav');
const artifact=name=>path.join(output,`design-${version}-ux-${name}`);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1)||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  try{response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream','Cache-Control':'no-store'});response.end(await fs.readFile(path.resolve(relative)));}
  catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={version,scope:'Actual local Chrome; unmodified product files, no test harness or physical phone claim',dataset:MANIFEST_SHA256,checks:[],errors:[],sourceSha256:{}};
const record=text=>report.checks.push(text);
const ready=page=>page.waitForFunction(()=>!document.getElementById('jordravCopyView').disabled&&document.querySelectorAll('#jordravLegend>span').length>0,null,{timeout:90000});
const flat=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
const assertOpen=async(page,expected)=>assert.equal(await page.locator('#jordravMapOptions').getAttribute('open')!==null,expected);
const state={latitude:57.156,longitude:10.395,zoom:13,base:'street',trace:'all',mode:'potential',opacity:45,dataset:MANIFEST_SHA256,focus:false,show:true,fields:false,deep:true};

try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(address);await ready(page);
  await assertOpen(page,false);
  assert.equal(await page.locator('#jordravLayerCount').textContent(),'2');
  assert.ok(await page.locator('[data-base="street"]').isVisible());
  assert.ok(await page.locator('#jordravCopyView').isVisible());
  assert.equal(await page.locator('.jordrav-regions').getAttribute('open')!==null,true);
  assert.ok(await flat(page));
  record('Desktop shows the map background, sharing and region entry immediately; advanced layers start closed');

  await page.locator('#jordravMapOptions>summary').focus();await page.keyboard.press('Enter');await assertOpen(page,true);
  await page.keyboard.press('Tab');assert.equal(await page.locator('#jordravVisible').evaluate(e=>document.activeElement===e),true);
  await page.keyboard.press('Escape');await assertOpen(page,false);
  assert.equal(await page.locator('#jordravMapOptions>summary').evaluate(e=>document.activeElement===e),true);
  await page.locator('#jordravMapOptions>summary').click();await page.locator('#jordravTitle').click();await assertOpen(page,false);
  await page.locator('#jordravMapOptions>summary').click();
  await page.locator('#jordravVisible').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Shift+Tab');await assertOpen(page,false);
  record('Native layer panel opens by keyboard, exposes controls to Tab and closes by Escape, outside click or leaving with the keyboard');

  await (await jordravControl(page,'#jordravDeepVisible')).uncheck();assert.equal(await page.locator('#jordravLayerCount').textContent(),'1');
  await (await jordravControl(page,'#jordravDeepVisible')).check();
  await closeJordravOptions(page);
  await page.evaluate(hash=>location.hash=hash,encodeView(state));
  await page.waitForFunction(()=>document.getElementById('jordravStatus').textContent.startsWith('Lokale detaljer'),null,{timeout:90000});
  await page.locator('#jordravMap').scrollIntoViewIfNeeded();
  const box=await page.locator('#jordravMap').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.waitForSelector('.jordrav-geological-basis');
  assert.equal(await page.locator('.jordrav-geological-basis').getAttribute('open'),null);
  assert.equal(await page.locator('.jordrav-layer-access').getAttribute('open'),null);
  assert.equal(await page.locator('.jordrav-search-context').getAttribute('open'),null);
  assert.ok(await page.locator('#jordravDetails').evaluate(panel=>{
    const headings=[...panel.querySelectorAll('h3')];
    return headings[0]?.textContent==='Mulig ravhistorie'&&panel.querySelector('h3').compareDocumentPosition(panel.querySelector('.jordrav-geological-basis'))&Node.DOCUMENT_POSITION_FOLLOWING;
  }));
  await openJordravDetails(page,'.jordrav-geological-basis');
  assert.equal(await page.locator('.jordrav-geological-basis dt').count(),5);
  assert.equal(await page.locator('.jordrav-geological-basis dl').evaluate(e=>getComputedStyle(e).display),'block');
  record('Actual area click leads with possibility, unknown huntability and amber interpretation; all five source facts remain readable in Geological basis');

  await page.setViewportSize({width:390,height:844});
  await page.locator('#jordravDetailJump').scrollIntoViewIfNeeded();await page.locator('#jordravDetailJump').click();
  assert.equal(await page.locator('#jordravDetails').evaluate(e=>document.activeElement===e),true);
  assert.ok(await page.locator('#jordravDetails').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<=16));
  assert.ok(await flat(page));
  await page.locator('#jordravDetails').screenshot({path:artifact('mobile-selection.png')});
  record('Selected area reveals a mobile map action that scrolls to and focuses its explanation without horizontal overflow');

  await page.goto(address);await ready(page);
  assert.equal(await page.locator('.jordrav-regions').getAttribute('open'),null);
  assert.equal(await page.locator('#jordravDetailJump').isVisible(),false);
  assert.ok(await page.locator('.jordrav-regions').evaluate(region=>region.getBoundingClientRect().top<document.querySelector('.jordrav-map-column').getBoundingClientRect().top));
  await (await jordravControl(page,'#jordravRegion')).selectOption('asaa-voersaa');
  assert.ok(await page.locator('#jordravRegionGo').isEnabled());
  assert.equal(await page.locator('#jordravRegionStory').getAttribute('open'),null);
  await openJordravDetails(page,'#jordravRegionStory');assert.equal(await page.locator('.jordrav-region-grid h3').count(),4);
  await page.locator('#jordravRegionGo').click();
  assert.equal(await page.locator('#jordravMap').evaluate(e=>document.activeElement===e),true);
  assert.ok(await page.locator('#jordravMap').evaluate(e=>Math.abs(e.getBoundingClientRect().top)<5));
  record('Mobile region entry comes before the map; regional history stays available and Show on map moves focus to the actual map');

  for(const width of [360,390,768,1024])for(const language of ['da','de','en']){
    await page.setViewportSize({width,height:900});await page.goto(address);await ready(page);
    if(await page.locator('html').getAttribute('lang')!==language){
      await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${language}"]`).click()]);await ready(page);
    }
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.ok(await flat(page),`${language}/${width}`);
    assert.ok(!(await page.locator('body').textContent()).includes('jordrav.'),`${language}/${width}`);
    await page.locator('#jordravMapOptions>summary').click();
    assert.ok(await page.locator('.jordrav-options-panel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight*.66+1;}),`${language}/${width}`);
    for(const id of ['jordravVisible','jordravFields','jordravProfiles']){
      const control=await jordravControl(page,`#${id}`);await control.scrollIntoViewIfNeeded();assert.ok(await control.isVisible());
    }
    assert.ok(await flat(page));await closeJordravOptions(page);
    if(width===390&&language==='da'){await page.screenshot({path:artifact('mobile.png'),fullPage:true});await page.locator('#jordravMapOptions>summary').click();await page.screenshot({path:artifact('mobile-layers.png'),fullPage:true});await closeJordravOptions(page);}
    if(width===768&&language==='de')await page.screenshot({path:artifact('tablet-de.png'),fullPage:true});
  }
  record('DA/DE/EN at 360, 390, 768 and 1024 px fit; every nested layer remains reachable in a bounded scrolling panel');
  await page.setViewportSize({width:1440,height:1000});await page.goto(address);await ready(page);
  await Promise.all([page.waitForEvent('load'),page.locator('[data-language="da"]').click()]);await ready(page);
  await page.screenshot({path:artifact('desktop.png'),fullPage:true});
  assert.deepEqual(report.errors,[]);
  const sources=['jordrav.html','jordrav.css',...(await fs.readdir('js/jordrav')).filter(n=>n.endsWith('.js')).map(n=>`js/jordrav/${n}`)];
  for(const source of sources)report.sourceSha256[source]=createHash('sha256').update((await fs.readFile(source,'utf8')).replaceAll('\r\n','\n')).digest('hex');
  report.status='PASS';report.checkedAt=new Date().toISOString();
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{await fs.writeFile(artifact('browser-audit.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors,failure:report.failure}));}
