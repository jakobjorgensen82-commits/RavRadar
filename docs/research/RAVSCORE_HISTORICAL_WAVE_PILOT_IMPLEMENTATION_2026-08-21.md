# RavScore historical wave pilot - implementation 2026-08-21

## Purpose

The pilot finds real historical storm shapes without waiting for future weather. It is private, score-neutral and deliberately separate from RavRadar's DMI-first production fallback.

## Small first stage

- Four existing authoritative sentinels cover open west coast, Skagerrak, an inner eastern coast and Bornholm.
- The North West Shelf and Baltic hourly wave reanalyses are sampled for at most one year per manual run.
- Each request is a tiny box around one existing water point. No point is moved.
- Limfjord is excluded because the available reanalysis resolution cannot support local nearshore precision there.
- Only significant wave height, wave-from direction and peak period are retained as private derived features.
- Temporary NetCDF subsets are deleted and never uploaded.
- The artifact contains part identifiers, times, wave features and event candidates, but no coordinates, raw U/V vectors or credentials.

Official source coverage:

- [North West Shelf wave reanalysis](https://data.marine.copernicus.eu/product/NWSHELF_REANALYSIS_WAV_004_015/services): 1980 onward.
- [Baltic wave hindcast](https://data.marine.copernicus.eu/product/BALTICSEA_MULTIYEAR_WAV_003_015/services): hourly from 1980 onward.

The pilot starts at 1993 so selected events can later be paired with the North West Shelf hourly current and sea-level reanalysis.

## Safety contract

- Manual workflow only; there is no schedule.
- Maximum requested span is 366 days.
- Latest central admin geometry is rebuilt in the ephemeral GitHub runner before sampling.
- Credentials exist only as GitHub secrets.
- Output recursively rejects coordinate, geometry, raw current-vector and credential fields.
- Artifact retention is seven days.
- No production dataset, public runtime, active score, DMI preference or fallback rule is changed.
- No automatic model activation is allowed.

## Event discovery

For each sentinel, the script calculates its own 90th-percentile wave-height threshold, with a 0.5 m lower floor, and groups energetic samples separated by no more than six hours. The result is a candidate list, not a claim that each window transported amber.

The relative threshold is used only to obtain varied real event shapes across differently exposed coasts. It must not become a universal RavScore threshold.

## Next stage after the first artifact

1. Inspect event coverage and reject masked, distant or incomplete samples.
2. Select 12 balanced windows by basin, direction and event phase without using individual amber finds.
3. Fetch hourly current and sea level only around those windows.
4. Replay active A/B and private D/E/F candidates through build-up, peak and recession.
5. Compare score, direction, phase, confidence and explanation.

This two-stage design avoids nationwide multi-year current downloads and prevents Copernicus research data from silently replacing DMI production data.
