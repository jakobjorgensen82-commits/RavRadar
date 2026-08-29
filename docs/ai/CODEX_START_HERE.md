# Codex – start her

Dette er den obligatoriske indgang til RavRadar for Codex og andre kodeassistenter. Projektet må ikke behandles som en samling isolerede filer. Hver ændring skal forstås som et træk i et sammenhængende system.

## Aktuelt P0-checkpoint 2026-08-29 – lokal 4.0.313 replay-roll-forward

- Offentlig produktionssandhed er stadig 4.0.310-nøddrift; morgenhullet er ikke lukket.
- 4.0.312 er merged via PR #225/exact-head `33266087776` som `a5ece10d`; push `33266184326` var korrekt no-op. Backend `33266229687` fejlede legacy-sync og er ikke readiness.
- 4.0.313 retter kun den syntetisk reproducerede forskel mellem gamle nested nullblade og bounded leafprojektion. Kompatibilitet er migration-only, schema/privacy-streng og no-mutation for row/hash/registry.
- Målrettede replay/D1/privacy/registry/error/workflowtests, uafhængigt review, fuld lokal sourcegate, RDKS, release, version og geodatabevis er grønne. Exact-head, merge og live D1 mangler.
- Kør aldrig reconstruction inspect/apply før et helt grønt exact-main `[d1]`-run. Kør ny inspect ved flyttet main/target; genbrug ikke gammel descriptor. Offentlig 210/673 og frisk produktion er slutgate.
- Trip protocol/header og trustgrænse forbliver 4.0.311. Candidate G/RavScore/vejr/state/geometri/punkter er uændrede. Brug Sol/Ultra.

## Historisk P0-checkpoint 2026-08-29 – lokal 4.0.312 roll-forward

- Offentlig sandhed er fortsat produktionsverificeret 4.0.310. 4.0.311 bestod PR #224's exact-head CI `33263734108` og blev merged som `7c168b00af535415117c968a8c021a493b083137`; push-run `33263858078` var en korrekt grøn no-op uden nyt artifact eller Pages-deploy.
- Backend-run `33263892151` stoppede ved den efterfølgende katalogverifikation, efter at den atomiske SQL-forespørgsel havde svaret HTTP 201. `pg_get_constraintdef` havde deparseret den kanoniske JSONPath med ekstra parenteser, som den flade regex ikke accepterede. Den sandsynlige tilstand er derfor, at CHECK-constraint, validering og kommentar blev committed samlet; transaktionens eneste atomiske alternativ er fuld rollback. Ingen observationpayloads blev hentet til runneren, logget eller ændret, ingen row mutation forekom, og D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået.
- Den lokale 4.0.312-roll-forward erstatter den skrøbelige tekstregex med strukturel udtrækning af præcis én JSONPath-literal. Den tolererer deparserens parentesering, kræver den eksakte kanoniske path og afviser reorder, duplicate, extra og ambiguous. Målrettede regressioner, fuld lokal source/release/RDKS/håndbog/version og geodatakontrol er grønne, og exact-D1-interlocken omfatter 4.0.312; PR/exact-head, merge, backend, rekonstruktions-inspect/apply, frisk produktion og offentlig verifikation mangler fortsat.
- 4.0.312 er en app-/verifier-roll-forward og ændrer ikke trip protocol/header 4.0.311 eller den eksisterende `>=4.0.311`-migrationsgrænse.
- Ejeren har godkendt præcis én rekonstruktion af Candidate G-morgenhullet som incident `RRGAP-2026-08-29-CANDIDATE-G-01`. Kun allerede afledt kystnormal strength mellem eksakte artifacts må interpoleres; ingen vejr, bølger, vandstand, rå U/V, koordinater, geometri, punkter eller private payloads.
- Rekonstrueret state er schema 2.1 med eksplicit trust, ikke kalibreringsegnet og ikke gyldigt observeret udtransportbevis. Normal measured-only state/fallback er schema 2.0 og uændret.
- Inspect/apply/rollback/cleanup, measured-only fallback, tripflags og releasekæden er bindende. Storagekandidaten sætter existing-D1/fresh Edge-predeploy-intent efter capacity/CAS. Existing D1 bruger 20-/30-minutters lease, femsekunders prober, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge går exact-main/Supabase-secret/eksakt Edge/dobbelt attest. Uden intent ingen recoverymutation. Dette historiske næste-trin blev afløst, da 4.0.312 blev merged og dens backend fejlede migrationssynken; fortsæt kun fra det aktuelle 4.0.313-checkpoint ovenfor med Sol/Ultra.
- Den integrerede næste model er fortsat separat under DEC-0102 og skal efter recovery integrere den nye grønne `main` samt bevare DEC-0109's trust-/provenancekontrakt uden generel interpolation. Den skal selv bevare én målt-only atomisk 210/673-nødstate i højst 72 timer og aldrig efter kortere forecastudløb. `calibration_eligible` er ikke serverbevist empirisk evidens; global koefficientlæring forbliver låst.

