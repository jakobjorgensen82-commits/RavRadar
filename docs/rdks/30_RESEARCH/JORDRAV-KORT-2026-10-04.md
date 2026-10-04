# Jordravkort – forskningscheckpoint 2026-10-04

## Aktuelt mandat og samtaledelta

Ejeren ønsker en meget dyb faglig analyse af mulighederne for jordrav/markrav og et selvstændigt interaktivt Danmarkskort som ny fane på ravradar.dk. Kortet skal kunne skifte mellem **Almindeligt kort** og **Luftfoto**. Potentialepolygoner, valgt område og forklaring skal bevares ved skift.

Ejeren har præciseret, at analysen skal udlede **muligheder uden allerede dokumenterede ravfund**. Direkte fund er støtte til sikkerhed, ikke et obligatorisk krav til en potentiel zone. Modellen skal vurdere istransport, glaciotektonik, smeltevand, tidligere hav/kyster, gentagen kronologisk omlejring og overfladerelevans. Geografisk overlap mellem forskellige isrande udløser ikke automatisk bonus.

Ejeren har desuden udtrykkeligt instrueret, at det ældre 1:200.000-jordartskort skal bruges trods de konstaterede særlige anvendelsesvilkår. Det tidligere forslag om at udelade downloadede polygoner som supplerende grundlag er erstattet. Det nyere kort har forrang, hvor materialet er klassificeret; det ældre kort beholder egen kilde, målestok, usikkerhed og vilkårsangivelse. Nyere geometri alene er ikke tilstrækkelig: filen har 1.154 `X`-polygoner med ukendt jordart, som skal indgå i supplementreglen.

Arbejdet holdes i denne selvstændige jordravgren. Ingen ny funddatabase, brugerindberetningsfunktion, læringspipeline, SQL, vejrscheduler eller løbende serverberegning er del af løsningen. Eksisterende offentlig litteratur indgår som fagligt grundlag.

## Leveret analyse

- Rapport: `docs/research/JORDRAV_POTENTIALE_DANMARK_2026-10-04.md`.
- Gentagelig, read-only audit: `docs/research/jordrav/audit_public_geodata.py`.
- Faktiske filidentiteter, felter, gyldighed og payloadmålinger: `docs/research/jordrav/public-geodata-audit-2026-10-04.json`.
- Målrettet, read-only ring-gyldighedsdiagnostik: `docs/research/jordrav/source-validity-diagnostic-2026-10-04.json`.

Rapporten indeholder en begrundet geografisk kandidatoversigt, ravspecifik dansk litteratur og nye mekanismebaserede muligheder, separate akser for potentiale og sikkerhed, regler for overfladerelevans, kildeprioritering og et konkret kort-/leveringsdesign.

Den første model anbefales kvalitativ og foreløbig. Den må udlede muligheder med svagere sikkerhed, men skal ikke fremstille dem som målte fundprocenter eller konstruere hotspotgrænser. Uafklaret er en særskilt tilstand, ikke en lav score.

## Faktisk geodataevidens

GEUS-arkiverne er MD5-kontrolleret mod udbyderens metadata. Alle fire undersøgte geometrilag er EPSG:25832. Originalarkiver og kildedokumenter ligger i systemets temp-mappe.

| Lag | Poster | Koordinatpunkter | Afgrænset fund |
|---|---:|---:|---|
| Geomorfologi v3/2022 | 15.178 | 1.593.117 | 36 kode-/betegnelseskombinationer; kode alene er ikke entydig |
| Jordarter v7.1/2026 | 199.653 | 11.266.996 | 20.539 poster har forskellige overflade-/dybdesymboler; 438 ring-selvskæringer |
| Jordarter 1:200.000 v2 | 24.192 | 1.524.398 | 37 forekommende koder; 47 ring-selvskæringer |
| Israndslinjer | 429 | 9.007 | Én tom kildegeometri; ingen færdige hændelsesaldre pr. linje |

Diagnostisk normalisering giver gyldige polygoner for alle ringfund med kun numeriske arealforskelle; der er ingen gemt repareret geometri. Den senere bygning kræver stadig en sporbar normalisering og fælles-grænse-kontrol.

Et nationalt geomorfologisk payloadforsøg gav 8.694.748 gzip-bytes uden forenkling og 1.718.178 ved 100 m forenkling. Det er et størrelsesforsøg, ikke godkendt kortgeometri eller mobilbenchmark. Fælles grænser, afrundet slutgeometri og browser skal testes i implementeringen.

