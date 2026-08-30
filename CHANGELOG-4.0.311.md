# RavRadar 4.0.311-kandidat

Dato: 2026-08-29

## Én afgrænset Candidate G-rekonstruktion

- Incident `RRGAP-2026-08-29-CANDIDATE-G-01` er den eneste tilladte rekonstruktion og en udtrykkelig ejerundtagelse til normal no-backfill.
- Read-only inspect bruger eksakte før-/efter-artifacts og forsegler kun en dataminimeret descriptor. Apply genverificerer kilder og mål med compare-and-swap, skriver privat rollback før mutation og beviser isoleret apply→direkte rollback uden at røre produktionsmålet.
- Kun allerede afledt signeret kystnormal transportstyrke interpoleres lineært ved dokumenteret native kadence. Ingen vejr-, bølge-, vandstands-, rå U/V-, koordinat-, geometri-, punkt- eller privat data rekonstrueres.
- Målt state forbliver schema 2.0.0. State med levende incidentmarkør er schema 2.1.0 med `RECONSTRUCTED_DERIVED_NOT_MEASURED`, `calibrationEligible=false` og `hardObservedOuttransportEligible=false`.
- Rekonstrueret evidens må ikke alene udløse den observerede 13-timers udtransportgate eller stages som last-verified fallback.
- Eksakt rollback er kun gyldig mod den byte-/hashidentiske umiddelbare post-apply-state. Senere descendants bruger kausal cleanup, som bevarer nyere målte prøver og vender tilbage til ærlig schema 2.0/warmup.
- Reconstruction-mode kan ikke skrive delt continuation-, checkpoint- eller last-ready-cache. Apply/cleanup lukker alle 673 scoreveje, indtil en obligatorisk frisk normal produktion har genberegnet og forseglet et komplet datasæt.
- Ture fra rekonstrueret score eller vist last-complete nødvisning er brugerhistorik, men markeres ens gennem klient, Edge, D1/Supabase, schema og installer som ikke-kalibrerbare.
- Aktive/pending schema-v2-ture fra før 4.0.311 uden trustfelter bevares som brugerhistorik med `ravscore-evidence-trust-unattested` og `calibration_eligible=false`; fravær må ikke fail-open som målt evidens.
- Allerede gemte schema-v2-observationer fra før 4.0.311 muteres eller slettes ikke. Den lokale prediction-/kalibreringsforbruger udelukker dem, medmindre `calibration_features.appVersion >= 4.0.311`, `calibration_eligible=true` og `data_quality_flags` er den eksakte attesterede tomme liste.
- Browser, Edge og D1 deler nu samme fail-early aliasmønster for privat lokation, inklusive nested `location`. Edge/D1 accepterer kun allowlistede nested felter med eksakte typer/intervaller. Migration og readback bruger en eksplicit server-side PostgREST-bladprojektion og må aldrig hente `select=*`, hele fri-form-JSON, GPS/koordinater, rå U/V, fri tekst/billeder eller ukendte/private ekstrakolonner. Owner-id bruges kun i memory til HMAC uden logging. Historiske fri-form-snapshots videreføres deterministisk; eksisterende ældre D1-rækker ændres ikke, og en kompatibel replay kræver oprindelig selvhash samt eksakt ejer-/id-/projektionsoverensstemmelse.
- Ti D1-shards deler én atomisk global registry for klient-/trip-id, HMAC-ejer, payloadhash og målshard. Ejer-sletning skriver en global tombstone før rows og registrybindinger fjernes, så samtidige/senere writes stoppes.
- Før første 4.0.311-Pagesproduktion kræves exact-head `[d1]`-backendbevis. Efter capacity/CAS sættes existing-D1 eller fresh Edge-predeploy-intent umiddelbart før første Edge-deploy. Existing D1 bruger 20-minutters lease/30-minutters max, femsekunders prober, dobbeltattestation, drain, 600 sekunders restlease og samlet syvminutters Worker-secret/deploy/health-gate; partial Edge går D1 roll-forward. Fresh partial Edge før activation går exact-main → Supabase-secret → eksakt Edge-redeploy → dobbelt Supabase-attestation. Uden intent ved capacity/pre-CAS-fejl sker nul recoverymutation. Manglende bevis giver no-op uden artifact/Pages.
- Legacy-D1 klassificeres ikke længere alene ud fra ti shards og et grønt historisk run. Run `33024408547` bindes også til præcis ét upagineret job på første forsøg, ti eksakte D1-trin som `completed/success` og det alternative Supabase-rollbacktrin som `completed/skipped`; 403, timeout, pagination, tvetydighed eller afvigende stepstatus stopper før legacy-intent.
- Den kommende DEC-0102-model får en bindende acceptance gate for en measured-only atomisk 210/673-nødstate med eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips og automatisk frisk primary. Interpolation er ingen generel fallback.
- `calibration_eligible` forbliver en klientattesteret fail-closed lås, ikke serverbevist manifestproveniens eller empirisk evidens. Global koefficientlæring er P2-låst.

## Status

Dette dokument beskriver en lokalt implementeret og målrettet lokalt testet kildekandidat. Fuld exact-head CI, merge, live `[d1]`-backend, inspect/apply, frisk produktion, Pages og offentlig desktop/mobil/210/673-verifikation mangler fortsat. Offentlig version er indtil da 4.0.310.

Se DEC-0109.
