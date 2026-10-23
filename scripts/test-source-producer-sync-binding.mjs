// Actual source-phase contract only. No fabricated issued tuple, SQL source,
// installation or production proof may make the positive branch pass early.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {exactRelativeModuleSpecifiers} from './lib/static-module-closure.mjs';
import {runInNewContext} from 'node:vm';
import {computeCandidateGRollbackBundle,renderCandidateGRollbackGeneratedModule,CANDIDATE_G_ROLLBACK_BUNDLE_EXCLUDED_MODULES}
  from './build-candidate-g-rollback-bundle.mjs';
import {computeRavScoreModelBundle,renderGeneratedBundleModule,RAVSCORE_MODEL_BUNDLE_EXCLUDED_MODULES}
  from './build-ravscore-model-bundle.mjs';
import {SOURCE_PRODUCER_DERIVED_METADATA_PATH,MODEL_RELEASE_ONLY_DEPENDENCIES,
  assertSourceProducerDerivedMetadata,sourceProducerDerivedMetadataFromText}
  from './lib/source-producer-derived-metadata.mjs';
import {PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES} from './private-production-runtime-workflow.mjs';
import {parseSealedRavScoreBundleModule} from './verify-ravscore-operational-pages-deployment.mjs';
import {SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,SOURCE_PRODUCER_ALIASES,
  requireSourceProducerOutput,requireSourceProducerBinding,readSourceProducerCanonicalSource,
  sourceProducerDefinition} from './lib/source-producer-successor-source.mjs';
import {ASSISTANT_LATER_H0_ALIASES} from './lib/assistant-later-h0-successor-source.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_ALIASES} from './lib/native-original-continuity-successor-source.mjs';
import {sourceProducerCheckpointInspectionView,checkpointMetadataCasBlock}
  from './sync-ravscore-model-binding.mjs';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';
