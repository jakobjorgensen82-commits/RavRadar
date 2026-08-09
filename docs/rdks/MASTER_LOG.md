## 2026-08-09 – 4.0.140 privat state-/historik-replaygate
- Kodeauditten viser, at produktionens statehistorik aktuelt slås op via `previous.zones[zoneId]`; private kystdele må derfor ikke kobles direkte på uden egen nøgle.
- En ny Node-validator bruger den faktiske `shadow-v2`-funktion med unik `historyKey` pr. del og stopper ved delt nøgle, parent-genbrug, krydslæsning eller numerisk scorepåvirkning.
- Faktiske current-U/V-replayværdier ligger kun i `.cache`, uploades ikke og slettes efter validering. Artifactet gemmer kun kompakt state og hash; alle runtime-/state-/score-/UI-/admin-/aktiveringsflag er falske.
- Privat pilot #2004 bestod med to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede samples, nul scorepåvirkning og slettet transient input. Artifactet har ingen rå replayfelter eller credentialbærende URL.
- Normal produktion #2003 bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `0f8171b`. Offentlig `version.json` viser 4.0.140.

## 2026-08-09 – 4.0.139 privat Blåvand-flertidsseriegate
- En ny privat validator genbruger produktionens native WAM-/DKSS-parser over flere forecasttrin for begge isolerede Blåvand-dele.
- Gaten kræver mindst to fælles komplette native tider, fuld komponentproveniens, fysiske gridpunkter og fælles current-U/V-celle og vertikallag. Krydsmerge, interpolation og fallback er forbudt.
- Artifactet gemmer kun komponenttilstedeværelse og kontekstbundne værdihash, ikke rå vejrværdier. Geometri, sampling, state, score, UI, public runtime og admin-write forbliver falske.
- Privat pilot #1997 bestod med fire fælles komplette native tider pr. del og 48 komponentposter med fuld DMI-proveniens, forskellige delceller, korrekt current-U/V-parring og nul interpolation/fallback. Artifactet har ingen rå værdifelter eller credentialbærende URL.
- Normal produktion #1996 bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `f94620f`. Offentlig `version.json` viser 4.0.139.

## 2026-08-09 – 4.0.138 privat weather-shadow-kontrakt
- Den faktiske kodeaudit viser, at multi-anker-scoren i dag anvender én zones fælles vejrserie. Direkte tilkobling af to punktserier ville kunne blande en dels vejr med den anden dels kystretning.
- En maskinlæsbar Blåvand-policy og privat artifactgenerator låser derfor `zoneId::partId`, eget valideret grid, fuld nødvendig timeproveniens og separat historiknøgle pr. del.
- Krydsmerge, spatial interpolation, fallback, state, part-score, best-part-valg, public projection, UI, admin-write og automatisk aktivering er falske. Parent-zonen er fortsat runtime- og scoresandhed.
- Privat pilot #1992 verificerede præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle mutations-/aktiveringsflag falske. Build og Pages var skipped.
- Normal produktion #1991 bestod central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `2d6127b`. Offentlig `version.json` viser 4.0.138.

## 2026-08-09 – 4.0.137 privat DMI-gridgate
- Efter #1982's ortofotogo validerer et nyt privat trin Blåvands to vandpunkter direkte i aktuelle `wam_nsb`- og `dkss_nsbs`-GRIB-assets med den samme nearest-valid-cell-logik og de samme afstandsgrænser som produktionen.
- Current-U/V skal dele både fysisk gridpunkt og vertikallag. Rapporten skelner gyldige gridceller fra uafhængige lokale serier, så to kandidater på samme celle ikke fremstilles som to målinger.
- Outputtet er privat og uden rå vejrværdier eller credential-URL'er. Geometri, admin, sampling, produktionsdata og RavScore ændres ikke. Lokal self-test bestod; den oprindelige kandidatstatus om manglende CI-evidens er erstattet af #1987/#1986 nedenfor.
- #1987 bestod hele den private pilot. Begge kandidater har gyldige WAM-/DKSS-celler; current-U/V deler samme fysiske celle og 17 m-lag pr. kandidat; alle seks komponentfelter bruger forskellige celler mellem nord og sydøst. Artifactet har ingen credentialbærende URL og alle mutations-/aktiveringsflag er falske.
- #1986 bestod central sync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `ab42e99`; offentlig GitHub Pages-version er 4.0.137.

