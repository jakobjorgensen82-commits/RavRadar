## 4.0.102 – 2026-08-05
- Kortets farver er ændret fra “forslag + aktiv routing” til kun at vise den aktive routing for zonen.
- Aktiv automatik vises grønt. Aktivt administratoroverride skjuler grønne markører og viser kun administratorens kilder rødt.
- Lilla “begge valg” er fjernet.
- Dublerede administratorvalg deduplikeres; én kilde vises og anvendes med 100 % vægt.
- Ingen ændring af automatisk udvælgelse, DMI-data, femdøgnsserier, interpolation, RavScore eller offentlig prognosekæde.


## 4.0.101 – 2026-08-05
- Rettede kun den automatiske udvælgelse af vandstandskilder.
- Admin genberegner nu valget fra de aktuelle brugbare kilder med samme topologiske kernefunktion som produktionen i stedet for at lade et gammelt/tomt auditdokument være autoritativt.
- Automatisk valg bevarer interpolation mellem to kilder med afstandsvægte og bruger én gyldig kilde med 100 % vægt, når en komplet topologisk indramning ikke findes.
- Manuel override og hele vandstands-, score- og prognosekæden fra 4.0.100 er bevidst ikke ændret.
- 4.0.95: Vandstandsstations-admin viser ukendt status ærligt, markerer udfasede stationer særskilt og viser inverse afstandsvægte for administratorvalgte stationer. DMI-hentning, prognosecache og scoremotor er uændret.
## 4.0.75 – 2026-08-02

- Rettede den fejlede 4.0.74 GitHub-integration.
- Samlede public runtime, manifest, hydrering og deploy omkring én deterministisk writer.
- Tilføjede hash- og pipelinekontrol samt DEC-0023.

## 4.0.72 – 2026-08-02
- Rettet uoverensstemmelsen mellem den aktuelle RavScore og “Bedste beregnede tidspunkt”.
- Den aktuelle vurdering indgår nu som kandidat for dagens prognose, og fortidige timer kan ikke vælges.
- Den højeste samlede RavScore vinder altid; vandstand bruges kun som tie-breaker ved samme score.
- Zoneprognosen og landsprognosen bruger nu samme centrale udvælgelsesfunktion.
- Visningen forklarer valget og kan vise de bedst rangerede alternative tidspunkter.
- Tilføjet bindende regressionstest for bedste-tidspunkt-konsistens.

## 4.0.71 – 2026-08-02
- Rettet den samlede sitetest, så resultatet altid vises direkte under knappen.
- Tilføjet levende fremdrift og synligt resultat for hver deltest.
- Tilføjet tydelig fatal fejlvisning og samlet timeout, så tavs afslutning eller evig kørsel ikke kan forveksles med succes.
- Seneste rapport gemmes lokalt og vises igen efter genindlæsning.
- Release-testen kræver nu synlig start, fremdrift, slutrapport og fejlstatus.

## 4.0.70 – 2026-08-02
- Udvidet den tidligere begrænsede sitetest til en samlet funktionstest af hele RavRadar.
- Testen åbner den offentlige side i en isoleret browserramme og kontrollerer kort, zonefarver, rangliste, jagtform og femdøgnsprognose.
- Tilføjet kontroller af landsdata, assistent, admin, Supabase, deployfiler, service worker, JavaScript-fejl og performance.
- Testrapporten grupperes efter område og kan downloades som JSON.
- Tilføjet DEC-0020 om samlet siteaccept og regressionsbeskyttelse.

## 4.0.69 – 2026-08-02
- Repareret “Kontrollér nu” med synlig status og fejlhåndtering.
- Tilføjet samlet sitetest og ægte CRUD-test af håndbogsreview i Supabase.
- Omskrevet ekspertens arbejdsplan og tilføjet læsehjælp i alle håndbogskapitler.
- Tilføjet DEC-0019.

## 4.0.68 – 2026-08-02
- Rettet Pages-deployregression: `js/services/handbook-review-store.js` blev fejlagtigt udelukket, selv om admin importerede modulet.
- Tilføjet browsermodul-lukningstest, som bygger det faktiske Pages-artifact og verificerer alle statiske modulimports fra `index.html` og `admin.html`.
- Release Gate stopper nu udgivelsen, hvis et importeret browsermodul mangler i deploy-artifactet.

## 4.0.67 – 2026-08-01
GitHub Actions-regression rettet: `manifest.json` og `conditions.json` hydreres nu som ét atomisk vejrdatasæt og må aldrig få forskellige `datasetId`.

## 4.0.66 – 2026-08-01
Admin-loginregression løst uden ny Supabase-opsætning; strømaudit, assistent-intents og frisk progressiv opstart indført.

## 4.0.58 – 2026-08-01
- Færdiggjort den adgangsbeskyttede RavRadar-håndbog med dyb faglig beskrivelse af rav, lavdensitetspartikler, kysthydrodynamik, sedimenttransport og implementering i RavScore.
- Kortlagt alle aktuelle tærskler, vægte, retninger, caps og ekspertregelprocesser til den faktiske kode.
- Indført bindende RDKS Release Governance efter læringen fra 4.0.56-forløbet.
- Tilføjet automatisk release-gate, sikker pakning og release-rapport.
- Registreret arkitekturretning for `ravradar.dk`, uden at aktivere CNAME før DNS og Supabase redirects er klar.
- Omdøbt brugerfladens “drejebog” til “håndbog”.

