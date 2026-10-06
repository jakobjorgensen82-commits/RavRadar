# Aktuel offentlig Jordravleverance – 4.0.545, 2026-10-06

Ejerens fulde designombygning er implementeret og offentligt kontrolleret.
Kortværktøjer ligger over kortet; lag og farver har et samlet panel;
regioner, områdeforklaringer og foldbar uddybning giver en tydelig indgang.
Mobil har region før kortet og direkte adgang til forklaringen ved et valg.
Alle tidligere funktioner, DA/DE/EN, almindeligt kort/luftfoto, gemte links,
kildelinks, dybe lilla registreringer og geologiske forbehold bevares.

108 lokale Chrome-checks består: 99 funktionsregressioner, seks UX-forløb
og tre faktiske genbesøgende cacheforløb. 360/390/768/1024 px er kontrolleret.
PR #525s endelige head 270cb619 bestod fuld validate:source i run
37456024761; kildebeviset er uafhængigt SHA-256-afstemt. Dokumentations-
konflikten med #524 blev løst med identisk valideret kildeindhold.
Merge 402dcb6e har præcis samme tree. Kode-only run 37456783798 består
Supabase-læsning, eksakt runtimegenbrug, artifact/privacy, backend og Pages.
Ingen vejrprovider blev kontaktet af denne kodelevering.

Den faktiske offentlige Chrome-browser afstemmer versionsfil, HTML, CSS og
alle 15 Jordravmoduler. Alle modulekald har releaseidentitet 4.0.545.
10 offentlige checks består med lokalt klik/JB4, Jupiter/16 profiler,
terræn/jordbund, luftfoto, markomrids, tastatur og 390 px DA/DE/EN.
Screenshots er visuelt læst. Kystregressionen kontrollerer 210 zoner,
673 dele, 420 nutidsvisninger og 2.100 dagsvisninger på faktisk offentlig
app-kode med skrivefri auditexports; ingen browserfejl eller kontraktfund.
Dette er browseremulation, ikke fysisk telefonhardware.

Datasæt/model 0.2, geologiske farver, svag ravsikkerhed og uafklaret
jagtbarhed er uændrede. Ingen målte ravmængder eller pløje-/lagdybder
opfindes. Punkt 4 om automatisk dagens nypløjede/bare/regnvaskede marker
er udgået efter ejerordre. JORDRAV-018/-019 er lukket med offentlig evidens.
Første design-heads cachefejl og CI bevares som supersederet historik.
RavScore, kystmodel, central adminsandhed og providerlogik bevares;
kystdata/zones fik kun det godkendte topversionsløft.

Begge kildehåndbøger og den statiske installationskopi følger betjeningen.
Kode-only bevarer centralt beskyttede assets; webhåndbogens centrale
synkronisering følger den eksisterende beskyttede fletning i normal drift.
Den tidligere normale opfølgning 37435351739 er terminal success; der er
ikke bestilt en ekstra normal vejrhentning alene for designet.

Kvittering: docs/research/jordrav/publication-evidence-4.0.545.json.
Designanalyse: docs/research/JORDRAV_DESIGN_2026-10-06.md.
Kort: https://ravradar.dk/jordrav.html
Den bestilte Jordrav-softwareleverance og designombygning er afsluttet.
Daterede ældre Jordravcheckpoints nedenfor er historik; deres pendingstatus
er erstattet af denne offentlige evidens. Andre aktive projektkrav består.
Ekstra høj indsats/Sol anbefales ved senere kritisk slutkontrol.

# Nyeste ejerønske – Jordravs design og betjening, 2026-10-06

Ejeren finder den offentlige Jordravside utilstrækkeligt indbydende,
intuitiv og visuelt gennemarbejdet og bestiller en rettelse. Arbejdet
fortsætter på `codex/jordrav-design` fra det validerede dokumentationshead
`daef1fd9`; PR #524 er fortsat separat og må først merges efter den aktive
produktion 37435351739. App 4.0.544 er den offentliggjorte forgænger.

