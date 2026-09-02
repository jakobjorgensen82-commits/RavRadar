# Candidate G — analytisk genbrugsklassifikation

- **Dato:** 2026-08-30
- **Status:** Implementeret klassifikation for den samlede state-6-kandidat. 4.0.317 bestod PR #235-exact-head og blev merged som `a584d1cf`, men produktion `33333490853` stoppede sikkert før mutation/deploy på en for streng 673-`READY`-forudsætning. 4.0.319 lukker first-cutover lokalt; Candidate G er fortsat offentlig i 4.0.316. Seneste offentlige Candidate G-evidens er grøn `33347230240`/`rr-20260831012407-210` 210/673, mens frisk produktion og offentligt cutover af state 6 ikke er gennemført
- **Offentlig model under arbejdet:** Candidate G
- **Autoritativ ny kontrakt:** `js/core/ravscore-model-contract.js`
- **Geodata/private data:** Ikke læst eller ændret i analysen

Den klassificerede målkontrakt er model `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5`, komponentskema `ravscore-components-huntability-delivery-mobilisation-bounds-v5` og forklaringsskema `ravscore-explanation-integrated-bounds-v5`. Candidate G-migrationen er `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5`, den historiske aldrig-offentlige state-5-kandidat kan kun migreres fra et eksakt ready-punkt gennem `integrated-schema5-ready-point-to-schema6-history-bounds-v1`, og rollback er `integrated-schema6-to-candidate-g-schema2-v3`. 4.0.319's endelige 11-feltsbinding bruger `modelContractSha256=a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b` og `modelBundleSha256=db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 transitive filer og otte deklarerede forbrugere. Den separate 56-filers Candidate G-rollbackbinding er `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0`.

## Formål og metode

Hvert aktivt Candidate G-led er vurderet som **BEVAR**, **FORBEDR**, **ERSTAT**, **FJERN** eller **UTILSTRÆKKELIG EVIDENS**. Klassifikationen sammenholder RDKS, implementering, produktionens producent-/forbrugerkæde, offline-replay og ejerens ekspertinput.

**BEVAR** betyder ikke, at en regel er en naturkonstant eller fundkalibreret. Det betyder, at den fortsat er en forsvarlig, eksplicit prior, og at der ikke foreligger bedre evidens. **UTILSTRÆKKELIG EVIDENS** betyder, at en mulig fysisk proces skal forklares som usikkerhed og ikke omsættes til et tal.

