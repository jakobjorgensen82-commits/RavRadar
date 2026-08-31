import fs from 'node:fs/promises';
import { PRODUCTION_WORKFLOW_SOURCES } from './lib/production-workflow-sources.mjs';
import { synchronizeReleaseContractMetadata } from './sync-release-contract-metadata.mjs';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));const version=pkg.version;
const files=['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','version.json'];
for(const file of files){const text=await fs.readFile(file,'utf8');if(!text.includes(version))throw new Error(`${file} viser ikke releaseversion ${version}.`);}
const browserSources=[];
const walk=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=`${dir}/${entry.name}`;if(entry.isDirectory())await walk(rel);else if(/\.(?:js|html)$/.test(entry.name))browserSources.push(rel);}};
await walk('js');
for(const file of await fs.readdir('.'))if(/\.(?:js|html)$/.test(file)&&!/^KYSTZONER-/.test(file))browserSources.push(file);
for(const file of browserSources){
  const text=await fs.readFile(file,'utf8');
  for(const match of text.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g)){
    if(match[1]!==version)throw new Error(`${file} importerer browserkode med cacheversion ${match[1]}, men releaseversionen er ${version}.`);
  }
}
const serviceWorker=await fs.readFile('service-worker.js','utf8');
if(!serviceWorker.includes(`const APP_VERSION = "${version}"`))throw new Error(`Service workerens cacheidentitet følger ikke ${version}.`);
let workflowUserAgentCount=0;
for(const [role,file] of Object.entries(PRODUCTION_WORKFLOW_SOURCES)){
  const workflow=await fs.readFile(file,'utf8');
  const workflowVersions=[...workflow.matchAll(/RavRadar\/(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
  workflowUserAgentCount+=workflowVersions.length;
  for(const workflowVersion of workflowVersions){
    if(workflowVersion!==version)throw new Error(`Produktionsworkflowets ${role}-rolle viser User-Agent ${workflowVersion}, men releaseversionen er ${version}.`);
  }
}
if(workflowUserAgentCount===0)throw new Error('Produktionsworkflowrollerne mangler en versionsbåret RavRadar User-Agent.');
await synchronizeReleaseContractMetadata();
const versionSetter=await fs.readFile('scripts/set-version.mjs','utf8');
if(/text\s*=\s*text\.replace\(\/4\\\.0\\\.\\d\+\/g/.test(versionSetter)){
  throw new Error('Versionsværktøjet må ikke bredt omskrive historiske 4.0.x-henvisninger i aktive kodefiler.');
}
const adminDashboard=await fs.readFile('js/ui/admin-dashboard.js','utf8');
if(!adminDashboard.includes('databasemigreringen til 4.0.310')){
  throw new Error('Adminens historiske besøgsstatistik-migrationsgrænse er ikke længere bundet til 4.0.310.');
}
console.log(`Releaseversion ${version} er konsistent i app, admin, manifest, service worker, produktionsworkflowroller og releasekontrakt.`);
