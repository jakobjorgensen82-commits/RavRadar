"""Offline preparation tests only: no decoder, provider data, network or GitHub."""
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest
import sys
import io
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('audit-native-current-grid.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
wrapper_spec = importlib.util.spec_from_file_location('runner', Path(__file__).with_name('run-native-current-grid-audit.py'))
runner = importlib.util.module_from_spec(wrapper_spec)
wrapper_spec.loader.exec_module(runner)
NATIVE = '--native' in sys.argv
if NATIVE:
    sys.argv.remove('--native')


def coordinates(ni=4, nj=5, first_lat=10, last_lat=10.04, first_lon=20, last_lon=20.3):
    return ([first_lat + row * (last_lat-first_lat)/(nj-1) for row in range(nj) for col in range(ni)],
            [first_lon + col * (last_lon-first_lon)/(ni-1) for row in range(nj) for col in range(ni)])


class PreparationTests(unittest.TestCase):
    def test_longitude_wrap_is_coordinate_not_index_change(self):
        self.assertAlmostEqual(audit.longitude(355.875), -4.125)
        self.assertAlmostEqual(audit.longitude(-4.125), -4.125)
        self.assertAlmostEqual(audit.longitude(30.292), 30.292)

    def test_endpoint_grid_positive(self):
        lats, lons = coordinates()
        report = audit.check_coordinates(4, 5, 10, 10.04, 20, 20.3, 64, lats, lons)
        self.assertEqual(report['pointsChecked'], 20)
        self.assertEqual(report['maximumLatitudeVsEndpointDegrees'], 0)
        self.assertEqual(report['maximumLongitudeVsEndpointDegrees'], 0)
        self.assertEqual(report['nativePointsOutsideDeclaredLatitudeBounds'], 0)
        self.assertNotIn('values', report)

    def test_lf_dimension_shape_not_original_data(self):
        ni, nj = 810, 390
        lats, lons = coordinates(ni, nj, 0, .648, 1, 2)
        # Source-derived native behaviour, NOT execution of ecCodes.
        lats = [(.648 if row == nj-1 else row*.002) for row in range(nj) for col in range(ni)]
        report = audit.check_coordinates(ni, nj, 0, .648, 1, 2, 64, lats, lons)
        self.assertEqual(report['nativePointsOutsideDeclaredLatitudeBounds'], 64*ni)
        self.assertAlmostEqual(report['maximumLatitudeVsEndpointDegrees'], .1296658097686375)

    def test_unknown_orientation_counts_and_nonfinite_refused(self):
        lats, lons = coordinates()
        for scan in (0, 32, 96, 128, 192):
            with self.subTest(scan=scan), self.assertRaises(ValueError):
                audit.check_coordinates(4, 5, 10, 10.04, 20, 20.3, scan, lats, lons)
        for changed in (lats[:-1], [float('nan'), *lats[1:]], [float('inf'), *lats[1:]]):
            with self.assertRaises(ValueError):
                audit.check_coordinates(4, 5, 10, 10.04, 20, 20.3, 64, changed, lons)

    def test_exact_size_and_header_not_any_local_file(self):
        payload = bytes(range(68)) + b'synthetic, no provider values'
        with tempfile.TemporaryDirectory(prefix='rr-native-metadata-fixture-') as tmp:
            path = Path(tmp) / 'fixture.grib'
            with path.open('xb') as target:
                target.write(payload)
            with patch.dict(audit.FILES, {'synthetic': (len(payload), hashlib.sha256(payload[:68]).hexdigest())}):
                self.assertEqual(audit.fingerprint(path, 'synthetic'), hashlib.sha256(payload).hexdigest())
            with self.assertRaises(ValueError):
                audit.fingerprint(path, 'dkss_lf')
            with patch.dict(audit.FILES, {'synthetic': (len(payload), '0'*64)}), self.assertRaises(ValueError):
                audit.fingerprint(path, 'synthetic')
            self.assertEqual(path.read_bytes(), payload)

    def test_diagnostic_contains_no_original_mutator_or_download(self):
        import ast
        source = Path(audit.__file__).read_text(encoding='utf8')
        tree = ast.parse(source)
        calls = [node.func for node in ast.walk(tree) if isinstance(node, ast.Call)]
        names = {node.attr for node in calls if isinstance(node, ast.Attribute)}
        self.assertFalse(names & {'codes_set', 'codes_set_values', 'urlopen', 'urlretrieve',
                                 'write_bytes', 'write_text', 'unlink', 'remove', 'replace'})
        self.assertNotIn('import requests', source)
        self.assertNotIn('import subprocess', source)

    def test_download_is_exactly_once_no_redirect_or_retry(self):
        payload = bytes(range(68)) + b'artificial data, not a provider original'
        url = 'https://synthetic.invalid/one.grib'
        header = hashlib.sha256(payload[:68]).hexdigest()
        class Response(io.BytesIO):
            status = 200
            headers = {'Content-Length': str(len(payload))}
            def geturl(self):
                return url
        class Opener:
            calls = 0
            def open(self, request, timeout):
                self.calls += 1
                assert request.full_url == url
                return Response(payload)
        with tempfile.TemporaryDirectory(prefix='rr-native-download-test-') as tmp:
            path = Path(tmp) / 'one.grib'
            opener = Opener()
            with patch.dict(runner.TARGETS, {'synthetic': (url, len(payload), header)}):
                runner.download_once('synthetic', path, opener)
                self.assertEqual(path.read_bytes(), payload)
                with self.assertRaises(FileExistsError):
                    runner.download_once('synthetic', path, opener)
            self.assertEqual(opener.calls, 1)
            with self.assertRaises(ValueError):
                runner.NoRedirect().redirect_request(None, None, 302, None, None, 'https://other.invalid')

    def test_safe_report_rejects_unlisted_raw_field_and_invalid_counts(self):
        def field(component):
            return dict(component=component, pointsChecked=20, ni=4, nj=5,
                        nativePointsOutsideDeclaredLatitudeBounds=0,
                        maximumLatitudeVsEndpointDegrees=0., maximumLongitudeVsEndpointDegrees=0.,
                        gridSectionDigest='a'*32, layerTimeIdentitySha256='b'*64,
                        referenceDate=20261009, referenceTime=0, validityDate=20261014, validityTime=0,
                        candidateChecks=9, candidateIndexMismatches=0,
                        candidateCoordinateMismatches=0, candidateValueMismatches=0)
        report = dict(scope='EXACT_TWO_CURRENT_FILES_NATIVE_CONFORMANCE_NOT_SCORE_PROOF', nativeVersion='2.48.2',
                      centralAdminTargetsTested=False, productionWritten=False, valuesExposed=False,
                      coordinateCorrectionMade=False, files=[dict(collection=name, bytes=target[1],
                      contentSha256='c'*64, messagesRead=3, currentFields=[field('current-u'),field('current-v')],
                      originalUnchanged=True, completeUniqueVectorPairs=1, unpairedOrRepeatedLayers=0)
                      for name, target in runner.TARGETS.items()])
        import copy
        self.assertLess(len(runner.safe_report(report)), 65536)
        for key, value in [('rawValues', [123]), ('candidateChecks', 'secret'),
                           ('candidateChecks', -1), ('maximumLatitudeVsEndpointDegrees', float('nan')),
                           ('gridSectionDigest', 'private-string')]:
            changed = copy.deepcopy(report)
            changed['files'][0]['currentFields'][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                runner.safe_report(changed)

    def test_workflow_has_no_secret_or_production_mutator_and_one_shot(self):
        workflow = Path(__file__).resolve().parent.parent / '.github/workflows/audit-native-current-grid.yml'
        text = workflow.read_text(encoding='utf8')
        self.assertNotIn('secrets.', text)
        for blocked in ('contents: write', 'actions: write', 'pages: write', 'id-token: write',
                        'actions/cache', 'npm run build', 'workflow run', 'rerun', 'update-and-deploy.yml'):
            self.assertNotIn(blocked, text)
        self.assertIn('test "$GITHUB_RUN_ATTEMPT" = 1', text)
        self.assertIn('group: ravradar-weather-production-v2', text)
        self.assertIn('event=workflow_dispatch&per_page=100', text)
        self.assertIn('test "$(wc -l < "$RUNNER_TEMP/native-grid-run-ids.txt")" = 1', text)
        self.assertLess(text.index('Verify diagnosis with artificial native GRIB'), text.index('Read exactly two originals once'))


if NATIVE:
    class NativeTests(unittest.TestCase):
        def test_actual_normal_candidates_against_native_index_array(self):
            import eccodes
            self.assertEqual(eccodes.codes_get_api_version(), '2.48.2')
            producer_path = Path(__file__).with_name('update-dmi-bulk.py')
            spec = importlib.util.spec_from_file_location('original_producer', producer_path)
            producer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(producer)
            gid = eccodes.codes_grib_new_from_samples('regular_ll_sfc_grib1')
            try:
                for key, value in [('Ni', 8), ('Nj', 8), ('latitudeOfFirstGridPointInDegrees', 56),
                                   ('latitudeOfLastGridPointInDegrees', 56.07),
                                   ('longitudeOfFirstGridPointInDegrees', 10),
                                   ('longitudeOfLastGridPointInDegrees', 10.07),
                                   ('iDirectionIncrementInDegrees', .01), ('jDirectionIncrementInDegrees', .01),
                                   ('scanningMode', 64), ('dataDate', 20261009), ('dataTime', 0), ('stepRange', '120')]:
                    eccodes.codes_set(gid, key, value)
                eccodes.codes_set_values(gid, [.2 + index / 1000 for index in range(64)])
                for parameter, component in [(49, 'current-u'), (50, 'current-v')]:
                    eccodes.codes_set(gid, 'indicatorOfParameter', parameter)
                    self.assertEqual(producer.classify_parameter(gid, 'dkss_lf'), component)
                    report = audit.field_report(gid, 'dkss_lf', eccodes, producer)
                    self.assertGreater(report['candidateChecks'], 0)
                    for name in ('candidateIndexMismatches', 'candidateCoordinateMismatches', 'candidateValueMismatches'):
                        self.assertEqual(report[name], 0)
                    self.assertLess(report['maximumLatitudeVsEndpointDegrees'], 1e-10)
                    self.assertLess(report['maximumLongitudeVsEndpointDegrees'], 1e-10)
            finally:
                eccodes.codes_release(gid)


if __name__ == '__main__':
    unittest.main()