## First-cutover, cache og offentlig kontinuitet i 4.0.319

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Eksakt Candidate G/schema-2-migration ved 673 `READY`, ét target og identisk samplingkontekst | **BEVAR** | Det er den eneste situation, hvor den signerede afledte historik kan genvægtes uden at foregive kontekstkompatibilitet. Source registry og stateKeys skal være eksakt attesterede. |
| Ét blandet source/active-register som både historisk og aktuel sandhed | **FJERN** | Den offentlige Candidate G-state skal valideres mod sit eksakte offentlige kilderegister. Den aktive produktion skal valideres mod det separat materialiserede centrale register. At bruge ét stale register til begge roller kan gøre en legitim kontekstændring usynlig. |
| Enhver canonical Candidate G-warmup som fatal og flerdages blocker | **ERSTAT** | Source-attesteret, kanonisk warmup/missing er ikke kompatibel migrationsstate, men er heller ikke korruption. Hele populationen går i stedet til `genuine-cold-start` på faktisk målte, allerede hentede data og state 6 viser `HISTORY_INCOMPLETE` ved gyldige direkte input. Cold-start-WAM skal være exact native med maksimal interpolation 0; `INTERPOLATED_COLD_START` fejler lukket. |
| Legitim source→active samplingkontekstændring som migrationsgrundlag | **FJERN** | Historik fra en anden kontekst må ikke ommærkes. Den udløser aggregate measured cold start; punkter og geometri flyttes ikke af modellen. |
| Cold-startmode uden dybt valideret Candidate G-kilde | **FJERN** | Et miljøflag er ikke evidens. Malformed, reconstructed, tampered, future, unknown, identity-/populationsmismatch eller en tidligere afvist ugyldig integreret continuation/checkpoint stopper før DMI og mutation. |
| Candidate G-rollback kun fra tidligere continuation | **ERSTAT** | Ved normal migration bevares eksakt legacycontinuation. Ved attestert genuine cold start bygges rollbackgrenen eksklusivt fra sit eget målte replay og skal selv nå `READY`; hybrid med continuation/integreret state er forbudt. |
| Kanonisk UTC på tværs af Node og Python | **FORBEDR** | Aggregate-target er altid `YYYY-MM-DDTHH:00:00Z`; semantisk ens, men parser-inkompatibel `.000Z` må ikke blokere WAM efter et gyldigt valg. |
| Progressiv DMI-/WAM-cache under fejlet cutoverforsøg | **FORBEDR** | Verificeret download-/parsefremdrift checkpointes og gemmes også efter en reel producerfejl, men ikke cancellation. Genbrug skal bestå de samme run-/grid-/celle-/proveniensgates og er ikke readiness. |
| Normal Candidate G-vedligehold fra schedule/watchdog/manuelt vejrjob, mens integreret cutover afventer | **FORBEDR** | Candidate G er fortsat eneste offentlige model og må få frisk vejr. Fra rowless exact legacyprofil er `candidate-legacy-maintenance`/`LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` den særskilte tofasede schema2→schema4-bro. Markøren er varig efter complete: senere Candidate→Candidate maintenance arver same marker, exact current Candidate og fire `null`-returnfelter; `legacySourceRequired=false` følger den faktiske sourcebinding. Den må aldrig opstå ved relabel. En separat lineage efter afbrudt integreret first cutover bruger `CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER` og bevarer Candidate G-profilen samt `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`. Kun push må forsøge første integrerede cutover; vedligehold må aldrig skrive `INTEGRATED_PENDING`, aktivere state 6 eller skabe historik. |

## Score- og produktsemantik

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| RavScore som 0–100 mulighedsindeks, ikke fundprocent | **BEVAR** | Semantikken er forståelig og ærlig. Den nye kontrakt kalder scoren et modelleret kystnært rav- og søgemulighedsindeks. Ingen empirisk fundpræcision må påstås uden repræsentative fund og nul-fund. |
| Én offentlig model med fail-closed adfærd | **BEVAR** | Candidate G forbliver eneste offentlige model indtil atomisk cutover. Derefter er den integrerede model eneste offentlige scoreejer. |
| 20 % jagtbarhed, 50 % transport, 30 % mobilisering | **BEVAR** | Offline-følsomhed gav ikke grundlag for at erstatte vægtene. De er en ejer-/forskningsprior, ikke en fundkalibreret sandhed. |
| Additiv sum før waders-cap | **BEVAR** | De tre led repræsenterer forskellige evidenstyper. En multiplikativ kerne ville gøre manglende nyligt transportbevis til bevis for nul fysisk mulighed og dermed skjult sætte et ukendt lokalt lager til nul. |
| Waders-slutscore begrænset af synlig jagtbarhed | **BEVAR** | Forhindrer høj waders-score, når metoden ikke er praktisk anvendelig. Det er en metodebegrænsning, ikke en fuld sikkerhedsgate. |
| Strandscore uden jagtbarhedscap | **BEVAR** | Bevarer skellet mellem fysisk mulighed og aktuelle søgeforhold på stranden. |
| Candidate G/ny model som samtidige offentlige shadowmodeller | **FJERN** | Sammenligning skal være offline. Der må ikke eksistere to offentlige RavScore-identiteter eller delvise modeludrulninger. |
| Adaptiv offentlig model/fundchance | **FJERN** | Adaptiv modelkode må ikke være offentlig runtime eller scoreejer. Historisk/intern regressionskode kan bevares, men må ikke eje offentlig score, forklaring, model-id eller fundchance. |

