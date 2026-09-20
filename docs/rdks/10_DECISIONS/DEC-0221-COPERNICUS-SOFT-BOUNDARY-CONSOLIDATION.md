# DEC-0221 – Copernicus soft-boundary skal konsolidere før næste gate

**Dato:** 2026-09-20
**Version:** 4.0.443
**Status:** Vedtaget lokalt; produktionsbevis afventer næste almindelige continuation.

## Beslutning

En Copernicus-kørsel, der når sin kontrollerede soft-boundary efter at have
skrevet fsync'ede segmentkvitteringer, må ikke aflevere den gamle baseline
plus en løs journal til næste workflowtrin. Wrapperen skal i stedet starte en
netværksfri `--checkpoint-only`-genindgang uden `--reuse-baseline-on-checkpoint`.
Den genindgang afspiller kun de allerede gemte kvitteringer og gennemfører den
eksisterende atomiske bank → shadow → source-stage-transaktion. Først derefter
må `--require-source-stage-reusable` afgøre, om Open-Meteo kan fortsætte.

Hard-timeout recovery beholder fortsat sin særskilte baseline-genvej, når den
eksakte bank, shadow og stage kan bevises uændret. Det er kun den eksplicitte
exit-75 soft-boundary, der kræver den ekstra lokale konsolidering.

## Hvorfor

Normalrun `35489667755` viste, at DMI og Copernicus-fremskridt var gyldige og
blev gemt, men den næste kontrol stoppede med “READY/IN_PROGRESS evidence is
required but absent”. Den konkrete kædefejl var afleveringen af en ikke-
konsolideret journal, ikke en grund til at kassere de hentede data eller
starte hele vejrkørslen forfra.

## Sikkerhedsgrænser

- Recovery laver ingen provider- eller netværkskald.
- Kun allerede validerede/fsync'ede segmentkvitteringer må genafspilles.
- Hvis konsolideringen fejler, er resultatet ikke genbrugeligt, og workflowet
  stopper fail-closed før Open-Meteo og deploy.
- `IN_PROGRESS` er fortsat ikke det samme som komplet data eller READY.
- DMI-first, fallback-regler, gamle gyldige data, score, geometri og public
  runtime er uændrede.