## 2026-08-09 – 4.0.136 privat huk-hårnålsrettelse
- #1974-ortofotoet viste, at nord/sydøst overordnet passede, men at hukket fulgte en indadgående sandtange-/laguneløkke.
- Kandidaten måler route/chord-forholdet, bevarer det søværts apex og fjerner 242,0 m indadgående detur på det verificerede input. Manglende eksakt hårnål stopper sikkert.
- Lokal generator- og syntetisk self-test består. Nyt privat ortofotoartifact mangler; DMI-grid er fortsat blokeret.
- Privat pilot #1982 bestod med 108 tiles, tre overlays, nul credentialmatch og alle aktiveringsflag falske. Visuelt ligger den grønne linje på sand/landsiden og springer den indre omvej over; ortofotogaten er bestået.
- Normal produktion #1981 bestod frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy på `b82e311`; offentlig version er 4.0.136.

## 2026-08-09 – 4.0.135 officiel privat ortofotokontrol
- Den eksisterende moderniserede `DATAFORDELER_API_KEY` kan efter den officielle tjenestekontrakt bruges til gratis GeoDanmark Ortofoto forår Web Mercator WMTS; ingen ny betalt kilde eller credentialtype indføres.
- Pilotworkflowet danner tre private zoom-17-overlays ved Blåvand og bevarer fail-closed secret-håndtering. Ingen geometri, admin-data, DMI-sampling eller RavScore aktiveres.
- Lokal self-test består. Faktisk WMTS-adgang og visuelt artifactreview afventer den private CI-pilot; ortofotogaten er derfor endnu ikke bestået.
- Privat pilot #1974 bekræftede 108 officielle tiles, tre private overlays, secret-frit artifact og skipped build/Pages. Visuelt passer nord- og sydøststrækningerne overordnet, mens hukudsnittet viser en indadgående sandtange-/laguneløkke, der kræver geometrisk rettelse før go.
- Push-run #1973 stoppede før release-gate og deploy, fordi Pillow-importen lå før self-testen i det private script. Hotfixet flytter private imports bag self-testen og fastholder dependency-isolationen; ny produktionskørsel afventer.

## 2026-08-09 – 4.0.134 privat Blåvand-detailforslag
- #1959/#1958 lukkede 4.0.133-gaten med henholdsvis privat pilot og fuld produktionskæde.
- Blåvands fysiske kyst splittes ved det officielle Blåvands Huk i to navngivne retningsdele; en første nærmeste-ankerløsning blev forkastet, fordi den ikke splittede det lange kildeobjekt topologisk korrekt.
- Begge dele forskydes 15 meter mod den landside, som centralt verificerede adminankre dokumenterer, og får private land-/vandpunktpar uden vejrsampling.
- Ni høfter registreres separat og score-neutralt. Intet ændres i aktiv zone, admin, DMI eller RavScore.
- Ortofoto, DMI-grid og admin-roundtrip er næste stopgates.
- Commit `3843d20` blev produktionsverificeret i #1964 med begge fulde gates og Pages-deploy. Første private pilot #1965 stoppede korrekt efter central sync-timeout; #1967 lykkedes med 208-zone central sandhed og verificerede 2 dele, 15 detailfeatures, 9 høfter, detailkort og uændrede produktions-/admin-/vejr-/scoreflag.

