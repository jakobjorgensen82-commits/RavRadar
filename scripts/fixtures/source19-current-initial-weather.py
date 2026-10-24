"""Private synthetic OLD-prefix weather, decoded by the normal owned reader.

Not a provider download, score/state/origin writer, READY issuer or a production
history import. The CURRENT fixture's default current-only recipe is untouched.
"""
from __future__ import annotations

import copy
import hashlib
import math
import os
from datetime import datetime, timedelta, timezone


def need(value, reason):
    if not value:
        raise RuntimeError("CURRENT_NATIVE_INITIAL_WEATHER_" + reason)


def text(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def grid(eccodes, producer, decode_zones, reference, offset, destination, collection, fields):
    """Same real ecCodes sample/write recipe; no made-up digest or capture."""
    step = .02
    # The normal decoder probes parents as well as PARTs: its cardinal radii
    # reach .14 degrees, or .26 for marine Limfjord targets. Diagonals and
    # smaller radii fit inside that envelope; retain the original two-cell rim.
    envelope = [(row["lon"], row["lat"], .26 if collection in producer.MARINE_COLLECTIONS
                 and row.get("coastType") == "limfjord" else .14) for row in decode_zones]
    west = math.floor((min(lon-radius for lon, _lat, radius in envelope) - 2*step) / step) * step
    east = math.ceil((max(lon+radius for lon, _lat, radius in envelope) + 2*step) / step) * step
    south = math.floor((min(lat-radius for _lon, lat, radius in envelope) - 2*step) / step) * step
    north = math.ceil((max(lat+radius for _lon, lat, radius in envelope) + 2*step) / step) * step
    ni, nj = round((east-west)/step)+1, round((north-south)/step)+1
    need(1 < ni*nj <= 1_000_000, "GRID_BOUND")
    with destination.open("xb") as output:
        for parameter, value, expected in fields:
            gid = eccodes.codes_grib_new_from_samples("regular_ll_sfc_grib1")
            try:
                for key, item in (("Ni", ni), ("Nj", nj),
                        ("latitudeOfFirstGridPointInDegrees", south),
                        ("latitudeOfLastGridPointInDegrees", north),
                        ("longitudeOfFirstGridPointInDegrees", west),
                        ("longitudeOfLastGridPointInDegrees", east),
                        ("iDirectionIncrementInDegrees", step), ("jDirectionIncrementInDegrees", step),
                        ("scanningMode", 64), ("resolutionAndComponentFlags", 128),
                        ("dataDate", int(reference.strftime("%Y%m%d"))),
                        ("dataTime", reference.hour*100), ("stepRange", str(offset))):
                    eccodes.codes_set(gid, key, item)
                if collection == "harmonie_dini_sf":
                    eccodes.codes_set(gid, "typeOfLevel", "heightAboveGround")
                    eccodes.codes_set(gid, "level", 10)
                    eccodes.codes_set(gid, "shortName", parameter)
                elif collection in producer.WAVE_BOOTSTRAP_COLLECTIONS:
                    # Real ECMWF wave table: pp1d is PEAK, never mwp/mp2.
                    eccodes.codes_set(gid, "centre", "ecmf")
                    eccodes.codes_set(gid, "table2Version", 128)
                    eccodes.codes_set(gid, "shortName", parameter)
                else:
                    eccodes.codes_set(gid, "indicatorOfParameter", parameter)
                need(producer.classify_parameter(gid, collection) == expected,
                     "ECCODES_FIELD_CLASSIFICATION")
                eccodes.codes_set_values(gid, [value] * (ni*nj))
                eccodes.codes_write(gid, output)
            finally:
                eccodes.codes_release(gid)
        output.flush()
        os.fsync(output.fileno())


def add_initial_weather(eccodes, producer, targets, zones, document, reference, out, originals):
    """Only provider INPUT leaves; normal updater must still prove 210/673 READY.

    WAM uses its real same-asset admission/owner validators, including unchanged
    rejected targets. The normal updater later owns the approved Feggesund proxy.
    Neither a synthetic tuple nor this function is a READY declaration.
    """
    need(reference.tzinfo is not None and reference.minute == reference.second == 0, "REFERENCE")
    diagnostics = document["diagnostics"]
    recipes = {
        "dkss_nsbs": ((82, .2, "sea-mean-deviation"), (80, 285.15, "water-temperature")),
        "harmonie_dini_sf": (("10u", 5., "wind-u-10m"), ("10v", 2., "wind-v-10m")),
        "wam_nsb": (("swh", .6, "significant-wave-height"), ("pp1d", 6., "dominant-wave-period"),
                    ("mwd", 90., "mean-wave-dir")),
        "wam_dw": (("swh", .6, "significant-wave-height"), ("pp1d", 6., "dominant-wave-period"),
                   ("mwd", 90., "mean-wave-dir")),
    }
    observations = []
    for collection, fields in recipes.items():
        relevant = (producer.native_operational_wave_zones(collection, zones)
                    if collection in producer.WAVE_BOOTSTRAP_COLLECTIONS else zones)
        need(relevant, "NORMAL_TARGETS_REQUIRED")
        decode_zones = (producer.relevant_zones(collection, zones)
                        if collection in producer.WAVE_BOOTSTRAP_COLLECTIONS else zones)
        for offset in range(121):
            valid = text(reference + timedelta(hours=offset))
            href = ("https://current-source-native.invalid/initial-assets/" + collection + "/"
                    + reference.strftime("%Y%m%d%H") + "/" + str(offset) + ".grib")
            file = producer.cached_asset_path(href)
            grid(eccodes, producer, decode_zones, reference, offset, file, collection, fields)
            raw = file.read_bytes()
            content_sha, size = hashlib.sha256(raw).hexdigest(), len(raw)
            item_id = "SYNTHETIC-INITIAL-" + collection.upper() + "-" + str(offset)
            producer.register_raw_cache_asset(file, href, collection, text(reference), valid,
                item_id=item_id, item_created_at=text(reference), item_updated_at=text(reference),
                acquired_at=text(datetime.now(timezone.utc)), expected_size=size, content_sha256=content_sha)
            asset = {"valid": valid, "id": item_id, "href": href, "size": size,
                     "itemCreatedAt": text(reference), "itemUpdatedAt": text(reference)}
            summary = {}
            if collection in producer.WAVE_BOOTSTRAP_COLLECTIONS:
                # Build the same official identity from the actual synthetic
                # catalog asset + actual file size, not sha(b'fake bytes').
                identity = producer.official_wave_asset_identity(collection, text(reference), asset)
                need(identity is not None, "NORMAL_OFFICIAL_WAVE_IDENTITY")
                selected = producer.MappingWaveAsset(asset, text(reference), official_identity=identity)
                before = copy.deepcopy(document)

                def admit(staged, _private, outcome):
                    measured = producer.private_wave_bootstrap_asset_summary(staged, relevant, collection, selected)
                    summary.clear()
                    summary.update(measured)
                    return producer.operational_wave_asset_stage_admissible(
                        before, staged, relevant, collection, selected, measured, outcome)

                outcome = producer.process_grib_transactionally(file, collection, text(reference), valid,
                    decode_zones, document, diagnostics, allowed_parameters={row[2] for row in fields},
                    stage_validator=admit, locked_operational_reference=text(reference))
                need(producer.wave_asset_cache_proof_coherent(summary, require_complete=True),
                     "NORMAL_WAVE_NATIVE_OWNER_NOT_COMPLETE")
                run = document.setdefault("runs", {}).setdefault(collection, {})
                run.update(referenceTime=text(reference), parserVersion=producer.PARSER_VERSION,
                           parameterMapVersion=producer.PARAMETER_MAP_VERSION, gridLookupVersion=producer.GRID_LOOKUP_VERSION)
                # These counts/lineage hashes were actually returned by the normal
                # admission function; they are not an authored success fixture.
                run.setdefault("processedSteps", {})[valid] = {"complete": True,
                    "recognizedParameters": sorted(outcome[0]), "waveTargetProof": copy.deepcopy(summary),
                    "sourceAsset": identity, "assetTraversalComplete": True,
                    "rawContentSha256": content_sha, "waveAdmissionPolicy": producer.WAVE_ASSET_ADMISSION_POLICY,
                    "acceptedNativeZoneCount": summary["acceptedCount"], "parserVersion": producer.PARSER_VERSION}
            else:
                outcome = producer.process_grib(file, collection, text(reference), valid,
                    relevant, document, diagnostics, allowed_parameters={row[2] for row in fields},
                    locked_operational_reference=text(reference))
            need(outcome[2] is False and {row[2] for row in fields} <= outcome[0] and outcome[1],
                 "NORMAL_FULL_WEATHER_DECODE_INCOMPLETE")
            need(file.stat().st_size == size and hashlib.sha256(file.read_bytes()).hexdigest() == content_sha,
                 "RAW_CHANGED_AFTER_DECODE")
            originals.append({"relativePath": str(file.relative_to(out)), "bytes": size, "sha256": content_sha})
            observations.append({"collection": collection, "validTime": valid,
                                 "acceptedNativeTargetCount": summary.get("acceptedCount")})
    for point in document["zones"].values():
        for row in point.get("hourly", {}).values():
            producer.wind_from_uv(row)
    # Normal current ledger must remain genuine after adding scalar/wind/WAM
    # fields. Initial all-weather readiness is proved later, never declared here.
    need(producer.current_operational_cache_ready(document, targets, reference), "CURRENT_LEDGER_CHANGED")
    return observations
