# Jordrav: national lagadgang og mulige modtagerlag

Den fortsatte analyse forbinder de kortlagte materialer med spørgsmålet:
**Hvilket lag skal faktisk nå den synlige eller bearbejdede jord?** Kortet
har nu en særskilt vejledning for hver flade med både øvre og dybere fysisk
materiale og konkrete undersøgelsestrin. Hele det eksisterende nationale
datagrundlag er behandlet. Faktisk blotlægning og bearbejdningsdybde er
fortsat lokale oplysninger, som denne leverance ikke må opfinde.

Lokal videreudvikling fra `ffb4c9d3`, app 4.0.541, geologisk model
0.2.0-prototype. Søgevejledning 0.1.0 bevares; lagadgangsvejledningen
er en selvstændig 0.1.0. Dataset, geologiske regler, geometri, kilde-ID,
farveklasser og RavScore er uændrede. Ingen fælles release eller publicering.

## Hvad primærkilderne faktisk giver

GEUS tager jordartsprøver omkring én meter for at nå under pløjelaget.
To lodret forskellige aflejringer inden for den øverste meter registreres
særskilt, mens materialer samlet med bindestreg ikke har en entydig
indbyrdes lodret placering. Det gentagne symbol er derfor ingen måling af
dagens pløjelag. GEUS beskriver materiale, dannelse og udbredelse;
lagkontakten får ingen præcis centimeterværdi i de anvendte attributter.
[GEUS 2025/32, s. 4, 7, 10 og 13](https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf).

