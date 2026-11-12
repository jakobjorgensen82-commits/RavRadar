import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {scanAllSourceDependencies} from './lib/source-impact-control-imports.mjs';
import {createHash} from 'node:crypto';
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

test('reviewed admin original snapshot closes direct and cumulative plans and rejects unknown broad-source bytes',async()=>{
  const reference='72150501445c9c44e6603c17d3d2561bb270d9cf';
  // This completed admin review is a historical CODE/DATA fixture, pinned before the later fixed-reader registration.
  const adminReviewedHead='14ade133b7f3b9557f312630a5b557086245b938';
  const adminFiles=new Set([...files,'admin.html','js/services/data-service.js',
    'js/services/site-function-test-service.js','js/ui/admin-dashboard.js','service-worker.js',
    'scripts/test-ravscore-public-data-service-binding.mjs']);
  const readReviewedAdminFile=file=>{assert(adminFiles.has(file));
    return git(SOURCE,['cat-file','blob',adminReviewedHead+':'+file]);};
  const registryFile='scripts/lib/source-impact-domain-owners-594.json';
  const prior=JSON.parse(git(SOURCE,['cat-file','blob',reference+':'+registryFile]));
  const current=JSON.parse(readReviewedAdminFile(registryFile));
  assert.equal(prior.owners.length,84);assert.equal(current.owners.length,90);
  for(const owner of prior.owners)assert.deepEqual(current.owners.find(row=>row.path===owner.path),owner);
  for(const [file,source]of Object.entries(prior.sources))for(const [key,values]of Object.entries(source))
    for(const value of values)assert(current.sources[file][key].includes(value),'Preserve reviewed source seam: '+file);
  for(const key of ['resourceFiles','commands','commonCommands','controlSuite','normalParents',
    'auditMetadataTransitions','runtimePrerequisites'])assert.deepEqual(current[key],prior[key]);
  assert.equal(current.resourceFiles.length,552);
  for(const [file,pairs]of Object.entries(prior.exactSourceTransitions))
    for(const pair of pairs)assert(current.exactSourceTransitions[file].includes(pair));
  const products=['admin.html','js/services/data-service.js','js/services/site-function-test-service.js',
    'js/ui/admin-dashboard.js','service-worker.js','scripts/test-ravscore-public-data-service-binding.mjs'];
  const exact=products.filter(file=>file!=='js/ui/admin-dashboard.js'&&!file.startsWith('scripts/'));
  for(const file of exact)assert.equal(current.owners.find(row=>row.path===file).exactSourceTransition,true);
  const targets=['node scripts/test-ravscore-public-data-service-binding.mjs',
    'node scripts/test-admin-active-ravscore-runtime.mjs','node scripts/test-ravscore-public-browser-closure.mjs'];
  assert(current.sources['scripts/test-ravscore-public-data-service-binding.mjs'].nodeImports.includes('node:vm'));
  assert(current.sources['scripts/test-ravscore-public-data-service-binding.mjs'].imports.includes('js/ui/admin-active-ravscore.js'));
  assert(current.sources['scripts/test-ravscore-public-data-service-binding.mjs'].resources.includes('js/ui/admin-dashboard.js'));
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-admin-domain-plan-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
    const objectDirectory=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objectDirectory.replaceAll('\\','/')+'\n');
    const controls=['scripts/source-impact-domain-plan.mjs',registryFile,'scripts/test-source-impact-domain-plan.mjs'];
    const additions=[...products,...controls].map(file=>[file,readReviewedAdminFile(file)]);
    const make=(rows,label)=>{
      git(root,['read-tree',reference]);
      for(const [file,body]of rows){const blob=text(root,['hash-object','-w','--stdin'],body);
        git(root,['update-index','--add','--cacheinfo','100644',blob,file]);}
      return text(root,['commit-tree',text(root,['write-tree']),'-p',reference,'-m',label]);
    };
    for(const file of files){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
      fs.writeFileSync(path.join(root,file),readReviewedAdminFile(file));}
    const {planSourceDomainImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-plan.mjs')).href);
    const run=(candidate,baseline=reference)=>{git(root,['update-ref','HEAD',candidate]);
      return plan({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});};
    const candidate=make(additions,'synthetic exact reviewed admin original snapshot');
    for(const baseline of [reference,BASE]){
      const actual=run(candidate,baseline);
      assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(actual.domains.adminUI.status,'SELECTED');
      assert.equal(actual.domains.d1.status,'SELECTED','Preserve the existing dashboard D1 owner');
      assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      for(const target of targets)assert.equal(actual.commands.filter(command=>command===target).length,1);
      assert(actual.commands.includes('node scripts/test-module-version-closure-4.0.87.mjs'));
      assert(actual.commands.includes('node scripts/validate-release-version.mjs'));
    }
    for(const file of exact){
      const changed=additions.map(([name,body])=>[name,name===file?Buffer.concat([body,
        Buffer.from('\n// Synthetic unreviewed admin source transition.\n')]):body]);
      assert.deepEqual(run(make(changed,'synthetic unknown admin source')).reasonCodes,
        ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+file]);
    }
    const target='scripts/test-ravscore-public-data-service-binding.mjs';
    for(const [extra,reason]of [["\nimport 'node:net';\n",'UNDECLARED_NODE_IMPORT:'],
      ["\nreadFileSync('unreviewed-admin-private.json');\n",'UNKNOWN_READ_OR_SUBPROCESS_SURFACE:']]){
      const changed=additions.map(([file,body])=>[file,file===target?Buffer.concat([body,Buffer.from(extra)]):body]);
      assert.deepEqual(run(make(changed,'synthetic unknown admin test capability')).reasonCodes,[reason+target]);
    }
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
    fs.rmSync(root,{recursive:true,force:false});
  }
});
test('normal closed domain planner handles real composition, one same-tree merge and bounded negative mutations',async()=>{
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain-plan-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
    const objectDirectory=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objectDirectory.replaceAll('\\','/')+'\n');
    // Historical FULL169 oracles use their genuine reviewed CODE, never a later HEAD.
    // The current userdata composition has its own separate actual-HEAD plan.
    const reference='0b114baecf84a197715bfe6eb14598c9e7e8cc25';
    git(root,['merge-base','--is-ancestor',BASE,reference]);
    const referenceTree=text(root,['rev-parse',reference+'^{tree}']);
    assert.equal(referenceTree,'f5a8d7bf18db60871730565cc18f32fafb270666','HISTORICAL_REVIEWED_COMPOSITION_TREE');
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


test('reviewed private-study operator closes frozen793 control plans and keeps unknown capabilities FULL',async()=>{
  const studyTemporary=fs.realpathSync(os.tmpdir());
  const studyRoot=fs.mkdtempSync(path.join(studyTemporary,'rr-study-domain-plan-'));
  const studyOwned=fs.lstatSync(studyRoot,{bigint:true});
  try{
    git(studyRoot,['init','-q']);git(studyRoot,['config','core.autocrlf','false']);
    const studyObjectDirectory=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(studyRoot,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(studyRoot,'.git/objects/info/alternates'),studyObjectDirectory.replaceAll('\\','/')+'\n');
    // Genuine reviewed793 CODE/control fixture, not a claim about later current HEAD.
    const studyHead='62d4dee3ab3a5ded26811a4aaf6050a1f1b65f2e';
    const studyControls=['scripts/source-impact-domain-plan.mjs','scripts/lib/source-impact-domain-owners-594.json',
      'scripts/test-source-impact-domain-plan.mjs'];
    const studyControlBodies=studyControls.map(studyFile=>[studyFile,git(SOURCE,['cat-file','blob',studyHead+':'+studyFile])]);
    const studyCommit=(studyRows,studyLabel)=>{
      git(studyRoot,['read-tree',studyHead]);
      for(const [studyFile,studyBody]of studyRows){
        const studyBlob=text(studyRoot,['hash-object','-w','--stdin'],studyBody);
        git(studyRoot,['update-index','--add','--cacheinfo','100644',studyBlob,studyFile]);
      }
      return text(studyRoot,['commit-tree',text(studyRoot,['write-tree']),'-p',studyHead,'-m',studyLabel]);
    };
    for(const studyFile of files){fs.mkdirSync(path.dirname(path.join(studyRoot,studyFile)),{recursive:true});
      fs.writeFileSync(path.join(studyRoot,studyFile),git(SOURCE,['cat-file','blob',studyHead+':'+studyFile]));}
    const {planSourceDomainImpactFromGit:studyPlan}=await import(pathToFileURL(path.join(studyRoot,'scripts/source-impact-domain-plan.mjs')).href);
    const studyRun=(studyCandidate,studyBaseline)=>{git(studyRoot,['update-ref','HEAD',studyCandidate]);
      return studyPlan({baselineCommit:studyBaseline,candidateCommit:studyCandidate,expectedHead:studyCandidate});};
    const studyCandidate=studyCommit(studyControlBodies,'synthetic exact current private-study controls');
    for(const [studyBaseline,studyCount]of [['5c0ede4862a1bf66342450c6458ae043ce5f310d',18],
      ['3450a99355da895b4f286e717a839969003be989',21]]){
      const studyActual=studyRun(studyCandidate,studyBaseline);
      assert.equal(studyActual.status,'PLANNED',JSON.stringify(studyActual.reasonCodes));
      assert.equal(studyActual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(studyActual.reasonCodes));
      assert.equal(studyActual.commands.length,studyCount);
      for(const studyDomain of ['controls','d1','adminUI','documentation'])assert.equal(studyActual.domains[studyDomain].status,'SELECTED');
      assert.equal(studyActual.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(studyActual.domains.historical584National.status,'NOT_APPLICABLE');
      for(const studyPair of [['postgresBefore','postgresAfter'],['CBefore','CAfter'],['IBefore','IAfter'],['TBefore','TAfter']])
        assert.equal(studyActual.inputDigests[studyPair[0]],studyActual.inputDigests[studyPair[1]]);
      assert.equal(studyActual.commands.filter(studyCommand=>studyCommand==='node --test scripts/test-account-statistics-assistant-callers.mjs').length,1);
      assert(!studyActual.commands.includes('node --test scripts/test-trip-aggregate-month-rollover.mjs'),
        'The existing admin parent imports and executes every ordinary rollover/operator case once');
      assert.equal(studyActual.baselineQualified,false);assert.equal(studyActual.skipAuthorized,false);
      assert.equal(studyActual.productionAuthority,false);
    }
    const studyPublisher='scripts/publish-private-trip-weather-study.mjs';
    const studyPublisherBody=git(SOURCE,['cat-file','blob',studyHead+':'+studyPublisher]);
    for(const [studyExtra,studyReason]of [
      ["\nimport 'node:net';\n",'UNDECLARED_NODE_IMPORT:'],
      ["\nreadFileSync('unreviewed-study-private.json');\n",'UNKNOWN_READ_OR_SUBPROCESS_SURFACE:'],
      ["\nspawn('unreviewed-study-program',[]);\n",'UNKNOWN_READ_OR_SUBPROCESS_SURFACE:'],
      ["\nnew Function('return process')();\n",'UNKNOWN_SENSITIVE_BINDING_OR_REFLECTIVE_SURFACE:']]){
      const studyMutation=studyCommit([...studyControlBodies,[studyPublisher,Buffer.concat([studyPublisherBody,Buffer.from(studyExtra)])]],
        'synthetic unknown private-study capability');
      assert.deepEqual(studyRun(studyMutation,'5c0ede4862a1bf66342450c6458ae043ce5f310d').reasonCodes,[studyReason+studyPublisher]);
    }
  }finally{
    assert.equal(path.dirname(fs.realpathSync(studyRoot)),studyTemporary);
    const studyCurrent=fs.lstatSync(studyRoot,{bigint:true});
    assert.equal(studyCurrent.dev,studyOwned.dev);assert.equal(studyCurrent.ino,studyOwned.ino);
    assert.equal(studyCurrent.birthtimeNs,studyOwned.birthtimeNs);
    fs.rmSync(studyRoot,{recursive:true,force:false});
  }
});


// Real bank caller closure for the three existing OM owners. These synthetic
// Git trees are planning evidence, never qualification or production authority.
test('OM owners select actual normal bank and runtime callers and keep unknown inputs FULL',async()=>{
  const reference='a672412f95f1a32419cdc555df25f508c9c6566d';
  const currentHead=text(SOURCE,['rev-parse','HEAD']);
  const registryFile='scripts/lib/source-impact-domain-owners-594.json';
  const bankFile='scripts/test-open-meteo-part-bank.mjs';
  const controls=['scripts/source-impact-domain-plan.mjs',registryFile,
    'scripts/test-source-impact-domain-plan.mjs','scripts/test-fixed-assistant-failure-log-20261101.mjs'];
  const currentFiles=[...new Set([...files,...controls,bankFile])];
  const legacyControls=new Set(['scripts/source-impact-domain-inputs.mjs','scripts/test-source-impact-domain-inputs.mjs',
    'scripts/source-impact-domain-plan.mjs','scripts/test-source-impact-domain-plan.mjs','scripts/test-source-targeted-domain-integration.mjs']);
  // Genuine before597-catalog CODE for this historical594 fixture; no oracle is retagged.
  const body=file=>git(SOURCE,['cat-file','blob',(legacyControls.has(file)
    ?'45594e185f087ff02c8e72649d02cb45cf79cf16':currentHead)+':'+file]);
  const historicalOMOwners=new Set(['scripts/lib/open-meteo-part-runtime.mjs',
    'scripts/produce-open-meteo-part-components.mjs','scripts/test-open-meteo-part-runtime.mjs']);
  const ownerBody=file=>historicalOMOwners.has(file)?git(SOURCE,['cat-file','blob',reference+':'+file]):body(file);
  const bank=body(bankFile);
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-om-bank-domain-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
    const objectDirectory=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objectDirectory.replaceAll('\\','/')+'\n');
    const make=(rows,parent,label)=>{
      git(root,['read-tree',parent]);
      for(const [file,bytes]of rows){const blob=text(root,['hash-object','-w','--stdin'],bytes);
        git(root,['update-index','--add','--cacheinfo','100644',blob,file]);}
      return text(root,['commit-tree',text(root,['write-tree']),'-p',parent,'-m',label]);
    };
    for(const file of files){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
      fs.writeFileSync(path.join(root,file),body(file));}
    const {planSourceDomainImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-plan.mjs')).href);
    const run=(baseline,candidate)=>{git(root,['update-ref','HEAD',candidate]);
      return plan({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});};
    const controlRows=controls.map(file=>[file,body(file)]);
    const fixtureBase=make([[bankFile,bank]],reference,'synthetic exact corrected bank fixture');
    const owners=['scripts/lib/open-meteo-part-runtime.mjs','scripts/produce-open-meteo-part-components.mjs',
      'scripts/test-open-meteo-part-runtime.mjs'];
    for(const owner of owners){
      const candidate=make([...controlRows,[owner,Buffer.concat([ownerBody(owner),
        Buffer.from('\n// Synthetic known OM owner selection.\n')])]],fixtureBase,'synthetic exact OM owner');
      const actual=run(fixtureBase,candidate);
      assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      for(const command of ['node scripts/test-open-meteo-part-bank.mjs','node scripts/test-open-meteo-part-runtime.mjs'])
        assert.equal(actual.commands.filter(value=>value===command).length,1,'Both actual normal callers must be selected exactly once');
      for(const pair of [['postgresBefore','postgresAfter'],['CBefore','CAfter'],['IBefore','IAfter'],['TBefore','TAfter']])
        assert.equal(actual.inputDigests[pair[0]],actual.inputDigests[pair[1]]);
      assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
    }
    for(const [extra,reason]of [["\nimport 'node:net';\n",'UNDECLARED_NODE_IMPORT:'],
      ["\nreadFileSync('unreviewed-om-private.json');\n",'UNKNOWN_READ_OR_SUBPROCESS_SURFACE:'],
      ["\nnew Function('return process')();\n",'UNKNOWN_SENSITIVE_BINDING_OR_REFLECTIVE_SURFACE:']]){
      const changedBase=make([[bankFile,Buffer.concat([bank,Buffer.from(extra)])]],reference,'synthetic unreviewed bank capability');
      const candidate=make([...controlRows,[owners[0],Buffer.concat([ownerBody(owners[0]),
        Buffer.from('\n// Synthetic known OM owner selection.\n')])]],changedBase,'synthetic rejected bank closure');
      assert.deepEqual(run(changedBase,candidate).reasonCodes,[reason+bankFile]);
    }
    const legacyOversized=['docs/rdks/MASTER_LOG.md','docs/rdks/90_INDEX/CURRENT_TRUTH.md','docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md']
      .map(file=>[file,Buffer.concat([git(SOURCE,['cat-file','blob',reference+':'+file]),Buffer.alloc(4*1024*1024,32)])]);
    const legacyRefused=run(fixtureBase,make([...controlRows,...legacyOversized],fixtureBase,'synthetic old59448MiB remains bounded'));
    assert.equal(legacyRefused.status,'REFUSED');assert.equal(legacyRefused.selection,'FULL');
    assert.deepEqual(legacyRefused.reasonCodes,['DOMAIN_PLAN_REFUSED']);
    const pg='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
    const changedPg=make([...controlRows,[pg,Buffer.concat([body(pg),Buffer.from('\n// Synthetic changed PG input.\n')])]],
      fixtureBase,'synthetic changed PG domain');
    assert.deepEqual(run(fixtureBase,changedPg).reasonCodes,['POSTGRES_OR_MODEL_INPUT_CHANGED']);
    const unknown='scripts/unreviewed-om-bank-input.mjs';
    const changedUnknown=make([...controlRows,[unknown,Buffer.from('export const unknown=true;\n')]],fixtureBase,'synthetic unknown source');
    assert.deepEqual(run(fixtureBase,changedUnknown).reasonCodes,['UNCLASSIFIED_OWNER:'+unknown]);
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
    fs.rmSync(root,{recursive:true,force:false});
  }
});


// Genuine597 input/closure planning. This runs no PostgreSQL, provider or source suite.
test('normal597 registry keeps genuine144 inputs and closes only known normal control capabilities',async t=>{
  const reference='45594e185f087ff02c8e72649d02cb45cf79cf16';
  const controls=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-597.json',
    'scripts/test-source-impact-domain-inputs.mjs','scripts/source-impact-domain-plan.mjs',
    'scripts/lib/source-impact-domain-owners-597.json','scripts/test-source-impact-domain-plan.mjs',
    'scripts/test-source-targeted-domain-integration.mjs'];
  const root597=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'rr-domain597-plan-'));
  const owned597=fs.lstatSync(root597,{bigint:true}),temporary597=path.dirname(root597);
  try{
    git(root597,['init','-q']);git(root597,['config','core.autocrlf','false']);
    const objects=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root597,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root597,'.git/objects/info/alternates'),objects.replaceAll('\\','/')+'\n');
    // Preserve the whole genuine pre598 control CODE for this historical597 registry oracle.
    const priorControl=file=>git(SOURCE,['cat-file','blob','fad617a60b9830869b03e26ffa629b6e3d0fcb08:'+file]);
    const rows=controls.map(file=>[file,priorControl(file)]);
    const make597=(parent,changes,label)=>{
      git(root597,['read-tree',parent]);
      for(const [file,bytes]of changes)git(root597,['update-index','--add','--cacheinfo','100644',
        text(root597,['hash-object','-w','--stdin'],bytes),file]);
      return text(root597,['commit-tree',text(root597,['write-tree']),'-p',parent,'-m',label]);
    };
    const baseline597=make597(reference,rows,'synthetic597 catalog fixture with genuine protected inputs');
    for(const file of [...controls,'scripts/lib/source-impact-domain-inputs-594.json','scripts/lib/source-impact-domain-owners-594.json',
      'scripts/lib/source-impact-control-imports.mjs']){
      const target=path.join(root597,file);fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,controls.includes(file)?priorControl(file):
        git(SOURCE,['cat-file','blob',reference+':'+file]));
    }
    const {planSourceDomainImpactFromGit:plan597}=await import(pathToFileURL(path.join(root597,'scripts/source-impact-domain-plan.mjs')).href);
    const run597=(candidate,baseline=baseline597)=>{git(root597,['update-ref','HEAD',candidate]);
      return plan597({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});};
    const owner597='scripts/source-targeted-receipt.mjs',before597=git(root597,['cat-file','blob',baseline597+':'+owner597]);
    const candidate597=make597(baseline597,[[owner597,Buffer.concat([before597,Buffer.from('\n// Synthetic known597 control edit.\n')])]],'synthetic597 known control');
    await t.test('known control uses actual normal commands with no PG or national execution claim',()=>{
      const plan=run597(candidate597);
      assert.equal(plan.status,'PLANNED',JSON.stringify(plan.reasonCodes));
      assert.equal(plan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(plan.reasonCodes));
      for(const family of ['postgres','C','I','T'])assert.equal(plan.inputDigests[family+'Before'],plan.inputDigests[family+'After']);
      assert.equal(plan.domains.postgres.status,'NOT_APPLICABLE');assert.equal(plan.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(plan.baselineQualified,false);assert.equal(plan.skipAuthorized,false);assert.equal(plan.productionAuthority,false);
      for(const command of ['node --test scripts/test-source-impact-full-baseline.mjs','node --test scripts/test-native-postgres-evidence.mjs',
        'node --test scripts/test-source-impact-domain-inputs.mjs','node --test scripts/test-source-impact-domain-plan.mjs'])
        assert.equal(plan.commands.filter(value=>value===command).length,1);
      assert(!plan.commands.includes('node scripts/reclaim-runner-android-sdk.mjs'),'Unregistered native SDK CLI is not silently selected or proven');
    });
    await t.test('current597 OM owners retain the complete actual runtime and bank caller closure',()=>{
      for(const owner of ['scripts/lib/open-meteo-part-runtime.mjs','scripts/produce-open-meteo-part-components.mjs',
        'scripts/test-open-meteo-part-runtime.mjs']){
        const original=git(root597,['cat-file','blob',baseline597+':'+owner]);
        const actual=run597(make597(baseline597,[[owner,Buffer.concat([original,Buffer.from('\n// Synthetic actual597 OM owner.\n')])]],
          'synthetic current597 OM owner closure'));
        assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
        assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
        for(const command of ['node scripts/test-open-meteo-part-bank.mjs','node scripts/test-open-meteo-part-runtime.mjs'])
          assert.equal(actual.commands.filter(value=>value===command).length,1);
        assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      }
    });
    await t.test('597 resource budget includes every committed resource and refuses a bounded overflow',()=>{
      const document='docs/rdks/MASTER_LOG.md',bytes=git(root597,['cat-file','blob',baseline597+':'+document]);
      const within=make597(baseline597,[[owner597,Buffer.concat([before597,Buffer.from('\n// Synthetic597 budget owner.\n')])],
        [document,Buffer.concat([bytes,Buffer.alloc(1024*1024,32)])]],'synthetic597 resources above historical48MiB');
      const accepted=run597(within);
      assert.equal(accepted.status,'PLANNED',JSON.stringify(accepted.reasonCodes));
      assert.equal(accepted.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(accepted.reasonCodes));
      const documents=['docs/rdks/MASTER_LOG.md','docs/rdks/90_INDEX/CURRENT_TRUTH.md','docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md'];
      const oversized=documents.map(file=>[file,Buffer.concat([git(root597,['cat-file','blob',baseline597+':'+file]),
        Buffer.alloc(4*1024*1024,32)])]);
      const rejected=run597(make597(baseline597,oversized,'synthetic597 complete resource inventory exceeds56MiB'));
      assert.equal(rejected.status,'REFUSED');assert.equal(rejected.selection,'FULL');
      assert.deepEqual(rejected.reasonCodes,['DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED']);
    });
    await t.test('new node/import/read/subprocess/reflection surfaces remain FULL',()=>{
      for(const extra of ["\nimport 'node:net';\n","\nimport 'unregistered-package';\n",'\nimport(unregisteredSpecifier);\n',
        "\nfs.readFileSync('unregistered-private.json');\n","\nspawn('unregistered-program',[]);\n","\nnew Function('return process')();\n"]){
        const changed=make597(baseline597,[[owner597,Buffer.concat([before597,Buffer.from(extra)])]],'synthetic597 unknown capability');
        assert.equal(run597(changed).selection,'FULL',extra);
      }
    });
    await t.test('unknown owner, SDK owner and protected PostgreSQL/model inputs remain FULL',()=>{
      for(const file of ['scripts/unregistered597-control.mjs','scripts/reclaim-runner-android-sdk.mjs',
        'scripts/test-protected-ravscore-continuation-checkpoint.mjs','config.js']){
        let bytes;try{bytes=git(root597,['cat-file','blob',baseline597+':'+file]);}catch{bytes=Buffer.alloc(0);}
        const changed=make597(baseline597,[[file,Buffer.concat([bytes,Buffer.from('\n// synthetic597 input drift\n')])]],'synthetic597 protected or unknown edit');
        assert.equal(run597(changed).selection,'FULL',file);
      }
    });
    await t.test('changed SQL, mixed generation and corrupt registry bytes cannot qualify',()=>{
      const migration='supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
      const sql=git(root597,['cat-file','blob',baseline597+':'+migration]);
      assert.equal(run597(make597(baseline597,[[migration,Buffer.concat([sql,Buffer.from('\n-- synthetic drift\n')])]],'synthetic597 SQL drift')).selection,'FULL');
      const pkg=JSON.parse(git(root597,['cat-file','blob',baseline597+':package.json']));pkg.version='4.0.594';
      assert.equal(run597(make597(baseline597,[['package.json',Buffer.from(JSON.stringify(pkg))]],'synthetic mixed generation')).selection,'FULL');
      const registryFile=path.join(root597,'scripts/lib/source-impact-domain-owners-597.json'),bytes=fs.readFileSync(registryFile);
      try{fs.writeFileSync(registryFile,Buffer.concat([bytes,Buffer.from('\n')]));assert.equal(run597(candidate597).selection,'FULL');}
      finally{fs.writeFileSync(registryFile,bytes);}
    });
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root597)),temporary597);const current=fs.lstatSync(root597,{bigint:true});
    assert.equal(current.dev,owned597.dev);assert.equal(current.ino,owned597.ino);assert.equal(current.birthtimeNs,owned597.birthtimeNs);
    fs.rmSync(root597,{recursive:true,force:false});
  }
});

