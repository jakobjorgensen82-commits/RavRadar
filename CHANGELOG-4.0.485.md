# RavRadar 4.0.485 – korrekt kontrol af Limfjord-fastholdelse

- Normalrun `35972581225` på 4.0.484 gemte ny privat cache og deployede
  `rr-20260924084821-210` for 07:00 UTC. Den offentlige side viser
  fortsat prognoser for 210 zoner og 673 kystdele.
- Én af 54 valideringskontroller fejlede: Strømauditten læste otte
  godkendte Limfjord-fastholdelser fra scoregeneratorens form, selv om
  produktionsprojektionen havde flyttet `currentTransition` til
  topniveauet. En måltest bruger nu den faktiske produktionsform.
  Kildevilkår, tretimersgrænse, score og vejrdata ændres ikke.
- Copernicus' operationelle og komponentvise kald ramte leverandørens
  `DatasetUpdating`-tilstand. Komponentleddet optog 24 genforsøgelige
  forsøg og ingen ny valgt værdi. Det er ikke løst af auditrettelsen.
- Vejrdata er stadig ufuldstændige; automatisk cron forbliver pauset.
