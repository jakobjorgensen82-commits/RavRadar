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

Den målrettede lokale producer-/provenance-/rollover-/active-candidate-/workflow-/downstream-/atomic-/history-matrix, `py_compile`, YAML-/JSON-parse, RDKS/security samt releaseversion/geodata er grøn. GitHub-run `33986893042` nåede alle underliggende kode- og kontrakttests, men releasegaten fejlede alene, fordi denne rootfil manglede. Changelog/status-only-opfølgningscommitten er lokalt målvalideret. Ejeren har 2026-09-05 eksplicit beordret admin-merge uden at afvente en ny exact-head. 4.0.324 får derfor ikke et grønt exact-head-bevis og må ikke kaldes exact-head-grøn. Merge, active-bootstrap/runtime, fuld produktionsgate og komplet 210/673/118 er fortsat åbne.
