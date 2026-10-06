# Jordrav: national undersøgelsesprioritet, jordbund, terræn og profiler

Dato: 6. oktober 2026. Implementeret og lokalt kontrolleret; publicering
og samlet releasekontrol følger i det autonome arbejdsforløb.

Ejerens seneste ordre udelader automatisk registrering af dagens nypløjede,
bare eller regnvaskede marker. Dette punkt er hverken udviklet eller en
forudsætning for færdiggørelsen. Almindeligt kort og luftfoto bevares.

## Resultatet og dets faglige betydning

Hele det eksisterende nationale materiale-/landskabsgrundlag har nu en
eksplicit undersøgelsesprioritet og en kæde med ravtilførsel, transport,
modtagelse, mulig bevaring og overfladeadgang. Kortet kan suppleres med
publicerede JB-jordklasser 2024, terrænskygge og offentlige boringspunkter
overalt i tjenesternes danske dækning. Der er desuden 16 kontrollerede,
geografisk spredte profilregistreringer med de originale sedimentintervaller.

Disse forbedringer forbinder geologi med konkrete steder og målinger,
uden at omdøbe sand, tørv, en boring eller en markregistrering til rav.
Tilførsel til en bestemt kortflade og adgang i markens bearbejdede lag
kan fortsat være ukendte. Det er en empirisk begrænsning, som kortet skal
vise; mere præcis software kan ikke måle denne forbindelse på afstand.

## Fra generel farve til næste relevante undersøgelse

Reglerne anvendes på alle 4.652 eksisterende katalogkombinationer. Der
indgår ingen regionliste, tidligere fundkrav, kystafstand, højdegrænse,
numerisk ravbonus eller ændring af model 0.2's farver.

| Første undersøgelse | Hvilket grundlag udløser den? | Hvad skal afklares? |
|---|---|---|
| Afklar input | Uafklaret materiale eller konflikt | Bedre materialegrundlag før en positiv eller negativ slutning |
| Afklar kortskala | Ældre 1:200.000-supplement, når input er vurderbart | Detaljeret kort eller lokal profil før markvalg |
| Undersøg løst dække | Kortlagt fast bjergart | Eventuelle yngre sedimentlommer, som kortet kan have udeladt |
| Mål dæklag | Organisk materiale eller flyvesand øverst | Dækkets tykkelse, egen sedimenthistorie og underliggende lag |
| Spor tilførsel | Vurderbar generel geologi uden særskilt procesudpegning | En plausibel lokal sedimentkæde og modtager |
| Undersøg modtagerprofil | Finere, organiske eller vekslende øvre lag i en særskilt mulighed | Lagfølge og modtagelse uden et krav om sand |
| Forbind til overfladen | Øvrige særskilte muligheder | Forbindelsen fra kortlagt aflejring til blotlagt/bearbejdet jord |

Rækkefølgen angiver den manglende oplysning, der mest direkte hæmmer
undersøgelsen. Den er **ikke en rangordning af ravmængde eller fundchance**.
Alle forløb fortsætter med lokal profil og regional tilførsels-/omlejringshistorie.
Forskellige nærliggende lag får ingen transportretning eller fælles alder
alene af deres nærhed. En yngre øvre aflejring på en ældre hævet form
behandles som flere mulige historiske led, ikke én dateret ravaflejring.

