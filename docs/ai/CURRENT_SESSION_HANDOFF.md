# RavRadar - aktuelt Codex-handoff

## Checkpoint 2026-08-22 – Candidate G 4.0.258 vindstyret waders-jagtbarhed

- Arbejdsbranch er `codex/ravscore-wind-led-huntability` fra main-merge `bc1e87b6960e0d4cc44d9d88f83cb682b7aab215`.
- Ejeren valgte `20/50/30` som Candidate G's private faglige analyseprior; offentlig RavScore `25/40/35` forbliver uændret.
- Foretrukken variant er `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED`. Vind giver 100 til og med 6 m/s og falder gennem 7/80, 8/60, 10/35, 13/10 og 15/0.
- WAM-bølgehøjde kan kun reducere vindscoren med 20 procent af et negativt gab, højst 20 point; den kan ikke hæve jagtbarheden eller alene give hard stop.
- Privat replay er genkørt på 1.460 evalueringer: 730 uændrede strandscorer, ingen waders-score over jagtbarheden, gennemsnitligt bølgefradrag 4,002 og alle seks tilfælde ved mindst 15 m/s på 0.
- Candidate G-, mode-, scenarie- og nationale shadow-self-tests samt fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. Commit, exact-head PR, merge og efterverifikation mangler ved dette checkpoint.
- DEC-0054 erstatter DEC-0053's foretrukne variant, `20/45/35`, 18 m/s-stop og mere selvstændige bølgekobling. Tidligere modeller bevares som evidensspor.
- Der er ikke hentet nye rådata. Private cachepayloads, artifact, protected-dirty-data, DMI/fallback, geometri og land-/vandpunkter må ikke stages eller ændres.

## Historisk checkpoint 2026-08-22 – Candidate G-ejerreview samlet før DEC-0054

Dette afsnits variant og vægt er erstattet af det aktuelle 4.0.258-checkpoint ovenfor.

