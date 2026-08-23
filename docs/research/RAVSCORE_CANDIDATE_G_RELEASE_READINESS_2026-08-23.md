# Candidate G – release-readiness og grænsekontrol, 2026-08-23

## Kort konklusion

Den strømstyrede Candidate G består den mekaniske grænsekontrol score-neutralt. Den er monotont faldende under udgående strøm, bølger kan ikke skabe transport, waders-loftet virker, strandjagt bevarer højt ravpotentiale under hård vind, og missing ændrer ikke reservoiret.

Den oprindelige revision blev ført gennem exact-head `32602287607`, PR #82/merge `189644a0` og fuld post-merge-produktion `32602328912`. Den efterfølgende `RESEARCH-2`-udtransportgate bestod exact-head `32604792201` på `f6458f09`, PR #84/merge `800a93cb` og fuld produktion `32604850884`. Live `rr-20260822232159-210` er komplet med 210 zoner og 673 kystdele og ændrer ikke den offentlige scoremodel.

4.0.259 fører nu både transport- og mobiliseringstilstanden gennem den centrale pipeline efter DEC-0057 og lægger Candidate G i et særskilt offentligt diagnostic-only-navnerum. Exact-head `32609888406`, PR #89/merge `31e50acb`, fuld produktion `32609952992` og read-only shadow `32610281620` er grønne. Live `rr-20260823011924-210` består 210/673 og 1.346 modeevalueringer uden rekonstruktionsfejl. Den aktive score er fortsat urørt. Alle 673 tilstande er første bootstrap; naturlig state-alder og en senere modnet slutshadow er endnu ikke leverancebevist.

Den efterfølgende ejerbeslutning lukker samtidig den sidste tvetydighed i 13-timersbetydningen:

- efter 13 effektive timer med fuld kraftig udgående strøm er **transportpotentialet 0**;
- den samlede `RESEARCH-2`-slutscore bliver også 0, når historikken dokumenterer faktisk udtransport;
- jagtbarhed og mobilisering beregnes og bevares fortsat som forklarende komponenter;
- en startværdi på 0 uden faktisk udtransport udløser ikke slutscoregaten.

Det er den nuværende DEC-0055-/`20/50/30`-kontrakt. `RESEARCH-1`-resultatet på 35 ved udtømt transport bevares kun som revisionsspor. Offentlig RavScore er fortsat uændret.

## 4.0.260-opfølgning: naturlig state og profilomskifter

Seneste naturlige runtime `rr-20260823075018-210` har ført den samme state videre til 06:00Z. Den dataminimerede audit består 210 zoner, 673 kystdele og 1.346 modeevalueringer, accepterer alle 673 tidligere tilstande, nulstiller ingen og finder ingen rekonstruktionsfejl. Yngste og ældste dokumenterede state-alder er seks timer.

Ejeren har accepteret nattens seks timer som praktisk evidens til at forberede næste tekniske trin. Det er ikke et 48-timersbevis og ændrer ikke mobiliseringens 48 timers halveringstid.

DEC-0058/4.0.260 tilføjer derfor en versionsbundet, score-neutral profilomskifter. Den vælger stadig `RRS-CURRENT-B0-4.0.247` med 25/40/35. Candidate G kan kun vælges i en senere version med eksplicit aktivering, komplet global dækning, frisk grøn slutshadow og særskilt ejerbeslutning. Rollback vælger den eksakte legacyprofil for hele datasættet; blandede zone- eller timeprofiler er forbudt.

## Reproducerbar audit

`scripts/audit-ravscore-candidate-g-release-readiness.mjs` bruger kun syntetiske input. Den læser ikke den private cache, geometri, land-/vandpunkter, artifact eller protected-dirty-data. Den ændrer ikke offentlig score, UI eller runtime og er nu en del af kildegaten.

### Godkendt fuldstyrkekurve

| Effektive udgående timer | Transportpotentiale | Strandscore i fast kontrol | Waders-score i fast kontrol |
|---:|---:|---:|---:|
| 0 | 100 | 91 | 88 |
| 1 | 92 | 87 | 87 |
| 2 | 84 | 83 | 83 |
| 3 | 76 | 79 | 79 |
| 4 | 68 | 75 | 75 |
| 5 | 60 | 71 | 71 |
| 6 | 52 | 67 | 67 |
| 7 | 44 | 63 | 63 |
| 8 | 36 | 59 | 60 |
| 9 | 28 | 53 | 54 |
| 10 | 20 | 47 | 48 |
| 11 | 12 | 42 | 43 |
| 12 | 4 | 37 | 38 |
| 13 | 0 | 0 | 0 |

Transportpotentialet følger præcis 8-pointskurven. Før udtransportgaten falder den beregnede score monotont til 35/35, fordi transport kun udgør 50 procent. Ved dokumenteret faktisk udtransport og potentiale 0 sætter den særskilte ejerbesluttede gate derefter begge slutscorer til 0. Delscorerne overskrives ikke.

### Øvrige grænser

