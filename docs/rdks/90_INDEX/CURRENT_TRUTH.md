# Current truth – gældende projektviden

Denne fil er første opslag ved en ny chat. Den indeholder kun gældende sandhed og udtrykkeligt planlagte næste skridt. Historik findes andre steder i RDKS.

## Projekt og evidens
- RavRadar er beslutningsstøtte til ravjagt og lover ikke fund.
- Faglige udsagn mærkes som dokumenterede, observerede, hypoteser eller validerede i RavRadar.
- Nye idéer må ikke blive produktionslogik uden test, forklaring og versionsspor.

## Data
- DMI er autoritativ dansk kilde. Open-Meteo er fallback.
- Forecastkomponenter behandles separat og merges på canonical UTC-timer.
- Timevis pendlen mellem udbydere er uacceptabel.
- 118–119 timer er en gyldig femdøgnshorisont.
- Store Vadehavssvingninger kan være tidevand og må ikke automatisk udglattes.

## Retninger og geometri
- Vindretning er hvor vinden kommer fra.
- Strømretning er hvor vandet bevæger sig hen.
- Pålandsretning går fra hav mod land.
- Hver zones geometri kan stadig være lokalt forkert, selv om konventionen er korrekt.
- Hav-/landpunktsfunktionen må ikke ændres på baggrund af en forklarende diskussion alene.

## Zoner og kyst
- Ét officielt detaljeret zoneregister bruges overalt.
- Brede førstegenerationszoner er udfaset.
- Als Odde og Helberskov ligger nord for Mariager Fjord mod Øster Hurup.
- Kysteditoren skal bevare præcisionsredigering, lokale krumninger, historik og rollback.

## Stationer
- Alle kendte DMI-stationer bevares med status; midlertidigt tavse stationer skjules ikke.
- DMI-registerstatus, observationsstatus og prognose-/cachestatus er forskellige.
- Automatisk routing kræver dokumenteret brugbarhed og må ikke uden videre bruge historiske/inaktive stationer.
- Automatisk routing genberegnes fra de aktuelt indlæste, brugbare vandstandskilder med samme kernefunktion som produktionen. Et ældre eller tomt routing-auditdokument må ikke overstyre nyere kildestatus. Systemet vælger normalt to kilder på modsatte sider langs kysten og afstandsvægter dem; hvis kun én brugbar kilde findes, anvendes den med 100 % vægt frem for et tomt valg.
- Kysttopologien bestemmer fortsat hvilke kilder der udgør et fagligt bracket, men både automatisk routing og administratoroverride beregner interpolationsvægte ud fra samme reelle geografiske afstand (haversine) fra zonens datapunkt.
- DMI-prognosepunkter opdages gennem OceanObs-collectionen `tidewaterstation` (ental). Hver vejrproduktion skriver en beskyttet `data/diagnostics/water-source-audit.json` med type, prognosehorisont, gyldighed og routingberettigelse for alle vandstandskilder.
- Adminoverride erstatter automatik, når override opfylder de valgte leveringskrav. Ved to administratorvalgte stationer beregnes inverse afstandsvægte ud fra zonens datapunkt; admin viser samme vægtprincip før lagring.
- Første klik på en vandstandskilde opretter altid zonens routingpost direkte i det persistente dokument. Manglende prognoseværdier (`null`, `undefined` eller tom streng) er ukendt data og må aldrig normaliseres til 0 cm eller gøre kilden routingberettiget.
- Stationskortet viser kun den routing, der faktisk er aktiv for zonen: grøn ved automatisk routing og rød ved aktivt administratoroverride. Når override er aktivt, skjules automatiske grønne markører; lilla “begge valg” bruges ikke. Samme kilde må ikke stå både som primær og sekundær; dubletter samles til én kilde med 100 % vægt.
- Nye stationer, udfald, genoptagelse og potentielt bedre routing skal skabe meningsfulde tilstandsnotifikationer.
- En station kan fortsat være prognosebrugbar, så længe dens cachedata er gyldige, selv om en ny observation mangler. Admin viser observationsstatus, cacheudløb og samlet anvendelighed.
- Manglende stationslivscyklus er ukendt status og må ikke omsættes til “utilgængelig” eller “aldrig leveret”. Beskyttet stationshistorik hydreres fra Supabase og må ikke forringes ved en nyere kørsel.
- OceanObs-stationsstatus må kun kaldes opdateret, når mindst én gyldig måling er modtaget. Vandstand hentes for `sealev_ln`, `sealev_dvr` og `sea_reg`; antal stationer i registret er aldrig bevis på observationssucces.
- En mislykket OceanObs-kørsel må ikke øge alle stationers manglende-leveringsrækkefølge.