- Beslutningspakken blev ført gennem PR #71: exact-head-kildegate `32583123375` bestod, og PR'en blev merged som `52f66808204b1de4b643e05192a5bd7e92797244`.
- PR #70, produktion `32580314866`, live `rr-20260822150210-210` og exact-merge-shadow `32580774128` er grønne.
- Ingen yderligere rådata skal hentes til de 430 dele, som ikke indgik i den strenge private scorekørsel. De 243 komplette dele bruges kun som mekanisk aktuelt snapshot.
- Privat replay er genkørt: 1.460 evalueringer, 730 uændrede strandscorer, nul waders-score over jagtbarheden og nul af 216 lave waders-jagtbarheder med mindst 55 point.
- DEC-0053 og `docs/research/RAVSCORE_CANDIDATE_G_OWNER_REVIEW_2026-08-22.md` samler ét forslag til review: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`.
- `20/45/35` er fortsat analysecentrum. Offentlig `25/40/35` ændres ikke, og endelig vægtning afventer komplette ture med fund/nul-fund og hold-out.
- Næste faglige trin er ejerens samlede review. En eventuel offentlig score-/UI-ændring er en senere særskilt opgave med fulde gates.
- Artifact, protected-dirty-data, geometri, land-/vandpunkter og offentlig runtime er urørte.

## Checkpoint 2026-08-22 - Candidate G-coveragekontrakt 4.0.257

- Aktiv branch er `codex/ravscore-candidate-g-coverage-checkpoint` fra 4.0.256-merge `d629177a`.
- PR #69/exact-head `32577977245`, produktion `32578049137` og live 4.0.256/datasæt `rr-20260822141748-210` er grønne.
- Frisk score-neutral central shadow `32578554928` bestod for 210 zoner/673 dele, men kunne kun score 243 dele. De øvrige 430 mangler komplet lokal DKSS-familie; dette er den reelle coverageblokering.
- DEC-0052 retter den ældre sammenblanding med statiske lokale retention-features. Candidate G bruger dem ikke, giver dem nul point og kræver dem ikke for coverage. Parentzonens morfologi må fortsat ikke arves.
- Shadowvalidatorens schema 1.4.0 har nu `scoreInputCoverageReady`, eksplicit udeladt statisk stedmodel og den åbne gate `candidate-national-score-input-coverage`. `automaticActivationAllowed` er fortsat falsk.
- Målrettede tests, fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. Exact-head PR, produktion og ny central shadow mangler ved dette checkpoint.
- Offentlig score, UI, DMI/fallback, central admin, geometri, land-/vandpunkter, artifact og protected-dirty-data er urørte.

## Checkpoint 2026-08-22 - Candidate G-vægt og forklaring 4.0.256

- Historisk branch var `codex/ravscore-candidate-g-weight-decision` fra `main`/merge `8cffdd54`.
- PR #68's dokumentationscheckpoint er afsluttet: exact-head-gate `32576541706`, merge `8cffdd54`, fuld produktion `32576619969` og live 4.0.255/datasæt `rr-20260822135100-210` med 210 zoner og 673 dele er grønne.
- Den ejer-godkendte waders-variant er genafspillet med `15/50/35`, `20/45/35` og `25/40/35`. Yderpunkterne adskiller sig 4,947 point og 282 referencebånd; `20/45/35` bevares som Candidate G's analysecentrum.
- Den nye diagnostic-only forklaringskontrakt binder eksakte komponenter og bidrag sammen med pil nu, historik før nu, fysisk gate og synligt waders-loft. Lokal replay gav nul afvigelser i 1.460 evalueringer.
- PR #69 exact-head-gate `32577977245`, merge `d629177a`, produktion `32578049137` og efterfølgende central shadow `32578554928` afsluttede dette checkpoint.
- Offentlig 25/40/35, UI, DMI/fallback, central admin, geometri og land-/vandpunkter er uændrede. Artifact, protected-dirty-data og private cachepayloads må ikke stages eller eksponeres.

## Checkpoint 2026-08-22 - 4.0.255 reparerer national shadowkontrakt

- PR #66 bestod exact-head-kildegaten `32575000140`, blev merged som `95e3064d` og udløste produktion `32575055644`.
- Frisk vejr og proveniens blev bygget, men fuld validering stoppede fail-closed på den forældede forventning `candidate-waders-product-decision`. Releasegate, Supabase og Pages blev ikke kørt.
- Reparationsbranchen `codex/ravscore-waders-contract-fix` opdaterede testen til `candidate-waders-rule-order-public-product-review` og tilføjede den `validate:source`; målrettede tests og fuld lokal gate blev grønne.
- PR #67 exact-head-gate `32575697204` bestod på `b011f915`, og merge `af8f30cf` blev fuldt produktionsverificeret i `32575740539` med support `RavRadar-support-3389`, Supabase og Pages.
- Live 4.0.255/datasæt `rr-20260822133041-210` har 210 zoner og 673 dele. Manifestet er komplet/`controlled-live`, og begge offentlige datafiler matcher byteantal og SHA-256.
- Kandidatberegning, aktiv score, geometri, land-/vandpunkter og beskyttede data er uændrede. Næste trin er at fortsætte det samlede Candidate G-beslutningsgrundlag; ingen offentlig aktivering er godkendt.

## Checkpoint 2026-08-22 - 4.0.254 waders-kandidat lokalt valideret

- Dette checkpoint erstatter den ældre anbefaling om kun at vise waders som separat metodestatus. Ejeren har valgt et synligt waders-scoreloft ved jagtbarheden og en ny vinddel med 100 point til og med 6 m/s og monotont fald derover.
- Arbejdsbranch er `codex/ravscore-mode-huntability-analysis`. Ny stabil diagnostic-only variant er `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`; den tidligere no-direct-variant bevares som reference.
- Replayet dækker 1.460 evalueringer. Alle 730 strandscorer er identiske; waders-gennemsnittet er 27,351 mod 35,465 før, og ingen waders-score overstiger jagtbarheden. Den nye vindkurve ændrer kun +0,449 point i gennemsnit mod samme loft på den gamle kurve.
- Ingen sikkerhedsmodel eller bund-/dybde-/rende-/adgangsegnethed indgår. Beskyttede data, private cachepayloads, geometri og land-/vandpunkter er urørte.
- Offentlig 25/40/35 og runtime er uændret. Målrettede tests, RDKS, `scripts/validate-source.ps1`, releasegate og versionslukning er grønne. Exact-head PR-gate, merge og det samlede Candidate G-beslutningsgrundlag mangler ved dette checkpoint.

## Checkpoint 2026-08-22 - Candidate G 4.0.253 produktionsverificeret

- Dette checkpoint erstatter alle ældre branch-, baseline- og næste-trin-angivelser nedenfor.
- Autoritativt repository er `C:\Users\Lenovo T14\Documents\GitHub\RavRadar`, og arbejdet skal altid begynde fra den aktuelle `main`. Kontrollér aktuel head med `git status`, `git log -1` og remote; et fast commit-id i et handoff må ikke bruges som erstatning for den kontrol.
- Candidate G's faglige kode-/analysebaseline er PR #62, merge `b2951d90`; dokumentationscheckpointene PR #63 og #64 ændrede kun RDKS/changelog. PR #62's exact-head-kildegate `32568914124` bestod på `d272c6ca`.
- Et fuldt produktionsbevis for samme 4.0.253-baseline er `32570223437`: central hydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3382`, Supabase og Pages bestod på PR #64-merget `01904b92`; deployment `6036286717` er `success`.
- Det verificerede live-snapshot `rr-20260822112859-210` viste version 4.0.253, 210 zoner og 673/673 scorede kystdele. Vejrdatasættet er rullende, så den aktuelle dataset-identitet skal kontrolleres live og ikke udledes af dette historiske checkpoint.
- Candidate G er fortsat privat og score-neutral. Eksakte komponenter/gate rekonstruerer 1.460/1.460 private scorer; den foretrukne no-direct-wind-variant har 219 lave waders-jagtbarheder, heraf 7 med mindst 55 point, og det kanoniske 0/79-forløb.
- Pilen betyder fortsat aktuel lokal strøm. Historik forklares separat; 332/872 tydelige contexts er modrettede, og 100 ændrer den afrundede score.
- Dette historiske checkpoint er erstattet af DEC-0051/0052: waders-/forklaringskontrakten er valgt score-neutralt, og det åbne dataarbejde er komplet dynamisk scoreinputcoverage ud over 243/673. Statiske lokale retentionfeatures indgår ikke i Candidate G.
- Aktiv RavScore 25/40/35, offentlig score/UI, DMI/fallback, central admin, geometri og land-/vandpunkter er uændrede. Den Git-ignorerede cache og de fire beskyttede dirty-datafiler må fortsat aldrig stages.

## Checkpoint 2026-08-22 - efter PR #57

