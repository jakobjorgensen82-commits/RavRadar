"""Bounded, lossless storage codec for the private DMI bulk document."""
from __future__ import annotations

import contextlib
import copy
import json
import os
import pathlib
import shutil
import stat
from typing import Any, Iterator


STORAGE_SCHEMA = "dmi-bulk-source-dictionary-v1"
GROUPS = ("asset", "spatial", "semantics")
REFERENCE_KEY = "$dmiSource"
MAX_STORED_BYTES = 256 * 1024 * 1024
MAX_LEGACY_BYTES = 1536 * 1024 * 1024
MAX_SOURCE_RECORDS = 2_000_000
MAX_CONTAINER_NODES = 50_000_000
MAX_DEPTH = 64

ASSET_FIELDS = frozenset({
    "collection", "modelRun", "itemId", "assetIdentitySha256", "assetSizeBytes",
    "acquiredAt", "contentLengthBytes", "contentSha256", "itemCreatedAt",
    "itemUpdatedAt", "nativeValidTime",
})
SPATIAL_FIELDS = frozenset({
    "gridPoint", "gridDefinitionSha256", "distanceKm", "samplingPoint",
    "samplingPointSha256", "samplingIdentitySha256", "sourceRegistrySha256",
    "coastalPartId", "partId", "zoneId", "entityId", "entityType",
    "parentZoneId", "samplingContext", "physicalPointSha256", "verticalLayer",
    "verticalLayerRankM",
})


def _reject_non_finite(value: str) -> None:
    raise ValueError(f"non-finite JSON token rejected: {value}")


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _source_containers(document: Any) -> Iterator[dict[str, Any]]:
    if not isinstance(document, dict) or not isinstance(document.get("zones"), dict):
        raise ValueError("DMI bulk document has no zones object")
    for zone in document["zones"].values():
        if not isinstance(zone, dict):
            continue
        hourly = zone.get("hourly")
        rows = (
            hourly.values() if isinstance(hourly, dict)
            else hourly if isinstance(hourly, list)
            else ()
        )
        for row in rows:
            if isinstance(row, dict) and isinstance(row.get("sources"), dict):
                yield row["sources"]


def _partition(source: dict[str, Any]) -> dict[str, dict[str, Any]]:
    if REFERENCE_KEY in source:
        raise ValueError("DMI source collides with reserved storage reference")
    return {
        "asset": {key: value for key, value in source.items() if key in ASSET_FIELDS},
        "spatial": {key: value for key, value in source.items() if key in SPATIAL_FIELDS},
        "semantics": {
            key: value for key, value in source.items()
            if key not in ASSET_FIELDS and key not in SPATIAL_FIELDS
        },
    }


@contextlib.contextmanager
def _encoded_view(document: dict[str, Any]):
    """Temporarily replace source leaves, restoring the caller object in all cases."""
    if ASSET_FIELDS & SPATIAL_FIELDS:
        raise RuntimeError("DMI source storage partitions overlap")
    tables: dict[str, list[dict[str, Any]]] = {group: [] for group in GROUPS}
    indexes: dict[str, dict[bytes, int]] = {group: {} for group in GROUPS}
    replacements: list[tuple[dict[str, Any], str, dict[str, Any]]] = []
    count = 0
    try:
        for sources in _source_containers(document):
            for component in tuple(sources):
                source = sources[component]
                if not isinstance(source, dict):
                    continue
                partitions = _partition(source)
                references: list[int] = []
                for group in GROUPS:
                    value = partitions[group]
                    key = _canonical_bytes(value)
                    index = indexes[group].get(key)
                    if index is None:
                        index = len(tables[group])
                        indexes[group][key] = index
                        tables[group].append(value)
                    references.append(index)
                replacements.append((sources, component, source))
                sources[component] = {REFERENCE_KEY: references}
                count += 1
                if count > MAX_SOURCE_RECORDS:
                    raise ValueError("DMI source record bound exceeded")
        yield {
            "storageSchema": STORAGE_SCHEMA,
            "sourceTables": tables,
            "document": document,
        }, count
    finally:
        for sources, component, source in reversed(replacements):
            sources[component] = source


def encode_dmi_bulk_document(document: dict[str, Any]) -> dict[str, Any]:
    """Return an independent encoded wrapper; intended for tests and tooling."""
    logical = copy.deepcopy(document)
    with _encoded_view(logical) as (wrapper, _count):
        return copy.deepcopy(wrapper)


