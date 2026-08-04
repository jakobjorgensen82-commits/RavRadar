import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const HOURLY_FIELDS = [
  'time','windSpeedMps','windDirectionDeg','airTemperatureC','waveHeightM','waveDirectionDeg','wavePeriodS',
  'waterLevelCm','waterLevelTrendCm3h','currentSpeedMps','currentDirectionDeg','waterTemperatureC'
];
const CURRENT_FIELDS = HOURLY_FIELDS.filter(key => key !== 'time' && key !== 'airTemperatureC');
const HISTORY_FIELDS = ['maxWind24hMps','maxWave24hM','hoursSinceHighEnergy'];
const pick=(source,fields)=>Object.fromEntries(fields.filter(key=>source?.[key]!==undefined).map(key=>[key,source[key]]));

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
      waterLevel:zone?.waterLevel?.routing?{
        source:zone.waterLevel.source||null,
        reference:zone.waterLevel.reference||null,
        modelBiasCm:zone.waterLevel.modelBiasCm??null,
        routing:{
          mode:zone.waterLevel.routing.mode||null,
          method:zone.waterLevel.routing.method||null,
          biasCm:zone.waterLevel.routing.biasCm??null,
          stationIds:(zone.waterLevel.routing.stationIds||[]).map(String),
          stations:(zone.waterLevel.routing.stations||[]).map(station=>({stationId:String(station.stationId||''),name:station.name||null,weight:station.weight??null,distanceKm:station.distanceKm??null,side:station.side||null}))
        }
      }:null,
      forecast:{
        provider:forecast.provider||zone?.provider||null,
        providerLabel:forecast.providerLabel||zone?.providerLabel||null,
        generatedAt:forecast.generatedAt||full?.generatedAt||null,
        validUntil:forecast.validUntil||null,
        hourly:(forecast.hourly||[]).map(hour=>pick(hour,HOURLY_FIELDS))
      }
    };
  }
  return {schemaVersion:1,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,source:'RavRadar public runtime projection',zones};
}
export function compactJson(value){return `${JSON.stringify(value)}\n`;}
export function sha256Text(text){return crypto.createHash('sha256').update(text).digest('hex');}

export function buildPublicManifest(full, publicText){
  const validUntilValues=Object.values(full?.zones||{}).flatMap(zone=>[zone?.forecast?.validUntil,zone?.dmiCache?.validUntil]).filter(Boolean).map(Date.parse).filter(Number.isFinite);
  const generatedAt=full?.generatedAt||new Date().toISOString();
  return {
    schemaVersion:2,
    datasetId:full?.datasetId||null,
    generatedAt,
    validUntil:validUntilValues.length?new Date(Math.max(...validUntilValues)).toISOString():new Date(Date.parse(generatedAt)+8*3600000).toISOString(),
    zoneCount:Object.keys(full?.zones||{}).length,
    conditionsPath:'./public-conditions.json',
    fullConditionsPath:'./conditions.json',
    publicConditionsSha256:sha256Text(publicText),
    publicConditionsBytes:Buffer.byteLength(publicText),
    complete:true
  };
}

export async function writePublicRuntimeFromFull(full,{publicPath='data/live/public-conditions.json',manifestPath='data/live/manifest.json'}={}){
  if(!full?.datasetId) throw new Error('conditions.json mangler datasetId.');
  const publicDocument=buildPublicConditions(full);
  const publicText=compactJson(publicDocument);
  const manifest=buildPublicManifest(full,publicText);
  await fs.writeFile(publicPath,publicText);
  await fs.writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`);
  return {publicDocument,manifest,publicText};
}
