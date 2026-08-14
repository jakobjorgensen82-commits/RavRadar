## 2026-08-14 – 4.0.198

- #31792615992 bestod den korrigerede 210-zoneplan, officiel kildehentning, topologi, kystdele og navneaudit, men stoppede ved en isoleret historisk 208-kontrol i lokalitetsopdelingen.
- Kontrollen er samlet under den fælles 210-zonekontrakt og dækket af regressionstest. Ingen runtime- eller fagdata ændres.

## 2026-08-14 – 4.0.197

- Den første private land-/vandkørsel #31790559558 dokumenterede en separat, forældet planport: den krævede 211 effektive zoner, mens den centralt godkendte sletning af Fejø/Femø giver 210.
- Plan, topologiaudit, kystdelsbygger, stednavneaudit og deres fail-closed validatorer/tests er afstemt til 210. Historisk forældreregister og tidligere evidens på 211 omskrives ikke.
- Ændringen er ren pipelinepolitik og ændrer ikke geometri, DMI, score eller central admin-sandhed.

## 2026-08-14 – 4.0.196

- Et landsdækkende symptom i admin blev fulgt gennem generator, centrale reviews, offentlig kystdelsbygger, DMI-sampling, lokal score og forklaring. Rodårsagen var, at stednavne tidligere kunne afgøre land-/vandside; øer, forter og havnenavne kunne derfor vende et ellers vinkelret punktpar forkert.
- ESA WorldCover 2021 bruges som uafhængigt, versionsbundet sidebevis ved fire transektafstande. 434 af 673 aktive dele er verificeret, 121 er dokumenteret omvendte, og 118 er tvetydige og forbliver urørte.
- Admin viser igen den røde hav→land-retning. Retningstal er afledte og låst; godkendelse kræver, at punktlinjen krydser egen kyst, ligger på modsatte sider og er tilnærmet vinkelret.
- De 121 rettelser indføres først i den private nationale kandidat. DMI-grid, shadow-score, runtime og rollback skal være grønne før offentlig aktivering.

## 2026-08-14 – 4.0.195

- Ejerens produktionsbillede dokumenterede, at 4.0.194 ikke virkede: Rejsby var valgt i teksten, mens kortet stod på Bornholm uden vektorlag eller punkter.
- En isoleret browserharness med de aktive zone- og kystdelsdata reproducerede den konkrete Leaflet-stacktrace. Nye kort fik zonepolygonen før deres første geografiske position, så Leaflet stoppede i `_clipPoints` før resten af tegningen.
- Tegnerækkefølgen er vendt: beregn grænser, kør `fitBounds`, tegn derefter zone, kystdele og punktmarkører. Samme Rejsby-test viser korrekt Vadehavskort, 121 vektorstier, to markører og nul fejl.

## 2026-08-14 – 4.0.194 (erstattet)

- Reproduceret en kortlivscyklusfejl i land-/vandeditoren: listen kunne vise Rejsby/Ribe Vesterå, mens kortet stod på en tidligere Bornholm-zone uden valgte kystlag og punktmarkører.
- Zonevalg er gjort revisionsbundet. Tidligere forsinkede callbacks kan ikke overskrive det seneste valg; kortet invalideres, lagene bygges igen, og fokus sættes til den valgte zones dele ved hvert valg.
- Den valgte kystdel samt eksisterende land-/havpunkter bevares i editorens kort. **Vis på hovedkortet** er fjernet efter ejerbeslutning. Ingen DMI-, score- eller hovedkortlogik er ændret.

## 2026-08-12 – 4.0.192

- Ejerens land-/vandbestilling er implementeret som en samlet hovedzoneeditor: søgning viser alle aktive præcise kyststrækninger, deres geometri og individuelle land-/havpunkter.
- Markører kan trækkes eller sættes på ny. Kun verificeret central godkendelse anvendes i runtime; kladder er score-neutrale.
- DMI-sampling er flyttet fra den låste historiske punktfil til den byggede aktive kystdelskontrakt, så central adminrettelse, cachesignatur, DMI-grid, lokal score og offentlig runtime anvender samme havpunkt.
- Målrettede admin-, runtime-, DMI-cache- og schedulerregressioner består lokalt. Fuld validering, releasegate og frisk CI/produktion mangler ved dette checkpoint.

## 2026-08-12 – 4.0.186-kandidat

- Ejeren stoppede den fejlagtige udvidelse til en landsdækkende pipeline. DEC-0036 afgrænser bindende det aktive arbejde til seks navngivne fallbackzoner og det aftalte adminværktøj. Havnø/Mariager Fjord øst forbliver slettet; resten af den produktionsverificerede kyst er urørt baseline. Nye behov uden for omfanget kræver stop og udtrykkelig godkendelse før kode eller CI.
- Privat #31589831140 beviste den nationale 211-zonekæde gennem officiel kildehentning, kilde-QA og fjord-/normasker. Jobbet stoppede derefter på en historisk 208-konstant i topologiauditen. Topologiaudit, delgenerator, validatorer og regressionstests er afstemt til 211; ingen offentlig geometri blev ændret.
- Privat #31590992368 bestod videre gennem 131 fliser, topologi, dækningsaudit og delgenerator. Stednavneaudittens forældede 100-flisegate er gjort planbundet med komplet minimumsspor for alle fem stedtyper; offentlig geometri er uændret.
- Den præcise admin-kyst har fået trækbare endehåndtag og et reversibelt viskelæder. Flytning og deaktivering omfatter hele den validerede delkontrakt og central readback.
- En privat recoveryaudit forkaster de dokumenteret fejlplacerede gamle linjer som autoritet og bevarer Havnø/Mariager Fjord som slettet. Overlapgaten stoppede først 11 kopier af kyst, som allerede fandtes under andre hovedzoneejere. Den rettede plan flytter syv eksisterende dele, omplacerer to Ristinge-dele og bygger kun 12 reelt nye officielle dele til Langeland syd, Lolland vest/Albuen og Fejø/Femø. De 12 har punktpar og nul overlap mod andre aktive hovedzoner, men kandidaten kan ikke aktiveres før private ejer-, DMI-, score-, runtime- og rollbackgates.
- Efter lokal Windows-ecCodes afviste native DMI-kontrol på grund af en manglende DLL, blev kontrollen ikke omgået. Den eksisterende nationale Linux-pipeline genbygger i stedet fallbackkandidaten fra sin friske officielle kyst, gentager fail-closed ejerskabs-/overlapkontrol og validerer de 12 vandpunkter på native DMI-grid som privat artifact.
- Privat #31589561794 stoppede fail-closed ved national planlægning: central hydration havde 211 aktive zoner efter Vadehavsudvidelsen, mens konfliktpolitikken fortsat krævede 208. Den aktuelle politik er rettet til 211, og downstream-validering er gjort bestandskonsistent mellem plan, manifest, fliser, hydreret register og analyse.

