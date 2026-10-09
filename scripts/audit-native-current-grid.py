"""Prepared bounded native diagnosis; no downloader, mutation or production writes.

The owner approved this exact two-file, one-shot GitHub diagnosis on 2026-10-09.
Only the already identified 00Z/14Oct00Z LF and NSBS files are accepted.
Native coordinate/index consistency is not physical ocean validity or score proof.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import sys
import time

FILES = {
    'dkss_lf': (5653412, '53e6938d72f866e38de810798e26b46ab966d5f7cdd947bab333526e684631f6'),
    'dkss_nsbs': (8947388, 'ddca4aeded193eae21b66a54f58b6ea15dcc7fa70f37dfb7eb69bc90d4aedde5'),
}
# A forecast file is a container, not a promise of at most 128 fields.
# Keep a finite scan guard alongside exact bytes, 120s analysis and 64KiB output.
MAX_MESSAGES = 4096
MAX_POINTS = 400000
SAFE_FAILURE_CODES = frozenset(('EXACT_INPUT_REQUIRED', 'EXACT_HEADER_REQUIRED', 'UNSUPPORTED_GRID',
    'NONFINITE_NATIVE_COORDINATE', 'UNSUPPORTED_CURRENT_GRID', 'GRID_SIZE_BOUND',
    'NATIVE_VALUE_COUNT_MISMATCH', 'DIAGNOSIS_TIME_BOUND', 'DIAGNOSIS_MESSAGE_BOUND',
    'BOTH_CURRENT_COMPONENTS_REQUIRED', 'INPUT_CHANGED', 'REPORT_SIZE_BOUND',
    'IMPORT_FAILURE', 'IO_FAILURE', 'UNEXPECTED_CURRENT_TIME', 'UNCLASSIFIED'))


def safe_failure_code(error):
    if type(error) is ValueError and str(error) in SAFE_FAILURE_CODES:
        return str(error)
    if isinstance(error, ImportError):
        return 'IMPORT_FAILURE'
    if isinstance(error, OSError):
        return 'IO_FAILURE'
    return 'UNCLASSIFIED'


class NativeAuditFailure(Exception):
    def __init__(self, collection, error):
        self.phase = collection.upper() if collection in FILES else 'SETUP'
        self.code = safe_failure_code(error)
        super().__init__(f'{self.phase}:{self.code}')


def fingerprint(path, collection):
    expected_size, expected_header = FILES[collection]
    if path.is_symlink() or not path.is_file() or path.stat().st_size != expected_size:
        raise ValueError('EXACT_INPUT_REQUIRED')
    digest = hashlib.sha256()
    with path.open('rb') as source:
        first = source.read(68)
        if hashlib.sha256(first).hexdigest() != expected_header:
            raise ValueError('EXACT_HEADER_REQUIRED')
        digest.update(first)
        for block in iter(lambda: source.read(65536), b''):
            digest.update(block)
    return digest.hexdigest()


def longitude(value):
    return (float(value) + 180) % 360 - 180


def check_coordinates(ni, nj, first_lat, last_lat, first_lon, last_lon, scan, lats, lons):
    # Both authorized headers have this unambiguous row-major ascending scan.
    # Unsupported scan/rotated/global grids must not inherit this formula.
    if (scan != 64 or not 2 <= ni <= MAX_POINTS or not 2 <= nj <= MAX_POINTS
            or ni * nj > MAX_POINTS or len(lats) != ni * nj or len(lons) != ni * nj
            or not -90 <= first_lat < last_lat <= 90
            or not -180 <= first_lon < last_lon <= 180):
        raise ValueError('UNSUPPORTED_GRID')
    outside = 0
    max_lat = max_lon = 0.0
    for index, (latitude, longitude) in enumerate(zip(lats, lons)):
        if not math.isfinite(latitude) or not math.isfinite(longitude):
            raise ValueError('NONFINITE_NATIVE_COORDINATE')
        row, column = divmod(index, ni)
        endpoint_lat = first_lat + row * (last_lat - first_lat) / (nj - 1)
        endpoint_lon = first_lon + column * (last_lon - first_lon) / (ni - 1)
        max_lat = max(max_lat, abs(float(latitude) - endpoint_lat))
        max_lon = max(max_lon, abs(float(longitude) - endpoint_lon))
        outside += not first_lat - 1e-9 <= latitude <= last_lat + 1e-9
    return {
        'pointsChecked': ni * nj,
        'nativePointsOutsideDeclaredLatitudeBounds': outside,
        'maximumLatitudeVsEndpointDegrees': max_lat,
        'maximumLongitudeVsEndpointDegrees': max_lon,
    }


def valid_coordinate_differences(values, lats, ni, nj, first_lat, last_lat, valid_value, missing):
    valid = outside = 0
    maximum = 0.0
    for index, value in enumerate(values):
        if valid_value(value, missing) is None:
            continue
        valid += 1
        latitude = float(lats[index])
        outside += not first_lat - 1e-9 <= latitude <= last_lat + 1e-9
        endpoint = first_lat + (index // ni) * (last_lat - first_lat) / (nj - 1)
        maximum = max(maximum, abs(latitude - endpoint))
    return dict(nativeValidPoints=valid, validPointsOutsideDeclaredLatitudeBounds=outside,
                maximumValidLatitudeVsEndpointDegrees=maximum)


def field_report(gid, collection, native, producer):
    get = lambda key: native.codes_get(gid, key)
    if get('edition') != 1 or get('gridType') != 'regular_ll':
        raise ValueError('UNSUPPORTED_CURRENT_GRID')
    ni, nj = int(get('Ni')), int(get('Nj'))
    if not 2 <= ni * nj <= MAX_POINTS:
        raise ValueError('GRID_SIZE_BOUND')
    first_lat, last_lat = (float(get(key)) for key in (
        'latitudeOfFirstGridPointInDegrees', 'latitudeOfLastGridPointInDegrees'))
    first_lon, last_lon = (longitude(get(key)) for key in (
        'longitudeOfFirstGridPointInDegrees', 'longitudeOfLastGridPointInDegrees'))
    lats = native.codes_get_array(gid, 'latitudes')
    lons = [longitude(value) for value in native.codes_get_array(gid, 'longitudes')]
    report = check_coordinates(ni, nj, first_lat, last_lat, first_lon, last_lon,
                               int(get('scanningMode')), lats, lons)
    # Artificial probes, not central admin targets or a national production run.
    probes = [dict(id=f'AUDIT::{r}::{c}', coastType='limfjord' if collection == 'dkss_lf' else 'east',
                   lat=first_lat + r * (last_lat-first_lat), lon=first_lon + c * (last_lon-first_lon))
              for r in (0.2, 0.5, 0.8) for c in (0.2, 0.5, 0.8)]
    candidates = producer.valid_candidates_batch(gid, collection, probes)
    values = native.codes_get_array(gid, 'values')
    if len(values) != ni * nj:
        raise ValueError('NATIVE_VALUE_COUNT_MISMATCH')
    report.update(valid_coordinate_differences(values, lats, ni, nj, first_lat, last_lat,
                                               producer.valid_value, get('missingValue')))
    checked = bad_index = bad_coordinate = bad_value = 0
    shifted = 0
    candidate_maximum = 0.0
    for rows in candidates.values():
        for candidate in rows:
            checked += 1
            index = candidate['index']
            if type(index) is not int or not 0 <= index < len(values):
                bad_index += 1
                continue
            bad_coordinate += (abs(candidate['latitude'] - float(lats[index])) > 1e-9
                               or abs(longitude(candidate['longitude']) - float(lons[index])) > 1e-9)
            bad_value += candidate['value'] != float(values[index])
            endpoint = first_lat + (index // ni) * (last_lat - first_lat) / (nj - 1)
            difference = abs(float(lats[index]) - endpoint)
            shifted += difference > 1e-9
            candidate_maximum = max(candidate_maximum, difference)
    identity = [get(key) for key in ('dataDate', 'dataTime', 'validityDate', 'validityTime', 'typeOfLevel', 'level')]
    report.update(gridSectionDigest=str(get('md5GridSection')), ni=ni, nj=nj,
                  layerTimeIdentitySha256=hashlib.sha256(json.dumps(identity).encode()).hexdigest(),
                  referenceDate=int(get('dataDate')), referenceTime=int(get('dataTime')),
                  validityDate=int(get('validityDate')), validityTime=int(get('validityTime')),
                  candidateChecks=checked, candidateIndexMismatches=bad_index,
                  candidatesWithLatitudeDifference=shifted,
                  maximumCandidateLatitudeVsEndpointDegrees=candidate_maximum,
                  candidateCoordinateMismatches=bad_coordinate, candidateValueMismatches=bad_value)
    return report


def summarize_current_fields(fields):
    """All field occurrences, never a sampled/truncated list or unique-cell count.

    Two fixed component summaries bound output independently of layer count.
    Every mismatch contributes, including one in the very last field. Grid/time
    identities still govern exact vector pairing separately in audit_file.
    """
    count_fields = {
        'pointChecks': 'pointsChecked',
        'nativeChecksOutsideDeclaredLatitudeBounds': 'nativePointsOutsideDeclaredLatitudeBounds',
        'validPointChecks': 'nativeValidPoints',
        'validChecksOutsideDeclaredLatitudeBounds': 'validPointsOutsideDeclaredLatitudeBounds',
        'candidateChecks': 'candidateChecks',
        'candidateIndexMismatches': 'candidateIndexMismatches',
        'candidateCoordinateMismatches': 'candidateCoordinateMismatches',
        'candidateValueMismatches': 'candidateValueMismatches',
        'candidatesWithLatitudeDifference': 'candidatesWithLatitudeDifference',
    }
    maximum_fields = ('maximumLatitudeVsEndpointDegrees', 'maximumLongitudeVsEndpointDegrees',
                      'maximumValidLatitudeVsEndpointDegrees', 'maximumCandidateLatitudeVsEndpointDegrees')
    time_keys = ('referenceDate', 'referenceTime', 'validityDate', 'validityTime')
    if any(tuple(field[key] for key in time_keys) != (20261009, 0, 20261014, 0) for field in fields):
        raise ValueError('UNEXPECTED_CURRENT_TIME')
    result = []
    for component in ('current-u', 'current-v'):
        rows = [field for field in fields if field['component'] == component]
        if not rows:
            raise ValueError('BOTH_CURRENT_COMPONENTS_REQUIRED')
        summary = dict(component=component, fieldCount=len(rows),
                       uniqueGridCount=len({row['gridSectionDigest'] for row in rows}),
                       uniqueLayerTimeCount=len({row['layerTimeIdentitySha256'] for row in rows}),
                       minimumPointsPerField=min(row['pointsChecked'] for row in rows),
                       maximumPointsPerField=max(row['pointsChecked'] for row in rows),
                       **{key: rows[0][key] for key in time_keys})
        summary.update({key: sum(row[source] for row in rows) for key, source in count_fields.items()})
        summary.update({key: max(row[key] for row in rows) for key in maximum_fields})
        result.append(summary)
    return result


def audit_file(path, collection, native, producer, deadline):
    before = fingerprint(path, collection)
    producer.GRID_INDEX_CACHE.clear()
    fields = []
    messages = 0
    with path.open('rb') as source:
        while True:
            if time.monotonic() >= deadline:
                raise ValueError('DIAGNOSIS_TIME_BOUND')
            gid = native.codes_grib_new_from_file(source)
            if gid is None:
                break
            try:
                messages += 1
                if messages > MAX_MESSAGES:
                    raise ValueError('DIAGNOSIS_MESSAGE_BOUND')
                component = producer.classify_parameter(gid, collection)
                if component in ('current-u', 'current-v'):
                    fields.append({'component': component, **field_report(gid, collection, native, producer)})
            finally:
                native.codes_release(gid)
    if not fields or {f['component'] for f in fields} != {'current-u', 'current-v'}:
        raise ValueError('BOTH_CURRENT_COMPONENTS_REQUIRED')
    if fingerprint(path, collection) != before:
        raise ValueError('INPUT_CHANGED')
    pairs = {}
    for field in fields:
        key = (field['gridSectionDigest'], field['layerTimeIdentitySha256'])
        pairs.setdefault(key, []).append(field['component'])
    return dict(collection=collection, bytes=FILES[collection][0], contentSha256=before,
                completeUniqueVectorPairs=sum(sorted(parts) == ['current-u', 'current-v'] for parts in pairs.values()),
                unpairedOrRepeatedLayers=sum(sorted(parts) != ['current-u', 'current-v'] for parts in pairs.values()),
                messagesRead=messages, currentFieldCount=len(fields),
                currentComponents=summarize_current_fields(fields), originalUnchanged=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--producer', type=Path, required=True)
    parser.add_argument('--lf', type=Path, required=True)
    parser.add_argument('--nsbs', type=Path, required=True)
    args = parser.parse_args()
    # Lazy imports: preparing/unit-testing this file never creates a decoder substitute.
    import eccodes
    sys.path.insert(0, str(args.producer.resolve().parent))
    spec = importlib.util.spec_from_file_location('rr_native_grid_producer', args.producer)
    producer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(producer)
    deadline = time.monotonic() + 120
    files = []
    for collection, file in [('dkss_lf', args.lf), ('dkss_nsbs', args.nsbs)]:
        try:
            files.append(audit_file(file, collection, eccodes, producer, deadline))
        except Exception as error:
            raise NativeAuditFailure(collection, error) from None
    report = dict(scope='EXACT_TWO_CURRENT_FILES_NATIVE_CONFORMANCE_NOT_SCORE_PROOF',
                  nativeVersion=eccodes.codes_get_api_version(), centralAdminTargetsTested=False,
                  productionWritten=False, valuesExposed=False, coordinateCorrectionMade=False,
                  files=files)
    encoded = json.dumps(report, sort_keys=True)
    if len(encoded.encode()) > 65536:
        raise ValueError('REPORT_SIZE_BOUND')
    print(encoded)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Never print library exceptions which could include original data/paths.
        failure = error if isinstance(error, NativeAuditFailure) else NativeAuditFailure(None, error)
        print(f'NATIVE_GRID_DIAGNOSIS_NOT_COMPLETED:{failure}', file=sys.stderr)
        sys.exit(1)
