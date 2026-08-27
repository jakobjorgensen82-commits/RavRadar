import fs from 'node:fs';
import path from 'node:path';
const forbidden=[['rav','fund','.dk'].join(''),['rav','udsigten','.com'].join('')];
const roots=['.'];
const skip=new Set(['node_modules','.git','release','.audit','.cache','.geometry-v2-work','.owner-review','.pnpm-store']);
const binary=/\.(?:png|jpe?g|gif|webp|zip|gz|woff2?|ttf|ico|pdf)$/i;
const internalSourceExceptions=new Set([
 path.normalize('docs/rdks/30_FEATURES/INTERNAL-RAVRADAR-RAVUDSIGTEN-ANALYSE.md'),
]);
const hits=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(skip.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(!binary.test(entry.name)&&!internalSourceExceptions.has(full)){
   let text='';try{text=fs.readFileSync(full,'utf8').toLowerCase();}catch{continue;}
   for(const token of forbidden)if(text.includes(token))hits.push(`${full}: ${token}`);
  }
 }
}
for(const root of roots)walk(root);
if(hits.length)throw new Error(`Eksterne kildenavne fundet i projektet:\n${hits.join('\n')}`);
for(const full of internalSourceExceptions){
 const text=fs.readFileSync(full,'utf8').toLowerCase();
 for(const marker of [
  'status: **aktiv, intern og score-neutral**',
  'offentlig runtime: **ingen**',
  'dokumentet er internt rdks-materiale',
  'det må ikke kopieres til appen',
  'må aldrig ændre candidate g automatisk',
 ])if(!text.includes(marker))throw new Error(`${full}: den eneste kildeundtagelse mangler intern sikkerhedsmarkør: ${marker}`);
}
console.log('✓ Offentlige artefakter og øvrige projektfiler er kildeneutrale; den eksakte interne RDKS-analyse er afgrænset');