- Dette checkpoint erstatter de ældre arbejdssteds- og branchangivelser nedenfor.
- Autoritativt repository er `C:\Users\Lenovo T14\Documents\GitHub\RavRadar`; baseline var `main`/merge `ca7c8caa` fra PR #57.
- Aktiv arbejdsbranch er `codex/ravscore-history-track-ablation`.
- Den private cache ligger lokalt i `.cache/ravscore-historical-wave-pilot-12` og ignoreres snævert gennem `.git/info/exclude`; cachefiler må aldrig stages.
- 24/48-matrixen og separate ablationer er gennemført score-neutralt. Næste forskningsdel er kandidat-G-replay med 24 alene, 50/50 og 48 alene, lineær vind som hovedanalyse og obligatorisk no-direct-wind.
- Målrettede tests, RDKS, lokal `validate:source` og releasegate er grønne; exact-head PR-gate og merge mangler.
- `private-research-artifact`, `protected-dirty-data`, de fire historisk beskyttede datafiler og alle land-/vandpunkter må fortsat ikke ændres eller stages.
- Aktiv RavScore 25/40/35 og offentlig runtime er uændrede.

## Arbejdssted og branch

- Brug kun `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`.
- Aktiv branch er `codex/verify-4.0.238` fra merge-commit `b8844841` på `main`.
- Desktop-klonen er gammel og dirty og må ikke bruges til dette spor.

## Beskyttet lokalt arbejde

Disse fire eksisterende dirty filer må aldrig ændres, stages eller committes:

- `data/diagnostics/current-spatial-audit-4.0.76.json`
- `data/diagnostics/state-reference-zones.json`
- `data/diagnostics/zone-geometry-audit.json`
- `data/live/coastal-parts-v2.json`

Der må ikke flyttes land-/vandpunkter.

## 4.0.238 produktion

- Kandidaten blev afsluttet i `2db2cd2b`, `e197a196`, `3dcd93c6` og `e89778f9`; PR #1 er merged som `b8844841` efter ejerens udtrykkelige godkendelse.
- `release/RavRadar-4.0.238.zip` bygges reproducerbart med 972 filer og er et lokalt, ikke-committet artifact. Kør pakkeren efter enhver ny slutcommit; dens output er den autoritative bytekontrol.
- Push-kørsel `#32344813967` bestod central adminhydrering, frisk DMI, fuld validering, releasegate, Supabase og Pages.
- Support `RavRadar-support-3252`/datasæt `rr-20260820074127-210` viser 210 zoner, de seks tidligere bølgehuller lukket til 118 timer og verificeret historik vokset til 39,594 timer.
- Live 4.0.238 er browserkontrolleret med nul fejl i 210 zoner, 673 dele, 420 aktuelle paneler og 2.100 femdøgnsvalg samt mobil og desktop.

## Seneste naturlige evidens

- Readiness-run `#32347036227` sprang korrekt produktionen over uden artifact, fordi UTC-time 08 endnu ikke var komplet.
- Automatisk Copernicus-pilot `#32347060320`/artifact #72 gjorde time 08 klar og har nu 46 eksakte timer, 28.934 private poster, 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- Piloten er fortsat score-neutral, privat og uden interpolation. Det fulde 168-timersvindue er endnu ikke nået.
- De 12 reelle hovedzonehuller for verificeret strøm og Feggesunds reelle bølgemangel skal fortsat være `missing`.

## Næste bindende trin

1. Følg næste kvalificerede naturlige produktion, som starter før og slutter efter et UTC-timeskift; ingen manuel omgåelse af readiness-gaten.
2. Fortsæt naturlig Copernicus-overvågning fra 46 mod 168 timer og Supabase-forbrugsovervågning.
3. Fortsæt DEC-0030 med nye uafhængige HARMONIE-, WAM- og DKSS-cyklusser samt de kendte strøm-, bølge- og Limfjordshuller uden kunstig udfyldning.
4. Commit og push kun den afsluttede dokumentationsopfølgning; stage aldrig de fire beskyttede lokale datafiler eller verifikationsmapperne.

## 2026-08-20 - P0.3 afsluttet og permanent mergeautoritet
- Naturlig schedule `#32351140886` byggede og deployede datasæt `rr-20260820085852-210` med frisk data, fuld `validate`, releasegate, Supabase og Pages.
- Browser-pluginet blev forsøgt først og diagnosticeret til DNS-fejl. Den godkendte Chromium/Playwright-fallback gennemgik derefter 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul fejl i score, label, farveniveau, pile, forklaringer, vejrtal, komponenter, kontekst, konsol, side eller HTTP.
- P0.3 og `ISSUE-OPEN-METEO-LOCKED-HOUR-WINDOW` er dermed lukket. Ingen land-/vandpunkter, geometri, U/V, kildeorden, afstandsgrænser eller RavScore er ændret.
- Codex har permanent betinget autoritet til at oprette, opdatere og merge egne datasikre PR'er efter fuld systemisk verifikation. Usædvanligt risikable, destruktive, irreversible eller ikke-godkendte beslutninger kræver fortsat ejeraccept.
- Næste ikke-blokerede arbejde er P1: naturlige 72/168-timersvinduer, nye uafhængige modelcyklusser, de 12 eksplicitte parent-currenthuller, Feggesund wave-missing og produktionsvarighed.