Layoutet skal prioritere kortet, gøre baggrund/lag/farver lettere at finde,
give en tydelig indgang til områdeforklaringen og fungere på mobil samt
DA/DE/EN. Eksisterende funktioner, geologiske farver og usikkerheder,
datasetbindinger, dybe lag, gemte visninger og opt-in-kilder bevares.
Ny UX kræver faktisk browser- og visuel kontrol før leveringspåstand;
release, RDKS/håndbøger/changelog, exact-head CI og kode-only deploy følger.

# Historisk Jordravleverance – 4.0.544, 2026-10-06

Den bestilte nationale kortleverance er nu offentlig og browserverificeret.
PR #521 og #523 bestod hver fuld validate:source på deres eksakte head;
kildebeviser er uafhængigt SHA-256-afstemt. Seneste merge cf65a5fd og
kode-only run 37431340473, attempt 3, bestod den faktiske Supabase-læsning,
eksakt runtimegenbrug, artifact-/privacykontrol, backend og offentlig deploy.
Ingen vejrprovider blev kontaktet af kodeleveringen.

Det offentlige versionsfelt, HTML, CSS og alle 15 Jordravmoduler er afstemt
mod releasekilden. Faktisk offentlig Chrome kontrollerer overblik, lokale
klik, levende JB4/Jupiter/terræn, alle 16 profilmarkører, luftfoto,
markomrids og 390 px på DA/DE/EN. Screenshots er visuelt læst. De 99
lokale browserchecks og 50 målprøver bevares som særskilt lokal evidens.
Ingen fysisk telefonprøve, lokale ravmængder eller pløjelagsdybder påstås.

Punkt 4 om automatisk nypløjet/bar/regnvasket jord er udgået efter ejerordre.
De øvrige bestilte softwarepunkter er implementeret og leveret. Hele det
tilgængelige nationale grundlag behandles ens; empirisk ravtilførsel,
bevaring og markens faktiske lagadgang vises fortsat som ukendte.
Webhåndbog 90.1 er integreret i kilden; normal drift synkroniserer den
gennem eksisterende beskyttet håndbogsfletning. DEC-0148's normale
vejropfølgning er særskilt og kan ikke ugyldiggøre kortleverancen.
Den normale opfølgning blev faktisk startet som run 37435351739,
6. oktober kl.08.19 UTC på cf65a5fd, efter kodeleveringen. Dateret
driftsobservation og direkte run-link står i publiceringskvitteringen;
den er ikke et nyt dispatch eller en påstand om frisk vejrproduktion.

Tidligere profilprivacyfejl og to FGA-authafvisninger bevares nedenfor.
Ejeren oplyste, at adgangen ikke var ændret; samme opsætning virkede ved
attempt 3. Årsagen er uafklaret, og credentials/gates blev ikke ændret.
Kvittering: docs/research/jordrav/publication-evidence-4.0.544.json.
Kort: https://ravradar.dk/jordrav.html
Ekstra høj indsats/Sol anbefales ved senere kritisk drift/slutkontrol.
Nedenstående checkpoints er historiske; deres pendingstatus er erstattet.

# Jordrav – autonomt arbejdsforløb 2026-10-06

## Seneste mandat

Ejeren har bestilt, at hele det resterende arbejde udføres kontinuerligt
og autonomt frem til færdiggørelse. Efterfølgende udgår punkt 4 udtrykkeligt:
**ingen automatisk afgørelse af nypløjet, bar eller regnvasket jord nu**.
Dette erstatter tidligere lokal-only afgrænsning som fremtidigt mandat;
allerede dokumenterede lokale resultater forbliver lokale beviser.

Målet er landsdækkende muligheder for rav, som kan ligge blotlagt eller
bringes frem ved jordbearbejdning. Dybe lag må vises med tydelig egen
farve og utilgængelighed. Tidligere ravfund er støtte, ikke adgangskrav.
Almindeligt kort og luftfoto bevares. Ingen målt ravmængde, lokal dybde,
pløjning, blotlægning eller fysisk telefonkontrol opfindes.

