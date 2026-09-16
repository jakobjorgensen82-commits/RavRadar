# RavRadar 4.0.384

## Rettet

- Den allerede offentlige og fuldt verificerede 4.0.383-side kan registreres
  centralt uden at bygge eller deploye den igen.
- Den historiske maintenance-plan bruger nu centralens aktive
  implementation-closure som kilde. Den forveksles ikke længere med en ældre
  offentlig forgængers closure.
- Private-runtime-roden oprettes før restoreforsøg, så et manglende bibliotek
  ikke bruger alle retries på den samme lokale bookkeepingfejl.

## Sikker genoptagelse

- Engangsworkflowet accepterer kun den eksakte centrale ACTIVE version 1 og de
  fastlåste source- og targetartifacts fra run `34877443841` og `35034589754`.
- Artifact-id, digest, størrelse, run, head, manifest, binding, readiness,
  audit, Pages-seal og profil kontrolleres. Den levende 4.0.383-side verificeres
  frisk som 210 zoner/673 kystdele uden private payloadlæsninger.
- Centralen flyttes atomisk direkte fra ACTIVE version 1 til ACTIVE version 2.
  Ingen mellemtilstand PENDING og ingen ny offentlig eller privat deploy.

## Uændret produkt

- Der ændres ingen RavScore-formel, scoredata, vejrdata, modelstate, geometri
  eller land-/vandpunkter.
- Genoptagelsen kører ingen sourcegate, DMI, Copernicus, Open-Meteo, oneoff,
  private-runtimebygning, Edge-deploy eller Pages-deploy.
- Efter central aktivering følger én normal tidsbegrænset weather-kørsel for
  numeriske scorer, rotation og cachevedligeholdelse. Ingen oneoff.