## 2026-08-20 - post-merge P1-checkpoint #3256
- PR #2 er sikkert merged som `e1f835a3`. Produktion `#32354210495`, support `RavRadar-support-3256` og datasæt `rr-20260820093508-210` bestod fuld validering, releasegate, Supabase, Pages og efterfølgende 210/673-browserkontrol.
- Rå `samples72h` er 70 prøver over 41,489 timer i alle 210 zoner. 198 zoner har verificeret spænd 41,489 timer; 12 kendte geografiske parenthuller står fortsat ved nul. Næste mulige 72-timersbevis er efter 2026-08-21T16:05:48Z.
- Supplementhistorikken har 45 unikke validtider over 45 timer for 625 Copernicus-dele og 8 regionalproxydele. Shadow-cachen spænder cirka 104 timer og har besøgt 673/673 dele, men 168 timer er ikke nået.
- Ingen ny HARMONIE-, WAM- eller DKSS-modelstart er observeret. Feggesund er fortsat den ene bølge-missing, og de 12 parent-currenthuller er uændrede.
- Den naturlige pilot `#32355447654` blev korrekt duplicate-suppressed og tæller ikke som ny time.
- Push-buildet tog 410 sekunder; medianen for syv fulde builds er nu 473 sekunder uden reducerede gates.
- De ni berørte workflowfiler er opgraderet mekanisk til de officielle Node 24-majorer uden ændrede gates eller betingelser. Kandidaten afventer PR-CI og frisk produktion.

## Aktiv reparation og workflowforbedring, 2026-08-20
- PR #3 er merged som 4c6b7e3a, men push-produktion 32358538559 blev fail-closed stoppet i fuld validering før release-gate og deploy.
- Årsagen er fem resterende testforventninger til gamle GitHub Action-majors; live-produktionen blev ikke erstattet.
- Branchen codex/workflow-bootstrap-and-gate retter alle fem, tilføjer central versionskontrol, samler PR-gaten i validate:source og tilføjer reproducerbar Codex-klargøring.
- Lokal scripts/validate-source.ps1 er grøn. Næste trin er PR-gate, merge, fuld produktion og browserkontrol af den nye produktionsdataset.
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

## P1-checkpoint #3261
- `rr-20260820105744-210` har 72 rå prøver/42,866 timer i 210 zoner; 198 har samme verificerede spænd, og 12 kendte parenthuller står ved nul.
- Shadow-cachen spænder cirka 105,3 timer. Livepiloten dækker 673/673 med 622 lokal DMI, 43 lokal Copernicus og otte regionale proxyer.
- 72/168 timer er ikke nået, og der er ingen ny uafhængig modelstart. Fortsæt næste ikke-blokerede roadmaparbejde uden at ændre score, fallback eller geometri.
- Det fulde checkpoint ligger i `docs/research/P1_DRIFT_CHECKPOINT_4.0.238_RUN3261.md`.
## Lokal valideringsrettelse
+- `scripts/validate-source.ps1` er gjort kompatibel med både Windows PowerShell og PowerShell 7; en kontrakttest forhindrer den tidligere citatfejl i at vende tilbage.
## PR #8 produktionsverificeret
+- Merge `6d63ac3a`, produktion `#32363403425`, support `RavRadar-support-3263` og datasæt `rr-20260820112436-210` er fuldt grønne og byte-for-byte/live-browserverificerede.
+- Browseraudit: 210 zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger, nul fejl.
+- P1: 73 rå prøver/43,31 timer, 198 verificerede zoner, 12 uændrede parenthuller og cirka 105,75 timers shadow-capture. Fortsæt næste ikke-blokerede roadmaparbejde; 72/168 timer afventer naturlig tid.
## RavScore fase A-B igangsat score-neutralt
+- `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` er nu hovedgrundlaget: aktiv kode, tærskler, overlap, systemmodel, evidensklasser, første primærkilder og valideringsforsøg.
+- Vigtigste fund er risiko for dobbelt-tælling og manglende direkte kalibrering af numeriske tærskler/40-35-25-vægte. Bølgeretning, periode og historisk/spatial transport er kun testkandidater.
+- Næste sikre trin er fase C: materialefysik, dansk overførbarhed og deterministisk følsomheds-/overlapmatrix. Ingen produktionsscore må ændres.
## RavScore fase C
+- `scripts/audit-ravscore-sensitivity.mjs` og `docs/research/RAVSCORE_SENSITIVITY_AUDIT_4.0.238.md` dokumenterer 54 tærskelrækker, 18 missing-scenarier, otte overlap og 86.400 syntetiske scenarier.
+- Største spring er -18 ved waders-vind over 6 m/s, -12 ved strandvind over 13 m/s og +10-11 ved strøm 0,15 m/s. Det er kodeadfærd, ikke faglig ændringsgodkendelse.
+- Næste sikre forskning er observerede inputfordelinger, ablation samt fund-/nul- og hold-out-design.
## RavScore fase C produktionsverificeret
+- PR #11/`e85de36d`, produktion `#32366326503`, support `RavRadar-support-3265` og live `rr-20260820115954-210` er fuldt grønne og hash-/browserverificerede.
+- Browseraudit: 210 zoner, 673 dele, 420 aktuelle, 2.100 prognosevisninger og nul fejl. Aktiv scorekode er uændret.
+- P1 er nu 43,90 verificerede timer i 198 zoner og cirka 106,34 timers shadow-capture. Næste ikke-blokerede forskning er fase D-design, mens 72/168 timer vokser naturligt.
## Continuation checkpoint - RavScore phase D
- Branch: `codex/ravscore-phase-d` from merged main `0739a45e`.
- Added `docs/research/RAVSCORE_PHASE_D_CANDIDATE_MODELS.md` and `docs/research/ravscore-observation.schema.json`.
- Active score is unchanged; all candidates are shadow-only.
- Next executable roadmap step is internal observation intake plus immutable forecast-snapshot linkage, followed by a coverage-only report. Do not fit coefficients before that gate.
- Continue to avoid the four protected dirty data files and do not move land/water points.

