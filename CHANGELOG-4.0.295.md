# RavRadar 4.0.295

## Hurtig offentlig start

- Den offentlige 4.0.294-side hentede ved normal opstart en komplet Candidate G-detaljepakke på cirka 90–132 MB ukomprimeret og beregnede fem nationale top-5-lister i browseren.
- 4.0.295 bygger et lille top-5-indeks for fem dage og begge søgemåder med den eksisterende `selectLocalBestForDay`- og nationale rangeringskontrakt.
- Kortet, **Bedste områder** og **5-dages RavRadar** kan derfor tegnes fra startpakken. Den fulde detaljepakke hentes først ved områdevalg, konto, tur, assistentspørgsmål eller dybt kortzoom.

## Friskhed og fallback

- Manifest og livefiler uden indholdsbinding forbliver `no-store`. Kun en prognosefil med både dataset-id og gyldig manifest-SHA må genbruges fra browserens HTTP-cache.
- Startup og detaljer skal fortsat matche samme dataset og tidspunkt. Den fulde detaljepakke bevares og kontrolleres fortsat af eksisterende hashes.
- En bevaret Candidate G-nødvisning får det kompakte indeks deterministisk fra sit allerede auditerede offentlige datasæt. Detaljepakken, dens hash, dataset-id, tider, scorer og state ændres ikke.

## Isolation

- Candidate G, RavScore, vejr, prognoseinput, national sortering, konto-/turdata, privatliv, geometri og faktiske land-/vandpunkter ændres ikke.
- Geodatafilerne ændrer kun det tilladte topversionsfelt 4.0.294 → 4.0.295.
- Ejerens nye Sibirien-punktrevision forbliver privat staged. Ingen koordinater er læst eller publiceret, og ingen aktivering er udført; ægte grid-/horisont-/48-timerskrav og et senere særskilt ejer-go gælder fortsat.

## Verifikation

- Målrettet top-5-paritet for begge modes/fem dage, dataminimering, lazy load, dataset+SHA-cache, Candidate G-fallback, sidecache-resume, startup, ikke-blokerende prognose, national rangering, sitefunktioner og Pages-modulclosure er grønne lokalt.
- Fuld lokal sourcegate og releasegate er grønne. PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908` er grønne.
- Offentlig version, kort, fem aktuelle områder, fem prognosedage og konsol er grønne; varm ny fane var klar på cirka 3,67 sekunder. Cold-målingen fandt en resterende 3.562.253-byte READY-startprojektion, som lukkes i 4.0.296/DEC-0093.
- Se DEC-0092.
