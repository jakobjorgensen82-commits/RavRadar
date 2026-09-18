# DEC-0202 – Model-neutral kode må genbinde den gemte private runtime

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.419, livebevis afventer
**Dato:** 2026-09-18

## Evidens

4.0.418 bestod exact-head `35366221956`, blev merged gennem PR #362 som main
`9573264f389bd9f68413be031dd289309eb6b270`, men kom ikke online.
Code-only `35366953774` gendannede og migrerede den beskyttede private runtime
korrekt. Migrationens rapport klassificerede den som `CONTRACT_ONLY_REBIND`,
fordi vejrkontrakten var ændret, mens RavScore-binding, målinger, vejrværdier,
scorer og geometri var uændrede. Workflowet ignorerede klassifikationen og
krævede alligevel en ændret score, så det stoppede før private writes og Pages.

Gentagelsen `35368826476` blev afbrudt, da samme vej og samme stop var bevist.
Normal weather `35369122090` blev derefter sikkert afvist før providerkald,
fordi den beskyttede runtime endnu var bundet til forgængerens kontrakthash.

## Beslutning

- Workflowet skal læse migrationens allerede forseglede `transitionKind`.
- `MODEL_BINDING_MIGRATION` bruger fortsat den strenge score-reparationsvej og
  kræver en reel afledt scoreændring.
- `CONTRACT_ONLY_REBIND` får en særskilt model-neutral vej. Den kræver samme
  datasæt og produktionstime, uændret offentligt vejr, uændrede scorer,
  uændret geometri, nul providerkald og genbrug af den beskyttede runtime.
- Pages-handoffet skal verificere den samme klassifikation og må ikke gøre en
  model-neutral kodeændring til en falsk scoreændring.
- Kontrakthash-kontrollen svækkes ikke. En gammel runtime må kun genbruges via
  den eksakte forgænger, den forseglede migration og den nye kontraktbinding.
- Efter providerfri 4.0.419-levering kan almindelig weather gendanne den
  current-kompatible runtime og fortsætte på de allerede gemte providercacher.

## Afgrænsning

Vejrværdier, DMI-rotation, providerorden, RavScore-formel, modelbundle,
modelstate, geometri, land-/vandpunkter og scheduler ændres ikke. Der startes
ingen oneoff.