## 2026-08-08 – kystgeometri v2 godkendt til score-neutral pilot
- Brugeren har godkendt opstart af en grundig national geometriomlægning, men ikke en direkte overskrivning af produktionszonerne.
- Kystlinjen defineres som relevante ravstrande og må springe over havne og åudløb. Indre fjorde udelukkes med Limfjorden som eneste undtagelse.
- Eksisterende zone-ID'er bevares som udgangspunkt, mens fejlagtige placeringer og navne må korrigeres under eksplicit migrationskontrol.
- Flere navngivne lokale kystdele med land-/vandpunkter ønskes, hvor retning, strøm og vind varierer. Kodeaudit viser, at admin allerede har multi-ankre, men vejrpipelinen endnu ikke har selvstændige komponentserier pr. anker.
- Høfder og andre konstruktioner kan være ravfælder. De registreres foreløbig score-neutralt og sendes til den senere DEC-0029-forskning frem for at ændre RavScore under geometriarbejdet.
- DEC-0032 låser parallel pilot, autoritativ kilde-/licenskontrol, central admin-sandhed, tre pilotmiljøer og særskilt go/no-go før national aktivering.
- Officiel kildeaudit har verificeret GeoDanmark-objektet `Kyst` i EPSG:25832, entitetsbaseret WFS med API-key/OAuth samt CC BY 4.0. Repository/procesmiljø har ingen identificeret Datafordeler-nøgle; adgang skal tilføjes uden for repositoryet før ægte pilotudtræk.
- Read-only offentlig sammenligning bekræfter, at central runtime ikke kan erstattes af repositoryfilen: 208 mod 209 aktive zoner, central sletning af `DK-B02-14`, omdøbning af `DK-B10-05` og 18 zoner med centralt gemte multi-ankre. V2-pilotens inputrækkefølge skal derfor være repositorybaseline → central hydrering/tombstones → v2-forslag → eksplicit admin-konfliktreview.
- Pilotområderne er fastlagt til Blåvand/Rømø, Limfjorden og Lolland/Falster. Acceptkriterierne tillader ingen utilsigtede overlap, indlejring, dobbelt kystdækning, genoplivede tombstones, tavst tabte overrides, udokumenteret selvstændig sampling eller RavScore-ændring.
- Datafordeler-adgangen er oprettet af ejeren som repository-secret `DATAFORDELER_API_KEY`. Den nye 4.0.126-kandidat isolerer GeoDanmark til et manuelt valgt, score-neutralt job med central adminhydrering, private artifacts og ingen Pages-rettigheder. Secretnavnet er kontrolleret mod workflowets forventede miljøvariabel; værdien er aldrig læst eller logget. Første CI-fetch afventer.

## 2026-08-09 – 4.0.126 sikker GeoDanmark-integrationskandidat
- GeoDanmark-fetcheren læser kun `DATAFORDELER_API_KEY` fra procesmiljøet, udfører først WFS capabilities og derefter begrænsede pilotudtræk, og producerer en secret-fri rapport med kildehashes og featuretal.
- Et isoleret `geometry-v2-pilot` workflowjob kan kun startes manuelt med `geometry_v2_pilot=true`. Det henter central admin-konfiguration og tombstones før source fetch, har kun læseadgang til repositoryet og uploader et privat 14-dages pilotartifact.
- Den hyppige vejrproduktion, Pages-artifactet og RavScore er isoleret fra GeoDanmark-piloten. Første CI-run er påkrævet før enhver påstand om fungerende adgang eller modtaget kildedata.

## 2026-08-09 – 4.0.127 GeoDanmark entity-lag hotfix
- Manuel pilot #1928 bekræftede, at `DATAFORDELER_API_KEY` blev injiceret og maskeret, at central adminhydrering lykkedes, og at både produktionsbuild og Pages-deploy blev sprunget over.
- Piloten stoppede ved lagvalg, fordi den aktuelle entitets-WFS udstiller bitemporale objekter som aktuelle `_current`-lag frem for kun det ældre eksakte objektnavn.
- Parseren læser nu kun WFS `FeatureType/Name`, foretrækker eksakt navn og derefter det præcise `_current`-navn, afviser `_hist` og løse præfiksmatch og gemmer ved ukendt kontrakt kun en secret-fri lagliste i det private artifact.

## 2026-08-09 – 4.0.128 pagineret GeoDanmark-pilot
- #1931 var grøn og hentede alle syv ønskede aktuelle lag i Blåvand/Rømø, Limfjorden og Lolland/Falster. Produktionsbuild og Pages-deploy blev sprunget over.
- Kystlagene var under serverloftet, men flere vandløbs-/skræntlag returnerede præcis 10.000 features. De er derfor ikke dokumenteret komplette.
- Fetcheren paginerer nu via WFS `startIndex`, fører `sourceNumberMatched`, `pageCount` og `complete` og afviser ukontrolleret datamængde over 250.000 features pr. lag/område.
- `actions/upload-artifact` får nu `include-hidden-files: true`, så `.geometry-v2-work` faktisk følger med det private 14-dages artifact. Den er fortsat udelukket fra Pages og commits.

## 2026-08-09 – 4.0.129 separat pilotkø
- Den ventende komplethedspilot #1933 blev erstattet af rutinevejropdatering #1934 på grund af GitHub Actions' ene pending-plads pr. concurrency-gruppe.
- Geometripilot og vejrproduktion bruger nu hver sin gruppe. En eksplicit nyere pilot kan annullere en ældre pilot, men vejrdiften kan ikke påvirke pilotens kø.
- #1936 gennemførte i den nye pilotgruppe: 21/21 komplette råudtræk, seks flersidede, maksimum 72.870 features og ca. 341 MB private GeoJSON-data. Build og Pages-deploy var `skipped`; ingen secretværdi blev persisteret.

