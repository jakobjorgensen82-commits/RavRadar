#!/usr/bin/env python3
from lib.dmi_grid_vector import select_common_vector_candidate, same_grid_point, water_source_parameter_allowed

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

assert water_source_parameter_allowed("sea-mean-deviation")
for parameter in ("current-u", "current-v", "water-temperature", "wind-u-10m", "wind-v-10m", "significant-wave-height"):
    assert not water_source_parameter_allowed(parameter), f"Water source must not be sampled for {parameter}"
print("OK: water-source helper points request water level only.")
