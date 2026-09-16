# RavRadar 4.0.387

## Rettet

- Code-only kan nu flytte en eksakt, gemt privat runtime til en ny vejrkodekontrakt, når den aktive integrerede modelbinding allerede er aktuel.
- Predecessor-migrationen accepterer både almindelig `integrated`-vedligeholdelse og `integrated-historical-maintenance`; alle modeltransitioner er fortsat afvist.
- Den eksisterende `CONTRACT_ONLY_REBIND` beviser fortsat eksakt forgænger, commit-ancestry, manifest, descriptor, byteidentiske private filer og uændrede målinger.
- Code-only-regressionstesten låser den nye same-binding-rute og den snævre actionliste.

## Bevaret

- Code-only udfører ingen DMI-, Copernicus- eller Open-Meteo-kald og ændrer ingen vejrdata, scorer eller geometri.
- Databasebindingsmigration kører fortsat kun for en virkelig historisk modelbinding.
- Pages og central implementation closure opdateres først efter eksisterende privacy-, artifact- og offentlig verifikation.
- Den grønne exact-head-kildekontrol genbruges på samme main; den køres ikke igen inde i code-only.
- Normal weather genaktiveres først efter den providerfrie private-runtime-genbinding.
