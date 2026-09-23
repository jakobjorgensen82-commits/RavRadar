# DEC-0247 – Mål den resterende checkpointafvisning uden at fjerne Limfjord-fastholdelsen

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.477; produktionsbevis afventer

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

4.0.477 retter kun den skrivefri årsagsfunktion append-only:
`C07` betyder afvigende ikke-READY-status; `C08` betyder afvigende
beregnet dækning. Den eksisterende validator, CAS-accept,
tre-timers-/15-km-grænser, scorematematik, vejrdata og offentlige
felter ændres ikke. Alle 673 tilstande klassificeres i ét
providerfrit gennemløb, før en eventuel rettelse af selve
årsagen besluttes. Ingen privat del-ID, måling eller payload logges.

Først når checkpoint og Pages faktisk er bevist, fortsættes normal
vejrhentning med feltvis DMI/Copernicus/Open-Meteo- og cachemåling.
Den senest målte havstrømsrest på 5.201 par er stadig åben; det
er ikke et tal for alle vejrtyper. Cron forbliver pauset.
