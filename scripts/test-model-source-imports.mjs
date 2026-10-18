import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';
import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const normalized = source => source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
const pins = [
  ['scripts/lib/established-native-current-origin.mjs', 'e9d378c8f2c23f225884e595690c4ca9868d97ffa482db40ed78359742a03a42', 15],
  ['scripts/check-native-current-reanalysis-predecessor-source.mjs', '1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d', 0],
  ['scripts/protected-private-production-runtime.mjs', 'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762', 6],
  ['scripts/private-production-runtime-bundle.mjs', '2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529', 3],
  ['scripts/check-established-native-current-origin-predecessor-source.mjs', 'cb2743d4c7caff798667c6eb61436d9bc662fb321c37e3844e52f4b70eabce69', 0],
  ['scripts/lib/authenticated-frozen140000-predecessor.mjs', 'ae78ab5dfbf03ef9eba4b9955c10d2cc2c8cbb588703728da91c0ef9bbb52d73', 1],
];

test('only complete reviewed model leaves use their exact frozen inventories', async () => {
  for (const [file, pin, count] of pins) {
    const source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
    assert.equal(sha(source), pin);
    const imports = modelSourceRelativeModuleSpecifiers(source, file);
    assert.equal(imports.length, count); assert(Object.isFrozen(imports));
    assert.equal(new Set(imports).size, count);
    assert(imports.every(value => value.startsWith('./') || value.startsWith('../')));
    assert.deepEqual(modelSourceRelativeModuleSpecifiers('\uFEFF' + source.replaceAll('\n', '\r\n'), file), imports);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source + '\n// changed byte\n', file), /Whole reviewed model import source changed/);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source + "\nimport './hidden.mjs';\n", file), /Whole reviewed model import source changed/);
  }
});

test('reviewed origin inventory is the whole static graph plus its fixed historical read', async () => {
  const file = pins[0][0], source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
  const dynamic = 'import(pathToFileURL(path.join(sourceRoot, file)).href)';
  assert.equal(source.split(dynamic).length, 2);
  // Remove ONLY the reviewed immutable-root import to let the UNCHANGED
  // lexer independently enumerate every ordinary relative import.
  const ordinary = exactRelativeModuleSpecifiers(source.replace(dynamic, "import('node:fs')"), file);
  assert.deepEqual([...modelSourceRelativeModuleSpecifiers(source, file)].sort(), [...ordinary].sort());
  assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'scripts/lib/not-the-reviewed-origin.mjs'),
    /non-literal or unparsed dynamic import/);
});

test('unknown modules retain every exact lexer positive and rejection', () => {
  for (const source of ["import { x } from './one.mjs'; export { y } from '../two.js';",
    "const x = import('./literal.mjs');", "const s = `not an import ${1 + 2}`;", '/import\\(/.test("text");'])
    assert.deepEqual(modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'), exactRelativeModuleSpecifiers(source, 'ordinary.mjs'));
  for (const source of ['import(variable)', "import('./x.mjs' + suffix)", 'import(`./${name}.mjs`)', 'import(unknown.path)']) {
    assert.throws(() => exactRelativeModuleSpecifiers(source, 'ordinary.mjs'));
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'ordinary.mjs'));
  }
});

test('both normal builders differ only by the explicit shared import-inventory call', async () => {
  for (const file of ['scripts/build-ravscore-model-bundle.mjs', 'scripts/build-candidate-g-rollback-bundle.mjs']) {
    const before = normalized(execFileSync('git', ['-C', ROOT, 'show', 'd7b31aa3c706e2f657fe5de99c56434f3cff260d:' + file],
      { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 }));
    const after = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
    const declaration = "import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';";
    assert.equal(after.split(declaration).length, 2);
    let inverse = after.replace(declaration, "import { exactRelativeModuleSpecifiers } from './lib/static-module-closure.mjs';");
    assert.equal(inverse.split('modelSourceRelativeModuleSpecifiers(').length, 2);
    inverse = inverse.replace('modelSourceRelativeModuleSpecifiers(', 'exactRelativeModuleSpecifiers(');
    assert.equal(inverse, before);
  }
});

