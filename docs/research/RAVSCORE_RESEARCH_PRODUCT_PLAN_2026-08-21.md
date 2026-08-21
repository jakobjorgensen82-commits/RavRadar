# RavRadar – forståelig samlet plan efter v4.0.243

## Hvor vi står

RavRadar 4.0.243 er i produktion. Turfunktionen kan opsamle komplette, dataminimerede ture uden at sende rute eller præcis GPS til databasen. De aktive vægte er fortsat 25 % jagtbarhed, 40 % transport og 35 % mobilisering.

Det betyder, at grundlaget nu er klar til den store analyse og den efterfølgende kontrollerede forbedring af scoremodellen.

## Det vi ikke bygger nu

- Ingen særskilt offentlig måling af, hvor sikker scoren er.
- Ingen funktion, der forklarer forskellen fra gårsdagens score.
- Ingen varsler eller gemte favoritområder nu. Det genovervejes om cirka et halvt år eller sammen med en senere sektion for brugerens egne data.
- Ingen AI-model eller OpenAI API i den offentlige app.
- Ingen bred normal Copernicus-anvendelse på alle kystdele.

## Det vi bygger

### Ravvinduer

Brugeren skal kunne forstå, om det bedst kan betale sig at tage afsted nu, vente nogle timer eller vælge et senere tidsrum. Et ravvindue er mere brugbart end en løs høj score på et enkelt klokkeslæt.

### Hændelsesforløb

Modellen skal se ravprocessen som et forløb: materiale frigøres, transporteres, aflejres og bliver derefter mere eller mindre jagtbart. Godt mobiliseringsvejr er ikke nødvendigvis godt jagtvejr på samme tidspunkt.

### Enkle forklaringer

Hver vurdering skal have en kort hovedforklaring og mulighed for mere dybde. Brugeren skal forstå, hvad der sker nu, hvorfor det betyder noget, og hvad man praktisk bør gøre.

### Omfattende læringsmodul

Læringsmodulet skal kunne føre en ny bruger fra grundlæggende ravviden til praktisk forståelse af strand, opskyl, vind, strøm, bølger, vandstand, kysttyper, timing, sikkerhed og RavRadars visninger. Mere erfarne brugere skal kunne åbne dybere faglige afsnit.

### Internt forsknings- og regelregister

Hver vigtig regel skal have kilder, evidensstyrke, usikkerhed, geografisk gyldighed, berørte scoredele, versionshistorik og begrundelse for accept eller afvisning. Registeret er for ejer, Codex og eksperter.

## Sådan ændrer vi score sikkert

1. Den nuværende model fastfryses som sammenligningsgrundlag.
2. Den store analyse omsættes til nye kandidatregler.
3. Lokale scripts kører gammel og ny kandidat på præcis de samme data.
4. Systemet finder automatisk store ændringer, fysiske problemer og uventede geografiske virkninger.
5. Codex forklarer kun de vigtigste resultater på almindeligt dansk.
6. Ejeren retter eller kommenterer i almindelig samtale.
7. Codex ændrer kandidaten og kører sammenligningen igen.
8. Først en godkendt, forståelig og fuldt valideret kandidat kan foreslås til produktion.

Ejeren skal normalt kun bruge få minutter på hver vigtig beslutningsrunde. Rå tabeller og tekniske detaljer gemmes til Codex og eksperter.

## Den store analyse

Analysen skal være bredere end direkte ravstudier. Den skal også undersøge relevante mekanismer fra sedimenttransport, drivende plastik, biologisk materiale og lignende processer. Målet er ikke at kopiere disse modeller, men at bruge dem forsigtigt, hvor fysikken er sammenlignelig.

Analysen skal ende i:

- en dokumenteret fysisk procesmodel,
- et evidensregister,
- en liste over accepterede og afviste hypoteser,
- forslag til regler og tærskler,
- forslag til vægtning af jagtbarhed, transport og mobilisering,
- forklaringer som almindelige brugere kan forstå,
- og konkrete emner til læringsmodulet.

## Turdata

Vi venter ikke et halvt år med at forbedre den nuværende forskningsbaserede model. Vi kommer så tæt på som muligt nu. Når der senere findes tilstrækkeligt mange komplette fund- og nul-fundsture, bruges de til kontrolleret efterkalibrering. Enkeltfund bruges ikke som selvstændigt fit-bevis.

## Næste konkrete trin

1. Begræns den normale Copernicus-pilot til godkendte DMI-huller.
2. Færdiggør den store faglige analyse og det interne evidensregister.
3. Udled score-neutrale kandidatregler og vægte.
4. Byg den automatiske sammenligning som lokale scripts og en kort Codex-venlig rapport.
5. Gennemgå kandidaten sammen i almindeligt sprog.
6. Implementér den godkendte model, ravvinduer og forklaringer.
7. Byg læringsmodulet på den kvalitetssikrede viden.