## 4.0.54 – 2026-07-31
- Implementerede stationsspecifik prognose-/cachestatus og samlet anvendelighed.
- Gyldig cache kan holde en station i automatisk routing, selv om nye observationer midlertidigt mangler.
- Tilføjede cachetilstandsnotifikationer og adminvisning af observation, cache og samlet status.
- Tilføjede dokumentationscenter i admin og opdaterede håndbogen.

# RDKS Master Log

## 4.0.53 – 2026-07-31
- Importeret syv historiske chats fra `chat.zip`.
- Rekonstrueret kronologien ud fra tekst og versionsforløb, ikke filnavne.
- Bevaret normaliseret kildetekst med SHA-256 og sporbarhed.
- Oprettet gældende beslutninger om DMI, retninger, zoner, stationer, score, admin, kysteditor, håndbog og sikker chatimport.
- Oprettet samlet aktiv kravoversigt, kendte issues og implementeringsstatus.
- Udbygget den levende håndbog i både Markdown og den synlige webdrejebog.
- Registreret som planlagt krav, at stationers observationsstatus og prognose-/cachestatus skal adskilles, og at gyldig cache fortsat gør stationen prognosebrugbar.
- Ingen produktionsalgoritmer er ændret alene på baggrund af historiske chats.

## 4.0.52 – 2026-07-31
- Opdaterede forældet admin-persistence-test til stationslivscykluskæden.

## 4.0.51 – 2026-07-31
- Første RDKS- og stationslivscyklusgrundlag.

## 4.0.56 – Supabase-sikret administration

Status: Implementeret

- Hele adminområdet kræver gyldig Supabase-session og relevante rettigheder.
- Håndbogen er flyttet bag Supabase-adgangskontrol.
- Ny særskilt eksperttilladelse til at læse håndbogen.
- Beskyttede admin-data synkroniseres til Supabase i stedet for at blive offentliggjort på GitHub Pages.
- Gamle vejrdata over friskhedsgrænsen afvises.
- Nye appversioner aktiveres og genindlæses automatisk.
## 4.0.57 – 2026-08-01

Status: Implementeret

- Stabiliseret Supabase-sikret administration efter installationsaudit.
- Rettet SQL constraint-inspektion og understøttelse af nye `sb_secret_` servernøgler.
- Håndbogen synkroniseres nu automatisk som beskyttet admin-dokument.
- Rå runtime-diagnostik hentes ikke længere fra en offentlig URL i admin.
- Versionskonsistens er udvidet til alle aktive bruger-, admin- og håndbogsfiler.

## 4.0.59 – 2026-08-01

Status: Implementeret og lokalt release-valideret

- Kystlinje-generatoren bevarer nu den aktuelle RavRadar-releaseversion i `data/zones.geojson`.
- Historiske geometri-snapshots må ikke overskrive releaseidentiteten.
- Release Gate testes efter samme geometri-trin som i GitHub Actions.
- Ændringen retter produktionsstop fundet af Release Governance i 4.0.58.

## 4.0.60 – 2026-08-01
- Håndbogen er færdiggjort så langt som muligt på det nuværende faglige og tekniske grundlag.
- 33 kapitler beskriver ravets og ledsagematerialers proceskæde samt den faktiske RavScore-kode.
- Ekspertvalideringsmatrix E-01–E-15 er indført.
- DEC-0015 gør evidens- og implementeringssporbarhed bindende.
- Release Gate kontrollerer fremover håndbogens faglige minimum og centrale kodekonstanter.

## 4.0.61 – 2026-08-01

Status: Implementeret

- Håndbogen er løftet fra disposition til fagligt referenceværk med 50 kapitler.
- Kystfysik, ravtransport, hypoteser, validering, feltprotokol og litteratursporbarhed er uddybet.
- RDKS DEC-0016 gør substans- og sporbarhedskrav bindende.
- Release Gate kontrollerer den udvidede håndbog og ekspertpunkter E-01–E-21.
- Hvide standardkodefelter i adminhåndbogen er erstattet af tematilpassede, læselige filreferencer.

## 4.0.62 – 2026-08-01
- Aktiv RavScore udvidet med flere veje til fundbart rav.
- Ny frigivelse og nærkystnær genmobilisering beregnes separat.
- Ingen parallel Model 2; forbedringen er implementeret direkte i produktionsmodellen.
- Håndbog kapitel 51, ekspertpunkt E-22 og DEC-0017 tilføjet.

## 4.0.63 – 2026-08-01
- Områdevalg i regelbyggeren er samlet i en landsdækkende, testbar områdemodel.
- Områder forvælger zoner, mens manuelle fravalg bevares gennem søgning og filtrering.
- Ekspertens fulde læseadgang til Regler er adskilt fra redigering og publicering.
- “Gemt centralt” viser nu lokal kvitteringstid efter verificeret Supabase-genlæsning.
- Ejerstyret og CI-baseret Supabase-persistenstest er indført.
- DEC-0018 gør områdeintegritet og central persistenstest bindende.

