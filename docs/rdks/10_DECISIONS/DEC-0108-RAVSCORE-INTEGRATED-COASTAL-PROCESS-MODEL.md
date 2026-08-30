# DEC-0108 — RavScore Integrated Coastal Process Model

- **Status:** Aktiv beslutning under implementering og slutvalidering; endnu ikke offentliggjort som produktionsmodel
- **Dato:** 2026-08-29
- **Ejer:** RavRadar
- **Erstatter ved sikker cutover:** Candidate G som offentlig RavScore-model
- **Kildekontrakt:** `js/core/ravscore-model-contract.js`

## Beslutning

RavRadars næste RavScore bygges og frigives som én samlet kystprocesmodel. Modellen genbruger de Candidate G-dele, der fortsat er fagligt og teknisk forsvarlige, men samler dem under én ny modelidentitet, statekontrakt, forklaringskontrakt, migration og rollback.

Den integrerede score bevarer vægtningen 20/50/30:

```text
rawScore =
  0,20 × huntability
  + 0,50 × transportPotential
  + 0,30 × mobilisationPotential
```

Formlen er et additivt evidensindeks, ikke en ravmassebalance. `mobilisationPotential` er en betinget mulighed for mobilisering, **hvis materiale er tilgængeligt**; den er ikke et observeret eller estimeret lokalt lager. En klar, verificeret `transportPotential = 0` er ikke missing strømstate og er heller ikke bevis for, at lokalt eller sekundært lager er nul. Missing eller ikke-klar strømstate gør fortsat hele scoren utilgængelig. Ved en klar nulværdi er det teoretiske loft `20 + 30 = 50`, så scoren kan være dårlig eller højst svag, aldrig middel eller god; waders-cappen kan sænke den yderligere.

Den obligatoriske syntetiske lagerkoblingsablation sammenligner aktiv additivitet med fuld kobling `M × T/100`, kvadratrodskobling `M × sqrt(T/100)`, en eksplicit 50 %-lagerprior `M × (0,5 + 0,5 × T/100)` og minimumsbottleneck `min(M,T)`. Ingen variant er fundkalibreret. Fuld-, kvadratrods- og minimumskoblingen gør strømtilførslen til proxy eller øvre grænse for alt uobserveret mobiliserbart lager; 50 %-varianten opfinder en konkret lagerandel. Aktiv additivitet bevares derfor som den mindst ekstra lagerstrukturerende af de afprøvede skalarregler. Den er ikke antagelsesfri: separabilitet, kompensation og 20/50/30 er fortsat transparente, ukalibrerede indekspriorer. Beslutningen må ikke bruges til at påstå lager, ravmasse, fundchance eller empirisk optimalitet.

`transportPotential` er den verificerede aktuelle strømtilstand. Den sidste nærkystlevering er fortsat fysisk uafklaret med de data RavRadar faktisk har. Derfor er den aktive leveringskontrakt bevidst score-neutral:

```text
delivery = transportPotential × 1
```

Faktoren `1` er ikke et fysisk estimat af, hvor stor en andel der når stranden. Den betyder alene, at modellen ikke må foregive en lokalt opløst surfzone-, revle-, rip-, undertow- eller batymetrieffekt, som datagrundlaget ikke kan bære. Strømretning og bølgeenergi kan forklares som kystkontekst, men giver ingen selvstændig last-mile-scoreeffekt.

Den tidligere arbejdshypotese om højst `5,25 %` retningsbestemt leveringskorrektion er forkastet som aktiv modelkontrakt. Den må kun optræde som en tydeligt mærket, kontrafaktisk offline-ablation. Den er hverken et målt fysisk interval, et usikkerhedsinterval eller en tilladt produktionsparameter.

## Autoritative kontrakt-id'er og runtimebinding

Følgende værdier skal hentes fra kodekontrakten og må ikke kopieres ind i parallelle offentlige modeller:

