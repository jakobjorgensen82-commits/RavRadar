import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const site=path.join(root,'_site-module-test');
await fs.rm(site,{recursive:true,force:true});
await fs.mkdir(site,{recursive:true});
const excludes=[
 '.git/','.github/','_site/','_site-module-test/','.cache/','node_modules/','scripts/','docs/',
 'data/diagnostics/','data/live/weather-health.json','data/live/ravradar-runtime-diagnostics.json',
 'data/live/dmi-water-stations.json','data/live/water-station-routing-audit.json','handbook.html',
 'handbook.css','documentation.html','js/ui/handbook.js','schemas/','supabase/','requirements-dmi.txt',
 'package.json','package-lock.json','CHANGELOG*.md','DELIVERY*.md','INSTALLATION-GUIDE*.md','B02-PLACEMENT-AUDIT.md'
];
const args=['-a','./',`${site}/`,...excludes.flatMap(x=>['--exclude',x])];
const rsync=spawnSync('rsync',args,{cwd:root,encoding:'utf8'});
if(rsync.error?.code==='ENOENT'){
 const excluded=(source)=>{
  const rel=path.relative(root,source).split(path.sep).join('/');
  if(!rel)return false;
  if(/^CHANGELOG.*\.md$/i.test(rel)||/^DELIVERY.*\.md$/i.test(rel)||/^INSTALLATION-GUIDE.*\.md$/i.test(rel))return true;
  return excludes.some(item=>rel===item.replace(/\/$/,'')||rel.startsWith(item));
 };
 const tracked=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'});
 if(tracked.status!==0)throw new Error(`Kunne ikke finde projektfiler: ${tracked.stderr||tracked.stdout}`);
 const projectFiles=new Set([...tracked.stdout.split('\0').filter(Boolean),'js/services/visit-counter.js','js/services/visitor-report-service.js']);
 for(const rel of projectFiles){
  const source=path.join(root,rel);if(excluded(source))continue;
  const target=path.join(site,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);
 }
}else if(rsync.status!==0) throw new Error(`Kunne ikke bygge testartifact: ${rsync.stderr||rsync.stdout||rsync.error?.message}`);

const entryHtml=['index.html','admin.html'];
const queue=[];
for(const rel of entryHtml){
 const text=await fs.readFile(path.join(site,rel),'utf8');
 for(const m of text.matchAll(/<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/gi)){
  const clean=m[1].split('?')[0].replace(/^\.\//,'');
  queue.push(clean);
 }
}
const visited=new Set();
while(queue.length){
 const rel=queue.shift();
 if(visited.has(rel)) continue;
 visited.add(rel);
 const abs=path.join(site,rel);
 try{await fs.access(abs);}catch{throw new Error(`Pages-artifact mangler browsermodul: ${rel}`)}
 const text=await fs.readFile(abs,'utf8');
 const base=path.posix.dirname(rel);
 const imports=[...text.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g)].map(m=>m[1]);
 for(const spec of imports){
  if(!spec.startsWith('.')) continue;
  const child=path.posix.normalize(path.posix.join(base,spec.split('?')[0]));
  queue.push(child);
 }
}
if(!visited.has('js/services/handbook-review-store.js')) throw new Error('Admin-importgrafen nåede ikke handbook-review-store.js');
await fs.rm(site,{recursive:true,force:true});
console.log(`Pages-modullukning bestået: ${visited.size} browsermoduler findes i deploy-artifactet.`);
