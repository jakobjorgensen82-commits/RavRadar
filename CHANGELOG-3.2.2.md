# RavRadar 3.2.2 – parameterbevidst DMI-bulk

## Fejl fundet i 3.2.1

DMI STAC returnerede flere parameter-items for samme gyldighedstid. Koden reducerede dem fejlagtigt til ét item pr. tidspunkt. Det valgte item var konsekvent vandtemperatur, så 96 store GRIB-filer blev downloadet uden at give vandstand, strøm, vind eller bølger. Downloadbudgettet blev derefter opbrugt ved ca. 1,46 GB.

## Rettelser

- STAC-items identificeres nu efter både gyldighedstid og parameter.
- Kun RavRadar-relevante parametre vælges; vandtemperatur er fjernet fra bulk-prioriteten.
- Enkeltbogstav-hints som `t`, `u` og `v` bruges ikke længere i STAC-metadata.
- GRIB-klassifikation er gjort collection- og niveauafhængig.
- Collectioner roteres mellem kørsler, så første collection ikke altid bruger hele budgettet.
- Standard tidsopløsning for bulk er 3 timer, mens de første seks timer beholdes tættere.
- Delvis fremdrift bevares og regnes som en brugbar kørsel i stedet for total fejl.
- Diagnostikken viser parameterfordeling, STAC-hints, genbrugte assets og et begrænset GRIB-feltinventar.
- Bulk-cache schema 2 accepteres af vejropdateringen.

## Forventet virkning

Næste workflow bør ikke længere vise en lang liste bestående kun af `water-temperature`. Diagnostikken skal i stedet vise relevante marine-, vind- eller bølgeparametre og collectionrotation over efterfølgende kørsler.
