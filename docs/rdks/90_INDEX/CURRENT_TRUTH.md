# Current truth – gældende projektviden

Denne fil er første opslag ved en ny chat. Den indeholder kun gældende sandhed og udtrykkeligt planlagte næste skridt. Historik findes andre steder i RDKS.

## Aktiv kystgeometri-v2-pilot – score-neutral og ikke-destruktiv
- 4.0.141 består den private score-neutrale UI-gate i #2009. Parent-kystlinjen forbliver den aktive RavScore-farvede linje med uændret klikmål, tooltip, score og rangering; begge delkonturer er kontraktlåst uden scorefarve, rangering, “bedste del” eller interaktion. Artifactet er auditeret uden rå-/credentiallæk og med alle mutationsflag falske. #2008 bestod fuld produktion og deploy.
- 4.0.140 består separat state-/historikisolation som privat replay i #2004. Hver del bruger egen `historyKey` gennem den eksisterende score-neutrale `shadow-v2`-funktion; artifactet beviser nul parent-genbrug/krydslæsning og scorepåvirkning samt slettet transient råinput. #2003 bestod den fulde produktion.
- 4.0.139 består den private flertidsseriegate: #1997 gav begge Blåvand-dele fire fælles komplette native WAM-/DKSS-tidstrin og 48 komponentposter med del-ID, fuld provenance, gridpunkt og korrekt current-lag. Artifactet har kun tilstedeværelse og kontekstbundne værdihash, ingen rå værdifelter eller credentialbærende URL. #1996 bestod den fulde produktion. Krydsmerge og alle runtime-/score-/adminændringer forbliver forbudt.
- 4.0.138 fastlægger en privat weather-shadow-kontrakt for de to validerede Blåvand-kystdele. Hver del får stabil `zoneId::partId`-serieidentitet, eget punkt/grid/provenienskrav og separat fremtidig historiknøgle. Krydsmerge, fallback, public projection, admin-write, part-score, state og automatisk aktivering er eksplicit forbudt. Privat pilot #1992 verificerede artifactet; normal produktion #1991 bestod de fulde gates og deploy. Den eksisterende `DK-B03-13`-serie, historik og RavScore forbliver runtime-sandhed.
- 4.0.137 genbruger produktionens faktiske DMI STAC/GRIB-parser, nearest-valid-cell-søgning, afstandsgrænser og fælles fysiske U/V-gridregel. Privat pilot #1987 bestod: begge Blåvand-vandpunkter har gyldige `wam_nsb`- og `dkss_nsbs`-celler, current-U/V deler fysisk celle og 17 m-lag, og alle seks komponentfelter rammer forskellige celler mellem nord og sydøst. Rapporten gemmer kun gridkoordinater, afstande og provenance; alle mutations-/aktiveringsflag er falske. DMI-gridgaten er bestået privat, men sampling er ikke aktiveret.
- 4.0.136 retter den ortofotoafviste huk-hårnål. Den målte rå rute var 430,0 m over en 144,3 m chord (ratio 2,98). En eksplicit policy bevarer det søværts apex, genforener med den sydøstlige åbne strand og fjerner 242,0 m indadgående detur. Privat pilot #1982 bekræftede det nye officielle ortofoto: den grønne relevante strandlinje springer den indre lagune-/sandspidsomvej over og ligger på sand/landsiden; tre overlays, nul credentialmatch og alle aktiveringsflag falske. Ortofotogaten er bestået for den private linje.
- 4.0.135 genbruger den eksisterende moderniserede `DATAFORDELER_API_KEY` til den gratis officielle `GeoDanmark Ortofoto forår Web Mercator WMTS`. Privat pilot #1974 dannede tre zoom-17-overlays af 108 tiles uden credentialmatch og uden build/Pages. Nord- og sydøstlinjen passer overordnet, men hukudsnittet afslørede en indadgående sandtange-/laguneløkke; ortofotogaten er derfor no-go, indtil løkken er rettet og genkontrolleret.
- DEC-0032 er den aktive kontrakt for en parallel geometri-v2-pilot. Den nuværende produktionsgeometri og centralt gemte adminrettelser ændres ikke af pilotens analyse/generering.
- Den viste kystlinje skal følge relevante ravstrande og må springe over havne, åudløb og irrelevante strækninger. Indre fjorde udelukkes; Limfjorden er eneste fjordområde.
- Zoner, navne og placeringer må korrigeres, mens tekniske ID'er bevares som udgangspunkt. Væsentlig ændring af et IDs geografiske betydning kræver eksplicit historik-/regel-/observationsmigration.
- Flere navngivne lokale kystdele kan være nødvendige, men de nuværende retningsankre er endnu ikke selvstændige vejrmålepunkter. V2 må først bruge dem sådan efter fuld DMI-/proveniens-/score-/UI-implementering og validering.
- Høfder og andre mulige ravfælder registreres foreløbig som score-neutrale featurehypoteser. Eventuel scorepåvirkning tilhører den senere DEC-0029-forskning.
- Landsdækkende aktivering kræver et særskilt go/no-go efter pilot på mindst tre forskellige kystmiljøer og systemisk validering.
- Read-only sammenligning viser 209 aktive repositoryzoner mod 208 offentligt effektive zoner. `DK-B02-14` er centralt slettet, `DK-B10-05` er centralt omdøbt, og 18 offentlige zoner har i alt flere lokale retningsankre, som ikke findes i repositorygrundfilen. V2-generatoren skal derfor altid starte efter central hydrering.
- `DATAFORDELER_API_KEY` er oprettet som GitHub repository secret. Det særskilte manuelle `geometry-v2-pilot`-job er score-neutralt, hydrerer central admin-sandhed, har ingen Pages-rettigheder og skriver ingen secretværdi. #1931 bekræftede faktiske udtræk fra syv `_current`-lag i tre områder. Flere maskelag ramte 10.000-featureloftet; 4.0.128 paginerer og uploader den skjulte rå arbejdsmappe privat. Komplethed afventer genkørsel.
- #1936 produktionsverificerede 4.0.129: 21/21 udtræk er komplette, seks blev pagineret, 21 rå GeoJSON-filer på ca. 341 MB ligger i det private artifact, og pilot-/vejrgrupperne kørte uafhængigt.
- #1941 produktionsverificerede 4.0.130: centralt effektive pilotzoner blev sammenholdt med GeoDanmark, source-QA og tre kort blev gemt privat, og build/Pages blev sprunget over. Alle ni zoner kræver review; blind snapping er forkastet.
- #1948 produktionsverificerede 4.0.131: 702 fysiske kildestykker og den nøglefri officielle navneaudit blev genereret privat; #1947 bestod samtidig den fulde produktionskæde og begge gates.
- #1952 CI-verificerede 4.0.132 med 84 private reviewforslag, tre kort og alle mutationsflag falske; #1951 bestod fuld frisk produktion, validate, release-gate og Pages-deploy på samme commit.
- #1959 CI-verificerede 4.0.133 med seks officielle fjord/nor-polygoner, 72 private reviewdele, ni zonekort og kun Blåvand frigivet til detailanalyse. #1958 bestod samtidig fuld validate, release-gate og Pages-deploy på samme commit.
- #1964 produktionsverificerede 4.0.134 på commit `3843d20`: den fulde validate-gate, release-gate, Pages-artifact og deploy var success. Privat pilot #1967 brugte 208 centralt effektive zoner og verificerede to Blåvand-ankre, 72 private reviewdele, to detaildele, 15 detailfeatures, ni score-neutrale høfter og detailkortet; build og Pages var skipped.
- #1976 produktionsverificerede 4.0.135 på commit `47f88a3`: frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Den offentlige `version.json` viser 4.0.135. #1973 havde forinden stoppet sikkert på et privat Pillow-importlæk; hotfixet flyttede importen bag self-testen.
- #1981 produktionsverificerede 4.0.136 på commit `b82e311`: frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Offentlig `version.json` viser 4.0.136.
- #1986 produktionsverificerede 4.0.137 på commit `ab42e99`: central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Offentlig GitHub Pages `version.json` viser 4.0.137.
- #1992 verificerede 4.0.138's private weather-shadow-artifact med præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle sampling-/state-/score-/UI-/admin-/aktiveringsflag falske. #1991 produktionsverificerede commit `2d6127b` med central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig `version.json` viser 4.0.138.
- Den første pilot #1965 stoppede sikkert, da central Supabase-sync timed out og faldt tilbage til repositoryets 209 zoner uden Blåvands to centrale retningsankre. Ingen historiske ankre blev brugt; den efterfølgende friske central-sync i #1967 lykkedes.
- Blåvands fysiske kyst splittes ved det officielle Blåvands Huk og forskydes 15 meter mod landsiden, som kontrolleres mod de to centralt verificerede adminankre. Forslaget har to navngivne lokale kystdele, to land-/vandpunktpar og ni score-neutrale høftehypoteser.
- Ingen Blåvand-geometri eller punkter er produktionsgodkendt. Gaterne frem til score-neutral UI er bestået privat i #2009. Næste gate er privat central admin-roundtrip/rollback; derefter følger eksplicit ejer-go/no-go. De øvrige otte zoner forbliver ved redesigngaten.

