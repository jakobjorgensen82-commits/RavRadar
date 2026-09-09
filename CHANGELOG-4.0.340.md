# RavRadar 4.0.340 – sikker WAM-seam

## Problem

Oneoff `34371642565` gemte DMI-, Copernicus- og Open-Meteo-progress, men WAM-handoff stoppede med `MIXED_RUN_INTERPOLATION`. Producenten kunne finde en gyldig interpolation inden for samme native WAM-serie, mens slutvalidatoren og Forecast Store kun prøvede de to tidsmæssigt nærmeste rækker. En eksakt nyere modelrække kunne dermed skjule en stadig gyldig bracket fra den forrige kørsel.

## Rettelse

- Eksakte rækker vinder uændret.
- Alternative brackets kræver samme collection, modelkørsel, gitterdefinition og fysiske celle.
- Den smalleste bracket vælges deterministisk; ved lighed vælges nyeste kausale run.
- Fire timer er et absolut bølgeloft, også hvis en forkert cadence-værdi sendes ind.
- Ingen leverandørprioritet, cacheidentitet, geometri, scoreparameter eller offentlig model ændres.

## Samlet Astra-review

- Samlet Astra-review retter desuden valg af nærmeste endepunkter pr. serie og fuld bølgetuple/retning før rangering, så et ugyldigt alternativ ikke skjuler et gyldigt.
- Synkroniserer integrated-/rollbackbundles og alle SQL-/profil-/Edge-/releasebindinger med append-only migration 9. Alle otte allerede anvendte migrationer er uændrede; readiness genoptager kun det præcise pending suffix.
- Flytter fem hurtige eksisterende bindingskontroller foran de tunge sourcefixtures, uden at fjerne eller svække den fulde gate.
- Den grønne backend fra 4.0.339 dækker ikke de nye hashes: efter merge kræves nyt backendbevis parallelt med corrected-main oneoff. Candidate G forbliver offentlig indtil hele launchkæden består. Se `docs/ai/RELEASE_4_0_340_ASTRA_REVIEW_2026-09-09.md`.

## Bevis og status

Python-validator 35/35, DMI-producentintegration 24/24, Forecast Store, bootstrap-target og RavScore-produktionsadapter er grønne lokalt. Negative regressioner bevarer stop ved mixed-run og over-fire-timers interpolation. Bundles, migration, readiness, installation, releasekontrakt og sourceplanens måltests er også grønne. Exact-head GitHub-sourcegate, merge, nyt backendbevis, komplet 4.0.340-main-oneoff, fulde post-data-gates, deploy og offentlig verifikation mangler. Candidate G forbliver offentlig indtil da.
