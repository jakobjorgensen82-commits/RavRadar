"""Synthetic producer integration: component proofs, upgrades and bounded turns.

No provider calls, live fixtures or broad validation. Real producer functions
are used; only ecCodes/file transport is replaced with in-memory messages.
"""
from __future__ import annotations

import copy
import importlib.util
import io
import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
eccodes = types.ModuleType("eccodes")
eccodes.OutOfAreaError = type("OutOfAreaError", (Exception,), {})
for name in ("codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest", "codes_grib_new_from_file", "codes_release"):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
spec = importlib.util.spec_from_file_location("native_chain_continuity", ROOT / "scripts/update-dmi-bulk.py")
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)

RUN = "2026-09-19T00:00:00Z"
OLD_RUN = "2026-09-18T18:00:00Z"
VALID = "2026-09-19T03:00:00Z"
ZONE = {"id": "PART::TEST", "parentZoneId": "ZONE", "coastalPart": True, "coastType": "east", "lon": 2.0, "lat": 1.0}
POINT = {"gridDefinitionSha256": "a" * 64, "longitude": 2.0, "latitude": 1.0, "distanceKm": 0.0, "index": 1}
CAPTURE = {"itemId": "synthetic-item", "assetIdentitySha256": "b" * 64, "assetSizeBytes": 128, "acquiredAt": RUN, "contentLengthBytes": 128, "contentSha256": "c" * 64}
PEAK = {"shortName": "pp1d", "paramId": 231, "indicatorOfParameter": 231}


def source(component, model_run=RUN, valid_time=VALID):
    collection = {"wave": "wam_dw", "wind": "harmonie_dini_sf"}.get(component, "dkss_idw")
    extra = {}
    if component == "current":
        extra = {"verticalLayer": "depthbelowsea:1", "verticalLayerRankM": 1.0, "vectorSelection": producer.CURRENT_VECTOR_SELECTION, "vectorSemanticsVersion": producer.CURRENT_VECTOR_SEMANTICS_VERSION}
    elif component in {"wind", "windTail"}:
        extra = {"vectorSelection": "nearest-shared-grid-cell-no-spatial-interpolation", "vectorSemanticsVersion": producer.WIND_VECTOR_VERSION if component == "wind" else 1}
        if component == "wind":
            extra.update(vectorReference="earth-relative-east-north", vectorTransform="identity-earth-relative")
    elif component == "wave":
        extra = {"wavePeriodSemantics": "peak", "wavePeriodField": PEAK, "optional_field_set": ["mean-wave-dir"]}
    return producer.native_component_source(collection, model_run, valid_time, component=component, zone=ZONE, grid_candidate=POINT, capture=CAPTURE, spatial_selection=producer.COMPONENT_SPATIAL_SELECTION[component], **extra)


def document(component, proof, values):
    return {"zones": {ZONE["id"]: {**producer.sampling_identity(ZONE), "hourly": {VALID: {"time": VALID, **dict(zip(producer.COMPONENT_FIELD_SET[component], values)), **({"mean-wave-dir": 90.0} if component == "wave" else {}), "sources": {component: proof}, "unrelated": "keep"}}, "gridPoints": {}, "collections": {}}}}


def retained(proof):
    targets = [{"partId": "TEST", "parentZoneId": "ZONE", "waterPoint": [2.0, 1.0]}]
    fingerprint = producer.target_fingerprint(targets)
    signature = producer.current_marine_processing_signature("synthetic-registry")
    outcome = producer.build_current_part_outcome_proof([], ["TEST"], fingerprint, signature, proof)
    return producer.build_retained_current_asset_proof(proof, signature, outcome, ["TEST"], ["TEST"], fingerprint)


def utc_hour(offset):
    return producer.canonical_time(datetime.fromisoformat(RUN.replace("Z", "+00:00")) + timedelta(hours=offset))


def catalog_item(collection, offset):
    return {
        "type": "Feature", "collection": collection,
        "id": f"{collection}-synthetic-{offset}",
        "assets": {"data": {"href": f"https://example.invalid/{collection}/{offset}.grib", "type": "application/x-grib", "roles": ["data"]}},
        "properties": {"created": RUN, "modelRun": RUN, "datetime": utc_hour(offset)},
    }