## Transport og strømstate

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Verificeret gridstrøm projiceret på kystnormalen | **FORBEDR** | Det er det stærkeste eksisterende transportbevis. Candidate G’s offentligt afrundede fart/retning bevares til den eksakte rollback, men den nye state bruger den præcise private kystnormalprojektion direkte fra det proveniensbeviste U/V-par; ellers blev 0,03-grænsen kunstigt kvantiseret. Signalet skal kaldes lokal afledt gridstrøm, aldrig undertow, ripstrøm eller måling bag en revle. |
| Signeret, dataminimeret kystnormal evidens | **BEVAR** | Understøtter replay, migration og rollback uden offentlige rå U/V eller private payloads. |
| Eksisterende havpunkt, verificeret gridcelle og uændret kystnormal som aktivt samplinganker | **BEVAR** | Punktparret ejer både scoreidentitet og retning vinkelret på kysten. Modellen tilpasses dette anker; den flytter ikke land-/vandpunkter og vælger ikke en anden offshoreafstand for at få et ønsket signal. |
| Privat roterende 0/5/15-km-flerlagscache som forskningsgrundlag | **BEVAR** | De allerede downloadede DKSS-felter og højst 168 timers datasikre retention genbruges til offline lag-, lag-/afstand-, tidslags- og følsomhedsanalyse. Cachen er privat, rå vektorer publiceres ikke, og `scoreEffect=NONE`. |
| 5/15-km- eller flerlagssamples som ekstra aktiv transportscore | **UTILSTRÆKKELIG EVIDENS** | Der findes endnu ingen valideret advektiv kobling, tidslag eller landsdækkende eksakt 673 × 166-dækning, som oversætter de ydre prøver til den lokale kystdel. Et ekstra aktivt led kan blande forskellige farvandsregimer og dobbelt-tælle den gridstrøm, der allerede ejer transportpotentialet. |
| Strømnormalisering `0,03–0,15 m/s` | **BEVAR** | Fortsat eksplicit prior. Følsomhed er undersøgt, men ingen evidens begrunder et andet aktivt interval. |
| `+10` indadgående / `−8` udadgående point pr. effektiv time | **FORBEDR** | Satserne bevares, men anvendes i én kontinuerlig state med 24 timers fuld aldervægt og hævet cosinus til 48 timer. |
| Hårdt 48-timers randvindue | **ERSTAT** | Maksimal alder på 48 timer bevares, men det abrupte randtab erstattes af `FULL_24H_THEN_RAISED_COSINE_TO_48H`. |
| `outboundEpisodeEffectiveHours` som separat skjult episode | **FJERN** | Udadgående evidens reducerer transportstate direkte. En særskilt episode må ikke akkumulere over neutral/manglende evidens. |
| Candidate G’s 13-timers gate, som nulstiller hele RavScore | **FJERN** | 13 timers stærk, sammenhængende udadgående påvirkning kan fortsat bringe **transportpotentialet** til 0 gennem `−8`-raten. Det er ikke bevis for, at mobilisering, jagtbarhed eller alt lokalt rav er nul, så hele RavScore må ikke gates til 0. |
| Maksimalt 49 evidenspunkter | **FORBEDR** | Højst 49 punkter accepteres og beholdes samlet. Et reelt præ-grænse-bropunkt optager én af pladserne. En tæt, ujusteret serie, der ikke kan bevares, fejler lukket i stedet for at blive approksimeret. |
| Native cadencehold op til tre timer uden ny bevægelse | **BEVAR** | Det er dokumenteret kildecadence, ikke interpolation. State ændres ikke, og holdet må ikke overskride gapgrænsen. |
| Missing/gap som neutral strøm | **FJERN** | Missing er ikke et fysisk nul. Direkte targetmissing giver `UNAVAILABLE`; et hul i tidligere historik giver `HISTORY_INCOMPLETE` med konservative lower/upper-baner (`−1/−8` mod `+1/+10`), aldrig neutralisering eller lånt evidens. |
| Phase-D-baseevaluator som skjult availabilitygate | **FJERN** | Den integrerede evaluator beregner kun sine erklærede komponenter. Historisk evaluator kan bruges offline, ikke som skjult produktionsafhængighed. |

