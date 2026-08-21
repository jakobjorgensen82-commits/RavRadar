# Kalibrering af mulighedsnormaliseret zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Hvad der testes

Zonens nuværende maksimum favoriserer zoner med mange forskelligt vendte kystdele. Analysen bruger den aktive RavScore på en neutral kyst og roterer de samme 576 scenarier over hele Danmark. Dermed skyldes forskelle mellem zoner kun deres antal og kombination af kystretninger.

Kandidaten er et vægtet og normaliseret soft-maximum blandet med den rå maksimumscore. Én kystdel er uændret. Hvis alle retninger er lige gode, er resultatet også uændret. En enkelt høj score blandt mange retninger korrigeres derimod mere. Retninger, der næsten er ens, tælles ikke som fulde uafhængige lodder. Rangeringens opløsning kalibreres samtidig, så ubegrundede decimaler ikke afgør mellem heltallige RavScore.

## Resultater

| Kandidat | Træning 1-2 | Træning 3-5 | Træning 6+ | Holdout 6+ | Holdout korrelation | Gns. korrektion | Bred støtte | Ændret nr. 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| softmax-t1-a0.6-r2 | 0.89x | 1.16x | 1.08x | 1.01x | 0.314 | 0.34 | 0.09 | 36.8% |
| softmax-t15-a0.1-r2 | 0.91x | 1.21x | 0.86x | 0.96x | 0.313 | 0.34 | 0.09 | 35.4% |
| softmax-t20-a0.1-r2 | 0.98x | 1.14x | 0.72x | 0.77x | 0.310 | 0.37 | 0.09 | 41.0% |
| softmax-t2-a0.3-r2 | 0.85x | 1.16x | 1.24x | 1.16x | 0.317 | 0.32 | 0.09 | 34.0% |
| softmax-t4-a0.2-r2 | 0.92x | 1.21x | 0.79x | 0.71x | 0.310 | 0.36 | 0.09 | 41.0% |
| softmax-t10-a0.1-r2 | 0.83x | 1.17x | 1.32x | 1.34x | 0.318 | 0.29 | 0.09 | 27.8% |
| softmax-t1-a0.5-r2 | 0.82x | 1.14x | 1.45x | 1.44x | 0.320 | 0.29 | 0.09 | 29.5% |
| softmax-t2-a0.4-r2 | 0.99x | 1.17x | 0.56x | 0.57x | 0.305 | 0.43 | 0.09 | 44.4% |
| softmax-t1-a0.8-r2 | 1.02x | 1.14x | 0.51x | 0.51x | 0.304 | 0.45 | 0.10 | 47.6% |
| softmax-t4-a0.1-r1 | 0.75x | 1.49x | 0.82x | 0.83x | 0.322 | 0.09 | 0.00 | 27.4% |
| softmax-t1-a0.4-r2 | 0.79x | 1.12x | 1.64x | 1.70x | 0.324 | 0.25 | 0.09 | 23.3% |
| softmax-t2-a0.2-r2 | 0.78x | 1.12x | 1.67x | 1.70x | 0.324 | 0.24 | 0.09 | 22.9% |

Automatisk mindste tilstrækkelige kandidat: **ingen kandidat bestod kravene**.

Ingen af de afprøvede styrker er endnu både fair og tilstrækkeligt skånsom. Derfor må ingen regel aktiveres.

## Beskyttelse af reelle resultater

- En zone med én kystdel ændres matematisk ikke.
- Flere ens retninger giver ikke flere selvstændige lodder.
- Mange samtidigt gode retninger holder den normaliserede score tættere på maksimum.
- En enkelt god retning blandt mange skal have et større råt forspring for at vinde.
- Den offentligt viste RavScore er ikke ændret i denne analyse.

## Begrænsninger og næste kontrol

- Scenarierne er systematiske forskningsscenarier, ikke observerede fund.
- Den aktive RavScores egne antagelser følger med ind i resultatet.
- Rumlige forskelle i vejr og lokal ravtilgængelighed er bevidst neutraliseret for at isolere lotterieffekten.
- En kandidat skal bagefter kontrolleres mod de 107 faktiske prognosetimer og senere mod nationale turdata.
- Ingen kandidat må aktiveres uden ejerbeslutning og fuld produktionskontrol.
