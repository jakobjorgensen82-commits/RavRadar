// Test-only proof-bank contract. Never imported by a production caller.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const CONTRACT=Object.freeze({"bankRoot":"scripts/fixtures/source19-terminal-proof-inputs-v2","manifest":"scripts/fixtures/source19-terminal-proof-inputs-v2/manifest.json","manifestSha256":"6a68b86ebcb39db981875332b359fae36d6e9c4099401d6594560ef8d41c94c3","materializer":"scripts/run-source19-terminal-native-bank.py","materializerSha256":"d8f22a11e00b0256430646ab0acca82524a97a66868e6385df6972abf2a8967c","workflowBeforeSha256":"8551796f634919621f6bbeff948f08f5f70aa3482f4a2f4f79758067640717de","workflowAfterSha256":"5357ea3bb58c59d32e249716d9fb405b202211c06ddc1d00a93f2f80ce566e71","jobs":"  source-proof-bank-scope:\n    name: Determine exact isolated SOURCE proof-bank scope\n    runs-on: ubuntu-24.04\n    timeout-minutes: 3\n    outputs:\n      required: ${{ steps.scope.outputs.required }}\n    steps:\n      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n          ref: ${{ github.event.pull_request.head.sha }}\n          persist-credentials: false\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 22\n      - name: Classify only the explicit test bank and its proof caller\n        id: scope\n        run: node scripts/test-source19-terminal-proof-bank.mjs --scope\n        env:\n          SOURCE19_PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          SOURCE19_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}\n\n  source-proof-bank-native:\n    name: SOURCE native terminal failure / asset-skip-limit\n    needs: source-proof-bank-scope\n    if: needs.source-proof-bank-scope.outputs.required == 'true'\n    runs-on: ubuntu-24.04\n    timeout-minutes: 35\n    steps:\n      - uses: actions/checkout@v7\n        with:\n          fetch-depth: 0\n          ref: ${{ github.event.pull_request.head.sha }}\n          persist-credentials: false\n      - name: Require exact native fixture pull-request head\n        shell: bash\n        env:\n          EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n        run: |\n          set -euo pipefail\n          test \"$(git rev-parse HEAD^{commit})\" = \"$EXPECTED_HEAD_SHA\"\n          test ! -e /tmp/ravradar-private-production-runtime\n          test ! -L /tmp/ravradar-private-production-runtime\n      - uses: actions/setup-python@v7\n        with:\n          python-version: \"3.12\"\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 24\n      - name: Install only existing SOURCE native fixture requirements\n        run: >-\n          python -m pip install --disable-pip-version-check\n          -r requirements-dmi.txt\n          -r requirements-geometry.txt\n          -r requirements-copernicus.txt\n      - name: Retain verified Node24 path for the isolated action\n        id: native-node24\n        shell: bash\n        run: |\n          set -euo pipefail\n          executable=\"$(node -p 'require(\"node:fs\").realpathSync(process.execPath)')\"\n          case \"$executable\" in /*) ;; *) exit 1 ;; esac\n          test -x \"$executable\"\n          test \"$(\"$executable\" -p 'process.versions.node.split(\".\")[0]')\" = 24\n          printf 'path=%s\\n' \"$executable\" >> \"$GITHUB_OUTPUT\"\n      - name: Restore Node22 for normal SOURCE prelude programs\n        uses: actions/setup-node@v7\n        with:\n          node-version: 22\n      - name: Retain verified Node22 path for the normal prelude\n        id: native-node22\n        shell: bash\n        run: |\n          set -euo pipefail\n          executable=\"$(node -p 'require(\"node:fs\").realpathSync(process.execPath)')\"\n          case \"$executable\" in /*) ;; *) exit 1 ;; esac\n          test -x \"$executable\"\n          test \"$(\"$executable\" -p 'process.versions.node.split(\".\")[0]')\" = 22\n          printf 'path=%s\\n' \"$executable\" >> \"$GITHUB_OUTPUT\"\n      - name: Run one exact source-only terminal failure proof host\n        shell: bash\n        env:\n          SOURCE19_PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          SOURCE_NODE22_PATH: ${{ steps.native-node22.outputs.path }}\n          SOURCE_NODE24_PATH: ${{ steps.native-node24.outputs.path }}\n        run: |\n          set -euo pipefail\n          node scripts/test-source19-terminal-proof-bank.mjs\n          python -I -B scripts/run-source19-terminal-native-bank.py --node24-path \"$SOURCE_NODE24_PATH\" --node22-path \"$SOURCE_NODE22_PATH\"\n\n      # Fixed safe metadata only; not the host, SDK archive or raw logs.\n      - name: Retain bounded native proof metadata after actual outcome\n        if: always()\n        uses: actions/upload-artifact@v7\n        with:\n          name: source19-terminal-proof-${{ github.run_id }}-${{ github.run_attempt }}\n          path: .cache/source19-terminal-proof-result/result.json\n          if-no-files-found: error\n          retention-days: 7\n          compression-level: 9\n\n","guard":"    needs: [source-proof-bank-scope, source-proof-bank-native]\n    if: always() && needs.source-proof-bank-scope.result == 'success' && ((needs.source-proof-bank-scope.outputs.required == 'true' && needs.source-proof-bank-native.result == 'success') || (needs.source-proof-bank-scope.outputs.required == 'false' && needs.source-proof-bank-native.result == 'skipped'))\n","scopePaths":[".github/workflows/validate-pull-request.yml","scripts/test-workflow-validation-order-4.0.108.mjs",".gitattributes","scripts/test-source19-terminal-proof-bank.mjs","scripts/run-source19-terminal-native-bank.py","requirements-dmi.txt","requirements-geometry.txt","requirements-copernicus.txt"],"files":298,"testBank":69,"fixedGit":229,"fixedGitOperands":{"path":"scripts/fixtures/source19-terminal-proof-git-operands-v3.json","sha256":"7e06eae7ba27488c1418dc42097db798e4399222b1bd5b721de8321a0c856afc","helper":"scripts/test-helpers/source19-native-git-operands.mjs","helperSha256":"4984f7113f4cde8b44f8b53f994217ce31a270c401aff2949bd83f6f4ad2f96e","commits":[{"commit":"85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9","tree":"b7deb9eb805f5bdcd79ad0e02c1612bd99946d61","blobs":125}]}});
// Exact historical75-minute composition remains registered, not current admission.
const REGISTERED_PREDECESSOR_WORKFLOW_COMPOSITIONS=Object.freeze([
 Object.freeze({"kind":"SOURCE19_CURRENT_WORKFLOW_OVER_EXACT_P0_SOURCE_GATE","baseHead":"5984886b9152ce90f851055179963813a8a7e206","baseTree":"ada0fd0bd34f45cc3a035644e39433518908a719","workflowBeforeSha256":"55bd264d8cc8fb7301d6b403f7035f644625d08528514fab3200e7e435f1d2d0","workflowAfterSha256":"303fc9f79c0db0925651f6997ab6175b47c634e20c41deb6f1741191a1166bac","historicalWorkflowBeforeSha256":"8551796f634919621f6bbeff948f08f5f70aa3482f4a2f4f79758067640717de","historicalWorkflowAfterSha256":"5357ea3bb58c59d32e249716d9fb405b202211c06ddc1d00a93f2f80ce566e71"})
]);
const CURRENT_WORKFLOW_COMPOSITION=Object.freeze({"kind":"SOURCE19_CURRENT_WORKFLOW_OVER_EXACT_P0_SOURCE_GATE","baseHead":"c72d6730bd235954091416268e7af649b46452d9","baseTree":"b2b49abd10c186115759f3792ecc8fd312049126","workflowBeforeSha256":"bd78b6279be1f9677bc04748f71f60553c1b2220f878bffbc0e2714a7841bcf6","workflowAfterSha256":"9928f59f9e6e4d2da59b6a7a0032805a227f6462e2ba06926f8de3832a0119b4","historicalWorkflowBeforeSha256":"8551796f634919621f6bbeff948f08f5f70aa3482f4a2f4f79758067640717de","historicalWorkflowAfterSha256":"5357ea3bb58c59d32e249716d9fb405b202211c06ddc1d00a93f2f80ce566e71"});
function git(args,input){const r=spawnSync('git',['--no-optional-locks',...args],{cwd:ROOT,input,maxBuffer:32*1024*1024});
 assert.equal(r.status,0,'SOURCE_PROOF_GIT_REQUIRED');return r.stdout;}
