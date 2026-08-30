# RavRadar – gældende systemspecifikation

Denne specifikation skelner mellem den offentlige 4.0.316/Candidate G-baseline og den lokalt implementerede RavScore state-6-releasekandidat. Candidate G forbliver den eneste offentlige model indtil ét atomisk cutover efter grøn exact-head-kontrol, merge, frisk produktion og offentlig mobil-/desktopkontrol. Derefter er `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0` den eneste offentlige model, mens Candidate G ligger privat som migrations-/offline-/rollback-orakel. Kun en senere manuel, fuldt verificeret hel rollback kan gøre Candidate G til den ene offentlige model igen; den er aldrig samtidig eller automatisk fallback. RDKS, DEC-0110 og DEC-0112 er bindende ved konflikt.

Releaseversionens topfelt synkroniseres automatisk i de to beskyttede geodatafiler under en stående ejergodkendelse, men kun når særskilt diffkontrol beviser, at intet andet geodata ændres.

## Offentlig projektinformation

- Forsidens topmenu linker til `about.html` ved konto, tur og Rav-assistent.
- Siden forklarer ejer, formål, fravær af fundgaranti, forskellen mellem RavScore og landsdelens grundpotentiale samt nødvendige modelkompromiser.
- Kontakt bruger et `mailto`-link. Frivillig støtte bruger MobilePay Box `4214MX` med synligt link og lokalt genereret QR-kode. Der indsamles ingen nye brugerdata.
- Ejerbilleder leveres som responsive WebP-varianter. Siden har pc- og mobillayout og er en del af service-workerens versionsstyrede appskal.
- Informationssiden påvirker ikke Candidate G, score, runtime-data, geografi eller administration. Se DEC-0076.

## Offentlig scoremotor og atomisk cutover

Den senest produktionsverificerede side anvender Candidate G som eneste offentlige scoreprofil:

- søgeforhold: 20 %;
- transport mod kysten: 50 %;
- rav i bevægelse: 30 %.

Den gamle 25/40/35-profil er ikke en offentlig fallback. `legacyPublicFallbackAllowed` er `false`, og der findes ingen rollbackprofil i den offentlige profilvælger. Den integrerede kandidat eksponeres ikke som offentlig shadowmodel før cutover.

Ved cutover overtager den integrerede model samme 20/50/30-hovedvægtning som én samlet model med stateversion `6.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5`, komponent `ravscore-components-huntability-delivery-mobilisation-bounds-v5`, forklaring `ravscore-explanation-integrated-bounds-v5`, rangering `direction-broad-19-history-tie-v2` og bedste tidspunkt `score-history-water-tie-earliest-v3`. Numerisk score vælges først; `FULL_HISTORY` vinder kun et eksakt scoretie, hvorefter de eksisterende retnings-/vand-/tidsregler anvendes. Den aktive 11-feltsbinding er `modelContractSha256=778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7` og 43-filers `modelBundleSha256=74bfc42bb008f6743f374fc35201d3ea6f81f6e360c99873541fed83eeadcbae`. Den første hash binder parameterkontrakten; den anden binder den kanonisk normaliserede transitive implementeringslukning.

State 6 skelner mellem `FULL_HISTORY`, `HISTORY_INCOMPLETE` og `UNAVAILABLE`. Ved gyldige direkte scoretimeinput omsluttes manglende ældre currenthistorik under det samme aktive 48-timersvindue, wave-mobiliseringens usikkerhedshale lukkes efter 288 timer og last-mile-halen efter 40 timer. Den viste incomplete-score er lower bound; upper bound, spænd, årsager og dækning følger med. 168 timers researchretention har ingen scoreeffekt. Manglende direkte input giver fortsat `UNAVAILABLE`/`null`, og incomplete/unavailable er ikke kalibreringsegnede.

Den samlede beregning ligger i `js/core/ravscore-integrated.js`, gridstrømsforløbet i `js/core/ravscore-current-supply-memory.js`, mobilisering i `js/core/ravscore-wave-mobilisation-state.js`, bølgeapproach-EWMA'en med fire timers halveringstid i `js/core/ravscore-wave-approach-state.js`, trust i `js/core/ravscore-evidence-trust-contract.js` og state-/migrationssamlingen i `js/core/ravscore-integrated-state-pipeline.js`.

## Fysiske hoveddele

### Søgeforhold

