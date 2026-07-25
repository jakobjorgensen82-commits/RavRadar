import fs from 'node:fs/promises';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));const version=pkg.version;
const files=['index.html','admin.html','service-worker.js','app.js','js/ui/admin-dashboard.js','version.json'];
for(const file of files){const text=await fs.readFile(file,'utf8');if(!text.includes(version))throw new Error(`${file} viser ikke releaseversion ${version}.`);}
console.log(`Releaseversion ${version} er konsistent i app, admin, manifest og service worker.`);