## Mobilisering

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| `Hs² × T` som relativ bølgeenergiproxy | **BEVAR** | Egnet som relativ mobiliseringsprior. Den er ikke en beregning af bundforskydning, batymetri eller ravtransport. |
| Eksisterende energiankre | **BEVAR** | Ingen fundkalibrering eller bedre lokale data begrunder nye knækpunkter. |
| 4 timers opbygning / 48 timers aftrapning | **BEVAR** | Fortsat eksplicit, ikke-fundkalibreret prior. |
| Første bølgeprøve opfinder én times historik | **FJERN** | Kold start er utilgængelig og må ikke få skjult varighed eller buildkredit. |
| Missing bølge kan forblive normal READY og bygge videre | **ERSTAT** | Manglende `Hs` eller periode gør det aktuelle input utilgængeligt. Gyldig afledt state kan holdes uden build; ved retur gives højst én times buildkredit. |
| Gap over tre timer som almindelig fortsættelse | **FJERN** | Langt gap genstartes konservativt fra minimum af tidligere state og aktuelt mål og må højst få én times buildkredit. |
| Bølger kan skabe transport/supply fra nul | **FJERN** | Bølger mobiliserer, men skaber ikke observeret lager eller dokumenteret strømtransport. |

## Sidste nærkystlevering

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Mild fysisk bottleneck `0,85–1,00` | **FORBEDR** | Intervallet genbruges kun som en ensrettet, afgrænset teknisk bølgeapproach-proxy: `factor=clamp(1-0.15×W×(1-approach),0.85,1)`. Den må kun dæmpe allerede eksisterende tilførsel og er ikke et fysisk leveringsinterval. |
| `delivery = transportPotential × factor` efterfulgt af 65/35-blend | **ERSTAT** | Blandingen dobbelttalte transportpotentialet. Aktiv kontrakt bruger `delivery=transportPotential×factor` præcis én gang og lader delivery-leddet eje de 50 %. |
| `5,25 %` som aktiv maksimal leveringskorrektion | **ERSTAT** | Den gamle 65/35-afledte 5,25 %-effekt fjernes. Den aktive kontrakt kan dæmpe delivery-leddet højst 15 %, svarende til højst 7,5 rå RavScore-point før slutafrunding; den viste heltalsscore kan derfor ændres 8 point; det er en begrænset modelprior og ikke fundkalibrering. |
| `5,25 %` som midpoint eller fysisk usikkerhedsinterval | **FJERN** | Der findes intet numerisk fysisk last-mile-interval i aktiv output; værdien er `null`. |
| Eventtiming fra Phase D som leveringsbevis | **FJERN** | Produktionshistorikken gjorde feltet til praktisk konstant fallback og ikke et observeret timingbevis. |
| Ydre bølgeretning som numerisk last-mile-faktor | **FORBEDR** | Den officielle DMI-WAM-retning er `FROM` og roteres præcis én gang +180° til `TOWARD` mod den uændrede eksisterende kystnormal. En kausal energivægtet EWMA med fire timers halveringstid og en ældre hale danner `W`, `N` og `T`; `normalAlignment` er det energivægtede normalmoment divideret med aktivitet, og `approach=clamp((normalAlignment+0,25)/1,25,0,1)`. Proxyen repræsenterer kun offshore bølgeapproach og må ikke kaldes lokal undertow, rip-, feeder- eller langskyststrøm. |
| Manglende bølgeretning som optimistisk/pessimistisk faktor | **FJERN** | Aktiv, energibærende retningsmissing fejler lukket; den erstattes ikke af midpoint. Kun `waveHeightM=0` er neutral exact calm, og `wavePeriodS` skal stadig være finit/ikke-negativ. Positiv højde med nulperiode er `INVALID`/fail-closed og må ikke blive calm-evidens. |
| Lokal surfzone-, revle-, rip-, feeder-, langskyst- eller undertoweffekt | **UTILSTRÆKKELIG EVIDENS** | Processerne er relevante, men RavRadar mangler de lokale data, der skulle adskille og kvantificere dem. `physicalDeliveryResolved` forbliver falsk. |
| Strukturel last-mile-usikkerhed | **FORBEDR** | Den afgrænsede bølgeapproach-proxy ændrer ikke erkendelsesgrænsen: `physicalDeliveryResolved=false`, fysisk interval er `null`, og uvisheden forbliver en eksplicit forklarings- og confidenceegenskab. |
| Ukendt lokalt eller sekundært ravlager som numerisk state | **UTILSTRÆKKELIG EVIDENS** | Lageret kan eksistere, men observeres ikke. Modellen må hverken sætte det til nul eller opfinde lagerpoint. |

