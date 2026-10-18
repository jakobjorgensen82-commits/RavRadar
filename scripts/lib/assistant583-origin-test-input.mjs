// TEST ONLY: exact whole inverse of the reviewed583 denial/source-check hunks.
// No production caller imports this module and no runtime result is stubbed.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sha=source=>crypto.createHash('sha256').update(source).digest('hex');
const edits=[
  {
    "before": "export const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v2';",
    "after": "// Generated I038 retains its genuine v1/default behavior while this source is\n// still unissued. This is a DENIAL gate, never metadata or source authority.\nconst ORIGINAL140000_I='038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f';\nexport const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT =\n  ravScoreModelBinding().modelBundleSha256 === ORIGINAL140000_I\n    ? 'established-native-current-continuation-v1' : 'established-native-current-continuation-v2';",
    "all": false,
    "count": 1
  },
  {
    "before": "need(['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION', 'SAME_H0_MODEL_METADATA'].includes(attest.transition), 'TRANSITION');",
    "after": "need((ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT === 'established-native-current-continuation-v1'\n    ? ['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION']\n    : ['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION', 'SAME_H0_MODEL_METADATA']).includes(attest.transition), 'TRANSITION');",
    "all": false,
    "count": 1
  },
  {
    "before": "  const old = assertAuthenticatedFrozen140000Snapshot(handle);",
    "after": "  need(ravScoreModelBinding().modelBundleSha256 !== ORIGINAL140000_I, 'METADATA_UNISSUED');\n  const old = assertAuthenticatedFrozen140000Snapshot(handle);",
    "all": false,
    "count": 1
  },
  {
    "before": "  need(!metadataConsumed.has(handle), 'METADATA_ALREADY_CONSUMED');",
    "after": "  need(!metadataConsumed.has(handle), 'METADATA_ALREADY_CONSUMED');\n  // The I038 comparison above only denies the unissued branch. Admission\n  // additionally requires BOTH complete normal generated-model checks, not a\n  // caller tuple/flag or a hash inequality. No static builder/NEXT import may\n  // make this bound source depend on its own generated checksum.\n  const builders = ['scripts/build-candidate-g-rollback-bundle.mjs', 'scripts/build-ravscore-model-bundle.mjs'];\n  await git(['diff', '--exit-code', 'HEAD', '--', ...builders,\n    'scripts/lib/model-source-imports.mjs', 'scripts/lib/static-module-closure.mjs']);\n  for (const builder of builders) await exec(process.execPath, [path.join(ROOT, builder), '--check'],\n    { cwd: ROOT, env: sourceEnv(), encoding: 'utf8', maxBuffer: 2 * MB, timeout: 60000 });",
    "all": false,
    "count": 1
  }
];
export function inverseAssistant583Origin(source){
 assert.equal(sha(source),'056d88253e4975e424af6df2b4fcf5f029c9fae72b4ad90ead4f06bfad503b98');
 let value=source;for(const edit of [...edits].reverse()){
  assert.equal(value.split(edit.after).length,2);value=value.replace(edit.after,()=>edit.before);
 }
 assert.equal(sha(value),'e9d378c8f2c23f225884e595690c4ca9868d97ffa482db40ed78359742a03a42');
 return value;
}
