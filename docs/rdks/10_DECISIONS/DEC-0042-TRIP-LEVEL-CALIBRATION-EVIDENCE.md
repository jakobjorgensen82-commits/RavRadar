# DEC-0042: Tripniveau er kalibreringsenheden

**Status:** Gældende
**Dato:** 2026-08-21

## Beslutning

RavScore må ikke kalibreres på enkeltfund eller fundmængde alene. En komplet søgetur med både udfald og dokumenteret indsats er den mindste gyldige kalibreringsenhed.

En fremtidig kvalificeret observation skal mindst knyttes til faktisk lokal kystdel, jagtform, start/slut, søgetid, dækningsgrad og det uforanderlige prognosesnapshot, som var tilgængeligt ved turens start.

Nul-fund er nødvendige og må ikke behandles som ens, hvis søgeindsatsen er forskellig. Gamle eller ufuldstændige observationer kan indgå i dækningsstatistik, men ikke i koefficienttilpasning uden fuldt bevis for de krævede felter.

Præcis GPS og rute forbliver lokale. Den centrale kalibreringspost må ikke indeholde direkte bruger-/enhedsidentitet, fri tekst, billeder eller rå diagnostik.

Kalibreringslåsen forbliver aktiv. Denne beslutning godkender datakontrakt og dækningsrapport, men ingen ny scoremodel, tærskel eller koefficient.

## Begrundelse

Et fund er betinget af søgetid, sted, jagtform, erfaring, synlighed og brugerens valg af område. Enkeltfund uden indsats og ægte nul-fund kan derfor ikke identificere RavScores prædiktive værdi.

Den observerede 4.0.242-audit viser desuden en gennemsnitlig forskel på 6,67 point mellem zonevinderen og alle lokale kystdele. Zone-ID alene er derfor ikke præcist nok til kalibrering.

## Konsekvenser

- Næste observationsændring skal gøre tripdata tids- og kystdelskorrekte.
- Eksisterende observationer bevares, men er som udgangspunkt ikke fit-klare.
- Dækningsrapporten skal være aggregeret og må ikke udlevere bidragyderidentitet.
- Senere træning kræver tids-, hændelses-, geografi- og bidragydergrupperede hold-outs.
- Aktivering af en kandidat kræver en ny særskilt RDKS-beslutning.

## Evidens

- `docs/research/RAVSCORE_PHASE_D_OBSERVED_ABLATION_4.0.242.md`
- `docs/research/RAVSCORE_TRIP_CALIBRATION_PROTOCOL.md`
- `docs/research/RAVSCORE_PHASE_D_CANDIDATE_MODELS.md`
