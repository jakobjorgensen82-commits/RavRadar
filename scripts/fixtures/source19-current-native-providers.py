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


def bind_catalog_run_headers(producer, document, official):
    """Use the normal run metadata even when a selected catalog has no target assets.

    An empty processedSteps never claims decoding, completion or READY.  The
    unchanged normal ledger validates the actual catalog and every source pair.
    Existing decoder-owned run metadata is retained, not rebuilt or overwritten.
    """
    signature = producer.current_marine_processing_signature(document["zoneRegistrySignature"])
    for collection in sorted(producer.MARINE_COLLECTIONS):
        model_run, _assets, _stats = official[collection]
        document["runs"].setdefault(collection, {"referenceTime": model_run,
            "parserVersion": producer.PARSER_VERSION,
            "parameterMapVersion": producer.PARAMETER_MAP_VERSION,
            "gridLookupVersion": producer.GRID_LOOKUP_VERSION,
            "processingSignature": signature, "processedSteps": {}})


CODE598_HEAD = "bd9cf518fe798ddea45d2b835f324f6e2bea06fc"
CODE598_TREE = "2f71c562eea774ca03996802f83bdad7cccd43cc"
CODE598_ADMIN_INPUTS = frozenset(("data/zones.geojson", "data/admin/coastline-overrides.json",
    "data/admin/direction-reviews.json", "data/geometry-v2/active-national-coastal-parts/manifest.json",
    *["data/geometry-v2/active-national-coastal-parts/" + name for name in
      ("coastal-parts.geojson", "part-names.json", "point-pairs.json", "dmi-grid-proof.json")],
    "data/live/coastal-parts-v2.json"))


def genuine598_code_root(value):
    # This is a separate actual Git code host, never an override of producer.ROOT.
    root = Path(value)
    need(root.is_absolute() and root == ROOT.parent / "current598-native-inputs/normal-genuine598", "CODE598_OWNED_PATH")
    no_links(root)
    need(root.resolve(strict=True) == root and root.is_dir(), "CODE598_PHYSICAL_ROOT")
    environment = dict(os.environ, GIT_NO_LAZY_FETCH="1", GIT_NO_REPLACE_OBJECTS="1",
        GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0", GIT_CONFIG_COUNT="1",
        GIT_CONFIG_KEY_0="protocol.allow", GIT_CONFIG_VALUE_0="never")
    def git(*arguments):
        return subprocess.check_output(["git", "-c", "core.autocrlf=false", "-C", str(root), *arguments],
            env=environment, stdin=subprocess.DEVNULL, timeout=30, text=True).strip()
    need(git("rev-parse", "HEAD") == CODE598_HEAD and git("rev-parse", "HEAD^{tree}") == CODE598_TREE,
         "GENUINE37_CODE_IDENTITY")
    # Only already transported admin input/its normal registry may differ.
    need(set(git("diff", "--name-only", "HEAD").splitlines()) <= CODE598_ADMIN_INPUTS, "CODE598_PRODUCT_CHANGED")
    need(not git("ls-files", "--others", "--exclude-standard", "--", "scripts", "js"), "CODE598_UNTRACKED_PRODUCT")
    return root


