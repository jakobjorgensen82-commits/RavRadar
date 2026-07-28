# RavRadar 4.0.6 – Data provenance og admin-datakvalitet

- Gemmer komponentvis datakilde for vind, bølger, strøm, vandstand og vandtemperatur.
- Blandede DMI/fallback-zoner markeres som `mixed` i stedet for fejlagtigt som ren DMI.
- Tilføjer `data/live/ravradar-runtime-diagnostics.json` med samlet health, dækning, friskhed, rate limits, dubletter og zoneeksempler.
- Admin viser komplet DMI-dækning, komponentdækning, faktiske kilder, datatider og komponentvis kilde pr. zone.
- Admin kan downloade den aktuelle runtime-diagnostik og conditions-fil direkte.
- Datakvalitet advarer nu om lav strøm-/vandstandsdækning, manglende observationer, HTTP 429, tidsdubletter og ukendte GRIB-parametre.
- Tomme repository-runtimefiler markeres som skabeloner for at undgå forveksling med deployede data.
