# DEC-0259 – ekstern firetimersplan for normal vejrhentning

**Dato:** 2026-09-28
**Status:** Besluttet af ejeren; lokal 4.0.506 og deaktiveret ekstern konfiguration, livebevis afventer

Efter at den første 4.0.505-GitHub-`schedule` ved 00:17 UTC ikke havde
oprettet et run kl. 00:29 UTC, påpegede ejeren, at den uafhængige
cron-job.org-plan slet ikke var konfigureret. Direkte aflæsning viste
0 aktive og 1 deaktiveret RavRadar-job: id `8348098` pegede stadig på
den pensionerede Copernicus-watchdog og havde den gamle kvartersplan.
Dette er en konkret konfigurationsfejl i overdragelsen. Én manglende
GitHub-start beviser ikke alene, om GitHubs event var droppet eller
forsinket. Ejeren besluttede herefter at fjerne GitHubs native
vejrcron og lade cron-job.org eje firetimerskadencen.

Den eksisterende eksterne post genbruges; der oprettes ikke en
dublet. Den er gemt **deaktiveret** med UTC `19 */4 * * *`, POST til
`watch-missed-weather-schedule.yml/dispatches` på `main` og kun
`external_watchdog=true`. De øvrige eksisterende HTTP-indstillinger
bevares; svarkrop gemmes ikke. Jobbet må først aktiveres efter sikker
exact-head-kontrol, merge og én kontrolleret no-overlap-test.
Den gamle 15-/45-minutters-Copernicus-watchdog forbliver deaktiveret.

Det nye GitHub-workflow har **ingen** `schedule`; et almindeligt
`workflow_dispatch` uden eksplicit eksternt intent er kun tør
inspektion. Ved eksplicit intent må det i de første 1–90 minutter
efter UTC-slot 00:17, 04:17 osv. bestille højst én normal
`run-current-weather-once.yml`-kørsel med fulde leverandørbudgetter,
først efter to friske GitHub-API-kontroller
af begge produktionsindgange. En aktiv/ventende kørsel, en kørsel
startet i samme slot giver no-op. En afsluttet kørsel fra forrige slot
spærrer ikke, heller ikke hvis den sluttede efter slotgrænsen.
Ugyldig/manglende historik eller API-fejl giver rødt
vagtrun uden produktionsdispatch. Produktionsworkflowets fælles
concurrency og alle cache-, datatabs-, artifact- og releasegates består.

En fejl i **forrige** firetimersslot spærrer ikke automatisk næste
ordinære slot efter ejerens udtrykkelige præcisering. En kørsel, der
allerede startede og fejlede **i samme** slot, må derimod ikke
genstartes af vagten. Reelle fejl skal stadig rapporteres og
undersøges; en datatabs-/sikkerhedsgate må aldrig omgås.

Ekstern timing fjerner afhængigheden af GitHubs `schedule`-events,
men ikke af GitHubs API/Actions, cron-job.org eller leverandørerne.
Aktivering er ikke bevis for faktisk levering. Kræv HTTP 204 for
eksternt kald, synligt GitHub-vagtrun, korrekt dispatch/no-op,
efterfølgende normalrun og mindst flere ordinære slot uden overlap.
Budgetter og R2-/Supabase-Free-forbrug måles fortsat. Dette erstatter
DEC-0258's GitHub-planlagte 90-minuttersvagt og DEC-0257's
GitHub-ejede udløser, men ikke deres firetimersrotation og datakrav.
