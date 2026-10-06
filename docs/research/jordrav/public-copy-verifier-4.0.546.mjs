import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=process.cwd();
const {chromium}=createRequire(path.join(root,'package.json'))('playwright');
const {encodeView,parseView}=await import(pathToFileURL(path.join(root,'js/jordrav/view-state.js')).href);
const {MANIFEST_SHA256}=await import(pathToFileURL(path.join(root,'js/jordrav/dataset-binding.js')).href);
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const base='https://ravradar.dk/',report={version,scope:'Actual public Chrome, unmodified product files and native controls; no physical phone claim',checks:[],errors:[],files:{}};
const files=['version.json','jordrav.html','jordrav.css',...(await fs.readdir('js/jordrav')).filter(x=>x.endsWith('.js')).map(x=>'js/jordrav/'+x)];
for(const file of files){
 const response=await fetch(base+file+'?verification='+version,{cache:'no-store'});assert.ok(response.ok,file);
 const actual=(await response.text()).replaceAll('\r\n','\n'),expected=(await fs.readFile(file,'utf8')).replaceAll('\r\n','\n');
 assert.equal(actual,expected,file);report.files[file]=createHash('sha256').update(actual).digest('hex');
}
report.checks.push('All 18 public release identity, HTML, CSS and module files exactly match LF-normalized source');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const ready=page=>page.waitForFunction(()=>!document.getElementById('jordravCopyView').disabled&&document.querySelectorAll('#jordravLegend>span').length>0,null,{timeout:90000});
const texts={da:['Gem eller del kortvisning','Spørg altid lodsejeren om lov'],de:['Kartenansicht speichern oder teilen','Immer den Grundeigentümer um Erlaubnis bitten'],en:['Save or share map view','Always ask the landowner for permission']};
const modules=[];
try{
 for(const width of [390,1440])for(const lang of ['da','de','en']){
  const context=await browser.newContext({viewport:{width,height:900}});await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(base).origin});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url().includes('/js/jordrav/'))modules.push(r.url());});
  const initial={latitude:57.156,longitude:10.395,zoom:13,base:'street',trace:'all',mode:'potential',opacity:45,dataset:MANIFEST_SHA256,focus:false,show:true,fields:true,deep:true,soil:false,terrain:false,bores:false,profiles:false};
  const initialUrl=base+'jordrav.html'+encodeView(initial);assert.equal(parseView(new URL(initialUrl).hash).state.fields,true);await page.goto(initialUrl);await ready(page);assert.ok(await page.locator('#jordravFields').isChecked());
  if(await page.locator('html').getAttribute('lang')!==lang){await Promise.all([page.waitForEvent('load'),page.locator('[data-language="'+lang+'"]').click()]);await ready(page);}
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  assert.equal((await page.locator('#jordravCopyView').textContent()).trim(),texts[lang][0]);
  assert.equal(await page.locator('#jordravPermissionTitle').textContent(),texts[lang][1]);
  assert.ok(await page.locator('#jordravCopyView').getAttribute('title'));
  assert.ok(await page.locator('.jordrav-permission-note').isVisible());
  assert.ok(await page.locator('.jordrav-permission-note').evaluate(e=>e.getBoundingClientRect().bottom<=document.querySelector('.jordrav-workspace').getBoundingClientRect().top));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(!(await page.locator('body').textContent()).includes('jordrav.'));
  await page.locator('[data-base="aerial"]').click();await page.locator('#jordravCopyView').click();
  const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(copied,await page.locator('#jordravViewLink').inputValue());
  const saved=parseView(new URL(copied).hash).state;assert.equal(saved.base,'aerial');assert.equal(saved.fields,true);assert.equal(saved.dataset,MANIFEST_SHA256);assert.equal(saved.zoom,13);
  const fresh=await browser.newContext({viewport:{width,height:900}}),restored=await fresh.newPage();restored.on('pageerror',e=>report.errors.push(e.message));
  await restored.goto(copied);await ready(restored);assert.equal(await restored.locator('[data-base="aerial"]').getAttribute('aria-pressed'),'true');assert.ok(await restored.locator('#jordravFields').isChecked());
  report.checks.push(lang+'/'+width+': visible permission and sharing explanation; clipboard and fresh view restore aerial, area and fields');
  if(lang==='da')await page.screenshot({path:path.join(root,'docs/research/jordrav/public-copy-'+version+'-'+width+'.png'),fullPage:true});
  await fresh.close();await context.close();
 }
 assert.ok(modules.length);for(const url of modules)assert.equal(new URL(url).searchParams.get('v'),version,url);assert.deepEqual(report.errors,[]);
 report.checks.push('Every actual requested Jordrav module is release-bound; no page errors');report.status='PASS';report.checkedAt=new Date().toISOString();
} catch(e){report.status='FAIL';report.failure=e.stack;throw e;}
finally{await browser.close();await fs.writeFile(path.join(root,'docs/research/jordrav/public-copy-'+version+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors}));}
