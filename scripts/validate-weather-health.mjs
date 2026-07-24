import fs from 'node:fs/promises';
const path='data/live/weather-health.json';
let data;try{data=JSON.parse(await fs.readFile(path,'utf8'));}catch{console.log('weather-health.json oprettes ved første centrale vejr-opdatering.');process.exit(0)}
if(!['ok','warning','alarm'].includes(data.status)) throw new Error('Ugyldig weather-health status');
if((data.alerts?.maxPer24Hours ?? 2)>2) throw new Error('Alarmgrænsen må højst være 2');
console.log('Weather health bestået.');
