# DEC-0217 – Offentlige timefiler bevares i en privat leveringspakke

**Status:** Implementeret i 4.0.438; overgangskorrektion lokal i 4.0.439;
produktionsbevis åbent
**Dato:** 2026-09-19

## Tillæg 2026-09-20 – genkendelse skal efterfølges af anvendelse

4.0.438 bestod exact-head `35471789111`, PR #383, merge `2fbfe3b2` og
backend `35472148224`. Normalrun `35472299635` gennemførte providerkæden og
aktuel closure med 673/673 scoreklare kystdele, men stoppede før score-runtime.

Den eksakte `bounded-conditions-writer`-forgænger blev genkendt og restored
korrekt. Workflowet installerede den imidlertid uden først at føre den gennem
den allerede eksisterende hærdede modelbindingstilpasning. Derfor beholdt
alle 673 validerede integrerede fortsættelser forgængerens bundlehash og blev
afvist af den aktuelle læser.

4.0.439 kræver, at denne exact-match-overgang migreres før installation.
Migreringen bruger forgængerens egen validerede læser og kræver eksakt source,
source/targetbindinger, kontrakter, inventar og 210/673. Den ændrer kun det
kendte bundlemærke i de integrerede fortsættelser. Målinger og Candidate
G-state bevares uændret. Ukendte filer eller afvigelser stopper fortsat. Den
uafhængige historical-wave-klassifikation køres kun for sin egen
overgangstype. Beslutningens databevarelse og alle øvrige krav er uændrede.

## Observeret problem

4.0.437 blev merged som `65bda6a9`. Normalrun `35463989289` gendannede den
krypterede fremgang og gennemførte DMI, Copernicus, Open-Meteo, historik og
scorebygning. Det sikre produktionsspor viste vind og bølger 673/673,
brugbar strøm 673/673 og beregnelig vade- og strandscore 673/673.

Kørslen stoppede først i `Update central weather cache`, da den private
`conditions.json` skulle færdiggøres. 4.0.436's streamingwriter fjernede den
første store `JSON.stringify`, men den efterfølgende læsekæde kræver stadig
hele filen som én UTF-8-streng og ét `JSON.parse`. Filens største del var en
anden kopi af de 118 offentlige timedokumenter inde i hver af de 673
kystdeles `hourly`-rækker. En højere filgrænse ville derfor bare flytte samme
fejl til næste læser.

## Beslutning

1. Hele den færdige offentlige runtime bygges, mens det komplette private
   resultat stadig er i hukommelsen. Strømproveniens færdiggøres før denne
   forsegling.
2. De nøjagtige 118 offentlige timefiler pakkes deterministisk og gzip-
   komprimeret i en privat `public-hour-delivery.pack`. Hver rå og komprimeret
   post bindes med filnavn, time, byteantal og SHA-256.
3. Pakken bindes desuden til dataset, produktionstime, detaljehash,
   modelbinding og præcis 118 timer. Samlet pakkegrænse er 256 MiB; hver rå
   og komprimeret post må højst være 8 MiB.
4. Startsidedokumentets færdigberegnede nationale prognose/rangering bevares
   i den hashbundne conditions-markør. Den må ikke genberegnes fra de fjernede
   private hourly-rækker og dermed blive tom efter restore.
5. Den private `conditions.json` beholder current, state, metadata,
   proveniens, scorer og alle øvrige data, men fjerner den dobbelte
   `coastalParts.parts[*].hourly`-projektion. En hashbundet markør beskriver
   den tilhørende timepakke.
6. Conditions og timepakken installeres som ét atomisk par. Hvis bygning,
   validering eller installation fejler, efterlades den tidligere gyldige
   generation urørt.
7. Senere publicering genskaber timefilerne byte-for-byte fra den
   autentificerede pakke og genbygger zoneshards. Den må ikke beregne en ny
   offentlig timeprojektion fra den kompakte private fil.
8. Det senere provenance-trin er efter forseglingen en idempotenskontrol.
   Hvis det ville ændre en offentlig timefil, stopper det i stedet for at
   gøre manifest og pakke uenige.
9. Den nye lagringsrepræsentation indgår i den private fuldruntimekontrakt.
   Den eksakte engangsovergang i 4.0.438 kræver den kendte gamle source,
   gamle modelbinding og continuationkontrakt samt den eksakte nye
   modelbinding og public-projection-kontrakt. Den er ikke en generel gammel-
   runtime-lempelse.
10. Modelbindingen flyttes append-only i migration
   `20260919231000_public_hour_delivery_binding.sql`. Den anvendte tidligere
   migration ændres ikke.

## Kapacitetsbevis

Den faktiske offentlige generation fra det afsluttede scorearbejde omfattede
203.510.947 rå bytes i 118 timefiler. Den deterministiske pakke var 9.331.534
bytes, altså cirka 4,59 procent af råstørrelsen og langt under 256 MiB.
Pakken bevarer de præcise offentlige bytes; den opnår pladsen ved at fjerne
gentagelser gennem komprimering, ikke ved at slette timer eller felter.

## Konsekvens

DEC-0215's krav om, at ingen timer eller data må forsvinde, består. Dets
antagelse om, at alt nødvendigvis skal ligge i samme parsebare JSON-dokument,
er erstattet for den redundante offentlige timeprojektion. RavScore,
DMI-first, reserveprioritet, vandstand, geometri og komplethedskrav ændres
ikke. Koden er lokalt testet; merge, central migration, almindelig
continuation, artifact, Pages og næste cron er fortsat åbne driftsbeviser.
