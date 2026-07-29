# RavRadar 4.0.30 – analyse af supportpakke 418

## Bekræftede fund

- DMI-cache havde data for alle 231 zoner, men kun 4 zoner havde mindst 96 timers vindhorisont. Gennemsnittet var 54,3 timer.
- Bølger dækkede 205 zoner, strøm 220 zoner og modelvandstand 220 zoner.
- DMI-livekaldet var rate-limited med HTTP 429, mens den deployede cache og Open-Meteo-fallback fungerede.
- Stationsregisteret indeholdt 153 poster, men flere poster var historiske, selvom API-egenskaben `status` var `Active`. Eksempel: Hirtshals Havn med operationTo i 1991 blev fejlagtigt markeret `registryStatus: active`.
- Routing-auditten havde 202 komplette brackets, 20 ufuldstændige og 9 zoner uden kystakse.
- Øster Hurup og Als valgte Frederikshavn I + Als Odde, fordi Hals II ikke fandtes i det filtrerede stationsregister. Det var topologisk to sider, men hydrologisk og lokalt et forkert valg.
- Den tidligere `status=Active`-forespørgsel var utilstrækkelig som komplet officielt stationsregister og kunne både udelade relevante stationer og inkludere historiske poster.

## Rettelser

- Hent hele OceanObs-stationsregisteret og beregn reelt aktiv/historisk ud fra gyldigheds- og driftsdatoer.
- Bevar alle opdagede stationer permanent, men brug kun aktuelt gyldige vandstandsstationer automatisk.
- Brug kun stationer med vandstandsparametre i vandstandsrouting.
- Udled kystakse fra `onshoreDirectionDeg` for zoner uden `coastLine`.
- Brug samme logik i admin og backend.
- Udvid regressionsprøver for historiske stationer og fallback-kystakse.

## Næste runtime-kontrol

Efter deployment skal supportpakken kontrolleres for:

1. Om station 20262 / Hals II nu findes i `dmi-water-stations.json`.
2. Om den markeres aktiv ud fra aktuelle driftsdatoer.
3. Om Øster Hurup og Als vælger Hals II + Als Odde.
4. Om de 9 `no-coast-axis`-zoner er reduceret til 0.
5. Om historiske stationer ikke længere optræder som automatiske kandidater.
6. Om vindhorisonten fortsætter mod mindst 96 timer uden falsk complete-status.
