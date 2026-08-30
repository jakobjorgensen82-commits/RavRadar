# RavScore-modelregister – opdateret 2026-08-30

## Aktive og historiske modeller

| ID | Status | Vægte | Formål |
| --- | --- | --- | --- |
| RRS-COASTAL-PROCESS-INTEGRATED-1.1.0 | Samlet 4.0.315-releasekandidat; bliver eneste offentlige model efter sikker DEC-0110-cutover. Exact-head, merge, frisk produktion og offentlig kontrol mangler endnu | 20/50/30 | Én integreret kæde for tilførsel, 4/48-bølgemobilisering, 24/48-strømtransport, kausal energivægtet bølgeapproach med fire timers halveringstid og højst 15 % dæmpning i sidste led samt jagtbarhed; state 5.0.0 |
| RRS-LEGACY-WEIGHTS-4.0.241 | Historisk sammenligning | 40/35/25 | Viser virkningen af den tidligere vægtning på samme komponenter |
| RRS-CURRENT-B0-4.0.247 | Historisk rollback i Candidate G's aktiveringsforløb | 25/40/35 | Må ikke vælges som skjult eller global fallback efter DEC-0110-cutover |
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
| RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2 | Transportreference | 20/50/30 + strømreservoir + udtransportgate + vindstyret waders-loft | Faktisk kraftig udtransport med udtømt transportpotentiale giver slutscore 0, mens delscorer bevares; mobiliseringen er senere erstattet af DEC-0056 |
| RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3 | Produktionsverificeret offentlig model i 4.0.310; 4.0.311–4.0.314 er kun historiske source-/incidentspor. Privat migrations-/offline-/rollback-orakel, mens integreret er aktiv | 20/50/30 + afgrænset strømevidens + bølgeenergitilstand + udtransportgate + vindstyret waders-loft | Schema 2 kan migreres én gang til integreret state 5 og kan rekonstrueres ved en manuel hel rollback fra samme targettid uden dobbelt recovery-credit. Den må aldrig køre samtidig offentligt med den integrerede model; først efter controller-CAS, deploy og offentlig 210/673-verifikation kan den igen blive den ene offentlige model |

## Aktiv integreret kontrakt efter sikker cutover

