"""Pure normal ledger fixture; synthetic inputs, no native/decoder/PG claim."""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('existing_transactional_test', ROOT / 'scripts/test-dmi-transactional-checkpoint.py')
normal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(normal)  # Reuse its existing unused ecCodes import adapter.
producer = normal.producer


def fixture():
    reference = datetime(2026, 1, 1, tzinfo=timezone.utc)
    stamp = producer.canonical_time
    targets = [{'partId': 'TEST', 'parentZoneId': 'ZONE-TEST', 'waterPoint': [2.0, 1.0]}]
    zone = {'id': 'PART::TEST', 'parentZoneId': 'ZONE-TEST', 'coastalPart': True,
            'coastType': 'north-sea', 'lon': 2.0, 'lat': 1.0}
    signature = producer.current_marine_processing_signature('test-registry')
    document = {'zoneRegistrySignature': 'test-registry', 'runs': {},
                'zones': {'PART::TEST': {**producer.sampling_identity(zone), 'hourly': {}}},
                'diagnostics': {}}
    catalogs = {}
    def asset(collection, at):
        return {'collection': collection, 'modelRun': stamp(reference), 'validTime': at,
                'itemId': 'synthetic-' + collection + '-' + at,
                'assetIdentitySha256': producer.asset_identity_sha256('https://synthetic.invalid/' + collection + '/' + at),
                'assetSizeBytes': 1024, 'itemCreatedAt': stamp(reference), 'itemUpdatedAt': stamp(reference)}
    times = producer.operational_current_valid_times(reference)
    for collection in sorted(producer.MARINE_COLLECTIONS):
        assets = [asset(collection, at) for at in times] if collection == 'dkss_nsbs' else []
        catalogs[collection] = (stamp(reference), assets, {
            'catalogInventoryComplete': True, 'requiredHorizonEndCovered': bool(assets),
            'documentedRequiredGapsAllowed': True, 'selectedNativeRunComplete': True,
            'requiredWindowInventoryComplete': True, 'requiredRowsTruncatedByAssetLimit': 0,
            'officialRequiredValidTimeCount': len(assets),
            'officialRequiredValidTimes': times if assets else [], 'officialRequiredAssets': assets,
            'nativeTerminalAsset': asset(collection, stamp(reference + timedelta(hours=120))),
        })
        if not assets:
            continue
        steps = {}
        for official in assets:
            at = official['validTime']
            capture = {**official, 'acquiredAt': stamp(reference), 'contentLengthBytes': 1024,
                       'contentSha256': 'd' * 64}
            source = producer.native_component_source(collection, stamp(reference), at,
                component='current', zone=zone,
                grid_candidate={'gridDefinitionSha256': 'a' * 64, 'longitude': 2.0,
                                'latitude': 1.0, 'distanceKm': 0.0, 'value': .1},
                capture=capture, spatial_selection='nearest-shared-grid-cell-no-spatial-interpolation',
                verticalLayer='depthBelowSea:1', verticalLayerRankM=1.0,
                vectorSelection=producer.CURRENT_VECTOR_SELECTION, vectorSemanticsVersion=3)
            assert source is not None
            document['zones']['PART::TEST']['hourly'][at] = {'time': at, 'current-u': .1,
                'current-v': -.2, 'sources': {'current': source}}
            steps[at] = {'complete': True, 'recognizedParameters': ['current-u', 'current-v'],
                'zonesTouched': 1, 'parserVersion': producer.PARSER_VERSION,
                'processingSignature': signature, 'sourceAsset': capture,
                'currentPartOutcomeProof': producer.build_current_part_outcome_proof([], ['TEST'],
                    producer.target_fingerprint(targets), signature, capture)}
        document['runs'][collection] = {'referenceTime': stamp(reference),
            'parserVersion': producer.PARSER_VERSION, 'parameterMapVersion': producer.PARAMETER_MAP_VERSION,
            'gridLookupVersion': producer.GRID_LOOKUP_VERSION, 'processingSignature': signature,
            'processedSteps': steps}
    return producer, document, targets, reference, catalogs


