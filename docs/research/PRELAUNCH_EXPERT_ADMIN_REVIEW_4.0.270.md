# Før-lancering: ekspert, admin og driftsgrundlag – 4.0.270

## Kort resultat

RavRadars centrale drift, private kontolagring og ekspertværktøj er funktionsdygtige. Kontrollen fandt to afgrænsede produktfejl og en tværgående dokumentationsfejl, som 4.0.270 lukker:

- de nationale lister brugte en skjult områdescore, men viste den bedste kyststræknings RavScore, så tallene ikke fulgte rækkefølgen;
- admin viste en falsk fejl for `coastline-overrides` ved første åbning;
- ekspertens arbejdsplan, kodekapitel, scenarier, hypoteseregister og en gammel releasegate kunne læses som aktuel 25/40/35-sandhed.

## Naturlig produktionsdata

Den senest kontrollerede naturlige planlagte kørsel gennemførte publicering og gates. Den publicerede runtime indeholdt 210 zoner og 673 kystdele. De geografisk verificerbare aktuelle zoner havde den forventede sammenhængende vejrhorisont; de 12 kendte steder uden et fælles marint DMI-gitterpunkt var fortsat ærligt markeret. Native strømbeviser lå i tre-timers cadence; ingen skjulte mellemtimer blev opfundet.

Den beskyttede aktuelle feltkontrol omfattede alle 673 kystdele. Lokale DMI-identiteter, godkendte Copernicus-supplementer og de få dokumenterede regionale proxyer var fortsat adskilt og dataminimeret. En frisk DMI-forespørgsel fik HTTP 429, men den kontrollerede DMI-cache bar kørselen igennem uden at ændre kildeorden eller offentlig dækningskontrakt.

## Supabase Free-plan

Den aktive periode stod ved kontrollen på cirka:

- 0,083 af 0,5 GB database;
- 0,257 af 5 GB udgående trafik;
- 115 af 500.000 Edge Function-kald;
- 1 af 50.000 aktive månedsbrugere.

Projektet var sundt uden aktive rådgiverfejl. Den forrige periode overskred udgående trafik og har en tidsbegrænset grace-periode. Den aktuelle takt svarer groft til cirka 4 GB pr. 31 dage, hvis den fortsætter uændret, og skal derfor fortsat overvåges før og efter offentlig lancering.

## Admin og ekspertfunktioner

Den autentificerede adminside indlæste den aktive version, 210/210 zoner, central lagring og den beskyttede håndbog. Ekspertreview er aktivt, og hver håndbogssektion har en reviewformular. Eksperttilladelserne `admin_access`, `handbook_view` og `handbook_review` kan bruges uden at give fuld redigeringsret til vejr, score eller kystdata.

Målrettede tests dækkede blandt andet:

- første adminvisning og rettighedsafvisning;
- central dokumentlæsning og -skrivningskontrakt;
- kortets livscyklus, zoner, kystdele og ejerskab;
- vandstandsstationer, routing, anbefalinger og override;
- handbookvisning, reviewarkiv og almindeligt sprog;
- privat statistik, Supabase REST, kvotekontrol og sitets samlede funktionstest.

Ingen virkelig ekspertkommentar eller persistenstest blev oprettet i produktion under auditen. Det ville skrive central state og kræver en bevidst ejer-/ekspertprøve.

Deploysynkroniseringen havde desuden en databevaringsrisiko: en håndbog, som ejeren allerede havde rettet centralt efter et ekspertreview, kunne blive erstattet af repositoryets standardhåndbog ved næste deploy. 4.0.270 gemmer den officielle kilde som en særskilt baseline og trevejsfletter nye officielle afsnit med centralt ændrede afsnit. En ukendt afvigelse uden baseline stopper sikkert; den overskrives ikke.

Den første produktion efter PR #122, kørsel `32721891349`, ramte præcis denne første-overgangssituation og stoppede før deploy. PR #123 bestod exact-head `32724526697` og blev merged som `00f59456`, men produktion `32724616331` viste, at den slanke Pages-pakke med vilje ikke udgiver håndbogens kildefil. Alle kode-, data- og releasegates var grønne, og deploy stoppede fortsat sikkert.

Første migrering henter derfor den tidligere produktionsverificerede 4.0.269-kilde direkte fra den uforanderlige Git-commit `d745e0ba4ad88dde91c308a9ad9810797f951c91`. Kilden accepteres kun, hvis dens SHA-256 matcher det forrige beskyttede manifest. Dermed kan ekspertændringerne bevares ved første migrering uden at gøre en ukendt eller ændret netfil autoritativ.

## Synlig og fair områdescore

DEC-0049 løser et andet problem end den viste rækkefølge: områder med mange forskelligt vendte kyststrækninger må ikke få flere muligheder for en tilfældig topscore. Den korrektion bevares derfor som den egentlige områdevurdering. Fejlen var, at brugeren så bedste enkeltstræknings RavScore i stedet for det tal, listen brugte.

Toplisterne viser nu den afrundede områdescore. Den er monoton med sorteringen, så højeste viste tal står øverst. Områdets detaljevisning viser fortsat den bedste kyststræknings almindelige RavScore og forklarer dens tre komponenter.

## Håndbog

Det aktuelle fagafsnit beskriver nu entydigt Candidate G:

- 20 % søgeforhold;
- 50 % transport mod kysten;
- 30 % rav i bevægelse;
- 48 timers strømvindue, +10/-8 og udtømt transport fra 13 timers fuld udgående strøm;
- waderskurve med fuld score til 6 m/s og 0 ved 15 m/s;
- mobilisering opbygget over cirka fire timer og aftaget over cirka 48 timer.

Historiske afsnit er mærket som historik. Det aktive kodekapitel følger `ravscore-candidate-g.js`, state-pipelinen og profilomskifteren, mens `score-engine.js` beskrives som rollback. Hypoteseregisteret og scenarierne bruger de samme aktive grænser. Bund, dybde, render, revler, adgang, automatisk stedegnethed og sikkerhedsadvarsler fremstilles ikke som aktive Candidate G-input.

## Resterende før ravradar.dk

1. En ekstern rav-/kystekspert gennemgår den beskyttede håndbog og sender konkrete kommentarer gennem reviewfeltet.
2. `ravradar.dk` og eventuelt `www.ravradar.dk` bindes til GitHub Pages med korrekt DNS, CNAME og HTTPS.
3. Supabase Site URL og tilladte redirect-adresser flyttes i samme deployment til det kanoniske domæne, efterfulgt af et nyt magic-link-login.
4. Den aktuelle Supabase-egress og DMI-rate-limit følges efter rigtig trafik.
5. Fundprognosen forbliver skjult, indtil ture med fund og nul-fund udgør et særskilt besluttet repræsentativt grundlag.

