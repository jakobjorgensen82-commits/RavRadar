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
const REGISTRY_SHA256='369ea3997dfed4c1469c21e3d21323e8cdf594b5219d605843f3b477486427fa';
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
    assert.equal(sha(registryBytes),REGISTRY_SHA256,'DOMAIN_REGISTRY_BYTES');const registry=JSON.parse(registryBytes);
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
      }assert(total<=48*1024*1024);
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
    load([...new Set([...Object.keys(registry.sources),...registry.resourceFiles,...entries,
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
        }else if(!item.specifier.startsWith('./')&&!item.specifier.startsWith('../'))return full('BARE_DATA_OR_URL_IMPORT:'+file);
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
      prerequisites:registry.runtimePrerequisites,registrySha256:REGISTRY_SHA256}));
    assert.equal(git(['rev-parse','HEAD']).toString('utf8').trim(),input.expectedHead);
    return out;
  }catch(error){out.status='REFUSED';return full(/^DOMAIN_[A-Z_]+$/.test(error?.message??'')?error.message:'DOMAIN_PLAN_REFUSED');}
}
