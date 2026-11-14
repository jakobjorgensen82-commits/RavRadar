// Normal plan: aktuelle kontrakter for de faktisk ændrede områder.
// Planlægning er hverken en FULL-baseline, en testkvittering eller deployautoritet.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const freeze=value=>{for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return Object.freeze(value);};
const INSTALLER='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
const WEATHER_BUILD='.github/workflows/reusable-weather-build.yml';
const LOCAL_RESTORE_FIXTURE='scripts/test-supabase-cli-local-restore.mjs';
const LOCAL_RESTORE_SELF_TEST='node '+LOCAL_RESTORE_FIXTURE+' --self-test';
const LOCAL_RESTORE_WORKFLOW='.github/workflows/verify-supabase-cli-local-restore.yml';
// Existing qualified security frame, not a per-head fixture-body fingerprint.
const LOCAL_RESTORE_IMPORTS='\nconst P=Object.freeze(';
const LOCAL_RESTORE_DISPATCH='if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){';
const LOCAL_RESTORE_IMPORTS_SHA256='dd05a1d036c7d9afff9ae2ba4c0511dff199ad4faf5baab258b2a17b0cd728d4';
const LOCAL_RESTORE_DISPATCH_SHA256='2e0d348293d622790375df6457726e0af04d92c9e23aedbac42033aa5049443c';

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
    'node scripts/test-ravscore-operational-pages-deployment.mjs',
    'node --test scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  workflowSupport:[
    'node --test scripts/test-current-pages-workflow-wiring.mjs',
  ],
  pagesArtifact:[
    'node --test scripts/test-pages-artifact-metadata.mjs',
  ],
  assistantEdge:[
    'node scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs',
    'node scripts/test-fixed-assistant-failure-log-20261101.mjs',
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
  currentInstalledCodeOnly:[
    'node --test scripts/test-native-original-continuity-callers.mjs',
  ],
  adminHistory:[
    'node --test scripts/test-admin-document-history-workflow.mjs',
  ],
  backupRestore:[
    LOCAL_RESTORE_SELF_TEST,
    'node --test scripts/test-archive-supabase-database-backup.mjs',
    'node --test scripts/test-supabase-database-backup-workflow.mjs',
    'node --test scripts/test-supabase-backup-lifecycle.mjs',
  ],
  mailOwnerProbe:[
    'node --test scripts/test-owner-notice-probe-ci.mjs',
  ],
  dmiBudget:[
    'node scripts/test-dmi-budget-rotation-4.0.189.mjs',
  ],
  dmiCollectionRecovery:[
    'node --test scripts/test-current-operational-python-contracts.mjs',
  ],
  weatherScalarPlanning:[
    'node --test scripts/test-weather-component-normal-wireup.mjs',
  ],
  // Aktuel faktisk kildegate + arkivkontrakt. Det er ikke et løfte om at
  // samtlige historiske whole-oracles er udført.
  compatibility:[
    'node scripts/source-critical-gate.mjs',
    'node --test scripts/test-archived-weather-restart-workflow.mjs',
  ],
  actionVersions:[
    'node scripts/test-github-action-versions.mjs',
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
    'scripts/test-ravscore-operational-pages-deployment.mjs',
    'scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  workflowSupport:[
    'scripts/write-support-run-metadata.mjs',
  ],
  pagesArtifact:[
    '.github/workflows/reusable-weather-build.yml',
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/read-pages-artifact-metadata.mjs',
    'scripts/test-pages-artifact-metadata.mjs',
  ],
  assistantEdge:[
    'supabase/functions/ravradar-assistant/index.ts',
    'supabase/functions/_shared/rav-assistant-contract.ts',
    'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
    'scripts/test-fixed-assistant-failure-log-20261101.mjs',
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
    'scripts/sync-handbook-installation-copy.mjs',
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
  currentInstalledCodeOnly:[
    'scripts/select-native-original-continuity-code-only-source.mjs',
    'scripts/test-native-original-continuity-callers.mjs',
  ],
  compatibility:[
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/lib/archived-production-gate-review.mjs',
    'scripts/lib/completed-private-runtime-workflow-review.mjs',
    'scripts/lib/native-original-continuity-workflow-review.mjs',
  ],
  adminHistory:[
    '.github/workflows/run-current-weather-once.yml',
    '.github/workflows/maintain-admin-document-history.yml',
    'scripts/test-admin-document-history-workflow.mjs',
  ],
  backupRestore:[
    '.github/workflows/maintain-admin-document-history.yml',
    'scripts/supabase-backup-lifecycle.mjs',
    'scripts/run-autonomous-supabase-backup.mjs',
    'scripts/test-supabase-backup-lifecycle.mjs',
    '.github/workflows/backup-supabase-database.yml',
    LOCAL_RESTORE_WORKFLOW,
    'scripts/run-hosted-supabase-backup.mjs',
    'scripts/test-supabase-database-backup-workflow.mjs',
    LOCAL_RESTORE_FIXTURE,
    'scripts/seal-supabase-database-export.mjs',
    'scripts/archive-supabase-database-backup.mjs',
    'scripts/test-archive-supabase-database-backup.mjs',
  ],
  mailOwnerProbe:[
    '.github/workflows/test-owner-notice-mail.yml',
    'scripts/owner-notice-probe-ci.mjs',
    'scripts/test-owner-notice-probe-ci.mjs',
    'scripts/fixtures/owner-notice-probe/index.ts',
    'scripts/fixtures/owner-notice-probe/inactivity-notice-mail.mjs',
    'scripts/fixtures/owner-notice-probe/owner-notice-probe.mjs',
    'scripts/fixtures/owner-notice-probe/owner-notice-probe-invoke.mjs',
    'scripts/fixtures/owner-notice-probe/reservation.mjs',
    'scripts/fixtures/owner-notice-probe/hosted-owner-adapter-v1/hosted-owner-notice-probe.mjs',
  ],
  dmiBudget:[
    'scripts/plan-dmi-recovery.py','scripts/lib/dmi_adaptive_recovery.py',
    'scripts/run-dmi-bulk-supervised.py','scripts/update-dmi-bulk.py',
    'scripts/test-plan-dmi-recovery.py','scripts/test-dmi-budget-rotation-4.0.189.mjs',
  ],
  weatherScalarPlanning:[
    'scripts/lib/weather-component-runtime.mjs',
    'scripts/test-weather-component-normal-wireup.mjs',
  ],
  // Disse kendte historiske/metakontroller giver ingen produktadmission i V3.
  // Deres ændring kræver stadig en uafhængig kontrolgennemgang.
  actionVersions:[
    '.github/workflows/apply-weather-model-binding-only.yml',
    '.github/workflows/audit-saved-weather-inputs.yml',
    '.github/workflows/reusable-operational-reentry.yml',
    'scripts/test-github-action-versions.mjs',
  ],
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
// The same actual owner/target catalog serves current CI and historical input admission.
// This is only a lookup; it does not run a producer, read Git or qualify a receipt.
export function currentWorkflowTargets(relative){
  assert.equal(arguments.length,1);
  if(typeof relative!=='string'||!/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(relative))return null;
  const areas=pathAreas.get(relative);
  if(!areas?.length||areas.some(area=>!COMMANDS[area]?.length))return null;
  return freeze({path:relative,owners:areas.map(area=>({area,commands:[...COMMANDS[area]]}))});
}
const PAGES_DEPLOYMENT_COMMAND='node scripts/test-ravscore-operational-pages-deployment.mjs';
const PAGES_OWNER_COMPLETION_COMMAND=PAGES_DEPLOYMENT_COMMAND+' --owner-completion-only';
const PAGES_OWNER_HELPERS=new Set(['scripts/github-pages-attempt-evidence.mjs',
  'scripts/protected-operational-reentry-evidence.mjs']);
const PAGES_FULLY_EXECUTED_TESTS=new Set(COMMANDS.pages.filter(command=>command!==PAGES_DEPLOYMENT_COMMAND)
  .flatMap(command=>command.split(' ').filter(file=>file.endsWith('.mjs'))));
const PAGES_SCOPE_CONTROLS=new Set(['scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs']);
const PAGES_TRANSPORT_INPUTS=new Set(['scripts/lib/run-sealed-pages-deployment.mjs',
  'scripts/test-ordinary-pages-immediate-retry.mjs']);
const historicalPaths=new Set(PATH_AREAS.historicalTests);
const pathAreas=new Map();
for(const [area,files]of Object.entries(PATH_AREAS))for(const file of files){
  if(!pathAreas.has(file))pathAreas.set(file,[]);pathAreas.get(file).push(area);
}


// Datavalg alene. Den normale Gitplan validerer fortsat hele inventaret,
// beskyttede input og installerens DDL, foer kommandoerne bruges.
export function pagesContractCommandsForChangedInputs(changes){
  const regular=row=>row.status==='M'&&row.beforeMode==='100644'&&row.afterMode==='100644';
  if(!Array.isArray(changes)||!changes.length
    ||changes.some(row=>!row||typeof row.path!=='string')
    ||new Set(changes.map(row=>row.path)).size!==changes.length)return COMMANDS.pages;
  if(changes.some(row=>PAGES_TRANSPORT_INPUTS.has(row.path))){
    const documentation=row=>(pathAreas.get(row.path)?.every(area=>area==='documentation')
      &&!row.path.endsWith('.mjs'))||/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(row.path);
    if(changes.every(row=>regular(row)&&(PAGES_TRANSPORT_INPUTS.has(row.path)
      ||PAGES_SCOPE_CONTROLS.has(row.path)||documentation(row))))
      return freeze(COMMANDS.pages.filter(command=>command!==PAGES_DEPLOYMENT_COMMAND));
    return COMMANDS.pages;
  }
  if(!changes.some(row=>PAGES_OWNER_HELPERS.has(row.path)&&regular(row)))return COMMANDS.pages;
  for(const row of changes){
    if(PAGES_OWNER_HELPERS.has(row.path)||PAGES_FULLY_EXECUTED_TESTS.has(row.path)||PAGES_SCOPE_CONTROLS.has(row.path)){
      if(!regular(row))return COMMANDS.pages;
    }else if(!(pathAreas.get(row.path)?.every(area=>area==='documentation')
      ||/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(row.path)))return COMMANDS.pages;
  }
  return freeze(COMMANDS.pages.map(command=>command===PAGES_DEPLOYMENT_COMMAND?PAGES_OWNER_COMPLETION_COMMAND:command));
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
function readCommittedText(ref,file,regular=false){
  const env={...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
    GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'};
  const read=(ref,file)=>{
    if(regular){
      const entry=execFileSync('git',['-C',ROOT,'ls-tree','-z',ref,'--',file],
        {env,timeout:10000,maxBuffer:262144,stdio:['pipe','pipe','pipe']}).toString('utf8');
      assert(Buffer.byteLength(entry)<=4096,'Bounded restore Git entry required');
      const match=/^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(entry);
      assert(match&&match[2]===file,'Existing regular restore input required');
    }
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


// Diagnostic support ownership only. Remove the two exact named steps on each
// side and preserve every other byte. The candidate is one fixed metadata CLI;
// its changed source/control still requires independent normal qualification.
export function isSupportOnlyWeatherBuildChange(before, after) {
  try {
    assert(typeof before === 'string' && typeof after === 'string' && before !== after);
    const take = source => {
      assert(!source.includes('\r') && Buffer.byteLength(source) <= 4 * 1024 * 1024);
      const build = '      - name: Build RavRadar support package\n';
      const upload = '      - name: Upload RavRadar support package\n';
      assert.equal(source.split(build).length, 2); assert.equal(source.split(upload).length, 2);
      const start = source.indexOf(build), middle = source.indexOf(upload);
      assert(start > source.indexOf('    steps:\n') && middle > start);
      assert.equal(source.indexOf('\n      - ', start + 1) + 1, middle);
      const next = source.indexOf('\n      - ', middle + 1);
      assert(next > middle);
      return { build: source.slice(start, middle), upload: source.slice(middle, next + 1),
        rest: source.slice(0, start) + source.slice(next + 1) };
    };
    const a = take(before), b = take(after);
    assert.equal(a.rest, b.rest); assert.equal(a.upload, b.upload);
    const fixed = [
      '      - name: Build RavRadar support package',
      '        continue-on-error: true', '        if: always()', '        run: |',
      '          rm -rf _support', '          mkdir -p _support/run-metadata',
      '          node scripts/write-support-run-metadata.mjs',
      '          (cd _support && zip -qr ../RavRadar-support-' + '$' + '{{ github.run_number }}.zip .)', '', '',
    ].join('\n');
    assert.equal(b.build, fixed);
    return true;
  } catch { return false; }
}

// Compose only the two existing owners. Restoring the predecessor support
// block must leave exactly the existing two-field Pages change; the second
// comparison independently proves the fixed metadata-only support change.
export function isPagesAndSupportOnlyWeatherBuildChange(before, after) {
  try {
    const take = source => {
      assert(typeof source === 'string' && !source.includes('\r')
        && Buffer.byteLength(source) <= 4 * 1024 * 1024);
      const build = '      - name: Build RavRadar support package\n';
      const upload = '      - name: Upload RavRadar support package\n';
      assert.equal(source.split(build).length, 2); assert.equal(source.split(upload).length, 2);
      const start = source.indexOf(build), end = source.indexOf(upload);
      assert(start >= 0 && end > start);
      assert.equal(source.indexOf('\n      - ', start + 1) + 1, end);
      return { start, end, block: source.slice(start, end) };
    };
    const a = take(before), b = take(after);
    const normalizedAfter = after.slice(0, b.start) + a.block + after.slice(b.end);
    return isPagesOnlyWeatherBuildChange(before, normalizedAfter)
      && isSupportOnlyWeatherBuildChange(normalizedAfter, after);
  } catch { return false; }
}

// Pure security-frame comparison only. The whole changed body still needs
// independent control review and its actual credential-free --self-test.
export function isBoundedLocalRestoreFixtureChange(before,after){
  try{
    for(const source of [before,after]){
      assert(typeof source==='string'&&!source.includes('\r')&&Buffer.byteLength(source)<=256*1024);
      const imports=source.indexOf(LOCAL_RESTORE_IMPORTS),dispatch=source.indexOf(LOCAL_RESTORE_DISPATCH);
      assert(imports>0&&dispatch>imports);
      assert.equal(source.indexOf(LOCAL_RESTORE_IMPORTS,imports+1),-1);
      assert.equal(source.indexOf(LOCAL_RESTORE_DISPATCH,dispatch+1),-1);
      const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
      assert.equal(sha(source.slice(0,imports)),LOCAL_RESTORE_IMPORTS_SHA256);
      assert.equal(sha(source.slice(dispatch)),LOCAL_RESTORE_DISPATCH_SHA256);
    }
    return true;
  }catch{return false;}
}


// Narrow scheduling ownership; source review and actual normal tests remain required.
const DMI_BUDGET_PATHS=new Set(['scripts/plan-dmi-recovery.py','scripts/lib/dmi_adaptive_recovery.py',
  'scripts/run-dmi-bulk-supervised.py','scripts/update-dmi-bulk.py',
  'scripts/test-plan-dmi-recovery.py','scripts/test-dmi-budget-rotation-4.0.189.mjs']);
function dmiText(s){assert(typeof s==='string'&&!s.includes('\r')&&Buffer.byteLength(s)<=4*1024*1024);return s;}
function dmiUnique(s,marker){assert.equal(s.split(marker).length,2);return s.indexOf(marker);}
function dmiStep(s,name){
  dmiText(s);const start=dmiUnique(s,'      - name: '+name+'\n');
  const job=dmiUnique(s,'  build-and-prepare:\n'),steps=dmiUnique(s,'    steps:\n');assert(job<steps&&steps<start);
  const next=s.indexOf('\n      - ',start+1);assert(next>start);return {start,end:next+1,body:s.slice(start,next+1)};
}
// Fixed normal wiring of the moved budget call, not a blob/cohort hash. Other
// workflow bodies and every acquisition/deploy/budget-limit field stay exact.
const DMI_MOVED_BUDGET_STEP="      - name: Choose DMI budget from retained five-component PART coverage\n        id: dmi-recovery-budget\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')\n        shell: bash\n        env:\n          DMI_PLANNING_SNAPSHOT: ${{ steps.dmi-recovery-snapshot.outputs.cache_path }}\n          DMI_PART_CONTINUITY_DONOR_PATH: ${{ steps.restored-dmi-part-continuity-donor.outputs.path }}\n        run: |\n          set -euo pipefail\n          qualified_args=(--qualified-plan .cache/weather-qualified-acquisition-plan.json\n            --current-plan .cache/weather-current-acquisition-plan.json\n            --scalar-snapshot \"$DMI_PLANNING_SNAPSHOT\")\n          if test -n \"$DMI_PART_CONTINUITY_DONOR_PATH\"; then\n            qualified_args+=(--scalar-history \"$DMI_PART_CONTINUITY_DONOR_PATH\")\n          fi\n          python scripts/plan-dmi-recovery.py \\\n            --cache \"$DMI_PLANNING_SNAPSHOT\" \\\n            --parts data/live/coastal-parts-v2.json \\\n            --at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\" \\\n            \"${qualified_args[@]}\" \\\n            --github-output \"$GITHUB_OUTPUT\"\n          printf 'cache_path=%s\\n' \"$DMI_PLANNING_SNAPSHOT\" >> \"$GITHUB_OUTPUT\"\n\n";
function restoreOwnedDmiBudgetSteps(before,after){
  const oldBudget=dmiStep(before,'Choose DMI budget from retained five-component PART coverage');
  const oldPlan=dmiStep(before,'Plan global current acquisition before DMI');
  const snapshot=dmiStep(after,'Prepare retained DMI planning snapshot');
  const plan=dmiStep(after,'Plan global current acquisition before DMI');
  const budget=dmiStep(after,'Choose DMI budget from retained five-component PART coverage');
  assert.equal(oldBudget.end,oldPlan.start);assert.equal(snapshot.end,plan.start);assert.equal(plan.end,budget.start);
  assert.equal(budget.body,DMI_MOVED_BUDGET_STEP);
  const callStart=dmiUnique(oldBudget.body,'          python scripts/plan-dmi-recovery.py \\\n');
  const printf="          printf 'cache_path=%s\\n' ",callEnd=dmiUnique(oldBudget.body,printf);assert(callStart<callEnd);
  const restored=snapshot.body.replace('      - name: Prepare retained DMI planning snapshot\n',
    '      - name: Choose DMI budget from retained five-component PART coverage\n')
    .replace('        id: dmi-recovery-snapshot\n','        id: dmi-recovery-budget\n');
  const insert=dmiUnique(restored,printf);
  assert.equal(restored.slice(0,insert)+oldBudget.body.slice(callStart,callEnd)+restored.slice(insert),oldBudget.body);
  assert.equal(plan.body.replaceAll('steps.dmi-recovery-snapshot.outputs.cache_path',
    'steps.dmi-recovery-budget.outputs.cache_path'),oldPlan.body);
  return after.slice(0,snapshot.start)+before.slice(oldBudget.start,oldPlan.end)+after.slice(budget.end);
}
export function dmiBudgetWeatherBuildAreas(before,after){
  try{assert(before!==after);const restored=restoreOwnedDmiBudgetSteps(before,after);
    if(restored===before)return ['dmiBudget'];
    if(isPagesOnlyWeatherBuildChange(before,restored))return ['pages','dmiBudget'];
    if(isSupportOnlyWeatherBuildChange(before,restored))return ['workflowSupport','dmiBudget'];
    if(isPagesAndSupportOnlyWeatherBuildChange(before,restored))return ['pages','workflowSupport','dmiBudget'];
    return null;
  }catch{return null;}
}
export function isDmiBudgetOnlyUpdaterChange(before,after){
  try{assert(before!==after);const project=s=>{
    dmiText(s);const imports=[...s.matchAll(/^from lib\.dmi_adaptive_recovery import ([^\n]+)\n/gm)];assert.equal(imports.length,1);
    assert(['EXTENDED_RUNTIME_SECONDS, next_adaptive_recovery',
      'extended_runtime_profile_selected, next_adaptive_recovery'].includes(imports[0][1]));
    const selected='    selected_runtime_budget = os.getenv("DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS")\n';
    const legacy='    extended_recovery = (os.getenv("DMI_BULK_ADAPTIVE_RECOVERY", "false").lower() == "true"\n';
    const start=dmiUnique(s,s.includes(selected)?selected:legacy),end=dmiUnique(s,'    if adaptive_recovery is not None:\n');
    assert(start<end&&end-start<8192&&start>s.indexOf('\ndef main()'));
    const body=s.slice(start,end);assert.equal(body.split('    adaptive_recovery = next_adaptive_recovery(\n').length,2);
    assert(body.split('\n').every(line=>!line||line.startsWith('    ')));
    return (s.slice(0,start)+'<DMI_SELECTED_PROFILE_REGISTRATION>\n'+s.slice(end))
      .replace(imports[0][0],'<DMI_ADAPTIVE_BUDGET_IMPORT>\n');
  };return project(before)===project(after);}catch{return false;}
}
export function isDmiBudgetOnlySupervisorChange(before,after){
  try{dmiText(before);dmiText(after);assert(before!==after);
    const addition='    # Preserve the actually selected envelope, not a rounded child remainder.\n'
      +'    # Overwrite caller input; this metadata neither resets nor extends deadline.\n'
      +'    environment["DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS"] = str(total_runtime)\n';
    const deadline='    deadline = time.monotonic() + total_runtime\n';dmiUnique(before,deadline);dmiUnique(after,deadline);
    assert.equal(after.split(addition).length,2);assert(after.includes(addition+deadline));
    return after.replace(addition,'')===before;
  }catch{return false;}
}

// Collection failure classification only. These anchored source edits restore
// the complete prior updater text; decoding, ledger, RAW, identity and deadlines
// are outside this owner. This is not a whole-blob/hash exception.
const DMI_COLLECTION_RECOVERY_EDITS=Object.freeze([
  [
    "DOWNLOAD_SESSION.headers.update({\"Accept\": \"application/x-grib, application/octet-stream, */*\"})\n\nPARSER_VERSION = 20\nPARAMETER_MAP_VERSION = 4\nGRID_LOOKUP_VERSION = 9\nWAVE_ASSET_ADMISSION_POLICY = \"per-part-atomic-owner-v2\"\n",
    "DOWNLOAD_SESSION.headers.update({\"Accept\": \"application/x-grib, application/octet-stream, */*\"})\n\nPARSER_VERSION = 20\nUNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION = 1\nPARAMETER_MAP_VERSION = 4\nGRID_LOOKUP_VERSION = 9\nWAVE_ASSET_ADMISSION_POLICY = \"per-part-atomic-owner-v2\"\n"
  ],
  [
    "        entry[\"failureClass\"] = None\n        entry[\"blockedParserVersion\"] = None\n        entry[\"consecutiveFailures\"] = 0\n    return epoch(entry.get(\"nextEligibleAt\")) <= now_value\n\n\ndef wam_runtime_reserve(\n",
    "        entry[\"failureClass\"] = None\n        entry[\"blockedParserVersion\"] = None\n        entry[\"consecutiveFailures\"] = 0\n    classification_revision = entry.get(\"unrecognizedParametersClassificationRevision\", 0)\n    unrecognized_classification_obsolete = (\n        entry.get(\"failureClass\") == \"parser-blocked\"\n        and entry.get(\"lastError\") == (\n            \"GRIB downloaded but no required RavRadar parameters were recognized\"\n        )\n        and type(classification_revision) is int\n        and 0 <= classification_revision < UNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION\n    )\n    # This only admits the next ordinary budgeted assessment. A read or an\n    # interrupted/empty turn must not claim that the new classifier was used.\n    return unrecognized_classification_obsolete or epoch(entry.get(\"nextEligibleAt\")) <= now_value\n\n\ndef wam_runtime_reserve(\n"
  ],
  [
    "                    } if bootstrap_operational_wam else {}),\n                    \"assetsSkippedBySupervisor\": 0,\n                    \"assetsSkippedPreviouslyProcessed\": 0,\n                    \"assetsDeferredValidRefresh\": 0,\n                    \"assetsBoundedRefreshAttempted\": 0,\n                    \"assetsBoundedRefreshCompleted\": 0,\n",
    "                    } if bootstrap_operational_wam else {}),\n                    \"assetsSkippedBySupervisor\": 0,\n                    \"assetsSkippedPreviouslyProcessed\": 0,\n                    \"assetsTraversedThisTurn\": 0,\n                    \"assetsDeferredValidRefresh\": 0,\n                    \"assetsBoundedRefreshAttempted\": 0,\n                    \"assetsBoundedRefreshCompleted\": 0,\n"
  ],
  [
    "                    regional_proxy_collection_completed = True\n                if not interrupted and bootstrap_operational_wam:\n                    run_info[\"assetsObserved\"] += 1\n                recognized.update(found)\n                run_info[\"recognizedParameters\"] = sorted(recognized)\n                result[\"diagnostics\"][\"messagesSeen\"] += messages_seen\n",
    "                    regional_proxy_collection_completed = True\n                if not interrupted and bootstrap_operational_wam:\n                    run_info[\"assetsObserved\"] += 1\n                run_info[\"assetsTraversedThisTurn\"] += 1\n                if (\n                    found\n                    and state.get(\"failureClass\") == \"parser-blocked\"\n                    and state.get(\"lastError\") == (\n                        \"GRIB downloaded but no required RavRadar parameters were recognized\"\n                    )\n                ):\n                    state[\"failureClass\"] = None\n                    state[\"blockedParserVersion\"] = None\n                    state[\"lastError\"] = None\n                    state[\"nextEligibleAt\"] = None\n                recognized.update(found)\n                run_info[\"recognizedParameters\"] = sorted(recognized)\n                result[\"diagnostics\"][\"messagesSeen\"] += messages_seen\n"
  ],
  [
    "                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif not made_progress and collection_assets_complete and recognized >= required and run_info[\"assetsSkippedPreviouslyProcessed\"] == len(assets):\n                state[\"lastCheckedAt\"] = generated\n                state[\"referenceTime\"] = collection_reference_time\n",
    "                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif (\n                collection_is_maintenance\n                and not recognized\n                and run_info[\"assetsTraversedThisTurn\"] == 0\n                and not budget_stop\n            ):\n                # No GRIB was traversed: unfinished critical work is outside\n                # this maintenance turn, not evidence of a parser failure.\n                state[\"lastCheckedAt\"] = generated\n                result[\"diagnostics\"][\"zeroProgressCollections\"].append(collection)\n                if previous_run:\n                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif not made_progress and collection_assets_complete and recognized >= required and run_info[\"assetsSkippedPreviouslyProcessed\"] == len(assets):\n                state[\"lastCheckedAt\"] = generated\n                state[\"referenceTime\"] = collection_reference_time\n"
  ],
  [
    "            state[\"lastError\"] = message\n            state[\"failureClass\"] = failure_class\n            state[\"blockedParserVersion\"] = PARSER_VERSION if (parser_blocked or parser_exception) else None\n            state[\"nextEligibleAt\"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace(\"+00:00\", \"Z\")\n            result[\"diagnostics\"][\"errors\"].append({\n                \"collection\": collection,\n",
    "            state[\"lastError\"] = message\n            state[\"failureClass\"] = failure_class\n            state[\"blockedParserVersion\"] = PARSER_VERSION if (parser_blocked or parser_exception) else None\n            if (\n                failure_code == \"GRIB_PARAMETERS_UNRECOGNIZED\"\n                and run_info[\"assetsTraversedThisTurn\"] > 0\n                and not budget_stop\n            ):\n                state[\"unrecognizedParametersClassificationRevision\"] = (\n                    UNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION\n                )\n            state[\"nextEligibleAt\"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace(\"+00:00\", \"Z\")\n            result[\"diagnostics\"][\"errors\"].append({\n                \"collection\": collection,\n"
  ]
]);
const DMI_COLLECTION_RECOVERY_PATHS=new Set(['scripts/update-dmi-bulk.py','scripts/test-dmi-dkss-primary-mode.py']);
function restoreDmiCollectionRecoverySource(source){
  dmiText(source);let restored=source;
  for(const [prior,next]of DMI_COLLECTION_RECOVERY_EDITS){
    dmiUnique(restored,next);restored=restored.replace(next,prior);
  }
  return restored;
}
export function isDmiCollectionRecoveryOnlyUpdaterChange(before,after){
  try{dmiText(before);assert(before!==after);return restoreDmiCollectionRecoverySource(after)===before;}catch{return false;}
}
export function dmiCollectionRecoveryUpdaterAreas(before,after){
  try{dmiText(before);assert(before!==after);const restored=restoreDmiCollectionRecoverySource(after);
    if(restored===before)return ['dmiCollectionRecovery'];
    // Compose only the already closed budget-owner projection. Any remaining
    // updater difference still refuses this route, including decoder changes.
    if(isDmiBudgetOnlyUpdaterChange(before,restored))return ['dmiBudget','dmiCollectionRecovery'];
    return null;
  }catch{return null;}
}
export function isDmiCollectionRecoveryOnlyFixtureChange(before,after){
  try{dmiText(before);dmiText(after);assert(before!==after);
    const start='\ndef check_empty_critical_maintenance_is_not_a_parser_failure():\n';
    const end='\nMODEL_RUN = "2026-01-01T00:00:00Z"\n';
    const dispatch='\n\ncheck_empty_critical_maintenance_is_not_a_parser_failure()\n'
      +'if "--empty-maintenance-only" in sys.argv:\n    raise SystemExit(0)\n\n';
    const frame=(source,required)=>{
      const first=source.indexOf(start);if(first<0){assert(!required);return source;}
      assert.equal(source.indexOf(start,first+1),-1);const last=dmiUnique(source,end);assert(last>first);
      const owned=source.slice(first,last);assert(owned.length<32*1024&&owned.endsWith(dispatch));
      const body=owned.slice(start.length,-dispatch.length);assert(body.length>0);
      assert(body.split('\n').every(line=>!line||line.startsWith('    ')));
      return source.slice(0,first)+source.slice(last);
    };
    // Original imports, every old assertion and the fixed normal invocation
    // stay exact. Only this one new local regression body needs fresh review.
    return frame(before,false)===frame(after,true);
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
    const selected=new Map([['core',[]]]),unknown=[],changedInputs=[];
    for(const row of analysis.completeGitDiff.inventory){
      const bytes=Buffer.from(row.pathUtf8Hex,'hex');
      const file=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      assert(Buffer.from(file).equals(bytes)&&/^[A-Za-z0-9_.\/-]+$/.test(file)
        &&!file.startsWith('/')&&!file.includes('//')&&!file.split('/').some(part=>part==='.'||part==='..'));
      if(!['A','M','D'].includes(row.status)
        ||![row.beforeMode,row.afterMode].every(mode=>['000000','100644','100755'].includes(mode)))
        return refuse('CURRENT_UNSUPPORTED_DIFF_ENTRY');
      changedInputs.push({path:file,status:row.status,beforeMode:row.beforeMode,afterMode:row.afterMode});
      // Den gamle eksekveringsform genkender endnu kun to eksakte PR-YAML-former.
      // En ændring her kræver derfor faktisk FULL-kvalifikation i denne levering.
      if(file==='.github/workflows/validate-pull-request.yml')
        return refuse('CURRENT_VALIDATION_WORKFLOW_REQUIRES_FULL');
      if(DMI_BUDGET_PATHS.has(file)&&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_DMI_BUDGET_REQUIRES_EXISTING_REGULAR_SOURCE');
      const recoveryAreas=file==='scripts/update-dmi-bulk.py'?dmiCollectionRecoveryUpdaterAreas(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)):null;
      const recoveryScope=Boolean(recoveryAreas)||(file==='scripts/test-dmi-dkss-primary-mode.py'
        &&isDmiCollectionRecoveryOnlyFixtureChange(readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)));
      if(DMI_COLLECTION_RECOVERY_PATHS.has(file)&&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_DMI_RECOVERY_REQUIRES_EXISTING_REGULAR_SOURCE',['DMI_PRODUCER_CONTRACTS']);
      if(file==='scripts/test-dmi-dkss-primary-mode.py'&&!recoveryScope)
        return refuse('CURRENT_DMI_RECOVERY_FIXTURE_SCOPE_CHANGED',['DMI_PRODUCER_CONTRACTS']);
      if(file==='scripts/update-dmi-bulk.py'&&!recoveryScope&&!isDmiBudgetOnlyUpdaterChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)))
        return refuse('CURRENT_DMI_BUDGET_UPDATER_SCOPE_CHANGED',['DMI_PRODUCER_CONTRACTS']);
      if(file==='scripts/run-dmi-bulk-supervised.py'&&!isDmiBudgetOnlySupervisorChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)))
        return refuse('CURRENT_DMI_BUDGET_SUPERVISOR_SCOPE_CHANGED',['DMI_SUPERVISOR_CONTRACTS']);
      const dmiAreas=file===WEATHER_BUILD?dmiBudgetWeatherBuildAreas(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)):null;
      const supportOnly=file===WEATHER_BUILD&&isSupportOnlyWeatherBuildChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file));
      const pagesAndSupportOnly=file===WEATHER_BUILD&&!supportOnly&&isPagesAndSupportOnlyWeatherBuildChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file));
      const areas=(recoveryAreas??(recoveryScope?['dmiCollectionRecovery']:dmiAreas))??(supportOnly?['workflowSupport']:pagesAndSupportOnly?['pages','workflowSupport']:
        pathAreas.get(file)??(/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(file)?['documentation']:null));
      if(!areas){unknown.push(file);continue;}
      for(const area of areas){if(!selected.has(area))selected.set(area,[]);selected.get(area).push(file);}
      if(sourceControlPaths.has(file)||historicalPaths.has(file)||areas.includes('compatibility')||areas.includes('assistantEdge')||areas.includes('mailOwnerProbe')||areas.includes('currentInstalledCodeOnly')||areas.includes('workflowSupport')||areas.includes('dmiBudget')||areas.includes('dmiCollectionRecovery')||file.startsWith('scripts/test-'))
        out.controlQualificationRequired=true;
    }
    if(unknown.length){out.unclassifiedPaths=unknown.sort();return refuse('CURRENT_UNCLASSIFIED_PATH');}
    const restore=analysis.completeGitDiff.inventory.find(row=>
      Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===LOCAL_RESTORE_FIXTURE);
    if(restore){
      if(restore.status!=='M'||restore.beforeMode!=='100644'||restore.afterMode!=='100644')
        return refuse('CURRENT_RESTORE_FIXTURE_REQUIRES_EXISTING_REGULAR_SOURCE');
      const before=readCommittedText(input.baselineCommit,LOCAL_RESTORE_FIXTURE,true);
      const after=readCommittedText(input.candidateCommit,LOCAL_RESTORE_FIXTURE,true);
      if(!isBoundedLocalRestoreFixtureChange(before,after))
        return refuse('CURRENT_RESTORE_FIXTURE_SECURITY_FRAME_CHANGED');
      if(readCommittedText(input.baselineCommit,LOCAL_RESTORE_WORKFLOW,true)
        !==readCommittedText(input.candidateCommit,LOCAL_RESTORE_WORKFLOW,true))
        return refuse('CURRENT_RESTORE_FIXTURE_WORKFLOW_CHANGED');
    }
    if(analysis.completeGitDiff.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===WEATHER_BUILD)){
      const before=readCommittedText(input.baselineCommit,WEATHER_BUILD);
      const after=readCommittedText(input.candidateCommit,WEATHER_BUILD);
      if(!isPagesOnlyWeatherBuildChange(before,after)&&!isSupportOnlyWeatherBuildChange(before,after)
        &&!isPagesAndSupportOnlyWeatherBuildChange(before,after)&&!dmiBudgetWeatherBuildAreas(before,after))
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
      commands:area==='pages'?pagesContractCommandsForChangedInputs(changedInputs):[...COMMANDS[area]],
      changedPaths:[...new Set(selected.get(area))].sort()};
    out.commands=[...new Set(Object.values(out.areas).flatMap(area=>area.commands))];
    assert(out.commands.length>0&&out.commands.every(command=>command===LOCAL_RESTORE_SELF_TEST||command===PAGES_OWNER_COMPLETION_COMMAND||/^node(?: --[a-z-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+$/.test(command)));
    out.reasonCodes=['CURRENT_SCOPES_CLASSIFIED','UNCHANGED_ACTUAL_POSTGRES_AND_MODELS'];
    if(out.controlQualificationRequired)out.reasonCodes.push('INDEPENDENT_CONTROL_REVIEW_REQUIRED');
    return freeze(out);
  }catch{return refuse('CURRENT_PLAN_REFUSED');}
}
