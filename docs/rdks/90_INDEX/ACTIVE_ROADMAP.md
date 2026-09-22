# Aktivt roadmap – 2026-09-22, 4.0.463 bounded migreringsskrivning

0. [x] Afgræns code-only-run `35746937526` til den resterende samlede
   `JSON.stringify` i post-cutover-migreringens writer.
1. [x] Brug den fælles bounded/atomiske writer og dæk den med en stor
   parse-/digest-regressionstest uden samlet forventningsstreng.
2. [ ] Bestå exact-head-kontrol og merge 4.0.463.
3. [ ] Kør én providerfri code-only migration/readback på main.
4. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og følg cache,
   artifact, deploy og offentlig runtime.
5. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.

# Aktivt roadmap – 2026-09-22, 4.0.460 feltdiagnose før selvstændig drift

0. [x] Afgræns code-only-run `35738220142`: alle trin til og med importkontrol
   var grønne; predecessor-genbindingen gav kun en generisk flad mismatch.
1. [x] Gør mismatch på de seks flade identitetsfelter synlig uden at svække
   fail-closed-kontrollen, og tilføj målrettet regressionstest.
2. [ ] Bestå exact-head-kontrol og ny code-only-genbinding på main.
3. [ ] Ret den konkrete dynamiske predecessor-identitet ud fra run-evidens.
4. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
5. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.

# Aktivt roadmap – 2026-09-22, 4.0.459 fra komplet predecessor-identitet til selvstændig drift

0. [x] Afgræns code-only-run `35734072736`: source og sti var korrekte, men
   predecessor-identiteten manglede manifestets to tidsfelter.
1. [x] Tilføj de verificerede tider og behold den eksakte fail-closed kontrol.
2. [ ] Bestå exact-head-kontrol og ny code-only genbinding på main.
3. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.
5. [ ] Efter stabil drift: samle gentagne identitetsbindinger i én versioneret
   runtime-manifestkilde; fjern ikke reelle integritetsbarrierer.

6. [x] Start binding-inventaret i
   `docs/ai/BINDING_IDENTITY_INVENTORY_4.0.459.md` med fejlspor fra
   4.0.451–4.0.459.

# Aktivt roadmap – 2026-09-22, 4.0.458 fra skjult stale binding til selvstændig drift

0. [x] Afgræns code-only-run `35732235540`: den levende predecessor blev
   fundet korrekt, men en gammel SHA stod stadig i workflowets arbejdssti.
1. [x] Gør predecessor-stien neutral og behold descriptor-/ancestor-/hash-
   kontrollerne som de reelle sikkerhedsbarrierer.
2. [ ] Bestå exact-head-kontrol og ny code-only genbinding på main.
3. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.
5. [ ] Efter stabil drift: samle gentagne identitetsbindinger i én versioneret
   runtime-manifestkilde; fjern ikke reelle integritetsbarrierer.

# Aktivt roadmap – 2026-09-22, 4.0.457 fra predecessor-drift til selvstændig drift

0. [x] Afgræns code-only-run `35730421484`: migration og database-readback var
   grønne, men den gemte runtime matchede ikke den forældede predecessor-
   identitet.
1. [x] Opdater den faste predecessor-identitet samlet til `a6d89798` /
   `rr-20260921170645-210` med korrekt bundle- og contract-bevis.
2. [ ] Bestå exact-head-kontrol og ny code-only readback/genbinding på main.
3. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.

# Aktivt roadmap – 2026-09-22, 4.0.456 fra readback-drift til selvstændig drift

0. [x] Afgræns code-only-run `35728472112`: migrationen blev anvendt, men
   checkpoint-readbacken brugte den gamle kildefil og afviste den korrekte
   successor-hash.
1. [x] Ret readbacken til at bruge successoren som checkpoint-kilde, uden at
   ændre trip-policyens separate kilde eller historiske migrationer.
2. [ ] Bestå en ny kort code-only readback på exact `main`.
3. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg mindst den næste cron-kørsel. Den skal kunne gennemføre uden
   Codex-overvågning og dokumentere DMI-first, fallback, cachefremgang og
   bevarelse af gamle gyldige værdier.

# Aktivt roadmap – 2026-09-22, 4.0.455 fra backend-drift til selvstændig drift

0. [x] Afgræns gentaget policy-hashdrift til Supabase/migrationskæden, ikke
   til leverandørdata eller scorebygning.
1. [x] Tilføj append-only repair-migration og tidlig database-readback før
   providerhentning; behold checkpoints, retry og fallback i workflowet.
2. [x] Ret forældede UI-testforventninger og manifest-auditens statiske/dynamiske
   sammenligning.
3. [x] Gør den fælles 118-timers public-hour-horisont tilgængelig i den
   isolerede Candidate G-reserve, så stage-/rollback-læseren ikke fejler på en
   integreret-only eksport.
4. [ ] Bestå målchecks, versions-/RDKS-slutkontrol og exact-head sourcegate;
   merge 4.0.455.
5. [ ] Kør code-only migration/readback uden providerkald.
6. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
7. [ ] Følg mindst den næste cron-kørsel. Den skal kunne gennemføre uden
   Codex-overvågning og dokumentere DMI-first, fallback, cachefremgang og
   bevarelse af gamle gyldige værdier.
8. [ ] Når driften er stabil, revider prognose- og scoretekster til almindeligt
   dansk; ændr ikke matematikken som del af denne driftrettelse.

# Aktivt roadmap – 2026-09-22, 4.0.452 fra heap-stop til normal continuation

0. [x] Afgræns run `35662538047` til Node/V8 heap-OOM efter
   `component-runtime-ready`; gemt privat vejr-fremgang er intakt.
1. [x] Hæv kun cachetrinnets Node-heap til 8192 MB og beskyt det med en
   målrettet workflow-regression. Providerbudgetter og datakontrakter er
   uændrede.
2. [ ] Bestå målchecks, exact-head sourcegate og merge 4.0.452.
3. [ ] Kør én normal continuation fra den gemte fremgang; kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg næste almindelige cron og mål leverandørdækning, cachefremgang og
   bevarelse af gamle gyldige værdier. Ingen ny one-off uden konkret evidens.
5. [ ] Når normal drift er bevist, gennemgå de brugersynlige prognose- og
   scoreforklaringer i klart dansk uden at ændre matematikken.

# Aktivt roadmap – 2026-09-21, 4.0.451 fra cache-timeout til stabil normal drift

0. [x] Afgræns normalrun `35625011723`: providerkæde og central cache blev
   færdige; deploy stoppede kun på en readiness-markør, der stadig pegede på
   den foregående main-head. Annullér gentagelsen `35627623336`.
1. [x] Sørg for at hver efterfølgende integreret vejrkørsel efter samme eksakte
   backend-/Edge-readback idempotent publicerer readiness for sin aktuelle
   main-head. En reel binding-, backend- eller deployfejl er fortsat
   blokerende; vejrdata skal ikke genhentes på grund af denne metadatafejl.
2. [x] Gennemfør saved-weather recovery fra `35625011723` uden providerkald og
   bekræft Pages, offentlig manifest/runtime og cachebevis. Recovery `#76`
   blev grøn og satte datasættet `rr-20260921170645-210` offentligt.

3. [x] Find den konkrete årsag i run `35546109889`: den centrale cache-
   opdatering blev dræbt efter 25 minutter, ikke af en datakontraktfejl.
4. [x] Sammenhold den målte 21-minutters providerfri runtimeforsegling med
   den normale scorebygning og hæv kun den bounded workflowgrænse til 45 min.
5. [ ] Bestå målchecks, exact-head sourcegate og merge 4.0.451.
6. [ ] Kør én normal vedligeholdelseskørsel fra den gemte fremgang og kræv
   privat cache-save, artifact, deploy og offentlig manifest/runtime.
7. [ ] Følg næste almindelige cron som bevis for vedligeholdelsesfri cache.
   Ingen ny one-off uden konkret ny evidens.
8. [ ] Når livekæden er bevist, luk den resterende DMI-only-vandstand og gå
   videre med de relevante roadmap-punkter.
9. [ ] Gennemgå al brugersynlig tekst i prognose- og scoredelen fra ende til
   anden. Omskriv forklaringer, statusser, advarsler og feltnavne til klart,
   almindeligt dansk, så en almindelig bruger kan forstå dem. Den tekniske
   forklaring må gerne blive liggende i et særskilt, valgfrit teknisk lag;
   denne opgave ændrer ikke scorematematik eller datakontrakter uden en
   særskilt faglig beslutning.
10. [ ] Indtil vejrgrundlaget er komplet og stabilt, prioriteres analyse af
   leverandørernes dækning, DMI-først-prioriteringen, huludfyldning, cache-
   fremgang og bevarelse af gamle gyldige værdier. Scorematematik vurderes kun
   ved tydelige fejl i denne fase; en bred modelrevision skal først ske på et
   komplet datagrundlag.

# Historisk aktivt roadmap – 2026-09-20, 4.0.448 fra public-hour-kontrakt til live drift

# Aktiv roadmap – 2026-09-20, 4.0.449 fra migrationshistorik til live drift

1. [x] Bevar både `20260919231000_public_hour_delivery_binding.sql` og den
   nye `20260920220000_public_hour_pack_capacity_binding.sql` i den aktive,
   kronologiske allowlist.
2. [x] Ret recovery-, trip-storage- og testforventninger fra 24 til 25
   migrationer uden at ændre allerede anvendt SQL.
3. [x] Kør målrettede readiness-, install-, release- og workflowkontroller.
4. [ ] Bestå versions-/RDKS-slutkontrol og exact-head sourcegate; merge
   4.0.449.
5. [ ] Genoptag saved-weather recovery fra den allerede gemte private runtime
   uden providerkald.
6. [ ] Kør derefter én normal vejrkørsel og bevis DMI-cachevedligeholdelse,
   fallback, privat save, artifact, deploy og offentlig runtime.

1. [x] Find og ret den konkrete afvisning af en gyldig offentlig timefil i
   run `35530859518`; providerkæde og 673/673 scoredele var allerede grønne.
2. [x] Ensret privat pakke, kapacitetsaudit og offentlig writer til 16 MiB
   pr. timefil; behold 256 MiB samlet privat pakkeloft.
3. [x] Tilføj målrettet regression for en stor, men gyldig public-hour-fil.
4. [ ] Bestå målchecks, exact-head sourcegate og merge 4.0.448.
5. [ ] Kør én almindelig continuation og bevis privat cache-save, artifact,
   deploy og offentlig manifest/runtime.
6. [ ] Følg næste almindelige cron som bevis for vedligeholdelsesfri cache;
   ingen ny one-off uden konkret evidens.

# Historisk aktivt roadmap – 2026-09-20, 4.0.447 fra cacheflaskehals til live drift

1. [x] Lever 4.0.446 og følg normalrun `35513058150` gennem alle leverandører,
   closure og historik.
2. [x] Brug 673/673-inputtracen til at afgrænse stoppet til lokal
   `update-weather`-samling, ikke manglende providerdata.
3. [x] Fjern gentagen genopbygning af samme regionale referencebevis og behold
   udtrykkelig fuld genvalidering.
4. [x] Tilføj sikre fasetider, så en eventuel ny langsom del kan udpeges i
   samme run.
5. [ ] Bestå målrettede checks, exact-head sourcegate og merge 4.0.447.
6. [ ] Kør én almindelig continuation og bevis cache, score, private writes,
   artifact og deploy. Ingen ny one-off uden konkret evidens.
7. [ ] Luk DMI-only-vandstandsresten og følg næste normale cron som bevis for
   selvkørende, vedligeholdelsesfri cache.

# Historisk aktivt roadmap – 2026-09-20, 4.0.446 fra redundant fallback til live drift

1. [x] Find den konkrete liveårsag: gyldig DMI-atmosfære udløste gentagne
   per-zone Open-Meteo-kald efter providerkæden og ramte cache-trinnets
   25-minutters grænse.
2. [x] Begræns fallback til reelle DMI-atmosfæriske huller; behold DMI-first,
   gamle gyldige værdier og ærlig MISSING-håndtering.
3. [x] Tilføj målrettet regression, versionsløft og permanent dokumentation.
4. [x] Bestå exact-head sourcegate og merge 4.0.446.
5. [x] Kør én almindelig continuation på den mergede main. Run `35513058150`
   nåede 673/673 scoreinput, men afsluttede ikke cache/artifact/deploy; se
   4.0.447-planen ovenfor.
6. [ ] Vurder den faktiske leverandørdækning og genoptag kun relevant normal
   drift/roadmap efter dette livebevis. Ingen ny one-off uden konkret evidens.

# Historisk aktivt roadmap – 2026-09-20, 4.0.445

1. Kør exact-head sourcegate for 4.0.445 og merge kun den eksakte head.
2. Kør én almindelig weather-continuation fra den gemte DMI/Copernicus-
   fremgang. Bekræft først at source-stage-kontrollen passerer, derefter
   Open-Meteo, afsluttende cache, artifact og deploy.
3. Registrér leverandørmangler som MISSING, men kald ikke datasættet komplet,
   før den faktiske komplethedskontrol er grøn.
4. Efter livebevis: fortsæt med normal cachevedligeholdelse og de åbne
   vandstands-/roadmap-punkter. Ingen ny one-off uden konkret evidens.

1. [x] Find den konkrete livefejl: Copernicus exit-75 afleverede en løs
   journal til source-stage-gaten efter ellers gyldigt DMI- og CP-fremskridt.
2. [x] Gør soft-boundary-recovery netværksfri og atomisk: replay allerede
   fsync'ede kvitteringer uden baseline-genvej før næste gate.
3. [x] Tilføj målrettet wrapper-regression og dokumentér den nye overgang.
4. [ ] Bestå exact-head sourcegate, PR/merge og én almindelig continuation.
5. [ ] Nå Open-Meteo, closure, score, private save, artifact og deploy; mål
   derefter komplethed ærligt, inklusive resterende DMI-vandstandshuller.
6. [ ] Følg efterfølgende normal drift og genaktiver kun relevant cron efter
   et reelt vedligeholdelsesbevis. Ingen ny one-off for denne rettelse.

# Aktiv roadmap – 2026-09-20, 4.0.442 fra timeout-handoff til helkæde

1. [x] Sikr Copernicus-shard-start og reserver 120 sekunder til afslutning.
2. [x] Bevar en eksakt, allerede gyldig baseline ved timeout og lad
   segmentjournalen afvente næste almindelige consolidation.
3. [x] Kør målrettede kode-, workflow-, journal- og versionskontroller.
4. [ ] Exact-head sourcegate, PR/merge og én almindelig weather-continuation.
5. [ ] Gennemfør Open-Meteo, samling, score, private save, artifact og deploy;
   mål derefter reel komplethed og manglende vandstandsfelter.
6. [ ] Følg næste cron og dokumentér, at normal drift vedligeholder cachen.
7. [ ] Fortsæt kun med roadmap-punkter, som stadig er relevante efter live-
   beviset; ingen ny oneoff for denne timeoutrettelse.

# Aktiv roadmap – 2026-09-20, 4.0.441 fra sikker genindgang til helkæde

1. [x] Lever 4.0.440 via exact-head `35485303951`, PR #385 og merge
   `c00e6c5a`.
2. [x] Afgræns `35485561037` til for tidlig bro-pensionering før providers;
   bevis at rå DMI-cache fortsat findes og at ingen produktion blev ændret.
3. [x] Bind broens levetid til den beskyttede exact source og bevar hele den
   eksisterende fail-closed restore/rebind/install-kæde.
4. [x] Måltest både fortsat exact-source-adgang og automatisk pensionering
   ved sourceændring.
5. [ ] Afslut RDKS/version/håndbøger og relevante målchecks; kør én
   exact-head sourcegate, PR og merge.
6. [ ] Kør én almindelig continuation med gemt krypteret fremgang. Kræv
   Copernicus-handoff, Open-Meteo, score, fulde gates, privat save, artifact
   og deploy. Ingen oneoff eller code-only-progressbrud.
7. [ ] Identificér/luk DMI-only-vandstandsresten og følg næste cron som
   selvkørende vedligeholdelsesbevis.

# Aktiv roadmap – 2026-09-20, 4.0.440 fra Copernicus-timeout til helkæde

1. [x] Lever 4.0.439 via exact-head `35481877393`, PR #384 og merge
   `badf84e9`.
2. [x] Kør normal weather `35482138050`; bevis restore/rebind/install og DMI.
3. [x] Afgræns stop til fem varige Copernicus-segmenter, som ikke blev
   samlet til source-stage før hard timeout; Open-Meteo startede derfor ikke.
4. [x] Del samme budget i providerarbejde, hard processgrænse og netværksfri
   recovery; bevar den strenge source-stage-gate.
5. [x] Bevis timeoutrecovery og journalreplay målrettet uden providerlogin.
6. [ ] Afslut RDKS/version/håndbøger, målchecks og én exact-head; PR/merge.
7. [ ] Kør én almindelig continuation fra gemt fremgang. Kræv Copernicus-
   handoff, Open-Meteo-rest, score, fulde gates, privat save, artifact og
   deploy. Ingen oneoff.
8. [ ] Identificér/luk DMI-only-vandstandsresten og følg næste cron som
   selvkørende vedligeholdelsesbevis.

# Aktiv roadmap – 2026-09-20, 4.0.439 fra genkendt overgang til Pages

1. [x] Lever 4.0.438 via exact-head `35471789111`, PR #383, main
   `2fbfe3b2` og backend `35472148224`.
2. [x] Kør normal weather `35472299635`: providers og aktuel closure nåede
   673/673 scoreklare kystdele; stoppet kom ved initial state-valget.
3. [x] Afgræns rodårsagen til manglende anvendelse af den allerede byggede
   bounded-forgængermigrering, ikke til providerdata eller scoreformel.
4. [x] Indsæt exact-source-rebind mellem restore og install og begræns den
   uafhængige historiske bølgevej til dens egen overgangstype.
5. [x] Bevis målrettet workflowrækkefølge, migration og uændrede målinger/
   Candidate G-state.
6. [ ] Afslut dokumentation, version/modelchecks og én exact-head sourcegate;
   PR/merge 4.0.439.
7. [ ] Kør én almindelig continuation fra beskyttet runtime/fremgang. Kræv
   scorebygning, privat save/timepakke, artifact, Pages og aktuel offentlig
   time. Ingen blind oneoff.
8. [ ] Identificér og luk de fire DMI-only-vandstandspartfelter; følg næste
   almindelige run/cron og fortsæt derfra til næste aktuelle roadmap-punkt.

# Aktiv roadmap – 2026-09-19, 4.0.438 fra færdige scorer til Pages

1. [x] Lever 4.0.437 som main `65bda6a9` og genbrug gemt krypteret fremgang.
2. [x] Normalrun `35463989289` gennemførte alle providers og byggede
   vind/bølger/brugbar strøm/score 673/673; det stoppede først ved privat save.
3. [x] Afgræns rodårsagen til dobbelte 673 × 118 timedata i en monolitisk
   privat JSON, som alle senere læsere fortsat skulle parse samlet.
4. [x] Implementér privat hashbundet timepakke, kompakt conditions, atomisk
   parinstallation, byte-identisk public materialisering og slutproveniens.
5. [x] Bind eksakt forgængerovergang og append-only backendmigration; bevis
   faktisk kapacitet og de berørte kontrakter målrettet.
6. [ ] Afslut dokumentation og slutchecks; kør én exact-head sourcegate,
   merge 4.0.438 og anvend/læs den nye backendbinding tilbage.
7. [ ] Kør én almindelig continuation fra gemt fremgang. Kræv komplet privat
   save, artifact, Pages, offentlig aktuel time og samlet restdiagnostik.
8. [ ] Følg næste cron som selvkørende bevis. Luk især de fire resterende
   DMI-only-vandstandsfelter; MISSING er robusthed, ikke komplethed.

# Aktiv roadmap – 2026-09-19, 4.0.437 fra tidsformatstop til offentlig drift

1. [x] Lever 4.0.436 via exact-head `35462534974`, PR #381 og main
   `0d72ce41`.
2. [x] Afgræns normalrun `35462863128` til den gyldige `...:00Z`-form, som
   den nye overgangstest ikke havde dækket; ingen provider blev startet.
3. [x] Ret begge overgangsveje til eksakt `...:00Z`/`...:00.000Z` og én
   normaliseret intern værdi; flyt den faste engangsregel til 4.0.437.
4. [ ] Bestå målrettede slutchecks og én exact-head, merge uden ny
   providerfri genbygning eller gentagelse af allerede beviste datafaser.
5. [ ] Kør almindelig weather og kræv genbrug af gemt krypteret fremgang,
   komplet privat runtime, artifact, deploy, offentlig aktuel time og 673
   lokale scoreinput.
6. [ ] Følg næste almindelige cron og fortsæt helhedsbeviset for DMI-first,
   fallback, rotation, komplethed og vedligeholdelsesfri drift.

# Historisk roadmap – 2026-09-19, 4.0.436 fra beregnet data til offentlig drift

1. [x] Lever 4.0.435 via exact-head `35457292220`, PR #380 og main
   `725068be`.
2. [x] Kør almindelig weather `35457642258`: alle providers og scorebygning
   gennemført; vind og beregnelig score 673/673.
3. [x] Afgræns eneste slutstop til V8-strenggrænsen ved privat JSON-skrivning;
   krypteret fremgang er gemt.
4. [x] Ret med kompakt, løbende, atomisk, parsebar og runtimebundet writer.
5. [x] Tilføj eksakt engangsgendannelse af den tidligere baseline, som den
   krypterede fremgang er bundet til; afvis alle andre forgængere.
6. [x] Afslut PR #381 exact-head, merge og fortsæt normalrun med den gemte
   fremgang frem for blind providerstart.
7. [ ] Bevis artifact, deploy, aktuel time, alle 673 lokale scoreinput og
   Safari/browser. Kør derefter mindst næste almindelige cron som driftbevis.
8. [ ] Fortsæt roadmapets helhedsbevis for komplethed, DMI-first,
   fallbackprioritet, rotation og vedligeholdelsesfri normal drift.

# Historisk roadmap – 2026-09-19, 4.0.435 fra delvis DMI til normal drift

1. [x] Lever 4.0.434 via exact-head `35453677623`, PR #379, main `d4e8844e`
   og providerfri deploy `35454050404`.
2. [x] Kør én almindelig weather `35456148104` og stop på konkret evidens:
   ingen provider startede, fordi delvis DMI-base blev krævet strict READY.
3. [x] Ret hele klassifikationskanten: strict aktiv donor, resumérbar kandidat
   og deployed legacy-base; promotion er stadig kun READY + register.
4. [ ] Afslut 4.0.435-docs, målchecks og én exact-head; merge uden at gentage
   providerfri code-only, fordi 4.0.434-koden allerede er online.
5. [ ] Kør én almindelig weather. Kræv DMI-start og mål lokal vind fra 0/673,
   derefter Copernicus/Open-Meteo-huller, score, Feggesund og cachebevaring.
6. [ ] Ved manglende vækst: stop på det nye konkrete led og krydstjek hele
   kæden; ingen blind oneoff eller genstart fra allerede beviste trin.

# Aktiv roadmap – 2026-09-19, 4.0.434 checkpoint-N/A og lokal vind

1. [x] Lever 4.0.433 via exact-head `35451524450`, PR #378 og main
   `b6afcdca`.
2. [x] Bevis i providerfri `35451791985`, at den afgrænsede sekskodeaudit nu
   passerer uden DMI/Copernicus/Open-Meteo.
3. [x] Afgræns næste stop til et Candidate G-checkpoint, der fejlagtigt blev
   krævet under `BUILDING_MEASURED_ONLY`; den anden fejl var kun følgefejl.
4. [x] Genindfør N/A-disposition og tre skipped checkpointudfald i både
   code-only og normal weather; bevar privat integreret runtime uændret.
5. [ ] Bestå målrettede slutchecks og én exact-head, merge 4.0.434 og kør én
   providerfri code-only til verificeret Pages og central afslutning.
6. [ ] Kør derefter almindelig weather. Mål lokal vind fra 0/673 mod 673/673,
   aktuelle scorevisninger, DMI→Copernicus→Open-Meteo, Feggesund og cache.
7. [ ] Stop og analysér ved manglende reel fremgang; ingen blind oneoff.

# Aktiv roadmap – 2026-09-19, 4.0.433 fra kendt diagnostik til normal weather

4.0.432 er merged som `0d2fd78a`. Providerfri `35449470349` bestod hele den
beskyttede restore-/migrations-/genbygningskæde med 210/673, men stoppede før
artifact på seks følgefund fra den gemte runtimes 0/673 lokale vind og 420
utilgængelige aktuelle modes. 4.0.433 tillader kun det eksakte kendte sæt
under metadata-only, nul replay/privacy/continuationfejl og uændret vejr.

RavRadar har én offentlig model: integreret RavScore. Candidate G er
pensioneret som produktionsvalg. Næste rækkefølge er målchecks, én exact-head,
merge, providerfri code-only, derefter én almindelig weather på den aktuelle
kode. Hvis lokal vind/score stadig ikke vokser, stoppes og analyseres hele
kæden før gentagelse. Flere normale runs skal derefter bevise punkt 8–10.

# Aktiv roadmap – 2026-09-19, 4.0.432 fra ACTIVE31 til code-only deploy

4.0.431 er merged (`686ebec4`), og providerfri `35448284914` har afsluttet
PENDING som ACTIVE31/profil73 samt anvendt migration `20260919020000`. Den
stoppede før deploy på en ufuldstændig forgænger-importlukning. 4.0.432 retter
både den synlige og den næste latente hjælperafhængighed samlet. Næste er
målchecks, én exact-head, merge og samme providerfri code-only. Ingen weather
før koden er online. Derefter fortsætter hele punkt 8–10 nedenfor; ingen del
af vejrmatricen er bortfaldet.

# Aktiv roadmap – 2026-09-19, 4.0.431 reentry og stabil drift

Aktuel leveringskant: 4.0.430 er merged (`f7c954fe`), men PENDING30 er ikke
afsluttet. 4.0.431 retter samlet forgængerens kortere readiness og dens
forseglede diagnostics/calibration=false. Næste er én exact-head-gate, merge
og providerfri reentry/code-only. Ingen ny weather før central afslutning.
Derefter fortsætter punkt 8–10 nedenfor som almindeligt produktionsbevis.

# Aktiv roadmap – 2026-09-19, sammenhængende komplet og stabil drift

Udgangspunkt: merged 4.0.429, Pages publiceret, central afslutning og næste
weather blokeret. Læs [helhedsanalysen](../../ai/WEATHER_CHAIN_REVIEW_2026-09-19.md).
Den er nu krydstjekket i [samlet rettelsesplan](../../ai/WEATHER_CHAIN_CROSSCHECK_2026-09-19.md).
Alle punkter bevares; 96-timers-reglen erstatter ikke helhedsgennemgangen.

1. [x] Krydstjek hele kæden og dokumentér både faktiske fejl og latente kanter.
2. [x] Færdiggør komponentdesign lokalt: gyldig DMI bevares; Copernicus/Open-Meteo
   lukker alle øvrige nødvendige vejrtyper/timer, ikke kun strøm/haler.
   Vandstand og tre-timers ændring er efter seneste ejerbeslutning kun DMI;
   CP/OM-datumomregning udgår. Bevar DMI-huller synligt og gyldig gammel DMI.
   DMI skal med ledig kapacitet kunne overtage allerede reservedækkede
   komponenter; fuld reserve er ikke en permanent afslutning af DMI-planen.
   Seneste forslag er nu 96 timers DMI-modelalder, ikke sidste prognosedøgn.
   Nyere gyldig reserve kan da overtage; gyldig DMI bevares uden erstatning.
   Se DEC-0210's topafsnit; produktionsbevis mangler.
3. [x] Ret lokalt readiness, fælles genindgang, jobidentitet, komplette slutudfald,
   serialisering, body-retry og komponentfriskhed samlet.
4. [x] Merge 4.0.431 og afslut allerede publiceret target providerfrit;
   `35448284914` lukkede PENDING som ACTIVE31 uden providers. Code-only
   Pages-deploy af ny kode afventer 4.0.432's kompatibilitetslukning.
5. [x] Bevar modelhistorik under warmup og ved kode-only-levering lokalt.
6. [x] Ret acquisitionplan, cache/proveniens og PART-adapter som én kæde.
   Medtag peak/mean-wave-decoder, sidste tre trends, atomisk normalisering,
   DMI-opgradering, provideralder og feltkorrekt reserveadmission/replay.
7. [x] Lever lokalt små tidskorrekte browserpakker; aktuel time, detaljer, pile og
   ture skal virke efter timeskift og ny deploy i en allerede åben fane.
8. [ ] Bevis gyldig numerisk dækning og normal vedligeholdelse gennem flere
   leverandørfaser; kontrolleret genåbning af scheduler, derefter øvrig roadmap.
9. [ ] Bevis selvkørende drift uden Codex/ejercomputer mellem runs: ren
   runner, midlertidig providerfejl, budgetudløb, bevaret fremgang/rotation,
   vinduesskift og afsluttet publicering. Lever kort dansk driftsvejledning
   og få handlingsrettede meldinger om vedvarende fejl. Design til mindst
   mulig service og omtrent årligt eftersyn; ingen garanti mod APIændringer.
10. [x] Fjern lokalt genoptagelsens afhængighed af midlertidige 14-dages filer:
    nødvendig evidens skal overleve, så længe en overgang er uafsluttet.
    Bevis korrekt afslutning på ren runner ved artifactudløb og sikker
    oprydning bagefter. Ingen manuel Codex-redning, falsk completion eller
    blot længere retention. Almindelig samme-binding drift må ikke få et
    nyt unødvendigt recoverylag. Rigtig save/restore/reentry mangler bevis.

Ingen scoreformel-/geometriændring. MISSING er nødadfærd, ikke målet.

Senere særskilt ved legitim punktaktivering: design kontrolleret migration
af uændrede donoridentiteter, så én vandpunktsændring ikke nødvendigvis
kræver fornyelse af alle øvrige reserver. Dette må ikke indføres som skjult
svækkelse af registrybinding i den aktuelle vejrrettelse.

# Historisk roadmap – 4.0.429 fra gemt 02:00-vejr til reel normal HARMONIE

1. [x] Lever 4.0.428 gennem exact-head, PR #373 og main `a2d03d95`.
2. [x] Bevar providerarbejdet fra normalrun `35416641052`; afgræns det sene
   readiness-stop uden ny vejrhentning.
3. [x] Afgræns providerfri `35419876748` til saved-weather-auditreglen.
4. [x] Afgræns manglende H0 til både forkert marine-identitet og manglende
   arbejdstid efter katalogprefetch og marine reserver.
5. [x] Ret alle tre forhold samlet og tilføj målrettede regressioner.
6. [ ] Lever 4.0.429 gennem måltests og én exact-head sourcegate.
7. [ ] Merge og deploy gemt 02:00-runtime providerfrit; verificér Pages og
   offentlig version uden at gentage DMI/Copernicus/Open-Meteo.
8. [ ] Kør én almindelig weather og bevis HARMONIE-asset, score, providerorden
   og samlet restdækning.
9. [ ] Luk nul H0-vind, 420 utilgængelige modes, 156 Feggesund-huller og øvrige
   nødvendige felter; bevis derefter stabil normal cachevedligeholdelse.

DEC-0209. Ingen oneoff. Fuld gyldig dækning er fortsat målet.

# Aktiv roadmap – 4.0.428 fra H0-vind og artifact til virkelig normal drift

1. [x] Lever 4.0.427 gennem exact-head, PR/merge og grøn backend.
2. [x] Gennemfør normalrun `35411701055` og bevar provider-/stagebeviset.
3. [x] Afgræns HARMONIE-fravær til collection-cooldown før kritisk H0-valg.
4. [x] Afgræns Pages-stoppet til historical-maintenance-sealens afvigelse fra
   den allerede gældende diagnostiske deploykontrakt.
5. [x] Ret begge årsager afgrænset; bevar admission, privacy, artifact,
   modelbinding og kalibreringsstop.
6. [ ] Lever 4.0.428 gennem måltests og én exact-head sourcegate.
7. [ ] Kør én almindelig weather og verificér HARMONIE-forsøg, privat runtime,
   Pages, aktuel score og korrekt slutstatus.
8. [ ] Brug samme runs stageoversigt til én samlet lukning af alle resterende
   felter, inklusive 2.334 providerpar og 153 Feggesund-bølgedeltimer.
9. [ ] Bevis efterfølgende normal cachevedligeholdelse, genaktivér scheduler
   og fortsæt site- og roadmapgennemgangen.

DEC-0208. Ingen oneoff. Fuld gyldig dækning er fortsat målet.

# Aktiv roadmap – 4.0.427 fra gyldigt providerinput til komplet normal drift

1. [x] Lever 4.0.426 gennem exact-head `35404863947`, PR #371 og main
   `41a39bbc`.
2. [x] Gennemfør normalrun `35405307261` og afgræns samlet adapter-, HARMONIE-,
   DKSS-prioritets- og privat-publiceringsfejl.
3. [x] Bevar den 673/673 operationelle current-closure uafhængigt af valgfri
   historik; ret HARMONIE til eksakt H0 og DKSS til tidligste reelle hul først.
4. [x] Tillad en nyere privat produktion at afløse historisk modelbinding uden
   at åbne samme-time-konflikt eller tidsregression.
5. [ ] Lever 4.0.427 gennem måltests og én exact-head sourcegate.
6. [ ] Kør én almindelig weather; kræv privat runtime/checkpoint, Pages,
   aktuel score, Feggesund 354/354 og 100 % gyldige nødvendige felter.
7. [ ] Hvis par stadig mangler, brug stageoversigten til én samlet rettelse af
   den resterende kategori; bevis derefter normal cachevedligeholdelse.
8. [ ] Genaktivér først scheduler efter stabilt normaldriftsbevis og fortsæt
   derefter den samlede site- og roadmapgennemgang.

DEC-0207. Ingen oneoff. `MISSING` er robusthed, aldrig et driftsmål.

# Historisk roadmap – 4.0.426 fra measured recovery til komplet normal drift

1. [x] Lever 4.0.425 gennem exact-head `35403040711`, PR #370 og main
   `05892afc`.
2. [x] Afgræns normalrun `35403510608`: ingen kompatibel runtime og intet
   checkpoint i hverken GitHub-cache eller Supabase; ingen provider/dataændring.
3. [x] Gennemgå hele state-less recoveryvejen til runtimeaudit, checkpoint,
   privat runtime, Pages og central historical-maintenance-reseal.
4. [x] Tillad kun active historical integrated measured cold replay ved reelt
   filfravær; bevar hårdt stop for eksisterende ugyldigt/udløbet checkpoint.
5. [ ] Commit/push 4.0.426 og bestå én exact-head sourcegate før merge.
6. [ ] Kør én almindelig weather, ikke oneoff, og kræv providerfremgang, ny
   runtime/checkpoint, 100 % gyldige felter, Feggesund 354/354, aktuel time og
   scorer.
