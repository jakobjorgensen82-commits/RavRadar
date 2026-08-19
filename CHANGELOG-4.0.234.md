# RavRadar 4.0.234

## GitHub-ejet 15-minuttersproduktion

- Flytter den normale tidsplan fra cron-job.org til GitHub Actions ved UTC-minut 14, 29, 44 og 59.
- Flytter den private Copernicus-pilot til minut 6, før første produktion efter timeskiftet.
- Tilføjer en lille readiness-gate, som ved en manglende eksakt aktuel Copernicus-time udsætter den planlagte produktion uden nyt vejr, Supabase eller Pages. Heartbeatet bestiller timen, og næste 15-minutterskørsel prøver igen.
- Under overgangen bruger almindelige ikke-tvungne `workflow_dispatch`-kald fra cron-job.org samme readiness-gate. Dermed udsættes et hel-timeskald sikkert, mens en bevidst manuel `force=true`-release fortsat går gennem hele den fail-closed kæde.
- Push og manuel release er fortsat fail-closed. Fuld validering, releasegate og præcis 673/673 kan ikke springes over.
- cron-job.org skal først deaktiveres efter et naturligt GitHub-schedule-bevis på `main`.

## Supabase-timeout fjernes ved rodårsagen

- Den fulde `runtime-diagnostics` gemmes under samme beskyttede dokumentnøgle som et tabsfrit gzip/base64-arkiv med SHA-256 og begge byteantal.
- Adminoversigtens små felter forbliver direkte læsbare. Ved download verificerer browseren format, størrelser, SHA-256, version og genereringstid, før den komplette oprindelige JSON frigives.
- Ældre ukomprimerede dokumenter er fortsat kompatible.
- Den lokale repræsentative payload falder fra 4.014.169 til 208.874 byte, cirka 95 % mindre. Ingen zonedata eller diagnostikfelter kasseres.
- Den snævre én-gangs genprøvning af eksakt HTTP 500/PostgreSQL `57014` bevares; gentagne eller andre fejl stopper fortsat release fail-closed.

## Uændret

- Ingen land-/vandpunkter, central geometri, U/V-værdier, scorevægte, pile, dybdelag eller kilder ændres.
- Kildeordenen og den dynamiske 100 %-gate er uændrede, aktuelt præcis 673/673.
- Den åbne browser-P1 om at føre samme lokale del og tidspunkt gennem hele zonepanelet er ikke løst af denne driftsrelease.

## Centralt produktionsbevis

- Commit `7409d461` og pushrun `#32237507059`/`#3202` bestod frisk central geometri, fuld validering, releasegate, præcis 673/673, Supabase-sync på otte sekunder, Pages-artifact og deploy.
- Live version 4.0.234/datasæt `rr-20260819093242-210` er direkte metadata-verificeret med 210 zoner, 673/673, `controlled-live`, `credentialsIncluded=false` og 168 timers historikretention.
- Eksterne gentagelser `#3203` og `#3204` bestod også. cron-job.org forbliver aktivt, indtil et naturligt `schedule`-event for produktionsworkflowet er observeret og verificeret.
- Overgangscommit `4ab7a659` udvidede timegaten til almindelige ikke-tvungne dispatches. Pushrun `#32242510084`/`#3207` og de eksterne gentagelser `#3208`/`#3209` bestod hele kæden.
- Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` startede 2026-08-19T10:53:50Z, cirka ti minutter forsinket fra 10:44-planpunktet, og bestod current-hour-gate, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Overdragelsesgaten er dermed opfyldt, og ejeren er bedt om at deaktivere RavRadar-jobbene i cron-job.org.
