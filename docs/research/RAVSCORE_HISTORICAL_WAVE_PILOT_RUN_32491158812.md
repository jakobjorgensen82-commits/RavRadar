# Historical wave pilot run 32491158812

## Verified improvement

The lazy 2024 pilot completed successfully on branch commit `ce5b1e2d53b279f6c7f7c94e8d81f9c303f55c4b` in 1 minute and 14 seconds. The equivalent first run took 27 minutes and 30 seconds. Lazy access was therefore about 22 times faster while applying stricter data contracts.

The private artifact contained:

- exactly 29,280 finite samples in the requested 2024 interval;
- four requested and four covered sentinels;
- 2,928 three-hourly North West Shelf samples;
- 8,784 hourly Baltic samples at each of three sentinels;
- maximum selected-grid distance of 0.78 km;
- 213 first-stage event candidates;
- 12 automatically selected wave windows;
- no coordinates, raw NetCDF, U/V vectors, score impact or DMI fallback change.

The strict end filter removed the extra `2025-01-01T00:00:00Z` boundary sample seen in the first run. Southern Langeland provided a complete inner-eastern series where Ulvshale had been masked.

## Remaining selection issue

The first 12-window algorithm prioritized directional classes globally after attempting one of each class per sentinel. Because some sentinels only had energetic events in one class, the fill step produced an uneven 5/1/3/3 distribution across the four sentinels.

The artifact is valid as source evidence, but that first selection must not automatically drive the current/sea-level fetch. The selector is revised to allocate three windows per sentinel first and then maximize direction diversity within each sentinel.

No active RavScore or public runtime is changed.
