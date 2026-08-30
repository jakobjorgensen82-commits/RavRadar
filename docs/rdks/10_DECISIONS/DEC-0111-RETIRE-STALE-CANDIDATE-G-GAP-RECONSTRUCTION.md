# DEC-0111 – pensionér den uanvendte Candidate G-rekonstruktion og genåbn målt produktion

**Status:** Ejerbesluttet og bindende fra 4.0.315. Afløser DEC-0109 som operationel tilladelse. DEC-0109 bevares kun som historik og må ikke eksekveres.

**Dato:** 2026-08-30

## Hændelse og observeret konsekvens

4.0.314 bandt alle normale vejrproduktioner til et tidligere succesbevis for den planlagte engangsrekonstruktion på samme commit. Rekonstruktionen blev imidlertid trukket tilbage, før et inspect kunne forsegle en descriptor, og før `apply` eller anden datamutation fandt sted. Det krævede bevis kunne derfor aldrig eksistere. Workflowet returnerede grønt, men sprang build, artifact og Pages over som no-op.

Den grønne status skjulte en offentlig P0: den primære offentlige pakke blev mere end otte timer gammel, og den målte recovery overskred sin absolutte 72-timersgrænse. RavRadar viste derfor korrekt den fail-closed besked **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”**, men kunne ikke vise aktuelle prognoser. Ingen syntetiske eller interpolerede Candidate G-data blev nogensinde anvendt, gemt i den offentlige runtime eller deployet.

## Beslutning

1. Incident `RRGAP-2026-08-29-CANDIDATE-G-01` lukkes som **tilbagetrukket uden anvendelse**. Der må ikke udføres inspect, apply, rollback eller cleanup for incidentet.
2. Den operationelle workflowflade, CLI-aktuator, admin-descriptor og de tests/package-/releasegatebindinger, som gjorde operationen eksekverbar, fjernes i 4.0.315.
3. Den midlertidige 4.0.311–4.0.314 exact-D1/apply/Pages-readiness må ikke være prerequisite for normal 4.0.315-produktion. Det eksisterende `trip-storage-readiness`-job bevares som historisk exact-D1-gate for netop 4.0.311–4.0.314, men skal eksplicit sætte `ready=true` for 4.0.315 og må ikke søge reconstruction-bevis. Normal push, schedule og manuel produktion må derefter fortsætte gennem current-hour-, friskheds-, DMI/Copernicus-, 210/673-, `validate`-, `release:gate`-, artifact- og Pages-gates.
4. Normal Candidate G-produktion er fortsat measured-only. Manglende historik forbliver manglende; den må ikke backfilles eller interpoleres. Den eksisterende measured-only continuation-, checkpoint- og senest-komplette recovery må bevares inden for egne integritets-, 210/673-, forecast- og aldersgrænser.
5. De defensive schema-, trust-, provenance- og turkvalitetslæsere bevares fail-closed. De kan klassificere historiske eller ukendte rekonstruktionsmarkører, men kan ikke skabe rekonstrueret state. Bevarelsen er kompatibilitet og beskyttelse, ikke en fortsat operationel tilladelse.
6. D1-/Edge-/Worker-kontrakten og den almindelige storage-runbook består uændret. Pensioneringen må ikke lempe lagersikkerhed, privatliv, idempotens, migration eller live-attestation; den fjerner kun den stale produktionsafhængighed fra vejrworkflowet.

## Release- og verifikationskrav

- 4.0.315 skal have en negativ regression, som beviser, at ingen rekonstruktionsinput, actuatorsti, descriptor, inspect/apply/rollback/cleanup-step, cachekarantæne eller apply/Pages-readiness findes i det normale produktionsworkflow.
- Regressionen skal samtidig bevise, at measured-only gap-checkpoint, continuation-recovery, current-hour gate, frisk vejrhentning, fuld validering, releasegate, artifact og Pages stadig er nåelige.
- Kildegaten skal bestå på PR'ens eksakte head. Efter merge skal en frisk normal produktion på den mergede SHA faktisk køre build, `npm run validate`, `npm run release:gate`, artifact og Pages; en grøn topstatus med skipped job er ikke releasebevis.
- Den offentlige kontrol skal bevise frisk manifest/startpakke/detaljer, 210 zoner/673 kystdele samt aktuelle og femdøgnsprognoser. Indtil det er bevist, er 4.0.315 kun en lokalt valideret hotfixkandidat.
- Versionssynkronisering må kun ændre topversionsfeltet i `data/kystdata.json` og `data/zones.geojson`; geometri, zoner og land-/vandpunkter er uden for beslutningen.

## Historisk afgrænsning

De tidligere run-id'er og sikre inspect-stop i DEC-0109 bevares som historisk evidens for, at operationen aldrig nåede descriptor eller mutation. De må ikke genfortolkes som en åben opgave eller som tilladelse til at genindføre interpolation. Den separate integrerede modelbeslutning og dens measured-only nøddriftskrav påvirkes ikke.
