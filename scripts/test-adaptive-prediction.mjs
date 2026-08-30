import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [app, observationService, learningAnalysis, serviceWorker, workflow] = await Promise.all([
  fs.readFile('app.js', 'utf8'),
  fs.readFile('js/services/observation-service.js', 'utf8'),
  fs.readFile('js/services/learning-analysis.js', 'utf8'),
  fs.readFile('service-worker.js', 'utf8'),
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8'),
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
  assert.match(workflow, new RegExp(`--exclude '${file.replaceAll('/', '\\/')}'`),
    `${file} must be absent from the public Pages artifact`);
}
assert.match(observationService, /ai_probability:null,ai_confidence:null,model_version:RAVSCORE_MODEL_ID/,
  'legacy-compatible observations must bind the integrated RavScore and never persist an invented probability');
assert.doesNotMatch(observationService, /publicPredictionSnapshot|scoreResult\?\.prediction|prediction\?\.probability/,
  'observation persistence must not revive the retired probability layer');

console.log('Den adaptive fundchance er pensioneret fra offentlig runtime; én RavScore-model ejer score og modelbinding.');
