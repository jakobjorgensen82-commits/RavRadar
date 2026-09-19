# DEC-0209 – Gemt vejr fortsætter diagnostisk, og HARMONIE får reel arbejdstid

**Status:** Aktiv; lokal 4.0.429, produktionsbevis afventer
**Dato:** 2026-09-19

## Problem

4.0.428 bestod exact-head `35416314162`, blev merged gennem PR #373 som main
`a2d03d95` og kørte normal weather i `35416641052`. Alle providerled og deres
caches blev gennemført og gemt. Kørslen stoppede sent, fordi den beskyttede
readiness stadig beskrev 4.0.427. Den efterfølgende providerfrie fortsættelse
`35419876748` gendannede den gemte runtime og genbyggede den offentlige pakke,
men krævede fejlagtigt et historisk source-repair-id for at fortsætte med den
samme diagnostiske runtimeaudit, som normal maintenance allerede må rapportere
uden at stoppe et sikkert deploy.

DMI-beviset viste desuden, at 4.0.428 nåede HARMONIE-kataloget og valgte ét
eksakt H0-asset, men ikke behandlede filen. Katalogprefetch brugte ca. 268
sekunder. Med 779 sekunders arbejdsbudget og 512 sekunders reserveret til de
ventende WAM-/DKSS-familier var der derefter ikke den krævede sikre tid til at
starte HARMONIE. Identitetsrapporten anvendte samtidig en marine-only parser på
HARMONIE og markerede derfor den ellers kanoniske STAC-fil forkert som
`UNPARSEABLE_SELECTED_STAC_ASSET`.

## Beslutning

- Providerfri saved-weather-fortsættelse følger samme diagnostiske kontrakt
  som almindelig integrated maintenance: runtimefund gemmes og rapporteres,
  mens rollbackstatus, privat runtime, privacy, artifact, main/target, Pages og
  offentlig verifikation fortsat er hårde krav.
- Den historiske code-only source-repair beholder sit strengere krav om eksakt
  kendt repair-id og byte-identiske audits. Reglerne blandes ikke sammen.
- HARMONIE får sin egen tilladte, kanoniske STAC-identitet med samme krav til
  run, valid time, item-id, assethash, størrelse og revision som de øvrige
  officielle assets. Den eksakte identitet bindes også til cache-resume.
- Det normale DMI-budget hæves fra 900 til 1.500 sekunder. Den eksisterende
  afslutningsreserve, asset-watchdog, ét-H0-asset-loft og de 512 sekunders
  observerede WAM-/DKSS-reserver svækkes ikke. Formålet er at give plads til
  HARMONIE før de reserverede marine forsøg, ikke at lade vind fortrænge strøm
  eller bølger.
- Ingen RavScore-formel, geometri, land-/vandpunkt, providerprioritet eller
  acceptgrænse ændres.

## Komplethed og næste bevis

Run `35416641052` er ikke et komplet databevis. Før Copernicus manglede 1.769
af 79.414 par, den aktuelle scoreinputtrace havde nul H0-vindtupler, 420
aktuelle modes var utilgængelige, og Feggesund havde 198 direkte samt 156
manglende bølgedeltimer. Det er åbne P0-datamangler, ikke acceptabel drift.

Efter exact-head og merge fortsættes først den allerede gemte 02:00-pakke
providerfrit. Derefter skal én almindelig weather bevise et faktisk HARMONIE-
assetforsøg, gyldig H0-vind, marine fremgang, Pages og samlet restdækning.
`MISSING` holder kun resten af siden brugbar; fuld gyldig dækning er målet.
