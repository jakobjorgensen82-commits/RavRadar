# RavRadar DMI baseline 4.0.3

> **Historisk baseline:** Dette dokument beskriver 4.0.3 og må ikke læses som den aktuelle driftskontrakt. Den gældende DMI-first-, provenance-, grid-, checkpoint- og 118-timerskontrakt står i `docs/Weather-Pipeline.md`, aktiv RDKS og producent-/forbrugermatrixen. Fremtidige ændringer skal stadig regressionssammenlignes med denne baseline, men gamle budgetter eller API-former må ikke genindføres som nutidig sandhed.

## Dataflow

1. `scripts/hydrate-deployed-weather.py` henter senest deployede livefiler.
2. `scripts/update-dmi-bulk.py` læser forecast-step GRIB-filer fra DMI STAC og skriver `data/live/dmi-bulk-cache.json`.
3. `scripts/update-weather.mjs` sammenfletter bulkdata, den vedvarende cache og fallbackdata.
4. Den vedvarende DMI-cache skrives til `data/live/dmi-forecast-cache.json`.
5. Den offentlige centrale vejrfil skrives til `data/live/conditions.json`.
6. Hele `data/live/` kopieres med til GitHub Pages-artifaktet.

## Kendte tekniske krav i 4.0.3 (historisk)

- Python 3.12 i GitHub Actions.
- ecCodes API skal indeholde `codes_get_elements`, `codes_grib_find_nearest`, `codes_grib_new_from_file` og `codes_release`.
- `scripts/smoke-test-eccodes.py` skal bestå før bulkjobbet starter.
- Bulkjobbet bruger checkpointing efter hvert forecast-step.
- GitHub Actions arbejdsbudget: 480 sekunder med 120 sekunders afslutningsreserve.
- Downloadcache: `.cache/dmi-grib` via `actions/cache`.

## Datakvalitetsregler i 4.0.3

- Et forecast-array må højst have 120 unikke tidsstempler.
- Dublerede tidsstempler samles felt for felt.
- Hver forecastpost beholder sit beregnede måltidspunkt; nærmeste kildetrin må ikke ændre tidsstemplet.
- En kildemåling må kun bruges inden for 90 minutters tolerance.
- Sidste kendte modeltrin må ikke gentages kunstigt resten af prognosen.
- Dækning måles på unikke gyldige tidsstempler, ikke rå arraylængde.
- Cachen rapporterer zonedækning særskilt for vind, bølger, strøm, vandstand og komplette zoner.

## Live-stier

- `/data/live/dmi-bulk-cache.json`
- `/data/live/dmi-forecast-cache.json`
- `/data/live/conditions.json`
- `/data/live/weather-health.json`

## Validering

Før release skal mindst disse bestå:

- `npm run test:dmi-forecast-store`
- `npm run test:dmi-bulk`
- `npm run validate:data`
- `npm run validate`
