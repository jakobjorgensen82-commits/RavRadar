# 4.0.456 – korrekt checkpoint-readback efter append-only repair

## Hvad der blev rettet

- Code-only readbacken fandt en reel kildeblanding: trip-politikken skal fortsat
  læses fra den seneste fulde binding, mens checkpoint-CAS-kontrakten blev
  genindsat af den nye append-only migration `20260922100000`.
- Readback-koden brugte fejlagtigt den gamle migrationsfil som forventet kilde
  til checkpoint-hashen. Derfor afviste den korrekt deployet database med
  `database checkpoint CAS contract definition hash drifted`.
- Readbacken bruger nu den samme successor-kilde som den faktiske database-
  funktion. Der ændres ikke i scoreformel, vejrdata, cacheindhold eller
  historiske migrationsfiler.

## Driftsstatus

Code-only-kørsel `35728472112` nåede migrationen og stoppede ved den forkerte
lokale forventningskilde. Den gamle vejrkørsel er annulleret. Næste skridt er
en ny kort code-only readback på den rettede `main`; først derefter genoptages
en almindelig vejrkørsel fra gemt fremgang.

## Ikke ændret

DMI-first-prioritet, fallback, bevarelse af gamle gyldige værdier, MISSING-
semantik, scorematematik, Candidate G-reserven og offentlig UI-adfærd er ikke
ændret.
