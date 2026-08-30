#!/usr/bin/env python3
from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed, water_temperature_surface_layer, vector_vertical_layer, vector_choice, prefer_vector_choice

u = [
    {"latitude": 56.0, "longitude": 10.0, "distanceKm": 1.0, "value": 0.2},
    {"latitude": 56.01, "longitude": 10.01, "distanceKm": 2.0, "value": 0.3},
]
v = [
    # V's nearest valid point differs from U's nearest, but the second point is shared.
    {"latitude": 56.02, "longitude": 10.02, "distanceKm": 1.2, "value": -0.1},
    {"latitude": 56.01, "longitude": 10.01, "distanceKm": 2.0, "value": -0.2},
]
pair = select_common_vector_candidate(u, v)
assert pair is not None, "Expected a shared physical U/V point"
assert pair[0]["latitude"] == 56.01 and pair[1]["latitude"] == 56.01
assert same_grid_point(pair[0], pair[1])

assert select_common_vector_candidate(
    [{"latitude": 1, "longitude": 1, "distanceKm": 1, "value": 1}],
    [{"latitude": 2, "longitude": 2, "distanceKm": 1, "value": 1}],
) is None, "Different physical points must never form one vector"

assert not same_grid_point({"latitude": 1, "longitude": 1}, {"latitude": 1.001, "longitude": 1})
print("OK: DMI U/V vectors require one shared physical grid point.")

# Regression for production current-layer pairing: U/V components from different
# DMI depth layers must never compete in one cache bucket. Among valid shared
# current layers, horizontal proximity wins first. Depth can only select among
# layers at the already selected physical water column.
surface = vector_vertical_layer("current", "surface", None)
depth_1 = vector_vertical_layer("current", "depthBelowSea", 1)
depth_7 = vector_vertical_layer("current", "depthBelowSea", 7)
assert surface == ("surface:0", 0.0)
assert depth_1 == ("depthbelowsea:1", 1.0)
assert depth_7 == ("depthbelowsea:7", 7.0)
assert surface[0] != depth_1[0] != depth_7[0]
near_surface = vector_choice(
    {"latitude": 56.0, "longitude": 10.0, "distanceKm": 0.8},
    {"latitude": 56.0, "longitude": 10.0, "distanceKm": 0.8},
    surface[0], surface[1],
)
near_deep = vector_choice(
    {"latitude": 56.0, "longitude": 10.0, "distanceKm": 0.8},
    {"latitude": 56.0, "longitude": 10.0, "distanceKm": 0.8},
    depth_7[0], depth_7[1],
)
far_deep = vector_choice(
    {"latitude": 56.1, "longitude": 10.1, "distanceKm": 12.0},
    {"latitude": 56.1, "longitude": 10.1, "distanceKm": 12.0},
    depth_7[0], depth_7[1],
)
assert prefer_vector_choice(None, near_surface)
assert prefer_vector_choice(near_surface, near_deep), "Deeper layer should win within one column"
assert not prefer_vector_choice(near_surface, far_deep), "Depth must never move current to a farther column"
assert prefer_vector_choice(far_deep, near_surface), "Nearest water column must win before depth"
print("OK: DMI current selects the nearest water column before its deepest valid layer.")


assert water_source_parameter_allowed("sea-mean-deviation")
for parameter in ("current-u", "current-v", "water-temperature", "wind-u-10m", "wind-v-10m", "significant-wave-height"):
    assert not water_source_parameter_allowed(parameter), f"Water source must not be sampled for {parameter}"
print("OK: water-source helper points request water level only.")


assert water_temperature_surface_layer("surface", 0) == ("surface:0", 0.0)
assert water_temperature_surface_layer("SURFACE", "0") == ("surface:0", 0.0)
for level_type, level in (("depthBelowSea", 1), ("depthBelowSea", 30), ("surface", 1), (None, None)):
    assert water_temperature_surface_layer(level_type, level) is None
print("OK: DMI water temperature accepts only the explicit surface layer.")


# Search may inspect a broad land-mask window, but verified current has a strict
# owner-approved 5 km cap and prefers the 0-3 km band.
from pathlib import Path
bulk_source = Path("scripts/update-dmi-bulk.py").read_text()
provenance_source = Path("scripts/lib/dmi_native_provenance.py").read_text()
assert 'DMI_BULK_GRID_CANDIDATES", "64"' in bulk_source
assert 'DMI_BULK_LIMFJORD_GRID_CANDIDATES", "128"' in bulk_source
assert '0.20, 0.26' in bulk_source
assert 'MAX_GRID_DISTANCE_KM = {"limfjord": 24.0' in bulk_source
assert 'vector_candidates.setdefault((family, zone["id"], layer_key), {})' in bulk_source
assert 'CURRENT_PREFERRED_DISTANCE_KM = 3.0' in provenance_source
assert 'CURRENT_MAX_DISTANCE_KM = 5.0' in provenance_source
assert 'prefer_vector_choice(previous_choice, candidate_choice)' in bulk_source
assert 'CURRENT_POINT_OVER_5KM' in bulk_source
assert '"verticalLayer": layer_key' in bulk_source
assert '"vectorSemanticsVersion": CURRENT_VECTOR_SEMANTICS_VERSION' in bulk_source
assert '"gridPoint": [longitude, latitude]' in bulk_source
assert '"samplingPoint": [round(sampling_point[0], 7)' in provenance_source
assert 'def select_common_grid_tuple(' in bulk_source
assert 'gridDefinitionSha256' in bulk_source
assert '"componentKind": COMPONENT_KIND[component]' in bulk_source
assert '"entityId": entity_id' in provenance_source
assert '"parentZoneId": parent_zone_id' in provenance_source
assert '"fieldSet": list(COMPONENT_FIELD_SET[component])' in bulk_source
assert 'previous.get("acquiredAt") if same_capture_identity and iso(previous.get("acquiredAt"))' in bulk_source
assert 'else iso(acquired_at) if acquired_at else None' in bulk_source
assert 'PRIVATE_REPLAY_RETENTION_HOURS = max(' in bulk_source
assert 'rejectedNonSurfaceWaterTemperatureMessages' in bulk_source
assert 'water_temperature_surface_layer' in bulk_source
assert 'family in {"current", "wind-tail"}' in bulk_source
assert 'search.setdefault("vectorPairs", {}).setdefault(family, {})' in bulk_source
print("OK: Marine U/V search is broad, while verified current remains spatial-first and capped at 5 km.")