// Separate598normal plan: genuine current protected inputs, synthetic Git children only.
test('normal598 registry keeps genuine148 inputs and closes only known normal control capabilities',async t=>{
  const reference='bd9cf518fe798ddea45d2b835f324f6e2bea06fc';
  // Replay whole historical exact pairs; current capability cases below still read current sources.
  const historicalAfter='fa64eca25c5f46189b00962a363d066a8f85a516';
  const controls=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-598.json',
    'scripts/test-source-impact-domain-inputs.mjs','scripts/source-impact-domain-plan.mjs',
    'scripts/lib/source-impact-domain-owners-598.json','scripts/test-source-impact-domain-plan.mjs',
    'scripts/test-source-targeted-domain-integration.mjs'];
  const root598=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'rr-domain597-plan-'));
  const owned598=fs.lstatSync(root598,{bigint:true}),temporary598=path.dirname(root598);
  try{
    git(root598,['init','-q']);git(root598,['config','core.autocrlf','false']);
    const objects=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
    fs.mkdirSync(path.join(root598,'.git/objects/info'),{recursive:true});
    fs.writeFileSync(path.join(root598,'.git/objects/info/alternates'),objects.replaceAll('\\','/')+'\n');
    const rows=controls.map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]);
    const make598=(parent,changes,label)=>{
      git(root598,['read-tree',parent]);
      for(const [file,bytes]of changes)git(root598,['update-index','--add','--cacheinfo','100644',
        text(root598,['hash-object','-w','--stdin'],bytes),file]);
      return text(root598,['commit-tree',text(root598,['write-tree']),'-p',parent,'-m',label]);
    };
    const baseline598=make598(reference,rows,'synthetic597 catalog fixture with genuine protected inputs');
    for(const file of [...controls,'scripts/lib/source-impact-domain-inputs-594.json','scripts/lib/source-impact-domain-owners-594.json','scripts/lib/source-impact-domain-inputs-597.json',
      'scripts/lib/source-impact-domain-owners-597.json','scripts/lib/source-impact-control-imports.mjs']){
      const target=path.join(root598,file);fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,controls.includes(file)?fs.readFileSync(path.join(SOURCE,file)):
        git(SOURCE,['cat-file','blob',reference+':'+file]));
    }
    const {planSourceDomainImpactFromGit:plan598}=await import(pathToFileURL(path.join(root598,'scripts/source-impact-domain-plan.mjs')).href);
    const run598=(candidate,baseline=baseline598)=>{git(root598,['update-ref','HEAD',candidate]);
      return plan598({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});};
    const owner598='scripts/source-targeted-receipt.mjs',before598=git(root598,['cat-file','blob',baseline598+':'+owner598]);
    const candidate598=make598(baseline598,[[owner598,Buffer.concat([before598,Buffer.from('\n// Synthetic known597 control edit.\n')])]],'synthetic597 known control');
    await t.test('known control uses actual normal commands with no PG or national execution claim',()=>{
      const plan=run598(candidate598);
      assert.equal(plan.status,'PLANNED',JSON.stringify(plan.reasonCodes));
      assert.equal(plan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(plan.reasonCodes));
      for(const family of ['postgres','C','I','T'])assert.equal(plan.inputDigests[family+'Before'],plan.inputDigests[family+'After']);
      assert.equal(plan.domains.postgres.status,'NOT_APPLICABLE');assert.equal(plan.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(plan.baselineQualified,false);assert.equal(plan.skipAuthorized,false);assert.equal(plan.productionAuthority,false);
      for(const command of ['node --test scripts/test-source-impact-full-baseline.mjs','node --test scripts/test-native-postgres-evidence.mjs',
        'node --test scripts/test-source-impact-domain-inputs.mjs','node --test scripts/test-source-impact-domain-plan.mjs'])
        assert.equal(plan.commands.filter(value=>value===command).length,1);
      assert(!plan.commands.includes('node scripts/reclaim-runner-android-sdk.mjs'),'Unregistered native SDK CLI is not silently selected or proven');
    });
    await t.test('cumulative restore scope retains the reviewed domain planner control test only',()=>{
      const restoreScopeFixture='scripts/test-supabase-cli-local-restore.mjs', restoreScopeWorkflow='.github/workflows/verify-supabase-cli-local-restore.yml';
      const restoreScopeControlTest='scripts/test-source-impact-domain-plan.mjs';
      const restoreScopeArchiveSource='4b2831a6c2b9c984195c62ce616b6140fdd46ab0';
      const restoreScopeOriginal=git(root598,['cat-file','blob',restoreScopeArchiveSource+':'+restoreScopeFixture]);
      const restoreScopeBaseline=make598(baseline598,[[restoreScopeFixture,restoreScopeOriginal],[restoreScopeWorkflow,git(root598,['cat-file','blob',restoreScopeArchiveSource+':'+restoreScopeWorkflow])]],
        'synthetic current restore baseline with exact hosted workflow');
      const restoreScopeChangedControl=Buffer.concat([git(root598,['cat-file','blob',restoreScopeBaseline+':'+restoreScopeControlTest]),
        Buffer.from('\n// Synthetic only domain planner test follow-up.\n')]);
      const restoreScopeController=make598(restoreScopeBaseline,[[restoreScopeControlTest,restoreScopeChangedControl]],'synthetic separately reviewed controller fixture edit');
      const restoreScopeDispatchMarker='if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){';
      const restoreScopeBody=restoreScopeOriginal.toString('utf8');
      assert.equal(restoreScopeBody.split(restoreScopeDispatchMarker).length,2);
      const restoreScopeChangedBody=Buffer.from(restoreScopeBody.replace(restoreScopeDispatchMarker,'// Synthetic restore-only body change.\n'+restoreScopeDispatchMarker));
      const restoreScopeCombined=make598(restoreScopeController,[[restoreScopeFixture,restoreScopeChangedBody]],'synthetic restore change after control fixture edit');
      const restoreScopeAccepted=run598(restoreScopeCombined,restoreScopeBaseline);
      assert.equal(restoreScopeAccepted.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(restoreScopeAccepted.reasonCodes));
      assert.equal(restoreScopeAccepted.changedRows,2);
      assert.equal(restoreScopeAccepted.commands.filter(value=>value==='node --test '+restoreScopeControlTest).length,1);
      assert.equal(restoreScopeAccepted.commands.filter(value=>value==='node '+restoreScopeFixture+' --self-test').length,1);
      assert.equal(restoreScopeAccepted.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(restoreScopeAccepted.domains.historical584National.status,'NOT_APPLICABLE');
      const restoreScopeForeignOwner='scripts/archive-supabase-database-backup.mjs';
      const restoreScopeForeignCandidate=make598(restoreScopeCombined,[[restoreScopeForeignOwner,Buffer.concat([git(root598,['cat-file','blob',restoreScopeArchiveSource+':'+restoreScopeForeignOwner]),
        Buffer.from('\n// Synthetic separately owned archive change.\n')])]],'synthetic foreign owner mixed with restore');
      assert.deepEqual(run598(restoreScopeForeignCandidate,restoreScopeBaseline).reasonCodes,['LOCAL_RESTORE_FIXTURE_COMBINED_SCOPE']);
    });
    await t.test('reviewed B272 audit read branch keeps its real targets and refuses an unknown read capability',()=>{
      const files=['scripts/audit-saved-weather-inputs.mjs','.github/workflows/audit-saved-weather-inputs.yml',
        'scripts/test-saved-weather-audit-workflow.mjs'];
      const changes=files.map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]);
      const actual=run598(make598(baseline598,changes,'synthetic exact B272 audit read footprint'));
      assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      for(const command of ['node --test scripts/test-audit-saved-weather-inputs.mjs','node --test scripts/test-saved-weather-audit-workflow.mjs'])
        assert.equal(actual.commands.filter(value=>value===command).length,1);
      for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(actual.baselineQualified,false);assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      const drift=changes.map(([file,body])=>[file,file==='scripts/audit-saved-weather-inputs.mjs'
        ?Buffer.concat([body,Buffer.from("\nawait fs.readFile('/unreviewed-b272-resource');\n")]):body]);
      assert.deepEqual(run598(make598(baseline598,drift,'synthetic unknown B272 read capability')).reasonCodes,
        ['UNKNOWN_READ_OR_SUBPROCESS_SURFACE:scripts/audit-saved-weather-inputs.mjs']);
    });
    await t.test('exact598 fixed assistant order uses normal roundtrip and refuses every unreviewed owner byte',()=>{
      const edgeOwners=['supabase/functions/_shared/rav-assistant-contract.ts',
        'supabase/functions/ravradar-assistant/index.ts','scripts/test-rav-assistant-main-edge-roundtrip.mjs'];
      const edgeChanges=edgeOwners.map(edgeFile=>[edgeFile,git(SOURCE,['cat-file','blob',historicalAfter+':'+edgeFile])]);
      const edgeCandidate=make598(baseline598,edgeChanges,'synthetic reviewed598 fixed assistant reply order');
      const edgePlan=run598(edgeCandidate);
      assert.equal(edgePlan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(edgePlan.reasonCodes));
      assert.equal(edgePlan.commands.filter(edgeCommand=>edgeCommand==='node scripts/test-rav-assistant-main-edge-roundtrip.mjs').length,1);
      for(const edgeFamily of ['postgres','C','I','T'])assert.equal(edgePlan.inputDigests[edgeFamily+'Before'],edgePlan.inputDigests[edgeFamily+'After']);
      assert.equal(edgePlan.domains.postgres.status,'NOT_APPLICABLE');assert.equal(edgePlan.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(edgePlan.skipAuthorized,false);assert.equal(edgePlan.productionAuthority,false);
      for(const edgeChangedOwner of edgeOwners){
        const edgeVariant=edgeChanges.map(([edgePath,edgeBody])=>[edgePath,edgePath===edgeChangedOwner?Buffer.concat([edgeBody,Buffer.from('\n')]):edgeBody]);
        assert.deepEqual(run598(make598(baseline598,edgeVariant,'synthetic unreviewed assistant owner bytes')).reasonCodes,
          ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+edgeChangedOwner]);
      }
    });
    await t.test('exact598 backup-byte and host-formatting pairs use normal targets and refuse owner drift',()=>{
      const followOwners=['scripts/run-hosted-supabase-backup.mjs','scripts/test-supabase-database-backup-workflow.mjs',
        'js/services/forecast-share-contract.js','scripts/forecast-share/handler.mjs','scripts/test-map-forecast-panel.mjs'];
      // Replay the reviewed source bytes. Subsequent backup changes do not alter this historical transition.
      const followReviewedHead='96f09d322bac05f2d9ce74e6679213949cf308a4';
      const followChanges=followOwners.map(followFile=>[followFile,git(SOURCE,['cat-file','blob',followReviewedHead+':'+followFile])]);
      const followPlan=run598(make598(baseline598,followChanges,'synthetic reviewed598 bounded followup owners'));
      assert.equal(followPlan.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(followPlan.reasonCodes));
      for(const followCommand of ['node --test scripts/test-supabase-database-backup-workflow.mjs',
        'node --test scripts/test-map-forecast-panel.mjs'])assert.equal(followPlan.commands.filter(followValue=>followValue===followCommand).length,1);
      for(const followFamily of ['postgres','C','I','T'])assert.equal(followPlan.inputDigests[followFamily+'Before'],followPlan.inputDigests[followFamily+'After']);
      assert.equal(followPlan.domains.postgres.status,'NOT_APPLICABLE');assert.equal(followPlan.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(followPlan.skipAuthorized,false);assert.equal(followPlan.productionAuthority,false);
      for(const followChanged of followOwners){
        const followVariant=followChanges.map(([followPath,followBody])=>[followPath,followPath===followChanged?Buffer.concat([followBody,Buffer.from('\n')]):followBody]);
        assert.deepEqual(run598(make598(baseline598,followVariant,'synthetic unreviewed followup owner bytes')).reasonCodes,
          ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+followChanged]);
      }
    });
    await t.test('exact598 DMI scheduler and normal Python caller pairs preserve PG/CIT and refuse byte drift',()=>{
      const owners=['scripts/update-dmi-bulk.py','scripts/test-dmi-dkss-primary-mode.py','scripts/test-current-operational-python-contracts.mjs'];
      const changes=owners.map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]);
      const actual=run598(make598(baseline598,changes,'synthetic exact reviewed DMI scheduler pairs'));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.commands.filter(value=>value==='node --test scripts/test-current-operational-python-contracts.mjs').length,1);
      for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      for(const changed of owners){
        const variant=changes.map(([file,body])=>[file,file===changed?Buffer.concat([body,Buffer.from('\n')]):body]);
        assert.deepEqual(run598(make598(baseline598,variant,'synthetic unreviewed DMI owner bytes')).reasonCodes,
          ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+changed]);
      }
    });
    await t.test('exact598 ordinary SDK workflow oracle port selects its real target and refuses byte drift',()=>{
      const owner='scripts/test-runner-android-sdk-reclaim.mjs',body=git(SOURCE,['cat-file','blob',historicalAfter+':'+owner]);
      const actual=run598(make598(baseline598,[[owner,body]],'synthetic exact reviewed ordinary SDK oracle port'));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.commands.filter(value=>value==='node --test scripts/test-runner-android-sdk-reclaim.mjs').length,1);
      assert(!actual.commands.includes('node scripts/reclaim-runner-android-sdk.mjs'));
      for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      assert.deepEqual(run598(make598(baseline598,[[owner,Buffer.concat([body,Buffer.from('\n')])]],'synthetic unreviewed SDK oracle port')).reasonCodes,
        ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+owner]);
    });
    await t.test('exact598 reviewed statistics replay keeps normal account privacy and refuses new capabilities',()=>{
      const files=['.github/workflows/private-trip-weather-study.yml','cloudflare/trip-gateway/trip-aggregate.js',
        'js/ui/admin-private-trip-study.js','scripts/lib/trip-weather-aggregate-client.mjs',
        'scripts/publish-private-trip-weather-study.mjs','scripts/test-account-statistics-assistant-callers.mjs',
        'scripts/test-trip-aggregate-month-rollover.mjs'];
      const changes=files.map(file=>[file,git(SOURCE,['cat-file','blob',historicalAfter+':'+file])]);
      const actual=run598(make598(baseline598,changes,'synthetic reviewed statistics replay sources'));
      assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
      assert.equal(actual.commands.filter(c=>c==='node --test scripts/test-account-statistics-assistant-callers.mjs').length,1);
      for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
      for(const domain of ['adminUI','d1','controls'])assert.equal(actual.domains[domain].status,'SELECTED');
      assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(actual.baselineQualified,false);assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      const client='scripts/lib/trip-weather-aggregate-client.mjs';
      const mutation=changes.map(([file,body])=>[file,file===client?Buffer.concat([body,Buffer.from("\nexport const privateStudyUnreviewedCapability=Reflect.get(globalThis,'UNREVIEWED_PRIVATE_STUDY_CAPABILITY');\n")]):body]);
      const refused=run598(make598(baseline598,mutation,'synthetic unreviewed statistics capability'));
      assert.equal(refused.selection,'FULL');
      assert.deepEqual(refused.reasonCodes,['UNKNOWN_SENSITIVE_BINDING_OR_REFLECTIVE_SURFACE:'+client]);
    });
    await t.test('exact598 admin cache publication closes both actual production contracts and refuses owner drift',()=>{
      const owners=['admin.html','service-worker.js','scripts/test-public-cold-start-4.0.303.mjs'];
      const changes=owners.map(file=>[file,git(SOURCE,['cat-file','blob',historicalAfter+':'+file])]);
      for(const [owner,body]of changes){
        const actual=run598(make598(baseline598,[[owner,body]],'synthetic exact admin cache publication owner'));
        assert.equal(actual.selection,owner==='scripts/test-public-cold-start-4.0.303.mjs'?'CONTROL_QUALIFICATION_REQUIRED':'TARGETED_DOMAINS',JSON.stringify(actual.reasonCodes));
        for(const command of ['node scripts/test-public-cold-start-4.0.303.mjs','node scripts/test-admin-config-production-contract-4.0.94.mjs'])
          assert.equal(actual.commands.filter(value=>value===command).length,1);
        for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
        assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
        assert.equal(actual.baselineQualified,false);assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      }
      // The producer checks its actual merge-base before discovering the cumulative qualified FULL parent.
      const ordinaryParent='d10d94b70d96e9a75775ac4b4647011f3883258d';
      const qualifiedFullParent='89ca7f3af17dbc86232a20adff3129edddfe0b3d';
      const ordinaryMergeBase=make598(ordinaryParent,rows,'synthetic current ordinary merge-base with current controls');
      const ordinaryCandidate=make598(ordinaryMergeBase,changes,'synthetic reviewed current admin cache publication');
      for(const ordinaryBaseline of [ordinaryMergeBase,qualifiedFullParent]){
        const actual=run598(ordinaryCandidate,ordinaryBaseline);
        assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
        assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
        for(const command of ['node scripts/test-public-cold-start-4.0.303.mjs','node scripts/test-admin-config-production-contract-4.0.94.mjs'])
          assert.equal(actual.commands.filter(value=>value===command).length,1);
        for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
        assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
        assert.equal(actual.baselineQualified,false);assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      }
      for(const owner of owners){
        const variant=changes.map(([file,body])=>[file,file===owner?Buffer.concat([body,Buffer.from('\n')]):body]);
        assert.deepEqual(run598(make598(baseline598,variant,'synthetic unreviewed admin cache publication bytes')).reasonCodes,
          ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+owner]);
      }
    });
    await t.test('exact598 admin cache address admits only the reviewed whole HTML pair',()=>{
      const cacheOwner='admin.html',cacheBefore=git(root598,['cat-file','blob',baseline598+':admin.html']);
      const cacheAddress='js/ui/admin-dashboard.js?v=4.0.598&ui=admin-model-startup-20261101&map=plain-map-v3-20261104';
      assert.equal(cacheBefore.toString().split(cacheAddress).length,2);
      const cacheAfter=Buffer.from(cacheBefore.toString().replace(cacheAddress,cacheAddress+'&observations=local-scope-20261106'));
      assert.equal(cacheAfter.length,cacheBefore.length+34);
      assert.equal(cacheAfter.toString().replace('&observations=local-scope-20261106',''),cacheBefore.toString());
      const cacheCandidate=make598(baseline598,[[cacheOwner,cacheAfter]],'synthetic reviewed598 admin cache address');
      const cachePlan=run598(cacheCandidate);
      assert.equal(cachePlan.selection,'TARGETED_DOMAINS',JSON.stringify(cachePlan.reasonCodes));
      for(const command of ['node scripts/test-public-cold-start-4.0.303.mjs','node scripts/test-admin-config-production-contract-4.0.94.mjs'])
        assert.equal(cachePlan.commands.filter(value=>value===command).length,1);
      assert.equal(cachePlan.baselineQualified,false);
      for(const cacheFamily of ['postgres','C','I','T'])assert.equal(cachePlan.inputDigests[cacheFamily+'Before'],cachePlan.inputDigests[cacheFamily+'After']);
      assert.equal(cachePlan.domains.adminUI.status,'SELECTED');assert.equal(cachePlan.domains.postgres.status,'NOT_APPLICABLE');
      assert.equal(cachePlan.domains.historical584National.status,'NOT_APPLICABLE');
      assert.equal(cachePlan.skipAuthorized,false);assert.equal(cachePlan.productionAuthority,false);
      for(const cacheVariant of [Buffer.concat([cacheAfter,Buffer.from('\n')]),
        Buffer.from(cacheAfter.toString().replace('local-scope-20261106','local-scope-20261107')),
        Buffer.from(cacheAfter.toString().replace('map=plain-map-v3-20261104','map=changed'))]){
        assert.deepEqual(run598(make598(baseline598,[[cacheOwner,cacheVariant]],'synthetic unreviewed admin HTML bytes')).reasonCodes,
          ['UNKNOWN_EXACT_SOURCE_TRANSITION:'+cacheOwner]);
      }
    });
    await t.test('current597 OM owners retain the complete actual runtime and bank caller closure',()=>{
      for(const owner of ['scripts/lib/open-meteo-part-runtime.mjs','scripts/produce-open-meteo-part-components.mjs',
        'scripts/test-open-meteo-part-runtime.mjs']){
        const original=git(root598,['cat-file','blob',baseline598+':'+owner]);
        const actual=run598(make598(baseline598,[[owner,Buffer.concat([original,Buffer.from('\n// Synthetic actual597 OM owner.\n')])]],
          'synthetic current597 OM owner closure'));
        assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
        assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
        for(const command of ['node scripts/test-open-meteo-part-bank.mjs','node scripts/test-open-meteo-part-runtime.mjs'])
          assert.equal(actual.commands.filter(value=>value===command).length,1);
        assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);
      }
    });
    await t.test('597 resource budget includes every committed resource and refuses a bounded overflow',()=>{
      const document='docs/rdks/MASTER_LOG.md',bytes=git(root598,['cat-file','blob',baseline598+':'+document]);
      const within=make598(baseline598,[[owner598,Buffer.concat([before598,Buffer.from('\n// Synthetic597 budget owner.\n')])],
        [document,Buffer.concat([bytes,Buffer.alloc(1024*1024,32)])]],'synthetic597 resources above historical48MiB');
      const accepted=run598(within);
      assert.equal(accepted.status,'PLANNED',JSON.stringify(accepted.reasonCodes));
      assert.equal(accepted.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(accepted.reasonCodes));
      const documents=['docs/rdks/MASTER_LOG.md','docs/rdks/90_INDEX/CURRENT_TRUTH.md','docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md'];
      const oversized=documents.map(file=>[file,Buffer.concat([git(root598,['cat-file','blob',baseline598+':'+file]),
        Buffer.alloc(4*1024*1024,32)])]);
      const rejected=run598(make598(baseline598,oversized,'synthetic597 complete resource inventory exceeds56MiB'));
      assert.equal(rejected.status,'REFUSED');assert.equal(rejected.selection,'FULL');
      assert.deepEqual(rejected.reasonCodes,['DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED']);
    });
    await t.test('new node/import/read/subprocess/reflection surfaces remain FULL',()=>{
      for(const extra of ["\nimport 'node:net';\n","\nimport 'unregistered-package';\n",'\nimport(unregisteredSpecifier);\n',
        "\nfs.readFileSync('unregistered-private.json');\n","\nspawn('unregistered-program',[]);\n","\nnew Function('return process')();\n"]){
        const changed=make598(baseline598,[[owner598,Buffer.concat([before598,Buffer.from(extra)])]],'synthetic597 unknown capability');
        assert.equal(run598(changed).selection,'FULL',extra);
      }
    });
    await t.test('unknown owner, SDK owner and protected PostgreSQL/model inputs remain FULL',()=>{
      for(const file of ['scripts/unregistered597-control.mjs','scripts/reclaim-runner-android-sdk.mjs',
        'scripts/test-protected-ravscore-continuation-checkpoint.mjs','config.js']){
        let bytes;try{bytes=git(root598,['cat-file','blob',baseline598+':'+file]);}catch{bytes=Buffer.alloc(0);}
        const changed=make598(baseline598,[[file,Buffer.concat([bytes,Buffer.from('\n// synthetic597 input drift\n')])]],'synthetic597 protected or unknown edit');
        assert.equal(run598(changed).selection,'FULL',file);
      }
    });
    await t.test('changed SQL, mixed generation and corrupt registry bytes cannot qualify',()=>{
      const migration='supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
      const sql=git(root598,['cat-file','blob',baseline598+':'+migration]);
      assert.equal(run598(make598(baseline598,[[migration,Buffer.concat([sql,Buffer.from('\n-- synthetic drift\n')])]],'synthetic597 SQL drift')).selection,'FULL');
      const pkg=JSON.parse(git(root598,['cat-file','blob',baseline598+':package.json']));pkg.version='4.0.594';
      assert.equal(run598(make598(baseline598,[['package.json',Buffer.from(JSON.stringify(pkg))]],'synthetic mixed generation')).selection,'FULL');
      const registryFile=path.join(root598,'scripts/lib/source-impact-domain-owners-598.json'),bytes=fs.readFileSync(registryFile);
      try{fs.writeFileSync(registryFile,Buffer.concat([bytes,Buffer.from('\n')]));assert.equal(run598(candidate598).selection,'FULL');}
      finally{fs.writeFileSync(registryFile,bytes);}
    });
    await t.test('only reviewed598 non-model R2 owners select four real targets and unknown R2/workflow bytes stay FULL',()=>{
      const targets=["node scripts/test-r2-private-runtime-storage.mjs", "node --test scripts/test-admin-document-history-maintenance.mjs", "node --test scripts/test-archive-supabase-database-backup.mjs", "node --test scripts/test-admin-document-history-workflow.mjs"];
      const owners=["scripts/admin-document-history-maintenance.mjs", "scripts/archive-supabase-database-backup.mjs", "scripts/lib/r2-private-read-denial-storage.mjs", "scripts/test-admin-document-history-maintenance.mjs", "scripts/test-admin-document-history-workflow.mjs", "scripts/test-archive-supabase-database-backup.mjs", "scripts/test-r2-private-runtime-storage.mjs"];
      for(const file of owners){
        const before=git(root598,['cat-file','blob',baseline598+':'+file]);
        const candidate=make598(baseline598,[[file,Buffer.concat([before,Buffer.from('\n// Synthetic reviewed R2 owner delta.\n')])]],'synthetic non-model R2 owner');
        const actual=run598(candidate);assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
        assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
        for(const target of targets)assert.equal(actual.commands.filter(value=>value===target).length,1);
        for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
        assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.skipAuthorized,false);
      }
      const workflow='.github/workflows/maintain-admin-document-history.yml';
      const before=git(SOURCE,['cat-file','blob','b6a1a7d42f933b3b29d2ad56a17d7a0eb2de40ef:'+workflow]);
      const after=git(root598,['cat-file','blob',baseline598+':'+workflow]);
      const old=make598(baseline598,[[workflow,before]],'synthetic exact pre-R2 workflow');
      const reviewed=make598(old,[[workflow,after]],'synthetic reviewed whole R2 workflow pair');
      const exact=run598(reviewed,old);assert.equal(exact.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(exact.reasonCodes));
      for(const target of targets)assert.equal(exact.commands.filter(value=>value===target).length,1);
      const unknown=make598(baseline598,[[workflow,Buffer.concat([after,Buffer.from('\n# Synthetic unknown workflow bytes.\n')])]],'synthetic unknown R2 workflow');
      assert.deepEqual(run598(unknown).reasonCodes,['UNKNOWN_EXACT_SOURCE_TRANSITION:'+workflow]);
      const helper='scripts/lib/r2-private-read-denial-storage.mjs',body=git(root598,['cat-file','blob',baseline598+':'+helper]);
      const injected=make598(baseline598,[[helper,Buffer.concat([body,Buffer.from("\nimport 'node:net';\n")])]],'synthetic unknown R2 capability');
      assert.deepEqual(run598(injected).reasonCodes,['UNDECLARED_NODE_IMPORT:'+helper]);
      const unknownOwner='scripts/lib/unreviewed-r2-owner.mjs';
      assert.deepEqual(run598(make598(baseline598,[[unknownOwner,Buffer.from('export const x=1;\n')]],'synthetic unreviewed R2 owner')).reasonCodes,
        ['UNCLASSIFIED_OWNER:'+unknownOwner]);
      for(const file of ['scripts/lib/r2-private-runtime-storage.mjs','scripts/protected-private-production-runtime.mjs']){
        const bound=git(root598,['cat-file','blob',baseline598+':'+file]);
        assert.deepEqual(run598(make598(baseline598,[[file,Buffer.concat([bound,Buffer.from('\n// Synthetic model-bound R2 mutation.\n')])]],'synthetic model-bound R2 change')).reasonCodes,
          ['POSTGRES_OR_MODEL_INPUT_CHANGED']);
      }
    });
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root598)),temporary598);const current=fs.lstatSync(root598,{bigint:true});
    assert.equal(current.dev,owned598.dev);assert.equal(current.ino,owned598.ino);assert.equal(current.birthtimeNs,owned598.birthtimeNs);
    fs.rmSync(root598,{recursive:true,force:false});
  }
});