## 2026-08-12 – read-only nataudit af den aktive 4.0.182-kyst
- Den produktionsverificerede, hash-låste bestand er bevaret byte-for-byte. Et nyt privat kontrolkort læser de 643 aktive dele direkte og tilbyder både samlet landsvisning og søgbar lokal visning uden mutations- eller aktiveringsvej.
- Landskortet samt lokale stikprøver ved Voerså–Sibirien og Vadehavet er åbnet og kontrolleret i browseren. Der ses ingen udenlandsk landsgeometri i oversigten; de godkendte Vadehavsforløb er til stede.
- Aktiveringskontrakten og alle 643 land-/vandpunktpar er genvalideret. Hele `test:coastal-geometry-v2`, RDKS-valideringen og håndbogens almindeligt-sprog-gate består.
- Forældede dokumentationslinjer om afventende runtimegate, privat Vadehavskandidat og manglende produktion er lukket eller tydeligt markeret som historik.

## 2026-08-11 – 4.0.181 genopretter hovedzonernes kortvisning
- Ejerens første offentlige kortkontrol viste, at 605 interne beregningsdele fejlagtigt blev gengivet som selvstændige synlige zoner med hver sin start-/slutmarkering, tooltip og tre Leaflet-linjer.
- Resultatet var et næsten sort Danmarkskort, gentagne navne, mange interne sorte markeringer, synlige kysthuller og markant langsommere indlæsning.
- 4.0.181 sender igen kun de oprindelige hovedzoner til kort-rendereren. De lokale dele, land-/vandpunkter, DMI-serier og lokale RavScore-resultater bevares uændret bag hovedzonen.
- Optællingen viste 2.488 synlige del-/multipartlinjer og cirka 12.440 Leaflet-objekter i den fejlbehæftede visning. 4.0.181 reducerer det til 209 aktive hovedzonelinjer og cirka 1.045 objekter; lokal browserkontrol viser 418 endemarkeringer, præcis to pr. zone. En særskilt audit af manglende kendte ravstrande forbliver åben.

## 2026-08-11 – 4.0.180 dækker sjældne atmosfæriske gridhuller
- #31497361674 bestod fulde gates, central readback og deploy. Online steg lokal scoredækning til 592/605 i alle 190 zoner.
- 13 dele mangler fortsat, fordi også de fire nærmeste HARMONIE-celler er missing. 4.0.180 bruger den tidligere private vindgates dokumenterede 32-celle-retrygrænse i det hurtige indeks.
- Kun nærmeste fælles gyldige U/V-celle accepteres; marine krav er uændrede.
- Push-kørsel #31498481482 bestod efterfølgende fulde gates, central readback, artifact og deploy. Det offentlige datasæt gav lokal score til 605/605 dele i alle 190 hovedzoner; kystmilepælen er dermed produktionsverificeret.

## 2026-08-11 – 4.0.179 bevarer fire hurtige vindkandidater
- #31495844161 beviste 4.0.178's indeks med otte HARMONIE-trin og 44 WAM-trin på 233 sekunder; fulde gates, central readback og deploy bestod.
- Online blev 543/605 dele scoret i alle 190 zoner. Supportartifactet viste 62 dele uden vind, fordi deres nærmeste indekserede HARMONIE-celle var missing.
- 4.0.179 gemmer de fire nærmeste celler i det hurtige indeks og genbruger den eksisterende fail-closed fælles U/V-gyldighedskontrol.
- Frisk online scoredækning afventer.

## 2026-08-11 – 4.0.178 indekserer HARMONIE-gridet én gang
- #31493787424 viste, at 4.0.177's native ecCodes-flerpunktsfunktion stadig brugte 1.008 sekunder på første vindfelt og afsluttede med nul forecasttrin. Den antagne hastighedsgevinst forkastes.
- 4.0.178 læser gridkoordinaterne én gang, afgrænser dem til registerets danske område og slår alle punkter op via små geografiske indeksfelter. Marine/bølgekontroller er uændrede.
- Samme run fandt også, at schedulerens isolerede ecCodes-teststub manglede den nye import; stubben følger nu den faktiske API.
- Frisk produktion og online scorekontrol afventer.

## 2026-08-11 – 4.0.177 samler lokale HARMONIE-gridopslag
- 4.0.176 blev deployet med 605 aktive kyststreger, grønne fulde gates, central readback og Pages, men online public conditions havde 0/605 lokale scorer.
- Workflowloggen dokumenterede årsagen: første HARMONIE-felt brugte hele arbejdsbudgettet på separate ecCodes-nearest-opslag for det udvidede 1.186-punktsregister og færdiggjorde derfor nul forecasttrin.
- HARMONIE er et komplet atmosfærisk grid. 4.0.177 bruger ecCodes' native flerpunktsopslag én gang pr. grid og cacher resultatet. Marine og bølgefelters bredere gyldighedssøgning er uændret.
- #31493787424 afviste løsningen: ecCodes gentog søgningen internt, første felt tog 1.008 sekunder og nul forecasttrin blev færdige. 4.0.178 erstatter metoden.

