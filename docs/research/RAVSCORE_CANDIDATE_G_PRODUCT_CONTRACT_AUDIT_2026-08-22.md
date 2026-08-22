# Kandidat G – score-neutral produktkontraktaudit, 2026-08-22

> **Historisk 4.0.253-reference:** Den efterfølgende ejerbeslutning DEC-0051 erstatter anbefalingen om kun en separat waders-metodestatus. Den nye score-neutrale forskningsvariant bevarer strand og begrænser waders-scoren ved jagtbarheden. Se `RAVSCORE_MODE_SPECIFIC_HUNTABILITY_ANALYSIS_2026-08-22.md`.
>
> **Efterfølgende coveragepræcisering:** DEC-0052 erstatter dette dokuments sammenblanding af dynamisk scoreinputcoverage og lokale retention-features. Candidate G bruger ingen statisk lokal retentionmodel. 243/673 dynamisk inputcoverage er fortsat en hård no-go; nul lokale morfologifelter er kun diagnostik.

## Status

Denne audit er diagnostic-only i 4.0.253. Den ændrer ikke den aktive RavScore 25/40/35, offentlig UI, regler, DMI/fallback, geometri, land-/vandpunkter, central admin eller produktionsdata.

Den foretrukne forskningsvariant er fortsat `G-50-50-NO-DIRECT-WIND`, med 24 og 48 timer som følsomhedsgrænser. Kandidaten er ikke godkendt til aktivering.

## Produktionsverifikation