Vurderer hvor let det er at lede på den valgte måde. Strandjagt kan bevare en høj samlet score ved kraftig vind, når transport og mobilisering er gode. Ved wadersjagt reduceres scoren trinvist over 6 m/s, fordi vindskabte krusninger gør det sværere at se gennem vandet; 15 m/s giver 0 i waders-søgeforhold.

### Transport mod kysten

Den verificerede kystnormale modelgridstrøm vurderes mod den lokale kystretning. Den er ikke en måling af lokal bundnær strøm og er heller ikke undertow, feeder-/langskyststrøm eller ripstrøm. 0,03 m/s er dødzone, og 0,15 m/s er fuld styrke. Fuld pålandsstrøm bidrager med +10 og fuld fralandsstrøm med -8 pr. effektiv time. Evidens vægtes fuldt i 24 timer og cosinusdæmpes til nul ved 48 timer.

Et langt stærkt fralandsforløb kan gøre transportleddet 0, men der findes ingen 13-timers gate, som nulstiller hele RavScore. Et transportled på 0 betyder manglende positivt gridstrømsbevis i vinduet; det beviser ikke, at kystens ravlager er tømt.

### Rav i bevægelse

Vurderer om bølgeenergi kan have løsnet eller genmobiliseret tilgængeligt rav. `Hs² × T` bygger en tilstand med cirka fire timers opbygningshalveringstid og cirka 48 timers aftagningshalveringstid. Bølgeorbitaler holdes begrebsligt adskilt fra modelgridstrøm og surfzonens cirkulation.

Bølgehøjden har også en særskilt rolle i søgeforhold. Mobiliseringsvejen er et tidsligt fysisk signal i 30 %-komponenten; jagtbarhedsvejen er aktuel metode-/sigtbarhed i 20 %-komponenten og kan ikke give mobiliserings-, transport- eller last-mile-kredit. En ru sø kan derfor både øge mobilisering og reducere søgeeffektivitet uden at samme positive procesbidrag tælles to gange.

### Sidste mile og vandstand

Den tekniske sidste-mile-proxy bruger en kausal energivægtet bølgeapproach med fire timers halveringstid, afledt som `W/N/T` med en ældre hale. DMI-WAM leverer retningen som `FROM`; den roteres præcis én gang +180° til `TOWARD` og sammenholdes med den uændrede eksisterende kystnormal. `normalAlignment` er det energivægtede normalmoment divideret med aktivitet, `approach=clamp((normalAlignment+0,25)/1,25,0,1)`, `factor=clamp(1-0.15×W×(1-approach),0.85,1)` og `delivery=supply×factor` anvendes præcis én gang. Bølger kan aldrig skabe eller øge supply. Faktoren er 0,85–1,00, så den rå totalscore højst dæmpes 7,5 point før slutafrunding; den viste heltalsscore kan derfor ændres 8 point. Aktiv energibærende retningsmissing fejler lukket. Kun `waveHeightM=0` er eksakt calm og neutral; `wavePeriodS` skal stadig være finit og ikke-negativ. `waveHeightM>0` med `wavePeriodS=0` er `INVALID` og fejler lukket.

RavRadar har hverken dynamiske lokale revler, lokal opløst batymetri eller en bølgeopløst surfzonemodel. Derfor er den fysiske aflejring, retention og eksport stadig uopløst: `physicalDeliveryResolved=false` og fysisk interval er `null`. [DDM 2024/v2](https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel) er et 50 × 50 m statisk middelgrid med dybde/kilde/opmålingsår, prioriteret moderne søopmåling og også lavtvandsdata fra satellit/lidar. Fravalget som scoreinput skyldes ikke manglende lavtvandsdata, men interpolerede utilstrækkeligt dækkede celler, generaliseret 1:100.000-kystlinje og fravær af dynamiske revler, aktuelle ripkanaler og bølgeopløst surfzone. Rainville m.fl. 2026 bruges kun som buoyant-object-analogi, ikke som ravkalibrering. Ingen geometri, kystnormal eller land-/vandpunkter flyttes.

Faldende vand kan både ledsage søværts bevægelse af noget mobilt rav og blotlægge eller gøre allerede afleveret/fastholdt rav bag revler lettere at afsøge i et mindre område. Vandstand giver derfor 0 direkte scorepoint og bruges kun som synlig kontekst samt modelbundet tie-break. Modellen er fysisk motiveret og mekanisk regressionstestet, men den må ikke kaldes empirisk mere fundpræcis uden et repræsentativt fund-/nulgrundlag.

