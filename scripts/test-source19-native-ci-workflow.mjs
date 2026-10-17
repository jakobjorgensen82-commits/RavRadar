import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE19_NATIVE_SCOPE_PATHS,SOURCE19_NATIVE_SCOPE_DIRECTORIES,source19NativeCiRequired,source19NativeValidationAllowed} from './source19-native-ci-scope.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const NATIVE_JOBS_SHA256='2f096305b2a08b0b0445867f4295a05ba420539c1e23d63525e38274fe3f7b9d';
const EXACT_SCOPE_SHA256='30098a23e2f70074559b05aa7618d6fec89e4ce9bd5f160260b0c6b1c609b4d3';
const DEPENDENCY_GUARD="    needs: [source-native-scope, source-native]\n    if: always() && needs.source-native-scope.result == 'success' && ((needs.source-native-scope.outputs.required == 'true' && needs.source-native.result == 'success') || (needs.source-native-scope.outputs.required == 'false' && needs.source-native.result == 'skipped'))\n";


// Successor admission is test-only. Frozen original bytes/27 pins remain original.
const source19SuccessorFixtures = [
  {
    "old": "scripts/test-source19-cp-install-native-fixture.mjs",
    "next": "scripts/test-source19-cp-install-native-d504-fixture.mjs",
    "oldSha": "c8555c9901b36be7d26fff415ffa3014e7104b6336a9f502379d2965b481179a",
    "nextSha": "83642a2aead446a85eddc98c791d53e2331963082aa6e7c567beb94a6893169a",
    "guard": "  const frozenFixture = path.join(ROOT, fixtureIdentity.frozenFixturePath);\n  const frozenStat = await fs.lstat(frozenFixture);\n  assert.ok(frozenStat.isFile() && !frozenStat.isSymbolicLink() && frozenStat.nlink === 1, 'FROZEN_FIXTURE_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(frozenFixture, 'utf8'))), fixtureIdentity.frozenFixtureSha256, 'FROZEN_FIXTURE_BYTES_CHANGED');\n"
  },
  {
    "old": "scripts/test-source19-union-native-fixture.mjs",
    "next": "scripts/test-source19-union-native-d504-fixture.mjs",
    "oldSha": "a47a5ef9042c08da572c2e7c82bc8165cff9afe547975c4a7268c1fb2d7b6787",
    "nextSha": "071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6",
    "guard": "  const frozenFixture = path.join(ROOT, fixtureIdentity.frozenFixturePath);\n  const frozenStat = await fs.lstat(frozenFixture);\n  assert.ok(frozenStat.isFile() && !frozenStat.isSymbolicLink() && frozenStat.nlink === 1, 'FROZEN_FIXTURE_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(frozenFixture, 'utf8'))), fixtureIdentity.frozenFixtureSha256, 'FROZEN_FIXTURE_BYTES_CHANGED');\n"
  }
];
function projectSource19SuccessorNativeJobs(actual) {
  actual = projectSource19FixedDiagnosticJobs(actual);
  if (sha(actual) === NATIVE_JOBS_SHA256) return actual;
  assert.equal(sha(actual), 'b7414f8784e43f2c7c5560c73558d2b3cabcc8e9a35e24a3752323bacbfaaef4', 'SOURCE19_D504_EXACT_SUCCESSOR_JOBS');
  let legacy = actual;
  for (const target of ['scripts/test-source19-cp-install-native.py', 'scripts/test-source19-union-native.py']) {
    const original = '              python -I -B ' + target + ' --node22-path "$SOURCE_NODE22_PATH" --node24-path "$SOURCE_NODE24_PATH" --case "$SOURCE_NATIVE_CASE"';
    assert.equal(legacy.split(original + ' --composition integrated-d504').length, 2);
    legacy = legacy.replace(original + ' --composition integrated-d504', original);
  }
  assert.equal(sha(legacy), NATIVE_JOBS_SHA256, 'Entire original seven jobs must survive');
  return legacy;
}
function projectSource19SuccessorNativeScope(actual) {
  actual = projectSource19FixedDiagnosticScope(actual);
  if (sha(JSON.stringify(actual)) === EXACT_SCOPE_SHA256) return actual;
  assert.equal(sha(JSON.stringify(actual)), 'ac7b7639544f0507be3951b794383b6b70caf00894aa98e5bf6fe36f9dfe185d', 'SOURCE19_D504_EXACT_SUCCESSOR_SCOPE');
  const legacy = actual.filter(file => !source19SuccessorFixtures.some(row => row.next === file));
  assert.equal(actual.length - legacy.length, 2);
  assert.equal(sha(JSON.stringify(legacy)), EXACT_SCOPE_SHA256, 'Entire original311 scope must survive');
  return legacy;
}
async function assertSource19SuccessorComposition() {
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const object = (text, name) => {
    const match = text.match(new RegExp('const ' + name + '=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);'));
    assert.ok(match); return { literal: match[0], value: JSON.parse(match[1]) };
  };
  for (const row of source19SuccessorFixtures) {
    const before = (await fs.readFile(path.join(sourceRoot, row.old), 'utf8')).replaceAll('\r\n', '\n');
    const after = (await fs.readFile(path.join(sourceRoot, row.next), 'utf8')).replaceAll('\r\n', '\n');
    assert.equal(sha(before), row.oldSha, 'Frozen original fixture');
    assert.equal(sha(after), row.nextSha, 'Exact separately reviewed successor fixture');
    const oldIdentity = object(before, 'fixtureIdentity'), newIdentity = object(after, 'fixtureIdentity');
    const oldPins = object(before, 'fixtureProductPins'), newPins = object(after, 'fixtureProductPins');
    assert.deepEqual(Object.keys(newPins.value), Object.keys(oldPins.value));
    assert.equal(Object.keys(newPins.value).length, 27);
    const changed = Object.keys(newPins.value).filter(file => newPins.value[file] !== oldPins.value[file]);
    assert.deepEqual(changed, ['scripts/test-weather-component-progress-workflow.mjs', 'scripts/weather-component-progress-cache.mjs']);
    assert.equal(Object.keys(newPins.value).length - changed.length, 25);
    assert.equal(newIdentity.value.sourceBase, 'd5045bda33c4959c920ab71e79ca948f80857ece');
    assert.equal(newIdentity.value.sourceParent, 'dbb16b65e4626aa55c3ab06f7f61ac4b60fb4c60');
    assert.equal(newIdentity.value.successorCompositionId, '81ba8b9a448f5d475d019d5ce6c44dbd9fa3ee8bebeb9e4e4d816de2395f4dfa');
    assert.equal(newIdentity.value.evidence, 'LINUX_UNRUN_NO_ADMISSION');
    for (const [file, expected] of Object.entries(newPins.value)) {
      assert.equal(sha(projectSource19FixedDiagnosticProduct(file, (await fs.readFile(path.join(sourceRoot, file), 'utf8')).replaceAll('\r\n', '\n'))), expected, 'Actual successor product source');
    }
    let inverse = after.replace(newIdentity.literal, oldIdentity.literal).replace(newPins.literal, oldPins.literal);
    assert.equal(inverse.split(row.guard).length, 2); inverse = inverse.replace(row.guard, '');
    inverse = inverse.replace("    '" + row.next + "',\n    '" + row.old + "',\n", "    '" + row.old + "',\n")
      .replace("      && file !== '" + row.next + "') continue;", "      && file !== '" + row.old + "') continue;");
    assert.equal(inverse, before, 'Whole frozen factory/setup/preparation remains unchanged');
    assert.equal(source19NativeCiRequired([row.next]), true);
  }
}

export function projectSource19NativeCiWorkflow(input) {
  const source=input.replaceAll('\r\n','\n');
  assert.equal(source.split('\njobs:\n').length,2,'SOURCE19_NATIVE_CI_JOBS_REQUIRED');
  const jobsAt=source.indexOf('\njobs:\n')+'\njobs:\n'.length;
  const validateAt=source.indexOf('  validate:\n',jobsAt);assert.ok(validateAt>jobsAt);
  const nativeJobs=projectSource19SuccessorNativeJobs(source.slice(jobsAt,validateAt));
  assert.equal(sha(nativeJobs),NATIVE_JOBS_SHA256,'SOURCE19_NATIVE_CI_EXACT_JOB_CONTRACT');
  const validate=source.slice(validateAt);
  assert.equal(validate.split(DEPENDENCY_GUARD).length,2,'SOURCE19_NATIVE_CI_HARD_SOURCE_DEPENDENCY');
  assert.ok(validate.startsWith('  validate:\n'+DEPENDENCY_GUARD));
  assert.doesNotMatch(nativeJobs,/secrets\.|(?:contents|actions|pages|id-token): write|continue-on-error|pull_request_target|workflow_dispatch|NODE_TLS_REJECT_UNAUTHORIZED|NODE_OPTIONS|upstream/);
  return source.slice(0,jobsAt)+validate.replace(DEPENDENCY_GUARD,'');
}

function actualConditionAllows(scopeResult,required,nativeResult) {
  let expression=DEPENDENCY_GUARD.split('\n    if: ')[1].trim();
  expression=expression.replaceAll('always()','true')
    .replaceAll('needs.source-native-scope.result',JSON.stringify(scopeResult))
    .replaceAll('needs.source-native-scope.outputs.required',JSON.stringify(required))
    .replaceAll('needs.source-native.result',JSON.stringify(nativeResult));
  return Function('return ('+expression+');')();
}


async function assertSource19FixtureCjsClosure() {
  const { createRequire } = await import('node:module');
  const { tmpdir } = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const action = '.github/actions/save-owned-dmi-grib/index.cjs';
  const writer = 'scripts/lib/weather-acquisition-writer.mjs';
  const actionSource = await fs.readFile(path.join(root, action), 'utf8');
  const actualRequires = [...actionSource.matchAll(/\brequire(?:\.resolve)?\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g)]
    .map(match => match[2]);
  assert.ok(actualRequires.length > 0, 'exercise actual local CJS requires, not a synthetic writer import');
  const wrapper = 'scripts/run-owned-dmi-grib-save.py';
  assert.ok(actionSource.includes("child = spawn('python3', ['-B', path.join(ROOT, '" + wrapper + "'),"),
    'The fixture must include the actual fixed Python child, not a substitute');
  for (const fixture of ['scripts/test-source19-cp-install-native-fixture.mjs',
    'scripts/test-source19-union-native-fixture.mjs', ...source19SuccessorFixtures.map(row => row.next),
    source19ContinuityFixture.next]) {
    const fixtureSource = (await fs.readFile(path.join(root, fixture), 'utf8')).replaceAll('\r\n', '\n');
    // CONTRACT_FILES.fullRuntime is the storage ABI, not PRODUCER_SOURCE_FILES.
    // Dynamic subprocess paths therefore need explicit synthetic seed assets.
    const explicitSeed = fixtureSource.match(/const names = new Set\(\[([\s\S]*?)\]\);/)?.[1];
    assert.ok(explicitSeed, 'The actual unique fixture seed list must exist');
    assert.equal((explicitSeed.match(/'scripts\/run-owned-dmi-grib-save\.py'/g) ?? []).length, 1,
      'The actual fixture must explicitly seed its normal Python wrapper');
    const scans = fixtureSource.split('\n').filter(line =>
      line.trimStart().startsWith('for (const match of source.matchAll(/(?:from'));
    assert.equal(scans.length, 1, 'use the actual unique normal seed scanner');
    const literal = scans[0].slice(scans[0].indexOf('matchAll(') + 'matchAll('.length,
      scans[0].lastIndexOf(')) {'));
    const slash = literal.lastIndexOf('/');
    assert.ok(literal.startsWith('/') && slash > 0);
    const scanner = new RegExp(literal.slice(1, slash), literal.slice(slash + 1));
    const parent = await fs.realpath(tmpdir());
    const seed = await fs.mkdtemp(path.join(parent, 'rr-s19-cjs-'));
    const born = await fs.lstat(seed, { bigint: true });
    const visited = new Set(), pending = [action, wrapper];
    try {
      while (pending.length) {
        const relative = pending.pop();
        if (visited.has(relative)) continue;
        visited.add(relative);
        assert.ok(visited.size <= 64, 'the actual local CJS/import closure remains bounded');
        const bytes = await fs.readFile(path.join(root, relative));
        const target = path.join(seed, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
        for (const match of bytes.toString('utf8').matchAll(scanner)) {
          const specifier = match[1].split('?')[0];
          if (!specifier.startsWith('.')) continue;
          const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(relative), specifier));
          assert.ok(!dependency.startsWith('../') && !path.posix.isAbsolute(dependency));
          pending.push(dependency);
        }
      }
      const seededWrapper = path.join(seed, wrapper);
      const wrapperStat = await fs.lstat(seededWrapper);
      assert.ok(wrapperStat.isFile() && !wrapperStat.isSymbolicLink());
      assert.equal(wrapperStat.nlink, 1);
      assert.deepEqual(await fs.readFile(seededWrapper), await fs.readFile(path.join(root, wrapper)),
        'The real fixed wrapper must physically exist with its unchanged bytes');
      const rejected = spawnSync(process.env.PYTHON || 'python',
        ['-B', seededWrapper, '--prepare-distribution'], {
          env: { PATH: process.env.PATH, ...(process.env.SYSTEMROOT ? { SYSTEMROOT: process.env.SYSTEMROOT } : {}),
            PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1' },
          encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384,
        });
      assert.equal(rejected.error, undefined); assert.equal(rejected.signal, null);
      assert.equal(rejected.status, 1); assert.equal(rejected.stdout, '');
      assert.equal(rejected.stderr.replaceAll('\r\n', '\n'), 'DMI_RAW_SAVE_COHORT_REFUSED\n',
        'A direct unowned wrapper must parse/import and refuse before workers; never an H receipt');
      const localRequire = createRequire(path.join(seed, action));
      for (const specifier of actualRequires) {
        // A genuine fresh-seed require.resolve fails on the old ESM-only scan.
        const resolved = localRequire.resolve(specifier);
        assert.ok(resolved.startsWith(seed + path.sep));
        const actual = localRequire(specifier);
        if (resolved === path.join(seed, writer)) {
          for (const name of ['acquireWeatherAcquisitionWriter', 'assertWeatherAcquisitionWriter',
            'retainWeatherAcquisitionWriter', 'releaseWeatherAcquisitionWriter'])
            assert.equal(typeof actual[name], 'function', 'load the actual normal writer export: ' + name);
        }
      }
      assert.ok(visited.has(writer), 'both actual seed scanners retain the writer dependency');
    } finally {
      const current = await fs.lstat(seed, { bigint: true });
      assert.equal(await fs.realpath(seed), seed);
      assert.equal(path.dirname(seed), parent);
      assert.equal(current.dev, born.dev); assert.equal(current.ino, born.ino);
      assert.equal(current.mode, born.mode);
      await fs.rm(seed, { recursive: true, force: false });
    }
  }
}