## 4.0.125 – DMI-identitet følger hver komponenttime
- STAC/GRIB-indlæsningen gemmer nu `collection`, `modelRun` og `nativeValidTime`, mens disse oplysninger stadig er autoritative. Parsergeneration 14 genbehandler rå assets efter den nye kontrakt.
- Timebyggeren fører proveniensen videre separat for vind, bølger, strøm, vandstand og vandtemperatur og beregner `leadTimeHours`, `forecastAgeHours`, `temporalResolution` og `nativeValidTimes`.
- Interpolation mellem native trin fra forskellige collections eller modelkørsler afvises. Manglende kompatibel serie forbliver `missing`; ingen værdi kopieres eller konstrueres.
- Under cachemigrationen må to pre-v14-trin, som begge mangler identitet, bevare tidligere værdiinterpolation, men de får ikke opdigtet proveniens og forbliver audit-advarsler. Et identificeret trin må aldrig blandes med et uidentificeret trin.
- Den endelige DMI/fallback-merge og vandstandskontinuiteten bevarer DMI-proveniensen. Audit schema 4 kontrollerer alle identitets- og tidsfelter.
- Ændringen er lokalt valideret, men afventer frisk produktion. RavScore, fallbackprioritet og public runtime-felter er uændrede.

## 4.0.124 – faktisk femdøgnsdækning måles pr. komponent
- De tidligere fem direkte DKSS-vindhalehuller er produktionsverificeret lukket. Efter de sidste centrale adminrettelser fik både Nibe/Sebbersund og Falster/Nysted 36 DKSS-haletidspunkter, og alle 208 zoner bevarede 118 offentlige vindtimer.
- Et produktionssnapshot fra datasættet `rr-20260808145245-208` viste, at vind ikke er lig med komplet komponentdækning: bølger var komplette i 192 zoner, 13 zoner havde 117 timer og 3 Limfjordszoner manglede bølger helt. Strøm, vandstand og vandtemperatur havde 118 timer i 200 zoner og 101 timer i 8 Limfjordszoner.
- Timekæden skelner værdimæssigt korrekt mellem DMI, fallback og `missing`, men fuld DMI-identitet går tabt: collection er kun delvist bevaret, og model-run, lead time og prognosealder findes ikke pr. time.
- 4.0.124 udvider kun beskyttet diagnostik. Ingen data-, fallback-, score- eller UI-adfærd ændres.

