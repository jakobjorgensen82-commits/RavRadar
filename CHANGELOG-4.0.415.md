# Changelog 4.0.415

4.0.414 bestod exact-head `35346135848`, blev merged gennem PR #358 som main
`f1f33c44`, og recovery `35346704791` registrerede det allerede offentlige
target korrekt som central version 24.

Den providerfri saved-weather-kørsel `35346790218` installerede og verificerede
den append-only bindingsmigration, men stoppede før private runtime, artifact
og Pages. En gammel grænse accepterede kun handlingen `integrated`, selv om
den korrekte midlertidige handling efter recovery var
`integrated-historical-maintenance`.

4.0.415 accepterer begge sikre integrerede vedligeholdelsesformer i netop
saved-weather-trinnet. Modelskift forbliver afvist, og alle krav til nyere
friskt target, source-forgænger, tomt repair-id og eksakt runtime består.
Allerede installeret migration genkendes som sikker genkørsel. Ingen
vejrprovider, scoreformel, vægt, geometri eller kildeprioritet ændres.
