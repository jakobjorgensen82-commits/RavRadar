# Sammenligning af korrektioner for national zonerangering

Dato: 2026-08-21

Dataset: `rr-20260821154200-210`

Omfang: 210 zoner / 673 kystdele / 12 rangeringer

## Formaal

Denne private foelsomhedsanalyse sammenligner faa mulige korrektioner af de nationale top-5-lister. Den lokale RavScore, den vindende kystdel og alle offentlige forklaringer er uaendrede.

Hver rangering indeholder 192-210 zoner med en gyldig lokal kystdelsscore. Zoner uden en gyldig lokal prognosetime faar ikke en kunstig fallbackscore.

| Kandidat | 6+ dele i top-5 | Overrepraesentation | Nye top-5-medlemmer | Aendrede foerstepladser | Gns. top-5-justering | Maks. justering | Eksempler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Ingen korrektion | 25/60 | 3.50x | 0 | 0 | 0.00 | 0.00 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 6/12 |
| Raa antal-straf, maks. 4 point | 19/60 | 2.66x | 6 | 1 | 0.87 | 4.00 | Falster nord og Orehoved: 7/12; Falster vest og Nysted Nor munding: 1/12 |
| Retningsmulighed, maks. 4 point | 24/60 | 3.36x | 2 | 3 | 2.47 | 3.94 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 5/12 |
| Retning og vinderstoette, maks. 2 point | 25/60 | 3.50x | 2 | 2 | 0.96 | 1.89 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 6/12 |
| Retning og vinderstoette, maks. 4 point | 21/60 | 2.94x | 5 | 3 | 1.70 | 3.78 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 4/12 |
| Retning og vinderstoette, maks. 6 point | 19/60 | 2.66x | 8 | 3 | 2.32 | 5.68 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 2/12 |
| Retning og vinderstoette, maks. 8 point | 17/60 | 2.38x | 12 | 4 | 2.83 | 7.57 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 1/12 |
| Retning og vinderstoette, maks. 10 point | 15/60 | 2.10x | 15 | 6 | 3.31 | 9.46 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 1/12 |
| Retning og vinderstoette, maks. 12 point | 12/60 | 1.68x | 17 | 6 | 3.69 | 11.35 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og vinderstoette, maks. 14 point | 10/60 | 1.40x | 19 | 7 | 4.00 | 13.25 | Falster nord og Orehoved: 5/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og vinderstoette, maks. 16 point | 9/60 | 1.26x | 20 | 7 | 4.41 | 15.14 | Falster nord og Orehoved: 5/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og vinderstoette, maks. 18 point | 4/60 | 0.56x | 25 | 7 | 3.99 | 17.03 | Falster nord og Orehoved: 2/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og vinderstoette, maks. 20 point | 2/60 | 0.28x | 28 | 7 | 3.68 | 18.92 | Falster nord og Orehoved: 1/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og gentaget støtte, maks. 18 point, skala 2 | 14/60 | 1.96x | 21 | 7 | 3.53 | 17.03 | Falster nord og Orehoved: 3/12; Falster vest og Nysted Nor munding: 3/12 |
| Retning og gentaget støtte, maks. 18 point, skala 4 | 9/60 | 1.26x | 22 | 7 | 3.97 | 17.03 | Falster nord og Orehoved: 3/12; Falster vest og Nysted Nor munding: 2/12 |
| Retning og gentaget støtte, maks. 18 point, skala 8 | 7/60 | 0.98x | 23 | 7 | 4.00 | 17.03 | Falster nord og Orehoved: 3/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og gentaget støtte, maks. 22 point, skala 2 | 11/60 | 1.54x | 23 | 7 | 3.91 | 20.82 | Falster nord og Orehoved: 3/12; Falster vest og Nysted Nor munding: 2/12 |
| Retning og gentaget støtte, maks. 22 point, skala 4 | 6/60 | 0.84x | 26 | 7 | 3.85 | 20.82 | Falster nord og Orehoved: 1/12; Falster vest og Nysted Nor munding: 1/12 |
| Retning og gentaget støtte, maks. 22 point, skala 8 | 4/60 | 0.56x | 28 | 7 | 3.78 | 20.82 | Falster nord og Orehoved: 1/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og gentaget støtte, maks. 26 point, skala 2 | 9/60 | 1.26x | 26 | 7 | 3.95 | 24.60 | Falster nord og Orehoved: 2/12; Falster vest og Nysted Nor munding: 2/12 |
| Retning og gentaget støtte, maks. 26 point, skala 4 | 4/60 | 0.56x | 28 | 7 | 4.06 | 24.60 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 1/12 |
| Retning og gentaget støtte, maks. 26 point, skala 8 | 2/60 | 0.28x | 30 | 7 | 3.79 | 24.60 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og gentaget støtte, maks. 30 point, skala 2 | 8/60 | 1.12x | 29 | 7 | 4.08 | 28.39 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 2/12 |
| Retning og gentaget støtte, maks. 30 point, skala 4 | 3/60 | 0.42x | 30 | 7 | 4.16 | 28.39 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 1/12 |
| Retning og gentaget støtte, maks. 30 point, skala 8 | 1/60 | 0.14x | 31 | 7 | 4.30 | 28.39 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning med bredt støtteværn, maks. 18 point | 6/60 | 0.84x | 26 | 7 | 1.48 | 17.03 | Falster nord og Orehoved: 1/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning med bredt støtteværn, maks. 19 point | 6/60 | 0.84x | 26 | 7 | 1.56 | 17.98 | Falster nord og Orehoved: 1/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning med bredt støtteværn, maks. 20 point | 3/60 | 0.42x | 28 | 7 | 1.17 | 18.92 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning med bredt støtteværn, maks. 22 point | 3/60 | 0.42x | 28 | 7 | 1.29 | 20.82 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning med bredt støtteværn, maks. 24 point | 2/60 | 0.28x | 29 | 7 | 1.37 | 22.71 | Falster nord og Orehoved: 0/12; Falster vest og Nysted Nor munding: 0/12 |
| Retning og vinderstoette, maks. 4 point, kun naesten lige scorer | 21/60 | 2.94x | 5 | 3 | 1.70 | 3.78 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 4/12 |