def _bounded_tree(document: Any) -> int:
    stack = [(document, 0)]
    nodes = 0
    references = 0
    while stack:
        value, depth = stack.pop()
        nodes += 1
        if nodes > MAX_CONTAINER_NODES or depth > MAX_DEPTH:
            raise ValueError("DMI storage structure bound exceeded")
        if isinstance(value, dict):
            if REFERENCE_KEY in value:
                references += 1
            stack.extend((child, depth + 1) for child in value.values())
        elif isinstance(value, list):
            stack.extend((child, depth + 1) for child in value)
    return references


def _validate_tables(tables: Any) -> dict[str, list[dict[str, Any]]]:
    if not isinstance(tables, dict) or set(tables) != set(GROUPS):
        raise ValueError("DMI source table shape is invalid")
    for group in GROUPS:
        rows = tables[group]
        if not isinstance(rows, list) or len(rows) > MAX_SOURCE_RECORDS:
            raise ValueError("DMI source table bound is invalid")
        for value in rows:
            if not isinstance(value, dict) or REFERENCE_KEY in value:
                raise ValueError("DMI source table row is invalid")
            keys = set(value)
            if (
                (group == "asset" and not keys <= ASSET_FIELDS)
                or (group == "spatial" and not keys <= SPATIAL_FIELDS)
                or (group == "semantics" and bool(keys & (ASSET_FIELDS | SPATIAL_FIELDS)))
            ):
                raise ValueError("DMI source table partition is invalid")
    return tables


def decode_dmi_bulk_wrapper(
    wrapper: dict[str, Any], *, stored_bytes: int = 0, expand_sources: bool = True,
) -> dict[str, Any]:
    if not isinstance(wrapper, dict) or set(wrapper) != {
        "storageSchema", "sourceTables", "document",
    } or wrapper.get("storageSchema") != STORAGE_SCHEMA:
        raise ValueError("DMI storage wrapper identity is invalid")
    references_in_tree = _bounded_tree(wrapper["document"])
    if _bounded_tree(wrapper["sourceTables"]) != 0:
        raise ValueError("DMI source table contains a storage reference")
    tables = _validate_tables(wrapper["sourceTables"])
    document = wrapper["document"]
    table_bytes = {
        group: [len(_canonical_bytes(value)) for value in tables[group]]
        for group in GROUPS
    }
    source_count = 0
    logical_upper_bound = max(0, stored_bytes)
    # Pass one validates every reference and the complete expansion bound.
    # Nothing in the caller-owned wrapper is changed until this pass succeeds.
    for sources in _source_containers(document):
        for component in tuple(sources):
            reference = sources[component]
            if not isinstance(reference, dict) or set(reference) != {REFERENCE_KEY}:
                if isinstance(reference, dict):
                    raise ValueError("DMI encoded source reference is invalid")
                continue
            indices = reference[REFERENCE_KEY]
            if not isinstance(indices, list) or len(indices) != len(GROUPS):
                raise ValueError("DMI encoded source tuple is invalid")
            decoded_keys: set[str] = set()
            body_bytes = 0
            nonempty_groups = 0
            for group, index in zip(GROUPS, indices):
                if isinstance(index, bool) or not isinstance(index, int) \
                        or not 0 <= index < len(tables[group]):
                    raise ValueError("DMI encoded source index is invalid")
                value = tables[group][index]
                if decoded_keys & value.keys():
                    raise ValueError("DMI encoded source fields overlap")
                decoded_keys.update(value)
                encoded_bytes = table_bytes[group][index]
                if encoded_bytes > 2:
                    body_bytes += encoded_bytes - 2
                    nonempty_groups += 1
            merged_bytes = 2 + body_bytes + max(0, nonempty_groups - 1)
            logical_upper_bound += max(0, merged_bytes - len(_canonical_bytes(reference)))
            if logical_upper_bound > MAX_LEGACY_BYTES:
                raise ValueError("DMI decoded document exceeds its logical bound")
            source_count += 1
            if source_count > MAX_SOURCE_RECORDS:
                raise ValueError("DMI decoded source record bound exceeded")
    if source_count != references_in_tree:
        raise ValueError("DMI source reference appeared outside an hourly source container")
    if not isinstance(document, dict):
        raise ValueError("DMI decoded document is invalid")
    if expand_sources:
        # Pass two materializes only after the complete wrapper is accepted.
        for sources in _source_containers(document):
            for component in tuple(sources):
                reference = sources[component]
                if not isinstance(reference, dict) or set(reference) != {REFERENCE_KEY}:
                    continue
                decoded: dict[str, Any] = {}
                for group, index in zip(GROUPS, reference[REFERENCE_KEY]):
                    decoded.update(copy.deepcopy(tables[group][index]))
                sources[component] = decoded
    return document


