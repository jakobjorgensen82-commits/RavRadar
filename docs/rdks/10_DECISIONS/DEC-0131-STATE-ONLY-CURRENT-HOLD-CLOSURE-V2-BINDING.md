# DEC-0131 – state-only-strømhold følger den aktuelle closurekontrakt

- **Dato:** 2026-09-12
- **Status:** AKTIV; lokal 4.0.349 implementeret og måltestet, exact-head-CI, backendbinding, cachekontrol, cutover og offentlig verifikation afventer
- **Ejergrundlag:** Ejerens ordre om at bruge den komplette gemte vejrtilstand og få den integrerede scoremodel online uden en ny lang providerkørsel
- **Præciserer:** DEC-0113, DEC-0114, DEC-0122 og DEC-0130
- **Bevarer:** én exact-content-kildegate, alle post-data-gates, 79.414-currentclosure, native WAM, Feggesund, privacy, same-head-handoff og offentlig 210/673-verifikation

## Produktionsfund

4.0.348 blev exact-head-valideret i PR #282 og merged byteidentisk som main `c86cc2a0283e9afda7b4d7677497ecccd0ceafba`. Backendrun `34697586057` genbrugte PR'ens live-verificerede kildebevis uden en anden fuld kildegate, anvendte alene den forventede append-only migration `20260912122607_measured_rollback_warmup_binding.sql` og bestod efterfølgende readiness/readback.

Cachekontrol `34697760571` brugte exact target `2026-09-12T08:00:00Z`. Den sprang DMI-register, DMI-plan, DMI-producent, Copernicus-plan, credentials og producent over. Open-Meteo kørte reuse-only. De gemte DMI-/Copernicus-/regional-/Open-Meteo- og WAM-data bestod target-, kilde-, currentclosure-, WAM- og freshnesskontrollerne. Fejlen var derfor ikke nye huller, udløbet runtime eller utilstrækkelig providerkøretid.

Modelbygningen stoppede på `RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID`. Den aktuelle live-current-producent havde siden 4.0.323 korrekt udstedt closuremarkøren `current-operational-673x118-closure-ready-v2`. RavScore-recoveryens fælles validator og fire fixtures krævede stadig den udgåede v1-markør. Den virkelige v2-state blev derfor afvist, mens de gamle v1-fixtures gav falsk grøn testdækning. Intet handoff, artifact, cutover eller deploy blev dannet, og Candidate G er fortsat offentlig.

## Beslutning

1. Producenten og RavScore-recoveryens validator skal importere den samme eksporterede konstant for den aktuelle state-only-current-hold-closurekontrakt. Den aktive identitet er eksakt `current-operational-673x118-closure-ready-v2`.
2. Den udgåede v1-markør skal fortsat afvises. Rettelsen må ikke acceptere både v1 og v2, omskrive ukendt state eller lempe target-, register-, model-, coverage-, provenance- eller hashkrav.
3. En integrationstest skal føre den markør, som den faktiske live-current-adapter producerer, gennem RavScore-validatorens tillidsgrænse. Fixtures må bruge den fælles v2-konstant, og en særskilt negativ test skal bevise v1-afvisningen.
4. Rettelsen ændrer ingen scoreformel, vægt, tærskel, fysik, grid, afstand, geometri, providerorden eller vejradmission. Den gør alene producent og forbruger enige om den allerede gældende kontrakt.
5. Den centralt anvendte 4.0.348-migration er immutable med normaliseret SHA-256 `704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137`. Ny append-only migration `20260912141641_state_only_hold_closure_v2_binding.sql` må kun føre integrated-, rollback- og continuationforseglinger samt readbackversion frem.
6. Begge historiske migrationsbyggere skal være reproducerbare ud fra deres egne fastlåste før-/efterhashes. En senere modelversion må ikke gøre en allerede anvendt migrationsbygger “stale” eller omskrive dens output.
7. 4.0.349 kræver én ny exact-head PR-sourcegate. Byteidentisk main og backend må genbruge dette bevis efter live exact-content-kontrol. Fuld central hydrering, post-data `validate`/`release:gate`, artifact/privacy, handoff, cutover, deploy og offentlig kontrol kan ikke genbruges eller springes over.
8. Efter backendapply/readback gentages den samme låste cachekontrol. Den må stadig ikke hente providerdata eller automatisk starte en ny oneoff. Først et nyt same-head-handoff efter alle grønne gates må bruges til den autoriserede integrerede cutover.
9. Ejeren godkendte 2026-09-12 udtrykkeligt, at DEC-0122's materielt uændrede first-cutover-engangsundtagelse flyttes alene til exact release 4.0.349. Et ældre handoff må ikke ommærkes eller bruges.

## Bevis og næste rækkefølge

De fem målrettede modeltests er grønne. De beviser den virkelige live-v2-seam, eksplicit v1-afvisning, recovery replay, Candidate G-rollback og integreret generator. Begge modelbundles og modelbindingen er deterministiske med integrated hash `c1e753719e856b2c97291c01cd18186598f6acc4409e619681e0c45752acab19`, rollback hash `d4fd862002642b173f937b8ded725e15a5ca752ebb5143a5b60386f72133ae89` og continuation hash `7f6e1c2d1f30a0a81c61bfdd9af43fe5c4c541c469de6eb4551ed613ec9baf43`.

Den 11-leddede migrations-/readiness-/workflowkæde, installationskontrakt, checkpointsyntax, workflowrækkefølge og release-metadata er måltestet grønne lokalt. Næste bindende sekvens er dokument- og diffslutkontrol, exact-head-CI, byteidentisk merge, apply/readback af alene den 11. migration, ny cache-only-kontrol på samme target, fulde same-head-gates/handoff, kontrolleret cutover og offentlig 210/673-verifikation. Normal vejrdrift forbliver deaktiveret indtil offentlig succes og genaktiveres derefter kontrolleret til særskilt rotations-/vedligeholdelsesbevis.