7. [ ] Brug stageoversigten til samlet rettelse af enhver rest og bevis normal
   cachevedligeholdelse før scheduler genaktiveres.

DEC-0206-tillæg. `MISSING` er robusthed, aldrig et driftsmål.

# Historisk roadmap – 4.0.425 fra historical-maintenance til komplet normal drift

1. [x] Lever 4.0.424 gennem exact-head `35401458027`, PR #369 og main
   `0b4a08ec`.
2. [x] Afgræns `35401927838` til den for snævre fallback efter korrekt
   klassifikation som `integrated-historical-maintenance`; ingen providerkald.
3. [x] Gennemgå resten af hele actionvejen og bevar særskilt normal seal,
   checkpointvalidering, Pages og central afslutning.
4. [x] Tillad kun historical maintenance uden kompatibel runtime, når et
   aktuelt fuldt valideret 673-dels-checkpoint findes; ingen stateless cold start.
5. [ ] Lever 4.0.425 med måltest og én exact-head sourcegate.
6. [ ] Kør én almindelig weather, ikke oneoff, og kræv faktisk providerfremgang,
   100 % gyldige felter, Feggesund 354/354, aktuel time og scorer.
7. [ ] Brug den payloadfri stageoversigt til samlet rettelse af enhver rest og
   bevis normal cachevedligeholdelse før scheduler genaktiveres.

DEC-0206-tillæg. `MISSING` er fortsat robusthed, aldrig et driftsmål.

# Historisk roadmap – 4.0.424 fra runtime-recovery til komplet normal drift

1. [x] Lever 4.0.423 gennem exact-head, PR #368, main `8718c1ec` og grøn
   backendinstallation `35400575522`.
2. [x] Afgræns `35400832705` til inkompatibel gammel privat runtime før
   providerkald; migration og aktiv model er korrekte.
3. [x] Før kun aktiv `integrated` videre til den eksisterende målte stateless
   recovery efter tre restoreforsøg; bevar fail-closed for andre actions.
4. [ ] Lever 4.0.424 med måltest og én exact-head sourcegate.
5. [ ] Genkør én almindelig weather, ikke oneoff, og kræv faktisk provider-
   fremgang, 100 % gyldige felter, Feggesund 354/354, aktuel time og scorer.
6. [ ] Brug payloadfri stageoversigt til samlet rettelse af enhver rest og
   bevis derefter normal cachevedligeholdelse før scheduler genaktiveres.

DEC-0206-tillæg. `MISSING` er fortsat robusthed, aldrig et driftsmål.

# Historisk roadmap – 4.0.423 fra strukturel pakke til komplet normal drift

1. [x] Afgræns 4.0.422-run `35386276428`: verificeret deploy, men ufuldstændig
   numerisk dækning og falsk rød terminal.
2. [x] Gennemgå hele kæden fra scheduler, DMI/WAM, replay og modelinput til
   artifact, Pages, offentlig runtime og slutstatus.
3. [x] Ret reelt opløselig vindhorisont, sikker HARMONIE-seriesøgning,
   replaystart, Feggesund-støttezoner og providerfamiliernes tidsestimat.
4. [x] Skeln mellem sikkert håndteret `MISSING` og faktisk gyldig dækning;
   kun 100 % gyldige nødvendige felter må kaldes komplet.
5. [x] Saml manuel/cron-slutstatus og tilføj payloadfri 673-dels inputtrace.
6. [ ] Afslut 4.0.423-version, RDKS/håndbog, måltests og rent
   geodataversionsbevis.
7. [ ] Commit/push, bestå én exact-head sourcegate, merge og kør én almindelig
   weather fra de gemte cacher; ingen oneoff.
8. [ ] Kræv faktisk 100 % gyldig dækning, Feggesund 354/354, aktuel time og
   scorer. Ved rest: brug stageoversigten og ret hele fejlkategorien samlet.
9. [ ] Bevis med næste almindelige drift, at rotationen vedligeholder cachen;
   genaktivér først derefter scheduler og fortsæt site-/roadmapgennemgangen.

DEC-0206. `MISSING` er robusthed, aldrig et accepteret driftsmål.

# Historisk roadmap – 4.0.422 fra Pages-handoff til samlet online drift

1. [x] Før 4.0.421 providerfrit gennem eksakt audit, privat runtime, privacy,
   Edge og artifact i buildjob `105726470812`.
2. [x] Afgræns Pages-stop før deploy til en falsk historisk-actionregel.
3. [x] Gennemgå alle source-repair-brug i Pages og før aktiv `integrated`
   gennem source-manifest, seal, 79/79 og evidensupload.
4. [x] Bevar target strict og normal central reseal efter verificeret deploy.
5. [x] Afslut version/RDKS/håndbog, måltests og geodataversionsbevis.
6. [ ] Commit/push, én exact-head, merge og providerfri 4.0.422 code-only.
7. [ ] Verificér offentlig version, 19-tiden, scoretilstand og central reseal.
8. [ ] Fejlsøg 672/420 live, bevis normal cachevedligeholdelse og fortsæt roadmap.

DEC-0205. Ingen oneoff eller vejrprovider i rettelsesleveringen.

# Roadmap – 4.0.421 fra kendt auditstop til samlet online drift

1. [x] Lever 4.0.420 gennem exact-head `35381401273`, PR #365 og main
   `069de220`.
2. [x] Afgræns code-only `35381918986` til audit før writes/deploy.
3. [x] Bevis, at targetaudit er identisk med begge forseglede kildeaudits.
4. [x] Fastlås tre-hash-reglen under det eksakte DEC-0203-repair-id og bevar
   alle senere afgørende kontroller.
5. [x] Afslut version/RDKS/håndbog, måltests og geodataversionsbevis.
6. [ ] Commit/push, én exact-head, merge og providerfri 4.0.421 code-only.
7. [ ] Verificér offentlig version, 19-tiden, central afslutning og den
   faktiske scoretilstand i Chrome.
8. [ ] Fejlsøg 672/420 live, bevis almindelig cachevedligeholdelse og
   genaktivér først derefter scheduler; fortsæt site- og roadmapgennemgang.

DEC-0204. Ingen oneoff; ingen vejrprovider i rettelsesleveringen.

# Roadmap – 4.0.420 fra offentlig vejropdatering til samlet drift

1. [x] Gennemfør normal weather `35374238410` med alle providere, gemte caches,
   fulde produktionsgates, Pages og offentlig 210/673-verifikation.
2. [x] Afgræns den sene fejl til central readiness på forgængerens head.
3. [x] Bevis at ukendt public-ahead-central stopper før mutation i
   providerfri `35379571657`.
4. [x] Fastlås en engangsregel til de eksakte centrale og offentlige beviser;
   kræv 79/79 filer og nul manglende filer.
5. [ ] Afslut versions-/RDKS-/håndbogs- og geodatakontroller.
6. [ ] Commit/push, bestå én exact-head, merge og lever 4.0.420 providerfrit.
7. [ ] Verificér offentlig version, 19-tiden, scorevisning og central reseal.
8. [ ] Kør og bevis næste almindelige vedligeholdelse; genaktivér først derefter
   scheduler og fortsæt site-/roadmapgennemgang.

DEC-0203. Ingen oneoff; ingen ny vejrprovider i rettelsesleveringen.

# Aktiv roadmap – 4.0.419 fra kontraktstop til almindelig weather

1. [x] Lever 4.0.418 source gennem exact-head `35366221956`, PR #362 og main `9573264f`.
2. [x] Afgræns code-only `35366953774` til forkert krav om scoreændring efter korrekt `CONTRACT_ONLY_REBIND`.
3. [x] Stop den identiske gentagelse `35368826476` og bevis, at normal `35369122090` stoppede før providerkald på gammel kontraktbinding.
4. [x] Før migrationsklassifikationen gennem code-only og Pages; kræv uændret score ved ren kontraktombinding.
5. [x] Afslut version, RDKS, håndbog og målrettede workflow-/runtimekontroller.
6. [ ] Commit/push, bestå én exact-head, merge og lever én providerfri code-only.
7. [ ] Kør én almindelig weather på gemte cacher; verificér 4.0.418-horisont, deploy, aktuel time og providerfordeling.
8. [ ] Bevis næste normale cachevedligeholdelse, genaktivér scheduler og fortsæt site-/roadmapgennemgang.

DEC-0202. Ingen oneoff; ingen ny providerhentning før code-only er live.

# Aktiv roadmap – 4.0.418 fra tidsaksefejl til stabil normal drift

1. [x] Lever og liveverificér 4.0.417 gennem exact-head, PR #361 og providerfri code-only.
2. [x] Kør normal weather `35357557315`; gem DMI-, Copernicus-, regional DMI- og Open-Meteo-fremgang.
3. [x] Afgræns stoppet til en ældre DMI-starttime, der forskød én offentlig zones 118 timer.
4. [x] Ret den fælles sammenlægning og endelige zonematerialisering til præcis produktionstime +0..+117.
5. [x] Bevar gyldige samme-time-komponenter; repræsentér reelle lokale huller som `MISSING` uden at forskyde aksen.
6. [x] Gennemgå DMI-rotationen og bevar den, fordi reelle del/time-huller allerede prioriteres før fornyelse.
7. [x] Afslut version, RDKS, håndbog, målrettede slutkontroller og rent geodataversionsbevis.
8. [x] Commit/push, bestå exact-head `35366221956` og merge PR #362 som main `9573264f`.
9. [ ] Lever koden uden providerkald gennem 4.0.419/DEC-0202.
10. [ ] Kør én almindelig weather på de gemte cacher; verificér publicering, aktuel time, lokale femdøgn og providerfordeling.
11. [ ] Bevis næste almindelige vedligeholdelse; genaktivér først derefter scheduler og fortsæt site-/roadmapgennemgang.

DEC-0201. Ingen oneoff; bootstrap kun ved senere målt utilstrækkelig normal fremgang.

# Aktiv roadmap – 4.0.417 fra sammenhængende score til stabil normal drift

1. [x] Lever 4.0.416 gennem exact-head `35351272955`, PR #360 og main `496ba278`.
2. [x] Reparer 673/673 continuations i `35351928923`; bevis nul måleændringer og grøn replay.
3. [x] Afgræns de 156 fund til afledte modes, som ikke blev genberegnet ovenpå repareret state.
4. [x] Genberegn mode → offentlig delscore → aktuel zonevinder atomisk og lås al vejr/geometri/tid.
5. [ ] Lever 4.0.417 gennem én exact-head og samme providerfri code-only.
6. [ ] Verificér offentlig version, aktuel time, historik, lokale femdøgn og scorer i browseren.
7. [ ] Opret sikker current-main-indgang til normal weather uden de tre gamle køposter.
8. [ ] Kør én almindelig weather; mål DMI → Copernicus → Open-Meteo, gammel-over-tom og ærlige lokale huller.
9. [ ] Bevis næste cachevedligeholdelse og genaktivér først derefter scheduler.

DEC-0200. Ingen oneoff; bootstrap kun ved senere målt databehov.

# Tidligere roadmap – 4.0.416 fra kendt privat state til stabil normal drift

1. [x] Lever 4.0.415 gennem exact-head `35348220691`, PR #359 og main `3a705259`.
2. [x] Bevis i saved-weather `35349088863`, at historical-maintenance-handlingen accepteres; targetet var ikke nyere end offentlig 09:00.
3. [x] Kør korrekt samme-time code-only `35349313096`; gendan den eksakte beskyttede 4.0.410-runtime og afgræns stoppet til rækkefølgen mellem gammel validator og kendt reparation.
4. [x] Tillad kun den kanoniske last-mile-reparation af minimums- og maksimumsspor; afvis alle andre private ændringer og gruppér ens fejl.
5. [ ] Afslut målrettede slutkontroller, exact-head, merge og samme providerfri code-only.
6. [ ] Verificér offentlig 4.0.416, aktuel time, sammenhængende historik, lokale femdøgnsprognoser og scorer i browseren.
7. [ ] Opret en sikker current-main-indgang til almindelig weather; det gamle workflow forbliver deaktiveret, så tre gamle køposter ikke kan starte på forældet kode.
8. [ ] Kør én almindelig weather og mål DMI → Copernicus → Open-Meteo, cachebevaring, gammel-over-tom og lokale ærlige `MISSING`.
9. [ ] Bevis næste almindelige vedligeholdelse og genaktivér først derefter scheduler.

DEC-0199. Ingen oneoff; bootstrap kun ved målt behov.

# Aktiv roadmap – 4.0.415 fra gemt runtime til almindelig vejrdrift

1. [x] Lever 4.0.414 og registrér det allerede offentlige target som central version 24.
2. [x] Installer og verificér den append-only last-mile-binding uden providerarbejde.
3. [x] Afgræns det næste stop til en gammel eksakt handlingskontrol før private runtime/artifact/Pages.
4. [x] Tillad begge sikre integrerede maintenanceformer og afvis fortsat alle modelskift.
5. [ ] Lever 4.0.415 gennem exact-head og providerfri saved-weather.
6. [ ] Verificér offentlig version, aktuel time, historik og lokale femdøgnsprognoser.
7. [ ] Kør almindelig weather; mål DMI → Copernicus → Open-Meteo og ret reelle huller samlet.
8. [ ] Bevis næste almindelige cachevedligeholdelse og tilføj generel post-Pages-genoptagelse.
9. [ ] Genaktivér scheduler først efter stabil normal drift.

DEC-0198. Ingen oneoff; bootstrap kun ved målt behov.

# Aktiv roadmap – fra recovery til pålidelig vejrdrift uden prognosehuller

1. [x] Bevis at live 4.0.410 og de gemte providercacher findes, og at den aktuelle blokering er central registrering frem for manglende vejropbygning.
2. [x] Afgræns 4.0.413-stoppet til et irrelevant transitionnavn og bevis den faktiske source som normal integrated maintenance.
3. [x] Implementér direkte same-binding-sourcebevis med samlet fejlrapport uden at svække target eller CAS.
4. [ ] Lever 4.0.414 gennem én exact-head, merge og den fastlåste recovery.
5. [ ] Deploy last-mile-rettelsen providerfrit fra gemt vejr og verificér siden.
6. [ ] Kør én almindelig vejrhentning; mål DMI først, Copernicus som næste lag og Open-Meteo kun som dokumenteret rest.
7. [ ] Verificér aktuel time, sammenhængende historik og lokale femdøgnsprognoser på siden; ret reelle huller samlet.
8. [ ] Bevis endnu en almindelig cachevedligeholdelse og tilføj generel same-binding-genoptagelse efter et eventuelt post-Pages-runnerstop.
9. [ ] Genaktivér scheduler først efter bevist normal drift; fortsæt derefter de stadig aktuelle roadmap-punkter.

DEC-0197. Ingen oneoff; bootstrap kun hvis målt restdækning og normal kapacitet kræver det.

# Aktiv roadmap – 4.0.410 fra kontrolstop til aktuelle prognoser

1. [x] Lever 4.0.409 gennem exact-head `35318809153`, PR #353, main `013baac8` og code-only `35320190547`.
2. [x] Kør normal weather `35320738621`; gennemfør providere, closure, historik, central weather, proveniens og offentlig runtime.
3. [x] Bevis at 4.0.409 fjernede `RAVSCORE_RECOVERY_REPLAY_CONFLICT`.
4. [x] Afgræns næste stop til runtimeaudit med 673 `LAST_MILE_STATE`; 420 aktuelle modes var utilgængelige.
5. [x] Lad alle uafhængige driftskontroller køre og samle fund uden at blokere ellers gyldige friske prognoser.
6. [x] Bevar hårde grænser for target/main, byggeligt artifact, privat state, privacy og forseglet deploy.
7. [x] Upload normal runtimeaudit og samlet payloadfri driftsrapport; opdel last-mile-fejl i præcise underkategorier.
8. [x] Afslut måltests, dokumentation, version, uændret modelbundle og rent geodataversionsbevis.
9. [ ] Commit/push, bestå én exact-head, merge og lever kode providerfrit.
10. [ ] Kør én almindelig weather på gemte cacher; verificér fortsættelse, rapport, deploy, levende prognoser og præcis statefejl.
11. [ ] Ret den dokumenterede statefejl uden at afbryde vejrtilgængeligheden; bevis næste normale vedligeholdelse før scheduler.
12. [ ] Fortsæt site-, kildeprioritets- og roadmapgennemgang efter bevist normal drift.

DEC-0193. Ingen oneoff; bootstrap kun ved målt behov.

# Aktiv roadmap – 4.0.409 fra prognoserevision til normal drift

1. [x] Lever 4.0.408 og livebevis Copernicus-journalrettelsen i `35311408813`.
2. [x] Gennemfør alle providerled og gem DMI-, Copernicus- og Open-Meteo-fremgang.
3. [x] Afgræns centralstoppet til gammel kontra nyere gyldig DMI-bølge i recovery.
4. [x] Implementér nyeste gyldige komponent pr. `modelRun`, sted og time.
5. [x] Bevis uafhængig strøm/bølge, gammel-over-tom og fortsat hård samme-run-konflikt.
6. [x] Bestå de fem målrettede kode-/modelbeviser uden ændret modelbundle.
7. [ ] Afslut dokumentation, version, installationskopi og rent geodataversionsbevis.
8. [ ] Commit/push, bestå én exact-head, merge og lever kode providerfrit.
9. [ ] Kør én almindelig weather på gemte cacher; verificér central weather, score/runtime og deploy.
10. [ ] Vurdér bootstrap alene mod den målte restdækning.
11. [ ] Bevis næste normale vedligeholdelse, genaktivér scheduler og fortsæt site-/score-/roadmapgennemgang.

DEC-0192. Ingen oneoff.

# Aktiv roadmap – 4.0.408 fra gemt providerfremgang til normal drift

1. [x] Lever 4.0.407 og verificér live version/modelbinding.
2. [x] Kør normal weather `35306467385`; gennemfør DMI og gem providerfremgang.
3. [x] Afgræns Copernicus-stoppet til replay af et forældet segmentjournalforsøg.
4. [x] Bevar positive målinger i donorbanken og filtrér kun den korte forsøgsjournal efter fire timer.
5. [x] Bestå de tre målrettede Copernicus-kontroller og syntaks.
6. [x] Afslut dokumentation, versionskontrol, uændret modelbinding og rent geodataversionsbevis.
7. [ ] Commit/push, bestå én exact-head, merge og lever kode providerfrit.
8. [ ] Kør én almindelig weather på de gemte cacher; verificér Copernicus, Open-Meteo, score/runtime og deploy.
9. [ ] Vurdér bootstrap alene mod den målte restdækning.
10. [ ] Bevis næste normale vedligeholdelse, genaktivér scheduler og fortsæt site-/score-/roadmapgennemgang.

DEC-0191. Ingen oneoff.

# Aktiv roadmap – 4.0.407 fra gemte cacher til bevist normal drift

1. [x] Lever 4.0.406 gennem PR #350 og verificér live scorer/femdøgn.
2. [x] Kør normal weather `35253587766`; gem alle tre providercacher og afgræns deploystoppet til state replay 673/673.
3. [x] Bevis at HARMONIE ikke startede, fordi `missingAnyWind` accepterede ét gammelt vindpunkt.
4. [x] Ret triggeren til manglende 96-timers vindhorisont og bevar præcis ét HARMONIE-asset først.
5. [x] Tilføj payloadfri replayfejlfordeling uden at svække den hårde artifactgate.
6. [ ] Afslut måltests, RDKS, changelog, håndbog og rent geodataversionsbevis.
7. [ ] Commit/push, bestå én exact-head, merge og lever kode providerfrit.
8. [ ] Kør én almindelig weather på gemte cacher; verificér HARMONIE først, 673-state-replay, scorer, providerfordeling og deploy.
9. [ ] Vurdér bootstrap alene mod målt restdækning; kør den kun ved dokumenteret behov.
10. [ ] Bevis næste normale vedligeholdelse, genaktivér scheduler og fortsæt site-/roadmapgennemgang.

DEC-0190. Ingen oneoff.

# Aktiv roadmap – 4.0.406 fra manglende delvind til normal drift

1. [x] Bevis live 210/673, 141 brugbare zoner og 69 helt utilgængelige zoner.
2. [x] Ret mobilens skjulte startpakke med et ærligt tidsmærket snapshot.
3. [x] Afgræns 69 zoner til manglende delvind og ret normal DMI-plan med ét HARMONIE-forsøg først.
4. [x] Fjern ren UI-tekst fra modelclosure; bevar aktiv modelbundle og databasebinding.
5. [ ] Commit/push og bestå én ny exact-head på den rettede head.
6. [ ] Merge og deploy kode uden providerkald; verificér mobil og desktop.
7. [ ] Kør én almindelig weather og mål vinddækning, scorer og providerfremgang. Ingen oneoff.
8. [ ] Bevis næste vedligeholdelse, genaktivér scheduler og fortsæt site-/roadmapgennemgang.

DEC-0188/0189.

# Historisk roadmap – 4.0.405 fra fælles tidskontrakt til offentlig prognose

1. [x] Lever 4.0.404 og genbrug den gemte 09Z-runtime uden providerkald.
2. [x] Gennemfør artifact, privacy, privat runtime og Edge i 35216079458.
3. [x] Afgræns Pages-stoppet til den fælles parsers afvisning af ækvivalent .000Z.
4. [x] Ret parseren centralt og måltest både produktionstime og horisont.
5. [ ] Commit/push, bestå én exact-head og merge samme head.
6. [ ] Fortsæt uden providerkald til Pages og verificér levende prognoser/scorer.
7. [ ] Kør næste almindelige vedligeholdelse og mål providerfordeling/cachefremgang.
8. [ ] Genaktivér scheduler efter bevist vedligeholdelse; fortsæt site- og roadmapgennemgang.

DEC-0187. Ingen ny oneoff eller vejrhentning i rettelsesdeployet.

# Aktiv roadmap – 4.0.404 fra tidsformatkant til offentlig prognose

1. [x] Bestå 4.0.403 exact-head, merge PR #347 og start providerfri fortsættelse.
2. [x] Afgræns 35214668708 før writes/Pages til .000Z mod kanonisk Z.
3. [x] Normalisér kun den ækvivalente time og kræv eksplicit FRESH under 240 minutter.
4. [ ] Afslut målrettede tests, dokumentation, diff og geodataversionsbevis.
5. [ ] Commit/push, bestå én exact-head og merge samme head.
6. [ ] Fortsæt den gemte 09Z-runtime uden providerkald; verificér live prognoser og scorer.
7. [ ] Kør næste almindelige vedligeholdelse og mål providerfordeling/cachefremgang.
8. [ ] Genaktivér scheduler efter bevist vedligeholdelse og fortsæt site-/roadmapgennemgang.

DEC-0186. Ingen ny oneoff eller vejrhentning i rettelsesdeployet.

# Aktiv roadmap – 4.0.402 fra teststop til frisk offentlig prognose

1. [x] Lever 4.0.401 exact-head/PR/merge og providerfri code-only.
2. [x] Kør almindelig weather 35187767148; gennemfør provider-, cache-, closure-, historik-, runtime- og auditkæden.
3. [x] Afgræns stoppet til forældet DMI-test og gennemgå hele efter-vejr-kontrollen.
4. [x] Erstat 277+44 gentagne blokeringer med 52 artifactkritiske og tre releasekontroller, som samler alle fejl.
5. [x] Bevar runtime-, Supabase-, checkpoint-, privacy-, artifact- og deploytrin som hårde.
6. [x] Ret browserens gamle versionsfallback og de beslægtede regressioner.
7. [x] Afslut version/RDKS/håndbog, målrettede tests, diff og geodatabevis.
8. [ ] Commit/push, bestå én exact-head og merge samme head.
9. [ ] Kør providerfri code-only og verificér offentlig 4.0.402/210/673.
10. [ ] Kør én almindelig weather på gemte cacher; verificér friske prognoser, scorer og lokale huller. Ingen oneoff.
11. [ ] Kør næste normale vedligeholdelse og mål DMI → Copernicus → regional DMI → Open-Meteo.
12. [ ] Genaktivér scheduler først efter bevist vedligeholdelse; gennemgå derefter hele sitet og fortsæt aktuelle roadmap-punkter.

DEC-0184.

# Aktiv roadmap – 4.0.401 fra historisk checkoutstop til frisk offentlig prognose

1. [x] Lever 4.0.400 exact-head/PR/merge og providerfri code-only med offentlig 210/673.
2. [x] Kør én almindelig weather; gennemfør alle provider-, cache-, closure-, historik-, build- og runtimeauditled.
3. [x] Bevis 4.0.400's nationale shadow-rettelse og afgræns næste stop til manglende `49dd4cb` i den genbrugte sourceproof-rute.
4. [x] Tilføj præcis historikforberedelse umiddelbart før fuldvalideringen uden fuld Git-history checkout.
5. [x] Bestå målrettede kontrakter, version/RDKS/håndbog, diff og rent geodataversionsbevis.
6. [ ] Commit/push, bestå én exact-head og merge samme head.
7. [ ] Kør providerfri code-only og verificér offentlig 4.0.401/210/673 uden private lækager.
8. [ ] Kør én almindelig weather på gemte DMI-, Copernicus- og Open-Meteo-cacher; verificér friske prognoser, scorer og ærlig lokal missing. Ingen oneoff.
9. [ ] Kør næste normale vedligeholdelse og mål DMI → Copernicus → regional DMI → Open-Meteo samt cachefremgang.
10. [ ] Genaktivér scheduler først efter bevist normal vedligeholdelse.
11. [ ] Gennemgå hele sitet på den levende runtime og fortsæt kun stadig aktuelle roadmap-punkter.

DEC-0183. Ingen model-, vejr- eller kildeprioritetsændring.

# Aktiv roadmap – 4.0.400 fra falsk teststop til frisk offentlig prognose

1. [x] Lever 4.0.399 exact-head/PR/merge og providerfri code-only med offentlig 210/673.
2. [x] Kør én almindelig weather; gennemfør alle provider-, cache-, closure-, historik-, build- og runtimeauditled.
3. [x] Afgræns stoppet efter den grønne runtimeaudit til den gamle shadows tests vilkårlige 180-tegnsvindue.
4. [x] Ret testen til eksakt YAML-trin, flyt den ind i billig source-critical kontrol og hærd versionsværktøjet.
5. [x] Bestå målrettede kontroller, 79-fils browserlukning, RDKS/håndbog, diff og rent geodataversionsbevis.
6. [ ] Commit/push, bestå én exact-head og merge samme head.
7. [ ] Kør providerfri code-only og verificér offentlig 4.0.400/210/673 uden private lækager.
8. [ ] Kør én almindelig weather på gemte cacher; verificér friske prognoser, scorer og 420 eller færre ærlige lokale huller. Ingen oneoff.
9. [ ] Kør næste normale vedligeholdelse og mål DMI → Copernicus → regional DMI → Open-Meteo samt cachefremgang.
10. [ ] Genaktivér scheduler først efter bevist normal vedligeholdelse.
11. [ ] Gennemgå hele sitet på den levende runtime og ryd historiske/dublerede roadmap-punkter mod faktisk evidens.

DEC-0182. Scoremodel, vejr og kildeprioritet er uændrede.

# Historisk roadmap – 4.0.399 fra importstop til fungerende browsergraf

1. [x] Lever 4.0.398 exact-head/PR/merge og afgræns code-only `35175276505` før enhver data- eller produktionsændring.
2. [x] Ret alle 21 browserimports samlet og tilføj regression i begge versionskontroller.
3. [x] Bestå målrettet 79-fils offentlig browserlukning, version/RDKS/håndbog, diff og rent geodataversionsbevis.
4. [x] Commit/push, bestå exact-head `35175844570` og merge PR #343 som main `b86bcf97`.
5. [x] Kør providerfri code-only `35176215202` og verificér offentlig 4.0.399/210/673 uden private lækager.
6. [x] Kør én almindelig weather `35176561317`; provider/cache/build/audit bestod, men en gammel test stoppede før deploy. Ingen oneoff.
7. [ ] Kør næste normale vedligeholdelse og mål DMI → Copernicus → regional DMI → Open-Meteo samt cachefremgang.
8. [ ] Genaktivér scheduler først efter bevist normal vedligeholdelse.
9. [ ] Gennemgå hele sitet på den levende runtime og ryd historiske/dublerede roadmap-punkter mod faktisk evidens.

DEC-0181. Scoremodel, vejr og cache er uændrede.

# Historisk roadmap – 4.0.391 fra globalt stop til gyldig fastholdelse og lokal missing

1. [x] Merge 4.0.390 og gennemfør providerbootstrap `35081537023` på bevarede cacher.
2. [x] Afgræns de sidste 84 par som faktisk forsøgte provider-negative svar, ikke manglende køretid.
3. [x] Fastlæg ejerens permanente rækkefølge: ny gyldig → gammel fortsat gyldig for eksakt par → lokalt `MISSING`.
4. [x] Ret DMI-, Copernicus-, regional- og Open-Meteo-genbrug, så tomme eller modstridende nye leveringer aldrig skygger for ældre gyldige værdier.
5. [x] Byg closure/state med alle 79.414 identiteter og eksplicit lokal `MISSING`, uden at kalde datasættet komplet ved en rest.
6. [x] Bevis målrettet, at globale integritetsfejl fortsat stopper, mens lokal datamangel kun rammer berørt del, mode og time.
7. [x] Synkronisér 4.0.391-version, RDKS, håndbog og changelog; bestå måltests og rent geodataversionsbevis.
8. [ ] Commit/push, én exact-head sourcegate og merge.
9. [ ] Kør én almindelig weather med gemte cacher; verificér levende scorer, ærlig missing og DMI/Copernicus-overtagelse.
10. [ ] Genaktivér scheduler efter bevist normal vedligeholdelse og fortsæt site-/roadmapgennemgangen.

DEC-0173 er aktiv. Scheduler er pauset.

# Aktiv roadmap – 4.0.390 fra roterende fremgang til samlet providerbootstrap

1. [x] Merge 4.0.389 som main `bf8eb739` og kør to kontrollerede normale passager med scheduler pauset.
2. [x] Bevis fuld Open-Meteo-køgennemgang: `35069942328` 6.450→5.025 og `35074225256` 5.181→4.565.
3. [x] Bevis højere kildefremgang mellem target 07Z og 08Z: DMI 14.260→14.772 og regional DMI 416→704.
4. [x] Afvis mere blind Open-Meteo-tid og den gamle Candidate G-oneoff; vælg normal post-cutover-rute med eksplicit længere DMI/Copernicus.
5. [x] Implementér main-only `force + extended_provider_bootstrap`, DMI 3.600 sekunder/seks samlinger, Copernicus 3.300 sekunder og 240-minutters jobloft.
6. [x] Synkronisér 4.0.390-version, RDKS og håndbog; bestå måltests og rent geodataversionsbevis.
7. [ ] Commit/push, én exact-head sourcegate og merge.
8. [ ] Kør én forlænget bootstrap på gemte cacher; kræv nul mangler før build/deploy.
9. [ ] Verificér levende numeriske scorer og mål normal DMI/Copernicus-overtagelse; kør højst én yderligere begrundet bootstrap ved reel fortsat fremgang.
10. [ ] Genaktivér scheduler, gennemgå hele sitet og fortsæt aktuelle roadmap-punkter.

DEC-0172 er aktiv. Scheduler er pauset.

# Aktiv roadmap – 4.0.389 fra bevist rotation til komplet normal drift

1. [x] Livebevis 4.0.388-journalrebase, DMI/Copernicus/Open-Meteo-cachegenbrug og anvendt Open-Meteo-rotation i normalrun `35064588725`.
2. [x] Afgræns 5.858 rester til en for kort delt 240-sekundersramme; nul HTTP-, netværks-, kontrakt-, null- eller providerfejl.
3. [x] Afvis den gamle Candidate G-bundne oneoff som post-cutover-rute efter `35067958289`; ingen provider blev kaldt og ingen cachefremgang gik tabt.
4. [x] Sæt normal Open-Meteo til 900 sekunder og `--critical-only`; bevar batch 50, kildeprioritet og hård nul-missing-gate.
5. [x] Bestå målrettede workflow-, YAML-, versions-, sikkerheds- og RDKS-kontroller; bevis rent geodataversionsfelt.
6. [ ] Commit/push, bestå én exact-head sourcegate og merge.
7. [ ] Kør én kontrolleret normal weather med gemte cacher; kræv nul reelle mangler, artifact, deploy og levende numeriske scorer.
8. [ ] Følg Copernicus post-build-refresh og næste normale run; mål at DMI og dernæst Copernicus overtager fra Open-Meteo uden nye huller.
9. [ ] Genaktivér scheduler, når normal vedligeholdelse og kildeprioritet er bevist.
10. [ ] Gennemgå hele hjemmesiden meningsfuldt og fortsæt de stadig aktuelle roadmap-punkter.

DEC-0171 er aktiv. Scheduler er pauset, og den forældede oneoff bruges ikke igen.

# Aktiv roadmap – 4.0.388 fra levende model til frisk normal drift

1. [x] Lever 4.0.387 providerfrit og verificér integreret model, 210 zoner og 673 kystdele offentligt.
2. [x] Start én almindelig weather og bevis DMI-/cachefremgang uden central write eller deploy ved senere fejl.
3. [x] Afgræns Copernicus-stoppet til en gammel segmentjournalpost med nul overlap mod aktuel DMI-hulmatrix.
4. [x] Fjern kun nul-overlap-poster før strict stage; bevar immutable blandede forsøg og alle validerede donorrecords.
5. [x] Bestå afgrænset syntaks- og funktionskontrol; synkronisér version, RDKS, håndbog og rent geodataversionsfelt.
6. [ ] Commit/push, bestå én exact-head sourcegate og merge.
7. [ ] Kør providerfri same-binding code-only for 4.0.388 og genbrug PR''ens sourcebevis.
8. [ ] Kør én almindelig `force=false` weather med gemte cacher; kræv nul reelle mangler før artifact/deploy. Ingen oneoff.
9. [ ] Verificér levende version, numeriske scorer, begge søgemåder, hovedkort, Om RavRadar, admin og privacy.
10. [ ] Genaktivér scheduler og revurdér resterende roadmap-punkter mod faktisk produktværdi.

DEC-0170 er aktiv. Scheduler er pauset, mens den konkrete normale driftsfejl leveres.

# Aktiv roadmap – 4.0.387 fra ny vejrkodekontrakt til bevaret cache

1. [x] Bestå 4.0.386 exact-head `35050098674`, merge PR #329 som main `c3833354` og behold schedulerkontrol.
2. [x] Afgræns normalrun `35050697588` til forventet kontraktafvisning før providers og writes.
3. [x] Kør eksisterende providerfri code-only og afgræns `35051090133` til for snæver actionvagt før predecessor-migration.
4. [x] Tillad kun `integrated` og `integrated-historical-maintenance` på eksakt `CONTRACT_ONLY_REBIND`; behold alle modeltransitioner afvist.
5. [x] Bestå målrettet code-only-kontrakttest.
6. [x] Synkronisér version/RDKS/håndbog, bevis rent geodataversionsfelt og bestå de afgrænsede slutkontroller.
7. [ ] Commit/push og bestå én exact-head sourcegate.
8. [ ] Merge og kør providerfri code-only; kræv byteidentiske vejr-/score-/geometridata, privat publish, Pages og central closure.
9. [ ] Genaktivér scheduler og kør én normal `force=false` weather; bevis DEC-0168-rotation og nul reelle mangler før deploy. Ingen oneoff.
10. [ ] Verificér offentlig version, numeriske scorer, hovedkort, begge søgemåder, Om RavRadar, admin og privacy; revurdér resterende roadmap.

