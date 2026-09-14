# DEC-0144 – Online først efter præcis H0-inputrettelse

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Ejer efter faktisk cache-, cutover- og diagnosebevis
**Berører:** DKSS-vind ved modelrunskifte, state-only-strømhold ved H0, første integrerede cutover, efterfølgende live-fejlsøgning
**Ændrer:** DEC-0143 punkt 8 og de ældre krav om gentagelse af hele den brede kontrolblok før første launch

## Kontekst

4.0.361 bestod exact-head-sourcegate og blev merged gennem PR #298 som main `6337fa09065b38bc578dad1a81a83ddd505bbd0d`. Handoff `34804412079` registrerede alle 79.414 currentpar for 673 dele × 118 timer uden providerhentning. Det var et komplet udfaldsregnskab, men ikke et løfte om en numerisk currentværdi i hvert par.

Cutover `34805083829` byggede 673 dele og gennemførte alle 272 underkontroller. 271 bestod. Den ene fejl var den rumlige strømaudit, og der blev ikke skrevet til produktion.

Den efterfølgende read-only diagnose `34820407527` viste den faktiske H0-tilstand: vind fandtes i DKSS-halen for 669 dele, bølgehøjde, periode og retning for alle 673, direkte currentvektor for 659, otte gyldige regionale state-only-holds, seks lokale currentmangler og vandstand for 669. Alle H0-scorer var null, fordi vindadapteren valgte et globalt interval på tværs af to modelruns og derefter afviste det, selv om et sikkert interval fandtes inden for samme DKSS-run.

## Beslutning

1. DKSS-`windTail` må ved et modelrunskifte vælge interpolation eller kantværdi inden for én eksakt native modelserie og inden for de eksisterende tidsgrænser. Primær HARMONIE-`wind` forbliver streng og må ikke krydse modelruns.
2. Et regionalt state-only-currenthold ved scoretimen må bruge sin eksakte private kildereference, når kilden er højst tre timer gammel, markør, kilde og provenance er kanoniske, og der ikke findes en nyere endelig currentværdi. Senere null-evidens bevares som ukendt historik og må ikke omskrives til målt bevægelse.
3. En sådan holdscore er `HISTORY_INCOMPLETE`, og dens reference peger fortsat på den virkelige ældre kilde. Der opfindes ingen vektor, strømstyrke eller evidens.
4. Første integrerede cutover på 4.0.362 gentager ikke referencezoner, fuld projektvalidering, releasegate og datavalidering inde i launch-jobbet. Udfaldene registreres eksplicit som sprunget over. Den eksakte sourcegate køres én gang på PR-head før merge.
5. Runtimebygning, modelbinding, append-only databasebinding, beskyttede skrivninger, privacy, artifactbygning og offentlig deployment forbliver rigtige tekniske trin. En ærligt markeret lokal eller samlet `UNAVAILABLE` score er ikke i sig selv et launchstop.
6. Efter launch fejlsøges den faktiske offentlige runtime. Almindelig vejrdrift genaktiveres derefter og skal bevise cachevedligeholdelse, DMI-rotation og fallback. Ingen ny oneoff kræves før launch.

## Konsekvenser

- `safeWindSeriesBracket` er begrænset til DKSS-`windTail`; HARMONIE-sikkerheden er uændret.
- Den integrerede runtime og Candidate G-rollback bruger samme eksakte H0-kildereference ved godkendte holds.
- Integrated bundle er `b144ebcd465ef783a7edd1cdb4c4fc07ee64d88185e70b783efeda1459655e04`; Candidate G-rollback bundle er `b4b258f21d645ec33d89c8bb7b41c879e7545b1dfb0b0a5d7c79217d401c16b9`.
- Migration `20260914010000_h0_reference_recovery_binding.sql` er en append-only bindingsfremføring. Historiske migrationer ændres ikke.
- De seks lokale H0-currentmangler kan stadig give lokal `UNAVAILABLE`. Det skal vises ærligt online og undersøges ud fra live-resultatet; det må ikke dækkes med opdigtede data.
- Modellens praktiske kvalitet er ikke bevist af launch. Den vurderes efterfølgende på den kørende hjemmeside og senere virkelige ture.

## Bevis og næste trin

- De direkte DKSS-modelrun- og H0-holdregressioner er grønne.
- Bundlebygning, append-only migrationskæde, binding, installationsrækkefølge og den afgrænsede cutoverstyring er grønne.
- Åbent: én exact-head sourcegate, merge, kort cachebaseret same-head-handoff, cutover, offentlig gennemgang og derefter normal weather.
