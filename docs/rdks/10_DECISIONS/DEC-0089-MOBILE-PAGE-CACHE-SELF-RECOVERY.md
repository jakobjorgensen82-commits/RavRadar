# DEC-0089 – selvrecovery efter mobil browser-sidecache

**Status:** Historisk produktionsverificeret i 4.0.292; fysisk regression efter senere progressiv opstart skærpes i DEC-0094/4.0.297
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
- Lokal og offentlig 390 × 844-browsernavigation **Forside → Om RavRadar → browsertilbage** bekræftede dengang synligt kort, 210 farvede zoner, fem **Bedste områder** og fem færdige prognoserækker uden konsolfejl/advarsler. PR #192, produktion `33127437790` og Pages `98711255270` var grønne. Ejerens senere fysiske mobilprøve efter 4.0.295/296 viste, at genoptegning ikke er tilstrækkelig under alle mobile bfcache-forløb; den skærpede hard-reload-failsafe og nye fysiske bevispligt står i DEC-0094.

Den senere bredere lokale Spørg RavRadar-vidensbase er fortsat read-only. DEC-0094 erstatter den mobile genoptegningsdel, men bevarer denne beslutnings datamæssige og faglige afgrænsning.
