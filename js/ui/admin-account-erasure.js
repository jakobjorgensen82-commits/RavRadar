// Owner-only view intent. Durable discovery and deletion authority stay on the server.
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const id=value=>typeof value==='string'&&UUID.test(value)&&value!=='00000000-0000-0000-0000-000000000000';
const KEYS=['operationId','targetUserId','mode','state','holdReason','pgStageCommitted','pgRowsRemoved','authAbsent','d1Acknowledged','d1DeletedCount','complete'];
const STATES=['PREPARED','HOLD_ACTIVITY_CHANGED','HOLD_POLICY','PG_STAGED_AUTH_PENDING','AUTH_ATTEMPTED','AUTH_ABSENT_D1_PENDING','COMPLETE'];
const HOLDS=['ACTIVITY_CHANGED','PRIVILEGED_TARGET','REFERENCE_POLICY','REFERENCE_CATALOG_UNKNOWN','TARGET_MISSING','STORAGE_CATALOG_UNKNOWN','STORAGE_POLICY_UNQUALIFIED','STORAGE_OWNERSHIP','AUTH_GENERATION_CHANGED'];
const STORAGE_HOLDS=['STORAGE_CATALOG_UNKNOWN','STORAGE_POLICY_UNQUALIFIED','STORAGE_OWNERSHIP'];
const sameKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const count=value=>Number.isSafeInteger(value)&&value>=0;
const fail=code=>{throw Error(code);};
const held=status=>status.holdReason!==null&&!(status.pgStageCommitted&&STORAGE_HOLDS.includes(status.holdReason));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function checkedAccountErasureStatus(value,operationId=null,targetUserId=null){
 if(!sameKeys(value,KEYS)||!id(value.operationId)||!id(value.targetUserId)
  ||operationId!==null&&value.operationId!==operationId||targetUserId!==null&&value.targetUserId!==targetUserId
  ||value.mode!=='MANUAL_OWNER'||!STATES.includes(value.state)||!(value.holdReason===null||HOLDS.includes(value.holdReason))
  ||!count(value.pgRowsRemoved)||!(value.d1DeletedCount===null||count(value.d1DeletedCount))
  ||['pgStageCommitted','authAbsent','d1Acknowledged','complete'].some(key=>typeof value[key]!=='boolean')
  ||value.complete!==(value.state==='COMPLETE')||value.d1Acknowledged!==value.complete
  ||value.d1Acknowledged!==(value.d1DeletedCount!==null)
  ||value.pgStageCommitted!==['PG_STAGED_AUTH_PENDING','AUTH_ATTEMPTED','AUTH_ABSENT_D1_PENDING','COMPLETE'].includes(value.state)
  ||value.authAbsent!==['AUTH_ABSENT_D1_PENDING','COMPLETE'].includes(value.state)||value.complete&&value.holdReason!==null)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
 return {...value};
}

