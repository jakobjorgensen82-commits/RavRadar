"""Bounded subprocess transport and immutable private subset/receipt storage."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .copernicus_current import canonical_json, valid_sha256
from .copernicus_weather_component_bank import _check_seal, _sealed, _hour, _targets
from .copernicus_weather_components import CONTRACTS, MAX_SUBSET_BYTES
from .copernicus_component_spatial import static_request, inspect_static_subset, eligible_static_cell


DATASET_UPDATING_EXIT = 76
WORKER = Path(__file__).resolve().parents[1] / "run-copernicus-weather-components.py"
# Fixed code-only classifications. Exception text may contain private paths,
# provider payloads or credentials and must never become a report by pattern.
STATIC_FAILURE_CODES = frozenset({
    "CP_STATIC_FIELD_SEMANTICS_INVALID", "CP_STATIC_FIELD_UNIT_INVALID",
    "CP_STATIC_FIELD_DIMENSIONS_INVALID", "CP_STATIC_FIELD_VALUE_MISSING",
    "CP_STATIC_MASK_SURFACE_INVALID", "CP_STATIC_MASK_SURFACE_MISSING",
    "CP_STATIC_REQUEST_RECEIPT_INVALID", "CP_STATIC_SIZE_LIMIT",
    "CP_STATIC_PAYLOAD_INVALID", "CP_STATIC_DECODED_SIZE_LIMIT",
    "CP_STATIC_DECODE_FAILED", "CP_STATIC_DATASET_IDENTITY_CONFLICT",
    "CP_STATIC_COORDINATE_INVALID", "CP_STATIC_GRID_DIMENSIONS_INVALID",
    "CP_STATIC_NATIVE_CELL_OUTSIDE_BOUND", "CP_STATIC_MASK_OR_DEPTH_INVALID",
    "CP_COORDINATE_MISSING_OR_AMBIGUOUS", "CP_COORDINATE_SEMANTICS_INVALID",
})


class ComponentTransportDeferred(RuntimeError):
    """Code-only retryable work, never completed-negative upstream evidence."""


def _inspect_static_for_transport(path: Path, *, contract_key: str, target: dict, receipt: dict) -> dict:
    try:
        return inspect_static_subset(path, contract_key=contract_key, target=target, receipt=receipt)
    except (OSError, ValueError, RuntimeError) as error:
        code = str(error)
        reason = "CP_COMPONENT_" + code[3:] if code in STATIC_FAILURE_CODES else "CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE"
        raise ComponentTransportDeferred(reason) from None


def atomic_json(path: Path, value: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix="." + path.name, suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(canonical_json(value))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def subset_arguments(request: dict, contract_key: str, output_directory: Path) -> dict:
    """Generate the entire provider call from pinned fields, not caller kwargs."""
    _check_seal(request, "requestSha256")
    contract = CONTRACTS.get(contract_key)
    if contract is None:
        raise ValueError("CP_TRANSPORT_PRODUCT_UNPINNED")
    target = _targets([request["target"]])[request["target"]["partId"]]
    static = request.get("kind") == "CP_PINNED_STATIC_REQUEST"
    if static:
        if request != static_request(contract_key, target):
            raise ValueError("CP_TRANSPORT_STATIC_REQUEST_INVALID")
    elif (request.get("contractKey") != contract_key or request.get("productId") != contract.product_id
          or request.get("datasetId") != contract.dataset_id or request.get("datasetVersion") != contract.dataset_version
          or request.get("variables") != [f[0] for f in contract.fields] or request.get("raiseIfUpdating") is not True):
        raise ValueError("CP_TRANSPORT_DYNAMIC_REQUEST_INVALID")
    lon, lat = target["waterPoint"]
    kwargs = {"dataset_id": request["datasetId"], "dataset_version": request["datasetVersion"],
        "variables": request["variables"], "minimum_longitude": lon, "maximum_longitude": lon,
        "minimum_latitude": lat, "maximum_latitude": lat, "coordinates_selection_method": "nearest",
        "file_format": "netcdf", "service": "static-arco" if static else "geoseries", "disable_progress_bar": True,
        "raise_if_updating": True, "output_directory": Path(output_directory), "output_filename": "subset.nc",
        "overwrite": True, "netcdf_compression_level": 1}
    if static:
        kwargs["dataset_part"] = request["datasetPart"]
    else:
        times = [_hour(t) for t in request["expectedTimes"]]
        if not times or times != sorted(set(times)):
            raise ValueError("CP_TRANSPORT_TIME_AXIS_INVALID")
        kwargs.update(start_datetime=times[0], end_datetime=times[-1])
        if contract.surface_depth_m is not None:
            kwargs.update(minimum_depth=contract.surface_depth_m, maximum_depth=contract.surface_depth_m)
    return kwargs


def subset_worker(envelope_path: Path, output_directory: Path) -> int:
    """Child-only provider call. Parent enforces hard wall time and byte budget."""
    import copernicusmarine
    envelope = json.loads(Path(envelope_path).read_text(encoding="utf-8"))
    kwargs = subset_arguments(envelope["request"], envelope["contractKey"], output_directory)
    try:
        response = copernicusmarine.subset(**kwargs)
    except copernicusmarine.DatasetUpdating:
        return DATASET_UPDATING_EXIT
    path = Path(response.file_path).resolve(strict=True)
    if path != (Path(output_directory) / "subset.nc").resolve() or not 0 < path.stat().st_size <= MAX_SUBSET_BYTES:
        return 1
    return 0


class ComponentSubsetCache:
    """Immutable .nc objects; exact request+payload receipts survive restarts."""
    def __init__(self, directory: Path):
        self.directory = Path(directory)
        self._receipt_index: dict[str, list[str]] | None = None

    def _indexed_receipts(self, request_hash: str) -> list[str]:
        # One bounded directory scan serves all retained PART rows. A mutable
        # static pointer alone cannot identify an older row's original cell.
        if self._receipt_index is None:
            index: dict[str, list[str]] = {}
            directory = self.directory / "receipts"
            if directory.exists():
                with os.scandir(directory) as entries:
                    for entry in entries:
                        match = re.fullmatch(r"([0-9a-f]{64})-([0-9a-f]{64})\.json", entry.name)
                        if not match:
                            continue
                        if entry.is_symlink():
                            continue  # Invalid local leaf cannot block unrelated request keys.
                        index.setdefault(match.group(1), []).append("sha256:" + match.group(2))
            self._receipt_index = index
        candidates = sorted(set(self._receipt_index.get(request_hash[7:], [])))
        if len(candidates) > 128:
            raise ValueError("CP_STATIC_ORIGINAL_VARIANT_LIMIT")
        return candidates

    def object_path(self, digest: str) -> Path:
        if not valid_sha256(digest):
            raise ValueError("CP_SUBSET_OBJECT_HASH_INVALID")
        return self.directory / "objects" / (digest[7:] + ".nc")

    def receipt_path(self, request_hash: str, subset_hash: str) -> Path:
        if not valid_sha256(request_hash) or not valid_sha256(subset_hash):
            raise ValueError("CP_SUBSET_RECEIPT_HASH_INVALID")
        return self.directory / "receipts" / (request_hash[7:] + "-" + subset_hash[7:] + ".json")

    def load_receipt(self, request: dict, subset_hash: str) -> tuple[Path, dict]:
        receipt = json.loads(self.receipt_path(request["requestSha256"], subset_hash).read_text(encoding="utf-8"))
        _check_seal(receipt, "receiptSha256")
        if (receipt.get("kind") != "CP_PINNED_SUBSET_RECEIPT" or receipt.get("request") != request
            or receipt.get("requestSha256") != request["requestSha256"] or receipt.get("subsetSha256") != subset_hash):
            raise ValueError("CP_SUBSET_RECEIPT_BINDING_INVALID")
        path = self.object_path(subset_hash)
        if path.stat().st_size != receipt["sizeBytes"] or not 0 < path.stat().st_size <= MAX_SUBSET_BYTES:
            raise ValueError("CP_SUBSET_RECEIPT_SIZE_INVALID")
        with path.open("rb") as handle:
            payload = handle.read(MAX_SUBSET_BYTES + 1)
        if "sha256:" + hashlib.sha256(payload).hexdigest() != subset_hash:
            raise ValueError("CP_SUBSET_RECEIPT_BYTES_INVALID")
        return path, receipt

    def store(self, request: dict, path: Path) -> tuple[Path, dict]:
        if not 0 < path.stat().st_size <= MAX_SUBSET_BYTES:
            raise ValueError("CP_SUBSET_SIZE_LIMIT")
        with path.open("rb") as handle:
            payload = handle.read(MAX_SUBSET_BYTES + 1)
        if len(payload) > MAX_SUBSET_BYTES:
            raise ValueError("CP_SUBSET_SIZE_LIMIT")
        digest = "sha256:" + hashlib.sha256(payload).hexdigest()
        destination = self.object_path(digest)
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Immutable content address: never overwrite a previous generation.
        if destination.exists():
            if destination.stat().st_size != len(payload) or destination.read_bytes() != payload:
                # The freshly downloaded payload has exactly this content
                # address; existing bytes at that name are corrupt. Preserve
                # them privately for diagnosis, then repair that slot only.
                quarantine = self.directory / "quarantine" / (uuid.uuid4().hex + ".nc")
                quarantine.parent.mkdir(parents=True, exist_ok=True)
                os.replace(destination, quarantine)
                os.replace(path, destination)
        else:
            os.replace(path, destination)
        receipt = _sealed({"kind": "CP_PINNED_SUBSET_RECEIPT", "schemaVersion": 1,
            "requestSha256": request["requestSha256"], "request": request, "subsetSha256": digest,
            "sizeBytes": len(payload), "acquisitionAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}, "receiptSha256")
        receipt_path = self.receipt_path(request["requestSha256"], digest)
        if receipt_path.exists():
            # Re-reading identical bytes never changes their original receipt.
            try:
                existing = self.load_receipt(request, digest)
            except (OSError, ValueError, KeyError):
                quarantine = self.directory / "quarantine" / (uuid.uuid4().hex + ".json")
                quarantine.parent.mkdir(parents=True, exist_ok=True)
                os.replace(receipt_path, quarantine)
            else:
                if request.get("kind") == "CP_PINNED_STATIC_REQUEST":
                    atomic_json(self.directory / "static" / (request["requestSha256"][7:] + ".json"), {"subsetSha256": digest})
                return existing
        atomic_json(receipt_path, receipt)
        self._receipt_index = None
        if request.get("kind") == "CP_PINNED_STATIC_REQUEST":
            atomic_json(self.directory / "static" / (request["requestSha256"][7:] + ".json"),
                        {"subsetSha256": digest})
        return destination, receipt

    def load_static(self, contract_key: str, target: dict) -> dict:
        request = static_request(contract_key, target)
        pointer = self.directory / "static" / (request["requestSha256"][7:] + ".json")
        subset_hash = json.loads(pointer.read_text(encoding="utf-8"))["subsetSha256"]
        path, receipt = self.load_receipt(request, subset_hash)
        return inspect_static_subset(path, contract_key=contract_key, target=target, receipt=receipt)

    def load_static_for_grid(self, contract_key: str, target: dict, grid_point: list[float]) -> dict | None:
        """Find an intact ORIGINAL static subset for a retained dynamic cell.

        Distinct cells may legitimately have different immutable static
        subsets. Contradictory wet/depth proof for the same cell is ambiguous
        and never authorizes a favourable older value by itself.
        """
        request = static_request(contract_key, target)
        matches = []
        for subset_hash in self._indexed_receipts(request["requestSha256"]):
            try:
                receipt_path = self.receipt_path(request["requestSha256"], subset_hash)
                object_path = self.object_path(subset_hash)
                if receipt_path.is_symlink() or object_path.is_symlink():
                    raise ValueError("CP_STATIC_ORIGINAL_SYMLINK_INVALID")
                path, receipt = self.load_receipt(request, subset_hash)
                evidence = inspect_static_subset(path, contract_key=contract_key,
                                                 target=target, receipt=receipt)
            except (OSError, ValueError, KeyError):
                continue
            if evidence["gridPoint"] == grid_point:
                matches.append(evidence)
        if not matches:
            return None
        physical = lambda item: (item["gridIndex"], item["distanceKm"], item["mask"],
                                 item["maskSurfaceDepthM"], item["depthM"])
        if any(physical(item) != physical(matches[0]) for item in matches[1:]):
            raise ValueError("CP_STATIC_ORIGINAL_CELL_CONFLICT")
        return min(matches, key=lambda item: item["subsetSha256"])


class BoundedComponentTransport:
    def __init__(self, cache: ComponentSubsetCache, *, deadline_epoch: float,
                 request_timeout_seconds: float, maximum_requests: int, maximum_download_bytes: int,
                 run=subprocess.run, clock=time.time, sleep=time.sleep):
        if (not math.isfinite(deadline_epoch) or not 0 < request_timeout_seconds <= 3300
            or type(maximum_requests) is not int or maximum_requests < 1
            or type(maximum_download_bytes) is not int or maximum_download_bytes < 1):
            raise ValueError("CP_COMPONENT_TRANSPORT_BUDGET_INVALID")
        self.cache, self.deadline, self.timeout = cache, deadline_epoch, request_timeout_seconds
        self.maximum_requests, self.maximum_bytes = maximum_requests, maximum_download_bytes
        self.run, self.clock, self.sleep = run, clock, sleep
        self.request_count, self.downloaded_bytes = 0, 0
        self.static_evidence = {}
        self.last_receipt = None

    def can_continue(self) -> bool:
        return self.clock() + 5 < self.deadline and self.request_count < self.maximum_requests and self.downloaded_bytes < self.maximum_bytes

    def download(self, request: dict, contract_key: str) -> tuple[Path, dict]:
        self.cache.directory.mkdir(parents=True, exist_ok=True)
        for attempt in range(2):
            if not self.can_continue():
                raise ComponentTransportDeferred("CP_COMPONENT_TRANSPORT_BUDGET_REACHED")
            remaining = self.deadline - self.clock() - 5
            with tempfile.TemporaryDirectory(prefix=".request-", dir=self.cache.directory) as folder:
                directory = Path(folder)
                envelope = directory / "request.json"
                atomic_json(envelope, {"request": request, "contractKey": contract_key})
                # Validate before spawning too; no arbitrary URLs, variables or
                # kwargs can enter this hard-bounded worker.
                subset_arguments(request, contract_key, directory)
                self.request_count += 1
                try:
                    completed = self.run([sys.executable, str(WORKER), "--subset-worker", str(envelope), str(directory)],
                        timeout=min(self.timeout, remaining), check=False,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                        env={**os.environ, "PYTHONUTF8": "1"})
                except subprocess.TimeoutExpired:
                    raise ComponentTransportDeferred("CP_COMPONENT_SUBSET_TIMEOUT") from None
                if completed.returncode == DATASET_UPDATING_EXIT:
                    if (attempt == 0 and self.can_continue()
                        and self.clock() + 5 + min(45, self.timeout) + 5 < self.deadline):
                        self.sleep(5)
                        continue
                    raise ComponentTransportDeferred("CP_COMPONENT_DATASET_UPDATING")
                if completed.returncode != 0:
                    raise ComponentTransportDeferred("CP_COMPONENT_SUBSET_FAILED")
                path = directory / "subset.nc"
                size = path.stat().st_size
                if size > MAX_SUBSET_BYTES or self.downloaded_bytes + size > self.maximum_bytes:
                    raise ComponentTransportDeferred("CP_COMPONENT_DOWNLOAD_BYTE_BUDGET_REACHED")
                self.downloaded_bytes += size
                return self.cache.store(request, path)
        raise ComponentTransportDeferred("CP_COMPONENT_DATASET_UPDATING")

    def evidence_for(self, contract_key: str, target: dict, *, download: bool = True) -> dict | None:
        request = static_request(contract_key, target)
        key = contract_key, request["requestSha256"]
        if key in self.static_evidence:
            return self.static_evidence[key]
        try:
            evidence = self.cache.load_static(contract_key, target)
        except (OSError, ValueError, KeyError):
            if not download:
                return None
            try:
                path, receipt = self.download(request, contract_key)
                evidence = _inspect_static_for_transport(path, contract_key=contract_key, target=target, receipt=receipt)
            except ComponentTransportDeferred:
                # Preserve the real provider/budget or allowlisted static reason. Turning every
                # failed static request into "evidence unavailable" hides a
                # repeated DatasetUpdating or timeout behind the same code.
                raise
            except (OSError, ValueError, RuntimeError):
                return None
        self.static_evidence[key] = evidence
        return evidence

    def refresh_static(self, contract_key: str, target: dict) -> dict | None:
        """Bounded explicit refresh when the existing static grid cannot prove a native row."""
        request = static_request(contract_key, target)
        path, receipt = self.download(request, contract_key)
        evidence = _inspect_static_for_transport(path, contract_key=contract_key,
                                                target=target, receipt=receipt)
        self.static_evidence[(contract_key, request["requestSha256"])] = evidence
        return evidence

    def acquire_subset(self, request: dict) -> Path:
        evidence = self.evidence_for(request["contractKey"], request["target"])
        if evidence is None:
            raise ComponentTransportDeferred("CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE")
        if not eligible_static_cell(evidence):
            raise ComponentTransportDeferred("CP_COMPONENT_STATIC_CELL_INELIGIBLE")
        path, self.last_receipt = self.download(request, request["contractKey"])
        return path
