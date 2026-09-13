# DEC-0140 – cutover gennemfører alle selvstændige kontroller og samler fejl

**Status:** Aktiv lokal beslutning for 4.0.358. Exact-head-CI, merge og cutover afventer.

## Baggrund

Main 4.0.357 er `2c243d9e` efter grøn PR #294/sourcegate `34767862281`. Handoff `34768997271` blev grønt fra de eksisterende fire cacher uden provider, oneoff eller ny national audit. Cutover `34769550035` gennemførte sine fem hovedkontroller, men den fulde projektvalidering stoppede ved første forældede underkontrol. Senere underkontroller blev derfor ikke forsøgt, og den samlede rapport med én hovedfejl var ikke en komplet liste over underfejl.

Astra-reviewet fandt samtidig en gammel public-runtime-test, tre endnu ikke nåede shelludtræk, som stopper på gyldigt `false`, samt en Pages-kontrol, der sammenblander tilgængelige scorer og rå modelhukommelse. Selve den integrerede scorematematik viste ingen ny konkret fejl i den afgrænsede kode- og syntetikgennemgang. Det er ikke empirisk bevis for fundpræcision.

## Beslutning

1. Ved `integrated-cutover` udvides `npm run validate` til sin deklarerede plan af selvstændige Node-/Python-kommandoer. Alle planlagte kommandoer forsøges, også efter tidligere fejl. Et child-resultat må ikke skjule senere selvstændige kontroller.
2. Den payloadfri rapport skrives før første kommando, markeres løbende med `not-run`, `running` og afsluttede udfald og bindes til hele planen med SHA-256. Kun en rapport med alle planlagte udfald kan være `PASSED` eller `FAILED`; en afbrudt rapport forbliver `IN_PROGRESS` og kan ikke godkendes som komplet.
3. Den tidligere skjulte `test-dmi-oneoff-fill.py` flyttes ud af bunden af den store workflowtest og ind i den deklarerede plan. Den bliver derfor forsøgt uafhængigt af tidligere assertions i workflowtesten.
4. Alle fem cutover-hovedkontroller er fortsat bindende. De afsluttes og samles i én top-rapport. Ved én eller flere fejl stoppes der én gang efter hele kontrolblokken og før database-, checkpoint- og Pages-writes. Når alle er grønne, fortsætter den eksisterende installation automatisk.
5. Ukendte eller produktkritiske fejl gøres ikke generelt vejledende. Den lokale kladdes blanket-fritagelse af fuld validering forkastes. Workflow, releasegate og maskinlæsbar slutstatus skal alle kræve grøn fuld validering før deploy.
6. First-cutover-buildjobbet får et samlet loft på 180 minutter til den udvidede fejlgennemgang og de efterfølgende afhængige trin. Normal build forbliver 90 minutter. DMI-, Copernicus-, Open-Meteo- og almindelige weather-budgetter ændres ikke.
7. Den gamle forecasttest bruger komplet DMI-proveniens, korrekt afstand, konkrete forventede U/V-/hastigheds-/retningstal og en negativ ufuldstændig provenancefixture. Gamle tekstsøgninger efter implementeringsdetaljer fjernes.
8. Den gamle progressive public-runtime-test må ikke genberegne med `score-engine.js`. Den sammenligner de materialiserede integrerede scorer, komponenter, kvalitet og modelbinding mellem privat kilde og offentlig projektion og bevarer kontrol af datasæt, zoner, størrelse og fravær af privat vindhistorik.
9. De tre boolske `jq -e`-tildelinger bevarer streng typekontrol, men konverterer et godkendt boolsk resultat til tekst. Både `true` og `false` accepteres; manglende, null eller forkert type afvises fortsat.
10. Pages må ikke udlede `modelMemoryReady=true` alene af nul offentligt tilgængelige `HISTORY_INCOMPLETE`-scorer. Coverage, rå hukommelse og migration forbliver selvstændige forseglede fakta. En virkelig HISTORY_INCOMPLETE-score må stadig ikke ledsages af falsk memory-ready, og Candidate G forbliver særskilt strict.
11. En afhængig ekstern handling køres ikke meningsfuldt efter en fejlet forudsætning. Fejlopsamlingen lover derfor alle deklarerede selvstændige kontroller, ikke at en database- eller Pages-skrivning udføres på et kendt ugyldigt artifact.
12. Der startes ingen oneoff eller provideropfyldning. Efter exact-head og merge bruges den eksisterende cache-/handofffortsættelse.

## Afgrænsning og åbne forhold

En zones samlede mode/time er aktuelt utilgængelig, hvis blot én forventet kystdel er utilgængelig, selv om øvrige delscorer bevares. Det er låst af en eksisterende test, men skal efter launch afstemmes med DEC-0132's formulering om lokal utilgængelighed. Det ændres ikke stiltiende i denne release.

Det observerede 256-MiB-læseloft for private conditions mod et 768-MiB-pakningsloft er ikke en bevist aktuel fejl uden den konkrete filstørrelse. Det måles ved næste naturlige gennemløb; ingen grænse hæves blindt.