## 2026-08-09 – 4.0.130 privat GeoDanmark source-QA
- Piloten gemmer nu de centralt effektive ni pilotzoner privat og sammenholder deres aktuelle kystlinjer med de komplette GeoDanmark-lag.
- Source-QA måler længde, fragmentering, nærhed og stikprøveafstande og registrerer havne, vandløbsender, høfder og terræn som score-neutral reviewkontekst.
- Tre private kort gør forskelle og ankre synlige. Lokal kørsel flaggede 9/9 zoner og viste, at Rømø, Limfjorden og Lolland/Falster kræver forskellige migrationsklasser; blind snapping er forkastet.
- Aktive zoner, centrale administratorværdier, RavScore, produktionsbuild og Pages forbliver uændrede. CI-verifikation af 4.0.130 afventes.

## 2026-08-09 – 4.0.131 officiel navne- og kystdelstriage
- #1941 verificerede 4.0.130 source-QA, kort og privat artifact med build/Pages isoleret.
- Hvert fysisk GeoDanmark-kildestykke klassificeres nu privat som eksisterende match, delvist match eller semantisk/grænsemæssigt review; lokal pilot gav 702 stykker.
- Dataforsyningens nøglefri `steder`-API er verificeret som Danmarks officielle stednavneregister. Afgrænsede pilotkald gemmer kun kompakte kandidatfelter og afstande.
- Migrationstriagen klassificerer Blåvand som geometriopretning, Rømø/Thisted som semantisk flyttereview og de øvrige seks som grænse-/partitionsreview. Ingen navne eller geometrier aktiveres automatisk.
- #1942/#1943 afslørede, at Pillow-importen i den private kort-renderer fejlagtigt blev evalueret under almindelig produktions-self-test. 4.0.131 indlæser nu Pillow først i det faktiske rendertrin, så private pilotafhængigheder ikke lækker til vejrproduktionen.

## 2026-08-09 – 4.0.132 kontrolleret privat kystdelssamling
- #1948 verificerede 4.0.131-piloten med 702 klassificerede kildestykker, officiel navneaudit og fuld isolation; #1947 bestod den parallelle fulde produktionskæde.
- Første lokale samling gav 300 tekniske fragmenter, fordi både vandløbskanter og midterlinjer skabte dublerede udskæringer. Resultatet blev forkastet før commit.
- Den korrigerede generator bruger kun synlige, ikke-rørlagte vandløbsmidter med faktisk kystkontakt/indlandsfortsættelse, klynger mundinger og samler nærliggende fragmenter som multipart uden kunstig forbindelseslinje.
- #1948-artifactet giver derefter 84 private reviewforslag. Rømø giver nul og forbliver semantisk stop. Aktive zoner, central admin, vejrsampling og RavScore er uændrede.

## 2026-08-09 – 4.0.133 officielle indre-vandmasker og zone-review
- #1952 verificerede 4.0.132 med 84 private forslag og isolation; #1951 bestod frisk produktion, fuld validate, release-gate og Pages.
- Visuelt review afslørede, at den eksplicitte fjordpolitik endnu ikke var geometrisk håndhævet. Dette blev behandlet som stopklods før DMI-punkter.
- Den nøglefri officielle stednavnekilde leverer nu Farvand-GeoJSON. `fjord` og `nor` udskæres uden for Limfjorden; 72 reviewdele resterer.
- Ni zonekort og en maskinlæsbar dom viser én detailkandidat (Blåvand), to semantiske flytninger og seks grænse-/partitionsredesign. Ingen produktion/admin/score ændres.

## 2026-08-08 – 4.0.125 fuld DMI-timeproveniens
- Brugerens godkendelse af næste roadmaptrin udløste implementering af provenance fra STAC/GRIB til beskyttede forecasttimer.
- Bulkparsergeneration 14 gemmer collection, modelkørsel og native gyldighedstid pr. komponent; timebyggeren beregner lead time, prognosealder, temporal status og native kildetider.
- Interpolation over en modelkørselsgrænse er nu en eksplicit regression og giver missing i stedet for en udokumenteret blanding.
- RavScore, fallbackprioritet og den slanke offentlige runtime er uændrede. Produktionsevidens afventes.

