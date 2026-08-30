"""Producer/verifier parity for native DMI component provenance."""
from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

from lib.dmi_native_provenance import (
    CURRENT_VECTOR_SELECTION,
    complete_native_source_for_hour,
    sampling_identity,
)


ROOT = Path(__file__).resolve().parents[1]
# The parity test exercises provenance construction only; an import-safe ecCodes
# stub keeps it independent of the platform GRIB DLL.
eccodes = types.ModuleType("eccodes")
for name in (
    "codes_get", "codes_get_array", "codes_get_elements", "codes_grib_find_nearest",
    "codes_grib_new_from_file", "codes_release",
):
    setattr(eccodes, name, lambda *args, **kwargs: None)
sys.modules["eccodes"] = eccodes
spec = importlib.util.spec_from_file_location("ravradar_update_dmi_bulk", ROOT / "scripts/update-dmi-bulk.py")
assert spec and spec.loader
producer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(producer)

valid_time = "2026-01-01T03:00:00Z"
zone = {
    "id": "PART::TEST",
    "parentZoneId": "ZONE-TEST",
    "coastalPart": True,
    "coastType": "limfjord",
    "lon": 2.0,
    "lat": 1.0,
}
candidate = {
    "gridDefinitionSha256": "a" * 64,
    "longitude": 2.0,
    "latitude": 1.0,
    "distanceKm": 0.0,
    "value": 0.1,
}
capture = {
    "itemId": "exact-stac-item",
    "assetIdentitySha256": "b" * 64,
    "acquiredAt": "2026-01-01T02:00:00Z",
    "itemCreatedAt": "2026-01-01T01:00:00Z",
}
source = producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
    verticalLayer="depthBelowSea:1",
    verticalLayerRankM=1.0,
    vectorSelection=CURRENT_VECTOR_SELECTION,
    vectorSemanticsVersion=3,
)
assert source is not None
entity = sampling_identity(zone)
assert entity is not None
assert complete_native_source_for_hour(source, "current", zone["id"], entity, valid_time)

for field, wrong in (
    ("entityId", "PART::OTHER"),
    ("parentZoneId", "ZONE-OTHER"),
    ("gridDefinitionSha256", "c" * 63),
    ("distanceKm", 1.0),
    ("modelRun", "2026-01-02T00:00:00Z"),
    ("nativeValidTime", "2026-01-01T06:00:00Z"),
    ("collection", "wam_dw"),
    ("vectorSelection", "nearest-shared-grid-cell-no-spatial-interpolation"),
    ("itemId", ""),
    ("acquiredAt", "invalid"),
):
    altered = {**source, field: wrong}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

for field in ("modelRun", "nativeValidTime", "acquiredAt"):
    altered = {**source, field: str(source[field]).removesuffix("Z")}
    assert not complete_native_source_for_hour(altered, "current", zone["id"], entity, valid_time), field

assert producer.native_component_source(
    "wam_dw",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=capture,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None
assert producer.native_component_source(
    "dkss_lf",
    "2026-01-01T00:00:00Z",
    valid_time,
    component="current",
    zone=zone,
    grid_candidate=candidate,
    capture=None,
    spatial_selection="nearest-shared-grid-cell-no-spatial-interpolation",
) is None

print("OK: DMI producer and import-safe native provenance verifier have exact parity.")