## 4.0.239 observation safety handoff
- Branch: `codex/observation-safety-40239` from main `866a8a20`.
- Runtime code now redacts trip GPS from all remote observation payloads and locks new observation-driven model suggestions.
- Active score and existing local adaptive-model versions are unchanged.
- Run targeted tests, full source/release validation, PR gates and targeted production UI/runtime verification. Do not run the full 210/673 browser audit for this unrelated change.
- Do not inspect or delete historical central GPS without a separately approved migration.

## Checkpoint 2026-08-20 - main `b1d0e422`
- Live version: 4.0.239. Grøn produktionsrun: `32374202688`.
- Observationer sendes uden tur-GPS; lokal GPS forbliver lokal. Observationsanalyse er dæknings-only og kan ikke ændre RavScore.
- PR #16 er merged og verificeret: `validate:source` kører før DMI, og Copernicus-cachen gendannes igen efter DMI før livehistorikken.
- Seneste fulde produktionsbevis: 673/673 kystdele med verificeret strøm samt konsistente pile, score og forklaringer. Genkør ikke fuld browseraudit uden ugentlig termin eller relevant score/UI/datakontraktændring.
- Næste opgave: gør `build-live-current-pilot.py`-rapportens dækningsbegreb tidskorrekt. Bevar historikken, alle kilder, score, DMI-først og koordinater uændret. Tilføj selvtest for frisk historik uden aktuel/fremtidig scorepost.
- Fire beskyttede dirty datafiler må fortsat ikke røres eller stages.

## Checkpoint 2026-08-20 - main `c73a10d3`
- Grøn produktion: run `32379229853`; liveversion 4.0.239; Pages deployede commit `c73a10d32f2aab15c63787ecb71893fd9275bbf6`.
- Live-current-rapporten skelner nu bevaret historie fra scoreklar dækning og er dækket af den hurtige pre-DMI-gate.
- Alle normale produktionsbyg er låst til readiness-jobbets UTC-time, også push/force. Timed schedule/ikke-forceret dispatch er fortsat de eneste triggere, der kan udsættes ved cachemangel.
- Seneste bevis: 673/673 scoreklare dele fra låst time og 673/673 i den fulde audit. Ingen land-/vandpunkter blev flyttet.
- Næste opgave: RavScore fase D-observationsdækning/evidensgate. Bevar GPS-redaktion, kalibreringslås og produktionsmodel B0.

## Fase D privacy-checkpoint - source
- Aktiv branchdel ændrer kun Supabase-schema/migration og tests; ingen historiske observationsrækker eller land-/vandpunkter ændres.
- Migration: `supabase/migrations/20260820_observation_remote_privacy.sql`.
- Source-gate: `npm run validate:source` inkluderer `test:observation-db-privacy` og er grøn.
- Efter merge må SQL ikke beskrives som produktionsaktiv, før den centrale migration og en sikker positiv/negativ insert-verifikation er bestået.
- Rå observationspayloads, direkte identiteter og GPS må ikke skrives i PR, log eller supportartifact.

## 4.0.240 jagtbarhed og sikkerhed

- Arbejdsbranch: codex/ravscore-safety-language.
- Formål: adskil praktisk jagtbarhed fra sikkerhed uden score- eller geometriændring.
- PR #23 er merged som 961beab1 og produktionsverificeret med frisk fuld gate, direkte kildekontrol og fejlfri onlineaudit af 210 zoner/673 kystdele.
- Beskyt fortsat de fire dirty datafiler i hovedarbejdstræet, og flyt ingen land-/vandpunkter.

## 4.0.241 aktiv bølgeprior

- Arbejdsbranch: codex/ravscore-active-wave-approach.
- Kernen, forklaringen, fallbacken og testværktøjerne er implementeret.
- Featurecommit `ae4c86c6` er merged via PR #25 som `eb66b280`. Produktion `#32405699346` bestod frisk data, fuld validering, release-gate, Supabase, Pages-build og deploy; direkte Pages-kontrol viser 4.0.241 og den aktive bølgejustering. Onlineaudit på datasæt `rr-20260820185733-210` bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl. Næste trin er den særskilte, foreløbige vægtændring til 25/40/35.
- Næste delmål efter stabil produktion er den særskilte vægtændring 25/40/35.
- Flyt ingen land-/vandpunkter, og beskyt fortsat de fire dirty datafiler.

## 4.0.242 foreløbige vægte

- Branchen codex/ravscore-provisional-weights er oprettet fra main efter fuldt verificeret 4.0.241.
- Aktiv kandidat ændrer kun vægtene til 25/40/35 og retter bølgebeslutningens ID til DEC-0040.
- DEC-0041, målrettet test, syntetisk audit og national audit af 673 dele/42.846 scoreposter er grøn. De 420 viste zoner falder i gennemsnit 6,314 point, 7 skifter vindende del, og 110 krydser referencegrænser. Source-gate, browser, PR og produktion mangler.
- Ingen land-/vandpunkter, zoner, kystdele, komponentregler, tærskler eller pile må ændres.
## Lokal validering af 4.0.242 (2026-08-20)

