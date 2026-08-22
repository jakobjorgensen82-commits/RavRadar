# DEC-0052: Candidate G skelner scoreinputcoverage fra udeladt stedmodel

**Status:** Aktiv score-neutral forskningsbeslutning; ingen produktionsaktivering

**Dato:** 2026-08-22

**Scorepåvirkning:** Ingen

## Problem

Den nationale Candidate G-shadow gjorde både komplet dynamisk scoreinput og komplette lokale felter for rev, lavt vand og ålegræs til samme coveragegate. Det passede til en ældre kandidat med mulig statisk fastholdelsesbonus, men ikke til Candidate G's nyere kontrakt.

Candidate G giver nul point fra disse statiske felter. Ejeren har desuden besluttet, at bund, dybde, render og anden lokal grundegnethed ikke skal modelleres, fordi lokalkendskab og undtagelser kan gøre en landsdækkende geodatamodel misvisende.

## Beslutning

1. Komplet native dynamisk scoreinput for alle aktive kystdele er fortsat en hård coveragegate.
2. Rev-, lavtvands- og ålegræsfelter registreres kun som diagnosticeret datatilgængelighed. De er ikke scoreinput og kræves ikke for Candidate G-aktivering.
3. Parentzonens morfologi må fortsat ikke arves som lokal kystdelsevidens.
4. Shadowrapporten skal angive eksplicit, at den statiske lokale retentionmodel er udeladt, har nul scorepåvirkning og ikke indgår i aktiveringscoverage.
5. Manglende dynamiske input må ikke skjules af denne præcisering. Den friske centrale shadow har kun komplette input til 243 af 673 dele; de resterende 430 mangler lokal DKSS-familie og holder derfor coveragegaten lukket.
6. `automaticActivationAllowed` forbliver altid `false`. Komplet scoreinputcoverage ville kun lukke denne ene datagate; øvrige produkt-, ekstrem-, UI-, rollback- og ejer-go/no-go-gates består.

## Faglig betydning

Kandidatens dynamiske levering/fastholdelse beskrives fortsat gennem bølger, strøm, vandstandsfase, hændelsestiming og historik. Beslutningen fjerner ikke den fysiske leveringskæde. Den forhindrer alene, at udokumenterede statiske stedflag bliver en skjult bonus eller en kunstig blokering for en model, som bevidst ikke bruger dem.

## Bevarede kontrakter

- Offentlig RavScore er fortsat 25/40/35.
- Candidate G forbliver diagnostic-only med 20/45/35 som analysecentrum.
- Waders-loftet, vindkurven og strandens manglende jagtbarhedsloft er uændrede.
- DMI/fallback, central admin, geometri, land-/vandpunkter og offentlig UI er uændrede.
- Private rå vejrdata, U/V, koordinater og komplette diagnostikpayloads må ikke gemmes i Git eller offentlige artifacts.

## Evidens

- DEC-0050 og DEC-0051
- `js/core/phase-d-wave-process-candidate.js` (`staticRetentionScoreImpact: false`)
- `docs/research/RAVSCORE_RETENTION_AND_HISTORICAL_REPLAY_2026-08-21.md`
- central shadow `32578554928` på merge `d629177a`
- `scripts/validate-national-shadow-score.mjs`
