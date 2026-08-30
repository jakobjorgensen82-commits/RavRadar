# Integreret RavScore — datasikkert offline-evidensspor 2026-08-29

## Status og afgrænsning

Dette spor tester den integrerede RavScore mod Candidate G og mod relevante parameteralternativer før offentlig cutover. Auditkoden er `scripts/audit-ravscore-integrated-offline-evidence.mjs`.

Den gennemførte syntetiske audit var direkte bundet til:

- model-id `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0`,
- stateversion `4.0.0`,
- variant `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1`,
- profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3`,
- komponentskema `ravscore-components-huntability-transport-mobilisation-v3`,
- forklaringsskema `ravscore-explanation-integrated-v3`,
- `modelContractSha256`, som binder parameterkontrakten; endelig værdi afventer regeneration på afsluttet head,
- `modelBundleSha256`, som binder 34+ kanonisk normaliserede transitive implementeringsfiler; endelig værdi afventer samme regeneration.

Den tidligere pre-split-selvtest afsluttede de nedenstående scenarieantal, men dens ene hash dækkede kun kontrakt-JSON og må ikke bruges som endelig bundlebinding. Auditsporet skal regenereres på afsluttet head og levere begge slut-hashes:

```text
OK: PASSED_SYNTHETIC_OFFLINE_CONTRACT_AND_SENSITIVITY_AUDIT;
24 paired chronological comparisons/48 individual model evaluations;
24 frozen-component pairs;
model RRS-COASTAL-PROCESS-INTEGRATED-1.0.0;
final modelContractSha256/modelBundleSha256 pending regenerated audit
```

Resultatet er et syntetisk kontrakt-, regressions- og følsomhedsbevis. Det er ikke fundkalibrering, måler ikke fundpræcision og dokumenterer ikke, at modellen empirisk finder rav bedre. Auditsporet læser eller lagrer ikke private produktionspayloads, koordinater, geometri eller rå U/V.

To P1-type-/proveniensfund indgår nu som negative regressionskrav. Et verificeret DMI- eller Copernicus-U/V-par skal selv danne den kanoniske fart til 0,01 m/s og toward-retning; modstridende cached fart/retning må ikke påvirke score, og afrundet 360° bliver 0°. Desuden skal numeriske strenge, booleans, arrays og objekter afvises gennem model, state, migration, recovery, privat runtime og offentlig projektion. Disse er integritetsbeviser, ikke fysisk fundvalidering, og slutpakken genkøres efter bundle-regeneration.

## Metode og to adskilte evidensniveauer

Auditten skelner nu eksplicit mellem to forskellige slags syntetisk evidens:

1. **Parret kronologisk state-replay:** Candidate G's schema-2-pipeline og den integrerede schema-4-pipeline køres over de samme syntetiske timeobservationer med identiske tidsstempler. Denne del omfatter 24 parrede checkpoints, altså 48 individuelle modelevalueringer. Den tester faktisk kronologi, 48-timershukommelse, migration og continuation.
2. **Frosne komponent-kontrafaktiske sammenligninger:** 12 scenarier × strand/waders giver 24 par, men her indsprøjtes på forhånd fastlagte syntetiske transport- og mobiliseringspotentialer. De er nyttige til isoleret score- og vægtanalyse, men er **ikke** et kronologisk state-replay og tælles ikke som sådan.

Kun den første del dokumenterer old-vs-new-adfærd gennem begge statepipelines. Ingen del bruger fund eller nul-fund.

Den automatiske audit omfatter:

- et parret state-replay med 24 checkpoints/48 individuelle modelevalueringer,
- præcis 47-/48-timersgrænse for strømvinduet,
- Candidate G schema 2 → integreret schema 4-migration,
- ét samlet run og et delt run med byte-identisk continuation-state,
- eksakt Candidate G-mobiliseringsoracle mod schema-4-feltet `rollbackCandidateGMobilisationPotential` på hver behandlet replayrække,
- 1-, 3- og 4-timers verificerede gap,
- eksplicit missing og efterfølgende recovery,
- strømstyrker ved `±0,030`, lige over deadband ved `±0,031` og fuld styrke ved `±0,150 m/s`,
- 12 almindelige, ekstreme og indbyrdes modstridende frosne komponentscenarier,
- strand og waders i begge relevante spor,
- 24 frosne Candidate G-/integrerede par, altså yderligere 48 individuelle evalueringer,
- fem syntetiske koblinger mellem strømtilførsel, mobilisering og uobserveret lokalt/sekundært lager,
- vægtene 20/50/30, 25/40/35, 20/45/35 og 15/50/35,
- fire strømkerner, tre styrkegrænsepar og fire ind-/udgående rater,
- præcis kontrol af 12, 13 og 14 effektive timers stærk fralandsstrøm,
- bølgeopbygning 3/4/6 timer og aftrapning 24/48/72 timer,
- aktiv score-neutral last mile samt kontrafaktiske korrektioner på 0 %, 5,25 % og 10 %,
- vandstand med nul scoreeffekt,
- missing, native cadencehold, internt hul og langt gap,
- positive og nul transportpotentialer samt kendt/manglende retning.

## Parret kronologisk replay gennem begge statepipelines

Replayet starter med 49 ægte syntetiske timepunkter over præcis 48 timer. Candidate G og den integrerede model modtager samme strømstyrke, verificeringsstatus, bølgehøjde, bølgeperiode, vind og tidsstempel ved hvert parret checkpoint. Ingen tilstandsværdi kopieres fra den nye model til den gamle eller omvendt, bortset fra den særskilt testede, kontraktbundne engangsmigration fra Candidate G schema 2 til schema 4.

Ved 47 timers dækning var begge strømstates ikke klar. Ved 48 timer var begge klar med potentiale 100. Den gamle evaluator kan teknisk returnere et tal fra en ikke-klar Candidate G-state, men auditten tæller det ikke som en pipelinebundet offentlig score; readiness er en separat nødvendig gate.

| Kronologisk checkpoint | Candidate G transport | Integreret tilførsel | Candidate G score | Integreret score | Pipelinebemærkning |
|---|---:|---:|---:|---:|---|
| 47 timers dækning | 100, men ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Begge: vindue ufuldstændigt |
| 48 timers dækning | 100 | 100 | 92 | 92 | Begge klar |
| 12 timers fuld fralandsvending | 4 | 4 | 38 | 44 | Samme strømstate; ingen gammel helscoregate endnu |
| 13 timers fuld fralandsvending | 0 | 0 | 0 | 41 | Candidate G's helscoregate aktiveres |
| 14 timers fuld fralandsvending | 0 | 0 | 0 | 42 | Den integrerede model nulstiller ikke andre led |
| 1 time efter pålandsvending | 10 | 10 | 43 | 48 | Begge strømstates reagerer kausalt |
| 4 timer efter pålandsvending | 40 | 40 | 62 | 63 | Fortsat identiske strømstates |
| 1 timers verificeret gap | 100 | 100 | 88 | 88 | Begge klar |
| 3 timers verificeret gap | 100 | 100 | 90 | 88 | Begge strømstates klar; schema 4 viser `RECOVERED_SHORT_GAP` og krediterer højst én bølgetime |
| 4 timers verificeret gap | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Schema 4: `WINDOW_HAS_TIME_GAP` og `RESTARTED_AFTER_GAP` |
| Missing strøm og bølge | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Schema 4 viser `MISSING_INPUT`; ingen skjult build |
| Første gyldige time efter missing | Ikke klar | `null`, ikke klar | Ikke pipelinebundet | Ikke tilgængelig | Bølgen er `RECOVERED_SHORT_GAP`; strømmen forbliver lukket, mens missing ligger i vinduet |

Ved `0,030 m/s` var styrken nul på begge sider af kystnormalen. Ved `0,031 m/s` begyndte en lille kontinuert effekt, og ved `0,150 m/s` var styrken fuld. Candidate G og den integrerede strømstate gav samme potentiale i alle seks grænsecheckpoints.

Det ubrudte 18-timers vending/reversal-forløb blev desuden delt efter otte samples. Både Candidate G's og den integrerede models afsluttende continuation-state var byte-for-byte identisk med det respektive ubrudte run. Det viser deterministisk continuation for de syntetiske inputs; det er ikke et løfte om fysisk fundpræcision.

### Mobiliseringsoracle for rollback

Den integrerede schema-4-state fører en særskilt, score-neutral rollbackværdi. Auditgaten kræver nu med eksakt numerisk lighed — ikke afrundet lighed eller tolerance — at hver Candidate G-rækkes `mobilisationPotential` svarer til schema-4-rækkens `rollbackCandidateGMobilisationPotential`.

Gaten kontrollerede 96 producerede rækkesammenligninger. Tallet omfatter både one-shot- og split-run-gennemløb og derfor bevidste gentagelser af det samme syntetiske forløb. Dækningen omfatter specifikt:

- den allerførste kolde time, hvor Candidate G's gamle første-timescredit skal bevares i rollbacksporet,
- alle efterfølgende timer frem til og over 48-timersgrænsen,
- placeholder-missing og den første gyldige time efter missing,
- 4-timers langt gap uden indskudte placeholdertimer,
- schema-2 → schema-4-migrationen,
- begge segmenter af split-run og den afsluttende continuation-state.

Som negativ kontrol blev den første migrerede schema-4-rækkes rollbackpotentiale ændret syntetisk med `0,001`. Den samme rollbackgate afviste mutationen. Kontrollen ændrer kun et lokalt syntetisk auditobjekt og aldrig produktionsstate.

### Operationel rollback er en særskilt releasegate

Det numeriske rollbackoracle er ikke i sig selv tilladelse til at skifte offentlig model. Den varme Candidate G-projektion ligger kun i den beskyttede fulde runtime som `ravScoreCandidateGRollback`. Et manuelt skift kræver controlleren `ravscore-operational-model-activation` med schema `ravscore-operational-model-activation-v3`. `CANDIDATE_G_ROLLBACK` skriver `CANDIDATE_G_PENDING` med kilde-/målmanifesthash og bevarer den integrerede centrale profil under Candidate G-Pages-deploy; først efter eksakt offentlig implementation+210/673 sætter én RPC samtidigt `CANDIDATE_G_ACTIVE` og central Candidate G-profil. Manuel `INTEGRATED_RETURN` bruger `INTEGRATED_PENDING` efter samme source/target/reconcile. Retry completer ved targethash, aborterer/rekonsoliderer ved sourcehash og forbliver fail-closed ved en tredje hash. Scheduler må kun `CANDIDATE_G_REFRESH` på allerede aktiv Candidate G. Der deployes ingen særskilt Candidate G-assistent-Edge; den integrerede Edge svarer `409`, klienten bruger deterministiske lokale DA/DE/EN-svar, og schema-3-ture lagres Candidate G-bundet med `calibration_eligible=false`.

Candidate G-rollbackbundlen har sin egen parameterkontrakt-SHA og transitive implementeringsbundle-SHA. Slutværdierne afventer regeneration på den afsluttede head. Lokal kontrakt- og fault-injection-evidens må ikke kaldes exact-head-, central-, deploy- eller offentlig produktionsverifikation.

Af de 24 kronologiske par havde 20 en pipelinebundet score fra begge modeller. Fire par var bevidst utilgængelige ved 47-timers warmup, 4-timers gap, missing og den efterfølgende strøm-recovery, hvor det manglende punkt stadig lå i 48-timersvinduet. For de 20 sammenlignelige par var den syntetiske middelændring `+5,150`, minimum `−2` og maksimum `+42`. Disse tal beskriver kun de valgte syntetiske checkpoints.

## Frossen komponent-kontrafaktisk: Candidate G mod den integrerede model

De 24 frosne komponentpar — 48 individuelle modelevalueringer — gav en gennemsnitlig scoreændring på `+8,792`, minimum `0` og maksimum `+41`. Fire individuelle Candidate G-evalueringer blev nulstillet af den gamle 13-timers helscoregate; ingen af de fire tilsvarende integrerede evalueringer blev nulstillet.

Dette spor holder transport- og mobiliseringspotentialerne fast som syntetiske input til evaluatorerne. Det isolerer scorekontrakten, men beviser ikke, at de to statepipelines ville producere de indsprøjtede potentialer fra et bestemt vejrhistorikforløb. Det kronologiske bevis står i afsnittet ovenfor.

| Syntetisk situation | Jagtform | Candidate G | Integreret | Forskel | Integreret transport |
|---|---|---:|---:|---:|---:|
| Balanceret påland | Strand | 71 | 72 | +1 | — |
| Balanceret påland | Waders | 72 | 72 | 0 | — |
| Positiv strømtilførsel 70, aktive fralandsbølger | Strand | 70 | 71 | +1 | 70 |
| Positiv strømtilførsel 70, aktive fralandsbølger | Waders | 73 | 74 | +1 | 70 |
| Lav strømtilførsel, pålandsbølger | Strand | 43 | 46 | +3 | — |
| Lav strømtilførsel, pålandsbølger | Waders | 46 | 49 | +3 | — |
| 12 effektive timer ud | Strand | 37 | 43 | +6 | 4 |
| 12 effektive timer ud | Waders | 37 | 43 | +6 | 4 |
| 13 effektive timer ud | Strand | 0 | 41 | +41 | 0 |
| 13 effektive timer ud | Waders | 0 | 41 | +41 | 0 |
| 14 effektive timer ud | Strand | 0 | 41 | +41 | 0 |
| 14 effektive timer ud | Waders | 0 | 41 | +41 | 0 |
| Høj energi, transport 0, påland eller fraland | Strand | 31 | 37 | +6 | 0 |
| Høj energi, transport 0, påland eller fraland | Waders | 37 | 43 | +6 | 0 |
| Maksimal transport, høj energi, påland | Strand | 87 | 87 | 0 | 100 |
| Maksimal transport, høj energi, påland | Waders | 80 | 80 | 0 | 100 |
| Maksimal transport, høj energi, fraland | Strand | 86 | 87 | +1 | 100 |
| Maksimal transport, høj energi, fraland | Waders | 80 | 80 | 0 | 100 |
| Efterfølgende roligt forløb | Strand | 71 | 72 | +1 | — |
| Efterfølgende roligt forløb | Waders | 71 | 71 | 0 | — |
| Ekstremt dårlige wadersforhold | Strand | 85 | 85 | 0 | — |
| Ekstremt dårlige wadersforhold | Waders | 0 | 0 | 0 | — |

Tabellen viser to vigtige egenskaber:

1. 13 timers stærk fralandsstrøm kan fortsat reducere **transportpotentialet** til 0.
2. En **klar, verificeret** transportkomponent på 0 bruges ikke længere som bevis for, at mobilisering, jagtbarhed og et ukendt lokalt/sekundært lager også er 0. Manglende strømstate er en anden tilstand og gør fortsat scoren utilgængelig.

Det store løft på 41 point i gate-scenarierne er derfor tilsigtet kontraktadfærd, men fortsat en ukalibreret ændring — ikke evidens for flere fund.

Retningsinvariansen ved både transport 0 og transport 100 bekræfter, at den aktive last mile er score-neutral. Bølger kan ikke skabe transport fra nul, og kendt fralandsretning reducerer ikke et eksisterende strømtransportpotentiale.

## Ablation af kobling til uobserveret lager

RavRadar observerer hverken lokalt ravlager eller sekundære beholdninger bag revler, på strandfladen eller i den nære kystzone. Auditten afprøvede derfor fem **kontrafaktiske skalarregler** på de samme 24 frosne scenario-/jagtformpar. `M` er den modellerede mobiliseringsmulighed og `T` den klare, verificerede strømtilførselskomponent; ingen af dem er ravmasse.

| Variant | Effektivt mobiliseringsled | Syntetisk middel | Middelforskel fra aktiv | Største absolutte forskel | Observeret scoreinterval ved `T=0` | Balanceret strand | 13 timer ud, strand | Høj bølge/`T=0`, strand |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Aktiv additivitet | `M` | 56,500 | 0 | 0 | 37–43 | 72 | 41 | 37 |
| Fuld kobling | `M × T/100` | 43,000 | −13,500 | 27 | 10–19 | 66 | 18 | 10 |
| Kvadratrodskobling | `M × sqrt(T/100)` | 44,500 | −12,000 | 27 | 10–19 | 68 | 18 | 10 |
| Eksplicit 50 %-lagerprior | `M × (0,5 + 0,5 × T/100)` | 49,750 | −6,750 | 14 | 23–30 | 69 | 30 | 23 |
| Minimumsbottleneck | `min(M,T)` | 44,292 | −12,208 | 27 | 10–19 | 72 | 18 | 10 |

Tallene er syntetiske kontraktresultater, ikke fundkalibrering. Den aktive variants observerede 37–43 er heller ikke dens matematiske maksimum. Ved `T=0` kan 20/50/30 højst give `0,20 × 100 + 0,30 × 100 = 50`; scoren kan dermed være dårlig eller højst svag under præsentationsgrænserne 35/55/75, aldrig middel eller god. Waders-cappen kan sænke den yderligere. Dette loft gælder kun en klar nulkomponent. Ikke-klar eller manglende strømstate fejler lukket og giver ingen score.

Fuld-, kvadratrods- og minimumsvarianten gør alle den aktuelle strømtilførsel til proxy eller hård øvre grænse for hele det mobiliserbare lokale/sekundære lager. Ved `T=0` undertrykker de derfor mobiliseringsleddet, selv om RavRadar ikke har observeret, at dette lager er nul. 50 %-varianten undgår hard-zero, men indfører i stedet en konkret, udokumenteret antagelse om, at halvdelen af lageret er uafhængigt af strømtilførslen.

Aktiv additivitet tilfører mindst ekstra **lagerstruktur** blandt disse alternativer, fordi `T` ikke omfortolkes som lagermåling. Det gør ikke additiviteten antagelsesfri: den bevarer en ukalibreret prior om indeksmæssig separabilitet og kompensation, og `M` skal altid forklares som en betinget mulighed — “hvis materiale er tilgængeligt” — aldrig som bevis for lager eller forventet fund. Uden repræsentative fund/nul-fund kan ablationen ikke vælge en empirisk optimal kobling. Der blev derfor ikke fundet en kontradiktionsfejl, som begrunder ændring af den aktive formel.

## Vægtfølsomhed

20/50/30 reproducerede den faktiske integrerede score i alle evaluerede scenario-/jagtformpar.

| Vægtning | Syntetisk middel | Middelforskel fra 20/50/30 | Største absolutte forskel | 12 timer ud minus balanceret strand |
|---|---:|---:|---:|---:|
| 20/50/30 | 56,500 | 0 | 0 | −29 |
| 25/40/35 | 60,333 | +3,833 | 9 | −21 |
| 20/45/35 | 58,417 | +1,917 | 5 | −25 |
| 15/50/35 | 56,667 | +0,167 | 4 | −29 |

20/50/30 og 15/50/35 bevarer den største syntetiske kontrast mellem balanceret tilførsel og det næsten udtømte 12-timers strømspor. Auditsporet kan ikke afgøre, om 20/50/30 er empirisk optimalt; vægtene forbliver en transparent prior.

## Strømhukommelse

### 12/13/14 timer og +10/−8

Med fuldt udgangspunkt, fuld fralandsstyrke og kontraktens `−8` gav replay potentialerne 4, 0 og 0 efter henholdsvis 12, 13 og 14 effektive timer. Den integrerede transportkomponent kan dermed nå nul på samme tidsskala som Candidate G. Kun den separate helscoregate er fjernet.

| Rateprior | Seks moderate timer ind | Tolv fulde timer ud efter mætning |
|---|---:|---:|
| +8/−8 | 24 | 4 |
| +10/−8 | 30 | 4 |
| +10/−10 | 30 | 0 |
| +12/−8 | 36 | 4 |

`+10/−8` er en asymmetrisk prior med 0/100-klipning, ikke en estimeret massebalance.

### Alderskerner

| Syntetisk forløb | Fuld 24 + cosinus til 48 | Ens 48 | Lineær til 48 | Eksponentiel halvering 24 |
|---|---:|---:|---:|---:|
| Vedvarende ind | 100 | 100 | 100 | 100 |
| Seks timers vending ud | 52 | 52 | 55 | 55,929 |
| Tolv timers vending ud | 4 | 4 | 16 | 18,869 |
| Ældre ind, senest neutral | 100 | 100 | 60 | 86,562 |

Den valgte kernel reagerer stærkere på en nyere kraftig vending end de lineære og eksponentielle alternativer, men bevarer dokumenteret indgående evidens fuldt i det første døgn. Det er modeladfærd, ikke et fundresultat.

### Styrkegrænser

I det blandede syntetiske forløb gav grænserne `0,02–0,12`, `0,03–0,15` og `0,05–0,20 m/s` slutpotentialerne henholdsvis 32,8, 52 og 38,4. Den ikke-monotone forskel skyldes styrkeskalering, kronologisk 0/100-klipning og et efterfølgende udgående spor.

Auditten dokumenterer reel følsomhed, men giver ikke evidens for at erstatte den aktive `0,03–0,15`-prior.

## Bølgemobilisering: 3/4/6 og 24/48/72

Auditten brugte 12 timers ens høj energiproxy efterfulgt af 72 timers ro.

| Opbygning | Aftrapning | Efter 12 timer høj energi | Efter 24 timer ro | Efter 48 timer ro | Efter 72 timer ro |
|---:|---:|---:|---:|---:|---:|
| 3 | 24 | 70,312 | 35,156 | 17,578 | 8,789 |
| 3 | 48 | 70,312 | 49,718 | 35,156 | 24,859 |
| 3 | 72 | 70,312 | 55,807 | 44,294 | 35,156 |
| 4 | 24 | 65,625 | 32,812 | 16,406 | 8,203 |
| 4 | 48 | 65,625 | 46,404 | 32,813 | 23,202 |
| 4 | 72 | 65,625 | 52,087 | 41,341 | 32,812 |
| 6 | 24 | 56,250 | 28,125 | 14,062 | 7,031 |
| 6 | 48 | 56,250 | 39,775 | 28,125 | 19,887 |
| 6 | 72 | 56,250 | 44,646 | 35,435 | 28,125 |

Den aktive 4/48-kontrakt ligger midt i den afprøvede matrix: 65,625 efter opbygning og 46,404, 32,813 og 23,202 efter 24, 48 og 72 timers ro. Det gør den moderat i denne syntetiske matrix, men validerer ikke halveringstiderne mod ravfund.

## Last mile: aktiv kontrakt og forkastet kontrafaktisk faktor

Den aktive kontrakt er:

```text
delivery = transportPotential × 1
```

Den isolerede højenergi-audit gav:

| Retningsgrundlag | Delivery/transport | Vægtet transportbidrag | Strandscore | Waders-score | Status |
|---|---:|---:|---:|---:|---|
| Kendt påland | 100 | 50 | 86 | 82 | `LAST_MILE_UNRESOLVED_SCORE_NEUTRAL` |
| Kendt tværgående | 100 | 50 | 86 | 82 | `LAST_MILE_UNRESOLVED_SCORE_NEUTRAL` |
| Kendt fraland | 100 | 50 | 86 | 82 | `LAST_MILE_UNRESOLVED_SCORE_NEUTRAL` |
| Manglende retning | 100 | 50 | 86 | 82 | `LAST_MILE_UNRESOLVED_SCORE_NEUTRAL_DIRECTION_UNKNOWN` |

Ved transportpotentiale 80 og manglende retning forblev delivery 80. Et numerisk plausibelt interval blev ikke leveret (`null`). Ved manglende bølgehøjde eller periode var resultatet utilgængeligt med `LAST_MILE_TRANSPORT_NOT_READY`, fordi påkrævede fysiske input i den samlede kæde manglede.

Alle gyldige retninger har:

- scoreeffekt `NONE`,
- `physicalDeliveryResolved = false`,
- strukturel last-mile-usikkerhed,
- intet numerisk fysisk usikkerhedsinterval.

### Kontrafaktisk ablation

Auditten beholder korrektioner på 0 %, 5,25 % og 10 % for at måle følsomhed, men kun 0 % svarer til aktiv scoreeffekt:

| Antaget korrektion | Størst mulig reduktion af transport 0–100 | Størst mulig rå totalscoreeffekt ved 50 % transportvægt | Status |
|---:|---:|---:|---|
| 0 % | 0 | 0 | Aktiv score-neutral kontrakt |
| 5,25 % | 5,25 | 2,625 | Forkastet kontrafaktisk ablation |
| 10 % | 10 | 5 | Kontrafaktisk følsomhedsgrænse |

`5,25 %` er ikke et fysisk interval, midpoint, forventningsestimat eller produktionsparameter. Den tidligere numeriske retningsmodel er forkastet, fordi RavRadar ikke har lokal batymetri eller en opløst surfzonemodel til at begrunde fortegn og størrelse.

Auditten løser derfor heller ikke sidste stykke gennem revler og surfzone. Den dokumenterer præcist, at modellen **ikke** foregiver at have løst det. Aagaard et al. 2002 (`10.1016/S0025-3227(02)00193-7`) viser, at konkurrencen mellem undertow, bølgeskævhed, orbitalhastighed og lokal dybde kan give både land- og søværts transport over revler; Jalón-Rojas et al. 2025 (`10.5194/gmd-18-319-2025`) viser partikelpositionens betydning for Stokes-/undertoweksponering; Lofty et al. 2023 (`10.1016/j.watres.2023.120329`) bruger målt rav som lavdensitets bedload/saltation. De er mekanistisk kildekritik, ikke dansk last-mile-kalibrering, og offline-retningsinvariansen er derfor en sikkerhedsbeslutning frem for et fysisk valideringsresultat.

## Vandstand, missing og cadence

Faldende, stabil og stigende vandstand gav score 72 for både strand og waders. Alle tre havde nul scoreeffekt. Det er foreneligt med, at faldende vand både kan blotlægge eller efterlade rav ved revler og i andre lokale forløb ledsage udadgående vandbevægelse. Uden lokal procesopløsning må scenarierne ikke omsættes til universelle point.

Fail-closed- og cadencekontrollerne bestod:

- komplet 48-timers strømspor: `READY`,
- godkendt to timers native hold: `READY_NATIVE_HOLD` uden statebevægelse,
- fire timers hold: `LATEST_SAMPLE_GAP`,
- missing i vinduet: `WINDOW_HAS_MISSING_EVIDENCE`,
- for stort internt gap: `WINDOW_HAS_TIME_GAP`,
- bølger: `COLD_START` → `READY` → `MISSING_INPUT` → `RECOVERED_SHORT_GAP` → `RESTARTED_AFTER_GAP`,
- recovery/restart: højst én times ny buildkredit,
- manglende strandvind: `BEACH_WIND_INPUT_MISSING`,
- manglende klar strøm-, bølge- eller jagtbarhedstilstand: lokal score utilgængelig med specifik årsag.

Strømevidensloftet er 49, ikke 50. Et eventuelt reelt præ-grænse-bropunkt er del af de 49. Den tætte, ujusterede overskridelse fejler lukket.

## Strand og waders

72 kombinationer af jagtform, vind og bølgehøjde blev sammenlignet med Candidate G’s godkendte jagtbarhedsprofil. Største absolutte forskel var 0. Ved 15 m/s var waders-jagtbarheden altid 0, mens strand lå mellem 25,72 og 55,72 afhængigt af bølgerne.

Den integrerede totalscore respekterede waders-cap i alle 15 relevante cap-evalueringer med maksimal overskridelse 0. Strand havde i de 15 tilsvarende kontroller ingen waders-cap og bevarede sin separate semantik.

## Understøttede forbedringer

Auditten understøtter følgende kontraktmæssige forbedringer:

- Candidate G’s helscore-nul ved 13 timer er fjernet, mens transportpotentialet fortsat kan nå 0.
- Aktuel gridstrøm, bølgemobilisering og last mile er adskilte komponenter.
- Last mile er score-neutral i alle retninger og skjuler ikke uopløst surfzonefysik i en lille faktor.
- Bølger kan ikke skabe transport ved potentiale 0.
- Missing obligatoriske input fejler lukket; retning alene kan mangle score-neutralt og med synlig usikkerhed.
- Vandstand forklares uden scorepoint eller dobbelttælling.
- Native cadencehold tilføjer hverken bevægelse eller kunstig historik.
- Candidate G’s godkendte strand-/waders-jagtbarhed er bevaret præcist.
- Schema-4's særskilte rollbackmobilisering reproducerer Candidate G-oraklet eksakt i hele det kronologiske spor og i split-run.
- Det tidligere `5,25 %`-design er fanget og forkastet før cutover.

## Regressionsrisici og uafgjorte områder

- Fjernelsen af helscoregaten løfter de syntetiske 13-/14-timers scenarier med 41 point. Det er tilsigtet, men stort og ikke fundkalibreret.
- Fjernelse af tidligere bottlenecks løfter flere lav-transportscenarier.
- Aktiv additivitet er den mindst ekstra lagerstrukturerende af de afprøvede regler, men separabilitet og kompensation er stadig ukalibrerede priors.
- En ikke-nul score ved klar transport 0 er kun et betinget mulighedsindeks og må aldrig præsenteres som evidens for et lokalt lager.
- Strømkerne, grænser, rater og bølgehalveringstider flytter de syntetiske resultater mærkbart.
- Modellen observerer ikke den lokale ravbeholdning.
- Auditsporet estimerer ikke, hvor meget rav vedvarende fralandsstrøm faktisk fjerner fra strand-/revlesystemet.
- Auditsporet afgør ikke, hvornår faldende vand primært blotlægger/retinerer materiale eller ledsager søværts transport.
- Surfzone, revler, lokal batymetri, undertow, feeder-/langskyststrøm, ripstrømme, aflejring og retention er uopløst.
- 20/50/30, `0,03–0,15`, `+10/−8` og 4/48 forbliver transparente priors, ikke estimerede optimum.

Ingen af disse uafgjorte områder må omskrives til et numerisk fysisk last-mile-interval eller en påstand om empirisk højere fundpræcision.

## Reproduktion

Kør den datasikre selvtest fra repositoryroden:

```powershell
node scripts/audit-ravscore-integrated-offline-evidence.mjs --self-test
```

Den fulde maskinlæsbare rapport fås uden `--self-test`. Scriptet stopper ved kontrakthash-mismatch, brud på Candidate G-/integreret invariant, hvis den målrettede rollbackmutation ikke afvises, eller ved forbudte rå strømvektor-/koordinatfelter i rapportobjektet.