Vandstandstrend omsættes ikke til en ekstra “hele vandsøjlen”-strøm og interpoleres ikke med gridstrømmen. DKSS' og Copernicus' current-U/V er fysiske modeludfald med deres egen forcing og proveniens; de er ikke en procesopdeling. En ekstra strøm afledt af vandstanden kan derfor dobbeltregne et korreleret signal uden at opløse lokal surfzonecirkulation.

## Data og lokal geografi

- Hver aktiv kyststrækning har et havpunkt og et landpunkt, der fastlægger den lokale retning mod land.
- Aktuelle strømdata rekonstrueres eller interpoleres ikke.
- DMI-strøm accepteres inden for den normale lokale afstandskontrakt.
- Copernicus Baltic/AMM15 kan anvendes inden for den dokumenterede afstandskontrakt.
- Kun de otte godkendte `dkss_lf`-proxyer må bruge den særskilte 15 km-kontrakt. Proxyen skal have samme eksakte tidspunkt; en allerede dokumenteret `READY`-tilstand må højst holdes tre timer og må bruges af Candidate G uden et nyt aktuelt strømfelt. Det må ikke opfinde eller vise U/V, strømstyrke, retning, alignment eller pil. Almindelig uverificeret eller for gammel strøm lukker fortsat lokalt.
- Manglende eller ugyldigt direkte input lukker den berørte kyststrækning, søgemåde og time som `UNAVAILABLE`. Mangler kun ældre historik, fortsætter den integrerede state-6-model med konservativ lower/upper og synlig `HISTORY_INCOMPLETE`; der opfindes ingen inputværdi eller erstatningshistorik.
- Feggesund/`DK-B05-11` har 118/118 wave-missing i sanitiseret parent-zone-forecast `rr-20260830104132-210`, men de tre aktive kystdele findes, har `marineCoverage=full`, og Candidate G-current er tilgængelig for strand/waders. Frisk integrated produktion skal derfor først bevise de tre part-level-seriers 118 timer. Kun ved et reelt part-level-hul og dokumenteret umulig korrekt direkte DMI/egnet officiel data må den ejerautoriserede konservative nabozonehypotese for præcis denne ene zone vurderes under en særskilt fuld RDKS-/kilde-/usikkerheds-/drifts-/rollbackkontrakt. Ingen proxy er implementeret, og faktisk direct missing forbliver `UNAVAILABLE`.
- Uændrede punktmål bevarer deres historik på tværs af produktionskørsler. Flyttes et hav- eller landpunkt, nulstilles kun historikken for det ændrede punktmål.
- Den integrerede state 6 dannes ved Candidate G-engangsmigrationen `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`. Kun Candidate G's signerede, allerede afledte kystnormale currentevidens genvægtes; migrationen læser/kopierer ikke rå U/V og påstår ikke lighed med en rå genberegning. Den aldrig-offentlige schema-5-kandidat kan kun migreres fra eksakt `READY` gennem `integrated-schema5-ready-point-to-schema6-history-bounds-v1` med de fastlåste historiske hashes.
- Før Candidate G-cutover skal præcis 673 validerede schema-2-states passe til det uforanderlige kystdelsregister og give ét fælles kanonisk target. Wave-approach genopbygges fra 40 private præ-target-positioner i ét sammenhængende DMI WAM-run pr. anvendt collection med same-cell native provenance. Kun et WAM-gap mellem native endepunkter højst fire timer fra hinanden må interpoleres, og kun i samme run, collection, gitter og celle. Den udeladte EWMA-hale er højst `1/1024`, og den konservative rå-scorefejl er højst `0.01171875` før afrunding. Mixed target, invalid state eller utilgængeligt coherent run stopper fail-closed, så Candidate G forbliver offentlig. Der dannes ingen syntetisk eller offentlig historik.
- Ægte state-6-cold start bruger `bounded-private-48h-history-cold-replay-v3` og genafspiller 0–48 faktisk tilgængelige private, proveniensverificerede timepositioner plus den reelle targetrække. Lineage fører `expectedCausalPositionCount=48`, faktisk complete/unknown-count og `historyTransition`; 48/48 er `VERIFIED_CAUSAL_HISTORY_WINDOW`, kortere/gappede forløb `UNKNOWN_HISTORY_INTERVAL`. Alle disse forløb er `HISTORY_INCOMPLETE`, også ved 48 timer; `FULL_HISTORY` kommer først efter 288 timers kausal conservative tail reset eller attestert migration/continuation. Den samme afgrænsede WAM-interpolation må bruges inden for identisk run/collection/grid/celle; strøm, offentlig historik og same-model nøddrift interpoleres ikke.
- Efter migrationen lever state og recovery i den private hashbundne runtime eller et beskyttet state-6-checkpoint. Hver continuation-state, checkpointet og den centrale profilselection skal matche den fulde 11-feltsbinding. Candidate G-rollback `integrated-schema6-to-candidate-g-schema2-v3` beregnes fra samme targettid og må ikke bruge samme time som ekstra recovery-credit. Schema 5 er ikke cache eller normal recovery efter migrationen. Den varme projektion ligger kun privat som `ravScoreCandidateGRollback`. Under manuel rollback må kun en eksakt navngiven `READY`/`memoryReady` Candidate G-runtime projicere sin egen mode-score som `FULL_HISTORY` + `EXACT_POINT_SCORE` med collapsed bounds, span 0, coverage 48, tomme reasons og reset false. Non-READY/mismatch stopper; `calibrationEligible=false` består separat. De offentlige startup-, detalje-, state- og manifestprojektioner er fortsat dataminimerede og hashbundne.
- Nøddrift accepterer kun en komplet, atomisk og hashbundet continuation fra samme integrerede model i højst 72 timer eller kortere forecastudløb. Cross-model fallback og interpolation er forbudt. Kun `VERIFIED_ONLY` er kalibreringsegnet; reconstructed/emergency og ture er ikke kalibreringsgrundlag. Den planlagte fiktive udførelse af morgenhullet blev opgivet før descriptor/apply/mutation/publicering; DEC-0109 bevares kun som historisk sikkerhedskontrakt.