- `pnpm run validate:source` er groen, inklusive den fulde lokale release-gate og de nye vaegt-/auditchecks.
- Browser-pluginet har indlaest 4.0.242 korrekt paa desktop og ved 390 x 844 med zoner, pile, femdoegnsvisning, score og alle tre forklaringsafsnit.
- Den lokale browsertest brugte det seneste offentlige 4.0.241-datasnapshot. Dets indlejrede forklaringstekster viser derfor fortsat 40/35/25 og er ikke produktionsbevis for den nye vaegtning.
- Efter merge skal workflowet bygge friske data med 4.0.242. Deployment maa kun godkendes, hvis score, delscorer, bidrag og forklaring stemmer med 25/40/35; derefter koeres den fulde onlinekontrol af 210 zoner og 673 kystdele.
## Checkpoint efter 4.0.242-produktionsverificering

- PR #28 er merged og produktionsworkflow `32421188352` er grønt på mergecommit `4f3481f272de11554fb64ad602555804f362b715`.
- 4.0.242 viser og beregner 25/40/35 korrekt.
- Fuld kontrol: 210 zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og 7.560 delscoreforklaringer uden fejl.
- Mobilkontrol ved 390 x 844 er grøn.
- Browser-pluginet fejlede kun på DNS-opløsning; system-Chromium/Playwright-fallbacken bestod.
- Ingen geometri eller land-/vandpunkter er flyttet.
- Fortsæt med næste ikke-blokerede roadmap-punkt. Den foreløbige vægtning skal først genkalibreres, når der findes et repræsentativt grundlag af fund- og nul-fundsture.
## Fase D handoff efter observeret ablation

- Branch: `codex/ravscore-phase-d-observed-ablation` fra main `2226bef5`.
- Nyt værktøj: `scripts/audit-ravscore-observed-ablation.mjs`; real audit på `rr-20260820220004-210` er grøn med 0 kontraktfejl.
- Hovedfund: 6,67 points zonevinderbias, aktuel strandjagtbarhed fast 75, transport-/mobiliseringskorrelation 0,69-0,74 og nul aktiv bølgejustering i snapshotet.
- DEC-0042 og tripprotokollen afviser enkeltfund som fit-enhed.
- Næste kodeopgave er tripkontrakten: faktisk start/slut, søgetid, jagtform, lokal del, dækningsgrad og immutable forecast-link; præcis GPS forbliver lokal.
- Aktiv score, 25/40/35, regler, geometri og punkter er uændrede.

## Handoff 2026-08-21 - 4.0.243 turdata

Aktiv branch: codex/trip-evidence-contract-4.0.243. Seneste browserverificerede funktionscommit før versions-/dokumentationscommit: 8a7016c7; databaseskema-korrektion: 85b6385d; legacy-bro: 00dcd50b. Lokal kontrakt-, privatlivs-, syntaks- og Browser-plugin-kontrol er grøn. Browserflowet viste 210 zoner, korrekt start/stop og samme kystdel; intet testsvar blev indsendt.

Næste trin: anvend/verificer Supabase-migration, kør validate:source og release:gate, commit/push dokumentations- og versionsdelta, opret kort PR, følg gates og merge/deploy kun ved fuld grøn evidens. Efter produktion kræves fuld 210/673-kontrol. De fire beskyttede dirty datafiler i Desktop-worktreeet må ikke røres. Ingen punkter er flyttet.

### Gatecheckpoint 2026-08-21 01:40 CEST

validate:source og release:gate er grønne for 4.0.243, inklusive den nye turkontrakt og observationsprivatliv. Supabase-migrationen er næste og eneste eksterne gate før PR/merge. Kør ikke den fulde 210/673-browserkontrol før exact-commit deploy; lokal integreret Browser-plugin-kontrol er allerede grøn.
## 2026-08-21 - Trip evidence v2: ekstern databasegate

- PR #31 er oprettet som kladde fra den allerede push'ede commit `8a7016c7`; GitHub-run `32430076625` bestod den fulde PR-kilde- og releasegate paa praecis dette head.
- En laesebaseret nul-raekkers PostgREST-kontrol bekraeftede, at `trip_id` findes (`HTTP 200`), mens v2-kolonnerne endnu ikke findes (`HTTP 400`, PostgreSQL `42703`).
- Repositoryet har ingen automatisk migrationsworkflow, og maskinen har hverken Supabase CLI, `psql` eller databaseforbindelsesmiljoevariabler. Migrationen maa derfor anvendes via en eksisterende godkendt databasekanal, foer PR'en kan goeres klar til merge.
- Det lokale releasecommit `95022593` indeholder fire utilsigtede byggeartefakter. De er ikke pushet. En sikker oprydning er forberedt, men sletningen kraever ejerens udtrykkelige godkendelse efter vaerktoejsafvisning.
## 2026-08-21 - Databasegaten er lukket