DEC-0169 er aktiv. Scheduler er pauset under genbindingen.

# Aktiv roadmap – 4.0.386 fra bevaret cache til fair normal restfyldning

1. [x] Bevis live, at 4.0.385 gendanner private cacher og lader DMI, Copernicus og Open-Meteo gemme fremgang.
2. [x] Sammenlign to almindelige runs og afgræns stagnationen til gentaget køstart, ikke mistet cache eller for kort samlet DMI-tid.
3. [x] Implementér UTC-/kvarter-/retry-baseret rotation af hele stabile Open-Meteo-batches.
4. [x] Bevar ældst-først-genopfriskning, providerbevis, cacheformat og hård nul-missing-gate; bestå måltests og rent geodataversionsbevis.
5. [ ] Commit/push, én exact-head sourcegate og merge.
6. [ ] Genaktivér scheduler og kør én normal `force=false` weather; bevis rotationsslot, fortsat cachefremgang og nul reelle mangler før deploy. Ingen oneoff.
7. [ ] Verificér offentlig version, numeriske scorer, hovedkort, begge søgemåder, Om RavRadar, admin og privacy.
8. [ ] Revurdér resterende roadmap-punkter mod faktisk produktværdi og luk eller afgræns forældede punkter.

DEC-0168 er aktiv. Scheduler er kun pauset, mens den kendte køfejl leveres.

# Aktiv roadmap – 4.0.385 fra central aktiv model til bevist normal drift

1. [x] Afslut 4.0.384 exact-head, PR #327, merge og central ACTIVE version 2-recovery.
2. [x] Kør første normale standard-weather og bevis, at den stopper før providers/writes på lokal runtime-root.
3. [x] Ret runtime-root, bounded restore-retry og den misvisende Open-Meteo-følgegate samlet.
4. [x] Afslut version/RDKS/geodatabevis og målrettede kontroller.
5. [ ] Commit/push, én exact-head sourcegate og merge.
6. [ ] Genaktivér scheduler og kør én normal tidsbegrænset weather; bevis numeriske scorer, DMI-rotation, fallback og cache. Ingen oneoff.
7. [ ] Gennemgå hovedkort, begge søgemåder, Om RavRadar, admin og privacy på den levende runtime.
8. [ ] Revurdér resterende roadmap-punkter mod faktisk produktværdi og luk eller afgræns forældede punkter.

DEC-0167 er aktiv. Scheduler er kun pauset, mens den deterministiske restorefejl rettes.

# Historisk roadmap – 4.0.384 fra levende 4.0.383 til central sandhed og normal drift

1. [x] Deploy og friskverificér 4.0.383 offentligt som 210/673 uden private payloadlæsninger.
2. [x] Afgræns centralstoppet til forkert historisk source-closure; bevis ingen write og ingen PENDING.
3. [x] Implementér og måltest én atomisk, artifactlåst ACTIVE version 1→2-recovery uden nyt deploy.
4. [x] Afslut versions-/RDKS-/geodatabevis og målrettede slutkontroller.
5. [ ] Commit/push, én exact-head sourcegate, merge og den korte centrale recovery; kræv eksakt version 2 og aktuel binding.
6. [ ] Kør én normal tidsbegrænset weather og bevis numeriske scorer, DMI-rotation, fallback og cachevedligeholdelse. Ingen oneoff.
7. [ ] Gennemgå hovedkort, begge søgemåder, Om RavRadar, admin og privacy meningsfuldt på den levende runtime.
8. [ ] Revurdér de resterende roadmap-punkter mod faktisk produktværdi og luk/afgræns forældede punkter.

DEC-0166 er aktiv. Ingen vejrhentning før punkt 5 er grønt.

# Historisk roadmap – 4.0.383 fra kendt kildedrift til hel offentlig closure

1. [x] Bestå 4.0.382 sourcegate/PR/merge og bygge en komplet 79/79-Pages-pakke uden provider.
2. [x] Afgræns stoppet til gammel central sourcepointer mod faktisk offentlig 4.0.381-deployment.
3. [x] Implementér en eksakt identitetslåst source-reparation og bevis live 78/79 med kun kendt 404.
4. [x] Bevar normal 79/79-, privacy-, model-, source- og latest-main-kontrol for det nye mål.
5. [x] Færdiggør docs/geodatabevis, måltests, commit/push og bestå exact-head `35034134953`.
6. [x] Merge og kør providerfri 4.0.383 til offentlig 79/79 i `35034589754`.
7. [ ] Central completion flyttet til 4.0.384/DEC-0166 efter separat closurefejl før write.
8. [ ] Kontrollér admin, hovedkort, Om RavRadar, modelbinding og privacy meningsfuldt.
9. [ ] Kør én normal tidsbegrænset weather og bevis numeriske scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.

DEC-0165's offentlige del er gennemført; resterende central fortsættelse følger DEC-0166.

# Historisk roadmap – 4.0.382 fra levende model til hel offentlig closure

1. [x] Bestå 4.0.381 sourcegate/PR/merge og providerfri contract-only-genbinding.
2. [x] Deploy 4.0.381 Pages og afgræns efterkontrollen til præcis én reel admin-404.
3. [x] Kortlæg alle 79 browsermoduler; bevis 78 HTTP 200 og én udeladt decoder.
4. [x] Flyt decoder til publicerbar sti og læg closure+privacy-preflight i begge builders.
5. [ ] Færdiggør docs/geodatabevis, commit/push og én exact-head sourcegate.
6. [ ] Merge og kør providerfri 4.0.382 til offentlig 79/79-verifikation og central completion.
7. [ ] Kontrollér admin, hovedkort, Om RavRadar, modelbinding og privacy meningsfuldt.
8. [ ] Kør én normal tidsbegrænset weather og bevis numeriske scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.

DEC-0164 er aktiv.

# Aktiv roadmap – 4.0.381 fra contract-only-stop til offentlig model

1. [x] Bevar 4.0.380's grønne exact-head, central-/databaseled og dynamiske actual-current-restore.
2. [x] Afgræns stoppet til uændret modelbinding mod ændret runtimekontrakt.
3. [x] Implementér og måltest byteidentisk contract-only-genbrug samt fortsat snæver modelmigration.
4. [x] Flyt kode-only central bookkeeping efter hårdt bestået Pages-deploy og offentlig verification.
5. [x] Synkronisér docs/håndbog og bevis, at geodata kun ændrer topversion.
6. [ ] Commit/push og bestå én exact-head sourcegate.
7. [ ] Merge og kør providerfri code-only til levende, verificeret 4.0.381; afslut eller registrér central statusfejl bagefter.
8. [ ] Verificér modelbinding, 210/673/118, begge søgemåder, Om RavRadar og privacy.
9. [ ] Først derefter normal tidsbegrænset weather: numeriske input/scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.

DEC-0163 er aktiv.

# Aktiv roadmap – 4.0.380 fra planstop til offentlig model

1. [x] Bevar de grønne 4.0.379-led og afgræns planstoppet til shared auditforbruger.
2. [x] Ret fire-felts historikformen og bevis measured-only med 420 utilgængelige modes.
3. [x] Tag målrettet helikoptertur og ret gentagen privat efterfølger til faktisk current-source.
4. [ ] Synkronisér docs/geodatabevis, commit/push og bestå én exact-head sourcegate.
5. [ ] Merge og kør providerfri code-only direkte til Pages og central completion.
6. [ ] Verificér levende 4.0.380, modelbinding, 210/673/118, begge søgemåder, Om RavRadar og privacy.
7. [ ] Først derefter normal tidsbegrænset weather: numeriske input/scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.

DEC-0162 er aktiv.

# Aktiv roadmap – 4.0.379 direkte fra privacyfund til levende model

1. [x] Bevar alle grønne resultater fra providerfri `34957362872`; afgræns én Pages-pakkeårsag.
2. [x] Fjern de tre ubrugte interne filer fra begge Pages-buildere; auditreglerne er uændrede.
3. [ ] Målrettet kontrol, docs/geodatabevis, commit/push og én exact-head sourcegate.
4. [ ] Merge og kør providerfri code-only til privat runtime, assistent, Pages og central completion.
5. [ ] Verificér levende 4.0.379, modelbinding, 210/673/118, begge søgemåder, Om RavRadar og privacy.
6. [ ] Først derefter normal tidsbegrænset weather: numeriske input/scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.

DEC-0161 er aktiv.

# Aktiv roadmap – 4.0.378 fra samlet rettelse til levende model

1. [x] Afslut Astra-review og implementér A–G samlet på Sol/Ekstra høj.
2. [x] Bestå den målrettede samlede lokale kontrol uden fuld lokal sourcegate.
3. [ ] Synkronisér dokumentation/geodatabevis, commit/push og bestå én exact-head GitHub-sourcegate.
4. [ ] Merge samme head og kør providerfri code-only med eksakt assistent, privat runtime, Pages og central completion.
5. [ ] Verificér levende 4.0.378, 210/673/118, modelbinding, begge søgemåder, Om RavRadar og privacy.
6. [ ] Kør først derefter normal tidsbegrænset weather; bevis numeriske input/scorer, fuld DMI-rotation og cachevedligeholdelse uden oneoff.
7. [ ] Gennemgå siden og revurdér resterende roadmap. Prioritér fælles PENDING-recovery og holdbart kildebevis som afgrænsede robusthedsopgaver.

DEC-0159 og DEC-0160 er aktive. Ingen provider eller oneoff før code-only er
offentligt verificeret.

# Aktiv roadmap – 4.0.378 fra historisk binding til fuld offentlig model

1. **P0:** Færdiggør 4.0.378, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17, forgængerruntime og kanonisk DMI-cache.
3. **P0:** Publicér eksakt attesteret samme-tids-efterfølger med historisk rollback, Pages og central completion.
4. **P0:** Verificér central binding/version, live 4.0.378, 210/673/118, begge søgemåder og Om RavRadar.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, fuld DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0159 er aktive.

# Aktiv roadmap – 4.0.377 fra installeret cache til fuld offentlig model

1. **P0:** Færdiggør 4.0.377, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17 samt den allerede migrerede og installerede runtime.
3. **P0:** Byg fra kanonisk DMI-cache, publicér den eksakt attesterede samme-tids-efterfølger, Pages og central completion.
4. **P0:** Verificér central binding/version, live 4.0.377, 210/673/118, begge søgemåder og Om RavRadar-indholdet.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, fuld DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0158 er aktive.

# Aktiv roadmap – 4.0.376 fra privacy-rod til fuld offentlig model

1. **P0:** Færdiggør 4.0.376, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17 samt den livebeviste komplette runtimeoverførsel.
3. **P0:** Genbyg offentlig runtime med kanoniske privacyrødder, publicér privat runtime og Pages og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.376, 210/673/118, begge søgemåder og Om RavRadar-indholdet.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, fuld DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0157 er aktive.

# Aktiv roadmap – 4.0.375 fra gemt runtime til fuld offentlig model

1. **P0:** Færdiggør 4.0.375, målrettede kontroller, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only; genbrug central version 1, migration 16/17, privacy og den eksakte gemte runtime.
3. **P0:** Migrér alle integrerede og Candidate G-bundlehashplaceringer, genbyg offentlig runtime, publicér privat runtime og Pages og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.375, 210/673/118, begge søgemåder og Om RavRadar-indholdet.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, fuld DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0156 er aktive.

# Aktiv roadmap – 4.0.374 fra privat storfil til model online

1. **P0:** Færdiggør 4.0.374, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17, privacy og den allerede verificerede/migrerbare cache.
3. **P0:** Genbyg offentlig runtime med cachetransportens autoritative filgrænse, publicér privat runtime og Pages, og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.374, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, DMI-rotation og cache uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0155 er aktive.

# Aktiv roadmap – 4.0.373 fra offentlig storfil til model online

1. **P0:** Færdiggør 4.0.373, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17, privacy og den migrerbare cache.
3. **P0:** Genbyg den manifestbundne offentlige runtime, publicér privat runtime og Pages, og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.373, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, DMI-rotation og cache uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0154 er aktive.

# Aktiv roadmap – 4.0.372 fra cacheattestation til model online

1. **P0:** Færdiggør 4.0.372, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only og genbrug central version 1, migration 16/17, privacy, restore og udpakning.
3. **P0:** Migrér kun bundlehashfelter, publicér privat runtime og Pages, og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.372, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, DMI-rotation og cache uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede, meningsfulde batches.

DEC-0148–0153 er aktive.

# Aktiv roadmap – 4.0.371 fra eksakt binding til model online

1. **P0:** Færdiggør 4.0.371, én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only; genbrug central version 1, migration 16/17, privacy og restore uden gentagelse.
3. **P0:** Migrér kun bundlehashene, installér/publicér privat runtime, Pages og central completion.
4. **P0:** Verificér central binding/version, live 4.0.371, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Normal tidsbegrænset weather; bevis numeriske input/scorer, DMI-rotation og cache uden oneoff.
6. **P1:** Helhedsreview af live-site og resterende roadmap i samlede batches.

DEC-0148–0152 er aktive.

# Aktiv roadmap – 4.0.370 fra stor restore til normal drift

1. **P0:** Færdiggør 4.0.370 målrettet, kør én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only fra central version 1 med migration 16/17 allerede installeret; ingen pending migration, gammel recovery eller provider.
3. **P0:** Gendan/migrér den gemte private runtime, publicér ny beskyttet runtime og Pages, og fuldfør central maintenance.
4. **P0:** Verificér central binding/version, live 4.0.370, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Kør normal weather separat og tidsbegrænset; bevis numeriske inputs/scorer, DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Gennemgå hele live-sitet og resterende roadmap i meningsfulde batches.

DEC-0148–0151 er aktive.

# Aktiv roadmap – 4.0.369 fra sikker restore til normal drift

1. **P0:** Commit/push 4.0.369, kør én exact-head PR-sourcegate og merge samme head.
2. **P0:** Kør providerfri code-only fra central version 1. Genbrug migration 16; anvend kun migration 17 og bevis, at anonym/autentificeret klientlæsning af runtimebucketen afvises.
3. **P0:** Gendan den eksakte private generation med bounded retry, migrér kun de godkendte bindinger, publicér aktuel privat runtime og Pages, og fuldfør central maintenance. Ved deterministisk stop bruges samme runs payload-frie årsagskode til samlet rettelse.
4. **P0:** Verificér central binding/version, live 4.0.369, begge søgemåder og relevante sitefelter.
5. **P0 efter deploy:** Kør normal weather separat og tidsbegrænset. Bevis numeriske inputs/scorer, DMI-rotation og cachevedligeholdelse uden oneoff.
6. **P1:** Gennemgå hele live-sitet og resterende roadmap mod faktisk produktværdi; saml rettelser i meningsfulde batches.

DEC-0148, DEC-0149 og DEC-0150 er aktive.

# Aktiv roadmap – 4.0.368 fra central version 1 til normal drift

1. **P0:** Commit og push den afgrænsede 4.0.368-rettelse; kør den lille sourcegate én gang på PR'ens eksakte head og merge samme head.
2. **P0:** Start det manuelle code-only-workflow fra den allerede genskabte centrale version 1. Recoveryen skal springes over, og `integrated-historical-maintenance` skal fortsætte direkte. Ingen provider eller oneoff.
3. **P0:** Verificér central version/profil, migration 16, privat runtime, Pages-artifact, live-version, aktuel modelbinding, begge søgemåder og de berørte felter på hjemmesiden.
4. **P0 efter deploy:** Start normal, tidsbegrænset weather særskilt. Bevis faktisk accepterede vind-, bølge-, vandstands- og strømværdier, numeriske scorer, cachefremgang og DMI-rotation. Bevar ærlige lokale mangler.
5. **P0/P1:** Gennemgå hele den levende hjemmeside og de resterende roadmap-punkter mod faktisk produktværdi. Den latente dublet/kilde-parringsrisiko forbliver åben, indtil den er afgrænset eller rettet.
6. **Ekstern oprydning:** Genundersøg kun de gamle jobløse runs, hvis GitHub-tilstand eller adgang har ændret sig; gentag ikke kendt 409/403 uden ny evidens.

DEC-0148 og DEC-0149 er aktive. Ingen ny oneoff indgår.

# Historisk roadmap – 4.0.365 fra kontraktrettelse til online

1. **P0:** Kør én exact-head sourcegate på den færdige 4.0.365-head og merge byteidentisk.
2. **P0:** Genskab kun same-head-handoff fra de eksisterende forseglede cacher; ingen provider og ingen oneoff.
3. **P0:** Kør cutover videre gennem checkpoint, beskyttede writes, privat runtime, artifact og Pages-deploy.
4. **P0 efter launch:** Kontroller den offentlige model, begge søgemåder og hjemmesidens felter; saml konkrete livefejl og ret dem samlet.
5. **P0 efter launch:** Genaktivér normal weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-rotation, fallback og køretid uden oneoff.
6. **P1:** Revurdér resten af roadmap mod live-evidens.

Ingen ny model-, vejr-, rotations- eller migrationsændring indgik i 4.0.365.

# Aktiv roadmap – 4.0.364 fra rettet audit til online

1. **P0:** Kør én exact-head sourcegate på den færdige 4.0.364-head og merge byteidentisk.
2. **P0:** Genskab kun same-head-handoff fra de eksisterende forseglede cacher; ingen provider og ingen oneoff.
3. **P0:** Kør cutover gennem runtimeaudit, eksisterende migration 15, beskyttede writes, privacy, artifact og deploy.
4. **P0 efter launch:** Kontroller offentlig model, begge søgemåder og hjemmesidens felter; saml konkrete livefejl og ret dem samlet.
5. **P0 efter launch:** Genaktivér normal weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-rotation, fallback og køretid uden oneoff.
6. **P1:** Revurdér resterende roadmap mod live-evidens.

DEC-0146 retter auditens sidste kendte H0-parameter; DEC-0144's online-først-retning består.

# Aktiv roadmap – 4.0.363 fra rettet H0-state til online

1. **P0:** Kør én exact-head sourcegate på den færdige 4.0.363-head og merge byteidentisk.
2. **P0:** Genskab kun same-head-handoff fra de eksisterende forseglede cacher; ingen provider og ingen oneoff.
3. **P0:** Kør cutover gennem runtimeaudit, migration 15, beskyttede writes, privacy, artifact og deploy. Genstart ikke gennemførte forgængermigrationer.
4. **P0 efter launch:** Kontroller offentlig model, begge søgemåder og hjemmesidens felter. Saml konkrete livefejl og ret dem samlet.
5. **P0 efter launch:** Genaktivér normal weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-rotation, fallback og køretid uden oneoff.
6. **P1:** Revurdér resterende roadmap mod live-evidens og behold kun opgaver med reel produktværdi.

DEC-0145 retter runtime-stoppet uden at omgå auditen; DEC-0144's online-først-retning består.

# Aktiv roadmap – 4.0.362 online først

1. **P0:** Én exact-head sourcegate på den færdige 4.0.362-head og merge uden en ny bred lokal kontrolrunde.
2. **P0:** Opret kun det nødvendige same-head cache-handoff fra de eksisterende cacher; ingen provider og ingen oneoff.
3. **P0:** Kør første integrerede cutover gennem databasebinding, beskyttede writes, privacy, artifact og offentlig deployment. De fire brede kontrolsuiter gentages ikke.
4. **P0 efter launch:** Kontroller den offentlige model, begge søgemåder og hele hjemmesidens felter og sammenhæng. Saml faktiske fejl fra live-systemet og ret dem samlet.
5. **P0 efter launch:** Genaktivér almindelig weather og bevis cachevedligeholdelse, DMI-rotation, fallback og køretid uden oneoff.
6. **P1:** Revurdér zoneaggregation ved lokale `UNAVAILABLE` og øvrige roadmap-punkter mod live-evidens; behold kun punkter, der stadig giver produktværdi.

DEC-0144 erstatter tidligere launchplaner, som krævede den brede kontrolblok gentaget før deploy.

# NYESTE ROADMAP – 2026-09-14 – 4.0.361 fra auditmismatch til model-online

- [x] Bevar 4.0.360 sourcegate `34795741830`, main `cbb56fcb` og cache-handoff `34797345624` som eksisterende bevis.
- [x] Kør cutover `34798027472` helt gennem fem hovedkontroller og 272/272 underkontroller; stop samlet før writes ved én fejl.
- [x] Bevis producentens 673/673 og integreret 210/673/1.346; klassificér ikke 654/673 som vejrhuller.
- [x] Ret samlet fem DMI-precisionkanter, fjorten integrerede holds og manglende per-part-årsager i auditlaget.
- [x] Bevar scoremodel, bundles, vejr, rotation, cache og alle bindende gates uændrede; bestå målregressioner.
- [ ] Færdiggør én samlet 4.0.361-version/RDKS/håndbog og målrettet slutkontrol.
- [ ] Kør én exact-head 4.0.361-sourcegate og merge kun den eksakte grønne kode.
- [ ] Genskab det commitbundne handoff fra samme cacher uden provider, oneoff eller ny national audit.
- [ ] Kør cutover. Ved grøn samlet blok fortsætter installationen automatisk; ved fejl bruges hele rapporten i én samlet rettelsesrunde.
- [ ] Verificér integreret model offentligt på 210 zoner/673 dele/begge modes/118 timer og gennemgå siden på desktop, mobil og DA/DE/EN.
- [ ] Genaktivér almindelig weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-registerrotation, fallback og tidsoverskud.
- [ ] Gennemgå derefter all-parts-zonereglen og øvrige roadmap-punkter mod live evidens; behold kun aktuelle punkter.
- [ ] Slet `34613079069` og `34228112413`, så snart GitHub tillader det; de er jobløse og kan ikke startes.

DEC-0143 er aktiv. Ingen ny oneoff.

# NYESTE ROADMAP – 2026-09-14 – 4.0.360 fra native/runtime-kontrolfejl til model-online

- [x] Bevar 4.0.359 sourcegate `34788388836`, main `8ec6b8be` og det komplette cache-handoff `34789764309` som eksisterende bevis.
- [x] Kør cutover `34790416354` helt til slut gennem fem hovedkontroller og 272/272 underkontroller; bevar stop før writes.
- [x] Afgræns eneste fejl til den rumlige audits sammenligning af rå native DMI-kilde mod færdig runtimeform; 617 er ikke manglende vejrdækning.
- [x] Lad auditlaget genbruge den eksisterende offentlige forecastbuilder og brug fastlåst `productionReferenceAt`; modelbundle/hash forbliver uændret.
- [x] Bestå kun de direkte relevante regressioner og bind en realistisk native fixture.
- [ ] Kør én exact-head 4.0.360-sourcegate og merge kun den eksakte grønne kode.
- [ ] Genskab det commitbundne handoff fra samme cacher uden provider, oneoff eller ny national audit.
- [ ] Kør cutover. Ved grøn samlet blok fortsætter installationen automatisk; ved fejl bruges hele rapporten til én samlet rettelsesrunde.
- [ ] Verificér den integrerede model offentligt på 210 zoner/673 dele/begge modes/118 timer og gennemgå siden på desktop, mobil og DA/DE/EN.
- [ ] Genaktivér almindelig weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-registerrotation, fallback og tidsoverskud.
- [ ] Afstem efter launch all-parts-zonereglen og den målte private conditions-størrelse; behold kun roadmap-punkter med aktuel evidens.
- [ ] Slet `34613079069` og `34228112413`, så snart GitHub tillader sletning; de er jobløse og kan ikke startes.

DEC-0142 er aktiv. Ingen ny oneoff.

# NYESTE ROADMAP – 2026-09-14 – 4.0.359 fra komplet fejlliste til model-online

- [x] Bevar main 4.0.358/`2a1c73d2`, sourcegate `34777480545` og cache-handoff `34781396538` som eksisterende bevis.
- [x] Gennemfør cutover `34781869394` helt til slut gennem 272/272 underkontroller; bevar det negative resultat uden deploy.
- [x] Ret de seks samlede kontrolfejl i én release og bevar ukendte/materiale fejl som blokerende.
- [x] Brug PR #296/run `34786784374` som samlet negativ evidens: kun den statiske håndbogskopi manglede efter grøn releasegate og 30 sourceled; ret kopien.
- [x] Kør alene de 90 ikke-nåede sourceled samlet lokalt og bevis alle grønne efter korrekt Python-runtime, før næste exact-head-forsøg.
- [x] Bestå kun de målrettede regressionskontroller, workflowkontrakten og releasegaten lokalt.
- [ ] Kør én exact-head 4.0.359-sourcegate og merge kun den eksakte grønne kode.
- [ ] Genskab det commitbundne handoff fra de samme cacher uden provider, oneoff eller ny national audit.
- [ ] Kør cutover. Ved grøn samlet blok fortsætter installationen automatisk; ved fejl bruges hele rapporten til én samlet rettelsesrunde.
- [ ] Verificér den integrerede model offentligt på 210 zoner/673 dele/begge modes/118 timer og gennemgå siden på desktop, mobil og DA/DE/EN.
- [ ] Genaktivér almindelig weather kontrolleret og bevis cachevedligeholdelse, fuld DMI-registerrotation, fallback og tidsoverskud.
- [ ] Afstem efter launch all-parts-zonereglen og den målte private conditions-størrelse; behold kun roadmap-punkter med aktuel evidens.
- [ ] Slet `34613079069` og `34228112413`, så snart GitHub tillader sletning; de er jobløse og kan ikke startes.

DEC-0141 er aktiv. Ingen ny oneoff.

# NYESTE ROADMAP – 2026-09-13 – 4.0.358 samlet til model-online

- [x] Bevar PR #294/sourcegate `34767862281`, main `2c243d9e` og grønt cache-handoff `34768997271` som eksisterende bevis.
- [x] Afgræns cutover `34769550035` til gammel forecasttest; ingen deploy blev udført.
- [x] Gennemgå hele den nye modelkæde og den resterende cutover; ret samlet de påviste test-, shell- og Pages-fejl.
- [x] Implementer løbende SHA-bundet rapport og gennemførelse af alle 272 deklarerede selvstændige valideringskommandoer.
- [x] Bevar alle fem hovedkontroller som bindende og first-cutover-only tidsloft 180 minutter.
- [x] Afslut version/RDKS/håndbog/geodatadiff og målrettet slutkontrol på den korrekte branch fra main.
- [ ] Kør én exact-head 4.0.358-sourcegate og merge kun den eksakte grønne kode.
- [ ] Fortsæt fra det grønne handoff uden provider eller oneoff; udfør kun den nødvendige nye commitbinding, hvis cutoverkontrakten kræver den.
- [ ] Kør cutover. Hvis kontrollerne er grønne, fortsætter installationen automatisk; ellers bruges én samlet fejlliste til næste rettelsesrunde.
- [ ] Verificér den integrerede model offentligt på 210 zoner/673 dele/begge modes/118 timer og gennemgå siden på desktop, mobil og DA/DE/EN.
- [ ] Genaktivér almindelig vejrdrift kontrolleret og bevis cachevedligeholdelse, fuld registerrotation, fallback og tidsoverskud.
- [ ] Afstem efter launch zonens all-parts-regel med lokal-UNAVAILABLE-beslutningen og revurdér resten af post-cutover-roadmappet mod live evidens.

DEC-0140 er aktiv. Ingen ny oneoff.

# NYESTE ROADMAP – 2026-09-13 – 4.0.357 fra samlet decimalfejl til model-online

- [x] Bestå 4.0.356-sourcegate `34761823518`, merge PR #293 som main `b75672f7` og bevis identisk filtræ.
- [x] Bestå SHA-handoff `34763228997` uden provider/oneoff/ny 210/673-audit.
- [x] Kør `34763820124` gennem alle fem cutoverkontroller og afgræns eneste fejl til kanonisk decimalrepræsentation.
- [x] Ret én-gangs-afrunding med bevaret 360→0 og målrettet regression.
- [ ] Kør én exact-head 4.0.357-sourcegate og merge kun den eksakte grønne kode.
- [ ] Genskab kun SHA-bindingen fra samme cacher; ingen ny vejrhentning eller oneoff.
- [ ] Kør cutover og verificér 4.0.357 offentligt på 210 zoner, 673 dele, begge modes og 118 timer.
- [ ] Gennemgå levende side på desktop/mobil og DA/DE/EN.
- [ ] Bevis almindelig cachevedligeholdelse, fuld registerrotation, fallback og tidsoverskud; ingen oneoff.
- [ ] Revurdér resten af post-cutover-roadmappet mod live evidens.

DEC-0139 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.356 fra GitHub-startfejl til model-online

- [x] Bestå 4.0.355-sourcegate `34759300669`, merge PR #292 som main `5bcd5fb2` og bevis identisk filtræ.
- [x] Bestå cache-handoff `34760554781` uden provider/oneoff/ny 210/673-audit.
- [x] Afgræns `34761090699` til en startup-fejl før jobs og ret caller/callee-tilladelsen read-only.
- [ ] Kør én exact-head 4.0.356-sourcegate og merge kun den eksakte grønne kode.
- [ ] Genskab kun SHA-bindingen fra samme cacher og start samlet cutover; ingen ny vejrhentning.
- [ ] Verificér 4.0.356 offentligt på 210 zoner, 673 dele, begge modes og 118 timer.
- [ ] Gennemgå levende side på desktop/mobil og DA/DE/EN.
- [ ] Bevis almindelig cachevedligeholdelse, fuld registerrotation, fallback og tidsoverskud; ingen oneoff.
- [ ] Revurdér resten af post-cutover-roadmappet mod live evidens.

Ingen model-, data-, privacy- eller Storage-grænse ændres. DEC-0138 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.355 fra redundant runtimegenlæsning til model-online

- [x] Bestå 4.0.354-sourcegate `34757328149`, merge PR #291 som main `78c083e8` og bevis identisk filtræ.
- [x] Kør `34758328372` fra fire eksakte cacher uden provider/oneoff/ny 210/673-audit; bevis schema-2-pakning i real-skala.
- [x] Afgræns stoppet til den redundante anden læsning af `conditions.json` gennem en 16-MiB evidensgrænse.
- [x] Genbrug kun den strenge boolean fra første modelkontrollerede parse; bevar filspec og alle størrelses-/privacygrænser.
- [ ] Kør én exact-head 4.0.355-sourcegate og merge kun den eksakte grønne kode.
- [ ] Kør samme cachefortsættelse; kræv samlet real-skala rapport og forsegl handoff uden oneoff.
- [ ] Gennemfør den separate cutover til slut; saml alle fejl i kørslen og ret dem samlet uden at gentage bevist arbejde.
- [ ] Verificér release 4.0.355 offentligt på 210 zoner, 673 kystdele, begge modes og 118 timer.
- [ ] Gennemgå levende side meningsfuldt på desktop/mobil og DA/DE/EN.
- [ ] Bevis cachevedligeholdelse, fuld registerrotation, fallbackbidrag og tidsoverskud i almindelige weather-runs.
- [ ] Omlæg tilbagevendende privat cachetransport efter målt normal drift, så den ikke kræver fuld generationsdownload ved hver højfrekvent kørsel.
- [ ] Rens resten af post-cutover-roadmappet mod live evidens og behold kun aktuelle konkrete problemer.

Produktkritiske integritets-, privacy-, data-, model- og deploymentgates består. Ingen ny oneoff. DEC-0137 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.354 fra enkeltobjektstop til model-online

- [x] Bestå 4.0.353-sourcegate `34754075158`, merge PR #290 som main `6305dd82` og bevis identisk filtræ.
- [x] Kør `34755365967` fra de fire eksakte cacher uden provider/oneoff/ny 210/673-audit; bevis at 2-GiB-rågrænsen virker.
- [x] Afgræns næste stop til det samlede komprimerede arkiv over Supabases 50-MiB-enkeltfilgrænse.
- [x] Implementér højst otte immutable dele à 50.000.000 byte, højst 350.000.000 byte samlet, del-/helhash, fuld readback før CAS, rollback/cleanup og schema-1-læsning.
- [x] Find og ret den skjulte `jq`-separator i næste gate; løft alle aktive felter til 4.0.354.
- [ ] Kør én exact-head 4.0.354-sourcegate og merge kun den eksakte grønne kode.
- [ ] Kør samme cachefortsættelse; mål real-skala delantal/størrelse og forsegl handoff uden oneoff.
- [ ] Gennemfør den separate cutover til slut; saml alle fejl i kørslen og ret dem samlet uden at gentage bevist arbejde.
- [ ] Verificér release 4.0.354 offentligt på 210 zoner, 673 kystdele, begge modes og 118 timer.
- [ ] Gennemgå levende side meningsfuldt på desktop/mobil og DA/DE/EN.
- [ ] Genaktivér normal weather og bevis cachevedligeholdelse, fuld registerrotation, fallbackbidrag og tidsoverskud i almindelige runs.
- [ ] Omlæg tilbagevendende privat cachetransport efter målt normal drift, så den ikke bruger en fuld generationsdownload ved hver højfrekvent kørsel.
- [ ] Rens resten af post-cutover-roadmappet mod live evidens og behold kun aktuelle konkrete problemer.

Produktkritiske integritets-, privacy-, data-, model- og deploymentgates består. Ingen ny oneoff. DEC-0136 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.353 fra samlet payloadstop til model-online

- [x] Merge 4.0.352 som main `ec198c73` efter exact-head-sourcegate `34744340201`.
- [x] Kør `34745557797` direkte fra den cachebaserede fortsættelse; gendan kun fire eksakte cacher og genbyg runtime uden provider eller ny 210/673-audit.
- [x] Bevis at komprimeringen virker, og at det nye stop alene er samlet ukomprimeret payload over det gamle 768 MiB-loft.
- [x] Få præcis ejergodkendelse og implementér 2 GiB samlet for nyt format, 768 MiB pr. fil/legacy, uændret 50.000.000-byte cutoverloft inden for 50 MiB-objectloftet og sekventiel atomisk restore.
- [x] Versionér 4.0.353 og bestå de tre direkte runtime-/workflow-/versionskontroller.
- [ ] Kør én exact-head sourcegate, merge byteidentisk og genbrug ikke en rød head.
- [ ] Kør fortsættelsen igen fra exact `34738698219`; mål real-skala arkiv og forsegl handoff uden oneoff.
- [ ] Gennemfør den separate cutover til slut; saml fejl pr. kørsel og ret samlet uden at gentage allerede bevist arbejde.
- [ ] Verificér release 4.0.353 offentligt på 210 zoner, 673 kystdele, begge modes og 118 timer.
- [ ] Gennemgå levende side på desktop/mobil og DA/DE/EN med fokus på funktion og sammenhæng.
- [ ] Genaktivér normal weather og bevis cachevedligeholdelse, fuld registerrotation, fallbackbidrag og tidsoverskud i almindelige runs.
- [ ] Rens post-cutover-roadmap mod live evidens og behold kun aktuelle konkrete problemer.

