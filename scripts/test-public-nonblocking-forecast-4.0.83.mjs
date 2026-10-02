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
const list={innerHTML:'',querySelectorAll:()=>[]};
const node={innerHTML:'',querySelector:()=>list,querySelectorAll:()=>[]};
const state={mode:'waders',forecastRenderId:0,conditions:{},zones:{features:Array.from({length:25},(_,i)=>({properties:{id:`z${i+1}`,name:`Zone ${i+1}`}}))}};
const env={state,nationalForecast:node,conditionDetailsReady:true,document:{querySelector:()=>null},getLanguage:()=> 'da',
  visibleForecastDays:value=>value,emergencySnapshotReferenceAt:()=>null,
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
console.log('OK: Faktisk browserfallback bevarer fem dage, første fem og eksisterende sortering i Top20.');
