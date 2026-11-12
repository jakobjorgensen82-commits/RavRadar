import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const BOOK='docs/handbook/content.json', MD='HANDBOOK-RAVRADAR.md';
const INSTALL='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
const KEY='ravradar-derived-source-bindings-v1';
const MARKER="insert into public.admin_documents(document_key,payload,updated_by) values('handbook','";
const END="'::jsonb,null)";

function one(value, marker) {
  assert.equal(value.split(marker).length,2,'Expected one '+marker);
  return value.indexOf(marker);
}
function currentBlock(source,body) {
  const begin='<!-- '+KEY+':begin -->', end='<!-- '+KEY+':end -->';
  const output=begin+'\n'+body+'\n'+end;
  if(!source.includes(begin)&&!source.includes(end))return output+'\n\n'+source;
  const start=one(source,begin), finish=one(source,end)+end.length;
  assert(start<finish-end.length,'Source facts markers are reversed');
  return source.slice(0,start)+output+source.slice(finish);
}
function validateFacts(facts) {
  assert.match(facts.releaseVersion,/^\d+\.\d+\.\d+$/);
  for(const field of ['integrated','candidateGRollback']) {
    const item=facts[field];
    for(const name of ['modelContractSha256','modelBundleSha256']) assert.match(item[name],/^[a-f0-9]{64}$/);
    assert(Number.isSafeInteger(item.fileCount)&&item.fileCount>0);
  }
  assert.match(facts.continuation.sha256,/^[a-f0-9]{64}$/);
  assert(Number.isSafeInteger(facts.continuation.fileCount)&&facts.continuation.fileCount>0);
  assert.equal(facts.continuation.normalizationId,'utf8-bomless-lf-v2');
}

export function projectHandbookBindingDocuments({handbook,markdown,installationSql,facts}) {
  validateFacts(facts);
  assert.equal(handbook.handbookVersion,facts.releaseVersion,'Version sync must precede source derivation');
  assert(Array.isArray(handbook.sections));
  assert.equal(new Set(handbook.sections.map(x=>x.id)).size,handbook.sections.length);
  const out=structuredClone(handbook);
  const section=id=>{
    const matches=out.sections.filter(x=>x.id===id); assert.equal(matches.length,1,'Missing/duplicate '+id);
    assert.equal(typeof matches[0].body,'string'); return matches[0];
  };
  const i=facts.integrated,c=facts.candidateGRollback,t=facts.continuation;
  const note='Dette er afledt kildeidentitet. Identiteten beviser ikke i sig selv PostgreSQL-kvalifikation, installation eller offentlig levering. Tidligere daterede oplysninger nedenfor er historik.';
  const authority='Autoriteten er version.json.releaseContract.modelBindings og de aktuelle genererede manifester.';
  const bindingText=(name,x,html)=>html
    ?name+': <code>modelContractSha256='+x.modelContractSha256+'</code> og <code>modelBundleSha256='+x.modelBundleSha256+'</code> over '+x.fileCount
    :name+': \`modelContractSha256='+x.modelContractSha256+'\` og \`modelBundleSha256='+x.modelBundleSha256+'\` over '+x.fileCount;
  const html='<p><strong>Afledt kildeidentitet — RavScore '+facts.releaseVersion+':</strong> '
    +bindingText('Integreret model',i,true)+' kanonisk normaliserede transitive implementeringsfiler og de deklarerede forbrugere. '
    +bindingText('Inaktiv Candidate G',c,true)+' transitive filer. '
    +'Fortsættelse: <code>continuationStateContractSha256='+t.sha256+'</code> (<code>'+t.sha256.slice(0,8)+'…</code>) over '+t.fileCount
    +' normaliserede kildefiler med <code>'+t.normalizationId+'</code>. '+authority+' '+note+'</p>';
  const continuation='<p><strong>Afledt fortsættelseskontrakt — RavScore '+facts.releaseVersion+':</strong> '
    +'<code>continuationStateContractSha256='+t.sha256+'</code> (<code>'+t.sha256.slice(0,8)+'…</code>) over '+t.fileCount
    +' normaliserede kildefiler med <code>'+t.normalizationId+'</code>. '+note+'</p>';
  const bindingSection=section('ravscore-final-bindings-4-0-320');
  bindingSection.body=currentBlock(bindingSection.body,html);
  const continuationSection=section('ravscore-checkpoint-metadata-cas-4-0-321');
  continuationSection.body=currentBlock(continuationSection.body,continuation);
  const md='## Afledt kildeidentitet — RavScore '+facts.releaseVersion+'\n\n'
    +bindingText('Integreret model',i,false)+' kanonisk normaliserede transitive implementeringsfiler og de deklarerede forbrugere.\n\n'
    +bindingText('Inaktiv Candidate G',c,false)+' transitive filer.\n\n'
    +'Fortsættelse: \`continuationStateContractSha256='+t.sha256+'\` (\`'+t.sha256.slice(0,8)+'…\`) over '+t.fileCount
    +' normaliserede kildefiler med \`'+t.normalizationId+'\`.\n\n'+authority+' '+note;
  const markdownOutput=currentBlock(markdown,md);
  const start=one(installationSql,MARKER)+MARKER.length;
  const finish=installationSql.indexOf(END,start);
  assert(finish>=start,'Missing handbook SQL payload end');
  const oldPayload=installationSql.slice(start,finish);
  const oldBook=JSON.parse(oldPayload.replaceAll("''","'"));
  assert(oldBook&&typeof oldBook==='object'&&Array.isArray(oldBook.sections),'Invalid installation handbook payload');
  const handbookOutput=JSON.stringify(out,null,2)+'\n';
  const payload=JSON.stringify(out).replaceAll("'","''");
  return {handbook:handbookOutput,markdown:markdownOutput,
    installationSql:installationSql.slice(0,start)+payload+installationSql.slice(finish)};
}

