# RavScore: automatisk gammel/nuværende/kandidat-sammenligning

**Datasæt:** rr-20260821094303-210
**Produktionsreference:** 2026-08-21T09:00:00.000Z
**Scorepåvirkning:** Ingen. Rapporten er read-only og kan ikke ændre RavScore.

## Hvad modellerne betyder

- **Gammel:** 40 % jagtbarhed, 35 % transport og 25 % mobilisering med de observerede komponenter.
- **Nuværende:** Produktionens 25/40/35 og aktive regler.
- **Kandidat A:** glatte kurver og hændelseshukommelse, stadig 25/40/35.
- **Kandidat B:** A plus særskilt levering og fastholdelse.
- **Kandidat C:** B plus en mild, glat svageste-led-begrænsning på højst 25 %.

## Rigtige produktionsposter: gammel mod nuværende vægtning

| Udsnit | Poster | Gammel middel | Nuværende middel | Forskel | Skiftet niveau |
| --- | ---: | ---: | ---: | ---: | ---: |
| Alle zone-/timeposter | 43.432 | 51,71 | 47,77 | -3,93 | 11.152 |
| Aktuelle zonevindere | 420 | 54,96 | 50,31 | -4,66 | 87 |
| Aktuelle kystdele | 1.346 | 50,06 | 44,15 | -5,91 | 429 |

Vigtigt: Dette er en ren vægtsammenligning på de samme observerede komponenter. Den måler ikke fundchance.

## Kandidat A-C på det deterministiske scenariegitter

### Waders - 43.200 scenarier

| Model | Middel | Forskel fra nu | Skiftet niveau | Sammenhæng med nu |
| --- | ---: | ---: | ---: | ---: |
| Gammel 40/35/25 | 44,7 | -3,89 | 11.600 (26,85 %) | 0,95 |
| Nuværende 25/40/35 | 48,59 | 0 | 0 (0 %) | 1 |
| Kandidat A | 44,51 | -4,09 | 18.191 (42,11 %) | 0,81 |
| Kandidat B | 47,78 | -0,82 | 16.604 (38,44 %) | 0,82 |
| Kandidat C | 45,87 | -2,73 | 17.477 (40,46 %) | 0,8 |

| Trinvis ændring | Middelforskel | Spænd | Skiftet niveau |
| --- | ---: | ---: | ---: |
| Nuværende til A: glatte regler/hændelse | -4,09 | -44 til 28 | 18.191 (42,11 %) |
| A til B: levering/fastholdelse | 3,27 | -7 til 13 | 10.056 (23,28 %) |
| B til C: svageste led | -1,91 | -12 til 0 | 4.371 (10,12 %) |

| Automatisk kontrolsituation | Antal | Nuværende | A | B | C |
| --- | ---: | ---: | ---: | ---: | ---: |
| Let at søge, svag mobilisering | 176 | 40,76 | 32,05 | 36,48 | 30,74 |
| Mobiliseret, dårlig transport | 1.820 | 43,2 | 37,72 | 45,42 | 44,49 |
| Fysisk mulighed, svært at søge | 6.142 | 60,09 | 58,92 | 59,68 | 59,24 |
| Alle led høje | 2.866 | 77,52 | 66,68 | 67,67 | 66,81 |
| Alle led lave | 2.232 | 22,08 | 25,2 | 29,34 | 25,95 |

### Strand - 43.200 scenarier

| Model | Middel | Forskel fra nu | Skiftet niveau | Sammenhæng med nu |
| --- | ---: | ---: | ---: | ---: |
| Gammel 40/35/25 | 57,9 | 1,05 | 6.097 (14,11 %) | 0,97 |
| Nuværende 25/40/35 | 56,84 | 0 | 0 (0 %) | 1 |
| Kandidat A | 52,21 | -4,63 | 15.428 (35,71 %) | 0,85 |
| Kandidat B | 55,48 | -1,36 | 13.462 (31,16 %) | 0,86 |
| Kandidat C | 53,22 | -3,62 | 15.383 (35,61 %) | 0,84 |

| Trinvis ændring | Middelforskel | Spænd | Skiftet niveau |
| --- | ---: | ---: | ---: |
| Nuværende til A: glatte regler/hændelse | -4,63 | -37 til 21 | 15.428 (35,71 %) |
| A til B: levering/fastholdelse | 3,27 | -7 til 13 | 9.123 (21,12 %) |
| B til C: svageste led | -2,26 | -12 til 0 | 4.461 (10,33 %) |

