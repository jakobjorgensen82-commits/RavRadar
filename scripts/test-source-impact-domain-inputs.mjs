// The normal reader is exercised against real isolated Git objects, never a
// caller-provided manifest/digest/reader or a synthetic Git response.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const SOURCE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const profile=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-594.json')));
const BASE=profile.referenceCommit;
const environment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
  GIT_TERMINAL_PROMPT:'0',GIT_AUTHOR_NAME:'Synthetic domain fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
  GIT_COMMITTER_NAME:'Synthetic domain fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
  GIT_AUTHOR_DATE:'2026-10-31T12:00:00Z',GIT_COMMITTER_DATE:'2026-10-31T12:00:00Z'};
const command=(root,args,input)=>execFileSync('git',['-C',root,...args],{input,env:environment,
  timeout:10000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
const text=(root,args)=>command(root,args).toString('utf8').trim();
const sourceBlob=file=>command(SOURCE,['cat-file','blob',BASE+':'+file]);
const productFiles=['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-594.json'];
const noAuthority=result=>{
  assert.equal(result.status,'DOMAIN_ANALYSIS_NOT_GATE_AUTHORITY');
  for(const key of ['baselineQualified','skipAuthorized','postgresExecuted','sqliteExecuted',
    'historicalNationalExecuted','productionAuthority'])assert.equal(result[key],false);
};

test('normal domain input analysis uses real Git objects and keeps every comparison without gate authority',async t=>{
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain-inputs-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    command(root,['init','-q']);command(root,['config','core.autocrlf','false']);
    const entries=command(SOURCE,['ls-tree','-rz','-t','--full-tree',BASE]).toString('utf8').split('\0').filter(Boolean)
      .map(line=>{const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);
        return {file:m[4],mode:m[1],type:m[2],oid:m[3]};});
    const byName=new Map(entries.map(row=>[row.file,row]));
    const modelFiles=Object.values(profile.models).flatMap(def=>{
      const raw=sourceBlob(def.file).toString('utf8'),manifest=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
      return [def.file,...manifest.files.map(row=>row[def.rowKey])];
    });
    const selected=new Set([...profile.postgresModules,...profile.postgresData,...profile.nativeEvidenceControls,
      ...profile.setupInputs,...profile.plannerTrustChain,...profile.continuation.files,profile.continuation.file,
      ...modelFiles,'package.json',...entries.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).map(row=>row.file)]);
    const rootTree=text(SOURCE,['rev-parse',BASE+'^{tree}']);
    const objects=[...new Set([BASE,rootTree,...entries.filter(row=>row.type==='tree'||selected.has(row.file)).map(row=>row.oid),
      ...profile.frozenGitAnchors.flatMap(row=>[row.head,row.tree])])];
    // pack-objects --stdout only reads the source object store. The owned
    // fixture receives a self-contained pack, with no shared writable objects.
    const pack=command(SOURCE,['pack-objects','--stdout'],objects.join('\n')+'\n');
    command(root,['unpack-objects','-q'],pack);
    const baseline=command(root,['commit-tree',rootTree,'-m','synthetic root with genuine594 tree']).toString('utf8').trim();
    command(root,['update-ref','HEAD',baseline]);
    for(const file of productFiles){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(SOURCE,file),target);}
    const {analyzeSourceDomainInputs:analyze}=await import(pathToFileURL(path.join(root,productFiles[0])).href);
    const treeRows=id=>command(root,['ls-tree','-z',id]).toString('utf8').split('\0').filter(Boolean).map(line=>{
      const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);
      return {mode:m[1],type:m[2],oid:m[3],name:m[4]};});
    function replace(treeId,parts,blob,mode){
      const rows=treeId?treeRows(treeId):[],name=parts[0],prior=rows.find(row=>row.name===name);
      const replacement=parts.length===1?{mode,type:'blob',oid:blob,name}:
        {mode:'040000',type:'tree',oid:replace(prior?.oid,parts.slice(1),blob,mode),name};
      const next=[...rows.filter(row=>row.name!==name),replacement].sort((a,b)=>a.name.localeCompare(b.name,'en'));
      return command(root,['mktree','--missing','-z'],next.map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join('')).toString('utf8').trim();
    }
    const change=(file,body,label,mode='100644')=>{
      const blob=command(root,['hash-object','-w','--stdin'],body).toString('utf8').trim();
      const tree=replace(rootTree,file.split('/'),blob,mode);
      const commit=command(root,['commit-tree',tree,'-p',baseline,'-m',label]).toString('utf8').trim();
      command(root,['update-ref','HEAD',commit]);return commit;
    };
    const run=candidate=>{
      const result=analyze({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});
      noAuthority(result);assert.equal(result.analysis,'COMPLETE',result.failureCode);return result;
    };
    const original=run(baseline);
    await t.test('unchanged real594 source binds143 files/C100/I99/T12,13 anchors and normal native input digest',()=>{
      assert.notEqual(baseline,BASE,'Synthetic root identity must never become the genuine594 commit');
      assert.equal(original.identity.baselineCommit,baseline);assert.equal(original.identity.baselineTree,rootTree);
      assert.deepEqual(text(root,['rev-list','--parents','-n','1',baseline]).split(' '),[baseline]);
      assert.equal(original.actualPostgresInput.before.totalFiles,143);assert.equal(original.actualPostgresInput.unchanged,true);
      assert.equal(original.actualPostgresInput.before.inputSha256,'493e0a14ec8164be3aa1035e5553354be170541f4dd0173f71fbf5d29695508e');
      assert.equal(original.actualPostgresInput.before.moduleSha256,'6c0579de5a0b29b3ab551d718e0cfadc9450e570828355fbae716df694de09bd');
      assert.equal(original.models.C.before.files.length,100);assert.equal(original.models.I.before.files.length,99);
      assert.equal(original.models.T.before.files.length,12);assert.equal(original.frozenGitAnchors.anchors.length,13);
      for(const domain of Object.values(original.models))assert.equal(domain.unchanged,true);
      for(const domain of Object.values(original.evidenceControls))assert.equal(domain.unchanged,true);
      assert.equal(original.independentControlQualificationRequired,true);
    });
    await t.test('one of143 real input blobs changes the normal input digest',()=>{
      const file='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
      const r=run(change(file,Buffer.concat([sourceBlob(file),Buffer.from('\n// synthetic input delta\n')]),'one native input'));
      assert.equal(r.actualPostgresInput.unchanged,false);assert.equal(r.actualPostgresInput.changes[0].file,file);
      assert.equal(r.evidenceControls.native.unchanged,true);
    });
    await t.test('every new73rd PostgreSQL migration is included as an input',()=>{
      const file='supabase/migrations/20990101000000_synthetic_domain_only.sql';
      const r=run(change(file,'-- synthetic new PostgreSQL input\n','73rd PG SQL'));
      assert.equal(r.actualPostgresInput.after.sqlFiles,73);assert.equal(r.actualPostgresInput.after.totalFiles,144);
      assert.equal(r.actualPostgresInput.unchanged,false);assert.equal(r.actualPostgresInput.changes[0].file,file);
    });
    await t.test('changed package scope changes PostgreSQL interpretation despite unchanged143 file bytes',()=>{
      const r=run(change('scripts/lib/package.json','{"type":"commonjs"}\n','new package scope'));
      assert.equal(r.actualPostgresInput.unchanged,false);assert.equal(r.actualPostgresInput.changes.length,0);
      assert.equal(r.actualPostgresInput.before.inputSha256,r.actualPostgresInput.after.inputSha256);
      assert.notDeepEqual(r.actualPostgresInput.before.packageScopes,r.actualPostgresInput.after.packageScopes);
    });
    await t.test('evidence test byte changes stay distinct from actual PostgreSQL inputs',()=>{
      const file='scripts/test-native-postgres-evidence.mjs';
      const r=run(change(file,Buffer.concat([sourceBlob(file),Buffer.from('\n// synthetic control delta\n')]),'control byte'));
      assert.equal(r.actualPostgresInput.unchanged,true);assert.equal(r.evidenceControls.native.unchanged,false);
      assert.equal(r.evidenceControls.native.changes[0].file,file);
    });
    await t.test('a D1-only SQL addition is present in whole diff and never becomes PostgreSQL execution',()=>{
      const file='cloudflare/trip-gateway/migrations/999_synthetic_domain_only.sql';
      const r=run(change(file,'-- synthetic D1 input only\n','D1-only SQL'));
      assert.equal(r.actualPostgresInput.unchanged,true);assert.equal(r.actualPostgresInput.after.sqlFiles,72);
      assert.equal(Buffer.from(r.completeGitDiff.inventory[0].pathUtf8Hex,'hex').toString('utf8'),file);
      for(const domain of Object.values(r.models))assert.equal(domain.unchanged,true);
    });
    await t.test('planner and newly introduced helper bytes cannot grant themselves skip authority',()=>{
      for(const file of ['scripts/source-impact-plan.mjs','scripts/source-impact-domain-inputs.mjs']){
        const body=file===productFiles[0]?fs.readFileSync(path.join(SOURCE,file)):sourceBlob(file);
        const r=run(change(file,Buffer.concat([body,Buffer.from('\n// synthetic planner delta\n')]),'planner '+file));
        assert.equal(r.actualPostgresInput.unchanged,true);assert.equal(r.evidenceControls.plannerTrustChain.unchanged,false);
        assert(r.evidenceControls.plannerTrustChain.changes.some(row=>row.file===file));
      }
    });
    await t.test('actual C/I source mutation is visible even when generated manifest has not been rebuilt',()=>{
      const file='js/core/ravscore-candidate-g.js';
      const r=run(change(file,Buffer.concat([sourceBlob(file),Buffer.from('\n// synthetic model source delta\n')]),'model source'));
      assert.equal(r.models.C.unchanged,false);assert(r.models.C.after.sourceMismatches.includes(file));
      assert.equal(r.actualPostgresInput.unchanged,false);
    });
    await t.test('candidate generated JavaScript is never evaluated to obtain a manifest',()=>{
      const file=profile.models.I.file;globalThis.__domainManifestExecuted=false;
      const candidate=change(file,Buffer.concat([sourceBlob(file),Buffer.from('\nglobalThis.__domainManifestExecuted=true;\n')]),'hostile manifest frame');
      const result=analyze({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});
      noAuthority(result);assert.equal(result.analysis,'REFUSED');assert.equal(globalThis.__domainManifestExecuted,false);
      delete globalThis.__domainManifestExecuted;
    });
    await t.test('missing authentic frozen anchor object refuses the analysis without synthesized provenance',()=>{
      command(root,['update-ref','HEAD',baseline]);const head=profile.frozenGitAnchors[0].head;
      const object=path.resolve(root,'.git/objects',head.slice(0,2),head.slice(2));
      assert(object.startsWith(path.resolve(root,'.git/objects')+path.sep));assert(fs.lstatSync(object).isFile());
      const raw=command(SOURCE,['cat-file','commit',head]);fs.unlinkSync(object);
      try{const result=analyze({baselineCommit:baseline,candidateCommit:baseline,expectedHead:baseline});
        noAuthority(result);assert.equal(result.analysis,'REFUSED');assert.equal(result.failureCode,'DOMAIN_FROZEN_ANCHOR_UNAVAILABLE');
      }finally{assert.equal(command(root,['hash-object','-w','-t','commit','--stdin'],raw).toString('utf8').trim(),head);}
    });
    await t.test('caller proof booleans, root overrides and wrong HEAD cannot become analysis authority',()=>{
      command(root,['update-ref','HEAD',baseline]);const input={baselineCommit:baseline,candidateCommit:baseline,expectedHead:baseline};
      for(const extra of [{baselineQualified:true},{root:SOURCE},{paths:[]},{readGit:()=>{throw Error('must not run');}}]){
        const result=analyze({...input,...extra});noAuthority(result);assert.equal(result.analysis,'REFUSED');
      }
      const result=analyze({...input,expectedHead:'f'.repeat(40)});noAuthority(result);assert.equal(result.analysis,'REFUSED');
    });
  }finally{
    assert.equal(path.dirname(fs.realpathSync(root)),temporary);const current=fs.lstatSync(root,{bigint:true});
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert.equal(current.birthtimeNs,owned.birthtimeNs);
    fs.rmSync(root,{recursive:true,force:false});
  }
});