## 2026-08-08 – 4.0.124 komponentaudit
- De fem DKSS-vindhalehuller er produktionsverificeret lukket efter 4.0.123 og centrale adminrettelser.
- Datasæt `rr-20260808145245-208` havde 118 vindtimer i alle zoner, men dokumenterede separate bølge- og marine halehuller i Limfjorden.
- Audit schema 3 måler fem komponenters værdifelter, providerintervaller, missing og timevis DMI-proveniens. Ændringen er diagnostisk og score-neutral.
- Analyse af koden viste, at collection/model-run/lead time/prognosealder skal føres med fra STAC/GRIB; senere rekonstruktion ville være usikker ved cachede trin fra flere runs.

## 2026-08-08 – 4.0.123 produktionsgeometri og bredere marint kandidatvindue
- Audit af #1851/#1852 fandt de samme fem zoner uden direkte DKSS-vindhale, selv om alle 208 offentlige zoner havde 118 timers vind via fallbackkæden.
- Deployet zonefil, fuld conditions og bulkcache dokumenterede, at centrale adminrettelser faktisk var anvendt.
- Landmaskerede celler kunne fylde kandidatvinduet før værdikontrol. Loftet er udvidet fra 16/48 til 64/128; fysisk afstand og U/V-integritet er uændret.
- Direkte DKSS-resultat afventer frisk produktion. De fulde livecacher blev ikke fjernet, fordi de indgår i hydrering og admin/audit; den almindelige klient bruger fortsat kun den kompakte runtime.

## 2026-08-08 – 4.0.120 offentlig fallbackhale
- #1833/#1835 beviste NSBS/LF-rotation: 208/208 zoner havde vind og 203/208 mindst 96 timer, men maksimum var cirka 110 timer.
- De fem korte zoner havde ingen fælles gyldigt DKSS U/V-punkt. Ingen DMI-værdier konstrueres.
- Systemaudit fandt to senere tab: vandstandsrouting slettede den blandede fallbackserie, og `forecast_days=5` talte fra midnat.
- 4.0.120 bevarer den offentlige komponentserie og bruger `forecast_hours=120`. RavScore er uændret; frisk produktion afventer.

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

## 2026-08-08 – forecast-coverage og balanceret DMI-recovery
- #1774-supportpakken viste 203/208 zoner med mindst 96 timers marinegrundlag, men offentlig vind i kun 21/208 zoner og bølger i 175/208.
- Merge og public projection bevarede mangler korrekt. Schedulerens binære marine-foundation-tilstand brugte derimod begge produktive pladser på DKSS på grund af fem resterende marinehuller og udsultede HARMONIE.
- DEC-0028 indfører balanceret recovery efter 95 % marinegrundlag: én relevant DKSS-plads og én plads til den mest underdækkede vind-/bølgefamilie. Bred marinefejl er fortsat fuldt marine-first.
- Ingen audits, gridafstande, DMI-only-krav eller null-regler er svækket. Frisk produktion afventer.
- #1778 og #1779 bekræftede rækkefølgen `dkss_lf,harmonie_dini_sf`, begge fulde gates og deploy. Vind med mindst noget offentligt data steg fra 21/208 til 199/208 zoner.
- Supportmålingen viste, at den første kørsel brugte tre store downloads på udløbne HARMONIE-trin. Trin ældre end én time filtreres nu før download; 96-timers dækning skal fortsat opbygges og produktionsmåles.
- #1783 filtrerede dokumenteret to udløbne HARMONIE-trin og behandlede 23–01 UTC, men valgte en ny 21 UTC-generation med kun 11 forecasttrin. Vind fandtes fortsat i 199/208 zoner, mens 96-timersdækningen faldt til 1/208.
- Run-valget er derfor gjort progressionsstabilt: en foretrukken generation fastholdes, mens den rækker mindst 96 timer frem; ufuldstændige nye publikationer udskydes og diagnosticeres. Frisk produktion afventer.
- #1785 bestod fulde gates og deploy og valgte dokumenteret 18Z (54,7 timer) frem for den nyere 21Z (51,7 timer). Supportpakken viste samtidig, at HARMONIE-samlingen kun har cirka 60 timers native horisont. Fastholdelsen er derfor korrigeret til 48 timer for HARMONIE; marine samlinger beholder 96 timer. Næste run skal bevise genbrug af 18Z-reference og videre progressiv opbygning.
- Nyt brugerkrav DEC-0030 præciserer, at native HARMONIE-horisont ikke reducerer produktets femdøgnsmål. Efter aktiv cachestabilisering skal P1 kortlægge og designe individuelle cirka 120-timers DMI-first kæder for alle forecast-/scorekomponenter. Ekstern fallback må kun udfylde den manglende hale; analyse og særskilt design kræves før produktionsændring.
- #1788 produktionsverificerede HARMONIE-fastholdelsen på `e29fb7d`: 18Z blev fastholdt med 48-timersgrænse og eksplicit deferred 21Z, fire assets blev genbrugt, og serien voksede til syv behandlede tider. Begge fulde gates og Pages-deploy var grønne. DEC-0030-kortlægningen kan derfor begynde som næste P1-analyse.
- DEC-0030 fase A er startet uden produktionskode. Officiel DMI-dokumentation korrigerer HARMONIE NEA til 54 timer og viser WAM 5½ døgn samt DKSS 5 døgn; begge oceanprodukter indeholder 10 m vind og bruger ECMWF-forcing efter HARMONIE-delen. Aktuel kode bruger allerede time-/komponentvis DMI-first merge, men mangler collection/run/lead-time-proveniens, eksplicit Open-Meteo-modelidentitet og verificeret UTC-overgang. WAM-/DKSS-vind undersøges før ekstern hale-fallback.

