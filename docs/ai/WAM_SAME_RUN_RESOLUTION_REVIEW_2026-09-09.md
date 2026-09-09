# WAM same-run resolution – helkædekontrol 2026-09-09

## Observeret fejl

Main-oneoff `34371642565` nåede alle leverandørtrin og gemte deres progression. Open-Meteo efterlod 324 aktuelle strømpar ved 15-minuttersbudget. Den uafhængige WAM-inspektør stoppede med `MIXED_RUN_INTERPOLATION`, før closure og modelbygning.

## Rodårsag

`resolved_native_wave_hours` i DMI-producentens residualplan grupperer native bølger efter collection, modelkørsel, gitter og celle. Den kan derfor bevise en manglende time med to rækker fra samme serie, selv om en eksakt række fra en nyere run ligger mellem dem. Python-slutvalidatoren og JavaScript Forecast Store brugte derimod kun de to nærmeste tidsrækker. De kunne vælge forskellige runs og afvise, selv om en sikker bracket højst fire timer bred fandtes.

## Samlet rettelse

Begge consumers følger nu samme regel. Eksakt tidspunkt vinder. Ved afvist nærmeste bracket søges kun blandt fuldt validerede rækker efter smalleste same-series bracket; derefter prioriteres nyeste kausale run og deterministiske tids-/identitetstiebreaks. Uden en gyldig bracket bevares den oprindelige fail-closed-fejl. Forecast Store begrænser bølger til højst fire timer uafhængigt af indsendt cadence.

## Helikopterkontrol

- Producent, operationel handoff-validator og begge faktiske runtimeforbrugere er sporet til samme semantik.
- Feggesunds tre proxydele forbliver udskilt til deres særskilte slutgate.
- Eksakte multi-run-overgange er fortsat tilladt, men interpolerede endepunkter må aldrig krydse run, collection, gitter eller celle.
- Kildeproveniens rekonstruerer og validerer fortsat begge native endepunkter.
- Ingen cache læses, omskrives eller nulstilles af kodeændringen; alle eksisterende sourcecacher forbliver donorbare efter genvalidering.
- Open-Meteo-restkøen og WAM-seamen er to separate forhold. Rettelsen skjuler ikke de 324 strømpar.

## Målrettet evidens

- `scripts/test_dmi_wave_history_bootstrap.py`: 34/34.
- `scripts/test_dmi_wave_bootstrap_update_integration.py`: 24/24.
- `scripts/test-dmi-forecast-store.mjs`: grøn med positiv same-run-seam samt negative mixed-run- og over-fire-timers cases.
- `scripts/test-resolve-candidate-g-wave-bootstrap-target.mjs`: grøn.
- `scripts/test-ravscore-production-adapters.mjs`: grøn.

Dette er lokal kontraktevidens, ikke exact-head-CI eller live produktion. Før offentlig integreret model kræves komplet same-head weather-handoff, fulde post-data-gates, deploy og offentlig verifikation.