## 4.0.64 – Ekspertreview og Rømø-korrektion
- Ekspertformularer indlejret ved hvert håndbogsafsnit i admin.
- Supabase-write verificeres med readback før central kvittering.
- DK-B04-09 fjernet fra den aktive systembestand.
- DK-B04-08 udvidet til hele Rømøs vestside og beskyttet mod generator-rollback.

## 4.0.65 – Hydreringsbeskyttelse for slettede zoner
- Den deployede vejrtilstand må ikke genindføre pensionerede eller ukendte zoner.
- `conditions.json` filtreres mod det aktive zoneregister umiddelbart efter download og før versions-/friskhedsvurdering.
- DK-B04-09 kan derfor ikke genopstå fra en ældre GitHub Pages-cache.
- En regressionstest gør beskyttelsen bindende i den fulde valideringskæde.

## 4.0.73 – 2026-08-02
- Løst 400-fejl og skjult fejltekst i ekspertreviewets Supabase-flow uden at ændre eksisterende nøgler eller loginopsætning.
- Gjort stationshydrering historikbevarende og forhindret observationsskip i at nulstille stationernes livscyklus.
- Opdelt DMI-status i brugerprognose, DMI-komponentdækning, observation og cache.
- Udvidet helhedstesten med aktive adminfaner, navngivne ressourcer, performanceadvarsler og startup-profiler.

## 4.0.74 – 2026-08-02
- Offentlig runtime opdelt i en kompakt brugerfil og en fuld diagnosefil.
- Service worker cacher ikke længere live-data, så store query-varianter ikke ophobes.
- Mobilforsiden prioriterer et større, brugbart kort uden ændring af zoom- eller lagkontroller.
- Kontoikon, GPS-flow, knapplacering og farveforklaring er tilpasset mobilkravene.
- Håndbogen har fået et samlet kapitel om, hvordan RavRadar vurderer ravindtransport på forskellige kysttyper.
- DEC-0022 og nye regressionstests gør performance- og funktionskravene bindende.

## 4.0.76 – 2026-08-02
- Kunstige pileklynger omkring zonernes datapunkter er fjernet.
- DMI-strømpile placeres ved det dokumenterede marine gitterpunkt, som leverede current-u og current-v.
- Rå u/v-komponenter bevares i den fulde diagnosekæde og kontrolleres mod hastighed, retning og vist pil.
- 197 af 209 aktive zoner har dokumenteret DMI-marinegitterpunkt; 23.049 prognosetimer er verificeret.
- DMI-pile uden dokumenteret gitterproveniens skjules frem for at vise en usikker placering.
- DEC-0024 og håndbogskapitel 56 gør kravene bindende.

## 2026-08-02 – 4.0.77
- Rettet tom Oversigt ved første adminåbning.
- Sitetesten venter på fuld admininitialisering og opsamler browserdialoger uden popup.
- Versionskontrollen bruger faktiske runtimekilder.

## 2026-08-02 – 4.0.78
- Rettet en kritisk null-konverteringsfejl, hvor manglende DMI-u/v kunne blive til falsk 0/0-strøm.
- Indført eksplicit `verified`/`unverified` strømproveniens med gitterpunkt, metode og kildetider.
- 23.049 timer er verificeret; 1.613 timer er bevaret som ikke-verificerbare uden overskrivning.
- Strømauditten skelner nu mellem manglende dokumentation og reel fysisk uoverensstemmelse.
- DEC-0026 og en fast null-sikkerhedstest gør reglen bindende.

## 2026-08-02 – 4.0.79
- Rettet den offentlige sides fastlåste rangliste og 5-dages prognose.
- Den adaptive model indlæses nu én gang og genbruges i scoreberegninger i stedet for at blive læst og normaliseret titusindvis af gange.
- Aktuelle scores og grupperede prognosedage caches pr. zone og jagtform.
- Dobbelt rendering under opstart er fjernet, og fund-sandsynlighed beregnes kun, når zonepanelet faktisk har brug for den.
- Sitetestens kontrol af knappen til samlet funktionstest udføres nu på dashboardet og ikke efter faneskift.

## 2026-08-02 – 4.0.80
- Produktionssitetesten viste, at zonefarver var klar efter ca. 3,7 sekunder, mens rangliste og prognose først blev færdige efter ca. 21 sekunder.
- Rodårsagen var synkron opbygning af hundredvis af Leaflet-vind- og strømpile før de centrale prognosevisninger.
- Rangliste og 5-dages prognose renderes nu før pilene.
- Pilene bygges i ledig browser-tid, og Leaflet-laget afkobles under markøropbygningen for at undgå en DOM-opdatering pr. pil.
- Den gemte jagtform vælges før første scorecache opbygges.

## 2026-08-02 – 4.0.83
Brugeren dokumenterede, at dagens rangliste og 5-dages prognose kunne forblive permanent på "Indlæser", selv om automatiseret test på en kraftigere maskine afsluttede efter cirka 21 sekunder. Rodårsagen blev præciseret: DOM-ranglisten blev skrevet, men kunne ikke males, fordi den efterfølgende 5-dages beregning fortsatte synkront med omtrent 25.000 scoreberegninger. 4.0.83 indfører garanteret paint før prognosen, asynkron chunking, fremdrift og annullering ved jagtformsskift. Tidligere 4.0.79-4.0.81 må ikke betragtes som løst for denne fejl.

