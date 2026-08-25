# RavRadar 4.0.277

## Årsagstro mellemtimer for native regional strøm

- Candidate G behandler nu de otte godkendte `dkss_lf`-regionalproxyers naturlige tretimerskadence uden at skrive falske manglende timer ind i den bevarede transporthistorik.
- Kun den seneste afledte transporttilstand fastholdes i højst tre timer. Der tilføjes ingen bevægelse, måling eller evidens, og mellemtimen viser ingen strømvektor, hastighed, retning eller pil.
- Fremtidige strømprøver kan ikke længere tælle som aktuel dækning. Almindelig DMI- og Copernicus-strøm kræver fortsat den eksakte målreference.
- Næste ægte native prøve integrerer den faktiske forløbne tid. Over tre timer eller enhver kilde-/punktændring stopper fortsat lokalt fail-closed.
- Den allerede dokumenterede Candidate G-historik bevares. Der udføres ingen backfill, interpolation eller rekonstruktion.

## Uændret

Candidate G er fortsat eneste offentlige scoreprofil med 20/50/30 og uden legacyfallback eller rollback. Scorekurver, vejrregler, zoner, geometri, land-/vandpunkter og central admin-data er uændrede. `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfelt fra 4.0.276 til 4.0.277.

## Verifikation

Målrettede lokale tests er grønne. Exact-head-kildegate, frisk produktion og offentlig efterkontrol afventer.
