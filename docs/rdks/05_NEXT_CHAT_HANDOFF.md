# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde, DEC-0030, DEC-0031 og DEC-0037 før kodearbejde. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- 4.0.208 er seneste produktionsverificerede baseline (#31848912461, commit `7a3382f200a72b702d814ba4d8ca205dc4523369`). Central adminhydrering/tombstones, frisk vejr, fuld validering, releasegate, Supabase, Pages-artifact og deploy bestod.
- 4.0.208 forbedrer lokal snapshotdiagnose og tilføjer en skrivebeskyttet deployaudit. Den ændrer ikke zoner, geometri, DMI-kilder, score eller offentlig UI.
- Den faktiske deployede runtime viser version 4.0.208 og datasæt `rr-20260814230422-210` med 210/210 matchende zoner og vejrposter. Alle tre Vadehavszoner `DK-B04-12`–`DK-B04-14` findes med vejrdata.
- Det indcheckede 31. juli-snapshot er historisk. Et råt repositoryregister er heller ikke centralt effektivt før adminhydrering og tombstones. Derfor skal et lokalt mismatch ikke omtales som en produktionszonefejl uden deployaudit.
- `validate:data` er fortsat fail-closed. Stale mismatch forklares særskilt; aktuel mismatch eller atomisk manifest/conditions-drift er hård fejl.
- `npm run audit:deployed-zone-weather` er read-only. `npm run hydrate:deployed-weather` hydrerer kun vejr og erstatter ikke central adminhydrering.

## Første opgave i næste chat

1. Fortsæt den aktive P1-opgave: DMI-first femdøgnskæder pr. komponent under DEC-0030. Analyse og design før enhver ny kilde, fallback eller scoreændring.
2. Overvåg Supabase-egress gennem næste billingperiode; den private dataminimerede besøgstæller med enkel adminrapport er fortsat P2.
3. Ejerens manuelle land-/vandmarkørreview kan fortsætte gradvist og må ikke erstattes af automatisk national genopdeling.

## Seneste P1-basis (lokal, 2026-08-19)

- Udført: `scripts/audit-p1-component-matrix.py data/live/conditions.json` og gemt som `data/diagnostics/p1-component-matrix-audit.json`.
- Resultat (lokal 210-zoner): alle komponenter har aktiv DMI- eller eksternt forankret dataserie, men vind/bølge/strøm/vandtemperatur starter ikke konsekvent med DMI fra time 0 (leading DMI-times < 96 i 210/210 zoner), hvilket viser en frontlåsning af hale-fallback i flere 5-døgnsforløb.
- Transitionpar:
  - `wind`: `dmi -> dmi-extended` og `dmi-extended -> dmi` i samtlige 210 zoner.
  - `wave`: 15 zoner går fra `dmi` til `missing` før tail, 391 `dmi -> dmi-extended`, 406 `dmi-extended -> dmi`.
  - `current`: 8 zoner går til `missing`, 202 overgang til fallback og 210 tilbage til DMI.
  - `waterLevel`: 8 zoner går til `missing`, 202 overgang `dmi -> fallback`.
  - `waterTemperature`: 8 zoner går til `missing`, 202 overgang til fallback og 210 retur til dmi.
- Konsekvens: der findes i denne version ingen ændringer i kode under denne runde; næste skridt er design af tydelig DMI-først-kæde med dokumenteret ekstern hale for de resterende timers dækning.

## Beskyttede beslutninger

- Én autoritativ land-/vandmarkørpar pr. aktiv kyststrækning; manuel gradvis ejerreview kan udskydes, men kræves før endelig faglig brugerrelease.
- Central adminstatus er autoritativ; Fejø/Femø og Havnø/Mariager Fjord øst forbliver slettede.
- Funktioner må ikke fjernes uden ejerbeslutning.
- DMI-first, missing forbliver missing, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.

