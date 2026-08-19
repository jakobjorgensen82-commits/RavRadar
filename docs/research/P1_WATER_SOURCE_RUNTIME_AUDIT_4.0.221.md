# P1 – faktisk vandstandskæde og alarmgæld

**Grundlag:** 4.0.220 artifact #2771, aktuel kode og git-historik 4.0.98–4.0.220

## Naturlig eftermaaling i 4.0.237 / koersel 3237

Produktionsartifactet fra `#3237` registrerer fire naturlige `forecast-cache-expired`-haendelser: Hvide Sande Fjord, Hvide Sande Havn, Thorsminde Havn og Hesnaes Havn I. Hvide Sande-stationerne og Thorsminde havde samtidig naturlige `delivery-stopped`-haendelser; Klintholm havde `delivery-resumed`.

Ingen af de fire udloebne observationscacher var en effektiv valgt routingkilde: `effectiveRoutingSources` og `effectiveRoutingZoneIds` er tomme, og `routingCacheAlertLevel` er `null`. Friske kildeprognoser var modtaget med gyldighed til 24. august 13 UTC, aktiv vandstand var 210/210, og bulk-konverteringen havde nul tabte zoner. Haendelsesregistreringen virker derfor, uden at en udloebet cache forurener brugerforecastet.

Det aabne exitkriterium er nu smallere: en naturligt opstaet `warning`/`critical` paa en faktisk valgt effektiv routingkilde skal stadig eftermaales. Der fremkaldes ikke kunstigt cacheudloeb.

## Faktisk dækning

- Registeret indeholder 373 kendte kilder: 181 leverer observationer, 30 leverer ikke, og 162 har aldrig leveret en observation.
- 240 kilder har gyldig forecastcache. Ingen kilde klassificeres aktuelt som utilgængelig, fordi forecast, observation og cache vurderes hver for sig.
- Hals Barre (`20252`) og Hals Havn (`20262`) er aktive DMI-prognosepunkter med 113 forecasttimer. Artifact #2771 bar gamle diagnosefelter med henholdsvis 15 og 21 zoner; den producerede serie brugte dem faktisk i 5 og 6 zoner.
- Aktuel vandstandsproduktion bruger samme routede DMI-serie i forecaststore, zoneprognose, nuværende værdi og den efterfølgende score-/visningskæde. Adminoverride har forrang for automatik.

## Fundet regressionsgæld

4.0.98 indførte alarm for en valgt aktiv station, der stopper før dens cache udløber. Den større 4.0.99-sandhedsrettelse fjernede alarmfunktionen og adminfeltet, men beholdt kravet og en tekstbaseret regressionstest. Beskyttet stationshistorik videreførte derfor gamle `routingCacheAlertLevel`-felter uden aktuel genberegning; artifact #2771 viste blandt andet falsk `critical` sammen med gyldig 113-timers forecast.

## 4.0.221-design

Alarmen genberegnes efter den faktiske effektive routing. Den ser seneste gyldige tidspunkt på tværs af kildens egen DMI-prognose og routet forecastcache. En valgt aktiv kilde, der ikke leverer observationer, får advarsel inden for den centralt gemte tærskel og kritisk status ved udløb/manglende gyldighed. Leverende observationer samt historiske/inaktive kilder alarmerer ikke. Hver kørsel rydder stale felter, når risikoen er væk.

Dette ændrer ikke kildevalg, interpolation, vandstandstal, fallback eller RavScore.

## Produktionsbevis

- GitHub Actions #31889559758 bestod central adminhydrering, frisk DMI-opbygning, fuld `validate`, releasegate, Supabase-synkronisering, Pages-artifact og deploy på commit `3f6c7661`.
- Artifact #2777 viser 373 kendte kilder, 240 med gyldig forecastcache, nul utilgængelige kilder, nul nye alarmnotifikationer og nul valgte kilder med warning/critical.
- Hals Barre og Hals Havn har fortsat 113 forecasttimer, gyldighed til 20. august kl. 11 UTC og 116,6 timers beregnet resttid. De gamle falske `critical`-mærker er ryddet.
- Før/efter-kontrol af den faktisk producerede vandstandsserie viser uændret brug i 5 og 6 zoner. Den centrale routingkonfiguration er byte-identisk. 15/21 var stale diagnosefelter, ikke et runtime-ruteskift.
- Det offentlige datasæt er `rr-20260815142117-210` med 210 zoner.
