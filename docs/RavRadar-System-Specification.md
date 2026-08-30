# RavRadar – gældende systemspecifikation

Denne specifikation skelner mellem den produktionsverificerede offentlige baseline 4.0.308 og den lokalt implementerede integrerede RavScore-releasekandidat. Candidate G forbliver den eneste offentlige model indtil ét atomisk cutover efter grøn exact-head-kontrol, frisk produktion og offentlig mobil-/desktopkontrol. Derefter er `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0` den eneste offentlige model, mens Candidate G ligger privat som migrations-/offline-/rollback-orakel. Kun en senere manuel, fuldt verificeret hel rollback kan gøre Candidate G til den ene offentlige model igen; den er aldrig samtidig eller automatisk fallback. RDKS er fortsat bindende ved konflikt.

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

Ved cutover overtager den integrerede model samme 20/50/30-hovedvægtning som én samlet model med stateversion `4.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1` og profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3`. `modelContractSha256` binder parameterkontrakten, mens `modelBundleSha256` binder mindst 34 kanonisk normaliserede transitive implementeringsfiler. De endelige værdier må først dokumenteres efter regeneration på den afsluttede head.

Den samlede beregning ligger i `js/core/ravscore-integrated.js`, gridstrømsforløbet i `js/core/ravscore-current-supply-memory.js`, bølgetilstanden i `js/core/ravscore-wave-mobilisation-state.js` og state-/migrationssamlingen i `js/core/ravscore-integrated-state-pipeline.js`.

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

RavRadar har hverken lokal batymetri eller en bølgeopløst surfzonemodel. Derfor er aflejring, retention, revlefangst og eksport gennem render strukturelt uopløst og score-neutral. `delivery = transportPotential × 1` betyder ingen estimeret scoreeffekt; det er ikke en påstand om 100 % fysisk levering.

Faldende vand kan både ledsage søværts bevægelse af noget mobilt rav og blotlægge eller koncentrere allerede afleveret rav bag revler. Vandstand giver derfor 0 direkte scorepoint og bruges kun som synlig kontekst samt modelbundet tie-break. Modellen er fysisk motiveret og mekanisk regressionstestet, men den må ikke kaldes empirisk mere fundpræcis uden et repræsentativt tur- og fundgrundlag.

Vandstandstrend omsættes ikke til en ekstra “hele vandsøjlen”-strøm og interpoleres ikke med gridstrømmen. DKSS' og Copernicus' current-U/V er fysiske modeludfald med deres egen forcing og proveniens; de er ikke en procesopdeling. En ekstra strøm afledt af vandstanden kan derfor dobbeltregne et korreleret signal uden at opløse lokal surfzonecirkulation.

## Data og lokal geografi

- Hver aktiv kyststrækning har et havpunkt og et landpunkt, der fastlægger den lokale retning mod land.
- Aktuelle strømdata rekonstrueres eller interpoleres ikke.
- DMI-strøm accepteres inden for den normale lokale afstandskontrakt.
- Copernicus Baltic/AMM15 kan anvendes inden for den dokumenterede afstandskontrakt.
- Kun de otte godkendte `dkss_lf`-proxyer må bruge den særskilte 15 km-kontrakt. Proxyen skal have samme eksakte tidspunkt; en allerede dokumenteret `READY`-tilstand må højst holdes tre timer og må bruges af Candidate G uden et nyt aktuelt strømfelt. Det må ikke opfinde eller vise U/V, strømstyrke, retning, alignment eller pil. Almindelig uverificeret eller for gammel strøm lukker fortsat lokalt.
- Manglende nødvendigt input eller en inkompatibel state lukker den berørte kyststrækning, søgemåde og time fail-closed. Før cutover fortsætter øvrige zoner på Candidate G; efter cutover fortsætter de på den integrerede model. Der opfindes ingen erstatningsscore.
- Uændrede punktmål bevarer deres historik på tværs af produktionskørsler. Flyttes et hav- eller landpunkt, nulstilles kun historikken for det ændrede punktmål.
- Den integrerede schema-4-state dannes ved en engangsmigration fra den verificerede Candidate G/schema-2-state og de allerede hentede, validerede vejrforløb. Recovery vælger eksklusivt eksakt point-aktivering → gyldig integreret continuation → gyldigt checkpoint → dybt valideret Candidate G-state. En ugyldig exact point-aktivering stopper straks; en ugyldig ordinær kandidat må ikke skygge for en gyldig lavere prioritet. Den kræver ikke flere dages ny historikhentning, kunstig historik eller en parallel offentlig opvarmningsmodel.
- Efter migrationen lever state og recovery i den private syvfilers runtime eller et beskyttet checkpoint. Hver continuation-state, checkpointet og den centrale profilselection skal matche den fulde 11-feltsbinding. Den fulde komprimerede bundle ligger i den ikke-offentlige Supabase Storage-bucket `ravradar-private-production-runtime`; et beskyttet pointerdokument bevarer kun current + previous, og anonym adgang skal være afvist. Hvis ingen statekilde findes for en kystdel, genafspiller den før sin første offentlige targettime præcis de 48 allerede hentede, private og proveniensverificerede kildetimer target−48 h til target−1 h med strøm og bølger. Offentlige eller syntetiske pre-target-rækker må ikke blive historik. Komplette data giver `READY` ved første offentlige target; en manglende eller ugyldig kilde stopper build/release med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING` frem for 48 timers offentlig opvarmning. Checkpointets operationelle dokumentnøgle kopieres ikke fremover til `admin_document_versions`, men migrationen bevarer alle eksisterende versionsrækker og udfører ingen destruktiv oprydning. Den varme Candidate G-projektion kan kun ligge privat som `ravScoreCandidateGRollback` i den fulde runtime. De offentlige startup-, detalje-, state- og manifestprojektioner er fortsat dataminimerede og hashbundne.