class ComponentContinuityTests(unittest.TestCase):
    def test_newer_component_replaces_old_atomically_not_other_components(self):
        for component, values in (("current", (0.1, 0.2)), ("wind", (2.0, 3.0)), ("waterLevel", (0.5,)), ("waterTemperature", (12.0,)), ("wave", (0.5, 7.0))):
            with self.subTest(component=component):
                old, new = source(component, OLD_RUN), source(component)
                primary, donor = document(component, old, values), document(component, new, tuple(value + 1 for value in values))
                producer.backfill_compatible_cache_data(primary, donor, [retained(new)] if component == "current" else [], [retained(old)] if component == "current" else [])
                row = primary["zones"][ZONE["id"]]["hourly"][VALID]
                self.assertEqual(row["sources"][component], new)
                self.assertEqual(tuple(row[field] for field in producer.COMPONENT_FIELD_SET[component]), tuple(value + 1 for value in values))
                self.assertEqual(row["unrelated"], "keep")

    def test_null_or_half_vector_cannot_replace_valid_primary(self):
        old, new = source("wind", OLD_RUN), source("wind")
        primary, donor = document("wind", old, (2.0, 3.0)), document("wind", new, (4.0, None))
        before = copy.deepcopy(primary)
        producer.backfill_compatible_cache_data(primary, donor)
        self.assertEqual(primary["zones"][ZONE["id"]]["hourly"], before["zones"][ZONE["id"]]["hourly"])

    def test_newer_positive_wave_without_direction_or_period_cannot_replace_valid_tuple(self):
        for mutation in ({"mean-wave-dir": None}, {"dominant-wave-period": 0.0}):
            with self.subTest(mutation=mutation):
                primary = document("wave", source("wave", OLD_RUN), (1.0, 7.0))
                donor = document("wave", source("wave"), (1.1, 8.0))
                donor["zones"][ZONE["id"]]["hourly"][VALID].update(mutation)
                before = copy.deepcopy(primary)
                producer.backfill_compatible_cache_data(primary, donor)
                self.assertEqual(primary["zones"][ZONE["id"]]["hourly"], before["zones"][ZONE["id"]]["hourly"])

    def test_acquired_at_or_hash_is_not_revision_order(self):
        existing = source("wind")
        candidate = {**existing, "acquiredAt": VALID, "contentSha256": "d" * 64}
        self.assertFalse(producer.prefer_qualified_cached_component_source(existing, candidate, "wind"))
        existing["itemUpdatedAt"] = "2026-09-19T00:30:00Z"
        candidate["itemUpdatedAt"] = "2026-09-19T01:30:00Z"
        self.assertTrue(producer.prefer_qualified_cached_component_source(existing, candidate, "wind"))
        self.assertFalse(producer.prefer_qualified_cached_component_source(candidate, existing, "wind"))

    def test_current_geometry_and_layer_precede_recency(self):
        existing = source("current", OLD_RUN)
        farther = {**source("current"), "gridPoint": [2.01, 1.01], "distanceKm": 1.5}
        self.assertFalse(producer.prefer_qualified_cached_component_source(existing, farther, "current"))
        shallower = {**source("current"), "verticalLayerRankM": 0.0, "verticalLayer": "surface:0"}
        self.assertFalse(producer.prefer_qualified_cached_component_source(existing, shallower, "current"))
        other_grid = {**source("waterLevel"), "gridPoint": [2.01, 1.01]}
        self.assertFalse(producer.prefer_qualified_cached_component_source(source("waterLevel", OLD_RUN), other_grid, "waterLevel"))


