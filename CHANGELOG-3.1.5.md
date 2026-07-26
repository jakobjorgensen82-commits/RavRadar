# RavRadar 3.1.5

## DMI ForecastEDR
- DMI-kald er nu låst til én aktiv request ad gangen som standard.
- Standardafstand mellem DMI-kald er hævet til 2,5 sekunder, timeout til 30 sekunder og retries til 2.
- `Retry-After` fra DMI respekteres ved HTTP 429.
- Vind, bølger og ocean hentes komponentvis, så en langsom marinekollektion ikke længere kasserer en gyldig DMI-vindprognose eller blokerer cacheopbygningen.
- Delvise DMI-prognoser markeres eksplicit med komponentstatus og fejl.
- Weather Engine er opdateret til 2.9.0 med requestdiagnostik.

## Vandstand
- Lokal DMI-station inde i zonen har fortsat absolut førsteprioritet.
- Kystinterpolation anvendes kun uden lokal station og kræver én unik station før og én unik station efter zonen.
- Stationsdatasættet pagineres og deduplikeres før brug.

## Automatisk kvalitetssikring
- Ny kvalitetsrapport i `conditions.json` med stationsdækning, direkte/interpolerede/fallback-zoner, DMI-prognosedækning og konkrete fejl/advarsler.
- Kontrol for dubletstationer, ugyldig bracket-interpolation, gamle observationer og meget fjerne stationer.
- Kvalitetsstatus og problemer vises i Administrator Center og medtages i diagnoseeksport.
- Ny automatiseret test: `test:data-quality`.
