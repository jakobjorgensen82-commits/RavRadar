# RavRadar 4.0.124 – maskinlæsbar femdøgnsaudit

- De fem tidligere DKSS-vindhalehuller er produktionsverificeret lukket efter bredere gridkandidatsøgning og to centrale adminrettelser.
- Implementeringsauditten måler nu komplette timeintervaller separat for vind, bølger, strøm, vandstand og vandtemperatur.
- Rapporten skelner mellem DMI-, fallback- og manglende timer, samler sammenhængende kildeintervaller og viser kildeskift pr. zone.
- DMI-timer auditeres for collection, model-run, lead time og prognosealder; manglende metadata rapporteres eksplicit.
- Ingen forecastværdi, fallbackregel, RavScore eller skyggetilstand er ændret.
