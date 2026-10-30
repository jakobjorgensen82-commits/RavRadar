# DEC-0300 – Samme conditions-kapacitet gennem B/S og sikker filstørrelse

**Portstatus 2026-10-30:** Beslutningsgrundlaget nedenfor beskriver den særskilte kritiske 591-kandidat under kildekvalifikation. Samme afgrænsede kontrol er forberedt i den kommende 4.0.592-kilde, som endnu ikke er offentligt leveret. Porten bevarer den allerede udstedte 592-modelbinding, den strenge ægte 591-forgængergren og alle 70 SQL-filer. Den giver ingen ny model-/versionsudstedelse eller produktionsaktivering. Faktisk conditions-entrys størrelse og det konkrete produktionsstops udløsning er fortsat ukendte.


**Dato:** 2026-10-30
**Status:** Afgrænset lokal kapacitets- og observationskandidat. Præcis kvalifikation, levering og den aktuelle produktionsudløser er åbne.

## Påvist kontraktgab

En gyldig normal producent-/bundle-/beskyttet B-kæde accepterer en conditions-fil på 299.262.881 bytes. Den samme installerede fil afvises derefter med FILE af reconciles særskilte loft på 268.435.456 bytes (256 MiB). Producentens allerede gældende PRIVATE_CONDITIONS_MAX_BYTES er 535.822.312 bytes. Det er en reproduceret kontraktfejl på normalt produceret syntetisk input, ikke et gæt ud fra pakkens samlede størrelse.

Den faktisk undersøgte B-only-rapport viser samlet råpayload på 1.285.306.701 bytes, men ikke den enkelte conditions-entry. Hverken dette aggregat, offentlig detailstørrelse eller en udskrevet grænse beviser den private filstørrelse eller udløseren i det aktuelle produktionsstop. Den faktiske S-fejl er fortsat åben. PR758s tidligere historik/readiness-kontrol er merget som 7cea8ddc; det afslutter ikke denne senere fejl.

## Mindste sammenhængende rettelse

1. Alle fire gamle conditions-læsegrænser i reconcile samt den nødvendige metadata-genlæsning bruger den normale producents eksisterende PRIVATE_CONDITIONS_MAX_BYTES. Der oprettes ikke en ny størrelsespolitik. Zone-/registreringsfilens separate 16-MiB-grænse bevares.
2. Størrelse, hele SHA-256, almindelig fil, fysisk identitet før/efter og eksakt lighed mellem original og arbejdsfil skal stadig bevises. Hashning bruger 64-KiB-blokke, og byte-sammenligning bruger to 64-KiB-buffere. Den normale aktuelle vej beholder ingen af de store rå conditions-buffere på tværs af gentagne kontroller. Gamle metadataarme læser kun råindhold, når deres normale opgave kræver det.
3. Original fejl, oprydning, før-/eftergenlæsning, CAS, ukendt skriveudfald og no-loss ændres ikke. Streaming af integritetsbevis er ikke tilladelse til at springe en byte, genberegne scorer eller stole på filstørrelse alene.
4. Kun B-only-safereport får capacity.protected.conditionsBytes fra den ene allerede autentificerede manifest.files-post for data/live/conditions.json. Værdien skal være et positivt sikkert heltal inden for de uændrede gældende fil-/conditions-grænser. Der hentes intet nyt, læses intet S og indføres ingen ny læser eller query. Eksakte pointerkontroller før/efter og alle eksisterende scope-/privacygrænser består.

## Relevant historik – uden at blande domænerne

- DEC-0135 og DEC-0136 afgrænser råpayload, komprimeret arkiv og objektdeling. Transportens 768 MiB pr. fil er ikke en sikker JSON-parsegrænse.
- DEC-0155/PR316, merge dd59bc51, rettede et andet gammelt 256-MiB-loft i en code-only-læser. Det viser samme fejlklasse, men er ikke automatisk autoritet til at vælge transportloftet for nyere JSON-kaldere.
- DEC-0215/PR381, merge 0d72ce41, fastlagde writerens konservative grænse under MAX_STRING_LENGTH, med 1 MiB reserve. DEC-0217/PR383, merge 2fbfe3b2, flyttede den redundante 118-timersrepræsentation til en særskilt hashbundet pakke. Den normale JSON-grænse på 535.822.312 bytes er derfor styrende her, knap 511 MiB.
- PR384/merge badf84e9 var kun en eksakt gammel metadataovergang. Den er ikke en generel undtagelse fra størrelse, originalitet eller databevarelse.
- Det særskilte reconcile-loft på 256 MiB kom med commit 07534c1480 den 17. oktober, inkluderet i PR652/merge bc1155e45. Der er tale om et senere usynkroniseret kalderled. Historikken beviser ikke den faktiske aktuelle produktionsudløser.

## Faktisk lokal evidens og åbne gates

Den samme normalt producerede og installerede B med 299.262.881 conditions-bytes giver FILE før rettelsen og ADVANCED_READBACK_PROVED efter. Der udføres én normal checkpoint-CAS; hele B, originalfil og arbejdsfil bevares, og lokalt S svarer til den normalt afledte beregning. Ingen privat originalbank hentes af prøven.

De to eksisterende negative normalforløb med samme-H0-konflikt og ændrede filbytes består med nul nye writes. B-only-normalmålet består med det nye felt lig den autentificerede manifestpost og originalfilens byteantal samt de eksisterende flag-, transport-, pointer-, privacy- og oprydningsasserts. Dette er lokale normale syntetiske prøver, ingen ny bred suite, PostgreSQL eller produktionsaktivering.

Den præcise samlede kildekvalifikation og sikker levering er fortsat nødvendige. En senere allerede eksisterende skrivefri B-only-kørsel kan dokumentere den faktiske conditions-størrelse. Først den eller en faktisk fast fejlkategori kan knytte den påviste klasse til produktionsstoppet. Dokumentationen må ikke kalde kapacitetsrettelsen offentligt leveret eller produktionsrodårsagen bevist på forhånd.

## Uændret

Version 4.0.591, I/T/C og alle SQL-/migrationskilder, numeriske vejrdata, scoreformel, kildeprioritet, administratorpunkter, geometri, originaler og no-loss bevares. Ingen SOURCE-, statistik- eller retentionaktivering, ny tjeneste, plan eller nøgle. DEC-0299 og håndbog 89.285 står hele. Nyt afsnit 89.286 har stabilt ID private-conditions-capacity-safe-byte-measurement-2026-10-30; web- og INSTALL-håndbogspayload spejles normalt uden DDL eller SQL-eksekvering. Alle fem mål består.
