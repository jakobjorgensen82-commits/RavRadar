# DEC-0133 – offentlig modelkontrol skal rekonstruere producenten, og startpakken må ikke blive tom

- **Dato:** 2026-09-13
- **Status:** AKTIV, lokalt implementeret og måltestet; exact-head-, backend-, cutover- og offentligt bevis afventer
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

Korte syntaks-, model-, bundle-, binding-, migrations-, readiness-, engangsundtagelses- og releasekontraktkontroller er grønne. Den brede lokale workflowtest nåede de relevante statiske kontroller, men stoppede på den kendte Windows Python Store-aliasfejl; den gentages ikke lokalt. Den lange nationale audit gentages heller ikke lokalt. Én GitHub-sourcegate på den eksakte slut-head er næste samlede bevis. Derefter mangler migration-13 apply/readback, grøn cache-only preflight, faktisk cutover og offentlig 210/673-verifikation.
