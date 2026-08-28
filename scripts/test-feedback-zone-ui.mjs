import fs from "node:fs";
const infoPanelSource=fs.readFileSync("js/ui/info-panel.js","utf8");
if(!/Debug: vis alle mellemregninger/.test(infoPanelSource))throw new Error("Debugpanel mangler");
if(!/currentDirectionDifferenceDeg/.test(infoPanelSource))throw new Error("Retningsforskel mangler i debug");
for(const marker of ["Teknisk kystkausal RavScore-visning","transportPotential","deliveryPotential","transportAndDelivery","transportMemoryCoverageHours","outboundEpisodeLossPoints","gridOutflowEvidenceActive"]){
  if(!infoPanelSource.includes(marker))throw new Error(`Kystkausal RavScore-diagnostik mangler: ${marker}`);
}
for(const retired of ["Transport før loft","Transport efter loft","<span>Vindens bevægelse</span>","Nærkystpotentiale","Teknisk Candidate G-visning","actualOutboundTransport"]){
  if(infoPanelSource.includes(retired))throw new Error(`Forældet teknisk felt er stadig aktivt: ${retired}`);
}
const app=fs.readFileSync("app.js","utf8");const tripDialog=fs.readFileSync("js/ui/trip-evidence-dialog.js","utf8");const i18n=fs.readFileSync("js/i18n.js","utf8");const zones=JSON.parse(fs.readFileSync("data/zones.geojson","utf8"));
for(const id of ["DK-B12-01","DK-B12-03","DK-B12-04","DK-B12-06","DK-B12-07","DK-B12-08"])if(!zones.features.some(f=>f.properties.id===id))throw new Error(`Mangler zone: ${id}`);
if(!app.includes("createPublicTripEvidenceRuntime")||!app.includes("submitTripEvidenceObservation")||!app.includes("startWithPrompt"))throw new Error("Den direkte v2-tur er ikke koblet korrekt til brugerfladen");
for(const key of ["trip.form.startTitle","trip.form.submit","trip.form.startArea"]){
  if(!tripDialog.includes(`t('${key}'`))throw new Error(`Den aktive turdialog mangler central tekstnøgle: ${key}`);
}
if(!i18n.includes("'trip.form.startTitle':'Start en ravtur'")||!i18n.includes("'trip.form.submit':'Indsend tur'")||!i18n.includes("'trip.form.startArea':'Hvilket område starter du i?'"))throw new Error("Den danske fallback mangler den forståelige v2-rejse");
if(app.includes("tripZoneSearch")||app.includes("Administratorcenteret")||app.includes('value="much"'))throw new Error("Den gamle parallelle feedbackdialog må ikke være aktiv");
console.log(`Feedback-UI og ${zones.features.length} zoner valideret.`);
