#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONTRACT='.geometry-v2-work/blaavand-weather-shadow-contract.json';
const DEFAULT_STATE='.geometry-v2-work/blaavand-state-history-validation.json';
const DEFAULT_REPORT='.geometry-v2-work/blaavand-score-neutral-ui-review.json';
const DEFAULT_HTML='.geometry-v2-work/blaavand-score-neutral-ui-review.html';
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function buildUiReview(contract,state){
  if(contract?.status!=='private-shadow-contract-ready'||state?.status!=='passed-private-state-history-isolation')throw new Error('UI-gaten kræver bestået shadow-kontrakt og state-/historikisolation');
  if(contract.zoneId!==state.zoneId||contract.parts?.length!==2||state.series?.length!==2)throw new Error('UI-gaten kræver samme parent-zone og præcis to kystdele');
  if(contract.parentRuntimeTruth?.remainsAuthoritative!==true||state.scoreChanged!==false||state.publicRuntimeChanged!==false)throw new Error('Parent-runtime eller score er ikke bevist uændret');
  const stateParts=new Set(state.series.map(part=>part.partId));
  const parts=contract.parts.map((part,index)=>{
    if(!stateParts.has(part.partId)||part.scoreEnabled!==false||part.publicProjectionEnabled!==false||part.automaticActivationAllowed!==false)throw new Error(`${part.partId} er ikke score-neutral og privat`);
    return {partId:part.partId,label:`Kystdel ${index+1}`,displayStyle:index===0?'neutral-dash-a':'neutral-dash-b',statusLabel:'Privat forslag · ikke aktiv',clickable:false,tooltipEnabled:false,scoreShown:false,scoreColorUsed:false,rankingShown:false,bestPartBadgeShown:false,weatherDetailsShown:false,stateDetailsShown:false};
  });
  return {schemaVersion:'1.0.0',status:'passed-private-score-neutral-ui-review',generatedAt:new Date().toISOString(),zoneId:contract.zoneId,
    parentPresentation:{singleActiveZone:true,selectedZoneId:contract.zoneId,existingRavScoreLineRetained:true,existingRavScoreColorRetained:true,existingClickTargetRetained:true,existingTooltipRetained:true,existingScoreRetained:true,existingRankingRetained:true,replacedByPart:false},
    privatePartPresentation:{parts,neutralStylesOnly:true,dashedOutlinesOnly:true,privateStatusLabelRequired:true,partScoresForbidden:true,partScoreColorsForbidden:true,partRankingForbidden:true,bestPartSelectionForbidden:true,partInteractionForbidden:true},
    reviewArtifact:{privateOnly:true,containsRawWeatherValues:false,containsStateMetrics:false,containsCredentials:false,containsRequestUrls:false,productionBundleIncluded:false},
    activationGatesRemaining:['central-admin-roundtrip-and-rollback','explicit-owner-go-no-go-before-any-score-or-production-activation'],
    productionGeometryChanged:false,adminDataChanged:false,weatherSamplingChanged:false,stateChanged:false,publicRuntimeChanged:false,scoreChanged:false,automaticActivationAllowed:false};
}

