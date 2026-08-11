import fs from "node:fs";
const workflow=fs.readFileSync(".github/workflows/update-and-deploy.yml","utf8");
const generator=fs.readFileSync("scripts/refine-coastlines-constrained-4.0.48.py","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const zones=JSON.parse(fs.readFileSync("data/zones.geojson","utf8"));
const audit=JSON.parse(fs.readFileSync("data/diagnostics/constrained-coastline-4.0.48.json","utf8"));
const fail=[];
if(!workflow.includes("refine-coastlines-constrained-4.0.48.py")) fail.push("workflow kører ikke 4.0.48-generatoren");
if(workflow.includes("--minimum-generated 190")) fail.push("workflow indeholder stadig den brede 4.0.47-aktivering");
if(!generator.includes("constrained-nearest-natural-coast")) fail.push("generator mangler begrænset refinement mode");
if(!pkg.scripts["build:constrained-coastlines"]) fail.push("package-script mangler");
const approvedPreciseZones=zones.features.filter(feature=>feature?.properties?.coastLineVersion==="4.0.182").length;
if(audit.refinedZones+audit.fallbackZones+approvedPreciseZones<zones.features.length) fail.push("audit dækker færre zoner end det aktive register");
if(zones.features.length<1) fail.push("zonefilen er tom");
if(fail.length){console.error(fail.join("\n"));process.exit(1)}
console.log("Constrained coastline workflow integration passed");