## Vandstand, revler og fysisk fortolkning

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Faldende vandstand som universel udtransport | **UTILSTRÆKKELIG EVIDENS** | Faldende vand kan ledsage nettoudstrømning, men kan også blotlægge eller efterlade materiale bag revler. Gridstrømmen ejer det observerede transportfortegn; lokale surfzoneprocesser er uopløste. |
| Faldende/lav vandstand som RavScore-point | **FJERN** | Absolut niveau og trend giver ikke et universelt pointfortegn, og der er risiko for dobbelttælling af strømfysik. |
| Vandstand som synlig kontekst | **FORBEDR** | Forklaringen skal skelne mellem vandsøjlens nettobevægelse, blotlægning, retention og uopløst surfzoneadfærd. |
| Waders’ vandstands-tie-break | **BEVAR** | Ved scorelighed vælges lavere vandstand, derefter ikke-stigende trend og tidligste tidspunkt. Direkte scoreeffekt forbliver 0. |
| Statisk rev-, shallow-, bund- eller vegetationbonus | **FJERN** | RavRadar har ikke lokal procesopløsning til et generelt pointbidrag. Geodata ændres ikke i modelsporet. |
| DDM's officielle 50 m-dybdegrid | **UTILSTRÆKKELIG EVIDENS** | Kan bruges som statisk forsknings- og forklaringskontekst, men opløser ikke dynamiske revler, ripkanaler eller surfzoneprocesser og er derfor bevidst ikke scoreinput. Ingen kystnormal, geometri eller land-/vandpunkter flyttes. |

## Jagtbarhed og præsentation

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Waders-vindkurve: fuld til 6 m/s og 0 ved 15 m/s | **BEVAR** | Eksisterende ejerprior og synlig produktsemantik. |
| Eksisterende strand-vind- og bølgekurver | **BEVAR** | Ingen ny evidens begrunder andre ankre. Kurverne centraliseres i modelkontrakten og beskriver søgemetodens effektivitet, ikke ny mobiliseringskredit. |
| Waders: 80 % vind og højst 20 % bølgestraf | **BEVAR** | Bevarer den ejerbesluttede metodeprofil. Det aktuelle bølgefradrag er adskilt fra den tidslige `Hs² × T`-mobilisering og kan ikke give transport- eller last-mile-point. |
| Manglende vind eller bølgehøjde som normal jagtbarhed | **FJERN** | Begge fysiske input skal være endelige og ikke-negative; ellers fejler scoren lukket. |
| `direction-broad-19-v1` | **FORBEDR** | Candidate G's områdeorden bevares efter scorelighed, men state 6 bruger `direction-broad-19-history-tie-v2`: numerisk score først, `FULL_HISTORY` kun ved eksakt tie, derefter eksisterende områdeorden. |
| `score-water-tie-earliest-v2` | **FORBEDR** | Candidate G-adfærden bevares efter history-tie i `score-history-water-tie-earliest-v3`: numerisk score først, `FULL_HISTORY` kun ved eksakt tie, derefter eksisterende vand-/trend-/tidsregler. |
| Scorebånd 35/55/75 og exceptional 90 | **BEVAR** | Præsentationspolitikken bindes til samme modelhash. |

