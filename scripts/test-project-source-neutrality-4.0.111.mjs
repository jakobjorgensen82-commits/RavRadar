import fs from 'node:fs';
import path from 'node:path';
const forbidden=[['rav','fund','.dk'].join(''),['rav','udsigten','.com'].join('')];
const roots=['.'];
const skip=new Set(['node_modules','.git','release','.audit','.cache','.geometry-v2-work','.owner-review','.pnpm-store']);
const binary=/\.(?:png|jpe?g|gif|webp|zip|gz|woff2?|ttf|ico|pdf)$/i;
const hits=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(skip.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(!binary.test(entry.name)){
   let text='';try{text=fs.readFileSync(full,'utf8').toLowerCase();}catch{continue;}
   for(const token of forbidden)if(text.includes(token))hits.push(`${full}: ${token}`);
  }
 }
}
for(const root of roots)walk(root);
if(hits.length)throw new Error(`Eksterne kildenavne fundet i projektet:\n${hits.join('\n')}`);
console.log('✓ Projektets formuleringer og artefakter er kildeneutrale');
