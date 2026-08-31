import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readProductionWorkflowSource } from './lib/production-workflow-sources.mjs';

const [app, observationService, learningAnalysis, serviceWorker, buildWorkflow] = await Promise.all([
  fs.readFile('app.js', 'utf8'),
  fs.readFile('js/services/observation-service.js', 'utf8'),
  fs.readFile('js/services/learning-analysis.js', 'utf8'),
  fs.readFile('service-worker.js', 'utf8'),
  readProductionWorkflowSource('build'),
]);

assert.doesNotMatch(app, /prediction-engine|predictAmberChance|adaptive-model|loadAdaptiveModel|withPrediction|\.prediction\s*=/,
  'the public app must expose exactly the bound RavScore result, without an adaptive probability layer');
assert.doesNotMatch(learningAnalysis, /adaptive-model|decisionHistory|applyApprovedSuggestion/,
  'coverage-only learning analysis must not load a score-changing model');
assert.doesNotMatch(serviceWorker, /adaptive-model|prediction-engine/,
  'the retired probability path must not be pre-cached as public runtime');
for (const file of [
  'js/core/score-engine.js',
  'js/core/adaptive-model.js',
  'js/core/prediction-engine.js',
]) {
  assert.match(buildWorkflow, new RegExp(`--exclude '${file.replaceAll('/', '\\/')}'`),
    `${file} must be absent from the public Pages artifact`);
}
assert.match(observationService,
  /ai_probability:null,ai_confidence:null,model_version:observedRavScoreModelVersion\(scoreResult\)/,
  'legacy-compatible observations must never persist an invented probability or unverified model identity');
assert.match(observationService,
  /assertRavScoreModelBinding\(scoreResult\?\.modelBinding,'Observation RavScore model binding'\)/,
  'legacy-compatible observations may bind the integrated model only after exact 11-field validation');
assert.doesNotMatch(observationService, /publicPredictionSnapshot|scoreResult\?\.prediction|prediction\?\.probability/,
  'observation persistence must not revive the retired probability layer');

console.log('Den adaptive fundchance er pensioneret fra offentlig runtime; én RavScore-model ejer score og modelbinding.');