def _read_dmi_bulk_document(
    path: pathlib.Path | str,
    *,
    optional: bool = False,
    expand_sources: bool = True,
    allow_large_legacy: bool = False,
) -> tuple[dict[str, Any], bool]:
    source = pathlib.Path(path)
    try:
        info = source.lstat()
    except FileNotFoundError:
        if optional:
            return {}, False
        raise
    if not stat.S_ISREG(info.st_mode) or source.is_symlink() \
            or not 1 < info.st_size <= MAX_LEGACY_BYTES:
        raise ValueError("DMI bulk input is not a bounded regular file")
    if info.st_size > MAX_STORED_BYTES and not allow_large_legacy:
        raise ValueError("Large legacy DMI input requires explicit migration mode")
    with source.open("r", encoding="utf-8") as handle:
        value = json.load(handle, parse_constant=_reject_non_finite)
    if not isinstance(value, dict):
        raise ValueError("DMI bulk input must be an object")
    if "storageSchema" in value:
        if info.st_size > MAX_STORED_BYTES:
            raise ValueError("DMI encoded input exceeds its stored byte bound")
        return (
            decode_dmi_bulk_wrapper(
                value, stored_bytes=info.st_size, expand_sources=expand_sources,
            ),
            True,
        )
    if not isinstance(value.get("zones"), dict):
        raise ValueError("DMI legacy bulk input has no zones object")
    return value, False


def read_dmi_bulk_document(
    path: pathlib.Path | str,
    *,
    optional: bool = False,
    expand_sources: bool = True,
    allow_large_legacy: bool = False,
) -> dict[str, Any]:
    document, _encoded = _read_dmi_bulk_document(
        path,
        optional=optional,
        expand_sources=expand_sources,
        allow_large_legacy=allow_large_legacy,
    )
    return document


def write_dmi_bulk_document(
    path: pathlib.Path | str,
    document: dict[str, Any],
) -> int:
    destination = pathlib.Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(destination.name + ".tmp")
    try:
        with _encoded_view(document) as (wrapper, _count):
            with temporary.open("w", encoding="utf-8", newline="\n") as handle:
                json.dump(
                    wrapper, handle, ensure_ascii=False, sort_keys=True,
                    separators=(",", ":"), allow_nan=False,
                )
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
        if temporary.stat().st_size > MAX_STORED_BYTES:
            raise ValueError("DMI encoded output exceeds its stored byte bound")
        temporary.replace(destination)
        return destination.stat().st_size
    finally:
        if temporary.exists():
            temporary.unlink()


def materialize_dmi_bulk_document(
    source_path: pathlib.Path | str,
    destination_path: pathlib.Path | str,
) -> dict[str, int | bool]:
    """Validate one bounded input and atomically materialize a normal-size copy.

    A large legacy document is source-dictionary encoded.  An already encoded
    document is copied byte-for-byte after full wrapper validation.  The source
    and destination must differ so a failed migration can never damage the
    restored cache.
    """
    source = pathlib.Path(source_path)
    destination = pathlib.Path(destination_path)
    if source.resolve() == destination.resolve():
        raise ValueError("DMI storage materialization requires a separate output")
    input_bytes = source.lstat().st_size
    document, encoded_input = _read_dmi_bulk_document(
        source,
        expand_sources=False,
        allow_large_legacy=True,
    )
    if encoded_input:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name(destination.name + ".tmp")
        try:
            with source.open("rb") as reader, temporary.open("wb") as writer:
                shutil.copyfileobj(reader, writer, length=1024 * 1024)
                writer.flush()
                os.fsync(writer.fileno())
            if not 1 < temporary.stat().st_size <= MAX_STORED_BYTES:
                raise ValueError("DMI encoded copy exceeds its stored byte bound")
            temporary.replace(destination)
        finally:
            if temporary.exists():
                temporary.unlink()
    else:
        write_dmi_bulk_document(destination, document)
    read_dmi_bulk_document(destination, expand_sources=False)
    output_bytes = destination.stat().st_size
    return {
        "inputBytes": input_bytes,
        "outputBytes": output_bytes,
        "legacyNormalized": not encoded_input,
    }
