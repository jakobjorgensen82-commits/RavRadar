# DEC-0136 – hashbundet privat runtime over flere Storage-objekter

- **Status:** Bindende
- **Dato:** 2026-09-13
- **Præciserer:** DEC-0122, DEC-0134 og DEC-0135

## Evidens

4.0.353-head `d0748d9e495c0b69cb9c7dcb490ccac27635182c` bestod exact-head-sourcegate `34754075158` og blev merged gennem PR #290 som main `6305dd823775a05425f1c6f3113b85cc2d06f2e1` med identisk filtræ.

Den exact-run-bundne fortsættelse `34755365967` brugte main, genbrugte sourceproofet og live-verificerede `34738698219`. Den gendannede de fire eksakte cacher og genbyggede runtime uden providerhentning og uden ny 210/673-audit. 4.0.353's nye 2-GiB-rågrænse passerede. Den næste fejl var `Private runtime compressed archive exceeds its bound` efter den komplette komprimering. Hele arkivet var altså større end Supabases tekniske 50-MiB-grænse for ét Storage-objekt.

En separat linjegennemgang fandt samtidig et bogstaveligt `+` mellem `jq`-filter og rapportsti i fortsættelsens næste gate. Den linje var endnu ikke nået, men ville have stoppet et ellers grønt handoff.

## Beslutning

1. Én privat runtimegeneration er fortsat ét deterministisk gziparkiv med én samlet SHA-256, men Storage-transporten må dele arkivet i en ordnet objektliste.
2. Hvert Storage-objekt må højst være 50.000.000 byte. Det forbliver under bucketens uændrede tekniske 50-MiB-grænse på 52.428.800 byte.
3. En generation må højst være 350.000.000 komprimerede byte og højst otte objekter. To bevarede generationer bliver dermed højst 700.000.000 byte og holder den eksisterende 30-procentsreserve i en 1-GB Storage-kvote.
4. Hver del bindes til indeks, content-addressed path, byteantal og SHA-256. Descriptoren binder delrækkefølgen, samlet byteantal, hele arkivets SHA-256, bundlehash, dataset, target, source-head, modelbinding og kontrakthashes.
5. Publicering uploader alle immutable dele og læser hver del byteeksakt tilbage. Først derefter må den eksisterende pointer-CAS gøre hele generationen current. En delvis upload kan aldrig blive aktiv.
6. Ved tabt CAS må kun dele skabt af det aktuelle forsøg og ikke refereret af current eller previous fjernes. Efter succes må retired dele kun slettes, når ingen bevaret generation refererer dem.
7. Restore henter delene i valideret rækkefølge, genopbygger højst 350.000.000 komprimerede byte og kontrollerer den samlede hash. Derefter fortsætter DEC-0135's én-fil-ad-gangen-udpakning med deklareret outputgrænse, byteantal, SHA-256, privat stage og atomisk rename.
8. Pointer/descriptor schema 2 beskriver objektlisten. Schema 1-enkeltobjekter forbliver strengt læsbare for legacy/rollback; nye writes bruger kun schema 2.
9. Det fundne `jq`-plus fjernes, og begge kapacitetsgates kræver den samme samlede grænse, delfilsgrænse og objektoptælling.
10. DEC-0122's materielt afgrænsede first-cutover-undtagelse flyttes under ejerens stående launchautorisation alene til exact release `4.0.354`. Den gælder højst én exact verified first cutover og åbner ikke tilbagevendende fuld cachetransport.

## Uændret

Råpayloadloftet er fortsat 2 GiB for nye `GZIP_BASE64`-arkiver, 768 MiB pr. fil og 768 MiB samlet for legacy. Supabase-bucketens tekniske objektloft, privacy, anonym afvisning, bundleinventar, model-/kontrakthashes, same-head-handoff, fulde post-data-gates, database/checkpoint, Pages og offentlig verifikation består.

Vejrdata, kildeprioritet, fallback, RavScore, fysik, modelstate, migrationer, geometri, land-/vandpunkter og offentlig 210/673/118-struktur ændres ikke. Samme låste cacher genbruges uden oneoff eller providerkald. Bæredygtig normal cachetransport forbliver obligatorisk post-launch-arbejde.
