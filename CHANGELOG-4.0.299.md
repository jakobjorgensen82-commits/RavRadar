# RavRadar 4.0.299 – én hurtig Om-retur uden tvungen reload

Dato: 2026-08-28

## Ændret

- Bevarer RavRadar-knappens unikke versions-/noncebaserede navigation i både Safari og Hjemmeskærm-app.
- Fjerner 4.0.298's ekstra synkrone head-værn, timer og automatiske reload.
- Lader den eksisterende hurtige appopstart fuldføre én gang uden at blive genstartet efter seks sekunder.
- Fjerner det forkastede værn fra service-workerens appskal.

## Uændret

- 4.0.292/297's eksisterende sidecache-/bfcache-recovery.
- 4.0.296's kompakte startup.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter.

## Verifikation

- Offentlig 4.0.298 beviste, at Om-returen allerede var komplet efter cirka ét sekund med 210 zonelinjer og 5 + 5 + 5, hvorefter det fejlagtige værn tvang en ny navigation ved cirka seks sekunder.
- Ejerens fysiske iPhone-test beskrev siden som meget langsom og derefter helt udeblevet. 4.0.298 må ikke kaldes fysisk løst.
- Målrettet 4.0.299-test og fuld lokal `validate:source`/releasegate er grønne. Exact-head, produktion, offentlig cirka ét-sekundsretur og fysisk Safari-/Hjemmeskærm-test afventer.
- Se DEC-0096.