## Historisk arbejdscheckpoint 2026-08-24 – 4.0.273

- **Candidate G er den eneste tilladte offentlige scoremodel.** Den aktive formel er `20 % søgeforhold`, `50 % transport mod kysten` og `30 % rav i bevægelse`. `25/40/35` må kun bruges til historisk analyse og kan ikke vælges som offentlig reserve.
- Manglende eller usammenhængende Candidate G-grundlag håndteres lokalt: den konkrete zone, søgemåde og time får ingen score og udelades fra aktuelle og femdøgns-ranglister. Andre zoner fortsætter på Candidate G. Der må ikke lånes score fra en gammel model, moderzone, nabozone eller anden time.
- Adminforsiden viser, om alle zone-/søgemådekombinationer har en aktiv Candidate G-score. Hvis ikke, listes de berørte zoner, søgemåder og almindeligt forståelige årsager uden private payloads, rå strømvektorer eller koordinater.
- Produktionshydrering, tidligere state, kildeproveniens og releasegates er fortsat fail-closed. En mangelfuld produktion må stadig stoppe før publicering; lokal utilgængelighed er ikke tilladelse til at opfinde data eller svække gates.
- Ændringen er implementeret og målrettet lokalt valideret. Exact-head CI, frisk produktion og offentlig runtime er endnu ikke verificeret. Se DEC-0072. Ingen geometri eller land-/vandpunkter er ændret.

## Historisk produktionscheckpoint 2026-08-23