## 2026-08-08 – planlagt videnskabelig RavScore-forskning
- En større forsknings- og modelvalideringsrunde er registreret som P3 i DEC-0029; den udføres ikke under den aktuelle forecast-/schedulerstabilisering eller foran højere P0/P1-opgaver.
- Den senere opgave skal opbygge en fysisk systemmodel fra frigivelse til jagtbarhed, auditere RavScore-koden, udarbejde evidensmatrix og designe virkelighedsvalidering uden automatisk scoreændring.
- Det bindende produktionsforbud mod generelle strømbånd består. Forskningen må senere revurdere rumlige strømstrukturers selvstændige informationsværdi, men enhver implementering kræver separat godkendelse.
- Ejeren præciserer, at vind ved kortets viste pile kun er en del af helheden. DEC-0029 kræver nu analyse af det relevante rumlige og historiske vindfelt, også uden for pile-/zonepunkter, samt kobling til bølger, strøm, mobilisering og transport. Kortets UI-markører må ikke blive en videnskabelig afgrænsning.
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

## 2026-08-07 – streng #1769 stoppede strukturelt tab af fire aktive zoner
- #1769 på `b3cb3974…` bekræftede, at positiv preflight nu planlægger fuld validate og releasegate før artifact; deploy blev korrekt stoppet ved fejlet validate.
- Central admin-sync og geometrianvendelse lykkedes med 208 aktive zoner. DMI, weather, provenance, public runtime og referencezoner blev bygget.
- Spatial-auditten fandt fire aktive zoner uden komplet `conditions/public/bulk`: `DK-B05-17`, `DK-B05-22`, `DK-B05-23` og `DK-B10-10`.
- Rodårsag: initial materialisering oprettede zonerne, men `clean_and_summarize()` slettede alle tomme `hourly`-records igen.
- Rettelse: aktive tomme records bevares som eksplicit missing. Ingen nul-, stale- eller fallbackdata konstrueres.

## 2026-08-07 – #1772 etablerer streng produktionsbaseline
- #1772 kørte på `292b402487efaf74e2a102773a3a8fbfbd39f5af` med seneste centrale admin-konfiguration.
- DMI bulk, weather-cache, current-proveniens, public runtime og referencezoner blev bygget med `success`.
- `Validate full project after fresh weather and current provenance` og `Run release governance gate after refreshed data validation` var begge `success`, ikke skipped.
- Pages-artifact, upload og `Deploy to GitHub Pages` var `success` i samme run.
- P0-bypasset og den efterfølgende tom-zone-regression er dermed CI-valideret og produktionsverificeret.

## 2026-08-08 – 4.0.118 DMI-first vindhale
- Officiel kildeaudit førte til HARMONIE som primær vind og DKSS 10-meter U/V som separat DMI-hale.
- Parsergeneration 12, modelisoleret interpolation og UTC-fallback er implementeret lokalt med regressionsdækning.
- Efter nattens #1828 viste den fulde produktionslog, at vindhale-V aldrig blev genkendt: lokalt DKSS-id 34 kolliderede med generisk `sst`-metadata.
- 4.0.119 gør producentens lokale id autoritativt, bruger parser/parameterkort 13/4 og roterer DKSS efter zonernes manglende komplette U/V-vindhale.
- #1831 produktionsverificerede begge DKSS U/V-felter, 107 vindhalezoner ≥96 timer, fulde gates og deploy. Offentlig samlet vind nåede 200/208 zoner, 108/208 ≥96 timer og maksimum 111,5 timer.
- RavScore er uændret. Frisk GitHub/DMI-produktion skal stadig bevise faktisk 118–119-timers dækning, kildeskift, gates og deploy.