## 2026-08-11 – 4.0.176 aktiverer national lokal kystmodel
- Privat #31480089490 bestod hele den centralt hydrerede slutkæde med 605 dele, nul overlap, 605 punktpar, 594 fulde og 11 delvise marine gridbeviser samt central roundtrip/rollback.
- Ejeren gav udtrykkeligt go til aktivering på testdomænet. Orehoved-overlappet er eksplicit tildelt Falsters nordkyst.
- DMI-bulk sampler delpunkter i allerede downloadede GRIB-felter uden særskilte netkald. Lokale scores aggregeres med 7-punktsreglen og stopper som usikre uden skjult hovedzonefallback.
- Offentligt kort og prognose læser lokale kystdele og afledte scores. En kompakt central aktiveringspost styrer readback og rollback; de store kilde-/QA-filer gemmes ikke i Supabase.
- Første normale run #31489574586 bestod DMI, lokale scores, fuld Linux-validate og release-gate, men stoppede før Pages, fordi Supabase JSONB returnerede samme aktiveringsobjekt med en anden nøglerækkefølge. Readback sammenligner nu kanonisk nøglesorteret JSON i stedet for rå objektorden.
- #31491319173 bestod fulde Linux-gates, central readback og Pages-deploy. Online geometri viste 605 dele, men scorekontrollen viste 0/605, fordi første HARMONIE-trin ikke blev færdigt; 4.0.177 erstatter derfor gridopslaget.

## 2026-08-11 – 4.0.175 retter forældet reviewfordeling
- Privat #31474672948 nåede gennem den oprindelige nationale native DMI-, state-, vind- og shadow-kæde, men stoppede i den efterfølgende score-neutrale reviewbygger.
- De seks versionsstyrede kartografiske sideafgørelser fra 4.0.174 var allerede anvendt korrekt. Derfor var den faktiske 783-dels fordeling 758 komplette, 22 deldækkede og tre blokerede i stedet for den historiske 752/22/9-fordeling.
- Reviewgaten og dens self-test forventer nu 758/22/3 og 25 opmærksomhedsdele. Slutgeometrien på 603 dele og hele aktiveringsforbuddet er uændret.

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
# 2026-08-09 – 4.0.149 private nationale kystdelsforslag
- #2042 produktionsverificerede 4.0.148; privat #2043 reducerede åklynger til 489 og overdense zoner til den kendte `DK-B10-10`-partitionskonflikt.
- En ny read-only generator grupperer kun faktiske fragmenter som multipart, kræver officielle navne og holder punkter, sampling, state, score og aktivering falske.

# 2026-08-09 – 4.0.150 national lokalitetsgate
- #2046 produktionsverificerede 4.0.149 med fuld datakæde, validate, release-gate og Pages-deploy. Privat #2047 dannede 755 dele i 194 zoner; 14 zoner havde ingen del, 54 var planlagte konflikter, og én havde over 25 dele.
- Nul forbindelser, navne, punkter eller runtimefunktioner blev opfundet. Artifactauditen viste dog 23 dele over 20 km og 14 dele med over 20 fragmenter.
- 4.0.150 markerer de for grove dele fail-closed til lokalitetsreview. Lokal genbygning giver 129 umiddelbart reviewbare og 79 blokerede zoner; ingen aktiv geometri ændres.

# 2026-08-09 – 4.0.151 officielle nationale stednavnekandidater
- #2049 produktionsverificerede 4.0.150; privat #2050 verificerede 755 dele, 79 blokerede zoner og lokalitetsflag på 25 zoner/28 dele.
- Efter udtrykkelig ejergodkendelse blev de private delafgrænsninger brugt mod Dataforsyningens nøglefrie officielle `steder`-API. 503 requests over 100 udvidede fliser gav 37.815 deduplikerede steder.
- Alle 755 dele fik balancerede kandidater fra direkte kystnavne, lokale bebyggelser, havnekontekst og øvrig kontekst. 751 ramte loftet på 30 kandidater; dette er reviewmateriale, og alle `proposedName` er fortsat null.
# 2026-08-09 – 4.0.152 privat national lokalitetsopdeling
- #2054 verificerede 4.0.151-produktionen, og privat #2055 verificerede officiel kandidatdækning for 755/755 kystdele.
- De 28 grove dele opdeles i 56 read-only forslag på 2,565–19,882 km. Nærliggende kildefragmenter grupperes uden forbindelsesgeometri; 55/56 forslag har officielle direkte kystankre.
- Ingen admin-, produktionsgeometri-, DMI-, state-, score-, navne- eller aktiveringsændring er tilladt.
# 2026-08-10 – 4.0.153 Supabase Free-plan-kvotekontrol
- Supabase varslede fair-use efter 8,233 GB egress og 0,695 GB database. Tre MAU og 274 Edge Function-kald udelukker brugertrafik som hovedårsag.
- Kodeaudit viste ufiltreret fuld payload-readback hvert 15. minut og ubegrænset versionskopiering af bl.a. cirka 7,1 MB runtime-diagnostik.
- Readback filtreres nu til nødvendige adminnøgler (>98 % målt payloadreduktion), beskyttede writes er hash-idempotente, og maskindiagnostik skilles fra menneskelig rollbackhistorik.
- Central read-only audit fandt 8.647 oprydningsbare historikrækker med cirka 600 MB payload. Den bekræftede migration og `VACUUM FULL` blev udført i Supabase: databasen faldt fra 699 MB til 24 MB, alle 14 aktuelle admin-dokumenter er intakte, 676 rollbackrækker/8,3 MB er bevaret, maskinhistorik er 0, og maksimum er 100 versioner pr. dokument.
- Produktionskørsel #2056 på commit `7bb97c3` bestod central adminsync, fuld Linux-validate, release-gate, beskyttet Supabase-sync, Pages-artifact og deploy.

