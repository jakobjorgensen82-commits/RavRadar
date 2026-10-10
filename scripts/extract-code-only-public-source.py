#!/usr/bin/env python3
"""Read only the six selected public-source files from a sealed Pages artifact."""
import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import struct
import sys
import time
import zipfile

MIB = 1024 * 1024
# NEW resource policy derived from the Pages platform's unofficial <10 GB limit.
# This is not an inherited RavRadar cap or a >1 GB deployment guarantee.
TAR_LIMIT = 10_000_000_000 - 1
HANDOFF_ZIP_LIMIT = 10 * MIB
HANDOFF_DECODED_LIMIT = 10 * MIB  # NEW small-metadata scan ceiling for review.
HANDOFF_CENTRAL_LIMIT = MIB  # NEW bounded metadata-allocation policy for review.
PUBLIC_CENTRAL_LIMIT = 46 + 3 * 65535  # One central record's structural maximum.
BLOCK = 64 * 1024
HANDOFF = frozenset(('manifest.json', 'pages-artifact-seal.json',
                     'handoff.json', 'target-binding.json'))
PUBLIC = {
    'data/live/manifest.json': ('manifest.json', MIB),
    'data/live/public-conditions.json': ('public-conditions.json', 32 * MIB),
    'data/live/public-condition-details.json': ('public-condition-details.json', None),
    'data/live/coastal-parts-v2.json': ('coastal-parts-v2.json', 16 * MIB),
    'data/zones.geojson': ('zones.geojson', 32 * MIB),
    'data/water-level-station-routing.json': ('water-level-station-routing.json', 4 * MIB),
}


def require(condition):
    if not condition:
        raise ValueError('PUBLIC_EXTRACTION_REFUSED')


def check(deadline):
    require(time.monotonic() < deadline)


def identity(value):
    return (value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns)


def owned_open(filename):
    before = os.lstat(filename)
    require(stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode))
    fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        require(identity(os.fstat(fd)) == identity(before))
    except BaseException:
        close_once(fd, sys.exc_info())
        raise
    return fd, before


def close_once(fd, first=None):
    # One physical close attempt; body failure always wins over secondary close.
    try:
        os.close(fd)
    except BaseException:
        if first is None:
            first = sys.exc_info()
    closed = False
    try:
        os.fstat(fd)
    except OSError as error:
        closed = error.errno == errno.EBADF
    if not closed and first is None:
        first = (ValueError, ValueError('PUBLIC_EXTRACTION_CLOSE_UNCONFIRMED'), None)
    if first is not None:
        raise first[1].with_traceback(first[2])


def read_small(filename, cap, deadline):
    fd, before = owned_open(filename)
    first = None
    value = bytearray()
    try:
        require(0 < before.st_size <= cap)
        while True:
            check(deadline)
            chunk = os.read(fd, min(BLOCK, cap + 1 - len(value)))
            if not chunk:
                break
            value.extend(chunk)
            require(len(value) <= cap)
        require(len(value) == before.st_size and identity(os.fstat(fd)) == identity(before))
        require(identity(os.lstat(filename)) == identity(before))
    except BaseException:
        first = sys.exc_info()
    close_once(fd, first)
    return bytes(value)


class PathView:
    """Validate an arbitrarily long name incrementally; never retain its body."""
    def __init__(self):
        self.started = False
        self.part = bytearray()
        self.part_length = 0
        self.candidate = bytearray()
        self.too_long = False
        self.components = 0

    def _component(self):
        require(bytes(self.part) != b'..' or self.part_length != 2)
        if self.part_length and not (self.part_length == 1 and self.part == b'.'):
            if self.components and not self.too_long:
                self.candidate.extend(b'/')
            self.components += 1
            if self.part_length > 128 or len(self.candidate) + self.part_length > 128:
                self.too_long = True
            elif not self.too_long:
                self.candidate.extend(self.part)
        self.part.clear()
        self.part_length = 0

    def feed(self, value):
        for byte in value:
            require(byte not in (0, 92))
            if not self.started:
                require(byte != 47)
                self.started = True
            if byte == 47:
                self._component()
            else:
                self.part_length += 1
                if len(self.part) < 128:
                    self.part.append(byte)

    def finish(self):
        require(self.started)
        self._component()
        return None if self.too_long else bytes(self.candidate).decode('ascii', errors='replace')


def path_view(value):
    view = PathView()
    view.feed(value)
    return view.finish()