## Produktionskæde

1. Centralt gemt administratorgeometri, routing og profilvalg hydreres.
2. Seneste verificerede Candidate G-state eller integrerede state-6 hentes efter modelversionen; en eksakt aldrig-offentlig state-5-`READY` kan kun bruges i den særskilte 5→6-migration.
3. De allerede hentede, validerede DMI-/Copernicus-forløb genbruges ved migrationen; frisk produktion supplerer efter den normale provenance- og tidskontrol.
4. Score, forklaringer, ranglister, bedste tidspunkt og offentlige projektioner beregnes for 210 zoner og 673 kystdele.
5. Kildevalidering, fuld produktionsvalidering og releasegate skal bestå.
6. Det offentlige artifact deployes atomisk og verificeres på den mergede commit i både mobil- og desktopbrowser.

Supabase, Edge og Pages deler ikke én fysisk transaktion. Den synlige overgang er derfor låst i to faser. Først anvendes `20260829010000_ravscore_operational_documents_no_history.sql` og derefter `20260829020000_integrated_trip_calibration_binding.sql`; protected readiness binder begge efter samlet migrationsmetadata-, database- og Edge-readback. Den første migration stopper fremtidig versionskopiering for de allowlistede operationelle dokumenter, men sletter ingen eksisterende `admin_document_versions`-rækker. Efter dry-run genverificerer backendworkflowet `origin/main == GITHUB_SHA` umiddelbart før første eksterne skrivning og fortsætter alle post-write-trin fra samme checkout og migrationssnapshot. Backend/Edge verificeres bindingsbevidst, mens Candidate G stadig er offentlig. Manglende eller forkert requestbinding giver eksakt HTTP `409`, så gammel klient bruger lokal Candidate G uden servermodelmix. Derefter vælges præcis én statekilde i rækkefølgen eksakt point-aktivering → gyldig integreret privat continuation → gyldigt integreret checkpoint → engangs-Candidate G-import, og exact-head-artifactet valideres.

