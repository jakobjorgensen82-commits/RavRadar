"""PRIVATE NEW final-dd4 Linux SOURCE action -> normal prelude -> B INSTALL/H70.

Exact dd4/final composition; earlier c115/d984 kernel identities remain historical, not reused.
H71 native-union execution is OUTSIDE this H70 target and needs its separate genuine caller target.

Synthetic protocol transport ONLY: the exact action, P/H, normal clocks, nonce,
parent checks, genuine CP NetCDF parser and installer run without interception.
All HTTP is owned loopback CONNECT/TLS; no upstream, production credentials,
preload, argv rewrite, phase issuer, supplied ACK or SOURCE-complete claim.
Windows/non-Node24/missing native dependencies are prerequisites, NOT a PASS.
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import signal
import ssl
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.parse
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
ENTRY = Path('.github/actions/save-owned-dmi-grib/index.cjs')
FIXTURE = Path('scripts/test-source19-cp-install-native-fixture.mjs')
FIXED = Path('/tmp/ravradar-private-production-runtime')
MAX_BODY = 4 * 1024 * 1024
NODE = None
NODE22 = None
FIXTURE_IDENTITY = {"schemaVersion":1,"kind":"PRIVATE_SOURCE19_CP_INSTALL_H70_FINAL_PR634_FRESH_FIXTURE","compositionId":"19f6a6a2d12f9f80740675a0ba3fc178456571b7dcc7f6737919f4bd628d38b1","sourceBase":"d0cdbec4b8ea0f36e4abdd3801401aa748989266","pathCount":27,"evidence":"LINUX_UNRUN_NO_ADMISSION","unionH71":"OUTSIDE_H70_TARGET_SEPARATE_NATIVE_CALLER_REQUIRED","syntheticProviderInput":"EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT"}
CASES = ('normal-install', 'replace-bank', 'replace-root', 'lose-supervisor')
FIXTURE_IDENTITY['syntheticAdminInput'] = 'EXPLICIT_OWN_EMPTY_DOCUMENTS'
CASE = None


def sha(body):
    return hashlib.sha256(body).hexdigest()


def strict_json(path, maximum=8 * 1024 * 1024):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or not 2 <= info.st_size <= maximum:
        raise AssertionError('FIXTURE_REGULAR_FILE_REQUIRED')
    with path.open('rb') as stream:
        raw = stream.read(maximum + 1)
    if len(raw) != info.st_size:
        raise AssertionError('FIXTURE_BYTES_CHANGED')
    return json.loads(raw)


def clean_environment():
    # NEVER inherit project/account/cache/provider credentials or proxy settings.
    return {key: value for key, value in os.environ.items()
            if key in {'PATH', 'LD_LIBRARY_PATH', 'LIBRARY_PATH', 'LANG', 'LC_ALL', 'LC_CTYPE'}}


def descendants(parent):
    """Discovery only. Every signalled process is separately retained by pidfd."""
    result, todo = [], [parent]
    while todo:
        pid = todo.pop()
        try:
            children = Path(f'/proc/{pid}/task/{pid}/children').read_text('ascii').split()
        except FileNotFoundError:
            continue
        for text in children:
            child = int(text)
            if child in result:
                raise AssertionError('FIXTURE_PROCESS_GRAPH_CONFLICT')
            result.append(child)
            todo.append(child)
    return result


class ProtocolFixture:
    HOSTS = frozenset({'api.github.com', 'fixture.invalid', 'fixture.github.io', 'cache.fixture.invalid'})

    def __init__(self, root, protocol, certificate, private_key):
        self.root, self.protocol = root, protocol
        self.calls, self.failures = [], []
        self.lock = threading.Lock()
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certificate, private_key)
        owner = self

        class Handler(BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'

            def log_message(self, *_args):
                pass  # No URLs, authorization, questions, raw data or bodies.

            def fixed_failure(self, code):
                with owner.lock:
                    owner.failures.append(code)
                self.reply(403, {'code': 'SOURCE19_FIXTURE_ROUTE_REFUSED'})

            def reply(self, status, value=None, *, raw=None):
                data = raw if raw is not None else b'' if value is None else json.dumps(value).encode()
                self.send_response(status)
                self.send_header('Content-Type', 'application/octet-stream' if raw is not None else 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.send_header('Connection', 'close')
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(data)
                    self.wfile.flush()
                self.close_connection = True

            def body(self):
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                except ValueError:
                    raise AssertionError('FIXTURE_BODY_SIZE_INVALID')
                if not 0 <= length <= MAX_BODY:
                    raise AssertionError('FIXTURE_BODY_BOUND')
                raw = self.rfile.read(length)
                if len(raw) != length:
                    raise AssertionError('FIXTURE_BODY_TRUNCATED')
                return json.loads(raw) if raw else None

            def do_CONNECT(self):
                # Only owned TLS termination. No socket/connect to an upstream.
                if self.path not in {host + ':443' for host in owner.HOSTS}:
                    return self.fixed_failure('CONNECT_ORIGIN_REFUSED')
                self.tunnel_host = self.path[:-4]
                self.send_response_only(200)
                self.end_headers()
                self.wfile.flush()
                try:
                    self.connection.settimeout(20)
                    self.connection = context.wrap_socket(self.connection, server_side=True)
                    self.rfile = self.connection.makefile('rb')
                    self.wfile = self.connection.makefile('wb')
                    self.close_connection = True
                    self.handle_one_request()
                except (ssl.SSLError, ConnectionError, OSError):
                    with owner.lock:
                        owner.failures.append('TLS_TRANSPORT_FAILED')

            def do_GET(self):
                self.route()

            def do_POST(self):
                self.route()

            def do_PUT(self):
                self.fixed_failure('WRITE_METHOD_REFUSED')

            do_PATCH = do_PUT
            do_DELETE = do_PUT

            def route(self):
                try:
                    host = getattr(self, 'tunnel_host', None)
                    if host not in owner.HOSTS or self.headers.get('Host') != host:
                        return self.fixed_failure('TLS_HOST_REFUSED')
                    parsed = urllib.parse.urlsplit(self.path)
                    if parsed.scheme or parsed.netloc or parsed.fragment:
                        return self.fixed_failure('ABSOLUTE_REQUEST_REFUSED')
                    tag = owner.route(self, host, parsed)
                    if tag is not None:
                        with owner.lock:
                            owner.calls.append(tag)
                except (AssertionError, ValueError, KeyError, TypeError, OSError):
                    self.fixed_failure('PROTOCOL_CONTRACT_REFUSED')

        class Server(ThreadingHTTPServer):
            daemon_threads = False
            block_on_close = True

            def handle_error(self, _request, _address):
                with owner.lock:
                    owner.failures.append('LOOPBACK_HANDLER_FAILED')

        self.server = Server(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=False)
        self.started = False

    def start(self):
        self.thread.start()
        self.started = True

    def close(self):
        if self.started:
            self.server.shutdown()
        self.server.server_close()
        if self.started:
            self.thread.join(timeout=5)
            if self.thread.is_alive():
                raise AssertionError('FIXTURE_SERVER_CLOSE_UNPROVED')

    def route(self, request, host, parsed):
        data, method, route = self.protocol, request.command, parsed.path
        query = urllib.parse.parse_qs(parsed.query, strict_parsing=True) if parsed.query else {}
        if host == 'api.github.com' and method == 'GET' and not query:
            if request.headers.get('Authorization') != 'Bearer source19-synthetic-github':
                raise AssertionError('SYNTHETIC_GITHUB_AUTH_REQUIRED')
            prefix = '/repos/fixture/repo/actions/runs/200/attempts/2'
            if route == prefix:
                request.reply(200, {'id': 200, 'run_attempt': 2, 'head_sha': data['head'],
                    'head_branch': 'main', 'path': '.github/workflows/update-and-deploy.yml',
                    'status': 'in_progress', 'conclusion': None, 'event': 'schedule',
                    'repository': {'full_name': 'fixture/repo'}, 'head_repository': {'full_name': 'fixture/repo'}})
                return 'github-run'
        if host == 'api.github.com' and method == 'GET' and route == '/repos/fixture/repo/actions/runs/200/attempts/2/jobs':
            if query != {'per_page': ['100']} or request.headers.get('Authorization') != 'Bearer source19-synthetic-github':
                raise AssertionError('SYNTHETIC_JOBS_QUERY_REQUIRED')
            # The exact producer name comes from the existing normal source-gate
            # constructor, never a test-selected phase or deadline.
            from datetime import datetime, timezone
            started = datetime.fromtimestamp(time.time() - 600, timezone.utc).isoformat().replace('+00:00', 'Z')
            request.reply(200, {'total_count': 1, 'jobs': [{'id': 300, 'run_id': 200,
                'head_sha': data['head'], 'name': data['sourceJobName'], 'status': 'in_progress',
                'conclusion': None, 'completed_at': None, 'runner_id': 400,
                'runner_name': 'source19-native-fixture', 'started_at': started}]})
            return 'github-jobs'
        if host == 'cache.fixture.invalid' and method == 'POST' and not query:
            if route != '/twirp/github.actions.results.api.v1.CacheService/GetCacheEntryDownloadURL':
                return request.fixed_failure('CACHE_WRITE_OR_ROUTE_REFUSED')
            if request.headers.get('Authorization') != 'Bearer source19-synthetic-cache':
                raise AssertionError('SYNTHETIC_CACHE_AUTH_REQUIRED')
            body = request.body()
            if not isinstance(body, dict) or not isinstance(body.get('key'), str) or not re.fullmatch(r'[a-f0-9]{64}', body.get('version', '')):
                raise AssertionError('CACHE_RESTORE_REQUEST_INVALID')
            if not body['key'].startswith(('weather-preflight-state-v1-Linux-', 'ravscore-continuation-schema6-v2-', 'weather-private-progress-encrypted-v2-Linux-main-')):
                raise AssertionError('CACHE_SCOPE_REFUSED')
            request.reply(200, {'ok': False, 'signed_download_url': ''})
            return 'cache-miss'
        if host == 'fixture.github.io' and method == 'GET' and route == '/repo/data/live/manifest.json':
            if query != {'weather-preflight': ['200-2']}:
                raise AssertionError('PUBLIC_MANIFEST_QUERY_REFUSED')
            request.reply(404)
            return 'normal-public-manifest-unavailable'
        if host != 'fixture.invalid':
            return request.fixed_failure('UNEXPECTED_ORIGIN_ROUTE')
        auth = request.headers.get('apikey')
        if auth != 'sb_secret_source19_synthetic':
            # A genuine no-credential anonymous-denial request is not a download.
            if method == 'GET' and route.startswith('/storage/v1/object/authenticated/') and auth is None:
                request.reply(403)
                return 'anonymous-denied'
            raise AssertionError('SYNTHETIC_SUPABASE_AUTH_REQUIRED')
        if method == 'POST' and not query and route in (
                '/rest/v1/rpc/ravradar_integrated_cutover_contract',
                '/rest/v1/rpc/ravradar_ravscore_checkpoint_contract'):
            body = request.body()
            if not isinstance(body, dict):
                raise AssertionError('DB_READBACK_BODY_REQUIRED')
            key = 'databaseReadback' if route.endswith('/ravradar_integrated_cutover_contract') else 'checkpointDatabaseReadback'
            request.reply(200, data['rpc'][key])
            return 'db-contract' if key == 'databaseReadback' else 'checkpoint-contract'
        if method == 'GET' and route == '/rest/v1/admin_documents':
            if set(query) - {'select', 'document_key', 'limit'} or len(query.get('document_key', [])) != 1:
                raise AssertionError('ADMIN_QUERY_INVALID')
            selector = query['document_key'][0]
            if selector.startswith('in.(') and selector.endswith(')'):
                keys = [key.strip('"') for key in selector[4:-1].split(',')]
            elif selector.startswith('eq.'):
                keys = [selector[3:]]
            else:
                raise AssertionError('ADMIN_SELECTOR_INVALID')
            known = {row['document_key']: row for row in data['admin']}
            known[data['pointer']['document_key']] = data['pointer']
            known[data['checkpointDocumentKey']] = None
            if not keys or len(set(keys)) != len(keys) or any(key not in known for key in keys):
                raise AssertionError('ADMIN_KEY_REFUSED')
            request.reply(200, [known[key] for key in keys if known[key] is not None])
            return 'private-pointer' if keys == [data['pointer']['document_key']] else 'admin-read'
        if method == 'GET' and not query and route == '/storage/v1/bucket/' + data['bucket']['id']:
            request.reply(200, data['bucket'])
            return 'private-bucket'
        if method == 'GET' and not query and route.startswith('/storage/v1/object/authenticated/' + data['bucket']['id'] + '/'):
            key = urllib.parse.unquote(route.split('/storage/v1/object/authenticated/' + data['bucket']['id'] + '/', 1)[1])
            rows = [row for row in data['objectRows'] if row['key'] == key]
            if len(rows) != 1:
                raise AssertionError('EXACT_B_OBJECT_REQUIRED')
            row = rows[0]
            raw = (self.root / row['relativePath']).read_bytes()
            if len(raw) != row['bytes'] or sha(raw) != row['sha256']:
                raise AssertionError('EXACT_B_OBJECT_CHANGED')
            request.reply(200, raw=raw)
            return 'private-B-read'
        return request.fixed_failure('UNEXPECTED_ROUTE_OR_WRITE')


class SourceOriginalCpInstallNative(unittest.TestCase):
    def test_genuine_action_prelude_and_install_inventory_boundary(self):
        self.assertEqual(sys.platform, 'linux', 'NATIVE_LINUX_REQUIRED; never a skip')
        self.assertEqual(sys.version_info[:2], (3, 12), 'ACTUAL_PYTHON_312_REQUIRED')
        info = subprocess.check_output([str(NODE), '--input-type=module', '-e',
            'console.log(JSON.stringify({major:process.versions.node.split(".")[0],proxy:process.allowedNodeEnvironmentFlags.has("--use-env-proxy")}))'],
            env=clean_environment(), text=True)
        self.assertEqual(json.loads(info), {'major': '24', 'proxy': True})
        normal_info = subprocess.check_output([str(NODE22), '--input-type=module', '-e',
            'console.log(JSON.stringify({major:process.versions.node.split(".")[0],proxy:process.allowedNodeEnvironmentFlags.has("--use-env-proxy")}))'],
            env=clean_environment(), text=True)
        self.assertEqual(json.loads(normal_info), {'major': '22', 'proxy': True})
        self.assertNotEqual(NODE, NODE22, 'SEPARATE_ACTUAL_NODE_RUNTIMES_REQUIRED')
        spec = importlib.util.spec_from_file_location('source19_native_outer_owner', ROOT / 'scripts/lib/copernicus_component_process.py')
        helper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(helper)
        self.assertFalse(FIXED.exists() or FIXED.is_symlink(), 'FIXED_PRIVATE_ROOT_EXISTS; never adopt/remove it')
        own = Path(tempfile.mkdtemp(prefix='rr-source19-cp-install-native-')).resolve()
        seed, fixtures = own / 'seed', own / 'fixture'
        seed.mkdir(); fixtures.mkdir()
        first = None
        try:
            result = subprocess.run([str(NODE), str(ROOT / FIXTURE), '--inventory'], cwd=ROOT,
                env=clean_environment(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=True)
            inventory = json.loads(result.stdout)
            self.assertEqual(inventory['fixtureIdentity'], FIXTURE_IDENTITY, 'NEW_COMPOSITION_FIXTURE_IDENTITY_REQUIRED')
            self.assertLessEqual(len(inventory['files']), 900)
            for row in inventory['files']:
                relative = Path(row['relativePath'])
                self.assertFalse(relative.is_absolute() or '..' in relative.parts)
                body = (ROOT / relative).read_bytes()
                self.assertEqual((len(body), sha(body)), (row['bytes'], row['sha256']))
                output = seed / relative
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(body)
            # One authentic existing commit object, copied into an OWN private
            # object database. Never share parent .git/refs/index/remotes.
            head = inventory['head']
            commit = subprocess.check_output(['git', 'cat-file', 'commit', head], cwd=ROOT, env=clean_environment())
            encoded = b'commit ' + str(len(commit)).encode() + b'\0' + commit
            self.assertEqual(hashlib.sha1(encoded).hexdigest(), head)
            git = seed / '.git'
            (git / 'objects' / head[:2]).mkdir(parents=True)
            (git / 'refs').mkdir()
            (git / 'objects' / head[:2] / head[2:]).write_bytes(zlib.compress(encoded))
            (git / 'HEAD').write_text(head + '\n', encoding='ascii')
            (git / 'config').write_text('[core]\n repositoryformatversion = 0\n bare = false\n', encoding='ascii')
            from datetime import datetime, timezone
            target = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
            prep_env = clean_environment()
            prep_env['PATH'] = str(NODE.parent) + os.pathsep + prep_env.get('PATH', '')
            prep_env['PYTHON'] = sys.executable
            try:
                subprocess.run([str(NODE), str(seed / FIXTURE), '--prepare', str(fixtures), target, sys.executable],
                    cwd=seed, env=prep_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120, check=True)
            except subprocess.CalledProcessError as error:
                # This preparer has only explicit synthetic data and the clean
                # environment above; keep its bounded first-cause diagnostic.
                error.add_note('SYNTHETIC_FIXTURE_PREPARATION_STDERR\n' + error.stderr[:8192].decode('utf-8', errors='replace'))
                raise
            protocol = strict_json(fixtures / 'protocol.json')
            self.assertEqual(protocol['fixtureIdentity'], FIXTURE_IDENTITY, 'PREPARED_FIXTURE_IDENTITY_CHANGED')
            self.assertEqual(protocol['head'], head)
            cert, key = own / 'test-ca.pem', own / 'test-server-key.pem'
            subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                '-subj', '/CN=SOURCE19-test-only', '-addext', 'basicConstraints=critical,CA:TRUE',
                '-addext', 'subjectAltName=DNS:api.github.com,DNS:fixture.invalid,DNS:fixture.github.io,DNS:cache.fixture.invalid',
                '-keyout', str(key), '-out', str(cert)], env=clean_environment(),
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20, check=True)
            # Exactly ONE case per fresh disposable Linux job. FIXED is always
            # retained: this observer has no typed P-owned root cleanup receipt.
            self.assertIn(CASE, CASES)
            self.actual_case(own, seed, fixtures, protocol, cert, key, helper, CASE)
        except BaseException as error:
            first = error
            raise
        finally:
            # actual_case must prove kernel ECHILD before authorizing ANY own
            # namespace cleanup. Unknown cessation retains the entire fixture.
            if not getattr(self, 'stop_unproved', False):
                self.assertEqual(own.parent, Path(tempfile.gettempdir()).resolve())
                self.assertTrue(own.name.startswith('rr-source19-cp-install-native-'))
                shutil.rmtree(own)

    def original_destinations(self, root, protocol):
        snapshot = {}
        for row in protocol['originals']:
            relative = Path(row['relativePath'])
            self.assertFalse(relative.is_absolute() or '..' in relative.parts)
            self.assertNotIn(row['relativePath'], snapshot, 'DUPLICATE_ORIGINAL_DESTINATION')
            destination = root / relative
            try:
                before = destination.lstat()
            except FileNotFoundError:
                snapshot[row['relativePath']] = None
                continue
            self.assertTrue(stat.S_ISREG(before.st_mode) and before.st_nlink == 1,
                'ORIGINAL_DESTINATION_NOT_OWN_REGULAR_FILE')
            self.assertLessEqual(before.st_size, 64 * 1024 * 1024)
            with destination.open('rb') as stream:
                opened = os.fstat(stream.fileno())
                raw = stream.read(64 * 1024 * 1024 + 1)
                ended = os.fstat(stream.fileno())
            after = destination.lstat()
            identity = lambda value: (value.st_dev, value.st_ino, value.st_mode,
                value.st_nlink, value.st_size, value.st_mtime_ns, value.st_ctime_ns)
            self.assertEqual(identity(before), identity(opened), 'DESTINATION_OPEN_CHANGED')
            self.assertEqual(identity(opened), identity(ended), 'DESTINATION_READ_CHANGED')
            self.assertEqual(identity(ended), identity(after), 'DESTINATION_PATH_CHANGED')
            self.assertEqual(len(raw), before.st_size)
            snapshot[row['relativePath']] = {'bytes': len(raw), 'sha256': sha(raw),
                'identity': identity(before)}
        return snapshot

    def assert_no_originals_installed(self, snapshot, protocol):
        self.assertEqual(set(snapshot), {row['relativePath'] for row in protocol['originals']})
        for row in protocol['originals']:
            value = snapshot[row['relativePath']]
            self.assertTrue(value is None or (value['bytes'], value['sha256'])
                != (row['bytes'], row['sha256']), 'ORIGINAL_ALREADY_INSTALLED_BEFORE_ACK')

    def actual_case(self, own, seed, fixtures, protocol, cert, key, helper, mode):
        root = own / mode
        shutil.copytree(seed, root)
        action = root / ENTRY
        self.assertEqual(action.read_bytes(), (ROOT / ENTRY).read_bytes(), 'ACTUAL_ACTION_BYTES_CHANGED')
        self.assertFalse(FIXED.exists() or FIXED.is_symlink(), 'FIXED_PRIVATE_ROOT_EXISTS')
        npm = root / ENTRY.parent / '.npm-cache'
        source_cache = ROOT / ENTRY.parent / '.npm-cache/_cacache'
        self.assertTrue(source_cache.is_dir() and not source_cache.is_symlink(), 'FIXED_LOCKED_WARM_CACHE_REQUIRED')
        self.assertEqual(source_cache.resolve(), source_cache)
        for directory, directories, files in os.walk(source_cache, followlinks=False):
            for name in [*directories, *files]:
                entry = Path(directory) / name
                self.assertFalse(entry.is_symlink(), 'Warm cache must not escape its own root')
                self.assertTrue(entry.is_dir() or entry.is_file())
        npm.mkdir()
        shutil.copytree(source_cache, npm / '_cacache')
        runner_temp = root / 'runner-temp'; runner_temp.mkdir()
        output = root / 'action-output'; output.write_bytes(b'')
        transport = ProtocolFixture(fixtures, protocol, cert, key)
        proxy = f'http://127.0.0.1:{transport.server.server_port}'
        environment = clean_environment()
        environment.update({'PATH': str(NODE22.parent) + os.pathsep + str(Path(sys.executable).parent) + os.pathsep + environment.get('PATH', ''),
            'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': 'fixture/repo', 'GITHUB_RUN_ID': '200', 'GITHUB_RUN_ATTEMPT': '2',
            'GITHUB_SHA': protocol['head'], 'GITHUB_REF': 'refs/heads/main', 'GITHUB_EVENT_NAME': 'schedule',
            'GITHUB_SERVER_URL': 'https://github.com', 'RUNNER_OS': 'Linux', 'RUNNER_NAME': 'source19-native-fixture',
            'RUNNER_TRACKING_ID': 'source19-synthetic-kernel-fixture', 'GITHUB_WORKSPACE': str(root),
            'RUNNER_TEMP': str(runner_temp), 'GITHUB_OUTPUT': str(output),
            'GITHUB_TOKEN': 'source19-synthetic-github', 'SUPABASE_URL': 'https://fixture.invalid',
            'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_source19_synthetic', 'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_source19_synthetic',
            'RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND': 'supabase',
            'RAVRADAR_PRIVATE_RUNTIME_ROOT': str(FIXED), 'RAVRADAR_PRIVATE_RUNTIME_BUNDLE': str(FIXED / 'bundle'),
            'RAVRADAR_PRIVATE_RUNTIME_RESTORE': str(FIXED / 'restored'),
            'RAVRADAR_PRODUCTION_TARGET_HOUR': protocol['target'], 'INPUT_FORCE': 'true', 'INPUT_OPERATION': 'source',
            'RAVRADAR_SOURCE_EXTENDED_PROVIDER_BOOTSTRAP': 'false',
            'ACTIONS_CACHE_SERVICE_V2': '1', 'ACTIONS_RESULTS_URL': 'https://cache.fixture.invalid',
            'ACTIONS_RUNTIME_TOKEN': 'source19-synthetic-cache', 'npm_config_offline': 'true',
            'NODE_USE_ENV_PROXY': '1', 'HTTPS_PROXY': proxy, 'HTTP_PROXY': proxy, 'NO_PROXY': '',
            'NODE_EXTRA_CA_CERTS': str(cert), 'SSL_CERT_FILE': str(cert), 'REQUESTS_CA_BUNDLE': str(cert), 'CURL_CA_BUNDLE': str(cert),
            'PYTHON': sys.executable, 'PYTHONUTF8': '1', 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1',
        })
        self.assertNotIn('NODE_OPTIONS', environment)
        self.assertNotIn('NODE_TLS_REJECT_UNAUTHORIZED', environment)
        owner = helper._LinuxSubsetOwner(time.monotonic() + 180)
        process, logs, retained, observed, altered = None, [], [], None, False
        case_failure = None
        cp_directory = None
        pre_ack_originals = None
        initial_originals = self.original_destinations(root, protocol)
        self.assert_no_originals_installed(initial_originals, protocol)
        seen_programs = set()
        program_labels = {
            'scripts/integrated-cutover-readiness.mjs': 'DATABASE_READBACK',
            'scripts/refine-coastlines-constrained-4.0.48.py': 'GEOMETRY',
            'scripts/sync-admin-config.py': 'ADMIN_SYNC',
            'scripts/apply-central-zone-reviews.py': 'ADMIN_REVIEW',
            'scripts/build-public-coastal-parts-v2.mjs': 'CENTRAL_PARTS',
            'scripts/protected-ravscore-continuation-checkpoint.mjs': 'CHECKPOINT_RESTORE',
            'scripts/run-copernicus-weather-components.py': 'CP_INVENTORY',
        }
        born_fixed = None
        try:
            owner.enter()
        except BaseException as error:
            case_failure = error
            transport.close()
            raise
        try:
            transport.start()
            for name in ('stdout', 'stderr'):
                logs.append((root / name).open('wb'))
            process = subprocess.Popen([str(NODE), str(action)], cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            action_pidfd = os.pidfd_open(process.pid); retained.append(action_pidfd)
            self.assertEqual(Path(f'/proc/{process.pid}/cmdline').read_bytes().split(b'\0')[:-1],
                [os.fsencode(NODE), os.fsencode(action)])
            end = time.monotonic() + 150
            while process.poll() is None:
                self.assertLess(time.monotonic(), end, 'ACTUAL_ACTION_OBSERVER_DEADLINE')
                if FIXED.exists() and born_fixed is None:
                    born_fixed = FIXED.lstat()
                    self.assertTrue(stat.S_ISDIR(born_fixed.st_mode) and not FIXED.is_symlink())
                if observed is not None:
                    time.sleep(0.002)
                    continue
                for pid in descendants(process.pid):
                    try:
                        args = Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')[:-1]
                    except FileNotFoundError:
                        continue
                    for relative, label in program_labels.items():
                        if os.fsencode(root / relative) in args:
                            seen_programs.add(label)  # Observation, never a phase/result authority.
                    if (os.fsencode(root / 'scripts/run-copernicus-weather-components.py') not in args
                            or b'--storage-inventory' not in args):
                        continue
                    pidfd = os.pidfd_open(pid); retained.append(pidfd)
                    ppid = int(Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()[1])
                    parent_fd = os.pidfd_open(ppid); retained.append(parent_fd)
                    h_args = Path(f'/proc/{ppid}/cmdline').read_bytes().split(b'\0')[:-1]
                    self.assertEqual(h_args[1:], [b'-I', b'-B', os.fsencode(root / 'scripts/lib/copernicus_component_process.py'), b'--source-normal-program-cohort'])
                    self.assertEqual(int(Path(f'/proc/{ppid}/stat').read_text().rsplit(')', 1)[1].split()[1]), process.pid)
                    cp_path = Path(os.readlink(f'/proc/{ppid}/fd/6'))
                    self.assertEqual(cp_path.parent, Path(tempfile.gettempdir()).resolve())
                    self.assertRegex(cp_path.name, r'^rr-cp-storage-inventory-[A-Za-z0-9]{6}$')
                    descriptor_stat, named_stat = os.stat(f'/proc/{ppid}/fd/6'), cp_path.lstat()
                    self.assertTrue(stat.S_ISDIR(named_stat.st_mode) and not cp_path.is_symlink())
                    self.assertEqual((descriptor_stat.st_dev, descriptor_stat.st_ino, descriptor_stat.st_mode),
                        (named_stat.st_dev, named_stat.st_ino, named_stat.st_mode))
                    cp_directory = (cp_path, named_stat)
                    observed = {'child': pid, 'h': ppid, 'childFd': pidfd, 'hFd': parent_fd}
                    if mode != 'normal-install' and not altered:
                        # Stop only the actual retained H kernel object before
                        # altering its OWN stage; no PID from a JSON report.
                        # Keep the actual CP child LIVE and kernel-stopped
                        # first: H cannot have drained it to ECHILD/sent ACK.
                        signal.pidfd_send_signal(pidfd, signal.SIGSTOP)
                        child_stopped_deadline = time.monotonic() + 1
                        while True:
                            child_fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
                            if child_fields[0] in ('T', 't'):
                                self.assertEqual(int(child_fields[1]), ppid, 'CP_CHILD_REPARENTED_BEFORE_BASELINE')
                                break
                            self.assertLess(time.monotonic(), child_stopped_deadline, 'CP_NOT_STOPPED_BEFORE_H_ACK')
                            time.sleep(0.001)
                        signal.pidfd_send_signal(parent_fd, signal.SIGSTOP)
                        # Wait for the ACTUAL retained H to be kernel-stopped;
                        # no command/report field supplies this before-ACK fact.
                        stopped_deadline = time.monotonic() + 1
                        while True:
                            h_state = Path(f'/proc/{ppid}/stat').read_text().rsplit(')', 1)[1].split()[0]
                            if h_state in ('T', 't'):
                                break
                            self.assertLess(time.monotonic(), stopped_deadline, 'H_NOT_STOPPED_BEFORE_BASELINE')
                            time.sleep(0.001)
                        pre_ack_originals = self.original_destinations(root, protocol)
                        self.assert_no_originals_installed(pre_ack_originals, protocol)
                        stage = Path(os.readlink(f'/proc/{ppid}/fd/5')).parent.parent
                        self.assertEqual(stage.parent, FIXED)
                        self.assertRegex(stage.name, r'^restored\.weather-components-[0-9a-f-]{36}$')
                        if mode == 'replace-bank':
                            bank = stage / '.cache/copernicus-component-bank.json'
                            same = bank.read_bytes(); replacement = bank.with_name(bank.name + '.own-test-replacement')
                            replacement.write_bytes(same); replacement.replace(bank)
                            signal.pidfd_send_signal(parent_fd, signal.SIGCONT)
                        elif mode == 'replace-root':
                            held = stage.with_name(stage.name + '.own-test-held')
                            stage.rename(held); stage.mkdir()
                            signal.pidfd_send_signal(parent_fd, signal.SIGCONT)
                        elif mode == 'lose-supervisor':
                            signal.pidfd_send_signal(parent_fd, signal.SIGKILL)
                        altered = True
                        if mode != 'lose-supervisor':
                            signal.pidfd_send_signal(pidfd, signal.SIGCONT)
                    break
                time.sleep(0.002)
            self.assertEqual(process.wait(timeout=1), 1, 'INSTALL-only target must not claim complete SOURCE; later refusal reason UNKNOWN')
            self.assertIsNotNone(observed, 'ACTUAL_H70_CALL_NOT_REACHED; this is a prerequisite failure, not PASS')
            if mode != 'normal-install':
                self.assertTrue(altered, 'ACTUAL_PHYSICAL_NEGATIVE_NOT_EXERCISED')
            with transport.lock:
                self.assertEqual(transport.failures, [], 'NORMAL_TRANSPORT_CONTRACT_REFUSED')
                tags = list(transport.calls)
            self.assertIn('github-run', tags); self.assertIn('github-jobs', tags)
            self.assertIn('db-contract', tags); self.assertIn('checkpoint-contract', tags)
            self.assertIn('private-B-read', tags)
            copied = 0
            for row in protocol['originals']:
                source = fixtures / 'originals' / row['relativePath']
                self.assertEqual((source.stat().st_size, sha(source.read_bytes())), (row['bytes'], row['sha256']))
                destination = root / row['relativePath']
                if destination.exists() and sha(destination.read_bytes()) == row['sha256']:
                    copied += 1
            if mode == 'normal-install':
                self.assertEqual(copied, len(protocol['originals']), 'NORMAL_INSTALL_NOT_COMPLETED')
            else:
                self.assertIsNotNone(pre_ack_originals, 'NO_ACTUAL_PRE_ACK_BASELINE')
                self.assertEqual(copied, 0, 'UNKNOWN_H70_OUTCOME_INSTALLED_AN_ORIGINAL')
                self.assertEqual(self.original_destinations(root, protocol), pre_ack_originals,
                    'ORIGINAL_DESTINATIONS_CHANGED_AFTER_REFUSED_H70')
            # P copy admission required real H70 drain/ACK/readback. We never
            # supply that ACK or turn this intentional terminal refusal into T.
            self.assertEqual(output.read_bytes(), b'')
            for row in protocol['objectRows']:
                raw = (fixtures / row['relativePath']).read_bytes()
                self.assertEqual((len(raw), sha(raw)), (row['bytes'], row['sha256']))
            print(json.dumps({'source19CpInstallNativeCase': mode, 'actualAction': True,
                'actualH70Observed': True, 'originalBytesPreserved': True,
                'installationCompleted': mode == 'normal-install', 'sourceAdmission': False,
                'laterStop': 'UNKNOWN', 'fullPublication': 'UNRUN', 'realUpstreamNetwork': 0}))
        except BaseException as error:
            case_failure = error
            # Preserve useful fixed first-boundary evidence without printing
            # child logs, source paths, tokens, protocol payloads or values.
            with transport.lock:
                refusal = transport.failures[0] if transport.failures else None
                last_route = transport.calls[-1] if transport.calls else None
            print(json.dumps({'source19CpInstallNativeCase': mode, 'status': 'FAIL',
                'observedPrograms': sorted(seen_programs), 'transportRefusal': refusal,
                'lastFixtureRoute': last_route, 'h70Observed': observed is not None,
                'sourceAdmission': False, 'realUpstreamNetwork': 0}))
            raise
        finally:
            # This outer actual subreaper is test cleanup only, never P's ACK.
            # Unknown stop keeps every file. No Promise/child.close substitutes.
            cleanup_failure = None
            try:
                owner.deadline = min(owner.deadline, time.monotonic() + 8)
                owner.drain()
                owner.leave()
                if process is not None:
                    process.wait(timeout=1)
            except BaseException as error:
                cleanup_failure = error
            for descriptor in retained:
                try:
                    os.close(descriptor)
                except BaseException as error:
                    cleanup_failure = cleanup_failure or error
            for stream in logs:
                try:
                    stream.close()
                except BaseException as error:
                    cleanup_failure = cleanup_failure or error
            try:
                transport.close()
            except BaseException as error:
                cleanup_failure = cleanup_failure or error
            if cleanup_failure is None:
                try:
                    self.clean_actual_directories(cp_directory, born_fixed, fixtures)
                except BaseException as error:
                    cleanup_failure = error
            if cleanup_failure is not None:
                self.stop_unproved = True
                print(json.dumps({'source19CpInstallNativeCleanup': 'RETAINED', 'sourceAdmission': False}))
                if case_failure is None:
                    raise cleanup_failure

    def clean_actual_directories(self, cp_directory, born_fixed, fixtures):
        if cp_directory is not None:
            # Test-only cleanup of the actual H-held born output inode.
            # The product keeps this directory on its intentional failure.
            # No recursive cleanup, extra-file adoption or JSON-owned PID.
            cp_path, born = cp_directory
            live = cp_path.lstat()
            self.assertEqual((live.st_dev, live.st_ino, live.st_mode), (born.st_dev, born.st_ino, born.st_mode))
            entries = sorted(entry.name for entry in cp_path.iterdir())
            self.assertIn(entries, [[], ['inventory.json']], 'UNKNOWN_CP_OUTPUT_RETAINED')
            if entries:
                report = cp_path / 'inventory.json'
                inventory = strict_json(report, 32 * 1024 * 1024)
                original_bank = strict_json(fixtures / 'originals/.cache/copernicus-component-bank.json')
                self.assertEqual((inventory['kind'], inventory['schemaVersion'], inventory['bankSha256']),
                    ('CP_COMPONENT_STORAGE_INVENTORY', 1, original_bank['bankSha256']))
                report.unlink()
            cp_path.rmdir()
        if FIXED.exists() or FIXED.is_symlink():
            # External observation (born_fixed) is NOT a typed P birth/cleanup
            # receipt. Never recursively remove, adopt or traverse this root.
            print(json.dumps({'source19FixedRootCleanup': 'RETAINED_NO_TYPED_P_BIRTH_RECEIPT',
                'sourceAdmission': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--node24-path', required=True)
    parser.add_argument('--node22-path', required=True)
    parser.add_argument('--case', choices=CASES, required=True)
    args, remaining = parser.parse_known_args()
    NODE = Path(args.node24_path).resolve(strict=True)
    NODE22 = Path(args.node22_path).resolve(strict=True)
    CASE = args.case
    unittest.main(argv=[sys.argv[0], *remaining])
