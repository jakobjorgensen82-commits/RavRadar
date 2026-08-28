# Næste RavScore-model – bevaringsaudit, årsagsmodel og integrationsmatrix

**Status:** Implementeret releasekandidat under DEC-0102/DEC-0103; produktionsbevis afventer
**Kodebaseline:** `9c6e161ec52a7a0154a0f0d78b650ba87f2441bc`, RavRadar 4.0.305
**Valgt samlet model:** `RRS-COASTAL-CAUSAL-CHAIN-1`; Candidate G er kun intern historisk/offline reference frem til samlet aktivering
**Datagrænse:** Ingen private payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.

## Metode og bevisgrænse

Auditen sammenholder aktiv kode, Candidate G's produktionshistorik, bindende RDKS og primær forskning. Klassifikationen er:

- **BEVAR:** mekanismen og dens kontrakt har både faglig og teknisk værdi;
- **FORBEDR:** samme ansvar består, men semantik, kobling eller test er utilstrækkelig;
- **ERSTAT:** den nuværende matematik er ikke en god repræsentation af det ansvar, den påstår at have;
- **FJERN:** signalet har ikke selvstændigt ansvar eller giver dokumenteret dobbelt-tælling;
- **UTILSTRÆKKELIG EVIDENS:** der findes ikke grundlag for at vælge en ny numerisk naturregel.

Uden et repræsentativt fund-/nul-fundgrundlag kan leverancen bevise fysisk og teknisk sammenhæng, men ikke højere empirisk fundpræcision.

## Opdateret primær evidens

