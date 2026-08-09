# RavRadar 4.0.145

## Kompakt national QA-artifact
- Bevarer det fulde private GeoDanmark-råartifact som reproducerbart kildebevis.
- Uploader plan, kildemanifest, 208-zone-QA og QA-geometri i et separat kompakt privat artifact.
- Gør efterfølgende topologi- og konfliktanalyse mulig uden gentagen download af den 413 MB store råpakke.
- Ændrer ikke aktiv geometri, admin-data, vejr, state, offentlig UI eller RavScore.

## Evidens
- 4.0.144 blev produktionsverificeret i #2028 med fuld Linux-validate, releasegate, artifacts og Pages-deploy.
- Privat #2029 bestod 208-zonehydrering, den autoritative central-hydrerede plan med 100 fliser/700 requests, kildevalidator, rumlig QA og råupload; hentningen tog cirka 5:15 og hele jobbet 7:45. 101/707 var repositorybaselinen før central hydration.
- #2033 verificerede både råartifact og det kompakte 6,8 MB QA-artifact; #2032 bestod normal produktion med fulde gates og deploy.
