# DEC-0054: Candidate G bruger vindstyret waders-jagtbarhed

**Status:** Aktiv score-neutral forskningsbeslutning; ingen produktionsaktivering

**Dato:** 2026-08-22

**Scorepåvirkning:** Ingen offentlig scorepåvirkning

## Problem

Den tidligere waders-kandidat behandlede vind og WAM-bølgehøjde som to relativt selvstændige begrænsninger. Ejerens erfaring er, at vindskabte krusninger normalt er den vigtigste begrænsning for at lyse gennem vandet. Større modelbølger dæmpes ofte lokalt af revler, og WAM's signifikante bølgehøjde ved nærmeste modelcelle er ikke en direkte måling af den bølge, jægeren står i.

Samtidig havde Candidate G `20/45/35` som foreløbigt analysecentrum. Ejeren har nu valgt, at transport skal have lidt større prioritet, uden at modellen foregives fundkalibreret.

## Beslutning

1. Den foretrukne samlede forskningsvariant er `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED`.
2. Candidate G bruger `20/50/30` for jagtbarhed, transport/levering og mobilisering. Det er en ejerbesluttet faglig prior, ikke en statistisk fundkalibrering. Den aktive offentlige RavScore forbliver `25/40/35`.
3. Ved wadersjagt er vind grundkurven: 100 point til og med 6 m/s, derefter 80 ved 7, 60 ved 8, 35 ved 10, 10 ved 13 og 0 ved 15 m/s eller mere. Mellem knækpunkterne interpoleres lineært.
4. WAM's signifikante bølgehøjde er kun et blødt korrektionssignal. Når bølgescoren er lavere end vindscoren, fratrækkes 20 procent af forskellen. Bølger kan derfor højst reducere jagtbarheden med 20 point, kan aldrig hæve den og kan ikke alene udløse et hårdt stop.
5. Vind ved mindst 15 m/s giver waders-jagtbarhed 0. Den samlede waders-score må aldrig overstige waders-jagtbarheden, heller ikke efter centrale ekspertregler.
6. Strandjagt ændres ikke af waders-kontrakten og får intet jagtbarhedsloft. Højt ravpotentiale må derfor fortsat vises under kraftig vind, når de øvrige fysiske led understøtter det.
7. Jagtbarhed beskriver søgemetodens effektivitet, ikke sikkerhed. Modellen giver ingen sikkerhedsadvarsler.
8. Bund, dybde, render, revler, vadebredde, adgang og automatisk lokal grundegnethed indgår ikke. Ingen geometri eller land-/vandpunkter må udledes eller flyttes som følge af beslutningen.
9. A-C, D-E, F, G 24/48, no-direct-wind og den tidligere waders-limit bevares som sammenlignings-, udviklings- og følsomhedsspor. De er ikke parallelle produktforslag.
10. En eventuel offentlig aktivering kræver senere et særskilt ejer-go/no-go, komplet godkendt scoreinputkontrakt, turbaseret validering og alle relevante gates.

Punkt 1, 3 og 6 samt det åbne reviewspørgsmål i DEC-0053 er hermed erstattet. DEC-0053's øvrige kontrakter om score-neutralitet, coverage, dataminimering og separat offentlig aktivering gælder fortsat.

## Evidens

Det eksisterende private replay blev genkørt uden nye rådata og omfatter 1.460 evalueringer, fordelt ligeligt på strand og waders:

- alle 730 strandscorer er uændrede i forhold til no-direct-wind-referencen;
- ingen waders-score overstiger jagtbarheden;
- den nye waders-score er i gennemsnit 32,040, hvilket er 5,895 point højere end den tidligere mere bølgefølsomme waders-limit;
- 506 waders-evalueringer stiger, 133 falder og 91 er uændrede mod den tidligere waders-limit;
- 138 waders-evalueringer har jagtbarhed under 35, og ingen af dem får mindst 55 scorepoint;
- ved vind til og med 6 m/s er den nye kandidat aldrig lavere end den tidligere waders-limit: 275 stiger og 34 er uændrede;
- bølgefradraget er aktivt i 559 af 730 waders-evalueringer, gennemsnitligt 4,002 point, median 2,58, 90-percentil 10,508 og højst 20;
- de seks replayevalueringer ved mindst 15 m/s ender alle på jagtbarhed og score 0;
- skiftet fra offentlig `25/40/35` til den private `20/50/30`-kandidat giver i dette ikke-repræsentative replay gennemsnitligt -5,249 point for strand og -3,122 for waders.

Kanoniske scenarier, målrettede kandidat-/jagtbarhedstests og den nationale shadow-self-test består. Resultaterne beviser kontraktens mekanik, men ikke at vægtene bedst forudsiger ravfund.

## Bevarede kontrakter

- Offentlig RavScore `25/40/35`, UI og runtime er uændret.
- Candidate G er privat, diagnostic-only og kan ikke aktivere sig selv.
- Der er ikke hentet ekstra data til de 430 dele uden komplet dynamisk scoreinput.
- Private cachepayloads må ikke lægges i Git eller offentlige artifacts.
- Artifact, protected-dirty-data, central admin, DMI/fallback, geometri og land-/vandpunkter er urørte.
