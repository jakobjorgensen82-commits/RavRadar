import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { selectLatestLocalScoreRowAtOrBefore } from './lib/local-current-reference.mjs';
import { selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { addNationalRanking, compareNationalRankingRows } from '../js/core/zone-ranking.js';
import {
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  isReconstructedTransportEvidence,
  ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
  ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
  RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
} from '../js/core/ravscore-regime-memory.js';

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

export function buildPublicRavScoreEvidenceTrust(full) {
  const parts = Object.values(full?.coastalParts?.parts || {});
  const rows = parts.map(part => {
    const evidence = part?.candidateG?.currentState?.transportEvidence || [];
    const invalidMarker = evidence.some(item =>
      (item?.incidentId !== undefined || item?.provenance !== undefined)
      && !isReconstructedTransportEvidence(item));
    const synthetic = evidence.filter(isReconstructedTransportEvidence);
    return { part, synthetic, invalidMarker };
  });
  const active = rows.filter(row => row.synthetic.length > 0);
  const binding = full?.coastalParts?.evidenceTrust;
  if (!active.length) {
    const verifiedAggregate = binding == null || (binding?.schemaVersion === 1
      && binding?.status === 'VERIFIED_ONLY'
      && binding?.calibrationEligible === true
      && binding?.hardObservedOuttransportEligible === true
      && binding?.incidentId === null
      && Number(binding?.affectedPartCount) === 0
      && Number(binding?.syntheticSampleCount) === 0
      && binding?.activeUntil === null);
    const verifiedParts = rows.every(({ part, invalidMarker }) => {
      const trust = part?.candidateG?.evidenceTrust;
      return !invalidMarker && (trust == null || (trust?.status === 'VERIFIED_ONLY'
        && trust?.calibrationEligible === true
        && trust?.hardObservedOuttransportEligible === true
        && trust?.incidentId === null
        && Number(trust?.syntheticSampleCount) === 0
        && trust?.activeUntil === null));
    });
    if (!verifiedAggregate || !verifiedParts) {
      throw new Error('Candidate G-evidenstillid kan ikke nedklassificeres til målt uden et rent markerfrit state.');
    }
    return {
      schemaVersion: 1,
      status: 'VERIFIED_ONLY',
      calibrationEligible: true,
      hardObservedOuttransportEligible: true,
      incidentId: null,
      affectedPartCount: 0,
      syntheticSampleCount: 0,
      activeUntil: null,
    };
  }
  const syntheticTimes = active.flatMap(row => row.synthetic.map(item => Date.parse(item?.time)));
  const validSyntheticRows = rows.every(({ part, synthetic, invalidMarker }) => {
    const trust = part?.candidateG?.evidenceTrust;
    if (invalidMarker) return false;
    if (!synthetic.length) {
      return trust == null || (trust?.status === 'VERIFIED_ONLY'
        && trust?.calibrationEligible === true
        && trust?.hardObservedOuttransportEligible === true
        && trust?.incidentId === null
        && Number(trust?.syntheticSampleCount) === 0
        && trust?.activeUntil === null);
    }
    const times = synthetic.map(item => Date.parse(item?.time));
    const latest = Math.max(...times);
    return times.every(Number.isFinite)
      && synthetic.every(item => Number.isFinite(item?.strength)
        && Number(item.strength) >= -1 && Number(item.strength) <= 1)
      && trust?.status === RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS
      && trust?.evidenceClassification === RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION
      && trust?.calibrationEligible === false
      && trust?.hardObservedOuttransportEligible === false
      && trust?.incidentId === ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
      && Number(trust?.syntheticSampleCount) === synthetic.length
      && trust?.activeUntil === new Date(latest
        + CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * 3_600_000).toISOString();
  });
  const syntheticSampleCount = active.reduce((sum, row) => sum + row.synthetic.length, 0);
  const latestSyntheticMs = Math.max(...syntheticTimes);
  const activeUntil = Number.isFinite(latestSyntheticMs)
    ? new Date(latestSyntheticMs
      + CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.windowHours * 3_600_000).toISOString()
    : null;
  const validBinding = binding?.schemaVersion === 1
    && binding?.status === RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS
    && binding?.incidentId === ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID
    && binding?.decisionId === ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID
    && binding?.method === RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD
    && binding?.evidenceClassification === RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION
    && binding?.calibrationEligible === false
    && binding?.hardObservedOuttransportEligible === false
    && /^[a-f0-9]{64}$/.test(String(binding?.descriptorSha256 || ''))
    && Number(binding?.affectedPartCount) === active.length
    && Number(binding?.syntheticSampleCount) === syntheticSampleCount
    && binding?.activeUntil === activeUntil;
  if (!validSyntheticRows || !validBinding) {
    throw new Error('Rekonstrueret Candidate G-evidens mangler en entydig forseglet provenancebinding.');
  }
  return {
    schemaVersion: 1,
    status: RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS,
    incidentId: ONE_TIME_GAP_RECONSTRUCTION_INCIDENT_ID,
    decisionId: ONE_TIME_GAP_RECONSTRUCTION_DECISION_ID,
    method: RECONSTRUCTED_TRANSPORT_EVIDENCE_METHOD,
    evidenceClassification: RECONSTRUCTED_TRANSPORT_EVIDENCE_CLASSIFICATION,
    calibrationEligible: false,
    hardObservedOuttransportEligible: false,
    descriptorSha256: binding.descriptorSha256,
    affectedPartCount: active.length,
    syntheticSampleCount,
    activeUntil,
  };
}

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
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||source.productionReferenceAt||null,marginPoints:source.marginPoints||7,scoreProfile:source.scoreProfile||null,scoreAvailability:source.scoreAvailability||null,evidenceTrust:buildPublicRavScoreEvidenceTrust(full),expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts,zones};
}