- Browser-pluginet fandt en aktiv Supabase-session og det korrekte RavRadar-projekt. Ingen tabeller med private rækker blev åbnet.
- Produktionstabellen var tom, men havde historisk `bigint` identity for `id` og `bigint` for `zone_id`. Den første v2-migration ramte derfor en typefejl og blev fuldt rullet tilbage; den næste ramte identity-detektion og blev også fuldt rullet tilbage.
- Kode og migration blev afstemt til den virkelige tabel. Den endelige v2-migration og den eksisterende, korrigerede privacy-migration blev derefter anvendt grønt i transaktioner.
- PostgREST, metadata og anonym rollback-insert er grønne; tabellen har fortsat nul rækker.
- Supabase varsler mulig projektbegrænsning fra 9. september 2026 på grund af egress over gratisgrænsen. Dette er registreret som kendt issue.
- Lokal commitkæde indeholder fortsat de fire ikke-push'ede byggeartefakter fra commit `95022593`. De må først fjernes efter ejerens udtrykkelige godkendelse; PR #31 og remote branch indeholder dem ikke.
- Efter den endelige kode- og migrationsrettelse bestod hele `validate:source`, inklusive `release:gate`, for 4.0.243.
- Egress blev undersøgt i Usage, Unified Logs, dokumentstørrelser og `pg_stat_statements`. Den seneste fulde dag var 64 MB (100% PostgREST) efter tidligere 700-1.500 MB-dage. Den eksisterende diagnostikpakning ser ud til at have løst problemet; overvågning er bedre cost/benefit end ny cachekode nu.

## Handoff 2026-08-21 - v4.0.243 afsluttet og næste hovedfase

- PR #31 er merged som `2ded7943`; exact-commit produktion `32455335962` er grøn og live viser 4.0.243.
- Browser-plugin bekræftede den nye side. Fallback-audit gennemgik 210 zoner, 673 kystdele, begge jagtformer, 420 aktuelle og 2.100 prognosevisninger med nul fejl.
- De fire utilsigtede byggeartefakter blev fjernet i korrektionscommit `f6a268bb`; de fire beskyttede dirty Desktop-datafiler blev ikke rørt.
- Næste P1 er en lille separat ændring, der begrænser normal Copernicus-pilot til godkendte DMI-huller. DMI-først, score og punkter må ikke ændres.
- Derefter gennemføres den store analyse og DEC-0044-planen: evidensregister, kandidatregler/vægte, lokal gammel-mod-ny-automatik, ejer/Codex-gennemgang, hændelsesmodel, ravvinduer, forklaringer og læringsmodul.
- Brug `docs/research/RAVSCORE_RESEARCH_PRODUCT_PLAN_2026-08-21.md` som den forståelige oversigt og DEC-0044 som bindende krav.

## Checkpoint: 4.0.244-kandidat
Normal Copernicus er ændret fra alle 673 kystdele til en automatisk liste over aktuelle lokale DMI-huller. En bred landskørsel kræver det manuelle full_coast-valg. Ingen koordinater er ændret. Næste skridt er målrettede tests, release-gate, PR, præcis produktionsverifikation og derefter fortsættelse af den allerede igangsatte store RavScore-evidensanalyse.

## Checkpoint: 4.0.245 Copernicus-target hotfix
- 4.0.244 blev merged, men den præcise produktion stoppede sikkert ved 630/673 før release og deploy. Den selvstændige pilot kunne ikke danne en eksakt-times DMI-hulliste fra ældre deployet dækning.
- 4.0.245 danner den autoritative hulliste efter frisk DMI i produktionen, kontrollerer den private shadow mod netop listen og henter kun manglende mål før livefletning og den uændrede 673/673-gate.
- Den selvstændige pilot gendanner seneste private DMI-cache, og preserve-workflowet sender den eksakte time videre.
- DMI er fortsat førstevalg. Score, regionale proxyer, geometri og alle land-/vandpunkter er uændrede.
- Næste trin: målrettede regressioner, kildekodegate, version, commit/push/PR, exact-head gates og kun derefter eventuel merge og præcis produktionsverifikation.

## Checkpoint: 4.0.246 DMI-strømtime
- PR #35/4.0.245 blev merged som `b461e7a5`. Exact-head-gaten var grøn, men produktion `32465245055` stoppede sikkert i det nye målregistertrin; livefletning, fuld validering, release og deploy blev ikke kørt.
- Artifactet beviser, at 08:00 fandtes for andre DMI-felter, men gav 0/673 gyldige lokale strømme. 09:00 gav 622/673 og 51 reelle huller. Fejlen var derfor timeresolution, ikke manglende frisk DMI-cache.
- 4.0.246 vælger kun ved nul eksakt dækning den højest dækkede og derefter nærmeste DMI-strømtime inden for tre timer og binder hele den efterfølgende produktionskæde til den valgte time.
- Hvis ingen nærliggende verificeret DMI-strømtime findes, stopper målbyggeren fortsat. DMI-først, 673/673, score, proxyer, geometri og punkter er uændrede.
- Næste trin: tests, versionslukning, commit/push/PR, exact-head-gates og præcis produktion. Først derefter fortsættes RavScore-analysen.

## Checkpoint: 4.0.246 produktion og 4.0.247 testmatrix
- PR #36 blev merged som c2e0d024; produktion 32467031990 bestod hele kæden og live viser 4.0.246, 210 zoner, 673 dele og reference 09:00Z.
- DMI leverer 622 lokale dele; målrettet Copernicus udfylder 43 reelle huller, og de otte godkendte regionale proxyer er uændrede. Ingen punkter er flyttet.
- 4.0.247-kandidaten fjerner kun gentaget validate:source fra planlagte same-source vejropdateringer. Push/manuelle builds, exact-head PR-gate og fuld post-data validate/releasegate bevares.
- Den fulde browseraudit køres ikke for denne workflow-/dokumentationsændring. Næste roadmappunkt efter produktionsbevis er den allerede CI-grønne forskningssyntese og automatisk gammel-mod-ny-scoreanalyse.