import {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';

test('SOURCE derived output is strict data, never executable source or an alternate caller tuple',async()=>{
  const raw=await fs.readFile(new URL('../'+SOURCE_PRODUCER_DERIVED_METADATA_PATH,import.meta.url),'utf8');
  const value=sourceProducerDerivedMetadataFromText(raw);
  assert(Object.isFrozen(value));
  assert.deepEqual(value.binding,SOURCE_PRODUCER_BINDING);
  assert.deepEqual(value.output,SOURCE_PRODUCER_OUTPUT);
  // These are rejection-only probes of the actual metadata shape. They do not
  // manufacture an issued C/I/T tuple, SQL source, handle or positive receipt.
  const changed=edit=>{const copy=JSON.parse(raw);edit(copy);return JSON.stringify(copy,null,2)+'\n';};
  for(const mutation of [
    changed(copy=>{copy.extra='unknown';}),
    changed(copy=>{copy.schemaVersion='unknown';}),
    changed(copy=>{copy.version='not-a-migration';}),
    changed(copy=>{copy.binding={};}),
    changed(copy=>{copy.output={};}),
    raw.replace('"schemaVersion":','"schemaVersion": "duplicate",\n  "schemaVersion":'),
    raw+'\n',raw+'export const hidden = true;\n',raw+' '.repeat(8193),
  ])assert.throws(()=>sourceProducerDerivedMetadataFromText(mutation));
  assert.throws(()=>assertSourceProducerDerivedMetadata(value,{}));
  assert.throws(()=>sourceProducerDerivedMetadataFromText(raw,{}));
});

test('SOURCE connected archive loaders retain every current dependency and reject unknown bytes',async()=>{
  const rows=[
  {
    "file": "scripts/account-statistics-assistant-prewrite.mjs",
    "sha256": "44c1ef4edaab1d446cf7696eb5dcacfd49a618ee8788997ce88c740fe59a7761",
    "imports": [
      "./account-statistics-assistant-runtime-transition.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs"
    ],
    "computed": [
      [
        "import(pathToFileURL(path.join(frozenRoot,p)).href)",
        1
      ]
    ]
  },
  {
    "file": "scripts/account-statistics-assistant-runtime-transition.mjs",
    "sha256": "f3101b3d5d6c7df7dd42d560d2a9d99c6dbee6cc6904397c95c6256f8144d8fd",
    "imports": [
      "./lib/bounded-json-writer.mjs",
      "./lib/established-native-current-origin.mjs",
      "./lib/authenticated-frozen584-predecessor.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./protected-private-production-runtime.mjs"
    ],
    "computed": [
      [
        "import(pathToFileURL(path.join(frozenRoot,p)).href)",
        2
      ],
      [
        "import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href)",
        1
      ]
    ]
  },
  {
    "file": "scripts/migrate-post-cutover-private-runtime.mjs",
    "sha256": "1b097d22f4102dc80f8d2c917dbaead896ceb3e7b8f364992d3422c4d010d9f6",
    "imports": [
      "./private-production-runtime-workflow.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/public-hour-delivery-pack.mjs",
      "./lib/rebind-public-hour-pack-exact.mjs",
      "./lib/private-conditions-hourly.mjs",
      "./public-conditions-lib.mjs",
      "../js/core/ravscore-public-runtime-contract.js",
      "./lib/coastal-point-staging-contract.mjs",
      "../js/core/ravscore-model-contract.js",
      "../js/core/ravscore-public-profile-contract.js",
      "../js/core/ravscore-integrated-state-pipeline.js",
      "../js/core/ravscore-integrated.js",
      "../js/core/ravscore-public-model.js",
      "./lib/ravscore-production-adapters.mjs",
      "./lib/ravscore-integrated-runtime.mjs",
      "./audit-ravscore-integrated-public-runtime.mjs",
      "./rollback-assets/ravscore-model-contract.js",
      "./runtime-binding-registry.mjs",
      "./lib/bounded-json-writer.mjs",
      "./lib/ravscore-production-part-pipeline.mjs",
      "./lib/dmi-marine-zone-exclusions.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./private-production-runtime-bundle.mjs",
      "./protected-private-production-runtime.mjs",
      "./check-native-identity-frozen-i71-source.mjs"
    ],
    "computed": [
      [
        "import(`${stagingUrl.href}${query}`)",
        1
      ],
      [
        "import(`${integratedUrl.href}${query}`)",
        1
      ],
      [
        "import(`${candidateUrl.href}${query}`)",
        1
      ],
      [
        "import(pathToFileURL(path.join(predecessor,\n    'scripts/private-production-runtime-bundle.mjs')).href)",
        1
      ],
      [
        "import(pathToFileURL(path.join(frozenRoot, relative)).href)",
        1
      ]
    ]
  },
  {
    "file": "scripts/check-last-mile-enclosure-predecessor-source.mjs",
    "sha256": "ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3",
    "imports": [],
    "computed": []
  },
  {
    "file": "scripts/check-native-identity-frozen-i71-source.mjs",
    "sha256": "21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    "imports": [],
    "computed": []
  }
];
  for(const row of rows){
    const source=(await fs.readFile(new URL('../'+row.file,import.meta.url),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sha256);
    const imports=modelSourceRelativeModuleSpecifiers(source,row.file);
    assert(Object.isFrozen(imports));assert.deepEqual(imports,row.imports);
    assert.equal(new Set(imports).size,row.imports.length);
    assert.deepEqual(modelSourceRelativeModuleSpecifiers('\uFEFF'+source.replaceAll('\n','\r\n'),row.file),imports);
    assert.throws(()=>exactRelativeModuleSpecifiers(source,row.file),/non-literal or unparsed dynamic import/);
    if(row.computed.length){
      let literal=source;
      for(const [expression,count]of row.computed){
        assert.equal(literal.split(expression).length-1,count);
        literal=literal.replaceAll(expression,"import('node:fs')");
      }
      assert.deepEqual(exactRelativeModuleSpecifiers(literal,row.file),row.imports,'All ordinary imports remain bound');
    }
    for(const changed of [source+'\n',source+"\nimport './hidden.mjs';\n",
      row.computed.length?source.replace(row.computed[0][0],'import(unknown)'):source.replace(/^const HEAD\s*=/m,'const CHANGED_HEAD=')]){
      assert(changed!==source,'Each exact-source mutation must change its actual input');
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,row.file),/Whole reviewed model import source changed/);
    }
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source,'unreviewed.mjs'),/non-literal or unparsed dynamic import/);
  }
});
test('SOURCE actual C/I closures bind implementation without hashing their own derived output',async()=>{
  const [candidate,integrated]=await Promise.all([computeCandidateGRollbackBundle(),computeRavScoreModelBundle()]);
  const implementation=[
    'scripts/lib/source-producer-successor-source.mjs',
    'scripts/lib/source-producer-derived-metadata.mjs',
    'scripts/source-normal-producer-entry.mjs',
    'scripts/source-normal-producer-tail.mjs',
    'scripts/reconcile-private-runtime-checkpoint.mjs',
    'scripts/integrated-cutover-readiness.mjs',
    'scripts/lib/private-weather-component-pack.mjs',
    'scripts/lib/ravscore-production-part-pipeline.mjs',
    'scripts/account-statistics-assistant-prewrite.mjs',
    'scripts/account-statistics-assistant-runtime-transition.mjs',
    'scripts/migrate-post-cutover-private-runtime.mjs',
    'scripts/check-last-mile-enclosure-predecessor-source.mjs',
    'scripts/check-native-identity-frozen-i71-source.mjs',
  ];
  assert.deepEqual(MODEL_RELEASE_ONLY_DEPENDENCIES,['scripts/ravscore-operational-activation.mjs']);
  assert.deepEqual(RAVSCORE_MODEL_BUNDLE_EXCLUDED_MODULES,[
    'js/core/ravscore-model-bundle.generated.js',SOURCE_PRODUCER_DERIVED_METADATA_PATH,
    'scripts/ravscore-operational-activation.mjs',
  ]);
  assert.deepEqual(CANDIDATE_G_ROLLBACK_BUNDLE_EXCLUDED_MODULES,[
    'js/core/ravscore-model-bundle.generated.js','js/core/ravscore-model-contract.js',
    'scripts/rollback-assets/ravscore-model-bundle.generated.js',SOURCE_PRODUCER_DERIVED_METADATA_PATH,
    'scripts/ravscore-operational-activation.mjs',
  ]);
  const releaseOnly=[
    'app.js','bootstrap.js','service-worker.js','scripts/prepare-candidate-g-operational-rollback.mjs',
    'scripts/install-candidate-g-rollback-stage.mjs','scripts/audit-candidate-g-rollback-public-runtime.mjs',
    'scripts/verify-ravscore-operational-pages-deployment.mjs','scripts/ravscore-operational-activation.mjs',
  ];
  for(const bundle of [candidate,integrated]){
    const files=bundle.manifest.files.map(row=>row.path??row.file);
    for(const file of implementation)assert(files.includes(file),file+' actual implementation must remain bound');
    for(const file of [SOURCE_PRODUCER_DERIVED_METADATA_PATH,...releaseOnly])
      assert(!files.includes(file),file+' is derived output or established release-only tooling');
    assert(bundle.manifest.normalizationId.endsWith('derived-data-v3'));
  }
  assert(candidate.manifest.excludedModules.includes(SOURCE_PRODUCER_DERIVED_METADATA_PATH));
  assert(!Object.hasOwn(integrated.manifest,'excludedModules'),'Existing five-field public I manifest shape is preserved');
  // Actual newly computed source manifests must pass the unchanged normal
  // public reader. These derived parser inputs are NOT an issued SQL family.
  for(const [model,bundle,render,binding] of [
    ['integrated',integrated,renderGeneratedBundleModule,ravScoreModelBinding()],
    ['candidate-g',candidate,renderCandidateGRollbackGeneratedModule,candidateBinding()],
  ])assert.deepEqual(parseSealedRavScoreBundleModule(render(bundle),{
    model,binding:{...binding,modelBundleSha256:bundle.modelBundleSha256},
  }).manifest,bundle.manifest);
  for(const file of [SOURCE_PRODUCER_DERIVED_METADATA_PATH,...MODEL_RELEASE_ONLY_DEPENDENCIES,
    'scripts/lib/source-producer-derived-metadata.mjs','scripts/source-normal-producer-tail.mjs'])
    assert(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.includes(file),file+' physical source must still be checked');
});