# 2026-08-10 – 4.0.154 officielle navneforslag til endelige lokale kystdele
- Privat #2107 CI-verificerede 4.0.152's friske central-hydrerede nationale kilde-, topologi-, kystdels-, stednavne- og lokalitetskæde; build og Pages var isoleret/skipped.
- Den endelige private bestand er 783 dele: 755 kildedele minus 28 grove erstattede dele plus 56 lokale forslag. Alle 783 får zoneunikke forslag fra officielle kandidat-ID'er med afstand og alternativer; automatisk omdøbning og aktivering er falsk.
- Den ene del uden direkte kystanker er den nordlige Hou/Bisnap-lokalitet. Den lukkes med officiel lokal bebyggelsesevidens `Hou Syd` 508,7 m fra delen, ikke et opdigtet navn.

# 2026-08-10 – 4.0.155 fail-closed nationale lokale punktpar
- #2110 produktionsverificerede 4.0.154; privat #2111 reproducerede 783/783 officielle navneforslag og nul blokerede på friske centralt hydrerede data.
- En lokal normalgate kombinerer officielle landvidner med officielle Farvand-vidner eller zonens centrale marinepunkt. 774/783 punktpar består; 575 bruger officielt Farvand og 199 central marineevidens.
- Ni dele har ingen gyldig modsat-side-kombination. De får null som land-/vandpunkt og præcis to neutrale normalalternativer til næste native DMI-gridreview. Sampling, state, score, admin og aktivering er falsk.

# 2026-08-10 – 4.0.156 national native DMI-gridgate

- #2114 bestod fulde produktionsgates/deploy; #2115 reproducerede 783 dele, 774 punktpar og ni blokeringer fra central admin-geometri.
- Ny privat validator sender 774 valgte vandpunkter og 18 alternativer gennem ét aktuelt WAM/DKSS forecast-step med produktionens parser, nearest-valid-cellesøgning og fælles U/V-regel.
- Rapporten er provenance-only og fail-closed; ingen rå vejrserie, geometri, admin, state, RavScore eller aktivering ændres.

# 2026-08-10 – 4.0.157 coastType-korrekt DMI-modelvalg

- #2118 stoppede alle 774 valgte punkter, fordi validatoren satte `coastType=unknown`; produktionens modelrouting filtrerede derfor Nordsø-WAM væk. Fejlen var i reviewvalidatoren, ikke evidens for 774 forkerte punkter.
- Punktartefaktet bærer nu central `coastType`, og gridgaten kører WAM NSB/DW samt DKSS NSBS/IDW/LF med produktionens egne prioriteringsregler. Ingen aktivering tillades.

# 2026-08-10 – 4.0.158 gridbevis og komponentdækning

- #2122 gav 752 valgte punkter med fuld WAM+DKSS, 18 med komplet DKSS uden WAM og fire med komplet WAM uden DKSS. Alle 774 har mindst én komplet native havmodelfamilie.
- 4.0.158 accepterer dette som vand/gridbevis, men mærker 22 som delvist dækkede. Manglende komponenter forbliver missing. Ni normalsidetvivl forbliver blokeret.
- #2126 bestod fulde produktionsgates/deploy. #2127 bestod hele den centralt hydrerede nationale kæde og bekræftede 774 gyldige valgte punkter, 752 fuldt dækkede, 22 delvist dækkede, nul ugyldige og ni fortsat blokerede; alle mutationsflag er falske.

# 2026-08-10 – 4.0.159 national weather-shadow-kontrakt

- 774 gridvaliderede dele får unik serie-/historikidentitet, samplingpoint og eksisterende gridproveniens. 22 komponentgab bevares; ni blokerede dele udelukkes.
- 194 zoner har private delkontrakter, mens 14 zoner forbliver helt uændrede. Alle 208 parent-zoner beholder autoritativ runtime, historik og score. Ingen sampling eller aktivering.
# 2026-08-10 – 4.0.160 national flertrinsserie-gate

- Implementerede privat, fail-closed flertrinsvalidering for 774 isolerede kystdelsserier.
- Hver faktisk tilgængelig WAM-/DKSS-familie kræver mindst to komplette native trin; 22 kendte familiegab bevares som missing.
- Artifactet må kun indeholde tilstedeværelse, digests og provenance. Rå værdier, state, score, UI, admin og public runtime er uændrede.
- Tre 4.0.159 private CI-forsøg blev stoppet før den nye kontrakt af den officielle stednavnetjenestes ikke-JSON-svar. Ingen gate blev svækket.
# 2026-08-10 – 4.0.161 livefundet routingrettelse

- #2142 bestod hele den nationale upstreamkæde og 4.0.159-kontrakten, men stoppede ved start af flertrinsgaten med manglende `parts_by_id` i live-`run()`.
- Flyttede opslagstabellen til korrekt scope og tilføjede regression for WAM-/DKSS-routing til de kontraktvalgte dele.
- Ingen runtime-, score-, admin- eller dataaktivering.
# 2026-08-10 – 4.0.162 national state-/historikisolation

- #2146 verificerede 774 flertrinsserier, 1.526 familier med to native trin og 9.156 komplette komponentbeviser uden rådata eller mutation.
- Implementerede transient state-replay for 770 DKSS-currentdækkede dele med unik historiknøgle og score-neutral `shadow-v2`.
- Fire WAM-only dele udelukkes eksplicit som `MISSING_DKSS_CURRENT_FAMILY`; ingen parentfallback eller nulstrøm.
- Replayinput slettes efter gate; state, score, UI, admin og public runtime forbliver deaktiveret.
# 2026-08-10 – 4.0.163 native lokal vindgate

