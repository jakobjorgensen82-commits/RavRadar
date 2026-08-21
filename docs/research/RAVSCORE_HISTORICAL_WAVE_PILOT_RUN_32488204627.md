# Historical wave pilot run 32488204627

## Result

The first authenticated 2024 run completed successfully on merge commit `2e58aca7cb247e5a42e46467e437be2d17fe01b1` in 27 minutes and 30 seconds. Central geometry, fixture contract, credential checks, coordinate/raw-vector leakage checks and private artifact upload all passed.

The private artifact contained:

- 20,499 finite wave samples;
- 154 first-stage event candidates;
- North West Shelf and Baltic hindcast sources;
- no coordinates, raw NetCDF, U/V vectors or score impact.

Finite series were present for Kjul Strand, Holmsland Klit and Dueodde. The intended inner sentinel at Ulvshale produced no finite wave records, but the first schema still reported four sentinels. Each valid series also included the product boundary sample at `2025-01-01T00:00:00Z`, one second beyond the requested 2024 end.

## Decision

The run is valid as infrastructure and performance evidence, but not as the final four-sentinel event catalog. It must not feed score comparison automatically.

The next revision:

- replaces Ulvshale with the existing southern Langeland sentinel;
- fails if any required sentinel has no finite records;
- filters every sample to the exact requested interval;
- derives coordinate-free onshore/alongshore/offshore wave alignment;
- selects up to 12 balanced wave windows;
- replaces server-built NetCDF subsets with official lazy `open_dataset()` access.

No land/water point is moved, and the active RavScore and DMI-first production chain remain unchanged.
