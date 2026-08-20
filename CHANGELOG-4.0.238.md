# RavRadar 4.0.238

## Produktionsverificeret: låst produktionstime bevares i fallback og historik

- Open-Meteo-forespørgslen udvider nu sit tilladte fortidsvindue ud fra forskellen mellem den låste `productionReferenceAt` og den faktiske byggetid. En planlagt produktion, der krydser en UTC-time, mister derfor ikke den allerede godkendte første forecasttime.
- Fallbackserien trimmes fortsat til den låste referencetime og højst 120 fremtidige timer. DMI er stadig førstevalg, og fallback må kun udfylde reelle huller eller en manglende hale.
- Verificeret strømhistorik knyttes nu til `productionReferenceAt` i stedet for den senere `generatedAt`. Dermed kan de 198 zoner med et verificeret fælles DMI-U/V-par vokse naturligt i den score-neutrale historik.
- De 12 kendte zoner uden et dokumenteret fælles marint gitterpunkt forbliver eksplicit `missing`. Fortid, nulværdier eller nabotimer opfindes ikke.

## Browserbevis

- Den versionsbundne 4.0.238-kontrol gennemgår begge jagtformer i alle 210 zoner: 420 aktuelle paneler, 2.100 femdøgnsvalg og reference til alle 673 kystdele.
- Kontrollen sammenholder score, label, farveniveau, vind- og strømpile, tre scorekomponenter, forklaring, lokal del/tid og alle seks synlige vejrmetrikker: vind, bølger, vandstand, strøm, vandtemperatur og tretimerstrend.
- Browserkontrollen fejler nu også, hvis livesidens synlige version ikke er præcis 4.0.238. Lokal JavaScript kan derfor ikke alene få en ældre liveside til at fremstå som den nye kandidat.

## Produktionsbevis

- PR #1 blev merged som `b8844841`. Push-kørsel `#32344813967` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Supportartifact `RavRadar-support-3252` byggede datasæt `rr-20260820074127-210` med 210 zoner. De seks bølgehuller fra #3246 har nu alle 118 timer uden ændret DMI-first-kildeorden; Feggesund forbliver det ene dokumenterede bølge-missing.
- Verificeret strømhistorik vokser igen: 198 verificerbare zoner har op til 56 prøver over 39,594 timer mod det tidligere fastlåste spænd på 22,563 timer. De 12 dokumenterede parent-huller er fortsat eksplicit `missing`.
- Den fulde online Playwright-kontrol er grøn for 210 zoner, 673 kystdele, 420 aktuelle paneler og 2.100 femdøgnsvalg. Mobil 390 x 844 og desktop 1440 x 900 er desuden kontrolleret uden overflow eller funktionsfejl.
- Den særskilte naturlige timeskiftekontrol er afsluttet. Schedule `#32351140886` byggede og deployede datasæt `rr-20260820085852-210` med fuld `validate`, releasegate, Supabase og Pages; den efterfølgende 210/673-browserkontrol var uden fejl.

## Sikkerhed og status

- PR-kontrollen er kildebaseret og må hverken hente secrets, hydrere central admin-sandhed, bygge produktionsdata eller deploye. Den kontrollerer de relevante regressions- og releasekontrakter før merge.
- Ingen land-/vandpunkter, kystgeometri, U/V-værdier, afstandsgrænser, kildeorden eller RavScoreformel er ændret.
- 4.0.238 er produktions- og browserverificeret, inklusive det naturlige timeskiftebevis. Ingen manuel genvej eller gateomgåelse blev brugt.
## Naturlig P1-driftsevidens

- Copernicus-pilot #72 fortsætter den private score-neutrale opsamling med 46 eksakte timetidspunkter, 28.934 observationer, 625 unikke mål og 629 mål/kilde-par.
- Nul mål/kilde-par har skiftet gitterpunkt eller lag. `scoreImpact=false`, `publicRuntime=false` og `interpolation=false` er bevaret; det fulde 168-timersvindue er endnu ikke nået.

## Post-merge produktion og P1-checkpoint
- PR #2 blev merged som `e1f835a3`. Push-kørsel `#32354210495` byggede support `RavRadar-support-3256` og datasæt `rr-20260820093508-210`; fuld validering, releasegate, Supabase, Pages-artifact og deploy bestod.
- Den efterfølgende onlinekontrol var grøn for 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul fejl.
- `samples72h` er vokset naturligt til 70 prøver og 41,489 timers spænd i alle 210 zoner. De 198 verificerbare zoner har samme verificerede spænd; de 12 dokumenterede parenthuller har fortsat ingen verificerede prøver. 72 timer er endnu ikke nået.
- HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z er uændrede; artifactet er stabil drift, ikke en ny uafhængig modelcyklus.
- Den kontrollerede supplementhistorik har 45 unikke validtider over 45 timer. Shadow-cachen har cirka 104 timers capture-spænd, men 168-timersmålet er ikke nået.
- De ni workflows med forældede action-runtimes bruger nu officielle Node 24-majorer. Gates, jobrækkefølge, inputs og betingelser er uændrede; PR-CI og produktion kræves før lukning.
- Ingen score, kildeorden, fallback, geometri eller land-/vandpunkter er ændret.

## Workflowreparation og lokal effektivisering, 2026-08-20
- PR #3 opgraderede de officielle GitHub Actions, men den første produktion på merge-committen blev korrekt stoppet af fuld validering før release-gate og deploy, fordi fem regressionstests stadig forventede gamle Action-versioner.
- Alle resterende versionsforventninger er rettet, og en ny samlet Action-versionskontrakt kontrollerer både workflows og testfiler.
- PR-kildegaten er samlet i validate:source og udvidet med de hurtige workflowkontrakter, som tidligere først blev nået i fuld produktion.
- setup-codex.ps1 og validate-source.ps1 fjerner gentagen manuel opsætning af Node/Python-stier og afhængigheder på friske Codex-runtimes.
- Ingen score-, geometri-, land-/vandpunkt- eller produktionsdataændring.
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

## Docs-skip bekræftet, 2026-08-20
- Den rene dokumentationsmerge 2ebd601e oprettede ingen push-produktionskørsel. Seneste push-produktion er fortsat den fuldt verificerede 0d29a512.
- Paths-ignore-optimeringen er dermed produktionsbevist og workflowopgaven er afsluttet.