| Binding | Aktiv værdi |
|---|---|
| Model-id | `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0` |
| Stateversion | `4.0.0` |
| Variant-id | `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1` |
| Profil-id | `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3` |
| Komponentskema | `ravscore-components-huntability-transport-mobilisation-v3` |
| Forklaringsskema | `ravscore-explanation-integrated-v3` |
| Rangering | `direction-broad-19-v1` |
| Bedste tidspunkt | `score-water-tie-earliest-v2` |
| Præsentation | `score-bands-35-55-75-exceptional90-v1` |
| Migration | `candidate-g-schema2-to-integrated-schema4-v1` |
| Rollback | `integrated-schema4-to-candidate-g-schema2-v1` |
| Parameterkontrakt | `modelContractSha256`; endelig værdi regenereres på afsluttet head |
| Transitiv implementeringsbundle | `modelBundleSha256`; endelig værdi regenereres på afsluttet head over 34+ kanonisk normaliserede transitive implementeringsfiler |

Den serialiserede runtimebinding består præcist af model-, state-, variant-, profil-, komponent-, forklarings-, rangerings-, best-time- og præsentations-id samt de to adskilte hashes: 11 felter i alt. `modelContractSha256` binder den kanoniske parameterkontrakt. `modelBundleSha256` binder den transitive implementering, så en ændring i en indlæst evaluator, adapter, policy eller anden kanonisk modelafhængighed ikke kan gemme sig bag uændret parameter-JSON. Migration og rollback er særskilte overgangskontrakter. Hver continuation-state, hvert checkpoint og den centrale profilselection skal bære og matche alle 11 felter; det samme gælder payload, cache, forklaring og release. Et model-id eller én hash alene er aldrig nok. Endelige hashværdier må først dokumenteres efter regeneration på den afsluttede head.

## Årsagskæde og begrebsgrænser

Modellen beskriver seks adskilte led:

1. muligt lager eller tilførsel,
2. mobilisering fra hvile,
3. transport mod den relevante kystzone,
4. sidste nærkystlevering, aflejring og retention,
5. jagtbarhed,
6. usikkerhed og datatilgængelighed.

Modellen må ikke slå følgende mekanismer sammen:

- bølgeorbitaler og mobiliseringsenergi,
- verificeret modelgridstrøm ved RavRadars havpunkt,
- surfzonens undertow,
- feeder- og langskyststrøm,
- ripstrømme,
- tidevands- eller vinddreven ændring af hele vandsøjlen,
- faldende vandstands blotlægning og mulig retention bag revler.

RavRadar har ikke lokal batymetri eller en bølgeopløst surfzonemodel. Retention bag revler og mulig udadgående transport ved faldende vandstand er fysisk plausible scenarier, men de kan ikke omsættes til en generel lokal scorekorrektion ud fra de nuværende input. Vandstand bruges derfor som kontekst og til valg mellem scorelige tidspunkter, ikke som skjult transport- eller last-mile-bonus.

## Bevarede og forbedrede delkontrakter

### Aktuel strømtilstand