Produktkritiske integritets-/privacy-/data-/model-/deploymentgates består. Ingen ny oneoff. DEC-0135 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.352 fra fejlet pakketrin til model-online

- [x] Merge 4.0.351 som main `099b70a8` efter grøn exact-head-sourcegate `34737474686`, og bestå backend `34738543144`.
- [x] Brug locked cache-only `34738698219` til at bevise komplette data og 210/673/118-modelstruktur uden providerhentning.
- [x] Afgræns eneste nye stop til V8-strenggrænsen i privat raw-base64-pakning efter de produktkritiske kontroller.
- [x] Ret packer/unpacker med deterministisk komprimering før base64, bounded dekomprimering, SHA-256 og legacy-kompatibilitet; bestå de to måltests.
- [x] Brug hele PR-run `34740223620` som samlet fejlrapport: ret kun de to stale testforventninger til package-styret version og bekræft den direkte test grønt.
- [x] Erstat gentaget locked preflight med en exact `34738698219`-bundet handoff-fortsættelse. Bevis i måltest, at den hverken henter providerdata eller gentager 210/673-auditen, og at kapacitet/handoff fortsat er obligatoriske.
- [x] Kør `34742976226` helt til slut, behold alle grønne produktkontroller og ret samlet den eneste gamle artifactoptælling samt de manuelt fundne ugyldige multiline-markører.
- [ ] Kør én exact-head 4.0.352-sourcegate, merge og exact-main readback.
- [ ] Kør fortsættelsesjobbet på fire eksakte cacher; genskab kun flygtige runtimefiler, mål den rettede pakke og forsegl handoff. Fortsæt derefter direkte til den separate fuldt gatede cutover.
- [ ] Verificér offentligt 210 zoner, 673 kystdele, begge modes, 118 timer/fem døgn og release 4.0.352.
- [ ] Gennemgå levende side på desktop/mobil og DA/DE/EN med fokus på reelle funktioner og sammenhæng.
- [ ] Genaktivér normal weather og brug almindelige runs til at bevise cachevedligeholdelse, rotation, fallback og tidsoverskud.
- [ ] Rens post-cutover-roadmap mod live evidens; behold kun konkrete aktuelle problemer.

Ufarlig dokumentations-/rapporteringsoprydning må ikke skabe en launchspiral, men produktkritiske gates består. DEC-0134 er aktiv.

# NYESTE ROADMAP – 2026-09-13 – 4.0.351 cold-start-readiness direkte til model-online og normal drift

- [x] Bestå PR #286/sourcegate `34726624728`, merge byteidentisk som main `6d4adbb2` og anvend/readback-verificér migration 13 i backend `34727884447`.
- [x] Klassificér cache-only `34728026044`: current, WAM, freshness og 210/673-modelbygning bestod uden providerhentning; stoppet lå i tre auditforskelle.
- [x] Adskil coverage fra memory/migration, gør H0-current og last-mile offentligt rekonstruerbare og bevar en kompakt part-identitet ved lokal `UNAVAILABLE`.
- [x] Versionér 4.0.351, tilføj append-only migration 13, fastlås migration 12 og synkronisér bundle/continuation/releasebindinger.
- [x] Bestå korte syntaks-, model-, bundle-, binding-, migration-, readiness-, engangsundtagelses- og releasekontraktkontroller. Gentag ikke den lange lokale nationale audit.
- [x] Reproducér den resterende H0-kant lokalt: auditten krævede endelige current-bounds ved producentens lovlige direct-input-missing `UNAVAILABLE` og registrerede kastet misvisende som last-mile.
- [x] Spejl producentens H0-gate, bevar uafhængig coverage/memory/migration og bestå den målrettede fulde 210/673-audit med negative fixtures.
- [x] Bestå PR #287/sourcegate `34732348167`, merge byteidentisk som main `a6e118d2` og readback-verificér exact main i backend `34733200143`.
- [x] Kør cache-only `34733358422`: bevis at de to H0-/last-mile-fejl er væk og alle 1.346 modes rekonstrueres; isolér alene den nationalt ensartede `genuine-cold-start`-readiness.
- [x] Ret operationel state-readiness uden model-/cacheændring: kræv præcis 673 cold-replay-states, eksakt lineage/kilde/48-timersregnskab/target og afvis blanding eller tamper.
- [x] Brug PR #288's første sourcegate `34736227522` som negativt bevis: selve release-/modelkæden bestod, men den beskyttede håndbogsinstallationskopi var ikke synkroniseret. Synkronisér payload og aktive bindingstal, og bestå begge håndbogstests lokalt.
- [ ] Kør én exact-head GitHub-sourcegate for denne sidste driftsrettelse og merge kun den eksakte grønne kode.
- [ ] Readback-verificér exact main i backend og kør samme cache-only preflight uden providerhentning.
- [ ] Ved grøn preflight: gennemfør den rigtige cutover og verificér offentligt 210 zoner/673 kystdele. Ved fejl: brug den samlede rapport til én rettelsesrunde uden ny oneoff.
- [ ] Genaktivér normal weather kontrolleret. Brug almindelige kørsler til at bevise cachevedligeholdelse, fuld rotationsplan, kildebidrag, huller og tidsoverskud; oneoff er ikke dette bevis.
- [ ] Gennemgå hele den levende hjemmeside på desktop/mobil og DA/DE/EN: begge modes, kort, ranking, zonevalg, fem døgn, pile, konti/ture, assistent, Om/Lær og admin-reachability.
- [ ] Revider de resterende post-cutover-punkter mod live evidens. Behold kun aktuelle problemer: cachetransport/atomisk pointer, normal provider/cadence, eventuel privat vind-hash-kant, sourcegate-fail-chain, historisk Open-Meteo-retention og dokumenterede drifts-/UI-fejl.

Der startes ingen ny tre timers oneoff. Kontroller skal være begrundet i konkret risiko eller faktisk fejl. DEC-0133 er aktiv.

# NYESTE ROADMAP – 2026-09-12 – lokal 4.0.350 til automatisk grøn cutover

- [x] Merge den bounded 4.0.349-fejlrapport via PR #284 og genkør locked cache uden providerhentning.
- [x] Afgræns `34706453561`: komplet current 79.414/79.414, men 659 dele × to modes med afvist vind og 14 dele × to modes med current ikke klar.
- [x] Ret `windTail` i den fælles produktionsadapter og bevis, at rettelsen gælder fremtidige vejrbygninger.
- [x] Før otte regionale closure-bundne præ-H0-kildereferencer ind i privat scoring/recovery uden offentlig payload eller opdigtet current.
- [x] Gør direkte inputmangel lokalt `UNAVAILABLE`/null og udelad alene disse dele fra rangering; bevar komplet 210/673-struktur og særskilt `HISTORY_INCOMPLETE`.
- [x] Bind availability ens gennem conditions/manifest, audit, Pages, browser, administration, ture og nødruntime.
- [x] Implementér ejerens femleddede cutoverkontrol, som samler fejl før én skrivebarriere og automatisk fortsætter ved fem grønne resultater.
- [x] Tilføj append-only migration 12, regenerér rollback/integrated/continuation i korrekt rækkefølge og bestå den korte målmatrix.
- [x] Luk 4.0.350-version/RDKS/håndbøger, genkør tunge public-runtime-/auditregressioner og slutdiff.
- [x] Diagnostisér PR #285-head `fe4969f1`'s røde migrationskædetest: fastlås 4.0.349-hashes/filhash historisk og kontrollér 4.0.350 som separat append-only led uden at ændre migration 11.
- [x] Ret de tre samlede fejl fra `66338d63`/run `34717905077`: modelafhængig Candidate/integrated availability og releasegatebinding til den fælles historikvalidator. Stop lokal langtest; brug ny exact-head-CI som samlet bevis.
- [ ] Kør præcis én fuld GitHub-sourcegate på exact PR-head; merge kun byteidentisk grøn tree.
- [ ] Anvend/readback-verificér migration 12 og kør cache-only integrated-cutover. Hvis de fem kontroller er grønne, skal den fortsætte; ellers ret den samlede trin-/fejlrapport i én omgang.
- [ ] Verificér integreret model offentligt på 210/673. Genaktivér derefter normal weather kontrolleret og mål de kommende data, DMI-rotation, cachetransport og tidsoverskud.

Ingen ny lang provider-oneoff er planlagt. De seks ikke-regionale currentdele afgøres af den nye same-main-runtime og kan ærligt være lokale `UNAVAILABLE` uden at blokere resten.

# NYESTE ROADMAP – 2026-09-12 – 4.0.349 fra samlet fejlrapport til model-online

- [x] Luk 4.0.348 exact-head-CI/merge og backendapply/readback med exact-content-sourceproof uden dobbelt fuld kildegate.
- [x] Bevis i cache-only-run `34697760571`, at DMI/Copernicus springes over, Open-Meteo er reuse-only, og de gemte current-/WAM-/freshnessled består uden providerhentning.
- [x] Find den systemiske modelstopper: live-current-producerens korrekte closure-v2 blev afvist af RavScore-recoveryens og testfixtures' gamle v1-forventning.
- [x] Implementér fælles v2-konstant, virkelig producer→RavScore-seamtest og eksplicit negativ v1-test uden at lempe state-, score-, fysik-, vejr- eller provenancekrav.
- [x] Regenerér modelbundles/binding og tilføj en append-only 11. migration; fastlås gamle og nye migrationsbyggere til deres versionsspecifikke hashes.
- [x] Versionér 4.0.349 og synkronisér DEC-0131, krav, issues, checkpoints, changelog og begge håndbøger; geodata må kun ændre topversionsfelt.
- [x] Bestå PR #283 exact-head-sourcegate, merge byteidentisk som `187e5998`, genbrug kildebeviset i backend og anvend/readback-verificér alene migration 11.
- [x] Kør `34702471040` cache-only uden providerhentning; bevis current 79.414/79.414, WAM/freshness og at v1/v2-rettelsen virker.
- [x] Afgræns det senere stop til den upræcise offentlige 210/673-assertion og tilføj lokalt en bounded, privacy-sikker samlet zone-/fejlkoderapport uden modelhashændring.
- [ ] Exact-head-validér og merge rapport-hotfixen; gentag samme hurtige cachekontrol og hent den samlede fejlfordeling.
- [ ] Kør et afgrænset Astra/Ultra-review af fejlfordelingen og ejerens retning om integreret launch med tydelig lokal `UNAVAILABLE`; skift derefter tilbage til Sol.
- [ ] Implementér og exact-head-/produktionsverificér den mindst mulige cutover-/modelrettelse, få den integrerede model online og kontrollér den offentlige struktur.
- [ ] Genaktivér normal drift kontrolleret og mål DMI-rotation, cachetransport, providerforbrug og tidsoverskud.

En ny lang oneoff er ikke del af denne plan. Den næste kørsel genbruger samme cache uden providerkald og har alene til formål at vise alle konkrete scorefejl på én gang.

# NYESTE ROADMAP – 2026-09-12 – 4.0.348 fra komplet cache til model-online

- [x] Verificér én exact-head-sourcegate for 4.0.347 og byteidentisk main-genbrug uden dobbelt fuld kildegate.
- [x] Bevis at run `34682428800` sluttede current 79.414/79.414 med missing 0 og native WAM 79.060; klassificér 193 som mellemresultat før Copernicus.
- [x] Find modelstoppet efter vejrclosure og implementér privat numerisk rollback-warmup med public/selectable unavailable/null til READY.
- [x] Byg fastlåst cachekontrol på `2026-09-12T08:00:00Z` uden DMI-/Copernicus-acquisition, med Open-Meteo reuse-only, central provider-netværksspærre og intet automatisk refill.
- [x] Lås den allerede anvendte WAM-migration ved dens kendte checksum, og byg en ny append-only backendbinding, som kun fører 4.0.348-hashes/readbackversion frem.
- [x] Versionér 4.0.348 og synkronisér DEC-0130, krav, issues, checkpoints, changelog og begge håndbøger; geodata må kun ændre topversionsfelt.
- [x] Bestå den målrettede lokale slutmatrix og udfør Sol/Ekstra høj-review af model-, cache-, workflow- og cutovergrænserne.
- [x] Diagnostisér første PR #282-run `34695465328` og ret den manglende releaseplanbinding for den nye migrationsbygger; kræv ny exact-head frem for at genbruge den røde head.
- [ ] Bestå én exact-head 4.0.348-PR-sourcegate og merge kun byteidentisk grøn head.
- [ ] Anvend og readback-verificér den nye backendbinding på exact main; genbrug kun PR-sourceproof efter live exact-content-kontrol.
- [ ] Kør den låste cachekontrol; kræv current 79.414, native WAM 79.060, Feggesund 354, freshness, fulde post-data-gates og same-head-handoff.
- [ ] Udfør kontrolleret cutover og offentlig 210/673-verifikation. Genaktivér derefter normal drift kontrolleret og mål DMI-rotation/pass, cachetransport, providerforbrug og tidsoverskud.

# HISTORISK ROADMAP – 2026-09-12 – 4.0.346 fra reel DMI-multipass til model-online

- [x] Luk 4.0.345 exact-head-sourcegate, merge og exact-content proofgenbrug uden dobbelt fuld gate.
- [x] Rekonstruér oneoff `34667430392` gennem targetplan, DMI/WAM, Copernicus, regional, Open-Meteo og closure; klassificér 184 som forsøgte provider-negative par.
- [x] Find oneoff-wrapperens falske multipass: exit 2 og fælles 3.000-sekundersramme forhindrede næste roterede DMI-passage.
- [x] Implementér højst tre selvstændigt bounded DMI-pass med exact slutrapport, allowlistet runtimefejl, disk-/cacheværn og pargevinst før et tredje strict-current-runtimepass; bevar exit-0-downloadbudgetvejen særskilt.
- [x] Versionér 4.0.346 og synkronisér DEC-0128, krav, issues, changelog, checkpoints og begge håndbøger; geodata må kun ændre topversionsfelt.
- [ ] Bestå én exact-head PR-sourcegate for 4.0.346 og merge kun den eksakte grønne head.
- [ ] Kør én kontrolleret main-oneoff på bevarede cacher; verificér reelle roterede DMI-pass og kræv current 79.414/79.414, native WAM 79.060, Feggesund 354/354 samt freshness.
- [ ] Kræv fuld post-data validate/releasegate, runbundet handoff, artifact/deploy og integreret cutover; verificér desktop/mobil offentligt.
- [ ] Håndtér den inerte køpost sikkert, genaktivér normal drift kontrolleret efter launch og mål cachetransport, providerforbrug og tidsoverskud. Optimer CP-konsolidering kun på ny relevant evidens.

# NYESTE ROADMAP – 2026-09-12 – 4.0.345 fra målte flaskehalse til model-online

- [x] Rekonstruér main `34635781802` og oneoff `34642214559`; adskil DMI-plan/rotation, CP-throughput, OM provider-negative svar og fuld closure.
- [x] Implementér durable CP-segmentreceipts, restart/replay og seks-segment-consolidation uden ændret sourceorder, admission, masks, geometri eller fysik.
- [x] Bevis 40.120-record byteidentitet og 115,905 → 46,438 sekunders seks-segment-forbedring; bestå samlet CP-/workflowmålpakke.
- [x] Implementér exact-content PR-sourceproof, live-verificér den faktiske GitHub API-form og gør enhver mismatch til sikker fuld main-gate.
- [x] Versionér 4.0.345 og synkronisér DEC-0127, krav, issues, checkpoints, changelog og begge håndbøger; geodata må kun ændre topversionsfelt.
- [ ] Bestå én exact-head PR-`validate:source`; merge kun den eksakte grønne head.
- [ ] Kør én kontrolleret main-opfyldning på bevarede cacher; verificér sourceproof-genbrug/fallback og kræv current 79.414/79.414, native WAM 79.060, Feggesund 354/354 samt freshness.
- [ ] Kræv fuld post-data validate/releasegate, runbundet handoff og artifact/deploy; udfør integreret cutover og verificér desktop/mobil offentligt.
- [ ] Genaktivér normal drift kontrolleret og mål cachetransport, providerforbrug, ekstern cadence og tidsoverskud. En grøn oneoff lukker ikke dette punkt alene.

# HISTORISK ROADMAP – 2026-09-11 – 4.0.343 fra fair providerclosure til model-online

- [x] Bevar cachen og afgræns 4.0.342's negative runtime til DMI-family-, Copernicus-product- og WAM-owner-starvation.
- [x] Implementér én fælles normal/oneoff-løsning med bounded fair DMI-service, separate roterede Copernicus-køer og fælles exact WAM-owner.
- [x] Bestå de målrettede lokale kontrakt-, integration-, workflow-, runtimebinding- og syntaxkontroller.
- [x] Luk 4.0.343-version, exact-release-policy, RDKS/håndbog/changelog og version-only-geodatabevis; commit/push først den samlede gennemgåede diff.
- [ ] Bestå én exact-head `validate:source`, merge den eksakte grønne head og kør én kontrolleret main-opfyldning på de bevarede cacher.
- [ ] Kræv current 79.414/79.414, native WAM 79.060 og Feggesund 354/354; kør fulde gates, handoff og cutover.
- [ ] Verificér den integrerede scoremodel offentligt. Genaktivér derefter normal vedligeholdelse kontrolleret og mål cachetransport, ekstern cron, providertider og vedligeholdelsesoverskud.

# NYESTE ROADMAP – 2026-09-11 – 4.0.342 fra granular cacheprogression til model-online

- [x] Bevar 4.0.341's isolerede WAM-candidate og alle slutgates; forkast kun whole-asset-kassation af uafhængigt gyldige tuples.
- [x] Implementér lokal per-part/time-admission med exact assetlineage, kendt denominator, uændrede rejects og værn mod blandet native tidsskive.
- [x] Bevar privat WAM-progress uden at overclaim'e locked/history-complete, og behold genuine-cold-start uændret.
- [x] Implementér lokal Copernicus partial-hour-bevaring: checkpoint returned exact pairs, behold fravær som rest, og stop fortsat på strukturel tidsakse-/requestfejl.
- [x] Bestå tre målrettede Copernicus-tests og de to korrigerede WAM-regressioner.
- [x] Bestå samlet WAM `63/63`, WAM-historik `35/35`, checkpoint `21/21`, tre Copernicus-måltests, Python compile og code diff-check. Privacykontrol afsluttes fortsat med releasepakningen.
- [ ] Færdiggør 4.0.342-version, exact-release-policy, RDKS/håndbog/changelog og version-only-geodatabevis; commit/push først den samlede gennemgåede diff.
- [ ] Bestå én exact-head sourcegate og merge kun dens eksakte head.
- [ ] Kør én kontrolleret main-writer på bevarede cacher. Kræv current 79.414/79.414, native WAM 79.060, Feggesund 354/354, nul konflikter og runbundet handoff.
- [ ] Kør fulde post-data-gates, artifact/deploy og offentlig modelverifikation. Genaktivér derefter normal vedligeholdelse kontrolleret og mål cachekontinuitet, providerforbrug og tidsoverskud.

# NYESTE ROADMAP – 2026-09-10 – 4.0.341 fra atomisk WAM-cache til model-online

- [x] Bevar den eksisterende cache uden nulstilling og fasthold hele `673 × 118 = 79.414`-domænet, native WAM for 670 dele, Feggesund `354/354` og 48 timers rådgivende historik.
- [x] Implementér isoleret WAM-kandidat pr. collection/modelrun, fuld assetdenominator, eksakt pair-superset, ingen nye lineage-konflikter og korrekt egen modelrun-proveniens.
- [x] Tillad sikker straks-promotion af reelle huller/hale, men batch komplet-cache-kvalitetsrefresh ved faseafslutning. Gør ældre kausal fallback bounded og terminal-only.
- [x] Ensret Open-Meteos required-/donororden til `(validTime, partId)` og bind WAM-bootstrap til den private runtimehash.
- [x] Bestå den lokale målmatrix: WAM 52, historik 35, vejrplan 17, Open-Meteo-donor 32 samt DKSS, scheduler og privat runtime.
- [ ] Færdiggør releaseversion, RDKS/håndbog og snæver diff-/privacykontrol; commit/push og kør én exact-head GitHub-sourcegate.
- [ ] Merge kun den eksakte grønne head. Kør main-vejr på de bevarede cacher og kræv `79.414/79.414`, native WAM 670, Feggesund `354/354` og et gyldigt runbundet handoff.
- [ ] Kør fulde post-data-gates, artifact/deploy og offentlig verifikation; Candidate G forbliver offentlig, indtil alle beviser er positive.
- [ ] Genaktivér normalworkflow og watchdog/shadow-dispatch kontrolleret. Efter launch: mål normal vedligeholdelse og ekstern cron/provider-tider; byg cachetransport i parallel shadow med atomisk pegepind og rollback uden cachetab; bind den uændrede `dmi_wind_reference.py` ind i full-runtime-hashen gennem normal append-only procedure.

# NYESTE ROADMAP – 2026-09-09 – 4.0.337 til model-online uden cachetab

- [x] Ret decoderdrift, granulært prooftab, same-asset-konflikt og komponenthuller uden at nulstille bevarede data.
- [x] Erstat det afviste codecudkast med fælles tabsfri Python/Node-codec og bind alle kendte produktionslæsere/-skrivere til den.
- [x] Fjern det unødige moderne Candidate G-mellemtrin og bind legacy first cutover til én eksakt succesfuld komplet oneoff.
- [x] Registrér ejerens first-cutover-undtagelse med 50 MB archiveloft, eksisterende storage/checkpointkrav og uændrede privacy/readbackgates.
- [x] Kør exact produktionstor codecprøve read-only på den bevarede cache; `34288231609` bevarer logisk hash/count og inputfil og består Python/Node-readback.
- [x] Luk pre-normalization legacy-blockeren i pilot, normal vedligeholdelse, oneoff og conditional point activation med separat bounded materialisering før første strenge DMI-reader; bevar kildefilen ved fejl.
- [ ] Afslut releasehukommelsens sidste head, bestå én exact-head GitHub sourcegate og merge kun den eksakte grønne head.
- [ ] Kør main-oneoff til komplet vejr/WAM/Feggesund og brug dens runbundne handoff til fulde produktionsgates og offentlig integreret cutover.
- [ ] Byg cachetransporten parallelt efter launch: ingen nulstilling, shadow-sammenligning, atomisk pegepind og rollback. Aktivér først normal højfrekvent cron/watchdog efter positivt budget-/driftsbevis.

# NYESTE ROADMAP – 2026-09-08 – 4.0.336 fra kompakt cache til verificeret main-runtime

- [x] Gør alle DMI/WAM-cachewrites kompakte og atomiske uden at hæve 256 MiB-loftet; log kun aggregerede byteantal.
- [x] Allowlist normal- og oneoff-sourceproducenter og invalidér same-SHA-proof ved senere fejl/manglende gate på tværs af begge livehistorikker.
- [x] Giv kun en eksplicit manuel normal kørsel i DEC-0121's tre tidlige modeltilstande og to maintenance-actions mulighed for at forsegle samme handoff som oneoff efter alle gates.
- [x] Bevar partial caches; registrér `34229976645` som 2.015 par tilbage til Open-Meteo og intet handoff. Måltests og uafhængigt review er grønne.
- [ ] Bestå exact-head GitHub sourcegate, merge og bevis 79.414/79.414 samt WAM/Feggesund 354/354 på main.
- [ ] Luk spatial/kapacitet, fulde produktionsgates, artifact/deploy, Phase B og offentlig verifikation før Candidate G erstattes.

# HISTORISK ROADMAP – 2026-09-08 – 4.0.335 fra vedvarende cache til model-online

- [x] Afslut Astra-helkædeaudit af WAM-admission, parserklassifikation, genbrug, Feggesund og gateplacering.
- [x] Implementér granulær bølgesalvage, atomisk replacement, exact-proof WAM-resume og operationel multi-run-kontinuitet uden cross-run interpolation.
- [x] Udskyd Feggesund til særskilt direct/proxy-proof og currentfallback til efter cache-save, men før en ufravigelig WAM-slutgate.
- [x] Kør den korte målmatrix: syntaks, 32 validator-tests, 24 producenttests, workflowinventar og integreret workflowadapter.
- [x] Versionér og dokumentér 4.0.335; geodata må kun ændre topversionsfeltet.
- [ ] Commit, bestå én exact-head GitHub `validate:source` og merge den eksakte grønne head.
- [ ] Kør én stor corrected main-oneoff på de bevarede cacher; kræv komplet current, native WAM for 670 dele, Feggesund 354/354 og spatial-/kapacitetsbevis.
- [ ] Brug det komplette runbundne handoff til fulde gates, artifact/deploy og Phase B; verificér den integrerede model offentligt.
- [ ] Genaktivér normalworkflow og watchdog, og observer de eksternt cron-startede kørsler som permanent vedligeholder.

# HISTORISK ROADMAP – 2026-09-08 – 4.0.334 fra komplet strømclosure til model-online

- [x] Klassificér main-oneoff `34161930631`: 79.414/79.414 strømpar, men efterfølgende Feggesund-stop; kildecacher gemt, intet artifact/deploy/cutover.
- [x] Implementér fair WAM-reserve til begge kritiske familier, same-run/cachegenbrug, højst fire inklusive brotimer og strict WAM-readiness før downstream.
- [x] Materialisér eksakt 118-timersakse med `MISSING`, atomiske tuples og hashbundet Feggesund-preflight/slutproof.
- [x] Ret Candidate G-targetalder og run-id-kontrakt; afslut måltests og to uafhængige reviews uden P0/P1.
- [x] Versionér 4.0.334 og synkronisér releasehukommelsen; geodata ændrer kun topversionsfelterne.
- [ ] Commit, bestå én exact-head GitHub sourcegate og merge.
- [ ] Kør ny main-oneoff på de bevarede cacher; kræv både 79.414/79.414 og Feggesund 354/354 samt spatial-/kapacitetsbevis.
- [ ] Kør fuld validate/releasegate, artifact/deploy og særskilt Phase B; verificér den integrerede model offentligt.
- [ ] Genaktivér ekstern-cron-båret normal drift og eftermål de to kendte P2-latenspunkter uden at forsinke launch.

# NYESTE ROADMAP – 2026-09-07 – 4.0.333 fra 282 huller til model-online

- [x] Klassificér 4.0.332-run `34127986853` uden cache-reset-overclaim: 79.132/79.414 og 282 ærlige rester.
- [x] Implementér og dybdetest exact-unresolved FIFO/BFS, max-to split, per-work retry, globale request-/queue-/deadlinegrænser og provider-wide HTTP-cooldown.
- [x] Afslut to uafhængige GO-reviews, målrettet provider-/closure-/live-runtime-test og 4.0.333 releasehukommelse/version.
- [ ] Bestå én exact-head GitHub sourcegate og merge.
- [ ] Kør main-oneoff; ved præcis 79.414/79.414 forsegl handoff, gennemfør full gates og aktivér den integrerede model kontrolleret.
- [ ] Efter launch genaktivér og mål normal cron-drift pr. leverandør; ændr kun budget/rækkefølge ved runtimeevidens.

# NYESTE ROADMAP – 2026-09-07 – 4.0.332 fra horizon-gyldigt weather-artifact til model-online

- [x] Gør egen prognosehorizon til availabilitygrænse: gammel men future-valid række bevares; eksakt slutinstant accepteres og `+1 ms` afvises.
- [x] Flyt 90/150/240-minutters og 72-timers aldersregler til warning/emergency/tillid/tur/kalibrering uden at svække 79.414-integritet, provenance eller privacy.
- [x] Implementér granulær DMI/Copernicus/Open-Meteo-salvage og atomisk newest-verified tuple replacement efter uændret providerprioritet.
- [x] Gør 48-timers historik rådgivende: numerisk `HISTORY_INCOMPLETE` for alle aktive zoner, reason codes og kalibrering fra; ingen syntese.
- [x] Bind et source-handoff til én eksakt grøn komplet `main`-producentkørsel og lad cutover-consumeren genverificere alle fem private cacher og closure. Bevar bounded `update:weather` og alle fulde gates.
- [x] Klassificér `34083611297`: 78.856/79.414, 558 missing, intet deploy. Klassificér `34093354004`: Copernicus success; Open-Meteo 2.735 required / 1.873 retained / 750 fetched / 2.623 filled; 112 critical missing; cache gemt; ingen closure/artifact/deploy. Klassificér `34104536681`: DMI 67.897/79.414 på 5m24s med cachegenbrug; Copernicus 8.372; 3.145 rester; null-run-source-index-stop før Open-Meteo; Copernicus-cache gemt; ingen closure/artifact/deploy.
- [x] Ret og måltest null-run-source-indexet, så kun ærlig nul-positiv DMI-katalogtilstand går videre som eksakt residual, retained old-run-proofs bevares, og positive/source-bærende null-run-rækker fortsat stopper.
- [x] Afslut 4.0.332's dokumentationstest, exact-head-CI og merge: sourcegate `34125927405` grøn, PR #265 merged som `1e1093de…`; dette er ikke produktionsbevis.
- [ ] Brug kun et komplet, horizon-gyldigt 79.414/79.414-run som handoffkilde. Gennemfør derefter central hydrering, sourcegate, bounded general-weather/update, Feggesund 354/354, spatial audit, live kapacitet, fuld validate/releasegate, artifact/deploy, særskilt Phase B og offentlig desktop-/mobilverifikation.
- [ ] Hold normal workflow deaktiveret under cutover; genaktivér ekstern cron-dispatch som varig updater efter kontrolleret afslutning.
- [ ] Efter launch: mål providertransitioner og beslut eventuelt overlap/hysterese uden tupleblanding; design separat durable immutable multi-artifact-historik/selector.

# NYESTE ROADMAP – 2026-09-07 – 4.0.331 fra sourceprecondition til vejrruntime

- [x] Stop og klassificér `34077360903` som pre-weather shallow-checkout-fejl; påstå ikke DMI-, Copernicus-, Open-Meteo-, cache- eller runtimebevis.
- [x] Gennemgå hele sourceplanen, alle workflowkaldesteder og oneoffens post-source-afhængigheder, så rettelsen dækker fejlklassen frem for kun ét symptom.
- [x] Materialisér exact pinned Candidate G-head/tree før sourcegaten i normal reusable weather-build, manuel pilot og 118h-oneoff; bevar PR-gatens fulde checkout og harmonisér trip-storage fra eksakt HEAD-fetch til fail-closed HEAD+TREE-forhåndskontrol, så alle sourcegate-workflows er dækket.
- [x] Gør den terminale oneoff-fejl tydelig om upstream stop, når Open-Meteo ikke blev evalueret.
- [x] Afslut kun de målrettede sourcehistorik-/workflow-, version-, RDKS-, håndbogs-/SQL- og protected-metadata-tests. Den fokuserede lokale matrix er grøn; den lange lokale `validate:source` er ikke gentaget.
- [ ] Commit/push 4.0.331, få én exact-head sourcegate i GitHub og merge kun den eksakte grønne head.
- [ ] Start derefter en frisk main-oneoff på 4.0.331. Følg cachegenbrug og faktisk DMI → Baltic → AMM15 → regional DMI → Open-Meteo-progression; run `34077360903` indeholder ingen weatherbaseline.
- [ ] Kræv præcis 79.414/79.414 med én kilde pr. par og nul overlap/missing samt Feggesund 354/354. Genaktivér ikke det deaktiverede normale workflow under den kontrollerede opfyldning uden ejerens plan.
- [ ] Fortsæt med hydreret spatial audit, live Supabase-kapacitet, fulde post-data gates, artifact/deploy og først derefter særskilt autoriseret Phase B og offentlig modelverifikation. Candidate G er offentlig indtil hele kæden er grøn.

# NYESTE ROADMAP – 2026-09-07 – 4.0.330 fra cachekontinuitet til model-online

- [x] Løft problemet fra enkeltfejl til hele providerkæden: adskil robust partial indsamling fra strict 79.414/79.414-releaseclosure.
- [x] Gør DMI critical-first og afgræns vedligeholdelsesrefresh af stadig gyldige rækker; bevar gammel tuple til atomisk valideret replacement.
- [x] Isolér Copernicus-datafejl pr. shard, bevar bound incomplete progress og nul-resultatforsøg, stop stale residualudvidelse og fysisk cacheprune ved rollover.
- [x] Luk hourly-reference-P1: genbrug et fortsat validt Baltic-prerequisite højst fire timer til AMM15-admission, men behold frisk retry/postbuild-upgrade, medmindre attemptet matcher den eksakte aktuelle reference.
- [x] Lad Copernicus-primary kun genbruge eksisterende 48t-historik uden netværksfetch; læg al history/advisory-refresh i et bounded, ikke-blokerende postbuild-job med separat kandidatvalidering og atomisk promotion.
- [x] Skeln regional optional data plane fra fatal control plane, så én defekt optional prøve bliver missing til næste provider uden at skjule centrale kontraktfejl.
- [x] Gør Open-Meteo-progress durable på tværs af normal/oneoff med schema v2, per-record acquisitiontid, target-rebase og start-/batchcheckpoints.
- [x] Fordel Open-Meteo breadth-first med bounded batchretry og én deadline; isolér HTTP-/provider-/payloadfejl til batchen.
- [x] Tillad først proaktiv Open-Meteo-refresh ved nul kritiske huller, ældst først og mindst to timers alder; bevar gammel record på refreshfejl.
- [x] Bring normal/oneoff på samme cache-/provider-/closurekontrakt og bind shared saves til exact-main write authority.
- [x] Fjern scheduled Copernicus-pilot; bevar ekstern cron som primær dispatcher, GitHub-schedule som reserve og serialiseret produktionskø.
- [ ] Afslut kun de fokuserede lokale kontrakt-/workflow-/RDKS-/JSON-kontroller, som 4.0.330 ændrer. Registrér præcis faktisk teststatus og gennemgå diffen fra helikopterperspektiv før releasehead.
- [ ] Løft version/bindingsmetadata på den samlede eksakte head, bevis geodata version-only og kør én GitHub exact-head sourcegate. Ret kun konkret evidens; start ikke en ny reparationskarussel af spekulative ændringer.
- [ ] Merge sikkert og kør stor main-oneoff eller normal continuation på rettet kode. Mål DMI-, Baltic-, AMM15-, regional- og Open-Meteo-fremgang samt cachegenbrug; gentag oneoff alene ved ærlig partial fremgang.
- [ ] Stop ikke ved provider-success. Kræv præcis 79.414/79.414, én kilde pr. par, nul overlap/missing samt Feggesund 354/354. Lad derefter almindelige cron-kørsler bevise, at cachen kan vedligeholdes med tidsmæssigt overskud.
- [ ] Gennemfør hydreret spatial audit, live Supabase-kapacitetsmåling med den bindende reserve, fuld post-data `validate` og `release:gate`, artifact/deploy og offentlig verifikation.
- [ ] Kør først derefter den særskilte autoriserede Phase B og verificér den integrerede scoremodel online. Candidate G er offentlig indtil hele kæden er grøn.