export function createOwnerAccountErasure({ownerId,current,access,request,categories,uuid,confirm,changed=()=>{}}){
 let alive=true,busy=false,ready=false,truncated=false,cursor=null,message='Indlæser åbne slettesager…',denied=false;
 let profiles=new Map();const rows=new Map(),intents=new Map();
 const active=()=>alive&&current();
 const snapshot=()=>({busy,ready,truncated,message,denied,profiles:[...profiles.values()],rows:[...rows.values()].map(row=>({...row,status:row.status&&{...row.status}}))});
 const emit=()=>{if(active())changed(snapshot());};
 const guard=()=>{if(!active())fail('ACCOUNT_ERASURE_IDENTITY_CHANGED');};
 const owner=async()=>{guard();const value=await access();guard();if(value?.profile?.id!==ownerId||value.profile.role!=='owner'||value.profile.is_active!==true)fail('OWNER_REQUIRED');};
 const call=async(path,body)=>{
  await owner();const result=await request(path,body);guard();await owner();
  if(!result.response?.ok){
   // The gateway emits fixed error codes. Do not display raw response bodies or error text.
   const code=result.body?.error;
   fail(typeof code==='string'&&/^ACCOUNT_ERASURE_[A-Z_]{1,70}$/.test(code)?code:'ACCOUNT_ERASURE_UNAVAILABLE');
  }
  return result.body;
 };
 const trip=body=>call('trip-log',body);
 const store=(status,operationId=null,target=null)=>{
  const checked=checkedAccountErasureStatus(status,operationId,target);
  if(checked.targetUserId===ownerId)fail('ACCOUNT_ERASURE_TARGET_PROTECTED');
  const previous=rows.get(checked.operationId);
  if(previous&&previous.targetUserId!==checked.targetUserId)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
  // A positively known pre-PG HOLD is immutable. A later explicit prepare may
  // start a new case after policy/category checks; the old HOLD remains visible.
  if(!checked.pgStageCommitted&&['HOLD_ACTIVITY_CHANGED','HOLD_POLICY'].includes(checked.state)
   &&intents.get(checked.targetUserId)===checked.operationId)intents.delete(checked.targetUserId);
  const row={...previous,operationId:checked.operationId,targetUserId:checked.targetUserId,status:checked,unknown:false};
  rows.set(row.operationId,row);return row;
 };
 const permittedProfile=profile=>profile&&id(profile.id)&&profile.id!==ownerId&&profile.role!=='owner'
  &&Array.isArray(profile.user_permissions)&&!profile.user_permissions.some(permission=>permission.enabled===true);
 const ordinary=async target=>{
  if(!permittedProfile(profiles.get(target)))fail('ACCOUNT_ERASURE_TARGET_PROTECTED');
  const report=await categories([target]);guard();
  if(report?.rows?.length!==1||report.rows[0].id!==target||report.rows[0].category!=='ordinary'
   ||!Array.isArray(report.rows[0].issues)||report.rows[0].issues.length)fail('ACCOUNT_ERASURE_TARGET_PROTECTED');
  await owner();
 };
 const run=async work=>{
  if(!active()||busy||denied)return false;busy=true;message='Kontrollerer…';emit();
  try{await work();guard();return true;}
  catch(error){if(active()){
   if(error.message==='OWNER_REQUIRED'){denied=true;rows.clear();profiles.clear();intents.clear();message='Kontosletning kræver en aktiv ejerkonto.';}
   else message='Ikke bekræftet. Kontrollér status før en ny beslutning. '+(/^(ACCOUNT_ERASURE_[A-Z_]+)$/.test(error.message)?error.message:'ACCOUNT_ERASURE_UNAVAILABLE');
  }return false;}
  finally{busy=false;emit();}
 };
 const api={
  snapshot,
  setProfiles(values){if(!active())return;profiles=new Map(values.filter(profile=>id(profile.id)).map(profile=>[profile.id,profile]));emit();},
  hydrate(more=false){return run(async()=>{
   const after=more?cursor:null;if(more&&(!ready||!truncated||!after))return;
   const body=await trip({operation:'account-erasure-list',...(after?{afterOperationId:after}:{})});
   if(!sameKeys(body,['scope','rows','truncated'])||body.scope!=='own-account-erasure-operations'||!Array.isArray(body.rows)
    ||body.rows.length>64||typeof body.truncated!=='boolean'||body.truncated&&body.rows.length!==64)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
   let previous=after;const checked=body.rows.map(value=>{
    const status=checkedAccountErasureStatus(value);
    if(status.complete||status.targetUserId===ownerId||previous!==null&&status.operationId<=previous)fail('ACCOUNT_ERASURE_SCHEMA_UNAVAILABLE');
    previous=status.operationId;return status;
   });
   // Absence from this list is never evidence of completion. Keep unresolved view intents.
   for(const status of checked)store(status);
   cursor=previous;truncated=body.truncated;ready=true;message=rows.size?'Åbne sager er hentet fra serveren.':'Ingen åbne sager fundet.';
  });},
  prepare(target){return run(async()=>{
   if(!ready||!id(target))fail('ACCOUNT_ERASURE_UNAVAILABLE');await ordinary(target);
   const found=await call('find',{p_target:target});
   if(found?.operationId!==null){store(found,null,target);message='Eksisterende sag fundet. Kontrollér status før permanent sletning.';return;}
   if(!sameKeys(found,['operationId','state','complete'])||found.complete!==false||found.state!=='NONE')fail('ACCOUNT_ERASURE_TARGET_PROTECTED');
   let operationId=intents.get(target);if(!operationId){operationId=uuid();if(!id(operationId))fail('ACCOUNT_ERASURE_INPUT_INVALID');intents.set(target,operationId);}
   const row=rows.get(operationId)||{operationId,targetUserId:target,status:null,unknown:true,attemptId:null};rows.set(operationId,row);
   row.unknown=true;
   const result=await trip({operation:'account-erasure-prepare',operationId,targetUserId:target});
   store(result,operationId,target);message='Sag forberedt. Der er endnu ikke bekræftet nogen kontosletning.';
  });},
  status(operationId){return run(async()=>{
   const row=rows.get(operationId);if(!row)fail('ACCOUNT_ERASURE_INPUT_INVALID');
   store(await trip({operation:'account-erasure-status',operationId}),operationId,row.targetUserId);
   message='Status læst tilbage fra serveren.';
  });},
  resume(operationId){return run(async()=>{
   const entry=rows.get(operationId);if(!entry||entry.unknown)fail('ACCOUNT_ERASURE_UNAVAILABLE');
   const row=store(await trip({operation:'account-erasure-status',operationId}),operationId,entry.targetUserId);
   if(row.status.complete||held(row.status)){message='Sagen er afsluttet eller kræver afklaring. Ingen slettehandling sendt.';return;}
   const profile=profiles.get(row.targetUserId);
   if(profile&&!permittedProfile(profile))fail('ACCOUNT_ERASURE_TARGET_PROTECTED');
   if(profile||!row.status.pgStageCommitted)await ordinary(row.targetUserId);
   const target=profile?`${profile.display_name||profile.email||'Konto'} (${row.targetUserId})`:row.targetUserId;
   if(!confirm(`Slet kontoen permanent?\n\nMål: ${target}\n\nKontoen og dens ture slettes fra de aktive lagre. Handlingen kan ikke fortrydes. Sikkerhedskopier følger deres særskilte retention.\n\nBekræft kun, hvis dette er den rigtige konto.`)){message='Sletning blev ikke bekræftet.';return;}
   await owner();const attemptId=uuid();if(!id(attemptId))fail('ACCOUNT_ERASURE_INPUT_INVALID');
   row.attemptId=attemptId;row.unknown=true; // Retained unchanged if the response is lost; never replayed automatically.
   store(await trip({operation:'account-erasure-resume',operationId,attemptId,confirmation:'DELETE-MANUAL-ACCOUNT-PERMANENTLY'}),operationId,row.targetUserId);
   message='Svar læst tilbage. Kun en fuldt bekræftet sag vises som afsluttet.';
  });},
  destroy(){alive=false;rows.clear();intents.clear();profiles.clear();},
 };
 return api;
}

