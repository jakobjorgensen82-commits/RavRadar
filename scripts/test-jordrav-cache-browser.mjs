import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const baseline='daef1fd9df7da9250ccecbfe543d52880d0b01f3';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const expectStale=process.argv.includes('--expect-stale');
let old=true;
const requests=[],oldBytes=new Map();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip'};
const server=http.createServer(async(request,response)=>{
  const relative=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1)||'jordrav.html';
  if(!/^(?:jordrav\.html|jordrav\.css|style\.css|js\/i18n\.js|js\/jordrav\/[\w-]+\.js|data\/jordrav\/[\w.-]+\/[\w.-]+)$/.test(relative)){response.writeHead(404);response.end();return;}
  requests.push({old,url:request.url});
  try{
    let bytes;
    if(old&&!relative.startsWith('data/')){
      if(!oldBytes.has(relative))oldBytes.set(relative,execFileSync('git',['show',`${baseline}:${relative}`],{maxBuffer:16*1024*1024}));
      bytes=oldBytes.get(relative);
    }else bytes=await fs.readFile(path.resolve(relative));
    response.writeHead(200,{'Content-Type':mime[path.extname(relative)]||'application/octet-stream',
      'Cache-Control':/\.(js|css)$/.test(relative)?'public, max-age=600':'no-store'});response.end(bytes);
  }catch{response.writeHead(404);response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=`http://127.0.0.1:${server.address().port}/jordrav.html`;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAVRADAR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={version,baseline,scope:'Real Chrome HTTP cache across 4.0.544 to design release; public max-age=600 fixture, no DOM/test-harness injection',checks:[],errors:[]};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(address);await page.waitForFunction(()=>!document.getElementById('jordravCopyView').disabled,null,{timeout:90000});
  assert.equal(await page.locator('#jordravMapOptions').count(),0);
  report.checks.push('Old 4.0.544 actually loads and warms its unversioned module URLs in Chrome');
  old=false;await page.goto(address);
  await page.waitForFunction(()=>!document.getElementById('jordravCopyView').disabled,null,{timeout:90000});
  const unresolved=await page.locator('body').evaluate(e=>[...new Set(e.textContent.match(/jordrav\.[\w]+/g)||[])]);
  const after=requests.filter(r=>!r.old);
  report.newModuleRequests=after.filter(r=>r.url.startsWith('/js/')).map(r=>r.url);
  report.unresolved=unresolved;
  if(expectStale){assert.ok(unresolved.length>0);report.status='STALE_CACHE_REPRODUCED';}
  else{
    assert.deepEqual(unresolved,[]);
    assert.equal(await page.locator('#jordravTitle').textContent(),'Jordrav og markrav i Danmark');
    const modules=after.filter(r=>r.url.startsWith('/js/jordrav/'));
    assert.equal(modules.length,15);
    assert.ok(modules.every(r=>new URL(r.url,address).searchParams.get('v')===version));
    assert.deepEqual(report.errors,[]);
    report.checks.push('All 15 current Jordrav modules load under one release identity, with complete new and existing translations');
    for(const language of ['de','en']){
      await Promise.all([page.waitForEvent('load'),page.locator(`[data-language="${language}"]`).click()]);
      await page.waitForFunction(()=>!document.getElementById('jordravCopyView').disabled,null,{timeout:90000});
      assert.equal(await page.locator('html').getAttribute('lang'),language);
      assert.ok(!(await page.locator('body').textContent()).includes('jordrav.'));
    }
    report.checks.push('Returning visitor keeps complete translations through actual German/English language reloads');
    report.status='PASS';
  }
}catch(error){report.status='FAIL';report.failure=error.stack;throw error;}
finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
  const out=expectStale?path.join(process.env.TEMP,'RavRadar/jordrav-autonomous-20261006/design-stale-cache-reproduction.json'):`docs/research/jordrav/design-${version}-cache-browser-audit.json`;
  await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,unresolved:report.unresolved?.length,errors:report.errors}));
}
