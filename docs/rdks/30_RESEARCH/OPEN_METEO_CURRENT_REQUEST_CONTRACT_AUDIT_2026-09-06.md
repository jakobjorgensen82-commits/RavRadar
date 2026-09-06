# Open-Meteo current request-kontrakt – live audit 2026-09-06

## Formål

Afgrænset kontrol af næste realistiske fejlflader før 4.0.327-gaten. Ingen RavRadar-punkter, private payloads, U/V-værdier eller kildedata er medtaget; live-proberne brugte syntetiske generiske havpositioner.

## Autoritativ reference

- Open-Meteo Marine Weather API: https://open-meteo.com/en/docs/marine-weather-api
- Dokumentationen angiver wind_speed_unit=ms, start_hour/end_hour, comma-separerede multilocations, cell_selection=sea, ocean-current-hastighed og retning mod strømretningen.

## Livefund

- velocity_unit=ms blev accepteret, men ignoreret; responseenheden var km/h.
- wind_speed_unit=ms gav m/s; retningen var grader, timezone GMT og UTC-offset 0.
- Et eksakt start_hour..end_hour-vindue returnerede 118 timer med korrekt første og sidste time.
- En syntetisk batch på 50 lokationer returnerede 50 payloads med én time og korrekt enhed.

## Konklusion

Requestparameteren og eksplicit responseenhedsvalidering skal rettes i samme release som modelrun-rolloverfejlen. Der blev ikke fundet en yderligere deterministisk fejl i modelnavn, tidsvindue, multi-location-kardinalitet eller batchstørrelse. Faktisk dækning, afstand, nuller, rate limits og leverandørtilgængelighed kræver fortsat frisk main-oneoff og kan ikke erstattes af syntetiske prober.
