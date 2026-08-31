# RavRadar 4.0.317 – integreret RavScore state 6

Dato: 2026-08-30

## Én samlet modelkandidat

- Samler næste RavScore som `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0` med state `6.0.0`, 20/50/30 og én fælles model-, komponent-, forklarings-, migrations- og rollbackkontrakt.
- Parameterkontrakten er `778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`; den reproducerbare 43-filers implementeringsbundle er `74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae`.
- Candidate G er fortsat den eneste offentlige model, indtil hele det atomiske cutover er bevist. Der bygges ingen offentlig shadowmodel.

## Fysisk proceskæde og sidste nærkystled

- Bevarer de fagligt og teknisk stærke Candidate G-dele: verificeret afledt kystnormal gridstrøm, 48-timers bounded transportmemory, særskilt `Hs² × T`-mobilisering med cirka 4 timers opbygning og 48 timers halveringstid, provenance, missing og 20/50/30.
- Fjerner 13-timers helscore-nulgaten. Et stærkt udgående strømforløb kan sætte transportbeviset til nul, men beviser ikke, at ravlageret er tømt, og må ikke nulstille mobilisering eller søgeforhold.
- Tilføjer et afgrænset energivægtet bølgeapproach-led med fire timers halveringstid. Det kan kun dæmpe den sidste nærkystlevering med faktor 0,85–1; `delivery = transportPotential × factor` anvendes præcis én gang, og bølger kan aldrig skabe supply.
- Vandstand er score-neutral kontekst: faldende vand kan både føre mobilt rav søværts og blotlægge eller koncentrere rav bag revler. Den tælles ikke som en ekstra strøm oven på DMI/Copernicus.
- RavRadar påstår fortsat ikke lokal bundnær surfzone-, undertow-, rip-, feeder- eller revledynamik, fordi lokal dynamisk batymetri og bølgeopløst surfzonemodel ikke findes. DDM 2024/v2 bruges kun som statisk forskningskontekst, og modellen kaldes ikke empirisk mere fundpræcis uden repræsentative fund og nul-fund.

## Historikhuller uden tab af prognosen

- Direkte inputmangel er `UNAVAILABLE` og giver ingen opdigtet score. Manglende historik med gyldige direkte input er derimod `HISTORY_INCOMPLETE`: RavRadar viser en konservativ numerisk lower bound, medfører upper bound, spænd, årsager og dækning og bevarer både aktuelle scorer og femdøgnsprognosen.
- Den samme auto-forsvindende advarsel følger DA/DE/EN-score, detaljer, fem døgn, admin og ekspert. `HISTORY_INCOMPLETE` og `UNAVAILABLE` er altid `calibrationEligible=false`.
- Current scorer fortsat kun 48 timer. Bølgemobiliseringens ukendte hale lukkes konservativt efter 288 timer, last-mile-halen efter 40 timer, og 168 timers private researchretention er score-neutral.
- Nøddrift er kun same-model, komplet, atomisk og hashbundet i højst 72 timer eller til kortere prognoseudløb. Ingen cross-model fallback, nabozonelån, carry-forward eller kunstig historik er tilladt.

## Migration, checkpoint og hel rollback

- Candidate G migreres direkte til state 6 gennem `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`; den aldrig-offentlige state-5-kandidat accepteres kun fra eksakt historisk `READY`.
- Checkpointschema 4/cache-v2 parrer 673 integrerede states atomisk med en beskyttet, eksakt `READY` Candidate G-rollback-companion. Same-reference publish/restore sammenligner også `generationSha256` og hele den validerede companion før første mutation og stopper fail-closed ved divergens.
- Manuel hel rollback bruger `integrated-schema6-to-candidate-g-schema2-v3`. Candidate G-rollbackens separate 54-filers binding er `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207`; Candidate G-observationer er fortsat ikke kalibreringsegnede.
- Candidate G-kilden er eksakt den produktionsverificerede 4.0.316-head `49dd4cb454656bdf629e5df760176705e38d2cb0`, tree `975c3e9432cea7780564ffd56766bc1f0a0a9763`, central switch `RAVSCORE-PROFILE-SWITCH-4.0.316`, source contract `2f888a16190e9e43e44536536029f1b0021a1b850195524aa2312664ca74810b` og 53-filers closure `a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606`. PR, build og deploy henter og verificerer den eksakte pinned commit.

