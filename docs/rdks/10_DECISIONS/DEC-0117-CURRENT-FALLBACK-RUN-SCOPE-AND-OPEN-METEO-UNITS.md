# DEC-0117 – Currentfallback bindes til valgt modelrun og verificeret SI-enhed

- **Status:** Bindende, lokalt implementeret og måltestet; exact-head- og runtimebevis afventer
- **Besluttet:** 2026-09-06
- **Ejerkrav:** Undersøg hele Open-Meteo-vejen før næste gate, bevar eksisterende cache og saml deterministiske fejl i én sikker rettelse.

## Problem

Den regionale shadow beholder bevidst 168 timers prøver. Efter 4.0.326 blev en gammel asset-hashkonflikt korrekt ignoreret, men den samme gamle prøve kunne stadig stoppe tidligere på native-cadencekontrollen, fordi run-afgrænsningen lå efter denne kontrol.

Open-Meteo-requesten sendte 'velocity_unit=ms'. Det officielle Marine API ignorerede parameteren og svarede i standarden km/t, mens RavRadar behandlede værdien som m/s. Det var en fail-open enhedsfejl, selv om resten af recordkontrakten var korrekt.

## Beslutning

1. En regional shadowprøves collection samt kanoniske modelRun/validTime og kausale rækkefølge valideres først.
2. Hvis modelrunnet ikke findes i den aktuelle strict-ledgers valgte dkss_lf-runs, er prøven alene bevaret historik. Den sorteres fra før cadence-, asset-, spatial- og vektorkontrol og kan hverken levere data eller blokere næste fallback.
3. Hvis modelrunnet er valgt af ledgeren, består alle eksisterende fail-closed kontroller uændret. Same-run cadence- eller assetfejl må ikke skjules som rollover.
4. Open-Meteo kaldes med 'wind_speed_unit=ms'. Hvert payload skal eksplicit attestere UTC offset 0, timezone GMT, ocean_current_velocity i m/s og ocean_current_direction i grader. Manglende eller anden enhed stopper før recordbygning.
5. Normal og oneoff bruger fortsat samme kode. Ingen cache, model, geometri, historik, kildeprioritet, budget eller scheduler ændres af beslutningen.

## Bevis

- Generiske live-prober mod Open-Meteos officielle Marine API bekræftede, at den gamle parameter gav km/t, mens 'wind_speed_unit=ms' gav m/s.
- Samme API accepterede den eksisterende meteofrance_currents-model, cell_selection=sea, et eksakt 118-timersvindue og en 50-punktsbatch.
- Måltests kræver nu, at gammel ikke-valgt cadence ikke blokerer, at same-run cadence fortsat er fatal, at requesten bruger den korrekte parameter, og at km/t afvises.

## Åbent

Exact-head, merge og frisk main-oneoff skal fortsat bevise faktisk leverandørdækning, afstande, nuller og komplet 79.414/79.414 closure. Leverandørudfald og faktiske mangler kan ikke garanteres væk; de må fortsat stoppe før artifact.
