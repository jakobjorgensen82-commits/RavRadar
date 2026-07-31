import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files=['js/ui/admin-dashboard.js','js/services/auth-service.js','js/services/admin-document-store.js','js/services/permissions-service.js'];
for (const file of files){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0) throw new Error(`${file} har syntaksfejl:\n${r.stderr||r.stdout}`);
}
const dashboard=await readFile('js/ui/admin-dashboard.js','utf8');
const permissionDeclarations=(dashboard.match(/const TAB_PERMISSIONS=/g)||[]).length;
if(permissionDeclarations!==1) throw new Error(`TAB_PERMISSIONS skal deklareres præcis én gang, fandt ${permissionDeclarations}`);
if(!dashboard.includes("button.addEventListener('click'")) throw new Error('Adminfanernes click-handler mangler');
if(!dashboard.includes('state.tab = button.dataset.tab')) throw new Error('Adminfanernes state-skift mangler');
console.log('Admin frontend: syntaks, fanebinding og rettighedsopsætning OK');
