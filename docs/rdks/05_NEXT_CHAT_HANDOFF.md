# RavRadar – aktuel overlevering til Codex

**Opdateret:** 2026-08-09
**Aktuel appversion:** 4.0.152 (privat national lokalitetsopdeling; afventer CI)
**Senest verificerede main:** 4.0.151 på `6259514`
**Produktion:** #2054 bestod frisk DMI/provenance, fuld validate, release-gate, Supabase-sync, Pages-artifact og deploy. Privat #2055 bestod navneauditen for 755/755 dele. 4.0.152's lokale evidens giver 56 forslag fra de 28 grove dele uden runtimeaktivering.

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
1. CI-verificer 4.0.152's 56 lokale forslag og artifactsummer.
2. Review den ene lokale del uden officielt kystanker og beslut alle lokale navne revisionsbart; kandidatlisten må ikke automatisk omdøbe.
3. Bevar opdelingen read-only, indtil navn, punkter og lokal vejreksponering er valideret.
4. Byg derefter lokale land-/vandpunkter, native DMI-grid/provenance og isoleret state/shadow-score før UI/admin og national aktivering.
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