class WaveSemanticsTests(unittest.TestCase):
    def test_actual_message_peak_wins_in_either_file_order(self):
        messages = {
            1: {"shortName": "swh", "name": "Significant wave height", "paramId": 229, "value": 1.0},
            2: {**PEAK, "name": "Peak wave period", "value": 8.0},
            3: {"shortName": "mwp", "name": "Mean wave period", "paramId": 232, "value": 4.0},
            4: {"shortName": "mwd", "name": "Mean wave direction", "paramId": 230, "value": 90.0},
        }
        for order in ((1, 2, 3, 4), (1, 3, 2, 4)):
            with self.subTest(order=order):
                handles = iter((*order, None))
                output = {"zones": {ZONE["id"]: {**producer.sampling_identity(ZONE), "hourly": {}, "collections": {}, "gridPoints": {}}}}
                with patch.object(Path, "open", lambda *args, **kwargs: io.BytesIO(b"synthetic")), patch.object(producer, "codes_grib_new_from_file", lambda _: next(handles)), patch.object(producer, "field_signature", lambda gid: messages[gid]), patch.object(producer, "valid_candidates_batch", lambda gid, collection, zones: {zone["id"]: [{**POINT, "value": messages[gid]["value"]}] for zone in zones}), patch.object(producer, "raw_cache_source_capture", lambda *args: CAPTURE), patch.object(producer, "should_stop_work", lambda: False):
                    producer.process_grib(Path("synthetic.grib"), "wam_dw", RUN, VALID, [ZONE], output, {})
                row = output["zones"][ZONE["id"]]["hourly"][VALID]
                self.assertEqual(row["dominant-wave-period"], 8.0)
                self.assertEqual(row["sources"]["wave"]["wavePeriodField"], PEAK)
                self.assertTrue(producer.complete_native_source_for_hour(row["sources"]["wave"], "wave", ZONE["id"], output["zones"][ZONE["id"]], VALID))

    def test_old_ambiguous_wave_is_not_relabelled_but_other_components_survive(self):
        legacy = source("wave")
        legacy.pop("wavePeriodSemantics")
        legacy.pop("wavePeriodField")
        cache = document("wave", legacy, (1.0, 4.0))
        point = cache["zones"][ZONE["id"]]
        row = point["hourly"][VALID]
        row.update({"sea-mean-deviation": 0.5})
        row["sources"]["waterLevel"] = source("waterLevel")
        producer.sanitize_component_provenance(ZONE["id"], point)
        self.assertNotIn("dominant-wave-period", row)
        self.assertEqual(row["sea-mean-deviation"], 0.5)
        for invalid in ({**PEAK, "paramId": 232}, {**PEAK, "shortName": "mwp"}, {**PEAK, "paramId": True}):
            self.assertFalse(producer.peak_wave_period_field(invalid))


