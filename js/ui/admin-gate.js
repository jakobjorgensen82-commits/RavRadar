import { authEnabled,currentSession,signInWithPassword,signOut,getCurrentRole,testConnection } from '../services/auth-service.js?v=4.0.164';
const root=document.querySelector('#adminGate');
const shell=document.querySelector('#adminShell');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function start(){
 if(!authEnabled()) return showSetup();
 const session=currentSession();
 if(!session?.access_token) return showLogin();
 try{const role=await getCurrentRole();if(role!=='owner'){await signOut();return showMessage('Adgang nægtet',`Denne konto har rollen ${esc(role||'ukendt')}. Kun RavRadars ejer kan åbne administrationen.`)};root.hidden=true;shell.hidden=false;await import('./admin-app.js?v=4.0.164');}
 catch(e){showLogin(e.message)}
}
function showSetup(){showMessage('Supabase mangler','Denne RavRadar-version mangler den offentlige Supabase-konfiguration. Upload den komplette projektpakke igen eller kontrollér config.js.')}
function showMessage(title,text,actions=''){root.hidden=false;shell.hidden=true;root.innerHTML=`<article class="admin-card auth-card"><span class="eyebrow">RavRadar</span><h1>${title}</h1><p>${text}</p>${actions}</article>`}
function showLogin(error=''){root.hidden=false;shell.hidden=true;root.innerHTML=`<article class="admin-card auth-card"><span class="eyebrow">Sikker administration</span><h1>Log ind som ejer</h1><p>Kun RavRadars owner-konto kan åbne administrationen.</p><form id="ownerLogin" class="auth-form"><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Adgangskode<input name="password" type="password" autocomplete="current-password" required></label><button class="admin-button">Log ind</button><p id="loginStatus" class="${error?'status-bad':''}">${esc(error)}</p></form><p><a href="./">Tilbage til kortet</a></p></article>`;document.querySelector('#ownerLogin').onsubmit=async e=>{e.preventDefault();const st=document.querySelector('#loginStatus');st.textContent='Logger ind…';const fd=new FormData(e.currentTarget);try{await signInWithPassword(fd.get('email'),fd.get('password'));location.reload()}catch(err){st.className='status-bad';st.textContent=err.message}}}
start();
