# DEC-0233 – checkpoint-readback følger den append-only successor

**Dato:** 2026-09-22  
**Status:** Gældende fra 4.0.456

## Problem

Den første code-only readback efter PR #411 registrerede den nye migration
`20260922100000_integrated_trip_binding_repair.sql` korrekt i Supabase, men
stoppede med `database checkpoint CAS contract definition hash drifted`.
Readback-koden hentede sin forventede checkpoint-definition fra den ældre
`20260920220000`-migration, selv om successoren eksplicit genindsætter den
samme checkpoint-kontrakt. Supabase returnerede derfor korrekt en hash, som
ikke kunne matche den forkerte lokale kilde.

## Beslutning

Kildevalget er opdelt efter ansvar:

- Trip-policyens readback bruger fortsat den seneste fulde binding
  `20260920220000`.
- Checkpoint-CAS-readback bruger den append-only successor, der faktisk
  genindsætter checkpoint-funktionerne: `20260922100000`.

Historiske migrationsfiler må ikke omskrives. En ny successor skal både
indeholde ændringen og være den kilde, som readbacken forventer for netop de
funktioner, den genindsætter.

## Afgrænsning

Dette ændrer ikke scorematematik, DMI/fallback, cachedata, MISSING-regler,
providerprioritet eller offentlig UI. Fejlen var i kontrolkædens kildevalg,
men den var blokkerende, fordi en korrekt database ellers blev afvist før
vejrkørsel.
