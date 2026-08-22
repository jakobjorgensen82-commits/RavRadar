# DEC-0053: Candidate G's mekaniske beslutningsgrundlag er samlet

**Status:** Aktiv score-neutral forskningsbeslutning; ingen produktionsaktivering

**Dato:** 2026-08-22

**Scorepåvirkning:** Ingen

## Problem

RavScore-forskningen har bevidst brugt flere mellem- og kontrolmodeller. De er nødvendige for at isolere virkningen af retning, fysisk kapacitet, historik, vind og jagtform, men de gør ejerens overblik vanskeligt, hvis de præsenteres som samtidige produktkandidater.

Den aktuelle opgave er at samle det færdige mekaniske beslutningsgrundlag for scoreændringer. Det er ikke at hente yderligere data til de 430 kystdele, som den strenge private nationale shadow ikke kunne score.

## Beslutning

1. Den eneste Candidate G-variant, som føres videre til samlet ejerreview, er `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`.
2. A-C er sammenligningsmodeller, D og E er dokumenterede udviklingstrin, F er historikpiloten, og G 24/48 er følsomhedsgrænser. De er ikke forkastet som evidens, men de er ikke parallelle produktforslag.
3. Candidate G bruger fortsat `20/45/35` som analysecentrum. Det er ikke en endelig produktionsvægt. Den aktive offentlige RavScore forbliver `25/40/35`.
4. Den endelige vægt mellem jagtbarhed, transport og mobilisering må ikke vælges ud fra de udvalgte vejrhændelser eller et enkelt aktuelt nationalt snapshot. Den kræver komplette ture med fund og reelle nul-fund samt geografisk og tidslig hold-out.
5. Strandscoren må vise højt ravpotentiale ved lav praktisk jagtbarhed og får derfor intet jagtbarhedsloft.
6. Waders-scoren må ikke overstige waders-jagtbarheden. Vinddelen er 100 til og med 6 m/s og falder derefter gennem 7/80, 8/60, 10/35, 13/10 og 18/0. Bølger indgår separat.
7. Kontrakten beskriver søgemetodens effektivitet, ikke sikkerhed. Bund, dybde, render, vadebredde, adgang og automatisk lokal grundegnethed indgår ikke.
8. De 243 allerede komplette kystdele må bruges som et aktuelt mekanisk kontrolsnapshot. Der hentes ikke yderligere rådata til de øvrige 430 som del af denne analyse, og snapshotresultatet må ikke generaliseres til en landsdækkende effektstørrelse.
9. En eventuel senere offentlig aktivering er en særskilt opgave. Den kræver en landsdækkende godkendt inputkontrakt, samlet ejer-go/no-go, relevante regressioner, fulde gates og offentlig produktkontrol.

## Evidens

Det private replay med 12 allerede udvalgte hændelser gav 1.460 evalueringer:

- alle 730 strandscorer er uændrede i forhold til no-direct-wind-referencen;
- ingen af 730 waders-scorer overstiger jagtbarheden;
- 216 waders-evalueringer har jagtbarhed under 35, og ingen af dem får mindst 55 point;
- de tre vægtpriorer `15/50/35`, `20/45/35` og `25/40/35` består alle de kanoniske proceskontrakter;
- yderpriorerne adskiller sig 4,947 point i gennemsnit og 282 scorebånd, hvilket viser, at vægtvalget er vigtigt, men ikke hvilken vægt der forudsiger fund bedst.

Den friske centrale shadow `32580774128` på den produktionsverificerede merge `bb16ffe9546a4668084045c1526702d01a54566f` gav 243 aktuelle, komplette kystdele:

- strand: gennemsnitligt -5,49 point mod aktiv model, spænd -24 til +13;
- waders: gennemsnitligt -0,97 point mod aktiv model, spænd -49 til +21;
- ingen offentlig score, UI, runtime, geometri, admin, sampling eller state blev ændret;
- rå vejrværdier, U/V og koordinater blev ikke gemt i rapporten.

Tallene viser reel omfordeling og bekræfter kontraktens mekanik. De er ikke repræsentativ fundkalibrering.

## Konsekvens for næste review

Ejerreviewet kan nu handle om ét forståeligt forslag og tre adskilte spørgsmål:

1. Er den fysiske retning i Candidate G den rigtige vej videre?
2. Er forskellen mellem strand og waders korrekt forstået og forklaret?
3. Skal `20/45/35` fortsat være analysecentrum, indtil turdata kan vælge en produktionsvægt?

Ingen score ændres automatisk som følge af dette checkpoint.

## Bevarede kontrakter

- Offentlig RavScore `25/40/35` er uændret.
- Candidate G er privat og diagnostic-only.
- DMI/fallback og den offentlige 673/673-vejrkontrakt er uændret.
- Artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.
- Private payloads må ikke lægges i Git eller offentlige artifacts.