test('normal597 input profile uses genuine source bytes without qualifying a baseline or hiding bound R2 changes',async t=>{
  const p=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-597.json')));
  assert.equal(p.referenceCommit,'564ec3bc3e76317b09cb59ea34a2add2850324ce');
  const source=file=>command(SOURCE,['cat-file','blob',p.referenceCommit+':'+file]);
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain597-inputs-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    command(root,['init','-q']);command(root,['config','core.autocrlf','false']);
    const entries=command(SOURCE,['ls-tree','-rz','-t','--full-tree',p.referenceCommit]).toString('utf8').split('\0').filter(Boolean)
      .map(line=>{const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);
        return{file:m[4],mode:m[1],type:m[2],oid:m[3]};});
    const modelFiles=Object.values(p.models).flatMap(def=>{
      const raw=source(def.file).toString('utf8'),m=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
      return[def.file,...m.files.map(row=>row[def.rowKey])];
    });
    const selected=new Set([...p.postgresModules,...p.postgresData,...p.nativeEvidenceControls,...p.setupInputs,
      ...p.plannerTrustChain,...p.continuation.files,p.continuation.file,...modelFiles,'package.json',
      ...entries.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).map(row=>row.file)]);
    const rootTree=text(SOURCE,['rev-parse',p.referenceCommit+'^{tree}']);
    const objects=[...new Set([p.referenceCommit,rootTree,...entries.filter(row=>row.type==='tree'||selected.has(row.file)).map(row=>row.oid),
      ...p.frozenGitAnchors.flatMap(row=>[row.head,row.tree])])];
    command(root,['unpack-objects','-q'],command(SOURCE,['pack-objects','--stdout'],objects.join('\n')+'\n'));
    const baseline=text(root,['commit-tree',rootTree,'-m','synthetic root with genuine597 tree; not FULL qualification']);
    command(root,['update-ref','HEAD',baseline]);
    for(const file of ['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-594.json','scripts/lib/source-impact-domain-inputs-597.json']){
      const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(SOURCE,file),target);
    }
    const {analyzeSourceDomainInputs:analyze}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-inputs.mjs')).href);
    const treeRows=id=>command(root,['ls-tree','-z',id]).toString('utf8').split('\0').filter(Boolean).map(line=>{
      const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
    const replace=(tree,parts,oid,mode='100644')=>{
      const rows=tree?treeRows(tree):[],name=parts[0],prior=rows.find(row=>row.name===name);
      const row=parts.length===1?{name,mode,type:'blob',oid}:
        {name,mode:'040000',type:'tree',oid:replace(prior?.oid,parts.slice(1),oid,mode)};
      return command(root,['mktree','--missing','-z'],[...rows.filter(row=>row.name!==name),row]
        .map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join('')).toString('utf8').trim();
    };
    const change=(file,body)=>{
      const oid=command(root,['hash-object','-w','--stdin'],body).toString('utf8').trim(),tree=replace(rootTree,file.split('/'),oid);
      const candidate=text(root,['commit-tree',tree,'-p',baseline,'-m','synthetic597 source input mutation']);
      command(root,['update-ref','HEAD',candidate]);return candidate;
    };
    const run=candidate=>{
      const result=analyze({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});noAuthority(result);return result;
    };
    const original=run(baseline);assert.equal(original.analysis,'COMPLETE',original.failureCode);
    await t.test('unchanged597 keeps144 PG inputs, C101 I100 T12,73 migrations and14 genuine anchors with no gate authority',()=>{
      assert.notEqual(baseline,p.referenceCommit);assert.equal(original.profile.id,p.id);
      assert.equal(original.profile.scope,'REVIEWED_597_INPUT_INVENTORY_ONLY');
      assert.equal(original.actualPostgresInput.before.totalFiles,144);assert.equal(original.actualPostgresInput.before.sqlFiles,73);
      assert.equal(original.actualPostgresInput.unchanged,true);assert.equal(original.models.C.before.files.length,101);
      assert.equal(original.models.I.before.files.length,100);assert.equal(original.models.T.before.files.length,12);
      assert.equal(original.frozenGitAnchors.anchors.length,14);
      for(const family of Object.values(original.models))assert.equal(family.unchanged,true);
    });
    await t.test('unbound text is separate from PostgreSQL and model input',()=>{
      const result=run(change('CHANGELOG.md','Synthetic unbound prose only.\n'));assert.equal(result.analysis,'COMPLETE');
      assert.equal(result.actualPostgresInput.unchanged,true);for(const family of Object.values(result.models))assert.equal(family.unchanged,true);
      assert.equal(result.completeGitDiff.changedRows,1);
    });
    await t.test('the actual73rd SQL is included and any new74th SQL changes the protected input',()=>{
      const sql=entries.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).at(-1).file;
      const changed=run(change(sql,Buffer.concat([source(sql),Buffer.from('\n-- synthetic archived SQL mutation\n')])));
      assert.equal(changed.analysis,'COMPLETE');assert.equal(changed.actualPostgresInput.unchanged,false);
      const added=run(change('supabase/migrations/20990101000000_synthetic597_only.sql','-- synthetic74th input\n'));
      assert.equal(added.analysis,'COMPLETE');assert.equal(added.actualPostgresInput.after.sqlFiles,74);
      assert.equal(added.actualPostgresInput.unchanged,false);
    });
    await t.test('both actual R2 IO owners are C/I-bound and must never be classified as model-unchanged',()=>{
      for(const file of ['scripts/lib/r2-private-runtime-storage.mjs','scripts/protected-private-production-runtime.mjs']){
        assert(original.models.C.before.files.some(row=>row.file===file));assert(original.models.I.before.files.some(row=>row.file===file));
        const result=run(change(file,Buffer.concat([source(file),Buffer.from('\n// synthetic bound IO change\n')])));
        assert.equal(result.analysis,'COMPLETE');assert.equal(result.models.C.unchanged,false);assert.equal(result.models.I.unchanged,false);
      }
    });
    await t.test('mixed597 and594 release refuses instead of selecting an old profile',()=>{
      const pkg=JSON.parse(source('package.json'));pkg.version='4.0.594';
      const result=run(change('package.json',JSON.stringify(pkg)+'\n'));
      assert.equal(result.analysis,'REFUSED');assert.equal(result.failureCode,'DOMAIN_RELEASE_PROFILE_MISMATCH');
    });
  }finally{
    const current=fs.lstatSync(root,{bigint:true}),resolved=path.resolve(root);
    assert.equal(path.dirname(resolved),temporary);assert(path.basename(resolved).startsWith('rr-domain597-inputs-'));
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert(!current.isSymbolicLink());
    fs.rmSync(resolved,{recursive:true,force:false});
  }
});


