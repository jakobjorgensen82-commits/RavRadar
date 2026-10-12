import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { after, test } from 'node:test';

// Actual UI, lazy-details caller, assistant and i18n. Only browser primitives
// and explicitly named transport failure seams are synthetic; no network.
const version = JSON.parse(await fs.readFile(new URL('../version.json', import.meta.url))).version;
const savedFetch = globalThis.fetch;
const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let language = 'da';
let fetchCalls = 0;
globalThis.localStorage = { getItem: key => key === 'ravradar-language' ? language : null };
globalThis.fetch = () => { fetchCalls += 1; throw Error('NETWORK_FORBIDDEN'); };
after(() => {
  globalThis.fetch = savedFetch;
  if (savedStorage) Object.defineProperty(globalThis, 'localStorage', savedStorage);
  else delete globalThis.localStorage;
});
const assistant = await import(`../js/services/rav-assistant.js?v=${version}`);
const i18n = await import(`../js/i18n.js?v=${version}`);
const data = await import(`../js/services/data-service.js?v=${version}`);
const app = await fs.readFile(new URL('../app.js', import.meta.url), 'utf8');
const detailStart = app.indexOf('function ensureConditionDetails(');
const detailEnd = app.indexOf('function nextConditionRuntimeGateAt(', detailStart);
const assistantStart = app.indexOf('let assistantTopicState = null;');
const assistantEnd = app.indexOf('const quickBox=', assistantStart);
assert.ok(detailStart >= 0 && detailEnd > detailStart && assistantStart >= 0 && assistantEnd > assistantStart);
const actualUi = app.slice(detailStart, detailEnd) + app.slice(assistantStart, assistantEnd);
for (const definition of ['let assistantTurn = 0;', 'function resetAssistantTopic()',
  'function assistantTopicFrame()', 'function sameAssistantTopicFrame(', 'function assistantContext(){']) {
  assert.ok(actualUi.includes(definition), `Actual UI extraction must include its lexical dependency: ${definition}`);
}

function fixture(locale, { manifest, load = data.loadConditionDetails } = {}) {
  language = locale;
  const messages = [];
  const listeners = new Map();
  const eventTarget = owner => ({ addEventListener(type, callback) {
    const key = `${owner}:${type}`;
    assert.equal(listeners.has(key), false);
    listeners.set(key, callback);
  } });
  const assistantDialog = eventTarget('dialog'), assistantForm = eventTarget('form');
  let detailCalls = 0;
  const box = { scrollTop: 0, scrollHeight: 0, appendChild(node) { messages.push(node); } };
  const state = { selectedZone: null, conditions: { zones: {} }, zones: [], mode: 'waders' };
  const context = vm.createContext({
    state, assistantDialog, activeManifest: manifest, runtimeGeneration: 0, conditionDetailsReady: false,
    conditionDetailsPromise: null, pendingZoneDetails: new Map(),
    document: {
      querySelector(selector) {
        if (selector === '#assistantForm') return assistantForm;
        assert.equal(selector, '#assistantMessages'); return box;
      },
      createElement() {
        const node = { children: [], className: '', textContent: '',
          appendChild(child) { this.children.push(child); },
          querySelector(selector) { assert.equal(selector, 'p'); return this.children[0]; },
          classList: { remove(name) { assert.equal(name, 'loading'); node.className = node.className.replace(' loading', ''); } },
        };
        return node;
      },
    },
    zoneCondition: zone => state.conditions.zones[zone?.id] || {},
    currentDisplayFor: () => ({ weather: {}, result: null }),
    getLanguage: () => locale,
    t: (key, params) => i18n.t(key, params, locale),
    askRavRadar: assistant.askRavRadar,
    assistantTopicForQuestion: assistant.assistantTopicForQuestion,
    assistantLocalFollowupAnswer: assistant.assistantLocalFollowupAnswer,
    ravQuestionNeedsConditionDetails: assistant.ravQuestionNeedsConditionDetails,
    loadConditionDetails: (...args) => { detailCalls += 1; return load(...args); },
  });
  vm.runInContext(actualUi, context);
  return {
    context, state,
    submit: question => vm.runInContext(`submitAssistantQuestion(${JSON.stringify(question)})`, context),
    answers: () => messages.filter(item => !item.className.includes('user')).map(item => item.children[0].textContent),
    loading: () => messages.some(item => item.className.includes('loading')),
    detailCalls: () => detailCalls,
    recover: () => { context.conditionDetailsReady = true; },
    topic: () => vm.runInContext('assistantTopicState?.topic ?? null', context),
    emit: (owner, type) => {
      const callback = listeners.get(`${owner}:${type}`);
      assert.equal(typeof callback, 'function');
      callback({});
    },
  };
}