- #2152 verificerede 770 isolerede `shadow-v2`-historikker, fire eksplicitte currentgab, slettet replay og nul scorepåvirkning.
- Identificerede lokal vind som nødvendig manglende datagate før DEC-0033-shadow-score; parent-vind er ikke tilladt som skjult fallback.
- Implementerede to-trins native HARMONIE wind-U/V-validering for alle 774 dele med samme-celle- og provenancekrav uden rådata eller aktivering.

# 2026-08-10 – 4.0.164 privat national shadow-score og vindbudget

- #2157 bestod hele upstreamkæden, men vindtrinnet ramte den importerede produktionsparsers standardarbejdsfrist efter 16 minutter. Fejlen er et utilstrækkeligt privat kørselsbudget, ikke evidens for ugyldige vindceller.
- Det private vindtrin får 3.000 sekunders budget; alle eksisterende DMI-, samme-celle-, provenance- og fail-closed-krav bevares.
- En ny privat gate samler kun eksakt tidsfælles native lokale komponenter og genbruger den aktive `calculateRavScore` uden at aktivere resultatet.
- 7-pointreglen omsættes til `whole-zone`, `only-part`, `several-parts` og `uncertain`. Manglende lokal sammenligning er altid `uncertain`.
- Rå marine/vind-input ligger kun transient i `.cache` og slettes efter validering. Parent-runtime og alle mutationsflag forbliver uændrede/falske. Privat CI afventer.

# 2026-08-10 – 4.0.165 native HARMONIE-kystkandidater

- 4.0.164 blev fuldt produktionsverificeret i #2163/#31414155813: frisk DMI, Linux-validate, releasegate, Supabase-sync, Pages-artifact og deploy bestod.
- Privat #2164/#31414173825 bestod geometri, topologi, navne, punkter, grid, marine flertrin og state. Vindgaten brugte det nye tidsbudget og stoppede derefter konkret ved `dk-b05-16-national-part-01` (`Harbo Odde`), som havde nul fælles gyldige wind-U/V blandt fire nærmeste celler.
- 4.0.165 gør atmosfærisk kandidattal miljøstyret og bruger 32 kun i den private nationale gate. Normal produktion beholder fire.
- Samme fysiske U/V-celle og den eksisterende afstandsgrænse på 24/40/32 km for Limfjorden/vest/øst valideres fortsat. Ingen interpolation eller fallback.

# 2026-08-10 – 4.0.166 målrettet HARMONIE-retry

- #2167 viste, at 32-kandidatsøgning for alle 774 dele er en skaleringsfejl: vindtrinnet arbejdede fortsat efter 54 minutter uden resultat og blev stoppet bevidst.
- Første pass bruger igen produktionsstandardens fire celler for alle. Kun de faktisk manglende del-ID'er genbehandles med 32 native kandidater og ryddet gridindekscache.
- Retrypopulationen rapporteres særskilt. Datagaten og 3.000-sekunders budgettet er uændrede.

# 2026-08-11 – 4.0.167 national ejer-review og admin-roundtrip

- Produktion #31425309838 bestod frisk DMI, fuld Linux-validate, releasegate, Supabase-sync, Pages-artifact og deploy.
- Privat #31425327202 bestod hele den central-hydrerede nationale kæde, 774 native vindserier og shadow-score for 752 fuldt dækkede dele. 22 deldækkede og ni blokerede blev bevaret uden fallback eller aktivering.
- Den private reviewside samler 783 dele med officielle navneforslag og statusfarver, som kun betyder datadækning. Del-score, scorefarve, rangering, rå vejr/state og offentlig integration er forbudt.
- National admin-roundtrip bruger kun et unikt midlertidigt dokument, kræver 783-dels readback/update, sletter dokumentet igen og kontrollerer `coastline-overrides` og `direction-reviews` uændrede.
- Brugerbeslutning: arbejdet fortsætter autonomt, indtil den samlede manuelle zonegennemgang er klar. Ingen implicit aktivering.

# 2026-08-11 – 4.0.168 native tretimers vandstandsgate

- Privat #31440337378 bestod hele upstreamkæden og 774-vindgaten, men stoppede shadow-score ved 0/752. Marine og vind havde tiderne 23:00/00:00, men scoremodellen kræver også native vandstand ved `t+3h`.
- Dette er en utilstrækkelig tidsindsamling, ikke en score- eller datakonverteringsfejl. Ingen interpolation eller konstrueret trend tillades.
- Det private job henter nu fire marine assets. Den transiente scoreinputgate kræver mindst ét reelt tretimerspar og giver ellers den præcise blokering `NO_NATIVE_THREE_HOUR_WATER_TREND`.

# 2026-08-11 – 4.0.169 begrænset vindassetvalg

- Privat #31445033036 bekræftede, at fire marine assets og den native tretimersgate består.
- Vindgaten stoppede senere ved downloadgrænsen, fordi den gamle overlaplogik tilføjede flere HARMONIE-assets, når marine input nu havde fire tider.
- Vindgaten vælger nu præcis to assets: et dokumenteret marint scoretidspunkt med `t+3h`-vandstand og ét yderligere native vindtrin. Det bevarer to-trinskravet uden at udvide byteforbruget.
# 2026-08-11 – 4.0.170 national ejerreview klar

- Offentlig #31448257626 produktionsverificerede 4.0.169 med fulde gates og deploy.
- Privat #31448258035 bestod hele den nationale kystzonekæde: 774 vindserier, 752 shadow-scorer, 22 deldækkede og ni blokerede dele.
- Score-neutral ejerreview med 783 dele og central admin-roundtrip/rollback bestod. Beskyttede dokumenter, geometri, score og offentlig runtime var uændrede.
- Reviewartifactet er auditeret og downloadet lokalt. Manuel ejerreview er næste gate; automatisk aktivering er fortsat forbudt.
# 2026-08-11 – 4.0.171 brugbar manuel kystzonegennemgang

