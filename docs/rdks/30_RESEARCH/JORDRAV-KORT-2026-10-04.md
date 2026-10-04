# Jordravkort – forskningscheckpoint 2026-10-04

## Aktuelt mandat og samtaledelta

Ejeren ønsker en meget dyb faglig analyse af mulighederne for jordrav/markrav og et selvstændigt interaktivt Danmarkskort som ny fane på ravradar.dk. Kortet skal kunne skifte mellem **Almindeligt kort** og **Luftfoto**. Potentialepolygoner, valgt område og forklaring skal bevares ved skift.

Den yderligere fordybelse samme dag omfatter fysisk transport, bevaring,
tidligere kyster og en national diagnose af processernes fokus. Ejerens
aktuelle præcisering om pløjning og regn indgår som praktisk fundmekanisme:
pløjning kan blotlægge rav i det bearbejdede lag, og regn kan vaske jord af.
Geologisk lager og nutidig synlighed er adskilt. Ingen fast regntærskel eller
vejrhentning tilføjes. Se den nye [transport- og markanalyse](../../research/JORDRAV_TRANSPORT_PLOEJELAG_2026-10-04.md).

Ejeren har præciseret, at analysen skal udlede **muligheder uden allerede dokumenterede ravfund**. Direkte fund er støtte til sikkerhed, ikke et obligatorisk krav til en potentiel zone. Modellen skal vurdere istransport, glaciotektonik, smeltevand, tidligere hav/kyster, gentagen kronologisk omlejring og overfladerelevans. Geografisk overlap mellem forskellige isrande udløser ikke automatisk bonus.

Ejeren har desuden udtrykkeligt instrueret, at det ældre 1:200.000-jordartskort skal bruges trods de konstaterede særlige anvendelsesvilkår. Det tidligere forslag om at udelade downloadede polygoner som supplerende grundlag er erstattet. Det nyere kort har forrang, hvor materialet er klassificeret; det ældre kort beholder egen kilde, målestok, usikkerhed og vilkårsangivelse. Nyere geometri alene er ikke tilstrækkelig: filen har 1.154 `X`-polygoner med ukendt jordart, som skal indgå i supplementreglen.

Arbejdet holdes i denne selvstændige jordravgren. Ingen ny funddatabase, brugerindberetningsfunktion, læringspipeline, SQL, vejrscheduler eller løbende serverberegning er del af løsningen. Eksisterende offentlig litteratur indgår som fagligt grundlag.

## Leveret analyse

### Efterprøvning med offentlige boringer før kortreview

Ejerens aktuelle spørgsmål om yderligere arbejde uden at have set kortet
er omsat til konkret stratigrafisk efterprøvning. Rapport:
`docs/research/JORDRAV_BORINGER_LAGFORBINDELSE_2026-10-04.md`.
To offentlige Jupiterprofiler er læst i den aktuelle webgrænseflade;
udvalgte geologiske intervaller er gemt med adgangsdato og kilde.
GEUS 2011/50s forside og trykte sider 13, 16, 29 og 36 er visuelt kontrolleret.
Knudsen m.fl. 2009 anvendes med eksplicit abstractgrænse. Pedersen 2005s
formationsafgrænsning er efterlæst. Gentagen anvendelse af samme boreevidens
betragtes ikke som uafhængige ravbeviser.

Read-only `audit_profile_points.py` kontrollerer udvalgte intervalgrænser,
manifest-/katalog-/model-/filbinding og punktopslag i to generaliserede
visningsudsnit. De to aktuelle punkter rammer hver én flade. JH-010–011
skærper lagkontakt og dækkespørgsmål; hverken ravtilførsel, pløjelag eller
markadgang verificeres. Ingen fast boringsradius, dybdebonus eller ny
national boringsintegration. Den eksisterende brugerflade og alle frosne
model-/data-/producentidentiteter er uændrede.

