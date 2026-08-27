# DEC-0089 – selvrecovery efter mobil browser-sidecache

**Status:** Implementeret i 4.0.292-kandidaten; exact-head, produktion og fysisk iPhone-efterkontrol afventer
**Dato:** 2026-08-27
**Scorepåvirkning:** Ingen
**Data-/geometripåvirkning:** Ingen ud over ren versionsfeltsynkronisering

## Beslutning

1. Forsiden skal håndtere `pageshow` med `persisted=true`, fordi Safari/WebKit kan gendanne en tidligere side fra back/forward-cache uden at køre modulopstarten igen.
2. Hvis kortgrundlag og fulde tilstandsdetaljer allerede er færdige, genberegnes ingen nye input. Leaflet får nyt layout, eksisterende zonefarver genopfriskes, og **Bedste områder**, valgt zone samt **5-dages RavRadar** gengives igen fra den allerede indlæste offentlige tilstand.
3. Hvis browseren frøs siden før kernevisningen var klar, eller hvis detaljehentningen blev afbrudt og ikke afsluttes inden for to sekunder efter retur, genindlæses forsiden rent. En halv initialisering må ikke bevares som en tom side.
4. Et tidligt bootstrapværn installeres før brugerlagring og app-import, så også retur under den tidligste asynkrone opstart kan restituere.
5. Samtidige returhændelser samles til én genoptagelse. Fejl under genoptegning falder fail-safe tilbage til ren genindlæsning.
6. Rettelsen må ikke hente eller skrive konto-/turdata, ændre prognoseinput, Candidate G, RavScore, sortering, vejr, geometri eller land-/vandpunkter.

## Evidens og kontrol

- Den tidligere forside havde ingen `pageshow`-håndtering. Kortet og de to lister blev kun bygget gennem én top-level modulopstart med progressive `requestAnimationFrame`-trin og en asynkron detaljehentning.
- WebKits dokumenterede page-cache-livscyklus genåbner en side gennem `pageshow` i stedet for normal ny opstart. En aktuel WebKit-fejlrapport dokumenterer desuden, at en aktiv `fetch` kan blive afbrudt ved navigation og siden senere gendannes fra det afbrudte punkt.
- En isoleret tilstandskontrakt tester normal load, tidlig ufuldstændig opstart, færdig genoptegning, ventende detaljer, timeout/fejl og dublerede `pageshow`-hændelser. De eksisterende mobil-, første-paint-, progressive femdøgns- og modulversionskontroller er fortsat grønne.
- Lokal 390 px-browsernavigation **Forside → Om RavRadar → browsertilbage** bekræfter, at den ufuldstændige lokale datatilstand starter rent igen. Den ikke-hydrerede worktree mangler fortsat det aktuelle offentlige detaljedatasæt og kan derfor ikke erstatte den krævede efterkontrol på publiceret runtime og fysisk iPhone.

Den planlagte bredere lokale Spørg RavRadar-vidensbase følger først efter denne kritiske livscyklusrelease. Begge assistentveje forbliver read-only.
