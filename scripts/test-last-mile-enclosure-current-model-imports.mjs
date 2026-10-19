// Current584 positive/negative source checks, separate from whole old140000 oracles.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import test from 'node:test';
import { modelSourceRelativeModuleSpecifiers } from './lib/model-source-imports.mjs';
import { requireLastMileEnclosureBinding } from './lib/last-mile-enclosure-successor-source.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { ravScoreContinuationImplementationSha256 } from './lib/ravscore-continuation-implementation-contract.mjs';
test('actual current584 source inventory includes archive kernel and rejects changed whole module',async()=>{
  const family=requireLastMileEnclosureBinding();
  assert.equal(ravScoreModelBinding().modelBundleSha256,family.I);
  assert.equal(candidateBinding().modelBundleSha256,family.C);
  assert.equal(await ravScoreContinuationImplementationSha256(),family.T);
  const file='scripts/lib/established-native-current-origin.mjs';
  const source=(await fs.readFile(new URL('./lib/established-native-current-origin.mjs',import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),
    '2828947062b3fd0afa24eca48f8ee8f782c1b6b3287da3127be2aeccaf6b234d');
  const imports=modelSourceRelativeModuleSpecifiers(source,file);
  assert.deepEqual(imports,['../protected-private-production-runtime.mjs',
    '../protected-ravscore-continuation-checkpoint.mjs','../private-production-runtime-bundle.mjs',
    '../ravscore-continuation-checkpoint.mjs','../private-production-runtime-workflow.mjs',
    '../../js/core/ravscore-model-contract.js','../rollback-assets/ravscore-model-contract.js',
    '../../js/core/ravscore-model-bundle.generated.js','./ravscore-sampling-context.mjs',
    './coastal-point-staging-contract.mjs','./ravscore-candidate-g-rollback-runtime.mjs',
    './private-weather-component-pack.mjs','../check-native-current-reanalysis-predecessor-source.mjs',
    './ravscore-production-part-pipeline.mjs','./weather-state-epoch-archive.mjs']);
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// changed module\n',file),
    /Whole reviewed model import source changed/);
  const withoutKernel=source.replace("from './weather-state-epoch-archive.mjs'", "from './missing-archive-kernel.mjs'");
  assert.notEqual(withoutKernel,source);
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(withoutKernel,file),/Whole reviewed model import source changed/);
});
