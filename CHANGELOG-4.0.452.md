# RavRadar 4.0.452

## Rettet

- Normalrun `35662538047` nåede gennem DMI/fallback-kæden og byggede
  `component-runtime-ready`, men `Update central weather cache` stoppede med
  Node/V8 `heap out of memory` ved cirka 4 GB. Det var en procesgrænse under
  den integrerede runtimeforsegling, ikke et hul i leverandørdata eller et
  tab af den gemte fremgang.
- Cachetrinnet får nu eksplicit `NODE_OPTIONS=--max-old-space-size=8192`.
  Tidsgrænsen på 45 minutter og alle DMI-first-/fallbackregler er uændrede.
- Den samme indstilling er dækket af en målrettet workflow-regression, så en
  senere ændring ikke utilsigtet bringer standardgrænsen tilbage.

## Produktionsbevis

- Run `35662538047` gemte den krypterede private vejr-fremgang efter fejlen.
  Næste normale kørsel skal genbruge denne fremgang og kun derefter bevise
  privat save, artifact, deploy og offentlig runtime.
- Den midlertidige DMI `HTTP 429` i runnet blev håndteret af den eksisterende
  fallback; den var ikke den afsluttende fejl.
- Der er ikke startet en ny one-off, og ingen scoreformel, prioritet,
  geometri eller datakildekontrakt er ændret.

## Validering

- Målrettet workflowvalidering og versionskontrol køres på denne exact-head.
- Et grønt lokalt resultat kaldes ikke produktionsbevis; GitHub-runnet efter
  merge skal nå hele cache-, artifact- og deploykæden.
