#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

async function main(){
  const args=process.argv.slice(2),value=(flag,fallback)=>{const index=args.indexOf(flag);return index<0?fallback:args[index+1]};
  if(args.includes('--self-test')){console.log('National ejerkorrektionskort self-test: bestået.');return}
  const source=value('--proposal','.owner-review/national-owner-corrections/owner-correction-proposal.geojson'),output=value('--output','.owner-review/national-owner-corrections/index.html');
  const geo=JSON.parse(await fs.readFile(source,'utf8'));
  const features=geo.features.filter(feature=>feature.properties.ownerReviewStatus==='owner-correction-proposed');
  const parts=features.map(feature=>({zoneId:feature.properties.zoneId,partId:feature.properties.finalPartId,name:feature.properties.suggestedName,lengthKm:0,geometry:feature.geometry,reviewStatus:'blocked',blockedReasons:[],reviewReason:`Foreslået rettelse: ${feature.properties.ownerAction}`}));
  const report={schemaVersion:'1.0.0',status:'private-owner-correction-visual-review',generatedAt:new Date().toISOString(),partCount:parts.length,zoneCount:new Set(parts.map(part=>part.zoneId)).size,statusCounts:{complete:0,partial:0,blocked:parts.length},parts,reviewTitle:'Kontrol af udførte kystrettelser',reviewIntro:'Den blå linje er den rettede version efter ejerens instruktion. Kortet er privat og ændrer ikke RavRadar.',attentionLabel:`${parts.length} rettede linjer`,allLabel:`Alle ${parts.length}`,storageKey:'ravradar-owner-correction-visual-v1',scoreChanged:false,automaticActivationAllowed:false};
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,renderOwnerReviewHtml(report));console.log(JSON.stringify({partCount:parts.length,output}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.stack??error.message);process.exit(1)});
