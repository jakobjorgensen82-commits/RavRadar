# DEC-0141 – cutoverens kontrolorakler følger de gældende kontrakter

**Status:** Aktiv lokal beslutning for 4.0.359. Exact-head-CI, merge og ny cutover afventer.

## Baggrund

Main 4.0.358 er `2a1c73d2` efter PR #295 og exact-head-sourcegate `34777480545`. Cachefortsættelse `34781396538` genbrugte de fire eksisterende cacher uden provider eller oneoff og forseglede 79.414/79.414 currentpar, missing 0.

Cutover `34781869394` gennemførte alle 272 deklarerede bladkommandoer og alle fem hovedkontroller. Runtime/modelaudit, referencezoner, releasegate og datavalidering bestod. Fuld validering samlede seks røde underkontroller, hvorefter cutoveren stoppede samlet før database-, checkpoint-, privat-runtime- og Pages-writes. Dermed beviste gennemløbet, at DEC-0140's komplette fejlopsamling virker.

De seks resultater er hver reproduceret og afgrænset til testorakel eller testkontekst:

1. To tests krævede historisk `DMI_BULK_COLLECTIONS_PER_RUN: 2`, selv om gældende workflow bevidst bruger 6 ved første cutover og 3 ved normal drift.
2. En progressive-public-fixture brugte availability schema 1 uden `evaluatedAt` og forventede nul parts, selv om den gældende schema-2-kontrakt bevarer én deterministisk eksisterende part uden currentdata.
3. Collectorjobbet satte ikke `DMI_BULK_CACHE_PATH`, så den rumlige audit sammenlignede den friskbyggede runtime mod den med vilje bevarede legacyfallback. Det gav 618 falske forskelle. Normal fuld validering brugte allerede candidate-cachen.
4. En syntetisk fixture uden provenance forventede interpolerede/repeated mellemtimer. Den strenge gældende kontrakt tillader i den situation kun native tretimersværdier.
5. En statisk source-teksttest forventede to local-part-kald efter tilføjelsen af et legitimt tredje kald til Feggesund WAM-readiness. Den semantiske kontrol af alle 673 dele bestod.

Ingen af de seks er evidens for forkert scorematematik, manglende currentpar eller tabte produktdata.

## Beslutning

1. De to DMI-tests låser den gældende betingede 6/3-kontrakt. De ændrer ikke rotationen eller dens budgetter.
2. Availability-fixturen følger schema 2, kræver `evaluatedAt`, forventer den deterministiske eksisterende part og beviser fortsat, at delen ikke får currentdata.
3. Collectorjobbet sætter `DMI_BULK_CACHE_PATH=.cache/dmi-candidate-progress.json` for hele den samlede kontrolblok. Workflowrækkefølge og releasegate låser bindingen.
4. No-provenance-fixturen forventer kun native tretimersværdier og deres eksakte tider. Ingen kunstige mellemtimer accepteres.
5. Den statiske kaldetælling følger de tre kendte legitime forbrugere. Den eksisterende semantiske 673/673-isolation forbliver bindende.
6. Alle seks rettelser leveres samlet i 4.0.359 og måltestes direkte. Der køres ikke en ny fuld lokal sourcegate oven i GitHubs exact-head-gate.
7. DEC-0140 ændres ikke: alle 272 bladkommandoer og alle fem hovedkontroller forbliver bindende. Blanket-advisory eller generel ignorering af testfejl er fortsat forkastet.
8. Kun en konkret reproduceret kontrolfejl kan rettes eller særskilt klassificeres. En ukendt eller materiel fejl i score, vejrdata, deploy, hjemmeside, dataintegritet, privacy eller sikkerhed stopper fortsat cutoveren efter den komplette kontrolblok og før eksterne writes.
9. Efter exact-head-sourcegate og merge genskabes kun det SHA-bundne handoff fra samme cacher. Ingen provider-oneoff eller almindelig vejrkørsel startes før den integrerede model er online og offentligt verificeret.

## Uændret

Scoreformel, scoreinput, modelstate, vejrdata, sourceorder, providerbudgetter, DMI-rotationen selv, geometri, land-/vandpunkter, migrationer, database og privacy ændres ikke.

## Efter cutover

Efter offentlig 210/673/118- og siteverifikation genaktiveres normal weather kontrolleret. Den skal bevise cachevedligeholdelse, fuld DMI-registerrotation, fallbackbidrag og tidsoverskud. All-parts-zonereglen og den målte private conditions-størrelse revurderes mod live evidens. De to gamle jobløse workflowposter `34613079069` og `34228112413` slettes, når GitHub gør dem sletbare.
