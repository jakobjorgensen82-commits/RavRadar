import { scoreRating } from './score-presentation.js?v=4.0.317';
import {
  RAVSCORE_BEST_TIME_POLICY,
  compareRavScoreBestTimeCandidates,
  ravScoreBestTimeSelectionReason,
} from './best-time-policy.js?v=4.0.317';
import { forecastDateKeyInTimeZone } from './forecast-calendar.js?v=4.0.317';
import { RAVSCORE_CALIBRATION_ELIGIBLE } from './ravscore-model-contract.js?v=4.0.317';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const safeCount = value => Number.isSafeInteger(value) && value >= 0;
const scoreNumber = value => finite(value) && value >= 0 && value <= 100;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const HISTORY_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const HISTORY_COVERAGE_HOURS = 48;
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower','upper','modelUncertaintyPoints','rawLower','rawUpper',
]);
function strictScoreBounds(value, { available } = {}) {
  if (available === false) return value?.scoreBounds === null ? null : undefined;
  const bounds=value?.scoreBounds;
  if (!plain(bounds)
    || JSON.stringify(Object.keys(bounds).sort())!==JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || !SCORE_BOUND_FIELDS.every(field=>finite(bounds[field]))
    || bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper
    || bounds.rawLower<0||bounds.rawUpper>100||bounds.rawLower>bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints-(bounds.upper-bounds.lower))>1e-9
    || value?.score!==bounds.lower)return undefined;
  if(value?.scoreQuality==='FULL_HISTORY'
    &&(bounds.lower!==bounds.upper||bounds.rawLower!==bounds.rawUpper))return undefined;
  return { ...bounds };
}
function strictPossibleWinningParts(value) {
  if (value?.available !== true
    || typeof value.winningPartUncertain !== 'boolean'
    || !safeCount(value.possibleWinningPartCount)
    || value.possibleWinningPartCount < 1
    || !Array.isArray(value.possibleWinningParts)
    || value.possibleWinningParts.length !== value.possibleWinningPartCount) return null;
  const rows=value.possibleWinningParts.map(part=>{
    if(!plain(part)
      || JSON.stringify(Object.keys(part).sort())
        !==JSON.stringify(['name','partId','score','scoreBounds'].sort())
      || typeof part.partId!=='string'||!part.partId
      || typeof part.name!=='string'||!part.name
      || !scoreNumber(part.score))return null;
    const scoreBounds=strictScoreBounds({
      available:true,score:part.score,scoreQuality:'HISTORY_INCOMPLETE',
      scoreBounds:part.scoreBounds,
    },{available:true});
    if(!scoreBounds||scoreBounds.upper<value.score)return null;
    return {...part,scoreBounds};
  });
  if(rows.some(row=>!row))return null;
  const ids=rows.map(row=>row.partId);
  if(new Set(ids).size!==ids.length
    || JSON.stringify(ids)!==JSON.stringify([...ids].sort())
    || !rows.some(row=>row.partId===value.winningPartId&&row.score===value.score)
    || value.winningPartUncertain !== (value.scoreQuality==='HISTORY_INCOMPLETE'
      && rows.some(row=>row.partId!==value.winningPartId)))return null;
  return rows;
}
function strictScoreQuality(value, { available } = {}) {
  const historyReasonCodes = Array.isArray(value?.historyReasonCodes)
    ? value.historyReasonCodes : null;
  if (!historyReasonCodes
    || historyReasonCodes.some(code => typeof code !== 'string'
      || !HISTORY_REASON_CODE_PATTERN.test(code))
    || new Set(historyReasonCodes).size !== historyReasonCodes.length) return null;
  const scoreBounds=strictScoreBounds(value,{available});
  if(scoreBounds===undefined)return null;
  if (available === false
    && value.scoreQuality === 'UNAVAILABLE'
    && value.calibrationEligible === false
    && value.scoreSemantics === null
    && value.conservativeTailResetApplied === false
    && value.historyCoverageHours === null
    && historyReasonCodes.length === 0) {
    return {
      scoreQuality: 'UNAVAILABLE',
      calibrationEligible: false,
      scoreSemantics: null,
      conservativeTailResetApplied: false,
      historyCoverageHours: null,
      historyReasonCodes: [],
      scoreBounds:null,
    };
  }
  if (!finite(value?.historyCoverageHours)
    || value.historyCoverageHours < 0
    || value.historyCoverageHours > HISTORY_COVERAGE_HOURS) return null;
  if (available === true
    && value.scoreQuality === 'FULL_HISTORY'
    && value.calibrationEligible === RAVSCORE_CALIBRATION_ELIGIBLE
    && value.historyCoverageHours === HISTORY_COVERAGE_HOURS
    && historyReasonCodes.length === 0
    && ['EXACT_POINT_SCORE','CONSERVATIVE_TAIL_RESET_POINT_SCORE']
      .includes(value.scoreSemantics)
    && typeof value.conservativeTailResetApplied === 'boolean'
    && value.conservativeTailResetApplied
      === (value.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE')) {
    return {
      scoreQuality: value.scoreQuality,
      calibrationEligible: RAVSCORE_CALIBRATION_ELIGIBLE,
      scoreSemantics: value.scoreSemantics,
      conservativeTailResetApplied: value.conservativeTailResetApplied,
      historyCoverageHours: value.historyCoverageHours,
      historyReasonCodes: [],
      scoreBounds,
    };
  }
  if (available === true
    && value.scoreQuality === 'HISTORY_INCOMPLETE'
    && RAVSCORE_CALIBRATION_ELIGIBLE === true
    && value.calibrationEligible === false
    && historyReasonCodes.length > 0
    && value.scoreSemantics === 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
    && typeof value.conservativeTailResetApplied === 'boolean') {
    return {
      scoreQuality: value.scoreQuality,
      calibrationEligible: false,
      scoreSemantics: value.scoreSemantics,
      conservativeTailResetApplied: value.conservativeTailResetApplied,
      historyCoverageHours: value.historyCoverageHours,
      historyReasonCodes: [...historyReasonCodes],
      scoreBounds,
    };
  }
  return null;
}
const WEATHER_NUMBER_RULES = Object.freeze({
  windSpeedMps:[0, Number.POSITIVE_INFINITY], windDirectionDeg:[0, 360],
  airTemperatureC:[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waveHeightM:[0, Number.POSITIVE_INFINITY], waveDirectionDeg:[0, 360],
  wavePeriodS:[0, Number.POSITIVE_INFINITY],
  waterLevelCm:[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  waterLevelTrendCm3h:[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
  currentSpeedMps:[0, Number.POSITIVE_INFINITY], currentDirectionDeg:[0, 360],
  waterTemperatureC:[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
});
const PROVENANCE_FIELDS = Object.freeze([
  'status','reason','provider','collection','source','sourceClass','controlledLivePilot',
  'temporalResolution','verticalLayer','vectorSelection','vectorSemanticsVersion','method',
  'fallback','distanceKm',
]);
const strictComponents = value => {
  if (!plain(value)) return null;
  const projected=Object.fromEntries(['huntability','transport','release'].map(key=>[key,value[key]]));
  return Object.values(projected).every(scoreNumber) ? projected : null;
};
const safePoint = value => Array.isArray(value) && value.length === 2 && value.every(finite)
  ? [...value] : null;
function safeWeather(value,time){
  if(!plain(value))return null;
  const result={time};
  for(const field of ['provider','providerLabel'])if(typeof value[field]==='string')result[field]=value[field];
  for(const [field,[minimum,maximum]] of Object.entries(WEATHER_NUMBER_RULES)){
    const candidate=value[field];
    result[field]=finite(candidate)&&candidate>=minimum&&candidate<=maximum?candidate:null;
  }
  if(plain(value.currentProvenance)){
    const provenance=Object.fromEntries(PROVENANCE_FIELDS
      .filter(field=>value.currentProvenance[field]!==undefined)
      .map(field=>[field,value.currentProvenance[field]]));
    if(!finite(provenance.distanceKm)||provenance.distanceKm<0||provenance.distanceKm>15)delete provenance.distanceKm;
    if(!Number.isSafeInteger(provenance.vectorSemanticsVersion)||provenance.vectorSemanticsVersion<1)delete provenance.vectorSemanticsVersion;
    result.currentProvenance=provenance;
  }
  return result;
}
const coverageReason = value => value?.comparisonPartCount <= 1
  ? 'Der er kun beregnet én kystdel. Derfor kan forskelle inden for zonen endnu ikke sammenlignes.'
  : value?.status === 'whole-zone'
  ? 'Kystdelene ligger højst 7 point fra hinanden, så scoren gælder hele zonen.'
  : value?.status === 'only-part'
    ? `${value.winningPartName} scorer mere end 7 point bedre end en eller flere andre dele af zonen.`
    : `Flere navngivne kystdele ligger inden for 7 point af zonens højeste score.`;

export function localCoverageSummary(value) {
  if (!value || !scoreNumber(value.score)
    || !safeCount(value.comparisonPartCount) || value.comparisonPartCount < 1) return null;
  if (value.comparisonPartCount <= 1) return {
    kind:'single-part',
    title:'Kun én kystdel er beregnet',
    text:'Der er ikke flere beregnede kystdele at sammenligne. Det betyder ikke, at forholdene nødvendigvis er ens i hele zonen.'
  };
  if (value.status === 'whole-zone') return {
    kind:'whole-zone',
    title:'Forholdene gælder hele zonen',
    text:`Forskellen mellem zonens kystdele er ${value.scoreSpread} point og dermed højst 7 point.`
  };
  const parts=(value.parts || []).filter(part=>finite(part.score));
  return {
    kind:value.status,
    title:value.status === 'only-part' ? `Bedste del: ${value.winningPartName}` : 'Bedste dele af zonen',
    text:value.status === 'only-part'
      ? `${value.winningPartName} har RavScore ${value.score}. Det er denne del – ikke nødvendigvis resten af zonen – som giver zonen dens viste score.`
      : `Disse kystdele ligger inden for 7 point af den bedste: ${parts.map(part=>`${part.name} (${part.score})`).join(', ')}. Andre dele af zonen scorer lavere.`,
    parts
  };
}

export function buildLocalZoneScore({coastalParts,zoneId,mode,time}) {
  const rows=(coastalParts?.zones?.[zoneId]?.hourly || []).filter(row=>Number.isFinite(Date.parse(row?.time||'')));
  if(!coastalParts?.enabled || !rows.length)return null;
  const target=Date.parse(time || coastalParts.generatedAt || new Date().toISOString());
  const row=rows.reduce((best,item)=>Math.abs(Date.parse(item.time)-target)<Math.abs(Date.parse(best.time)-target)?item:best,rows[0]);
  const rawValue=row?.[mode];
  const zoneExpectedCount=coastalParts?.zones?.[zoneId]?.expectedPartCount;
  const comparisonPartCount=safeCount(rawValue?.comparisonPartCount)
    ? rawValue.comparisonPartCount
    : rawValue?.comparisonPartCount==null&&safeCount(zoneExpectedCount)?zoneExpectedCount:null;
  const value=plain(rawValue)?{...rawValue,comparisonPartCount}:rawValue;
  const projectedComponents=strictComponents(value?.components);
  const availableQuality=strictScoreQuality(value,{available:true});
  const possibleWinningParts=strictPossibleWinningParts(value);
  if(!scoreNumber(value?.score)
    || !safeCount(comparisonPartCount) || comparisonPartCount<1
    || !projectedComponents
    || !availableQuality
    || !possibleWinningParts
    || ['uncertain','unavailable'].includes(value?.status)){
    const reasons=(value?.reasons||[]).filter(Boolean);
    const unavailableQuality=strictScoreQuality(value,{available:false}) || {
      scoreQuality:'UNAVAILABLE',
      calibrationEligible:false,
      scoreSemantics:null,
      conservativeTailResetApplied:false,
      historyCoverageHours:null,
      historyReasonCodes:[],
    };
    return {
      available:false,score:null,level:'unavailable',label:'RavScore midlertidigt utilgængelig',
      scoreBounds:null,
      ...unavailableQuality,
      reasons:reasons.length?reasons:['Det sammenhængende datagrundlag til RavScore mangler for denne zone lige nu.'],
      unavailability:{
        policy:'integrated-model-local-fail-closed',
        validPartCount:safeCount(value?.validPartCount)?value.validPartCount:null,
        expectedPartCount:safeCount(value?.expectedPartCount)?value.expectedPartCount
          : safeCount(zoneExpectedCount)?zoneExpectedCount:null,
        parts:value?.unavailableParts||[],
      },
      localCoverage:value||null,
      time:row.time,
    };
  }
  const rating=scoreRating(value.score);
  const winner=coastalParts.parts?.[value.winningPartId];
  const exact=winner?.current?.time === row.time ? winner.current?.[mode] : null;
  const components=strictComponents(exact?.components) || projectedComponents;
  const detailedReasons=exact?.componentReasons || value.componentReasons || {};
  const generic=coverageReason(value);
  const componentReasons=Object.fromEntries(['huntability','transport','release'].map(key=>[
    key,
    detailedReasons[key]?.length ? detailedReasons[key] : finite(components[key]) ? [generic] : []
  ]));
  return {
    available:true,score:value.score,baseScore:value.score,level:rating.level,label:rating.label,
    ...availableQuality,
    winningPartId:value.winningPartId,
    winningPartName:value.winningPartName,
    winningPartUncertain:value.winningPartUncertain,
    possibleWinningPartCount:possibleWinningParts.length,
    possibleWinningParts,
    components,componentReasons,reasons:[generic],localCoverage:value,localCoverageSummary:localCoverageSummary(value),
    explanation:exact?.explanation || value.explanation || null,localPart:true,time:row.time,
    localPartId:value.winningPartId,localPartName:value.winningPartName,
    localWeather:value.weather ? safeWeather(value.weather,row.time)
      : exact ? safeWeather(winner?.current?.weather,row.time) : null,
    localZone:winner ? {
      id:value.winningPartId,name:winner.name,
      dataPoint:safePoint(winner.waterPoint),pinPoint:safePoint(winner.landPoint),
      onshoreDirectionDeg:finite(winner.onshoreDirectionDeg)
        && winner.onshoreDirectionDeg>=0&&winner.onshoreDirectionDeg<=360
        ? winner.onshoreDirectionDeg:null,
      onshoreDirectionSource:winner.onshoreDirectionSource || 'Godkendt land-/havpunkt for kystdelen'
    } : null
  };
}

export function selectLocalBestForDay({coastalParts,zoneId,mode,date,now=Date.now()}) {
  const nowMs = now instanceof Date
    ? now.getTime()
    : typeof now === 'number'
      ? now
      : Date.parse(now);
  const today = Number.isFinite(nowMs) ? forecastDateKeyInTimeZone(nowMs) : null;
  const pastToleranceMs = RAVSCORE_BEST_TIME_POLICY.currentDayPastToleranceMinutes * 60_000;
  const candidates=(coastalParts?.zones?.[zoneId]?.hourly || [])
    .filter(row=>row?.time && forecastDateKeyInTimeZone(row.time)===date)
    .filter(row=>date!==today || Date.parse(row.time)>=nowMs-pastToleranceMs)
    .map(row=>({row,result:buildLocalZoneScore({coastalParts,zoneId,mode,time:row.time})}))
    .filter(item=>item.result?.available)
    .map(item=>({ ...item, hour:{ ...(item.result.localWeather||{}), time:item.row.time } }))
    .sort((a,b)=>compareRavScoreBestTimeCandidates(a,b,mode));
  if(!candidates.length)return null;
  const best=candidates[0];
  return {
    hour:best.hour,
    result:best.result,
    recommended:true,
    selectionReason:ravScoreBestTimeSelectionReason(candidates,mode),
    isNow:Math.abs(Date.parse(best.row.time)-nowMs)<3600000,
    source:'local-coastal-part',
    displayScope:'local',
    candidates:candidates.map(item=>({
      time:item.row.time,
      score:item.result.score,
      scoreQuality:item.result.scoreQuality,
      calibrationEligible:item.result.calibrationEligible,
      scoreSemantics:item.result.scoreSemantics,
      conservativeTailResetApplied:item.result.conservativeTailResetApplied,
      historyCoverageHours:item.result.historyCoverageHours,
      historyReasonCodes:[...item.result.historyReasonCodes],
      scoreBounds:{...item.result.scoreBounds},
      winningPartUncertain:item.result.winningPartUncertain,
      possibleWinningPartCount:item.result.possibleWinningPartCount,
      possibleWinningParts:item.result.possibleWinningParts.map(part=>({
        ...part,scoreBounds:{...part.scoreBounds},
      })),
      source:'local-coastal-part',
      isNow:Math.abs(Date.parse(item.row.time)-nowMs)<3600000,
    }))
  };
}