test('normal SOURCE committed-source guard rejects absent or untracked derived output',async()=>{
  const source=await fs.readFile(new URL('./source-normal-producer-entry.mjs',import.meta.url),'utf8');
  const start=source.indexOf('function assertCommittedSource(identity) {');
  const end=source.indexOf('\nfunction clockSample()',start);
  assert(start>=0&&end>start);
  const self='scripts/source-normal-producer-entry.mjs';
  const files=[...new Set([...PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES,self])];
  const head='a'.repeat(40),blob='b'.repeat(40);
  const rows=files.map(file=>'100644 blob '+blob+'\t'+file);
  const run=tree=>{
    const calls=[];
    const guard=runInNewContext('('+source.slice(start,end).trim()+')',{
      PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES,SELF:self,ROOT:'synthetic-source-root',
      need(condition,code){assert(condition,code);},
      git(args){
        calls.push(Array.from(args));
        if(args[0]==='rev-parse')return head;
        if(args[0]==='diff')return '';
        assert.deepEqual(Array.from(args),['ls-tree','-rz','HEAD','--',...files]);
        return tree.join('\0')+'\0';
      },
      execFileSync(command,args){
        assert.equal(command,'git');
        assert.deepEqual(Array.from(args),['-C','synthetic-source-root','cat-file','-t','HEAD:'+self]);
        return 'blob\n';
      },
    });
    guard({GITHUB_SHA:head});
    assert(calls.some(args=>args[0]==='diff'&&args.includes(SOURCE_PRODUCER_DERIVED_METADATA_PATH)));
  };
  // Synthetic I/O exercises the unchanged actual guard function, not a real
  // merged main, source proof, origin or production-admission receipt.
  run(rows);
  for(const changed of [
    rows.filter(row=>!row.endsWith('\t'+SOURCE_PRODUCER_DERIVED_METADATA_PATH)),
    rows.map(row=>row.endsWith('\t'+SOURCE_PRODUCER_DERIVED_METADATA_PATH)?row.replace(/^100644/,'120000'):row),
    rows.map(row=>row.endsWith('\t'+SOURCE_PRODUCER_DERIVED_METADATA_PATH)?rows[0]:row),
    [...rows,'100644 blob '+blob+'\tscripts/foreign.mjs'],
  ])assert.throws(()=>run(changed));
});

