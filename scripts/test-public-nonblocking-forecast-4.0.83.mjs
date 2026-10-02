import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {addNationalRanking,compareNationalRankingRows} from '../js/core/zone-ranking.js';
const app=await fs.readFile('app.js','utf8');
const i18n=await fs.readFile('js/i18n.js','utf8');
const required=[
  'const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))',
  'async function renderNationalForecast()',
  'await yieldToBrowser();',
  'if(renderId!==state.forecastRenderId)return false;',
  "t('forecast.calculating',{progress})",
  'state.conditions?.nationalForecast?.modes?.[state.mode]',
];
for(const token of required)if(!app.includes(token))throw new Error(`Manglende nonblocking-prognoseværn: ${token}`);
if(!/function ensureConditionDetails\s*\([^)]*\)/.test(app))throw new Error('Manglende nonblocking-prognoseværn: fælles behovsstyret detaljeindgang');
if(!/pending=loadConditionDetails\(\{manifest:activeManifest,conditions:state\.conditions(?:,zoneId:[^}]*)?\}\)/.test(app))throw new Error('Manglende nonblocking-prognoseværn: manifestbundet detaljeindlæsning');
if(!i18n.includes("'forecast.calculating'")||!i18n.includes('Beregner 5-dages prognose… {progress} %'))throw new Error('Manglende oversat prognosestatus.');
const startup=app.indexOf("renderRanking();performance.mark?.('ravradar:ranking-ready')",app.indexOf('try {'));
const firstYield=app.indexOf('await yieldToBrowser();',startup);
const ready=app.indexOf("performance.mark?.('ravradar:ready')",firstYield);
const forecast=app.indexOf('const forecastCompleted=await renderNationalForecast()',ready);
if(!(startup>=0&&startup<firstYield&&firstYield<ready&&ready<forecast))throw new Error('Første paint efter dagens rangliste er ikke sikret før det kompakte femdøgnsindeks.');
const startupBlock=app.slice(startup,app.indexOf('// Vind- og strømpile',forecast));
if(startupBlock.includes('loadConditionDetails('))throw new Error('Den store detaljepakke startes stadig under normal opstart.');
console.log('OK: 5-dages prognosen bruger et kompakt indeks og starter ikke den store detaljepakke.');

// Run the unchanged browser ranking comparator through the actual fallback
// renderer, without fetching a private/full production dataset.
const renderer=app.slice(app.indexOf('async function renderNationalForecast()'),app.indexOf('\nfunction ensureConditionDetails'));
const dates=Array.from({length:6},(_,i)=>`2026-10-${String(i+1).padStart(2,'0')}`);
const list={innerHTML:'',style:{setProperty:(name,value)=>{list[name]=value;}},querySelectorAll:()=>[]};
const node={innerHTML:'',querySelector:()=>list,querySelectorAll:()=>[]};
const state={mode:'waders',forecastRenderId:0,conditions:{},zones:{features:Array.from({length:25},(_,i)=>({properties:{id:`z${i+1}`,name:`Zone ${i+1}`}}))}};
const env={state,nationalForecast:node,conditionDetailsReady:true,document:{querySelector:()=>null},getLanguage:()=> 'da',
  visibleForecastDays:value=>value,emergencySnapshotReferenceAt:()=>null,hasNumber:Number.isFinite,isCurrentForecastHour:()=>false,
  groupHoursForZone:()=>dates.map(date=>({date})),yieldToBrowser:async()=>{},
  bestForDay:zone=>({hour:{time:'2026-10-01T12:00:00Z'},result:{available:true,score:70+Number(zone.id.slice(1))}}),
  nationalRankingRow:row=>addNationalRanking(row,[]),compareNationalRankingRows,
  t:key=>key,getLocale:()=> 'da-DK',formatDateTime:value=>value,
  scoreRating:()=>({level:'good'}),exceptionalScoreMark:()=>'',scoreQualityMarker:()=>'',openZone:()=>{},
};
const render=new Function('env',`const {${Object.keys(env).join(',')}}=env;${renderer};return renderNationalForecast;`)(env);
assert.equal(await render(),true);
assert.equal((node.innerHTML.match(/data-day-index=/g)||[]).length,5,'Seks inputdatoer skal stadig afgrænses til fem dage.');
assert.equal((list.innerHTML.match(/data-zone-id=/g)||[]).length,20,'Top20-fallback skal vise op til tyve gyldige zoner.');
assert.deepEqual([...list.innerHTML.matchAll(/data-zone-id="([^"]+)"/g)].map(match=>match[1]),Array.from({length:20},(_,i)=>`z${25-i}`));
assert.ok(list.innerHTML.includes('<span class="rank">20</span>'));
assert.equal(list['--national-column-rows'],'10','Pc skal læse nr.1–10 nedad før nr.11–20.');
const css=await fs.readFile('style.css','utf8');
assert.match(css,/@media\s*\(min-width:880px\)\s*\{\s*\.national-forecast-list\s*\{[^}]*grid-auto-flow:\s*column\s*;/);
assert.match(css,/grid-template-rows:\s*repeat\(var\(--national-column-rows,1\),auto\)\s*;/);
state.conditions.nationalForecast={modes:{waders:dates.slice(0,5).map(date=>({date,rows:Array.from({length:5},(_,i)=>({zoneId:`z${25-i}`,time:`${date}T12:00:00Z`,score:95-i,rankingDisplayScore:95-i,recommended:true}))}))}};
assert.equal(await render(),true);
assert.equal((list.innerHTML.match(/data-zone-id=/g)||[]).length,5,'Gammelt autentificeret Top5 skal fortsat være fem rækker.');
assert.equal(list['--national-column-rows'],'5','Gamle fem rækker må ikke skabe fem tomme gridrækker.');
state.mode='beach';
for(const count of [0,1,11,20]){
  state.conditions.nationalForecast.modes.beach=dates.slice(0,5).map(date=>({date,rows:Array.from({length:count},(_,i)=>({zoneId:`z${25-i}`,time:`${date}T12:00:00Z`,score:95-i,rankingDisplayScore:95-i,recommended:true}))}));
  assert.equal(await render(),true);
  assert.equal((list.innerHTML.match(/data-zone-id=/g)||[]).length,count);
  assert.equal(list['--national-column-rows'],String(Math.max(1,Math.min(10,count))));
  assert.deepEqual([...list.innerHTML.matchAll(/<span class="rank">(\d+)<\/span>/g)].map(match=>Number(match[1])),Array.from({length:count},(_,i)=>i+1),'DOM-rangorden skal også bevares i beach og ved delvis/ingen dækning.');
}
console.log('OK: Faktisk browserfallback bevarer fem dage, første fem og eksisterende sortering i Top20.');
