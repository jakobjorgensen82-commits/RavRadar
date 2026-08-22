# RavRadar - aktivt roadmap

## Aktuel P0-status - 4.0.238 produktion

- P0.1 og P0.2 er afsluttet: PR #1 blev merged som `b8844841`, og den korrekte 4.0.238-pakke blev ført til `main` uden de fire beskyttede lokale datafiler.
- P0.4-P0.6 er afsluttet i `#32344813967`/support `RavRadar-support-3252`/datasæt `rr-20260820074127-210`: seks bølgehuller lukket, verificeret historik vokset til 39,594 timer og browseraudit grøn for 210/673/420/2.100.
- P0.3 er afsluttet: naturlig schedule `#32351140886` byggede frisk datasæt `rr-20260820085852-210`, gennemførte begge fulde gates, Supabase og Pages og bevarede den låste referencetime på tværs af UTC-timeskiftet uden manuel omgåelse.
- P1-observation: Copernicus-pilot #72 har 46 eksakte timer, 28.934 poster og nul gitter-/lagustabilitet. Fortsæt mod 168 timer.
- P1-cykluskontrol: 4.0.238-artifact #3252 bruger fortsat HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z. Det er stabil drift, ikke en ny uafhængig cyklus; ingen grænse ændres.
- P1-performance: 4.0.238's fulde build tog 415 sekunder mod 475,5 sekunders median for seks fulde builds. Ingen gate er reduceret; målingen gentages ved reelle nye modelrotationer.
- P1-driftsevidens og analyse fortsætter efter den afsluttende dokumentationsmerge. Ingen missing værdi må skjules, og ingen land-/vandpunkter må flyttes.

**Opdateret:** 2026-08-20  
**Statusgrundlag:** 4.0.238 live på merge `b8844841`; verifikationsbranch `codex/verify-4.0.238`

Dette er den eneste aktive opgaveliste. `IMPLEMENTATION_STATUS.md` og aeldre forsknings-/versionsafsnit bevares som revisionsspor. En tom afkrydsningsboks i historikken er ikke en aktiv opgave, medmindre punktet ogsaa findes her.

## Aktuelt Candidate G-delmaal – strømstyret transporthukommelse

- [x] Fastlæg strømmen som transportled og bølger som en lille afhængig landingsfaktor.
- [x] Implementér og test ejerens fuldstyrkekurve: 8 points straks-tab pr. effektiv udgående time og nul fra 13 timer.
- [x] Bevar cirka 10 timers indgående opbygning, `20/50/30` og DEC-0054's waders-kontrakt.
- [x] Genafspil den eksisterende private cache uden nye rådata og kør målrettede følsomheder.
- [x] Dokumentér, at strømgrænsen og replayets start-/forældelsesregel har væsentlig betydning og endnu ikke er kalibreret.
- [x] Afslut samlet RDKS-/håndbogskontrol og fuld lokal kildegate inklusive releasegate.
- [ ] Før beslutningsgrundlaget gennem exact-head PR og score-neutral merge.
- [ ] Undersøg derefter en afgrænset 24–48-timers forældelsesregel og strømgrænse uden offentlig aktivering.
- [ ] En eventuel offentlig Candidate G-aktivering forbliver et særskilt ejer-go/no-go med validering og fulde produktgates.

## Aktuelt Candidate G-review – 4.0.258 vindstyret waders-kandidat

- [x] Saml én score-neutral ejerreviewvariant og klassificér de øvrige modeller som revisions-/følsomhedsspor.
- [x] Genkør 1.460-evalueringsanalysen og verificér strand-/waders-kontrakten.
- [x] Brug exact-merge-shadowens 243 komplette dele som mekanisk aktuelt snapshot uden at hente ekstra rådata.
- [x] Ejeren har valgt `20/50/30` som privat faglig analyseprior; aktiv `25/40/35` og senere turkalibrering forbliver adskilt.
- [x] Ejeren har valgt vind som hovedsignal for waders-jagtbarhed: fuld til 6 m/s, 0 ved 15 m/s og WAM-bølger kun som blødt fradrag på højst 20 point.
- [x] Genkør replay og kanoniske/nationale kontrakter med den nye variant; strand er uændret og waders-score overstiger aldrig jagtbarheden.
- [x] Før 4.0.258-checkpointet gennem exact-head-gate `32586707063`, PR #73, merge `9bdb8de8` og fuld produktion `32586958989`; live er 4.0.258/`rr-20260822171406-210` med 210 zoner og 673 dele.
- [ ] En eventuel offentlig implementering er et nyt delmål med særskilt beslutning, repræsentative ture/hold-out, komplet dynamisk inputcoverage og fulde produktgates. Indtil da forbliver offentlig `25/40/35` uændret.

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

- [ ] Udfoer den planlagte RavScore-/fysikanalyse i fase A-D: kilder, faktisk kode, fysisk systemmodel og evidensmatrix/valideringseksperimenter.
- [ ] Fremlaeg forskningsresultatet foer enhver ny scoremodel eller faglig implementering. Implementering kraever en saerskilt ejerbeslutning.
- [ ] Maal faktisk Supabase-egress i naeste billingperiode; estimatorer er ikke billingbevis.
- [ ] Foelg GitHub Actions' Node-runtimeadvarsler og opgrader kun til officielle, verificerede actionversioner.
- [ ] Beslut senere, om raa diagnostiske zoneeksempler skal have en saerskilt beskyttet lagrings-/downloadvej uden at reducere ejerens diagnostik.

## P3 - ejerafgoerelser og manuel faglig kontrol

- [ ] Ejeren gennemgaar gradvist zoner og lokale punktpar paa bugtede/tvetydige kyststraekninger. Codex maa dokumentere og stoette, men ikke gaette eller flytte punkter.
- [ ] Privat national geometri, recoverykandidater og andre shadowresultater maa kun aktiveres efter eksplicit ejer-go/no-go.
- [ ] Afslut den manuelle faglige zone-/kystkontrol foer endelig domaene- og brugerrelease.

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
- [ ] Implementér dataminimeret tripkontrakt med start/slut, søgetid, jagtform, faktisk kystdel, dækningsgrad og immutable forecast-link.
- [ ] Bevar præcis GPS lokalt, og hold observationsanalysen coverage-only med tomme scoreforslag.
- [ ] Generér første aggregerede kvalitets-/dækningsrapport før enhver beslutning om numeriske fit-minimummer.
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
- [ ] P2: byg et omfattende læringsmodul for begyndere og øvede på den kvalitetssikrede viden.
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
- [ ] Hændelsesmodel, ravvinduer, lagdelte forklaringer og læringsmodul følger først efter kandidatbeslutningen.

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