RDKS, åbne issues, changelog, Markdown-håndbogen og det forberedte
webhåndbogstillæg er opdateret. Punktopslagsaudit og uafhængig kontrol af
intervalsummer, fil-/scriptidentiteter, Python-syntaks, lokale rapportlinks
og håndbogstillæg PASS. RDKS/14 chatkilder/håndbog/4.0.541 og eksisterende
sikkerhedshærdningskontrakter PASS; tidligere 12 browserkontroller genbruges
som dateret evidens for den uændrede UI. Ingen ny browser-, CI- eller
produktionspåstand. Lokal preview forbliver stoppet til næste kortvisning.

### Tidligere grundanalyse

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

## Historisk analysestatus før implementering

Baseline er lokalt verificeret checkout `bbc3c79fe555dffbff4a88af8cdf54573953efdb`, RavRadar 4.0.541. GitHub main matchede ved analysens start, men var ved den friske slutlæsning 2026-10-04 02:09 DK rykket til `a459b846d9d19351127d46bdab544e6bc50dc24b`, merge af PR510. Dens offentlige filliste ændrer ikke de undersøgte kort-, app-, i18n- eller service-worker-filer. Tre GitHub-kørsler stod i kø ved statuslæsningen; der foretages ingen fælles levering ud fra denne metadata. Gren: `codex/jordrav-geologisk-analyse`. Dette er lokalt forsknings- og dokumentationsarbejde, ingen ny appversion. RDKS-tillæggene skal senere integreres med nyere main-dokumentation.

Næste trin er at fastlægge gennemgåelige potentialeregler, sammenholde de første geografiske kandidater med moderne stratigrafi, normalisere offentlige kildepolygoner og bygge en mærket prototype med begge baggrundskort. En ny funddatabase er ikke en forudsætning. De konkrete åbne punkter findes i det særskilte jordravtillæg i `KNOWN-ISSUES.md`.

Før en senere fælles levering skal main og eventuelle aktive produktionsskrivere læses på ny. Merge/deploy følger den eksisterende arbejdsgrænse. Ingen vejrkørsel dispatches eller genstartes fra jordravarbejdet.

Modelanbefaling: ejerens GPT-6.1 Sol og **Ekstra høj** til faglig syntese, modelregler og slutkontrol. Ingen model-/indsatsændring er udført automatisk.

## Yderligere transport-, dybde- og markanalyse samme dag

Rapport: `docs/research/JORDRAV_TRANSPORT_PLOEJELAG_2026-10-04.md`.
Fysisk ravtransport er efterprøvet i Lofty 2023s originaltekst og tabeller;
kontrollerede 5 mm-kugler er ikke en kalibrering af naturlige ravstykker.
Bevaringens mekanistiske grundlag og synlighedsanalogi er anvendt med
eksplicit abstractgrænse. GEUS 2025/32 s. 4 er visuelt kontrolleret;
kortlægning under pløjelaget og dobbeltsymboler er læst i metodeafsnittene.
Christensen & Nielsen 2008s abstract understøtter flere marine faser ved
Yderhede, ikke ravtilførsel eller en national fælles kysthøjde.

Tidligere label “Ved overfladen” er erstattet med “Øvre kortlagte aflejring”
på DA/DE/EN. Ens symboler beviser ikke rav i pløjelaget. Markguiden forklarer
ejerens pløjning/regn-mekanisme, og fokusnotens snævre udvalg er tydeligere.
Femte guidecase JH-009/Vendsyssel flytter alene kortvisningen. Klassevalg,
model, datasæt, producentkode og originalkilder er urørte.

Read-only `diagnose_process_focus.py` gennemgik alle 192 SHA-bundne udsnit,
505.834 visningsfragmenter og pakket regelsæt: PASS. Ca. 2.128 km² marint
sand/grus på marine flader og 84,7 km² finere bassinmateriale ligger uden for
forhøjet fokus. De er undersøgelsesspørgsmål, ikke nye ravflader eller
opgraderinger. 677,8 km² dække over en grov dybdekode afgør ikke pløjedybde.
35,7 km² forhøjet har forskellige øvre/nedre symboler. Det er generaliseret
visningsareal; native kildeareal er separat. Diagnosens scriptidentitet,
gruppesummer og lokale forskningslinks består en uafhængig kontrol.

