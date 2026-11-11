import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { firstVisitToday, localDay, recordPublicPageView } from '../js/services/visit-counter.js';

const values=new Map();
const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
const now=new Date(2026,7,15,12,0,0);
assert.equal(localDay(now),'2026-08-15');
assert.equal(firstVisitToday(storage,now),true);
assert.equal(firstVisitToday(storage,now),false);
assert.equal(firstVisitToday(storage,new Date(2026,7,16,0,1,0)),true);

const calls=[];
assert.equal(await recordPublicPageView({storage:{getItem:()=>null,setItem:()=>{}},now,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true};}}),true);
assert.equal(calls.length,1);
assert.equal(JSON.parse(calls[0].options.body).p_new_visit,true);
assert.equal(calls[0].options.keepalive,true);

const sql=await fs.readFile('supabase/migrations/20260815_private_visitor_statistics.sql','utf8');
for(const forbidden of ['ip_address','user_agent','fingerprint','referrer','latitude','longitude']) assert.equal(sql.includes(forbidden),false,`SQL må ikke lagre ${forbidden}`);
assert.match(sql,/registeredAccounts/);
assert.match(sql,/enable row level security/);
assert.match(sql,/revoke all on table public\.visitor_statistics_daily/);

const bootstrap=await fs.readFile('bootstrap.js','utf8');
assert.match(bootstrap,/schedulePublicPageView/);
assert.doesNotMatch(bootstrap,/await schedulePublicPageView/);
const admin=await fs.readFile('js/ui/admin-dashboard.js','utf8');
for(const marker of ['visitors:renderVisitors','Privat besøgsstatistik','Sidevisninger','Browserbesøg','Konti på RavRadar','Besøg i den valgte periode','Datofilteret gælder besøgstallene','registeredAccounts','activeAccounts']) assert.ok(admin.includes(marker),`Adminrapport mangler ${marker}`);
assert.match(admin,/visitors:'full_admin'/);
console.log('Privat besøgsstatistik: sessionstælling, dataminimering, kontotal og ikke-blokerende opstart er bestået.');

// Exercise the normal authenticated report caller with synthetic fetch responses.
const fromDay='2026-08-01', toDay='2026-08-15';
const authSession={access_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'synthetic-admin'}};
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(authSession)}});
let reportReply, reportStatus=200;
globalThis.fetch=async(url,options)=>{
 if(url.endsWith('/record_account_activity')) return new Response(null,{status:204});
 assert.ok(url.endsWith('/get_ravradar_visitor_report'));
 assert.deepEqual(JSON.parse(options.body),{p_from_day:fromDay,p_to_day:toDay});
 return new Response(reportReply,{status:reportStatus});
};
const { loadVisitorReport }=await import('../js/services/visitor-report-service.js');
const zero={fromDay,toDay,pageViews:0,browserVisits:0,registeredAccounts:3,activeAccounts:2,days:[]};
reportReply=JSON.stringify(zero);
assert.deepEqual(await loadVisitorReport(fromDay,toDay),zero);
for(const malformed of [null,{}, {...zero,toDay:'2026-08-14'}, {...zero,pageViews:null}, {...zero,days:[{day:toDay,browserVisits:1}]}]){
 reportReply=JSON.stringify(malformed);
 await assert.rejects(loadVisitorReport(fromDay,toDay),/ikke gyldige tal/);
}
reportReply='';
await assert.rejects(loadVisitorReport(fromDay,toDay),/ikke gyldige tal/);
reportStatus=400;
reportReply=JSON.stringify({code:'22023'});
await assert.rejects(loadVisitorReport(fromDay,toDay),/gyldig periode/);
reportStatus=403;
reportReply=JSON.stringify({code:'42501'});
await assert.rejects(loadVisitorReport(fromDay,toDay),/ikke adgang/);
assert.doesNotMatch(admin,/databasemigreringen til 4\.0\.310/);
