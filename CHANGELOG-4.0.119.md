# RavRadar 4.0.119

## DKSS-vindhale
- Produktionsrun #1828 afslørede, at DKSS V-vind med lokalt parameter-id 34 blev fejlmærket som `sst` af generiske ecCodes-metadata og derfor forkastet.
- DMI's lokale DKSS-id'er er nu autoritative foran generiske parameteraliaser.
- Parsergeneration 13 og parameterkort 4 tvinger genbehandling af tidligere GRIB-assets.
- Schedulerens DKSS-plads følger manglende komplet U/V-vindhale pr. zones valgte marinecollection, så IDW, NSBS og LF kan rotere over successive runs.

## Sikkerhed og status
- RavScore, HARMONIE/DKSS-modelgrænsen og null-reglerne er uændrede.
- Regressionstests reproducerer både id 34-konflikten og schedulerrotation med 208 aktive zoner.
- Lokal RDKS-, versions-, modul- og releasevalidering består. Frisk CI/DMI-produktion skal fortsat bevise faktisk dækning, gates og deploy.
