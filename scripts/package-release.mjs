import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
const out=path.resolve('release',`RavRadar-${pkg.version}.zip`);
await fs.mkdir('release',{recursive:true});
await fs.rm(out,{force:true});
const excludes=['.git/*','node_modules/*','.cache/*','_site/*','_support/*','release/*.zip','*.env','.env*'];
const args=['-qr',out,'.',...excludes.flatMap(x=>['-x',x])];
const zip=spawnSync('zip',args,{stdio:'inherit'});
if(zip.status!==0)throw new Error('Kunne ikke bygge release-ZIP. Kontrollér at zip er installeret.');
const list=spawnSync('unzip',['-Z1',out],{encoding:'utf8'});
if(list.status!==0)throw new Error('Kunne ikke auditere release-ZIP.');
const files=list.stdout.split(/\r?\n/).filter(Boolean);
const forbidden=files.filter(f=>f==='.git'||f.startsWith('.git/')||f.startsWith('node_modules/')||f.startsWith('.cache/')||/(^|\/)\.env($|\.)/.test(f));
if(forbidden.length){await fs.rm(out,{force:true});throw new Error(`Release-ZIP indeholder forbudte filer: ${forbidden.slice(0,10).join(', ')}`)}
console.log(`Sikker releasepakke oprettet: ${out} (${files.length} filer).`);
