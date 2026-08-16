#!/usr/bin/env python3
from lib.dmi_cache_migration import prune_previous_sampling_mismatches, same_sampling_point


assert same_sampling_point([10, 56], [10.00000005, 56])
assert not same_sampling_point([10, 56], [10.01, 56])
assert not same_sampling_point(None, [10, 56])

previous = {
    "zones": {
        "unchanged": {"samplingPoint": [10, 56], "hourly": {"t": {"current-u": 0.1}}},
        "moved": {"samplingPoint": [11, 57], "hourly": {"t": {"current-u": 0.2}}},
        "deleted": {"samplingPoint": [12, 58], "hourly": {}},
    }
}
current = [
    {"id": "unchanged", "lon": 10, "lat": 56},
    {"id": "moved", "lon": 11.1, "lat": 57},
    {"id": "research", "lon": 13, "lat": 59, "researchCurrent": True},
]
removed = prune_previous_sampling_mismatches(previous, current)
assert set(removed) == {"moved", "deleted"}
assert list(previous["zones"]) == ["unchanged"]
assert previous["zones"]["unchanged"]["hourly"], "Uændret punktcache skal bevares"

print("DMI sampling-point cache migration passed.")