# NYESTE ROADMAP – 2026-09-06 – 4.0.329 kontinuerlig cacheattestation

- [x] Bevis, at 4.0.328 er merged efter exact-head, men at main-runtime stopper før fallback på attestation/proof-divergens.
- [x] Bevar cacheevidensen: `34041885030` gemte progression ved 8.918/9.541 (delta 623), og `34044178502` gemte progression ved 22.357/25.826 (delta 3.469) efter det observerede kanoniske modelrunskift.
- [x] Registrér gammel-main `34049794693` og `34051318868` på `31b9842`: DMI+Copernicus nået, Open-Meteo stoppet deterministisk på `OPEN_METEO_RESIDUAL_PLAN_INVALID_SHADOW_NATIVE_CADENCE_INVALID` ved 18:16:28Z/18:42:49Z, artifact/deploy korrekt skipped. De beviser kun producer/consumer-mismatch på hourly off-phase regional `dkss_lf`; retained-proof-pathen har alene lokale tests. Begge runtimebeviser er åbne.
- [x] Bind designet til faktisk rækkeejerskab: validated retained per-pair/source-proof følger kompatible cached rækker over modelrun med kompatibel processing-signatur og højst 120 timers native source-lead; nye selected-asset-proofs må ikke overtage gamle rækker.
- [x] Bind fallback til actual attestation og dens eksakte inverse over alle 79.414 registrypar uden antal- eller procentgrænse. Bevar partial som non-READY og slutclosure som strict.
- [x] Supersedér designet, der udledte `RETAIN_PREFERRED_NATIVE_RUN` af `ledger.ready`: exact retained pair/source-proofs bærer kontinuiteten, og normal/oneoff skal vælge selectorens nyeste modne, native-complete run med `RETAIN_PREFERRED_NATIVE_RUN=false`, også ved non-READY kandidat, så gammel 96h-pinning ikke forsinker refresh eller skaber unødig fallback-tail. `True`-path er kun dormant test/helper.
- [x] Implementér og fokustest fælles normal/oneoff-rettelse: donorens egen reference/+117-gate, retained proofs, actual inverse, latest native-complete run, gap-first, revised asset, sealed checkpoints, komponentatomar currenttuple-merge samt producer-skip/consumer-early-ignore af canonical regional off-phase. Malformed/on-phase forbliver fatal; fysisk prune er ikke indført. Final grøn matrix: `py_compile` 8, provenance, current-field-shadow, regional-current-operational, Open-Meteo-fallback, targetregistry, transactional 19/19 og diff-check.
- [ ] Synkronisér kun de release-/modelbindingsartefakter, som den faktiske kodeclosure kræver; afslut 4.0.329-releasehukommelse og korte statiske kontroller.
- [ ] Kør én exact-head sourcegate og merge kun den eksakte grønne head. Start ingen ny uændret main-kørsel mod den kendte deterministiske fejl.
- [ ] Kør stor main-oneoff eller normal continuation på rettet kode og kræv, at den eksakte rest faktisk når Copernicus/regional/Open-Meteo. Først 79.414/79.414, Feggesund 354/354, fulde gates/kapacitet og særskilt modelaktivering afslutter roadmapet. Candidate G forbliver offentlig indtil da.

# HISTORISK ROADMAP – 2026-09-06 – 4.0.328 per-pair weather closure, supersederet af 4.0.329

- [x] Erstat provider-all-or-nothing med en registrybundet availability-ledger: genbrug hvert verificeret DMI-par og send den eksakte inverse rest videre, også ved interne huller, hale eller totalt DMI-udfald.
- [x] Generalisér assetwatchdoggen til eksakt, revisionsbundet DMI-asset skip/restart; isolér øvrige download-/parse-/behandlingsfejl transaktionelt og fortsæt senere assets.
- [x] Tillad bound Copernicus `IN_PROGRESS`, inklusive nul attempts, at aflevere den ærlige rest til regional DMI/Open-Meteo uden at påstå kildeudtømning.
- [x] Karantæner kun ugyldige private Copernicus-derivater; bevar fail-closed registry-, DMI-, centrale target-, selected-run- og final closure-grænser.
- [x] Bevar Open-Meteo som særskilt combined-current/`calibrationEligible=false`, rådgivende 48h-historik og strict active-promotion; bestå de målrettede lokale kontrakttests.
- [x] Indeksér closurebeviset uden gentagen 79.414-helsanning og bind spatial slutgate til privat U/V uden offentlig vektoreksponering.
- [ ] Afslut docs/version/diff og få én fuld exact-head sourcegate i GitHub. Merge først efter grønt bevis på netop det endelige head.
- [ ] Kør stor main-oneoff som genopfyldning og lad normal drift fortsætte samme cache. Kræv 79.414/79.414 current, Feggesund 354/354, fuld validate/releasegate, artifact/deploy, kapacitet og særskilt modelaktivering; Candidate G forbliver offentlig indtil da.
- [ ] Efter stabilisering og model-online: mål DMI, Baltic, AMM15, regional DMI og Open-Meteo pr. normal kørsel og justér rækkefølge/budget/kadence kun ved friskhedsevidens. Ekstern cron forbliver primær; større pipelineoptimering udskydes.

# NYESTE ROADMAP – 2026-09-06 – 4.0.327 Open-Meteo uden endnu en deterministisk stopfejl

- [x] Klassificér 34017809629 attempt 1: DMI/Copernicus READY og gemt, Open-Meteo-stop før request på gammel ikke-valgt shadowcadence.
- [x] Gennemgå hele requestvejen og bekræft live model, SI-enhedsparameter, GMT/UTC, 118-timersvindue, multi-location og batch 50.
- [x] Sortér ikke-valgte regionale runs fra før cadence/asset/vektor, men bevar alle same-run fail-closed værn.
- [x] Ret Open-Meteo til wind_speed_unit=ms og kræv eksplicit m/s/grader/UTC; tilføj regressioner.
- [x] Bestå de tre målrettede regionale-, closure- og Open-Meteo-tests.
- [ ] Luk releasehukommelse og korte versions-/RDKS-/privacy-/workflowkontroller; bestå derefter én exact-head sourcegate og merge.
- [ ] Kør rettet main-oneoff med bevarede cacher til 79.414/79.414. Kræv derefter Feggesund 354/354, kapacitetsmåling, fulde produktionsgates og særskilt modelaktivering.

# NYESTE ROADMAP – 2026-09-05 – 4.0.325 robust første active-bootstrap

- [x] Registrér PR #257 exact-head `33989875253` og merge `948ba60b`; annullér den kendt fejlagtige ventende post-merge-kørsel `33991028274` før DMI eller writes.
- [x] Erstat den kortlivede hardkodede legacykey med livevalg af entydig main-key/version og eksakt immutable-attempt-bevis for producent, tilhørende save og terminaltrin.
- [x] Bevar exact-only main-restore uden `restore-keys`, strict READY/registry og candidate-isolation; kandidat-404 må falde videre, mens øvrig API-/inventar-/evidensusikkerhed stopper fail-closed.
- [x] Kræv main før private pilot-/118h-restores, og stop skipped DMI-trin fra at re-save store GRIB-, kandidat- eller researchcacher. `33991952081` beviste både den gamle cachemiss og 2.778.397.542-byte churnen.
- [x] Bestå korte unit-/workflowkontrakter og live read-only resolverprøve mod cache-id `7369179233`, `33990516150` attempt 1.
- [x] Luk 4.0.325 version, changelog, RDKS, Markdown-/webhåndbog, installationsparitet, YAML/JSON og geodata-version-only; målrettede kontroller er grønne.
- [ ] Bestå én fuld exact-head sourcegate og merge. Den lange lokale generelle releasegate gentages ikke; dens uberørte Candidate G-audit blev standset uden fejl efter de relevante grønne kontroller.
- [ ] Verificér første main active-save, mål fetched/missing og start én stor main-oneoff. Fortsæt kun til modelrelease efter komplet 210/673/118, fuld produktionsgate og øvrige eksisterende readinesskrav.

# TIDLIGERE ROADMAP – 2026-09-05 – 4.0.324 cachegenbrug og komplet vejrvindue

- [x] Bind normal og 118h-oneoff til samme serialiserede active/candidate-kontrakt: materialisér strict READY-active som donor, men før alt nyt DMI-arbejde gennem fælles `dmi-zone-candidate-v1`. Normalen er updateren; oneoffen accelererer kun.
- [x] Gem ikke-annulleret partial kandidat før terminalen, og kræv producer-success, allowlistet status, `DMI_READY`, strict anchor, `candidate_promoted=true` og eksakt registrybevis før active eller deploykæden må fortsætte.
- [x] Historisk 4.0.324-trin, supersederet af 4.0.329: partial-only 96h-runretention blev indført, men gældende drift vælger selectorens nyeste modne, native-complete run med retentionflag `false`; exact retained pair/source-proof bærer kontinuiteten.
- [x] Lad normal drift genbruge gyldige data og kontrollere hele target..+117 for interne huller, invalid/expired og hale; løft normal DMI-vedligehold til tre DKSS-familier uden at ændre fallbackrækkefølgen.
- [x] Bevar DMI-/Copernicus-historik og de integrerede forbrugeres 48-timers mobiliserings-/transportvindue; bevar ekstern cron som primær dispatcher og GitHub schedules som reserve.
- [x] Luk den målrettede lokale matrix: producer, provenance, rollover, active/candidate, workflow, downstream, atomic/history, `py_compile`, YAML-/JSON-parse, RDKS/security samt releaseversion/geodata.
- [x] Klassificér exact-head-run `33986893042`: alle kode-/kontrakttests bestod, men releasegaten fejlede alene, fordi `CHANGELOG-4.0.324.md` manglede. Det røde run er ikke exact-head-bevis.
- [x] Registrér at ejerens ordre om admin-bypass blev afvist af Codex-sikkerhedslaget, så ingen bypass eller merge skete; run `33988058582` bestod releasegaten, men stoppede senere alene på håndbogs-/installationspariteten. Ret den ene genererede SQL-payloadlinje med den officielle synk.
- [ ] Bestå ny exact-head, merge sikkert, mål fetched/missing, verificér bootstrap/runtime og fuld produktionsgate, og start én stor main-oneoff. Kræv kandidatcheckpoint ved afbrydelse og READY-promotion før aktiv erstatning.
- [ ] Lad normal drift indhente den nye hale, bevis frisk komplet leverandørclosure og fuld produktions-/releasegate, og fortsæt derefter den allerede dokumenterede modelrelease. Vurder først senere større pipelineparallelisering ud fra målte leverandørtider.

# NYESTE ROADMAP – 2026-09-05 – 4.0.323 currentclosure og friskhed

- [x] Implementér og måltest DEC-0115's eksakte DMI → Baltic → AMM15 → regional DMI → Open-Meteo-kæde uden historiksyntese eller kalibreringsadmission.
- [x] Bind normal/oneoff til bounded leverandørtid, stale-target-stop og samme fail-closed artifactgrænse.
- [ ] Luk docs/version, fuld sourcegate og exact-head; merge kun ved grøn eksakt PR-head.
- [ ] Genmål safe fetched/missing på main, rapportér tallene til ejeren og start den autoriserede store engangskørsel.
- [ ] Følg hver leverandørs varighed og closure. Efter komplet cache vurderes normal rækkefølge, budget og scheduler på målt evidens.

# NYESTE ROADMAP – 2026-09-03 – samlet 4.0.321 efter PR #249

- [x] Merge den exact-head-grønne monotone Copernicus-progression som `a331e0dbb08a9ab9ffff26632a708828574bdcd8`.
- [x] Bind scheduled pilot til den gendannede, fuldt validerede DMI-ledgers eksakte reference og måltest neutral skip ved bounded continuation.
- [x] Luk integrated bundle til `d5796289…`/55 og den uafhængige actual public closure til 78 moduler; synkronisér aktive bindingsforbrugere og håndbøger.
- [ ] Commit/push den samlede lokale 4.0.321-head og bestå exact-head én gang.
- [ ] Kør Supabase linked migrationsliste/dry-run og kun ved grønt planbevis apply/readback; stop ved authfejl uden passwordreset eller gæt.
- [ ] Bevis 673 × 118, Feggesund 3 × 118, Supabase før/efter og mindst 30 procent reserve; gennemfør derefter særskilt Fase B, frisk produktion og offentlig mobil-/desktopkontrol.

# NYESTE CHECKPOINT – 2026-09-03 – 4.0.321 sidste lokale releasekant

- [x] Normalisér continuation-kilden som `utf8-bomless-lf-v2` og bind current hash `35c45f8f…` på Windows og Linux.
- [x] Luk den reelle 4.0.320-race med én exact `082a5187…`→current same-target-genattestering; bevar current-only inputvalidator og stop alle øvrige same-target-/predecessorafvigelser.
- [x] Bevis lokalt fuld restore/CAS-sekvens, idempotent retry, negativ state-konflikt, SQL/schema/installerparitet og metadata-readbackkontrakt.
- [ ] Commit/push og exact-head; derefter remote Supabase dry-run/apply/readback, 673 × 118, Feggesund 3 × 118 og live kapacitetsmåling med mindst 30 procent reserve.
- [ ] Merge kun efter grønne gates; gennemfør derefter frisk produktion, særskilt manuel Phase B og offentlig desktop-/mobilkontrol af state 6.

# NYESTE CHECKPOINT – 2026-09-03 – 4.0.320 tofase-release

- [x] Implementér og måltest aktiveringslåsen: push, schedule, watchdog og almindelig manuel vejrdrift kan kun vedligeholde current moderne Candidate G; første integrerede cutover kræver særskilt manuel Fase B med bool + eksakt token.
- [x] Bevar gamle forseglede planer/recovery og den uændrede controllerkontrakt; kræv før DMI den forseglede centrale Phase-A-complete Candidate G-identitet og genverificér faktisk live public source/manifest/implementation før begin-CAS.
- [x] Forsegl gældende 4.0.320-bundles: integrated `3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 forbrugere og Candidate G-rollback `7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer.
- [ ] Commit/push én samlet head, bestå exact-head `validate:source` én gang og merge Fase A sikkert med Candidate G fortsat som eneste offentlige model.
- [ ] Lad cron på den mergede Fase A-kode akkumulere cache; bevis derefter 673 × 118, Feggesund 3 × 118 og DEC-0114''s live Supabase før/efter-kapacitet med øvrig egress/lager og mindst 30 procent reserve.
- [ ] Kør først derefter særskilt manuel Fase B, frisk fuld produktion og offentlig desktop-/mobilkontrol. Tokenen er operationsautorisation, ikke kapacitetsbevis.

# TIDLIGERE CHECKPOINT – 2026-09-02 – 4.0.320 lean slutvej

- [x] Fastslå DMI-rodårsagen med timings og kodeprofil; afvis både blind Copernicus-erstatning og flere symptompatches.
- [x] Implementér deterministic low-level SAME_GRID-genbrug, cache-/provenanceadskillelse, optional-field-stride, bounded checkpoint og numeric-only gridmetadata.
- [x] Luk de afgrænsede DMI-/smoke-/workflow-/proveniens-/checkpointtests og RDKS/version 4.0.320; ingen bred lokal validate-dublet.
- [ ] Push én samlet head og bestå exact-head `validate:source` én gang.
- [ ] Kør én isoleret branch-preflight og kræv komplet DMI-first/exact-residual-Copernicus-current for 673 dele × 118 timer; kræv separat Feggesund wave-only-ledger for tre dele × 118 timer.
- [ ] Fetch/integrér nyeste grønne main, merge sikkert, følg fuld produktion/activation og verificér state 6 offentligt på desktop og mobil.

# TIDLIGERE CHECKPOINT – 2026-09-02 – Feggesund direct-first proxy og slutrelease

- [x] Implementér den eneste tilladte Feggesund-undtagelse: direkte lokal `DK-B05-11`-WAM vinder; kun en helt manglende lokal bølgetuple må bruge komplette, direkte, same-run DMI-tuples fra både `DK-B05-10` og `DK-B05-12`.
- [x] Før usikkerhed, DA/DE/EN-advarsel og `calibrationEligible=false` gennem alle proxyberørte mode-/zone-/public-/tur-/observationsforbrugere, også ved ellers `FULL_HISTORY`; bevar bølge-only-grænsen og uændret geometri/punkter/kystnormal.
- [x] Regenerér og forsegl slutbindingerne: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 filer/8 deklarerede forbrugere; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0` over 56 filer.
- [x] Klassificér exact-head `33577887262` som sikkert stop i Candidate G-rollbackens public stage på calibration-ceiling; ret fem validatorer symmetrisk og bevis rollback public-stage 210/673, Candidate-assistent, integrerede public consumers og Edge lokalt.
- [ ] Bestå privacy-safe 3 × 118 med direct + proxy = 354 og missing = 0, og gennemfør ny exact-head, merge, frisk fuld produktion og offentlig desktop-/mobilkontrol.

# TIDLIGERE CHECKPOINT – 2026-09-01 – DEC-0114 integrated-first releasevej

- [x] Bind ejerens supersession i DEC-0114: strict direct+operational 118 h kan frigive den integrerede model, mens measured-only ældre historik opbygges bagefter som synlig `HISTORY_INCOMPLETE` med `calibrationEligible=false`.
- [x] Færdiggør og måltest privat `BUILDING_MEASURED_ONLY`, strict schema-4 READY-checkpoint med eksplicit warmup-N/A, state-less same-model recovery, audit/activation og fail-closed invalid/tampered-state-grænser.
- [x] Bevar migrationens coherent 40-timers WAM-gate som migration-only og operational exact bridge+target..+117 som hard gate. Copernicus schema 3 bruger `OPERATIONAL_COMPLETE` for hard current og særskilt advisory measured-only −48 h. Ingen syntese, interpolation, carry-forward eller neighbor data.
- [x] Før `calibrationEligible=false` gennem controller, trip/observation, admin, hydrering og reconciliation; tillad kun `true` efter forseglet full-history-audit.
- [x] Implementér og kontrakttest branch-dispatch 118h-preflight samt DMI atomic compatible-cache backfill, save-before-terminal-gate og selector-after-ready.
- [x] Klassificér `33510636195`/`33512163102`: nul DKSS-behandling afslører lokal cache-/runudsultning; `33498108421` er negativ run-/cachelineage, ikke bevis for bred upstream-DMI-fejl.
- [x] Ret lokalt preferred-ruo-fremskift også ved ukeodt cadeoce, jobafgræoset target over UTC-timeskifte, betioget DKSS-first/geobehaodliog i deo oormale loop udeo strict aochor og eo valgfri strict-valideret deployed dooor, som ikke må blokere frisk officiel DMI. Ved første cutover ligger deo særskilt checkpoiotede WAM-historikbootstrap før deo oormale seks-collectioo-loop og kao fortsætte over flere forsøg; oormal drift bevarer to collectioos.
- [x] **Historisk supersession:** DEC-0116 afløste punktets to-collection-/preferred-run-del med fælles kandidat, partial-only 96h/non-stale retention og tre DKSS-collections. 4.0.329 supersederer siden retentionen med nyeste modne native-complete run og exact retained pair/source-proof; tre DKSS-collections består.
- [x] Klassificér `33520738058` som negativt fasebevis og gør tidlig current-cache-health konsistent med senere autoritativ sampling-/gridvektoroprydning. Bevar DMI som primær i både nuværende og ny model; Copernicus er kun exact-gap-supplement efter grøn DMI-terminalgate.
- [x] Bestå de målrettede scheduler-/bulk-/workflowkontrakttests samt Python-syntakskontrollen.
- [ ] Få et grønt frisk 118-timers datapreflightbevis på den nye eksakte kodehead. Copernicus må fortsat kun supplere eksakte resterende DMI-huller.
- [ ] Kør exact-head, sikker merge, frisk integrated produktion og offentlig desktop-/mobilkontrol af 210/673, current/fem døgn, begge modes, warnings og Feggesunds policybundne 3 × 118.
- Candidate G er fortsat eneste offentlige model. Lokale implementeringer og måltests er ikke exact-head-, preflight-, produktions- eller releasebevis.

# TIDLIGERE CHECKPOINT – 2026-08-31 – PR #241 merged; legacy-profilattestering lokalt rettet

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.319-produktion og offentlig desktop-/mobilverifikation udestår.

# TIDLIGERE CHECKPOINT – 2026-08-31

- Denne topstatus superseder ældre topresumeer nedenfor.
- Gennemført siden forrige topstatus:
  - PR #238 merged som `57f76d716310060e0d629c9f9d3691d386a2dd58`
  - workflowfixes PR #239/#240 merged videre til `be81005b50294f54367f154c393bb27910e16c6f`
- Ny blocker:
  - produktion `33391418061` og `33393684620` stoppede sikkert før DMI/writes/artifact/Pages, fordi én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` stod som bearing `360`, mens aktiv kontrakt kræver `[0,360)`
- Aktiv remediation:
  - PR #241 normaliserer kun afrundet `360` til `0`; ingen geometri-, zone-, land-/vandpunkt- eller kystnormalændring
  - første CI `33394343851` stoppede ved stale bundle-/binding-consumers; senere gates blev ikke bevist; bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret
- Næste mindste sikre rækkefølge:
  - grøn exact-head for PR #241
  - merge
  - frisk 4.0.319-produktion
  - offentlig desktop-/mobilbrowserverifikation
- Candidate G er fortsat offentlig, indtil den opdaterede exact-head/merge/prod/browser-kæde er bevist.
# RavRadar - aktivt roadmap

## Model-P0 – Feggesund direct-first wave-only proxy og releasebevis

- [x] Lås den eneste naboundtagelse til `DK-B05-11`: direkte lokal DMI WAM vinder altid; kun en helt manglende lokal bølgetuple må erstattes af en 50/50 energikonsistent tuple fra direkte DMI-serier for både `DK-B05-10` og `DK-B05-12` ved samme time/run.
- [x] Hold strøm, currenthistorik, recovery-backfill, kunstig historik, geometri, punkter og kystnormal helt udenfor undtagelsen.
- [x] Før `LOW`/`MODERATE`/`HIGH`, synligt DA/DE/EN-varsel og `calibrationEligible=false` gennem alle downstream-forbrugere for timer, der faktisk bruger proxyen – også ved `FULL_HISTORY`.
- [ ] Bestå privacy-sikkert 3 × 118-bevis med direct + proxy = 354 og missing = 0 som Fase B-gate. Fase A/exact-head/merge kommer først og bevarer Candidate G offentlig; derefter følger Supabase-bevis, særskilt manuel Fase B, frisk produktion og offentlig desktop-/mobilkontrol.

## Model-P0 – samlet integreret RavScore under DEC-0110, ikke udgivet

- [x] Bevar den friske offentlige Candidate G-base: `33345476979`/`rr-20260831010337-210` var første grønne recoverybevis, og seneste external-watchdog-`workflow_dispatch` `33347230240` publicerede `rr-20260831012407-210` komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples. Candidate G er ærligt 0/210 aktiv på grund af historikmemory. De forudgående runs `33343469247`/`33344823000` var sikre transient-503-stop uden deploy; bounded retry-hotfixen bestod PR #237 exact-head `33352520408`, merge `8c03e25d` og grøn backend-/fuld produktion `33352661061`/`33352634365`.
- [x] Luk lokalt `ravradar-production-workflow-outcome-v2`, Spørg RavRadar-kvalitetsskeln og DA/DE/EN-plain-language for firetimers energivægtning/højst 15 % dæmpning. Fuld sourcegate, exact-head, produktion og offentlig kontrol er stadig releasegates.
- [x] Aktivér ét 15-minutters diagnose-/reparationskontroljob for vejrfriskhed uden at oprette en ny scheduler eller dubletvagthund; ingen blind redispatch af et kendt fejlet build.
- [x] Regenerér gældende 4.0.320-slutbindinger: integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`3192db304a6e613059cd66d1ae983583c3aaff832293bda978cdc03991bb49c3` over 44 filer/8 consumers; Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`7c7f2b4950b4ce7a04d560dde15dd93e408e045ca5e9ed4f9be33eac0255e89d` over 56 filer.
- [x] Stop og teknisk pensionér den planlagte fiktive udførelse af morgenhullet før descriptor, apply, mutation, artifact eller offentliggørelse. DEC-0109 bevares kun som historisk incident-/trustkontrakt; workflow-inputs/job, incidentpolicy og mutator er fjernet, og en negativ gate forhindrer genåbning.
- [x] Klassificér hver aktiv Candidate G-del som BEVAR, FORBEDR, ERSTAT, FJERN eller UTILSTRÆKKELIG EVIDENS og bind den samlede kandidat til DEC-0110.
- [x] Implementér én modelkontrakt: `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`, bounds-v5-profil/komponent/forklaring, kausal energivægtet bølgeapproach samt afgrænset `delivery=supply×factor` uden wave-created supply.
- [x] Bevar fysisk usikkerhed ærligt: `physicalDeliveryResolved=false`, fysisk interval `null`, ingen empirisk fundpræcisionspåstand, vandstand score-neutral og DDM 50 m kun som statisk kontekst.
- [x] Bind v5-migrationen til signed-evidence Candidate G-current-reweight uden rå U/V, præcis 673/common-target, 40 private WAM-præ-target-positioner fra coherent run pr. collection, same-cell provenance, højst fire timers same-run-interpolation og `1/1024`-grænse. Denne historiske WAM-gate er migration-only efter DEC-0114. Bevar schema 5 kun som eksakt, aldrig-offentlig 5→6-ready-migrationskilde; aktiv runtime/recovery er schema 6, checkpoint er strict READY-betinget, rollback er v3, og same-model atomisk nøddrift er højst 72 timer uden cross-model fallback/interpolation.
- [x] Adskil direkte inputmissing som `UNAVAILABLE` fra historikmissing som numerisk konservativ `HISTORY_INCOMPLETE`; bevar 48 h aktiv currenthistorik, 168 h score-neutral researchretention, 288 h wave-tail og 40 h last-mile-closure med eksplicit `conservativeResetAt`.
- [x] Bind `direction-broad-19-history-tie-v2` og `score-history-water-tie-earliest-v3`: numerisk score først, `FULL_HISTORY` kun ved eksakt tie, derefter eksisterende ranking-/vand-/tidsregler.
- [x] Opdatér producent-/forbrugermatrix, modelregister, RDKS, Markdown-/webhåndbog og releasekandidatens system-, regel-, vejr- og forskningsdokumentation.
- [ ] Bevis Feggesund/`DK-B05-11` i en frisk integrated part-level-produktion: alle tre aktive dele × præcis 118 policygyldige bølgetimer. Direkte lokal DMI vinder; kun en helt manglende tuple må bruge den faste B05-10+B05-12-wave-only proxy. Mangler begge gyldige nabotuple ikke, er timen `MISSING`/fail-closed. Ingen punktflytning.
- [ ] Bestå målrettede kontrakttests og én fuld exact-head-kildegate på den færdige PR-head; merge derefter Fase A sikkert med Candidate G fortsat offentlig.
- [ ] Bevis 673 × 118, Feggesund og Supabase-kapacitet på den mergede Fase A-head; kør derefter særskilt manuel Fase B, frisk produktion med fulde gates og verificér den ene offentlige state-6-model på desktop og mobil. Indtil Fase B er grøn, er Candidate G produktionssandhed, ikke shadowmodel.

## P0 4.0.316 – publicér frisk primary uden at vise udløbet fallback

- [x] Bestå 4.0.315 PR #233 exact-head `33299676128`, merge `63d789a4` og bevis i run `33299747300`, at D1-gaten frigives og build starter.
- [x] Afgræns det nye stop til fallbackstaging uden kandidat inden for 72 timer/prognosehorisont; bevis at artifact/Pages ikke blev publiceret.
- [x] Bind DEC-0112: gyldig fallback er valgfri for frisk measured-only primary; gammel/udløbet fallback fjernes fra manifest/public files og må aldrig vises.
- [x] Bevar primary accounting/audit fail-closed og nul syntetiske data/interpolation/backfill/zonelån.
- [x] Bind DEC-0102 til `HISTORY_INCOMPLETE`-score, DA/DE/EN-advarsel, automatisk bortfald, `calibrationEligible=false` og separat direct-input-`UNAVAILABLE`.
- [x] Placér workflowmonolit, grøn-no-op-semantik og version/docs/string-testkobling i modelarkitekturroadmapet; udvid ikke P0-hotfixen.
- [x] Bestå målrettede fallback-/RDKS-/håndbogs-/security-/versions-/releasegates og exact-head sourcegate.
- [x] Merge 4.0.316, kør frisk fuld produktion og publicér artifact/Pages.
- [x] Verificér offentlig frisk 4.0.316-primary som `rr-20260830091913-210` med 210/673. Candidate G gav 0 aktive zoner/210 `UNAVAILABLE` på grund af utilstrækkelig sammenhængende currenthistorik; dette er regressionsevidens, ikke state-6-bevis.

## Historisk P0 4.0.315 – pensionér stale interlock og nå normal build

- [x] Bevis at den tilbagetrukne operation efterlod et umuligt apply+Pages-prerequisite og gjorde normale jobs til grønne no-ops.
- [x] Bevis offentlig konsekvens: primary >8 timer, measured-only recovery >72 timer og fail-closed prognoseudfald.
- [x] Bevis at ingen descriptor/apply/mutation eller syntetiske data nogensinde nåede produktion.
- [x] Fjern den operationelle workflow-/actuator-/descriptor-/package-/releasegateflade og opret en negativ retirement-regression.
- [x] Dokumentér DEC-0111 og markér DEC-0109 historisk, tilbagetrukket uden anvendelse.
- [x] Bestå målrettede RDKS-/håndbogs-/workflow-/versions-/releasegates og PR #233 exact-head `33299676128`.
- [x] Merge som `63d789a4`; run `33299747300` frigav D1-gaten og startede build, men stoppede senere før artifact/Pages.
- [ ] Offentlig verifikation blev ikke opnået i 4.0.315 og er flyttet til 4.0.316-P0 ovenfor.
- [ ] Fortsæt derefter DEC-0102-modelsporet uden at genindføre interpolation.

## Historisk P0 4.0.314 – policybundet cadencegate

- [x] PR #231 exact-head `33279317463`/`99171645787`, merge `d539fc9d` og no-op push `33279411885`.
- [x] Exact-main D1 `33279463545`/`99172031927` helt grøn.
- [x] Read-only inspect `33279639424`/`99172534863` stoppede uden descriptor/mutation ved `ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE`.
- [x] Bind cadence pr. del til den eksisterende regionale policy, forsegl kun en koordinatfri projektionshash, og genvalider den ved apply-CAS.
- [x] Bevar sparse 1/2/3h measured continuity på 1h-dele uden at udfylde interne slots; kræv eksakt 3h på de otte policydele.
- [x] Målrettet 210/673 cadence-/CAS-regression og workflowinterlock grøn.
- [x] Kør fuld lokal `validate:source` én gang, målrettede RDKS-/håndbogs-/security-/releasegates og tre uafhængige slutreviews; ret dokumentationsfund og genvalider proportionalt.
- [x] Ejerbeslutning 2026-08-30: afslut sporet uden ny exact-head/D1/inspect og uden descriptor eller apply.
- [x] Ingen rekonstruktion, datamutation, artifact eller offentliggørelse blev udført; den afgrænsede kontrakt bevares kun som historisk sikkerheds- og tillidsevidens i DEC-0109.

## Historisk P0 4.0.314 – før-primary-gaten

- [x] Luk 4.0.313 PR #226/exact-head `33269501339`, merge `ff62ba11`, no-op push `33269584236` og helt grøn D1-backend `33269631305`.
- [x] Registrér read-only inspect `33269849748` som afvist før descriptor/apply ved `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT` og uden mutation.
- [x] Afgræns singleton til ét målt `AFTER`-anker på uafhængigt bevist 3-timerskadence; bevar alle øvrige count/replay/bracket/CAS/privacygates.
- [x] Lås 4.0.314 til exact-D1 og normal produktion til exact-head apply+Pages; bind inspect til D1 og bevis 4.0.315 ulåst.
- [x] Luk fuld lokal source-/RDKS-/release-/versions-/geodatagate for PR #227-diffen før same-version-hotfixet.
- [x] Bestå tre uafhængige reviews af PR #227-diffen og luk de to fundne testpræcisionskanter.
- [x] Bestå PR #227/exact-head `33272564543`/`99153577550`, merge som `d1369d88` og korrekt no-op push `33272676071`.
- [x] Bevis at ældre produktion `33271863449` stoppede før releasegate/Pages på en stale marine-first-test; ret assertionen og bind testen ind i `test:workflow-action-contracts`/`validate:source`.
- [x] Fuld lokal hotfixgate inklusive release/RDKS/version og nul geodatadiff.
- [x] Bestå to uafhængige hotfixrevisioner uden blocker.
- [x] Hotfix PR #228 exact-head `33274411880`/`99158510299`, merge `50369742` og korrekt no-op push `33274505196`.
- [x] Docs-checkpoint PR #229 exact-head `33275025105`/`99160126852`, merge `9291250c` og korrekt no-op push `33275147023`.
- [x] Helt grøn exact-main 4.0.314-D1 `33275218540`/`99160622956` på `9291250c` inklusive begge syncs, slutreconciliation og slutattestation.
- [x] Read-only inspect `33275438494`/`99161265720` stoppede i planforseglingen før descriptorupload, mutation, build og Pages.
- [x] Allowlist `ONE_TIME_GAP_*` som fejlannotation, maskér al anden fejltekst og eksponér kun descriptor-SHA plus faste optællinger ved succes; målrettet 210/673-black-box-test er grøn.
- [x] Reproducer PR #230's første CI-stop under nedarvet `GITHUB_ACTIONS=true`, isolér testmiljøerne og bestå 210/673-regressionen i begge tilstande uden runtimeændring.
- [x] Diagnostikhotfix PR #230 exact-head `33277107562`/`99165644953`, merge `228725ea` og no-op push `33277217412`.
- [x] Første D1 `33277253662` stoppede fail-closed på en forbigående 503 efter Edge med grøn roll-forward; genkørsel `33277510537`/`99166722076` bestod hele backendkæden på samme SHA.
- [x] Read-only inspect `33277738135`/`99167394284` stoppede før descriptor/apply/build/Pages og viste kun `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY`.
- [x] Bevis separat målt nødvisning versus ærlig før-primary, fjern kun blanket-READY-kravet, og bevar source/replay/bracket/CAS/slut-READY.
- [x] Test 673 ærlige 24-timers `WINDOW_INCOMPLETE`-før-suffixer positivt og ældre hul/replaytampering/schema 2.1/ukendt status negativt i begge parentmiljøer.
- [x] Luk alle lokale dokumentations-, workflow-, privacy-, release- og geodatagates, hele `validate:source` og tre uafhængige slutreviews uden resterende blocker.
- [x] Ejerbeslutning 2026-08-30 erstattede den resterende hotfix/D1/inspect/apply-kæde med et stop uden descriptor, mutation eller offentliggørelse.
- [x] Modelsporet fortsætter særskilt som 4.0.315-releasekandidaten under DEC-0110; ingen fiktiv historik bruges som genvej til modelstate.

