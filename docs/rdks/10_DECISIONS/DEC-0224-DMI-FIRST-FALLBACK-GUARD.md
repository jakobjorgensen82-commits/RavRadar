# DEC-0224 – DMI-first fallback må ikke hente igen uden et reelt hul

**Status:** Aktiv fra 4.0.446
**Dato:** 2026-09-20
**Område:** normal vejrkørsel, DMI-cache, fallback, Open-Meteo

## Beslutning

Den almindelige public conditions-bygning må kun kalde den per-zone fallback,
når DMI-cacheposten faktisk mangler den fallback-egnede atmosfæredækning
(vind/bølger og den krævede horisont). En gyldig DMI-cache må ikke udløse en
ny Open-Meteo-hentning blot fordi et DMI-only-felt som vandstand eller en
verificeret DMI-strøm er lokalt manglende.

Copernicus- og Open-Meteo-providerkæden foran `update-weather` har allerede
ansvaret for at fylde konkrete residualer. DMI beholder førsteprioritet:
fallback må kun udfylde et faktisk hul og må aldrig overskrive en gyldig DMI-
komponent. Lokalt `MISSING` er fortsat ærligt og tæller ikke som komplet data.

## Live evidens og rodårsag

Run `35506992220` på main `203fbf36` gennemførte DMI, Copernicus, Open-Meteo
og DMI-first closure, men `npm run update:weather` ramte sin 25-minutters
arbejdsgrænse. Den gamle kode kaldte `fallbackForZone` fra den sunde
DMI-cachegren for hver zone, så normalrunnet gentog Open-Meteo-hentninger efter
providerkæden. Runnet nåede derfor ikke cache, score-state, artifact eller
deploy. Der er ikke evidens for tab af den gemte providerfremgang.

## Afgrænsning

Beslutningen ændrer ikke DMI's rotation, HARMONIE/DKSS-semantik,
Copernicus-rangekontrol, strømproveniens, vandstandens DMI-only-regel,
scoreformlen eller komplethedskravet. Den reducerer kun unødvendige gentagne
fallbackkald, når DMI allerede har den relevante atmosfæredækning.

## Kontrol

`scripts/test-dmi-first-fallback-guard.mjs` dækker både sund DMI-cache og en
ufuldstændig DMI-cache. De eksisterende Open-Meteo- og DMI-bulkregressioner
skal fortsat være grønne.
