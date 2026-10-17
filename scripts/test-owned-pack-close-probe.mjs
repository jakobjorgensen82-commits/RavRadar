// SYNTHETIC OBSERVER UNIT ONLY. Spoof Stats prototypes/stack filenames below
// are not product provenance, native close proof, or the real B/S regression.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { types } from 'node:util';
const helperUrl = new URL('./lib/owned-pack-close-probe.mjs', import.meta.url);
const packUrl = new URL('./lib/private-weather-component-pack.mjs', import.meta.url).href;
const raw = fs.readFileSync(helperUrl, 'utf8');
const imports = raw.match(/^import .*;\r?$/gm) ?? [];
assert.equal(imports.length, 3);
const body = raw.replace(/^import .*;\r?$/gm, '').replaceAll('import.meta.url', JSON.stringify(helperUrl.href))
  .replace('export function observeOwnedPackCloseProbes()', 'function observeOwnedPackCloseProbes()');
const proto = Object.create(Object.getPrototypeOf(fs.Stats.prototype));
const stat = (values = {}, prototype = proto) => Object.assign(Object.create(prototype),
  { dev: 11n, ino: 987654321987654321n, mode: 0o100000n }, values);
function fixture(callerUrl = packUrl) {
  const queue = [], calls = [], receiver = {}, cbReceiver = {}, returned = {};
  let before = stat(), syncError = null, asyncError = null, syncs = 0, immediate = null;
  const nativeFs = { Stats: fs.Stats, fstatSync: function (...args) {
    calls.push({ kind: 'sync', receiver: this, args }); if (syncError) throw syncError; return before;
  }, fstat: function (...args) { calls.push({ kind: 'async', receiver: this, args });
    if (asyncError) throw asyncError; if (immediate) return Reflect.apply(args.at(-1), cbReceiver, immediate);
    queue.push(args.at(-1)); return returned; } };
  const original = { sync: nativeFs.fstatSync, async: nativeFs.fstat };
  const privateTypes = { isProxy: types.isProxy };
  const context = vm.createContext({ nativeFs, types: privateTypes, syncBuiltinESMExports() { syncs++; },
    URL, process: { version: process.version, platform: process.platform } });
  new vm.Script(body + '\nglobalThis.install = observeOwnedPackCloseProbes;', { filename: 'observer-unit-only.mjs' }).runInContext(context);
  assert.equal(nativeFs.fstatSync, original.sync); assert.equal(nativeFs.fstat, original.async); assert.equal(syncs, 0);
  new vm.Script(`function ownFileDescriptorIdentity(...args) { return Reflect.apply(nativeFs.fstatSync, receiver, args); }
    function ownedFileDescriptorClosed(...args) { return Reflect.apply(nativeFs.fstat, receiver, args); }
    globalThis.readBefore = ownFileDescriptorIdentity; globalThis.readAfter = ownedFileDescriptorClosed;`,
  { filename: callerUrl }).runInContext(Object.assign(context, { receiver })); // Synthetic stack only.
  const observer = context.install();
  return { observer, nativeFs, calls, receiver, cbReceiver, returned, original,
    before: value => { before = value; }, errors: (s, a) => { syncError = s; asyncError = a; },
    sync: (...args) => Reflect.apply(context.readBefore, undefined, args),
    async: (...args) => Reflect.apply(context.readAfter, undefined, args),
    flush: (...args) => Reflect.apply(queue.shift(), cbReceiver, args),
    synchronous: value => { immediate = value; },
    observerError: () => { privateTypes.isProxy = () => { throw new Error('SYNTHETIC_OBSERVER_ONLY'); }; } };
}
test('actual module import has no native fstat mutation', async () => {
  const sync = fs.fstatSync, async = fs.fstat;
  const module = await import('./lib/owned-pack-close-probe.mjs');
  assert.equal(typeof module.observeOwnedPackCloseProbes, 'function');
  assert.equal(fs.fstatSync, sync); assert.equal(fs.fstat, async);
});
test('synthetic native boundary forwards exact receiver/args/returns/throws and callback semantics', () => {
  const f = fixture(), sample = stat(), options = { bigint: true }, extra = {}, callbackResult = {};
  try {
    f.before(sample); assert.equal(f.sync(1234567, options), sample);
    assert.equal(f.calls.at(-1).receiver, f.receiver); assert.equal(f.calls.at(-1).args[1], options);
    const callback = function (...args) { assert.equal(this, f.cbReceiver);
      assert.equal(args[0], null); assert.equal(args[1], sample); assert.equal(args[2], extra); return callbackResult; };
    assert.equal(f.async(1234567, options, callback), f.returned);
    assert.equal(f.calls.at(-1).receiver, f.receiver); assert.equal(f.calls.at(-1).args[1], options);
    assert.equal(f.flush(null, sample, extra), callbackResult);
    const callbackError = new Error('SYNTHETIC_CALLBACK');
    f.sync(3); f.async(3, () => { throw callbackError; }); assert.throws(() => f.flush(null, sample), e => e === callbackError);
    f.sync(7); f.synchronous([null, sample]);
    assert.throws(() => f.async(7, () => { throw callbackError; }), e => e === callbackError);
    assert.equal(f.observer.summary().counts.PROBE_ERROR_OTHER, 0); f.synchronous(null);
    const nativeError = new Error('SYNTHETIC_NATIVE');
    f.errors(nativeError, nativeError);
    assert.throws(() => f.sync(4, options), e => e === nativeError);
    assert.throws(() => f.async(5, options, callback), e => e === nativeError);
    f.errors(null, nativeError); f.sync(6, options);
    const pending = f.observer.summary().unobserved.PENDING;
    assert.throws(() => f.async(6, options, callback), e => e === nativeError);
    assert.equal(f.observer.summary().counts.PROBE_ERROR_OTHER, 1);
    assert.equal(f.observer.summary().unobserved.PENDING, pending - 1);
  } finally { assert.equal(f.observer.restore(), true); }
  assert.equal(f.nativeFs.fstatSync, f.original.sync); assert.equal(f.nativeFs.fstat, f.original.async);
});
test('synthetic classifications distinguish all fixed outcomes without reading getters/proxy traps', () => {
  let traps = 0;
  const getter = stat(); Object.defineProperty(getter, 'dev', { get() { traps++; return 11n; } });
  const proxy = new Proxy({}, { getPrototypeOf() { traps++; throw new Error('MUST_NOT_READ'); } });
  const rows = [
    [stat(), null, stat(), 'SAME_DEV_INO'], [stat(), null, stat({ ino: 222n }), 'DIFFERENT_DEV_INO'],
    [stat(), null, stat({}, Object.create(Object.getPrototypeOf(fs.Stats.prototype))), 'PROTOTYPE_MISMATCH'],
    [stat(), null, proxy, 'AFTER_UNKNOWN'], [stat(), null, getter, 'AFTER_UNKNOWN'],
    [stat(), null, stat({ mode: 0o020000n }), 'OTHER_FD_TYPE'],
    [stat({ dev: -1n }), null, stat(), 'BEFORE_UNKNOWN', 'BEFORE_NEGATIVE_IDENTITY'],
    [{}, null, stat(), 'BEFORE_UNKNOWN', 'BEFORE_SHAPE_UNKNOWN'],
    [stat(), null, stat({ ino: -1n }), 'AFTER_UNKNOWN'],
    [stat(), Object.assign(new Error('HIDDEN'), { code: 'EBADF' }), undefined, 'EBADF'],
    [stat(), undefined, stat(), 'PROBE_ERROR_OTHER'], [stat(), { code: 'EOTHER' }, stat(), 'PROBE_ERROR_OTHER'],
  ];
  for (const [before, error, after, category, reason] of rows) {
    const f = fixture(); try {
      f.before(before); f.sync(13, { bigint: true });
      let received; f.async(13, { bigint: true }, (...args) => { received = args; }); f.flush(error, after);
      assert.equal(received[0], error); assert.equal(received[1], after);
      const report = f.observer.summary(); assert.equal(report.counts[category], 1);
      assert.equal(Object.values(report.counts).reduce((a, b) => a + b, 0), 1);
      if (reason) assert.equal(report.beforeReasons[reason], 1);
      assert.doesNotMatch(JSON.stringify(report), /987654321987654321|HIDDEN|EOTHER|MUST_NOT_READ/);
    } finally { f.observer.restore(); }
  }
  assert.equal(traps, 0);
});
test('snapshot is immutable before callback and overlapping own captures remain UNOBSERVED', () => {
  const f = fixture(); try {
    const before = stat(); f.before(before); f.sync(17); f.async(17, () => {});
    before.ino = 333n; f.flush(null, stat()); assert.equal(f.observer.summary().counts.SAME_DEV_INO, 1);
    f.sync(18); f.async(18, () => {}); f.sync(18); f.flush(null, stat());
    f.async(18, () => {}); f.flush(null, stat()); assert.equal(f.observer.summary().unobserved.AMBIGUOUS, 2);
  } finally { f.observer.restore(); }
});
test('unrelated calls/zero observations, bounded capacity, observer faults and foreign restore are explicit', () => {
  const f = fixture(); try {
    f.nativeFs.fstatSync(23); f.nativeFs.fstat(23, () => {}); f.flush(null, stat());
    assert.equal(f.observer.summary().status, 'UNOBSERVED');
    f.async(24, () => {}); f.flush(null, stat());
    assert.equal(f.observer.summary().unobserved.MISSING_BEFORE, 1);
    for (let i = 0; i < 256; i++) f.sync(i);
    f.sync(300); f.async(301, () => {}); f.flush(null, stat());
    assert.equal(f.observer.summary().unobserved.CAPACITY, 1);
    assert.equal(f.observer.summary().unobserved.PENDING, 256);
  } finally { f.observer.restore(); }
  const g = fixture(); try {
    let forwarded = false; g.sync(31); g.async(31, () => { forwarded = true; }); g.observerError();
    // The already queued callback remains the original caller's callback.
    g.flush(null, stat()); assert.equal(forwarded, true); assert.equal(g.observer.summary().unobserved.OBSERVER_ERROR, 1);
    assert.equal(g.observer.summary().status, 'UNOBSERVED');
    const report = g.observer.summary();
    assert.deepEqual(Object.keys(report).sort(), ['beforeReasons', 'counts', 'kind', 'node', 'platform', 'restoredOriginals', 'scope', 'status', 'unobserved']);
    const foreign = () => {}; g.nativeFs.fstat = foreign;
    assert.equal(g.observer.restore(), false); assert.equal(g.nativeFs.fstat, foreign);
  } finally { g.observer.restore(); }
  const wrong = fixture('file:///SYNTHETIC-WRONG/private-weather-component-pack.mjs');
  try { wrong.sync(77); wrong.async(77, () => {}); wrong.flush(null, stat());
    assert.equal(wrong.observer.summary().status, 'UNOBSERVED'); } finally { wrong.observer.restore(); }
});