## State, provenance, migration og recovery

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| DMI/Copernicus-proveniens og tidsbinding | **BEVAR** | Samme tid, kilde og dokumenteret fallback skal følge state, score, payload og forklaring. |
| Candidate G schema 2 som første cutovergrundlag | **FORBEDR** | `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema6-v5` validerer og genvægter kun signeret, allerede afledt kystnormal currentevidens uden rå U/V eller rå-genberegningspåstand. Præcis 673 states skal dele target; 40 private WAM-præ-target-positioner kræver coherent run pr. collection og same-cell provenance med højst fire timers same-run-interpolation. Den interpolation er kun migrations-/generisk acquisitionpolitik; genuine cold start kræver exact native WAM og maksimal interpolation 0. Tailgrænsen er `1/1024`. Ved manglende bevis forbliver Candidate G offentlig; historik og gamle scorer opfindes ikke. |
| Ubegrænset genimport af Candidate G | **FJERN** | Import er en præcis first-cutover-mekanisme og må kun ske, når hverken gyldigt integreret bundle eller checkpoint findes. |
| Candidate G som offline oracle og eksplicit rollback | **FORBEDR** | `integrated-schema6-to-candidate-g-schema2-v3` holder rollback deterministisk uden at blande Candidate G ind i ny score. Den varme projektion ligger kun privat som `ravScoreCandidateGRollback` og beregnes fra samme targettid uden dobbelt recovery-credit. Kun en eksakt `READY`/`memoryReady` Candidate G-runtime må under manuel rollback projicere sin egen mode-score som exact full-history med collapsed bounds/coverage 48; non-READY/mismatch stopper, og Candidate G-bundne ture er fortsat ikke kalibreringsegnede. Operationel aktivering kræver manuel controller-CAS gennem `CANDIDATE_G_PENDING`, Candidate G-Pages-build og offentlig eksakt 210/673-verifikation. Scheduler kan ikke initiere; der deployes ingen Candidate G-assistent-Edge, og lokale DA/DE/EN-svar tager over efter Edge-`409`. |
| Samme-model fuld runtimegendannelse | **FORBEDR** | Gendannelse sker via en privat, hashbundet bundle med eksakt filallowlist, modelbinding, path-/symlinkværn og atomisk installation. Den samme integrerede model kan fortsættes atomisk i højst 72 timer; cross-model fallback og interpolation er forbudt. |
| Kompakt continuation-checkpoint | **ERSTAT** | Aktivt checkpoint er atomisk schema 4 med 673 schema-6-stateposter og en parret Candidate G-rollback-companion schema 1. Status er `ravscore-schema6-with-candidate-g-rollback-companion`, cachepolicy er `ravscore-continuation-schema6-v2`, og companionstatus er `candidate-g-rollback-ready-companion`. Generation, target, binding, hashes og 673/673 skal matche. Det bærer kun allowlistede afledte bounds/coverage/reasons/momenter, er højst 72 timer gammelt og fejler lukket ved binding-/privacybrud; companionen kan aldrig rekonstrueres fra incomplete state 6. Schema 5 er kun historisk eksakt migrationskilde. |
| Offentlig cache som kilde til fuld historik | **FJERN** | Fulde conditions, DMI-caches, pilot history og checkpoint forbliver private. Modellen kan være køreklar via privat bundle/checkpoint uden ny offentlig historikopbygning. |
| Model- og datakvalitet i ét confidence-label | **ERSTAT** | Datakomplethed og strukturel modelusikkerhed adskilles. Komplet input gør ikke last-mile-modellen moden eller fundkalibreret. |
| Evidens uden eksplicit trustklasse | **ERSTAT** | `VERIFIED_ONLY` er den eneste kalibreringsegnede klasse. Rekonstrueret og emergency kan kun bruges inden for deres afgrænsede driftskontrakter og er ikke kalibreringsegnede; ture er heller ikke i sig selv kalibreringsgrundlag. Den planlagte fiktive udførelse af morgenhullet blev opgivet, men den historiske afgrænsede incidentkontrakt bevares som sikkerhedsreference. |

