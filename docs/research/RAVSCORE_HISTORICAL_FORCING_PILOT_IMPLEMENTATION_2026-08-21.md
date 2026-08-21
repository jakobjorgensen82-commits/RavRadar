# RavScore historical forcing pilot - bounded implementation

Date: 2026-08-21

## Purpose

The wave-first pilot now identifies 12 useful historical windows across four Danish sentinel coasts. The next bounded step enriches only those windows with current and sea-level features. It does not download or process a full year of physics for all 673 coastal parts.

## Scope

- 12 previously selected wave windows.
- Four centrally generated sentinel coastal parts, three windows per coast.
- 24 hours before to 72 hours after each wave peak.
- North Sea current and sea level from the Copernicus NWS multiyear physics datasets.
- Baltic current and sea level from the Copernicus Baltic analysis/forecast physics dataset, which covers the selected 2024 pilot year.

The implementation uses lazy remote access and tight spatial bounds around the existing authoritative water point. It does not move or replace any land or water point.

Provider timestamps are paired without interpolation. Baltic physics must match the wave timestamp exactly. The North Sea physics products use half-hour-centred hourly fields, so their nearest provider time may differ by at most 31 minutes. The actual current and sea-level offsets are retained as derived control fields.

## Stored evidence

The private seven-day artifact stores only the values needed for later comparison:

- wave height, period and onshore alignment;
- derived current speed and onshore alignment;
- model sea level;
- event class and water-level phase;
- source identifiers and non-coordinate grid distance.

It explicitly excludes coordinates, raw U/V vectors, raw NetCDF, credentials and complete production diagnostics. The output is private, score-neutral and cannot activate a candidate automatically.

## Interpretation limit

The model sea level is useful for relative event phase and change. It is not treated as an observed local beach water level. Wave, current and sea-level signals remain separate physical evidence until the later RavScore comparison has been reviewed.

## Cost/benefit

The first wave run spent about 27.5 minutes on server-built year files. Lazy wave access reduced that to about 1.2 minutes. The forcing step follows the same principle and samples only the selected windows, avoiding a national or full-year physics job before the evidence shows it is worthwhile.

## Production impact

None. DMI remains the primary production source. Copernicus remains a narrowly targeted fallback in production and a private research source here. Public scores, UI, geometry, state and deployment contracts are unchanged.
