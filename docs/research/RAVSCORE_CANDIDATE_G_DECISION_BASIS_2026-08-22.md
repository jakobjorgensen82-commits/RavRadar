# Beslutningsgrundlag for RavScore kandidat G, 2026-08-22

> **Efterfølgende beslutning:** DEC-0051 vælger `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` som næste score-neutrale analysecentrum. Den tidligere no-direct-variant i dette dokument bevares som reference. Se `RAVSCORE_MODE_SPECIFIC_HUNTABILITY_ANALYSIS_2026-08-22.md`.
>
> **Efterfølgende coveragepræcisering:** DEC-0052 holder statiske lokale retention-/stedfeatures helt ude af Candidate G. Den friske centrale shadow på 243/673 lukker fortsat ikke den dynamiske scoreinputgate; manglende statiske felter er kun diagnostik.

## Kort konklusion

Kandidat G er nu bygget og analyseret som en privat, score-neutral forskningsmodel. Den løser det vigtigste kendte retningsproblem bedre end den aktive model: retning får kun stor betydning, når der samtidig findes en fysisk transportvej. Historik kan dæmpe eller forstærke en eksisterende transportvej, men kan ikke skabe transport ved nul kapacitet.

Resultatet er **ikke** et fagligt grundlag for at aktivere kandidat G endnu. Den bedste beslutning på den nuværende evidens er:

1. behold offentlig RavScore 25/40/35;
2. behold 50/50-sporet som praktisk repræsentant for videre shadow, fordi 24 og 48 timer næsten ikke kan skelnes i de 12 forløb;
3. brug varianten uden direkte vind som foretrukken beslutningskandidat, indtil direkte vind kan påvises som et selvstændigt signal;
4. løs den tydelige vadejagt-konflikt mellem højt ravpotentiale og nul jagtbarhed i produktbetydning, UI og forklaring før enhver aktivering;
5. læg den grønne centralt hydrerede nationale shadow på PR'ens eksakte kode til grund, men behandl dens manglende retention-featuredækning og 430 u-scorede dele som en reel begrænsning;
6. brug senere komplette ture til kalibrering og geografisk/tidslig hold-out.

## Hvad kandidat G beregner

Kandidat G starter med kandidat E's procesmodel. Den bevarer:

- glatte jagtbarheds- og mobiliseringskurver;
- en bølge-/strømunderstøttet leveringsvej;
- en mild fysisk flaskehals på højst 15 procent;
- nul statiske bonuspoint for rev, lavt vand eller ålegræs;
- jagtbarhed uden for den fysiske transportgate.

Tre kausale historikspor beregnes for strøm, bølgeenergi og direkte vind. Hvert tidspunkt bruger kun det tidspunkt og fortiden. Hovedprioren er:

`historiksignal = 0,55 × strøm + 0,35 × bølgeenergi + 0,10 × direkte vind`

`historikfaktor = 1 + 0,40 × historiksignal`

`ny transport/levering = kandidat E-transport/levering × historikfaktor`

Den samlede forskningsscore før den milde fysiske gate er:

`0,20 × jagtbarhed + 0,45 × transport/levering + 0,35 × mobilisering`

Historiksignalet er begrænset, og det ganges på den eksisterende transportvej. Dermed er transport fortsat kapacitetsstyret. De numeriske andele er forskningspriorer, ikke fundkalibrerede naturkonstanter.

## Privat historisk replay

Replayet bruger 12 allerede udvalgte 2024-forløb på fire referencekyster og giver 1.460 evalueringer fordelt på strand og waders. Input og output ligger i den Git-ignorerede cache. Analysen har ikke læst de beskyttede land-/vandpunkter og gemmer ingen rå vejrværdier, U/V, koordinater eller credentials.

| Model | Middel | Forskel fra kandidat E | Forskel fra aktiv model | Båndskift mod aktiv |
| --- | ---: | ---: | ---: | ---: |
| Aktiv 25/40/35 | 39,634 | – | – | – |
| Kandidat E | 39,970 | – | +0,336 | 449 |
| G, 24 timer | 38,149 | -1,821 | cirka -1,49 | cirka 474 |
| G, 50/50 | 38,142 | -1,828 | -1,492 | 474 |
| G, 48 timer | 38,125 | -1,845 | cirka -1,51 | cirka 474 |