| Automatisk kontrolsituation | Antal | Nuværende | A | B | C |
| --- | ---: | ---: | ---: | ---: | ---: |
| Let at søge, svag mobilisering | 408 | 35,74 | 34,87 | 38,7 | 32,83 |
| Mobiliseret, dårlig transport | 1.820 | 51,66 | 45,4 | 53,11 | 52,08 |
| Fysisk mulighed, svært at søge | 2.127 | 67,47 | 63,98 | 64,78 | 64,27 |
| Alle led høje | 8.064 | 77,07 | 71,35 | 72,24 | 71,61 |
| Alle led lave | 744 | 28,54 | 29,77 | 33,9 | 29,95 |

## Fem automatisk udvalgte yderpunkter

1. **A: største stigning fra glatte regler/hændelse:** Waders: vind 7 m/s, bølge 0,8 m, strøm 0,5 m/s (tværgående strøm), tidligere maksimum 10 m/s og 2,5 m, hændelsesalder 1 timer, lokale fælder nej. Score 47 til 75 (+28).
2. **A: største fald fra glatte regler/hændelse:** Waders: vind 2 m/s, bølge 2,8 m, strøm 0,05 m/s (strøm mod kysten), tidligere maksimum 15 m/s og 0,5 m, hændelsesalder 8 timer, lokale fælder ja. Score 73 til 29 (-44).
3. **B: største levering-/fastholdelsesløft:** Waders: vind 2 m/s, bølge 0,8 m, strøm 0,05 m/s (tværgående strøm), tidligere maksimum 10 m/s og 2,5 m, hændelsesalder 8 timer, lokale fælder ja. Score 47 til 60 (+13).
4. **B: største levering-/fastholdelsesfald:** Waders: vind 2 m/s, bølge 1,5 m, strøm 0,5 m/s (strøm mod kysten), tidligere maksimum 5 m/s og 0,5 m, hændelsesalder 72 timer, lokale fælder nej. Score 70 til 63 (-7).
5. **C: største reduktion fra svageste fysiske led:** Waders: vind 2 m/s, bølge 0,1 m, strøm 0,2 m/s (strøm mod kysten), tidligere maksimum 5 m/s og 0,5 m, hændelsesalder 8 timer, lokale fælder nej. Score 60 til 48 (-12).

## Automatisk udvalgte forhold, som kræver faglig vurdering

1. Aktuelle kystdele med mindst middel totalscore, men et svagt fysisk led: 3 af 1.346.
2. Let søgbare aktuelle kystdele med svag transport eller mobilisering: 760 af 1.346.
3. Mobilisering uden tilstrækkelig transport: 0 af 1.346.
4. Transport uden tilstrækkelig mobilisering: 0 af 1.346.
5. Den tekniske kontrakt har 0 fejl i vægte, bidrag eller scoregrænser.

## Foreløbig beslutningsregel

Rapporten vælger ikke automatisk en vinder. Kandidat A-C er forskningspriorer med lav modelmodenhed. Før en produktionsændring skal vi især kontrollere, om B forbedrer levering uden at belønne passage, og om C reducerer fysiske paradokser uden at gøre én usikker variabel dominerende.

A-C er testet på et bredt syntetisk gitter, fordi det offentlige produktionsdatasæt ikke bærer hele den rå hændelseshistorik, som de nye regler kræver. Gammel mod nuværende er derimod målt direkte på produktionsposterne. Komplette ture bruges senere til egentlig kalibrering.

## Foreløbig anbefaling

- Behold den aktive 25/40/35-model. Den tidligere 40/35/25-model ligger 5,91 point højere i gennemsnit på de aktuelle kystdele, især fordi jagtbarhed tidligere fyldte mere.
- Aktivér ikke A-C samlet nu. Kandidat B ligger tæt på den nuværende middelværdi, men ændrer niveau i 31,16-38,44 % af scenarierne. Gennemsnittet skjuler derfor en stor omfordeling.
- C-gaten er nu afgrænset til mobilisering og levering. Den ændrer niveau i cirka 10,12-10,33 % og bør vurderes som et muligt sikkerhedsnet, ikke som en færdig model.
- Næste faglige kontrol er de fem yderpunkter ovenfor, især om B belønner reel levering eller blot passage. Først derefter vælges enkelte kandidatregler til et nyt shadow-forsøg.

Ingen geometri, land-/vandpunkter, U/V, datakildeprioritet eller produktionsscore er ændret.
