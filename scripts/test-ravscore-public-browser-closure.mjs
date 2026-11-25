import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  computeRavScoreModelBundle,
  renderGeneratedBundleModule,
} from './build-ravscore-model-bundle.mjs';
import {
  computeCandidateGRollbackBundle,
  renderCandidateGRollbackGeneratedModule,
} from './build-candidate-g-rollback-bundle.mjs';
import { ravScoreModelBinding as rollbackBinding } from './rollback-assets/ravscore-model-contract.js';
import {
  assertRavScorePublicBrowserClosure,
  computeRavScorePublicBrowserClosure,
} from './lib/ravscore-public-browser-closure.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  computeSealedPublicImplementationClosureIdentity,
} from './verify-ravscore-operational-pages-deployment.mjs';

const baseline = await computeRavScorePublicBrowserClosure();
assertRavScorePublicBrowserClosure(baseline.manifest);
assert.ok(baseline.manifest.files.some(item => item.path === 'js/services/protected-runtime-envelope.js'),
  'the public admin closure must include its protected runtime envelope decoder');
assert.ok(!baseline.manifest.files.some(item => item.path === 'js/services/runtime-diagnostics-archive.js'),
  'the retired diagnostics-named path must not remain in the public browser closure');
const [integratedContractText, integratedBundleText] = await Promise.all([
  fs.readFile('js/core/ravscore-model-contract.js', 'utf8'),
  fs.readFile('js/core/ravscore-model-bundle.generated.js', 'utf8'),
]);
const integratedIdentity = computeSealedPublicImplementationClosureIdentity({
  expectedModel: 'integrated',
  expectedBinding: ravScoreModelBinding(),
  expectedContractText: integratedContractText,
  expectedBundleText: integratedBundleText,
  expectedPublicClosure: baseline.manifest,
});
assert.match(integratedIdentity.implementationClosureSha256, /^[a-f0-9]{64}$/,
  'the actual integrated bundle must seal against the actual public browser closure');
const assistantPath = 'js/services/rav-assistant.js';
const assistantSource = await fs.readFile(assistantPath, 'utf8');
const assistantOnlyChange = new Map([[assistantPath, `${assistantSource}\n// assistant-only change\n`]]);
const [integrated, modifiedIntegrated, candidate, modifiedCandidate, modifiedBrowser] = await Promise.all([
  computeRavScoreModelBundle(),
  computeRavScoreModelBundle({ sourceOverrides: assistantOnlyChange }),
  computeCandidateGRollbackBundle(),
  computeCandidateGRollbackBundle({ sourceOverrides: assistantOnlyChange }),
  computeRavScorePublicBrowserClosure({ sourceOverrides: assistantOnlyChange }),
]);
assert.ok(!integrated.manifest.files.some(({ path }) => path === assistantPath));
assert.ok(!candidate.manifest.files.some(({ file }) => file === assistantPath));
assert.equal(integrated.modelBundleSha256, modifiedIntegrated.modelBundleSha256);
assert.equal(candidate.modelBundleSha256, modifiedCandidate.modelBundleSha256);
assert.notEqual(baseline.publicBrowserClosureSha256, modifiedBrowser.publicBrowserClosureSha256);

// Compute an unissued bundle in memory. The installed family above retains its historical seal.
const candidateContractText = await fs.readFile('scripts/rollback-assets/ravscore-model-contract.js', 'utf8');
const candidateBundleText = await fs.readFile('scripts/rollback-assets/ravscore-model-bundle.generated.js', 'utf8');
const priorRollbackSeal = {
  expectedModel: 'candidate-g',
  expectedBinding: rollbackBinding(),
  expectedContractText: candidateContractText,
  expectedBundleText: candidateBundleText,
  expectedPublicClosure: baseline.manifest,
};
assert.match(computeSealedPublicImplementationClosureIdentity(priorRollbackSeal).implementationClosureSha256, /^[a-f0-9]{64}$/);
assert.match(computeSealedPublicImplementationClosureIdentity({
  ...priorRollbackSeal,
  expectedBinding: { ...priorRollbackSeal.expectedBinding, modelBundleSha256: candidate.modelBundleSha256 },
  expectedBundleText: renderCandidateGRollbackGeneratedModule(candidate),
}).implementationClosureSha256, /^[a-f0-9]{64}$/);

const separatedInput = {
  expectedModel: 'integrated',
  expectedBinding: { ...ravScoreModelBinding(), modelBundleSha256: integrated.modelBundleSha256 },
  expectedContractText: integratedContractText,
  expectedBundleText: renderGeneratedBundleModule(integrated),
};
const separatedIdentity = computeSealedPublicImplementationClosureIdentity({
  ...separatedInput, expectedPublicClosure: baseline.manifest,
});
const modifiedIdentity = computeSealedPublicImplementationClosureIdentity({
  ...separatedInput, expectedPublicClosure: modifiedBrowser.manifest,
});
assert.notEqual(separatedIdentity.implementationClosureSha256, modifiedIdentity.implementationClosureSha256);
assert.throws(() => computeSealedPublicImplementationClosureIdentity({
  ...separatedInput,
  expectedPublicClosure: { ...baseline.manifest, files: baseline.manifest.files.filter(({ path }) => path !== assistantPath) },
}), /Sealed public browser closure omits js\/services\/rav-assistant\.js/);

for (const file of [
  'app.js',
  'bootstrap.js',
  'service-worker.js',
  'js/ui/admin-active-ravscore.js',
]) {
  const source = await fs.readFile(file, 'utf8');
  const changed = await computeRavScorePublicBrowserClosure({
    sourceOverrides: new Map([[file, `${source}\n// public-artifact-mutation\n`]]),
  });
  assert.notEqual(changed.publicBrowserClosureSha256, baseline.publicBrowserClosureSha256,
    `${file} must be bound by the separate public browser closure`);
}
const bootstrap = await fs.readFile('bootstrap.js', 'utf8');
await assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([[
    'bootstrap.js',
    `${bootstrap}\nconst hiddenModule = './evil.js'; void import(hiddenModule);\n`,
  ]]),
}), /non-literal or unparsed dynamic import/);
await assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([[
    'bootstrap.js',
    `${bootstrap}\nvoid \`${'${import("./evil.js")}'}\`;\n`,
  ]]),
}), /cannot be resolved: bootstrap\.js -> \.\/evil\.js/);
const html = await fs.readFile('index.html', 'utf8');
const adminHtml = await fs.readFile('admin.html', 'utf8');
await assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([['index.html', html.replace('<body>', '<body onload="import(\'./evil.js\')">')]]),
}), /unmodeled executable surface/);
await assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([['index.html', html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline' ")]]),
}), /same-origin script policy/);
assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([['index.html', html.replace('src="bootstrap.js', 'src="evil.js')]]),
}), /exact bootstrap surface/);
await assert.rejects(() => computeRavScorePublicBrowserClosure({
  sourceOverrides: new Map([[
    'admin.html',
    adminHtml.replace('src="js/ui/admin-dashboard.js', 'src="js/ui/evil-admin.js'),
  ]]),
}), /exact bootstrap surface/);

console.log(`Public browser closure binds index/admin HTML, bootstrap/app/service-worker/admin model UI and ${baseline.manifest.files.length} transitive deployed modules independently of model identity.`);
