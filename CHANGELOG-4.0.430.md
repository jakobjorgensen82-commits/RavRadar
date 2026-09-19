# RavRadar 4.0.430

## Samlet helkæderettelse

- Nye gyldige vejrkomponenter erstatter gamle pr. sted, time og komponent.
  Huller i en ny hentning bevarer den gamle gyldige værdi; først udløbet og
  fortsat tomt bliver `MISSING`, uden at resten af siden gøres ubrugelig.
- DMI-plan, fremtidsrotation, støttehorisont H118–H120 og overtagelse fra
  reservekilder er samlet. Copernicus og Open-Meteo kan udfylde manglende
  vind, bølger, strøm og vandtemperatur. Kvalificeret nyere reserve kan
  udfordre et DMI-modelrun fra 96 timer; vandstand er altid DMI-only.
- DMI's PP1D-peakperiode er skilt fra MWP-middelperioden gennem decode,
  provenance, historisk inputovergang og scoreinput uden ændring af
  RavScore-formlen.
- Warmup, gammel checkpointlæsning, historisk replay, fælles reentry,
  monotont Pages-target, fejlet central complete og browserens shard-/
  current-hour-/resumeadfærd er rettet som én kæde.

## Selvkørende og privat drift

- Supabase genprøver afbrudte responsebody-læsninger for sikre reads og
  identiske idempotente writes uden at skjule ugyldige eller for store svar.
- Private DMI-/Copernicus-/Open-Meteo-mellemdata og staging gemmes som én
  AES-256-GCM-krypteret progressfil med 256 MiB loft og domæneadskilt nøgle
  afledt af den eksisterende service-role-secret. Vellykket privat runtime
  bærer samme allowlistede fremgang holdbart.
- Aktive workflows skriver ikke længere de gamle ukrypterede private
  Actions-cachefamilier. Historisk post-build-refresh, keepalive og pilot-
  oneoff er permanent deaktiveret. Officiel rå DMI-GRIB-cache bevares.
- En krypteret payloadfri terminalkvittering i eksisterende privat Storage
  gør en uafsluttet central overgang genoptagelig efter GitHubs 14-dages
  artifactudløb med præcis run/attempt/head/binding og CAS/readback.
- Kildegaten er reduceret til 24 direkte produktionskritiske kommandoer og
  samler fejl. Fuld gate køres én gang på det eksakte PR-head.
- Den fælles recovery-workflow er nu en fast releasekontraktrolle. Den nye
  warmup-migrationssuccessor følger bindingsfixturen og releasegaten, så
  version/bundle/schemabinding ikke først kan fejle efter merge.
- Afsluttende krydskontrol rettede tre gamle forbrugere af den nye sandhed:
  aktive håndbogsbindinger/continuation-hash, code-only-testens gamle
  rækkefølge og cutover-testens erstattede tre-timers warmupregel.
- Første exact-head-kildegate gennemførte hele listen og fandt yderligere to
  forældede testforventninger. De beviser nu fælles holdbar restore for alle
  moderne schema-4-forløb og den eksakte private inventory med ni basisfiler
  plus højst én godkendt, autentificeret komponentpakke.
- Den sekventielle generator-test er krydstjekket helt til slut og følger nu
  den ene krypterede progresskæde i stedet for de fjernede separate plaintext-
  cacher for DMI active/candidate; den bevarer stadig READY-only promotion.

## Leveringsstatus

4.0.429 / `4bee5b0d` er fortsat produktionsbaseline ved oprettelsen af denne
changelog. Rettelsen er lokalt måltestet, men komplethed, rigtig restore,
central reentry, deploy, browser/Safari og flere selvkørende almindelige
vejrkørsler skal bevises efter merge. Cron forbliver deaktiveret indtil da.
