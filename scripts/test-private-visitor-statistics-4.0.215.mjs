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
for(const marker of ['visitors:renderVisitors','Privat besøgsstatistik','Sidevisninger','Browserbesøg','Oprettede login','registeredAccounts','activeAccounts']) assert.ok(admin.includes(marker),`Adminrapport mangler ${marker}`);
assert.match(admin,/visitors:'full_admin'/);
console.log('Privat besøgsstatistik: sessionstælling, dataminimering, kontotal og ikke-blokerende opstart er bestået.');