## 4.0.84 – Verificeret strømkonsistens efter hydrering
- GitHub-valideringen afslørede, at hydrerede prognoser kunne få rå DMI `current-u/current-v` tilføjet uden samtidig at genberegne den viste strømretning og -hastighed.
- Det skabte internt modstridende strømfelter og fik den videnskabelige strømaudit til at fejle.
- Rettelsen gør de verificerede u/v-komponenter autoritative og genberegner altid `currentSpeedMps` og `currentDirectionDeg` fra samme vektor.
- Auditgrænserne er ikke løsnet. Fejlen er rettet i datakæden.
- Ny regressionstest sikrer, at fremtidig proveniensberigelse aldrig kan efterlade u/v, retning og hastighed indbyrdes inkonsistente.

## 4.0.85 – Én kanonisk strømvektor i hele scorekæden
- Den præcise GitHub-fejl fra 4.0.84 blev reproduceret på de hydrerede produktionsdata.
- Fejlen skyldtes ikke en 180°-konvention og ikke en for løs/streng audit, men forskellig afrundingsrækkefølge: lagret u/v var afrundet, mens retning og hastighed var beregnet fra uafrundede værdier.
- Ved meget svag strøm kan dette give store vinkeludsving, fordi retningen er numerisk ustabil nær nulhastighed.
- Fremover fastlægges først én kanonisk lagret `currentUMps/currentVMps`-vektor. `currentSpeedMps` og `currentDirectionDeg` beregnes derefter fra præcis den samme vektor.
- Score, pil, debug og videnskabelig audit skal altid bruge samme kanoniske vektor. Auditgrænser må ikke løsnes for at skjule inkonsistens.
- Regressionstesten kontrollerer den arkitektoniske regel og ikke en bestemt tekststreng fra en tidligere implementation.

## 2026-08-03 – 4.0.86
- Brugerens konkrete fund viste, at håndbogsreview kunne indsendes uden synlig adgang til reviewkøen i den aktive admin.
- Audit fandt samme mønster for lokale nødkladder, dokumentationscenter og model-forslagenes lokale virkning.
- Aktiv admin fik samlet reviewkø, implementeringsflow, nødkladdehåndtering og reelle dokumentindgange.
- Sitetesten skelner nu 404, timeout, netværksfejl og HTTP-fejl og opdeler opstart i netværk/data, beregning og rendering.
- Reachability-test er tilføjet som releasekrav.

## 2026-08-03 – 4.0.87
- Produktionstesten og brugerobservationen viste, at vind- og strømpile kunne mangle, selv om data, rangliste og zonefarver var korrekte.
- Den efterstillede pileinstallation bevares af performancehensyn, men `requestIdleCallback` er erstattet med deterministisk timerkørsel, målbar status og runtimekontrol.
- Adminfejlen `Map container not found` blev ført til en forsinket Leaflet-callback, der overlevede faneskift; kort og timere ryddes nu ved skift.
- En importgraf-audit fandt aktive `?v=4.0.83`-referencer i 4.0.86. Versionsværktøj og release-test lukker nu hele browsergrafen til én version.

## 2026-08-03 – 4.0.88
- Produktionstesten dokumenterede `flow-arrows-started` fulgt straks af `flow-arrows-failed`.
- Historisk audit førte rodårsagen til 4.0.76: `pointFrom()` returnerede enten array eller `L.LatLng`, mens kaldet altid brugte spread til `L.latLng()`.
- 4.0.83 gjorde konsekvensen total, fordi det afkoblede lag først blev monteret efter hele løkken.
- 4.0.88 normaliserer til `L.LatLng`, isolerer fejl pr. zone og bevarer efterstillet pileinstallation.
- Brugerobservation viste desuden, at zonestreger først faldt på plads efter panorering. `zoomend` fandtes allerede, men stilen blev anvendt før Leaflets afsluttende zoomtransform. Offentligt `redraw()` i næste animation frame sikrer automatisk opdatering uden private Leaflet-metoder.

## 2026-08-03 – 4.0.89
- Retning hav-land fik særskilt sletning af valgt kystdel og hele zone med dobbelt bekræftelse for zonesletning.
- Centrale retningsreviews er nu en del af deploymentkæden og ændrer det autoritative zoneregister før vejrhydrering og offentlig runtime.
- Godkendte pålandsretninger og kystdele forplanter sig til score, kort, forecast og debug gennem samme zonefil.
- Reviewkøens automatiske systemtestposter kan ryddes via soft-delete, så auditspor bevares uden at køen fyldes.

- 2026-08-03 · 4.0.90: Kystlinjeeditoren blev adskilt tydeligt fra hav-land-retning. Søgning skifter kortzone, zonenavn kan ændres, og én central Gem ændringer-handling erstatter synlige kladde-/eksporttrin. Historiske kladder er bevidst ikke aktiveret.

## 4.0.91 – kontrollerede zonesletninger og gyldig reviewarkivering

GitHub-kørslen efter sletning af DK-B02-14 fejlede, fordi `validate-data.mjs` stadig krævede præcis 209 zoner. Valideringen er gjort dynamisk med sikkerhedsgrænse og krav om eksakt ID-sammenhæng mellem aktivt zoneregister og conditions. Samtidig blev det opdaget, at centrale retningsreviews blev anvendt uanset status; kun `verified` må nu påvirke produktionen. Reviewkøens soft-delete brugte den ikke-installerede status `archived`, men Supabase-skemaet tillader kun new/reviewing/accepted/implemented/rejected. Arkivering bruger nu rejected plus `[ARKIVERET]` i resolution_note og skjules i normal kø.