| Regel-ID | Mekanisme | Vigtig begrænsning |
| --- | --- | --- |
| RRS-I1-EXACT-MODEL-STATE-BINDING | Model `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `5.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4`, komponent `ravscore-components-huntability-delivery-mobilisation-v4`, forklaring `ravscore-explanation-integrated-v4`, migration/rollback og begge SHA-felter følger generator, fire offentlige filer, checkpoint, private bundle og forbrugere | Parameterhash binder kontrakten; bundlehash binder den kanonisk normaliserede transitive implementeringslukning; mismatch er fatal |
| RRS-I2-CURRENT-SUPPLY-MEMORY | Kystnormal verificeret strøm bygger +10 eller nedbryder -8 pr. effektiv fuld time efter 0,03→0,15 m/s; fuld vægt 24 timer og cosinusfade til 0 ved 48 timer | Højst tre timers gap og 49 evidenspunkter; 13 timers udtransport kan tømme transport, men nulstiller ikke hele score |
| RRS-I3-WAVE-MOBILISATION-MEMORY | Relativ `Hs² × T` bygger en 0–100-tilstand med fire timers halveringstid og aftager over 48 timer | Missing bygger ikke; højst én times eksplicit recovery-credit; ikke fundkalibreret eller bundskær |
| RRS-I4-BOUNDED-WAVE-APPROACH-LAST-MILE | DMI-bølgeretning `FROM` roteres præcis én gang +180° til `TOWARD` mod den uændrede eksisterende kystnormal. En kausal energivægtet EWMA med fire timers halveringstid og en ældre hale danner `W`, `N` og `T`; `normalAlignment` er det energivægtede normalmoment divideret med aktivitet, `approach=clamp((normalAlignment+0,25)/1,25,0,1)`, `factor=clamp(1-0.15×W×(1-approach),0.85,1)` og `delivery=transportPotential×factor` præcis én gang | Højst 7,5 rå RavScore-point kan fjernes før slutafrunding; den viste heltalsscore kan derfor ændres 8 point; bølger må aldrig skabe eller øge transport/tilførsel. Aktiv retningsmissing er fail-closed. Kun `waveHeightM=0` er neutral exact calm; `wavePeriodS` er fortsat finit/ikke-negativ, og positiv højde med nulperiode er `INVALID`/fail-closed. `physicalDeliveryResolved=false` og fysisk interval er `null`: dette er en afgrænset teknisk proxy, ikke lokal surfzonepræcision |
| RRS-I5-HUNTABILITY | Strand uden jagtbarhedsloft; waders begrænses af vindstyret jagtbarhed med blødt WAM-fradrag | Søgeeffektivitet, ikke sikkerhed eller ukendt bund/dybde/adgang |
| RRS-I6-WATER-TIEBREAK | Vandstand giver 0 scorepoint; waders vælger ved eksakt scorelighed lavere kendt vand, så ikke-stigende vand, så tidligste; strand vælger tidligste | Faldende vand kan både ledsage udtransport og blotlægning/koncentration bag revler; intet universelt fysisk fortegn |
| RRS-I7-MIGRATION-ROLLBACK | Candidate G schema 2 migreres én gang via `candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4`; rollback via `integrated-schema5-to-candidate-g-schema2-v2` | Signeret afledt kystnormal currentevidens genvægtes uden rå U/V. Præcis 673 states skal dele target; wave-approach bruger 40 private præ-target-positioner fra coherent WAM-run pr. collection med same-cell provenance og kun højst fire timers same-run-interpolation. Udeladt hale ≤`1/1024`, konservativ rå-scorefejl ≤`0.01171875`. Fejl bevarer Candidate G offentlig; ingen syntetisk/offentlig historik. Ægte cold start er særskilt 48 private timepositioner + reel target; rollback får ingen dobbelt credit |
| RRS-I8-OPERATIONAL-ROLLBACK-CONTROLLER | Privat `ravScoreCandidateGRollback`; controller `ravscore-operational-model-activation`/`ravscore-operational-model-activation-v3`; status `INTEGRATED_ACTIVE`/fravær → `CANDIDATE_G_PENDING` → verificeret `CANDIDATE_G_ACTIVE` eller abort | Scheduler kan ikke initiere; `PENDING` stopper deploy; Candidate G-observationer er `calibrationEligible=false`; separat kontrakt-/bundle-SHA afventer slutregeneration |
| RRS-I9-ATOMIC-SAME-MODEL-EMERGENCY | Kun en fuldt atomisk, hashbundet continuation fra den samme integrerede model kan bruges som nøddrift, højst 72 timer gammel | Ingen cross-model fallback og ingen interpolation. `VERIFIED_ONLY` kan bruges til kalibrering; rekonstrueret og emergency er ikke kalibreringsegnede. Ture er aldrig i sig selv kalibreringsgrundlag |
| RRS-I10-STATIC-MORPHOLOGY-BOUNDARY | DDM's officielle 50 m-dybdegrid kan bruges som statisk forsknings-/forklaringskontekst | DDM har ikke dynamiske revler, ripkanaler eller en bølgeopløst surfzone og er derfor bevidst ikke scoreinput. Kystnormal, geometri og land-/vandpunkter flyttes ikke |

Den aktive variant i releasekandidaten er `COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2`, og profilen er `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4`. Endelige værdier for `modelContractSha256` og `modelBundleSha256` dokumenteres først efter regeneration på afsluttet head. 4.0.315 er fortsat releasekandidat: Candidate G er eneste offentlige model, indtil exact-head, merge, frisk produktion og offentlig desktop-/mobilkontrol er grønne.

## Historiske stabile kandidatregler

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
| RRS-M3-WAVE-ENERGY-MEMORY | G current-led RESEARCH-3 | Én kausal mobiliseringstilstand bygger på bølgehøjde² × periode og aftrappes 4/48 timer | Relativ proxy uden bunddybde; halveringstiderne er ikke fundkalibrerede |
| RRS-P1-CENTRAL-DERIVED-STATE | G current-led RESEARCH-3 | Transport genafspilles fra et fast 48-timers vindue af afledt kystnormal strøm; mobilisering fortsætter versions- og kontekstbundet | Kun tidspunkt, afledt styrke og mobiliseringsstate må persistéres; missing/tidsgab er fail-closed |

De historiske kandidater forbliver offline sammenligningsspor. DEC-0060 valgte `RESEARCH-3` i Candidate G's aktiveringsforløb, hvor `RRS-CURRENT-B0-4.0.247` var global rollback. DEC-0110 erstatter denne aktive struktur efter sikker cutover: den integrerede model er da eneste offentlige scoreejer, Candidate G er privat migrations-/offline-/rollback-orakel og kan kun igen blive den ene offentlige model gennem den eksplicitte manuelle hel-rollback ovenfor; `RRS-CURRENT-B0` er kun historik. Se DEC-0046, DEC-0058–0060 og DEC-0110.

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
