# RavScore fase C - deterministisk følsomheds- og overlapaudit

**Dato:** 2026-08-20  
**Version:** 4.0.238  
**Script:** `scripts/audit-ravscore-sensitivity.mjs`  
**Produktionspåvirkning:** Ingen scoreændring

## Formål

Auditen måler den aktive scoremotors matematiske adfærd uden funddata og uden at ændre modellen. Den skal finde:

- abrupte spring omkring aktive tærskler;
- konsekvensen af manglende input;
- input, der påvirker flere komponenter;
- ikke-additiv adfærd fra lofter, afrunding, maksimumspor og samspilsbonus;
- den syntetiske scorefordeling i et bredt, men ikke naturkalibreret scenarie-grid.

Resultaterne beskriver kode, ikke virkelighed. De kan prioritere validering, men kan ikke bevise, at en tærskel er rigtig eller forkert.

## Metode

- 54 tærskelrækker: begge jagtformer omkring 27 aktive spring for vind, bølger, strøm, vandstandstrend, historiske maksimummer, hændelsesalder og retningsforskel.
- 18 missing-scenarier: ni inputgrupper i begge jagtformer.
- Otte parvise overlapsscenarier: fire inputpar i begge jagtformer.
- 43.200 deterministiske kombinationer pr. jagtform, i alt 86.400 scenarier.
- Standardvægte og ingen adaptive eller ejerregelbaserede justeringer.
- En permanent self-test kontrollerer omfang, tilgængelighed og score-neutralitet.

## Tærskelspring

40 af 54 tærskelrækker ændrer slutscoren på mindst én side af grænsen i basisscenariet.

| Jagtform | Grænse | Score lige under / ved / lige over | Største spring |
|---|---|---:|---:|
| Waders | Vind 6 m/s | 73 / 73 / 55 | -18 |
| Strand | Vind 13 m/s | 71 / 71 / 59 | -12 |
| Waders | Strøm 0,15 m/s | 62 / 73 / 73 | +11 |
| Waders | Vind 8 m/s | 55 / 55 / 45 | -10 |
| Waders | Bølge 0,7 m | 73 / 73 / 63 | -10 |
| Strand | Strøm 0,15 m/s | 65 / 75 / 75 | +10 |
| Waders | Vind 3 m/s | 81 / 81 / 73 | -8 |
| Waders | Strømretningsforskel 90 grader | 62 / 62 / 54 | -8 |

Springene skyldes stykvise kodegrænser, ikke glidende fysiske responser. Det gør modellen let at forklare, men kan give store rangændringer ved meget små inputændringer. Før en ny scoreversion bør hvert stort spring enten have stærk evidens eller erstattes af en valideret glattere funktion.

## Manglende input i basisscenariet

- Manglende aktuel vind gør hele scoren utilgængelig.
- Manglende bølgehøjde reducerer kun slutscoren med 3 point for waders og 2 for strand.
- Manglende strømstyrke eller hele strømparret reducerer slutscoren med 19-20 point og aktiverer transportloftet på 52.
- Manglende strømretning alene reducerer begge jagtformer med 13 point.
- Manglende vandstandstrend, historisk maksimumvind, historisk maksimumsbølge eller hændelsesalder ændrer ikke dette ene basisscenarie, fordi genmobiliseringssporet allerede vinder over fresh-release-sporet.

Det sidste resultat er lokalt for basisscenariet. Det viser, at maksimumvalget kan skjule effekten af et helt dataled; det viser ikke, at historikken altid er irrelevant.

## Overlap og ikke-additivitet