function publicDetailedPartsWithEvidenceTrust(parts, evidenceTrust) {
  return Object.fromEntries(Object.entries(parts || {}).map(([partId, part]) => {
    if (!part?.candidateG) return [partId, part];
    const modes = Object.fromEntries(Object.entries(part.candidateG.modes || {}).map(([mode, result]) => [
      mode,
      result && typeof result === 'object' ? { ...result, evidenceTrust } : result,
    ]));
    return [partId, {
      ...part,
      candidateG: {
        ...part.candidateG,
        evidenceTrust,
        modes,
      },
    }];
  }));
}

function buildDetailedCoastalParts(full){
  const source=full?.coastalParts;if(!source)return null;
  const evidenceTrust=buildPublicRavScoreEvidenceTrust(full);
  const zones=Object.fromEntries(Object.entries(source.zones||{}).map(([zoneId,zone])=>{
    const row=currentLocalRow(zone,source,full);
    return [zoneId,{...zone,currentReferenceAt:row?.time||null}];
  }));
  return {schemaVersion:source.schemaVersion,enabled:source.enabled===true,datasetVersion:source.datasetVersion||null,sourceRunId:source.sourceRunId||null,generatedAt:source.generatedAt||full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||source.productionReferenceAt||null,marginPoints:source.marginPoints||7,scoreProfile:source.scoreProfile||null,scoreAvailability:source.scoreAvailability||null,evidenceTrust,expectedPartCount:source.expectedPartCount||0,scoredPartCount:source.scoredPartCount||0,parts:publicDetailedPartsWithEvidenceTrust(source.parts,evidenceTrust),zones};
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
  return {schemaVersion:2,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||null,source:'RavRadar public runtime projection',ravScoreEvidenceTrust:buildPublicRavScoreEvidenceTrust(full),currentPilot,nationalForecast:buildPublicNationalForecast(full),zones,coastalParts};
}

export function buildPublicConditionDetails(full){
  const zones=Object.fromEntries(Object.entries(full?.zones||{}).map(([zoneId,zone])=>{
    const forecast=zone?.forecast||{};
    return [zoneId,{forecast:{provider:forecast.provider||zone?.provider||null,providerLabel:forecast.providerLabel||zone?.providerLabel||null,generatedAt:forecast.generatedAt||full?.generatedAt||null,validUntil:forecast.validUntil||null,hourly:(forecast.hourly||[]).map(hour=>pick(hour,HOURLY_FIELDS))}}];
  }));
  return {schemaVersion:1,datasetId:full?.datasetId||null,generatedAt:full?.generatedAt||null,productionReferenceAt:full?.productionReferenceAt||null,ravScoreEvidenceTrust:buildPublicRavScoreEvidenceTrust(full),currentPilot:full?.controlledLiveCurrentPilot||null,zones,coastalParts:buildDetailedCoastalParts(full)};
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
    ravScoreEvidenceTrust:buildPublicRavScoreEvidenceTrust(full),
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
