import fs from 'node:fs/promises';
const app=await fs.readFile('app.js','utf8');
const i18n=await fs.readFile('js/i18n.js','utf8');
const required=[
  'const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))',
  'async function renderNationalForecast()',
  'await yieldToBrowser();',
  'if(renderId!==state.forecastRenderId)return false;',
  "t('forecast.calculating',{progress})",
  'state.conditions?.nationalForecast?.modes?.[state.mode]',
  'function ensureConditionDetails()',
  'pending=loadConditionDetails({manifest:activeManifest,conditions:state.conditions})'
];
for(const token of required)if(!app.includes(token))throw new Error(`Manglende nonblocking-prognoseværn: ${token}`);
if(!i18n.includes("'forecast.calculating'")||!i18n.includes('Beregner 5-dages prognose… {progress} %'))throw new Error('Manglende oversat prognosestatus.');
const startup=app.indexOf("renderRanking();performance.mark?.('ravradar:ranking-ready')",app.indexOf('try {'));
const firstYield=app.indexOf('await yieldToBrowser();',startup);
const ready=app.indexOf("performance.mark?.('ravradar:ready')",firstYield);
const forecast=app.indexOf('const forecastCompleted=await renderNationalForecast()',ready);
if(!(startup>=0&&startup<firstYield&&firstYield<ready&&ready<forecast))throw new Error('Første paint efter dagens rangliste er ikke sikret før det kompakte femdøgnsindeks.');
const startupBlock=app.slice(startup,app.indexOf('// Vind- og strømpile',forecast));
if(startupBlock.includes('loadConditionDetails('))throw new Error('Den store detaljepakke startes stadig under normal opstart.');
console.log('OK: 5-dages prognosen bruger et kompakt indeks og starter ikke den store detaljepakke.');
