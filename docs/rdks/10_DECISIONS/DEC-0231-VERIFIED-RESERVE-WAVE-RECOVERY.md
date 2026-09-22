# DEC-0231 – Verificerede reservebølger må bruges i normal recovery

**Status:** Aktiv implementering i 4.0.453; livebevis afventer
**Dato:** 2026-09-22

## Problem

Normalrun `35695267017` gennemførte DMI, Copernicus, Open-Meteo og den
samlede closure, men stoppede i `Update central weather cache` med
`RAVSCORE_RECOVERY_REPLAY_WAVE_UNVERIFIED`. Cachebygningen havde allerede
admitteret gyldige bølgekomponenter fra reservebanken, men replayforbrugeren
accepterede kun direkte DMI-bølgeproveniens. En gyldig reserve blev derfor
fejlagtigt behandlet som en uverificeret bølge.

## Bindende rettelse

- Normal integreret recovery må bruge en Copernicus- eller Open-Meteo-
  bølge, når den kommer fra den allerede uafhængigt godkendte component-bank
  og stadig har fuld binding til kystdel, sted, præcis time og komponent-
  record-id.
- Den ejer-godkendte Feggesund-nabobølge må bruges, når dens eksisterende
  proxybevis består.
- Den engangs Candidate G-wave-bridge er fortsat DMI-only. Reserve- eller
  syntetiske bølger må ikke bootstrap'e den historiske migration.
- En række med manglende, forkert eller selvpåstået provenance fejler stadig
  lukket. Der ændres ikke på scoreformel, kildeprioritet, DMI-first,
  vandstandens DMI-only-regel eller offentlig datakomplethed.

## Verifikation

4.0.453 har måltest for normal replay med en strukturelt fuldt bundet
Open-Meteo-bølge og for fortsat afvisning af fallback i Candidate G-broen.
Den næste almindelige kørsel skal genbruge den gemte leverandørfremgang og
vise, at cachebygning, runtime, gates og deploy fortsætter uden denne falske
blokering.
