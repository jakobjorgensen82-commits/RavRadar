"""CURRENT-only transport: real same-host SQL and physically owned bytes.

No owner, acknowledgement, model, profile, validator or successful response is
issued here. The actual normal caller owns SOURCE admission before this class
is instantiated. The frozen terminal transport and its bounds are unchanged.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import threading
import urllib.parse


B_KEY = 'ravscore-private-production-runtime-pointer'
S_KEY = 'ravscore-continuation-checkpoint'
OP_KEY = 'ravscore-operational-model-activation'
PROFILE_KEY = 'ravscore-profile-selection'

# Only fixed source-defined tags can cross the child/caller boundary. Unknown
# exceptions remain UNKNOWN; their text, request body and SQL are never copied.
FIXED_REASONS = frozenset({
    'SOURCE_CURRENT_PROFILE_PENDING_FULL_PG_SCHEMA',
    'SOURCE_CURRENT_PROFILE_PENDING_GENUINE_CENTRAL_PROFILE',
    'SOURCE_CURRENT_PROFILE_PENDING_NORMAL_POST64_API',
    'SOURCE_CURRENT_PROFILE_PENDING_LOCKED_SDK',
    'SOURCE_CURRENT_PROFILE_PENDING_ACTUAL_GREEN_SOURCE_GATE',
    'SOURCE_CURRENT_PROFILE_PG_CONTEXT', 'SOURCE_CURRENT_PROFILE_PG_OWNER_CHANGED',
    'SOURCE_CURRENT_PROFILE_ACTUAL_PG_CALL_FAILED',
    'CURRENT_POST64_SOURCE_UNISSUED', 'CURRENT_POST64_OWN_PARENT_REQUIRED',
    'CURRENT_POST64_NORMAL_POLICY_REQUIRED', 'CURRENT_POST64_ORIGINAL_BYTES_CHANGED',
    'CURRENT_POST64_OBJECT_BYTES_CHANGED', 'CURRENT_POST64_OBJECT_IDENTITY_CHANGED',
    'CURRENT_POST64_OWNER_CHANGED', 'CURRENT_POST64_CHECKPOINT_BODY',
    'CURRENT_POST64_POINTER_CAS', 'CURRENT_POST64_POINTER_VERSION',
    'CURRENT_POST64_CENTRAL_CAS_BODY', 'CURRENT_POST64_DOCUMENT_INSERT',
    'CURRENT_POST64_IMMUTABLE_HEADERS', 'CURRENT_POST64_OBJECT_DIGEST_KEY',
    'CURRENT_POST64_PART_DIGEST_KEY', 'CURRENT_POST64_BODY_BOUND',
    'CURRENT_POST64_BODY_TRUNCATED', 'CURRENT_POST64_REMOVE_NOT_CREATED',
    'CURRENT_POST64_REMOVE_REFERENCED_OR_UNKNOWN', 'CURRENT_POST64_WRITE_READBACK',
    'CURRENT_NATIVE_ACTIVATION_GENUINE_SOURCE_REQUIRED',
})
FIXED_SQLSTATES = frozenset({'22001', '22003', '22007', '22023', '22P02',
    '23502', '23503', '23505', '23514', '25P02', '40001', '40P01', '42501',
    '42804', '42809', '42883', '42P01', '53200', '54000', '54001', '55P03',
    '57014', 'P0001', 'XX000'})


def emit_current_native_failure(error, *, phase, sqlstate='UNKNOWN', route='NONE'):
    # Diagnostic only; never admission, a successful response or retry advice.
    text = str(error)
    reason = text if text in FIXED_REASONS else 'UNKNOWN'
    safe_phase = phase if phase in {'CURRENT_CASE', 'PG_SQL', 'POST64_TRANSPORT'} else 'UNKNOWN'
    safe_route = route if route in {'CHECKPOINT_CAS', 'OPERATIONAL_CAS', 'POINTER_CAS', 'STORAGE', 'NONE'} else 'UNKNOWN'
    print(json.dumps({'kind': 'CURRENT_SOURCE_NATIVE_FIRST_FAILURE', 'phase': safe_phase,
        'reason': reason, 'sqlstate': sqlstate if sqlstate in FIXED_SQLSTATES else 'UNKNOWN',
        'route': safe_route, 'privatePayloadIncluded': False}), flush=True)


def _json(value):
    return json.dumps(value, separators=(',', ':'), allow_nan=False)


def _literal(value):
    encoded = base64.b64encode(_json(value).encode()).decode('ascii')
    return "convert_from(decode('" + encoded + "','base64'),'UTF8')::jsonb"


def _exact_keys(value, expected):
    return type(value) is dict and set(value) == set(expected)


def _integer(value, minimum=0):
    return type(value) is int and minimum <= value <= 9007199254740991


def _duplicate_free(pairs):
    output = {}
    for key, value in pairs:
        if key in output:
            raise ValueError('CURRENT_POST64_DUPLICATE_JSON_KEY')
        output[key] = value
    return output


class CurrentSourcePost64Adapter:
    def __init__(self, *, node, repository_root, owner_root, original_root, original_rows, policy, pg_call, initial_prefix=False):
        # Normal own-source guard runs before any local destination or bytes.
        checked = subprocess.run([str(node), '--input-type=module', '-e',
            "import {requireSourceProducerOutput} from './scripts/lib/source-producer-successor-source.mjs';requireSourceProducerOutput();"],
            cwd=repository_root, env={key: os.environ[key] for key in ('PATH', 'LANG', 'LC_ALL') if key in os.environ},
            stdin=subprocess.DEVNULL, capture_output=True, check=False, timeout=30)
        if checked.returncode:
            raise ValueError('CURRENT_POST64_SOURCE_UNISSUED')
        # Only the SAME wrapper-owned parent and fixed exclusive child. No free
        # storage prefix, production bucket, remote client or cleanup target.
        self.parent = Path(owner_root)
        if (not self.parent.is_absolute() or self.parent.resolve(strict=True) != self.parent
                or not self.parent.name.startswith('rr-source19-union-native-')
                or self.parent.is_symlink() or not self.parent.is_dir()):
            raise ValueError('CURRENT_POST64_OWN_PARENT_REQUIRED')
        self.parent_identity = self._identity(self.parent, directory=True)
        self.original_root = Path(original_root)
        if type(initial_prefix) is not bool:
            raise ValueError('CURRENT_POST64_EXACT_ORIGINAL_ROOT')
        self.initial_prefix = initial_prefix
        expected_root = self.parent / ('current-source-native-initial-inputs/transport' if initial_prefix
            else 'current-source-native-inputs/transport')
        if (self.original_root != expected_root
                or self.original_root.resolve(strict=True) != self.original_root):
            raise ValueError('CURRENT_POST64_EXACT_ORIGINAL_ROOT')
        self._no_links(self.original_root)
        if (not _exact_keys(policy, ('bucket', 'checkpointMaximumSerializedBytes'))
                or type(policy['bucket']) is not dict
                or not _integer(policy['bucket'].get('file_size_limit'), 1)
                or not _integer(policy['checkpointMaximumSerializedBytes'], 1)
                or policy['bucket'].get('public') is not False
                or policy['bucket'].get('allowed_mime_types') != ['application/gzip']
                or policy['bucket'].get('id') != 'ravradar-private-production-runtime'
                or policy['bucket'].get('name') != policy['bucket']['id']
                or not callable(pg_call)):
            raise ValueError('CURRENT_POST64_NORMAL_POLICY_REQUIRED')
        self.policy, self.pg_call = policy, pg_call
        self.root = self.parent / 'current-native-storage'
        self.root.mkdir(mode=0o700, exist_ok=False)
        self.root_identity = self._identity(self.root, directory=True)
        self.lock = threading.RLock()
        self.originals, self.created, self.retired = {}, {}, set()
        self.protected_retention_refusals = set()
        for row in original_rows:
            if (not _exact_keys(row, ('objectPath', 'relativePath', 'bytes', 'sha256'))
                    or not _integer(row['bytes'], 1)
                    or not re.fullmatch(r'[a-f0-9]{64}', row['sha256'])
                    or not re.fullmatch(r'objects/[a-f0-9]{64}\.bin', row['relativePath'])):
                raise ValueError('CURRENT_POST64_ORIGINAL_ROW')
            key = self._object_key(row['objectPath'])
            if key in self.originals:
                raise ValueError('CURRENT_POST64_DUPLICATE_ORIGINAL')
            file = self.original_root / row['relativePath']
            raw = self._read_file(file)
            if (len(raw), hashlib.sha256(raw).hexdigest()) != (row['bytes'], row['sha256']):
                raise ValueError('CURRENT_POST64_ORIGINAL_BYTES_CHANGED')
            self.originals[key] = dict(row, file=file, identity=self._identity(file))

    @staticmethod
    def _identity(file, directory=False):
        value = file.lstat()
        wanted = stat.S_ISDIR if directory else stat.S_ISREG
        if (not wanted(value.st_mode) or stat.S_ISLNK(value.st_mode)
                or value.st_ino <= 0 or (not directory and value.st_nlink != 1)):
            raise ValueError('CURRENT_POST64_PHYSICAL_TYPE')
        return value.st_dev, value.st_ino, value.st_mode

    @staticmethod
    def _no_links(file):
        for at in (file, *file.parents):
            if at.is_symlink():
                raise ValueError('CURRENT_POST64_ALIASED_PATH')

    def _assert_owned(self):
        self._no_links(self.root)
        if (self._identity(self.parent, True) != self.parent_identity
                or self._identity(self.root, True) != self.root_identity):
            raise ValueError('CURRENT_POST64_OWNER_CHANGED')

    def _read_file(self, file):
        self._no_links(file)
        original = self._identity(file)
        descriptor = os.open(file, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC)
        try:
            opened = os.fstat(descriptor)
            if (opened.st_dev, opened.st_ino, opened.st_mode) != original:
                raise ValueError('CURRENT_POST64_OPEN_IDENTITY_CHANGED')
            chunks, size = [], 0
            while True:
                chunk = os.read(descriptor, 1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > self.policy['bucket']['file_size_limit']:
                    raise ValueError('CURRENT_POST64_OBJECT_BOUND')
                chunks.append(chunk)
            if self._identity(file) != original:
                raise ValueError('CURRENT_POST64_READ_IDENTITY_CHANGED')
            return b''.join(chunks)
        finally:
            os.close(descriptor)

    @staticmethod
    def _object_key(value):
        # Exact normal descriptor grammar; URL decoding happens once outside.
        if not isinstance(value, str) or not re.fullmatch(
                r'bundles/sha256/[a-f0-9]{64}(?:\.json\.gz|/part-[0-9]{3}-[a-f0-9]{64}\.json\.gz\.part)', value):
            raise ValueError('CURRENT_POST64_OBJECT_KEY')
        return value

    def _body(self, request, maximum, binary=False):
        length = request.headers.get('Content-Length')
        if (not isinstance(length, str) or not re.fullmatch(r'0|[1-9][0-9]*', length)
                or request.headers.get('Transfer-Encoding') is not None
                or not 0 < int(length) <= maximum):
            raise ValueError('CURRENT_POST64_BODY_BOUND')
        raw = request.rfile.read(int(length))
        if len(raw) != int(length):
            raise ValueError('CURRENT_POST64_BODY_TRUNCATED')
        if binary:
            return raw
        return json.loads(raw, object_pairs_hook=_duplicate_free,
            parse_constant=lambda _: (_ for _ in ()).throw(ValueError('CURRENT_POST64_NONFINITE_JSON')))

    def _sql(self, expression):
        self._assert_owned()
        raw = self.pg_call("begin;set local request.jwt.claim.role='service_role';"
            "set local role service_role;" + expression + ';commit;')
        return json.loads(raw)

    def _object_read(self, key):
        self._assert_owned()
        row = self.originals.get(key) or self.created.get(key)
        if row is None or key in self.retired:
            return None
        if self._identity(row['file']) != row['identity']:
            raise ValueError('CURRENT_POST64_OBJECT_IDENTITY_CHANGED')
        raw = self._read_file(row['file'])
        if (len(raw), hashlib.sha256(raw).hexdigest()) != (row['bytes'], row['sha256']):
            raise ValueError('CURRENT_POST64_OBJECT_BYTES_CHANGED')
        return raw

    def handle(self, request, route, query):
        try:
            return self._handle(request, route, query)
        except BaseException as error:
            tag = ('CHECKPOINT_CAS' if route.endswith('/ravradar_ravscore_checkpoint_cas') else
                'OPERATIONAL_CAS' if route.endswith('/ravradar_ravscore_operational_cas') else
                'POINTER_CAS' if route == '/rest/v1/admin_documents' else
                'STORAGE' if route.startswith('/storage/v1/') else 'NONE')
            emit_current_native_failure(error, phase='POST64_TRANSPORT', route=tag)
            raise

    def _handle(self, request, route, query):
        """Return a fixed route tag, or None for an unrelated normal route."""
        method = request.command
        with self.lock:
            self._assert_owned()
            if method == 'POST' and not query and route == '/rest/v1/rpc/ravradar_ravscore_checkpoint_cas':
                body = self._body(request, self.policy['checkpointMaximumSerializedBytes'] + 8192)
                if (not _exact_keys(body, ('p_expected_version', 'p_target_reference', 'p_payload'))
                        or not _integer(body['p_expected_version']) or type(body['p_payload']) is not dict
                        or body['p_payload'].get('productionReferenceAt') != body['p_target_reference']
                        or len((_json(body['p_payload']) + '\n').encode()) > self.policy['checkpointMaximumSerializedBytes']):
                    raise ValueError('CURRENT_POST64_CHECKPOINT_BODY')
                reference = body['p_target_reference']
                if not isinstance(reference, str) or not re.fullmatch(r'[0-9TZ:.-]{20,30}', reference):
                    raise ValueError('CURRENT_POST64_REFERENCE')
                result = self._sql('select public.ravradar_ravscore_checkpoint_cas('
                    + str(body['p_expected_version']) + ",'" + reference + "'::timestamptz,"
                    + _literal(body['p_payload']) + ')')
                request.reply(200, result)
                return 'current-actual-pg-checkpoint-cas'
            if method == 'POST' and not query and route == '/rest/v1/rpc/ravradar_ravscore_operational_cas':
                body = self._body(request, 1024 * 1024)
                if (not _exact_keys(body, ('p_expected_operational_version', 'p_expected_profile_version',
                        'p_operational_payload', 'p_profile_payload'))
                        or not _integer(body['p_expected_operational_version'])
                        or not _integer(body['p_expected_profile_version'])
                        or type(body['p_operational_payload']) is not dict
                        or type(body['p_profile_payload']) is not dict):
                    raise ValueError('CURRENT_POST64_CENTRAL_CAS_BODY')
                result = self._sql('select public.ravradar_ravscore_operational_cas('
                    + str(body['p_expected_operational_version']) + ',' + str(body['p_expected_profile_version'])
                    + ',' + _literal(body['p_operational_payload']) + ',' + _literal(body['p_profile_payload']) + ')')
                request.reply(200, result)
                return 'current-actual-pg-operational-profile-cas'
            if route == '/rest/v1/admin_documents' and method in {'POST', 'PATCH'}:
                body = self._body(request, 2 * 1024 * 1024)
                if method == 'POST':
                    if (query != {'on_conflict': ['document_key'], 'select': ['document_key,payload,version']}
                            or request.headers.get('Prefer') != 'resolution=ignore-duplicates,return=representation'
                            or not _exact_keys(body, ('document_key', 'payload', 'updated_by'))
                            or body['document_key'] not in {B_KEY, PROFILE_KEY} or body['updated_by'] is not None):
                        raise ValueError('CURRENT_POST64_DOCUMENT_INSERT')
                    key = body['document_key']
                    statement = "insert into public.admin_documents(document_key,payload,updated_by) values('" + key
                    statement += "'," + _literal(body['payload']) + ',null) on conflict(document_key) do nothing'
                else:
                    if (set(query) != {'document_key', 'version', 'select'}
                            or query['document_key'] != ['eq.' + B_KEY]
                            or query['select'] != ['document_key,payload,version']
                            or request.headers.get('Prefer') != 'return=representation'
                            or len(query['version']) != 1 or not re.fullmatch(r'eq\.[1-9][0-9]{0,15}', query['version'][0])
                            or not _exact_keys(body, ('payload', 'updated_by')) or body['updated_by'] is not None):
                        raise ValueError('CURRENT_POST64_POINTER_CAS')
                    version = int(query['version'][0][3:])
                    if not _integer(version, 1):
                        raise ValueError('CURRENT_POST64_POINTER_VERSION')
                    statement = 'update public.admin_documents set payload=' + _literal(body['payload'])
                    statement += ",updated_by=null where document_key='" + B_KEY + "' and version=" + str(version)
                result = self._sql('with changed as (' + statement
                    + " returning document_key,payload,version) select coalesce(jsonb_agg(to_jsonb(changed)),'[]'::jsonb) from changed")
                request.reply(200, result)
                return 'current-actual-pg-document-' + method.lower()
            bucket = self.policy['bucket']['id']
            read_prefix = '/storage/v1/object/authenticated/' + bucket + '/'
            write_prefix = '/storage/v1/object/' + bucket + '/'
            if not query and method == 'GET' and route.startswith(read_prefix):
                key = self._object_key(urllib.parse.unquote(route[len(read_prefix):]))
                raw = self._object_read(key)
                request.reply(404 if raw is None else 200, raw=raw)
                return 'current-owned-storage-readback'
            if not query and method == 'POST' and route.startswith(write_prefix):
                key = self._object_key(urllib.parse.unquote(route[len(write_prefix):]))
                if request.headers.get('x-upsert') != 'false' or request.headers.get('Content-Type') != 'application/gzip':
                    raise ValueError('CURRENT_POST64_IMMUTABLE_HEADERS')
                raw = self._body(request, self.policy['bucket']['file_size_limit'], binary=True)
                if self._object_read(key) is not None:
                    request.reply(409, {'code': 'KeyAlreadyExists'})
                    return 'current-owned-storage-already-exists'
                digest = hashlib.sha256(raw).hexdigest()
                if '/part-' not in key and key != 'bundles/sha256/' + digest + '.json.gz':
                    raise ValueError('CURRENT_POST64_OBJECT_DIGEST_KEY')
                if '/part-' in key and not key.endswith('-' + digest + '.json.gz.part'):
                    raise ValueError('CURRENT_POST64_PART_DIGEST_KEY')
                destination = self.root / (hashlib.sha256(key.encode()).hexdigest() + '-' + digest + '.bin')
                descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
                try:
                    remaining = memoryview(raw)
                    while remaining:
                        written = os.write(descriptor, remaining)
                        if written <= 0:
                            raise ValueError('CURRENT_POST64_WRITE_SHORT')
                        remaining = remaining[written:]
                    os.fsync(descriptor)
                finally:
                    os.close(descriptor)
                self.created[key] = {'file': destination, 'bytes': len(raw), 'sha256': digest,
                    'identity': self._identity(destination)}
                if self._object_read(key) != raw:
                    raise ValueError('CURRENT_POST64_WRITE_READBACK')
                request.reply(200, {'Key': bucket + '/' + key})
                return 'current-owned-storage-immutable-upload'
            if not query and method == 'DELETE' and route == '/storage/v1/object/' + bucket:
                body = self._body(request, 4096)
                if not _exact_keys(body, ('prefixes',)) or type(body['prefixes']) is not list or len(body['prefixes']) != 1:
                    raise ValueError('CURRENT_POST64_EXACT_REMOVE_BODY')
                key = self._object_key(body['prefixes'][0])
                # Original input objects are NEVER cleanup targets. No implicit
                # pruning or deletion is used to manufacture a cache miss.
                if key in self.originals and self.initial_prefix:
                    # Explicit negative HTTP result, NOT a successful delete.
                    # Verify the protected original before registering this
                    # narrow, expected refusal. All other errors still throw.
                    self._object_read(key)
                    self.protected_retention_refusals.add(key)
                    request.reply(409, {'code': 'NativeOriginalPreserved'})
                    return 'current-original-preserved-retention-refused'
                if key in self.originals or key not in self.created or key in self.retired:
                    raise ValueError('CURRENT_POST64_REMOVE_NOT_CREATED')
                referenced = self._sql("select position(" + _literal(key) + "::text in payload::text)>0 from public.admin_documents where document_key='" + B_KEY + "'")
                if referenced is not False:
                    raise ValueError('CURRENT_POST64_REMOVE_REFERENCED_OR_UNKNOWN')
                row = self.created[key]
                self._object_read(key)
                os.unlink(row['file'])
                self.retired.add(key)
                request.reply(200, [{'name': key}])
                return 'current-owned-storage-exact-created-cleanup'
            return None
