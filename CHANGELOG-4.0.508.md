# RavRadar 4.0.508 – diagnostik af DMI-afvisning

## Driftsopfølgning 19. oktober — uændret 4.0.584

Dette tillæg viderefører DEC-0249's genbrug af færdige beregninger; det er ikke en ny 4.0.508-udgivelse eller et versionsløft.

- Genopretning `39291575502/1` er faktisk leveret med Pages og særskilt offentlig kontrol omkring kl. 20.00 dansk tid. Den genbrugte gemte vejrinput. Almindelig `39299413035/1` er ved dette checkpoint i beregning; ingen ny almindelig deploy påstås.
- Lokal SOURCE_PREPARED: De fire normale private spec/create/seal/upload-trin flyttes før sene artifactkontroller, så et allerede færdigt resultat kan overleve en efterfølgende leveringsfejl.
- Valgfri `completed_stage_source` genbruger original autentificeret ordinary B/GCM gennem eksisterende completed-runtime-mode, med ægte parent-B/S, samme beregnings-/admin-/modelgrundlag og alle normale produktionsgates. Ingen ny providerhentning eller rescore af en gyldigt genanvendelig færdigpakke.
- Original producentidentitet, 55+3, no-loss, privacy, B før S og frisk parentkontrol består. Ukendt central skrivning eller manglende artifact er ikke tilladelse til retry.
- Målrettet delevidens foreligger; samlet positiv genuine-admit, præcis source-CI, installation og produktionsbrug af den nye vej er fortsat åbne. Version, C/I/T, databasefunktioner/migrationer, scoremodel, geometri og leverandørbudgetter er uændrede. Den eksisterende installationsfils ene håndbogstekst synkroniseres normalt med webhåndbogen, med fuld bevaring af alle øvrige SQL-bytes.

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
