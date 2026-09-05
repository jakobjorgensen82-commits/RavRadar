# RavRadar 4.0.324 – sikker active/candidate-cache gennem hele prognosevinduet

Dato: 2026-09-05

## Rettet

- Både normal vejrdrift og 118-timers-oneoff materialiserer seneste strict READY-active som donor, mens alt nyt DMI-arbejde fortsætter i den samme serialiserede `dmi-zone-candidate-v1`-familie. Normal drift er updateren; oneoffen accelererer kun samme kandidat.
- Hver normal kørsel genbruger kompatible gyldige data og scanner hele target..+117 for interne huller, ugyldige eller udløbne trin og den rullende hale. Tre DKSS-collections kan behandles pr. normal kørsel.
- Ikke-annulleret partial kandidat gemmes før terminalbeslutningen. Active og deploykæden må først fortsætte efter producer-success, allowlistet status, `DMI_READY`, strict current-anchor, `candidate_promoted=true` og eksakt registrybevis.
- En partial kandidat må fastholde sit native run over et seks timers modelskift, men kun med mindst den krævede modne/komplette fremtidshorisont, normalt 96 timer, og et katalog der ikke er dokumenteret stale. Manglende eller READY kandidat vælger nyeste komplette run; retention kan ikke pinne et run til cirka +120 timers alder.

## Uændret

- DMI-history er normalt 60 timer og mindst 54 timer, rå zonehistorik mindst 72 timer, Copernicus-retention 168 timer, og mobilisering/transport kan fortsat bruge op til 48 timers verificeret historik. Missing syntetiseres ikke.
- Providerordenen er fortsat DMI → Baltic → AMM15 → policybundet regional DMI → Open-Meteo.
- Ekstern cron/watchdog, GitHubs reserveschedules og fælles production-concurrency er uændrede. Der indføres ingen parallel writer eller ny kadence.

## Evidensstatus

Den målrettede lokale matrix er grøn. Run `33986893042` nåede alle underliggende kode- og kontrakttests, men releasegaten fejlede alene, fordi denne rootfil manglede. Ejeren beordrede derefter et admin-bypass efter risikoforklaring, men Codex-sikkerhedslaget afviste handlingen, så ingen bypass eller merge skete. Run `33988058582` bestod releasegaten, men stoppede senere alene på manglende paritet mellem kildehåndbogen og Supabase-installationskopien. Den officielle synk retter én genereret SQL-payloadlinje; ny exact-head, merge, runtime, fuld produktionsgate og komplet 210/673/118 afventer.
