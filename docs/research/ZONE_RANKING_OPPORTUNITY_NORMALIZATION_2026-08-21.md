# Kalibrering af mulighedsnormaliseret zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Hvad der testes

Zonens nuværende maksimum favoriserer zoner med mange forskelligt vendte kystdele. Analysen bruger den aktive RavScore på en neutral kyst og roterer de samme 576 scenarier over hele Danmark. Dermed skyldes forskelle mellem zoner kun deres antal og kombination af kystretninger.

Kandidaten er et vægtet og normaliseret soft-maximum. Én kystdel er uændret. Hvis alle retninger er lige gode, er resultatet også uændret. En enkelt høj score blandt mange retninger korrigeres derimod mere. Retninger, der næsten er ens, tælles ikke som fulde uafhængige lodder.

## Resultater

| Kandidat | Træning 1-2 | Træning 3-5 | Træning 6+ | Holdout 6+ | Holdout korrelation | Gns. korrektion | Bred støtte | Ændret nr. 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| softmax-tau-1 | 1.67x | 0.21x | 0.05x | 0.06x | 0.298 | 0.63 | 0.11 | 84.4% |
| softmax-tau-2 | 1.69x | 0.19x | 0.05x | 0.06x | 0.266 | 1.16 | 0.17 | 85.4% |
| softmax-tau-3 | 1.68x | 0.21x | 0.04x | 0.06x | 0.238 | 1.62 | 0.20 | 85.4% |
| softmax-tau-4 | 1.68x | 0.20x | 0.04x | 0.06x | 0.212 | 1.99 | 0.21 | 85.4% |
| softmax-tau-5 | 1.69x | 0.19x | 0.04x | 0.06x | 0.190 | 2.30 | 0.22 | 85.4% |
| softmax-tau-6 | 1.69x | 0.19x | 0.04x | 0.06x | 0.171 | 2.57 | 0.23 | 85.4% |
| softmax-tau-8 | 1.69x | 0.19x | 0.04x | 0.06x | 0.141 | 2.97 | 0.24 | 85.4% |
| softmax-tau-10 | 1.69x | 0.18x | 0.04x | 0.06x | 0.119 | 3.27 | 0.24 | 85.4% |
| softmax-tau-12 | 1.70x | 0.18x | 0.04x | 0.06x | 0.102 | 3.49 | 0.25 | 85.4% |
| softmax-tau-15 | 1.70x | 0.17x | 0.04x | 0.06x | 0.084 | 3.73 | 0.25 | 85.4% |
| softmax-tau-20 | 1.70x | 0.16x | 0.04x | 0.06x | 0.064 | 3.99 | 0.25 | 86.1% |
| softmax-tau-30 | 1.71x | 0.15x | 0.04x | 0.06x | 0.043 | 4.26 | 0.26 | 86.1% |

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
