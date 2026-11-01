import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {scanAllSourceDependencies} from './lib/source-impact-control-imports.mjs';
const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE='169bebcd7bf2c4389be63c31dcd76fb303d71621';
const LEGACY_BASE='a4dc9319dbf42cdd7fc8116733ad4eeef46e0525',LEGACY_REFERENCE='e8786fabba66bd9184ab08a0c8c83bf97711f807';
const files=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-594.json',
  'scripts/test-source-impact-domain-inputs.mjs','scripts/source-impact-domain-plan.mjs',
  'scripts/lib/source-impact-control-imports.mjs','scripts/lib/source-impact-domain-owners-594.json',
  'scripts/test-source-impact-domain-plan.mjs','scripts/test-candidate-g-rollback-metadata-order.mjs',
  'scripts/source-targeted-receipt.mjs','scripts/source-targeted-producer.mjs',
  'scripts/source-targeted-consumer.mjs','scripts/weather-source-gate.mjs'];
const environment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic domain plan',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic domain plan',GIT_COMMITTER_EMAIL:'fixture@example.invalid'};
const git=(root,args,input)=>execFileSync('git',['-C',root,...args],{input,env:environment,timeout:10000,
  maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(root,args,input)=>git(root,args,input).toString('utf8').trim();
test('all-specifier scanner exposes bare/URL/data/require/computed imports and tracks read/command surfaces',()=>{
  const source="import fs from 'node:fs';export {x} from 'pkg';import 'https://example.invalid/a.js';import('data:text/javascript,1');require('other');import(selected);fs.readFileSync('known.json');";
  const scan=scanAllSourceDependencies(source);
  assert.deepEqual(scan.imports.map(row=>row.specifier),['node:fs','pkg','https://example.invalid/a.js','data:text/javascript,1','other',null]);
  assert.equal(scan.computedImportBoundaries.length,1);assert(scan.dependencySurfaces.some(row=>row.callee==='readFileSync'));
  assert.deepEqual(scanAllSourceDependencies("// import('hidden')\nconst x=/import\\('fake'\\)/;const y=\"import('string')\";").imports,[]);
  assert.notDeepEqual(scanAllSourceDependencies("const file='known.json';readFileSync(file);").dependencySurfaces,
    scanAllSourceDependencies("const file='unknown.json';readFileSync(file);").dependencySurfaces);
});
test('normal closed domain planner handles real composition, one same-tree merge and bounded negative mutations',async()=>{
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain-plan-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
    const objectDirectory=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objectDirectory.replaceAll('\\','/')+'\n');
    // Use the actual whole committed candidate, including every extracted leaf.
    const reference=text(SOURCE,['rev-parse','HEAD^{commit}']);
    git(root,['merge-base','--is-ancestor',BASE,reference]);
    const referenceTree=text(root,['rev-parse',reference+'^{tree}']);
    const readTree=id=>git(root,['ls-tree','-z',id]).toString('utf8').split('\0').filter(Boolean).map(line=>{
      const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
    function rewrite(tree,changes){
      const rows=tree?readTree(tree):[],groups=new Map();
      for(const [file,body]of changes){const [name,...tail]=file.split('/');const entries=groups.get(name)??[];entries.push([tail.join('/'),body]);groups.set(name,entries);}
      for(const [name,entries]of groups){const prior=rows.find(row=>row.name===name);let value;
        if(entries[0][0]==='')value={mode:'100644',type:'blob',name,oid:text(root,['hash-object','-w','--stdin'],entries[0][1])};
        else value={mode:'040000',type:'tree',name,oid:rewrite(prior?.oid,entries)};
        if(prior)rows.splice(rows.indexOf(prior),1);rows.push(value);
      }
      return git(root,['mktree','--missing','-z'],rows.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join('')).toString('utf8').trim();
    }
    // hash-object needs binary stdin; no checkout or shared object is mutated.
    const commit=(tree,parents,label)=>git(root,['commit-tree',tree,...parents.flatMap(ref=>['-p',ref]),'-m',label]).toString('utf8').trim();
    const additions=files.map(file=>[file,git(root,['cat-file','blob',reference+':'+file])]);
    // Explicit harmless changes keep the original D1/admin selection assertions real.
    const syntheticOwners=['js/ui/admin-private-trip-study.js','cloudflare/trip-gateway/trip-aggregate-job.js'];
    const tree=rewrite(referenceTree,syntheticOwners.map(file=>[file,Buffer.concat([
      git(root,['cat-file','blob',reference+':'+file]),Buffer.from('\n// Synthetic domain-plan owner selection.\n'),
    ])])),candidate=commit(tree,[reference],'synthetic reviewed composition');
    git(root,['update-ref','HEAD',candidate]);
    for(const [file,body]of additions){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),body);}
    const {planSourceDomainImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-plan.mjs')).href);
    const run=head=>{git(root,['update-ref','HEAD',head]);return plan({baselineCommit:BASE,candidateCommit:head,expectedHead:head});};
    const actual=run(candidate);assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
    assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
    assert.equal(actual.skipAuthorized,false);assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');
    assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');assert.equal(actual.domains.d1.status,'SELECTED');
    assert(actual.commands.includes('node --test scripts/test-account-statistics-assistant-callers.mjs'));
    assert(!actual.commands.includes('node --test scripts/test-private-trip-study-categorical-controller.mjs'));
    assert(!actual.commands.includes('node --test scripts/test-trip-aggregate-month-rollover.mjs'));
    assert(actual.domains.currentCandidateGAudit.commands.includes('node --test scripts/test-candidate-g-rollback-metadata-order.mjs'));
    for(const domain of Object.values(actual.domains))if(domain.status==='SELECTED'){
      assert(domain.commands.length>0);assert(domain.commands.every(command=>actual.commands.includes(command)));
    }
    const pagesTarget='node scripts/test-forecast-share-pages-deploy.mjs';
    assert.equal(actual.domains.sharing.status,'SELECTED');
    assert.equal(actual.commands.filter(command=>command===pagesTarget).length,1,
      'Pages product/workflow/test owners select their normal controller target once');
    const direct=plan({baselineCommit:'7a08f6a8dfb2131898e7270a2429c3f4f810a842',
      candidateCommit:candidate,expectedHead:candidate});
    assert.equal(direct.status,'PLANNED',JSON.stringify(direct.reasonCodes));
    assert.equal(direct.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(direct.reasonCodes));
    assert.equal(direct.domains.postgres.status,'NOT_APPLICABLE');
    assert.equal(direct.domains.sharing.status,'SELECTED');
    assert.equal(direct.commands.filter(command=>command===pagesTarget).length,1);
    for(const document of ['docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md','docs/rdks/MASTER_LOG.md']){
      const body=git(root,['cat-file','blob',reference+':'+document]);
      const documentCandidate=commit(rewrite(referenceTree,[[document,Buffer.concat([
        body,Buffer.from('\n<!-- Synthetic canonical documentation owner check. -->\n'),
      ])]]),[reference],'synthetic canonical documentation owner');
      git(root,['update-ref','HEAD',documentCandidate]);
      const documentPlan=plan({baselineCommit:reference,candidateCommit:documentCandidate,expectedHead:documentCandidate});
      assert.equal(documentPlan.selection,'TARGETED_DOMAINS',JSON.stringify(documentPlan.reasonCodes));
      assert.equal(documentPlan.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(documentPlan.domains.documentation.status,'SELECTED');
      assert(documentPlan.domains.documentation.commands.includes('node scripts/validate-rdks.mjs'));
    }
    const unknownDocument='docs/rdks/90_INDEX/UNREGISTERED-PAGES-NOTE.md';
    const unknownDocumentCandidate=commit(rewrite(referenceTree,[[unknownDocument,
      Buffer.from('# Synthetic unknown documentation path must remain unclassified.\n')]]),[reference],'synthetic unknown documentation owner');
    git(root,['update-ref','HEAD',unknownDocumentCandidate]);
    assert.deepEqual(plan({baselineCommit:reference,candidateCommit:unknownDocumentCandidate,
      expectedHead:unknownDocumentCandidate}).reasonCodes,['UNCLASSIFIED_OWNER:'+unknownDocument]);
    const merged=commit(tree,[reference,candidate],'synthetic same-tree main merge'),onMerge=run(merged);
    assert.equal(text(root,['rev-parse',merged+'^{tree}']),text(root,['rev-parse',candidate+'^{tree}']));
    assert.equal(text(root,['rev-list','--parents','-n','1',merged]).split(' ').length,3);
    assert.deepEqual(onMerge,actual,'Tree-identical producer and merge must have identical plan/digests');
    const pagesWorkflow='.github/workflows/deploy-forecast-share-pages.yml';
    const pagesWorkflowBody=git(root,['cat-file','blob',candidate+':'+pagesWorkflow]);
    const unknownPagesWorkflow=commit(rewrite(tree,[[pagesWorkflow,Buffer.concat([
      pagesWorkflowBody,Buffer.from('\n# Unknown Pages workflow bytes must require full selection.\n'),
    ])]]),[candidate],'synthetic Pages exact-source drift');
    assert.deepEqual(run(unknownPagesWorkflow).reasonCodes,
      ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+pagesWorkflow]);
    const owner='js/ui/admin-private-trip-study.js',old=git(root,['cat-file','blob',candidate+':'+owner]);
    const mutate=(body,label)=>run(commit(rewrite(tree,[[owner,body]]),[candidate],label));
    assert.equal(mutate(Buffer.concat([old,Buffer.from('\nconst unusedInternalDomainCheck=true;\n')]),'pure internal edit').selection,'CONTROL_QUALIFICATION_REQUIRED');
    assert.equal(mutate(Buffer.concat([old,Buffer.from("\nconsole.log('scripts/source-impact-plan.mjs');\n")]),
      'diagnostic existing filename without IO').selection,'CONTROL_QUALIFICATION_REQUIRED');
    for(const extra of ["\nimport 'unknown-bare-package';\n","\nimport('data:text/javascript,1');\n",'\nimport(unknownSpecifier);\n',
      "\nreadFileSync('unlisted-private.json');\n","\nspawn('uninstalled-program',[]);\n"]){
      assert.equal(mutate(Buffer.concat([old,Buffer.from(extra)]),'unknown dependency').selection,'FULL');
    }
    const control='scripts/source-targeted-producer.mjs',controlBody=git(root,['cat-file','blob',candidate+':'+control]);
    for(const extra of ["\nimport {readFileSync as load} from 'node:fs';load('unknown.json');\n",
      "\nfs['readFileSync']('unknown.json');\n","\nnew Function('return process')();\n"]){
      assert.equal(run(commit(rewrite(tree,[[control,Buffer.concat([controlBody,Buffer.from(extra)])]]),[candidate],'unknown capability seam')).selection,'FULL');
    }
    const pg='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
    const changed=commit(rewrite(tree,[[pg,Buffer.concat([git(root,['cat-file','blob',candidate+':'+pg]),Buffer.from('\n// PG input delta\n')])]]),[candidate],'changed PostgreSQL input');
    assert.deepEqual(run(changed).reasonCodes,['POSTGRES_OR_MODEL_INPUT_CHANGED']);
    // Age is not a rejection reason once a whole transition has been reviewed.
    // Keep the historical partial composition, but give it a genuinely unreviewed exact owner.
    const unreviewed='.github/workflows/reusable-pages-deploy.yml';
    const unreviewedBody=Buffer.concat([git(root,['cat-file','blob',LEGACY_REFERENCE+':'+unreviewed]),
      Buffer.from('\n# Synthetic unreviewed whole Pages-workflow transition.\n')]);
    const obsoleteTree=rewrite(text(root,['rev-parse',LEGACY_REFERENCE+'^{tree}']),[...additions,[unreviewed,unreviewedBody]]);
    const obsolete=commit(obsoleteTree,[LEGACY_REFERENCE],'synthetic obsolete partial composition');
    git(root,['update-ref','HEAD',obsolete]);
    const refused=plan({baselineCommit:LEGACY_BASE,candidateCommit:obsolete,expectedHead:obsolete});
    assert.equal(refused.selection,'FULL');
    assert.deepEqual(refused.reasonCodes,['UNKNOWN_EXACT_SOURCE_TRANSITION:.github/workflows/reusable-pages-deploy.yml']);
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
    fs.rmSync(root,{recursive:true,force:false});
  }
});