## Kort og runtime

Leaflet 1.9.4 og eksisterende OSM/World Imagery-basekort er verificeret i koden. Den officielle GeoDanmark Ortofoto Web Mercator WMTS er verificeret i dokumentationen med EPSG:3857 og `DFD_GoogleMapsCompatible`; aktuel adgang kræver API-key/OAuth. Live tiles med RavRadars egen adgang er ikke testet.

Den endelige luftfotoleverandør/adgang er åben. Ingen ny konto, nøgle, betaling eller serverpipeline er oprettet. Kravet om begge basekort er fast. CSP, attribution, cache og fanens kortlivscyklus skal indgå i implementeringen.

Jordravlaget skal forberegnes, versioneres og lazy-loades ved fanens åbning. Det skal have egen kortinstans og undgå afhængighed af DMI, Supabase og live vejropdateringer. Der er ikke oprettet en automation eller ændret produktion.

## Arbejdsstatus og næste trin

Baseline er lokalt verificeret checkout `bbc3c79fe555dffbff4a88af8cdf54573953efdb`, RavRadar 4.0.541. GitHub main matchede ved analysens start, men var ved den friske slutlæsning 2026-10-04 02:09 DK rykket til `a459b846d9d19351127d46bdab544e6bc50dc24b`, merge af PR510. Dens offentlige filliste ændrer ikke de undersøgte kort-, app-, i18n- eller service-worker-filer. Tre GitHub-kørsler stod i kø ved statuslæsningen; der foretages ingen fælles levering ud fra denne metadata. Gren: `codex/jordrav-geologisk-analyse`. Dette er lokalt forsknings- og dokumentationsarbejde, ingen ny appversion. RDKS-tillæggene skal senere integreres med nyere main-dokumentation.

Næste trin er at fastlægge gennemgåelige potentialeregler, sammenholde de første geografiske kandidater med moderne stratigrafi, normalisere offentlige kildepolygoner og bygge en mærket prototype med begge baggrundskort. En ny funddatabase er ikke en forudsætning. De konkrete åbne punkter findes i det særskilte jordravtillæg i `KNOWN-ISSUES.md`.

Før en senere fælles levering skal main og eventuelle aktive produktionsskrivere læses på ny. Merge/deploy følger den eksisterende arbejdsgrænse. Ingen vejrkørsel dispatches eller genstartes fra jordravarbejdet.

Modelanbefaling: ejerens GPT-6.1 Sol og **Ekstra høj** til faglig syntese, modelregler og slutkontrol. Ingen model-/indsatsændring er udført automatisk.

## Validering og begrænsninger

RDKS-validatoren og den eksisterende sikkerhedshærdningsprøve bestod før dokumentationsarbejde. Den komplette geodataaudit bestod på de faktiske arkiver efter håndtering af ældre DBF-tegnsæt og en tom israndsgeometri. Det tidligere parserforsøg var mislykket og bruges ikke som bestået evidens. Auditresultatet angiver de faktisk anvendte softwareversioner.

Den normale `npm`-kommando mangler i den bundne runtime; de to deklarerede `validate:rdks`-delkommandoer køres direkte med bundlet Node. En midlertidig pnpm-store fra det første forsøg er fjernet. Ingen runtime-shim eller cache indgår i grenen.

`setup-codex.ps1` kunne ikke installere eksisterende `eccodeslib==2.48.2.27` til Windows. Geometri-/PDF-arbejdet fungerer; vejrkrav og afhængighedsfiler er urørte. Der er ikke kørt fulde vejr-, produktions- eller browsergates for et ikke-implementeret kort.

Slutkontrol: RDKS-validator og sikkerhedshærdningsprøve PASS; Python-syntaks, auditinventar, lokale rapportlinks og `git diff --check` PASS. Separate checks bekræfter 81 forekommende nyere TSYM-koder og 1.154 ukendte X-poster. Ringdiagnostikken PASS for alle 438/47 fund. Rubjerg-side 46 og Hartz' trykte side 107 er visuelt kontrolleret. Diffkontrollen viser ingen ændringer i appversion, kystdata, zoner, app, kortlevering eller workflows. Ingen CI-/produktionspåstand.