## Historisk P0 lokal 4.0.312-roll-forward – 4.0.311 source merged, backend stoppet sikkert

- [x] Lås `RRGAP-2026-08-29-CANDIDATE-G-01` til eksakte artifacts og lineær interpolation af allerede afledt signeret kystnormal strength; interpolér ingen vejrdata, rå U/V, koordinater, geometri eller private payloads.
- [x] Før schema 2.1/trust gennem state, public payloads, fallback, manifest, trips og observationer; udeluk rekonstruktion/nødvisning og uattesteret legacy fra kalibrering og observeret hard-outflow.
- [x] Implementér CAS-bundet inspect/apply/direct rollback/kausal cleanup, private rollbackartifacts, cachekarantæne og obligatorisk frisk normal 673-dels genberegning.
- [x] Luk storage/privacy lokalt med eksplicit server-side bladprojektion/readback, global atomisk D1-registry, owner-erasure tombstones og no-mutation legacy replay.
- [x] Lås cutover med installationstype-intent efter capacity/CAS, 20-/30-minutters lease, femsekunders Edge-prober, 600 sekunders restlease og samlet syvminutters Worker-gate. Route partial existing Edge til D1 roll-forward og partial fresh Edge til exact-main/Supabase-secret/eksakt Edge/dobbelt Supabase-attestation; uden intent ingen recoverymutation.
- [x] Registrér næste models bindende målt-only, atomiske 210/673-nøddrift: eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips og automatisk frisk primary.
- [x] Bestå 4.0.311's målrettede suites og fulde sourcegate på PR #224-head `4c4699fe`; exact-head `33263734108`/`99129959870` er grøn.
- [x] Merge PR #224 som `7c168b00`; bevis at push `33263858078` er grøn no-op uden artifact/Pages, mens backendbevis mangler.
- [x] Afgræns backendincident `33263892151`/`99130384780`: HTTP 201 fra én atomisk CHECK-transaktion, derefter falsk negativ katalogverifier; mulig tilstand er fuld committed/valideret/commented CHECK eller fuld rollback, aldrig en delvis constraint. `VALIDATE` kan have scannet rækker internt, men runneren hentede/loggede ingen observationspayload, og der skete ingen rækkemutation; D1/Edge/Worker/sync/vejr/artifact/Pages blev ikke nået.
- [x] Erstat lokalt i 4.0.312 den flade regex med balanceret, deparser-tolerant exact-JSONPath-verifikation; behold fail-closed afvisning af ombytning, dublet og tvetydighed. Målrettede storage-tests er grønne.
- [x] Bestå 4.0.312's fulde lokale source-/RDKS-/håndbogs-/versions-/releasegate og særskilte geodatadiff.
- [x] Luk PR #225/exact-head `33266087776`, merge `a5ece10d` og korrekt no-op push `33266184326`.
- [x] Kør `[d1]` på eksakt 4.0.312-main; backend `33266229687` passerede verifier/D1/Edge/Worker, men fejlede migrationssynken og tæller ikke som readiness.
- [x] Undlad inspect/apply efter den røde backend og overfør den resterende livekæde til det aktuelle 4.0.314-afsnit ovenfor.
- [ ] Bevar P2-låsen: aktivér ingen global koefficientlæring, før schema-v2/snapshot er serverbevist mod signeret public manifest.
- [ ] Efter den akutte genopretning: tilføj en payloadfri konto-lokal fresh-bootstrapfase, så eksakte 1–9/10-shard-prefixes kan genoptages efter afbrydelse uden at blive forvekslet med den dokumenterede legacykonto; klassifikationen skal fortsat stoppe tvetydige sæt fail-closed.
- [ ] Erstat migrationsrunnerens mutable offset-pagination med stabil keyset-/snapshotpagination; bevar indtil da obligatorisk idempotent slutreconciliation og retry som reparationsvej.

Historisk resultat: 4.0.312 blev exact-head-valideret og merged, men backend `33266229687` fejlede migrationssynken og blev ikke readiness- eller produktionsverificeret. Offentlig sandhed forblev 4.0.310 og den eksisterende målte nødvisning. Rekonstruktionssporet blev senere opgivet uden descriptor/apply/mutation/offentliggørelse; modelarbejdet fortsætter alene i 4.0.315-afsnittet ovenfor. Se DEC-0109, DEC-0110 og DEC-0102-addendum.

## Produktions- og driftsverificeret P0 4.0.310 – ekstern overtagelse efter ét manglende interval

- [x] Bevis den aktive 45-minuttersgren med vagt `33246369618` og redningsproduktion `33246376992`.
- [x] Sænk kun `external_watchdog=true` til 15 minutter og bevar intern 45-minuttersvagt.
- [x] Bevar active/recent/manifest/concurrency samt alle data- og releasegates.
- [x] Tilføj boundary- og dubletregressioner.
- [x] Luk før-redningsproduktion, source/RDKS/håndbog/releasegate og geodatabevis.
- [x] Genmål warmup til 5–12/48 timer, forkast tidligere kl. 15-ETA og bind ny tidligste READY til en ubrudt serie frem mod 2026-08-31 cirka kl. 06 dansk tid.
- [x] Luk PR #222/exact-head `33247789054`, merge `792648c3`, post-merge-produktion `33247839121` og automatisk vagt `33248692042`, som bestilte `33248699516` efter verificeret stilhed.

Se DEC-0108. Ingen model-, score-, input-, state-, recovery-, geometri- eller punktændring.

## P0 4.0.309 – ekstern vagthund mod total schedule-stilhed

- [x] Afgræns schedule-leveringsfejlen fra workflowkonfiguration, runnerkø og selve vejrbygningen.
- [x] Bevar GitHub som normal scheduler og vælg ét eksternt, payloadfrit keepalivekald ved `04,19,34,49` UTC.
- [x] Lås kaldet til eksplicit `external_watchdog=true` og DEC-0085's 45-minutters dual staleness.
- [x] Bestå lokale kontrakter, sourcegate, PR #221 exact-head og frisk post-merge-produktion `33244062982`.
- [x] Opret/test ét cron-job og bevis manuel samt to automatiske no-op-kald.
- [x] Genmål Candidate G-warmup; komplet aktuelt vejr skjuler ikke, at 673 dele kun har 5–12/48 timer.

Se DEC-0107. Ingen model-, score-, input-, state-, recovery-, geometri- eller punktændring.

## P1 4.0.296-kildekandidat – offentlig opstartsydelse

- [x] Produktionsverificér 4.0.295's lazy detaljer, top-5-indeks og dataset+SHA-cache gennem PR #198 og grøn produktion.
- [x] Afgræns det resterende kolde problem til den 3,56 MB READY-recovery-startfil; frikend detaljehentning og assistent.
- [x] Indfør minimal aktuel scoreprojektion i både primær og recovery med uændret detaljepakke/hash og score-/rangeringsparitet.
- [x] Bestå fuld lokal sourcegate/releasegate for 4.0.296.
- [ ] Bestå PR exact-head, frisk produktion og offentlig cold/warm ydelsesverifikation af 4.0.296.
- [ ] Lad den nye private Sibirien-punktrevision modne naturligt; aktivér kun efter et senere særskilt ejer-go.

Se DEC-0092/0093. Ingen score-, vejr-, bruger-, privatlivs- eller geokontrakt ændres.

## P1 produktionsverificeret 4.0.294 – bred read-only Spørg RavRadar-viden

- [x] Lås og implementér 17 lokale grundbogsemner på DA/DE/EN.
- [x] Lås 51 lokale evals og 66 samlede providercases med 23 offentlige evidens-ID'er.
- [x] Bevar deterministic Candidate G for sted/tid/score samt Edge-/privacy-/kvote-/rollbackgrænser.
- [x] Bestå fuld lokal sourcegate og releasegate.
- [x] Bestå PR #194/#195 exact-head, frisk produktion og offentlig tre-sprogs kontrol inklusive naturlige oprindelsesformuleringer.
- [x] Rotér Cloudflare quick-start-tokenet i et ejeraktivt vindue og genverificér Edge før/efter tilbagekaldelse uden credentialoutput.

Begge assistentveje er read-only og isoleret fra prognoser, RavScore og alle bruger-/geodata. Se DEC-0091.

## P1 produktionsverificeret – sikker punktflytning i 4.0.292

- [x] Adskil aktiv override og staged kandidat i admin-/buildkontrakten.
- [x] Opbyg privat DMI- og Candidate G-state uden offentlig datalæk.
- [x] Kræv READY, særskilt ejeraktivering, eksakte gates og central version-CAS.
- [x] Bevar rollback/recovery og hel fallback ved højst seks lokale warmups.
- [x] Luk gennem PR #192 exact-head `33127353135`, merge `d22d0867`, frisk produktion `33127437790` og offentlig saniteret status uden at flytte et konkret punkt.

Se DEC-0090.

## P1 produktionsverificeret – mobil retur-selvrecovery i 4.0.292

- [x] Installer bootstrap- og `pageshow`-værn for Safari/WebKit page cache.
- [x] Genindlæs ufuldstændig state og genoptegn ellers kort, rangliste, valgt zone og femdøgnsvisning idempotent.
- [x] Lås forløbet med målrettet livscyklustest og eksisterende mobil-/prognosekontrakter.
- [x] Bestå exact-head, produktion og offentlig 390 × 844-retur med synligt kort, fem aktuelle områder, fem prognoserækker og nul browserfejl.
- [ ] Indhent supplerende fysisk iPhone-efterkontrol fra ejeren.

Se DEC-0089.
## P1 produktionsverificeret – offentlig gratis Spørg RavRadar i 4.0.291

- [x] Ejer-go, aktuel Workers Free-kontrol og DA/DE/EN-kvotetekst.
- [x] Offentligt aktiveringsflag med sikker `false`-rollback og målrettet remote-/`429`-fallbacktest.
- [x] Deploy versionsstyret GPT-OSS Edge med server-only secrets og bestå live CORS/domæne/rate-limit/fallback.
- [x] Bestå exact-head, produktion og offentlig DA/DE/EN-browserkontrol.

Se DEC-0088.

## P1-rækkefølge efter produktionsverificeret 4.0.292 – afsluttet i 4.0.293/294

1. [x] Udvid den lokale Spørg RavRadar til en væsentligt bredere, versionsbundet DA/DE/EN-vidensbase med aktuelle valgte-zone-data og fortsat fast emneafvisning.
2. [x] Bevar begge assistentveje som read-only; ingen assistentkode må ændre prognoser, RavScore, vejr, sortering, konto-/turdata, geometri eller land-/vandpunkter.
3. [ ] Følg sideløbende den naturlige Candidate G-modning og indhent ejerens fysiske iPhone-efterkontrol; ingen af delene må fremtvinges med kunstig historik eller en punktflytning.

Det brede lokale vidensscope er produktionsverificeret med 17 konkrete intents, 51 lokale evals og de tre ekstra 4.0.294-formuleringsregressioner.

## P1 afsluttet – produktionsverificeret 4.0.290 DA/DE/EN og deaktiveret Workers AI

- [x] Implementér første offentlige DA/DE/EN-scope centralt med dansk standard/fallback, lokalt husket sprog og stabile parameteriserede nøgler.
- [x] Bevar admin/ekspert/internt på dansk og udvid efter ejer-go oversættelsen til **Om RavRadar** og hele grundbogen.
- [x] Afvis kendte uvedkommende/sikkerhedsfølsomme spørgsmål før provider; behold bedste sted/tid/score lokalt i Candidate G.
- [x] Gør modelrunneren provider-neutral og markér Gemini 27/27 som intern reference efter aktuelle EØS-vilkår.
- [x] Kør samme 27 cases mod GLM-4.7-Flash, Gemma 4 26B og GPT-OSS 20B på bekræftet Workers Free; vælg GPT-OSS 20B på smoke 1/1, mål-gate 4/4 og 25/26 evaluerbare fuldtests.
- [x] Byg og live-smoke-test hærdet Edge med server-secrets efter ejer-go. Pages-aktivering og slutkontrol er produktionsverificeret i 4.0.291.
- [x] Bestå release-, exact-head-, produktions- og offentlig DA/DE/EN-browserkontrol.

Se DEC-0086/0087.

## P0 afsluttet – 4.0.288 automatisk Candidate G-genopretning

- [x] Bevar det seneste komplette, auditerede datasæt ved fejlhentning og bind startup/detaljer/ranglister til samme dataset.
- [x] Begræns tydeligt markeret nødvisning til 48 timer og stop derefter fail-safe.
- [x] Genstart fra verificeret suffix efter huller over tre timer uden interpolation eller backfill.
- [x] Lås engangsrecoveryen til det eksakte 09-checkpoint og kopier kun kompakt state.
- [x] Bestå målrettede kode- og artifactsimulationer.
- [x] Bevis den korrigerede produktionsrækkefølge gennem PR #178 og ret kun warmup-audittens modstridende råscorekrav; eksakt 3635-artifact og fallbackpublicering er grønne.
- [x] Bestå version/RDKS, PR #179 exact-head `33069307854`, merge `653a9811`, fuld frisk produktion `33069384084`, Pages og offentlig funktionskontrol uden browserfejl.

P1-oversættelse og Spørg RavRadar kan genoptages efter konkret ejerscope. Se DEC-0084.

## Historisk afsluttet P0 – 4.0.287 EU-turlager og oprindelig Supabase-rollback

- [x] Vælg endelig gratis normalarkitektur: Supabase Auth/Edge og ti EU-låste Cloudflare D1-shards.
- [x] Hold rå identitet og præcis lokation ude af Cloudflare gennem HMAC-pseudonymisering og streng feltallowlist.
- [x] Implementér privat signerede writes/reads, idempotens, privat turlog og ejerens slettevej.
- [x] Implementér 4.0.287's migrations-cutover før/efter, daglig kapacitetskontrol og daværende eksplicitte Supabase-rollback; rollbackdelen afløses af den aktive 4.0.311-kandidat.
- [x] Bevar eksisterende Supabase-rækker som migrationskilde/rollback uden normal dual-write.
- [x] Opret dedikeret Cloudflare-konto, mindst-mulige deploy-/audit-tokens og krypterede GitHub-secrets gennem godkendt brugerkanal; verificér DPA/self-serve-kontrakt uden at vise værdier.
- [x] Bestå 4.0.287-infrastrukturens exact-head/merge og deployér Edge grønt i den daværende Supabase-rollback.
- [x] Bestå kandidatens exact-head/merge, opret/skema-verificér alle ti EU-shards og deploy Worker; stop sikkert før migration/Edge på første health-udbredelsesforsinkelse.
- [x] Bestå bounded-retry-opfølgningens exact-head `33019805663`, merge PR #166 som `2d12c085`, privat Worker-grænse, idempotent 4/4-migration og D1-aktivering i `33019868542`.
- [x] Bestå fuld frisk produktion `33019856228`, Pages-job `98351206091`, offentlig 210/673/420/2.100-verifikation og read-only kapacitetsmonitor `33021364240`.
- [x] Sæt begge mindst-mulige Cloudflare-tokens til **No expiration**, udskift Supabase-PAT'et til udløb 25. august 2027 og bestå ende-til-ende-D1-verifikation `33024408547` før tilbagekaldelse af gamle PAT'er.
- [x] Genbekræft auditadgangen payloadfrit i `33024621109` og verificér det daværende secret-frie GitHub-issue/mailvarsel.
- [x] Bestå PR #169/exact-head `33025102301`, merge `1e402834`, manuel main-prøve `33025289153`, frisk produktion `33025210517`/Pages `98367528389` og offentlig fuld browseraudit.
- [x] Erstat efter ejerens driftspræcisering kalenderrotationen med behovsstyret Supabase-PAT: normal drift må køre uden, udløbsvarslet pensioneres, og et kortlivet PAT oprettes kun til en konkret verificeret managementændring og tilbagekaldes bagefter.
- [ ] Følg Supabase-banneret frem mod 9. september 2026; turlagerflytningen fjerner ikke Auth-/Edge-egress.

Se DEC-0082. Candidate G, score, vejr, geometri og land-/vandpunkter ændres ikke.

## P1 aktiv – intern, score-neutral Ravudsigten-sammenligning

- [x] Opret intern analysejournal og registrér første tidsstemplede snapshot med aktuelle top-fem, alle synlige ikke-røde femdøgnssignaler, RavRadar-match og komponentforklaringer.
- [x] Bestå efter stoppet `33029447510` PR #172 exact-head `33030112665`, merge `7a234653`, fuld produktion `33030166104`/Pages `98382359708` og offentlig kontrol; kun den eksakte interne analysefil er undtaget, og dens sikkerhedsmarkører er obligatoriske.
- [ ] Fortsæt skånsom indsamling af offentligt synlige resultater fra Ravudsigten og RavRadar over flere sammenlignelige vejrsituationer.
- [ ] Sammenlign sted, timing, varighed og styrke og behandl udledte regler som observerbare hypoteser, ikke som kendt intern logik.
- [ ] Brug uafhængige tur-/fundobservationer som mulig fasit, når kvalitet og samtykke tillader det; modellernes indbyrdes enighed er ikke i sig selv validering.
- [ ] Omgå ingen adgang, hent ingen privat kode, og bevar `scoreImpact=false`/`publicRuntime=false`.
- [ ] Hold opgaven udelukkende i RDKS, roadmap og changelog; ingen app-, offentlig håndbogs-, ekspert-, admin- eller public-runtime-visning.

Første snapshot og metodejournal: `docs/rdks/30_FEATURES/INTERNAL-RAVRADAR-RAVUDSIGTEN-ANALYSE.md`.

## P1 afsluttet – gratis og domæneafgrænset Spørg RavRadar

- [x] Auditér den lokale og historiske Edge-assistent mod Candidate G, offentlig kontekst og sikkerhedsgrænser.
- [x] Lås Free Tier uden billing/betalt overflow samt lokal fallback ved kvote- og providerfejl.
- [x] Opret versionsbundet offentlig viden og 45 balancerede DA/DE/EN-evalcases.
- [x] Gør normal self-test helt offline og live-eval dobbelt opt-in med lokal secret plus manuel Free Tier-bekræftelse.
- [x] Kør samme kontrollerede Free Tier-eval mod `gemini-3.7-flash` og `gemini-3.5-flash-lite`; genkontrollér stadig den konkrete projektkvote før release.
- [x] Bevar Flash-Lite/low som historisk reference på nul hårde fejl, 27/27 remote-kandidatcases, DA/DE/EN 9/9 og median/p95 1.329/1.896 ms; 3.7 blev afvist efter fem timeouts.
- [x] Forkast gratis Gemini som offentlig EØS-produktionskandidat efter de aktuelle vilkår; en hjemmeside er også et API Client, og EØS-brug kræver Paid Service.
- [x] Tilføj Workers Free-kandidater og samme kontrakt/målinger til den provider-neutrale runner.
- [x] Vælg GPT-OSS 20B efter liveeval, implementér og deploy struktureret Edge-outputkontrol, tre rate limits, timeout og sikker lokal rollback. Offentlig Pages-aktivering er produktionsverificeret i 4.0.291.

Se DEC-0083/0087/0088. Offentlig 4.0.291 bruger GPT-OSS gennem Edge med lokal fallback; score, vejr, konto/ture, geometri, land-/vandpunkter og private data er uændrede.

## P0 afsluttet – 4.0.286 rullende Candidate G-kontinuitet

- [x] Afvis 4.0.285 funktionelt efter ellers grøn exact-head, merge og produktion; dokumentér 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- [x] Bevar den virkelige kompakte forgænger til næste rullende reference uden replay, ny måling eller ekstra dækning.
- [x] Lås to efterfølgende faseskudte referencer med målrettede tests.
- [x] Flyt audit af den faktiske public runtime ind før deploy og bevis stop på 4.0.285-masseregressionen.
- [x] Simulér ny recovery mod de virkelige offentlige artifacts til 672/673 `READY`.
- [x] Synkronisér 4.0.286-version, RDKS, håndbøger og changelog med kun topversionsændring i beskyttet geodata.
- [x] Brug den dataminimerede #3620-gate til at afgrænse 1.328/1.344 modes til de otte gyldige `NATIVE_CADENCE_HOLD`-dele.
- [x] Ret den ældre Phase D-forbetingelse med en snæver `READY`/tre-timers/manglende-vektor-kontrakt og bevis 16/16 faktisk replay.
- [x] Bestå PR #159/exact-head `33001615758`, merge `c0f42b33`, fuld frisk produktion `33001743118` og positiv offentlig kontrol med 210/210 aktive zoner og befolket rangliste.

## Afsluttet men funktionelt afvist – 4.0.285 Candidate G-cadencefase

- [x] Bevis artifact-for-artifact, at første 4.0.284-build ændrede 672/673 `READY` til 8/673 og 209/210 aktive zoner til 0/210.
- [x] Ret kun 48-timersgrænsens cadencefase inden for den eksisterende tretimersgrænse.
- [x] Bevar fail-closed for et ægte kort vindue og alle større/interne datagab.
- [x] Hash-lås sidste sunde offentlige compact state og gendan kun afledte transportbeviser.
- [x] Bevis 672/673 `READY` i en lokal simulation med de virkelige offentlige artifacts.
- [x] Opdatér RDKS, håndbøger, changelog og 4.0.285-version uden geodataændring.
- [x] Bestå exact-head `32993055324`, merge `de6b7844` og fuld frisk produktion `32993270783`.
- [x] Kør positiv offentlig kontrol; 4.0.285 blev korrekt afvist og erstattes af 4.0.286.

Se DEC-0081. Ingen scorekurve, zone, geometri eller land-/vandpunkt ændres.

## Udgivet – 4.0.284 drifts- og sikkerhedshærdning

- [x] CSP, eksterne scripts og sikker allowlist-visning af centralt HTML.
- [x] Smallere ekspertprofil-/rettighedsscope gennem RLS, RPC og UI.
- [x] Server-side observation-gateway med dataminimering, brugerbinding, idempotens og rate limit.
- [x] Fælles Edge-gateway med origin-allowlist, CORS, timeout og sikre fejl.
- [x] Live smallere RLS og begge Edge-funktioner deployet/verificeret uden Windows-sikkerhedsomgåelse eller private testdata.
- [x] Lokal assistent er standard; fjernassistentflaget er lukket, indtil en separat secret-/omkostningsbeslutning er positivt verificeret.
- [x] Versions-/RDKS-/håndbogs-/changeloglukning og særskilt geodatadiff.
- [x] Lokal source-/releasegate og målrettet browserkontrol uden fjernassistentskald.
- [x] Exact-head `32986025916`, PR #155, merge `a92e2704`, fuld pushproduktion `32987875007` og offentlig sikkerheds-/strukturkontrol.
- [x] Candidate G's rullende cadencefase fra den funktionelle efterkontrol er produktionsverificeret lukket i P0 4.0.286 ovenfor.
- [ ] Følg Supabase-egress og varslet om mulig begrænsning fra 9. september 2026 uden at lempe sikkerhedskrav.

Se DEC-0080. Candidate G, score, vejr, zoner, geometri og land-/vandpunkter er uden for ændringen.

## Produktionsverificeret – 4.0.283 bevarer moderzone i Candidate G-slutkontrollen

- [x] Bevis, at produktionens livepilot og Candidate G-state havde 673/673 scoreklare kyststrækninger.
- [x] Afgræns 665/673 til tab af moderzone i den afsluttende kontrol.
- [x] Bevar den autoritative zone-nøgle ved udfladning af kystdele.
- [x] Lås koblingen med en målrettet regression uden indlejret `zoneId`.
- [x] Dokumentér DEC-0079 og kun topversionsændring i beskyttet geodata.
- [x] Bestå PR #153/exact-head `32914734446`, merge som `1caad399`, fuld produktion `32914887586` og offentlig 673-kystdelskontrol.

Offentlig 4.0.283 viser 210 zoner og 673/673 kyststrækninger på Candidate G 20/50/30 uden rollback eller legacyfallback. 657 kyststrækninger har komplet transporthukommelse; 16 er ærligt lokalt utilgængelige med 30–48 timers naturlig historik og nul reset. De fem berørte moderzoner viser derfor ingen opdigtet score. Den falske **Mangler/Ukendt**-fejl er lukket.

Dette ændrer ikke strømkrav, Candidate G 20/50/30, scorekurver, zoner, geometri eller land-/vandpunkter.

## Produktionsverificeret – 4.0.282 lukker sidste falske Mangler/Ukendt ved native vinduesskift

- [x] Afgræns stoppet til de otte godkendte regionalproxyers eksakte måling umiddelbart før beregningsvinduet.
- [x] Genbrug kun den verificerede kildeprøve i højst tre timer og kun som transportreference.
- [x] Reducér den til tid og kystrelativ styrke før Candidate G-state; ingen rå vektorer, koordinater eller punkt-id'er.
- [x] Bevar forbuddet mod interpolation, kunstige timer, ny pil og mobilisering.
- [x] Tilføj målrettede regressioner og dokumentér DEC-0078.
- [x] Bestå exact-head, merge og 4.0.283's fulde produktion/offentlige kontrol af alle 673 kyststrækninger.

Dette ændrer ikke 20/50/30, scorekurver, 48-timersregler, zoner, geometri eller land-/vandpunkter.

## Produktionsverificeret – 4.0.281 lukker falske Mangler/Ukendt i Candidate G-visningen

- [x] Kortlæg Candidate G's eksisterende diagnosefelter og bevis, at scoremotoren allerede beregner grundlaget.
- [x] Bevar hele den dataminimerede Candidate G-forklaring gennem både kystdel og zoneaggregation.
- [x] Erstat legacyfelterne i den tekniske visning med Candidate G's aktuelle status, 48-timershukommelse, fase, udgående forløb/tab, transport, levering og rav i bevægelse.
- [x] Gør native tretimers-mellemtimer ærlige uden opdigtet måling, retning eller klassifikation.
- [x] Tilføj målrettede tests for projektion, UI, zoneaggregation og produktionspipeline.
- [x] Dokumentér DEC-0077 og opdatér projektets hukommelse og håndbøger.
- [x] Versionér til 4.0.281 og bevis med særskilt diff, at de to beskyttede geodatafiler kun ændrer topversionsfeltet.
- [x] Bestå PR #150/exact-head, merge som `1308a07d`, kør fuld produktion `32899040618` og kontrollér den offentlige 4.0.281-runtime.
- [x] Bevis Candidate G-diagnostik i 1.314 aktive modeevalueringer samt ærlig lokal utilgængelighed for de 16 kyststrækninger, hvis naturlige historik endnu ikke er moden.
- [x] Bestå den fulde browserkontrol på 420 aktuelle visninger, 2.100 prognosevisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl.

Dette lukker roadmap-punktet om falsk **Mangler/Ukendt** på alle aktive kyststrækninger. De 16 umodne kyststrækninger viser i stedet ærlig lokal utilgængelighed og bruger ikke den gamle scoremodel. Candidate G 20/50/30 og alle scorekurver er urørte.

## Produktionsverificeret – 4.0.280 korrekt orienteret Om RavRadar-billede

- [x] Bevar originalen urørt og indarbejd korrekt portrætretning i de leverede billedpixels.
- [x] Lever tre komprimerede størrelser og vælg dem responsivt.
- [x] Vis billedet ved siden af teksten på pc og over teksten på mobil uden vandret rulning.
- [x] Opdatér appskal og målrettet kontrakttest.
- [x] Udfør målrettet visuel pc-/mobilkontrol.
- [x] Sæt 4.0.280 og bevis, at geodatafilerne kun ændrer versionsfelt.
- [x] Bestå exact-head og merge PR #149 som `42b7058f`; ejeren har efter udgivelsen kontrolleret og godkendt både mobil- og pc-visningen.

Ingen score, vejrdata, zone, geometri, land-/vandpunkt, admin-data eller brugerdata ændres.

## Produktionsverificeret – 4.0.279 offentlig Om RavRadar-side

- [x] Placér **Om RavRadar** i topmenuen ved konto, **Start ravtur** og **Spørg RavRadar**.
- [x] Præsentér Jakob Jørgensen, projektets formål, frivillige arbejde, kontakt og fraværet af fundgaranti.
- [x] Forklar forskellen mellem en kyststræknings aktuelle RavScore og en landsdels grundlæggende ravpotentiale.
- [x] Forklar, at landsdækkende regler kræver forståelige kompromiser, uden at skjule mulige fejl.
- [x] Saml frivillighed og støtte i ét afsnit med MobilePay Box `4214MX`, synligt link og klikbar QR-kode.
- [x] Optimér begge ejerbilleder som responsive billedvarianter og lav særskilt pc- og mobillayout uden vandret rulning.
- [x] Tilføj siden og aktiverne til den versionsstyrede offline-appskal.
- [x] Lås indhold, navigation, betalingslink, billeder og responsive brudpunkter med en målrettet kontrakttest.
- [x] Sæt version 4.0.279; særskilt diff bekræfter, at de to beskyttede geodatafiler kun ændrer topversionsfelt 4.0.278 → 4.0.279.
- [x] Bestå PR #148, merge `12db45a8`, fuld produktion `32881278351` og offentlig kontrol. Orienteringsfejlen i familiebilledet lukkes særskilt i 4.0.280.

Arbejdet er rent præsentationsmæssigt. Candidate G, RavScore, vejrruntime, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Ejeren har samtidig givet stående godkendelse til fremtidige rene versionsfeltsynkroniseringer, når særskilt diffkontrol beviser, at intet andet geodata ændres. Se DEC-0076.

## P0 – 4.0.278 retire misvisende Regelværksted og ret hele ekspert-håndbogen

- [x] Gennemgå Regelværkstedets faktiske kodevej mod Candidate G's state, lokale datagater og invariants.
- [x] Beslut, at ekspertinput fortsat indsendes gennem håndbogsreview, men at ingen adminregel må ændre offentlig score direkte.
- [x] Fjern Regelværksted, Vidensbase, regelrettigheder og offentlig regelpublicering fra den aktive kæde.
- [x] Bevar de eksisterende regelkladder og historikdokumenter urørt som historisk materiale.
- [x] Gennemgå hele ekspert-håndbogen og ret aktive beskrivelser af scoreprofil, historik, datagater, fallback og scoreændringsproces.
- [x] Dokumentér DEC-0075 og opdatér systemspecifikation, krav, issues, roadmap og changelog.
- [x] Udeluk de pensionerede browserfiler og regelfiler fra Pages, mens forskningskilderne bevares internt.
- [x] Synkronisér installationskopien, kør målrettede tests og RDKS-validering.
- [x] Løft releaseversionen til 4.0.278 med kun versionsfeltet ændret i de to beskyttede geodatafiler.
- [x] Bestå PR #145, merge som `11478de3` og udgiv gennem grøn produktion `32840785390`.
- [x] Afgræns den offentlige falske 0/210-status til et manglende succesflag, ikke til scoreformel, modevalg eller tabt Candidate G-state.
- [x] Ret current-readiness, så senere prognosehuller ikke gør den aktuelle landsdækning falsk negativ.
- [x] Bevis og test, at både aktuelle bedste områder og 5-dages prognosen bruger særskilte strand-/wadersværdier.
- [x] Bestå opfølgningens exact-head `32844951668`, merge PR #146 som `8facd2d8`, fuld produktion `32845130587` og offentlig statuskontrol.

Live er 205/210 zoner aktive; fem er korrekt lokalt utilgængelige. 657/673 kyststrækninger er READY, og alle 673 fortsættelser er accepteret uden reset. Strand og waders er særskilt verificeret i aktuel liste og alle fem prognosedage. De offentlige versionsfelter er fortsat 4.0.278. Rettelsen ændrer ikke selve Candidate G-scoren eller geodata.

## P0 – 4.0.277 luk native mellemtimer årsagstro

- [x] Bevis, at 666/673-stoppet skyldes en fremtidig regionalproxyprøve i readiness og falske null-mellemtimer – ikke tabt state, ændrede punkter eller scorevægte.
- [x] Gør aktuel reference årsagstro og tillad kun de otte ejerallowlistede `dkss_lf`-proxyer at fastholde den seneste afledte transporttilstand i højst tre timer.
- [x] Forbyd bevægelse, evidens, U/V, hastighed, retning og pil under fastholdelsen; næste ægte prøve bruger den faktiske tidsafstand.
- [x] Bevar fail-closed efter tre timer og ved enhver ændret punkt-/kildekontekst.
- [x] Bestå målrettede lokale regressioner og dokumentér DEC-0074 uden score-, geometri- eller adminændring.
- [x] Bestå exact-head `32816129342` på `35c8b7fb` og merge PR #140 som `d3b4542f`.
- [x] Afgræns første produktionsstop `32816237198` til en forældet statisk test, efter at strømhistorik, vejr og offentlig runtime var bygget grønt.
- [x] Ret testkontrakten til den faktiske 673-dækning uden ændring af score, state, vejr eller geodata.
- [x] Bestå PR #141 exact-head `32817501003`, merge `81e9b891` og frisk produktion `32817626537` med fuld validering, releasegate, artifact og Pages.
- [x] Kontrollér offentligt Candidate G-only med 673/673 accepterede states, nul resets og 12–45 timers naturlig historik.

Produktionslukningen er grøn. Den eksisterende overvågning følger kun, at 0/210 aktive zoner begynder at åbne lokalt, når de virkelige kæder passerer 48 timer. Denne rettelse kræver ikke en ny 48-timers realtidstest og opbygger ikke kunstig historik.

## P0 – 4.0.276 bevar strømhistorik lokalt pr. kystpunkt

- [x] Bevis dataminimeret, at den kompakte Candidate G-state fortsatte til cirka 36 timer og ikke blev nulstillet ved Candidate G-only-udgivelsen.
- [x] Afvis landsdækkende genbrug af den ældre brede cache, fordi kun 43 dele havde sikker kontinuitet til målreferencen, mens 621 var ufuldstændige og otte manglede.
- [x] Ret den private Copernicus-cache, så skiftende DMI-huller eller én punktflytning ikke ugyldiggør historikken for uændrede kystpunkter.
- [x] Genopbyg hver bevaret times bevis fra de eksakte tilbageværende punktidentiteter og afvis dubletter eller mismatch fail-closed.
- [x] Bevar Candidate G 20/50/30 som eneste scoremodel; opfind ingen timer og ændr ingen geometri eller land-/vandpunkter.
- [x] Bestå de målrettede regressioner for punktflytning, søsterpunktsbevaring, retention, cache og native tretimerskadence.
- [x] Bestå exact-head `32787344926`, merge `72913723`, fuld produktion `32787715986`, to naturlige produktioner og dataminimeret livekontrol med 673/673 accepterede states og nul resets.

Den tekniske lukning er grøn. Seneste kontrol viser 6–39 timers lokal state: det flyttede punkt har den korte kæde, mens uændrede punkter har bevaret den længere historik. Det eksisterende før-lanceringsroadmap fortsætter. Zoner aktiveres enkeltvis, når deres egne virkelige 48 timer er komplette; dette er drift, ikke en ny 48-timers udviklingstest.