const LABELS={PREPARED:'Forberedt – afventer permanent bekræftelse',HOLD_ACTIVITY_CHANGED:'Sat på hold: aktivitet er ændret',HOLD_POLICY:'Sat på hold: konto eller referencer kræver afklaring',PG_STAGED_AUTH_PENDING:'PG-trin bekræftet – Auth og D1 afventer',AUTH_ATTEMPTED:'Auth-forsøg registreret – udfald skal afklares',AUTH_ABSENT_D1_PENDING:'Auth-fravær bekræftet – D1 afventer',COMPLETE:'Kontosletningen er bekræftet afsluttet i de aktive lagre'};
export function mountOwnerAccountErasure(host,dependencies){
 const draw=view=>{
  const disabled=view.busy||view.denied?' disabled':'';
  const candidates=view.profiles.filter(profile=>profile.id!==dependencies.ownerId&&profile.role!=='owner'
   &&Array.isArray(profile.user_permissions)&&!profile.user_permissions.some(permission=>permission.enabled===true));
  host.innerHTML=`<article class="admin-card"><h2>Permanent kontosletning · kun ejer</h2><p>Åbne sager hentes fra serveren, også når profilen er væk. Konti med privilegier og din egen konto kan ikke slettes her.</p><p role="status" aria-live="polite">${esc(view.message)}</p><div class="toolbar"><button class="admin-button secondary" data-erasure-list${disabled}>Opdatér åbne sager</button>${view.truncated?`<button class="admin-button secondary" data-erasure-more${disabled}>Vis flere sager</button>`:''}</div><div class="admin-grid">${view.rows.map(row=>`<article class="admin-card"><h3>Konto ${esc(row.targetUserId)}</h3><p>Sag: ${esc(row.operationId)}</p><p>${esc(row.unknown?'Udfald ukendt – sletning er ikke bekræftet':row.status?LABELS[row.status.state]:'Ikke bekræftet')}</p>${row.status?.holdReason?`<p>Holdårsag: ${esc(row.status.holdReason)}</p>`:''}<div class="toolbar"><button class="admin-button secondary" data-erasure-status="${esc(row.operationId)}"${disabled}>Kontrollér status</button>${row.status&&!row.unknown&&!row.status.complete&&!held(row.status)?`<button class="admin-button danger" data-erasure-resume="${esc(row.operationId)}"${disabled}>Bekræft permanent sletning / genoptag</button>`:''}</div></article>`).join('')}</div><label>Ny slettesag<select data-erasure-target${disabled}><option value="">Vælg en konto til kontrol</option>${candidates.map(profile=>`<option value="${esc(profile.id)}">${esc(profile.display_name||profile.email||profile.id)} · ${esc(profile.id)}</option>`).join('')}</select></label><button class="admin-button secondary" data-erasure-prepare${disabled||!view.ready?' disabled':''}>Kontrollér kategori og forbered sag</button><p class="hint">Forberedelse sletter ikke kontoen. Kun en almindelig konto uden ekstra rettigheder kan godkendes; serveren kontrollerer adgang og alle slettefaser.</p></article>`;
  host.querySelector('[data-erasure-list]').onclick=()=>void model.hydrate();
  const more=host.querySelector('[data-erasure-more]');if(more)more.onclick=()=>void model.hydrate(true);
  host.querySelector('[data-erasure-prepare]').onclick=()=>void model.prepare(host.querySelector('[data-erasure-target]').value);
  host.querySelectorAll('[data-erasure-status]').forEach(button=>button.onclick=()=>void model.status(button.dataset.erasureStatus));
  host.querySelectorAll('[data-erasure-resume]').forEach(button=>button.onclick=()=>void model.resume(button.dataset.erasureResume));
 };
 const model=createOwnerAccountErasure({...dependencies,changed:draw});draw(model.snapshot());return model;
}
