# 4.0.466 – ens hash ved eksakt Pages-genopretning

PR #427 blev merged som `0f7b2ed0`. Normalrun `35778530384` havde allerede
gemt og deployet den nyere vejrpakke, men den forsinkede Pages-slutkontrol
efterlod den centrale registrering på forgængeren. Den almindelige
providerfri reparation `35791092708` stoppede derfor korrekt ved forskellig
central og offentlig identitet. Den præcise genopretningsrute
`35791637412` genbrugte den gemte pakke, byggede artifact og udgav beskyttet
runtime uden leverandørkald, men stoppede før Pages: dens rækkefølgekontrol
fik SHA-256 af rå manifestbytes, mens den sammenlignede kanonisk JSON-hash.

Ruten gemmer nu begge adskilte hashes i genbrugsrapporten og sender kun
den kanoniske kildehash til begge Pages-kontroller. Rå bytehash bruges
fortsat til kontrol af den eksakte downloadede fil. Regressionen beviser,
at pænt formatteret og kompakt JSON med samme indhold accepteres ved
kanonisk hash, mens råhashen afvises. Ingen målinger, scoreformel,
leverandørprioritet eller generel rækkefølgekontrol ændres. Produktive
resultater og normal cron-stabilitet afventer nyt exact-head- og livebevis.
