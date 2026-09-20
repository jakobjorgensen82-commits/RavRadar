# 4.0.444 – source-stage-kontrol bruger den gemte Copernicus-fremgang

## Ændret

- Den strenge Copernicus-range-kontrol sammenligner nu donorbanken med den
  gemte source-stage ved hjælp af source-stage'ens validerede forsøg.
- Hvis en separat donorbank tilhører en anden generation eller mangler et
  forsøg, behandles det som en mismatch, der kræver ny projektion; kontrollen
  fejler ikke med en uforståelig intern undtagelse.
- Versionsfelter og releasekontrakt er løftet til 4.0.444. Geodata er kun
  versionssynkroniseret; ingen geometri eller punkter er ændret.

## Live-fund

Run `35494495771` nåede DMI og Copernicus. Copernicus gemte 7.811 verificerede
operationelle par og gennemførte sin netværksfrie recovery, men den efterfølgende
kontrol afviste source-stage-statussen. Fejlen var i kontrollens genberegning,
ikke bevis på at de 7.811 par var tabt. Open-Meteo, afsluttende cachebygning,
artifact og deploy blev derfor ikke kørt i dette run. Datasættet er stadig ikke
produktionsverificeret komplet.

## Verifikation

De målrettede Copernicus source-stage- og range-checker-tests er grønne efter
rettelsen. Exact-head sourcegate, merge og én almindelig continuation skal stadig
gennemføres, før produktionskæden kan kaldes stabil.
