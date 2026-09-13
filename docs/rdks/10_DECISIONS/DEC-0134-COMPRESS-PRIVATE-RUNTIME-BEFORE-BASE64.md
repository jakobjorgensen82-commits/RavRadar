# DEC-0134 – komprimér private runtimefiler før tekstkodning

- **Status:** Bindende
- **Dato:** 2026-09-13
- **Præciserer:** DEC-0122 og DEC-0133

## Evidens

Den låste cache-only-preflight `34738698219` på exact main `099b70a8` genbrugte target `2026-09-12T08:00:00Z` uden ny providerhentning. Current, WAM, freshness, modelbygning og den offentlige struktur på 210 zoner, 673 kystdele og 118 timer bestod. Den efterfølgende produktionsækvivalente private størrelsesmåling stoppede med `Cannot create a string longer than 0x1fffffe8 characters`.

Årsagen var arkivformatets rækkefølge: hver rå privat fil blev først base64-kodet og gjort cirka en tredjedel større, hele JSON-konvolutten blev derefter samlet i én V8-streng, og først til sidst blev den komprimeret. Dermed kunne Nodes faste strenggrænse rammes, selv om den endelige komprimerede Storage-genstand kunne være under den uændrede 50 MiB-grænse.

## Beslutning

1. Nye private runtimearkiver gzip-komprimerer hver verificeret fil deterministisk før base64-kodning.
2. Arkivkonvolutten markerer eksakt `contentEncoding=GZIP_BASE64`. Ukendt encoding afvises.
3. Udpakning begrænser hver indre dekomprimering til filens deklarerede rå byteantal og genkontrollerer både byteantal og SHA-256 før skrivning.
4. Legacyarkiver uden encodingmarkør kan fortsat læses efter de eksisterende integritetsgrænser. Pointer-, descriptor-, privacy-, CAS-, rollback- og anonyme adgangskrav ændres ikke.
5. De eksisterende lofter på 768 MiB rå payload, 50 MiB komprimeret Storage-object, filantal, checkpoint, storage og readback består.
6. Rettelsen ændrer ingen vejrdata, kildeprioritet, RavScore, modelstate, geometri eller offentlig datapakke.
7. Den materielt uændrede DEC-0122-engangsundtagelse flyttes under ejerens stående launchautorisation alene til exact release `4.0.352`. Et 4.0.351-handoff findes ikke og må ikke ommærkes.

## Fortsættelse

GitHub kan ikke genoptage et trin på en afsluttet midlertidig runner. Den private runtime skal derfor genskabes fra den allerede gemte, låste cache, men der må ikke startes providerhentning eller ny oneoff. Derefter fortsættes fra den rettede størrelsesmåling, handoff og cutover. Kun fejl med risiko for vejr, score, datatab, privacy/sikkerhed, databasebinding eller offentlig 210/673/118-struktur er launchblokerende; bevist ufarlig dokumentations- og rapporteringsoprydning registreres til efter launch.