## Offentlig payload, privacy og produktintegration

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Kompakt startup-/detaljeopdeling og hashes | **BEVAR** | Hurtig startup og lazy details er velfungerende. Manifest schema 4 binder model, dataset, filer, body-hashes og byteantal. |
| Pages med hele `data/live/` | **FJERN** | Pages må kun indeholde `manifest.json`, `public-conditions.json`, `public-condition-details.json` og `coastal-parts-v2.json`. |
| Offentlig adgang til fulde conditions/caches/pilot history/checkpoint | **FJERN** | Disse er private produktionsruntimefiler og afvises af privacy-gaten. |
| Rekursiv negativ privacy-audit | **FORBEDR** | Audit afviser state/evidens, rå U/V, private stier/caches/checkpoints og fremmede modelbindinger i hele artifactet. |
| 210 zoner / 673 kystdele | **BEVAR** | Ingen geometri eller land-/vandpunkter ændres. Modellen tilpasses den eksisterende dækningskontrakt. |
| DA/DE/EN, lokal/Edge-assistent, ture, observationer, admin og håndbøger som senere efterarbejde | **FJERN** | Alle producenter, adapters og forbrugere er del af samme plug-and-play-leverance og skal regressionsbevises før cutover. |

## Afviste hovedalternativer

### Multiplikativ eller harmonisk kerne

En multiplikativ kerne er matematisk attraktiv, men gør `transport = 0` til `score = 0` uanset mobilisering, jagtbarhed og muligt lokalt/sekundært lager. Det er en uunderbygget fysisk antagelse. Alternativet forbliver offline-ablation.

### Eksponentiel +10/−8-respons

En procentuel respons undgår nul, men ændrer ejerens deklarerede pointsatser til en ny ikke-lineær regel uden evidens. Den aktive implementering bevarer point pr. effektiv time og forbedrer i stedet alderskernel og evidensintegritet.

### Ubegrænset eller fysisk fortolket last-mile-faktor

En direkte fysisk landingsandel kan ikke forsvares uden lokal batymetri, en bølgeopløst surfzonemodel og ravets lokale partikelstate. Den aktive model bruger derfor kun DMI-WAM's officielle offshore bølgeretning i en afgrænset kausal energivægtet approach-proxy med fire timers halveringstid og en ældre hale, som aldrig kan øge supply og højst kan dæmpe den rå totalscore 7,5 point før slutafrunding; den viste heltalsscore kan derfor ændres 8 point. DDM's officielle 50 m-grid er statisk kontekst og ikke en erstatning for dynamiske revler eller surfzoneprocesser. Rainville m.fl. 2026 understøtter alene, at bølgeapproach kan have relevans for flydende objekters kystnære bevægelse; studiet er en buoyant-object-analogi og hverken ravkalibrering eller dokumentation for fysisk leveringsandel. Derfor forbliver `physicalDeliveryResolved=false`, og fysisk interval er `null`.

### Vandstandspoint

Små niveau- eller trendpoint blev afvist, fordi absolutte niveauer ikke er universelt sammenlignelige, samme fysiske signal kan være indeholdt i gridstrømmen, og lokal batymetri afgør, om faldende vand primært blotlægger, fastholder eller transporterer materiale.

## Konklusion

Den integrerede model er en ny hel kontrakt, men ikke en blind genopbygning. Den bevarer 20/50/30, strømgrænser, +10/−8, 4/48-mobilisering, jagtbarhed, provenance, dæknings- og præsentationskontrakter. Den forbedrer state, evidence, missing, migration, recovery, payloadbinding og sidste-miles bølgeapproach. Den fjerner helscore-nulgaten, dobbelttælling, skjulte Phase-D-gates, offentlig adaptiv model og uunderbyggede vandstandspoint.

Den vigtigste faglige korrektion er, at sidste nærkystlevering hverken skjules i `5,25 %` eller fremstilles som løst. Den bruger én ensrettet, højst 15 % dæmpende bølgeapproach-faktor på supply og bevarer permanent strukturel usikkerhed, indtil et lokalt datagrundlag kan begrunde en fysisk leveringsmodel. Der må ikke påstås empirisk højere fundpræcision uden et repræsentativt fund-/nulgrundlag.
