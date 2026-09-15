# DEC-0152 – historisk modelbinding må ikke være en selvbekræftende fixture

**Dato:** 2026-09-15  
**Status:** Aktiv og bindende

En engangsmigration fra en fast historisk source skal bruge alle 11 faktiske
bindingsfelter fra den source. Forenklede navne er ikke tilladt, selv om model-
og bundlehash er rigtige.

Regressionstesten skal sammenligne den forseglede forgænger med RavRadars
virkelige aktuelle 11-feltskontrakt og kun tillade den dokumenterede gamle
bundlehash at afvige. Den må ikke bygge både forventet og faktisk værdi fra den
samme konstant.

Run `34921173187` beviste restore og udpakning, men stoppede på tre opdigtede
fixturefelter før private eller offentlige writes. Den eksakte `fa418f43`-kilde
og det offentlige artifact bekræfter de korrigerede værdier. Ingen provider,
migration eller måledata ændres.