- Ejerens skærmbillede dokumenterede, at første Danmarksoverblik var for småt, manglede baggrundskort og ikke gav en meningsfuld godkendelsesarbejdsgang.
- Reviewgeneratoren viser nu én stor del ad gangen med almindeligt kort/luftfoto, stednavne, kraftig valgt linje og automatisk zoom.
- De 31 opmærksomhedsdele vises først. Godkend/Skal rettes, bemærkning, lokal lagring, frem/tilbage og JSON-eksport er implementeret.
- Generatorselftest og statisk browser-JavaScript-test består. Ejeren bekræftede visuelt, at stort kort, baggrund, stednavne, automatisk zoom og kraftig blå kystlinje fungerer og ser fint ud.

# 2026-08-11 – 4.0.172 ejerafgørelser og indre-farvandsefterkontrol

- Ejeren gennemgik alle 31 oprindelige opmærksomhedsdele og eksporterede afgørelserne. De er normaliseret til et versionsstyret privat dokument: 11 godkendt uændret, 10 hele sletninger, tre sikre komponentrensninger, én navnerettelse og seks målrettede beskæringer.
- Stængerodde og Egernsund er blandt de eksplicit godkendte hele sletninger. Præcise vej-, havne- og åben-vandbeskæringer forbliver blokerede mod gæt.
- En ny audit læser alle 768 officielle Farvand-objekter i stedet for kun 90 fjord-/norobjekter. En eksakt metrisk kontrol viser nul faktisk fjord-/noroverlap i de 783 færdige linjer; nærhed er derfor ikke automatisk fejl.
- Nye kandidater kræver mindst fire uafhængige tegn blandt stor afstand til officielt hav, officiel havnenærhed, beskyttet farvandskontekst, meget kort del og lukket ø-/søform. Identisk geometri samles. Efterkontrollen er foreløbig 23 unikke dele, heraf seks kendte målrettede rettelser.
- Hele kæden er fortsat privat og score-neutral. Produktion, admin, sampling, state, RavScore og offentlig UI er uændrede.

# 2026-08-11 – 4.0.173 afsluttet ejerreview og fysisk dubletkontrol

- Ejeren gennemgik de 23 supplerende dele: 15 skal slettes, tre er godkendt, og fem er rettet præcist ved Thyborøn, Bremdal, Bjerget, Bouet og Flyvesandet.
- De fem forslag blev kontrolleret visuelt mod kortet. Der er ingen målrettet rettelse tilbage uden geometri.
- En metrisk audit fandt 12 yderligere tekniske ID'er, som fysisk dublerer allerede afgjorte linjer. Afgørelser føres videre; ved Thyborøn bevares kun den del af dubletten, der ligger langs den rettede kystlinje.
- Samlet korrektionsforslag dækker 60 tekniske dele: 30 sletninger, 19 uændrede godkendelser, ni korrigerede linjer og to navnerettelser. Den nye efterkontrol indeholder nul dele.
- Alt er fortsat privat, score-neutralt og ikke aktiveret i admin, produktionsgeometri eller offentlig runtime.

# 2026-08-11 – 4.0.174 once-only-slutkyst og nye punktpar

- Efter den grønne 4.0.173-kørsel viste en særskilt samlet kontrol 311 fysiske overlappar mellem forskellige zoner. Det tidligere dubletbevis dækkede kun andre ID'er for ejerbedømte dele og var derfor ikke en sluttopologigate.
- En ny once-only-samling anvender central zonekyst og datapunkt som deterministisk ejerskab. Hammer Odde splittes eksplicit ved nordspidsen mellem vest- og østsiden.
- Lokalt resultat: 753 inputdele, 603 endelige fysiske dele, nul overlappar og nul tætte uafgjorte ejerskaber.
- Punktpar er genberegnet på slutgeometrien. Seks tidligere blokeringer ved Thyborøn, Endelave, Flyvesandet, Helnæs, Nordvestlolland og Svaneke er kontrolleret på lokalkort og bevaret som versionsstyrede sideafgørelser. Resultatet er 603/603 punktpar.
- Workflowet gentager native DMI-grid, marine flertrinsserie, state-/historikisolation, vindserie og score-neutral shadow-score efter slut-samlingen. Intet aktiveres automatisk.
# 2026-08-11 – planlagt privat besøgsstatistik
- Ejeren ønsker en usynlig besøgstæller på den offentlige side og en enkel rapport i admin.
- Kravet er registreret som en senere P2-opgave. Rapporten skal være adgangsbeskyttet, dataminimeret og kvotesikker samt skelne sidevisninger fra besøg og eventuel anslået unikhed.
- Der er ikke givet tilladelse til profilering, fingerprinting, rå permanent IP-lagring eller offentlig visning. Statistik må ikke påvirke RavScore eller blokere siden.
## 2026-08-11 – 4.0.182 samler hovedzoner og præcise kyststreger
- Ejeren godkendte national slutkontrol og seks efterfølgende rettelser. Den nye bestand har 212 hovedzoner, 206 præcise kystforløb, seks sikre fallbacklinjer og 643 interne beregningsdele.
- Kortet viser fortsat kun hovedzonerne med én score og to endemarkeringer; de præcise dele bruges til selve kyststregens placering og lokal beregning.
- Kandidaten har nul tværzoneoverlap og nul uafklarede relevante kysthuller. Alle dele har land-/vandpunkter; 632 har fuldt og 11 delvist marint gridbevis.
- Privat #31532688885 bestod DMI for 39 nye/ændrede punktpar. Privat #31533385967 bestod runtime, offentlig kontrakt og central admin-roundtrip/rollback. Produktion afventer fuld release-kørsel.
- Produktionsforsøg #31536061680 og #31537882402 stoppede begge før deploy. Først blev de tre nye Vadehavszoner fjernet af legacy-generatoren; derefter blev den nye kystmanifest overskrevet af den ældre centrale manifest. Generatoren bevarer nu de eksplicit godkendte tilføjelser, og central sync tillader kun engangspromotion af en strengt nyere, eksplicit ejer-godkendt aktivering. Ved versionslighed vinder Supabase fortsat, så senere admin-rollback er intakt.
- #31539597870 passerede begge disse fejl, byggede frisk DMI for et effektivt centralt register på 211 zoner og skrev alle tre nye Vadehavszoner. Den centralt godkendte tombstone `DK-B02-14` forklarer forskellen fra repositoryets 212. Kørslens fulde validering stoppede kun på en formateringsfølsom legacy-test for `sync-admin-config.py`; testen er gjort semantisk og intet blev deployet.
- #31541126136 bestod derefter hele produktionskæden: frisk DMI, fuld projektvalidering, release-gate, central Supabase-readback, Pages-artifact og deploy. Direkte onlinekontrol viste version 4.0.182, 211 effektive hovedzoner, 643 aktiverede dele i 206 præcisionszoner, alle tre Vadehavszoner med offentlige forhold samt et synligt kort uden browserfejl. 4.0.182 er produktionsverificeret.
## 2026-08-12 – 4.0.183 entydige hovedzoneskel og redigerbart delejerskab
- Offentlige sorte skel samles til ét gensidigt møde mellem to forskellige hovedzoner. Interne dele og fritstående zoneender tegner intet skel, og skellet er mindre ved landszoom.
- “Tilbage til oversigten” gendanner Danmarksoverblikket.
- Admin kan flytte eksisterende præcise kystdele til en anden aktiv hovedzone. Geometri, land-/vandpunkt, DMI-gridbevis og del-ID følger samlet med; hver del publiceres kun én gang.
- Hele zonesletningen er bevaret. Ikke-flyttede dele under en slettet zone filtreres fra offentlig runtime, og ugyldigt ejerskab stopper bygningen.
- RavScore-regler og den fysiske 643-delsbestand er uændrede. Målrettede kort-, admin-, propagation-, sletnings- og aktiveringstests består, og GitHub Actions #31572312647 bestod den fulde produktionskæde inklusive Pages-deploy.

