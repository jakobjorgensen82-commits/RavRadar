// Domain planning only. ROOT review, real commands and V2 consumption are separate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';
import {scanAllSourceDependencies,dependencySourceLiterals} from './lib/source-impact-control-imports.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRY_SHA256='3970bc86fb8afd99d193507b82337c1068aa368f6d62ff728988fc21da9577f4';
const REGISTRY597_SHA256='a7ccfba2b2f631ccc358342e2c3b87e1cb1edbd54311148c94822fddaa6dbcfa';
const REGISTRY598_SHA256='e9e17a12b1ba32cd407e9a8275a19891cd945b96a3ade27c1bee28f0713e10a2';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
const relative=value=>typeof value==='string'&&/^[A-Za-z0-9_./-]+$/.test(value)&&!value.startsWith('/')
  &&!value.includes('//')&&!value.split('/').some(part=>part==='.'||part==='..');
const domainNames=['postgres','d1','historical584National','currentCandidateGAudit','controls','adminUI','sharing','documentation'];
const base=()=>({schemaVersion:1,status:'PLANNED',selection:'FULL',commands:[],
  domains:Object.fromEntries(domainNames.map(name=>[name,{status:'NOT_APPLICABLE',executed:false,commands:[]}])),
  inputDigests:{},closureSha256:'',inventorySha256:'',changedRows:0,reasonCodes:[],authority:'PLANNING_ONLY',
  baselineQualified:false,skipAuthorized:false,productionAuthority:false});
const environment=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),LANG:'C',LC_ALL:'C',
  GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
