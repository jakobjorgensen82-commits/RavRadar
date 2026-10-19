#!/usr/bin/env python3
"""Extract one opaque ciphertext, never authenticate or publish its contents."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import sys
import time
import zipfile

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    'public_zip_preflight', Path(__file__).with_name('extract-code-only-public-source.py'))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

# Same upper bound as staged-private-production-runtime.mjs. No plaintext parser.
MAX_SEALED = 350_000_000 + 32 * 1024 + 1024
MAX_ZIP = MAX_SEALED + 1024 * 1024
MAGIC = b'RR-PRIVATE-BUILD-STAGE-1\n'
BLOCK = 64 * 1024


class StageRefusal(Exception):
    pass


def require(value):
    if not value:
        raise ValueError('ORDINARY_STAGE_ZIP_REFUSED')


def identity(value):
    return (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns)


def extract(archive, output):
    deadline = time.monotonic() + 90
    created = False
    boundary = 'INPUT'
    try:
        before = os.lstat(archive)
        require(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode))
        require(0 < before.st_size <= MAX_ZIP)
        with open(archive, 'rb') as raw:
            opened = os.fstat(raw.fileno())
            require(stat.S_ISREG(opened.st_mode))
            # Windows lstat and handle-stat expose different ctime semantics.
            # Preserve each complete observation independently below; compare
            # their common physical fields here, not an invented shared ctime.
            require(identity(opened)[:4] == identity(before)[:4])
            require(os.name == 'nt' or opened.st_ctime_ns == before.st_ctime_ns)
            # Existing, bounded ZIP/ZIP64 central-directory preflight. zipfile
            # owns member decoding, local-header validation and CRC verification.
            boundary = 'ZIP_PREFLIGHT'
            require(preflight.zip_preflight(raw, before.st_size, 'public', deadline) == 1)
            with zipfile.ZipFile(raw, 'r') as bundle:
                boundary = 'MEMBER'
                members = bundle.infolist()
                require(len(members) == 1)
                member = members[0]
                require(member.filename == member.orig_filename == 'sealed.bin')
                require(not member.is_dir() and not (member.flag_bits & 1))
                require(member.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED))
                require(stat.S_IFMT(member.external_attr >> 16) in (0, stat.S_IFREG))
                require(not (member.external_attr & 0x10))
                boundary = 'SIZE'
                require(len(MAGIC) + 16 + 12 + 16 + 5 <= member.file_size <= MAX_SEALED)
                require(0 < member.compress_size <= MAX_ZIP)
                require(member.file_size <= max(1024, member.compress_size * 2))
                count = 0
                digest = hashlib.sha256()
                boundary = 'COPY_CRC'
                with bundle.open(member, 'r') as source, open(output, 'xb') as destination:
                    created = True
                    if os.name != 'nt':
                        os.fchmod(destination.fileno(), 0o600)
                    while True:
                        require(time.monotonic() < deadline)
                        chunk = source.read(min(BLOCK, member.file_size + 1 - count))
                        if not chunk:
                            break
                        if count == 0:
                            require(chunk.startswith(MAGIC))
                        count += len(chunk)
                        require(count <= member.file_size)
                        destination.write(chunk)
                        digest.update(chunk)
                    require(count == member.file_size)
                    destination.flush()
                    os.fsync(destination.fileno())
            boundary = 'INPUT_IDENTITY'
            require(identity(os.fstat(raw.fileno())) == identity(opened))
            require(identity(os.lstat(archive)) == identity(before))
        return {'code': 'ORDINARY_STAGE_CIPHERTEXT_EXTRACTED', 'bytes': count,
                'sha256': digest.hexdigest(), 'contentsAuthenticated': False,
                'publicationAuthorized': False}
    except BaseException:
        if created:
            try:
                os.unlink(output)
            except OSError:
                pass  # Caller owns its private directory; retain the first cause.
        raise StageRefusal(boundary) from None


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 3)
        print(json.dumps(extract(sys.argv[1], sys.argv[2]), separators=(',', ':')))
    except StageRefusal as error:
        print('ORDINARY_STAGE_ZIP_REFUSED_' + str(error), file=sys.stderr)
        sys.exit(1)
    except BaseException:
        print('ORDINARY_STAGE_ZIP_REFUSED', file=sys.stderr)
        sys.exit(1)