Første cutover er `INITIAL_INTEGRATED_CUTOVER`, push-only og bruger controller-CAS med `expectedVersion=0`. Controlleren observerer først Candidate G's kanoniske Pages-manifest og skriver derefter `INTEGRATED_PENDING` med kilde-/målbinding og kilde-/målmanifesthash. Den centrale profil forbliver Candidate G, mens det integrerede Pages-artifact deployes. Først efter offentlig verifikation af den eksakte implementeringsbinding og 210/673 sætter én service-role-RPC samtidigt `INTEGRATED_ACTIVE` og den centrale profil til den integrerede 11-feltsbinding. Ved retry giver live målhash fuld genverifikation og complete; live kildehash abort/rekonsolidering til kildens aktive profil; en tredje hash bevarer `PENDING` og blokerer normal drift. Der deployes ingen særskilt Candidate G-assistent-Edge.

En operationel Candidate G-helrollback bruger controlleren `ravscore-operational-model-activation`/`ravscore-operational-model-activation-v3`, id `integrated-schema6-to-candidate-g-schema2-v3`, `transitionKind=CANDIDATE_G_ROLLBACK` og samme durable source/PENDING/target/reconcile-kontrakt. Den er manual-only og går fra `INTEGRATED_ACTIVE` via `CANDIDATE_G_PENDING` til verificeret `CANDIDATE_G_ACTIVE`. En manuel tilbagevenden bruger `INTEGRATED_RETURN` og `INTEGRATED_PENDING`. Scheduleren kan hverken førstegangsaktivere, rollbacke eller returnere; den kan kun udføre `CANDIDATE_G_REFRESH` for en allerede `CANDIDATE_G_ACTIVE` drift med uændret eksakt binding. Enhver `PENDING` stopper normale deploys. Pages-overlayet og den centrale binding bliver derfor først Candidate G samtidigt, efter at Candidate G-Pages er eksakt offentligt verificeret. Assistentens integrerede Edge afviser Candidate G-bindingen med eksakt `409`; klienten bruger da de eksisterende deterministiske lokale DA/DE/EN-svar. Schema 3 accepterer kun eksakt integreret eller forseglet Candidate G-11-feltsbinding. Candidate G er altid `calibration_eligible=false`; ukendt eller forfalsket binding afvises i delt validator og SQL. Konto-DTO'en bærer kun privacy-sikker eksakt `model_binding`, og Pages udleder current/historical/ineligible på ny mod det aktive overlay uden at omskrive turens binding. Det er en tilsigtet fail-closed/local-only rollback, ikke en Edge/backend-helrollback eller skjult dualmodel. Candidate G's separate 54-filers binding er `modelContractSha256=c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8` og `modelBundleSha256=fd3f7e70ec3706818c153c26140ae592e4f0ad2acc6c157183984689f74a2207`.

## Administratorfunktioner

Adminfladen kan blandt andet kontrollere datakvalitet, vandstandsstationer, zoner, kystlinjer, hav-/landretning, observationer, læringsdækning, eksperter, håndbog og systemstatus.

Det tidligere Regelværksted er pensioneret. Centralt gemte regeludkast slettes ikke, men indlæses ikke som aktive adminfunktioner, publiceres ikke og påvirker ikke RavScore. Ekspertviden indsendes via håndbogens review og kan kun ændre scoren gennem kode, RDKS, tests, pull request og deployment.

## Brugerdata og læring

Supabase håndterer login, profiler, rettigheder, rate limit og den offentlige Edge-gateway. Normale ture og fund gemmes i ti EU-låste Cloudflare D1-shards med HMAC-pseudonym; Cloudflare modtager ingen rå bruger-id, mail, navn, JWT, GPS eller rute. Supabase-tabellen er migrationskilde og eksplicit manuel rollback uden normal dual-write. Turens relevante, allowlistede vejrsnapshot kan gemmes til senere pseudonymiseret analyse. Se DEC-0082.

Læringsmodulet måler aktuelt kun datadækning. Det ændrer ikke automatisk vægte, regler, zoner eller score. En fremtidig kalibrering kræver dokumenteret søgeindsats, uforanderligt forecastlink, tidsmæssig test, geografisk hold-out og en særskilt RDKS-godkendelse. Observationer bundet til en operativ Candidate G-rollback, reconstructed/emergency-evidens eller almindelige ture uden selvstændigt fund-/nulgrundlag er udelukket fra kalibrering.

## Sandhedskilder

Ved konflikt gælder: ejerens aktuelle instruktion, derefter aktiv RDKS-beslutning, verificeret kodeadfærd, håndbog og changelog. Administratorens centralt gemte redigerbare geometri og routing er runtime-sandhed og må ikke erstattes af historiske hardcodede værdier.