## 2026-08-08 – permanent AI-model- og kvotestrategi
- DEC-0031 gør kvalitet-først-modelvalg bindende under den ugentlige Codex-kvote.
- Codex skal selv anbefale en billigere aktuelt tilgængelig model, når kvaliteten er den samme, og selv stoppe for at anbefale skift tilbage til Sol før kritisk arbejde.
- Kvoteudløb må ikke sænke analyse, forskning, tests eller validering; en pause kræver et permanent genoptageligt checkpoint.
- Den store videnskabelige RavRadar-/RavScore-analyse bruger som udgangspunkt Sol til centrale synteser og vurderinger.
## 2026-08-08 – 4.0.121 workflowoprydning
- Kontrol af kode, tests, aktiv dokumentation og Git-historik bekræftede, at `schedule-test.yml` og `pages-microtest.yml` kun var historisk diagnostik.
- Begge er fjernet. `update-and-deploy.yml` er fortsat eneste produktionsworkflow; `pages-build-deployment` tilhører GitHub Pages og er ikke en repositoryfil.
- Workflow-kontrakttesten beskytter det reducerede inventar. AI-hukommelse, RDKS og begge håndbøger forklarer begrundelsen.
## 2026-08-08 – 4.0.122 produktionsverificeret vindhale
- #1845 på `76c7c23` bestod frisk DMI, fuld validering, release-gate, artifact og Pages-deploy.
- Offentlig dataset `rr-20260808124116-208`: 208/208 zoner, 118 sammenhængende vindtimer.
- Fem-zoners direkte DKSS-gridproveniens er fortsat særskilt audit; fallbackdækning må ikke kaldes direkte DMI-bevis.
## 2026-08-09 – 4.0.141 privat score-neutral UI-gate
- Den faktiske kortvisning er auditeret: aktiv `coastLine` er RavScore-farvet og skal forblive parent-zonens autoritative visning.
- Et privat HTML/JSON-review bevarer parentens linje, farve, score, klikmål, tooltip og rangering; delene er kun neutrale, stiplede og ikke-interaktive forslag uden score eller “bedste del”.
- Ingen geometri, sampling, state, admin-data, offentlig UI eller RavScore aktiveres. Privat CI-artifact og normal produktionskørsel afventer.
- Produktcommit `67a6ebd` er pushed. Privat pilot #2009 bestod hele kæden og artifactaudit; normal produktion #2008 bestod central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig version er 4.0.141.
## 2026-08-09 – 4.0.142 privat admin-roundtrip/rollback-kandidat
- En Blåvand-specifik gate skriver kun en unik midlertidig, aldrig aktiv kladde og kræver verificeret create/read/update/delete samt fravær efter rollback.
- De autoritative runtime-dokumenters payload-hash og version skal være uændrede. Ingen aktivering; privat CI afventer.
- Produktcommit `ca5f920` er pushed. Privat pilot #2014 bestod med verificeret rollback og urørte runtime-dokumenter; normal produktion #2013 bestod fulde gates og deploy. Næste trin er eksplicit ejer-go/no-go.
## 2026-08-09 – DEC-0033 bedste kystdel bestemmer zonescoren
- Ejeren besluttede, at højeste gyldige lokale delscore skal være zonens viste RavScore.
- UI skal tydeligt skelne hele zonen fra navngivne delstrækninger og forklare vind, strøm, bølger, vandstand, state/historik og forskellen til andre dele.
- Dæknings-/usikkerhedstærskler og shadow-validering mangler; beslutningen aktiverer ikke Blåvand.
- Ejeren fastsatte en midlertidig pragmatisk margin på 7 point: 78 mod 75 gælder praktisk hele zonen uden delopdeling. Marginen skal genvurderes i den store RavScore-analyse.
- Bestillingen er national bygning og offentlig aktivering, ikke kun Blåvand. Lokale navne skal knyttes til konkrete huk, byer, havnemoler eller andre forståelige orienteringspunkter. National aktivering forbliver gated af landsdækkende geometri-/navne-/topologi-/DMI-/UI-/rollbackvalidering.
## 2026-08-09 – DEC-0034 pre-domain national testaktivering
- Ejeren fastlagde, at den nuværende GitHub Pages-side uden aktive brugere er testmiljø frem til senere domænekøb.
- Hele Danmark skal bygges, kendte fejl skal rettes og den samlede kystgeometri-v2 må aktiveres på testsiden efter grøn national gate. Blåvand er reference, ikke eneste zone.
- En senere domæne-/brugerrelease kræver en ny modenheds-/produktionsgate. Dataintegritet, gratis kilder, secretsikkerhed og rollback gælder fortsat.