## Plan og aktuelle beviser

| Arbejdspunkt | Arbejde | Status |
|---|---|---|
| 1. Lagadgang | Forbind kortlagt materiale med topjord og lokale offentlige lagprofiler; adskil direkte observationspunkt og områdefortolkning | Offentligt leveret: faktisk klikpunkt, JB og registrerede profiler; empirisk forbindelse til nabomark/pløjelag bliver ikke opfundet |
| 2. Prioritering | Skærp national udpegning via konkrete kilde-/transport-/modtagerforløb og dokumentér usikkerhed uden fundkrav | Syv undersøgelsesprioriteter og fem kædeled; alle 196 filer/4.652 kombinationer/505.834 fragmenter kontrolleret |
| 3. Terræn/jord | Integrér offentligt tilgængelig topjord, underjord og terrænkontekst med tydelig kildeversion/skala | JB 2024 og terrænskygge 2005–2007/10 m offentligt leveret og live browserkontrolleret |
| 4. Søgeforhold nu | Nypløjet, bar og regnvasket jord | Udgået efter ejerordre |
| 5. Dybdekontekst | Udbyg de to udvalgte profiler med landsdækkende boringsadgang og observerede intervaller, ikke ravfund eller extentbuffer | Offentlig WFS/profillinks og 16 kildebundne punkter/126 rækker integreret; seks mangler geologi, to rækker mangler grænse |
| 6. Publicering/mobil | Integrér datasikkert på aktuel main, følg exact-head CI/release/deploy; verificér internetvisning og tilgængelig mobilflade | PR #521/#523 og uafhængigt afstemt exact-head CI PASS; main cf65a5fd; kode-only attempt 3 og offentlig Chrome/luftfoto/390 px DA/DE/EN PASS; fysisk hardware ikke afprøvet |

Udgangspunkt: `0ddbac65`, geologisk model 0.2.0-prototype, app 4.0.541.
Historisk integrationsbase: `e98dcdd7`, app 4.0.543. Offentlig Jordravrelease 4.0.544 er leveret fra `cf65a5fd`.
Main har nyere produktionsarbejde; ingen ukritisk merge af gammel lokal
appversion. For eksisterende releaseautoritet og gatekrav gælder AGENTS
og aktive beslutninger. Ekstra høj indsats anbefales til forskning,
geodata, systemiske ændringer og slutkontrol.

Jordrav ændrer ikke den faglige RavScore-model, private vejrpayloads,
centrale admin-geometrier eller deres land-/vandpunkter. Historiske
manifest-/kodebundne Jordravrapporter bevares. Nye databehandlinger får
egne bindinger og rapporter. Status opdateres efter konkrete resultater.

Færdiggørelse kræver konkret dokumenteret leverance, relevante tests,
RDKS/Markdown/webhåndbog/changelog og faktisk publiceringsbevis.
Datamangler angives eksplicit som usikkerhed eller uafklaret input;
en empirisk observation erstattes ikke af softwaretests.

## Historisk checkpoint – lokal implementering før main-integration

Nye kilder: SGAV JB2024/WMS, moderne Jupiter WFS med minimale felter og
GEUS/SDFI DHM2007 hillshade via korrekt omprojekteret export. Offentlige
opslag er opt-in, afgrænset, charsetbevidste og kan annulleres. Geologiens
farver/model-0.2-dataset, RavScore, vejr/private data og kystgeometri er
uændrede. Gamle gemte links fungerer; nye links gemmer supplerende lagvalg,
men ikke et opdigtet prøvepunkt eller en uforseglet live boringspost.

