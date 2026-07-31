# RavRadar 4.0.44 – robust Supabase-installation

- Én samlet, idempotent Supabase-installationsfil.
- Rører ikke den eksisterende observationsdatamodel.
- Undgår `observed_at`- og UUID/bigint-konflikterne fra det gamle `schema.sql`.
- Opretter profiler, rettigheder, central adminlagring, versionshistorik og auditlog i korrekt rækkefølge.
- Sætter Jakob som owner og genindlæser PostgREST-skemaet.
- Indeholder afsluttende installationskontrol.
