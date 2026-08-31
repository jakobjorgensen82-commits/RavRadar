import { buildPublicConditions, buildPublicConditionDetails, compactJson, buildPublicManifest } from './public-conditions-lib.mjs';
import { mergeConditionDetails } from '../js/services/data-service.js';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import { ravScoreVerifiedEvidenceTrust } from '../js/core/ravscore-evidence-trust-contract.js';

const generatedAt='2026-08-15T10:00:00.000Z';
const modelBinding=ravScoreModelBinding();
const scoreProfile=resolvePublicRavScoreProfile({modelCoverageReady:true,modelMemoryReady:true,modelMigrationReady:true});
const fullHistoryQuality=value=>({scoreQuality:'FULL_HISTORY',calibrationEligible:true,scoreSemantics:'EXACT_POINT_SCORE',conservativeTailResetApplied:false,scoreBounds:{lower:value,upper:value,modelUncertaintyPoints:0,rawLower:value,rawUpper:value},historyCoverageHours:48,historyReasonCodes:[]});
const unavailableQuality={scoreQuality:'UNAVAILABLE',calibrationEligible:false,scoreSemantics:null,conservativeTailResetApplied:false,scoreBounds:null,historyCoverageHours:null,historyReasonCodes:[],unavailability:{code:'FIXTURE_MISSING',messageDa:'Fixture mangler.'}};
const score=(partId,value)=>{
  const quality=fullHistoryQuality(value);
  return {available:true,...quality,modelBinding,explanation:{...modelBinding},status:'only-part',score:value,winningPartId:partId,winningPartName:partId,winningPartUncertain:false,possibleWinningPartCount:1,possibleWinningParts:[{partId,name:partId,score:value,scoreBounds:{...quality.scoreBounds}}],scoreSpread:9,comparisonPartCount:3,components:{huntability:20,transport:30,release:10},parts:[{partId,name:partId,score:value}]};
};
const rows=[0,1,2].map(hour=>({time:`2026-08-15T${String(9+hour).padStart(2,'0')}:00:00.000Z`,waders:score(hour===1?'p1':'p2',60+hour),beach:score(hour===1?'p2':'p1',50+hour)}));
rows[1]={time:rows[1].time,waders:{available:false,score:null,...unavailableQuality,modelBinding,status:'uncertain',validPartCount:2,expectedPartCount:3},beach:{available:false,score:null,...unavailableQuality,modelBinding,status:'uncertain',validPartCount:2,expectedPartCount:3}};
const selectedReferenceAt=rows[1].time;
const part=id=>({zoneId:'z1',name:id,waterPoint:[10,56],landPoint:[10.01,56],onshoreDirectionDeg:90,current:{time:selectedReferenceAt,weather:{windSpeedMps:4},waders:{available:true,...fullHistoryQuality(62),modelBinding,score:62,components:{huntability:60,transport:62,release:64},componentReasons:{},explanation:null},beach:{available:true,...fullHistoryQuality(52),modelBinding,score:52,components:{huntability:50,transport:52,release:54},componentReasons:{},explanation:null}}});
const scoreAvailability={schemaVersion:1,policy:'integrated-model-local-fail-closed',allZonesActive:false,allCurrentScoresFullHistory:false,activeZoneCount:0,fullHistoryModeCount:0,historyIncompleteModeCount:0,historyIncompleteZoneCount:0,historyIncompleteZones:[],unavailableZoneCount:1,totalZoneCount:1,unavailableZones:[{zoneId:'z1',zoneName:'Testzone',modes:['waders','beach'],reasons:['Den integrerede RavScore mangler komplette data.']}]};
const full={datasetId:'progressive-test',generatedAt,productionReferenceAt:generatedAt,zones:{z1:{provider:'dmi',current:{time:generatedAt,windSpeedMps:4},history:{maxWave24hM:1.3,hoursSinceHighEnergy:6,maxWind24hMps:8},forecast:{provider:'dmi',generatedAt,validUntil:rows.at(-1).time,hourly:rows.map(row=>({time:row.time,windSpeedMps:4}))}}},coastalParts:{schemaVersion:2,enabled:true,generatedAt,modelBinding,evidenceTrust:ravScoreVerifiedEvidenceTrust(),scoreProfile,scoreAvailability,expectedPartCount:3,scoredPartCount:3,privateDiagnostic:'må aldrig publiceres',parts:{p1:part('p1'),p2:part('p2'),p3:part('p3')},zones:{z1:{expectedPartCount:3,scoredPartCount:3,hourly:rows}}}};