Den faktiske browserprøve PASS/12 kontroller/errors[]: fem regioner, bevaret
kortvalg/geometri/fokus, begge baggrunde, explicit fejltilstand, markguide
og mobil390/DA/DE/EN. 212 OSM-/20 luftfotofliser returnerede 200. Overblik
920 ms, lokal detalje efter regionsnavigation 883 ms; lokal Chrome uden
netværksbegrænsning, ikke fysisk mobil eller produktion. Mobil, markguide,
regional guide og fuldt luftfoto er visuelt gennemgået.

Source-critical PASS/108 browserfiler, 11 Pythonmodelcases/0,056 s og fire
Nodekontroller/5,77 s. Pages-modullukning PASS/58 moduler; sikkerhed og
håndbogens eksisterende 419 kapitler PASS. Endelig RDKS/14 chatkilder/4.0.541
og staged diffkontrol PASS. Særskilt diff for geologiske modeldata og
producentkode, kystgeodata, appversion, app/worker, workflows, Supabase og
aktiv webhåndbog er tom. Ingen fuld
source-CI, main-/writeropdatering, nye datahentninger til modellen eller deploy.
Aktiv webhåndbog/SQL er fortsat urørt; det prepared-unreleased tillæg er
opdateret med denne analyse. Main-status10:46 ovenfor er dateret historik.

## Historisk validering før implementering

RDKS-validatoren og den eksisterende sikkerhedshærdningsprøve bestod før dokumentationsarbejde. Den komplette geodataaudit bestod på de faktiske arkiver efter håndtering af ældre DBF-tegnsæt og en tom israndsgeometri. Det tidligere parserforsøg var mislykket og bruges ikke som bestået evidens. Auditresultatet angiver de faktisk anvendte softwareversioner.

Den normale `npm`-kommando mangler i den bundne runtime; de to deklarerede `validate:rdks`-delkommandoer køres direkte med bundlet Node. En midlertidig pnpm-store fra det første forsøg er fjernet. Ingen runtime-shim eller cache indgår i grenen.

`setup-codex.ps1` kunne ikke installere eksisterende `eccodeslib==2.48.2.27` til Windows. Geometri-/PDF-arbejdet fungerer; vejrkrav og afhængighedsfiler er urørte. Der er ikke kørt fulde vejr-, produktions- eller browsergates for et ikke-implementeret kort.

Slutkontrol: RDKS-validator og sikkerhedshærdningsprøve PASS; Python-syntaks, auditinventar, lokale rapportlinks og `git diff --check` PASS. Separate checks bekræfter 81 forekommende nyere TSYM-koder og 1.154 ukendte X-poster. Ringdiagnostikken PASS for alle 438/47 fund. Rubjerg-side 46 og Hartz' trykte side 107 er visuelt kontrolleret. Diffkontrollen viser ingen ændringer i appversion, kystdata, zoner, app, kortlevering eller workflows. Ingen CI-/produktionspåstand.

## Fortsat implementering 2026-10-04

Ejerens “fortsæt” er omsat til en selvstændig lokal `jordrav.html`, to
basekort og et statisk modeldatasæt. `data/jordrav/model-rules.json` er den
gennemgåelige regelsandhed; `scripts/lib/jordrav_model.py` eksekverer den,
og `scripts/build-jordrav-prototype.py` behandler de SHA-bundne offentlige
kilder. Separate model-, data- og browsertests er tilføjet.

Første version hedder **0.1.0-prototype**, mens appversion 4.0.541 er urørt.
Reglerne udpeger kompatible overfladematerialer i relevante transport-/
modtagermiljøer som **forhøjet procespotentiale**. Dette er en snævrere
slutning end rapportens foreslåede, regionalt underbyggede højeste klasse.
Alle ravslutninger har svag sikkerhed. Ingen isrands-/brunkulsbonus eller
fundkrav er tilføjet. Uafklaret grundlag er særskilt fra begrænset potentiale.

