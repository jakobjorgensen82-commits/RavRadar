# DEC-0187 – Fælles UTC-timekontrakt i hele deploykæden

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.405,
exact-head og livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.404 blev leveret som main 5fc6e2fd. Saved-weather 35216079458 genbrugte
09Z-runtime uden providerkald, bestod artifact og privacy og publicerede
privat runtime og Edge. Det genbrugte Pages-workflow kaldte derefter
freshness-parseren direkte med 09:00:00.000Z og stoppede før aktivering.

## Beslutning

1. Den fælles parser accepterer kun præcise hele UTC-timer i formerne
   HH:00:00Z og HH:00:00.000Z.
2. Samme regel gælder produktionstimen og en eksplicit prognosehorisont i
   alle workflowkald.
3. De to former sammenlignes efter fjernelse af kun den valgfrie .000-del.
4. Ikke-hele timer, andre millisekunder, offsets, fremtid, forkert horisont,
   udløb og gældende aldersgrænser forbliver hårde stop.
5. Rettelsen ændrer ikke instant, dataset, vejr, score, cache, geometri eller
   providerprioritet. Fortsættelsen er providerfri og uden oneoff.

## Evidens

Det virkelige input 2026-09-17T09:00:00.000Z klassificeres som FRESH under
240 minutter. Måltesten dækker begge former for både produktionstime og den
eksakte sidste prognosetime samt de eksisterende negative grænser.
