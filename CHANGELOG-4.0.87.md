# RavRadar 4.0.87

## Rettet
- Vind- og strømpile installeres deterministisk efter rangliste og 5-dagesprognose i stedet for at afhænge af `requestIdleCallback`.
- Pilelaget rapporterer nu start, succes, fejl og faktiske markørtal; en reel installationsfejl forsøges én gang igen.
- Pilepanelet ligger over zone- og grænselag uden at modtage museklik.
- Retningskortets forsinkede Leaflet-initialisering afbrydes sikkert ved faneskift, så `Map container not found` ikke kan opstå.
- Stationskort og retningskort fjernes, når deres faner forlades.
- Alle aktive browserimports bruger samme releaseversion, så en ny release ikke kan blande nye HTML-filer med gamle cache-identiteter.

## Test
- Ny runtimebeskyttelse kontrollerer, at både vind- og verificerede strømpile faktisk findes på kortet.
- Ny admin-livscyklustest beskytter mod forsinket kortinitialisering efter faneskift.
- Ny importgraf-test afviser enhver aktiv `?v=`-reference, der ikke matcher releaseversionen.
- Sitetestens browserfejlskontrol omfatter nu både offentlig side og isoleret adminside.

## Bevarede egenskaber
- Rangliste og første paint kommer fortsat før 5-dagesberegningen.
- Pile installeres fortsat efter de centrale prognosevisninger og genindfører derfor ikke den tidligere hovedtrådsblokering.
- DMI-pile uden dokumenteret marinegitterpunkt forbliver skjult.