import unittest


class ProviderCatalogRunHeaderTests(unittest.TestCase):
    def test_normal_catalog_metadata_preserves_decoded_steps_and_seals_full_axis(self):
        provider_spec = importlib.util.spec_from_file_location('current_provider_fixture',
            ROOT / 'scripts/fixtures/source19-current-native-providers.py')
        provider = importlib.util.module_from_spec(provider_spec)
        provider_spec.loader.exec_module(provider)
        _, document, targets, reference, catalogs = fixture()
        decoded = document['runs']['dkss_nsbs']
        decoded_before = copy.deepcopy(decoded)
        original_rows = copy.deepcopy(document['zones'])
        # The exact old fixture state reproduces the normal sealer's refusal.
        old = producer.build_current_operational_ledger_result(document, targets, reference, catalogs)
        self.assertFalse(old.validated)
        self.assertEqual(old.attestation['verifiedPairCount'], 118)
        with self.assertRaisesRegex(ValueError, 'processing signature is invalid'):
            producer.validate_current_operational_ledger(old.ledger, old.attestation, targets,
                reference, reference + timedelta(hours=117), producer.target_fingerprint(targets))
        with self.assertRaisesRegex(ValueError, 'ledger validation failed'):
            producer.seal_current_operational_checkpoint(document, targets, reference, catalogs)
        provider.bind_catalog_run_headers(producer, document, catalogs)
        self.assertIs(document['runs']['dkss_nsbs'], decoded)
        self.assertEqual(decoded, decoded_before)
        self.assertEqual(document['zones'], original_rows)
        self.assertEqual(set(document['runs']), producer.MARINE_COLLECTIONS)
        for collection in producer.MARINE_COLLECTIONS - {'dkss_nsbs'}:
            self.assertEqual(document['runs'][collection]['referenceTime'], catalogs[collection][0])
            self.assertEqual(document['runs'][collection]['processedSteps'], {})
        producer.seal_current_operational_checkpoint(document, targets, reference, catalogs)
        ledger = document['diagnostics']['currentOperationalLedger']
        self.assertTrue(ledger['ready'])
        self.assertTrue(producer.current_operational_cache_ready(document, targets, reference),
            'the actual next provider-fixture readiness call must admit the sealed inputs')
        self.assertEqual(ledger['hourCount'], 118)
        self.assertEqual(ledger['attestation']['verifiedPairCount'], 118)
        self.assertEqual(ledger['operationalComplementPairCount'], 0)
        for row in ledger['collections']:
            self.assertEqual(len(row['validTimes']), 118)
            if row['collection'] != 'dkss_nsbs':
                self.assertEqual(row['officialValidTimeCount'], 0)
                self.assertTrue(all(value['state'] == 'UPSTREAM_ABSENT' for value in row['validTimes']))
        # Header initialization must not repair unknown or corrupted existing data.
        bad = copy.deepcopy(document)
        absent = sorted(producer.MARINE_COLLECTIONS - {'dkss_nsbs'})[0]
        bad['runs'][absent]['processingSignature'] = None
        provider.bind_catalog_run_headers(producer, bad, catalogs)
        checkpoint_before = copy.deepcopy(bad['diagnostics'])
        with self.assertRaisesRegex(ValueError, 'ledger validation failed'):
            producer.seal_current_operational_checkpoint(bad, targets, reference, catalogs)
        self.assertEqual(bad['diagnostics'], checkpoint_before)
        broken_catalogs = copy.deepcopy(catalogs)
        broken_catalogs[absent][2].pop('nativeTerminalAsset')
        checkpoint_before = copy.deepcopy(document['diagnostics'])
        with self.assertRaisesRegex(ValueError, 'ledger validation failed'):
            producer.seal_current_operational_checkpoint(document, targets, reference, broken_catalogs)
        self.assertEqual(document['diagnostics'], checkpoint_before)
        self.assertEqual(document['zones'], original_rows)


if __name__ == '__main__':
    unittest.main()
