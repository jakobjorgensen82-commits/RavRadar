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

export function projectSource19NativeCiWorkflow(input) {
  const source=input.replaceAll('\r\n','\n');
  assert.equal(source.split('\njobs:\n').length,2,'SOURCE19_NATIVE_CI_JOBS_REQUIRED');
  const jobsAt=source.indexOf('\njobs:\n')+'\njobs:\n'.length;
  const validateAt=source.indexOf('  validate:\n',jobsAt);assert.ok(validateAt>jobsAt);
  const nativeJobs=source.slice(jobsAt,validateAt);
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
    'scripts/test-source19-union-native-fixture.mjs']) {
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
  assert.ok(prefix === before || prefix === after, 'exercise only the exact reviewed fixture root prefix');
  const parent = await fs.realpath(tmpdir());
  const own = await fs.mkdtemp(path.join(parent, 'rr-s19-lease-'));
  const born = await fs.lstat(own, { bigint: true });
  const seed = path.join(own, 'seed'); await fs.mkdir(seed);
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
  assert.equal(sha(JSON.stringify(SOURCE19_NATIVE_SCOPE_PATHS)),EXACT_SCOPE_SHA256,'SOURCE19_NATIVE_CI_CLOSED_SCOPE_CHANGED');
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
  const mutations=[
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
  await assertSource19FixtureCjsClosure();
  await testSource19FixtureWriterCachePrerequisite();
  await testSource19ProcDiscoveryRaces();
  return {status:'SOURCE19_NATIVE_CI_CONTRACT_PASS',scopePaths:SOURCE19_NATIVE_SCOPE_PATHS.length,cases:7,nativeActual:'UNRUN'};
}

if(import.meta.url.startsWith('file:')&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(await testSource19NativeCiWorkflow());
