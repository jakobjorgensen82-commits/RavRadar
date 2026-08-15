# Offentlig opstart og vejrfil – målegrundlag

**Status:** AKTIV ANALYSE, ingen runtime- eller scoreændring

## Første målte baseline

Det gamle lokale offentlige vejrsnapshot fylder 6.909.849 bytes. 6.751.749 bytes, cirka 97,71 %, er de 209 zoners timeprognoser. Snapshotet er ældre end den aktuelle centrale bestand og indeholder ikke de aktive lokale kystdelsdata. Det er derfor kun historisk størrelsesbaseline, ikke produktionsbevis.

En direkte, skrivebeskyttet måling af deployet dataset `rr-20260815094833-210` viser 210 zoner og 27.114.471 bytes. Heraf udgør `coastalParts` 19.992.212 bytes, mens hovedzonernes prognoser udgør 6.876.439 bytes. Kystdelsblokken består især af 13.597.407 bytes time-for-time-resultater for de to jagtformer og 6.380.691 bytes kystdelsbeskrivelser. Den største aktuelle payload er dermed de lokale kystdele, ikke hovedzonernes femdøgnstimer alene.

Målingen kan gentages uden at skrive data med:

`npm run audit:public-startup-payload`

Den aktuelle deploy kan måles uden lokal filskrivning ved at tilføje URL'en til `public-conditions.json` efter `--`.

Auditten viser filstørrelse, dataset-id, zoner, timer samt bytefordeling på topniveau, zonefelter og timefelter. Den må ikke bruges som begrundelse for at fjerne et felt, før alle aktive forbrugere er dokumenteret.

## Foreløbig konklusion

Den relevante flaskehalskandidat er hentning og fortolkning af både alle lokale kystdelsdata og hele femdøgnsprognosen før den første færdige offentlige visning. Den fulde private `conditions.json` indlæses ikke offentligt, og tunge historikberegninger ligger allerede i pipeline.

Næste designtrin er at måle den deployede fil og faktisk browsertid over flere åbninger og derefter konsekvensberegne en todelt offentlig levering:

1. et lille startdatasæt med aktuelle hovedzoneforhold, kompakt historisk tilstand, nødvendige aktuelle lokale delresultater og strømpile til kort og dagens rangliste;
2. femdøgnstimer og detaljerede lokale kystdelsdata, som indlæses umiddelbart bagefter eller ved konkret behov uden at blokere første visning.

Manifest, dataset-id, hash/integritet, missing-regler, prognosevisning, Spørg RavRadar, lokal kystdelsscore og alle eksisterende funktioner skal fortsat være sammenhængende. Ingen vejrfelter, historik eller funktioner fjernes som del af analysen.