## 2026-08-09 – 4.0.143 national kildeplan-kandidat
- Auditten viste, at den hidtidige v2-generator kun dækkede tre pilotområder og ni zoner.
- En ny planlægger kræver den centralt effektive bestand på 208 zoner, danner deterministiske kildefliser og klassificerer kendte geografiske fejl samt centrale adminændringer maskinlæsbart.
- Et separat privat workflowjob henter syv gratis officielle GeoDanmark-lag nationalt og deduplikerer fliseoverlap. Det har ingen Pages-rettigheder og kan ikke ændre geometri, admin, vejr eller score.
- Lokal kontraktvalidering er grøn. Privat national CI, artifactaudit og topologigenerering mangler.

## 2026-08-09 – 4.0.144 national skalerings- og source-QA-kandidat
- #2027 produktionsverificerede 4.0.143 med fuld Linux-validate, releasegate og Pages-deploy.
- Den private 4.0.143-nationalmåling dannede 101 fliser/707 requests og var fortsat sekventielt aktiv efter mere end ti minutter uden flisefremdrift.
- 4.0.144 anvender højst fire samtidige fliser, logger fremdrift, validerer alle filer/hashes/lag/208 zoner og scanner for credentials før upload.
- En rumligt indekseret national QA sammenholder de samlede officielle kystobjekter med alle effektive zoner og viderefører konfliktklasser uden mutation eller aktivering.
# 2026-08-09 – 4.0.145 kompakt national QA-artifact
- #2028 produktionsverificerede 4.0.144 med fuld Linux-validate, releasegate, artifacts og Pages-deploy.
- Privat #2029 bestod central hydration/tombstones, 208-zoneplan, 101 fliser/707 requests på cirka 5:15, kildevalidator, `STRtree`-QA og privat råupload; hele jobbet tog 7:45.
- Råartifactet er 413 MB komprimeret. 4.0.145 bevarer det og uploader samtidig plan, manifest og begge QA-filer som en separat kompakt privat pakke.
- Ingen aktiv geometri, admin-data, vejrsampling, state, offentlig UI eller RavScore ændres.
# 2026-08-09 – 4.0.146 national read-only topologiaudit
- #2032 produktionsverificerede 4.0.145. Privat #2033 uploadede både råartifactet på 413 MB og den kompakte QA-pakke på 6,8 MB.
- Artifactet korrigerer målingen til 100 central-hydrerede fliser/700 requests; 101/707 var repositorybaselinen før central hydration.
- 12.094 deduplikerede kystfeatures gav 9.929 relevante kyststykker, men kun 20 referenceklare og 188 flaggede zoner. Blind snapping er forkastet.
- 4.0.146 tilføjer officielle nationale fjord-/normasker, havn-/åmundingsudskæring, klit-/skræntevidens, score-neutrale høfter og en fail-closed 208-zone topologigate uden aktivering.
# 2026-08-09 – 4.0.147 tilbageholdt åmundings-oversegmentering
- #2036 produktionsverificerede 4.0.146; privat #2037 bestod teknisk 208-zone topologiaudit og isolation.
- Artifactet målte 90 officielle fjord-/norpolygoner, 1.225 havneobjekter, 3.347 høfter og klit-/skræntevidens i 183/168 zoner.
- 2.868 åmundingsklynger, op til 189 i én zone, er fagligt afvist som oversegmentering trods grøn teknisk gate.
- 4.0.147 tilbageholder åmasker i zoner over 20 og eksporterer privat egenskabsprofil samt højst 200 geometri-frie samples til næste regelrevision.
# 2026-08-09 – 4.0.148 kildebaseret åbreddefilter
- #2039 produktionsverificerede 4.0.147; privat #2040 verificerede 45 overdense zoner med nul anvendte åmasker.
- Profilen viste 2.551 kandidater på 0–2,5 m, 806 på 2,5–12 m og 37 på mindst 12 m; synlighed/type skelnede ikke.
- 4.0.148 kræver officiel midtebredde mindst 2,5 m og fysisk linjelængde mindst 100 m, rapporterer smalle/korte fravalg og bevarer >20-klynge no-go.