## Produktionskæde

1. Centralt gemt administratorgeometri, routing og profilvalg hydreres.
2. Seneste verificerede Candidate G-state eller integrerede schema-4-state hentes efter modelversionen.
3. De allerede hentede, validerede DMI-/Copernicus-forløb genbruges ved migrationen; frisk produktion supplerer efter den normale provenance- og tidskontrol.
4. Score, forklaringer, ranglister, bedste tidspunkt og offentlige projektioner beregnes for 210 zoner og 673 kystdele.
5. Kildevalidering, fuld produktionsvalidering og releasegate skal bestå.
6. Det offentlige artifact deployes atomisk og verificeres på den mergede commit i både mobil- og desktopbrowser.

Supabase, Edge og Pages deler ikke én fysisk transaktion. Den synlige overgang er derfor låst i to faser. Først anvendes `20260829010000_ravscore_operational_documents_no_history.sql` og derefter `20260829020000_integrated_trip_calibration_binding.sql`; protected readiness binder begge efter samlet migrationsmetadata-, database- og Edge-readback. Den første migration stopper fremtidig versionskopiering for de allowlistede operationelle dokumenter, men sletter ingen eksisterende `admin_document_versions`-rækker. Efter dry-run genverificerer backendworkflowet `origin/main == GITHUB_SHA` umiddelbart før første eksterne skrivning og fortsætter alle post-write-trin fra samme checkout og migrationssnapshot. Backend/Edge verificeres bindingsbevidst, mens Candidate G stadig er offentlig. Manglende eller forkert requestbinding giver eksakt HTTP `409`, så gammel klient bruger lokal Candidate G uden servermodelmix. Derefter vælges præcis én statekilde i rækkefølgen eksakt point-aktivering → gyldig integreret privat continuation → gyldigt integreret checkpoint → engangs-Candidate G-import, og exact-head-artifactet valideres.

Første cutover er `INITIAL_INTEGRATED_CUTOVER`, push-only og bruger controller-CAS med `expectedVersion=0`. Controlleren observerer først Candidate G's kanoniske Pages-manifest og skriver derefter `INTEGRATED_PENDING` med kilde-/målbinding og kilde-/målmanifesthash. Den centrale profil forbliver Candidate G, mens det integrerede Pages-artifact deployes. Først efter offentlig verifikation af den eksakte implementeringsbinding og 210/673 sætter én service-role-RPC samtidigt `INTEGRATED_ACTIVE` og den centrale profil til den integrerede 11-feltsbinding. Ved retry giver live målhash fuld genverifikation og complete; live kildehash abort/rekonsolidering til kildens aktive profil; en tredje hash bevarer `PENDING` og blokerer normal drift. Der deployes ingen særskilt Candidate G-assistent-Edge.