def zip_preflight(raw, size, mode, deadline):
    check(deadline)
    raw.seek(max(0, size - (65535 + 22)))
    tail = raw.read(65535 + 22)
    position = tail.rfind(b'PK\x05\x06')
    require(position >= 0 and position + 22 <= len(tail))
    signature, disk, cd_disk, disk_count, count, cd_size, cd_offset, comment = struct.unpack(
        '<4s4H2LH', tail[position:position + 22])
    require(position + 22 + comment == len(tail) and disk == 0 and cd_disk == 0)
    end_offset = size - len(tail) + position
    central_end = end_offset
    if count == 65535 or disk_count == 65535 or cd_size == 0xffffffff or cd_offset == 0xffffffff:
        require(end_offset >= 20)
        raw.seek(end_offset - 20)
        locator = raw.read(20)
        require(len(locator) == 20)
        magic, owner_disk, zip64_offset, disks = struct.unpack('<4sLQL', locator)
        require(magic == b'PK\x06\x07' and owner_disk == 0 and disks == 1)
        require(0 <= zip64_offset <= end_offset - 76)
        raw.seek(zip64_offset)
        record = raw.read(56)
        require(len(record) == 56)
        (magic, record_size, _made, _needed, disk, cd_disk,
         disk_count, count, cd_size, cd_offset) = struct.unpack('<4sQ2H2L4Q', record)
        require(magic == b'PK\x06\x06' and record_size >= 44 and disk == 0 and cd_disk == 0)
        require(zip64_offset + 12 + record_size == end_offset - 20)
        central_end = zip64_offset
    require(disk_count == count and count > 0 and cd_offset >= 0)
    require(cd_offset + cd_size == central_end and cd_offset < size)
    require(count <= cd_size // 46)
    if mode == 'public':
        require(count == 1 and 46 <= cd_size <= PUBLIC_CENTRAL_LIMIT)
    else:
        require(46 <= cd_size <= HANDOFF_CENTRAL_LIMIT)
    # Central size/count are proven before ZipFile eagerly parses its directory.
    return count


class TarReader:
    def __init__(self, source, declared, deadline):
        require(0 < declared <= TAR_LIMIT)
        self.source, self.declared, self.deadline = source, declared, deadline
        self.count = 0

    def read(self, count):
        check(self.deadline)
        require(0 <= count <= BLOCK)
        value = self.source.read(count)
        self.count += len(value)
        require(self.count <= self.declared and self.count <= TAR_LIMIT)
        return value

    def exact(self, count):
        require(0 <= count <= BLOCK)
        result = bytearray()
        while len(result) < count:
            chunk = self.read(count - len(result))
            require(chunk)
            result.extend(chunk)
        return bytes(result)

    def chunks(self, count):
        require(0 <= count <= self.declared - self.count)
        while count:
            chunk = self.exact(min(BLOCK, count))
            count -= len(chunk)
            yield chunk

    def padding(self, size):
        padding = self.exact((-size) % 512)
        require(not any(padding))


def tar_number(value):
    if value[0] & 128:
        require(value[0] & 64 == 0)
        result = int.from_bytes(bytes([value[0] & 127]) + value[1:], 'big')
    else:
        stripped = value.rstrip(b'\0 ').lstrip(b' ')
        require(not stripped or re.fullmatch(b'[0-7]+', stripped))
        result = int(stripped or b'0', 8)
    require(0 <= result <= TAR_LIMIT)
    return result


def pax_values(reader, size):
    # Parse each record without allocating its declared length or metadata body.
    left, fields = size, {}
    while left:
        digits = bytearray()
        while True:
            require(left > 0)
            char = reader.exact(1)
            left -= 1
            if char == b' ':
                break
            require(b'0' <= char <= b'9' and len(digits) < 11)
            digits.extend(char)
        require(digits and digits[0] != 48)
        record_length = int(digits)
        body_length = record_length - len(digits) - 1
        require(3 <= body_length <= left)
        left -= body_length
        key = bytearray()
        while True:
            require(body_length > 1)
            char = reader.exact(1)
            body_length -= 1
            if char == b'=':
                break
            require(char not in (b'\n', b'\0'))
            if len(key) < 128:
                key.extend(char)
        require(key and not key.startswith(b'GNU.sparse') and not key.startswith(b'SCHILY.realsize'))
        selected = bytes(key) in (b'path', b'size', b'linkpath')
        require(bytes(key) != b'linkpath')
        require(not selected or bytes(key) not in fields)
        view = PathView() if key == b'path' else None
        number = bytearray()
        for chunk in reader.chunks(body_length - 1):
            if view is not None:
                view.feed(chunk)
            elif key == b'size':
                require(len(number) + len(chunk) <= 11 and re.fullmatch(b'[0-9]+', chunk))
                number.extend(chunk)
        require(reader.exact(1) == b'\n')
        if view is not None:
            fields[b'path'] = view.finish()
        elif key == b'size':
            require(number)
            value = int(number)
            require(0 <= value <= TAR_LIMIT)
            fields[b'size'] = value
    return fields


def long_name(reader, size):
    view, terminated = PathView(), False
    for chunk in reader.chunks(size):
        if terminated:
            require(not any(chunk))
            continue
        at = chunk.find(b'\0')
        if at >= 0:
            view.feed(chunk[:at])
            require(not any(chunk[at:]))
            terminated = True
        else:
            view.feed(chunk)
    require(terminated)
    return view.finish()


def write_selected(output, name, chunks, declared, cap, deadline, manifest=None):
    if not 0 < declared <= cap:
        raise ValueError(f'PUBLIC_SELECTED_FILE_BOUND:{name}:{cap}:{declared}')
    if manifest is not None:
        require(declared == len(manifest))
    destination = output / name
    fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    before = os.fstat(fd)
    first, digest, count = None, hashlib.sha256(), 0
    try:
        require(stat.S_ISREG(before.st_mode))
        for chunk in chunks:
            check(deadline)
            require(count + len(chunk) <= declared)
            if manifest is not None:
                require(chunk == manifest[count:count + len(chunk)])
            digest.update(chunk)
            count += len(chunk)
            view = memoryview(chunk)
            while view:
                check(deadline)
                written = os.write(fd, view)
                require(written > 0)
                view = view[written:]
        current = os.fstat(fd)
        require(count == declared and current.st_size == declared
                and (current.st_dev, current.st_ino) == (before.st_dev, before.st_ino))
        require(identity(os.lstat(destination)) == identity(current))
    except BaseException:
        first = sys.exc_info()
    close_once(fd, first)
    return {'name': name, 'bytes': count, 'sha256': digest.hexdigest()}


def read_public(member, info, output, manifest, detail_cap, deadline):
    reader, selected = TarReader(member, info.file_size, deadline), {}
    global_values, pending = {}, {}
    ended = False
    while not ended:
        header = reader.exact(512)
        if not any(header):
            require(not pending and not any(reader.exact(512)))
            ended = True
            break
        checksum = tar_number(header[148:156])
        check_header = header[:148] + b'        ' + header[156:]
        require(checksum in (sum(check_header), sum(byte if byte < 128 else byte - 256 for byte in check_header)))
        size, kind = tar_number(header[124:136]), header[156:157]
        name = header[:100].split(b'\0', 1)[0]
        if header[257:263] == b'ustar\0':
            prefix = header[345:500].split(b'\0', 1)[0]
            if prefix:
                name = prefix + b'/' + name
        base_name = path_view(name)
        if kind in (b'x', b'g', b'L'):
            fields = {b'path': long_name(reader, size)} if kind == b'L' else pax_values(reader, size)
            if kind == b'g':
                global_values.update(fields)
            else:
                for key, value in fields.items():
                    require(key not in pending or pending[key] == value)
                    pending[key] = value
            reader.padding(size)
            continue
        require(kind in (b'0', b'\0', b'7', b'5'))
        values = {**global_values, **pending}
        name, size = values.get(b'path', base_name), values.get(b'size', size)
        pending = {}
        if kind == b'5':
            require(size == 0 and name not in PUBLIC)
        elif name in PUBLIC:
            require(name not in selected)
            local, cap = PUBLIC[name]
            selected[name] = write_selected(output, local, reader.chunks(size), size,
                detail_cap if cap is None else cap, deadline,
                manifest if local == 'manifest.json' else None)
        else:
            for _chunk in reader.chunks(size):
                pass
        reader.padding(size)
    # GNU record padding must be all zero; EOF is reached to trigger ZIP CRC.
    while True:
        chunk = reader.read(BLOCK)
        if not chunk:
            break
        require(not any(chunk))
    require(reader.count == info.file_size and set(selected) == set(PUBLIC))
    return list(selected.values()), reader.count


def extract(args, deadline):
    manifest = None
    detail_cap = None
    if args.mode == 'public':
        manifest = read_small(args.expected_manifest, MIB, deadline)
        value = json.loads(manifest)['publicConditionDetailsBytes']
        require(type(value) is int and 2 <= value <= 512 * MIB)
        detail_cap = value
        archive_cap = sum(cap if cap is not None else detail_cap for _, cap in PUBLIC.values())
    else:
        archive_cap = HANDOFF_ZIP_LIMIT
    require(0 < args.expected_zip_bytes <= archive_cap)
    archive = Path(args.archive)
    output = Path(args.output_directory)
    require(output.is_absolute() and archive.is_absolute())
    require(output.parent.resolve() == output.parent and archive.parent.resolve() == archive.parent)
    os.mkdir(output, 0o700)  # Fresh exclusively owned destination; collision is a hard failure.
    fd, before = owned_open(archive)
    first, receipt = None, None
    try:
        require(before.st_size == args.expected_zip_bytes)
        digest, count = hashlib.sha256(), 0
        while True:
            check(deadline)
            chunk = os.read(fd, BLOCK)
            if not chunk:
                break
            count += len(chunk)
            require(count <= args.expected_zip_bytes)
            digest.update(chunk)
        require(count == args.expected_zip_bytes and digest.hexdigest() == args.expected_zip_sha256)
        require(identity(os.fstat(fd)) == identity(before))
        # The borrowed file object never owns or closes the original descriptor.
        with os.fdopen(fd, 'rb', closefd=False) as raw:
            count = zip_preflight(raw, before.st_size, args.mode, deadline)
            with zipfile.ZipFile(raw, 'r') as archive_zip:
                entries = archive_zip.infolist()
                require(len(entries) == count)
                if args.mode == 'handoff':
                    require(sum(entry.file_size for entry in entries) <= HANDOFF_DECODED_LIMIT)
                names = set()
                for entry in entries:
                    require(not entry.flag_bits & 1)
                    require(entry.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED))
                    require(not stat.S_ISLNK(entry.external_attr >> 16))
                    require(stat.S_IFMT(entry.external_attr >> 16) in (0, stat.S_IFREG, stat.S_IFDIR))
                    normalized = path_view(entry.filename.encode('utf8'))
                    require(normalized not in names)
                    names.add(normalized)
                selected, tar_bytes = [], None
                if args.mode == 'public':
                    entry = entries[0]
                    require(entry.filename == 'artifact.tar' and not entry.is_dir())
                    with archive_zip.open(entry, 'r') as member:
                        selected, tar_bytes = read_public(member, entry, output, manifest, detail_cap, deadline)
                else:
                    for entry in entries:
                        normalized = path_view(entry.filename.encode('utf8'))
                        require(not entry.is_dir() and 0 <= entry.file_size <= MIB)
                        with archive_zip.open(entry, 'r') as member:
                            def chunks():
                                remaining = entry.file_size
                                while remaining:
                                    check(deadline)
                                    chunk = member.read(min(BLOCK, remaining))
                                    require(chunk)
                                    remaining -= len(chunk)
                                    yield chunk
                                require(member.read(1) == b'')
                            if normalized in HANDOFF:
                                selected.append(write_selected(output, normalized, chunks(), entry.file_size, MIB, deadline))
                            else:
                                for _chunk in chunks():
                                    pass
                    require({item['name'] for item in selected} == HANDOFF)
                require(identity(os.fstat(fd)) == identity(before))
                require(identity(os.lstat(archive)) == identity(before))
                receipt = {'schemaVersion': 1, 'mode': args.mode, 'zipBytes': before.st_size,
                           'zipSha256': digest.hexdigest(), 'selectedFiles': selected}
                if tar_bytes is not None:
                    receipt['tarBytesScanned'] = tar_bytes
    except BaseException:
        first = sys.exc_info()
    close_once(fd, first)
    check(deadline)
    return receipt