## 4.0.123 – marine landmasker undersøges bredere
- #1851 og #1852 havde fortsat præcis fem zoner uden direkte DKSS-vindhale: Fur syd, Nibe og Sebbersund, Gjøl og Attrup, Aalborg vest og Egholm samt Falster vest/Nysted Nor munding.
- De centralt gemte adminpunkter blev anvendt i produktionen. Flere af dem afviger fra repositoryets historiske geometri; manuelle rettelser er derfor ikke tabt eller overskrevet.
- Den tidligere søgning kunne stoppe efter 16/48 geometrisk nære celler, før en gyldig havcelle i DMI-landmasken blev undersøgt. 4.0.123 undersøger 64/128 celler, men fastholder afstandsgrænserne 24/32/40 km og kravet om samme fysiske U/V-punkt.
- Produktion skal afgøre den faktiske gevinst. Manglende direkte DKSS forbliver `missing`; den komplette offentlige fallbackkæde må ikke fremstilles som direkte DMI.
- `conditions.json` og DMI-cacher er build/admin- og hydreringstilstand. Den almindelige klient henter kun `public-conditions.json`; cachefilerne kan ikke fjernes fra Pages uden først at etablere et andet persistent lager.

## 4.0.122 – produktionsverificeret offentlig vindhale
- GitHub Actions #1845 på commit `76c7c23` kørte frisk DMI, fuld validering, release-gate og Pages-deploy som `success`.
- Det offentlige datasæt `rr-20260808124116-208` har 208/208 aktive zoner med sammenhængende 118 timers vind; den offentlige femdøgnskæde har derfor ingen vinddækningshuller.
- De fem tidligere zoner uden fælles DKSS U/V-gridpunkt må fortsat ikke omtales som direkte verificeret DMI-havdata. Deres offentlige vindhale er dækket, men direkte grid-/fallback-proveniens kræver særskilt audit.

