# P1-komponentmatrix – 4.0.214

**Produktionsgrundlag:** Kørsel #31874335007, datasæt `rr-20260815083802-210`  
**Omfang:** 210 aktive zoner og 118 viste prognosetimer pr. zone  
**Status:** Måling og regressionsdesign afsluttet; ingen kilde-, fallback- eller scoreændring

## Det klare billede

| Komponent | Dækning | DMI-timer | Fallbacktimer | Manglende timer | Konklusion |
|---|---:|---:|---:|---:|---|
| Vind | 210 zoner med 118/118 timer | 21.210 | 3.570 | 0 | Komplet, men med to kildeskift pr. zone |
| Bølger | 194 zoner med 118 timer, 15 med 117, én med 0 | 23.548 | 1.099 | 133 | Feggesund mangler hele serien; 15 zoner mangler én time |
| Strøm | 202 zoner med 118 timer, 8 med 101 | 21.129 | 3.515 | 136 | Fælles 17-timers Limfjordhale |
| Vandstand | 202 zoner med 118 timer, 8 med 101 | 21.210 | 3.434 | 136 | Samme 17-timers Limfjordhale |
| Vandtemperatur | 202 zoner med 118 timer, 8 med 101 | 13.602 | 11.042 | 136 | Samme hale; DMI-værdier skal være `surface:0` |

De otte fælles halezoner er `DK-B05-14`, `DK-B05-16`, `DK-B05-17`, `DK-B05-18`, `DK-B05-19`, `DK-B05-22`, `DK-B05-23` og `DK-B05-24`.

## Provenance og overgange

- Vind har to kildeskift i alle zoner. DMI er den primære midterserie; fallback dækker ydertimerne.
- Bølger har typisk tre overgange mellem fallback, DMI og den sidste kant/mangel. Bølgehøjde, retning og periode skal altid skifte samlet.
- Strøm og vandstand har to overgange i alle zoner. Fallbackstrøm er ikke videnskabeligt verificeret som DMI-strøm og må ikke skjules som samme kvalitet.
- Vandtemperatur har ingen kildeskift i 70 zoner og to i 140. DMI-temperatur må kun accepteres med eksplicit havoverfladeproveniens.
- `missing` er en reel tilstand. Den må ikke erstattes af nul, gentaget sidste værdi eller umærket interpolation.

## Nødvendige regressionstests før senere scorearbejde

### Fælles kontrakt

1. Præcis 210 aktive zone-ID'er og samme ID'er i vejrgrundlaget.
2. Præcis 118 ordnede viste timer uden dubletter.
3. Hver ikke-manglende komponenttime har kilde og fallbackstatus.
4. Manglende værdier forbliver `null`; ingen opdigtede nuller eller stale gentagelser.
5. Kildeskift måles pr. komponent og må ikke ændre andre komponenters autoritative modelvalg.

### Vind

- Hastighed og retning skal være atomiske og skifte kilde sammen.
- Retningsspring beregnes cirkulært omkring 0/360 grader.
- DMI-first-overgangen må ikke give skjulte huller eller gentage stale vind.

### Bølger

- Højde, periode og retning skal enten alle findes eller alle være `missing`.
- `DK-B05-11` skal fortsat være eksplicit `missing`, indtil en godkendt kilde findes.
- Et fjernere WAM-punkt må ikke accepteres uden geografisk kontrol for land, smalle løb og anden eksponering.
- De 15 enkelte sluttidshuller skal overvåges, men må ikke udfyldes med nærmeste værdi uden dokumenteret tidsregel.

### Strøm

- Kun et gyldigt fælles DMI-U/V-par må ændre havmodel.
- U- og V-komponenter skal komme fra samme gitterpunkt, dybdelag, modelkørsel og tidspunkt.
- Fallbackstrøm skal forblive tydeligt `unverified` og må ikke tælle som verificeret historik.
- De otte Limfjordhaler skal forblive manglende, indtil en dokumenteret overgang findes.

### Vandstand

- DMI-model og observation/bias skal bevare hver sin identitet.
- En fallbackovergang må kun repareres med dokumenteret offset og skal bevare rå fallbackværdi og reparationsgrundlag.
- Maksimalt timespring, antal kildeskift og tidevandsmønster skal regressionsmåles.

### Vandtemperatur

- DMI-parameter 80 accepteres kun ved `surface:0`.
- Cachetimer uden vertikal provenance fjernes fail-closed.
- DMI/fallback-overgangen måles i grader pr. zone; ingen skjult udglatning.
- De otte halezoner må ikke få dybdetemperatur eller stale overfladetemperatur som erstatning.

## Historikstatus

Alle 210 zoner har 100 rå `samples24h` og 133 rå `samples72h` i dette artifact. Det beviser ensartet bevarelse mellem kørsler, men antal rå samples er ikke det samme som 72 forløbne timer. Mobiliserings-/scoreanalysen afventer fortsat et fuldt virkeligt 72-timersvindue.

## Næste P1-trin

Komponentmatricen er nu tilstrækkelig som regressionsgrundlag. Næste faglige trin er at måle overgangsfejlene numerisk – især vindretning, vandstandsoffset og temperaturforskel – uden at ændre aktive kilder eller RavScore. Strømhistorikken fortsætter samtidig sin naturlige 72-timersopbygning.