test('frozen140000 helper and snapshot reader inventories include every ordinary relative import', async () => {
  const leaves = [
    ['scripts/check-established-native-current-origin-predecessor-source.mjs', [
      "import('data:text/javascript;base64,'+Buffer.from(executableModel).toString('base64'))",
      "import('data:text/javascript;base64,'+(await bytes(file,index)).toString('base64'))",
      'import(pathToFileURL(path.join(root,T)).href)',
      "import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href)",
    ], []],
    ['scripts/lib/authenticated-frozen140000-predecessor.mjs', [
      'import(pathToFileURL(path.join(frozenRoot,file)).href)',
    ], ['../check-established-native-current-origin-predecessor-source.mjs']],
  ];
  for (const [file, dynamicImports, expected] of leaves) {
    const source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
    let ordinary = source;
    for (const expression of dynamicImports) {
      assert.equal(ordinary.split(expression).length, 2, 'One whole reviewed immutable-root import');
      ordinary = ordinary.replace(expression, "import('node:fs')");
    }
    assert.deepEqual(exactRelativeModuleSpecifiers(ordinary, file), expected);
    assert.deepEqual([...modelSourceRelativeModuleSpecifiers(source, file)], expected);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(source, 'scripts/not-a-reviewed-140000-leaf.mjs'),
      /non-literal or unparsed dynamic import/);
    // No local/future source can replace fixed family bytes or add an import.
    for (const changed of [source.replace('85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9',
      '07534c1480fcf8da546dfb0a7b242e512aee7e93'), source + "\nimport './future.mjs';\n"]) {
      assert.notEqual(changed, source);
      assert.throws(() => modelSourceRelativeModuleSpecifiers(changed, file), /Whole reviewed model import source changed/);
    }
  }
});

