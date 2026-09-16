# DEC-0170 – Copernicus kasserer kun journalforsøg med nul aktuelt overlap

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.388, exact-head og livebevis afventer
**Dato:** 2026-09-16

## Evidens

4.0.387 bestod exact-head `35051800082`, PR #330 og providerfri code-only
`35052231130`. Den levende side viser integreret 4.0.387 med 210 zoner og
673 kystdele. Første almindelige weather `35052715440` gennemførte DMI,
gemte cachefremgang og nåede Copernicus.

Copernicus stoppede med `Copernicus source attempt lies outside the DMI-gap
matrix`. Den genbrugelige source-stage blev allerede rebaseret korrekt.
Fejlen kom fra en separat, varigt gemt segmentjournalpost, hvis immutable
bestilling havde nul overlap med den nye produktionsreferences DMI-huller.
Efterfølgende registryfejl var en følge af, at det nye source-stage-checkpoint
aldrig kunne forsegles.

## Beslutning

- Før en gendannet segmentjournal indgår i donorprojektion og nyt source-stage, beholdes kun forsøg med mindst ét `(partId, validTime)` i den aktuelle operationelle DMI-hulmatrix.
- Et forsøg med nul overlap fjernes som forældet kortlivet procesbevis; det må ikke gøre den nye matrix ugyldig.
- Et blandet forsøg med mindst ét aktuelt par bevares helt og byte-/feltmæssigt uændret. Dets bestilling må ikke klippes eller omskrives.
- Positive målinger ligger fortsat i den validerede donorbank og slettes ikke sammen med en irrelevant journalpost.
- Den eksisterende source-stage-validering forbliver streng og er fortsat sidste grænse mod data uden for den aktuelle matrix.
- Livefortsættelsen skal bruge gemt DMI-/Copernicus-fremgang i en almindelig `force=false`-kørsel. Ingen oneoff.

## Afgrænsning

Rettelsen ændrer ikke providerprioritet, Copernicus-produkter, acquisition-
eller målidentitet, nulresultatsemantik, cacheformat, DMI, Open-Meteo,
RavScore, geometri eller komplethedskrav. Scheduler er pauset under leveringen.
