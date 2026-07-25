import fs from "node:fs";
const app=fs.readFileSync("app.js","utf8");const zones=JSON.parse(fs.readFileSync("data/zones.geojson","utf8"));
for(const name of ["Kolding Fjord og Løverodde","Haderslev Fjord og Årøsund","Genner Bugt og Aabenraa Fjord","Sønderborg Bugt og Dybbøl","Als syd og Kegnæs","Als øst og Fynshav"])if(!zones.features.some(f=>f.properties.name===name))throw new Error(`Mangler zone: ${name}`);
if(!app.includes("tripZoneSearch")||!app.includes("Indsend")||app.includes('value="much"'))throw new Error("Feedbackdialogen er ikke opdateret korrekt");
if(!app.includes("Administratorcenteret"))throw new Error("Administratorcenter-kvittering mangler");
console.log(`Feedback-UI og ${zones.features.length} zoner valideret.`);
