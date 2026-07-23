import fs from "node:fs";
const plan=JSON.parse(fs.readFileSync("data/zone-plan.json","utf8"));
if(plan.schemaVersion!==1||!Array.isArray(plan.zones)) throw new Error("Ugyldig zone-plan");
const ids=new Set(), names=new Set();
for(const z of plan.zones){
 if(!z.planId||ids.has(z.planId)) throw new Error(`Dubleret planId: ${z.planId}`);
 if(!z.name||names.has(z.name)) throw new Error(`Dubleret/manglende navn: ${z.name}`);
 if(!["planned","review","active"].includes(z.status)) throw new Error(`${z.planId}: ugyldig status`);
 ids.add(z.planId); names.add(z.name);
}
console.log(`OK: ${plan.zones.length} planlagte zoner i ${plan.batches.length} batches.`);
