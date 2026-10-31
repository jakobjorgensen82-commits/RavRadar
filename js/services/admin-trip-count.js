import { PUBLIC_CONFIG } from '../../config.js?v=4.0.594';
import { requireFreshSession, authIdentityEpoch, currentSession, authorizedFetch } from './auth-service.js?v=4.0.594';
import { myAccess, hasPermission } from './permissions-service.js?v=4.0.594';

const SCOPE='active-d1-all-stored-rows-including-test-legacy-anonymous';
const unavailable=()=>{throw Error('ADMIN_TRIP_COUNT_UNAVAILABLE');};
export async function loadAdminTripCount(){
 await requireFreshSession();const identity=authIdentityEpoch(),owner=currentSession()?.user?.id;
 const same=()=>{if(!owner||authIdentityEpoch()!==identity||currentSession()?.user?.id!==owner)unavailable();};
 const permitted=async()=>{const access=await myAccess();same();
  if(access?.profile?.id!==owner||access.profile.is_active!==true||!hasPermission(access,'full_admin'))unavailable();};
 await permitted();
 if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.supabasePublishableKey)unavailable();
 const {response,body}=await authorizedFetch(PUBLIC_CONFIG.supabaseUrl+'/functions/v1/trip-log',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'admin-count'}),cache:'no-store',
 },{consumeJson:true,expectedUserId:owner,timeoutMs:20_000});
 same();
 if(!response.ok||!body||Object.keys(body).sort().join(',')!=='completedAt,markedTestCount,scope,startedAt,storedCount'
  ||body.scope!==SCOPE||!Number.isSafeInteger(body.storedCount)||body.storedCount<0
  ||!Number.isSafeInteger(body.markedTestCount)||body.markedTestCount<0||body.markedTestCount>body.storedCount)unavailable();
 for(const key of ['startedAt','completedAt'])if(typeof body[key]!=='string'||!Number.isFinite(Date.parse(body[key]))
  ||new Date(body[key]).toISOString()!==body[key])unavailable();
 if(Date.parse(body.completedAt)<Date.parse(body.startedAt))unavailable();
 await permitted();same();
 return {...body};
}
