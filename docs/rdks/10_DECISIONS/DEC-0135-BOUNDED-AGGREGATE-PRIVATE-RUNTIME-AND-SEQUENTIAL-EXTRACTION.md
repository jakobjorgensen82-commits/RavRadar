# DEC-0135 – afgrænset samlet privat runtime og sekventiel udpakning

- **Status:** Bindende
- **Dato:** 2026-09-13
- **Præciserer:** DEC-0122 og DEC-0134
- **Erstatter:** DEC-0134 punkt 5 alene for nye `GZIP_BASE64`-arkivers samlede råpayload

## Evidens

4.0.352 blev exact-head-valideret i sourcegate `34744340201`, merged gennem PR #289 og ligger på main `ec198c739d6c45f5f5d8dd3239f8fa01210f6a36`. Handoff-fortsættelse `34745557797` live-verificerede det tidligere grønne run `34738698219`, gendannede fire eksakte cacher og genbyggede den private runtime uden providerhentning og uden ny 210/673-audit.

Den nye komprimering før base64 passerede den tidligere V8-strengfejl. Kapacitetsmålingen stoppede derefter med `Private runtime archive raw payload exceeds its bound`. Det betyder, at de verificerede private filer samlet var over 768 MiB; det er ikke evidens for vejrhuller, modelsvigt eller utilstrækkelig køretid.

## Ejerbeslutning

Efter præcis oplysning om indstilling og påvirkningsområde godkendte ejeren udtrykkeligt følgende:

1. Nye arkiver med `contentEncoding=GZIP_BASE64` må højst deklarere 2 GiB ukomprimeret payload samlet.
2. Hver enkelt fil må fortsat højst være 768 MiB.
3. Legacyarkiver uden encodingmarkør må fortsat højst være 768 MiB ukomprimeret samlet.
4. Første cutover må fortsat højst bruge 50.000.000 komprimerede byte. Det ligger inden for det uændrede tekniske Supabase Storage-objectloft på 50 MiB.
5. Udpakning skal ske én fil ad gangen: base64-afkodning, bounded gunzip, byteantal, SHA-256 og privat midlertidig skrivning. Først efter alle filer er kontrolleret, må bundlen atomisk blive synlig.
6. Over 2 GiB samlet, over 768 MiB i én fil, ukendt encoding, forkert inventar, forkert størrelse eller SHA-256-afvigelse stopper fail-closed.

## Afgrænsning

Ændringen giver plads til flere store, allerede verificerede cachefiler i samme private bundle. Den hæver ikke filgrænsen, legacygrænsen, det offentlige artifact, Supabase-objectloftet, checkpointgrænser eller anonyme adgangsregler. Den ændrer ingen vejrdata, kildeprioritet, score, fysik, modelstate, databasebinding, geometri eller offentlig 210/673/118-struktur.

DEC-0122's materielt uændrede first-cutover-undtagelse flyttes alene til exact release `4.0.353`. Et gammelt handoff ommærkes ikke. Fortsættelsen bruger fortsat exact `34738698219` og de fire fastlåste cacher, uden oneoff eller providerhentning; kapacitetsmåling, handoff og den separate fulde cutoverkæde består.
