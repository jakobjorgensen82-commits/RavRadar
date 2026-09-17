# DEC-0180 – Offentlig audit skelner afrunding og lokal deldækning

**Status:** Aktiv og bindende; implementeret og måltestet i 4.0.398,
livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.397 blev leveret som main
`f3a200ff4d4a2bc0ce0aec36c841f6e3972b28a9` efter sourcegate
`35167221199` og providerfri deploy `35167698742`. Normalrun `35168055561`
gennemførte DMI, Copernicus og Open-Meteo, gemte providercacher og byggede
118 timers prognoser for 210 zoner og 673 kystdele. Det offentlige deploy
blev stoppet af 86 del- og 1.250 zoneformelfejl samt én profilfejl.

Der var to fejl i auditten, ikke i RavScore eller de byggede prognoser:

1. Producenten afrunder tre bidrag og råsummen hver for sig til seks
   decimaler. De fire selvstændige afrundinger kan derfor give op til
   `2e-6` forskel mellem summen af de publicerede bidrag og den publicerede
   råsum.
2. `modelCoverageReady` beskriver alle 673 kystdele, mens zonens
   tilgængelighed beskriver, om mindst én gyldig kystdel kan give en score.
   En fler-delszone kan derfor være brugbar, selv om én lokal del mangler.

## Beslutning

Auditten accepterer højst den matematisk mulige `2e-6`-forskel mellem de
tre publicerede bidrag og den separat publicerede råsum. En større forskel
afvises fortsat. DEC-0179's kontrol af heltalsafrunding mod råsummens smalle
mulige fuldpræcisionsinterval består.

Auditten skal uafhængigt genberegne og sammenligne profilens dæknings-,
hukommelses-, migrations- og advisories-felter. Fuld deldækning må aldrig
sameksistere med en utilgængelig zonescore. Det omvendte krav gælder ikke:
ufuldstændig deldækning må godt sameksistere med en brugbar delvis zone.

Fejlene skal rapporteres med konkrete koder for dækning, hukommelse,
migration, advisories og historiesammendrag, så et samlet produktionsrun
viser den reelle fejlklasse i stedet for én uklar profilfejl.

## Afgrænsning

Beslutningen ændrer ikke scoremodel, vægte, vejr, providerprioritet,
geometri, offentlig score eller UI. Den lemper ikke modelbinding,
dataintegritet, migration, historiespor eller kravet om ærlig lokal missing.
Kun auditens to forkerte sammenligninger rettes.

## Bevis

Den målrettede regression indeholder både den maksimalt mulige
`2e-6`-afvigelse og en umulig `3e-6`-afvigelse. Den indeholder desuden en
fler-delszone, hvor én del mangler gyldigt input, men den anden del giver en
gyldig delvis zonescore. Releaseversion, RDKS, håndbog, modulversioner og
rene geodataversionsfelter er valideret. Exact-head, merge og levende normal
weather afventer.
