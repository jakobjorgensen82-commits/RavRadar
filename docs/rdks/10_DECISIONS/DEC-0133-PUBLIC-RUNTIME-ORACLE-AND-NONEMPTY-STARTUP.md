# DEC-0133 – offentlig modelkontrol skal rekonstruere producenten, og startpakken må ikke blive tom

- **Dato:** 2026-09-13
- **Status:** AKTIV; PR #287/main/backend og H0-rekonstruktionen er bevist. Cache-only `34733358422` lukkede de to H0-/last-mile-koder og rekonstruerede alle 1.346 modes; en operationel genuine-cold-start-readiness-kant er lokalt rettet og måltestet. Ny exact-head, cache-only preflight, cutover og offentligt bevis afventer
- **Ejergrundlag:** Ejeren vil have den integrerede model online nu uden en ny oneoff og uden at gentage allerede gennemførte kontroller
- **Præciserer:** DEC-0110, DEC-0112, DEC-0114, DEC-0122, DEC-0130 og DEC-0132
- **Bevarer:** 79.414/79.414 currentclosure, 210/673-struktur, ingen opdigtede scores, Candidate G som privat rollback-orakel, privacy, append-only backend og alle fem post-data-kontroller

## Produktionsfund

4.0.350 blev exact-head-valideret og merged via PR #285 som main `f6e725ecb9930fc5b7f0d85418bf5b7ef20c1e68`. Backendrun `34720600286` anvendte migration 12 og bestod readback. Den efterfølgende cache-only preflight `34720789985` genbrugte target `2026-09-12T08:00:00Z` uden ny providerindsamling og bestod current 79.414/79.414, WAM, freshness og den aktuelle 673/673-udvælgelse.

Modelbygningen nåede alle 210 zoner, 673 kystdele og 1.346 aktuelle mode-resultater, men den afsluttende offentlige kontrol stoppede med fire koder: `MODE_RECONSTRUCTION_MISMATCH`, `PART_LAST_MILE_STATE_METADATA_MISMATCH`, `PUBLIC_PROFILE_NOT_READY` og `PUBLIC_STARTUP_WINNER_PART_SET_NOT_COMPACT`. Intet handoff, cutover eller deploy blev startet.

Fejlene lå i samlingen og genkontrollen af den offentlige modelpakke. Lokal `UNAVAILABLE` blev fejlagtigt brugt til også at nulstille gyldig hukommelses- og migrationsstatus. Auditens rekonstruktion manglede producentens nye H0-currentregel og brugte en for grov bølgeklassifikation. Startpakken valgte kun vindere og kunne derfor ende uden en kystdelsidentitet, hvis alle aktuelle resultater i en zone var utilgængelige.

## Beslutning

1. Dækning, hukommelse og migration er tre selvstændige fakta efter strukturel 673-delskontrol. Lokal `UNAVAILABLE` må gøre `modelCoverageReady=false`, men må ikke omskrive en ellers gyldig hukommelse eller migration til false.
2. Den offentlige audit rekonstruerer H0-current fra den faktisk publicerede strøm, retning og provenance. En `NATIVE_CADENCE_HOLD` er direkte input, men må ikke fremstilles som en ny verificeret måling eller give en opdigtet kystnormalværdi.
3. Producent og audit udleder last-mile-status og faktorer fra den samme publicerede vejrtime og den samme kompakte `waveApproachState`. Eksakt vindstille bølgeenergi, aktiv bølge uden retning og manglende bølgefysik forbliver forskellige tilstande.
4. Startpakken beholder den virkelige vinder, når en findes. Hvis en mode er lokalt utilgængelig, medtages en deterministisk eksisterende kystdelsidentitet fra zonen. Det opfinder ingen score eller vinder og må fortsat give højst to identiteter pr. zone.
5. Slutkontrollen lempes ikke. Den skal fortsat rekonstruere og sammenligne alle 210 zoner, 673 dele og 1.346 aktuelle mode-resultater og stoppe før writes ved enhver reel afvigelse.
6. Migration 12 er centralt anvendt og forbliver byteuændret ved normaliseret SHA-256 `24a7450ae913ceef37375e6df200a0e85e6a001128c4a1ca9b6652ae6642fbd8`. Ny append-only migration `20260913010000_public_runtime_oracle_binding.sql` fører kun integrated-, rollback- og continuationforsegling samt readbackversion frem.
7. Der startes ingen ny provider-oneoff. Efter én exact-head-kildegate, byteidentisk merge og migration-13-readback genbruges den allerede komplette låste vejrpakke i en cache-only preflight. En grøn preflight må derefter bruges til den rigtige cutover.
8. DEC-0122's materielt uændrede engangsundtagelse følger alene exact release 4.0.351. Alle storage-, privacy-, handoff-, post-data-, CAS-, Pages- og offentlige kontrolkrav består.

## Binding og åbent bevis