## Checkpoint: 4.0.247 produktionsverificeret
- PR #37 er merged som 3dc331ca, og produktion 32468752244 er grøn på den eksakte mergecommit.
- Live viser 4.0.247, datasæt rr-20260821094303-210, 210 zoner, 673 kystdele og reference 09:00Z.
- Fuld post-data validering, releasegate, Supabase, artifact og Pages bestod. Ingen browseraudit var relevant for workflowændringen.
- PR #34 er opdateret til den aktuelle main og indeholder den samlede RavScore-evidenssyntese. Næste trin er ny exact-head-gate, merge og derefter automatisk gammel-mod-ny-scoreanalyse.

## Checkpoint: 4.0.248 RavScore-sammenligning

- Branchen codex/ravscore-candidate-comparison implementerer stabile model-ID'er og Kandidat A-C som score-neutrale forskningsresultater.
- Observeret audit sammenligner gammel 40/35/25 med aktiv 25/40/35 på samme offentlige poster.
- En ny tynd rapportgenerator genbruger syntetisk og observeret audit og skriver kun en kort dansk ejer-rapport.
- Næste trin: generér rapport på live public-condition-details, kør målrettede self-tests/RDKS/release, commit/push/PR og præcis produktion.
- Ingen produktionsscore, forklaring, pil, datakilde, geometri eller punkt er ændret.

## v4.0.248-kandidatgennemgang (2026-08-21)

Den automatiske ejeroversigt og den faglige gennemgang er nu genereret. Dette afsnit erstatter tidligere status om, at rapporten manglede. Konklusionen er at beholde den aktive vaegtning 25/40/35 og ikke aktivere A, B eller C samlet. A er for volatil, B skal skelne levering fra passage, og C er en mulig mild fysisk gate, men der er kun 3 af 1.346 aktuelle kystdele med mindst middel score og et tydeligt svagt fysisk led. Naeste trin er derfor score-neutral intern skyggekoersel og maalrettet retningskontrol, ikke en offentlig scoreaendring. Se `docs/research/RAVSCORE_CANDIDATE_REVIEW_2026-08-21.md`.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## Checkpoint 4.0.250 - aktiv RavScore-shadow

Den tidligere nationale geometrikoersel `32474884163` fejlede korrekt paa det uafhaengige punktbevis. Ingen punkter er flyttet, og gaten er ikke omgaaet. Branchens nye manuelle job bygger i stedet et midlertidigt read-only input fra den aktive public-details-bestand og repoets zoneopslag. Den realistiske lokale prøve gav dataset `rr-20260821105135-210`, 210 zoner og 673 dele; score/public runtime/automatisk aktivering var alle falsk. Efter merge skal exact-commit produktion foelges, derefter koeres `ravscore_active_shadow=true`, og kun den kompakte rapport analyseres. Aktiv score er fortsat 25/40/35.

## Checkpoint 4.0.251 - foerste aktive shadowrun fandt collection-mismatch

Run `32479158213` paa merge `34ed1dbc39c18aaefcb77aac89028ebb29c45468` sprang produktion/deploy over, byggede aktivt 210/673-input og verificerede 673 native DMI-punkter. Kontrakten rapporterede foreloebigt 622 fuld og 51 delvis dækning, men flertrinsgaten stoppede foer state/score ved `dk-b01-02-national-part-01`, fordi DKSS-komponenter var fordelt over collections. 4.0.251 klassificerer nu kun en familie som komplet inden for samme collection og kræver U/V i samme punkt og collection. Koer ny PR, produktion og shadow; brug ikke den fejlede rapports 622/51 som scoreevidens.

## Checkpoint 2026-08-22 - Candidate G-beslutningsgrundlag og shadowgate lukket

- PR #59 er merged som `6b1511e0`. Centralt hydreret shadow `32554012542` kontrollerede 210 zoner/673 dele score-neutralt; kun 243 dele havde komplette scoreinput, og retention-featurecoverage var nul.
- Kandidat G må ikke aktiveres. 50/50 uden direkte vind er næste foretrukne beslutningsvariant; coverage, waders-betydning, pile/forklaring og ejer-go/no-go er åbne.
- Første main-produktion `32565885534` stoppede korrekt før release/deploy på en for bred shadowtest. PR #60 låste GET-only regelhydrering, konkrete skrive-/deployforbud og kørsel af testen i `validate:source`.
- PR #60 er merged som `41e01e2d`; exact-head-gate `32566573875`, fuld produktion `32566631701` og Pages deployment `6035679906` er grønne. Live 4.0.252/datasæt `rr-20260822100745-210` har 210 zoner og 673 dele.
- Aktiv RavScore er fortsat 25/40/35. Beskyttede data, artifactkilder, geometri og land-/vandpunkter er ikke ændret.

## Lokal Codex/GitHub-login på den nye Windows-computer

- Git Credential Manager er sat til den Windows-DPAPI-krypterede filstore med global `credential.credentialStore=dpapi`; et frisk noninteraktivt `git ls-remote` og PR #60-flowet bekræftede vedvarende adgang uden nyt browserlogin.
- Brug den bundne Codex-Git under `.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`, hvis appens PATH mister Git efter sleep eller genstart.
- Start lange autonome forløb med en read-only `git ls-remote`- og GitHub-connectorpreflight. Ingen credentials, tokens eller storeindhold må logges eller committes.
