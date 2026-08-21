# Empirisk nulmodel for fair national zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Metode

For hver zone beregnes dens egen nulfordeling for 2880 neutrale træningsscenarier. Fordelingen viser, hvor høj zonens bedste resultat normalt bliver alene på grund af dens antal og kombination af retninger. Holdout bruger 2880 andre retninger.

Et aktuelt zoneresultat oversættes til samme percentil i en enkelt kystretnings referencefordeling. Resultatet kan kun sænkes, aldrig løftes. Soft-maximum gør samtidig bred støtte stærkere end én isoleret høj del, og næsten ens retninger vægtes efter deres faktiske andel af retningscirklen.

| Kandidat | 1-2 dele | 3-5 dele | 6+ dele | Korrelation | Gns. korrektion | Bred støtte | Isoleret top | Høj+bred stadig God |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| empirical-null-softmax-1 | 1.62x | 0.26x | 0.18x | -0.000 | 4.80 | 0.99 | 12.04 | 92.0% |
| empirical-null-softmax-2 | 1.59x | 0.31x | 0.18x | -0.000 | 4.80 | 0.92 | 12.51 | 92.0% |
| empirical-null-softmax-4 | 1.54x | 0.38x | 0.23x | -0.000 | 4.80 | 0.80 | 13.13 | 93.4% |
| empirical-null-softmax-6 | 1.52x | 0.41x | 0.24x | -0.000 | 4.80 | 0.70 | 13.33 | 94.4% |
| empirical-null-softmax-10 | 1.50x | 0.42x | 0.28x | -0.000 | 4.81 | 0.58 | 13.28 | 95.0% |
| empirical-null-softmax-15 | 1.48x | 0.45x | 0.29x | -0.000 | 4.81 | 0.51 | 13.07 | 95.5% |
| empirical-null-softmax-20 | 1.48x | 0.46x | 0.28x | -0.000 | 4.81 | 0.48 | 12.90 | 96.0% |

Baseline for 6+-zoner: **2.13x**.  
Valgt mindste tilstrækkelige kandidat: **ingen kandidat bestod kravene**.

Der er endnu ikke dokumenteret en kandidat, som både fjerner mulighedsfordelen og bevarer de krævede sikkerhedsegenskaber.

## Sikkerhed og begrænsninger

- Én kystdel skal forblive matematisk uændret.
- Den offentlige RavScore, pile, forklaring og geometri er ikke ændret.
- Nulmodellen bruger den aktive RavScore og arver derfor dens faglige begrænsninger.
- Rumlige vejrgradienter er neutraliseret for at isolere lotterieffekten.
- En bestået syntetisk kandidat skal stadig prøves mod de 107 faktiske timer og ejerens konkrete zoneeksempler.
- Ingen automatisk aktivering er tilladt.