export function renderHtml(report){
  const parts=report.privatePartPresentation.parts;
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Privat score-neutral UI-kontrol</title><style>
  :root{color-scheme:dark}body{margin:0;background:#11191d;color:#eef6f5;font:16px system-ui,sans-serif}.wrap{max-width:880px;margin:auto;padding:28px}.notice{padding:12px 16px;border:1px solid #74858b;background:#1d292e;border-radius:9px}.map{position:relative;height:430px;margin:22px 0;background:linear-gradient(145deg,#39494d,#24383d 45%,#182a31);border:1px solid #60747a;border-radius:14px;overflow:hidden}.land{position:absolute;inset:0 0 0 46%;background:#59614e;clip-path:polygon(32% 0,100% 0,100% 100%,8% 100%,17% 70%,3% 45%,26% 25%)}svg{position:absolute;inset:0;width:100%;height:100%}.parent{fill:none;stroke:#e6a700;stroke-width:12;stroke-linecap:butt}.part{fill:none;stroke-width:4;stroke-dasharray:10 8;opacity:.96}.a{stroke:#d9e3e5}.b{stroke:#8fc6d4}.label{position:absolute;background:#111a1edb;border:1px solid #91a1a6;border-radius:7px;padding:7px 9px;font-size:13px}.parent-label{left:42%;top:45%;border-color:#e6a700}.p1{left:22%;top:13%}.p2{left:23%;bottom:12%}.legend{display:grid;gap:10px}.key{display:flex;align-items:center;gap:12px}.line{width:55px;border-top:8px solid #e6a700}.dash{border-top:4px dashed #d9e3e5}.rules{columns:2;line-height:1.7}@media(max-width:650px){.rules{columns:1}.map{height:330px}}
  </style></head><body><main class="wrap"><h1>Privat UI-kontrol · ${esc(report.zoneId)}</h1><p class="notice"><b>Kun review.</b> Én aktiv zone. Kystdelene er ikke aktive, har ingen egen score og kan ikke vælges.</p><section class="map" aria-label="Skematisk privat UI-review"><div class="land"></div><svg viewBox="0 0 880 430" role="img" aria-label="Aktiv parentlinje med to neutrale private delkonturer"><path class="parent" d="M430 0 C400 75 470 130 405 205 C350 270 430 330 365 430"/><path class="part a" d="M430 0 C400 75 470 130 405 205"/><path class="part b" d="M405 205 C350 270 430 330 365 430"/></svg><span class="label parent-label">Aktiv parentlinje · eksisterende RavScore-farve</span><span class="label p1">${esc(parts[0].label)} · ${esc(parts[0].statusLabel)}</span><span class="label p2">${esc(parts[1].label)} · ${esc(parts[1].statusLabel)}</span></section><section class="legend"><div class="key"><span class="line"></span><span>Eksisterende aktive zonelinje; farven styres fortsat kun af parent-zonens RavScore.</span></div><div class="key"><span class="line dash"></span><span>Neutral stiplet delkontur; ingen scorefarve, klik, tooltip eller rangering.</span></div></section><h2>Bindende visningsregler</h2><ul class="rules"><li>Parent-score og farvelinje bevares</li><li>Ingen “bedste del”</li><li>Ingen delscore eller scorefarve</li><li>Ingen delrangering</li><li>Ingen delklik eller tooltip</li><li>Ingen vejr- eller stateværdier</li><li>Tydelig privat/ikke aktiv-status</li><li>Ingen offentlig integration</li></ul></main></body></html>`;
}

export function selfTest(){
  const parts=['north','southeast'].map(partId=>({partId,scoreEnabled:false,publicProjectionEnabled:false,automaticActivationAllowed:false}));
  const contract={status:'private-shadow-contract-ready',zoneId:'Z',parts,parentRuntimeTruth:{remainsAuthoritative:true}};
  const state={status:'passed-private-state-history-isolation',zoneId:'Z',series:parts,scoreChanged:false,publicRuntimeChanged:false};
  const report=buildUiReview(contract,state),html=renderHtml(report);
  if(report.status!=='passed-private-score-neutral-ui-review'||!report.parentPresentation.existingRavScoreColorRetained||report.privatePartPresentation.parts.some(part=>part.scoreColorUsed||part.clickable))throw new Error('Gyldig score-neutral UI-kontrakt blev afvist');
  if(!html.includes('Ingen delscore')||html.includes('currentSpeedMps'))throw new Error('Review-HTML bryder UI-kontrakten');
  const broken=structuredClone(contract);broken.parts[0].scoreEnabled=true;
  try{buildUiReview(broken,state);throw new Error('Aktiv delscore blev accepteret');}catch(error){if(error.message==='Aktiv delscore blev accepteret')throw error;}
  console.log('Blåvand privat score-neutral UI-review self-test: bestået');
}

async function main(){
  if(process.argv.includes('--self-test')){selfTest();return;}
  const args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
  const contractPath=value('--contract',DEFAULT_CONTRACT),statePath=value('--state',DEFAULT_STATE),reportPath=value('--output',DEFAULT_REPORT),htmlPath=value('--html',DEFAULT_HTML);
  const [contract,state]=await Promise.all([contractPath,statePath].map(file=>fs.readFile(file,'utf8').then(JSON.parse)));
  const report=buildUiReview(contract,state);await fs.mkdir(path.dirname(reportPath),{recursive:true});
  await Promise.all([fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n','utf8'),fs.writeFile(htmlPath,renderHtml(report),'utf8')]);
  console.log(JSON.stringify({status:report.status,partCount:report.privatePartPresentation.parts.length,parentRavScoreColorRetained:true,scoreChanged:false}));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]))main().catch(error=>{console.error(error.message);process.exit(1)});
