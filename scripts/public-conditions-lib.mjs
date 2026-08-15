import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const HOURLY_FIELDS = [
  'time','windSpeedMps','windDirectionDeg','airTemperatureC','waveHeightM','waveDirectionDeg','wavePeriodS',
  'waterLevelCm','waterLevelTrendCm3h','currentSpeedMps','currentDirectionDeg','waterTemperatureC'
];
const CURRENT_FIELDS = HOURLY_FIELDS.filter(key => key !== 'time' && key !== 'airTemperatureC');
const HISTORY_FIELDS = ['maxWind24hMps','maxWave24hM','hoursSinceHighEnergy','strongEventDurationHours','hoursSinceStrongEventEnd','inboundCurrentDurationHours','inboundCurrentMomentum','outboundCurrentDurationHours','outboundCurrentPressure','activeCurrentRegime','activeCurrentRegimeDurationHours','activeCurrentRegimeMomentum','activeCurrentRegimeStability','activeCurrentRegimeSampleCount','verifiedCurrentCoverageHours','unverifiedCurrentSampleCount','currentDirectionStability','mobilisationPotential','nearshorePotential','eventPhase','stateModelMode'];
const pick=(source,fields)=>Object.fromEntries(fields.filter(key=>source?.[key]!==undefined).map(key=>[key,source[key]]));
const nearestRow=(rows,time)=>{
  const target=Date.parse(time||'');
  const valid=(rows||[]).filter(row=>Number.isFinite(Date.parse(row?.time)));
  if(!valid.length)return null;
  if(!Number.isFinite(target))return valid[0];
  return valid.reduce((best,row)=>Math.abs(Date.parse(row.time)-target)<Math.abs(Date.parse(best.time)-target)?row:best,valid[0]);
};

function buildStartupCoastalParts(full){
  const source=full?.coastalParts;if(!source)return null;
  const zones={};const winnerIds=new Set();
  for(const [zoneId,zone] of Object.entries(source.zones||{})){
    const row=nearestRow(zone.hourly,full?.generatedAt);
    for(const mode of ['waders','beach'])if(row?.[mode]?.winningPartId)winnerIds.add(row[mode].winningPartId);
    zones[zoneId]={expectedPartCount:zone.expectedPartCount||0,scoredPartCount:zone.scoredPartCount||0,hourly:row?[row]:[]};
  }
  const parts=Object.fromEntries([...winnerIds].filter(id=>source.parts?.[id]).map(id=>[id,source.parts[id]]));
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,marginPoints:source.marginPoints||7,expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts,zones};
}

function buildDetailedCoastalParts(full){
  const source=full?.coastalParts;if(!source)return null;
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,marginPoints:source.marginPoints||7,expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts:source.parts||{},zones:source.zones||{}};
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
  return {schemaVersion:2,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,source:'RavRadar public runtime projection',zones,coastalParts};
}

export function buildPublicConditionDetails(full){
  const zones=Object.fromEntries(Object.entries(full?.zones||{}).map(([zoneId,zone])=>{
    const forecast=zone?.forecast||{};
    return [zoneId,{forecast:{provider:forecast.provider||zone?.provider||null,providerLabel:forecast.providerLabel||zone?.providerLabel||null,generatedAt:forecast.generatedAt||full?.generatedAt||null,validUntil:forecast.validUntil||null,hourly:(forecast.hourly||[]).map(hour=>pick(hour,HOURLY_FIELDS))}}];
  }));
  return {schemaVersion:1,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,zones,coastalParts:buildDetailedCoastalParts(full)};
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
    validUntil:validUntilValues.length?new Date(Math.max(...validUntilValues)).toISOString():new Date(Date.parse(generatedAt)+8*3600000).toISOString(),
    zoneCount:Object.keys(full?.zones||{}).length,
    coastalPartCount:Number(full?.coastalParts?.expectedPartCount||0),
    conditionsPath:'./public-conditions.json',
    conditionDetailsPath:'./public-condition-details.json',
    fullConditionsPath:'./conditions.json',
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
