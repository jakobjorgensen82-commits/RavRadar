#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

const DEFAULT_WORK='.geometry-v2-work/ci-31425327202';
const DEFAULT_OUT='.owner-review/national-coastal-zone-review';
const flags=['productionGeometryChanged','adminDataChanged','weatherSamplingChanged','stateChanged','publicRuntimeChanged','scoreChanged','automaticActivationAllowed'];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function lines(geometry){
  if(!geometry)return [];
  if(geometry.type==='LineString')return [geometry.coordinates];
  if(geometry.type==='MultiLineString')return geometry.coordinates;
  return [];
}

function finalFeatures(coastal,partitions){
  const replacements=new Set(partitions.features.map(f=>f.properties.sourcePartId));
  return [
    ...coastal.features.filter(f=>!replacements.has(f.properties.partId)).map(f=>({...f,properties:{...f.properties,finalPartId:f.properties.partId}})),
    ...partitions.features.map(f=>({...f,properties:{...f.properties,finalPartId:f.properties.finalPartId??f.properties.proposalId}})),
  ];
}

export function buildReview({coastal,partitions,names,points,shadow}){
  if(shadow?.status!=='passed-private-national-shadow-score-validation'||shadow.scoreChanged!==false||shadow.publicRuntimeChanged!==false)throw new Error('Review kræver bestået, score-neutral national shadow-score');
  const features=finalFeatures(coastal,partitions),byId=new Map(features.map(f=>[f.properties.finalPartId,f]));
  const nameById=new Map(names.parts.map(p=>[p.finalPartId,p])),pointById=new Map(points.parts.map(p=>[p.finalPartId,p]));
  const scored=new Set(shadow.parts.map(p=>p.partId));
  if(features.length!==names.finalPartCount||features.length!==points.finalPartCount||byId.size!==features.length)throw new Error('Final geometri, navne og punktpar er ikke 1:1');
  const rows=[...byId].map(([partId,feature])=>{
    const n=nameById.get(partId),p=pointById.get(partId);if(!n||!p)throw new Error(`${partId}: mangler navn eller punktpar`);
    const blocked=p.status!=='private-point-pair-proposed';
    return {zoneId:n.zoneId,partId,name:n.suggestedName,nameStatus:n.nameStatus,lengthKm:Number(feature.properties.lengthKm??feature.properties.finalLengthKm??0),geometry:feature.geometry,
      reviewStatus:blocked?'blocked':scored.has(partId)?'complete':'partial',blockedReasons:p.blockingReasons??[],landPoint:blocked?null:p.landPoint,waterPoint:blocked?null:p.waterPoint,
      clickable:true,scoreShown:false,scoreColorUsed:false,rankingShown:false,bestPartBadgeShown:false,weatherDetailsShown:false,stateDetailsShown:false};
  }).sort((a,b)=>a.zoneId.localeCompare(b.zoneId)||a.name.localeCompare(b.name,'da'));
  const counts=Object.fromEntries(['complete','partial','blocked'].map(s=>[s,rows.filter(r=>r.reviewStatus===s).length]));
  if(rows.length!==783||counts.complete!==752||counts.partial!==22||counts.blocked!==9)throw new Error(`Uventet national reviewfordeling: ${JSON.stringify(counts)}`);
  return {schemaVersion:'1.0.0',status:'passed-private-national-score-neutral-owner-review',generatedAt:new Date().toISOString(),partCount:rows.length,zoneCount:new Set(rows.map(r=>r.zoneId)).size,statusCounts:counts,
    presentation:{privateOnly:true,neutralGeometryOnly:true,coverageStatusColorsNotScores:true,partScoresForbidden:true,partScoreColorsForbidden:true,partRankingForbidden:true,bestPartSelectionForbidden:true,rawWeatherForbidden:true,stateMetricsForbidden:true},
    parts:rows,sourceShadowGeneratedAt:shadow.generatedAt,...Object.fromEntries(flags.map(k=>[k,false])),activationGatesRemaining:['central-admin-roundtrip-and-rollback','explicit-owner-review-and-go-no-go-before-score-or-production-activation']};
}

