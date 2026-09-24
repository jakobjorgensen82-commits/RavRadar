# RavRadar 4.0.485 – korrekt Limfjord-kontrol og separate DMI-vejrtyper

- Normalrun `35972581225` på 4.0.484 gemte ny privat cache og deployede
  `rr-20260924084821-210` for 07:00 UTC. Den offentlige side viser
  fortsat prognoser for 210 zoner og 673 kystdele.
- Én af 54 valideringskontroller fejlede: Strømauditten læste otte
  godkendte Limfjord-fastholdelser fra scoregeneratorens form, selv om
  produktionsprojektionen havde flyttet `currentTransition` til
  topniveauet. En måltest bruger nu den faktiske produktionsform.
  Kildevilkår, tretimersgrænse, score og vejrdata ændres ikke.
- Eksakt sammenligning af de to seneste offentlige prognoser på 77.395
  fælles sted/time-par fandt 274 gyldig→tom for vandtemperatur på fire
  timer; vind, bølger, strøm og vandstand havde nul sådanne tab.
  En reproducerbar fejl i DMI's timebygger viste, at et nyt datapunkt
  for én vejrtype kunne skjule gyldige målinger for en anden. Hver af
  vejrproducenten bygger nu de tre marine vejrtyper hver for sig, både
  i normaldrift og kystdelens staging, og fylder kun beviste huller.
  Den låste scoremodel, tidsgrænse og kildekontrol bevares. En tidligere
  ændring direkte i modelbundlen blev forkastet efter exact-head-gaten.
  Livebekræftelse af
  samtlige 274 afventer næste normale kørsel.
- Ændringen skifter vejrcachens kodefingeraftryk. Begge restore-trin
  accepterer kun den præcise, senest deployede 4.0.484-generation som
  forgænger, med uændret model-/statebinding og fuld arkivkontrol.
- Copernicus' operationelle og komponentvise kald ramte leverandørens
  `DatasetUpdating`-tilstand. Komponentleddet optog 24 genforsøgelige
  forsøg og ingen ny valgt værdi. Det er ikke løst af auditrettelsen.
- Vejrdata er stadig ufuldstændige; automatisk cron forbliver pauset.