test('actual extracted topic state/frame/reset dependencies remain live, not guard stubs', async () => {
  const ui = fixture('da');
  const question = 'Når strømmen går langs stranden i stedet for mod land, er det så stadig godt at lede efter rav?';
  const followup = 'Så hvor skal jeg kigge efter rav i den situation?';
  assert.equal(assistant.assistantTopicForQuestion(question), 'alongshore');
  for (const [owner, type] of [['dialog', 'close'], ['dialog', 'cancel'], ['form', 'reset']]) {
    await ui.submit(question);
    assert.equal(ui.topic(), 'alongshore');
    ui.emit(owner, type);
    assert.equal(ui.topic(), null, `The actual ${owner}/${type} listener must clear its own topic`);
    await ui.submit(followup);
    assert.equal(ui.answers().at(-1), i18n.t('assistant.unknown', {}, 'da'));
  }
  await ui.submit(question);
  assert.equal(ui.topic(), 'alongshore');
  ui.state.conditions = { zones: {} };
  await ui.submit(followup);
  assert.equal(ui.answers().at(-1), i18n.t('assistant.unknown', {}, 'da'), 'Changed context identity cannot borrow the old topic frame');
  assert.equal(ui.topic(), null);
  assert.equal(ui.detailCalls(), 0);
  assert.equal(ui.loading(), false);
  assert.equal(fetchCalls, 0);
});
const dynamic = { da: 'Hvorfor denne score?', de: 'Warum dieser Score?', en: 'Why this score?' };
const fact = { da: 'Hvad er rav?', de: 'Was ist Bernstein?', en: 'What is amber?' };
const safeFailure = locale => i18n.t('data.loadError', {}, locale);
const diagnostic = 'PRIVATE_SYNTHETIC_DIAGNOSTIC /internal/manifest sha256=deadbeef <script>not-public</script>';

for (const locale of ['da', 'de', 'en']) {
  test(`${locale}: actual missing-manifest and data-service rejection do not become assistant answers`, async () => {
    assert.equal(assistant.ravQuestionNeedsConditionDetails(dynamic[locale]), true);
    for (const manifest of [undefined, null]) {
      const ui = fixture(locale, { manifest });
      await assert.doesNotReject(() => ui.submit(dynamic[locale]));
      assert.deepEqual(ui.answers(), [safeFailure(locale)]);
      assert.equal(ui.loading(), false);
      assert.equal(ui.detailCalls(), manifest === undefined ? 0 : 1);
      assert.equal(ui.context.pendingZoneDetails.size, 0);
      assert.equal(fetchCalls, 0);
    }
  });

  test(`${locale}: detail failures never expose raw errors, including non-Error rejections`, async () => {
    for (const failure of [new Error(diagnostic), diagnostic, null,
      { message: diagnostic }, { get message() { throw Error('UNSAFE_MESSAGE_GETTER'); } }]) {
      const ui = fixture(locale, { manifest: {}, load: async () => { throw failure; } });
      await assert.doesNotReject(() => ui.submit(dynamic[locale]));
      assert.deepEqual(ui.answers(), [safeFailure(locale)]);
      assert.equal(ui.loading(), false);
      assert.equal(ui.context.pendingZoneDetails.size, 0);
      assert.equal(fetchCalls, 0);
      assert.doesNotMatch(ui.answers().join(' '), /PRIVATE_SYNTHETIC|internal|sha256|script|UNSAFE_MESSAGE/);
    }
  });

  test(`${locale}: a failed dynamic query does not change normal facts or a later retry`, async () => {
    const ui = fixture(locale, { manifest: {}, load: async () => { throw Error(diagnostic); } });
    const before = JSON.stringify(ui.state);
    await ui.submit(dynamic[locale]);
    assert.equal(ui.answers()[0], safeFailure(locale));
    await ui.submit(fact[locale]);
    assert.equal(ui.answers()[1], await assistant.askRavRadar(fact[locale], {}, { language: locale }));
    assert.notEqual(ui.answers()[1], safeFailure(locale));
    assert.equal(ui.detailCalls(), 1, 'Local facts do not start another details request');
    ui.recover();
    await ui.submit(dynamic[locale]);
    assert.equal(ui.answers()[2], i18n.t('assistant.local.noZone', {}, locale));
    assert.equal(ui.loading(), false);
    assert.equal(JSON.stringify(ui.state), before);
    assert.equal(fetchCalls, 0);
  });

  test(`${locale}: a delayed failure changes only its pending message`, async () => {
    let reject;
    const ui = fixture(locale, { manifest: {}, load: () => new Promise((_, fail) => { reject = fail; }) });
    const pending = ui.submit(dynamic[locale]);
    assert.equal(typeof reject, 'function');
    try {
      await ui.submit(fact[locale]);
    } finally {
      reject(Error(diagnostic));
      await pending;
    }
    assert.deepEqual(ui.answers(), [safeFailure(locale),
      await assistant.askRavRadar(fact[locale], {}, { language: locale })]);
    assert.equal(ui.loading(), false);
    assert.equal(fetchCalls, 0);
  });
}