### 2026-08-19 – supplerende browser- og P1-forløb (lokalt)
- Browser-kontrol af 210 zoner + 673 kystdele er gennemført med Playwright-fallback (Browser-plugin blev først forsøgt): data/diagnostics/browser-zone-check-20260819-221757.json.
  - Baseline: 210/673
  - conditions/resultat mangler i 210/210 (lokalt snapshot-forhold, ikke UI-regression).
  - 0 mismatch på score/pile/forklaring i valideringen.
- Supplerende P1-komponentmåling på det samme snapshot er skrevet: data/diagnostics/p1-component-matrix-legacy-20260819-221839.json (dataset rr-20260815101737-210).
  - wind: 210 zoner, 118 timers dækning (118-118), sourcekæde dmi->dmi-extended->dmi i alle zoner.
  - Verifikation: 183/210 verificerede zoner, 27 unverified. Næste skridt er fortsat overgangs- og haleanalyse efter DEC-0030.
- Komponentfordeling fra seneste legacy-matrix (p1-component-matrix-legacy-20260819-221839.json):
  - wind: 210 zoner vis med data; 100% fuld vist horisont (118), transitions dmi->dmi-extended 210 og dmi-extended->dmi 210.
  - wave: 209 zoner vis data; fuld horisont i 194, min 0/max 118; transitions dmi->dmi-extended 391, dmi-extended->dmi 406, dmi->missing 15.
  - current: 210 zoner vis data; fuld i 202, min 100/max 118; transitions dmi->missing 8, dmi->dmi-extended 202, dmi-extended->dmi 210.
  - waterLevel: 210 zoner vis data; fuld i 202, min 100/max 118; transitions dmi->missing 8, dmi->fallback 202.
  - waterTemperature: 210 zoner vis data; fuld i 202, min 100/max 118; transitions dmi->missing 8, dmi->dmi-extended 202, dmi-extended->dmi 210.
## DEC-0030 P1-fokus (prioritering, udsnit fra 2026-08-19 snapshot)
- wave: 1 zone helt uden data (zonesWithNoData), 16 zoner under fuld 118-timers dækning; DK-B05-11 er den isolerede total-missing zone i denne måling.
- current: ingen total-missing zoner, 8 zoner under fuld dækning; current har 8 transitioner til missing og 202 til dmi->dmi-extended, 210 tilbage til DMI.
- waterLevel: ingen total-missing zoner, 8 zoner under fuld dækning; 8 transitioner til missing og 202 til dmi->fallback i alle 210 zoner.
- waterTemperature: ingen total-missing zoner, 8 zoner under fuld dækning; 8 transitioner til missing, 202 til dmi->dmi-extended, 210 tilbage til DMI.
- wind: ingen total-missing zoner eller manglende tidstræk i denne matrix; stadig kort front: 210 zoner med <96 timers DMI-front (zonesWithLeadingDmiShortfall=210) som fortsat kræver overgangsanalyse før eventuelle designvalg (det matcher åbent DEC-0030-punkt).
- Yderligere prioriteringsartefakt: data/diagnostics/p1-component-priority-matrix-20260819-221839.json indeholder per komponent antal og lister (bl.a. zonesWithNoData + zonesBelowFullDisplayedHorizon).
- Supplerende artefakt med fulde zone-lister: data/diagnostics/p1-component-priority-zones-20260819-221839.json
## DEC-0030 – P1 transitionklynge (konkret risikozoner, 2026-08-19 snapshot)
- Fælles cluster: alle risikozoner ligger i DK-B05-serien (Thisted/ Mors / Fur / Løgstør / Nibe / Gjøl / Aalborg).
- Zone-liste med navn og symptomtyper: data/diagnostics/p1-component-zone-risk-named-20260819-221839.json
  - Formål: køre næste 8t-runde kun mod denne cluster for transitionhåndtering, så vi får fuld 72h/komponent-matrix uden UI-ændring eller scoreændring.