- Fuld indgående strøm bygger præcis 0, 10, 20 … 100 over ti effektive timer.
- En halvstærk udgående time reducerer potentialet fra 100 til 96.
- Strøm præcis i dødzonegrænsen ændrer ikke potentialet.
- Verificeret neutral strøm holder den mekaniske reference på 100 efter 48 timer.
- Følsomhedssporene giver 50 efter henholdsvis 24 og 48 timer ved deres tilsvarende halveringstid.
- 48 timers ikke-verificeret strøm holder potentialet uændret; missing tolkes ikke som nulstrøm.
- Høje bølger med transportpotentiale 0 giver transport/levering 0. Ved dokumenteret faktisk udtransport er før-gate-scoren fortsat positiv på grund af de andre komponenter, men slutscoren er 0.
- Et fail-closed startpotentiale på 0 uden faktisk udtransport giver fortsat en positiv score i den syntetiske kontrol. Dermed forveksles ukendt starttilstand ikke med dokumenteret udtransport.
- Bølgelandingsleddet flytter højst to transport-/leveringspoint i den faste yderpunktskontrol og kan ikke oprette en transportvej.
- Ved 15 m/s vind er waders-jagtbarhed og waders-score 0, mens strandscoren i samme høje-potentialekontekst er 84. Det matcher ejerens metodeafhængige kontrakt.

## Produktbetydning og forklaring

En senere offentlig visning skal holde fire ting adskilt:

1. **RavScore:** det samlede indeks fra jagtbarhed, transport/levering og mobilisering, med en eksplicit slutscoregate ved dokumenteret udtømt udtransport.
2. **Transportpotentiale:** det strømopbyggede reservoir, som er 0 efter 13 effektive fuldstyrketimer med udtransport.
3. **Strøm nu:** den aktuelle lokale pil; den er ikke et gennemsnit af historikken.
4. **Forløbet før nu:** den tidligere ind-/udtransport, der forklarer reservoirværdien.

Når udtransportgaten er aktiv, er den bindende forklaring:

`På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`

Forklaringen må ikke påstå, at mobilisering eller jagtbarhed også er 0. Den må heller ikke bruges ved et ubekræftet startpotentiale på 0, missing, neutral strøm eller svag modstrøm.

Waders skal fortsat vise det synlige jagtbarhedsloft og må ikke omtales som sikkerhedsrådgivning. Bund, dybde, render, revler, adgang og lokal grundegnethed er fortsat udeladt.

## Rollback- og aktiveringskontrakt

Den nuværende offentlige `25/40/35`-model er fortsat urørt og er rollbackreferencen. Candidate G har separat model-id, `scoreImpact=diagnostic-only`, `publicActivationAllowed=false` og `automaticActivationAllowed=false`.

En fremtidig aktivering skal mindst:

- versionsbinde den endelige kandidat og dens strømgrænser;
- føre samme lokale kystdel, tid, score, pil og forklaring gennem runtime;
- bevare den nuværende offentlige motor som kontrolleret rollbackmål;
- bevise central admin-roundtrip og rollback uden at ændre beskyttede dokumenter;
- køre frisk national shadow, fuld kildegate, fuld produktion, release-gate og relevant 210/673-browserkontrol;
- kunne rulles tilbage som en hel modelversion, ikke ved at efterlade blandede komponenter.

Der er ikke udført en faktisk central admin-roundtrip for denne endnu uaktiverede scoremodel. Det forbliver en senere gate og er ikke nødvendigt for den nuværende score-neutrale audit.

## Aktiveringsgater efter auditten

Mekanisk yderpunktskontrol, waders-betydning og pil-/historiksemantik er nu afklaret som forskningskontrakter. Efterfølgende ejerreview har valgt `0,03→0,15 m/s`, ingen passiv neutral aftrapning og kompakt tilstandsfortsættelse som teknisk prior. DEC-0056 vælger desuden én 4/48-timers bølgeenergimobilisering. Central persistens og den fallback-kompatible shadowkontrakt er implementeret i 4.0.259-kandidaten. Følgende leverings- og aktiveringsarbejde er fortsat åbent:

1. exact-head, merge og fuld post-merge-produktion af 4.0.259;
2. frisk 210/673-shadow på den producerede runtime samt dokumenteret naturlig state-alder; bootstrap fra 0 er ikke en modnet 48-timersfordeling;
3. særskilt aktiv score-omskifter, endelig brugerforklaring og testet tilbagekobling til `25/40/35`;
4. central admin-roundtrip for aktiveringskonfigurationen og alle relevante produkt-/browsergates.

Strømgrænsen og mobiliseringens halveringstider er ejer-/forskningspriorer, ikke fundkalibrerede naturkonstanter. Repræsentative komplette ture findes ikke før den planlagte aktivering og skal derfor stå som tydelig modelusikkerhed og senere efterkalibrering, ikke som en skjult eller umulig før-gate.

Offentlig RavScore forbliver `25/40/35`. Auditresultatet er et beslutningsgrundlag, ikke en aktivering.

## Verificeret levering

Den mergede kode er bundet til `RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2`. Post-merge-run’et gennemførte kildegate, frisk DMI/proveniens, 673/673-referencegate, fuld projektvalidering, releasegate, supportpakke, Supabase og Pages. Direkte livekontrol bekræfter samme datasæt-id i manifest, den offentlige startfil og detaljefilen; detaljefilens id blev læst via et 8 KB HTTP-range uden at hente hele den 116.494.109-byte store fil.

Dette leveringsbevis ændrer ikke aktiveringskontrakten: Candidate G er fortsat `diagnostic-only`, og den offentlige score er fortsat `25/40/35`.
