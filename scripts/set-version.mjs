import fs from 'node:fs/promises';
const version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Brug: node scripts/set-version.mjs X.Y.Z');
const replacements=[
 ['package.json',json=>({...json,version})],
 ['version.json',json=>({...json,version,minimumSupportedVersion:version,releasedAt:new Date().toISOString()})],
 ['data/kystdata.json',json=>({...json,version})],
 ['data/zones.geojson',json=>({...json,version})]
];
for(const [file,transform] of replacements){const json=JSON.parse(await fs.readFile(file,'utf8'));await fs.writeFile(file,JSON.stringify(transform(json),null,2)+'\n');}
for(const file of ['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','js/services/zone-registry.js']){
 let text=await fs.readFile(file,'utf8');text=text.replace(/3\.1\.1/g,version).replace(/3\.0\.2/g,version).replace(/3\.0\.1/g,version);await fs.writeFile(file,text);
}
console.log(`RavRadar-version opdateret til ${version}.`);
