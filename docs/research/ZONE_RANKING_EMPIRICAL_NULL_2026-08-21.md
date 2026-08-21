# Empirisk nulmodel for fair national zonerangering

Dato: 2026-08-21

Status: Privat, score-neutral analyse. Ingen produktionsregel er aktiveret.

## Metode

For hver zone beregnes dens egen nulfordeling for 2880 neutrale træningsscenarier. Fordelingen viser, hvor høj zonens bedste resultat normalt bliver alene på grund af dens antal og kombination af retninger. Holdout bruger 2880 andre retninger.

Et aktuelt zoneresultat oversættes til samme percentil i en enkelt kystretnings referencefordeling. Resultatet kan kun sænkes, aldrig løftes. Soft-maximum gør samtidig bred støtte stærkere end én isoleret høj del, og næsten ens retninger vægtes efter deres faktiske andel af retningscirklen.

| Kandidat | 1-2 dele | 3-5 dele | 6+ dele | Korrelation | Gns. korrektion | Bred støtte | Isoleret top | Høj+bred stadig God |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| empirical-null-5pct | 1.40x | 0.56x | 0.36x | 0.317 | 0.24 | 0.02 | 0.65 | 99.1% |
| empirical-null-10pct | 1.41x | 0.56x | 0.32x | 0.301 | 0.48 | 0.05 | 1.29 | 99.1% |
| empirical-null-15pct | 1.42x | 0.54x | 0.31x | 0.285 | 0.72 | 0.07 | 1.94 | 99.1% |
| empirical-null-20pct | 1.44x | 0.52x | 0.29x | 0.268 | 0.96 | 0.10 | 2.58 | 99.1% |
| empirical-null-25pct | 1.45x | 0.50x | 0.29x | 0.252 | 1.20 | 0.12 | 3.23 | 99.1% |
| empirical-null-30pct | 1.45x | 0.50x | 0.29x | 0.235 | 1.44 | 0.14 | 3.87 | 99.0% |
| empirical-null-35pct | 1.45x | 0.49x | 0.29x | 0.219 | 1.68 | 0.17 | 4.52 | 99.0% |
| empirical-null-40pct | 1.46x | 0.49x | 0.29x | 0.202 | 1.93 | 0.19 | 5.16 | 99.0% |
| empirical-null-45pct | 1.46x | 0.49x | 0.29x | 0.185 | 2.17 | 0.21 | 5.81 | 99.0% |
| empirical-null-50pct | 1.46x | 0.49x | 0.28x | 0.168 | 2.41 | 0.24 | 6.45 | 99.0% |
| empirical-null-55pct | 1.46x | 0.49x | 0.28x | 0.151 | 2.65 | 0.26 | 7.10 | 96.0% |
| empirical-null-60pct | 1.46x | 0.48x | 0.28x | 0.134 | 2.89 | 0.29 | 7.74 | 96.0% |
| empirical-null-65pct | 1.46x | 0.48x | 0.28x | 0.117 | 3.13 | 0.31 | 8.39 | 96.0% |
| empirical-null-70pct | 1.46x | 0.48x | 0.28x | 0.100 | 3.37 | 0.33 | 9.03 | 96.0% |
| empirical-null-75pct | 1.46x | 0.48x | 0.28x | 0.083 | 3.61 | 0.36 | 9.68 | 96.0% |
| empirical-null-80pct | 1.47x | 0.47x | 0.28x | 0.066 | 3.85 | 0.38 | 10.32 | 96.0% |
| empirical-null-85pct | 1.47x | 0.47x | 0.28x | 0.049 | 4.09 | 0.41 | 10.97 | 96.0% |
| empirical-null-90pct | 1.47x | 0.47x | 0.28x | 0.033 | 4.33 | 0.43 | 11.61 | 96.0% |
| empirical-null-95pct | 1.47x | 0.47x | 0.28x | 0.016 | 4.57 | 0.45 | 12.26 | 96.0% |
| empirical-null-100pct | 1.48x | 0.46x | 0.28x | -0.000 | 4.81 | 0.48 | 12.90 | 96.0% |

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
