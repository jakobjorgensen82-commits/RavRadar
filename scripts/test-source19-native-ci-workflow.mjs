import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE19_NATIVE_SCOPE_PATHS,SOURCE19_NATIVE_SCOPE_DIRECTORIES,source19NativeCiRequired,source19NativeValidationAllowed} from './source19-native-ci-scope.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const NATIVE_JOBS_SHA256='2f096305b2a08b0b0445867f4295a05ba420539c1e23d63525e38274fe3f7b9d';
const EXACT_SCOPE_SHA256='6d92eba322401da3ecbc09c10a732d42fb7e7ce0d9b6dba9318f71768a16bccd';
const DEPENDENCY_GUARD="    needs: [source-native-scope, source-native]\n    if: always() && needs.source-native-scope.result == 'success' && ((needs.source-native-scope.outputs.required == 'true' && needs.source-native.result == 'success') || (needs.source-native-scope.outputs.required == 'false' && needs.source-native.result == 'skipped'))\n";

export function projectSource19NativeCiWorkflow(input) {
  const source=input.replaceAll('\r\n','\n');
  assert.equal(source.split('\njobs:\n').length,2,'SOURCE19_NATIVE_CI_JOBS_REQUIRED');
  const jobsAt=source.indexOf('\njobs:\n')+'\njobs:\n'.length;
  const validateAt=source.indexOf('  validate:\n',jobsAt);assert.ok(validateAt>jobsAt);
  const nativeJobs=source.slice(jobsAt,validateAt);
  assert.equal(sha(nativeJobs),NATIVE_JOBS_SHA256,'SOURCE19_NATIVE_CI_EXACT_JOB_CONTRACT');
  const validate=source.slice(validateAt);
  assert.equal(validate.split(DEPENDENCY_GUARD).length,2,'SOURCE19_NATIVE_CI_HARD_SOURCE_DEPENDENCY');
  assert.ok(validate.startsWith('  validate:\n'+DEPENDENCY_GUARD));
  assert.doesNotMatch(nativeJobs,/secrets\.|(?:contents|actions|pages|id-token): write|continue-on-error|pull_request_target|workflow_dispatch|NODE_TLS_REJECT_UNAUTHORIZED|NODE_OPTIONS|upstream/);
  return source.slice(0,jobsAt)+validate.replace(DEPENDENCY_GUARD,'');
}

function actualConditionAllows(scopeResult,required,nativeResult) {
  let expression=DEPENDENCY_GUARD.split('\n    if: ')[1].trim();
  expression=expression.replaceAll('always()','true')
    .replaceAll('needs.source-native-scope.result',JSON.stringify(scopeResult))
    .replaceAll('needs.source-native-scope.outputs.required',JSON.stringify(required))
    .replaceAll('needs.source-native.result',JSON.stringify(nativeResult));
  return Function('return ('+expression+');')();
}