AU's teksturmodeller bruger faste intervaller: 0–30, 30–60, 60–100 og
100–200 cm. JB2024 i 0–30 cm kombinerer tekstur, kalk og kulstof; de dybere
JB-lag bruger tekstur uden samme kulstofgrundlag. Historiske prøver og
modelusikkerhed indgår. Disse produkter kan belyse materialet i et interval,
men intervalgrænsen er ikke en observeret lokal lagkontakt. To sandklasser
kan heller ikke i sig selv fastlægge samme sedimentære oprindelse.
[AU: Opdateret jordbundstypekort, s. 6, 18 og 41](https://pure.au.dk/ws/files/372695357/Opdateret_jordbundstypekort_1903_2024.pdf).

AU's revision viser, at et øvre mineraljordslag kan have tørv i underjorden,
og at tørvedybdekortet kun var beregnet, hvor topjorden havde over 6 %
kulstof. Fravær fra dette produkt udelukker derfor ikke begravet tørv.
JB41/JB42 beskriver en særlig underjordsopdeling; administrativ omsætning
til JB4/JB6 kan ikke bruges som en ren topjords- eller lagdybdemåling.
[AU: Revidering af jordbundstypekort, s. 3](https://pure.au.dk/ws/files/378595646/Revidering_jordbundstypekort_1705_2024.pdf).

Kulstof2022's nye `peat_probability.tif` vedrører kulstof over 6 % i
0–30 cm. Det er hverken ravsandsynlighed, tørvetykkelse eller en måling af
lagadgang. AU dokumenterer ugyldige SOC-værdier i søarealer i nogle tidligere
lag; de nye usikkerhedslag fjerner disse pixels. En senere integration
skal derfor kontrollere både produktversion og gyldigt modeldomæne.
[AU: Usikkerheder i Kulstof2022, s. 4 og 17–18](https://pure.au.dk/ws/portalfiles/portal/417714104/Usikkerheder_i_Kulstof2022-kortet_2911_2024.pdf).

Originale PDF'er blev hentet igen, hashmålt og gengivet med Poppler.
De relevante hele sider er visuelt læst. Originaler og gengivelser ligger
i systemets tempmappe; de indgår ikke som appdata.
[Kilde- og læsekvittering](jordrav/layer-access-literature-2026-10-05.json).
En genkørsel af producenten nulstiller manuel visuel kontrol til pending.

## Landsdækkende resultat

Alle 196 datasetfiler er SHA- og størrelseskontrolleret: manifest, katalog,
regler, overblik og 192 detailudsnit. Alle 4.652 katalogforklaringer og
505.834 detailfragmenter har en lagplan. Tabellens enheder er **forklaringer
og visningsfragmenter**, ikke marker, fund, aflejringers areal eller ravmængde.

| Undersøgelsesforløb | Forklaringer | Detailfragmenter |
|---|---:|---:|
| Uafklaret registrering/lagrelation | 759 | 43.868 |
| Ældre supplement uden lodret beskrivelse | 273 | 31.804 |
| Marin underkode med uafklaret fysisk variation | 65 | 922 |
| Gentaget øvre/dybere symbol | 1.344 | 386.608 |
| Forskellige lag med organisk materiale/flyvesand øverst | 897 | 19.660 |
| Sammensat øvre symbol med organisk materiale/flyvesand | 37 | 70 |
| Andre forskellige øvre/dybere sedimenter | 1.277 | 22.902 |
| **I alt** | **4.652** | **505.834** |

Uafklaret potentiale eller ukendt materiale har forrang, så en kendt dybere
kode ikke løser en ukendt øvre registrering. Ældre supplement har ingen
JSYM1/JSYM2-rekonstruktion. HV-underkodens fysiske variation afklares før
en almindelig lagplan. Derefter behandles gentagne symboler, øvre
organisk/flyvesandsmateriale og øvrige lagkontakter. Samme par kan have
forskellig plan, hvis en anden registreringskonflikt gør fladen uafklaret.
Fordelingen er derfor forskellig fra den tidligere rene symbolrelationsaudit.

10.098 fragmenter har sammensat **dybere** symbol. Dette skal heller ikke
læses som en stak lag. I 873 fragmenter med afklaret forskellig lagrelation
forekommer organisk materiale i den dybere kode uden organisk materiale i
den øvre kode. Eksempler omfatter ES/FT, HS/HP og HL/FT. Det beskriver
registreret materiale, ikke ravindhold eller præcis lagtykkelse.
[Alle lagpar, forløb og kildebundne kontrolfragmenter](jordrav/national-layer-access-2026-10-05.json).

## Hvordan det ændrer undersøgelsen

Et organisk øvre lag kan have sin egen mulige ravhistorie og samtidig
ligge over et andet modtagerlag. Vurderingen må ikke automatisk flytte
interessen ned til sandet. En mulig kæde skal knyttes til hvert relevant
lag: tilførsel, eventuel omlejring, aflejring og forbindelse til overfladen.
Det er en analytisk overførsel fra geologien; ingen ny ravforekomst er målt.

Hvis det interessante materiale allerede ligger fremme, er den lokale
materialeidentitet og tilførselskæde afgørende. Hvis interessen gælder laget
under et andet lag, skal kontakten stedfæstes i dybden og sammenholdes med
faktisk bearbejdning eller blotlægning. En kontakt inden for bearbejdnings-
dybden gør kontakt mulig; den dokumenterer ikke i sig selv opblanding,
ravindhold eller synlige stykker. Er forbindelsen omlejring, skal den
beskrives særskilt. Ens sandtekstur beviser ikke forbindelsen.

En brugbar lokal profil skal have sted, materiale, dybder, dato og
reference til terræn. Historiske boreintervaller kan ikke uden videre
overføres til dagens overflade. Hverken en fast antaget pløjedybde,
JB-intervallets nederste grænse eller en vilkårlig radius omkring en boring
kan erstatte disse oplysninger. Regn kan gøre allerede fremkommet rav
synligt; den åbner ikke et begravet sedimentlag.

## Implementeret kortvejledning

Klikpanelet indeholder nu **Hvordan kan laget nå overfladen?** med fysisk
øvre og dybere materiale, det relevante forløb og to til fire ordnede
undersøgelsestrin. Sammensatte øvre eller dybere symboler får en opgave om
lokale delområder før lagkontakten vurderes. En original kode og dens
fysiske beskrivelse vises sammen. Metodelinket går til GEUS' begrundelse
for prøveintervallet. Dansk, tysk og engelsk er dækket.

Panelets eksisterende øvre/dybere faktafelter bruger også den faktiske
fysiske kodebeskrivelse. Den tidligere brede modelgruppe i disse felter
er erstattet, så en marin underkode ikke præsenteres som et bestemt fint
materiale, og organisk materiale beskrives ens i hele panelet.

Lagadgang forbliver uafklaret på alle materialeflader. Dokumenterede dybe
punkter beholder lilla og deres registrerede dybder. Luftfoto, markomrids,
sporfiltre og præcise gemte fragmentlinks fungerer sammen med vejledningen.
Den tidligere materialevejledning og nationale modelanalyse bevares.

En fremtidig automatisk dybdekobling kræver en verificeret dataleverance
med versions-/kildebinding, gyldigt domæne, usikkerhed, relevante dybder og
lokal materialekorrespondance. Offentlige metode-PDF'er alene leverer ikke
disse rå rasterlag. Ingen sådan integration, konto-opslag, JB-bonus eller
automatisk ændring af jagtbarhed er tilføjet her. Empirisk ravmængde og
dagens jordoverflade er fortsat åbne forhold; national behandling af det
foreliggende kortgrundlag er gennemført.

## Kontrol

Fire nye kontrakttests kontrollerer konfliktforrang, organisk øvre modtager,
vandrette blandinger, forskellige sandaflejringer, underkoder og oversættelse
af samtlige 4.652 forklaringer. Den nationale producent binder sin kode og
vejledningsmodulerne med LF-normaliserede hashes samt dataset-SHA.
13 nye faktiske Chrome-kontroller består, inklusive klik på alle syv
forløb, et registreret ES/FT-par, præcis linkgendannelse, filtre/luftfoto,
390 px, DA/DE/EN og dybt intervalvalg. Desktop- og mobilscreenshots er
visuelt læst. Testens returnering af Leaflet-objektet og danske
ordstillingsassert blev rettet. Den endelige genkørsel består.
[Målrettet browserkontrol](jordrav/layer-access-2026-10-05-browser-audit.json).

De 20 eksisterende kort-, otte materiale-/mark- og 15 planlægningskontroller
består også på den endelige kode: i alt 56 faktiske Chrome-checks.
17 modelcases, fem artifacttests og 4+4+4 kontrakttests består. Sourcegate
med 113 browserfiler, RDKS/sikkerhed, 63 Pages-moduler, versionsimports
og 419 kapitler består. Beskyttet path-status er tom. Pages-kontrollens
child-process krævede en eskaleret genkørsel efter lokal sandbox-EPERM.

Samlet slutkontrol og regressioner dokumenteres i
[valideringskvitteringen](jordrav/layer-access-validation-2026-10-05.json).
De nye hashbundne JSON-rapporter bevares bytepræcist via `.gitattributes`,
så platformsændrede linjeskift ikke bryder den arkiverede evidens.
Historiske audits bevares med deres daværende kodebindinger. Lokal kontrol
er ikke GitHub-CI, fysisk mobilhardware eller produktionsbevis.
