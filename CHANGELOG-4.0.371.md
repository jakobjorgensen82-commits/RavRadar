# RavRadar 4.0.371 – eksakt forgængerbinding i runtime-migrationen

**Dato:** 2026-09-15  
**Status:** Lokal releasekandidat; exact-head PR-gate, merge og providerfri code-only mangler.

## Produktionsbevis før rettelsen

4.0.370 bestod sourcegate `34920862401`, blev merged gennem PR #312 som main
`9b5c82a837198a1a5f7d6e11d2620cdd5ea77d4f`, og code-only-run
`34921173187` genbrugte sourcebeviset. Migration 16/17 var allerede anvendt,
privacy var fortsat lukket, og den store forgængerruntime blev nu både
gendannet og pakket ud korrekt uden provider.

Runnet stoppede i næste trin før runtime/Pages, fordi migratorens forseglede
forgængerbinding havde tre forenklede fixtureværdier, som aldrig stod i den
faktiske `fa418f43`-model.

## Rettelse

Variant, profil og komponentskema er rettet til den eksakte gamle kilde og det
offentlige liveartifacts 11-feltsbinding. Testen sammenligner ikke længere en
konstant med en kopi af sig selv; den kræver den virkelige aktuelle binding
med kun den kendte gamle bundlehash `327b…` udskiftet.

Ingen private data, modelparameter, score, migration, runtimepointer, geometri
eller vejrværdi ændres. Næste code-only-run er providerfrit og genbruger
migration 16/17 samt den allerede beviste restorevej.
