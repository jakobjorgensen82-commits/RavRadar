"""One approved pair of public originals; private scratch, bounded safe output only."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request

TARGETS = {
    'dkss_lf': ('https://dmi-opendata.s3.eu-north-1.amazonaws.com/forecastdata/DKSS_LF_SF/DKSS_LF_SF_2026-10-09T000000Z_2026-10-14T000000Z.grib', 5653412,
                '53e6938d72f866e38de810798e26b46ab966d5f7cdd947bab333526e684631f6'),
    'dkss_nsbs': ('https://dmi-opendata.s3.eu-north-1.amazonaws.com/forecastdata/DKSS_NSBS_SF/DKSS_NSBS_SF_2026-10-09T000000Z_2026-10-14T000000Z.grib', 8947388,
                  'ddca4aeded193eae21b66a54f58b6ea15dcc7fa70f37dfb7eb69bc90d4aedde5'),
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('UNAPPROVED_REDIRECT')


def download_once(collection, destination, opener=None):
    url, size, header = TARGETS[collection]
    opener = opener or urllib.request.build_opener(NoRedirect)
    request = urllib.request.Request(url, headers={'Accept-Encoding': 'identity'})
    # No HEAD, catalog lookup, retry, fallback URL or alternate collection.
    with destination.open('xb') as output:
        with opener.open(request, timeout=45) as response:
            if (response.status != 200 or response.geturl() != url
                    or response.headers.get('Content-Length') != str(size)
                    or response.headers.get('Content-Encoding', 'identity') != 'identity'):
                raise ValueError('EXACT_RESPONSE_REQUIRED')
            count = 0
            prefix = bytearray()
            while True:
                chunk = response.read(min(65536, size + 1 - count))
                if not chunk:
                    break
                count += len(chunk)
                if count > size:
                    raise ValueError('EXACT_SIZE_REQUIRED')
                if len(prefix) < 68:
                    prefix.extend(chunk[:68-len(prefix)])
                output.write(chunk)
            if count != size or hashlib.sha256(prefix).hexdigest() != header:
                raise ValueError('EXACT_ORIGINAL_REQUIRED')
        output.flush()
        os.fsync(output.fileno())


def exact_keys(value, keys):
    if type(value) is not dict or set(value) != set(keys.split()):
        raise ValueError('REPORT_FIELDS_REJECTED')


def integer(value, maximum):
    if type(value) is not int or not 0 <= value <= maximum:
        raise ValueError('REPORT_COUNT_REJECTED')


def digest(value, length=64):
    if type(value) is not str or re.fullmatch('[a-f0-9]{'+str(length)+'}', value) is None:
        raise ValueError('REPORT_DIGEST_REJECTED')


def safe_report(value):
    exact_keys(value, 'scope nativeVersion centralAdminTargetsTested productionWritten valuesExposed coordinateCorrectionMade files')
    if (value['scope'] != 'EXACT_TWO_CURRENT_FILES_NATIVE_CONFORMANCE_NOT_SCORE_PROOF'
            or value['nativeVersion'] != '2.48.2'
            or any(value[key] is not False for key in ('centralAdminTargetsTested', 'productionWritten', 'valuesExposed', 'coordinateCorrectionMade'))
            or type(value['files']) is not list or len(value['files']) != 2):
        raise ValueError('REPORT_SCOPE_REJECTED')
    for item, collection in zip(value['files'], TARGETS):
        exact_keys(item, 'collection bytes contentSha256 messagesRead currentFields originalUnchanged completeUniqueVectorPairs unpairedOrRepeatedLayers')
        if (item['collection'] != collection or item['bytes'] != TARGETS[collection][1]
                or item['originalUnchanged'] is not True):
            raise ValueError('REPORT_ORIGINAL_REJECTED')
        digest(item['contentSha256'])
        for key in ('messagesRead', 'completeUniqueVectorPairs', 'unpairedOrRepeatedLayers'):
            integer(item[key], 128)
        fields = item['currentFields']
        if type(fields) is not list or not 2 <= len(fields) <= item['messagesRead']:
            raise ValueError('REPORT_CURRENT_FIELDS_REJECTED')
        for field in fields:
            exact_keys(field, 'component pointsChecked nativePointsOutsideDeclaredLatitudeBounds maximumLatitudeVsEndpointDegrees maximumLongitudeVsEndpointDegrees gridSectionDigest ni nj layerTimeIdentitySha256 referenceDate referenceTime validityDate validityTime candidateChecks candidateIndexMismatches candidateCoordinateMismatches candidateValueMismatches')
            if field['component'] not in ('current-u', 'current-v'):
                raise ValueError('REPORT_COMPONENT_REJECTED')
            digest(field['gridSectionDigest'], 32)
            digest(field['layerTimeIdentitySha256'])
            for key in ('pointsChecked', 'nativePointsOutsideDeclaredLatitudeBounds', 'ni', 'nj', 'candidateChecks', 'candidateIndexMismatches', 'candidateCoordinateMismatches', 'candidateValueMismatches'):
                integer(field[key], 400000)
            if (field['pointsChecked'] != field['ni'] * field['nj']
                    or field['referenceDate'] != 20261009 or field['referenceTime'] != 0
                    or field['validityDate'] != 20261014 or field['validityTime'] != 0):
                raise ValueError('REPORT_TIME_GRID_REJECTED')
            for key in ('maximumLatitudeVsEndpointDegrees', 'maximumLongitudeVsEndpointDegrees'):
                number = field[key]
                if type(number) not in (int, float) or not math.isfinite(number) or not 0 <= number <= 360:
                    raise ValueError('REPORT_DISTANCE_REJECTED')
        if {field['component'] for field in fields} != {'current-u', 'current-v'}:
            raise ValueError('REPORT_BOTH_COMPONENTS_REQUIRED')
    encoded = json.dumps(value, sort_keys=True, allow_nan=False)
    if len(encoded.encode()) > 65536:
        raise ValueError('REPORT_SIZE_REJECTED')
    return encoded


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--producer', type=Path, required=True)
    args = parser.parse_args()
    runner = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    scratch = runner / 'native-current-grid-private'
    # Exclusive create is an additional local no-repeat guard, not remote authority.
    scratch.mkdir(mode=0o700)
    report_path = runner / 'native-current-grid-safe.json'
    if report_path.exists():
        raise ValueError('REPORT_ALREADY_EXISTS')
    try:
        for collection in TARGETS:
            download_once(collection, scratch / (collection + '.grib'))
        script = Path(__file__).with_name('audit-native-current-grid.py').resolve()
        env = {key: os.environ[key] for key in ('PATH', 'HOME', 'LANG', 'SYSTEMROOT', 'SSL_CERT_FILE') if key in os.environ}
        env['PYTHONDONTWRITEBYTECODE'] = '1'
        with (scratch / 'stdout.private').open('xb') as out, (scratch / 'stderr.private').open('xb') as err:
            result = subprocess.run([sys.executable, '-B', str(script), '--producer', str(args.producer.resolve(strict=True)),
                                     '--lf', str(scratch / 'dkss_lf.grib'), '--nsbs', str(scratch / 'dkss_nsbs.grib')],
                                    cwd=scratch, env=env, stdout=out, stderr=err, timeout=180, check=False)
        if result.returncode != 0 or (scratch / 'stdout.private').stat().st_size > 65536:
            raise ValueError('NATIVE_DIAGNOSIS_INCOMPLETE')
        encoded = safe_report(json.loads((scratch / 'stdout.private').read_text(encoding='utf8')))
        with report_path.open('x', encoding='utf8') as report:
            report.write(encoded + '\n')
        print('NATIVE_CURRENT_GRID_SAFE_REPORT_READY')
    finally:
        # Only our exclusive exact child, never a production/cache directory.
        if scratch.parent != runner or scratch.is_symlink() or scratch.resolve() != runner / scratch.name:
            raise ValueError('PRIVATE_SCRATCH_CLEANUP_REJECTED')
        shutil.rmtree(scratch)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('NATIVE_CURRENT_GRID_AUDIT_NOT_COMPLETED', file=sys.stderr)
        sys.exit(1)