// Exercise the actual fresh-checkout prefix and the action's unchanged writer.
// This is only the file/lease prerequisite, never SOURCE or H admission.
export async function testSource19FixtureWriterCachePrerequisite(fixtureSource = null) {
  const { createRequire } = await import('node:module');
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const fixture = (fixtureSource ?? await fs.readFile(path.join(sourceRoot,
    'scripts/test-source19-cp-install-native.py'), 'utf8')).replaceAll('\r\n', '\n');
  const method = '    def actual_case(self, own, seed, fixtures, protocol, cert, key, helper, mode):\n';
  assert.equal(fixture.split(method).length, 2);
  const prefix = fixture.split(method)[1].split('        action = root / ENTRY\n')[0];
  const before = '        root = own / mode\n        shutil.copytree(seed, root)\n';
  const after = before + '        # The normal writer requires an existing private cache, never a prebuilt claim.\n'
    + "        (root / '.cache').mkdir()\n";
  const diagnostics = after + "        # Own empty output namespace required by the unchanged normal geometry prelude.\n"
    + "        (root / 'data' / 'diagnostics').mkdir()\n";
  assert.ok(prefix === before || prefix === after || prefix === diagnostics, 'exercise only the exact reviewed fixture root prefix');
  const parent = await fs.realpath(tmpdir());
  const own = await fs.mkdtemp(path.join(parent, 'rr-s19-lease-'));
  const born = await fs.lstat(own, { bigint: true });
  const seed = path.join(own, 'seed'); await fs.mkdir(seed);
  await fs.mkdir(path.join(seed, 'data'));
  const action = '.github/actions/save-owned-dmi-grib/index.cjs';
  const writer = 'scripts/lib/weather-acquisition-writer.mjs';
  let settled = true;
  try {
    for (const relative of [action, writer]) {
      const destination = path.join(seed, relative);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, await fs.readFile(path.join(sourceRoot, relative)), { flag: 'wx' });
    }
    const python = process.env.PYTHON || 'python';
    const prepare = mode => spawnSync(python, ['-I', '-B', '-c',
      'from pathlib import Path\nimport shutil,sys\nown=Path(sys.argv[1]);seed=Path(sys.argv[2]);mode=sys.argv[3]\nif True:\n' + prefix,
      own, seed, mode], { encoding: 'utf8', timeout: 10_000 });
    const prepared = prepare('copied-checkout');
    assert.equal(prepared.status, 0, 'the actual normal fixture checkout prefix must complete');
    const root = path.join(own, 'copied-checkout');
    const cache = path.join(root, '.cache'), claim = path.join(cache, 'weather-acquisition-writer.claim');
    const requires = [...(await fs.readFile(path.join(root, action), 'utf8'))
      .matchAll(/\brequire(?:\.resolve)?\s*\(\s*(['"])(\.[^'"]+)\1\s*\)/g)].map(match => match[2]);
    assert.deepEqual(requires, ['../../../scripts/lib/weather-acquisition-writer.mjs']);
    const actual = createRequire(path.join(root, action))(requires[0]);
    settled = false;
    let owner;
    try { owner = await actual.acquireWeatherAcquisitionWriter(); }
    catch (error) {
      // The genuine old fixture fails before opening a claim. Do not grant
      // cleanup for an unknown or partly acquired writer failure.
      if (error?.code === 'ENOENT'
        && await fs.lstat(cache).then(() => false, failure => failure?.code === 'ENOENT')) settled = true;
      throw error;
    }
    await actual.assertWeatherAcquisitionWriter(owner);
    const cacheIdentity = await fs.lstat(cache, { bigint: true });
    assert.ok(cacheIdentity.isDirectory() && !cacheIdentity.isSymbolicLink());
    const claimIdentity = await fs.lstat(claim, { bigint: true });
    assert.ok(claimIdentity.isFile() && !claimIdentity.isSymbolicLink());
    assert.equal(claimIdentity.size, 0n); assert.equal(claimIdentity.nlink, 1n);
    await actual.releaseWeatherAcquisitionWriter(owner); settled = true;
    await assert.rejects(fs.lstat(claim), error => error?.code === 'ENOENT');
    const cacheAfter = await fs.lstat(cache, { bigint: true });
    assert.equal(cacheAfter.dev, cacheIdentity.dev); assert.equal(cacheAfter.ino, cacheIdentity.ino);
    // A seed containing a cache must not silently be adopted as this fixture's
    // newly created empty directory; no writer claim is preconstructed.
    await fs.mkdir(path.join(seed, '.cache'));
    const rejected = prepare('preexisting-cache');
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /FileExistsError/);
    await assert.rejects(fs.lstat(path.join(own, 'preexisting-cache', '.cache',
      'weather-acquisition-writer.claim')), error => error?.code === 'ENOENT');
    return { status: 'SOURCE19_FIXTURE_WRITER_PREREQUISITE_PASS', sourceAdmission: false, h70Actual: 'UNRUN' };
  } finally {
    if (settled) {
      const current = await fs.lstat(own, { bigint: true });
      assert.equal(await fs.realpath(own), own); assert.equal(path.dirname(own), parent);
      assert.equal(current.dev, born.dev); assert.equal(current.ino, born.ino); assert.equal(current.mode, born.mode);
      await fs.rm(own, { recursive: true, force: false });
    }
  }
}

export async function testSource19ProcDiscoveryRaces() {
  const { spawnSync } = await import('node:child_process');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const documents = {};
  for (const name of ['scripts/test-source19-cp-install-native.py', 'scripts/test-source19-union-native.py'])
    documents[name] = await fs.readFile(path.join(root, name), 'utf8');
  const probe = spawnSync(process.env.PYTHON || 'python', ['-I', '-B', '-c', "import ast, copy, errno, json, sys\ndocuments = json.loads(sys.stdin.read())\ncases = 0\nfor name, source in documents.items():\n    tree = ast.parse(source, filename=name)\n    descendants = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'descendants')\n    loops = [node for node in ast.walk(tree) if isinstance(node, ast.For)\n             and isinstance(node.iter, ast.Call) and isinstance(node.iter.func, ast.Name)\n             and node.iter.func.id == 'descendants']\n    assert len(loops) == 1\n    observer_try = loops[0].body[0]\n    assert isinstance(observer_try, ast.Try)\n    first = copy.deepcopy(observer_try.body[0])\n    # Keep the actual cmdline read and its actual nested/outer handlers, but do\n    # not execute any later pidfd, parent, stop, H, descriptor or installer code.\n    probe_try = ast.Try(body=[first], handlers=copy.deepcopy(observer_try.handlers), orelse=[], finalbody=[])\n    loop = ast.For(target=ast.Name(id='pid', ctx=ast.Store()),\n                   iter=ast.List(elts=[ast.Constant(value=12345)], ctx=ast.Load()),\n                   body=[probe_try, ast.Return(value=ast.Name(id='args', ctx=ast.Load()))], orelse=[])\n    probe = ast.FunctionDef(name='probe_cmdline',\n        args=ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]),\n        body=[loop, ast.Return(value=ast.Constant(value=None))], decorator_list=[])\n    process_args = [copy.deepcopy(node) for node in ast.walk(tree)\n                    if isinstance(node, ast.FunctionDef) and node.name == 'process_args']\n    unit = ast.fix_missing_locations(ast.Module(\n        body=[copy.deepcopy(descendants), *process_args, probe], type_ignores=[]))\n    selected_error = None\n    class FakePath:\n        def __init__(self, value): self.value = value\n        def read_text(self, *unused, **kwargs):\n            if self.value == '/proc/12345/task/12345/children': return '12346'\n            assert self.value == '/proc/12346/task/12346/children'\n            if selected_error is not None: raise selected_error\n            return ''\n        def read_bytes(self):\n            assert self.value == '/proc/12345/cmdline'\n            if selected_error is not None: raise selected_error\n            return b'node\\0'\n    namespace = {'Path': FakePath, 'errno': errno}\n    exec(compile(unit, '<actual-fixture-proc-fragments>', 'exec'), namespace)\n    for operation, expected in [(lambda: namespace['descendants'](12345), [12346]),\n                                (namespace['probe_cmdline'], [b'node'])]:\n        selected_error = None\n        assert operation() == expected\n        cases += 1\n        for error in [FileNotFoundError(errno.ENOENT, 'synthetic ended PID'),\n                      ProcessLookupError(errno.ESRCH, 'synthetic ended PID')]:\n            selected_error = error\n            assert operation() == ([12346] if isinstance(expected[0], int) else None)\n            cases += 1\n        for error in [PermissionError(errno.EACCES, 'synthetic refusal'),\n                      OSError(errno.EPERM, 'synthetic refusal'),\n                      OSError(errno.EIO, 'synthetic I/O failure'),\n                      ProcessLookupError(errno.EINVAL, 'not an ESRCH'),\n                      RuntimeError('synthetic non-filesystem failure')]:\n            selected_error = error\n            try: operation()\n            except BaseException as actual: assert actual is error\n            else: raise AssertionError('NONTRANSIENT_PROC_FAILURE_WAS_SWALLOWED')\n            cases += 1\nprint(json.dumps({'status': 'SOURCE19_PROC_SNAPSHOT_PREREQUISITE_PASS',\n                  'cases': cases, 'actualFixtureFragments': True,\n                  'realProcAccess': False, 'nativeH70': 'UNRUN',\n                  'nativeH71': 'UNRUN', 'sourceAdmission': False}))\n"], {
    input: JSON.stringify(documents), encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384,
    env: { PATH: process.env.PATH, ...(process.env.SYSTEMROOT ? { SYSTEMROOT: process.env.SYSTEMROOT } : {}) },
  });
  assert.equal(probe.error, undefined); assert.equal(probe.signal, null);
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stderr, '');
  assert.deepEqual(JSON.parse(probe.stdout), {
    status: 'SOURCE19_PROC_SNAPSHOT_PREREQUISITE_PASS', cases: 32,
    actualFixtureFragments: true, realProcAccess: false,
    nativeH70: 'UNRUN', nativeH71: 'UNRUN', sourceAdmission: false,
  });
  return { status: 'SOURCE19_PROC_SNAPSHOT_PREREQUISITE_PASS', cases: 32, nativeActual: 'UNRUN' };
}

// Run only the real fixture root prefix and unchanged normal geometry program
// on tiny synthetic geometry. This is not an H/parent/closure/SOURCE receipt.
export async function testSource19FixtureDiagnosticsPrerequisite(fixtureSources = null) {
  const { spawnSync } = await import('node:child_process');
  const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const fixturePaths = ['scripts/test-source19-cp-install-native.py', 'scripts/test-source19-union-native.py'];
  const documents = fixtureSources ?? await Promise.all(fixturePaths.map(async file => ({
    path: file, text: (await fs.readFile(path.join(sourceRoot, file), 'utf8')).replaceAll('\r\n', '\n'),
  })));
  assert.deepEqual(documents.map(row => row.path), fixturePaths);
  const geometry = (await fs.readFile(path.join(sourceRoot,
    'scripts/refine-coastlines-constrained-4.0.48.py'), 'utf8')).replaceAll('\r\n', '\n');
  const probe = spawnSync(process.env.PYTHON || 'python', ['-B', '-c', "import json, pathlib, shutil, sys, tempfile\npacket=json.load(sys.stdin)\ngeometry=packet['geometry']\nassert \"AUDIT=ROOT/'data/diagnostics/constrained-coastline-4.0.48.json'\" in geometry\nassert \"AUDIT.write_text(\" in geometry\ncases=0\nwith tempfile.TemporaryDirectory(prefix='rr-s19-geometry-prerequisite-') as temporary:\n    own=pathlib.Path(temporary).resolve()\n    seed=own/'seed'\n    snapshots=seed/'data/geometry-snapshots'\n    snapshots.mkdir(parents=True)\n    minimal=json.dumps({'type':'FeatureCollection','features':[],'version':'synthetic-only'})\n    for name in ('zones-4.0.44.geojson','zones-4.0.47-generated.geojson'):\n        (snapshots/name).write_text(minimal,encoding='utf-8')\n    (seed/'data/zones.geojson').write_text(minimal,encoding='utf-8')\n    for index,document in enumerate(packet['fixtures']):\n        marker='    def actual_case(self, own, seed, fixtures, protocol, cert, key, helper, mode):\\n'\n        assert document['text'].count(marker)==1\n        prefix=document['text'].split(marker)[1].split('        action = root / ENTRY\\n')[0]\n        assert prefix.startswith('        root = own / mode\\n        shutil.copytree(seed, root)\\n')\n        mode='normal-'+str(index)\n        namespace={'own':own,'seed':seed,'mode':mode,'shutil':shutil}\n        exec(compile('if True:\\n'+prefix,'<actual-fixture-root-prefix>','exec'),namespace)\n        root=namespace['root']\n        assert root.parent==own and root.name==mode\n        # Entire unchanged normal geometry program, not a rewritten write seam.\n        exec(compile(geometry,'<actual-normal-geometry>','exec'),{'__name__':'__main__','__file__':str(root/'scripts/refine-coastlines-constrained-4.0.48.py')})\n        diagnostic=root/'data/diagnostics/constrained-coastline-4.0.48.json'\n        assert json.loads(diagnostic.read_text())['refinedZones']==0\n        assert diagnostic.is_file() and not diagnostic.is_symlink()\n        assert json.loads((root/'data/zones.geojson').read_text())['features']==[]\n        assert json.loads((root/'data/geometry-snapshots/zones-4.0.48.geojson').read_text())['features']==[]\n        cases+=1\n        # A copied pre-existing directory is not silently adopted as fixture-owned.\n        (seed/'data/diagnostics').mkdir()\n        namespace={'own':own,'seed':seed,'mode':'preexisting-'+str(index),'shutil':shutil}\n        try:\n            exec(compile('if True:\\n'+prefix,'<actual-fixture-root-prefix>','exec'),namespace)\n        except FileExistsError:\n            pass\n        else:\n            raise AssertionError('PREEXISTING_DIAGNOSTICS_DIRECTORY_ADOPTED')\n        assert not (namespace['root']/'data/diagnostics/constrained-coastline-4.0.48.json').exists()\n        (seed/'data/diagnostics').rmdir()\n        cases+=1\nprint(json.dumps({'status':'SOURCE19_GEOMETRY_DIRECTORY_PREREQUISITE_PASS','cases':cases,'actualGeometryProgram':True,'syntheticEmptyGeometry':True,'nativeH70':'UNRUN','nativeH71':'UNRUN','sourceAdmission':False}))\n"], {
    input: JSON.stringify({ fixtures: documents, geometry }), encoding: 'utf8', timeout: 20_000, maxBuffer: 16_384,
    env: { PATH: process.env.PATH, ...(process.env.SYSTEMROOT ? { SYSTEMROOT: process.env.SYSTEMROOT } : {}),
      PYTHONDONTWRITEBYTECODE: '1', PYTHONNOUSERSITE: '1' },
  });
  assert.equal(probe.error, undefined); assert.equal(probe.signal, null);
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stderr, '');
  const report = JSON.parse(probe.stdout.trim().split('\n').at(-1));
  assert.deepEqual(report, { status: 'SOURCE19_GEOMETRY_DIRECTORY_PREREQUISITE_PASS', cases: 4,
    actualGeometryProgram: true, syntheticEmptyGeometry: true,
    nativeH70: 'UNRUN', nativeH71: 'UNRUN', sourceAdmission: false });
  return report;
}

// TEST-ONLY closed diagnostic regression; no native execution or failure relabelling.
export async function testSource19BeforeHFailureDiagnostics(documents = null) {
  const {spawnSync} = await import('node:child_process');
  const root = process.cwd();
  const names = ['scripts/test-source19-cp-install-native.py', 'scripts/test-source19-union-native.py'];
  documents ??= await Promise.all(names.map(async name => ({name, text: await fs.readFile(path.join(root, name), 'utf8')})));
  assert.deepEqual(documents.map(row => row.name), names);
  const probe = spawnSync(process.env.PYTHON || 'python', ['-I', '-B', '-c', "import ast,hashlib,json,os,pathlib,re,stat,sys,tempfile\ndocuments=json.load(sys.stdin)\nunits=[]\nfor d in documents:\n    tree=ast.parse(d['text'])\n    nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('classify_source19_before_h_stderr','capture_source19_before_h_failure')]\n    assert len(nodes)==2\n    units.append(ast.dump(ast.Module(body=nodes,type_ignores=[])))\n    assert \"and first is None:\" in d['text']\n    assert d['text'].count(\"before_h = capture_source19_before_h_failure(root, process is not None and process.poll() is not None)\")==1\n    for marker in ('CHECKPOINT_PROTECTED_READ','PRIVATE_POINTER_READ','PRIVATE_BUCKET_READ','PRIVATE_B_OBJECT_DOWNLOAD'):\n        assert d['text'].count(\"append('\"+marker+\"')\")==1\nassert units[0]==units[1]\ntree=ast.parse(documents[0]['text'])\nnodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('classify_source19_before_h_stderr','capture_source19_before_h_failure')]\nns={'re':re,'stat':stat,'os':os,'Path':pathlib.Path,'json':json,'sha':lambda raw:hashlib.sha256(raw).hexdigest(),'ROOT':pathlib.Path.cwd(),'ENTRY':pathlib.Path('.github/actions/save-owned-dmi-grib/index.cjs')}\nexec(compile(ast.Module(body=nodes,type_ignores=[]),'<actual-test-diagnostic-functions>','exec'),ns)\nclassify=ns['classify_source19_before_h_stderr']\ncases=[(b'Protected RavScore checkpoint read could not be reached','CHECKPOINT_PROTECTED','CHECKPOINT_PROTECTED_REFUSED'),(b'Private runtime pointer readback is missing','PRIVATE_POINTER','PRIVATE_POINTER_REFUSED'),(b'Protected private runtime bucket policy is incompatible','PRIVATE_BUCKET','PRIVATE_BUCKET_REFUSED'),(b'Protected private runtime object integrity is invalid','PRIVATE_B_RESTORE','PRIVATE_B_RESTORE_REFUSED'),(b'Error [ERR_MODULE_NOT_FOUND]: private-CANARY path','NODE_IMPORT','ERR_MODULE_NOT_FOUND'),(b\"code: 'MODULE_NOT_FOUND'\",'NODE_IMPORT','MODULE_NOT_FOUND'),(b'ReferenceError: private-CANARY value','NODE_RUNTIME','NODE_ERROR'),(b'SyntaxError: private-CANARY','NODE_RUNTIME','NODE_ERROR'),(b'RuntimeError: SOURCE_NORMAL_NODE22_REQUIRED','SOURCE_FIXED_GUARD','SOURCE_NORMAL_NODE22_REQUIRED'),(b'RuntimeError: SOURCE_FAKE_CANARY','UNKNOWN','UNKNOWN'),(b'private-CANARY unknown failure','UNKNOWN','UNKNOWN'),(b'DMI_RAW_SAVE_DIAGNOSTIC stage=INPUT reason=UNKNOWN','UNKNOWN','UNKNOWN')]\ncases += [(b'SOURCE_RUN_DIAGNOSTIC stage=CHECKPOINT_PROTECTED reason=SOURCE_PRELUDE_PROGRAM_FAILED node_class=ERROR rejection=NONE','CHECKPOINT_PROTECTED','SOURCE_PRELUDE_PROGRAM_FAILED'),(b'SOURCE_RUN_DIAGNOSTIC stage=SOURCE_IMPORT reason=ERR_MODULE_NOT_FOUND node_class=ERROR rejection=NONE','SOURCE_IMPORT','ERR_MODULE_NOT_FOUND'),(b'SOURCE_RUN_DIAGNOSTIC stage=PRIVATE_CANARY reason=SOURCE_PRIVATE_CANARY node_class=ERROR rejection=NONE','UNKNOWN','UNKNOWN')]\nfor raw,stage,code in cases:\n    result=classify(raw,{'SOURCE_NORMAL_NODE22_REQUIRED','SOURCE_PRELUDE_PROGRAM_FAILED'})\n    assert result[0]['stage']==stage and result[0]['code']==code\n    assert 'CANARY' not in json.dumps(result) and 'private-' not in json.dumps(result)\nwith tempfile.TemporaryDirectory(prefix='rr-s19-private-child-diagnostics-') as temporary:\n    own=pathlib.Path(temporary)\n    raw=b'private-CANARY\\n'+b'x'*32768+b'\\nError [ERR_MODULE_NOT_FOUND]: private-CANARY\\n'\n    # Complete the synthetic writer before the unchanged stable-read guard.\n    with (own/'stderr').open('xb') as writer:\n        writer.write(raw)\n        writer.flush()\n        os.fsync(writer.fileno())\n    pending=ns['capture_source19_before_h_failure'](own,False)\n    assert pending=={'capture':'PENDING_CHILD_STOP','sourceAdmission':False}\n    assert not (own/'source19-before-h-child-failure.json').exists()\n    result=ns['capture_source19_before_h_failure'](own,True)\n    assert result['capture']=='COMPLETE_STABLE' and result['stderrBytes']==len(raw)\n    assert result['stderrSha256']==hashlib.sha256(raw).hexdigest()\n    assert result['fixedFailures'][0]['code']=='ERR_MODULE_NOT_FOUND'\n    assert result['wholePrivateStderrRetained'] is True and result['sourceAdmission'] is False\n    assert (own/'stderr').read_bytes()==raw\n    assert json.loads((own/'source19-before-h-child-failure.json').read_text())==result\n    assert 'CANARY' not in json.dumps(result)\n    refused=ns['capture_source19_before_h_failure'](own,True)\n    assert refused['capture']=='UNPROVEN_RETAINED' and (own/'stderr').read_bytes()==raw\n    missing=ns['capture_source19_before_h_failure'](own/'absent',True)\n    assert missing['capture']=='UNPROVEN_RETAINED'\nprint(json.dumps({'status':'SOURCE19_BEFORE_H_DIAGNOSTICS_PASS','classificationCases':len(cases),'wholeStderrBeyond16KiB':True,'nativeActual':'UNRUN','sourceAdmission':False}))\n"], {
    input: JSON.stringify(documents), encoding: 'utf8', timeout: 10_000, maxBuffer: 16_384,
    env: {PATH: process.env.PATH, ...(process.env.SYSTEMROOT ? {SYSTEMROOT: process.env.SYSTEMROOT} : {})},
  });
  assert.equal(probe.error, undefined); assert.equal(probe.signal, null);
  assert.equal(probe.status, 0, probe.stderr); assert.equal(probe.stderr, '');
  const result=JSON.parse(probe.stdout);
  assert.deepEqual(result,{status:'SOURCE19_BEFORE_H_DIAGNOSTICS_PASS',classificationCases:15,wholeStderrBeyond16KiB:true,nativeActual:'UNRUN',sourceAdmission:false});
  return result;
}
// END TEST-ONLY closed diagnostic regression.

// Exact additive diagnostics composition; historical fixtures remain frozen.
const source19DiagnosticProducts = [{"path":".github/actions/save-owned-dmi-grib/index.cjs","beforeSha256":"008ba0937c85546f73c6713a63b27bab948a44c20ea57e70910ab921eb56ace1","afterSha256":"dd8bd752a5cef8c927db2c00e642ab240638e3ab10c56d9f57c9546ab4e02926","blockStart":"// SOURCE_ACTION_DIAGNOSTIC_BEGIN:","blockEnd":"// SOURCE_ACTION_DIAGNOSTIC_END","blockSha256":"82d37820dae7ccb105dfed78d4363f8a86f68c6e9cc1e2a6796695238d850e9e","rules":[{"before":"async function runSourceGeneration() {\n  fixedDistributionInputs();\n  if (process.argv.length !== 2 || process.env.INPUT_OPERATION !== 'source') {\n    throw refused('DMI_RAW_SAVE_ARGUMENT_REFUSED');\n  }\n  const normal = await import(pathToFileURL(path.join(ROOT,\n    'scripts/protected-private-production-runtime.mjs')).href);\n  // P awaits the fixed artifact/T consumer under the SAME issuer. A Set or\n  // an exit code is never used to replace those actual awaited operations.\n  // This action still emits no SOURCE-complete/READY/hosted-publication flag.\n  return normal.runSourceCompleteEntry();","after":"async function runSourceGeneration() {\n  fixedDistributionInputs();\n  if (process.argv.length !== 2 || process.env.INPUT_OPERATION !== 'source') {\n    throw refused('DMI_RAW_SAVE_ARGUMENT_REFUSED');\n  }\n  let normal;\n  try {\n    normal = await import(pathToFileURL(path.join(ROOT,\n      'scripts/protected-private-production-runtime.mjs')).href);\n  } catch (error) { sourceFailureImportError = error; throw error; }\n  sourceFailureDiagnosticReader = normal.sourceFailureDiagnostic;\n  // P awaits the fixed artifact/T consumer under the SAME issuer. A Set or\n  // an exit code is never used to replace those actual awaited operations.\n  // This action still emits no SOURCE-complete/READY/hosted-publication flag.\n  return normal.runSourceCompleteEntry();"},{"before":"    process.stderr.write(refusalDiagnostic(error));\n","after":"    process.stderr.write(refusalDiagnostic(error));\n    if (process.env.INPUT_OPERATION === 'source') process.stderr.write(sourceFailureDiagnosticLine(error));\n"}]},{"path":"scripts/protected-private-production-runtime.mjs","beforeSha256":"fd595ee0ebafc4a06b9516e404e674da56a3abdbdef7fc720a7a94b05b1c0e77","afterSha256":"a3ee076322bd4dcc9a1fa0b36948aadb1b8e672efa1f4d65c062b4e8c5852273","blockStart":"// SOURCE_DIAGNOSTIC_BEGIN:","blockEnd":"// SOURCE_DIAGNOSTIC_END","blockSha256":"e06db4f4f98064a721fc707e3f37c1a22710233a1e46d1b165cd4879de45c58f","rules":[{"before":"const sourceDeadlineFailure = code => { throw new Error(code); };\n","after":"const sourceDeadlineFailure = code => { throw sourceGuardError(code); };\n"},{"before":"function sourceOriginalFailure(code) { throw new Error(`SOURCE_ORIGINAL_${code}`); }\n","after":"function sourceOriginalFailure(code) { throw sourceGuardError(`SOURCE_ORIGINAL_${code}`); }\n"},{"before":"  issued.normalDriver = driver; // retain before the first authentic read or child\n","after":"  issued.normalDriver = driver; // retain before the first authentic read or child\n  sourceDriverDiagnosticStages.set(driver, 'ROUTE');\n"},{"before":"    await beginSourceNormalPrelude(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PRELUDE');\n    await beginSourceNormalPrelude(holder);\n"},{"before":"    const preflight = await runSourceNormalPreflight(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PREFLIGHT');\n    const preflight = await runSourceNormalPreflight(holder);\n"},{"before":"    await runSourceNormalAdminPrelude(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'ADMIN');\n    await runSourceNormalAdminPrelude(holder);\n"},{"before":"    await runSourceNormalHandoffSelection(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'HANDOFF');\n    await runSourceNormalHandoffSelection(holder);\n"},{"before":"    await runSourceNormalOriginalSelection(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'ORIGINAL_SELECTION');\n    await runSourceNormalOriginalSelection(holder);\n"},{"before":"    await runSourceNormalCheckpointRestore(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'CHECKPOINT_PROTECTED');\n    await runSourceNormalCheckpointRestore(holder);\n"},{"before":"    await prepareSourceNormalArchivedReaders(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'ARCHIVED_READERS');\n    await prepareSourceNormalArchivedReaders(holder);\n"},{"before":"    await prepareSourceNormalOriginalRoot(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PRIVATE_ROOT');\n    await prepareSourceNormalOriginalRoot(holder);\n"},{"before":"    await acquireSourceNormalProgressCipher(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PROGRESS_CACHE');\n    await acquireSourceNormalProgressCipher(holder);\n"},{"before":"    driver.original = await runSourceNormalOriginalInstall(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'ORIGINAL_INSTALL');\n    driver.original = await runSourceNormalOriginalInstall(holder);\n"},{"before":"    await runSourceNormalOriginalPostInstall(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'POST_INSTALL');\n    await runSourceNormalOriginalPostInstall(holder);\n"},{"before":"    await captureSourceNormalProgressBase(holder);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PROGRESS_BASE');\n    await captureSourceNormalProgressBase(holder);\n"},{"before":"    await runSourceNormalProgress(holder, driver.original);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PROGRESS_UNION');\n    await runSourceNormalProgress(holder, driver.original);\n"},{"before":"    await resolveSourceNormalProtectedBootstrap(holder, driver.original);\n","after":"    sourceDriverDiagnosticStages.set(driver, 'PRODUCER_CHAIN');\n    await resolveSourceNormalProtectedBootstrap(holder, driver.original);\n"},{"before":"    driver.firstFailure ??= [error];\n    const owner = sourceJobDeadlineBrands.get(holder)?.originalOwner;\n","after":"    driver.firstFailure ??= [error];\n    rememberSourceDriverFailure(driver, driver.firstFailure[0]);\n    const owner = sourceJobDeadlineBrands.get(holder)?.originalOwner;\n"}]}];
const source19DiagnosticFixtures = [{"parent":"scripts/test-source19-cp-install-native-d504-fixture.mjs","next":"scripts/test-source19-cp-install-native-d504-diagnostics-fixture.mjs","parentSha256":"83642a2aead446a85eddc98c791d53e2331963082aa6e7c567beb94a6893169a","afterSha256":"9eef534316376da4fb850ff07347284b50f06a2f1db372657d36aa482ae556de","guard":"  const diagnosticParent = path.join(ROOT, fixtureIdentity.diagnosticParentFixture);\n  const diagnosticParentStat = await fs.lstat(diagnosticParent);\n  assert.ok(diagnosticParentStat.isFile() && !diagnosticParentStat.isSymbolicLink() && diagnosticParentStat.nlink === 1, 'DIAGNOSTIC_PARENT_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(diagnosticParent, 'utf8'))), fixtureIdentity.diagnosticParentSha256, 'FROZEN_D504_FIXTURE_BYTES_CHANGED');\n"},{"parent":"scripts/test-source19-union-native-d504-fixture.mjs","next":"scripts/test-source19-union-native-d504-diagnostics-fixture.mjs","parentSha256":"071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6","afterSha256":"549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5","guard":"  const diagnosticParent = path.join(ROOT, fixtureIdentity.diagnosticParentFixture);\n  const diagnosticParentStat = await fs.lstat(diagnosticParent);\n  assert.ok(diagnosticParentStat.isFile() && !diagnosticParentStat.isSymbolicLink() && diagnosticParentStat.nlink === 1, 'DIAGNOSTIC_PARENT_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(diagnosticParent, 'utf8'))), fixtureIdentity.diagnosticParentSha256, 'FROZEN_D504_FIXTURE_BYTES_CHANGED');\n"}];
export function projectSource19FixedDiagnosticProduct(file, actual) {
  actual=projectSource19RestoreBoundsProduct(file,actual);
  if (file === 'scripts/test-protected-private-production-runtime.mjs') {
    actual=actual.replaceAll('\r\n','\n');
    if (sha(actual)==='ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0') return actual;
    assert.equal(sha(actual),'aa8a7d07881f7ccf743d56a0c8e60c0ab5c88d0174ef327a28d1d861ff03380a','Exact V2 observation test');
    const queryLine="  moduleUrl.search = 'source-disposition-test=' + crypto.randomUUID();\n";
    assert.equal(actual.split(queryLine).length,2);
    const inverse=actual.replace(queryLine,'');
    assert.equal(sha(inverse),'ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0','Whole historical observation test');
    return inverse;
  }
  const row=source19DiagnosticProducts.find(row=>row.path===file);
  if(!row)return actual;
  actual=actual.replaceAll('\r\n','\n');
  if(sha(actual)===row.beforeSha256)return actual;
  assert.equal(sha(actual),row.afterSha256,'Exact reviewed diagnostic product afterimage');
  const start=actual.indexOf(row.blockStart),end=actual.indexOf(row.blockEnd,start);
  assert.ok(start>=0&&end>start);
  const block=actual.slice(start,end+row.blockEnd.length)+'\n\n';
  assert.equal(sha(block),row.blockSha256);
  assert.equal(actual.split(block).length,2);let inverse=actual.replace(block,'');
  for(const rule of [...row.rules].reverse()){
    assert.equal(inverse.split(rule.after).length,2);inverse=inverse.replace(rule.after,()=>rule.before);
  }
  assert.equal(sha(inverse),row.beforeSha256,'Entire pre-diagnostic product, not selected guards');
  return inverse;
}
function projectSource19FixedDiagnosticJobs(actual) {
  actual=projectSource19RestoreBoundsJobs(actual);
  if (sha(actual) === 'cfa875fcee557f018d3349abbe200547a9c491a692173fd40df63ed844f7c9fb') {
    assert.equal(actual.split(' --composition integrated-d504-diagnostics-v2').length,3);
    actual=actual.replaceAll(' --composition integrated-d504-diagnostics-v2',' --composition integrated-d504-diagnostics');
    assert.equal(sha(actual),'2286dce6119d90c0c062061791665045f9a87ebe804058a324e38aa48495a138','Exact entire V2-to-V1 seven-job inverse');
  }
  if(sha(actual)!=="2286dce6119d90c0c062061791665045f9a87ebe804058a324e38aa48495a138")return actual;
  assert.equal(actual.split(' --composition integrated-d504-diagnostics').length,3);
  const inverse=actual.replaceAll(' --composition integrated-d504-diagnostics',' --composition integrated-d504');
  assert.equal(sha(inverse),'b7414f8784e43f2c7c5560c73558d2b3cabcc8e9a35e24a3752323bacbfaaef4');
  return inverse;
}
function projectSource19FixedDiagnosticScope(actual) {
  actual=projectSource19RestoreBoundsScope(actual);
  if(sha(JSON.stringify(actual))!=="1a57c0d62f9b588d02de7a0aa366d67292fa653bebe0d9afebb1eacf1c1e089c")return actual;
  const inverse=actual.filter(file=>!source19DiagnosticFixtures.some(row=>row.next===file));
  assert.equal(actual.length-inverse.length,2);
  assert.equal(sha(JSON.stringify(inverse)),'ac7b7639544f0507be3951b794383b6b70caf00894aa98e5bf6fe36f9dfe185d');
  return inverse;
}
export async function assertSource19FixedDiagnosticComposition(documents = {}) {
  const read=async file=>projectSource19RestoreBoundsProduct(file,(documents[file]??await fs.readFile(path.join(process.cwd(),file),'utf8')).replaceAll('\r\n','\n'));
  const object=(text,name)=>{
    const match=text.match(new RegExp('const '+name+'=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);'));
    assert.ok(match);return {literal:match[0],value:JSON.parse(match[1])};
  };
  for(const row of source19DiagnosticProducts){
    const actual=await read(row.path);
    assert.equal(sha(actual),row.afterSha256);
    assert.equal(sha(projectSource19FixedDiagnosticProduct(row.path,actual)),row.beforeSha256);
  }
  const observation=await read('scripts/test-protected-private-production-runtime.mjs');
  assert.equal(sha(observation),'aa8a7d07881f7ccf743d56a0c8e60c0ab5c88d0174ef327a28d1d861ff03380a','Exact V2 observation test');
  const queryLine="  moduleUrl.search = 'source-disposition-test=' + crypto.randomUUID();\n";
  assert.equal(observation.split(queryLine).length,2);
  assert.equal(sha(observation.replace(queryLine,'')),'ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0','Entire original test and every old assertion preserved');
  for(const row of source19DiagnosticFixtures){
    const parent=await read(row.parent),actual=await read(row.next);
    assert.equal(sha(parent),row.parentSha256,'Frozen reviewed d504 fixture');
    assert.equal(sha(actual),row.afterSha256,'Exact additive diagnostic fixture');
    const oldIdentity=object(parent,'fixtureIdentity'),newIdentity=object(actual,'fixtureIdentity');
    const oldPins=object(parent,'fixtureProductPins'),newPins=object(actual,'fixtureProductPins');
    assert.deepEqual(Object.keys(newPins.value),Object.keys(oldPins.value));assert.equal(Object.keys(newPins.value).length,27);
    const changed=Object.keys(newPins.value).filter(file=>newPins.value[file]!==oldPins.value[file]);
    assert.deepEqual(changed,[...source19DiagnosticProducts.map(row=>row.path), 'scripts/test-protected-private-production-runtime.mjs']);
    assert.equal(Object.keys(newPins.value).length-changed.length,24,'24 unchanged relative to the reviewed d504 parent; two product pins and one explicit observation-test delta');
    assert.equal(newIdentity.value.diagnosticBaseHead,'6969e3c161ff076640aa958247506f4eebfeb765');
    assert.equal(newIdentity.value.diagnosticCompositionId,"972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a");
    assert.equal(newIdentity.value.evidence,'LINUX_UNRUN_NO_ADMISSION');
    for(const [file,expected] of Object.entries(newPins.value))assert.equal(sha(await read(file)),expected);
    let inverse=actual.replace(newIdentity.literal,oldIdentity.literal).replace(newPins.literal,oldPins.literal);
    assert.equal(inverse.split(row.guard).length,2);inverse=inverse.replace(row.guard,'');
    inverse=inverse.replace("    '"+row.next+"',\n    '"+row.parent+"',\n","    '"+row.parent+"',\n")
      .replace("      && file !== '"+row.next+"') continue;","      && file !== '"+row.parent+"') continue;");
    assert.equal(inverse,parent,'Entire original d504 preparation and assertions remain frozen');
    assert.equal(source19NativeCiRequired([row.next]),true);
  }
  return {status:'SOURCE19_DIAGNOSTIC_COMPOSITION_PASS',changedProductPins:2,changedObservationPins:1,unchangedParentPins:24,oldFixturesUnchanged:4,nativeActual:'UNRUN',sourceAdmission:false};
}
// END exact additive diagnostics composition.

// Pure diagnostic boundary only; no SOURCE owner, H, child or admission is issued.
export async function testSource19FixedProductDiagnostics(documents = null) {
  const {types} = await import('node:util');
  const {runInNewContext} = await import('node:vm');
  const root=process.cwd();
  documents ??= {
    runtime:await fs.readFile(path.join(root,'scripts/protected-private-production-runtime.mjs'),'utf8'),
    action:await fs.readFile(path.join(root,'.github/actions/save-owned-dmi-grib/index.cjs'),'utf8'),
  };
  const source=documents.runtime.replaceAll('\r\n','\n'), action=documents.action.replaceAll('\r\n','\n');
  const select=(text,first,last)=>{
    const start=text.indexOf(first),end=text.indexOf(last,start);
    assert.ok(start>=0&&end>start,'Exact fixed diagnostic source block required');
    return text.slice(start,end+last.length);
  };
  const block=select(source,'// SOURCE_DIAGNOSTIC_BEGIN:','// SOURCE_DIAGNOSTIC_END');
  const deadlineConstructor=source.match(/^const sourceDeadlineFailure = code => .*$/m)?.[0];
  const originalConstructor=source.match(/^function sourceOriginalFailure\(code\) .*$/m)?.[0];
  assert.ok(deadlineConstructor&&originalConstructor);
  const runtime=runInNewContext(block.replace('export function sourceFailureDiagnostic','function sourceFailureDiagnostic')+
    '\n'+deadlineConstructor+'\n'+originalConstructor+
    '\n({read:sourceFailureDiagnostic,guard:sourceGuardError,deadline:sourceDeadlineFailure,original:sourceOriginalFailure,remember:rememberSourceDriverFailure,drivers:sourceDriverDiagnosticStages,makeError:message=>new Error(message)})',{sourcePreludeTypes:types});
  const plain=value=>JSON.parse(JSON.stringify(value));
  const unknown={stage:'UNKNOWN',reason:'UNKNOWN',nodeClass:'UNKNOWN',rejection:'UNKNOWN'};
  let real;
  try{runtime.deadline('SOURCE_JOB_IDENTITY_INVALID')}catch(error){real=error}
  assert.ok(types.isNativeError(real));
  const prior=Object.getOwnPropertyDescriptors(real);
  assert.deepEqual(plain(runtime.read(real)),{stage:'SOURCE_GUARD',reason:'SOURCE_JOB_IDENTITY_INVALID',nodeClass:'ERROR',rejection:'NONE'});
  const originalReport=runtime.read(real);
  assert.equal(originalReport.reason,real.message);assert.deepEqual(Object.getOwnPropertyDescriptors(real),prior);
  let originalGuard;
  try{runtime.original('NORMAL_INSTALL_INCOMPLETE')}catch(error){originalGuard=error}
  assert.ok(types.isNativeError(originalGuard));
  assert.equal(runtime.read(originalGuard).reason,'SOURCE_ORIGINAL_NORMAL_INSTALL_INCOMPLETE');
  const driver={};runtime.drivers.set(driver,'CHECKPOINT_PROTECTED');
  const failedProgram=runtime.makeError('SOURCE_PRELUDE_PROGRAM_FAILED');
  const failedProgramDescriptors=Object.getOwnPropertyDescriptors(failedProgram);
  runtime.remember(driver,failedProgram);
  assert.deepEqual(plain(runtime.read(failedProgram)),{stage:'CHECKPOINT_PROTECTED',reason:'SOURCE_PRELUDE_PROGRAM_FAILED',nodeClass:'ERROR',rejection:'NONE'});
  assert.deepEqual(Object.getOwnPropertyDescriptors(failedProgram),failedProgramDescriptors);
  runtime.drivers.set(driver,'PRIVATE_ROOT');runtime.remember(driver,failedProgram);
  assert.equal(runtime.read(failedProgram).stage,'CHECKPOINT_PROTECTED','first recorded error boundary is immutable');
  let traps=0;
  const proxy=new Proxy({}, {get(){traps++;throw 0},getOwnPropertyDescriptor(){traps++;throw 0},getPrototypeOf(){traps++;throw 0}});
  const forged=runtime.makeError('SOURCE_JOB_IDENTITY_INVALID');
  const getter=runtime.makeError('private-CANARY');
  Object.defineProperty(getter,'code',{get(){traps++;throw 0}});
  const badCode=Object.assign(runtime.makeError('private-CANARY'),{code:'PRIVATE_CANARY'});
  for(const value of [undefined,null,123,'private-CANARY',{},proxy,forged,getter,badCode,runtime.guard('SOURCE_PRIVATE_CANARY')]){
    assert.deepEqual(plain(runtime.read(value)),unknown);
  }
  runtime.remember(driver,getter);runtime.remember(driver,proxy);
  assert.deepEqual(plain(runtime.read(getter)),unknown);assert.deepEqual(plain(runtime.read(proxy)),unknown);
  assert.equal(traps,0);
  const unissued=runtime.makeError('SOURCE_JOB_IDENTITY_INVALID');
  runtime.remember({},unissued);assert.deepEqual(plain(runtime.read(unissued)),unknown);
  const moduleFailure=Object.assign(runtime.makeError('private-CANARY module path'),{code:'ERR_MODULE_NOT_FOUND'});
  runtime.drivers.set(driver,'ARCHIVED_READERS');runtime.remember(driver,moduleFailure);
  assert.deepEqual(plain(runtime.read(moduleFailure)),{stage:'ARCHIVED_READERS',reason:'ERR_MODULE_NOT_FOUND',nodeClass:'ERROR',rejection:'NONE'});
  const rejectedB=Object.assign(runtime.makeError('private-CANARY values'),{code:'PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION',rejectionCodes:Object.freeze(['STORAGE_OR_OBJECT_INTEGRITY'])});
  runtime.drivers.set(driver,'ORIGINAL_INSTALL');runtime.remember(driver,rejectedB);
  assert.deepEqual(plain(runtime.read(rejectedB)),{stage:'ORIGINAL_INSTALL',reason:'PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION',nodeClass:'ERROR',rejection:'STORAGE_OR_OBJECT_INTEGRITY'});
  const unsafeArray=[];
  Object.defineProperty(unsafeArray,'0',{get(){traps++;throw 0}});unsafeArray.length=1;
  const unsafeRejection=Object.assign(runtime.makeError('private-CANARY'),{code:'PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION',rejectionCodes:unsafeArray});
  runtime.remember(driver,unsafeRejection);
  assert.equal(runtime.read(unsafeRejection).rejection,'UNKNOWN');assert.equal(traps,0);
  runtime.remember(driver,badCode);
  assert.equal(runtime.read(badCode).reason,'UNKNOWN');
  assert.ok(!JSON.stringify([runtime.read(moduleFailure),runtime.read(rejectedB),runtime.read(badCode)]).includes('CANARY'));
  const actionBlock=select(action,'// SOURCE_ACTION_DIAGNOSTIC_BEGIN:','// SOURCE_ACTION_DIAGNOSTIC_END');
  const formatterStart=action.indexOf('const REFUSAL_REASONS = new Set([');
  const formatterEnd=action.indexOf('// SOURCE_ACTION_DIAGNOSTIC_BEGIN:',formatterStart);
  const oldFormatter=action.slice(formatterStart,formatterEnd).trimEnd();
  assert.equal(sha(oldFormatter+'\n'), '3239ed509ea5f0cde2f58ab5a55a236b1360db8885e72e9da181895c060df24b','Old formatter unchanged');
  const catchStart=action.lastIndexOf('  }).catch(error => {\n');
  const catchEnd=action.indexOf('\n  });\n}',catchStart);
  const catchBody=action.slice(catchStart+'  }).catch(error => {\n'.length,catchEnd);
  const added="    if (process.env.INPUT_OPERATION === 'source') process.stderr.write(sourceFailureDiagnosticLine(error));\n";
  assert.equal(catchBody.split(added).length,2);
  assert.equal(sha(catchBody.replace(added,'')),'d0f2fc9a8d268c58c497a2f0ac9d284de00f0ec13d2949000bbb0b135b2b7fca','Entire old catch survives');
  let stderr='',exitCode=null;
  const environment={INPUT_OPERATION:'source'};
  const actionHooks=runInNewContext('let cliPhase="INPUT";\n'+oldFormatter+'\n'+actionBlock+
    '\n({line:sourceFailureDiagnosticLine,setReader:value=>{sourceFailureDiagnosticReader=value},setImport:value=>{sourceFailureImportError=value},catchError:error=>{\n'+catchBody+'\n}})',{
      types,process:{env:environment,stderr:{write:value=>{stderr+=value}},set exitCode(value){exitCode=value}},
    });
  actionHooks.setReader(runtime.read);
  const fixedLine='SOURCE_RUN_DIAGNOSTIC stage=CHECKPOINT_PROTECTED reason=SOURCE_PRELUDE_PROGRAM_FAILED node_class=ERROR rejection=NONE\n';
  assert.equal(actionHooks.line(failedProgram),fixedLine);
  actionHooks.catchError(failedProgram);
  assert.equal(stderr,'DMI_RAW_SAVE_REFUSED\nDMI_RAW_SAVE_DIAGNOSTIC stage=INPUT reason=UNKNOWN\n'+fixedLine);
  assert.equal(exitCode,1);
  environment.INPUT_OPERATION='save';stderr='';exitCode=null;
  actionHooks.catchError(Object.assign(runtime.makeError('private-CANARY'),{code:'ENOENT'}));
  assert.equal(stderr,'DMI_RAW_SAVE_REFUSED\nDMI_RAW_SAVE_DIAGNOSTIC stage=INPUT reason=ENOENT\n');
  assert.equal(exitCode,1);environment.INPUT_OPERATION='source';
  assert.equal(actionHooks.line(forged),'SOURCE_RUN_DIAGNOSTIC stage=UNKNOWN reason=UNKNOWN node_class=UNKNOWN rejection=UNKNOWN\n');
  for(const value of [proxy,getter,undefined,null,'private-CANARY',badCode]){
    const line=actionHooks.line(value);assert.ok(!line.includes('CANARY'));assert.ok(!line.includes('private-'));
  }
  actionHooks.setReader(null);
  actionHooks.setImport(moduleFailure);
  assert.equal(actionHooks.line(moduleFailure),'SOURCE_RUN_DIAGNOSTIC stage=SOURCE_IMPORT reason=ERR_MODULE_NOT_FOUND node_class=ERROR rejection=NONE\n');
  const forgedModule=Object.assign(runtime.makeError('private-CANARY'),{code:'ERR_MODULE_NOT_FOUND'});
  assert.equal(actionHooks.line(forgedModule),'SOURCE_RUN_DIAGNOSTIC stage=UNKNOWN reason=UNKNOWN node_class=UNKNOWN rejection=UNKNOWN\n');
  actionHooks.setReader(()=>proxy);assert.ok(actionHooks.line(real).includes('stage=UNKNOWN reason=UNKNOWN'));
  const reportGetter={reason:'SOURCE_JOB_IDENTITY_INVALID',nodeClass:'ERROR',rejection:'NONE'};
  Object.defineProperty(reportGetter,'stage',{enumerable:true,get(){traps++;throw 0}});
  actionHooks.setReader(()=>reportGetter);assert.ok(actionHooks.line(real).includes('stage=UNKNOWN reason=UNKNOWN'));
  actionHooks.setReader(()=>{throw Error('private-CANARY')});assert.ok(actionHooks.line(real).includes('stage=UNKNOWN reason=UNKNOWN'));
  assert.equal(traps,0);
  return {status:'SOURCE19_FIXED_PRODUCT_DIAGNOSTICS_PASS',firstErrorIdentityAndPropertiesPreserved:true,oldDiagnosticAndExitPreserved:true,closedNegativeClasses:8,guardOrOwnerAuthorityIssued:false,nativeActual:'UNRUN',sourceAdmission:false};
}
// END pure fixed product diagnostics.

// Exact V3 projection precedes every older whole-file/job/scope inverse.
const source19RestoreBoundsFixtures = [{"parent":"scripts/test-source19-cp-install-native-d504-diagnostics-fixture.mjs","next":"scripts/test-source19-cp-install-native-d504-restore-bounds-fixture.mjs","parentSha256":"9eef534316376da4fb850ff07347284b50f06a2f1db372657d36aa482ae556de","afterSha256":"eb1938448887de4df7442261df2d3b71a22bd421de54ae4bb8fdadf229ec3227","guard":"  const restoreBoundsParent = path.join(ROOT, fixtureIdentity.restoreBoundsParentFixture);\n  const restoreBoundsParentStat = await fs.lstat(restoreBoundsParent);\n  assert.ok(restoreBoundsParentStat.isFile() && !restoreBoundsParentStat.isSymbolicLink() && restoreBoundsParentStat.nlink === 1, 'RESTORE_BOUNDS_PARENT_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(restoreBoundsParent, 'utf8'))), fixtureIdentity.restoreBoundsParentSha256, 'FROZEN_V2_FIXTURE_BYTES_CHANGED');\n"},{"parent":"scripts/test-source19-union-native-d504-diagnostics-fixture.mjs","next":"scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs","parentSha256":"549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5","afterSha256":"510ebb1230b460be71fffcefa62c14def7116fe5a2fc05f7dbd8caa25dfe692a","guard":"  const restoreBoundsParent = path.join(ROOT, fixtureIdentity.restoreBoundsParentFixture);\n  const restoreBoundsParentStat = await fs.lstat(restoreBoundsParent);\n  assert.ok(restoreBoundsParentStat.isFile() && !restoreBoundsParentStat.isSymbolicLink() && restoreBoundsParentStat.nlink === 1, 'RESTORE_BOUNDS_PARENT_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(restoreBoundsParent, 'utf8'))), fixtureIdentity.restoreBoundsParentSha256, 'FROZEN_V2_FIXTURE_BYTES_CHANGED');\n"}];
function projectSource19RestoreBoundsProduct(file, actual) {
  if(file !== 'scripts/protected-private-production-runtime.mjs') return actual;
  actual=actual.replaceAll('\r\n','\n');
  if(sha(actual)==='a3ee076322bd4dcc9a1fa0b36948aadb1b8e672efa1f4d65c062b4e8c5852273') return actual;
  assert.equal(sha(actual),'9f6793a851b9a2181fe7353922474e754b059a02f32d82b9ca16424358784931');
  const before="      repositoryRoot: readers.bundleRoot, expected: second });",after="      repositoryRoot: readers.bundleRoot, expected: second,\n      targetReferenceAt: second.targetReferenceAt, minimumReferenceAt: second.minimumReferenceAt,\n      minimumGeneratedAt: second.minimumGeneratedAt });";
  assert.equal(actual.split(after).length,2);
  const inverse=actual.replace(after,before);
  assert.equal(sha(inverse),'a3ee076322bd4dcc9a1fa0b36948aadb1b8e672efa1f4d65c062b4e8c5852273','Whole V3 caller to V2 product');
  return inverse;
}
function projectSource19RestoreBoundsJobs(actual) {
  actual=projectSource19ContinuityJobs(actual);
  if(sha(actual)!=="276f9b99ad6d717f665af69450c351b8ce9e760c21b5692d7e67875c6eeb0e30")return actual;
  assert.equal(actual.split(' --composition integrated-d504-restore-bounds-v3').length,3);
  const inverse=actual.replaceAll(' --composition integrated-d504-restore-bounds-v3',' --composition integrated-d504-diagnostics-v2');
  assert.equal(sha(inverse),"cfa875fcee557f018d3349abbe200547a9c491a692173fd40df63ed844f7c9fb",'Entire seven V3-to-V2 native jobs');
  return inverse;
}
function projectSource19RestoreBoundsScope(actual) {
  actual=projectSource19ContinuityScope(actual);
  if(sha(JSON.stringify(actual))!=="01a1a951956d805c9759d62d01f10c96b37346edb851afed8c3250e90cf5b40a")return actual;
  const inverse=actual.filter(file=>!source19RestoreBoundsFixtures.some(row=>row.next===file));
  assert.equal(actual.length-inverse.length,2);assert.equal(sha(JSON.stringify(inverse)),"1a57c0d62f9b588d02de7a0aa366d67292fa653bebe0d9afebb1eacf1c1e089c");
  return inverse;
}
export async function assertSource19RestoreBoundsComposition() {
  const read=async file=>(await fs.readFile(path.join(process.cwd(),file),'utf8')).replaceAll('\r\n','\n');
  const object=(text,name)=>{const match=text.match(new RegExp('const '+name+'=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);'));assert.ok(match);return {literal:match[0],value:JSON.parse(match[1])};};
  const product=await read('scripts/protected-private-production-runtime.mjs');
  assert.equal(sha(projectSource19RestoreBoundsProduct('scripts/protected-private-production-runtime.mjs',product)),'a3ee076322bd4dcc9a1fa0b36948aadb1b8e672efa1f4d65c062b4e8c5852273');
  for(const row of source19RestoreBoundsFixtures){
    const parent=await read(row.parent),actual=await read(row.next);
    assert.equal(sha(parent),row.parentSha256);assert.equal(sha(actual),row.afterSha256);
    const oi=object(parent,'fixtureIdentity'),ni=object(actual,'fixtureIdentity');
    const op=object(parent,'fixtureProductPins'),np=object(actual,'fixtureProductPins');
    assert.deepEqual(Object.keys(np.value),Object.keys(op.value));assert.equal(Object.keys(np.value).length,27);
    assert.deepEqual(Object.keys(np.value).filter(file=>np.value[file]!==op.value[file]),['scripts/protected-private-production-runtime.mjs']);
    assert.equal(ni.value.restoreBoundsCompositionId,"916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091");
    assert.equal(ni.value.evidence,'LINUX_UNRUN_NO_ADMISSION');
    for(const [file,expected]of Object.entries(np.value))assert.equal(sha(await read(file)),expected);
    let inverse=actual.replace(ni.literal,oi.literal).replace(np.literal,op.literal);
    assert.equal(inverse.split(row.guard).length,2);inverse=inverse.replace(row.guard,'');
    inverse=inverse.replace("    '"+row.next+"',\n    '"+row.parent+"',\n","    '"+row.parent+"',\n")
      .replace("      && file !== '"+row.next+"') continue;","      && file !== '"+row.parent+"') continue;");
    assert.equal(inverse,parent,'Entire issued V2 fixture, not re-pinned evidence');
    assert.equal(source19NativeCiRequired([row.next]),true);
  }
  return {status:'SOURCE19_RESTORE_BOUNDS_V3_COMPOSITION_PASS',changedRuntimePinFromV2:1,totalChangedPinsFromD504:3,unchangedPinsFromD504:24,frozenEarlierFixtures:6,nativeActual:'UNRUN',sourceAdmission:false};
}
// END exact V3 restoration composition.
// Normal API regression for the actual SOURCE local-restore call only.
// No issuer, holder, H70/H71, provider transport or SOURCE completion is fabricated.
export async function testSource19OriginalLocalRestoreBounds() {
  const os=await import('node:os');
  const {pathToFileURL}=await import('node:url');
  const {execFileSync}=await import('node:child_process');
  const root=process.cwd();
  const local=file=>import(pathToFileURL(path.join(root,file)).href);
  const workflow=await local('scripts/private-production-runtime-workflow.mjs');
  const bundle=await local('scripts/private-production-runtime-bundle.mjs');
  const protectedRuntime=await local('scripts/protected-private-production-runtime.mjs');
  const {ravScoreModelBinding}=await local('js/core/ravscore-model-contract.js');
  const {secondRestoreExpectation}=await local('scripts/private-runtime-second-restore-expectation.mjs');
  const test=(await fs.readFile(path.join(root,'scripts/test-protected-private-production-runtime.mjs'),'utf8')).replaceAll('\r\n','\n');
  assert.equal(sha(test),'aa8a7d07881f7ccf743d56a0c8e60c0ab5c88d0174ef327a28d1d861ff03380a');
  const first=test.indexOf('const clone = value =>');
  const end=test.indexOf('\ntry {\n  await fs.mkdir(repository',first);
  const setupEnd=test.indexOf('\n  const baselineContracts =',end);
  assert.ok(first>=0&&end>first&&setupEnd>end);
  const factory=test.slice(first,end),setup=test.slice(end+'\ntry {'.length,setupEnd);
  assert.equal(sha(factory),'458cca26ba913f507307f2316e194fb1e0ac0826e27c82c7bcc4a119007dd065');
  assert.equal(sha(setup),'2b57d6cfdcf3e7f1b5646739a7abeb8967a57cabdab44f9272e68c03776b061f');
  const args={fs,os,path,crypto,process,Buffer,assert,
    PRIVATE_RUNTIME_FILES:workflow.PRIVATE_RUNTIME_FILES,
    PRIVATE_RUNTIME_CONTRACT_FILES:workflow.PRIVATE_RUNTIME_CONTRACT_FILES,
    ravScoreModelBinding,buildPrivateRuntimeCreateSpec:workflow.buildPrivateRuntimeCreateSpec,
    buildPrivateRuntimeExpectation:workflow.buildPrivateRuntimeExpectation,
    createPrivateProductionRuntimeBundle:bundle.createPrivateProductionRuntimeBundle};
  const fixture=await Function(...Object.keys(args),'return (async()=>{\n'+factory+setup
    +'\nreturn {temp,repository,privateRoot,createGeneration,fakeDocuments,fakeStorage};})()')(...Object.values(args));
  try {
    const target=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString();
    const previous=new Date(Date.parse(target)-3600000).toISOString();
    const generation=await fixture.createGeneration(0,{metadataOverride:{generatedAt:previous,productionReferenceAt:previous}});
    const expected=await workflow.buildPrivateRuntimeExpectation({repositoryRoot:fixture.repository,targetReferenceAt:target,now:target});
    const documents=fixture.fakeDocuments(),storage=fixture.fakeStorage();
    const sourceHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    await protectedRuntime.publishProtectedPrivateProductionRuntime({
      privateRoot:fixture.privateRoot,bundlePath:generation.bundlePath,repositoryRoot:fixture.repository,
      expected,now:target,sourceHead,request:documents.request,storage:storage.client});
    const source=await protectedRuntime.describeCurrentProtectedPrivateProductionRuntime({request:documents.request});
    const bundlePath=path.join(fixture.privateRoot,'source-bounds-restored-bundle');
    const restored=await protectedRuntime.restoreProtectedPrivateProductionRuntime({
      privateRoot:fixture.privateRoot,bundlePath,repositoryRoot:fixture.repository,expected,now:target,
      request:documents.request,storage:storage.client});
    assert.equal(restored.restored,true);
    const exact=await protectedRuntime.describeTargetProtectedPrivateProductionRuntime({
      request:documents.request,targetReferenceAt:previous,datasetId:source.datasetId,bundleContentSha256:source.bundleContentSha256});
    const manifest=JSON.parse(await fs.readFile(path.join(bundlePath,'manifest.json'),'utf8'));
    const second=secondRestoreExpectation({expected,source:exact,manifest});
    const runtime=(await fs.readFile(path.join(root,'scripts/protected-private-production-runtime.mjs'),'utf8')).replaceAll('\r\n','\n');
    const marker='    invocation.localRestore = readers.bundle.restorePrivateProductionRuntimeBundle({\n';
    const start=runtime.indexOf(marker),last=runtime.indexOf(' });',start)+' });'.length;
    assert.ok(start>0&&last>start&&runtime.split(marker).length===2);
    const actualCall=runtime.slice(start,last).replace('    invocation.localRestore = ','').slice(0,-1);
    const bounds=",\n      targetReferenceAt: second.targetReferenceAt, minimumReferenceAt: second.minimumReferenceAt,\n      minimumGeneratedAt: second.minimumGeneratedAt";
    assert.ok(actualCall.split(bounds).length<=2);
    const beforeCall=actualCall.replace(bounds,'');
    assert.ok(!beforeCall.includes('targetReferenceAt:')&&!beforeCall.includes('minimumReferenceAt:')&&!beforeCall.includes('minimumGeneratedAt:'));
    const readers={bundle,bundleRoot:fixture.repository};
    const paths={root:fixture.privateRoot,bundle:bundlePath,restored:path.join(fixture.privateRoot,'source-local-restore')};
    const invoke=(expression,value=second)=>Function('readers','paths','second','return '+expression)(readers,paths,value);
    await assert.rejects(invoke(beforeCall),error=>error?.constructor===Error
      &&error.message==='Private runtime restore target reference is not a valid time');
    await assert.rejects(fs.lstat(paths.restored),error=>error.code==='ENOENT');
    // This is the actual current caller, not a repaired test-only replacement.
    const complete=await invoke(actualCall);
    assert.equal(complete.restored,true);assert.equal(complete.targetWasAbsent,true);
    assert.equal(complete.atomicDirectoryPublication,true);
    const conditions=JSON.parse(await fs.readFile(path.join(paths.restored,'data/live/conditions.json'),'utf8'));
    assert.equal(conditions.datasetId,manifest.datasetId);
    for(const file of manifest.files){
      const input=await fs.readFile(path.join(bundlePath,bundle.PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.payloadDirectoryName,file.relativePath));
      const output=await fs.readFile(path.join(paths.restored,file.relativePath));
      assert.equal(sha(input),file.sha256);assert.deepEqual(output,input);
    }
    const refusals=[
      {name:'unknown-target',change:{targetReferenceAt:undefined},message:'Private runtime restore target reference is not a valid time'},
      {name:'inverted-bounds',change:{minimumReferenceAt:new Date(Date.parse(target)+3600000).toISOString()},message:'Private runtime restore bounds are inverted'},
      {name:'older-target-than-original',change:{targetReferenceAt:new Date(Date.parse(previous)-3600000).toISOString()},message:'Private runtime bundle is from the future relative to its restore target'},
      {name:'older-generation-than-required',change:{minimumGeneratedAt:target},message:'Private runtime bundle would regress the generation time'},
      {name:'unknown-generation-bound',change:{minimumGeneratedAt:'not-a-time'},message:'Private runtime minimum generation time is not a valid time'},
    ];
    for(const refusal of refusals){
      paths.restored=path.join(fixture.privateRoot,'refused-'+refusal.name);
      await assert.rejects(invoke(actualCall,{...second,...refusal.change}),
        error=>error?.constructor===Error&&error.message===refusal.message);
      await assert.rejects(fs.lstat(paths.restored),error=>error.code==='ENOENT');
    }
    return {status:'SOURCE19_ACTUAL_LOCAL_RESTORE_BOUNDS_PASS',genuineMissingBoundsRed:true,
      actualCallerAtomicRestore:true,originalPayloadBytesPreserved:true,timeGuardNegatives:5,
      realNetwork:0,nativeActual:'UNRUN',sourceAdmission:false};
  } finally {
    const own=await fs.realpath(fixture.temp);
    assert.equal(path.dirname(own),await fs.realpath(os.tmpdir()));
    assert.match(path.basename(own),/^ravradar-protected-private-runtime-/);
    await fs.rm(own,{recursive:true,force:false}); // Only this genuine normal fixture's own temporary root.
  }
}

// Exact V4 test-data composition; V3/older oracles remain frozen underneath.
const source19ContinuityFixture={"parent":"scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs","next":"scripts/test-source19-union-native-d504-continuity-fixture.mjs","parentSha256":"510ebb1230b460be71fffcefa62c14def7116fe5a2fc05f7dbd8caa25dfe692a","afterSha256":"fb00652d695fd9e6237e3df6ae55375f525633cb194c96a0b75e27600e130164","rules":[{"before":"  const minimal={schemaVersion:2,generatedAt:native.reference,runtime:{nextZoneCursor:0},zones:{}};","after":"  const {DMI_FORECAST_HOURS,buildDmiForecastHourly,createDmiForecastRecord}=await import('../scripts/lib/dmi-forecast-store.mjs');\n  const {packDmiPartContinuity,unpackDmiPartContinuity}=await import('../scripts/lib/dmi-part-continuity.mjs');\n  const registry=JSON.parse(await fs.readFile(path.join(output,'union-central-parts.json'),'utf8'));\n  const parts=Object.values(registry.zones).flat().map(({partId,waterPoint})=>({partId,waterPoint}));\n  assert.equal(parts.length,bundle.PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.expectedPartCount);\n  assert.ok(parts.some(part=>part.partId===native.part.partId&&JSON.stringify(part.waterPoint)===JSON.stringify(native.part.waterPoint)));\n  const missingHourly=buildDmiForecastHourly({generatedAt:native.reference,startAt:native.reference}).hourly;\n  assert.equal(missingHourly.length,DMI_FORECAST_HOURS);\n  for(const hour of missingHourly)for(const component of ['wind','wave','current','waterLevel','waterTemperature'])assert.equal(hour.sources[component].provider,'missing');\n  const partRecords=new Map(parts.map(part=>[part.partId,createDmiForecastRecord({\n    zoneId:'PART::'+part.partId,point:part.waterPoint,generatedAt:native.reference,hourly:missingHourly})]));\n  const partContinuity=await packDmiPartContinuity(partRecords,parts,native.reference);\n  const decodedParts=await unpackDmiPartContinuity(partContinuity,parts,native.reference);\n  assert.equal(decodedParts.size,parts.length);\n  for(const part of parts)assert.deepEqual(decodedParts.get(part.partId).hourly,partRecords.get(part.partId).hourly);\n  const minimal={schemaVersion:2,generatedAt:native.reference,runtime:{nextZoneCursor:0},zones:{},partContinuity};"},{"before":"async function prepareSource19UnionB(","after":"// Additive test-data constructor. No measured weather, score, READY or release\n// completeness is invented; normal projection, pack and B/S guards stay intact.\nasync function prepareSource19UnionPublicHours(fixture,baseGeneration,output,native) {\n  const {RAVSCORE_PUBLIC_FORECAST_HOURS}=await import('../js/core/ravscore-model-contract.js');\n  const {resolvePublicRavScoreProfile}=await import('../js/core/ravscore-public-model.js');\n  const {ravScoreVerifiedEvidenceTrust}=await import('../js/core/ravscore-evidence-trust-contract.js');\n  const {buildPublicConditionDetails,buildPublicDeliveryDocument,compactJson,resolvePublicNationalForecast}=await import('../scripts/public-conditions-lib.mjs');\n  const {buildPrivatePublicHourDeliveryPack,compactPrivateConditionsForPersistence,\n    inspectPrivatePublicHourDeliveryPack,installPrivateConditionsAndHourPack}=await import('../scripts/lib/public-hour-delivery-pack.mjs');\n  const registry=JSON.parse(await fs.readFile(path.join(output,'union-central-parts.json'),'utf8'));\n  const binding=ravScoreModelBinding(),zones={},scoreZones={},parts={};\n  for(const [zoneId,local]of Object.entries(registry.zones)){\n    for(const part of local)parts[part.partId]={...part,id:part.partId,zoneId,current:null,hourly:[]};\n    zones[zoneId]={current:{windSpeedMps:null,waveHeightM:null,currentSpeedMps:null,waterLevelCm:null,waterTemperatureC:null},\n      forecast:{generatedAt:native.reference,hourly:[]}};\n    scoreZones[zoneId]={expectedPartCount:local.length,scoredPartCount:0,currentReferenceAt:null,hourly:[]};\n  }\n  assert.equal(Object.keys(zones).length,210);assert.equal(Object.keys(parts).length,673);\n  const full={...baseGeneration.conditions,zones,coastalParts:{schemaVersion:2,enabled:true,\n    modelBinding:binding,evidenceTrust:ravScoreVerifiedEvidenceTrust(),scoreProfile:resolvePublicRavScoreProfile(),\n    expectedPartCount:673,scoredPartCount:0,parts,zones:scoreZones}};\n  const live=path.join(fixture.repository,'data/live'),pack=path.join(fixture.repository,'.cache/public-hour-delivery.pack');\n  await write(fixture.repository,'data/live/coastal-parts-v2.json',registry);\n  await write(fixture.repository,'data/zones.geojson',await fs.readFile(path.join(ROOT,'data/zones.geojson')));\n  const details=buildPublicConditionDetails(full),detailsSha256=digest(compactJson(details));\n  const publicManifest={datasetId:full.datasetId,generatedAt:full.generatedAt,productionReferenceAt:full.productionReferenceAt,\n    coastalPartCount:673,ravScoreModelBinding:binding,publicConditionDetailsSha256:detailsSha256,\n    detailDelivery:{schemaVersion:1,sourceDetailsSha256:detailsSha256,hours:{}}};\n  // Same normal hour projection + descriptor shape used by writePublicDelivery\n  // and test-public-hour-delivery-pack. Missing rows remain absent in each hour.\n  for(let i=0;i<RAVSCORE_PUBLIC_FORECAST_HOURS;i++){\n    const time=new Date(Date.parse(native.reference)+i*3600000).toISOString();\n    const text=compactJson(buildPublicDeliveryDocument(full,details,publicManifest,'hour',time));\n    const hash=digest(text),file=hash+'.json';\n    await write(fixture.repository,'data/live/forecast/'+file,text);\n    publicManifest.detailDelivery.hours[time]={path:'./forecast/'+file,sha256:hash,bytes:Buffer.byteLength(text)};\n  }\n  const stagedPack=pack+'.source19-stage',stagedConditions=path.join(live,'conditions.json.source19-stage');\n  const built=await buildPrivatePublicHourDeliveryPack({liveDirectory:live,publicManifest,\n    startupNationalForecast:resolvePublicNationalForecast(full),outputPath:stagedPack});\n  const conditions=compactPrivateConditionsForPersistence(full,built.marker);\n  await write(fixture.repository,'data/live/conditions.json.source19-stage',JSON.stringify(conditions)+'\\n');\n  await installPrivateConditionsAndHourPack({stagedConditionsPath:stagedConditions,conditionsPath:path.join(live,'conditions.json'),\n    stagedPackPath:stagedPack,packPath:pack});\n  assert.equal((await inspectPrivatePublicHourDeliveryPack({packPath:pack,conditions})).manifest.entries.length,RAVSCORE_PUBLIC_FORECAST_HOURS);\n  return conditions;\n}\n\nasync function prepareSource19UnionB("},{"before":"  const spec=await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot:fixture.repository});","after":"  const conditions=await prepareSource19UnionPublicHours(fixture,baseGeneration,output,native);\n  const spec=await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot:fixture.repository});"},{"before":"  return {...baseGeneration,bundlePath,union:{baselineForecast,progressForecast,native,","after":"  return {...baseGeneration,bundlePath,conditions,union:{baselineForecast,progressForecast,native,"},{"before":"    for (const descriptor of workflow.PRIVATE_RUNTIME_FILES) {","after":"    const {PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE}=await import('../scripts/lib/private-weather-component-inventory.mjs');\n    for (const descriptor of [...workflow.PRIVATE_RUNTIME_FILES,PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE]) {"},{"before":"const fixtureIdentity=Object.freeze({\n  \"schemaVersion\": 1,\n  \"kind\": \"PRIVATE_SOURCE19_ACTUAL_S_ONLY_CP_ORIGINAL_H71_NATIVE_CALLER_D504_SUCCESSOR_FIXED_DIAGNOSTICS_OBSERVATION_V2_RESTORE_BOUNDS_V3\",\n  \"sourceBase\": \"62300ce2caec6ca3c47aa44e5f983446916ad637\",\n  \"parentProductIdentity\": \"aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420\",\n  \"progressOnlySuccessorSha256\": \"e6faf23edfba043177e4de2ae7ca69677b600f11dbefb4543265e131b72a549d\",\n  \"productIdentity\": \"5aebce851e38f0b247e933f8f9519ccc51aadf79f3b5e81435be8d7f6b73c76d\",\n  \"pathCount\": 27,\n  \"evidence\": \"LINUX_UNRUN_NO_ADMISSION\",\n  \"scope\": \"ACTUAL_ACTION_NORMAL_PRELUDE_B_INSTALL_AUTHENTICATED_S_PACK_H71_NATIVE_MERGED_WORKING_INSTALL\",\n  \"finalizer\": \"UNRUN_NORMAL_SAVE_TRANSPORT_AND_VALID_FULL_RUNTIME_MISSING\",\n  \"cpOriginalPortSha256\": \"e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17\",\n  \"newSOnlyCpOriginals\": \"REQUIRED_REAL_OBJECT_AND_RECEIPT\",\n  \"syntheticProviderInput\": \"EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT\",\n  \"syntheticAdminInput\": \"EXPLICIT_OWN_EMPTY_DOCUMENTS\",\n  \"sourceParent\": \"dbb16b65e4626aa55c3ab06f7f61ac4b60fb4c60\",\n  \"frozenFixturePath\": \"scripts/test-source19-union-native-fixture.mjs\",\n  \"frozenFixtureSha256\": \"a47a5ef9042c08da572c2e7c82bc8165cff9afe547975c4a7268c1fb2d7b6787\",\n  \"successorCompositionId\": \"81ba8b9a448f5d475d019d5ce6c44dbd9fa3ee8bebeb9e4e4d816de2395f4dfa\",\n  \"diagnosticBaseHead\": \"6969e3c161ff076640aa958247506f4eebfeb765\",\n  \"diagnosticParentFixture\": \"scripts/test-source19-union-native-d504-fixture.mjs\",\n  \"diagnosticParentSha256\": \"071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6\",\n  \"diagnosticCompositionId\": \"972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a\",\n  \"compositionId\": \"916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091\",\n  \"diagnosticCompositionVersion\": 2,\n  \"diagnosticV1CompositionId\": \"aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420\",\n  \"diagnosticObservationTest\": \"scripts/test-protected-private-production-runtime.mjs\",\n  \"diagnosticObservationParentSha256\": \"ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0\",\n  \"restoreBoundsCompositionId\": \"916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091\",\n  \"restoreBoundsParentCompositionId\": \"972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a\",\n  \"restoreBoundsParentFixture\": \"scripts/test-source19-union-native-d504-diagnostics-fixture.mjs\",\n  \"restoreBoundsParentSha256\": \"549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5\",\n  \"restoreBoundsVersion\": 3\n});","after":"const fixtureIdentity=Object.freeze({\n  \"schemaVersion\": 1,\n  \"kind\": \"PRIVATE_SOURCE19_ACTUAL_S_ONLY_CP_ORIGINAL_H71_NATIVE_CALLER_D504_SUCCESSOR_FIXED_DIAGNOSTICS_OBSERVATION_V2_RESTORE_BOUNDS_V3_CONTINUITY_FIXTURE_V4\",\n  \"sourceBase\": \"23b075996edcc74ec824f2ca86a73665827d0c9b\",\n  \"parentProductIdentity\": \"aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420\",\n  \"progressOnlySuccessorSha256\": \"e6faf23edfba043177e4de2ae7ca69677b600f11dbefb4543265e131b72a549d\",\n  \"productIdentity\": \"5aebce851e38f0b247e933f8f9519ccc51aadf79f3b5e81435be8d7f6b73c76d\",\n  \"pathCount\": 27,\n  \"evidence\": \"LINUX_UNRUN_NO_ADMISSION\",\n  \"scope\": \"ACTUAL_ACTION_NORMAL_PRELUDE_B_INSTALL_AUTHENTICATED_S_PACK_H71_NATIVE_MERGED_WORKING_INSTALL\",\n  \"finalizer\": \"UNRUN_NORMAL_SAVE_TRANSPORT_AND_VALID_FULL_RUNTIME_MISSING\",\n  \"cpOriginalPortSha256\": \"e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17\",\n  \"newSOnlyCpOriginals\": \"REQUIRED_REAL_OBJECT_AND_RECEIPT\",\n  \"syntheticProviderInput\": \"EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT\",\n  \"syntheticAdminInput\": \"EXPLICIT_OWN_EMPTY_DOCUMENTS\",\n  \"sourceParent\": \"dbb16b65e4626aa55c3ab06f7f61ac4b60fb4c60\",\n  \"frozenFixturePath\": \"scripts/test-source19-union-native-fixture.mjs\",\n  \"frozenFixtureSha256\": \"a47a5ef9042c08da572c2e7c82bc8165cff9afe547975c4a7268c1fb2d7b6787\",\n  \"successorCompositionId\": \"81ba8b9a448f5d475d019d5ce6c44dbd9fa3ee8bebeb9e4e4d816de2395f4dfa\",\n  \"diagnosticBaseHead\": \"6969e3c161ff076640aa958247506f4eebfeb765\",\n  \"diagnosticParentFixture\": \"scripts/test-source19-union-native-d504-fixture.mjs\",\n  \"diagnosticParentSha256\": \"071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6\",\n  \"diagnosticCompositionId\": \"972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a\",\n  \"compositionId\": \"d9f38f656fbc4de5fe388c9a7b95b83e4b200f95283dbc8b821dd2fa91e2004e\",\n  \"diagnosticCompositionVersion\": 2,\n  \"diagnosticV1CompositionId\": \"aa2fa16afd79a45f43992b38735b7dbc80bbda44d3ca2a708ec0578d01ba0420\",\n  \"diagnosticObservationTest\": \"scripts/test-protected-private-production-runtime.mjs\",\n  \"diagnosticObservationParentSha256\": \"ad4056293d74a98e15304dc8c13c680e46da7600df14db368fe40297167dedd0\",\n  \"restoreBoundsCompositionId\": \"916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091\",\n  \"restoreBoundsParentCompositionId\": \"972618c2e0e139820f8547ca1183b7906988b0eda8d15c422a47eb4a95e2751a\",\n  \"restoreBoundsParentFixture\": \"scripts/test-source19-union-native-d504-diagnostics-fixture.mjs\",\n  \"restoreBoundsParentSha256\": \"549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5\",\n  \"restoreBoundsVersion\": 3,\n  \"continuityCompositionId\": \"d9f38f656fbc4de5fe388c9a7b95b83e4b200f95283dbc8b821dd2fa91e2004e\",\n  \"continuityParentCompositionId\": \"916ccf64aca16ffca20cca31a52dcae9fa8000cdb3ac5b3c7de1084db5001091\",\n  \"continuityParentFixture\": \"scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs\",\n  \"continuityParentSha256\": \"510ebb1230b460be71fffcefa62c14def7116fe5a2fc05f7dbd8caa25dfe692a\",\n  \"continuityVersion\": 4,\n  \"syntheticMissingInput\": \"FULL_673_PART_NULL_CONTINUITY_AND_118_HONESTLY_MISSING_PUBLIC_HOURS\"\n});"},{"before":"async function assertFixtureSourceIdentity() {\n","after":"async function assertFixtureSourceIdentity() {\n  const continuityParent=path.join(ROOT,fixtureIdentity.continuityParentFixture);\n  const continuityParentStat=await fs.lstat(continuityParent);\n  assert.ok(continuityParentStat.isFile()&&!continuityParentStat.isSymbolicLink()&&continuityParentStat.nlink===1,'CONTINUITY_PARENT_REGULAR_SOURCE_REQUIRED');\n  assert.equal(digest(lf(await fs.readFile(continuityParent,'utf8'))),fixtureIdentity.continuityParentSha256,'FROZEN_V3_FIXTURE_BYTES_CHANGED');\n"},{"before":"    'scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs',\n","after":"    'scripts/test-source19-union-native-d504-continuity-fixture.mjs',\n    'scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs',\n"},{"before":"      && file !== 'scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs') continue;","after":"      && file !== 'scripts/test-source19-union-native-d504-continuity-fixture.mjs') continue;"}],"frozen":{"scripts/test-source19-cp-install-native-fixture.mjs":"c8555c9901b36be7d26fff415ffa3014e7104b6336a9f502379d2965b481179a","scripts/test-source19-union-native-fixture.mjs":"a47a5ef9042c08da572c2e7c82bc8165cff9afe547975c4a7268c1fb2d7b6787","scripts/test-source19-cp-install-native-d504-fixture.mjs":"83642a2aead446a85eddc98c791d53e2331963082aa6e7c567beb94a6893169a","scripts/test-source19-union-native-d504-fixture.mjs":"071b18ba7763a31452d00c4a1d4855b28e08227e48151a41c7ce67d9656775f6","scripts/test-source19-cp-install-native-d504-diagnostics-fixture.mjs":"9eef534316376da4fb850ff07347284b50f06a2f1db372657d36aa482ae556de","scripts/test-source19-union-native-d504-diagnostics-fixture.mjs":"549f06d55b1bea3ecd8e1155d33ec49cf216697062b1b87612fca088004311f5","scripts/test-source19-cp-install-native-d504-restore-bounds-fixture.mjs":"eb1938448887de4df7442261df2d3b71a22bd421de54ae4bb8fdadf229ec3227","scripts/test-source19-union-native-d504-restore-bounds-fixture.mjs":"510ebb1230b460be71fffcefa62c14def7116fe5a2fc05f7dbd8caa25dfe692a"}};
function projectSource19ContinuityJobs(actual) {
  if(sha(actual)!=="b5770963a82eca7b5d9950db5e1937f26948648330278c1e1dffd781f78a08f0")return actual;
  const before="              python -I -B scripts/test-source19-union-native.py --node22-path \"$SOURCE_NODE22_PATH\" --node24-path \"$SOURCE_NODE24_PATH\" --case \"$SOURCE_NATIVE_CASE\" --composition integrated-d504-restore-bounds-v3",after="              python -I -B scripts/test-source19-union-native.py --node22-path \"$SOURCE_NODE22_PATH\" --node24-path \"$SOURCE_NODE24_PATH\" --case \"$SOURCE_NATIVE_CASE\" --composition integrated-d504-continuity-v4";
  assert.equal(actual.split(after).length,2);
  const inverse=actual.replace(after,before);
  assert.equal(sha(inverse),"276f9b99ad6d717f665af69450c351b8ce9e760c21b5692d7e67875c6eeb0e30",'Entire V4-to-V3 seven jobs; H70 unchanged');
  return inverse;
}
function projectSource19ContinuityScope(actual) {
  if(sha(JSON.stringify(actual))!=="1499e5e4a1827182f662e5d4ed7a26b7a4fa2788ce3b6e796c90421f8b53909c")return actual;
  const inverse=actual.filter(file=>file!==source19ContinuityFixture.next);
  assert.equal(actual.length-inverse.length,1);
  assert.equal(sha(JSON.stringify(inverse)),"01a1a951956d805c9759d62d01f10c96b37346edb851afed8c3250e90cf5b40a",'Whole318-to317 scope');
  return inverse;
}
export async function assertSource19ContinuityComposition() {
  const row=source19ContinuityFixture;
  const read=async file=>(await fs.readFile(path.join(process.cwd(),file),'utf8')).replaceAll('\r\n','\n');
  const object=(text,name)=>{const m=text.match(new RegExp('const '+name+'=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);'));assert.ok(m);return{literal:m[0],value:JSON.parse(m[1])};};
  const before=await read(row.parent),actual=await read(row.next);
  assert.equal(sha(before),row.parentSha256);assert.equal(sha(actual),row.afterSha256);
  const oi=object(before,'fixtureIdentity'),ni=object(actual,'fixtureIdentity');
  assert.equal(ni.value.continuityCompositionId,"d9f38f656fbc4de5fe388c9a7b95b83e4b200f95283dbc8b821dd2fa91e2004e");
  assert.equal(ni.value.continuityParentFixture,row.parent);
  assert.equal(ni.value.continuityParentSha256,row.parentSha256);
  assert.equal(ni.value.sourceBase,'23b075996edcc74ec824f2ca86a73665827d0c9b');
  assert.equal(ni.value.evidence,'LINUX_UNRUN_NO_ADMISSION');
  const op=object(before,'fixtureProductPins'),np=object(actual,'fixtureProductPins');
  assert.deepEqual(np.value,op.value);assert.equal(Object.keys(np.value).length,27);
  for(const[file,pin]of Object.entries(np.value))assert.equal(sha(await read(file)),pin);
  let inverse=actual;
  for(const rule of [...row.rules].reverse()){
    assert.equal(inverse.split(rule.after).length,2);inverse=inverse.replace(rule.after,()=>rule.before);
  }
  assert.equal(inverse,before,'Whole V4-to-issued-V3 fixture, all old asserts intact');
  for(const[file,pin]of Object.entries(row.frozen))assert.equal(sha(await read(file)),pin);
  assert.equal(Object.keys(row.frozen).length,8);
  assert.equal(source19NativeCiRequired([row.next]),true);
  return {status:'SOURCE19_H71_CONTINUITY_V4_COMPOSITION_PASS',productPinsUnchanged:27,
    frozenEarlierFixtures:8,h70:'V3_UNCHANGED',nativeH71:'UNRUN',sourceAdmission:false};
}
// END exact V4 composition.

export async function testSource19ObserverTelemetry() {
  const {spawnSync}=await import('node:child_process');
  const source=await fs.readFile('scripts/test-source19-union-native.py','utf8');
  const probe=spawnSync(process.env.PYTHON||'python',['-I','-B','-c',String.raw`
import ast,json,os,pathlib,re,stat,subprocess,sys,tempfile,types
source=sys.stdin.read(); tree=ast.parse(source)
names={'source19_observer_proc','source19_observer_journal','Source19ObserverTelemetry','source19_post_echild_failure','capture_source19_before_h_failure','classify_source19_before_h_stderr'}
nodes=[node for node in tree.body if isinstance(node,(ast.FunctionDef,ast.ClassDef)) and node.name in names]
assert len(nodes)==6
ns={'os':os,'stat':stat,'Path':pathlib.Path,'json':json,'re':re,'sha':__import__('hashlib').sha256,
    'ROOT':pathlib.Path.cwd(),'ENTRY':pathlib.Path('.github/actions/save-owned-dmi-grib/index.cjs')}
ns['sha']=lambda value:__import__('hashlib').sha256(value).hexdigest()
clock=[0.0];ns['time']=types.SimpleNamespace(monotonic=lambda:clock[0])
exec(compile(ast.Module(body=nodes,type_ignores=[]),'<actual-observer-telemetry>','exec'),ns)
def proc(cpu=10,start=1000,parent=9,state='R'):
    fields=['0']*20
    for index,value in [(0,state),(1,parent),(11,cpu),(12,5),(19,start)]:fields[index]=str(value)
    return ('123 (private-CANARY) '+' '.join(fields)).encode()
io=lambda read,write:('read_bytes: '+str(read)+'\nwrite_bytes: '+str(write)+'\nprivate-CANARY: 9\n').encode()
parse=ns['source19_observer_proc']; journal=ns['source19_observer_journal']
assert parse(proc(),io(1,2))=={'parent':9,'cpu':15,'start':1000,'state':'RUNNING','read':1,'write':2}
for raw,data in [(b'private-CANARY',b''),(proc(-1),b''),(proc(),io(-1,2)),(proc(),b'read_bytes: 1\nread_bytes: 2\n'),('bad',b'')]:assert parse(raw,data) is None
assert parse(proc(state='private-CANARY'),b'')['state']=='UNKNOWN'
events=[{'schemaVersion':1,'actor':'python','pid':123,'event':'child-start'},
 {'schemaVersion':1,'actor':'python','pid':123,'event':'child-complete'},
 {'schemaVersion':1,'actor':'node','pid':12,'event':'worker-complete'}]
raw=b''.join((json.dumps(row)+'\n').encode() for row in events)
assert journal(raw)['events']=={'child-start':1,'child-complete':1,'worker-complete':1}
for changed in [{**events[0],'private-CANARY':'private-value'},{**events[0],'actor':'unknown'},
                {**events[0],'schemaVersion':True},{**events[0],'pid':True}]:
    value=journal((json.dumps(changed)+'\n').encode());assert value['malformedRows']==1 and not any(value['events'].values())
assert journal(raw+b'{"private-CANARY":')['partialTail'] is True
assert journal(b'not-json\n')['malformedRows']==1
assert journal('private-CANARY')=={'status':'UNKNOWN'}
current={'raw':proc(),'io':io(1,2),'missing':False}
class ProcPath:
    def __init__(self,value):self.value=str(value)
    def __truediv__(self,other):return ProcPath(self.value+'/'+str(other))
    def read_bytes(self):
        if current['missing']:raise FileNotFoundError()
        assert self.value in ('/proc/123/stat','/proc/123/io')
        return current['raw' if self.value.endswith('/stat') else 'io']
ns['Path']=ProcPath;ns['os']=types.SimpleNamespace(sysconf=lambda name:100)
trace=ns['Source19ObserverTelemetry'](0.0);trace.register('ACTION',123);trace.register('private-CANARY',123)
clock[0]=1;current.update(raw=proc(110),io=io(4097,8194));trace.sample()
clock[0]=2;current.update(raw=proc(210),io=io(8193,16386));trace.event('H71_SEEN');trace.event('private-CANARY')
value=trace.snapshot(None);actual=value['processes']['ACTION']
assert actual['cpuMs']==2000 and actual['readBytesDelta']==8192 and actual['writeBytesDelta']==16384
assert actual['recentWindowMs']==2000 and actual['recentCpuMs']==2000
assert value['eventsMs']=={'H71_SEEN':2000} and value['sourceAdmission'] is False
current['raw']=proc(310,parent=10);clock[0]=3;assert trace.snapshot(None)['processes']['ACTION']['status']=='PARENT_CHANGED'
current['raw']=proc(410,start=2000);clock[0]=4;value=trace.snapshot(None)
assert value['processes']['ACTION']['status']=='IDENTITY_CHANGED' and value['processes']['ACTION']['cpuMs'] is None
current['missing']=True;clock[0]=5;assert trace.snapshot(None)['processes']['ACTION']['status']=='IDENTITY_CHANGED'
assert trace.snapshot(None)['processes']['ACTION']['parentChangedSeen'] is True
assert 'CANARY' not in json.dumps(value) and '"pid":' not in json.dumps(value) and '"parent":' not in json.dumps(value)
def unavailable(name):raise OSError('private-CANARY')
ns['os']=types.SimpleNamespace(sysconf=unavailable)
assert trace.snapshot(None)=={'status':'UNKNOWN','sourceAdmission':False}
ns['Path']=pathlib.Path;ns['os']=os
with tempfile.TemporaryDirectory(prefix='rr-s19-observer-post-drain-') as own:
    root=pathlib.Path(own);pending={'capture':'PENDING_CHILD_STOP','sourceAdmission':False}
    raw=b'private-CANARY\n'+b'x'*32768+b'\nError [ERR_MODULE_NOT_FOUND]: private-CANARY\n'
    # Genuine closed synthetic writer, matching the real after-drain boundary.
    writer="import os,sys\nf=open(sys.argv[1],'xb');f.write(sys.stdin.buffer.read());f.flush();os.fsync(f.fileno());f.close()"
    subprocess.run([sys.executable,'-I','-B','-c',writer,str(root/'stderr')],input=raw,check=True,
        env={key:os.environ[key] for key in ('PATH','Path','SystemRoot','TEMP','TMP') if key in os.environ},timeout=10)
    post=ns['source19_post_echild_failure']
    for drained in (False,1,None):assert post(root,drained,True,pending)['capture']=='ECHILD_UNPROVEN'
    assert not (root/'source19-before-h-child-failure.json').exists()
    assert post(root,True,False,pending)['child']['capture']=='PENDING_CHILD_STOP'
    named=(root/'stderr').lstat()
    with (root/'stderr').open('rb') as stream:opened=os.fstat(stream.fileno())
    keys=('st_dev','st_ino','st_mode','st_nlink','st_size','st_mtime_ns','st_ctime_ns')
    different=[key for key in keys if getattr(named,key)!=getattr(opened,key)]
    # Python 3.12 Windows exposes unequal deprecated ctime views. The unchanged
    # Linux stable-read guard MUST refuse that local fixture, not fake success.
    expected='UNPROVEN_RETAINED' if os.name=='nt' and different==['st_ctime_ns'] else 'COMPLETE_STABLE'
    result=post(root,True,True,pending)
    assert result['timing']=='AFTER_CLEANUP_NOT_PRIMARY_CAUSE' and result['child']['capture']==expected, result
    assert (root/'stderr').read_bytes()==raw
    if expected=='COMPLETE_STABLE':
        assert result['child']['stderrBytes']==len(raw) and result['child']['fixedFailures'][0]['code']=='ERR_MODULE_NOT_FOUND'
    else:assert not (root/'source19-before-h-child-failure.json').exists()
    assert 'CANARY' not in json.dumps(result)
    # Actual read-only journal function over owned files; Linux O_NOFOLLOW and
    # pread semantics are NOT claimed by this Windows-capable filesystem seam.
    facade=types.SimpleNamespace(**vars(os));facade.O_NOFOLLOW=getattr(os,'O_NOFOLLOW',0);facade.O_NONBLOCK=getattr(os,'O_NONBLOCK',0)
    def pread(fd,count,offset):os.lseek(fd,offset,os.SEEK_SET);return os.read(fd,count)
    facade.pread=getattr(os,'pread',pread);ns['os']=facade
    union=root/'union';union.mkdir();(union/'union-birth.jsonl').write_bytes(raw_events:=b''.join((json.dumps(row)+'\n').encode() for row in events)+b'{"private-CANARY":')
    actual_trace=ns['Source19ObserverTelemetry'](clock[0]);actual_trace.bind_union(union)
    seen=actual_trace.journal(union);assert seen['status']=='UNSEALED_SNAPSHOT' and seen['partialTail'] is True
    assert seen['events']=={'child-start':1,'child-complete':1,'worker-complete':1} and 'CANARY' not in json.dumps(seen)
    original_pread=facade.pread
    def growing(fd,count,offset):
        data=original_pread(fd,count,offset)
        with (union/'union-birth.jsonl').open('ab') as append:append.write(b'0}\n')
        return data
    facade.pread=growing;assert actual_trace.journal(union)['changedWhileRead'] is True
    facade.pread=original_pread
    held=root/'held';assert union.parent==root and held.parent==root;union.rename(held);union.mkdir()
    assert actual_trace.journal(union)=={'status':'ROOT_CHANGED'}
    ns['os']=os
assert source.index('owner.drain(); drained = True; owner.leave()') < source.index('post_echild = source19_post_echild_failure(')
assert "end = observer_started + 150" in source and "helper._LinuxSubsetOwner(time.monotonic() + 180)" in source
assert "self.assertLess(time.monotonic(), end, 'ACTUAL_H71_ACTION_OBSERVER_DEADLINE')" in source
print(json.dumps({'status':'SOURCE19_OBSERVER_TELEMETRY_TARGET_PASS','actualFunctions':True,'payloadCanariesAbsent':True,
 'cpuAndIoDeltas':True,'changedIdentityAndParentCovered':True,'partialAndForgedJournalCovered':True,
 'postECHILDGuardAndWholeStderrCovered':True,'postECHILDStableCapture':expected,
 'budgetsUnchanged':True,'nativeExecution':'UNRUN','sourceAdmission':False}))
`],{input:source,encoding:'utf8',timeout:30000,maxBuffer:1024*1024,windowsHide:true});
  assert.equal(probe.status,0,probe.stderr);
  return JSON.parse(probe.stdout);
}

export async function testSource19NativeCiWorkflow(input=null) {
  const workflow=(input??await fs.readFile(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url),'utf8')).replaceAll('\r\n','\n');
  const historical=projectSource19NativeCiWorkflow(workflow);
  const native=workflow.slice(workflow.indexOf('  source-native:\n'),workflow.indexOf('  validate:\n'));
  for(const marker of ['id: native-node24','id: native-node22',
    'test "$("$executable" -p \'process.versions.node.split(".")[0]\')" = 24',
    'test "$("$executable" -p \'process.versions.node.split(".")[0]\')" = 22',
    'SOURCE_NODE22_PATH: ${{ steps.native-node22.outputs.path }}',
    'SOURCE_NODE24_PATH: ${{ steps.native-node24.outputs.path }}'])assert.ok(native.includes(marker),marker);
  assert.ok(native.indexOf('Install locked native action dependencies without scripts')<native.indexOf('id: native-node24'));
  assert.ok(native.indexOf('id: native-node24')<native.indexOf('node-version: 22'));
  assert.ok(native.indexOf('node-version: 22')<native.indexOf('id: native-node22'));
  assert.ok(native.indexOf('id: native-node22')<native.indexOf('Run one fixed native case'));
  assert.equal(native.split('--node22-path "$SOURCE_NODE22_PATH" --node24-path "$SOURCE_NODE24_PATH"').length,3);
  assert.doesNotMatch(native,/--node24-path "\$\(command -v node\)"/);
  assert.equal(sha(JSON.stringify(projectSource19SuccessorNativeScope(SOURCE19_NATIVE_SCOPE_PATHS))),EXACT_SCOPE_SHA256,'SOURCE19_NATIVE_CI_CLOSED_SCOPE_CHANGED');
  assert.equal(new Set(SOURCE19_NATIVE_SCOPE_PATHS).size,SOURCE19_NATIVE_SCOPE_PATHS.length);
  for(const file of SOURCE19_NATIVE_SCOPE_PATHS)assert.equal(source19NativeCiRequired([file]),true,file);
  assert.deepEqual(SOURCE19_NATIVE_SCOPE_DIRECTORIES,[
    {directory:'data/admin',suffixes:['.mjs','.js','.py','.json','.geojson'],depth:1},
    {directory:'data/geometry-v2/active-national-coastal-parts',suffixes:['.mjs','.js','.py','.json','.geojson'],depth:1}]);
  for(const row of SOURCE19_NATIVE_SCOPE_DIRECTORIES)for(const extension of row.suffixes)
    assert.equal(source19NativeCiRequired([row.directory+'/new-fixed-input'+extension]),true);
  for(const changed of [[],['README.md'],['js/ui/unrelated-new-view.js'],['assets/unrelated-new-image.png'],['docs/unrelated.md']])
    assert.equal(source19NativeCiRequired(changed),false,'Unimported UI/docs do not acquire seven native jobs');
  for(const changed of [null,{},['../escape'],['/absolute'],['a\\b'],['a\u0000b'],['same','same'],['a/../b']])
    assert.throws(()=>source19NativeCiRequired(changed));
  for(const scope of ['success','failure','cancelled','skipped',null])for(const required of ['true','false','',null])
    for(const native of ['success','failure','cancelled','skipped',null]){
      const actual=actualConditionAllows(scope,required,native);
      assert.equal(actual,source19NativeValidationAllowed(scope,required,native));
      if(scope!=='success'||(required!=='true'&&required!=='false')||(required==='true'&&native!=='success'))assert.equal(actual,false);
    }
  assert.equal(source19NativeValidationAllowed('success','false','skipped'),true);
  assert.equal(source19NativeValidationAllowed('success','false','success'),false,'A skipped unrelated matrix is not native PASS');
  assert.equal(native.split('--composition integrated-d504').length,3);
  const mutations=[
    workflow.replace('--composition integrated-d504','--composition unreviewed'),
    workflow.replace('id: native-node22','id: absent-node22'),
    workflow.replace('--node22-path "$SOURCE_NODE22_PATH"','--node22-path "$SOURCE_NODE24_PATH"'),
    workflow.replace('Restore Node22 for normal SOURCE prelude programs','Restore unknown runtime'),
    workflow.replace('fail-fast: false','fail-fast: true'),
    workflow.replace('case: lose-union-supervisor','case: missing-case'),
    workflow.replace('timeout-minutes: 12','timeout-minutes: 120'),
    workflow.replace('persist-credentials: false','persist-credentials: true'),
    workflow.replace('npm ci --ignore-scripts --no-audit --no-fund','npm install'),
    workflow.replace('    needs: [source-native-scope, source-native]\n',''),
    workflow.replace("needs.source-native.result == 'success'","needs.source-native.result != 'failure'"),
    workflow.replace('          test ! -L /tmp/ravradar-private-production-runtime\n',''),
  ];
  for(const changed of mutations){assert.notEqual(changed,workflow);assert.throws(()=>projectSource19NativeCiWorkflow(changed));}
  assert.throws(()=>projectSource19NativeCiWorkflow(historical),'The old source-only workflow cannot claim this native CI contract');
  assert.ok(historical.includes('Validate native PostgreSQL checkpoint CAS on artificial data only'));
  assert.ok(historical.indexOf('Validate native PostgreSQL checkpoint CAS on artificial data only')<historical.indexOf('Validate source contracts and release governance'));
  await assertSource19SuccessorComposition();
  await assertSource19FixtureCjsClosure();
  await testSource19FixtureWriterCachePrerequisite();
  await testSource19ProcDiscoveryRaces();
  await testSource19FixtureDiagnosticsPrerequisite();
  await testSource19BeforeHFailureDiagnostics();
  await testSource19ObserverTelemetry();
  await testSource19FixedProductDiagnostics();
  await assertSource19FixedDiagnosticComposition();
  await assertSource19RestoreBoundsComposition();
  await assertSource19ContinuityComposition();
  await testSource19OriginalLocalRestoreBounds();
  return {status:'SOURCE19_NATIVE_CI_CONTRACT_PASS',scopePaths:SOURCE19_NATIVE_SCOPE_PATHS.length,cases:7,nativeActual:'UNRUN'};
}

if(import.meta.url.startsWith('file:')&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await testSource19NativeCiWorkflow());
