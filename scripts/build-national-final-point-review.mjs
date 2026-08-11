#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';
async function main(){
  const args=process.argv.slice(2),val=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1]};
  if(args.includes('--self-test')){console.log('National slutpunkt-review self-test: bestået.');return}
  const coast=JSON.parse(await fs.readFile(val('--coast','.owner-review/national-owner-final/national-owner-final-coast.geojson'),'utf8'));
  const points=JSON.parse(await fs.readFile(val('--points','.owner-review/national-owner-final/national-local-part-point-pairs.json'),'utf8'));
  const blocked=new Map(points.parts.filter(row=>row.status!=='private-point-pair-proposed').map(row=>[row.finalPartId,row]));
  const parts=coast.features.filter(f=>blocked.has(f.properties.finalPartId)).map(f=>{const p=blocked.get(f.properties.finalPartId);return {zoneId:p.zoneId,partId:p.finalPartId,name:p.suggestedName,lengthKm:0,geometry:f.geometry,reviewStatus:'blocked',blockedReasons:p.blockingReasons,reviewReason:'Land- og vandsiden kunne ikke bevises automatisk. Linjen er fortsat blokeret og ikke aktiv.'}});
  const report={schemaVersion:'1.0.0',status:'private-national-final-point-review',generatedAt:new Date().toISOString(),partCount:parts.length,zoneCount:new Set(parts.map(p=>p.zoneId)).size,statusCounts:{complete:0,partial:0,blocked:parts.length},parts,reviewTitle:'Kontrol af resterende land- og vandpunkter',reviewIntro:'Den blå linje har endnu ikke et sikkert automatisk land-/vandpunkt. Kortet er privat og aktiverer intet.',attentionLabel:`${parts.length} blokerede dele`,allLabel:`Alle ${parts.length}`,storageKey:'ravradar-final-point-review-v1',scoreChanged:false,automaticActivationAllowed:false};
  const output=val('--output','.owner-review/national-owner-final/point-review.html');await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,renderOwnerReviewHtml(report));console.log(JSON.stringify({partCount:parts.length,output}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(e=>{console.error(e.stack??e.message);process.exit(1)});
