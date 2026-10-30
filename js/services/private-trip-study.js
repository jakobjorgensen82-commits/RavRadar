import {PUBLIC_CONFIG} from '../../config.js?v=4.0.592';
import {readAdminDocumentNow} from './admin-document-store.js?v=4.0.592';
import {myAccess,hasPermission} from './permissions-service.js?v=4.0.592';
import {requireFreshSession,authIdentityEpoch,currentSession,authorizedFetch} from './auth-service.js?v=4.0.592';
import {isExactCalibrationModelBinding} from './calibration-eligibility.js?v=4.0.592';
const CELLS=['windSpeedMs','waveHeightM','currentSpeedMs','waterLevelTrendM3h']
  .flatMap(metric=>Array.from({length:5},(_,i)=>['find','no-find'].map(outcome=>metric+':'+i+':'+outcome))).flat().sort();
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const fail=()=>{throw Error('PRIVATE_TRIP_STUDY_UNAVAILABLE');};
function closedPeriod(period){
  if(!exact(period,['start','end'])||typeof period.start!=='string'||typeof period.end!=='string')fail();
  const start=new Date(period.start),end=new Date(period.end),now=new Date(Date.now());
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||start.toISOString()!==period.start||end.toISOString()!==period.end
    ||+start!==Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),1)
    ||+end!==Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1)
    ||+end>Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1))fail();
  return period;
}
function periodForKey(key){
  if(typeof key!=='string'||!/^trip-weather-study-\d{4}-(0[1-9]|1[0-2])$/.test(key))fail();
  const start=key.slice('trip-weather-study-'.length)+'-01T00:00:00.000Z',date=new Date(start);
  return closedPeriod({start,end:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)).toISOString()});
}
export function assertPrivateTripStudyDisplayReport(report,period){
  closedPeriod(period);
  if(!exact(report,['schemaVersion','kind','cohort','period','modelBinding','policyId','policySha256','originStatus',
    'weatherStatus','verifiedCalibrationContributors','publicReleaseIssued','cells'])||report.schemaVersion!==2
    ||report.kind!=='PRIVATE_UNISSUED_DP_REVIEW_REPORT'||report.cohort!=='DESCRIPTIVE_SELF_REPORTED_NO_CALIBRATION'
    ||!exact(report.period,['start','end'])||report.period.start!==period.start||report.period.end!==period.end
    ||!isExactCalibrationModelBinding(report.modelBinding)||report.policyId!=='rr-self-reported-geometric-v2-UNISSUED'
    ||report.policySha256!=='3587b34f5e3c96f328a56a954db84560977a1e1c614732bbb9887962792a13c9'
    ||report.originStatus!=='UNKNOWN_NOT_TEST_FREE'||report.weatherStatus!=='SELF_REPORTED_NOT_SERVER_ATTESTED'
    ||report.verifiedCalibrationContributors!==0||report.publicReleaseIssued!==false
    ||!Array.isArray(report.cells)||report.cells.length!==40)fail();
  for(let i=0;i<40;i++)if(!exact(report.cells[i],['cell','noisyCount'])||report.cells[i].cell!==CELLS[i]
    ||!Number.isSafeInteger(report.cells[i].noisyCount)||report.cells[i].noisyCount<0||report.cells[i].noisyCount>1000)fail();
  return report;
}
// Kun metadata om allerede sete månedsnøgler; hver læsning kræver stadig frisk adgang.
// Dette er ikke et vedvarende revisionsbevis på tværs af browsersessioner.
let seen=null;
export async function readPrivateTripStudyForOwner(){
  await requireFreshSession();const identity=authIdentityEpoch(),owner=currentSession()?.user?.id;
  const sameOwner=()=>{if(!owner||authIdentityEpoch()!==identity||currentSession()?.user?.id!==owner)fail();};
  const permitted=async()=>{const access=await myAccess();sameOwner();
    if(access?.profile?.is_active!==true||access.profile.id!==owner||!hasPermission(access,'full_admin'))fail();};
  await permitted();
  if(seen&&(seen.owner!==owner||seen.identity!==identity))seen=null;
  const latest=async()=>{
    const url=PUBLIC_CONFIG.supabaseUrl+'/rest/v1/admin_documents?select=document_key,version'
      +'&document_key=like.trip-weather-study-*&order=document_key.desc&limit=1';
    const {response,body}=await authorizedFetch(url,{cache:'no-store'},{consumeJson:true,expectedUserId:owner});sameOwner();
    if(!response.ok||!Array.isArray(body)||body.length!==1||!exact(body[0],['document_key','version'])
      ||!Number.isSafeInteger(body[0].version)||body[0].version<1)fail();
    const item=body[0];periodForKey(item.document_key);
    if(seen&&(item.document_key<seen.key||(item.document_key===seen.key&&item.version!==seen.version)))fail();
    return item;
  };
  const selected=await latest(),period=periodForKey(selected.document_key);
  const row=await readAdminDocumentNow(selected.document_key);sameOwner();
  if(!row?.payload||row.version!==selected.version)fail();
  assertPrivateTripStudyDisplayReport(row.payload,period);
  const confirmed=await latest();await permitted();
  if(confirmed.document_key!==selected.document_key||confirmed.version!==selected.version)fail();
  // En samtidig nyere vellykket læsning må heller ikke rulles tilbage af dette svar.
  if(seen&&(selected.document_key<seen.key||(selected.document_key===seen.key&&selected.version!==seen.version)))fail();
  seen={owner,identity,key:selected.document_key,version:selected.version};
  return structuredClone(row.payload); // Ingen adminrække, kontoidentitet eller driftsdiagnostik.
}
