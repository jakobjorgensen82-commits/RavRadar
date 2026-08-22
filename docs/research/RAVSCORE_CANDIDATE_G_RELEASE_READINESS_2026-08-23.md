# Candidate G – release-readiness og grænsekontrol, 2026-08-23

## Kort konklusion

Den strømstyrede Candidate G består den mekaniske grænsekontrol score-neutralt. Den er monotont faldende under udgående strøm, bølger kan ikke skabe transport, waders-loftet virker, strandjagt bevarer højt ravpotentiale under hård vind, og missing ændrer ikke reservoiret.

Auditten afdækker samtidig én ejerbetydning, som skal være helt eksplicit før offentlig aktivering:

- efter 13 effektive timer med fuld kraftig udgående strøm er **transportpotentialet 0**;
- den samlede Candidate G-score er ikke tvunget til 0, fordi jagtbarhed og mobilisering fortsat vægtes;
- i den faste syntetiske kontrol ender totalscoren derfor på 35 for både strand og waders.

Det er den nuværende DEC-0055-/`20/50/30`-kontrakt. Hvis ejerens “helt i bund” i stedet betyder, at hele RavScore skal være 0 ved dokumenteret udtransport, kræver det en ny synlig fuld-scoregate. Den må ikke indføres skjult som en teknisk detalje.

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
| 13 | 0 | 35 | 35 |

Transportpotentialet følger præcis 8-pointskurven. Totalscoren falder også monotont, men ikke med otte point pr. time, fordi transport kun udgør 50 procent af den samlede score, og den milde fysiske gate ikke er en nul-gate.

### Øvrige grænser

- Fuld indgående strøm bygger præcis 0, 10, 20 … 100 over ti effektive timer.
- En halvstærk udgående time reducerer potentialet fra 100 til 96.
- Strøm præcis i dødzonegrænsen ændrer ikke potentialet.
- Verificeret neutral strøm holder den mekaniske reference på 100 efter 48 timer.
- Følsomhedssporene giver 50 efter henholdsvis 24 og 48 timer ved deres tilsvarende halveringstid.
- 48 timers ikke-verificeret strøm holder potentialet uændret; missing tolkes ikke som nulstrøm.
- Høje bølger med transportpotentiale 0 giver transport/levering 0. Den samlede score kan stadig være 27 for strand og 34 for waders på grund af de andre komponenter.
- Bølgelandingsleddet flytter højst to transport-/leveringspoint i den faste yderpunktskontrol og kan ikke oprette en transportvej.
- Ved 15 m/s vind er waders-jagtbarhed og waders-score 0, mens strandscoren i samme høje-potentialekontekst er 84. Det matcher ejerens metodeafhængige kontrakt.

## Produktbetydning og forklaring

En senere offentlig visning skal holde fire ting adskilt:

1. **RavScore:** det samlede indeks fra jagtbarhed, transport/levering og mobilisering.
2. **Transportpotentiale:** det strømopbyggede reservoir, som er 0 efter 13 effektive fuldstyrketimer med udtransport.
3. **Strøm nu:** den aktuelle lokale pil; den er ikke et gennemsnit af historikken.
4. **Forløbet før nu:** den tidligere ind-/udtransport, der forklarer reservoirværdien.

Hvis totalen vises som 35 samtidig med transportpotentiale 0, må forklaringen ikke sige, at der stadig er god transport. Den skal sige, at transportleddet er udtømt, mens andre scoreled fortsat holder det samlede indeks over nul. Om dette overhovedet er den ønskede produktbetydning er den åbne ejerbeslutning.

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

Mekanisk yderpunktskontrol, waders-betydning og pil-/historiksemantik er nu afklaret som forskningskontrakter. Følgende er fortsat åbent:

1. ejerbeslutning: 0 efter 13 timer for transportkomponenten eller for hele RavScore;
2. kalibreret kystnormal strømgrænse;
3. godkendt startreservoir og eventuelt passivt 24–48-timers tab;
4. repræsentative komplette ture eller tilsvarende stærk validering;
5. frisk national score-neutral shadow med den endelige inputkontrakt;
6. endelig offentlig UI-/forklaringskontrol;
7. central admin-roundtrip, rollback og fulde produktgates;
8. udtrykkeligt ejer-go/no-go.

Offentlig RavScore forbliver `25/40/35`. Auditresultatet er et beslutningsgrundlag, ikke en aktivering.