## RavScore
- Scoren skal kunne forklares fra rådata til slutscore.
- Transport, frigivelse, koncentration/aflejring og jagtbarhed skal holdes begrebsligt adskilt.
- Statiske kystforhold må ikke skabe en høj score uden dynamisk transportgrundlag.
- Mistænkelige høje scorer og naboforskelle auditeres.

## Admin
- Admin er menneskeførst og skal kunne bruges uden intern systemviden.
- Regelbyggeren skal forklare felt, effekt, eksempel, geografi, prioritet og konflikt.
- Dialoger skal kunne lukkes via kryds, Annuller, Escape og klik udenfor.
- Centrale ændringer skal have versionshistorik og rollback.

## Projektarbejdsgang
- Læs RDKS og håndbog før analyse og kodeændringer.
- Ved hver ny version importeres samtaledeltaet automatisk til RDKS, changelog og relevante håndbogsafsnit.
- Gamle chats er historiske kilder; forældede løsninger må ikke genindføres.
- Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS > verificeret aktuel kode > håndbog > changelog > historiske chats.
## Release Governance
- En version må ikke erklæres færdig eller leveres som ZIP, før `npm run validate` og `npm run release:gate` er grønne.
- Enhver positiv produktions-preflight kører begge fulde gates før Pages-artifactet bygges. Kun en negativ preflight må springe gates, artifact og deploy over.
- Streng baseline er produktionsverificeret i #1772 på `292b402487efaf74e2a102773a3a8fbfbd39f5af`: central sync, frisk data/proveniens/runtime, begge gates, artifact og Pages-deploy var `success`.
- GitHub-secrets bevares i repository-indstillinger og må aldrig medtages i kode eller ZIP.
- CI-fejl skal føre til samlet audit af hele releasekæden.
- Leverancepakker må aldrig indeholde `.git`.
- GitHub Pages-artifactet må aldrig indeholde `_support/` eller `RavRadar-support-*.zip`; supportpakken er kun et privat GitHub Actions-artifact.

## Eget domæne
- Den planlagte offentlige adresse er `https://ravradar.dk`.
- GitHub Pages kan fortsat hoste siden; koden skal være domæneagnostisk.
- CNAME og DNS aktiveres først efter Supabase redirect- og domænetest.

## Accepttest og håndbogssprog
- Admin har en samlet funktionstest, som kontrollerer deploy, aktuelle data og central Supabase-readback med oprydning.
- Håndbogen skal skrives i almindeligt dansk. Fagord forklares, og ekspertens opgave skal altid være konkret.

- Diagnostik skal navngive konkrete fejl og må ikke kalde browsercache eller en bevidst sprunget observationskørsel for datatab.

## Strømpile og modelproveniens
- En strømretning er en oceanografisk mod-retning: 0° nord, 90° øst.
- DMI-strømpile må kun stå ved det marine gitterpunkt, som leverede både current-u og current-v.
- Kunstige pilekopier omkring zoner er forbudt, fordi de antyder målinger, som ikke findes, og kan placere pile på land.
- DMI-pile uden dokumenteret gitterpunkt skjules. Fallback må kun vises ved det punkt, fallbackudbyderen faktisk blev forespurgt på.
- Rå u/v-komponenter skal bevares i den fulde diagnosekæde, så hastighed og retning kan efterprøves.

## Admininitialisering og sitetest
- Oversigt skal renderes straks efter godkendt adgang og opdateres efter fuld dataindlæsning.
- Sitetesten må først skifte faner efter eksplicit admin-ready-markør.
- Browserdialoger fra den isolerede test må ikke vises på den synlige adminside.

## Strømproveniens og manglende værdier
- Manglende `current-u` eller `current-v` er ukendt data, ikke fysisk nulstrøm.
- En time kaldes kun verificeret, når begge DMI-komponenter kan knyttes til samme gitterpunkt og gyldigt tidspunkt.
- Ikke-verificerbare timer bevarer deres eksisterende viste strøm, men må ikke bære rå u/v-felter eller fremstilles som videnskabeligt verificerede.