export async function testSource19NativeCiWorkflow(input=null) {
  const workflow=(input??await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const historical=projectSource19NativeCiWorkflow(workflow);
  const native=workflow.slice(workflow.indexOf('  source-native:\n'),workflow.indexOf('  validate:\n'));
  for(const marker of ['id: native-node24','id: native-node22',
    'test "$("$executable" -p \'process.versions.node.split(".")[0]\')" = 24',
    'test "$("$executable" -p \'process.versions.node.split(".")[0]\')" = 22',
    'SOURCE_NODE22_PATH: ${{ steps.native-node22.outputs.path }}',
    'SOURCE_NODE24_PATH: ${{ steps.native-node24.outputs.path }}'])assert.ok(native.includes(marker),marker);
  assert.ok(native.indexOf('Install locked native action dependencies without scripts')<native.indexOf('id: native-node24'));
  assert.ok(native.indexOf('id: native-node24')<native.indexOf('node-version: 22'));
  assert.ok(native.indexOf('node-version: 22')<native.indexOf('id: native-node22'));
  assert.ok(native.indexOf('id: native-node22')<native.indexOf('Run one fixed native case'));
  assert.equal(native.split('--node22-path "$SOURCE_NODE22_PATH" --node24-path "$SOURCE_NODE24_PATH"').length,3);
  assert.doesNotMatch(native,/--node24-path "\$\(command -v node\)"/);
  assert.equal(sha(JSON.stringify(SOURCE19_NATIVE_SCOPE_PATHS)),EXACT_SCOPE_SHA256,'SOURCE19_NATIVE_CI_CLOSED_SCOPE_CHANGED');
  assert.equal(new Set(SOURCE19_NATIVE_SCOPE_PATHS).size,SOURCE19_NATIVE_SCOPE_PATHS.length);
  for(const file of SOURCE19_NATIVE_SCOPE_PATHS)assert.equal(source19NativeCiRequired([file]),true,file);
  assert.deepEqual(SOURCE19_NATIVE_SCOPE_DIRECTORIES,[
    {directory:'data/admin',suffixes:['.mjs','.js','.py','.json','.geojson'],depth:1},
    {directory:'data/geometry-v2/active-national-coastal-parts',suffixes:['.mjs','.js','.py','.json','.geojson'],depth:1}]);
  for(const row of SOURCE19_NATIVE_SCOPE_DIRECTORIES)for(const extension of row.suffixes)
    assert.equal(source19NativeCiRequired([row.directory+'/new-fixed-input'+extension]),true);
  for(const changed of [[],['README.md'],['js/ui/unrelated-new-view.js'],['assets/unrelated-new-image.png'],['docs/unrelated.md']])
    assert.equal(source19NativeCiRequired(changed),false,'Unimported UI/docs do not acquire seven native jobs');
  for(const changed of [null,{},['../escape'],['/absolute'],['a\\b'],['a\u0000b'],['same','same'],['a/../b']])
    assert.throws(()=>source19NativeCiRequired(changed));
  for(const scope of ['success','failure','cancelled','skipped',null])for(const required of ['true','false','',null])
    for(const native of ['success','failure','cancelled','skipped',null]){
      const actual=actualConditionAllows(scope,required,native);
      assert.equal(actual,source19NativeValidationAllowed(scope,required,native));
      if(scope!=='success'||(required!=='true'&&required!=='false')||(required==='true'&&native!=='success'))assert.equal(actual,false);
    }
  assert.equal(source19NativeValidationAllowed('success','false','skipped'),true);
  assert.equal(source19NativeValidationAllowed('success','false','success'),false,'A skipped unrelated matrix is not native PASS');
  const mutations=[
    workflow.replace('id: native-node22','id: absent-node22'),
    workflow.replace('--node22-path "$SOURCE_NODE22_PATH"','--node22-path "$SOURCE_NODE24_PATH"'),
    workflow.replace('Restore Node22 for normal SOURCE prelude programs','Restore unknown runtime'),
    workflow.replace('fail-fast: false','fail-fast: true'),
    workflow.replace('case: lose-union-supervisor','case: missing-case'),
    workflow.replace('timeout-minutes: 12','timeout-minutes: 120'),
    workflow.replace('persist-credentials: false','persist-credentials: true'),
    workflow.replace('npm ci --ignore-scripts --no-audit --no-fund','npm install'),
    workflow.replace('    needs: [source-native-scope, source-native]\n',''),
    workflow.replace("needs.source-native.result == 'success'","needs.source-native.result != 'failure'"),
    workflow.replace('          test ! -L /tmp/ravradar-private-production-runtime\n',''),
  ];
  for(const changed of mutations){assert.notEqual(changed,workflow);assert.throws(()=>projectSource19NativeCiWorkflow(changed));}
  assert.throws(()=>projectSource19NativeCiWorkflow(historical),'The old source-only workflow cannot claim this native CI contract');
  assert.ok(historical.includes('Validate native PostgreSQL checkpoint CAS on artificial data only'));
  assert.ok(historical.indexOf('Validate native PostgreSQL checkpoint CAS on artificial data only')<historical.indexOf('Validate source contracts and release governance'));
  return {status:'SOURCE19_NATIVE_CI_CONTRACT_PASS',scopePaths:SOURCE19_NATIVE_SCOPE_PATHS.length,cases:7,nativeActual:'UNRUN'};
}

if(import.meta.url.startsWith('file:')&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await testSource19NativeCiWorkflow());
