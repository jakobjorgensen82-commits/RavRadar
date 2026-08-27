import fs from 'node:fs/promises';
const app=await fs.readFile('app.js','utf8');
const i18n=await fs.readFile('js/i18n.js','utf8');
const required=[
  'const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))',
  'async function renderNationalForecast()',
  'await yieldToBrowser();',
  'if(renderId!==state.forecastRenderId)return false;',
  "t('forecast.calculating',{progress})",
  "conditionDetailsPromise=loadConditionDetails({manifest,conditions:state.conditions}).then(async details=>{"
];
for(const token of required)if(!app.includes(token))throw new Error(`Manglende nonblocking-prognoseværn: ${token}`);
if(!i18n.includes("'forecast.calculating'")||!i18n.includes('Beregner 5-dages prognose… {progress} %'))throw new Error('Manglende oversat prognosestatus.');
const startup=app.indexOf("renderRanking();performance.mark?.('ravradar:ranking-ready')",app.indexOf('try {'));
const firstYield=app.indexOf('await yieldToBrowser();',startup);
const ready=app.indexOf("performance.mark?.('ravradar:ready')",firstYield);
const details=app.indexOf('conditionDetailsPromise=loadConditionDetails({manifest,conditions:state.conditions})',ready);
const forecast=app.indexOf('const completed=await renderNationalForecast()',details);
if(!(startup>=0&&startup<firstYield&&firstYield<ready&&ready<details&&details<forecast))throw new Error('Første paint efter dagens rangliste er ikke sikret før detaljehentning og 5-dages beregning.');
console.log('OK: 5-dages prognosen kan ikke længere blokere første paint af dagens rangliste.');
