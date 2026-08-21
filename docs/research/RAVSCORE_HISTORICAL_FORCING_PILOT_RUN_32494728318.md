# RavScore historical forcing pilot - run 32494728318

Date: 2026-08-21

## Result

Authenticated private run `32494728318` completed successfully on exact head `771a1f005f3cb5a9ea2d88a1117a4e83b984312c`.

- 12 selected wave windows were preserved and enriched.
- Four sentinel coasts were covered with three windows each.
- 972 coordinate-free derived samples were stored.
- Event classes were 3 onshore-delivery, 1 offshore-removal, 1 conflicting-wave-current and 7 alongshore-mixed.
- Raw U/V, coordinates and raw NetCDF were not stored.
- Public runtime, DMI fallback, geometry and active score were unchanged.
- Automatic activation remained prohibited.

## Coverage

| Sentinel | Samples | Current grid distance | Sea-level grid distance | Maximum time offset |
|---|---:|---:|---:|---:|
| Kjul | 291 | 0.509 km | 0.509 km | 0 min |
| Holmsland | 99 | 4.672 km | 4.672 km | 0 min |
| Langeland south | 291 | 0.786 km | 0.786 km | 0 min |
| Dueodde | 291 | 0.607 km | 0.607 km | 0 min |

## Diagnostic sequence

The first authenticated attempts selected the geometrically nearest North Sea cell. A safe failure report showed 33 wave samples but zero finite U, V and sea-level samples at that masked cell. The corrected run searched nearby cells and selected the nearest sufficiently covered wet cells without moving the authoritative water point.

The successful artifact measured zero time offset for every sentinel. An earlier half-hour hypothesis was therefore rejected, and the implementation retains exact timestamp matching for both product families.

## Interpretation

The class distribution is evidence from the selected 2024 windows, not a target distribution and not a reason to force artificial symmetry. The result is sufficient to proceed to private RavScore comparison, but not to activate candidate F automatically.
