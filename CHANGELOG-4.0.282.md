# Changelog 4.0.282

## Candidate G – eksakt native reference ved vinduesskift

- Retter et afgrænset vinduesskift for de otte godkendte regionalproxyer med ægte tretimerskadence.
- Genbruger kun den seneste eksakte verificerede måling, når den ligger umiddelbart før beregningsvinduet og højst tre timer tilbage.
- Reducerer referencen til tid og kystrelativ transportstyrke, før den indgår i Candidate G-state. Rå strømvektorer, koordinater og punkt-id'er føres ikke videre.
- Opfinder ingen mellemtimer, ny måling, pil eller mobilisering. Mere end tre timers afstand stopper fortsat lokalt.
- Tilføjer målrettede regressionstests for vinduesgrænsen, dataminimering og produktionskoblingen.
- Candidate G forbliver eneste offentlige scoreprofil med 20 % søgeforhold, 50 % transport og 30 % rav i bevægelse. Scorekurver, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede.
- `data/kystdata.json` og `data/zones.geojson` ændrer kun topversionsfelt fra 4.0.281 til 4.0.282.

Se DEC-0078.
