# DEC-0107 – ekstern vagthund mod total GitHub-schedulerstilhed

**Status:** Aktiv og produktions-/driftsverificeret i 4.0.309
**Dato:** 2026-08-29
**Modelpåvirkning:** Ingen

**Senere præcisering:** DEC-0108 sænker fra 4.0.310 kun det eksplicitte eksterne intents dobbelte stilhedsgrænse til mere end 15 minutter. GitHubs interne schedule-vagt beholder 45 minutter; øvrige sikkerheds-, privacy-, concurrency- og releasekrav nedenfor består.

## Evidens

RavRadars tre native GitHub-planer var aktive på `main`, repositoryet var hverken arkiveret eller deaktiveret, og en manuel ikke-tvungen produktion på samme `main`-head gennemførte hele den friske gate-, artifact- og Pages-kæde. Alligevel udeblev de forventede schedule-events på tværs af normal produktion, Copernicus-pilot og cachebevaring.

I de seneste 40 registrerede schedule-produktioner var forskydningen inden for kvartersfasen median 6,7 minutter og 95-percentil 13,6 minutter. Når et event først var oprettet, var den målte runner-køtid praktisk talt nul. Vellykkede produktioner tog median 8,2 minutter og 95-percentil 20,5 minutter. Det afgrænser fejlen til leveringen af schedule-events frem for repositoryets triggerdefinition eller en optaget runner. GitHub dokumenterer selv, at schedule-events kan forsinkes og under høj belastning droppes.

Det eksisterende 45-minutters watchdog ligger i et workflow, som selv startes af GitHubs scheduler. Det kan derfor genstarte en tavs produktionsworkflow, men ikke opdage total stilhed i hele GitHubs schedule-levering. Ejeren har nu besluttet at lukke netop dette eksterne hul.

## Beslutning

1. GitHub Actions beholder normal 15-minuttersproduktion ved UTC-minut `14,29,44,59`, Copernicus-pilot ved minut `06` og intern cache-/watchdogplan ved `07,17,27,37,47,57`.
2. Der oprettes præcis ét eksternt cron-job ved UTC-minut `04,19,34,49`. UTC er bindende, så dansk sommertid ikke forskyder det i forhold til GitHub.
3. Det eksterne job må kun dispatch'e `preserve-copernicus-current-shadow.yml` på `main` med det eksplicitte boolske input `external_watchdog=true`. Det må ikke dispatch'e produktion, pilot, force-build eller geometri-/modelarbejde direkte.
4. En almindelig manuel dispatch uden input forbliver ren cacheinspektion. Produktions-watchdoget må kun køre for et native `schedule`-event eller det eksplicitte eksterne input.
5. Den eksisterende 45-minutters dobbeltkontrol bevares: ingen produktion dispatch'es ved aktiv eller nylig kørsel eller ved et friskt offentligt manifest. Kun samtidig gammel workflowhistorik, gammelt manifest og fravær af aktiv produktion må udløse én normal `force=false`-produktion.
6. Den fælles `private-copernicus-current-pilot`-concurrency serialiserer interne og eksterne vagthundskørsler. Den eksisterende `ravradar-weather-production`-concurrency bevarer højst ét tungt build.
7. Det eksterne kald indeholder kun repository, workflow, `ref=main` og det boolske intent. Ingen vejrpayload, koordinater, rå U/V, credentials fra RavRadar, private data eller modelstate forlader GitHub. GitHub-tokenet begrænses til RavRadar og `Actions: write`; cron-job.org må ikke gemme response-body.
8. Aktivering kræver først exact-head og merge, derefter én deaktiveret test med forventet HTTP 204 og dokumenteret no-op ved frisk produktion, og til sidst mindst to automatiske 15-minutterskald. Der må ikke oprettes flere RavRadar-job i cron-job.org.

## Aktiveringsbevis

PR #221 bestod exact-head `33244011544` på `6046e8a3f0eae43ed25126c5290e42c58d675c81`, blev merged som `aba3d669876efa515829e57871a4e8bc100c9de8`, og post-merge-produktion `33244062982` frigav det komplette offentlige datasæt `rr-20260829085521-210` gennem fuld validering, releasegate og Pages.

Der findes præcis ét aktivt RavRadar-job i cron-job.org, id `8348098`. Den deaktiverede manuelle test gav HTTP 204 og GitHub-run `33244853536`; efter aktivering gav de første automatiske kald kl. 09:19 og 09:34 UTC også HTTP 204 og runs `33245204517`/`33245798817`. Alle tre vagtkørsler bestod, og produktionsdispatch blev korrekt sprunget over ved frisk offentlig produktion.

Der fandtes ikke en ny native produktions-`schedule` omkring 09:29 UTC. Ved det andet automatiske kald var det offentlige manifest cirka 39 minutter gammelt og dermed under 45-minuttersgrænsen. Det dokumenterer både det fortsatte native leveringshul og den valgte vagts sikre no-op-adfærd; et sprunget dispatch må ikke fortolkes som bevis for, at GitHub-scheduleren netop har kørt.

## Tidsvirkning

Den eksterne vagthund undersøger stilhed hvert kvarter. Når den seneste af workflowhistorik og offentligt manifest passerer 45 minutter, bestilles en redningsproduktion normalt inden for yderligere 0–15 minutter. Det er et sikkerhedsnet mod total stilhed, ikke et løfte om et færdigt nyt artifact præcis hvert kvarter.

## Grænser

Candidate G, RavScore, scorevægte/-kurver, bølge-/strøm-/mobiliserings-/leveringssemantik, DMI/Copernicus-scoreinput, state/cache/recovery, modelprofilvalg, geometri og land-/vandpunkter er uændrede. Releaseversionens eksisterende profilbindingsmarkører følger fortsat appversionen mekanisk uden at ændre valgt profil eller modelbeslutning.

DEC-0107 erstatter alene DEC-0085 punkt 9's tidligere fravalg af ekstern cron. DEC-0085's 45-minuttersgrænse, dobbelte friskhedskrav, retry, concurrency og fail-closed Candidate G-kæde består.
