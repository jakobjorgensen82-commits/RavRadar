# RavRadar - aktuelt Codex-handoff

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