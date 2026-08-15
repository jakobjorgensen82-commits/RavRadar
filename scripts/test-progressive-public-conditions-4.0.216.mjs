import { buildPublicConditions, buildPublicConditionDetails, compactJson, buildPublicManifest } from './public-conditions-lib.mjs';
import { mergeConditionDetails } from '../js/services/data-service.js';

const generatedAt='2026-08-15T10:00:00.000Z';
const score=(partId,value)=>({status:'only-part',score:value,winningPartId:partId,winningPartName:partId,scoreSpread:9,comparisonPartCount:2,components:{huntability:20,transport:30,release:10},parts:[{partId,name:partId,score:value}]});
const rows=[0,1,2].map(hour=>({time:`2026-08-15T${String(9+hour).padStart(2,'0')}:00:00.000Z`,waders:score(hour===1?'p1':'p2',60+hour),beach:score(hour===1?'p2':'p1',50+hour)}));
const part=id=>({zoneId:'z1',name:id,waterPoint:[10,56],landPoint:[10.01,56],onshoreDirectionDeg:90,current:{time:generatedAt,weather:{windSpeedMps:4},waders:{score:61,components:{},componentReasons:{},explanation:id},beach:{score:51,components:{},componentReasons:{},explanation:id}}});
const full={datasetId:'progressive-test',generatedAt,zones:{z1:{provider:'dmi',current:{time:generatedAt,windSpeedMps:4},history:{maxWind24hMps:8},forecast:{provider:'dmi',generatedAt,validUntil:rows.at(-1).time,hourly:rows.map(row=>({time:row.time,windSpeedMps:4}))}}},coastalParts:{schemaVersion:1,enabled:true,generatedAt,expectedPartCount:3,scoredPartCount:3,privateDiagnostic:'må aldrig publiceres',parts:{p1:part('p1'),p2:part('p2'),p3:part('p3')},zones:{z1:{expectedPartCount:3,scoredPartCount:3,hourly:rows}}}};

const startup=buildPublicConditions(full);
const details=buildPublicConditionDetails(full);
if(startup.zones.z1.forecast.hourly.length!==0)throw new Error('Startpakken indeholder stadig hele femdøgnsprognosen.');
if(startup.zones.z1.current.windSpeedMps!==4||startup.zones.z1.history.maxWind24hMps!==8)throw new Error('Startpakken mistede aktuelle forhold eller kompakt historik.');
if(startup.coastalParts.zones.z1.hourly.length!==1||startup.coastalParts.zones.z1.hourly[0].time!==generatedAt)throw new Error('Startpakken har ikke præcis den aktuelle lokale scorerække.');
if(Object.keys(startup.coastalParts.parts).sort().join(',')!=='p1,p2')throw new Error('Startpakken skal kun medtage aktuelle vindere for begge jagtformer.');
if(details.zones.z1.forecast.hourly.length!==3||details.coastalParts.zones.z1.hourly.length!==3||Object.keys(details.coastalParts.parts).length!==3)throw new Error('Detaljepakken bevarer ikke hele prognosen og alle kystdele.');
if('privateDiagnostic' in details.coastalParts)throw new Error('Detaljepakken lækkede et ikke-offentligt kystdelsfelt.');
const merged=mergeConditionDetails({...startup,available:true},details);
if(merged.zones.z1.forecast.hourly.length!==3||merged.coastalParts.parts.p3?.name!=='p3'||!merged.detailsAvailable)throw new Error('Progressiv sammenfletning genskaber ikke den fulde offentlige funktion.');
let mismatchRejected=false;try{mergeConditionDetails(startup,{...details,datasetId:'other'});}catch{mismatchRejected=true;}
if(!mismatchRejected)throw new Error('Detaljer fra et andet datasæt blev ikke afvist.');
const startText=compactJson(startup),detailsText=compactJson(details),manifest=buildPublicManifest(full,startText,detailsText);
if(manifest.conditionDetailsPath!=='./public-condition-details.json'||manifest.publicConditionDetailsBytes!==Buffer.byteLength(detailsText))throw new Error('Manifestet mangler den integritetsbundne detaljepakke.');
console.log(`OK: progressiv offentlig runtime bevarer funktioner og reducerer syntetisk startpayload fra ${Buffer.byteLength(detailsText)} til ${Buffer.byteLength(startText)} bytes.`);