- Skift fra svag/offshore til velegnet/onshore strøm giver i kombination +32 slutpoint i begge jagtformer. Transportkomponenten stiger 84 point, og mobilisering stiger samtidig 10 point. Samspillet giver yderligere 4-5 point ud over de to enkeltændringer.
- Lavt vand og rev øger samlet transport med 7 og mobilisering med 8 komponentpoint. Slutvirkningen er +4 for waders og +5 for strand.
- Høj aktuel og historisk bølge øger mobilisering med 21 komponentpoint. For waders opvejes dette af -37 jagtbarhed, så slutscoren falder 10 point; for strand stiger den 5.
- Høj aktuel vind og høj historisk maksimumvind øger mobilisering med 14 komponentpoint. Waders-scoren falder alligevel 24 point på grund af -68 jagtbarhed; strandscoren ender uændret.

Dette bekræfter, at de tre komponenter ikke er uafhængige. Det kan være fysisk rimeligt, men den marginale informationsværdi skal måles med ablation frem for antages.

## Syntetisk scenario-grid

| Mål | Waders | Strand |
|---|---:|---:|
| Scenarier | 43.200 | 43.200 |
| Slutscore min / maks | 5 / 98 | 14 / 88 |
| Gennemsnit | 44,698 | 57,895 |
| Unikke heltalsscorer | 93 | 74 |
| Huntability min / maks | 0 / 100 | 23 / 75 |
| Transport min / maks | 0 / 100 | 0 / 100 |
| Mobilisering min / maks | 14 / 91 | 14 / 91 |
| Transport-mobilisering korrelation | 0,402 | 0,402 |
| Huntability-slutscore korrelation | 0,736 | 0,480 |
| Transport-slutscore korrelation | 0,651 | 0,843 |
| Mobilisering-slutscore korrelation | 0,406 | 0,561 |

Korrelationerne er kun egenskaber ved det ensartede syntetiske grid og de valgte vægte. De må ikke fortolkes som sammenhæng med ravfund.

Mobiliseringskomponenten har en indbygget bund på 14 i hele gridet. Ingen valgte scenarier rammer præcis 0 eller 100 i slutscore, men dette beviser ikke, at andre input eller regler aldrig kan gøre det.

## Foreløbig faglig konklusion

- `BEVAR`: Forklarlige komponenter, lokal retning, missing-proveniens og særskilte jagtformer.
- `TEST`: Store diskrete spring, især 6 m/s waders-vind, 13 m/s strandvind, 0,15 m/s strøm og 0,7 m waders-bølge.
- `TEST`: Dobbelt anvendelse af strøm, bølger og kysttags gennem flere komponenter.
- `TEST`: Om jagtbarhed skal være en vægtet del af samme score eller en separat gate/visning.
- `UTILSTRÆKKELIG EVIDENS`: Numeriske grænser, lineær 40/35/25-sum og maksimum af fresh-release/genmobilisering.

Ingen aktiv tærskel eller vægt ændres på dette grundlag.

## Næste validering

1. Kør samme audit på observerede distributionsintervaller uden at bruge fund som kalibrering endnu.
2. Opbyg en ablationsmatrix, hvor grupper fjernes én ad gangen, og mål redundant scorebevægelse.
3. Definér fund/nulfund/søgeindsats og geografisk hold-out, før predictive performance måles.
4. Test glatte kandidatfunktioner offline mod den låste nuværende score og senere mod hold-out-observationer.
5. Hold jagtbarhed/sikkerhed og fysisk ravtilstedeværelse som separate evalueringsmål.
## Produktionsverifikation #3265

- PR #11 blev merged som `e85de36d` og kørt i produktion `#32366326503`.
- Den fulde validering inkluderede følsomhedsauditens self-test og bestod sammen med releasegate, Supabase, Pages-build og deploy.
- Build-and-prepare tog 327 sekunder.
- Support `RavRadar-support-3265` og live `rr-20260820115954-210` matcher byte for byte.
- Den fulde browseraudit bestod 210 zoner, 673 dele, 420 aktuelle visninger og 2.100 prognosevisninger med nul score-, pile-, forklarings-, konsol-, side- eller HTTP-fejl.
- Auditværktøjet er dermed produktionsverificeret som score-neutralt; den aktive scorekode er uændret.