# RavRadar 4.0.403

## Rettet

- Synkronisering af beskyttede adminaktiver bruger nu den delte kanoniske
  stableJsonDigest, så en reel readbackforskel stadig stopper, mens et gyldigt
  aktiveringsdokument ikke længere rammer en udefineret funktion.
- Regressionen beviser både nøgleordensuafhængighed og opdagelse af ændret
  indhold.

## Levering uden gentaget vejrindsamling

- Normalrun 35205052150 havde allerede gennemført provider-, cache-, closure-,
  historik-, runtimeaudit- og 52+3-led og gemt den validerede private runtime
  for 2026-09-17T09:00:00Z, før adminsynkroniseringen stoppede.
- Det eksisterende providerfrie reparationsworkflow har nu en særskilt
  saved-weather-continuation. Den kræver en strengt nyere og højst 240
  minutter gammel runtime, source ancestry, aktiv integreret model, tomt
  repair-id, 210 zoner, 673 kystdele, uændret geometri og grøn privacy.
- Fortsættelsen bruger normal Pages-freshness, artifactlukning og deploy.
  Den kalder ingen vejrprovider og starter ingen oneoff.

## Uændret

- RavScore-formel, vægte, vejrdata, providerprioritet, kystgeometri og
  land-/vandpunkter er uændrede.
- Standardens almindelige code-only-rute er uændret.

