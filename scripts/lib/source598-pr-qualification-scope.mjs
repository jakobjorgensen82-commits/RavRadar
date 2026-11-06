// Exact normal Source PR script/workflow adaptation over actual main876.
// Pure validation only; no native result, source session or production claim.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {requireSourceProducerOutput} from './source-producer-after597-runtime-family.mjs';
import {SOURCE_PRODUCER_AFTER597_PARENT} from './source-producer-after597-parent.mjs';
const BASE='8761272ca0b401eae84ea0f129460fb1b3d15e2f';
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function original(relative,pin){
  requireSourceProducerOutput();
  const raw=execFileSync('git',['-c','protocol.allow=never','cat-file','blob',BASE+':'+relative],
    {maxBuffer:1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}});
  assert.equal(sha(raw),pin);return raw.toString('utf8');
}
const PACKAGE_SHA256="4280d63bde98249b01123a05e49fbffb2614615390a4ff68531ec853e579d3b0";
const WORKFLOW_SHA256="407a84f9a0159fff736b04624d029208451ef27e241a078eb8a0b4d16406469e";
const ASSISTANT_BEFORE="node scripts/build-assistant-later-h0-successor.mjs --active --check && node scripts/national584-source-evidence.mjs assistant-after597-source";
const ASSISTANT_AFTER="node --input-type=module -e \"import {withSource598CodeParent} from './scripts/check-assistant-later-h0-predecessor-source.mjs'; await withSource598CodeParent(()=>{});\" && npm run test:source-producer-source && node scripts/national584-source-evidence.mjs source";
const WORKFLOW_HUNKS=[
  {
    "before": "          python -B scripts/test-owned-dmi-grib-save-native.py --node24-path \"$(command -v node)\"\n",
    "after": "          python -B scripts/test-owned-dmi-grib-save-native.py --node24-path \"$(command -v node)\"\n          printf 'node24_path=%s\\n' \"$(command -v node)\" >> \"$GITHUB_OUTPUT\"\n        id: source-native-node24\n"
  },
  {
    "before": "      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n        if: ${{ steps.source-content.outputs.selection != 'TARGETED' }}\n        shell: bash\n        env:\n          GITHUB_TOKEN: ${{ github.token }}\n          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}\n        run: |\n          set -euo pipefail\n          node --test scripts/test-native-postgres-evidence.mjs\n          node scripts/native-postgres-evidence.mjs\n\n",
    "after": "      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n        if: ${{ steps.source-content.outputs.selection != 'TARGETED' }}\n        shell: bash\n        env:\n          GITHUB_TOKEN: ${{ github.token }}\n          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}\n          RAVRADAR_SOURCE_NATIVE_NODE24_PATH: ${{ steps.source-native-node24.outputs.node24_path }}\n        run: |\n          set -euo pipefail\n          node --test scripts/test-native-postgres-evidence.mjs\n          node scripts/native-postgres-evidence.mjs\n\n"
  }
];
export function verifySourcePrPackage(pkg){
  requireSourceProducerOutput();assert.equal(arguments.length,1);
  const base=JSON.parse(original('package.json',PACKAGE_SHA256));
  assert.equal(base.scripts['test:assistant-later-h0-source'],ASSISTANT_BEFORE);
  assert(!Object.hasOwn(base.scripts,'test:source-producer-source'));
  const expected={...base.scripts,'test:assistant-later-h0-source':ASSISTANT_AFTER,
    'test:source-producer-source':'node scripts/build-source-producer-successor.mjs --check'};
  assert(pkg&&Object.getPrototypeOf(pkg)===Object.prototype);
  assert.equal(pkg.version,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);
  assert.deepEqual(pkg.scripts,expected,'Every existing ordinary source/privacy command must remain');
}
// Exact historical package inspection only, after normal current validation.
// The returned genuine876 bytes are never an installed/runtime/source proof.
export function sourcePrHistoricalPackageInspection(pkg){
  requireSourceProducerOutput(); // FIRST before caller fields or fixed Git read.
  assert.equal(arguments.length,1);verifySourcePrPackage(pkg);
  const base=JSON.parse(original('package.json',PACKAGE_SHA256));
  assert.deepEqual({...pkg,version:base.version,scripts:base.scripts},base,
    'Only the exact real release and two Source script changes may be inspected historically');
  return base;
}
export function verifySourcePrWorkflow(source){
  requireSourceProducerOutput();assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  let expected=original('.github/workflows/validate-pull-request.yml',WORKFLOW_SHA256);
  for(const row of WORKFLOW_HUNKS){assert.equal(expected.split(row.before).length,2);expected=expected.replace(row.before,()=>row.after);}
  assert.equal(source,expected,'Only the fixed Node24 output and native env bridge are permitted;180m is unchanged');
}
