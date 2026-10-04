# Jordrav: tidligere kystmarker og sammenlignelige områder i Danmark

> Historisk kortstatus: denne rapport blev udført med model 0.1.
> Nationale farver og klasseregler er siden revideret i
> [model 0.2](JORDRAV_NATIONAL_MODEL_0_2.md). Rapportens kildeobservationer
> bevares; udsagn om frosne regler, guide-only levering og åbne nationale
> farveændringer er supersederet. Gamle regelbundne audits reproduceres
> fra commit eee7b08e.

**Status:** afsluttet, afgrænset forskningsanalyse på den lokale 0.1.0-prototype.
**Dato:** 2026-10-04. Appversion 4.0.541. Ingen ny modelbygning eller offentlig release.

## Hovedresultat og ejerens præcisering

Asaa–Voerså var ejerens eksempel på en mangel i analysen, ikke en bestilling
på en lokal særregel. Ejerens oplysning om markrav mellem forbindelsesvej
og strand er derfor brugt som kontrolcase for en bredere genovervejelse.
Den [lokale diagnose](JORDRAV_ASAA_VOERSAA_2026-10-04.md) viser en tidligere
kystflade med overvejende marint sand og dyrkede marker, som den nuværende
model alene placerer i sin generelle klasse. Vi har herefter undersøgt
fem andre egnes native jordarter, landskabsformer og offentlige markdata
samt gennemført en national diagnose af fem marine landskabstyper.

**Konklusion:** Lignende områder kan have en plausibel jordravhistorie,
og de skal undersøges også uden tidligere dokumenterede fund. Hals–Hou
og Jerup–Ålbæk giver de nærmeste sammenligninger med dyrket kystsand.
Lammefjord, Rødbyfjord og Hjardemål giver andre relevante modtagere og
kontrolcases. Deres forskelle viser samtidig, hvorfor tidligere havbund,
marint sand eller dyrkning ikke kan være en ensartet national ravbonus.

Problemet er systematisk i reglerne: strandvolde med marint sand/grus
kan blive orange, mens marine flader og tørlagt forland som udgangspunkt
ender i den generelle klasse. Den klasse afspejler en bred regelrest,
**ikke forskningsdybde, en negativ ravvurdering eller en færdig rangliste**.
Det er ikke påvist, at alle disse arealer er gode ravsteder; det er påvist,
at den orange udpegning ikke kan bruges som en komplet prioritering af
tidligere kystmarker. Asaa-erfaringen gør denne begrænsning konkret.

Kortet har nu 11 regionale vejledninger, herunder disse fem nye cases og
Asaa–Voerså. De forklarer muligheder og modargumenter og flytter kortet til
egnen. De ændrer ingen polygonklasse. Den generelle grønne flade er fjernet
fra potentialevisningen; underliggende geologi kan stadig klikkes.

## National kontrol af den nuværende regel

Alle **199.653** poster i det nyere jordartskort er sammenholdt med **2.341**
native landskabspolygoner for Marin flade, Strandvold, Tørlagt marint
forland, Hævet senglacial flade og Hævet senglacial strandvold. De giver
26.526 positive kildeskæringer. Arealerne er egne skæringer i EPSG:25832
fra tidligere originalkontrolleret centimeternormalisering; ingen nye
buffere, ravfundsinput eller afstandsbonus indgår.

| Landskabsform | Generel klasse, km² | Forhøjet procesklasse, km² | Hvad det viser |
|---|---:|---:|---|
| Marin flade | 2.321,705 | 0 | En stor gruppe marine modtagere får ingen særskilt positiv udpegning |
| Tørlagt marint forland | 253,677 | 0 | Landvinding alene udløser ingen særskilt udpegning |
| Hævet senglacial flade | 751,694 | 0 | Ældre havlag bliver heller ikke særskilt prioriteret |
| Strandvold | 109,164 | 183,790 | Materiale og dække giver forskellige klasser inden for samme landskabsform |
| Hævet senglacial strandvold | 6,454 | 36,690 | Reglernes strandvoldskæde er den fremhævede marine mulighed |

Samlet fælles nyere-jordartsdækning af disse fem typer er **3.957,025 km²**.
Der findes desuden begrænsede og uafklarede klasser, som ikke er udeladt af
auditten. De fem landskabsformers egen union er 4.044,041 km²; 87,016 km²
mangler nyere jordartsdækning. Denne diagnose bruger ikke det ældre
supplement, selv om det fortsat indgår i selve prototypens Danmarkskort.
Tallene er hverken Danmarks landareal, markareal, jagtbart areal eller
areal med rav. De beskriver denne kilde- og regelkontrol.