## 2026-08-12 – 4.0.184 lokal scoreforklaring

- Reersø og Mullerup viste korrekt grøn RavScore 78 og AI-prognose, men tomme delscorer og en falsk tekst om manglende data.
- Rodårsagen var `localZoneScore`, som beholdt totalscoren fra den vindende kystdel, men erstattede dens `components` og `componentReasons` med tomme objekter.
- Produktionsdata var konsistente: alle 643 dele fandtes, og 412/412 aktuelle kombinationer af 206 præcisionszoner og to jagtformer havde gyldig vinder, score og delscorer.
- 4.0.184 fører vinderens delscorer og faglige forklaringer videre og viser tydeligt én eller flere bedst scorende kystdele, men kun når spredningen er mere end 7 point. RavScore-regler og geometri er uændrede.
# 4.0.185 – lokalt delkort og ryddet zonepanel
- Ejeren besluttede, at den offentlige “Hvad fandt du?”-formular under hver zone skal fjernes.
- Zoneforklaringen får “Hvor er det?”, som ved klik viser de eksisterende præcise kystdele med navne og zoomer kortet til hovedzonen.
- Visningen genbruger den allerede indlæste kystkontrakt og ændrer ikke RavScore, geometri, DMI eller adminlagring.
# 2026-08-12 – bindende beskyttelse mod funktionstab
- Ejeren præciserede, at eksisterende funktioner ikke må smides væk under ændringer.
- RDKS kræver nu udtrykkelig ejerbeslutning før bevidst fjernelse, før/efter-kontrol af den berørte funktionsflade og dokumentation af både det fjernede og det bevarede.
## 2026-08-12 – 4.0.187 fem-zoneaktivering

- Ejeren godkendte fem af seks private zoner visuelt og beordrede `DK-B10-16` Fejø/Femø slettet helt.
- Fejø/Femø er fjernet fra zoneregister og præcis kystpakke og registreret som central administratorsletning i Supabase `direction-reviews` version 315.
- Den aktive kandidat har 651 kystdele i 210 effektive zoner, 651 punktpar, nul ugyldige punktpar og nul overlap. Privat #31609637964 havde allerede bestået geometri, native DMI, runtime og rollback for det godkendte grundlag.
- Den tidligere aktive kyst og zoneregisteret er bevaret i `data/geometry-v2/rollback-4.0.186-before-five-zone-coast/`. Ingen anden fungerende national geometri er ændret.

## 2026-08-12 – 4.0.188 progressiv DMI-zonecache

- Flere runs på både før- og efter-4.0.187-kode stoppede samme sted: current-spatial-auditen fandt kun 85/210 verificerede hovedzoner.
- GRIB-downloadcachen fortsatte, men den opbyggede DMI-zonecache blev kun bevaret ved et grønt deploy. Det nulstillede den afledte fremdrift efter hver rød releasegate.
- GitHub Actions gemmer nu kun en vellykket zonecache privat før releasegaten og gendanner den før næste DMI-opbygning. Builderen vælger mellem privat fremdrift og senest deployede cache efter datadækning, men kun når registersignaturen matcher aktuelle zoner, dele og punkter. Uvaliderede data deployes stadig ikke, og audits er uændrede.

## 2026-08-12 – 4.0.189 DMI-budgetrotation

- Runs #2423–#2426 viste samme reproducerbare mønster: den progressive cache blev bevaret, men auditten stod fast på 125/210 verificerede hovedzoner.
- `dkss_idw` brugte hele arbejdsbudgettet i hver kørsel og blev derefter valgt igen af den geografiske prioritering; de øvrige DKSS-modeller fik ikke arbejdstid.
- Schedulerens private collection-state registrerer nu tidsafbrudte marinemodeller og roterer dem bag ikke-forsøgte/ældre afbrudte modeller i næste recoverykørsel. Fuld/uændret gyldig behandling nulstiller markeringen.
- Kyst, land-/vandpunkter, RavScore, fallback, 90 %-grænse og deploygate er uændrede. CI-bevis mangler endnu.
## 2026-08-12 – 4.0.190 bevarer den nyeste DMI-arbejdsfremdrift

