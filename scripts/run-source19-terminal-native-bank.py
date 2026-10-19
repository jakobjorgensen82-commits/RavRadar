"""One fixed, test-only SOURCE input bank; not production/family admission.

No old Git pin is reassigned. A normal green checkout contributes only the
explicit unchanged leaves; other reviewed bytes are inert .source.txt/.data.
Only an owned proof host receives those bytes at their original relative paths.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'scripts/fixtures/source19-terminal-proof-inputs-v2/manifest.json'
MANIFEST_SHA256 = '403a82974a2a67e4372cf7c2a70e3dde007053d1713e34ffb0e81cd44acbeada'
RESULT = '.cache/source19-terminal-proof-result/result.json'
COMPOSITION = 'integrated-maineec-a582-early-terminal-proof-bank-v16'


def clean_environment():
    return {key: value for key, value in os.environ.items()
        if key in {'PATH', 'LD_LIBRARY_PATH', 'LIBRARY_PATH', 'LANG', 'LC_ALL', 'LC_CTYPE'}}


def digest(body):
    return hashlib.sha256(body).hexdigest()


def relative_path(value):
    if not isinstance(value, str) or not value or '\\' in value:
        raise ValueError('SOURCE_BANK_PATH_REFUSED')
    part = Path(value)
    if part.is_absolute() or '..' in part.parts or part.as_posix() != value:
        raise ValueError('SOURCE_BANK_PATH_REFUSED')
    return part


def exact_bytes(relative, maximum=32 * 1024 * 1024):
    file = ROOT / relative_path(relative)
    before = file.lstat()
    if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > maximum:
        raise ValueError('SOURCE_BANK_OWN_REGULAR_INPUT_REQUIRED')
    with file.open('rb') as stream:
        opened = os.fstat(stream.fileno()); body = stream.read(maximum + 1); ended = os.fstat(stream.fileno())
    key = lambda row: (row.st_dev, row.st_ino, row.st_mode, row.st_nlink, row.st_size, row.st_mtime_ns, row.st_ctime_ns)
    if key(before) != key(opened) or key(opened) != key(ended) or key(ended) != key(file.lstat()) or len(body) != before.st_size:
        raise ValueError('SOURCE_BANK_INPUT_CHANGED')
    return body


def inputs():
    raw = exact_bytes(MANIFEST, 256 * 1024)
    if digest(raw) != MANIFEST_SHA256:
        raise ValueError('SOURCE_BANK_MANIFEST_CHANGED')
    data = json.loads(raw)
    if (data.get('schemaVersion') != 1 or data.get('kind') != 'SOURCE19_V15_EXPLICIT_TEST_INPUT_CLOSURE'
            or data.get('sourceAdmission') is not False or data.get('productionActivation') is not False
            or len(data.get('files', [])) != 296 or data.get('testOnlyBankFiles') != 69
            or data.get('fixedGitFiles') != 227 or data.get('baselinePins') != 27):
        raise ValueError('SOURCE_BANK_EXACT_CLOSURE_REQUIRED')
    actual_tree = subprocess.check_output(['git', 'rev-parse', data['ordinaryBase']['commit'] + '^{tree}'],
        cwd=ROOT, env=clean_environment(), text=True).strip()
    if actual_tree != data['ordinaryBase']['tree']:
        raise ValueError('SOURCE_BANK_FIXED_GREEN_TREE_CHANGED')
    files, seen_bank = {}, set()
    for row in data['files']:
        if set(row) != {'path', 'bytes', 'sha256', 'input'} or row['path'] in files:
            raise ValueError('SOURCE_BANK_DUPLICATE_OR_CHANGED_ROW')
        relative_path(row['path'])
        if row['input'].get('kind') == 'FIXED_NORMAL_GIT_BLOB':
            if set(row['input']) != {'kind', 'gitBlob'}:
                raise ValueError('SOURCE_BANK_CHECKOUT_CONTRACT')
            body = subprocess.check_output(['git', 'cat-file', 'blob', data['ordinaryBase']['commit'] + ':' + row['path']],
                cwd=ROOT, env=clean_environment())
            if hashlib.sha1(b'blob ' + str(len(body)).encode() + b'\0' + body).hexdigest() != row['input']['gitBlob']:
                raise ValueError('SOURCE_BANK_FIXED_GIT_BLOB_CHANGED')
        elif row['input'].get('kind') == 'FROZEN_TEST_BANK':
            if set(row['input']) != {'kind', 'bankPath'}:
                raise ValueError('SOURCE_BANK_OPERAND_CONTRACT')
            source = row['input']['bankPath']
            if not source.startswith('scripts/fixtures/source19-terminal-proof-inputs-v2/operands/') or source in seen_bank:
                raise ValueError('SOURCE_BANK_OPERAND_SCOPE')
            seen_bank.add(source)
            body = exact_bytes(source)
        else:
            raise ValueError('SOURCE_BANK_UNKNOWN_INPUT_KIND')
        if (len(body), digest(body)) != (row['bytes'], row['sha256']):
            raise ValueError('SOURCE_BANK_WHOLE_INPUT_CHANGED')
        files[row['path']] = body
    if len(seen_bank) != 69 or sum(map(len, files.values())) > 24 * 1024 * 1024:
        raise ValueError('SOURCE_BANK_CLOSURE_BOUND')
    return data, files


def write_new(file, body):
    file.parent.mkdir(parents=True, exist_ok=True)
    with file.open('xb') as stream:
        stream.write(body); stream.flush(); os.fsync(stream.fileno())


def metadata_result(value):
    # No payload, error text, URL, signed key, source archive or vectors here.
    raw = (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()
    if len(raw) > 128 * 1024:
        raise ValueError('SOURCE_BANK_RESULT_BOUND')
    directory = ROOT / '.cache/source19-terminal-proof-result'
    directory.mkdir(parents=True, exist_ok=False)
    write_new(directory / 'result.json', raw)


def bounded_observation(value):
    keys = {'kind', 'status', 'actualStalls', 'actualFinalizerCount', 'physicalClosureBeforeCleanup',
        'outerDrainClosed', 'originalClock', 'localOfficialSdk', 'originalBObjectsPreserved',
        'sourceAdmission', 'productionActivation', 'remoteCloudDurability'}
    if set(value) != keys or value['status'] not in ('PASS', 'FAIL'):
        raise ValueError('SOURCE_BANK_NATIVE_OBSERVATION_SHAPE')
    if (type(value['actualStalls']) is not int or not 0 <= value['actualStalls'] <= 5
            or type(value['actualFinalizerCount']) is not int or not 0 <= value['actualFinalizerCount'] <= 16
            or value['physicalClosureBeforeCleanup'] is not None and type(value['physicalClosureBeforeCleanup']) is not bool
            or type(value['outerDrainClosed']) is not bool
            or value['sourceAdmission'] is not False or value['productionActivation'] is not False
            or value['remoteCloudDurability'] != 'NOT_TESTED'
            or value['originalBObjectsPreserved'] not in (True, None)):
        raise ValueError('SOURCE_BANK_NATIVE_OBSERVATION_VALUE')
    clock = value['originalClock']
    if clock is not None and (set(clock) != {'caughtNs', 'cutoffNs', 'actionClosedNs'}
            or any(not isinstance(v, str) or not v.isascii() or not v.isdigit() or not 1 <= len(v) <= 30 for v in clock.values())
            or int(clock['cutoffNs']) - int(clock['caughtNs']) != 240_000_000_000):
        raise ValueError('SOURCE_BANK_NATIVE_CLOCK_SHAPE')
    sdk = value['localOfficialSdk']
    if not isinstance(sdk, dict) or set(sdk) - {'raw', 'cipher'}:
        raise ValueError('SOURCE_BANK_NATIVE_SDK_SHAPE')
    for row in sdk.values():
        if (set(row) != {'phase', 'archiveBytes', 'archiveFileCount'} or row['phase'] not in ('created', 'put', 'finalized')
                or row['archiveBytes'] is not None and (type(row['archiveBytes']) is not int or not 1 <= row['archiveBytes'] <= 64 * 1024 * 1024)
                or type(row['archiveFileCount']) is not int or not 0 <= row['archiveFileCount'] <= 4096):
            raise ValueError('SOURCE_BANK_NATIVE_SDK_VALUE')
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--node24-path', required=True)
    parser.add_argument('--node22-path', required=True)
    args = parser.parse_args()
    report = {'schemaVersion': 1, 'kind': 'SOURCE19_FIXED_NATIVE_METADATA_RESULT', 'status': 'FAIL',
        'stage': 'INPUTS', 'manifestSha256': MANIFEST_SHA256, 'nativeExitCode': None,
        'observation': None, 'seedGitOperands': 'UNKNOWN', 'normalCheckoutMutationObserved': 'UNKNOWN', 'normalCheckoutWritesAuthorized': False, 'sourceAdmission': False,
        'productionActivation': False, 'remoteCloudDurability': 'NOT_TESTED_LOCAL_SDK_PROTOCOL_ONLY'}
    try:
        data, files = inputs()
        report['inputHashes'] = [{'path': row['path'], 'bytes': row['bytes'], 'sha256': row['sha256']} for row in data['files']]
        report['productIdentity'] = data['productIdentity']
        if sys.platform != 'linux' or sys.version_info[:2] != (3, 12):
            raise ValueError('SOURCE_BANK_LINUX_PYTHON312_REQUIRED')
        node24, node22 = Path(args.node24_path).resolve(strict=True), Path(args.node22_path).resolve(strict=True)
        if node24 == node22:
            raise ValueError('SOURCE_BANK_SEPARATE_NODE_RUNTIMES_REQUIRED')
        head = os.environ.get('SOURCE19_PR_HEAD_SHA', '')
        actual = subprocess.check_output(['git', 'rev-parse', 'HEAD^{commit}'], cwd=ROOT, env=clean_environment(), text=True).strip()
        if len(head) != 40 or any(c not in '0123456789abcdef' for c in head) or actual != head:
            raise ValueError('SOURCE_BANK_EXACT_PR_HEAD_REQUIRED')
        subprocess.run(['git', 'merge-base', '--is-ancestor', data['ordinaryBase']['commit'], head],
            cwd=ROOT, env=clean_environment(), stdin=subprocess.DEVNULL, check=True)
        report['head'] = head; report['stage'] = 'MATERIALIZE'
        runner_input = Path(os.environ['RUNNER_TEMP']); runner = runner_input.resolve(strict=True)
        if not runner_input.is_absolute() or runner_input != runner or runner.is_symlink() or not runner.is_dir():
            raise ValueError('SOURCE_BANK_OWN_RUNNER_TEMP_REQUIRED')
        host = Path(tempfile.mkdtemp(prefix='rr-source19-proof-bank-', dir=runner)).resolve(strict=True)
        if host.parent != runner:
            raise ValueError('SOURCE_BANK_NEW_HOST_REQUIRED')
        for relative, body in files.items():
            write_new(host / relative, body)
        commit = subprocess.check_output(['git', 'cat-file', 'commit', head], cwd=ROOT, env=clean_environment())
        encoded = b'commit ' + str(len(commit)).encode() + b'\0' + commit
        if hashlib.sha1(encoded).hexdigest() != head:
            raise ValueError('SOURCE_BANK_AUTHENTIC_COMMIT_REQUIRED')
        write_new(host / '.git/objects' / head[:2] / head[2:], zlib.compress(encoded))
        (host / '.git/refs').mkdir()
        write_new(host / '.git/HEAD', (head + '\n').encode('ascii'))
        write_new(host / '.git/config', b'[core]\n repositoryformatversion = 0\n bare = false\n')
        # The real checkout owns this object store; the proof host only reads it.
        report['stage'] = 'FIXED_GIT_OPERANDS'
        common_text = subprocess.check_output(['git', 'rev-parse', '--path-format=absolute', '--git-path', 'objects'],
            cwd=ROOT, env=clean_environment(), text=True).strip()
        common = Path(common_text)
        if not common.is_absolute() or '\n' in common_text or '\r' in common_text or common.resolve(strict=True) != common:
            raise ValueError('SOURCE_BANK_PHYSICAL_OBJECT_STORE_REQUIRED')
        at = Path(common.anchor)
        for part in common.parts[1:]:
            at = at / part
            info = at.lstat()
            if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
                raise ValueError('SOURCE_BANK_PHYSICAL_OBJECT_STORE_REQUIRED')
        if common.stat().st_uid != os.geteuid():
            raise ValueError('SOURCE_BANK_OWN_OBJECT_STORE_REQUIRED')
        write_new(host / '.git/objects/info/alternates', (str(common) + '\n').encode('utf-8'))
        verified_git = subprocess.run([str(node22), str(host / 'scripts/test-helpers/source19-native-git-operands.mjs'), '--verify'],
            cwd=host, env=clean_environment(), stdin=subprocess.DEVNULL, capture_output=True, check=False, timeout=30)
        if verified_git.returncode != 0:
            try: fixed_failure = json.loads(verified_git.stdout)
            except (ValueError, UnicodeDecodeError): fixed_failure = {}
            fixed_code = fixed_failure.get('failureCode')
            if isinstance(fixed_code, str) and re.fullmatch(r'SOURCE_GIT_[A-Z_]{1,64}', fixed_code):
                report['fixedGitOperandFailureCode'] = fixed_code
            raise ValueError('SOURCE_BANK_FIXED_GIT_OPERANDS_REFUSED')
        report['fixedGitOperands'] = {'status': 'PASS', 'commits': 1, 'blobs': 125,
            'manifestSha256': '7e06eae7ba27488c1418dc42097db798e4399222b1bd5b721de8321a0c856afc', 'physicalReadOnlyAlternate': True}

        report['stage'] = 'LOCKED_SDK'
        sdk = host / '.github/actions/save-owned-dmi-grib'
        install_env = clean_environment()
        install_env.update(PATH=str(node24.parent) + os.pathsep + install_env.get('PATH', ''),
            npm_config_cache=str(sdk / '.npm-cache'))
        # The SOURCE lock also names @actions/artifact. A main-only warm cache
        # is insufficient; install this exact owned test lock, without scripts.
        subprocess.run(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=sdk,
            env=install_env, stdin=subprocess.DEVNULL, check=True, timeout=240)
        report['stage'] = 'NATIVE'
        child = subprocess.run([sys.executable, '-I', '-B', str(host / data['driver']),
            '--node24-path', str(node24), '--node22-path', str(node22), '--case', 'terminal-asset-skip-limit',
            '--composition', COMPOSITION], cwd=host, env=clean_environment(), stdin=subprocess.DEVNULL,
            capture_output=True, check=False)
        report['nativeExitCode'] = child.returncode
        if len(child.stdout) > 16 * 1024 * 1024 or len(child.stderr) > 16 * 1024 * 1024:
            raise ValueError('SOURCE_BANK_NATIVE_LOG_BOUND')
        write_new(host / 'native-whole.stdout', child.stdout)
        write_new(host / 'native-whole.stderr', child.stderr)
        known_codes = set(re.findall(r"['\"]([A-Z][A-Z0-9_]{3,95})['\"]", files[data['driver']].decode('utf-8')))
        observed_codes = re.findall(rb'\b[A-Z][A-Z0-9_]{3,95}\b', child.stderr)
        report['nativeFailureCode'] = next((v.decode('ascii') for v in observed_codes if v.decode('ascii') in known_codes),
            None if child.returncode == 0 else 'UNCLASSIFIED_NATIVE_FAILURE')
        observations = []
        for line in child.stdout.splitlines():
            if len(line) > 8192:
                continue
            try: value = json.loads(line)
            except (ValueError, UnicodeDecodeError): continue
            if isinstance(value, dict) and value.get('kind') == 'SOURCE19_AUTHENTIC_FIXED_GIT_DATA':
                if (value.get('status') == 'PASS' and value.get('manifestSha256') == '7e06eae7ba27488c1418dc42097db798e4399222b1bd5b721de8321a0c856afc'
                        and value.get('physicalReadOnlyAlternate') is True and value.get('commits') == 1 and value.get('blobs') == 125):
                    report['seedGitOperands'] = {'status': 'PASS', 'commits': 1, 'blobs': 125}
                elif value.get('status') == 'FAIL' and isinstance(value.get('failureCode'), str) and re.fullmatch(r'SOURCE_GIT_[A-Z_]{1,64}', value['failureCode']):
                    report['seedGitOperands'] = {'status': 'FAIL', 'failureCode': value['failureCode']}
            if isinstance(value, dict) and value.get('kind') == 'SOURCE_NATIVE_V16_BOUNDED_OBSERVATION':
                observations.append(value)
        if len(observations) != 1:
            raise ValueError('SOURCE_BANK_FIXED_NATIVE_OBSERVATION_MISSING')
        report['observation'] = bounded_observation(observations[0])
        if child.returncode != 0 or observations[0].get('status') != 'PASS':
            raise ValueError('SOURCE_BANK_NATIVE_PROOF_FAILED')
        report.update(status='PASS', stage='COMPLETE')
    except BaseException as error:
        text = str(error)
        report['failureCode'] = text if type(error) is ValueError and re.fullmatch(r'SOURCE_BANK_[A-Z_]{1,80}', text) else 'UNCLASSIFIED_WRAPPER_FAILURE'
        raise
    finally:
        # An absent observation remains UNKNOWN/null. No fresh clock, fake SAVE
        # or cleanup follows failure. The complete synthetic host stays local.
        metadata_result(report)
        print(json.dumps({'kind': report['kind'], 'status': report['status'], 'stage': report['stage'],
            'metadataResult': RESULT, 'sourceAdmission': False, 'remoteCloudDurability': 'NOT_TESTED'}))


if __name__ == '__main__':
    main()