function handbookFrame(source){
  const anchor="values('handbook','",start=source.indexOf(anchor);assert(start>=0&&source.indexOf(anchor,start+1)===-1);
  let end=start+anchor.length;
  for(;end<source.length;end++)if(source[end]==="'"){if(source[end+1]==="'"){end++;continue;}break;}
  assert(source.slice(end,end+14).startsWith("'::jsonb,null)"));
  const body=source.slice(start+anchor.length,end).replaceAll("''","'");JSON.parse(body);
  return {frame:source.slice(0,start+anchor.length)+'<handbook-json>'+source.slice(end),body};
}
function sourceReferences(file,scan,index){
  const imports=[],resources=[];
  const resolve=specifier=>{
    const clean=specifier.split(/[?#]/,1)[0],target=path.posix.normalize(path.posix.join(path.posix.dirname(file),clean));
    if(!relative(target))throw Error('IMPORT_ESCAPES_SOURCE:'+file);
    const found=[target,target+'.js',target+'.mjs',target+'.json',target+'/index.js'].find(name=>index.has(name));
    if(!found)throw Error('IMPORT_SOURCE_MISSING:'+file);return found;
  };
  for(const row of scan.imports)if(row.specifier?.startsWith('./')||row.specifier?.startsWith('../'))imports.push(resolve(row.specifier));
  for(const value of dependencySourceLiterals(scan)){
    if(!/\.(?:mjs|js|json|sql|yml|py|html|css|ts|toml|md|txt)$/.test(value))continue;
    for(const candidate of [value,path.posix.normalize(path.posix.join(path.posix.dirname(file),value))])
      if(relative(candidate)&&index.has(candidate))resources.push(candidate);
  }
  return {imports:[...new Set(imports)].sort(),resources:[...new Set(resources)].sort()};
}
// The fixed597 overlay preserves the genuine594 registry as historical data.
// Its complete bytes are pinned here; callers cannot supply owners or capabilities.
function registry597(legacyBytes){
  const bytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-597.json',import.meta.url));
  assert.equal(sha(bytes),REGISTRY597_SHA256,'DOMAIN_REGISTRY_BYTES');
  const delta=JSON.parse(bytes),registry=JSON.parse(legacyBytes);
  assert.equal(delta.schemaVersion,1);assert.equal(delta.id,'CLOSED_REVIEWED_597_DOMAIN_DELTA');
  assert.equal(delta.baseRegistrySha256,REGISTRY_SHA256);
  assert.equal(delta.sourceReference.head,'45594e185f087ff02c8e72649d02cb45cf79cf16');
  assert.equal(delta.sourceReference.tree,'20fd7b1a49dbb07edf9157658ddb38bb1ec75656');
  for(const owner of delta.owners){
    assert(relative(owner.path)&&!registry.owners.some(row=>row.path===owner.path));
    registry.owners.push(owner);
  }
  for(const [file,row]of Object.entries(delta.sources)){
    assert(relative(file));
    assert.equal(registry.sources[file]?sha(JSON.stringify(registry.sources[file])):null,row.beforeDefinitionSha256);
    registry.sources[file]=row.definition;
  }
  for(const file of delta.resourceFiles){assert(relative(file)&&!registry.resourceFiles.includes(file));registry.resourceFiles.push(file);}
  return {value:registry,digest:sha(Buffer.concat([legacyBytes,bytes])),blobBudgetBytes:56*1024*1024};
}
// Additive exact598 CODE definitions over the unchanged594+597 registry.
function registry598(legacyBytes){
  const previous=registry597(legacyBytes);
  const bytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-598.json',import.meta.url));
  assert.equal(sha(bytes),REGISTRY598_SHA256,'DOMAIN_REGISTRY_BYTES');
  const delta=JSON.parse(bytes),registry=previous.value;
  assert.equal(delta.schemaVersion,1);assert.equal(delta.id,'CLOSED_REVIEWED_598_DOMAIN_DELTA');
  assert.equal(delta.baseRegistrySha256,previous.digest);
  assert.equal(delta.sourceReference.head,'bd9cf518fe798ddea45d2b835f324f6e2bea06fc');
  assert.equal(delta.sourceReference.tree,'2f71c562eea774ca03996802f83bdad7cccd43cc');
  for(const owner of delta.owners){
    assert(relative(owner.path)&&!registry.owners.some(row=>row.path===owner.path));registry.owners.push(owner);
  }
  for(const [file,row]of Object.entries(delta.sources)){
    assert(relative(file));const before=registry.sources[file];
    assert.equal(before?sha(JSON.stringify(before)):null,row.beforeDefinitionSha256);
    if(before)for(const [key,values]of Object.entries(before))for(const value of values)
      assert(row.definition[key].includes(value),'DOMAIN_PRIOR_SOURCE_BOUNDARY_REQUIRED');
    registry.sources[file]=row.definition;
  }
  for(const file of delta.resourceFiles){assert(relative(file)&&!registry.resourceFiles.includes(file));registry.resourceFiles.push(file);}
  // Only the fixed whole-source pairs reviewed in this598 overlay may extend the historical grammar.
  for(const [file,pairs]of Object.entries(delta.exactSourceTransitions)){
    assert(['.github/workflows/maintain-admin-document-history.yml','admin.html',
      'supabase/functions/_shared/rav-assistant-contract.ts','supabase/functions/ravradar-assistant/index.ts',
      'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
      'scripts/run-hosted-supabase-backup.mjs','scripts/test-supabase-database-backup-workflow.mjs',
      'js/services/forecast-share-contract.js','scripts/forecast-share/handler.mjs',
      'scripts/test-map-forecast-panel.mjs','.github/workflows/validate-pull-request.yml',
      'scripts/update-dmi-bulk.py','scripts/test-dmi-dkss-primary-mode.py',
      'scripts/test-current-operational-python-contracts.mjs','scripts/test-runner-android-sdk-reclaim.mjs',
      'service-worker.js','scripts/test-public-cold-start-4.0.303.mjs'].includes(file));
    const previousPairs=registry.exactSourceTransitions[file]??[];
    for(const pair of pairs){assert(/^[a-f0-9]{64}\/[a-f0-9]{64}$/.test(pair));assert(!previousPairs.includes(pair));previousPairs.push(pair);}
    registry.exactSourceTransitions[file]=previousPairs;
  }
  // These two existing adminUI address owners must each close the actual cache contracts.
  // This fixed598 loop cannot admit caller-supplied owner or command overrides.
  for(const file of ['admin.html','service-worker.js']){
    const matches=registry.owners.filter(row=>row.path===file);assert.equal(matches.length,1);
    const owner=matches[0];
    assert.deepEqual(owner,{path:file,domains:['adminUI'],exactSourceTransition:true,commands:[
      ['adminUI','node scripts/test-ravscore-public-data-service-binding.mjs'],
      ['adminUI','node scripts/test-admin-active-ravscore-runtime.mjs'],
      ['adminUI','node scripts/test-ravscore-public-browser-closure.mjs']]});
    for(const command of ['node scripts/test-public-cold-start-4.0.303.mjs','node scripts/test-admin-config-production-contract-4.0.94.mjs']){
      assert(!owner.commands.some(row=>row[1]===command));owner.commands.push(['adminUI',command]);
    }
  }
  return {value:registry,digest:sha(Buffer.concat([Buffer.from(previous.digest,'hex'),bytes])),blobBudgetBytes:previous.blobBudgetBytes};
}
export function planSourceDomainImpactFromGit(input){
  const out=base();
  const full=reason=>{out.selection='FULL';out.commands=[];out.reasonCodes=[reason];
    out.domains=base().domains;out.domains.postgres.status='REQUIRED';
    out.domains.historical584National.status='REQUIRED';return out;};
  try{
    assert.equal(arguments.length,1);assert(input&&Object.getPrototypeOf(input)===Object.prototype);
    assert.deepEqual(Object.keys(input).sort(),['baselineCommit','candidateCommit','expectedHead']);
    assert(Object.values(input).every(oid));
    const analysis=analyzeSourceDomainInputs(input);
    if(analysis.analysis!=='COMPLETE'){out.status='REFUSED';return full('DOMAIN_INPUT_ANALYSIS_REFUSED');}
    out.inputDigests={postgresBefore:analysis.actualPostgresInput.before.inputSha256,postgresAfter:analysis.actualPostgresInput.after.inputSha256,
      CBefore:analysis.models.C.before.bundleSha256,CAfter:analysis.models.C.after.bundleSha256,
      IBefore:analysis.models.I.before.bundleSha256,IAfter:analysis.models.I.after.bundleSha256,
      TBefore:analysis.models.T.before.implementationSha256,TAfter:analysis.models.T.after.implementationSha256};
    out.inventorySha256=analysis.completeGitDiff.rawInventorySha256;out.changedRows=analysis.completeGitDiff.changedRows;
    if(!analysis.actualPostgresInput.unchanged||!Object.values(analysis.models).every(value=>value.unchanged))
      return full('POSTGRES_OR_MODEL_INPUT_CHANGED');
    if(!out.changedRows)return full('EMPTY_DIFF_REQUIRES_NO_NEW_SHORT_PROOF');
    const registryBytes=fs.readFileSync(new URL('./lib/source-impact-domain-owners-594.json',import.meta.url));
    assert.equal(sha(registryBytes),REGISTRY_SHA256,'DOMAIN_REGISTRY_BYTES');
    const is598=analysis.profile?.id==='REVIEWED_598_DOMAIN_INPUTS_C101_I100_T12';
    const selectedRegistry=is598?registry598(registryBytes):analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12'
      ?registry597(registryBytes):{value:JSON.parse(registryBytes),digest:REGISTRY_SHA256,blobBudgetBytes:48*1024*1024};
    const registry=selectedRegistry.value,registrySha256=selectedRegistry.digest;
    const owners=new Map(registry.owners.map(row=>[row.path,row])),selected=new Set(['controls']);
    const git=(args,options={})=>execFileSync('git',['-C',ROOT,...args],{env:environment(),timeout:10000,
      maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe'],...options});
    const tree=git(['ls-tree','-rz','--full-tree',input.candidateCommit]).toString('utf8').split('\0').filter(Boolean)
      .map(line=>{const m=/^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(line);assert(m);
        return {file:m[4],mode:m[1],type:m[2],oid:m[3]};});
    const index=new Map(tree.map(row=>[row.file,row])),inventory=analysis.completeGitDiff.inventory;
    let qualification=!analysis.evidenceControls.plannerTrustChain.unchanged;
    const changes=[];
    for(const row of inventory){
      const file=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(Buffer.from(row.pathUtf8Hex,'hex'));
      if(!relative(file)||!owners.has(file))return full('UNCLASSIFIED_OWNER:'+file);
      if(!['100644','000000'].includes(row.beforeMode)||row.afterMode!=='100644')return full('OWNER_MODE_OR_DELETION:'+file);
      const owner=owners.get(file);for(const domain of owner.domains)selected.add(domain);
      if(owner.controlQualification)qualification=true;changes.push({file,row,owner});
    }
    const blobs=new Map();
    const load=ids=>{
      const wanted=[...new Set(ids)].filter(id=>!blobs.has(id));if(!wanted.length)return;
      assert(wanted.length<=4096&&wanted.every(oid));
      const meta=git(['cat-file','--batch-check'],{input:wanted.join('\n')+'\n'}).toString('ascii').trimEnd().split('\n');
      let total=0;for(let i=0;i<wanted.length;i++){
        const m=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(meta[i]);assert(m&&m[1]===wanted[i]);
        assert(Number(m[2])<=8*1024*1024);total+=Number(m[2]);
      }assert(total<=selectedRegistry.blobBudgetBytes,'DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED');
      if(is598||analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12')
        assert(total+[...blobs.values()].reduce((sum,body)=>sum+body.length,0)<=selectedRegistry.blobBudgetBytes,
          'DOMAIN_COMMITTED_BLOB_BUDGET_EXCEEDED');
      const raw=git(['cat-file','--batch'],{input:wanted.join('\n')+'\n'});let offset=0;
      for(const id of wanted){const end=raw.indexOf(10,offset),m=/^([a-f0-9]{40}) blob ([0-9]+)$/.exec(raw.subarray(offset,end).toString('ascii'));
        assert(m&&m[1]===id);const size=Number(m[2]),body=raw.subarray(end+1,end+1+size);assert.equal(raw[end+1+size],10);
        assert.equal(crypto.createHash('sha1').update('blob '+size+'\0').update(body).digest('hex'),id);
        blobs.set(id,body);offset=end+2+size;
      }assert.equal(offset,raw.length);
    };
    const commandsByDomain=Object.fromEntries(domainNames.map(name=>[name,selected.has(name)?[...(registry.commands[name]??[])]:[]]));
    commandsByDomain.controls=[...registry.commonCommands,...(qualification?registry.controlSuite:[])];
    for(const {owner}of changes)for(const [domain,command]of owner.commands??[])commandsByDomain[domain].push(command);
    const entries=[...new Set(Object.values(commandsByDomain).flat().map(command=>command.split(' ').filter(value=>value.endsWith('.mjs'))).flat())];
    const pending=[...changes.filter(row=>/\.(?:mjs|js|ts)$/.test(row.file)
      && !row.owner.exactSourceTransition).map(row=>row.file),...entries];
    const visited=new Set(),edges=[],closureRows=[];
    // All reads below are committed blobs. Current runtime hydration is not reset.
    //597 keeps every conservative resource, then loads executable sources only when
    //actually reached. Unvisited definitions were never closure members.594 is unchanged.
    const eagerSources=is598||analysis.profile?.id==='REVIEWED_597_DOMAIN_INPUTS_C101_I100_T12'?[]:Object.keys(registry.sources);
    load([...new Set([...eagerSources,...registry.resourceFiles,...entries,
      ...changes.map(row=>row.file)])].flatMap(file=>index.has(file)?[index.get(file).oid]:[]));
    const get=file=>{const row=index.get(file);if(!row||row.type!=='blob'||!['100644','100755'].includes(row.mode))throw Error('CLOSURE_SOURCE_MISSING:'+file);
      load([row.oid]);return blobs.get(row.oid);};
    for(const {file,row,owner}of changes)if(owner.exactSourceTransition){
      if(row.beforeMode!=='100644')return full('UNKNOWN_EXACT_SOURCE_TRANSITION:'+file);
      load([row.beforeOid]);const pair=sha(blobs.get(row.beforeOid))+'/'+sha(get(file));
      if(!registry.exactSourceTransitions?.[file]?.includes(pair))return full('UNKNOWN_EXACT_SOURCE_TRANSITION:'+file);
      closureRows.push({file,mode:row.afterMode,blob:row.afterOid,sha256:sha(get(file))});
    }
    while(pending.length){const file=pending.pop();if(visited.has(file))continue;visited.add(file);
      const known=registry.sources[file];if(!known)return full('UNKNOWN_IMPORT_OR_EXECUTABLE:'+file);
      const bytes=get(file),scan=scanAllSourceDependencies(new TextDecoder('utf8',{fatal:true}).decode(bytes));
      for(const item of scan.imports){
        if(item.specifier===null){
          const boundary=scan.computedImportBoundaries.find(row=>row.expression===item.expression);
          if(!known.computedBoundaries.includes(sha(JSON.stringify(boundary))))return full('UNKNOWN_COMPUTED_IMPORT:'+file);
        }else if(item.specifier.startsWith('node:')){
          if(!known.nodeImports.includes(item.specifier))return full('UNDECLARED_NODE_IMPORT:'+file);
        }else if(!item.specifier.startsWith('./')&&!item.specifier.startsWith('../')){
          // Only the unchanged type declaration in this exact reviewed Edge body is permitted.
          if(!(is598&&file==='supabase/functions/ravradar-assistant/index.ts'
            &&sha(bytes)==='8c8cb9a9448e06c172525c1cea017c43d7ea34bf08dc921538e128cba089511e'
            &&item.kind==='static'&&item.specifier==='jsr:@supabase/functions-js/edge-runtime.d.ts'))
            return full('BARE_DATA_OR_URL_IMPORT:'+file);
        }
      }
      for(const surface of scan.dependencySurfaces)if(!known.dependencySurfaces.includes(sha(JSON.stringify(surface))))
        return full('UNKNOWN_READ_OR_SUBPROCESS_SURFACE:'+file);
      for(const surface of scan.bindingSurfaces)if(!known.bindingSurfaces.includes(sha(JSON.stringify(surface))))
        return full('UNKNOWN_SENSITIVE_BINDING_OR_REFLECTIVE_SURFACE:'+file);
      const references=sourceReferences(file,scan,index);
      for(const imported of references.imports){if(!known.imports.includes(imported))return full('UNKNOWN_IMPORT_EDGE:'+file);
        pending.push(imported);edges.push([file,'import',imported]);}
      for(const resource of references.resources){if(!known.resources.includes(resource))return full('UNKNOWN_READ_EDGE:'+file);
        const row=index.get(resource),body=get(resource);closureRows.push({file:resource,mode:row.mode,blob:row.oid,sha256:sha(body)});
        edges.push([file,'read',resource]);}
      const row=index.get(file);closureRows.push({file,mode:row.mode,blob:row.oid,sha256:sha(bytes)});
    }
    // Keep the already reviewed resource inventory conservatively bound even
    // when a particular current branch has no literal read edge to a member.
    for(const file of registry.resourceFiles){const row=index.get(file);
      closureRows.push(row?{file,mode:row.mode,blob:row.oid,sha256:sha(get(file))}:{file,present:false});}
    for(const {file,row,owner}of changes){
      if(owner.handbookPayload){
        load([row.beforeOid]);const before=handbookFrame(blobs.get(row.beforeOid).toString('utf8')),after=handbookFrame(get(file).toString('utf8'));
        if(before.frame!==after.frame)return full('INSTALL_DDL_OR_UNKNOWN_SQL_CHANGED');
        if(after.body!==JSON.stringify(JSON.parse(get('docs/handbook/content.json'))))return full('INSTALL_HANDBOOK_PAYLOAD_MISMATCH');
      }
      if(owner.auditMetadataOnly){
        load([row.beforeOid]);const pair=sha(blobs.get(row.beforeOid))+'/'+sha(get(file));
        if(!registry.auditMetadataTransitions[file].includes(pair))return full('CURRENT_AUDIT_POSITIVE_OR_UNKNOWN_CHANGE');
      }
    }
    const global=[...new Set(Object.values(commandsByDomain).flat())];
    const reach=start=>{const seen=new Set(),queue=[start];while(queue.length){const at=queue.pop();if(seen.has(at))continue;seen.add(at);
      for(const [from,kind,to]of edges)if(from===at&&kind==='import')queue.push(to);}return seen;};
    const replacement=new Map();
    for(const [parent,children]of Object.entries(registry.normalParents))if(global.includes(parent)){
      const reached=reach(parent.split(' ').at(-1));for(const child of children)if(global.includes(child)&&reached.has(child.split(' ').at(-1)))replacement.set(child,parent);
    }
    for(const domain of domainNames){
      const commands=[...new Set(commandsByDomain[domain].map(command=>replacement.get(command)??command))];
      out.domains[domain]={status:selected.has(domain)?'SELECTED':'NOT_APPLICABLE',executed:false,commands};
    }
    out.commands=[...new Set(Object.values(out.domains).flatMap(domain=>domain.commands))];
    if(out.commands.some(command=>!/^node(?: --[A-Za-z0-9-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+$/.test(command)))return full('UNSUPPORTED_NORMAL_COMMAND');
    out.selection=qualification?'CONTROL_QUALIFICATION_REQUIRED':'TARGETED_DOMAINS';
    out.reasonCodes=qualification?['UNCHANGED_POSTGRES_AND_MODEL_INPUTS','CONTROL_QUALIFICATION_REQUIRED']:['UNCHANGED_POSTGRES_AND_MODEL_INPUTS','CLOSED_REGISTERED_DOMAIN_IMPACT'];
    const uniqueRows=[...new Map(closureRows.map(row=>[row.file,row])).values()].sort((a,b)=>a.file.localeCompare(b.file,'en'));
    out.closureSha256=sha(JSON.stringify({rows:uniqueRows,edges:[...new Set(edges.map(JSON.stringify))].sort(),
      prerequisites:is598&&out.commands.includes('node --test scripts/test-current-operational-python-contracts.mjs')
        ?{...registry.runtimePrerequisites,pythonStdlibOnly:false,thirdPartyImports:['requests','requests.adapters','urllib3.util.retry','eccodes'],
          pythonRequirements:['requirements-dmi.txt'],expectedEcCodesApiVersion:'2.48.2',pipInstallation:true}
        :registry.runtimePrerequisites,registrySha256}));
    assert.equal(git(['rev-parse','HEAD']).toString('utf8').trim(),input.expectedHead);
    return out;
  }catch(error){out.status='REFUSED';return full(/^DOMAIN_[A-Z_]+$/.test(error?.message??'')?error.message:'DOMAIN_PLAN_REFUSED');}
}
