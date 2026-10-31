import {readPrivateTripStudyForOwner,assertPrivateTripStudyDisplayReport} from '../services/private-trip-study.js?v=4.0.594';
import {myAccess,hasPermission} from '../services/permissions-service.js?v=4.0.594';
import {requireFreshSession,authIdentityEpoch,currentSession,onAuthChange} from '../services/auth-service.js?v=4.0.594';

const allowed=access=>access?.profile?.is_active===true&&hasPermission(access,'full_admin');
const unavailable='Månedsrapporten er ikke tilgængelig, eller din adgang kunne ikke bekræftes. Intet er eksporteret.';
const mounted=new WeakMap();
// Samme intervaller som den normale producent; ingen ny estimator eller sum.
const groups=[
 ['windSpeedMs','Vind (m/s)',['0–under 4','4–under 8','8–under 12','12–under 20','20 eller mere']],
 ['waveHeightM','Bølger (m)',['0–under 0,3','0,3–under 0,75','0,75–under 1,5','1,5–under 3','3 eller mere']],
 ['currentSpeedMs','Strøm (m/s)',['0–under 0,1','0,1–under 0,25','0,25–under 0,5','0,5–under 1','1 eller mere']],
 ['waterLevelTrendM3h','Vandstandsændring (m/3 timer)',['Under −0,1','−0,1–under −0,02','−0,02–under 0,02','0,02–under 0,1','0,1 eller mere']],
];
function reportTable(report){
 const table=document.createElement('table'),caption=document.createElement('caption');
 caption.textContent='Støjede gruppetal · fund og ikke-fund';table.append(caption);
 const head=document.createElement('thead'),headRow=document.createElement('tr');
 for(const label of ['Vejrforhold','Interval','Fund (støjet)','Ikke-fund (støjet)']){
  const th=document.createElement('th');th.scope='col';th.textContent=label;headRow.append(th);
 }
 head.append(headRow);table.append(head);const body=document.createElement('tbody');
 const cells=new Map(report.cells.map(row=>[row.cell,row.noisyCount]));
 for(const [metric,label,bins] of groups)for(let i=0;i<bins.length;i++){
  const row=document.createElement('tr');
  for(const value of [label,bins[i],cells.get(metric+':'+i+':find'),cells.get(metric+':'+i+':no-find')]){
   const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);
  }
  body.append(row);
 }
 table.append(body);return table;
}
export function mountPrivateTripStudyCard(host,access){
 mounted.get(host)?.();host.querySelector('[data-private-trip-study]')?.remove();
 if(!allowed(access))return null;
 const card=document.createElement('article');card.className='admin-card';card.dataset.privateTripStudy='';
 const title=document.createElement('h2');title.textContent='Samlet tur-/vejrstatistik · privat';
 const explanation=document.createElement('p');explanation.className='muted';
 explanation.textContent='Støjede gruppetal fra selvrapporterede ture. Fund/ikke-fund er ikke en vurdering af en god eller dårlig tur. Tallene kan ikke bruges som præcise turantal eller lægges sammen på tværs af grupper. Ingen enkeltpersoner eller enkelte ture vises. Rapporten ændrer ikke RavScore og er ikke offentliggjort statistik.';
 const month=document.createElement('p');month.textContent='Den faktisk gemte rapportmåned vises efter adgangskontrollen.';
 const button=document.createElement('button');button.type='button';button.className='admin-button';button.textContent='Vis månedsrapport';
 const download=document.createElement('button');download.type='button';download.className='admin-button';download.textContent='Hent rapport som JSON';
 const output=document.createElement('div');
 const status=document.createElement('p');status.className='form-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 card.append(title,explanation,month,button,download,output,status);host.append(card);
 let busy=false;const epoch=authIdentityEpoch(),initialOwner=currentSession()?.user?.id;
 const clear=()=>{output.replaceChildren();month.textContent='Ingen rapport vises.';};
 const unsubscribe=onAuthChange(()=>{
  if(!card.isConnected||authIdentityEpoch()!==epoch||currentSession()?.user?.id!==initialOwner){clear();card.remove();unsubscribe();}
 });
 mounted.set(host,()=>{clear();unsubscribe();});
 const read=async(exportJson)=>{
  if(busy)return;busy=true;button.disabled=true;download.disabled=true;clear();status.textContent='Kontrollerer adgang og henter månedsrapport…';
  const identity=authIdentityEpoch(),owner=currentSession()?.user?.id;
  const current=()=>{
   if(!owner||identity!==epoch||owner!==initialOwner||authIdentityEpoch()!==identity||currentSession()?.user?.id!==owner||!card.isConnected||card.parentNode!==host)
    throw Error('PRIVATE_STUDY_VIEW_CHANGED');
  };
  const permitted=async()=>{const fresh=await myAccess();current();
   if(!allowed(fresh)||fresh.profile.id!==owner)throw Error('PRIVATE_STUDY_ACCESS_CHANGED');};
  try{
   await requireFreshSession();current();await permitted();
   const report=await readPrivateTripStudyForOwner();current();await permitted();
   assertPrivateTripStudyDisplayReport(report,report.period);current();
   // Ingen await mellem sidste adgangskontrol og visning/eksport.
   const table=reportTable(report);output.replaceChildren(table);
   month.textContent='Rapportmåned: '+new Intl.DateTimeFormat('da-DK',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(report.period.start))+' (UTC).';
   if(exportJson){
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),href=URL.createObjectURL(blob);
    const anchor=document.createElement('a');anchor.hidden=true;anchor.href=href;anchor.download='ravradar-tur-vejrstatistik-'+report.period.start.slice(0,7)+'.json';
    try{document.body.append(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(href),0);}
   }
   status.textContent=exportJson?'Den beskyttede månedsrapport er hentet.':'Den beskyttede månedsrapport vises.';
  }catch{clear();if(card.isConnected&&card.parentNode===host)status.textContent=unavailable;}
  finally{busy=false;if(card.isConnected&&card.parentNode===host){button.disabled=false;download.disabled=false;}}
 };
 button.onclick=()=>read(false);download.onclick=()=>read(true);return card;
}
