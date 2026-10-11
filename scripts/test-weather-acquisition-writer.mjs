// Local primitive contracts only: no producer/SAVE/cohort or runner-loss proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import rawFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = new URL('./lib/weather-acquisition-writer.mjs', import.meta.url);
async function fixture() {
  const parent = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'rr-acquisition-claim-')));
  const root = path.join(parent, 'checkout');
  const cache = path.join(root, '.cache');
  const file = path.join(cache, 'weather-acquisition-writer.claim');
  await fs.mkdir(path.join(root, 'scripts', 'lib'), { recursive: true });
  await fs.mkdir(cache);
  const modulePath = path.join(root, 'scripts', 'lib', 'weather-acquisition-writer.mjs');
  await fs.copyFile(source, modulePath); // Actual product bytes, no source substitution.
  const url = pathToFileURL(modulePath).href;
  const api = await import(url);
  const originals = new Map();
  for (const name of ['original-B', 'original-S', 'previous-cipher']) {
    const value = Buffer.from(`owned synthetic ${name}\n`);
    originals.set(name, value);
    await fs.writeFile(path.join(root, name), value, { flag: 'wx' });
  }
  const open = fs.open, unlink = fs.unlink, lstat = fs.lstat, fstat = rawFs.fstat;
  const handles = [];
  fs.open = async function (name, ...args) {
    const handle = await open.call(this, name, ...args);
    if (name === file) handles.push({ handle, fd: handle.fd, close: handle.close.bind(handle),
      identity: await handle.stat({ bigint: true }) });
    return handle;
  };
  return { parent, root, cache, file, url, api, handles, open, unlink, lstat, fstat,
    async intact(originalRoot = root) {
      for (const [name, bytes] of originals) assert.deepEqual(await fs.readFile(path.join(originalRoot, name)), bytes);
    },
    async cleanup() {
      fs.open = open; fs.unlink = unlink; fs.lstat = lstat; rawFs.fstat = fstat;
      // Dispose ONLY our observed real handles, after the retention assertions.
      // Closing an already closed FileHandle does not close a recycled numeric fd.
      for (const row of handles) await row.close();
      await fs.rm(parent, { recursive: true });
    },
  };
}
async function rawIdentity(f, row) {
  return new Promise((resolve, reject) => f.fstat(row.fd, { bigint: true }, (error, stat) => {
    if (error === null) resolve(stat); else reject(error);
  }));
}
async function assertOpen(f, row) {
  const stat = await rawIdentity(f, row);
  assert.equal(stat.dev, row.identity.dev); assert.equal(stat.ino, row.identity.ino);
}
async function thrown(action, expected) {
  let caught = false;
  try { await action(); }
  catch (error) { caught = true; assert.equal(error, expected); }
  assert.equal(caught, true, 'must throw even when the first error is null or zero');
}
function contender(f) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const m=await import(${JSON.stringify(f.url)});try{const o=await m.acquireWeatherAcquisitionWriter();await m.releaseWeatherAcquisitionWriter(o);console.log('ACQUIRED')}catch(e){console.log(e?.code);process.exitCode=2}`],
  { cwd: f.root, windowsHide: true, encoding: 'utf8', timeout: 5000 });
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  return result;
}

test('fixed claim excludes a real second process then permits a proved released successor', { timeout: 10000 }, async () => {
  const f = await fixture();
  try {
    const owner = await f.api.acquireWeatherAcquisitionWriter();
    assert.equal(Object.isFrozen(owner), true); assert.equal(JSON.stringify(owner), '{}');
    assert.deepEqual(Reflect.ownKeys(owner), []);
    await f.api.assertWeatherAcquisitionWriter(owner);
    await assertOpen(f, f.handles[0]);
    assert.equal((await fs.stat(f.file)).size, 0);
    assert.equal(contender(f).status, 2);
    await f.api.releaseWeatherAcquisitionWriter(owner);
    await assert.rejects(rawIdentity(f, f.handles[0]), { code: 'EBADF' });
    await assert.rejects(fs.lstat(f.file), { code: 'ENOENT' });
    await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
    assert.equal(contender(f).status, 0);
    await f.intact();
  } finally { await f.cleanup(); }
});

test('existing unknown claim and foreign copied leases refuse without inspecting or replacing them', async () => {
  const f = await fixture();
  try {
    await fs.writeFile(f.file, 'unknown owner', { flag: 'wx' });
    await assert.rejects(f.api.acquireWeatherAcquisitionWriter(), { code: 'EEXIST' });
    assert.equal(await fs.readFile(f.file, 'utf8'), 'unknown owner');
    assert.equal(f.handles.length, 0);
    await fs.unlink(f.file); // Test-owned foreign fixture, not product adoption.
    const owner = await f.api.acquireWeatherAcquisitionWriter();
    const foreign = await import(`${f.url}?independent-module`);
    let traps = 0;
    for (const copy of [{ ...owner }, JSON.parse(JSON.stringify(owner)), new Proxy({}, { get() { traps++; throw 0; } })]) {
      await assert.rejects(f.api.releaseWeatherAcquisitionWriter(copy));
    }
    assert.equal(traps, 0);
    await assert.rejects(foreign.releaseWeatherAcquisitionWriter(owner));
    await assert.rejects(f.api.acquireWeatherAcquisitionWriter(f.root));
    await f.api.releaseWeatherAcquisitionWriter(owner);
    await f.intact();
  } finally { await f.cleanup(); }
});

test('concurrent acquire and irreversible retain keep the actual claim and refuse release or reentry', async () => {
  const f = await fixture();
  try {
    const pending = f.api.acquireWeatherAcquisitionWriter();
    await assert.rejects(f.api.acquireWeatherAcquisitionWriter(), { code: 'WEATHER_ACQUISITION_WRITER_BUSY' });
    const owner = await pending;
    f.api.retainWeatherAcquisitionWriter(owner);
    await assert.rejects(f.api.assertWeatherAcquisitionWriter(owner));
    await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
    await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
    await assertOpen(f, f.handles[0]); assert.equal(contender(f).status, 2);
    await f.intact();
  } finally { await f.cleanup(); }
});

for (const changed of ['claim', 'cache', 'workspace']) {
  test(`changed ${changed} identity retains own handle and never deletes replacement`, async () => {
    const f = await fixture();
    try {
      const owner = await f.api.acquireWeatherAcquisitionWriter();
      let originalRoot = f.root, replacement;
      if (changed === 'claim') {
        await fs.rename(f.file, `${f.file}.own`);
        await fs.writeFile(f.file, 'replacement', { flag: 'wx' }); replacement = f.file;
      } else if (changed === 'cache') {
        // Windows forbids moving a directory containing an open file. Keep the
        // exact owned file/fd alive outside it, then put that SAME inode back;
        // the only remaining identity change is the actual directory object.
        await fs.rename(f.file, path.join(f.parent, 'own-claim'));
        await fs.rename(f.cache, `${f.cache}.own`);
        await fs.mkdir(f.cache); replacement = path.join(f.cache, 'replacement');
        await fs.rename(path.join(f.parent, 'own-claim'), f.file);
        await fs.writeFile(replacement, 'replacement', { flag: 'wx' });
      } else {
        await fs.rename(f.file, path.join(f.parent, 'own-claim'));
        originalRoot = path.join(f.parent, 'old-checkout');
        await fs.rename(f.root, originalRoot);
        await fs.mkdir(f.cache, { recursive: true }); replacement = path.join(f.root, 'replacement');
        await fs.rename(path.join(f.parent, 'own-claim'), f.file);
        await fs.writeFile(replacement, 'replacement', { flag: 'wx' });
      }
      await assert.rejects(f.api.assertWeatherAcquisitionWriter(owner));
      await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
      await assert.rejects(f.api.acquireWeatherAcquisitionWriter());
      await assertOpen(f, f.handles[0]);
      assert.equal(await fs.readFile(replacement, 'utf8'), 'replacement');
      await f.intact(originalRoot);
    } finally { await f.cleanup(); }
  });
}

for (const linked of ['claim', 'cache', 'workspace']) {
  test(`fixed claim refuses ${linked} symlink or Windows junction before acquiring`, async () => {
    const f = await fixture();
    try {
      const target = path.join(f.parent, 'link-target');
      await fs.mkdir(target);
      let originalRoot = f.root;
      if (linked === 'claim') await fs.symlink(target, f.file, 'junction');
      else if (linked === 'cache') {
        await fs.rmdir(f.cache); await fs.symlink(target, f.cache, 'junction');
      } else {
        originalRoot = path.join(f.parent, 'old-checkout');
        await fs.rename(f.root, originalRoot); await fs.symlink(originalRoot, f.root, 'junction');
      }
      await assert.rejects(f.api.acquireWeatherAcquisitionWriter());
      assert.equal(f.handles.length, 0);
      assert.deepEqual(await fs.readdir(target), []);
      await f.intact(originalRoot);
    } finally { await f.cleanup(); }
  });
}

test('one no-op close keeps actual fd, claim and next writer blocked', async () => {
  const f = await fixture();
  try {
    const owner = await f.api.acquireWeatherAcquisitionWriter();
    const row = f.handles[0]; let closes = 0;
    row.handle.close = async () => { closes++; };
    await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner), { code: 'WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED' });
    assert.equal(closes, 1); await assertOpen(f, row);
    await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
    assert.equal(closes, 1); assert.equal(contender(f).status, 2); await f.intact();
  } finally { await f.cleanup(); }
});

for (const primary of [null, 0]) {
  test(`real close then raw ${String(primary)} keeps first error and safely releases only its own claim`, async () => {
    const f = await fixture();
    try {
      const owner = await f.api.acquireWeatherAcquisitionWriter();
      const row = f.handles[0]; let closes = 0;
      row.handle.close = async () => { closes++; await row.close(); throw primary; };
      await thrown(() => f.api.releaseWeatherAcquisitionWriter(owner), primary);
      assert.equal(closes, 1); await assert.rejects(rawIdentity(f, row), { code: 'EBADF' });
      await assert.rejects(fs.lstat(f.file), { code: 'ENOENT' });
      assert.equal(contender(f).status, 0); await f.intact();
    } finally { await f.cleanup(); }
  });
}

test('unknown post-close probe preserves raw first error, claim and refusal', async () => {
  const f = await fixture();
  try {
    const owner = await f.api.acquireWeatherAcquisitionWriter();
    const row = f.handles[0]; let afterClose = false;
    row.handle.close = async () => { afterClose = true; throw 0; };
    rawFs.fstat = (fd, options, callback) => {
      if (fd === row.fd && afterClose) callback(Object.assign(new Error('probe denied'), { code: 'EACCES' }));
      else f.fstat(fd, options, callback);
    };
    await thrown(() => f.api.releaseWeatherAcquisitionWriter(owner), 0);
    await assertOpen(f, row); assert.equal(contender(f).status, 2); await f.intact();
  } finally { await f.cleanup(); }
});

for (const unlinkMode of ['noop', 'actual-then-null', 'replacement-after-close']) {
  test(`own release ${unlinkMode} preserves actual path evidence and originals`, async () => {
    const f = await fixture();
    try {
      const owner = await f.api.acquireWeatherAcquisitionWriter();
      const row = f.handles[0]; let unlinks = 0;
      fs.unlink = async function (name) {
        if (name !== f.file) return f.unlink.call(this, name);
        unlinks++;
        if (unlinkMode === 'noop') return;
        await f.unlink.call(this, name);
        if (unlinkMode === 'actual-then-null') throw null;
      };
      if (unlinkMode === 'replacement-after-close') row.handle.close = async () => {
        await row.close(); await fs.rename(f.file, `${f.file}.own`);
        await fs.writeFile(f.file, 'replacement', { flag: 'wx' });
      };
      if (unlinkMode === 'actual-then-null') {
        await thrown(() => f.api.releaseWeatherAcquisitionWriter(owner), null);
        await assert.rejects(fs.lstat(f.file), { code: 'ENOENT' }); assert.equal(contender(f).status, 0);
      } else {
        await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner));
        await assert.rejects(f.api.acquireWeatherAcquisitionWriter());
        assert.equal(contender(f).status, 2);
        if (unlinkMode === 'replacement-after-close') {
          assert.equal(unlinks, 0); assert.equal(await fs.readFile(f.file, 'utf8'), 'replacement');
        } else assert.equal(unlinks, 1);
      }
      await assert.rejects(rawIdentity(f, row), { code: 'EBADF' }); await f.intact();
    } finally { await f.cleanup(); }
  });
}

test('falsy callback errors and inherited accessor proxy EBADF never prove an open fd closed', async () => {
  let traps = 0;
  const accessor = Object.defineProperty({}, 'code', { get() { traps++; return 'EBADF'; } });
  const proxy = new Proxy({ code: 'EBADF' }, { getOwnPropertyDescriptor() { traps++; return { value: 'EBADF', configurable: true }; } });
  for (const probeError of [0, Object.create({ code: 'EBADF' }), accessor, proxy]) {
    const f = await fixture();
    try {
      const owner = await f.api.acquireWeatherAcquisitionWriter();
      const row = f.handles[0]; let closes = 0, probes = 0;
      row.handle.close = async () => { closes++; };
      rawFs.fstat = (fd, options, callback) => {
        if (fd === row.fd && closes > 0) { probes++; callback(probeError); }
        else f.fstat(fd, options, callback);
      };
      await assert.rejects(f.api.releaseWeatherAcquisitionWriter(owner), { code: 'WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED' });
      assert.equal(closes, 1); assert.equal(probes, 1); assert.equal(traps, 0);
      await assertOpen(f, row);
      await assert.rejects(f.api.acquireWeatherAcquisitionWriter());
      assert.equal((await fs.lstat(f.file)).isFile(), true); await f.intact();
    } finally { await f.cleanup(); }
  }
});

test('unknown directory inspection rejects before creating a claim without replacing the first error', async () => {
  const f = await fixture();
  try {
    const primary = Object.assign(new Error('directory unavailable'), { code: 'EACCES' });
    fs.lstat = async function (name, ...args) {
      if (name === f.cache) throw primary;
      return f.lstat.call(this, name, ...args);
    };
    await thrown(() => f.api.acquireWeatherAcquisitionWriter(), primary);
    assert.equal(f.handles.length, 0);
    fs.lstat = f.lstat;
    await assert.rejects(fs.lstat(f.file), { code: 'ENOENT' });
    const owner = await f.api.acquireWeatherAcquisitionWriter();
    await f.api.releaseWeatherAcquisitionWriter(owner); await f.intact();
  } finally { await f.cleanup(); }
});
