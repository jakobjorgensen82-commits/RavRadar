# DEC-0150 – privat runtime lukkes for klienter og restore genprøves afgrænset

**Dato:** 2026-09-15  
**Status:** Aktiv og bindende

## Beslutning

Den beskyttede produktionsruntime i Supabase Storage er kun til `service_role`.
En restriktiv policy skal afvise både anonyme og almindeligt autentificerede
SELECT-kald til netop denne bucket, også hvis en ældre bred permissiv policy
findes for andre assets.

Migration `20260914234500` forbliver den seneste RavScore-binding og må ikke
ændres eller genkøres. Privacyrettelsen leveres som nyt append-only led
`20260915020000`. Migrationskoden skal derfor skelne mellem den seneste
modelbinding og den seneste migration, der skal anvendes.

Restore fra den eksakte `fa418f43`-generation må genprøves højst tre gange ved
Supabase-/Storage-ustabilitet. Forventningen bygges først mod den urørte
historiske kilde. Loggen må kun få faste, payload-frie afvisningskategorier;
ukendte fejl må ikke lække fejltekst fra private data.

Både direkte current-restore og forgængerrestore skal bevise, at den konkrete
gemte generation ikke kan downloades anonymt, før workflowet må fortsætte mod
offentlig runtime og Pages. Supabase-status 400, 401, 403 og 404 er afvisning;
200 er en reel læk og stopper forløbet.

## Begrundelse

Run `34915725308` beviste, at central version 1 og migration 16 er på plads,
men stoppede ved restore. Run `34877443841` viste samtidig HTTP 200 ved anonym
læsning af den publicerede private generation. En blind gentagelse er derfor
utilstrækkelig: samme rettelse skal både lukke adgangen, tåle kortvarig Storage-
ustabilitet og give en sikker årsagskategori, hvis fejlen er deterministisk.

## Ikke ændret

Ingen providerhentning, oneoff, vejrdata, scoreformel, modelbundle, geometri,
central operational version eller eksisterende runtimepointer nulstilles.
