# RavScore: 24/48-historikspor og separate ablationer 2026-08-22

## Status

Dette er privat, score-neutralt forskningsarbejde efter PR #57. Analysen bruger de samme 12 udvalgte 96-timersforløb og fire områder som den første regimehukommelsesanalyse. Den aktive RavScore 25/40/35, offentlig runtime, DMI-first, geometri og alle land-/vandpunkter er uændrede.

Den private rapport ligger kun i den lokalt Git-ignorerede analysecache. Rapporten gemmer ikke rå vejrværdier, U/V, koordinater eller credentials.

## Metode

Den foruddefinerede matrix sammenligner:

- 24 timers aktivt spor alene;
- 75 % aktivt / 25 % baggrund;
- 50 % aktivt / 50 % baggrund;
- 25 % aktivt / 75 % baggrund;
- 48 timers baggrundsspor alene.

Hvert tidspunkt bruger kun den aktuelle og tidligere prøver i samme forløb. En deterministisk kontrakt beviser, at en senere prøve ikke kan ændre tidligere hukommelse eller normalisering.

Strøm, bølgeenergi, lineær vind og vindstressproxy måles først hver for sig. Til ablation sammenlignes to alternative treled:

1. strøm + bølgeenergi + lineær vind;
2. strøm + bølgeenergi + vindstressproxy.

De tre bidrag normaliseres kausalt og får kun i denne følsomhedstest samme tredjedel. Ved ablation sættes ét bidrag til nul uden at opskalere de øvrige. Det er en enhedsløs test af overlap og fortegnsfølsomhed, ikke en kandidatvægt eller RavScore-funktion.

## 24 og 48 timer ligger tæt, men baggrundssporet er roligere

| Fysisk spor | Fortegnsskift 24 t. | Fortegnsskift 50/50 | Fortegnsskift 48 t. | Direkte 24/48-fortegnsuenighed |
| --- | ---: | ---: | ---: | ---: |
| Strøm | 14 | 14 | 10 | 2 % |
| Bølgeenergi | 4 | 4 | 4 | 1 % |
| Lineær vind | 8 | 8 | 8 | 2 % |
| Vindstressproxy | 6 | 6 | 6 | 1 % |

Den gennemsnitlige enhedsløse afstand mellem 24 og 48 timer er cirka 0,05 for alle fire spor. Blandingerne ligger jævnt mellem enderne. 75/25 giver ikke en tydelig anden adfærd end 24 timer, og 25/75 giver kun strømsporet to færre fortegnsskift end 50/50.

Det begrunder en smallere næste matrix med **24 alene, 50/50 og 48 alene**. Det er en cost/benefit-afgrænsning, ikke valg af en endelig blandingsandel.

## Korrelation skal skilles mellem hændelser og inden i hændelser

For 50/50-sporet gav lineær vind følgende korrelationer:

| Par | Samlet | Hændelsescentreret | Median i de 12 hændelser |
| --- | ---: | ---: | ---: |
| Strøm / bølgeenergi | 0,66 | 0,18 | 0,08 |
| Strøm / lineær vind | 0,50 | 0,04 | 0,14 |
| Bølgeenergi / lineær vind | 0,75 | 0,36 | 0,81 |

De høje samlede strømkorrelationer skyldes derfor i høj grad forskelle mellem de udvalgte hændelser. Bølge/vind-overlap består derimod tydeligt inden i hændelserne. Vindstressproxyen øger bølge/vind-korrelationen til 0,79 samlet, 0,37 hændelsescentreret og 0,82 i median pr. hændelse. Den kvadrerede vind er altså ikke et mere uafhængigt direkte transportbevis.

## Separate ablationer

For 50/50-sporet ændrede udeladelse af et bidrag det samlede fortegn således:

| Vindbeskrivelse | Uden strøm | Uden bølgeenergi | Uden vind |
| --- | ---: | ---: | ---: |
| Lineær vind | 11 % | 5 % | 10 % |
| Vindstressproxy | 8 % | 12 % | 11 % |

Forskellen er stærkt hændelsesafhængig:

- I modstridende bølge-/strømforløb ændrede lineær vind fortegnet i 58 % af timerne, mens bølgeablation ændrede 5 %. Med vindstress ændrede bølgeablation 27 %, selv om vindablation fortsat ændrede 58 %.
- I pålandsleveringsforløb ændrede lineær vindablation 6 %, bølgeablation 12 % og strømablation 22 %. Med vindstress blev tallene 0 %, 20 % og 19 %.
- I fralandsforløbene ændrede ingen enkelt ablation fortegnet, fordi de tre spor overvejende pegede samme vej.

Resultatet viser, at alle tre spor kan være vigtige, men også at valg af vindtransformation flytter attributionen markant. Direkte vind må derfor ikke lægges oven i bølger og strøm som et selvstændigt fuldt bidrag uden en eksplicit dobbeltregningsgate.

## Beslutning for næste private replay

1. Bevar 24 timer alene, 50/50 og 48 timer alene som den lille næste følsomhedsmatrix.
2. Brug lineær vind som konservativ hovedanalyse. Vindstressproxy bevares kun som følsomhedsmæssig yderkant.
3. Kør også en variant uden direkte vind, så indirekte vind gennem bølger og strøm kan sammenlignes med et særskilt direkte vindbidrag.
4. Integrér ikke endnu historiksporene som RavScore-point. Først køres historisk kandidat-G-replay og parret retningskontrol med separate komponentablationer.
5. Derefter kræves national scenariematrix, national shadow, ekspertregler, jagtbarhed, vadesikkerhed samt sammenhæng mellem pile, score og forklaring.

## Begrænsninger

- Kun 12 udvalgte hændelser og fire områder indgår.
- Hændelserne er ikke et repræsentativt udsnit af danske ravfund.
- DMI-stationsvind er ikke nødvendigvis lokal strandvind.
- Korrelation og ablation er modeladfærd, ikke kausal dokumentation for ravtransport.
- Kausal normalisering og samme tredjedel er analyseværktøjer, ikke fysiske koefficienter.
- Der findes endnu ikke tilstrækkelige komplette fund-/nul-fundsture til kalibrering.

## Reproducerbarhed

- `js/core/ravscore-regime-memory.js`
- `scripts/test-ravscore-regime-memory.mjs`
- `scripts/analyze-ravscore-history-track-ablation.mjs`
- privat input: eksisterende historiske forcing- og vindfeatures i den Git-ignorerede cache
- privat output: `ravscore-history-track-ablation-analysis.json` og `.txt`
