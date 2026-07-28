# RavRadar 4.0.7 – DMI-first dataintegritet

- DMI er fortsat autoritativ førsteprioritet for alle komponenter.
- Open-Meteo og MET Norway udfylder kun konkrete manglende DMI-komponenter.
- Delvise DMI-cacheposter flettes komponentvis med fallback i stedet for at blokere fallback.
- Prognosetider normaliseres og flettes komponentvis før lagring og publicering.
- Kildeangivelse viser `missing`, når en komponent reelt mangler.
- Runtime Diagnostics hydreres og kontrolleres mod Conditions-generationstid.
- Preflight fortsætter DMI warmup, mens marine cache eller duplicate-reparation er ufuldstændig.
- DKSS-marine collections prioriteres før WAM og HARMONIE, mens strøm/vandstand mangler.
- GRIB parserVersion og processedSteps forhindrer gamle fejlslagne steps i at blokere genbehandling.
- Weather Health skelner mellem brugerdata, DMI-komplethed og degraderet fallbackdrift.
- Admin viser aktiv cooldown og 'ikke testet' korrekt i stedet for fejlagtigt API OK.
