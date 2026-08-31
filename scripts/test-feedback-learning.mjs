import assert from 'node:assert/strict';
import { analyzeObservationRows } from '../js/services/learning-analysis.js';
import { remoteObservationPayload } from '../js/services/observation-service.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { summarizeHistoricalRows } from '../js/services/historical-analysis.js';
import { createCalibrationFeatureSnapshot } from '../js/services/trip-evidence-contract.js';
const binding=ravScoreModelBinding();
const features=createCalibrationFeatureSnapshot({
  modelVersion:binding.modelId,modelBinding:binding,appVersion:'4.0.317',totalScore:63,
  scoreBoundLower:63,scoreBoundUpper:63,scoreBoundModelUncertaintyPoints:0,
  scoreBoundRawLower:63,scoreBoundRawUpper:63,historyCoverageHours:48,
  scoreQuality:'FULL_HISTORY',scoreSemantics:'EXACT_POINT_SCORE',
  scoreCalibrationEligible:true,conservativeTailResetApplied:false,
  historyReasonCodes:[],huntabilityScore:70,
  transportScore:60,mobilisationScore:58,windSpeedMs:3,windDirectionDeg:270,
  waveHeightM:.3,wavePeriodS:6,waveDirectionDeg:280,currentSpeedMs:.2,
  currentDirectionDeg:260,waterLevelM:.05,waterLevelTrendM3h:0,
  maxWaveHeight24hM:1,hoursSinceEnergyPeak:3,sustainedOnshoreHours:4,reasonCodes:[],
});
const rows=Array.from({length:12},(_,i)=>{const day=String(i+1).padStart(2,'0'),snapshotId=`rr-feedback-${day}`,issued=`2026-07-${day}T10:00:00.000Z`,captured=`2026-07-${day}T11:00:00.000Z`,valid=`2026-07-${day}T12:00:00.000Z`,observed=`2026-07-${day}T11:30:00.000Z`,tripId=`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,rowFeatures=structuredClone(features);return {id:tripId,client_observation_id:tripId,trip_id:tripId,schema_version:3,data_quality_flags:[],zone_id:i<6?'a':'b',actual_zone_id:i<6?'a':'b',forecast_zone_id:i<6?'a':'b',actual_coastal_part_id:`part-${i}`,forecast_coastal_part_id:`part-${i}`,observed_at:observed,trip_started_at:captured,trip_ended_at:valid,submitted_at:valid,search_minutes:60,search_coverage:'normal',hunt_mode:i%2?'waders':'beach',calibration_eligible:true,found:Boolean(i%2),result:i%2?'good':'none',grams:i%2?4:null,model_version:binding.modelId,rav_score:63,forecast_snapshot_id:snapshotId,forecast_issued_at:issued,forecast_valid_at:valid,forecast_captured_at:captured,calibration_features:rowFeatures,weather_snapshot:{schemaVersion:4,capturedAt:captured,forecastSnapshotId:snapshotId,forecastIssuedAt:issued,forecastValidAt:valid,calibrationFeatures:structuredClone(rowFeatures)},water_level_cm:5,wind_speed_mps:3,wind_direction_deg:270,wave_height_m:.3,wave_period_s:6,current_speed_mps:.2,current_direction_deg:260};});
const result=analyzeObservationRows(rows);
assert.equal(result.status,'coverage-only');
assert.equal(result.sampleSize,12);
assert.equal(result.excludedCount,0);
assert.deepEqual(result.exclusionCounts,{});
assert.equal(result.calibrationLocked,true);
assert.equal(result.policy,'integrated-trip-schema3-current-binding-coverage-only-until-explicit-rdks-activation');
assert.deepEqual(result.suggestions,[]);
assert.equal(analyzeObservationRows(rows.slice(0,4)).status,'coverage-only');
for(const mutate of [
  row=>{row.schema_version=1;row.calibration_eligible=false;},
  row=>{row.calibration_features.modelContractSha256='0'.repeat(64);},
  row=>{row.calibration_features.modelBundleSha256='0'.repeat(64);},
  row=>{row.search_minutes=null;},
  row=>{row.model_version='RRS-CANDIDATE-G';},
  row=>{row.weather_snapshot.calibrationFeatures.modelProfileId='mixed-profile';},
  row=>{row.calibration_features.totalScore=null;row.weather_snapshot.calibrationFeatures.totalScore=null;row.rav_score=null;},
  row=>{row.calibration_features.windSpeedMs='';row.weather_snapshot.calibrationFeatures.windSpeedMs='';},
  row=>{row.calibration_features.waveHeightM=false;row.weather_snapshot.calibrationFeatures.waveHeightM=false;},
]){const row=structuredClone(rows[0]);mutate(row);const excluded=analyzeObservationRows([row]);assert.equal(excluded.sampleSize,0);assert.equal(excluded.excludedCount,1);}
const legacy=structuredClone(rows[1]);legacy.schema_version=1;legacy.calibration_eligible=false;legacy.model_version='RRS-CANDIDATE-G';
const nullMetrics=structuredClone(rows[0]);nullMetrics.rav_score=null;nullMetrics.water_level_cm='';nullMetrics.wind_speed_mps=undefined;nullMetrics.wave_height_m=null;
const historical=summarizeHistoricalRows([rows[2],nullMetrics,legacy]);
assert.equal(historical.count,1);
assert.equal(historical.totalCount,3);
assert.equal(historical.excludedCount,2);
assert.equal(historical.averages.ravScore,63);
assert.equal(historical.averages.waterLevelCm,5);
assert.equal(historical.modelGroups[binding.modelId],2);
assert.equal(historical.modelGroups['RRS-CANDIDATE-G'],1);
const local={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',zone_id:'DK-B01-01',observed_at:'2026-08-29T10:00:00.000Z',submitted_at:'2026-08-29T10:01:00.000Z',hunt_mode:'beach',result:'none',grams:null,anonymous_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',gps:{lat:55.1,lng:10.2,accuracy:4},sync_status:'pending',sync_error:'old',weather_snapshot:{schemaVersion:4,capturedAt:'2026-08-29T10:00:00.000Z',sourceGeneratedAt:null,forecastTime:null,provider:null,current:{generatedAt:null,time:null,provider:null,providerLabel:null,windSpeedMps:null,windDirectionDeg:null,waveHeightM:null,wavePeriodS:null,waveDirectionDeg:null,currentSpeedMps:null,currentDirectionDeg:null,waterLevelCm:null,waterLevelTrendCm3h:null,waterTemperatureC:null},score:{modelId:binding.modelId,baseScore:null,finalScore:null,level:null},matchedRuleIds:[]}};
const remote=remoteObservationPayload(local);
assert.equal(remote.gps,null);
assert.notEqual(remote.calibration_eligible,true);
assert.equal('sync_status' in remote,false);
assert.equal('sync_error' in remote,false);
assert.deepEqual(local.gps,{lat:55.1,lng:10.2,accuracy:4});
console.log('Feedback-dækning er scorelåst, og fjernpayloads indeholder ingen tur-GPS.');
