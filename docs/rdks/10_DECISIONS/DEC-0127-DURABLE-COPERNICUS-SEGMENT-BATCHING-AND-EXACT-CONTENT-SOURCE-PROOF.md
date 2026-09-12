# DEC-0127 – Varige Copernicus-segmenter og én kildegate pr. eksakt kildeindhold

- **Dato:** 2026-09-12
- **Status:** AKTIV og lokalt implementeret i 4.0.345; exact-head-CI, main-runtime og produktion afventer
- **Ejergrundlag:** Ejerens instruktion om autonom fejlretning, helhedsorienteret diagnose, fjernelse af dobbelt kildegate og efterfølgende sikker aktivering af den integrerede RavScore-model
- **Supersederer:** Den implicitte antagelse i 4.0.344 om, at prepared checkpoint alene gav tilstrækkeligt live-gennemløb, samt commit-SHA-bundet genbrug som eneste sikre kildegatebevis
- **Bevarer:** DEC-0113–0126, DMI → Copernicus → Open-Meteo, persistent cache, source-order/admission, masks, provenance, readback, privacy, fuld closure og runbundet cutover

## Målt grundlag

Main-run `34635781802` dækkede 74.093 af 79.414 currentpar før Copernicus og sluttede med 1.335 rester efter Open-Meteo. Oneoff `34642214559` kom længere: 2.274 par manglede før Copernicus, Copernicus tilføjede 965, og Open-Meteo sluttede med 1.033 provider-negative par. Alle 1.033 havde et terminalt negativt providersvar; de var ikke uattempted runtime-rester. Det viser, at ekstra tid alene ikke kan kaldes et komplet løsningsbevis.

Oneoffens Copernicus-fase brugte cirka 54 minutter. 31 fulde segmentcheckpoints brugte samlet cirka 2.376 sekunder, omkring 78 % af den målte fase, mens de fleste providerrequests tog 13–18 sekunder. Prepared bank→shadow→stage bevarede integriteten, men gentog stadig næsten hele generationens validering og serialisering efter hvert segment.

En lokal 40.120-record fixture målte seks segmenter før/efter den nye grænse. Seks fulde commits brugte 115,905 sekunder. Seks fsync'ede receipts, seks validerede in-memory candidates og én samlet fuld commit brugte 46,438 sekunder. Journalen brugte 0,127 sekunder. Slutbank, shadow og source-stage var byteidentiske. Det er et lokalt kapacitetsbevis, ikke en garanti for GitHub-runner eller providerclosure.

Live GitHub-API for PR #278/run `34632503756` viste desuden, at et gyldigt same-repository PR-run kan have `pull_requests: []`, selv om run-, job- og headidentitet er korrekt. PR-identiteten skal derfor verificeres via det særskilte PR-endpoint, ikke gennem det valgfrie runfelt.

## Beslutning A – durable segment journal

1. Hvert gennemført Copernicus-segment skrives straks som en kompakt, content-hashet receipt med eksakt donor-basehash, produktionstime, targetregisterhash og immutable attempt.
2. Positive receipts indeholder den fuldt validerede acquisition og dens records. Et legitimt nulresultat gemmer kun det selvstændigt validerede attempt; det må ikke opfinde en native provider-tid eller optræde som positiv donor.
3. Filen skrives atomisk, flushes, fsync'es og readback-hashes. På Linux fsync'es også parent-directory efter rename og unlink.
4. Journalen er aldrig offentlig runtime, READY-bevis eller selvstændig admission. Den genafspilles altid gennem eksisterende donorbank-, source-order-, positive-certificate-, mask-, shadow- og source-stage-validatorer.
5. Seks durable segmenter samles til én fuld bank→shadow→stage-transaction. Tidligere konsolidering sker ved komplet residual. En restbatch konsolideres ved naturlig afslutning eller den eksisterende bløde tidsgrænse.
6. Journalen slettes først efter succesfuld fuld transaction. Ved fejl består den til genstart. Forkert base, targetbinding, hash, payload eller struktur quarantines; den kan aldrig genbaseres eller give positiv adgang.
7. Normal, pilot, oneoff og post-build maintenance transporterer samme journal i den private Copernicus-donorcache og kræver fortsat exact-main write-authority.