I Marin flade alene ligger **1.347,883 km²** af modellens marine sand-/
grusgruppe og **402,743 km²** af den finere marine gruppe i generel klasse.
Det første tal viser, at manglen ikke skyldes fravær af kortlagt kystsand.
Det andet viser, at en efterfølger også må vurdere finere modtagere frem
for kun at kopiere sandreglen. Gruppenes sum minus deres union er
0,062 m² ved en 1 m² numerisk kontrolgrænse; denne tolerance er ikke
kortenes geografiske nøjagtighed.

## Fem sammenligninger med faktisk markkontekst

Undersøgelsesrammerne er eksplicit valgte rektangler, ikke fundgrænser,
hele kommuner eller præcise bælter mellem vej og strand. De kan rumme hav
og andre landskabstyper. Samme rammer bruges i beregninger og kortguide.
Alle regionale kildeskæringer og hele materialefordelingen er bevaret.

Marker 2026 er hentet med kun geometri, afgrødekode og afgrødenavn samt
WFS' tekniske ID. Svarene er komplette og arkiveret med deres charset og
rå SHA-256. En mark kan deles i flere poster; arealer er opløste unioner,
ikke summer af overlappende poster. Et fast udvalg af 20 afgrødekoder fra
den tidligere Stenstrup-analyse giver dyrkningskontekst. Udvalget dækker
ikke alle marker og dokumenterer ikke en bestemt bearbejdningsmetode.

| Undersøgelsesramme | Registreret markunion, km² | Udvalgte dyrkningsafgrøder, km² | Heraf de fem marine landskabsformer, km² |
|---|---:|---:|---:|
| Hals–Hou | 82,462 | 40,521 | 36,172 |
| Jerup–Ålbæk | 23,846 | 3,928 | 2,940 |
| Lammefjord | 68,432 | 45,775 | 22,629 |
| Rødbyfjord | 112,222 | 77,512 | 15,608 |
| Hjardemål | 53,904 | 24,748 | 8,296 |

Disse arealer er **ikke en rangliste over ravchancer**. Store rammer og
meget landbrug giver større tal uden at øge en enkelt marks mulighed.
Årsafgrøde viser heller ikke, at jorden er bar, nyligt pløjet eller at et
muligt ravførende lag bliver nået i dag. Dyrkningsudvalgets koder er
1, 3, 4, 5, 7, 10, 11, 13, 14, 15, 22, 30, 31, 152, 161, 210, 214, 216,
434 og 450; de er gengivet for at gøre udvalget efterprøveligt.

### Hals–Hou — JH-021

På udvalgte dyrkningsarealer findes **18,806 km² HS/HS på Marin flade**,
**7,344 km² YS/YS på Hævet senglacial flade** og **4,484 km² HP/HP på
Marin flade**. Alle tre par får den generelle klasse. Der findes også
forhøjede strandvoldspar, eksempelvis 0,698 km² HS/HS på hævet senglacial
strandvold. Det er altså et blandet landskab, ikke en homogen sandflade.

