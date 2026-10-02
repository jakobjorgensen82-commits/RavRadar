# DEC-0278 – Top20 med fast backup og urørt fysisk scoremodel

**Status:** Ejerbestilt; særskilt lokal kandidat under implementering, ikke leveret.
**Dato:** 2026-10-02.

## Ny ejerautoritet

Ejeren præciserede, at Top20 skal laves efter et fast tilbagevendingspunkt og kodebackup, og bestilte samtidig fortsat færdiggørelse og levering af hele vejrhentningsrevisionen. Dette supersederer DEC-0275s uafklarede Top20-afklaring: en nødvendigt og kontrolleret teknisk binding af den udvidede visning kan undersøges og implementeres. Det er IKKE tilladelse til at ændre scoreformler, parametre, handicap, sortering, tidsvalg, historikregler eller andre særskilt afviste handlinger.

## Faktisk backup

Efter at automatisk sikkerhedsreview afviste det bredere bindings-/migrationsvalg og deploykontrol, blev ejeren spurgt om netop dette ekstra omfang. Ejerens faktiske svar: **"Ja, godkend det afgrænsede tekniske omfang"**. Spørgsmålet fastholdt urørte scoreformler, handicap, rangering, målinger/historik, afvisning af ukendte data og ingen særskilt SQLinstallation. Dette er ny, specifik Top20-autoritet; det er IKKE genåbning af den særskilt afviste11.08-admissionworkflowgate eller øvrige afvisninger.

Verificeret main/source4.0.530 er `a14f6aa40b1778f1e462e6b923d0c3adb6d4a6ce`.
Annoteret remote tag `codex/backup-top5-4.0.530-2026-10-02` er faktisk pushet og servergenlæst; tagobject `99a7daa4ac0a189b2a589aee4a06da4f2c9a2117` peeler til denne commit. Lokal Git-sourceZIP er16.428.816bytes/2.290entries, SHA256 `6bd4196d2b05f73a8a58d74af6f1b7b403a98a148f4abe85d2b547ab54a85fa0`. Ingen `.git`, `.cache`, `node_modules` eller `.env` entries. Det er ikke en kopi af privat produktionscache, DNS eller databasen.

Tilbagevej er en ny kontrolleret UI-Top5-kodeleverance på seneste main, mens nyere gyldige vejrdata/cache/historik bevares. Ikke et gammelt artifact, gitreset eller blind ommærkning. Producentens Top20-indeks kan fortsat bruges ved en UI-rollback, som viser de første fem; ingen ny fysisk scoreberegning er nødvendig. Eksakt kilde- og efterdatakontrol består.

## Afgrænsning og eksisterende data

Kun producentens afsluttende `.slice(0,5)` bliver `.slice(0,20)`. Der er fortsat fem datoer og to søgemåder. Bedste områder her og nu er fortsat Top5. Gamle autentificerede/forsiglede femrækkers indeks forbliver femrækkers og vises uden en national detaljehentning. Kode-only må ikke kaldes faktisk Top20-effekt, før en ny almindelig produktion og offentlig visning har bevist tyve resultater.

Den eksisterende67-filers kildehashberegning er kørt uden model-eval eller kopi: kontrakthash `a226e7d1…` er uændret; kun `scripts/public-conditions-lib.mjs` har en ny normaliseret kildehash. Præcis inverse20→5 giver igen hele den gamle bundle `c557f91a…`. Ny bundle er `3a14f458122f5bc0ea8a60c07abbcbd68d022c0322a87e77242891f21631c852`. Ingen runtimehashalias eller fjernet gate. Candidate G-orakelbundle er faktisk uændret `a2494810…`.

Bindings-/checkpointovergangen skal være append-only, håndtere den præcise gamle binding og bevise uændrede målinger/state. Historiske migrationer bevares; ukendte eller modstridende bindingsdata afvises. Ingen særskilt SQLinstallation, providers, privat payloadlog eller ny recoveryautoritet. En ny kildebinding alene er ikke cache-, drifts- eller kapacitetsbevis.

