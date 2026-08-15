# P1 – målte kildeskift i 4.0.214

**Grundlag:** Kørsel #31874335007, datasæt `rr-20260815083802-210`
**Metode:** Absolut ændring mellem timen før og timen efter hvert kildeskift, sammenlignet med almindelige nabotimer inden for samme kilde. Retninger måles cirkulært omkring 0/360 grader.
**Status:** Analyse afsluttet; ingen udglatning, kilde- eller scoreændring

## Kort konklusion

Vandstandens eksisterende overgangsreparation virker efter hensigten. Vind, strøm og vandtemperatur kan derimod ikke behandles som sømløse femdøgnskæder på tværs af kildeskiftet. Bølgeovergangen ind i DMI-serien har også tydeligt større variation end almindelige timer.

## Resultater

| Måling | Ved kildeskift, gennemsnit | Ved kildeskift, 95 % | Almindelig time, gennemsnit | Almindelig time, 95 % | Vurdering |
|---|---:|---:|---:|---:|---|
| Vindhastighed | 0,94 m/s | 2,7 m/s | 0,32 m/s | 0,9 m/s | Overgangen er cirka tre gange større |
| Vindretning | 35° | 102° | 6° | 20° | Tydeligt overgangsproblem |
| Bølgehøjde | 0,13 m | 0,59 m | 0,03 m | 0,09 m | Større spring ved kildegrænsen |
| Bølgeretning | 37° | 153° | 7° | 28° | Tydeligt overgangsproblem |
| Bølgeperiode | 0,37 s | 1,5 s | 0,07 s | 0,2 s | Større spring ved kildegrænsen |
| Strømhastighed | 0,46 m/s | 1,25 m/s | 0,02 m/s | 0,10 m/s | Kilderne er ikke sammenlignelige som én serie |
| Strømretning | 92° | 179° | 17° | 105° | Fallbackretningen er i praksis ofte helt anderledes |
| Vandstand | 4,6 cm | 17 cm | 5,0 cm | 22 cm | Overgangen er ikke værre end normal udvikling |
| Vandtemperatur | 2,43 °C | 9,1 °C | 0,09 °C | 0,1 °C | Markant niveauforskel mellem kilder |

## Den sene prognosehale

Skiftet fra DMI ud i fallbackhalen er mest relevant for den kommende brugerprognose:

- Vind: gennemsnitligt 1,23 m/s og 53°; 95 % ligger under 3,5 m/s og 136°.
- Strøm: gennemsnitligt 0,41 m/s og 90°; fallbacken kan ikke godkendes som fortsættelse af DMI-strøm.
- Vandstand: gennemsnitligt 4,0 cm og 95 % under 15 cm; dette er bedre end almindelige timespring i samme datasæt.
- Vandtemperatur: gennemsnitligt 3,59 °C og 95 % under 10,5 °C; dette er ikke en fagligt sammenhængende temperaturhale.
- Bølgeskiftet fra DMI til den mærkede kant/fallback havde ingen værdiændring i dette artifact. De store bølgeforskelle ligger ved skift tilbage ind i DMI og skal fortsat overvåges.

## Bindende konsekvenser før scorearbejde

1. Fallbackstrøm må fortsat være `unverified` og må ikke tælle som verificeret 72-timershistorik eller senere mobiliseringsbevis.
2. Manglende strøm i de otte Limfjordhaler er fagligt bedre end at kalde fallbackstrømmen en sømløs DMI-fortsættelse.
3. Vandtemperatur er fortsat score-neutral. Den må ikke inddrages i RavScore, før kildeforskellen er forklaret eller en godkendt overgang er designet.
4. Vind og bølger må beholde tydelig provenance. En eventuel senere overgangsregel skal konsekvensberegnes mod retning, højde/hastighed og score – ikke blot udglattes visuelt.
5. Vandstandens nuværende bias-/kontinuitetsmekanisme bevares og dækkes af regressionstest; der er ikke belæg for en ny rettelse.

## Næste regressionsdesign

- Gem baseline og kildeskift separat pr. komponent og overgangsretning.
- Flag en produktionskørsel, hvis et skift forværres væsentligt mod den dokumenterede baseline; fast tærskel vælges først efter flere uafhængige DMI-kørsler.
- Test at strømfallback aldrig ændrer `verifiedCurrentCoverageHours`.
- Test at temperaturfallback aldrig får DMI- eller `surface:0`-proveniens.
- Test at vandstandsreparation altid bevarer rå fallbackværdi, offset og reparationsgrundlag.
- Gentag auditten efter flere kørsler før en permanent overgangsregel godkendes.