Videnskabelige ukendte: ravtilførsel/mængde/bevaring og faktisk pløjeadgang
på en mark. De erstattes ikke af JB-klasser, profilnærhed eller totaldybde.
Forkastet: numeriske bonusser, native UTM-fliser som 3857, boringens
totaldybde som ravdybde og næste HTML-tabel som geologi ved manglende profil.
Observeret MapServer-datoformat er håndteret efter faktisk browserfejl.

Evidens: docs/research/jordrav/national-evidence-chain-2026-10-06.json,
public-context-sources-2026-10-06.json og context-browser-2026-10-06.json.
Luftfoto og mobilprofil-screenshots er visuelt læst. Målkontrakter består.
Næste: saml docs/checkpoint, commit lokal kandidat, integrér nyere main,
byg reel releaseversion, kør kildegate/relevante regressionskontroller,
PR/exact-head CI, sikker merge, DEC-0148-deploy og internetkontrol.
Ekstra høj indsats/Sol anbefales fortsat til integrations- og slutfasen.

## Historisk checkpoint – releasekandidat 4.0.544

Nyere main e98dcdd7 er integreret via cc96b7d3. En særskilt diff og
release-isolationsaudit viser, at de to kystgeodata kun får nyt topversionsfelt,
og at 198 eksisterende main-filer er bevaret bortset fra release-/cachemarkører.
Ingen ekstern vejrhentning eller central adminhydrering er udført lokalt.

Alle 99 faktiske Chrome-checks består på kandidaten: 20 nationale,
8 søge-/marklag, 15 gemte visninger, 13 lagadgang, 34 landskabsforløb og
9 nye kontekstkontroller. Den ældre forventning om identisk kliksteds-JB
efter linkgendannelse er rettet til den autoriserede kontrakt: et gemt område
genskaber geologien, men opfinder ikke et jordbundsprøvepunkt. Intet
produktproblem skjules ved at tillade et erstatningspunkt.

50 målrettede tests, kildegate/118 browserfiler, RDKS/sikkerhed,
428 håndbogskapitler, beskyttet håndbogsfletning, 68 Pages-moduler og
versionslukning består. Webhåndbogens 90.1 er indarbejdet; tre manglende
læsehjælpsafsnit, heraf to på den integrerede main, er færdiggjort.
Kvittering: docs/research/jordrav/release-preflight-2026-10-06.json.

Næste er commit/PR, fuld validate:source én gang på PR'ens eksakte head,
sikker merge uden aktiv produktionshentning, DEC-0148 kode-only levering
og offentlig browserkontrol. Alle empiriske ukendte og punkt 4's udeladelse
bevares. Lokale PASS er stadig ikke produktionsevidens.

## Historisk checkpoint – første leveringsfejl og afgrænset rettelse

Fuld exact-head CI 37427232399 bestod på 5706da00. Kildebevisets SHA-256
blev uafhængigt afstemt; merge 3a96de76 har præcis samme træindhold.
Kode-only kørsel 37428389866 bestod kildegenbrug, gemt runtime og prebuild,
men stoppede i privacykontrollen før offentlig levering. Den afviste
longitude/latitude i de 16 kontrollerede offentlige Jupiter-profiler.

Den efterfølgende rettelse er kun i artifactauditor og tests. Profilfilens
præcise placering, 19.372 bytes og eksisterende SHA-256 kræves, før netop
de to direkte koordinatblade godkendes. Hele den rekursive privacyaudit
fortsætter. Målprøver accepterer den uændrede kildefil og afviser ændrede
koordinater, kopi ved anden sti og privat tilføjelse. Øvrige privacy-
angrebsprøver, code-only runtime og tracked-privacy består. Ingen
produktbytes, geodata, RavScore eller providerforløb ændres.

Næste: ny PR/exact-head CI, sikker merge, kode-only retry og faktisk
internetkontrol. Ingen gate må omgås. Analyse og publiceringskvittering:
docs/research/JORDRAV_PUBLIC_PROFILE_PRIVACY_2026-10-06.md og
docs/research/jordrav/publication-evidence-4.0.544.json.
