# RavRadar 4.0.508 – diagnostik af DMI-afvisning

Lokal kildekandidat, endnu ikke merged eller produktionsverificeret.

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
