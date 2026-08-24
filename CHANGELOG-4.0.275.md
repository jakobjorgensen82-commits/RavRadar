# RavRadar 4.0.275

## Synkron håndbogskilde før produktion

- Candidate G 20/50/30 er fortsat den eneste offentlige scoremodel.
- Supabase-installationskopien er synkroniseret med repositoryets 4.0.275-håndbog.
- Den fulde produktionsvalidering beholder sit strenge identitetskrav.
- Samme kontrol er føjet til exact-head-kildegaten, så drift opdages før merge og vejrbygning.
- Den eksisterende beskyttede trevejsfletning af centralt godkendte ekspertændringer er uændret.

## Produktionsforløb

PR #135 bestod exact-head og blev merged. Produktion `32775444781` beviste, at central Candidate G-only-hydrering består, men stoppede sikkert før deploy på reel drift mellem webhåndbogen og installationskopien. 4.0.274 nåede derfor ikke den offentlige side.

## Uændret

RavScore, vejrregler, zoner, kystgeometri og land-/vandpunkter er uændrede. `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfelt fra 4.0.274 til 4.0.275.
