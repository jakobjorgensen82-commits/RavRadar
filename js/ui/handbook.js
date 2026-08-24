import { submitHandbookReview, exportLocalHandbookDrafts, centralReviewStorageEnabled } from '../services/handbook-review-store.js?v=4.0.275';
import { currentSession, getCurrentRole, signInAsExpert, signOut, expertLoginConfig } from '../services/auth-service.js?v=4.0.275';
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const content=document.querySelector('#handbookContent');
const toc=document.querySelector('#handbookToc');
const dialog=document.querySelector('#reviewDialog');
const form=document.querySelector('#reviewForm');
const expertAccess=document.querySelector('#expertAccess');
const headerStatus=document.querySelector('#expertHeaderStatus');
let book=null;
let currentRole=null;

async function refreshAccess(){
  const session=currentSession();
  currentRole=session?.access_token?await getCurrentRole().catch(()=>null):null;
  const authenticated=Boolean(session?.access_token&&['expert','owner'].includes(currentRole));
  headerStatus.textContent=authenticated?(currentRole==='owner'?'Ejer logget ind':'Ekspert logget ind'):'';
  if(authenticated){
    expertAccess.innerHTML=`<span class="eyebrow">Ekspertadgang</span><strong>${currentRole==='owner'?'Ejer':'Ekspert'} er logget ind</strong><p>Faglige rettelser gemmes direkte og sikkert i Supabase.</p><button id="expertLogout" type="button" class="secondary">Log ud</button>`;
    document.querySelector('#expertLogout').onclick=async()=>{await signOut();await refreshAccess();render(book.sections)};
  }else{
    const cfg=expertLoginConfig();
    expertAccess.innerHTML=`<span class="eyebrow">Ekspertadgang</span><strong>Log ind for at skrive rettelser</strong><form id="expertLoginForm" class="expert-login"><label>Brugernavn<input name="username" autocomplete="username" value="${esc(cfg.username)}" required></label><label>Kode<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">Log ind</button><p id="expertLoginStatus" role="status"></p></form>`;
    document.querySelector('#expertLoginForm').onsubmit=async e=>{
      e.preventDefault();
      const status=document.querySelector('#expertLoginStatus');
      const fd=new FormData(e.currentTarget);
      status.className='';status.textContent='Logger ind…';
      try{await signInAsExpert(fd.get('username'),fd.get('password'));await refreshAccess();render(book.sections)}
      catch(err){status.className='status-error';status.textContent=err.message}
    };
  }
  return authenticated;
}

async function boot(){
  const r=await fetch('./docs/handbook/content.json',{cache:'no-store'});
  book=await r.json();
  await refreshAccess();
  render(book.sections);
}
function render(sections){
  const authenticated=Boolean(currentSession()?.access_token&&['expert','owner'].includes(currentRole));
  toc.innerHTML=sections.map(s=>`<a href="#${esc(s.id)}">${esc(s.title)}</a>`).join('');
  content.innerHTML=`<section class="handbook-intro"><span class="eyebrow">Version ${esc(book.handbookVersion)}</span><h2>${esc(book.title)}</h2><p>Opdateret ${esc(book.updatedAt)}. ${authenticated?'Brug “Foreslå rettelse” ved det relevante afsnit.':'Håndbogen kan læses frit. Ekspertlogin kræves kun for at indsende rettelser.'}</p><p class="storage-state ${centralReviewStorageEnabled()?'ok':'warning'}">${centralReviewStorageEnabled()?'Central ekspertlagring er aktiv.':'Ingen ekspert er logget ind.'}</p></section>`+sections.map(s=>`<article id="${esc(s.id)}" data-search="${esc((s.title+' '+s.summary+' '+s.body.replace(/<[^>]+>/g,' ')).toLowerCase())}"><header><div><span class="eyebrow">Håndbog</span><h2>${esc(s.title)}</h2><p>${esc(s.summary)}</p></div><button class="review-button" data-review="${esc(s.id)}" ${authenticated?'':'disabled'}>${authenticated?'Foreslå rettelse':'Ekspertlogin kræves'}</button></header><div class="handbook-copy">${s.body}</div></article>`).join('');
  document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>openReview(b.dataset.review));
}
function openReview(id){
  if(!currentSession()?.access_token||!['expert','owner'].includes(currentRole)){
    expertAccess.scrollIntoView({behavior:'smooth',block:'center'});
    expertAccess.querySelector('input[name="password"]')?.focus();
    return;
  }
  const s=book.sections.find(x=>x.id===id);
  form.reset();form.elements.sectionId.value=id;form.elements.sectionTitle.value=s.title;
  document.querySelector('#reviewStatus').textContent='';dialog.showModal();
}
document.querySelector('#handbookSearch').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#handbookContent article').forEach(a=>a.hidden=Boolean(q&&!a.dataset.search.includes(q)));});
document.querySelector('#exportDrafts').onclick=()=>exportLocalHandbookDrafts();
form.addEventListener('submit',async e=>{
  if(e.submitter?.value==='cancel')return;
  e.preventDefault();
  if(!currentSession()?.access_token){dialog.close();await refreshAccess();return;}
  const button=document.querySelector('#submitReview');const status=document.querySelector('#reviewStatus');button.disabled=true;status.textContent='Gemmer…';
  const fd=new FormData(form);
  const result=await submitHandbookReview({handbookVersion:book.handbookVersion,sectionId:fd.get('sectionId'),sectionTitle:fd.get('sectionTitle'),expertise:fd.get('expertise'),issue:fd.get('issue'),proposal:fd.get('proposal'),reasoning:fd.get('reasoning'),expertName:fd.get('expertName'),organization:fd.get('organization')});
  status.textContent=result.central?'Rettelsen er gemt centralt med historik.':`Central lagring fejlede. Rettelsen er gemt som lokal nødkladde (${result.error||'ukendt fejl'}).`;
  button.disabled=false;if(result.central)setTimeout(()=>dialog.close(),1200);
});
boot().catch(err=>content.innerHTML=`<p>Håndbogen kunne ikke indlæses: ${esc(err.message)}</p>`);
