# DEC-0247 – Ret ledsagerens checkpoint-id uden at fjerne Limfjord-fastholdelsen

**Dato:** 2026-09-23
**Status:** 4.0.477 produktionsverificeret i run 35887652848; vejrdækning åben

**Efterfølgende bevis 2026-09-23:** Normalrun `35887652848` passerede
checkpointgemning, beskyttede writes og Pages. Den tidligere P04-spærre
er dermed fjernet. Kørslens ene fejlede diagnostiske efterkontrol og
de fortsatte vejrhuller behandles separat i DEC-0248.

4.0.476/PR #438 bestod exact-head `35876784322` og blev merged som
`76801468`. Den første providerfri fortsættelse `35877663757` blev
fejlagtigt startet som »udgiv nyere gemt vejr«, selv om offentlig og
privat pakke har samme referencetime. Den stoppede før providerkald,
checkpoint og deploy. Korrekt kode-only-fortsættelse `35878951916`
genbrugte derefter den præcise gemte pakke og byggede 673 integrerede
og 673 private ledsagetilstande. De otte tidligere `I04` er væk,
men checkpoint-CAS afviste hele pakken som `P04`; der kom derfor
hverken checkpointskrivning eller Pages-deploy.

`P04` vedrører den private Candidate G-ledsagetilstand. Den er ikke
den offentlige scoremodel, men er fortsat en del af det beskyttede
checkpoint. SQL-diagnosen fra 4.0.473 havde en egen fejl: dens
ikke-READY-gren returnerede et boolsk udtryk i en tekstfunktion.
Resultatet blev `true`/`false` i stedet for de faste `C`-årsagskoder.
Derfor blev alle 22 diagnoseportioner registreret som ukendte koder.
Klientens anonyme filtrering virkede korrekt, men skjulte dermed
forskellen mellem afvist status og afvist historikdækning.

Ejerens Limfjord-undtagelse bevares. Otte navngivne `dkss_lf`-dele
kan bruge en faktisk, kildebundet DMI-måling i højst tre timer og
højst 15 km fra målepunktet. Det er nødvendigt ved DMI's native
målefrekvens og er ikke en ny timeværdi, pil eller transportkredit.
En senere tom evidenstime er fortsat MISSING, og næste ægte måling
overtager. Vi må ikke gøre et legitimt kort hold ulovligt for at få
en grøn databasekontrol.

Et efterfølgende statisk krydstjek af den præcise checkpointproducent og
SQL-accept viste også den faktiske P04-spærre: Den private ledsager får
`rollbackId=integrated-schema5-to-candidate-g-schema2-v2` fra den
frosne Candidate G-pakke, mens den anvendte SQL kræver
`integrated-schema6-to-candidate-g-schema2-v3`, som er den aktive
integrerede controllers **separate overgangs-id**. Begge id'er er
konstante, så denne uoverensstemmelse afviser pakken før nogen
tilstandsvalidering. Den må ikke løses ved at ommærke den frosne pakke
eller fjerne feltet.

4.0.477 retter først den skrivefri årsagsfunktion append-only:
`C07` betyder afvigende ikke-READY-status; `C08` betyder afvigende
beregnet dækning. En anden append-only migration retter dernæst
**kun** checkpointets to sammenligninger af ledsager-id til den
eksakte, allerede hashbundne v2-pakke. CAS-funktionen, integreret
controller-id, Candidate G-pakken, alle tilstands-, generations-,
del-, tids-, privatlivs- og modelbindingskrav, tre-timers-/15-km-
grænser, scorematematik og vejrdata forbliver uændrede. Den separate
manuelle returvej til Candidate G ændres ikke. Ingen privat del-ID,
måling eller payload logges.

P04-id-mismatchen er bevist i kode og anvendt SQL, men en ny faktisk
checkpointskrivning er endnu ikke bevist. C07/C08 kan vise eventuelle
yderligere tilstandsafvisninger i ét providerfrit gennemløb.

Først når checkpoint og Pages faktisk er bevist, fortsættes normal
vejrhentning med feltvis DMI/Copernicus/Open-Meteo- og cachemåling.
Den senest målte havstrømsrest på 5.201 par er stadig åben; det
er ikke et tal for alle vejrtyper. Cron forbliver pauset.
