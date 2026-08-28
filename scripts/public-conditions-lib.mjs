import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { selectLatestLocalScoreRowAtOrBefore } from './lib/local-current-reference.mjs';
import { selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';

const HOURLY_FIELDS = [
  'time','windSpeedMps','windDirectionDeg','airTemperatureC','waveHeightM','waveDirectionDeg','wavePeriodS',
  'waterLevelCm','waterLevelTrendCm3h','currentSpeedMps','currentDirectionDeg','waterTemperatureC'
];
const CURRENT_FIELDS = HOURLY_FIELDS.filter(key => key !== 'time' && key !== 'airTemperatureC');
const HISTORY_FIELDS = ['maxWind24hMps','maxWave24hM','hoursSinceHighEnergy','strongEventDurationHours','hoursSinceStrongEventEnd','inboundCurrentDurationHours','inboundCurrentMomentum','outboundCurrentDurationHours','outboundCurrentPressure','activeCurrentRegime','activeCurrentRegimeDurationHours','activeCurrentRegimeMomentum','activeCurrentRegimeStability','activeCurrentRegimeSampleCount','verifiedCurrentCoverageHours','unverifiedCurrentSampleCount','currentDirectionStability','mobilisationPotential','nearshorePotential','eventPhase','stateModelMode'];
const pick=(source,fields)=>Object.fromEntries(fields.filter(key=>source?.[key]!==undefined).map(key=>[key,source[key]]));
const STARTUP_SCORE_FIELDS = [
  'available','status','score','winningPartId','winningPartName','scoreSpread','comparisonPartCount',
  'validPartCount','expectedPartCount','components','weather'
];
const STARTUP_PART_FIELDS = ['id','zoneId','name','waterPoint','landPoint','onshoreDirectionDeg','onshoreDirectionSource'];
const compactCoverageParts = parts => (parts || []).map(part => pick(part, ['partId','name','score']));
const compactFlowPoints = value => value ? pick(value, ['current','wind','sources']) : null;
const compactStartupScore = value => value ? {
  ...pick(value, STARTUP_SCORE_FIELDS),
  ...(Array.isArray(value.parts) ? { parts: compactCoverageParts(value.parts) } : {}),
} : value;
const compactStartupRow = row => row ? {
  time: row.time,
  waders: compactStartupScore(row.waders),
  beach: compactStartupScore(row.beach),
} : null;
const currentLocalRow=(zone,source,full)=>{
  const explicit=Date.parse(zone?.currentReferenceAt||'');
  const exact=Number.isFinite(explicit)
    ? (zone?.hourly||[]).find(row=>Date.parse(row?.time||'')===explicit)
    : null;
  return exact||selectLatestLocalScoreRowAtOrBefore(
    zone?.hourly,
    full?.productionReferenceAt||source?.productionReferenceAt||full?.generatedAt||source?.generatedAt
  );
};

export function buildStartupCoastalParts(full){
  const source=full?.coastalParts;if(!source)return null;
  const zones={};const winnerIds=new Set();
  for(const [zoneId,zone] of Object.entries(source.zones||{})){
    const row=currentLocalRow(zone,source,full);
    for(const mode of ['waders','beach'])if(row?.[mode]?.winningPartId)winnerIds.add(row[mode].winningPartId);
    const startupRow=compactStartupRow(row);
    zones[zoneId]={expectedPartCount:zone.expectedPartCount||0,scoredPartCount:zone.scoredPartCount||0,currentReferenceAt:startupRow?.time||null,hourly:startupRow?[startupRow]:[]};
  }
  const parts=Object.fromEntries([...winnerIds].filter(id=>source.parts?.[id]).map(id=>{
    const part=source.parts[id];
    const flowPoints=compactFlowPoints(part.flowPoints);
    return [id,{...pick(part,STARTUP_PART_FIELDS),...(flowPoints?{flowPoints}:{})}];
  }));
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||source.productionReferenceAt||null,marginPoints:source.marginPoints||7,scoreProfile:source.scoreProfile||null,scoreAvailability:source.scoreAvailability||null,expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts,zones};
}

function buildDetailedCoastalParts(full){
  const source=full?.coastalParts;if(!source)return null;
  const zones=Object.fromEntries(Object.entries(source.zones||{}).map(([zoneId,zone])=>{
    const row=currentLocalRow(zone,source,full);
    return [zoneId,{...zone,currentReferenceAt:row?.time||null}];
  }));
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||source.productionReferenceAt||null,marginPoints:source.marginPoints||7,scoreProfile:source.scoreProfile||null,scoreAvailability:source.scoreAvailability||null,expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts:source.parts||{},zones};
}

const PUBLIC_FORECAST_MODES = ['waders', 'beach'];

function publicForecastDates(full) {
  return [...new Set(Object.values(full?.zones || {})
    .flatMap(zone => zone?.forecast?.hourly || [])
    .map(row => String(row?.time || '').slice(0, 10))
    .filter(Boolean))].sort().slice(0, 5);
}

function publicPartsByZone(source) {
  const byZone = new Map();
  for (const part of Object.values(source?.parts || {})) {
    if (!part?.zoneId) continue;
    if (!byZone.has(part.zoneId)) byZone.set(part.zoneId, []);
    byZone.get(part.zoneId).push(part);
  }
  return byZone;
}

