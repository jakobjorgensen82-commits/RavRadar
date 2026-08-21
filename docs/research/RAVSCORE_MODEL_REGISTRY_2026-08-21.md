# RavScore-modelregister 2026-08-21

## Aktive og historiske modeller

| ID | Status | Vægte | Formål |
| --- | --- | --- | --- |
| RRS-LEGACY-WEIGHTS-4.0.241 | Historisk sammenligning | 40/35/25 | Viser virkningen af den tidligere vægtning på samme komponenter |
| RRS-CURRENT-B0-4.0.247 | Aktiv produktion | 25/40/35 | Nuværende reference |
| RRS-CAND-A-SMOOTH-EVENT | Forskningskandidat | 25/40/35 | Glatte kurver og hændelseshukommelse |
| RRS-CAND-B-DELIVERY-RETENTION | Forskningskandidat | 25/40/35 | A plus levering og fastholdelse |
| RRS-CAND-C-WEAKEST-LINK | Forskningskandidat | 25/40/35 | B plus mild svageste-led-begrænsning |
| RRS-CAND-D-WAVE-DELIVERY-PATH | Forskningskandidat | 25/40/35 | Bevarer A-C og kræver en bølge-/strømunderstøttet leveringsvej; statisk fastholdelse er neutral |
| RRS-CAND-E-PHYSICAL-BOTTLENECK | Forskningskandidat | 25/40/35 | D plus højst 15 % reduktion, kun når mobilisering eller samlet transport/levering er under 35 |

## Stabile kandidatregler

| Regel-ID | Model | Mekanisme | Vigtig begrænsning |
| --- | --- | --- | --- |
| RRS-J1-SMOOTH-HUNTABILITY | A-C | Glat vind-/bølgekurve for søgeforhold | Ikke en sikkerhedsscore |
| RRS-M1-SMOOTH-MOBILISATION | A-C | Mættende bølge-, strøm- og energirespons | Ikke præcis bundskær |
| RRS-M2-EVENT-MEMORY | A-C | Varighed og gradvist aftagende hændelseshukommelse | Tidskurven er foreløbig |
| RRS-T1-LOCAL-CURRENT | A-C | Strømstyrke og retning mod den lokale kyst | Dybdebetydning er uafklaret |
| RRS-T2-DELIVERY | B-C | Skelner transport fra levering til kysten | Langstransport må ikke automatisk belønnes |
| RRS-T3-RETENTION | B-C | Moderat lokal fastholdelse og efterfase | Strandprofil er ikke fuldt observeret |
| RRS-G1-WEAKEST-LINK | C | Højst 25 % glat reduktion ved et klart svagt led | Må ikke blive en hård minimumsregel |
| RRS-T4-WAVE-CURRENT-PATH | D-E | Bølge- og strømstøtte danner leveringsvejen; timing kan ikke skabe levering alene | Kystnær bølgeomformning er ikke modelleret |
| RRS-G2-PHYSICAL-BOTTLENECK | E | Højst 15 % reduktion ved svag mobilisering eller samlet transport/levering | Forskningsprior, ikke fundkalibreret |

Alle kandidater er score-neutrale forskningsfunktioner. Se DEC-0046 og den samlede evidensanbefaling.