Denne sondring bygger videre på de tidligere originalkontrollerede
[nationale procesregler](JORDRAV_NATIONAL_MODEL_0_2.md),
[transportanalysen](JORDRAV_TRANSPORT_PLOEJELAG_2026-10-04.md),
[lagadgangen](JORDRAV_LAGADGANG_2026-10-05.md) og
[landskabshistorien](JORDRAV_LANDSKABSFORM_LAGHISTORIE_2026-10-05.md).
Ravspecifik støtte til marine omlejringsforløb kommer bl.a. fra
[Bennike & Jensen 1998, s. 31](https://2dgf.dk/xpdf/bull45-1-27-38.pdf),
mens finere modtagere og ravpindelag behandles i
[Hartz 1909](https://archive.org/details/bidragtildanmark00hart) og
[Pedersen 2005, s. 46–48](https://www.geus.dk/media/13810/nr8_p001-192.pdf).
Disse mekanismer overføres som egne undersøgelseshypoteser, aldrig som
en lokal dokumentation af ravindhold.

## JB-jordbund: konkret kliksted, bevaret usikkerhed

SGAV's offentlige lag `Jordbunds_og_terraenforhold:Jordbundskort_2024`
er verificeret som WMS med JSON-opslag og browseradgang. Rasterlaget er
valgfrit og vises med svage farver under geologien. Dets palette er
jordklassernes egen, ikke ravpotentialets. Geologi kan skjules for at se
jordbundsfarverne tydeligt.

Et jordbundsopslag foretages kun efter en særskilt knap på et konkret
geologiklik. Den viste koordinat er selve klikstedet. En flades centrum,
dens omsluttende rektangel eller en gemt flade bruges aldrig som en
opfundet prøveposition. Ved genåbning af en gemt flade skal brugeren klikke
igen for et nyt punkt. Flere returnerede klasser bevares som tvetydighed;
et tomt svar bliver datamangel, ikke negativ ravviden.

Der spørges alene efter `JB_kode` og `Jordtype`. Kortet efterspørger ikke
ejer, CVR, afgrøde, marknummer eller GPS. WMS 1.1.1 med EPSG:4326 holder
akseordenen længde/bredde eksplicit. Den lille forespørgselsflade gør ikke
kildens modellering eller grænser centimeterpræcise. Kildens ISO-8859-1
behandles udtrykkeligt, frem for at antage UTF-8 for alle JSON-svar.

JB er en publiceret jordklasse. AU's oprindelige 2024-arbejde bruger
tekstur, kalk og organisk kulstof i topjorden; dybere teksturintervaller
har en anden rolle. Revisionen deler JB4 i 41/42, og administrativ
behandling kan omsætte 42 til JB6. Derfor beviser en publiceret JB6-flade
ikke entydigt en målt leret topjord, og den bliver ikke til en sikker
geologisk konflikt med et sandlag. Begravet tørv kan heller ikke afvises
ud fra topjordens kulstof alene. Se de originalkontrollerede metoder i
[Stenstrup-analysen](JORDRAV_MARKKONTEKST_STENSTRUP_2026-10-04.md),
[AU's jordklassificering](https://dca.au.dk/forskning/den-danske-jordklassificering/)
og [majrevisionen 2024](https://pure.au.dk/ws/files/378595646/Revidering_jordbundstypekort_1705_2024.pdf).

## Terræn: eksisterende former, korrekt årgang og projektion

GEUS' offentlige ArcGIS-tjeneste `DHM_2007_hillshading` er kontrolleret.
Metadata beskriver laserscanning fra **2005–2007**, oprindeligt 0,4 m og
i dette produkt nedskaleret til **10 m**. Rettighedshaver er SDFI; tjenesten
og styling kommer fra GEUS. Kortet mærker laget med årgang og opløsning.

Laget giver mulighed for at undersøge dale, bassinrande, skrænter og
strandvoldsformer. Skyggen viser terrænform, ikke observeret transport,
sedimentkontakt, dagens erosion eller blotlægning. Den har ingen automatisk
ravvægt og kan ikke fastslå pløjedybde eller ravmængde.

Kildens native cache er EPSG:25832 og bruger en anden fliseinddeling end
kortets Web Mercator. Native flisenumre genbruges derfor ikke som 3857.
Den offentlige export-funktion omprojekterer hvert afgrænset kortudsnit;
både bboxSR og imageSR er 3857. Faktiske billedsvar er afprøvet i Chrome.
[Original tjenestemetadata](https://data.geus.dk/arcgis/rest/services/Denmark/DHM_2007_hillshading/MapServer?f=pjson).

## Boringer og registrerede dybder

Den fungerende offentlige Jupiter-tjeneste ligger nu under
`jupiter.geus.dk/geusmap/ows/4326.jsp`; en ældre WFS-adresse gav 404 og er
ikke lagt ind som skjult fallback. Officiel beskrivelse findes hos
[GEUS](https://www.geus.dk/produkter-ydelser-og-faciliteter/data-og-kort/national-boringsdatabase-jupiter/webservices-for-udviklere).

Et opt-in lag henter højst 201 registreringer i et begrænset lokalt
udsnit og viser højst 200. Når grænsen nås, fortæller kortet, at udvalget
er ufuldstændigt. Punkterne er hule lilla cirkler og adskilles fra de
hidtidige fyldte lilla dybe sedimenteksempler. Der hentes kun punktgeometri,
DGU-nummer, registreret totaldybde og dato. MapServers faktiske datoformat
`yyyy/mm/dd 00:00:00` er verificeret og vises som kalenderdato.

**Totaldybde er ikke dybden til en ravførende aflejring.** Hvert punkt
åbner en forklaring og link til den originale profil. Kildens profilside
har ikke browser-CORS; kortet omgår ikke dette med en udokumenteret proxy.
De 16 særskilt kontrollerede profiler er derfor et lille, kildebundet
lokalt observationsdatasæt, mens øvrige profiler læses hos GEUS.

De kontrollerede punkter ligger ved Asaa, Jerup, Thy, Skive, Varde,
Aabenraa, Stenstrup, Nordfyn, Langeland, Lammefjord, Allerød, Sorø,
Rødby, Falster, Møn og Bornholm. Udvalget er den nærmeste returnerede boring
i hvert lille forespørgselsvindue, uafhængigt af rav og lithologi. Ved et
begrænset svar er den ikke nødvendigvis den nærmeste af alle boringer.
Det er en kontrol af tjeneste og profiler, ikke en repræsentativ stikprøve
af dansk geologi eller rav. Den direkte lagadgang er nu landsdækkende via
tjenesten; de 16 observationer opfinder ingen landsdækkende dybdemodel.

Ti profiler har geologiske registreringer og seks mangler geologi.
Der er 126 registrerede rækker; to har en manglende intervalgrænse.
Geologi-parseren adskiller tabellen fra forerør, indtag og grundvandsdata.
Hvis geologi mangler, genbruges den næste tabel ikke som lagoplysning.
Jupiters oprindelige danske materialebeskrivelser og egne koder bevares.
Overfladekortets kodesystem bruges ikke på borekoderne.

Dybder er meter under boringens terræn ved registreringen. En positiv
topdybde får lilla dybdecelle med forklaring: laget begyndte under terræn,
men farven fastlægger hverken ravindhold eller jordbearbejdningens rækkevidde.
Et dybt lag kræver selvstændig blotlægning for at være jagtbart. En gammel
profil er heller ikke bevis for nutidig adgang eller dybden på nabomarken.

## National og teknisk kontrol

[Den nationale kvittering](jordrav/national-evidence-chain-2026-10-06.json)
kontrollerer alle 196 SHA-bundne filer, 192 udsnit, 4.652 kombinationer og
505.834 detailfragmenter. Fragmenter er ikke marker, fund, arealer eller
fundprocenter. Model-0.2-data, farveklasser og geometri er uændrede.

[Kildekvitteringen](jordrav/public-context-sources-2026-10-06.json) binder
de 16 opslag til URL, tid, charset, byteantal, SHA og de bevarede geologiske
oplysninger. Profilens eget offentliggjorte punkt er afstemt mod WFS.
Original profil-HTML bliver i temp; irrelevante offentlige person-/ejerfelter
bliver ikke del af produktet eller rapporten. Produktets profil-JSON har
egen byte-/SHA-binding, adskilt fra den historiske nationale model.

Browserkontrollen omfatter faktiske klik, levende tjenester, luftfotofliser,
alle 16 profilmarkører, gemte lagvalg, fejltilstande, dansk/tysk/engelsk og
390 px mobilvisning. Det er browseremulation, ikke en fysisk telefonprøve.
Der er ingen afhængighed af DMI, RavScore, Supabase eller private vejrdata.
Offentlige opslag har timeout, bytegrænse, eksplicit datamangel og annullering
ved nyt udsnit. Fladernes faktiske jagtbarhed bliver ikke automatisk positiv.

## Erstattet, forkastet og fortsat ukendt

- Ren lokal-only levering er erstattet som mandat af sikker publicering.
- To udvalgte dybe eksempler alene er suppleret af landsdækkende
  boringsadgang og 16 kontrollerede profilregistreringer.
- Automatisk registrering af dagens søgeforhold er udgået efter ejerordre.
- JB-farvebonus, totaldybde som ravlagsdybde, native UTM-fliser som Web
  Mercator og et automatisk prøvepunkt for gemte flader er forkastet.
- Tilførsel, lokale ravmængder, bevaring, nabomarkens lagdybder og forbindelse
  til jordbearbejdningen forbliver empiriske ukendte; de vises som sådanne.
- CI, deployment og internetkontrol er næste leverancefase og dokumenteres
  særskilt på den reelle releaseversion og commit.