// Den nationale femdøgnsliste er et lille, deterministisk indeks over den
// samme Candidate G-runtime som detaljepakken. Browseren behøver derfor ikke
// hente og genberegne alle 210 zoner/673 dele for at vise fem top-5-lister.
export function buildPublicNationalForecast(full) {
  const source = full?.coastalParts;
  const dates = publicForecastDates(full);
  const partsByZone = publicPartsByZone(source);
  const modes = Object.fromEntries(PUBLIC_FORECAST_MODES.map(mode => [mode, dates.map(date => {
    const ranked = Object.keys(source?.zones || {}).flatMap(zoneId => {
      const best = selectLocalBestForDay({ coastalParts: source, zoneId, mode, date, now: 0 });
      if (!best) return [];
      return [addNationalRanking({
        zoneId,
        time: best.hour.time,
        result: best.result,
      }, partsByZone.get(zoneId) || [])];
    }).sort(compareNationalRankingRows).slice(0, 5);
    return {
      date,
      rows: ranked.map(row => ({
        zoneId: row.zoneId,
        time: row.time,
        score: row.result.score,
        rankingScore: row.rankingScore,
        rankingDisplayScore: row.rankingDisplayScore,
      })),
    };
  })]));
  return { schemaVersion: 1, dates, modes };
}

export function buildPublicConditions(full){
  const zones={};
  for(const [zoneId,zone] of Object.entries(full?.zones||{})){
    const forecast=zone?.forecast||{};
    zones[zoneId]={
      provider:zone?.provider||null,
      providerLabel:zone?.providerLabel||null,
      flowPoints:zone?.flowPoints||null,
      currentSource:zone?.sources?.current?.provider||null,
      current:pick(zone?.current||{},CURRENT_FIELDS),
      history:pick(zone?.history||{},HISTORY_FIELDS),
      forecast:{
        provider:forecast.provider||zone?.provider||null,
        providerLabel:forecast.providerLabel||zone?.providerLabel||null,
        generatedAt:forecast.generatedAt||full?.generatedAt||null,
        validUntil:forecast.validUntil||null,
        hourly:[]
      }
    };
  }
  const coastalParts=buildStartupCoastalParts(full);
  const currentPilot=full?.controlledLiveCurrentPilot?{
    mode:full.controlledLiveCurrentPilot.mode||null,
    enabled:full.controlledLiveCurrentPilot.enabled===true,
    historyPath:full.controlledLiveCurrentPilot.historyPath||'./current-pilot-history.json',
    generatedAt:full.controlledLiveCurrentPilot.generatedAt||null,
  }:null;
  return {schemaVersion:2,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||null,source:'RavRadar public runtime projection',currentPilot,nationalForecast:buildPublicNationalForecast(full),zones,coastalParts};
}

export function buildPublicConditionDetails(full){
  const zones=Object.fromEntries(Object.entries(full?.zones||{}).map(([zoneId,zone])=>{
    const forecast=zone?.forecast||{};
    return [zoneId,{forecast:{provider:forecast.provider||zone?.provider||null,providerLabel:forecast.providerLabel||zone?.providerLabel||null,generatedAt:forecast.generatedAt||full?.generatedAt||null,validUntil:forecast.validUntil||null,hourly:(forecast.hourly||[]).map(hour=>pick(hour,HOURLY_FIELDS))}}];
  }));
  return {schemaVersion:1,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||null,currentPilot:full?.controlledLiveCurrentPilot||null,zones,coastalParts:buildDetailedCoastalParts(full)};
}
export function compactJson(value){return `${JSON.stringify(value)}\n`;}
export function sha256Text(text){return crypto.createHash('sha256').update(text).digest('hex');}

export function buildPublicManifest(full, publicText, detailsText){
  const validUntilValues=Object.values(full?.zones||{}).flatMap(zone=>[zone?.forecast?.validUntil,zone?.dmiCache?.validUntil]).filter(Boolean).map(Date.parse).filter(Number.isFinite);
  const generatedAt=full?.generatedAt||new Date().toISOString();
  return {
    schemaVersion:2,
    datasetId:full?.datasetId||null,
    generatedAt,
    productionReferenceAt:full?.productionReferenceAt||null,
    validUntil:validUntilValues.length?new Date(Math.max(...validUntilValues)).toISOString():new Date(Date.parse(generatedAt)+8*3600000).toISOString(),
    zoneCount:Object.keys(full?.zones||{}).length,
    coastalPartCount:Number(full?.coastalParts?.expectedPartCount||0),
    conditionsPath:'./public-conditions.json',
    conditionDetailsPath:'./public-condition-details.json',
    fullConditionsPath:'./conditions.json',
    currentPilotHistoryPath:'./current-pilot-history.json',
    currentPilotMode:full?.controlledLiveCurrentPilot?.mode||null,
    ravScoreProfile:full?.coastalParts?.scoreProfile||null,
    ravScoreAvailability:full?.coastalParts?.scoreAvailability||null,
    publicConditionsSha256:sha256Text(publicText),
    publicConditionsBytes:Buffer.byteLength(publicText),
    publicConditionDetailsSha256:sha256Text(detailsText),
    publicConditionDetailsBytes:Buffer.byteLength(detailsText),
    complete:true
  };
}

export async function writePublicRuntimeFromFull(full,{publicPath='data/live/public-conditions.json',detailsPath='data/live/public-condition-details.json',manifestPath='data/live/manifest.json'}={}){
  if(!full?.datasetId) throw new Error('conditions.json mangler datasetId.');
  const publicDocument=buildPublicConditions(full);
  const detailsDocument=buildPublicConditionDetails(full);
  const publicText=compactJson(publicDocument);
  const detailsText=compactJson(detailsDocument);
  const manifest=buildPublicManifest(full,publicText,detailsText);
  await fs.writeFile(publicPath,publicText);
  await fs.writeFile(detailsPath,detailsText);
  await fs.writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
  return {publicDocument,detailsDocument,manifest,publicText,detailsText};
}
