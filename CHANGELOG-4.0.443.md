# 4.0.443 – konsolider soft-boundary før Copernicus-gate

## Ændret

- Når den bounded Copernicus-wrapper modtager den kontrollerede exit-kode
  `75`, starter den nu en særskilt `--checkpoint-only`-genindgang uden
  baseline-genvejen.
- Genindgangen genafspiller kun allerede fsync'ede segmentkvitteringer og
  skriver bank, shadow og `IN_PROGRESS`-source-stage atomisk, før den næste
  kildekontrol ser resultatet.
- Den eksisterende hard-timeout recovery med dokumenteret, uændret baseline
  er bevaret. Refresh-only har fortsat ingen ekstra recovery.
- Der er ikke ændret providerprioritet, scorelogik, geometri eller reglerne
  for gyldige data og gamle værdier.

## Live-fund, som rettelsen dækker

Normalrun `35489667755` gennemførte DMI og gemte DMI-GRIB-cache samt krypteret
privat vejrfremskridt. Copernicus hentede 11 shardfremskridt og nåede
`6990/49548` operationelle DMI-gap-par i sin afgrænsede passage. Wrapperen
stoppede kontrolleret, men den efterfølgende source-stage-kontrol fandt ikke
et genbrugeligt resultat, fordi kvitteringerne ikke var samlet før kontrollen.
Open-Meteo, score, artifact og deploy blev derfor ikke kørt. Datasættet var
ikke komplet.

## Verifikation

Den målrettede bounded-retry-regression beviser den nye soft-boundary-
recovery. Source-stage-, journal-, workflow- og releasekontroller skal bestå
på exact head i GitHub, før næste almindelige continuation bruges som
produktionsbevis. Ingen ny one-off er nødvendig for denne kodeændring.