## Timed foelsomhedsanalyse

Det samme kandidatinterval er desuden koert paa 214 nationale timerangeringer fra 107 forskellige prognosetimer og begge tilstande. Hver time indeholder 191-210 zoner med en gyldig lokal score.

| Kandidat | 6+ dele i top-5 | Overrepraesentation | Nye top-5-medlemmer | Aendrede foerstepladser | Gns. top-5-justering | Maks. justering | Eksempler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Ingen korrektion | 469/1070 | 3.68x | 0 | 0 | 0.00 | 0.00 | Falster nord og Orehoved: 102/214; Falster vest og Nysted Nor munding: 128/214 |
| Raa antal-straf, maks. 4 point | 401/1070 | 3.15x | 86 | 20 | 1.13 | 4.00 | Falster nord og Orehoved: 92/214; Falster vest og Nysted Nor munding: 96/214 |
| Retningsmulighed, maks. 4 point | 415/1070 | 3.26x | 114 | 19 | 2.34 | 3.94 | Falster nord og Orehoved: 90/214; Falster vest og Nysted Nor munding: 119/214 |
| Retning og vinderstoette, maks. 2 point | 452/1070 | 3.55x | 52 | 10 | 0.94 | 1.89 | Falster nord og Orehoved: 96/214; Falster vest og Nysted Nor munding: 126/214 |
| Retning og vinderstoette, maks. 4 point | 412/1070 | 3.23x | 95 | 17 | 1.78 | 3.78 | Falster nord og Orehoved: 90/214; Falster vest og Nysted Nor munding: 117/214 |
| Retning og vinderstoette, maks. 6 point | 375/1070 | 2.94x | 149 | 34 | 2.49 | 5.68 | Falster nord og Orehoved: 83/214; Falster vest og Nysted Nor munding: 103/214 |
| Retning og vinderstoette, maks. 8 point | 326/1070 | 2.56x | 214 | 56 | 3.01 | 7.57 | Falster nord og Orehoved: 81/214; Falster vest og Nysted Nor munding: 82/214 |
| Retning og vinderstoette, maks. 10 point | 282/1070 | 2.21x | 273 | 76 | 3.40 | 9.46 | Falster nord og Orehoved: 79/214; Falster vest og Nysted Nor munding: 61/214 |
| Retning og vinderstoette, maks. 12 point | 239/1070 | 1.88x | 326 | 95 | 3.62 | 11.35 | Falster nord og Orehoved: 75/214; Falster vest og Nysted Nor munding: 34/214 |
| Retning og vinderstoette, maks. 14 point | 201/1070 | 1.58x | 380 | 100 | 3.73 | 13.25 | Falster nord og Orehoved: 71/214; Falster vest og Nysted Nor munding: 20/214 |
| Retning og vinderstoette, maks. 16 point | 172/1070 | 1.35x | 421 | 112 | 3.84 | 15.14 | Falster nord og Orehoved: 66/214; Falster vest og Nysted Nor munding: 9/214 |
| Retning og vinderstoette, maks. 18 point | 133/1070 | 1.04x | 473 | 119 | 3.71 | 17.03 | Falster nord og Orehoved: 58/214; Falster vest og Nysted Nor munding: 2/214 |
| Retning og vinderstoette, maks. 20 point | 115/1070 | 0.90x | 514 | 123 | 3.64 | 18.92 | Falster nord og Orehoved: 51/214; Falster vest og Nysted Nor munding: 1/214 |
| Retning og gentaget støtte, maks. 18 point, skala 2 | 287/1070 | 2.25x | 400 | 97 | 3.49 | 17.03 | Falster nord og Orehoved: 73/214; Falster vest og Nysted Nor munding: 68/214 |
| Retning og gentaget støtte, maks. 18 point, skala 4 | 216/1070 | 1.70x | 423 | 107 | 3.78 | 17.03 | Falster nord og Orehoved: 70/214; Falster vest og Nysted Nor munding: 36/214 |
| Retning og gentaget støtte, maks. 18 point, skala 8 | 182/1070 | 1.43x | 438 | 110 | 3.87 | 17.03 | Falster nord og Orehoved: 66/214; Falster vest og Nysted Nor munding: 18/214 |
| Retning og gentaget støtte, maks. 22 point, skala 2 | 253/1070 | 1.99x | 470 | 115 | 3.55 | 20.82 | Falster nord og Orehoved: 70/214; Falster vest og Nysted Nor munding: 54/214 |
| Retning og gentaget støtte, maks. 22 point, skala 4 | 183/1070 | 1.44x | 494 | 123 | 3.82 | 20.82 | Falster nord og Orehoved: 61/214; Falster vest og Nysted Nor munding: 28/214 |
| Retning og gentaget støtte, maks. 22 point, skala 8 | 126/1070 | 0.99x | 535 | 128 | 3.58 | 20.82 | Falster nord og Orehoved: 52/214; Falster vest og Nysted Nor munding: 6/214 |
| Retning og gentaget støtte, maks. 26 point, skala 2 | 226/1070 | 1.77x | 523 | 128 | 3.54 | 24.60 | Falster nord og Orehoved: 57/214; Falster vest og Nysted Nor munding: 50/214 |
| Retning og gentaget støtte, maks. 26 point, skala 4 | 142/1070 | 1.11x | 570 | 138 | 3.52 | 24.60 | Falster nord og Orehoved: 46/214; Falster vest og Nysted Nor munding: 16/214 |
| Retning og gentaget støtte, maks. 26 point, skala 8 | 90/1070 | 0.71x | 599 | 139 | 3.35 | 24.60 | Falster nord og Orehoved: 38/214; Falster vest og Nysted Nor munding: 2/214 |
| Retning og gentaget støtte, maks. 30 point, skala 2 | 198/1070 | 1.55x | 571 | 139 | 3.36 | 28.39 | Falster nord og Orehoved: 40/214; Falster vest og Nysted Nor munding: 46/214 |
| Retning og gentaget støtte, maks. 30 point, skala 4 | 98/1070 | 0.77x | 626 | 143 | 3.23 | 28.39 | Falster nord og Orehoved: 28/214; Falster vest og Nysted Nor munding: 11/214 |
| Retning og gentaget støtte, maks. 30 point, skala 8 | 55/1070 | 0.43x | 656 | 147 | 2.99 | 28.39 | Falster nord og Orehoved: 16/214; Falster vest og Nysted Nor munding: 1/214 |
| Retning med bredt støtteværn, maks. 18 point | 145/1070 | 1.14x | 493 | 122 | 2.00 | 17.03 | Falster nord og Orehoved: 51/214; Falster vest og Nysted Nor munding: 2/214 |
| Retning med bredt støtteværn, maks. 19 point | 142/1070 | 1.11x | 507 | 129 | 1.96 | 17.98 | Falster nord og Orehoved: 50/214; Falster vest og Nysted Nor munding: 1/214 |
| Retning med bredt støtteværn, maks. 20 point | 127/1070 | 1.00x | 527 | 131 | 1.81 | 18.92 | Falster nord og Orehoved: 45/214; Falster vest og Nysted Nor munding: 0/214 |
| Retning med bredt støtteværn, maks. 22 point | 111/1070 | 0.87x | 563 | 132 | 1.60 | 20.82 | Falster nord og Orehoved: 40/214; Falster vest og Nysted Nor munding: 0/214 |
| Retning med bredt støtteværn, maks. 24 point | 93/1070 | 0.73x | 588 | 134 | 1.38 | 22.71 | Falster nord og Orehoved: 24/214; Falster vest og Nysted Nor munding: 0/214 |
| Retning og vinderstoette, maks. 4 point, kun naesten lige scorer | 434/1070 | 3.41x | 72 | 17 | 1.84 | 3.78 | Falster nord og Orehoved: 94/214; Falster vest og Nysted Nor munding: 120/214 |

