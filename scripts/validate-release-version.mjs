import fs from 'node:fs/promises';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));const version=pkg.version;
const files=['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','version.json'];
for(const file of files){const text=await fs.readFile(file,'utf8');if(!text.includes(version))throw new Error(`${file} viser ikke releaseversion ${version}.`);}
const workflow=await fs.readFile('.github/workflows/update-and-deploy.yml','utf8');
const workflowVersions=[...workflow.matchAll(/RavRadar\/(\d+\.\d+\.\d+)/g)].map(match=>match[1]);
if(workflowVersions.length===0)throw new Error('Produktionsworkflowet mangler en versionsbåret RavRadar User-Agent.');
for(const workflowVersion of workflowVersions){
  if(workflowVersion!==version)throw new Error(`Produktionsworkflowets User-Agent viser ${workflowVersion}, men releaseversionen er ${version}.`);
}
console.log(`Releaseversion ${version} er konsistent i app, admin, manifest, service worker og produktionsworkflow.`);