function projectedParts(parts){
  const coords=parts.flatMap(p=>lines(p.geometry).flat()).filter(c=>Number.isFinite(c?.[0])&&Number.isFinite(c?.[1]));
  let minLon=Infinity,maxLon=-Infinity,minLat=Infinity,maxLat=-Infinity;for(const c of coords){minLon=Math.min(minLon,c[0]);maxLon=Math.max(maxLon,c[0]);minLat=Math.min(minLat,c[1]);maxLat=Math.max(maxLat,c[1]);}
  const width=920,height=980,pad=24,meanLat=(minLat+maxLat)/2,cos=Math.cos(meanLat*Math.PI/180),dx=(maxLon-minLon)*cos,dy=maxLat-minLat,scale=Math.min((width-pad*2)/dx,(height-pad*2)/dy);
  const xy=c=>[pad+(c[0]-minLon)*cos*scale,height-pad-(c[1]-minLat)*scale];
  return {width,height,parts:parts.map(p=>({...p,paths:lines(p.geometry).map(line=>line.map((c,i)=>`${i?'L':'M'}${xy(c)[0].toFixed(1)},${xy(c)[1].toFixed(1)}`).join(' '))}))};
}

export function renderHtml(report){
  const map=projectedParts(report.parts),safeParts=map.parts.map(({geometry,...p})=>p),data=JSON.stringify(safeParts).replace(/</g,'\\u003c');
  const paths=safeParts.flatMap(p=>p.paths.map(d=>`<path id="g-${esc(p.partId)}" class="part ${p.reviewStatus}" data-id="${esc(p.partId)}" d="${d}"/>`)).join('');
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>RavRadar · national kystzonereview</title><style>
  :root{color-scheme:dark;--bg:#0c1418;--panel:#152126;--line:#aebbc0;--complete:#8fa4aa;--partial:#f0b44d;--blocked:#ef6b67}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#edf5f6;font:14px system-ui,sans-serif}header{padding:16px 20px;border-bottom:1px solid #31434a;position:sticky;top:0;background:#0c1418f2;z-index:4}h1{font-size:20px;margin:0 0 5px}.notice{color:#b9c9ce}.layout{display:grid;grid-template-columns:minmax(420px,1fr) 380px;min-height:calc(100vh - 76px)}.map{position:sticky;top:76px;height:calc(100vh - 76px);overflow:auto;background:radial-gradient(circle at 50% 45%,#243b43,#101c21 65%)}svg{width:100%;height:100%;min-height:700px}.part{fill:none;stroke:var(--complete);stroke-width:2.2;vector-effect:non-scaling-stroke;cursor:pointer;opacity:.86}.part.partial{stroke:var(--partial);stroke-dasharray:6 4}.part.blocked{stroke:var(--blocked);stroke-width:3}.part:hover,.part.selected{stroke:#fff;stroke-width:5;opacity:1}.side{border-left:1px solid #31434a;background:var(--panel);padding:14px;overflow:auto;height:calc(100vh - 76px);position:sticky;top:76px}.stats,.filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}.chip,button,input{border:1px solid #40545c;background:#101b20;color:#edf5f6;border-radius:7px;padding:7px 9px}.chip b{font-size:16px}button{cursor:pointer}button.active{outline:2px solid #d8e5e8}input{width:100%;margin-bottom:10px}.row{padding:9px;border:1px solid #30434a;border-radius:8px;margin:7px 0;cursor:pointer}.row:hover,.row.selected{border-color:#dce8eb;background:#203139}.name{font-weight:700}.meta{font-size:12px;color:#aec0c5;margin-top:3px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--complete);margin-right:5px}.dot.partial{background:var(--partial)}.dot.blocked{background:var(--blocked)}.detail{padding:10px;background:#0f191e;border-radius:8px;margin-bottom:10px;display:none}.detail.show{display:block}@media(max-width:850px){.layout{display:block}.map{position:relative;top:0;height:58vh}.side{position:relative;top:0;height:auto;border-left:0;border-top:1px solid #31434a}}
  </style></head><body><header><h1>National kystzonereview · 783 lokale dele</h1><div class="notice">Privat og score-neutral. Farver viser kun datadækning — aldrig RavScore. Klik på en kystdel for navn og kontrolstatus.</div></header><main class="layout"><section class="map"><svg viewBox="0 0 ${map.width} ${map.height}" aria-label="Danmarks lokale kystdele">${paths}</svg></section><aside class="side"><div class="stats"><span class="chip"><b>${report.statusCounts.complete}</b> komplette</span><span class="chip"><b>${report.statusCounts.partial}</b> deldækning</span><span class="chip"><b>${report.statusCounts.blocked}</b> blokerede</span></div><div id="detail" class="detail"></div><input id="search" placeholder="Søg navn, zone eller del-id"><div class="filters"><button class="active" data-filter="all">Alle</button><button data-filter="complete">Komplet</button><button data-filter="partial">Deldækning</button><button data-filter="blocked">Blokeret</button></div><div id="list"></div></aside></main><script>
  const parts=${data};let filter='all',query='',selected='';const list=document.querySelector('#list'),detail=document.querySelector('#detail');
  const label=s=>s==='complete'?'komplet datagrundlag':s==='partial'?'mangler én eller flere marine komponenter':'blokeret geografisk tvivl';
  function visible(){return parts.filter(p=>(filter==='all'||p.reviewStatus===filter)&&(!query||[p.name,p.zoneId,p.partId].join(' ').toLocaleLowerCase('da').includes(query)))}
  function select(id){selected=id;document.querySelectorAll('.selected').forEach(e=>e.classList.remove('selected'));document.querySelectorAll('[data-id="'+CSS.escape(id)+'"],#g-'+CSS.escape(id)).forEach(e=>e.classList.add('selected'));const p=parts.find(x=>x.partId===id);detail.className='detail show';detail.innerHTML='<div class="name">'+p.name+'</div><div class="meta">'+p.zoneId+' · '+p.partId+'<br>'+label(p.reviewStatus)+(p.blockedReasons.length?'<br>Årsag: '+p.blockedReasons.join(', '):'')+'<br><b>Ingen delscore vises eller aktiveres.</b></div>';document.getElementById('g-'+id)?.scrollIntoView({block:'center',inline:'center'});}
  function render(){list.innerHTML=visible().map(p=>'<div class="row '+(selected===p.partId?'selected':'')+'" data-id="'+p.partId+'"><div class="name"><span class="dot '+p.reviewStatus+'"></span>'+p.name+'</div><div class="meta">'+p.zoneId+' · '+label(p.reviewStatus)+'</div></div>').join('');list.querySelectorAll('.row').forEach(e=>e.onclick=()=>select(e.dataset.id))}
  document.querySelectorAll('svg .part').forEach(e=>e.onclick=()=>select(e.dataset.id));document.querySelector('#search').oninput=e=>{query=e.target.value.toLocaleLowerCase('da');render()};document.querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render()});render();
  </script></body></html>`;
}

export function selfTest(){
  const feature=(id,zone='Z')=>({type:'Feature',properties:{zoneId:zone,partId:id,lengthKm:1},geometry:{type:'LineString',coordinates:[[8,55],[8.1,55.1]]}}),ids=Array.from({length:783},(_,i)=>`p${i}`),coastal={features:ids.map(id=>feature(id))},partitions={features:[]};
  const names={finalPartCount:783,parts:ids.map((id,i)=>({zoneId:`Z${i%194}`,finalPartId:id,suggestedName:`Del ${i}`,nameStatus:'private-official-name-suggestion'}))};
  const points={finalPartCount:783,parts:ids.map((id,i)=>({finalPartId:id,status:i<9?'blocked':'private-point-pair-proposed',blockingReasons:i<9?['test']:[]}))};
  const shadow={status:'passed-private-national-shadow-score-validation',scoreChanged:false,publicRuntimeChanged:false,parts:ids.slice(9,761).map(partId=>({partId}))};
  const report=buildReview({coastal,partitions,names,points,shadow}),html=renderOwnerReviewHtml(report);if(report.statusCounts.complete!==752||report.statusCounts.partial!==22||report.statusCounts.blocked!==9||html.includes('"score":')||!html.includes('31 kræver kontrol')||!html.includes('Luftfoto'))throw new Error('National owner-review self-test fejlede');
  console.log('National score-neutral owner-review self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test'))return selfTest();const args=process.argv.slice(2),val=(f,d)=>{const i=args.indexOf(f);return i<0?d:args[i+1]},work=val('--work',DEFAULT_WORK),out=val('--output-dir',DEFAULT_OUT);
  const read=f=>fs.readFile(path.join(work,f),'utf8').then(JSON.parse),[coastal,partitions,names,points,shadow]=await Promise.all(['national-coastal-parts.geojson','national-locality-partitions.geojson','national-local-part-name-suggestions.json','national-local-part-point-pairs.json','national-shadow-score-validation.json'].map(read));
  const report=buildReview({coastal,partitions,names,points,shadow});await fs.mkdir(out,{recursive:true});await Promise.all([fs.writeFile(path.join(out,'review-report.json'),JSON.stringify({...report,parts:report.parts.map(({geometry,...p})=>p)},null,2)+'\n'),fs.writeFile(path.join(out,'index.html'),renderOwnerReviewHtml(report))]);console.log(JSON.stringify({status:report.status,partCount:report.partCount,statusCounts:report.statusCounts,scoreChanged:false}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(e=>{console.error(e.message);process.exit(1)});
