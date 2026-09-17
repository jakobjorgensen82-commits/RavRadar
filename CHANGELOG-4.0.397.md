# RavRadar 4.0.397 – korrekt kontrol af offentlig scoreafrunding

## Levende fund

- 4.0.396 bestod sourcegate, blev merged som main
  `265ec215ace894264e7c687d2e7fe8955f305a76` og blev leveret providerfrit i
  `35158653973`.
- Normalrun `35159168292` gennemførte DMI, Copernicus og Open-Meteo, gemte
  cacherne og byggede 118 timers prognoser for 210 zoner og 673 kystdele.
- Runnet udgav ikke pakken. Slutauditten fejlklassificerede 47 delresultater
  og 1.285 zoneresultater som kontraktfejl, så Pages-deploy blev sprunget over.

## Rodårsag og rettelse

- Scoreproducenten afrunder de tre offentlige bidrag og den rå totalscore
  hver for sig til seks decimaler. Auditten lagde de allerede afrundede
  bidrag sammen igen og brugte den sum til heltalsafrunding.
- Ved en præcis halv-point-grænse kunne bidragssummen derfor ligge én
  mikroenhed på den anden side af den forseglede rå score. Den beregnede
  score var korrekt; kontrollen var forkert.
- 4.0.397 kontrollerer fortsat, at bidragssummen og den rå score højst
  afviger én mikroenhed. Ved en offentlig præcis `.5` accepteres kun de to
  heltalsudfald, som den oprindelige fuldpræcisionsværdi kan have givet.
- Kontraktform og scoreformel rapporteres nu som to forskellige fejltyper,
  så et nyt gennemløb viser alle fejl i begge grupper på én gang.

## Drift

- Rettelsen ændrer ikke RavScore-modellen, vejrdata, kildeprioritet,
  geometri eller brugerens score. Den retter kun den efterfølgende audit.
- Den byggede prognose fra `35159168292` er endnu ikke offentlig. Først
  exact-head, merge og providerfri kodeleverance; derefter skal den eksakte
  gemte vejrgeneration føres gennem de resterende gates og deploy uden oneoff.
- Scheduler forbliver pauset, indtil frisk offentlig prognose og normal
  cachevedligeholdelse er verificeret.
