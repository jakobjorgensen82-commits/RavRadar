# RavScore fase D: observerede fordelinger og ablation i 4.0.242

Status: reproducerbar og score-neutral analyse. Ingen tærskel, regel, vægt, geometri eller punkt er ændret.

## Formål

Fase C målte syntetiske grænser og konflikter. Denne analyse måler i stedet den score, som 4.0.242 faktisk producerer over Danmark. Den kan vise, hvilke dele af formlen der varierer, dominerer eller optræder sammen. Den kan ikke vise, om scoren forudsiger ravfund, fordi der endnu ikke findes et tilstrækkeligt tripbaseret fund-/nul-fundgrundlag.

Reproducerbar audit: `scripts/audit-ravscore-observed-ablation.mjs`.

## Datasæt og dækning

Analysen bruger det offentlige produktionsdatasæt `rr-20260820220004-210`, genereret 20. august 2026 kl. 22.00 UTC med produktionsreference kl. 21.00 UTC.

- 210 zoner
- 673 kystdele
- 41.116 zonevinderposter på tværs af timeprognosen og begge jagtformer
- 420 aktuelle zone-/jagtformposter
- 40.696 fremtidige zone-/jagtformposter
- 1.346 aktuelle kystdel-/jagtformposter
- 0 vægtmismatch
- 0 mismatch i de viste pointbidrag
- 0 ugyldige scorer eller delscorer

Alle 41.116 poster brugte 25 % jagtbarhed, 40 % transport og 35 % mobilisering. Den målte forskel mellem den rene vægtede score og den endelige score var nul i hele datasættet. Den aktive bølgejustering gav derfor ingen numerisk virkning i dette datasæt og kan ikke vurderes empirisk her.

## Aktuel national situation

### Zonevindere

De 420 aktuelle zonevindere havde:

- gennemsnitlig RavScore 51,77
- median 52
- 37 dårlige, 199 svage, 172 middel og 12 gode
- gennemsnitlig jagtbarhed 80,82
- gennemsnitlig transport 43,41
- gennemsnitlig mobilisering 40,55

Transport forklarede mest af variationen i slutscoren med korrelation 0,960. Mobilisering havde korrelation 0,811, mens jagtbarhed kun havde 0,232. Jagtbarhed var samtidig det største absolutte vægtede bidrag i 252 af 420 poster. Det er ikke en modsigelse: jagtbarheden ligger ofte højt og giver et stort grundbidrag, men varierer langt mindre end transporten.

### Alle aktuelle kystdele

De 1.346 kystdel-/jagtformposter havde gennemsnitlig RavScore 45,11. Zonevinderne lå dermed 6,67 point højere end den faktiske nationale kystdelsfordeling.

Konsekvens: En tur må knyttes til den faktisk søgte kystdel. Hvis en observation kun knyttes til zonens viste vinder, får kalibreringen en systematisk optimistisk score og muligvis forkert vejrpost.

## Forskellen mellem jagtformer

For aktuelle kystdele var den gennemsnitlige score 46,54 for waders og 43,68 for strand.

Waders-jagtbarheden varierede og havde gennemsnit 86,45. Strandjagtbarheden var derimod præcis 75 i alle 673 aktuelle kystdele. Den bidrog derfor med det samme grundbeløb på 18,75 point over hele landet og havde ingen aktuel rangordningsværdi.

Det er et vigtigt designfund, men ikke i sig selv tilladelse til at ændre strandreglen. Senere analyse skal afgøre, om strandens jagtbarhed bør få mere observerbar variation, vises som en separat praktisk status eller fylde mindre i overskriftsscoren.

## Transport og mobilisering

Korrelationen mellem transport og mobilisering var:

- 0,742 for de aktuelle zonevindere
- 0,733 for alle aktuelle kystdele
- 0,693 over alle 41.116 timeposter

Det er et stærkt overlapssignal. En del kan være fysisk korrekt, fordi samme indgående strøm eller vandstandsændring både flytter og genmobiliserer materiale. Men samme signal må ikke belønnes to gange uden en udtrykkelig procesforklaring.

En nøgleordsbaseret kontrol af de viste begrundelser fandt, at samme drivertype blev nævnt i mindst to delscorer i følgende andele af alle timeposter:

- vind: 82,81 %
- bølger: 20,74 %
- strøm: 48,64 %
- vandstand: 56,47 %
- kystegenskaber: 75,14 %

Dette er en screening, ikke et kausalbevis. Vindstyrke i jagtbarhed og vindretning i transport er eksempelvis forskellige mekanismer. Resultatet prioriterer de kombinationer, der senere skal have kontrolleret regel-for-regel-ablation.

Mobiliseringsforklaringen sagde i 96,01 % af timeposterne, at scoren primært blev båret af genmobilisering af allerede tilgængeligt rav og ikke en ny fuld frigivelseskæde. Det støtter den nye betegnelse mobilisering, men viser også, at egentlige nye frigivelseshændelser er sjældne i dette ene snapshot.

## Konflikter og beskyttelse mod falske topscorer

I de aktuelle zonevindere havde 40 % høj jagtbarhed og mindst ét svagt fysisk led. Kun 1,19 % nåede alligevel mindst middel RavScore, og ingen nåede god RavScore med transport eller mobilisering under 35.

Det er positiv evidens for, at 25/40/35 dæmper jagtbarhedens dominans. Det er ikke bevis for, at vægtene er optimalt kalibreret.

Kun 5 % af de aktuelle zonevindere havde alle tre delscorer på mindst 60. De fleste brugerbeslutninger ligger derfor i konfliktsituationer, hvor forklaringen af de tre dele er vigtigere end en enkelt overskriftsscore.

## Komponentablation

Auditten sætter én delscore til nul ad gangen, bevarer det observerede efterjusteringsled og genberegner samme additive formel. For de aktuelle zonevindere faldt scoren i gennemsnit:

- 20,22 point uden jagtbarhed
- 17,41 point uden transport
- 14,16 point uden mobilisering

For alle aktuelle kystdele var de tilsvarende fald 20,19, 12,46 og 12,51 point.

Dette måler formlens numeriske afhængighed. Det må ikke fortolkes som, at jagtbarhed er vigtigere for virkelige ravfund end transport. Den påstand kræver tripudfald.

## Hvad analysen kan og ikke kan beslutte

Analysen støtter at beholde 25/40/35 som foreløbig prior frem for at ændre vægtene igen på ét vejrsnapshot. Den viser samtidig fire konkrete næste forskningsopgaver:

1. Gentag fordelingen over uafhængige vejrhændelser og modelcyklusser, så et roligt snapshot ikke bliver en skjult facitliste.
2. Test transport og mobilisering regel for regel, især strøm, vandstand og kystegenskaber.
3. Undersøg strandjagtbarhedens manglende variation uden at blande sikkerhed ind i RavScore.
4. Kalibrér først mod komplette ture med faktisk kystdel, jagtform, tidsrum, indsats, prognosesnapshot og både fund og nul-fund.

Ingen af disse fund autoriserer automatisk scoreændring. Enhver senere ændring kræver særskilt beslutning, uafhængige hold-outs, regressionstest og produktionsefterkontrol.

## Reproduktion

```powershell
node scripts/audit-ravscore-observed-ablation.mjs --self-test
node scripts/audit-ravscore-observed-ablation.mjs <sti-til-public-condition-details.json>
```

Den fulde audit skriver kun aggregeret JSON til standardoutput og ændrer ingen produktionsdata.
