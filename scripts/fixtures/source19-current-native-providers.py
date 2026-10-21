"""PRIVATE native test INPUT producer; never production weather or an owner issuer.

Real ecCodes bytes -> unchanged normal decoder/capture/ledger -> unchanged
forecast/fallback/live producers.  No fake byte digests, numeric score, origin,
conditions, publicPack, external acquisition, source binding or readiness flag.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import socket
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[2]
NATIVE_FORECAST = ROOT / "scripts/fixtures/source19-current-provider-forecast.mjs"
OFFSETS = tuple(range(121))
BASIS = ("data/live/dmi-bulk-cache.json", "data/live/dmi-forecast-cache.json",
         ".cache/copernicus-current-shadow.json", ".cache/open-meteo-current-fallback.json",
         "data/live/current-pilot-history.json", "data/live/dmi-water-stations.json")


def need(value, reason):
    if not value:
        raise RuntimeError("CURRENT_NATIVE_PROVIDER_" + reason)


def digest(path):
    measured = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            measured.update(chunk)
    return measured.hexdigest()


def no_links(path):
    need(path.is_absolute(), "ABSOLUTE_PATH")
    at = Path(path.anchor)
    for part in path.parts[1:]:
        at /= part
        need(not at.is_symlink(), "SYMLINK")


def write_new(path, value):
    raw = json.dumps(value, ensure_ascii=False, allow_nan=False,
                     separators=(",", ":")).encode("utf-8") + b"\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    no_links(path.parent)
    with path.open("xb") as output:
        output.write(raw)
        output.flush()
        os.fsync(output.fileno())
    need(path.read_bytes() == raw, "WRITE_READBACK")


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    need(spec is not None and spec.loader is not None, "NORMAL_MODULE")
    value = importlib.util.module_from_spec(spec)
    sys.modules[name] = value
    spec.loader.exec_module(value)
    return value


def time_text(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fixture_grid(eccodes, targets, reference, offset, destination):
    # Same actual sample/write API as test-native-current-grid.py:461ff.
    # The SYNTHETIC provider grid is built around the unchanged normal targets;
    # no administrator point/geometry is moved to manufacture a valid sample.
    step = 0.02
    west = math.floor((min(t["waterPoint"][0] for t in targets) - .04) / step) * step
    east = math.ceil((max(t["waterPoint"][0] for t in targets) + .04) / step) * step
    south = math.floor((min(t["waterPoint"][1] for t in targets) - .04) / step) * step
    north = math.ceil((max(t["waterPoint"][1] for t in targets) + .04) / step) * step
    ni, nj = round((east - west) / step) + 1, round((north - south) / step) + 1
    need(1 < ni * nj <= 1_000_000, "GRID_BOUND")
    with destination.open("xb") as output:
        for parameter, speed in ((49, .12), (50, .04)):
            gid = eccodes.codes_grib_new_from_samples("regular_ll_sfc_grib1")
            try:
                for key, value in (("Ni", ni), ("Nj", nj),
                    ("latitudeOfFirstGridPointInDegrees", south),
                    ("latitudeOfLastGridPointInDegrees", north),
                    ("longitudeOfFirstGridPointInDegrees", west),
                    ("longitudeOfLastGridPointInDegrees", east),
                    ("iDirectionIncrementInDegrees", step), ("jDirectionIncrementInDegrees", step),
                    ("scanningMode", 64), ("dataDate", int(reference.strftime("%Y%m%d"))),
                    ("dataTime", reference.hour * 100), ("stepRange", str(offset)),
                    ("indicatorOfParameter", parameter)):
                    eccodes.codes_set(gid, key, value)
                eccodes.codes_set_values(gid, [speed] * (ni * nj))
                eccodes.codes_write(gid, output)
            finally:
                eccodes.codes_release(gid)
        output.flush()
        os.fsync(output.fileno())


class StacWire:
    """Local wire JSON only; normal catalog selection/qualification is unchanged."""
    def __init__(self, producer, items):
        self.producer, self.items, self.calls = producer, items, []

    def get(self, url, *, params, timeout):
        parsed = urlparse(url)
        need(parsed.scheme == "https" and parsed.netloc == "current-source-native.invalid", "STAC_HOST")
        collection = next((name for name in self.producer.MARINE_COLLECTIONS
            if parsed.path == "/v1/forecastdata/collections/" + name + "/items"), None)
        need(collection is not None and timeout > 0, "STAC_ROUTE")
        query = {key: values[0] for key, values in parse_qs(parsed.query).items()}
        query.update(params or {})
        start, end = query["datetime"].split("/")
        rows = [row for row in self.items.get(collection, [])
                if self.producer.epoch(start) <= self.producer.epoch(row["properties"]["datetime"])
                <= self.producer.epoch(end)]
        limit, offset = int(query["limit"]), int(query.get("fixture-page", 0))
        need(0 < limit <= self.producer.STAC_PAGE_LIMIT and 0 <= offset <= len(rows), "STAC_PAGE_BOUND")
        page = rows[offset:offset + limit]
        links = []
        if offset + len(page) < len(rows):
            next_query = {"datetime": query["datetime"], "limit": limit, "fixture-page": offset + len(page)}
            next_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", urlencode(next_query), ""))
            links.append({"rel": "next", "href": next_url})
        response = self.producer.requests.Response()
        response.status_code, response.url = 200, url
        response.headers["content-type"] = "application/geo+json"
        response._content = json.dumps({"type": "FeatureCollection", "features": page,
            "numberMatched": len(rows), "numberReturned": len(page), "links": links}).encode()
        self.calls.append({"collection": collection, "items": len(page)})
        return response


def prepare(node, target, initial_phase=None):
    # Linux lease and actual ecCodes are mandatory. Never stub either on Windows.
    need(sys.platform == "linux" and sys.version_info[:2] == (3, 12), "LINUX_PYTHON312_REQUIRED")
    need(ROOT.name == "current-source-native" and ROOT.parent.name.startswith("rr-source19-union-native-"), "EXISTING_OWNED_HOST")
    # The existing own-output guard runs before reading admin/provider data.
    subprocess.run([str(node), "--input-type=module", "-e",
        "import {requireSourceProducerOutput} from './scripts/lib/source-producer-successor-source.mjs';requireSourceProducerOutput();if(process.versions.node.split('.')[0]!=='24')throw Error('NODE24_REQUIRED');"],
        cwd=ROOT, stdin=subprocess.DEVNULL, check=True, timeout=30)
    no_links(ROOT)
    need(Path(os.environ["RUNNER_TEMP"]).resolve() == ROOT / "runner-temp", "SAME_ACTION_RUNNER_TEMP")
    need(node.is_absolute() and node.is_file(), "NODE24_REQUIRED")
    try:
        import eccodes
    except ImportError as error:
        raise RuntimeError("CURRENT_NATIVE_PROVIDER_ECCODES_REQUIRED") from error
    reference = datetime.fromisoformat(target.replace("Z", "+00:00"))
    if initial_phase == 'h0':
        reference -= timedelta(hours=48)
    need(reference.tzinfo is not None and reference == reference.replace(minute=0, second=0, microsecond=0), "TARGET_HOUR")
    need(initial_phase in (None, 'h0', 'h1'), "EXACT_INITIAL_PHASE")
    out = ROOT.parent / ('fixture-initial-' + initial_phase if initial_phase else 'fixture')
    no_links(out)
    need(out.is_dir(), "EXISTING_FIXTURE_DIRECTORY")
    for relative in BASIS:
        need(not (out / relative).exists(), "BASIS_DESTINATION_EXISTS")
    # The later normal input producer runs this same normal registry builder.
    # Do not decode against a stale, hand-built or one-part native registry.
    subprocess.run([str(node), str(ROOT / "scripts/build-public-coastal-parts-v2.mjs")],
        cwd=ROOT, stdin=subprocess.DEVNULL, check=True, timeout=30)
    raw_dir = out / ".cache/dmi-grib"
    raw_dir.parent.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(exist_ok=False)
    previous_env = dict(os.environ)
    original_connect, original_lookup = socket.create_connection, socket.getaddrinfo
    old_cwd, old_path = Path.cwd(), list(sys.path)
    def forbidden(*_args, **_kwargs):
        raise RuntimeError("CURRENT_NATIVE_PROVIDER_EXTERNAL_NETWORK_REFUSED")
    try:
        socket.create_connection = forbidden
        socket.getaddrinfo = forbidden
        os.environ.update(DMI_BULK_RAW_DIR=str(raw_dir), DMI_BULK_OUTPUT_PATH=str(out / BASIS[0]),
            DMI_BULK_DEPLOYED_FALLBACK_PATH=str(out / ".cache/never-created-deployed-bulk.json"),
            DMI_BULK_PUBLISHED_BASELINE_PATH=str(out / ".cache/never-created-published-bulk.json"),
            DMI_STAC_ROOT="https://current-source-native.invalid/v1/forecastdata", PYTHONDONTWRITEBYTECODE="1")
        os.chdir(ROOT)
        sys.path.insert(0, str(ROOT / "scripts"))
        producer = module("current_native_real_dmi_decoder", ROOT / "scripts/update-dmi-bulk.py")
        need(not producer.CACHE_ONLY and not producer.API_KEY, "CLEAN_NATIVE_ACQUISITION_MODE")
        producer.STAC_SESSION.get = forbidden
        producer.DOWNLOAD_SESSION.get = forbidden
        from lib.copernicus_current import load_targets, atomic_write_shadow_checkpoint
        from lib.dmi_bulk_storage import write_dmi_bulk_document, read_dmi_bulk_document
        from lib.dmi_native_provenance import verified_part_current_pair
        from lib.copernicus_target_identity import target_fingerprint
        targets = load_targets(ROOT / "data/live/coastal-parts-v2.json")
        registry = json.loads((ROOT / "data/live/coastal-parts-v2.json").read_text())
        need(len(targets) == registry["partCount"] == 673 and registry["zoneCount"] == 210, "NORMAL_REGISTRY_210_673")
        zones = producer.build_operational_zone_config(json.loads((ROOT / "data/zones.geojson").read_text()), targets)
        need(len({row["id"] for row in zones if row.get("coastalPart")}) == 673, "NORMAL_PART_TARGETS")
        signature = producer.sampling_registry_signature()
        # A missing normal station input has the documented empty fallback.
        # Refuse a populated source rather than changing its sampling identity.
        need(not producer.WATER_SOURCES_PATH.exists(), "EMPTY_NORMAL_STATION_SOURCE_REQUIRED")
        document = producer.load_previous(signature, coastal_part_targets=targets, production_reference=reference)
        need(not document["zones"], "NO_ADOPTED_OLD_BULK")
        document.update(generatedAt=time_text(reference), hours=producer.HOURS,
            currentVectorSemanticsVersion=producer.CURRENT_VECTOR_SEMANTICS_VERSION,
            currentVectorSelection=producer.CURRENT_VECTOR_SELECTION,
            spatialProvenanceVersion=producer.SPATIAL_PROVENANCE_VERSION,
            currentOperationalCadenceHours=1, refreshStatus="partial")
        # Exact normal main() initialization: sampling identities come from its
        # normal target builder, not from authored points/provenance.
        document["zones"] = {zone["id"]: {**(producer.sampling_identity(zone) or {}),
            "hourly": {}, "gridPoints": {}, "collections": {}} for zone in zones}
        diagnostics = document.setdefault("diagnostics", {})
        wire_items, originals = [], []
        processing_signature = producer.current_marine_processing_signature(signature)
        part_ids = sorted(row["partId"] for row in targets)
        registry_sha = target_fingerprint(targets)
        observed_steps = {}
        for offset in OFFSETS:
            valid = time_text(reference + timedelta(hours=offset))
            href = "https://current-source-native.invalid/assets/dkss_nsbs/" + reference.strftime("%Y%m%d%H") + "/" + str(offset) + ".grib"
            file = producer.cached_asset_path(href)
            fixture_grid(eccodes, targets, reference, offset, file)
            size, content_sha = file.stat().st_size, digest(file)
            item_id = "SYNTHETIC-CURRENT-NATIVE-NSBS-" + str(offset)
            acquired = time_text(datetime.now(timezone.utc))
            producer.register_raw_cache_asset(file, href, "dkss_nsbs", time_text(reference), valid,
                item_id=item_id, item_created_at=time_text(reference), item_updated_at=time_text(reference),
                acquired_at=acquired, expected_size=size, content_sha256=content_sha)
            # This normal operation owns the actual F_RDLCK/SIGIO read lease,
            # scans the complete file and constructs its genuine component proof.
            observed_outcomes = {}
            found, touched, interrupted, _messages, _lookups = producer.process_grib(
                file, "dkss_nsbs", time_text(reference), valid, zones, document, diagnostics,
                current_part_outcomes=observed_outcomes,
                allowed_parameters={"current-u", "current-v"}, locked_operational_reference=time_text(reference))
            need(not interrupted and {"current-u", "current-v"} <= found and touched,
                 "NORMAL_DECODE_INCOMPLETE")
            need(observed_outcomes.get("complete") is True and observed_outcomes.get("targetPartIds") == part_ids,
                 "NORMAL_DECODE_OUTCOMES_INCOMPLETE")
            source = producer.canonical_current_source_asset({"collection": "dkss_nsbs",
                "modelRun": time_text(reference), "validTime": valid,
                **(producer.raw_cache_source_capture(file, "dkss_nsbs", time_text(reference), valid) or {})})
            need(source is not None, "NORMAL_CAPTURE_MISSING")
            proof = producer.build_current_part_outcome_proof(
                observed_outcomes.get("spatialUnavailablePartIds"), part_ids,
                registry_sha, processing_signature, source)
            # Only normal decoder observations and normal proof constructors
            # enter the normal run metadata read by its ledger sealer.
            observed_steps[valid] = {"complete": True, "parserVersion": producer.PARSER_VERSION,
                "processingSignature": processing_signature, "recognizedParameters": sorted(found),
                "zonesTouched": len(touched), "sourceAsset": source, "currentPartOutcomeProof": proof}
            need(file.stat().st_size == size and digest(file) == content_sha, "RAW_CHANGED_AFTER_DECODE")
            wire_items.append({"type": "Feature", "id": item_id, "collection": "dkss_nsbs",
                "properties": {"forecast:reference_datetime": time_text(reference), "datetime": valid,
                    "created": time_text(reference), "updated": time_text(reference)},
                "assets": {"data": {"href": href, "type": "application/x-grib", "roles": ["data"], "file:size": size}}})
            originals.append({"relativePath": str(file.relative_to(out)), "bytes": size, "sha256": content_sha})
        for part in targets:
            for offset in OFFSETS:
                need(verified_part_current_pair(document, part, reference + timedelta(hours=offset)), "NORMAL_NATIVE_PAIR_REJECTED")
        document["runs"]["dkss_nsbs"] = {"referenceTime": time_text(reference),
            "parserVersion": producer.PARSER_VERSION, "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
            "gridLookupVersion": producer.GRID_LOOKUP_VERSION, "processingSignature": processing_signature,
            "processedSteps": observed_steps}
        catalogs = {"dkss_nsbs": wire_items}
        # A real synthetic terminal asset for EACH other marine catalog permits
        # normal exhaustive inventory to classify 0..117 as upstream-absent.
        # No empty catalog is silently relabelled complete, and these terminal
        # observations are NOT admitted to the operational decoder queue.
        for collection in sorted(producer.MARINE_COLLECTIONS - {"dkss_nsbs"}):
            valid = time_text(reference + timedelta(hours=120))
            href = "https://current-source-native.invalid/assets/" + collection + "/" + reference.strftime("%Y%m%d%H") + "/120.grib"
            file = producer.cached_asset_path(href)
            fixture_grid(eccodes, targets, reference, 120, file)
            size, content_sha = file.stat().st_size, digest(file)
            item_id = "SYNTHETIC-CURRENT-NATIVE-" + collection.upper() + "-120"
            producer.register_raw_cache_asset(file, href, collection, time_text(reference), valid,
                item_id=item_id, item_created_at=time_text(reference), item_updated_at=time_text(reference),
                acquired_at=time_text(datetime.now(timezone.utc)), expected_size=size, content_sha256=content_sha)
            catalogs[collection] = [{"type": "Feature", "id": item_id, "collection": collection,
                "properties": {"forecast:reference_datetime": time_text(reference), "datetime": valid,
                    "created": time_text(reference), "updated": time_text(reference)},
                "assets": {"data": {"href": href, "type": "application/x-grib", "roles": ["data"], "file:size": size}}}]
            originals.append({"relativePath": str(file.relative_to(out)), "bytes": size, "sha256": content_sha})
        wire = StacWire(producer, catalogs)
        producer.STAC_SESSION.get = wire.get
        producer.DOWNLOAD_SESSION.get = forbidden
        official = {collection: producer.list_latest_assets(collection, preferred_run=time_text(reference),
            minimum_valid_time=time_text(reference),
            required_valid_times=set(producer.operational_current_valid_times(reference)),
            required_horizon_end_time=time_text(reference + timedelta(hours=117)),
            allow_documented_required_gaps=True) for collection in producer.MARINE_COLLECTIONS}
        # No authored COMPLETE ledger/attestation; this actual normal sealer must
        # validate the actual decoded bytes against the normal parsed wire catalog.
        producer.seal_current_operational_checkpoint(document, targets, reference, official)
        need(producer.current_operational_cache_ready(document, targets, reference), "NORMAL_LEDGER_NOT_READY")
        initial_observations = None
        if initial_phase:
            initial_weather = module('source_current_initial_weather',
                ROOT / 'scripts/fixtures/source19-current-initial-weather.py')
            initial_observations = initial_weather.add_initial_weather(
                eccodes, producer, targets, zones, document, reference, out, originals)
        write_dmi_bulk_document(out / BASIS[0], document)
        need(read_dmi_bulk_document(out / BASIS[0])["zoneRegistrySignature"] == signature, "NORMAL_BULK_READBACK")
        atomic_write_shadow_checkpoint(out / BASIS[2], acquisitions=[], records=[],
            updated_at=reference, target_identities={row["partId"]: row for row in targets})
        finish_normal_basis(node, out, reference, producer, targets, document, initial_phase=initial_phase)
        write_new(out / "native-provider-stac-wire.json", {"syntheticTestInput": True,
            "stacRoot": producer.STAC_ROOT, "collections": catalogs})
        write_new(out / "native-provider-raw-inputs.json", {"syntheticTestInput": True,
            "rawOriginals": originals, "nativeHours": len(OFFSETS), "partCount": len(targets),
            "copernicusRecords": 0, "allWeatherComplete": False, "stacTransportCalls": wire.calls,
            **({"initialPhase": initial_phase, "actualInitialDecodeObservations": initial_observations}
               if initial_phase else {})})
        return out
    finally:
        socket.create_connection, socket.getaddrinfo = original_connect, original_lookup
        os.chdir(old_cwd)
        sys.path[:] = old_path
        os.environ.clear()
        os.environ.update(previous_env)


def finish_normal_basis(node, out, reference, producer, targets, document, *, initial_phase=None):
    """Actual existing normal producers, never authored READY/closure/pilot data."""
    from lib.copernicus_current import file_sha256
    from lib.copernicus_current_source_stage import build_source_stage, atomic_write_source_stage
    from lib.current_field_shadow import empty_document, save_document
    targets_path = ROOT / "data/live/coastal-parts-v2.json"
    bulk = out / BASIS[0]
    cp = out / BASIS[2]
    registry_path = out / ".cache/copernicus-current-targets.json"
    stage_path = out / ".cache/copernicus-current-source-stage.json"
    regional = out / ".cache/current-field-shadow.json"
    fallback = out / BASIS[3]
    closure = out / ".cache/current-operational-closure.json"
    policy = ROOT / "data/current-regional-proxy-policy.json"
    cp_registry = module("current_native_normal_cp_registry", ROOT / "scripts/build-copernicus-target-registry.py")
    registry = cp_registry.build_registry(targets, document, reference, file_sha256(bulk),
        full_coast=False, require_strict_dmi_ledger=True)
    # We supply no remote CP/OM vectors. Only an ACTUAL zero-gap DMI matrix
    # permits the normal CP/OM no-request producers below. Otherwise stop here.
    need(not registry["operationalRequiredPairs"], "NORMAL_COPERNICUS_RESIDUALS_REQUIRE_DATA")
    write_new(registry_path, registry)
    shadow = json.loads(cp.read_text())
    identities = {row["partId"]: row for row in targets}
    stage = build_source_stage(registry=registry, shadow=shadow, target_identities=identities,
        shadow_sha256=file_sha256(cp), attempts=[], sealed_at=datetime.now(timezone.utc))
    atomic_write_source_stage(stage_path, stage, registry=registry, shadow=shadow,
        target_identities=identities, shadow_sha256=file_sha256(cp))
    save_document(regional, empty_document())
    report_root = out / "data/diagnostics"
    def normal(command):
        # Input fixture only, not a production time-budget or scheduler change.
        subprocess.run(command, cwd=ROOT, stdin=subprocess.DEVNULL, check=True, timeout=120)
    common = ["--targets", str(targets_path), "--dmi", str(bulk), "--registry", str(registry_path),
        "--copernicus", str(cp), "--source-stage", str(stage_path), "--regional", str(regional),
        "--policy", str(policy), "--at", time_text(reference)]
    normal([sys.executable, "-B", str(ROOT / "scripts/fill-open-meteo-current-fallback.py"), *common,
        "--reuse-only", "--critical-only", "--output", str(fallback),
        "--donor-bank", str(out / ".cache/open-meteo-current-donor-bank.json"),
        "--report", str(report_root / "native-open-meteo.json"),
        "--fetch-report", str(report_root / "native-open-meteo-fetch.json")])
    normal([sys.executable, "-B", str(ROOT / "scripts/build-current-operational-closure.py"), *common,
        "--open-meteo", str(fallback), "--output", str(closure), "--report", str(report_root / "native-closure.json")])
    normal([sys.executable, "-B", str(ROOT / "scripts/build-live-current-pilot.py"), *common,
        "--open-meteo", str(fallback), "--closure", str(closure),
        "--control", str(ROOT / "data/current-live-pilot-control.json"),
        "--output", str(out / BASIS[4]), "--report", str(report_root / "native-pilot.json")])
    normal([str(node), str(NATIVE_FORECAST), time_text(reference), *(["--initial-" + initial_phase] if initial_phase else [])])
    # Exact normal readCachedWaterStations fallback: no stations/observations,
    # no invented inventory, forecast value, source routing or status. The real
    # updater creates its full lifecycle document later from these empty inputs.
    write_new(out / BASIS[5], {"stations": []})
    admin = ("data/zones.geojson", "data/admin/coastline-overrides.json", "data/admin/direction-reviews.json",
        "data/geometry-v2/active-national-coastal-parts/manifest.json",
        *["data/geometry-v2/active-national-coastal-parts/" + name for name in
          ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")])
    admin_rows = []
    for relative in admin:
        source = ROOT / relative
        if not source.exists():
            need(relative in {"data/admin/coastline-overrides.json", "data/admin/direction-reviews.json"}, "ADMIN_INPUT_MISSING")
            continue
        target = out / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as output:
            output.write(source.read_bytes())
            output.flush()
            os.fsync(output.fileno())
        need(digest(target) == digest(source), "ADMIN_COPY_CHANGED")
        admin_rows.append({"relativePath": relative, "bytes": target.stat().st_size, "sha256": digest(target)})
    provider_files = (*BASIS, ".cache/copernicus-current-source-stage.json", ".cache/current-field-shadow.json",
        ".cache/open-meteo-current-donor-bank.json")
    provider_rows = []
    for relative in provider_files:
        file = out / relative
        need(file.is_file() and not file.is_symlink() and file.stat().st_size > 0, "NORMAL_BASIS_OUTPUT_MISSING")
        provider_rows.append({"relativePath": relative, "bytes": file.stat().st_size, "sha256": digest(file)})
    write_new(out / "current-source-native-options.json", {"profile": "current-source-native-initial" if initial_phase else "current-source-native",
        "workRoot": str(ROOT.parent / ("current-source-native-initial-inputs" if initial_phase else "current-source-native-inputs")), "inputRoot": str(out),
        "adminInputs": admin_rows, "providerInputs": provider_rows,
        "targetReferenceAt": (reference + timedelta(hours=48) if initial_phase == 'h0' else reference).strftime("%Y-%m-%dT%H:00:00.000Z")})


if __name__ == "__main__":
    need(len(sys.argv) in (3, 4), "EXACT_NODE_TARGET_ARGUMENTS")
    phase = None if len(sys.argv) == 3 else {'--initial-h0': 'h0', '--initial-h1': 'h1'}.get(sys.argv[3])
    need(len(sys.argv) == 3 or phase is not None, "EXACT_INITIAL_PHASE_ARGUMENT")
    prepare(Path(sys.argv[1]), sys.argv[2], initial_phase=phase)
