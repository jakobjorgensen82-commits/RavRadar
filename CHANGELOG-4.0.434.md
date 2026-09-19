# RavRadar 4.0.434 – pensioneret checkpoint må ikke blokere integreret drift

## Faktisk produktionsfund

- 4.0.433 bestod exact-head-kildegaten `35451524450`, blev merged via PR
  #378 som `b6afcdca` og startet providerfrit i `35451791985`.
- Kørselen passerede den tidligere auditblokering med præcis det kendte
  sekskodesæt. Den hentede ingen DMI-, Copernicus- eller Open-Meteo-data.
- Den stoppede derefter, fordi workflowet forsøgte at bygge et Candidate G-
  rollbackcheckpoint, selv om auditten korrekt klassificerede Candidate G som
  `BUILDING_MEASURED_ONLY`. Checkpointbyggeren kræver en komplet Candidate G-
  companion og kunne derfor ikke fortsætte.

## Rettelse

- Både providerfri code-only og almindelig weather følger igen DEC-0114:
  measured warmup giver den hashbundne disposition
  `NOT_APPLICABLE_DURING_MEASURED_WARMUP` med `checkpointRequired=false`.
- Checkpoint-build, cache-save og beskyttet checkpoint-publish springes da
  eksplicit over. De eksisterende Pages-, reentry- og slutstatuskontroller
  kræver alle tre trin som `skipped`; et tilfældigt manglende udfald accepteres
  ikke.
- Et strengt checkpoint bygges fortsat kun, når auditten faktisk siger
  `READY`. Ukendt rollbackstatus eller inkonsistent aktiveringsflag stopper.
- Den private produktionsruntime publiceres fortsat gennem sin egne
  hash-, privacy-, generations- og readbackgates og bevarer både integreret
  state, fuld conditions-pakke og de private vejrcacher.

## Omfang og næste bevis

Rettelsen ændrer ingen vejrdata, scoreformel, geometri, kildeprioritet eller
modelbundle. Den lukker samme blokering i både den aktuelle kodelevering og
fremtidige normale vejrkørsler. Næste er én exact-head-kildegate, merge og en
providerfri code-only-genkørsel. Først når koden er online, køres almindelig
weather for at hente lokal vind til de 673 kystdele og bevise score.