- Næste sekvens i rækkefølge: (1) wave/current/waterLevel/waterTemperature transition-opsætning for DK-B05-09..DK-B05-24, (2) afgrænsning af årsag (kildegrænse vs. routing), (3) designhypotese-dokument uden kodeindgreb.
## DEC-0030 – DK-B05 klusteranalyse (2026-08-19)
- Analysekørslen med zonevis transitionstidspunkter (fra conditions.json) er lavet: data/diagnostics/p1-component-zone-transitions-B05-detail-20260819-221839.json
- Fastsat mønster (16 zoner): 8 zoner har pattern waterLevel=fallback, current=dmi|dmi-extended og wave dmi-switch før missing; 7 zoner har wave-missing + 8-zone mønster med current->dmi-extended + waterLevel fallback; 1 zone (DK-B05-11) mangler bølgekomponenten helt (wave transitionliste tom), mens wind/waterTemp/current følger dmi|dmi-extended.
- Denne klynge skal behandles som én overgangs-hypotesetest: bølgerespons med kort varierende klip og fald, med samtidige 8-zoners problemflade på current/level/temp omkring den samme 8-zoners halegrænse.
- Supplerende kort over zoners mangelsignatur: data/diagnostics/p1-component-B05-transition-summary-20260819-221839.json
### DK-B05 transition-klassifikation (2026-08-19 snapshot)
- Færdigklassificeret cluster-kørsel (16 zoner) i: data/diagnostics/p1-component-B05-transition-classified-20260819-221839.json
- Zoneklasser: wave_only_gap=7, wave_total_gap=1, wave_current_level_temp_simul_gap=8.
- Klassifikation bruges som næste DEC-0030-arbejdshistorik før enhver modelkædeændring: alle 8-zone med simultant current/level/temp-missing sker i én geografisk blok med waterLevel-fallback tidstempler omkring 2026-08-19T14:00Z, hvilket peger mod fælles hale-kildegrænse og ikke individuel zonefejl.
- Neste handling: validér transitiontider mod de respektive DMI runs i ny productionkørsel (ikke lokale snapshots), og bekræft om waterLevel/fallback + temp/current-water samtidige mangler er run-koblet.
- Timingbevis (DK-B05) fra per-zonetype transitions: first missing-wave sker samlet kl. 2026-08-20T06:00Z i 15 zoner; current/level/temp første missing for 8 zoner kl. 2026-08-19T14:00Z. Se data/diagnostics/p1-component-B05-missing-time-summary-20260819-221839.json.
## DK-B05 årsagsklasse og næste skridt (2026-08-19)
- Hypoteser udledt af zonevis transitiontidspunkter er gemt i: data/diagnostics/p1-component-B05-cause-hypothesis-20260819-221839.json samt .md-tekst.
- Forslag: valider de to tydelige tidsmønstre i *næste production artifact* før nogen fallback/modelkædeændring:
  - wave-first missing kl. 2026-08-20T06:00Z (15 zoner),
  - cur/level/temp-samtidig first missing kl. 2026-08-19T14:00Z (8 zoner).
- Når bekræftet, gå videre til DEC-0030 Transition Contract-opdatering i DMI_FIRST_FIVE_DAY_SOURCE_AUDIT (intet code change før bekræftet).
### 2026-08-19 – DK-B05 live-kontrol (lokal `data/live/conditions.json`)
- Lokalt valideret transitionkørsel kørende på det samme snapshot i dag:
  - `data/diagnostics/p1-component-zone-transitions-B05-live-20260819-223131.json`
  - Klassifikation udledt i `data/diagnostics/p1-component-B05-transition-classified-live-20260819-2237.json`.
- Resultat (lokalt snapshot): samme to-mønster bekræftet.
  - 7 zoner wave-only-gap.
  - 8 zoner wave-current-level-temperature-simultant missing-gap.
  - 0 zoner med separat total wave gap.
  - Første fælles wave-missing kl. 2026-08-20T06:00Z i 15 zoner.
  - Første fælles current/waterLevel/waterTemperature-missing kl. 2026-08-19T14:00Z i 8 zoner.
