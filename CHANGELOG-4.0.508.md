# RavRadar 4.0.508 – diagnostik af DMI-afvisning

Merged som main `cadd9b9d`; DMI-årsagen og fuld vejrdækning er
fortsat ikke produktionsafklaret.

## Driftsopfølgning 28. september

- Eksternt testkald startede ét normalt run `36396834072`. Dets
  vejr, cache og fulde gates lykkedes, men Supabases beskyttede
  checkpoint nåede den funktionslokale 30-sekundersgrænse to gange.
  Krypteret færdigpakke og eksakt checkpoint blev gemt; R2 og Pages
  blev ikke opdateret.
- Kun denne databasesfunktions tidsgrænse er hævet til 55 sekunder
  og læst tilbage. Den nye migration og recovery-workflowet skal
  gøre den allerede gemte pakke anvendelig uden ny vejr- eller
  cachebygning. Det er endnu ikke et produktionsbevis for recovery.
- Ejeren forbød ny hentning imens; ekstern cron er derfor
  deaktiveret. Den offentlige prognose er fortsat den gamle.

- Seks genbrugte DMI DKSS-timefiler blev afvist før commit i et
  tidligere fuldt normalrun. Den hidtidige fejltekst skelnede ikke
  mellem de forskellige afvisningsbetingelser.
- Den sikre fejlrapport kan nu angive en af tolv faste,
  indholdsfrie årsagskoder. Transaktionens accept og rollback,
  gamle gyldige data, kildeprioritet, parser-/processing-signatur,
  score og offentlig vejrpakke er ikke ændret.
- 34 afgrænsede tests består. Exact-head source-CI, merge og
  faktisk DMI-bevis mangler. En kode identificerer en gren;
  den er ikke i sig selv en løsning på rodårsagen.
- Eksternt firetimersjob forbliver deaktiveret, til det er testet
  med ejerens særskilte samtykke til varslet IP-videresendelse.
