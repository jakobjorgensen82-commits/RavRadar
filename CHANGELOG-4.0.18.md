# RavRadar 4.0.18

- Central, ensartet admin-dokumentlagring med lokal kladde og Supabase som autoritativ kilde, når login/configuration er aktiv.
- Automatisk gemning af regler, retningsreviews/ankre og vandstandsstationsrouting.
- Tydelig gemmestatus og manuel “Gem nu”.
- GitHub Actions synkroniserer centralt gemte admin-dokumenter før vejrberegningen.
- Admin-stationskortet bruger det eksisterende DMI oceanObs-stationsregister via en afledt cache; stationsregisteret hentes uafhængigt af observationsvinduet og hydreres fra seneste deployment.
- Prognosediagnostik udvidet til 6/24/48/120 timer og komponentvis horisontdækning.
- DMI-health opdelt i acquisition, conversion, horizon og observations.
