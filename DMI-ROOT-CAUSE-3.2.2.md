# DMI root-cause analyse – 3.2.2

Loggen fra workflow 82099249014 viste 121 fundne assets, 96 behandlede assets og 1.457.554.368 downloadede bytes. Samtlige registrerede felter blev klassificeret som `water-temperature`.

Den konkrete kodefejl var de-duplikeringen i `list_latest_assets`: dictionary-nøglen var kun forecastets `valid`-tid. Når DMI leverer flere items med samme valid-tid – ét pr. parameter – overskrev de hinanden. Resultatet blev ét vilkårligt parameter-item pr. time. I den observerede kørsel blev det vandtemperatur.

Dette forklarer samtidig:

1. hvorfor STAC og download faktisk virkede,
2. hvorfor ca. 1,46 GB blev hentet,
3. hvorfor 75 zoner blev undersøgt,
4. hvorfor ingen zoner blev komplette for marine data,
5. og hvorfor budgettet stoppede collectionen før de øvrige collections.

3.2.2 retter de-duplikering, parameterudvælgelse, klassifikation, budgethåndtering og collectionrotation. Den første nye produktionskørsel bruges samtidig som kontrolleret metadataaudit via de nye diagnostikfelter.
