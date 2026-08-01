import { currentSession, requireFreshSession, testConnection } from './auth-service.js';
import { adminStorageHealth } from './admin-document-store.js';
import { runFullPersistenceTest } from './persistence-test-service.js';
import { askRavRadar, classifyRavQuestion } from './rav-assistant.js';

const EXPECTED_ZONE_COUNT=209;
const TIMEOUT_MS=18000;
const now=()=>performance.now();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} svarede ikke inden ${Math.round(ms/1000)} sekunder.`)),ms))]);
const fetchOk=async url=>{const started=now();const response=await timeout(fetch(`${url}${url.includes('?')?'&':'?'}siteTest=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}}),TIMEOUT_MS,`Hentning af ${url}`);if(!response.ok)throw new Error(`${url} svarede HTTP ${response.status}`);return{response,ms:Math.round(now()-started)};};
const waitFor=async(fn,{ms=TIMEOUT_MS,label='Betingelsen'}={})=>{const started=Date.now();while(Date.now()-started<ms){const value=await fn();if(value)return value;await sleep(120);}throw new Error(`${label} blev ikke opfyldt inden ${Math.round(ms/1000)} sekunder.`);};

function normalizeDetail(value){
 if(typeof value==='string')return{detail:value,metrics:null};
 if(value&&typeof value==='object')return{detail:value.detail||'Bestået',metrics:value.metrics||null};
 return{detail:'Bestået',metrics:null};
}
async function executeStep(category,name,fn,onProgress){
 onProgress({category,name});const started=now();
 try{const value=await fn();const normalized=normalizeDetail(value);return{category,name,status:'passed',detail:normalized.detail,metrics:normalized.metrics,ms:Math.round(now()-started)};}
 catch(error){return{category,name,status:'failed',detail:error?.message||String(error),metrics:null,ms:Math.round(now()-started)};}
}
function createFrame(){
 const frame=document.createElement('iframe');frame.title='RavRadar automatisk funktionstest';frame.setAttribute('aria-hidden','true');Object.assign(frame.style,{position:'fixed',left:'-10000px',top:'0',width:'1280px',height:'900px',border:'0',visibility:'hidden'});document.body.append(frame);return frame;
}
async function loadPublicFrame(runId){
 const frame=createFrame(),errors=[],rejections=[];let loaded=false;
 frame.addEventListener('load',()=>{loaded=true;try{frame.contentWindow.addEventListener('error',event=>errors.push(event.message||'Ukendt JavaScript-fejl'));frame.contentWindow.addEventListener('unhandledrejection',event=>rejections.push(event.reason?.message||String(event.reason)));}catch{}},{once:true});
 frame.src=`./index.html?ravradarSiteTest=${encodeURIComponent(runId)}&t=${Date.now()}`;
 await waitFor(()=>loaded&&frame.contentDocument?.readyState!=='loading',{label:'Den offentlige testside'});
 return{frame,errors,rejections};
}
function publicSnapshot(frame){
 const doc=frame.contentDocument;
 return{
  hasMap:Boolean(doc?.querySelector('#map')),
  mapRendered:Boolean(doc?.querySelector('#map .leaflet-map-pane, #map .leaflet-container, #map .leaflet-pane')),
  rankingText:doc?.querySelector('#ranking')?.textContent?.trim()||'',
  forecastText:doc?.querySelector('#nationalForecastContent')?.textContent?.trim()||'',
  dataStatus:doc?.querySelector('#dataStatus')?.textContent?.trim()||'',
  version:doc?.querySelector('#appVersion')?.textContent?.trim()||'',
  assistant:Boolean(doc?.querySelector('#assistantButton')),
  modeButtons:doc?.querySelectorAll('.mode-button').length||0
 };
}
function resourceSummary(frame){
 try{
  const entries=frame.contentWindow.performance.getEntriesByType('resource');
  const failed=entries.filter(x=>x.duration===0&&x.transferSize===0&&!x.name.includes('leaflet'));
  const slow=[...entries].sort((a,b)=>b.duration-a.duration).slice(0,8).map(x=>({name:x.name.split('/').slice(-2).join('/'),ms:Math.round(x.duration),bytes:x.transferSize||0}));
  return{count:entries.length,failed:failed.map(x=>x.name),slow};
 }catch{return{count:0,failed:[],slow:[]};}
}
function syntheticAssistantContext(zones,conditions){return{mode:'waders',zones,conditions,zone:null,weather:{windSpeedMps:4.2,waveHeightM:0.4,currentSpeedMps:0.18,waterLevelCm:-8},history:{},result:null};}
async function assetClosure(){
 const htmlFiles=['./index.html','./admin.html'];const discovered=new Set();
 for(const page of htmlFiles){const text=await (await fetchOk(page)).response.text();for(const match of text.matchAll(/(?:src|href)=["']([^"'#?]+)(?:\?[^"']*)?["']/g)){const ref=match[1];if(ref.startsWith('http')||ref.startsWith('mailto:')||ref==='/'||ref.startsWith('data:'))continue;discovered.add(new URL(ref,new URL(page,location.href)).pathname.replace(/^.*\/RavRadar\//,'./').replace(/^\//,'./'));}}
 const moduleQueue=['./bootstrap.js','./js/ui/admin-dashboard.js'];const seen=new Set();
 while(moduleQueue.length){const url=moduleQueue.shift();if(seen.has(url))continue;seen.add(url);const {response}=await fetchOk(url);const source=await response.text();discovered.add(url);for(const match of source.matchAll(/(?:from\s*|import\s*\()["']([^"']+)["']/g)){const spec=match[1];if(!spec.startsWith('.'))continue;const child=new URL(spec,new URL(url,location.href));const relative='.'+child.pathname.slice(location.pathname.replace(/admin\.html.*$/,'').length-1);if(!seen.has(relative))moduleQueue.push(relative);}}
 for(const url of discovered)await fetchOk(url);
 return`${discovered.size} HTML-, CSS-, script- og modulreferencer kunne hentes uden 404.`;
}

export async function runFullSiteFunctionTest({onProgress=()=>{}}={}){
 const runId=`site-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
 const startedAt=new Date().toISOString(),results=[];let publicFrame=null;let publicErrors=[];let publicRejections=[];
 const run=async(category,name,fn)=>{const result=await executeStep(category,name,fn,onProgress);results.push(result);return result;};
 try{
  await run('Adgang og admin','Aktiv Supabase-session',async()=>{await requireFreshSession();const session=currentSession();if(!session?.user?.id)throw new Error('Sessionen mangler bruger-id.');return`Logget ind som ${session.user.email||session.user.id}.`;});
  await run('Adgang og admin','Forbindelse til Supabase',async()=>{const result=await testConnection();if(!result.ok)throw new Error(result.error||'Forbindelsestesten fejlede.');return'Supabase svarer med den eksisterende opsætning.';});
  await run('Offentlig side','Åbn offentlig side i browser',async()=>{const loaded=await loadPublicFrame(runId);publicFrame=loaded.frame;publicErrors=loaded.errors;publicRejections=loaded.rejections;const snapshot=publicSnapshot(publicFrame);if(!snapshot.hasMap)throw new Error('Kortets HTML-element mangler.');return{detail:'Den offentlige side blev åbnet i en rigtig, isoleret browserramme.',metrics:snapshot};});
  await run('Offentlig side','Kort og zonefarver renderes',async()=>{await waitFor(()=>{const s=publicSnapshot(publicFrame);return s.mapRendered&&s.rankingText&&!/indlæser/i.test(s.rankingText);},{label:'Kort og rangliste'});const s=publicSnapshot(publicFrame);if(/ingen data|kunne ikke/i.test(s.dataStatus))throw new Error(`Datastatus: ${s.dataStatus}`);return{detail:'Kortet blev renderet, og ranglisten blev udfyldt.',metrics:s};});
  await run('Offentlig side','Jagtform kan skiftes',async()=>{const doc=publicFrame.contentDocument;const buttons=[...doc.querySelectorAll('.mode-button')];if(buttons.length<2)throw new Error('Begge jagtformer findes ikke.');buttons[1].click();await sleep(150);if(buttons[1].getAttribute('aria-pressed')!=='true')throw new Error('Skift til strandjagt blev ikke registreret.');buttons[0].click();return'Waders og strand kan vælges, og den aktive tilstand ændres.';});
  await run('Offentlig side','5-dages prognose renderes',async()=>{await waitFor(()=>{const t=publicSnapshot(publicFrame).forecastText;return t&&!/indlæser/i.test(t);},{label:'5-dages prognosen'});const text=publicSnapshot(publicFrame).forecastText;if(text.length<20)throw new Error('5-dages prognosen indeholder for lidt indhold.');return'5-dages prognosen blev udfyldt.';});
  await run('Data og prognoser','Manifest og conditions er samme datasæt',async()=>{const [{response:mRes,ms:mMs},{response:cRes,ms:cMs}]=await Promise.all([fetchOk('./data/live/manifest.json'),fetchOk('./data/live/conditions.json')]);const [manifest,conditions]=await Promise.all([mRes.json(),cRes.json()]);if(!manifest.datasetId||manifest.datasetId!==conditions.datasetId)throw new Error('Manifest og conditions har forskellige dataset-id’er.');const generated=new Date(manifest.generatedAt||conditions.generatedAt||0);if(!Number.isFinite(generated.getTime()))throw new Error('Datasættet mangler en gyldig genereringstid.');const ageHours=(Date.now()-generated.getTime())/36e5;if(ageHours>24)throw new Error(`Datasættet er ${ageHours.toFixed(1)} timer gammelt.`);return{detail:`Datasæt ${manifest.datasetId} er sammenhængende og ${ageHours.toFixed(1)} timer gammelt.`,metrics:{manifestMs:mMs,conditionsMs:cMs,ageHours:Number(ageHours.toFixed(2)),datasetId:manifest.datasetId}};});
  let zonesData=null,conditionsData=null;
  await run('Data og prognoser','Zoneregister og prognosedækning',async()=>{const [{response:zRes},{response:cRes}]=await Promise.all([fetchOk('./data/zones.geojson'),fetchOk('./data/live/conditions.json')]);zonesData=await zRes.json();conditionsData=await cRes.json();const count=zonesData.features?.length||0;if(count!==EXPECTED_ZONE_COUNT)throw new Error(`Forventede ${EXPECTED_ZONE_COUNT} aktive zoner, fandt ${count}.`);const conditionIds=new Set(Object.keys(conditionsData.zones||{}));const missing=zonesData.features.map(f=>f.properties.id).filter(id=>!conditionIds.has(id));if(missing.length)throw new Error(`${missing.length} zoner mangler i conditions, bl.a. ${missing.slice(0,4).join(', ')}.`);return`${count} aktive zoner har data i det aktuelle landsdatasæt.`;});
  await run('Spørg RavRadar','Hensigtsforståelse',async()=>{const cases=[['Hvilket udstyr skal jeg bruge?','equipment'],['Hvor er det bedste sted i morgen?','best-place'],['Hvornår er det bedst i dag?','best-time'],['Hvorfor er scoren lav?','score'],['Er det sikkert?','safety'],['Hvordan vender strømmen?','current']];const wrong=cases.filter(([q,intent])=>classifyRavQuestion(q)!==intent);if(wrong.length)throw new Error(`Forkert forståelse af: ${wrong.map(x=>x[0]).join(' | ')}`);return`${cases.length} almindelige spørgsmål blev forstået korrekt.`;});
  await run('Spørg RavRadar','Svar om udstyr og ukendte spørgsmål',async()=>{const context=syntheticAssistantContext(zonesData,conditionsData);const equipment=await askRavRadar('Hvilket udstyr skal jeg bruge?',context,{localOnly:true});if(!/lygte|briller|waders|handsker/i.test(equipment))throw new Error('Udstyrssvaret indeholder ikke konkret udstyr.');const unknown=await askRavRadar('Hvad er meningen med lilla elefanter?',context,{localOnly:true});if(!/forstår ikke|kan ikke/i.test(unknown))throw new Error('Et ukendt spørgsmål gav ikke en ærlig afgrænsning.');return'Udstyr giver konkret vejledning, og ukendte spørgsmål afgrænses ærligt.';});
  await run('Spørg RavRadar','Landsdækkende prognosesvar',async()=>{const answer=await askRavRadar('Hvor er det bedste sted i morgen?',syntheticAssistantContext(zonesData,conditionsData),{localOnly:true});if(!/1\.|score|i morgen/i.test(answer))throw new Error('Svaret rangerer ikke konkrete steder og tidspunkter.');return'Spørgsmålet om bedste sted bruger hele landsprognosen.';});
  await run('Adgang og admin','Adminfaner og centrale funktioner',async()=>{const doc=document;const required=['dashboard','rules','weather','zones','directionAudit','users','handbook','system'];const available=new Set([...doc.querySelectorAll('[data-tab]')].map(x=>x.dataset.tab));const missing=required.filter(x=>!available.has(x));if(missing.length)throw new Error(`Mangler adminfaner: ${missing.join(', ')}.`);if(!doc.querySelector('#runSiteFunctionTest'))throw new Error('Knappen til samlet funktionstest mangler.');return`${required.length} centrale adminområder og testknappen findes i den aktive adminside.`;});
  await run('Adgang og admin','Centrale adminmoduler i deploy',async()=>assetClosure());
  await run('Supabase-lagring','Central lageroversigt',async()=>{const health=await adminStorageHealth(['rules','rule-history','water-level-station-routing','direction-reviews','coastline-overrides']);if(!health.ok)throw new Error(health.error||'Mindst ét centraldokument kunne ikke læses.');return`${Object.keys(health.documents||{}).length} centrale dokumentområder kunne læses.`;});
  await run('Supabase-lagring','Skriv, readback, opdatér og ryd op',async()=>{const report=await runFullPersistenceTest();if(!report.ok)throw new Error(report.results.filter(x=>x.status==='failed').map(x=>`${x.name}: ${x.detail}`).join(' | '));return`${report.results.filter(x=>x.status==='passed').length} deltests bestod; testdata blev gendannet eller slettet.`;});
  await run('Deploy og opdatering','Service worker og versionssammenhæng',async()=>{const [{response:swRes},{response:vRes},{response:indexRes},{response:adminRes}]=await Promise.all([fetchOk('./service-worker.js'),fetchOk('./version.json'),fetchOk('./index.html'),fetchOk('./admin.html')]);const [sw,version,index,admin]=await Promise.all([swRes.text(),vRes.json(),indexRes.text(),adminRes.text()]);const current=String(version.version||'');if(!current)throw new Error('version.json mangler version.');for(const [name,text] of [['index.html',index],['admin.html',admin],['service-worker.js',sw]])if(!text.includes(current))throw new Error(`${name} henviser ikke til version ${current}.`);if(!/network|fetch/i.test(sw))throw new Error('Service workeren mangler synlig netværksstrategi.');return`HTML, service worker og version.json bruger alle ${current}.`;});
  await run('Deploy og opdatering','Browserfejl og afviste promises',async()=>{await sleep(250);const issues=[...publicErrors,...publicRejections].filter(Boolean);if(issues.length)throw new Error(issues.slice(0,5).join(' | '));return'Den offentlige testside registrerede ingen JavaScript-fejl eller ubehandlede promises.';});
  await run('Performance','Opstarts- og ressourcemåling',async()=>{const summary=resourceSummary(publicFrame);if(summary.failed.length)throw new Error(`${summary.failed.length} ressourcer ser ud til ikke at være indlæst.`);const navigation=publicFrame.contentWindow.performance.getEntriesByType('navigation')[0];const domReady=Math.round(navigation?.domContentLoadedEventEnd||0),load=Math.round(navigation?.loadEventEnd||0);const slow=summary.slow.filter(x=>x.ms>2500);if(slow.length)throw new Error(`Meget langsomme ressourcer: ${slow.map(x=>`${x.name} ${x.ms} ms`).join(', ')}`);return{detail:`DOM klar efter ${domReady} ms; load efter ${load} ms; ${summary.count} ressourcer målt.`,metrics:{domReadyMs:domReady,loadMs:load,resourceCount:summary.count,slowest:summary.slow}};});
 }finally{if(publicFrame?.isConnected)publicFrame.remove();}
 const categories={};for(const result of results){categories[result.category]??={passed:0,failed:0,total:0};categories[result.category].total++;categories[result.category][result.status==='passed'?'passed':'failed']++;}
 return{runId,startedAt,finishedAt:new Date().toISOString(),ok:results.every(x=>x.status==='passed'),results,categories,summary:{passed:results.filter(x=>x.status==='passed').length,failed:results.filter(x=>x.status==='failed').length,total:results.length}};
}
