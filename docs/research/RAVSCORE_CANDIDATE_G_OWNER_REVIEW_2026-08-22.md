# Candidate G – aktuelt beslutningsgrundlag til ejerreview

> **Efterfølgende transport- og release-readiness-præcisering:** DEC-0055 erstatter det gamle 50/50-transportspor med `G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED`. Den første `RESEARCH-1`-audit viste 35 ved udtømt transport. Ejeren har siden valgt `RESEARCH-2`: dokumenteret faktisk kraftig udtransport med transportpotentiale 0 tvinger slutscoren til 0, mens jagtbarhed og mobilisering fortsat vises; se `RAVSCORE_CANDIDATE_G_RELEASE_READINESS_2026-08-23.md`.

## Kort svar

RavRadar bruger fortsat den offentlige RavScore med `25 % jagtbarhed`, `40 % transport` og `35 % mobilisering`. Candidate G er en privat testmodel og ændrer endnu ikke brugernes score.

Det ene forslag, vi nu fører videre, er:

`G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED`

Det betyder i almindeligt sprog:

- transport vægtes højest, så kandidatens arbejdsfordeling er `20/50/30`;
- verificeret indgående strøm bygger transportpotentiale, mens udgående strøm reducerer det straks og glidende;
- bølger kan kun påvirke den sidste levering og kan aldrig skabe transport;
- direkte vindhistorik er udeladt for at undgå dobbeltregning;
- strandscoren viser ravpotentiale uden jagtbarhedsloft;
- waders-scoren kan aldrig være højere end den aktuelle waders-jagtbarhed;
- vind styrer waders-jagtbarheden, mens modelbølger kun kan give et blødt fradrag på højst 20 point.

## Den konkrete waders-model

Vinddelen er fuld til og med 6 m/s. Den falder derefter gennem 7 m/s = 80, 8 = 60, 10 = 35, 13 = 10 og 15 eller mere = 0. Det afspejler, at vindskabte krusninger gradvist gør det sværere at lyse gennem vandet.

WAM-bølgehøjden bruges mere forsigtigt. Hvis bølgesignalet er dårligere end vindforholdene, trækkes kun 20 procent af forskellen fra. Bølger kan derfor højst koste 20 jagtbarhedspoint, aldrig forbedre scoren og aldrig alene lukke wadersjagten. Modellen forsøger ikke at gætte revler, render eller præcis bølgehøjde ved jægerens ben.

Dette er søgeeffektivitet, ikke sikkerhedsrådgivning.

## Hvad skete der med de andre modeller?

| Model | Rolle nu |
| --- | --- |
| Aktiv `25/40/35` | Nuværende offentlig reference |
| A-C | Sammenligninger, der isolerede enkelte modelændringer |
| D-E | Udviklingstrin frem mod en kapacitetsstyret fysisk model |
| F | Pilot for historiske vejrforløb |
| G 24 og G 48 | Følsomhedsgrænser for kortere og længere historik |
| G 50/50 uden direkte vind | Kontrol for dobbeltregning af vind |
| Tidligere waders-limit | Reference for den mere bølgefølsomme jagtbarhed |
| Vindstyret waders-variant | Bevarer den godkendte metodejagtbarhed og waders-loftet |
| Strømstyret variant med 8-point-udtransport | Det ene samlede forslag, der føres videre; strømgrænse, starttilstand og 13-timers-totalbetydning er åbne |

De gamle modeller er ikke forkastet som evidens. De bevares som revisionsspor, så vi kan se, hvilke faglige valg der skaber forskellene.

## Hvad viser replayet?

De 12 allerede udvalgte vejrhændelser giver 1.460 evalueringer:

- alle 730 strandscorer er uændrede af waders-reglen;
- ingen waders-score overstiger jagtbarheden;
- 138 waders-situationer har jagtbarhed under 35, og ingen af dem får mindst 55 point;
- den nye waders-score er i gennemsnit 32,040, mod 26,145 for den tidligere mere bølgefølsomme waders-reference i samme nye vægtsetup;
- ved vind til og med 6 m/s er den nye model aldrig lavere end den tidligere waders-reference;
- bølgesignalet trækker i gennemsnit 4,002 point og aldrig mere end 20;
- alle seks replaytilfælde ved mindst 15 m/s ender på 0.

Tallene er mekanisk kontrol, ikke repræsentativ dansk fundkalibrering. Replayet kan vise modsigelser og utilsigtede effekter, men ikke bevise, at `20/50/30` er den statistisk bedste vægt.

Den efterfølgende strømrevision har en særskilt 14-punkts grænsekontrol. Transportpotentialet følger 100, 92 … 4, 0. Før-gate-scoren falder monotont fra 91 til 35 for strand og 88 til 35 for waders, hvorefter den ejerbesluttede udtransportgate sætter begge slutscorer til 0 ved dokumenteret faktisk udtransport.

## Hvad er besluttet – og hvad venter?

Besluttet:

- Candidate G's private analyseprior er `20/50/30`;
- vind er hovedsignal for waders-jagtbarhed;
- WAM-bølger er kun et blødt fradrag;
- strand har intet jagtbarhedsloft;
- bund, dybde, render, adgang og automatisk stedegnethed udelades;
- modellen giver ingen sikkerhedsadvarsler.

Venter:

- offentlig aktivering af Candidate G;
- eventuel finjustering ud fra komplette ture med fund, reelle nul-fund, søgetid og jagtform;
- geografisk og tidslig hold-out;
- komplet godkendt dynamisk scoreinputcoverage og fuld produktkontrol.

## Anbefaling

Behold offentlig `25/40/35` uændret. Brug den strømstyrede, vindstyrede `20/50/30`-variant med den afgjorte udtransportgate som det ene private forslag i det videre beslutningsgrundlag. Luk først strømgrænsen og start-/forældelsesreglen. Når komplette ture findes, skal de bruges til at efterprøve vægtene – ikke til at skjule eller ændre de faglige kontrakter baglæns.

Checkpointet ændrer ingen offentlig score, UI, vejrdata, geometri eller land-/vandpunkter.
