# P1 – verificeret historik før mobiliseringsanalyse

**Produktionsgrundlag:** GitHub Actions #31885856568, artifact #2764, datasæt `rr-20260815131334-210`

## Klart svar

RavRadar gemmer rå vejrhistorik korrekt, men historikken er endnu ikke lang eller ensartet nok til at godkende et nyt mobiliserings- eller scoremodul. 4.0.220 ændrer ingen data og ingen score; den gør forskellen målbar.

## Faktisk status

- Aktuel strøm er DMI-verificeret i 210/210 zoner.
- Alle zoner har 149 rå prøver over 37,149 timer.
- Verificerede prøveantal er ujævnt fordelt: 27 zoner har 4, 75 har 5, 98 har 6, og 10 har 106.
- Det verificerede tidsspænd er 1,43 timer i 75 zoner, 18,97 timer i 125 zoner og 37,149 timer i 10 zoner.
- Ingen zone har endnu 72 timers verificeret strømhistorik.
- Det største fælles hul i den rå serie er 1,127 timer. Det bevares synligt og udfyldes ikke bagudrettet.

## Ny Limfjordsevidens

4.0.219-artifactet indeholder en fuldt behandlet `dkss_lf`-cyklus fra 15. august kl. 06 UTC med 41/41 trin. De otte kendte Limfjordszoners strøm-, vandstands- og temperaturhale voksede fra 98 til 115 viste timer. Det er en DMI-first-forbedring fra naturlig modelrotation, ikke en ny fallback.

## Exitkriterium

Senere mobiliseringsanalyse må først behandle historikken som landsdækkende baseline, når alle aktive zoner har mindst 72 faktiske timer med verificeret fælles DMI-U/V-proveniens, og reelle DMI-huller er opgjort særskilt. Rå prøver, fallbackstrøm og uverificerede tider må ikke tælles som verificeret transporthistorik.

## Produktionsverifikation af 4.0.220

Kørsel #31888082124 bestod hele kæden og deployede datasæt `rr-20260815134755-210`. Artifact #2771 viser 210/210 verificerede aktuelle zoner. Alle zoner har 152 rå prøver over 37,722 timer; verificerede prøveantal er 27×7, 75×8, 98×9 og 10×109. Det verificerede tidsspænd er 2,003 timer i 75 zoner, 19,54 timer i 125 og 37,722 timer i 10. Ingen zone er uden verificerede prøver, men alle 210 er fortsat under exitkriteriet på 72 timer.