- Indadgående bidrag bruger grænsen `0,03 m/s` og maksimal styrke ved `0,15 m/s`.
- Indadgående ændring er højst `+10` point pr. effektiv time; udadgående ændring er højst `-8` point pr. effektiv time. Et native tre-timers hold tæller ikke som tre nye bevægelsestimer.
- Transportpotentialet kan nå 0 efter mindst 13 timers stærk, sammenhængende udadgående påvirkning; Candidate G's særskilte gate, der nulstillede hele RavScore, bevares ikke.
- State-målet bruger 24 timers fuld kredit og et hævet cosinusforløb til 48 timer.
- Evidensgabet må højst være 3 timer. Manglende eller for tæt, ikke-justeret evidens må ikke udfyldes ved opfundet historik.
- Højst 49 evidenspunkter opbevares i vinduet, inklusive et eventuelt reelt præ-grænse-bropunkt. En tættere række, der ikke kan bevares uden at bryde kontrakten, fejler lukket.
- Ved et ægte hold fortsætter state uden opfundet bevægelse.
- Et provenanceverificeret DMI/Copernicus-U/V-par er den eneste autoritative numeriske currentkilde. Den private state bruger den præcise kystnormalprojektion fra parret før afrunding. Kun offentlig visningsfart afrundes til 0,01 m/s; movement-toward-retning afledes fra samme par, og 360° normaliseres til 0°. Parallel cached fart/retning kan ikke overstyre parret, og rå U/V forlader ikke den private producent/envejshashkontrol.
- `productionReferenceAt` låser en eksakt 166-timers privat inputmatrix fra target−48 h til target+117 h. Target gennem +117 h skal blive præcis 118 sammenhængende offentlige UTC-timer for alle 210/673 og begge modes. DMI er førstevalg på hvert del/time-par; Copernicus må kun udfylde den eksakte resterende gapmatrix uden hold, interpolation eller ændring af referencepunktet.
- DMI-native og afledt provenance skal binde collection/component, run/lead, item/asset/acquisition, grid/celle/afstand og eksakt del/forælder/samplingkontekst. Copernicus-supplementet skal komme fra en privat schema-2 `COMPLETE` range-collection med target-, DMI-input-, required-pair-, recordref- og acquisitionbinding. Current/future Copernicus-acquisition må højst være fire timer fra `productionReferenceAt`; kompatibel forseglet historik kan genbruges inden for retentionvinduet.
- Fysiske input og afledt state skal være endelige JSON-tal. Numeriske strenge, booleans, arrays og objekter må ikke coerces til evidens eller score i model, migration, recovery, privat runtime eller offentlig projektion.

### Bølgemobilisering

- Mobiliseringsenergi repræsenteres ved `Hs² × T`.
- 4 timer er opbygningshalveringstiden; 48 timer er aftrapningshalveringstiden.
- Sammenhængende intervaller må højst have 1 times afstand; overordnet evidensgab må højst være 3 timer.
- Manglende bølgehøjde eller periode gør input utilgængeligt. Kold start må ikke opfinde varighed eller opbygning.
- Gyldig tidligere afledt state kan holdes ved manglende nyt input, men der gives ingen ny opbygningskredit.
- Bølgehøjde har to adskilte, synlige roller: `Hs² × T` bygger den tidslige mobilisering af allerede tilgængeligt rav i 30 %-komponenten, mens den aktuelle bølgehøjde indgår i søgeforhold som metode-/sigtbarhedsbegrænsning i 20 %-komponenten. Jagtbarhedsvejen giver ingen ny mobiliserings-, transport- eller last-mile-kredit; den kan kun beskrive, hvor effektivt der kan søges. Det er derfor to forskellige kausale udfald af samme vejrinput, ikke det samme procesbidrag lagt til to gange.

### Jagtbarhed

- Strand- og wadersvisning er projektioner af samme model og samme state, ikke separate modeller.
- Jagtbarhed kræver gyldige, endelige, ikke-negative vind- og bølgeinput.
- Waders-score følger den eksisterende søgeforholds-/metodecap; den er ikke en sikkerhedsvurdering.
- Bølgeleddet i jagtbarhed er øjeblikkelig metodeeffektivitet og må ikke læse eller forstærke mobiliseringstilstanden.

### Vandstand

- Vandstand er kontekst og indgår i `score-water-tie-earliest-v2`.
- Stigende, stabil eller faldende vandstand må ikke i sig selv ændre RavScore.
- Vandstandstrend må ikke omsættes til en ekstra “hele vandsøjlen”-strøm eller interpoleres med den verificerede modelgridstrøm. [DMI beskriver DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) som en tredimensional HBM-cirkulationsmodel med atmosfærisk forcing og tidevands-sealevel ved åbne rande, der selv leverer current-U/V. [Copernicus Baltic NEMO](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description) leverer tilsvarende fysiske hastighedsfelter, herunder særskilte øjeblikkelige og detidede produkter. Modelstrømmen er et samlet modeludfald, ikke et bevis for hver lokal proces; en ekstra regel afledt af vandstand kan korrelere med eller dobbeltregne det eksisterende signal og opløser stadig ikke surfzonens fortegn.
- Tekster skal skelne mellem mulig nettostrøm i vandsøjlen, blotlægning, retention og uopløst lokal surfzoneadfærd.

