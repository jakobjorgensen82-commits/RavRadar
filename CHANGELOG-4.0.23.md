# RavRadar 4.0.23 – DMI marine coverage expansion

- Marine DKSS-models may now overlap instead of being blocked by `coastType`.
- Each zone tests up to 16 deduplicated grid candidates using several ecCodes probes.
- Candidate distance is recalculated from the real zone point, and distant points are rejected.
- One coherent marine collection is selected per zone using distance and geographic model priority; U, V and water level are not intentionally mixed across models.
- Two DMI collections may be processed per workflow run, with a larger but bounded runtime budget.
- Ocean diagnostics distinguish fresh DMI coverage, preserved valid DMI cache and missing/fallback zones.
- Missing zones receive concrete causes and per-collection attempt details.
