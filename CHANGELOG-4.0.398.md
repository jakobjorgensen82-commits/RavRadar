# RavRadar 4.0.398

## Offentlig audit følger den reelle publiceringspræcision

Normalrun `35168055561` gennemførte DMI, Copernicus og Open-Meteo, gemte
providercacher og byggede 118 timers prognoser for 210 zoner og 673
kystdele. Pages blev ikke opdateret, fordi den efterfølgende audit havde to
forkerte antagelser.

Tre scorebidrag og deres rå sum publiceres hver for sig med seks decimaler.
Deres selvstændige afrundinger kan give højst `2e-6` forskel mellem summen af
bidragene og råsummen. Auditgrænsen følger nu denne præcise matematik. En
forskel på `3e-6` afvises fortsat.

Auditten skelner også mellem fuld dækning af alle 673 kystdele og en brugbar
zonescore. En fler-delszone kan have en gyldig delvis score, selv om én del
mangler. Profilens dækning, hukommelse, migration, advarsler og
historiesammendrag kontrolleres fortsat uafhængigt og rapporteres nu med
konkrete fejlkoder.

Rettelsen ændrer ikke RavScore, vægte, vejrdata, providerprioritet,
geometri, modelbinding eller den score, brugeren ser.

## Verifikation

- 210/673-audit og datasikre negative fixtures er grønne.
- Maksimal gyldig `2e-6`-afrundingsforskel accepteres.
- Umulig `3e-6`-forskel afvises.
- En fler-delszone med én lokal manglende del og én gyldig del accepteres som
  brugbar delvis zone.

Se DEC-0180.
