# RavRadar 4.0.30 – komplet stationsregister og robust kysttopologi

- DMI OceanObs-stationsregisteret hentes nu uden `status=Active`, så stationer som DMI viser på vandstandssiderne, men som ikke kommer med i det tidligere filtrerede svar, kan opdages og bevares.
- Stationers reelle driftsstatus beregnes ud fra `operationFrom`/`operationTo` og `validFrom`/`validTo`; historiske stationer markeres som historiske og bruges ikke i automatisk routing.
- Vandstandsrouting bruger kun stationer med relevante vandstandsparametre (`sea_reg`, `sealev_dvr`, `sealev_ln`).
- Zoner uden gemt `coastLine` får en kystakse udledt af `onshoreDirectionDeg`, så topologiaudit og automatisk stationvalg ikke længere falder helt ud.
- Admin og backend bruger samme fallback og samme filtreringsprincip.
- Routing-audit er opgraderet til schemaVersion 2.
