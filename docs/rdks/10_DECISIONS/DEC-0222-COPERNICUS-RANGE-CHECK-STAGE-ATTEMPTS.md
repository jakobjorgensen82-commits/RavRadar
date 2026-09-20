# DEC-0222 – Copernicus-range-kontrol skal bruge stage'ens validerede forsøg

**Version:** 4.0.444
**Status:** Implementeret lokalt; livebevis mangler

## Beslutning

Når range-kontrollen sammenligner en gyldig Copernicus-donorbank med en
`READY`- eller `IN_PROGRESS`-source-stage, skal den bruge stage'ens allerede
validerede forsøgsjournal. En tom attempts-liste er ikke samme beregning og må
ikke bruges som genkontrol.

Hvis donorbanken tilhører en anden generation og forsøget ikke kan anvendes på
den projektion, skal kontrollen returnere en eksplicit projektion-mismatch.
Den må ikke crashe, og den må ikke godkende stage'en som genbrugelig.

## Begrundelse

Run `35494495771` gemte 7.811 verificerede Copernicus-par og gennemførte
netværksfri recovery. Den efterfølgende kontrol afviste alligevel stage'en,
fordi den genberegnede uden de validerede forsøg. Fejlen lå i kontrollen, ikke
i et bevis på tabte providerdata.

## Afgrænsning

Dette ændrer ikke providerprioritet, DMI-first, MISSING-regler, score, geometri
eller kravet om separat komplethedsbevis. Open-Meteo, afsluttende cache,
artifact og deploy skal stadig bevises i en almindelig continuation.