## Beslutning B – én fuld kildegate for identisk indhold

1. Pull-request-workflowet checker eksplicit PR-headen ud, beviser exact head og kører `validate:source` én gang på den eksakte endelige PR-head.
2. Før gaten beregnes en deterministisk SHA-256-identitet over hele tracked Git-træet: mode, type, råt indhold pr. blob og sti. Efter grøn gate kræves det, at ingen tracked fil er ændret af valideringen; først derefter uploades et privacy-sikkert artifact, hvis navn binder PR-nummer, PR-head og contentdigest. Sourcekaldet kører hele releasegaten med `--no-write-report`, så alene dens dynamiske tracked `RELEASE-REPORT`-slutwrites undertrykkes; alle tests kører fortsat.
3. Et efterfølgende main-workflow må kun genbruge beviset, hvis main-træets beregnede contentdigest er identisk, committen er den eksakte mergecommit for den samme lukkede same-repository PR, artifactet er uforældet, og GitHub live bekræfter workflow, run, attempt, repository, head, job samt alle krævede grønne trin.
4. PR-metadata læses direkte fra `/pulls/{number}`. Det tomme valgfrie `run.pull_requests` bruges ikke som autoritet.
5. Cachefilen er kun en locator. Den giver ingen autoritet uden live GitHub-verifikation. Ukendt, udløbet, ændret eller utilgængeligt bevis betyder `required=true`, så den fulde kildegate køres sikkert på main.
6. Eksisterende kontrol af senere modstridende main-kildegateevidens består. Et nyt sourceindhold kræver altid en ny PR-gate.
7. Fuld `npm run validate` og almindelig `npm run release:gate` efter central hydrering og frisk vejr er ikke dubletter af sourcegaten og må aldrig springes over for et nyt produktionsartifact. Dette direkte post-data-kald skriver fortsat de aktuelle release-rapporter; `release:package` gør det samme.

## Uændrede slutgrænser

- DMI roterer fortsat hele det autoritative register og søger ikke kun tidligere positive par.
- Current kræver 673 × 118 = 79.414/79.414 med én godkendt kilde pr. par og nul missing/overlap.
- Bølger kræver 79.060 native WAM-par for 670 dele plus Feggesund 354/354 og nul uløste lineage-konflikter.
- Provider-negative Open-Meteo-resultater er ærlig upstream-fraværsevidens for den konkrete kørsel, ikke bevis for DMI-/Copernicus-umulighed og ikke tilladelse til launch med huller.
- Geometri, land-/vandpunkter, afstande, strøm-/bølgefysik, RavScore-modelbundle, SQL-migrationer og offentlige tærskler ændres ikke af 4.0.345.
- Candidate G forbliver offentlig, indtil exact-head-CI, sikker merge, komplet main-vejr, freshness, fulde gates, handoff, cutover og offentlig modelkontrol er positive.

## Verifikation og næste handling

Måltests omfatter journalhash/tamper/basebinding, positive og tomme receipts, seks-segment-batch, genstart/replay, fejl før consolidation, AMM15-after-Baltic, donorbank/shadow/stage-byteidentitet, alle Copernicus-closures samt workflowets restore/write-authority/save-kontrakt. Sourceproof-tests omfatter contentmismatch, PR-/repository-/head-/run-/job-/step-/artifactfejl og sikker fallback.

Kør ikke en lokal fuld sourcegate oven i GitHub-gaten uden konkret fejlevidens. Efter grøn exact-head-PR-gate merges kun den beviste head. Den første main-kørsel skal eksplicit vise `verified-identical-pull-request-source-content`; ellers er sikker fallback til ny sourcegate forventet og skal diagnosticeres. Ingen scoreaktivering må ske før hele produktionskæden er grøn.