- **Aktuel produktionsverificeret 4.0.265:** Kontoen har **Indberet tur eller fund** uden forudgående turstart. Brugeren skal selv vælge dato og klokkeslæt for turens start samt varighed; dato og tid er ikke forudfyldt. Nutidens vejr bruges aldrig som historisk erstatning, og en efterregistrering uden sikkert snapshot gemmes i den eksisterende `observations`-tabel med `calibration_eligible=false`. **Afslut uden at indberette** rydder kun den lokale aktive tur. Se DEC-0064.
- PR #111 bestod exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210/673, og den udgivne formulars dato-/tids- og fravalgskontrakt er målrettet kontrolleret. En autentificeret indsendelse kræver fortsat ejerens bevidste handling, fordi den opretter en virkelig række.
- **Tidligere produktionsverificeret 4.0.264:** Kontoen fik **Mine ture og fund** som en begrænset RLS-læsning af de eksisterende `observations`-rækker. Der oprettes ingen ny tabel, serverrække eller kopi. Den direkte v2-tur erstattede den gamle GPS-baserede parallelrejse i UI, og login/magic-link-tekster samt centrale RavScore-ord blev forenklet. Se DEC-0063.
- PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` bestod hele kæden. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod igen frisk data, fuld validering, releasegate og Pages. Live `rr-20260823171804-210` er 4.0.264 på 210/673. Konto-/loginforklaring, direkte tur uden GPS/rute og offentlig tekst er browserkontrolleret. Den fulde 420/2.100/673-audit er grøn med UI og audit enige om `Vandstandsændring på 3 timer`.
- PR #108 bestod exact-head `32654780774` og blev merged som den rene dokumentationscommit `98621bf9`. Mergecommitten oprettede 0 push-produktionskørsler; den eksakte rodhåndbog er dermed bevist omfattet af docs-only-skip. Den seneste push-produktion er fortsat den fuldt grønne `32654119745`.
- I den produktionsverificerede 4.0.265-baseline er kun versionsfeltet løftet i de to geodatafiler. Geometri og land-/vandpunkter er uændrede.
- **Tidligere produktionsverificeret 4.0.263:** DEC-0062 retter profilgatens referencescope. Memory-/warmup-aktivering bedømmes ved den nærmeste fælles aktuelle scoretid pr. zone; senere prognosegaps må ikke retroaktivt slå den aktuelle Candidate G fra.
- PR #100/exact-head `32642456123`, merge `586fbd18` og produktion `32642532892` beviser DEC-0061's cadence. Live `rr-20260823134605-210` fortsatte 673/673 states uden replaymismatch og gav 110 positive mod 563 fysisk fortsat nul, men 4.0.262 valgte legacy, fordi den for brede gate også inspicerede senere prognoser.
- Pre-public opvarmning var kun gyldig ved aktuel `WINDOW_INCOMPLETE`. I 4.0.263 gav `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` og `WINDOW_HAS_TIME_GAP` global rollback. Denne historiske offentlige adfærd er erstattet af DEC-0072's lokale utilgængelighed.
- Hele femdøgnets Candidate G-scorecoverage kræves fortsat. PR #101/exact-head `32644701811`, merge `9f5953f6`, fuld produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og browserkontrol er grønne. Candidate G er aktiv på 210/673 med 139 positive og 534 aktuelt fysiske nultransporter; replay- og visningsfejl er 0.
- Ejeren besluttede i DEC-0060 at aktivere Candidate G allerede under den første, ikke-offentlige opvarmning. 4.0.261 brugte `RESEARCH-3` med `20/50/30` og bevarede dengang `25/40/35` som global rollback. DEC-0072 har siden fjernet den offentlige rollback.
- Den ufuldstændige, men sammenhængende transporthukommelse blev vist ærligt som `candidate-active-pre-public-warmup`; den måtte ikke kaldes et 48-timersbevis. DEC-0072 erstatter kun fejlhåndteringen: et lokalt hul skjuler nu den konkrete score uden at skifte resten af landet til legacy.
- Profilvalget hydreres og skrives tilbage som det centrale admin-dokument `ravscore-profile-selection`. PR #97 aktiverede modellen; PR #98 lukkede den daværende shadowkontrakt; PR #99 registrerede den grønne browserkontrol. Disse gates fangede ikke cadencefejlen ovenfor og kan derfor ikke længere stå alene som scorebevis.
- Den gældende helhedsmodel er `RESEARCH-3`: `20/50/30`, DEC-0054's vindstyrede waders-jagtbarhed, DEC-0055's strømstyrede transport og DEC-0056's ene bølgeenergistyrede mobiliseringstilstand.
- Mobilisering bruger højde² × periode med fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ingen mobiliseringspoint.
- PR #92/exact-head `32628441062`, merge `c5898ce8`, produktion `32628516066` og live `rr-20260823083627-210` er grønne for 210/673/1.346 og browser 420/2.100/673. Statealderen er 9/9 timer uden nulstilling; det er ikke et 48-timersbevis.
- Den tidligere score-neutrale Candidate G-shadow lå væsentligt lavere end legacy, fordi den ubundne start 0 fortsat dominerede efter 65–117 timers historik. Ejeren afviste en vilkårlig startprior og valgte DEC-0059's faste 48-timers evidensvindue. State schema 2 genafspiller afledt kystnormal strøm fra samme rand og markerer missing/tidsgab. DEC-0060 erstattede kun kravet om komplet memory før den første pre-public aktivering; mekanikken er valideret med simulation og historisk replay, og der kræves ikke en ny 48-timers realtidsudviklingstest. Opret ikke en parallel model, og tillad aldrig automatisk aktivering.

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

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Under udvikling køres målrettede tests. Den fulde validate:source skal bestå på PR'ens eksakte head i GitHub; den gentages kun lokalt ved bred risiko, manglende CI eller konkret fejlevidens.
- Push og manuelle produktionsbyg kører fortsat den tidlige kildekodegate. Planlagte vejropdateringer på samme allerede kontrollerede main-kode springer kun denne gentagelse over.
- validate:source er aldrig en erstatning for den fulde npm run validate og npm run release:gate, som fortsat skal køre efter central hydrering og frisk vejr før ethvert deploybart artifact.
- Fuld browserkontrol er hændelsesstyret: ugentligt eller ved ændret UI, score eller offentlig datakontrakt. Se DEC-0045.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
