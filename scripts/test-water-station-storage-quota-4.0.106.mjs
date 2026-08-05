import fs from "node:fs";

const store=fs.readFileSync("js/services/admin-document-store.js","utf8");
const dashboard=fs.readFileSync("js/ui/admin-dashboard.js","utf8");
if(!store.includes("LOCAL_CACHE_KEYS"))throw new Error("Manglende allowlist for lokal admincache.");
for(const key of ["dmi-water-stations","runtime-diagnostics","water-station-routing-audit","ocean-diagnostics","cache-audit","implementation-audit"]){
  const allowlist=store.match(/LOCAL_CACHE_KEYS=new Set\(\[([^\]]+)\]\)/s)?.[1]||"";
  if(allowlist.includes(`'${key}'`)||allowlist.includes(`\"${key}\"`))throw new Error(`${key} må ikke fylde localStorage.`);
}
if(!store.includes("central gemning fortsætter"))throw new Error("Quota-fejl skal være ikke-blokerende.");
if(!dashboard.includes("setLocalJsonSafely(WATER_ROUTING_KEY,state.waterRouting)"))throw new Error("Vandstandsrouting bruger stadig ubeskyttet localStorage.setItem.");
if(/function saveWaterRouting\(\)\{[^}]*localStorage\.setItem\(WATER_ROUTING_KEY/s.test(dashboard))throw new Error("saveWaterRouting kan stadig afbrydes af QuotaExceededError.");
console.log("✓ LocalStorage-kvote kan ikke længere blokere røde markører eller central routinggemning");
