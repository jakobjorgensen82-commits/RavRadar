# RavRadar 4.0.275

## Synkron håndbogskilde før produktion

- Candidate G 20/50/30 er fortsat den eneste offentlige scoremodel.
- Supabase-installationskopien er synkroniseret med repositoryets 4.0.275-håndbog.
- Den fulde produktionsvalidering beholder sit strenge identitetskrav.
- Samme kontrol er føjet til exact-head-kildegaten, så drift opdages før merge og vejrbygning.
- Den eksisterende beskyttede trevejsfletning af centralt godkendte ekspertændringer er uændret.

## Produktionsforløb

PR #135 bestod exact-head og blev merged. Produktion `32775444781` beviste, at central Candidate G-only-hydrering består, men stoppede sikkert før deploy på reel drift mellem webhåndbogen og installationskopien. 4.0.274 nåede derfor ikke den offentlige side.

PR #136 bestod derefter exact-head `32778118765` på `8103143c018253861a154f9fce5b7d937572a166` og blev merged som `59ea4546f3505ed96d2512a9bf5c9925ff7dff2a`. Produktion `32778269487` bestod hele kæden og udgav `rr-20260824211701-210` som 4.0.275 på 210 zoner og 673 kystdele.

Live bruger kun Candidate G 20/50/30. Rollbackprofilen er tom, legacyfallback er forbudt, og manglende Candidate G-grundlag behandles lokalt. Ved slutkontrollen var 0/210 zoner aktive, fordi den sammenhængende 48-timers strømhistorik endnu ikke var komplet. Adminforsiden viser de berørte zone-/søgemådepar og årsagen; der indsættes ingen gammel eller opdigtet score.

## Uændret

RavScore, vejrregler, zoner, kystgeometri og land-/vandpunkter er uændrede. `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfelt fra 4.0.274 til 4.0.275.
