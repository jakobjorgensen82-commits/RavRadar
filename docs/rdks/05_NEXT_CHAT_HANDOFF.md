# RavRadar – aktuel overlevering til Codex

## Kritisk aktuelt checkpoint — 4.0.206 produktions- og privatverificeret

- 4.0.206 på commit `4dc464a` er produktionsverificeret i #31831068809. Progressiv DMI-cache, frisk vejr, fulde gates, Supabase og Pages bestod; live Pages viser 210 zoner inklusive `DK-B04-12`–`DK-B04-14`.
- Privat #31829349458 bestod hele den friske nationale kilde-, geometri-, navn-, land-/vand-, DMI-, vejr-, state-, vind-, shadow-, review-, slutkyst-, central rollback- og fallbackkæde samt begge artifacts.
- Den rettede fallback har 17 dele, 11 verificerede, fire sikkert vendte og to fail-closed, med 2/2 ejerskabsflytninger, 9/9 erstatninger og nul overlap.
- Ingen privat geometri blev aktiveret. Kun en særskilt ejerbeslutning kan starte aktivering; den offentlige produktionsverificerede geometri forbliver baseline indtil da.

## Kritisk aktuelt checkpoint — 4.0.205

- Offentlig 4.0.204 er produktionsverificeret i #31815039302 og er urørt baseline.
- Privat #31815423082 bestod national kilde, geometri, 835 dele, land-/vandbeviser, DMI, state, vind, shadow-score og score-neutralt review. Den stoppede kun ved første centrale læsning af `direction-reviews` med HTTP 401 / `PGRST303`.
- Supabase-loggen beviser korrekt `sb_secret_`-nøglefingeraftryk og senere succes med samme nøgle. 4.0.205 genprøver kun den eksakte gatewayfejl én gang og stopper ellers fail-closed.
- Målrettet CI skal først genbruge det kompakte artifact fra #31815423082 til roundtrip/rollback uden DMI eller deploy. Derefter følger normal produktionskørsel og en ny fuld privat national slutkørsel.
- Privat geometri eller score må ikke aktiveres uden særskilt ejerbeslutning.

## Kritisk aktuelt checkpoint — 4.0.202

- Offentlig 4.0.201 er produktionsverificeret i #31801993662 med frisk DMI, fuld validering, releasegate, Supabase og Pages.
- Privat #31802022918 bestod 27 nationale kyst-, navn- og punkttrin, men den første native DMI-gate ramte det historiske standardbudget under `dkss_lf` efter 11,1 minutter. #31798588868 havde bestået samme 835-dels gate på 8,5 minutter.
- 4.0.202 giver foreløbig, endelig og fallback-baseret national DMI-gate det eksisterende private 3.000-sekunders kvalitetsbudget. Datakrav og offentlig runtime ændres ikke.
- Ny privat kørsel skal stadig bevise reviewrettelsen og hele slutkæden. Den private kandidat må ikke aktiveres automatisk.

## Kritisk aktuelt checkpoint — 4.0.201

- Offentlig 4.0.200 er produktionsverificeret i #31798575274 med frisk DMI, fuld validering, releasegate, Supabase og Pages.
- Privat #31798588868 bestod den foreløbige 835-dels punkt-, DMI-, vejr-, state-, vind- og shadow-kæde og stoppede kun på en historisk fast 783-reviewkontrol.
- 4.0.201 afleder review og central admin-roundtrip af den allerede validerede delbestand med streng 1:1-kontrol. Ny privat slutkørsel skal stadig bevise endelige 121 rettelser, slut-DMI, slut-shadow-score og rollback.
- Den private kandidat ændrer ikke automatisk offentlig geometri, admin-sandhed eller RavScore.

De ældre checkpoints nedenfor bevares som historik og er ikke aktuel status.

## Kritisk aktuelt checkpoint — 4.0.181

4.0.180 havde en alvorlig offentlig kortregression: 605 interne kystberegningsdele blev tegnet som selvstændige zoner. Det skabte 2.488 linjekomponenter, sorte endemarkeringer langs hele kysten og meget langsom indlæsning. Ejerens præcisering er bindende: De gamle hovedzoner skal fortsat være de synlige zoner; lokale dele bruges kun internt til forskellige retninger, lokale serier og scorevalg.

4.0.181 ændrer kun projektionen i kortet. De 605 beregningsdele bevares. #2279 (`31505747519`) bestod frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy. Offentlig browserkontrol viste version 4.0.181, 208 centralt aktive hovedzoner og præcis 416 endemarkeringer. Kendte gode ravstrande, som muligvis mangler intern beregningsdækning, skal auditeres separat uden automatisk sletning eller opdigtet geometri.

**Opdateret:** 2026-08-11
**Aktuel appversion:** 4.0.170 (national privat kæde CI-verificeret; afventer manuel ejerreview)
**Senest produktionsverificerede main:** 4.0.169 i #31448257626 på `f4d93ee`
**Produktion:** #31448257626 bestod frisk DMI/provenance, fuld validate, release-gate, Supabase-sync, Pages-artifact og deploy. Privat #31448258035 bestod 774 vindserier, 752 shadow-scorer, score-neutral 783-dels reviewside og central admin-roundtrip/rollback.