## Last mile: aktiv begrænsning

Den aktive policy er `last-mile-score-neutral-structural-uncertainty-v2`:

- `deliveryFactor = 1`,
- scoreeffekt `NONE`,
- ydre bølgeretning er forklarende kontekst uden scoreeffekt,
- manglende retning er score-neutral og markeres som usikkerhed,
- `physicalDeliveryResolved = false`,
- strukturel usikkerhed er altid sand,
- numerisk fysisk usikkerhedsinterval er `null`.

Den strukturelle usikkerhed kan først erstattes af en numerisk virkning efter en særskilt ejerbeslutning, hvis RavRadar får et tilstrækkeligt lokalt datagrundlag for batymetri og en opløst surfzoneproces. En sådan fremtidig ændring vil være en ny modelbeslutning, ikke en tuning af denne kontrakt.

Tre ekstra primærkilder styrker denne afgrænsning uden at levere en dansk ravfaktor. [Aagaard, Black og Greenwood (2002), DOI 10.1016/S0025-3227(02)00193-7](https://doi.org/10.1016/S0025-3227(02)00193-7) viser, at nettotransport over revler kan være land- eller søværts alt efter blandt andet undertow, bølgeskævhed, orbitalhastighed, relativ dybde og bundhældning. [Jalón-Rojas m.fl. (2025), DOI 10.5194/gmd-18-319-2025](https://doi.org/10.5194/gmd-18-319-2025) viser i en bølgeopløst 2DV-partikelmodel, at partiklens vertikale position og densitet afgør eksponeringen for landværts Stokes-drift og søværts undertow. [Lofty m.fl. (2023), DOI 10.1016/j.watres.2023.120329](https://doi.org/10.1016/j.watres.2023.120329) målte rav omkring 1 041 kg/m³ i deres 5 mm-prøver og brugte rav som lavdensitets naturlig partikel i bedload-/saltationsforsøg. Lofty-studiet er et åbent-kanal-laboratorieforsøg, ikke en dansk surfzonevalidering. Samlet viser kilderne, hvorfor gridstrøm, vandstand eller bølger alene ikke kan bestemme sidste-mile-fortegnet uden lokal morfologi, bølgeopløsning og partikelstate.

## Missing-, recovery- og migrationskontrakt

- Obligatoriske input fejler lukket. Ugyldige tal, bølger eller evidenskæder må ikke blive til normal score.
- Den integrerede model kan migrere eksisterende Candidate G schema-2-state via `candidate-g-schema2-to-integrated-schema4-v1`; den må ikke opfinde historik.
- Recovery vælger eksklusivt i denne prioritet: eksakt point-aktivering, gyldig integreret continuation fra den private runtime, gyldigt integreret checkpoint og derefter dybt valideret Candidate G schema-2-state. En tilstedeværende, men ugyldig point-aktivering stopper straks. En ugyldig ordinær kilde må ikke skygge for en gyldig kilde med lavere prioritet; hvis ingen tilstedeværende kilde validerer, fejler recovery lukket.
- Første cutover må importere Candidate G-state præcis én gang og kun, hvis hverken gyldig point-aktivering, gyldig integreret privat continuation eller gyldigt integreret checkpoint findes. Kun når ingen statekilde er til stede, må den afgrænsede private 48-timers koldstartsbro anvendes.
- Rollback bruger `integrated-schema4-to-candidate-g-schema2-v1` og den bevarede rollback-state; rollback må ikke blandes ind i den offentlige integrerede score.
- Den varme Candidate G-projektion findes kun som `ravScoreCandidateGRollback` i den beskyttede fulde runtimebundle. Den må aldrig kopieres til repository, Pages, en offentlig shadowmodel eller en automatisk fallback.
- Kompakt continuation-state er schema 4 og kan gendannes fra et privat Actions-cache-checkpoint eller det beskyttede `admin_documents`-dokument `ravscore-continuation-checkpoint`.
- Et eksisterende, men ugyldigt, fremtidigt eller for gammelt checkpoint skal fejle lukket; det må ikke maskeres som en kold start.
- Checkpointet er højst 72 timer gammelt, er bundet til nøjagtig model/state/hash og indeholder kun kompakt afledt fortsættelsesstate — ikke rå vejrdata, scorer, koordinater eller rå U/V.

Dermed kan modellen starte på allerede indsamlet og valideret privat vejrhistorik. En state-løs kystdel genafspiller før sin første offentlige targettime præcis de 48 verificerede private kildetimer fra target−48 h til target−1 h med strøm og bølger. Rækker før target er hverken offentlige eller syntetisk historik. Komplet kildehistorik gør state `READY` ved den første offentlige targettime; manglende eller ugyldige kilder stopper build/release med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING`. Modellen må ikke kræve flere dages ny offentlig cacheopbygning efter release.

## Privat og offentlig runtime

Fuld produktionsruntime forbliver privat. Den private bundlekontrakt omfatter nøjagtigt otte godkendte driftsfiler: fulde conditions, DMI forecast-/bulkcaches, den forseglede Copernicus-current-range-cache, pilot history, weather health, runtime diagnostics og DMI-vandstandsstationer. Copernicus-cachen bevarer privat acquisition-/coverageproveniens og allerede indsamlet bridgehistorik; den er aldrig et Pages-input. Den fulde runtime kan desuden bære den varme, afledte Candidate G-rollbackprojektion under det eksakte felt `ravScoreCandidateGRollback`; projektionen er del af den beskyttede bundle og aldrig en ekstra offentlig livefil. Bundle og checkpoint kontrolleres med modelbindinger, canonical hashes, path-/symlink-værn og atomisk installation. Den komprimerede fulde bundle lagres uden for repository og Pages i den ikke-offentlige Supabase Storage-bucket `ravradar-private-production-runtime`; det beskyttede dokument `ravscore-private-production-runtime-pointer` peger kun på den aktuelle og den foregående kontrollerede generation. Kun service-role-workflowet må læse/skrive, og anonym adgang skal bevises afvist.

Pages får kun den offentlige schema-4-manifestprojektion og disse fire livefiler:

- `data/live/manifest.json`,
- `data/live/public-conditions.json`,
- `data/live/public-condition-details.json`,
- `data/live/coastal-parts-v2.json`.

Offentlig runtime må ikke kunne hente fulde conditions, private caches, pilot history, checkpoint eller rå U/V. Manifestet binder dataset, reference, model, filhashes, body-hashes og byteantal. Den rekursive privacy-audit er en releasegate.

## En offentlig model

Candidate G forbliver eneste offentlige model indtil den samlede cutover. Den integrerede model må ikke eksponeres som offentlig shadowmodel eller som løse offentlige fragmenter.

Efter cutover må den tidligere adaptive model ikke være offentlig scoreejer, runtime eller alternativ modelidentitet. Historisk eller intern regressionskode kan fortsat eksistere, men må ikke eje den offentlige RavScore, modelversion, forklaring eller fundchance. Mens den integrerede model er aktiv, er Candidate G kun et privat migration-/offline-/rollback-orakel. Kun en særskilt, manuel, fuldt verificeret hel rollback kan igen gøre Candidate G til den ene offentlige model; den er aldrig en samtidig eller automatisk offentlig fallback.

## Atomisk backend-, Edge- og Pages-cutover

Supabase, Edge og GitHub Pages kan ikke ændres i én fysisk databasetransaktion. RavRadar skal derfor gøre modelskiftet **observationsatomisk** med en fast, testbar rækkefølge:

1. `20260829010000_ravscore_operational_documents_no_history.sql` etablerer de operationelle private runtime-dokumenter og den private bucket. Den undlader fremtidig kopiering af de allowlistede operationelle dokumenter til `admin_document_versions`, men bevarer alle eksisterende versionsrækker og udfører ingen destruktiv oprydning. Først derefter anvendes `20260829020000_integrated_trip_calibration_binding.sql` for schema-3-tur-/kalibreringsbindingen. Begge migrations-id'er bindes ind i protected readiness, som først skrives efter samlet migrationsmetadata-, database- og Edge-readback. `deploy-trip-storage` skal efter dry-run genhente `origin/main` og bevise `origin/main == GITHUB_SHA` umiddelbart før den første eksterne backendskrivning; alle efterfølgende skriverier fortsætter fra samme validerede checkout og migrationssnapshot. To migrationsfiler må aldrig dele samme versionsprefix eller være afhængige af alfabetisk filrækkefølge.
2. Additive databaseændringer og kompatibilitetsklar backend/Edge deployes og verificeres, mens Candidate G stadig er den eneste offentlige model. Et kald må kun behandles under den modelbinding, som requestens offentlige dataset faktisk bærer; Edge må aldrig ommærke Candidate G som integreret eller blande felter fra de to modeller. Ny Edge returnerer eksakt HTTP `409` ved manglende eller forkert modelbinding, så en gammel klient bruger sin lokale Candidate G-beregning i stedet for et servergenereret modelmix. Schema-3-turgrænsen accepterer kun den eksakte integrerede 11-feltsbinding eller den forseglede eksakte Candidate G-11-feltsbinding. Integrated kan kun være kalibreringsegnet ved eksakt zone-/kystdelsparitet; Candidate G er altid `calibration_eligible=false`. En ukendt eller forfalsket, men formelt korrekt binding afvises både i den delte submit-validator og i SQL.
3. Den integrerede private runtime gendannes eller migreres i én eksklusiv prioritet: eksakt point-aktivering, gyldig integreret continuation fra privat bundle, gyldigt integreret checkpoint og derefter præcis én dybt valideret Candidate G schema-2-import. Hver continuation/checkpoint skal matche den fulde 11-feltsbinding. En ugyldig point-aktivering stopper straks; en ugyldig ordinær kilde må ikke skygge for en gyldig lavere prioritet. Kilderne må ikke flettes, og Candidate G-import må ikke gentages som normal recovery. Hvis ingen statekilde findes, skal kystdelen før sin første offentlige targettime genafspille præcis de 48 verificerede private kildetimer target−48 h til target−1 h. For de otte allowlistede 3-timers proxyer må én eksakt verificeret, dataminimeret prøve umiddelbart før randen alene bevise native kontinuitet, når randen ligger mellem prøver; den giver intet nyt strøminterval. Alle tre timefaser skal bestå. Offentlige eller syntetiske rækker før target må ikke bruges som historisk bro. Den komplette bro giver `READY` ved første offentlige target; mangler eller fejler bare ét nødvendigt kildeled, stopper build/release med `RAVSCORE_RECOVERY_REPLAY_BRIDGE_MISSING` frem for at publicere op til 48 timers warmup.
4. Ét exact-head Pages-artifact bygges og valideres med én dataset-, reference- og modelbinding. Controlleren observerer først den kanoniske offentlige kildemanifesthash og skriver derefter atomisk `INTEGRATED_PENDING` med `transitionKind=INITIAL_INTEGRATED_CUTOVER`, kilde-/målbindinger og begge manifesthashes. Den centrale profil **forbliver Candidate G**, mens den integrerede Pages-målversion deployes. Først efter eksakt offentlig implementeringskontrol og 210/673-verifikation må én service-role-RPC samtidigt sætte controlleren til `INTEGRATED_ACTIVE` og den centrale profil til den integrerede 11-feltsbinding. Første cutover er push-only, starter fra legacy/schema-3-Candidate-profil uden eksisterende controller-række og bruger `expectedVersion=0`.
5. En afbrudt `PENDING`-overgang genoptages deterministisk. Matcher den kanoniske offentlige manifesthash den anmodede målhash, gentages den fulde offentlige kontrol, hvorefter CAS kan fuldføre. Matcher den kildehashen, aborteres/rekonsolideres overgangen til kildens `ACTIVE`-status og kildens centrale profil bevares. Matcher den hverken kilde eller mål, forbliver controlleren `PENDING`, og normal drift stopper fail-closed. Der deployes ikke en særskilt Candidate G-version af assistentens Edge-funktion.

En kort kompatibilitetsfase i backend er ikke en ekstra offentlig shadowmodel: den beregner ikke en alternativ score, men afviser eller behandler hvert datasæt efter dets eksakte binding. Releasebeviset skal omfatte både gammel-klient/ny-backend og ny-klient/ny-backend, eksakt `409` + lokal Candidate G ved gammel klient uden binding samt negative krydsbindingsprøver.

## Operationel modelcontroller, rollback og tilbagevenden

Et offentligt modelskift er en versions-CAS-styret release, ikke en automatisk fallback. Controllerdokumentet ligger under nøglen `ravscore-operational-model-activation` med schema `ravscore-operational-model-activation-v3`. Det kan kun bruge statusserne `INTEGRATED_ACTIVE`, `CANDIDATE_G_PENDING`, `CANDIDATE_G_ACTIVE` og `INTEGRATED_PENDING` samt overgangstyperne `CANDIDATE_G_ROLLBACK`, `CANDIDATE_G_REFRESH`, `INTEGRATED_RETURN` og `INITIAL_INTEGRATED_CUTOVER`.

Controllerdokumentets fulde vedvarende kontrakt er `schemaVersion`, `status`, `transitionKind`, `sourceHead`, `datasetId`, `productionReferenceAt`, `rollbackId`, `activeModelBinding`, `requestedModelBinding`, `sourceModelBinding`, `candidatePlanSha256`, `candidateFullSha256`, `privateBundleContentSha256`, `publicManifestSha256`, `sourcePublicManifestSha256`, `requestedPublicManifestSha256`, `sourceDeploymentId`, `deploymentId`, `automaticActivationAllowed`, `schedulerActivationAllowed`, `calibrationEligible`, `requestedAt`, `activatedAt`, `failureCode`, `returnPlanSha256`, `integratedReadinessSha256`, `integratedPublicAuditSha256` og `integratedManifestSha256`. Bindingerne er de fulde 11-feltsbindinger. Hashes og ids skal være ikke-følsomme, eksakte og overgangsbundne.

Alle fire overgangstyper bruger samme tofasemønster:

1. observer den kanoniske offentlige kildemanifesthash og valider kilde, mål, privat plan, central profilversion og tilladt initiator;
2. skriv atomisk `CANDIDATE_G_PENDING` eller `INTEGRATED_PENDING`, mens den centrale profil fortsat er kildens profil;
3. deploy målets eksakte Pages-artifact;
4. verificér den offentlige implementeringsbinding samt 210 zoner og 673 kystdele;
5. fuldfør med én service-role-RPC, som samtidigt sætter målets `ACTIVE`-status og den centrale profil til målets eksakte 11-feltsbinding.

Ved crash/retry gælder manifestbaseret reconciliation: offentlig målhash medfører fuld genverifikation og CAS-complete; offentlig kildehash medfører CAS-abort/rekonsolidering til kildens `ACTIVE`-status med bevaret kildeprofil; enhver tredje hash efterlader `PENDING` og stopper normal drift fail-closed. Central profil kan derfor aldrig stå på målmodellen, mens kildens Pages-manifest fortsat er kanonisk.

Candidate G-rollbacken bruger `transitionKind=CANDIDATE_G_ROLLBACK` og rollback-id `integrated-schema4-to-candidate-g-schema2-v1`; den er manual-only. En senere tilbagevenden bruger `transitionKind=INTEGRATED_RETURN`, går via `INTEGRATED_PENDING` og er også manual-only. Den første integrerede aktivering bruger `INITIAL_INTEGRATED_CUTOVER` og er push-only. Scheduleren må hverken førstegangsaktivere, rulle tilbage eller returnere; den må kun udføre `CANDIDATE_G_REFRESH` for en allerede `CANDIDATE_G_ACTIVE` drift med samme eksakte Candidate G-binding. Enhver `PENDING`-status stopper normale deploys.

Candidate G-ture og -observationer under en operativ rollback mærkes `calibrationEligible=false`, så de ikke blandes ind i kalibrering af den integrerede model. Konto-DTO'en bærer kun den privacy-sikre eksakte `model_binding`. Klienten udleder visningsstatus på ny mod det aktive kanoniske Pages-overlay og stoler ikke på en ældre serverlabel: under Candidate G-rollback vises eksakt Candidate G som `current-ineligible`, mens integrerede ture er historiske. Den oprindelige turbinding omskrives aldrig.

Rollbacken er bevidst **fail-closed og local-only for Spørg RavRadar**. Candidate G-Pages-overlayet erstatter klientens offentlige modelbinding, mens assistentens integrerede Edge-funktion forbliver deployet og afviser Candidate G-bindingen med eksakt HTTP `409`. Klienten bruger derefter de eksisterende deterministiske lokale DA/DE/EN-svar. Schema-3-ture lagres fortsat under den eksakte Candidate G-binding med `calibration_eligible=false`. Dette er hverken en Edge/backend-helrollback, en skjult dualmodel eller en Candidate G-serverfallback.

Candidate G-rollbackbundlen har sin egen `modelContractSha256` og sin egen transitive `modelBundleSha256`. De to slutværdier dokumenteres først efter afsluttende regeneration; en tidligere kontrakt-only-digest er ikke et gyldigt bundlebevis.

## Evidens- og påstandsgrænse

Offline-evidens skal dække syntetiske scenarier, gamle-mod-nye replays, ablationer, følsomhed, missing, migration, recovery og forbrugerbindinger. Disse kontroller kan dokumentere kontraktmæssig konsistens, fysisk sammenhæng og teknisk forbedring.

De må ikke bruges til at påstå empirisk højere fundpræcision. RavRadar har ikke et repræsentativt, lokalt fundgrundlag, der kan kalibrere eller validere en sådan påstand.

## Accept- og rollbackgate

Cutover er kun tilladt, når:

- kode, state, payloads, forklaringer og dokumentation har de samme autoritative bindinger,
- migration og rollback er deterministisk testet,
- Supabase-migrationerne `20260829010000_ravscore_operational_documents_no_history.sql` og `20260829020000_integrated_trip_calibration_binding.sql` er anvendt i denne rækkefølge, `origin/main == GITHUB_SHA` er genverificeret umiddelbart før første eksterne backendskrivning, og protected readiness binder begge efter samlet database-/Edge-readback,
- backend/Edge-forberedelsen og det integrerede cutover består den observationsatomiske matrix; Candidate G-rollbacken består særskilt central bindings-/Pages-overlay, assistent-Edge-`409`, lokal DA/DE/EN-fallback og schema-3-lagring uden modelmix,
- operational-controlleren består første `INTEGRATED_PENDING`-cutover, manuel Candidate G-rollback, manuel integreret tilbagevenden, afgrænset Candidate-refresh, source/requested-manifest-reconciliation, atomisk `ACTIVE`+central-profil-RPC, fail-closed `PENDING`, initiatorforbud og eksakt 210/673-verifikation,
- private bundle- og checkpointgates er grønne,
- schema-4-manifestet og den fire-filers offentlige allowlist er privacy-auditeret,
- alle 210 zoner og 673 kystdele passerer relevante generator-, projektion- og browsertests,
- aktuelle ranglister, bedste tidspunkt, zonedetaljer, femdøgnsvisning, strand/waders, DA/DE/EN, Spørg RavRadar, evidens-id’er, konto-/tur-/observationsbindinger, admin og ekspertflader er bundet til samme model,
- fuld frisk produktion er grøn på den eksakte mergede head,
- offentlig desktop og mobil er verificeret,
- og der ikke findes konkret modstridende evidens.

Hvis en gate fejler, forbliver Candidate G offentlig. En ufuldstændig integreret model må ikke deludrulles.