export async function readHandbookBindingFacts({root=process.cwd()}={}) {
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const pkg=await read('package.json'),version=await read('version.json');
  assert.equal(version.version,pkg.version);assert.equal(version.releaseContract?.releaseVersion,pkg.version);
  const i=await import(pathToFileURL(path.join(root,'js/core/ravscore-model-bundle.generated.js')).href);
  const c=await import(pathToFileURL(path.join(root,'scripts/rollback-assets/ravscore-model-bundle.generated.js')).href);
  const t=await import(pathToFileURL(path.join(root,'scripts/lib/ravscore-continuation-implementation-contract.mjs')).href);
  const projected=(name,module)=>{
    const binding=version.releaseContract.modelBindings[name];
    assert.equal(binding.modelContractSha256,module.GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256);
    assert.equal(binding.modelBundleSha256,module.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256);
    const files=module.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files;
    assert(Array.isArray(files)&&files.length>0);
    const key=name==='integrated'?'path':'file';
    assert(files.every(row=>typeof row[key]==='string'&&row[key].length>0&&/^[a-f0-9]{64}$/.test(row.sha256)));
    assert.equal(new Set(files.map(row=>row[key])).size,files.length);
    return {modelContractSha256:binding.modelContractSha256,modelBundleSha256:binding.modelBundleSha256,fileCount:files.length};
  };
  const facts={releaseVersion:pkg.version,integrated:projected('integrated',i),candidateGRollback:projected('candidateGRollback',c),
    continuation:{sha256:await t.ravScoreContinuationImplementationSha256({repositoryRoot:root}),
      fileCount:t.RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES.length,normalizationId:t.RAVSCORE_CONTINUATION_IMPLEMENTATION_NORMALIZATION_ID}};
  validateFacts(facts);return facts;
}

export async function synchronizeHandbookInstallationCopy({root=process.cwd(),check=false}={}) {
  const [bookSource,markdown,installationSql]=await Promise.all([BOOK,MD,INSTALL].map(file=>fs.readFile(path.join(root,file),'utf8')));
  const facts=await readHandbookBindingFacts({root});
  const out=projectHandbookBindingDocuments({handbook:JSON.parse(bookSource),markdown,installationSql,facts});
  const changed=[];
  for(const [file,before,after] of [[BOOK,bookSource,out.handbook],[MD,markdown,out.markdown],[INSTALL,installationSql,out.installationSql]]) {
    if(before!==after)changed.push(file);
  }
  if(check)assert.equal(changed.length,0,'Stale derived handbook source facts or installation copy: '+changed.join(', '));
  else for(const [file,value] of [[BOOK,out.handbook],[MD,out.markdown],[INSTALL,out.installationSql]]) await fs.writeFile(path.join(root,file),value);
  return {changed,facts};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert(process.argv.slice(2).every(arg=>arg==='--check')&&process.argv.length<=3,'Usage: node scripts/sync-handbook-installation-copy.mjs [--check]');
  await synchronizeHandbookInstallationCopy({check:process.argv.includes('--check')});
  console.log('Håndbogens afledte kildeidentitet og statiske Supabase-installationskopi er synkroniseret.');
}