Jørgensen skelner mellem Vendsyssels ældre hævede havflader og yngre
Littorinaflader, herunder den østlige flade omkring Hals. Flyvesand kan
sløre fladerne. Den historiske publikation støtter forskellen mellem
havstadier, men dens datidige dateringer bruges ikke som en nutidig
kalibrering eller lokal dybdeangivelse.
[Jørgensen 1971, s. 119](https://2dgf.dk/xpdf/bull21-02-03-117-129.pdf).

**Mulighed:** Tidligere kystsand på dyrket land kan have bevaret tilført
eller omlejret rav. Gamle kystkontakter og sedimentstrukturer er et mere
begrundet undersøgelsesspor end dagens kystafstand. **Modargument:**
Ravtilførsel er endnu ikke lokalt underbygget, og senglaciale lag, tørv
og sanddække kan have andre positioner i forhold til det bearbejdede lag.

### Jerup–Ålbæk — JH-022

Dyrkningsudvalget rummer **1,735 km² HS/HS på Marin flade** i generel
klasse, **0,610 km² FT/FT på Strandvold** i generel klasse og
**0,367 km² HS/HS på Strandvold** i forhøjet klasse. Tørv og flyvesand
er udbredt i rammen. Orange strandvolde beskriver dermed kun en del af
de mulige modtagere; det organiske dække må undersøges gennem sin egen
laghistorie frem for at få sandets klasse.

Naturstyrelsen beskriver et tidligere marint rimme-doppe-miljø ved
Jerup Hede/Råbjerg Mose med sandrygge og senere tørv i lavninger.
Kragskovhedeprojektet skal ændre dræning og dyrkning. Projektbeskrivelsen
fastlægger ikke hele egnens aktuelle marktilstand; den har også forskellige
arealtal, som derfor ikke bruges i vores beregninger.
[Naturstyrelsen, Kragskovhede](https://naturstyrelsen.dk/ny-natur/lavbundsprojekter/kragskovhede-lavbundsprojekt-realisering).

**Mulighed:** Tidligere kystaflejringer og overgange mellem sandryg og
lavning kan have forskellige bevarings- og omlejringsforløb. **Modargument:**
Tørv, flyvesand, vegetation og ændret vandstand kan afskære lagadgang.
Et tidligere dyrket areal må ikke automatisk kaldes jagtbart i dag.

### Lammefjord — JH-023

På udvalgte dyrkningsarealer i tørlagt forland findes **9,819 km² HS/HS**,
**8,569 km² HL/HL** og **1,848 km² HI/HI**, alle i generel klasse.
Det giver både sandede og finere modtagere. En strandvoldsregel alene
kan ikke beskrive denne fjordbund.

Bennike m.fl. dokumenterer flere laggenerationer: ældre sø-/moselag
under marine lag og store lokale forskelle mellem bassin og rand.
Figur 2 viser dybe lag i konkrete kerner; figur 3 viser en varieret
randprofil. En kerne eller dybde må ikke overføres til alle marker.
[Bennike, Jakobsen & Hansen 2020, s. 1–5](https://geusbulletin.org/index.php/geusb/article/view/4630).

**Mulighed:** En fjord kan have modtaget let materiale, som senere blev
bevaret på tørlagt og bearbejdet land. Finere sedimenter udelukker ikke
tynde relevante lag eller indblandet rav. **Modargument:** Fjordbund er
ikke identisk med strandopskyl. Tykkelse, tilførsel, bevaring og det
faktisk bearbejdede materiale må afklares hver for sig. De dybere
sø-/moselag er et særskilt geologisk spor, ikke en praktisk markudpegning.

### Rødbyfjord — JH-024

Det største dyrkningspar inden for tørlagt marint forland er **9,444 km²
ML/ML**, altså moræneler. HS/HS fylder 2,443 km² og HL/HL 1,531 km².
Der findes også organiske/ferskvandspar og HS/ML-par uden kendt
dæklagstykkelse. Landskabsnavnet alene beskriver således ikke materialet.
Kilderne er de faktiske [GEUS-jordarter](https://doi.org/10.22008/FK2/SQI9ZB)
og [geomorfologiske polygoner](https://doi.org/10.22008/FK2/0U6ERA).

**Mulighed:** Lokale marine modtagere på dyrket land er et relevant
undersøgelsesspor også i et sydligt inddæmmet område. **Modargument:**
Hele forlandet må ikke behandles som sammenhængende havsand. Moræne og
ferskvandsaflejringer skal vurderes gennem deres egne mulige transport-
og omlejringskæder. Kortkombinationen beviser ikke et bestemt historisk
havforløb eller at morænen er uden ravmuligheder.

### Hjardemål — JH-025

Dyrkningsudvalget omfatter **3,868 km² HS/HS på Marin flade**,
**0,619 km² ES/ES på Marin flade** og **0,572 km² FT/HS på Marin flade**,
alle i generel klasse. Den større ramme domineres flere steder af
flyvesand, klitter og kalkknuder, ikke af én marine aflejring.

En indledende sammenligningsidé om en samlet senglacial flade blev
**afvist af de faktiske kildedata**. GEUS beskriver yngre marine flader,
gamle kystkontakter omkring Hjardemål og varierende flyvesandsdække.
Det understøtter, at kronologi og dække skal undersøges lokalt.
[GEUS 2024/28, s. 52, 55–56](https://data.geus.dk/pure-pdf/GEUS-R_2024-28_web.pdf).

**Mulighed:** Marine sand-/lerkontakter på dyrkede flader mellem tidligere
øer og yngre sanddække kan være modtagere. **Modargument:** Kalk,
flyvesand og tørv giver forskellige lagforbindelser. Marint materiale
under et ukendt dække bliver ikke automatisk dybt eller pløjetilgængeligt.

## En bedre generel ræsonneringsmodel

Asaa skal generaliseres gennem **processen**, ikke stednavnet. Den
relevante kæde er muligt ravmateriale → tilførsel/omlejring → konkret
modtager → bevaring/landdannelse → senere lagkontakt → blotlægning.
Pløjning kan blotlægge materiale i det bearbejdede lag, mens efterfølgende
regn kan vaske jord af fremvendte stykker. Regn erstatter ikke manglende
lagadgang og tilføjer ikke rav til marken.

| Led | Hvad der kan begrunde en mulighed | Hvad der kan svække eller ændre den |
|---|---|---|
| Tilførsel | Tidligere kystkontakt eller en plausibel omlejringsvej fra ældre sedimenter | Ukendt fødesediment; afbrudt forbindelse; anderledes transportstadium |
| Modtager/sortering | Gamle strandzoner, marine flader, opskyl, fjordrande eller finere/organiske modtagere | Landskabskode alene; kornstørrelse alene; manglende relevant aflejringsforløb |
| Bevaring og senere ændring | Landdannelse, inddæmning eller senere omlejring med bevaret materiale | Erosion, nyt dække eller blanding; et navn fastlægger ikke kronologien |
| Kontakt til bearbejdet lag | Lokale profiler eller konkrete observationer af, hvad der bringes frem | GEUS-symbol omkring én meter eller årsafgrøde alene |
| Synlighed nu | Faktisk bar jord, jordbearbejdning og afvaskning | Afgrøde, vegetation, vådlægning eller et lag under bearbejdningsdybden |

Tilførsel og koncentration er åbne hypoteser i de fem nye cases. Fravær
af kendte fund er ikke et modargument i sig selv. Ejerens Asaa-erfaring
støtter lokal praktisk lagadgang, men er ikke en præcis fundpolygon eller
en verificering af alle marker i bæltet. En generel mulighed kan således
være positivt begrundet uden fund, samtidig med at dens jagtbarhed er
uafklaret. Dybe registrerede intervaller kan vises særskilt lilla som
ikke umiddelbart jagtbare; ukendt tykkelse får ikke samme mærkat.

Ved næste modelbygning skal denne kæde supplere det snævre strandvoldskrav
og også efterprøves mod Stenstrups sø-/bassinmiljø. Den må ikke erstattes
af en automatisk opgradering af alle marine flader. En efterfølger skal
beskrive præcis, hvilke led der giver særskilt regional støtte, og hvor
lagposition eller tilførsel stadig er uafklaret. Arealstørrelse, en grønt
farvet baggrund og tidligere fund må ikke fungere som skjulte adgangskrav.

## Kort, status og gentagelighed

**Udført:** Den overflødige grønne baggrund er fjernet. Generel geologi
er ufarvet, klikbar og forklaret som ingen særskilt udpegning. Kortguide
har 11 cases på DA/DE/EN, almindeligt kort/luftfoto bevares, og jagtbarhed
vises særskilt. **Åbent:** en ny national regionalprioritering og
verificeret lagadgang på de enkelte marker. Orange er fortsat prototypens
snævre proceshypotese; hverken ufarvet eller orange er en fuld ravdom.

[Native producent](jordrav/audit_marine_comparisons.py),
[regionrammer](jordrav/marine-comparison-regions-2026-10-04.json) og
[audit](jordrav/marine-comparison-audit-2026-10-04.json) binder originale
SHP/DBF, native-cache, frosne regler, model, manifest, fælles hjælpere og
minimale markkilder. Større GEUS-originaler er eksterne SHA-bundne
forudsætninger. Regionernes markkilder er arkiveret lokalt; genetagelse
kræver ikke nye WFS-svar. Regionernes dækningshuller kan omfatte hav og
skal ikke uden videre læses som manglende landkortlægning.

[Uafhængig originalkontrol](jordrav/verify_marine_comparisons.py) og
[resultat](jordrav/marine-comparison-original-verification-2026-10-04.json)
læser originale koordinater og efterprøver de 15 største marine
dyrkningspar samt alle fem markunioner. 1.881 jordartsposter og 233
landskabsposter er læst. Største parforskel er 7,835 m², under den
fastlagte 50 m² numeriske grænse; største markunionforskel er 0,000351 m²
ved 1 m² grænse. Ti ugyldige originalringe håndteres kun i hukommelsen.
Dette er ingen ændring af originalfilerne, ingen geografisk
nøjagtighedspåstand, ingen uafhængig gentagelse af hele den nationale
optælling og ingen verificering af ravindhold.

[Litteraturidentiteter](jordrav/marine-comparison-literature-2026-10-04.json)
angiver de visuelt læste PDF-sider, kildebegrænsninger og hentede filers
SHA-256. Alle seks Lammefjordsider samt de relevante Vendsyssel-/Thysider
er læst visuelt. Den nye Asaa-figur er et selvstændigt forskningskort;
markgeometri er endnu ikke tilføjet den interaktive potentialevisning.

Endelig lokal UI-/data-/model-/sourcekontrol og samtaledelta registreres i
[RDKS-checkpointet](../rdks/30_RESEARCH/JORDRAV-KORT-2026-10-04.md).
JORDRAV-001, -007 og -009 forbliver åbne for den faglige model og lagadgang.
Der er ingen ny app-/modelversion, frisk vejrindsamling, push, merge eller deploy.