## Plug-and-play og status

- Fælles binding, kvalitet og bounds føres gennem 210 zoner/673 kystdele, startup/detaljer/hashes, current/fem døgn, ranglister, bedste tidspunkt, strand/waders, DA/DE/EN, lokal/Edge Spørg RavRadar, ture/observationer, konto, admin/ekspert, central profil, scheduler, recovery/rollback, audits og releasegates.
- Releasegaten følger den faktiske atomiske to-dokument-RPC/SQL-CAS-kontrakt inklusive service-role-rettigheder, den eksakte native-time DMI-matrix -48..+117, dynamisk 15/45-minutters watchdog, eksplicit public-fallbackafvisning og de virkelige DA/DE/EN-tekster. Fresh-startup-testen er bundet til schema-4-envelope, bytes/hash/modelbinding og fail-closed fallback, og SQL/RPC-installationsparitet er obligatorisk i `test:ravscore-integrated-profile`/`validate:source`. Manglende krævede filer og ugyldig JSON aggregeres nu i den samlede fejlliste og har en hurtig sourcegate-regression.
- PR #235's første exact-head `33324239464`/job `99291456658` stoppede i `validate:source` på en stale state-6-feedbackfixture; der skete ingen merge, intet produktionsbuild/artifact og intet deploy. Den efterfølgende samlede lokale gennemgang afdækkede yderligere stale public-fixtures, en resterende adaptiv observationsskrivning og bundle-drift. Remediationen pensionerer ny-skrivningen, opdaterer quality/bounds-/payload-/forklaringsregressionerne og synkroniserer alle bindingsforbrugere til den regenererede 43-filers bundle ovenfor.
- Den remediatede arbejdsgren består nu en fuld lokal `validate:source` inklusive 210/673-runtime/privacy, Candidate G-rollback-orakel, profile/CAS, checkpoint/protected storage, RDKS, security, håndbog, DMI/Copernicus og indlejret `release:gate` i kildekontekst. Frisk final fetch bekræfter fortsat `origin/main=49dd4cb454656bdf629e5df760176705e38d2cb0` uden nyere main-delta.
- PR #235's anden exact-head `33329919843`/job `99306529711` på `7bc848610794b87f62a6a3763564ca46a0d7528e` bestod de forudgående model-, public-runtime-, rollback- og DMI-dele, men stoppede fail-closed i `test:copernicus-target-registry`, fordi `xarray` manglede i CI-miljøet. Rodårsagen var dependency-drift i sourcegate-workflows, ikke RavScore, runtime eller data: CI installerede ikke alle tre ejede requirements-sæt, som den kanoniske Codex-setup allerede bruger. Ingen merge, produktionsbuild/artifact, deploy eller offentlig ændring skete.
- Rettelsen installerer nu `requirements-dmi.txt`, `requirements-geometry.txt` og `requirements-copernicus.txt` umiddelbart før hver `validate:source` med samme kørselsbetingelse i PR-, produktions- og turlagerworkflows, hæver PR-timeout 30→45 minutter og låser kontrakten i workflowregressionen. Målrettede workflow-, Copernicus- og modelbundletests er grønne. En ny exact-head, merge, frisk centralt hydreret produktion/validate/releasegate/artifact/Pages, Feggesund 3 × 118 og offentlig desktop-/mobilkontrol udestår fortsat.
- Geodata ændrer kun de stående autoriserede topversionsfelter 4.0.316→4.0.317. Ingen geometri, zoner, kystnormaler, land-/vandpunkter, private payloads, koordinater eller rå U/V ændres eller publiceres.
