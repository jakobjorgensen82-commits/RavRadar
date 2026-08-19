# DEC-0042 – GitHub-ejet 15-minuttersplan og Copernicus-timegate

- **Status:** Aktiv ejerbeslutning, lokalt implementeret i 4.0.234; naturligt GitHub-bevis afventer
- **Besluttet:** 2026-08-19
- **Ejerbeslutning:** Ja

## Baggrund

Den eksterne cron-job.org-trigger startede produktionen ved minut 00, 15, 30 og 45. Ved timeskift kunne produktionsjobbet og den private Copernicus-pilot starte samtidig. Produktionen gendannede da en cache uden den nye UTC-time og stoppede korrekt på 630/673, selv om piloten kort efter gjorde timen komplet. Fejlen var en rækkefølge-/timingfejl, ikke tilladelse til at sænke 673/673-gaten.

Ejeren bad samtidig om at lade GitHub styre den normale 15-minutterskørsel og først sige til, når cron-job.org sikkert kan deaktiveres.

## Beslutning

1. `.github/workflows/update-and-deploy.yml` ejer den normale tidsplan ved UTC-minut 14, 29, 44 og 59.
2. Den private Copernicus-pilot bestilles ved UTC-minut 6, så den aktuelle hele time normalt findes før første produktion ved minut 14.
3. Et minimalt `current-hour-readiness`-job gendanner kun den private cache og kontrollerer sikre metadata før en GitHub-planlagt produktion samt under overgangens almindelige, ikke-tvungne `workflow_dispatch` fra cron-job.org.
4. Mangler den aktuelle UTC-time, får den tidsstyrede kørsel status som sikkert udsat: den bygger ingen nye vejrdata, kører ingen Supabase-sync og uploader/deployer intet Pages-artifact. Heartbeatet dispatcher piloten, og næste tidsstyrede 15-minutterskørsel prøver igen.
5. Push og manuel `force=true`-release forbliver fail-closed gennem den fulde kæde. De bruger ikke den tidsstyrede udsættelse og må ikke springe validering, releasegate eller 673/673 over.
6. Cachen må ikke logge eller uploade rå U/V eller credentials. Retention er fortsat præcis 168 timer med de eksisterende schema-, fingeraftryks-, celle-, tid- og lagkrav.
7. cron-job.org deaktiveres først efter mindst én naturlig GitHub-`schedule`-kørsel på `main`, hvor readiness-job, normal preflight og den forventede build/skip-adfærd er verificeret. Indtil da kan begge triggere kortvarigt eksistere under den fælles concurrency-kø.
8. Overgangens almindelige cron-dispatch er omfattet af samme timegate, så en ny hel time udsættes grønt i stedet for at skabe et forventeligt rødt 630/673-run; en bevidst manuel tvangskørsel kræver fortsat `force=true`.

## Produktionsbevis 2026-08-19

- Pushrun `#32242510084`/`#3207` på overgangscommit `4ab7a659` bestod hele den fail-closed kæde, inklusive Supabase og Pages.
- Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` startede 2026-08-19T10:53:50Z, cirka ti minutter efter 10:44-planpunktet, og bestod current-hour-gate, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- Eksternt hel-timeskald `#32245473213`/`#3211` startede 2026-08-19T11:00:39Z uden den nye eksakte time. Readiness-jobbet bestod, mens `build-and-prepare` og Pages-deploy blev sprunget over; ingen Supabase-sync eller artifact blev udført. Den tidligere røde 630/673-race er dermed direkte verificeret som et grønt sikkert skip.
- Overdragelseskravet i punkt 7 er dermed opfyldt. Ejeren er instrueret i at deaktivere RavRadar-jobbene i cron-job.org; faktisk deaktivering og en efterfølgende native kørsel uden ekstern dublet skal kontrolleres ved næste mulighed.

## Uændret

- Land-/vandpunkter og central admin-sandhed ændres ikke.
- Kildeordenen er DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → kun de otte allowlistede `dkss_lf`-proxyer ≤15 km.
- Normal `controlled-live` kræver fortsat præcis 673/673.
- Score, pile, U/V, dybdelag, interpolation og rollbackpolitik ændres ikke.

## Beviskrav

- målrettede workflow-, heartbeat- og cachetests lokalt,
- fuld `npm run validate` og `npm run release:gate`,
- pushrun med fulde gates og deploy,
- derefter mindst én naturlig `schedule`-kørsel før ejeren bliver bedt om at slukke cron-job.org.
