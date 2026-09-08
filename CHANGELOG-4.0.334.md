# Changelog 4.0.334

Status: **lokal, måltestet releasekandidat pr. 2026-09-08**. Ikke committed, CI-verificeret, merged, kørt på `main`, fuldt releasevalideret, deployet eller offentligt cuttet over.

## Ændret

- WAM-planlægningen reserverer fair runtime til både `wam_dw` og `wam_nsb`, efter højst ét nødvendigt DKSS-lead, uden at overskride den globale runtime.
- WAM-rest måles pr. collection over 118 timer og lukkes kun af eksakte rækker eller en højst fire timers interpolation inden for samme collection, modelrun, grid og celle.
- Oneoff og normal updater genbruger processing-signatur og allerede behandlede assets og bevarer cacheprogression før en streng WAM-readiness-gate.
- Candidate G-resolveren tillader højst fire inklusive brotimer og rebases til source-attesteret `genuine-cold-start`, når en ensartet target er ældre; mixed target stopper fortsat.
- Runtime materialiserer eksakt 118-timersakse med eksplicit `MISSING`, atomiske vind-, bølge- og strømtuples og Feggesund-preflight/slutproof med identisk hash.
- Første cutover kræver et konkret positivt run-id; senere kørsler kræver tomt handoff-id.

## Evidens og restarbejde

- Oneoff `34161930631` på `57a4c91405f0fd90353f8655315b42430ad13208` lukkede strømcache **79.414/79.414**: DMI 61.860, Copernicus 16.593, regional 944, Open-Meteo 17, missing 0.
- Runnet stoppede korrekt ved manglende Feggesund **3 × 118**; intet artifact, deploy eller cutover blev udført.
- Exact-head sourcegate, merge, main-runtime, 354/354, fuld validate/releasegate, artifact/deploy, Phase B og offentlig cutover er åbne.
- To P2-effektiviteter er åbne efter launch: proxy krediteres endnu ikke i native WAM-rest, og oneoff kan ikke sætte live ForecastEDR-budget helt til nul. Ingen af dem er dokumenteret correctness-/releaseblocker.
