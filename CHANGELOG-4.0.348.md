# RavRadar 4.0.348 – målbar model-warmup og låst cachekontrol

Dato: 2026-09-12
Status: exact-head-valideret og merged; backendbinding/readback grøn; cachekontrol beviste komplet gemt vejr, men fandt en separat v1/v2-modelkontraktfejl. Afløst af 4.0.349 før cutover.

## Faktisk produktionsgrundlag

- PR #281-head `c4c70ac7` bestod exact-head-sourcegaten i run `34681246581` og blev merged byteidentisk som `6868ae04`.
- Oneoff `34682428800` genbrugte kildebeviset uden en anden fuld kildegate og låste target til `2026-09-12T08:00:00Z`.
- DMI gav 67.686/79.414 direkte currentpar. Før Copernicus var den samlede validerede union 79.221/79.414, altså 193 reelle rester.
- Den afsluttende currentclosure var komplet: 67.686 DMI + 8.668 Copernicus + 944 regional + 2.116 Open-Meteo = 79.414/79.414 og nul mangler. Native WAM-gaten var grøn med 79.060 verificerede part/timer.
- Kørslens modelbygning stoppede bagefter på `Candidate G rollback score quality requires exact READY 48-hour state`. Derfor blev intet handoff, artifact, cutover eller deploy dannet, selv om currentdataene var komplette.

## Rettet model-warmup

- Den integrerede model må som besluttet køre med ærlig `HISTORY_INCOMPLETE` under første målte opvarmning.
- Det separate Candidate G-rollback-orakel beholder sine private numeriske beregninger og målte continuation state, men dets valgbare/offentlige modes projiceres som utilgængelige med null-score, indtil præcis 48 timers READY-historik findes.
- Denne undtagelse kræver enten attesteret målt koldstart eller en valideret tidligere privat `BUILDING_MEASURED_ONLY`-tilstand. En umarkeret, legacy-omdøbt eller på anden måde ukendt non-READY-state fejler fortsat.
- Ingen vægt, tærskel, fysikregel, historiksyntese, geometri, grid-, afstands- eller providerregel ændres.

## Låst cachekontrol uden ny providerhentning

- Den isolerede 118-timerspreflight har en eksplicit `locked_weather_resume`-tilstand, som kræver det præcise target som input.
- DMI-katalog/producer og Copernicus-plan/producer springes over. Open-Meteo kører kun sin eksisterende `--reuse-only`-projektion.
- `update:weather` får en central fail-closed netværksspærre. Hvis en skjult vejrforespørgsel forsøges i cachetilstanden, stopper den med `WEATHER_CACHE_ONLY_NETWORK_DISABLED`.
- Alle eksisterende cache-, target-, registry-, provenance-, WAM-, currentclosure-, freshness-, runtime-, privacy- og handoffkontroller består. Mangler den gemte cache noget, stopper kørslen; den falder ikke automatisk tilbage til en lang providerkørsel.
- En senere reel acquisition-oneoff bruger som standard ét DMI-pass. To eller tre pass kræver et eksplicit diagnostisk valg. Run `34682428800` viste kun ét wrapperpass, så multipass er fortsat et driftsmålepunkt og ikke et påstået produktionsbevis.

## Append-only backendbinding

- Den tidligere WAM-binding `20260909194000_wam_same_run_resolution_binding.sql` er allerede anvendt i den centrale database. Dens normaliserede SHA-256 er låst til `a76ae8bd0de79cbbbc79edcff0af92e37c2dfb3d5798e9c35e4337cbfea6606d` og filen omskrives ikke.
- Ny migration `20260912122607_measured_rollback_warmup_binding.sql` fører kun den integrerede bundlehash til `e545cb54…`, rollbackbundlehashen til `157698f0…`, continuationhashen til `b7555f63…` og readbackversionen frem. Rækker, statekrav og databaseadfærd er ellers identiske med den låste forgænger.
- Backendmigrationen skal anvendes og dens readiness-readback være grøn på exact main før cachekontrollen. Backendworkflowet må genbruge PR'ens live-verificerede exact-content-kildebevis; manglende eller modstridende bevis udløser sikkert en ny fuld kildekontrol.
- Den lokale slutmatrix er grøn for begge modelbundles, recovery/rollback, den fulde isolerede 210/673-public-stage, migrationskæde, backendreadiness, cacheworkflow, DMI-wrapper, dokumentation, sikkerhed, version, YAML og diff. Dette er lokalt bevis, ikke exact-head-, database- eller produktionsbevis.
- PR #282's første exact head `cc06fa37` nåede gennem model-, 210/673-public-stage-, privacy-, runtime- og migrationskontrollerne, men run `34695465328` stoppede efter 17m40s i releasegatens egen statiske testliste. Package-aliaset indeholdt den nye migrationsbygger, mens releasegatens forventning og eksekveringsplan stadig sluttede ved Open-Meteo-testen; intet sourceproof blev uploadet.
- Opfølgningen føjer migrationsbyggeren præcis én gang til releaseplanen, retter den eksakte packageforventning og lader metadata-regressionen låse begge dele sammen. Migrationskæde, sourceplan med 35 korrekt genbrugte underkommandoer, fejlaggregering og produktionsudfald er grønne lokalt. Den røde head genbruges ikke; ny exact-head-CI kræves.

## Kildegate og næste rækkefølge

Én fuld `validate:source` skal bestå på 4.0.348-PR'ens eksakte slut-head. Byteidentisk main må genbruge beviset efter den eksisterende live GitHub-kontrol. Fuld post-data `validate`/`release:gate`, handoff, artifact/privacy, cutover, deployment og offentlig 210/673-verifikation kan ikke springes over.

Efter merge anvendes først den append-only backendbinding og dens readback verificeres. Derefter køres cachekontrollen mod target `2026-09-12T08:00:00Z`. Kun et nyt same-head-handoff efter alle uændrede gates må bruges til den autoriserede integrerede cutover. Normal drift forbliver deaktiveret, indtil den offentlige model er verificeret; derefter bevises almindelig vedligeholdelse særskilt.

## Faktisk efterforløb

PR #282 blev siden grøn og merged som main `c86cc2a0`. Backendrun `34697586057` genbrugte exact-content-kildebeviset, anvendte alene denne releases append-only migration og bestod readback. Cachekontrol `34697760571` hentede intet nyt vejr og bestod current-, WAM- og freshnessleddene, men stoppede i modelbygningen på en gammel RavScore-v1-forventning mod live-current-producentens gældende v2-markør. 4.0.349 retter denne særskilte kontraktseam; 4.0.348 udførte ingen cutover eller offentlig modelændring.
