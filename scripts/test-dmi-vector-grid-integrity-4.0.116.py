#!/usr/bin/env python3
from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed, water_temperature_surface_layer, vector_vertical_layer, prefer_vector_layer

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
# current layers, the deepest available layer wins deterministically.
surface = vector_vertical_layer("current", "surface", None)
depth_1 = vector_vertical_layer("current", "depthBelowSea", 1)
depth_7 = vector_vertical_layer("current", "depthBelowSea", 7)
assert surface == ("surface:0", 0.0)
assert depth_1 == ("depthbelowsea:1", 1.0)
assert depth_7 == ("depthbelowsea:7", 7.0)
assert surface[0] != depth_1[0] != depth_7[0]
assert prefer_vector_layer(None, depth_1[1])
assert prefer_vector_layer(depth_1[1], depth_7[1])
assert not prefer_vector_layer(depth_7[1], depth_1[1])
print("OK: DMI current U/V pairing is depth-layer aware and deterministic.")


assert water_source_parameter_allowed("sea-mean-deviation")
for parameter in ("current-u", "current-v", "water-temperature", "wind-u-10m", "wind-v-10m", "significant-wave-height"):
    assert not water_source_parameter_allowed(parameter), f"Water source must not be sampled for {parameter}"
print("OK: water-source helper points request water level only.")


assert water_temperature_surface_layer("surface", 0) == ("surface:0", 0.0)
assert water_temperature_surface_layer("SURFACE", "0") == ("surface:0", 0.0)
for level_type, level in (("depthBelowSea", 1), ("depthBelowSea", 30), ("surface", 1), (None, None)):
    assert water_temperature_surface_layer(level_type, level) is None
print("OK: DMI water temperature accepts only the explicit surface layer.")


# Regression for production #1738: Limfjord sampling must search broadly enough
# to discover a shared wet U/V point while preserving the existing 24 km accept cap.
from pathlib import Path
bulk_source = Path("scripts/update-dmi-bulk.py").read_text()
assert 'DMI_BULK_GRID_CANDIDATES", "64"' in bulk_source
assert 'DMI_BULK_LIMFJORD_GRID_CANDIDATES", "128"' in bulk_source
assert '0.20, 0.26' in bulk_source
assert 'MAX_GRID_DISTANCE_KM = {"limfjord": 24.0' in bulk_source
assert 'vector_candidates.setdefault((family, zone["id"], layer_key), {})' in bulk_source
assert 'prefer_vector_layer(previous_layer_rank, layer_rank)' in bulk_source
assert '"verticalLayer": layer_key' in bulk_source
assert 'rejectedNonSurfaceWaterTemperatureMessages' in bulk_source
assert 'water_temperature_surface_layer' in bulk_source
assert 'family in {"current", "wind-tail"}' in bulk_source
assert 'search.setdefault("vectorPairs", {}).setdefault(family, {})' in bulk_source
print("OK: Marine U/V search examines broad land-mask windows, preserves physical caps, and diagnoses current and wind-tail pairs.")