test('SAME_H0 actual origin has only one new relative dependency and the whole old140000 inverse', async () => {
  const file = 'scripts/lib/established-native-current-origin.mjs';
  const source = normalized(await fs.readFile(path.join(ROOT, file), 'utf8'));
  assert.equal(sha(source), 'e9d378c8f2c23f225884e595690c4ca9868d97ffa482db40ed78359742a03a42');
  const oldImports = [
  "../protected-private-production-runtime.mjs",
  "../protected-ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-bundle.mjs",
  "../ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-workflow.mjs",
  "../../js/core/ravscore-model-contract.js",
  "../rollback-assets/ravscore-model-contract.js",
  "../../js/core/ravscore-model-bundle.generated.js",
  "./ravscore-sampling-context.mjs",
  "./coastal-point-staging-contract.mjs",
  "./ravscore-candidate-g-rollback-runtime.mjs",
  "./private-weather-component-pack.mjs",
  "../check-native-current-reanalysis-predecessor-source.mjs",
  "./ravscore-production-part-pipeline.mjs"
];
  const dependency = './authenticated-frozen140000-predecessor.mjs';
  const current = modelSourceRelativeModuleSpecifiers(source, file);
  assert.deepEqual([...current], [...oldImports, dependency]);
  assert.equal(current.length, 15);
  const edits = [
  {
    "before": "import { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\n",
    "after": "import { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen140000Snapshot } from './authenticated-frozen140000-predecessor.mjs';\n"
  },
  {
    "before": "export const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';",
    "after": "export const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v2';"
  },
  {
    "before": "const contexts = new WeakMap(), failedCloses = new Map();",
    "after": "const contexts = new WeakMap(), failedCloses = new Map(), metadataConsumed = new WeakSet();"
  },
  {
    "before": "need(['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION'].includes(attest.transition), 'TRANSITION');",
    "after": "need(['SEED_METADATA_ONLY', 'NORMAL_STRICT_CONTINUATION', 'SAME_H0_MODEL_METADATA'].includes(attest.transition), 'TRANSITION');"
  },
  {
    "before": "  const seed = descriptor.bundleContentSha256 === SEED.B;\n",
    "after": "  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seed) need(ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT === 'established-native-current-continuation-v1', 'SEED_ALREADY_ISSUED');\n"
  },
  {
    "before": "  need(arguments.length === 0, 'ARGUMENTS');\n  for (const [key, value]",
    "after": "  need(arguments.length === 0, 'ARGUMENTS');\n  need(ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT === 'established-native-current-continuation-v1', 'SEED_ALREADY_ISSUED');\n  for (const [key, value]"
  },
  {
    "before": "",
    "after": "\n// Explicit later binding event. ONLY the separate fixed authenticated OLD140000\n// snapshot can authorize it; ordinary/seed handles and serialized data cannot.\n// This grants neither normal ForPart nor fabricated strict-production results.\nexport async function buildEstablishedNativeCurrentSameH0MetadataAttestation(handle, options) {\n  need(arguments.length === 2 && exact(options, ['centralContract', 'conditions']), 'ARGUMENTS');\n  const old = assertAuthenticatedFrozen140000Snapshot(handle);\n  need(!metadataConsumed.has(handle), 'METADATA_ALREADY_CONSUMED');\n  const currentSource = await sourceIdentity();\n  const oldI = old.checkpoint.modelBinding, oldC = old.checkpoint.candidateGRollbackCompanion.modelBinding;\n  const contracts = await privateRuntimeContractHashes();\n  need(currentSource.integrated !== oldI.modelBundleSha256\n    && currentSource.candidate !== oldC.modelBundleSha256\n    && currentSource.continuation !== old.checkpoint.continuationStateContractSha256, 'METADATA_UNISSUED');\n  need(same({ ...oldI, modelBundleSha256: currentSource.integrated }, ravScoreModelBinding())\n    && same({ ...oldC, modelBundleSha256: currentSource.candidate }, candidateBinding())\n    && same({ ...old.descriptor.contractHashes,\n      continuationStateContractSha256: currentSource.continuation }, contracts), 'METADATA_CONTRACT_CHANGED');\n  const { centralContract, conditions } = options;\n  need(same(centralContract, old.centralContract), 'METADATA_REGISTRY_CHANGED');\n  const parts = registryParts(centralContract), pairs = pairsFromConditions(conditions, parts);\n  need(conditions.datasetId === old.descriptor.datasetId\n    && conditions.productionReferenceAt === old.descriptor.productionReferenceAt\n    && same(conditions[ATTEST], old.attestation), 'METADATA_TARGET_CHANGED');\n  need(old.attestation.semanticContract === 'established-native-current-continuation-v1'\n    && SHA.test(old.attestation.attestationSha256), 'METADATA_PARENT');\n  for (const [id, pair] of pairs) {\n    const oldIntegrated = old.checkpoint.states[id], oldCandidate = old.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI = structuredClone(pair.integrated), inverseG = structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256 === currentSource.integrated, 'METADATA_BINDING');\n    inverseI.modelBundleSha256 = oldIntegrated.modelBundleSha256;\n    if (Object.hasOwn(inverseG, 'modelBundleSha256')) {\n      need(inverseG.modelBundleSha256 === currentSource.candidate, 'METADATA_BINDING');\n      inverseG.modelBundleSha256 = oldCandidate.modelBundleSha256;\n    }\n    need(same(inverseI, oldIntegrated) && same(inverseG, oldCandidate), 'METADATA_NUMERICAL_CHANGE');\n  }\n  // Source/HEAD and physical required blobs must still be the same actual new\n  // normal source after validating every H0 pair. No caller tuple is accepted.\n  need(same(await sourceIdentity(), currentSource), 'SOURCE_CHANGED');\n  const content = { schemaVersion: 1, kind: KIND,\n    semanticContract: ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT, seed: { ...SEED },\n    parent: { bundleContentSha256: old.descriptor.bundleContentSha256,\n      generationSha256: old.checkpoint.generationSha256,\n      attestationSha256: old.attestation.attestationSha256 },\n    producer: { ...currentSource }, datasetId: conditions.datasetId, referenceAt: conditions.productionReferenceAt,\n    registrySha256: digest(centralContract), contextRegistrySha256: contextDigest(pairs),\n    pairsSha256: pairsDigest(pairs), transition: 'SAME_H0_MODEL_METADATA' };\n  const attestation = { ...content, attestationSha256: digest(content) };\n  need(Buffer.byteLength(canonical(attestation)) <= MAX_ATTEST, 'ATTESTATION_SIZE');\n  metadataConsumed.add(handle);\n  return freeze(attestation);\n}\n",
    "append": true
  }
];
  let inverse = source;
  for (const edit of [...edits].reverse()) {
    assert.equal(inverse.split(edit.after).length, 2, 'Exact whole reviewed origin inverse hunk');
    inverse = inverse.replace(edit.after, edit.before);
  }
  assert.equal(sha(inverse), 'e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42', 'Entire genuine old140000 origin, not a pin retag');
  const dynamic = 'import(pathToFileURL(path.join(sourceRoot, file)).href)';
  assert.equal(inverse.split(dynamic).length, 2);
  assert.deepEqual([...exactRelativeModuleSpecifiers(inverse.replace(dynamic, "import('node:fs')"), file)].sort(),
    [...oldImports].sort(), 'All fourteen old imports remain unchanged');
  assert.equal(oldImports.length, 14);
  assert.throws(() => modelSourceRelativeModuleSpecifiers(inverse, file), /Whole reviewed model import source changed/,
    'Historical bytes cannot masquerade as current SAME_H0 source');
  const declaration = "import { assertAuthenticatedFrozen140000Snapshot } from './authenticated-frozen140000-predecessor.mjs';\n";
  assert.equal(source.split(declaration).length, 2);
  for (const changed of [source.replace(declaration, ''), source + declaration]) {
    assert.notEqual(changed, source);
    assert.throws(() => modelSourceRelativeModuleSpecifiers(changed, file), /Whole reviewed model import source changed/);
  }
});
