# Workflow bootstrap og tidlig Action-gate, RavRadar 4.0.238

Dato: 2026-08-20
Status: lokal kandidat, afventer PR- og produktionsverifikation

## Baggrund

Action-opgraderingen i PR #3 var kildegate-grøn, men den efterfølgende push-produktion blev stoppet af fem regressionstests, der stadig matchede gamle Action-versioner. Stoppet skete før release-gate og deploy, så den tidligere verificerede produktion forblev aktiv.

Den lokale Codex-kørsel viste samtidig, at en frisk runtime krævede gentagen manuel opsætning af npm-bro, Python-sti og tre eksisterende afhængighedsfiler.

## Afgrænset løsning

- Ret alle resterende gamle Action-versioner i testkontrakter.
- Kontroller officielle Action-majors samlet på tværs af workflows og testfiler.
- Saml alle sikre, datauafhængige PR-kontroller i npm run validate:source.
- Lad GitHubs PR-workflow kalde den samme kommando.
- Tilføj scripts/setup-codex.ps1 til engangsopsætning af en frisk runtime.
- Tilføj scripts/validate-source.ps1 til reproducerbar lokal kildekontrol.

## Sikkerhedsgrænse

validate:source bygger eller deployer ikke, bruger ingen secrets og erstatter ikke den fulde produktionsvalidering. Fuld npm run validate og npm run release:gate skal fortsat køre efter central adminhydrering og frisk vejr. Ingen score, geometri, land-/vandpunkter eller produktionsdata ændres.

## Lokal evidens

- Codex-opsætning: bestået.
- Samlet kildekontrol: bestået.
- Alle workflowkontrakter: bestået.
- RDKS-validering: bestået.
- Release-gate: bestået.

## Resterende gate

PR-CI, merge, fuld push-produktion, korrekt Pages-deploy og browserkontrol af den nye produktionsdataset skal være grønne, før kandidaten kan kaldes produktionsverificeret.