Den regionale analyse er udvidet med Houmark-Nielsen 2024, trykte s. 67–68
og 81, samt konkurrerende kilde-/dæklagsscenarier. Multebjergs lagfølge og
flere generationer af åse er processtøtte, ikke ravdokumentation. Denne
videre efterprøvning ændrer ikke det frosne prototype-regelsæt.

Geometribygningen har afdækket yderligere forhold ud over kilde-ringselvskæringer:
ældre overlap, 194 mikrosliver med tilsammen ca. 1,13 m², fælles knudepunkter
ved projektion og et punktberørende hul-/yderringstilfælde. Sidstnævnte
opdeles med begrænsede trekanter uden flyttet ydergrænse eller kategoriskift.
Hvert udsnit stopper ved ukontrolleret geometriændring; godkendte udsnit
genbruges kun efter SHA-kontrol. Den fulde sporbarhed gemmes i build-auditen.

**Afsluttet lokal slutkontrol:** 192 native detailpartitioner og 192
overblikspartitioner før/efter generalisering PASS. Overblikkets klasser
samles inden for adskilte 20 km-celler. Tre efterfølgende klassegrupper har
et falsk eksakt dækningsflag ved punktkontakter; den forudgående partition,
arealsum og cellens afgrænsning er kontrolleret. Der påstås ikke eksakt
national eksportdækning. Ekstra inverse projektionsafvigelser auditeres
separat: højst 5 mm i detaljer og 0,5 m i overblik; største målte afvigelse
i overblikket er 0,225 m.

En national samlet union blev forkastet efter numeriske fællesgrænsefejl
og ca. 0,013 m² beregnet overlapforskel. Grovere beregningsgitre ændrede
kildearealer uden at løse fejlen og blev forkastet. En første overeksporteret
oversigt på 21,2 MB gzip er erstattet af den kontrollerede celleeksport.
Disse forsøg er ikke bestået evidens eller det leverede datasæt.

Færdigt datasæt: 598 overbliksfeatures, 505.834 lokale features i 192 udsnit
og 4.652 forklaringskombinationer. Overblik er 5.941.601 gzip-bytes og
18.046.173 dekomprimerede bytes; detaljer samlet 111.648.298 gzip-bytes,
største udsnit 1.421.147 bytes. Den sidste invocation genbrugte 192
SHA-kontrollerede detailudsnit. Dens 279 sekunder er ikke en fuld kold
genbygning; tre tidligere producent-scriptidentiteter bevares i auditen.
Uafhængig DBF-/cachekontrol PASS for 238.829 attributposter og de 194
auditerede kollapsede mikroflader.

11 modelcases, tre fil-/model-/modul-/sprogkontroller og otte browser-
kontroller PASS. Browseren bruger faktiske klik og OSM-/Esri-fliser;
område, forklaring, centrum og zoom bevares ved skift. Alle synlige
luftfotofliser blev indlæst før visuelt gennemgået optagelse. 390 px mobil,
DA/DE/EN og eksplicit fallback ved manglende detaljer PASS. Lokal Chrome
uden netværksbegrænsning målte 842 ms / 6.050.674 geologi-bytes til nationalt
kort og yderligere 1.186 ms / 5.099.092 bytes i det undersøgte lokale udsnit.
Dette er ikke fysisk mobil-, CI- eller produktionsbevis.

Source-critical-gate PASS med 107 browserfiler. Den eksisterende fulde
source-kontrakt beholder sine 47 grupper; den nye billige model-/datatest
indgår i den eksisterende produktkritiske gruppe. Sikkerhedshærdning,
RDKS, håndbog, Pages-modulclosure, startorden og versionsclosure PASS.
Ingen fuld vejrbygning er kørt. Detaljer og konkrete begrænsninger:
`docs/research/JORDRAV_PROTOTYPE_0_1.md` og de tre prototypeaudits.

Git bevarer jordravdatasættet, producentkoden og modelkoden byte for byte
via afgrænsede `.gitattributes`-regler. En særskilt indexkontrol PASS for
199 staged data-/producentfiler. Source-critical-gaten er genkørt efter
udvidet producent-SHA-/regelsæts-/featureantalskontrol og består igen.