## Målprøver og åbent arbejde

Nyeste08.53DK: PR499/head0508759a blev konkret CI-rød i36974750780. To historiske engangsfixtures forudsatte fejlagtigt, at den aktive offentlige projektion stadig var deres gamle Top5-hash. Runtimeafvisningen var korrekt og er URØRT. De eksisterende positive historiske prøver bruger nu deres navngivne gamle projektion, og nye negative assertions beviser, at den aktuelle Top20-projektion IKKE genåbner scheduler-, hourly-v1- eller marine-undtagelsen. De to præcist fejlede scripts består2/2/6766.9041ms/0skip. Ingen productionpredicate, hashallowlist eller historisk donorautoritet er lempet. Ny exact-headCI kræves efter denne konkrete testrettelse.

Naturlig530 ordinary36964052139 er faktisk SUCCESS08:39:39DK med gemmebetinget ny cacheupload107/108, no-loss112,54/54artifact+3/3release,private/CAS/R2/privacy/Pages/exact29/reseal38/terminal40/requireddeploy. Små payloadfrie rapporter er matched mod præcis maina14f6aa4s commandplan. Ny cache8402996341 er107.612.589komprimeredeActionsbytes, ikke rå/cipherkapacitet. Offentlig530 er rr-20261002055102-210/reference04Z/generated05:51:02.73Z/210zoner/673dele/complete:true. Dette supersederer aktivrunstatus nedenfor og giver ikke offentlig Top20-effekt.

Eksisterende måltests består på25 kunstige zoner: fem dage, begge modes,20 unikke sorterede rækker, gamle første fem scorer/rækkefølge og uændret input samt nonblocking UI uden stor detaljepakke. Første lokale Node-testforsøg var spawnEPERM, ikke runtimefejl. Den tidligere sekszone-performancefixture overskred konkret sit24.000byte-budget med24.141bytes. Den ændrede25zone-prøve bestod med77.771bytes/2.974gzipbytes og præcis firefoldigt offentligt rækkebudget; dette ændrer ingen privat/runtimekapacitetsgrænse.

Pc får to kolonner fra880px; mobil én kolonne med navneombrydning. Faktisk samme Chrome læste den lokale, rigtige UI-renderer og CSS i en pc-ramme og en375CSS-pixel-iframe:20rækker/fem datoer, henholdsvis to/én kolonne, lange navne uden sideværts overløb, DA/DE/EN, datoskift og klik på række20. En autentificeret gammel femrækkers fixture blev fortsat vist med fem rækker. Dette er ikke fysisk telefon, fuld app, ny produktion eller offentlig Top20-effekt; previewfane og lokal server er lukket.

Append-only-bindingen er kandidat4.0.531. Generatoren beviser præcis inverse20→5, uændret fysisk kontrakt/Candidate G/continuation og LF-identiske anvendte forgængermigrationer. Den nye private SQL-projektion ændrer kun de to eksakte bundlepaths for den navngivne gamle binding, kræver673states og kører hele den nuværende payloadvalidator. Same-target-CAS kræver fuld stateækvivalens efter projektionen, bortset fra de tre afledte digests; ukendte/miksede data afvises. Helperens kilde indgår i samme eksakte readback og har ingen offentlig executeadgang. Install-/readiness-/releasecontract- og eksisterende private migration/hourpack/atomicpair-prøver består. Ingen lokal eller særskilt produktions-SQLkørsel er foretaget: syntaks/kildeparitet er ikke live SQL-eksekveringsbevis.

RDKS4.0.531/14chats, model67/otte bindingsforbrugere, lille kildegate102browserfiler, version-/security-/sourceplan-kontroller og ren topversionsdiff for begge geodata består. Exact-headCI, deploy og offentlig effekt er fortsat åbne. Stor519 er separat og OFF; den er ikke leveret af Top20 og skal fortsat sammenkobles/testes/leveres selvstændigt. Aktiv ordinary36964052139 på uændret530/main fortsætter; ingen mainændring under den.
