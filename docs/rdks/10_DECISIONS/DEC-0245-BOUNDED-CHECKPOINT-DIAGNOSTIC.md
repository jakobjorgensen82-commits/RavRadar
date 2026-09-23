# DEC-0245 – afgrænset fejldiagnose uden at ændre score eller vejr

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.474; livebevis afventer

## Hvad vi så

4.0.473/PR #435 bestod exact-head `35862513968` og blev merged som
`4e7a9c71`. Providerfri `35863417067` installerede den skrivefri
diagnosemigration `20260923130000`, læste den tilbage og genbrugte
samme private vejrpakke som før. Den beskyttede CAS afviste stadig
`INPUT_INVALID`. Fuldpakkediagnosen gav alene `UNAVAILABLE` inden for
et samlet checkpointtrin på cirka ti sekunder; den konkrete grund
til dens manglende svar er ikke bevist. Ingen nye vejrdata, private
checkpointwrites eller Pages blev udgivet.

## Beslutning

- Brug den allerede installerede, skrivefri og service-role-beskyttede
  SQL-funktion i små portioner på højst 32 kystdele. Kun det private
  lokale checkpoint og den beskyttede database ser delmængderne.
  Den samlede pakke skrives aldrig gennem diagnosevejen.
- Hver delmængde afvises bevidst som en komplet 673-dels pakke, men
  helperen klassificerer stadig hver integreret og privat ledsage-
  tilstand uafhængigt. Klienten kontrollerer svarformat og summerer
  alene faste regelkoder/antal for alle 673. Deltællinger må ikke
  fremstilles som samlet payloadaccept.
- Hvis et diagnosekald fejler, vises kun en sikker klasse for HTTP,
  netværk, svargrænse eller format. Rå databasesvar, kystdel-ID,
  tider, vejrdata, payload og credentials må aldrig logges.
- CAS, dens strenge acceptkrav, scoreberegning, vejrhentning,
  kildeprioritet, cache og geometri ændres ikke. Næste providerfri
  run skal måle den reelle SQL-afvisning; først derefter rettes den.

Den store vejrkædeplan står i `docs/ai/WEATHER_CHAIN_HELICOPTER_2026-09-23.md`
og det aktive roadmap. 5.201 huller er alene den senest observerede
havstrømsrest, ikke alle vejrfelter.

## Tillæg 4.0.475 – diagnosen må ikke skjule sin egen årsag

4.0.474 bestod exact-head og blev merged, men providerfri `35866710973`
stoppede stadig ved checkpoint-CAS `INPUT_INVALID`. Diagnoseklienten
forkastede svaret som `RESPONSE_REASON_SHAPE`; derfor blev hverken den
faktiske payloadregel eller sikre tilstandskoder vist. Det er ikke et
bevis for, at 32-delsstrategien eller cachen er ugyldig.

4.0.475 forsøger først den faktiske samlede payload i den eksisterende
**skrivefri** service-role-diagnose. Hvis det giver et kanonisk svar,
vises kun den faste payloadregel og sikre antal. Ved transportfejl,
diagnoseundtagelse eller ikke-kanonisk delkort fortsætter de allerede
afgrænsede 32-delskald. Ukendte feltnavne/værdier kasseres og tælles
anonymt; kendte årsagskoder bevares. Dette ændrer aldrig CAS-accept,
offentlige data, vejrhentning eller score. Et diagnostisk svar er ikke
godkendelse af den private historik.
Et fejlet delkald må heller ikke skjule en allerede målt
fuldpakkeregel: diagnosen angiver sikkert hvor mange dele der faktisk
blev klassificeret, forventet antal og en fast fejlklasse for næste del.
