# DEC-0208 – H0-vind må ikke skjules af cooldown, og diagnostik må ikke standse deploy

**Status:** Aktiv; lokal 4.0.428, produktionsbevis afventer
**Dato:** 2026-09-19

## Problem

4.0.427 bestod exact-head `35410861514`, blev merged gennem PR #372 som main
`abf0274f` og fik en grøn backendinstallation i `35411487128`. Den almindelige
vejrkørsel `35411701055` gennemførte alle providerled og byggede den offentlige
runtime, men nåede ikke Pages.

Stageoversigten beviste, at 4.0.427-rettelsen for aktuel strøm virkede:
665 af 673 dele nåede scoreinputtet mod 56 før rettelsen. HARMONIE blev derimod
ikke forsøgt, selv om alle 673 dele manglede vind på produktionstimen. En arvet
collection-wide `nextEligibleAt` blev anvendt, før det kritiske H0-grundbehov
blev valgt, og kunne derfor skjule hele det ene tilladte HARMONIE-forsøg.

Kørslen byggede derefter et strukturelt sikkert artifact og gennemførte 52
artifactkontroller samt tre releasekontroller. Den uafhængige offentlige audit
rapporterede kendte datamangler diagnostisk, som DEC-0193 tillader. Den sene
historical-maintenance-seal krævede alligevel fejlagtigt `status=passed` og
stoppede før Pages.

## Beslutning

- Når eksakt, verificeret H0-vind mangler, må en arvet HARMONIE-cooldown ikke
  skjule det ene afgrænsede H0-forsøg i næste almindelige kørsel.
- Undtagelsen gælder kun planlægningen af højst ét HARMONIE-asset. Alle
  parser-, grid-, tid-, tuple-, afstands- og provenienskrav er uændrede;
  ugyldige resultater accepteres aldrig som data.
- Normal cooldown gælder fortsat for almindelig HARMONIE-vedligeholdelse og
  alle øvrige collections.
- Historical maintenance må bruge den eksisterende DEC-0193-kontrakt for
  afgrænsede diagnostiske public-audit-fund. Manifest, modelbinding, 210/673,
  privacy, rollbackstatus, fejlkoder og tællinger valideres fortsat strengt.
- En runtime med diagnostisk fejlet audit må ikke blive kalibreringsegnet.
  Kun `status=passed` og fuld historik kan åbne kalibrering.
- En fejl i selve strømaudit-scriptets rapportvariabel rettes. Rettelsen
  ændrer ingen data eller kriterier; den gør blot rapporten færdig.

## Komplethed og næste bevis

Run `35411701055` er ikke et komplet databevis. DMI dækkede 36.463 af 79.414
par; providerunionen dækkede 77.080, så 2.334 par manglede reelt. Open-Meteo
havde 1.096 uafklarede par, herunder dokumenterede null/grid-svar. Feggesund
havde 201 direkte bølgedeltimer og 153 manglende. De tal skal ned til nul, ikke
omdøbes til acceptabel `MISSING`.

Efter exact-head og merge skal én almindelig vejrkørsel bevise, at HARMONIE
faktisk forsøges først ved manglende H0-vind, at gyldig aktuel strøm bevares,
at Pages gennemføres trods rent diagnostiske fund, og at alle resterende
datamangler rapporteres samlet. RavScore-formel, geometri, land-/vandpunkter
og providerprioritet ændres ikke.
