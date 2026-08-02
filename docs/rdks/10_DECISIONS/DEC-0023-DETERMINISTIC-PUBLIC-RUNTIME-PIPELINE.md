# DEC-0023 – Én deterministisk pipeline for offentlig runtime

**Status:** Bindende  
**Indført:** 4.0.75

## Beslutning

`public-conditions.json` og dens manifest må kun dannes af én fælles implementering. Hydrering, vejropdatering, lokal generering, test og GitHub-deploy må ikke have hver sin fortolkning af projektionen.

## Hvorfor

4.0.74 fejlede i GitHub, fordi en hydratiseret `conditions.json` blev kombineret med en allerede eksisterende public-fil fra et andet tidspunkt. Den lokale test sammenlignede korrekt filerne og stoppede releasen, men workflowet manglede et obligatorisk genbygningstrin efter hydrering.

## Bindende krav

1. Den fulde `conditions.json` er kilden til den offentlige projektion.
2. `scripts/public-conditions-lib.mjs` er eneste projektions- og manifestwriter.
3. Public runtime genbygges efter hydrering.
4. Public runtime genbygges før validering/deploy, også ved fallback til tidligere vejrdata.
5. Manifestets dataset-id, SHA-256 og byteantal skal matche public-filen.
6. Release Gate skal stoppe ved enhver afvigelse.
7. Nye dataformater må ikke kaldes færdige, før hele GitHub-kæden er testet som en frisk opgradering fra den tidligere deployede version.
