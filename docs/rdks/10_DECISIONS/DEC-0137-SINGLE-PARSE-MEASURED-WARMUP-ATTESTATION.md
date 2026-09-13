# DEC-0137 – measured-warmup-attestering genbruges fra den allerede validerede runtimeparse

**Status:** Aktiv lokal beslutning for 4.0.355. Exact-head-CI og live handoff/cutover afventer.

## Baggrund

4.0.354 bestod sourcegate `34757328149` og blev merged som main `78c083e8fee76beb82c2a0d14fb9a2001d795ec2`. Cachefortsættelse `34758328372` gendannede alle fire eksakte cacher, genbyggede runtime uden provider/oneoff/ny 210/673-audit og kom gennem schema-2-pakningens rå-, del-, antal- og totalgrænser.

Først bagefter stoppede kapacitetsmålingen med `Private runtime capacity measured-warmup conditions is unavailable or exceeds its read bound`. `buildPrivateRuntimeCreateSpec` havde allerede parset den komplette `data/live/conditions.json`, kontrolleret 210 zoner, 673 kystdele og modelbindingen og brugt filen i den private pakke. Checkpoint-N/A-leddet forsøgte derefter at parse samme store fil igen gennem en 16-MiB-grænse, som er beregnet til den lille alternative auditrapport.

## Beslutning

1. De syv measured-warmup-felter og fraværet af rollbackroden kontrolleres under den første create-spec-parse.
2. Kun en boolean føres internt fra create-spec til kapacitetsmålingen. Den serialiserede create-spec forbliver eksakt metadata og filliste.
3. Conditions-baseret attestering accepteres kun, når evidensstien er den eksakte `data/live/conditions.json`, der blev brugt i samme build.
4. Den alternative lille auditrapport læses fortsat gennem 16-MiB-grænsen og skal fortsat bevise `passed`, `BUILDING_MEASURED_ONLY` og `activationReady=false`.
5. Ingen runtime-, fil-, råpayload-, komprimeret-, Storage-, privacy-, model- eller databasegrænse hæves. Alle 4.0.353/4.0.354-bounds består.
6. En regressionstest med en `conditions.json` over 16 MiB er obligatorisk. Falsk status, rollbackrod eller alternativ evidenssti skal fortsat afvises.
7. Samme exact `34738698219` og de fire cacher må genbruges i næste handoff-fortsættelse. Ingen provider, oneoff eller ny 210/673-audit må startes.

## Konsekvens

Rettelsen fjerner dobbelt arbejde og en fejlagtig størrelseskobling uden at slække på kontrol. Real-skala kapacitetsrapport, handoff, cutover og offentlig verifikation er fortsat nødvendige.
