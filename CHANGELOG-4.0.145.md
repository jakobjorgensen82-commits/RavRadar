# RavRadar 4.0.145

## Kompakt national QA-artifact
- Bevarer det fulde private GeoDanmark-råartifact som reproducerbart kildebevis.
- Uploader plan, kildemanifest, 208-zone-QA og QA-geometri i et separat kompakt privat artifact.
- Gør efterfølgende topologi- og konfliktanalyse mulig uden gentagen download af den 413 MB store råpakke.
- Ændrer ikke aktiv geometri, admin-data, vejr, state, offentlig UI eller RavScore.

## Evidens
- 4.0.144 blev produktionsverificeret i #2028 med fuld Linux-validate, releasegate, artifacts og Pages-deploy.
- Privat #2029 bestod 208-zonehydrering, 101 fliser/707 requests, kildevalidator, rumlig QA og råupload; hentningen tog cirka 5:15 og hele jobbet 7:45.
- 4.0.145 afventer lokal gate, commit/push, privat kompakt artifactaudit og normal produktionskæde.