// Closed current UI cohort in the existing normal598 fixture. No providers,
// PostgreSQL, national model suite or production write is run by this test.
test('closed EN2 admin UI cohort requires exact frames and keeps unsafe scope FULL',async()=>{
 const controls=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-598.json',
  'scripts/source-impact-domain-plan.mjs','scripts/lib/source-impact-domain-owners-598.json',
  'scripts/test-source-impact-domain-plan.mjs','scripts/lib/source-impact-domain-inputs-594.json',
  'scripts/lib/source-impact-domain-owners-594.json','scripts/lib/source-impact-domain-inputs-597.json',
  'scripts/lib/source-impact-domain-owners-597.json','scripts/lib/source-impact-control-imports.mjs'];
 const registry=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-owners-598.json')));
 const frames=registry.assistantAdminUi.frames,reference=registry.sourceReference.head;
 assert.equal(registry.assistantAdminUi.id,'CLOSED_REVIEWED_598_EN2_ADMIN_UI_V1');
 assert.equal(Object.keys(frames).length,16);
 const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-closed-ui-plan-'));
 const owned=fs.lstatSync(root,{bigint:true});
 try{
  git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
  const objects=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
  fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objects.replaceAll('\\','/')+'\n');
  const make=(parent,rows,label)=>{git(root,['read-tree',parent]);for(const [file,body]of rows)
   git(root,['update-index','--add','--cacheinfo','100644',text(root,['hash-object','-w','--stdin'],body),file]);
   return text(root,['commit-tree',text(root,['write-tree']),'-p',parent,'-m',label]);};
  const controlRows=controls.map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]);
  const beforeRows=Object.entries(frames).map(([file,frame])=>[file,git(SOURCE,['cat-file','blob',frame.beforeBlob])]);
  const afterRows=Object.entries(frames).map(([file,frame])=>[file,git(SOURCE,['cat-file','blob',frame.afterBlob])]);
  const fixtureRows=Object.entries(registry.assistantAdminUi.fixtureSources).map(([file,frame])=>{const bytes=git(SOURCE,['cat-file','blob',frame.blob]);assert.equal(createHash('sha256').update(bytes).digest('hex'),frame.sha256);return[file,bytes];});
  const baseline=make(reference,[...controlRows,...beforeRows,...fixtureRows],'synthetic closed UI before exact frames');
  for(const file of controls){const dst=path.join(root,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,fs.readFileSync(path.join(SOURCE,file)));}
  const {planSourceDomainImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-plan.mjs')).href);
  const run=head=>{git(root,['update-ref','HEAD',head]);return plan({baselineCommit:baseline,candidateCommit:head,expectedHead:head});};
  const candidate=make(baseline,afterRows,'synthetic exact closed UI after frames'),actual=run(candidate);
  assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
  for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
  assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
  assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);assert.equal(actual.baselineQualified,false);
  for(const command of ['node --test scripts/test-account-statistics-assistant-callers.mjs',
   'node scripts/test-private-visitor-statistics-4.0.215.mjs','node --test scripts/test-map-forecast-panel.mjs scripts/test-map-timeline-generation.mjs'])
   assert(actual.commands.includes(command),command);
  const mutate=(file,body)=>afterRows.map(([name,value])=>[name,name===file?body:value]);
  const doc='js/services/admin-document-store.js',body=afterRows.find(([file])=>file===doc)[1].toString();
  const changedWrite=body.replace('const body={document_key:key,payload};','const body={document_key:key,payload,unreviewed:true};');
  assert.notEqual(changedWrite,body);
  assert.deepEqual(run(make(baseline,mutate(doc,Buffer.from(changedWrite)),'synthetic changed remoteWrite')).reasonCodes,
   ['REVIEWED_ADMIN_UI_SOURCE_CHANGED:'+doc]);
  assert.equal(run(make(baseline,[...afterRows,['scripts/unreviewed-ui-source.mjs',Buffer.from('export const unknown=1;\n')]],'synthetic unknown owner')).selection,'FULL');
  assert.equal(run(make(baseline,afterRows.filter(([file])=>file!=='bootstrap.js'),'synthetic partial cohort')).selection,'FULL');
  for(const file of ['js/services/permissions-service.js','supabase/schema.sql','js/core/score-engine.js','data/zones.geojson']){
   const current=git(root,['cat-file','blob',baseline+':'+file]);
   assert.equal(run(make(baseline,[...afterRows,[file,Buffer.concat([current,Buffer.from('\n/* synthetic unreviewed scope */\n')])]],'synthetic unsafe UI scope')).selection,'FULL',file);
  }
  const oldKeys=Object.keys(registry.assistantWindFollowup.transitions),oldRows=afterRows.filter(([file])=>oldKeys.includes(file));
  assert.equal(oldRows.length,7);
  const rejectedOld=oldRows.map(([file,value])=>[file,file==='app.js'?Buffer.concat([value,Buffer.from('\n// unreviewed old EN2 bytes\n')]):value]);
  assert.deepEqual(run(make(baseline,rejectedOld,'synthetic unknown old EN2 app')).reasonCodes,['ASSISTANT_WIND_FOLLOWUP_SOURCE_CHANGED:app.js']);
 }finally{
  assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
 }
});

