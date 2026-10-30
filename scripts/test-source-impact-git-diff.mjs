import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-impact-git-'));
const owned=fs.lstatSync(root,{bigint:true}),pins=[];let passed=0;
const git=(...args)=>{try{return execFileSync('git',['-C',root,...args],
  {encoding:'utf8',stdio:['pipe','pipe','pipe']});}catch{throw new Error('SYNTHETIC_FIXTURE_GIT_FAILED');}};
const write=(name,bytes)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);};
const commit=message=>{git('add','--all');git('commit','-qm',message);return git('rev-parse','HEAD').trim();};
const files=['package.json','scripts/validate-source-once.mjs','scripts/source-impact-plan.mjs',
  'scripts/source-impact-git-diff.mjs','js/ui/about-i18n.js','js/ui/about-explainer-i18n.js',
  'js/ui/learn-i18n.js','js/ui/learn-i18n-de.js','js/ui/learn-i18n-en.js'];
try{
  git('init','-q');git('config','user.name','Synthetic impact test');git('config','user.email','fixture@example.invalid');
  git('config','core.autocrlf','false');git('config','core.filemode','true');
  for(const file of files){const bytes=fs.readFileSync(path.join(SOURCE,file));write(file,bytes);
    pins.push({path:file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  write('docs/rdks/90_INDEX/CURRENT_TRUTH.md','# Baseline\n');const base=commit('synthetic base');
  const {planSourceImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-git-diff.mjs')).href);
  const about=fs.readFileSync(path.join(root,'js/ui/about-i18n.js'),'utf8');
  write('js/ui/about-i18n.js',about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'"));
  const text=commit('synthetic about text');
  const run=(baseline,candidate,expected=candidate)=>plan({baselineCommit:baseline,candidateCommit:candidate,expectedHead:expected});
  const result=run(base,text);assert.equal(result.status,'PLANNED',result.failureCode);assert.equal(result.plan.selection,'TARGETED');
  assert.equal(result.git.changedRows,1);assert.equal(result.inventory.length,1);assert.equal(result.blobReads.count,2);
  assert.equal(result.qualifiedGitHubBaseline,false);assert.equal(result.deliveryAuthority,false);passed++;
  write('private/large.bin',Buffer.alloc(5*1024*1024,127));const large=commit('synthetic unknown binary');
  const unknown=run(text,large);assert.equal(unknown.plan.selection,'FULL');assert.equal(unknown.blobReads.count,0);
  assert.equal(unknown.git.changedRows,1);assert.equal(unknown.inventory[0].after.read,'NOT_KNOWN_TEXT_PATH');passed++;
  write('docs/rdks/90_INDEX/CURRENT_TRUTH.md',Buffer.alloc(4*1024*1024+1,97));const huge=commit('synthetic known over bound');
  const bounded=run(large,huge);assert.equal(bounded.plan.selection,'FULL');
  assert.equal(bounded.inventory[0].after.read,'TEXT_TOO_LARGE');assert(bounded.blobReads.bytes<4*1024*1024);passed++;
  write('js/ui/about-i18n.js',Buffer.from('binary\0body'));const binary=commit('synthetic binary at known path');
  const b=run(huge,binary);assert.equal(b.plan.selection,'FULL');assert.equal(b.inventory[0].after.read,'BINARY_OR_NON_UTF8');passed++;
  git('mv','docs/rdks/90_INDEX/CURRENT_TRUTH.md','docs/rdks/90_INDEX/renamed.md');const renamed=commit('synthetic rename');
  const rename=run(binary,renamed);assert.equal(rename.plan.selection,'FULL');assert.equal(rename.git.changedRows,2);
  assert.deepEqual(rename.inventory.map(row=>row.status).sort(),['A','D']);passed++;
  git('update-index','--chmod=+x','js/ui/about-i18n.js');git('commit','-qm','synthetic mode');const mode=git('rev-parse','HEAD').trim();
  const modeResult=run(renamed,mode);assert.equal(modeResult.plan.selection,'FULL');assert.equal(modeResult.blobReads.count,0);passed++;
  write('assets/ukendt navn-æ.txt','not a planner text input');const named=commit('synthetic unicode name');
  const names=run(mode,named);assert.equal(names.status,'PLANNED');assert.equal(names.plan.selection,'FULL');
  assert.equal(names.blobReads.count,0);assert(names.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')==='assets/ukendt navn-æ.txt'));passed++;
  const whole=run(base,named),expected=git('diff-tree','-r','--name-only','-z','--no-renames','--no-commit-id',base,named,'--')
    .split('\0').filter(Boolean).sort();
  assert.equal(whole.plan.selection,'FULL');assert.deepEqual(whole.inventory.map(row=>
    Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')).sort(),expected);passed++;
  const blob=git('rev-parse',named+':js/ui/about-i18n.js').trim();
  assert.equal(run(blob,named).failureCode,'SOURCE_IMPACT_GIT_NOT_COMMIT');passed++;
  assert.equal(run('f'.repeat(40),named).status,'REFUSED');passed++;
  assert.equal(run(base,named,text).failureCode,'SOURCE_IMPACT_GIT_EXPECTED_HEAD');passed++;
  assert.equal(run(base,text).failureCode,'SOURCE_IMPACT_GIT_ACTUAL_HEAD');passed++;
  const orphan=git('commit-tree',git('rev-parse',base+'^{tree}').trim(),'-m','synthetic unrelated root').trim();
  assert.equal(run(orphan,named).failureCode,'SOURCE_IMPACT_GIT_BASELINE_NOT_ANCESTOR');passed++;
  assert.equal(plan({baselineCommit:base,candidateCommit:named,expectedHead:named,paths:[]}).status,'REFUSED');passed++;
  assert.equal(run(named,named).plan.selection,'FULL');passed++;
  git('replace',named,base);assert.equal(run(base,named).status,'PLANNED');git('replace','-d',named);passed++;
  const controlName='assets/line\nbreak.txt';
  git('-c','core.protectNTFS=false','update-index','--add','--cacheinfo','100644,'+blob+','+controlName);
  git('-c','core.protectNTFS=false','commit','-qm','synthetic control name');const control=git('rev-parse','HEAD').trim();
  const safe=run(named,control);assert.equal(safe.status,'PLANNED');assert.equal(safe.plan.selection,'FULL');
  assert.equal(safe.blobReads.count,0);assert(safe.inventory.some(row=>
    Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===controlName));
  assert(safe.inventory.every(row=>!/[\x00-\x1f\x7f]/.test(row.pathDisplay)));passed++;
  const bomName='\uFEFFjs/ui/about-i18n.js';write(bomName,about);
  git('-c','core.protectNTFS=false','add','--',bomName);
  git('-c','core.protectNTFS=false','commit','-qm','synthetic unknown BOM path base');const bomBase=git('rev-parse','HEAD').trim();
  write(bomName,about.replace("'about.header':'Om projektet'","'about.header':'Om RavRadar'"));
  git('-c','core.protectNTFS=false','add','--',bomName);
  git('-c','core.protectNTFS=false','commit','-qm','synthetic unknown BOM path edit');const bomHead=git('rev-parse','HEAD').trim();
  const bom=run(bomBase,bomHead);assert.equal(bom.status,'PLANNED');assert.equal(bom.plan.selection,'FULL');
  assert.equal(bom.blobReads.count,0);assert.equal(Buffer.from(bom.inventory[0].pathUtf8Hex,'hex').toString('utf8'),bomName);passed++;
  write('js/ui/about-i18n.js',about.replace("'about.header':'Om projektet'","'about.header':'Missing-object fixture'"));
  git('add','--','js/ui/about-i18n.js');git('update-index','--chmod=-x','js/ui/about-i18n.js');
  git('commit','-qm','synthetic later known blob');const missing=git('rev-parse','HEAD').trim();
  const oid=git('rev-parse',missing+':js/ui/about-i18n.js').trim();
  const object=path.join(root,'.git','objects',oid.slice(0,2),oid.slice(2));
  assert(path.resolve(object).startsWith(path.join(root,'.git','objects')+path.sep));
  fs.unlinkSync(object);const absent=run(base,missing);
  assert.equal(absent.status,'REFUSED');assert.equal(absent.cheapPlanAvailable,false);passed++;
}finally{
  assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
}
console.log(JSON.stringify({kind:'PRIVATE_COMPLETE_GIT_IMPACT_TARGET',passed,failed:0,
  sourceCommandsExecuted:0,nativeSqlExecuted:false,qualifiedGitHubBaseline:false,production:false,fixtureSupport:pins.length}));
