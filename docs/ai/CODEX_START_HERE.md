# Codex – start her

Dette er den obligatoriske indgang til RavRadar for Codex og andre kodeassistenter. Projektet må ikke behandles som en samling isolerede filer. Hver ændring skal forstås som et træk i et sammenhængende system.

## Verificeret startbaseline
- Applikationsversion: **4.0.117**.
- Aktuel `main` ved handoff: `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Historiske #1749/#1750 var grønne i deres daværende kontekst, men må **ikke længere bruges som bevis for den aktuelle handoff-baseline**. Efterfølgende fejlsøgning viste, at almindelige automatiske `workflow_dispatch`-kørsler kan springe de to fulde releasegates over og stadig deploye.
- #1760 kørte på `a164b6e…`, opdaterede DMI/weather/provenance/public runtime og deployede succesfuldt, men trinene `Validate full project after fresh weather and current provenance` og `Run release governance gate after refreshed data validation` var begge **skipped**. Derfor er #1760 et deploy-/datakædebevis, ikke et fuldt releasebevis.
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

Før hvert væsentligt arbejdsafsnit skal Codex desuden anvende DEC-0031: vurder modelbehovet, anbefal aktivt en billigere aktuel model når kvaliteten er den samme, og stop senere for at anbefale Sol igen før kritisk arbejde. Kvote må aldrig sænke analyse- eller valideringskrav.

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

Hvis `docs/ai/CURRENT_SESSION_HANDOFF.md` findes, skal den læses efter de obligatoriske RDKS-indeksfiler. Den beskriver den seneste sikre arbejdsgrænse, men kan aldrig tilsidesætte nyere brugerbeslutning, RDKS eller faktisk kode.

## P0 – første Codex-opgave før al videre udvikling
Workflowrettelsen er implementeret og produktionsverificeret i #1772: begge fulde gates kræver enhver positiv preflight, artifactet ligger efter gates, og samme friske run viste begge gates samt Pages-deploy som `success`.
1. Kontrollér den aktuelle workflowfil og bekræft gatebypasset: de to fulde gates er betinget af `push || force`, mens almindelig `workflow_dispatch` stadig kan nå artifact/deploy.
2. Ret workflowet systemisk, så et nyt produktionsartifact ikke kan deployes efter en frisk dataopbygning uden at de relevante fulde gates faktisk har kørt og bestået. Svæk ikke gates og ændr ikke RavScore/DMI-regler for at få grønt.
3. Kør lokale målrettede tests + `npm run validate` + `npm run release:gate`.
4. Commit/push workflowrettelsen fra Codex.
5. Følg den første friske GitHub-kørsel trin for trin. Den tæller kun, hvis de to gate-trin står som **success**, ikke `skipped`.
6. Hvis den bliver rød, analysér den konkrete runtimekæde og ret årsagen. Ingen ny større featureudvikling før en fuld streng produktionskørsel er grøn.

**Vigtigt:** Handoff-ZIP'en før Codex ændrer med vilje ikke workflowbetingelserne. Det er en midlertidig bootstrapmekanisme, ikke accepteret slutarkitektur.

## Permanent PR- og mergeautoritet
Codex må oprette, opdatere og selv merge datasikre PR'er fra egne RavRadar-branches, når hele den relevante validerings-, regressions-, dokumentations- og produktionskontrakt er verificeret. Grøn topstatus alene er ikke nok ved konkret modstridende evidens, og røde eller uafklarede gates må aldrig omgås. Efter merge følges deploy og produktion uden unødigt stop. Irreversible, destruktive, usædvanligt risikable eller ikke-godkendte produktbeslutninger kræver fortsat ejerens udtrykkelige godkendelse. Se `docs/rdks/01_AI_OPERATING_RULES.md` og `docs/ai/AI_WORKING_RULES.md`.