## 4.0.92 – Godkendte retningsankre må ændre produktionszoner

- GitHub-run 1181 viste, at central synkronisering korrekt anvendte godkendte retningsankre og fjernede DK-B02-14, hvorefter en gammel hårdkodet Blåvand-test stoppede deployment.
- Produktionszoner må ikke være låst til historiske gradtal i regressionstests, når ejerens adminworkflow eksplicit kan godkende nye hav-/landankre.
- Sikkerheden bevares ved at validere alle aktive zoners `onshoreDirectionDeg` mod den faktiske bearing fra `dataPoint` til `pinPoint` og ved at teste kompas- og scorekonventioner på syntetiske fixtures.

## 2026-08-03 – 4.0.93
- GitHub-kørslen efter 4.0.92 viste endnu en gammel fast antagelse: geometri-rollbacktesten krævede samme zoneantal og ID-sæt som historiske snapshots, selv efter en eksplicit administratorsletning.
- Hele zone-testkontrakten blev ændret fra historiske produktionsværdier til dynamisk integritet: manglende zoner skal være dækket af centrale sletningstombstones, og aktive zoner skal stemme med vejrdata.
- Administratorens godkendte navn, kystlinje, land-/havpunkter, retningsankre og pålandsretning er autoritative. En 180° korrektion er gyldig, når hav→land-geometrien stemmer.
- Rollbackværktøjet ændrer fremover kun polygongeometrien og kan ikke genoplive slettede zoner eller overskrive aktuelle adminfelter.
- En samlet regressionstest simulerer omdøbning, kystlinjeredigering, 180° vending, zonesletning og ikke-godkendte kladder.

## 2026-08-03 – 4.0.94
- Den grønne 4.0.93 blev valideret som baseline før ændringer.
- En read-only audit af administrator-redigerbare datakæder viste, at zoner, retninger, kystlinjer og stationsrouting allerede havde en produktionskæde, mens centralt gemte aktive regler kun blev læst lokalt i administratorens browser.
- Offentlig regelindlæsning blev ændret til en sanitiseret, versionsstyret fil genereret fra Supabase ved deployment.
- Rå centrale adminfiler blev udelukket fra Pages-artifactet.
- Ingen scorekonstanter, DMI-kæder, kortfunktioner eller zoneværdier blev ændret.

## 2026-08-04 – 4.0.96 vandstandsstations-admin
- Brugerens produktionstest viste, at alle stationer blev advaret som utilgængelige, automatiske stationer ikke blev grønne, og første zone kunne stå med tomt kort.
- Sitetesten dokumenterede `ReferenceError: stationDeliveryLabel is not defined`.
- Rettelsen er afgrænset til admininitialisering og beskyttet stationsstatus: runtimekald rettet, Supabase-hydrering tilføjet, ukendt status bevares, og central upload er ikke-destruktiv.
- DMI-prognosekæde, vandstandsværdier, interpolation og RavScore er uændrede.

## 2026-08-04 – 4.0.99 sandfærdig stationsobservation
- Historisk regressionanalyse af 4.0.52–4.0.94 viste, at OceanObs-kæden kun hentede `sealev_ln`, selv om stationsregistret også indeholder `sealev_dvr` og `sea_reg`.
- Samme kæde markerede en observationskørsel som succes uden krav om en eneste gyldig stationsmåling og brugte stationsregisterets størrelse som succesindikator.
- 4.0.99 henter alle tre vandstandsparametre, fletter seneste gyldige måling pr. station og registrerer kun succes ved reelle friske målinger.
- API-/netværksfejl tæller ikke længere som en manglende leveringskørsel for alle stationer.
- Stationscache kan nu dokumenteres direkte fra seneste reelle observation plus den konfigurerede cacheperiode.
- STAC/GRIB-modelprognosen, RavScore og den kanoniske strømvektorkæde er ikke ændret.

## 4.0.100 – fælles vandstandskilder
- Brugerbeslutning: både fysiske målestationer og DMI-prognosepunkter må bruges som vandstandskilder, når de har en gyldig femdøgnsprognose.
- Implementeret kildeklassifikation: `observation-station` og `forecast-point`.
- Begge typer samples i samme DKSS STAC/GRIB-model ved kildens koordinat, så serierne er sammenlignelige og indeholder meteorologisk/oceanografisk totalvandstand, ikke kun astronomisk tidevand.
- Administratoroverride har prioritet; ellers automatisk topologisk routing. Ved to kilder anvendes inverse afstandsvægte.
- Den resulterende serie forplanter sig til aktuel vandstand, RavScore, ranglister, femdøgnsprognose og time-for-time-tabellen.