## Strømvektor og scorekonsistens – 4.0.85
- DMI `current-u/current-v` er den autoritative fysiske strømvektor, når proveniensen er `verified`.
- Der findes kun én kanonisk lagret vektor pr. time: `currentUMps/currentVMps` afrundet til den aftalte præcision.
- `currentSpeedMps` og `currentDirectionDeg` skal altid afledes fra præcis de lagrede komponenter, ikke fra en skjult højere præcision.
- RavScore, kortpil, debug og audit skal derfor kunne genskabe samme hastighed og retning fra de samme felter.
- Strømretning ved næsten nul hastighed er fysisk og numerisk svagt bestemt; den må ikke få særskilt autoritet frem for komponenterne.

## Komplette adminarbejdsgange – 4.0.86
- Håndbogsreview findes i den aktive Håndbog-fane med synlig reviewkø og direkte genvej efter indsendelse.
- Lokale nødkladder kan findes, gensendes, eksporteres og slettes.
- Ejerens implementering af et review gemmer den centrale håndbog og verificerer readback, før reviewet markeres implementeret.
- Dokumentationscenteret giver adgang til RDKS-kernedokumenterne.
- Model-forslag er lokale browsermodeller, indtil de særskilt indarbejdes i en versioneret produktionsrelease.
- En funktion regnes ikke som implementeret alene fordi kode eller database findes; den synlige brugerrejse skal bestå.

## Kortpile, admin-kort og modulversionering – 4.0.87
- Vind- og strømpile installeres efter rangliste og 5-dagesprognose, men må ikke afhænge af `requestIdleCallback`.
- Pilelaget skal afslutte med en entydig ready- eller failed-status, og sitetesten skal finde faktiske vind- og strømpile.
- Forsinkede Leaflet-initialiseringer skal kontrollere, at fanen og kortcontaineren stadig eksisterer; kort skal fjernes ved faneskift.
- Alle aktive browserimports skal bruge den aktuelle releaseversion. En grøn topniveauversion er ikke tilstrækkelig, hvis importgrafen stadig peger på ældre `?v=`-identiteter.

## Kortpile og zonestreg ved zoom – 4.0.88
- Flowpunkter normaliseres altid til `L.LatLng`; koordinat-array og Leaflet-objekt må ikke blandes i samme returtype.
- En ugyldig zones piledata må ikke afbryde pilelaget for alle andre zoner.
- Zonestregens bredde, kant, klikflade og grænsetikker skal opdateres ved zoom uden efterfølgende panorering.
- Zoomopdateringen udfører et offentligt Leaflet `redraw()` efter zoomanimationen; private Leaflet-internals anvendes ikke.

## Centrale zoneændringer – 4.0.89
- Retning hav-land skelner mellem at slette én valgt kystdel og at slette hele zonen.
- Destruktive ændringer kræver tydelig bekræftelse og verificeret central readback.
- `direction-reviews` anvendes i GitHub-workflowet på det autoritative `data/zones.geojson` før vejrhyrering; dermed bruger kort, RavScore, rangliste, forecast, debug og routing samme godkendte geometri og status.
- En hel zonesletning er en central tombstone i reviewdokumentet og bliver fysisk udeladt af den aktive zonefil ved deployment. Historikken bevares i Supabase og versionshistorikken.
- Reviewposter slettes som udgangspunkt med soft-delete (`archived`), så de skjules fra arbejdslisten uden at auditsporet forsvinder.

## Kystlinjeeditor og enkel central gemning – 4.0.90
- Fanen Rediger kystlinjer ændrer kun zonens navn og geografiske kystforløb; den må ikke blandes sammen med Retning: hav → land.
- Knapperne Flyt kort og Præcis redigering samt deres funktion bevares uændret.
- Søgning skal skifte den aktive zone og kortvisningen, ikke kun filtrere en dropdown.
- Gem ændringer skriver centralt, verificerer readback og markeres eksplicit som publiceret til næste deployment.
- Historiske kystlinjekladder fra tidligere versioner må ikke automatisk blive aktive.
- Produktionsbygningen anvender kun eksplicit publicerede navn- og geometriændringer på det autoritative zoneregister.

