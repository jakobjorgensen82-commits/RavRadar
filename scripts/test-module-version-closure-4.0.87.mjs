import fs from 'node:fs/promises';
import path from 'node:path';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const roots=['bootstrap.js','app.js','admin.html','index.html','documentation.html','handbook.html','supabase-setup.html'];
const jsFiles=[];
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const rel=path.join(dir,entry.name);if(entry.isDirectory())await walk(rel);else if(entry.name.endsWith('.js'))jsFiles.push(rel.replaceAll('\\','/'));}}
await walk('js');
const failures=[];
for(const file of [...roots,...jsFiles]){
  const text=await fs.readFile(file,'utf8');
  for(const match of text.matchAll(/[?&]v=(\d+\.\d+\.\d+)/g))if(match[1]!==version)failures.push(`${file}: ${match[0]} (forventede ${version})`);
}
if(failures.length){console.error('Modulversionering fejlede:\n- '+failures.slice(0,50).join('\n- '));process.exit(1)}
console.log(`OK: Alle aktive browserimports bruger releaseversion ${version}.`);
