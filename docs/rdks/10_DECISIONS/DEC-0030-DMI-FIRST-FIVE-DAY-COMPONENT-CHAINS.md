# DEC-0030 – DMI-first femdøgnskæder pr. komponent

**Status:** AKTIV / analyse før implementering  
**Dato:** 2026-08-08

## Beslutning
RavRadars produktmål er en dokumenteret, reel og brugbar prognose gennem cirka 120 timer for hver komponent, der bruges i femdøgnsvisningen eller RavScore. DMI er primær kilde så langt, som en frisk og fagligt egnet DMI-kilde faktisk leverer. En anden DMI-kilde undersøges som forlængelse før ekstern fallback. Ekstern fallback må kun udfylde den manglende hale efter sidste valide DMI-time og må ikke erstatte fungerende DMI-data i den tidligere del af serien.

Kildekæden fastlægges separat for vind, bølger, strøm, vandstand, vandtemperatur og øvrige aktive komponenter. De må have forskellige skiftetider og fallbackkilder. Hvis cirka 120 timer ikke kan leveres forsvarligt, forbliver resten `missing`, og begrænsningen dokumenteres i diagnostik, UI og scorefortolkning.

## Obligatorisk analyse før kodeændring
For hver komponent kortlægges nuværende DMI-produkt, faktisk native og resterende horisont ved hentning, runfrekvens, alternative DMI-produkter, licens/teknisk anvendelighed, opløsning/kvalitet, samlet mulig DMI-horisont, manglende hale og den bedst dokumenterede hale-fallback. Eksisterende Open-Meteo-brug er en kandidat, ikke en automatisk beslutning.

## Sammensyningskontrakt
- UTC er kanonisk, og forecasttider må ikke mangle, dubleres eller være ikke-monotone.
- Missing må aldrig blive fysisk nul, stale værdi eller gentaget sidste DMI-værdi.
- Retningskonventioner, enheder, tidsopløsning og modelovergange valideres pr. komponent.
- Hver forecasttime bevarer kilde, model/run, lead time, prognosealder og status som native, interpoleret eller fallback.
- Harmonisering må kun ske med en fagligt begrundet, testbar metode; værdier ændres ikke blot for at skjule et spring.
- Automatisk diagnostik skal vise den faktiske kæde, eksempelvis `vind: DMI 0–59 h, fallback 60–119 h`.

## RavScore og usikkerhed
Analysen skal måle, om kilde-, opløsnings- og usikkerhedsskift ændrer betydningen af vind, strøm, bølger, vandstand, transportstate eller samlet RavScore. Senere timer må ikke fremstilles som lige så sikre som tidlige timer uden evidens. Denne beslutning giver ikke mandat til at ændre RavScore eller produktionsfallback før analysen, et særskilt design og regressionstest er godkendt.

## Prioritet og stopregel
Opgaven er P1. Den igangværende HARMONIE/cache-stabilisering og dens produktionsbevis afsluttes eller afgrænses først. Derefter udføres kilde- og runtimekortlægning før implementering. Opgaven ligger før den bredere P3 RavScore-forskningsrunde, fordi en kendt datakæde er en forudsætning for modelvalideringen.