## Administratorredigerbare zoner og dynamiske tests – 4.0.93
- Ejer/admin kan omdøbe zoner, ændre kystlinjer, ændre land-/havpunkter og retningsankre samt slette zoner uden kodeændringer.
- En godkendt ændring kan lovligt vende pålandsretningen 180°, når de nye hav-/landpunkter og `onshoreDirectionDeg` er indbyrdes konsistente.
- Produktionszoners antal, navn, kystlinje, koordinater og retning må ikke låses til historiske værdier i regressionstests.
- Tests beskytter i stedet zone-ID-integritet, eksplicitte sletningstombstones, gyldig geometri, hav→land-konsistens, datadækning og fuld forplantning til score, kort, forecast og debug.
- Historiske rollback-snapshots må ikke genoplive slettede zoner eller overskrive administratorens aktuelle navn, kystlinje, land-/havpunkter, ankre eller retning.

## Centrale administratorregler – 4.0.94
- Godkendte aktive administratorregler publiceres ved deployment som en sanitiseret offentlig regelfil.
- Offentlig RavScore må aldrig læse administratorregler fra browserens lokale lager; alle brugere skal bruge samme centrale, versionerede regelsæt.
- Regelkladder og inaktive regler forbliver centrale adminposter og påvirker ikke produktionen.
- Rå synkroniserede adminfiler under `data/admin/` er beskyttede mellemprodukter og må ikke indgå i GitHub Pages-artifactet.

## Vandstandskilder – 4.0.100
- Fællesbetegnelsen er vandstandskilder. En kilde kan være en OceanObs-målestation eller et DMI-prognosepunkt fra tidewaterstations-registeret.
- Kildetypen styrer statusvisningen: målestationer viser observationsstatus; prognosepunkter viser “Modtager prognose” eller “Modtager ikke prognose”.
- Begge typer får deres femdøgns totalvandstandsserie fra samme DKSS STAC/GRIB-kæde samplet ved kildens koordinat. Astronomisk tidevand alene bruges ikke som totalvandstand i RavScore.
- Aktiv administratorrouting bruges før automatik. De faktisk valgte kilder og vægte skal være identiske i prognoseproduktion, RavScore, ranglister og “Næste fem dage – Vandstand time for time”.

## Prioriteret indlæsning af vandstandskilder – 4.0.105
- Vandstandskildefanen må ikke vise en halvfærdig, klikbar routing.
- Zoneregister, DMI-vandstandskilder og det centrale Supabase-dokument `water-level-station-routing` indlæses i en selvstændig prioriteret kæde umiddelbart efter adgangskontrollen.
- Diagnostik, regler, historik, reviews og øvrige adminmoduler må ikke forsinke eller senere overskrive den aktive vandstandsrouting.
- Før fanen er klar, vises kun en tydelig indlæsningsstatus. Når den bliver klikbar, skal røde administratorvalg, Fjern-knapper og aktiv routing allerede være endeligt hydreret.

- Browserens `localStorage` er aldrig autoritativ for vandstandsrouting. Kun små redigerbare admin-dokumenter må caches lokalt; store stations- og diagnosedokumenter holdes i hukommelsen. En kvotefejl må ikke blokere UI eller central Supabase-gemning.

## Historisk tilstandsmodel i skyggetilstand – 4.0.107
- RavRadar beregner nu en kompakt, zonebaseret historisk tilstand ud fra faktiske vind-, bølge-, vandstands- og DMI-strømdata.
- Tilstanden indeholder varighed/momentum for indadgående strøm, varighed/tryk for udadgående strøm, stærk energihændelses varighed/alder, retningsstabilitet, mobiliseringspotentiale, nærkystpotentiale og procesfase.
- `shadow-v2` må ikke ændre den numeriske RavScore. Den bruger kun verificerede marine DMI-strømprøver og skelner mellem akkumuleret 24-timers transport og det aktuelle sammenhængende strømforløb.
- Generelle strømbånd må hverken bruges til score eller fallback. Faktiske DMI-u/v-vektorer er autoritative.
- Retningsberegningen bruger zonens aktuelle, administratorredigerbare retningsankre eller `onshoreDirectionDeg`; derfor skal manuel validering udføres på zoner med kendte, korrekte land-/hav-overrides.
- Rå historik holdes i produktionsdata/pipeline. Den offentlige browser modtager kun kompakte, færdigberegnede felter for at beskytte opstartshastigheden.
- Eksisterende dokumenteret morfologi bevares i scoren; manglende morfologidata er neutralt og udløser ikke krav om manuel landsdækkende kortlægning.
- 4.0.106 vandstationsrettelsen er produktionsbekræftet: røde markører, override og Fjern fungerer.

