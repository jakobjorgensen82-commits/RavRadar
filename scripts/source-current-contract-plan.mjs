// Normal plan: aktuelle kontrakter for de faktisk ændrede områder.
// Planlægning er hverken en FULL-baseline, en testkvittering eller deployautoritet.
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const freeze=value=>{for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return Object.freeze(value);};
const INSTALLER='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
const WEATHER_BUILD='.github/workflows/reusable-weather-build.yml';

// Rækkefølgen er også den normale kommandorækkefølge. Ingen imports-/ressourcelexer.
export const CURRENT_CONTRACT_COMMANDS=freeze({
  core:[
    'node scripts/validate-release-version.mjs',
    'node scripts/test-module-version-closure-4.0.87.mjs',
    'node scripts/test-security-hardening-4.0.284.mjs',
  ],
  pages:[
    'node --test scripts/test-ordinary-pages-immediate-retry.mjs',
    'node scripts/test-pages-generation-and-reentry.mjs',
    'node scripts/test-ravscore-operational-pages-recovery.mjs',
    'node --test scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  pagesArtifact:[
    'node --test scripts/test-pages-artifact-metadata.mjs',
  ],
  publicUI:[
    'node scripts/test-ravscore-public-data-service-binding.mjs',
    'node scripts/test-ravscore-public-browser-closure.mjs',
    'node scripts/test-map-forecast-timeline.mjs',
    'node --test scripts/test-map-forecast-panel.mjs scripts/test-map-timeline-generation.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  ],
  adminUI:[
    'node scripts/test-admin-initial-dashboard-4.0.77.mjs',
    'node scripts/test-admin-active-ravscore-runtime.mjs',
    'node scripts/test-admin-config-production-contract-4.0.94.mjs',
    'node scripts/test-private-visitor-statistics-4.0.215.mjs',
    'node scripts/test-water-station-active-routing-display-4.0.102.mjs',
  ],
  documentation:[
    'node scripts/validate-rdks.mjs',
    'node scripts/test-handbook-plain-language-4.0.70.mjs',
    'node scripts/test-handbook-review-archive-4.0.91.mjs',
    'node scripts/test-protected-handbook-merge-4.0.270.mjs',
  ],
  sourceControls:[
    'node --test scripts/test-source-current-contracts.mjs',
  ],
  // Aktuel faktisk kildegate + arkivkontrakt. Det er ikke et løfte om at
  // samtlige historiske whole-oracles er udført.
  compatibility:[
    'node scripts/source-critical-gate.mjs',
    'node --test scripts/test-archived-weather-restart-workflow.mjs',
  ],
  historicalTests:[],
});
const COMMANDS=CURRENT_CONTRACT_COMMANDS;

// Stier udpeger ansvar; indholdet godkendes først af de faktiske kommandoer.
// Nye/ukendte produktstier falder ikke automatisk ind under et bredt præfiks.
const PATH_AREAS=freeze({
  pages:[
    '.github/actions/deploy-ravradar-pages/action.yml',
    '.github/workflows/run-current-weather-once.yml',
    '.github/workflows/reusable-pages-deploy.yml',
    '.github/workflows/reusable-operational-reentry.yml',
    '.github/workflows/reusable-weather-build.yml',
    'scripts/deploy-ordinary-pages-with-immediate-retry.mjs',
    'scripts/github-pages-attempt-evidence.mjs',
    'scripts/protected-operational-reentry-evidence.mjs',
    'scripts/ravscore-operational-pages-recovery.mjs',
    'scripts/lib/pages-per-artifact-identity.mjs',
    'scripts/lib/pages-sealed-retry-decision.mjs',
    'scripts/lib/publish-sealed-pages-with-recovery.mjs',
    'scripts/lib/run-sealed-pages-deployment.mjs',
    'scripts/test-ordinary-pages-immediate-retry.mjs',
    'scripts/test-current-pages-workflow-wiring.mjs',
    'scripts/test-pages-generation-and-reentry.mjs',
    'scripts/test-ravscore-operational-pages-recovery.mjs',
    'scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  pagesArtifact:[
    '.github/workflows/reusable-weather-build.yml',
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/read-pages-artifact-metadata.mjs',
    'scripts/test-pages-artifact-metadata.mjs',
  ],
  publicUI:[
    'app.js','bootstrap.js','index.html','service-worker.js',
    'scripts/test-ravscore-public-data-service-binding.mjs',
    'scripts/test-ravscore-public-browser-closure.mjs',
    'scripts/test-map-forecast-timeline.mjs',
    'scripts/test-map-forecast-panel.mjs',
    'scripts/test-map-timeline-generation.mjs',
    'scripts/test-public-json-reader-bridge.mjs',
    'scripts/test-public-cold-start-4.0.303.mjs',
    'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  ],
  adminUI:[
    'admin.html','js/ui/admin-dashboard.js',
    'js/services/admin-document-store.js','js/services/visitor-report-service.js',
    'scripts/test-admin-initial-dashboard-4.0.77.mjs',
    'scripts/test-admin-active-ravscore-runtime.mjs',
    'scripts/test-admin-config-production-contract-4.0.94.mjs',
    'scripts/test-private-visitor-statistics-4.0.215.mjs',
    'scripts/test-water-station-active-routing-display-4.0.102.mjs',
  ],
  documentation:[
    'AGENTS.md','CHANGELOG.md','HANDBOOK-RAVRADAR.md','docs/handbook/content.json',INSTALLER,
    'scripts/validate-rdks.mjs','scripts/test-handbook-plain-language-4.0.70.mjs',
    'scripts/test-handbook-review-archive-4.0.91.mjs','scripts/test-protected-handbook-merge-4.0.270.mjs',
  ],
  sourceControls:[
    '.github/workflows/validate-pull-request.yml',
    'scripts/source-current-contract-plan.mjs',
    'scripts/source-current-contract-receipt.mjs',
    'scripts/test-source-current-contracts.mjs',
    'scripts/source-targeted-producer.mjs','scripts/test-source-targeted-producer.mjs',
    'scripts/source-targeted-receipt.mjs','scripts/test-source-targeted-receipt.mjs',
    'scripts/source-targeted-consumer.mjs','scripts/test-source-targeted-consumer.mjs',
    'scripts/test-source-targeted-domain-integration.mjs','scripts/weather-source-gate.mjs',
    'scripts/validate-release-version.mjs','scripts/test-module-version-closure-4.0.87.mjs',
    'scripts/test-security-hardening-4.0.284.mjs',
  ],
  compatibility:[
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/lib/archived-production-gate-review.mjs',
    'scripts/lib/completed-private-runtime-workflow-review.mjs',
    'scripts/lib/native-original-continuity-workflow-review.mjs',
  ],
  // Disse kendte historiske/metakontroller giver ingen produktadmission i V3.
  // Deres ændring kræver stadig en uafhængig kontrolgennemgang.
  historicalTests:[
    'scripts/lib/pages-closure-historical-test-input.mjs',
    'scripts/test-account-statistics-assistant-callers.mjs',
    'scripts/test-completed-private-runtime-admission.mjs',
    'scripts/test-completed-private-runtime-workflow-inverse.mjs',
    'scripts/test-ordinary-completed-stage-source.mjs',
    'scripts/test-ravscore-integrated-generator.mjs',
    'scripts/test-reconcile-private-runtime-checkpoint.mjs',
    'scripts/test-reusable-production-workflows.mjs',
    'scripts/test-reusable-production-workflow-cases.mjs',
    'scripts/test-source-validation-once.mjs',
    'scripts/test-weather-acquisition-workflows.mjs',
    'scripts/test-weather-component-progress-workflow.mjs',
    'scripts/test-weather-state-epoch-workflow.mjs',
    'scripts/test-workflow-validation-order-4.0.108.mjs',
    'scripts/source-impact-domain-plan.mjs',
    'scripts/test-source-impact-domain-plan.mjs',
    'scripts/lib/source-impact-domain-owners-594.json',
    'scripts/lib/source-impact-domain-owners-597.json',
    'scripts/lib/source-impact-domain-owners-598.json',
  ],
});
const sourceControlPaths=new Set(PATH_AREAS.sourceControls);
const historicalPaths=new Set(PATH_AREAS.historicalTests);
const pathAreas=new Map();
for(const [area,files]of Object.entries(PATH_AREAS))for(const file of files){
  if(!pathAreas.has(file))pathAreas.set(file,[]);pathAreas.get(file).push(area);
}

function publicDigests(analysis){
  return {
    postgresBefore:analysis.actualPostgresInput.before.inputSha256,
    postgresAfter:analysis.actualPostgresInput.after.inputSha256,
    CBefore:analysis.models.C.before.bundleSha256,CAfter:analysis.models.C.after.bundleSha256,
    IBefore:analysis.models.I.before.bundleSha256,IAfter:analysis.models.I.after.bundleSha256,
    TBefore:analysis.models.T.before.implementationSha256,TAfter:analysis.models.T.after.implementationSha256,
  };
}

// INSTALL-filen indeholder både DDL og håndbog. Kun en faktisk håndbogsændring
// må få docs-ruten. Hver sides payload matches mod dens EGEN Git-håndbog;
// hele resten sammenlignes. Ingen gamle eller nye godkendte blobpar.
function readCommittedText(ref,file){
  const env={...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
    GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'};
  const read=(ref,file)=>{
    const raw=execFileSync('git',['-C',ROOT,'cat-file','blob',ref+':'+file],
      {env,timeout:10000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']});
    assert(raw.length>0&&raw.length<=4*1024*1024);
    return new TextDecoder('utf-8',{fatal:true}).decode(raw);
  };
  return read(ref,file);
}

function installerIsHandbookOnly(input){
  const project=ref=>{
    const sql=readCommittedText(ref,INSTALLER),book=JSON.parse(readCommittedText(ref,'docs/handbook/content.json'));
    const statement="insert into public.admin_documents(document_key,payload,updated_by) values('handbook','"
      +JSON.stringify(book).replaceAll("'","''")+"'::jsonb,null)";
    const parts=sql.split(statement);assert.equal(parts.length,2);
    return parts[0]+'<CURRENT_SOURCE_HANDBOOK_INSERT>'+parts[1];
  };
  return project(input.baselineCommit)===project(input.candidateCommit);
}

// Det brede vejrworkflow er ikke en Pages-ejendom. Denne ene aktuelle
// ændringsflade er to navngivne trins GH_TOKEN-felt; hele resten bevares.
// Prædikatet kan prøves på syntetiske strenge, men giver ingen gateautoritet.
export function isPagesOnlyWeatherBuildChange(before,after){
  try{
    const project=(source,requireToken)=>{
      assert.equal(typeof source,'string');assert(Buffer.byteLength(source)<=4*1024*1024);
      assert(!source.includes('\r'));
      const unique=pattern=>{const found=[...source.matchAll(pattern)];assert.equal(found.length,1);return found[0].index;};
      const jobs=unique(/^jobs:\n/gm);
      const job=unique(/^  build-and-prepare:\n/gm);assert(job>jobs);
      const following=source.slice(job+'  build-and-prepare:\n'.length).search(/^  [A-Za-z0-9_-]+:\n/m);
      const jobEnd=following<0?source.length:job+'  build-and-prepare:\n'.length+following;
      const steps=unique(/^    steps:\n/gm);assert(steps>job&&steps<jobEnd);
      const edits=[],token='          GH_TOKEN: ${{ github.token }}\n';
      for(const name of [
        'Current-grid pre-activation - Backfill the exact active source into durable protected evidence',
        'Preserve durable incomplete current-grid publication before any Edge write',
      ]){
        const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const at=unique(new RegExp('^      - name: '+escaped+'\\n','gm'));
        assert(at>steps&&at<jobEnd);
        const next=source.slice(at+1).search(/^      - /m);
        const end=Math.min(next<0?jobEnd:at+1+next,jobEnd),step=source.slice(at,end);
        const envs=[...step.matchAll(/^        env:\n/gm)];assert.equal(envs.length,1);
        const envStart=envs[0].index+'        env:\n'.length;
        const field=step.slice(envStart).search(/^        \S/m);
        const env=step.slice(envStart,field<0?step.length:envStart+field);
        const lines=env.split('\n').filter(line=>line.trim());
        assert(lines.every(line=>/^          [A-Z_][A-Z0-9_]*: [^\r\n]+$/.test(line)));
        const tokens=lines.filter(line=>/^          GH_TOKEN:/.test(line));
        assert(tokens.length<2&&(!requireToken||tokens.length===1));
        if(tokens.length){
          assert.equal(tokens[0]+'\n',token);
          const offset=env.indexOf(token);assert(offset>=0&&env.indexOf(token,offset+1)<0);
          edits.push({offset:at+envStart+offset,length:token.length});
        }
      }
      let result=source;
      for(const edit of edits.sort((a,b)=>b.offset-a.offset))
        result=result.slice(0,edit.offset)+result.slice(edit.offset+edit.length);
      return result;
    };
    return project(before,false)===project(after,true);
  }catch{return false;}
}

export function planSourceCurrentContractsFromGit(input){
  const out={schemaVersion:1,status:'PLANNED',selection:'CURRENT_CONTRACTS',commands:[],areas:{},
    resultScope:'CURRENT_CONTRACT_RESULTS_ONLY',historicalCompatibilityExecuted:false,
    controlQualificationRequired:false,requiredQualifications:[],reasonCodes:[],
    authority:'PLANNING_ONLY',baselineQualified:false,skipAuthorized:false,productionAuthority:false};
  const refuse=(reason,required=['FULL_SOURCE'])=>{
    out.status='REFUSED';out.selection='FULL';out.commands=[];out.areas={};
    out.reasonCodes=[reason];out.requiredQualifications=required;return freeze(out);
  };
  try{
    assert.equal(arguments.length,1);
    const analysis=analyzeSourceDomainInputs(input);
    if(analysis.analysis!=='COMPLETE')return refuse('CURRENT_INPUT_ANALYSIS_INCOMPLETE');
    out.identity=analysis.identity;out.inputProfile=analysis.profile;out.inputDigests=publicDigests(analysis);
    out.rawInventorySha256=analysis.completeGitDiff.rawInventorySha256;
    out.inventorySha256=out.rawInventorySha256;out.changedRows=analysis.completeGitDiff.changedRows;
    out.protectedInputs={postgresUnchanged:analysis.actualPostgresInput.unchanged,
      CUnchanged:analysis.models.C.unchanged,IUnchanged:analysis.models.I.unchanged,TUnchanged:analysis.models.T.unchanged};
    const required=[];
    if(!analysis.actualPostgresInput.unchanged)required.push('ACTUAL_POSTGRES');
    for(const family of ['C','I','T'])if(!analysis.models[family].unchanged)required.push('ACTUAL_MODEL_'+family);
    if(required.length)return refuse('CURRENT_PROTECTED_INPUT_CHANGED',required);
    if(!out.changedRows)return refuse('CURRENT_EMPTY_DIFF_REQUIRES_NO_NEW_SHORT_PROOF');
    const selected=new Map([['core',[]]]),unknown=[];
    for(const row of analysis.completeGitDiff.inventory){
      const bytes=Buffer.from(row.pathUtf8Hex,'hex');
      const file=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      assert(Buffer.from(file).equals(bytes)&&/^[A-Za-z0-9_.\/-]+$/.test(file)
        &&!file.startsWith('/')&&!file.includes('//')&&!file.split('/').some(part=>part==='.'||part==='..'));
      if(!['A','M','D'].includes(row.status)
        ||![row.beforeMode,row.afterMode].every(mode=>['000000','100644','100755'].includes(mode)))
        return refuse('CURRENT_UNSUPPORTED_DIFF_ENTRY');
      // Den gamle eksekveringsform genkender endnu kun to eksakte PR-YAML-former.
      // En ændring her kræver derfor faktisk FULL-kvalifikation i denne levering.
      if(file==='.github/workflows/validate-pull-request.yml')
        return refuse('CURRENT_VALIDATION_WORKFLOW_REQUIRES_FULL');
      const areas=pathAreas.get(file)??(/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(file)?['documentation']:null);
      if(!areas){unknown.push(file);continue;}
      for(const area of areas){if(!selected.has(area))selected.set(area,[]);selected.get(area).push(file);}
      if(sourceControlPaths.has(file)||historicalPaths.has(file)||areas.includes('compatibility')||file.startsWith('scripts/test-'))
        out.controlQualificationRequired=true;
    }
    if(unknown.length){out.unclassifiedPaths=unknown.sort();return refuse('CURRENT_UNCLASSIFIED_PATH');}
    if(analysis.completeGitDiff.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===WEATHER_BUILD)){
      const before=readCommittedText(input.baselineCommit,WEATHER_BUILD);
      const after=readCommittedText(input.candidateCommit,WEATHER_BUILD);
      if(!isPagesOnlyWeatherBuildChange(before,after))
        return refuse('CURRENT_WEATHER_BUILD_CHANGE_EXCEEDS_PAGES',['WEATHER_BUILD_CONTRACTS']);
    }
    if(analysis.completeGitDiff.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===INSTALLER)
      &&!installerIsHandbookOnly(input))return refuse('CURRENT_INSTALLER_CHANGE_EXCEEDS_HANDBOOK',['INSTALLATION_SQL']);
    // Kendte gamle kontrolfiler kan ændres uden at være V3-producenter. Deres
    // kontrolgennemgang er stadig obligatorisk, men gamle resultater arves ikke.
    if(!analysis.evidenceControls.native.unchanged||!analysis.evidenceControls.setup.unchanged
      ||!analysis.evidenceControls.plannerTrustChain.unchanged)out.controlQualificationRequired=true;
    for(const area of Object.keys(COMMANDS))if(selected.has(area))out.areas[area]={
      status:area==='historicalTests'?'NOT_EXECUTED':'SELECTED',executed:false,
      commands:[...COMMANDS[area]],changedPaths:[...new Set(selected.get(area))].sort()};
    out.commands=[...new Set(Object.values(out.areas).flatMap(area=>area.commands))];
    assert(out.commands.length>0&&out.commands.every(command=>/^node(?: --[a-z-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+$/.test(command)));
    out.reasonCodes=['CURRENT_SCOPES_CLASSIFIED','UNCHANGED_ACTUAL_POSTGRES_AND_MODELS'];
    if(out.controlQualificationRequired)out.reasonCodes.push('INDEPENDENT_CONTROL_REVIEW_REQUIRED');
    return freeze(out);
  }catch{return refuse('CURRENT_PLAN_REFUSED');}
}
