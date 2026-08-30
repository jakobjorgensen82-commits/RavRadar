import fs from 'node:fs/promises';

const version=process.argv[2];
const preserveGeodataVersion=process.argv.includes('--preserve-geodata-version');
if(!/^\d+\.\d+\.\d+$/.test(version||''))throw new Error('Brug: node scripts/set-version.mjs X.Y.Z [--preserve-geodata-version]');

const packageBefore=JSON.parse(await fs.readFile('package.json','utf8'));
const previousVersion=packageBefore.version;
const replacements=[
 ['package.json',json=>({...json,version})],
 ['version.json',json=>({...json,version,minimumSupportedVersion:version,releasedAt:new Date().toISOString()})],
 ['data/admin/ravscore-profile-selection.json',json=>({
   ...json,
   sourceVersion:version,
   switchVersion:`RAVSCORE-PROFILE-SWITCH-${version}`
 })],
 ['scripts/fixtures/rav-assistant-local-evals-v1.json',json=>({...json,releaseVersion:version})]
];
if(!preserveGeodataVersion){
 replacements.push(
  ['data/kystdata.json',json=>({...json,version})],
  ['data/zones.geojson',json=>({...json,version})]
 );
}
for(const [file,transform] of replacements){
 const json=JSON.parse(await fs.readFile(file,'utf8'));
 await fs.writeFile(file,JSON.stringify(transform(json),null,2)+'\n');
}
const escaped=String(previousVersion).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const versionPattern=new RegExp(`\\b${escaped}\\b`,'g');
for(const file of ['index.html','admin.html','documentation.html','handbook.html','service-worker.js','app.js','js/ui/admin-dashboard.js','js/ui/admin-app.js','js/services/zone-registry.js']){
 let text=await fs.readFile(file,'utf8');
 text=text.replace(versionPattern,version);
 // Erstat kun den faktisk foregående release. Historiske migrationsgrænser og
 // driftsforklaringer i de samme filer er semantik, ikke aktive versionsfelter.
 await fs.writeFile(file,text);
}

// Alle browsermodulers cache-identitet skal følge releaseversionen. Tidligere
// kunne topniveauet vise en ny version, mens interne imports stadig brugte en
// gammel ?v=-parameter og dermed genbrugte et blandet modultræ fra cache.
const browserSources=[];
for(const root of ['.','js']){
  const walk=async dir=>{
    for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      if(['.git','node_modules','release'].includes(entry.name))continue;
      const rel=dir==='.'?entry.name:`${dir}/${entry.name}`;
      if(entry.isDirectory())await walk(rel);
      else if(/\.(?:js|html)$/.test(entry.name))browserSources.push(rel);
    }
  };
  if(root==='.'){
    // Private, generated KYSTZONER reviewkort er lokale artifacts og må ikke
    // omskrives som en del af en app-release.
    for(const file of await fs.readdir('.'))if(/\.(?:js|html)$/.test(file)&&!/^KYSTZONER-/.test(file))browserSources.push(file);
  }else await walk(root);
}
for(const file of [...new Set(browserSources)]){
  let text=await fs.readFile(file,'utf8');
  text=text.replace(/([?&]v=)\d+\.\d+\.\d+/g,`$1${version}`);
  await fs.writeFile(file,text);
}

// Aktive produktionsworkflows sender releaseversionen i deres User-Agent.
// Hold den tæt koblet til package-versionen, så et versionsløft ikke først
// opdages efter den dyre centrale datahydrering.
for(const file of ['.github/workflows/update-and-deploy.yml']){
  let text=await fs.readFile(file,'utf8');
  text=text.replace(/RavRadar\/\d+\.\d+\.\d+/g,`RavRadar/${version}`);
  await fs.writeFile(file,text);
}

// Profilomskifterens versionsmærke er en kompatibilitetskontrol. Ret kun
// mærket her; profilvalg, aktivering og rollback-id'er må ikke versionsløftes.
{
 const file='js/core/ravscore-profile-switch.js';
 let text=await fs.readFile(file,'utf8');
 text=text.replace(
   /(switchVersion:\s*'RAVSCORE-PROFILE-SWITCH-)\d+\.\d+\.\d+(')/,
   `$1${version}$2`
 );
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
 const handbook=JSON.parse(await fs.readFile('docs/handbook/content.json','utf8'));
 const sqlPayload=JSON.stringify(handbook).replace(/'/g,"''");
 const marker="insert into public.admin_documents(document_key,payload,updated_by) values('handbook','";
 const start=text.indexOf(marker);
 const payloadStart=start+marker.length;
 const payloadEnd=text.indexOf("'::jsonb,null)",payloadStart);
 if(start<0||payloadEnd<0)throw new Error('Supabase-installationsfilens håndbogspayload kunne ikke findes.');
 text=`${text.slice(0,payloadStart)}${sqlPayload}${text.slice(payloadEnd)}`;
 await fs.writeFile(file,text);
}
console.log(`RavRadar-version opdateret fra ${previousVersion} til ${version}.${preserveGeodataVersion?' Geodataenes versionsfelter er bevaret uændret.':''}`);
