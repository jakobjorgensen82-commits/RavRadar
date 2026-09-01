# RavRadar 4.0.319 – integrated-first med målt historik og DMI-currentgenopretning

**Dato:** 2026-09-01
**Status:** Lokal kandidat. Candidate G/4.0.316 er fortsat den eneste offentlige model. De målrettede DMI-slutdifftests og Python-syntakskontrollen er grønne. Frisk isoleret 673 × 118-preflight, exact-head, merge, fuld produktion/releasegate/artifact/Pages, aktivering og offentlig desktop-/mobilverifikation afventer.

## Integrated-first uden kunstig historik

- State 6 må gå online, når dens direkte og operationelle akse er komplet med præcis 118 timer fra current til +117 for alle 210 zoner, 673 kystdele og begge modes. Komplet ældre historik og en READY Candidate G-rollback er ikke længere en selvstændig first-cutover-forudsætning.
- Manglende ældre præ-target-historik giver `HISTORY_INCOMPLETE` med konservativ lower/upper, dækning, tydelig DA/DE/EN-advarsel og `calibrationEligible=false`. Manglende direkte eller operationelt input er fortsat `UNAVAILABLE` og stopper release for den berørte time.
- Den private Candidate G-side er enten 673/673 `READY` eller `BUILDING_MEASURED_ONLY` fra egne målte fortsættelser. Warmup er ikke offentlig model, shadow, controllerstatus, automatisk fallback eller rollbackbevis.
- Checkpointschema 4 og READY-companionen er uændret. Under warmup er checkpoint build/save/protected-publish eksplicit `NOT_APPLICABLE_DURING_MEASURED_WARMUP`; tilfældigt skip eller ghost proof er fatal.
- Cold replay og warmup bruger ingen syntese, rekonstruktion, interpolation, carry-forward, neutral nulstrøm eller nabo-/kystdelslån. Feggesund skal bestå direkte 3 × 118 uden punkt-, kystnormal- eller geometriændring.

## DMI-currentrodårsag og lokal rettelse

- Det isolerede run `33520738058` viste en yderligere lokal fasefejl: tidlig cache-health kunne godkende et strict timerækkepar, før den senere autoritative sampling-/gridvektoroprydning fjernede det. `coastal_part_current_cache_reusable` kræver nu et autoritativt top-level `samplingPoint` og accepterer kun, at current-U/V-gridresuméet enten mangler samlet eller peger på samme gridpunkt. Dermed aktiveres DKSS-recovery før andre kilder, når cachen ikke kan overleve slutoprydningen.
- Runs `33510636195` og `33512163102` behandlede HARMONIE/WAM, men nul trin i `dkss_idw`, `dkss_nsbs` og `dkss_lf`. `DMI_STRICT_CURRENT_ANCHOR_MISSING` dokumenterede derfor lokal DKSS-udsultning, ikke at DMI generelt ikke kunne levere currentdata.
- Cachelinjen førte tilbage til det negative run `33498108421`. En preferred progressionsrun kunne blive fastholdt og derefter afvist som stale uden skift til en nyere moden run. Preflightens “deployed donor” var samtidig blot en kopi af den progressive cache, og gamle DKSS-`processedSteps` kunne undertrykke nødvendig genbehandling uden strict anchor.
- Ét eksakt jobtarget bindes nu før DMI og genbruges gennem hele beviset; et efterfølgende UTC-timeskifte afviser ikke det ellers eksakte snapshot. En ældre preferred run beholdes kun foran en nyere moden run ved kendt observeret cadence og højst én cadences lag. Ved ukendt cadence vælges den nyere modne run. Uden strict current anchor sættes de tre DKSS-familier først i den normale collection-loop, og netop deres gamle stepmarkører genbruges ikke; andre collectioners gyldige progression bevares.
- Preflighten forsøger valgfrit at hydrere en uafhængig offentlig Candidate G-DMI-donor i en isoleret `RUNNER_TEMP`-rod, før den progressive cache gendannes. Kun en donor, der består registry-, provenance-, celle-, lag-, run- og atomisk hel-række-kontrol, må bruges. Mangler den eller fejler kontrollen, fortsætter frisk officiel DMI uden deployed fallback.
- Første `integrated-cutover` bevarer den særskilt checkpointede WAM-historikbootstrap før den normale collection-loop; bootstrapen kan fortsætte over flere forsøg. Den efterfølgende loop får seks collectionpladser. Mangler strict current anchor, står DKSS foran WAM i denne loop; findes anchor, kan WAM stå først. Normal Candidate G- og integreret vedligeholdelse bevarer loftet på to.
- DMI-first-kildeordenen ændres ikke. Copernicus må kun supplere de eksakte resterende part-/timehuller efter en grøn DMI-terminalgate; der tilføjes ingen landsdækkende Copernicus-erstatning.

## Sikkerhed og åbne beviser

- Ingen scoreformel, model-id, stateversion, geometri, kystnormal, land-/vandpunkt, private payloads, koordinater eller rå U/V ændres af DMI-rodrettelsen.
- Målrettede scheduler-/runvalg-, DKSS-recovery-, collectionbudget- og preflight-donor-/targetlås-tests samt Python-`py_compile` er grønne på slutdiffen.
- Derefter kræves et grønt frisk isoleret 673 × 118-preflightbevis, exact-head, sikker merge, frisk fuld produktion, Feggesund direkte 3 × 118 og offentlig current-/femdøgns-/desktop-/mobilverifikation. Ingen af de tre negative runs er release- eller currentdækningsbevis.
