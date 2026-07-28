# RavRadar 4.0.13 – cadence-korrekt DMI-bulkdata

## Rettelser

- Aktuelle DMI-værdier vælges nu med tolerance ud fra prognosens tidsopløsning.
- Bulk-STAC-data med 3-timers trin accepterer op til ét helt modeltrin plus en lille tidsbuffer (maks. 190 minutter), i stedet for den tidligere faste grænse på 90 minutter.
- Det forhindrer, at gyldige strøm- og vandstandsdata findes i bulkcachen, men fejlagtigt klassificeres som manglende i `conditions.json`.
- Bulk-records dokumenterer nu `forecastCadenceMinutes`, så udvælgelsen ikke bygger på en skjult antagelse.
- Regressionstest dækker både 3-timers bulkdata og almindelige timedata.

## Diagnose fra 4.0.13

Den analyserede kørsel havde 231 bulkzoner, 101 zoner med marine bulkdata og 93 zoner med samtidige vandstands- og strømfelter. Alligevel viste den offentlige DMI-cache kun 8 aktuelle strøm- og vandstandszoner. Årsagen var ikke GRIB-parameterfortolkningen, men den faste 90-minutters udvælgelsesgrænse kombineret med 3-timers modeltrin og endnu større mellemrum, mens en modelsamling stadig er under opvarmning.
