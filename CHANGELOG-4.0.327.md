# RavRadar 4.0.327 – run-afgrænset shadow og verificeret Open-Meteo-enhed

Dato: 2026-09-06

## Rettet

- Regionale shadowprøver fra modelruns, som den aktuelle strict-validerede DMI-ledger ikke har valgt, sorteres fra før run-specifik cadence-, asset- og vektorkontrol. De kan hverken levere aktuelle data eller blokere Open-Meteo.
- Prøver fra det valgte modelrun kontrolleres fortsat fail-closed for native cadence, eksakt asset-hash, spatial binding og vektorbevis.
- Open-Meteo-requesten bruger den dokumenterede parameter 'wind_speed_unit=ms'. Den tidligere 'velocity_unit=ms' blev ignoreret af API'et og gav km/t-værdier, som fejlagtigt kunne blive behandlet som m/s.
- UTC-offset, timezone og responseenheder for både hastighed og retning valideres nu eksplicit før records kan bygges.

## Bevis

- Et generisk live-probekald mod det officielle Marine API bekræftede m/s, grader, 118 eksakte timer og 50 payloads for en 50-punktsbatch med den rettede request.
- De målrettede regionale-, closure- og Open-Meteo-tests er grønne. De dækker både ignoreret gammel cadence, fatal same-run cadence, korrekt queryparameter og afvisning af km/t-response.
- 4.0.326 bestod exact-head-run 34010245661 og blev merged som d899c6defac93d52826269773bcaa9a8c645261f. Oneoff 34017809629 attempt 1 gjorde DMI og Copernicus READY, men eksponerede den efterfølgende cadencefejl før Open-Meteo-request.

## Uændret og næste bevis

- Active/candidate-cache, fuldvinduesgenbrug, 48-timers modelhistorik, DMI → Baltic → AMM15 → regional DMI → Open-Meteo, ekstern cron, geometri, punkter, scoreformel, model-id og stateversion er uændrede.
- Exact-head, merge og en frisk main-oneoff skal bevise 79.414/79.414 current. Derefter følger Feggesund 354/354, kapacitetsmåling, fulde produktionsgates og særskilt modelaktivering. Candidate G er fortsat offentlig.
