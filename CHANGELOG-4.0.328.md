# RavRadar 4.0.328 – per-pair-verificeret vejrfallback

Dato: 2026-09-06

## Ændret

- Currentindsamlingen adskiller nu verificeret per-pair availability fra strict DMI READY og fra den endelige publiceringsclosure.
- Kandidatcachen genbruger kompatible gyldige DMI-par. Availability-ledgeren beregner den eksakte inverse rest over hele target..+117, inklusive interne huller, hale, local asset failure og registrybundet schema-3 total outage. En strukturelt ugyldig kandidat digest-karantæneres og genoprettes atomisk fra den separate strict READY-active-donor.
- DMI-assets behandles transaktionelt. Download-, parse-, grid- og processingfejl isoleres til det konkrete asset, senest committede checkpoint bevares, og senere assets fortsætter.
- Supervisoren bruger en stabil collection/run/time/item/URL-/revisionsidentitet. Et fastlåst asset kan bounded stoppes og springes over efter restart; watchdogtiden håndhæves også under kontinuerligt logoutput, og en malformed markør kan aldrig autorisere et gættet skip.
- Copernicus source-stage kan være `READY` eller target/DMI/shadow-bound `IN_PROGRESS`, også med nul attempts. Partial status kan aflevere den ærlige rest, men er ikke udtømning, complete seal eller releasebevis.
- Ugyldige afledte private Copernicus shadow-/stagefiler kan digest-karantæneres og genopbygges. Centrale targets, targetregistry og DMI-ledger valideres først og stopper fortsat fail-closed.
- Open-Meteo udfylder kun den eksakte sidste currentrest som `open-meteo-combined-current`, højst 15 km, target-only, UTC/m/s/grader og altid `calibrationEligible=false`.

## Bevarede sikkerhedsgrænser

- Active-promotion kræver fortsat strict producent-success, `DMI_READY`, current-anchor, `candidate_promoted=true` og eksakt registrybevis.
- Alle 673 × 118 = 79.414 operationelle currentpar skal have præcis én kildeklasse, nul overlap og nul missing før public/runtime/deploy. Alle fulde validate-/releasegates består.
- De foregående 48 timers verificerede historik er rådgivende. Mangler giver `HISTORY_INCOMPLETE`; historik syntetiseres ikke og tæller ikke som operationel closure.
- DMI-first, Copernicus-produktprioritet, regional policy, fysisk Open-Meteo-scope, privacy, scoremodel, geometri og land-/vandpunkter ændres ikke.

## Test- og releasestatus

- De målrettede lokale tests er grønne: DMI-supervisor 11/11, transactional checkpoint/recovery 17/17, WAM-integration 21/21 samt availability, Copernicus registry/source-stage, regional current, Open-Meteo statusmatrix, exact closure/diagnostik og live adapter.
- Operational/advisory-beviset fuldvalideres én gang pr. konkret dokument og indekseres derefter på `(partId, validTime)`. En 673-opslagsregression beviser, at runtime ikke genitererer eller genhasher alle 79.414 entries for hver kystdel, mens den konkrete entry fortsat rehashes og kontrolleres mod objekt-, indeks- og assignmentbinding.
- Den rumlige slutgate reproducerer vist hastighed, retning, proveniens og pilplacering fra closurebundet privat U/V. Rå `u/v`, `uMps/vMps` og `currentUMps/currentVMps` må fortsat ikke forekomme i public/runtime-projektionen.
- De deterministiske modelclosures er genforseglet efter adapterændringen: integrated `4346bf2de26a0dde25c3ef8dc72e741d6259f15282801e62a95a31a8f6594c0d` over 55 filer, Candidate G rollback `71a093a4b419891cb41f582de2ab926a2ea23e5abbe16015cc2b6f4b3ae8be0f` over 56 filer og continuation `5456d603a687e03b8983b5a97712b4acd305011a6029edb90df72d1d3e4f702f`.
- Den nye append-only migration `20260906162332_per_pair_weather_fallback_binding.sql` fører kun disse forseglinger og sit readback-id frem. Den historiske Open-Meteo-migration er byteuændret.
- Gammel-main normalrun `34034258619` bevarede DMI-cachen og gemte yderligere Copernicus-fremgang, men blev rødt efter den afgrænsede 360-sekunders Copernicus-timeout. Det er ikke datatab: 4.0.328 bygger downstream-registret fra den vedligeholdte DMI-kandidat og lader kun en target-/DMI-/shadow-verificeret `IN_PROGRESS`-rest fortsætte til Open-Meteo.
- Dette er ikke et releasebevis. Fuld `validate:source` skal køre én gang i GitHub på PR'ens eksakte head. Derefter mangler merge, frisk main-oneoff/normal catch-up, 79.414/79.414 current, Feggesund 354/354, fuld `npm run validate`, `npm run release:gate`, artifact/deploy, kapacitet og offentlig verifikation.
- Candidate G er fortsat offentlig. 4.0.328 må ikke kaldes stabil eller online før hele den eksterne kæde er grøn.

## Drift efter stabilisering

- Ekstern cron forbliver primær payloadfri dispatcher, fordi GitHubs native schedules kan stå i kø eller udeblive; GitHub-schedules er reserve.
- Normale kørsler vedligeholder hele vejrvinduet. Oneoff er alene en stor genopfyldning.
- Når den nye model er online, måles DMI, Baltic, AMM15, regional DMI og Open-Meteo særskilt for rækkefølge, tidsforbrug, cachegenbrug og targetfriskhed. Budget/kadence ændres kun på evidens; større pipelineoptimering er udskudt.