En operationel Candidate G-helrollback bruger controlleren `ravscore-operational-model-activation`/`ravscore-operational-model-activation-v3`, id `integrated-schema4-to-candidate-g-schema2-v1`, `transitionKind=CANDIDATE_G_ROLLBACK` og samme durable source/PENDING/target/reconcile-kontrakt. Den er manual-only og går fra `INTEGRATED_ACTIVE` via `CANDIDATE_G_PENDING` til verificeret `CANDIDATE_G_ACTIVE`. En manuel tilbagevenden bruger `INTEGRATED_RETURN` og `INTEGRATED_PENDING`. Scheduleren kan hverken førstegangsaktivere, rollbacke eller returnere; den kan kun udføre `CANDIDATE_G_REFRESH` for en allerede `CANDIDATE_G_ACTIVE` drift med uændret eksakt binding. Enhver `PENDING` stopper normale deploys. Pages-overlayet og den centrale binding bliver derfor først Candidate G samtidigt, efter at Candidate G-Pages er eksakt offentligt verificeret. Assistentens integrerede Edge afviser Candidate G-bindingen med eksakt `409`; klienten bruger da de eksisterende deterministiske lokale DA/DE/EN-svar. Schema 3 accepterer kun eksakt integreret eller forseglet Candidate G-11-feltsbinding. Candidate G er altid `calibration_eligible=false`; ukendt eller forfalsket binding afvises i delt validator og SQL. Konto-DTO'en bærer kun privacy-sikker eksakt `model_binding`, og Pages udleder current/historical/ineligible på ny mod det aktive overlay uden at omskrive turens binding. Det er en tilsigtet fail-closed/local-only rollback, ikke en Edge/backend-helrollback eller skjult dualmodel. Candidate G's separate kontrakt- og bundlefingeraftryk fastsættes først efter slutregeneration.

## Administratorfunktioner

Adminfladen kan blandt andet kontrollere datakvalitet, vandstandsstationer, zoner, kystlinjer, hav-/landretning, observationer, læringsdækning, eksperter, håndbog og systemstatus.

Det tidligere Regelværksted er pensioneret. Centralt gemte regeludkast slettes ikke, men indlæses ikke som aktive adminfunktioner, publiceres ikke og påvirker ikke RavScore. Ekspertviden indsendes via håndbogens review og kan kun ændre scoren gennem kode, RDKS, tests, pull request og deployment.

## Brugerdata og læring

Supabase håndterer login, profiler, rettigheder, rate limit og den offentlige Edge-gateway. Normale ture og fund gemmes i ti EU-låste Cloudflare D1-shards med HMAC-pseudonym; Cloudflare modtager ingen rå bruger-id, mail, navn, JWT, GPS eller rute. Supabase-tabellen er migrationskilde og eksplicit manuel rollback uden normal dual-write. Turens relevante, allowlistede vejrsnapshot kan gemmes til senere pseudonymiseret analyse. Se DEC-0082.

Læringsmodulet måler aktuelt kun datadækning. Det ændrer ikke automatisk vægte, regler, zoner eller score. En fremtidig kalibrering kræver dokumenteret søgeindsats, uforanderligt forecastlink, tidsmæssig test, geografisk hold-out og en særskilt RDKS-godkendelse. Observationer bundet til en operativ Candidate G-rollback er altid udelukket fra kalibrering.

## Sandhedskilder

Ved konflikt gælder: ejerens aktuelle instruktion, derefter aktiv RDKS-beslutning, verificeret kodeadfærd, håndbog og changelog. Administratorens centralt gemte redigerbare geometri og routing er runtime-sandhed og må ikke erstattes af historiske hardcodede værdier.
