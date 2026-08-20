# RavScore fase D: første komplette procesprior

Status: score-neutral forskningskandidat `phase-d-process-prior-0.1`. Modulet er ikke importeret af appen og ændrer ikke den offentlige RavScore.

## Formål

Vægtanalysen viste, at nye hovedvægte ikke kan rette problemer, som allerede findes inde i delscorerne. Denne kandidat beregner derfor en komplet alternativ score direkte fra de samme syntetiske vejr- og historikinput, men med en tydeligere proceskæde og glatte kurver.

Kandidaten skal besvare:

- om en mere fysisk struktur kan undgå B0's største modscenarier,
- hvor meget resultatet ændres, når delreglerne revideres samlet,
- hvilke antagelser der kræver historiske hændelser eller feltdata,
- og hvilke datamangler der skal vises som usikkerhed.

## Fund i den eksisterende procesmodel

Den eksisterende kystprocesmodel har nyttige begreber for frisk frigivelse, genmobilisering, timing, fortsættelse og lokal fastholdelse. Den bruger også kompakte, verificerede transporthistorikfelter uden at sende rå historik til browseren.

Auditten fandt samtidig:

- faste spring ved vind, bølger, strøm og hændelsesalder,
- mobilisering baseret på 24-timers maksimum uden direkte virkning fra hændelsens gemte varighed,
- samme positive bidrag fra stigende og faldende vandstand, fordi kun den absolutte ændring bruges,
- en beregnet strømtilpasning, som ikke anvendes i hændelsesresultatet,
- og historiske ind-/udtransportfelter, som vises i forklaringen, men fortsat er score-neutrale.

Disse forhold er dokumentation for næste analyse, ikke i sig selv tilladelse til at ændre produktion.

## Kandidatens struktur

### Jagtbarhed

- Vind og bølger bruger stykkevist lineære kurver uden punktspring.
- Vadertilstand reagerer tidligere og kraftigere end strandsøgning.
- Den dårligste af vind og bølger får størst betydning; det ene kan ikke frit opveje det andet.
- Sikkerhed er fortsat en særskilt overordnet kontrakt og må senere kunne stoppe et handlingsråd.

### Mobilisering

To spor sammenlignes:

1. **Frisk hændelse:** historisk bølgemaksimum vægter højere end vind, hændelsens varighed bidrager, og virkningen aftager med hændelsens alder.
2. **Nærkystnær genmobilisering:** aktuelle bølger, strøm og lokale fastholdelsesegenskaber kan genaktivere materiale, men sporet kan højst nå 80.

Det stærkeste spor bruges. Dermed kan en gammel storm ikke forblive fuldt aktiv alene, mens en moderat aktuel hændelse stadig kan flytte allerede nærkystnært materiale.

### Transport

- Strømretning vurderes kontinuerligt i forhold til kystens godkendte pålandsretning.
- Retning og hastighed multipliceres, så meget langsom strøm ikke får fuld transportscore alene på grund af retningen.
- Verificeret akkumuleret ind- og udtransport kan indgå, når den kompakte historik findes.
- Ikke-verificeret historik giver ikke et opdigtet neutralt bidrag.

### Aflevering og fastholdelse

Aflevering vises som en selvstændig kandidatdel baseret på:

- tid siden hændelsen,
- forholdet mellem aktuelle og historiske bølger,
- strømretningen,
- og et lille, begrænset bidrag fra revle/reef, lavt vand og vegetation.

Transport og aflevering samles derefter som 65/35. Fordelingen er en forskningsprior og skal afprøves, ikke en fastlagt naturkonstant.

### Samlet struktur

- jagtbarhed: 25,
- transport plus aflevering: 40,
- mobilisering: 35,
- højst 25 % gradvis reduktion, når den svageste del er under 50.

RavScoren er fortsat et indeks, ikke en fundprocent.

## Datatillid og modeltillid

Kandidaten skelner nu mellem:

- **datadækning:** hvor mange relevante input der findes,
- **datatillid:** foreløbig høj, middel eller lav efter kritiske mangler,
- **modelmodenhed:** `research-prior-unvalidated`,
- **modeltillid:** lav, indtil historiske og fremtidige observationer viser faktisk præstation.

Manglende bølgeperiode eller verificeret transporthistorik begrænser datatilliden til højst middel. Relevant strømdybde og lokalt ravinventar er fortsat eksplicit uafklarede.

## Syntetisk sammenligning

