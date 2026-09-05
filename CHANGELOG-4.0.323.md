# RavRadar 4.0.323

Dato: 2026-09-05

## Rettet

- Operationelle currenthuller følger nu eksakt DMI → Copernicus Baltic → AMM15 → godkendt regional DMI → Open-Meteo.
- Den regionale builder modtager kun sine otte policydele; rester udenfor blokerer ikke længere alle regionale kandidater.
- Open-Meteo må kun køre efter terminalt `READY` fra de forudgående kilder og udfylder alene target..+117 uden historik, interpolation, carry-forward eller nabolån.
- Det kombinerede Météo-France-overfladestrømsfelt bindes som én currentkanal, kan ikke genprojekteres til bølge/tidevand og er altid `calibrationEligible=false`.
- Normal og stor engangskørsel bruger samme logik med særskilte bounded budgetter og nye target-friskhedsgater.
- Copernicus' validerede delprogression kan gemmes ved budgetstop; andre fejl forbliver fail-closed.

## Sikkerhed og binding

Leverandørfejl, nulls, ufuldstændige batches eller stale target stopper før nyt artifact og bevarer seneste komplette offentlighed. Ingen koordinater, rå U/V eller private id-lister publiceres. Modelbundter og continuation er fremført med append-only migration `20260905090000`; ældre migrationer er urørte.

## Evidensstatus

Den tidligere sikre optælling var 78.430 af 79.414 dækket og 984 rester: 944 i regional politik og 40 udenfor ved sidste forecasttime. Lokal målmatrix og fuld releasegate er grønne. En efterfølgende source-test fandt én stale reference til et fjernet CLI-felt; READY-only rettelsen og måltesten er grøn. Fuld GitHub exact-head, merge og frisk rettet engangskørsel afventer.
