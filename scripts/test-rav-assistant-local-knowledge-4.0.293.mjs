import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suite = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/fixtures/rav-assistant-local-evals-v1.json'), 'utf8'));
const releaseVersion = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8')).version;
globalThis.localStorage = { getItem:() => null, setItem:() => {} };
const i18n = await import(`../js/i18n.js?v=${releaseVersion}`);
const assistant = await import('../js/services/rav-assistant.js');

assert.equal(suite.schemaVersion, 'rav-assistant-local-evals-v1');
assert.equal(suite.releaseVersion, releaseVersion);
const locales = new Map();
const topics = new Map();
let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { fetchCalls += 1; throw new Error('Lokale videnssvar må ikke bruge netværket.'); };

try {
  for (const item of suite.cases) {
    assert.match(item.id, /^(da|de|en)-[a-z0-9-]+$/);
    assert.equal(assistant.classifyRavQuestion(item.question), item.expectedIntent, `Forkert intent: ${item.id}`);
    assert.equal(assistant.routeRavQuestion(item.question), 'local-deterministic', `Forkert route: ${item.id}`);
    const answer = await assistant.askRavRadar(item.question, {}, { language:item.locale });
    assert.equal(answer, i18n.t(item.answerKey, {}, item.locale), `Forkert lokalt svar: ${item.id}`);
    assert.ok(answer.length >= 80 && answer.length <= 900, `Svarlængde uden for kontrakten: ${item.id}`);
    locales.set(item.locale, (locales.get(item.locale) || 0) + 1);
    topics.set(item.expectedIntent, (topics.get(item.expectedIntent) || 0) + 1);
  }
  for (const item of suite.phrasingCases || []) {
    assert.match(item.id, /^(da|de|en)-[a-z0-9-]+$/);
    assert.equal(assistant.classifyRavQuestion(item.question), item.expectedIntent, `Forkert intent: ${item.id}`);
    assert.equal(assistant.routeRavQuestion(item.question), 'local-deterministic', `Forkert route: ${item.id}`);
    const answer = await assistant.askRavRadar(item.question, {}, { language:item.locale });
    assert.equal(answer, i18n.t(item.answerKey, {}, item.locale), `Forkert lokalt svar: ${item.id}`);
  }
} finally {
  globalThis.fetch = originalFetch;
}

assert.equal(fetchCalls, 0);
assert.deepEqual(Object.fromEntries(locales), { da:17, de:17, en:17 });
assert.equal(topics.size, 17);
for (const [topic, count] of topics) assert.equal(count, 3, `${topic} skal have én reproducerbar case pr. sprog.`);

assert.match(i18n.t('assistant.local.model', {}, 'da'), /20 %.*50 %.*30 %/);
assert.match(i18n.t('assistant.local.model', {}, 'de'), /20 %.*50 %.*30 %/);
assert.match(i18n.t('assistant.local.model', {}, 'en'), /20%.*50%.*30%/);
assert.match(i18n.t('assistant.local.identification', {}, 'da'), /365 nm.*kun et indicium.*Undgå/is);
assert.match(i18n.t('assistant.local.identification', {}, 'de'), /365 nm.*Vermeide/is);
assert.match(i18n.t('assistant.local.identification', {}, 'en'), /365 nm.*Avoid/is);
assert.match(i18n.t('assistant.local.limitations', {}, 'da'), /aldrig garantere/i);
assert.match(i18n.t('assistant.local.limitations', {}, 'de'), /nie garantieren/i);
assert.match(i18n.t('assistant.local.limitations', {}, 'en'), /never guarantee/i);

console.log(`OK: ${suite.cases.length} lokale DA/DE/EN-evals og ${(suite.phrasingCases || []).length} naturlige formuleringer dækker ${topics.size} ravfaglige emner uden AI-kvote eller netværk.`);
