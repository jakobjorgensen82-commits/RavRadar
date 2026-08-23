# DEC-0066: Alle uploadfelter skal verificeres mod den aktive observationstabel

**Status:** CENTRAL HOTFIX ANVENDT; 4.0.267 RELEASE AFVENTER

**Dato:** 2026-08-23

**Scorepåvirkning:** Nej. RavScore, Candidate G, vejr, geometri og land-/vandpunkter ændres ikke.

## Fund

Efter 4.0.266 kunne **Mine ture og fund** læses, men ejerens to manuelle kontoindberetninger blev fortsat ikke eftersendt. En aggregeret produktionskontrol viste nul nye rækker. Den aktive `observations`-tabel havde alle læsefelter, men manglede de to POST-only-felter `forecast_target_at` og `report_accuracy`, som den manuelle kontoindberetning sender.

4.0.266-testen kontrollerede turloggens SELECT-feltliste og fandt derfor ikke denne særskilte uploadmangel. Det er utilstrækkeligt fremover.

Efter den centrale skemarettelse viste en ny ejerprøve fortsat nul ture. API-loggen viste vellykkede GET-kald, men intet POST-forsøg. Den fælles klientkontrol mod præcis position afviste feltet `gps`, selv når værdien var den krævede tomme værdi `null`. Fejlen skete før lokal lagring og kølægning og ramte derfor både kontoindberetningen og **Start ravtur → Slut ravtur**.

## Beslutning

- Den idempotente migration `20260823_observation_upload_contract.sql` tilføjer kun `forecast_target_at timestamptz` og `report_accuracy text` med den eksisterende værdibegrænsning.
- Migrationen ændrer eller sletter ingen observationsrækker og genindlæser PostgREST-schemaet.
- Regressionen skal kræve begge POST-only-felter i en versionsstyret produktionsmigration og skal fortsat afvise `UPDATE`, `DELETE` og `TRUNCATE`.
- Den almindelige tur fra **Start ravtur → Slut ravtur** sender ikke de to manglende skemafelter, men var ramt af den fælles klientfejl før upload.
- Privatlivskontrollen må acceptere en lokationsnøgle, når værdien er præcis `null`, fordi databasen kræver `gps=null`. Enhver ikke-tom GPS-, koordinat-, positions-, rute- eller spornøgle skal fortsat afvises.
- Begge uploadveje bruger fortsat samme outbox og samme `observations`-tabel. Når en række først er lagt i kø, genbruges dens klient-id ved genforsøg; der oprettes ingen dublet.

## Produktionskontrol før release

- Før hotfix: 0 nye rækker i de seneste 30 minutter; ingen privat payload blev læst.
- Den aktive tabel manglede præcis `forecast_target_at` og `report_accuracy` blandt den manuelle uploads felter.
- Central migration gav **Success. No rows returned**.
- Read-only efterkontrol viser begge kolonner som til stede og fortsat 0 nye rækker før ejerens genindlæsning.
- Efter genindlæsning viste API-loggen fortsat kun GET og intet POST. De to forsøg blev derfor ikke gemt i outboxen og kan ikke automatisk eftersendes; en ny prøve kræves efter udgivelsen.

4.0.267 må først kaldes lukket, når exact-head, produktion og én ny ejerindberetning har bekræftet, at en tur sendes og kan ses i turloggen.
