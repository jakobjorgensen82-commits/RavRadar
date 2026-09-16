# DEC-0168 – Tidsbegrænset Open-Meteo roterer retfærdigt gennem restkøen

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.386, exact-head og livebevis afventer
**Dato:** 2026-09-16

## Evidens

4.0.385 løste den private restorefejl i levende drift. Normalrun
`35043360563` gendannede cacherne og reducerede reelle mangler fra 59.382 til
33.383. Det næste almindelige run `35046314979` gendannede samme fremgang,
men Open-Meteo tilføjede kun 244 par og sluttede med 33.412 reelle mangler.
Begge providerpassager ramte deres begrænsede køretid.

Koden dannede hver gang den samme sorterede restkø og begyndte ved første
batch. Svære, negative eller tomme svar tidligt i køen kunne derfor bruge
køretiden igen, mens senere batches aldrig blev besøgt. Cachen virkede; den
manglende fremgang var en planlægningsfejl i den tidsbegrænsede kø.

## Beslutning

- De stabile batches dannes først efter den eksisterende deterministiske sortering.
- Kun produktionslignende kritisk restfyldning får et cyklisk startpunkt beregnet af UTC-time, kvarter og `GITHUB_RUN_ATTEMPT`.
- Hele batches flyttes; deres indhold, providerforespørgsler og acceptregler ændres ikke.
- Genopfriskning med bevaret inputrækkefølge forbliver ældst-først.
- Providerbevis, negative observationer og cachedata må ikke genbruges som scheduler-cursor.
- Sikre diagnostikker må kun vise numerisk rotationspunkt og boolesk rotationsstatus, ikke del-id'er, koordinater eller rå vektorer.
- Nul-missing-gaten forbliver hård. Rotation er fremdrift, ikke en tilladelse til at deploye ufuldstændige data.
- Livebeviset udføres med én almindelig `force=false`-kørsel efter merge. Ingen oneoff.

## Afgrænsning

RavScore, DMI- og Copernicus-logik, providerprioritet, cacheformat, geometri,
offentlig datakontrakt og releasekrav ændres ikke. Scheduler holdes pauset,
mens den kendte køfejl rettes, og genaktiveres efter sikker merge.
