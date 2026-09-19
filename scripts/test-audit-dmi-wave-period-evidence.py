#!/usr/bin/env python3
"""Small offline contract test; synthetic payloads, no provider or private data."""
import copy
import hashlib
import importlib.util
import json
import pathlib
import sys
import tempfile
import types
from collections import Counter

spec = importlib.util.spec_from_file_location("wave_audit", pathlib.Path(__file__).with_name("audit-dmi-wave-period-evidence.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main():
    with tempfile.TemporaryDirectory(prefix="ravradar-wave-audit-test-") as temporary:
        root = pathlib.Path(temporary)
        raw = root / "raw"
        raw.mkdir()
        payload = b"SYNTHETIC-NOT-A-GRIB"
        (raw / "asset.grib").write_bytes(payload)
        digest = hashlib.sha256(payload).hexdigest()
        identity = hashlib.sha256(b"https://example.invalid/synthetic.grib").hexdigest()
        source = {
            "provider": "dmi", "component": "wave", "collection": "wam_dw",
            "modelRun": "2026-09-19T00:00:00Z", "nativeValidTime": "2026-09-19T03:00:00Z",
            "acquiredAt": "2026-09-19T01:00:00Z", "itemId": "PRIVATE-SYNTHETIC-ID",
            "assetIdentitySha256": identity, "contentSha256": digest,
            "contentLengthBytes": len(payload), "assetSizeBytes": len(payload),
            "gridDefinitionSha256": "b" * 64, "gridPoint": [10.0, 56.0],
        }
        entry = {**source, "validTime": source["nativeValidTime"], "bytes": len(payload),
                 "canonicalHref": "https://example.invalid/synthetic.grib"}
        manifest = raw / "asset-manifest.json"
        manifest.write_text(json.dumps({"assets": {"asset.grib": entry}}), encoding="utf-8")
        candidate = root / "candidate.json"
        document = {"zones": {"PRIVATE-SYNTHETIC-PART": {"hourly": {
            source["nativeValidTime"]: {"time": source["nativeValidTime"],
                                        "dominant-wave-period": 7.5, "sources": {"wave": source}}
        }}}}
        candidate.write_text(json.dumps(document), encoding="utf-8")
        before = {path: path.read_bytes() for path in (candidate, manifest, raw / "asset.grib")}
        report = module.audit(candidate, raw)
        assert report["counts"]["verifiedAssets"] == 1
        assert report["counts"]["verifiedSourceRows"] == 1
        assert report["counts"]["hashedAssetBytes"] == len(payload)
        assert report["historicalStateImpactProved"] is False
        assert report["affectedStateCount"] is None
        encoded = json.dumps(report)
        assert "PRIVATE-SYNTHETIC" not in encoded and "example.invalid" not in encoded
        assert identity not in encoded and digest not in encoded
        assert "7.5" not in encoded

        def fake_inspector(_path, _entry, records, _counts, _deadline):
            return [{"pp1d": [9.0], "mwp": [7.5]} for _ in records]

        report = module.audit(candidate, raw, stage="grib", inspector=fake_inspector)
        assert report["counts"]["rowsSavedPeriodEqualsMwpOnly"] == 1
        assert report["counts"]["rowsSavedPeriodDiffersFromPp1d"] == 1
        assert report["counts"]["entitiesWithSavedPeriodDifferentFromPp1d"] == 1
        precision_counts = Counter({key: 0 for key in module.COUNT_KEYS})
        module.summarize_comparisons(
            [{"entity": "synthetic", "period": 7.5000005}],
            [{"pp1d": [7.5], "mwp": [7.5000005]}], precision_counts, set())
        assert precision_counts["rowsSavedPeriodEqualsMwpOnly"] == 1
        report = module.audit(candidate, raw, max_bytes=1)
        assert report["status"] == "BOUNDED_PARTIAL"
        assert report["counts"]["verifiedAssets"] == 0
        assert report["counts"]["rowsSkippedByBudget"] == 1
        assert all(path.read_bytes() == value for path, value in before.items())
        (raw / "asset.grib").write_bytes(b"X" * len(payload))
        report = module.audit(candidate, raw)
        assert report["counts"]["assetHashMismatch"] == 1
        assert report["counts"]["verifiedAssets"] == 0
        (raw / "asset.grib").write_bytes(payload)
        bad = copy.deepcopy(document)
        bad["zones"]["PRIVATE-SYNTHETIC-PART"]["hourly"][source["nativeValidTime"]]["sources"]["wave"]["modelRun"] = "2026-09-18T00:00:00Z"
        candidate.write_text(json.dumps(bad), encoding="utf-8")
        report = module.audit(candidate, raw)
        assert report["counts"]["sourceManifestMismatchRows"] == 1
        assert report["counts"]["verifiedAssets"] == 0

        # The optional active-part scope accepts only the same manifest-bound
        # conditions and DMI cache, not a later failed-run candidate mixed in.
        scoped_source = {**source, "entityType": "coastal-part", "entityId": "PART::synthetic-0",
                         "parentZoneId": "synthetic-parent-0", "samplingPoint": [10.0, 56.0]}
        scoped_document = {"zones": {"PART::synthetic-0": {"entityType": "coastal-part", "hourly": {
            source["nativeValidTime"]: {"time": source["nativeValidTime"], "dominant-wave-period": 7.5,
                                        "sources": {"wave": scoped_source}}}}}}
        candidate.write_text(json.dumps(scoped_document), encoding="utf-8")
        conditions = root / "conditions.json"
        conditions.write_text(json.dumps({"datasetId": "rr-synthetic", "productionReferenceAt": source["nativeValidTime"],
            "zones": {f"synthetic-parent-{index}": {} for index in range(210)},
            "coastalParts": {"parts": {f"synthetic-{index}": {"zoneId": "synthetic-parent-0",
                "waterPoint": [10.0, 56.0]} for index in range(673)}}}), encoding="utf-8")
        bundle = root / "bundle-manifest.json"
        bundle.write_text(json.dumps({"partCount": 673, "zoneCount": 210, "datasetId": "rr-synthetic",
            "productionReferenceAt": source["nativeValidTime"], "files": [
                {"id": file_id, "relativePath": relative, "bytes": path.stat().st_size,
                 "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
                for file_id, relative, path in (("full-conditions", "data/live/conditions.json", conditions),
                                               ("dmi-bulk-cache", "data/live/dmi-bulk-cache.json", candidate))]}), encoding="utf-8")
        report = module.audit(candidate, raw, stage="grib", inspector=fake_inspector,
                              conditions_path=conditions, bundle_manifest_path=bundle)
        assert report["entityGroups"]["coastal-part"]["entitiesWithSavedPeriodDifferentFromPp1d"] == 1
        assert report["protectedPartScope"]["counts"]["differentPeriodRowsAtH0"] == 1
        assert report["protectedPartScope"]["counts"]["partsWithDifferentPeriodAtOrBeforeH0"] == 1
        candidate.write_text(json.dumps(document), encoding="utf-8")
        try:
            module.audit(candidate, raw, conditions_path=conditions, bundle_manifest_path=bundle)
            raise AssertionError("mixed candidate must fail")
        except ValueError as error:
            assert str(error) == "PROTECTED_SCOPE_FILE_BINDING_INVALID"

        # Exercise message iteration, exact grid binding, time and values with a
        # fake ecCodes boundary. Actual native GRIB I/O is NOT claimed tested.
        base = {"gridType": "regular_ll", "Ni": 2, "Nj": 1, "numberOfPoints": 2,
                "latitudeOfFirstGridPointInDegrees": 56.0, "longitudeOfFirstGridPointInDegrees": 10.0,
                "latitudeOfLastGridPointInDegrees": 56.0, "longitudeOfLastGridPointInDegrees": 11.0,
                "iDirectionIncrementInDegrees": 1.0, "jDirectionIncrementInDegrees": 1.0,
                "dataDate": 20260919, "dataTime": 0, "validityDate": 20260919, "validityTime": 300,
                "missingValue": 9999.0, "units": "s", "latitudes": [56.0, 56.0],
                "longitudes": [10.0, 11.0]}
        messages = iter([{**base, "shortName": "mwp", "values": [7.5, 8.0]},
                         {**base, "shortName": "pp1d", "values": [9.0, 10.0]}])
        fake = types.SimpleNamespace(
            codes_grib_new_from_file=lambda _handle: next(messages, None),
            codes_get=lambda gid, key: gid[key], codes_get_array=lambda gid, key: gid[key],
            codes_get_elements=lambda gid, key, indexes: [gid[key][index] for index in indexes],
            codes_release=lambda _gid: None,
        )
        sys.modules["eccodes"] = fake
        source["gridDefinitionSha256"] = module.grid_digest(fake, base)
        counts = Counter({key: 0 for key in module.COUNT_KEYS})
        comparisons = module.inspect_grib(raw / "asset.grib", entry, [{"source": source}], counts,
                                          module.time.monotonic() + 10)
        assert comparisons == [{"pp1d": [9.0], "mwp": [7.5]}]
        assert counts["assetsWithBoth"] == 1 and counts["messages"] == 2
        messages = iter([{**base, "shortName": "pp1d", "values": [9.0, 10.0], "dataDate": 20260918}])
        comparisons = module.inspect_grib(raw / "asset.grib", entry, [{"source": source}], counts,
                                          module.time.monotonic() + 10)
        assert comparisons == [{"pp1d": [], "mwp": []}]
        assert counts["messageTimeMismatch"] == 1
        messages = iter([{**base, "shortName": "pp1d", "values": [9.0, 10.0]}])
        wrong_grid = {**source, "gridDefinitionSha256": "c" * 64}
        comparisons = module.inspect_grib(raw / "asset.grib", entry, [{"source": wrong_grid}], counts,
                                          module.time.monotonic() + 10)
        assert comparisons == [{"pp1d": [], "mwp": []}]
        del sys.modules["eccodes"]
    print("PASS: source/manifest/bytes, readonly inputs, bounded budget, numeric semantics and payload-free output (synthetic ecCodes boundary).")


if __name__ == "__main__":
    main()
