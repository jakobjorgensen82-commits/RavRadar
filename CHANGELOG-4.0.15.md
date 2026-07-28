# RavRadar 4.0.15 – Pipeline Completion & Faster GRIB Extraction

## Rettelser

- Rettet bulkjobbets slutfejl, hvor en ikke-defineret variabel `selected` kunne få en ellers checkpointet DMI-kørsel til at ende med exit code 2.
- GitHub Step Summary er nu fejl-isoleret og kan ikke længere vælte selve datapipelinen.
- Planlagte collections rapporteres fra den faktiske `scheduled`-liste.

## Ydelse og datakvalitet

- DMI GRIB-værdier hentes nu i batch med ét `codes_get_elements`-kald pr. relevant GRIB-meddelelse i stedet for ét kald pr. zone.
- De fire nærmeste kandidater pr. zone bevares, og første gyldige havværdi vælges fortsat.
- Gridkandidater genbruges inden for kørslen for samme modelgrid.
- Parser- og gridversion er hævet, så eksisterende trin genbehandles med den nye udtræksmetode.
- Diagnostikken tæller nu `batchedGridReads`.

## Løbende flytning af land- og havpunkter

- Behandlingssignaturen indeholder fortsat SHA-256-hash af hele `data/zones.geojson`.
- Enhver ændring af dataPoint, zonegeometri eller øvrige zoneegenskaber ændrer signaturen og invaliderer tidligere behandlede trin.
- Brugeren kan derfor fortsætte med at flytte punkter løbende uden at gamle gridopslag låses fast.