export function source19ProofBankRequired(files){
 assert(Array.isArray(files)&&files.every(x=>typeof x==='string'&&!x.includes('\\')&&!x.startsWith('/')&&!x.split('/').includes('..')));
 return files.some(file=>file.startsWith(CONTRACT.bankRoot+'/')||CONTRACT.scopePaths.includes(file));
}
export function projectSource19ProofBankWorkflow(value,{requireRegistered=false}={}){
 const actual=value.replaceAll('\r\n','\n'),digest=sha(actual);
 const predecessor=REGISTERED_PREDECESSOR_WORKFLOW_COMPOSITIONS.find(row=>row.workflowAfterSha256===digest);
 const expected=digest===CURRENT_WORKFLOW_COMPOSITION.workflowAfterSha256
  ?CURRENT_WORKFLOW_COMPOSITION.workflowBeforeSha256
  :predecessor?predecessor.workflowBeforeSha256
  :digest===CONTRACT.workflowAfterSha256?CONTRACT.workflowBeforeSha256:null;
 if(expected===null){
  assert.equal(requireRegistered,false,'SOURCE_PROOF_EXACT_WORKFLOW_REQUIRED');
  assert(!actual.includes('  source-proof-bank-native:\n'),'SOURCE_PROOF_CHANGED_JOB_REFUSED');return actual;
 }
 assert.equal(actual.split(CONTRACT.jobs).length,2);
 assert.equal(actual.split(CONTRACT.guard).length,2);
 const inverse=actual.replace(CONTRACT.jobs,'').replace(CONTRACT.guard,'');
 assert.equal(sha(inverse),expected,'Whole ordinary source gate unchanged');return inverse;
}
export async function testSource19CurrentCohortComposition({baselineRoot=ROOT,assetRoot=ROOT}={}){
 const spec={"descriptor":"scripts/fixtures/source19-terminal-proof-inputs-v2/current-cohort-v1/overlay.json","descriptorSha256":"3382d64eed90430af3e817f4b53ead3c7ef75aa6d4cd540766e3facee9ca933c","driverAsset":"scripts/fixtures/source19-terminal-proof-inputs-v2/current-cohort-v1/driver.source.txt","driverSha256":"3dffe008d1a3dde3c51bce038755b6abdc316b9e07ba4898741cf860bade2c66","inversePath":"scripts/fixtures/source19-terminal-proof-inputs-v2/current-cohort-v1/driver-inverse.json","inverseSha256":"b93448129b5f5a163b1d56a3e14aced3edb6650a61b77506b8a1c997e96c8343","wrapper":"scripts/run-source19-terminal-native-bank.py","wrapperSha256":"d8f22a11e00b0256430646ab0acca82524a97a66868e6385df6972abf2a8967c","baselineSha256":"6a68b86ebcb39db981875332b359fae36d6e9c4099401d6594560ef8d41c94c3"};
 const bytes=await fs.readFile(path.join(baselineRoot,CONTRACT.manifest));assert.equal(sha(bytes),spec.baselineSha256);
 const data=JSON.parse(bytes);assert.equal(data.files.length,298);assert.equal(data.baselinePins,27);
 const descBytes=await fs.readFile(path.join(assetRoot,spec.descriptor));assert.equal(sha(descBytes),spec.descriptorSha256);const desc=JSON.parse(descBytes);
 assert.equal(desc.kind,'CURRENT_INSTRUMENTED_SOURCE_PROOF_HOST');assert.equal(desc.sourceAdmission,false);assert.equal(desc.productionActivation,false);
 assert.equal(sha(JSON.stringify(desc.baselineProductPins)),data.productIdentity);assert.equal(Object.keys(desc.baselineProductPins).length,27);
 assert.equal(sha(JSON.stringify(desc.currentProductPins)),desc.currentProductIdentity);
 const get=async p=>{const row=data.files.find(r=>r.path===p);assert(row);const b=row.input.kind==='FROZEN_TEST_BANK'?await fs.readFile(path.join(baselineRoot,row.input.bankPath)):(()=>{const r=spawnSync('git',['cat-file','blob',row.input.gitBlob],{cwd:baselineRoot,maxBuffer:4*1024*1024});assert.equal(r.status,0);return r.stdout;})();assert.equal(sha(b),row.sha256);return b;};
 const current={...desc.baselineProductPins};
 for(const[p,pin]of Object.entries(desc.baselineProductPins))assert.equal(sha(await get(p)),pin);
 assert.deepEqual(desc.products.map(r=>r.path).sort(),['.github/actions/save-owned-dmi-grib/index.cjs','scripts/run-owned-dmi-grib-save.py']);
 for(const row of desc.products){const b=await fs.readFile(path.join(assetRoot,row.bankPath));assert.equal(sha(b),row.afterSha256);assert.equal(b.length,row.afterBytes);
  let inverse=b.toString();for(const h of [...row.inverseHunks].reverse()){assert.equal(inverse.split(h.after).length-1,h.count);inverse=inverse.split(h.after).join(h.before);}assert.equal(inverse,(await get(row.path)).toString());if(row.path in current)current[row.path]=row.afterSha256;}
 assert.deepEqual(current,desc.currentProductPins);
 const drv=await fs.readFile(path.join(assetRoot,spec.driverAsset)),inv=await fs.readFile(path.join(assetRoot,spec.inversePath));assert.equal(sha(drv),spec.driverSha256);assert.equal(sha(inv),spec.inverseSha256);
 let inverse=drv.toString();for(const h of JSON.parse(inv).reverse()){assert.equal(inverse.split(h.after).length-1,h.count);inverse=inverse.split(h.after).join(h.before);}assert.equal(inverse,(await get(data.driver)).toString());
 const wrapper=await fs.readFile(path.join(assetRoot,spec.wrapper));assert.equal(sha(wrapper),spec.wrapperSha256);
 assert(drv.toString().includes("source_current_cohort_install(seed, own / 'current-instrumented-cohort-originals'"));assert(drv.toString().indexOf('source_current_cohort_install(seed,')<drv.toString().indexOf('shutil.copytree(seed, root)',drv.toString().indexOf('class SourceTerminalFailureNative(')));
 assert(wrapper.toString().includes('files, observation_files = current_cohort_inputs(data, files)'));assert(wrapper.toString().includes('return current, current_cohort_observation_files(current, replacements)'));assert(wrapper.toString().includes('bounded_observation(observations[0], observation_files)'));assert(wrapper.toString().includes("bounded_action_observation(native_observation['actionObservation'], observation_files)"));assert(wrapper.toString().includes("report['currentInstrumentedInputProfile'] = CURRENT_PROOF_PROFILE"));
 return {kind:'SOURCE_CURRENT_INSTRUMENTED_COHORT_INPUT_CONTRACT',status:'PASS',historicalRows:298,historicalPins:27,currentProductOperands:2,currentDriver:true,wholeInverses:true,native:'UNRUN'};
}
export async function testSource19ProofBank(){
 const manifestBytes=await fs.readFile(path.join(ROOT,CONTRACT.manifest));assert.equal(sha(manifestBytes),CONTRACT.manifestSha256);
 const manifest=JSON.parse(manifestBytes);assert.equal(manifest.files.length,CONTRACT.files);assert.equal(manifest.testOnlyBankFiles,CONTRACT.testBank);
 assert.equal(manifest.fixedGitFiles,CONTRACT.fixedGit);assert.equal(manifest.sourceAdmission,false);assert.equal(manifest.productionActivation,false);
 const workflow=await fs.readFile(path.join(ROOT,'.github/workflows/validate-pull-request.yml'),'utf8');
 assert.equal(sha(workflow.replaceAll('\r\n','\n')),CURRENT_WORKFLOW_COMPOSITION.workflowAfterSha256,'Actual SOURCE CI must preserve the current P0 source gate');
 projectSource19ProofBankWorkflow(workflow,{requireRegistered:true});
 assert.equal(source19ProofBankRequired(['README.md']),false);
 for(const file of [...CONTRACT.scopePaths,CONTRACT.manifest,CONTRACT.bankRoot+'/operands/001.source.txt'])assert(source19ProofBankRequired([file]));
 const fixed=manifest.files.filter(r=>r.input.kind==='FIXED_NORMAL_GIT_BLOB');
 const bytes=git(['cat-file','--batch'],fixed.map(r=>manifest.ordinaryBase.commit+':'+r.path+'\n').join(''));
 let offset=0;const bodies=new Map();
 for(const row of fixed){const e=bytes.indexOf(10,offset);assert(e>offset);const header=bytes.subarray(offset,e).toString().split(' ');
  assert.equal(header[0],row.input.gitBlob);assert.equal(header[1],'blob');assert.equal(Number(header[2]),row.bytes);
  const body=bytes.subarray(e+1,e+1+row.bytes);assert.equal(sha(body),row.sha256);assert.equal(bytes[e+1+row.bytes],10);
  offset=e+2+row.bytes;bodies.set(row.path,body);}
 assert.equal(offset,bytes.length);
 const bankRows=manifest.files.filter(r=>r.input.kind==='FROZEN_TEST_BANK');assert.equal(bankRows.length,CONTRACT.testBank);
 for(const row of bankRows){const body=await fs.readFile(path.join(ROOT,row.input.bankPath));assert.equal(body.length,row.bytes);assert.equal(sha(body),row.sha256);
  assert.notEqual(sha(Buffer.concat([body,Buffer.from('changed')])),row.sha256);bodies.set(row.path,body);}
 const fixture=bodies.get(manifest.fixture).toString();
 const identity=JSON.parse(/const fixtureIdentity=Object\.freeze\((\{[\s\S]*?\})\);/.exec(fixture)[1]);
 const pins=JSON.parse(/const fixtureProductPins=Object\.freeze\((\{[\s\S]*?\})\);/.exec(fixture)[1]);
 assert.equal(Object.keys(pins).length,27);assert.equal(sha(JSON.stringify(pins)),manifest.productIdentity);
 for(const[file,pin]of Object.entries(pins))assert.equal(sha(bodies.get(file)),pin);
 assert.equal(identity.productIdentity,manifest.productIdentity);
 assert.equal(sha(bodies.get(identity.sourceOnlyProofBankParent.path)),identity.sourceOnlyProofBankParent.sha256);
 const helper=bodies.get('scripts/test-helpers/source19-native-import-closure.mjs');
 const scanner=bodies.get('scripts/lib/static-module-closure.mjs'),scannerSha=sha(scanner);
 const parser=await import('data:text/javascript;base64,'+helper.toString('base64'));
 assert.deepEqual(await parser.nativeProofLiteralImports('const source="import x from \'./false.mjs\'"; import x from "./real.mjs"; require("./local.cjs");',scanner,scannerSha),['./real.mjs','./local.cjs']);
 await assert.rejects(parser.nativeProofLiteralImports('import "./real.mjs";',scanner,'0'.repeat(64)));
 const fixedGitModule=await import('data:text/javascript;base64,'+bodies.get(CONTRACT.fixedGitOperands.helper).toString('base64'));
 await fixedGitModule.verifySource19GitOperandData({root:ROOT,dataBytes:bodies.get(CONTRACT.fixedGitOperands.path)});
 await assert.rejects(fixedGitModule.verifySource19GitOperandData({root:ROOT,
  dataBytes:Buffer.concat([bodies.get(CONTRACT.fixedGitOperands.path),Buffer.from('changed')])}),/SOURCE_GIT_PINNED_DATA/);
 const fixedGitData=JSON.parse(bodies.get(CONTRACT.fixedGitOperands.path));
 assert.equal(fixedGitData.commits.length,1);assert.equal(fixedGitData.commits[0].files.length,125);
 assert.equal(fixedGitData.commits[0].commit,'85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9');
 assert.equal(fixedGitData.commits[0].tree,'b7deb9eb805f5bdcd79ad0e02c1612bd99946d61');
 assert.equal(fixedGitData.selector.sha256,sha(bodies.get(fixedGitData.selector.path)));
 const dynamic=manifest.dynamicNormalModules;
 assert.equal(dynamic.caller,'scripts/materialize-dmi-bulk-storage.py');assert.equal(sha(bodies.get(dynamic.caller)),dynamic.callerSha256);
 assert.equal(dynamic.existingStaticImportClosure,12);
 assert.equal(dynamic.contract,'ALL_ACTUAL_LITERAL_CALLS_REQUIRED_IN_OUTER_AND_SEED');
 const actualDynamic=[...bodies.get(dynamic.caller).toString().matchAll(/\bnormal_module\("([a-z0-9-]+)"\)/g)].map(m=>'scripts/'+m[1]+'.py');
 assert.deepEqual(actualDynamic,['scripts/check-dmi-bulk-operational-ready.py','scripts/build-copernicus-target-registry.py','scripts/plan-dmi-recovery.py']);
 assert.deepEqual(dynamic.roots.map(r=>r.path),actualDynamic);
 const dynamicFixture=bodies.get('scripts/test-source19-union-native-early-terminal-proof-bank-v16-fixture.mjs').toString();
 function requireDynamicInputs(available,seedSource){
  for(const file of actualDynamic){assert(available.has(file),'SOURCE_DYNAMIC_MODULE_OUTER_MISSING:'+file);assert(seedSource.includes("    '"+file+"',"),'SOURCE_DYNAMIC_MODULE_SEED_MISSING:'+file);}
 }
 requireDynamicInputs(bodies,dynamicFixture);
 for(const file of actualDynamic){const missing=new Map(bodies);missing.delete(file);assert.throws(()=>requireDynamicInputs(missing,dynamicFixture),/SOURCE_DYNAMIC_MODULE_OUTER_MISSING/);assert.throws(()=>requireDynamicInputs(bodies,dynamicFixture.replace("    '"+file+"',",'')),/SOURCE_DYNAMIC_MODULE_SEED_MISSING/);}
 for(const row of dynamic.roots){assert.equal(sha(bodies.get(row.path)),row.sha256);assert.equal(bodies.get(row.path).length,row.bytes);}
 for(const row of dynamic.addedWholeFrozenOperands){const input=manifest.files.find(r=>r.path===row.path);assert.equal(input.input.kind,'FIXED_NORMAL_GIT_BLOB');assert.equal(input.input.gitBlob,row.gitBlob);assert.equal(input.sha256,row.sha256);}
 // New fixture only: normal bulk input must be valid BEFORE its new B.
 const prepareMissing=/async function prepareSource19UnionMissingBulk\(fixture\) \{[\s\S]*?\n\}/.exec(fixture)?.[0];
 assert(prepareMissing,'SOURCE_UNION_MISSING_BULK_CONSTRUCTOR_REQUIRED');
 const call='  await prepareSource19UnionMissingBulk(fixture);';
 const prepareB=fixture.slice(fixture.indexOf('async function prepareSource19UnionB('),fixture.indexOf('async function prepareSource19UnionCipher('));
 function requireBulkBeforeBundle(source){
  assert.equal(source.split(call).length,2,'SOURCE_UNION_MISSING_BULK_CALL_REQUIRED');
  assert(source.indexOf(call)<source.indexOf('  const spec=await workflow.buildPrivateRuntimeCreateSpec('),'SOURCE_UNION_MISSING_BULK_MUST_PRECEDE_B');
 }
 requireBulkBeforeBundle(prepareB);
 assert.throws(()=>requireBulkBeforeBundle(prepareB.replace(call,'')),/SOURCE_UNION_MISSING_BULK_CALL_REQUIRED/);
 const codecUrl='data:text/javascript;base64,'+bodies.get('scripts/lib/dmi-bulk-storage.mjs').toString('base64');
 const codec=await import(codecUrl);
 const helperSource=prepareMissing.replace("'../scripts/lib/dmi-bulk-storage.mjs'",JSON.stringify(codecUrl));
 const createMissing=Function('path','assert',helperSource+';return prepareSource19UnionMissingBulk;')(path,assert);
 const tempParent=await fs.realpath(os.tmpdir());
 const temporary=await fs.mkdtemp(path.join(tempParent,'rr-source-missing-bulk-input-'));
 try{
  const file=path.join(temporary,'data/live/dmi-bulk-cache.json');
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,'synthetic-generation-0-dmi-bulk-cache\n',{flag:'wx'});
  await assert.rejects(codec.readDmiBulkDocument(file),/DMI bulk input cannot be parsed/);
  await createMissing({repository:temporary});
  assert.deepEqual(await codec.readDmiBulkDocument(file),{zones:{}});
  assert.equal((await fs.lstat(file)).nlink,1);
 }finally{
  assert.equal(path.dirname(temporary),tempParent);
  assert(path.basename(temporary).startsWith('rr-source-missing-bulk-input-'));
  await fs.rm(temporary,{recursive:true,force:false});
 }
 const driver=bodies.get(manifest.driver).toString();
 const framing=manifest.nativeObserver.terminalMarkerFraming;
 assert.equal(sha(bodies.get(framing.producer)),framing.producerSha256);
 assert.equal(framing.summaryPrefix,'{"collectionsAttempted": ');
 assert.equal(framing.totalBytes,8*1024*1024);assert.equal(framing.pendingBytes,512*1024);
 assert.equal(manifest.nativeObserver.observerUnitBeforeSdkAndNative.terminalMarkerCases,7);
 for(const value of ['discarding_summary','summary_tail','SOURCE_TERMINAL_SUMMARY_PREFIX',"'firstTestFailure': first_test_failure",
  "sys.argv[1:] == ['--terminal-marker-unit']",'class SourceTerminalMarkerInputTests(unittest.TestCase):'])assert(driver.includes(value),value);
 for(const value of ['test_same_normal_summary_before_red_after_green','test_split_markers_remain_observable',
  'test_hidden_tokens_in_discarded_line_are_refused_across_chunks','test_unknown_and_oversized_marker_lines_remain_refused',
  'test_eight_mib_total_still_counts_discarded_diagnostics','test_first_test_failure_projection_has_only_fixed_code_and_phase'])assert(driver.includes('def '+value+'('));

 assert(driver.includes("if result['firstSafeCode'] in ('UNKNOWN', 'SOURCE_NORMAL_PHASE_FAILED'):"));
 assert(driver.includes('def test_generic_closed_phase_keeps_reason_and_only_qualified_frames(self):'));
 for(const value of ['def source_terminal_producer_stdin(pid):', 'def source_terminal_pidfd_exit_event(',
  'def test_permission_refusal_requires_actual_exited_pidfd_not_a_live_child(self):',
  "poller.poll(0), select.POLLIN, select.POLLHUP", "raise  # Live or unknown permission failure remains the SAME error.",
  "self.assertEqual(stdin_target, '/dev/null', 'REAL_SOURCE_PRODUCER_MUST_NOT_INHERIT_CONTROL')"])
  assert(driver.includes(value),value);
 for(const value of ['def source_terminal_exception_projection(', 'def source_terminal_first_exception(',
  'def source_terminal_exception_callsite(', "'firstTestException': first_test_exception",
  'def test_first_exception_projection_is_fixed_and_preserves_the_original_failure(self):'])assert(driver.includes(value),value);
 const firstExceptionAt=driver.indexOf('first_test_exception = source_terminal_first_exception(first_test_exception, error, observer_phase,');
 const terminalCleanupAt=driver.indexOf('owner.deadline = min(owner.deadline, time.monotonic() + 8)', driver.indexOf('class SourceTerminalFailureNative'));
 assert(firstExceptionAt>=0&&terminalCleanupAt>firstExceptionAt,'SOURCE_FIRST_EXCEPTION_MUST_PRECEDE_CLEANUP');

 for(const s of ["outer_alternate = ROOT / '.git/objects/info/alternates'",
  "(git / 'objects/info/alternates').open('xb')","str(seed / 'scripts/test-helpers/source19-native-git-operands.mjs')",
  "cwd=seed, env=clean_environment()"] )assert(driver.includes(s),s);
 assert(driver.indexOf("str(seed / 'scripts/test-helpers/source19-native-git-operands.mjs')")<driver.indexOf("str(seed / FIXTURE), '--prepare'"));
 const childRoots=new Set(manifest.requiredChildPrograms.map(r=>r.path));
 assert.deepEqual([...childRoots].sort(),['scripts/plan-ravscore-current-history.mjs','scripts/update-dmi-bulk.py']);
 for(const r of manifest.requiredChildPrograms)assert.equal(sha(bodies.get(r.path)),r.sha256);
 assert.equal(manifest.notObservedSuccessOnly.includes('scripts/update-coastal-point-staging.mjs'),true);
 assert.equal(bodies.has('scripts/update-coastal-point-staging.mjs'),false);
 const materializer=await fs.readFile(path.join(ROOT,CONTRACT.materializer));assert.equal(sha(materializer),CONTRACT.materializerSha256);
 for(const value of ['def bounded_first_test_exception(value, test_failure, files):',
  "bounded_first_test_exception(value['firstTestException'], test_failure, files)",
  'SOURCE_BANK_TEST_EXCEPTION_SHAPE', 'SOURCE_BANK_TEST_EXCEPTION_CALLSITE'])assert(materializer.toString().includes(value),value);
 for(const needle of ['def source_native_diagnostic_projection(stderr):',"result.update(source_native_diagnostic_projection(raw_logs['stderr']))",
  'class SourceObserverPureTests(unittest.TestCase):','class SourceObserverLinuxIoTests(unittest.TestCase):',"sys.argv[1:] == ['--observer-unit']",
  "'LINUX_PHYSICAL_IO_ORACLE_REQUIRED'",'st_mtime_ns, s.st_ctime_ns'])assert(driver.includes(needle),needle);
 for(const needle of ["report['stage'] = 'OBSERVER_UNIT'",'SOURCE_BANK_OBSERVER_UNIT_FAILED',"observer_unit.returncode != 0",
  "host / 'observer-unit-whole.stdout'","host / 'observer-unit-whole.stderr'",'observerUnitIoRefusal'])assert(materializer.toString().includes(needle),needle);
 assert(materializer.toString().indexOf("report['stage'] = 'OBSERVER_UNIT'")<materializer.toString().indexOf("report['stage'] = 'LOCKED_SDK'"));
 assert(materializer.toString().indexOf("SOURCE_BANK_OBSERVER_UNIT_FAILED")<materializer.toString().indexOf("report['stage'] = 'NATIVE'"));
 for(const value of ['SOURCE_BANK_TEST_FAILURE_SHAPE',"'firstTestFailure'",'SourceTerminalMarkerInputTests'])assert(materializer.toString().includes(value),value);
 for(const needle of ["'FIXED_NORMAL_GIT_BLOB'","'git', 'cat-file', 'blob'","'npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'",
  "'SOURCE_NATIVE_V17_BOUNDED_OBSERVATION'",'128 * 1024',"'sourceAdmission': False","'remoteCloudDurability': 'NOT_TESTED_LOCAL_SDK_PROTOCOL_ONLY'",
  "'stage': 'INPUTS'","metadata_result(report)","env=clean_environment()"])
  assert(materializer.toString().includes(needle),needle);
 for(const needle of ["'--git-path', 'objects'","common.resolve(strict=True) != common",
  "stat.S_ISLNK(info.st_mode)","common.stat().st_uid != os.geteuid()",
  "host / '.git/objects/info/alternates'","'stage'] = 'FIXED_GIT_OPERANDS'",
  "'seedGitOperands': 'UNKNOWN'","'normalCheckoutMutationObserved': 'UNKNOWN'",
  "'normalCheckoutWritesAuthorized': False","'fixedGitOperandFailureCode'"])
  assert(materializer.toString().includes(needle),needle);
 assert.doesNotMatch(materializer.toString(),/rmtree|git.*checkout|git.*clone|sourceAdmission[^\n]*True/);
 for(const needle of ['timeout-minutes: 35','retention-days: 7','if: always()','if-no-files-found: error',
  'path: .cache/source19-terminal-proof-result/result.json','node-version: 24','node-version: 22','python-version: "3.12"',
  'persist-credentials: false','--node24-path "$SOURCE_NODE24_PATH" --node22-path "$SOURCE_NODE22_PATH"'])assert(CONTRACT.jobs.includes(needle),needle);
 assert.doesNotMatch(CONTRACT.jobs,/continue-on-error|secrets\.|pull_request_target|workflow_dispatch|(?:contents|actions|pages|id-token): write|DMI_BULK_MAX_RUNTIME_SECONDS/);
 await testSource19CurrentCohortComposition();
 let guardCases=0;
 for(const scope of ['success','failure','skipped'])for(const required of ['true','false',''])for(const native of ['success','failure','skipped',null]){
  let expr=CONTRACT.guard.split('if: ')[1].trim().replaceAll('always()','true');
  for(const[k,v]of [['needs.source-proof-bank-scope.result',scope],['needs.source-proof-bank-scope.outputs.required',required],
   ['needs.source-proof-bank-native.result',native]])expr=expr.replaceAll(k,JSON.stringify(v));
  assert.equal(Function('return ('+expr+');')(),scope==='success'&&((required==='true'&&native==='success')||(required==='false'&&native==='skipped')));guardCases++;
 }
 for(const[from,to]of [['timeout-minutes: 35','timeout-minutes: 12'],['retention-days: 7','retention-days: 90'],
  ["needs.source-proof-bank-native.result == 'success'","needs.source-proof-bank-native.result != 'failure'"]])
  assert.throws(()=>projectSource19ProofBankWorkflow(workflow.replace(from,to),{requireRegistered:true}));
 return {kind:'SOURCE19_PROOF_BANK_NODE_CONTRACT',status:'PASS',files:CONTRACT.files,testBank:CONTRACT.testBank,fixedGit:CONTRACT.fixedGit,
  guardCases,wholeOrdinaryWorkflowInverse:true,ordinaryModelAndProductChanges:false,
  linuxMaterializer:'UNRUN',native:'UNRUN',remoteCloudDurability:'UNTESTED'};
}
async function scope(){
 const head=process.env.SOURCE19_PR_HEAD_SHA,base=process.env.SOURCE19_PR_BASE_SHA;
 assert.match(head??'',/^[a-f0-9]{40}$/);assert.match(base??'',/^[a-f0-9]{40}$/);
 assert.equal(git(['rev-parse','HEAD^{commit}']).toString().trim(),head);
 const files=git(['diff','--name-only','-z',base,head]).toString().split('\0').filter(Boolean);
 const required=source19ProofBankRequired(files);
 assert(path.isAbsolute(process.env.GITHUB_OUTPUT??''));
 await fs.appendFile(process.env.GITHUB_OUTPUT,'required='+String(required)+'\n');
 console.log(JSON.stringify({kind:'SOURCE19_PROOF_BANK_EXACT_SCOPE',required,changedPaths:files.length}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length===3&&process.argv[2]==='--scope')await scope();
 else{assert.equal(process.argv.length,2);console.log(JSON.stringify(await testSource19ProofBank()));}
}