class SchedulingContinuityTests(unittest.TestCase):
    def test_h0_catalog_then_real_horizon_query_selects_future_native_assets(self):
        collection = "harmonie_dini_sf"
        reference = datetime.fromisoformat(RUN.replace("Z", "+00:00"))
        requests = []
        def request(_url, params):
            start, end = params["datetime"].split("/")
            requests.append((start, end))
            return {"type": "FeatureCollection", "features": [
                catalog_item(collection, offset) for offset in range(61)
                if producer.epoch(start) <= producer.epoch(utc_hour(offset)) <= producer.epoch(end)
            ]}
        with patch.object(producer, "request_json", side_effect=request), patch.object(producer.time, "time", return_value=reference.timestamp()):
            turns = producer.operational_collection_turns(
                [collection, "dkss_idw", "wam_dw"],
                {"criticalAtmosphereCollections": [collection]}, {}, primary_mode=True,
            )
            results = [
                (turn, producer.list_atmosphere_turn_assets(name, reference, horizon=turn == "horizon"))
                for name, turn in turns if name == collection
            ]
        self.assertEqual([turn for turn, _ in results], ["foundation", "horizon"])
        self.assertEqual(requests, [(RUN, RUN), (RUN, utc_hour(117))])
        self.assertEqual([a["valid"] for a in results[0][1][1]], [RUN])
        horizon_assets = results[1][1][1]
        self.assertEqual(results[1][1][0], RUN)
        self.assertEqual(max(a["valid"] for a in horizon_assets), utc_hour(60))
        self.assertEqual(results[1][1][2]["requiredExactValidTimeCount"], 1)
        remaining = [a for a in producer.rotate_native_refresh_assets(horizon_assets, RUN)
                     if not producer.should_skip_previously_processed_asset(a["valid"], {RUN}, None)]
        self.assertGreater(len(remaining), producer.ATMOSPHERE_HORIZON_MAX_ASSETS)
        self.assertNotIn(RUN, [a["valid"] for a in remaining])

    def test_private_tail_survives_catalog_lf_filter_and_exact_scalar_resume(self):
        collection = "dkss_lf"
        required = {utc_hour(offset) for offset in range(118)}
        with patch.object(producer, "request_json", return_value={"type": "FeatureCollection", "features": [catalog_item(collection, hour) for hour in range(121)]}), patch.object(producer.time, "time", return_value=producer.epoch(RUN)):
            run, assets, stats = producer.list_latest_assets(
                collection, minimum_valid_time=RUN, required_valid_times=required,
                required_horizon_end_time=utc_hour(117), allow_documented_required_gaps=True,
                private_component_support_end_time=utc_hour(120),
            )
        selected = producer.filter_regional_operational_assets(assets, required, {})
        support = [a for a in selected if producer.private_component_support_asset(a, required)]
        self.assertEqual([a["valid"] for a in support], [utc_hour(hour) for hour in (118, 119, 120)])
        self.assertEqual(stats["requiredExactValidTimeCount"], 118)
        self.assertEqual(len(selected), 121)
        signature = producer.current_marine_processing_signature("synthetic-registry")
        steps, official, rows = {}, {}, {}
        for asset in support:
            at = asset["valid"]
            identity = producer.official_current_asset_identity(collection, run, asset)
            self.assertTrue(producer.asset_identity_is_required_for_resume(collection, asset, identity, required))
            official[at] = identity
            capture = {**CAPTURE, **{key: value for key, value in identity.items() if key not in {"collection", "modelRun", "validTime"}}}
            proof = producer.native_component_source(
                collection, run, at, component="waterLevel", zone=ZONE,
                grid_candidate=POINT, capture=capture,
                spatial_selection=producer.COMPONENT_SPATIAL_SELECTION["waterLevel"],
            )
            rows[at] = {"time": at, "sea-mean-deviation": 0.5, "sources": {"waterLevel": proof}}
            steps[at] = {"complete": True, "parserVersion": producer.PARSER_VERSION,
                "processingSignature": signature, "recognizedParameters": sorted(producer.REQUIRED_TARGETS["marine"]),
                "zonesTouched": 1, "sourceAsset": producer.canonical_current_source_asset(proof)}
        zones = {ZONE["id"]: {**producer.sampling_identity(ZONE), "hourly": rows}}
        empty_pairs = set()
        kwargs = dict(collection=collection, same_processing=True, same_run=True,
            strict_current_anchor_available=False, required_valid_times=required,
            required_asset_provenance=official, current_target_ids=["TEST"],
            current_target_registry_sha256="d" * 64, actual_pair_source_keys=empty_pairs,
            covered_pair_keys=empty_pairs, private_support_zones=zones,
            private_support_zone_ids=[ZONE["id"]])
        previous = {"referenceTime": run, "processingSignature": signature, "processedSteps": steps}
        self.assertEqual(set(producer.reusable_processed_steps(previous, **kwargs)), set(steps))
        self.assertFalse(empty_pairs, "scalar resume must not create public/current coverage")
        rows[utc_hour(119)]["sea-mean-deviation"] = None
        self.assertEqual(set(producer.reusable_processed_steps(previous, **kwargs)), {utc_hour(118), utc_hour(120)})
        # A stale asset receipt or an unbounded support marker cannot suppress acquisition.
        changed = copy.deepcopy(official)
        changed[utc_hour(118)]["itemUpdatedAt"] = utc_hour(1)
        self.assertEqual(set(producer.reusable_processed_steps(previous, **{**kwargs, "required_asset_provenance": changed})), {utc_hour(120)})
        self.assertFalse(producer.private_component_support_asset({"valid": utc_hour(121), "privateComponentSupport": True}, required))

    def test_h0_then_all_critical_families_then_bounded_horizon_and_reclaim(self):
        scheduled = ["harmonie_dini_sf", "dkss_idw", "wam_dw", "dkss_lf", "wam_nsb", "dkss_nsbs"]
        turns = producer.operational_collection_turns(scheduled, {"criticalAtmosphereCollections": ["harmonie_dini_sf"]}, {"dkss_idw": {"lastNativeRefreshAttemptAt": RUN}}, primary_mode=True)
        self.assertEqual(turns[:6], [(name, "foundation" if name == "harmonie_dini_sf" else "native") for name in scheduled])
        self.assertEqual(turns[6], ("harmonie_dini_sf", "horizon"))
        self.assertEqual(turns[-1], ("dkss_idw", "maintenance"))
        self.assertEqual(len(turns), 10)
        self.assertTrue(producer.should_attempt_dkss_primary_refresh(valid_time=VALID, previously_processed=set(), collection_refresh_only=True, critical_work_observed=False, remaining_asset_budget=1))
        self.assertFalse(producer.should_attempt_dkss_primary_refresh(valid_time=VALID, previously_processed={VALID}, collection_refresh_only=True, critical_work_observed=False, remaining_asset_budget=1))

    def test_refresh_rotation_and_same_negative_asset_suppression(self):
        assets = [{"valid": f"2026-09-19T{hour:02d}:00:00Z", "id": str(hour)} for hour in (0, 3, 6)]
        self.assertEqual([a["id"] for a in producer.rotate_native_refresh_assets(assets, VALID)], ["6", "0", "3"])
        self.assertTrue(producer.should_skip_previously_processed_asset(VALID, {VALID}, {"critical": True, "missingComponentKinds": ["current"]}))
        self.assertFalse(producer.should_skip_previously_processed_asset(VALID, {VALID}, {"critical": True, "missingComponentKinds": ["waterLevel"]}))

    def test_private_scalar_support_is_not_a_public_current_gap(self):
        required = {RUN, VALID}
        support = "2026-09-19T06:00:00Z"
        ordinary = producer.classify_dkss_primary_asset(collection="dkss_idw", model_run=RUN, asset={"valid": support}, target_ids=["TEST"], covered_pair_keys=set(), cached_zones={}, active_zone_ids=[ZONE["id"]], enabled=True, required_valid_times=required)
        self.assertFalse(ordinary["critical"])
        private = producer.classify_dkss_primary_asset(collection="dkss_idw", model_run=RUN, asset={"valid": support, "privateComponentSupport": True}, target_ids=["TEST"], covered_pair_keys=set(), cached_zones={}, active_zone_ids=[ZONE["id"]], enabled=True, required_valid_times=required)
        self.assertTrue(private["critical"])
        self.assertIn("waterLevel", private["missingComponentKinds"])
        self.assertNotIn("current", private["missingComponentKinds"])
        self.assertEqual(private["currentMissingPairCount"], 0)

    def test_combined_native_wind_can_reach_96h_without_harmonie_alone(self):
        reference = datetime.fromisoformat(RUN.replace("Z", "+00:00"))
        point = {**producer.sampling_identity(ZONE), "hourly": {}}
        for hour in range(0, 121, 3):
            component = "wind" if hour <= 60 else "windTail"
            valid_time = producer.canonical_time(reference + timedelta(hours=hour))
            fields = ("wind-speed-10m", "wind-dir-10m") if component == "wind" else ("wind-tail-speed-10m", "wind-tail-dir-10m")
            point["hourly"][valid_time] = {fields[0]: 3.0, fields[1]: 90.0, "sources": {component: source(component, RUN, valid_time)}}
        self.assertLess(producer.wind_component_horizon_hours(ZONE["id"], point, "wind", reference.timestamp()), 96)
        self.assertGreaterEqual(producer.wind_component_horizon_hours(ZONE["id"], point, "combined", reference.timestamp()), 96)
        # A true gap cannot be bridged by counting distant raw tail points.
        for hour in range(60, 70, 3):
            point["hourly"].pop(producer.canonical_time(reference + timedelta(hours=hour)), None)
        self.assertLess(producer.wind_component_horizon_hours(ZONE["id"], point, "combined", reference.timestamp()), 96)


if __name__ == "__main__":
    unittest.main(verbosity=2)