def prepare(node, target, initial_phase=None, *, current598=False, code598_root=None):
    # Linux lease and actual ecCodes are mandatory. Never stub either on Windows.
    need(sys.platform == "linux" and sys.version_info[:2] == (3, 12), "LINUX_PYTHON312_REQUIRED")
    need(ROOT.name == "current-source-native" and ROOT.parent.name.startswith("rr-source19-union-native-"), "EXISTING_OWNED_HOST")
    # The existing own-output guard runs before reading admin/provider data.
    subprocess.run([str(node), "--input-type=module", "-e",
        "import {requireSourceProducerOutput} from './scripts/lib/source-producer-current-native-profile.mjs';requireSourceProducerOutput();if(process.versions.node.split('.')[0]!=='24')throw Error('NODE24_REQUIRED');"],
        cwd=ROOT, stdin=subprocess.DEVNULL, check=True, timeout=30)
    no_links(ROOT)
    need(Path(os.environ["RUNNER_TEMP"]).resolve() == ROOT / "runner-temp", "SAME_ACTION_RUNNER_TEMP")
    need(node.is_absolute() and node.is_file(), "NODE24_REQUIRED")
    try:
        import eccodes
    except ImportError as error:
        raise RuntimeError("CURRENT_NATIVE_PROVIDER_ECCODES_REQUIRED") from error
    need(type(current598) is bool and not (current598 and initial_phase is not None), "EXACT_CURRENT598_MODE")
    need(code598_root is None or current598, "CODE598_CURRENT598_ONLY")
    normal_root = ROOT if code598_root is None else genuine598_code_root(code598_root)
    reference = datetime.fromisoformat(target.replace("Z", "+00:00"))
    if initial_phase == 'h0':
        reference -= timedelta(hours=48)
    need(reference.tzinfo is not None and reference == reference.replace(minute=0, second=0, microsecond=0), "TARGET_HOUR")
    need(initial_phase in (None, 'h0', 'h1'), "EXACT_INITIAL_PHASE")
    out = ROOT.parent / ('fixture-current598-code598' if code598_root is not None else
        'fixture-current598' if current598 else 'fixture-initial-' + initial_phase if initial_phase else 'fixture')
    if code598_root is not None:
        out.mkdir(mode=0o700, parents=False, exist_ok=False)
    no_links(out)
    need(out.is_dir(), "EXISTING_FIXTURE_DIRECTORY")
    for relative in BASIS:
        need(not (out / relative).exists(), "BASIS_DESTINATION_EXISTS")
    # The later normal input producer runs this same normal registry builder.
    # Do not decode against a stale, hand-built or one-part native registry.
    subprocess.run([str(node), str(normal_root / "scripts/build-public-coastal-parts-v2.mjs")],
        cwd=normal_root, stdin=subprocess.DEVNULL, check=True, timeout=30)
    raw_dir = (normal_root if code598_root is not None else out) / ".cache/dmi-grib"
    raw_dir.parent.mkdir(parents=True, exist_ok=True)
    no_links(raw_dir.parent)
    raw_dir.mkdir(mode=0o700, exist_ok=False)
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
        os.chdir(normal_root)
        sys.path.insert(0, str(normal_root / "scripts"))
        producer = import_native_decoder(normal_root, current598=current598)
        if code598_root is not None:
            need(producer.ROOT.resolve() == normal_root and producer.RAW_DIR.resolve() == normal_root / ".cache/dmi-grib",
                 "CODE598_NORMAL_CANONICAL_RAW_ROOT")
        need(not producer.CACHE_ONLY and not producer.API_KEY, "CLEAN_NATIVE_ACQUISITION_MODE")
        producer.STAC_SESSION.get = forbidden
        producer.DOWNLOAD_SESSION.get = forbidden
        from lib.copernicus_current import load_targets
        from lib.dmi_bulk_storage import write_dmi_bulk_document, read_dmi_bulk_document
        from lib.dmi_native_provenance import verified_part_current_pair
        from lib.copernicus_target_identity import target_fingerprint
        targets = load_targets(normal_root / "data/live/coastal-parts-v2.json")
        registry = json.loads((normal_root / "data/live/coastal-parts-v2.json").read_text())
        need(len(targets) == registry["partCount"] == 673 and registry["zoneCount"] == 210, "NORMAL_REGISTRY_210_673")
        zones = producer.build_operational_zone_config(json.loads((normal_root / "data/zones.geojson").read_text()), targets)
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
        history_start = reference
        history_plan = None
        if current598:
            # The actual normal selector determines this cold INPUT axis.
            # It creates no state, origin, readiness or positive whole-runtime proof.
            demand_mode = ["--current598-demand"] if code598_root is None else ["--current598-code598-demand", str(normal_root)]
            subprocess.run([str(node), str(NATIVE_FORECAST), target, *demand_mode],
                cwd=normal_root, stdin=subprocess.DEVNULL, check=True, timeout=120)
            history_plan = json.loads((out / ".cache/current598-history-demand.json").read_text())
            need(history_plan["productionReferenceAt"] == target, "CURRENT598_HISTORY_TARGET")
            demands = producer.current_history_demands(history_plan["demands"], zones, time_text(reference))
            need(set(demands) == {"PART::" + part_id for part_id in part_ids}, "CURRENT598_HISTORY_DOMAIN")
            history_start = min(datetime.fromisoformat(row["startAt"].replace("Z", "+00:00"))
                for row in demands.values())
            need(history_start <= reference, "CURRENT598_HISTORY_AXIS")
        history_offsets = tuple(range(int((history_start - reference).total_seconds() // 3600), 0))
        for offset in (*history_offsets, *OFFSETS):
            valid = time_text(reference + timedelta(hours=offset))
            # Historical INPUT originals are created at their own valid model
            # hour with lead zero; never negative GRIB leads or retagged bytes.
            model_reference = reference if offset >= 0 else reference + timedelta(hours=offset)
            model_step = offset if offset >= 0 else 0
            href = "https://current-source-native.invalid/assets/dkss_nsbs/" + model_reference.strftime("%Y%m%d%H") + "/" + str(model_step) + ".grib"
            file = producer.cached_asset_path(href)
            fixture_grid(eccodes, targets, model_reference, model_step, file)
            size, content_sha = file.stat().st_size, digest(file)
            item_id = ("SYNTHETIC-CURRENT-NATIVE-NSBS-" + str(offset) if not current598
                else "SYNTHETIC-CURRENT598-NSBS-" + model_reference.strftime("%Y%m%d%H") + "-" + str(model_step))
            acquired = time_text(datetime.now(timezone.utc))
            producer.register_raw_cache_asset(file, href, "dkss_nsbs", time_text(model_reference), valid,
                item_id=item_id, item_created_at=time_text(model_reference), item_updated_at=time_text(model_reference),
                acquired_at=acquired, expected_size=size, content_sha256=content_sha)
            # This normal operation owns the actual F_RDLCK/SIGIO read lease,
            # scans the complete file and constructs its genuine component proof.
            observed_outcomes = {}
            found, touched, interrupted, _messages, _lookups = producer.process_grib(
                file, "dkss_nsbs", time_text(model_reference), valid, zones, document, diagnostics,
                current_part_outcomes=observed_outcomes,
                allowed_parameters={"current-u", "current-v"}, locked_operational_reference=time_text(reference))
            need(not interrupted and {"current-u", "current-v"} <= found and touched,
                 "NORMAL_DECODE_INCOMPLETE")
            need(observed_outcomes.get("complete") is True and observed_outcomes.get("targetPartIds") == part_ids,
                 "NORMAL_DECODE_OUTCOMES_INCOMPLETE")
            source = producer.canonical_current_source_asset({"collection": "dkss_nsbs",
                "modelRun": time_text(model_reference), "validTime": valid,
                **(producer.raw_cache_source_capture(file, "dkss_nsbs", time_text(model_reference), valid) or {})})
            need(source is not None, "NORMAL_CAPTURE_MISSING")
            proof = producer.build_current_part_outcome_proof(
                observed_outcomes.get("spatialUnavailablePartIds"), part_ids,
                registry_sha, processing_signature, source)
            # Only normal decoder observations and normal proof constructors
            # enter the normal run metadata read by its ledger sealer.
            step_observation = {"complete": True, "parserVersion": producer.PARSER_VERSION,
                "processingSignature": processing_signature, "recognizedParameters": sorted(found),
                "zonesTouched": len(touched), "sourceAsset": source, "currentPartOutcomeProof": proof}
            if offset >= 0:
                observed_steps[valid] = step_observation
            # Historical rows retain their genuine per-hour decoder capture.
            # No operational processedSteps/COMPLETE claim is issued for them.
            need(file.stat().st_size == size and digest(file) == content_sha, "RAW_CHANGED_AFTER_DECODE")
            wire_items.append({"type": "Feature", "id": item_id, "collection": "dkss_nsbs",
                "properties": {"forecast:reference_datetime": time_text(model_reference), "datetime": valid,
                    "created": time_text(model_reference), "updated": time_text(model_reference)},
                "assets": {"data": {"href": href, "type": "application/x-grib", "roles": ["data"], "file:size": size}}})
            originals.append({"relativePath": str(file.relative_to(normal_root if code598_root is not None else out)),
                "bytes": size, "sha256": content_sha})
        for part in targets:
            for offset in (*history_offsets, *OFFSETS):
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
            originals.append({"relativePath": str(file.relative_to(normal_root if code598_root is not None else out)),
                "bytes": size, "sha256": content_sha})
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
        bind_catalog_run_headers(producer, document, official)
        producer.seal_current_operational_checkpoint(document, targets, reference, official)
        need(producer.current_operational_cache_ready(document, targets, reference), "NORMAL_LEDGER_NOT_READY")
        initial_observations = None
        if initial_phase or current598:
            initial_weather = module('source_current_initial_weather',
                ROOT / 'scripts/fixtures/source19-current-initial-weather.py')
            initial_observations = initial_weather.add_initial_weather(
                eccodes, producer, targets, zones, document, reference, out, originals,
                **({"private_history_start": history_start,
                    **({"raw_original_root": normal_root} if code598_root is not None else {})} if current598 else {}))
        write_dmi_bulk_document(out / BASIS[0], document)
        need(read_dmi_bulk_document(out / BASIS[0])["zoneRegistrySignature"] == signature, "NORMAL_BULK_READBACK")
        finish_normal_basis(node, out, reference, producer, targets, document,
            initial_phase=initial_phase, current598=current598, code598_root=code598_root)
        write_new(out / "native-provider-stac-wire.json", {"syntheticTestInput": True,
            "stacRoot": producer.STAC_ROOT, "collections": catalogs})
        write_new(out / "native-provider-raw-inputs.json", {"syntheticTestInput": True,
            "rawOriginals": originals, "nativeHours": len(OFFSETS), "partCount": len(targets),
            "copernicusRecords": 0, "allWeatherComplete": False, "stacTransportCalls": wire.calls,
            **({"initialPhase": initial_phase, "actualInitialDecodeObservations": initial_observations}
               if initial_phase else {}),
            **({"profile": "current598-preparation", "actualDecodedWeatherObservations": initial_observations,
                "privateHistoryInputHours": len(history_offsets), "privateHistoryStartAt": time_text(history_start),
                "normalHistoryDemandSha256": digest(out / ".cache/current598-history-demand.json"),
                "publicForecastInputHours": len(OFFSETS) - 3, "privateTPlus3SupportHours": 3,
                "fullRuntimeProduced": False, "scoreProduced": False, "actionInvoked": False,
                "sourceOwnerIssued": False, "productionProof": False} if current598 else {}),
            **({"rawOriginalRoot": str(normal_root), "normalCode": {"head": CODE598_HEAD, "tree": CODE598_TREE},
                "rawFactory": "DIRECT_GENUINE37_CANONICAL_ROOT", "rawAdmissionProved": False,
                "sdkExecuted": False} if code598_root is not None else {})})
        return out
    finally:
        socket.create_connection, socket.getaddrinfo = original_connect, original_lookup
        os.chdir(old_cwd)
        sys.path[:] = old_path
        os.environ.clear()
        os.environ.update(previous_env)


def import_native_decoder(normal_root, *, current598):
    program = normal_root / "scripts/update-dmi-bulk.py"
    if not current598:
        return module("current_native_real_dmi_decoder", program)
    # Only the credential-free synthetic asset factory shares this import clock.
    # Keep 20 minutes of work and the existing three-minute finalization reserve.
    limits = {"DMI_BULK_MAX_RUNTIME_SECONDS": "1380", "DMI_BULK_FINALIZE_RESERVE_SECONDS": "180"}
    previous = {key: os.environ.get(key) for key in limits}
    try:
        os.environ.update(limits)
        return module("current_native_real_dmi_decoder", program)
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def finish_normal_basis(node, out, reference, producer, targets, document, *, initial_phase=None, current598=False, code598_root=None):
    """Actual existing normal producers, never authored READY/closure/pilot data."""
    normal_root = ROOT if code598_root is None else genuine598_code_root(code598_root)
    from lib.copernicus_current import atomic_write_shadow, file_sha256, make_coverage_collection
    from lib.copernicus_current_source_stage import build_source_stage, atomic_write_source_stage
    from lib.current_field_shadow import empty_document, save_document
    targets_path = normal_root / "data/live/coastal-parts-v2.json"
    bulk = out / BASIS[0]
    cp = out / BASIS[2]
    registry_path = out / ".cache/copernicus-current-targets.json"
    stage_path = out / ".cache/copernicus-current-source-stage.json"
    regional = out / ".cache/current-field-shadow.json"
    fallback = out / BASIS[3]
    closure = out / ".cache/current-operational-closure.json"
    policy = normal_root / "data/current-regional-proxy-policy.json"
    cp_registry = module("current_native_normal_cp_registry", normal_root / "scripts/build-copernicus-target-registry.py")
    registry = cp_registry.build_registry(targets, document, reference, file_sha256(bulk),
        full_coast=False, require_strict_dmi_ledger=True)
    # We supply no remote CP/OM vectors. Only an ACTUAL zero-gap DMI matrix
    # permits the normal CP/OM no-request producers below. Otherwise stop here.
    need(not registry["operationalRequiredPairs"], "NORMAL_COPERNICUS_RESIDUALS_REQUIRE_DATA")
    write_new(registry_path, registry)
    identities = {row["partId"]: row for row in targets}
    sealed_at = datetime.now(timezone.utc)
    # Mirror the normal no-request Copernicus path. The empty record set still
    # requires a real collection seal before the matching READY stage.
    collection = make_coverage_collection(
        production_reference_at=reference,
        target_registry_sha256=registry["targetRegistrySha256"],
        dmi_current_input_sha256=registry["dmiCurrentInputSha256"],
        required_pairs=registry["operationalRequiredPairs"],
        record_refs=[],
        sealed_at=sealed_at,
        advisory_history_required_pairs=registry["advisoryHistoryRequiredPairs"],
        advisory_history_record_refs=[],
    )
    shadow = atomic_write_shadow(cp, acquisitions=[], records=[], collection=collection,
        updated_at=sealed_at, target_identities=identities)
    stage = build_source_stage(registry=registry, shadow=shadow, target_identities=identities,
        shadow_sha256=file_sha256(cp), attempts=[], sealed_at=sealed_at)
    atomic_write_source_stage(stage_path, stage, registry=registry, shadow=shadow,
        target_identities=identities, shadow_sha256=file_sha256(cp))
    save_document(regional, empty_document())
    report_root = out / "data/diagnostics"
    def normal(command):
        # Input fixture only, not a production time-budget or scheduler change.
        subprocess.run(command, cwd=normal_root, stdin=subprocess.DEVNULL, check=True, timeout=120)
    common = ["--targets", str(targets_path), "--dmi", str(bulk), "--registry", str(registry_path),
        "--copernicus", str(cp), "--source-stage", str(stage_path), "--regional", str(regional),
        "--policy", str(policy), "--at", time_text(reference)]
    normal([sys.executable, "-B", str(normal_root / "scripts/fill-open-meteo-current-fallback.py"), *common,
        "--reuse-only", "--critical-only", "--output", str(fallback),
        "--donor-bank", str(out / ".cache/open-meteo-current-donor-bank.json"),
        "--report", str(report_root / "native-open-meteo.json"),
        "--fetch-report", str(report_root / "native-open-meteo-fetch.json")])
    normal([sys.executable, "-B", str(normal_root / "scripts/build-current-operational-closure.py"), *common,
        "--open-meteo", str(fallback), "--output", str(closure), "--report", str(report_root / "native-closure.json")])
    normal([sys.executable, "-B", str(normal_root / "scripts/build-live-current-pilot.py"), *common,
        "--open-meteo", str(fallback), "--closure", str(closure),
        "--control", str(normal_root / "data/current-live-pilot-control.json"),
        "--output", str(out / BASIS[4]), "--report", str(report_root / "native-pilot.json")])
    normal([str(node), str(NATIVE_FORECAST), time_text(reference),
        *(["--current598-code598", str(normal_root)] if code598_root is not None else
          ["--current598"] if current598 else ["--initial-" + initial_phase] if initial_phase else [])])
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
        source = normal_root / relative
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
    write_new(out / "current-source-native-options.json", {"profile": "current598-preparation" if current598 else "current-source-native-initial" if initial_phase else "current-source-native",
        "workRoot": str(ROOT.parent / ("current598-native-inputs" if current598 else "current-source-native-initial-inputs" if initial_phase else "current-source-native-inputs")), "inputRoot": str(out),
        "adminInputs": admin_rows, "providerInputs": provider_rows,
        "targetReferenceAt": (reference + timedelta(hours=48) if initial_phase == 'h0' else reference).strftime("%Y-%m-%dT%H:00:00.000Z")})


if __name__ == "__main__":
    try:
        need(len(sys.argv) in (3, 4, 5), "EXACT_NODE_TARGET_ARGUMENTS")
        code598_root = sys.argv[4] if len(sys.argv) == 5 and sys.argv[3] == "--current598-code598-raw" else None
        need(len(sys.argv) != 5 or code598_root is not None, "EXACT_CODE598_ARGUMENTS")
        current598 = code598_root is not None or len(sys.argv) == 4 and sys.argv[3] == "--current598"
        phase = None if len(sys.argv) == 3 or current598 else {'--initial-h0': 'h0', '--initial-h1': 'h1'}.get(sys.argv[3])
        need(len(sys.argv) == 3 or phase is not None or current598, "EXACT_INITIAL_PHASE_ARGUMENT")
        prepare(Path(sys.argv[1]), sys.argv[2], initial_phase=phase, current598=current598, code598_root=code598_root)
    except BaseException as error:
        try:
            # Reuse the existing terminal exception/frame reader only AFTER
            # the actual failure. No native work or caller is retried here.
            observer = module('source_provider_boundary_observer',
                ROOT / 'scripts/test-source19-terminal-failure-proof-bank-v17-observer-native.py')
            projected = observer.source_provider_boundary_failure(error)
            if projected is not None:
                print(json.dumps(projected, separators=(',', ':')), file=sys.stderr, flush=True)
        except BaseException:
            pass
        raise
