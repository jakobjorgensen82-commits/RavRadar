import { PUBLIC_CONFIG } from "../../config.js?v=4.0.126";
import { calculateRavScore } from "../core/score-engine.js?v=4.0.126";

const KNOWLEDGE={
 equipment:'Til almindelig ravjagt er de mest nyttige ting: polariserede briller i dagslys, en god ravlygte i mørke, handsker, vindtæt tøj, en lille beholder til fund og kun waders/vadestav hvor forholdene er rolige og kendte.',
 safety:'Gå ikke alene ud i hårdt vejr eller stærk strøm. Kend bunden, følg vandstanden og vend om før forholdene bliver usikre.',
 technique:'Se efter tang, træstumper, frø, skaller og andre lette materialer i striber, render, læsider og nye opskylskanter. Afprøv flere små områder frem for at blive stående ét sted.',
 current:'Strømretningen er retningen vandet bevæger sig imod. Rav kan både flyttes ind mod stranden og langs kysten; næsten parallel strøm er derfor ikke automatisk værdiløs.',
 waves:'Bølger kan frigøre og flytte materiale, men større bølger giver ofte dårligere sigt og sikkerhed. Perioden efter kraftigt vejr kan være vigtigere end selve stormtoppen.',
 water:'Faldende vand kan blotlægge opskyl og render. Stigende vand kan føre materiale ind, men kan også gøre passager og wadersjagt farligere.'
};
function finite(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fmt(v,d=1){const n=finite(v);return n===null?'ukendt':n.toFixed(d).replace('.',',');}
function clock(iso){return new Intl.DateTimeFormat('da-DK',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));}
function classify(q){
 const s=q.toLocaleLowerCase('da-DK');
 if(/udstyr|lygte|briller|waders|vadestav|handske|tøj/.test(s))return'equipment';
 if(/bedste sted|hvor skal|hvor er bedst|køre hen/.test(s))return'best-place';
 if(/bedste tidspunkt|hvornår|hvilket tidspunkt/.test(s))return'best-time';
 if(/hvorfor.*score|score.*hvorfor|trækker op|trækker ned/.test(s))return'score';
 if(/sikker|farlig|risiko/.test(s))return'safety';
 if(/strøm|bundstrøm|pil/.test(s))return'current';
 if(/bølge|storm/.test(s))return'waves';
 if(/vandstand|tidevand/.test(s))return'water';
 if(/teknik|hvordan finder|hvor skal jeg lede|tips/.test(s))return'technique';
 return'unknown';
}
function allScored(ctx,dayOffset=0){
 const target=new Date();target.setUTCDate(target.getUTCDate()+dayOffset);const date=target.toISOString().slice(0,10);const mode=ctx.mode||'waders';
 return (ctx.zones?.features||[]).flatMap(f=>{const z=f.properties,c=ctx.conditions?.zones?.[z.id]||{};const hours=(c.forecast?.hourly||[]).filter(h=>String(h.time||'').slice(0,10)===date);return hours.map(h=>({zone:z,hour:h,result:calculateRavScore({mode,zone:z,weather:h,history:c.history||{}})}));}).filter(x=>x.result.available).sort((a,b)=>b.result.score-a.result.score);
}
function selectedScored(ctx,dayOffset=0){const z=ctx.zone;if(!z)return[];const c=ctx.conditions?.zones?.[z.id]||{};const d=new Date();d.setUTCDate(d.getUTCDate()+dayOffset);const date=d.toISOString().slice(0,10);return(c.forecast?.hourly||[]).filter(h=>String(h.time||'').slice(0,10)===date).map(h=>({hour:h,result:calculateRavScore({mode:ctx.mode||'waders',zone:z,weather:h,history:c.history||{}})})).filter(x=>x.result.available).sort((a,b)=>b.result.score-a.result.score);}
function scoreAnswer(ctx){const r=ctx.result,w=ctx.weather||{};if(!r)return'Vælg først en zone, så kan jeg forklare dens score.';const rows=(r.explanations||r.reasons||[]).slice(0,5).map(x=>typeof x==='string'?x:x?.text||x?.explanation).filter(Boolean);const state=r.explanation?.transportEvent?.stateExplanation;const historical=state?.summary?`\n\nHistorisk tilstand: ${state.summary}${(state.facts||[]).length?`\n${state.facts.slice(0,3).map(x=>'• '+x).join('\n')}`:''}`:'';return`RavScore ${r.score} for ${ctx.zone?.name||'zonen'} skyldes især:

${rows.map(x=>'• '+x).join('\n')||'• Samspillet mellem transport, mobilisering og jagtbarhed.'}${historical}

Aktuelt: vind ${fmt(w.windSpeedMps)} m/s, bølger ${fmt(w.waveHeightM)} m, strøm ${fmt(w.currentSpeedMps,2)} m/s og vandstand ${fmt(w.waterLevelCm,0)} cm.`;}
function bestPlace(ctx,q){const tomorrow=/i morgen|imorgen/.test(q.toLowerCase());const rows=allScored(ctx,tomorrow?1:0).slice(0,5);if(!rows.length)return'Der er ikke nok gyldige prognosedata til at rangere hele landet.';return`${tomorrow?'I morgen':'I dag'} ser disse steder bedst ud:

${rows.map((x,i)=>`${i+1}. ${x.zone.name} – score ${x.result.score} omkring ${clock(x.hour.time)}`).join('\n')}

Listen bygger på alle aktive zoner og deres timeprognoser.`;}
function bestTime(ctx,q){if(!ctx.zone)return'Vælg en zone først, så finder jeg dens bedste tidspunkt.';const tomorrow=/i morgen|imorgen/.test(q.toLowerCase());const rows=selectedScored(ctx,tomorrow?1:0).slice(0,3);if(!rows.length)return'Der er ikke nok prognosedata for den valgte zone.';const best=rows[0];return`${tomorrow?'I morgen':'I dag'} er bedste tidspunkt i ${ctx.zone.name} cirka ${clock(best.hour.time)} med RavScore ${best.result.score}.

Næste muligheder: ${rows.slice(1).map(x=>`${clock(x.hour.time)} (${x.result.score})`).join(', ')||'ingen næsten lige så gode timer'}.`}
function equipmentAnswer(ctx){const w=ctx.weather||{};let extra='';if(finite(w.windSpeedMps)>=6||finite(w.waveHeightM)>=.7)extra=' Med de aktuelle forhold ville jeg holde mig på stranden eller helt lavt vand og undgå dyb wadersjagt.';return KNOWLEDGE.equipment+extra;}
function localAnswer(q,ctx){const intent=classify(q);if(intent==='equipment')return equipmentAnswer(ctx);if(intent==='best-place')return bestPlace(ctx,q);if(intent==='best-time')return bestTime(ctx,q);if(intent==='score')return scoreAnswer(ctx);if(intent==='safety')return KNOWLEDGE.safety;if(intent==='current')return KNOWLEDGE.current;if(intent==='waves')return KNOWLEDGE.waves;if(intent==='water')return KNOWLEDGE.water;if(intent==='technique')return KNOWLEDGE.technique;return'Jeg forstår ikke spørgsmålet sikkert nok endnu. Prøv at spørge om bedste sted, bedste tidspunkt, udstyr, teknik, sikkerhed, strøm, bølger, vandstand eller hvorfor en score er høj eller lav.';}
async function remoteAnswer(question,ctx){if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.supabasePublishableKey)return null;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/functions/v1/ravradar-assistant`,{method:'POST',headers:{apikey:PUBLIC_CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({question,context:ctx}),signal:controller.signal});if(!response.ok)return null;return(await response.json()).answer||null;}catch{return null;}finally{clearTimeout(timer);}}
export async function askRavRadar(question,context={},options={}){const safe=String(question||'').trim().slice(0,1200);if(!safe)throw new Error('Skriv et spørgsmål først.');if(options?.localOnly)return localAnswer(safe,context);return await remoteAnswer(safe,context)||localAnswer(safe,context);}
export const QUICK_QUESTIONS=['Hvorfor denne score?','Bedste tidspunkt i dag?','Bedste sted i morgen?','Hvilket udstyr skal jeg bruge?','Forklar strømretningen','Er forholdene sikre?'];
export { classify as classifyRavQuestion };