## 4.0.121 – aktivt workflowinventar
- Repositoryet ejer kun `.github/workflows/update-and-deploy.yml`; det er produktionsworkflowet for data, gates, artifact og Pages-deploy.
- `schedule-test.yml` og `pages-microtest.yml` var historiske diagnostiske workflows uden rolle i aktiv test, release eller recovery og er fjernet. Pages-microtesten kunne desuden publicere til samme `github-pages`-miljø som produktionen.
- `pages-build-deployment` er GitHubs egen Pages-mekanisme og er ikke en workflowfil i RavRadar. Den eksterne cron-job.org-plan udløser fortsat produktionsworkflowet via `workflow_dispatch`.

## 4.0.120 – offentlig fallbackhale
- #1833/#1835 roterede NSBS/LF ind. Offentlig vind nåede 208/208 med data og 203/208 mindst 96 timer; maksimum var cirka 110 timer. De fem resterende zoner havde ingen fælles gyldigt DKSS U/V-gitterpunkt.
- 4.0.120 retter de to dokumenterede efterfølgende tab: vandstandsrouting bevarer den blandede offentlige serie, og Open-Meteo forespørges om 120 fremtidige timer frem for fem kalenderdage fra midnat.
- RavScore og DMI-gridkrav er uændrede. Frisk produktion skal bevise 118–119 timer.

## Projekt og evidens
- RavRadar er beslutningsstøtte til ravjagt og lover ikke fund.
- Faglige udsagn mærkes som dokumenterede, observerede, hypoteser eller validerede i RavRadar.
- Nye idéer må ikke blive produktionslogik uden test, forklaring og versionsspor.
- Modelvalg følger DEC-0031: kvalitet kommer først, men Sol bruges ikke til rutinearbejde, hvis en billigere aktuel model kan levere samme kvalitet. Codex skal selv anbefale både nedskiftning og senere skift tilbage til Sol; kvotepause kræver et permanent checkpoint.

## Data
- DMI er autoritativ dansk kilde. Open-Meteo er fallback.
- Forecastkomponenter behandles separat og merges på canonical UTC-timer.
- Timevis pendlen mellem udbydere er uacceptabel.
- 118–119 timer er en gyldig femdøgnshorisont.
- Produktmålet er fortsat en bedst tilgængelig cirka 120-timers kæde pr. forecast-/scorekomponent. DMI bruges til sidste valide DMI-time; anden DMI-kilde undersøges før ekstern fallback, som kun må udfylde den manglende hale. DMI dokumenterer aktuelt HARMONIE NEA til 54 timer; dette er en native kildehorisont, ikke et reduceret produktmål.
- Vindkæden er lokalt implementeret som HARMONIE først og DKSS 10-meter U/V som separat DMI-hale. HARMONIE vinder i overlap, og interpolation krydser ikke modelgrænsen. Produktionsdækning er endnu ikke bevist.
- RavRadar er gratis og ikke-kommerciel. Gratis fallback kan derfor anvendes inden for den aktuelle tjenestes vilkår, men fair use, caching, kreditering og teknisk kildeuafhængighed er stadig bindende.
- Kildeskift kan ligge forskelligt for vind, bølger, strøm, vandstand og temperatur. Hver time skal bevare model/run, lead time, alder og native/interpoleret/fallback-proveniens. Hvis resten ikke kan leveres forsvarligt, forbliver den missing.
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

