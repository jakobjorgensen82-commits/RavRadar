# RavRadar 4.0.0 — DMI Engine 4

## Hovedrettelse

DMI STAC-elementer behandles nu korrekt som **én GRIB-fil pr. prognosetidspunkt**, ikke som én fil pr. parameter. Parameterfiltrering før download er fjernet.

## Ny pipeline

1. Find seneste modelrun via DMI STAC.
2. Vælg én unik GRIB-fil pr. valid time.
3. Download/genbrug forecast-step-filen.
4. Inventarér alle GRIB-messages med ecCodes.
5. Klassificér kun collection-relevante felter.
6. Udtræk nærmeste originale gridpunkt til relevante zoner.
7. Bevar delvise og tidligere gyldige data komponentvis.

## Robusthed

- Collectionrotation bruger nu `lastAttemptAt`, så en fejlende collection ikke låser hele køen.
- Eksponentiel pause pr. fejlende collection via `nextEligibleAt`.
- `consecutiveFailures`, `lastError`, `lastAttemptAt`, `lastPartialAt` og `lastSuccessfulAt` bevares.
- Rå GRIB-filer caches mellem GitHub Actions-kørsler med `actions/cache@v4`.
- Diagnostikken indeholder GRIB-inventar, valgte forecast steps og genkendte parametre.
- Tidligere gyldige cachedata bevares ved delvis fejl eller budgetstop.

## Verifikation

Acceptsignaler i diagnostikken er nu:

- `forecastStepAssets > 0`
- `selectedForecastSteps > 0`
- `downloadedBytes > 0` eller `reusedAssets > 0`
- `gribFieldInventory` udfyldt
- `parametersByCollection` udfyldt
- voksende `completeMarineZones`, `completeWindZones` og `completeWaveZones`