Det lille fald i gennemsnit skjuler stor lokal omfordeling: G 50/50 ligger fra 32 point under til 24 point over aktiv model og skifter referencebånd i 474 af 1.460 evalueringer. Den kan derfor ikke behandles som en lille vægtjustering.

Kapacitetsdelingen viser den tilsigtede retning:

| Bevægelseskapacitet | G 50/50 mod kandidat E |
| --- | ---: |
| Lav | -3,405 point |
| Mellem | -2,565 point |
| Høj | +0,876 point |

Kandidat G dæmper altså især situationer med ringe fysisk flytteevne og kan løfte stærke forløb. Det er den klareste støtte til modellens grundidé.

## 24 timer, 50/50 eller 48 timer

24 og 48 timer adskiller sig højst ét scorepoint i replayet. Den gennemsnitlige absolutte forskel er 0,064 point, 1.367 af 1.460 evalueringer er identiske, og kun to skifter referencebånd. 50/50 ligger som forventet mellem enderne.

Der er derfor ingen evidens for, at en bestemt blanding er fagligt bedre. 50/50 er den mest gennemsigtige repræsentant for videre shadow, mens 24 og 48 timer bevares som følsomhedsgrænser. En senere produktionskoefficient må vælges på bredere hændelser og komplette ture, ikke på denne næsten flade scoreforskel.

## Vind og dobbeltregning

Direkte lineær vind flytter kun 0,086 point absolut i gennemsnit mod varianten uden direkte vind, højst ét point og ni referencebånd. Lineær vind og vindstress adskiller sig kun 0,015 point absolut i gennemsnit.

| Fjernet vej | G 50/50 minus ablation, gennemsnitlig absolut forskel |
| --- | ---: |
| Strømhistorik alene | 0,071 |
| Bølgehistorik alene | 0,468 |
| Direkte vindhistorik alene | 0,086 |
| Al strøm, inklusive aktuel transport | 4,699 |
| Alle bølgeveje | 10,890 |
| Alle vindveje i jagtbarhed, mobilisering og direkte historik | 2,490 |

Bølger er det stærkeste samlede signal i disse udvalgte hændelser. Strøm er vigtig som aktuel fysisk transportvej, men den ekstra strømhistorik giver kun en lille selvstændig scoreændring. Direkte vind tilfører næsten intet, samtidig med at den allerede overlapper bølger og andre vindveje. Den konservative anbefaling er derfor at lade direkte vindbidrag være nul i en eventuel næste beslutningskandidat. Vind skal stadig påvirke jagtbarhed, mobilisering, bølger, strøm og vandstand gennem de dokumenterede veje.

## Kanoniske nationale scenarier

Elleve kystarketyper blev roteret gennem otte hav-mod-land-retninger for begge jagtformer, i alt 176 deterministiske evalueringer uden at læse geometri eller punkter.

- Ved vedvarende pålandsforløb ligger G 50/50 48 point over vedvarende fralandsforløb for strand og 47 for waders.
- En kort svag vending bevarer tre point mere end en stærk vedvarende vending i det valgte modforløb.
- 24-timerssporet reagerer ét point hurtigere end 48-timerssporet ved den stærke vending.
- Venstre og højre langs kysten er symmetriske.
- Historisk pålandssignal skaber præcis nul transport/levering, når den aktuelle fysiske kapacitet er nul.
- Direkte vind flytter højst ét point i scenariematricen.

Det bekræfter modellens matematiske kontrakter, men syntetiske scenarier er ikke observationel kalibrering og siger ikke, hvor ofte situationerne forekommer langs danske kyster.

## Den afgørende vadejagt-risiko

