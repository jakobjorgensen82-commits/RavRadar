import fs from 'node:fs';

const source=fs.readFileSync('scripts/build-national-weather-shadow-contract.py','utf8');
const policy=JSON.parse(fs.readFileSync('data/geometry-v2/national-weather-shadow-policy.json','utf8'));
const workflow=fs.readFileSync('.github/workflows/update-and-deploy.yml','utf8');
for(const marker of ['private-national-shadow-contract-ready','seriesId','historyKey','coverageGaps','crossPartMergeDetected','parentFallbackDetected','rawWeatherValuesStored','publicProjectionEnabled','automaticActivationAllowed'])if(!source.includes(marker))throw new Error(`National shadow-kontrakt mangler ${marker}`);
if(policy.mergePolicy.crossPartMergeAllowed!==false||policy.mergePolicy.parentFallbackAllowed!==false||policy.mergePolicy.missingRemainsMissing!==true)throw new Error('National shadow-policy tillader ulovlig merge/fallback');
for(const marker of ['python scripts/build-national-weather-shadow-contract.py','python scripts/validate-national-multi-step-series.py','node scripts/validate-national-state-history.mjs','python scripts/validate-national-local-part-wind-series.py','national-weather-shadow-contract.json','national-multi-step-series-validation.json','national-state-history-validation.json','national-local-part-wind-series.json'])if(!workflow.includes(marker))throw new Error(`Workflow mangler ${marker}`);
const multi=fs.readFileSync('scripts/validate-national-multi-step-series.py','utf8');
for(const marker of ['passed-private-national-multi-step-series-validation','minimumCompleteStepsPerAvailableFamily','rawWeatherValuesStored','crossPartMergeDetected','parentFallbackDetected'])if(!multi.includes(marker))throw new Error(`National flertrinsvalidator mangler ${marker}`);
const state=fs.readFileSync('scripts/validate-national-state-history.mjs','utf8');
for(const marker of ['passed-private-national-state-history-isolation','MISSING_DKSS_CURRENT_FAMILY','transientReplayInputDeleted','scoreInfluenceObserved','parentHistoryReuseDetected','crossPartHistoryReadDetected'])if(!state.includes(marker))throw new Error(`National statevalidator mangler ${marker}`);
const wind=fs.readFileSync('scripts/validate-national-local-part-wind-series.py','utf8');
for(const marker of ['harmonie_dini_sf','passed-private-national-native-wind-series-validation','wind-u-10m','wind-v-10m','rawWeatherValuesStored','parentFallbackDetected'])if(!wind.includes(marker))throw new Error(`National vindvalidator mangler ${marker}`);
console.log('National weather-shadow kontrakt: bestået.');