## P0 – 4.0.275 luk Candidate G-only-produktionen med synkron håndbogskilde

- [x] Gør Candidate G 20/50/30 til eneste offentlige scoremodel.
- [x] Fjern automatisk og manuel offentlig rollback til 25/40/35.
- [x] Luk datahuller lokalt pr. zone, søgemåde og tid uden opdigtede erstatningsscorer.
- [x] Udelad kun de berørte scorer fra aktuelle og femdøgns-rangeringer.
- [x] Vis samlet zonestatus og lokale årsager på adminforsiden.
- [x] Opdatér målrettede tests og bindende dokumentation.
- [x] Bestå PR #134 exact-head og merge den første Candidate G-only-implementering.
- [x] Afgræns det sikre produktionsstop til central legacykonfiguration, der overskrev den nye kontrakt under hydrering.
- [x] Gør Candidate G-only-kontrakten holdbar gennem central hydrering og persistence; en legacyprofil må ikke vinde på versionsnummer.
- [x] Fjern de sidste offentlige legacyberegningsveje fra forside, detaljepanel og Rav-assistent.
- [x] Bestå 4.0.274 exact-head og merge PR #135 som `3a96c28d`.
- [x] Bevis, at central Candidate G-only-hydrering består; afgræns det næste sikre produktionsstop til drift mellem repositoryets håndbog og installationskopi.
- [x] Synkronisér installationskopien og flyt den eksisterende strenge identitetskontrol frem i exact-head-kildegaten uden at fjerne den fulde produktionskontrol.
- [x] Bestå 4.0.275 exact-head `32778118765`, merge som `59ea4546` og frisk fuld 210/673-produktion `32778269487`.
- [x] Kontrollér live `rr-20260824211701-210`: Candidate G er eneste profil; rollback er `null`; legacyfallback er forbudt; lokale mangler giver ingen erstatningsscore.

DEC-0072 erstatter roadmapets tidligere opgave om at vente på, at den globale 25/40/35-reserve naturligt skifter tilbage. Den gamle model er ikke længere en offentlig driftsvej. Ved slutkontrollen var 0/210 zoner aktive, fordi den nødvendige sammenhængende 48-timers strømhistorik endnu ikke var komplet; senere audit dokumenterede cirka 36 timers fortsat state. Admin viser alle berørte zone-/søgemådepar og årsagen. Zoner bliver aktive lokalt, når deres eget grundlag er komplet. 4.0.273 og 4.0.274 blev ikke deployet; de sikre stop er produktionsbevis, ikke offentlige regressioner.

## Historisk P0 – Candidate G-tilstand efter fejlslagen hydrering i 4.0.272

- [x] Afgræns scorekollapset til en ikke-fatal timeout ved atomisk hentning af det seneste offentlige stategrundlag.
- [x] Bevis dataminimeret, at den sidste grønne produktion havde 673/673 videreførte Candidate G-tilstande, mens den fejlramte produktion nulstillede 673/673 med `NO_PREVIOUS_STATE`.
- [x] Gør atomisk manifest-/conditions-hydrering fatal ved fejl eller mismatch.
- [x] Afvis global `NO_PREVIOUS_STATE` som lovlig aktiv Candidate G-opvarmning; tillad kun lille lokal kontekstreset efter bevidst punktændring.
- [x] Bind en engangs, state-only recovery til den eksakte sidste grønne Actions-kørsel og den dokumenterede forgiftede fortsættelseslinje; gør den straks inaktiv, når historik fra før nulstillingen igen findes.
- [x] Bevar scoreformel, Candidate G 20/50/30, vejr, zoner, geometri og land-/vandpunkter uændret; kun geodatafilernes versionsfelt følger releasen til 4.0.272.
- [x] Bestå målrettede regressioner, RDKS og PR #131-kildegate på eksakt head; bevar derefter den ældre fulde produktionsgates hydrator-indgang i en afgrænset opfølgning.
- [x] Bestå frisk central 210/673-produktion `32761751284`, releasegate, Pages-deploy og offentlig score-/browserkontrol af 4.0.272.
- [x] Luk engangsrecoveryen som logisk inaktiv efter genindsat før-historik.
- [x] De otte separate aktuelle missing-evidence-huller håndteres fra 4.0.273 lokalt; de kan ikke længere skifte hele landet til 25/40/35.

### Separat lokalt datapunkt efter ejerens punktflytning

- [x] Afgræns én manglende kystdel til en ufuldstændig ny offentlig vejrrække efter punktflytningen; det er ikke årsagen til det tidligere landsdækkende scorekollaps.
- [x] Bevar forbuddet mod at låne strøm fra moderzone eller nabo og behold 673/673-gaten.
- [x] Lad de normale private cache-/friskdataforløb genoprette 673/673 uden parent-/nabofallback; den ændrede del fortsætter lovligt med lokal opvarmning.

Produktion `32759180937` viste, at punktdelen igen var til stede i 673-bestanden; kørslen stoppede først senere på hydratorens kompatibilitetskontrol. Produktion `32761751284` lukkede derefter hele 210/673-kæden. Punktforholdet var ikke årsagen til det landsdækkende scorekollaps.

## Afsluttet – 4.0.271 offentlig grundbog

- [x] Ret Grundbog i ravjagt samlet efter ejerens feltgennemgang.
- [x] Synkronisér eksperthåndbog, RDKS, forskningsnotat og changelog.
- [x] Udvid kun den målrettede grundbogstest.
- [x] Bestå PR #128 exact-head `32742727246` og merge som `a723ae8c`.
- [x] Lad den første produktion `32743307402` stoppe sikkert før deploy ved den manglende læsehjælp.
- [x] Bestå hotfix-PR #129 exact-head `32745213320`, merge som `499861e8`, og udgiv gennem grøn produktion `32745389504`.
- [x] Kontrollér den offentlige version 4.0.271 og de syv konkrete grundbogsrettelser målrettet.

## P0 – 4.0.270 før-lancering, ekspert og admin

- [x] Kontrollér nye naturlige vejrdata, reelle tidsintervaller, fallback og vandstandsdiagnostik.
- [x] Kontrollér Supabase Free-planens aktuelle forbrug og den tidligere egress-overskridelse.
- [x] Gennemgå admin, ekspertrettigheder og den centralt gemte eksperthåndbog.
- [x] Ret den falske statusfejl for det femte centrale admindokument.
- [x] Bevar lotterikorrektionen i **Bedste områder** og **5-dages RavRadar**, men vis den samme områdescore, som listerne sorterer efter.
- [x] Gennemgå begge håndbøger for historiske modeltekster, fejl og mangler; ret også kodekapitel, scenarier, hypoteseregister, ekspertarbejdsplan og releasegate, synkronisér installationskopien og beskyt centrale ekspertændringer med trevejsfletning.
- [x] Bestå PR #122 exact-head `32721778498`, merge `abe10127`, og bevis i produktion `32721891349`, at en ukendt første håndbogsafvigelse stopper før deploy.
- [ ] Bestå hotfix-exact-head, merge, frisk produktion og offentlig browserkontrol med hash-verificeret første baseline.
- [ ] Lad den eksterne ekspert gennemgå fagindholdet og behandle reviewkøen; det kan ikke erstattes af en teknisk kontrol.

## P0 – lancering på ravradar.dk

- [ ] Opret og kontrollér DNS, GitHub Pages-custom domain og HTTPS for `ravradar.dk` samt eventuelt `www`.
- [ ] Skift Supabase Site URL og tilladte redirect-adresser samlet til det nye domæne.
- [ ] Prøv et helt nyt magic link samt konto, almindelig tur, efterregistrering og turlog på domænet.
- [ ] Følg egress, DMI-ratebegrænsning, planlagte kørsler og den første offentlige drift.

## Laveste prioritet – gemte områder og varslinger

- [ ] Afvent ejerens beslutning om funktionen overhovedet skal bygges.

## Produktionsverificeret 4.0.269 – aktuelle scoreforklaringer

- [x] Brug aktuelle vind-, bølge-, strøm- og stateværdier i alle tre delscoreforklaringer.
- [x] Forklar mobilisering som bølgevirkning på allerede tilgængeligt rav og let materiale; hold strømtransport særskilt.
- [x] Fjern den misvisende påstand om, at lavt vand i sig selv hjælper indtransport.
- [x] Skjul den umodne Fundprognose og de to tekniske scorefelter uden at slette bagvedliggende data eller logik.
- [x] Fjern det tomme kortvalgsfelt og opdatér kilder/licenser.
- [x] Bevar aktiv Candidate G 20/50/30 og den globale, ikke-blandede reserveprofil.
- [x] Bestå PR #120 exact-head `32703138969` på `37de330c`, merge `d745e0ba` og frisk produktion `32703271897`.
- [x] Kontrollér live `rr-20260824080543-210` med Candidate G 20/50/30 på 210 zoner og 673 kystdele.
- [x] Bestå fuld browserkontrol af 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger med nul fejl.
- [x] Luk 4.0.269 med eksakte beviser i RDKS, roadmap, begge håndbøger og changelog.

## P1 – fortsat læringsgrundlag fra brugerens ture

- [ ] Bevar Fundprognosen skjult, mens indberettede ture samles og kvalitetssorteres.
- [ ] Definér ved et senere ejerbeslutningspunkt, hvad et repræsentativt grundlag af ture med fund og intet fund er, før en procentchance eventuelt genindføres.
- [ ] Brug ikke identitet, efterregistreringer uden sikkert historisk vejr eller andre ikke-kalibrerbare ture direkte til scorejustering.

## Produktionsverificeret 4.0.268 – offentlig grundbog og almindeligt brugersprog

- [x] Gennemgå de centrale offentlige tekster om score, opdatering, kildevalg, login, konto, tur og fejl og erstat interne systemord med almindeligt dansk.
- [x] Byg **Grundbog i ravjagt** som et selvstændigt offentligt modul, hvor ravets egenskaber, havets processer, kysten, felttegn og selve jagten kommer før RavRadar.
- [x] Dæk strand, vandkant, waders, UV, hændelsesforløb, revler, render, langs- og tværtransport samt forskellen mellem mobilisering, transport og opsamling.
- [x] Skeln mellem dokumenteret viden, stærk kystfysisk analogi, praktisk erfaring og åbne spørgsmål; vis kilder i modulet.
- [x] Lås faglig rækkefølge, offentlig ordlyd, aktiv `20/50/30`, waders-kurve, udtransportregel og én samlet sikkerhedsafgrænsning i målrettede tests.
- [x] Kontrollér lokal desktop og mobil ved 390 px uden vandret overløb.
- [x] Bestå PR #116 exact-head `32670857438` og merge `5a2f7796`; første produktion `32670920742` stoppede korrekt før deploy på en ældre test, der stadig krævede den tidligere tekniske rangeringstekst.
- [x] Bevar den nye almindelige forklaring, ret rangeringstestens kontrakt og føj den til `validate:source`, så mismatchet fremover opdages før vejropbygningen.
- [x] Bestå PR #117 exact-head `32671863965`, merge `21acb0a2` og lad produktion `32671924885` bekræfte rangeringstesten; kørselen stoppede fortsat før deploy på en anden gammel ordret stateforklaringstest.
- [x] Ret stateforklaringskontrakten til **De seneste timers betydning**, føj den til `validate:source` og målret hele den resterende testsamling, der læser de ændrede offentlige moduler.
- [x] Bestå 29 direkte UI-/auth-/konto-/assistent-/startup-tests og fjern den historiske 4.0.240-sikkerhedstests modstrid med den gældende 4.0.268-kontrakt.
- [x] Bestå PR #118 exact-head `32672522334` på `8faccce3`, merge `3c22e40b` og frisk 4.0.268-produktion `32672578127`.
- [x] Kontrollér live `rr-20260823230848-210` på 210/673 samt 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden fejl.
- [x] Luk 4.0.268 med eksakte run-id'er i RDKS, roadmap, håndbøger, changelog og permanent handoff.

## Produktionsverificeret 4.0.267 – kontoindberetningens uploadskema

- [x] Find de to POST-only-felter, som manglede i aktiv Supabase: `forecast_target_at` og `report_accuracy`.
- [x] Anvend en databevarende central migration og efterkontrollér begge kolonner.
- [x] Kontrollér den almindelige **Start ravtur → Slut ravtur**-kontrakt særskilt; den bruger ikke de to skemafelter, men ramtes af den fælles `gps=null`-klientfejl før lagring.
- [x] Ret privatlivskontrollen uden at tillade faktiske GPS-, koordinat-, positions-, rute- eller spordata.
- [x] Tilføj versionsstyret migration og regression for hele kontoindberetningens uploadkontrakt.
- [x] Bestå PR #115 exact-head `32664463654`, merge `43ceffc1`, fuld 4.0.267-produktion `32664525128` og én ny ejerindberetning, som blev sendt og synlig i **Mine ture og fund**.

## P0 – luk det virkelige login- og turlogflow i 4.0.266

- [x] Ret Supabases centrale Site URL og tilladte redirect fra localhost til den aktuelle GitHub Pages-origin.
- [x] Installer den manglende `data_quality_flags`-kolonne og private SELECT-policy uden ny tabel, dubletpost eller ændring/sletning af eksisterende ture.
- [x] Verificér den fulde feltkontrakt med HTTP 200 og `limit=0` samt policyen i Supabase-dashboardet.
- [x] Lås migration, grant, almindelig brugerfejl og fravær af dataændrende SQL i målrettede tests.
- [x] Registrér `ravradar.dk` som en samtidig auth-/deployopgave: ny Site URL, tilladt redirect og nyt loginlink på den kanoniske adresse.
- [x] Bestå RDKS/version, PR #113 exact-head `32662085932` og den faktiske 4.0.266-produktionskæde `32662155582`.
- [x] Prøv et nyt magic link og bekræft ren retur til RavRadar samt fejlfri privat læsning i **Mine ture og fund**.
- [x] Genindlæs den oprindelige Chrome-fane. API-loggen viste GET uden POST og afslørede den fælles klientfejl; de tidligere forsøg lå ikke i outboxen.

## Produktionsverificeret 4.0.265 – fleksibel og ærlig indberetning

- [x] Tilføj **Indberet tur eller fund** under kontoen, så en indlogget bruger kan rapportere uden først at have startet en tur i RavRadar.
- [x] Genbrug de samme rapportspørgsmål, den samme validering og den samme eksisterende `observations`-række; ingen ekstra tabel, dubletrække eller separat fundkopi.
- [x] Lad brugeren vælge korrekt startdato, starttid og varighed. Gem den valgte tid, og brug aldrig de aktuelle forhold på indberetningstidspunktet som historisk erstatning.
- [x] Gem en efterregistrering uden sikkert historisk vejr-/scoregrundlag som erfaring med tomme snapshotfelter og `calibration_eligible=false`.
- [x] Tilføj **Afslut uden at indberette**. Efter bekræftelse ryddes den lokale aktive tur uden observationspost eller upload; **Svar senere** bevarer den.
- [x] Genbrug det zoneafhængige valg af kyststrækning, gem begge ID'er og afvis ugyldige kombinationer.
- [x] Lås samme tabel, ingen dubletlagring, brugerens valgte tid, forbuddet mod falsk historisk snapshot, fravalg uden upload, kystdelsfiltrering, privatliv og almindeligt dansk i målrettede kontrakttests.
- [x] Versionsluk 4.0.265 og bestå målrettede tests samt RDKS-/versionskontrol. Første exact-head `32658093582` fandt et efterladt 4.0.264-versionsmærke i profilomskifteren og stoppede før merge; mærket og versionsværktøjet er rettet score-neutralt.
- [x] Bestå PR #111's endelige exact-head `32658661075` og merge den eksakte head som `cb7d2232`.
- [x] Produktionsverificér via `32658724861`, live `rr-20260823184330-210` og en målrettet, ikke-dataskrivende kontrol, at 4.0.265 er udgivet med selvvalgt dato/tid uden forudfyldning og sikkert fravalg. En autentificeret indsendelse forbliver en senere bevidst ejerprøve.

## Aktuel produktleverance – enkelt sprog, komplet tur og privat turlog i 4.0.264

- [x] Erstat den gamle parallelle GPS-tur med den direkte v2-rejse: start, afslut og færdiggør én komplet tur.
- [x] Gennemgå og forenkle de centrale brugerord om RavScore, søgeforhold, transport, rav i bevægelse, turregistrering og login.
- [x] Tilføj **Mine ture og fund** under kontoen som en doven, begrænset læsning af de eksisterende `observations`-rækker; ingen ny Supabase-tabel, række eller kopi.
- [x] Forklar magic link i almindeligt dansk og hydrér brugerens Supabase-id efter callback.
- [x] Lås samme-tabel, RLS, dataminimering, legacyvisning, lokal outbox-deduplikering og den direkte v2-rejse i målrettede tests.
- [x] Versionsløft til 4.0.264, opdatér samlet RDKS/håndbog/changelog og bestå source-/RDKS-/releasekontroller på eksakt geodatadiff.
- [x] Før exact head gennem PR #104 (`32651048627`) og merge som `579bd167`.
- [x] Lad produktion `32651106811` stoppe før release på den forældede feedback-UI-test; opdatér testen til at kræve den nye v2-tur og kør den også i `validate:source`.
- [x] Før turtestrettelsen gennem PR #105/exact-head `32651724416` og merge `7c43146f`; produktion `32651786366` stoppede før deploy på den næste gamle teksttest.
- [x] Ret stjerneforklaringens test og den lokalt fundne gamle mobil-turtest, og kør begge i `validate:source`.
- [x] Før den samlede testrettelse gennem PR #106/exact-head `32652894729`, merge `23fa89ed` og fuld produktion `32652970105`.
- [x] Browserkontrollér live konto-/loginforklaring, direkte tur uden GPS/rute og centrale offentlige forklaringer; korrigér auditens gamle vandstandsetiket og bestå 420/2.100/673 uden fejl.
- [x] Merge auditlabelrettelsen via PR #107/exact-head `32654048944` og bestå fuld produktion `32654119745` på live `rr-20260823171804-210`.
- [ ] Kontrol af rigtig magic-link-mail, autentificeret **Mine ture og fund**, udlogning og en kontoejet tur gennemføres senere interaktivt af ejeren; der sendes ingen mail automatisk.
- [x] Bevis med PR #108/exact-head `32654780774`, merge `98621bf9`, at en ren RDKS-/rodhåndbogsmerge opretter 0 push-produktionskørsler.

## Samme leverances afgrænsede procesrettelse – rodhåndbog i docs-only-skip

- [x] Tilføj kun `HANDBOOK-RAVRADAR.md` til push-workflowets eksakte dokumentations-`paths-ignore`, og opdatér den eksisterende workflowkontrakttest.
- [x] Bestå målrettet workflowtest og PR #104 exact-head. Første produktion stoppede korrekt før release på en særskilt forældet UI-test.
- [x] Bestå den samlede testrettelses exact-head og fuld grøn produktion `32652970105`.
- [x] PR #108/merge `98621bf9` ændrede kun ignorerede dokumentationsfiler og oprettede 0 push-produktionskørsler. Ingen score, data, geometri eller punkter blev ændret.

## Aktuel P0-status – Candidate G-referencegate i 4.0.263

- [x] Før DEC-0061 gennem PR #100/exact-head `32642456123`, merge `586fbd184f68c6445acfb38a39814f6348f14bd0` og fuld produktion `32642532892`.
- [x] Bevis cadence-rettelsen i live: 673/673 states fortsat, nul replaymismatch, 110 positive og 563 fysisk fortsat nul.
- [x] Afgræns 4.0.262's efterfølgende legacyrollback til en for bred gate, som lod et senere prognosegap blokere 673/673 sammenhængende aktuelle referencer.
- [x] Implementér DEC-0062: aktuel fælles reference styrer memory-/warmup-gaten, mens hele prognosens kandidatscorecoverage og fail-closed state bevares.
- [x] Lås aktuel gap-rollback, senere prognosegap og moden aktuel reference i målrettede tests.
- [x] Bestå samlet lokal source-/RDKS-/releasekontrol og eksakt geodatadiff for 4.0.263.
- [x] Bestå PR #101/exact-head `32644701811`, merge `9f5953f6`, frisk produktion `32644772373`, aktiv shadow `32645569741` og browserkontrol for live `rr-20260823142247-210` på 210/673/420/2.100 uden fejl.

## Historisk P0-del – Candidate G-transportcadence i 4.0.262

- [x] Opdag read-only i live `rr-20260823121818-210`, at alle 673 dele har transportpotentiale og transportkomponent 0.
- [x] Afgræns årsagen til tre timers afstand mellem produktionsbeviser mod `maximumGapHours=1`; énprøve-suffixet har nul forløbstid.
- [x] Vælg og implementér DEC-0061: højst tre timers native bevisafstand, integration med faktisk forløbstid og ingen kunstige mellemtimer.
- [x] Bevar fail-closed ved mere end tre timer eller missing, og begræns pre-public warmup til `WINDOW_INCOMPLETE` via global `candidateWarmupEligible`.
- [x] Lås rettelsen i målrettede state-/score-/profil-/shadowtests og genafspil den gamle 673-state dataminimeret.
- [x] Bestå samlet lokal source-/RDKS-/releasekontrol og eksakt diffkontrol.
- [x] Bestå exact-head og frisk fuld produktion; efterauditen fandt DEC-0062's særskilte referencescopefejl, som nu lukkes i 4.0.263.
- [ ] Følg derefter den naturlige memoryopbygning som driftsevidens uden en ny 48-timers realtidsudviklingstest.

**Opdateret:** 2026-08-23
**Statusgrundlag:** 4.0.263 er produktionsverificeret på merge `9f5953f6`, produktion `32644772373`, datasæt `rr-20260823142247-210`, aktiv shadow `32645569741` og grøn browserkontrol. P0 er lukket; naturlig memoryopbygning er driftsevidens, ikke en ny aktiveringsgate.

Dette er den eneste aktive opgaveliste. `IMPLEMENTATION_STATUS.md` og aeldre forsknings-/versionsafsnit bevares som revisionsspor. En tom afkrydsningsboks i historikken er ikke en aktiv opgave, medmindre punktet ogsaa findes her.

## Aktuel 4.0.261-opgave – Candidate G pre-public aktivering

- [x] Registrér ejerens beslutning i DEC-0060: Candidate G skal være gældende nu, og den første ikke-offentlige opvarmningsscore accepteres som foreløbig.
- [x] Aktivér `RESEARCH-3` med `20/50/30` uden ændring af de faglige modelregler.
- [x] Bevar global fail-closed ved manglende Candidate G-projektion og eksakt rollback til `25/40/35`.
- [x] Tilføj det private centrale dokument `ravscore-profile-selection` med sikker engangspromotion og central readback.
- [x] Lås aktiv Candidate G-projektion, ærlig `WINDOW_INCOMPLETE`-status, rollback, dataminimering og automatisk aktiveringsforbud i målrettede tests.
- [x] Bestå samlet lokal kildegate og releasegate for 4.0.261.
- [x] Før exact-head `32636378576` gennem PR #97, merge `0f7a9d5f` og fuld produktion `32636433944` med central profil-readback og live `rr-20260823112726-210`.
- [x] Kør aktiv dataminimeret shadow `32637833674` og fuld livebrowserkontrol på eksakt main: 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger uden fejl.
- [x] Luk auditkontraktfejlen fra shadow `32637022498` via exact-head `32637339636`, PR #98, merge `fd69f8a0`, frisk produktion `32637387600` og grøn shadow `32637833674`.
- [ ] Følg den naturlige memoryopbygning som driftsevidens uden at gøre den til en ny implementerings- eller aktiveringsgate.

## Aktuel workflowkorrektion – samlet CHANGELOG.md

- [x] Bevis rodårsagen til PR #78's uventede produktion: `CHANGELOG-*.md` dækkede versionsfilerne, men ikke den aktuelle samlede `CHANGELOG.md`.
- [x] Tilføj kun den eksakte rod-fil og lås begge changelogmønstre i regressionstesten.
- [x] Bestå exact-head `32600654326` og fuld post-merge-produktion `32600714319` på merge `41f71900`.
- [x] Merge PR #80 som `1565e073` og bevis med 0 workflowkørsler på mergecommitten, at der ikke oprettes en ny push-produktion.

## Aktuelt Candidate G-delmaal – strømstyret transporthukommelse

- [x] Fastlæg strømmen som transportled og bølger som en lille afhængig landingsfaktor.
- [x] Implementér og test ejerens fuldstyrkekurve: 8 points straks-tab pr. effektiv udgående time og nul fra 13 timer.
- [x] Bevar cirka 10 timers indgående opbygning, `20/50/30` og DEC-0054's waders-kontrakt.
- [x] Genafspil den eksisterende private cache uden nye rådata og kør målrettede følsomheder.
- [x] Dokumentér, at strømgrænsen og replayets start-/forældelsesregel har væsentlig betydning og endnu ikke er kalibreret.
- [x] Afslut samlet RDKS-/håndbogskontrol og fuld lokal kildegate inklusive releasegate.
- [x] Før beslutningsgrundlaget gennem exact-head-kørsel `32598284279`, PR #75 og score-neutral merge `4379606e` uden nyt produktionsartifact.
- [x] Undersøg en afgrænset 24–48-timers forældelsesregel og strømgrænse uden offentlig aktivering. Resultat: 12/12 vinduer har kun 24 timers forhistorie, referencegrænsen har ingen fuldstyrkeevalueringer, og replayet kan derfor afgrænse men ikke vælge reglerne.
- [x] Før efterkontrollen gennem exact-head `32599255165`, PR #77/merge `75ed93d6` og fuld produktion `32599309735`; live `rr-20260822212612-210` bevarer 210/673 og offentlig `25/40/35`.
- [x] Tilføj en reproducerbar frigivelsesrevision, der låser 0–13-timerskurven og grænserne for halv styrke, deadband, neutral strøm, forældelsesfølsomhed, missing, bølge-only og waders-stop.
- [x] Erstat shadowvalidatorens historiske waders-/pil-/ekstremgates med de aktuelle Candidate G-aktiveringsblokeringer og lås dem i kildegaten.
- [x] Dokumentér den offentlige forklarings- og rollbackkontrakt uden at aktivere eller ændre den offentlige score.
- [x] Før revisionen gennem exact-head `32602287607`, PR #82/merge `189644a0` og fuld produktion `32602328912`; verificér live `rr-20260822223539-210` med 210/673 og ens datasæt-id.
- [x] Afgør og implementér totalscorebetydningen score-neutralt: dokumenteret faktisk kraftig udtransport med udtømt transportpotentiale tvinger `RESEARCH-2`-slutscoren til 0, men bevarer mobilisering og jagtbarhed som synlige komponenter. Start 0 uden faktisk udtransport må ikke udløse gaten.
- [x] Før udtransportgaten gennem exact-head `32604792201`, PR #84/merge `800a93cb`, fuld produktion `32604850884` og direkte livekontrol af `rr-20260822232159-210` med 210/673 og sammenhængende datasæt-id.
- [x] Vælg et praktisk, ærligt privat produktspor efter ejerreview: 0,03→0,15 m/s, intet passivt neutralt tab og kompakt tilstandsfortsættelse; behold 0,05→0,20/start 0 og 24/48 som reference-/følsomhedsspor.
- [x] Bevis score-neutralt, at potentiale og igangværende udtransport fortsætter eksakt over en simuleret pipelinegrænse.
- [x] Gennemfør mobiliserings-/helhedsreviewet: én bølgeenergistyret 4/48-tilstand uden additive vind-, strøm-, varigheds- eller stedpoint; dokumentér DEC-0056 og reproducerbare randtilfælde.
- [x] Før mobiliseringscheckpointet gennem exact-head `32607989444`, PR #87/merge `48240d73` og fuld post-merge-produktion `32608050112` uden offentlig scoreændring; 210/673, fuld validering, releasegate, Supabase, artifact og Pages er grønne.
- [x] Implementér den score-neutrale 4.0.259-pakke: begge kompakte tilstande centralt, Candidate G som adskilt diagnostisk runtime, fallback-kompatibel 210/673-shadow og deterministisk rollback til fortsat aktiv `25/40/35`.
- [x] Bestå den samlede lokale kildegate og releasegate for 4.0.259.
- [x] Før 4.0.259 gennem exact-head `32609888406`, PR #89/merge `31e50acb`, fuld post-merge-produktion `32609952992` og read-only shadow `32610281620` på den producerede runtime. Live `rr-20260823011924-210` består 210/673/1.346 uden score-rekonstruktionsfejl; alle 673 tilstande er dokumenteret bootstrap.
- [x] Lad den centrale tilstand fortsætte naturligt gennem natten. Live `rr-20260823083627-210` accepterer 673/673 tilstande uden nulstilling og dokumenterer nu 9/9 timers yngste/ældste alder. Ejeren accepterede nattens seks timer som praktisk evidens, men perioden må ikke kaldes et 48-timersbevis.
- [x] Byg den særskilte versionsbundne scoreomskifter og brugerforklaring med testet global tilbagekobling til `25/40/35`; 4.0.260-kandidaten vælger fortsat legacy og aktiverer ikke Candidate G.
- [x] Bestå samlet lokal kildegate og releasegate for 4.0.260.
- [x] Før 4.0.260 gennem exact-head `32628441062`, PR #92/merge `c5898ce8`, fuld produktion `32628516066`, frisk `rr-20260823083627-210`-shadow og grøn 210/673/420/2.100-browserkontrol.
- [x] Gennemgå startskævheden særskilt med ejeren: den unge scorefordeling må ikke gøres permanent afhængig af maskinens bootstrapværdi.
- [x] Efterprøv om den eksisterende syvdøgnshistorik kan fjerne bootstrap-skævheden. Resultat: nej; 65–117 timers historik efterlader 607/633 dele med mindst 50 points startpriorafhængighed, fordi neutral strøm ikke giver passivt tab.
- [x] Forkast en ny startreserve og implementér DEC-0059's faste 48-timers evidensvindue. 582 komplette historiske vinduer er uafhængige af tænkt start 0/50/100; der kræves ikke en ny 48-timers realtidsudviklingstest.
- [x] Før den afgrænsede schema-2-state gennem exact-head `32633533257`, PR #95/merge `1d848724` og fuld produktion `32633607166`. Live `rr-20260823102619-210` er fail-closed med legacy aktiv, 673/673 schema-2-state, ét første timebevis, 0/673 ready og nul Candidate G-aktivering.
- [x] Ejeren har gennem DEC-0060 godkendt central profilaktivering under den første ikke-offentlige opvarmning; 4.0.261 implementerer den versionsbundne ændring og readbackkontrakt.
- [ ] Produktionsverificér den aktive pakke. Manglende turkalibrering skal fortsat fremgå ærligt som modelusikkerhed, og konkret modstridende evidens kræver rollback.

## Aktuelt Candidate G-review – 4.0.258 vindstyret waders-kandidat

- [x] Saml én score-neutral ejerreviewvariant og klassificér de øvrige modeller som revisions-/følsomhedsspor.
- [x] Genkør 1.460-evalueringsanalysen og verificér strand-/waders-kontrakten.
- [x] Brug exact-merge-shadowens 243 komplette dele som mekanisk aktuelt snapshot uden at hente ekstra rådata.
- [x] Ejeren har valgt `20/50/30` som privat faglig analyseprior; aktiv `25/40/35` og senere turkalibrering forbliver adskilt.
- [x] Ejeren har valgt vind som hovedsignal for waders-jagtbarhed: fuld til 6 m/s, 0 ved 15 m/s og WAM-bølger kun som blødt fradrag på højst 20 point.
- [x] Genkør replay og kanoniske/nationale kontrakter med den nye variant; strand er uændret og waders-score overstiger aldrig jagtbarheden.
- [x] Før 4.0.258-checkpointet gennem exact-head-gate `32586707063`, PR #73, merge `9bdb8de8` og fuld produktion `32586958989`; live er 4.0.258/`rr-20260822171406-210` med 210 zoner og 673 dele.
- [x] Den faglige ejerretning er valgt gennem DEC-0054–0056. Manglende repræsentative ture/hold-out bevares som modelusikkerhed og senere efterkalibrering, ikke som en umulig før-aktiveringsgate.
- [x] Den score-neutrale offentlige diagnostic-runtime og fallback-kompatible shadow er leveret og produktionsverificeret i 4.0.259. Nattens seks timers naturlige fortsættelse er dokumenteret, og den særskilte omskifter er forberedt i 4.0.260 med offentlig `25/40/35` fortsat aktiv.

## P0 - luk den aktuelle kandidat

- [x] Gennemgaa draft-PR #1 og saml den korrekte 4.0.238-versionspakke med RDKS, changelog og haandbog.
- [x] Foer kandidaten sikkert til `main` uden de fire beskyttede lokale dataaendringer.
- [x] Koer frisk fuld produktion med alle gates, Supabase og Pages over et naturligt timeskifte; `#32351140886` og datasæt `rr-20260820085852-210` leverede beviset.
- [x] Bevis i frisk main-produktion, at de seks #3246-boelgehuller paa referencetimen er lukket, uden kortere hale eller aendret kildeorden.
- [x] Bevis i frisk main-produktion, at reference-time-rettelsen igen faar verificeret currenthistorik til at vokse i de 198 verificerbare parent-zoner; de 12 reelle huller skal forblive missing.
- [x] Gentag den fulde browseraudit: 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdoegnsvisninger med score, farve, pile, forklaringer, seks vejrmetrikker og `Mangler` i samme lokale kontekst.

## P1 - naturlig drift og DEC-0030

- [ ] Opbyg mindst 72 naturlige verificerede timer i alle aktive, geografisk verificerbare zoner. Ingen backfill.
- [ ] Foelg nye uafhaengige HARMONIE-, WAM- og DKSS-cyklusser og klassificer komponentovergange, modelkanter og fallbackhaler foer permanente graenser besluttes.
- [ ] Foelg de 12 parent-currenthuller som eksplicitte `no-marine-grid-point`; lokale 673/673-identiteter og parentzoner maa ikke blandes sammen.
- [ ] Foelg Feggesund som eksplicit boelge-missing; ingen opdigtet udfyldning eller flytning af punkter.
- [ ] Opbyg og maal Copernicus-shadow til det fulde naturlige 168-timersvindue. Duplikatruns taelles ikke som nye timer.
- [ ] Eftermaal en naturlig warning/critical paa en faktisk valgt effektiv vandstandskilde. Fremkald ikke kunstigt cacheudloeb.
- [ ] Foelg produktionsvarighed over nye modelrotationer; gates, marine audits og datakvalitet maa ikke reduceres for hastighed.

## P2 - forskning, kapacitet og vedligeholdelse