const startup=buildPublicConditions(full);
const details=buildPublicConditionDetails(full);
if(startup.zones.z1.forecast.hourly.length!==0)throw new Error('Startpakken indeholder stadig hele femdøgnsprognosen.');
if(startup.zones.z1.current.windSpeedMps!==4
  || startup.zones.z1.history.maxWave24hM!==1.3
  || startup.zones.z1.history.hoursSinceHighEnergy!==6
  || 'maxWind24hMps' in startup.zones.z1.history)throw new Error('Startpakken mistede aktuelle forhold eller den eksakte modeluafhængige turhistorik-allowliste.');
if(startup.coastalParts.zones.z1.hourly.length!==1||startup.coastalParts.zones.z1.hourly[0].time!==selectedReferenceAt)throw new Error('Startpakken valgte ikke zonens faktiske nærmeste scorerække med lokal integreret status.');
if(startup.coastalParts.zones.z1.currentReferenceAt!==selectedReferenceAt||details.coastalParts.zones.z1.currentReferenceAt!==selectedReferenceAt)throw new Error('Zonens fælles current-reference føres ikke gennem begge offentlige pakker.');
if(startup.productionReferenceAt!==generatedAt||details.productionReferenceAt!==generatedAt)throw new Error('Produktionstidspunktet føres ikke gennem begge offentlige pakker.');
if(Object.keys(startup.coastalParts.parts).length!==0)throw new Error('En lokalt utilgængelig scorerække må ikke opfinde eller genbruge tidligere vindere.');
if(startup.coastalParts.scoreAvailability?.allZonesActive!==false||details.coastalParts.scoreAvailability?.unavailableZones?.[0]?.zoneId!=='z1')throw new Error('Den integrerede tilgængelighed føres ikke gennem begge offentlige pakker.');
if(startup.nationalForecast?.schemaVersion!==2||startup.nationalForecast?.modes?.waders?.[0]?.rows?.[0]?.zoneId!=='z1'||startup.nationalForecast?.modes?.waders?.[0]?.rows?.[0]?.score!==62)throw new Error('Startpakken mangler det deterministiske kompakte femdøgnsindeks.');
if(details.zones.z1.forecast.hourly.length!==3||details.coastalParts.zones.z1.hourly.length!==3||Object.keys(details.coastalParts.parts).length!==3)throw new Error('Detaljepakken bevarer ikke hele prognosen og alle kystdele.');
if('privateDiagnostic' in details.coastalParts)throw new Error('Detaljepakken lækkede et ikke-offentligt kystdelsfelt.');
const merged=mergeConditionDetails({...startup,available:true},details);
if(merged.zones.z1.forecast.hourly.length!==3||merged.coastalParts.parts.p3?.name!=='p3'||!merged.detailsAvailable)throw new Error('Progressiv sammenfletning genskaber ikke den fulde offentlige funktion.');
let mismatchRejected=false;try{mergeConditionDetails(startup,{...details,datasetId:'other'});}catch{mismatchRejected=true;}
if(!mismatchRejected)throw new Error('Detaljer fra et andet datasæt blev ikke afvist.');
let timeMismatchRejected=false;try{mergeConditionDetails(startup,{...details,productionReferenceAt:'2026-08-15T12:00:00.000Z'});}catch{timeMismatchRejected=true;}
if(!timeMismatchRejected)throw new Error('Detaljer fra et andet produktionstidspunkt blev ikke afvist.');
let trustMismatchRejected=false;try{mergeConditionDetails(startup,{...details,ravScoreEvidenceTrust:{...details.ravScoreEvidenceTrust,unexpected:true}});}catch{trustMismatchRejected=true;}
if(!trustMismatchRejected)throw new Error('Detaljer med ændret eller udvidet RavScore-evidenstillid blev ikke afvist.');
const zoneRegistryText=compactJson({type:'FeatureCollection',features:[{type:'Feature',properties:{id:'z1',zoneStatus:'active'},geometry:null}]});
const startText=compactJson(startup),detailsText=compactJson(details);
let incompleteManifestRejected=false;
try{buildPublicManifest(full,startText,detailsText,'{}\n',zoneRegistryText);}catch(error){incompleteManifestRejected=/complete 210\/673 package/.test(String(error?.message));}
if(!incompleteManifestRejected)throw new Error('En progressiv, lokalt ufuldstændig fixture blev fejlagtigt accepteret som et komplet offentligt manifest.');
console.log(`OK: progressiv offentlig runtime bevarer funktioner og reducerer syntetisk startpayload fra ${Buffer.byteLength(detailsText)} til ${Buffer.byteLength(startText)} bytes.`);