| Proces | Primær kilde | Konsekvens for RavRadar | Klasse |
|---|---|---|---|
| Orbitalbevægelse og nettotransport i surfzonen | [Bjørnestad et al. 2021, GRL](https://doi.org/10.1029/2021GL095722) | Orbitalhastighed er ikke i sig selv nettotransport. Lokal middelvandstand, breaking og batymetri påvirker den Lagrangiske transport. Offshore Hs/T kan derfor ikke stå som en præcis sidste-meter-model. | B/C |
| Kortbølgeflux kontra undertow | [Brinkkemper et al. 2018, JGR Earth Surface](https://doi.org/10.1029/2017JF004425) | Under rolige forhold kan asymmetriske orbitaler drive transport mod land; under energiske forhold kan middel-undertow dominere og vende nettotransporten udad. Mobilisering og levering skal være forskellige led. | B/C |
| Breaking-wave-turbulens og resuspension | [Aagaard & Greenwood 2000, Marine Geology](https://doi.org/10.1016/S0025-3227(00)00025-6) | I surfzonen afhænger resuspension af breakingtype, lokal dybde og turbulens; en offshore energiproxy må kaldes proxy, ikke bundskærspænding. | B/C |
| Rip-/langskystflow og kanaler | [Moulton et al. 2017, JGR Oceans](https://doi.org/10.1002/2016JC012222) | Kanaliseret udstrømning og langskystflow afhænger af observeret lokal batymetri og bølgeforhold. RavRadar mangler disse input og må markere sidste-meter-usikkerhed frem for at opfinde rip/undertow. | B/C |
| Wave groups og episodisk suspension | [Aagaard et al. 2008, Continental Shelf Research](https://doi.org/10.1016/j.csr.2007.12.007) | Mobilisering er hændelsesbaseret; højde alene og et enkelt øjeblik er utilstrækkeligt. Candidate G's kausale bølgeenergihukommelse er et bedre udgangspunkt end rå maksimumvind. | B/C |
| Partikelegenskaber og beaching | [Li et al. 2023, Marine Pollution Bulletin](https://doi.org/10.1016/j.marpolbul.2023.115695) | Densitet, bølgestejlhed, skrå bund og runup styrer beaching af lette objekter. Analogien støtter et særskilt leveringsled, men kan ikke kalibrere ravets koefficienter. | C |
| Kystnær transport af lette partikler | [van Sebille et al. 2020, Environmental Research Letters](https://doi.org/10.1088/1748-9326/ab6d7d) | Bølger, strøm, vertikal fordeling, partikelstørrelse og resuspension bestemmer beaching/retention. Ét deterministisk beaching-tal uden lokale input ville være falsk præcision. | C |
| Bundnær spænding, strøm og bølge-strøm-kobling | [Grant & Madsen 2005, JGR Oceans](https://doi.org/10.1029/2004JC002401), [Brown et al. 2009, JGR Oceans](https://doi.org/10.1029/2008JC005158) | Middelstrøm, bølgeorbitaler og bundfriktion er forskellige størrelser. RavRadars gridstrøm og offshore-bølgeproxy må ikke smeltes sammen til en opdigtet lokal bundskærspænding. | B/C |
| Undertow, feeder- og ripstrømme | [Reniers et al. 2009, JGR Oceans](https://doi.org/10.1029/2008JC005153), [O'Dea et al. 2021, JGR Oceans](https://doi.org/10.1029/2020JC016619) | Returflow kan være tværkystligt, langsgående og kanaliseret og afhænger af lokal brydning og batymetri. En enkelt regional/model-gridvektor kan ikke opløse denne kæde. | B/C |
| Bar-/rendeudvikling ved faldende tidevand | [Reichmüth & Anthony 2007, Geomorphology](https://doi.org/10.1016/j.geomorph.2007.01.015) | Faldende vand kan flytte den aktive zone og koncentrere eller omfordele materiale ved revler/render. Analogien støtter søgefokus, men dokumenterer ikke ravtab ud over surfzonen eller en universel koefficient. | C |

Forskningen støtter ikke én universel dansk rip-, undertow-, retention- eller beachingkoefficient. Det er derfor en bevidst modelbeslutning at gøre surfzoneusikkerhed eksplicit og begrænse dens numeriske virkning.

## Candidate G – komplet bevaringsmatrix

| Aktiv del | Kode/kontrakt | Klassifikation | Begrundelse og handling |
|---|---|---|---|
| Lokal kystnormal fra centralt punktpar | `direction-anchors`, zone-/kystdelskontekst | **BEVAR** | Stedsspecifik retning er nødvendig. Ingen geometriændring i modelsporet. |
| Fælles U/V-celle, tid, collection og bundnært lag | DMI-parser/proveniens | **BEVAR** | Forhindrer fysisk ugyldige vektorer. Gridstrøm omtales som kystnært transportbevis, ikke undertow. |
| 0–3/5 km og særskilt allowlistet regional proxy | DMI-routing | **BEVAR** | Fail-closed afstand/proveniens består; ingen generel strømbåndsfallback. |
| Kystnormal strømhastighed 0,03→0,15 m/s | `deriveCurrentTransportEvidence` | **UTILSTRÆKKELIG EVIDENS** | Bevar som tydeligt versionsbundet responsprior i første nye model; følsomhed og grænsetest er obligatorisk. Ingen kilde begrunder en bedre universel ravtærskel. |
| +10/-8 point pr. effektiv time | `buildCurrentTransportPotential` | **ERSTAT** | Den lineære pointsemantik erstattes af glat eksponentiel opbygning/dæmpning. Første fulde time matches omtrent for overgangskontinuitet, men værdierne er versionspriorer og ikke observeret lager. |
| 13 effektive timers hård totalscore-nul | outflow-exhaustion gate | **ERSTAT** | Udgående gridstrøm dæmper den dokumenterede kystnære transportvej glat og kan nærme sig nul, men beviser ikke at alle lokale lagre/aflejringer er tomme. Den separate kategoriske gate fjernes. |
| Fast 48-timers transportvindue og rand 0 | bounded memory/state schema 2 | **BEVAR** | Fjerner skjult startprior og har stærkt recoverybevis. Nyt state-id migrerer kun kompatibel kompakt evidens; ingen kunstig historik. |
| Maksimum tre timers verificeret cadence | statepipeline/native hold | **BEVAR** | Faktisk tid integreres; hold skaber ingen måling, pil eller ekstra evidens. |
| Højde² × periode | mobilisation memory | **BEVAR** | Fysisk bedre relativ energiproxy end højde alene. Må aldrig kaldes bundskærspænding eller breakingintensitet. |
| 4 timers opbygning / 48 timers aftrapning | mobilisation state | **UTILSTRÆKKELIG EVIDENS** | Bevar som versionsbundet, sensitivitetstestet prior, fordi der ikke er evidens for et bedre universelt dansk ravforløb. |
| Direkte vind ude af mobilisering | Candidate G Research-3 | **BEVAR** | Vindens hovedvirkning er allerede i bølgefeltet; direkte bonus ville dobbelt-tælle. |
| Aktuel strømstyrke ude af mobilisering | Candidate G Research-3 | **BEVAR** | Strøm er transportansvar. Breaking/orbitalenergi er mobiliseringsproxy. |
| Bølgeretning mod lokal kyst | `wave-approach` | **FORBEDR** | Bevar som information om offshore bølgeankomst, men omdøb til **nærkyststøtte** og brug den kun som begrænset leveringskontekst. Den er ikke surfzonens nettostrøm. |
| `delivery = transportPotential × factor` | `currentLedTransportAndDelivery` | **ERSTAT** | Den efterfølgende 65/35-sammenblanding tæller samme transportpotentiale igen. Ny model har ét supply-led og et separat, bounded nærkystled; supply tælles præcis én gang i den fysiske kæde. |
| Eventtiming fra gammel Phase D | `eventTimingScore`, declining-energy | **FJERN** | Overlapper bølgemobiliseringsstate og bygger på ældre max-/alderspriorer. Den må fortsat findes i historisk audit, ikke i den nye score. |
| Vandstandsændring | offentligt `waterLevelTrendCm3h` | **FORBEDR** | Ekspertinput og fysisk analogi støtter, at faldende vand kan flytte rav fra inderste strand til en mere koncentreret revle/rende og dermed gøre søgeområdet mindre. Implementér kun en bounded jagtbarhedsprior; nul påvirkning af supply/mobilisering/strøm, ingen lokal revlepåstand og ingen påstand om tab ud over surfzonen. Missing er ukendt, ikke nul. |
| Mild bottleneck 0,85–1 | `physicalBottleneckGate` | **ERSTAT** | En additiv score med mild efterfaktor lader høj jagtbarhed kompensere for manglende fysisk vej. Ny model samler supply, mobilisering og nærkyststøtte først som en kausal fysisk mulighed. |
| 20/50/30 | `CANDIDATE_G_WEIGHTS` | **ERSTAT som arkitektur; UTILSTRÆKKELIG EVIDENS for ny fitvægt** | 50 og 30 bliver ikke længere to additive chancer for samme hændelse. Fysisk mulighed dannes først; jagtbarhed påvirker derefter 20 % af indekset. 20 % bevares som produktprior, ikke empirisk fundvægt. |
| Strand/waders separat | huntability profile | **BEVAR** | Metodeegnethed er ikke ravtilstedeværelse. Samme fysiske led bruges for begge metoder. |
| Waders vindkurve og synligt loft | wind-led profile | **BEVAR** | Ejerbesluttet praktisk kontrakt, fortsat ikke sikkerhedsmodel. |
| Lokal missing/utilgængelighed | Candidate G-only profile | **BEVAR** | Ingen legacy-, nabo-, parent- eller timefallback. |
| Kompakt state/proveniens/recovery | pipeline/workflow | **BEVAR/FORBEDR** | Genbrug driftssikkerheden; løft schema/model-id, tilføj eksplicit migration, compatibilitetsafvisning og rollback til sidste fuldt verificerede nye-modelartifact. |
| Offentlige forklaringer og limitations | projection/i18n | **FORBEDR** | Forklar supply, mobilisering, nærkyststøtte, jagtbarhed og usikkerhed hver for sig på DA/DE/EN. |

## Ny samlet årsagsmodel

Den nye model bruger seks eksplicitte led:

1. **Muligt lager/tilførsel:** ikke observeret direkte. Det bounded kystnære tilførselspotentiale er en dokumenteret vej, ikke en mængdemåling.
2. **Mobilisering:** kausal relativ bølgeenergistate fra Hs²×T.
3. **Transport mod kystzonen:** samme verificerede kystnormale bundnære gridstrøm og bounded state.
4. **Nærkyststøtte:** begrænset information fra bølgeretning/-energi. Den beskriver mulighed for sidste levering, ikke undertow/rip eller faktisk beaching.
5. **Jagtbarhed:** metodeafhængig synlighed/arbejdsforhold, ikke sikkerhed og ikke ravlager.
6. **Usikkerhed:** surfzone/batymetri/retention er uobserveret og vises maskinelt og sprogligt; faldende vand er en lille synlig jagtbarhedsprior, ikke skjult supply eller en ekstra strømvektor.

Den fysiske mulighed beregnes før jagtbarhed. Supply tælles én gang, og mobilisering kan ikke opfinde supply. Et nul i et nødvendigt dokumenteret fysisk led giver nul fysisk mulighed; missing giver utilgængelighed, ikke nul.

Den implementerede formel er `P = 100 × sqrt(S/100 × M/100)`, derefter `D = P × F_nærkyst` med en retningsbundet faktor mellem 0,8 og 1, og til sidst `R = round(D × (0,8 + 0,2 × H/100))`. Waders beholder et synligt loft på jagtbarheden. Strømtilstanden bruger 48 timers rand 0, 6,578813 timers indgående opbygningshalveringstid og 8,312951 timers udgående dæmpningshalveringstid. De to tal matcher omtrent Candidate G's første fulde +10/-8-time som overgangskontinuitet og er ikke naturkonstanter.

Faldende vand starter først under -3 cm/3 h, vokser glat til højst 10 jagtbarhedspoint ved -15 cm/3 h og ændrer i de koordinatfrie referencescenarier slutscoren højst 1 point. Det er en versionsbundet ejer-/ekspertprior om mulig eksponering eller koncentration bag revle/i rende. Modellen hævder hverken at observere en lokal revle/rende eller at bevise, at rav er tabt ud af surfzonen.

## Producent-/forbrugermatrix og plug-and-play-gate

| Led | Producent i 4.0.305 | Forbrugere | Krav i samme leverance | Bevis |
|---|---|---|---|---|
| DMI/Copernicus input og proveniens | DMI bulk, målrettet Copernicus, `update-weather` | state, score, pile, audits | Uændret DMI-first, samme U/V-identitet, ingen rå nye offentlige felter | DMI-/proveniens- og 673-gates |
| Modelberegning | `ravscore-candidate-g.js` | produktionsgenerator, lokal score, audits | **Lukket i kode:** `ravscore-next-generation.js`, ét model-id; Candidate G kun intern sammenligningsreference | grøn enheds-, scenarie-, ablations- og strukturtest |
| State og migration | `ravscore-candidate-g-state-pipeline.js` | runtimebyg, checkpoint, recovery, shadow | **Lukket i kode:** schema 3; kontrolleret import af kompatibel compact evidence; afvis blandet model/state | grøn split-run, old→new, rollback og poison-tests |
| Central profil | `ravscore-profile-switch.js`, admin-dokument | generator, admin, releasegate | **Lukket i kode:** schema 3 med nyt model-id som eneste aktive/offentlige; ingen legacy-scorefallback | grøn central readback og profiltest; live readback afventer produktion |
| 210/673 runtime | `update-weather`, public-condition generators | manifest/startup/details | **Integreret:** 210 zoner/673 dele, lokal missing, samme timesammenhæng | syntetisk/fixtureaudit grøn; frisk national runtimeaudit afventer produktion |
| Startup/detaljer/hashes | public conditions + manifest | data service, app startup, recovery | **Lukket i kode:** minimal startup bevares; detaljer bærer ny forklaring; hashes/dataset-id atomiske | grøn projektion-, hash-, closure- og recoverytest; offentlig måling afventer |
| Aktuelle ranglister | zone ranking/app | kort og Bedste områder | Kun tilgængelig ny model, modekorrekt, ingen legacy | 420 aktuelle visninger |
| Bedste tidspunkt | best-time selector | zonepanel/assistent | Samme nye score og samme tie/context; vandstand må ikke skjult ændre modelscore | consistency-test |
| Femdøgnsvisning | app/local zone score | fem dagsfaner | Ny model for hver time/mode, lokal missing | 2.100 visninger |
| Strand/waders | huntability + projection | lister, detaljer, ture | Fælles fysisk mulighed, separat jagtbarhed og wadersloft | mode-/grænsetest |
| DA/DE/EN | `i18n.js`, læringsmoduler | offentlig UI | **Lukket i kode:** nye led, limitations, faldende vand og missingtekster; ingen aktiv 20/50/30-påstand | grøn i18n-, lærings- og huntabilitytest |
| Lokal Spørg RavRadar | `rav-assistant.js`, knowledge JSON | dialog | Deterministiske svar bruger nyt id/semantik/evidens-id'er | lokale evals uden netværk |
| Edge-assistent | knowledge JSON + Edge function | fjernsvar | Samme offentlige allowlist/version; ingen privat/raw kontekst | Edge selftest + live DA/DE/EN |
| Konto/ture/observationer | trip adapter/observation service/Edge | immutable snapshots og senere analyse | **Lukket i kode:** model-id, state-/forklaringsversion og komponentsemantik; ældre snapshots læsbare | grøn schema-, mapping-, consumer-binding- og privacytest |
| Admin | dashboard/profile/persistence | drift og availability | Nyt model/state-id, lokale fejlårsager, migration/rollbackstatus; ingen rå U/V/koordinater | admin roundtrip/readback |
| Ekspertflade | håndbog/review | ekspertbrugere | Ny årsagsmodel og usikkerhedsgrænse; ingen regelværksted-genoplivning | handbook-/permission-tests |
| Markdown- og webhåndbog | `HANDBOOK-RAVRADAR.md`, `docs/handbook/*` | mennesker/central merge | Samme aktuelle formel, forklaring, evidens og begrænsning | identitet/plain-language-tests |
| Scheduler/workflow | `update-and-deploy.yml` | produktion | Ny state/checkpoint/recovery og faktisk runtimeaudit før gates/deploy | workflowkontrakt og step-status |
| Audits/releasegates | score-, shadow-, release-scripts | CI/produktion | **Lukket i kode:** nyt model-id, 210/673, forklaringsrekonstruktion, migration og ingen offentlig Candidate G | lokale måltests grønne; exact-head + frisk fuld gate afventer |
| Desktop/mobilbrowser | Pages artifact | slutbrugere | Kort, top-5, detaljer, fem dage, assistent, konto og Om-retur bevares | fuld desktop + 390×844 audit |

Matrixen er en acceptgate. En række kan kun lukkes med et konkret test-, diff-, CI-, produktions- eller browserbevis; filtilstedeværelse alene er ikke nok.

## Lukkede designvalg og resterende bevis

- Geometrisk middel er valgt, fordi både supply og mobilisering er nødvendige, og ablation giver eksakt nul uden hvert led. Det er en strukturel modelbeslutning, ikke en fundfit.
- Bølge-nærkyststøtten er begrænset til højst 20 % reduktion og genbruger ikke energien som bonus. Missing retning bruger et synligt neutralt midpoint.
- Faldende vand bruges kun som bounded jagtbarhed/søgefokus. Det kan repræsentere eksponering eller koncentration bag revle/i rende, men ikke lokal surfzonetransport eller bevis for udtømning.
- State-migration genbruger kun verificeret kompakt strøm- og mobiliseringsevidens og genberegner alle nye afledte led under det nye model-id.
- 288 koordinatfrie scenarier giver rangkorrelation 0,871988 mod Candidate G, nul ved supply-/mobiliseringsablation, glat positiv dæmpning gennem den gamle 13-timers grænse og højst 1 points vandstandsændring i referencesweepet. Se `RAVSCORE_NEXT_GENERATION_OFFLINE_EVIDENCE_2026-08-28.md`.
- Resterende acceptbevis er seneste-main-integration, exact-head CI, frisk 210/673-produktion, full releasegate og offentlig desktop/mobilkontrol. Ingen empirisk fundpræcisionspåstand må tilføjes.
