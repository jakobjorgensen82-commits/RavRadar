import fs from 'node:fs/promises';
const app=await fs.readFile('app.js','utf8');
const required=[
  'const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()))',
  'async function renderNationalForecast()',
  'await yieldToBrowser();',
  'if(renderId!==state.forecastRenderId)return false;',
  'Beregner 5-dages prognose… ${progress} %',
  "renderNationalForecast().then(completed=>{if(completed)performance.mark?.('ravradar:forecast-ready');})"
];
for(const token of required)if(!app.includes(token))throw new Error(`Manglende nonblocking-prognoseværn: ${token}`);
const startup=app.indexOf("renderRanking();performance.mark?.('ravradar:ranking-ready')",app.indexOf('try {'));
const firstYield=app.indexOf('await yieldToBrowser();',startup);
const forecast=app.indexOf('const forecastCompleted=await renderNationalForecast()',startup);
if(!(startup>=0&&startup<firstYield&&firstYield<forecast))throw new Error('Første paint efter dagens rangliste er ikke sikret før 5-dages beregningen.');
console.log('OK: 5-dages prognosen kan ikke længere blokere første paint af dagens rangliste.');