test('normal SOURCE binding synchronizer uses its actual issued canonical source or refuses unissued',async()=>{
  if(SOURCE_PRODUCER_BINDING===null){
    assert.equal(SOURCE_PRODUCER_OUTPUT,null);
    let accesses=0;
    const untouched=new Proxy({},{get(){accesses++;throw new Error('UNEXPECTED_INPUT');},
      getPrototypeOf(){accesses++;throw new Error('UNEXPECTED_INPUT');}});
    assert.throws(()=>sourceProducerCheckpointInspectionView(untouched),/SOURCE_PRODUCER_UNISSUED/);
    assert.equal(accesses,0);return;
  }
  requireSourceProducerOutput();const binding=requireSourceProducerBinding();
  assert.equal(ravScoreModelBinding().modelBundleSha256,binding.I);
  assert.equal(candidateBinding().modelBundleSha256,binding.C);
  const {canonicalSource}=await readSourceProducerCanonicalSource();
  const before=canonicalSource;
  const view=sourceProducerCheckpointInspectionView(canonicalSource);
  const block=checkpointMetadataCasBlock(canonicalSource,ravScoreModelBinding(),candidateBinding(),binding.T);
  for(const row of SOURCE_PRODUCER_ALIASES){
    const whole=sourceProducerDefinition(canonicalSource,row.name);
    assert(block.includes(whole),'The actual mutable SQL block retains every whole original/projection');
  }
  for(const row of SOURCE_PRODUCER_ALIASES.slice(0,2)){
    const whole=sourceProducerDefinition(canonicalSource,row.name);
    assert(!view.includes(whole),'Only the inspection view excludes the exact frozen alias');
    for(const changed of [canonicalSource.replace(whole,''),canonicalSource+'\n'+whole,
      canonicalSource.replace(whole,whole.replace('begin\n','begin\n  -- UNKNOWN\n'))])
      {
        assert.throws(()=>sourceProducerCheckpointInspectionView(changed));
        assert.throws(()=>checkpointMetadataCasBlock(changed,ravScoreModelBinding(),candidateBinding(),binding.T));
      }
  }
  // Genuine587 already contains its own preserved586 and585 aliases. The
  // inspection must omit those marker comments too, without touching SQL.
  for(const row of [...ASSISTANT_LATER_H0_ALIASES,...NATIVE_ORIGINAL_CONTINUITY_ALIASES.slice(0,2)]){
    const whole=sourceProducerDefinition(canonicalSource,row.name);
    assert(block.includes(whole),'Inherited original remains whole in synchronized SQL');
    assert(!view.includes(whole),'Inherited original comments are inspection-only exclusions');
    for(const changed of [canonicalSource.replace(whole,''),canonicalSource+'\n'+whole,
      canonicalSource.replace(whole,whole.replace('begin\n','begin\n  -- UNKNOWN\n'))]){
      assert.throws(()=>sourceProducerCheckpointInspectionView(changed));
      assert.throws(()=>checkpointMetadataCasBlock(changed,ravScoreModelBinding(),candidateBinding(),binding.T));
    }
  }
  let missingBoth=canonicalSource;
  for(const row of SOURCE_PRODUCER_ALIASES.slice(0,2))
    missingBoth=missingBoth.replace(sourceProducerDefinition(missingBoth,row.name),'');
  assert.throws(()=>checkpointMetadataCasBlock(missingBoth,ravScoreModelBinding(),candidateBinding(),binding.T),
    'Actual issued phase still pins the whole source when both frozen aliases are absent');
  assert.throws(()=>sourceProducerCheckpointInspectionView(canonicalSource+'\n'));
  assert.equal(canonicalSource,before);
});