// Distinct actual598 protected source, never a retagged597 FULL proof.
test('normal598 input profile uses genuine source bytes without qualifying a baseline or hiding bound R2 changes',async t=>{
  const p=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-598.json')));
  assert.equal(p.referenceCommit,'bd9cf518fe798ddea45d2b835f324f6e2bea06fc');
  const source=file=>command(SOURCE,['cat-file','blob',p.referenceCommit+':'+file]);
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain598-inputs-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    command(root,['init','-q']);command(root,['config','core.autocrlf','false']);
    const entries=command(SOURCE,['ls-tree','-rz','-t','--full-tree',p.referenceCommit]).toString('utf8').split('\0').filter(Boolean)
      .map(line=>{const m=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);
        return{file:m[4],mode:m[1],type:m[2],oid:m[3]};});
    const modelFiles=Object.values(p.models).flatMap(def=>{
      const raw=source(def.file).toString('utf8'),m=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
      return[def.file,...m.files.map(row=>row[def.rowKey])];
    });
    const selected=new Set([...p.postgresModules,...p.postgresData,...p.nativeEvidenceControls,...p.setupInputs,
      ...p.plannerTrustChain,...p.continuation.files,p.continuation.file,...modelFiles,'package.json',
      ...entries.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).map(row=>row.file)]);
    const rootTree=text(SOURCE,['rev-parse',p.referenceCommit+'^{tree}']);
    const objects=[...new Set([p.referenceCommit,rootTree,...entries.filter(row=>row.type==='tree'||selected.has(row.file)).map(row=>row.oid),
      ...p.frozenGitAnchors.flatMap(row=>[row.head,row.tree])])];
    command(root,['unpack-objects','-q'],command(SOURCE,['pack-objects','--stdout'],objects.join('\n')+'\n'));
    const baseline=text(root,['commit-tree',rootTree,'-m','synthetic root with genuine598 tree; not FULL qualification']);
    command(root,['update-ref','HEAD',baseline]);
    for(const file of ['scripts/source-impact-domain-inputs.mjs','scripts/lib/source-impact-domain-inputs-594.json','scripts/lib/source-impact-domain-inputs-597.json','scripts/lib/source-impact-domain-inputs-598.json']){
      const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(SOURCE,file),target);
    }
    const {analyzeSourceDomainInputs:analyze}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-inputs.mjs')).href);
    const treeRows=id=>command(root,['ls-tree','-z',id]).toString('utf8').split('\0').filter(Boolean).map(line=>{
      const m=/^(\d{6}) (blob|tree) ([a-f0-9]{40})\t(.+)$/.exec(line);assert(m);return{mode:m[1],type:m[2],oid:m[3],name:m[4]};});
    const replace=(tree,parts,oid,mode='100644')=>{
      const rows=tree?treeRows(tree):[],name=parts[0],prior=rows.find(row=>row.name===name);
      const row=parts.length===1?{name,mode,type:'blob',oid}:
        {name,mode:'040000',type:'tree',oid:replace(prior?.oid,parts.slice(1),oid,mode)};
      return command(root,['mktree','--missing','-z'],[...rows.filter(row=>row.name!==name),row]
        .map(row=>`${row.mode} ${row.type} ${row.oid}\t${row.name}\0`).join('')).toString('utf8').trim();
    };
    const change=(file,body)=>{
      const oid=command(root,['hash-object','-w','--stdin'],body).toString('utf8').trim(),tree=replace(rootTree,file.split('/'),oid);
      const candidate=text(root,['commit-tree',tree,'-p',baseline,'-m','synthetic598 source input mutation']);
      command(root,['update-ref','HEAD',candidate]);return candidate;
    };
    const run=candidate=>{
      const result=analyze({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});noAuthority(result);return result;
    };
    const original=run(baseline);assert.equal(original.analysis,'COMPLETE',original.failureCode);
    await t.test('unchanged598 keeps148 PG inputs, C101 I100 T12,74 migrations and16 genuine anchors with no gate authority',()=>{
      assert.notEqual(baseline,p.referenceCommit);assert.equal(original.profile.id,p.id);
      assert.equal(original.profile.scope,'REVIEWED_598_INPUT_INVENTORY_ONLY');
      assert.equal(original.actualPostgresInput.before.totalFiles,148);assert.equal(original.actualPostgresInput.before.sqlFiles,74);
      assert.equal(original.actualPostgresInput.unchanged,true);assert.equal(original.models.C.before.files.length,101);
      assert.equal(original.models.I.before.files.length,100);assert.equal(original.models.T.before.files.length,12);
      assert.equal(original.frozenGitAnchors.anchors.length,16);
      for(const family of Object.values(original.models))assert.equal(family.unchanged,true);
    });
    await t.test('unbound text is separate from PostgreSQL and model input',()=>{
      const result=run(change('CHANGELOG.md','Synthetic unbound prose only.\n'));assert.equal(result.analysis,'COMPLETE');
      assert.equal(result.actualPostgresInput.unchanged,true);for(const family of Object.values(result.models))assert.equal(family.unchanged,true);
      assert.equal(result.completeGitDiff.changedRows,1);
    });
    await t.test('the actual74th SQL is included and any new75th SQL changes the protected input',()=>{
      const sql=entries.filter(row=>row.file.startsWith('supabase/migrations/')&&row.file.endsWith('.sql')).at(-1).file;
      const changed=run(change(sql,Buffer.concat([source(sql),Buffer.from('\n-- synthetic archived SQL mutation\n')])));
      assert.equal(changed.analysis,'COMPLETE');assert.equal(changed.actualPostgresInput.unchanged,false);
      const added=run(change('supabase/migrations/20990101000000_synthetic598_only.sql','-- synthetic75th input\n'));
      assert.equal(added.analysis,'COMPLETE');assert.equal(added.actualPostgresInput.after.sqlFiles,75);
      assert.equal(added.actualPostgresInput.unchanged,false);
    });
    await t.test('both actual R2 IO owners are C/I-bound and must never be classified as model-unchanged',()=>{
      for(const file of ['scripts/lib/r2-private-runtime-storage.mjs','scripts/protected-private-production-runtime.mjs']){
        assert(original.models.C.before.files.some(row=>row.file===file));assert(original.models.I.before.files.some(row=>row.file===file));
        const result=run(change(file,Buffer.concat([source(file),Buffer.from('\n// synthetic bound IO change\n')])));
        assert.equal(result.analysis,'COMPLETE');assert.equal(result.models.C.unchanged,false);assert.equal(result.models.I.unchanged,false);
      }
    });
    await t.test('mixed598 and594 release refuses instead of selecting an old profile',()=>{
      const pkg=JSON.parse(source('package.json'));pkg.version='4.0.594';
      const result=run(change('package.json',JSON.stringify(pkg)+'\n'));
      assert.equal(result.analysis,'REFUSED');assert.equal(result.failureCode,'DOMAIN_RELEASE_PROFILE_MISMATCH');
    });
  }finally{
    const current=fs.lstatSync(root,{bigint:true}),resolved=path.resolve(root);
    assert.equal(path.dirname(resolved),temporary);assert(path.basename(resolved).startsWith('rr-domain598-inputs-'));
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert(!current.isSymbolicLink());
    fs.rmSync(resolved,{recursive:true,force:false});
  }
});



