# Candidate G – vægt- og forklaringsbeslutning, 2026-08-22

## Kort konklusion

Den ejer-godkendte score-neutrale variant `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` er nu afprøvet med hele det tidligere begrundede vægtinterval:

| Prior | Jagtbarhed | Transport/aflevering | Mobilisering |
| --- | ---: | ---: | ---: |
| Lav jagtbarhedsvægt | 15 % | 50 % | 35 % |
| Analysecentrum | **20 %** | **45 %** | **35 %** |
| Aktiv-lignende vægte | 25 % | 40 % | 35 % |

`20/45/35` bør fortsat være Candidate G's analysecentrum. Det er den gennemsigtige midte i det fagligt begrundede interval, transport er fortsat den største komponent, og kandidaten undgår både den brede nedjustering fra `15/50/35` og den næsten fulde tilbagevenden til den aktive vægtprior ved `25/40/35`.

Det er ikke fundkalibrering. Alle tre vægtpriorer består de fysiske kontraktscenarier, og materialet indeholder ikke komplette ture med fund, reelle nul-fund og søgeindsats. Der er derfor ikke evidens for at kalde én af fordelingerne statistisk rigtig. Den offentlige RavScore forbliver `25/40/35`, og Candidate G forbliver diagnostic-only.

## Afgrænsning

Analysen ændrer ikke offentlig score, UI, regler, DMI/fallback, central admin, geometri eller land-/vandpunkter. Den Git-ignorerede cache blev genafspillet uden at skrive rå vejrserier, U/V, koordinater, credentials eller private payloads til Git. `artifact` og `protected-dirty-data` blev ikke læst eller ændret.

Bundtype, dybdeprofil, render, vadebredde og adgang indgår fortsat ikke. Jagtbarhed beskriver praktisk søgeeffektivitet for den valgte jagtform og er ikke en særskilt sikkerhedsadvarsel.

## Historisk vægtfølsomhed

De tre vægtpriorer blev beregnet på de samme 1.460 evalueringer fra 12 allerede udvalgte 2024-hændelsesvinduer. Den godkendte 50/50-historik, fraværet af direkte vindhistorik, den milde fysiske flaskehals og waders-loftet blev holdt fast. Kun hovedvægtene blev ændret.

| Prior | Samlet middel | Forskel fra aktiv | Båndskift mod aktiv | Strandmiddel | Wadersmiddel |
| --- | ---: | ---: | ---: | ---: | ---: |
| 15/50/35 | 31,587 | -8,047 | 593 | 37,786 | 25,388 |
| **20/45/35** | **34,053** | **-5,581** | **513** | **40,755** | **27,351** |
| 25/40/35 | 36,534 | -3,099 | 500 | 43,736 | 29,333 |

Yderpunkterne adskiller sig i gennemsnit 4,947 point og skifter referencebånd i 282 af 1.460 evalueringer. Forskellen er større for strand, 5,949 point i gennemsnit, end for waders, 3,945 point, fordi det synlige waders-loft begrænser 223-228 evalueringer afhængigt af prioren.

`20/45/35` ligger praktisk midt mellem yderpunkterne: `25/40/35` ligger 2,482 point over centrum, mens `15/50/35` ligger 2,466 point under. Det er støtte til at beholde centrum som robust forskningsprior, ikke bevis for at tallet er optimalt.

Alle tre priorer gav:

- nul waders-scorer over jagtbarheden;
- nul middel/gode waders-scorer ved jagtbarhed under 35;
- uændret scorelogik for strand bortset fra den tilsigtede vægtfølsomhed;
- ingen automatisk aktivering.

## Kanoniske kontraktscenarier

Elleve syntetiske kystscenarier blev fortsat roteret gennem otte hav-mod-land-retninger for begge jagtformer. De tre vægtpriorer bevarer alle de bindende kontrakter:

- vedvarende indgående forløb ligger over vedvarende udgående forløb;
- venstre og højre langs kysten er symmetriske;
- historik kan ikke skabe en fysisk transportvej ved nul kapacitet;
- højenergi-waders med jagtbarhed nul får slutscore nul;
- det rolige efterstormsvindue for waders bevares højt i det kanoniske eksempel.

Strandens indgående-minus-udgående kontrast er 44, 47 og 52 point ved henholdsvis `25/40/35`, `20/45/35` og `15/50/35`. Waders-kontrasten er 8, 10 og 12 point, fordi jagtbarhedsloftet med vilje kan komprimere fysisk forskel, når metoden er vanskelig at bruge. Ingen vægtprior vender retningen.

