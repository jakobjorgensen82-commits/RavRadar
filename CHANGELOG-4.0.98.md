# RavRadar 4.0.98 – effektiv vandstandsstationsrouting

## Implementeret
- Den effektive stationsrouting er nu én fælles kæde: administratoroverride, hvis aktivt og brugbart, ellers RavRadars automatiske topologiske valg.
- De stationer og vægte, der er i kraft for en zone, gemmes i zonens vandstandsprognose og bruges til at korrigere DMI-modelvandstanden gennem hele den timevise prognoseserie.
- Vandstandstabellen viser samme stationsvalg, vægte og korrektion som produktionen bruger.
- Ved to stationer bruges inverse afstandsvægte fra zonens datapunkt.
- Aktive stationer, som bruges af den effektive routing og ikke leverer observationer, overvåges mod stationscachens udløb.
- Admin har en central, konfigurerbar alarmgrænse i timer samt advarsel og kritisk alarm ved udløb.
- Stationernes cachealarmer og berørte zoner gemmes i det beskyttede stationsdokument og vises i Vandstandsstationer-fanen.

## Arkitektur
- Observation, stationsrouting og DMI-modelprognose er stadig separate datatyper, men routingens observation bruges nu som dokumenteret bias til DMI-modelserien.
- Prognosetimer bevarer både rå modelværdi, anvendt bias, routingtype, station-ID'er og vægte.
- DMI-modeldata, vind, bølger, strøm og RavScore er ikke ændret ud over at RavScore nu modtager den samme stationskorrigerede vandstand, som brugeren ser i tabellen.

## Regressionstest
- Ny test: `test-water-station-effective-routing-4.0.98.mjs`.
- Forecast Store-testen validerer igen observationstilpasset DMI-modelvandstand.
