import { PUBLIC_CONFIG } from "../../config.js";

const KNOWLEDGE = Object.freeze({
  safety: "Gå aldrig alene ud i hårdt vejr eller stærk strøm. Brug passende beklædning, kend vanddybden, hold øje med stigende vandstand og afbryd jagten, hvis forholdene ændrer sig.",
  wind: "Vindens betydning afhænger af kystens retning, styrke, varighed og samspillet med strøm og bølger. Fralandsvind er derfor ikke automatisk dårlig, og pålandsvind er ikke automatisk god.",
  current: "Strømmen kan transportere rav og let opskyl langs kysten eller ind mod land. Retningen skal forstås som bevægelsesretningen, og lokal bundstrøm kan afvige fra overfladen.",
  waves: "Bølger kan frigøre og flytte materiale, men for store bølger kan gøre jagten farlig og vandet uklart. Efter kraftigt vejr kan transporten fortsætte, selv når vinden er aftaget.",
  water: "Vandstand påvirker, hvilke dele af stranden og revlerne der er tilgængelige. Faldende vand kan blotlægge opskyl, mens hurtigt stigende vand kan lukke sikre passager.",
  amber: "Rav opfører sig som et relativt let materiale i vand og findes ofte sammen med tang, træstumper, frø og andet let opskyl. Samlinger i render, læsider, bugter, ved høfder og langs skift i bundtype kan være interessante.",
  uv: "UV-lys kan gøre rav lettere at se i mørke, men mange materialer fluorescerer. Kontrollér fundets vægt, overflade og elektrostatiske egenskaber og undgå at stole på UV alene.",
  timing: "Det bedste tidspunkt er ofte et kompromis mellem transport, synlighed og sikkerhed. Se på udviklingen over flere timer og ikke kun øjebliksbilledet."
});

function n(v,d=1){return Number.isFinite(Number(v))?Number(v).toFixed(d):"ukendt";}
function dir(v){return Number.isFinite(Number(v))?`${Math.round(Number(v))}°`:"ukendt retning";}
function zoneFacts(ctx={}){
  const w=ctx.weather||{}; const r=ctx.result||{};
  return `Aktuelle RavRadar-data for ${ctx.zone?.name||"den valgte zone"}: RavScore ${r.score??"ukendt"}, vind ${n(w.windSpeedMps)} m/s fra ${dir(w.windDirectionDeg??w.windDirectionFromDeg)}, bølger ${n(w.waveHeightM)} m, strøm ${n(w.currentSpeedMps,2)} m/s mod ${dir(w.currentDirectionDeg??w.currentDirectionTowardsDeg)}, vandstand ${n(w.waterLevelCm,0)} cm.`;
}
function localAnswer(question,ctx={}){
  const q=question.toLocaleLowerCase('da-DK');
  const restricted=/(api.?key|adgangskode|password|supabase|database|sql|kildekode|source code|prompt|systeminstruk|admin|sårbar|hack|token|hemmelig|deploy|github action)/i.test(q);
  if(restricted) return "Jeg kan hjælpe med ravjagt, vejr, havforhold og RavRadars offentlige prognoser, men ikke med interne systemer, adgangsoplysninger eller projektets sikkerhed.";
  const parts=[];
  if(ctx.zone) parts.push(zoneFacts(ctx));
  if(/hvorfor|score|god|dårlig|bedst|chance/.test(q) && ctx.result){
    const explanations=(ctx.result.explanations||ctx.result.reasons||[]).slice(0,4).map(x=>typeof x==='string'?x:x?.text||x?.explanation).filter(Boolean);
    parts.push(explanations.length?`De vigtigste forklaringer er: ${explanations.join(' ')}`:"Scoren bygger på samspillet mellem jagtbarhed, transport, frigivelse og de aktive regler.");
  }
  if(/vind|fralands|påland/.test(q)) parts.push(KNOWLEDGE.wind);
  if(/strøm|bundstrøm|overfladestrøm/.test(q)) parts.push(KNOWLEDGE.current);
  if(/bølge|storm/.test(q)) parts.push(KNOWLEDGE.waves);
  if(/vandstand|tidevand/.test(q)) parts.push(KNOWLEDGE.water);
  if(/uv|lygte|fluores/.test(q)) parts.push(KNOWLEDGE.uv);
  if(/hvornår|tidspunkt|timer/.test(q)) parts.push(KNOWLEDGE.timing);
  if(/sikker|farlig|wader|nat/.test(q)) parts.push(KNOWLEDGE.safety);
  if(/rav|tang|opskyl|strand|finde|tips/.test(q)) parts.push(KNOWLEDGE.amber);
  if(parts.length===0) parts.push("Spørg gerne om ravjagt, vind, strøm, bølger, vandstand, udstyr, sikkerhed eller en konkret RavRadar-zone.");
  return parts.join("\n\n")+"\n\nRavRadar er vejledende; lokale forhold og sikkerhed kommer altid først.";
}
async function remoteAnswer(question,ctx){
  if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.supabasePublishableKey) return null;
  const response=await fetch(`${PUBLIC_CONFIG.supabaseUrl}/functions/v1/ravradar-assistant`,{method:'POST',headers:{apikey:PUBLIC_CONFIG.supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({question,context:ctx})});
  if(!response.ok) return null;
  const data=await response.json(); return data.answer||null;
}
export async function askRavRadar(question,context={}){
  const safe=String(question||'').trim().slice(0,1200); if(!safe) throw new Error('Skriv et spørgsmål først.');
  try{return await remoteAnswer(safe,context)||localAnswer(safe,context);}catch{return localAnswer(safe,context);}
}
export const QUICK_QUESTIONS=["Hvorfor denne score?","Bedste tidspunkt i dag?","Hvad trækker op og ned?","Forklar strømretningen","Giv tips til denne kyst","Er forholdene sikre?"];
