# RavRadar 4.0.477 – læsbar diagnose af den resterende checkpointfejl

- Bevarer den eksisterende, kildebundne DMI-fastholdelse i otte
  Limfjordskystdele i højst tre timer og 15 km. Ingen nye
  strømvektorer eller falsk komplet historik skabes.
- Retter kun den skrivefri Candidate G-diagnose, som returnerede
  `true`/`false` i stedet for en fast fejlkode ved ufuldstændig
  historik. `C07` viser statusafvigelse og `C08` dækningsafvigelse.
- Append-only migration og måltest; CAS-accept, scoreformel,
  vejrprioritet, cache og geometri er uændrede.

Livekæden i 4.0.476 fjernede de otte I04-afvisninger, men stoppede
på P04 før checkpoint og Pages. 4.0.477 er endnu ikke et bevis
for offentlig deploy eller komplet vejrdata.