// Actual issued599 input bytes, with independent owned Git objects only.
// These are source-analysis facts; never a FULL/native/runtime qualification.
test('derived599 input inventory keeps genuine metadata, factory origins and all refusal boundaries',async t=>{
  const p=JSON.parse(fs.readFileSync(path.join(SOURCE,'scripts/lib/source-impact-domain-inputs-598.json')));
  const origins=[...p.frozenGitAnchors,
    {head:'bd9cf518fe798ddea45d2b835f324f6e2bea06fc',tree:'2f71c562eea774ca03996802f83bdad7cccd43cc'},
    {head:'82200280c42b9060f14be2721ba7b766e0ede5a6',tree:'c69c1beed4275fb02af216a1c4741410555e2675'}];
  const modelFiles=Object.values(p.models).flatMap(def=>{
    const raw=fs.readFileSync(path.join(SOURCE,def.file),'utf8');
    const manifest=JSON.parse(raw.slice(raw.indexOf('Object.freeze(')+14,raw.lastIndexOf(');')));
    return [def.file,...manifest.files.map(row=>row[def.rowKey])];
  });
  const offSql='supabase/migrations/20261116181500_account_erasure_outbox_off.sql';
  const offReader='scripts/verify-account-erasure-schema.mjs';
  const erasureAdapter='scripts/lib/account-erasure-outbox-native-fixture.mjs';
  // Preserve the original actual59975-row input; the named app successor is separate below.
  const migrations=text(SOURCE,['ls-files','-z']).split('\0').filter(file=>file.startsWith('supabase/migrations/')&&file.endsWith('.sql')&&file!==offSql);
  assert.equal(migrations.length,75);
  const selected=[...new Set([...p.postgresModules,...p.postgresData,...p.nativeEvidenceControls,...p.setupInputs,
    ...p.plannerTrustChain,...p.continuation.files,p.continuation.file,...modelFiles,...migrations,'package.json','version.json'])];
  const temporary=fs.realpathSync(os.tmpdir()),root=fs.mkdtempSync(path.join(temporary,'rr-domain599-inputs-'));
  const owned=fs.lstatSync(root,{bigint:true});
  try{
    command(root,['init','-q']);command(root,['config','core.autocrlf','false']);
    for(const file of selected){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));
      const from=path.join(SOURCE,file),target=path.join(root,file);assert(fs.lstatSync(from).isFile());
      fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(from,target);}
    const extras=[['bd9cf518fe798ddea45d2b835f324f6e2bea06fc','version.json'],
      ['82200280c42b9060f14be2721ba7b766e0ede5a6','scripts/test-protected-ravscore-continuation-checkpoint.mjs'],
      ['82200280c42b9060f14be2721ba7b766e0ede5a6','data/admin/ravscore-profile-selection.json'],
      // Exact ancestor tree objects for these historical selected paths only.
      ['82200280c42b9060f14be2721ba7b766e0ede5a6','scripts'],
      ['82200280c42b9060f14be2721ba7b766e0ede5a6','data'],
      ['82200280c42b9060f14be2721ba7b766e0ede5a6','data/admin']];
    const extraBlobs=extras.map(([ref,file])=>text(SOURCE,['rev-parse',ref+':'+file]));
    command(root,['unpack-objects','-q'],command(SOURCE,['pack-objects','--stdout'],
      [...new Set([...origins.flatMap(row=>[row.head,row.tree]),...extraBlobs])].join('\n')+'\n'));
    command(root,['add','--all']);const tree=text(root,['write-tree']);
    const baseline=text(root,['commit-tree',tree,'-m','synthetic owned current599 source facts, not qualification']);
    command(root,['update-ref','HEAD',baseline]);assert.equal(text(root,['status','--porcelain','--untracked-files=no']),'');
    const {analyzeSourceDomainInputs:analyze}=await import(pathToFileURL(path.join(root,'scripts/source-impact-domain-inputs.mjs')).href);
    const run=candidate=>{const result=analyze({baselineCommit:baseline,candidateCommit:candidate,expectedHead:candidate});noAuthority(result);return result;};
    const reset=()=>command(root,['reset','--hard',baseline]);
    const change=(file,body)=>{
      reset();fs.writeFileSync(path.join(root,file),body);command(root,['add','--',file]);
      const candidate=text(root,['commit-tree',text(root,['write-tree']),'-p',baseline,'-m','synthetic current599 input mutation']);
      command(root,['update-ref','HEAD',candidate]);return candidate;
    };
    const original=run(baseline);assert.equal(original.analysis,'COMPLETE',original.failureCode);
    await t.test('same actual599 family is complete without PG or gate authority',()=>{
      assert.equal(original.profile.id,'DERIVED_599_DOMAIN_INPUTS_C101_I100_T12');
      assert.equal(original.profile.scope,'DERIVED_599_INPUT_INVENTORY_ONLY');
      assert.equal(original.actualPostgresInput.before.modules,69);assert.equal(original.actualPostgresInput.before.dataFiles,5);
      assert.equal(original.actualPostgresInput.before.sqlFiles,75);assert.equal(original.actualPostgresInput.before.totalFiles,149);
      assert.equal(original.models.C.before.files.length,101);assert.equal(original.models.I.before.files.length,100);
      assert.equal(original.models.T.before.files.length,12);assert.equal(original.frozenGitAnchors.anchors.length,18);
      assert.equal(original.actualPostgresInput.unchanged,true);for(const family of Object.values(original.models))assert.equal(family.unchanged,true);
    });
    await t.test('the actual OFF76th SQL and metadata reader are new PG inputs, never old75 proof',()=>{
      reset();
      for(const file of [offSql,offReader,erasureAdapter]){
        const source=path.join(SOURCE,file),target=path.join(root,file);
        assert(fs.lstatSync(source).isFile());fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
      }
      command(root,['add','--',offSql,offReader,erasureAdapter]);
      const offCommit=text(root,['commit-tree',text(root,['write-tree']),'-p',baseline,'-m','synthetic actual OFF app inputs, not PG qualification']);
      command(root,['update-ref','HEAD',offCommit]);
      const added=run(offCommit);assert.equal(added.analysis,'COMPLETE',added.failureCode);
      assert.equal(added.actualPostgresInput.before.sqlFiles,75);assert.equal(added.actualPostgresInput.after.sqlFiles,76);
      assert.equal(added.actualPostgresInput.before.modules,69);assert.equal(added.actualPostgresInput.after.modules,71);
      assert.equal(added.actualPostgresInput.after.totalFiles,152);
      assert.equal(added.actualPostgresInput.unchanged,false);
      for(const file of [offSql,offReader,erasureAdapter])assert(added.actualPostgresInput.changes.some(row=>row.file===file));
      for(const family of Object.values(added.models))assert.equal(family.unchanged,true);
      const same=analyze({baselineCommit:offCommit,candidateCommit:offCommit,expectedHead:offCommit});
      noAuthority(same);assert.equal(same.analysis,'COMPLETE',same.failureCode);
      assert.equal(same.actualPostgresInput.before.sqlFiles,76);assert.equal(same.actualPostgresInput.unchanged,true);
      fs.writeFileSync(path.join(root,'supabase/migrations/20990101000000_unknown.sql'),'-- synthetic unknown extra input\n');
      command(root,['add','--','supabase/migrations/20990101000000_unknown.sql']);
      const unknown=text(root,['commit-tree',text(root,['write-tree']),'-p',offCommit,'-m','synthetic unknown77-row baseline']);
      command(root,['update-ref','HEAD',unknown]);
      const refused=analyze({baselineCommit:unknown,candidateCommit:unknown,expectedHead:unknown});
      noAuthority(refused);assert.equal(refused.analysis,'REFUSED');
    });
    // equal/deepEqual append their diff: the existing normal API deliberately
    // projects these failures to its closed generic refusal code.
    await t.test('whole metadata and actual application release cannot be forged',()=>{
      const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
      for(const mutate of [value=>{value.releaseContract.unknown=true;},
        value=>{value.releaseContract.modelBindings.integrated.modelId='unknown';},
        value=>{value.releaseContract.releaseVersion='4.0.600';},value=>{value.version='4.0.600';}]){
        const invalid=structuredClone(version);mutate(invalid);
        const result=run(change('version.json',JSON.stringify(invalid)+'\n'));
        assert.equal(result.analysis,'REFUSED');assert.equal(result.failureCode,'DOMAIN_INPUT_ANALYSIS_REFUSED');
      }
    });
    await t.test('old expected head, changed manifest, T and archived SQL stay refused or changed',()=>{
      reset();const version=fs.readFileSync(path.join(root,'version.json'));
      const candidate=change('version.json',version);
      const oldHead=analyze({baselineCommit:baseline,candidateCommit:baseline,expectedHead:baseline});
      noAuthority(oldHead);assert.equal(oldHead.analysis,'REFUSED');assert.equal(oldHead.failureCode,'DOMAIN_INPUT_ANALYSIS_REFUSED');
      reset();const generated=fs.readFileSync(path.join(root,p.models.C.file),'utf8');
      const bad=run(change(p.models.C.file,generated.replace('faa049cb86e733e451211f50c155ff90fd3462230310298cf5696757ef5c9f5d','0'.repeat(64))));
      assert.equal(bad.analysis,'REFUSED');assert.equal(bad.failureCode,'DOMAIN_INPUT_ANALYSIS_REFUSED');
      reset();const tFile='js/core/ravscore-mobilisation-memory.js',tBytes=fs.readFileSync(path.join(root,tFile));
      const changedT=run(change(tFile,Buffer.concat([tBytes,Buffer.from('\n// synthetic changed T input\n')])));
      assert.equal(changedT.analysis,'REFUSED');assert.equal(changedT.failureCode,'DOMAIN_INPUT_ANALYSIS_REFUSED');
      reset();const sql=migrations[0],sqlBytes=fs.readFileSync(path.join(root,sql));
      const changedSql=run(change(sql,Buffer.concat([sqlBytes,Buffer.from('\n-- synthetic archived SQL drift\n')])));
      assert.equal(changedSql.analysis,'COMPLETE',changedSql.failureCode);assert.equal(changedSql.actualPostgresInput.unchanged,false);
      assert(changedSql.actualPostgresInput.changes.some(row=>row.file===sql));
    });
    await t.test('both fixed metadata and factory inputs must physically exist in the owned object store',()=>{
      reset();for(const [id,failureCode]of [[origins.at(-2).head,'DOMAIN_FROZEN_ANCHOR_UNAVAILABLE'],[extraBlobs[1],'DOMAIN_SELECTED_OBJECT_UNAVAILABLE']]){
        assert.match(id,/^[a-f0-9]{40}$/);const file=path.resolve(root,'.git/objects',id.slice(0,2),id.slice(2));
        assert(file.startsWith(path.resolve(root,'.git/objects')+path.sep));assert(fs.lstatSync(file).isFile());
        const saved=file+'.synthetic-unavailable';fs.renameSync(file,saved);
        try{const result=run(baseline);assert.equal(result.analysis,'REFUSED');assert.equal(result.failureCode,failureCode);}
        finally{fs.renameSync(saved,file);}
      }
    });
  }finally{
    const current=fs.lstatSync(root,{bigint:true}),resolved=path.resolve(root);
    assert.equal(path.dirname(resolved),temporary);assert(path.basename(resolved).startsWith('rr-domain599-inputs-'));
    assert.equal(current.dev,owned.dev);assert.equal(current.ino,owned.ino);assert(!current.isSymbolicLink());
    fs.rmSync(resolved,{recursive:true,force:false});
  }
});