Det ekstreme højenergi-scenarie giver waders-jagtbarhed 0, men kandidat G omkring 79, fordi høj mobilisering og transport kan opveje den 20-procents jagtbarhed. I det historiske replay findes 219 waders-evalueringer med jagtbarhed under 35; 10 af dem har samtidig mindst middel kandidat-G-score.

Det er matematisk i overensstemmelse med DEC-0050, som holder jagtbarhed ude af den fysiske gate. Det er alligevel en produktmæssig stopklods: et enkelt grønt tal må ikke læses som “godt tidspunkt at gå i vandet”, når forholdene er praktisk umulige eller farlige.

Problemet må ikke skjules med en ny vilkårlig scoregate. Før aktivering kræves en eksplicit ejerbeslutning mellem mindst disse muligheder:

1. vis ravpotentiale og jagtbarhed som to tydelige dimensioner;
2. behold én RavScore, men giv uhuntbare waders-forhold en tydelig, fremtrædende status og forklaring, som ikke kan overses;
3. genåbn vægt/gate-designet og test en glat jagtbarhedsbegrænsning separat, uden at kalde den sikkerhed.

RavScore er fortsat ikke sikkerhedsrådgivning. Strøm, temperatur, dybde, bund og lokal adgang er ikke fuldt modelleret.

## Regler, pile og forklaring

De versionsbundne offentlige regel-filer indeholder aktuelt nul aktive regler. Den fulde offentlige regelmotor er afspillet på alle 1.460 evalueringer og ændrer derfor nul scorer. Den centralt hydrerede nationale shadow fandt også nul aktive regler og nul matchede contexts. Lokal og central regelstatus er derfor ens ved dette checkpoint.

Kandidat G er ikke koblet til offentlig UI. Derfor er de eksisterende pile og forklaringer uændrede og kan ikke være regressede af dette checkpoint. En senere aktivering kræver derimod en ny forklaringskontrakt: den aktuelle pil viser et øjebliksbillede, mens scoren kan bære historisk nettoforløb. UI skal fortælle, når historikken modvirker den aktuelle retning, hvilken transportkapacitet der findes, og hvorfor waders-jagtbarheden kan være lav trods højt ravpotentiale.

## National shadow

Den eksisterende private nationale validator beregner G 24 timer, G 50/50, G 48 timer og G 50/50 uden direkte vind på samme lokaldel, tidspunkt, jagtform og historik som den aktive model. Self-testen beviser, at kandidaterne er dataminimerede, score-neutrale og ikke kan aktivere offentlig runtime.

GitHub Actions-run `32554012542` kørte den centralt hydrerede shadow på PR #59's eksakte head `5762827873acaa439329c9779ec94c4593e11e1a`. Alle 673 aktive dele i 210 zoner blev kontrolleret. 243 dele havde komplette scoreinput og gav 486 jagtformskontekster; 430 dele forblev eksplicit u-scorede, og ingen del blev blokeret. Ingen parentfallback, interpolation, sammensmeltning på tværs af dele, state-, admin-, geometri-, sampling-, offentlig runtime- eller scoreændring blev registreret.

| National sammenligning | Strand | Waders |
| --- | ---: | ---: |
| G 50/50 minus aktiv, gennemsnit | -5,50 | -3,74 |
| G 50/50 minus aktiv, spænd | -28 til +12 | -30 til +25 |
| G 50/50 minus kandidat E, gennemsnit | -3,02 | -2,14 |
| G 48 minus G 24, gennemsnit | 0,00 | -0,01 |
| G 50/50 minus no-direct-wind, gennemsnit | 0,00 | 0,00 |

24 og 48 timer var identiske på 236 af 243 stranddele og 241 af 243 waders-dele. Direkte vind ændrede kun to stranddele med ét point og ændrede ingen waders-del. Den nationale kørsel styrker derfor valget af 50/50 som gennemsigtig repræsentant og no-direct-wind som konservativ beslutningsvariant.

Shadowen lukker kørselsgaten, men ikke aktiveringsgaten. Kun 243 af 673 dele kunne scores. De samtidige nul komplette lokale retention-features registreres efter DEC-0052 kun diagnostisk, fordi Candidate G ikke bruger en statisk stedmodel. Resultatet er et stærkt teknisk og aktuelt retningscheck, men ikke fundkalibrering eller fuld national effektmåling. Det dataminimerede artefakt forbliver privat.

