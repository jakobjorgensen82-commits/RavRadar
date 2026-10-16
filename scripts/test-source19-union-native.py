"""PRIVATE actual SOURCE action -> normal prelude -> B INSTALL/H70 -> authenticated GCM/pack S -> U/H71 -> native CP/DMI union.

Synthetic provider/protocol bytes only; no owner, issuer, ACK, argv or product-body interception.
One case per fresh disposable Linux job; Windows is NOT admission.
Working-install boundary only. Full SAVE/durable ACK/finalizer/publication remains UNRUN.
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
FIXTURE = Path('scripts/test-source19-union-native-fixture.mjs')
FIXED = Path('/tmp/ravradar-private-production-runtime')
MAX_BODY = 4 * 1024 * 1024
NODE = None
NODE22 = None
FIXTURE_IDENTITY = {"schemaVersion":1,"kind":"PRIVATE_SOURCE19_ACTUAL_S_ONLY_CP_ORIGINAL_H71_NATIVE_CALLER","sourceBase":"d0cdbec4b8ea0f36e4abdd3801401aa748989266","parentProductIdentity":"19f6a6a2d12f9f80740675a0ba3fc178456571b7dcc7f6737919f4bd628d38b1","progressOnlySuccessorSha256":"f7d294b7d484e9d0c7b9c0d827e093dc92b658ac1f827844e80f8e61d06f6066","productIdentity":"b3ce3af7716408a33a453337106f4090d5c64933ef3f791b7fb948f95b928968","pathCount":27,"evidence":"LINUX_UNRUN_NO_ADMISSION","scope":"ACTUAL_ACTION_NORMAL_PRELUDE_B_INSTALL_AUTHENTICATED_S_PACK_H71_NATIVE_MERGED_WORKING_INSTALL","finalizer":"UNRUN_NORMAL_SAVE_TRANSPORT_AND_VALID_FULL_RUNTIME_MISSING","cpOriginalPortSha256":"e32a3a6038502fe0a384ccdde71c385f476dde283c65c110e2f8d51afd1f9c17","newSOnlyCpOriginals":"REQUIRED_REAL_OBJECT_AND_RECEIPT","syntheticProviderInput":"EXPLICIT_OWN_EMPTY_STATIONS_DOCUMENT"}
CASES = ('native-union-install', 'replace-union-root', 'lose-union-supervisor')
CASE = None
FIXTURE_IDENTITY['syntheticAdminInput'] = 'EXPLICIT_OWN_EMPTY_DOCUMENTS'


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


class SourceActualSUnionNative(unittest.TestCase):
    def test_genuine_action_authenticated_s_union_native_boundary(self):
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
        own = Path(tempfile.mkdtemp(prefix='rr-source19-union-native-')).resolve()
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
                self.assertTrue(own.name.startswith('rr-source19-union-native-'))
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
        descriptor = protocol['union']
        self.assertEqual(descriptor['kind'], 'SOURCE19_ACTUAL_GCM_PACK_SYNTHETIC_INPUT')
        self.assertEqual(descriptor['relativePath'], 'union-progress.encrypted')
        cp_source_only = descriptor['cpSourceOnlyFiles']
        self.assertEqual(len(cp_source_only), 2)
        self.assertEqual(len([row for row in cp_source_only if '/objects/' in row['relativePath']]), 1)
        self.assertEqual(len([row for row in cp_source_only if '/receipts/' in row['relativePath']]), 1)
        for row in cp_source_only:
            relative = Path(row['relativePath'])
            self.assertFalse(relative.is_absolute() or '..' in relative.parts)
            self.assertFalse((root / relative).exists(), 'S_ONLY_ORIGINAL_ALREADY_PRESENT_BEFORE_ACTION')
        encrypted = (fixtures / descriptor['relativePath']).read_bytes()
        self.assertEqual((len(encrypted), sha(encrypted)), (descriptor['bytes'], descriptor['sha256']))
        cipher = root / '.cache/weather-private-progress.encrypted'
        cipher.parent.mkdir(exist_ok=True)
        with cipher.open('xb') as stream:
            stream.write(encrypted)
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
            # Published fixture key, not a service key or owner/receipt bypass.
            'WEATHER_PROGRESS_ENCRYPTION_KEY': 'bW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW0=',
            'ACTIONS_CACHE_SERVICE_V2': '1', 'ACTIONS_RESULTS_URL': 'https://cache.fixture.invalid',
            'ACTIONS_RUNTIME_TOKEN': 'source19-synthetic-cache', 'npm_config_offline': 'true',
            'NODE_USE_ENV_PROXY': '1', 'HTTPS_PROXY': proxy, 'HTTP_PROXY': proxy, 'NO_PROXY': '',
            'NODE_EXTRA_CA_CERTS': str(cert), 'SSL_CERT_FILE': str(cert), 'REQUESTS_CA_BUNDLE': str(cert), 'CURL_CA_BUNDLE': str(cert),
            'PYTHON': sys.executable, 'PYTHONUTF8': '1', 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONNOUSERSITE': '1',
        })
        self.assertNotIn('NODE_OPTIONS', environment)
        self.assertNotIn('NODE_TLS_REJECT_UNAUTHORIZED', environment)
        owner = helper._LinuxSubsetOwner(time.monotonic() + 180)
        process, logs, retained = None, [], []
        observed = None; altered = False; case_failure = None
        h70_seen = False; cp_merge_seen = False; install_observed = False
        union_root = None; baseline = None; completed_report = None
        first_working = None; last_programs = set()
        def process_args(pid):
            return Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')[:-1]
        def parent_of(pid):
            return int(Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()[1])
        def stop_and_observe(pid, descriptor_fd, parent):
            signal.pidfd_send_signal(descriptor_fd, signal.SIGSTOP)
            end = time.monotonic() + 1
            while True:
                fields = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
                self.assertEqual(int(fields[1]), parent, 'REAL_CHILD_REPARENTED_BEFORE_ACK')
                if fields[0] in ('T', 't'):
                    return
                self.assertLess(time.monotonic(), end, 'ACTUAL_PROCESS_NOT_KERNEL_STOPPED')
                time.sleep(0.001)
        try:
            owner.enter()
        except BaseException:
            transport.close()
            raise
        try:
            transport.start()
            for name in ('stdout', 'stderr'):
                logs.append((root / name).open('wb'))
            process = subprocess.Popen([str(NODE), str(action)], cwd=root, env=environment,
                stdin=subprocess.DEVNULL, stdout=logs[0], stderr=logs[1])
            action_fd = os.pidfd_open(process.pid); retained.append(action_fd)
            self.assertEqual(process_args(process.pid), [os.fsencode(NODE), os.fsencode(action)])
            end = time.monotonic() + 150
            while process.poll() is None:
                self.assertLess(time.monotonic(), end, 'ACTUAL_H71_ACTION_OBSERVER_DEADLINE')
                for pid in descendants(process.pid):
                    try:
                        args = process_args(pid)
                        if os.fsencode(root / 'scripts/run-copernicus-weather-components.py') in args:
                            if b'--storage-inventory' in args:
                                h70_seen = True
                            if b'--merge-generations' in args and b'--source-union-born-journal' in args:
                                self.assertIsNotNone(observed, 'NATIVE_UNION_WITHOUT_OBSERVED_H71')
                                self.assertEqual(parent_of(pid), observed['worker'], 'NATIVE_CP_NOT_CHILD_OF_ACTUAL_UNION_WORKER')
                                cp_merge_seen = True
                        for name in ('run-dmi-bulk-supervised.py', 'fetch-open-meteo-components.mjs', 'run-copernicus-weather-components.py'):
                            if any(value.endswith(os.fsencode('/' + name)) for value in args):
                                last_programs.add(name)
                        if observed is not None or args != [os.fsencode(NODE), os.fsencode(root / 'scripts/source-progress-union-consumer.mjs'), b'--source-owned-progress-union']:
                            continue
                        worker_fd = os.pidfd_open(pid); retained.append(worker_fd)
                        h_pid = parent_of(pid); h_fd = os.pidfd_open(h_pid); retained.append(h_fd)
                        self.assertEqual(process_args(h_pid)[1:], [b'-I', b'-B', os.fsencode(root / 'scripts/lib/copernicus_component_process.py'), b'--source-normal-program-cohort'])
                        self.assertEqual(parent_of(h_pid), process.pid)
                        union_root = Path(os.readlink(f'/proc/{h_pid}/fd/6'))
                        self.assertEqual(union_root.name, 'source-union')
                        self.assertEqual(union_root.parent.parent, Path(tempfile.gettempdir()).resolve())
                        self.assertRegex(union_root.parent.name, r'^rr-encrypted-progress-[A-Za-z0-9]{6}$')
                        opened, named = os.stat(f'/proc/{h_pid}/fd/6'), union_root.lstat()
                        self.assertTrue(stat.S_ISDIR(named.st_mode) and not union_root.is_symlink())
                        self.assertEqual((opened.st_dev, opened.st_ino, opened.st_mode), (named.st_dev, named.st_ino, named.st_mode))
                        capsule_path = Path(os.readlink(f'/proc/{h_pid}/fd/4'))
                        capsule = strict_json(capsule_path, 32 * 1024 * 1024)
                        self.assertEqual(capsule['kind'], 'SOURCE_PROGRESS_UNION_INPUT')
                        self.assertEqual(capsule['target'], protocol['target'])
                        self.assertEqual(capsule['productionReferenceAt'], descriptor['reference'])
                        observed = {'worker': pid, 'h': h_pid, 'workerFd': worker_fd, 'hFd': h_fd}
                        baseline = self.original_destinations(root, protocol)
                        self.assertTrue(h70_seen, 'REAL_B_INSTALL_H70_PREREQUISITE_NOT_OBSERVED')
                        for row in protocol['originals']:
                            self.assertEqual((baseline[row['relativePath']]['bytes'], baseline[row['relativePath']]['sha256']),
                                (row['bytes'], row['sha256']), 'B_NOT_PHYSICALLY_INSTALLED_BEFORE_S_UNION')
                        for row in cp_source_only:
                            self.assertFalse((root / row['relativePath']).exists(), 'S_ONLY_ORIGINAL_WAS_IN_B')
                        first_working = {name: (root / name).stat().st_ino for name in
                            ('.cache/copernicus-component-bank.json', 'data/live/dmi-forecast-cache.json')}
                        if mode != 'native-union-install':
                            stop_and_observe(pid, worker_fd, h_pid)
                            stop_and_observe(h_pid, h_fd, process.pid)
                            # Baseline after actual kernel stop, never JSON ACK.
                            baseline = self.original_destinations(root, protocol)
                            if mode == 'replace-union-root':
                                held = union_root.with_name(union_root.name + '.own-test-held')
                                self.assertFalse(held.exists()); union_root.rename(held); union_root.mkdir()
                                signal.pidfd_send_signal(h_fd, signal.SIGCONT)
                                signal.pidfd_send_signal(worker_fd, signal.SIGCONT)
                            elif mode == 'lose-union-supervisor':
                                signal.pidfd_send_signal(h_fd, signal.SIGKILL)
                            else:
                                raise AssertionError('CLOSED_NATIVE_CASE_REQUIRED')
                            altered = True
                    except FileNotFoundError:
                        # Discovery races are not phase/result evidence. A
                        # naturally retired W/H still requires the actual
                        # installer bytes below; absence alone never passes.
                        continue
                if observed is not None and mode == 'native-union-install':
                    report_path = union_root / 'union-result.json'
                    if report_path.exists() and report_path.stat().st_size:
                        try:
                            report = strict_json(report_path, 32 * 1024 * 1024)
                        except (json.JSONDecodeError, AssertionError):
                            # Mutable H-owned result is not evidence until the
                            # real installer has consumed it and copied files.
                            report = None
                        if report is not None:
                            required = {'.cache/copernicus-component-bank.json', 'data/live/dmi-forecast-cache.json'}
                            all_outputs = report.get('outputs', [])
                            selected = {row['relativePath']: row for row in all_outputs}
                            installed = bool(all_outputs) and required <= set(selected) and len(selected) == len(all_outputs)
                            for name, row in selected.items():
                                self.assertFalse(Path(name).is_absolute() or '..' in Path(name).parts)
                                destination = root / name
                                old = baseline.get(name)
                                installed = installed and destination.exists() and (old is None or destination.stat().st_ino != old['identity'][1])
                                if installed:
                                    installed = (destination.stat().st_size, sha(destination.read_bytes())) == (row['bytes'], row['sha256'])
                            if installed:
                                self.assertEqual(report['kind'], 'SOURCE_PROGRESS_UNION_RESULT')
                                self.assertEqual(report['target'], protocol['target'])
                                self.assertEqual(report['result']['dmiProgress']['forecast']['status'], 'MERGED')
                                self.assertEqual(report['result']['dmiProgress']['forecast']['recoveredComponents'], 1)
                                self.assertTrue(cp_merge_seen, 'REAL_NATIVE_CP_MERGER_NOT_OBSERVED')
                                self.assertTrue(report['result']['copernicusMerged'])
                                for original in cp_source_only:
                                    actual = selected.get(original['relativePath'])
                                    self.assertIsNotNone(actual, 'NEW_S_ONLY_CP_ORIGINAL_NOT_IN_H_CATALOG')
                                    self.assertEqual((actual['bytes'], actual['sha256']), (original['bytes'], original['sha256']))
                                    destination = root / original['relativePath']
                                    self.assertEqual((destination.stat().st_size, sha(destination.read_bytes())),
                                        (original['bytes'], original['sha256']))
                                self.assertFalse(Path(f"/proc/{observed['h']}").exists(), 'H_STILL_LIVE_WHILE_OUTPUTS_INSTALLED')
                                completed_report = report; install_observed = True
                                # Stop only our actual action after the measured
                                # working boundary, before optional providers.
                                signal.pidfd_send_signal(action_fd, signal.SIGSTOP)
                                break
                time.sleep(0.001)
            self.assertIsNotNone(observed, 'ACTUAL_H71_CALL_NOT_REACHED; prerequisite failure is not PASS')
            if mode == 'native-union-install':
                self.assertTrue(install_observed, 'ACTUAL_GCM_PACK_H71_NATIVE_MERGED_INSTALL_NOT_COMPLETED')
                self.assertIsNotNone(completed_report)
            else:
                self.assertTrue(altered, 'ACTUAL_KERNEL_NEGATIVE_NOT_EXERCISED')
                self.assertEqual(process.wait(timeout=1), 1, 'UNKNOWN_H71_MUST_REFUSE')
                self.assertEqual(self.original_destinations(root, protocol), baseline,
                    'UNKNOWN_H71_OUTCOME_CHANGED_A_WORKING_ORIGINAL')
                for row in cp_source_only:
                    self.assertFalse((root / row['relativePath']).exists(), 'UNKNOWN_H71_INSTALLED_NEW_S_ONLY_ORIGINAL')
            with transport.lock:
                self.assertEqual(transport.failures, [], 'NORMAL_TRANSPORT_CONTRACT_REFUSED')
                tags = list(transport.calls)
            for tag in ('github-run', 'github-jobs', 'db-contract', 'checkpoint-contract', 'private-B-read'):
                self.assertIn(tag, tags)
            self.assertEqual(output.read_bytes(), b'', 'BOUNDARY_TEST_MUST_NOT_CLAIM_COMPLETE_SOURCE')
            self.assertEqual(cipher.read_bytes(), encrypted, 'AUTHENTICATED_S_ORIGINAL_BYTES_CHANGED')
            for row in protocol['objectRows']:
                raw = (fixtures / row['relativePath']).read_bytes()
                self.assertEqual((len(raw), sha(raw)), (row['bytes'], row['sha256']))
            print(json.dumps({'source19UnionNativeCase': mode, 'actualAction': True, 'actualH70Observed': h70_seen,
                'actualH71Observed': True, 'actualNativeCpMergeObserved': cp_merge_seen,
                'workingInstallObserved': install_observed, 'physicalNegativeApplied': altered,
                'originalObjectsPreserved': True, 'genuineOwnerOrAckSupplied': False,
                'sourceAdmission': False, 'finalizer': 'UNRUN', 'fullPublication': 'UNRUN', 'realUpstreamNetwork': 0}))
        except BaseException as error:
            case_failure = error
            with transport.lock:
                refusal = transport.failures[0] if transport.failures else None
                route = transport.calls[-1] if transport.calls else None
            print(json.dumps({'source19UnionNativeCase': mode, 'status': 'FAIL', 'h71Observed': observed is not None,
                'h70Observed': h70_seen, 'nativeCpObserved': cp_merge_seen, 'workingInstallObserved': install_observed,
                'transportRefusal': refusal, 'lastFixtureRoute': route, 'sourceAdmission': False, 'realUpstreamNetwork': 0}))
            raise
        finally:
            failure = None
            try:
                owner.deadline = min(owner.deadline, time.monotonic() + 8)
                owner.drain(); owner.leave()
                if process is not None:
                    process.wait(timeout=1)
            except BaseException as error:
                failure = error
            for descriptor_fd in retained:
                try:
                    os.close(descriptor_fd)
                except BaseException as error:
                    failure = failure or error
            for stream in logs:
                try:
                    stream.close()
                except BaseException as error:
                    failure = failure or error
            try:
                transport.close()
            except BaseException as error:
                failure = failure or error
            # Observer lstat does not grant cleanup ownership of P/S temp roots.
            # Keep FIXED and rr-encrypted-progress-* even on a proven stop.
            print(json.dumps({'source19UnionTempCleanup': 'RETAINED_NO_TYPED_CLEANUP_RECEIPT', 'sourceAdmission': False}))
            if failure is not None:
                self.stop_unproved = True
                if case_failure is None:
                    raise failure

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