// The new Pages lifecycle is admitted only as one complete byte-reviewed set.
// These are normal Git-domain fixtures, not provider or PostgreSQL executions.
test('closed ordinary Pages lifecycle keeps exact direct and cumulative source boundaries',async()=>{
 const controls=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-598.json',
  'scripts/source-impact-domain-plan.mjs','scripts/lib/source-impact-domain-owners-598.json',
  'scripts/test-source-impact-domain-plan.mjs','scripts/lib/source-impact-domain-inputs-594.json',
  'scripts/lib/source-impact-domain-owners-594.json','scripts/lib/source-impact-domain-inputs-597.json',
  'scripts/lib/source-impact-domain-owners-597.json','scripts/lib/source-impact-control-imports.mjs'];
 const registryFile='scripts/lib/source-impact-domain-owners-598.json';
 const registry=JSON.parse(fs.readFileSync(path.join(SOURCE,registryFile)));
 const prior=JSON.parse(git(SOURCE,['cat-file','blob','421c89240548a1004ae0c35382dc67338679d0ad:'+registryFile]));
 assert.equal(registry.pagesLifecycle.id,'CLOSED_REVIEWED_ORDINARY_PAGES_LIFECYCLE_V1');
 assert.deepEqual(registry.owners.slice(0,prior.owners.length),prior.owners);
 for(const [file,row]of Object.entries(prior.sources))for(const [key,values]of Object.entries(row.definition))
  for(const value of values)assert(registry.sources[file].definition[key].includes(value),'Preserve every old source fingerprint: '+file);
 for(const key of ['exactSourceTransitions','resourceFiles','pagesTransport','assistantWindFollowup','assistantAdminUi'])
  assert.deepEqual(registry[key],prior[key],'Preserve prior whole frames/callers: '+key);
 const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-pages-lifecycle-plan-'));
 const owned=fs.lstatSync(root,{bigint:true});
 try{
  git(root,['init','-q']);git(root,['config','core.autocrlf','false']);
  const objects=fs.realpathSync(path.join(text(SOURCE,['rev-parse','--path-format=absolute','--git-common-dir']),'objects'));
  fs.mkdirSync(path.join(root,'.git/objects/info'),{recursive:true});
  fs.writeFileSync(path.join(root,'.git/objects/info/alternates'),objects.replaceAll('\\','/')+'\n');
  const make=(parent,rows,label)=>{
   git(root,['read-tree',parent]);
   for(const [file,body,mode='100644']of rows)
    git(root,['update-index','--add','--cacheinfo',mode,text(root,['hash-object','-w','--stdin'],body),file]);
   return text(root,['commit-tree',text(root,['write-tree']),'-p',parent,'-m',label]);
  };
  const controlRows=controls.map(file=>[file,fs.readFileSync(path.join(SOURCE,file))]);
  for(const [file,body]of controlRows){const dst=path.join(root,file);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,body);}
  const {planSourceDomainImpactFromGit:plan}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-plan.mjs')).href);
  for(const [name,variant]of Object.entries(registry.pagesLifecycle.variants)){
   const baseline=make(variant.baseline,controlRows,'synthetic current control code on authentic Pages baseline');
   const afterRows=variant.members.map(entry=>{
    const body=fs.readFileSync(path.join(SOURCE,entry.path));assert.equal(body.length,entry.afterBytes);
    assert.equal(createHash('sha256').update(body).digest('hex'),entry.afterSha256);
    return [entry.path,body];
   });
   const run=(rows,base=baseline)=>{
    const head=make(base,rows,'synthetic complete reviewed Pages lifecycle or finite mutation');
    git(root,['update-ref','HEAD',head]);return plan({baselineCommit:base,candidateCommit:head,expectedHead:head});
   };
   const actual=run(afterRows);
   assert.equal(actual.status,'PLANNED',JSON.stringify(actual.reasonCodes));
   assert.equal(actual.selection,'CONTROL_QUALIFICATION_REQUIRED',JSON.stringify(actual.reasonCodes));
   for(const family of ['postgres','C','I','T'])assert.equal(actual.inputDigests[family+'Before'],actual.inputDigests[family+'After']);
   assert.equal(actual.domains.postgres.status,'NOT_APPLICABLE');assert.equal(actual.domains.historical584National.status,'NOT_APPLICABLE');
   assert.equal(actual.skipAuthorized,false);assert.equal(actual.productionAuthority,false);assert.equal(actual.baselineQualified,false);
   for(const command of ['node --test scripts/test-ordinary-pages-immediate-retry.mjs',
    'node scripts/test-pages-generation-and-reentry.mjs','node --test scripts/test-protected-operational-reentry-evidence.mjs',
    'node scripts/test-ravscore-operational-pages-recovery.mjs','node scripts/test-workflow-validation-order-4.0.108.mjs',
    'node --test scripts/test-completed-private-runtime-workflow-inverse.mjs',
    'node --test scripts/test-reusable-production-workflows.mjs','node --test scripts/test-ravscore-integrated-generator.mjs',
    'node scripts/test-weather-acquisition-workflows.mjs','node --test scripts/test-weather-component-progress-workflow.mjs'])
    assert.equal(actual.commands.filter(value=>value===command).length,1,'Actual normal target once: '+command);
   if(variant.adminUiFollowup)for(const command of ['node --test scripts/test-account-statistics-assistant-callers.mjs',
    'node scripts/test-code-only-public-runtime.mjs',
    'node --test scripts/test-map-forecast-panel.mjs scripts/test-map-timeline-generation.mjs'])
    assert(actual.commands.includes(command),'Keep cumulative reviewed target: '+command);
   const mutate=(file,body,mode)=>afterRows.map(([current,value])=>[current,current===file?body:value,current===file?mode:'100644']);
   const reject=(rows,base=baseline)=>assert.equal(run(rows,base).selection,'FULL');
   const action='.github/actions/deploy-ravradar-pages/action.yml',actionBody=afterRows.find(([file])=>file===action)[1];
   reject(afterRows.filter(([file])=>file!==action));
   reject(afterRows.filter(([file])=>file!=='scripts/lib/pages-closure-historical-test-input.mjs'));
   reject(mutate(action,Buffer.concat([actionBody,Buffer.from('\n# unknown permission/input/secret change\n')])));
   reject(mutate(action,actionBody,'100755'));
   const changedBefore=make(baseline,[[action,Buffer.from('name: Unknown before action\n')]],'synthetic wrong complete before blob');
   reject(afterRows,changedBefore);
   const wrongAddition=make(baseline,[['scripts/lib/pages-closure-historical-test-input.mjs',Buffer.from('// previously present, not the reviewed A status\n')]],'synthetic wrong add status');
   reject(afterRows,wrongAddition);
   reject([...afterRows,['scripts/unreviewed-pages-lifecycle.mjs',Buffer.from('export const unknown=1;\n')]]);
   const reader='scripts/github-pages-attempt-evidence.mjs',readerBody=afterRows.find(([file])=>file===reader)[1];
   reject(mutate(reader,Buffer.concat([readerBody,Buffer.from('\n// unknown reader/caller combination\n')])));
   if(variant.adminUiFollowup){
    reject(afterRows.filter(([file])=>file!=='bootstrap.js'));
    const file='app.js',body=afterRows.find(([value])=>value===file)[1];
    reject(mutate(file,Buffer.concat([body,Buffer.from('\n// unknown cumulative UI blob\n')])));
   }else{
    const file='app.js',body=git(root,['cat-file','blob',baseline+':'+file]);
    reject([...afterRows,[file,Buffer.concat([body,Buffer.from('\n// extra known product owner\n')])]]);
   }
   const config=git(root,['cat-file','blob',baseline+':config.js']);
   const protectedInput=run([...afterRows,['config.js',Buffer.concat([config,Buffer.from('\n// genuine model input drift\n')])]]);
   assert.deepEqual(protectedInput.reasonCodes,['POSTGRES_OR_MODEL_INPUT_CHANGED'],name);
   // The same logical resident-byte cap must still refuse a real oversized
   // candidate after before-only cache release. Valid JS whitespace keeps the
   // padded test below8MiB and changes no product/model/cohort member.
   const paddingControlRow=controlRows.find(([file])=>file==='scripts/test-source-impact-domain-plan.mjs');
   afterRows.push([paddingControlRow[0],Buffer.concat([paddingControlRow[1],Buffer.alloc(5*1024*1024,32)])]);
   const overflow=run(afterRows);
   afterRows.pop();
   assert.equal(overflow.status,'REFUSED');
   assert.deepEqual(overflow.reasonCodes,['DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED']);
  }
 }finally{
  assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
  assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
  fs.rmSync(root,{recursive:true,force:false});
 }
});