### Stabilitet ved sammenhaengende vejrfaser

En deterministisk blok-bootstrap med 1000 gentagelser og 12-timers blokke bevarer korte sammenhaengende vejrfaser og de to tilstande som par. Intervallerne er 5.-95.-percentiler og er en foelsomhedstest, ikke uafhaengige historiske aar.

| Kandidat | 6+ overrepraesentation, median (5-95%) | Aendrede foerstepladser | Nye top-5-medlemmer |
| --- | ---: | ---: | ---: |
| Ingen korrektion | 3.69x (3.20-4.21) | 0.0% (0.0-0.0%) | 0.0% (0.0-0.0%) |
| Raa antal-straf, maks. 4 point | 3.15x (2.76-3.60) | 9.3% (6.1-12.6%) | 8.1% (6.3-9.7%) |
| Retningsmulighed, maks. 4 point | 3.26x (2.83-3.73) | 8.9% (7.0-10.8%) | 10.6% (8.1-12.9%) |
| Retning og vinderstoette, maks. 2 point | 3.54x (3.12-4.04) | 4.7% (2.8-6.5%) | 4.9% (3.6-6.0%) |
| Retning og vinderstoette, maks. 4 point | 3.23x (2.83-3.69) | 7.9% (5.6-10.3%) | 8.9% (6.8-10.7%) |
| Retning og vinderstoette, maks. 6 point | 2.95x (2.61-3.31) | 15.9% (13.6-18.2%) | 13.9% (11.3-16.2%) |
| Retning og vinderstoette, maks. 8 point | 2.56x (2.28-2.85) | 26.2% (20.1-32.7%) | 20.2% (16.6-23.0%) |
| Retning og vinderstoette, maks. 10 point | 2.21x (1.93-2.52) | 35.0% (28.5-42.5%) | 25.7% (22.5-28.2%) |
| Retning og vinderstoette, maks. 12 point | 1.88x (1.63-2.15) | 44.4% (36.4-52.3%) | 30.6% (27.1-33.6%) |
| Retning og vinderstoette, maks. 14 point | 1.58x (1.36-1.81) | 46.3% (38.3-55.1%) | 35.6% (32.0-38.9%) |
| Retning og vinderstoette, maks. 16 point | 1.36x (1.15-1.55) | 51.9% (43.5-60.8%) | 39.5% (35.7-42.7%) |
| Retning og vinderstoette, maks. 18 point | 1.04x (0.86-1.23) | 55.6% (47.2-64.0%) | 44.4% (40.0-48.1%) |
| Retning og vinderstoette, maks. 20 point | 0.90x (0.73-1.08) | 57.5% (49.1-65.9%) | 48.2% (43.8-51.9%) |
| Retning og gentaget støtte, maks. 18 point, skala 2 | 2.25x (1.98-2.54) | 45.3% (38.8-51.9%) | 37.6% (33.5-41.1%) |
| Retning og gentaget støtte, maks. 18 point, skala 4 | 1.70x (1.44-1.95) | 49.5% (41.6-58.4%) | 39.7% (35.5-43.5%) |
| Retning og gentaget støtte, maks. 18 point, skala 8 | 1.44x (1.22-1.63) | 51.4% (43.0-59.4%) | 41.0% (36.8-44.7%) |
| Retning og gentaget støtte, maks. 22 point, skala 2 | 1.99x (1.74-2.23) | 53.3% (45.3-62.2%) | 44.1% (40.0-47.6%) |
| Retning og gentaget støtte, maks. 22 point, skala 4 | 1.44x (1.20-1.66) | 57.5% (48.6-65.9%) | 46.4% (42.1-49.5%) |
| Retning og gentaget støtte, maks. 22 point, skala 8 | 0.99x (0.82-1.16) | 59.4% (50.9-68.2%) | 50.1% (46.5-53.3%) |
| Retning og gentaget støtte, maks. 26 point, skala 2 | 1.77x (1.56-1.99) | 59.8% (51.4-68.2%) | 48.9% (45.1-52.5%) |
| Retning og gentaget støtte, maks. 26 point, skala 4 | 1.11x (0.94-1.30) | 64.5% (55.6-72.9%) | 53.4% (49.8-56.5%) |
| Retning og gentaget støtte, maks. 26 point, skala 8 | 0.71x (0.58-0.84) | 64.5% (56.5-73.4%) | 56.0% (52.6-59.4%) |
| Retning og gentaget støtte, maks. 30 point, skala 2 | 1.55x (1.37-1.75) | 65.0% (55.6-73.8%) | 53.4% (49.3-57.5%) |
| Retning og gentaget støtte, maks. 30 point, skala 4 | 0.77x (0.63-0.92) | 66.8% (58.4-74.8%) | 58.5% (55.3-62.0%) |
| Retning og gentaget støtte, maks. 30 point, skala 8 | 0.43x (0.32-0.54) | 68.7% (61.2-76.2%) | 61.3% (58.1-64.8%) |
| Retning med bredt støtteværn, maks. 18 point | 1.14x (0.97-1.33) | 57.0% (49.5-64.5%) | 46.3% (42.1-49.8%) |
| Retning med bredt støtteværn, maks. 19 point | 1.11x (0.94-1.30) | 60.3% (52.8-67.3%) | 47.6% (43.4-51.1%) |
| Retning med bredt støtteværn, maks. 20 point | 1.00x (0.85-1.18) | 61.2% (53.7-68.7%) | 49.4% (45.3-53.0%) |
| Retning med bredt støtteværn, maks. 22 point | 0.86x (0.72-1.04) | 61.7% (54.2-69.2%) | 52.7% (48.8-56.7%) |
| Retning med bredt støtteværn, maks. 24 point | 0.73x (0.60-0.88) | 62.2% (54.7-70.6%) | 54.9% (51.1-59.1%) |
| Retning og vinderstoette, maks. 4 point, kun naesten lige scorer | 3.40x (2.98-3.91) | 7.9% (5.6-10.3%) | 6.7% (5.1-8.4%) |

