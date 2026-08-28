# DEC-0105 – Ekstra høj genkontrol af ejerens mindre rettelser

- **Status:** Accepteret og implementeret som 4.0.307-kandidat; exact-head, produktion og offentlig slutkontrol afventer
- **Dato:** 2026-08-29
- **Modelpåvirkning:** Ingen
- **Geodata/private data:** Ingen ændring eller læsning; kun de allerede godkendte topversionsfelter må følge releaseversionen

## Baggrund

Ejeren bad om en ny samlet gennemgang på Sol/Ekstra høj, fordi 4.0.306-arbejdet var udført med for lav indsats. Genkontrollen bekræftede de synlige hovedrettelser, men fandt fire reelle restfejl:

1. Spørg RavRadar havde kun seks nye lokale emnefamilier og opfyldte ikke rimeligt ønsket om en langt større netværksfri vidensbase. Ejeren præciserede efterfølgende, at udvidelsen ikke kun måtte bygge på Grundbogen, men skulle bruge ekstern research og RavRadars større forskningsgrundlag.
2. Edge-assistentens aktive offentlige UV-faktum sagde fortsat 365 nm, selv om Grundbogen og den lokale assistent sagde 395 nm.
3. Det kendte udenfor-domænefilter matchede delstrengen `kage` inde i `Skagen` og kunne derfor afvise et almindeligt ravspørgsmål. Samme mønster fandtes på Edge-grænsen.
4. Kyst B var korrekt på dansk, men de tyske og engelske læringsskabeloner beholdt en vandret højrepil. Håndbogens revisionssætning havde desuden ved en mekanisk erstatning fået den historisk forkerte formulering “tidligere 395 nm”.
5. 5-dagesvisningen tog de første fem datoer fra et nøddriftsdatasæt uden at fjerne passerede kalenderdage. Et datasæt fra torsdag kunne derfor fortsat vise torsdag som første fane lørdag.
6. Den rigtige mobile browserprøve viste, at alle assistentspørgsmål ventede på den store prognosedetaljefil. Et netværksfrit svar som “Hvad er en ravlygte?” kunne derfor ende med en HTTP-fejl, selv om svaret fandtes lokalt.

## Beslutning

1. Den eksisterende lokale assistent bevares til dynamiske Candidate G-svar, sikkerhed, manglende data og brede grundspørgsmål. Oven på den tilføjes et deterministisk, rent læsende katalog med i alt **152** afgrænsede ravfaglige emner på dansk, tysk og engelsk.
2. Hvert katalogemne har evidensklasse, mindst én offentlig kilde og ét reproducerbart spørgsmål pr. sprog. Sammen med de 17 eksisterende intent-kontrakter giver det 169 lokale kontrakter; katalogdelen låses med **456 DA/DE/EN-evalueringer** uden netværk eller AI-kvote.
3. DEC-0091's tidligere begrænsning til Grundbogen som eneste faglige kilde er erstattet. Den udvidede viden bygger på 27 registrerede kilder: direkte ravforskning, fagfællebedømt kystanalogi, officielle geologi-, kyst-, sikkerheds- og regelskilder, RavRadars systematiske forskningsgrundlag samt Rav Jagt som navngiven praktisk ekspert. Kildetyperne må ikke fremstilles som lige stærke. Se `docs/research/RAV_ASSISTANT_EXTERNAL_KNOWLEDGE_AUDIT_2026-08-29.md`.
4. Et specifikt katalogsvar vælges før et bredt standardsvar. Kendte dynamiske spørgsmål om sted, tid og score bevarer deres eksisterende beregningsvej. Åbne ravrelevante specialspørgsmål kan fortsat bruge den dataminimerede Edge, hvis offentlige faktapakke udvides fra 23 til 38 fakta. Sikkerheds-, privacy-, rate-limit- og rollbackgrænserne ændres ikke.
5. Udenfor-domænefiltrene i browser og Edge matcher hele Unicode-ord i stedet for vilkårlige delstrenge. Roulade/kage og andre reelt uvedkommende spørgsmål afvises fortsat, mens Skagen-spørgsmål bliver i ravdomænet. Relevante geologi-, identifikations-, kyst- og sikkerhedstermer kan gå til provider, hvis et lokalt svar ikke matcher.
6. 395 nm er den eneste aktive praktiske UV-angivelse i lokal viden, Grundbog og Edge-faktakontrakt. Forskningskilder kan beskrive andre laboratoriebølgelængder, men de må ikke omskrives til RavRadars praktiske anbefaling.
7. Kyst B viser lodret gul kyst og opadgående pil i dansk, tysk og engelsk. De øvrige ejerrettelser genkontrolleres funktionelt og visuelt i både desktop- og mobilvisning.
8. Prognosekalenderen bruger dagen i `Europe/Copenhagen`, sorterer datoer og fjerner udløbne dage. I nøddrift må den vise færre end fem reelle dage og forklare hvorfor; gamle prognoseværdier må aldrig relabeles som nye datoer.
9. Kun dynamiske spørgsmål om bedste sted, bedste tidspunkt og den aktuelle score må vente på prognosedetaljerne. Lokale fakta-, sikkerheds- og forskningssvar skal kunne svare straks uden denne fil, AI-kvote eller netværk.

## Afgrænsning

Ændringen må ikke ændre Candidate G, RavScore, 20/50/30, vægte eller kurver, bølge-/strøm-/mobiliserings-/leveringssemantik, DMI/Copernicus, modelprofil, state/cache/recovery, geometri eller land-/vandpunkter. Koldt vand forbliver en forklaring i lærings- og assistenttekst og bliver ikke et nyt scoreinput.

## Accept

- Lokale tests skal dække alle 152 katalogemner på DA/DE/EN, gyldige kilde-ID'er/evidensklasser, de eksisterende evals, Skagen og fast afvisning uden netværkskald.
- Edge-testen skal bevise 38-fakta-paritet, 395 nm, fravær af aktiv 365 nm, bredere relevant routing, dataminimering og de eksisterende providergrænser.
- Prognosetesten skal med fast dansk tidspunkt bevise, at torsdag/fredag fjernes lørdag, at lørdag–mandag beholder deres rigtige datoer, og at et helt udløbet datasæt ikke fremstilles som aktuelt.
- Mobilbrowseren skal ved manglende lokal prognosedetaljefil stadig svare “Hvad er en ravlygte?” med 395 nm samt besvare fosfor, succinit, revlehuller og prognosekalenderen lokalt uden HTTP-fejl.
- Lærings-, zone-, pile-, oversættelses- og responsive kontrakter skal bestå, og lokal browserkontrol skal dække de konkrete ejerobservationer.
- `validate:source` skal bestå på PR'ens eksakte head. Efter merge skal frisk produktion bestå fuld `validate` og `release:gate`, hvorefter offentlig desktop/mobil og de konkrete funktioner kontrolleres igen.

## Rollback

Katalogimporten kan fjernes, så de eksisterende lokale svar igen bliver førstevalg. Edge-UV-faktum og helordsfiltrering må ikke rulles tilbage til de dokumenteret forkerte 365 nm-/Skagen-tilstande. Enhver rollback kræver samme source-, Edge- og offentlig kontrol.
