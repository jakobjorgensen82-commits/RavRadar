# Codex – start her

Dette er den obligatoriske indgang til RavRadar for Codex og andre kodeassistenter. Projektet må ikke behandles som en samling isolerede filer. Hver ændring skal forstås som et træk i et sammenhængende system.

## Verificeret startbaseline
- Applikationsversion: **4.0.117**.
- Git-baseline: `6c1dece72d5970a1fc095b9a22f080d811cd9f36` (`RavRadar 4.0.117 stab`).
- GitHub Actions #1749: succes og deploy på samme commit.
- GitHub Actions #1750: succes på samme commit efter administratorens rettelser af zonegeometri; denne kørsel er den vigtigste friske produktionsverifikation ved Codex-overgangen.
- De centrale adminrettelser blev i #1750 hentet fra Supabase, anvendt på zoneregisteret og ført videre gennem vejrproduktionen.
- En senere kørsel skal altid vurderes som nyere evidens, men må ikke automatisk omskrive denne dokumenterede baseline uden analyse.

## Læs i denne rækkefølge før første ændring
1. `AGENTS.md`
2. `docs/rdks/00_READ_FIRST.md` og `docs/rdks/01_AI_OPERATING_RULES.md`
3. `docs/rdks/90_INDEX/CURRENT_TRUTH.md`
4. `docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md`
5. `docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md`
6. `docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md`
7. `docs/ai/AI_KNOWLEDGE_BASE.md`, `AI_ARCHITECTURE_MAP.md`, `AI_WORKING_RULES.md`, `AI_ROADMAP.md` og `AI_LESSONS_LEARNED.md`
8. relevante beslutninger under `docs/rdks/10_DECISIONS/`
9. relevante dele af `HANDBOOK-RAVRADAR.md` og den aktive kode/testkæde
10. historiske chatfiler kun når en beslutnings begrundelse eller regression skal rekonstrueres.

## Første kontrol i en lokal Codex-session
Kør `git status`, `git log -5 --oneline` og kontroller `package.json`/`version.json`. Kør mindst `npm run validate:rdks` før dokumentationsarbejde og relevante målrettede tests før kodeændringer. Før release kræves hele den gældende validerings- og releasegate.

## Stabilitetsord
Brug ikke ordet **stabil** om noget, der kun er lokalt grønt. Skeln mellem:
- **lokalt valideret** – relevante lokale tests er grønne,
- **CI-valideret** – den relevante GitHub Actions-kørsel er grøn,
- **produktionsverificeret** – frisk produktionsdata, artifact/deploy og den berørte runtimekæde er faktisk verificeret.

## Hovedregel: tænk hele brættet
Når en fejl viser sig i ét led, må Codex ikke straks lappe dette led. Kortlæg først input, central konfiguration, scheduler, tidsbudget, cache, DMI-collection, GRIB-parser, komponentparring, interpolation/routing, provenance, score/state, public runtime, UI/admin, tests, artifact, deployment og browsercache. Sammenlign om nødvendigt med seneste fungerende version og identificér den introducerende ændring.

## Autoritative kilder
Aktuel brugerbeslutning og aktiv RDKS er kravgrundlaget. Git repositoryet er kodegrundlaget. Supabase er autoritativ for centralt gemte administratorændringer. DMI er autoritativ vejr-/havdatakilde. Håndbogen forklarer faglig og driftsmæssig betydning. Chatarkivet er historik.

## Stopklodser
Codex må ikke få tests grønne ved at genindføre stale vejrdata, konstruere manglende værdier som nul, bruge generelle regionale strømbånd, hardcode administratorredigerbare zonedata eller svække videnskabelige audits.

## Praktisk handoff
Brug `docs/ai/CODEX_HANDOFF_CHECKLIST.md` ved første lokale opsætning og før den første Codex-release.
