# Open-Meteo som sidste operationelle currentfallback – 2026-09-05

## Formål og afgrænsning

Rapporten dokumenterer den lokalt implementerede 4.0.323-kontrakt. Den ændrer ikke kystgeometri, land-/vandpunkter, kystnormal, scoreformel eller stateversion. Den tilføjer kun en sidste operationel currentkilde efter alle hidtil godkendte kilder.

## Fund og rodårsag

Seneste sikre driftsevidens havde 79.414 positioner i 673 × 118-matricen. DMI og Copernicus dækkede 78.430, så 984 manglede. 944 lå i den eksisterende otte-dels regionale politik, mens 40 lå udenfor; alle 40 var ved +117. Den gamle closure sendte hele restmængden til regionalbyggeren, som korrekt kun accepterer policydele. Derfor kunne de 40 udenfor blokere behandlingen af alle 984.

Rettelsen partitionerer først resterne. Kun policyrester når regional DMI. Udenforrester og konkrete regionale rester, som den regionale vej ikke kan lukke, bliver en eksakt Open-Meteo-plan. Intet hul tælles som lukket før et komplet, valideret recordpar foreligger.

## Fysisk datakontrakt

[Open-Meteos officielle Marine Weather API](https://open-meteo.com/en/docs/marine-weather-api) dokumenterer `ocean_current_velocity`, `ocean_current_direction` og modellen `meteofrance_currents`. Dokumentationen angiver cirka 0,08°/8 km, timeopløsning, daglig opdatering og op til ti dages forecast. Den beskriver currentfeltet som kombineret Eulerian current, bølger og tidevand og retningen som den retning, strømmen bevæger sig imod.

RavRadar binder derfor kilden til `eulerian-waves-and-tides-combined-surface-current`. Speed/direction fra samme svar, celle og time omregnes til U/V, men feltet bruges kun én gang som currentinput. Det må ikke dekomponeres til eller genbruges som særskilt bølge-/tidevandseffekt. Afstanden er højst 15 km, og `calibrationEligible` er altid falsk.

## Sikkerhedsgrænser

- DMI og begge Copernicus-produkter skal være terminalt `READY`; timeout, fejl og `IN_PROGRESS` er ikke udtømning.
- Kun target..+117 kan udfyldes. Ingen fortidshistorik, interpolation, carry-forward eller nabolån.
- DMI, Baltic, AMM15 og policybundet regional DMI har altid prioritet ved en senere kørsel.
- Private records og intern provenance må ikke blive offentlig rådata eller en ekstra leverandøretiket.
- Leverandørfejl, nulls, ufuldstændige batches eller scope-/hashdrift stopper før nyt artifact; seneste komplette offentlighed bevares.

## Tid og friskhed

Senest målte engangskørsel brugte cirka 25 minutter 51 sekunder i DMI og 44 minutter 51 sekunder i Copernicus; den efterfølgende gamle closure stoppede på under et minut. Den rettede engangsvej har 3.300 sekunders Copernicusbudget, 900 sekunders Open-Meteo-budget og 200 minutters samlet jobloft. Normal drift er afgrænset til 360/240 sekunder for Copernicus/Open-Meteo. En ny target-friskhedsgate stopper gamle snapshots efter leverandørleddene og igen før beskyttede writes/artifact.

Normalplanens interval er bevidst uændret indtil den komplette opfyldning har leveret målt per-leverandør-tid og cachegenbrug. Derefter vurderes rækkefølge og rammer på faktisk evidens.

## Lokal evidens

Måltests dækker restpartition, kildeprioritet, READY-only-admission, batch/null/timeout, 15-km-afstand, fysisk scope, U/V-konvertering, ingen historik, kalibreringslås, liveprojektion, privacy, budgetprogression, friskhed og workflowrækkefølge. Model- og migrationskæden er lokalt synkroniseret. Exact-head, merge og den første friske 673 × 118-mainkørsel afventer.