- `DK-B05-11` er i denne lokale måling ikke total wave-missing længere; det afspejler ændret zonesæt/timeforløb.
- Produktions-artefakt blev ikke sikkert hentet via tilladte offentlige endpoints i denne runde, så overgangs-kontrakt i DEC-0030 bør fortsat markeres som lokal validering + ny production-by-pass når deployment-output igen er tilgængeligt.
- Komprimeret leverance: `data/diagnostics/p1-component-B05-transition-summary-live-20260819-2237.md`.
## 2026-08-19 (kontinuerligt – 4) – overgangsprofil suppleret

- Udført: Ny afledt audit for P1-transitioner via `scripts/audit-p1-component-transition-profiles.py` på `data/live/conditions.json` og dokumentation:
  - `data/diagnostics/p1-component-transition-profile-live-20260819-2302.json`
  - `data/diagnostics/p1-component-transition-profile-live-20260819-2302.md`
- Vigtige resultater:
  - `wind`: 99 timers DMI-front i alle 210 zoner, ingen dmi-tilbagevenden, 0 manglende efter første DMI-front.
  - `current` og `waterTemperature`: 6-9 zones ser ud til at få front under 96 timer med 8 samtidige manglende zoner efter 08:00 kl. 2026-08-19 14:00Z i DK-B05-klusteret.
  - `waterLevel`: 100 timers DMI-front i alle zoner, men samme 8 samtidige manglende `firstMissingAfterDmiAt` i DK-B05-sekvensen.
  - `wave`: 7 zoner uden registreret DMI-front før første komponent-mangel; 15 zoner mangler først fra `2026-08-20T06:00:00Z`.
- Afgrænsning: stadig lokal audit af DMI-first transition; ingen kilde-/fallbackændring er udført endnu.
- Næste skridt: bruge samme profil-output i produktionsartifact, når nyt public-run kan hentes stabilt, før nogen designbeslutning aktiveres.
## 2026-08-19 (browser-kontrol fortsætter)
- Kørte Playwright-fallback via `scripts/temp-browser-zone-check.py` mod lokal app-state.
- Ny kørsel gemt i:
  - `data/diagnostics/browser-zone-check-20260819-2315.json`
  - `data/diagnostics/browser-zone-check-20260819-2315-summary.md`
- Resultat fra kørsel:
  - Baseline 210 zoner / 673 dele.
  - `partsMismatchCount=0`, `partsTotal=673`, `partsTotalMismatch=false`.
  - `zoneScoreMismatches=0`, `zoneArrowMismatches=0`, `zoneExplanationMismatches=0`.
  - `conditionsCoverage`: `zonesWithConditions=0`, `conditionsMissing=210`, `resultsMissing=210`.
- Tolkning: Playwright/DOM-kontrol fungerer for zone/part åbning, men runtime rapporterer ikke `conditions` i lokal state i denne version, så fuld score/komponent-match kan ikke valideres i denne kontrolrunde.
- Næste skridt: fortsæt med at køre kontrol, når conditions indlæses korrekt (eller fallback-injicér conditions i debug-hook), så transition + scoreforklaring også kan valideres zonevis.
## Checkpoint 2026-08-20 - browserkontrol afsluttet

Den systematiske browserkontrol er afsluttet på 210 zoner, 673 kystdele og 1.050 prognosedage. Endelig måling har 0 mismatch for aktuel og prognosticeret score, label/niveau, vind-/strømpile og forklaring. Se `data/diagnostics/browser-zone-check-final-20260820-0200.json` og tilhørende summary. Browser-pluginet fejlede i trusted-path-opstart, så den godkendte Chromium-fallback blev brugt. Næste roadmaparbejde fortsætter med DEC-0030 P1 og nye modelcyklus-/overgangsbeviser; browserresultatet må ikke kaldes frisk produktionsverifikation.
