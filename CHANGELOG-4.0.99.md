# RavRadar 4.0.99 – sandfærdig DMI-stationsstatus

## Rodårsag
Den fælles OceanObs-hentning forespurgte kun parameteren `sealev_ln`, selv om stationsregistret også indeholder stationer med `sealev_dvr` og `sea_reg`. Samtidig blev en observationskørsel registreret som succes, selv når ingen gyldige stationsmålinger blev hentet. Det kunne få senere kørsler til at springe observationer over og få admin, routing og cache til at vise stationerne som ikke-leverende.

## Rettelse
- Henter seneste-times vandstand for `sealev_ln`, `sealev_dvr` og `sea_reg` og fletter seneste gyldige måling pr. station.
- Registrerer kun observationssucces, når mindst én gyldig stationsmåling er modtaget.
- Bruger antal friske målinger, ikke antal stationer i registret, som succesbevis.
- En netværks-/API-fejl tæller ikke som en manglende leveringskørsel for alle stationer.
- Stationscache beregnes også direkte fra stationens seneste reelle observation plus den konfigurerede cacheperiode.
- Eksponerer resultat og fejl pr. OceanObs-parameter i diagnostikken.
- Tilføjer regressionstest for hele sandhedskæden.

## Bevidst urørt
DMI STAC/GRIB-modelprognoser, RavScore, offentligt kort, service worker og den kanoniske strømvektorkæde er ikke ændret.