Integrated bundle er `79d5118a1b37b542532721ebe1b943df00b646e1625b991d5a9ad597d36d0ae8`, Candidate G-rollbackbundle er `84311c920b3f2697f31fe32ebef4d7932f59f5fe784b2b7d1dbf679d9007a28c`, og continuationhash er `9d3960137054a1ab40ec10e4514425c436f979fac18ce3f92137512e47b629e6`.

Korte syntaks-, model-, bundle-, binding-, migrations-, readiness-, engangsundtagelses- og releasekontraktkontroller er grønne. Den brede lokale workflowtest nåede de relevante statiske kontroller, men stoppede på den kendte Windows Python Store-aliasfejl; den gentages ikke lokalt. Den lange nationale audit gentages heller ikke lokalt. Migration 13 er anvendt/readback-verificeret. Én GitHub-sourcegate på den eksakte slut-head er næste samlede bevis; derefter kræves exact-main backendreadback, grøn cache-only preflight, faktisk cutover og offentlig 210/673-verifikation.

## Produktionsopfølgning 2026-09-13

PR #286's endelige head `b6f06310b59ce6c074361735ec9175da435d0e21` bestod exact-head-sourcegate `34726624728` og blev merged byteidentisk som main `6d4adbb2afddfd103566cf0a80c0a57408be1ca4`. Backendrun `34727884447` anvendte/readback-verificerede migration 13. Den efterfølgende låste cache-only-preflight `34728026044` hentede intet providervejr og bestod igen current, WAM, freshness og 210/673-modelbygningen, men stoppede før writes med tre koder: `MODE_RECONSTRUCTION_MISMATCH`, `PART_LAST_MILE_STATE_METADATA_MISMATCH` og `PUBLIC_PROFILE_NOT_READY`.

En ægte H0-current-mangel er nu reproduceret lokalt. Producentens direct-input-gate danner med vilje en ren `UNAVAILABLE`-historikvisning med `null` current-bounds. Auditten krævede før denne situation endelige bounds, kastede inde i den samlede evaluation/last-mile-blok og fortsatte derefter med en afledt mode-sammenligning. Det var ikke en last-mile-, model-, fysik- eller vejrdatafejl.

Audittens oracle følger nu producentens eksakte direct-input-faktum: uden direkte H0-current rekonstrueres `CURRENT_DIRECT_INPUT_MISSING`, `available=false`, nul coverage og `null` current-bounds, mens wave/last-mile-bounds fortsat skal være endelige og eksakte. Profilens coverage, memory og state-initialisering kontrolleres fortsat uafhængigt mod rå modelstate. En fuld målrettet 210/673-audit med datasikre negative fixtures er grøn. Modelbundle, migration 13 og vejrcachen er uændrede.

PR #287's head `b12c1717043ab744a48ee38356b723f87a6d4942` bestod exact-head-sourcegate `34732348167` og blev merged byteidentisk som main `a6e118d2a035ffbdfefab79b2a13de094dec939c`. Backendrun `34733200143` genbrugte exact-content-beviset og readback-verificerede de 13 anvendte migrationer.

Cache-only-preflight `34733358422` genbrugte igen target `2026-09-12T08:00:00Z` uden providerindsamling. Current, WAM, freshness, 210/673-modelbygning og rekonstruktionen af alle 1.346 aktuelle modes bestod. De tidligere `MODE_RECONSTRUCTION_MISMATCH` og `PART_LAST_MILE_STATE_METADATA_MISMATCH` var væk; kun `PUBLIC_PROFILE_NOT_READY` stod tilbage.

Den konkrete sidste årsag var den nationalt ensartede, source-attesterede `genuine-cold-start`, som resolveren valgte for alle 673 dele. DEC-0113 og DEC-0114 tillader og kræver netop denne measured-only vej, når Candidate G er kanonisk men ikke migrationsklar. Profilens operationelle readiness accepterede imidlertid kun en allerede migreret eller fortsat state og gjorde derfor den lovlige første opstart umulig. 4.0.351-hotfixen tæller cold start som state-klar kun når alle 673 dele bruger den, hver lineage har eksakt feltmængde, recovery-id, privat measured-only kilde, 48-timers complete/unknown-regnskab, korrekt kildeklasse og ikke-fremtidig targetbinding. Blandede cohorts, ekstra felter, forkert kilde, forkert regnskab og fremtidig target afvises fortsat. Audit, admin og Pages kræver stadig `modelMigrationReady=true`; flaget betyder her gyldigt initialiseret state, ikke at Candidate G nødvendigvis kunne migreres.

Rettelsen ligger i det operationelle producentlag og den uafhængige public-runtime-audit. Scoreformel, modelbundle `79d5118a…`, rollbackbundle `84311c92…`, continuation `9d396013…`, migration 13, geometri, vejrdata og cache er uændrede. Der køres ingen ny provider-oneoff.