Det fulde gitter indeholder 43.200 situationer pr. søgetilstand. Til modelpræstation anvendes også et fysisk konsistent udsnit, hvor:

- historisk maksimal vind mindst svarer til aktuel vind,
- og historisk maksimal bølge mindst svarer til aktuel bølge.

Det efterlader 19.008 konsistente situationer pr. tilstand. De øvrige 24.192 bevares som robustheds- og stale-history-test.

### Konsistent udsnit

| Tilstand | B0-gennemsnit | Procesprior | Forskel | Ændret niveau | Korrelation |
|---|---:|---:|---:|---:|---:|
| Vadersøgning | 51,902 | 47,762 | -4,140 | 10.070 af 19.008 | 0,677 |
| Strandsøgning | 61,706 | 53,840 | -7,867 | 9.299 af 19.008 | 0,843 |

Den lave til moderate overensstemmelse er ikke automatisk dårlig. Kandidaten er netop bygget til at ændre B0's hårde spring og kompensation. Forskellen er dog for stor til aktivering uden hændelsesbaseret kontrol.

## Faste referencehistorier

| Historie | Score | Hovedbetydning |
|---|---:|---|
| Roligt, ingen relevant hændelse | 29 | Let at søge, men næsten ingen mobilisering eller transport |
| Frisk stærk hændelse, pålandstransport og rolige søgeforhold | 91 | Hele kæden peger samme vej |
| Samme friske hændelse, men udadgående strøm | 54 | Mobilisering kan ikke fuldt opveje forkert transport |
| Samme leveringsretning efter 120 timer | 62 | Historisk effekt aftager, men aktuelle forhold kan bevare noget potentiale |
| Fysisk stærk hændelse, vanskelig vadersøgning | 65 | Fysisk potentiale bevares, men jagtbarheden er tydeligt lav |

Auditten kræver automatisk, at den friske leveringshændelse slår rolig, udadgående, gammel og svært søgbar situation med fastsatte minimumsforskelle.

## De vigtigste B0-konflikter

### Svag hændelse og meget langsom strøm

B0 kan give omkring 68-78, når aktuelle forhold er rolige og lette at søge, strømmen er pålandsgående men kun 0,05 m/s, og det historiske maksimum er svagt. Procesprioren giver cirka 34-35.

Det skyldes især, at kandidaten kræver både retning og transportstyrke og ikke lader jagtbarhed skabe fysisk levering.

### Moderat vadervind

B0 kan sætte vadersøgning til nul jagtbarhed lige over en fast vindgrænse. Den glatte kandidat giver fortsat en reduceret, men ikke øjeblikkeligt nulstillet vurdering. Det er hovedårsagen til den lavere korrelation i vadertilstand.

### Stærk historisk bølgehændelse

Procesprioren kan ligge højere end B0, når bølgehistorikken er stærk, strømmen har relevant retning og hastighed, og hændelsen har den rigtige alder. Det følger analysens konklusion om, at direkte bølgepåvirkning bør vægte højere end vind som indirekte proxy.

## Kendte svagheder i kandidaten

- Kurvepunkterne er evidensbaserede priors, ikke danske kalibrerede tærskler.
- Bølgeperiode bruges endnu kun som usikkerhedsmarkør, fordi en relevant historisk periode ved hændelsestoppen ikke findes i den nuværende kontrakt.
- DMI-strømmens dybdelag er ikke dokumenteret som den faktiske ravtransport ved hver kystdel.
- Lokalt ravinventar er ikke modelleret.
- Afleveringens 65/35-struktur og statiske retention er foreløbig.
- Vandstandens retning er endnu ikke brugt som fysisk leveringsregel, fordi stigende og faldende vand kan have forskellige betydninger for levering og senere tilgængelighed.
- Sikkerhed skal fortsat være en særskilt stopregel.
- Kandidaten er kun testet syntetisk, ikke på en låst samling af virkelige danske hændelser.

## Beslutning

Procesprioren er et bedre forskningsgrundlag end blot at udskifte `40/35/25`. Den:

- fjerner de undersøgte punktspring,
- bruger strømretning og hastighed sammen,
- adskiller mobilisering, transport og aflevering,
- skelner frisk hændelse fra genmobilisering,
- og viser modelusikkerhed ærligt.

Den må ikke aktiveres endnu. Næste nødvendige gate er en dateret hændelsespakke og et regel-for-regel eftersyn af de største B0/prior-forskelle. Først derefter kan en afgrænset produktionsændring foreslås med opdaterede forklaringer, tests og fuld browserkontrol.