def main():
    require(sys.platform == 'linux')
    argv = sys.argv[1:]
    require(len(argv) in (12, 14) and len(set(argv[::2])) == len(argv[::2]))
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument('--mode', choices=('handoff', 'public'), required=True)
    parser.add_argument('--archive', required=True)
    parser.add_argument('--expected-zip-bytes', required=True)
    parser.add_argument('--expected-zip-sha256', required=True)
    parser.add_argument('--output-directory', required=True)
    parser.add_argument('--deadline-epoch-ms', required=True)
    parser.add_argument('--expected-manifest')
    args = parser.parse_args(argv)
    require((args.mode == 'public') == (args.expected_manifest is not None))
    require(re.fullmatch('[1-9][0-9]{0,15}', args.expected_zip_bytes))
    require(re.fullmatch('[1-9][0-9]{0,15}', args.deadline_epoch_ms))
    require(re.fullmatch('[a-f0-9]{64}', args.expected_zip_sha256))
    args.expected_zip_bytes = int(args.expected_zip_bytes)
    remaining = int(args.deadline_epoch_ms) / 1000 - time.time()
    require(0 < remaining <= 360)
    deadline = time.monotonic() + remaining
    receipt = extract(args, deadline)
    print(json.dumps(receipt, separators=(',', ':')))


if __name__ == '__main__':
    try:
        main()
    except BaseException as error:
        diagnostic = str(error)
        if re.fullmatch(r'PUBLIC_SELECTED_FILE_BOUND:(manifest\.json|public-conditions\.json|public-condition-details\.json|coastal-parts-v2\.json|zones\.geojson|water-level-station-routing\.json|pages-artifact-seal\.json|handoff\.json|target-binding\.json):[0-9]{1,16}:[0-9]{1,16}', diagnostic):
            print(diagnostic, file=sys.stderr)
        else:
            print('PUBLIC_EXTRACTION_REFUSED', file=sys.stderr)
        sys.exit(1)