- PR #62 bestod exact-head-kildegate `32568914124` på `d272c6ca` og leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene gennem PR #64 bestod også exact-head-gates.
- Fuld produktionsverifikation `32570223437` bestod central hydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3382`, Supabase, Pages-artifact og deploy på `01904b92`.
- Pages-deployment `6036286717` er `success`. Det verificerede live-snapshot 4.0.253/datasæt `rr-20260822112859-210` havde 210 zoner og 673/673 scorede kystdele; aktuel rullende dataset-identitet kontrolleres live.
- Offentlig score, UI-adfærd og offentlig datakontrakt er uændrede; derfor krævede testmatrixen målrettet live metadata-/coveragekontrol og ikke en ny fuld 210/673-browseraudit.

## Grundlag og databeskyttelse

- Den Git-ignorerede cache `.cache/ravscore-historical-wave-pilot-12/` blev genafspillet lokalt.
- Materialet omfatter 12 udvalgte 2024-vinduer på fire referencekyster og 1.460 evalueringer fordelt på strand og waders.
- Kun aggregerede tællinger og modelkontrakter skrives til Git. Rå vejrserier, U/V, koordinater, credentials og private payloads skrives ikke til rapporten.
- Det private artifact og `protected-dirty-data` blev ikke læst eller ændret. Geometri og land-/vandpunkter blev ikke ændret.

## Eksakt sammenhæng mellem komponenter og score

En første kontrol forsøgte at rekonstruere kandidatscoren ud fra de afrundede, offentligt lignende komponenttal. Den gav 118 afvigelser i 1.460 evalueringer. Afvigelserne var ikke forskellige modelresultater, men et præcisionsproblem: komponenterne var afrundet før vægtning og gate.

Kandidatens diagnostiske output indeholder derfor nu den eksakte beregningskontrakt:

- eksakte komponentværdier;
- vægte og vægtede bidrag;
- additiv score før gate;
- fysisk gatefaktor og score efter gate;
- afrundet slutscore.

Efter denne rettelse rekonstruerer komponenter, bidrag og gate den samme score i **1.460 af 1.460** evalueringer. Det ændrer ingen scoreværdi; det gør alene en senere forklaring og audit matematisk entydig.

## Waders: ravpotentiale er ikke metodeegnethed

Den foretrukne no-direct-wind-variant har 730 waders-evalueringer:

- 219 har jagtbarhed under 35;
- 7 af disse har samtidig kandidatscore mindst 55;
- det kanoniske højenergiforløb har jagtbarhed 0 og kandidatscore 79.

Det tidligere bredere G-resultat med 10 kombinationer i middelbåndet brugte ikke præcis samme foretrukne no-direct-wind-kontrakt. De 7 er derfor det relevante tal for den variant, som aktuelt anbefales til beslutning; begge resultater peger på samme produktkonflikt.

Forskningsanbefalingen er:

1. behold én samlet RavScore som ravpotentiale;
2. vis waders-metodens tilgængelighed som en tydelig, separat status ved samme valgte kystdel og tidspunkt;
3. en utilgængelig waders-metode må ikke præsenteres som anbefalet, selv om ravpotentialet er højt;
4. hold sikkerhed som en uafhængig kontrakt – jagtbarhed er ikke en fuld sikkerhedsmodel;
5. indfør ikke en skjult koefficient eller vilkårlig scoregate for at få tallet til at se rigtigt ud.

Dette er et forberedt produktvalg, ikke en offentlig ændring. Ejerens go/no-go er fortsat nødvendig før UI- eller scorekobling.

## Pil og historik skal beskrive forskellige tider

Den aktuelle pil skal fortsat vise den aktuelle lokale strømvektor på den valgte context. Historikken beskriver et kausalt tidligere nettoforløb og må ikke omfortolke pilen til en historisk middelretning.

I 872 evalueringer var både aktuel retning og historik tydeligt retningsbestemt:

- 540 var ensrettede;
- 332 var modrettede;
- i 100 af de modrettede tilfælde ændrede historikken den afrundede kandidatscore;
- de 332 modrettede tilfælde i dette udvalgte materiale var aktuel fralandsretning med indgående historik. Fraværet af den modsatte kombination i de 12 udvalgte vinduer må ikke generaliseres nationalt.

En senere offentlig forklaring skal derfor vise pilen som **strøm nu** og, når historikken har materiel effekt, forklare historikken særskilt som **forløbet før nu**. Score, komponenter, pil og historik skal komme fra samme lokale kystdel, jagtform og tidspunkt.

## National coveragegate

Den seneste centralt hydrerede shadow kontrollerede 673 dele i 210 zoner. 243 dele kunne scores, 430 var eksplicit u-scorede, og ingen del var blokeret. Ingen del havde komplette lokale retention-features.

Repositoryets parentzoner indeholder morfologifelter, men de er ikke dokumentation for den konkrete lokale kystdel. Auditen afviser derfor udtrykkeligt at arve parentzonens rev-, lavtvands- eller vegetationsflag som lokal evidens.

Den nationale shadowrapport klassificerer nu samlet:

- scorede og u-scorede dele;
- native fuld og delvis inputdækning;
- manglende bølge- og DKSS-familier;
- komplette lokale retention-features;
- om aktiveringscoverage faktisk er klar.

Den nuværende klassifikation er ikke klar til aktivering. Den private 12-vinduescache kan heller ikke lukke national coverage, fordi den er et udvalgt fire-kysters forskningsmateriale og ikke et landsdækkende repræsentativt sample.

## Konklusion

- Komponent-/score-/gatekontrakten er lukket score-neutralt: 0 afvigelser i 1.460 evalueringer.
- Pil-/historikkontrakten er fastlagt score-neutralt: pilen viser nu, historikken forklares separat.
- Waders-konflikten er målt og har en konkret forskningsanbefaling, men offentlig produktbeslutning er åben.
- National dynamisk scoreinputcoverage er fortsat en åben aktiveringsgate. Lokal statisk retention-evidens er efter DEC-0052 ikke en Candidate G-gate, fordi modellen bevidst ikke bruger den.
- Offentlig 25/40/35 og ingen Candidate G-aktivering er fortsat den sikre anbefaling.

## Reproducerbarhed

- `js/core/ravscore-candidate-g.js`
- `scripts/test-ravscore-candidate-g.mjs`
- `scripts/analyze-ravscore-candidate-g.mjs`
- `scripts/audit-ravscore-candidate-g-scenarios.mjs`
- `scripts/validate-national-shadow-score.mjs`
- `scripts/test-national-weather-shadow-contract.mjs`
