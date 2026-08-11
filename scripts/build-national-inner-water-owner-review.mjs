#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildReview} from './build-national-score-neutral-owner-review.mjs';
import {renderOwnerReviewHtml} from './lib/national-owner-review-html.mjs';

const TARGETED_ACTIONS=new Set(['trim-harbour-entrance','trim-inner-water','repair-continuity','retain-open-water-facing','trim-harbour-and-lake']);
const sheltered=new Set(['fjord','nor','løb','sejlløb','bredning','sund','bugt']);
const read=file=>fs.readFile(file,'utf8').then(JSON.parse);
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function selectCandidates(base,audit,owners,duplicateIds=new Set()){
  const auditById=new Map(audit.parts.map(row=>[row.partId,row])), decisions={};for(const owner of owners)Object.assign(decisions,owner.decisions??{});
  const followUpAnswered=new Set(Object.keys(owners[1]?.decisions??{}));
  const selected=[];
  for(const part of base.parts){
    if(followUpAnswered.has(part.partId)||duplicateIds.has(part.partId))continue;
    const decision=decisions[part.partId], row=auditById.get(part.partId), targeted=decision?.decision==='needs-fix'&&TARGETED_ACTIONS.has(decision.action);
    if(decision?.decision==='approved'||(decision?.decision==='needs-fix'&&!targeted))continue;
    const contexts=row?.officialWaterContext??[], exactSheltered=contexts.some(w=>Number(w.distanceM)===0&&sheltered.has(String(w.subType??'').toLocaleLowerCase('da')));
    let evidence=0; const reasons=[];
    if(Number(row?.distanceToOfficialOpenSeaKm)>=25){evidence++;reasons.push('langt fra et officielt åbent havområde')}
    if(Number(row?.harbourDistanceM)<=40){evidence++;reasons.push('meget tæt på en officiel havnegeometri')}
    if(exactSheltered){evidence++;reasons.push('ligger ved et officielt navngivet beskyttet farvand')}
    if(Number(row?.closedLoopCount)>0&&Number(row?.lengthKm)<0.8){evidence+=2;reasons.push('danner en meget lille lukket ø-/søform')}
    if(Number(row?.lengthKm)<0.5){evidence++;reasons.push('er en meget kort løs kystdel')}
    if(targeted)reasons.unshift('du har bedt om en præcis beskæring eller sammenbinding');
    if(targeted||evidence>=4)selected.push({...part,reviewStatus:'blocked',blockedReasons:[],reviewReason:reasons.join('; '),ownerAction:decision?.action??null,evidenceScore:evidence});
  }
  const unique=new Map();
  for(const part of selected.sort((a,b)=>(b.ownerAction?1:0)-(a.ownerAction?1:0)||b.evidenceScore-a.evidenceScore)){
    const key=digest(part.geometry);if(!unique.has(key))unique.set(key,part);
  }
  return [...unique.values()].sort((a,b)=>(b.ownerAction?1:0)-(a.ownerAction?1:0)||b.evidenceScore-a.evidenceScore||a.zoneId.localeCompare(b.zoneId));
}

async function main(){
  const args=process.argv.slice(2),val=(flag,fallback)=>{const i=args.indexOf(flag);return i<0?fallback:args[i+1]};
  if(args.includes('--self-test')){const base={parts:[{partId:'a',geometry:{type:'LineString',coordinates:[[1,1],[2,2]]},reviewStatus:'complete'},{partId:'b',geometry:{type:'LineString',coordinates:[[2,2],[3,3]]},reviewStatus:'complete'}]},audit={parts:[{partId:'a',distanceToOfficialOpenSeaKm:30,harbourDistanceM:20,lengthKm:.2,closedLoopCount:1,officialWaterContext:[]}]},owner={decisions:{b:{decision:'needs-fix',action:'trim-inner-water'}}};if(selectCandidates(base,audit,[owner]).length!==2)throw new Error('Indre-farvandsreview self-test fejlede');console.log('National indre-farvandsreview self-test: bestået.');return}
  const work=val('--work','.geometry-v2-work'),auditFile=val('--audit',path.join(work,'national-inner-water-candidate-audit.json')),duplicateFile=val('--duplicate-audit',path.join(work,'national-owner-review-duplicate-audit.json')),ownerFile=val('--owner','data/geometry-v2/national-owner-coastal-review-2026-08-11.json'),followUpOwnerFile=val('--follow-up-owner','data/geometry-v2/national-owner-inner-water-review-2026-08-11.json'),out=val('--output-dir','.owner-review/national-inner-water-follow-up');
  const [coastal,partitions,names,points,shadow,audit,duplicates,owner,followUpOwner]=await Promise.all(['national-coastal-parts.geojson','national-locality-partitions.geojson','national-local-part-name-suggestions.json','national-local-part-point-pairs.json','national-shadow-score-validation.json'].map(file=>read(path.join(work,file))).concat([read(auditFile),read(duplicateFile),read(ownerFile),read(followUpOwnerFile)]));
  const base=buildReview({coastal,partitions,names,points,shadow}),parts=selectCandidates(base,audit,[owner,followUpOwner],new Set(duplicates.parts.map(row=>row.partId)));
  const report={...base,status:'private-national-inner-water-follow-up-review',partCount:parts.length,zoneCount:new Set(parts.map(p=>p.zoneId)).size,statusCounts:{complete:0,partial:0,blocked:parts.length},parts,reviewTitle:'Efterkontrol af indre farvande',reviewIntro:'Her vises kun de resterende kystdele, hvor flere uafhængige tegn peger på indre farvand eller en teknisk fejl. Godkend betyder, at den blå linje er en relevant ravkyst. Vælg “Skal rettes”, hvis den helt eller delvist skal væk.',attentionLabel:`${parts.length} målrettede kontroller`,allLabel:`Alle ${parts.length}`,storageKey:'ravradar-national-inner-water-follow-up-v1'};
  await fs.mkdir(out,{recursive:true});await Promise.all([fs.writeFile(path.join(out,'review-report.json'),JSON.stringify({...report,parts:parts.map(({geometry,...rest})=>rest)},null,2)+'\n'),fs.writeFile(path.join(out,'index.html'),renderOwnerReviewHtml(report))]);console.log(JSON.stringify({partCount:parts.length,zoneCount:report.zoneCount}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.stack??error.message);process.exit(1)});