test('SOURCE sync extension has an exact whole genuine587 inverse and no ordinary-branch edits',async()=>{
  const raw=await fs.readFile(new URL('./lib/source-producer-sync-binding-review.json',import.meta.url));
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(sha(raw),'a2afabb8994e54ef72ab8e2df192dbd4c8ada5d2b6006a652bef3529a94831f4');
  const review=JSON.parse(raw);
  assert.equal(review.kind,'TEST_ONLY_GENUINE587_SOURCE_SYNC_LITERAL_INVERSE');
  assert.equal(review.file,'scripts/sync-ravscore-model-binding.mjs');
  assert.equal(review.edits.length,6);
  assert.equal(new Set(review.edits.map(row=>row.label)).size,6);
  const source=await fs.readFile(new URL('./sync-ravscore-model-binding.mjs',import.meta.url),'utf8');
  const verify=value=>{
    assert.equal(Buffer.byteLength(value),review.after.bytes);
    assert.equal(sha(value),review.after.sha256,'Only the exact additive SOURCE variant');
    let before=value;
    for(const row of [...review.edits].reverse()){
      assert.equal(before.split(row.after).length,2,'Every literal inverse must occur exactly once');
      before=before.replace(row.after,()=>row.before);
    }
    assert.equal(Buffer.byteLength(before),review.before.bytes);
    assert.equal(sha(before),review.before.sha256,'Whole genuine587 synchronizer, including586/585');
    let replay=before;
    for(const row of review.edits){
      assert.equal(replay.split(row.before).length,2);
      replay=replay.replace(row.before,()=>row.after);
    }
    assert.equal(replay,value);
    return before;
  };
  verify(source);
  for(const row of review.edits){
    assert.throws(()=>verify(source.replace(row.after,()=>row.before)));
    assert.throws(()=>verify(source.replace(row.after,()=>row.after+row.after)));
    assert.throws(()=>verify(source.replace(row.after,()=>row.after+'\n// UNKNOWN\n')));
  }
  for(const changed of [source+'\n',source.replace('return outer.text;','return currentView;'),
    source.replace("const VERSION_PATH = 'version.json';","const VERSION_PATH = 'other.json';")])
    assert.throws(()=>verify(changed));
});