Scenarierne kan afvise en åbenlys fysisk modsigelse, men de kan ikke vælge den bedste vægt ud fra observerede fund.

## Maskinlæsbar forklaringskontrakt

Candidate G's diagnostic-only resultat indeholder nu en eksakt, maskinlæsbar forklaringskontrakt. Den blev rekonstrueret uden afvigelser i 1.460 af 1.460 replayevalueringer.

Forklaringen holder fem ting adskilt:

1. **Transport og aflevering:** om den eksisterende fysiske vej kan føre materiale til og fastholde det ved den valgte kystdel.
2. **Mobilisering:** om en nylig hændelse kan have gjort materiale tilgængeligt og sat det i bevægelse.
3. **Jagtbarhed:** hvor effektivt den valgte metode kan bruges under de aktuelle forhold.
4. **Pil nu:** den aktuelle lokale strømvektor på præcis den valgte kystdel og tid.
5. **Forløbet før nu:** den kausale retningshistorik, som kun kan forstærke eller dæmpe en eksisterende transportvej.

Kontrakten viser eksakte komponentværdier, vægte, vægtede bidrag, additiv score, fysisk gate, score før jagtformsregel og endelig score. For waders viser den også åbent, om jagtbarhedsloftet faktisk begrænsede resultatet. Den angiver samtidig eksplicit, at grundegnethed og sikkerhedsrådgivning ikke indgår, og at resultatet ikke kan aktivere offentlig produktion.

## Anbefalet brugerforklaring ved en eventuel senere aktivering

En samlet RavScore kan fortsat vises, men forklaringen bør følge denne rækkefølge:

> **Ravmulighed for den valgte jagtform.** Materiale kan være blevet løsnet, og transportforløbet har støttet eller modvirket denne kyst. Pilen viser strømmen nu; teksten om forløbet beskriver timerne før nu. For waders kan vind og bølger begrænse den samlede score, fordi de gør det sværere at se og søge i vandet.

Brugeren behøver ikke se procenter i første lag. Ved uddybning skal de tre komponenter og deres faktiske bidrag kunne vises. En utilgængelig waders-metode må ikke fremstå som anbefalet. Strandjagt må fortsat kunne have høj ravmulighed ved lav jagtbarhed, når de fysiske leveringssignaler er stærke.

Der skal ikke tilføjes en generel sikkerhedsadvarsel til RavScore-forklaringen. Den eksisterende uafhængige sikkerhedskontrakt forbliver adskilt.

## Coverage og go/no-go

Vægt- og forklaringskontrakten er nu tilstrækkeligt præcis til ejerreview. Aktivering er fortsat **no-go** på den nuværende evidens, fordi:

- de 12 hændelsesvinduer er udvalgte vejrhændelser, ikke repræsentative ture;
- der mangler komplette fund-/nul-fundsture og søgeindsats;
- den friske centralt hydrerede Candidate G-shadow kunne kun score 243 af 673 kystdele, fordi 430 mangler komplet lokal DKSS-familie;
- offentlig produktforklaring og samlet ejer-go/no-go er ikke godkendt.

Den efterfølgende ejerbeslutning og DEC-0052 holder statiske lokale rev-, lavtvands- og vegetationsfelter ude af Candidate G. De har nul scorepåvirkning og er derfor ikke en aktiveringsgate. Shadowen rapporterer fortsat deres tilgængelighed diagnostisk og afviser parentzonens morfologi som lokal evidens. Den hårde coveragegate er nu entydigt komplet dynamisk scoreinput til alle aktive dele; den er fortsat lukket ved 243/673.

## Samlet anbefaling

1. Behold offentlig `25/40/35` uændret.
2. Behold `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` med `20/45/35` som samlet score-neutralt beslutningscentrum.
3. Brug `15/50/35` og `25/40/35` som faste følsomhedsgrænser, ikke som parallelle produktmodeller.
4. Brug den maskinlæsbare kontrakt som eneste kilde til senere komponent-, pil-, historik- og waders-forklaring.
5. Luk den centrale nationale dynamiske scoreinputcoverage på den eksakte kandidatkode uden at opfinde statiske stedfeatures.
6. Aktivér ikke kandidaten, før coverage, produktforklaring og ejerens samlede go/no-go er lukket.

## Reproducerbarhed

- `js/core/ravscore-candidate-g.js`
- `scripts/test-ravscore-candidate-g.mjs`
- `scripts/analyze-ravscore-candidate-g.mjs`
- `scripts/audit-ravscore-candidate-g-scenarios.mjs`
- privat input/output: `.cache/ravscore-historical-wave-pilot-12/`, Git-ignoreret