Den aktive webhåndbog har en installationskopi i SQL. Den bevares urørt
i denne gren; `docs/research/jordrav/handbook-supplement.json` er et konkret
forberedt webafsnit til senere koordineret integration. Markdown-håndbog,
changelog og RDKS beskriver prototypen. Ingen ZIP eller ny apprelease afleveres.

Main under implementeringen var først `b8f9bba81638342a540cca383af637cd77a2df69`
(PR512). Frisk læsning **2026-10-04 10:46 DK** er
`d778ff28c84606a93364ce112fecce4152182649`, med aktiv main-run `37188571721`
og tre queued runs. Der foretages ingen fælles merge eller deploy.
Nyere main-/RDKS-integration, exact-head CI og friske writerchecks kræves
før publicering. Git-runtime mangler HTTPS-remotehelper; lokal historik og
preview bevares, og ingen alternativ remotelevering er udført.

## Regional fortsættelse før ejerens hjemkomst

Ejeren kunne ikke åbne localhost-kortet fra telefonens fjernadgang og har
valgt at se det hjemme senere; lokal HTTP-preview svarede heller ikke
længere. Localhost er ikke en delt internetadresse. Ejeren ønsker mere
arbejde indtil da; det autoriserer videre lokal analyse og forbedring,
ikke en ny automation, produktionsdispatch eller omgået release.

Fire regionale sedimentkæder er uddybet med positiv mulighed, modargument
og ekspertpunkt JH-005–008 i
`docs/research/JORDRAV_REGIONALE_KAEDER_2026-10-04.md`. Guiden i
`js/jordrav/regional-hypotheses.js` har DA/DE/EN og direkte primærkilder.
Navigationsvinduer er omtrentlige kortudsnit, ikke potentialepolygoner,
formationsgrænser eller oplande. Et fokusvalg viser kun forhøjet
procespotentiale og gendanner øvrige klasser uden ny klassifikation.
Model, manifest, datasæt, kystgeodata og appversion er uændrede.

Browseren afslørede et tabt regionsvalg under zoom. Første stopforsøg
var utilstrækkeligt; et tidligt moveend afsluttede ikke zoomanimationen.
Rettelsen venter på afsluttet zoom/bevægelse og anvender seneste ønskede
region. Efter en kortbevægelse markeres lokale detaljer som under
indlæsning. En bevidst overlappende zoom-/regionsprøve indgår nu.
De tidligere fejl er ikke PASS. Korrigeret samlet prøve: **11 checks PASS**,
inklusive nationalt/lokalt fokus, gendannelse, fire regioner, klik,
baggrundsskift, mobil, sprog og fejlfallback. Guide/mobil er visuelt læst.
11 modelcases og fire data-/modul-/sprogkontroller PASS. Den produktkritiske
sourcegate har nu 108 browserfiler, fortsat i samme 47-gruppers kontrakt.

Nyeste lokale Chrome-måling: nationalt kort 804 ms/6.050.674 geologi-bytes;
lokalt udsnit efter regional navigation 735 ms/5.099.092 yderligere bytes.
Hele prøveforløbet inkl. regionale visninger: 13.260.436 bytes. Ingen fysisk
mobil-, CI- eller produktionspåstand. Markdown-håndbog, forberedt
webhåndbogstillæg, changelog og aktive RDKS-toppe følger samtaledeltaet.
Seneste grønne lokale grundcommit før dette tillæg: `6ccd506c`.

Afsluttende kontrol efter navigationsrettelsen: source-critical PASS med
108 browserfiler/11 modelcases/fire Node-kontroller; Pages-modulclosure
PASS med 58 moduler; RDKS, sikkerhedshærdning, håndbog og diff-check PASS.
Særskilt diff viser ingen ændringer i model-/datasetfiler, kystgeodata,
appversion, app.js, service-worker, workflows, Supabase eller aktiv
webhåndbog. Ingen ny apprelease, PR, merge, deploy eller automation.