### Beskyttelse af reelle foerstepladser

| Kandidat | Bevarede 6+-foerstepladser | Aendrede hel-zone-vindere | Aendrede isolerede vindere | Aendrede fler-del-vindere | Stoerste oprindelige forspring der flyttes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Retning og vinderstoette, maks. 2 point | 119/127 | 0 | 8 | 2 | 1.00 |
| Retning og vinderstoette, maks. 4 point | 113/127 | 0 | 10 | 7 | 2.00 |
| Retning og vinderstoette, maks. 6 point | 101/127 | 0 | 24 | 10 | 4.00 |
| Retning og vinderstoette, maks. 8 point | 81/127 | 0 | 41 | 15 | 6.00 |
| Retning og vinderstoette, maks. 10 point | 64/127 | 0 | 51 | 25 | 8.00 |
| Retning og vinderstoette, maks. 12 point | 47/127 | 0 | 59 | 36 | 8.00 |
| Retning og vinderstoette, maks. 14 point | 43/127 | 0 | 61 | 39 | 8.00 |
| Retning og vinderstoette, maks. 16 point | 35/127 | 0 | 67 | 45 | 10.00 |
| Retning og vinderstoette, maks. 18 point | 29/127 | 0 | 69 | 50 | 10.00 |
| Retning og vinderstoette, maks. 20 point | 26/127 | 0 | 71 | 52 | 10.00 |
| Retning og vinderstoette, maks. 4 point, kun naesten lige scorer | 113/127 | 0 | 10 | 7 | 2.00 |

