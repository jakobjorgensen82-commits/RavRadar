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
## Workflowoptimering produktionsverificeret, 2026-08-20
- PR #4 blev merged som 8e4c11c3 efter grøn 17-sekunders kildegate.
- Push-produktion 32359944007 bestod fuld validering, release-gate, supportupload, Supabase, Pages-build og Pages-deploy.
- Supportartifactet er RavRadar-support-3259. Den offentlige dataset er rr-20260820104155-210 med 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- De tidligere Node 20-advarsler er væk. Den officielle Pages-action skriver fortsat en ikke-blokerende punycode-deprecation fra sin egen afhængighed.
- Arbejdsgangsopgaven er afsluttet; næste aktive arbejde er igen P1-historik og modelcyklusser.
## Selektiv skip af ren intern dokumentation, 2026-08-20
- Push til main springer nu kun produktionsworkflowet over, når alle ændringer er afgrænset til interne AI-, RDKS- eller forskningsdokumenter, versionschangelog, AGENTS.md eller de to genererede release-rapporter.
- Kode, data, scripts, workflows, HTML og øvrige offentlige filer udløser fortsat fuld produktion.
- En regressionstest kræver den præcise allowlist og afviser brede docs-, markdown-, data-, script-, workflow- og HTML-undtagelser.
- Formålet er at spare cirka seks minutters produktion og efterfølgende browserkontrol ved rene interne checkpoints uden at svække releasekæden.
## Endelig workflowproduktion 3261, 2026-08-20
- PR #5 blev merged som 0d29a512 og udløste den forventede sidste fulde produktion, fordi selve workflowfilen var ændret.
- Produktion 32361218606 bestod fuld validering, release-gate, supportupload, Supabase og Pages-deploy. Supportartifactet er RavRadar-support-3261.
- Den offentlige dataset rr-20260820105744-210 indeholder 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- Merge af dette rene interne dokumentationscheckpoint er den praktiske kontrol af paths-ignore-reglen og skal ikke starte produktionsworkflowet.