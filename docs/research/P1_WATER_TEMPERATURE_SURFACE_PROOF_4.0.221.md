# P1 – produktionsbevis for havoverfladetemperatur

**Grundlag:** GitHub Actions #31889559758, artifact #2777, datasæt `rr-20260815142117-210`

## Konklusion

Det tidligere lagproblem er lukket i den aktuelle produktionscache. Alle 210 hovedzoner har et temperaturgitterpunkt med `verticalLayer: surface:0`. Ingen DMI-temperaturtime i hovedzonerne er umærket eller kommer fra et dybdelag.

## Faktisk fordeling

- `dkss_idw`: 116 zoner og 5.023 native temperaturtrin med `surface:0`.
- `dkss_nsbs`: 71 zoner og 3.124 native temperaturtrin med `surface:0`.
- `dkss_lf`: 23 zoner og 1.012 native temperaturtrin med `surface:0`.
- Samlet: 210/210 gitterpunkter og 9.159/9.159 temperaturtrin med eksplicit havoverfladeproveniens; nul afvigelser.

IDW har 89 zoner med 44 native trin og 27 zoner med 41. NSBS har 71×44, og LF har 23×44. Den offentlige komponentmatrix interpolerer disse native DMI-trin til timevisning og bevarer kildeidentiteten.

## Hvad der stadig er åbent

Artifact #2777 har 118 viste temperaturtimer i 202 zoner og 114 i otte Limfjordszoner. Det resterende firetimershul er et DMI-horisont-/overgangsproblem, ikke en tilbagekomst af dybdelagsfejlen. Vandtemperatur er fortsat score-neutral, og denne analyse ændrer ingen kilde, fallback, interpolation eller RavScore.
