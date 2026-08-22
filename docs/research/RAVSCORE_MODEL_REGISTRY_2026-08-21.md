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
| RRS-CANDIDATE-G-24H-LIN-4.0.252 | Forskningskandidat | 20/45/35 | Kandidat E med kapacitetsbevarende 24-timers historik og højst 10 % direkte vind i historiksignalet |
| RRS-CANDIDATE-G-50-50-LIN-4.0.252 | Forskningskandidat | 20/45/35 | Kandidat E med 50/50-blanding af 24- og 48-timers historik |
| RRS-CANDIDATE-G-48H-LIN-4.0.252 | Forskningskandidat | 20/45/35 | Kandidat E med langsomt 48-timers historikspor |
| RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-4.0.252 | Sammenligningsreference efter DEC-0051 | 20/45/35 | Samme 50/50-historik uden direkte vindbidrag |
| RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-WADERS-LIMIT-4.0.254 | Historisk waders-reference | 20/45/35 + synligt waders-loft | Strand uændret; waders begrænses af jagtbarhed; erstattet som foretrukken variant af DEC-0054/0055 |
| RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED-4.0.258 | Waders-kontraktreference | 20/50/30 + vindstyret waders-loft | Vind er hovedsignal, WAM er blødt fradrag; transportfortolkningen er senere erstattet af DEC-0055 |
| RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-1 | Historisk strømstyret revisionsspor | 20/50/30 + strømreservoir + vindstyret waders-loft | Transportpotentiale 0 fra 13 timer, men totalscore kunne fortsat være 35; erstattet af ejerens slutscorebeslutning |
| RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2 | Foretrukken score-neutral forskningsvariant | 20/50/30 + strømreservoir + udtransportgate + vindstyret waders-loft | Faktisk kraftig udtransport med udtømt transportpotentiale giver slutscore 0, mens delscorer bevares; ingen offentlig aktivering |

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
| RRS-J2-WADERS-WIND-UNDER-6 | G waders-limit | 100 vindpoint til og med 6 m/s og monotont fald over 6 | Kun søgemetodens effektivitet; bølger er separat, ikke sikkerhed |
| RRS-G3-WADERS-HUNTABILITY-LIMIT | G waders-limit | Endelig waders-score kan ikke overstige jagtbarheden | Strand er uændret; regler må ikke efterfølgende løfte over loftet |
| RRS-T6-CURRENT-LED-RESERVOIR | G current-led | Verificeret kystnormal strøm bygger/nedbryder 0–100 transportpotentiale | Strømgrænse, starttilstand og eventuelt passivt tab er ukalibreret |
| RRS-T7-DEPENDENT-WAVE-LANDING | G current-led | Bølger/timing kan kun dæmpe allerede eksisterende levering med højst 15 % | Bølger kan ikke oprette transport; andelen er en forskningsprior |
| RRS-G4-OUTFLOW-EXHAUSTION-ZERO | G current-led RESEARCH-2 | Faktisk kraftig udtransport og transportpotentiale 0 tvinger slutscoren til 0 | Start 0, missing, neutral strøm eller svag modstrøm må ikke alene udløse reglen |

Alle kandidater er score-neutrale forskningsfunktioner. Se DEC-0046 og den samlede evidensanbefaling.

## Registertilfoejelse efter exact-commit-koersel 32521046654

| Model | Vaegt | Status | Kort begrundelse |
|---|---:|---|---|
| Kandidat F | 15/50/35 | Afvist som direkte produktionskandidat; beholdt som foelsomhedsmaessig yderkant | Bedre kapacitetsafhaengig retning, men for bred niveausaenkning og stor scorebaandsudskiftning |
| Kandidat G | Foreloebigt 20/45/35 | Naeste private arbejdshypotese | Korrigeret E-procesmodel, mild gate, ingen udokumenterede statiske kystbonusser og planlagt historisk stroem-/vindhukommelse |

### Praecisering af transportregler

- `RRS-T3`: Dynamisk lokal fastholdelse er endnu ikke implementeret. Statiske bonuspoint for rev, lavt vand og aalegraes er sat til nul, indtil der findes tilstraekkelig evidens og en dynamisk mekanisme.
- `RRS-T5`: Retningsvirkning skal vaere kapacitetsstyret. Svag stroem eller lav boelgeenergi maa ikke give samme retningspoint som en kraftig haendelse.
- `RRS-H1` (planlagt): Stroem og vind skal have regimehukommelse baseret paa retning, styrke, varighed, stabilitet, vendingsalder og nettoeffekt med aftagende vaegt bagud i tiden.
- `RRS-H2` (planlagt): Vindens direkte og indirekte virkning skal adskilles, saa boelger, stroem, vandstand og direkte vind ikke dobbeltregner samme haendelse.

Det reproducerbare resultat og den fulde beslutning findes i `RAVSCORE_PAIRED_DIRECTION_AND_WEIGHT_RESULT_2026-08-21.md`.

## Kandidat G historikspor

- `RRS-G-HISTORY-ACTIVE-24H` er den foreloebige aktive regimeshortlist.
- `RRS-G-HISTORY-BACKGROUND-48H` er den foreloebige langsomme baggrundsshortlist.
- Ingen af ID'erne er en produktionsregel eller pointkoefficient.
- Naeste private matrix sammenligner hvert spor alene og sammen i en lille, foruddefineret foelsomhedstest.
- Direkte vind, vindstressproxy, boelgeenergi og stroem skal kunne slaas fra hver for sig, saa samme fysiske paavirkning ikke dobbeltregnes.
- Evidens: `RAVSCORE_REGIME_MEMORY_RESULT_2026-08-21.md`.

## Kandidat G 24/48-afgraensning efter ablation

- `RRS-G-HISTORY-ACTIVE-24H`, en 50/50-foelsomhedsvariant og `RRS-G-HISTORY-BACKGROUND-48H` gaar videre til historisk replay.
- 75/25 og 25/75 udgaar af naeste matrix, fordi de ikke tilfoejede tydeligt forskellig adfaerd i de 12 forloeb.
- Lineaer vind er hovedanalysen for direkte vind. Vindstressproxy er kun yderkant.
- En no-direct-wind-ablation er obligatorisk, saa indirekte vind gennem boelger og stroem ikke dobbeltregnes.
- Ingen af disse poster er produktionsregler, point eller godkendte koefficienter.
- Evidens: `RAVSCORE_HISTORY_TRACK_ABLATION_RESULT_2026-08-22.md`.

## Kandidat G replayresultat

- 24 timer, 50/50 og 48 timer adskiller sig højst ét point i de 1.460 historiske evalueringer; 50/50 er kun praktisk repræsentant, ikke fundkalibreret vinder.
- Direkte vind flytter 0,086 point absolut i gennemsnit og har ikke dokumenteret selvstændig merværdi. `RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-4.0.252` er derfor reference for næste nationale shadow.
- Kandidat G skifter 474 af 1.460 referencebånd mod aktiv model og kan ikke kaldes en mindre justering.
- Et kanonisk waders-scenarie gav jagtbarhed 0 og score omkring 79 på referencen. DEC-0051's nye variant begrænser dette til 0, bevarer stranden og går videre score-neutralt; offentlig aktivering mangler fortsat samlet go/no-go.
- National exact-head-shadow `32554012542` bekræfter næsten identiske 24/48/no-direct-spor. G 50/50 ligger i gennemsnit 5,50 point under aktiv model for strand og 3,74 for waders på 243 scorede dele; 430 dele er u-scorede, og retention-featurecoverage er nul.
- Evidens: `RAVSCORE_CANDIDATE_G_DECISION_BASIS_2026-08-22.md`.