## DMI bulk-prioritering – 4.0.110
- Marine u/v og vandstand er release-kritiske og prioriteres før HARMONIE, når marinehorisonten mangler.
- Et stort atmosfærisk asset må ikke bruge hele kørselsbudgettet og sulte DKSS.
- Der anvendes fortsat ingen generelle strømbånd eller strømbåndsfallback.

## Historisk tilstandsmodel og kildeneutralitet – 4.0.111
- Den historiske model kører fortsat i skyggetilstand og må ikke ændre RavScore, før forklaringer og tilstande er valideret.
- Zonepanelet, debug og Spørg RavRadar bruger samme neutrale forklaring af højenergi, indtransport, nærkystpotentiale og udtransport.
- Almindelig indtransport har ingen fast 3–5 timers forsinkelse; potentialet vokser gradvist med varighed, retning og styrke.
- Generelle strømbånd bruges ikke i score eller fallback. Faktiske DMI-strømdata er autoritative.
- Eksisterende dokumenterede morfologidata må fortsat påvirke score; manglende morfologidata er neutralt og giver ingen straf.
- Ingen del af projektet må navngive de eksterne hjemmesider, som blev brugt som analysemateriale. Dette gælder UI, kode, kommentarer, tests, RDKS, håndbog, debug, AI og artefakter.
- Brugerfund skal knyttes til en aktivt valgt zone. GPS er kun plausibilitetskontrol og må ikke automatisk antages at være jagtstedet.


## Aktuel overgangsstatus – 4.0.112
- Den obligatoriske næste-chat-overlevering findes i `docs/rdks/05_NEXT_CHAT_HANDOFF.md` og skal læses i starten af en ny projektchat.
- Tilstandsmodellen er fortsat score-neutral. Næste faglige scoretrin må først aktiveres efter automatisk referencezonevalidering.
- Fire referencezoner genereres automatisk i `data/diagnostics/state-reference-zones.json`; nye manuelle billedserier kræves kun i yderste nødstilfælde.
- Als Odde og Helberskov er åben kyst nord for Mariager Fjord, ikke fjordzone.
- Den offentlige side skal fortsat ligge omkring den senest verificerede baseline på ca. 3,45 sekunder; tunge historikdata må ikke flyttes til browseren.
- Deploy/Update-jobbets ca. 14 minutters køretid er en åben driftsrisiko. Det eksterne croninterval er nu 15 minutter. Optimering kræver måling og må ikke svække marine audits.

## Workflow og skyggevalidering – 4.0.113
- GitHub Actions-cache er uforanderlig pr. nøgle. En fast ugentlig primærnøgle må derfor ikke bruges til en cache, som skal akkumulere GRIB-fremdrift mellem kørsler.
- DMI GRIB-cachen gendannes fra seneste kompatible nøgle og gemmes under en unik nøgle pr. kørsel.
- Referencezonerapporten skal knyttes til et konkret datasæt og logges kompakt i hver frisk produktion.
- Streng produktionsvalidering kræver en score-neutral `shadow-v1` eller `shadow-v2` for alle fire referencezoner; nye produktioner skal skrive `shadow-v2`. Verificeret DMI-strøm tælles og logges; mangler registreres uden kunstig transportfallback.
- Det eksterne croninterval blev ændret til 15 minutter 6. august 2026; yderligere ændring kræver nye køretidsmålinger.

## Releasekæde fra 4.0.114
- Data/build og GitHub Pages-deploy er separate jobs.
- Kun deployjobbet bruger `github-pages`-miljøet og Pages-skriverettigheder.
- Et fejlet deployjob kan genkøres uden at gentage DMI-pipelinen eller uploade endnu et Pages-artifact.
- Push og tvungne releasekørsler kan afbryde en ældre almindelig vejropdatering; almindelige vejrkald afbryder ikke en aktiv tung kørsel.
- 4.0.114 er produktionsbekræftet med grøn deploy og sitetest 19/19. Offentlig startup blev målt til 3,663 sekunder, 208 zoner havde data, og 29 verificerede strømpile blev vist.


