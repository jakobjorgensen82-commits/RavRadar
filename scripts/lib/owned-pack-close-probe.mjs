// TEST ONLY: no import-time effects or ownership/admission authority.
import nativeFs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { types } from 'node:util';
const packModuleUrl = new URL('./private-weather-component-pack.mjs', import.meta.url).href;
export function observeOwnedPackCloseProbes() {
  const realSync = nativeFs.fstatSync, realAsync = nativeFs.fstat;
  const parent = Object.getPrototypeOf(nativeFs.Stats.prototype), slots = new Map();
  const counts = Object.fromEntries(['EBADF', 'BEFORE_UNKNOWN', 'PROBE_ERROR_OTHER', 'AFTER_UNKNOWN',
    'PROTOTYPE_MISMATCH', 'OTHER_FD_TYPE', 'SAME_DEV_INO', 'DIFFERENT_DEV_INO'].map(k => [k, 0]));
  const beforeReasons = { BEFORE_NEGATIVE_IDENTITY: 0, BEFORE_SHAPE_UNKNOWN: 0 };
  const unobserved = { AMBIGUOUS: 0, CAPACITY: 0, MISSING_BEFORE: 0, OBSERVER_ERROR: 0 };
  let active = true, restored = null;
  function caller(name) {
    try {
      const stack = new Error().stack;
      return typeof stack === 'string' && stack.split('\n').some(line =>
        line.includes(`at ${name} (`) && line.includes(`(${packModuleUrl}:`));
    } catch { return false; }
  }
  function identity(value) {
    if (!value || typeof value !== 'object' || types.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (!prototype || types.isProxy(prototype) || Object.getPrototypeOf(prototype) !== parent) return null;
    const own = key => Object.getOwnPropertyDescriptor(value, key)?.value;
    const dev = own('dev'), ino = own('ino'), mode = own('mode');
    if (typeof dev !== 'bigint' || typeof ino !== 'bigint' || typeof mode !== 'bigint') return null;
    return { dev, ino, mode, prototype };
  }
  function classify(before, error, after) {
    if (error !== null) return typeof error === 'object' && !types.isProxy(error)
      && Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF' ? 'EBADF' : 'PROBE_ERROR_OTHER';
    if (!before || before.dev < 0n || before.ino < 0n || (before.mode & 0o170000n) !== 0o100000n) return 'BEFORE_UNKNOWN';
    if (!after || typeof after !== 'object' || types.isProxy(after)) return 'AFTER_UNKNOWN';
    if (Object.getPrototypeOf(after) !== before.prototype) return 'PROTOTYPE_MISMATCH';
    const next = identity(after);
    if (!next || next.dev < 0n || next.ino < 0n) return 'AFTER_UNKNOWN';
    if ((next.mode & 0o170000n) !== 0o100000n) return 'OTHER_FD_TYPE';
    return next.dev === before.dev && next.ino === before.ino ? 'SAME_DEV_INO' : 'DIFFERENT_DEV_INO';
  }
  function wrappedSync(...args) {
    if (!active || !caller('ownFileDescriptorIdentity')) return Reflect.apply(realSync, this, args);
    const prior = slots.get(args[0]);
    if (!prior && slots.size >= 256) {
      unobserved.CAPACITY++;
      return Reflect.apply(realSync, this, args);
    }
    if (prior) prior.ambiguous = true;
    const entry = { before: null, ambiguous: Boolean(prior), pending: false };
    slots.set(args[0], entry);
    const value = Reflect.apply(realSync, this, args); // Native return/throw untouched.
    try { entry.before = identity(value); } catch { /* Observer only. */ }
    return value;
  }
  function wrappedAsync(...args) {
    const callback = args.at(-1);
    if (!active || typeof callback !== 'function' || !caller('ownedFileDescriptorClosed')) return Reflect.apply(realAsync, this, args);
    const entry = slots.get(args[0]);
    if (!entry) {
      unobserved.MISSING_BEFORE++;
      return Reflect.apply(realAsync, this, args);
    }
    if (entry.pending) entry.ambiguous = true;
    entry.pending = true; slots.set(args[0], entry);
    const before = entry.before; // Freeze the relevant snapshot AT invocation.
    const delegated = args.slice();
    let callbackInvoked = false;
    delegated[delegated.length - 1] = function (...result) {
      callbackInvoked = true;
      try {
        if (entry.ambiguous) unobserved.AMBIGUOUS++;
        else {
          const category = classify(before, result[0], result[1]); counts[category]++;
          if (category === 'BEFORE_UNKNOWN') beforeReasons[before && (before.dev < 0n || before.ino < 0n)
            ? 'BEFORE_NEGATIVE_IDENTITY' : 'BEFORE_SHAPE_UNKNOWN']++;
        }
        if (slots.get(args[0]) === entry) slots.delete(args[0]);
      } catch { unobserved.OBSERVER_ERROR++; }
      return Reflect.apply(callback, this, result); // Receiver/args/return/throw unchanged.
    };
    try { return Reflect.apply(realAsync, this, delegated); }
    catch (error) {
      // A synchronous callback's own throw is not a native probe failure.
      if (!callbackInvoked) {
        if (entry.ambiguous) unobserved.AMBIGUOUS++;
        else counts.PROBE_ERROR_OTHER++;
        if (slots.get(args[0]) === entry) slots.delete(args[0]);
      }
      throw error;
    }
  }
  nativeFs.fstatSync = wrappedSync; nativeFs.fstat = wrappedAsync; syncBuiltinESMExports();
  return {
    summary() { return { kind: 'OWNED_PACK_CLOSE_PROBE_TEST_ONLY', node: process.version, platform: process.platform,
      scope: 'EXACT_PACK_CALLER_STACKS_NOT_OWNERSHIP_PROOF',
      status: Object.values(counts).some(n => n > 0) ? 'OBSERVED' : 'UNOBSERVED',
      counts: { ...counts }, beforeReasons: { ...beforeReasons },
      unobserved: { ...unobserved, PENDING: slots.size }, restoredOriginals: restored }; },
    restore() {
      active = false;
      const ownSync = nativeFs.fstatSync === wrappedSync, ownAsync = nativeFs.fstat === wrappedAsync;
      if (ownSync) nativeFs.fstatSync = realSync;
      if (ownAsync) nativeFs.fstat = realAsync;
      syncBuiltinESMExports();
      restored = ownSync && ownAsync;
      return restored; // Never overwrite an intervening foreign wrapper.
    },
  };
}
