# DEC-0167 – Normal weather opretter og gendanner privat runtime før providers

**Status:** Gennemført; merged i 4.0.385 og livebevist i normalrun 35043360563 og 35046314979
**Dato:** 2026-09-16

## Evidens

Efter gennemført central version 2-recovery blev almindelig standard-weather
35041008201 startet på main 2628ddefa547191c678f88ba9791b2cd867ea3e4.
Runnet stoppede efter 29 sekunder før DMI, Copernicus, Open-Meteo,
produktionswrites og deploy med fejlen:

Protected private production runtime failed closed: Private runtime root or repository root is invalid

Repositoryroden fandtes. Workflowet oprettede først den private runtime-rod
senere ved bundleproduktion, men protected restore krævede den tidligere. Den
senere Open-Meteo-slutgate kørte med always() og testede et skipped trin; det
var en følgefejl, ikke et nyt datahul.

## Beslutning

- Normal weather opretter den private runtime-rod umiddelbart før protected restore.
- Restore bruger højst tre korte forsøg. Bundlekandidaten fjernes mellem forsøg, så delvise downloads ikke genbruges.
- Ved vedvarende restorefejl stopper runnet fortsat før providers og writes.
- Open-Meteo-residualgaten kører kun efter et verificeret weatherhandoff eller et faktisk startet Open-Meteo-trin.
- Efter faktisk provider/handoff kræver gaten fortsat succes, skrevet checkpoint og præcis nul manglende par.
- Livebeviset kommer fra én almindelig tidsbegrænset standard-weather. Ingen oneoff og ingen ny cutover.

## Afgrænsning

RavScore-formel, modelbinding, geometri, providerprioritet, rotation,
cacheformat og offentlig datakontrakt ændres ikke. Rettelsen åbner kun den
allerede besluttede normale vedligeholdelsesvej og fjerner én umulig
følgeklassifikation.

## Liveudfald

Begge normale runs gendannede de beskyttede cacher, nåede providers og gemte
fremgang. De stoppede senere korrekt på reelle Open-Meteo-huller. Den
efterfølgende, selvstændige køplanlægningsfejl behandles i DEC-0168.