## Verificeret historisk strømtilstand – 4.0.115
- Historiske transportfelter må kun bygges af strømprøver, som efter provenanceberigelsen er markeret som verificeret DMI-u/v.
- Ikke-verificerede eller manglende prøver er `unavailable`; de må ikke blive til nulstrøm og må ikke tælle som ind- eller udtransport.
- `inboundCurrentDurationHours` og `outboundCurrentDurationHours` er fortsat akkumulerede mål i det glidende 24-timers vindue.
- `activeCurrentRegime` og tilhørende varighed, momentum og stabilitet beskriver kun det aktuelle sammenhængende forløb og nulstilles ved retningsskift, neutral strøm, datamangler eller tidsafstand over to timer.
- Tilstanden hedder `shadow-v2`, er fortsat score-neutral og sendes kun som kompakte afledte felter til browseren.


## DMI-vektorintegritet og manglende femdøgnsfelter – 4.0.116
- En U/V-vektor er kun fysisk gyldig, når begge komponenter kommer fra samme DMI-gitterpunkt og samme forecasttid. Nærmeste U og nærmeste V må aldrig vælges uafhængigt og kombineres.
- For DMI-strøm skal U og V desuden komme fra samme vertikallag (`surface`/`depthBelowSea`). Kandidater fra forskellige dybdelag må aldrig kombineres. Hvis flere fælles lag er gyldige, vælges deterministisk det dybeste tilgængelige fælles lag.
- Hvis intet fælles gyldigt gitterpunkt findes inden for zonens tilladte havafstand, er vektoren manglende/ikke-verificeret. Auditkravet må ikke sænkes.
- Cachede vektorer fra ældre grid-logik invalideres, hvis deres dokumenterede U/V-punkter ikke er identiske.
- Vandstandskilder (`SOURCE::`) er hjælpepunkter til DKSS-vandstand, ikke forecastzoner. De samples ikke for strøm, vind, bølger eller vandtemperatur og tæller ikke i forecastzonernes dækningsmål.
- JavaScript må skelne `null`/manglende data fra tallet 0. Manglende vind eller bølger vises som `Mangler`; en ægte 0-værdi er stadig gyldig. Regler og scorevalg må ikke behandle manglende vind som vindstille.
- Den observerede 5-dages visning med `0,0 m/s · N 0°` og `0,0 m` havde mindst én separat præsentations-/null-årsag. Den oppustede sampling af vandstandskilder kunne samtidig forsinke reelle DMI-vind/bølgeopdateringer. Produktionsverifikation skal skelne reelle datagab fra visningsfejl.

## 4.0.117 – korrigeret sandhed ved Codex-overgangen
- Appversionen er 4.0.117. Aktuel `main` ved denne handoff er `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Denne commit er deployet via efterfølgende automatiske runs. #1760 bekræfter succes for DMI/weather/provenance/public runtime/referencezoner/`validate:data` og GitHub Pages-deploy efter de seneste admin-geometriændringer.
- **Men #1760 er ikke fuldt releasebevis:** `npm run validate` og `npm run release:gate` stod som `skipped`, fordi workflowet kun kører dem ved `push` eller `force=true`.
- Brugerens observerede mønster de seneste to dage er, at strenge push-runs er blevet røde, hvorefter almindelige automatiske runs blev grønne og deployede. Den verificerede workflowlogik forklarer, hvordan dette kan ske. Indtil en historisk audit eventuelt viser andet, må ingen af disse efterfølgende auto-grønne runs anvendes som fuld releasegodkendelse.
- Derfor er status: **kode på main: ja; deployet: ja; fuldt strengt produktionsverificeret baseline: nej endnu**.
- Handoff-ZIP'en ændrer bevidst ikke workflow-gatebetingelserne. Første Codex-kodeopgave er at lukke bypasset direkte i repositoryet og derefter skabe en ny frisk kørsel, hvor begge fulde gates faktisk står `success`.
- Ingen større videreudvikling må begynde, før denne strenge baseline er etableret eller den konkrete røde fejl er systemisk analyseret og løst.

## Codex-overgang – autoritativ arbejdsmodel
- Codex starter i `docs/ai/CODEX_START_HERE.md` og arbejder derefter efter AGENTS/RDKS.
- RavRadar skal analyseres som et helt system: central konfiguration, dataindsamling, scheduler, cache, parser, provenance, score/state, public runtime, UI/admin, tests, artifact og deployment hænger sammen.
- Stabilitetsudsagn skal matche evidensen: lokal validering, CI-validering og produktionsverifikation er tre forskellige niveauer.
- Historiske chats bevares som beslutnings- og regressionskontekst; de er aldrig automatisk mere autoritative end aktiv RDKS og faktisk verificeret kode.
