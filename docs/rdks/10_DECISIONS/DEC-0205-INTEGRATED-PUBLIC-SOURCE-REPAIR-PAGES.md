# DEC-0205 – Allerede aktiv integrated source-repair skal verificeres gennem Pages

**Status:** Aktiv; lokal 4.0.422 afventer exact-head og providerfri levering
**Dato:** 2026-09-18

## Evidens

4.0.421-buildjob `105726470812` i kørsel `35383989821` bestod source reuse,
eksakt kendt audit, privat runtime, privacy, prewrite-samling, Edge-readiness
og Pages-artifact uden providerkald. Pages-job `105727514271` stoppede før
deploy i handoff-kontrollen.

Handoff havde `sourceRepairId=public-ahead-weather-4.0.420-v1` og den korrekte
operationelle handling `integrated`, fordi central model og binding allerede
er aktive. Pages-wrapperen krævede fejlagtigt
`integrated-historical-maintenance` for alle source repairs. Derfor blev ingen
ny offentlig pakke deployet.

## Beslutning

- En kendt source-repair må fortsætte for `integrated` eller
  `integrated-historical-maintenance`; andre operationelle handlinger afvises.
- Ved `integrated` med source-repair skal Pages før deploy observere det
  aktuelle offentlige manifest, gendanne det eksakte forseglede source-
  artifact, verificere den fastlåste integrerede 79/79-kilde og gemme den
  privacy-sikre source-evidens.
- Targetverifikationen må fortsat ikke bruge source-repair-undtagelsen.
- Allerede aktiv `integrated` afsluttes gennem den eksisterende almindelige
  centrale reseal efter verificeret deploy; der opfindes ingen historisk CAS.

## Afgrænsning

Der køres ingen oneoff eller vejrprovider. Vejrcacher, RavScore-formel,
scoreværdier, geometri, rotation og providerprioritet er uændrede. Ukendt
repair-id, source-drift, manglende fil eller target-drift stopper fortsat.
