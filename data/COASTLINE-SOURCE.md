# Kystlinjekilde

De synlige zoneforløb i RavRadar 2.6.13 er genereret fra GSHHS-kystlinjedata (intermediate opløsning). Kystlinjen gemmes lokalt i `coastline-master.geojson`, så kortet ikke er afhængigt af eksterne GIS-kald ved brug.

Hver zone klippes som et sammenhængende udsnit af masterlinjen. Nabozoners grænser beregnes som midtpunkter langs samme kystforløb. Den viste linje forskydes ca. 45 meter væk fra zonens marine datapunkt, altså mod land-/strandsiden.

`coastline-audit.json` indeholder længde, antal punkter og afstand fra det oprindelige zonepunkt til den anvendte kyst. Store afstande skal gennemgås manuelt i kommende præcisionsbatches.