## DMI-schedulerbalance – 2026-08-08
- Marine recovery er ikke længere rent binær efter etableret grunddækning. Under 95 % marinegrundlag er begge produktive pladser fortsat marine-first.
- Ved mindst 95 % marinegrundlag beholder den mest relevante DKSS-model første plads, mens anden plads går til den mest underdækkede vind-/bølgefamilie.
- Dette svækker ingen marineaudit og udfylder ingen mangler. Manglende DMI-data forbliver `missing`.
- Politikken er lokalt implementeret; produktionssandhed om forbedret vind-/bølgedækning kræver et nyt strengt grønt run.
- #1778 og #1779 har siden produktionsbekræftet schedulerpolitikken, fulde gates og deploy. #1779 havde vind i 199/208 zoner, men kun 14/208 nåede mindst 96 timer; femdøgnsvind er derfor stadig under progressiv opbygning.
- HARMONIE-assets er meget store. Forecasttrin ældre end én time må ikke bruge det begrænsede downloadbudget; aktuelle og fremtidige modeltrin behandles fortsat kronologisk og caches mellem runs.
- En ny HARMONIE-generation kan være publiceret med kun en kort forkant. HARMONIE-samlingens native horisont er cirka 60 timer, ikke 120; run-valget fastholder derfor den foretrukne generation ved mindst 48 resterende timer. Marine samlinger bruger fortsat 96 timer.
- #1785 valgte 18Z frem for en kortere 21Z-publikation. #1788 produktionsverificerede den korrigerede 48-timersregel: valgt run forblev 18Z, `preferredProgressiveRunRetained=true`, fire assets blev genbrugt, og serien voksede fra fire til syv behandlede tider frem til 15 UTC. Fulde gates og deploy bestod.
- DEC-0030 gør nu P1-kortlægningen af komplette DMI-first femdøgnskæder til næste prioriterede analyse før P3 RavScore-forskningen. Den giver endnu ikke mandat til produktionsændring.
- Første officielle kortlægning viser WAM med 5½ døgn og DKSS med 5 døgn. Begge DMI-produkter indeholder 10 m vind og bruger HARMONIE-forcing først og ECMWF-forcing i halen. WAM-/DKSS-vind skal derfor undersøges som DMI-hale før MET Norway/Open-Meteo. Ingen af dem er endnu godkendt som RavRadar-vindkilde.
- #1828 viste, at 4.0.118-vindhalen reelt havde 0 zoner: DKSS-id 34 blev kaldt `sst` af generisk ecCodes-metadata og forkastet. Dette erstatter antagelsen om ren progressiv opbygning.
- 4.0.119 gør lokale DKSS-id'er autoritative, løfter parser/parameterkort til 13/4 og roterer DKSS efter manglende U/V-vindhale; parserrettelsen er produktionsverificeret i #1831.
- #1831 produktionsverificerede rettelsen: `dkss_idw` genkendte både `wind-tail-u-10m` og `wind-tail-v-10m`; bulk havde 107 vindhalezoner ≥96 timer. Begge fulde gates og Pages-deploy var `success`.
- Det deployede datasæt `rr-20260808092815-208` havde vind i 200/208 zoner, 108/208 ≥96 timer, 107/208 ≥108 timer og maksimum 111,5 timer. Løsningen virker teknisk, men fuldt 118–119-timers landdækkende produktmål kræver fortsat LF/NSBS-rotation og måling.

## Planlagt RavScore-forskning – ikke aktiv udførelse
- En større videnskabelig forsknings- og modelvalideringsrunde er registreret som P3 i DEC-0029. Den starter først efter den aktuelle forecast-/schedulerstabilisering og højere P0/P1-opgaver.
- Første leverance er forskning, systemmodel, kodeaudit, evidensmatrix og valideringsdesign uden ændring af produktionskode eller RavScore.
- Det aktuelle forbud mod generelle strømbånd som scoreinput/fallback er fortsat bindende. Forskningen skal senere teste, om rumlige strømstrukturer tilfører selvstændig, validerbar information; det er ikke et forhåndstilsagn om genindførelse.
- Den senere analyse må ikke begrænse vindgrundlaget til de zoner eller punkter, hvor kortet viser pile. Pile er selektive UI-markører, ikke grænsen for det fysiske vindfelt. Rumlig/opstrøms vind over hav og kyst, historik, bølge-/strømkobling, tidsforsinkelse og mulig dobbelt-tælling skal undersøges som del af den samlede ravkæde.
- Ingen ny mekanisme må aktiveres uden separat godkendelse efter evidens, overlap/dobbelt-tælling, datakrav, performance og virkelighedsvalidering er fremlagt.
