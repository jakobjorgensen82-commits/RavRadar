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
const localKnowledge = await import('../knowledge/rav-assistant-local-v2.js');
const sourceRegistry = await import('../knowledge/rav-assistant-sources-v1.js');

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
    const specificAnswer = localKnowledge.localRavKnowledgeAnswer(item.question, item.locale);
    assert.equal(answer, specificAnswer || i18n.t(item.answerKey, {}, item.locale), `Forkert lokalt svar: ${item.id}`);
    assert.ok(answer.length >= 80 && answer.length <= 900, `Svarlængde uden for kontrakten: ${item.id}`);
    locales.set(item.locale, (locales.get(item.locale) || 0) + 1);
    topics.set(item.expectedIntent, (topics.get(item.expectedIntent) || 0) + 1);
  }
  for (const item of suite.phrasingCases || []) {
    assert.match(item.id, /^(da|de|en)-[a-z0-9-]+$/);
    assert.equal(assistant.classifyRavQuestion(item.question), item.expectedIntent, `Forkert intent: ${item.id}`);
    assert.equal(assistant.routeRavQuestion(item.question), 'local-deterministic', `Forkert route: ${item.id}`);
    const answer = await assistant.askRavRadar(item.question, {}, { language:item.locale });
    const specificAnswer = localKnowledge.localRavKnowledgeAnswer(item.question, item.locale);
    assert.equal(answer, specificAnswer || i18n.t(item.answerKey, {}, item.locale), `Forkert lokalt svar: ${item.id}`);
  }

  assert.ok(localKnowledge.LOCAL_RAV_KNOWLEDGE.length >= 150, 'Den kildeklassificerede lokale vidensbase skal have mindst 150 afgrænsede emner.');
  assert.equal(new Set(localKnowledge.LOCAL_RAV_KNOWLEDGE.map(topic => topic.id)).size, localKnowledge.LOCAL_RAV_KNOWLEDGE.length, 'Lokale vidensemne-id’er skal være unikke.');
  assert.ok(Object.keys(sourceRegistry.RAV_ASSISTANT_SOURCES).length >= 25, 'Den eksterne/officielle kildebase skal være væsentligt bredere end Grundbogen alene.');
  for (const [sourceId, source] of Object.entries(sourceRegistry.RAV_ASSISTANT_SOURCES)) {
    assert.ok(source.title && source.url && source.evidenceClass && source.checked, `${sourceId} mangler offentlig kildekontrakt.`);
    assert.doesNotMatch(JSON.stringify(source), /(?:coordinates|raw[ _-]?[uv]|api.?key|credential|password)/iu, `${sourceId} må ikke indeholde privat eller intern kontekst.`);
  }
  assert.equal(
    Object.keys(localKnowledge.LOCAL_RAV_KNOWLEDGE_EXAMPLES).length,
    localKnowledge.LOCAL_RAV_KNOWLEDGE.length,
    'Hvert lokalt vidensemne skal have reproducerbare spørgsmål på tre sprog.'
  );
  const languageIndexes = { da:0, de:1, en:2 };
  for (const topic of localKnowledge.LOCAL_RAV_KNOWLEDGE) {
    assert.ok(topic.evidenceClass, `${topic.id} mangler evidensklasse.`);
    assert.ok(sourceRegistry.validateRavAssistantSourceIds(topic.sourceIds), `${topic.id} mangler gyldig offentlig kildeproveniens.`);
    assert.doesNotMatch(Object.values(topic.answers).join('\n'), /365\s*nm/iu, `${topic.id} genindfører den forkerte UV-anbefaling.`);
    const examples = localKnowledge.LOCAL_RAV_KNOWLEDGE_EXAMPLES[topic.id];
    assert.equal(examples.length, 3, `${topic.id} skal have DA/DE/EN-eksempler.`);
    for (const [locale, index] of Object.entries(languageIndexes)) {
      const question = examples[index];
      const match = localKnowledge.matchLocalRavKnowledge(question);
      assert.equal(match?.id, topic.id, `Videnseksemplet blev matchet til forkert emne: ${topic.id}/${locale}`);
      assert.equal(assistant.routeRavQuestion(question), 'local-deterministic', `Videnseksemplet blev ikke besvaret lokalt: ${topic.id}/${locale}`);
      const answer = await assistant.askRavRadar(question, {}, { language:locale });
      assert.equal(answer, topic.answers[locale], `Forkert katalogsvar: ${topic.id}/${locale}`);
      assert.ok(answer.length >= 70 && answer.length <= 900, `Katalogsvar uden for kontrakten: ${topic.id}/${locale}`);
    }
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
assert.match(i18n.t('assistant.local.identification', {}, 'da'), /395 nm.*kun et indicium.*Undgå/is);
assert.match(i18n.t('assistant.local.identification', {}, 'de'), /395 nm.*Vermeide/is);
assert.match(i18n.t('assistant.local.identification', {}, 'en'), /395 nm.*Avoid/is);
for (const [question, intent, language, marker] of [
  ['Hvad er en ravlygte?', 'lamp', 'da', /395 nm/],
  ['Welche Farben kann Bernstein haben?', 'colours', 'de', /weiß.*gelb.*braun/is],
  ['How should I clean amber?', 'care', 'en', /clean water/i],
  ['Er vinteren bedst til rav?', 'seasons', 'da', /hele året/i],
  ['Was ist ein sekundäres Bernsteinlager?', 'geology', 'de', /sekundär(?:e|es).*Lager/i],
  ['Should I search on the beach or in waders?', 'beach-or-water', 'en', /Beach.*Wading/is],
]) {
  assert.equal(assistant.classifyRavQuestion(question), intent);
  assert.equal(assistant.routeRavQuestion(question), 'local-deterministic');
  assert.match(await assistant.askRavRadar(question, {}, { language }), marker);
}
for (const [question, language, marker] of [
  ['Hvad er hvidt fosfor på stranden?', 'da', /selvantænde.*Rør det ikke/is],
  ['Was ist weißer Phosphor am Strand?', 'de', /selbst entzünden.*Nicht berühren/is],
  ['What is white phosphorus on the beach?', 'en', /self-ignite.*Do not touch/is],
]) {
  assert.equal(assistant.classifyRavQuestion(question), 'knowledge:white-phosphorus');
  assert.equal(assistant.routeRavQuestion(question), 'local-deterministic');
  assert.match(await assistant.askRavRadar(question, {}, { language }), marker);
}
assert.match(i18n.t('assistant.local.limitations', {}, 'da'), /aldrig garantere/i);
assert.match(i18n.t('assistant.local.limitations', {}, 'de'), /nie garantieren/i);
assert.match(i18n.t('assistant.local.limitations', {}, 'en'), /never guarantee/i);

console.log(`OK: ${suite.cases.length} basis-evals, ${(suite.phrasingCases || []).length} naturlige formuleringer og ${localKnowledge.LOCAL_RAV_KNOWLEDGE.length * 3} katalog-evals dækker ${topics.size + localKnowledge.LOCAL_RAV_KNOWLEDGE.length} lokale emnekontrakter uden AI-kvote eller netværk.`);