## Start ikke med at kode
Læs først `docs/ai/CODEX_START_HERE.md`, `AGENTS.md`, Current Truth, Implementation Status, Active Requirements, Known Issues og de relevante beslutninger. Denne fil er et øjebliksbillede, ikke en erstatning for RDKS.

## Det som er bevist ved overgangen
- #1845 på `76c7c23` er produktionsverificeret: frisk DMI-kørsel, begge fulde gates, artifact og Pages-deploy bestod. Det offentlige datasæt `rr-20260808124116-208` har 208/208 zoner med 118 timers sammenhængende vind.
- Repositoryets eneste aktive egen workflowfil er `.github/workflows/update-and-deploy.yml`. De historiske `schedule-test.yml` og `pages-microtest.yml` blev fjernet i 4.0.121 efter kontrol mod test, release og recovery; `pages-build-deployment` er GitHub-administreret.
- 4.0.117 ligger på `main` og er deployet efter grønne efterfølgende produktionskørsler.
- Schedulerens dækning bruger aktive zoner, og `wind`-familien er konsistent.
- DKSS recovery kan prioritere model efter konkrete geografiske marine datagab.
- DMI current-U/V parres kun ved fælles fysisk gridpunkt; 4.0.117 isolerer desuden kandidater pr. vertikallag, så et dybt lag ikke kan overskrive et andet lag før U/V-parring. Parsergenerationen er 11.
- Administratorens gemte zonegeometri er central runtime-sandhed. Tre Limfjordszoner blev korrigeret i admin; #1750 viste, at ændringerne blev synkroniseret og anvendt i den friske pipeline.
- Den offentlige pipeline/deploykæde kan gennemføre succesfuldt på denne baseline.

## Vigtig læring fra 4.0.117-forløbet
Fejlen må ikke forstås som én enkelt scheduler- eller radiusfejl. Forløbet viste flere lag: schedulerprioritet, kandidatlogik, vertikallagsparring og faktisk forkert zonegeometri. Fremover skal hele kæden undersøges, før rodårsagen erklæres. Lokal grøn validering må ikke omtales som stabil produktionsbaseline uden frisk CI/produktionsbevis.

## Åbne opgaver med høj prioritet
1. Følg Supabase-egress gennem næste billingperiode. Central audit/migration er gennemført: databasen er 24 MB, alle 14 aktuelle `admin_documents` er intakte, maskinhistorik er 0, og øvrig historik er bounded til 100 pr. dokument.
1. Bevar de ni ikke-entydige normalsider fail-closed til manuel review; DMI gav to gyldige sider og kan derfor ikke afgøre dem.
2. Lad Jakob gennemgå den downloadede private reviewside med 783 dele, især de 22 deldækkede og ni blokerede.
3. Registrér Jakobs rettelser og go/no-go; aktivér ikke automatisk.
4. Bevar opdelingen, navnene, punkterne, state og shadow-score read-only, indtil ejerreviewet og en særskilt go/no-go er gennemført.
5. Bevar den eksisterende zoneserie og RavScore som runtime-sandhed, indtil hele den nationale kæde og rollback er verificeret.

## Ting der ikke må ændres som genvej
- DMI er autoritativ datakilde.
- Manglende data er ikke nul.
- Ingen stale-data-genindførelse for at få grønne tests.
- Ingen generelle regionale strømbånd som score/fallback.
- Ingen hardcoding af adminredigerbare zonenavne, antal, koordinater eller retninger.
- Adminændringer skal propagere gennem produktionskæden uden kodeændring pr. zone.
- Den historiske state-model er score-neutral, indtil den er fagligt og produktionsmæssigt valideret.

## Dokumentationspakke til Codex
- `docs/ai/CODEX_START_HERE.md`
- `docs/ai/AI_KNOWLEDGE_BASE.md`
- `docs/ai/AI_ARCHITECTURE_MAP.md`
- `docs/ai/AI_WORKING_RULES.md`
- `docs/ai/AI_ROADMAP.md`
- `docs/rdks/70_CHAT_IMPORT/CHAT-0014.md` + normaliseret tekst fra den sidste pre-Codex-samtale

## Før næste release
Codex skal vise diff, køre relevante målrettede tests og den fulde releasevalidering, opdatere RDKS/håndbog/changelog og derefter bruge GitHub Actions/produktion som ekstern verifikation. Hvis en ændring rører DMI, Supabase eller genereret runtime, er lokal test alene ikke nok.

## Første Codex-opgave – må ikke omprioriteres
Den aktuelle workflowimplementering kan give et grønt automatisk run og deploy, selv om de to fulde releasegates er `skipped`. #1760 demonstrerer dette konkret. Codex skal som første kodeopgave lukke dette bypass direkte i repoet, køre lokal fuld validering, committe/pushe og derefter følge en frisk GitHub-kørsel. Baseline må først kaldes stabil, når begge gate-trin faktisk står `success`.

Denne handoff-pakke ændrer **ikke** selve workflowbetingelserne. Det er en bevidst, kortvarig bootstrapbeslutning for at få al dokumentation ind før Codex overtager.

## Seneste centrale adminændringer
Efter #1758 blev fire ekstra zoner rettet manuelt, fordi geometrien var åbenlyst forkert: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** og **Aalborg øst og Nørresundby**. #1760 blev kørt efter disse rettelser. Codex må ikke genskabe gamle koordinater eller hardcode dem i tests; den aktuelle centrale admin-geometri er autoritativ.
