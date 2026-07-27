import fs from 'node:fs/promises';

const version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Brug: node scripts/set-version.mjs X.Y.Z');

const packageBefore=JSON.parse(await fs.readFile('package.json','utf8'));
const previousVersion=packageBefore.version;
const replacements=[
 ['package.json',json=>({...json,version})],
 ['version.json',json=>({...json,version,minimumSupportedVersion:version,releasedAt:new Date().toISOString()})],
 ['data/kystdata.json',json=>({...json,version})],
 ['data/zones.geojson',json=>({...json,version})]
];
for(const [file,transform] of replacements){
 const json=JSON.parse(await fs.readFile(file,'utf8'));
 await fs.writeFile(file,JSON.stringify(transform(json),null,2)+'\n');
}
const escaped=String(previousVersion).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const versionPattern=new RegExp(`\\b${escaped}\\b`,'g');
for(const file of ['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','js/services/zone-registry.js']){
 let text=await fs.readFile(file,'utf8');
 text=text.replace(versionPattern,version);
 await fs.writeFile(file,text);
}
console.log(`RavRadar-version opdateret fra ${previousVersion} til ${version}.`);
