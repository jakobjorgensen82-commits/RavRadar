# DEC-0195 – eksakt genopretning af allerede live 4.0.410

**Status:** Aktiv
**Dato:** 2026-09-18
**Version:** 4.0.412

## Beslutning

Pages-run `35331664087` verificerede og udgav 4.0.410, men den efterfølgende
centrale reseal stoppede på 673 kendte `LAST_MILE_HISTORY_POINT`-fund. Den
offentlige side er derfor foran central version 23. Før ny kode eller nye
vejrdata må fortsætte, registreres præcis dette allerede offentlige target som
central version 24.

Genopretningen er en engangsvej med fast confirmation, source-/target-run,
head, deployment, artifact-id, størrelse, digest, manifest, audit, readiness,
binding, profil, implementation closure og Pages-seal. Live target verificeres
friskt. Target skal have samme forseglede modelbinding som source; den må gerne
være historisk i forhold til 4.0.412. Kun afgrænsede payloadfrie diagnostiske
fund med positive tællinger accepteres, og resultatet får
`calibrationEligible=false`.

Mismatch eller ukendt evidens stopper før skrivning. Genopretningen henter
intet vejr, bygger intet artifact og deployer intet nyt. Derefter fortsætter
den eksisterende providerfri kode-only-rute med de allerede gemte vejrdata og
den normale append-only bindingsvedligeholdelse.

## Konsekvens

Den offentlige og centrale sandhed bringes sammen uden at opfinde data eller
gentage providerarbejde. 4.0.411's last-mile-rettelse kan derefter komme online
som 4.0.412, hvorefter én almindelig vejrvedligeholdelse skal bevise aktuel
time, historik, lokal femdøgnsvisning og cachevedligeholdelse.
