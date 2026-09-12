# RavRadar 4.0.349 – fælles v2-kontrakt for state-only-strømhold

Dato: 2026-09-12
Status: lokal releasekandidat; exact-head-CI, merge, backendbinding, ny cachekontrol, cutover og offentlig verifikation afventer

## Hvad 4.0.348 beviste i produktion

- PR #282 blev exact-head-valideret og merged byteidentisk som `c86cc2a0`.
- Backendrun `34697586057` genbrugte det levende kildebevis uden en anden fuld kildegate, anvendte kun `20260912122607_measured_rollback_warmup_binding.sql` og bestod readback.
- Cachekontrol `34697760571` hentede intet nyt vejr: DMI og Copernicus blev sprunget over, Open-Meteo var reuse-only, og de gemte current-, WAM- og freshnesskontroller var grønne.
- Modelbygningen stoppede bagefter med `RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID`. Derfor blev intet handoff, artifact, cutover eller deploy lavet.

## Rodårsag og rettelse

- Live-current-producenten udsendte korrekt closurekontrakt v2, mens RavScore-recoveryen og fire testfixtures stadig krævede v1.
- Producent og forbruger bruger nu samme eksporterede v2-konstant.
- Den gamle v1-markør er fortsat ugyldig. Ingen ukendt state accepteres eller ommærkes.
- En ny integrationstest fører den faktiske live-adapters markør gennem RavScore-validatoren. En negativ test låser v1-afvisningen.
- Scoreformel, vægte, tærskler, fysik, vejrdata, grids, afstande, geometri og providerorden er uændrede.

## Append-only backendbinding

- Den anvendte 4.0.348-migration forbliver immutable ved normaliseret SHA-256 `704439882eb6e77a7c038e14b8ecfd49ef9b6bb9074f9ea5778f6843f6c48137`.
- Ny `20260912141641_state_only_hold_closure_v2_binding.sql` fører kun integrated-, rollback- og continuationhashes samt readbackversion frem.
- Historiske migrationsbyggere har nu fastlåste versionsspecifikke efterhashes. Fremtidige modelændringer kan derfor ikke gøre en gammel anvendt migration stale eller friste til omskrivning.
- Readiness-, install-, checkpoint-, releaseplan- og workflowkontrakter omfatter eksakt elleve migrationer.

## Kildegate og launch

4.0.349 skal bestå én fuld sourcegate på PR'ens eksakte slut-head. Byteidentisk main og backend må genbruge beviset efter live GitHub-kontrol; fulde post-data-gates kan ikke springes over.

Ejeren har udtrykkeligt godkendt, at DEC-0122's eksisterende, snævre first-cutover-engangsundtagelse flyttes alene til exact 4.0.349. Arkivgrænse, storage, checkpointdatabase, integrity, privacy, readback, same-head-handoff og forbud mod recurring brug er uændrede.

Efter merge anvendes alene den nye append-only migration og readback verificeres. Derefter gentages cachekontrollen mod `2026-09-12T08:00:00Z` uden providerhentning. Kun ved komplet current/WAM/Feggesund/freshness, grøn model/runtime/privacy/release og et nyt same-head-handoff udføres den kontrollerede integrerede cutover og offentlige 210/673-kontrol. Normal vejrdrift forbliver deaktiveret indtil da.