- [x] Udfoer den planlagte RavScore-/fysikanalyse i fase A-D: kilder, faktisk kode, fysisk systemmodel og evidensmatrix/valideringseksperimenter. Candidate G er resultatet af den efterfølgende ejerbeslutning og produktionsleverance.
- [x] Fremlaeg forskningsresultatet foer enhver ny scoremodel eller faglig implementering. Candidate G blev gennemgået med ejeren og særskilt godkendt i DEC-0054–0060.
- [ ] Maal faktisk Supabase-egress i naeste billingperiode; estimatorer er ikke billingbevis.
- [ ] Foelg GitHub Actions' Node-runtimeadvarsler og opgrader kun til officielle, verificerede actionversioner.
- [ ] Beslut senere, om raa diagnostiske zoneeksempler skal have en saerskilt beskyttet lagrings-/downloadvej uden at reducere ejerens diagnostik.

## P3 - ejerafgoerelser og manuel faglig kontrol

- [x] Ejeren har gennemgået den planlagte manuelle zone-/kystdelkontrol og afsluttet ejeropgaven. Nye konkrete geometri- eller punktfejl behandles som særskilte issues; Codex må fortsat ikke gætte eller flytte punkter.
- [ ] Privat national geometri, recoverykandidater og andre shadowresultater maa kun aktiveres efter eksplicit ejer-go/no-go.
- [x] Den planlagte manuelle faglige zone-/kystkontrol er afsluttet af ejeren. En senere domæne-/brugerrelease får sin egen samlede modenhedskontrol og genåbner ikke automatisk den gamle manuelle opgave.

## Afsluttet og derfor ikke laengere aktivt

- [x] Produktionsworkflowet kan ikke bygge/deploye frisk data uden fulde gates; en separat ikke-deployende PR-kildegate er groen.
- [x] Browser-pluginet er diagnosticeret, og den godkendte Playwright/system-Chrome-fallback er reproducerbar.
- [x] Livebrowserkontrol dækker 210/210 zoner og 673/673 dele samt score, pile, forklaring og alle seks vejrmetrikker.
- [x] #3245/#3246 har afgraenset historikfejlen, parent-currenthullerne, vandkildehaendelserne, komponentovergangene og timeskifteregressionen uden punktflytning.

## Arbejdsregel

Arbejdet tages i P0 -> P1 -> P2 -> P3. Et blokeret naturligt observationspunkt bliver staaende aabent, mens naeste ikke-blokerede punkt fortsaetter. Afsluttede eller erstattede historiske bokse maa ikke genopstaa som roadmaparbejde uden ny evidens eller ejerbeslutning.

## P1-checkpoint efter PR #2 - 2026-08-20
- [x] Verificér merge `e1f835a3` i frisk produktion `#32354210495`, support `RavRadar-support-3256`, datasæt `rr-20260820093508-210`, alle gates, Supabase, Pages og fuld 210/673-browserkontrol.
- [ ] Fortsæt naturlig `samples72h` fra 41,489 til mindst 72 faktiske timer efter 2026-08-21T16:05:48Z. De 12 parenthuller må ikke udfyldes kunstigt.
- [ ] Fortsæt supplementhistorikken fra 45 unikke validtider/45 timer og shadow-cachens cirka 104 timers capture-spænd til et reelt 168-timersvindue. Duplicate-suppressed runs tæller ikke.
- [ ] Afvent nye uafhængige modelstarter efter HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z; #3256 ændrer ingen tærskel.
- [ ] Bevar Feggesund som eksplicit wave-missing og de 12 parent-currenthuller som eksplicitte geografiske huller.
- [ ] Verificér den lokale Node 24-actionopgradering i fuld PR-CI og frisk produktion; ingen gate, jobrækkefølge eller betingelse er reduceret.

## Aktiv reparation og workflowforbedring, 2026-08-20
- PR #3 er merged som 4c6b7e3a, men push-produktion 32358538559 blev fail-closed stoppet i fuld validering før release-gate og deploy.
- Årsagen er fem resterende testforventninger til gamle GitHub Action-majors; live-produktionen blev ikke erstattet.
- Branchen codex/workflow-bootstrap-and-gate retter alle fem, tilføjer central versionskontrol, samler PR-gaten i validate:source og tilføjer reproducerbar Codex-klargøring.
- Lokal scripts/validate-source.ps1 er grøn. Næste trin er PR-gate, merge, fuld produktion og browserkontrol af den nye produktionsdataset.
## Workflowoptimering produktionsverificeret, 2026-08-20
- PR #4 blev merged som 8e4c11c3 efter grøn 17-sekunders kildegate.
- Push-produktion 32359944007 bestod fuld validering, release-gate, supportupload, Supabase, Pages-build og Pages-deploy.
- Supportartifactet er RavRadar-support-3259. Den offentlige dataset er rr-20260820104155-210 med 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- De tidligere Node 20-advarsler er væk. Den officielle Pages-action skriver fortsat en ikke-blokerende punycode-deprecation fra sin egen afhængighed.
- Arbejdsgangsopgaven er afsluttet; næste aktive arbejde er igen P1-historik og modelcyklusser.
## Selektiv skip af ren intern dokumentation, 2026-08-20
- Push til main springer nu kun produktionsworkflowet over, når alle ændringer er afgrænset til interne AI-, RDKS- eller forskningsdokumenter, versionschangelog, AGENTS.md eller de to genererede release-rapporter.
- Kode, data, scripts, workflows, HTML og øvrige offentlige filer udløser fortsat fuld produktion.
- En regressionstest kræver den præcise allowlist og afviser brede docs-, markdown-, data-, script-, workflow- og HTML-undtagelser.
- Formålet er at spare cirka seks minutters produktion og efterfølgende browserkontrol ved rene interne checkpoints uden at svække releasekæden.
## Endelig workflowproduktion 3261, 2026-08-20
- PR #5 blev merged som 0d29a512 og udløste den forventede sidste fulde produktion, fordi selve workflowfilen var ændret.
- Produktion 32361218606 bestod fuld validering, release-gate, supportupload, Supabase og Pages-deploy. Supportartifactet er RavRadar-support-3261.
- Den offentlige dataset rr-20260820105744-210 indeholder 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- Merge af dette rene interne dokumentationscheckpoint er den praktiske kontrol af paths-ignore-reglen og skal ikke starte produktionsworkflowet.

## Docs-skip bekræftet, 2026-08-20
- Den rene dokumentationsmerge 2ebd601e oprettede ingen push-produktionskørsel. Seneste push-produktion er fortsat den fuldt verificerede 0d29a512.
- Paths-ignore-optimeringen er dermed produktionsbevist og workflowopgaven er afsluttet.

## P1-driftcheckpoint #3261, 2026-08-20
- [x] Eftermål produktion `#32361218606` read-only: 72 rå prøver/42,866 timer i 210 zoner; 198 zoner har samme verificerede spænd, og de 12 kendte parenthuller står fortsat ved nul.
- [ ] Fortsæt naturligt til mindst 72 verificerede timer uden backfill. #3261 er fremgang, men ikke exit.
- [ ] Fortsæt shadow-observationen fra cirka 105,3 til 168 naturlige timer. Livepiloten dækker fortsat 673/673 dele med 622 lokal DMI, 43 lokal Copernicus og otte godkendte regionale proxyer.
- [ ] Afvent en ny selvstændig HARMONIE-, WAM- eller DKSS-modelstart før næste overgangskonklusion. #3261 ændrer ingen grænse, fallback, score eller geometri.
- Evidens: `docs/research/P1_DRIFT_CHECKPOINT_4.0.238_RUN3261.md`.
## P1-produktionscheckpoint #3263, 2026-08-20
+- [x] PR #8 er merged som `6d63ac3a`; produktion `#32363403425`, support `RavRadar-support-3263`, Supabase og Pages er grønne på det eksakte commit.
+- [x] Det deployede `rr-20260820112436-210` matcher supportartifactet byte for byte, og fuld browserkontrol bestod 210/673, 420 aktuelle og 2.100 prognosevisninger med nul fejl.
+- [ ] Naturlig verificeret historik er vokset til 43,31 timer i 198 zoner; de 12 parenthuller står fortsat ved nul. Fortsæt til mindst 72 timer uden backfill.
+- [ ] Shadow-cachen er vokset til cirka 105,75 timer. Fortsæt til 168 naturlige timer.
+- [ ] Ingen ny DMI-collection blev hentet i #3263. Afvent en selvstændig modelcyklus før nye overgangskonklusioner.
## P2 RavScore-forskning fase A-B, 2026-08-20
+- [x] Verificér den aktive runtimekæde: `score-engine.js` er autoritativ; rodens `ravscore.js` er en ubrugt historisk prototype.
+- [x] Dokumentér aktive komponenter, tærskler, adaptive justeringer, regler og de vigtigste risici for dobbelt-tælling.
+- [x] Opret den permanente evidensbase med konceptuel systemmodel, første primærkilder og prioriterede valideringsforsøg.
+- [ ] Udvid fase C med ambermaterialets egenskaber, dansk/nordisk overførbarhed og deterministisk følsomheds-/overlapmatrix.
+- [ ] Fremlæg fase D og cost/benefit før enhver ny scorearkitektur. Ingen scoreændring er godkendt.
## P2 RavScore-forskning fase C, 2026-08-20
+- [x] Tilføj en permanent score-neutral følsomhedsaudit med self-test og PR-gate.
+- [x] Mål 54 tærskelrækker, 18 missing-scenarier, otte overlapsscenarier og 86.400 syntetiske gridscenarier.
+- [x] Dokumentér de største spring og overlap uden at ændre aktiv score.
+- [ ] Næste fase er observerede inputfordelinger, ablation og bias-kontrolleret fund-/nuldesign; ingen produktionsmodel er godkendt.
## P2 fase C produktionsverificeret, 2026-08-20
+- [x] Merge `e85de36d` er verificeret i produktion `#32366326503`; den nye self-test, fuld validate, releasegate, Supabase og Pages bestod.
+- [x] `RavRadar-support-3265` og live `rr-20260820115954-210` matcher byte for byte; browseraudit 210/673, 420/2.100 og nul fejl.
+- [ ] Fase D forbliver analyse: observerede fordelinger, ablation, fund/nulfund, hold-out og cost/benefit. Ingen ny scorearkitektur er godkendt.
## RavScore phase D checkpoint - 2026-08-20
- Candidate-design and calibration gate are documented in `docs/research/RAVSCORE_PHASE_D_CANDIDATE_MODELS.md`.
- B0 is the unchanged production baseline; C1-C3 remain shadow-only.
- No production weights or score behavior changed.
- Next non-blocked step: design internal observation intake and generate a coverage-only report before any fitting.

## 4.0.239 observation safety checkpoint - 2026-08-20
- In progress: precise trip GPS is redacted from all new and retried remote observation payloads.
- In progress: observation analysis is coverage-only and cannot emit score patches while phase D is locked.
- Next after production verification: add an immutable forecast-snapshot identifier and search-effort fields without reintroducing the removed per-zone public form.
- Separate owner decision required: audited removal of any GPS already stored in historical central rows.

## Roadmap-checkpoint 2026-08-20
- Gennemført: fase D-observationssikkerhed, fjern-GPS-redaktion og kalibreringslås i 4.0.239.
- Gennemført: omkostningseffektiv pre-DMI-kildegate og efter-DMI-Copernicus-cachegendannelse i PR #16.
- Næste P1: ret kun rapportsemantikken for aktuel/fremtidig strømdækning; behold syvdageshistorik, DMI-først, fuld 673/673-gate og score uændret.
- Derefter: fortsæt fase D med dækningsopsamling og evidensgaten for shadow-kandidaterne C1-C3. Ingen kandidat må påvirke produktion før godkendt kalibrering.
- Browserkontrol: fuld 210/673-kørsel ugentligt eller ved relevante score-, UI- og datakontraktændringer; målrettet kontrol ved små afgrænsede ændringer.

## Roadmap-fremdrift 2026-08-20 - timegate
- Gennemført: tidskorrekt skelnen mellem historikdækning og scoreklar dækning (PR #18).
- Gennemført: target-hour-lås for alle produktionsbyg uden at gøre push/force cacheblokeret (PR #19).
- Verificeret i produktion: 673/673 scoreklare dele fra låst time og 673/673 i den fulde strømaudit.
- Næste P1: fortsæt RavScore fase D med observationsdækning og datakvalitetsbevis. Ingen automatisk kalibrering eller produktionsscoreændring.

## Fase D næste gate - central observationsprivacy
- Source-delmål: merge server-side GPS-null constraint og skærpede insert-policies, hvis alle gates er grønne.
- Driftsdelmål: anvend migrationen kontrolleret i Supabase og verificér kun udfald/status, aldrig rå observationer i logs eller PR.
- Historiske GPS-rækker bevares. Enhver sletning kræver fortsat udtrykkelig ejergodkendelse.
- Først derefter fortsættes observationernes dæknings- og datakvalitetsaudit; RavScore B0 og automatisk kalibrering forbliver låst.

## P1 - 4.0.240 jagtbarhed og sikkerhed

- Adskil jagtbarhed og sikkerhed i brugerflade og håndbog uden at ændre score eller geometri.
- Delmålet er lukket i produktion efter PR #23, frisk produktionsdatagate og fejlfri onlineaudit af 210 zoner og 673 kystdele.
- Næste RavScore-implementering er kontrolleret bølgeinput på alle 673 kystdele efter særskilt beslutning og regressionstest.

## P1 - 4.0.241 aktiv bølgeprior

- Mål den begrænsede bølgeeffekt syntetisk og på det aktuelle nationale offentlige datasæt.
- Aktivér kun efter grønne gates og systematisk browserkontrol.
- Hold vægtændringen 25/40/35 i næste særskilte delmål, så årsagen til scoreændringer kan måles.

## 4.0.242 - foreløbige RavScore-vægte

Aktiv kandidat: 25/40/35 efter DEC-0041. Konsekvensauditterne er grønne. Næste gate er fuld validering, browserkontrol og frisk produktion. Ingen komponentregler, tærskler, geometri eller punkter må ændres i dette delmål.
## Afsluttet roadmap-delmål: foreløbige RavScore-vægte

- 4.0.242 med 25/40/35 er implementeret, merged og produktionsverificeret 2026-08-21.
- Den fulde browserkontrol og den supplerende score-/forklaringskontrol er grønne.
- Næste arbejde vælges fra det næste ikke-blokerede punkt efter den foreløbige vægtning; senere empirisk kalibrering kræver repræsentative fund- og nul-fundsture.
## Næste ikke-blokerede fase D-delmål, 2026-08-21

- [x] Mål observerede 4.0.242-input-/scorefordelinger og komponentablation score-neutralt.
- [x] Fastlæg tripniveau som kalibreringsenhed i DEC-0042; enkeltfund må ikke styre fit.
- [x] Implementér dataminimeret tripkontrakt med start/slut, søgetid, jagtform, faktisk kystdel, dækningsgrad og immutable forecast-link. Leveret og produktionsverificeret i 4.0.243.
- [x] Hold observationsanalysen coverage-only med tomme scoreforslag og send ingen præcis GPS centralt. 4.0.264 fjerner desuden den gamle lokale GPS-rejse fra den aktive brugerflade; historiske lokale data røres ikke.
- [x] Generér første aggregerede kvalitets-/dækningsrapport før enhver beslutning om numeriske fit-minimummer. Senere fit forbliver låst til repræsentative komplette ture.
- P1's naturlige 72/168-timersdrift fortsætter uden backfill og vurderes først, når tidskravene faktisk er nået.

## Næste P1: frigiv 4.0.243 sikkert

1. Anvend og verificer 20260821_trip_evidence_contract.sql på den aktive Supabase observations-tabel.
2. Kør målrettede tests, validate:source og release:gate for 4.0.243.
3. Opdater kort PR, følg exact-head gates og merge kun hvis alle krav er grønne.
4. Følg exact-commit produktion og Supabase-synk.
5. Kør mobil turkontrol og fuld 210 zoner / 673 kystdele-kontrol, fordi UI og datakontrakt er ændret.
6. Fortsæt derefter turbaseret kalibreringsroadmap; ændr ikke 25/40/35 uden repræsentative ture.

## Samlet aktiv plan efter produktionsverificeret 4.0.243

- [x] PR #31 er merged som `2ded7943`; produktion `32455335962` og den fulde 210/673-onlinekontrol er grønne.
- [ ] P1: begræns normal Copernicus-indsamling til eksplicit godkendte DMI-huller. Bevar DMI-først, score-neutralitet og alle punkter.
- [ ] P1: gennemfør den store faglige analyse af rav, relevante transportanaloger og tidslige processer. Registrér kilder, styrke, usikkerhed og overførbarhed internt.
- [ ] P1: omsæt analysen til score-neutrale kandidatregler og en forskningsbaseret foreløbig vægtning. Vent ikke på et halvt års ture, men brug senere komplette ture til efterkalibrering.
- [ ] P1: sammenlign gammel og ny model automatisk på samme data. Ejer og Codex retter kun de vigtigste afvigelser gennem almindelig samtale; ingen offentlig AI/API.
- [ ] P1: implementér godkendt hændelsesmodel, ravvinduer og enkel lagdelt forklaring med fuld regression og produktionsevidens.
- [x] P2: byg et omfattende læringsmodul for begyndere og øvede på den kvalitetssikrede viden. **Grundbog i ravjagt** er produktionsverificeret i 4.0.268 via PR #118, produktion `32672578127` og grøn 210/673-browseraudit.
- [ ] P3 senere: gemte områder og varsler genovervejes efter cirka et halvt år eller i en samlet brugerdata-sektion.
- [x] Eksisterende score-/pil-/forklaringskontrol genbruges. Fuld 210/673 køres ugentligt eller ved relevante score-, UI- og datakontraktændringer.
- Fravalgt: separat offentlig scoresikkerhed og historisk “hvorfor ændrede scoren sig?”-funktion.
- Bindende beslutning: DEC-0044.

## Aktuelt delmål efter DEC-0044
Copernicus-afgrænsningen er implementeret som 4.0.244-kandidat: normal drift bruger kun aktuelle DMI-huller; 673-dels kontrol er manuel. Når kandidaten er produktionsverificeret, fortsætter roadmapet med den allerede igangsatte store evidensanalyse af mobilisering, transport, aflejring og jagtbarhed.

## Arbejdsgangsoptimering 4.0.247

- [x] Indfør DEC-0045: målrettet udviklingstest, én exact-head PR-kildegate og fuld post-data produktionsgate.
- [x] Fjern kun den gentagne kildekodegate fra planlagte vejropdateringer på samme kontrollerede kode.
- [x] PR #37, merge 3dc331ca og præcis produktion 32468752244 er grønne; 210/673-browseraudit var ikke relevant for workflowændringen.
- [ ] Fortsæt den store evidenssyntese og automatisk gammel-mod-ny-scoreanalyse.

## RavScore sammenligningsfase 4.0.248

- [x] Fastlæg gammel, nuværende og Kandidat A-C i DEC-0046.
- [x] Genbrug de eksisterende syntetiske og observerede audits.
- [ ] Generér og gennemgå kun den korte automatiske ejer-rapport.
- [ ] Vælg eller forkast kandidatdele skriftligt før enhver produktionsscoreændring.
- [x] Kandidatbeslutningen er gennemført; hændelsesmodel, ravvinduer, lagdelte forklaringer og læringsmodul er efterfølgende implementeret og produktionsverificeret gennem 4.0.268.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## Status 2026-08-21 efter 4.0.250

- Faerdigt: Automatisk gammel/aktiv/A/B/C-sammenligning og private 24/72-timers shadowfelter.
- Faerdigt: RavScore-shadow er adskilt sikkert fra GeoDanmark-geometripiloten og kan bruge den aktive bestand paa 210 zoner og 673 kystdele laese-only.
- Naeste: Koer det nye manuelle shadow-job paa `main`, gennemgaa den kompakte nationale rapport og indarbejd evidensen i den store videnskabelige RavScore-analyse.
- Derefter: Sammenhold gammel score, aktiv 25/40/35 og A/B/C med forskning i mobilisering, transport, fastholdelse og jagtbarhed. Foreslaa foerst derefter nye regler og vaegte.
- Fortsat gate: Ingen kandidat maa aktiveres automatisk. Geometriens uafhaengige punktbevis skal repareres separat og maa ikke omgaas.

## Status 2026-08-21 efter 4.0.251

- Foerste aktive shadowkoersel beviste 673/673 gyldige aktive DMI-punkter, men afslørede en uoverensstemmelse mellem grid- og marinegaten.
- 4.0.251 retter klassifikationen fail-closed: kun komponenter i samme DMI-collection danner en komplet familie.
- Naeste konkrete trin er exact-head gate, produktion og genkoersel af `ravscore_active_shadow`.
- Foerst en helt groen genkoersels kompakte A/B/C-rapport indgaar i den videnskabelige scoreanalyse.

## Godkendt delmål: fair landsrangering 4.0.252

- [x] Mål skævheden for alle 210 zoner og 673 kystdele over 107 timer og 214 jagtformskontekster.
- [x] Forkast for svage og for hårde kandidater, og fastlæg `direction-broad-19-v1` med tidsdeling og blokbootstrap.
- [x] Ejer godkendte modellen efter forklaring i almindeligt sprog.
- [x] Implementér samme interne sortering i Bedste områder og 5-dages RavRadar uden at ændre vist RavScore.
- [x] Målrettede checks, exact-head-gate, merge `ad70fbca`, fuld produktion `32515757957` og 210/673-browserkontrol er grønne.
- [ ] Fortsæt derefter den store faglige scoreanalyse; landsrangering og selve RavScore-vægtene er to forskellige problemer.

## Aktiv RavScore-forskningsblok efter DEC-0050

- [x] Korrigér den uparrede retningsanalyse med 1.460 parrede modforloeb paa samme styrker og historik.
- [x] Paavis, at den aktive model giver naesten samme retningsvirkning ved lav og hoej flytteevne.
- [x] Sammenlign foreloebige vaegtmatricer og vaelg 20/45/35 som naeste private analysecentrum uden offentlig aktivering.
- [x] Udled historisk stroemhukommelse fra de eksisterende 96-timers forloeb: styrke, retning, varighed, stabilitet, vendingsalder og nettoforloeb.
- [x] Udled tilsvarende vindhukommelse og adskil direkte vind fra indirekte virkning gennem boelger, stroem og vandstand.
- [x] Koer separate ablationer og kontroller svage/korte samt kraftige/langvarige vendinger.
- [x] Byg og sammenlign kandidat G i historisk replay, national scenariematrix og centralt hydreret national shadow.
- [x] Kontrollér score-neutralt den fulde ekspertregelkaede, jagtbarhed samt at komponenter, score, pil og historik passer sammen; 4.0.253 dokumenterer kontrakten uden offentlig kobling.
- [x] Forbered den grundige forklaring i almindeligt sprog og en konkret waders-produktanbefaling uden skjult koefficient.
- [ ] Gennemfør ejerreview af waders-/forklaringsvalget; offentlig ændring kræver fortsat særskilt go/no-go.
- [ ] Fortsaet efter godkendt scoremodel med haendelsesmodel, ravvinduer, lagdelte brugerforklaringer og det omfattende laeringsmodul i den allerede vedtagne roadmapraekkefoelge.

Kandidat G er privat og score-neutral. Aktiv RavScore 25/40/35, DMI-first, geometri og land-/vandpunkter forbliver uændrede under analysen.

## RavScore historikhukommelse - fremdrift 2026-08-21

- [x] Udled score-neutrale historikmaal for stroem, boelgeenergi og vind fra de eksisterende 96-timersforloeb.
- [x] Dokumentér syntetisk og observeret, at styrke og varighed bestemmer hvor hurtigt en vending slaar igennem.
- [x] Afgræns 24 timer som foreloebigt aktivt regimespor og 48 timer som foreloebigt baggrundsspor uden at vaelge point eller blandingsandel.
- [x] Test 24 alene, 48 alene og en lille dobbeltsporsmatrix uden fremtidslaek.
- [x] Ablatér stroem, boelger, lineart vindspor og vindstressspor, foer kandidat G faar en samlet transportfunktion.
- [ ] Fortsaet derefter den allerede bindende kandidat G-, national shadow-, forklarings- og sikkerhedskaede i DEC-0050.

## RavScore 24/48-matrix og ablation - resultat 2026-08-22

- [x] Kausalitetstest beviser, at senere prøver ikke ændrer tidligere hukommelse eller normalisering.
- [x] 24/48-fortegnsuenighed er kun 1-2 procent; 48 timer reducerer strømsporets fortegnsskift fra 14 til 10.
- [x] Næste replay er afgrænset til 24 alene, 50/50 og 48 alene; 75/25 og 25/75 udgår som redundante følsomhedspunkter.
- [x] Lineær vind er konservativ hovedanalyse; vindstressproxy er yderkant, og en variant uden direkte vind er obligatorisk.
- [x] Integrér de tre historikvarianter i kandidat-G-replay og den parrede retningskontrol uden pointaktivering.
- [x] Kør den kanoniske nationale scenariematrix uden geometri-/punktlæsning.
- [x] Kør den virkelige centralt hydrerede nationale shadow før den endelige ekspertregel-, sikkerheds- og forklaringsgate.

## Kandidat G næste beslutningsgate - 2026-08-22

- [x] Historisk kandidat-G-replay: 1.460 private evalueringer med 24 timer, 50/50, 48 timer og no-direct-wind.
- [x] Separat strøm-, bølge-, direkte vind- og totalvindablation samt gain-, vægt- og vindstressfølsomhed.
- [x] Kanonisk national rotationsmatrix: 176 evalueringer, nul historikskabt transport ved nul kapacitet og korrekt respons på svage/stærke vendinger.
- [x] National shadow-kode understøtter G-sporene og er self-testet uden produktionsaktivering.
- [x] Centralt hydreret exact-head-shadow `32554012542`: 673/210 kontrolleret, 243 scorede dele, 430 eksplicit u-scorede, nul blokerede og nul offentlige ændringer.
- [x] Bekræft 50/50 uden direkte vind som foretrukken beslutningsvariant og 24/48 som grænser; nationalt er forskellene fortsat højst ét point.
- [ ] Kun hvis ejeren senere ønsker offentlig aktivering: definér en særskilt landsdækkende scoreinputkontrakt uden nuludfyldning, nabo-/parentlån eller punktflytning. Den aktuelle mekaniske analyse bruger de 243 komplette dele og henter ikke yderligere rådata.
- [x] Mål waders-konflikten på den foretrukne variant og fastlæg en score-neutral forskningsanbefaling: behold ravpotentialet, vis metodeegnethed separat, anbefal aldrig en utilgængelig metode, hold sikkerhed uafhængig og brug ingen skjult koefficient.
- [x] Få ejerens produktbeslutning om waders-betydningen: strand uden loft, waders højst jagtbarheden, vindkurve fuld til 6 m/s og ingen sikkerheds- eller stedegnethedsmodel.
- [x] Afspil frisk central ekspertregelkaede; den havde nul aktive regler og nul matches.
- [x] Fastlæg kandidatens score-neutrale kontrakt: eksakte komponenter/gate rekonstruerer 1.460/1.460 scorer; pilen er aktuel lokal strøm, mens historik forklares særskilt på samme context.
- [x] Før kode-/analysebaseline 4.0.253 gennem PR #62 og dokumentationscheckpointene gennem PR #64; fuld produktionsverifikation `32570223437` og snapshot `rr-20260822112859-210` er 210/673 grønne.
- [ ] Verificér den endelige offentlige UI-/forklaringskobling efter ejerbeslutningen; ingen kobling er implementeret i 4.0.253.
- [x] DEC-0053-ejerreviewet er gennemført og erstattet af ejerbeslutningen i DEC-0054: privat `20/50/30`, vindstyret waders-jagtbarhed og fortsat ingen offentlig aktivering.
# NYESTE CHECKPOINT – 2026-09-03 – 4.0.321 lean slutvej efter Phase A

- [x] Bevar PR #246/`7198b685` som færdigt Phase A-kodegrundlag med Candidate G offentlig og automatisk state-6-cutover umulig.
- [x] Erstat normal fuld checkpoint-readback med bounded metadata-CAS; behold fuld payload kun til reel restore og bevar fail-closed invalid-state-adfærd.
- [x] Luk checkpoint-history, direct-read, ACL/RLS/search-path, exact envelope/673+673/READY/privacy og migrations-/schema-/installerparitet målrettet.
- [x] Løft 4.0.321 og bevis, at geodata kun ændrer versionsfeltet; bevar begge modelbundles uændret.
- [x] Modtag uafhængig read-only SQL-review uden P0/P1; bekræft CAS, no-history, RLS/ACL/search path, exact 673+673 og metadata-only svar.
- [ ] Opdater RDKS, Markdown-/webhåndbog og changelog; commit/push én samlet head og bestå én exact-head `validate:source`.
- [ ] Lad den eksisterende DMI-first-cachekæde arbejde uden parallel run; bevis derefter 673 × 118 og Feggesund 3 × 118.
- [ ] Mål live Supabase før/efter samt øvrig egress, database og lager mod 70/30-grænsen; merge først når alle Phase-A-releasegates er grønne.
- [ ] Følg frisk fuld produktion og udfør derefter særskilt manuel Fase B; verificér state 6, 210/673, begge modes, fem døgn, advarsler, PWA/Om og desktop/mobil offentligt.
# AKTUEL TOPRÆKKE – reel modelbundle og backend-pre-write

- [x] Luk de manglende direkte public entrypoints fra safe-fail backendrun `33736292211`: `rav-assistant.js` og `trip-evidence-public-adapter.js` er nu del af den transitive integrated-bundle.
- [x] Regenerér/synkronisér integrated til `a226e7d1…`/`d5796289…` over 55 filer og bevis actual-source browserclosure over 78 offentlige moduler; bevar Candidate G `7c7f2b…`/56 uændret.
- [x] Dokumentér remote read-only `false/false/false`: migrationsledger og begge nye RPC'er er fraværende, så migrationerne er ikke live.
- [ ] Kør linked migration list/dry-run som definitiv pre-write-gate uden passwordreset/gæt; gennemfør derefter den låste data-, kapacitets-, merge-, Fase B-, produktions- og browserrækkefølge.
# AKTUELT – 2026-09-06 – 4.0.326 til komplet vejr og modelstart

- [x] Bevar DMI/Copernicus-fremgangen fra `34004697179` og DMI-kandidatfremgangen fra `34004873418`; undgå blind genkørsel på uændret deterministisk fejl.
- [x] Ret modelrun-rollover i regional shadow uden at tillade stale data eller svække same-run hashbinding; tilføj privacy-sikker årsagskode og måltests.
- [ ] Kør én exact-head-kildegate, merge sikkert og start derefter én stor main-oneoff. Gentag kun efter ny bevaret fremgang eller en rettet konkret fejl.
- [ ] Bevis DMI/Copernicus/regional/Open-Meteo-closure 79.414/79.414 og Feggesund-bølger 354/354.
- [ ] Fortsæt direkte med Supabase-kapacitetsbevis, fulde produktionsgates og særskilt integreret Fase B. Offentlig model må først skifte efter alle eksisterende stopgates.
# Aktiv roadmap – 4.0.403 fra gemt runtime til offentlig prognose

1. [x] Lever 4.0.402 exact-head/PR/merge og providerfri kode.
2. [x] Gennemfør normalrun `35205052150` gennem alle providere, cacher, closure, historik, runtimeaudit og 52+3-kontroller.
3. [x] Bevis at den validerede private runtime blev centralt gemt før adminsynkroniseringens `stableDigest`-stop.
4. [x] Ret stabil readback og byg en afgrænset providerfri fortsættelse af præcis den nyere gemte runtime.
5. [x] Kræv aktiv integreret model, ren offentlig kilde, 240 minutters alder, source ancestry, 210/673 og privacy.
6. [ ] Afslut dokumentation, målrettede kontroller, diff og rent geodataversionsbevis.
7. [ ] Commit/push, bestå én exact-head og merge samme head.
8. [ ] Kør `saved-weather-continuation`; verificér at ingen provider kaldes, og at offentlig 4.0.403 viser prognoser og scorer.
9. [ ] Kør næste almindelige vedligeholdelse og mål providerfordeling og cachefremgang.
10. [ ] Genaktivér scheduler efter bevist normal vedligeholdelse; gennemgå derefter hele sitet og de resterende roadmap-punkter.

DEC-0185. Ingen ny oneoff eller gentagelse af den allerede gennemførte vejrindsamling.
# Aktiv topprioritet – 4.0.453 reservebølge-recovery

1. [x] Afgræns `35695267017` til replayets fejlagtige afvisning af en
   allerede godkendt reservebølge.
2. [x] Ret normal recovery med kystdel-, time-, komponent- og recordbinding.
3. [x] Bevar Candidate G-wave-bridge som direkte DMI-only.
4. [ ] Bestå exact-head sourcegate og merge 4.0.453.
5. [ ] Fortsæt én normal vejrkørsel fra de gemte DMI/Copernicus/Open-Meteo-
   cacher; ingen ny oneoff.
6. [ ] Verificér central cache, runtime, gates, artifact, Pages og offentlig
   prognose. Mål derefter providerfremgang og mangler på et sammenligneligt
   tidspunkt.
# Aktivt roadmap – 2026-09-22, 4.0.454 desktopkort

0. [x] Ret desktopforsidens kortkolonne, så kortet fylder den ledige højde
   ved siden af “Bedste områder”; mobil- og tabletlayout er urørt.
1. [ ] Bestå målchecks, exact-head sourcegate, merge og Pages-publicering.
2. [ ] Bekræft visuelt desktoplayoutet og fortsæt derefter den igangværende
   normale vejrcachekørsel uden at genstarte den på grund af CSS-ændringen.
3. [ ] Fortsæt de allerede åbne vejrdata- og plain-language-roadmap-punkter.
# Aktivt roadmap – 2026-09-22, 4.0.461 target-bundet predecessor før selvstændig drift

0. [x] Afgræns run `35740940791`: current pointer var `19:00`, restore valgte
   korrekt previous `16:00`, men migration fik current-descriptoren.
1. [x] Bind descriptorvalg til præcis target-reference og genbrug samme
   generation i source-archive, restore-manifest og migration.
2. [ ] Bestå exact-head-kontrol og ny providerfri code-only-genbinding på main.
3. [ ] Genoptag én almindelig vejrkørsel fra gemt fremgang og kræv cache-save,
   artifact, deploy og offentlig runtime.
4. [ ] Følg mindst den næste cron-kørsel uden Codex-overvågning.

# Aktivt roadmap – 2026-09-22, 4.0.460 feltdiagnose før selvstændig drift
# Aktivt roadmap – 2026-09-22, 4.0.462 stor runtimekontrol

0. [x] Afgræns code-only-run `35743282510` til en V8-strenggrænse i
   Candidate G-state-sammenligningen efter grøn target/predecessor-binding.
1. [x] Gør stor state-sammenligning iterativ og nøglesorteret uden at opgive
   fail-closed kontrol af alle state- og målefelter.
2. [x] Bevar det additive bindingregisterdesign for senere fund.
3. [ ] Kør RDKS-/versionskontrol og exact-head sourcegate.
4. [ ] Merge og kør providerfri code-only continuation på samme mål.
5. [ ] Genoptag først derefter én almindelig vejrkørsel fra gemt fremgang.
6. [ ] Efter grøn drift: følg cacheopbygning, offentlig side og næste cron uden
   Codex-overvågning.