En hel-zone-vinder faar nul stoettebaseret justering. En isoleret vinder kan fortsat beholde foerstepladsen, naar dens oprindelige scoreforspring er stoerre end den konkrete, begraensede justering.

## Vurdering

- Den raa antal-straf er kun en negativ kontrol. Den kan ikke skelne mellem mange ens retninger og mange reelt forskellige retninger.
- Den rene retningsstraf er ogsaa en negativ kontrol. Den straffer en zone, selv naar flere kystdele faktisk understoetter det gode resultat.
- De stoettebaserede kandidater justerer kun meget, naar zonen baade har stor retningsmulighed og en isoleret vinder.
- En stor zone skal fortsat kunne blive nummer et. Naar hele zonen er god, er den stoettebaserede justering derfor nul; flere stoettende dele reducerer den gradvist.
- Naer-lighedsvarianten maa kun omrokere zoner inden for to point fra gruppens bedste raascore. Den er mindre effektiv mod skaevheden, men giver en enkel garanti mod at klart forskellige scorer bytter plads.
- Ingen kandidat aktiveres paa baggrund af dette ene produktionsforloeb. Resultatet bruges til at udpege et lille interval, som efterfoelgende skal koeres paa de historiske vejrsituationer.
- En fremtidig justering er en intern rangeringstilpasning. Den maa ikke fremstilles som en lavere lokal ravchance.

## Kontrol

Alle 12 rekonstruerede baseline-rangeringer matchede den eksisterende top-5-rangering eksakt foer korrektion. Score impact: nej. Public runtime impact: nej. Land-/vandpunkter: uaendrede.
