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
for(const file of ['index.html','admin.html','documentation.html','handbook.html','service-worker.js','app.js','js/ui/admin-dashboard.js','js/ui/admin-app.js','js/services/zone-registry.js']){
 let text=await fs.readFile(file,'utf8');
 text=text.replace(versionPattern,version);
 // Disse filer bærer kun den aktive app-version. Ret også drift fra ældre releases.
 text=text.replace(/4\.0\.\d+/g,version);
 await fs.writeFile(file,text);
}
// Releasebærende dokumenter kan være gledet fra package-versionen. Normalisér deres
// eksplicitte versionsfelter i stedet for kun at erstatte previousVersion.
{
 let text=await fs.readFile('HANDBOOK-RAVRADAR.md','utf8');
 text=text.replace(/(\*\*Håndbogsversion:\*\*\s*)\d+\.\d+\.\d+/,`$1${version}`);
 await fs.writeFile('HANDBOOK-RAVRADAR.md',text);
}
{
 const file='docs/handbook/content.json';
 const doc=JSON.parse(await fs.readFile(file,'utf8'));
 doc.handbookVersion=version;
 for(const section of doc.sections||[]){
   if(typeof section.title==='string')section.title=section.title.replace(/RavScore \d+\.\d+\.\d+/g,`RavScore ${version}`);
 }
 await fs.writeFile(file,JSON.stringify(doc,null,2)+'\n');
}
{
 const file='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
 let text=await fs.readFile(file,'utf8');
 text=text.replace(/(\"handbookVersion\"\s*:\s*\")\d+\.\d+\.\d+(\")/g,`$1${version}$2`);
 text=text.replace(/RavScore \d+\.\d+\.\d+/g,`RavScore ${version}`);
 await fs.writeFile(file,text);
}
console.log(`RavRadar-version opdateret fra ${previousVersion} til ${version}.`);