## 2026-08-05 – 4.0.103 sikker Pages-pakning og verificerbar vandstandskæde
- Sundhedstjekket dokumenterede, at supportpakken kunne følge med i Pages-artifactet. Buildet udelukker nu `_support/` og `RavRadar-support-*.zip`, mens den private Actions-artifact bevares.
- Brugerbeslutning: automatisk interpolation og administratoroverride skal bruge samme reelle geografiske afstand. Kysttopologien bevares uændret som kandidatvalg; kun vægtgrundlaget er ensrettet til haversineafstand.
- DMI-dokumentationen viser collections `station`, `observation`, `tidewater` og `tidewaterstation`. Det plurale `tidewaterstations` gav 404 og er erstattet med den dokumenterede entalscollection.
- Kildediscovery og hver produceret kildes femdøgnsstatus auditeres nu eksplicit. Auditfilen er beskyttet og medtages ikke på Pages.
- Ny samlet regressionstest følger automatisk routing og administratoroverride gennem den producerede aktuelle vandstand, forecastStore og time-for-time-serie og kontrollerer samtidig Pages-eksklusioner og endpointkontrakt.

## 4.0.104 – administratoroverride og falske nulserier
- Rodårsag 1: Ved første kortklik i en zone uden eksisterende routingpost blev et midlertidigt objekt ændret, men objektet var ikke knyttet til `state.waterRouting.zones`. Valget kunne derfor ikke blive aktivt, gemt eller vist rødt.
- Rodårsag 2: Vandstandsroutingens talnormalisering behandlede `null` som `Number(null) = 0`. Manglende DMI-værdier kunne dermed danne en falsk, næsten konstant 0 cm-serie og gøre en tom prognosekilde routingberettiget.
- Rettelse: Routingpost oprettes direkte i det persistente dokument; `null`, `undefined` og tom streng afvises før numerisk konvertering.
- Regressionstest beskytter begge runtimekæder.

## 2026-08-05 – 4.0.105 prioriteret vandstandsadmin
- Produktion viste, at gemte administratorvalg kunne dukke op flere minutter efter fanen, og at “Fjern” kunne være uden varig effekt.
- Historisk og aktuel kodeanalyse viste, at vandstandsrouting ventede bag hele adminens diagnose-, regel- og historikblok og derefter kunne erstatte den viste tilstand.
- Zoneregister, DMI-vandstandskilder og central routing har nu deres egen prioriterede kæde. Fanen viser kun indlæsning, indtil denne kæde er komplet.
- Den langsomme baggrundsinitialisering genindlæser eller overskriver ikke længere vandstandsroutingen.
- Sitetesten måler nu reel funktionel klarhed for vandstandsfanen, ikke kun at admin til sidst bliver færdig.

## 2026-08-05 – 4.0.106
Konsollen dokumenterede QuotaExceededError ved både `ravradar-admin-document:water-level-station-routing` og legacy-nøglen. HAR viste, at routingdokumentet kun var ca. 2 KB, mens runtime-diagnostik alene var ca. 5,6 MB og stationsregisteret ca. 0,57 MB. Den generelle admin-document-cache havde fyldt browserens kvote. Store read-only dokumenter caches ikke længere lokalt, gamle cacher ryddes, og lokale skrivefejl er ikke-blokerende.

## 2026-08-05 – 4.0.107
Tilstandsmodellen er startet i score-neutral skyggetilstand. Pipelinen opsamler nu faktiske DMI-strømvektorer, alignment mod zonens aktuelle retningsankre, vindretning og vandstand og beregner indtransportmomentum, udtransporttryk, stærke energihændelser, mobiliseringspotentiale, nærkystpotentiale og procesfase. Ingen generelle strømbånd anvendes. Rå historik holdes væk fra public runtime. Ejer har samtidig produktionsbekræftet 4.0.106-rettelsen af røde vandstationsmarkører, override og Fjern.

## 4.0.108 – workflow-validering efter frisk DMI-proveniens
- Rodårsag: 4.0.107 validerede det hydrerede gamle datasæt før frisk DMI-opdatering. Strømauditten fandt derfor 0 direkte verificerede u/v-timer og stoppede push-workflowet.
- Rettelse: rækkefølgen er nu hydration → preflight → DMI/vejr → u/v-proveniens → public runtime → fuld validering → release gate → deploy.
- Regressionstest: `scripts/test-workflow-validation-order-4.0.108.mjs`.
- Ingen ændring af RavScore, skyggetilstandsmodel, offentlig load eller vandstationsfunktionalitet.

## 4.0.109 — workflow-test rettet
- Produktionsworkflowet i 4.0.108 nåede DMI-bulk, vejropdatering, strømproveniens og runtimebygning, men blev stoppet af en forældet test, der krævede to runtimebygninger.
- Kravet er nu rettet til præcis én deterministisk runtimebygning efter frisk vejr/proveniens og før validering.
- Ingen model- eller UI-adfærd er ændret.

## 2026-08-06 – 4.0.110 marine recovery før HARMONIE
- Produktionsloggen viste, at ét HARMONIE-asset på ca. 600 MB brugte ca. 676 sekunder. DKSS nåede derefter kun fire timer, og u/v-auditten fandt 0 verificerede prognosetimer.
- Rodårsagen var schedulerens vindreservation, som prioriterede atmosfære foran release-kritiske marine data.
- Når marinehorisonten er ufuldstændig, prioriteres DKSS nu før HARMONIE og bølger. Auditkravet er bevaret; manglende u/v skjules ikke.
- Fast udviklingsregel: ændringer skal konsekvensanalyseres gennem hele kæden fra scheduler og tidsbudget til cache, runtime, tests og deploy.

