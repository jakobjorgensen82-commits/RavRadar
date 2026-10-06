# Jordrav: jagtbarhed, registreret dybde og blotlægning

> Historisk kortstatus: denne rapport blev udført med model 0.1.
> Nationale farver og klasseregler er siden revideret i
> [model 0.2](JORDRAV_NATIONAL_MODEL_0_2.md). Rapportens kildeobservationer
> bevares; udsagn om frosne regler, guide-only levering og åbne nationale
> farveændringer er supersederet. Gamle regelbundne audits reproduceres
> fra commit eee7b08e.

**Dato:** 2026-10-04. **Status:** implementeret i lokal forskningsprototype. App 4.0.541 og det frosne polygon-/regelgrundlag 0.1.0-prototype består. Ingen offentlig release eller produktionsverifikation.

Ejeren har præciseret målet: Rav skal kunne findes ved overfladen, enten allerede blotlagt eller bragt frem ved eksempelvis pløjning. Det første ønske om at udelade dybe lag blev derefter udtrykkeligt erstattet: De må vises, hvis dybden og manglende umiddelbar jagtbarhed fremgår meget tydeligt. Den seneste beslutning gælder.

## Tre spørgsmål, som skal besvares hver for sig

1. **Tilførsel og bevaring:** Hvorfor kan rav tænkes i materialet? Det er en geologisk hypotese, som kan udvikles uden tidligere ravfund.
2. **Lagets position:** Hvilken dybde, lagkontakt og geografisk forbindelse beskriver kilden faktisk? Materialekode og alder besvarer ikke alene dette.
3. **Praktisk blotlægning:** Er det relevante materiale ved dagens overflade eller inden for den lokale jordbearbejdning? Regn kan forbedre synligheden af fremkommet materiale; den dokumenterer ikke forbindelse til et begravet lager.

Et stærkere svar på det første spørgsmål gør ikke automatisk det tredje stærkere. Kortet må derfor vise en interessant transportkæde samtidig med uafklaret jagtbarhed eller dokumenteret dyb registrering.

## Hvad overfladekortet kan afgøre

[GEUS 2025/32, s. 4, 7 og 10](https://data.geus.dk/pure-pdf/GEUS-R_2025_32_web.pdf) beskriver kortlægning af oprindelige aflejringer omkring én meters dybde under pløjelaget. To lodrette symboler angiver forskellige aflejringer inden for den øverste meter; de er ikke en måling af kontaktens præcise dybde. Kortlægningen kombinerer jordspydsprøver og andre geologiske observationer.

**Vores vurdering:** Det frosne datasæt kan ikke fastlægge faktisk pløjeadgang eller aktuel blotlægning på den enkelte mark. Samme materiale i de to symbolfelter beviser ikke nutidig adgang. Forskellige felter eller organisk dække beviser heller ikke, at et relevant lag ligger dybt. Det ældre supplement har endnu mindre dybdeopløsning. Alle eksisterende materialeflader får derfor **jagtbarhed uafklaret**; deres geologiske potentiale bevares.

Vi indfører ingen universel pløjedybde. For en senere konkret kandidat skal kildens lagkontakt sammenholdes med den faktisk belyste lokale bearbejdning eller eksponering. Et luftfoto kan støtte vurdering af arealets tilstand, men afgør ikke alene lagidentitet eller ravtilførsel.

## Implementeret farvevalg og punktvis dybdeevidens

| Visning | Farve og markering | Præcis betydning |
|---|---|---|
| Geologisk potentiale | Eksisterende fire farveklasser | Mulig tilførsel, omlejring og modtagelse; jagtbarhed vises særskilt i klikpanelet. |
| Jagtbarhed, materialeflader | Gråblå, `#778c99` | Adgang ved pløjning eller aktuel blotlægning er uafklaret. Det betyder hverken påvist adgang eller påvist dybt lager. |
| Dybe lag, i begge visninger | Lilla firkantet punkt med pil, `#6c3b91` | Registreret dybt interval; **ikke umiddelbart jagtbart**. Ingen ravforekomst eller arealudbredelse udledes af punktsymbolet. |

De [allerede undersøgte offentlige Jupiterobservationer](jordrav/profile-observations-2026-10-04.json) giver to konkrete eksempler:

| Punkt | Udvalgt registreret materiale | Dybde under boringens historiske terræn | Kilde |
|---|---|---|---|
| Åsted Vest, DGU 10.934, 2005 | Ældre marint sand i borebeskrivelsen | 82–89 m | [Jupiter](https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=10.934) |
| Ålbæk Lyngshede, DGU 6.30, 1945 | Ældre marint sand i borebeskrivelsen | 80–90,5 m og 107–112 m | [Jupiter](https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=6.30) |

Intervallerne er to statiske, kildekontrollerede punkteksempler. Kortet henter ikke en ny landsdækkende boringsdatabase eller live boringsdata. Ålbæks to sandintervaller sammenlægges ikke gennem det mellemliggende ler. Dybde og boringens år vises; historisk boreterræn udgives ikke for en ny måling af dagens lagposition. Materialebeskrivelsen gør ikke lagene til dokumenterede ravlag. Jordartskortets legendekoder anvendes ikke automatisk som boringslegendekoder.

Punktmarkørens størrelse og den valgte punkts pixelring er visningssymboler, ikke afstandsbuffere. Ingen cirkelflade, interpoleret formation, automatisk klassebonus eller antaget ravmængde tilføjes. Koden står i `js/jordrav/accessibility.js`; intervalkontrollen sammenholder den med den tidligere gemte Jupiterobservation.

## Når et dybt lager kan få overfladerelevans

**Vores geologiske hypotese:** Erosion, strukturel flytning eller omlejring kan knytte en ældre sedimentpakke til materiale ved overfladen. Men forbindelsen skal være lokal og forklaret. Et dybt boreinterval alene dokumenterer hverken blotlægning ved borepunktet eller samme lag i en nærliggende skrænt. En lateral kortgrænse eller overlappende isrand er heller ikke tilstrækkelig lagkorrelation.

Hvis materialet allerede er omlejret til et yngre overfladelag, vurderes dette lag med sin egen tilførselskæde. Det begravede kildelag bliver ikke automatisk jagtbart, fordi en mulig yngre modtager findes. Pløjning og efterfølgende regn er det sidste praktiske trin, når materialet er nået inden for rækkevidde.

Blotlægning af netop de viste dybe intervaller er ikke dokumenteret. Klikpanelet angiver dette og viser kilden. En særskilt **Vis dybe lag**-checkbox styrer punkterne; hovedvalget styrer alle geologiske lag. Fokus på forhøjet procespotentiale filtrerer materialeflader, mens dybe punkter styres særskilt.

## Validering og åbne spørgsmål

Fem målrettede datakontroller består, herunder præcise dybdeintervaller, kilde, boreår og koordinater mod de gemte observationer samt fravær af polygonudbredelse eller bonus. Den faktiske browserprøve kontrollerer farveskift, kilde-/dybdepanel, særskilt og samlet skjul/vis, bevaret valg ved baggrundsskift, adskilte intervaller, mobilbredde og DA/DE/EN. Seneste resultat ligger i [browserauditen](jordrav/prototype-browser-audit.json).

Aktuel markeksponering, lokalt bearbejdet lag, kontaktposition og ravtilførselskæde er fortsat åbne faglige spørgsmål. Der findes ingen verificeret jagtbar fladeklasse i denne levering. Det hindrer ikke geologisk analyse uden kendte fund; det sætter en præcis grænse for, hvad kortets nuværende farver kan fortælle en ravjæger.
