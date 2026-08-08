# RavRadar 4.0.125

## DMI-proveniens pr. komponenttime
- Gemmer collection, model-run og native gyldighedstid ved STAC/GRIB-indlæsningen.
- Fører lead time, prognosealder, temporal opløsning og native kildetider gennem timeinterpolation og komponentmerge.
- Afviser interpolation mellem forskellige modelkørsler.
- Bevarer pre-v14-cache uden opdigtet identitet under den progressive migration; blanding af identificerede og uidentificerede trin afvises.
- Bevarer DMI-vandstandsproveniens gennem kontinuitetsreparationen.
- Udvider implementeringsauditten til schema 4 med kontrol af alle proveniensfelter.

RavScore, fallbackprioritet, viste værdier og den slanke offentlige runtime er ikke bevidst ændret. Frisk produktion skal verificere cachegenopbygning, proveniens og uændret dækning.