## Produktkontraktaudit i 4.0.253

Den efterfølgende score-neutrale audit af den foretrukne `G-50-50-NO-DIRECT-WIND`-variant lukker tre præcisionsspørgsmål uden at aktivere kandidaten:

- Eksakte komponenter, vægtede bidrag og fysisk gate rekonstruerer den samme slutscore i 1.460 af 1.460 evalueringer. Afrundede visningskomponenter alene gav tidligere 118 tilsyneladende afvigelser og må derfor ikke bruges som matematisk facit.
- Af 730 waders-evalueringer har 219 jagtbarhed under 35, og 7 af disse har samtidig mindst 55 point på den foretrukne variant. Det kanoniske højenergiforløb er fortsat jagtbarhed 0 og score 79.
- Blandt 872 tydeligt retningsbestemte contexts er aktuel retning og historik modrettet i 332; i 100 flytter historikken den afrundede score. Den aktuelle pil skal derfor fortsat vise strøm nu, mens historikken forklares særskilt som forløbet før nu.

Forskningsanbefalingen er at beholde én samlet RavScore som ravpotentiale og vise waders-metodens tilgængelighed tydeligt ved siden af. En utilgængelig metode må ikke præsenteres som anbefalet. Sikkerhed forbliver en uafhængig kontrakt, og problemet må ikke skjules med en ny koefficient.

Coveragegaten er samtidig gjort eksplicit i den nationale shadowrapport. Parentzonens rev-, lavtvands- og vegetationsfelter accepteres ikke som lokal del-evidens. De 12 udvalgte historiske vinduer på fire referencekyster kan heller ikke i sig selv lukke national coverage.

Se `docs/research/RAVSCORE_CANDIDATE_G_PRODUCT_CONTRACT_AUDIT_2026-08-22.md`.

## Samlet anbefaling til ejerreview

Kandidat G bør **ikke aktiveres i sin nuværende form**. Den er en bedre forskningsramme end kandidat E/F til kapacitetsstyret retning, og 20/45/35 er fortsat et rimeligt analysecentrum. Men følgende taler imod go nu:

- 474 af 1.460 historiske evalueringer skifter referencebånd mod aktiv model;
- de 12 hændelser er udvalgte vejrhændelser, ikke repræsentative ravture;
- ekstra strømhistorik og direkte vind giver meget lille selvstændig effekt;
- direkte vind har ikke dokumenteret merværdi og risikerer dobbeltregning;
- en høj waders-score kan sameksistere med jagtbarhed 0;
- den nationale shadow kan kun score 243 af 673 dele; statiske lokale retentionfeatures er efter DEC-0052 bevidst udeladt og forklarer ikke dette dynamiske inputgab;
- der findes endnu ikke tilstrækkelige komplette fund-/nul-fundsture til kalibrering.

Det efterfølgende bedste faglige spor er efter DEC-0051 waders-loftvarianten af G 50/50 **uden direkte vind**, med 24/48 som følsomhedsgrænser. Waders-betydningen og forklaringskontrakten er lukket score-neutralt; den utilstrækkelige dynamiske scoreinputcoverage og samlet ejer-go/no-go er fortsat åbne. Offentlig 25/40/35 forbliver den sikreste reference indtil da.

## Reproducerbarhed og databeskyttelse

- `js/core/ravscore-candidate-g.js`
- `js/core/ravscore-regime-memory.js`
- `scripts/test-ravscore-candidate-g.mjs`
- `scripts/analyze-ravscore-candidate-g.mjs`
- `scripts/audit-ravscore-candidate-g-scenarios.mjs`
- `scripts/validate-national-shadow-score.mjs`
- privat input/output: `.cache/ravscore-historical-wave-pilot-12/`, Git-ignoreret

Ingen offentlig score, UI, DMI/fallback, geometri, land-/vandpunkter, artifact eller administratorindhold er ændret.
