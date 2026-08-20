# RavScore fase D: kontrakt mellem jagtbarhed og sikkerhed

Status: bindende anbefaling til næste produktionsændring. Dette dokument ændrer ikke den offentlige brugerflade.

## Konklusion

Jagtbarhed og sikkerhed skal være to forskellige resultater.

- **Jagtbarhed** beskriver, hvor praktisk det forventes at være at søge med den valgte metode under de målte forhold.
- **Sikkerhed** beskriver kendte advarsler, manglende sikkerhedsdata og forhold, som gør at brugeren bør blive på land eller helt undlade turen.

En høj fysisk ravmulighed kan godt optræde samtidig med farlige forhold. En høj RavScore må aldrig fortolkes som tilladelse til at gå ud i vandet.

## Nuværende problem

Den offentlige forklaring beskriver i dag jagtbarhed som, hvor “let og sikkert” det er at finde rav. Det sammenblander to forskellige spørgsmål:

1. Kan ravet forventes at være tilgængeligt og synligt med denne søgemetode?
2. Er det forsvarligt for netop denne bruger at gå ud under de lokale forhold?

RavRadar kan beregne dele af det første spørgsmål. Systemet kan ikke besvare det andet sikkert alene ud fra zonebaseret vind, bølger og modelstrøm.

## Hvorfor vejrdata ikke er en fuld sikkerhedsmodel

Officiel sikkerhedsvejledning om returstrømme fremhæver blandt andet:

- farlige strømme kan opstå ved brud i revler og nær høfter, moler og andre konstruktioner,
- et roligt område mellem brydende bølger kan være selve den udadgående strøm,
- farlige strømme kan forekomme på rolige og solrige dage,
- større bølgehøjde og længere bølgeperiode kan øge styrken,
- bølgegrupper kan pludseligt hæve vandet, få vadende personer til at miste fodfæstet og udløse en kraftigere strøm,
- og tilbageskyl på en stejl strand kan vælte mennesker uden at være den samme proces som en returstrøm.

Kilder:

- NOAA/National Weather Service, spørgsmål og svar: https://www.weather.gov/safety/ripcurrent-faqs
- NOAA/National Weather Service, videnskabelig forklaring: https://www.weather.gov/safety/ripcurrent-science
- NOAA/National Weather Service, strandhandlinger: https://www.weather.gov/safety/ripcurrent-beach
- NOAA/National Weather Service, farlige strømme: https://www.weather.gov/safety/dangerous-currents

RavRadar har ikke direkte observation af lokale revlehuller, pludselige bølgegrupper, brugerens erfaring, fodfæste, vanddybde eller livredders vurdering. DMI's strøm ved et havpunkt er heller ikke en måling af en smal returstrøm i brændingszonen.

## Ny betydning af jagtbarhed

Jagtbarhed bør måle praktiske forhold, eksempelvis:

- om den valgte metode er strand eller vadning,
- hvor uroligt vandet er,
- om opskyl og søgeflade forventes at være tilgængelig,
- om vind og bølger gør det svært at se eller samle materiale,
- og om forholdene er så krævende, at den valgte metode ikke er realistisk.

Jagtbarhed må gerne trække RavScore ned, fordi scoren skal beskrive den praktiske mulighed for at finde rav. Men den må ikke omtales som en sikkerhedsgodkendelse.

## Separat sikkerhedsresultat

En senere offentlig kontrakt bør mindst kunne returnere:

| Status | Betydning | Brugerhandling |
|---|---|---|
| Ukendt | RavRadar har ikke nok lokale sikkerhedsdata | Vurder forholdene på stedet; score er ikke sikkerhedsråd |
| Vær ekstra forsigtig | Målte forhold eller datamangler giver en tydelig grund til forsigtighed | Bliv på stranden eller vælg et mere beskyttet sted |
| Gå ikke i vandet | Officiel advarsel eller en bindende konservativ regel er udløst | Brug kun landbaseret søgning eller aflys |

`Gå ikke i vandet` bør som udgangspunkt kræve en troværdig officiel advarsel eller en særskilt ejer-godkendt sikkerhedsregel. RavRadar må ikke opfinde præcise “sikre” grænser ud fra et ravstudie.

Fravær af en advarsel må ikke vises som “sikkert”. Den korrekte standardtekst er, at lokale forhold stadig skal vurderes.

## Samspil med RavScore

Den anbefalede præsentation er:

1. Vis RavScore som mulighedsindeks.
2. Vis jagtbarhed, transport og mobilisering som forklaring på scoren.
3. Vis en separat sikkerhedsstatus med tydelig handling.
4. Hvis vandadgang frarådes, kan strandsøgning stadig have en score, mens vadning markeres som utilgængelig eller klart frarådet.
5. En høj score må ikke skjule eller nedtone sikkerhedsstatus.

Sikkerhedsstatus er dermed ikke en fjerde procentvægt. Den er et selvstændigt produktlag, som kan begrænse en søgemetode uden at omskrive den fysiske ravmulighed.

## Eksempel på korrekt forklaring

### Høj fysisk mulighed, dårlig vadning

> Der kan være gode fysiske forhold for rav ved denne kyst, men vandet er for uroligt til, at RavRadar anbefaler vadning. Søg fra stranden og vurder altid de lokale bølger og strømme på stedet.

### Lav fysisk mulighed, rolige forhold

> Det er praktisk nemt at gå på stranden, men mobilisering og transport er svage. Roligt vejr er ikke i sig selv tegn på gode ravforhold.

### Manglende sikkerhedsdata

> RavScore beskriver ravmuligheden, ikke om det er sikkert at gå i vandet. Vi mangler lokale sikkerhedsoplysninger for denne kystdel.

## Krav til score, pil og forklaring

- Score, jagtbarhed og tekst skal bruge samme tidspunkt og samme søgemetode.
- Strømpilen skal fortsat vise den modellerede bevægelsesretning og må ikke mærkes som sikker/ikke sikker.
- Hvis teksten siger, at strømmen går ud fra kysten, skal pil og retningsdiagnostik vise det samme.
- En sikkerhedsadvarsel skal angive sin kilde og tidspunkt eller tydeligt sige, at den bygger på en konservativ RavRadar-regel.
- Manglende data skal give “ukendt”, ikke grønt eller sikkert.

## Næste sikre produktionsændring

Den næste særskilte produktions-PR bør:

1. Fjerne ordet “sikkert” fra definitionen af jagtbarhed.
2. Tilføje en vedvarende tekst om, at RavScore ikke er en sikkerhedsgodkendelse.
3. Sikre at høj RavScore og sikkerhedsadvarsel kan vises samtidig.
4. Bevare forskel mellem strand og vadning.
5. Opdatere Markdown-håndbog, webhåndbog og relevante forklaringstests.
6. Køre den målrettede score-/pil-/forklaringskontrol og en browserkontrol, fordi brugerforklaringen ændres.

Numeriske sikkerhedsgrænser bør behandles i en separat beslutning med en klar officiel eller ejer-godkendt kilde. De må ikke sniges ind som en sideeffekt af RavScore-forskningen.