- #2429–#2431 gentog 125/210-dækningen, selv om 4.0.189 skrev budgetrotation. Analyse af hele kæden viste, at workflowcachen blev gendannet, men builderens kvalitetsrangering bagefter kunne vælge en ældre offentlig cache med flere rå komponenter.
- Dermed forsvandt nyere `collectionState`, budgetafbrydelser og behandlede forecast-trin, og efterfølgende runners begyndte igen med samme DKSS-model. Det svarer til det historiske fastlåsningsmønster, men rodårsagen var denne gang cachevalg, ikke STAC- eller GRIB-klassifikation.
- Kompatible caches rangeres nu efter nyeste checkpoint-/buildertid og først derefter datakvalitet. Checkpointet har allerede fået den offentlige cache flettet ind ved kørslens start, så gyldige data og sikker fallback bevares.
- GitHubs 15-minutters triggere kan stå i kø bag et cirka 29-minutters job; dette er forventet. De må ikke længere nulstille fremdriften. Fuld produktionsverifikation afventer frisk CI.
## 2026-08-12 – 4.0.191 fjerner flygtige felter fra DMI-cacheidentiteten

- #2437 gendannede og gemte workflowcachen, men begyndte alligevel igen med `dkss_idw`. Artifact-sammenligning viste forskellige registersignaturer mellem #2435 og #2437.
- DMI-vandkilderegisteret ændrer driftsfelter som `lastSeenAt`, observationstid, forecaststatus og cachetid ved hver produktion. Rå filhash gjorde derfor et korrekt checkpoint inkompatibelt. Zoners releaseversionsfelt kunne udløse samme falske reset.
- Cacheidentiteten er nu en kanonisk projektion af de stabile, samplingbestemmende felter. Reelle punkt-, geometri-, status- og ejerskabsændringer invaliderer fortsat cachen; almindelig drift gør ikke.
## 2026-08-14 – 4.0.193

- En landsdækkende audit dokumenterede, at DMI-schedulerens dækningsnævner kun omfattede 210 hovedzoner og derfor kunne afslutte recovery, selv om 651 lokale kystdele manglede selvstændig U/V-cache.
- Scheduler, runtimebuilder, lokal score, teknisk visning og videnskabelig strømgate er rettet som én sammenhængende kæde. Manglende lokal strøm kan ikke længere give en lokal score, og én del kan ikke fremstilles som bevis for hele zonen.
- Den fulde lokale forklaring, rå vejrdata, punktpar og pålandsretning følger nu vinderen. Hovedzonescoren fungerer som sikker fallback uden geografisk påstand, indtil lokal sammenligning er komplet.
- Friske progressive GitHub-kørsler og den efterfølgende landsdækkende orienterings-/punktrevision mangler fortsat ved dette checkpoint.
- Landsaudit af 651 aktive punktpar bruger nu hvert pars gemte kystreference og lokale tangent. 13 reelle afvigelser blev fundet; privat reparationskandidat giver 0.
- Afstandsbaseret orienteringsaudit og privat splitter er bygget. Den konservative kandidat berører 10 enkelt-delte hovedzoner, giver 673 dele, har 0 punktgeometrifejl og bevarer tvetydige Rejsby/Ribe Vesterå uændret.
- Helgenæs er visuelt kontrolleret som tre sider med landpunkt ind mod halvøen og vandpunkt ud fra hver side. Alle 10 foreslåede zoner har private kontrolbilleder.
- Privat #31764242827 validerede alle 45 ændrede/nye vandpunkter mod native DMI-grid med fuld dækning og nul ugyldige punkter.
- Kandidaten er derefter lokalt aktiveret som 673-dels pakke med 0 punkt-/overlapfund; 4.0.192/651 dele er bevaret som rollback. Hovedzonegeometrien er uændret.
- #31764453987 produktionsverificerede 4.0.193-kodekæden med frisk data, fuld validering, releasegate og deploy før aktiveringscommitten. Næste bevis er den deployede 673-dels pakkes progressive lokale U/V-dækning på mindst 95 %.
- Første aktiveringsrun #31764957646 stoppede fail-closed: central sync erstattede manifestet, fordi den nye status manglede det eksisterende `owner-approved-*`-signal. Aktiveringsscript og manifest bruger nu den bindende promotionskontrakt og en repositoryrelativ rollbacksti; digest- og central readback-gater er ikke ændret.

## 2026-08-14 – 4.0.199

- Privat national run #31794474426 nåede 29 grønne trin og stoppede ved den første anvendelse af land-/vandevidens.
- Rodårsagen var faseorden: 14 dokumenterede dele skabes først af senere ejerrettelser og kan derfor ikke kræves i den foreløbige punktbestand.
- Første fase registrerer nu disse id'er som udskudte og anvender resten. Slutfasen er fortsat fail-closed og kræver alle dokumenterede rettelser før videre DMI- og aktiveringskontrol.
- #31796921725 beviste, at faseudskydelsen virker (107 anvendt, 14 udskudt), og fandt derefter en separat statusfejl: et uafhængigt korrigeret punktpar kunne beholde builderens gamle blokerede status.

## 2026-08-14 – 4.0.200

- Hele den isolerede statuskontrakt normaliseres nu sammen med en uafhængig sikker punktrettelse. Vejr, state, score og aktivering forbliver slukket frem til deres egne gates.
- Foreslået/blokeret-summer genberegnes. En målrettet DK-B07-21-regression består validatoren med 1 foreslået og 0 blokerede efter rettelsen.
- Ejerens krav om en eksplicit anbefaling af brugerfladens indsats ved hvert nyt arbejdsafsnit er gjort permanent i AGENTS og AI-operating-rules.
