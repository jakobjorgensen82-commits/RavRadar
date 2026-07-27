# RavRadar 4.0.4 – DMI Ocean Diagnostics

- Tilføjer maskinlæsbar ocean-diagnostik i `data/diagnostics/dmi-ocean-diagnostics.json`.
- Tilføjer kort tekstresumé i `data/diagnostics/dmi-ocean-summary.txt`.
- Måler pr. DMI marine collection: planlagt/forsøgt/succes/delvis, assets, genkendte og manglende parametre, inventory og seneste fejl.
- Måler antal zoner og finite værdier for vandstand, strøm U/V og vandtemperatur.
- Viser ocean-dækning direkte i GitHub Actions summary.
- Diagnostikken skrives ved checkpoints og bevares også ved delvise kørsler.
