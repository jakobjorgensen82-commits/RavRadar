# Changelog 4.0.336

Status: **lokalt implementeret, måltestet og reviewet GO pr. 2026-09-08**. Exact-head GitHub-kildegate, merged runtime, komplet vejr-/WAM-bevis, fulde produktionsgates og offentlig modelcutover mangler.

## Ændret

- DMI/WAM-bulkcachen skrives atomisk som kompakt UTF-8-JSON på alle progress-, final-, promotion- og reuse-veje. Det fjerner pretty-JSON-udvidelsen set i oneoff uden at ændre data.
- Den hårde WAM-validator forbliver `256 MiB` rå bytes. Diagnostik viser kun aggregeret faktisk og tilladt byteantal.
- Exact-main-sourceproof kan på samme SHA genbruges mellem præcis normalworkflowets source-step og oneoff-workflowets `validate`-/`operational-118-preflight`-steps. Begge historier livevalideres, og senere fejl/manglende gate invaliderer på tværs. Kildegaten fjernes ikke.
- En eksplicit manuel normal kørsel kan med flag og eksakt bekræftelse forsegle samme handoff som oneoff. Kun modeltilstandene `candidate-g:true|legacy-candidate-g:true|legacy-candidate-g:false` og actions `candidate-maintenance|candidate-legacy-maintenance` er tilladt, og forsegling sker først efter komplet providerclosure, WAM/Feggesund, fuld validate, releasegate og exact-main-reconfirm.
- Partial caches gemmes før terminale gates. Missing eller fejl giver intet handoff og ingen nulstilling.

## Evidensgrænse og scope

- Normalrun `34229976645` efterlod 2.015 par til Open-Meteo og bevarede cacherne uden handoff.
- Runtimebevis og GitHub exact-head CI for 4.0.336 mangler; Candidate G er offentlig.
- Ingen runtime-ombygning, rollback/nulstilling, score-, geometri-, kystnormal- eller punktændring.
