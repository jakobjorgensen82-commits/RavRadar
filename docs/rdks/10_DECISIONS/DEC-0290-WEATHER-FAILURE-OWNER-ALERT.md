# DEC-0290 – Ejeralarm for en afsluttet fejlet vejrhentning

**Status:** DELVIST IMPLEMENTERET – oprindelig alarm leveret; botens afslutningshandoff er kun lokal og ikke leveret.
**Dato:** 2026-10-04

## Tillæg8.oktober kl.00.47 — botens normale fejlkørsel mangler faktisk alarm

En fuldt pagineret, skrivefri kontrol viser fire afsluttede fejlede almindelige
kørsler den7.oktober uden tilsvarende alarmrun eller ejer-issue. Alle fire er
bot-startede og består den normale, uændrede scope-/statusklassifikation.
Den menneskestartede fejl6.oktober gav faktisk issue med ejertildeling.
Alarmworkflowet er aktivt. GitHubs dokumenterede begrænsning af events skabt
med GITHUB_TOKEN er en sandsynlig forklaring på forskellen; metadata er ikke
en uafhængig leverandørtrace for en undertrykt completion-event.

Kun lokal rettelse: Den normale run-current-kalder sender højst ét eksplicit
workflow_dispatch til den eksisterende alarm efter botens fejlede
terminal-outcome. Kaldet har kun actions-write, fast main/repository og
præcis run/attempt; det ændrer ikke vejr, data, gates eller deploy.
Uklart dispatch-resultat gentages ikke. Alarmens uændrede timinuttersjob
observerer højst12 metadatareads med11 femsekunderspauser, validerer scope
og attempt ved hver observation og kræver faktisk completed failure før
normal deduplikering, main/run-genlæsning og højst én issue-write.
Completion-eventet bevares for både mennesker og bot. Den eksisterende
alarmkø serialiserer event og eksplicit kald, og den eksisterende søgning
efter en markeret ejer-issue deduplikerer dem. En allerede fungerende
alarmvej må ikke fjernes. Ingen nye credentials,
planer, services eller cadence. Ingen mail til hjemmesidens brugere.

Tre nye mål var først røde, før rettelsen. De og den øvrige eksisterende
berørte måltest består efter rettelsen; den faktiske normale CLI består
otte egne syntetiske offlineforløb. De omfatter bevaret bot-event og
deduplikering mod en allerede gemt ejer-issue. Workflow-YAML er parset, og normale
workflow-/sikkerhedskontroller består. Det er ikke live dispatch, gemt issue,
modtaget mail eller fuld selvdriftsverifikation. Startup/runner-tab, hvor
kalderens sidste job ikke kører, andre indgange og virkelig driftskontrol
er fortsat åbne. Egen exact-head-CI og sikker levering afventer; ingen
merge eller produktionsændring under aktiv writer. Assistentovergangen
forbliver i bero. Den separate PR534-testrettelse er ikke denne kandidat.

Primær kilde til hændelsesreglen og den eksplicitte dispatch-undtagelse:
[GitHub: triggering a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
Detaljerede metadata, testreceipts og aktuelle writers gemmes kun privat.

## Ejerbeslutning

Ejeren bestiller en GitHub-fejlalarm efter den manglende mail om den afsluttede
04:34-vejrhentning. Repositoryet skal forblive offentligt. Efter afklaringen
accepterer ejeren en issue med kun kørselens link og status, tildelt hans
eksisterende GitHub-konto. Den må ikke vises som driftsalarm på ravradar.dk
eller sende mail til hjemmesidens brugere. GitHub-issuen er offentlig;
privat issue i det offentlige repository er ikke lovet eller muliggjort.

## Afgrænset implementation

Et separat workflow lytter på completion af `Run current RavRadar weather once`
på main. Det bruger alene den betroede default-branch-kode og eksisterende
GITHUB_TOKEN med contents/actions read og issues write. Det henter kun
repository-, run-, assignee- og issue-metadata. Ingen logs, artifacts, vejr,
cache, secrets, eksterne mailtjenester eller ændrede kontorettigheder.

Kun afsluttet failure/timed_out/startup_failure fra den præcise almindelige
indgang i samme repository på main accepteres. Andre workflows, forks,
ændret runidentitet/attempt, branch eller ukendt URL afvises eller springes
ærligt over. Det er ikke dækning af alle historiske produktionsindgange,
kode-only deploys eller audits. Et allerede igangværende run genkøres ikke.

Link og status bygges fra fast allowlist; API-titel, actor, fejltekst og
privat payload må aldrig interpoleres. Én markeret issue pr. run søges i
alle tilstande, også closed, og skal være tildelt ejeren. Alarmens egen
concurrency serialiseres uden cancel og er adskilt fra produktionswriteren.
Pagination har en hard grænse; ufuldstændig inventory giver ingen write.
Main og run genlæses før højst ét create-kald, og gemt assignment genlæses.
Ukendt create-resultat eller fejlet readback giver ingen automatisk gentagelse.
Det er ikke et matematisk exactly-once-bevis under ukendt netværksudfald.

En manuelt godkendt backfill vælger kun et eksakt afsluttet run-id gennem
samme kontrol og ændrer aldrig vejret. Den gamle 04:34-fejl kan kontrolleres
sådan efter sikker merge; der er endnu ikke oprettet en issue.

## Evidens og mangler

Den eksisterende kadencetest beholder sine gamle assertions og har syv nye
network-free testparents: scope/privacy, deduplication, stale attempt,
run/main-race, bounded inventory, unknown create/readback og workflowgrænser.
7 PASS / 0 FAIL / 0 SKIP, 121.7663 ms. Ingen live issue eller mail er sendt.
En verificeret issue med assignment er ikke bevis for modtaget mail.
Ejerens mail for assignment er tidligere aflæst aktiv uden ændring;
faktisk modtagelse skal stadig bekræftes af ejeren.

Ingen produktversion, score, geometri, provider, ordinary-workflow, SQL-install,
offentlig fejlbesked eller deploy. Under aktiv vejrhentning må main ikke ændres.
Source-CI og ROOT-proof skal være friske på eksakt PR-head før merge.

## Primære referencekilder

- [GitHub workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [GitHub concurrency og queue](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

Lyngby/Fur og den samlede vejrhentningsrevision er fortsat særskilte åbne
produktfejl; en fungerende alarm løser dem ikke. Se DEC-0289.
