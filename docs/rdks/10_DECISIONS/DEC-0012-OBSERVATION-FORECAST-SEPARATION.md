# DEC-0012 – Observation og prognose må ikke forveksles

- **Status:** AKTIV / IMPLEMENTERET

Aktuel måling, modelprognose og cache er forskellige datatyper. UI og diagnostik skal vise, hvilken der bruges. En station kan være tavs i observationsfeedet, men stadig have gyldig prognosecache. Observationer kan bruges til aktuel visning og bias-/kvalitetskontrol uden at skabe uærlige kildeskift.

## Implementeret i 4.0.54
Stationsregistret gemmer separat observationsstatus, prognosecache-status, cacheudløb og samlet anvendelighed. Gyldig cache kan holde en station anvendelig, selv når en ny observation midlertidigt mangler.
