# RavRadar 4.0.111

## Historisk tilstand forklaret uden scoreændring

- Den eksisterende skyggetilstandsmodel vises nu i zonepanelet med almindelige danske forklaringer.
- RavRadar forklarer, om zonen er i højenergifase, efterstorm/indtransport, gradvis indtransport, vedvarende nærkystpotentiale eller udtransport/nedbrydning.
- Forklaringen viser relevante historiske fakta som varighed af kraftig hændelse, indadgående strøm, udadgående strøm og retningsstabilitet.
- Debugpanelet viser fase, nærkystpotentiale og hele det beregnede historiske state-objekt.
- “Spørg RavRadar” bruger samme tilstandsforklaring ved spørgsmål om en zones score.
- Den historiske tilstand er fortsat i skyggetilstand og ændrer ikke RavScore, rangliste eller femdøgnsprognose i denne version.

## Kildeneutralitet

- Projektet må ikke indeholde navne på de eksterne hjemmesider, som blev brugt som analysemateriale.
- Ny regressionstest gennemgår kode, UI, håndbog, RDKS, tests og tekstbaserede artefakter og stopper release ved sådanne referencer.
- Faglig viden formuleres som RavRadars egne neutrale regler og forklaringer.

## Regression og performance

- Vandstationsrettelsen fra 4.0.106 er bevaret og fortsat dækket af test.
- DMI-pipelinen fra 4.0.110 er uændret.
- Ingen rå historik er tilføjet til browserens beregningsarbejde; siden modtager fortsat kompakte, forudberegnede state-felter.
