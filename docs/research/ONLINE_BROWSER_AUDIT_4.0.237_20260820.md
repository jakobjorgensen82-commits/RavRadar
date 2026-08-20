# Systematisk online browserkontrol - 4.0.237

## Seneste fulde resultat

Playwright med den installerede system-Chrome kontrollerede senest den offentlige 4.0.237-runtime paa datasæt `rr-20260820031545-210` fra naturlig fuld produktion `#3245`.

| Kontrol | Resultat |
|---|---:|
| Zoner | 210/210 |
| Kystdele | 673/673 |
| Aktuelle visninger | 420/420 |
| Femdoegnsvisninger | 2.100/2.100 |
| Mismatch | 0 |
| Console errors | 0 |
| Page errors | 0 |
| HTTP-fejl | 0 |

For hver zone og begge jagtformer kontrollerede runneren den viste totalscore, label, farveniveau, vindpil, stroempil, tre komponenter og deres begrundelser, kystforklaring, lokal vinderkontekst og debugscore/-del. For hver af fem dage kontrollerede den dagsscore, detaljens score, begge pile, komponenter/begrundelser, kystforklaring og lokal kontekst.

## Browserdiagnose

Browser-pluginet blev forsoegt foerst og stoppede i sin trusted RPC-sti uden en konkret reparationsvej. Den tidligere Pyppeteer-runner kunne gennemfoere den foerste fulde kontrol, men nye gentagelser hang foer zoneloopen i `launch(...)`. Opstarts- og zonemarkoerer goer nu dette synligt.

Den godkendte fallback er derfor `scripts/audit-online-browser-playwright-4.0.237.mjs`. Den genbruger ordret browserinjektionen fra den eksisterende audit, starter system-Chrome gennem Playwright og gennemfoerte den fulde matrix paa cirka to minutter. Den er nu gentaget grønt efter et nyt produktionsdeploy. Playwright-runneren downloader ingen browser og aendrer ingen live-data.

Ingen land-/vandpunkter, geometri, U/V, score, kilder, fallback eller produktionsdata blev flyttet eller skrevet af kontrollen.