## 4.0.111 – Historisk forklaring i skyggetilstand
- Tilføjede fælles tilstandsforklaring til zonepanel, debug og Spørg RavRadar uden at ændre den numeriske score.
- Tilføjede bindende kildeneutralitetsregel og automatisk releaseblokering ved forbudte eksterne navne.
- Fastholdt hurtig offentlig opstart ved kun at bruge kompakte state-felter beregnet i pipelinen.


## 2026-08-06 – 4.0.112 sikker overlevering og automatisk referencevalidering
- En lang projektchat gjorde det nødvendigt at flytte maksimal aktuel viden ind i projektet før næste chat.
- Ny `05_NEXT_CHAT_HANDOFF.md` samler læserækkefølge, baseline, tilstandsplan, bindende afgrænsninger, driftsrisici og første handlinger.
- Fire manuelt kontrollerede zoner er gjort til automatiske referencezoner; nye omfattende billedserier skal normalt ikke kræves.
- Als Odde og Helberskov er korrigeret i dokumentationen som åben kyst nord for Mariager Fjord, ikke fjord.
- Sitetestens eneste kendte falske negative er rettet ved eksplicit dashboardaktivering og vent på klikbar knap.
- Tilstandsmodellen ændrer fortsat ikke RavScore. Næste scoretrin er glidende varighed/styrke af faktisk indadgående DMI-strøm, efter faglig skyggevalidering.
- DMI-workflowets lange køretid forbliver et separat optimeringsspor.

## 4.0.113 – 6. august 2026
- Fem produktionslogs blev analyseret samlet med projekt-ZIP og sitetest.
- Fast ugentlig GitHub-cache-nøgle blev identificeret som rodårsag til tabt rå GRIB-cachefremdrift mellem kørsler.
- Workflowet bruger nu separat restore/save og unik save-nøgle pr. run.
- Referencezonediagnostik er datasætbundet, logges kompakt og valideres strengt efter frisk produktion.
- RavScore er uændret. Cronintervallet afventer nye målinger efter cachekorrektionen.


## 2026-08-06 – 4.0.114 deployisolering
- Gentagne runs byggede og uploadede Pages-artifact, men stod i `deployment_queued` til timeout.
- Regressionanalysen fandt ingen ændring i Pages-actions mellem 4.0.112 og 4.0.113, men den monolitiske jobstruktur holdt `github-pages`-miljøet gennem hele den tunge pipeline.
- Build/data og deploy er opdelt. Kun deployjobbet ejer miljø og Pages-rettigheder.
- Fejlet deploy kan genkøres alene. Push/tvungen release kan afbryde en ældre almindelig vejropdatering.
- Score, DMI, marine audits og skyggetilstand er uændrede.

## 2026-08-06 – 4.0.115 verificeret historisk strømtilstand
- 4.0.114 blev produktionsbekræftet med grøn GitHub Pages-deploy og sitetest 19/19; 208 zoner havde data, 29 verificerede strømpile blev vist, og startup var 3,663 sekunder.
- Historisk transport blev identificeret som beregnet før den endelige DMI-proveniensberigelse.
- 4.0.115 genberegner transporthistorikken efter provenance og lader kun verificerede marine DMI-u/v-prøver tælle.
- Akkumuleret 24-timers transport er adskilt fra det aktuelle sammenhængende strømregime.
- `shadow-v2` er fortsat score-neutral. Den midlertidige Pages-mikrotest er fjernet.

## 2026-08-07 – 4.0.116 DMI-vektorintegritet og null-sikker femdøgnsprognose
**Status:** IMPLEMENTERET LOKALT, AFVENTER CI/PRODUKTION

- 4.0.115 blev stoppet af den strenge strømaudit, som fandt U/V-komponenter fra forskellige fysiske DMI-gitterpunkter og enkelte zoner uden komplet bulkgrundlag.
- 4.0.116 vælger kun strøm- og vind-U/V som par fra nærmeste fælles fysiske DMI-gitterpunkt; ingen fælles kandidat bliver manglende/ikke-verificeret data.
- Ældre cachede U/V-par med forskellige dokumenterede gitterpunkter invalideres sikkert.
- Vandstandskilder med `SOURCE::` bruges kun til DKSS-vandstand og tæller ikke som almindelige forecastzoner i dækning eller schedulerunderskud.
- Manglende vind/bølge behandles ikke længere som fysisk nul i den relevante JavaScript-kæde; ægte numerisk nul bevares.
- Eksternt croninterval er 15 minutter. Yderligere schedulerændring kræver nye målinger.
- `shadow-v2`, RavScore-vægte og dokumenteret morfologi er uændrede og score-neutrale i denne recovery-release.

## 4.0.117 – aktiv-zone scheduler og DMI-vind recovery
- Produktionskørsel #1717 bekræftede, at 4.0.116 fjernede U/V-grid mismatch.
- Schedulerens cachebaserede nævner er erstattet af det aktuelle aktive zoneregister.
- HARMONIE-deficit bruger nu samme family-key `wind` som collection-mappingen.
- Marine-first og de strenge marine audits er bevaret; score-neutral historisk tilstandsmodel er uændret.
- Ny regressionstest beskytter schedulerens aktive zoner, family-key og recoveryprioritet.

