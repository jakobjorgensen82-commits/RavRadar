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
