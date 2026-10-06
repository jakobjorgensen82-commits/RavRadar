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
| 1. Lagadgang | Forbind kortlagt materiale med topjord og lokale offentlige lagprofiler; adskil direkte observationspunkt og områdefortolkning | Lokalt implementeret: faktisk klikpunkt, JB og registrerede profiler; empirisk forbindelse til nabomark/pløjelag bliver ikke opfundet |
| 2. Prioritering | Skærp national udpegning via konkrete kilde-/transport-/modtagerforløb og dokumentér usikkerhed uden fundkrav | Syv undersøgelsesprioriteter og fem kædeled; alle 196 filer/4.652 kombinationer/505.834 fragmenter kontrolleret |
| 3. Terræn/jord | Integrér offentligt tilgængelig topjord, underjord og terrænkontekst med tydelig kildeversion/skala | JB 2024 og terrænskygge 2005–2007/10 m integreret og live browserkontrolleret |
| 4. Søgeforhold nu | Nypløjet, bar og regnvasket jord | Udgået efter ejerordre |
| 5. Dybdekontekst | Udbyg de to udvalgte profiler med landsdækkende boringsadgang og observerede intervaller, ikke ravfund eller extentbuffer | Offentlig WFS/profillinks og 16 kildebundne punkter/126 rækker integreret; seks mangler geologi, to rækker mangler grænse |
| 6. Publicering/mobil | Integrér datasikkert på aktuel main, følg exact-head CI/release/deploy; verificér internetvisning og tilgængelig mobilflade | Lokale DA/DE/EN- og 390 px-kontroller PASS; nyere main, versionsbygning, CI og deploy udestår |

Udgangspunkt: `0ddbac65`, geologisk model 0.2.0-prototype, app 4.0.541.
Aktuel læst remote main: `e98dcdd7`, app 4.0.543, læst 2026-10-06.
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

## Permanent checkpoint – lokal implementering før main-integration

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
