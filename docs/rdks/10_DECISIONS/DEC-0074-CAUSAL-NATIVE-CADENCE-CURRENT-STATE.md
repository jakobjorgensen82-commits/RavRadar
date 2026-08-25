# DEC-0074 – årsagstro strømreference ved native tretimerskadence

**Status:** IMPLEMENTERET OG MERGET I 4.0.277 – AFVENTER GENTAGET PRODUKTIONSBEVIS

**Dato:** 2026-08-25

**Berører:** Candidate G's 48-timers transportvindue, de otte ejerallowlistede `dkss_lf`-regionalproxyer, aktuel scoretilgængelighed og strømproveniens

**Ændrer ikke:** Candidate G's 20/50/30-formel, transportkurven, mobiliseringsregler, zoner, kystgeometri, land-/vandpunkter eller central admin-data

## Problem

De otte godkendte regionalproxyer leverer ægte U/V-prøver på modellens native tretimerskadence. Ved en mellemliggende time kunne produktionsbyggeren fejlagtigt tælle en senere, fremtidig prøve som aktuel dækning. Den efterfølgende, timeskarpe audit afviste den samme prøve korrekt. Resultatet blev 666/673 ved den aktuelle time og et sikkert stop før deploy.

Candidate G-pipelinen skrev samtidig de naturlige mellemtimer som manglende evidens ind i det rullende vindue. Det brød en ellers gyldig native tretimersserie. Den tidligere verificerede historik var ikke tabt; fejlen lå i behandlingen af timerne mellem to ægte modelprøver.

## Beslutning

1. Al strømudvælgelse er årsagstro: kun en prøve på eller før målreferencen må anvendes. En fremtidig prøve kan aldrig gøre den aktuelle time aktiv.
2. Almindelig DMI- og Copernicus-strøm kræver fortsat en eksakt prøve ved målreferencen.
3. Kun de otte ejerallowlistede `dkss_lf`-regionalproxyer må fastholde den seneste **afledte transporttilstand** frem til næste native prøve, højst tre timer efter den seneste verificerede reference.
4. Fastholdelsen tilføjer ingen bevægelse, ingen evidens og ingen ny måling. Den må ikke vise U/V, hastighed, retning eller strømpil ved mellemtimen.
5. Næste ægte native prøve integrerer den faktiske forløbne tid siden den seneste ægte prøve. Der opfindes ingen timesmålinger imellem.
6. Mere end tre timers afstand, ændret punktkontekst, forkert kildeklasse eller manglende verificeret reference giver lokal utilgængelighed fail-closed.
7. Ved kompatibel overgang må kun tidligere syntetiske null-markører mellem verificerede regionalproxyprøver fjernes. Verificeret evidens bevares uændret; der udføres ingen backfill, interpolation eller rekonstruktion.
8. Candidate G 20/50/30 forbliver eneste offentlige scoreprofil. Der findes ingen legacyfallback eller rollbackprofil.

## Kontrol

- Målrettede tests beviser 48 timers native serie, uændret tilstand ved timerne mellem prøverne, integration af den faktiske tretimersafstand ved næste prøve og lokalt stop efter mere end tre timer.
- En fremtidig regionalproxyprøve må ikke tælle som aktuel dækning.
- En fastholdt mellemtime må ikke udstille strømvektor, hastighed, retning eller pil.
- Kompakt state, continuation-recovery, offentlig shadowaudit, profilvalg og central runtime skal acceptere både eksisterende state og den nye eksplicitte transportreference uden at nulstille historik.
- Exact-head-kildegaten og en frisk 210/673-produktion skal bestå før offentlig lukning.

## Produktionsbevis

PR #140 bestod exact-head `32816129342` på `35c8b7fb` og blev merged som `d3b4542f`. Første produktion `32816237198` byggede syvdageshistorik, central vejrtilstand, strømproveniens og offentlig runtime grønt. Fuld validering stoppede derefter før deploy på en statisk kildekodetest, som stadig krævede det tidligere feltnavn `verifiedPartGridPoints` alene. Produktionsauditen kræver allerede korrekt `verifiedScoreReadyParts`, dvs. eksakte dele plus kun dokumenterede native-cadence-tilstande. Testen er rettet til samme kontrakt; ny exact-head, fuld produktion og offentlig efterkontrol afventer.