## 2026-08-07 – 4.0.117 hotfix – geografisk DKSS-recovery
- Produktionskørsel #1728 fejlede først i den strenge strømaudit efter vellykket DMI-opbygning, public runtime og referencezoner.
- Tre aktive Limfjordszoner manglede i bulkcache, fordi schedulerens to produktive slots gik til `dkss_nsbs` og `dkss_idw`, mens `dkss_lf` stod som nummer tre.
- Schedulerens marineprioritet bruger nu de aktive manglende zoners kysttype og den eksisterende DKSS-model-penalty, så den model der kan lukke flest faktiske grundlagsmangler kommer først.
- Mod #1728-state prioriteres `dkss_lf` før `dkss_nsbs` og `dkss_idw`; 11 marinegrundlagsmangler er Limfjord og 1 er vestkyst.
- DMI-only strøm, fælles U/V-gitterpunkt, runtimebudget og strenge marine audits er ikke svækket.
- Seks nyere chats er arkiveret som CHAT-0008–CHAT-0013 med kildeneutraliseret normaltekst og dynamisk kronologivalidering.

- Produktion #1738 bekræftede, at scheduler-hotfixen virkede (`dkss_lf` + `dkss_nsbs` blev kørt friskt), men strømauditten fejlede fortsat på DK-B05-10, DK-B05-13 og DK-B05-20.
- Ny rodårsag: Limfjordens marine kandidatsøgning undersøgte kun 16 kandidater/prober til 0,14°, selv om den fysiske acceptgrænse er 24 km. Søgefladen kunne derfor ikke altid finde et fælles vådt U/V-punkt inden for den tilladte afstand.
- Rettelse: kun Limfjordssøgningen udvides til 48 kandidater og prober til 0,26°; 24-km-grænsen og kravet om samme fysiske DMI U/V-punkt er uændrede.

## 2026-08-07 – 4.0.117 produktionsverifikation og Codex-handoff
- Commit `6c1dece72d5970a1fc095b9a22f080d811cd9f36` er dokumenteret 4.0.117-overgangsbaseline.
- Efter tidligere fejlede 4.0.117-kørsler gennemførte #1749 og #1750 succesfuldt på samme commit; #1750 er den friske kontrol efter seneste admin-geometriændringer.
- Administratorens korrigerede Limfjord-kystlinjer og land-/havpunkter blev synkroniseret fra Supabase og anvendt før DMI/weather-opbygningen.
- Den tilbagevendende U/V-fejl er dokumenteret som vertikallagsproblem i parserkandidaterne; parsergeneration 11 isolerer komponenter efter lag og kræver fælles lag ved parring.
- Arbejdsreglen er skærpet: fejlretning skal være systemisk, og lokal grøn test må ikke kaldes stabil produktionsbaseline.
- `sidste inden codex.odt` er importeret som CHAT-0014 med normaliseret kildetekst og hash.
- Ny AI-dokumentationspakke under `docs/ai/` samler Codex-start, knowledge base, arkitekturkort, working rules og roadmap.
- `05_NEXT_CHAT_HANDOFF.md`, Current Truth, Implementation Status, Active Requirements, Known Issues og håndbog opdateres til denne overgangssandhed.

## 2026-08-07 – sen Codex-bootstrap: korrigeret releasebevis og endelig admin-geometri
- Aktuel `main` ved handoff er `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Efter #1758 blev yderligere fire zoner konstateret geografisk forkerte og korrigeret centralt i admin: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** samt **Aalborg øst og Nørresundby**. Kystlinje og/eller land-/havpunkter blev rettet som autoritativ geometri.
- #1760 kørte efter disse sidste adminrettelser på `a164b6e…` og gennemførte DMI bulk, central weather-cache, current provenance, public runtime, referencezoner, `validate:data` og GitHub Pages-deploy.
- Ny kritisk opdagelse: #1760 sprang de fulde trin `npm run validate` og `npm run release:gate` over, fordi almindelig `workflow_dispatch` ikke opfylder workflowets `push || force`-betingelse. Et grønt automatisk run kan derfor være deployet uden fuld releasegodkendelse.
- Konsekvens: de seneste automatiske grønne runs må ikke bruges som fuldt stabilitetsbevis. Status er kode på `main` og deployet, men ingen ny streng baseline er endnu bevist.
- Den sidste pre-Codex handoff-ZIP ændrer bevidst ikke workflowbetingelserne. Første Codex-kodeopgave er at lukke gate-bypasset direkte i repositoryet og derefter få en frisk kørsel, hvor begge fulde gates faktisk står `success`.
- Før denne strenge kørsel er grøn, må ingen større videreudvikling begynde.

## 2026-08-07 – første Codex-kodeopgave: gate-bypass lukket lokalt
- Faktisk `main`/HEAD blev verificeret som `cd70f505054d8578ea29c47be086f0b496161de0`; working tree var rent før ændringen.
- Bypasset blev bekræftet i både lokal fil og `origin/main`: gates krævede `push || force`, mens Pages-artifactet kun krævede positiv preflight.
- Begge fulde gates kræver nu enhver positiv preflight og står fortsat efter frisk data/proveniens/runtime og før artifactet.
- Negativ preflight bevarer den billige skip-adfærd uden artifact/deploy.
- Workflow-regressionstesten beskytter gatebetingelserne og artifact-rækkefølgen.
- Status efter implementeringen er lokalt rettet; CI-/produktionsverifikation afventer samme friske run med begge gates og deploy som `success`.
